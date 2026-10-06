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
//
// ⚠ 对 docs/src 的相对 import 必须带与源码一致的 `?v=` query（模块缓存键一致性）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261006c';
import { PersonStore } from '../../docs/src/services/member/person.js?v=20261006c';
import { setDataSource, getDataSource } from '../../docs/src/data/data-adapter.js?v=20261006c';

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
