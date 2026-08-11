﻿﻿﻿﻿// role: [工程师]+[AI]
// ws-secretary-entry.js — 书记工作台入口（薄壳版）
// 2026-08-07 懒加载重构：6 个 tab 全部拆分为独立模块（entries/tabs/secretary/），
//   入口只保留：bootstrap + Tab 栏定义 + 状态变更驱动的当前 tab 重渲染。
//   首屏只动态加载默认 tab（待办）模块；其余 tab 在首次点击时才 import。
//   tab-bar.js 支持异步 render（render 返回 Promise 时自动 await/catch）。

import { getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260812b';
import { BranchService } from '../services/runtime.js?v=20260812b';
import { bootstrapPage } from '../core/bootstrap.js?v=20260812b';
import { renderTabBar } from '../components/tab-bar.js?v=20260812b';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260812b';
import { SignupStore } from '../services/signup.js?v=20260812b';
import { loadActivities } from '../services/activity.js?v=20260812b';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260812b';
import { CrossPageState } from '../core/cross-page-state.js?v=20260812b';
import { _currentYearMonth } from '../core/utils.js?v=20260812b';
import { TodoStore } from '../services/todo.js?v=20260812b';

// accentRole 走 resolveAccentRole：侧边栏「主题色」个性化对书记工作台同样生效
const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'secretary' });

// ── Tab 切换（renderTabBar 统一架构，分组：工作台/党建/反馈） ──
const SEC_TAB_STORAGE_KEY = 'workflowos_tab_secretary';
let _secTabBar = null;
let _secTabBarInited = false;
let _secCurrentTab = 'todo';
let _secNavTarget = null; // { tfId, actId } URL 导航目标（跨重渲染保持，定位完成后清除）
let _secHighlightTfId = null; // 专班查看高亮目标（快照变量：导航目标清除后仍供懒加载渲染读取）

/** 初始化书记 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureSecTabBar() {
  const container = document.getElementById('secretary-content');
  if (!container || _secTabBarInited) return;

  // 有待办必见待办（书记 2026-08-10 裁定）：_ensureSecTabBar 仅执行一次，天然一次性消费
  const priorityTab = TodoStore.getGroupedByAction('secretary').length > 0 ? 'todo' : undefined;

  _secTabBar = renderTabBar({
    prefix: 'secretary',
    tabs: [
      { id: 'todo', label: '待办', groupLabel: '工作台', render: () => import('./tabs/secretary/todo-tab.js?v=20260812b').then(m => m.renderContent()) },
      { id: 'overview', label: '全局概况', groupLabel: '工作台', render: () => import('./tabs/secretary/overview-tab.js?v=20260812b').then(m => m.renderContent()) },
      { id: 'calendar', label: '活动管理', groupLabel: '党建', render: () => import('./tabs/secretary/calendar-tab.js?v=20260812b').then(m => m.renderContent(getAppState())) },
      { id: 'assign', label: '赋权管理', groupLabel: '党建', render: () => import('./tabs/secretary/assign-tab.js?v=20260812b').then(m => m.renderContent()) },
      { id: 'notification', label: '通知发布', groupLabel: '党建', render: () => import('./tabs/secretary/notification-tab.js?v=20260812b').then(m => m.renderContent()) },
      // 专班查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增）
      { id: 'tf-view', label: '专班查看', render: () => import('../components/taskforce-view.js?v=20260812b').then(m => { const el = document.getElementById('secretary-tab-content'); if (el) m.renderTaskforceView(el, { highlightId: _secHighlightTfId || null, onLocated: () => { _secHighlightTfId = null; } }); }), groupLabel: '党建' },
      { id: 'feedback', label: '反馈管理', groupLabel: '反馈', render: () => import('./tabs/secretary/feedback-tab.js?v=20260812b').then(m => m.renderContent()) },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'todo',
    extraRightHtml: `<div class="flex items-center gap-2" id="sec-toolbar"></div>`,
    storageKey: SEC_TAB_STORAGE_KEY,
    priorityTab,
    onTabChange: (tabId) => { _secCurrentTab = tabId; },
  });

  container.innerHTML = _secTabBar.html;
  _secTabBar.bindEvents(container);
  _secTabBarInited = true;
  _secCurrentTab = _secTabBar.currentTab;
}

/** 渲染当前激活 Tab 内容（state 变化时增量刷新；tab.render 为懒加载动态 import，返回 Promise） */
function _renderSecCurrentTab(state) {
  if (!_secTabBarInited) return;
  const tab = _secTabBar.tabs.find(t => t.id === _secCurrentTab);
  if (!tab || typeof tab.render !== 'function') return;
  try {
    const r = tab.render(state);
    if (r && typeof r.catch === 'function') r.catch(e => console.error('[ws-secretary] tab 渲染失败', e));
  } catch (e) {
    console.error('[ws-secretary] tab 渲染异常', e);
  }
}

function renderSecretaryUI(state) {
  const activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    const mapped = allActivities.map(a => ({
      ...a,
      visibility: a.visibility || 'branch',
      executor: a.organizer || 'u_exec',
      supervisor: null,
      createdBy: a.organizer || 'u_exec',
      createdAt: a.date || new Date().toISOString(),
    }));
    setState({ activities: mapped, viewType: 'manager', managementRole: 'secretary' });
    return;
  }
  _ensureSecTabBar();

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数，
  // 避免后续 setState 重复触发切 tab / 高亮。导航消费必须在 _renderSecCurrentTab 之前完成，
  // 否则懒加载 tab（todo 等动态 import）先开始加载、晚 resolve 时会覆盖 URL 直达的目标内容。
  if (!_secNavTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _secNavTarget = { tfId, actId };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_secNavTarget) {
    if (_secNavTarget.tfId) {
      // 专班查看（无专班职责≠无知情权）：快照高亮目标后立即清除导航目标，
      // 防止 setState 重渲染时重复 activate（懒加载 import 竞态 + 重复渲染）。
      _secHighlightTfId = _secNavTarget.tfId;
      _secNavTarget = null;
      _secTabBar.activate('tf-view');
    } else {
      // 活动：定位活动管理日历视图 + 直达该活动详情
      // 必须先清 _secNavTarget 再 setState——setState 同步触发重渲染，若目标未清
      // 会再次进入本分支无限递归（RangeError: Maximum call stack size exceeded）。
      const actId = _secNavTarget.actId;
      _secNavTarget = null;
      _secTabBar.activate('calendar');
      if (actId) {
        const act = (state.activities || []).find(a => a.id === actId);
        setState({
          selectedActivityId: actId,
          viewMode: 'detail',
          displayMonth: act?.date?.slice(0, 7) || _currentYearMonth(),
        });
      }
    }
    return; // 导航消费由 activate 完成渲染；后续 setState 重渲染走 _renderSecCurrentTab 正常路径
  }
  _renderSecCurrentTab(state);
}

registerRenderCallback(renderSecretaryUI);

loadWorkspaceData({ role: 'secretary', storeInits: [() => TaskForceRecordStore.init(), () => SignupStore.init()], extraLoads: [() => BranchService.listTasks()], fallbackData: () => loadActivities(), logTag: 'ws-secretary' });
