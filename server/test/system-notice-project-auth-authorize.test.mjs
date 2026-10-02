// role: [工程师]+[AI]
// 2026-10-02 批次 338（`SOP-G-1` 授权口径收口 · 支书裁「甲」）：`project-auth-granted` 的 `authorize` 判据定向件。
// **病灶**：旧判据只看「支委层 ＋ 对象存在」⇒ 前端放行、服务端 **403 静默丢弃**。
// **本件给的是正面证据**：① 支委层（原面不变）· ② **组长**（甲案新增）· ③ **该场现任组织者本人**（甲案新增，
//   形状同 `docs/src/components/governance/organizer-transfer.js::organizerOf`）· ④ 无关成员/非组织者的项目角色行
//   （`deep`）**仍拒**（证「没有放宽到人人可发」）· ⑤ 对象不存在一律拒。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_NOTICE_KINDS } from '../system-notice-kinds.js';

/** 最小 db 桩：只实现 `prepare().get()`，返回与真库同形的 `{ data: JSON }`（`rowOf` 会 JSON 解包） */
const dbStub = (rows) => ({
  prepare(sql) {
    const table = /FROM (\w+)/.exec(sql)[1];
    return { get: (id) => (rows[table] && rows[table][id] ? { data: JSON.stringify(rows[table][id]) } : undefined) };
  },
});
const AUTH = (actor, sourceId, rows) => SYSTEM_NOTICE_KINDS['project-auth-granted'].authorize({ actor, sourceId, db: dbStub(rows) });
const ACT = (extra = {}) => ({ activities: { 'act-1': { id: 'act-1', ...extra } } });
const TF = (extra = {}) => ({ taskforces: { 'tf-1': { id: 'tf-1', ...extra } } });

test('A1 支委层放行（原授权面不变）', () => {
  for (const role of ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner']) {
    assert.equal(AUTH({ id: 'p10', role }, 'act-1', ACT()), true, role);
  }
});

test('A2 党小组组长放行（甲案新增 · role key `leader`）', () => {
  assert.equal(AUTH({ id: 'p20', role: 'leader' }, 'act-1', ACT()), true);
  assert.equal(AUTH({ id: 'p20', role: 'leader' }, 'tf-1', TF()), true);
});

test('A3 该场现任组织者本人放行（甲案新增 · 活动侧 assignments）', () => {
  assert.equal(AUTH({ id: 'p30', role: 'participant' }, 'act-1',
    ACT({ assignments: [{ personId: 'p30', role: 'organizer' }, { personId: 'p31', role: 'deep' }] })), true);
});

test('A4 该场现任组织者本人放行（甲案新增 · 专班侧 members）', () => {
  assert.equal(AUTH({ id: 'p30', role: 'participant' }, 'tf-1',
    TF({ members: [{ personId: 'p30', role: 'organizer' }] })), true);
});

test('A5 无关成员仍拒（**不得**放宽到「人人可发」）', () => {
  assert.equal(AUTH({ id: 'p40', role: 'participant' }, 'act-1',
    ACT({ assignments: [{ personId: 'p30', role: 'organizer' }] })), false);
});

test('A6 非组织者的项目角色行（`deep`）不放行', () => {
  assert.equal(AUTH({ id: 'p41', role: 'participant' }, 'act-1',
    ACT({ assignments: [{ personId: 'p41', role: 'deep' }] })), false);
});

test('A7 来源对象不存在一律拒（三档皆然）', () => {
  assert.equal(AUTH({ id: 'p10', role: 'secretary' }, 'act-9', {}), false);
  assert.equal(AUTH({ id: 'p20', role: 'leader' }, 'act-9', {}), false);
  assert.equal(AUTH({ id: 'p30', role: 'participant' }, 'act-9', {}), false);
});

test('A8 无 actor 一律拒（防未登录）', () => {
  assert.equal(AUTH(null, 'act-1', ACT()), false);
});
