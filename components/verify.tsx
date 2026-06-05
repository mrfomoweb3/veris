'use client';
import React, { useState, useRef } from 'react';
import { Icon } from './icons';
import { Button, Segmented, DropZone, FilePreview, Thumb, LV, StatusBanner, CopyId, StatusPill, Chip } from './ui';
import { processFile, type ProcessedFile } from '@/lib/fileutil';
import { ATTESTATIONS, byId, truncate, fmtDate, type Attestation } from '@/lib/data';
import { verifyFile as apiVerifyFile, verifyById as apiVerifyById } from '@/lib/api';
import type { AttestationDTO } from '@/lib/api';
import type { Route } from './shell';

// Map API AttestationDTO → the Attestation shape the result components expect
function mapDtoToAtt(dto: AttestationDTO): Attestation {
  const mock = byId('a1')!;
  return {
    ...mock,
    id: dto.id,
    attId: dto.id,
    objId: dto.id,
    blobId: dto.blobId,
    sha256: dto.sha256,
    phash: dto.phash,
    by: { addr: dto.creator, name: truncate(dto.creator, 6, 4) },
    date: new Date(dto.createdAtMs).toISOString(),
    status: 'authentic',
    parent: dto.parent ?? undefined,
    thumb: ATTESTATIONS[0].thumb,
    title: dto.mediaType ?? 'Registered file',
  } as unknown as Attestation;
}

interface VerifyResult {
  status: 'authentic' | 'modified' | 'unknown';
  att?: Attestation;
  file?: { preview?: string | null; name: string; kind: string } | ProcessedFile;
  changes?: string[];
}

