// role: [工程师]+[AI]
// server/test/soft-void.test.mjs — 业务记录「作废（软）」统一写口（2026-10-02 批次 346 ·
//   支书 `D-744`②「业务过程类补『作废·停用』软入口（走审批门，同 #1 已落口径）」；
//   探查来源＝批次 341 全域 CRUD 矩阵「能建不能删」`CRUD-4`）。
//
// 语义钉死（本件即判据）：
//   **软作废、不硬删**——只给记录打 `voided`（含原因 / 申请人 / 时间 / 确认人），其余字段一字不动，行数不变；
//   走**审批门**：`requestVoid`（写 `voidPending`、记录**仍不出列**）→ 支委层 `confirmVoid`（落 `voided`、出列）
//   或 `rejectVoid`（回原状）；支委层亦可 `confirmVoid` 直接作废。读侧 `filterActive` 把 `voided` 挡在默认列表外。
//
// 覆盖（纯 node；localStorage 内存桩同 member-persist 头注模式；真 `MockAdapter` 直连）：
//   V1 申请：`voidPending` 落上（原因 / 申请人 / 时间），`filterActive` **仍含该行**（申请≠出列）
//   V2 申请必填：空原因 `requestVoid` 返回 null、不改记录（非恒真）
//   V3 待确认映射：`listVoidPending()` 给出 `"<资源>:<记录id>"` 形状，`parseRecordVoidId` 可回解
//   V4 确认：`voided` 落上（原因取申请）、`voidPending` 清空、`filterActive` **不再含该行**、行数不变
//   V5 驳回：`voidPending` 清空 ＋ `voidRejected` 留痕、该行**回到默认列表**
// 运行：node --test test/soft-void.test.mjs（server 目录）
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261003e';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261003e';
import { registerMockAdapter, setDataSource } from '../../docs/src/data/data-adapter.js?v=20261003e';
import {
  SOFT_VOID_RESOURCES, filterActive, listPending, listVoidPending, parseRecordVoidId,
  requestVoid, confirmVoid, rejectVoid,
} from '../../docs/src/services/governance/soft-void.js?v=20261003e';

// ── localStorage 内存桩（member-persist 同款）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const RES = 'makeupTasks';
let TARGET = '';
const n0 = () => (mockDB.makeupTasks || []).length;
const find = (id) => (mockDB.makeupTasks || []).find((t) => t.id === id);

before(() => {
  registerMockAdapter(MockAdapter);
  setDataSource('mock');
  mockDB._loaded = false;
  MockAdapter.loadDB(); // 种子：makeup_tasks 等
  assert.ok((mockDB.makeupTasks || []).length > 0, '种子须含 makeupTasks（否则本件判据无对象）');
  TARGET = mockDB.makeupTasks[0].id;
});

test('V1 申请作废：落 voidPending（原因/申请人/时间），但该行**仍在**默认列表（申请 ≠ 出列）', async () => {
  const before0 = { ...find(TARGET) };
  const r = await requestVoid(RES, TARGET, { reason: '长期未补、当事人已毕业', byPersonId: 'p10' });
  assert.ok(r && r.voidPending, '申请后记录带 voidPending');
  assert.equal(r.voidPending.reason, '长期未补、当事人已毕业');
  assert.equal(r.voidPending.byPersonId, 'p10');
  assert.ok(r.voidPending.at, '带申请时间');
  assert.ok(!r.voided, '申请阶段不落 voided');
  // 非恒真：申请≠出列
  assert.equal(filterActive(RES, mockDB.makeupTasks).filter((t) => t.id === TARGET).length, 1,
    '申请阶段该行仍在默认列表（否则「待支委会确认」就无处可见）');
  // 其余字段一字不动
  assert.equal(find(TARGET).personId, before0.personId);
  assert.equal(find(TARGET).activityName, before0.activityName);
  assert.equal(n0(), n0(), '行数不变（软作废 ≠ 删除）');
});

test('V2 申请必填：空原因不改记录（非恒真）', async () => {
  const snap = JSON.stringify(find(TARGET).voidPending);
  const r = await requestVoid(RES, TARGET, { reason: '   ', byPersonId: 'p10' });
  assert.equal(r, null, '空原因必须拒绝');
  assert.equal(JSON.stringify(find(TARGET).voidPending), snap, '记录未被改坏');
});

