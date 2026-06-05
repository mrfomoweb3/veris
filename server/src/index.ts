/**
 * Veris backend entry point
 * Hono + @hono/node-server
 */
import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { api } from './routes.js';

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

app.use('*', cors({
  origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
}));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use('*', logger());

// ── Routes ────────────────────────────────────────────────────────────────────
app.route('/api', api);

// Root liveness probe
app.get('/', (c) => c.json({ service: 'veris-backend', version: '0.1.0' }));

// ── Boot ──────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '8787', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n🟢  Veris backend listening on http://localhost:${info.port}`);
  console.log(`    Network : ${process.env.SUI_NETWORK ?? 'mainnet'}`);
  console.log(`    Tatum RPC: ${process.env.TATUM_SUI_RPC ?? '(not set)'}`);
  console.log(`    Walrus  : ${process.env.WALRUS_PUBLISHER ?? '(not set)'}`);
  console.log(`    Frontend: ${process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'}\n`);
});
