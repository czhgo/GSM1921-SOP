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
// 行型（2026-10-18 立 · 单一源＝DESIGN_SYSTEM.md §10.4 五类行型矩阵）：
//   nav（导航）/ action（动作）/ select（选择）/ display（展示）/ master（主从）。
//   行型决定元素与可点性：nav 用 <a> 或 <button>；action / display 用 <div> 且不带
//   data-interactive；select 用 <button>；master 用 <div role="button" tabindex="0">——
//   主从行行尾允许再放「去处理 / 更多」，原生 <button> 内嵌按钮是非法 HTML，故以
//   带键盘语义的 div 承载整行选中。样式面见 styles.css 的 `[data-row-type]` /
//   `[data-interactive="true"]` 段，本件不写内联样式。
//
// 页面骨架工具类（styles.css 单一源，供后续页面按 §4.21 采用）：
//   .stack-page（页面区块 24）· .stack-section（区块 16）· .stack-card（卡内 12）
//   · .card-standard（标准卡内边距 16）· .card-compact（紧凑卡 12）· .gap-inline（行内 4）
//
// 静雅公文基础类（styles.css 单一源，供后续页面按 §2.10 / §4.23 采用）：
//   .section-head / .section-head__title / .section-head__meta / .section-head__count
//   · .metric-band / .metric-band__item / .metric-band__value / .metric-band__label
//   · .metric-band__value--warning / .metric-band__value--accent
//   · .state-badge / .state-badge--neutral / .state-badge--success / .state-badge--warning
//   · .state-badge--info / .state-badge--accent · .section-accent-left
//   · 行型样式：.list-row[data-row-type="nav|action|select|display|master"]（本件输出 data-row-type）。
import { escHtml as esc } from '../../core/base/utils.js?v=20261018h';

/** dataAttrs 对象 → HTML 属性串（键名只允许字母开头的属性名；值统一转义） */
function dataAttrsHtml(dataAttrs) {
  if (!dataAttrs || typeof dataAttrs !== 'object') return '';
  return Object.entries(dataAttrs)
    .filter(([key, value]) => /^[a-zA-Z][\w-]*$/.test(key) && value !== undefined && value !== null && value !== false)
    .map(([key, value]) => ` ${key}="${esc(value)}"`)
    .join('');
}

/** 行型白名单（单一源：DESIGN_SYSTEM §10.4 五类行型） */
const ROW_TYPES = new Set(['nav', 'action', 'select', 'display', 'master']);

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
 * @param {'nav'|'action'|'select'|'display'|'master'} [o.rowType] 行型；
 *   未传时保持旧行为：href → nav、interactive → select、否则 display
 * @returns {string} 行 HTML
 */
export function listRowHtml({
  leading, title, meta, description, trailing, href, dataAttrs, className, interactive, rowType,
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

  // 未传 / 非法 rowType 时按旧行为推断，保证既有调用方零改动。
  const type = ROW_TYPES.has(rowType) ? rowType : (href ? 'nav' : interactive ? 'select' : 'display');

  // 动作行 / 展示行：整行不可点，不带 data-interactive，不绑定点击语义；
  // 动作行的主行动由 trailing 里的按钮承担。
  if (type === 'action' || type === 'display') {
    return `<div class="${baseClass}" data-row-type="${type}"${dataAttrsHtml(dataAttrs)}>${inner}</div>`;
  }

  // 导航行：有 href 用 <a>；无 href 用 <button>，两者都标记 data-interactive。
  if (type === 'nav') {
    if (href) {
      return `<a class="${baseClass}" href="${esc(href)}" data-row-type="nav" data-interactive="true"${dataAttrsHtml(dataAttrs)}>${inner}</a>`;
    }
    return `<button type="button" class="${baseClass} btn-ghost" data-row-type="nav" data-interactive="true"${dataAttrsHtml(dataAttrs)}>${inner}</button>`;
  }

  // 主从行：整行选中，但行尾还要放「去处理 / 更多」——原生 <button> 内嵌按钮非法，
  // 故用带 role="button" 的 div；键盘 Enter / Space 由调用方绑定（见 todo-list.js）。
  if (type === 'master') {
    return `<div class="${baseClass}" data-row-type="master" data-interactive="true" role="button" tabindex="0"${dataAttrsHtml(dataAttrs)}>${inner}</div>`;
  }

  // 选择行：原生 <button>，键盘可达；data-interactive 表示整行可点。
  // 可交互行用原生 <button>：btn-ghost 只是语义族标记，
  // 行内尺寸由 styles.css 的 .list-row.btn-ghost 覆盖。
  return `<button type="button" class="${baseClass} btn-ghost" data-row-type="${type}" data-interactive="true"${dataAttrsHtml(dataAttrs)}>${inner}</button>`;
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
