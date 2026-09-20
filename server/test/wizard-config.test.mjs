// role: [工程师]+[AI]
// server/test/wizard-config.test.mjs — 支部配置搬运（复制到支部 + JSON 覆盖件）单测
//
// 2026-09-16 批次 47-F 第三组（写口组）：**吸纳**原 `wizard-copy.test.mjs` 与 `wizard-package.test.mjs`
//   （2 文件 → 1）。合并判据＝**同域 + 同形态**：两份都在守「支部配置的搬运写口」——
//   一个是**支部间复制**（`applyConfigCopy`）、一个是**覆盖件导入导出**（`buildConfigPackage` /
//   `applyConfigPackage`），写的是同一组键（org 三键 + config 三域：modules / blocks / workforce）、
//   走的是**同一个假适配器**（`branches.update` / `updateConfig`，config 浅合并 + name 同步页眉）。
//   **形态**：都纯 node、无 chromium；**编号**：都无 S 编号 → **无冲突，无需重编号**。
//   合并的**真实收益**＝删掉**逐字重复的四段**（localStorage 内存桩 / `_updateBranch` / `adapter` + before
//   注册 / `seedBranches`），且「复制」与「覆盖件」两条写口的净化口径现在可以**同屏对读**。
//   **未并**：`wizard-report.test.mjs`——它虽同为 `wizard-` 前缀，但**形态不同**：是**纯函数 /
//   纯文本产物**（`buildOrgWizardReport` 生成换壳工作单），**不需要**内存桩、**不需要**替换假适配器；
//   硬并会把它的用例置于「假适配器已替换」的环境下运行，正是 47-F 明令**不硬塞**的情形。
//
// 纯 Node 测试（不起 server、无浏览器、无 HTTP）：
//   ── 一、复制配置到支部（原 wizard-copy.test.mjs，立项④阶段二，2026-09-06 支书裁范围）──
//   applyConfigCopy 源→单/多 target：modules/blocks/workforce/org 生效、源不被污染、
//   逐 target 留痕 what='config-copied'、from=`branch:${sourceId}`；
//   includeOrg=false 不动 org；目标不存在/源=目标/源不存在 → 返回原因（不 throw）。
//   ── 二、支部配置 JSON 覆盖件（原 wizard-package.test.mjs，立项④阶段二，2026-09-06 支书裁范围）──
//   buildConfigPackage  导出含 org+config 全键（kind/version/branchId/exportedAt/org/config）
//   applyConfigPackage  合法包写入并使 headerTitle/themePreset/modules 生效、留痕 what='config-package-import'
//   非法 themePreset/modules id 被净化不写坏；缺字段安全（部分 org / 无 config / 空包）。
// 注入方式（与 roster/attendance-batch 先例一致）：
//   - localStorage 内存桩（branch 服务 _actorId 读登录快照键）
//   - registerMockAdapter 注入与 mock-adapter branches.update/updateConfig 同语义的假适配器
//     （branch 写口经 getAdapter() 落库 + mockDB 同步；persist 在未注入时缺省空安全）
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性）。
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260920c';
import { registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260920c';
import { applyConfigCopy, getBranchById } from '../../docs/src/services/branch.js?v=20260920c';
import {
  buildConfigPackage,
  applyConfigPackage,
  PACKAGE_KIND,
  PACKAGE_VERSION,
} from '../../docs/src/services/org-config-package.js?v=20260920c';

// ── localStorage 内存桩（import 之后建立；branch 服务在函数体内惰性访问）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

// ── 假 mock 适配器（语义对齐 mock-adapter branches.update/updateConfig：config 浅合并 + name 同步页眉）──
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

// ════════════════════════════════════════════════════════════════
// 一、复制配置到支部（原 wizard-copy.test.mjs）
// ════════════════════════════════════════════════════════════════

/** 源支部（富配置：四域全设，供复制） */
function srcBranch() {
  return {
    id: 'br-src',
    name: '源支部',
    type: '本科生',
    config: {
      headerTitle: '源页眉',
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
      fileSpaceIsolated: true,
    },
  };
}

/** 目标支部（有与源不同的旧值 + 保留键） */
function tgtBranch(id, name) {
  return {
    id,
    name,
    type: '本科生',
    config: {
      headerTitle: `${name}页眉`,
      themePreset: 'red',
      modules: { hiddenTabIds: ['feedback'], tabOrder: [] },
      blocks: { outputBlocks: { hiddenBlockIds: ['materials'], blockOrder: [] } },
      workforce: { taskforce: { ownerType: 'role', ownerId: 'prop-commissioner' } },
      fileSpaceIsolated: false,
    },
  };
}

// ── a) 源 → 单 target ─────────────────────────────────────
test('copy：源→单 target 生效（modules/blocks/workforce/org），逐 target 留痕 config-copied、源不被污染', async () => {
  seedBranches([srcBranch(), tgtBranch('br-t1', '目标一')]);
  const srcBefore = JSON.stringify(mockDB.branches.find(b => b.id === 'br-src'));
  const res = await applyConfigCopy('br-src', ['br-t1'], { by: 'p_pc' });
  assert.equal(res.length, 1);
  assert.equal(res[0].targetId, 'br-t1');
  assert.equal(res[0].ok, true);
  assert.deepEqual(res[0].fields, ['headerTitle', 'desc', 'themePreset', 'modules', 'blocks', 'workforce']);
  const t1 = getBranchById('br-t1');
  assert.equal(t1.config.headerTitle, '源页眉');
  assert.equal(t1.config.desc, '源支部自述');
  assert.equal(t1.config.themePreset, 'sky');
  assert.deepEqual(t1.config.modules, { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] });
  assert.deepEqual(t1.config.blocks, {
    outputBlocks: { hiddenBlockIds: ['publicity'], blockOrder: [] },
    workflowBlocks: { hiddenBlockIds: ['theme-day'] },
  });
  assert.deepEqual(t1.config.workforce, {
    'three-meetings': { ownerType: 'role', ownerId: 'secretary' },
    taskforce: { ownerType: 'role', ownerId: 'org-commissioner' },
  });
  assert.equal(t1.config.fileSpaceIsolated, false, '未复制键原样保留（config 浅合并）');
  // 留痕：最后一条聚合条目 what='config-copied' from=源
  const hist = t1.config.configChangeHistory;
  assert.ok(Array.isArray(hist) && hist.length === 1, '一次复制一条聚合留痕');
  assert.equal(hist[0].what, 'config-copied');
  assert.equal(hist[0].from, 'branch:br-src');
  assert.equal(hist[0].by, 'p_pc');
  assert.deepEqual(hist[0].to, ['headerTitle', 'desc', 'themePreset', 'modules', 'blocks', 'workforce']);
  // 源不被污染
  assert.equal(JSON.stringify(getBranchById('br-src')), srcBefore, '源支部配置未变');
  assert.equal(getBranchById('br-src').config.configChangeHistory, undefined, '源不留痕');
});

