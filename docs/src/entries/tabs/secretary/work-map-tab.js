// role: [工程师]+[AI]
// entries/tabs/secretary/work-map-tab.js — 支书工作台·支部分工 tab（L4 支部工作地图，2026-09-03）
// 支书三重裁定落地：党建/党务二分取消、不设分类筐。
// 2026-09-14 批次 35（支书裁定「矩阵推广到其它二元关系域」）：本页扩为三视图——
//   平铺模块（原卡视图，承载 desc/子项/产出完整信息）+ 按人 / 按项目（「人 × 工作项」宽表，二者互为转置）。
//   宽表默认「按人」（与全站考勤/考察宽表默认同口径）；矩阵一律走单一源 relation-matrix.js（勿自造 table/翻页/横向滚动）。
// 2026-11-10 批次 540 波次 5（支书裁定「4 视图重叠」）：
//   · 视图收 2——责任关系（默认）/ 关系矩阵。按项目是「按人」的转置（同一份数据、同一问句），删除；
//     平铺模块的 desc / 子项 / 产出并入**选中行展开**，不再单占一套视图；
//   · 责任关系行 meta 拼「负责人 · 协作 · 产出」，协作方单一源＝`WORK_MAP_MODULES[].collaborators`（可缺省）；
//   · 关系矩阵降为折叠块（`details`，本视图内默认展开），不再是首屏并列主体；
//   · 页根改 `.stack-page`（页头→卡 24px 由骨架给），删工具卡与页脚的 `mt-3` 手写间距；
//   · 主责徽章改中性（主责是常态、不是状态），停用才用 warning。
// 2026-11-10 批次 541（前端美学 P1 · A-2/A-3）：
//   · 负责人进**行首徽章位**（原来是「主责」徽标），meta 只留「协作 · 产出」并单行截断 ⇒ 行高 64–80 回到 48；
//   · 常规行不再渲染「主责」徽标（主责是常态、不是状态）；只有停用（warning）与上级主导（中性）两种例外带徽标。
// 模块目录单一源 = core/domain/work-map.js（14 项既有工作形式；「三会一课」已于 2026-09-22 批次 145 按形式
//   拆为 4 个模块）；分工快照 = config.workforce（缺省按 SOP 责任人列）。
// M2（2026-09-03）：分工调整走支委会议题（panel = workforce-panel.js）——发起改派议题/跟踪表决/采纳生效。
// R5（2026-09-28 批次 220）：读（看分工）与写（分工调整工具）
//   分区——**写侧默认折叠**（`_toolOpen`，同 group-progress `_progressOpen` 体例），首屏只留读侧；展开后功能一字不减。
// 2026-09-03 裁定沿用：本页禁 SVG 图标，类别/视图用文字与色点区分。

import { escHtml as esc, smoothScroll } from '../../../core/base/utils.js?v=20261110b';
import { WORK_MAP_MODULES, ORG_SUBJECT_LABELS, isBranchOrgSubject } from '../../../core/domain/work-map.js?v=20261110b';
import { ROLE_LABELS } from '../../../core/domain/constants.js?v=20261110b';
import { AuthStore } from '../../../services/core/auth.js?v=20261110b';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../../services/branch/branch.js?v=20261110b';
import { getPersonName } from '../../../services/member/person.js?v=20261110b';
// 人×工作项矩阵单一源（2026-09-14 批次 35）：按人 / 按项目 互为转置，勿自造表格与翻页
import { renderRelationMatrix } from '../../../components/ui/relation-matrix.js?v=20261110b';
// 行载体与分隔线一律走 list-row.js（master 行）+ .list-group；数据口径与权限不变。
import { listGroupHtml, listRowHtml } from '../../../components/ui/list-row.js?v=20261110b';
// 责任关系（2026-11-09 批次 539 改单列对象列表）：14 个模块逐行摊平，每行＝角色徽章 +
// 工作项（14/600）+ 负责人（12）+ 一行截断说明（title 全文）；停用项行尾「发起启用议题」。
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261110b';
// 空态单一源（一句说明 + 一个下一步），与全局概况 / 周期归档卡同形
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261110b';
// L4 M2（2026-09-03）：分工调整工具（发起支委会议题 / 跟踪 / 采纳生效），仅支书/副支书可见
import { mountWorkforcePanel } from './workforce-panel.js?v=20261110b';

