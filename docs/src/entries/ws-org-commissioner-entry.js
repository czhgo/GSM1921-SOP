﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// ws-org-commissioner-entry.js — 组织委员工作台入口（薄壳版）
// T-279 M3 拆分：1806 行单体 → 薄壳入口（~150 行）+ 8 个独立 tab 模块（entries/tabs/org/）。
// 入口职责：bootstrap + tab 清单读取（能力注册表，M2e 同款）+ URL 导航落点 + 状态变更驱动的当前 tab 重渲染。
// tab.render 为懒加载动态 import（点击时才加载对应模块），各 tab 私有状态随模块自持。

import { getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260827c';
import { bootstrapPage } from '../core/bootstrap.js?v=20260827c';
import { renderTabBar } from '../components/tab-bar.js?v=20260827c';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260827c';
import { flashHighlight } from '../core/utils.js?v=20260827c';
import { CrossPageState } from '../core/cross-page-state.js?v=20260827c';
import { getCapabilities } from '../core/registry.js?v=20260827c';
import { loadActivities } from '../services/activity.js?v=20260827c';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260827c';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260827c';
import { TodoStore, seedTodos } from '../services/todo.js?v=20260827c';
import { SignupStore } from '../services/signup.js?v=20260827c';
import { solidAccentStyle } from '../core/constants.js?v=20260827c';
import { openRecruitForm } from './tabs/org/taskforce-tab.js?v=20260827c';
// 副作用导入触发组织委员工作台能力注册（tab 清单）
import '../modules/capabilities/org-workspace.js?v=20260812d';

// accentRole 走 resolveAccentRole：侧边栏「主题色」个性化对组织委员工作台同样生效
const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'org-commissioner' });

// ── Tab 切换（renderTabBar 统一架构） ──
const ORG_TAB_STORAGE_KEY = 'workflowos_tab_org';
let _tabBar = null;
let _tabBarInited = false;
let _currentTab = 'todo';
let _orgNavTarget = null; // { tfId, actId, view } URL 导航目标（跨重渲染保持，定位完成后清除）
let _orgHighlightActId = null; // 活动查看高亮目标（快照变量：导航目标清除后仍供懒加载渲染读取）
// B1-5 修复：URL 导航落点后抑制当前 tab 重渲染，防止二次 setState 重建 DOM 冲掉直达高亮。
// 条件抑制：仅当导航目标元素已在 DOM 中（高亮已展示）才抑制；目标缺失（延迟数据）放行补渲染。
const NAV_SUPPRESS_MS = 3000;
let _navSuppressUntil = 0;
let _orgNavTargetSel = null; // 导航目标元素选择器（用于条件抑制判断）

/** 渲染上下文（供各 tab 模块使用；高亮目标由导航路径 3s 定时器清除，B1-5） */
function _renderCtx(state) {
  const activities = state.activities || [];
  const taskforces = TaskForceRecordStore.getAll();
  // T223 排序统一：专班各状态栏内按 createdAt 降序（新者在前）
  const sortTfByNew = (arr) => [...arr].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return {
    accent, accentRgba, accentBorder,
    activities,
    pending: sortTfByNew(taskforces.filter(t => t.status === 'draft' || t.status === 'pending_review')),
    recruiting: sortTfByNew(taskforces.filter(t => t.status === 'recruiting')),
    active: sortTfByNew(taskforces.filter(t => t.status === 'active')),
    highlightActId: _orgHighlightActId,
    onNavLocated: () => { /* 高亮目标存活至抑制窗口结束（B1-5） */ },
  };
}

