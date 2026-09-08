// role: [工程师]+[AI]
// server/test/wizard-report.test.mjs — 换组织向导「换壳工作单」纯函数单测（阶段一，2026-09-06）
// 纯 Node 测试（不起 server、无浏览器）：
//   report 纯函数 buildOrgWizardReport → markdown 断言关键片段（支部名/模块摘要/文件清单/验证点）；
//   roster 衔接：可 import roster getRosterStats（现读数 ≥0 且应到 = 党员 − 滞留）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v=20260903c query（模块缓存键一致性，同 roster/attendance-batch）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildOrgWizardReport } from '../../docs/src/services/org-wizard-report.js?v=20260908c';
import { getRosterStats } from '../../docs/src/services/roster.js?v=20260908c';

const SAMPLE = {
  branchInfo: {
    id: 'br-b1',
    name: '光华管理学院本科生党支部',
    headerTitle: '光华管理学院本科生党支部',
    type: '本科生',
    secretaryName: '储子禾',
    desc: '本科生党建工作样板支部',
  },
  theme: { presetId: 'red', name: '党建红调', accentHex: '#B91C1C' },
  modulesSummary: {
    total: 10,
    visibleCount: 9,
    hiddenLabels: ['反馈管理'],
    orderChanged: false,
  },
  blocksSummary: {
    outputTotal: 4,
    outputHiddenLabels: ['宣传'],
    wbHiddenLabels: [],
  },
  workforce: [
    { module: '三会一课', owner: '党支部书记' },
    { module: '发展党员', owner: '组织委员' },
  ],
  rosterStats: { expected: 19, partyTotal: 21, detainedParty: 2 },
};

test('report：包含支部名与已完成配置摘要（含主题预设/自述）', () => {
  const md = buildOrgWizardReport(SAMPLE);
  assert.ok(md.includes('# 换壳工作单 — 光华管理学院本科生党支部'), '标题含支部名');
  assert.ok(md.includes('支部自述：本科生党建工作样板支部'));
  assert.ok(md.includes('党建红调 · #B91C1C'), '主题预设入文');
  assert.ok(md.includes('--app-accent'), '可调令牌说明入文');
  assert.ok(md.includes('party-red'), '固定令牌口径入文（党建红不可改）');
  assert.ok(md.includes('party-gold'), '固定令牌口径入文（党徽金不可改）');
});

test('report：模块/块摘要与角色分工行入文', () => {
  const md = buildOrgWizardReport(SAMPLE);
  assert.ok(md.includes('共 10 项，当前启用 9 项'), '模块摘要');
  assert.ok(md.includes('停用：反馈管理'), '停用模块标签');
  assert.ok(md.includes('活动产出块：共 4 项'), '产出块摘要');
  assert.ok(md.includes('停用：宣传'), '停用产出块标签');
  assert.ok(md.includes('三会一课 → 党支部书记'), '分工行');
  assert.ok(md.includes('发展党员 → 组织委员'), '分工行 2');
});

test('report：待手动替换文件清单要点齐全（mock/constants/权限/术语/制度/配色/policy）', () => {
  const md = buildOrgWizardReport(SAMPLE);
  for (const frag of [
    'docs/src/mock/people.js?v=20260908c',
    'docs/src/core/constants.js?v=20260908c',
    'SYSTEM_ROLE_PERMISSION.md',
    'USAGE_POLICY.md',
    'content/02_institution/sop/',
    'COLOR_SYSTEM.md',
    'docs/src/styles.css',
    'docs/src/core/policy-defaults.js?v=20260908c',
  ]) {
    assert.ok(md.includes(frag), `文件清单应含：${frag}`);
  }
});

test('report：验证点齐全（应到口径读数/?reset=1/npm test）', () => {
  const md = buildOrgWizardReport(SAMPLE);
  assert.ok(md.includes('在册党员 21 人；滞留剔除 2 人；应到 19 人'), '应到现读数入文');
  assert.ok(md.includes('应到 = 在册党员'), '应到口径说明');
  assert.ok(md.includes('?reset=1'), '演示重置说明');
  assert.ok(md.includes('npm test'), '回归验证说明');
  assert.ok(md.includes('configChangeHistory'), '留痕可查说明');
});

test('roster 衔接：getRosterStats 可 import 且现读数 ≥0、应到=党员−滞留', () => {
  const stats = getRosterStats({ type: '支部党员大会' });
  assert.ok(Number.isFinite(stats.partyTotal) && stats.partyTotal >= 0, '党员总数 ≥0');
  assert.ok(Number.isFinite(stats.detainedParty) && stats.detainedParty >= 0, '滞留 ≥0');
  assert.ok(Number.isFinite(stats.expected) && stats.expected >= 0, '应到 ≥0');
  assert.equal(stats.expected, stats.partyTotal - stats.detainedParty, '应到 = 党员 − 滞留');
  // 将现读数传入 report → 数字入文
  const md = buildOrgWizardReport({ ...SAMPLE, rosterStats: stats });
  assert.ok(md.includes(`应到 ${stats.expected} 人`), 'report 消费 roster 现读数');
});

test('report：空输入不抛（缺省分支）', () => {
  const md = buildOrgWizardReport();
  assert.ok(md.includes('# 换壳工作单 — （未命名支部）'));
  assert.ok(md.includes('全部启用'));
});
