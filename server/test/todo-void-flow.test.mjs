// role: [工程师]+[AI]
// server/test/todo-void-flow.test.mjs — 待办「作废」状态机定向件（`#1` / `D-742` / `D-743` / 批次 340）
//
// 背景（支书 2026-10-02 三条答复，`D-742` 规格）：
//   「作废为主 · 硬删只留支委」；「责任人可作废但需报支委会」；「报支委会」取**甲 审批门**——
//   责任人 `requestVoid` → 待办**先不消失**（标 `voidPending`、挂「待支委会确认」）→ 支委
//   `confirmVoid` 后才 `voided` 出列；`rejectVoid` 回原状并留 `voidRejected`。
//   本件覆盖服务层状态机与两项防回潮口径（硬删只留支委层 / 作废·删除只对落库组渲染）。
// 运行：node --test test/todo-void-flow.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261005g';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261005g';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261005g';
import { TodoStore, TodoCategory } from '../../docs/src/services/governance/todo.js?v=20261005g';

const ROOT = join(import.meta.dirname, '..', '..');

// ── localStorage 内存桩（与 perf-todo-agg-cache 同款）─────────────
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

/** 每例独立现场：清存储 + 复位业务域 + 恢复 seed */
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

/** 造一条 org-commissioner 待办（track/pending；显式 domain 保留） */
function mk(partial = {}) {
  return TodoStore.create({
    title: '活动复盘未提交',
    description: '',
    role: 'org-commissioner',
    category: TodoCategory.TRACK,
    actionKey: 'review-remind',
    actionType: 'track',
    domain: 'activity',
    priority: 'normal',
    deadline: null,
    ...partial,
  });
}

// ── V1 原因必填（「作废」与「完成」的分野）─────────────────────────
test('V1 无原因不得作废：requestVoid/confirmVoid 空原因一律拒绝', () => {
  beginMockCase();
  const t = mk();
  assert.equal(TodoStore.requestVoid(t.id, { reason: '   ' }), null, '空原因申请应被拒');
  assert.equal(!!TodoStore.getById(t.id).voidPending, false, '空原因申请不得落 voidPending');
  assert.equal(TodoStore.confirmVoid(t.id, { byPersonId: 'p13' }), null, '未申请且无 note ⇒ 直接作废也应被拒（原因必填）');
  assert.equal(!!TodoStore.getById(t.id).voided, false, '被拒的作废不得落 voided');
});

// ── V2 申请（审批门第一段）：待办**先不消失**，进支委待确认集 ─────────
test('V2 requestVoid：落 voidPending、列表照常可见、进入 getVoidPending', () => {
  beginMockCase();
  const t = mk();
  const r = TodoStore.requestVoid(t.id, { reason: '活动早已结束，此项不该再挂', byPersonId: 'p6' });
  assert.ok(r && r.voidPending, 'requestVoid 应落 voidPending');
  assert.equal(r.voidPending.reason, '活动早已结束，此项不该再挂');
  assert.equal(r.voidPending.byPersonId, 'p6');
  assert.equal(!!r.voided, false, '申请阶段不得直接 voided');

  // 列表照常可见（默认过滤只挡 voided，不挡 voidPending）
  assert.ok(TodoStore.getByRole('org-commissioner').some(x => x.id === t.id), '申请中的待办应仍在列表中');
  // 支委待确认集（支书台实时组数据源）
  assert.ok(TodoStore.getVoidPending().some(x => x.id === t.id), 'getVoidPending 应含该条');
  // 域折组照常出列（胶囊由渲染层按 items[].voidPending 挂）
  const doms = TodoStore.getDomainsWithGroups('org-commissioner');
  const grp = doms.flatMap(d => d.groups || []).find(g => g.items.some(x => x.id === t.id));
  assert.ok(grp, '申请中的待办应仍出现在域折组里');
  assert.equal(grp.persisted, true, '落库聚合组应带 persisted 标记（渲染层据此渲染作废/删除）');
  assert.ok(grp.items.some(x => x.voidPending), '组内条目应带 voidPending（挂「待支委会确认」胶囊的依据）');
});

