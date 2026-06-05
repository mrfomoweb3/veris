# Veris — Local Development & Deployment Guide

---

## How the App Works

```
Browser (Next.js)
    │
    │  1. User connects Suiet wallet
    │  2. Uploads file → POST /api/register/prepare
    │  3. Wallet signs txBytes → submits to Sui mainnet
    │
    ▼
Backend (Hono / Node)               ◄── Tatum Sui RPC (mainnet)
    │  • SHA-256 + pHash fingerprint
    │  • Stores original on Walrus
    │  • AI credential (Claude + Tatum MCP)
    │  • Builds unsigned Sui transaction
    │
    ▼
Walrus (decentralised storage)       ← file bytes + credential JSON
Sui Mainnet                          ← Attestation object (frozen)
```

**Contract on mainnet:**
`0xfde47b037e3ac625bfa075424af9317227ceb4cc3b798ee2b5c31399a61779e6`

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node 20+ | https://nodejs.org |
| Sui CLI | `brew install sui` |
| Suiet Wallet | Chrome extension: https://suiet.app |

---

## 1 — Local Development

### Step 1 — Install dependencies

```bash
# Frontend
cd /Users/macbook/veris
npm install

# Backend
cd server
npm install
```

### Step 2 — Backend `.env` (already configured at `server/.env`)

Key values already set:
```
TATUM_API_KEY=...            ✅
TATUM_SUI_RPC=https://sui-mainnet.gateway.tatum.io  ✅
WALRUS_PUBLISHER=https://publisher.walrus.xyz        ✅
WALRUS_AGGREGATOR=https://aggregator.walrus.xyz      ✅
SUI_PACKAGE_ID=0xfde47b037e...                       ✅
ANTHROPIC_API_KEY=...                                ✅
SERVER_SIGN=false            ✅ (users sign with their own wallet)
```

### Step 3 — Frontend `.env.local` (already configured)

```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Step 4 — Start both servers

**Terminal 1 — Backend:**
```bash
cd /Users/macbook/veris/server
npm run dev
```
You should see:
```
🟢  Veris backend listening on http://localhost:8787
    Network : mainnet
    Tatum RPC: https://sui-mainnet.gateway.tatum.io
```

**Terminal 2 — Frontend:**
```bash
cd /Users/macbook/veris
npm run dev
```
Open http://localhost:3000

---

## 2 — Testing Each Flow

### ✅ Health check (confirm backend is running)
```bash
curl http://localhost:8787/api/health
```
Expected:
```json
{ "ok": true, "network": "mainnet", "packageId": "0xfde47b..." }
```

---

### ✅ Connect Wallet
1. Open http://localhost:3000
2. Click **Connect Wallet**
3. The Suiet kit modal opens — select your wallet
4. Approve in the wallet extension
5. You land on the Dashboard

---

### ✅ Register a File
1. Click **Register a file** (sidebar or dashboard)
2. **Step 1 — Upload:** drag any image/PDF/video onto the drop zone
   - SHA-256 is computed locally in the browser
3. **Step 2 — Credential:** review the AI content credential
   - Toggle Public / Encrypted
   - Optionally mark as a derivative and pick a parent
4. **Step 3 — Confirm:** click **Sign & Register**
   - Backend uploads the file to Walrus (~2–5s)
   - Backend builds the Sui transaction
   - **Your Suiet wallet popup appears** — approve it
   - Transaction is submitted to Sui mainnet with YOUR address as creator
5. Success screen shows:
   - Attestation ID (= Sui tx digest)
   - Walrus blob ID
   - Click **View attestation** to see the detail page

---

### ✅ Verify a File
1. Click **Verify** in the sidebar
2. Upload a file (or paste a blob/object ID)
3. Click **Verify**
   - Backend recomputes fingerprint
   - Searches the registry for a SHA-256 match → **Authentic**
   - Or pHash similarity match → **Modified** with AI diff
   - Or nothing found → **Unknown**
4. For a quick demo click the **Authentic / Modified / Not found** chips

---

### ✅ Explorer
- Shows all attestations registered via Veris (fetched from Sui events)
- Filter by type, search by name or wallet address
- Click any card → Attestation Detail page

---

### ✅ Attestation Detail
- On-chain record: Sui object ID, registrant address, timestamp
- Storage: Walrus blob ID, epochs, privacy
- AI Content Credential: description, origin, tags
- Lineage: parent + derivatives
- Embed badge: copy the `<script>` tag to embed on any website

---

### ✅ Lineage Tree
- Pan and zoom the provenance tree
- Click any node to see its full detail panel
- Accessible from Explorer → Detail → "View tree" button

---

## 3 — Common Issues

| Problem | Fix |
|---------|-----|
| `WALRUS_PUBLISHER` returns 402 | You need WAL tokens — get them at https://walrus.xyz |
| Wallet popup doesn't appear | Make sure Suiet is on **Sui Mainnet** (not testnet) |
| `SUI_PACKAGE_ID not set` error | Already set in `server/.env` — restart the server |
| Explorer shows no attestations | Normal until you register your first file |
| `TATUM_API_KEY` 401 error | Check the key at https://dashboard.tatum.io |

---

## 4 — Deploy Online

### 4a — Backend → Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
cd /Users/macbook/veris/server
railway login
railway init          # creates a new project called "veris-backend"
railway up
```

3. Set environment variables in the Railway dashboard (paste from `server/.env`):
   - Go to your project → Variables → paste all the env vars
   - Set `FRONTEND_ORIGIN=https://your-vercel-url.vercel.app`

4. Get your backend URL (e.g. `https://veris-backend.up.railway.app`)

---

### 4b — Frontend → Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd /Users/macbook/veris
vercel
```
Follow the prompts (link to your account, confirm settings).

3. Set environment variable in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-railway-url.up.railway.app`
   - Redeploy: `vercel --prod`

4. Update backend `FRONTEND_ORIGIN` to your Vercel URL and redeploy backend.

---

## 5 — Verify It's Live

```bash
# Backend health
curl https://your-railway-url.up.railway.app/api/health

# Explorer
curl https://your-railway-url.up.railway.app/api/explorer?limit=5
```

Then open your Vercel URL, connect your wallet, and register a file.
Every attestation is permanently anchored on **Sui Mainnet** at:
`https://suiscan.xyz/mainnet/object/<attestation-id>`
