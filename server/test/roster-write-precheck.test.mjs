// role: [工程师]+[AI]
// server/test/roster-write-precheck.test.mjs — 名册写口前置校验（2026-11-19 批次 575 · `D-887` / `B-552-3`）
// 判据：
//   · 空补丁（{} / 只有 id）⇒ 直接返回「没有可保存的字段」，**不发任何请求**；
//   · 非党委登录带着 `branchId` / `role` ⇒ 治理字段被剔除后再判；剔除后为空同样不发请求；
//   · 党委（party-staff）照旧可写治理字段。
// 运行：node --test test/roster-write-precheck.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerApiAdapter, setDataSource, getDataSource } from '../../docs/src/data/data-adapter.js?v=20261120a';
import { PersonStore } from '../../docs/src/services/member/person.js?v=20261120a';

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

/** 记录调用次数的假 api 适配器（够 `_apiSaveMember` 走到 users.update 即可） */
function installFakeApiAdapter() {
  const calls = { usersList: 0, usersUpdate: 0 };
  const fake = {
    users: {
      list: async () => { calls.usersList += 1; return [{ id: '2400012345', developStage: '积极分子' }]; },
      update: async (id, patch) => { calls.usersUpdate += 1; return { id, ...patch }; },
      create: async () => { throw new Error('not used'); },
    },
    members: {
      create: async () => { throw new Error('not used'); },
      updateProfile: async () => { throw new Error('not used'); },
      setDevelopStage: async () => { throw new Error('not used'); },
      setResidenceStatus: async () => { throw new Error('not used'); },
      intake: async () => { throw new Error('not used'); },
    },
    branches: { list: async () => [] },
  };
  registerApiAdapter(fake);
  setDataSource('api');
  return calls;
}

function loginAs(role) {
  localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId: '2400012345', role }));
}

test('名册写口前置校验：空补丁不发请求 / 非党委治理字段剔除 / 党委照旧可写', async () => {
  // ── ① 空补丁（{} / 仅 id）⇒ 直接返回，不发任何请求 ──
  loginAs('org-commissioner');
  const calls = installFakeApiAdapter();
  assert.equal(getDataSource(), 'api', '前置校验用例须在 api 形态下跑');
  const a = await PersonStore.saveMember({});
  assert.equal(a.ok, false);
  assert.match(a.reason, /没有可保存的字段/);
  assert.equal(getDataSource(), 'api', '第二次调用前形态仍应为 api');
  const b = await PersonStore.saveMember({ id: '2400012345' });
  assert.equal(b.ok, false, `仅 id 应判空，实测 ${JSON.stringify(b)}`);
  assert.match(b.reason, /没有可保存的字段/);
  assert.deepEqual(calls, { usersList: 0, usersUpdate: 0 }, '前置校验失败不得发任何请求');

  // ── ② 非党委带 branchId / role ⇒ 治理字段被剔除；剔除后为空不发请求 ──
  loginAs('org-commissioner');
  const calls2 = installFakeApiAdapter();
  const r = await PersonStore.saveMember({ id: '2400012345', branchId: 'br-b1', role: 'participant' });
  assert.equal(r.ok, false);
  assert.match(r.reason, /没有可保存的字段/);
  assert.equal(calls2.usersUpdate, 0, '不得把治理字段发往 users.update（否则 403/400）');

  // ── ③ 党委（party-staff）照旧可写治理字段 ──
  loginAs('party-staff');
  installFakeApiAdapter();
  const seen = [];
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    seen.push({ url: String(url), body: init.body ? String(init.body) : '', method: init.method || 'GET' });
    const payload = (init.method || 'GET') === 'GET'
      ? [{ id: '2400012345', developStage: '积极分子' }]
      : { id: '2400012345', branchId: 'br-b1' };
    return { ok: true, status: 200, json: async () => payload };
  };
  try {
    const r2 = await PersonStore.saveMember({ id: '2400012345', branchId: 'br-b1' });
    assert.equal(r2.ok, true, `党委写治理字段应成功，实测：${JSON.stringify(r2)}`);
    const gov = seen.find((s) => s.url.includes('/api/v1/users/2400012345'));
    assert.ok(gov, '党委写治理字段应发 PATCH /users/:id');
    assert.match(gov.body, /branchId/, '党委路径不得剔除 branchId');
  } finally {
    globalThis.fetch = savedFetch;
  }
});