/** 初始化组织委员 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureTabBar(state) {
  const container = document.getElementById('org-content');
  if (!container || _tabBarInited) return;

  // 有待办必见待办（书记 2026-08-10 裁定）：一次性消费（tab bar 仅构建一次，天然一次性）
  const priorityTab = TodoStore.getGroupedByAction('org-commissioner').length > 0 ? 'todo' : undefined;

  // M2e 注册表衔接：tab 清单经能力注册表读取（org-workspace），入口不再硬编码
  const orgCap = getCapabilities({ scope: 'workspace:org' }).find(c => c.id === 'org-workspace');
  const tabs = orgCap && typeof orgCap.tabs === 'function' ? orgCap.tabs() : [];

  _tabBar = renderTabBar({
    prefix: 'org',
    tabs,
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: _renderCtx(state),
    storageKey: ORG_TAB_STORAGE_KEY,
    defaultTab: 'todo',
    priorityTab,
    extraRightHtml: '<button id="btn-publish-tf" style="' + solidAccentStyle(accent, accentBorder) + ';border:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;cursor:pointer;transition:opacity 0.15s;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">发布招募</button>' + renderReportEntryHtml({ accent, accentRgba }),
    onTabChange: (tabId) => { _currentTab = tabId; },
  });

  container.innerHTML = _tabBar.html;
  _tabBar.bindEvents(container);
  bindReportEntry(container); // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  container.querySelector('#btn-publish-tf')?.addEventListener('click', () => openRecruitForm(_renderCtx(getAppState())));
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
    const r = tab.render(_renderCtx(state));
    if (r && typeof r.catch === 'function') r.catch(e => console.error('[ws-org] tab 渲染失败', e));
  } catch (e) {
    console.error('[ws-org] tab 渲染异常', e);
  }
}

function renderOrgUI(state) {
  let activities = state.activities || [];
  const allActs = loadActivities();
  if (activities.length === 0 && allActs.length > 0) {
    activities = allActs.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('org-content');
  if (!container) return;

  _ensureTabBar(state);

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
  if (!_orgNavTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _orgNavTarget = { tfId, actId, view: urlParams.view === 'activities' };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_orgNavTarget) {
    _navSuppressUntil = Date.now() + NAV_SUPPRESS_MS; // B1-5：抑制后续 setState 重渲染冲掉直达高亮
    if (_orgNavTarget.actId || _orgNavTarget.view) {
      // 活动查看（组织无活动 tab，知情权组件承载）
      // 快照高亮目标后立即清除导航目标（防 setState 重渲染重复消费）；高亮改读 _orgHighlightActId。
      _orgHighlightActId = _orgNavTarget.actId;
      _orgNavTargetSel = _orgHighlightActId ? `[data-act-id="${_orgHighlightActId}"], [data-activity-id="${_orgHighlightActId}"]` : null;
      // 高亮目标存活至抑制窗口结束（B1-5：延迟数据到达后的补渲染可重新应用高亮）
      if (_orgHighlightActId) setTimeout(() => { _orgHighlightActId = null; _orgNavTargetSel = null; }, NAV_SUPPRESS_MS);
      _orgNavTarget = null;
      _tabBar.activate('activity-view', _renderCtx(state));
      if (_orgHighlightActId) {
        // 2026-08-08 修复：activity-view 组件默认渲染当前月，URL 活动在旧月时日历无该条目 → 高亮无目标。
        // 消费 URL 活动时同步切到活动所在月份并打开详情。
        const act = (state.activities || []).find(a => a.id === _orgHighlightActId);
        setState({ displayMonth: act?.date?.slice(0, 7) || undefined, selectedActivityId: _orgHighlightActId });
      }
    } else if (_orgNavTarget.tfId) {
      const tfId = _orgNavTarget.tfId;
      _orgNavTargetSel = `.tf-store-card[data-tf-id="${tfId}"]`;
      _tabBar.activate('taskforce', _renderCtx(state));
      // B1-5 轮询定位：专班数据可能延迟到达，轮询直至卡片出现再展开详情+高亮
      let attempts = 0;
      const tryLocate = () => {
        const card = container.querySelector(_orgNavTargetSel);
        if (card) {
          card.click(); // 展开详情
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(card);
          _orgNavTargetSel = null;
          _orgNavTarget = null;
        } else if (attempts < 20 && Date.now() < _navSuppressUntil) {
          attempts++;
          setTimeout(tryLocate, 300);
        } else {
          _orgNavTargetSel = null;
          _orgNavTarget = null;
        }
      };
      setTimeout(tryLocate, 150);
    }
  } else {
    // B1-5 条件抑制：仅当导航目标已在 DOM（高亮已展示）时跳过重渲染；目标缺失放行补渲染
    if (Date.now() < _navSuppressUntil && (!_orgNavTargetSel || document.querySelector(_orgNavTargetSel))) return;
    // 非落点路径：用最新数据刷新当前 tab（对齐单体版每次 setState 重渲染当前 tab 的行为）
    _renderCurrentTab(state);
  }
}

registerRenderCallback(renderOrgUI);

// 初始化待办种子数据 + 工作台数据加载
seedTodos();
loadWorkspaceData({ role: 'org-commissioner', storeInits: [() => TaskForceRecordStore.init(), () => SignupStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-org' });
