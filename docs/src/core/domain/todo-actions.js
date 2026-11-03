// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/domain/todo-actions.js — 待办「主行动」声明式动作表（2026-11-01 批次 524 · #7）
//
//  单一源：待办行按钮文案与跳转目标只在这里定义，各台 todo-tab 不再各写一张 tabMap。
//  纯 ESM 叶子模块（零依赖、无 DOM）：node 直导可测；浏览器侧经 workspace-nav.js 落地。
//
//  表项字段：
//    tab            目标页签 id（须为目标工作台已注册的 tab；空串=无页签可落，只保留 toast）
//    label          主行动按钮文案（todo-list 的 ACTION_LABELS 仅作兜底）
//    kind           深链目标类型（activity / group / review / notice / member / attendance / inspection / handoff）
//    segment        可选：目标页内的分段 id（如纪检「考勤管理」的补课段）
//    roleOverrides  可选：按角色覆盖 tab/kind（各台页签 id 不同，集中在此，不在多处写 if）
//    scopeOverrides 可选：按 actionData.scope 覆盖（支书 authorize 的活动/专班分流）
//
//  解析优先级：actionKey > actionType；角色覆盖 > scope 覆盖 > 表项默认。
// ════════════════════════════════════════════════════════════════

export const TODO_ACTIONS = {
  // ── 支书 · 提醒类（落活动管理） ──
  'archive-remind': { tab: 'calendar', label: '到活动管理处理', kind: 'activity' },
  'review-remind': { tab: 'calendar', label: '到活动管理处理', kind: 'activity' },
  'attendance-remind': { tab: 'calendar', label: '到活动管理处理', kind: 'activity' },
  'inspection-remind': {
    tab: 'calendar',
    label: '到活动管理处理',
    kind: 'activity',
    // 组织台的考察缺口不能落活动管理，主位在人才库页底「录入考察」（原判据未改，只换落点）
    roleOverrides: { 'org-commissioner': { tab: 'talent', kind: 'inspection' } },
  },
  'semester-detained-remind': { tab: 'calendar', label: '去处理', kind: 'activity' },

  // ── 支书 · 复核类（动作承载于详情内一键确认；此处仅登记覆盖） ──
  'attendance-confirm': {
    tab: 'attendance',
    label: '去考勤管理',
    kind: 'attendance',
    roleOverrides: { secretary: { tab: 'feedback', kind: 'review' } },
  },
  'inspection-confirm': {
    tab: 'inspection',
    label: '去考察管理',
    kind: 'inspection',
    roleOverrides: { secretary: { tab: 'feedback', kind: 'review' } },
  },
  'review-confirm': { tab: 'feedback', label: '去复核', kind: 'review' },
  'archive-confirm': { tab: 'calendar', label: '去复核', kind: 'activity' },

  // ── 支书 · 自定义组 / 旧键（无页签可落时只保留 toast，不制造空跳转） ──
  'member-confirm': { tab: 'group-progress', label: '去处理', kind: 'member' },
  'tf-committee-requests': { tab: 'group-progress', label: '去处理', kind: 'group' },
  'todo-void-confirm': { tab: '', label: '去处理', kind: 'custom' },
  'taskforce-approval': { tab: '', label: '去处理', kind: 'custom' },

  // ── 通用动作（actionType 兜底；各台按角色覆盖页签） ──
  authorize: {
    tab: 'group-progress',
    label: '去处理',
    kind: 'group',
    roleOverrides: {
      leader: { tab: 'write', kind: 'group' },
      'org-commissioner': { tab: 'taskforce', kind: 'group' },
    },
    // 支书：情景②③ 项目赋权整卡迁「活动管理」 ⇒ 活动/专班赋权落活动管理（不落党小组页）
    scopeOverrides: {
      activity: { tab: 'calendar', kind: 'activity' },
      taskforce: { tab: 'calendar', kind: 'group' },
    },
  },
  write: { tab: 'calendar', label: '去写入活动', kind: 'activity' },
  review: {
    tab: 'feedback',
    label: '去复核',
    kind: 'review',
    roleOverrides: {
      leader: { tab: 'members', kind: 'member' },
      'org-commissioner': { tab: 'talent', kind: 'inspection' },
      'disc-commissioner': { tab: 'review', kind: 'review' },
    },
  },
  notify: { tab: 'notification', label: '去发布', kind: 'notice' },
  read: {
    tab: 'activities',
    label: '去阅读',
    kind: 'activity',
    roleOverrides: { visitor: { tab: 'activities', kind: 'activity' } },
  },
  submit: {
    tab: 'calendar',
    label: '去提交',
    kind: 'activity',
    roleOverrides: {
      visitor: { tab: 'growth', kind: 'review' },
      'prop-commissioner': { tab: 'kanban', kind: 'activity' },
    },
  },
  participate: {
    tab: 'activities',
    label: '去参与',
    kind: 'activity',
    roleOverrides: { visitor: { tab: 'activities', kind: 'activity' } },
  },
  track: {
    tab: 'talent',
    label: '去追踪',
    kind: 'inspection',
    roleOverrides: { 'org-commissioner': { tab: 'talent', kind: 'inspection' } },
  },
  archive: {
    tab: 'archive',
    label: '去归档',
    kind: 'activity',
    roleOverrides: { 'prop-commissioner': { tab: 'archive', kind: 'activity' } },
  },
  'activity-archive': {
    tab: 'archive',
    label: '去归档',
    kind: 'activity',
    roleOverrides: { 'prop-commissioner': { tab: 'archive', kind: 'activity' } },
  },

  // ── 组织台 · 专项 ──
  'member-approve': { tab: 'roster', label: '去审批', kind: 'member' },
  'develop-node-remind': { tab: 'roster', label: '去办理', kind: 'member' },
  'half-year-inspection-remind': { tab: 'talent', label: '去核对', kind: 'inspection' },

  // ── 数据交接（按 handoff- 前缀判定；逐键登记供静态覆盖守卫） ──
  'handoff-attendance-archival': { tab: '', label: '确认接收', kind: 'handoff' },
  'handoff-inspection-report': { tab: '', label: '确认接收', kind: 'handoff' },
  'handoff-material-shortage': {
    tab: 'attendance',
    label: '去补课',
    kind: 'attendance',
    segment: 'makeup',
  },
};

/** 合并默认项与覆盖项，并剥离 roleOverrides/scopeOverrides（调用方拿到的永远是扁平结果） */
function _flatten(base, override) {
  const merged = override ? { ...base, ...override } : base;
  return {
    tab: merged.tab || '',
    label: merged.label || '去处理',
    kind: merged.kind || '',
    ...(merged.segment ? { segment: merged.segment } : {}),
  };
}

/**
 * 解析待办的主行动。
 * @param {{actionKey?:string, actionType?:string, role?:string, actionData?:{scope?:string}}} todo
 * @param {string} [role] 调用台角色（缺省读 todo.role）；用于 roleOverrides
 * @returns {{tab:string, label:string, kind:string, segment?:string}|null} 未命中返回 null（调用方保留兜底 toast）
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
