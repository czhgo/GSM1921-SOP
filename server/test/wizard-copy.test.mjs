// role: [工程师]+[AI]
// server/test/wizard-copy.test.mjs — 复制配置到支部（立项④阶段二，2026-09-06 书记裁范围）
// 纯 Node 测试（不起 server、无浏览器、无 HTTP）：
//   applyConfigCopy 源→单/多 target：modules/blocks/workforce/org 生效、源不被污染、
//   逐 target 留痕 what='config-copied'、from=`branch:${sourceId}`；
//   includeOrg=false 不动 org；目标不存在/源=目标/源不存在 → 返回原因（不 throw）。
// 注入方式与 wizard-package.test.mjs 一致：localStorage 内存桩 + 假 mock 适配器
// （branch 服务写口 getAdapter() 落库 + mockDB 同步，语义对齐 mock-adapter branches.update）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性）。
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908d';
import { registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260908d';
import { applyConfigCopy, getBranchById } from '../../docs/src/services/branch.js?v=20260908d';

// ── localStorage 内存桩（import 之后建立；branch 服务 _actorId 惰性访问）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

// ── 假 mock 适配器（语义对齐 mock-adapter branches.update/updateConfig）──
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
