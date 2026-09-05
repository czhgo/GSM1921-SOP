// server/test/report.test.js — 数据上报接口（部署文档 §六落地验收）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server, base, token;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13' }),
  });
  token = (await login.json()).token;
});
after(() => server.close());

test('未登录访问 /api/v1/report/:domain 返回 401', async () => {
  const res = await fetch(`${base}/api/v1/report/activity`);
  assert.equal(res.status, 401);
});

test('activity 域 JSON 拉取（全时段）', async () => {
  const res = await fetch(`${base}/api/v1/report/activity?from=2026-01-01&to=2026-12-31`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.domain, 'activity');
  assert.ok(body.count >= 25, `活动应 ≥25 条，实际 ${body.count}`);
  assert.ok(body.items.every(i => i.title && i.date && i.type));
});

test('activity 域 from/to 时段过滤', async () => {
  // 2026-09-06 基线刷新：3–6 月旧批活动已重排至 7 月，过滤窗口改用 2026-07
  const res = await fetch(`${base}/api/v1/report/activity?from=2026-07-01&to=2026-07-31`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assert.ok(body.count > 0);
  assert.ok(body.items.every(i => i.date >= '2026-07-01' && i.date <= '2026-07-31'));
});

test('member 域返回全量成员档案（脱敏：默认不报联系方式）', async () => {
  const res = await fetch(`${base}/api/v1/report/member`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  assert.equal(body.domain, 'member');
  assert.ok(body.count >= 50, `成员应 ≥50 条，实际 ${body.count}`);
  assert.ok(body.items.every(i => i.name && i.studentId && i.partyGroup));
  assert.ok(body.items.every(i => !('contact' in i)), '默认不输出 contact 字段（脱敏）');
});

test('attendance 域仅输出已确认数据（排除 pending）', async () => {
  const res = await fetch(`${base}/api/v1/report/attendance?from=2026-01-01&to=2026-12-31`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assert.equal(body.domain, 'attendance');
  assert.ok(body.items.every(i => i.attendanceStatus && i.attendanceStatus !== 'pending'));
  assert.ok(body.items.every(i => i.member && i.activityTitle));
});

test('export CSV 导出（BOM + 表头 + 数据行）', async () => {
  const res = await fetch(`${base}/api/v1/report/export?domain=activity&from=2026-01-01&to=2026-12-31`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  // res.text() 解码时会吞掉 BOM，改用原始字节断言 UTF-8 BOM（EF BB BF，Excel 中文兼容）
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'CSV 应带 UTF-8 BOM');
  const text = new TextDecoder('utf-8').decode(bytes);
  assert.match(text, /title/);
  assert.match(text, /2026-07-01/);  // 2026-09-06 基线刷新：act-1 由 3/15 重排至 7/1
});

test('未知数据域返回 400', async () => {
  const res = await fetch(`${base}/api/v1/report/unknown`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 400);
});

test('手动触发推送：未配置 webhook → 409 提示拉取模式', async () => {
  const res = await fetch(`${base}/api/v1/report/trigger`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.pushed, false);
});
