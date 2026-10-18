// role: [工程师]+[AI]
// empty-state.js — 空态单一源（2026-10-18 立）
//
// 职责：只允许「一句话 + 可选一个动作」；不铺插图、不写长说明、不并列多个动作。
// 单一源关系：
//   · 样式 = docs/src/styles.css 的 .empty-state / .empty-state__text / .empty-state__action 段；
//   · 文案转义 = core/base/utils.js 的 escHtml；
//   · 数据表空态仍由 list-filter 的 table 模式自带空行，本件用于列表 / 卡片 / 页面级空态。
import { escHtml as esc } from '../../core/base/utils.js?v=20261018g';

/**
 * 生成空态 HTML。
 * @param {string} message 一句话说明（必填）
 * @param {Object} [opts]
 * @param {string} [opts.actionHtml] 可选的动作插槽（HTML，调用方负责按钮语义族）
 * @param {string} [opts.className] 附加类
 * @returns {string} 空态 HTML
 */
export function emptyStateHtml(message, { actionHtml, className } = {}) {
  return `<div class="empty-state${className ? ' ' + esc(className) : ''}">
    <p class="empty-state__text">${esc(message)}</p>
    ${actionHtml ? `<div class="empty-state__action">${actionHtml}</div>` : ''}
  </div>`;
}

/**
 * 渲染空态到容器。
 * @param {HTMLElement} container 挂载容器
 * @param {string} message 一句话说明
 * @param {Object} [opts] 同 emptyStateHtml
 * @returns {string} 已写入的 HTML
 */
export function renderEmptyState(container, message, opts = {}) {
  const html = emptyStateHtml(message, opts);
  if (container) container.innerHTML = html;
  return html;
}
