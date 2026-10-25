// role: [工程师]+[AI]

// ════════════════════════════════════════════════════════════════

//  tab-bar.js — 通用 Tab 切换组件

// ════════════════════════════════════════════════════════════════



import { icon } from '../../core/base/icons.js?v=20261025b';
import { showToast } from '../../core/base/utils.js?v=20261025b';

// R6 导航守卫（2026-09-03 P2a）：初始/目标 tab 决策收敛到纯函数 tab-nav.js（防「被支部隐藏后静默白屏」）

import { resolveInitialTab, resolveTargetTab } from '../../core/boot/tab-nav.js?v=20261025b';



// 角色识别层：tab 激活态 = 主题色三件套渲染（支书 2026-08-08 三审定稿）。

// 背景：前三轮把 tab 强行为品牌金（半透明 0.14/0.30 → 实色 #FFD700），支书全部否决——

// 金是品牌合规色，含义多、受对比度牵制反复变色。回归「每个人各自的主题色」：

// 各工作台 bootstrapPage 传入 accentColor（resolveAccentRole 支持侧边栏主题色个性化），

// 统一渲染 = 浅底 rgba(X,0.1) + 边框 rgba(X,0.3) + X 文字。

// ════════════════════════════════════════════════════════════════

// U3a（2026-09-07）壳层内容区加载占位 ——「卡片先占位不弹跳」

// 背景：工作台首帧内容容器 0 高 + 懒加载 tab import 完成前内容区空 → 数据/模块到达时

//       整块内容弹出造成布局弹跳。此处统一提供两类占位：

//   1) 骨架卡（tabContentSkeletonHtml）：容器为空（首帧/壳期）→ 固定 min-height 灰块 pulse，

//      视觉沿用首页正确做法 dashboard/stats.js 骨架（styles.css 禁改不碰，全 tailwind/内联）。

//   2) 轻量 loading 行（TAB_LOADING_BAR_HTML）：已有旧内容（切 tab/数据刷新）→ 置灰 + 顶部加载行，

//      避免旧内容硬留到新内容突然整块替换。

// 两处共用：workspace-shell 壳顶层 await 期间注入骨架；tab-bar 每次渲染启动前按容器状态选择占位。

const TAB_LOADING_BAR_HTML = `

  <div data-ws-tab-loading-bar class="flex items-center gap-1.5 text-xs rounded-lg bg-gray-100 px-3 py-1.5 mb-3 w-fit" style="color:var(--neutral-400);">

    <span class="inline-block w-3 h-3 rounded-full animate-spin" style="border:2px solid var(--neutral-200);border-top-color:var(--neutral-400);"></span>

    加载中…

  </div>`;



/** 内容区加载骨架占位 HTML（首帧/import 完成前注入；固定 min-height 防 0 高弹跳） */

