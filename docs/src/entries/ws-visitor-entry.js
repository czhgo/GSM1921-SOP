﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// ws-visitor-entry.js — 参与者工作台入口（薄壳版）
// T-279 M3 拆分：897 行单体 → 薄壳入口 + 6 个独立 tab 模块（entries/tabs/visitor/）。
// 入口职责：bootstrap + tab 清单读取（能力注册表，M2e 同款）+ URL 导航落点 + 状态变更驱动的当前 tab 重渲染。
// tab.render 为懒加载动态 import（点击时才加载对应模块），各 tab 私有状态随模块自持。

import { setState, registerRenderCallback } from '../core/state.js?v=20260829o';
import { CrossPageState } from '../core/cross-page-state.js?v=20260829o';
import { bootstrapPage } from '../core/bootstrap.js?v=20260829o';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260829o';
import { NoticeStore } from '../services/notice.js?v=20260829o';
import { SignupStore } from '../services/signup.js?v=20260829o';
import { AuthStore } from '../services/auth.js?v=20260829o';
import { PEOPLE } from '../mock/index.js?v=20260829o';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260829o';
import { loadActivities } from '../services/activity.js?v=20260829o';
import { renderTabBar } from '../components/tab-bar.js?v=20260829o';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260829o';
import { TodoStore, seedTodos, VisitorTodoDeriver } from '../services/todo.js?v=20260829o';
import { getCapabilities } from '../core/registry.js?v=20260829o';
// 副作用导入触发参与者工作台能力注册（tab 清单）
import '../modules/capabilities/visitor-workspace.js?v=20260812a';

// accentRole 走 resolveAccentRole：侧边栏「主题色」个性化对参与者工作台同样生效
const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'participant' });

// ── Tab 切换（renderTabBar 统一架构） ──
const VISITOR_TAB_STORAGE_KEY = 'workflowos_tab_visitor';
let _tabBar = null;
let _tabBarInited = false;
let _currentTab = 'todo';
let _visitorNavConsumed = false; // URL 跳转参数一次性消费标志
// 首页跳转定位目标（REVIEW_QUEUE J2 裁定 2026-08-08：visitor→项目分工 tab 定位高亮专班卡片；活动动态 tab 定位高亮活动）
// 快照变量：导航目标清除后仍供懒加载渲染读取，定位完成后经 onNavLocated 清除
let _visitorHighlightTfId = null; // 项目分工高亮目标（专班 id）
let _visitorHighlightActId = null; // 活动动态高亮目标（活动 id）
// B1-5 修复：URL 导航落点后抑制当前 tab 重渲染，防止二次 setState 重建 DOM 冲掉直达高亮。
// 条件抑制：仅当导航目标元素已在 DOM 中（高亮已展示）才抑制；目标缺失（延迟数据）放行补渲染。
// 高亮目标存活至抑制窗口结束，补渲染可重新应用高亮。
const NAV_SUPPRESS_MS = 3000;
let _navSuppressUntil = 0;
let _visitorNavTargetSel = null; // 导航目标元素选择器（用于条件抑制判断）

/** 渲染上下文（供各 tab 模块使用；高亮目标由导航路径 3s 定时器清除，B1-5） */
function _renderCtx(state) {
  return {
    accent, accentRgba, accentBorder,
    activities: state.activities || [],
    allTf: TaskForceRecordStore.getAll(),
    authRecords: AuthStore.getAuthorizations(),
    highlightId: _visitorHighlightActId,
    highlightTfId: _visitorHighlightTfId,
    onNavLocated: () => { /* 高亮目标存活至抑制窗口结束（B1-5） */ },
  };
}

