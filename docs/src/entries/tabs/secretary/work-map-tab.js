// role: [工程师]+[AI]
// entries/tabs/secretary/work-map-tab.js — 支书工作台·支部分工 tab（L4 支部工作地图，2026-09-03）
// 支书三重裁定落地：党建/党务二分取消、不设分类筐、平铺模块 + 按人 双视图。
// 2026-09-14 批次 35（支书裁定「矩阵推广到其它二元关系域」）：本页扩为三视图——
//   平铺模块（原卡视图，承载 desc/子项/产出完整信息）+ 按人 / 按项目（「人 × 工作项」宽表，二者互为转置）。
//   宽表默认「按人」（与全站考勤/考察宽表默认同口径）；矩阵一律走单一源 relation-matrix.js（勿自造 table/翻页/横向滚动）。
// 模块目录单一源 = core/work-map.js（11 项既有工作形式）；分工快照 = config.workforce（缺省按 SOP 责任人列）。
// M2（2026-09-03）：分工调整走支委会议题（panel = workforce-panel.js）——发起改派议题/跟踪表决/采纳生效。
// 2026-09-03 裁定沿用：本页禁 SVG 图标，类别/视图用文字与色点区分。

import { escHtml as esc } from '../../../core/utils.js?v=20260915f';
import { WORK_MAP_MODULES } from '../../../core/work-map.js?v=20260915f';
import { ROLE_LABELS } from '../../../core/constants.js?v=20260915f';
import { AuthStore } from '../../../services/auth.js?v=20260915f';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../../services/branch.js?v=20260915f';
import { getPersonName } from '../../../services/person.js?v=20260915f';
// 人×工作项矩阵单一源（2026-09-14 批次 35）：按人 / 按项目 互为转置，勿自造表格与翻页
import { renderRelationMatrix } from '../../../components/relation-matrix.js?v=20260915f';
// L4 M2（2026-09-03）：分工调整工具（发起支委会议题 / 跟踪 / 采纳生效），仅支书/副支书可见
import { mountWorkforcePanel } from './workforce-panel.js?v=20260915f';

let _view = 'persons'; // 视图：平铺模块 / 按人 / 按项目（宽表默认「按人」；同一会话内保持）

/** 负责人显示名：role → ROLE_LABELS；person → 姓名 */
function _ownerLabel(assign) {
  if (!assign) return '未分工';
  if (assign.ownerType === 'person') return getPersonName(assign.ownerId) || assign.ownerId;
  return ROLE_LABELS[assign.ownerId] || assign.ownerId;
}

/** 视图 A：11 模块平铺卡（无分组、无泳道、无连线） */
function _modulesHtml(workforce) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      ${WORK_MAP_MODULES.map(m => {
        const assign = workforce[m.id];
        const chips = (m.sub || []).map(s => `
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">${esc(s)}</span>`).join('');
        const outputs = (m.outputs || []).map(o => `
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600" style="--acc-text-dark:#CBD5E1">产出·${esc(o)}</span>`).join('');
        return `
        <div class="rounded-lg border border-gray-200 bg-white p-3.5 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <p class="font-title-cn text-sm font-bold text-gray-800">${esc(m.name)}</p>
            <span class="shrink-0 text-[11px] px-2 py-0.5 rounded-full ${assign.ownerId === 'secretary' || assign.ownerId === 'deputy-secretary' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}">${esc(_ownerLabel(assign))}</span>
          </div>
          ${chips ? `<div class="flex flex-wrap gap-1">${chips}</div>` : ''}
          <p class="text-xs text-gray-500 leading-5">${esc(m.desc)}</p>
          ${outputs ? `<div class="flex flex-wrap gap-1 mt-auto pt-1">${outputs}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

/** 视图 B/C：人 × 工作项宽表（按人＝行=负责人、列=工作项；按项目＝转置，行=工作项、列=负责人） */
function _renderMatrix(workforce) {
  const host = document.getElementById('work-map-matrix');
  if (!host) return;
  // 人维 = 负责人（独特集合，键 `role:xxx` / `person:pN`）；顺序沿用原「按人」卡视图的排序意图：
  // 支书/副支书/组织/宣传/纪检 在前，其余（党小组组长、到人负责人等）按 99 排后
  const ownerMap = new Map();
  for (const m of WORK_MAP_MODULES) {
    const assign = workforce[m.id];
    // 停用项（ownerType:'none'）无负责人 → 不入人维（其工作项在矩阵中整列/整行渲染为「—」）
    if (assign.ownerType !== 'role' && assign.ownerType !== 'person') continue;
    const key = `${assign.ownerType}:${assign.ownerId}`;
    if (!ownerMap.has(key)) ownerMap.set(key, assign);
  }
  const order = [
    'role:secretary', 'role:deputy-secretary',
    'role:org-commissioner', 'role:prop-commissioner', 'role:disc-commissioner',
  ];
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
    // 列上限 0＝不限：工作项是本支部 11 项固定目录（有界，单一源 core/work-map.js），
    // 不随年份累积，故不需要矩阵缺省的「最近 6 项」封顶
    colLimit: 0,
    cell: (personKey, moduleId) => {
      const assign = workforce[moduleId];
      // 命中该工作项负责人 → 「主责」徽标（朴素文本标记，本页禁 SVG）；否则 null → 组件渲染灰色「—」
      return `${assign.ownerType}:${assign.ownerId}` === personKey
        ? '<span class="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">主责</span>'
        : null;
    },
    personLabel: '负责人',
    itemLabel: '工作项',
    emptyText: '无分工数据',
  });
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

  const switchBar = `
    <div class="flex items-center gap-2 mb-3">
      <div class="flex items-center gap-2">
        ${[
          { key: 'modules', label: '平铺模块' },
          { key: 'persons', label: '按人' },
          { key: 'items', label: '按项目' },
        ].map(t => `
          <button type="button"
            class="ov-sub-tab px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${_view === t.key ? 'bg-[var(--app-accent-bg)] border-[var(--app-accent)] [color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]' : 'bg-white border-neutral-200 text-gray-600 hover:bg-gray-50'}"
            ${_view === t.key ? 'style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)"' : ''}
            data-wm-view="${t.key}">${t.label}</button>`).join('')}
      </div>
      <p class="text-xs text-gray-500 ml-auto">分工由本支部自行调整（缺省按 SOP 责任人，改派走支委会议题）</p>
    </div>`;
  const body = _view === 'modules' ? _modulesHtml(workforce) : `<div id="work-map-matrix"></div>`;

  root.innerHTML = `${switchBar}${body}`;
  // 宽表视图（按人 / 按项目）：矩阵挂到宿主容器（_view → mode 映射在 _renderMatrix 内）
  if (_view !== 'modules') _renderMatrix(workforce);
  // 视图切换（纯排列切换，不换数据）；复用 overview 的 ov-sub-tab 激活样式
  root.querySelectorAll('.ov-sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _view = btn.dataset.wmView;
      renderContent();
    });
  });
  // L4 M2：分工调整工具（发起议题 / 跟踪 / 采纳）——仅支书/副支书可见（分工 = 支部自治）
  const editable = me && (me.role === 'secretary' || me.role === 'deputy-secretary');
  const oldHost = root.querySelector('#workforce-panel-host');
  if (oldHost) oldHost.remove();
  if (editable) {
    const host = document.createElement('div');
    host.id = 'workforce-panel-host';
    root.appendChild(host);
    mountWorkforcePanel(branchId, host).catch(e => console.error('[work-map] 分工调整面板渲染失败', e));
  }
}