// ── V3 确认（支委层）：落 voided、清 voidPending、默认出列、可回看 ────
test('V3 confirmVoid：落 voided 且默认列表出列，includeVoided 可回看', () => {
  beginMockCase();
  const t = mk();
  TodoStore.requestVoid(t.id, { reason: '重复派生', byPersonId: 'p6' });
  const r = TodoStore.confirmVoid(t.id, { byPersonId: 'p13' });
  assert.ok(r && r.voided, 'confirmVoid 应落 voided');
  assert.equal(r.voided.reason, '重复派生', '作废原因沿用申请原因');
  assert.equal(r.voided.confirmedBy, 'p13');
  assert.equal(!!r.voidPending, false, '确认后应清掉 voidPending');

  assert.equal(TodoStore.getByRole('org-commissioner').some(x => x.id === t.id), false, 'voided 默认应从列表出列');
  assert.equal(TodoStore.getByRole('org-commissioner', { includeVoided: true }).some(x => x.id === t.id), true, 'includeVoided 应可回看');
  assert.equal(TodoStore.getVoidPending().length, 0, '确认后不再属于待确认集');
});

// ── V4 驳回（支委层）：回原状 + 留 voidRejected ────────────────────
test('V4 rejectVoid：清 voidPending 回原状（列表可见）并留 voidRejected', () => {
  beginMockCase();
  const t = mk();
  TodoStore.requestVoid(t.id, { reason: '不办了', byPersonId: 'p6' });
  const r = TodoStore.rejectVoid(t.id, { byPersonId: 'p13', note: '先留一周，仍须办结' });
  assert.ok(r, 'rejectVoid 应返回更新后的行');
  assert.equal(!!r.voidPending, false, '驳回后应清 voidPending');
  assert.equal(!!r.voided, false, '驳回不得作废');
  assert.equal(r.voidRejected && r.voidRejected.note, '先留一周，仍须办结', '驳回意见应留痕');
  assert.equal(r.voidRejected && r.voidRejected.reason, '不办了', '原申请原因应留痕');

  assert.ok(TodoStore.getByRole('org-commissioner').some(x => x.id === t.id), '驳回后该待办应回到列表');
  assert.equal(TodoStore.getVoidPending().length, 0, '驳回后不再属于待确认集');
});

// ── V5 防回潮（源码级）：硬删只留支委层；作废·删除只对落库组渲染 ──────
test('V5 防回潮：硬删只在支委层渲染；作废/删除只对落库组渲染', () => {
  const shell = readFileSync(join(ROOT, 'docs/src/components/record/todo-tab-shell.js'), 'utf8');
  // 支委层集合取自单一源（不得手写五角色表）
  assert.match(shell, /BRANCH_COMMISSION_ROLES/, '壳体应从 constants.js 取支委层集合（单一源）');
  assert.match(shell, /const isCommittee = BRANCH_COMMISSION_ROLES\.includes\(role\)/, '壳体应据 role 解析是否支委层');
  // 缺省硬删**只**在支委层生效（非支委层不再渲染硬删）
  assert.match(shell, /\} else if \(isCommittee\) \{[\s\S]*?TodoStore\.delete\(t\.id\)/, '缺省硬删应被 isCommittee 守住（硬删只留支委层）');
  // 作废缺省流程：支委层 confirmVoid 直接生效 / 其余 requestVoid 走审批门
  assert.match(shell, /TodoStore\.confirmVoid\(/, '支委层作废应走 confirmVoid（直接生效）');
  assert.match(shell, /TodoStore\.requestVoid\(/, '非支委层作废应走 requestVoid（审批门）');

  const list = readFileSync(join(ROOT, 'docs/src/components/record/todo-list.js'), 'utf8');
  assert.match(list, /const canDelete = g\.persisted && typeof onDeleteTodo === 'function'/, '硬删键应只在落库待办组渲染（实时组无 id，渲染即空转）');
  assert.match(list, /const canVoid = g\.persisted && typeof onVoidTodo === 'function'/, '作废键应只在落库待办组渲染');
  assert.match(list, /-todo-void-btn/, '作废键应有点击委托');
});
