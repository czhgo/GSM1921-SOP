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
//
//  T3（2026-11-15）在本文件追加两个只读件，**不改既有 `/deep` 响应字段形状**：
//   · `GET /api/v1/health/metrics` —— 最小指标集（请求总数 / 5xx / 平均耗时 / 最近备份时间 / 深检查状态）；
//   · `latestBackupAt()` —— 现扫备份目录取最近一次备份时间（备份脚本是独立进程，只能从磁盘读事实）；
//   · `monitor` 选项：注入 `services/health-alerts.js` 的监视器时，`/deep` 由它评估并在状态翻转时告警。
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
 * 最近一次备份时间（ISO）：现扫备份目录取最新修改项；目录不存在 / 为空 ⇒ null。
 * 备份脚本（`scripts/backup.mjs`）是独立进程，运行中的服务只能从磁盘读这个事实。
 */
export function latestBackupAt(backupDir = DEFAULT_BACKUP_DIR) {
  try {
    let latest = 0;
    for (const name of fs.readdirSync(backupDir)) {
      const stat = fs.statSync(path.join(backupDir, name));
      if (stat.mtimeMs > latest) latest = stat.mtimeMs;
    }
    return latest ? new Date(latest).toISOString() : null;
  } catch (_) {
    return null;
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
    lastBackupAt: latestBackupAt(backupDir),
    checkedAt: new Date().toISOString(),
  };
}

/**
 * 深 / 指标两个只读路由（挂载前缀 `/api/v1/health`）。
 * @param {import('better-sqlite3').Database} db
 * @param {{backupDir?:string, monitor?:{evaluate:()=>object}, metrics?:object}} [options]
 *   `monitor` 由 `services/health-alerts.js` 提供：评估深检查并在状态翻转时发站内通知 ＋ 邮件。
 */
export function createHealthRouter(db, options = {}) {
  const { monitor = null, metrics = null, backupDir = DEFAULT_BACKUP_DIR } = options;
  const router = express.Router();
  router.get('/deep', (_req, res) => {
    let result;
    if (monitor) {
      result = monitor.evaluate();
    } else {
      result = deepHealth(db, { backupDir });
      metrics?.recordDeepHealth(result);
      metrics?.recordBackupAt(result.lastBackupAt);
    }
    res.status(result.ok ? 200 : 503).json(result);
  });
  router.get('/metrics', (_req, res) => {
    const snapshot = metrics?.snapshot() || {
      ok: true,
      requests: { total: 0, serverErrors: 0, avgDurationMs: 0 },
      deepHealth: { status: 'unknown', checkedAt: null, failedChecks: [] },
      lastBackupAt: null,
    };
    res.json({ ...snapshot, lastBackupAt: latestBackupAt(backupDir) });
  });
  return router;
}