// ================= INPUT =================
function VerifyInput({ onResult }: { onResult: (r: VerifyResult) => void }) {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState<ProcessedFile | null>(null);
  const [idVal, setIdVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  // Keep raw File for API submission
  const rawFileRef = useRef<File | null>(null);

  const handleFile = async (raw: File) => {
    setLoading(true);
    rawFileRef.current = raw;
    const f = await processFile(raw);
    setFile(f);
    setLoading(false);
  };

  const runVerify = async (forced?: string) => {
    setBusy(true);

    // Demo shortcuts — always use mock data
    if (forced === 'authentic') {
      await new Promise(r => setTimeout(r, 900));
      setBusy(false);
      return onResult({ status: 'authentic', att: byId('a1')!, file: { preview: byId('a1')!.thumb, name: 'Harbor at dawn.raw', kind: 'image' } });
    }
    if (forced === 'modified') {
      await new Promise(r => setTimeout(r, 900));
      setBusy(false);
      return onResult({ status: 'modified', att: byId('a1')!, file: { preview: byId('a5')!.thumb, name: 'harbor-web.jpg', kind: 'image' }, changes: byId('a5')!.changes });
    }
    if (forced === 'unknown') {
      await new Promise(r => setTimeout(r, 900));
      setBusy(false);
      return onResult({ status: 'unknown', file: { preview: ATTESTATIONS[5].thumb, name: 'untitled.png', kind: 'image' } });
    }

    // Real verify — try API first, fall back to unknown
    try {
      if (tab === 'upload' && rawFileRef.current && process.env.NEXT_PUBLIC_API_URL) {
        const apiRes = await apiVerifyFile(rawFileRef.current);
        setBusy(false);
        // Map API AttestationDTO → local Attestation shape for display
        const mockAtt = apiRes.attestation ? mapDtoToAtt(apiRes.attestation) : undefined;
        return onResult({ status: apiRes.status, att: mockAtt, file: file ?? undefined, changes: apiRes.diff });
      }
      if (tab === 'id' && idVal.trim() && process.env.NEXT_PUBLIC_API_URL) {
        const apiRes = await apiVerifyById(idVal.trim());
        setBusy(false);
        const mockAtt = apiRes.attestation ? mapDtoToAtt(apiRes.attestation) : undefined;
        return onResult({ status: apiRes.status, att: mockAtt, file: undefined, changes: apiRes.diff });
      }
    } catch (err) {
      console.warn('[verify] API error (falling back):', err);
    }

    // Fallback
    setBusy(false);
    if (file) onResult({ status: 'unknown', file });
  };

  const canVerify = tab === 'upload' ? !!file : idVal.trim().length > 6;

  return (
    <div className="screen" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>Verify authenticity.</h1>
      <p className="body" style={{ fontSize: 17, marginBottom: 30 }}>Check any file against the Veris registry on Sui.</p>
      <div className="neo-card" style={{ padding: 28, textAlign: 'left' }}>
        <div className="row center" style={{ marginBottom: 22 }}>
          <Segmented value={tab} onChange={setTab} options={[{ value: 'upload', label: 'Upload file' }, { value: 'id', label: 'Paste ID' }]} />
        </div>
        {tab === 'upload'
          ? (loading
              ? <div className="dropzone" style={{ cursor: 'default' }}><Icon name="refresh" size={28} className="spinner" color="var(--accent)" /><div className="small">Computing fingerprint…</div></div>
              : file
                ? <FilePreview file={file} onRemove={() => setFile(null)} />
                : <DropZone onFile={handleFile} compact caption="Drop the file you want to check" />)
          : (
            <div className="col g2">
              <input className="field" placeholder="Walrus blob ID or Sui object ID" value={idVal} onChange={e => setIdVal(e.target.value)} />
              <div className="small row g1"><Icon name="info" size={14} />Paste an attestation, object, or blob identifier.</div>
            </div>
          )}
        <div style={{ marginTop: 22 }}>
          <Button variant="primary" block size="lg" icon={busy ? undefined : 'shieldCheck'} disabled={!canVerify || busy} onClick={() => runVerify()}>
            {busy ? <><Icon name="refresh" size={18} className="spinner" /> Recomputing fingerprint…</> : 'Verify'}
          </Button>
        </div>
        <p className="small" style={{ textAlign: 'center', marginTop: 14 }}>We recompute the fingerprint and compare it on-chain.</p>
      </div>
      {/* Demo shortcuts */}
      <div className="col g1" style={{ marginTop: 22, alignItems: 'center' }}>
        <div className="small">Or preview a sample result</div>
        <div className="row center g1 wrap">
          <Chip clickable icon="check" onClick={() => runVerify('authentic')}>Authentic</Chip>
          <Chip clickable icon="diff" onClick={() => runVerify('modified')}>Modified</Chip>
          <Chip clickable icon="question" onClick={() => runVerify('unknown')}>Not found</Chip>
        </div>
      </div>
    </div>
  );
}

// ================= RESULT: AUTHENTIC =================
function ResultAuthentic({ res, nav, again }: { res: VerifyResult; nav: (to: Route, params?: Record<string, string>) => void; again: () => void }) {
  const a = res.att!;
  return (
    <div className="screen" style={{ maxWidth: 660, margin: '0 auto' }}>
      <div className="row center" style={{ marginBottom: 24 }}>
        <StatusBanner tone="success" icon="check">Authentic — exact match</StatusBanner>
      </div>
      <div className="neo-card" style={{ padding: 26 }}>
        <div className="res-2col" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'start' }}>
          <Thumb src={res.file?.preview} kind={res.file?.kind} size={180} radius={18} />
          <div>
            <div className="h3" style={{ marginBottom: 14 }}>{a.title}</div>
            <LV k="Registered by"><span className="mono-id">{truncate(a.by.addr, 6, 4)}</span></LV>
            <LV k="Date">{fmtDate(a.date)}</LV>
            <LV k="Walrus blob"><CopyId value={a.blobId} ext={false} /></LV>
            <LV k="Sui object"><CopyId value={a.objId} /></LV>
          </div>
        </div>
      </div>
      <div className="row center g2 wrap" style={{ marginTop: 24 }}>
        <Button variant="secondary" icon="tree" onClick={() => nav('lineage', { id: a.id })}>View lineage</Button>
        <Button variant="secondary" icon="external" onClick={() => {}}>View on SuiScan</Button>
        <Button variant="primary" icon="shieldCheck" onClick={again}>Verify another</Button>
      </div>
    </div>
  );
}

