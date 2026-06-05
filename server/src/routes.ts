/**
 * Veris API routes
 *
 * All routes live under /api.
 * Multipart parsing uses Hono's built-in c.req.formData().
 *
 * See BACKEND.md Section 5 for the full contract.
 */
import { Hono, type Context } from 'hono';
import { sha256Hex, phashHex, phashSimilarity, classifyByPhash, imageMetadata } from './fingerprint.js';
import { storeBlob, readBlob, blobUrl } from './walrus.js';
import { buildCredential, explainDiff } from './agent.js';
import {
  buildUnsignedRegisterTx,
  signAndRegister,
  getAttestation,
  getObjectIdFromDigest,
  queryCreatedEvents,
  findBySha256,
  findByPhash,
  buildLineage,
  getPackageId,
} from './sui.js';
import type { PrepareResponse, RegisterResponse, VerifyResult, AttestationDTO } from './types.js';

export const api = new Hono();

// ── Health ────────────────────────────────────────────────────────────────────

api.get('/health', (c) => {
  let pkgId: string;
  try { pkgId = getPackageId(); } catch { pkgId = 'not-configured'; }
  return c.json({ ok: true, network: process.env.SUI_NETWORK ?? 'mainnet', packageId: pkgId });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function parseMultipart(c: Context): Promise<{
  fileBytes: Buffer;
  mediaType: string;
  creator: string;
  privacy: 'public' | 'encrypted';
  parentId: string | null;
}> {
  const form = await c.req.formData();
  const fileField = form.get('file') as File | null;
  if (!fileField) throw new Error('Missing "file" field in multipart body');

  const ab = await fileField.arrayBuffer();
  const fileBytes = Buffer.from(ab);
  const mediaType = fileField.type || 'application/octet-stream';
  const creator = (form.get('creator') as string | null) ?? '0x0000000000000000000000000000000000000000000000000000000000000000';
  const privacy = (form.get('privacy') as string | null) === 'encrypted' ? 'encrypted' : 'public';
  const parentId = (form.get('parentId') as string | null) || null;

  return { fileBytes, mediaType, creator, privacy, parentId };
}

// ── POST /api/register/prepare — build unsigned tx for wallet signing ─────────

api.post('/register/prepare', async (c) => {
  try {
    const { fileBytes, mediaType, creator, privacy, parentId } = await parseMultipart(c);
    const encrypted = privacy === 'encrypted';

    // 1. Fingerprint
    const sha = sha256Hex(fileBytes);
    const phash = await phashHex(fileBytes, mediaType);
    const meta = await imageMetadata(fileBytes);

    // 2. Store original on Walrus
    const blobId = await storeBlob(fileBytes, mediaType);

    // 3. AI credential (with Tatum MCP address screen)
    const credential = await buildCredential(fileBytes, mediaType, creator, meta);

    // 4. Store credential on Walrus
    const credBytes = Buffer.from(JSON.stringify(credential), 'utf8');
    const credentialBlobId = await storeBlob(credBytes, 'application/json');

    // 5. Build unsigned PTB
    const txBytes = await buildUnsignedRegisterTx({
      blobId, credentialBlobId, sha256: sha, phash, mediaType, encrypted,
      parentObjectId: parentId ?? undefined, creator,
    });

    const body: PrepareResponse = {
      sha256: sha, phash, mediaType, blobId, credentialBlobId, credential,
      txBytes, parentId,
    };
    return c.json(body);
  } catch (err) {
    console.error('[/register/prepare]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── POST /api/register — server-sign mode ─────────────────────────────────────

api.post('/register', async (c) => {
  try {
    const { fileBytes, mediaType, creator, privacy, parentId } = await parseMultipart(c);
    const encrypted = privacy === 'encrypted';
    const serverSign = process.env.SERVER_SIGN === 'true';

    // 1. Fingerprint
    const sha = sha256Hex(fileBytes);
    const phash = await phashHex(fileBytes, mediaType);
    const meta = await imageMetadata(fileBytes);

    // 2. Store original on Walrus
    const blobId = await storeBlob(fileBytes, mediaType);

    // 3. AI credential (with Tatum MCP address screen)
    const credential = await buildCredential(fileBytes, mediaType, creator, meta);

    // 4. Store credential on Walrus
    const credBytes = Buffer.from(JSON.stringify(credential), 'utf8');
    const credentialBlobId = await storeBlob(credBytes, 'application/json');

    const args = {
      blobId, credentialBlobId, sha256: sha, phash, mediaType, encrypted,
      parentObjectId: parentId ?? undefined, creator,
    };

    if (serverSign) {
      // 5a. Server signs + submits via Tatum-routed client
      const { objectId, txDigest } = await signAndRegister(args);

      const attestation: AttestationDTO = {
        id: objectId, creator, blobId, credentialBlobId,
        sha256: sha, phash, mediaType, parent: parentId, encrypted,
        createdAtMs: Date.now(), suiObjectUrl: `https://suiscan.xyz/${process.env.SUI_NETWORK ?? 'mainnet'}/object/${objectId}`,
        txDigest,
      };

      const body: RegisterResponse = {
        attestation, txDigest,
        receipt: { attId: objectId, blobId, objId: objectId },
      };
      return c.json(body);
    } else {
      // 5b. Return unsigned txBytes for wallet signing
      const txBytes = await buildUnsignedRegisterTx(args);
      return c.json({
        sha256: sha, phash, mediaType, blobId, credentialBlobId, credential,
        txBytes, parentId,
        message: 'SERVER_SIGN=false — sign txBytes with your wallet and execute via the Tatum-routed SuiClient',
      });
    }
  } catch (err) {
    console.error('[/register]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── POST /api/verify ──────────────────────────────────────────────────────────

api.post('/verify', async (c) => {
  try {
    const contentType = c.req.header('content-type') ?? '';
    let result: VerifyResult;

    if (contentType.includes('multipart/form-data')) {
      // File upload path
      const form = await c.req.formData();
      const fileField = form.get('file') as File | null;

      if (fileField) {
        const ab = await fileField.arrayBuffer();
        const fileBytes = Buffer.from(ab);
        const mediaType = fileField.type || 'application/octet-stream';
        result = await verifyByFile(fileBytes, mediaType);
      } else {
        return c.json({ error: 'Missing "file" field' }, 400);
      }
    } else {
      // JSON path: { blobId } or { objectId }
      const body = await c.req.json() as { blobId?: string; objectId?: string };

      if (body.objectId) {
        const att = await getAttestation(body.objectId);
        if (!att) return c.json({ status: 'unknown' } satisfies VerifyResult);
        result = { status: 'authentic', attestation: att, similarity: 1 };
      } else if (body.blobId) {
        const ab = await readBlob(body.blobId);
        const fileBytes = Buffer.from(ab);
        result = await verifyByFile(fileBytes, 'application/octet-stream');
      } else {
        return c.json({ error: 'Provide "file" (multipart), "blobId", or "objectId"' }, 400);
      }
    }

    return c.json(result);
  } catch (err) {
    console.error('[/verify]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

async function verifyByFile(fileBytes: Buffer, mediaType: string): Promise<VerifyResult> {
  const sha = sha256Hex(fileBytes);
  const phash = await phashHex(fileBytes, mediaType);

  console.log(`[verify] sha=${sha.slice(0, 18)}… phash=${phash}`);

  // 1. Exact SHA-256 match — search on-chain events
  let exact: AttestationDTO | null = null;
  try {
    exact = await findBySha256(sha);
  } catch (err) {
    console.warn('[verify] findBySha256 failed:', (err as Error).message);
  }
  if (exact) {
    console.log('[verify] exact match found:', exact.id);
    return { status: 'authentic', attestation: exact, similarity: 1 };
  }

  // 2. pHash similarity search — finds modified copies
  let candidates: { attestation: AttestationDTO; phash: string }[] = [];
  try {
    candidates = await findByPhash(phash);
  } catch (err) {
    console.warn('[verify] findByPhash failed:', (err as Error).message);
  }

  if (candidates.length > 0) {
    let bestSim = 0;
    let bestAtt: AttestationDTO | null = null;

    for (const { attestation, phash: candidatePhash } of candidates) {
      const sim = phashSimilarity(phash, candidatePhash);
      if (sim > bestSim) { bestSim = sim; bestAtt = attestation; }
    }

    const classification = classifyByPhash(bestSim);
    console.log(`[verify] best pHash similarity: ${bestSim.toFixed(3)} → ${classification}`);

    if ((classification === 'modified' || classification === 'authentic') && bestAtt) {
      let diff: string[] | undefined;
      if (classification === 'modified') {
        try {
          const origAb = await readBlob(bestAtt.blobId);
          diff = await explainDiff(Buffer.from(origAb), fileBytes, mediaType);
        } catch { /* diff is optional */ }
      }
      return { status: classification, attestation: bestAtt, similarity: bestSim, diff };
    }
  }

  console.log('[verify] no match found → unknown');
  return { status: 'unknown' };
}

// ── GET /api/resolve-tx/:digest — tx digest → Sui object ID ──────────────────

api.get('/resolve-tx/:digest', async (c) => {
  try {
    const digest = c.req.param('digest');
    const objectId = await getObjectIdFromDigest(digest);
    if (!objectId) return c.json({ error: 'No Attestation object found for this digest' }, 404);
    return c.json({ objectId });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── GET /api/attestation/:id ──────────────────────────────────────────────────

api.get('/attestation/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const att = await getAttestation(id);
    if (!att) return c.json({ error: 'Not found' }, 404);

    // Inline the credential from Walrus
    let credential: unknown = null;
    if (att.credentialBlobId) {
      try {
        const ab = await readBlob(att.credentialBlobId);
        credential = JSON.parse(Buffer.from(ab).toString('utf8'));
      } catch { /* credential fetch is best-effort */ }
    }

    return c.json({ ...att, credential });
  } catch (err) {
    console.error('[/attestation/:id]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── GET /api/lineage/:id ──────────────────────────────────────────────────────

api.get('/lineage/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const lineage = await buildLineage(id);
    return c.json(lineage);
  } catch (err) {
    console.error('[/lineage/:id]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── GET /api/explorer ─────────────────────────────────────────────────────────

api.get('/explorer', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') ?? '24', 10), 50);
    const cursor = c.req.query('cursor') ?? undefined;
    const page = await queryCreatedEvents(cursor, limit);
    return c.json(page);
  } catch (err) {
    console.error('[/explorer]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── GET /api/blob/:blobId — Walrus proxy ──────────────────────────────────────

api.get('/blob/:blobId', async (c) => {
  try {
    const blobId = c.req.param('blobId');
    const ab = await readBlob(blobId);
    // Try to infer content-type from the first bytes (magic numbers)
    const bytes = new Uint8Array(ab);
    const ct = inferContentType(bytes);
    return new Response(ab, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(ab.byteLength),
      },
    });
  } catch (err) {
    console.error('[/blob/:blobId]', err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Content-type inference from magic bytes ───────────────────────────────────

function inferContentType(bytes: Uint8Array): string {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) return 'application/zip';
  return 'application/octet-stream';
}
