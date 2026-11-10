// role: [工程师]+[AI]
// data-table.js — 逐行对比数据表单一入口（2026-10-18 立；2026-11-10 批次 540 扩结构参数）
//
// 职责：把「行 HTML + 表头 / 列宽 + 检索 / 分页配置」交给统一检索引擎的表格模式，
//   页面不再自己拼 `<table>`、不再手写表头 / 行线 / 悬停 / 内边距类。
// 单一源关系：
//   · 渲染引擎 = components/ui/list-filter.js::renderFilteredList（table 模式）；
//   · 表格样式 = docs/src/styles.css 的 .data-table 段 + `.dt-*` 结构段；
//   · 翻页 = components/ui/pager.js（引擎内部调用）；
//   · 检索条阈值 = components/ui/filter-bar.js（行数 > 8 才出现）。
// 契约：content/04_web_design/contracts/TABLE_COMPONENT_CONTRACT.md（列宽三档 / 行高 / 横滚 /
//   首列吸附 / 列宽拖动 / 灰字分层）；守卫 = server/test/table-contract-guard.test.mjs。
// 结构类一律挂在引擎持有的 `.lf-list`（wrapper，跨内部重渲染不重建）上，**不挂 <table>**——
//   `<table>` 每次渲染都会重建，挂在上面的类与内联列宽会在关键词 / 分页变化后丢失。
// 采用口径：末列动作由 rowHtml 提供；不得在调用方另写 <table> 或表头内边距。
import { escHtml as esc } from '../../core/base/utils.js?v=20261110b';
import { renderFilteredList } from './list-filter.js?v=20261110b';

/** 列宽拖动持久化键前缀（契约 §五）：`table:cols:<key>` */
const LS_PREFIX = 'table:cols:';
/** 被拖动列的像素下限；其余列合计下限（保持列可读） */
const MIN_COL_PX = 64;
const MIN_OTHERS_PX = 48;
/** 拖动命中容差（鼠标距分界线的像素） */
const EDGE_TOL_PX = 6;

/**
 * 列宽三档解析（契约 §二）：数字＝百分比点数；`'18%'`＝百分比；`'92px'`＝像素；
 * `'1fr'`＝余量列（该列留给浏览器补剩余宽度，即唯一截断列）。
 * @param {Array} columns
 * @returns {string[]|null} 与列一一对应的宽度串（余量列为空串）；任一列缺宽度 ⇒ null（「内容 auto」档）
 */
function _resolveWidths(columns) {
  const cols = Array.isArray(columns) ? columns.filter(Boolean) : [];
  if (!cols.length) return null;
  const raw = cols.map((col) => {
    const w = col.width;
    return w === undefined || w === null || w === '' ? null : w;
  });
  const isFlex = (w) => w === '1fr' || w === 'auto';
  const flexCount = raw.filter(isFlex).length;
  // 余量列最多一列：两列 1fr 会让「谁吃余量」变得不可预测
  if (flexCount > 1) throw new Error(`[data-table] 一张表只允许一列 1fr（余量列），实得 ${flexCount} 列`);
  if (raw.some((w) => w === null)) return null;
  if (flexCount === 1) {
    return raw.map((w) => (isFlex(w) ? '' : (typeof w === 'number' ? `${w}%` : String(w).trim())));
  }
  const asPercent = raw.map((w) => {
    if (typeof w === 'number') return w;
    const s = String(w).trim();
    return s.endsWith('%') ? Number.parseFloat(s) : null;
  });
  // 全部为百分比 ⇒ 归一化到 100%（列宽合计不足 / 超额时不得把余量塞给末列）
  if (asPercent.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) {
    const total = asPercent.reduce((a, b) => a + b, 0);
    return asPercent.map((v) => `${((v / total) * 100).toFixed(3)}%`);
  }
  return raw.map((w) => (typeof w === 'number' ? `${w}%` : String(w).trim()));
}

/** 截断列计数（契约 §二：全表只许一列截断；第二列声明即抛错，不做静默让步） */
function _assertSingleTruncate(columns) {
  const cols = Array.isArray(columns) ? columns : [];
  const n = cols.filter((col) => col && col.truncate).length;
  if (n > 1) throw new Error(`[data-table] 一张表只允许一列截断（truncate: true），实得 ${n} 列`);
  return cols;
}

/**
 * 生成列宽模板（固定 colgroup 档）。
 * @param {Array<{width?:number|string}>} columns
 * @returns {string} `<colgroup>…</colgroup>`（余量列输出不带 width 的 `<col>`）；
 *   任一列缺宽度时返回空串（内容 auto 档）
 */
export function tableColgroupHtml(columns) {
  const widths = _resolveWidths(columns);
  if (!widths) return '';
  return `<colgroup>${widths.map((w) => (w ? `<col style="width:${esc(w)}">` : '<col>')).join('')}</colgroup>`;
}

