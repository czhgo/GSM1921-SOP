// relation-matrix.js — 「人 × 项目」二元关系矩阵（单一源）
//
// 口径：
//   · 两个正交视图互为**转置**：byPerson（行＝人，列＝项目）/ byItem（行＝项目，列＝人）——同一份数据、同一口径，
//     不是「两种表」。切换只换视角，不改数据。
//   · **项目维列上限**：项目（活动/专班/工作项）随年份无限累积 → 列必须封顶（缺省最近 6 项），
//     可一键「显示全部 N 项」；行维保持全量 + 横向滚动 + 首列吸附。
//   · **人维分页**：人维按页渲染（缺省每页 10 人），翻页控件走统一检索引擎的 `pagerHtml` **单一源**
//     （勿另写翻页标记）；人维无论落在行（byPerson）还是列（byItem）都按同一页切片。
//   · 视图与「是否展开全部列」按 stateKey 持久（跨重渲染不丢，与统一检索引擎同一状态纪律）。
//   · 载体单一源：表格用 .data-table；切换/展开钮用 .lf-btn；不为矩阵新造一套样式（styles.css 是禁改文件）。
//   · **窄屏（≤640px）＝同一关系行的响应式形态**：仍是这一张表，只是每行按「行表头（人/项目）＋
//     逐列 `data-label` 值」堆叠成卡；不新造第二套矩阵、不改 cell 口径。与引擎表共用 styles.css 的
//     `[data-responsive="cards"]` 一套规则（thead 隐藏、sticky/min-width 清零）。
import { escHtml as esc } from '../../core/base/utils.js?v=20261028a';
// 翻页控件单一源（批次 38）：矩阵的人维分页与统一检索引擎共用同一套 .page-btn / .page-num 标记
// （叶子件 pager.js——不经 list-filter 引入，避免 list-filter→inspector→vote-summary-panel 与本节成环）
import { pagerHtml } from './pager.js?v=20261028a';

/** 项目维缺省列上限（最近 N 项） */
export const MATRIX_COL_LIMIT = 6;

/** 人维缺省每页人数（批次 38：人维一并分页，与统一检索引擎同档 10） */
export const MATRIX_ROW_LIMIT = 10;

const _states = new Map();
function _stateOf(key) {
  if (!_states.has(key)) _states.set(key, { mode: 'byPerson', showAll: false, page: 1 });
  return _states.get(key);
}

/**
 * 渲染人×项目矩阵（互为转置的双视图）
 * @param {HTMLElement} host 容器
 * @param {object} cfg
 * @param {string} cfg.stateKey 状态键（视图 + 列展开跨重渲染保持）
 * @param {'byPerson'|'byItem'} [cfg.mode] 强制视图（不传则用记忆值，默认 byPerson）
 * @param {Array<{id:string,name:string}>} cfg.persons 人维（行/列，全量）
 * @param {Array<{id:string,title:string,sub?:string}>} cfg.items 项目维（**须按时间倒序传入**，列的先后＝新旧）
 * @param {(personId:string, itemId:string) => (string|null)} cfg.cell 单元格内容（HTML 片段；返回假值＝空格）
 * @param {(personId:string, itemId:string) => string} [cfg.cellClass] 单元格 `<td>` 附加类（如表态矩阵的「异议」红底、「未投」灰字）
 * @param {number} [cfg.colLimit] 项目维列上限（0 = 不限；缺省 MATRIX_COL_LIMIT）
 * @param {number} [cfg.rowLimit] 人维每页人数（0 = 不分页；缺省 MATRIX_ROW_LIMIT）
 * @param {string} [cfg.personLabel] 人维表头（缺省「姓名」）
 * @param {string} [cfg.itemLabel] 项目维表头（缺省「项目」）
 * @param {string} [cfg.personUnit] 人维计数单位（缺省「人」）
 * @param {string} [cfg.emptyText] 空态文案
 * @param {string} [cfg.hintText] 列上限提示（缺省内置文案）
 * @param {string} [cfg.headTitle] 首列表头悬浮说明（**非自明的图例**放这里，别再在表外加说明段——2026-09-29 批次 295）
 * @returns {{state:object}} 便于调用方读状态（如导出「所见即所得」）
 */
