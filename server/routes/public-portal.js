// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/public-portal.js —— **未登录公共门厅只读接口**（2026-11-08 批次 536 · Task 6）
//
//  由来：未登录首页改为公共门厅（spec `add-committee-activities-and-public-portal`）需要一条
//    不含登录态的读通道，只暴露党委已发布、未过期、`publishScope='public'` 的内容。
//
//  ⚠ 安全边界（改之前先读）：
//    · **免登录**：不 import `requireAuth`，不读 session，不写 cookie；
//    · **白名单**：三类响应各由 `projectPublic*` 逐键构造，不展开原行；
//    · **fail-closed**：`publishExpiresAt` 缺失、非法或已过期 ⇒ 视为不公开；
//    · **统一 404**：不存在 / 非公开 / 已过期 / 无权一律同一响应体，不给探测差异；
//    · **下载**：`fileData`（base64 / data URL）优先；否则 `filePath` 必须落在上传根目录内，
//      路径规范化后越界一律 404；成功下载写 `publication_audits`（匿名）；
//    · **不缓存**：所有响应 `Cache-Control: no-store`。
//
//  路径（挂载点 `/api/public`，见 `server/app.js` 末尾）：
//    GET /portal · GET /notices/:id · GET /activities/:id
//    GET /documents/:id · GET /documents/:id/download
// ════════════════════════════════════════════════════════════════
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getRow, isPublicNow } from './resources/store.js';
import { writePublicationAudit } from './resources/publication-audit.js';
import { UPLOAD_DIR } from './uploads.js';
import { COMMITTEE_OWNER_ID } from '../../docs/src/core/domain/constants.js';

// ── 响应白名单（单一源；改这里必须同批改 server/test/public-portal-leak-guard.test.mjs）──
export const PUBLIC_ACTIVITY_FIELDS = Object.freeze([
  'id', 'title', 'type', 'date', 'location', 'publicSummary', 'publishExpiresAt',
]);
export const PUBLIC_NOTICE_FIELDS = Object.freeze([
  'id', 'title', 'content', 'priority', 'publishDate', 'publishExpiresAt',
]);
export const PUBLIC_DOCUMENT_FIELDS = Object.freeze([
  'id', 'title', 'summary', 'format', 'fileName', 'fileSize', 'updatedAt', 'publishExpiresAt', 'downloadUrl',
]);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const NOT_FOUND_BODY = Object.freeze({ error: 'not found' });

const DOCUMENT_DOWNLOAD_PATH = '/api/public/documents/';

// ── 下载限频（2026-11-08 波次 B · 进程内）──
// 同 IP 每 60 秒最多 `PUBLIC_DOWNLOAD_RATE_LIMIT` 次（默认 60；仅测试注入低阈值）。
// 超限 429 `{ error:'too many requests', retryAfterMs }`，且**不写**留痕、不读文件。
const DOWNLOAD_RATE_WINDOW_MS = 60_000;
const DOWNLOAD_RATE_DEFAULT = 60;
// 进程内 Map 必须有界：超过本上限时先清过期窗口、再按插入序淘汰最旧 IP（防伪造源地址把内存吃满）。
const DOWNLOAD_RATE_MAX_IPS = 2048;
/** ip ⇒ 窗口内命中时刻（毫秒） */
const downloadHits = new Map();
let downloadHitsPrunedAt = 0;

/** 清掉窗口外的命中与空队列（只保留仍在窗口内的 IP） */
function pruneDownloadHits(now) {
  for (const [ip, hits] of downloadHits) {
    const kept = hits.filter((ts) => now - ts < DOWNLOAD_RATE_WINDOW_MS);
    if (kept.length) downloadHits.set(ip, kept);
    else downloadHits.delete(ip);
  }
  downloadHitsPrunedAt = now;
}

function downloadRateLimit(req) {
  const raw = Number.parseInt(String(process.env.PUBLIC_DOWNLOAD_RATE_LIMIT ?? ''), 10);
  const max = Number.isFinite(raw) && raw > 0 ? raw : DOWNLOAD_RATE_DEFAULT;
  const now = Date.now();
  const ip = String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown');
  // 每个窗口清一次过期项（常态开销 O(IP 数)，不随请求数增长）
  if (now - downloadHitsPrunedAt >= DOWNLOAD_RATE_WINDOW_MS) pruneDownloadHits(now);
  const hits = (downloadHits.get(ip) || []).filter((ts) => now - ts < DOWNLOAD_RATE_WINDOW_MS);
  if (hits.length >= max) {
    downloadHits.set(ip, hits);
    return { retryAfterMs: Math.max(1, DOWNLOAD_RATE_WINDOW_MS - (now - hits[0])) };
  }
  hits.push(now);
  if (!downloadHits.has(ip) && downloadHits.size >= DOWNLOAD_RATE_MAX_IPS) {
    pruneDownloadHits(now);
    // 仍然满：淘汰最先插入的 IP（Map 保持插入序）
    while (downloadHits.size >= DOWNLOAD_RATE_MAX_IPS) {
      const oldest = downloadHits.keys().next().value;
      if (oldest === undefined) break;
      downloadHits.delete(oldest);
    }
  }
  downloadHits.set(ip, hits);
  return null;
}

