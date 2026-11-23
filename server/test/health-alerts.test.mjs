// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/health-alerts.test.mjs —— T3 健康检查页数据面 ＋ 指标 ＋ 告警
//
//  判据（对应 `历史 spec（已删）` T3）：
//   · 深检查成功 ⇒ 200 ok；指标端点给出请求总数 / 5xx / 平均耗时 / 最近备份时间 / 深检查状态；
//   · 备份目录不可写 ⇒ 深检查 503 degraded，并落一条站内告警 ＋ 发一封邮件；
//   · 同一故障 30 分钟内只告警一次（含进程重启后按 `notices.createdAt` 去重）；
//   · 恢复时发一条恢复通知，再检查不重复发。
//  纯 node：`:memory:` 库 ＋ 临时目录，不连 3000。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createApp } from '../app.js';
import { initDb } from '../db.js';
import { createHealthRouter } from '../routes/health.js';
import { createHealthMonitor, ALERT_THROTTLE_MS } from '../services/health-alerts.js';
import { createMetrics } from '../services/metrics.js';

const MINUTE = 60 * 1000;

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    server.once('listening', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
    server.once('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    try { server.closeAllConnections?.(); } catch (_) { /* 老版本无此 API */ }
    server.close(() => resolve());
  });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

/** 临时目录；`blocked=true` 时返回一个「父路径是文件」的不可写备份目录 */
function tempBackupDir({ blocked = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'gsm1921-alert-'));
  if (!blocked) return { dir, backupDir: join(dir, 'backups'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  const blocker = join(dir, 'not-a-dir');
  writeFileSync(blocker, 'x');
  return {
    dir,
    blocker,
    backupDir: join(blocker, 'backups'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** 建库并放一个带邮箱的支书（邮件收件人来源＝成员档案 email） */
function makeDb() {
  const db = initDb(':memory:');
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(
    'u-secretary',
    JSON.stringify({ id: 'u-secretary', name: '支书', role: 'secretary', email: 'secretary@example.com' }),
  );
  return db;
}

/** `notices` 表里某 systemKind 的行（运维通知留痕） */
function noticesOf(db, systemKind) {
  return db.prepare('SELECT data FROM notices').all()
    .map((row) => JSON.parse(row.data))
    .filter((n) => n.systemKind === systemKind);
}

test('深检查成功：200 ok；指标端点给出请求数 / 5xx / 平均耗时 / 深检查状态', async () => {
  const app = createApp({ dbPath: ':memory:' });
  const { server, base } = await listen(app);
  try {
    const deepRes = await fetch(`${base}/api/v1/health/deep`);
    assert.equal(deepRes.status, 200);
    const deep = await deepRes.json();
    assert.equal(deep.ok, true);
    assert.equal(deep.status, 'ok');
    assert.deepEqual(deep.checks.map((c) => c.id), ['db-read', 'schema-version', 'backup-dir-writable']);
    assert.ok('lastBackupAt' in deep, '深检查须给出最近备份时间（无备份为 null）');

    await flush();
    const metricsRes = await fetch(`${base}/api/v1/health/metrics`);
    assert.equal(metricsRes.status, 200);
    const metrics = await metricsRes.json();
    assert.equal(metrics.ok, true);
    assert.ok(metrics.requests.total >= 1, `指标未统计到 API 请求（total=${metrics.requests.total}）`);
    assert.equal(metrics.requests.serverErrors, 0);
    assert.ok(Number.isFinite(metrics.requests.avgDurationMs) && metrics.requests.avgDurationMs >= 0);
    assert.equal(metrics.deepHealth.status, 'ok');
    assert.deepEqual(metrics.deepHealth.failedChecks, []);
    assert.ok('lastBackupAt' in metrics);
  } finally {
    await closeServer(server);
    app.locals.db.close();
  }
});

test('深检查失败：备份目录不可写 ⇒ 503 degraded，落一条告警 ＋ 一封邮件', async () => {
  const db = makeDb();
  const { backupDir, cleanup } = tempBackupDir({ blocked: true });
  const mails = [];
  const metrics = createMetrics();
  const monitor = createHealthMonitor({
    db,
    backupDir,
    metrics,
    mailer: { sendMail: (msg) => { mails.push(msg); return { ok: true }; } },
    now: () => Date.parse('2026-11-15T10:00:00.000Z'),
  });
  const mini = express();
  mini.use('/api/v1/health', createHealthRouter(db, { backupDir, monitor, metrics }));
  const { server, base } = await listen(mini);
  try {
    const res = await fetch(`${base}/api/v1/health/deep`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, 'degraded');
    assert.equal(body.checks.find((c) => c.id === 'backup-dir-writable').ok, false);

    const alerts = noticesOf(db, 'ops-health-alert');
    assert.equal(alerts.length, 1, '深检查失败必须落一条站内告警');
    assert.deepEqual(alerts[0].audience, ['secretary', 'deputy-secretary']);
    assert.equal(mails.length, 1, '深检查失败必须发一封邮件');
    assert.deepEqual(mails[0].to, ['secretary@example.com']);

    const metrics = await (await fetch(`${base}/api/v1/health/metrics`)).json();
    assert.equal(metrics.deepHealth.status, 'degraded');
    assert.deepEqual(metrics.deepHealth.failedChecks, ['backup-dir-writable']);
  } finally {
    await closeServer(server);
    db.close();
    cleanup();
  }
});

test('告警去重：同一故障 30 分钟内只一条（进程重启后按 notices.createdAt 仍然生效）', () => {
  const db = makeDb();
  const { backupDir, cleanup } = tempBackupDir({ blocked: true });
  let clock = Date.parse('2026-11-15T10:00:00.000Z');
  const mails = [];
  const mailer = { sendMail: (msg) => { mails.push(msg); return { ok: true }; } };
  try {
    const first = createHealthMonitor({ db, backupDir, mailer, now: () => clock });
    assert.equal(first.evaluate().ok, false);
    assert.equal(noticesOf(db, 'ops-health-alert').length, 1);

    // 同一进程持续失败：不是状态翻转 ⇒ 不再告警
    clock += 5 * MINUTE;
    assert.equal(first.evaluate().ok, false);
    assert.equal(noticesOf(db, 'ops-health-alert').length, 1);

    // 模拟进程重启（新监视器不知道旧状态）：10 分钟后仍在 30 分钟窗内 ⇒ 仍只一条
    clock += 5 * MINUTE;
    const second = createHealthMonitor({ db, backupDir, mailer, now: () => clock });
    assert.equal(second.evaluate().ok, false);
    assert.equal(noticesOf(db, 'ops-health-alert').length, 1, '30 分钟内同一故障重复告警');

    // 越过节流窗（30 分钟整）⇒ 允许再告警一次
    clock += ALERT_THROTTLE_MS;
    const third = createHealthMonitor({ db, backupDir, mailer, now: () => clock });
    assert.equal(third.evaluate().ok, false);
    assert.equal(noticesOf(db, 'ops-health-alert').length, 2, '超过 30 分钟后应允许再次告警');
    assert.equal(mails.length, 2);
  } finally {
    db.close();
    cleanup();
  }
});

test('恢复通知：failed → ok 发一条恢复；再检查不重复', () => {
  const db = makeDb();
  const broken = tempBackupDir({ blocked: true });
  let clock = Date.parse('2026-11-15T10:00:00.000Z');
  const mails = [];
  const mailer = { sendMail: (msg) => { mails.push(msg); return { ok: true }; } };
  const monitor = createHealthMonitor({ db, backupDir: broken.backupDir, mailer, now: () => clock });
  try {
    assert.equal(monitor.evaluate().ok, false);
    assert.equal(noticesOf(db, 'ops-health-alert').length, 1);
    assert.equal(mails.length, 1);

    // 修好：删掉挡路的文件（父目录已在，`mkdirSync` 可创建 backups）⇒ 同一监视器看到恢复
    rmSync(broken.blocker);
    clock += 10 * MINUTE;
    assert.equal(monitor.evaluate().ok, true);
    const recovery = noticesOf(db, 'ops-health-recovery');
    assert.equal(recovery.length, 1, '恢复时必须发一条恢复通知');
    assert.deepEqual(recovery[0].audience, ['secretary', 'deputy-secretary']);
    assert.equal(mails.length, 2, '恢复时也要发一封邮件');

    // 再检查一次仍然是 ok ⇒ 不重复发恢复
    clock += MINUTE;
    assert.equal(monitor.evaluate().ok, true);
    assert.equal(noticesOf(db, 'ops-health-recovery').length, 1);
    assert.equal(mails.length, 2);
  } finally {
    db.close();
    broken.cleanup();
  }
});
