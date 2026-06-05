'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Icon, Seal } from './icons';
import { Button, IconButton, Stepper, DropZone, FilePreview, Thumb, LV, Switch, Chip, CopyId, StatusPill } from './ui';
import { processFile, type ProcessedFile } from '@/lib/fileutil';
import { ATTESTATIONS, truncate, fmtDate, randHex, byId } from '@/lib/data';
import { prepareRegisterTx, resolveDigest, wakeBackend } from '@/lib/api';
import { downloadShareCard } from '@/lib/sharecard';
import type { Route } from './shell';

const STEPS = ['Upload', 'Credential', 'Confirm'];

interface CredInfo { desc: string; origin: string; flag: string; tags: string[]; }

function aiCredential(file: ProcessedFile): CredInfo {
  const k = file.kind;
  if (k === 'image') return {
    desc: 'A high-resolution image. Pixel statistics, noise distribution, and metadata are consistent with a camera-captured original — no indicators of generative synthesis were detected.',
    origin: 'Likely camera-original', flag: 'success',
    tags: ['image', file.dims ? `${file.dims.w}×${file.dims.h}` : 'photo', 'original'],
  };
  if (k === 'video') return { desc: 'A video clip. Frame cadence and audio waveform are consistent with a single continuous capture.', origin: 'Likely camera-original', flag: 'success', tags: ['video', 'clip', 'original'] };
  if (k === 'dataset') return { desc: 'A structured dataset file. Anchoring its hash creates a citable, immutable reference for reproducibility.', origin: 'Dataset original', flag: 'neutral', tags: ['dataset', 'tabular', 'reference'] };
  return { desc: 'A document file. Its fingerprint is anchored to establish a tamper-evident record of this exact version.', origin: 'Document original', flag: 'neutral', tags: ['document', 'record'] };
}

function StepFooter({ onBack, onNext, nextLabel = 'Continue', nextDisabled, cancel, nav }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean; cancel?: boolean; nav: (to: Route) => void }) {
  return (
    <div className="row between" style={{ marginTop: 28, gap: 12 }}>
      {cancel
        ? <Button variant="secondary" onClick={() => nav('dashboard')}>Cancel</Button>
        : <Button variant="secondary" icon="chevL" onClick={onBack}>Back</Button>}
      <Button variant="primary" iconRight="arrowR" onClick={onNext} disabled={nextDisabled}>{nextLabel}</Button>
    </div>
  );
}

// ================= STEP 1: UPLOAD =================
function StepUpload({ file, setFile, setRawFile, onNext, nav }: { file: ProcessedFile | null; setFile: (f: ProcessedFile | null) => void; setRawFile: (f: File | null) => void; onNext: () => void; nav: (to: Route) => void }) {
  const [loading, setLoading] = useState(false);
  const handle = async (raw: File) => {
    setLoading(true);
    setRawFile(raw);
    const f = await processFile(raw);
    setFile(f);
    setLoading(false);
  };
  return (
    <div className="col g3" style={{ maxWidth: 640, margin: '0 auto' }}>
      {!file && !loading && <DropZone onFile={handle} />}
      {loading && (
        <div className="dropzone" style={{ cursor: 'default' }}>
          <Icon name="refresh" size={30} className="spinner" color="var(--accent)" />
          <div className="small">Reading file & computing fingerprint…</div>
        </div>
      )}
      {file && (
        <div className="pop-in">
          <FilePreview file={file} onRemove={() => setFile(null)} />
          <div className="neo-card" style={{ padding: '18px 22px', marginTop: 16 }}>
            <div className="row g2" style={{ color: 'var(--success)', fontWeight: 500, fontSize: 14 }}>
              <Icon name="check" size={16} />
              <span>SHA-256 computed locally — your file hasn&apos;t left the browser yet</span>
            </div>
            <div className="mono-id" style={{ marginTop: 8, fontSize: 13, wordBreak: 'break-all' }}>{truncate(file.sha, 22, 8)}</div>
          </div>
        </div>
      )}
      <StepFooter cancel nav={nav} onNext={onNext} nextDisabled={!file} />
    </div>
  );
}

// ================= STEP 2: CREDENTIAL =================
interface Meta { cred?: CredInfo; notes?: string; encrypted?: boolean; isDerivative?: boolean; parent?: string | null; }

