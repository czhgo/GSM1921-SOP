// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/write-truth-guard.test.mjs — 「写成功可证」常驻守卫（Task 3 · 2026-10-26）
// ════════════════════════════════════════════════════════════════
// 立据（spec「api 形态禁止 mock 回退」+「写入成功必须可证」）：
//   ① api 形态下六个读口/种子口不得回退演示种子（空库=空态）；
//   ② `persist()` 的 flush 不得对「快照未覆盖的业务集合」直接 resolve：
//      必须走语义端点，或带 collection 名显式失败；
//   ③ 写失败进入 pending-writes 的持久 outbox，且 outbox 有重试/放弃路径；
//   ④ 纯本机域（registry 标 temp）可本机成功，但必须显示「本机未同步」。
//
// 判据分层（两层法，与既有守卫同规）：
//   · A 静态层：源码事实（回退闸门、单一源清单、flush 分流、outbox 出口）；
//   · B 行为层：真跑 `data-adapter` 的 api 形态 flush（假适配器），证明
//     agendaVotes 未被静默 resolve、快照域照常发、失败入 outbox 且可重试/放弃。
//
// 故障注入（交付说明记录读数）：
//   · 恢复一处 `return [...ACTIVITIES]`（删掉 api 闸门）⇒ A1 红；
//   · 让 flush 对 agendaVotes 直接 resolve（不调 annotate）⇒ B2 红。
// ════════════════════════════════════════════════════════════════
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 取具名函数体（从声明到下一个顶格 `}`；够用且与 pending-writes 守卫同法） */
function fnBody(src, decl) {
  const i = src.indexOf(decl);
  assert.notEqual(i, -1, `未找到 ${decl}`);
  const rest = src.slice(i);
  const end = rest.indexOf('\n}');
  return end === -1 ? rest : rest.slice(0, end);
}

/** 取某个 `if (...)` 分支体（到下一个 `} else {`；用于只审视 api 分支，避免误扫 mock 分支） */
function branchOf(src, markerRe) {
  const m = markerRe.exec(src);
  assert.ok(m, `未找到分支标记：${markerRe}`);
  const rest = src.slice(m.index);
  const end = rest.indexOf('} else {');
  return end === -1 ? rest : rest.slice(0, end);
}

/** 去掉 JS 注释（只审视代码事实；注释里提到种子常量不算回退） */
function withoutComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// ── A 静态层 ──────────────────────────────────────────────────────────

test('A1 六个读口/种子口：api 形态有显式闸门，且闸门在种子常量之前', () => {
  const cases = [
    {
      file: 'docs/src/services/activity/activity.js',
      decl: 'export function loadActivities()',
      seed: 'ACTIVITIES',
    },
    {
      file: 'docs/src/services/activity/attendance.js',
      decl: 'export function loadAttendanceRecords()',
      seed: 'ATTENDANCE_RECORDS',
    },
    {
      file: 'docs/src/services/activity/inspection.js',
      decl: 'export function loadInspectionRecords()',
      seed: 'INSPECTION_RECORDS',
    },
  ];
  for (const c of cases) {
    const body = fnBody(read(c.file), c.decl);
    const gate = body.indexOf("getDataSource() === 'api'");
    const seed = body.indexOf(`[...${c.seed}]`);
    assert.ok(gate !== -1, `${c.file}：${c.decl} 缺少 api 形态闸门（getDataSource() === 'api'）`);
    assert.ok(seed !== -1, `${c.file}：${c.decl} 未找到种子回退（${c.seed}），守卫抽取面失效`);
    assert.ok(gate < seed, `${c.file}：api 闸门必须在种子回退之前（否则空表仍回退演示数据）`);
  }

  const notice = fnBody(read('docs/src/services/governance/notice.js'), '  init() {');
  assert.match(notice, /getDataSource\(\) === 'api' \|\| isInitStateActive\(\)/,
    'NoticeStore.init：api 形态与 init 态同一道闸（不补 MOCK_NOTICES、不落库）');
  const noticeApiBranch = withoutComments(branchOf(notice, /getDataSource\(\) === 'api' \|\| isInitStateActive\(\)/));
  assert.doesNotMatch(noticeApiBranch, /MOCK_NOTICES|_saveNotices/,
    'NoticeStore.init：api 形态分支不得写 MOCK_NOTICES 或 _saveNotices');

  const signup = fnBody(read('docs/src/services/activity/signup.js'), '  init() {');
  assert.match(signup, /getDataSource\(\) === 'api' \|\| isInitStateActive\(\)/,
    'SignupStore.init：api 形态与 init 态同一道闸（不补 SEED_SIGNUPS、不落库）');
  const signupApiBranch = withoutComments(branchOf(signup, /getDataSource\(\) === 'api' \|\| isInitStateActive\(\)/));
  assert.doesNotMatch(signupApiBranch, /SEED_SIGNUPS|_saveSignups/,
    'SignupStore.init：api 形态分支不得写 SEED_SIGNUPS 或 _saveSignups');

  const todo = fnBody(read('docs/src/services/governance/todo.js'), 'export function seedTodos()');
  const todoGate = todo.indexOf("getDataSource() === 'api'");
  const todoSeed = todo.indexOf('const seeds = SEED_TODOS');
  assert.ok(todoGate !== -1, 'seedTodos：缺少 api 形态闸门');
  assert.ok(todoSeed !== -1, 'seedTodos：未找到 SEED_TODOS 补种路径，守卫抽取面失效');
  assert.ok(todoGate < todoSeed, 'seedTodos：api 闸门必须在补种之前（api 形态一律不补种子）');
  assert.match(todo.slice(todoGate, todoGate + 260), /return;/,
    'seedTodos：api 形态分支必须提前返回（不得继续 _saveTodos / persist 种子）');
});

