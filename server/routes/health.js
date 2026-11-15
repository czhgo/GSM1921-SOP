// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/health.js —— 两级健康检查（T2 · 六维补齐 M1「坏了能查」）
//
//  两级读口：
//   · **浅**：`GET /api/v1/health`（既有，`server/app.js` 行内；只回答「进程与依赖已加载」）；
//   · **深**：`GET /api/v1/health/deep`（本文件；库可读 / 迁移版本 / 备份目录可写）。
//
//  口径：
//   · 只读、无写门（GET），不返回任何密钥 / 路径 / 人名；
//   · 深检查任一项失败 ⇒ `ok:false` ＋ HTTP 503，供 systemd / 监控直接判可用性；
//   · 备份目录口径与 `server/scripts/backup.mjs` 默认输出一致（`server/backups/<时间戳>`），
//     可用 `backupDir` 选项覆盖（测试 / 演练用临时目录）。
// ════════════════════════════════════════════════════════════════
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 备份根目录（与 backup.mjs 缺省输出同源） */
export const DEFAULT_BACKUP_DIR = path.join(SERVER_DIR, 'backups');

/** 单项检查：抛错即失败；只回失败代码，不回路径细节 */
function runCheck(id, fn) {
  try {
    const detail = fn();
    const check = { id, ok: true };
    if (detail !== undefined) check.detail = detail;
    return check;
  } catch (e) {
    return { id, ok: false, error: e?.code || 'failed' };
  }
}

/**
 * 深检查（纯函数 + 文件系统探测；不做网络请求）。
 * @param {import('better-sqlite3').Database} db
 * @param {{backupDir?:string}} [options]
 */
export function deepHealth(db, { backupDir = DEFAULT_BACKUP_DIR } = {}) {
  let schemaVersion = null;
  const checks = [
    runCheck('db-read', () => {
      db.prepare('SELECT 1 AS ok').get();
    }),
    runCheck('schema-version', () => {
      schemaVersion = db.pragma('user_version', { simple: true });
      if (!(Number(schemaVersion) >= 1)) throw new Error('迁移尚未应用');
    }),
    runCheck('backup-dir-writable', () => {
      fs.mkdirSync(backupDir, { recursive: true });
      fs.accessSync(backupDir, fs.constants.W_OK);
    }),
  ];
  const ok = checks.every((check) => check.ok);
  return {
    ok,
    status: ok ? 'ok' : 'degraded',
    schemaVersion,
    checks,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * 深检查路由（挂载前缀 `/api/v1/health` ⇒ `GET /api/v1/health/deep`）。
 * @param {import('better-sqlite3').Database} db
 * @param {{backupDir?:string}} [options]
 */
export function createHealthRouter(db, options = {}) {
  const router = express.Router();
  router.get('/deep', (_req, res) => {
    const result = deepHealth(db, options);
    res.status(result.ok ? 200 : 503).json(result);
  });
  return router;
}