// 2026-10-18 脏专项 Task 17：默认落「责任关系表」——14 项模块是 1:1 分派，
// 逐行读出「谁负责什么」比 14×N 的稀疏矩阵直接；矩阵保留为可选视图。
// 2026-11-10 批次 540 波次 5：视图 4 → 2（relations / matrix），`items`（按项目，矩阵转置）与
//   `modules`（平铺模块，内容并入行展开）退场。
let _view = 'relations'; // 视图：责任关系 / 关系矩阵（同一会话内保持）
// R5（2026-09-28 批次 220）：分工调整工具（写）默认折叠——本 tab 主问「每项工作归谁负责？」＝看分工（读），
//   分工调整（发起议题/跟踪/采纳）属「偶尔要用的工具」（判定＝一 tab 一问：「支部分工」混装读/写两件事，
//   写侧折叠为按钮；原 MODULE_UI_DESIGN.md §四 规划稿已清出，出处见 .ctx/logs/archive/2026-09-DECISION_LOG.md）。折叠体例照本仓既有 `_progressOpen`（group-progress-tab.js）：模块级布尔 + 卡片 + 单钮，
//   展开态才挂载工具（未展开不 load，减负首屏）；功能不删（展开后 DOM/事件一字不减）。
let _toolOpen = false;
// A14：停用项「发起启用议题」→ 打开分工调整面板并预选该模块（一次性消费）。
let _pendingReenableModule = null;
// 责任关系单列列表的选中项（同一会话内保持；≤640 时选中项展开整段说明）
let _selectedModule = null;

/** 负责人显示名：role → ROLE_LABELS；person → 姓名；org → 组织型主体名（如支委会，不是自然人） */
function _ownerLabel(assign) {
  if (!assign) return '未分工';
  // A14：停用项不是「未指派」——明示「已停用 / 不开展」（模块卡 / 矩阵 / 责任关系表共用本函数）。
  if (assign.ownerType === 'none') return '已停用 / 不开展';
  if (assign.ownerType === 'person') return getPersonName(assign.ownerId) || assign.ownerId;
  if (assign.ownerType === 'org') return ORG_SUBJECT_LABELS[assign.ownerId] || assign.ownerId;
  return ROLE_LABELS[assign.ownerId] || assign.ownerId;
}

/** 协作主体引用 → 显示名（角色键 / 组织型主体 id）；未登记返回原值 */
function _subjectLabel(subjectId) {
  if (!subjectId) return '';
  return ORG_SUBJECT_LABELS[subjectId] || ROLE_LABELS[subjectId] || subjectId;
}

/** 主责是否为**上级组织**（如党委）——2026-09-30 批次 302 支书裁定：
 *  支部就是支部内务、不涉及党委 ⇒ 上级组织**不作为支部承担方**呈现（降级为中性「上级党委」标注）。 */
function _isSuperiorOwner(assign) {
  return !!assign && assign.ownerType === 'org' && !isBranchOrgSubject(assign.ownerId);
}

/** 责任关系行数据（14 项工作 → 责任人 / 责任角色 / 责任说明 / 协作 / 产出）——
 *  2026-10-18 脏专项 Task 17：原矩阵缺「责任角色 / 责任说明」列，读者只看得到「主责」标记，
 *  读不出「谁负责什么」；本表把同一份 `getBranchWorkforce` 快照逐项摊平（不改数据、不改权限）。
 *  2026-11-10 批次 541：负责人进徽章位，meta 只留「协作 · 产出」；说明不再进 meta（行高回到 48）。 */
