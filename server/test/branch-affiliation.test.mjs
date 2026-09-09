// role: [工程师]+[AI]
// server/test/branch-affiliation.test.mjs — 支部归属显式化（2026-09-09 书记批 A1/A2）
// 纯 Node（无浏览器、不起 server；mock 形态 + localStorage 内存桩，范式同 policy-config.test.mjs）：
//   ① getBoundBranch 归属判定矩阵（person 不存在 / branchId null/空 / branchId 查无 → null；查有 → branch；
//      party-staff（branchId null）→ null）
//   ② getBranchIdOfPerson 保留数据解析兜底语义（演示/存量兼容：undefined/查无档案/p_pc → 'br-b1'）
//   ③ getHeaderTitle：party-staff → 党委名；有归属 → config.headerTitle；登录无归属 → 中性「未绑定支部」
//      （不再泄漏示例支部名，placeholder 可覆盖）；未登录静态壳 → 数据解析兜底 / 末级兜底名（换壳范围）
// 运行：node --test test/branch-affiliation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260909e';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260909e';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260909e';
import { MEMBER_OVERLAY_KEY } from '../../docs/src/services/person.js?v=20260909e';
import {
  getBoundBranch, getBranchIdOfPerson, getHeaderTitle, getBranchById, getCommitteeName,
} from '../../docs/src/services/branch.js?v=20260909e';

// ── localStorage 内存桩 + mock 适配器注册（people 为静态种子，读链即时可用）──
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
registerMockAdapter(MockAdapter);
setDataSource('mock');

/** 每例独立现场：清存储 → 恢复 seed（branches br-b1 等；people 为静态种子不依赖 loadDB） */
function beginMockCase() {
  _store.clear();
  mockDB.branches = [];
  mockDB._loaded = false;
  MockAdapter.loadDB();
}

/** 覆写某人档案（members 覆盖层注入；branchId 显式 null/空/幽灵支部均可表达） */
function overlayPerson(id, fields) {
  _store.set(MEMBER_OVERLAY_KEY, JSON.stringify({ version: 1, upserts: [{ id, ...fields }], removedIds: [] }));
}

// ── ① getBoundBranch 归属判定矩阵 ────────────────────────────────────────
test('① getBoundBranch：person 不存在 / branchId null 或空 / branchId 查无 → null；查有 → 支部记录', () => {
  beginMockCase();
  assert.equal(getBoundBranch(undefined), null, '无 personId → null');
  assert.equal(getBoundBranch('p_ghost'), null, 'person 不存在 → null');
  assert.equal(getBoundBranch('p_pc'), null, 'party-staff 显式 branchId:null → null');

  const p1 = getBoundBranch('p1');
  assert.ok(p1 && p1.id === 'br-b1' && p1.name === '光华管理学院本科生党支部', '有归属 → 返回该支部记录');
  assert.equal(p1.config.headerTitle, '光华管理学院本科生党支部');

  overlayPerson('p_nobind', { name: '未绑定测试员', role: 'participant', branchId: null });
  assert.equal(getBoundBranch('p_nobind'), null, '档案 branchId null → null');

  overlayPerson('p_emptybind', { name: '空串测试员', role: 'participant', branchId: '' });
  assert.equal(getBoundBranch('p_emptybind'), null, '档案 branchId 空串 → null');

  overlayPerson('p_ghostbind', { name: '幽灵支部测试员', role: 'participant', branchId: 'br-ghost' });
  assert.equal(getBoundBranch('p_ghostbind'), null, 'branchId 存在但 getBranchById 查无 → null');
});

// ── ② getBranchIdOfPerson 数据解析兜底保留 ────────────────────────────────
test('② getBranchIdOfPerson 保留兜底语义（undefined/查无档案/party-staff → br-b1）', () => {
  beginMockCase();
  assert.equal(getBranchIdOfPerson(undefined), 'br-b1');
  assert.equal(getBranchIdOfPerson('p_ghost'), 'br-b1', '查无档案 → 兜底 br-b1（数据解析兜底）');
  assert.equal(getBranchIdOfPerson('p_pc'), 'br-b1', 'party-staff branchId null → 兜底 br-b1（演示兼容）');
  assert.equal(getBranchIdOfPerson('p1'), 'br-b1');
});

// ── ③ getHeaderTitle 归属语义 ─────────────────────────────────────────────
test('③ header：party-staff → 党委名；有归属 → config.headerTitle；登录无归属 → 中性「未绑定支部」', () => {
  beginMockCase();
  // 换皮 br-b1 的 headerTitle 便于区分「归属路径」与「末级兜底名」
  mockDB.branches = mockDB.branches.map(b => (b.id === 'br-b1'
    ? { ...b, config: { ...b.config, headerTitle: '页眉测试名' } }
    : b));

  assert.equal(getHeaderTitle('p13'), '页眉测试名', '有归属 → 该支部 config.headerTitle');
  assert.equal(getHeaderTitle('p_pc'), getCommitteeName(), 'party-staff → 院系党委名（不属于任一支部）');
  assert.equal(getHeaderTitle('p_pc'), '光华管理学院党委');

  overlayPerson('p_nobind', { name: '未绑定测试员', role: 'participant', branchId: null });
  assert.equal(getHeaderTitle('p_nobind'), '未绑定支部', '登录但无归属 → 中性占位，不泄漏示例支部名');
  assert.equal(getHeaderTitle('p_nobind', { placeholder: '待确认支部' }), '待确认支部', 'opts.placeholder 可覆盖');

  overlayPerson('p_ghostbind', { name: '幽灵支部测试员', role: 'participant', branchId: 'br-ghost' });
  assert.equal(getHeaderTitle('p_ghostbind'), '未绑定支部', 'branchId 查无 → 同为无归属中性占位');
});

test('③ header：未登录静态壳保持既有展示（数据解析兜底 br-b1 标题 / 无分支记录时末级兜底名）', () => {
  beginMockCase();
  mockDB.branches = mockDB.branches.map(b => (b.id === 'br-b1'
    ? { ...b, config: { ...b.config, headerTitle: '页眉测试名' } }
    : b));
  // 未登录（personId 缺省）：数据解析兜底 br-b1 → 其标题（静态壳既有显示，属换壳范围，不误报「未绑定」）
  assert.equal(getHeaderTitle(), '页眉测试名');
  assert.equal(getHeaderTitle('p_ghost'), '页眉测试名', 'personId 查无档案 → 同一数据解析兜底路径');

  // 数据层完全无分支记录（纯静态未加载数据链）：末级兜底名（示例名仅供静态展示，换壳范围注释在 branch.js）
  mockDB.branches = [];
  assert.equal(getHeaderTitle(), '光华管理学院本科生党支部', '无分支记录 → 末级兜底（静态展示需要）');
  assert.equal(getHeaderTitle('p13'), '未绑定支部', '登录成员在无支部数据时同样无归属 → 中性占位');
});
