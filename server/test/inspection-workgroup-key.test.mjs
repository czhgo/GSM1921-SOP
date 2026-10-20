// server/test/inspection-workgroup-key.test.mjs — 考察记录稳定父键（IA 审查 R4-D04，2026-10-20）
// ════════════════════════════════════════════════════════════════
// 验收口径（spec: .trae/specs/migrate-inspection-workgroup-key）：
//   1. 新建专班考察必带 workgroupId；活动类必带 activityId；
//   2. 专班改名后仍按 workgroupId 可查；两个同名专班不串数据；
//   3. 回填幂等（第二次 filled=0、legacy 不增）；无法回填项 legacy:true，确认/删除被拒；
//   4. 跨支部 / 跨组写门拒绝；
//   5. mock 与 api 两形态对同一父键读数一致。
// 自包含：createApp(:memory:) + seedDatabase；HTTP 直连（无浏览器）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { migrateInspectionWorkgroupKeys } from '../../docs/src/services/activity/inspection-migrate.js?v=20261020a';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20261020a';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20261020a';

let app, db, server, base;

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return res.json();
}
const headers = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

const put = (table, row) => db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
  .run(row.id, JSON.stringify(row));

const taskforcePayload = (workgroupId, content, extra = {}) => ({
  sourceType: 'taskforce',
  activityId: null,
  workgroupId,
  sourceName: '宣传专班（第二期）',
  personId: 'p9',
  level: 'deep',
  content,
  status: 'pending',
  recordedAt: new Date().toISOString(),
  ...extra,
});

test('① 新建考察：专班带 workgroupId，活动带 activityId；专班缺键 → 400', async () => {
  const { token } = await login('p10'); // 纪检（支委层，可写任意场次）

  const tf = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify(taskforcePayload('wg-taskforce-tf-001', '专班考察·父键断言', { taskforceId: 'tf-001' })),
  });
  const tfText = await tf.text();
  assert.equal(tf.status, 201, `专班考察应可写入（实得 ${tf.status}：${tfText}）`);
  const tfRow = JSON.parse(tfText);
  assert.equal(tfRow.workgroupId, 'wg-taskforce-tf-001', '专班考察必须落 workgroupId');
  assert.equal(tfRow.taskforceId, 'tf-001', '兼容快照 taskforceId 随行保留');

  const { token: orgToken } = await login('p3'); // act-7 组织者（普通成员）
  const act = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(orgToken),
    body: JSON.stringify({
      sourceType: 'activity', activityId: 'act-7', sourceName: null, personId: 'p9',
      level: 'deep', content: '活动考察·父键断言', status: 'pending', recordedAt: new Date().toISOString(),
    }),
  });
  const actText = await act.text();
  assert.equal(act.status, 201, `活动考察应可写入（实得 ${act.status}：${actText}）`);
  const actRow = JSON.parse(actText);
  assert.equal(actRow.activityId, 'act-7');
  assert.equal(actRow.workgroupId, undefined, '活动类考察不写专班 workgroupId');

  const missing = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ ...taskforcePayload(undefined, '缺父键'), workgroupId: undefined }),
  });
  assert.equal(missing.status, 400, `专班考察缺 workgroupId 应 400（实得 ${missing.status}）`);
  assert.match((await missing.json()).error, /工作组键/);
});

