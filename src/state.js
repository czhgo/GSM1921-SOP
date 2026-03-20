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

let appState = {
  // 服务层状态
  status:      STATE.IDLE,
  activities:  [],
  tasks:       [],
  error:       null,
  // UI 视图状态
  domain:      'activity',
  role:        'all',
  activeModule: 'calendar',
  // 列表/详情双视图状态
  viewMode:            'list',
  selectedActivityId:  null,
  selectedDate:        null,
  displayMonth:        _currentYearMonth(),
  // RBAC 双轨视图状态
  viewType:            'participant',
  managementRole:      'participant',
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
  appState = { ...appState, ...patch };
  _onStateChange(appState);
}
