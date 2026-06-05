'use client';
import React, { useState, useEffect } from 'react';
import { WalletProvider } from '@suiet/wallet-kit';

/**
 * WalletProvider is React 18-targeted and must not be server-rendered.
 * We guard with a mounted flag so it only activates after hydration.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  return (
    <WalletProvider autoConnect={false}>
      {children}
    </WalletProvider>
  );
}
