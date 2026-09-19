// server/routes/uploads.js — 附件上传（multer）+ 受保护静态下载
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireCommissioner } from './auth.js';
// 党委角色单一源（勿手写）：下载做支部隔离时，党委（组织级、不属任何支部）跨支部可见
import { PARTY_STAFF_ROLE as PARTY_STAFF_KEYS } from '../../docs/src/core/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 上传目录（2026-09-18 批次 80 · P1-③）：可由 env UPLOAD_DIR 配置；缺省值不变＝server/uploads。
// 相对路径按进程启动目录解析（与 DB_PATH 同口径）；目录不存在时启动即建。
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 按下载路径（如 /api/v1/uploads/xxx.pdf）删除物理文件；仅删 basename，杜绝路径穿越
export function deleteUploadedFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return;
  const name = path.basename(filePath);
  if (!name || name === '.' || name === '..') return;
  const full = path.join(UPLOAD_DIR, name);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.warn('[uploads] 物理文件删除失败：', e);
  }
}

// 文件名编码还原（2026-09-18 批次 80 · 修 P0-①）：
// multer 1.x（busboy）按 latin1 解 multipart 文件名 ⇒ 中文名回读成「æµè¯ç§ç.png」。
// 此处按 latin1→utf8 还原；纯 ASCII 名不变；转换后出现替换字符 U+FFFD ⇒ 原名并非 latin1 误解码，原样返回。
function decodeOriginalName(name) {
  if (typeof name !== 'string' || !name) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

// 允许上传的类型（与前端两处 accept 严格对齐；2026-09-18 批次 80 支书裁定「要收视频」）：
//  · jpg/png/pdf/docx/xlsx —— 原有五类（docx＝Word、xlsx＝Excel 的现行格式）；
//  · doc（application/msword）—— 材料标准「新闻稿：Word + PDF 双格式」，而系统自带的新闻稿模板
//    就是 .doc（docs/src/entries/tabs/prop/archive-tab.js:367）⇒ 下载模板填完须能传回；
//  · mp4（video/mp4）—— 材料标准视频一条明写「MP4 格式」（archive-tab.js:48）。
// 不放：.xls（材料标准无此要求，两份 Excel 模板实为 CSV 下载，archive-tab.js:372）· .mov（材料标准只写 MP4）。
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc', 'video/mp4': '.mp4' };
const MAX_SIZE = 10 * 1024 * 1024; // 10MB（spec §12 决策）

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${randomUUID()}${ALLOWED[file.mimetype] || ''}`),
});
const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter: (req, file, cb) => {
  cb(null, Boolean(ALLOWED[file.mimetype]));
} });

const PARTY_STAFF_ROLE_SET = new Set(PARTY_STAFF_KEYS);

export function createUploadsRouter(db) {
  const router = Router();

  // 上传写口（2026-09-18 批次 80 · 风险-⑤ 收紧）：原仅 requireAuth ⇒ 任一登录成员可上传。
  // 现按既有附件写口口径收（COMMISSIONER_WRITE，server/routes/resources.js:196 的同一支委门）＝支委层。
  router.post('/uploads', requireCommissioner(db), upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '文件类型不支持或为空' });
    const meta = {
      id: randomUUID(),
      filename: decodeOriginalName(req.file.originalname),
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

  // 受保护静态访问：仅登录用户可下载 + 支部隔离（2026-09-18 批次 80 · 风险-⑤）。
  // 附件表无支部字段，故按「上传人所属支部」判（users.branchId，缺省 'br-b1'，与 resources.js 同口径）；
  // 党委（party-staff，组织级、不属任何支部）跨支部可见。无该附件记录 → 404。
  router.get('/uploads/:name', requireAuth(db), (req, res) => {
    const safe = path.basename(req.params.name);
    const rel = `/api/v1/uploads/${safe}`;
    const row = db.prepare('SELECT uploaded_by FROM attachments WHERE path = ?').get(rel);
    if (!row) return res.status(404).json({ error: '附件不存在' });
    const actor = req.actor;
    if (!PARTY_STAFF_ROLE_SET.has(actor.role)) {
      const ownerRow = db.prepare('SELECT data FROM users WHERE id = ?').get(row.uploaded_by);
      const ownerBranch = (ownerRow ? JSON.parse(ownerRow.data).branchId : null) || 'br-b1';
      const actorBranch = actor.branchId || 'br-b1';
      if (ownerBranch !== actorBranch) return res.status(403).json({ error: '无权限：该附件不属于本支部' });
    }
    res.sendFile(path.join(UPLOAD_DIR, safe));
  });

  return router;
}
