// role: [工程师]+[AI]
// server/test/member-roster-api-read.test.mjs — 名册读链「api 形态」回归判据（2026-10-06 批次 420 · 收 `R-49` 的 `Q-23-9`）
// 纯 Node 测试（无浏览器、不起 server）。
//
// 背景（`R-49`：`Q-23-9`「api 形态名册读链未回归，`getMembers()` 不含 server 新建成员」）：
//   2026-10-06 批次 420 实探——`docs/src/services/member/person.js::_baseMemberRecords()` 在 **api 形态
//   已分支**读 `mockDB.users`（该缓存由 `data-adapter.init()` 自服务端灌入；mock 形态才走
//   `PEOPLE` 种子 ＋ members 覆盖层）⇒ **读链代码路径本身已正确**；缺的是**一条回归判据**——
//   全仓此前没有「api 形态下 `PersonStore.getMembers()` 含服务端新建成员」的用例（本文件即补此缺）。
//
// 判据两条（正例 ＋ 反例，防「只是碰巧为空」的假绿）：
//   R1 正例：`setDataSource('api')` 后把「服务端新建成员」放进 `mockDB.users` ⇒ `getMembers()` 必须读到它。
//   R2 反例：`setDataSource('mock')` 时只改 `mockDB.users` ⇒ `getMembers()` **不得**读到（读链口径不得混淆）。
//   R3（harden-cross-layer-correctness Task 2.1）：`users.list({ branchId })` 请求 URL 必须携带该支部参数
//      （党委未选支部时服务端对支部明细返回空表；支部管理按支行名册读取，参数丢失 ⇒ 名册恒空）。
//   R4（Task 2.2）：可见性清单经成员档案门面取名册 ⇒ 名册新增成员后支书 L2 全局清单即时包含该人。
//
// ⚠ 对 docs/src 的相对 import 必须带与源码一致的 `?v=` query（模块缓存键一致性）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261120a';
import { PersonStore } from '../../docs/src/services/member/person.js?v=20261120a';
import { setDataSource, getDataSource } from '../../docs/src/data/data-adapter.js?v=20261120a';
import { ApiAdapter } from '../../docs/src/data/api-adapter.js?v=20261120a';
import { resolveVisibleTargets } from '../../docs/src/services/core/visibility.js?v=20261120a';

// ── localStorage 内存桩（person.js 惰性访问）────────────────────────────
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

const snapshotUsers = () => (mockDB.users || []).map((u) => ({ ...u }));

test('R1 api 形态：getMembers() 必须读到「服务端新建成员」（名册读链回归）', () => {
  const snap = snapshotUsers();
  try {
    setDataSource('api');
    assert.equal(getDataSource(), 'api', '前置断言：数据源未切到 api');
    mockDB.users = [...snap, { id: 'p-new', name: '服务端新建成员', role: 'member', branchId: 'b1' }];
    const ids = PersonStore.getMembers().map((m) => m.id);
    assert.ok(ids.includes('p-new'),
      `api 形态 getMembers() 未含服务端新建成员（实得 ${ids.length} 人）：读链退回种子 / 覆盖层`);
  } finally {
    mockDB.users = snap;
    setDataSource('mock');
  }
});

test('R2 反例：mock 形态不得读到只在 mockDB.users 里的人（读链口径不混）', () => {
  const snap = snapshotUsers();
  try {
    setDataSource('mock');
    mockDB.users = [...snap, { id: 'p-ghost', name: '幽灵', role: 'member' }];
    const ids = PersonStore.getMembers().map((m) => m.id);
    assert.ok(!ids.includes('p-ghost'),
      'mock 形态 getMembers() 竟读到了 mockDB.users（api 专属读链被混用）');
  } finally {
    mockDB.users = snap;
    setDataSource('mock');
  }
});

// ── R3：`users.list` 必须转发 branchId（fetch 桩拦 URL；不引入新依赖）──────────
test('R3 users.list({ branchId }) 请求 URL 含 branchId（党委按支部读名册）', async () => {
  const prevFetch = globalThis.fetch;
  const urls = [];
  try {
    setDataSource('api', { apiBaseUrl: 'http://adapter.test', authToken: 't-test' });
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return { ok: true, status: 200, json: async () => [] };
    };
    await ApiAdapter.users.list({ branchId: 'br-b2' });
    assert.equal(urls.length, 1, `期望 1 次请求，实得 ${urls.length} 次`);
    assert.match(urls[0], /[?&]branchId=br-b2(?:&|$)/,
      `users.list 未把 branchId 拼进 query（实得 ${urls[0]}）——党委按支部读名册会拿到空列表`);

    // 回归：branchId 与既有 includeTransferredOut 必须能同时携带，互不覆盖
    await ApiAdapter.users.list({ branchId: 'br-b2', includeTransferredOut: true });
    assert.match(urls[1], /[?&]branchId=br-b2(?:&|$)/, `同时传两参时丢了 branchId（实得 ${urls[1]}）`);
    assert.match(urls[1], /[?&]includeTransferredOut=1(?:&|$)/, `同时传两参时丢了 includeTransferredOut（实得 ${urls[1]}）`);
  } finally {
    globalThis.fetch = prevFetch;
    setDataSource('mock');
  }
});

// ── R4：可见性清单经成员档案门面取名册（api 形态名册新增 → 支书全局清单即时可见）──────────
test('R4 名册新增一人 → 支书 L2 全局可见清单经门面即时包含该人', () => {
  const snap = snapshotUsers();
  try {
    setDataSource('api');
    mockDB.users = [...snap, { id: 'p-visible-new', name: '新增成员', role: 'member', branchId: 'b1', partyGroup: '第一党小组' }];
    const targets = resolveVisibleTargets('secretary', 'p-viewer');
    const hit = targets.find((t) => t.personId === 'p-visible-new');
    assert.ok(hit, `支书可见清单未含名册新增成员（实得 ${targets.length} 人）——可见性仍读静态种子`);
    assert.equal(hit.name, '新增成员');
    assert.equal(hit.relation, '全局');
    assert.deepEqual(hit.dimensions, ['progress', 'blocker', 'report']);
  } finally {
    mockDB.users = snap;
    setDataSource('mock');
  }
});