/** 测试钩子（不改运行行为）：当前限频表规模 / 主动清理过期项 */
export const __downloadRateState = () => downloadHits.size;
export function __pruneDownloadRateHits(now = Date.now()) {
  pruneDownloadHits(now);
}

const CONTENT_TYPES = Object.freeze({
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  zip: 'application/zip',
});

const UPLOAD_ROOT = path.resolve(UPLOAD_DIR);
const UPLOAD_URL_BASE = '/api/v1/uploads/';

// 发布范围 public 且未过期：判定函数单一源在 `resources/store.js::isPublicNow`
// （登录态读口 `resources/branch-scope.js` 共用同一函数，杜绝「门厅已下架、登录列表仍可见」）。
// 多支部（批次 577 · `D-889` / `B-568-1` ③）：未带 `?branchId=` ⇒ 现行为（只党委内容，逐字节不变）；
// 带了支部 ⇒ 党委内容 ∪ 该支部 `public` 且未过期内容。
function isPublicNotice(row, now, branchId = null) {
  if (!isPublicNow(row, now)) return false;
  return row.branchId === COMMITTEE_OWNER_ID || (!!branchId && row.branchId === branchId);
}

function isPublicActivity(row, now, branchId = null) {
  if (!isPublicNow(row, now) || row.archived === true || row.status !== 'published') return false;
  if (row.ownerScope === 'committee') return true;
  return !!branchId && row.branchId === branchId;
}

function isPublicDocument(row, now, branchId = null) {
  if (!isPublicNow(row, now)) return false;
  return row.branchId === COMMITTEE_OWNER_ID || (!!branchId && row.branchId === branchId);
}

/** 时间戳（非法 / 缺失 ⇒ 0，排到末位；只影响展示顺序，不影响是否公开） */
function timeOf(value) {
  const ts = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(ts) ? ts : 0;
}

function sortDesc(rows, timeFn) {
  return rows.slice().sort((a, b) => timeFn(b) - timeFn(a));
}

function parseLimit(raw) {
  const n = Number.parseInt(String(raw === undefined ? '' : raw), 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, n));
}

function extOf(fileName) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(String(fileName || ''));
  return m ? m[1].toLowerCase() : '';
}

function documentUpdatedAt(row) {
  return row.updatedAt || row.uploadedAt || row.versionAt || null;
}

function documentSummary(row) {
  const text = row.summary ?? row.publicSummary ?? row.desc;
  return typeof text === 'string' ? text : '';
}

function documentDownloadUrl(id) {
  return `${DOCUMENT_DOWNLOAD_PATH}${encodeURIComponent(String(id))}/download`;
}

/** 有可下发附件吗（能解码的 fileData 或非空 filePath）——无附件不给下载链，避免出现必然 404 的入口 */
function hasDownloadableFile(row) {
  if (!row || typeof row !== 'object') return false;
  if (decodeFileData(row.fileData)) return true;
  return typeof row.filePath === 'string' && row.filePath.trim() !== '';
}

// ── 列表 SQL 投影（2026-11-19 · `D-882`）────────────────────────────────
// 病例：`/portal` 原用 `listTable` 全表 JSON 解析，`branch_docs` 的 `fileData`（base64 / data URL）
//   随每次列表读进入 Node 内存；资料一多即整表搬运。改为 SQL 侧只取白名单键，
//   `fileData` 只算「是否可下载」布尔（`fileDataOk`），正文 `bodyText` 只走单条详情。
// 边界：宽表仍是 `id + data(JSON)`，DB 层仍逐行读 JSON；列式下推需 `MIGRATIONS v2`（`L-17`）。
const LIST_PROJECTION = Object.freeze({
  notices: ['id', 'title', 'content', 'priority', 'publishDate', 'publishExpiresAt', 'publishScope', 'branchId'],
  activities: ['id', 'title', 'type', 'date', 'location', 'publicSummary', 'publishExpiresAt', 'publishScope', 'ownerScope', 'archived', 'status'],
  branch_docs: ['id', 'title', 'summary', 'publicSummary', 'desc', 'format', 'fileName', 'fileSize',
    'updatedAt', 'uploadedAt', 'versionAt', 'publishExpiresAt', 'publishScope', 'branchId', 'filePath'],
});

