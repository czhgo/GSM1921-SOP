// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/workspace-tabs.js — 六台工作台页签注册表（纯叶子模块，零依赖、无 DOM）
//
//  为什么需要：待办动作表（`todo-actions.js`）与统一导航（`workspace-nav.js`）必须知道
//  「本台到底注册了哪些页签」，才能在跳转前 fail-closed（`INTERACTION_AND_NAVIGATION_CONTRACT §二`）。
//  此前只能按 DOM 里有没有 `[data-ws-tab-btn]` 判断——静态不可测，写错页签字只能静默失效。
//
//  单一源边界：本文件是**注册表的镜像清单**，真源仍是各台能力模块的 `tabs()` 声明
//  （`capabilities/*-workspace.js`）。`server/test/todo-jump-contract.test.mjs` 逐台静态核对
//  两边页签 id 集合相等；任何一边改动未同步即判红（不得只改一处）。
// ════════════════════════════════════════════════════════════════

/** 六台待办角色键（与 `capabilities/*-workspace.js` 的 `today` render 里 `role:` 取值同值） */
export const WORKSPACE_TODO_ROLES = Object.freeze([
  'secretary',
  'org-commissioner',
  'prop-commissioner',
  'disc-commissioner',
  'leader',
  'visitor',
]);

/**
 * 角色键 → 本台**已注册**页签 id（与能力注册表逐字一致；含核心组 today/todo/overview）。
 * 只登记页签 id，不登记 render / 顺序语义——顺序仍以能力注册表为准。
 */
export const WORKSPACE_TAB_REGISTRY = Object.freeze({
  secretary: Object.freeze([
    'today', 'todo', 'overview', 'calendar', 'committee-meeting',
    'group-progress', 'notification', 'report-up', 'work-map', 'feedback',
  ]),
  'org-commissioner': Object.freeze([
    'today', 'todo', 'overview', 'roster', 'talent', 'thought-review', 'taskforce', 'member-flow',
  ]),
  'prop-commissioner': Object.freeze([
    'today', 'todo', 'overview', 'kanban', 'archive',
  ]),
  'disc-commissioner': Object.freeze([
    'today', 'todo', 'overview', 'attendance', 'review', 'inspection',
  ]),
  leader: Object.freeze([
    'today', 'todo', 'overview', 'write', 'attendance', 'members',
  ]),
  visitor: Object.freeze([
    'today', 'todo', 'overview', 'activities', 'projects', 'attendance', 'growth',
  ]),
});

/**
 * 该角色是否在本台注册了该页签。
 * @param {string} role 六台角色键
 * @param {string} tab 页签 id
 * @returns {boolean}
 */
export function hasWorkspaceTab(role, tab) {
  if (!role || !tab) return false;
  const list = WORKSPACE_TAB_REGISTRY[role];
  return Array.isArray(list) && list.includes(tab);
}

/** 本台注册的页签 id 列表（未登记角色返回空数组） */
export function workspaceTabIds(role) {
  const list = WORKSPACE_TAB_REGISTRY[role];
  return Array.isArray(list) ? [...list] : [];
}

/** 同义落点优先级（本台一定有工作概况 / 待办 / 今天 ⇒ 命中率足够，不需要逐动作另写表） */
const SYNONYM_PRIORITY = ['overview', 'todo', 'today'];

/**
 * 目标页签不在本台时给出的**同义落点**（fail-closed 提示卡上的「去这里」）。
 * 规则：同台注册表内按 工作概况 → 待办 → 今天 取第一个；排除目标自身。
 * @param {string} role
 * @param {string} [tab] 原目标页签（可为空）
 * @returns {{tab:string, label:string}|null} 本台无任何可落页签返回 null
 */
export function synonymWorkspaceTab(role, tab) {
  const ids = workspaceTabIds(role);
  for (const candidate of SYNONYM_PRIORITY) {
    if (candidate === tab) continue;
    if (ids.includes(candidate)) return { tab: candidate, label: WORKSPACE_TAB_LABELS[candidate] || candidate };
  }
  return null;
}

/** 页签显示名（提示卡 / 守卫报告用；只登记本文件出现的页签） */
export const WORKSPACE_TAB_LABELS = Object.freeze({
  today: '今天',
  todo: '待办',
  overview: '工作概况',
  calendar: '活动管理',
  'committee-meeting': '支委会',
  'group-progress': '党小组',
  notification: '通知发布',
  'report-up': '上报党委',
  'work-map': '支部分工',
  feedback: '意见反馈',
  roster: '成员名册',
  talent: '人才库',
  'thought-review': '思想汇报',
  taskforce: '专班管理',
  'member-flow': '成员流动',
  kanban: '项目看板',
  archive: '档案归档',
  attendance: '考勤管理',
  review: '复盘',
  inspection: '考察管理',
  write: '本组活动',
  members: '组员进展',
  activities: '活动动态',
  projects: '项目分工',
  growth: '我的成长',
});