export function tabContentSkeletonHtml(text = '加载中…') {

  return `

    <div data-ws-tab-loading-bar class="card rounded-xl p-5" style="min-height:320px;display:flex;flex-direction:column;">

      <div class="flex items-center gap-2 text-xs" style="color:var(--neutral-400);">

        <span class="inline-block w-3 h-3 rounded-full animate-spin" style="border:2px solid var(--neutral-200);border-top-color:var(--neutral-400);"></span>

        ${text}

      </div>

      <div class="mt-4 space-y-3 flex-1">

        <div class="h-10 rounded-lg bg-gray-100 animate-pulse"></div>

        <div class="h-10 rounded-lg bg-gray-100 animate-pulse"></div>

        <div class="h-10 rounded-lg bg-gray-100 animate-pulse"></div>

        <div class="h-10 rounded-lg bg-gray-100 animate-pulse"></div>

        <div class="h-10 rounded-lg bg-gray-100 animate-pulse"></div>

      </div>

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

  // groupLabel 去重：同组只在首项前渲染组名（独立元素，不嵌在 button 内）

  // 首组同样显示组名，但组前不加分隔线；后续每组前加 1px 分隔线（组名可见、分隔线 aria-hidden）

  const seenGroups = new Set();

  let isFirstGroup = true; // 整行第一个分组之前不渲染分隔线

  const btnsHtml = tabs.map(({ id, label, groupLabel }) => {

    const isActive = id === activeTab;

    const activeClass = isActive ? ' tab-btn-active' : '';

    // 2026-10-24 批次 508：选中态改由 .tab-btn-active 直接消费 --app-accent-soft-* 令牌，
    //   不再逐按钮注入 --tab-accent* 内联变量（同名两套机制退场）。
    const activeStyle = '';

    // 2026-10-23 Spec「页签分区标识」：每个分组（含首组）渲染**可见组名**；
    //   组间单独渲染 1px 分隔线（aria-hidden），首组之前不画线。
    //   组名 = groupLabel 去首尾空白；空组名不渲染文字，但仍按分组边界处理分隔线。
    //   判重保留：同一组只在组内首项前渲染一次（非连续同名组不会重复出组名）。
    //   尺寸/溢出：组名与分隔线不改变 tab 按钮的任何属性；`.tab-group-label` 自身 flex-shrink:0，
    //   所有宽度均可见（2026-10-26 Task 3.5 删除 ≤1280 隐藏口径）：窄屏只缩小内边距/字号，
    //   页签条由 .ws-tab-scroll 横向滚动，末页签仍可滚动可达。
    const groupName = String(groupLabel ?? '').trim();

    let groupHtml = '';

    if (!seenGroups.has(groupName)) {

      seenGroups.add(groupName);

      const sepHtml = isFirstGroup ? '' : '<span class="tab-group-sep" aria-hidden="true"></span>';

      const nameHtml = groupName
        ? `<span class="tab-group-label" role="presentation">${groupName}</span>`
        : '';

      groupHtml = sepHtml + nameHtml;

      isFirstGroup = false;

    }

    // 2026-09-30 批次 297-2 收窄（支书裁「**把这些页头 tab 恢复到之前的模式**」）：
    //   页头 tab **自带选中态强调色**（`.tab-btn-active` ＋ 内联 `--tab-accent`）⇒ **不并入通用族**，
    //   回到迁移前 markup。此处把 `${btnClass}` **内联成字面**（DOM 输出不变），
    //   使 `button-system-guard::B4` 的字面扫描能认出这是「组件自有类」并豁免（见该守卫 COMPONENT_STATE_EXEMPT）。
    return `${groupHtml}<button type="button" id="${prefix}-tab-${id}" role="tab" aria-selected="${isActive ? 'true' : 'false'}" aria-controls="${contentId}" tabindex="${isActive ? 0 : -1}" class="${prefix}-tab-btn tab-btn${activeClass} shrink-0 min-h-9 px-4 py-2 text-xs font-medium rounded-lg transition-colors" ${dataAttr}="${id}"${activeStyle}>${label}</button>`;

  }).join('\n');



  // 右侧动作不属于页签集合：放在 tablist 与滚动容器之外，避免读屏把「发布招募」等动作当成页签，
  // 也避免它被页签横向滚动容器的 overflow 裁掉（R3-U01）。
  const extraSlot = extraRightHtml ? `<div class="ws-tab-extra shrink-0">${extraRightHtml}</div>` : '';



  // 单行 + 横向平滑滚动（2026-08-23 支书裁定：tab 数量增加禁止随机换行成 2 行）——
  //
  // flex-nowrap 永不换行，overflow-x-auto 超宽时横向滑动；ws-tab-scroll 样式在 styles.css 统一维护
  //
  // （隐藏滚动条 + scroll-behavior:smooth）。
  //
  // 2026-10-19 Spec「页签溢出可发现」：`.ws-tab-scroll` 外包定位容器 `.ws-tab-shell`，
  //   左右箭头与右侧渐隐只在可滚时出现；tab 自身的尺寸/选中态/顺序/分组完全不动。
  // R3-U01：外层 shell 为 flex，滚动容器 flex-1 min-w-0，右侧动作 `.ws-tab-extra` 在滚动容器之外。
  const html = `<div class="ws-tab-shell" style="display:flex;align-items:center;gap:8px;">
    <button type="button" class="btn-outline btn-icon ws-tab-arrow ws-tab-arrow--left" data-tab-scroll-dir="-1" aria-label="向左滚动页签" hidden>${icon('chevronLeft', { className: 'w-4 h-4', extra: ' aria-hidden="true"' })}</button>
    <div class="ws-tab-scroll flex flex-nowrap gap-2 mb-4 overflow-x-auto flex-1 min-w-0"><div class="flex flex-nowrap gap-2 shrink-0" role="tablist" aria-label="工作台页签">${btnsHtml}</div></div>
    ${extraSlot}
    <button type="button" class="btn-outline btn-icon ws-tab-arrow ws-tab-arrow--right" data-tab-scroll-dir="1" aria-label="向右滚动页签" hidden>${icon('chevronRight', { className: 'w-4 h-4', extra: ' aria-hidden="true"' })}</button>
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



  /** 内容容器（tab-bar 生成的 #${contentId}） */

  function _tabContentEl() {

    return (boundContainer && boundContainer.querySelector(`#${contentId}`)) || document.getElementById(contentId);

  }



  /** 渲染启动前占位：容器空（首帧/壳期）→ 注入骨架卡；已有旧内容（切 tab/刷新）→ 置灰 + 顶部轻量 loading 行 */
  function _beginTabLoading() {
    const el = _tabContentEl();
    if (!el || el.dataset.wsTabLoading === '1') return;
    el.dataset.wsTabLoading = '1';
    if (!el.innerHTML.trim()) {
      el.innerHTML = tabContentSkeletonHtml();
    } else {
      // 2026-10-24 批次 508：原实现在同一帧里直接 `opacity=0.45` ⇒ 切页签瞬间「整块变暗」的硬闪。
      //   改为先挂 `.motion-enter`（过渡令牌来自 styles.css），下一帧再改透明度；
      //   「先占位后填充」的既有逻辑（旧内容在位 + 顶部 loading 行）完全不变。
      el.classList.add('motion-enter');
      el.style.pointerEvents = 'none';
      el.insertAdjacentHTML('afterbegin', TAB_LOADING_BAR_HTML);
      const dim = () => {
        // 渲染可能快于一帧（缓存模块）：收尾已清标记时不再压暗，避免残留半透明
        if (el.dataset.wsTabLoading === '1') el.style.opacity = '0.45';
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(dim);
      else dim();
    }
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



  /** 渲染完成/异常后收尾：移除 loading 行/骨架残留、还原置灰（内容由各 tab 自身 innerHTML 替换） */

  function _endTabLoading() {

    _clearLoadingTimer();

    const el = _tabContentEl();

    if (!el) return;

    delete el.dataset.wsTabLoading;

    el.style.opacity = '';

    el.style.pointerEvents = '';

    // 2026-10-24 批次 508：切完即摘掉入场过渡类（内容已由各 tab 自己写入；留着会在后续
    //   无关的样式变更上继续叠过渡）。透明度恢复与摘类同帧完成，新内容直接以全亮呈现，不硬闪。
    el.classList.remove('motion-enter');

    el.querySelectorAll('[data-ws-tab-loading-bar]').forEach(n => n.remove());

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



  /** S2 键盘可达（2026-09-12）：同步 tab 按钮的选中态 ARIA 与 roving tabindex（仅选中项可 Tab 入）。 */
  function _syncTabA11y(tabId) {
    if (!boundContainer) return;
    boundContainer.querySelectorAll(`.${btnClass}`).forEach(b => {
      const on = b.getAttribute(dataAttr) === tabId;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    // 内容区 = tabpanel：用当前页签的名字作为可访问名称（与 aria-controls 成对）。
    const panel = _tabContentEl();
    if (panel) panel.setAttribute('aria-labelledby', `${prefix}-tab-${tabId}`);
  }

  /**
   * 页签溢出提示（2026-10-19）：左右箭头只在可滚时出现，右侧渐隐随滚动位置切换。
   * 不改变 tab 尺寸 / 选中态 / 顺序；滚动步长 240px，平滑滚动。
   */
  function _bindTabScroll(container) {
    const shell = container.querySelector('.ws-tab-shell');
    if (!shell) return;
    const scroller = shell.querySelector('.ws-tab-scroll');
    const left = shell.querySelector('.ws-tab-arrow--left');
    const right = shell.querySelector('.ws-tab-arrow--right');
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

        // R3-D05：激活页签若在横向滚动视口外，滚到最近可见位置（尊重减少动效偏好）。
        try {
          btn.scrollIntoView({
            inline: 'nearest',
            block: 'nearest',
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          });
        } catch (_) { /* 非浏览器环境 / 老浏览器：静默降级 */ }
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