function _relationRows(workforce) {
  return WORK_MAP_MODULES.map((m) => {
    const assign = workforce[m.id];
    const superior = _isSuperiorOwner(assign);
    const disabled = !!assign && assign.ownerType === 'none';
    const collaborators = (m.collaborators || []).map(_subjectLabel).filter(Boolean);
    const outputs = (m.outputs || []).slice();
    // A14：停用项不是「未指派」（那会让人以为是漏配）。明说「已停用 / 不开展」。
    const owner = disabled ? _ownerLabel(assign) : (superior ? `上级${_ownerLabel(assign)}` : _ownerLabel(assign));
    const meta = [
      collaborators.length ? `协作：${collaborators.join('、')}` : '',
      outputs.length ? `产出：${outputs.join('、')}` : '',
    ].filter(Boolean).join(' · ');
    return {
      id: m.id,
      module: m.name,
      owner,
      role: disabled ? '停用' : (superior ? '上级主导' : '主责'),
      note: disabled
        ? '本支部不开展该项工作方法；可由支书 / 副支书发起启用议题'
        : (superior ? '由上级组织主导，支部按上级渠道对接' : (m.desc || '')),
      meta,
      collaborators,
      outputs,
      sub: (m.sub || []).slice(),
      disabled,
    };
  });
}

/** 行首徽章（责任人位）：常规行只出负责人名（中性）；停用 / 上级主导两个例外再带一枚例外徽标。
 *  2026-11-10 批次 541：常规行不再渲染「主责」——主责是常态、不是状态；例外才需要态标。
 *  本页禁 SVG，只用文字 + 既有 .badge 档。 */
function _ownerBadgeHtml(row) {
  if (row.disabled) return `<span class="badge badge--warning">停用</span>`;
  const owner = `<span class="badge badge--neutral">${esc(row.owner)}</span>`;
  if (row.role !== '上级主导') return owner;
  return `<span class="flex items-center gap-1 flex-wrap">${owner}<span class="badge badge--neutral">上级主导</span></span>`;
}

/** 单行对象行：负责人徽章 + 工作项（14/600）+ 协作 / 产出（12，同行截断）；说明只进 title 与展开块。
 *  停用项行尾「发起启用议题」（写口仍是既有分工调整面板）；非停用项无操作钮。
 *  2026-11-10 批次 541：说明不再进行内（选中行紧随其后的展开块给全文）⇒ 行高由 64–80 回到 48。 */
function _relationRowHtml(row, selected, editable) {
  // A14：停用项的「发起启用议题」落点＝本页分工调整面板（复用既有写口，不新造表单）。
  const action = row.disabled
    ? (editable
      ? `<button type="button" class="btn-action wm-reenable" data-module="${esc(row.id)}">发起启用议题</button>`
      : '<span class="wm-row__hint">由支书 / 副支书发起启用</span>')
    : '';
  return listRowHtml({
    rowType: 'master',
    className: 'wm-row',
    leading: _ownerBadgeHtml(row),
    title: row.module,
    meta: row.meta,
    trailing: action,
    dataAttrs: {
      'data-module': row.id,
      'data-selected': selected ? 'true' : 'false',
      title: row.note,
    },
  });
}

/** 选中行展开：整段责任说明 + 子项 / 产出标签（原「平铺模块」承载的信息，2026-11-10 批次 540 波次 5 并入）。
 *  与行同处一个 list-group：行间仍是同一条 hairline，不新增第二套行容器。 */
function _relationDetailHtml(row) {
  const chips = row.sub.map((s) => `<span class="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">${esc(s)}</span>`).join('');
  const outputs = row.outputs.map((o) => `<span class="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">产出·${esc(o)}</span>`).join('');
  const tags = [chips, outputs].filter(Boolean).join('');
  return `<div class="px-4 pb-3 pt-0 text-body-sm" data-wm-expanded="${esc(row.id)}">
    <p class="text-gray-700 whitespace-normal">${esc(row.note)}</p>
    ${tags ? `<div class="flex flex-wrap gap-1 mt-1.5">${tags}</div>` : ''}
  </div>`;
}

/** 责任关系单列列表：14 项工作逐行摊平（不分页、不内滚），行尾只在停用项给启用入口；
 *  选中项紧随其后展开整段说明（≤640 的 CSS 同时把行内说明放开，两种宽度都能读全文）。 */
