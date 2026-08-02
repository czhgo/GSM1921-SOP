// server/routes/uploads.js — 附件上传（multer）+ 受保护静态下载
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx' };
const MAX_SIZE = 10 * 1024 * 1024; // 10MB（spec §12 决策）

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${randomUUID()}${ALLOWED[file.mimetype] || ''}`),
});
const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter: (req, file, cb) => {
  cb(null, Boolean(ALLOWED[file.mimetype]));
} });

export function createUploadsRouter(db) {
  const router = Router();

  router.post('/uploads', requireAuth(db), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '文件类型不支持或为空' });
    const meta = {
      id: randomUUID(),
      filename: req.file.originalname,
      // 2026-08-03（I1）：与真实下载路由一致（下载为 /api/v1/uploads/:name）
      path: `/api/v1/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedBy: req.session.person_id,
      uploadedAt: new Date().toISOString(),
    };
    db.prepare('INSERT INTO attachments (id, filename, path, size, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(meta.id, meta.filename, meta.path, meta.size, meta.uploadedBy, meta.uploadedAt);
    res.status(201).json(meta);
  });

  // 受保护静态访问：仅登录用户可下载附件
  router.get('/uploads/:name', requireAuth(db), (req, res) => {
    const safe = path.basename(req.params.name);
    res.sendFile(path.join(UPLOAD_DIR, safe));
  });

  return router;
}
