'use client';
import { Docs } from './docs';
import type { Route } from './shell';

/**
 * Standalone wrapper for the /docs route.
 * nav and onConnect use window.location so the docs page works
 * as a real URL (veris-bay-five.vercel.app/docs) not just a SPA state.
 */
export function DocsPageClient() {
  const nav = (to: Route) => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const onConnect = (to?: Route) => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return <Docs nav={nav} onConnect={onConnect} />;
}
