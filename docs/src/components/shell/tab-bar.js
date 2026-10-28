// role: [工程师]+[AI]

// ════════════════════════════════════════════════════════════════

//  tab-bar.js — 通用 Tab 切换组件

// ════════════════════════════════════════════════════════════════



import { icon } from '../../core/base/icons.js?v=20261028a';
import { showToast } from '../../core/base/utils.js?v=20261028a';

// R6 导航守卫（2026-09-03 P2a）：初始/目标 tab 决策收敛到纯函数 tab-nav.js（防「被支部隐藏后静默白屏」）

import { resolveInitialTab, resolveTargetTab } from '../../core/boot/tab-nav.js?v=20261028a';



// 角色识别层：tab 激活态 = 主题色三件套渲染（支书 2026-08-08 三审定稿）。

// 背景：前三轮把 tab 强行为品牌金（半透明 0.14/0.30 → 实色 #FFD700），支书全部否决——

// 金是品牌合规色，含义多、受对比度牵制反复变色。回归「每个人各自的主题色」：

// 各工作台 bootstrapPage 传入 accentColor（resolveAccentRole 支持侧边栏主题色个性化），

// 统一渲染 = 浅底 rgba(X,0.1) + 边框 rgba(X,0.3) + X 文字。

// ════════════════════════════════════════════════════════════════

// U3a（2026-09-07）壳层内容区加载占位 ——「卡片先占位不弹跳」

// 2026-10-27 Task 10（加载与过渡）改口径：

//   1) 空容器（首帧 / 壳期）→ 立即铺 3 条卡形骨架 + 「正在加载…」，固定 min-height 防 0 高弹跳；

//   2) 已有旧内容（切页签）→ **旧内容先原样保留**，超过 120ms 仍未完成才淡出 120ms 并换骨架；

//      快速渲染（<120ms）不闪骨架，新内容直接淡入；

//   3) 新内容淡入 180ms + 8px 位移；**不整块压暗、不往内容里插「加载中」文本行**；

//   4) 动效编排预算 ≤1s（数据等待本身仍由 8s 超时错误卡兜底）；

//   5) prefers-reduced-motion：只淡入 80ms、无位移，骨架与文案保留。

// 样式在 `./tab-loading.css`（组件单独文件，styles.css 不改；由本模块动态注入 <link>）。



/** 骨架出现延迟：切页签时旧内容先原样保留，超过该时长仍未完成才铺骨架（防闪烁） */

export const TAB_LOADING_SKELETON_DELAY_MS = 120;

/** 旧内容淡出时长（与 --motion-fast 同档） */

export const TAB_CONTENT_FADE_OUT_MS = 120;

/** 新内容淡入时长（150–200ms 区间） */

export const TAB_CONTENT_FADE_IN_MS = 180;

/** 新内容淡入时的位移（自下而上 8px） */

export const TAB_CONTENT_SHIFT_PX = 8;

/** 减少动效时只淡入的时长（无位移） */

export const TAB_CONTENT_FADE_IN_REDUCED_MS = 80;

/** 加载动效编排预算上限：骨架脉冲在 1s 后收敛（数据等待仍由 8s 超时兜底） */

export const TAB_LOADING_SKELETON_MAX_MS = 1000;



/** 内容区加载骨架 HTML（首帧 / import 完成前注入；3 条卡形 + 「正在加载…」，固定 min-height 防弹跳） */

export function tabContentSkeletonHtml(text = '正在加载…') {

  return `

    <div data-ws-tab-loading-bar class="ws-tab-skeleton" role="status" aria-live="polite" aria-busy="true" style="min-height:320px">

      <div class="ws-tab-skeleton-head">

        <span class="ws-tab-skeleton-spinner" aria-hidden="true"></span>

        <span class="ws-tab-skeleton-text">${text}</span>

      </div>

      <div class="ws-tab-skeleton-row ws-tab-skeleton-row--tall" aria-hidden="true"></div>

      <div class="ws-tab-skeleton-row" aria-hidden="true"></div>

      <div class="ws-tab-skeleton-row" aria-hidden="true"></div>

    </div>`;

}

/** R3-U03：页签加载 / 刷新失败统一错误卡（**单一源**：tab-bar 切页签失败 与 workspace-shell
 *  数据刷新失败 渲染同一张卡；重试按钮标记 `data-ws-tab-retry`，绑定由各自调用方负责）。 */
export function tabErrorCardHtml(message = '这个页签暂时没加载出来') {
  return `
      <div class="card rounded-xl p-6 text-center" data-ws-tab-error role="alert">
        <p class="text-sm text-gray-600">${message}</p>
        <button type="button" class="btn-outline text-xs px-3 py-1.5 mt-3" data-ws-tab-retry>重试</button>
      </div>`;
}

/**
 * 页内失败态（2026-10-25 Task 1.3）：容器 / 节点缺失、页内动态 import 失败统一走这一处——
 * 错误卡 + 重试，替代「静默 return」。宿主不可用时返回 false（调用方再退 toast）。
 * @param {Element|null} host 承载错误卡的容器
 * @param {{ onRetry?: Function, message?: string }} [opts]
 * @returns {boolean} 是否已渲染
 */
export function mountTabFailure(host, { onRetry, message = '加载失败，重试' } = {}) {
  if (!host) return false;
  host.innerHTML = tabErrorCardHtml(message);
  host.querySelector('[data-ws-tab-retry]')?.addEventListener('click', () => {
    try { onRetry?.(); } catch (e) { console.error('[tab-bar] 重试失败', e); }
  });
  return true;
}

/** 2026-10-25 Task 1.4：loading 占位上限（≤8s）。promise 永不落定时解除 pointer-events:none / 灰化，
 *  停止 animate-pulse / animate-spin，并给出可见「加载超时」与重试入口——不得永久灰化。 */
