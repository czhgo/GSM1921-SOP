// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  tab-bar.js — 通用 Tab 切换组件
// ════════════════════════════════════════════════════════════════

import { accDarkParts } from '../core/constants.js?v=20260812b';

// 角色识别层：tab 激活态 = 主题色三件套渲染（书记 2026-08-08 三审定稿）。
// 背景：前三轮把 tab 强行为品牌金（半透明 0.14/0.30 → 实色 #FFD700），书记全部否决——
// 金是品牌合规色，含义多、受对比度牵制反复变色。回归「每个人各自的主题色」：
// 各工作台 bootstrapPage 传入 accentColor（resolveAccentRole 支持侧边栏主题色个性化），
// 统一渲染 = 浅底 rgba(X,0.1) + 边框 rgba(X,0.3) + X 文字。
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
export function renderTabBar({ prefix, tabs, accentColor, defaultTab, extraRightHtml, renderCtx, storageKey, onTabChange, priorityTab }) {
  const btnClass = `${prefix}-tab-btn`;
  const dataAttr = `data-${prefix}-tab`;
  const contentId = `${prefix}-tab-content`;

  // 优先级：priorityTab（"有待办必见待办"，一次性）> localStorage 记忆 > defaultTab > tabs[0]
  let activeTab = defaultTab || tabs[0]?.id;
  if (priorityTab && tabs.some(t => t.id === priorityTab)) {
    activeTab = priorityTab;
  } else if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && tabs.some(t => t.id === saved)) {
        activeTab = saved;
      }
    } catch (_) { /* localStorage 不可用时静默降级 */ }
  }
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
      groupHtml = `<span class="tab-group-label inline-flex items-center gap-1.5" style="pointer-events:none;user-select:none;">${divider}<span style="padding:1px 5px;border-radius:3px;--acc-bg-dark:${_grpDark.bg};--acc-text-dark:${_grpDark.text};--acc-border-dark:${_grpDark.border};background:${accentRgba};color:${accent};font-weight:600;letter-spacing:0.5px;vertical-align:middle;" class="text-[11px]">${groupLabel}</span></span>`;
      isFirstGroup = false;
    }
    return `${groupHtml}<button class="${btnClass}${activeClass} px-4 py-2 text-xs font-medium rounded-lg transition-colors" ${dataAttr}="${id}"${activeStyle}>${label}</button>`;
  }).join('\n');

  const extraHtml = extraRightHtml ? `<div class="ml-auto">${extraRightHtml}</div>` : '';

  // flex-wrap:wrap — 移动端窄屏自动换行，杜绝 tab 栏横向溢出撑破页面（T230 移动端实测 2026-08-07）
  const html = `<div class="flex flex-wrap gap-2 mb-4">${btnsHtml}${extraHtml}</div><div id="${contentId}"></div>`;

  // 延迟绑定事件（调用方在 innerHTML 后调用 bindTabEvents）
  let boundContainer = null; // 记录绑定容器，供 activate 同步按钮高亮
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
        // 懒加载支持：render 可能返回 Promise（动态 import），统一兜底捕获
        if (tab && typeof tab.render === 'function') {
          try {
            const r = tab.render(renderCtx);
            if (r && typeof r.catch === 'function') r.catch(e => console.error(`[tab-bar] tab「${tabId}」渲染失败`, e));
          } catch (e) {
            console.error(`[tab-bar] tab「${tabId}」渲染异常`, e);
          }
        }
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
    if (tab && typeof tab.render === 'function') {
      try {
        const r = tab.render(ctx || renderCtx);
        if (r && typeof r.catch === 'function') r.catch(e => console.error(`[tab-bar] tab「${tabId}」渲染失败`, e));
      } catch (e) {
        console.error(`[tab-bar] tab「${tabId}」渲染异常`, e);
      }
    }
  }

  return { html, bindEvents, activate, contentId, activeTab, tabs, get currentTab() { return currentTab; } };
}
