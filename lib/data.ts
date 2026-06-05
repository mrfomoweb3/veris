/* ============================================================
   VERIS — Sample data + format helpers
   ============================================================ */

export const truncate = (s: string, head = 6, tail = 4): string =>
  !s ? '' : s.length <= head + tail + 2 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

export const fmtDate = (d: string | number | Date): string =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const fmtDateTime = (d: string | number | Date): string =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
  ' · ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const timeAgo = (d: string | number | Date): string => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  const days = Math.round(s / 86400);
  if (days < 30) return days + 'd ago';
  return fmtDate(d);
};

export const randHex = (len: number): string => {
  const ch = '0123456789abcdef';
  let o = '0x';
  for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * 16)];
  return o;
};

// ---- Placeholder thumbnail generator ----
const PALETTES: [string, string][] = [
  ['#9db8e6', '#6f8fd0'], ['#a7c4c9', '#7aa3ab'], ['#c9b3d6', '#a584bf'],
  ['#d6c2a7', '#bfa07a'], ['#aecdb8', '#7fae93'], ['#d6b0b0', '#c08585'],
  ['#b0c0d6', '#8499bf'], ['#cdc4ae', '#aea284'],
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}

export type AttKind = 'image' | 'video' | 'docs' | 'dataset';

export function thumb(seed: string, kind: AttKind): string {
  const pal = PALETTES[Math.abs(hashCode(seed)) % PALETTES.length];
  const a = pal[0], b = pal[1];
  let inner = '';
  if (kind === 'video') {
    inner = `<circle cx="80" cy="80" r="22" fill="rgba(255,255,255,.55)"/><path d="M74 70 L92 80 L74 90 Z" fill="${b}"/>`;
  } else if (kind === 'docs') {
    inner = `<rect x="52" y="40" width="56" height="76" rx="6" fill="rgba(255,255,255,.55)"/><rect x="62" y="58" width="36" height="4" rx="2" fill="${b}" opacity=".6"/><rect x="62" y="70" width="36" height="4" rx="2" fill="${b}" opacity=".6"/><rect x="62" y="82" width="24" height="4" rx="2" fill="${b}" opacity=".6"/>`;
  } else if (kind === 'dataset') {
    inner = `<g fill="rgba(255,255,255,.5)"><rect x="48" y="52" width="20" height="20" rx="3"/><rect x="72" y="52" width="20" height="20" rx="3"/><rect x="96" y="52" width="16" height="20" rx="3"/><rect x="48" y="76" width="20" height="20" rx="3"/><rect x="72" y="76" width="20" height="20" rx="3"/><rect x="96" y="76" width="16" height="20" rx="3"/></g>`;
  } else {
    inner = `<circle cx="108" cy="50" r="16" fill="rgba(255,255,255,.6)"/><path d="M0 120 Q40 78 80 104 T160 96 V160 H0 Z" fill="rgba(255,255,255,.35)"/><path d="M0 140 Q50 104 96 128 T160 120 V160 H0 Z" fill="rgba(255,255,255,.45)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/>${inner}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ---- Types ----
export interface Wallet {
  addr: string;
  name: string;
  wal?: string;
  sui?: string;
}

export interface Attestation {
  id: string;
  seq: number;
  attId: string;
  blobId: string;
  objId: string;
  sha: string;
  phash: string;
  title: string;
  kind: AttKind;
  size: string;
  format: string;
  captured: string;
  by: Wallet;
  date: string;
  status: 'authentic' | 'modified' | 'tampered' | 'unknown';
  derivatives: number;
  network: string;
  epochs: number;
  privacy: string;
  desc: string;
  origin: string;
  tags: string[];
  changes?: string[];
  parent?: string;
  thumb: string;
  label?: string;
  summary?: string;
  children?: string[];
}

// ---- Wallets ----
export const WALLETS: Record<string, Wallet> = {
  me: { addr: '0x9a3f7c2e8b14d6a90f5e3c7b21d4a8f0e6c21d', name: 'You', wal: '12.4', sui: '3.82' },
  lena: { addr: '0x4d8e1a93f02c7b56e9a1d3f8c04b27e6a5f9c3', name: 'lena.sui' },
  studio: { addr: '0x7b2c9f04e8a1d63b5072e4c9af18d3026b7e1a', name: 'northlight.sui' },
  archive: { addr: '0x1f6a3d80c95e2b471a8df620e34c95b7028fa4', name: '0x1f6a…8fa4' },
  press: { addr: '0xc04e7b29a1f853d6072b9e4c1a8df3506e2b7c', name: 'reuters-desk.sui' },
};

// ---- Attestations ----
let _id = 1240;
function mk(o: Partial<Attestation>): Attestation {
  _id++;
  return Object.assign({
    attId: randHex(40), blobId: randHex(44), objId: randHex(40),
    sha: randHex(56), phash: randHex(16),
    network: 'Sui Mainnet', epochs: 6, privacy: 'Public',
    seq: _id, thumb: '', tags: [], derivatives: 0, changes: [],
  }, o) as Attestation;
}

export const ATTESTATIONS: Attestation[] = [
  mk({ id: 'a1', title: 'Harbor at dawn.raw', kind: 'image', size: '8.4 MB', format: 'RAW · 6000×4000', captured: '2026-05-28', by: WALLETS.studio, date: '2026-06-03T08:12:00', status: 'authentic', derivatives: 3,
    desc: 'A wide-angle harbor scene shot at first light. Long exposure smooths the water; warm sunrise tones along the eastern sky meet the cool blue of the marina. No signs of generative synthesis — sensor noise and lens vignetting are consistent with a full-frame camera original.',
    origin: 'Likely camera-original', tags: ['landscape', 'harbor', 'long-exposure', 'sunrise', 'RAW'] }),
  mk({ id: 'a2', title: 'Q2 earnings deck.pdf', kind: 'docs', size: '2.1 MB', format: 'PDF · 24 pages', captured: '2026-06-01', by: WALLETS.press, date: '2026-06-02T14:40:00', status: 'authentic', derivatives: 0, privacy: 'Encrypted',
    desc: 'A 24-page financial presentation. Document fingerprint anchored before public release to establish a tamper-evident record of the exact distributed version.',
    origin: 'Document original', tags: ['finance', 'report', 'confidential'] }),
  mk({ id: 'a3', title: 'Founder interview.mp4', kind: 'video', size: '64 MB', format: 'MP4 · 1080p · 4:12', captured: '2026-05-30', by: WALLETS.press, date: '2026-06-02T11:05:00', status: 'authentic', derivatives: 5,
    desc: 'A seated interview clip, single continuous take. Audio waveform and frame cadence are consistent with an unedited capture. Registered to anchor the source before clips are distributed to outlets.',
    origin: 'Likely camera-original', tags: ['video', 'interview', 'press', '1080p'] }),
  mk({ id: 'a4', title: 'training-set-v3.parquet', kind: 'dataset', size: '410 MB', format: 'Parquet · 1.2M rows', captured: '2026-05-22', by: WALLETS.archive, date: '2026-05-31T19:20:00', status: 'authentic', derivatives: 2,
    desc: 'A curated tabular dataset snapshot. Hash anchored to provide a citable, immutable reference for downstream model training and reproducibility.',
    origin: 'Dataset original', tags: ['dataset', 'ml', 'parquet', 'tabular'] }),
  mk({ id: 'a5', title: 'Harbor at dawn — web.jpg', kind: 'image', size: '1.2 MB', format: 'JPEG · 2400×1600', captured: '2026-06-03', by: WALLETS.me, date: '2026-06-03T09:30:00', status: 'modified', derivatives: 0, parent: 'a1',
    desc: 'Web-optimized derivative of "Harbor at dawn.raw". Cropped to a 3:2 web frame and exported at reduced resolution with a slight warm grade for editorial use.',
    origin: 'Derivative of registered original', tags: ['web', 'crop', 'export'], changes: ['Cropped to 3:2', 'Warmer white balance (+180K)', 'Downscaled to 2400px', 'Sharpening applied'] }),
  mk({ id: 'a6', title: 'Skyline composite.png', kind: 'image', size: '14 MB', format: 'PNG · 5000×3000', captured: '2026-05-26', by: WALLETS.lena, date: '2026-05-30T16:45:00', status: 'authentic', derivatives: 1,
    desc: 'A multi-frame skyline composite assembled from bracketed exposures. Registered as an authored original; AI analysis flags compositing but no generative content.',
    origin: 'Likely camera-original', tags: ['skyline', 'composite', 'cityscape'] }),
  mk({ id: 'a7', title: 'Field notes scan.pdf', kind: 'docs', size: '5.6 MB', format: 'PDF · 8 pages', captured: '2026-05-18', by: WALLETS.archive, date: '2026-05-29T10:10:00', status: 'authentic', derivatives: 0,
    desc: 'Scanned handwritten field notes. Anchored to preserve a verifiable record of the original document state.',
    origin: 'Document original', tags: ['scan', 'archive', 'notes'] }),
  mk({ id: 'a8', title: 'Product render hero.png', kind: 'image', size: '9.8 MB', format: 'PNG · 4096×4096', captured: '2026-05-20', by: WALLETS.lena, date: '2026-05-27T13:25:00', status: 'authentic', derivatives: 4,
    desc: 'A studio product render. AI analysis flags this as synthetic / rendered imagery rather than a camera capture — disclosed transparently in the credential.',
    origin: 'Possibly AI-generated', tags: ['render', '3d', 'product', 'synthetic'] }),
];
ATTESTATIONS.forEach(a => { a.thumb = thumb(a.id + a.title, a.kind); });

export const byId = (id: string): Attestation | undefined =>
  ATTESTATIONS.find(a => a.id === id);

// ---- Lineage nodes ----
function mkNode(id: string, label: string, summary: string, by: Wallet, date: string, children: string[]): Attestation {
  const m = mk({ id, title: label, kind: 'image', status: 'modified', by, date, summary, children });
  m.thumb = thumb(id + label, 'image');
  m.label = label;
  return m;
}

const lineageNodes: Record<string, Attestation> = {
  a1: Object.assign({}, byId('a1')!, { children: ['a5', 'L2', 'L3'] }),
  a5: Object.assign({}, byId('a5')!, { children: ['L4'] }),
  L2: mkNode('L2', 'Social square', 'Cropped 1:1 · logo added', WALLETS.press, '2026-06-03T10:15:00', []),
  L3: mkNode('L3', 'Print master', 'Upscaled · CMYK soft-proof', WALLETS.studio, '2026-06-03T12:00:00', []),
  L4: mkNode('L4', 'Thumbnail', 'Downscaled 400px · sharpened', WALLETS.me, '2026-06-03T11:00:00', []),
};

export const LINEAGE = { rootId: 'a1', nodes: lineageNodes };

// ---- Stats ----
export const STATS = {
  total: '1,284', stored: '4.7 GB', verifsToday: '312',
  mine: { attestations: 8, blobs: '23 MB', derivatives: 14 },
};

// ---- Wallet options ----
export const WALLET_OPTIONS = [
  { name: 'Sui Wallet', sub: 'Official · recommended', icon: 'wallet', grad: ['#6fa0ff', '#244577'] as [string, string] },
  { name: 'Suiet', sub: 'Open-source extension', icon: 'bolt', grad: ['#7fae93', '#3FA877'] as [string, string] },
  { name: 'Slush', sub: 'Mobile & browser', icon: 'globe', grad: ['#c9b3d6', '#a584bf'] as [string, string] },
  { name: 'Ledger', sub: 'Hardware wallet', icon: 'ledger', grad: ['#aecdb8', '#7aa3ab'] as [string, string] },
];
