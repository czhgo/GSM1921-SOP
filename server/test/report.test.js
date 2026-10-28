// server/test/report.test.js — 数据上报接口（部署文档 §六落地验收）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261028a';
import { monthKeyOf } from '../../docs/src/data/mock/demo-window.js?v=20261028a';

// 演示种子日期（单一源）：排序后取首尾，测试锚点随种子窗口自动跟随，不再写死月份。
const ACTIVITY_DATES = ACTIVITIES.map((a) => a.date).sort();
const REPORT_FROM = ACTIVITY_DATES[0];
const REPORT_TO = ACTIVITY_DATES[ACTIVITY_DATES.length - 1];
const FILTER_MONTH = monthKeyOf(REPORT_FROM);
const FILTER_FROM = `${FILTER_MONTH}-01`;
const FILTER_TO = `${FILTER_MONTH}-31`;

let server, base, token, partyToken;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: '2300010001', password: '123456' }),
  });
  token = (await login.json()).token;
  const partyLogin = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: '9000000001', password: '123456' }),
  });
  partyToken = (await partyLogin.json()).token;
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
  // 过滤窗口取种子最早活动的所在月（数据推导，换演示窗口时自动跟随）
  const res = await fetch(`${base}/api/v1/report/activity?from=${FILTER_FROM}&to=${FILTER_TO}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assert.ok(body.count > 0);
  assert.ok(body.items.every(i => i.date >= FILTER_FROM && i.date <= FILTER_TO));
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
  // 先取同窗口 JSON 的首条活动日期（数据推导），CSV 行由同一 extractDomain 生成 ⇒ 必含该日期
  const jsonRes = await fetch(`${base}/api/v1/report/activity?from=${REPORT_FROM}&to=${REPORT_TO}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const firstActivityDate = (await jsonRes.json()).items[0]?.date;
  assert.ok(firstActivityDate, '活动域应有数据，否则 CSV 日期断言无意义');

  const res = await fetch(`${base}/api/v1/report/export?domain=activity&from=${REPORT_FROM}&to=${REPORT_TO}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  // res.text() 解码时会吞掉 BOM，改用原始字节断言 UTF-8 BOM（EF BB BF，Excel 中文兼容）
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'CSV 应带 UTF-8 BOM');
  const text = new TextDecoder('utf-8').decode(bytes);
  assert.match(text, /title/);
  assert.ok(text.includes(firstActivityDate), `CSV 应含首条活动日期 ${firstActivityDate}`);
});

test('未知数据域返回 400', async () => {
  const res = await fetch(`${base}/api/v1/report/unknown`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 400);
});

test('党委手动推送须选定单一支部；该支部未配置 webhook 时提示拉取模式', async () => {
  const branchRes = await fetch(`${base}/api/v1/report/trigger`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(branchRes.status, 403);
  const res = await fetch(`${base}/api/v1/report/trigger`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${partyToken}` },
  });
  assert.equal(res.status, 400, '党委未选择支部时不得触发明细报表推送');
  const selected = await fetch(`${base}/api/v1/report/trigger?branchId=br-b1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${partyToken}` },
  });
  assert.equal(selected.status, 409);
  const body = await selected.json();
  assert.equal(body.pushed, false);
});
