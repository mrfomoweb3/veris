'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from './icons';
import { Button, IconButton, StatusPill, Thumb, LV, CopyId } from './ui';
import { LINEAGE, byId, truncate, fmtDate, fmtDateTime, type Attestation } from '@/lib/data';
import { getLineage, dtoToAttestation } from '@/lib/api';
import type { Route } from './shell';

// ── Tree layout engine ────────────────────────────────────────────────────────

const NODE_W = 188;
const ROOT_W = 220;
const LEVEL_H = 230;
const H_GAP = 20;
const CANVAS_W = 780;
const TOP_PAD = 16;

interface NodePos { x: number; y: number; root?: boolean; }

function computeLayout(rootId: string, nodeMap: Map<string, Attestation>): {
  pos: Record<string, NodePos>;
  edges: [string, string][];
  canvasH: number;
} {
  // parent → children
  const children: Record<string, string[]> = {};
  for (const [id, node] of nodeMap) {
    const parentId = node.parent;
    if (parentId && nodeMap.has(parentId)) {
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(id);
    }
  }

  // BFS level assignment
  const levels: string[][] = [];
  const visited = new Set<string>();
  let wave = [rootId];
  while (wave.length > 0) {
    levels.push(wave);
    wave.forEach(id => visited.add(id));
    const next: string[] = [];
    for (const id of wave) {
      (children[id] ?? []).forEach(c => { if (!visited.has(c)) next.push(c); });
    }
    wave = next;
  }

  const pos: Record<string, NodePos> = {};
  levels.forEach((row, level) => {
    const isRoot = level === 0;
    const w = isRoot ? ROOT_W : NODE_W;
    const totalW = row.length * w + (row.length - 1) * H_GAP;
    const startX = Math.max(0, (CANVAS_W - totalW) / 2);
    row.forEach((id, i) => {
      pos[id] = { x: startX + i * (w + H_GAP), y: TOP_PAD + level * LEVEL_H, ...(isRoot ? { root: true } : {}) };
    });
  });

  const edges: [string, string][] = [];
  for (const [id, node] of nodeMap) {
    if (node.parent && nodeMap.has(node.parent)) edges.push([node.parent, id]);
  }

  const canvasH = TOP_PAD + levels.length * LEVEL_H + 160;
  return { pos, edges, canvasH };
}

