/**
 * Sui transaction builder and on-chain query helpers.
 * All RPC calls go through the Tatum-routed SuiClient from tatum.ts.
 *
 * Two registration modes:
 *  - SERVER_SIGN=false (default): build unsigned PTB → base64 txBytes for wallet signing
 *  - SERVER_SIGN=true: sign + execute with SUI_SIGNER_PRIVATE_KEY and return AttestationDTO
 */
import { Transaction, Inputs } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { SuiObjectData } from '@mysten/sui/client';
import { getSuiClient } from './tatum.js';
import type { AttestationDTO, LineageNode, Lineage } from './types.js';

// ── Fix B: gas price cache + offline build ────────────────────────────────────
// Caching gas price (changes only per epoch ~24h) eliminates one RPC call.
// Explicit gas budget eliminates the dry-run estimate call.
// Passing Clock as a pre-resolved SharedObjectRef eliminates another RPC call.
// Net: tx.build() makes ~0 Tatum RPC calls per registration.

let _gasPrice: { v: bigint; at: number } | null = null;

async function getCachedGasPrice(): Promise<bigint> {
  if (_gasPrice && Date.now() - _gasPrice.at < 60_000) return _gasPrice.v;
  const v = BigInt(await getSuiClient().getReferenceGasPrice());
  _gasPrice = { v, at: Date.now() };
  return v;
}

// Clock is a shared object with stable initialSharedVersion = 1 on all Sui networks.
// Passing it as a SharedObjectRef avoids the getObject('0x6') RPC call in tx.build().
const CLOCK_REF = Inputs.SharedObjectRef({
  objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
  initialSharedVersion: 1,
  mutable: false,
});

// Cache of frozen parent object refs { objectId → { version, digest } }
const _parentRefCache = new Map<string, { objectId: string; version: string; digest: string }>();

async function resolveParentRef(objectId: string): Promise<ReturnType<typeof Inputs.ObjectRef> | null> {
  const cached = _parentRefCache.get(objectId);
  if (cached) return Inputs.ObjectRef(cached);
  try {
    const obj = await getSuiClient().getObject({ id: objectId });
    if (obj.data) {
      const ref = { objectId: obj.data.objectId, version: String(obj.data.version), digest: obj.data.digest };
      _parentRefCache.set(objectId, ref);
      return Inputs.ObjectRef(ref);
    }
    return null;
  } catch { return null; }
}

// ── Config ────────────────────────────────────────────────────────────────────

export function getPackageId(): string {
  const id = process.env.SUI_PACKAGE_ID;
  if (!id || id.startsWith('0x000000000000000000000000000000000000000000000000000000000000000')) {
    throw new Error('SUI_PACKAGE_ID is not set or still placeholder');
  }
  return id;
}

function getSuiNetwork(): string {
  return process.env.SUI_NETWORK ?? 'mainnet';
}

function explorerUrl(objectId: string): string {
  const net = getSuiNetwork();
  const base = net === 'mainnet' ? 'https://suiscan.xyz/mainnet' : `https://suiscan.xyz/${net}`;
  return `${base}/object/${objectId}`;
}

// ── PTB builders ──────────────────────────────────────────────────────────────

interface RegisterArgs {
  blobId: string;
  credentialBlobId: string;
  sha256: string;
  phash: string;
  mediaType: string;
  encrypted: boolean;
  parentObjectId?: string;
  creator: string;
}

/**
 * Build the PTB for register() or register_derivative().
 * Async so we can resolve cached gas price + parent ref without extra RPC round-trips.
 * tx.build() will make ~0 Tatum RPC calls because:
 *   - gas price is pre-set (cached)
 *   - gas budget is explicit (no dry-run needed)
 *   - Clock is a pre-resolved SharedObjectRef (no getObject call)
 *   - parent (if any) is a pre-resolved ObjectRef (no getObject call)
 */
async function buildRegisterTx(args: RegisterArgs): Promise<Transaction> {
  const pkg = getPackageId();
  const tx = new Transaction();
  tx.setSender(args.creator);
  tx.setGasPrice(await getCachedGasPrice());
  tx.setGasBudget(10_000_000n);

  const encBytes = (s: string) => Array.from(Buffer.from(s, 'utf8'));
  const clock = tx.object(CLOCK_REF);

  if (args.parentObjectId) {
    const parentRef = await resolveParentRef(args.parentObjectId);
    const parentArg = parentRef ? tx.object(parentRef) : tx.object(args.parentObjectId);
    tx.moveCall({
      target: `${pkg}::registry::register_derivative`,
      arguments: [
        parentArg,
        tx.pure.vector('u8', encBytes(args.blobId)),
        tx.pure.vector('u8', encBytes(args.credentialBlobId)),
        tx.pure.vector('u8', encBytes(args.sha256)),
        tx.pure.vector('u8', encBytes(args.phash)),
        tx.pure.vector('u8', encBytes(args.mediaType)),
        tx.pure.bool(args.encrypted),
        clock,
      ],
    });
  } else {
    tx.moveCall({
      target: `${pkg}::registry::register`,
      arguments: [
        tx.pure.vector('u8', encBytes(args.blobId)),
        tx.pure.vector('u8', encBytes(args.credentialBlobId)),
        tx.pure.vector('u8', encBytes(args.sha256)),
        tx.pure.vector('u8', encBytes(args.phash)),
        tx.pure.vector('u8', encBytes(args.mediaType)),
        tx.pure.bool(args.encrypted),
        clock,
      ],
    });
  }
  return tx;
}

