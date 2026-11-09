// server/test/notice-audience-failclosed.test.mjs — 通知受众 fail-closed 守卫（2026-11-07 批次 535 · CASE-AI-004）
// 判据：
//   F1 无登录会话：list() 为空、canReadNotice 恒 false（含显式广播）
//   F2 系统通知无受众 → 不可读；公告无受众仍按支部广播（历史兼容）
//   F3 audiencePersons 到人：目标人可读、无关成员不可读
//   F4 legacyUnscoped：仅发布者可读
//   F5 模板：project-auth-granted 产出 audiencePersons；required 类均有受众
//   F6 受众策略单一源：required / broadcast / conditional 分类齐备
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261110a';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261110a';
import { setDataSource, registerMockAdapter } from '../../docs/src/data/data-adapter.js?v=20261110a';
import { NoticeStore, canReadNotice } from '../../docs/src/services/governance/notice.js?v=20261110a';
import { buildSystemNotice } from '../../docs/src/core/domain/system-notice-templates.js?v=20261110a';
import { SYSTEM_NOTICE_AUDIENCE_POLICY, audiencePolicyOf } from '../system-notice-kinds.js';

const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => { _store.set(String(k), String(v)); },
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
registerMockAdapter(MockAdapter);

const LOGIN_KEY = 'gsm1921-login-user';
const loginAs = (personId, role) => _store.set(LOGIN_KEY, JSON.stringify({ personId, role }));
const logout = () => _store.delete(LOGIN_KEY);

const BASE = { title: '受众', content: '正文', priority: 'normal', publishDate: '2026-11-07', read: false };

function beginCase(notices) {
  _store.clear();
  delete globalThis.window;
  mockDB.notices = [];
  mockDB.todos = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
  mockDB.notices = notices.map((n) => ({ ...n }));
  NoticeStore._notices = [];
}

test('F1 无登录会话：list() 为空、canReadNotice 恒 false', () => {
  beginCase([
    { ...BASE, id: 'f1-broadcast', kind: 'system', audience: ['all'] },
    { ...BASE, id: 'f1-announcement', audience: ['all'] },
    { ...BASE, id: 'f1-person', kind: 'system', audiencePersons: ['2400012347'] },
  ]);
  logout();
  assert.deepEqual(NoticeStore.list().map((n) => n.id), [], '匿名 list() 不得返回任何通知');
  for (const id of ['f1-broadcast', 'f1-announcement', 'f1-person']) {
    assert.equal(canReadNotice({ ...BASE, id, audience: ['all'] }, null), false, `${id} 匿名不可读`);
  }
});

test('F2 系统通知无受众不可读；公告无受众按支部广播', () => {
  beginCase([
    { ...BASE, id: 'f2-sys', kind: 'system', audience: null, targetType: 'activity', targetId: 'act-1' },
    { ...BASE, id: 'f2-ann', audience: null },
  ]);
  const member = { personId: '2400012347', role: 'participant' };
  assert.equal(canReadNotice({ ...BASE, id: 'f2-sys', kind: 'system', audience: null }, member), false,
    '系统通知无受众 → 不可读');
  assert.equal(canReadNotice({ ...BASE, id: 'f2-ann', audience: null }, member), true,
    '公告无受众 → 支部广播（历史兼容）');
  loginAs('2400012347', 'participant');
  const ids = NoticeStore.list().map((n) => n.id);
  assert.ok(!ids.includes('f2-sys'), '列表不得出现无受众系统通知');
  assert.ok(ids.includes('f2-ann'), '列表可见无受众公告');
});

test('F3 audiencePersons 到人：目标人可读、无关成员不可读', () => {
  const n = { ...BASE, id: 'f3', kind: 'system', audiencePersons: ['2500010016'] };
  assert.equal(canReadNotice(n, { personId: '2500010016', role: 'participant' }), true, '被赋权人可读');
  assert.equal(canReadNotice(n, { personId: '2500010017', role: 'participant' }), false, '无关成员不可读');
});

test('F4 legacyUnscoped：仅发布者可读', () => {
  const n = { ...BASE, id: 'f4', kind: 'system', audience: null, legacyUnscoped: true, publisherId: '2300010001' };
  assert.equal(canReadNotice(n, { personId: '2300010001', role: 'secretary' }), true, '发布者可读');
  assert.equal(canReadNotice(n, { personId: '2400012347', role: 'participant' }), false, '他人不可读');
});

test('F5 模板：project-auth-granted 定向到人；required 类均带受众', () => {
  const auth = buildSystemNotice('project-auth-granted', {
    sourceId: 'act-1', targetPage: 'workspace/visitor.html', authorizerName: '张三',
    projectName: '活动', roleLabel: '组织者', targetPersonId: '2500010016',
  });
  assert.deepEqual(auth.audiencePersons, ['2500010016'], '赋权通知必须 audiencePersons=[targetPersonId]');

  const required = Object.entries(SYSTEM_NOTICE_AUDIENCE_POLICY)
    .filter(([, p]) => p === 'required')
    .map(([k]) => k);
  for (const kind of required) {
    const vars = { sourceId: 'act-1', activityTitle: '活动', title: '标题', deadline: '2026-11-10', taskforceName: '专班', targetPersonId: '2500010016' };
    const n = buildSystemNotice(kind, vars);
    const has = (Array.isArray(n.audience) && n.audience.length > 0)
      || (typeof n.audience === 'string' && n.audience)
      || (Array.isArray(n.audiencePersons) && n.audiencePersons.length > 0)
      || (Array.isArray(n.actionRoles) && n.actionRoles.length > 0);
    assert.ok(has, `${kind} 属 required 但模板未产出受众：${JSON.stringify(n)}`);
  }
});

test('F6 受众策略单一源：三档齐备且覆盖全部 kind', () => {
  const policies = new Set(Object.values(SYSTEM_NOTICE_AUDIENCE_POLICY));
  assert.deepEqual([...policies].sort(), ['broadcast', 'conditional', 'required'], '三档必须齐备');
  assert.equal(audiencePolicyOf('project-auth-granted'), 'required');
  assert.equal(audiencePolicyOf('activity-created-broadcast'), 'broadcast');
  assert.equal(audiencePolicyOf('not-a-real-kind'), 'conditional', '未登记 kind 回落 conditional（读侧仍 fail-closed）');
});
