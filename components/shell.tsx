'use client';
import React from 'react';
import { Logo, Icon } from './icons';
import { WalletChip } from './ui';
import type { Wallet } from '@/lib/data';

export type Route = 'landing' | 'dashboard' | 'register' | 'verify' | 'explorer' | 'mine' | 'detail' | 'lineage' | 'settings' | 'menu';

const NAV = [
  { id: 'dashboard', label: 'Home', icon: 'home' as const },
  { id: 'register', label: 'Register', icon: 'register' as const },
  { id: 'verify', label: 'Verify', icon: 'shieldCheck' as const },
  { id: 'explorer', label: 'Explorer', icon: 'grid' as const },
  { id: 'mine', label: 'My attestations', icon: 'layers' as const },
  { id: 'settings', label: 'Settings', icon: 'settings' as const },
];

const MOBILE_NAV = [
  { id: 'dashboard', label: 'Home', icon: 'home' as const },
  { id: 'register', label: 'Register', icon: 'register' as const },
  { id: 'verify', label: 'Verify', icon: 'shieldCheck' as const },
  { id: 'explorer', label: 'Explorer', icon: 'grid' as const },
];

function matchNav(route: Route): string {
  if (['dashboard', 'register', 'verify', 'explorer', 'mine', 'settings'].includes(route)) return route;
  if (route === 'detail' || route === 'lineage') return 'explorer';
  return route;
}

export function Sidebar({ route, nav }: { route: Route; nav: (to: Route) => void }) {
  const active = matchNav(route);
  return (
    <aside className="sidebar">
      <Logo onClick={() => nav('dashboard')} />
      <nav className="side-nav">
        {NAV.map(item => (
          <button key={item.id} className={'nav-item' + (active === item.id ? ' active' : '')} onClick={() => nav(item.id as Route)}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="spacer" />
      <button className="nav-item" onClick={() => nav('landing')}>
        <Icon name="logout" size={20} />
        <span>Disconnect</span>
      </button>
    </aside>
  );
}

export function TopBar({ title, wallet, nav, search, onSearch }: { title: string; wallet: Wallet; nav: (to: Route) => void; search?: string | false; onSearch?: (v: string) => void }) {
  return (
    <header className="topbar">
      <button className="icon-btn show-mobile" onClick={() => nav('menu')} title="Menu" style={{ marginRight: -6 }}>
        <Logo />
      </button>
      <h1 className="h2 hide-mobile" style={{ fontSize: 26 }}>{title}</h1>
      <div className="spacer" />
      {search !== false && (
        <div className="search-well hide-mobile" style={{ width: 280, maxWidth: '32vw' }}>
          <Icon name="search" size={18} />
          <input placeholder="Search registry…" value={search || ''} onChange={e => onSearch?.(e.target.value)} />
        </div>
      )}
      <WalletChip wallet={wallet} onClick={() => nav('settings')} />
    </header>
  );
}

export function MobileNav({ route, nav }: { route: Route; nav: (to: Route) => void }) {
  const active = matchNav(route);
  return (
    <nav className="mobile-nav">
      {MOBILE_NAV.map(item => (
        <button key={item.id} className={'mn-item' + (active === item.id ? ' active' : '')} onClick={() => nav(item.id as Route)}>
          <Icon name={item.icon} size={23} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export { NAV };
