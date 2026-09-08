// role: [工程师]+[AI]
// server/test/empty-template.test.mjs — 立项⑤ 阶段A：演示数据与空组织模板分离（2026-09-06）
// 覆盖（验收判据 1/2/4 的布尔面 + 引用审计分层）：
//   ① empty 创建 = 结构正确 / config 默认全开（modules/blocks/workforce null）/
//      留痕 configChangeHistory [branch-created from=empty-template]；缺省名=占位名
//   ② copy 创建 = config 域（modules/blocks/workforce）+ org 域（desc/themePreset）复制、
//      源不动、留痕 from=branch:<源>、headerTitle 随新名（name→headerTitle 同步不变式）
//   ③ name 非法（空/超长）拒绝；非 party-staff（actorRole 入参校验）无权限
//   ④ 引用审计分层：空模板/新建空支部不含业务域键与演示成员 id（p1…）、席位空缺
//   ⑤ server POST /branches（org-config 同款 HTTP 风格）双形态与前端本地构造一致
//      （party-staff 可建；secretary 403；name 空/超长 400）
// 纯 Node + localStorage 桩（前端模块经 ?v= query 导入，与 wizard-copy.test.mjs 同法）。
// 运行：node --test test/empty-template.test.mjs（server 自包含 :memory:）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908c';
import {
  EMPTY_BRANCH_TEMPLATE, buildNewBranchRecord,
  createBranch, getBranchById, getBranchOrg, auditEmptyBranchRecord,
} from '../../docs/src/services/branch.js?v=20260908c';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

// ── localStorage 内存桩（branch 服务 _actorId 惰性访问；测试显式传 by，桩仅兜底）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

/** 每例独立现场：深拷贝种入支部清单（用例间互不污染；新建动作只写 branches 集合） */
function seedBranches(list) {
  mockDB.branches = list.map(b => JSON.parse(JSON.stringify(b)));
}

/** 富配置源支部（copy 复制源；覆盖 modules/blocks/workforce/org 全域） */
function srcBranch() {
  return {
    id: 'br-src',
    name: '光华管理学院本科生党支部',
    type: '本科生',
    config: {
      headerTitle: '源支部页眉',
      desc: '源支部自述',
      themePreset: 'sky',
      modules: { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] },
      blocks: {
        outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: [] },
        workflowBlocks: { hiddenBlockIds: ['theme-day'] },
      },
      workforce: {
        'three-meetings': { ownerType: 'role', ownerId: 'secretary' },
        taskforce: { ownerType: 'role', ownerId: 'org-commissioner' },
      },
      accent: null,
      fileSpaceIsolated: true,
    },
    secretaryId: 'p13',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

/** 归一化（去 id/createdAt/留痕 at——两端生成时间/随机 id 允许不同，其余须逐位一致） */
function _norm(branch) {
  const c = JSON.parse(JSON.stringify(branch));
  delete c.id;
  delete c.createdAt;
  if (c.config && Array.isArray(c.config.configChangeHistory)) {
    c.config.configChangeHistory.forEach((h) => { delete h.at; });
  }
  return c;
}

// ═══════════════ ① empty 创建（前端本地形态）══════════════════
test('empty：空模板创建 = 结构正确/config 默认全开/留痕 branch-created(empty-template)', async () => {
  seedBranches([]);
  const res = await createBranch({ name: '光华管理学院硕士党支部', by: 'p_pc' });
  assert.equal(res.ok, true, JSON.stringify(res));
  const b = res.branch;
  assert.match(b.id, /^br-[0-9a-f]{8}$/);
  assert.equal(b.name, '光华管理学院硕士党支部');
  assert.equal(b.type, '', 'empty 形态类别标签待填');
  assert.equal(b.secretaryId, null, '席位空缺待任命');
  assert.equal(b.status, 'active');
  assert.ok(b.createdAt, 'createdAt 存在');
  // config 默认全开（与 br-b1 语义一致：null = 默认全开/缺省分工）
  assert.equal(b.config.modules, null);
  assert.equal(b.config.blocks, null);
  assert.equal(b.config.workforce, null);
  assert.equal(b.config.headerTitle, '', 'headerTitle 空 → header 回退 name');
  assert.equal(b.config.desc, '');
  assert.equal(b.config.themePreset, null);
  assert.equal(b.config.accent, null);
  assert.equal(b.config.fileSpaceIsolated, true);
  // 留痕
  assert.ok(Array.isArray(b.config.configChangeHistory) && b.config.configChangeHistory.length === 1);
  const h = b.config.configChangeHistory[0];
  assert.equal(h.by, 'p_pc');
  assert.equal(h.what, 'branch-created');
  assert.equal(h.from, 'empty-template');
  assert.equal(h.to, null);
  // 落库
  assert.equal(getBranchById(b.id), b, 'mockDB.branches 已含新支部');
  // 引用审计通过（验收 2）
  assert.equal(auditEmptyBranchRecord(b), null);
});

