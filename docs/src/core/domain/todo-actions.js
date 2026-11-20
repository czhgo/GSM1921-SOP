// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/todo-actions.js — 待办「主行动」声明式动作表（2026-11-01 批次 524 · #7；
//  2026-11-10 批次 540 波次 1 按 `INTERACTION_AND_NAVIGATION_CONTRACT` 改准）
//
//  单一源：待办行按钮文案与动作落点只在这里定义，各台 todo-tab 不再各写一张 tabMap。
//  纯 ESM 叶子模块（零依赖、无 DOM）：node 直导可测；浏览器侧经 workspace-nav.js 落地。
//
//  表项字段（契约 §一）：
//    mode           必填：'inline' | 'switch' | 'direct'
//                     inline  确认 / 接收 / 通过 / 作废 / 删除 / 催办——在本页行尾或浮窗完成，不跳页；
//                     switch  同工作台可达：先查本台注册页签，命中才 PendingTarget.set ＋ click；
//                     direct  活动 / 专班 / 通知详情走 object-route（不经工作台页签）
//    tab            目标页签 id（仅 switch；须为目标角色已注册的页签——`workspace-tabs.js`）
//    label          主行动按钮文案（todo-list 的 ACTION_LABELS 仅作兜底）
//    kind           深链目标类型（activity / group / review / notice / member / attendance / inspection）
//    section        可选：目标页内的分段 id（如纪检「考勤管理」的补课段、成长页的考察区）
//    roleOverrides  六台全覆盖：按角色覆盖 tab / kind / section（各台页签 id 不同，集中在此，不在多处写 if）
//    scopeOverrides 可选：按 actionData.scope 覆盖（支书 authorize 的活动 / 专班分流）
//
//  解析优先级：actionKey > actionType；角色覆盖 > scope 覆盖 > 表项默认。
//  落点校验：`auditTodoActionTargets()` 逐 action × 六角色核对页签已注册；缺项在模块加载时
//  显式 `console.error`（不静默失效），并供 `server/test/todo-jump-contract.test.mjs` 判红。
// ════════════════════════════════════════════════════════════════

import { hasWorkspaceTab, WORKSPACE_TODO_ROLES } from './workspace-tabs.js?v=20261120a';

/** 六台待办角色键（单一源见 `workspace-tabs.js`；此处只做再导出，便于调用方一处 import） */
export const TODO_ROLES = WORKSPACE_TODO_ROLES;

/** 动作模式三值（契约 §一） */
export const TODO_ACTION_MODES = Object.freeze(['inline', 'switch', 'direct']);

// ── 六台「同义落点」单一源 ──────────────────────────────────────────
//  每个键对应一个业务语义，值 = 该语义在六台各自的承载页签；
//  取值全部来自各台**已注册**页签（`auditTodoActionTargets` 与守卫逐项核对）。
const LAND = {
  // 活动管理 / 活动日历（活动台账、写入、归档缺口）
  activity: {
    secretary: 'calendar',
    'org-commissioner': 'overview',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'overview',
    leader: 'overview',
    visitor: 'activities',
  },
  // 复核 / 审核（支书意见反馈、组织思想汇报、纪检复盘、组长组员进展、成员成长）
  review: {
    secretary: 'feedback',
    'org-commissioner': 'thought-review',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'review',
    leader: 'members',
    visitor: 'growth',
  },
  // 考察（录入 / 确认 / 追踪）
  // 批次 541：支书台无考勤 / 考察页签（原映射落「意见反馈」——反馈页按 `data-issue-id` 找必然失败）。
  //   支书侧考勤 / 考察复核承载在**待办页的复核组**（行尾 / 详情一键确认），故落 `todo` 并定位该组。
  inspection: {
    secretary: 'todo',
    'org-commissioner': 'talent',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'inspection',
    leader: 'members',
    visitor: 'growth',
  },
  // 考勤（确认 / 补课）
  attendance: {
    secretary: 'todo',
    'org-commissioner': 'overview',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'attendance',
    leader: 'attendance',
    visitor: 'attendance',
  },
  // 成员（审批 / 发展节点 / 名册）
  member: {
    secretary: 'group-progress',
    'org-commissioner': 'roster',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'overview',
    leader: 'members',
    visitor: 'growth',
  },
  // 专班 / 工作组（赋权 / 待议 / 成员组）
  group: {
    secretary: 'group-progress',
    'org-commissioner': 'taskforce',
    'prop-commissioner': 'kanban',
    'disc-commissioner': 'overview',
    leader: 'write',
    visitor: 'projects',
  },
  // 通知发布
  notice: {
    secretary: 'notification',
    'org-commissioner': 'overview',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'overview',
    leader: 'overview',
    visitor: 'overview',
  },
  // 归档 / 材料
  archive: {
    secretary: 'calendar',
    'org-commissioner': 'overview',
    'prop-commissioner': 'archive',
    'disc-commissioner': 'overview',
    leader: 'overview',
    visitor: 'activities',
  },
  // 写入活动
  write: {
    secretary: 'calendar',
    'org-commissioner': 'overview',
    'prop-commissioner': 'kanban',
    'disc-commissioner': 'overview',
    leader: 'write',
    visitor: 'activities',
  },
  // 阅读（活动 / 通知）
  read: {
    secretary: 'calendar',
    'org-commissioner': 'overview',
    'prop-commissioner': 'overview',
    'disc-commissioner': 'overview',
    leader: 'overview',
    visitor: 'activities',
  },
  // 提交（活动总结 / 复盘 / 思想汇报）
  submit: {
    secretary: 'calendar',
    'org-commissioner': 'overview',
    'prop-commissioner': 'kanban',
    'disc-commissioner': 'overview',
    leader: 'write',
    visitor: 'growth',
  },
};

