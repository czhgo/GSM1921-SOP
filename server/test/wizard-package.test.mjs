// role: [工程师]+[AI]
// server/test/wizard-package.test.mjs — 支部配置 JSON 覆盖件（立项④阶段二，2026-09-06 书记裁范围）
// 纯 Node 测试（不起 server、无浏览器、无 HTTP）：
//   buildConfigPackage  导出含 org+config 全键（kind/version/branchId/exportedAt/org/config）
//   applyConfigPackage  合法包写入并使 headerTitle/themePreset/modules 生效、留痕 what='config-package-import'
//   非法 themePreset/modules id 被净化不写坏；缺字段安全（部分 org / 无 config / 空包）。
// 注入方式（与 roster/attendance-batch 先例一致）：
//   - localStorage 内存桩（branch 服务 _actorId 读登录快照键）
//   - registerMockAdapter 注入与 mock-adapter branches.update/updateConfig 同语义的假适配器
//     （branch 写口经 getAdapter() 落库 + mockDB 同步；persist 在未注入时缺省空安全）
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性）。
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908d';
import { registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260908d';
import {
  buildConfigPackage,
  applyConfigPackage,
  PACKAGE_KIND,
  PACKAGE_VERSION,
} from '../../docs/src/services/org-config-package.js?v=20260908d';
import { getBranchById } from '../../docs/src/services/branch.js?v=20260908d';

// ── localStorage 内存桩（import 之后建立；branch 服务在函数体内惰性访问）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

// ── 假 mock 适配器（语义对齐 mock-adapter branches.update/updateConfig：config 浅合并 + name 同步 header）──
function _updateBranch(id, patch) {
  const idx = mockDB.branches.findIndex(b => b.id === id);
  if (idx === -1) throw Object.assign(new Error(`支部 ${id} 不存在`), { type: 'NotFoundError' });
  const cur = mockDB.branches[idx];
  const nextConfig = { ...(cur.config || {}), ...(patch.config || {}) };
  if (patch.name !== undefined && patch.name) nextConfig.headerTitle = patch.name;
  const next = { ...cur, ...patch, config: nextConfig };
  mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
  return next;
}
const adapter = {
  saveDB() {},
  branches: {
    update: (id, patch) => _updateBranch(id, patch),
    updateConfig: (id, configPatch) => _updateBranch(id, { config: configPatch }),
  },
};

before(() => {
  registerMockAdapter(adapter);
});

/** 每例独立现场：深拷贝种入支部清单（用例间互不污染） */
function seedBranches(list) {
  mockDB.branches = list.map(b => ({
    ...b,
    config: b.config ? JSON.parse(JSON.stringify(b.config)) : {},
  }));
}

/** 造一份合法覆盖件（org 全键 + config 三域） */
function validPkg(overrides = {}) {
  return {
    kind: PACKAGE_KIND,
    version: PACKAGE_VERSION,
    branchId: 'br-src',
    exportedAt: '2026-09-06T00:00:00.000Z',
    by: 'p_pc',
    org: { headerTitle: '源支部页眉', desc: '源支部自述', themePreset: 'sky' },
    config: {
      modules: { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] },
      blocks: {
        outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: [] },
        workflowBlocks: { hiddenBlockIds: ['theme-day'] },
      },
      workforce: { taskforce: { ownerType: 'role', ownerId: 'org-commissioner' } },
    },
    ...overrides,
  };
}

// ── a) build：含 org+config 全键 ────────────────────────────
test('build：覆盖件含 kind/version/branchId/exportedAt/by 与 org+config 全键（保持既有结构）', () => {
  seedBranches([{
    id: 'br-src',
    name: '源支部',
    type: '本科生',
    config: {
      headerTitle: '源支部页眉',
      desc: '源支部自述',
      themePreset: 'sky',
      modules: { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] },
      blocks: { outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: [] }, workflowBlocks: { hiddenBlockIds: ['theme-day'] } },
      workforce: { taskforce: { ownerType: 'role', ownerId: 'org-commissioner' } },
    },
  }]);
  const pkg = buildConfigPackage({ branchId: 'br-src', by: 'p_pc' });
  assert.equal(pkg.kind, 'gsm1921-org-config');
  assert.equal(pkg.version, 1);
  assert.equal(pkg.branchId, 'br-src');
  assert.ok(typeof pkg.exportedAt === 'string' && pkg.exportedAt.length > 0, 'exportedAt 为 ISO 时间串');
  assert.equal(pkg.by, 'p_pc');
  // org 全键
  assert.equal(pkg.org.headerTitle, '源支部页眉');
  assert.equal(pkg.org.desc, '源支部自述');
  assert.equal(pkg.org.themePreset, 'sky');
  // config 三域全键 + 既有结构
  assert.deepEqual(pkg.config.modules, { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] });
  assert.deepEqual(pkg.config.blocks.outputBlocks.hiddenBlockIds, ['publicity']);
  assert.deepEqual(pkg.config.blocks.workflowBlocks.hiddenBlockIds, ['theme-day']);
  assert.deepEqual(pkg.config.workforce, { taskforce: { ownerType: 'role', ownerId: 'org-commissioner' } });
});

