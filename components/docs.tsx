'use client';
import React, { useState, useEffect } from 'react';
import { Logo, Icon } from './icons';
import type { Route } from './shell';

// ── Mini primitives ────────────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const bg: Record<string, string> = {
    tatum:   '#1E3A6B', walrus: '#3FA877', sui: '#4F86F7',
    claude:  '#7c3aed', mainnet: '#0E1E3A',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: bg[color] ?? '#46618F', color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '.04em' }}>
      {children}
    </span>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} style={{ marginBottom: 72 }}>{children}</section>;
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy-900)', margin: 0, letterSpacing: '-.02em' }}>{children}</h2>
      {sub && <p style={{ marginTop: 8, fontSize: 16, color: 'var(--navy-500)', maxWidth: 600 }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="neo-card" style={{ padding: 28, ...style }}>{children}</div>
  );
}

// ── Flow diagram ───────────────────────────────────────────────────────────────

function FlowStep({ n, icon, title, sub, color = 'var(--accent)' }: { n: number; icon: string; title: string; sub: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1, minWidth: 120 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--base)', boxShadow: 'var(--raise)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Icon name={icon as never} size={22} color={color} />
        <span style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--navy-300)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', paddingTop: 14, color: 'var(--navy-300)', flexShrink: 0 }}>
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6"/>
      </svg>
    </div>
  );
}

// ── Architecture diagram ────────────────────────────────────────────────────────

