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
//   ⑧ 批次 541 P0-1：今天页行点击的定位键＝聚合组键（`role:actionKey`），壳内补 id → groupKey 反查；
//   ⑨ 批次 541 P0-2：支书考勤 / 考察复核落待办复核组，意见反馈页不得对非 review 深链误报「未找到反馈项」。
//
// ⚠ 本文件由主代理统一登记 `test-tier-registry.mjs`（本波次未登记，`test-tier-guard` 待主代理同批改准；
//   登记前不要把它加进任何层，避免与主代理并行改动冲突）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  TODO_ACTIONS, TODO_ACTION_AUDIT, TODO_ROLES, auditTodoActionTargets, resolveTodoAction,
} from '../../docs/src/core/domain/todo-actions.js?v=20261120a';
import {
  WORKSPACE_TAB_REGISTRY, hasWorkspaceTab, synonymWorkspaceTab,
} from '../../docs/src/core/domain/workspace-tabs.js?v=20261120a';
import {
  NAV_MODULE_MISSING_TEXT, showNavFallback,
} from '../../docs/src/core/session/workspace-nav.js?v=20261120a';
import { PendingTarget } from '../../docs/src/core/session/pending-target.js?v=20261120a';

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

test('② 动作表条数固定（31 类）× 六角色：解析存在且 switch 落点已在本台注册', () => {
  const keys = Object.keys(TODO_ACTIONS);
  // 批次 541 改准：精确等值锁死条数（原 `>= 20` 允许「悄悄删一条」，与契约「逐台登记、增删同批改」不符）。
  //   29 → 30 的来历：批次 541 P0-2 补登 `inspection-review`（支书考察审核，历史 / 种子键）。
  //   30 → 31 的来历：批次 574（`D-886`）补登 `institution-draft`（制度草案 → 资料查询页，direct）。
  assert.equal(keys.length, 31, `动作表登记 ${keys.length} 类，基线 31 类：增删须同批改契约 §一 与 CASES 036`);
  assert.equal(TODO_ROLES.length, 6, `六台角色键 ${TODO_ROLES.length} 个，基线 6 个：增删须同批改契约 §一 与能力注册表`);
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

/**
 * 最小 DOM 桩（批次 541 · G-2）：只为**真渲一次** fail-closed 提示，不模拟浏览器。
 * 够 `workspace-nav._contentHost` / `_renderNavNotice` 用：`querySelector` 取页签按钮、
 * `getElementById` 取内容区、`createElement` + `appendChild` + `prepend` 造节点树。
 */
function installFakeDom() {
  const node = (tag) => {
    const attrs = {};
    const data = {};
    // `dataset.x = v` 在真 DOM 里等价于写 `data-x` 属性——桩件同样回写，断言才能落在属性上
    const dataset = new Proxy(data, {
      set(t, key, value) {
        t[key] = String(value);
        attrs[`data-${String(key).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] = String(value);
        return true;
      },
    });
    return {
      tagName: String(tag).toUpperCase(),
      children: [],
      dataset,
      attrs,
      className: '',
      textContent: '',
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return Object.hasOwn(attrs, k) ? attrs[k] : null; },
      appendChild(child) { this.children.push(child); return child; },
      prepend(child) { this.children.unshift(child); return child; },
      addEventListener() {},
      remove() {},
      querySelectorAll() { return []; },
    };
  };
  const host = node('div');
  host.id = 'ws-tab-content';
  const tabBtn = node('button');
  tabBtn.setAttribute('data-ws-tab-btn', 'todo');
  tabBtn.setAttribute('aria-controls', host.id);
  const prev = globalThis.document;
  globalThis.document = {
    querySelector(sel) { return sel === '[data-ws-tab-btn]' ? tabBtn : null; },
    getElementById(id) { return id === host.id ? host : null; },
    createElement(tag) { return node(tag); },
  };
  return {
    host,
    restore() {
      if (prev === undefined) delete globalThis.document;
      else globalThis.document = prev;
    },
  };
}

/** 节点树里的全部文本（含自身 `textContent`） */
function textsOf(node, out = []) {
  if (!node) return out;
  if (node.textContent) out.push(String(node.textContent));
  for (const c of node.children || []) textsOf(c, out);
  return out;
}

/** 按 `dataset` 键找节点（`dataset.key` 存在即为命中） */
function findByDataset(node, key) {
  if (!node) return null;
  if (node.dataset && Object.hasOwn(node.dataset, key)) return node;
  for (const c of node.children || []) {
    const hit = findByDataset(c, key);
    if (hit) return hit;
  }
  return null;
}

test('③ 统一导航不含 toast-only：workspace-nav 不引 showToast，失败一律可见提示', () => {
  const nav = read('core/session/workspace-nav.js');
  assert.doesNotMatch(nav, /showToast/, '导航层不得用 toast 作为失败兜底');
  assert.match(nav, /NAV_MODULE_MISSING_TEXT = '本台无该模块'/, '缺页签主文须为「本台无该模块」');
  assert.match(nav, /NAV_ITEM_MISSING_TEXT = '未定位到具体条目'/, '缺 id 主文须为「未定位到具体条目」');
  assert.match(nav, /data-ws-nav-notice/, '失败提示须渲染到内容区（可见）');
  assert.match(nav, /synonymWorkspaceTab/, '失败提示须给同义落点');
  assert.match(nav, /export function executeTodoAction/, '动作执行须有统一出口');

  // ③-dom（批次 541 · G-2）：静态串之外**真渲一次**节点树 —— 内容区必须拿到提示卡 ＋ 可点的同义落点，
  //   且落点必须指向本台已注册页签（否则「给了按钮也点不到」仍是 fail-closed 失效）。
  //   真机同款链路见 `server/test/today-action-groups-e2e.test.mjs`（本文件保持纯 node、不起服务、不引 playwright）。
  const { host, restore } = installFakeDom();
  try {
    const rendered = showNavFallback({ tabId: 'kanban', role: 'secretary' });
    assert.equal(rendered, true, '内容区有落点时 showNavFallback 必须真渲染（返回 true），不得只 console.warn');
    const card = host.children[0];
    assert.ok(card, '提示卡须 prepend 进内容区');
    assert.equal(card.getAttribute('data-ws-nav-notice'), '1', '提示卡须带 data-ws-nav-notice 标记');
    const texts = textsOf(card);
    assert.ok(texts.some((t) => t.includes(NAV_MODULE_MISSING_TEXT)),
      `提示主文须含「${NAV_MODULE_MISSING_TEXT}」；实得 ${JSON.stringify(texts)}`);
    const go = findByDataset(card, 'wsNavFallbackGo');
    assert.ok(go, '缺页签须在同屏给同义落点按钮（dataset.wsNavFallbackGo）');
    const target = go.dataset.wsNavFallbackGo;
    assert.ok(hasWorkspaceTab('secretary', target), `同义落点 ${target} 必须是本台已注册页签`);
    assert.equal(target, synonymWorkspaceTab('secretary', 'kanban').tab, '同义落点须与 synonymWorkspaceTab 单一源一致');
    assert.match(String(go.textContent), /^去/, '同义落点按钮文案须为「去<页签名>」');
  } finally {
    restore();
  }
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

// ═══════════ ⑥ 今天页 → 待办页：定位键＝聚合组键（批次 541 P0-1）═══════════
// 病灶：今天行把「待办本体 id」当 PendingTarget.id，而待办页行键是 `role:actionKey` ⇒ 选择器永不命中。

test('⑥ 今天页行点击传聚合组键（组 → 行唯一键），壳内补 id → groupKey 反查', () => {
  const today = read('entries/tabs/today/today-tab.js');
  assert.match(today, /data-group-key="\$\{esc\(it\.groupKey \|\| ''\)\}"/,
    '今天页待办行须带聚合组键（待办页行键 role:actionKey）');
  assert.match(today, /pendingId: groupKey/, 'switch 落点须以组键作 PendingTarget 定位键');
  assert.match(today, /goToWorkspaceTab\('todo', \{ kind: 'todo', id: groupKey \|\| todoId \|\| null \}/,
    'inline / 未登记动作落到待办时同样以组键定位');

  const summary = read('services/governance/today-summary.js');
  assert.match(summary, /groupKey: g\.groupKey \|\| ''/, 'byAction 项须带组键（否则今天页无键可传）');

  const nav = read('core/session/workspace-nav.js');
  assert.match(nav, /todo\.pendingId/, 'switch 落点须支持显式 pendingId（今天页传组键）');

  const shell = read('components/record/todo-tab-shell.js');
  assert.match(shell, /_findNavAnchor/, '壳内须有独立锚点查找（kind 锚点 → 组键反查）');
  assert.match(shell, /_findNavAnchor\(container, matchedGroup\.groupKey, 'group'\)/,
    '★ 壳内须做 id → groupKey 反查（条目 / 待办本体 id 也要落到所属组行）');
});

// ═══════════ ⑦ 支书考勤 / 考察落点（批次 541 P0-2）═══════════
// 病灶：支书 attendance / inspection 覆盖到「意见反馈」且 kind=review，反馈页按 `data-issue-id` 找必然失败。

test('⑦ 支书考勤 / 考察复核落待办复核组（不得误落意见反馈）', () => {
  for (const [key, kind] of [
    ['attendance-confirm', 'attendance'],
    ['inspection-confirm', 'inspection'],
    ['inspection-review', 'inspection'],
  ]) {
    const action = resolveTodoAction({ actionKey: key }, 'secretary');
    assert.ok(action, `${key} × secretary：解析为空`);
    assert.equal(action.kind, kind, `${key} × secretary：kind 须为 ${kind}`);
    assert.notEqual(action.tab, 'feedback', `${key} × secretary：不得落意见反馈（该页只承载反馈项）`);
    assert.equal(action.tab, 'todo', `${key} × secretary：落待办复核组`);
    assert.ok(hasWorkspaceTab('secretary', action.tab), `${key} × secretary：${action.tab} 未注册`);
  }
  // 六台 roleOverrides 仍完整：每键除支书外五台显式覆盖（合计六台）
  for (const key of ['attendance-confirm', 'inspection-confirm', 'inspection-review']) {
    const overrides = TODO_ACTIONS[key].roleOverrides || {};
    assert.equal(TODO_ROLES.filter((role) => overrides[role]).length, TODO_ROLES.length - 1,
      `${key}：须保留五台显式覆盖（六台落点完整）`);
  }
});

test('⑦b 意见反馈页：非 review 的深链不得误报「未找到反馈项」', () => {
  const src = read('entries/tabs/secretary/feedback-tab.js');
  assert.match(src, /navTarget\.kind === 'review'/, '反馈项定位须只认 review 语义');
  assert.match(src, /navTarget\.kind !== 'review'/, '★ 非 review 深链须单列分支（不得复用「未找到反馈项」文案）');
  const nonReviewBranch = src.slice(src.indexOf("navTarget.kind !== 'review'"));
  assert.doesNotMatch(nonReviewBranch, /未找到对应反馈项/, '非 review 分支不得出现「未找到对应反馈项」');
});