test('empty：未给名 → 模板占位名「新支部（待配置）」（名待填）', async () => {
  seedBranches([]);
  const res = await createBranch({ by: 'p_pc' });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.branch.name, EMPTY_BRANCH_TEMPLATE.name);
  assert.equal(auditEmptyBranchRecord(res.branch), null);
});

// ═══════════════ ② copy 创建（前端本地形态）══════════════════
test('copy：config/workforce/org 复制到新支部、源不动、留痕 from=branch:源、headerTitle 随新名', async () => {
  const src = srcBranch();
  seedBranches([src]);
  const srcBefore = JSON.stringify(mockDB.branches.find(x => x.id === 'br-src'));
  const res = await createBranch({ mode: 'copy', sourceId: 'br-src', name: '光华管理学院博士党支部', by: 'p_pc' });
  assert.equal(res.ok, true, JSON.stringify(res));
  const b = res.branch;
  assert.equal(b.name, '光华管理学院博士党支部');
  assert.equal(b.type, '本科生', 'type 随源');
  assert.equal(b.secretaryId, null, '复制不带走书记任命');
  // config 域复制（深拷贝等值）
  assert.deepEqual(b.config.modules, src.config.modules);
  assert.deepEqual(b.config.blocks, src.config.blocks);
  assert.deepEqual(b.config.workforce, src.config.workforce);
  // org 域复制：desc/themePreset 随源；headerTitle 取新名（name→headerTitle 同步不变式）
  assert.equal(b.config.desc, '源支部自述');
  assert.equal(b.config.themePreset, 'sky');
  assert.equal(b.config.headerTitle, '光华管理学院博士党支部');
  assert.equal(b.config.fileSpaceIsolated, true);
  // 留痕 from=branch:源
  assert.equal(b.config.configChangeHistory.length, 1);
  assert.equal(b.config.configChangeHistory[0].what, 'branch-created');
  assert.equal(b.config.configChangeHistory[0].from, 'branch:br-src');
  assert.equal(b.config.configChangeHistory[0].by, 'p_pc');
  // 源不动（含留痕不出现）
  assert.equal(JSON.stringify(mockDB.branches.find(x => x.id === 'br-src')), srcBefore);
  // 引用审计通过
  assert.equal(auditEmptyBranchRecord(b), null);
});

test('copy：源不存在 → {ok:false, reason}；源缺省 config 域 → 目标 null（默认）', async () => {
  seedBranches([]);
  const r1 = await createBranch({ mode: 'copy', sourceId: 'br-nope', name: '孤儿支部', by: 'p_pc' });
  assert.equal(r1.ok, false);
  assert.match(r1.reason, /源支部不存在/);

  const src = srcBranch();
  delete src.config.modules;
  delete src.config.blocks;
  delete src.config.workforce; // 源为默认态
  src.config.desc = '';
  src.config.themePreset = null;
  seedBranches([src]);
  const r2 = await createBranch({ mode: 'copy', sourceId: 'br-src', name: '缺省源复制', by: 'p_pc' });
  assert.equal(r2.ok, true, JSON.stringify(r2));
  assert.equal(r2.branch.config.modules, null);
  assert.equal(r2.branch.config.blocks, null);
  assert.equal(r2.branch.config.workforce, null);
  assert.equal(r2.branch.config.desc, '');
  assert.equal(r2.branch.config.themePreset, null);
});

// ═══════════════ ③ name 非法 / 非 party-staff ═══════════════
test('校验：name 显式空（空白串/空串）/超长拒绝；缺省键 → 占位名', async () => {
  seedBranches([]);
  const r1 = await createBranch({ name: '   ' });
  assert.equal(r1.ok, false);
  assert.match(r1.reason, /支部名不能为空/);
  const r2 = await createBranch({ name: '' });
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /支部名不能为空/);
  const r3 = await createBranch({ name: '长'.repeat(81) });
  assert.equal(r3.ok, false);
  assert.match(r3.reason, /支部名过长/);
  const r4 = await createBranch({ name: '名'.repeat(80) });
  assert.equal(r4.ok, true, '恰好 80 字合法');
  assert.equal(mockDB.branches.length, 1, '仅合法创建落库');
});

