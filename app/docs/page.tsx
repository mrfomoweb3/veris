import type { Metadata } from 'next';
import { DocsPageClient } from '@/components/docs-page';

export const metadata: Metadata = {
  title: 'Docs — Veris',
  description: 'Everything you need to understand and build with Veris — decentralised provenance on Sui.',
};

export default function DocsPage() {
  return <DocsPageClient />;
}
