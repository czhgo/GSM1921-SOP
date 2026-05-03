// role: [人机]
// ════════════════════════════════════════════════════════════════
//  state.js — 全局状态管理 (STATE 枚举 / appState / setState)
//  使用 registerRenderCallback 模式避免循环依赖
// ════════════════════════════════════════════════════════════════

import { _currentYearMonth } from './utils.js';

export const STATE = {
  IDLE:       0,
  LOADING:    1,
  SUBMITTING: 2,
  SUCCESS:    3,
  ERROR:      4,
};

// ── 角色类型定义 ─────────────────────────────────────────────────
export const ROLE_TYPES = {
  PARTICIPANT:       'participant',       // 参与视图 - 默认参与者
  LEADER:            'leader',            // 管理视图 - 党小组组长
  ORG_COMMISSIONER:  'org-commissioner',  // 管理视图 - 组织委员
  PROP_COMMISSIONER: 'prop-commissioner', // 管理视图 - 宣传委员
  DISC_COMMISSIONER: 'disc-commissioner', // 管理视图 - 纪检委员
  ORGANIZER:         'organizer',         // 管理视图 - 活动组织者
  DEEP:              'deep',              // 管理视图 - 深度参与者
  SECRETARY:         'secretary',         // 管理视图 - 党支书
  GLOBAL:            'global',            // 全局视图 - 参考指南专用
};

// ── 动态角色上下文 ───────────────────────────────────────────────
// 用于 AI 会话中的动态角色判定（见 copilot-instructions.md §写盘权限）
export const DYNAMIC_ROLE_CONTEXT = {
  SNAPSHOT_ACTIVE:   '[AI]',      // SNAPSHOT.md status="ACTIVE" 时为 AI 可读写
  SNAPSHOT_ARCHIVED: '[人机]',    // SNAPSHOT.md 归档后人类可查
  TIMESTAMPS_AUTO:   '[AI]',      // 周期性任务自动更新时
  TIMESTAMPS_MANUAL: '[人机]',    // 人工维护时
};

// ── 获取给定文件路径的动态角色 ───────────────────────────────────
const SNAPSHOT_DYNAMIC = {
  pattern: /SNAPSHOT.*\.md$/,
  activeRole:  '[AI]',
  archivedRole: '[人机]',
};

const TIMESTAMPS_DYNAMIC = {
  pattern: /TIMESTAMPS\.md$/,
  autoRole:    '[AI]',
  manualRole:  '[人机]',
};

export function resolveDynamicRole(filePath, context = 'runtime') {
  if (SNAPSHOT_DYNAMIC.pattern.test(filePath)) {
    return context === 'runtime' ? SNAPSHOT_DYNAMIC.activeRole : SNAPSHOT_DYNAMIC.archivedRole;
  }
  if (TIMESTAMPS_DYNAMIC.pattern.test(filePath)) {
    return context === 'auto_update' ? TIMESTAMPS_DYNAMIC.autoRole : TIMESTAMPS_DYNAMIC.manualRole;
  }
  return null;
}

// ── AI 可修改文件白名单 ───────────────────────────────────────────
// 配合 copilot-instructions.md §can-modify 白名单使用
// 规则：白名单内文件在 [AI] 上下文中可免 /ask；白名单外 [AI] 文件修改须 /ask
export const AI_CAN_MODIFY_WHITELIST = [
  '.ctx/TIMESTAMPS.md',
  '.ctx/CONTEXT.md',
  '.ctx/SNAPSHOT.md',
  '.ctx/logs/',
];

export function canAIModify(filePath) {
  if (AI_CAN_MODIFY_WHITELIST.some(entry => filePath.startsWith(entry))) {
    return { allowed: true, reason: 'whitelist' };
  }
  if (filePath.includes('/.github/agents/') || filePath.includes('/.github/skills/')) {
    return { allowed: false, reason: 'agent_skill_file', requiresAsk: true };
  }
  if (filePath === '.github/copilot-instructions.md' || filePath === '.github/SSOT_INDEX.md') {
    return { allowed: false, reason: 'charter_file', requiresAsk: true };
  }
  return { allowed: false, reason: 'unknown', requiresAsk: true };
}

// ── 管理角色列表（用于判断是否为管理视图）───────────────────────
export const MANAGEMENT_ROLES = [
  ROLE_TYPES.LEADER,
  ROLE_TYPES.ORG_COMMISSIONER,
  ROLE_TYPES.PROP_COMMISSIONER,
  ROLE_TYPES.DISC_COMMISSIONER,
  ROLE_TYPES.ORGANIZER,
  ROLE_TYPES.DEEP,
  ROLE_TYPES.SECRETARY,
];

// ── 判断是否为管理角色 ───────────────────────────────────────────
export function isManagementRole(role) {
  return MANAGEMENT_ROLES.includes(role);
}

// ── 判断是否为参与角色 ───────────────────────────────────────────
export function isParticipantRole(role) {
  return role === ROLE_TYPES.PARTICIPANT;
}

// ── 根据角色获取视图类型 ─────────────────────────────────────────
export function getViewTypeByRole(role) {
  if (!role) return 'participant';
  if (isParticipantRole(role)) return 'participant';
  if (role === ROLE_TYPES.GLOBAL) return 'global';
  if (isManagementRole(role)) return 'manager';
  return 'participant';
}

// ── 根据角色获取参考指南显示角色 ─────────────────────────────────
export function getReferenceRoleBySelectedRole(selectedRole) {
  if (!selectedRole || isParticipantRole(selectedRole)) {
    return 'all';
  }
  if (selectedRole === ROLE_TYPES.GLOBAL) {
    return 'all';
  }
  return selectedRole;
}

let appState = {
  // 服务层状态
  status:      STATE.IDLE,
  activities:  [],
  tasks:       [],
  error:       null,
  // UI 视图状态
  domain:      'activity',
  role:        'all',                    // 参考指南当前角色（由selectedRole推导）
  activeModule: 'calendar',
  // 列表/详情双视图状态
  viewMode:            'list',
  selectedActivityId:  null,
  selectedDate:        null,
  displayMonth:        _currentYearMonth(),
  // ── 统一角色状态（核心）────────────────────────────────────────
  selectedRole:        null,             // 当前选择的角色（null表示未选择，默认参与者视图）
  viewType:            'participant',    // 'participant' | 'manager'（由selectedRole推导）
  // 归档库独立视图标志
  viewArchived:        false,
};

/** 返回当前全局状态快照 */
export function getAppState() { return appState; }

/**
 * 注册渲染回调（由 main.js 在 renderUI 定义后调用）。
 * 使用此间接模式可打破循环依赖：state.js 需要调用 renderUI，
 * 而 main.js 需要从 state.js import setState ——若 state.js 直接
 * import main.js 则形成循环。通过延迟注册回调，依赖图保持为 DAG。
 */
let _onStateChange = () => {};
export function registerRenderCallback(fn) { _onStateChange = fn; }

/** Immutable 状态更新，触发渲染 */
export function setState(patch) {
  // ── 状态推导逻辑 ───────────────────────────────────────────────
  // 当 selectedRole 变化时，自动推导 viewType 和 role
  if ('selectedRole' in patch) {
    const newRole = patch.selectedRole;
    patch.viewType = getViewTypeByRole(newRole);
    patch.role = getReferenceRoleBySelectedRole(newRole);
  }
  
  appState = { ...appState, ...patch };
  _onStateChange(appState);
}
