// role: [工程师]+[AI]
// components/workspace-shell.js — 工作台入口公共壳（T-304 代码减负 2026-08-30）
// 背景：6 个工作台入口（ws-*-entry.js）骨架重复 ~60%（_ensureTabBar 注册表读取 + renderTabBar、
//       _renderCurrentTab 懒加载渲染、renderXxxUI 的数据兜底 + URL 导航落点 + B1-5 抑制），
//       书记 2026-08-30：「模块化只见代码增多少见代码减少」→ 共性抽壳。
// 设计：createWorkspaceShell(opts) 工厂，每个角色一个实例（导航/抑制/高亮状态随壳实例自持）。
// 角色差异经参数注入：accentRole/scope/capId/containerId/prefix/storageKey/
//       renderCtxExtras/extraRightHtml/bindExtras/onNavTarget/loadOptions/mapFallbackActivities。
// 行为零变化：原各入口的注册表读取、懒加载渲染、导航落点消费、B1-5 抑制逐字保留于壳内。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §六 M6（共性抽象净减）

import { STATE, getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260903c';
import { bootstrapPage } from '../core/bootstrap.js?v=20260907a';
import { renderTabBar, tabContentSkeletonHtml } from './tab-bar.js?v=20260907a';
import { flashHighlight } from '../core/utils.js?v=20260903c';
import { CrossPageState } from '../core/cross-page-state.js?v=20260903c';
import { getCapabilities } from '../core/registry.js?v=20260903c';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260907a';
import { TodoStore } from '../services/todo.js?v=20260906j';
import { AuthStore } from '../services/auth.js?v=20260903c';
import { applyTabPolicy, getBranchIdOfPerson, getBranchById } from '../services/branch.js?v=20260903c';

// B1-5 修复：URL 导航落点后抑制当前 tab 重渲染，防止二次 setState 重建 DOM 冲掉直达高亮。
// 条件抑制：仅当导航目标元素已在 DOM 中（高亮已展示）才抑制；目标缺失（延迟数据）放行补渲染。
const NAV_SUPPRESS_MS = 3000;

/**
 * 创建工作台入口壳实例
 * @param {Object} opts
 * @param {string} opts.accentRole      accent 角色键（resolveAccentRole 个性化）
 * @param {string} opts.scope           能力 scope（如 'workspace:org'）
 * @param {string} opts.capId           能力 id（如 'org-workspace'）
 * @param {string} opts.containerId     内容容器 id（如 'org-content'）
 * @param {string} opts.prefix          事件前缀（如 'org'）
 * @param {string} opts.storageKey      tab 存储键
 * @param {string} [opts.defaultTab]    默认 tab（缺省 'todo'）
 * @param {(state:Object, shell:Object)=>Object} [opts.renderCtxExtras] 渲染上下文扩展（角色特有数据）
 * @param {(state:Object, ctx:Object)=>string} [opts.topHtml] tab 栏上方区块（visitor 欢迎语）
 * @param {(state:Object)=>void} [opts.beforeRender] renderUI 内 _ensureTabBar 前的钩子（visitor 待办派生）
 * @param {(ctx:Object)=>string} [opts.extraRightHtml]  tab 栏右侧按钮区 HTML（汇报入口/发布按钮等）
 * @param {(container:Element, shell:Object)=>void} [opts.bindExtras] 额外绑定（bindReportEntry/招募按钮等）
 * @param {(nav:Object, state:Object, shell:Object)=>Object|void} opts.onNavTarget
 *        导航落点消费。nav={tfId, actId, view}。返回 { tabId, highlightSel, actDetail? }：
 *          tabId       要激活的 tab；highlightSel 高亮选择器（含 setState 详情直达时置空）
 *          返回 void 表示无落点（壳走条件抑制+重渲染路径）
 * @param {Object} opts.loadOptions     loadWorkspaceData 参数（role/storeInits/extraLoads/fallbackData/logTag）
 * @param {(a:Object)=>Object} [opts.mapFallbackActivities] 空表回退映射（缺省=leader 版通用映射）
 * @param {Object} [opts.fallbackExtras] 空表回退时随 activities 一并 setState 的附加状态（如书记 viewType/managementRole）
 */
export async function createWorkspaceShell(opts) {
  const {
    accentRole, scope, capId, containerId, prefix, storageKey,
    defaultTab = 'todo',
    renderCtxExtras,
    topHtml,
    beforeRender,
    extraRightHtml,
    bindExtras,
    onNavTarget,
    loadOptions,
    mapFallbackActivities = (a) => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }),
    fallbackExtras,
  } = opts;

  // ── U3a（2026-09-07）内容容器首帧占位：壳顶层 await（bootstrapPage/数据加载/首 tab import）
  // 期间 #xxx-content 不空载 0 高（原首帧 0 高 → 数据/模块到达时内容整块弹出弹跳）。
  // 注入骨架卡（固定 min-height）；_ensureTabBar 首建 innerHTML 时整体替换为 tab 栏 + 内容占位。
  // 视觉沿用首页骨架范式（dashboard/stats.js）；styles.css 不改、?v= 不动。
  const _shellRoot = document.getElementById(containerId);
  if (_shellRoot && !_shellRoot.dataset.wsShellPh) {
    _shellRoot.dataset.wsShellPh = '1';
    _shellRoot.innerHTML = tabContentSkeletonHtml();
  }

  // ── 壳实例状态（导航/抑制/高亮，等价于原入口模块级私有状态） ──
  let _tabBar = null;
  let _tabBarInited = false;
  let _currentTab = defaultTab;
  let _navTarget = null;         // { tfId, actId } URL 导航目标（跨重渲染保持，定位完成后清除）
  let _highlightId = null;       // 高亮目标 id（快照变量：导航目标清除后仍供懒加载渲染读取）
  let _highlightSel = null;      // 导航目标元素选择器（用于条件抑制判断）
  let _navSuppressUntil = 0;

  const { accent, accentRgba, accentBorder, user } = await bootstrapPage({ module: 'workspace', accentRole });

  // ── 立项⑦ B波：党委「进入支部（演示）」演示横幅（2026-09-06）──────────
  // party-staff 经 core/bootstrap.js 放行门进入支部层工作台（URL 携带 ?branch=）时，
  // 在内容区顶部给出「支部层 × 演示视图」标识与返回党委总览入口。
  // 仅 party-staff + branch 参数 + 支部层壳（scope ≠ party-committee）触发；其余角色/页面无横幅。
  const _demoBranchId = (user && user.role === 'party-staff' && scope !== 'workspace:party-committee')
    ? CrossPageState.getParam('branch')
    : null;
  const _demoBannerHtml = _demoBranchId
    ? (() => {
        const _b = getBranchById(_demoBranchId);
        const _branchName = _b?.config?.headerTitle || _b?.name || _demoBranchId;
        return `<div class="rounded-xl border border-dashed bg-red-50 text-red-700 px-4 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs" style="border-color:rgba(248,113,113,0.4);">
  <span><b>党委演示视图 · ${escHtml(_branchName)}</b> — 该支部书记工作台（branch 上下文）；以党委组织员会话演示，写操作按角色权限拒绝</span>
  <a href="./workspace/party-committee.html" class="font-semibold whitespace-nowrap" style="color:#C8102E;">← 返回党委治理总览</a>
</div>`;
      })()
    : '';

  /** 渲染上下文（供各 tab 模块使用；高亮目标由导航路径 3s 定时器清除，B1-5） */
  function _renderCtx(state) {
    const ctx = {
      accent, accentRgba, accentBorder,
      navTarget: _navTarget,
      highlightTfId: _highlightId,
      onNavLocated: () => { /* 高亮目标存活至抑制窗口结束（B1-5） */ },
    };
    return renderCtxExtras ? { ...ctx, ...renderCtxExtras(state, ctx) } : ctx;
  }

  /** 初始化 Tab 栏（仅首次构建，state 变化时仅刷新内容） */
  function _ensureTabBar(state) {
    const container = document.getElementById(containerId);
    if (!container || _tabBarInited) return;

    // 有待办必见待办（书记 2026-08-10 裁定）：tab bar 仅构建一次，天然一次性消费
    // R6-3「今天」置首（2026-09-06 书记裁：登录落点=今天、待办降第二页）后：
    // 显式 defaultTab='today' 的工作台不再被旧 priorityTab（任意未处理待办即跳待办）抢占——
    // 「今天」页已内建今天到期+逾期红标露头（待办必见新形态）；其余 defaultTab 语义不变。
    const priorityTab = defaultTab === 'today'
      ? undefined
      : (loadOptions.role && TodoStore.getGroupedByAction(loadOptions.role).length > 0 ? 'todo' : undefined);

    // M2e 注册表衔接：tab 清单经能力注册表读取（scope 能力），入口不再硬编码
    const cap = getCapabilities({ scope }).find(c => c.id === capId);
    const rawTabs = cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
    // L2 支部工作流模块配置（2026-09-03 书记裁定：书记操作/tab 级/核心固定）：
    // 本支部 config.modules 决定业务 tab 显隐与顺序；党委工作台（party-committee）不受支部配置影响
    let tabs = rawTabs;
    try {
      const me = typeof AuthStore?.getCurrentUser === 'function' ? AuthStore.getCurrentUser() : null;
      const personId = me && (me.personId || me.id);
      if (personId && scope !== 'workspace:party-committee' && me.role !== 'party-staff') {
        tabs = applyTabPolicy(rawTabs, getBranchIdOfPerson(personId));
      }
    } catch (e) {
      console.warn('[ws-shell] 支部工作流模块配置读取失败，按默认全开渲染', e);
    }

    _tabBar = renderTabBar({
      prefix,
      tabs,
      accentColor: { accent, accentRgba, accentBorder },
      renderCtx: _renderCtx(state),
      storageKey,
      defaultTab,
      priorityTab,
      extraRightHtml: extraRightHtml ? extraRightHtml({ accent, accentRgba, accentBorder }) : '',
      onTabChange: (tabId) => { _currentTab = tabId; },
    });

    container.innerHTML = _tabBar.html;
    _tabBar.bindEvents(container);
    bindExtras?.(container, { accent, accentRgba, accentBorder, renderCtx: _renderCtx, getState: getAppState });
    _tabBar.activate(_tabBar.activeTab);
    _tabBarInited = true;
    _currentTab = _tabBar.currentTab;
  }

  /** 渲染当前激活 Tab 内容（state 变化时增量刷新；tab.render 为懒加载动态 import，返回 Promise） */
  function _renderCurrentTab(state) {
    if (!_tabBarInited) return;
    const tab = _tabBar.tabs.find(t => t.id === _currentTab);
    if (!tab || typeof tab.render !== 'function') return;
    try {
      const r = tab.render(_renderCtx(state));
      if (r && typeof r.catch === 'function') r.catch(e => console.error(`[ws-${prefix}] tab 渲染失败`, e));
    } catch (e) {
      console.error(`[ws-${prefix}] tab 渲染异常`, e);
    }
  }

  function renderUI(state) {
    let activities = state.activities || [];
    // U3a（2026-09-07）：首载 LOADING 且尚无数据 → 跳过业务 tab 渲染（内容容器保持壳骨架占位），
    // 等数据完成（IDLE）后一次渲染——消除「LOADING 用空数据先渲一遍 → IDLE 数据到达再整块替换」
    // 的二次整块替换/内容闪跳。守卫在 fallback 种子映射之前：LOADING 期不预填数据触发额外渲染轮。
    // 参照正确范式 main-entry.js:55-59（isLoading 守卫；dashboard 因骨架渲染需求保留 LOADING 帧）。
    if (state.status === STATE.LOADING && activities.length === 0) return;
    const { fallbackData } = loadOptions;
    if (activities.length === 0 && fallbackData) {
      const all = typeof fallbackData === 'function' ? fallbackData() : [];
      if (all.length > 0) {
        setState({ activities: all.map(mapFallbackActivities), ...(fallbackExtras || {}) });
        return;
      }
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    beforeRender?.(state);
    _ensureTabBar(state);

    // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
    // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
    if (!_navTarget) {
      const urlParams = CrossPageState.getURLParams();
      const tfId = urlParams.taskforceId;
      const actId = urlParams.activityId;
      if (tfId || actId || urlParams.view === 'activities') {
        _navTarget = { tfId, actId, view: urlParams.view === 'activities' };
        CrossPageState.clearParam('activityId');
        CrossPageState.clearParam('taskforceId');
        CrossPageState.clearParam('view');
      }
    }
    if (_navTarget) {
      _navSuppressUntil = Date.now() + NAV_SUPPRESS_MS; // B1-5：抑制后续 setState 重渲染冲掉直达高亮
      const handled = onNavTarget(_navTarget, state, {
        activate: (tabId, ctx) => { _currentTab = tabId; _tabBar.activate(tabId, ctx || _renderCtx(state)); },
        setHighlight: (id, sel) => { _highlightId = id; _highlightSel = sel; if (id) setTimeout(() => { _highlightId = null; _highlightSel = null; }, NAV_SUPPRESS_MS); },
        renderCtx: (s) => _renderCtx(s || state),
        getState: getAppState,
      });
      if (handled !== false) {
        if (handled?.tabId) { _currentTab = handled.tabId; }
        if (handled?.highlightSel) { _highlightId = handled.highlightId ?? _highlightId; _highlightSel = handled.highlightSel; if (handled.highlightId) setTimeout(() => { _highlightId = null; _highlightSel = null; }, NAV_SUPPRESS_MS); }
        _navTarget = null;
      }
      return;
    }
    // B1-5 条件抑制：仅当导航目标已在 DOM（高亮已展示）时跳过重渲染；目标缺失放行补渲染
    if (Date.now() < _navSuppressUntil && (!_highlightSel || document.querySelector(_highlightSel))) return;
    // 非落点路径：用最新数据刷新当前 tab（对齐单体版每次 setState 重渲染当前 tab 的行为）
    _renderCurrentTab(state);
  }

  registerRenderCallback(renderUI);

  // 初始化待办种子数据 + 工作台数据加载
  if (loadOptions.seedTodos) loadOptions.seedTodos();
  loadWorkspaceData(loadOptions);

  return { renderUI };
}
