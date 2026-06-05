'use client';
import React, { useState, useRef } from 'react';
import { useAccountBalance } from '@suiet/wallet-kit';
import { Icon, type IconName, Seal } from './icons';
import { truncate, type Attestation } from '@/lib/data';

// ---------- Button ----------
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: IconName | 'xLogo';
  iconRight?: IconName;
}

export function Button({ variant = 'primary', size, block, icon, iconRight, children, className = '', ...rest }: ButtonProps) {
  const cls = ['btn', `btn-${variant}`, size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '', block ? 'btn-block' : '', className].filter(Boolean).join(' ');
  const icSize = size === 'sm' ? 16 : 18;
  return (
    <button className={cls} {...rest}>
      {icon && icon !== 'xLogo' && <Icon name={icon as IconName} size={icSize} />}
      {icon === 'xLogo' && <svg width={icSize} height={icSize} viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L8.8 21H5.6l7.5-8.6L5.2 3h6.6l4.5 5.6L17.5 3Zm-1.1 16.1h1.8L7.7 4.8H5.8l10.6 14.3Z" /></svg>}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={icSize} />}
    </button>
  );
}

// ---------- Icon button ----------
export function IconButton({ name, size = 'md', active, title, ...rest }: { name: IconName; size?: 'sm' | 'md'; active?: boolean; title?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={'icon-btn' + (size === 'sm' ? ' sm' : '') + (active ? ' active' : '')} title={title} aria-label={title} {...rest}>
      <Icon name={name} size={size === 'sm' ? 17 : 20} />
    </button>
  );
}

// ---------- Card ----------
export function Card({ children, hoverable, className = '', style, ...rest }: { children: React.ReactNode; hoverable?: boolean; className?: string; style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={'neo-card' + (hoverable ? ' hoverable' : '') + ' ' + className} style={style} {...rest}>{children}</div>;
}

// ---------- Status pill ----------
const STATUS_MAP = {
  authentic: { cls: 'pill-success', icon: 'check' as IconName, label: 'Authentic' },
  modified: { cls: 'pill-warning', icon: 'diff' as IconName, label: 'Modified' },
  tampered: { cls: 'pill-danger', icon: 'x' as IconName, label: 'Tampered' },
  unknown: { cls: 'pill-neutral', icon: 'question' as IconName, label: 'Not found' },
};

export function StatusPill({ status, label, withIcon = true, dot = true }: { status: string; label?: string; withIcon?: boolean; dot?: boolean }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP] || STATUS_MAP.unknown;
  return (
    <span className={'pill ' + s.cls}>
      {dot && <span className="dot" />}
      {withIcon && !dot && <Icon name={s.icon} size={14} />}
      <span>{label || s.label}</span>
    </span>
  );
}

// ---------- Big status banner ----------
export function StatusBanner({ tone = 'success', icon, children }: { tone?: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className={'status-banner banner-' + tone}>
      <span className="ico-wrap"><Icon name={icon} size={22} /></span>
      <span>{children}</span>
    </div>
  );
}

// ---------- Chip ----------
export function Chip({ children, icon, active, clickable, onClick }: { children: React.ReactNode; icon?: IconName; active?: boolean; clickable?: boolean; onClick?: () => void }) {
  return (
    <span className={'chip' + (clickable ? ' clickable' : '') + (active ? ' active' : '')} onClick={clickable ? onClick : undefined}>
      {icon && <Icon name={icon} size={15} />}
      <span>{children}</span>
    </span>
  );
}

// ---------- Toggle / Switch ----------
export function Switch({ on, onChange, ...rest }: { on: boolean; onChange: (v: boolean) => void } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>) {
  return (
    <button className={'switch' + (on ? ' on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on} {...rest}>
      <span className="knob" />
    </button>
  );
}

// ---------- Segmented control ----------
export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] | { value: string; label: string }[] }) {
  return (
    <div className="seg">
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return <button key={val} className={value === val ? 'active' : ''} onClick={() => onChange(val)}>{lab}</button>;
      })}
    </div>
  );
}