// ── b) 源 → 多 target ─────────────────────────────────────
test('copy：源→多 target 各自生效并独立留痕；结果逐 target 返回', async () => {
  seedBranches([srcBranch(), tgtBranch('br-t1', '目标一'), tgtBranch('br-t2', '目标二')]);
  const res = await applyConfigCopy('br-src', ['br-t1', 'br-t2'], { by: 'p_pc' });
  assert.equal(res.length, 2);
  for (const r of res) {
    assert.equal(r.ok, true);
    assert.ok(r.fields.includes('modules') && r.fields.includes('blocks') && r.fields.includes('workforce') && r.fields.includes('themePreset'));
    const t = getBranchById(r.targetId);
    assert.deepEqual(t.config.modules, { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] });
    assert.equal(t.config.themePreset, 'sky');
    const entry = t.config.configChangeHistory[t.config.configChangeHistory.length - 1];
    assert.equal(entry.what, 'config-copied');
    assert.equal(entry.from, 'branch:br-src');
  }
});

// ── c) includeOrg=false ────────────────────────────────────
test('copy：includeOrg=false 不动 org（headerTitle/themePreset/desc 保持目标现值）', async () => {
  seedBranches([srcBranch(), tgtBranch('br-t1', '目标一')]);
  const res = await applyConfigCopy('br-src', ['br-t1'], { by: 'p_pc', includeOrg: false });
  assert.equal(res[0].ok, true);
  assert.deepEqual(res[0].fields, ['modules', 'blocks', 'workforce']);
  const t1 = getBranchById('br-t1');
  assert.equal(t1.config.headerTitle, '目标一页眉', 'org 不复制');
  assert.equal(t1.config.themePreset, 'red', 'org 不复制');
  assert.equal(t1.config.desc, undefined, 'org 不复制');
  assert.deepEqual(t1.config.modules, { hiddenTabIds: ['calendar'], tabOrder: ['report-up'] }, 'config 域仍生效');
});