/** 初始化参与者 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
function _ensureTabBar(state) {
  const container = document.getElementById('visitor-content');
  if (!container || _tabBarInited) return;

  const ctx = _renderCtx(state);

  // 有待办必见待办（书记 2026-08-10 裁定）：一次性消费（tab bar 仅构建一次，天然一次性）
  const priorityTab = TodoStore.getGroupedByAction('visitor').length > 0 ? 'todo' : undefined;

  // M2e 注册表衔接：tab 清单经能力注册表读取（visitor-workspace），入口不再硬编码
  const visitorCap = getCapabilities({ scope: 'workspace:visitor' }).find(c => c.id === 'visitor-workspace');
  const tabs = visitorCap && typeof visitorCap.tabs === 'function' ? visitorCap.tabs() : [];

  // 欢迎语替代身份标记（普通参与者无右上角 role-label，书记 2026-08-01 决策）
  const currentUser = AuthStore.getCurrentUser();
  const userName = currentUser?.personId ? (PEOPLE.find(p => p.id === currentUser.personId)?.name || '') : '';
  const welcomeLine = userName
    ? `
    <div class="mb-4 flex items-center gap-2.5">
      <span class="inline-block w-1 h-4 rounded-full flex-shrink-0" style="background:var(--party-red);"></span>
      <p class="text-sm text-gray-700"><span class="font-semibold text-gray-800">欢迎回来，${userName}</span><span class="text-xs text-gray-400 ml-1">· 支部动态与个人成长一览</span></p>
    </div>`
    : '';

  _tabBar = renderTabBar({
    prefix: 'visitor',
    tabs,
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: ctx,
    storageKey: VISITOR_TAB_STORAGE_KEY,
    defaultTab: 'todo',
    priorityTab,
    extraRightHtml: renderReportEntryHtml({ accent, accentRgba }),
    onTabChange: (tabId) => { _currentTab = tabId; },
  });

  container.innerHTML = `${welcomeLine}${_tabBar.html}`;
  _tabBar.bindEvents(container);
  bindReportEntry(container); // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  _tabBar.activate(_tabBar.activeTab, ctx);
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
    if (r && typeof r.catch === 'function') r.catch(e => console.error('[ws-visitor] tab 渲染失败', e));
  } catch (e) {
    console.error('[ws-visitor] tab 渲染异常', e);
  }
}

function renderVisitorUI(state) {
  let activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    activities = allActivities.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('visitor-content');
  if (!container) return;

  // visitor 待办派生：通知待阅读 + 活动/专班待参与（幂等去重，可随渲染重复调用）
  const currentUser = AuthStore.getCurrentUser();
  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();
  const signups = SignupStore.getAll();
  if (currentUser?.personId) {
    VisitorTodoDeriver.deriveAll({
      personId: currentUser.personId,
      person: PEOPLE.find(p => p.id === currentUser.personId) || null,
      notices,
      activities,
      signups,
    });
    VisitorTodoDeriver.deriveFromTaskforceSignups({ personId: currentUser.personId, taskforces, signups });
  }

  _ensureTabBar(state);

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 「查看更多活动」跳转（?view=activities）或指定活动（?activityId=）→ 落在活动动态 tab；
  // 指定专班（?taskforceId=）→ 落在项目分工 tab（REVIEW_QUEUE J2 裁定，定位高亮专班卡片）；
  // 一次性消费：消费后清除 URL 参数，避免后续 setState 重复触发切 tab / 高亮。
  if (!_visitorNavConsumed) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId || null;
    const highlightId = urlParams.activityId || null;
    if (tfId) {
      _visitorHighlightTfId = tfId;
      _visitorNavTargetSel = `.visitor-proj-card[data-tf-id="${tfId}"]`;
      CrossPageState.clearParam('taskforceId');
      _navSuppressUntil = Date.now() + NAV_SUPPRESS_MS; // B1-5：抑制后续 setState 重渲染冲掉直达高亮
      setTimeout(() => { _visitorHighlightTfId = null; _visitorNavTargetSel = null; }, NAV_SUPPRESS_MS);
      _tabBar.activate('projects', _renderCtx(state));
    } else if (highlightId || urlParams.view === 'activities') {
      _visitorHighlightActId = highlightId;
      _visitorNavTargetSel = highlightId ? `[data-visitor-act-id="${highlightId}"]` : null;
      _navSuppressUntil = Date.now() + NAV_SUPPRESS_MS; // B1-5：抑制后续 setState 重渲染冲掉直达高亮
      if (highlightId) setTimeout(() => { _visitorHighlightActId = null; _visitorNavTargetSel = null; }, NAV_SUPPRESS_MS);
      _tabBar.activate('activities', _renderCtx(state));
    } else {
      _tabBar.activate(_tabBar.activeTab, _renderCtx(state));
    }
    if (highlightId || urlParams.view === 'activities') {
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('view');
    }
    _visitorNavConsumed = true;
  } else {
    // B1-5 条件抑制：仅当导航目标已在 DOM（高亮已展示）时跳过重渲染；目标缺失放行补渲染
    if (Date.now() < _navSuppressUntil && (!_visitorNavTargetSel || document.querySelector(_visitorNavTargetSel))) return;
    // 非落点路径：用最新数据刷新当前 tab（对齐单体版每次 setState 重渲染当前 tab 的行为）
    _renderCurrentTab(state);
  }
}

registerRenderCallback(renderVisitorUI);

// 初始化待办种子数据 + 工作台数据加载
seedTodos();
loadWorkspaceData({ role: 'all', selectedRole: null, storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init(), () => SignupStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-visitor' });