/**
 * 生成表头行。
 * @param {Array<{label:string, className?:string, numeric?:boolean, truncate?:boolean}>} columns
 * @returns {string} `<tr><th>…</th></tr>`
 */
export function tableHeadHtml(columns) {
  const cols = _assertSingleTruncate(columns);
  return `<tr>${cols.map((col) => {
    const label = col && col.label != null ? col.label : '';
    const cls = [col && col.className, col && col.numeric ? 'is-numeric' : '', col && col.truncate ? 'is-truncate' : '']
      .filter(Boolean).join(' ');
    const clsAttr = cls ? ` class="${esc(cls)}"` : '';
    return `<th scope="col"${clsAttr}>${esc(label)}</th>`;
  }).join('')}</tr>`;
}

/**
 * 渲染数据表（统一检索引擎 table 模式）。
 * @param {HTMLElement} container 挂载容器
 * @param {Object} cfg
 * @param {string} [cfg.stateKey] 状态保持键（同时作为列宽拖动的存储键，见 colsKey）
 * @param {Array} cfg.rows 数据集
 * @param {Function} cfg.rowHtml (item, index) => `<tr>…</tr>`
 * @param {Array} [cfg.columns] 列声明（`{label, width, numeric, truncate}`）：声明即产出
 *   `<colgroup>` 百分比模板 + `.data-table--fixed`；与 headHtml 二选一
 * @param {string} [cfg.headHtml] 表头（用 tableHeadHtml 生成；传 columns 时忽略）
 * @param {number} [cfg.colSpan] 空态行跨列数（缺省 = columns.length）
 * @param {Object} [cfg.keyword] 关键词配置
 * @param {Array} [cfg.facets] 分面配置
 * @param {number} [cfg.pageSize] 每页条数（缺省 10；0 = 不分页）
 * @param {number} [cfg.minRows] 检索条 / 计数行出现门槛（缺省 = 引擎单一源 SEARCH_FILTER_MIN_ROWS）；
 *   页内已有卡头计数时传 `Infinity`，保证「计数只此一处」
 * @param {string} [cfg.emptyMessage] 空态文案
 * @param {string} [cfg.countUnit] 计数单位
 * @param {boolean} [cfg.responsive] 窄屏卡式行（≤640px 时表体转「标签：值」卡片；缺省 false）
 * @param {'default'|'compact'} [cfg.density] 行高档：缺省 40px；compact = 32px（多行台账）
 * @param {boolean} [cfg.stickyFirstCol] 首列吸附（契约 §四：≥5 列宽表）
 * @param {boolean|{minWidth?:string}} [cfg.scroll] 横滚容器（`.dt-scroll`）；对象形态给表最小宽
 * @param {boolean} [cfg.resizable] 列宽拖动（仅 ≥1024px；需 columns + colsKey）
 * @param {string} [cfg.colsKey] 列宽存储键（缺省 stateKey；二者皆无则不开拖动）
 * @returns {Object} renderFilteredList 的句柄（visible / state / apply / update）
 */
export function renderDataTable(container, {
  stateKey, rows, rowHtml, columns, headHtml, colSpan, keyword, facets, pageSize, minRows,
  emptyMessage, countUnit, responsive, density, stickyFirstCol, scroll, resizable, colsKey,
} = {}) {
  const cols = Array.isArray(columns) && columns.length ? _assertSingleTruncate(columns) : null;
  const cfg = {
    rows: Array.isArray(rows) ? rows : [],
    rowHtml,
    table: {
      headHtml: headHtml || (cols ? tableHeadHtml(cols) : ''),
      colSpan: colSpan || (cols ? cols.length : 1),
    },
  };
  if (cols) {
    cfg.table.colgroupHtml = tableColgroupHtml(cols);
    cfg.table.className = 'data-table--fixed';
  }
  if (responsive) cfg.table.responsive = true;
  if (stateKey) cfg.stateKey = stateKey;
  if (keyword) cfg.keyword = keyword;
  if (facets) cfg.facets = facets;
  if (pageSize !== undefined) cfg.pageSize = pageSize;
  if (minRows !== undefined) cfg.minRows = minRows;
  if (emptyMessage) cfg.emptyMessage = emptyMessage;
  if (countUnit) cfg.countUnit = countUnit;
  const handle = renderFilteredList(container, cfg);
  _decorateTable(container, {
    density,
    stickyFirstCol,
    scroll,
    resizable,
    colsKey: colsKey || stateKey || '',
    columnCount: cols ? cols.length : 0,
  });
  return handle;
}

