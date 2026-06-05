'use client';
import React, { useState, useEffect } from 'react';
import { Icon, Seal } from './icons';
import { downloadShareCard } from '@/lib/sharecard';
import { Button, IconButton, StatusPill, Thumb, LV, CopyId, Chip } from './ui';
import { byId, truncate, fmtDateTime, fmtDate } from '@/lib/data';
import type { Attestation } from '@/lib/data';
import { getAttestation as apiGetAttestation, dtoToAttestation } from '@/lib/api';
import type { Route } from './shell';

// ---------- Verify Badge widget ----------
export function VerifyBadge({ att, tampered }: { att?: Attestation; tampered?: boolean }) {
  const a = att || byId('a1')!;
  return (
    <div style={{ width: 320, background: 'var(--base)', boxShadow: 'var(--raise)', borderRadius: 20, padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
      <Thumb src={a.thumb} kind={a.kind} size={56} radius={14} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row g1" style={{ marginBottom: 5 }}>
          <span className="dot" style={{ width: 9, height: 9, borderRadius: '50%', background: tampered ? 'var(--warning)' : 'var(--success)', boxShadow: `0 0 8px ${tampered ? 'rgba(226,163,60,.6)' : 'rgba(63,168,119,.6)'}` }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: tampered ? '#b9802a' : 'var(--success)' }}>{tampered ? 'Modified' : 'Verified on Sui'}</span>
        </div>
        <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <div className="mono-id" style={{ fontSize: 12 }}>{truncate(a.attId, 6, 4)}</div>
      </div>
      <span style={{ display: 'flex', alignItems: 'center' }}><Seal size={26} /></span>
    </div>
  );
}

function CardBlock({ title, icon, children, right }: { title: string; icon?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="neo-card" style={{ padding: 24 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row g2">
          {icon && <span className="st-ico" style={{ width: 36, height: 36, color: 'var(--accent)' }}><Icon name={icon as never} size={18} /></span>}
          <div className="h3" style={{ fontSize: 17 }}>{title}</div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function AttestationDetail({ nav, id }: { nav: (to: Route, params?: Record<string, string>) => void; id?: string }) {
  const [a, setA] = useState<Attestation | null>(byId(id || '') ?? null);
  const [loading, setLoading] = useState(true);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    apiGetAttestation(id)
      .then(dto => setA(dtoToAttestation(dto)))
      .catch(() => {
        // Fall back to local mock if the ID matches one
        setA(byId(id) ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Icon name="refresh" size={28} className="spinner" color="var(--accent)" />
    </div>
  );

  if (!a) return (
    <div className="page-wrap screen">
      <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 8 }} onClick={() => nav('explorer')}>
        <Icon name="chevL" size={18} /> Back to registry
      </button>
      <div className="neo-card" style={{ padding: 50, textAlign: 'center' }}>
        <Icon name="question" size={34} color="var(--navy-300)" />
        <div className="h3" style={{ marginTop: 12 }}>Attestation not found</div>
        <div className="body">This ID doesn&apos;t match any record in the registry.</div>
      </div>
    </div>
  );

  const parent = a.parent ? byId(a.parent) : null;
  const copyEmbed = () => {
    try { navigator.clipboard.writeText(`<script src="https://veris.id/badge.js" data-att="${a.attId}"><\/script>`); } catch { /* ignore */ }
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 1400);
  };

  return (
    <div className="page-wrap screen">
      <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 8 }} onClick={() => nav('explorer')}>
        <Icon name="chevL" size={18} /> Back to registry
      </button>
      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'start' }}>
        {/* LEFT: media + status */}
        <div className="col g3" style={{ position: 'sticky', top: 86 }}>
          <div className="neo-card" style={{ padding: 20 }}>
            <div className="thumb-frame" style={{ width: '100%', aspectRatio: '4 / 3' }}>
              {a.thumb
                ? <img src={a.thumb} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <Icon name="image" size={56} className="ph-icon" />}
            </div>
            <div className="row between" style={{ marginTop: 16, gap: 10 }}>
              <StatusPill status={a.status} />
              <div className="row g1">
                <a href={`https://suiscan.xyz/mainnet/object/${a.objId || a.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="icon-btn sm" title="View on SuiScan" style={{ border: 'none', textDecoration: 'none' }}>
                  <Icon name="external" size={17} />
                </a>
                <button className="icon-btn sm" title="Download share card"
                  onClick={() => downloadShareCard({
                    title: a.title, status: (a.status === 'tampered' ? 'modified' : a.status) as 'authentic' | 'modified' | 'unknown',
                    creator: a.by.addr, date: fmtDate(a.date),
                    kind: a.kind, preview: a.thumb, objId: a.objId,
                  })} style={{ border: 'none' }}>
                  <Icon name="download" size={17} />
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="h2" style={{ fontSize: 24, marginBottom: 6 }}>{a.title}</div>
            <div className="body">{a.format} · {a.size}</div>
          </div>
          {/* address screening */}
          <div className="neo-card" style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: 'var(--success)' }}><Icon name="shieldCheck" size={18} /></span>
            <span className="small" style={{ color: 'var(--navy-500)' }}>Registrant address screened</span>
            <div className="spacer" />
            <StatusPill status="authentic" label="Clean" withIcon={false} />
          </div>
        </div>
        {/* RIGHT: stacked cards */}
        <div className="col g3">
          {/* on-chain */}
          <CardBlock title="On-chain record" icon="shieldCheck"
            right={
              <a href={`https://suiscan.xyz/mainnet/object/${a.objId || a.id}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary btn-sm row g1" style={{ textDecoration: 'none' }}>
                <Icon name="external" size={15} /> SuiScan
              </a>
            }>
            <LV k="Attestation ID"><CopyId value={a.attId} /></LV>
            <LV k="Sui object ID"><CopyId value={a.objId} /></LV>
            <LV k="Registrant"><span className="mono-id">{truncate(a.by.addr, 6, 4)}</span></LV>
            <LV k="Timestamp">{fmtDateTime(a.date)}</LV>
            <LV k="Network"><span className="row g1"><span className="mainnet-dot" /> Sui Mainnet</span></LV>
          </CardBlock>
          {/* storage */}
          <CardBlock title="Storage" icon="database">
            <LV k="Walrus blob ID"><CopyId value={a.blobId} ext={false} /></LV>
            <LV k="Size">{a.size}</LV>
            <LV k="Epochs">{a.epochs} epochs</LV>
            <LV k="Privacy"><StatusPill status={a.privacy === 'Encrypted' ? 'unknown' : 'authentic'} label={a.privacy} withIcon={false} /></LV>
          </CardBlock>
          {/* AI credential */}
          <CardBlock title="AI Content Credential" icon="sparkle">
            <p className="body" style={{ marginBottom: 14, lineHeight: 1.6 }}>{a.desc}</p>
            <div style={{ marginBottom: 14 }}><StatusPill status={a.origin?.includes('AI') ? 'modified' : 'authentic'} label={a.origin} dot /></div>
            <div className="row wrap g1" style={{ marginBottom: 14 }}>{(a.tags || []).map(t => <Chip key={t}>{t}</Chip>)}</div>
            <a href="#" onClick={e => e.preventDefault()} className="row g1" style={{ fontSize: 14, fontWeight: 500 }}>
              View credential on Walrus <Icon name="external" size={14} />
            </a>
          </CardBlock>
          {/* lineage */}
          <CardBlock title="Lineage" icon="tree" right={<Button variant="secondary" size="sm" icon="tree" onClick={() => nav('lineage', { id: a.id })}>View tree</Button>}>
            <LV k="Parent">
              {parent
                ? <span className="row g2"><Thumb src={parent.thumb} size={28} />{parent.title}</span>
                : <span className="muted">None — this is an original</span>}
            </LV>
            <LV k="Derivatives">{a.derivatives}</LV>
          </CardBlock>
          {/* embed badge */}
          <CardBlock title="Embed badge" icon="badge">
            <div style={{ transform: 'scale(.92)', transformOrigin: 'left top', marginBottom: 10 }}>
              <VerifyBadge att={a} />
            </div>
            <Button variant="secondary" size="sm" icon={copiedEmbed ? 'checkSm' : 'code'} onClick={copyEmbed}>
              {copiedEmbed ? 'Copied!' : 'Copy embed code'}
            </Button>
          </CardBlock>
        </div>
      </div>
    </div>
  );
}
