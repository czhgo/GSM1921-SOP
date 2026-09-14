// server/test/notice-audience.test.mjs
// ════════════════════════════════════════════════════════════════
//  「通知受众 sentinel ↔ 消费端可见性」守卫（2026-09-13 Q-22-1 立）
// ════════════════════════════════════════════════════════════════
//  起因（真机实测 + 代码亲验）：支书经 UI 发布的任何通知，详情页都打不开
//   （notice.html?id=<该 id> 显示「通知不存在或已过期」）。两处互为因果：
//   ① 受众口径分裂：发布侧写 sentinel（['all'|'leaders'|'activists'|'candidates']），
//      消费端受众门却拿角色键（secretary/leader…）直比 → ['all'] 永不命中 →
//      「全体党员」实际等于**无人可见**；
//   ② 取数口误用可见性门：NoticeStore.getById 走 list({activeOnly:false,includeArchived:true})
//      把「消费端可见性过滤」套在「按 id 取数」上 → 连发布者都取不到自己发的通知。
//
//  修复契约（本守卫锁死）：
//    · 受众判定单一源 = core/constants.js 的 NOTICE_AUDIENCE_SENTINELS（发布侧↔消费端同源）；
//    · list() 受众门按 sentinel 判定，并对历史裸角色键回退直比；
//    · canReadNotice(notice, viewer) = 详情页读取权限单一源；
//    · getById(id) 只按 id 取数，不再套可见性门。
//
//  两层法风格（与 id-uniqueness.test.mjs 同构）：
//    N1~N4 list() 受众门（广播 / 角色 sentinel / 发展阶段 sentinel / 裸角色键兼容）
//    N5    getById 取数契约（脱离可见性门——本缺陷核心回归位）
//    N6    canReadNotice 读取权限规则
//    N7    无受众（audience:null）广播语义
//    N8    actionRoles 既有路径不受影响
//
//  ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 `?v=`；bump 版本后本文件戳须同步。
//  运行：node --test test/notice-audience.test.mjs（server 目录）
// ════════════════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260914a';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260914a';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260914a';
import { MOCK_NOTICES } from '../../docs/src/mock/index.js?v=20260914a';
import { NOTICE_AUDIENCE_OPTIONS } from '../../docs/src/core/constants.js?v=20260914a';
import { NoticeStore, canReadNotice } from '../../docs/src/services/notice.js?v=20260914a';

// ── localStorage 内存桩 + sessionStorage 空桩（与 thought-report-panel.test.mjs 同做法）──
// getCurrentUser 走 localStorage；A-11 防串扰仅在登录对象带 tabId 时才校验，本桩不带 tabId → 直取。
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

const LOGIN_KEY = 'gsm1921-login-user';
/** 以某身份登录（写 localStorage 登录键，无 tabId → getCurrentUser 直取） */
function loginAs(personId, role) { _store.set(LOGIN_KEY, JSON.stringify({ personId, role })); }
/** 退出登录（无会话） */
function logout() { _store.delete(LOGIN_KEY); }

const BASE = {
  title: '受众守卫用例', content: '正文', priority: 'normal',
  publishDate: '2026-09-01', expireDate: null, targetModule: 'workspace', read: false,
};

/** 重置到 mock 数据源并把给定通知作为权威数据（mockDB.notices 优先于内存态，见 NoticeStore._current） */
function beginCase(notices) {
  _store.clear();
  delete globalThis.window;
  mockDB.notices = [];
  mockDB.todos = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
  mockDB.notices = notices.map((n) => ({ ...n }));
  NoticeStore._notices = []; // 清内存态，迫使 list()/getById 经 _current() 读 mockDB.notices
}

/** 当前会话下 list() 可见的通知 id 集 */
const visibleIds = () => NoticeStore.list().map((n) => n.id);

// ════════════════════════════════════════════════════════════════
//  N1~N4 list() 受众门
// ════════════════════════════════════════════════════════════════