test('A2 集合级单一源：SNAPSHOT_COVERED 与 _buildSnapshotPayload 逐键一致，local-only 标 temp', async () => {
  const reg = await import('../../docs/src/data/cache-registry.js?v=20261028a');
  const adapterSrc = read('docs/src/data/data-adapter.js');
  const payload = fnBody(adapterSrc, 'function _buildSnapshotPayload(mockDB)');
  const payloadKeys = [...payload.matchAll(/^ {4}(\w+):/gm)].map((m) => m[1]);
  assert.ok(payloadKeys.length >= 20, `快照 payload 键只解析到 ${payloadKeys.length} 个（抽取面失效）`);
  assert.deepEqual([...reg.SNAPSHOT_COVERED_COLLECTIONS].sort(), payloadKeys.sort(),
    'SNAPSHOT_COVERED_COLLECTIONS 必须与 _buildSnapshotPayload 的键逐一对应（单一源漂移）');

  assert.ok(reg.LOCAL_ONLY_COLLECTIONS.includes('committeeBroadcasts'), 'committeeBroadcasts 必须登记为只应本机');
  for (const name of reg.LOCAL_ONLY_COLLECTIONS) {
    assert.equal(reg.LOCAL_ONLY_COLLECTION_META[name].category, 'temp', `${name}：只应本机域必须标 temp`);
    assert.ok(String(reg.LOCAL_ONLY_COLLECTION_META[name].reason || '').length >= 10, `${name}：必须写理由`);
  }
  assert.ok(reg.SEMANTIC_SYNC_COLLECTIONS.includes('agendaVotes'), 'agendaVotes 必须登记为语义写域');
  assert.ok(reg.SEMANTIC_SYNC_COLLECTIONS.includes('memberChangeRequests'), 'memberChangeRequests 必须登记为语义写域');
  assert.equal(reg.classifyCacheKey('gsm1921-pending-writes-outbox'), 'temp', 'outbox 本地键必须登记为 temp');
});