// ================= RESULT: MODIFIED =================
function ResultModified({ res, nav, again }: { res: VerifyResult; nav: (to: Route, params?: Record<string, string>) => void; again: () => void }) {
  const a = res.att!;
  return (
    <div className="screen" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="row center" style={{ marginBottom: 24 }}>
        <StatusBanner tone="warning" icon="diff">Modified — derivative of a registered original</StatusBanner>
      </div>
      {/* side-by-side */}
      <div className="neo-card" style={{ padding: 26, marginBottom: 22 }}>
        <div className="compare" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, alignItems: 'center' }}>
          <div>
            <div className="small" style={{ marginBottom: 8, textAlign: 'center' }}>Original (on Walrus)</div>
            <div className="thumb-frame" style={{ width: '100%', aspectRatio: '1 / 1' }}><img src={a.thumb} alt="" /></div>
            <div style={{ textAlign: 'center', marginTop: 8 }}><StatusPill status="authentic" /></div>
          </div>
          <div style={{ color: 'var(--navy-300)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 40, height: 1, background: 'rgba(126,147,184,.4)' }} />
            <Icon name="arrowR" size={22} />
            <div style={{ width: 40, height: 1, background: 'rgba(126,147,184,.4)' }} />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 8, textAlign: 'center' }}>Your file</div>
            <div className="thumb-frame" style={{ width: '100%', aspectRatio: '1 / 1' }}>
              {res.file?.preview ? <img src={res.file.preview} alt="" /> : <Icon name="image" size={48} className="ph-icon" />}
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}><StatusPill status="modified" /></div>
          </div>
        </div>
      </div>
      {/* AI change summary */}
      <div className="neo-card" style={{ padding: 24, marginBottom: 22 }}>
        <div className="row g2" style={{ marginBottom: 14 }}>
          <span className="st-ico" style={{ width: 38, height: 38, color: 'var(--accent)' }}><Icon name="sparkle" size={19} /></span>
          <div className="h3" style={{ fontSize: 18 }}>AI change summary</div>
        </div>
        <div className="col g1">
          {(res.changes || ['Cropped to 4:5', 'Warmer white balance', 'Watermark added']).map((ch, i) => (
            <div key={i} className="row g2" style={{ padding: '9px 0', borderBottom: i < (res.changes || []).length - 1 ? '1px solid rgba(126,147,184,.13)' : 'none' }}>
              <span style={{ color: 'var(--warning)' }}><Icon name="diff" size={16} /></span>
              <span style={{ color: 'var(--navy-900)', fontSize: 14.5 }}>{ch}</span>
            </div>
          ))}
        </div>
      </div>
      {/* original attestation details */}
      <div className="neo-card" style={{ padding: 24 }}>
        <div className="label" style={{ marginBottom: 6 }}>Original attestation</div>
        <LV k="Registered by"><span className="mono-id">{truncate(a.by.addr, 6, 4)}</span></LV>
        <LV k="Date">{fmtDate(a.date)}</LV>
        <LV k="Attestation"><CopyId value={a.attId} /></LV>
      </div>
      <div className="row center g2 wrap" style={{ marginTop: 24 }}>
        <Button variant="primary" icon="git" onClick={() => nav('register')}>Register as derivative</Button>
        <Button variant="secondary" icon="tree" onClick={() => nav('lineage', { id: a.id })}>View lineage</Button>
        <Button variant="secondary" icon="shieldCheck" onClick={again}>Verify another</Button>
      </div>
    </div>
  );
}

// ================= RESULT: UNKNOWN =================
function ResultUnknown({ res, nav, again }: { res: VerifyResult; nav: (to: Route) => void; again: () => void }) {
  return (
    <div className="screen" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
      <div className="row center" style={{ marginBottom: 24 }}>
        <StatusBanner tone="neutral" icon="question">Not found in the registry</StatusBanner>
      </div>
      <div className="neo-card" style={{ padding: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Thumb src={res.file?.preview} kind={res.file?.kind || 'image'} size={130} radius={18} />
        </div>
        <div className="h3" style={{ marginBottom: 8 }}>{res.file?.name || 'This file'}</div>
        <p className="body">This file has no attestation yet. Be the first to certify it.</p>
      </div>
      <div className="row center g2 wrap" style={{ marginTop: 24 }}>
        <Button variant="primary" icon="register" onClick={() => nav('register')}>Register this file</Button>
        <Button variant="secondary" icon="shieldCheck" onClick={again}>Verify another</Button>
      </div>
    </div>
  );
}

// ================= CONTAINER =================
export function Verify({ nav }: { nav: (to: Route, params?: Record<string, string>) => void }) {
  const [res, setRes] = useState<VerifyResult | null>(null);
  const again = () => setRes(null);
  return (
    <div className="page-wrap">
      {!res && <VerifyInput onResult={setRes} />}
      {res?.status === 'authentic' && <ResultAuthentic res={res} nav={nav} again={again} />}
      {res?.status === 'modified' && <ResultModified res={res} nav={nav} again={again} />}
      {res?.status === 'unknown' && <ResultUnknown res={res} nav={nav} again={again} />}
    </div>
  );
}