/** `fileData` 可下载性（与 `decodeFileData` 同口径的 SQL 近似：data URL，或 base64 字符集且非空） */
const FILE_DATA_OK_SQL = `CASE
  WHEN json_extract(data, '$.fileData') IS NULL THEN 0
  WHEN trim(json_extract(data, '$.fileData')) = '' THEN 0
  WHEN json_extract(data, '$.fileData') LIKE 'data:%' AND instr(json_extract(data, '$.fileData'), ',') > 0 THEN 1
  WHEN json_extract(data, '$.fileData') NOT GLOB '*[^A-Za-z0-9+/=' || char(9) || char(10) || char(13) || ' ]*'
    AND length(trim(json_extract(data, '$.fileData'))) >= 8 THEN 1
  ELSE 0 END AS "fileDataOk"`;

function listPublicProjected(db, table) {
  const cols = LIST_PROJECTION[table].map((key) => `json_extract(data, '$.${key}') AS "${key}"`).join(', ');
  const extra = table === 'branch_docs' ? `, ${FILE_DATA_OK_SQL}` : '';
  return db.prepare(`SELECT ${cols}${extra} FROM ${table}`).all();
}

// ── 响应投影（逐键白名单；导出供静态守卫直接喂「毒行」验证不漏字段）──────────
export function projectPublicActivity(row) {
  return {
    id: row.id,
    title: row.title ?? null,
    type: row.type ?? null,
    date: row.date ?? null,
    location: row.location ?? null,
    publicSummary: row.publicSummary ?? null,
    publishExpiresAt: row.publishExpiresAt ?? null,
  };
}

export function projectPublicNotice(row) {
  return {
    id: row.id,
    title: row.title ?? null,
    content: row.content ?? null,
    priority: row.priority ?? null,
    publishDate: row.publishDate ?? null,
    publishExpiresAt: row.publishExpiresAt ?? null,
  };
}

export function projectPublicDocument(row, opts = {}) {
  const downloadable = opts.fileDataDownloadable === undefined
    ? hasDownloadableFile(row)
    : (opts.fileDataDownloadable === true || (typeof row.filePath === 'string' && row.filePath.trim() !== ''));
  return {
    id: row.id,
    title: row.title ?? null,
    summary: documentSummary(row),
    format: row.format || extOf(row.fileName),
    fileName: row.fileName || '',
    fileSize: row.fileSize ?? null,
    updatedAt: documentUpdatedAt(row),
    publishExpiresAt: row.publishExpiresAt ?? null,
    // 批次 541：无附件不出下载链（键保留、值置 null；有附件才由服务端计算地址，不取原行）
    downloadUrl: downloadable ? documentDownloadUrl(row.id) : null,
  };
}

// ── 下载：附件解码与路径安全 ────────────────────────────────────────────
/** data URL（`data:<mime>;base64,<payload>`）或纯 base64 ⇒ Buffer；无法解码返回 null */
function decodeFileData(fileData) {
  if (typeof fileData !== 'string' || !fileData.trim()) return null;
  const raw = fileData.trim();
  const dataUrl = /^data:([^,]*),(.*)$/s.exec(raw);
  if (dataUrl) {
    const meta = dataUrl[1] || '';
    const isBase64 = /;base64$/i.test(meta);
    const mime = meta.replace(/;base64$/i, '').trim();
    try {
      const buffer = isBase64
        ? Buffer.from(dataUrl[2], 'base64')
        : Buffer.from(decodeURIComponent(dataUrl[2]), 'utf8');
      return buffer.length ? { buffer, mime } : null;
    } catch {
      return null;
    }
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) return null;
  const buffer = Buffer.from(raw, 'base64');
  return buffer.length ? { buffer, mime: '' } : null;
}

/**
 * `filePath` ⇒ 上传根目录内的绝对路径；越界 / 可疑形状一律 null。
 * 接受三种存法：`/api/v1/uploads/<name>`（现行）、相对名、以及根目录内的绝对路径。
 */
function resolveUploadFilePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return null;
  const raw = filePath.trim();
  let rel;
  if (raw.startsWith(UPLOAD_URL_BASE)) {
    rel = raw.slice(UPLOAD_URL_BASE.length);
  } else if (path.isAbsolute(raw)) {
    rel = path.relative(UPLOAD_ROOT, path.resolve(raw));
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  } else {
    rel = raw;
  }
  // 任何 `..` 段都拒绝（规范化前先判，避免依赖 resolve 的副作用）
  if (rel.split(/[\\/]+/).some((seg) => seg === '..')) return null;
  const full = path.resolve(UPLOAD_ROOT, rel);
  if (full !== UPLOAD_ROOT && !full.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return full;
}

function safeDownloadName(row) {
  const raw = String(row.fileName || row.title || 'download');
  const base = path.basename(raw).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return base || 'download';
}