test('A3 flush 必须按类别分流：语义端点 / 快照 / 本机 / 显式失败（无 agendaVotes 直通 resolve）', () => {
  const src = read('docs/src/data/data-adapter.js');
  const dirty = fnBody(src, 'function _collectDirty(mockDB)');
  assert.match(dirty, /SEMANTIC_SYNC_COLLECTIONS/, '_collectDirty 必须把语义写域纳入脏判定');
  assert.match(dirty, /LOCAL_ONLY_COLLECTIONS/, '_collectDirty 必须把只应本机域纳入脏判定');

  const flush = fnBody(src, 'async function _flushSnapshot()');
  assert.match(flush, /_flushSemanticCollections\(/, 'flush 必须把语义写域交给行级端点');
  assert.match(flush, /_collectionError\(/, 'flush 必须能带 collection 名显式失败');
  assert.match(flush, /recordOutboxFailure\(/, 'flush 失败必须进入 outbox');
  assert.match(flush, /deferred\?\.reject\(/, 'flush 失败必须结算失败（成功提示据此改报失败）');
  assert.match(flush, /throw e;/, 'flush 失败必须向上抛');
  assert.doesNotMatch(flush, /dirty\.agendaVotes[\s\S]{0,120}resolve\(/,
    '不得对 agendaVotes 直接 resolve（假保存）');
  assert.doesNotMatch(flush, /agendaVotes[^\n]*deferred\?\.resolve/,
    '不得对 agendaVotes 直接 resolve（假保存）');
});

test('A4 outbox：持久键 / 重试 / 放弃三条路径在位', () => {
  const pw = read('docs/src/core/session/pending-writes.js');
  assert.match(pw, /gsm1921-pending-writes-outbox/, 'outbox 必须有持久键');
  for (const fn of ['recordOutboxFailure', 'listOutbox', 'clearOutbox', 'discardOutbox', 'retryOutbox', 'registerOutboxRetry']) {
    assert.match(pw, new RegExp(`export function ${fn}\\(|export async function ${fn}\\(`), `pending-writes 缺少 ${fn}`);
  }
  assert.match(read('docs/src/data/data-adapter.js'), /registerOutboxRetry\(/, 'data-adapter 必须注册 outbox 重试钩子');
});

// ── B 行为层：api 形态 flush（假适配器，无网络）──────────────────────────

function makeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261028a');
const dataAdapter = await import('../../docs/src/data/data-adapter.js?v=20261028a');
const pending = await import('../../docs/src/core/session/pending-writes.js?v=20261028a');
const { describeWriteError } = await import('../../docs/src/core/base/utils.js?v=20261028a');

const INITIAL_VOTES = [{ id: 'av-guard-1', branchId: 'br-b1', activityId: 'act-guard', agendaItemId: 'ag-1', personId: 'p-guard', position: 'agree' }];
const INITIAL_MCR = [{ id: 'mcr-guard-1', branchId: 'br-b1', personId: 'p-guard', status: 'pending-org-approval', activityId: 'act-guard', agendaItemId: 'ag-1' }];

const calls = { snapshots: [], votes: [], mcr: [] };
let snapshotMode = 'ok';

/** 任意未显式声明的资源组：`list()` 返回空数组，其余属性继续链式可点 */
const NOOP = new Proxy(function noopFn() { return Promise.resolve([]); }, {
  get: (_t, key) => {
    if (key === 'then') return undefined;
    if (key === 'list' || key === 'listMine') return async () => [];
    return NOOP;
  },
});

const adapter = {
  versions: async () => ({ versions: {} }),
  snapshot: async (payload) => {
    calls.snapshots.push(payload);
    if (snapshotMode === 'network') throw Object.assign(new Error('Failed to fetch'), { type: 'NetworkError' });
    if (snapshotMode === 'server') throw Object.assign(new Error('服务暂时不可用'), { status: 503, body: { error: '服务暂时不可用' } });
    return { versions: Object.fromEntries(Object.keys(payload).filter((k) => k !== '_versions').map((k) => [k, 1])) };
  },
  agendaVotes: {
    list: async () => INITIAL_VOTES.map((r) => ({ ...r })),
    annotate: async (id, patch) => { calls.votes.push([id, patch]); return { id, ...patch }; },
  },
  memberChangeRequests: {
    list: async () => INITIAL_MCR.map((r) => ({ ...r })),
    annotate: async (id, patch) => { calls.mcr.push([id, patch]); return { id, ...patch }; },
  },
};
const adapterProxy = new Proxy(adapter, { get: (t, key) => (key in t ? t[key] : NOOP) });

dataAdapter.setDataSource('api', { apiBaseUrl: 'http://guard.local', authToken: 'guard-token' });
dataAdapter.registerApiAdapter(adapterProxy);
await dataAdapter.init();

after(() => {
  dataAdapter.setDataSource('mock');
  pending.clearOutbox();
});

test('B1 快照覆盖域：脏集合照常随 POST /snapshot 发出（带 _versions），并清掉 outbox', async () => {
  calls.snapshots.length = 0;
  pending.clearOutbox();
  mockDB.notices = [{ id: 'ntc-guard-1', branchId: 'br-b1', title: '守卫' }];
  await dataAdapter.flushSnapshot();
  assert.equal(calls.snapshots.length, 1, '快照覆盖域必须真的发出一次快照');
  const payload = calls.snapshots[0];
  assert.ok(Array.isArray(payload.notices), 'payload 必须包含 notices');
  assert.equal(payload.notices[0].id, 'ntc-guard-1');
  assert.equal(payload._versions.notices, 0, '必须携带该集合的基线版本');
  assert.equal(pending.listOutbox().length, 0, '成功后不得残留 outbox');
});

test('B2 非快照业务域：agendaVotes / memberChangeRequests 必须走语义端点，不得静默 resolve', async () => {
  calls.snapshots.length = 0;
  calls.votes.length = 0;
  calls.mcr.length = 0;
  pending.clearOutbox();
  const at = '2026-10-26T08:00:00.000Z';
  mockDB.agendaVotes = [{ ...INITIAL_VOTES[0], transferredOutAt: at }];
  mockDB.memberChangeRequests = [{ ...INITIAL_MCR[0], status: 'cancelled', cancelledAt: at, transferredOutAt: at }];
  await dataAdapter.flushSnapshot();
  assert.equal(calls.snapshots.length, 0, '纯语义写不应发快照');
  assert.deepEqual(calls.votes, [['av-guard-1', { transferredOutAt: at }]], 'agendaVotes 必须调用行级语义端点');
  assert.deepEqual(calls.mcr, [['mcr-guard-1', { status: 'cancelled', cancelledAt: at, transferredOutAt: at }]],
    'memberChangeRequests 必须调用取消/标注语义端点');
  assert.equal(pending.listOutbox().length, 0, '语义端点成功后不得残留 outbox');
});

test('B3 语义写域不支持的形状：带 collection 名显式失败并进入 outbox（成功提示会改报失败）', async () => {
  pending.clearOutbox();
  mockDB.agendaVotes = [{ ...INITIAL_VOTES[0], position: 'oppose' }]; // 改票：没有语义端点
  let error = null;
  try { await dataAdapter.flushSnapshot(); } catch (e) { error = e; }
  assert.ok(error, '不支持的语义变更必须 reject，不得 resolve');
  assert.match(String(error.message), /agendaVotes/, '失败原因必须带 collection 名');
  assert.deepEqual(error.collections, ['agendaVotes'], 'error.collections 必须给出集合名');
  assert.match(describeWriteError(error), /^未同步：/, '用户可见文案必须显示「未同步」');
  const entry = pending.listOutbox().find((e) => (e.collections || []).includes('agendaVotes'));
  assert.ok(entry, '失败必须进入持久 outbox');
});

test('B4 快照写失败：进入 outbox + 「未同步」；重试成功后清空；放弃可移除', async () => {
  pending.clearOutbox();
  calls.snapshots.length = 0;
  // 复位语义域到「已提交基线」（B2 已把带 transferredOutAt 的版本推进为基线）
  mockDB.agendaVotes = [{ ...INITIAL_VOTES[0], transferredOutAt: '2026-10-26T08:00:00.000Z' }];
  snapshotMode = 'network';
  mockDB.todos = [{ id: 'td-guard-1', branchId: 'br-b1', title: '守卫待办', status: 'pending' }];
  dataAdapter.persist(); // 800ms 防抖排程
  let error = null;
  try { await dataAdapter.flushSnapshot(); } catch (e) { error = e; }
  assert.ok(error, '断网写入必须失败（不得 resolve）');
  assert.match(describeWriteError(error), /^未同步：/, '断网失败提示必须含「未同步」');
  const entry = pending.listOutbox().find((e) => (e.collections || []).includes('todos'));
  assert.ok(entry, '失败必须进入持久 outbox');

  // 恢复网络 → 重试：基线未推进 ⇒ 仍脏 ⇒ 再发一次快照并清空 outbox
  snapshotMode = 'ok';
  const retried = await pending.retryOutbox();
  assert.equal(retried.ok, true, `重试应成功（实测 ${JSON.stringify(retried)}）`);
  assert.equal(pending.listOutbox().filter((e) => e.kind !== 'local-only').length, 0, '重试成功后应清除 outbox');

  // 放弃路径
  const made = pending.recordOutboxFailure({ collections: ['notices'], message: '候选失败' });
  assert.equal(pending.discardOutbox(made.id), true, 'discardOutbox 必须能移除条目');
  assert.equal(pending.listOutbox().some((e) => e.id === made.id), false);
});

test('B5 只应本机域：本地成功但显示「本机未同步」（registry 标 temp）', async () => {
  pending.clearOutbox();
  calls.snapshots.length = 0;
  mockDB.committeeBroadcasts = [{ id: 'cb-guard-1', branchId: 'br-b1', recipientId: 'p-guard', read: true }];
  await dataAdapter.flushSnapshot();
  assert.equal(calls.snapshots.length, 0, '只应本机域不应发快照');
  const entry = pending.listOutbox().find((e) => e.kind === 'local-only');
  assert.ok(entry, '只应本机域必须记录「本机未同步」');
  assert.ok((entry.collections || []).includes('committeeBroadcasts'));
  const retried = await pending.retryOutbox();
  assert.equal(retried.reason, 'empty', '本机域没有可重试路径（不计入自动重试）');
  pending.clearOutbox();
});
