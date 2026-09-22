// server/test/work-map.test.mjs — L4 支部工作地图 M0/M1（2026-09-03）
// 覆盖：① 模块目录 14 项（「三会一课」2026-09-22 批次 145 按形式拆为 4 个模块）唯一性/缺省主责 ∈ 角色键 ∪ 组织型主体（见 ORG_SUBJECTS）；② expandWorkforce 快照展开；
//       ③ sanitizeConfigWorkforce 净化（未知模块/非法 owner 丢弃，null=恢复默认）；
//       ④ HTTP PATCH /branches/:id/config 写 config.workforce（支书登录；含净化与恢复默认）。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  WORK_MAP_MODULES, WORK_MAP_IDS, WORK_MAP_DEFAULT, expandWorkforce, mergeWorkforceSnapshot,
  ORG_SUBJECT_IDS, ORG_SUBJECT_LABELS, isOrgSubject,
} from '../../docs/src/core/work-map.js?v=20260922j';
import { sanitizeConfigWorkforce } from '../../docs/src/core/config-clean.js?v=20260922j';
import { ROLE_KEYS, ROLE_PAGE_MAP } from '../../docs/src/core/constants.js?v=20260922j';

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

test('模块目录：14 项（「三会一课」批次 145 拆为 4 个模块），id 唯一，缺省主责 ∈ 角色键 ∪ 组织型主体', () => {
  assert.equal(WORK_MAP_MODULES.length, 14);
  assert.equal(new Set(WORK_MAP_IDS).size, 14);
  const keys = new Set(ROLE_KEYS);
  for (const m of WORK_MAP_MODULES) {
    assert.ok(keys.has(m.defaultOwner) || isOrgSubject(m.defaultOwner),
      `模块「${m.id}」缺省主责「${m.defaultOwner}」既不在角色枚举、也不是组织型主体`);
  }
  assert.equal(Object.keys(WORK_MAP_DEFAULT).length, 14);
  // 批次 145 裁定「按谁组织算谁」的缺省主责：母本《常见工作场景快速指南》:157-160 逐形式取齐
  assert.equal(WORK_MAP_DEFAULT['branch-party-meeting'], 'secretary');
  assert.equal(WORK_MAP_DEFAULT['branch-committee-meeting'], 'secretary');
  assert.equal(WORK_MAP_DEFAULT['party-group-meeting'], 'leader');   // 党小组会 → 党小组组长
  assert.equal(WORK_MAP_DEFAULT['party-lecture'], 'secretary');
  assert.equal(WORK_MAP_DEFAULT['theme-party'], 'leader');           // 主题党日 → 本组组长（组织者缺省）
  // 批次 149 裁定（支书 2026-09-22）：办活动即党小组承办 ⇒ 共建活动缺省主责＝本组组长
  assert.equal(WORK_MAP_DEFAULT['joint-event'], 'leader');           // 共建活动 → 本组组长（党小组承办）
  // 批次 149 裁定：信息平台支持＝本网页系统本身 ⇒ 主责＝支委会（组织型主体）
  assert.equal(WORK_MAP_DEFAULT['info-platform'], 'branch-committee');
  assert.equal(WORK_MAP_DEFAULT['rule-making'], 'branch-committee'); // 制度制定与迭代：主责维持支委会
  assert.equal(WORK_MAP_DEFAULT['democratic-review'], 'secretary');  // 民主评议：上传任务归支书
  assert.equal(WORK_MAP_DEFAULT['election'], 'party-committee');     // 换届选举：主导在党委（批次 149 新立组织型主体）
});

test('组织型主体＝「类似法人」不是自然人（批次 141）：取值与角色键不重叠、不进 ROLE_KEYS / 身份→页面映射；两模块缺省主责＝支委会', () => {
  assert.deepEqual(ORG_SUBJECT_IDS, ['branch-committee', 'party-committee']);
  assert.equal(ORG_SUBJECT_LABELS['branch-committee'], '支委会');
  assert.equal(ORG_SUBJECT_LABELS['party-committee'], '党委'); // 批次 149（election 承担方＝党委）
  const keySet = new Set(ROLE_KEYS);
  const pageMaps = Object.values(ROLE_PAGE_MAP);
  for (const id of ORG_SUBJECT_IDS) {
    assert.equal(keySet.has(id), false, `组织型主体「${id}」不得出现在 ROLE_KEYS（那就成了给一个人加头衔）`);
    for (const map of pageMaps) {
      assert.equal(id in map, false, `组织型主体「${id}」不得出现在身份→页面映射里（不能当登录身份）`);
    }
  }
  // 缺省主责改准：两个模块＝支委会；经 expandWorkforce 兜底展开为 ownerType:'org'
  const dflt = expandWorkforce(null);
  assert.deepEqual(dflt['feedback-handling'], { ownerType: 'org', ownerId: 'branch-committee' });
  assert.deepEqual(dflt['rule-making'], { ownerType: 'org', ownerId: 'branch-committee' });
  // 批次 149：换届选举＝党委（同为组织型主体）
  assert.deepEqual(dflt['election'], { ownerType: 'org', ownerId: 'party-committee' });
});