/**
 * 把「同义落点表」展开为 `{ tab, kind?, section?, roleOverrides }`（六台全覆盖）。
 * @param {Object<string,string>} tabMap 角色 → 页签
 * @param {{kind?:string, section?:string, primaryRole?:string}} [opts]
 * @returns {{tab:string, kind?:string, section?:string, roleOverrides:Object}}
 */
function _landing(tabMap, { kind = '', section = '', primaryRole = 'secretary' } = {}) {
  const roleOverrides = {};
  for (const role of TODO_ROLES) {
    if (role === primaryRole) continue;
    const tab = tabMap[role];
    if (!tab) throw new Error(`[todo-actions] 同义落点缺角色：${role}`);
    roleOverrides[role] = { tab, ...(kind ? { kind } : {}), ...(section ? { section } : {}) };
  }
  return {
    tab: tabMap[primaryRole],
    ...(kind ? { kind } : {}),
    ...(section ? { section } : {}),
    roleOverrides,
  };
}

export const TODO_ACTIONS = {
  // ══ 制度草案（2026-11-19 批次 574 · `D-886`）：资料查询页（支部文件）不是任何工作台的页签
  //   ⇒ 走 direct（由 `components/record/todo-jump.js::tryDirectJump` 直达 `references.html`）。
  'institution-draft': { mode: 'direct', tab: '', label: '去修改草案', kind: '' },

  // ══ 支书 · 提醒类（落活动管理；其余台按同义落点）══
  'archive-remind': { mode: 'switch', label: '到活动管理处理', ..._landing(LAND.activity, { kind: 'activity' }) },
  'review-remind': { mode: 'switch', label: '到活动管理处理', ..._landing(LAND.activity, { kind: 'activity' }) },
  'attendance-remind': { mode: 'switch', label: '到活动管理处理', ..._landing(LAND.activity, { kind: 'activity' }) },
  'inspection-remind': {
    mode: 'switch',
    label: '到活动管理处理',
    ..._landing(LAND.activity, { kind: 'activity' }),
    // 组织台的考察缺口不能落活动管理，主位在人才库页底「录入考察」
    roleOverrides: {
      ..._landing(LAND.activity, { kind: 'activity' }).roleOverrides,
      'org-commissioner': { tab: 'talent', kind: 'inspection' },
    },
  },
  'semester-detained-remind': {
    mode: 'switch',
    label: '去处理',
    // 学期末滞留集中复核：组织台主位在成员名册（同判据的滞留覆盖源）
    ..._landing(LAND.activity, { kind: 'activity' }),
    roleOverrides: {
      ..._landing(LAND.activity, { kind: 'activity' }).roleOverrides,
      'org-commissioner': { tab: 'roster', kind: 'member' },
    },
  },

  // ══ 支书 / 纪检 · 复核类（动作承载于目标页队列；缺 id 落页顶并显式提示）══
  // 批次 541：支书侧考勤 / 考察复核在待办页复核组就地确认——同义落点表已把 secretary 指向 `todo`，
  //   不再单独覆盖为「意见反馈」（反馈页只承载反馈项，按 `data-issue-id` 找考勤 / 考察必然落空）。
  'attendance-confirm': {
    mode: 'switch',
    label: '去考勤管理',
    ..._landing(LAND.attendance, { kind: 'attendance' }),
  },
  'inspection-confirm': {
    mode: 'switch',
    label: '去考察管理',
    ..._landing(LAND.inspection, { kind: 'inspection' }),
  },
  // 支书 · 考察审核（历史 / 种子键 `inspection-review`；此前未登记 ⇒ 回退 actionType=review
  //   被误落「意见反馈」）。与 `inspection-confirm` 同族，落考察复核组。
  'inspection-review': {
    mode: 'switch',
    label: '去复核',
    ..._landing(LAND.inspection, { kind: 'inspection' }),
  },
  // 支书复盘复核承载在待办复核组（feedback 只承载意见反馈，按 data-issue-id 找复盘必然落空）。
  'review-confirm': {
    mode: 'switch',
    label: '去复核',
    ..._landing({ ...LAND.review, secretary: 'todo' }, { kind: 'review' }),
  },
  'archive-confirm': { mode: 'switch', label: '去复核', ..._landing(LAND.archive, { kind: 'activity' }) },

  // ══ 成员 / 专班待议 ══
  'member-confirm': { mode: 'switch', label: '去处理', ..._landing(LAND.member, { kind: 'member' }) },
  'tf-committee-requests': { mode: 'switch', label: '去处理', ..._landing(LAND.group, { kind: 'group' }) },

  // ══ inline：在本页行尾 / 浮窗完成，不跳页 ══
  'todo-void-confirm': { mode: 'inline', tab: '', label: '去处理', kind: '' },
  'taskforce-approval': { mode: 'inline', tab: '', label: '去处理', kind: '' },
  'member-approve': { mode: 'inline', tab: '', label: '去审批', kind: 'member' },

  // ══ 通用动作（actionType 兜底；六台按角色覆盖页签）══
  authorize: {
    mode: 'switch',
    label: '去处理',
    ..._landing(LAND.group, { kind: 'group' }),
    // 支书：情景②③ 项目赋权按对象归位 ⇒ 活动/专班赋权落活动管理（不落党小组页）
    scopeOverrides: {
      activity: { tab: 'calendar', kind: 'activity' },
      taskforce: { tab: 'calendar', kind: 'group' },
    },
  },
  write: { mode: 'switch', label: '去写入活动', ..._landing(LAND.write, { kind: 'activity' }) },
  review: {
    mode: 'switch',
    label: '去复核',
    ..._landing(LAND.review, { kind: 'review' }),
    // 组织台复核＝考察确认，主位在人才库（与 TO-DO 既有判据一致，不改口径只换落点）
    roleOverrides: {
      ..._landing(LAND.review, { kind: 'review' }).roleOverrides,
      'org-commissioner': { tab: 'talent', kind: 'inspection' },
    },
  },
  notify: { mode: 'switch', label: '去发布', ..._landing(LAND.notice, { kind: 'notice' }) },
  read: { mode: 'switch', label: '去阅读', ..._landing(LAND.read, { kind: 'activity' }) },
  submit: {
    mode: 'switch',
    label: '去提交',
    ..._landing(LAND.submit, { kind: 'activity' }),
    // 成员台复盘提交在「我的成长」的复盘区
    roleOverrides: {
      ..._landing(LAND.submit, { kind: 'activity' }).roleOverrides,
      visitor: { tab: 'growth', kind: 'review', section: 'review' },
    },
  },
  participate: { mode: 'direct', tab: '', label: '去参与', kind: 'activity' },
  track: {
    mode: 'switch',
    label: '去追踪',
    ..._landing(LAND.inspection, { kind: 'inspection' }),
    // 组织台追踪＝考察追踪，主位在人才库
    roleOverrides: {
      ..._landing(LAND.inspection, { kind: 'inspection' }).roleOverrides,
      'org-commissioner': { tab: 'talent', kind: 'inspection' },
    },
  },
  archive: { mode: 'switch', label: '去归档', ..._landing(LAND.archive, { kind: 'activity' }) },
  'activity-archive': { mode: 'switch', label: '去归档', ..._landing(LAND.archive, { kind: 'activity' }) },

  // ══ 组织台 · 专项 ══
  'develop-node-remind': {
    mode: 'switch',
    label: '去办理',
    ..._landing(LAND.member, { kind: 'member', primaryRole: 'org-commissioner' }),
    // 支书台无成员名册，发展节点提醒的主位在党小组（组长赋权 / 组内发展）
    roleOverrides: {
      ..._landing(LAND.member, { kind: 'member', primaryRole: 'org-commissioner' }).roleOverrides,
      secretary: { tab: 'group-progress', kind: 'member' },
    },
  },
  'half-year-inspection-remind': {
    mode: 'switch',
    label: '去核对',
    ..._landing(LAND.inspection, { kind: 'inspection', primaryRole: 'org-commissioner' }),
  },

  // ══ 数据交接（按 handoff- 前缀判定；逐键登记供静态覆盖守卫）══
  'handoff-attendance-archival': { mode: 'inline', tab: '', label: '确认接收', kind: 'handoff' },
  'handoff-inspection-report': { mode: 'inline', tab: '', label: '确认接收', kind: 'handoff' },
  'handoff-material-shortage': {
    mode: 'switch',
    label: '去补课',
    ..._landing(LAND.attendance, { kind: 'attendance', section: 'makeup', primaryRole: 'disc-commissioner' }),
    // 支书侧补课链在待办页的考勤复核组；其余台按 LAND.attendance（组长 / 成员自有考勤页）
    roleOverrides: {
      ..._landing(LAND.attendance, { kind: 'attendance', section: 'makeup', primaryRole: 'disc-commissioner' }).roleOverrides,
      secretary: { tab: 'todo', kind: 'attendance', section: 'makeup' },
    },
  },
};

