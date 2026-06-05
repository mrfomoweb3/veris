# Veris — Prove what's real permanently.

**Decentralized provenance for the AI era.**  
Store originals on Walrus · Anchor attestations on Sui · Screen creators via Tatum

🌐 **Live demo:** https://veris-bay-five.vercel.app  
📄 **Contract:** `0xfde47b037e3ac625bfa075424af9317227ceb4cc3b798ee2b5c31399a61779e6` (Sui Mainnet)

---

## What it does

In a world of AI-generated everything, Veris gives files a tamper-proof birth certificate.

1. **Register** — Upload any file. Veris computes a SHA-256 + perceptual hash, stores the original on Walrus, generates an AI content credential (Claude + Tatum address screening), and anchors everything on Sui mainnet via the user's own wallet.
2. **Verify** — Drop the same (or a modified) file. Veris recomputes the fingerprint and checks against the on-chain registry. Returns **Authentic**, **Modified** (with AI-generated change summary), or **Unknown**.
3. **Explore** — Browse the full provenance registry. Every attestation links back to the original creator's wallet address.
4. **Lineage** — Pan/zoom the edit-history tree showing every derivative registered from an original.

---

## Tatum Integration

Every Sui interaction goes through the Tatum gateway — no direct fullnode, anywhere.

```ts
// tatum.ts — all RPC calls use Tatum with retry/backoff
const transport = new SuiHTTPTransport({
  url: process.env.TATUM_SUI_RPC, // https://sui-mainnet.gateway.tatum.io
  fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('x-api-key', process.env.TATUM_API_KEY);
    return fetchWithRetry(input, { ...init, headers }); // exponential backoff on 429
  },
});
export const sui = new SuiClient({ transport });
```

**Tatum is used for:**
| Usage | Detail |
|---|---|
| All Sui RPC reads | `getObject`, `queryEvents`, `getReferenceGasPrice`, `getTransactionBlock` |
| PTB building | `tx.build({ client: sui })` — gas price cached 60s to minimise calls |
| Transaction submission | `signAndExecuteTransaction` routed through Tatum |
| Tatum Data API | `checkMaliciousAddress(creator)` — AML screening on every registration |

---

## Walrus Integration

Files and credentials are stored on Walrus testnet:

- **Original file** → PUT `/v1/blobs` → returns `blobId` stored on-chain
- **AI credential JSON** → PUT `/v1/blobs` → stored alongside the original
- **Blob proxy** → `GET /api/blob/:blobId` reads from Walrus aggregator and streams to browser
- **Verify diff** → fetches original bytes from Walrus to compare with the submitted file

Two Walrus blobs are created per registration, both blob IDs anchored in the Sui Attestation object.

---

## Move Contract

```move
public struct Attestation has key, store {
    creator: address,       // user's wallet — they sign, they own it
    blob_id: String,        // Walrus blob of the original file
    credential_blob_id: String, // Walrus blob of the AI credential JSON
    sha256: String,         // hex fingerprint for exact matching
    phash: String,          // perceptual hash for similarity matching
    media_type: String,
    parent: Option<ID>,     // derivative lineage
    encrypted: bool,
    created_at_ms: u64,
}
```

Every `Attestation` is **frozen** after creation — immutable on-chain forever.  
`AttestationCreated` events are emitted so the explorer can index via Tatum's `suix_queryEvents`.

---

## Architecture

```
Browser (Next.js + Suiet Wallet Kit)
    │
    ├── POST /api/register/prepare
    │       └── SHA-256 + pHash
    │       └── Walrus upload (original + credential)
    │       └── Claude vision → AI credential
    │       └── Tatum AML screen (creator address)
    │       └── Build unsigned PTB (offline — no extra RPC calls)
    │
    ├── User wallet signs txBytes → Sui mainnet via Tatum RPC
    │
    └── POST /api/verify
            └── Recompute fingerprint
            └── findBySha256 (Tatum queryEvents)
            └── findByPhash (similarity search)
            └── explainDiff (Claude vision on original vs submitted)

Backend: Hono / Node on Railway
Walrus: testnet (staketab publisher, works from Railway)
Sui: mainnet (Tatum gateway for all RPC)
```

---

## Running locally

```bash
# 1. Backend
cd server
cp .env.example .env   # fill in TATUM_API_KEY, ANTHROPIC_API_KEY
npm install && npm run dev

# 2. Frontend
cd ..
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8787
npm install && npm run dev
```

Full setup: see [RUNBOOK.md](RUNBOOK.md)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Suiet Wallet Kit |
| Backend | Hono, Node 20, TypeScript |
| Storage | Walrus (testnet) |
| Chain | Sui Mainnet |
| RPC | Tatum (`sui-mainnet.gateway.tatum.io`) |
| AI | Anthropic Claude (vision + credential generation) |
| Contract | Sui Move (deployed mainnet) |
