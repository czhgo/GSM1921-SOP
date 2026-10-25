// role: [工程师]+[AI]
// entries/tabs/secretary/work-map-tab.js — 支书工作台·支部分工 tab（L4 支部工作地图，2026-09-03）
// 支书三重裁定落地：党建/党务二分取消、不设分类筐、平铺模块 + 按人 双视图。
// 2026-09-14 批次 35（支书裁定「矩阵推广到其它二元关系域」）：本页扩为三视图——
//   平铺模块（原卡视图，承载 desc/子项/产出完整信息）+ 按人 / 按项目（「人 × 工作项」宽表，二者互为转置）。
//   宽表默认「按人」（与全站考勤/考察宽表默认同口径）；矩阵一律走单一源 relation-matrix.js（勿自造 table/翻页/横向滚动）。
// 模块目录单一源 = core/domain/work-map.js（14 项既有工作形式；「三会一课」已于 2026-09-22 批次 145 按形式
//   拆为 4 个模块）；分工快照 = config.workforce（缺省按 SOP 责任人列）。
// M2（2026-09-03）：分工调整走支委会议题（panel = workforce-panel.js）——发起改派议题/跟踪表决/采纳生效。
// R5（2026-09-28 批次 220）：读（看分工：平铺模块 / 按人 / 按项目）与写（分工调整工具）
//   分区——**写侧默认折叠**（`_toolOpen`，同 group-progress `_progressOpen` 体例），首屏只留读侧；展开后功能一字不减。
// 2026-09-03 裁定沿用：本页禁 SVG 图标，类别/视图用文字与色点区分。

import { escHtml as esc } from '../../../core/base/utils.js?v=20261025a';
import { WORK_MAP_MODULES, ORG_SUBJECT_LABELS, isBranchOrgSubject } from '../../../core/domain/work-map.js?v=20261025a';
import { ROLE_LABELS } from '../../../core/domain/constants.js?v=20261025a';
import { AuthStore } from '../../../services/core/auth.js?v=20261025a';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../../services/branch/branch.js?v=20261025a';
import { getPersonName } from '../../../services/member/person.js?v=20261025a';
// 人×工作项矩阵单一源（2026-09-14 批次 35）：按人 / 按项目 互为转置，勿自造表格与翻页
import { renderRelationMatrix } from '../../../components/ui/relation-matrix.js?v=20261025a';
// 责任关系（2026-10-24 Task 4.4 改主从两栏）：左列 14 个模块（模块名 + 责任人）单屏可览、
// 右列选中模块的「责任角色 / 责任说明 / 停用·启用」。走原生 listbox 语义（非按钮族），
// 不再把 14 项塞进 5 列表格，也不再分页；空「操作」列与表前读法说明一并未删功能地退场。
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261025a';
// 空态单一源（一句说明 + 一个下一步），与全局概况 / 周期归档卡同形
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261025a';
// L4 M2（2026-09-03）：分工调整工具（发起支委会议题 / 跟踪 / 采纳生效），仅支书/副支书可见
import { mountWorkforcePanel } from './workforce-panel.js?v=20261025a';

// 2026-10-18 脏专项 Task 17：默认落「责任关系表」——14 项模块是 1:1 分派，
// 逐行读出「谁负责什么」比 14×N 的稀疏矩阵直接；矩阵（按人 / 按项目）保留为可选视图。
let _view = 'relations'; // 视图：责任关系表 / 平铺模块 / 按人 / 按项目（同一会话内保持）
// R5（2026-09-28 批次 220）：分工调整工具（写）默认折叠——本 tab 主问「每项工作归谁负责？」＝看分工（读），
//   分工调整（发起议题/跟踪/采纳）属「偶尔要用的工具」（判定＝一 tab 一问：「支部分工」混装读/写两件事，
//   写侧折叠为按钮；原 MODULE_UI_DESIGN.md §四 规划稿已清出，出处见 .ctx/logs/archive/2026-09-DECISION_LOG.md）。折叠体例照本仓既有 `_progressOpen`（group-progress-tab.js）：模块级布尔 + 卡片 + 单钮，
//   展开态才挂载工具（未展开不 load，减负首屏）；功能不删（展开后 DOM/事件一字不减）。
let _toolOpen = false;
// A14：停用项「发起启用议题」→ 打开分工调整面板并预选该模块（一次性消费）。
let _pendingReenableModule = null;
// 责任关系主从视图的选中模块（同一会话内保持；换视图再回来仍停在原项）
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

