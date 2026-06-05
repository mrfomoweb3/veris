import type { Metadata } from 'next';
import './globals.css';
import '@suiet/wallet-kit/style.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Veris — Prove what\'s real, permanently',
  description: 'Decentralized provenance for the AI era. Store originals on Walrus, anchor them on Sui.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <div id="root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
