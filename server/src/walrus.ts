/**
 * Walrus storage helpers
 * Store and retrieve blobs via the Walrus publisher / aggregator HTTP API.
 */

function getPublisher(): string {
  const url = process.env.WALRUS_PUBLISHER;
  if (!url) throw new Error('WALRUS_PUBLISHER is not set');
  return url.replace(/\/$/, '');
}

function getAggregator(): string {
  const url = process.env.WALRUS_AGGREGATOR;
  if (!url) throw new Error('WALRUS_AGGREGATOR is not set');
  return url.replace(/\/$/, '');
}

function getEpochs(): number {
  return parseInt(process.env.WALRUS_EPOCHS ?? '6', 10);
}

/**
 * Store bytes on Walrus and return the blob ID.
 * Uses PUT /v1/blobs (Walrus publisher HTTP API).
 */
export async function storeBlob(bytes: Uint8Array, contentType = 'application/octet-stream'): Promise<string> {
  const epochs = getEpochs();
  const url = `${getPublisher()}/v1/blobs?epochs=${epochs}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: Buffer.from(bytes),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Walrus PUT failed (${res.status}): ${body}`);
  }

  const json = await res.json() as WalrusPutResponse;

  // Walrus returns either newlyCreated or alreadyCertified
  const blobId =
    json.newlyCreated?.blobObject?.blobId ??
    json.alreadyCertified?.blobId;

  if (!blobId) {
    throw new Error(`Walrus PUT returned unexpected shape: ${JSON.stringify(json)}`);
  }
  return blobId;
}

/**
 * Read bytes from Walrus by blob ID.
 */
export async function readBlob(blobId: string): Promise<ArrayBuffer> {
  const url = `${getAggregator()}/v1/blobs/${blobId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Walrus GET failed (${res.status}) for blob ${blobId}`);
  return res.arrayBuffer();
}

/**
 * Return the aggregator URL for a blob ID (for proxying to browser).
 */
export function blobUrl(blobId: string): string {
  return `${getAggregator()}/v1/blobs/${blobId}`;
}

// ── Walrus response types (subset) ────────────────────────────────────────────

interface WalrusBlobObject {
  blobId: string;
  registeredEpoch: number;
  certifiedEpoch?: number;
  size: number;
}

interface WalrusPutResponse {
  newlyCreated?: { blobObject: WalrusBlobObject };
  alreadyCertified?: { blobId: string; eventSeq: string };
}