function ArchBox({ label, sub, color, icon }: { label: string; sub?: string; color: string; icon?: string }) {
  const colors: Record<string, [string, string]> = {
    blue:   ['#EEF3FD', '#4F86F7'],
    green:  ['#DCEFE6', '#3FA877'],
    navy:   ['#D8E1F0', '#1E3A6B'],
    purple: ['#EDE8F8', '#7c3aed'],
    orange: ['#FEF3E2', '#E2A33C'],
  };
  const [bg, fg] = colors[color] ?? colors.blue;
  return (
    <div style={{ background: bg, border: `1.5px solid ${fg}30`, borderRadius: 14, padding: '14px 18px', textAlign: 'center', minWidth: 130 }}>
      {icon && <Icon name={icon as never} size={18} color={fg} style={{ marginBottom: 6 }} />}
      <div style={{ fontWeight: 600, fontSize: 13.5, color: fg }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: `${fg}99`, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Code block ─────────────────────────────────────────────────────────────────

function Code({ children, lang = '' }: { children: string; lang?: string }) {
  return (
    <div style={{ background: '#0E1E3A', borderRadius: 14, padding: '20px 24px', overflow: 'auto', marginTop: 12, marginBottom: 12 }}>
      <pre style={{ margin: 0, color: '#E3ECF8', fontFamily: '"IBM Plex Mono", "Fira Code", monospace', fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre' }}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

// ── TOC ────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'register',     label: 'Register a File' },
  { id: 'verify',       label: 'Verify a File' },
  { id: 'lineage',      label: 'Provenance Lineage' },
  { id: 'tatum',        label: 'Tatum Integration' },
  { id: 'walrus',       label: 'Walrus Storage' },
  { id: 'contract',     label: 'Smart Contract' },
  { id: 'faq',          label: 'FAQ' },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function Docs({ nav, onConnect }: { nav: (to: Route) => void; onConnect: (to?: Route) => void }) {
  const [active, setActive] = useState('overview');

  useEffect(() => {
    const handler = () => {
      for (const { id } of [...SECTIONS].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) { setActive(id); break; }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <div className="neo" style={{ position: 'sticky', top: 0, zIndex: 40, maxWidth: '100%', margin: 0, borderRadius: 0, padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Logo onClick={() => nav('landing')} />
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => nav('landing')}>← Back</button>
        <button className="btn btn-primary btn-sm" onClick={() => onConnect('register')}>Get started</button>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start' }}>

        {/* ── Sticky TOC ──────────────────────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 80 }}>
          <div style={{ fontWeight: 600, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--navy-300)', marginBottom: 12 }}>On this page</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`}
                onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); setActive(s.id); }}
                style={{ padding: '7px 12px', borderRadius: 10, fontSize: 14, fontWeight: active === s.id ? 600 : 400, color: active === s.id ? 'var(--accent)' : 'var(--navy-500)', background: active === s.id ? 'var(--neutral-tint)' : 'transparent', textDecoration: 'none', transition: 'all .2s', boxShadow: active === s.id ? 'var(--inset-sm)' : 'none', cursor: 'pointer' }}>
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <main>

          {/* ── Overview ───────────────────────────────────────────────── */}
          <Section id="overview">
            <div style={{ marginBottom: 40 }}>
              <div className="row g2 wrap" style={{ marginBottom: 20, gap: 8 }}>
                <Badge color="tatum">Tatum RPC</Badge>
                <Badge color="walrus">Walrus Storage</Badge>
                <Badge color="sui">Sui Mainnet</Badge>
                <Badge color="claude">Claude AI</Badge>
              </div>
              <h1 style={{ fontSize: 42, fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 16px', letterSpacing: '-.03em', lineHeight: 1.05 }}>
                Prove what&apos;s real permanently.
              </h1>
              <p style={{ fontSize: 18, color: 'var(--navy-500)', lineHeight: 1.7, maxWidth: 640, margin: 0 }}>
                Veris is a decentralized provenance platform for the AI era. Every file you register gets a tamper-proof birth certificate — stored on Walrus, anchored on Sui, and signed by your own wallet.
              </p>
            </div>

            {/* Problem / Solution cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
              <Card style={{ borderLeft: '3px solid var(--danger)' }}>
                <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 10, fontSize: 15 }}>⚠ The problem</div>
                <p style={{ margin: 0, color: 'var(--navy-500)', lineHeight: 1.65, fontSize: 15 }}>
                  AI can generate photorealistic images, deepfakes, and documents in seconds. There&apos;s no reliable way to tell what&apos;s real from what&apos;s synthetic — and no permanent record of when originals were created.
                </p>
              </Card>
              <Card style={{ borderLeft: '3px solid var(--success)' }}>
                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 10, fontSize: 15 }}>✓ The solution</div>
                <p style={{ margin: 0, color: 'var(--navy-500)', lineHeight: 1.65, fontSize: 15 }}>
                  Register your original before sharing it. Veris stores the file on Walrus and creates an immutable on-chain record with your fingerprint, timestamp, and wallet address — provable forever on Sui.
                </p>
              </Card>
            </div>

            {/* Key stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { icon: 'shieldCheck', label: 'On Sui Mainnet', sub: 'Permanent, immutable attestations' },
                { icon: 'database',    label: 'Walrus Storage', sub: 'Decentralised blob storage' },
                { icon: 'sparkle',     label: 'AI Credential', sub: 'Claude analyses every file' },
              ].map(({ icon, label, sub }) => (
                <Card key={label} style={{ padding: 20, textAlign: 'center' }}>
                  <Icon name={icon as never} size={24} color="var(--accent)" style={{ marginBottom: 10 }} />
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14.5 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--navy-300)', marginTop: 4 }}>{sub}</div>
                </Card>
              ))}
            </div>
          </Section>

          {/* ── How it works ────────────────────────────────────────────── */}
          <Section id="how-it-works">
            <SectionTitle sub="Two core flows: registering an original and verifying any file against the registry.">
              How It Works
            </SectionTitle>

            {/* Register flow */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, color: 'var(--navy-900)', marginBottom: 20, fontSize: 16 }}>Registration flow</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <FlowStep n={1} icon="upload"      title="Upload"      sub="Drop any file"           color="var(--accent)" />
                <Arrow />
                <FlowStep n={2} icon="database"    title="Walrus"      sub="File stored as blob"     color="#3FA877" />
                <Arrow />
                <FlowStep n={3} icon="sparkle"     title="AI Cred"     sub="Claude analyses file"    color="#7c3aed" />
                <Arrow />
                <FlowStep n={4} icon="shieldCheck" title="Build tx"    sub="Unsigned PTB created"    color="var(--accent)" />
                <Arrow />
                <FlowStep n={5} icon="wallet"      title="Sign"        sub="Your wallet approves"    color="#1E3A6B" />
                <Arrow />
                <FlowStep n={6} icon="check"       title="On-chain"    sub="Anchored on Sui mainnet" color="#3FA877" />
              </div>
            </Card>

            {/* Verify flow */}
            <Card>
              <div style={{ fontWeight: 700, color: 'var(--navy-900)', marginBottom: 20, fontSize: 16 }}>Verification flow</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <FlowStep n={1} icon="upload"     title="Upload"      sub="Drop file to check"       color="var(--accent)" />
                <Arrow />
                <FlowStep n={2} icon="search"     title="Fingerprint" sub="SHA-256 + pHash computed"  color="#E2A33C" />
                <Arrow />
                <FlowStep n={3} icon="globe"      title="Registry"    sub="Query Sui events via Tatum" color="#1E3A6B" />
                <Arrow />
                <FlowStep n={4} icon="git"        title="Compare"     sub="Exact or similar match?"   color="var(--accent)" />
                <Arrow />
                <FlowStep n={5} icon="eye"        title="Result"      sub="Authentic / Modified / Unknown" color="#3FA877" />
              </div>

              {/* Result types */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 24 }}>
                <div style={{ background: 'var(--success-tint)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>● Authentic</div>
                  <div style={{ fontSize: 13, color: 'var(--navy-500)' }}>SHA-256 exact match found in registry.</div>
                </div>
                <div style={{ background: 'var(--warning-tint)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 600, color: '#b9802a', marginBottom: 4 }}>● Modified</div>
                  <div style={{ fontSize: 13, color: 'var(--navy-500)' }}>pHash similarity ≥ 55% — derivative found with AI diff summary.</div>
                </div>
                <div style={{ background: 'var(--neutral-tint)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-700)', marginBottom: 4 }}>● Unknown</div>
                  <div style={{ fontSize: 13, color: 'var(--navy-500)' }}>No matching record in the registry.</div>
                </div>
              </div>
            </Card>
          </Section>

          {/* ── Architecture ────────────────────────────────────────────── */}
          <Section id="architecture">
            <SectionTitle sub="How the three layers connect — browser, backend, and blockchain.">
              Architecture
            </SectionTitle>

            <Card>
              {/* Three columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 16, alignItems: 'start' }}>

                {/* Frontend */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--navy-300)', marginBottom: 12 }}>Frontend</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ArchBox label="Next.js 15" sub="React 19 SPA" color="blue" icon="globe" />
                    <ArchBox label="Suiet Wallet Kit" sub="Wallet connection" color="navy" icon="wallet" />
                    <ArchBox label="Vercel" sub="vercel.com" color="blue" />
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 30 }}>
                  <div style={{ width: 40, height: 2, background: 'rgba(126,147,184,.4)' }} />
                  <Icon name="arrowR" size={18} color="var(--navy-300)" />
                  <div style={{ fontSize: 10, color: 'var(--navy-300)', textAlign: 'center' }}>REST API</div>
                </div>

                {/* Backend */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--navy-300)', marginBottom: 12 }}>Backend</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ArchBox label="Hono / Node 20" sub="REST API" color="orange" icon="code" />
                    <ArchBox label="fingerprint.ts" sub="SHA-256 + pHash" color="blue" />
                    <ArchBox label="agent.ts" sub="Claude + Tatum" color="purple" icon="sparkle" />
                    <ArchBox label="Railway" sub="railway.app" color="orange" />
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 30 }}>
                  <div style={{ width: 40, height: 2, background: 'rgba(126,147,184,.4)' }} />
                  <Icon name="arrowR" size={18} color="var(--navy-300)" />
                  <div style={{ fontSize: 10, color: 'var(--navy-300)', textAlign: 'center' }}>SDK/HTTP</div>
                </div>

                {/* External services */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--navy-300)', marginBottom: 12 }}>Services</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ArchBox label="Tatum RPC" sub="sui-mainnet.gateway" color="navy" icon="globe" />
                    <ArchBox label="Walrus" sub="Blob storage" color="green" icon="database" />
                    <ArchBox label="Sui Mainnet" sub="Smart contract" color="blue" icon="shieldCheck" />
                    <ArchBox label="Claude AI" sub="api.anthropic.com" color="purple" icon="sparkle" />
                  </div>
                </div>
              </div>

              {/* Data flow note */}
              <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--surface-alt)', borderRadius: 12, fontSize: 13.5, color: 'var(--navy-500)', boxShadow: 'var(--inset-sm)' }}>
                <strong style={{ color: 'var(--navy-700)' }}>Key design decision:</strong> The backend never holds the user&apos;s private key. It builds an unsigned Sui transaction and returns it as base64 bytes — the user&apos;s own Suiet wallet signs and submits. Their address becomes the on-chain <code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>creator</code>.
              </div>
            </Card>
          </Section>

          {/* ── Register ────────────────────────────────────────────────── */}
          <Section id="register">
            <SectionTitle sub="Upload any file and anchor its provenance on Sui mainnet.">
              Register a File
            </SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {[
                { step: '01', title: 'Connect your wallet', desc: 'Click "Connect Wallet" on the landing page. Choose Sui Wallet, Suiet, or any supported wallet. Your wallet address becomes the creator.' },
                { step: '02', title: 'Upload your file', desc: 'Drag and drop any image, video, PDF, or dataset. SHA-256 is computed in the browser — your file never leaves until you confirm.' },
                { step: '03', title: 'Review AI credential', desc: 'Claude analyzes the file (vision for images). Tatum screens your wallet for AML. A content credential is generated and stored on Walrus.' },
                { step: '04', title: 'Sign & confirm', desc: 'Your wallet shows a Sui transaction to approve. Sign it — Veris anchors the blob ID, hash, fingerprint, and your address on-chain. Forever.' },
              ].map(({ step, title, desc }) => (
                <Card key={step} style={{ padding: 22 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--surface-alt)', lineHeight: 1, marginBottom: 10, letterSpacing: '-.04em' }}>{step}</div>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6, fontSize: 15 }}>{title}</div>
                  <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>{desc}</div>
                </Card>
              ))}
            </div>

            <Card>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>What gets stored on-chain</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['creator', 'Your wallet address'],
                  ['blob_id', 'Walrus ID of the original file'],
                  ['credential_blob_id', 'Walrus ID of the AI credential JSON'],
                  ['sha256', 'Hex fingerprint for exact matching'],
                  ['phash', '64-bit perceptual hash for similarity'],
                  ['media_type', 'MIME type (image/jpeg, etc.)'],
                  ['parent', 'Optional: links to a parent original'],
                  ['created_at_ms', 'Timestamp from Sui Clock'],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 10, boxShadow: 'var(--inset-sm)' }}>
                    <code style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace' }}>{k}</code>
                    <div style={{ fontSize: 13, color: 'var(--navy-500)', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          {/* ── Verify ──────────────────────────────────────────────────── */}
          <Section id="verify">
            <SectionTitle sub="Check any file against the Veris registry — exact match or modified copy.">
              Verify a File
            </SectionTitle>
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 16, fontSize: 15 }}>Two inputs supported</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: 18, background: 'var(--surface-alt)', borderRadius: 14, boxShadow: 'var(--inset-sm)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>Upload a file</div>
                  <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>Drop the file you want to check. Veris recomputes its SHA-256 + pHash server-side and searches the registry.</div>
                </div>
                <div style={{ padding: 18, background: 'var(--surface-alt)', borderRadius: 14, boxShadow: 'var(--inset-sm)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>Paste an ID</div>
                  <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>Paste a Walrus blob ID or Sui object ID directly. Veris fetches and verifies the record from chain.</div>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>Fingerprinting explained</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 80, flexShrink: 0, fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>SHA-256</div>
                  <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>A cryptographic hash of the exact file bytes. Any change — even one pixel — produces a completely different hash. Used for exact matching.</div>
                </div>
                <div style={{ height: 1, background: 'rgba(126,147,184,.15)' }} />
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 80, flexShrink: 0, fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>pHash</div>
                  <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>A 64-bit perceptual hash. A resized, re-saved, or colour-graded copy of the same image will still have a high similarity score (&gt;55%). Used for finding modified derivatives.</div>
                </div>
              </div>
            </Card>
          </Section>

          {/* ── Lineage ─────────────────────────────────────────────────── */}
          <Section id="lineage">
            <SectionTitle sub="Every edit registered as a derivative creates a permanent, walkable edit-history tree.">
              Provenance Lineage
            </SectionTitle>
            <Card>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 20, fontSize: 15 }}>How derivatives work</div>

              {/* Tree diagram */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{ padding: '12px 24px', background: 'var(--success-tint)', border: '2px solid var(--success)', borderRadius: 12, fontWeight: 600, color: 'var(--success)', fontSize: 14 }}>
                  🖼 Harbor at dawn.raw — Original
                </div>
                <div style={{ width: 2, height: 28, background: 'var(--navy-300)' }} />
                <div style={{ display: 'flex', gap: 48, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: 'var(--navy-300)' }} />
                  {['Web crop (JPEG)', 'Social square (1:1)', 'Print master (CMYK)'].map(d => (
                    <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 2, height: 28, background: 'var(--navy-300)' }} />
                      <div style={{ padding: '10px 16px', background: 'var(--warning-tint)', border: '1.5px solid var(--warning)', borderRadius: 10, fontWeight: 500, color: '#b9802a', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {d}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ margin: '24px 0 0', fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.65 }}>
                When registering a derivative, you select a parent attestation. The Move contract verifies the parent exists on-chain before writing the child record. Every node in the tree has a <code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>parent: Option&lt;ID&gt;</code> field linking back.
              </p>
            </Card>
          </Section>

          {/* ── Tatum ───────────────────────────────────────────────────── */}
          <Section id="tatum">
            <SectionTitle sub="All Sui RPC is routed through Tatum — no direct fullnode calls, anywhere.">
              Tatum Integration
            </SectionTitle>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 16, fontSize: 15 }}>Tatum-routed SuiClient with retry</div>
              <Code lang="ts">{`// server/src/tatum.ts
async function fetchWithRetry(input: string | URL, init?: RequestInit, tries = 5) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(input as string, init);
    if (res.status !== 429 || attempt >= tries) return res;
    const wait = Math.min(8000, 250 * 2 ** attempt) + Math.random() * 250;
    await new Promise(r => setTimeout(r, wait));
  }
}

const transport = new SuiHTTPTransport({
  url: process.env.TATUM_SUI_RPC, // https://sui-mainnet.gateway.tatum.io
  fetch: (input, init) => {
    const headers = new Headers(init?.headers ?? {});
    headers.set('x-api-key', process.env.TATUM_API_KEY);
    return fetchWithRetry(input, { ...init, headers });
  },
});
export const sui = new SuiClient({ transport });`}
              </Code>
              <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>
                The retry wrapper covers every Tatum call transparently — including the multiple reads inside <code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>tx.build()</code> — so a transient 429 never fails a registration.
              </p>
            </Card>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>Offline tx.build() — minimal RPC calls</div>
              <Code lang="ts">{`// server/src/sui.ts
// Gas price cached 60s — eliminates getReferenceGasPrice call
const gasPrice = await getCachedGasPrice();
tx.setGasPrice(gasPrice);
tx.setGasBudget(10_000_000n); // explicit budget → no dry-run estimate

// Clock as pre-resolved SharedObjectRef → no getObject('0x6') call
const CLOCK_REF = Inputs.SharedObjectRef({
  objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
  initialSharedVersion: 1,
  mutable: false,
});
// Result: tx.build() makes ~0 Tatum RPC calls per registration`}
              </Code>
            </Card>

            <Card>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>Tatum Data API — AML address screening</div>
              <Code lang="ts">{`// Called for every creator wallet before building the credential
const screen = await checkMaliciousAddress(creator);
// { malicious: false, source: 'tatum-data-api' }

// Result is stored inside the AI credential on Walrus:
// credential.addressScreen = { malicious, source }`}
              </Code>
            </Card>
          </Section>

          {/* ── Walrus ──────────────────────────────────────────────────── */}
          <Section id="walrus">
            <SectionTitle sub="Every registration creates two Walrus blobs — the original file and the AI credential.">
              Walrus Storage
            </SectionTitle>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 16, fontSize: 15 }}>Two blobs per registration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'blob_id', desc: 'The original file bytes — image, video, PDF, or dataset. Readable by anyone (unless encrypted).', color: 'var(--accent)' },
                  { label: 'credential_blob_id', desc: 'A JSON object containing the AI content credential: Claude\'s description, detected tags, AI-origin classification, and the Tatum AML screen result.', color: '#3FA877' },
                ].map(({ label, desc, color }, i) => (
                  <div key={label} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: i === 0 ? '1px solid rgba(126,147,184,.15)' : 'none', alignItems: 'flex-start' }}>
                    <code style={{ fontSize: 12.5, color, fontFamily: 'monospace', background: `${color}15`, padding: '3px 10px', borderRadius: 6, flexShrink: 0, marginTop: 2 }}>{label}</code>
                    <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.65 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>Read + write pattern</div>
              <Code lang="ts">{`// Write (PUT) — server/src/walrus.ts
const blobId = await storeBlob(fileBytes, 'image/jpeg');
// Tries publishers in order until one succeeds:
// 1. wal-publisher-testnet.staketab.org  ← confirmed reachable from Railway
// 2. publisher.walrus-testnet.walrus.space (fallback)

// Read (GET) — used by the blob proxy and verify diff
const bytes = await readBlob(blobId);
// GET /v1/blobs/:blobId from the aggregator pool

// Browser proxy — served from the backend
// GET /api/blob/:blobId → streams Walrus bytes to the browser`}
              </Code>
            </Card>
          </Section>

          {/* ── Contract ────────────────────────────────────────────────── */}
          <Section id="contract">
            <SectionTitle sub="An immutable Move contract on Sui mainnet. Every Attestation is frozen after creation.">
              Smart Contract
            </SectionTitle>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 15 }}>Deployed on Sui Mainnet</div>
                <a href="https://suiscan.xyz/mainnet/object/0xfde47b037e3ac625bfa075424af9317227ceb4cc3b798ee2b5c31399a61779e6"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                  View on SuiScan <Icon name="external" size={13} />
                </a>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 10, boxShadow: 'var(--inset-sm)', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--navy-700)', wordBreak: 'break-all' }}>
                0xfde47b037e3ac625bfa075424af9317227ceb4cc3b798ee2b5c31399a61779e6
              </div>
            </Card>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>Attestation struct</div>
              <Code lang="move">{`public struct Attestation has key, store {
    id: UID,
    creator: address,           // user's wallet — they sign it
    blob_id: String,            // Walrus blob: original file
    credential_blob_id: String, // Walrus blob: AI credential JSON
    sha256: String,             // hex fingerprint — exact matching
    phash: String,              // 64-bit perceptual hash — similarity
    media_type: String,         // MIME type
    parent: Option<ID>,         // derivative lineage
    encrypted: bool,
    created_at_ms: u64,         // from Sui Clock
}`}
              </Code>
              <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6 }}>
                After <code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>public_freeze_object</code> is called, the attestation is permanently immutable on-chain. No one — including the creator — can modify or delete it.
              </p>
            </Card>

            <Card>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12, fontSize: 15 }}>Entry functions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { fn: 'register()', desc: 'Registers a new original. Emits an AttestationCreated event for indexing.' },
                  { fn: 'register_derivative(parent, ...)', desc: 'Links a certified derivative to an existing parent. The Move runtime verifies the parent exists on-chain.' },
                ].map(({ fn, desc }) => (
                  <div key={fn} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <code style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'monospace', background: 'rgba(79,134,247,.08)', padding: '4px 10px', borderRadius: 6, flexShrink: 0 }}>{fn}</code>
                    <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.6, paddingTop: 4 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          {/* ── FAQ ─────────────────────────────────────────────────────── */}
          <Section id="faq">
            <SectionTitle sub="Common questions about Veris.">FAQ</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { q: 'Do I need WAL tokens to register a file?', a: 'Currently Veris uses Walrus testnet for storage, which is free. When migrating to Walrus mainnet, a small amount of WAL tokens will be needed to pay for storage epochs.' },
                { q: 'Who can see my registered file?', a: 'By default, attestations are public — anyone can verify a file against the registry. You can toggle "Encrypted" during registration to store the blob with Seal encryption, making it readable only by you.' },
                { q: 'Can I register the same file twice?', a: 'Yes, but the SHA-256 fingerprint will match and verify as "Authentic" pointing to the first registration. The second registration creates a new on-chain object but the fingerprint proof already exists.' },
                { q: 'Is the on-chain record really permanent?', a: 'Yes. Sui Attestation objects are created with public_freeze_object, making them immutable forever. Even Mysten Labs cannot modify or delete them.' },
                { q: 'What file types are supported?', a: 'Any file — images (JPEG, PNG, WebP, RAW), videos (MP4, MOV), documents (PDF, DOCX), and datasets (CSV, Parquet, JSON). For images, Veris also computes a perceptual hash for similarity detection.' },
                { q: 'All Sui calls really go through Tatum?', a: 'Yes. The SuiHTTPTransport is configured with Tatum\'s gateway URL and injects the x-api-key header on every request. There is no fallback to a direct fullnode anywhere in the codebase.' },
              ].map(({ q, a }) => (
                <Card key={q} style={{ padding: 22 }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: 8, fontSize: 15 }}>{q}</div>
                  <div style={{ fontSize: 14, color: 'var(--navy-500)', lineHeight: 1.65 }}>{a}</div>
                </Card>
              ))}
            </div>
          </Section>

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface-alt)', boxShadow: 'var(--inset-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--accent)' }}>
              <Icon name="shieldCheck" size={28} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy-900)', margin: '0 0 10px' }}>Ready to register your first file?</h3>
            <p style={{ fontSize: 16, color: 'var(--navy-500)', margin: '0 0 28px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              Connect your Sui wallet and anchor provenance on mainnet in under a minute.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => onConnect('register')}>
              <Icon name="register" size={18} />
              <span>Register a file</span>
            </button>
          </Card>

        </main>
      </div>
    </div>
  );
}
