import { randHex, type AttKind } from './data';

export function kindFromType(type: string, name: string): AttKind {
  const n = (name || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf' || n.endsWith('.pdf') || n.endsWith('.doc') || n.endsWith('.docx')) return 'docs';
  if (n.endsWith('.csv') || n.endsWith('.parquet') || n.endsWith('.json') || n.endsWith('.arrow')) return 'dataset';
  return 'docs';
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function typeLabel(file: File, kind: AttKind): string {
  const ext = (file.name.split('.').pop() || '').toUpperCase();
  return ext || (kind === 'image' ? 'IMAGE' : 'FILE');
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return '0x' + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return randHex(64);
  }
}

function imageDims(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

export interface ProcessedFile {
  name: string;
  kind: AttKind;
  bytes: number;
  sizeLabel: string;
  typeLabel: string;
  preview: string | null;
  dims: { w: number; h: number } | null;
  sha: string;
  phash: string;
  format: string;
  registeredAt: number;
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const kind = kindFromType(file.type, file.name);
  const tl = typeLabel(file, kind);
  const result: ProcessedFile = {
    name: file.name,
    kind,
    bytes: file.size,
    sizeLabel: sizeLabel(file.size),
    typeLabel: tl,
    preview: null,
    dims: null,
    sha: randHex(64),
    phash: randHex(16),
    format: tl,
    registeredAt: Date.now(),
  };

  if (kind === 'image' && file.size < 30 * 1048576) {
    try {
      result.preview = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      result.dims = await imageDims(result.preview);
    } catch { /* ignore */ }
  }

  try {
    const buf = await file.slice(0, Math.min(file.size, 50 * 1048576)).arrayBuffer();
    result.sha = await sha256(buf);
  } catch { /* ignore */ }

  if (result.dims) result.format = `${tl} · ${result.dims.w}×${result.dims.h}`;

  return result;
}