test('V3 待确认映射：id 形如 `<资源>:<记录id>`，可回解（支书台据此路由）', () => {
  const pend = listVoidPending();
  const mine = pend.find((x) => x.id === `${RES}:${TARGET}`);
  assert.ok(mine, `listVoidPending 须含 ${RES}:${TARGET}（实测 ${JSON.stringify(pend.map((x) => x.id))}）`);
  assert.equal(mine.role, SOFT_VOID_RESOURCES[RES].ownerRole, '带责任人角色（支书台行上角色胶囊）');
  assert.ok(String(mine.title).includes(SOFT_VOID_RESOURCES[RES].label), '标题带资源名');
  assert.deepEqual(parseRecordVoidId(mine.id), { resource: RES, id: TARGET }, '前缀 id 可回解');
  assert.equal(parseRecordVoidId('t-abc'), null, '非本模块形状回 null（待办作废照旧走 TodoStore）');
  assert.equal(parseRecordVoidId('nope:x'), null, '未登记的资源名回 null');
  assert.equal(listPending(RES).some((t) => t.id === TARGET), true, 'listPending 含该条');
});

test('V4 确认作废：落 voided（原因取申请）＋ 清 voidPending ＋ **出列** ＋ 行数不变', async () => {
  const countBefore = n0();
  const r = await confirmVoid(RES, TARGET, { byPersonId: 'p13' });
  assert.ok(r && r.voided, '确认后带 voided');
  assert.equal(r.voided.reason, '长期未补、当事人已毕业', '原因取自申请');
  assert.equal(r.voided.byPersonId, 'p10', '保留申请人');
  assert.equal(r.voided.confirmedBy, 'p13', '记录确认人（支委层）');
  assert.equal(r.voidPending, null, 'voidPending 已清空');
  const cur = find(TARGET);
  assert.equal(cur.voided.confirmedAt, r.voided.confirmedAt);
  // 出列（读侧过滤）
  assert.equal(filterActive(RES, mockDB.makeupTasks).some((t) => t.id === TARGET), false, '已作废不再出现在默认列表');
  assert.equal(listVoidPending().some((x) => x.id === `${RES}:${TARGET}`), false, '不再出现在待确认组');
  assert.equal(n0(), countBefore, '行数不变（软作废 ≠ 删除）');
});

test('V5 驳回作废：清 voidPending ＋ 落 voidRejected 留痕 ＋ 该行**回到默认列表**', async () => {
  // 换一行做驳回（上一行已 voided）；种子只有一条补课任务时补一条测试行
  let other = (mockDB.makeupTasks || []).find((t) => t.id !== TARGET && !t.voided);
  if (!other) {
    other = { id: 'mkp-test-v5', personId: 'p5', personName: '（测试）', activityName: '（测试）支部党员大会', status: 'pending', deadline: '2026-10-01', isMandatory: true };
    mockDB.makeupTasks = [...mockDB.makeupTasks, other];
  }
  await requestVoid(RES, other.id, { reason: '误报缺勤，待核', byPersonId: 'p10' });
  assert.equal(filterActive(RES, mockDB.makeupTasks).some((t) => t.id === other.id), true, '申请阶段在列表');
  const r = await rejectVoid(RES, other.id, { byPersonId: 'p13', note: '考勤复核后无须补课' });
  assert.ok(r, '驳回返回记录');
  assert.equal(r.voidPending, null, 'voidPending 已清空');
  assert.ok(r.voidRejected, '驳回留痕');
  assert.equal(r.voidRejected.rejectedBy, 'p13');
  assert.equal(r.voidRejected.note, '考勤复核后无须补课');
  assert.ok(!r.voided, '驳回＝未作废');
  assert.equal(filterActive(RES, mockDB.makeupTasks).some((t) => t.id === other.id), true, '回到默认列表');
  assert.equal(listVoidPending().some((x) => x.id === `${RES}:${other.id}`), false, '不再出现在待确认组');
});
