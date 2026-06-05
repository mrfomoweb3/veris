'use client';
import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { Button, StatTile, StatusPill, Thumb, SectionTitle } from './ui';
import { timeAgo, truncate, type Attestation } from '@/lib/data';
import { getExplorerPage, dtoToAttestation } from '@/lib/api';
import type { Route } from './shell';

function ActionCard({ icon, title, desc, btnLabel, variant, onClick }: {
  icon: string; title: string; desc: string;
  btnLabel: string; variant: 'primary' | 'secondary'; onClick: () => void;
}) {
  return (
    <div className="neo-card hoverable" style={{ padding: 30, flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={onClick}>
      <span className="st-ico" style={{ width: 54, height: 54, borderRadius: 16 }}><Icon name={icon as never} size={26} /></span>
      <div>
        <div className="h3" style={{ marginBottom: 6 }}>{title}</div>
        <div className="body">{desc}</div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <Button variant={variant} icon={icon as never} onClick={e => { e.stopPropagation(); onClick(); }}>{btnLabel}</Button>
      </div>
    </div>
  );
}

function ActivityRow({ a, nav }: { a: Attestation; nav: (to: Route, params?: Record<string, string>) => void }) {
  return (
    <div className="neo-card hoverable" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => nav('detail', { id: a.id })}>
      <Thumb src={a.thumb} kind={a.kind} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <div className="small row g1" style={{ marginTop: 2 }}>
          <span className="mono-id">{truncate(a.by.addr, 6, 4)}</span>
          <span>·</span>
          <span>{timeAgo(a.date)}</span>
        </div>
      </div>
      <div className="hide-mobile"><StatusPill status={a.status} /></div>
      <Icon name="chevR" size={18} color="var(--navy-300)" />
    </div>
  );
}

function EmptyActivity({ nav }: { nav: (to: Route) => void }) {
  return (
    <div className="neo-card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-alt)', boxShadow: 'var(--inset-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--navy-300)' }}>
        <Icon name="layers" size={28} />
      </div>
      <div className="h3" style={{ marginBottom: 8 }}>No attestations yet</div>
      <p className="body" style={{ marginBottom: 20 }}>Register your first file to anchor its provenance on Sui.</p>
      <Button variant="primary" icon="register" onClick={() => nav('register')}>Register a file</Button>
    </div>
  );
}

export function Dashboard({ nav }: { nav: (to: Route, params?: Record<string, string>) => void }) {
  const [recent, setRecent] = useState<Attestation[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch more than we display so total count is meaningful
    getExplorerPage({ limit: 50 })
      .then(page => {
        setRecent(page.items.slice(0, 5).map(dtoToAttestation));
        setTotal(page.items.length);
      })
      .catch(() => {
        // Backend not reachable — leave empty, don't show fake rows
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrap screen">
      <div className="h2 show-mobile" style={{ marginBottom: 18 }}>Home</div>

      {/* Stat tiles */}
      <div className="stat-grid stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <StatTile icon="layers" value={loading ? '—' : total} label="Files registered" />
        <StatTile icon="database" value={loading ? '—' : total} label="Blobs stored on Walrus" />
        <StatTile icon="shieldCheck" value={loading ? '—' : total > 0 ? 'Live' : '—'} label="Sui Mainnet" />
      </div>

      {/* Action cards */}
      <div className="action-row" style={{ display: 'flex', gap: 20, marginBottom: 34, flexWrap: 'wrap' }}>
        <ActionCard icon="register" title="Register a file" desc="Store an original on Walrus and anchor a tamper-evident attestation on Sui." btnLabel="Register a file" variant="primary" onClick={() => nav('register')} />
        <ActionCard icon="shieldCheck" title="Verify authenticity" desc="Check any file against the registry to confirm it's real — or a derivative." btnLabel="Verify authenticity" variant="secondary" onClick={() => nav('verify')} />
      </div>

      {/* Recent activity */}
      <SectionTitle right={
        recent.length > 0
          ? <Button variant="ghost" iconRight="arrowR" size="sm" onClick={() => nav('explorer')}>View all</Button>
          : undefined
      }>
        Recent activity
      </SectionTitle>

      {loading ? (
        <div className="col g2">
          {[1, 2, 3].map(i => (
            <div key={i} className="neo-card" style={{ padding: 16, height: 84, opacity: 0.5, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : recent.length > 0 ? (
        <div className="col g2">
          {recent.map(a => <ActivityRow key={a.id} a={a} nav={nav} />)}
        </div>
      ) : (
        <EmptyActivity nav={nav} />
      )}
    </div>
  );
}