// ── d) 非法 / 不存在 → 原因 ──────────────────────────────
test('copy：目标不存在返回原因；混合成功+失败逐条返回', async () => {
  seedBranches([srcBranch(), tgtBranch('br-t1', '目标一')]);
  const res = await applyConfigCopy('br-src', ['br-t1', 'br-nope'], { by: 'p_pc' });
  assert.equal(res.length, 2);
  assert.equal(res[0].ok, true, '存在的目标正常复制');
  assert.equal(res[1].ok, false);
  assert.match(res[1].reason, /目标支部不存在/);
  assert.equal(getBranchById('br-t1').config.themePreset, 'sky', '存在的目标已生效');
});

test('copy：源不存在 / 目标=源 / 空目标清单 → 不写不崩', async () => {
  seedBranches([srcBranch()]);
  const r1 = await applyConfigCopy('br-none', ['br-t1'], { by: 'p_pc' });
  assert.equal(r1[0].ok, false);
  assert.match(r1[0].reason, /源支部不存在/);
  const r2 = await applyConfigCopy('br-src', ['br-src'], { by: 'p_pc' });
  assert.equal(r2[0].ok, false);
  assert.match(r2[0].reason, /同一支部/);
  const r3 = await applyConfigCopy('br-src', [], { by: 'p_pc' });
  assert.deepEqual(r3, [], '空目标清单 → 空结果');
  assert.equal(getBranchById('br-src').config.configChangeHistory, undefined, '全程未写入');
});

// ── e) 源缺省域（默认态）→ 目标恢复默认 ─────────────────────
test('copy：源 config 缺省域（默认全开/默认分工）→ 目标该域恢复默认（null），不污染源', async () => {
  const src = srcBranch();
  delete src.config.modules;
  delete src.config.blocks;
  delete src.config.workforce; // 源为默认态
  seedBranches([src, tgtBranch('br-t1', '目标一')]);
  const srcBefore = JSON.stringify(getBranchById('br-src'));
  const res = await applyConfigCopy('br-src', ['br-t1'], { by: 'p_pc' });
  assert.equal(res[0].ok, true);
  const t1 = getBranchById('br-t1');
  assert.equal(t1.config.modules, null, '目标模块配置恢复默认');
  assert.equal(t1.config.blocks, null, '目标块配置恢复默认');
  assert.equal(t1.config.workforce, null, '目标分工恢复默认');
  assert.deepEqual(res[0].fields, ['headerTitle', 'desc', 'themePreset', 'modules', 'blocks', 'workforce']);
  assert.equal(JSON.stringify(getBranchById('br-src')), srcBefore, '源不被污染');
});

// ════════════════════════════════════════════════════════════════
// 二、支部配置 JSON 覆盖件（原 wizard-package.test.mjs）
// ════════════════════════════════════════════════════════════════

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

// ── f) build：含 org+config 全键 ────────────────────────────
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

// ── g) apply：合法包写入生效 + 留痕 ─────────────────────────
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

// ── h) 净化：非法 themePreset / modules / workforce 不写坏 ──
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

// ── i) 缺字段安全 ─────────────────────────────────────────
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