test('校验：非 party-staff（actorRole 入参）→ {ok:false, reason 无权限}；party-staff 放行', async () => {
  seedBranches([]);
  const r1 = await createBranch({ name: '书记越权支部', by: 'p13', actorRole: 'secretary' });
  assert.equal(r1.ok, false);
  assert.match(r1.reason, /无权限/);
  assert.equal(mockDB.branches.length, 0, '越权不落库');
  const r2 = await createBranch({ name: '党委建支部', by: 'p_pc', actorRole: 'party-staff' });
  assert.equal(r2.ok, true, JSON.stringify(r2));
});

// ═══════════════ ④ 引用审计分层（纯校验）══════════════════
test('引用审计：空模板/空支部零问题；含业务域键/人物 id/任命 → 报问题', () => {
  // 空模板本身通过（验收 2：不引用演示成员 id）
  assert.equal(auditEmptyBranchRecord(EMPTY_BRANCH_TEMPLATE), null);
  // 阴性对照：负样本逐一命中
  const withDomain = auditEmptyBranchRecord({ id: 'br-x', config: {}, activities: [{}] });
  assert.ok(withDomain && /业务域键/.test(withDomain), `应报业务域键：${withDomain}`);
  const withPerson = auditEmptyBranchRecord({ id: 'br-x', config: {}, organizerId: 'p1' });
  assert.ok(withPerson && /成员 id/.test(withPerson), `应报人物 id：${withPerson}`);
  const withSecretary = auditEmptyBranchRecord({ id: 'br-x', config: {}, secretaryId: 'sec-x' });
  assert.ok(withSecretary && /secretaryId/.test(withSecretary), `应报任命：${withSecretary}`);
  // 记录内 by = 党委组织员 p_pc 不误报（留痕审计人允许）
  const okBy = auditEmptyBranchRecord({ id: 'br-x', name: '测试支部', config: { configChangeHistory: [{ by: 'p_pc', what: 'branch-created' }] }, secretaryId: null });
  assert.equal(okBy, null, 'p_pc 等党委审计人不算演示成员引用');
});

// ═══════════════ ⑤ server POST /branches（HTTP 双形态）══════════════════
let server, base;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
});

