/**
 * Tatum-routed SuiClient
 * ALL Sui RPC calls go through the Tatum gateway — never a direct fullnode.
 *
 * Fix A: fetchWithRetry wraps every Tatum call with exponential backoff so
 * transient 429s don't hard-fail the request.
 */
import { SuiClient, SuiHTTPTransport } from '@mysten/sui/client';

function getTatumKey(): string {
  const key = process.env.TATUM_API_KEY;
  if (!key) throw new Error('TATUM_API_KEY is not set');
  return key;
}

function getTatumRpc(): string {
  const rpc = process.env.TATUM_SUI_RPC;
  if (!rpc) throw new Error('TATUM_SUI_RPC is not set');
  return rpc;
}

// ── Fix A: retry with exponential backoff on 429 ─────────────────────────────

async function fetchWithRetry(
  input: string | URL,
  init?: RequestInit,
  tries = 5,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(input as string, init);
    if (res.status !== 429 || attempt >= tries) return res;
    const ra = Number(res.headers.get('retry-after'));
    const wait = ra > 0
      ? ra * 1000
      : Math.min(8000, 250 * 2 ** attempt) + Math.random() * 250;
    console.warn(`[tatum] 429 on attempt ${attempt + 1}, retrying in ${Math.round(wait)}ms`);
    await new Promise(r => setTimeout(r, wait));
  }
}

// ── Tatum-routed SuiClient ────────────────────────────────────────────────────

let _sui: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (_sui) return _sui;
  const transport = new SuiHTTPTransport({
    url: getTatumRpc(),
    fetch: (input, init) => {
      const headers = new Headers((init?.headers ?? {}) as Record<string, string>);
      headers.set('x-api-key', getTatumKey());
      headers.set('Authorization', `Bearer ${getTatumKey()}`);
      return fetchWithRetry(input as string, { ...init, headers });
    },
  });
  _sui = new SuiClient({ transport });
  return _sui;
}

// ── Tatum Data API helpers ────────────────────────────────────────────────────

const TATUM_DATA_BASE = 'https://api.tatum.io';

async function tatumDataFetch(path: string): Promise<unknown> {
  const res = await fetchWithRetry(`${TATUM_DATA_BASE}${path}`, {
    headers: {
      'x-api-key': getTatumKey(),
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tatum Data API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function checkMaliciousAddress(address: string): Promise<{ malicious: boolean; source: string; detail?: string }> {
  try {
    const data = await tatumDataFetch(`/v3/blockchain/surveillance/address/${address}`) as Record<string, unknown>;
    const malicious = Boolean(data.malicious ?? data.isBlacklisted ?? false);
    return { malicious, source: 'tatum-data-api', detail: JSON.stringify(data) };
  } catch (err) {
    console.warn(`[tatum] checkMaliciousAddress failed (non-fatal): ${(err as Error).message}`);
    return { malicious: false, source: 'tatum-unavailable', detail: (err as Error).message };
  }
}

export async function getTransactionHistory(address: string, limit = 5): Promise<unknown[]> {
  try {
    const data = await tatumDataFetch(`/v3/sui/account/transaction/${address}?pageSize=${limit}`) as unknown[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