export const TAB_LOADING_TIMEOUT_MS = 8000;

const FALLBACK_ACCENT = {

  accent: '#B91C1C',                  // 党建红（默认兜底，与支书主题色同源）

  accentRgba: 'rgba(185, 28, 28, 0.1)',

  accentBorder: 'rgba(185, 28, 28, 0.3)',

};



// ════════════════════════════════════════════════════════════════
//  组件样式 / 跨文档跳转过渡（2026-10-27 Task 10）
//   · 样式单独落 `./tab-loading.css`（styles.css 禁改），模块加载时注入 <link>；
//   · 页面跳转：顶部 2px 品牌色进度条 + 内容淡出 120ms；落地首屏 skeleton 由 workspace-shell
//     复用 `tabContentSkeletonHtml()` 铺出，新内容统一走 180ms 淡入（见 `_playContentEnter`）。
// ════════════════════════════════════════════════════════════════

/** 离开当前文档前的淡出时长（与 TAB_CONTENT_FADE_OUT_MS 同档） */
export const ROUTE_LEAVE_MS = 120;

const TAB_LOADING_CSS_URL = new URL('./tab-loading.css?v=20261028a', import.meta.url).href;

const ROUTE_PROGRESS_ID = 'ws-route-progress';

let _loadingStylesInjected = false;

/** 注入组件样式（幂等；非浏览器环境静默跳过） */
function _ensureTabLoadingStyles() {
  if (_loadingStylesInjected || typeof document === 'undefined') return;
  _loadingStylesInjected = true;
  try {
    if (document.getElementById('ws-tab-loading-css')) return;
    const link = document.createElement('link');
    link.id = 'ws-tab-loading-css';
    link.rel = 'stylesheet';
    link.href = TAB_LOADING_CSS_URL;
    (document.head || document.documentElement).appendChild(link);
  } catch (_) { /* 样式加载失败不阻断页签切换 */ }
}

/** 是否声明了「减少动效」偏好（无 window 的 node 环境一律 false） */
function _prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

/** 顶部进度条节点（懒创建；非浏览器环境返回 null） */
function _routeProgressEl() {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(ROUTE_PROGRESS_ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = ROUTE_PROGRESS_ID;
  el.className = 'ws-route-progress';
  el.setAttribute('role', 'presentation');
  el.setAttribute('aria-hidden', 'true');
  (document.body || document.documentElement).appendChild(el);
  return el;
}

/** 离开前显示顶部 2px 进度条（品牌色；reduced-motion 下静默为静态条） */
function _showRouteProgress() {
  const el = _routeProgressEl();
  if (!el) return;
  delete el.dataset.done;
  el.dataset.active = '1';
  if (typeof el.getBoundingClientRect === 'function') void el.getBoundingClientRect();
}

/** 页面主内容容器（淡出用；取第一个可用的壳/主区） */
function _pageStageEl() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('main')
    || document.getElementById('app')
    || document.querySelector('.app-main')
    || document.querySelector('.ws-shell-root')
    || document.body
    || null;
}

/** 离开前淡出当前内容 120ms（不白屏硬跳；reduced-motion 时直接跳转） */
function _fadeOutPage() {
  const stage = _pageStageEl();
  if (!stage || !stage.classList) return;
  stage.dataset.wsRouteLeaving = '1';
  stage.classList.add('ws-tab-stage', 'is-leaving');
}

/** 重置跳转视觉（pageshow / bfcache 回退） */
function _resetRouteVisuals() {
  if (typeof document === 'undefined') return;
  const bar = document.getElementById(ROUTE_PROGRESS_ID);
  if (bar) { delete bar.dataset.active; delete bar.dataset.done; }
  document.querySelectorAll('[data-ws-route-leaving]').forEach((n) => {
    n.classList.remove('is-leaving');
    delete n.dataset.wsRouteLeaving;
  });
}

/** 同源文档跳转拦截：显示进度条 + 淡出后落地（仅左键、无修饰键、非新窗口 / 下载 / 纯锚点） */
function _onRouteClick(event) {
  if (!event || event.defaultPrevented) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  const anchor = target && typeof target.closest === 'function' ? target.closest('a[href]') : null;
  if (!anchor) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;
  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#')) return;
  let url;
  try { url = new URL(anchor.href, window.location.href); } catch (_) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== window.location.origin) return;
  const here = new URL(window.location.href);
  if (url.hash && url.pathname === here.pathname && url.search === here.search) return; // 仅锚点
  if (url.href === here.href) return;
  event.preventDefault();
  _showRouteProgress();
  _fadeOutPage();
  window.setTimeout(() => { window.location.assign(url.href); }, _prefersReducedMotion() ? 0 : ROUTE_LEAVE_MS);
}

let _routeHooked = false;

/** 安装页面跳转进度条（幂等；tab-bar 模块加载时自动调用） */
export function installNavigationProgress() {
  if (_routeHooked || typeof document === 'undefined' || typeof window === 'undefined') return;
  _routeHooked = true;
  _ensureTabLoadingStyles();
  try {
    document.addEventListener('click', _onRouteClick);
    // JS 主动跳转（location.href=）无法拦截点击：至少离开前亮出进度条
    window.addEventListener('pagehide', _showRouteProgress);
    window.addEventListener('pageshow', _resetRouteVisuals);
  } catch (_) { /* 宿主不支持事件绑定时静默降级 */ }
}

