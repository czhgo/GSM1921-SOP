// role: [工程师]+[AI]
// server/test/todo-jump-contract.test.mjs — 待办 / 今天跳转与就地动作契约（批次 540 波次 1）
//
// 契约：`content/04_web_design/contracts/INTERACTION_AND_NAVIGATION_CONTRACT.md`
// 覆盖（纯 node 静态 + 纯函数；不起服务、不引 playwright）：
//   ① `TODO_ACTIONS` 与六台能力注册表的页签 id 集合逐台相等（两边改动必须同步）；
//   ② 每个动作 × 六个角色解析结果存在；`switch` 目标页签已在本台注册；
//      `inline` / `direct` 不得带工作台页签；
//   ③ `auditTodoActionTargets()` 与模块加载自检为空（缺项运行期显式报错）；
//   ④ 六台待办页与今天页都走同一出口（`executeTodoAction` / `runTodayAction`），不再有 toast-only 兜底；
//   ⑤ 缺 id / 未命中必须给「未定位到具体条目」显式提示；
//   ⑥ `PendingTarget` 设置 → 消费后清空（一次性），且 `section` 随目标传递；
//   ⑦ 五个目标页（talent / roster / attendance / members / growth）已接 PendingTarget 消费。
//
// ⚠ 本文件由主代理统一登记 `test-tier-registry.mjs`（本波次未登记，`test-tier-guard` 待主代理同批改准；
//   登记前不要把它加进任何层，避免与主代理并行改动冲突）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  TODO_ACTIONS, TODO_ACTION_AUDIT, TODO_ROLES, auditTodoActionTargets, resolveTodoAction,
} from '../../docs/src/core/domain/todo-actions.js?v=20261110a';
import {
  WORKSPACE_TAB_REGISTRY, hasWorkspaceTab, synonymWorkspaceTab,
} from '../../docs/src/core/domain/workspace-tabs.js?v=20261110a';
import { PendingTarget } from '../../docs/src/core/session/pending-target.js?v=20261110a';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

/** 六台角色键 → 能力注册表文件（页签真源） */
const CAPABILITY_FILES = {
  secretary: 'capabilities/secretary-workspace.js',
  'org-commissioner': 'capabilities/org-workspace.js',
  'prop-commissioner': 'capabilities/prop-workspace.js',
  'disc-commissioner': 'capabilities/disc-workspace.js',
  leader: 'capabilities/leader-workspace.js',
  visitor: 'capabilities/visitor-workspace.js',
};

/** 六台待办页（每台必须经统一出口，不得各自写 tabMap） */
const TODO_TAB_FILES = {
  secretary: 'entries/tabs/secretary/todo-tab.js',
  'org-commissioner': 'entries/tabs/org/todo-tab.js',
  'prop-commissioner': 'entries/tabs/prop/todo-tab.js',
  'disc-commissioner': 'entries/tabs/disc/todo-tab.js',
  leader: 'entries/tabs/leader/todo-tab.js',
  visitor: 'entries/tabs/visitor/todo-tab.js',
};

/** 目标页 PendingTarget 消费（契约 §三：report/member/group/inspection/attendance + 五个目标页） */
const TARGET_TAB_FILES = [
  'entries/tabs/org/talent-tab.js',
  'entries/tabs/org/roster-tab.js',
  'entries/tabs/disc/attendance-tab.js',
  'entries/tabs/leader/members-tab.js',
  'entries/tabs/visitor/growth-tab.js',
];

