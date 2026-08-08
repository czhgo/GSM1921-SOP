// role: [工程师]+[AI]
// ws-secretary-entry.js — 书记工作台入口（薄壳版）
// 2026-08-07 懒加载重构：6 个 tab 全部拆分为独立模块（entries/tabs/secretary/），
//   入口只保留：bootstrap + Tab 栏定义 + 状态变更驱动的当前 tab 重渲染。
//   首屏只动态加载默认 tab（待办）模块；其余 tab 在首次点击时才 import。
//   tab-bar.js 支持异步 render（render 返回 Promise 时自动 await/catch）。

import { getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260808e';
import { BranchService } from '../services/runtime.js?v=20260808e';
import { bootstrapPage } from '../core/bootstrap.js?v=20260808e';
import { renderTabBar } from '../components/tab-bar.js?v=20260808e';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260808e';
import { loadActivities } from '../services/activity.js?v=20260808e';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260808e';

// accentRole 走 resolveAccentRole：侧边栏「主题色」个性化对书记工作台同样生效
const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'secretary' });

// ── Tab 切换（renderTabBar 统一架构，分组：工作台/党建/反馈） ──
const SEC_TAB_STORAGE_KEY = 'workflowos_tab_secretary';
let _secTabBar = null;
let _secTabBarInited = false;
let _secCurrentTab = 'todo';

/** 初始化书记 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureSecTabBar() {
  const container = document.getElementById('secretary-content');
  if (!container || _secTabBarInited) return;

  _secTabBar = renderTabBar({
    prefix: 'secretary',
    tabs: [
      { id: 'todo', label: '待办', groupLabel: '工作台', render: () => import('./tabs/secretary/todo-tab.js?v=20260808e').then(m => m.renderContent()) },
      { id: 'overview', label: '全局概况', render: () => import('./tabs/secretary/overview-tab.js?v=20260808e').then(m => m.renderContent()) },
      { id: 'calendar', label: '活动管理', groupLabel: '党建', render: () => import('./tabs/secretary/calendar-tab.js?v=20260808e').then(m => m.renderContent(getAppState())) },
      { id: 'assign', label: '赋权管理', render: () => import('./tabs/secretary/assign-tab.js?v=20260808e').then(m => m.renderContent()) },
      { id: 'notification', label: '通知发布', groupLabel: '党建', render: () => import('./tabs/secretary/notification-tab.js?v=20260808e').then(m => m.renderContent()) },
      { id: 'feedback', label: '反馈管理', groupLabel: '反馈', render: () => import('./tabs/secretary/feedback-tab.js?v=20260808e').then(m => m.renderContent()) },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'todo',
    extraRightHtml: `<div class="flex items-center gap-2" id="sec-toolbar"></div>`,
    storageKey: SEC_TAB_STORAGE_KEY,
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
  _renderSecCurrentTab(state);
}

registerRenderCallback(renderSecretaryUI);

loadWorkspaceData({ role: 'secretary', storeInits: [() => TaskForceRecordStore.init(), () => SignupStore.init()], extraLoads: [() => BranchService.listTasks()], fallbackData: () => loadActivities(), logTag: 'ws-secretary' });
