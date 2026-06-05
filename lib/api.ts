/**
 * Veris frontend API client
 *
 * Calls the Veris backend (server/) when NEXT_PUBLIC_API_URL is set.
 * Every function is safe to call even when the backend is unavailable —
 * callers should fall back to mock data on error.
 *
 * Base URL:  process.env.NEXT_PUBLIC_API_URL  (e.g. http://localhost:8787)
 *            Falls back to '' (same origin) so you can also proxy /api from Next.js.
 */

// The backend URL — env var takes priority, falls back to the deployed Railway instance.
const BACKEND_URL = 'https://veris-production.up.railway.app';

const API_BASE = (() => {
  if (typeof window === 'undefined') return '';
  return (process.env.NEXT_PUBLIC_API_URL || BACKEND_URL).replace(/\/$/, '');
})();

function url(path: string): string {
  return `${API_BASE}/api${path}`;
}

/**
 * Fetch with automatic retry on network-level failures (TypeError: Failed to fetch).
 * Railway cold-starts can take 10–30 s; retrying recovers from the first failed attempt.
 */
async function fetchWithRetry(
  input: string,
  init: RequestInit,
  retries = 3,
  delayMs = 2000,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

/**
 * Ping the backend health endpoint to wake it up before a long request.
 * Railway free/hobby instances sleep after inactivity; the first request after
 * sleep often fails with "Failed to fetch" because the cold start takes longer
 * than the browser's default connection timeout.
 */
export async function wakeBackend(): Promise<boolean> {
  try {
    const res = await fetch(url('/health'), { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Shared types (mirrors server/src/types.ts) ────────────────────────────────

export interface Credential {
  description: string;
  tags: string[];
  aiOrigin: 'likely-camera' | 'possibly-ai' | 'unknown';
  metadata: Record<string, unknown>;
  addressScreen: { malicious: boolean; source: string };
}

export interface AttestationDTO {
  id: string;
  creator: string;
  blobId: string;
  credentialBlobId: string;
  sha256: string;
  phash: string;
  mediaType: string;
  parent: string | null;
  encrypted: boolean;
  createdAtMs: number;
  suiObjectUrl: string;
  txDigest?: string;
  credential?: Credential;
}

export interface RegisterReceipt {
  attId: string;
  blobId: string;
  objId: string;
}

export interface RegisterResponse {
  attestation: AttestationDTO;
  txDigest: string;
  receipt: RegisterReceipt;
}

export interface PrepareResponse {
  sha256: string;
  phash: string;
  mediaType: string;
  blobId: string;
  credentialBlobId: string;
  credential: Credential;
  txBytes: string;
  parentId: string | null;
}

export type VerifyStatus = 'authentic' | 'modified' | 'unknown';

export interface VerifyResult {
  status: VerifyStatus;
  similarity?: number;
  attestation?: AttestationDTO;
  diff?: string[];
}

export interface ExplorerPage {
  items: AttestationDTO[];
  nextCursor: string | null;
}

export interface Lineage {
  rootId: string;
  nodes: AttestationDTO[];
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ ok: boolean; network: string; packageId: string }> {
  const res = await fetch(url('/health'));
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/**
 * Returns true if the backend is reachable and configured.
 */
export async function isBackendAvailable(): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const h = await healthCheck();
    return h.ok === true;
  } catch {
    return false;
  }
}

// ── Register ──────────────────────────────────────────────────────────────────

export interface RegisterInput {
  file: File;
  creator: string;
  privacy: 'public' | 'encrypted';
  parentId?: string;
}

/**
 * Register a file via the backend.
 * Uses SERVER_SIGN mode (POST /api/register) — returns a finished receipt.
 *
 * Throws on network error or non-2xx response so callers can fall back to mock.
 */
export async function registerFile(input: RegisterInput): Promise<RegisterResponse> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('creator', input.creator);
  form.append('privacy', input.privacy);
  if (input.parentId) form.append('parentId', input.parentId);

  const res = await fetch(url('/register'), { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Build an unsigned PTB (wallet-sign mode).
 * Returns txBytes (base64) for the frontend wallet to sign and execute.
 */
export async function prepareRegisterTx(input: RegisterInput): Promise<PrepareResponse> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('creator', input.creator);
  form.append('privacy', input.privacy);
  if (input.parentId) form.append('parentId', input.parentId);

  // Use fetchWithRetry — covers Railway cold-start "Failed to fetch" failures
  const res = await fetchWithRetry(url('/register/prepare'), { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Prepare failed (${res.status}): ${body}`);
  }
  return res.json();
}

// ── Verify ────────────────────────────────────────────────────────────────────

export async function verifyFile(file: File): Promise<VerifyResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(url('/verify'), { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Verify failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function verifyById(id: string): Promise<VerifyResult> {
  const isObjectId = id.startsWith('0x') || id.length >= 60;
  const body = isObjectId ? { objectId: id } : { blobId: id };
  const res = await fetch(url('/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Verify failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Digest resolver ───────────────────────────────────────────────────────────

/** Resolve a tx digest → the created Attestation object ID. */
export async function resolveDigest(digest: string): Promise<string | null> {
  try {
    const res = await fetch(url(`/resolve-tx/${digest}`));
    if (!res.ok) return null;
    const j = await res.json() as { objectId?: string };
    return j.objectId ?? null;
  } catch {
    return null;
  }
}

// ── Attestation ───────────────────────────────────────────────────────────────

export async function getAttestation(id: string): Promise<AttestationDTO> {
  const res = await fetch(url(`/attestation/${id}`));
  if (!res.ok) throw new Error(`Attestation not found: ${id}`);
  return res.json();
}

// ── Lineage ───────────────────────────────────────────────────────────────────

export async function getLineage(id: string): Promise<Lineage> {
  const res = await fetch(url(`/lineage/${id}`));
  if (!res.ok) throw new Error(`Lineage fetch failed: ${id}`);
  return res.json();
}

// ── Explorer ──────────────────────────────────────────────────────────────────

export async function getExplorerPage(opts?: { limit?: number; cursor?: string }): Promise<ExplorerPage> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.cursor) params.set('cursor', opts.cursor);
  const res = await fetch(url(`/explorer?${params}`));
  if (!res.ok) throw new Error(`Explorer fetch failed`);
  return res.json();
}

// ── Blob proxy ────────────────────────────────────────────────────────────────

export function blobProxyUrl(blobId: string): string {
  return url(`/blob/${blobId}`);
}

// ── DTO → UI Attestation converter ───────────────────────────────────────────
// Converts an AttestationDTO from the backend into the richer Attestation shape
// the UI components expect.  Fields not available on-chain get sensible defaults.

import { thumb, type Attestation, type AttKind } from './data';

function kindFromMediaType(mt: string): AttKind {
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  if (mt.includes('csv') || mt.includes('parquet') || mt.includes('arrow')) return 'dataset';
  return 'docs';
}

export function dtoToAttestation(dto: AttestationDTO): Attestation {
  const kind = kindFromMediaType(dto.mediaType ?? '');
  const cred = dto.credential;
  const title =
    (cred?.metadata?.filename as string | undefined) ||
    (cred?.description
      ? cred.description.split('.')[0].slice(0, 50)
      : `${kind} · ${dto.blobId.slice(0, 8)}`);

  return {
    id:          dto.id,
    seq:         dto.createdAtMs,
    attId:       dto.id,
    blobId:      dto.blobId,
    objId:       dto.id,
    sha:         dto.sha256,
    phash:       dto.phash,
    title,
    kind,
    size:        '',
    format:      dto.mediaType ?? '',
    captured:    new Date(dto.createdAtMs).toISOString().split('T')[0],
    by:          { addr: dto.creator, name: dto.creator },
    date:        new Date(dto.createdAtMs).toISOString(),
    status:      'authentic',
    derivatives: 0,
    network:     'Sui Mainnet',
    epochs:      6,
    privacy:     dto.encrypted ? 'Encrypted' : 'Public',
    desc:        cred?.description ?? '',
    origin:      cred?.aiOrigin === 'likely-camera' ? 'Likely camera-original'
                 : cred?.aiOrigin === 'possibly-ai'  ? 'Possibly AI-generated'
                 : 'Unknown',
    tags:        cred?.tags ?? [],
    parent:      dto.parent ?? undefined,
    // Use the real image from Walrus for images; placeholder for everything else
    thumb:       kind === 'image' && dto.blobId
                   ? blobProxyUrl(dto.blobId)
                   : thumb(dto.blobId, kind),
  } as Attestation;
}