async function login(personId) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: '123456' }),
  });
  assert.equal(res.status, 200, `登录失败 ${personId}`);
  return (await res.json()).token;
}
function auth(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
async function postBranch(token, body) {
  return fetch(`${base}/api/v1/branches`, {
    method: 'POST', headers: auth(token), body: JSON.stringify(body),
  });
}

test('HTTP：POST /branches 门控——party-staff 201；secretary 403；name 空/超长 400；无 mode 兼容旧表单', async () => {
  const staff = await login('p_pc');
  const sec = await login('p13');
  // secretary（非 party-staff）→ 403
  const r0 = await postBranch(sec, { mode: 'empty', name: '书记越权支部' });
  assert.equal(r0.status, 403, '非 party-staff 不得创建支部');
  // name 显式空 → 400 原因
  const r1 = await postBranch(staff, { mode: 'empty', name: '   ' });
  assert.equal(r1.status, 400);
  assert.match((await r1.json()).reason, /支部名不能为空/);
  // name 超长 → 400 原因
  const r2 = await postBranch(staff, { mode: 'empty', name: '长'.repeat(81) });
  assert.equal(r2.status, 400);
  assert.match((await r2.json()).reason, /支部名过长/);
  // copy 缺 sourceId → 400；源不存在 → 400
  const r3 = await postBranch(staff, { mode: 'copy', name: '无源复制' });
  assert.equal(r3.status, 400);
  const r4 = await postBranch(staff, { mode: 'copy', sourceId: 'br-nope', name: '孤儿复制' });
  assert.equal(r4.status, 400);
  // 无 mode 的旧支部管理表单 {name,type} → 兼容（empty 形态 + type 透传）
  const r5 = await postBranch(staff, { name: '旧表单支部', type: '测试' });
  assert.equal(r5.status, 201, '旧 {name,type} 表单兼容');
  const legacy = (await r5.json()).branch;
  assert.equal(legacy.type, '测试');
  assert.equal(auditEmptyBranchRecord(legacy), null);
});

test('HTTP：empty 创建与前端本地构造双形态一致（归一化逐位相等）', async () => {
  const staff = await login('p_pc');
  const res = await postBranch(staff, { mode: 'empty', name: 'HTTP空支部', by: 'p_pc' });
  assert.equal(res.status, 201);
  const { branch } = await res.json();
  assert.match(branch.id, /^br-[0-9a-f]{8}$/);
  assert.equal(branch.name, 'HTTP空支部');
  assert.equal(branch.secretaryId, null);
  assert.equal(branch.config.modules, null, 'config 默认全开');
  assert.equal(auditEmptyBranchRecord(branch), null);
  const hist = branch.config.configChangeHistory;
  assert.equal(hist.length, 1);
  assert.equal(hist[0].what, 'branch-created');
  assert.equal(hist[0].from, 'empty-template');
  assert.equal(hist[0].by, 'p_pc');
  // 双形态一致：与前端纯构造（buildNewBranchRecord 同参数）逐位相等（id/时间戳除外）
  const localExpected = buildNewBranchRecord({ mode: 'empty', name: 'HTTP空支部', by: 'p_pc' });
  assert.deepEqual(_norm(branch), _norm(localExpected), 'server 与前端 empty 构造一致');
});

test('HTTP：copy 创建与前端本地构造双形态一致；源 br-b1 不被污染', async () => {
  const staff = await login('p_pc');
  const listBefore = await (await fetch(`${base}/api/v1/branches`, { headers: auth(staff) })).json();
  const srcRow = listBefore.find(b => b.id === 'br-b1');
  assert.ok(srcRow, '演示源支部存在');
  const srcBefore = JSON.stringify(srcRow);

  const res = await postBranch(staff, { mode: 'copy', sourceId: 'br-b1', name: 'HTTP复制支部' });
  assert.equal(res.status, 201);
  const { branch } = await res.json();
  assert.equal(branch.name, 'HTTP复制支部');
  assert.equal(branch.config.headerTitle, 'HTTP复制支部', 'headerTitle 随新名（同步不变式）');
  assert.equal(branch.config.modules, null, 'br-b1 源 modules null → 复制默认全开');
  assert.equal(auditEmptyBranchRecord(branch), null);
  assert.equal(branch.config.configChangeHistory[0].from, 'branch:br-b1');

  // 源不被污染
  const listAfter = await (await fetch(`${base}/api/v1/branches`, { headers: auth(staff) })).json();
  assert.equal(JSON.stringify(listAfter.find(b => b.id === 'br-b1')), srcBefore, '源支部未被修改');

  // 双形态一致：前端本地构造（同一源记录）归一化后逐位相等
  const localExpected = buildNewBranchRecord({ mode: 'copy', sourceBranch: srcRow, name: 'HTTP复制支部', by: 'p_pc' });
  assert.deepEqual(_norm(branch), _norm(localExpected), 'server 与前端 copy 构造一致');
});

test('HTTP：POST /branches 后 GET /branches 全字段透传（headerTitle/themePreset 等新字段零丢失，前端消费口径对齐）', async () => {
  const staff = await login('p_pc');
  const posted = [];
  for (const body of [
    { mode: 'empty', name: 'GET透传空支部', type: '硕士' },
    { mode: 'copy', sourceId: 'br-b1', name: 'GET透传复制支部' },
  ]) {
    const r = await postBranch(staff, body);
    assert.equal(r.status, 201);
    posted.push((await r.json()).branch);
  }
  // GET /branches 回读：与 POST 响应逐位相等（branches 表整记录 JSON 存储，config 新字段天然透传）
  const list = await (await fetch(`${base}/api/v1/branches`, { headers: auth(staff) })).json();
  for (const b of posted) {
    const row = list.find(x => x.id === b.id);
    assert.ok(row, `GET /branches 含新建支部 ${b.id}`);
    assert.deepEqual(JSON.parse(JSON.stringify(row)), JSON.parse(JSON.stringify(b)), 'GET 回读 = POST 响应（headerTitle/themePreset/secretaryId 等不丢）');
    assert.ok(Object.prototype.hasOwnProperty.call(row.config, 'headerTitle'), 'config.headerTitle 在 GET 列表透传');
    assert.ok(Object.prototype.hasOwnProperty.call(row.config, 'themePreset'), 'config.themePreset 在 GET 列表透传');
  }
  // 前端消费口径（阶段B 核对结论：无补齐缺口）——模拟 API 模式 init() 以 GET 列表填充 mockDB.branches，
  // 前端 getBranchOrg/getBranchById 直接读该行即可取到新字段，无需服务端再透传
  mockDB.branches = list;
  const org0 = getBranchOrg(posted[0].id);
  assert.equal(org0.headerTitle, posted[0].config.headerTitle || posted[0].name);
  assert.equal(org0.themePreset, posted[0].config.themePreset ?? null);
  assert.equal(org0.secretaryId, null, '席位空缺在列表透传');
  const org1 = getBranchOrg(posted[1].id);
  assert.equal(org1.headerTitle, 'GET透传复制支部');
  assert.equal(org1.themePreset, null);
});