// ── Unsigned PTB (wallet-sign mode) ──────────────────────────────────────────

/**
 * Build an unsigned PTB and return it as base64 txBytes.
 * The frontend wallet signs + executes via the Tatum-routed client.
 */
export async function buildUnsignedRegisterTx(args: RegisterArgs): Promise<string> {
  const sui = getSuiClient();
  const tx = await buildRegisterTx(args);
  const bytes = await tx.build({ client: sui });
  return Buffer.from(bytes).toString('base64');
}

// ── Server-sign mode ──────────────────────────────────────────────────────────

/**
 * Sign + execute the register transaction with the server's private key.
 * Returns the created Attestation object id and digest.
 */
export async function signAndRegister(
  args: RegisterArgs,
): Promise<{ objectId: string; txDigest: string }> {
  const privKey = process.env.SUI_SIGNER_PRIVATE_KEY;
  if (!privKey) throw new Error('SUI_SIGNER_PRIVATE_KEY is not set (required for SERVER_SIGN=true)');

  const keypair = Ed25519Keypair.fromSecretKey(privKey);
  const sui = getSuiClient();
  const tx = await buildRegisterTx({ ...args, creator: keypair.getPublicKey().toSuiAddress() });

  const result = await sui.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showObjectChanges: true, showEffects: true },
  });

  if (result.effects?.status.status !== 'success') {
    throw new Error(`Tx failed: ${result.effects?.status.error ?? 'unknown error'}`);
  }

  // Find the created Attestation object id
  const created = result.objectChanges?.find(c => c.type === 'created');
  const objectId = created?.type === 'created' ? created.objectId : result.digest;

  return { objectId, txDigest: result.digest };
}

// ── Object fetch ──────────────────────────────────────────────────────────────

/**
 * Fetch an Attestation object from Sui and return it as AttestationDTO.
 */
export async function getAttestation(objectId: string): Promise<AttestationDTO | null> {
  const sui = getSuiClient();
  try {
    const obj = await sui.getObject({
      id: objectId,
      options: { showContent: true, showDisplay: true },
    });
    return suiObjectToDTO(obj.data);
  } catch {
    return null;
  }
}

/**
 * Given a transaction digest, find the created Attestation object ID.
 * Used after a wallet-signed registration to resolve the real object ID.
 */
export async function getObjectIdFromDigest(digest: string): Promise<string | null> {
  const sui = getSuiClient();
  try {
    const tx = await sui.getTransactionBlock({
      digest,
      options: { showObjectChanges: true },
    });
    const created = tx.objectChanges?.find(
      c => c.type === 'created' && (c as { objectType?: string }).objectType?.includes('registry::Attestation'),
    );
    if (created?.type === 'created') return (created as { objectId: string }).objectId;
    // Fallback: return the first created object
    const any = tx.objectChanges?.find(c => c.type === 'created');
    if (any?.type === 'created') return (any as { objectId: string }).objectId;
    return null;
  } catch {
    return null;
  }
}

function suiObjectToDTO(data: SuiObjectData | null | undefined): AttestationDTO | null {
  if (!data) return null;
  const content = data.content;
  if (!content || content.dataType !== 'moveObject') return null;

  const fields = content.fields as Record<string, unknown>;
  const id = data.objectId;

  const parentField = fields.parent as { fields?: { id?: string } } | null | undefined;
  const parentId = parentField?.fields?.id ?? null;

  return {
    id,
    creator: String(fields.creator ?? ''),
    blobId: String(fields.blob_id ?? ''),
    credentialBlobId: String(fields.credential_blob_id ?? ''),
    sha256: String(fields.sha256 ?? ''),
    phash: String(fields.phash ?? ''),
    mediaType: String(fields.media_type ?? ''),
    parent: parentId ? String(parentId) : null,
    encrypted: Boolean(fields.encrypted ?? false),
    createdAtMs: Number(fields.created_at_ms ?? 0),
    suiObjectUrl: explorerUrl(id),
  };
}

// ── Event queries ─────────────────────────────────────────────────────────────

const EVENT_TYPE = () => `${getPackageId()}::registry::AttestationCreated`;

interface AttestationCreatedEvent {
  attestation_id: string;
  creator: string;
  blob_id: string;
  sha256: string;
  parent?: { vec?: string[] };
  created_at_ms: string;
}

/**
 * Query AttestationCreated events (newest first), paginated.
 * Used by the explorer endpoint.
 */
