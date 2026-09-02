// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  state.js — 全局状态管理 (STATE 枚举 / appState / setState)
//  使用 registerRenderCallback 模式避免循环依赖
// ════════════════════════════════════════════════════════════════

import { _currentYearMonth } from './utils.js?v=20260901x';

export const STATE = {
  IDLE:       0,
  LOADING:    1,
  SUBMITTING: 2,
  SUCCESS:    3,
  ERROR:      4,
};

// ── 角色类型定义 ─────────────────────────────────────────────────
const ROLE_TYPES = {
  PARTICIPANT:       'participant',       // 普通参与者（默认首页）
  LEADER:            'leader',            // 党小组组长
  ORG_COMMISSIONER:  'org-commissioner',  // 组织委员
  PROP_COMMISSIONER: 'prop-commissioner', // 宣传委员
  DISC_COMMISSIONER: 'disc-commissioner', // 纪检委员
  ORGANIZER:         'organizer',         // 组织者（项目分工记录）
  DEEP:              'deep',              // 深度参与者
  SECRETARY:         'secretary',         // 党支书
  GLOBAL:            'global',            // 参考指南专用
};

// ── 项目/管理角色列表（用于首页日历展示角色配色与详情可点击）──────
const MANAGEMENT_ROLES = [
  ROLE_TYPES.LEADER,
  ROLE_TYPES.ORG_COMMISSIONER,
  ROLE_TYPES.PROP_COMMISSIONER,
  ROLE_TYPES.DISC_COMMISSIONER,
  ROLE_TYPES.ORGANIZER,
  ROLE_TYPES.DEEP,
  ROLE_TYPES.SECRETARY,
];

// ── 判断是否为管理角色 ───────────────────────────────────────────
function isManagementRole(role) {
  return MANAGEMENT_ROLES.includes(role);
}

// ── 判断是否为参与角色 ───────────────────────────────────────────
function isParticipantRole(role) {
  return role === ROLE_TYPES.PARTICIPANT;
}

// ── 根据角色获取视图类型 ─────────────────────────────────────────
function getViewTypeByRole(role) {
  if (!role) return 'participant';
  if (isParticipantRole(role)) return 'participant';
  if (role === ROLE_TYPES.GLOBAL) return 'global';
  if (isManagementRole(role)) return 'manager';
  return 'participant';
}

// ── 根据角色获取参考指南显示角色 ─────────────────────────────────
function getReferenceRoleBySelectedRole(selectedRole) {
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
  activeModule: 'dashboard',
  // 列表/详情双视图状态
  viewMode:            'list',
  selectedActivityId:  null,
  selectedDate:        null,
  displayMonth:        _currentYearMonth(),
  // ── 统一角色状态（核心）────────────────────────────────────────
  selectedRole:        null,             // 当前选择的角色（null表示未选择，默认普通参与者）
  viewType:            'participant',    // 'participant' | 'manager'（由selectedRole推导，控制日历详情可点击性）
  // 归档库独立视图标志
  viewArchived:        false,
  // 日历视图模式（P2-7）
  calendarView:        'month',           // 'month' | 'week' | 'day' | 'list'
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
let _rafId = null; // T-304 遗留修复：同帧渲染合并去抖
export function registerRenderCallback(fn) { _onStateChange = fn; }

/** rAF 合并渲染：同帧多次 setState（如 loadWorkspaceData 双 setState）只触发一次渲染回调 */
function _flushRender() {
  _rafId = null;
  try {
    _onStateChange(appState);
  } catch (e) {
    console.error('[state] 渲染回调异常', e);
  }
}

/** Immutable 状态更新，触发渲染（rAF 合并：同帧连续 setState 只渲染一次） */
export function setState(patch) {
  // ── 状态推导逻辑 ───────────────────────────────────────────────
  // 当 selectedRole 变化时，自动推导 viewType 和 role
  if ('selectedRole' in patch) {
    const newRole = patch.selectedRole;
    patch.viewType = getViewTypeByRole(newRole);
    patch.role = getReferenceRoleBySelectedRole(newRole);
  }

  appState = { ...appState, ...patch };
  // T-304 遗留修复：loadWorkspaceData「加载中 + 完成后」双 setState 同帧连发，
  // 同步渲染会让 entry 层 _renderCurrentTab 与 tab-bar activate 并发 import 同一懒加载模块，
  // 浏览器中止首个请求产生 net::ERR_ABORTED。rAF 合并为一次渲染，最终态一致、无感。
  if (_rafId == null) {
    _rafId = requestAnimationFrame(_flushRender);
  }
}
