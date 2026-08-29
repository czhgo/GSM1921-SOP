// role: [工程师]+[AI]
// ws-leader-entry.js — 组长工作台入口（薄壳版）
// T-279 M2 拆分：1850 行单体 → 薄壳入口（~150 行）+ 9 个独立 tab 模块（entries/tabs/leader/）。
// 入口职责：bootstrap + tab 清单读取（能力注册表 M2e）+ URL 导航落点 + 状态变更驱动的当前 tab 重渲染。
// tab.render 为懒加载动态 import（点击时才加载对应模块），各 tab 私有状态随模块自持。

import { setState, registerRenderCallback } from '../core/state.js?v=20260829a';
import { bootstrapPage } from '../core/bootstrap.js?v=20260829a';
import { renderTabBar } from '../components/tab-bar.js?v=20260829a';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260829a';
import { flashHighlight } from '../core/utils.js?v=20260829a';
import { CrossPageState } from '../core/cross-page-state.js?v=20260829a';
import { getCapabilities } from '../core/registry.js?v=20260829a';
import { loadActivities } from '../services/activity.js?v=20260829a';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260829a';
import { SignupStore } from '../services/signup.js?v=20260829a';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260829a';
import { TodoStore, seedTodos } from '../services/todo.js?v=20260829a';
import { filterByRole } from './tabs/leader/_shared.js?v=20260829a';
// 副作用导入触发组长工作台能力注册（tab 清单，M2e）
import '../modules/capabilities/leader-workspace.js?v=20260822e';

// accentRole 走 resolveAccentRole：侧边栏「主题色」个性化对组长工作台同样生效
const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'leader' });

// ── Tab 切换（renderTabBar 统一架构） ──
const LEADER_TAB_STORAGE_KEY = 'workflowos_tab_leader';
let _tabBar = null;
let _tabBarInited = false;
let _currentTab = 'todo';
let _todoPriorityConsumed = false; // "有待办必见待办"一次性消费标志（书记 2026-08-10 裁定）
let _navTarget = null; // { tfId, actId } URL 导航目标（跨重渲染保持，定位完成后清除）
let _highlightTfId = null; // 专班查看高亮目标（快照变量：导航目标清除后仍供懒加载渲染读取）
// B1-5 修复：URL 导航落点后抑制当前 tab 重渲染，防止二次 setState 重建 DOM 冲掉直达高亮。
// 条件抑制：仅当导航目标元素已在 DOM 中（高亮已展示）才抑制；目标缺失（延迟数据）放行补渲染。
const NAV_SUPPRESS_MS = 3000;
let _navSuppressUntil = 0;
let _navTargetSel = null; // 导航目标元素选择器（用于条件抑制判断）

/** 渲染上下文（供各 tab 模块使用；高亮目标由导航路径 3s 定时器清除，B1-5） */
function _renderCtx(filteredActivities) {
  return {
    accent, accentRgba, accentBorder, filteredActivities,
    navTarget: _navTarget,
    highlightTfId: _highlightTfId,
    onNavLocated: () => { /* 高亮目标存活至抑制窗口结束（B1-5） */ },
  };
}

/** 初始化组长 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureTabBar(filteredActivities) {
  const container = document.getElementById('leader-content');
  if (!container || _tabBarInited) return;

  // 有待办必见待办（书记 2026-08-10 裁定）：一次性消费
  const priorityTab = TodoStore.getGroupedByAction('leader').length > 0 ? 'todo' : undefined;

  // M2e 注册表衔接：tab 清单经能力注册表读取（leader-workspace），入口不再硬编码
  const leaderCap = getCapabilities({ scope: 'workspace:leader' }).find(c => c.id === 'leader-workspace');
  const tabs = leaderCap && typeof leaderCap.tabs === 'function' ? leaderCap.tabs() : [];

  _tabBar = renderTabBar({
    prefix: 'leader',
    tabs,
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: _renderCtx(filteredActivities),
    storageKey: LEADER_TAB_STORAGE_KEY,
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
  const filteredState = filterByRole(state, 'leader');
  const tab = _tabBar.tabs.find(t => t.id === _currentTab);
  if (!tab || typeof tab.render !== 'function') return;
  try {
    const r = tab.render(_renderCtx(filteredState.activities || []));
    if (r && typeof r.catch === 'function') r.catch(e => console.error('[ws-leader] tab 渲染失败', e));
  } catch (e) {
    console.error('[ws-leader] tab 渲染异常', e);
  }
}

function renderLeaderUI(state) {
  let activities = state.activities || [];
  const allActs = loadActivities();
  if (activities.length === 0 && allActs.length > 0) {
    activities = allActs.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('leader-content');
  if (!container) return;

  const filteredState = filterByRole(state, 'leader');

  _ensureTabBar(filteredState.activities || []);

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
  if (!_navTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _navTarget = { tfId, actId };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_navTarget) {
    _navSuppressUntil = Date.now() + NAV_SUPPRESS_MS; // B1-5：抑制后续 setState 重渲染冲掉直达高亮
    if (_navTarget.tfId) {
      // 专班查看（组长无专班职责≠无知情权）：快照高亮目标后立即清除导航目标
      _highlightTfId = _navTarget.tfId;
      _navTargetSel = `.tfv-card[data-tf-id="${_highlightTfId}"]`;
      // 高亮目标存活至抑制窗口结束（B1-5：延迟数据到达后的补渲染可重新应用高亮）
      setTimeout(() => { _highlightTfId = null; _navTargetSel = null; }, NAV_SUPPRESS_MS);
      _navTarget = null;
      _currentTab = 'tf-view';
      _tabBar.activate('tf-view', _renderCtx(activities));
    } else {
      // 活动：定位活动管理 + 直达该活动详情
      _tabBar.activate('write', _renderCtx(activities));
      if (_navTarget.actId) {
        const targetActId = _navTarget.actId;
        _navTargetSel = `.leader-act-item[data-act-id="${targetActId}"]`;
        // B1-5 轮询定位：活动数据可能延迟到达，轮询直至条目出现再展开详情+高亮
        let attempts = 0;
        const tryLocate = () => {
          const item = document.querySelector(_navTargetSel);
          if (item) {
            item.click(); // 展开详情
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            flashHighlight(item);
            _navTargetSel = null;
            _navTarget = null;
          } else if (attempts < 20 && Date.now() < _navSuppressUntil) {
            attempts++;
            setTimeout(tryLocate, 300);
          } else {
            _navTargetSel = null;
            _navTarget = null;
          }
        };
        setTimeout(tryLocate, 150);
      } else {
        _navTargetSel = null;
        _navTarget = null;
      }
    }
  } else {
    // B1-5 条件抑制：仅当导航目标已在 DOM（高亮已展示）时跳过重渲染；目标缺失放行补渲染
    if (Date.now() < _navSuppressUntil && (!_navTargetSel || document.querySelector(_navTargetSel))) return;
    // 非落点路径：用最新数据刷新当前 tab（对齐单体版每次 setState 重渲染当前 tab 的行为）
    _renderCurrentTab(state);
  }
}

registerRenderCallback(renderLeaderUI);

// 初始化待办种子数据 + 工作台数据加载
seedTodos();
loadWorkspaceData({ role: 'leader', storeInits: [() => SignupStore.init(), () => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-leader' });
