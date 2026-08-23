﻿﻿// role: [工程师]+[AI]
// ws-disc-commissioner-entry.js — 纪检委员工作台入口（薄壳版）
// T-279 M3 拆分：1339 行单体 → 薄壳入口 + 9 个独立 tab 模块（entries/tabs/disc/）。
// 入口职责：bootstrap + tab 清单读取（能力注册表）+ URL 导航落点 + 状态变更驱动的当前 tab 重渲染。
// tab.render 为懒加载动态 import（点击时才加载对应模块），各 tab 私有状态随模块自持。

import { setState, registerRenderCallback } from '../core/state.js?v=20260823b';
import { CrossPageState } from '../core/cross-page-state.js?v=20260823b';
import { bootstrapPage } from '../core/bootstrap.js?v=20260823b';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260823b';
import { renderTabBar } from '../components/tab-bar.js?v=20260823b';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260823b';
import { TodoStore, seedTodos } from '../services/todo.js?v=20260823b';
import { loadActivities } from '../services/activity.js?v=20260823b';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260823b';
import { getCapabilities } from '../core/registry.js?v=20260823b';
// 副作用导入触发纪检工作台能力注册（tab 清单）
import '../modules/capabilities/disc-workspace.js?v=20260823a';

// accentRole 走 resolveAccentRole：侧边栏「主题色」个性化对纪检工作台同样生效
const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'disc-commissioner' });

// ── Tab 切换（renderTabBar 统一架构） ──
const DISC_TAB_STORAGE_KEY = 'workflowos_tab_disc';
let _tabBar = null;
let _tabBarInited = false;
let _currentTab = 'todo';
let _discNavTarget = null; // { tfId, actId } URL 导航目标（跨重渲染保持，定位完成后清除）
let _highlightTfId = null; // 专班查看高亮目标（快照变量：导航目标清除后仍供懒加载渲染读取）

/** 渲染上下文（供各 tab 模块使用；onNavLocated 供专班查看定位完成后清除高亮目标） */
function _renderCtx(activities) {
  return {
    accent, accentRgba, accentBorder, activities,
    highlightTfId: _highlightTfId,
    onNavLocated: () => { _highlightTfId = null; },
  };
}

/** 初始化纪检 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureTabBar(filteredActivities) {
  const container = document.getElementById('disc-content');
  if (!container || _tabBarInited) return;

  // 有待办必见待办（书记 2026-08-10 裁定）：仅首次渲染生效
  const priorityTab = TodoStore.getGroupedByAction('disc-commissioner').length > 0 ? 'todo' : undefined;

  // 注册表衔接：tab 清单经能力注册表读取（disc-workspace），入口不再硬编码
  const discCap = getCapabilities({ scope: 'workspace:disc' }).find(c => c.id === 'disc-workspace');
  const tabs = discCap && typeof discCap.tabs === 'function' ? discCap.tabs() : [];

  _tabBar = renderTabBar({
    prefix: 'disc',
    tabs,
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: _renderCtx(filteredActivities),
    storageKey: DISC_TAB_STORAGE_KEY,
    defaultTab: 'todo',
    priorityTab,
    extraRightHtml: renderReportEntryHtml({ accent, accentRgba }),
    onTabChange: (tabId) => { _currentTab = tabId; },
  });

  container.innerHTML = _tabBar.html;
  _tabBar.bindEvents(container);
  bindReportEntry(container); // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  _tabBar.activate(_tabBar.activeTab);
  _tabBarInited = true;
  _currentTab = _tabBar.currentTab;
}

/** 渲染当前激活 Tab 内容（state 变化时增量刷新） */
function _renderCurrentTab(state) {
  if (!_tabBarInited) return;
  const tab = _tabBar.tabs.find(t => t.id === _currentTab);
  if (!tab || typeof tab.render !== 'function') return;
  try {
    const r = tab.render(_renderCtx(state.activities || []));
    if (r && typeof r.catch === 'function') r.catch(e => console.error('[ws-disc] tab 渲染失败', e));
  } catch (e) {
    console.error('[ws-disc] tab 渲染异常', e);
  }
}

function renderDiscUI(state) {
  let activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    activities = allActivities.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('disc-content');
  if (!container) return;

  _ensureTabBar(activities);

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
  if (!_discNavTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _discNavTarget = { tfId, actId };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_discNavTarget) {
    if (_discNavTarget.tfId) {
      // 专班查看（纪检无专班职责≠无知情权）：快照高亮目标后立即清除导航目标
      _highlightTfId = _discNavTarget.tfId;
      _discNavTarget = null;
      _currentTab = 'tf-view';
      _tabBar.activate('tf-view', _renderCtx(activities));
    } else {
      // 活动：落考勤管理（纪检活动相关承载，现状即权限；activityId 直达该活动考勤）
      const actId = _discNavTarget.actId || null;
      _discNavTarget = null; // 考勤落点由 attendance tab 经 ctx.attendanceFilterActId 消费完成
      _currentTab = 'attendance';
      const ctx = _renderCtx(activities);
      ctx.attendanceFilterActId = actId;
      _tabBar.activate('attendance', ctx);
    }
  } else {
    // 非落点路径：用最新数据刷新当前 tab（对齐单体版每次 setState 重渲染当前 tab 的行为）
    _renderCurrentTab(state);
  }
}

registerRenderCallback(renderDiscUI);

// 初始化待办种子数据 + 工作台数据加载
seedTodos();
loadWorkspaceData({ role: 'disc-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-disc' });