test('N1 sentinel all（全体党员）= 广播：任意角色与无会话均可见', () => {
  // 受众选项单一源声明序锁死（发布表单 4 项，顺序不得漂移）
  assert.deepEqual(NOTICE_AUDIENCE_OPTIONS.map((o) => o.value), ['all', 'leaders', 'activists', 'candidates'],
    '受众选项须派生自 NOTICE_AUDIENCE_SENTINELS（单一源）且保持声明序');
  assert.deepEqual(NOTICE_AUDIENCE_OPTIONS.map((o) => o.label), ['全体党员', '党小组组长', '入党积极分子', '发展对象']);

  beginCase([{ ...BASE, id: 'notice-n1', audience: ['all'], audienceLabel: '全体党员' }]);
  loginAs('p13', 'secretary');  assert.ok(visibleIds().includes('notice-n1'), '支书可见（广播）');
  loginAs('p1', 'leader');      assert.ok(visibleIds().includes('notice-n1'), '组长可见（广播）');
  loginAs('p3', 'participant'); assert.ok(visibleIds().includes('notice-n1'), '普通成员可见（广播）');
  logout();                     assert.ok(visibleIds().includes('notice-n1'), '无会话可见（广播）');
});

test('N2 sentinel leaders：组长可见；非 leader 的成员/支书不可见', () => {
  beginCase([{ ...BASE, id: 'notice-n2', audience: ['leaders'], audienceLabel: '党小组组长' }]);
  loginAs('p1', 'leader');      assert.ok(visibleIds().includes('notice-n2'), '组长可见');
  loginAs('p3', 'participant'); assert.ok(!visibleIds().includes('notice-n2'), '普通成员不可见');
  loginAs('p13', 'secretary');  assert.ok(!visibleIds().includes('notice-n2'), '支书不可见（list 受众门无签发人特权）');
});

test('N3 sentinel activists/candidates：按 developStage 命中；无关阶段不可见', () => {
  beginCase([
    { ...BASE, id: 'notice-act', audience: ['activists'], audienceLabel: '入党积极分子' },
    { ...BASE, id: 'notice-cand', audience: ['candidates'], audienceLabel: '发展对象' },
  ]);
  loginAs('p7', 'participant'); // developStage = 积极分子
  assert.ok(visibleIds().includes('notice-act'), '积极分子可见 activists');
  assert.ok(!visibleIds().includes('notice-cand'), '积极分子不可见 candidates');

  loginAs('p6', 'participant'); // developStage = 发展对象
  assert.ok(visibleIds().includes('notice-cand'), '发展对象可见 candidates');
  assert.ok(!visibleIds().includes('notice-act'), '发展对象不可见 activists');

  loginAs('p3', 'participant'); // developStage = 正式党员（无关阶段）
  assert.ok(!visibleIds().includes('notice-act'), '无关阶段不可见 activists');
  assert.ok(!visibleIds().includes('notice-cand'), '无关阶段不可见 candidates');
});

test('N4 裸角色键兼容：audience:[org-commissioner] 仅组织委员可见（回退判定生效）', () => {
  beginCase([{ ...BASE, id: 'notice-n4', audience: ['org-commissioner'] }]);
  loginAs('p11', 'org-commissioner'); assert.ok(visibleIds().includes('notice-n4'), '组织委员可见');
  loginAs('p13', 'secretary');        assert.ok(!visibleIds().includes('notice-n4'), '支书不可见');
  loginAs('p3', 'participant');       assert.ok(!visibleIds().includes('notice-n4'), '普通成员不可见');
});

// ════════════════════════════════════════════════════════════════
//  N5 getById 取数契约（本缺陷核心回归位）
// ════════════════════════════════════════════════════════════════

test('N5 getById 契约：按 id 取数不受可见性门限制（签发人也能取到）', () => {
  beginCase([
    { ...BASE, id: 'notice-n5-all', audience: ['all'], audienceLabel: '全体党员', publishedBy: '支书' },
    { ...BASE, id: 'notice-n5-dir', audience: ['leaders'], audienceLabel: '党小组组长', publishedBy: '支书' },
  ]);
  loginAs('p13', 'secretary');
  assert.ok(NoticeStore.getById('notice-n5-all'),
    "audience:['all'] 的通知，发布者（支书）经 getById 必须取到（修复前此处为 null → 详情页打不开）");
  assert.ok(NoticeStore.getById('notice-n5-dir'),
    '定向通知的取数同样不受可见性门限制（可见性交由 canReadNotice 判定）');
  logout();
  assert.ok(NoticeStore.getById('notice-n5-all'), '无会话（待办/铃铛跳转）也能取到广播通知正文');
});