function _relationsCardHtml(rows, editable) {
  const head = renderCardHeader({
    title: '分工清单',
    meta: `${rows.length} 项 · 一项一名主责`,
  });
  if (!rows.length) {
    return `<div class="card rounded-xl card-standard" id="work-map-relations">
      ${head}
      ${emptyStateHtml('暂无分工数据', {
        actionHtml: '<button type="button" class="btn-outline" data-wm-view="matrix">先看关系矩阵</button>',
      })}
    </div>`;
  }
  const selectedId = rows.some((r) => r.id === _selectedModule) ? _selectedModule : null;
  _selectedModule = selectedId;
  const rowHtml = [];
  for (const r of rows) {
    rowHtml.push(_relationRowHtml(r, r.id === selectedId, editable));
    if (r.id === selectedId) rowHtml.push(_relationDetailHtml(r));
  }
  return `<div class="card rounded-xl card-standard" id="work-map-relations">
      ${head}
      <div id="wm-module-list">
        ${listGroupHtml(rowHtml)}
      </div>
    </div>`;
}

/** 行交互：点 / Enter 选中（选中行紧随其后展开整段说明）；↑/↓ 逐项、Home/End 首末。
 *  master 行是 div[role=button]，行内按钮的点击 / 按键不连带改选中项。
 *  2026-11-10 批次 540 波次 5：选中从「只改 data-selected」改为重渲染——展开块由 `_relationDetailHtml` 产出，
 *  重渲染后焦点还给该行（键盘选中不丢位置）。 */
function _bindRelations() {
  const list = document.getElementById('wm-module-list');
  if (!list) return;
  if (!list.querySelector('.wm-row')) return;
  const rowsOf = () => [...list.querySelectorAll('.wm-row')];
  const select = (id) => {
    if (!id || id === _selectedModule) return;
    _selectedModule = id;
    renderContent();
    setTimeout(() => {
      document.querySelector(`.wm-row[data-module="${id}"]`)?.focus({ preventScroll: true });
    }, 0);
  };
  const focusAt = (idx) => {
    const items = rowsOf();
    items[Math.max(0, Math.min(items.length - 1, idx))]?.focus();
  };
  list.addEventListener('click', (e) => {
    if (e.target.closest('.wm-reenable')) return;
    const item = e.target.closest('.wm-row');
    if (item) select(item.dataset.module);
  });
  list.addEventListener('keydown', (e) => {
    if (e.target.closest('.wm-reenable')) return;
    const ids = rowsOf().map((it) => it.dataset.module);
    const idx = Math.max(0, ids.indexOf(_selectedModule));
    if (e.key === 'Enter' || e.key === ' ') {
      const item = e.target.closest('.wm-row');
      if (!item) return;
      e.preventDefault();
      select(item.dataset.module);
      return;
    }
    let next;
    if (e.key === 'ArrowDown') next = idx + 1;
    else if (e.key === 'ArrowUp') next = idx - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    else return;
    e.preventDefault();
    focusAt(next);
  });
}

/** 视图 B：人 × 工作项宽表（行＝负责人、列＝工作项）。
 *  2026-11-10 批次 540 波次 5：「按项目」是同一份矩阵的转置（同一问句的另一种排法）⇒ 删除，只保留按人。 */
