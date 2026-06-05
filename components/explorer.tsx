'use client';
import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { Button, StatTile, StatusPill, Thumb, Chip, SectionTitle } from './ui';
import { truncate, fmtDate, type Attestation, type AttKind } from '@/lib/data';
import { getExplorerPage, dtoToAttestation } from '@/lib/api';
import type { Route } from './shell';

const TYPE_FILTERS = ['All', 'Images', 'Video', 'Docs', 'Datasets'];
const KIND_MAP: Record<string, AttKind> = { Images: 'image', Video: 'video', Docs: 'docs', Datasets: 'dataset' };

function AttCard({ a, nav }: { a: Attestation; nav: (to: Route, params?: Record<string, string>) => void }) {
  return (
    <div className="neo-card hoverable" style={{ padding: 16, cursor: 'pointer' }} onClick={() => nav('detail', { id: a.id })}>
      <div className="thumb-frame" style={{ width: '100%', aspectRatio: '4 / 3', marginBottom: 14 }}>
        {a.thumb ? <img src={a.thumb} alt="" /> : <Icon name="image" size={48} className="ph-icon" />}
      </div>
      <div className="row between g1" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <StatusPill status={a.status} withIcon={false} />
      </div>
      <div className="row between" style={{ marginTop: 6 }}>
        <span className="small mono-id">{truncate(a.by.addr, 5, 4)}</span>
        <span className="small">{fmtDate(a.date)}</span>
      </div>
      {a.derivatives > 0 && (
        <div className="row g1" style={{ marginTop: 10 }}>
          <Chip><Icon name="git" size={13} /> {a.derivatives} derivative{a.derivatives > 1 ? 's' : ''}</Chip>
        </div>
      )}
    </div>
  );
}

export function Explorer({ nav, mineOnly, search: externalSearch }: { nav: (to: Route, params?: Record<string, string>) => void; mineOnly?: boolean; search?: string }) {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [type, setType] = useState('All');
  const [withDeriv, setWithDeriv] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    getExplorerPage({ limit: 24 })
      .then(page => {
        setAttestations(page.items.map(dtoToAttestation));
        setNextCursor(page.nextCursor);
      })
      .catch(() => {}) // backend not reachable — stay empty
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getExplorerPage({ limit: 24, cursor: nextCursor });
      setAttestations(prev => [...prev, ...page.items.map(dtoToAttestation)]);
      setNextCursor(page.nextCursor);
    } catch { /* ignore */ }
    setLoadingMore(false);
  };

  const query = (externalSearch != null ? externalSearch : q).toLowerCase();
  let list = mineOnly
    ? attestations.filter(a => a.by.name === 'You' || a.by.addr === a.by.name)
    : attestations;
  if (type !== 'All') list = list.filter(a => a.kind === KIND_MAP[type]);
  if (withDeriv) list = list.filter(a => a.derivatives > 0);
  if (query) list = list.filter(a =>
    a.title.toLowerCase().includes(query) ||
    a.by.addr.toLowerCase().includes(query) ||
    a.by.name.toLowerCase().includes(query),
  );

  return (
    <div className="page-wrap screen">
      <SectionTitle>{mineOnly ? 'My attestations' : 'Registry'}</SectionTitle>
      {/* search */}
      <div className="search-well" style={{ marginBottom: 18 }}>
        <Icon name="search" size={18} />
        <input placeholder="Search by name, wallet, or ID" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {/* filters */}
      <div className="row between wrap g2" style={{ marginBottom: 22 }}>
        <div className="row wrap g1">
          {TYPE_FILTERS.map(t => <Chip key={t} clickable active={type === t} onClick={() => setType(t)}>{t}</Chip>)}
        </div>
        <Chip clickable active={withDeriv} icon="git" onClick={() => setWithDeriv(v => !v)}>Has derivatives</Chip>
      </div>
      {/* stats (registry only) */}
      {!mineOnly && (
        <div className="stat-grid stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 26 }}>
          <StatTile icon="layers" value={loading ? '—' : attestations.length} label="Total attestations" />
          <StatTile icon="database" value="—" label="Data stored on Walrus" />
          <StatTile icon="shieldCheck" value="—" label="Verifications today" />
        </div>
      )}
      {/* grid */}
      {loading ? (
        <div className="att-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 20 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="neo-card" style={{ padding: 16, aspectRatio: '4/5', opacity: 0.45, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : list.length ? (
        <div className="att-grid stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 20 }}>
          {list.map(a => <AttCard key={a.id} a={a} nav={nav} />)}
        </div>
      ) : (
        <div className="neo-card" style={{ padding: 50, textAlign: 'center' }}>
          <Icon name={q || type !== 'All' ? 'search' : 'layers'} size={34} color="var(--navy-300)" />
          <div className="h3" style={{ marginTop: 12 }}>
            {q || type !== 'All' ? 'No matches' : 'No attestations yet'}
          </div>
          <div className="body" style={{ marginBottom: q || type !== 'All' ? 0 : 20 }}>
            {q || type !== 'All' ? 'Try a different filter or search term.' : 'Register your first file to anchor its provenance on Sui.'}
          </div>
          {!q && type === 'All' && <Button variant="primary" icon="register" onClick={() => nav('register')} style={{ marginTop: 20 }}>Register a file</Button>}
        </div>
      )}
      {nextCursor && (
        <div className="row center" style={{ marginTop: 30 }}>
          <Button variant="secondary" icon="chevD" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
