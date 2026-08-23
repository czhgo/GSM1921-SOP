import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { createAuthRouter } from './routes/auth.js';
import { createResourcesRouter } from './routes/resources.js';
import { createUploadsRouter } from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../docs');

export function createApp({ dbPath = ':memory:' } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

  app.locals.db = initDb(dbPath);

  app.use('/api/v1/auth', createAuthRouter(app.locals.db));

  app.use('/api/v1', createResourcesRouter(app.locals.db));

  app.use('/api/v1', createUploadsRouter(app.locals.db));

  // 部署形态注入：server 模式下前端 deploy.js 应标记为 'server'（有后端，无「关于」门面）
  // 依据 content/04_web_design/DEPLOYMENT_AUTH_MODEL.md §六（构建时注入，非运行时探测）
  app.get('/src/config/deploy.js', (req, res) => {
    res.type('application/javascript').send('export const DEPLOY_MODE = "server";\n');
  });

  app.use(express.static(DOCS_DIR));

  // 统一 JSON 错误响应：multer 大小超限 → 413，其余 → 500（避免默认 HTML 错误页破坏 API 契约）
  // 2026-08-03（I2）：express.json 超限（2mb）抛出的 PayloadTooLargeError 自带 err.status=413，
  // 先前被误判为 500 —— 有 err.status 的（body-parser/multer 等）优先透传其状态码。
  app.use((err, req, res, next) => {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件超过大小限制' });
    }
    console.error('[server] 未处理错误:', err);
    res.status(500).json({ error: err.message || '服务器内部错误' });
  });

  return app;
}
