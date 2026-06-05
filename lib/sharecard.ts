'use client';
/**
 * Generates and downloads a shareable PNG card for a Veris attestation.
 * All drawing is done on a 2× retina canvas — no external dependencies.
 */

export interface ShareCardData {
  title: string;
  status: 'authentic' | 'modified' | 'unknown';
  creator: string;
  date: string;
  kind?: string;
  preview?: string | null; // data URL or blob proxy URL
  objId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function sf(size: number, weight = 400) {
  return `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function downloadShareCard(data: ShareCardData, filename?: string) {
  const W = 800, H = 440;
  const S = 2; // retina scale

  const canvas = document.createElement('canvas');
  canvas.width  = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(S, S);

  // ── Palette ──────────────────────────────────────────────────────────────
  const BASE    = '#E3ECF8';
  const ALT     = '#D7E3F4';
  const DARK    = '#AFC2DE';
  const LIGHT   = '#FFFFFF';
  const N900    = '#0E1E3A';
  const N700    = '#1E3A6B';
  const N500    = '#46618F';
  const N300    = '#7E93B8';
  const GREEN   = '#3FA877';
  const GREEN_T = '#DCEFE6';
  const WARN    = '#E2A33C';
  const WARN_T  = '#F5E9D2';

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = BASE;
  ctx.fillRect(0, 0, W, H);

  // ── Card surface (neumorphic) ─────────────────────────────────────────────
  const CX = 28, CY = 28, CW = W - 56, CH = H - 56, CR = 24;

  ctx.save();
  ctx.shadowColor = DARK;
  ctx.shadowBlur = 22; ctx.shadowOffsetX = 9; ctx.shadowOffsetY = 9;
  rr(ctx, CX, CY, CW, CH, CR); ctx.fillStyle = BASE; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = LIGHT;
  ctx.shadowBlur = 22; ctx.shadowOffsetX = -9; ctx.shadowOffsetY = -9;
  rr(ctx, CX, CY, CW, CH, CR); ctx.fillStyle = BASE; ctx.fill();
  ctx.restore();

  // Clip all further drawing to the card
  rr(ctx, CX, CY, CW, CH, CR);
  ctx.clip();

  // ── Header bar ────────────────────────────────────────────────────────────
  const HDR_H = 68;
  ctx.fillStyle = ALT;
  ctx.fillRect(CX, CY, CW, HDR_H);

  // Logo
  const logo = await loadImg('/assets/veris-mark.png');
  const LOGO_X = CX + 28, LOGO_Y = CY + 18;
  if (logo) ctx.drawImage(logo, LOGO_X, LOGO_Y, 30, 30);

  ctx.fillStyle = N900;
  ctx.font = sf(22, 700);
  ctx.textAlign = 'left';
  ctx.fillText('Veris', LOGO_X + (logo ? 40 : 0), CY + 39);

  ctx.fillStyle = N300;
  ctx.font = sf(13);
  ctx.textAlign = 'right';
  ctx.fillText('veris-bay-five.vercel.app', CX + CW - 28, CY + 39);

  // Divider
  ctx.strokeStyle = `rgba(126,147,184,0.25)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX, CY + HDR_H);
  ctx.lineTo(CX + CW, CY + HDR_H);
  ctx.stroke();

  // ── Content ───────────────────────────────────────────────────────────────
  const CONT_Y = CY + HDR_H + 28;
  const THUMB  = 120;
  const TX = CX + 36, TY = CONT_Y;

  // Thumbnail
  let thumbImg: HTMLImageElement | null = null;
  if (data.preview) thumbImg = await loadImg(data.preview);

  if (thumbImg) {
    ctx.save();
    rr(ctx, TX, TY, THUMB, THUMB, 14);
    ctx.clip();
    // cover-fit
    const ir = thumbImg.width / thumbImg.height;
    const fr = THUMB / THUMB;
    let sw = THUMB, sh = THUMB, sx = TX, sy = TY;
    if (ir > fr) { sw = THUMB * ir; sx = TX - (sw - THUMB) / 2; }
    else         { sh = THUMB / ir; sy = TY - (sh - THUMB) / 2; }
    ctx.drawImage(thumbImg, sx, sy, sw, sh);
    ctx.restore();
  } else {
    // placeholder inset box
    ctx.fillStyle = ALT;
    ctx.save();
    ctx.shadowColor = DARK;  ctx.shadowBlur = 8; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
    rr(ctx, TX, TY, THUMB, THUMB, 14); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = LIGHT; ctx.shadowBlur = 8; ctx.shadowOffsetX = -4; ctx.shadowOffsetY = -4;
    rr(ctx, TX, TY, THUMB, THUMB, 14); ctx.fill();
    ctx.restore();

    const icon = data.kind === 'video' ? '▶' : data.kind === 'dataset' ? '⬛' : data.kind === 'docs' ? '📄' : '🖼';
    ctx.font = `${THUMB * 0.38}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(icon, TX + THUMB / 2, TY + THUMB / 2 + THUMB * 0.14);
  }

  // Info column
  const IX = TX + THUMB + 26;
  let IY = CONT_Y + 4;

  // File name
  ctx.fillStyle = N900;
  ctx.font = sf(19, 600);
  ctx.textAlign = 'left';
  ctx.fillText(truncate(data.title, 40), IX, IY + 20);
  IY += 38;

  // Status pill
  const isAuth = data.status === 'authentic';
  const isMod  = data.status === 'modified';
  const pillBg    = isAuth ? GREEN_T : isMod ? WARN_T : ALT;
  const pillColor = isAuth ? GREEN   : isMod ? WARN   : N500;
  const pillLabel = isAuth ? '● Authentic' : isMod ? '● Modified' : '● Unknown';

  ctx.font = sf(14, 500);
  const pillW = ctx.measureText(pillLabel).width + 28;
  ctx.fillStyle = pillBg;
  rr(ctx, IX, IY, pillW, 30, 999); ctx.fill();
  ctx.fillStyle = pillColor;
  ctx.fillText(pillLabel, IX + 14, IY + 20);
  IY += 44;

  // Creator + date
  ctx.fillStyle = N300;
  ctx.font = sf(13);
  ctx.fillText(`Registered by  ${shortAddr(data.creator)}`, IX, IY);
  IY += 20;
  ctx.fillText(data.date, IX, IY);

  // ── Footer ────────────────────────────────────────────────────────────────
  const FY = CY + CH - 46;
  ctx.strokeStyle = `rgba(126,147,184,0.18)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CX + 28, FY);
  ctx.lineTo(CX + CW - 28, FY);
  ctx.stroke();

  // Mainnet dot
  ctx.fillStyle = GREEN;
  ctx.shadowColor = `rgba(63,168,119,0.6)`;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(CX + 42, FY + 20, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = N500;
  ctx.font = sf(13, 500);
  ctx.textAlign = 'left';
  ctx.fillText('Anchored on Sui Mainnet', CX + 56, FY + 25);

  ctx.fillStyle = N300;
  ctx.font = sf(13);
  ctx.textAlign = 'right';
  ctx.fillText("Prove what's real permanently.", CX + CW - 28, FY + 25);

  // ── Download ──────────────────────────────────────────────────────────────
  const id  = data.objId ? data.objId.slice(2, 10) : Date.now().toString(16);
  const dl  = filename ?? `veris-${id}.png`;
  const url = canvas.toDataURL('image/png', 1.0);
  const a   = document.createElement('a');
  a.download = dl; a.href = url;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