// `_landing` 的覆盖结果已直接写在表项字面量里（`..._landing(...)` + `roleOverrides` 覆盖），
// 调用方不再各自合并——避免同一覆盖逻辑出现第二份。

/** 合并默认项与覆盖项，并剥离 roleOverrides/scopeOverrides（调用方拿到的永远是扁平结果） */
function _flatten(base, override) {
  const merged = override ? { ...base, ...override } : base;
  return {
    mode: merged.mode || 'switch',
    tab: merged.tab || '',
    label: merged.label || '去处理',
    kind: merged.kind || '',
    ...(merged.section ? { section: merged.section } : {}),
    ...(merged.id ? { id: merged.id } : {}),
  };
}

/**
 * 解析待办的主行动。
 * @param {{actionKey?:string, actionType?:string, role?:string, actionData?:{scope?:string}}} todo
 * @param {string} [role] 调用台角色（缺省读 todo.role）；用于 roleOverrides
 * @returns {{mode:'inline'|'switch'|'direct', tab:string, label:string, kind:string, section?:string, id?:string}|null}
 *   未命中返回 null（调用方必须给可见落点提示，不得只 toast）
 */
export function resolveTodoAction(todo, role) {
  if (!todo) return null;
  const key = todo.actionKey || todo.actionType;
  if (!key) return null;
  const base = TODO_ACTIONS[key] || (todo.actionType ? TODO_ACTIONS[todo.actionType] : null);
  if (!base) return null;

  const roleKey = role || todo.role || '';
  const roleOverride = (base.roleOverrides && roleKey) ? base.roleOverrides[roleKey] : null;
  const scope = todo.actionData && todo.actionData.scope;
  const scopeOverride = (!roleOverride && scope && base.scopeOverrides)
    ? base.scopeOverrides[scope]
    : null;
  return _flatten(base, roleOverride || scopeOverride);
}

