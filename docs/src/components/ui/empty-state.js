// role: [工程师]+[AI]
// empty-state.js — 空态单一源（2026-10-18 立 · 2026-10-28 三形态收口）
//
// 职责：只允许「一句话 + 可选一个动作」；不铺插图、不写长说明、不并列多个动作。
// 三种形态（`variant`）：
//   · `inline` —— 行内一句（列表行 / 表格单元格 / 提示条内）；
//   · `panel`  —— 居中块（卡片 / 页签主体），缺省值，兼容既有调用；
//   · `table`  —— 表格空行（`colspan` 由调用方给，`<tr class="is-empty">` 由本件产出）。
// 统一口径：文案 ≤30 字、至多一个动作、文案由调用方传入（本件不内置任何安慰语）。
// 单一源关系：
//   · 样式 = docs/src/styles.css 的 .empty-state / .empty-state--inline / .empty-state__text / .empty-state__action 段；
//   · 文案转义 = core/base/utils.js 的 escHtml；
//   · 数据表空态：list-filter 的 table 模式与 relation-matrix 一律调 `variant: 'table'`，不再手写空行。
import { escHtml as esc } from '../../core/base/utils.js?v=20261029b';

/**
 * 生成空态 HTML。
 * 支持两种调用形态（后者为 2026-10-28 起的推荐写法）：
 *   emptyStateHtml('暂无记录', { variant: 'inline' })
 *   emptyStateHtml({ variant: 'panel', text: '请先登录后使用', actionHtml })
 * @param {string|Object} messageOrOptions 一句话说明，或选项对象（含 `text`）
 * @param {Object} [maybeOpts]
 * @param {string} [maybeOpts.text] 一句话说明（对象形态必填）
 * @param {'inline'|'panel'|'table'} [maybeOpts.variant] 形态，缺省 `panel`
 * @param {string} [maybeOpts.actionHtml] 可选的动作插槽（HTML，调用方负责按钮语义族；至多一个）
 * @param {string} [maybeOpts.className] 附加类（panel / inline 生效）
 * @param {number} [maybeOpts.colspan] 表格空行的列数（table 形态；缺省 1）
 * @returns {string} 空态 HTML
 */
export function emptyStateHtml(messageOrOptions, maybeOpts = {}) {
  const opts = typeof messageOrOptions === 'string'
    ? { ...maybeOpts, text: messageOrOptions }
    : { ...(messageOrOptions || {}) };
  const text = String(opts.text == null ? '' : opts.text);
  const variant = opts.variant || 'panel';
  const actionHtml = opts.actionHtml || '';
  const className = opts.className ? ' ' + esc(opts.className) : '';

  if (variant === 'table') {
    const span = Number(opts.colspan) > 0 ? Number(opts.colspan) : 1;
    return `<tr class="is-empty"><td colspan="${span}" class="is-empty"><span class="empty-state__text">${esc(text)}</span>${actionHtml ? ` <span class="empty-state__action">${actionHtml}</span>` : ''}</td></tr>`;
  }
  if (variant === 'inline') {
    return `<p class="empty-state empty-state--inline${className}"><span class="empty-state__text">${esc(text)}</span>${actionHtml ? ` <span class="empty-state__action">${actionHtml}</span>` : ''}</p>`;
  }
  return `<div class="empty-state${className}">
    <p class="empty-state__text">${esc(text)}</p>
    ${actionHtml ? `<div class="empty-state__action">${actionHtml}</div>` : ''}
  </div>`;
}

/**
 * 渲染空态到容器。
 * @param {HTMLElement} container 挂载容器
 * @param {string|Object} messageOrOptions 一句话说明，或选项对象
 * @param {Object} [opts] 同 emptyStateHtml
 * @returns {string} 已写入的 HTML
 */
export function renderEmptyState(container, messageOrOptions, opts = {}) {
  const html = emptyStateHtml(messageOrOptions, opts);
  if (container) container.innerHTML = html;
  return html;
}