test('② 专班改名后按 workgroupId 仍可查；同名专班不串数据', async () => {
  // 造一个与 tf-001 同名的专班（各自独立 workgroupId）——只有父键能区分，名称不能。
  put('taskforces', {
    id: 'tf-twin', name: '宣传专班（第二期）', status: 'active', branchId: 'br-b1',
    manager: 'p11', initiator: 'p13', members: [{ personId: 'p10', role: 'organizer' }], createdAt: '2026-07-09',
  });
  put('workgroups', {
    id: 'wg-taskforce-tf-twin', branchId: 'br-b1', kind: 'taskforce', sourceType: 'taskforce',
    sourceId: 'tf-twin', name: '宣传专班（第二期）', status: 'active', createdAt: '2026-07-09',
  });

  const { token } = await login('p10');
  const create = async (workgroupId, taskforceId, content) => {
    const res = await fetch(`${base}/api/v1/inspections`, {
      method: 'POST', headers: headers(token),
      body: JSON.stringify(taskforcePayload(workgroupId, content, { taskforceId })),
    });
    const text = await res.text();
    assert.equal(res.status, 201, `同名专班记录应可写入（实得 ${res.status}：${text}）`);
    return JSON.parse(text);
  };
  const a = await create('wg-taskforce-tf-001', 'tf-001', '同名A·tf-001');
  const b = await create('wg-taskforce-tf-twin', 'tf-twin', '同名B·tf-twin');

  // 真改名（走服务端 PATCH），workgroupId 不变。
  const { token: secToken } = await login('p13');
  const rename = await fetch(`${base}/api/v1/taskforces/tf-001`, {
    method: 'PATCH', headers: headers(secToken), body: JSON.stringify({ name: '宣传专班（改名后）' }),
  });
  assert.equal(rename.status, 200, `专班改名应成功（实得 ${rename.status}：${await rename.text()}）`);

  const rows = await (await fetch(`${base}/api/v1/inspections`, { headers: headers(secToken) })).json();
  const aAfter = rows.find((r) => r.id === a.id);
  const bAfter = rows.find((r) => r.id === b.id);
  assert.ok(aAfter && bAfter, '改名后两条记录都应仍可读到');
  assert.equal(aAfter.workgroupId, 'wg-taskforce-tf-001');
  assert.equal(bAfter.workgroupId, 'wg-taskforce-tf-twin');
  assert.equal(aAfter.sourceName, bAfter.sourceName, '前置：两条记录的展示快照名称相同');

  assert.equal(rows.filter((r) => r.workgroupId === 'wg-taskforce-tf-001' && r.content === '同名A·tf-001').length, 1);
  assert.equal(rows.filter((r) => r.workgroupId === 'wg-taskforce-tf-twin' && r.content === '同名B·tf-twin').length, 1);
  assert.equal(rows.filter((r) => r.content === '同名A·tf-001' && r.workgroupId === 'wg-taskforce-tf-twin').length, 0,
    '同名专班不得串数据（A 记录不得落到 twin 的 workgroupId）');
});

test('③ 回填幂等：第二次 filled=0、legacy 不增；legacy 记录确认/删除被拒', async () => {
  const taskforces = [
    { id: 'tf-u', name: '唯一专班', workgroupId: 'wg-taskforce-tf-u' },
    { id: 'tf-d1', name: '重名专班', workgroupId: 'wg-taskforce-tf-d1' },
    { id: 'tf-d2', name: '重名专班', workgroupId: 'wg-taskforce-tf-d2' },
    { id: 'tf-001', name: '宣传专班（第二期）', workgroupId: 'wg-taskforce-tf-001' },
  ];
  const workgroups = taskforces.map((tf) => ({
    id: tf.workgroupId, kind: 'taskforce', sourceId: tf.id, name: tf.name,
  }));
  const records = [
    { id: 'm1', sourceType: 'taskforce', sourceName: '唯一专班', personId: 'p1' },
    { id: 'm2', sourceType: 'taskforce', sourceName: '重名专班', personId: 'p1' }, // 同名 ⇒ 无法唯一回填
    { id: 'm3', sourceType: 'taskforce', workgroupId: 'wg-taskforce-tf-001', personId: 'p1' },
    { id: 'a1', sourceType: 'activity', activityId: 'act-1', personId: 'p1' },
  ];

  const first = migrateInspectionWorkgroupKeys({ records, workgroups, taskforces });
  assert.equal(first.total, 3, '只统计专班类考察');
  assert.equal(first.filled, 1, '唯一名称可回填 1 条');
  assert.equal(first.legacy, 1, '同名重名专班无法唯一回填 ⇒ legacy');
  assert.ok(first.rate > 0 && first.rate < 1);
  assert.equal(first.rows.find((r) => r.id === 'm1').workgroupId, 'wg-taskforce-tf-u');
  assert.equal(first.rows.find((r) => r.id === 'm2').legacy, true);
  assert.equal(first.rows.find((r) => r.id === 'a1').workgroupId, undefined, '活动类不参与回填');

  const second = migrateInspectionWorkgroupKeys({
    records: first.rows, workgroups, taskforces,
  });
  assert.equal(second.filled, 0, '重跑 filled 必须为 0（幂等）');
  assert.equal(second.legacy, first.legacy, '重跑 legacy 不增');
  assert.deepEqual(second.rows, first.rows, '重跑结果逐值稳定');

  // 落一条真实 legacy 记录，验证服务端只读（确认/删除均拒绝且文案明确）。
  put('inspections', {
    id: 'insp-legacy-test', sourceType: 'taskforce', activityId: null, sourceName: '已下架专班',
    personId: 'p9', level: 'deep', content: '历史考察', role: '组织者',
    recordedBy: 'p1', recordedAt: '2026-07-01T00:00:00', status: 'pending', legacy: true,
  });
  const { token } = await login('p10');
  const confirm = await fetch(`${base}/api/v1/inspections/insp-legacy-test`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ status: 'confirmed' }),
  });
  assert.equal(confirm.status, 403, 'legacy 记录不得确认');
  assert.match((await confirm.json()).error, /历史考察缺少工作组键/);

  const del = await fetch(`${base}/api/v1/inspections/insp-legacy-test`, {
    method: 'DELETE', headers: headers(token),
  });
  assert.equal(del.status, 403, 'legacy 记录不得删除');
  assert.match((await del.json()).error, /历史考察缺少工作组键/);
});