test('build：config 缺省域导出为 null（默认全开/默认分工语义，与既有存储一致）', () => {
  seedBranches([{ id: 'br-src', name: '源支部', type: '本科生', config: { headerTitle: '页眉' } }]);
  const pkg = buildConfigPackage({ branchId: 'br-src' });
  assert.equal(pkg.org.themePreset, null);
  assert.equal(pkg.config.modules, null);
  assert.equal(pkg.config.blocks, null);
  assert.equal(pkg.config.workforce, null);
});

test('build：支部不存在 → 抛错', () => {
  seedBranches([]);
  assert.throws(() => buildConfigPackage({ branchId: 'br-none' }), /支部不存在/);
});

// ── b) apply：合法包写入生效 + 留痕 ─────────────────────────
test('apply：合法包写入目标，headerTitle/themePreset/modules/blocks/workforce 生效且留痕 what=config-package-import', async () => {
  seedBranches([{ id: 'br-tgt', name: '目标支部', type: '本科生', config: { headerTitle: '旧页眉', desc: '', modules: { hiddenTabIds: ['feedback'], tabOrder: [] }, blocks: { outputBlocks: { hiddenBlockIds: ['materials'], blockOrder: [] } }, workforce: null } }]);
  const res = await applyConfigPackage(validPkg(), { branchId: 'br-tgt', by: 'p_pc' });
  assert.equal(res.ok, true);
  assert.equal(res.unchanged, false);
  assert.deepEqual(res.updatedFields.sort(), ['blocks', 'headerTitle', 'modules', 'themePreset', 'workforce', 'desc'].sort());
  const tgt = getBranchById('br-tgt');
  assert.equal(tgt.config.headerTitle, '源支部页眉');
  assert.equal(tgt.config.desc, '源支部自述');
  assert.equal(tgt.config.themePreset, 'sky');
  assert.deepEqual(tgt.config.modules, { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] });
  assert.deepEqual(tgt.config.blocks.outputBlocks.hiddenBlockIds, ['publicity'], '产出块被覆盖');
  assert.deepEqual(tgt.config.workforce, { taskforce: { ownerType: 'role', ownerId: 'org-commissioner' } });
  // 留痕：聚合条目 what='config-package-import'、from 记录包来源
  const hist = tgt.config.configChangeHistory;
  assert.ok(Array.isArray(hist) && hist.length >= 1);
  const entry = hist[hist.length - 1];
  assert.equal(entry.what, 'config-package-import');
  assert.equal(entry.from, 'branch:br-src');
  assert.equal(entry.by, 'p_pc');
  assert.ok(Array.isArray(entry.to) && entry.to.includes('themePreset'), 'to 记录实际变更字段');
});

// ── c) 净化：非法 themePreset / modules / workforce 不写坏 ──
test('apply：非法 themePreset（白名单外）/ 空 headerTitle 被净化丢弃，不写坏目标', async () => {
  seedBranches([{ id: 'br-tgt', name: '目标支部', type: '本科生', config: { headerTitle: '保留页眉', themePreset: 'red', desc: '' } }]);
  const res = await applyConfigPackage(validPkg({ org: { headerTitle: '   ', themePreset: 'gold', desc: '' } }), { branchId: 'br-tgt', by: 'p_pc' });
  assert.equal(res.ok, true);
  const tgt = getBranchById('br-tgt');
  assert.equal(tgt.config.headerTitle, '保留页眉', '空 headerTitle 丢弃（不允许清空）');
  assert.notEqual(tgt.config.themePreset, 'gold', '固定党徽金 gold 不落库');
  assert.ok(!res.updatedFields.includes('headerTitle') && !res.updatedFields.includes('themePreset'));
});

