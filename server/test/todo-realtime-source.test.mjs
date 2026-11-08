// role: [工程师]+[AI]
// server/test/todo-realtime-source.test.mjs — 待办实时组「服务端默认 + 客户端仅失败兜底」（批次 534 · B-500-7b-1 Task 9）
//
// 目的：把「服务端成功 ⇒ 客户端不再派生业务组」「服务端失败 ⇒ 用同一份已拉取数据兜底且不新造事实」
//   「两条路径都不空」钉成可判红的门，防回归到「服务端与客户端各算一套、按 groupKey 去重后仍可能双卡」。
//
// 被测单一源：`docs/src/components/record/todo-tab-shell.js::collectRealtimeGroups`
//   （`createTodoTab` 的渲染链直接调用它；本文件用注入的 fetch / builder 复现三态，不起浏览器）。
//
// 覆盖：
//   ① 服务端成功：业务组只取服务端；客户端同键组（含冲突 count / items）不并入；
//      客户端只补服务端不产出的展示组（如归档缺口）。
//   ② 服务端成功：客户端 builder 收到 `skipActionKeys`（服务端已接管的键不再派生）；
//      各台 `decorateServerGroups` 只补展示字段，不改 groupKey / count / items。
//   ③ 服务端失败：走客户端兜底——组集合与客户端派生逐键相等（不新增、不丢失），并回非空 error。
//   ④ mock 数据源（unavailable）：客户端派生＝正常路径，不冒充失败。
//   ⑤ 服务端成功但返回空组：客户端不得补出服务端已接管的键（空组不得被客户端「猜」回）。
//   ⑥ `SecretaryTodoDeriver.computeAggregates({skipActionKeys})`：服务端已接管键不派生、其余照旧。
//
// 运行：node --test test/todo-realtime-source.test.mjs（server 目录；纯 node，daily 层）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  collectRealtimeGroups,
  SERVER_OWNED_ACTION_KEYS,
} from '../../docs/src/components/record/todo-tab-shell.js?v=20261108c';
import { DERIVE_GROUP_DOMAIN } from '../../docs/src/core/domain/todo-derive.js?v=20261108c';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261108c';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261108c';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261108c';
import { SecretaryTodoDeriver } from '../../docs/src/services/governance/secretary-overview.js?v=20261108c';

const ROOT = join(import.meta.dirname, '..', '..');

// ── localStorage 内存桩（同 todo-domain-view / todo-deriver-domain） ─────────
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

function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
}

/** 服务端载荷样例（形状同 `GET /todo-groups` 的 `_groupPayload`：无 hideActionBtn / bulkHtml） */
function serverGroupsSample() {
  return [
    {
      groupKey: 'secretary:member-confirm', domain: 'member-dev', actionKey: 'member-confirm',
      title: '成员变更待确认', category: 'review', actionType: null, actionData: null,
      deadline: null, flow: '确认位唯一化', count: 2, items: [{ id: 'srv-mc-1' }, { id: 'srv-mc-2' }],
    },
    {
      groupKey: 'module-cycle-remind', domain: 'project', actionKey: 'module-cycle-remind',
      title: '本周期尚未开展（支部分工模块）', category: null, actionType: null, actionData: null,
      deadline: null, flow: null, count: 1, items: [{ id: 'cyc-1' }],
    },
  ];
}

/** 客户端派生样例：故意与服务端冲突（count / items 不同），并含一个服务端不产出的组 */
function clientGroupsSample() {
  return [
    { groupKey: 'secretary:member-confirm', actionKey: 'member-confirm', domain: 'member-dev', title: '成员变更待确认(客户端)', count: 99, items: [{ id: 'cli-mc-1' }] },
    { groupKey: 'secretary:attendance-remind', actionKey: 'attendance-remind', domain: 'attendance', title: '考勤待录入', count: 7, items: [{ id: 'cli-att-1' }] },
    { groupKey: 'secretary:archive-remind', actionKey: 'archive-remind', domain: 'archive', title: '宣传材料待归档', count: 1, items: [{ id: 'cli-arc-1' }] },
  ];
}

const keysOf = (groups) => (groups || []).map((g) => g.groupKey);
const byKey = (groups, key) => (groups || []).find((g) => g.groupKey === key) || null;

// ════════════════════════════════════════════════════════════════
//  ① 服务端成功：只用服务端业务组
// ════════════════════════════════════════════════════════════════

