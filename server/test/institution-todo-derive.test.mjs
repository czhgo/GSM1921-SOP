// role: [工程师]+[AI]
// server/test/institution-todo-derive.test.mjs — 制度草案 → 对应主体待办（2026-11-19 批次 574 · `D-886`）
// 判据（`SOP-B-25` ①②）：
//   · 草案按「制度内容领域 → 对应主体」派生一条推进待办（映射单一源＝`work-map.js::institutionSubjectOfDomain`）；
//   · 幂等：同草案已有未完成条 ⇒ 不重复追加；
//   · 改派：改领域后旧条撤除、新主体条派生（主体随领域换人）；
//   · 非草案 / 非制度文本 ⇒ 不出条；草案离开草案态 ⇒ 撤条。
// 运行：node --test test/institution-todo-derive.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261110b';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261110b';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261110b';
import {
  TodoStore, TodoStatus, TodoSourceType, InstitutionTodoDeriver,
} from '../../docs/src/services/governance/todo.js?v=20261110b';

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
  for (const k of ['activities', 'tasks', 'todos', 'branchDocs', 'notices', 'assignments']) mockDB[k] = [];
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
}

const DRAFT = { id: 'doc-inst-1', purpose: 'institution', status: 'draft', title: '组织生活实施细则', domain: 'organization' };

test('payloadFor：按领域映射对应主体；非草案 / 非制度 ⇒ null', () => {
  const org = InstitutionTodoDeriver.payloadFor(DRAFT);
  assert.equal(org.role, 'org-commissioner', '组织建设类 → 组织委员');
  assert.equal(InstitutionTodoDeriver.payloadFor({ ...DRAFT, domain: 'propaganda' }).role, 'prop-commissioner');
  assert.equal(InstitutionTodoDeriver.payloadFor({ ...DRAFT, domain: 'discipline' }).role, 'disc-commissioner');
  assert.equal(InstitutionTodoDeriver.payloadFor({ ...DRAFT, domain: 'general' }).role, 'secretary');
  assert.equal(InstitutionTodoDeriver.payloadFor({ ...DRAFT, domain: 'unknown' }).role, 'secretary', '领域未登记 → 支书');
  assert.equal(InstitutionTodoDeriver.payloadFor({ ...DRAFT, status: 'current' }), null, '非草案态不出条');
  assert.equal(InstitutionTodoDeriver.payloadFor({ ...DRAFT, purpose: 'doc' }), null, '非制度文本不出条');
  assert.equal(org.sourceType, TodoSourceType.INSTITUTION);
  assert.equal(org.actionKey, 'institution-draft');
});

test('deriveFromDraft：幂等；改派后旧条撤除、新主体条派生；离开草案态撤条', () => {
  beginMockCase();
  const first = InstitutionTodoDeriver.deriveFromDraft(DRAFT);
  assert.equal(first.length, 1, '首次应派生一条');
  assert.equal(first[0].role, 'org-commissioner');
  assert.equal(first[0].status, TodoStatus.PENDING);
  assert.equal(InstitutionTodoDeriver.deriveFromDraft(DRAFT).length, 0, '重复派生应幂等');

  // 改派：organization → propaganda
  InstitutionTodoDeriver.retireForDoc(DRAFT.id);
  const next = InstitutionTodoDeriver.deriveFromDraft({ ...DRAFT, domain: 'propaganda' });
  assert.equal(next.length, 1);
  assert.equal(next[0].role, 'prop-commissioner', '改派后收件主体随之换人');
  const rows = TodoStore.getBySource(TodoSourceType.INSTITUTION, DRAFT.id);
  assert.equal(rows.filter((t) => t.status !== TodoStatus.COMPLETED).length, 1, '旧条已撤、不并存');

  // 草案离开草案态（通过 / 报送党员大会）
  InstitutionTodoDeriver.retireForDoc(DRAFT.id);
  assert.equal(TodoStore.getBySource(TodoSourceType.INSTITUTION, DRAFT.id).length, 0, '离开草案态应撤条');
});
