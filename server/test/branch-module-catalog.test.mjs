// server/test/branch-module-catalog.test.mjs — 支部工作流模块配置服务层（L2，2026-09-03）
// 验证 config.modules 的 tab 级消费：getBranchTabPolicy / applyTabPolicy（核心固定/hidden/order）
// + updateBranchModules 核心防御；能力目录（listBranchModuleCatalog）仍为画布数据源。
// node-only（不启浏览器）：副作用导入 capability 注册 → 查目录 → 策略判定 → 过滤排序。

import { test } from 'node:test';
import assert from 'node:assert/strict';

const V = '?v=20260903a'; // 与 docs/src 模块内部 import 版本一致（同一 query → 同一模块实例）；bump 时同步替换

test('L2：支部可勾选能力目录含工作台能力与 tab 元数据（注册表派生，画布数据源）', async () => {
  await import(`../../docs/src/modules/capabilities/secretary-workspace.js${V}`);
  await import(`../../docs/src/modules/capabilities/party-committee-workspace.js${V}`);

  const branchMod = await import(`../../docs/src/services/branch.js${V}`);
  const catalog = branchMod.listBranchModuleCatalog();
  assert.ok(Array.isArray(catalog), '目录返回数组');
  const sec = catalog.find(c => c.capId === 'secretary-workspace');
  assert.ok(sec, '目录含书记工作台能力');
  assert.ok(sec.tabs.some(t => t.id === 'module-config'), '目录含工作台配置 tab（L2 新入口）');
});

test('L2：默认全开；配置子集后业务 tab 过滤/排序生效，核心组固定不可关（纯函数）', async () => {
  const branchMod = await import(`../../docs/src/services/branch.js${V}`);

  // 模拟书记工作台 tabs（含核心组 + 三个业务组 tab）
  const tabs = [
    { id: 'todo', label: '待办', groupLabel: '工作台' },
    { id: 'overview', label: '全局概况', groupLabel: '工作台' },
    { id: 'module-config', label: '工作台配置', groupLabel: '工作台' },
    { id: 'calendar', label: '活动管理', groupLabel: '党建' },
    { id: 'notification', label: '通知发布', groupLabel: '党建' },
    { id: 'feedback', label: '反馈管理', groupLabel: '反馈' },
    { id: 'report-up', label: '上报党委', groupLabel: '对接党委' },
  ];

  // 1) modules=null（默认）→ 全开，保持注册顺序
  assert.deepEqual(
    branchMod.applyTabPolicyPure(tabs, null).map(t => t.id),
    ['todo', 'overview', 'module-config', 'calendar', 'notification', 'feedback', 'report-up'],
    '默认全开且顺序=注册序'
  );

  // 2) 配置：隐藏 calendar/feedback；把 report-up 提前（脏数据 hidden 含核心 todo 一并注入）
  const policy = branchMod.getTabPolicy({ hiddenTabIds: ['calendar', 'feedback', 'todo'], tabOrder: ['report-up', 'notification'] });
  assert.ok(policy.hidden.has('calendar') && policy.hidden.has('feedback'), 'hidden 含业务 tab');
  const applied = branchMod.applyTabPolicyPure(tabs, { hiddenTabIds: ['calendar', 'feedback', 'todo'], tabOrder: ['report-up', 'notification'] }).map(t => t.id);
  assert.deepEqual(
    applied,
    ['todo', 'overview', 'module-config', 'report-up', 'notification'],
    '核心组固定前置（脏数据 hidden 含 todo 也不受影响）；业务过滤 hidden 后按 tabOrder 排序'
  );
});
