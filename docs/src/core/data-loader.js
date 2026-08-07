// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  data-loader.js — 数据加载统一入口
// ════════════════════════════════════════════════════════════════

import { BranchService } from '../services/runtime.js?v=20260807c';
import { getAppState, setState, STATE } from './state.js?v=20260807c';
import { notifyDataLoaded } from './data-adapter.js?v=20260807c';

/**
 * 将 mock ACTIVITIES 映射为带完整字段的 fallback 数据
 * 8 个 workspace entry 中完全相同的映射逻辑
 */
export function fallbackMapActivities(activities) {
  return activities.map(a => ({
    ...a,
    visibility: 'branch',
    executor: a.organizer || 'u_exec',
    supervisor: null,
    createdBy: a.organizer || 'u_exec',
    createdAt: a.date || new Date().toISOString(),
  }));
}

/**
 * Workspace 角色页的标准数据加载流程
 *
 * 封装 9 个 workspace entry 中重复的 IIFE 模式：
 *   1. BranchService.loadDB() + 可选 Store.init()
 *   2. setState(LOADING)
 *   3. BranchService.listActivities() + 可选额外并行加载
 *   4. setState(IDLE) 或 fallback
 *
 * @param {Object} opts
 * @param {string} opts.role            — 角色键名
 * @param {string} [opts.selectedRole]  — selectedRole 值（默认同 role，visitor 传 null）
 * @param {Function[]} [opts.storeInits] — Store 初始化函数数组，如 [() => TaskForceRecordStore.init()]
 * @param {Function} [opts.fallbackData] — fallback 数据源函数，如 () => ACTIVITIES；省略则失败时设 ERROR
 * @param {Function[]} [opts.extraLoads] — 额外并行加载函数数组，如 [() => BranchService.listTasks()]
 * @param {string} [opts.logTag]        — 日志标签，如 'ws-secretary'
 */
export async function loadWorkspaceData({
  role,
  selectedRole,
  storeInits = [],
  fallbackData,
  extraLoads = [],
  activeModule = 'workspace',
  logTag = 'workspace',
}) {
  // Step 1: loadDB + Store.init
  try {
    if (typeof BranchService.loadDB === 'function') BranchService.loadDB();
    storeInits.forEach(fn => fn());
  } catch (e) {
    console.warn(`[${logTag}] loadDB error`, e);
  }
  // 数据加载完成广播（2026-08-05）：loadDB 恢复持久化数据后派发，
  // 让 header 角标等"加载早期渲染的快照"据实刷新（角标竞态修复），
  // 所有页面共用 loadWorkspaceData，此单点覆盖全部入口。
  notifyDataLoaded();

  // Step 2: setState LOADING
  setState({
    domain: 'activity',
    role,
    activeModule,
    status: STATE.LOADING,
    selectedRole: selectedRole !== undefined ? selectedRole : role,
  });

  // Step 3: listActivities + extraLoads
  try {
    const loads = [BranchService.listActivities(), ...extraLoads.map(fn => fn())];
    const results = await Promise.all(loads);
    const activities = results[0];

    const stateUpdate = { status: STATE.IDLE, activities };
    // 额外加载的结果依次放入 state
    if (results.length > 1) {
      stateUpdate.tasks = results[1];
    }
    setState(stateUpdate);
  } catch (err) {
    console.warn(`[${logTag}] load failed`, err);
    if (fallbackData) {
      setState({ status: STATE.IDLE, activities: fallbackMapActivities(fallbackData()) });
    } else {
      setState({ status: STATE.ERROR, error: err });
    }
  }
}

/**
 * Party 角色页的标准数据加载流程
 *
 * Party 页面使用 PartyModule.loadAll() 同步加载，无需 fallback
 *
 * @param {Object} opts
 * @param {string} opts.role           — 角色键名
 * @param {Function} opts.partyModule  — PartyModule 引用
 * @param {Function} opts.renderFn     — 渲染函数
 */
export function loadPartyData({ role, partyModule, renderFn }) {
  partyModule.loadAll();
  setState({
    domain: 'party',
    role,
    activeModule: 'party',
    status: STATE.IDLE,
    selectedRole: role,
  });
  renderFn();
}
