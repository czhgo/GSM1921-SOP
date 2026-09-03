// server/test/work-map.test.mjs — L4 支部工作地图 M0/M1（2026-09-03）
// 覆盖：① 模块目录 11 项（书记裁决）唯一性/缺省主责 ∈ 角色枚举；② expandWorkforce 快照展开；
//       ③ sanitizeConfigWorkforce 净化（未知模块/非法 owner 丢弃，null=恢复默认）；
//       ④ HTTP PATCH /branches/:id/config 写 config.workforce（书记登录；含净化与恢复默认）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  WORK_MAP_MODULES, WORK_MAP_IDS, WORK_MAP_DEFAULT, expandWorkforce, mergeWorkforceSnapshot,
} from '../../docs/src/core/work-map.js';
import { sanitizeConfigWorkforce } from '../../docs/src/core/config-clean.js';
import { ROLE_KEYS } from '../../docs/src/core/constants.js';

let server, base, token;

async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13', password: '123456' }),
  });
  return (await r.json()).token;
}

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  token = await login();
});

after(() => { server.close(); });

test('模块目录：11 项（书记裁决），id 唯一，缺省主责 ∈ ROLE_KEYS', () => {
  assert.equal(WORK_MAP_MODULES.length, 11);
  assert.equal(new Set(WORK_MAP_IDS).size, 11);
  const keys = new Set(ROLE_KEYS);
  for (const m of WORK_MAP_MODULES) {
    assert.ok(keys.has(m.defaultOwner), `模块「${m.id}」缺省主责「${m.defaultOwner}」不在角色枚举`);
  }
  assert.equal(Object.keys(WORK_MAP_DEFAULT).length, 11);
});

test('expandWorkforce：null → 全缺省 role；覆盖 person 项保留、其余兜底缺省', () => {
  const dflt = expandWorkforce(null);
  assert.equal(Object.keys(dflt).length, 11);
  assert.equal(dflt['develop-party-member'].ownerType, 'role');
  assert.equal(dflt['develop-party-member'].ownerId, 'org-commissioner');

  const withPerson = expandWorkforce({ 'develop-party-member': { ownerType: 'person', ownerId: 'p14' } });
  assert.deepEqual(withPerson['develop-party-member'], { ownerType: 'person', ownerId: 'p14' });
  assert.equal(withPerson['theme-party'].ownerType, 'role'); // 未覆盖 → 缺省
});

test('mergeWorkforceSnapshot：按改派清单合并，未涉及模块原样保留（M2 采纳落库前置）', () => {
  const snapshot = expandWorkforce({ 'develop-party-member': { ownerType: 'person', ownerId: 'p14' } });
  const merged = mergeWorkforceSnapshot(snapshot, [
    { moduleId: 'theme-party', to: { ownerType: 'role', ownerId: 'deputy-secretary' } },
    { moduleId: 'not-a-module', to: { ownerType: 'person', ownerId: 'p5' } }, // 未知模块 → 忽略
  ]);
  assert.equal(Object.keys(merged).length, 11);
  assert.deepEqual(merged['theme-party'], { ownerType: 'role', ownerId: 'deputy-secretary' });
  assert.deepEqual(merged['develop-party-member'], { ownerType: 'person', ownerId: 'p14' }); // 既有 person 保留
  assert.equal(merged['taskforce'].ownerType, 'role'); // 未涉及 → 缺省
  assert.equal(merged['not-a-module'], undefined);
});

test('sanitizeConfigWorkforce：null→null；合法保留；未知模块/非法 owner 丢弃', () => {
  assert.equal(sanitizeConfigWorkforce(null), null);
  assert.deepEqual(
    sanitizeConfigWorkforce({
      'theme-party': { ownerType: 'person', ownerId: 'p14' },
      'not-a-module': { ownerType: 'role', ownerId: 'secretary' }, // 未知模块 → 丢
      'taskforce': { ownerType: 'nobody', ownerId: 'x' },           // 非法 ownerType → 丢
      'election': { ownerType: 'role', ownerId: '' },               // 空 ownerId → 丢
    }),
    { 'theme-party': { ownerType: 'person', ownerId: 'p14' } },
  );
  assert.deepEqual(sanitizeConfigWorkforce([]), {});
});

test('HTTP：书记 PATCH config.workforce 落库（净化生效），null 恢复默认', async () => {
  const put = await fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      config: {
        workforce: {
          'develop-party-member': { ownerType: 'person', ownerId: 'p14' },
          'fake-module': { ownerType: 'role', ownerId: 'secretary' },
        },
      },
    }),
  });
  assert.equal(put.status, 200);
  const branch = await put.json();
  assert.deepEqual(branch.config.workforce, {
    'develop-party-member': { ownerType: 'person', ownerId: 'p14' },
  }, '未知模块被净化丢弃');

  const reset = await fetch(`${base}/api/v1/branches/br-b1/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ config: { workforce: null } }),
  });
  assert.equal(reset.status, 200);
  assert.equal((await reset.json()).config.workforce, null);
});
