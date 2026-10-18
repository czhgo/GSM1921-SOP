// role: [工程师]+[AI]
// list-row.js — 重复列表行单一源（2026-10-18 立）
//
// 职责：把「状态点 / 徽章 + 标题 + 次级信息 + 描述 + 行尾动作」的重复行收成一处标记，
//   页面只传数据与插槽，不再手写 `div` + `border-b` + `py-2.5` 的行容器。
// 单一源关系：
//   · 样式 = docs/src/styles.css 的 .list-row / .list-group / .list-row__* 段；
//   · 文本转义 = core/base/utils.js 的 escHtml（标题 / 次级 / 描述 / data 属性一律转义）；
//   · 翻页 = components/ui/pager.js；检索 = components/ui/filter-bar.js（本件不另写一套）。
// 采用口径：新增重复行必须用 listRowHtml；列表行本身不画完整边框，分隔线由父级
//   listGroupHtml 的 .list-group 在行间出 1px hairline。
//
// 页面骨架工具类（styles.css 单一源，供后续页面按 §4.21 采用）：
//   .stack-page（页面区块 24）· .stack-section（区块 16）· .stack-card（卡内 12）
//   · .card-standard（标准卡内边距 16）· .card-compact（紧凑卡 12）· .gap-inline（行内 4）
import { escHtml as esc } from '../../core/base/utils.js?v=20261018g';

/** dataAttrs 对象 → HTML 属性串（键名只允许字母开头的属性名；值统一转义） */
function dataAttrsHtml(dataAttrs) {
  if (!dataAttrs || typeof dataAttrs !== 'object') return '';
  return Object.entries(dataAttrs)
    .filter(([key, value]) => /^[a-zA-Z][\w-]*$/.test(key) && value !== undefined && value !== null && value !== false)
    .map(([key, value]) => ` ${key}="${esc(value)}"`)
    .join('');
}

/**
 * 渲染一条列表行。
 * @param {Object} o
 * @param {string} [o.leading] 行首插槽（状态点 / 徽章 HTML，已在调用方转义）
 * @param {string} [o.title] 主标题（14px / 500）
 * @param {string} [o.meta] 次级信息（12px）
 * @param {string} [o.description] 描述（12px）
 * @param {string} [o.trailing] 行尾动作插槽（HTML）
 * @param {string} [o.href] 传入即渲染为 `<a>`（整行可点）
 * @param {Object} [o.dataAttrs] 附加 data-* 属性
 * @param {string} [o.className] 附加类
 * @param {boolean} [o.interactive] 无 href 时渲染为 `<button type="button">`
 * @returns {string} 行 HTML
 */
export function listRowHtml({
  leading, title, meta, description, trailing, href, dataAttrs, className, interactive,
} = {}) {
  const baseClass = `list-row${className ? ' ' + esc(className) : ''}`;
  const inner = `
    ${leading || ''}
    <div class="list-row__main">
      ${title ? `<div class="list-row__title">${esc(title)}</div>` : ''}
      ${meta ? `<div class="list-row__meta">${esc(meta)}</div>` : ''}
      ${description ? `<div class="list-row__desc">${esc(description)}</div>` : ''}
    </div>
    ${trailing ? `<div class="list-row__trailing">${trailing}</div>` : ''}`;

  if (href) {
    return `<a class="${baseClass}" href="${esc(href)}"${interactive ? ' data-interactive="true"' : ''}${dataAttrsHtml(dataAttrs)}>${inner}</a>`;
  }
  if (interactive) {
    // 可交互行用原生 <button>：键盘可达；btn-ghost 只是语义族标记，
    // 行内尺寸由 styles.css 的 .list-row.btn-ghost 覆盖。
    return `<button type="button" class="${baseClass} btn-ghost" data-interactive="true"${dataAttrsHtml(dataAttrs)}>${inner}</button>`;
  }
  return `<div class="${baseClass}"${dataAttrsHtml(dataAttrs)}>${inner}</div>`;
}

/**
 * 渲染列表分组（唯一分隔线来源）。
 * @param {Array<string|Object>} rows 行 HTML 串，或直接传 listRowHtml 的参数对象
 * @param {{className?:string}} [opts]
 * @returns {string} 分组 HTML
 */
export function listGroupHtml(rows, { className } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const body = list
    .map((row) => (typeof row === 'string' ? row : listRowHtml(row)))
    .join('');
  return `<div class="list-group${className ? ' ' + esc(className) : ''}">${body}</div>`;
}