// ════════════════════════════════════════════════════════════════
//  N6 canReadNotice 读取权限规则
// ════════════════════════════════════════════════════════════════

test('N6 canReadNotice：发布者/支委层/命中受众可读；无关成员不可读；广播人人可读；无会话仅广播可读', () => {
  beginCase([]);
  const secretary = { personId: 'p13', role: 'secretary' };
  const leader = { personId: 'p1', role: 'leader' };
  const member = { personId: 'p3', role: 'participant' };

  // 发布者恒可读：组长发布的定向通知（受众=支书），组长本人非受众但仍可读
  const byLeader = { ...BASE, id: 'n6-pub', audience: ['secretary'], publishedBy: '党小组组长' };
  assert.equal(canReadNotice(byLeader, leader), true, '发布者恒可读（签发人不被自己的定向通知挡在门外）');

  const toLeaders = { ...BASE, id: 'n6-leaders', audience: ['leaders'] };
  assert.equal(canReadNotice(toLeaders, leader), true, '命中受众（组长）可读');
  assert.equal(canReadNotice(toLeaders, member), false, '无关成员不可读');
  assert.equal(canReadNotice(toLeaders, secretary), true, '支委层可读（治理信息）');

  const broadcast = { ...BASE, id: 'n6-all', audience: ['all'] };
  assert.equal(canReadNotice(broadcast, member), true, '广播人人可读');
  assert.equal(canReadNotice(broadcast, null), true, '广播：无登录会话可读');
  assert.equal(canReadNotice(toLeaders, null), false, '定向通知：无登录会话不可读');
});

// ════════════════════════════════════════════════════════════════
//  N7 无受众（audience:null）= 广播
// ════════════════════════════════════════════════════════════════

test('N7 无受众（audience:null，如种子 notice-101）→ 人人可见、可读', () => {
  const seed101 = MOCK_NOTICES.find((n) => n.id === 'notice-101');
  beginCase([{ ...BASE, id: 'notice-n7', audience: null }, { ...seed101 }]);

  loginAs('p3', 'participant');
  assert.ok(visibleIds().includes('notice-n7'), '无受众：普通成员可见');
  // 种子 notice-101 已过期 → 用 activeOnly:false 复核受众门（证明「可见」不是被过期过滤掉）
  assert.ok(NoticeStore.list({ activeOnly: false }).map((n) => n.id).includes('notice-101'),
    '无受众：种子 notice-101 对普通成员可见');
  logout();
  assert.ok(visibleIds().includes('notice-n7'), '无受众：无会话可见');

  const fromStore = NoticeStore.getById('notice-101');
  assert.ok(fromStore, 'notice-101 可取到（取数不套可见性门）');
  assert.equal(canReadNotice(fromStore, { personId: 'p3', role: 'participant' }), true, '无受众：成员可读');
  assert.equal(canReadNotice(fromStore, null), true, '无受众：无登录会话可读');
});

// ════════════════════════════════════════════════════════════════
//  N8 actionRoles 既有路径不受影响
// ════════════════════════════════════════════════════════════════

test('N8 actionRoles 路径不受影响：仅 actionRoles:[leader] 的通知，组长可见、非组长不可见', () => {
  beginCase([{ ...BASE, id: 'notice-n8', actionRoles: ['leader'], targetUrl: 'workspace/leader.html' }]);
  loginAs('p1', 'leader');      assert.ok(visibleIds().includes('notice-n8'), '目标角色（组长）可见');
  loginAs('p3', 'participant'); assert.ok(!visibleIds().includes('notice-n8'), '普通成员不可见');
  loginAs('p13', 'secretary');  assert.ok(!visibleIds().includes('notice-n8'), '非目标角色（支书）不可见');
});