/** 结构类挂到引擎持有的 wrapper（`.lf-list`）上，跨内部重渲染保留 */
function _decorateTable(container, opt) {
  if (!container || typeof container.querySelector !== 'function') return null;
  const listEl = container.querySelector('.lf-list');
  if (!listEl) return null;
  if (opt.scroll) {
    listEl.classList.add('dt-scroll');
    const minWidth = opt.scroll && typeof opt.scroll === 'object' ? opt.scroll.minWidth : '';
    if (minWidth) listEl.style.setProperty('--dt-min-width', String(minWidth));
  }
  if (opt.stickyFirstCol) listEl.classList.add('dt--sticky-first');
  if (opt.density === 'compact') listEl.classList.add('dt--compact');
  if (opt.resizable && opt.columnCount >= 2 && opt.colsKey) _mountColumnResize(listEl, opt.colsKey);
  return listEl;
}

// ════════════════════════════════════════════════════════════════
//  列宽拖动（契约 §五）：仅 ≥1024px；只认首列右分界与末列左分界；存 localStorage
// ════════════════════════════════════════════════════════════════
function _mountColumnResize(listEl, key) {
  listEl.classList.add('dt--resizable');
  _applyStoredWidths(listEl, key);
  if (listEl.dataset.dtResizeBound === '1') return;
  listEl.dataset.dtResizeBound = '1';
  // 引擎内部重绘（关键词 / 分面 / 翻页）会重建 <col>，存盘列宽须在每次重绘后落回
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => _applyStoredWidths(listEl, key)).observe(listEl, { childList: true });
  }
  listEl.addEventListener('pointerdown', (e) => _startResize(listEl, key, e));
}

function _applyStoredWidths(listEl, key) {
  const stored = _readStoredWidths(key);
  if (!stored) return;
  const cols = [...listEl.querySelectorAll('table > colgroup > col')];
  if (cols.length !== stored.length) return;
  cols.forEach((col, i) => { col.style.width = `${stored[i]}%`; });
}

function _readStoredWidths(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length < 2) return null;
    if (!arr.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) return null;
    return arr;
  } catch (_) {
    return null;
  }
}

function _writeStoredWidths(key, widths) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(widths));
  } catch (_) { /* 隐私模式 / 配额满：拖动仍生效，只是不跨会话记忆 */ }
}

/** 命中哪个拖动位：0 = 首列右分界；n-1 = 末列左分界；null = 未命中 */
function _edgeColumn(ths, x) {
  const first = ths[0].getBoundingClientRect();
  const last = ths[ths.length - 1].getBoundingClientRect();
  const dRight = Math.abs(x - first.right);
  const dLeft = Math.abs(x - last.left);
  if (dRight <= EDGE_TOL_PX && dRight <= dLeft) return 0;
  if (dLeft <= EDGE_TOL_PX) return ths.length - 1;
  return null;
}

/** 宽度再分配：被拖列按 dx 增减，其余列按比例吃差额（合计恒定，表格不撑破容器） */
function _redistributeWidths(widths, idx, dx) {
  const n = widths.length;
  const total = widths.reduce((a, b) => a + b, 0);
  if (!total) return widths.slice();
  const lower = MIN_COL_PX;
  const upper = Math.max(lower, total - MIN_OTHERS_PX * (n - 1));
  const target = Math.min(Math.max(widths[idx] + dx, lower), upper);
  const rest0 = total - widths[idx];
  const rest1 = total - target;
  const k = rest0 > 0 ? rest1 / rest0 : 1;
  return widths.map((w, i) => (i === idx ? target : w * k));
}

function _startResize(listEl, key, e) {
  if (e.button !== 0 || typeof window === 'undefined') return;
  // 契约 §五：仅 ≥1024px 生效；390 既不写 DOM 也不读存储
  if (typeof window.matchMedia !== 'function' || !window.matchMedia('(min-width: 1024px)').matches) return;
  const table = listEl.querySelector('table');
  if (!table) return;
  const ths = [...table.querySelectorAll('thead th')];
  const cols = [...table.querySelectorAll('colgroup > col')];
  if (ths.length < 2 || cols.length !== ths.length) return;
  const idx = _edgeColumn(ths, e.clientX);
  if (idx === null) return;
  e.preventDefault();
  const startX = e.clientX;
  const widths = ths.map((th) => th.getBoundingClientRect().width);
  const total = widths.reduce((a, b) => a + b, 0);
  if (!total) return;
  const prevCursor = document.body.style.cursor;
  document.body.style.cursor = 'col-resize';
  const onMove = (ev) => {
    const next = _redistributeWidths(widths, idx, ev.clientX - startX);
    cols.forEach((col, i) => { col.style.width = `${((next[i] / total) * 100).toFixed(3)}%`; });
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.body.style.cursor = prevCursor;
    _writeStoredWidths(key, cols.map((col) => Number(Number.parseFloat(col.style.width).toFixed(3))));
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp, { once: true });
}
