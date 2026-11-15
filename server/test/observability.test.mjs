// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/observability.test.mjs —— T2 可观测底座（结构化日志 ＋ 两级健康检查）
//
//  判据（对应 `.trae/specs/close-six-dim-gaps/tasks.md` T2）：
//   · 5xx 日志含请求 id / 路由 / 状态 / 耗时 / 错误类别，响应头回传同一 id；
//   · 日志脱敏：口令 / token 查询值置 ***，响应与日志都不出现 `_realPersonId` 等身份字段；
//   · 浅检查 `GET /api/v1/health` 仍为 `{ok:true}`；深检查含库可读 / 迁移版本 / 备份目录可写；
//   · 反例自证：备份目录不可写时深检查必须 degraded（不是恒真）。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createApp } from '../app.js';
import {
  createRequestLogger, errorCategoryOf, redactPath, redactText, requestLogEnabled,
} from '../services/logger.js';
import { createHealthRouter, deepHealth } from '../routes/health.js';

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

/** 等响应 finish 事件把记录写进 sink（fetch 已返回时通常已触发） */
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

test('日志脱敏与错误分类：口令 / token 不入日志，4xx / 5xx 分类明确', () => {
  assert.equal(
    redactPath('/api/v1/auth/login?personId=2300010001&password=123456&token=abc'),
    '/api/v1/auth/login?personId=***&password=***&token=***',
  );
  const text = redactText('Authorization: Bearer abc.def password=p@ss token=xyz');
  assert.doesNotMatch(text, /abc\.def|p@ss|xyz/);
  assert.equal(redactPath('/api/v1/members/2300010001'), '/api/v1/members/:id', '路径里的学号须置 :id');
  assert.equal(errorCategoryOf(200), 'none');
  assert.equal(errorCategoryOf(401), 'client');
  assert.equal(errorCategoryOf(503), 'server');
  // 开关：正常进程开启；node:test 子进程默认静默（显式 REQUEST_LOG=1 可打开）
  assert.equal(requestLogEnabled({}), true);
  assert.equal(requestLogEnabled({ NODE_TEST_CONTEXT: 'child-v8' }), false);
  assert.equal(requestLogEnabled({ NODE_TEST_CONTEXT: 'child-v8', REQUEST_LOG: '1' }), true);
  assert.equal(requestLogEnabled({ REQUEST_LOG: '0' }), false);
});

test('5xx：日志含请求 id / 路由 / 状态 / 耗时 / 错误类别，响应头回传同一 id', async () => {
  const records = [];
  const app = express();
  app.use(createRequestLogger({ sink: (record) => records.push(record), enabled: true }));
  app.get('/api/v1/__observability_boom__', () => { throw new Error('boom password=leak'); });
  app.use((_err, _req, res, _next) => res.status(500).json({ error: '服务器内部错误' }));

  const { server, base } = await listen(app);
  try {
    const res = await fetch(`${base}/api/v1/__observability_boom__?token=abc&personId=2300010001`);
    assert.equal(res.status, 500);
    await flush();
    assert.equal(records.length, 1, '一次请求只记一条');
    const record = records[0];
    assert.match(record.requestId, /^[A-Za-z0-9._:-]+$/, '请求 id 缺失或形态非法');
    assert.equal(res.headers.get('x-request-id'), record.requestId, '响应头与日志的请求 id 不一致');
    assert.equal(record.method, 'GET');
    assert.equal(record.route, '/api/v1/__observability_boom__');
    assert.equal(record.status, 500);
    assert.equal(record.errorCategory, 'server');
    assert.ok(Number.isFinite(record.durationMs) && record.durationMs >= 0);
    assert.equal(record.path, '/api/v1/__observability_boom__?token=***&personId=***');
    assert.doesNotMatch(JSON.stringify(record), /abc|leak|_realPersonId|2300010001/, '日志泄漏口令 / token / 身份字段');
  } finally {
    await closeServer(server);
  }
});

test('浅 / 深健康检查：浅 ok；深含库可读 / 迁移版本 / 备份目录可写，且不回路径', async () => {
  const app = createApp({ dbPath: ':memory:' });
  const { server, base } = await listen(app);
  try {
    const shallow = await fetch(`${base}/api/v1/health`);
    assert.equal(shallow.status, 200);
    assert.deepEqual(await shallow.json(), { ok: true }, '既有浅检查响应形态被改动');

    const deepRes = await fetch(`${base}/api/v1/health/deep`);
    assert.equal(deepRes.status, 200);
    const body = await deepRes.json();
    assert.equal(body.ok, true);
    assert.equal(body.status, 'ok');
    assert.ok(body.schemaVersion >= 1, '迁移版本未读到');
    assert.deepEqual(body.checks.map((c) => c.id), ['db-read', 'schema-version', 'backup-dir-writable']);
    assert.ok(body.checks.every((c) => c.ok));
    assert.doesNotMatch(JSON.stringify(body), /backups|_realPersonId/, '深检查不得回传路径 / 身份字段');
  } finally {
    await closeServer(server);
    app.locals.db.close();
  }
});

test('反例：备份目录不可写 ⇒ 深检查 degraded 且 HTTP 503（不是恒真）', async () => {
  const app = createApp({ dbPath: ':memory:' });
  const dir = mkdtempSync(join(tmpdir(), 'gsm1921-health-'));
  const blocker = join(dir, 'not-a-dir');
  writeFileSync(blocker, 'x');
  try {
    const result = deepHealth(app.locals.db, { backupDir: join(blocker, 'backups') });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'degraded');
    assert.equal(result.checks.find((c) => c.id === 'backup-dir-writable').ok, false);

    const mini = express();
    mini.use('/api/v1/health', createHealthRouter(app.locals.db, { backupDir: join(blocker, 'backups') }));
    const { server, base } = await listen(mini);
    try {
      const res = await fetch(`${base}/api/v1/health/deep`);
      assert.equal(res.status, 503, '深检查失败必须 503');
      assert.equal((await res.json()).status, 'degraded');
    } finally {
      await closeServer(server);
    }
  } finally {
    app.locals.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