export function renderRelationMatrix(host, cfg) {
  if (!host) return null;
  const st = _stateOf(cfg.stateKey);
  if (cfg.mode) st.mode = cfg.mode;
  const colLimit = cfg.colLimit === undefined ? MATRIX_COL_LIMIT : cfg.colLimit;
  const rowLimit = cfg.rowLimit === undefined ? MATRIX_ROW_LIMIT : cfg.rowLimit;
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  const persons = Array.isArray(cfg.persons) ? cfg.persons : [];
  const cell = typeof cfg.cell === 'function' ? cfg.cell : () => null;
  const cellClass = typeof cfg.cellClass === 'function' ? cfg.cellClass : () => '';
  const cellOf = (pid, iid, label) => {
    const html = cell(pid, iid);
    const extra = cellClass(pid, iid) || '';
    const cls = extra ? ` ${extra}` : '';
    // data-label＝该列在当前视图里的维度名（byPerson＝项目名 / byItem＝姓名）：
    // 窄屏堆叠时由 styles.css 的 td::before 显示，桌面不参与布局。
    const lab = label ? ` data-label="${esc(label)}" title="${esc(label)}"` : '';
    return html
      ? `<td class="text-center${cls}"${lab}>${html}</td>`
      : `<td class="text-center text-gray-400${cls}"${lab}>—</td>`;
  };

  const overLimit = colLimit > 0 && items.length > colLimit;
  const cols = overLimit && !st.showAll ? items.slice(0, colLimit) : items;
  const byPerson = st.mode !== 'byItem';

  // 人维分页（批次 38）：人维无论落在行（byPerson）还是列（byItem），一律按同一页切片
  const pages = rowLimit > 0 ? Math.max(1, Math.ceil(persons.length / rowLimit)) : 1;
  st.page = Math.min(Math.max(1, Number(st.page) || 1), pages);
  const pagePersons = rowLimit > 0
    ? persons.slice((st.page - 1) * rowLimit, st.page * rowLimit)
    : persons;
  const pager = pagerHtml({
    page: st.page, pages, total: persons.length, unit: cfg.personUnit || '人',
  });

  // 项目维两行表头（标题 + 日期/类型），宽表列窄，标题截断并留 title 悬浮全文
  const itemTh = (it) => `<th scope="col" class="text-center align-top max-w-[112px] whitespace-nowrap">
      <div class="truncate" title="${esc(it.title)}">${esc(it.title)}</div>
      ${it.sub ? `<div class="text-xs text-gray-500 font-normal">${esc(it.sub)}</div>` : ''}
    </th>`;
  const itemRowHead = (it) => `<th scope="row" class="sticky left-0 bg-white" style="color:#1F2937">
      <div class="font-medium text-gray-800 max-w-[180px] truncate" title="${esc(it.title)}">${esc(it.title)}</div>
      ${it.sub ? `<div class="text-xs text-gray-500">${esc(it.sub)}</div>` : ''}
    </th>`;

  // 2026-09-29 批次 295（支书评议「**为什么每一列这么宽？这么写着不占地方吗？**」）：
  //   根因＝`.data-table{width:100%}` ⇒ 列数少时每列被**拉伸填满**（格子只有徽标/「—」，信息量远小于列宽）。
  //   修＝矩阵改挂 `.rm-table`（`.data-table.rm-table{width:auto}` ＋ 横向内边距收窄 ⇒ **列按内容定宽**）。
  const headAttr = cfg.headTitle ? ` title="${esc(cfg.headTitle)}"` : '';
  const headRow = byPerson
    ? `<th scope="col" class="sticky left-0"${headAttr}>${esc(cfg.personLabel || '姓名')}</th>${cols.map(itemTh).join('')}`
    : `<th scope="col" class="sticky left-0 align-top"${headAttr}>${esc(cfg.itemLabel || '项目')}</th>${pagePersons.map(p => `<th scope="col" class="text-center whitespace-nowrap">${esc(p.name)}</th>`).join('')}`;

  const body = byPerson
    ? pagePersons.map(p => `<tr>
        <th scope="row" class="font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white" style="color:#1F2937">${esc(p.name)}</th>
        ${cols.map(it => cellOf(p.id, it.id, it.title)).join('')}
      </tr>`).join('')
    : cols.map(it => `<tr>
        ${itemRowHead(it)}
        ${pagePersons.map(p => cellOf(p.id, it.id, p.name)).join('')}
      </tr>`).join('');

  const span = 1 + (byPerson ? cols.length : pagePersons.length);
  const empty = `<tr class="is-empty"><td class="is-empty" colspan="${span}">${esc(cfg.emptyText || '无匹配数据（请调整筛选）')}</td></tr>`;

  const hint = cfg.hintText || (overLimit
    ? `列＝最近 ${colLimit} 项（按时间倒序）；用筛选可查看更早的项目`
    : '');

  host.innerHTML = `
    <div class="rm-root">
      ${(overLimit || hint) ? `
        <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
          <span class="text-xs text-gray-500">${esc(hint)}</span>
          ${overLimit ? `<button type="button" class="btn-tab lf-btn rm-toggle" data-rm-toggle="1" aria-expanded="${st.showAll ? 'true' : 'false'}" aria-controls="${esc(host.id || 'rm')}-table">
            ${st.showAll ? `只看最近 ${colLimit} 项` : `显示全部 ${items.length} 项`}
          </button>` : ''}
        </div>` : ''}
      <div class="rm-scroll overflow-x-auto max-h-[420px] overflow-y-auto" id="${esc(host.id || 'rm')}-table">
        <table class="data-table rm-table" data-responsive="cards">
          <caption class="visually-hidden">关系矩阵：行与列交叉单元格</caption>
          <thead><tr>${headRow}</tr></thead>
          <tbody>${body || empty}</tbody>
        </table>
      </div>
      <div class="rm-pager">${pager}</div>
    </div>`;

  host.querySelector('.rm-toggle')?.addEventListener('click', () => {
    st.showAll = !st.showAll;
    renderRelationMatrix(host, cfg);
  });
  // 人维翻页（控件标记由 pagerHtml 单一源产出；此处只换页码后整表重绘）
  host.querySelector('.rm-pager')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lf-page]');
    if (!btn || btn.disabled) return;
    st.page = Number(btn.dataset.lfPage) || 1;
    renderRelationMatrix(host, cfg);
  });
  return { state: st };
}
