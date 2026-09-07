// role: [工程师]+[AI]
// entries/tabs/secretary/work-map-tab.js — 书记工作台·支部分工 tab（L4 支部工作地图，2026-09-03）
// 书记三重裁定落地：党建/党务二分取消、不设分类筐、平铺模块 + 按人 双视图。
// 模块目录单一源 = core/work-map.js（11 项既有工作形式）；分工快照 = config.workforce（缺省按 SOP 责任人列）。
// M2（2026-09-03）：分工调整走支委会议题（panel = workforce-panel.js）——发起改派议题/跟踪表决/采纳生效。
// 2026-09-03 裁定沿用：本页禁 SVG 图标，类别/视图用文字与色点区分。

import { escHtml as esc } from '../../../core/utils.js?v=20260903c';
import { WORK_MAP_MODULES } from '../../../core/work-map.js?v=20260903c';
import { ROLE_LABELS } from '../../../core/constants.js?v=20260903c';
import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../../services/branch.js?v=20260903c';
import { getPersonName } from '../../../services/person.js?v=20260903c';
// L4 M2（2026-09-03）：分工调整工具（发起支委会议题 / 跟踪 / 采纳生效），仅书记/副书记可见
import { mountWorkforcePanel } from './workforce-panel.js?v=20260906c';

let _view = 'modules'; // 视图 A 平铺模块 / 视图 B 按人（同一会话内保持）

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
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">产出·${esc(o)}</span>`).join('');
        return `
        <div class="rounded-xl border border-gray-200 bg-white p-3.5 flex flex-col gap-2">
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

/** 视图 B：按人分组（每位负责人名下挂其负责模块） */
function _personsHtml(workforce) {
  // 按人聚合：role/person 负责人 → 模块列表（顺序保持模块目录序）
  const byOwner = new Map();
  for (const m of WORK_MAP_MODULES) {
    const assign = workforce[m.id];
    const key = `${assign.ownerType}:${assign.ownerId}`;
    if (!byOwner.has(key)) byOwner.set(key, { assign, modules: [] });
    byOwner.get(key).modules.push(m);
  }
  const order = [
    'role:secretary', 'role:deputy-secretary',
    'role:org-commissioner', 'role:prop-commissioner', 'role:disc-commissioner',
  ];
  const sorted = [...byOwner.entries()].sort((a, b) => {
    const ia = order.indexOf(a[0]); const ib = order.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${sorted.map(([, { assign, modules }]) => `
        <div class="rounded-xl border border-gray-200 bg-white p-3.5 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${assign.ownerId === 'secretary' || assign.ownerId === 'deputy-secretary' ? 'bg-red-600' : 'bg-blue-500'}"></span>
            <p class="font-title-cn text-sm font-bold text-gray-800">${esc(_ownerLabel(assign))}</p>
            <span class="ml-auto text-[11px] text-gray-400">${modules.length} 个模块</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${modules.map(m => `
              <span class="text-xs px-2 py-1 rounded-lg bg-neutral-50 border border-gray-100 text-gray-700">
                ${esc(m.name)}${(m.sub && m.sub.length) ? `<span class="text-[10px] text-gray-400 ml-1">（${esc(m.sub.join('·'))}）</span>` : ''}
              </span>`).join('')}
          </div>
        </div>`).join('')}
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

  const switchBar = `
    <div class="flex items-center gap-2 mb-3">
      <div class="inline-flex items-center gap-1 p-1 rounded-full bg-neutral-100">
        ${[
          { key: 'modules', label: '平铺模块' },
          { key: 'persons', label: '按人' },
        ].map(t => `
          <button type="button"
            class="ov-sub-tab px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${_view === t.key ? 'ov-sub-tab-active' : 'text-gray-500 hover:text-gray-700'}"
            data-wm-view="${t.key}">${t.label}</button>`).join('')}
      </div>
      <p class="text-xs text-gray-400 ml-auto">分工由本支部自行调整（缺省按 SOP 责任人，改派走支委会议题）</p>
    </div>`;
  const body = _view === 'persons' ? _personsHtml(workforce) : _modulesHtml(workforce);

  root.innerHTML = `${switchBar}${body}`;
  // 视图切换（纯排列切换，不换数据）；复用 overview 的 ov-sub-tab 激活样式
  root.querySelectorAll('.ov-sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _view = btn.dataset.wmView;
      renderContent();
    });
  });
  // L4 M2：分工调整工具（发起议题 / 跟踪 / 采纳）——仅书记/副书记可见（分工 = 支部自治）
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
