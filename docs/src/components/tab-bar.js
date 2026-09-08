// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  tab-bar.js — 通用 Tab 切换组件
// ════════════════════════════════════════════════════════════════

import { accDarkParts } from '../core/constants.js?v=20260908d';
// R6 导航守卫（2026-09-03 P2a）：初始/目标 tab 决策收敛到纯函数 tab-nav.js（防「被支部隐藏后静默白屏」）
import { resolveInitialTab, resolveTargetTab } from '../core/tab-nav.js?v=20260908d';

// 角色识别层：tab 激活态 = 主题色三件套渲染（书记 2026-08-08 三审定稿）。
// 背景：前三轮把 tab 强行为品牌金（半透明 0.14/0.30 → 实色 #FFD700），书记全部否决——
// 金是品牌合规色，含义多、受对比度牵制反复变色。回归「每个人各自的主题色」：
// 各工作台 bootstrapPage 传入 accentColor（resolveAccentRole 支持侧边栏主题色个性化），
// 统一渲染 = 浅底 rgba(X,0.1) + 边框 rgba(X,0.3) + X 文字。
// ════════════════════════════════════════════════════════════════
// U3a（2026-09-07）壳层内容区加载占位 ——「卡片先占位不弹跳」
// 背景：工作台首帧内容容器 0 高 + 懒加载 tab import 完成前内容区空 → 数据/模块到达时
//       整块内容弹出造成布局弹跳。此处统一提供两类占位：
//   1) 骨架卡（tabContentSkeletonHtml）：容器为空（首帧/壳期）→ 固定 min-height 灰块 pulse，
//      视觉沿用首页正确范式 dashboard/stats.js 骨架（styles.css 禁改不碰，全 tailwind/内联）。
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
const FALLBACK_ACCENT = {
  accent: '#B91C1C',                  // 党建红（默认兜底，与书记主题色同源）
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
 *                                        语义 = "有待办必见待办"（书记 2026-08-10 裁定）：
 *                                        调用方仅在首次渲染时传入（一次性消费），
 *                                        避免 setState 重渲染反复覆盖用户正在看的 Tab。
 *
 * @returns {{ html: string, activate: (tabId: string, ctx?: Object) => void }}
 *   - html: Tab 栏 + 内容容器的 HTML 字符串
 *   - activate: 手动激活指定 Tab 的方法
 *   - currentTab: 当前激活的 Tab ID（getter）
 *   - tabs: Tab 定义数组（懒加载场景下供外部按 id 查找并渲染当前 Tab）
 */
// 单行滚动提示（2026-08-23 书记裁定）：溢出时两侧渐隐遮罩，滚动到边缘自动消失。
// 元素级标记防重复绑定（单体式入口每次 setState 重建 tabBar 会多次调用 bindEvents）。
// ResizeObserver：Tailwind CDN 异步注入 shrink-0/flex-nowrap 后布局才稳定，须监听尺寸变化补算溢出。
function _bindScrollHints(scroller) {
  if (!scroller || scroller.dataset.wsScrollHint === '1') return;
  scroller.dataset.wsScrollHint = '1';
  const update = () => {
    const canL = scroller.scrollLeft > 2;
    const canR = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
    scroller.dataset.overflow = canR ? (canL ? 'both' : 'right') : (canL ? 'left' : 'none');
  };
  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe(scroller);
  }
  update();
}

