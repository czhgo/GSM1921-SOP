// role: [工程师]+[AI]
// data-table.js — 逐行对比数据表单一入口（2026-10-18 立）
//
// 职责：把「行 HTML + 表头 + 检索 / 分页配置」交给统一检索引擎的表格模式，
//   页面不再自己拼 `<table>`、不再手写表头 / 行线 / 悬停 / 内边距类。
// 单一源关系：
//   · 渲染引擎 = components/ui/list-filter.js::renderFilteredList（table 模式）；
//   · 表格样式 = docs/src/styles.css 的 .data-table 段；
//   · 翻页 = components/ui/pager.js（引擎内部调用）；
//   · 检索条阈值 = components/ui/filter-bar.js（行数 > 8 才出现）。
// 采用口径：首列 sticky 由调用方在 headHtml / rowHtml 的 className 中声明；
//   末列动作由 rowHtml 提供；不得在调用方另写 <table> 或表头内边距。
import { escHtml as esc } from '../../core/base/utils.js?v=20261018g';
import { renderFilteredList } from './list-filter.js?v=20261018g';

/**
 * 生成表头行。
 * @param {Array<{label:string, className?:string}>} columns
 * @returns {string} `<tr><th>…</th></tr>`
 */
export function tableHeadHtml(columns) {
  const cols = Array.isArray(columns) ? columns : [];
  return `<tr>${cols.map((col) => {
    const label = col && col.label != null ? col.label : '';
    const cls = col && col.className ? ` class="${esc(col.className)}"` : '';
    return `<th${cls}>${esc(label)}</th>`;
  }).join('')}</tr>`;
}

/**
 * 渲染数据表（统一检索引擎 table 模式）。
 * @param {HTMLElement} container 挂载容器
 * @param {Object} cfg
 * @param {string} [cfg.stateKey] 状态保持键
 * @param {Array} cfg.rows 数据集
 * @param {Function} cfg.rowHtml (item, index) => `<tr>…</tr>`
 * @param {string} [cfg.headHtml] 表头（用 tableHeadHtml 生成）
 * @param {number} [cfg.colSpan] 空态行跨列数
 * @param {Object} [cfg.keyword] 关键词配置
 * @param {Array} [cfg.facets] 分面配置
 * @param {number} [cfg.pageSize] 每页条数（缺省 10；0 = 不分页）
 * @param {string} [cfg.emptyMessage] 空态文案
 * @param {string} [cfg.countUnit] 计数单位
 * @returns {Object} renderFilteredList 的句柄（visible / state / apply / update）
 */
export function renderDataTable(container, {
  stateKey, rows, rowHtml, headHtml, colSpan, keyword, facets, pageSize, emptyMessage, countUnit,
} = {}) {
  const cfg = {
    rows: Array.isArray(rows) ? rows : [],
    rowHtml,
    table: { headHtml, colSpan: colSpan || 1 },
  };
  if (stateKey) cfg.stateKey = stateKey;
  if (keyword) cfg.keyword = keyword;
  if (facets) cfg.facets = facets;
  if (pageSize !== undefined) cfg.pageSize = pageSize;
  if (emptyMessage) cfg.emptyMessage = emptyMessage;
  if (countUnit) cfg.countUnit = countUnit;
  return renderFilteredList(container, cfg);
}
