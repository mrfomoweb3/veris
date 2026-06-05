'use client';
import React, { useState, useCallback } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Logo, Icon } from './icons';
import { Sidebar, TopBar, MobileNav, NAV, type Route } from './shell';
import { Button, IconButton, Switch, LV, CopyId, StatusPill } from './ui';
import { ConnectModal as SuietConnectModal } from '@suiet/wallet-kit';
import { Landing } from './landing';
import { Dashboard } from './dashboard';
import { Register } from './register';
import { Verify } from './verify';
import { Explorer } from './explorer';
import { AttestationDetail } from './detail';
import { Lineage } from './lineage';
import { WALLETS, truncate } from '@/lib/data';

const TITLES: Record<string, string> = {
  dashboard: 'Home', register: 'Register', verify: 'Verify', explorer: 'Explorer',
  mine: 'My attestations', settings: 'Settings', detail: 'Attestation', lineage: 'Provenance',
};

// ---------- Settings ----------
function Settings({ nav, wallet }: { nav: (to: Route) => void; wallet: typeof WALLETS.me }) {
  const [pub, setPub] = useState(true);
  const [notif, setNotif] = useState(true);
  const [screen, setScreen] = useState(true);
  return (
    <div className="page-wrap screen" style={{ maxWidth: 720 }}>
      <div className="h2 show-mobile" style={{ marginBottom: 18 }}>Settings</div>
      <div className="neo-card" style={{ padding: 26, marginBottom: 20 }}>
        <div className="row g3 wrap" style={{ alignItems: 'center' }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6fa0ff,#244577)', boxShadow: 'var(--inset-sm)', flexShrink: 0, display: 'inline-block' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h3">Connected wallet</div>
            <div className="mono-id" style={{ marginTop: 2 }}>{truncate(wallet.addr, 10, 6)}</div>
          </div>
          <div className="row g1">
            <span className="pill pill-neutral">{wallet.wal} WAL</span>
            <span className="pill pill-neutral">{wallet.sui} SUI</span>
          </div>
        </div>
        <div className="divider" style={{ margin: '20px 0' }} />
        <LV k="Network"><span className="row g1"><span className="mainnet-dot" /> Sui Mainnet</span></LV>
        <LV k="Address"><CopyId value={wallet.addr} /></LV>
      </div>
      <div className="neo-card" style={{ padding: 26 }}>
        <div className="h3" style={{ marginBottom: 8 }}>Preferences</div>
        {([
          ['Default to public attestations', pub, setPub],
          ['Email me on new verifications', notif, setNotif],
          ['Screen registrant addresses (Tatum)', screen, setScreen],
        ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
          <div key={label} className="row between" style={{ padding: '16px 0', borderBottom: '1px solid rgba(126,147,184,.13)' }}>
            <span style={{ color: 'var(--navy-900)', fontWeight: 500 }}>{label}</span>
            <Switch on={val} onChange={set} />
          </div>
        ))}
        <div style={{ marginTop: 22 }}>
          <Button variant="secondary" icon="logout" onClick={() => nav('landing')}>Disconnect wallet</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Mobile menu sheet ----------
function MobileMenu({ nav, close }: { nav: (to: Route) => void; close: () => void }) {
  return (
    <div className="overlay" onClick={close} style={{ alignItems: 'flex-start', paddingTop: 70 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="neo-card" style={{ padding: 22 }}>
          <div className="row between" style={{ marginBottom: 16 }}>
            <Logo />
            <IconButton name="close" size="sm" onClick={close} />
          </div>
          <div className="col g1">
            {NAV.map(item => (
              <button key={item.id} className="nav-item" onClick={() => { nav(item.id as Route); close(); }}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <button className="nav-item" onClick={() => { nav('landing'); close(); }}>
            <Icon name="logout" size={20} />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main app ----------
export function VerisApp() {
  const { connected, address, disconnect } = useWallet();
  const [route, setRoute] = useState<Route>('landing');
  const [params, setParams] = useState<Record<string, string>>({});
  const [connect, setConnect] = useState(false);
  const [connectTo, setConnectTo] = useState<Route>('dashboard');
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');

  // Use real wallet address when connected, fall back to demo wallet
  const wallet = connected && address
    ? { addr: address, name: truncate(address, 6, 4), wal: '--', sui: '--' }
    : WALLETS.me;

  const nav = useCallback((to: Route, p: Record<string, string> = {}) => {
    if (to === 'menu') { setMenu(true); return; }
    // Disconnect wallet when explicitly navigating back to landing (logout)
    if (to === 'landing' && connected) { disconnect().catch(() => {}); }
    setRoute(to);
    setParams(p);
    setMenu(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, [connected, disconnect]);

  const openConnect = (to: Route = 'dashboard') => { setConnectTo(to); setConnect(true); };
  const doConnect = () => { setConnect(false); nav(connectTo); };

  // Landing (no shell)
  // Suiet ConnectModal — rendered at root so it layers over any screen.
  // open=false means nothing is visible; the portal only activates when open=true.
  const suietModal = (
    <SuietConnectModal
      open={connect}
      onOpenChange={(open) => { if (!open) setConnect(false); }}
      onConnectSuccess={() => { setConnect(false); nav(connectTo); }}
    />
  );

  if (route === 'landing') {
    return (
      <>
        <Landing nav={nav} onConnect={to => openConnect((to as Route) || 'dashboard')} />
        {suietModal}
      </>
    );
  }

  // App shell
  let body: React.ReactNode;
  if (route === 'dashboard') body = <Dashboard nav={nav} />;
  else if (route === 'register') body = <Register nav={nav} />;
  else if (route === 'verify') body = <Verify nav={nav} />;
  else if (route === 'explorer') body = <Explorer nav={nav} search={search} />;
  else if (route === 'mine') body = <Explorer nav={nav} mineOnly />;
  else if (route === 'detail') body = <AttestationDetail nav={nav} id={params.id} />;
  else if (route === 'lineage') body = <Lineage nav={nav} id={params.id} />;
  else if (route === 'settings') body = <Settings nav={nav} wallet={wallet} />;
  else body = <Dashboard nav={nav} />;

  return (
    <>
      <div className="app-shell">
        <Sidebar route={route} nav={nav} />
        <div className="main-area">
          <TopBar
            title={TITLES[route] || 'Veris'}
            wallet={wallet}
            nav={nav}
            search={route === 'explorer' ? search : false}
            onSearch={setSearch}
          />
          <div className="page-body">{body}</div>
        </div>
        <MobileNav route={route} nav={nav} />
        {menu && <MobileMenu nav={nav} close={() => setMenu(false)} />}
      </div>
      {suietModal}
    </>
  );
}