test('① 服务端成功：7 类/已接管键只取服务端（客户端同键组不并入），只补服务端不产出的组', async () => {
  const calls = [];
  const res = await collectRealtimeGroups({
    role: 'secretary',
    fetchServerGroups: async () => ({ status: 'ok', groups: serverGroupsSample() }),
    buildRealtimeGroups: (_ctx, opts) => { calls.push(opts); return clientGroupsSample(); },
    moduleCycleGroups: () => { throw new Error('服务端成功时不得再派生模块周期组'); },
  });

  assert.equal(res.source, 'server', '服务端成功 ⇒ 来源＝server');
  assert.equal(res.error, null, '成功路径不得带失败提示');
  assert.ok(res.groups.length > 0, '成功路径结果不得为空（防空转）');

  // 服务端业务事实原样保留（count / items 不被客户端覆盖）
  const mc = byKey(res.groups, 'secretary:member-confirm');
  assert.ok(mc, '服务端成员变更组应在结果里');
  assert.equal(mc.count, 2, 'count 取服务端值（客户端 99 不得覆盖）');
  assert.deepEqual(mc.items.map((it) => it.id), ['srv-mc-1', 'srv-mc-2'], 'items 取服务端值');
  assert.equal(mc.hideActionBtn, true, '7 类实时组的展示派生：无行尾直接动作');

  // 客户端同键组一律不并入
  assert.ok(!byKey(res.groups, 'secretary:attendance-remind'), '服务端已接管的键不得由客户端补出');
  assert.equal(keysOf(res.groups).filter((k) => k === 'secretary:member-confirm').length, 1, '同键不得双卡');

  // 服务端不产出的展示组照旧由客户端补（页面不因切默认而变空）
  assert.ok(byKey(res.groups, 'secretary:archive-remind'), '服务端不产出的组由客户端补（归档缺口）');

  // 客户端 builder 被明确告知「这些键不用再派生」
  assert.equal(calls.length, 1, '成功路径调用一次客户端 builder（仅补非接管组）');
  const skip = calls[0] && calls[0].skipActionKeys;
  assert.ok(skip instanceof Set, 'builder 应收到 skipActionKeys（集合）');
  for (const k of Object.keys(DERIVE_GROUP_DOMAIN)) {
    assert.ok(skip.has(k), `skipActionKeys 应含 7 类键：${k}`);
  }
});

// ════════════════════════════════════════════════════════════════
//  ② 展示补充不改业务事实
// ════════════════════════════════════════════════════════════════

test('② 服务端成功：decorateServerGroups 只补展示字段（bulkHtml），groupKey/count/items 不变', async () => {
  const res = await collectRealtimeGroups({
    role: 'secretary',
    fetchServerGroups: async () => ({ status: 'ok', groups: serverGroupsSample() }),
    buildRealtimeGroups: () => [],
    decorateServerGroups: (_ctx, groups) => groups.map((g) => (
      g.actionKey === 'member-confirm' ? { ...g, bulkHtml: '<div data-mc-id="srv-mc-1"></div>' } : g
    )),
  });
  const mc = byKey(res.groups, 'secretary:member-confirm');
  assert.ok(mc, '成员变更组应在结果里');
  assert.match(mc.bulkHtml, /data-mc-id="srv-mc-1"/, '展示补充生效（批量块）');
  assert.equal(mc.groupKey, 'secretary:member-confirm', 'groupKey 不改');
  assert.equal(mc.count, 2, 'count 不改');
  assert.deepEqual(mc.items.map((it) => it.id), ['srv-mc-1', 'srv-mc-2'], 'items 不改');
});

// ════════════════════════════════════════════════════════════════
//  ③ 服务端失败：客户端兜底，不生成新事实
// ════════════════════════════════════════════════════════════════

test('③ 服务端失败：客户端兜底（同一份数据逐键一致）且回非空 error（不得静默 / 不得写成成功）', async () => {
  const clientOpts = [];
  const cycle = { groupKey: 'module-cycle-remind', actionKey: 'module-cycle-remind', domain: 'project', title: '本周期尚未开展', count: 1, items: [{ id: 'cyc-1' }] };
  const clientGroups = clientGroupsSample();
  const res = await collectRealtimeGroups({
    role: 'secretary',
    fetchServerGroups: async () => ({ status: 'failed', groups: [] }),
    buildRealtimeGroups: (_ctx, opts) => { clientOpts.push(opts); return clientGroups.map((g) => ({ ...g })); },
    moduleCycleGroups: () => [cycle],
  });

  assert.equal(res.source, 'client', '失败 ⇒ 客户端兜底');
  assert.ok(res.error && typeof res.error === 'string', '失败必须回可见提示文案（不得静默）');
  assert.doesNotMatch(res.error, /成功|已完成/, '失败提示不得写成成功');
  assert.equal(clientOpts[0], undefined, '兜底时全量派生（不传 skipActionKeys）');

  // 不生成新业务事实：结果＝「客户端派生 + 模块周期」，逐键 / 计数一致，无凭空组
  const expected = [...clientGroups, cycle].map((g) => g.groupKey);
  assert.deepEqual(keysOf(res.groups).sort(), expected.slice().sort(), '兜底结果只由同一份已拉取数据派生（不增不减）');
  const expectedByKey = new Map([...clientGroups, cycle].map((g) => [g.groupKey, g.count]));
  for (const g of res.groups) {
    assert.equal(g.count, expectedByKey.get(g.groupKey), `${g.groupKey} 的 count 与派生输入相等（不新造事实）`);
  }
  assert.ok(res.groups.length > 0, '失败路径也不得空页（有数据 ⇒ 有内容）');
});

