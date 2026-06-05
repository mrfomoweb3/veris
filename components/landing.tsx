'use client';
import React from 'react';
import { Logo, Icon, Seal } from './icons';
import { Button, StatusPill, Thumb } from './ui';
import { truncate, fmtDate } from '@/lib/data';
import type { Route } from './shell';

// ---------- Landing nav ----------
function LandingNav({ nav, onConnect }: { nav: (to: Route) => void; onConnect: (to?: Route) => void }) {
  return (
    <div className="neo" style={{ maxWidth: 1180, margin: '22px auto 0', padding: '14px 22px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 16, zIndex: 40 }}>
      <Logo onClick={() => nav('landing')} />
      <div className="spacer" />
      <nav className="row g3 hide-mobile" style={{ marginRight: 8 }}>
        <button className="nav-item" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => nav('docs')}>Docs</button>
      </nav>
      <Button variant="primary" icon="wallet" onClick={() => onConnect()}>Connect Wallet</Button>
    </div>
  );
}

// ---------- Sample attestation preview card ----------
function PreviewCard() {
  return (
    <div className="neo-card" style={{ padding: 22, width: 320, maxWidth: '100%' }}>
      <div className="row g2" style={{ marginBottom: 16 }}>
        <Thumb src="/assets/RW6191.jpg" size={72} kind="image" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 15 }}>Harbor at dawn.raw</div>
          <div className="small">RAW · 8.4 MB</div>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}><StatusPill status="authentic" /></div>
      <div className="lv">
        <span className="k">Registered by</span>
        <span className="v mono-id">{truncate('0x9a3f7c2e8b14d6a90f5e3c7b21d4a8f0', 6, 4)}</span>
      </div>
      <div className="lv">
        <span className="k">Date</span>
        <span className="v">{fmtDate('2026-06-03')}</span>
      </div>
      <div className="lv">
        <span className="k">Network</span>
        <span className="v row g1"><span className="mainnet-dot" /> Sui Mainnet</span>
      </div>
    </div>
  );
}

function FeatureTile({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="neo-card hoverable" style={{ padding: 28, flex: 1, minWidth: 220 }}>
      <span className="st-ico" style={{ marginBottom: 16 }}><Icon name={icon as never} size={24} /></span>
      <div className="h3" style={{ marginBottom: 8 }}>{title}</div>
      <div className="body">{desc}</div>
    </div>
  );
}

export function Landing({ nav, onConnect }: { nav: (to: Route) => void; onConnect: (to?: Route) => void }) {
  return (
    <div className="screen" style={{ minHeight: '100vh', paddingBottom: 60 }}>
      <LandingNav nav={nav} onConnect={onConnect} />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 22px' }}>
        {/* Hero */}
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 56, alignItems: 'center', padding: 'clamp(48px,9vw,110px) 0 80px' }}>
          <div className="fade-up">
            <div className="pill pill-neutral" style={{ marginBottom: 24 }}>
              <Seal size={16} />
              <span>Decentralized provenance</span>
            </div>
            <h1 className="display" style={{ marginBottom: 20, maxWidth: 640 }}>Prove what&apos;s real permanently.</h1>
            <p className="body" style={{ fontSize: 19, maxWidth: 520, marginBottom: 36 }}>Decentralized provenance for the AI era. Store originals on Walrus, anchor them on Sui.</p>
            <div className="row g2 wrap">
              <Button variant="primary" size="lg" icon="register" onClick={() => onConnect('register')}>Register a file</Button>
              <Button variant="secondary" size="lg" icon="shieldCheck" onClick={() => onConnect('verify')}>Verify a file</Button>
            </div>
          </div>
          <div className="rise-in" style={{ display: 'flex', justifyContent: 'center', animationDelay: '.15s' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '-30px -20px', background: 'radial-gradient(circle at 60% 40%, rgba(79,134,247,.14), transparent 70%)', filter: 'blur(8px)' }} />
              <div style={{ position: 'relative', transform: 'rotate(-2deg)' }}>
                <PreviewCard />
              </div>
            </div>
          </div>
        </div>
        {/* Features */}
        <div className="feat-row stagger" style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 56 }}>
          <FeatureTile icon="database" title="Store on Walrus" desc="Your original file is preserved on decentralized Walrus storage — redundant, censorship-resistant, and verifiable." />
          <FeatureTile icon="shieldCheck" title="Anchor on Sui" desc="A Sui attestation object pins the hash, fingerprint, author wallet, and timestamp to mainnet — immutable forever." />
          <FeatureTile icon="git" title="Trace every edit" desc="Register any edited version as a certified child to build an immutable, walkable edit-history tree." />
        </div>
        {/* Powered-by row */}
        <div className="row center g2 wrap" style={{ paddingBottom: 20 }}>
          <span className="small" style={{ marginRight: 4 }}>Powered by</span>
          {['Walrus', 'Sui', 'Tatum'].map(b => <span key={b} className="chip">{b}</span>)}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--surface-alt)', boxShadow: 'inset 0 2px 0 rgba(175,194,222,.35)', marginTop: 20, paddingTop: 56, paddingBottom: 36 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 22px' }}>
          {/* Brand */}
          <div style={{ maxWidth: 420, marginBottom: 40 }}>
            <Logo onClick={() => nav('landing')} />
            <p className="body" style={{ marginTop: 14, marginBottom: 18, lineHeight: 1.65 }}>
              Prove what&apos;s real — permanently. Decentralized provenance infrastructure for the AI era.
            </p>
            <div className="row g1">
              <span className="mainnet-dot" />
              <span className="small">Live on Sui Mainnet</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(126,147,184,.18)', marginBottom: 28 }} />

          {/* Bottom bar */}
          <div className="row between wrap g2">
            <span className="small">© 2026 Veris Protocol. All rights reserved.</span>
            <div className="row g2">
              {/* X / Twitter */}
              <a href="#" onClick={e => e.preventDefault()} className="icon-btn sm" title="Follow on X" style={{ border: 'none' }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L8.8 21H5.6l7.5-8.6L5.2 3h6.6l4.5 5.6L17.5 3Zm-1.1 16.1h1.8L7.7 4.8H5.8l10.6 14.3Z" /></svg>
              </a>
              <a href="#" onClick={e => e.preventDefault()} className="icon-btn sm" title="GitHub" style={{ border: 'none' }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.09.68-.22.68-.49v-1.71c-2.78.62-3.37-1.37-3.37-1.37-.45-1.17-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