test('expandWorkforce：null → 全缺省（role / org）；覆盖 person 项保留、其余兜底缺省', () => {
  const dflt = expandWorkforce(null);
  assert.equal(Object.keys(dflt).length, 14);
  // 发展党员缺省主责＝支委会（组织型主体，批次 144 依母本 §5.1 定人表＋D-300 改准）
  assert.equal(dflt['develop-party-member'].ownerType, 'org');
  assert.equal(dflt['develop-party-member'].ownerId, 'branch-committee');

  const withPerson = expandWorkforce({ 'develop-party-member': { ownerType: 'person', ownerId: 'p14' } });
  assert.deepEqual(withPerson['develop-party-member'], { ownerType: 'person', ownerId: 'p14' });
  assert.equal(withPerson['theme-party'].ownerType, 'role'); // 未覆盖 → 缺省
});

test('mergeWorkforceSnapshot：按改派清单合并，未涉及模块原样保留（M2 采纳落库前置）', () => {
  const snapshot = expandWorkforce({ 'develop-party-member': { ownerType: 'person', ownerId: 'p14' } });
  const merged = mergeWorkforceSnapshot(snapshot, [
    { moduleId: 'theme-party', to: { ownerType: 'role', ownerId: 'deputy-secretary' } },
    { moduleId: 'feedback-handling', to: { ownerType: 'org', ownerId: 'branch-committee' } }, // 组织型主体位
    { moduleId: 'not-a-module', to: { ownerType: 'person', ownerId: 'p5' } }, // 未知模块 → 忽略
  ]);
  assert.equal(Object.keys(merged).length, 14);
  assert.deepEqual(merged['theme-party'], { ownerType: 'role', ownerId: 'deputy-secretary' });
  assert.deepEqual(merged['feedback-handling'], { ownerType: 'org', ownerId: 'branch-committee' });
  assert.deepEqual(merged['develop-party-member'], { ownerType: 'person', ownerId: 'p14' }); // 既有 person 保留
  assert.equal(merged['taskforce'].ownerType, 'role'); // 未涉及 → 缺省
  assert.equal(merged['not-a-module'], undefined);
});

test('sanitizeConfigWorkforce：null→null；合法保留；未知模块/非法 owner 丢弃', () => {
  assert.equal(sanitizeConfigWorkforce(null), null);
  assert.deepEqual(
    sanitizeConfigWorkforce({
      'theme-party': { ownerType: 'person', ownerId: 'p14' },
      'rule-making': { ownerType: 'org', ownerId: 'branch-committee' }, // 组织型主体位 → 合法保留
      'not-a-module': { ownerType: 'role', ownerId: 'secretary' }, // 未知模块 → 丢
      'taskforce': { ownerType: 'nobody', ownerId: 'x' },           // 非法 ownerType → 丢
      'election': { ownerType: 'role', ownerId: '' },               // 空 ownerId → 丢
    }),
    {
      'theme-party': { ownerType: 'person', ownerId: 'p14' },
      'rule-making': { ownerType: 'org', ownerId: 'branch-committee' },
    },
  );
  assert.deepEqual(sanitizeConfigWorkforce([]), {});
});

test('分层与停用（2026-09-13 支书裁定）：tier ∈ {norm,method}；方法类可停用、规范类必办不可停用', () => {
  const TIERS = new Set(['norm', 'method']);
  for (const m of WORK_MAP_MODULES) {
    assert.ok(TIERS.has(m.tier), `模块「${m.id}」缺 tier（须 norm|method）`);
  }
  // 方法类停用：expandWorkforce 不回落缺省负责人（否则停用失效）
  const disabled = expandWorkforce({ taskforce: { ownerType: 'none', ownerId: '' } });
  assert.deepEqual(disabled.taskforce, { ownerType: 'none', ownerId: '' });
  // merge：方法类停用生效；规范类停用被拦（仍为缺省负责人）
  const merged = mergeWorkforceSnapshot(expandWorkforce(null), [
    { moduleId: 'taskforce', to: { ownerType: 'none', ownerId: '' } },
    { moduleId: 'branch-party-meeting', to: { ownerType: 'none', ownerId: '' } },
  ]);
  assert.deepEqual(merged.taskforce, { ownerType: 'none', ownerId: '' }, '方法类可停用');
  assert.deepEqual(merged['branch-party-meeting'], { ownerType: 'role', ownerId: 'secretary' }, '规范类必办：停用被拦');
  // 落库净化：规范类停用被丢弃，方法类停用保留
  assert.deepEqual(
    sanitizeConfigWorkforce({
      'branch-party-meeting': { ownerType: 'none', ownerId: '' },
      taskforce: { ownerType: 'none', ownerId: '' },
    }),
    { taskforce: { ownerType: 'none', ownerId: '' } },
  );
});

test('HTTP：支书 PATCH config.workforce 落库（净化生效），null 恢复默认', async () => {
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