function _renderMatrix(workforce) {
  const host = document.getElementById('work-map-matrix');
  if (!host) return;
  // 人维 = 负责人（独特集合，键 `role:xxx` / `person:pN` / `org:branch-committee`）；
  // **顺序＝支委会置顶，再支委层个人**（支书 2026-09-30 裁定「支委会置顶，再支委层个人」）：支委会是集体领导主体
  //   （类似法人，`ORG_SUBJECTS['branch-committee']`）⇒ 排在「支书 → 副支书 → 组织 → 宣传 → 纪检」这些**个人身份**之前；
  //   其余（党小组组长、到人负责人等）按 99 排后。
  const order = [
    'org:branch-committee',
    'role:secretary', 'role:deputy-secretary',
    'role:org-commissioner', 'role:prop-commissioner', 'role:disc-commissioner',
  ];
  const ownerMap = new Map();
  for (const m of WORK_MAP_MODULES) {
    const assign = workforce[m.id];
    // 停用项（ownerType:'none'）无负责人 → 不入人维（其工作项在矩阵中整列/整行渲染为「—」）；
    // 组织型主体（'org'，如支委会）**要入维**——它是承担方（不是人，但「谁负责」的答案可以是它）
    if (assign.ownerType !== 'role' && assign.ownerType !== 'person' && assign.ownerType !== 'org') continue;
    // 2026-09-30 批次 302（支书裁「我们支部就是支部内务，不涉及党委」）：**上级组织（党委）不入支部人维**
    //   ——支部内务视图不把它当作支部承担方；对象仍在 `ORG_SUBJECTS`（换届选举主责不变，见 work-map.js 注）。
    if (assign.ownerType === 'org' && !isBranchOrgSubject(assign.ownerId)) continue;
    const key = `${assign.ownerType}:${assign.ownerId}`;
    if (!ownerMap.has(key)) ownerMap.set(key, assign);
  }
  const persons = [...ownerMap.entries()]
    .sort((a, b) => {
      const ia = order.indexOf(a[0]); const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([id, assign]) => ({ id, name: _ownerLabel(assign) }));

  renderRelationMatrix(host, {
    stateKey: 'secretary-work-map-matrix',
    mode: 'byPerson',
    persons,
    // 工作项维＝WORK_MAP_MODULES 模块目录原序（顺序即模块目录顺序，勿打乱）
    items: WORK_MAP_MODULES.map(m => ({ id: m.id, title: m.name, sub: (m.sub || []).join('·') })),
    // 列上限 0＝不限：工作项是本支部 14 项固定目录（有界，单一源 core/domain/work-map.js），
    // 不随年份累积，故不需要矩阵缺省的「最近 6 项」封顶
    colLimit: 0,
    cell: (personKey, moduleId) => {
      const assign = workforce[moduleId];
      // 命中该工作项负责人 → 「主责」徽标（朴素文本标记，本页禁 SVG）；否则 null → 组件渲染灰色「—」。
      // 2026-11-10 批次 540 波次 5：主责徽标改中性（主责是常态，不是状态），与责任关系行同一口径。
      return `${assign.ownerType}:${assign.ownerId}` === personKey
        ? '<span class="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">主责</span>'
        : null;
    },
    personLabel: '负责人',
    itemLabel: '工作项',
    emptyText: '无分工数据',
  });
}

/** R5：分工调整工具折叠壳（写侧）——首屏只留「看分工」（读侧：责任关系 / 关系矩阵），
 *  点「展开分工调整工具」才挂载 workforce-panel（发起议题 / 跟踪 / 采纳）。
 *  逐块判据：① 责任关系清单 ② 关系矩阵（折叠） 均答本 tab 主问「每项工作归谁负责」＝**读者要看的结论**（保留首屏）；
 *  ③ 分工调整（发起支委会议题 / 跟踪表决 / 采纳生效）＝**偶尔要用的工具**（写操作）⇒ 折叠（不删、不降功能）。
 *  2026-11-10 批次 540 波次 5：卡间距交给 `.stack-page`（24px）⇒ 删去手写的 `mt-3`。 */
function _toolFoldHtml() {
  return `
    <div class="card rounded-xl p-4" id="workforce-panel-card">
      ${renderCardHeader({
        title: '分工调整工具',
        meta: '发起调整走支委会议题表决；跟踪与采纳亦在此',
        actions: `<button type="button" class="btn-outline wm-tool-toggle">${_toolOpen ? '收起' : '展开分工调整工具'}</button>`,
      })}
      ${_toolOpen ? '<div id="workforce-panel-host" class="mt-2"></div>' : ''}
    </div>`;
}

/** 渲染支部分工 tab（tab-bar 懒加载调用） */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) throw new Error('[work-map-tab] 缺少内容容器 #secretary-tab-content');
  if (tc.dataset.currentTab !== 'work-map') {
    tc.innerHTML = `<div id="work-map-root"></div>`;
    tc.dataset.currentTab = 'work-map';
  }
  const root = document.getElementById('work-map-root');
  if (!root) throw new Error('[work-map-tab] 缺少 #work-map-root');
  const me = AuthStore.getCurrentUser();
  const personId = me && (me.personId || me.id);
  const branchId = getBranchIdOfPerson(personId);
  const workforce = getBranchWorkforce(branchId); // 展开快照（缺省已兜底）
  // L4 M2：分工调整工具（发起议题 / 跟踪 / 采纳）——仅支书/副支书可见（分工 = 支部自治）
  const editable = me && (me.role === 'secretary' || me.role === 'deputy-secretary');

  // 视图分段＝`.btn-tab`（32px / 13px）＋ `.active` 单一源；不再在同排手写尺寸 / 边框 / 选中色。
  // 2026-10-31 支书补充：页头「标题在左、页签组在右」同行（原先页签独占下一行）。
  // 2026-11-10 批次 540 波次 5：4 → 2（责任关系 / 关系矩阵）。
  const switchBar = `
    <div class="flex items-center gap-2 flex-wrap" role="group" aria-label="支部分工视图">
      ${[
        { key: 'relations', label: '责任关系' },
        { key: 'matrix', label: '关系矩阵' },
      ].map(t => `
        <button type="button"
          class="btn-tab ov-sub-tab${_view === t.key ? ' active' : ''}"
          data-wm-view="${t.key}" aria-pressed="${_view === t.key ? 'true' : 'false'}">${t.label}</button>`).join('')}
    </div>`;
  const relationRows = _relationRows(workforce);
  // 关系矩阵＝折叠块（批次 540 波次 5）：折叠头走单一语法——卡内 H3（renderCardHeader）＋
  //   空的 summary（chevron 热区，`aria-labelledby` 关联 H3），不再自写一段 summary 文案
  //   （`.disclosure__summary` 是绝对定位的 40×40 热区，放文字会被裁掉）。
  const matrixCard = `<div class="card rounded-xl card-standard disclosure-host" id="work-map-matrix-card">
      ${renderCardHeader({
        title: '关系矩阵',
        titleId: 'wm-matrix-title',
        meta: `${relationRows.length} 项 · 行＝负责人，列＝工作项`,
      })}
      <details class="disclosure" id="work-map-matrix-fold"${_view === 'matrix' ? ' open' : ''}>
        <summary class="disclosure__summary" aria-labelledby="wm-matrix-title"></summary>
        <div class="disclosure__body"><div id="work-map-matrix"></div></div>
      </details>
    </div>`;
  const body = _view === 'matrix' ? matrixCard : _relationsCardHtml(relationRows, editable);

  // 说明后置（§10.5）：页面标题下不再压一段导语；分工口径放在主体与工具之后，全屏只留这一句。
  // 2026-11-10 批次 540 波次 5：页根改 `.stack-page`（页头 → 卡 24px 由骨架给），删页脚 `mt-3`。
  root.innerHTML = `<div class="stack-page" data-wm-view-current="${esc(_view)}">
    ${renderTabHeader({ title: '支部分工', actions: switchBar })}
    ${body}
    ${editable ? _toolFoldHtml() : ''}
    <p class="text-xs text-gray-500">分工由本支部自行调整，改派走支委会议题。</p>
  </div>`;
  // 责任关系（单列对象列表）/ 矩阵分别挂到各自宿主
  if (_view === 'relations') _bindRelations();
  if (_view === 'matrix') _renderMatrix(workforce);
  // 视图切换（纯排列切换，不换数据）；空态里的「先看关系矩阵」同为 data-wm-view ⇒ 一并绑定
  root.querySelectorAll('[data-wm-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      _view = btn.dataset.wmView;
      renderContent();
    });
  });
  // R5：分工调整工具折叠开关（默认折叠，展开才挂载；同 _progressOpen 体例）
  root.querySelector('.wm-tool-toggle')?.addEventListener('click', () => {
    _toolOpen = !_toolOpen;
    renderContent();
  });
  // A14：停用项行内「发起启用议题」——展开并预选该模块（写口仍是既有分工调整面板）。
  root.querySelector('#work-map-relations')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.wm-reenable');
    if (!btn) return;
    _pendingReenableModule = btn.dataset.module || null;
    _toolOpen = true;
    renderContent();
  });
  // 展开态才挂载工具（仅支书/副支书可见）
  if (editable && _toolOpen) {
    mountWorkforcePanel(branchId, root.querySelector('#workforce-panel-host'))
      .then(() => {
        if (!_pendingReenableModule) return;
        const mod = _pendingReenableModule;
        _pendingReenableModule = null;
        const host = root.querySelector('#workforce-panel-host');
        host?.querySelector('#wf-open')?.click();
        const row = host?.querySelector('.wf-row');
        if (row) {
          const sel = row.querySelector('.wf-module');
          if (sel) sel.value = mod;
          smoothScroll(row, { block: 'center' });
        }
      })
      .catch(e => console.error('[work-map] 分工调整面板渲染失败', e));
  }
}