/** 从能力注册表源码取页签 id（只认 `{ id: 'x'` 形状的 tab 声明；排除能力自身的 `xxx-workspace` id） */
function tabIdsFromSource(source) {
  return [...source.matchAll(/\{\s*id:\s*'([a-z0-9-]+)'/g)]
    .map((m) => m[1])
    .filter((id) => !/-workspace$/.test(id));
}

// ═══════════ ① 动作表 ↔ 六台能力注册表（页签集合逐台相等）═══════════

test('① 六台页签注册表与能力注册表源码逐台相等（改动必须两边同步）', () => {
  const problems = [];
  for (const role of TODO_ROLES) {
    const file = CAPABILITY_FILES[role];
    assert.ok(file, `${role} 未登记能力注册表文件`);
    const declared = [...new Set(tabIdsFromSource(read(file)))];
    const mirrored = [...WORKSPACE_TAB_REGISTRY[role]];
    if (declared.length < 4) problems.push(`${role}：源码只解析到 ${declared.length} 个页签（解析面被写坏）`);
    const missing = declared.filter((id) => !mirrored.includes(id));
    const extra = mirrored.filter((id) => !declared.includes(id));
    if (missing.length) problems.push(`${role}：镜像缺 ${missing.join(' / ')}`);
    if (extra.length) problems.push(`${role}：镜像多 ${extra.join(' / ')}`);
  }
  assert.deepEqual(problems, [], `页签注册表与能力注册表不一致：\n  ${problems.join('\n  ')}`);
});

test('①b 六个角色均已有入口页签 today / todo / overview（同义落点可兜底）', () => {
  assert.equal(TODO_ROLES.length, 6, '六台角色键数量固定为 6');
  for (const role of TODO_ROLES) {
    for (const tab of ['today', 'todo', 'overview']) {
      assert.ok(hasWorkspaceTab(role, tab), `${role} 缺入口页签 ${tab}`);
    }
    const fallback = synonymWorkspaceTab(role, 'not-a-tab');
    assert.ok(fallback && hasWorkspaceTab(role, fallback.tab), `${role} 无可用的同义落点（fail-closed 无出路）`);
  }
});

// ═══════════ ② 每个动作 × 六个角色：解析存在、落点已注册 ═══════════

test('② 20+ 类动作 × 六角色：解析存在且 switch 落点已在本台注册', () => {
  const keys = Object.keys(TODO_ACTIONS);
  assert.ok(keys.length >= 20, `动作表只登记 ${keys.length} 类（契约件要求 ≥ 20 类）`);
  const problems = [];
  for (const key of keys) {
    for (const role of TODO_ROLES) {
      const action = resolveTodoAction({ actionKey: key }, role);
      if (!action) { problems.push(`${key} × ${role}：解析为空`); continue; }
      if (!action.label) problems.push(`${key} × ${role}：缺 label`);
      if (!['inline', 'switch', 'direct'].includes(action.mode)) {
        problems.push(`${key} × ${role}：mode 非法（${action.mode}）`);
      }
      if (action.mode === 'switch') {
        if (!action.tab) problems.push(`${key} × ${role}：switch 缺 tab`);
        else if (!hasWorkspaceTab(role, action.tab)) problems.push(`${key} × ${role}：页签未注册（${action.tab}）`);
      } else if (action.tab) {
        problems.push(`${key} × ${role}：${action.mode} 不得带 tab（${action.tab}）`);
      }
      if (action.kind && typeof action.kind !== 'string') problems.push(`${key} × ${role}：kind 非字符串`);
    }
  }
  assert.deepEqual(problems, [], `动作落点不合格：\n  ${problems.join('\n  ')}`);
});

test('②b 运行期自检为空（缺项必须显式报错，不得静默失效）', () => {
  assert.deepEqual(auditTodoActionTargets(), [], 'auditTodoActionTargets() 非空');
  assert.deepEqual(TODO_ACTION_AUDIT, [], '模块加载自检 TODO_ACTION_AUDIT 非空');
});

test('②c 角色覆盖为六台全覆盖：每个 switch 动作至少五台显式覆盖（余一台用默认落点）', () => {
  const problems = [];
  for (const [key, def] of Object.entries(TODO_ACTIONS)) {
    if (def.mode !== 'switch') continue;
    const overrides = def.roleOverrides || {};
    const explicit = TODO_ROLES.filter((role) => overrides[role]);
    if (explicit.length < TODO_ROLES.length - 1) {
      problems.push(`${key}：显式覆盖 ${explicit.length} 台（应 ≥ ${TODO_ROLES.length - 1}）`);
    }
  }
  assert.deepEqual(problems, [], `角色覆盖不齐：\n  ${problems.join('\n  ')}`);
});

test('②d 同义落点语义抽查：activity / member / group / notice 六台各有承载页', () => {
  const samples = [
    ['archive-remind', 'activity'],
    ['attendance-remind', 'activity'],
    ['member-confirm', 'member'],
    ['tf-committee-requests', 'group'],
    ['notify', 'notice'],
    ['read', 'activity'],
  ];
  for (const [key, kind] of samples) {
    for (const role of TODO_ROLES) {
      const action = resolveTodoAction({ actionKey: key }, role);
      assert.equal(action.kind, kind, `${key} × ${role}：kind 须为 ${kind}`);
      assert.ok(hasWorkspaceTab(role, action.tab), `${key} × ${role}：${action.tab} 未注册`);
    }
  }
});

// ═══════════ ③ 无 toast-only ═══════════

test('③ 统一导航不含 toast-only：workspace-nav 不引 showToast，失败一律可见提示', () => {
  const nav = read('core/session/workspace-nav.js');
  assert.doesNotMatch(nav, /showToast/, '导航层不得用 toast 作为失败兜底');
  assert.match(nav, /NAV_MODULE_MISSING_TEXT = '本台无该模块'/, '缺页签主文须为「本台无该模块」');
  assert.match(nav, /NAV_ITEM_MISSING_TEXT = '未定位到具体条目'/, '缺 id 主文须为「未定位到具体条目」');
  assert.match(nav, /data-ws-nav-notice/, '失败提示须渲染到内容区（可见）');
  assert.match(nav, /synonymWorkspaceTab/, '失败提示须给同义落点');
  assert.match(nav, /export function executeTodoAction/, '动作执行须有统一出口');
});

test('③b 六台待办页全部经 executeTodoAction；不再写「请处理：」类 toast 兜底', () => {
  const problems = [];
  for (const [role, file] of Object.entries(TODO_TAB_FILES)) {
    const src = read(file);
    if (!/executeTodoAction/.test(src)) problems.push(`${role}（${file}）：未接 executeTodoAction`);
    if (/请处理：/.test(src)) problems.push(`${role}（${file}）：仍有「请处理：」toast-only 兜底`);
    if (/goToWorkspaceTab\(action\.tab/.test(src)) problems.push(`${role}（${file}）：仍在本地解析 action.tab 切页`);
  }
  assert.deepEqual(problems, [], `待办页出口不统一：\n  ${problems.join('\n  ')}`);
});

test('③c 今天页待办行为动作级落点（data-go="action" + runTodayAction）', () => {
  const src = read('entries/tabs/today/today-tab.js');
  assert.match(src, /data-go="action" data-action-key="\$\{esc\(it\.actionKey \|\| ''\)\}" data-source-id="/,
    '待办行须带动作级标记（data-go="action" + actionKey + sourceId）');
  assert.match(src, /function runTodayAction\(btn, role\)/, '今天页须有动作级落点执行函数');
  assert.match(src, /executeTodoAction\(todoLike, role\)/, '今天页须复用统一执行出口');
  assert.match(src, /go === 'action'/, '点击分派须识别 data-go="action"');
  assert.match(src, /data-go="todo" data-report-id=/, '汇报行保持原落点（待答复收件箱）');
});

// ═══════════ ④ 缺 id 有显式提示 ═══════════

test('④ 缺 id / 未命中：待办壳与五个目标页都写「未定位到具体条目」', () => {
  const shell = read('components/record/todo-tab-shell.js');
  assert.match(shell, /未定位到具体条目/, '待办壳缺 id / 未命中须给显式提示');
  assert.match(shell, /PendingTarget\.consume\(\)/, '待办壳须一次性消费 PendingTarget');
  assert.match(shell, /data-nav-target-missing/, '提示须为页内可见节点');

  const problems = [];
  for (const file of TARGET_TAB_FILES) {
    const src = read(file);
    if (!/PendingTarget/.test(src) || !/PendingTarget\.consume\(\)/.test(src)) {
      problems.push(`${file}：未接 PendingTarget 消费`);
    }
    if (!/未定位到具体条目/.test(src)) problems.push(`${file}：缺 id / 未命中的显式提示缺失`);
    if (!/data-nav-target-missing/.test(src)) problems.push(`${file}：提示未落到页内可见节点`);
  }
  assert.deepEqual(problems, [], `目标页定位不完整：\n  ${problems.join('\n  ')}`);
});

// ═══════════ ⑤ PendingTarget 一次性与 section 传递 ═══════════

test('⑤ PendingTarget：set → consume 后清空；section 随目标传递；无 tab 不写入', () => {
  PendingTarget.clear();
  PendingTarget.set({ tab: 'todo', kind: 'report', id: 'r-1', section: 'review' });
  assert.deepEqual(PendingTarget.peek(), { tab: 'todo', kind: 'report', id: 'r-1', section: 'review' });
  const taken = PendingTarget.consume();
  assert.equal(taken.id, 'r-1');
  assert.equal(taken.section, 'review', 'section 须随目标传递（成长页 / 考勤补课段依赖它）');
  assert.equal(PendingTarget.peek(), null, '★ 消费后必须清空（不得重渲染重复定位）');
  assert.equal(PendingTarget.consume(), null, '再次消费返回空');

  PendingTarget.set({ kind: 'report', id: 'x' });
  assert.equal(PendingTarget.peek(), null, '未给 tab 的目标不得写入');
  PendingTarget.clear();
});