function edgePath(from: NodePos, to: NodePos, fromRoot: boolean): string {
  const wf = fromRoot ? ROOT_W : NODE_W;
  const x1 = from.x + wf / 2, y1 = from.y + 148;
  const x2 = to.x + NODE_W / 2, y2 = to.y;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

// ── Tree node card ────────────────────────────────────────────────────────────

function TreeNode({ id, node, pos, selected, onSelect }: { id: string; node: Attestation; pos: NodePos; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <div
      onClick={() => onSelect(id)}
      style={{
        position: 'absolute', left: pos.x, top: pos.y,
        width: pos.root ? ROOT_W : NODE_W,
        cursor: 'pointer', borderRadius: 20, padding: 14,
        background: selected ? 'var(--surface-alt)' : 'var(--base)',
        boxShadow: selected ? 'var(--inset-sm), 0 0 0 2px rgba(79,134,247,.4)' : 'var(--raise-sm)',
        transition: 'box-shadow .3s var(--ease), background .3s',
      }}
    >
      <div className="thumb-frame" style={{ width: '100%', aspectRatio: pos.root ? '16/9' : '16/10', marginBottom: 10 }}>
        <img src={node.thumb} alt="" />
      </div>
      <div className="row between g1" style={{ marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: pos.root ? 15 : 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
          {node.label || node.title}
        </span>
        <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: node.status === 'authentic' ? 'var(--success)' : 'var(--warning)', boxShadow: `0 0 7px ${node.status === 'authentic' ? 'rgba(63,168,119,.6)' : 'rgba(226,163,60,.5)'}` }} />
      </div>
      {node.summary && <div className="small" style={{ fontSize: 12, marginBottom: 6, lineHeight: 1.35 }}>{node.summary}</div>}
      <div className="row between" style={{ fontSize: 11.5, color: 'var(--navy-300)' }}>
        <span className="mono-id" style={{ fontSize: 11.5 }}>{truncate(node.by.addr, 4, 3)}</span>
        <span>{fmtDate(node.date)}</span>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ node, nav }: { node: Attestation; nav: (to: Route, params?: Record<string, string>) => void }) {
  return (
    <div className="neo-card" style={{ padding: 24 }}>
      <div className="thumb-frame" style={{ width: '100%', aspectRatio: '4/3', marginBottom: 16 }}>
        <img src={node.thumb} alt="" />
      </div>
      <div className="row between g1" style={{ marginBottom: 12 }}>
        <div className="h3" style={{ fontSize: 18 }}>{node.label || node.title}</div>
        <StatusPill status={node.status} withIcon={false} />
      </div>
      <LV k="Registered by"><span className="mono-id">{truncate(node.by.addr, 6, 4)}</span></LV>
      <LV k="Date">{fmtDateTime(node.date)}</LV>
      {node.summary && <LV k="Changes"><span style={{ textAlign: 'right', maxWidth: 180 }}>{node.summary}</span></LV>}
      <LV k="Walrus blob"><CopyId value={node.blobId} ext={false} /></LV>
      <a href="#" onClick={e => e.preventDefault()} className="row g1" style={{ fontSize: 14, fontWeight: 500, margin: '14px 0 18px' }}>
        <Icon name="sparkle" size={15} /> View AI credential
      </a>
      <Button variant="primary" block icon="shieldCheck" onClick={() => nav('verify')}>Verify this version</Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Lineage({ nav, id }: { nav: (to: Route, params?: Record<string, string>) => void; id?: string }) {
  // Seed with mock lineage data; replaced by API on mount
  const [nodeMap, setNodeMap] = useState<Map<string, Attestation>>(
    () => new Map(Object.entries(LINEAGE.nodes) as [string, Attestation][]),
  );
  const [rootId, setRootId] = useState(LINEAGE.rootId);
  const [selected, setSelected] = useState(LINEAGE.rootId);

  // Fetch real lineage from API
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_URL || !id) return;
    getLineage(id)
      .then(lineage => {
        const map = new Map<string, Attestation>(
          lineage.nodes.map(n => [n.id, dtoToAttestation(n)]),
        );
        setNodeMap(map);
        setRootId(lineage.rootId);
        setSelected(lineage.rootId);
      })
      .catch(() => {}); // keep mock on error
  }, [id]);

  const { pos, edges, canvasH } = useMemo(() => computeLayout(rootId, nodeMap), [rootId, nodeMap]);

  const selectedNode = nodeMap.get(selected) ?? byId(selected)!;
  const rootTitle = nodeMap.get(rootId)?.title ?? byId('a1')?.title;

  // Pan / zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = 'touches' in e ? e.touches[0] : e;
    drag.current = { sx: pt.clientX, sy: pt.clientY, px: pan.x, py: pan.y };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drag.current) return;
      const pt = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
      setPan({ x: drag.current.px + (pt.clientX - drag.current.sx), y: drag.current.py + (pt.clientY - drag.current.sy) });
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  });

  return (
    <div className="page-wrap screen">
      <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 6 }} onClick={() => nav('detail', { id: id || 'a1' })}>
        <Icon name="chevL" size={18} /> Back
      </button>
      <div className="row between wrap g2" style={{ marginBottom: 18 }}>
        <div>
          <div className="h2">Provenance</div>
          <div className="body">{rootTitle}</div>
        </div>
      </div>
      <div className="lineage-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Tree canvas */}
        <div
          className="neo-card"
          style={{ padding: 0, overflow: 'hidden', position: 'relative', height: Math.max(600, canvasH), background: 'var(--base)', cursor: drag.current ? 'grabbing' : 'grab' }}
          onMouseDown={onDown}
          onTouchStart={onDown}
        >
          <div style={{ position: 'absolute', left: '50%', top: 24, transform: `translateX(-50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top center', width: CANVAS_W, height: canvasH }}>
            {/* Edges */}
            <svg width={CANVAS_W} height={canvasH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
              {edges.map(([fromId, toId]) => {
                const fromPos = pos[fromId], toPos = pos[toId];
                if (!fromPos || !toPos) return null;
                return (
                  <path key={fromId + toId} d={edgePath(fromPos, toPos, !!fromPos.root)}
                    fill="none" stroke="#AFC2DE" strokeWidth={2.5} strokeLinecap="round" />
                );
              })}
            </svg>
            {/* Nodes */}
            {Array.from(nodeMap.entries()).map(([nid, node]) => {
              const p = pos[nid];
              if (!p) return null;
              return <TreeNode key={nid} id={nid} node={node} pos={p} selected={selected === nid} onSelect={setSelected} />;
            })}
          </div>
          {/* Legend */}
          <div style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'none' }}>
            <div className="pill pill-neutral" style={{ fontSize: 12 }}>
              <Icon name="tree" size={14} /> Edit-history tree
            </div>
          </div>
          {/* Zoom controls */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <IconButton name="plus" onClick={() => setZoom(z => Math.min(1.6, z + 0.15))} title="Zoom in" />
            <IconButton name="minus" onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} title="Zoom out" />
            <IconButton name="refresh" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view" />
          </div>
        </div>
        {/* Detail panel */}
        {selectedNode && <DetailPanel node={selectedNode} nav={nav} />}
      </div>
    </div>
  );
}