// ════════════════════════════════════════════════════════════════
//  ④ mock 数据源：客户端派生是正常路径（不算失败）
// ════════════════════════════════════════════════════════════════

test('④ mock 数据源（unavailable）：客户端派生为正常路径，不冒充失败', async () => {
  const res = await collectRealtimeGroups({
    role: 'disc-commissioner',
    fetchServerGroups: async () => ({ status: 'unavailable', groups: [] }),
    buildRealtimeGroups: () => [
      { groupKey: 'disc-commissioner:attendance-confirm', actionKey: 'attendance-confirm', count: 1, items: [{ id: 'a1' }] },
    ],
    moduleCycleGroups: () => [],
  });
  assert.equal(res.source, 'client');
  assert.equal(res.error, null, 'mock 形态不是失败，不得提示加载失败');
  assert.deepEqual(keysOf(res.groups), ['disc-commissioner:attendance-confirm']);
});

// ════════════════════════════════════════════════════════════════
//  ⑤ 服务端成功但空组：客户端不得把已接管键「猜」回来
// ════════════════════════════════════════════════════════════════

test('⑤ 服务端成功但返回空组：客户端不得补出服务端已接管的键（其余展示组照旧）', async () => {
  const res = await collectRealtimeGroups({
    role: 'secretary',
    fetchServerGroups: async () => ({ status: 'ok', groups: [] }),
    buildRealtimeGroups: () => clientGroupsSample(),
    moduleCycleGroups: () => [],
  });
  assert.equal(res.source, 'server');
  assert.ok(!byKey(res.groups, 'secretary:attendance-remind'), '服务端说无此组 ⇒ 客户端不得补（防客户端事实与服务端打架）');
  assert.ok(!byKey(res.groups, 'secretary:member-confirm'), '同上（成员变更组）');
  assert.ok(byKey(res.groups, 'secretary:archive-remind'), '服务端不产出的键仍由客户端补');
});

// ════════════════════════════════════════════════════════════════
//  ⑥ 支书派生器：skipActionKeys 生效（默认路径不调用 7 类 builder）
// ════════════════════════════════════════════════════════════════

test('⑥ computeAggregates({skipActionKeys})：服务端已接管键不派生，其余键照旧', () => {
  beginMockCase();
  // 造一条已结束且无考勤 / 复盘的活动 ⇒ attendance-remind 与 review-remind 必然出现
  mockDB.activities = [{ id: 'act-old', title: '已结束活动', date: '2026-08-01', status: 'completed' }];
  mockDB.attendances = [];
  mockDB.inspections = [];
  mockDB.activityReviews = [];
  mockDB.archiveRecords = [];

  const full = SecretaryTodoDeriver.computeAggregates();
  assert.ok(full.length > 0, '前置：种子场景下应派生出组（否则本用例空转）');
  const fullKeys = full.map((g) => g.actionKey);

  const skipped = SecretaryTodoDeriver.computeAggregates({ skipActionKeys: SERVER_OWNED_ACTION_KEYS });
  const skippedKeys = skipped.map((g) => g.actionKey);
  for (const k of SERVER_OWNED_ACTION_KEYS) {
    assert.ok(!skippedKeys.includes(k), `skipActionKeys 生效：${k} 不得再派生`);
  }
  // 非接管键（复盘 / 归档 提醒与复核）不得被误伤
  const clientOnly = fullKeys.filter((k) => !SERVER_OWNED_ACTION_KEYS.has(k));
  assert.deepEqual(skippedKeys, clientOnly, '非接管键的派生结果与全量一致');
  // 至少有一个非接管键真实存在（防「两边都空」让上一条退化）
  assert.ok(clientOnly.length > 0, '前置：本场景应至少有一个服务端不接管的组（如 review-remind）');
});

// ════════════════════════════════════════════════════════════════
//  ⑦ 静态锚点（防接线回潮：两处调用方都传了展示补充）
// ════════════════════════════════════════════════════════════════

test('⑦ 接线守卫：支书 / 组织两台的 createTodoTab 均传 decorateServerGroups，且壳内不再无条件合并客户端组', () => {
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  const shell = read('docs/src/components/record/todo-tab-shell.js');
  assert.match(shell, /export async function collectRealtimeGroups\(/, '壳应导出可测的收集函数');
  assert.match(shell, /skipActionKeys: SERVER_OWNED_ACTION_KEYS/, '壳应以 skipActionKeys 告知各台不再派生已接管键');
  assert.doesNotMatch(shell, /\[\.\.\.serverGroups, \.\.\.clientGroups\]/, '不得再无条件「服务端在前 + 客户端全量」合并');
  for (const rel of ['docs/src/entries/tabs/secretary/todo-tab.js', 'docs/src/entries/tabs/org/todo-tab.js']) {
    assert.match(read(rel), /decorateServerGroups:\s*_decorate/, `${rel} 应传 decorateServerGroups（展示补充）`);
  }
});