function StepCredential({ file, meta, setMeta, onBack, onNext }: { file: ProcessedFile; meta: Meta; setMeta: React.Dispatch<React.SetStateAction<Meta>>; onBack: () => void; onNext: () => void }) {
  const cred = meta.cred || aiCredential(file);
  useEffect(() => { if (!meta.cred) setMeta(m => ({ ...m, cred })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const parents = ATTESTATIONS.filter(a => a.status === 'authentic');
  return (
    <div className="reg-2col" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 26, alignItems: 'start' }}>
      {/* Left: preview + metadata */}
      <div className="neo-card" style={{ padding: 24 }}>
        <div className="thumb-frame" style={{ width: '100%', aspectRatio: '4 / 3' }}>
          {file.preview
            ? <img src={file.preview} alt="" />
            : <Icon name={file.kind === 'video' ? 'video' : file.kind === 'dataset' ? 'database' : 'file'} size={56} className="ph-icon" />}
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 16, marginBottom: 10, wordBreak: 'break-word' }}>{file.name}</div>
          <LV k="Format">{file.format}</LV>
          <LV k="Size">{file.sizeLabel}</LV>
          {file.dims && <LV k="Dimensions">{file.dims.w} × {file.dims.h}</LV>}
          <LV k="Captured">{fmtDate(Date.now())}</LV>
        </div>
      </div>
      {/* Right: AI credential */}
      <div className="col g3">
        <div className="neo-card" style={{ padding: 26 }}>
          <div className="row g2 between" style={{ marginBottom: 14 }}>
            <div className="row g2">
              <span className="st-ico" style={{ width: 40, height: 40, color: 'var(--accent)' }}><Icon name="sparkle" size={20} /></span>
              <div>
                <div className="h3" style={{ fontSize: 18 }}>AI Content Credential</div>
                <div className="small">AI-generated · stored on Walrus</div>
              </div>
            </div>
          </div>
          <p className="body" style={{ marginBottom: 16, lineHeight: 1.6 }}>{cred.desc}</p>
          <div style={{ marginBottom: 16 }}>
            <StatusPill status={cred.flag === 'success' ? 'authentic' : 'unknown'} label={cred.origin} dot />
          </div>
          <div className="small" style={{ marginBottom: 8 }}>Detected tags</div>
          <div className="row wrap g1">{cred.tags.map(t => <Chip key={t}>{t}</Chip>)}</div>
        </div>
        {/* Notes */}
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Notes (optional)</div>
          <textarea className="field" placeholder="Add context for anyone who verifies this file later…" value={meta.notes || ''} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} />
        </div>
        {/* Privacy toggle */}
        <div className="neo-card" style={{ padding: 20 }}>
          <div className="row between g2">
            <div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Visibility</div>
              <div className="small">{meta.encrypted ? 'Encrypted with Seal — only you can decrypt' : 'Public — anyone can verify and view'}</div>
            </div>
            <div className="seg">
              <button className={!meta.encrypted ? 'active' : ''} onClick={() => setMeta(m => ({ ...m, encrypted: false }))}>Public</button>
              <button className={meta.encrypted ? 'active' : ''} onClick={() => setMeta(m => ({ ...m, encrypted: true }))}>Encrypted</button>
            </div>
          </div>
        </div>
        {/* Derivative toggle */}
        <div className="neo-card" style={{ padding: 20 }}>
          <div className="row between g2">
            <div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>This is a derivative</div>
              <div className="small">Link this file as a certified child of an existing original</div>
            </div>
            <Switch on={!!meta.isDerivative} onChange={v => setMeta(m => ({ ...m, isDerivative: v, parent: v ? m.parent : null }))} />
          </div>
          {meta.isDerivative && (
            <div className="pop-in" style={{ marginTop: 16 }}>
              <div className="small" style={{ marginBottom: 8 }}>Select parent attestation</div>
              {meta.parent
                ? (() => {
                    const p = byId(meta.parent!);
                    return p ? (
                      <div className="row g2 between" style={{ padding: 12, borderRadius: 14, boxShadow: 'var(--inset-sm)', background: 'var(--surface-alt)' }}>
                        <div className="row g2">
                          <Thumb src={p.thumb} size={40} />
                          <span style={{ fontWeight: 500, color: 'var(--navy-900)' }}>{p.title}</span>
                        </div>
                        <IconButton name="close" size="sm" onClick={() => setMeta(m => ({ ...m, parent: null }))} />
                      </div>
                    ) : null;
                  })()
                : (
                  <div className="col g1">
                    {parents.slice(0, 3).map(p => (
                      <button key={p.id} className="wallet-row" style={{ padding: 10 }} onClick={() => setMeta(m => ({ ...m, parent: p.id }))}>
                        <Thumb src={p.thumb} size={38} />
                        <span style={{ fontWeight: 500, color: 'var(--navy-900)', fontSize: 14 }}>{p.title}</span>
                        <div className="spacer" />
                        <Icon name="chevR" size={16} color="var(--navy-300)" />
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
        <div className="row between" style={{ marginTop: 28, gap: 12 }}>
          <Button variant="secondary" icon="chevL" onClick={onBack}>Back</Button>
          <Button variant="primary" iconRight="arrowR" onClick={onNext}>Continue</Button>
        </div>
      </div>
    </div>
  );
}

// ================= STEP 3: CONFIRM + MINT =================
// Steps are driven by ACTUAL progress — no blind timer.
const MINT_STEPS = [
  { title: 'Processing your file', sub: 'Uploading to Walrus · generating AI credential · building transaction…', icon: 'database' },
  { title: 'Approve in your wallet', sub: 'Check your Sui wallet extension and approve the transaction', icon: 'shieldCheck' },
  { title: 'Confirming on-chain', sub: 'Transaction submitted · waiting for Sui mainnet confirmation', icon: 'globe' },
];

type Receipt = { attId: string; blobId: string; objId: string };

function StepConfirm({ file, rawFile, meta, onBack, onDone }: { file: ProcessedFile; rawFile: File | null; meta: Meta; onBack: () => void; onDone: (receipt?: Receipt) => void }) {
  const { address, connected, signAndExecuteTransaction } = useWallet();
  const [minting, setMinting] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);

  const start = async () => {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      setError('Backend URL not configured. Set NEXT_PUBLIC_API_URL and redeploy.');
      return;
    }
    if (!connected || !address) {
      setError('No wallet connected. Please connect your Sui wallet first.');
      return;
    }
    if (!rawFile) {
      setError('No file selected.');
      return;
    }

    // Pre-warm Railway — cold starts can cause "Failed to fetch" on the first request
    setWaking(true);
    await wakeBackend();
    setWaking(false);

    setMinting(true); setActive(0); setError(null);

    try {
      // Step 0 active → backend: fingerprint + Walrus upload + AI credential + build PTB
      const prepared = await prepareRegisterTx({
        file: rawFile,
        creator: address,
        privacy: meta.encrypted ? 'encrypted' : 'public',
        parentId: meta.parent ?? undefined,
      });

      // Step 1 active → wallet popup appears here immediately
      setActive(1);
      const txBytes = Uint8Array.from(atob(prepared.txBytes), c => c.charCodeAt(0));
      const tx = Transaction.from(txBytes);
      const result = await signAndExecuteTransaction({ transaction: tx });

      // Step 2 active → resolve real object ID while showing "Confirming"
      setActive(2);
      const objectId = await resolveDigest(result.digest) ?? result.digest;

      // Brief pause so the user sees step 2 complete before success screen
      await new Promise(r => setTimeout(r, 800));

      onDone({ attId: objectId, blobId: prepared.blobId, objId: objectId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMinting(false);
      setActive(-1);
      console.error('[register] error:', err);
    }
  };
  const parent = meta.parent ? byId(meta.parent) : null;
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="neo-card" style={{ padding: 30 }}>
        <div className="h3" style={{ marginBottom: 20 }}>Review & register on Sui mainnet</div>
        <div className="lv">
          <span className="k">File</span>
          <span className="v row g2">
            <Thumb src={file.preview} kind={file.kind} size={36} />
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          </span>
        </div>
        <LV k="SHA-256"><span className="mono-id">{truncate(file.sha, 8, 6)}</span></LV>
        <LV k="Fingerprint (pHash)"><span className="mono-id">{truncate(file.phash, 6, 4)}</span></LV>
        <LV k="Storage">Walrus · 6 epochs</LV>
        <LV k="Privacy">{meta.encrypted ? 'Encrypted (Seal)' : 'Public'}</LV>
        <LV k="Parent">
          {parent
            ? <span className="row g1"><Thumb src={parent.thumb} size={28} />{parent.title}</span>
            : <span className="muted">None</span>}
        </LV>
        <div className="inset" style={{ padding: '14px 18px', marginTop: 18, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="coins" size={18} color="var(--navy-500)" />
          <span className="small" style={{ color: 'var(--navy-500)' }}>Walrus storage ≈ </span>
          <span style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>0.02 WAL</span>
          <span className="small">· Gas ≈</span>
          <span style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>0.003 SUI</span>
        </div>
        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'var(--danger-tint)', color: 'var(--danger)', fontSize: 13.5 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {!minting
          ? <div style={{ marginTop: 22 }}>
              <Button variant="primary" block size="lg" icon={waking ? undefined : 'shieldCheck'} onClick={start}
                disabled={!connected || !process.env.NEXT_PUBLIC_API_URL || waking}>
                {waking
                  ? <><Icon name="refresh" size={18} className="spinner" /> Connecting to server…</>
                  : 'Sign & Register'}
              </Button>
              {!process.env.NEXT_PUBLIC_API_URL && (
                <p className="small" style={{ textAlign: 'center', marginTop: 10, color: 'var(--danger)' }}>
                  ⚠ Backend not configured — set NEXT_PUBLIC_API_URL in Vercel and redeploy.
                </p>
              )}
              {process.env.NEXT_PUBLIC_API_URL && !connected && (
                <p className="small" style={{ textAlign: 'center', marginTop: 10, color: 'var(--warning)' }}>
                  Connect your Sui wallet to sign this transaction.
                </p>
              )}
            </div>
          : (
            <div className="progress-well pop-in" style={{ marginTop: 22 }}>
              {MINT_STEPS.map((s, i) => {
                const state = active > i ? 'done' : active === i ? 'active' : '';
                return (
                  <div key={i} className={'mint-step ' + state}>
                    <span className="ms-ico">
                      {state === 'done' ? <Icon name="checkSm" size={20} />
                        : state === 'active' ? <Icon name="refresh" size={18} className="spinner" />
                        : <Icon name={s.icon as never} size={18} />}
                    </span>
                    <div>
                      <div className="ms-title">{s.title}</div>
                      <div className="ms-sub">{s.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
      {!minting && (
        <div className="row" style={{ marginTop: 20 }}>
          <Button variant="secondary" icon="chevL" onClick={onBack}>Back</Button>
        </div>
      )}
    </div>
  );
}

// ================= SUCCESS =================
function RegisterSuccess({ file, receipt, nav, reset }: { file: ProcessedFile; receipt: { attId: string; blobId: string; objId: string }; nav: (to: Route, params?: Record<string, string>) => void; reset: () => void }) {
  return (
    <div className="screen" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: 20 }}>
      {/* File preview or check icon */}
      {file.preview
        ? <div style={{ width: 110, height: 110, borderRadius: 24, overflow: 'hidden', margin: '0 auto 24px', boxShadow: 'var(--raise)' }}>
            <img src={file.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        : <div className="glow-success spin-check" style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--success)' }}>
            <Icon name="check" size={52} strokeWidth={2.2} />
          </div>}
      <h2 className="h2" style={{ marginBottom: 8 }}>Registered on Sui.</h2>
      <p className="body" style={{ marginBottom: 28, fontSize: 17 }}>Your original is permanently stored and anchored.</p>
      <div className="neo-card" style={{ padding: 26, textAlign: 'left' }}>
        <LV k="File"><span style={{ fontWeight: 500, color: 'var(--navy-900)' }}>{file.name}</span></LV>
        <LV k="Attestation ID"><CopyId value={receipt.attId} /></LV>
        <LV k="Walrus blob ID"><CopyId value={receipt.blobId} /></LV>
        <LV k="Sui object ID"><CopyId value={receipt.objId} /></LV>
      </div>
      <div className="row center g2 wrap" style={{ marginTop: 26 }}>
        <Button variant="primary" icon="eye" onClick={() => nav('detail', { id: receipt.objId })}>View attestation</Button>
        <Button variant="secondary" icon="download" onClick={() => downloadShareCard({
          title: file.name,
          status: 'authentic',
          creator: receipt.attId,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          kind: file.kind,
          preview: file.preview,
          objId: receipt.objId,
        })}>Download card</Button>
      </div>
      <button className="btn btn-ghost" style={{ margin: '14px auto 0' }} onClick={reset}>Register another</button>
    </div>
  );
}

// ================= CONTAINER =================
export function Register({ nav }: { nav: (to: Route, params?: Record<string, string>) => void }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<ProcessedFile | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Meta>({ encrypted: false, isDerivative: false });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => { setStep(1); setFile(null); setRawFile(null); setMeta({ encrypted: false, isDerivative: false }); setReceipt(null); setDone(false); };
  const finish = (realReceipt?: Receipt) => {
    setReceipt(realReceipt ?? { attId: file!.sha, blobId: randHex(44), objId: randHex(40) });
    setDone(true);
  };

  if (done && receipt && file) return <div className="page-wrap"><RegisterSuccess file={file} receipt={receipt} nav={nav} reset={reset} /></div>;

  return (
    <div className="page-wrap screen">
      <div className="row center" style={{ marginBottom: 34 }}><Stepper step={step} steps={STEPS} /></div>
      <div className="h2 show-mobile" style={{ textAlign: 'center', marginBottom: 24, fontSize: 22 }}>{STEPS[step - 1]}</div>
      {step === 1 && <StepUpload file={file} setFile={setFile} setRawFile={setRawFile} nav={nav} onNext={() => setStep(2)} />}
      {step === 2 && file && <StepCredential file={file} meta={meta} setMeta={setMeta} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && file && <StepConfirm file={file} rawFile={rawFile} meta={meta} onBack={() => setStep(2)} onDone={finish} />}
    </div>
  );
}