test('④ 跨组 / 跨支部写门拒绝', async () => {
  const { token: p4Token } = await login('p4'); // tf-002 组织者（普通成员）
  const crossGroup = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(p4Token),
    body: JSON.stringify(taskforcePayload('wg-taskforce-tf-001', '跨组越权写入')),
  });
  assert.equal(crossGroup.status, 403, `非本组组织者不得写入（实得 ${crossGroup.status}）`);

  // 另一个支部的工作组：支委层也不能跨支部写考察。
  put('branches', { id: 'br-x', name: '测试支部', config: {} });
  put('taskforces', {
    id: 'tf-x', name: '外支部专班', status: 'active', branchId: 'br-x',
    members: [{ personId: 'p13', role: 'organizer' }], createdAt: '2026-07-01',
  });
  put('workgroups', {
    id: 'wg-taskforce-tf-x', branchId: 'br-x', kind: 'taskforce', sourceType: 'taskforce',
    sourceId: 'tf-x', name: '外支部专班', status: 'active', createdAt: '2026-07-01',
  });

  const { token: secToken } = await login('p13');
  const crossBranch = await fetch(`${base}/api/v1/inspections`, {
    method: 'POST', headers: headers(secToken),
    body: JSON.stringify(taskforcePayload('wg-taskforce-tf-x', '跨支部越权写入')),
  });
  assert.equal(crossBranch.status, 403, `支委层也不得写外支部考察（实得 ${crossBranch.status}）`);
  assert.match((await crossBranch.json()).error, /其他支部/);
});

test('⑤ mock / api 两形态父键读数一致', async () => {
  const { token } = await login('p13');
  const apiRows = await (await fetch(`${base}/api/v1/inspections`, { headers: headers(token) })).json();
  const apiKeys = Object.fromEntries(
    ['insp-11', 'insp-12'].map((id) => [id, apiRows.find((r) => r.id === id)?.workgroupId]));

  // mock 形态：同一份 INSPECTION_RECORDS 经同一迁移函数（种子已带父键 ⇒ 只需验证读数不漂）。
  const mockSeed = migrateInspectionWorkgroupKeys({
    records: INSPECTION_RECORDS, workgroups: [], taskforces: MOCK_TASKFORCES,
  });
  const mockKeys = Object.fromEntries(
    ['insp-11', 'insp-12'].map((id) => [id, mockSeed.rows.find((r) => r.id === id)?.workgroupId]));
  assert.deepEqual(mockKeys, apiKeys, 'mock/api 两侧 workgroupId 必须逐值一致');
  assert.ok(Object.values(apiKeys).every(Boolean), '种子专班考察必须都带 workgroupId');

  // 历史形态（仅名称）回填后应与 api 读数落到同一个父键。
  const legacyCopy = INSPECTION_RECORDS.map((r) => (r.sourceType === 'taskforce'
    ? { ...r, workgroupId: undefined, taskforceId: undefined } : r));
  const backfilled = migrateInspectionWorkgroupKeys({
    records: legacyCopy, workgroups: [], taskforces: MOCK_TASKFORCES,
  });
  assert.equal(backfilled.legacy, 0, '种子专班名称唯一，回填不应产生 legacy');
  const backfilledKeys = Object.fromEntries(
    ['insp-11', 'insp-12'].map((id) => [id, backfilled.rows.find((r) => r.id === id)?.workgroupId]));
  assert.deepEqual(backfilledKeys, apiKeys, '历史回填结果须与 api 读数一致');
});