/**
 * 落点自检：逐 action × 六角色解析，核对 switch 目标页签已在本台注册、
 * inline / direct 不得带工作台页签。
 * @returns {Array<{key:string, role:string, reason:string}>} 空数组＝全部合格
 */
export function auditTodoActionTargets() {
  const problems = [];
  for (const [key, def] of Object.entries(TODO_ACTIONS)) {
    if (!TODO_ACTION_MODES.includes(def.mode)) {
      problems.push({ key, role: '*', reason: `mode 未登记（${def.mode || '缺失'}）` });
      continue;
    }
    for (const role of TODO_ROLES) {
      const action = resolveTodoAction({ actionKey: key }, role);
      if (!action) {
        problems.push({ key, role, reason: '解析结果为空' });
        continue;
      }
      if (action.mode === 'switch') {
        if (!action.tab) problems.push({ key, role, reason: 'switch 缺目标页签' });
        else if (!hasWorkspaceTab(role, action.tab)) {
          problems.push({ key, role, reason: `页签未在本台注册：${action.tab}` });
        }
      } else if (action.tab) {
        problems.push({ key, role, reason: `${action.mode} 不得声明工作台页签：${action.tab}` });
      }
    }
  }
  return problems;
}

/**
 * 模块加载时自检结果（运行期显式报错；不抛错以免单条写坏把整页打空）。
 * 守卫 `server/test/todo-jump-contract.test.mjs` 断言本数组为空。
 */
export const TODO_ACTION_AUDIT = auditTodoActionTargets();
if (TODO_ACTION_AUDIT.length) {
  console.error('[todo-actions] 动作落点未在本台注册（已 fail-closed）：', TODO_ACTION_AUDIT);
}