/**
 * 渲染 Tab 栏并绑定切换事件

 *

 * 统一 9 个 entry 中重复的 Tab 切换逻辑：

 *   - 生成 Tab 按钮组 HTML

 *   - 绑定点击切换事件（样式切换 + 内容渲染）

 *   - 自动激活默认 Tab

 *

 * @param {Object} opts

 * @param {string} opts.prefix           — 命名前缀，用于生成 CSS 类名 / data 属性 / 容器 ID

 *                                         如 'leader' → .leader-tab-btn / data-leader-tab / #leader-tab-content

 * @param {Array<{id: string, label: string, render: Function}>} opts.tabs — Tab 定义

 * @param {{ accent: string, accentRgba: string, accentBorder: string }} opts.accentColor — 强调色三件套

 * @param {string} [opts.defaultTab]     — 默认激活的 Tab ID（默认取 tabs[0].id）

 * @param {string} [opts.extraRightHtml] — Tab 栏右侧额外 HTML（如"发布招募"按钮）

 * @param {Object} [opts.renderCtx]      — 传递给 render 函数的上下文对象

 * @param {Function} [opts.onTabChange]  — Tab 切换回调 (tabId: string, tab: Object) => void

 * @param {string} [opts.priorityTab]    — 优先激活的 Tab ID（覆盖 localStorage 记忆）。

 *                                        语义 = "有待办必见待办"（支书 2026-08-10 裁定）：

 *                                        调用方仅在首次渲染时传入（一次性消费），

 *                                        避免 setState 重渲染反复覆盖用户正在看的 Tab。

 *

 * @returns {{ html: string, activate: (tabId: string, ctx?: Object) => void }}

 *   - html: Tab 栏 + 内容容器的 HTML 字符串

 *   - activate: 手动激活指定 Tab 的方法

 *   - currentTab: 当前激活的 Tab ID（getter）

 *   - tabs: Tab 定义数组（懒加载场景下供外部按 id 查找并渲染当前 Tab）

 */