// ---------- Stepper ----------
export function Stepper({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n === step ? 'active' : n < step ? 'done' : '';
        return (
          <div key={s} className={'step ' + state}>
            <span className="num">
              {state === 'done' ? <Icon name="checkSm" size={14} /> : n}
            </span>
            <span className="hide-mobile">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Thumbnail (inset frame) ----------
export function Thumb({ src, kind = 'image', size = 64, radius }: { src?: string | null; kind?: string; size?: number | string; radius?: number | string }) {
  const style: React.CSSProperties = typeof size === 'number' ? { width: size, height: size } : { width: size, height: size };
  if (radius != null) style.borderRadius = radius;
  const iconName = kind === 'video' ? 'video' : kind === 'dataset' ? 'database' : kind === 'docs' ? 'file' : 'image';
  return (
    <div className="thumb-frame" style={style}>
      {src ? <img src={src} alt="" /> : <Icon name={iconName as IconName} size={typeof size === 'number' ? size * 0.38 : 24} className="ph-icon" />}
    </div>
  );
}

// ---------- Label-value row ----------
export function LV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="lv">
      <span className="k">{k}</span>
      <span className="v">{children}</span>
    </div>
  );
}

// ---------- Copyable id ----------
export function CopyId({ value, display, ext }: { value: string; display?: string; ext?: boolean }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    try { navigator.clipboard.writeText(value); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <span className="copy-row">
      <span className="mono-id">{display || truncate(value, 6, 4)}</span>
      <button className={'copy-ic' + (copied ? ' copied' : '')} onClick={doCopy} title="Copy" aria-label="Copy">
        <Icon name={copied ? 'checkSm' : 'copy'} size={15} />
      </button>
      {ext !== false && (
        <button className="ext-ic" title="View on SuiScan" aria-label="View on SuiScan" onClick={e => e.preventDefault()}>
          <Icon name="external" size={15} />
        </button>
      )}
    </span>
  );
}

// ---------- Avatar ----------
export function Avatar({ seed = '', size = 30 }: { seed?: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  const bg = `linear-gradient(135deg, hsl(${hue} 55% 68%), hsl(${(hue + 40) % 360} 45% 40%))`;
  return <span style={{ width: size, height: size, background: bg, display: 'inline-block', borderRadius: '50%', boxShadow: 'var(--inset-sm)', flexShrink: 0 }} />;
}

// ---------- Wallet chip ----------
export function WalletChip({ wallet, onClick }: { wallet: { addr: string; wal?: string }; onClick?: () => void }) {
  const { balance, loading } = useAccountBalance();
  // balance is in MIST (1 SUI = 1_000_000_000 MIST)
  const suiBal = balance != null ? (Number(balance) / 1_000_000_000).toFixed(2) : null;

  return (
    <div className="wallet-chip" onClick={onClick}>
      <Avatar seed={wallet.addr} size={30} />
      <span className="addr">{truncate(wallet.addr, 6, 4)}</span>
      {!loading && suiBal && (
        <span className="bal hide-mobile">{suiBal} SUI</span>
      )}
      <span className="mainnet-dot" title="Sui Mainnet" />
    </div>
  );
}

// ---------- Drop zone ----------
export function DropZone({ onFile, caption, compact }: { onFile: (f: File) => void; caption?: string; compact?: boolean }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (file: File) => { if (file && onFile) onFile(file); };
  return (
    <div
      className={'dropzone' + (drag ? ' drag' : '')}
      style={compact ? { padding: '38px 28px' } : undefined}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); }}
    >
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handle(e.target.files[0]); }} />
      <span className="up-ico"><Icon name="cloud" size={30} /></span>
      <div className="h3" style={{ fontSize: 19 }}>{drag ? 'Drop to upload' : 'Drag a file here or browse'}</div>
      <div className="small">{caption || 'Images, video, PDF, datasets — up to 100 MB'}</div>
    </div>
  );
}

// ---------- File preview card ----------
export function FilePreview({ file, onRemove }: { file: { preview?: string | null; kind: string; name: string; sizeLabel: string; typeLabel: string }; onRemove?: () => void }) {
  return (
    <div className="neo-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <Thumb src={file.preview} kind={file.kind} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
        <div className="small">{file.sizeLabel} · {file.typeLabel}</div>
      </div>
      {onRemove && <IconButton name="trash" size="sm" onClick={onRemove} title="Remove" />}
    </div>
  );
}

// ---------- Section heading ----------
export function SectionTitle({ children, sub, right }: { children: React.ReactNode; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="row between" style={{ marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div className="h2">{children}</div>
        {sub && <div className="body" style={{ marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ---------- Stat tile ----------
export function StatTile({ icon, value, label }: { icon: IconName; value: string | number; label: string }) {
  return (
    <div className="neo-card stat-tile" style={{ padding: 24 }}>
      <span className="st-ico"><Icon name={icon} size={22} /></span>
      <div className="st-val">{value}</div>
      <div className="st-label">{label}</div>
    </div>
  );
}
