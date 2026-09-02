// server/test/branch-module-catalog.test.mjs — 工作流块 L1 服务层（2026-09-03）
// 验证 config.enabledModules 消费函数 + 支部可勾选能力目录（源自能力注册表）。
// node-only（不启浏览器）：副作用导入 capability 注册 → 查询目录 → 判定启用。

import { test } from 'node:test';
import assert from 'node:assert/strict';

const V = '?v=20260901z';

test('L1：支部可勾选能力目录含工作台能力与 tab 元数据（注册表派生）', async () => {
  // 副作用导入触发能力注册（与页面入口一致）
  await import(`../../docs/src/modules/capabilities/secretary-workspace.js${V}`);
  await import(`../../docs/src/modules/capabilities/party-committee-workspace.js${V}`);

  const branchMod = await import(`../../docs/src/services/branch.js${V}`);
  const catalog = branchMod.listBranchModuleCatalog();
  assert.ok(Array.isArray(catalog), '目录返回数组');
  const sec = catalog.find(c => c.capId === 'secretary-workspace');
  assert.ok(sec, '目录含书记工作台能力');
  assert.ok(Array.isArray(sec.tabs), '能力含 tab 清单');
  assert.ok(sec.tabs.some(t => t.label === '上报党委'), '书记工作台 tab 元数据可查（含上报党委）');
  const pc = catalog.find(c => c.capId === 'party-committee-workspace');
  assert.ok(pc && pc.tabs.some(t => t.label === '上报审批'), '党委工作台 tab 元数据可查');
});

test('L1：getEnabledModuleIds/isModuleEnabled——默认全开，配置子集后按清单判定', async () => {
  const { mockDB } = await import(`../../docs/src/core/domain.js${V}`);
  const branchMod = await import(`../../docs/src/services/branch.js${V}`);

  // 注入最小支部档案（默认 config.enabledModules = null）
  mockDB.branches = [{ id: 'br-b1', name: '测试支部', config: { enabledModules: null } }];

  assert.equal(branchMod.getEnabledModuleIds('br-b1'), null, '未配置=null（全开）');
  assert.equal(branchMod.isModuleEnabled('br-b1', 'secretary-workspace'), true, 'null 态全开');

  // 党委配置子集后：仅清单内能力启用
  mockDB.branches[0].config.enabledModules = ['party-committee-workspace'];
  assert.deepEqual(branchMod.getEnabledModuleIds('br-b1'), ['party-committee-workspace']);
  assert.equal(branchMod.isModuleEnabled('br-b1', 'party-committee-workspace'), true);
  assert.equal(branchMod.isModuleEnabled('br-b1', 'secretary-workspace'), false, '子集外能力不启用');
});
