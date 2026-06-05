'use client';
import dynamic from 'next/dynamic';

// ssr:false must be declared inside a Client Component.
// Suiet Wallet Kit (React 18-targeted) must not run on the server.
const VerisApp = dynamic(
  () => import('./veris-app').then(m => ({ default: m.VerisApp })),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: '100vh', background: 'var(--base)' }} />
    ),
  },
);

export function ClientApp() {
  return <VerisApp />;
}
