/**
 * Tatum-routed SuiClient
 * ALL Sui RPC calls go through the Tatum gateway — never a direct fullnode.
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

/**
 * SuiClient routed through the Tatum gateway.
 * Lazily initialised so the env can be loaded before first use.
 */
let _sui: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (_sui) return _sui;
  const transport = new SuiHTTPTransport({
    url: getTatumRpc(),
    fetch: (input, init) => {
      const headers = new Headers((init?.headers ?? {}) as Record<string, string>);
      headers.set('x-api-key', getTatumKey());
      // Tatum also accepts Authorization: Bearer <key> — add both for compatibility
      headers.set('Authorization', `Bearer ${getTatumKey()}`);
      return fetch(input as string, { ...init, headers });
    },
  });
  _sui = new SuiClient({ transport });
  return _sui;
}

// ── Tatum Data API helpers ────────────────────────────────────────────────────
// Sui is covered by the Tatum Data API for address screening.
// Base URL pattern: https://api.tatum.io/v3/blockchain/wallet/... (REST)
// We expose these as typed wrappers so the agent can call them directly.

const TATUM_DATA_BASE = 'https://api.tatum.io';

async function tatumDataFetch(path: string): Promise<unknown> {
  const res = await fetch(`${TATUM_DATA_BASE}${path}`, {
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

/**
 * Screen a wallet address for malicious activity via Tatum.
 * Uses the AML / compliance endpoint.
 * Returns { malicious: boolean, source: 'tatum', detail?: string }
 */
export async function checkMaliciousAddress(address: string): Promise<{ malicious: boolean; source: string; detail?: string }> {
  try {
    // Tatum KMS / AML check endpoint (verify in Tatum docs for your plan tier)
    const data = await tatumDataFetch(`/v3/blockchain/surveillance/address/${address}`) as Record<string, unknown>;
    const malicious = Boolean(data.malicious ?? data.isBlacklisted ?? false);
    return { malicious, source: 'tatum-data-api', detail: JSON.stringify(data) };
  } catch (err) {
    // Non-fatal: if the endpoint isn't available on the current plan, return safe default
    console.warn(`[tatum] checkMaliciousAddress failed (non-fatal): ${(err as Error).message}`);
    return { malicious: false, source: 'tatum-unavailable', detail: (err as Error).message };
  }
}

/**
 * Get recent transaction history for an address via Tatum.
 */
export async function getTransactionHistory(address: string, limit = 5): Promise<unknown[]> {
  try {
    const data = await tatumDataFetch(`/v3/sui/account/transaction/${address}?pageSize=${limit}`) as unknown[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