function contentDisposition(fileName) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function contentTypeOf(row, override) {
  if (override) return override;
  const format = String(row.format || extOf(row.fileName)).replace(/^\./, '').toLowerCase();
  return CONTENT_TYPES[format] || 'application/octet-stream';
}

function readRow(db, table, id) {
  try {
    return getRow(db, table, id);
  } catch {
    return null;
  }
}

export function createPublicPortalRouter(db) {
  const router = express.Router();

  const notFound = (res) => res.status(404).json(NOT_FOUND_BODY);
  // 可选支部维度（批次 577）：只在显式带 `?branchId=` 时生效；缺省完全保持「只党委内容」
  const branchQueryOf = (req) => (typeof req.query.branchId === 'string' && req.query.branchId ? req.query.branchId : null);

  router.get('/portal', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const now = Date.now();
    const limit = parseLimit(req.query.limit);

    const noticeRows = sortDesc(
      listPublicProjected(db, 'notices').filter((row) => isPublicNotice(row, now, branchQueryOf(req))),
      (row) => timeOf(row.publishDate),
    );
    const notices = noticeRows.slice(0, limit).map(projectPublicNotice);

    // `json_extract` 把 JSON 布尔取成 1/0 ⇒ 归一回 boolean，保证 `isPublicActivity` 的 `!== true` 判据不变。
    const activityRows = sortDesc(
      listPublicProjected(db, 'activities')
        .map((row) => ({ ...row, archived: row.archived === 1 || row.archived === true }))
        .filter((row) => isPublicActivity(row, now, branchQueryOf(req))),
      (row) => timeOf(row.date),
    );
    const activities = activityRows.slice(0, limit).map(projectPublicActivity);

    const documentRows = sortDesc(
      listPublicProjected(db, 'branch_docs').filter((row) => isPublicDocument(row, now, branchQueryOf(req))),
      (row) => timeOf(documentUpdatedAt(row)),
    );
    const documents = documentRows.slice(0, limit)
      .map((row) => projectPublicDocument(row, { fileDataDownloadable: Number(row.fileDataOk) === 1 }));

    // 截断提示（批次 562 · Task 10）：任一块被 limit 截掉即 hasMore=true；既有字段形状不变。
    const hasMore = noticeRows.length > notices.length
      || activityRows.length > activities.length
      || documentRows.length > documents.length;

    res.json({ notices, activities, documents, hasMore });
  });

  router.get('/notices/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const row = readRow(db, 'notices', req.params.id);
    if (!isPublicNotice(row, Date.now(), branchQueryOf(req))) return notFound(res);
    res.json(projectPublicNotice(row));
  });

  router.get('/activities/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const row = readRow(db, 'activities', req.params.id);
    if (!isPublicActivity(row, Date.now(), branchQueryOf(req))) return notFound(res);
    res.json(projectPublicActivity(row));
  });

  router.get('/documents/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const row = readRow(db, 'branch_docs', req.params.id);
    if (!isPublicDocument(row, Date.now(), branchQueryOf(req))) return notFound(res);
    res.json({
      ...projectPublicDocument(row),
      bodyText: typeof row.bodyText === 'string' ? row.bodyText : '',
    });
  });

  router.get('/documents/:id/download', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const limited = downloadRateLimit(req);
    if (limited) {
      res.setHeader('Retry-After', String(Math.ceil(limited.retryAfterMs / 1000)));
      return res.status(429).json({ error: 'too many requests', retryAfterMs: limited.retryAfterMs });
    }
    const row = readRow(db, 'branch_docs', req.params.id);
    if (!isPublicDocument(row, Date.now(), branchQueryOf(req))) return notFound(res);

    const fileName = safeDownloadName(row);
    const disposition = contentDisposition(fileName);

    // ① fileData（base64 / data URL）优先
    const decoded = decodeFileData(row.fileData);
    if (decoded) {
      writePublicationAudit(db, {
        resourceType: 'document',
        resourceId: row.id,
        action: 'download',
        actor: null,
        anonymous: true,
      });
      res.setHeader('Content-Type', contentTypeOf(row, decoded.mime));
      res.setHeader('Content-Disposition', disposition);
      return res.send(decoded.buffer);
    }

    // ② filePath（必须落在上传根目录内）
    const fullPath = resolveUploadFilePath(row.filePath);
    if (!fullPath) return notFound(res);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      return notFound(res);
    }
    if (!stat.isFile()) return notFound(res);

    writePublicationAudit(db, {
      resourceType: 'document',
      resourceId: row.id,
      action: 'download',
      actor: null,
      anonymous: true,
    });
    return res.sendFile(fullPath, {
      headers: {
        'Content-Type': contentTypeOf(row),
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    }, (err) => {
      if (err && !res.headersSent) notFound(res);
    });
  });

  return router;
}