/** 主责是否为**上级组织**（如党委）——2026-09-30 批次 302 支书裁定：
 *  支部就是支部内务、不涉及党委 ⇒ 上级组织**不作为支部承担方**呈现（降级为中性「上级党委」标注）。 */
function _isSuperiorOwner(assign) {
  return !!assign && assign.ownerType === 'org' && !isBranchOrgSubject(assign.ownerId);
}

/** 视图 A：14 模块平铺卡（无分组、无泳道、无连线） */
function _modulesHtml(workforce) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      ${WORK_MAP_MODULES.map(m => {
        const assign = workforce[m.id];
        const superior = _isSuperiorOwner(assign);
        const ownerCls = superior
          ? 'bg-neutral-100 text-neutral-600'
          : (assign.ownerId === 'secretary' || assign.ownerId === 'deputy-secretary' || assign.ownerType === 'org' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700');
        const ownerText = superior ? `上级${_ownerLabel(assign)}` : _ownerLabel(assign);
        const ownerTitle = superior ? '非支部分工：该事项由上级组织主导（支部侧按上级渠道对接），故不占支部承担方位' : `负责人：${_ownerLabel(assign)}`;
        const chips = (m.sub || []).map(s => `
          <span class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">${esc(s)}</span>`).join('');
        const outputs = (m.outputs || []).map(o => `
          <span class="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">产出·${esc(o)}</span>`).join('');
        return `
        <div class="rounded-lg border border-gray-200 bg-white p-3.5 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <p class="font-title-cn text-sm font-bold text-gray-800">${esc(m.name)}</p>
            <span class="shrink-0 text-xs px-2 py-0.5 rounded-full ${ownerCls}" title="${esc(ownerTitle)}">${esc(ownerText)}</span>
          </div>
          ${chips ? `<div class="flex flex-wrap gap-1">${chips}</div>` : ''}
          <p class="text-xs text-gray-500 leading-5">${esc(m.desc)}</p>
          ${outputs ? `<div class="flex flex-wrap gap-1 mt-auto pt-1">${outputs}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

/** 视图 A0：责任关系表（14 项工作 → 责任人 / 责任角色 / 责任说明）——
 *  2026-10-18 脏专项 Task 17：原矩阵缺「责任角色 / 责任说明」列，读者只看得到「主责」标记，
 *  读不出「谁负责什么」；本表把同一份 `getBranchWorkforce` 快照逐项摊平（不改数据、不改权限）。 */
function _relationRows(workforce) {
  return WORK_MAP_MODULES.map((m) => {
    const assign = workforce[m.id];
    const superior = _isSuperiorOwner(assign);
    const disabled = !!assign && assign.ownerType === 'none';
    return {
      id: m.id,
      module: m.name,
      // A14：停用项不是「未指派」（那会让人以为是漏配）。明说「已停用 / 不开展」。
      owner: disabled ? _ownerLabel(assign) : (superior ? `上级${_ownerLabel(assign)}` : _ownerLabel(assign)),
      role: disabled ? '停用' : (superior ? '上级主导' : '主责'),
      note: disabled
        ? '本支部不开展该项工作方法；可由支书 / 副支书发起启用议题'
        : (superior ? '由上级组织主导，支部按上级渠道对接' : (m.desc || '')),
      disabled,
    };
  });
}

/** 右列详情：选中模块的责任角色、责任说明与停用项启用入口（非停用项无操作钮）。 */
function _relationDetailHtml(row, editable) {
  const roleCls = row.role === '主责' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-neutral-100 text-neutral-600';
  // A14：停用项的「发起启用议题」落点＝本页分工调整面板（复用既有写口，不新造表单）。
  const action = row.disabled
    ? (editable
      ? `<button type="button" class="btn-outline wm-reenable" data-module="${esc(row.id)}">发起启用议题</button>`
      : '<span class="text-xs text-gray-500">由支书 / 副支书发起启用议题</span>')
    : '';
  return `
    <h4 class="wm-detail__title text-sm font-semibold text-gray-800">${esc(row.module)}</h4>
    <dl class="mt-2 mb-0">
      <div class="wm-detail__row"><dt>责任角色</dt><dd><span class="text-xs px-1.5 py-0.5 rounded-full border ${roleCls}">${esc(row.role)}</span></dd></div>
      <div class="wm-detail__row"><dt>责任说明</dt><dd>${esc(row.note)}</dd></div>
    </dl>
    ${action ? `<div class="mt-2">${action}</div>` : ''}`;
}

/** 责任关系主从两栏：左列模块清单（role=listbox，单屏可览不分页），右列选中详情。 */
function _relationsCardHtml(rows, editable) {
  if (!rows.length) {
    return `<div class="card rounded-xl p-4" id="work-map-relations">
      ${renderCardHeader({ title: '责任关系' })}
      ${emptyStateHtml('暂无分工数据', {
        actionHtml: '<button type="button" class="btn-outline" data-wm-view="modules">先看平铺模块</button>',
      })}
    </div>`;
  }
  const selectedId = rows.some((r) => r.id === _selectedModule) ? _selectedModule : rows[0].id;
  _selectedModule = selectedId;
  const current = rows.find((r) => r.id === selectedId);
  return `<div class="card rounded-xl p-4" id="work-map-relations">
      ${renderCardHeader({ title: '责任关系', meta: `${rows.length} 项工作 · 一项一名主责` })}
      <div class="wm-split">
        <div class="wm-module-list" id="wm-module-list" role="listbox" aria-label="工作模块" tabindex="0" aria-activedescendant="wm-opt-${esc(selectedId)}">
          ${rows.map((r) => {
            const on = r.id === selectedId;
            return `<div id="wm-opt-${esc(r.id)}" class="wm-module-item${on ? ' is-selected' : ''}" role="option" aria-selected="${on ? 'true' : 'false'}" data-module="${esc(r.id)}">
              <span class="wm-module-item__name">${esc(r.module)}</span>
              <span class="wm-module-item__owner">${esc(r.owner)}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="wm-detail" id="wm-detail" role="region" aria-live="polite">${_relationDetailHtml(current, editable)}</div>
      </div>
    </div>`;
}

/** 主从视图键盘操作：↑/↓ 逐项、Home/End 首末；选中项常驻 aria-activedescendant。 */
function _bindRelations(rows, editable) {
  const list = document.getElementById('wm-module-list');
  const detail = document.getElementById('wm-detail');
  if (!list || !detail) return;
  const items = [...list.querySelectorAll('.wm-module-item')];
  if (!items.length) return;
  const select = (id) => {
    const item = items.find((it) => it.dataset.module === id);
    const row = rows.find((r) => r.id === id);
    if (!item || !row) return;
    _selectedModule = id;
    items.forEach((it) => {
      const on = it.dataset.module === id;
      it.classList.toggle('is-selected', on);
      it.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    list.setAttribute('aria-activedescendant', `wm-opt-${id}`);
    detail.innerHTML = _relationDetailHtml(row, editable);
    item.scrollIntoView({ block: 'nearest' });
  };
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.wm-module-item');
    if (item) select(item.dataset.module);
  });
  list.addEventListener('keydown', (e) => {
    const ids = items.map((it) => it.dataset.module);
    const idx = Math.max(0, ids.indexOf(_selectedModule));
    let next = idx;
    if (e.key === 'ArrowDown') next = Math.min(ids.length - 1, idx + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, idx - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    else return;
    e.preventDefault();
    select(ids[next]);
  });
}

/** 视图 B/C：人 × 工作项宽表（按人＝行=负责人、列=工作项；按项目＝转置，行=工作项、列=负责人） */
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
    mode: _view === 'items' ? 'byItem' : 'byPerson',
    persons,
    // 工作项维＝WORK_MAP_MODULES 模块目录原序（顺序即平铺视图 A 顺序，勿打乱）
    items: WORK_MAP_MODULES.map(m => ({ id: m.id, title: m.name, sub: (m.sub || []).join('·') })),
    // 列上限 0＝不限：工作项是本支部 14 项固定目录（有界，单一源 core/domain/work-map.js），
    // 不随年份累积，故不需要矩阵缺省的「最近 6 项」封顶
    colLimit: 0,
    cell: (personKey, moduleId) => {
      const assign = workforce[moduleId];
      // 命中该工作项负责人 → 「主责」徽标（朴素文本标记，本页禁 SVG）；否则 null → 组件渲染灰色「—」
      return `${assign.ownerType}:${assign.ownerId}` === personKey
        ? '<span class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">主责</span>'
        : null;
    },
    personLabel: '负责人',
    itemLabel: '工作项',
    emptyText: '无分工数据',
  });
}

/** R5：分工调整工具折叠壳（写侧）——首屏只留「看分工」（读侧：平铺模块 / 矩阵），
 *  点「展开分工调整工具」才挂载 workforce-panel（发起议题 / 跟踪 / 采纳）。
 *  逐块判据：① 平铺模块 ② 按人 / 按项目宽表 均答本 tab 主问「每项工作归谁负责」＝**读者要看的结论**（保留首屏）；
 *  ③ 分工调整（发起支委会议题 / 跟踪表决 / 采纳生效）＝**偶尔要用的工具**（写操作）⇒ 折叠（不删、不降功能）。 */
function _toolFoldHtml() {
  return `
    <div class="card rounded-xl p-4 mt-3" id="workforce-panel-card">
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
  if (!tc) return;
  if (tc.dataset.currentTab !== 'work-map') {
    tc.innerHTML = `<div id="work-map-root"></div>`;
    tc.dataset.currentTab = 'work-map';
  }
  const root = document.getElementById('work-map-root');
  if (!root) return;
  const me = AuthStore.getCurrentUser();
  const personId = me && (me.personId || me.id);
  const branchId = getBranchIdOfPerson(personId);
  const workforce = getBranchWorkforce(branchId); // 展开快照（缺省已兜底）
  // L4 M2：分工调整工具（发起议题 / 跟踪 / 采纳）——仅支书/副支书可见（分工 = 支部自治）
  const editable = me && (me.role === 'secretary' || me.role === 'deputy-secretary');

  // 视图分段＝`.btn-tab`（32px / 13px）＋ `.active` 单一源；不再在同排手写尺寸 / 边框 / 选中色。
  const switchBar = `
    <div class="flex items-center gap-2 mb-3">
      ${[
        { key: 'relations', label: '责任关系' },
        { key: 'modules', label: '平铺模块' },
        { key: 'persons', label: '按人' },
        { key: 'items', label: '按项目' },
      ].map(t => `
        <button type="button"
          class="btn-tab ov-sub-tab${_view === t.key ? ' active' : ''}"
          data-wm-view="${t.key}">${t.label}</button>`).join('')}
    </div>`;
  const relationRows = _relationRows(workforce);
  const body = _view === 'modules'
    ? _modulesHtml(workforce)
    : _view === 'relations'
      ? _relationsCardHtml(relationRows, editable)
      : `<div id="work-map-matrix"></div>`;

  // 说明后置（§10.5）：页面标题下不再压一段导语；分工口径放在主体与工具之后，全屏只留这一句。
  root.innerHTML = `${renderTabHeader({ title: '支部分工' })}${switchBar}${body}${editable ? _toolFoldHtml() : ''}<p class="text-xs text-gray-500 mt-3">分工由本支部自行调整，改派走支委会议题。</p>`;
  // 责任关系（主从两栏）/ 矩阵分别挂到各自宿主（_view → mode 映射在 _renderMatrix 内）
  if (_view === 'relations') _bindRelations(relationRows, editable);
  if (_view === 'persons' || _view === 'items') _renderMatrix(workforce);
  // 视图切换（纯排列切换，不换数据）；空态里的「先看平铺模块」同为 data-wm-view ⇒ 一并绑定
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
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .catch(e => console.error('[work-map] 分工调整面板渲染失败', e));
  }
}
