// role: [人机]
// ════════════════════════════════════════════════════════════════
//  tab-bar.js — 通用 Tab 切换组件
// ════════════════════════════════════════════════════════════════

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
 *
 * @returns {{ html: string, activate: (tabId: string, ctx?: Object) => void }}
 *   - html: Tab 栏 + 内容容器的 HTML 字符串
 *   - activate: 手动激活指定 Tab 的方法
 */
export function renderTabBar({ prefix, tabs, accentColor, defaultTab, extraRightHtml, renderCtx }) {
  const btnClass = `${prefix}-tab-btn`;
  const dataAttr = `data-${prefix}-tab`;
  const contentId = `${prefix}-tab-content`;
  const activeTab = defaultTab || tabs[0]?.id;

  const { accent, accentRgba, accentBorder } = accentColor;

  // 生成 Tab 按钮 HTML
  const btnsHtml = tabs.map(({ id, label }) => {
    const isActive = id === activeTab;
    const style = isActive
      ? `background:${accentRgba};color:${accent};border:1px solid ${accentBorder}`
      : `background:white;color:#6B7280;border:1px solid #E5E7EB`;
    return `<button class="${btnClass} px-4 py-2 text-xs font-medium rounded-lg transition-colors" ${dataAttr}="${id}" style="${style}">${label}</button>`;
  }).join('\n');

  const extraHtml = extraRightHtml ? `<div class="ml-auto">${extraRightHtml}</div>` : '';

  const html = `<div class="flex gap-2 mb-4">${btnsHtml}${extraHtml}</div><div id="${contentId}"></div>`;

  // 延迟绑定事件（调用方在 innerHTML 后调用 bindTabEvents）
  function bindEvents(container) {
    container.querySelectorAll(`.${btnClass}`).forEach(btn => {
      btn.addEventListener('click', () => {
        // 重置所有 Tab 样式
        container.querySelectorAll(`.${btnClass}`).forEach(b => {
          b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
        });
        // 激活当前 Tab
        btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
        // 渲染内容
        const tabId = btn.getAttribute(dataAttr);
        const tab = tabs.find(t => t.id === tabId);
        if (tab) tab.render(renderCtx);
      });
    });
  }

  // 激活指定 Tab
  function activate(tabId, ctx) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) tab.render(ctx || renderCtx);
  }

  return { html, bindEvents, activate, contentId };
}