export function renderTabBar({ prefix, tabs, accentColor, defaultTab, extraRightHtml, renderCtx, storageKey, onTabChange, priorityTab }) {

  const btnClass = `${prefix}-tab-btn`;

  const dataAttr = `data-${prefix}-tab`;

  const contentId = `${prefix}-tab-content`;



  // 优先级：priorityTab（"有待办必见待办"，一次性）> localStorage 记忆 > defaultTab > tabs[0]

  // R6 导航守卫（2026-09-03 P2a）：决策收敛到 core/boot/tab-nav.js resolveInitialTab——

  //   defaultTab/记忆/priority 若已被支部 config.modules 隐藏，一律回退首个可见 tab，杜绝静默无内容。

  let savedTab = null;

  if (storageKey) {

    try { savedTab = localStorage.getItem(storageKey); } catch (_) { /* localStorage 不可用时静默降级 */ }

  }

  const activeTab = resolveInitialTab(tabs, { defaultTab, savedTab, priorityTab });

  let currentTab = activeTab;



  // 激活态颜色 = 主题色三件套（调用方 accentColor，来自 bootstrapPage 的 accentRole/自选主题色）

  const { accent, accentRgba, accentBorder } = accentColor || FALLBACK_ACCENT;



  // 生成 Tab 按钮 HTML（active 状态由 CSS 类 + CSS 变量驱动）
  //
  // 2026-10-27 Task 6.1/6.2（脏乱繁 · 页签条分层）：
  //   · **组名与页签分开**：组名不再夹在页签之间抢宽度（旧结构在 390 下与箭头、末签互挤），
  //     改为页签条**上方的独立组名行** `.ws-tab-groups`——只显示**当前页签所属组**
  //     （`当前组：总览`），`role="presentation"` 非按钮、不进 Tab 序列；切页签时随之更新。
  //     「当前组 + 更多」是 Spec Task 6.1 允许的两行形态：宽度恒定，390 不会把组名挤出视口，
  //     也不再用任何 `display:none` 隐藏组名。
  //   · 页签仍**单行不换行**（2026-08-23 支书裁定）；组间保留 1px 分隔线 `.tab-group-sep`，
  //     页签顺序 / 深链 / 个人排序一概不动（组名只是展示，不参与排序）。
  //   · 页签行只承载页签与左右箭头（箭头与页签同轴）；右侧动作 `.ws-tab-extra` 随组名行移出页签行。
  const seenGroups = new Set();

  let activeGroupName = '';

  const btnsHtml = tabs.map(({ id, label, groupLabel }) => {

    const isActive = id === activeTab;

    const activeClass = isActive ? ' tab-btn-active' : '';

    // 2026-10-24 批次 508：选中态改由 .tab-btn-active 直接消费 --app-accent-soft-* 令牌，
    //   不再逐按钮注入 --tab-accent* 内联变量（同名两套机制退场）。
    const activeStyle = '';

    // 组名 = groupLabel 去首尾空白（单一源）；当前激活页签的组名供上方组名行使用。
    const groupName = String(groupLabel ?? '').trim();

    if (isActive) activeGroupName = groupName;

    // 组间分隔线（aria-hidden）：只在某组首项前渲染；整行第一个分组之前不画线。
    const sepHtml = seenGroups.has(groupName) || seenGroups.size === 0
      ? ''
      : '<span class="tab-group-sep" aria-hidden="true"></span>';

    seenGroups.add(groupName);

    // 2026-09-30 批次 297-2 收窄（支书裁「**把这些页头 tab 恢复到之前的模式**」）：
    //   页头 tab **自带选中态强调色**（`.tab-btn-active` ＋ 内联 `--tab-accent`）⇒ **不并入通用族**，
    //   回到迁移前 markup。此处把 `${btnClass}` **内联成字面**（DOM 输出不变），
    //   使 `button-system-guard::B4` 的字面扫描能认出这是「组件自有类」并豁免（见该守卫 COMPONENT_STATE_EXEMPT）。
    return `${sepHtml}<button type="button" id="${prefix}-tab-${id}" role="tab" aria-selected="${isActive ? 'true' : 'false'}" aria-controls="${contentId}" tabindex="${isActive ? 0 : -1}" class="${prefix}-tab-btn tab-btn${activeClass} shrink-0 min-h-9 px-4 py-2 text-xs font-medium rounded-lg transition-colors" ${dataAttr}="${id}"${activeStyle}>${label}</button>`;

  }).join('\n');



  // 组名行（页签行之上）：只渲染当前页签所属组；非按钮、不可聚焦，切页签时由 _syncTabA11y 更新。
  const groupName = activeGroupName;

  const groupsHtml = `<div class="ws-tab-groups" role="presentation"><span class="tab-group-label" role="presentation" data-tab-current-group${groupName ? '' : ' hidden'}>当前组：${groupName}</span></div>`;



  // 右侧动作不属于页签集合：放在 tablist 与页签滚动容器之外（读屏不把它当页签，也不被 overflow 裁掉），
  // 2026-10-27 Task 6.1：位置随组名行移出页签行（CSS `order` 归到上面一行）。
  const extraSlot = extraRightHtml ? `<div class="ws-tab-extra shrink-0">${extraRightHtml}</div>` : '';



  // 单行 + 横向平滑滚动（2026-08-23 支书裁定：tab 数量增加禁止随机换行成 2 行）——
  //
  // flex-nowrap 永不换行，overflow-x-auto 超宽时横向滑动；ws-tab-scroll 样式在 styles.css 统一维护
  //
  // （隐藏滚动条 + scroll-behavior:smooth）。
  //
  // 2026-10-19 Spec「页签溢出可发现」：`.ws-tab-scroll` 外包定位容器 `.ws-tab-shell`，
  //   左右箭头与右侧渐隐只在可滚时出现；tab 自身的尺寸/选中态/顺序/分组完全不动。
  // 2026-10-27 Task 6.2：箭头改挂页签行 `.ws-tab-row`（与页签共轴、不压组名行）；
  //   溢出时组名行右端给「还有 N 个」按钮（与箭头同一套滚动逻辑），1440 放开到容器可用宽度。
  const html = `<div class="ws-tab-shell" style="display:flex;align-items:center;gap:8px;">
    ${groupsHtml}
    <div class="ws-tab-row">
      <button type="button" class="btn-outline btn-icon ws-tab-arrow ws-tab-arrow--left" data-tab-scroll-dir="-1" aria-label="向左滚动页签" hidden>${icon('chevronLeft', { className: 'w-4 h-4', extra: ' aria-hidden="true"' })}</button>
      <div class="ws-tab-scroll flex flex-nowrap gap-2 mb-4 overflow-x-auto flex-1 min-w-0"><div class="flex flex-nowrap gap-2 shrink-0" role="tablist" aria-label="工作台页签">${btnsHtml}</div></div>
      <button type="button" class="btn-outline btn-icon ws-tab-arrow ws-tab-arrow--right" data-tab-scroll-dir="1" aria-label="向右滚动页签" hidden>${icon('chevronRight', { className: 'w-4 h-4', extra: ' aria-hidden="true"' })}</button>
    </div>
    <button type="button" class="btn-text ws-tab-more" data-tab-more aria-label="还有更多页签" hidden>还有 <span data-tab-more-count>0</span> 个 ›</button>
    ${extraSlot}
  </div><div id="${contentId}" role="tabpanel"></div>`;



  // 延迟绑定事件（调用方在 innerHTML 后调用 bindTabEvents）

  let boundContainer = null; // 记录绑定容器，供 activate 同步按钮高亮

  // T-304 遗留修复：tab 懒加载并发去重——entry 重渲染（loadWorkspaceData 两次 setState）或快速点击

  // 会重复触发同一 tab 的动态 import，浏览器中止首个请求产生 net::ERR_ABORTED 噪音。

  // 同一 tabId 的渲染 Promise 只保留一个；完成后释放，下次重渲染照常刷新数据。

  const _renderInFlight = new Map();

  // U3a（2026-09-07）：渲染序号——占位收尾仅在"本次渲染仍是当前渲染"时执行（快速连切 tab 防误清新占位）

  let _renderSeq = 0;

  // 2026-10-25 Task 1.2/1.4：占位超时与「上一份完好内容」快照（陈旧写回 / 失败时恢复，不留半截 DOM）
  let _loadingTimer = null;
  // 2026-10-27 Task 10：加载/过渡编排定时器（120ms 延迟 → 120ms 淡出 → 骨架；≤1s 收敛；180/80ms 淡入收尾）
  let _skeletonDelayTimer = null;
  let _skeletonSwapTimer = null;
  let _skeletonSettleTimer = null;
  let _enterTimer = null;
  let _lastGoodSnapshot = null;
  // 去重期间又收到「重渲染当前 tab」的请求（setState / 再次点击）→ 本批完成后补渲一次最新态
  const _renderRequested = new Set();
  // 回退页签提示去重（同一请求 id 只提示一次，避免每次 setState 刷屏）
  const _fallbackNotices = new Set();
  // 2026-10-26 Task 2.4：状态驱动刷新（renderCurrent）不铺占位——
  //   后台数据到达时不得让内容区 pointer-events:none / 压暗 / 插 loading 行（会打断 hover）。
  let _backgroundRender = false;

  /** 占位超时：promise 永不落定时解除灰化 + 停止动画 + 可见「加载超时」。 */
  function _armLoadingTimeout(el) {
    _clearLoadingTimer();
    _loadingTimer = setTimeout(() => {
      _loadingTimer = null;
      if (!el || el.dataset.wsTabLoading !== '1') return;
      _endTabLoading();
      el.innerHTML = tabErrorCardHtml('加载超时');
      el.querySelector('[data-ws-tab-error]')?.setAttribute('data-ws-tab-timeout', '1');
      // 超时即视为该批失败：清掉 in-flight，否则再次点击 / 点重试只会拿到同一个永不落定的 Promise。
      _renderInFlight.delete(currentTab);
      el.querySelector('[data-ws-tab-retry]')?.addEventListener('click', () => {
        const cur = tabs.find((t) => t.id === currentTab);
        if (cur) { _renderInFlight.delete(cur.id); _safeRender(cur); }
      });
    }, TAB_LOADING_TIMEOUT_MS);
  }

  function _clearLoadingTimer() {
    if (_loadingTimer != null) { clearTimeout(_loadingTimer); _loadingTimer = null; }
  }

  /** node 侧定时器不阻塞进程退出（浏览器侧为数字句柄，无 unref） */
  function _setTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    if (t && typeof t.unref === 'function') t.unref();
    return t;
  }

  /** 清掉过渡编排定时器（骨架延迟 / 淡出换骨架 / 1s 收敛） */
  function _clearTransitionTimers() {
    if (_skeletonDelayTimer != null) { clearTimeout(_skeletonDelayTimer); _skeletonDelayTimer = null; }
    if (_skeletonSwapTimer != null) { clearTimeout(_skeletonSwapTimer); _skeletonSwapTimer = null; }
    if (_skeletonSettleTimer != null) { clearTimeout(_skeletonSettleTimer); _skeletonSettleTimer = null; }
  }

  /** 铺骨架（只在「确实需要等待」时调用；固定 min-height 防 0 高弹跳） */
  function _paintSkeleton(el) {
    el.innerHTML = tabContentSkeletonHtml();
    el.style.pointerEvents = 'none';
    el.dataset.wsTabSkeleton = '1';
  }

  /** 新内容淡入：180ms + 8px 位移；reduced-motion 只淡入 80ms、无位移 */
  function _playContentEnter(el) {
    const ms = _prefersReducedMotion() ? TAB_CONTENT_FADE_IN_REDUCED_MS : TAB_CONTENT_FADE_IN_MS;
    try {
      el.classList.add('ws-tab-stage');
      el.classList.remove('is-entering');
      void el.offsetWidth; // 强制回流，连切页签时动画可重放
      el.classList.add('is-entering');
    } catch (_) { /* 非浏览器环境忽略 */ }
    if (_enterTimer != null) clearTimeout(_enterTimer);
    _enterTimer = _setTimer(() => {
      _enterTimer = null;
      try { el.classList.remove('is-entering'); } catch (_) { /* 节点可能已卸载 */ }
    }, ms + 40);
  }



  /** 内容容器（tab-bar 生成的 #${contentId}） */

  function _tabContentEl() {

    return (boundContainer && boundContainer.querySelector(`#${contentId}`)) || document.getElementById(contentId);

  }



  /** 渲染启动：容器空（首帧/壳期）→ 立即铺骨架；已有旧内容（切 tab）→ 先原样保留，
   *  超过 120ms 仍未完成才淡出 120ms 并换骨架（快速渲染不闪骨架）。不整块压暗、不插加载行。 */
  function _beginTabLoading() {
    const el = _tabContentEl();
    if (!el || el.dataset.wsTabLoading === '1') return;
    el.dataset.wsTabLoading = '1';
    if (typeof el.setAttribute === 'function') el.setAttribute('aria-busy', 'true');
    // 过渡舞台类（CSS `.ws-tab-stage.is-leaving / .is-entering` 的基类；加一次即长期保留）
    if (el.classList && typeof el.classList.add === 'function') el.classList.add('ws-tab-stage');
    _clearTransitionTimers();
    if (!el.innerHTML.trim()) {
      // 首帧 / 壳期：内容区 0 高，立即铺骨架防布局弹跳
      _paintSkeleton(el);
    } else {
      // 已有旧内容：先原样保留，120ms 后才进入「旧内容淡出 → 骨架」编排
      _skeletonDelayTimer = _setTimer(() => {
        _skeletonDelayTimer = null;
        if (el.dataset.wsTabLoading !== '1') return;
        el.classList.add('is-leaving');
        _skeletonSwapTimer = _setTimer(() => {
          _skeletonSwapTimer = null;
          if (el.dataset.wsTabLoading !== '1') return;
          _paintSkeleton(el);
          el.classList.remove('is-leaving');
        }, TAB_CONTENT_FADE_OUT_MS);
      }, TAB_LOADING_SKELETON_DELAY_MS);
    }
    // 动效编排预算 ≤1s：到点后骨架停止脉冲（数据等待继续，8s 超时错误卡仍兜底）
    _skeletonSettleTimer = _setTimer(() => {
      _skeletonSettleTimer = null;
      if (typeof el.querySelectorAll !== 'function') return;
      el.querySelectorAll('[data-ws-tab-loading-bar]').forEach((n) => n.setAttribute('data-settled', '1'));
    }, TAB_LOADING_SKELETON_MAX_MS);
    // 2026-10-25 Task 1.4：占位必有时限（含首帧骨架）——超时解除灰化、停动画、给可见重试。
    _armLoadingTimeout(el);
    // U3（2026-09-07）：overview「待答复」直达条槽（内容容器前兄弟）随切 tab 收起——条仅属 overview，
    // 由 overview 外壳 mount 时按需重建，避免条残留显示在其它 tab 内容上方
    const slot = el.previousElementSibling;
    if (slot && slot.classList.contains('overview-dispatch-slot') && slot.innerHTML) {
      slot.innerHTML = '';
      slot.style.minHeight = '0px';
    }
  }



  /** 渲染完成/异常后收尾：移除骨架残留、还原可点，并让新内容淡入（后台刷新不重放动画） */

  function _endTabLoading() {

    _clearLoadingTimer();

    _clearTransitionTimers();

    const el = _tabContentEl();

    if (!el) return;

    const wasLoading = el.dataset.wsTabLoading === '1';

    delete el.dataset.wsTabLoading;

    delete el.dataset.wsTabSkeleton;

    if (typeof el.removeAttribute === 'function') el.removeAttribute('aria-busy');

    el.style.opacity = '';

    el.style.pointerEvents = '';

    // 摘掉旧内容淡出类；新内容由 `_playContentEnter` 统一 180ms 淡入（reduced-motion 80ms）。
    // `motion-enter` 属上一版占位实现的残留类：一并摘掉，避免旧节点继续叠 200ms 过渡。
    el.classList.remove('is-leaving');

    el.classList.remove('motion-enter');

    el.querySelectorAll('[data-ws-tab-loading-bar]').forEach(n => n.remove());

    // 2026-10-26 Task 2.4：状态驱动的后台刷新不铺占位，也不重放入场动画（避免打断 hover / 整块闪）
    if (wasLoading) _playContentEnter(el);

  }



  /** 渲染上下文解析（2026-10-25 Task 1.1）：壳传函数时**每次渲染取最新 state**，不再使用建栏时的冻结快照。
   *  兼容旧调用方仍传对象（原样返回）。 */
  function _resolveCtx(ctx) {
    try {
      if (typeof ctx === 'function') return ctx();
      if (ctx !== undefined && ctx !== null) return ctx;
      return typeof renderCtx === 'function' ? renderCtx() : renderCtx;
    } catch (e) {
      console.error('[tab-bar] 渲染上下文解析失败，按空上下文继续', e);
      return {};
    }
  }

  /** 重渲染当前 tab（陈旧写回纠正 / 去重补渲共用） */
  function _rerenderCurrent() {
    const cur = tabs.find((t) => t.id === currentTab);
    if (cur) _safeRender(cur);
  }

  /** 恢复上一份完好内容（陈旧写回 / 失败时用；无快照则不动，交由随后的重渲染覆盖） */
  function _restoreLastGood() {
    const el = _tabContentEl();
    if (el && typeof _lastGoodSnapshot === 'string') el.innerHTML = _lastGoodSnapshot;
  }

  /** R3-U03：页签模块 import / 渲染失败 → 容器内统一错误卡（保留页签栏，不整页遮罩）。 */
  function _renderTabError(tab) {
    const el = _tabContentEl();
    if (!el) return;
    _endTabLoading();
    mountTabFailure(el, {
      message: '这个页签暂时没加载出来',
      onRetry: () => {
        // 清掉失败缓存后重新走同一渲染链（含占位 / 并行去重 / 陈旧纠正）。
        _renderInFlight.delete(tab.id);
        _safeRender(tab);
      },
    });
  }

  /**
   * 统一渲染生命周期（2026-10-25 Task 1.2/1.3/1.4）：
   *   seq 序号 → 去重 → **切换前清 `dataset.currentTab`** → 等待 Promise → 失败可见（错误卡 + 重试）
   *   → **陈旧写回先恢复上一快照再纠正当前 tab**（不得让旧 tab 的晚到覆盖新 tab，也不留半截 DOM）。
   * @returns {Promise<boolean>} 本次渲染批次结束（永不 reject）
   */
  function _safeRender(tab, ctx) {

    if (!tab || typeof tab.render !== 'function') return Promise.resolve(false);

    let p = _renderInFlight.get(tab.id);

    if (p) {
      // 去重期间的新请求（setState / 再次点击同一 tab）→ 本批完成后按最新 state 补渲一次
      if (currentTab === tab.id) _renderRequested.add(tab.id);
      return p;
    }

    const seq = ++_renderSeq;
    const el = _tabContentEl();

    // U3a：渲染启动前先占位/置灰（首帧防 0 高弹跳；切 tab 防旧内容硬留到新内容突然整块替换）
    // Task 2.4：状态驱动的后台刷新不铺占位（`_backgroundRender`），避免打断 hover / 整块变暗。
    if (!_backgroundRender) _beginTabLoading();

    // 跨 tab 共享容器约定 `dataset.currentTab`（见 today / group-progress / insight-view / calendar /
    //   work-map / feedback / overview / notification / report-up 等十余处）＝「**标记符还在 ⇒ 我的骨架还在**」，
    //   据此决定「是否重建骨架」。陈旧 tab 的覆盖写入不改该标记 ⇒ 纠正会被该守卫挡住（标记仍指目标 tab、
    //   DOM 却已被换掉 ⇒ 目标 tab 找不到自己的 root 而静默 return，残影照旧）。
    //   故：两条渲染路径（点击 / 状态刷新）都在渲染前清标记，强制目标 tab 走**整段重渲染**、不留残影。
    if (el) delete el.dataset.currentTab;

    let resolveInflight;
    p = new Promise((resolve) => { resolveInflight = resolve; });
    _renderInFlight.set(tab.id, p);

    const finish = (ok) => {
      if (_renderInFlight.get(tab.id) === p) _renderInFlight.delete(tab.id);
      resolveInflight(ok);
      if (_renderRequested.delete(tab.id) && currentTab === tab.id) {
        Promise.resolve().then(() => { if (currentTab === tab.id) _safeRender(tab); });
      }
      return p;
    };

    let rendered;
    try {
      rendered = tab.render(_resolveCtx(ctx));
    } catch (e) {
      console.error(`[tab-bar] tab「${tab.id}」渲染异常`, e);
      if (seq === _renderSeq) {
        _endTabLoading();
        _renderTabError(tab);
      } else {
        _restoreLastGood();
        _rerenderCurrent();
      }
      return finish(false);
    }

    Promise.resolve(rendered).then(() => {
      if (seq === _renderSeq && currentTab === tab.id) {
        _endTabLoading();
        const cur = _tabContentEl();
        if (cur) _lastGoodSnapshot = cur.innerHTML;
      } else {
        // 陈旧写回（2026-10-05 批次 386 objective #7）：先恢复上一份完好内容（不留半截 DOM），
        // 再重渲染当前 tab 纠正（去重：当前 tab 仍在渲染中则自然跳过）。
        _restoreLastGood();
        _rerenderCurrent();
      }
      finish(true);
    }, (e) => {
      console.error(`[tab-bar] tab「${tab.id}」渲染失败`, e);
      if (seq === _renderSeq) {
        _endTabLoading();
        _renderTabError(tab);
      } else {
        _restoreLastGood();
        _rerenderCurrent();
      }
      finish(false);
    });

    return p;

  }

  /** 状态变化触发的刷新（workspace-shell::_renderCurrentTab 唯一入口）——与点击共用同一生命周期。
   *  2026-10-26 Task 2.4：与点击的区别只有「不铺占位」——后台数据到达时不得把内容区
   *  `pointer-events:none` / 压暗并插入 loading 行（那会让正在 hover 的日历/列表失焦、整块闪一下）。
   *  失败 / 陈旧写回 / 去重仍走同一套 `_safeRender` 分支。 */
  function renderCurrent(ctx) {
    const tab = tabs.find((t) => t.id === currentTab);
    if (!tab) return Promise.resolve(false);
    _backgroundRender = true;
    try {
      return _safeRender(tab, ctx);
    } finally {
      _backgroundRender = false;
    }
  }



  /** S2 键盘可达（2026-09-12）：同步 tab 按钮的选中态 ARIA 与 roving tabindex（仅选中项可 Tab 入）。
   *  2026-10-27 Task 6.1：同步页签条上方组名行（`当前组：…`）——组名不是按钮、不进 Tab 序列，
   *  只随当前页签更新，避免 390 下组名与页签抢宽度。 */
  function _syncTabA11y(tabId) {
    if (!boundContainer) return;
    boundContainer.querySelectorAll(`.${btnClass}`).forEach(b => {
      const on = b.getAttribute(dataAttr) === tabId;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    const groupEl = boundContainer.querySelector('[data-tab-current-group]');
    if (groupEl) {
      const name = String((tabs.find(t => t.id === tabId) || {}).groupLabel ?? '').trim();
      groupEl.textContent = name ? `当前组：${name}` : '';
      groupEl.hidden = !name;
    }
    // 内容区 = tabpanel：用当前页签的名字作为可访问名称（与 aria-controls 成对）。
    const panel = _tabContentEl();
    if (panel) panel.setAttribute('aria-labelledby', `${prefix}-tab-${tabId}`);
  }

  /**
   * 页签溢出提示（2026-10-19）：左右箭头只在可滚时出现，右侧渐隐随滚动位置切换。
   * 不改变 tab 尺寸 / 选中态 / 顺序；滚动步长 240px，平滑滚动。
   * 2026-10-27 Task 6.2：组名行右端「还有 N 个」按钮与箭头同一套显隐（右侧还剩几个整页签），
   * 点击同箭头右滚 240px；箭头挂页签行 `.ws-tab-row`，与页签共轴、不覆盖组名。
   */
  function _bindTabScroll(container) {
    const shell = container.querySelector('.ws-tab-shell');
    if (!shell) return;
    const scroller = shell.querySelector('.ws-tab-scroll');
    const left = shell.querySelector('.ws-tab-arrow--left');
    const right = shell.querySelector('.ws-tab-arrow--right');
    const more = shell.querySelector('[data-tab-more]');
    const moreCount = more?.querySelector('[data-tab-more-count]');
    if (!scroller || !left || !right) return;

    const STEP = 240;
    const sync = () => {
      const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const x = scroller.scrollLeft;
      const canScroll = max > 1;
      const atStart = x <= 1;
      const atEnd = x >= max - 1;
      left.hidden = !canScroll || atStart;
      right.hidden = !canScroll || atEnd;
      if (more) {
        // 右侧被箭头 / 渐隐压住的 40px 不计入「可见」；到末端即无「还有」。
        const edge = scroller.getBoundingClientRect().right - (canScroll ? 44 : 0);
        const rest = canScroll && !atEnd
          ? [...scroller.querySelectorAll('button[role="tab"]')]
            .filter((b) => b.getBoundingClientRect().right > edge + 1).length
          : 0;
        more.hidden = rest === 0;
        if (moreCount) moreCount.textContent = String(rest);
        more.setAttribute('aria-label', rest ? `还有 ${rest} 个页签，向右滚动` : '还有更多页签');
      }
      shell.toggleAttribute('data-scrollable', canScroll);
      shell.toggleAttribute('data-scroll-end', atEnd);
    };
    // resize 重算：容器被重渲染后自动解绑（避免每次 entry 重渲染累积 window 监听）
    const onResize = () => {
      if (!scroller.isConnected) { window.removeEventListener('resize', onResize); return; }
      sync();
    };

    left.addEventListener('click', () => scroller.scrollBy({ left: -STEP, behavior: 'smooth' }));
    right.addEventListener('click', () => scroller.scrollBy({ left: STEP, behavior: 'smooth' }));
    more?.addEventListener('click', () => scroller.scrollBy({ left: STEP, behavior: 'smooth' }));
    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', onResize);
    sync();
    requestAnimationFrame(sync);
  }

  function bindEvents(container) {
    boundContainer = container;
    container.querySelectorAll(`.${btnClass}`).forEach(btn => {
      btn.addEventListener('click', () => {
        // 重置所有 Tab 样式（移除 active 类 + 清空 inline style）
        container.querySelectorAll(`.${btnClass}`).forEach(b => {
          b.classList.remove('tab-btn-active');
          b.removeAttribute('style');
        });
        // 激活当前 Tab（添加 active 类 + 注入 CSS 变量）
        btn.classList.add('tab-btn-active');

        const tabId = btn.getAttribute(dataAttr);
        _syncTabA11y(tabId);
        // 记忆到 localStorage
        if (storageKey) {
          try { localStorage.setItem(storageKey, tabId); } catch (_) { /* 静默降级 */ }
        }
        const tab = tabs.find(t => t.id === tabId);
        currentTab = tabId;
        if (typeof onTabChange === 'function') onTabChange(tabId, tab);
        // 懒加载支持：render 可能返回 Promise（动态 import），统一去重兜底（T-304）。
        // 2026-10-25 Task 1.1：不传 ctx ⇒ 每次点击按 renderCtx() 取**最新 state**（切月 → 切走 → 切回）。
        _safeRender(tab);
      });
    });

    // S2 键盘可达：方向键在 tab 间移动焦点，Enter/Space 原生触发 click 切换。
    const scroller = container.querySelector('.ws-tab-scroll');
    if (scroller) {
      scroller.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
        const btns = [...container.querySelectorAll(`.${btnClass}`)];
        const idx = btns.indexOf(document.activeElement);
        if (idx < 0) return;
        let next = idx;
        if (e.key === 'ArrowRight') next = (idx + 1) % btns.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = btns.length - 1;
        e.preventDefault();
        btns[next].focus();
      });
    }
    _bindTabScroll(container);
  }



  // 激活指定 Tab

  // 2026-08-08 修复：同步按钮高亮（原实现只渲染内容不换高亮，

  // 导致首页跳转 ?activityId= 后内容已切 tab 而按钮高亮仍停留在记忆的默认 tab）

  // 2026-08-08 二次修复：与 click 处理器副作用对齐——写 localStorage 记忆 + 触发 onTabChange。

  // 根因：loadWorkspaceData 连续两次 setState（LOADING→IDLE）触发 entry 重渲染，

  // 重渲染时 renderTabBar 从 localStorage 读取记忆并回退默认 tab，覆盖 URL 直达的目标 tab。

  function activate(tabId, ctx) {

    // R6 导航守卫（2026-09-03 P2a）：目标 tab 不在可见清单（被支部 config 隐藏/清单外）→

    // 回退首个可见 tab 并告警，杜绝「URL 直达/导航落点激活不存在 tab → 内容区静默空白」。

    const { id: targetId, fellBack } = resolveTargetTab(tabs, tabId);

    if (fellBack) {

      console.warn(`[tab-bar] tab「${tabId}」不在当前可见清单（可能已被支部配置隐藏），回退到「${targetId}」`);
      // 2026-10-25 Task 1.6：回退必须**可见说明**，不得「点 A 亮 B」无提示（同一请求只提示一次）。
      if (tabId && targetId && !_fallbackNotices.has(tabId)) {
        _fallbackNotices.add(tabId);
        const from = (tabs.find((t) => t.id === tabId) || {}).label || tabId;
        const to = (tabs.find((t) => t.id === targetId) || {}).label || targetId;
        setTimeout(() => showToast('info', `「${from}」不在本角色的可见页签，已回到「${to}」`), 300);
      }

    }

    tabId = targetId;

    if (!tabId) return Promise.resolve(false); // 无可渲染 tab（理论不发生：核心组固定保证至少一个可见）

    currentTab = tabId;

    // 记忆到 localStorage（与点击切换一致，重渲染时保持目标 tab）

    if (storageKey) {

      try { localStorage.setItem(storageKey, tabId); } catch (_) { /* 静默降级 */ }

    }

    if (typeof onTabChange === 'function') onTabChange(tabId, tabs.find(t => t.id === tabId));

    if (boundContainer) {

      boundContainer.querySelectorAll(`.${btnClass}`).forEach(b => {

        b.classList.remove('tab-btn-active');

        b.removeAttribute('style');

      });

      const btn = boundContainer.querySelector(`.${btnClass}[${dataAttr}="${tabId}"]`);
      if (btn) {
        btn.classList.add('tab-btn-active');

        // R3-D05：激活页签若在横向滚动视口外，滚到最近可见位置。
        // 2026-10-27 Task 2（阶段一 · 键盘起点）：**只改滚动容器的 scrollLeft**，不用元素级
        //   滚动到视口——后者会把浏览器「顺序焦点导航起点」挪到该页签上，刷新后首次 Tab
        //   落到页签条中段而不是「跳到主要内容」。保留「激活页签可见」能力（含左右留 8px）。
        const scroller = boundContainer.querySelector('.ws-tab-scroll');
        if (scroller) {
          try {
            const sRect = scroller.getBoundingClientRect();
            const bRect = btn.getBoundingClientRect();
            const pad = 8;
            let left = scroller.scrollLeft;
            if (bRect.left < sRect.left + pad) left -= (sRect.left + pad - bRect.left);
            else if (bRect.right > sRect.right - pad) left += (bRect.right - (sRect.right - pad));
            if (left !== scroller.scrollLeft) {
              // 尊重减少动效偏好：CSS 已声明 scroll-behavior:smooth，偏好减少时用 auto 落位。
              if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
                scroller.scrollTo({ left, behavior: 'auto' });
              } else {
                scroller.scrollLeft = left;
              }
            }
          } catch (_) { /* 非浏览器环境 / 老浏览器：静默降级 */ }
        }
      }
    }
    _syncTabA11y(tabId);
    const tab = tabs.find(t => t.id === tabId);

    // 懒加载支持：render 可能返回 Promise（动态 import），统一去重兜底（T-304）。
    // 2026-10-25 Task 1.1/1.2：返回 Promise ⇒ 壳可等待首次渲染完成；ctx 缺省时按最新 state 解析。

    return _safeRender(tab, ctx);

  }



  return { html, bindEvents, activate, renderCurrent, contentId, activeTab, tabs, get currentTab() { return currentTab; } };

}

// 模块加载即注入组件样式 + 跳转进度条（node 测试环境无 document / window ⇒ 自动跳过）
installNavigationProgress();