export async function queryCreatedEvents(
  cursor?: string,
  limit = 24,
): Promise<{ items: AttestationDTO[]; nextCursor: string | null }> {
  const sui = getSuiClient();
  try {
    const pkgId = getPackageId();
    const result = await sui.queryEvents({
      query: { MoveEventType: `${pkgId}::registry::AttestationCreated` },
      cursor: cursor ? { txDigest: cursor, eventSeq: '0' } : undefined,
      limit,
      order: 'descending',
    });

    const items = await Promise.all(
      result.data.map(async (ev) => {
        const f = ev.parsedJson as AttestationCreatedEvent;
        // Attempt to hydrate the full object; fall back to stub from event
        const full = await getAttestation(f.attestation_id).catch(() => null);
        if (full) return full;

        return {
          id: f.attestation_id,
          creator: f.creator,
          blobId: f.blob_id,
          credentialBlobId: '',
          sha256: f.sha256,
          phash: '',
          mediaType: 'application/octet-stream',
          parent: f.parent?.vec?.[0] ?? null,
          encrypted: false,
          createdAtMs: Number(f.created_at_ms),
          suiObjectUrl: explorerUrl(f.attestation_id),
        } satisfies AttestationDTO;
      }),
    );

    const nc = result.hasNextPage && result.nextCursor
      ? result.nextCursor.txDigest
      : null;

    return { items, nextCursor: nc };
  } catch (err) {
    console.error('[sui] queryCreatedEvents error:', err);
    return { items: [], nextCursor: null };
  }
}

/**
 * Search for an attestation by exact sha256 (full hex string).
 * Walks recent AttestationCreated events and filters client-side.
 * Returns the first match or null.
 */
export async function findBySha256(sha256: string): Promise<AttestationDTO | null> {
  const sui = getSuiClient();
  try {
    const pkgId = getPackageId();
    // Query up to 200 recent events to find a sha256 match
    const result = await sui.queryEvents({
      query: { MoveEventType: `${pkgId}::registry::AttestationCreated` },
      limit: 200,
      order: 'descending',
    });

    const match = result.data.find(ev => {
      const f = ev.parsedJson as AttestationCreatedEvent;
      return f.sha256 === sha256;
    });

    if (!match) return null;
    const f = match.parsedJson as AttestationCreatedEvent;
    return getAttestation(f.attestation_id);
  } catch {
    return null;
  }
}

/**
 * Find all attestations whose pHash is similar to the given one.
 * Returns matches with their similarity scores.
 */
export async function findByPhash(targetPhash: string): Promise<{ attestation: AttestationDTO; phash: string }[]> {
  const sui = getSuiClient();
  try {
    const pkgId = getPackageId();
    const result = await sui.queryEvents({
      query: { MoveEventType: `${pkgId}::registry::AttestationCreated` },
      limit: 200,
      order: 'descending',
    });

    const candidates = await Promise.all(
      result.data.map(async (ev) => {
        const f = ev.parsedJson as AttestationCreatedEvent;
        const att = await getAttestation(f.attestation_id).catch(() => null);
        return att ? { attestation: att, phash: att.phash } : null;
      }),
    );

    return candidates.filter((c): c is { attestation: AttestationDTO; phash: string } => c !== null);
  } catch {
    return [];
  }
}

// ── Lineage ───────────────────────────────────────────────────────────────────

/**
 * Build the full lineage tree rooted at the given attestation.
 * Walks up via parent references, then queries events to find children.
 */
export async function buildLineage(rootId: string): Promise<Lineage> {
  const visited = new Set<string>();
  const nodes: LineageNode[] = [];
  let actualRootId = rootId;

  // Walk up to find the true root
  async function walkUp(id: string): Promise<void> {
    if (visited.has(id)) return;
    visited.add(id);
    const att = await getAttestation(id);
    if (!att) return;
    nodes.push({ ...att });
    if (att.parent) {
      actualRootId = att.parent;
      await walkUp(att.parent);
    } else {
      actualRootId = id;
    }
  }

  // Find children from events
  async function walkDown(id: string): Promise<void> {
    if (visited.has(id)) return;
    visited.add(id);
    const att = await getAttestation(id);
    if (!att) return;
    if (!nodes.find(n => n.id === id)) nodes.push({ ...att });

    const sui = getSuiClient();
    try {
      const pkgId = getPackageId();
      const result = await sui.queryEvents({
        query: { MoveEventType: `${pkgId}::registry::AttestationCreated` },
        limit: 50,
        order: 'descending',
      });
      const children = result.data.filter(ev => {
        const f = ev.parsedJson as AttestationCreatedEvent;
        return f.parent?.vec?.[0] === id;
      });
      for (const c of children) {
        const f = c.parsedJson as AttestationCreatedEvent;
        await walkDown(f.attestation_id);
      }
    } catch { /* ignore */ }
  }

  await walkUp(rootId);
  await walkDown(actualRootId);

  return { rootId: actualRootId, nodes };
}
