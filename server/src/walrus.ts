/**
 * Walrus storage helpers
 * Store and retrieve blobs via the Walrus publisher / aggregator HTTP API.
 */

// Publishers tried in order — staketab is first because it's confirmed reachable from Railway.
const PUBLISHER_POOL = [
  'https://wal-publisher-testnet.staketab.org',
  'https://publisher.walrus-testnet.walrus.space',
  'https://walrus-testnet-publisher.nodeinfra.com',
];

function getPublisher(): string {
  const url = process.env.WALRUS_PUBLISHER;
  return (url ?? PUBLISHER_POOL[0]).replace(/\/$/, '');
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
 * Tries publishers in order until one succeeds.
 */
export async function storeBlob(bytes: Uint8Array, contentType = 'application/octet-stream'): Promise<string> {
  const epochs = getEpochs();
  const primary = getPublisher();
  const publishers = [primary, ...PUBLISHER_POOL.filter(p => p !== primary)];
  let lastErr: Error = new Error('No Walrus publishers available');

  for (const pub of publishers) {
    try {
      const res = await fetch(`${pub}/v1/blobs?epochs=${epochs}`, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: Buffer.from(bytes),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${pub} returned ${res.status}: ${body}`);
      }
      const json = await res.json() as WalrusPutResponse;
      const blobId = json.newlyCreated?.blobObject?.blobId ?? json.alreadyCertified?.blobId;
      if (!blobId) throw new Error(`Unexpected response shape from ${pub}`);
      return blobId;
    } catch (err) {
      console.warn(`[walrus] publisher ${pub} failed: ${(err as Error).message}`);
      lastErr = err as Error;
    }
  }
  throw lastErr;
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