test('apply：非法 modules id（非字符串/超长）与非法 workforce 项被净化丢弃，不写坏', async () => {
  seedBranches([{ id: 'br-tgt', name: '目标支部', type: '本科生', config: {} }]);
  const pkg = validPkg({
    config: {
      modules: { hiddenTabIds: ['ok-mod', 42, 'x'.repeat(90)], tabOrder: 'not-array' },
      blocks: { outputBlocks: { hiddenBlockIds: [7, 'pub-ok', ''], blockOrder: [] } },
      workforce: {
        'not-a-module': { ownerType: 'role', ownerId: 'secretary' },
        taskforce: { ownerType: 'boss', ownerId: 'secretary' },   // ownerType 白名单外 → 丢弃
        'three-meetings': { ownerType: 'role', ownerId: 'secretary' },
      },
    },
  });
  const res = await applyConfigPackage(pkg, { branchId: 'br-tgt', by: 'p_pc' });
  assert.equal(res.ok, true);
  const tgt = getBranchById('br-tgt');
  assert.deepEqual(tgt.config.modules.hiddenTabIds, ['ok-mod'], '非字符串/超长 id 被净化；tabOrder 非数组归空');
  assert.deepEqual(tgt.config.modules.tabOrder, []);
  assert.deepEqual(tgt.config.blocks.outputBlocks.hiddenBlockIds, ['pub-ok']);
  assert.deepEqual(tgt.config.workforce, { 'three-meetings': { ownerType: 'role', ownerId: 'secretary' } }, '非法模块键/ownerType 丢弃');
});

// ── d) 缺字段安全 ─────────────────────────────────────────
test('apply：缺字段安全——org 只给部分键只改该键；无 org/config 的空包返回 unchanged', async () => {
  seedBranches([{
    id: 'br-tgt', name: '目标支部', type: '本科生',
    config: {
      headerTitle: '现页眉', themePreset: 'red', desc: '现自述',
      workforce: { taskforce: { ownerType: 'role', ownerId: 'prop-commissioner' } },
    },
  }]);
  // org 部分键 + config 全缺 → 只写 themePreset
  const r1 = await applyConfigPackage(validPkg({ config: undefined, org: { themePreset: 'green' } }), { branchId: 'br-tgt', by: 'p_pc' });
  assert.deepEqual(r1.updatedFields, ['themePreset']);
  assert.equal(getBranchById('br-tgt').config.themePreset, 'green');
  assert.equal(getBranchById('br-tgt').config.headerTitle, '现页眉', '未提供键不动');
  // config 只给 workforce=null（恢复默认）→ 只写 workforce
  const r2 = await applyConfigPackage(validPkg({ org: undefined, config: { workforce: null } }), { branchId: 'br-tgt', by: 'p_pc' });
  assert.deepEqual(r2.updatedFields, ['workforce']);
  assert.equal(getBranchById('br-tgt').config.workforce, null, 'workforce 恢复默认（null）');
  // 空覆盖件（kind/version 合法但无 org/config）→ unchanged，不抛
  const r3 = await applyConfigPackage({ kind: PACKAGE_KIND, version: PACKAGE_VERSION, branchId: 'br-src' }, { branchId: 'br-tgt', by: 'p_pc' });
  assert.equal(r3.unchanged, true);
});

test('apply：kind/version 不符 / 目标不存在 → 抛错（前端捕获 toast），不写坏', async () => {
  seedBranches([{ id: 'br-tgt', name: '目标支部', type: '本科生', config: { headerTitle: '现页眉' } }]);
  await assert.rejects(() => applyConfigPackage({ kind: 'other', version: 1 }, { branchId: 'br-tgt', by: 'p_pc' }), /kind/);
  await assert.rejects(() => applyConfigPackage(validPkg({ version: 99 }), { branchId: 'br-tgt', by: 'p_pc' }), /版本/);
  await assert.rejects(() => applyConfigPackage(validPkg(), { branchId: 'br-none', by: 'p_pc' }), /目标支部不存在/);
  assert.equal(getBranchById('br-tgt').config.headerTitle, '现页眉', '失败路径不产生写入');
});

test('apply：与现状一致的包不写不留痕（重复应用无冗余条目）', async () => {
  seedBranches([{ id: 'br-tgt', name: '目标支部', type: '本科生', config: {} }]);
  const pkg = validPkg({ config: { modules: null, blocks: null, workforce: null } });
  const r1 = await applyConfigPackage(pkg, { branchId: 'br-tgt', by: 'p_pc' });
  assert.ok(r1.updatedFields.includes('headerTitle') && r1.updatedFields.includes('themePreset') && r1.updatedFields.includes('desc'), '首次仍生效（org 域）');
  assert.ok(!r1.updatedFields.includes('modules'), 'config null 与目标 null 一致时不写');
  const n1 = getBranchById('br-tgt').config.configChangeHistory.length;
  const r2 = await applyConfigPackage(pkg, { branchId: 'br-tgt', by: 'p_pc' });
  assert.equal(r2.unchanged, true);
  assert.equal(getBranchById('br-tgt').config.configChangeHistory.length, n1, '重复应用不追加留痕');
});
