'use client';
import React from 'react';

interface SvgProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  strokeWidth?: number;
}

const I = (paths: React.ReactNode, vb = 24) =>
  function SvgIcon({ size = 22, color, style, className, strokeWidth = 1.7 }: SvgProps) {
    return (
      <svg
        width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}
        fill="none" stroke={color || 'currentColor'}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        style={style} className={className}
      >
        {paths}
      </svg>
    );
  };

const p = (d: string, extra?: Record<string, unknown>) => <path d={d} key={d.slice(0, 8)} {...extra} />;
const c = (cx: number, cy: number, r: number, extra?: Record<string, unknown>) => <circle cx={cx} cy={cy} r={r} key={`c${cx}${cy}`} {...extra} />;
const ln = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} key={`l${x1}${y1}`} />;
const rect = (x: number, y: number, w: number, h: number, rx?: number) => <rect x={x} y={y} width={w} height={h} rx={rx} key={`r${x}${y}`} />;

export const Icons = {
  home: I(<>{p('M3 10.5 12 3l9 7.5')}{p('M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5')}</>),
  register: I(<>{p('M12 16V4')}{p('M8 8l4-4 4 4')}{p('M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2')}</>),
  shieldCheck: I(<>{p('M12 3 5 6v5.5c0 4.2 2.9 7.3 7 8.5 4.1-1.2 7-4.3 7-8.5V6l-7-3Z')}{p('M9 11.8l2.1 2.1L15 10')}</>),
  verify: I(<>{p('M12 3 5 6v5.5c0 4.2 2.9 7.3 7 8.5 4.1-1.2 7-4.3 7-8.5V6l-7-3Z')}{p('M9 11.8l2.1 2.1L15 10')}</>),
  explorer: I(<>{c(11, 11, 7)}{ln(20, 20, 16.5, 16.5)}{p('M11 7.5v7M7.5 11h7', { opacity: .45 })}</>),
  grid: I(<>{rect(3, 3, 8, 8, 2)}{rect(13, 3, 8, 8, 2)}{rect(3, 13, 8, 8, 2)}{rect(13, 13, 8, 8, 2)}</>),
  docs: I(<>{p('M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z')}{p('M13 3v5h5', { opacity: .5 })}{ln(8.5, 13, 15.5, 13)}{ln(8.5, 16.5, 13.5, 16.5)}</>),
  settings: I(<>{c(12, 12, 3.2)}{p('M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z')}</>),
  layers: I(<>{p('M12 3 3 8l9 5 9-5-9-5Z')}{p('M3 13l9 5 9-5', { opacity: .55 })}</>),
  upload: I(<>{p('M12 16V5')}{p('M8 9l4-4 4 4')}{p('M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2')}</>),
  cloud: I(<>{p('M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 0 7H7Z')}{p('M12 16v-5M9.5 12.5 12 10l2.5 2.5')}</>),
  search: I(<>{c(11, 11, 7)}{ln(20, 20, 16.5, 16.5)}</>),
  check: I(p('M5 12.5 10 17.5 19 7')),
  checkSm: I(p('M5 12l4.5 4.5L19 7')),
  close: I(<>{ln(6, 6, 18, 18)}{ln(18, 6, 6, 18)}</>),
  chevR: I(p('M9 5l7 7-7 7')),
  chevL: I(p('M15 5l-7 7 7 7')),
  chevD: I(p('M5 9l7 7 7-7')),
  arrowR: I(<>{ln(4, 12, 20, 12)}{p('M14 6l6 6-6 6')}</>),
  copy: I(<>{rect(8, 8, 12, 12, 2.5)}{p('M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3')}</>),
  external: I(<>{p('M14 4h6v6')}{p('M20 4 11 13')}{p('M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4')}</>),
  sparkle: I(<>{p('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z')}{p('M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z', { opacity: .5 })}</>),
  image: I(<>{rect(3, 4, 18, 16, 3)}{c(8.5, 9.5, 1.8)}{p('M4 17l4.5-4.5 3 3L16 11l4 4', { opacity: .8 })}</>),
  video: I(<>{rect(3, 5, 14, 14, 3)}{p('M17 9.5 21 7v10l-4-2.5', { opacity: .9 })}</>),
  file: I(<>{p('M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z')}{p('M13 3v5h5', { opacity: .5 })}</>),
  database: I(<>{p('M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3Z')}{p('M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6')}{p('M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6', { opacity: .7 })}</>),
  trash: I(<>{p('M5 7h14')}{p('M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2')}{p('M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12')}</>),
  lock: I(<>{rect(5, 11, 14, 9, 3)}{p('M8 11V8a4 4 0 0 1 8 0v3')}{c(12, 15.5, 1.3)}</>),
  globe: I(<>{c(12, 12, 8.5)}{p('M3.5 12h17', { opacity: .8 })}{p('M12 3.5c2.3 2.4 3.5 5.4 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.4-3.5-8.5S9.7 5.9 12 3.5Z', { opacity: .8 })}</>),
  diff: I(<>{p('M9 3v6M6 6h6')}{ln(4, 18, 14, 18)}</>),
  git: I(<>{c(6, 6, 2.5)}{c(6, 18, 2.5)}{c(18, 9, 2.5)}{p('M6 8.5v7')}{p('M18 11.5c0 3-3 3.5-6 4', { opacity: .8 })}</>),
  tree: I(<>{rect(9, 3, 6, 5, 2)}{rect(3, 16, 6, 5, 2)}{rect(15, 16, 6, 5, 2)}{p('M12 8v3M12 11H6v5M12 11h6v5', { opacity: .7 })}</>),
  question: I(<>{c(12, 12, 9)}{p('M9.2 9.2a2.8 2.8 0 0 1 5.5.8c0 1.9-2.7 2.5-2.7 4')}{ln(12, 17.5, 12, 17.6)}</>),
  info: I(<>{c(12, 12, 9)}{ln(12, 11, 12, 16)}{ln(12, 8, 12, 8.1)}</>),
  plus: I(<>{ln(12, 5, 12, 19)}{ln(5, 12, 19, 12)}</>),
  minus: I(ln(5, 12, 19, 12)),
  x: I(p('M4 4l16 16M20 4 4 20')),
  share: I(<>{c(6, 12, 2.8)}{c(17, 6, 2.8)}{c(17, 18, 2.8)}{p('M8.4 10.7 14.6 7.3M8.4 13.3l6.2 3.4')}</>),
  code: I(<>{p('M9 8l-5 4 5 4')}{p('M15 8l5 4-5 4')}{ln(13, 6, 11, 18)}</>),
  user: I(<>{c(12, 8.5, 3.6)}{p('M5.5 19.5a6.6 6.6 0 0 1 13 0')}</>),
  calendar: I(<>{rect(4, 5, 16, 16, 3)}{ln(4, 9.5, 20, 9.5)}{ln(8, 3, 8, 6.5)}{ln(16, 3, 16, 6.5)}</>),
  wallet: I(<>{rect(3, 6, 18, 13, 3)}{p('M16 12.5h2.5')}{c(16.5, 13, .2)}{p('M3 7.5 15 4.2a1 1 0 0 1 1.3 1V6', { opacity: .6 })}</>),
  ledger: I(<>{rect(5, 4, 14, 16, 3)}{c(12, 14, 2.4)}{ln(12, 4, 12, 8)}</>),
  bolt: I(p('M13 3 5 13h6l-1 8 8-10h-6l1-8Z')),
  eye: I(<>{p('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z')}{c(12, 12, 2.8)}</>),
  chart: I(<>{p('M4 4v16h16')}{p('M8 14l3-3 2.5 2.5L19 8')}</>),
  download: I(<>{p('M12 4v11')}{p('M8 11l4 4 4-4')}{p('M5 19h14')}</>),
  refresh: I(<>{p('M20 11a8 8 0 0 0-14-4.5L4 8')}{p('M4 4v4h4')}{p('M4 13a8 8 0 0 0 14 4.5L20 16')}{p('M20 20v-4h-4')}</>),
  badge: I(<>{p('M12 3l2.3 1.5 2.7-.3 1 2.5 2.3 1.5-.8 2.6.8 2.6-2.3 1.5-1 2.5-2.7-.3L12 21l-2.3-1.5-2.7.3-1-2.5L3.7 16l.8-2.6L3.7 11 6 9.5l1-2.5 2.7.3L12 3Z')}{p('M9.3 12l2 2 3.4-3.5')}</>),
  menu: I(<>{ln(4, 7, 20, 7)}{ln(4, 12, 20, 12)}{ln(4, 17, 20, 17)}</>),
  logout: I(<>{p('M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3')}{p('M15 8l4 4-4 4')}{ln(19, 12, 9, 12)}</>),
  clock: I(<>{c(12, 12, 8.5)}{p('M12 7.5V12l3 2')}</>),
  coins: I(<>
    <ellipse cx={9} cy={7} rx={5} ry={2.5} />
    {p('M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7')}
    <ellipse cx={15} cy={14} rx={5} ry={2.5} opacity={.8} />
    {p('M10 15v3c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4', { opacity: .8 })}
  </>),
  watermark: I(<>{rect(4, 4, 16, 16, 3)}{p('M8 15c1.5-2 2.5-2 4 0s2.5 2 4 0', { opacity: .9 })}{ln(8, 10, 16, 10)}</>),
  link: I(<>{p('M9.5 14.5 14.5 9.5')}{p('M8 12 6 14a3.5 3.5 0 0 0 5 5l2-2')}{p('M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2')}</>),
};

export type IconName = keyof typeof Icons;

export function Icon({ name, size, color, className, strokeWidth, style }: SvgProps & { name: IconName }) {
  const C = Icons[name];
  if (!C) return null;
  return <C size={size} color={color} className={className} strokeWidth={strokeWidth} style={style} />;
}

export function XLogo({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color || 'currentColor'}>
      <path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L8.8 21H5.6l7.5-8.6L5.2 3h6.6l4.5 5.6L17.5 3Zm-1.1 16.1h1.8L7.7 4.8H5.8l10.6 14.3Z" />
    </svg>
  );
}

export function Seal({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/assets/veris-mark.png" alt="Veris" width={size} height={size}
      style={{ display: 'block', objectFit: 'contain' }} />
  );
}

export function Logo({ size = 'md', onClick }: { size?: 'md' | 'lg'; onClick?: () => void }) {
  const lg = size === 'lg';
  return (
    <div className={'logo' + (lg ? ' lg' : '')} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mark" src="/assets/veris-mark.png" alt="" width={lg ? 46 : 34} height={lg ? 46 : 34} />
      <span className="word">Veris</span>
    </div>
  );
}
