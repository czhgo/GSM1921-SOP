import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../docs');

export function createApp({ dbPath = ':memory:' } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

  app.locals.db = initDb(dbPath);

  app.use(express.static(DOCS_DIR));

  return app;
}