export function renderTabBar({ prefix, tabs, accentColor, defaultTab, extraRightHtml, renderCtx, storageKey, onTabChange, priorityTab }) {
  const btnClass = `${prefix}-tab-btn`;
  const dataAttr = `data-${prefix}-tab`;
  const contentId = `${prefix}-tab-content`;

  // 优先级：priorityTab（"有待办必见待办"，一次性）> localStorage 记忆 > defaultTab > tabs[0]
  // R6 导航守卫（2026-09-03 P2a）：决策收敛到 core/tab-nav.js resolveInitialTab——
  //   defaultTab/记忆/priority 若已被支部 config.modules 隐藏，一律回退首个可见 tab，杜绝静默无内容。
  let savedTab = null;
  if (storageKey) {
    try { savedTab = localStorage.getItem(storageKey); } catch (_) { /* localStorage 不可用时静默降级 */ }
  }
  const activeTab = resolveInitialTab(tabs, { defaultTab, savedTab, priorityTab });
  let currentTab = activeTab;

  // 激活态颜色 = 主题色三件套（调用方 accentColor，来自 bootstrapPage 的 accentRole/自选主题色）
  const { accent, accentRgba, accentBorder } = accentColor || FALLBACK_ACCENT;
  // 分组标签深色三件套（浅底深字 → 夜间提亮底+亮字+亮边框，配合 styles.css --acc-*-dark 覆盖规则）
  const _grpDark = accDarkParts(accent);

  // 生成 Tab 按钮 HTML（active 状态由 CSS 类 + CSS 变量驱动）
  // groupLabel 去重：同组只在首项前渲染标签（独立元素，不嵌在 button 内）
  // 首组（整行第一个出现的标签）不加竖线，后续组加竖线分隔
  const seenGroups = new Set();
  let isFirstGroup = true; // 整行第一个 groupLabel 不加竖线
  const btnsHtml = tabs.map(({ id, label, groupLabel }) => {
    const isActive = id === activeTab;
    const activeClass = isActive ? ' tab-btn-active' : '';
    const activeStyle = isActive
      ? ` style="--tab-accent:${accent};--tab-accent-bg:${accentRgba};--tab-accent-border:${accentBorder}"`
      : '';
    // groupLabel 只在该组首次出现时渲染（独立元素，不被 button 选中态影响）
    let groupHtml = '';
    if (groupLabel && !seenGroups.has(groupLabel)) {
      seenGroups.add(groupLabel);
      const divider = isFirstGroup
        ? ''
        : `<span style="--acc-bg-dark:#334155;width:1px;height:14px;background:#E5E7EB;display:inline-block;margin-right:4px;vertical-align:middle;"></span>`;
      groupHtml = `<span class="tab-group-label shrink-0 inline-flex items-center gap-1.5" style="pointer-events:none;user-select:none;">${divider}<span style="padding:1px 5px;border-radius:3px;--acc-bg-dark:${_grpDark.bg};--acc-text-dark:${_grpDark.text};--acc-border-dark:${_grpDark.border};background:${accentRgba};color:${accent};font-weight:600;letter-spacing:0.5px;vertical-align:middle;" class="text-[11px]">${groupLabel}</span></span>`;
      isFirstGroup = false;
    }
    return `${groupHtml}<button class="${btnClass}${activeClass} shrink-0 px-4 py-2 text-xs font-medium rounded-lg transition-colors" ${dataAttr}="${id}"${activeStyle}>${label}</button>`;
  }).join('\n');

  const extraHtml = extraRightHtml ? `<div class="ml-auto shrink-0">${extraRightHtml}</div>` : '';

  // 单行 + 横向平滑滚动（2026-08-23 书记裁定：tab 数量增加禁止随机换行成 2 行）——
  // flex-nowrap 永不换行，overflow-x-auto 超宽时横向滑动；ws-tab-scroll 样式在 styles.css 统一维护
  // （隐藏滚动条 + scroll-behavior:smooth + 溢出时两侧渐隐遮罩）。
  const html = `<div class="ws-tab-scroll flex flex-nowrap gap-2 mb-4 overflow-x-auto">${btnsHtml}${extraHtml}</div><div id="${contentId}"></div>`;

  // 延迟绑定事件（调用方在 innerHTML 后调用 bindTabEvents）
  let boundContainer = null; // 记录绑定容器，供 activate 同步按钮高亮
  // T-304 遗留修复：tab 懒加载并发去重——entry 重渲染（loadWorkspaceData 两次 setState）或快速点击
  // 会重复触发同一 tab 的动态 import，浏览器中止首个请求产生 net::ERR_ABORTED 噪音。
  // 同一 tabId 的渲染 Promise 只保留一个；完成后释放，下次重渲染照常刷新数据。
  const _renderInFlight = new Map();
  // U3a（2026-09-07）：渲染序号——占位收尾仅在"本次渲染仍是当前渲染"时执行（快速连切 tab 防误清新占位）
  let _renderSeq = 0;

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
      el.style.opacity = '0.45';
      el.style.pointerEvents = 'none';
      el.insertAdjacentHTML('afterbegin', TAB_LOADING_BAR_HTML);
    }
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
    const el = _tabContentEl();
    if (!el) return;
    delete el.dataset.wsTabLoading;
    el.style.opacity = '';
    el.style.pointerEvents = '';
    el.querySelectorAll('[data-ws-tab-loading-bar]').forEach(n => n.remove());
  }

  function _safeRender(tab, ctx) {
    if (!tab || typeof tab.render !== 'function') return;
    let p = _renderInFlight.get(tab.id);
    if (!p) {
      try {
        // U3a：渲染启动前先占位/置灰（首帧防 0 高弹跳；切 tab 防旧内容硬留到新内容突然整块替换）
        const seq = ++_renderSeq;
        _beginTabLoading();
        p = Promise.resolve(tab.render(ctx));
        const done = () => {
          if (seq === _renderSeq) _endTabLoading();
          if (_renderInFlight.get(tab.id) === p) _renderInFlight.delete(tab.id);
        };
        p.then(done, done);
      } catch (e) {
        console.error(`[tab-bar] tab「${tab.id}」渲染异常`, e);
        _endTabLoading(); // U3a：异常也收尾（防占位/置灰残留）
        return;
      }
      _renderInFlight.set(tab.id, p);
    }
    p.catch(e => console.error(`[tab-bar] tab「${tab.id}」渲染失败`, e));
  }

  function bindEvents(container) {
    boundContainer = container;
    _bindScrollHints(container.querySelector('.ws-tab-scroll'));
    container.querySelectorAll(`.${btnClass}`).forEach(btn => {
      btn.addEventListener('click', () => {
        // 重置所有 Tab 样式（移除 active 类 + 清空 inline style）
        container.querySelectorAll(`.${btnClass}`).forEach(b => {
          b.classList.remove('tab-btn-active');
          b.removeAttribute('style');
        });
        // 激活当前 Tab（添加 active 类 + 注入 CSS 变量）
        btn.classList.add('tab-btn-active');
        btn.setAttribute('style', `--tab-accent:${accent};--tab-accent-bg:${accentRgba};--tab-accent-border:${accentBorder}`);
        // 渲染内容
        const tabId = btn.getAttribute(dataAttr);
        // 记忆到 localStorage
        if (storageKey) {
          try { localStorage.setItem(storageKey, tabId); } catch (_) { /* 静默降级 */ }
        }
        const tab = tabs.find(t => t.id === tabId);
        currentTab = tabId;
        if (typeof onTabChange === 'function') onTabChange(tabId, tab);
        // 懒加载支持：render 可能返回 Promise（动态 import），统一去重兜底（T-304）
        _safeRender(tab, renderCtx);
      });
    });
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
    }
    tabId = targetId;
    if (!tabId) return; // 无可渲染 tab（理论不发生：核心组固定保证至少一个可见）
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
        btn.setAttribute('style', `--tab-accent:${accent};--tab-accent-bg:${accentRgba};--tab-accent-border:${accentBorder}`);
      }
    }
    const tab = tabs.find(t => t.id === tabId);
    // 懒加载支持：render 可能返回 Promise（动态 import），统一去重兜底（T-304）
    _safeRender(tab, ctx || renderCtx);
  }

  return { html, bindEvents, activate, contentId, activeTab, tabs, get currentTab() { return currentTab; } };
}
