// role: [工程师]+[AI]
// entries/tabs/secretary/workforce-panel.js — 支部分工调整工具（L4 M2，2026-09-03）
// 挂载在「支部分工」tab 底部（仅书记/副书记可见）：
//   ① 发起分工调整：选模块 → 选新负责人（支委角色 / 支部成员）→ 说明+日期 → 发起支委会议题表决；
//   ② 议题列表：待表决议题可「去表决」（跳本工作台活动详情走既有线上表决）与「采纳生效」。
// 表决 UI 复用既有 agenda-votes 资产；本面板不重复实现投票。

import { escHtml as esc, showToast } from '../../../core/utils.js?v=20260903c';
import { WORK_MAP_MODULES } from '../../../core/work-map.js?v=20260903c';
import { BRANCH_COMMISSION_ROLES, ROLE_LABELS } from '../../../core/constants.js?v=20260903c';
import { PersonStore } from '../../../services/person.js?v=20260903c';
import {
  createWorkforceProposalActivity, listWorkforceProposals, adoptWorkforceProposal, ownerDisplay,
} from '../../../services/workforce.js?v=20260903c';
import { getBranchWorkforce } from '../../../services/branch.js?v=20260903c';

function _today() {
  return new Date().toISOString().slice(0, 10);
}

/** 负责人候选下拉（支委角色 + 支部成员；value 编码 type:id） */
function _ownerOptionsHtml() {
  const roles = BRANCH_COMMISSION_ROLES.map((r) =>
    `<option value="role:${r}">${esc(ROLE_LABELS[r] || r)}</option>`).join('');
  const members = PersonStore.getMembers()
    .map((p) => `<option value="person:${p.id}">${esc((p.name || p.id))}（${esc(ROLE_LABELS[p.role] || p.role || '成员')}）</option>`)
    .join('');
  return `
    <optgroup label="支委角色">${roles}</optgroup>
    <optgroup label="具体成员（到人）">${members}</optgroup>`;
}

/** 发起面板（每次展开重建，模块下拉带当前负责人提示） */
function _formHtml(branchId) {
  const moduleOpts = WORK_MAP_MODULES.map((m) => {
    const cur = ownerDisplay(getBranchWorkforce(branchId)[m.id]);
    return `<option value="${m.id}">${esc(m.name)}（现：${esc(cur)}）</option>`;
  }).join('');
  return `
    <div class="rounded-xl border border-dashed border-red-200 bg-red-50/40 p-3.5 flex flex-col gap-2.5">
      <div class="flex items-center gap-2">
        <p class="font-title-cn text-sm font-bold text-gray-800">发起支部分工调整</p>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">需经支委会议题表决后生效</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <label class="flex flex-col gap-1 text-xs text-gray-500">工作模块
          <select id="wf-module" class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white">${moduleOpts}</select>
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-500">新负责人（改派到）
          <select id="wf-owner" class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white"><option value="">请选择…</option>${_ownerOptionsHtml()}</select>
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-500">支委会日期
          <input id="wf-date" type="date" value="${_today()}" class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white">
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-500">议题说明（理由）
          <input id="wf-note" type="text" placeholder="如：发展工作由副书记统筹" class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white">
        </label>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" id="wf-cancel" class="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100">收起</button>
        <button type="button" id="wf-submit" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700">发起支委会议题</button>
      </div>
    </div>`;
}

/** 议题列表卡 */
function _proposalCards(proposals) {
  if (!proposals.length) {
    return `<p class="text-xs text-gray-400">暂无分工调整议题——发起后将在此跟踪表决与采纳。</p>`;
  }
  return proposals.map((a) => {
    const adopted = !!a.extras.adoptedAt;
    const lines = (a.extras.proposal || []).map((c) => {
      const m = WORK_MAP_MODULES.find((x) => x.id === c.moduleId);
      return `<span class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">${esc(m ? m.name : c.moduleId)} → ${esc(ownerDisplay(c.to))}</span>`;
    });
    return `
      <div class="rounded-xl border ${adopted ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'} p-3 flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="font-title-cn text-sm font-bold text-gray-800 truncate">${esc(a.title)}</p>
            <span class="shrink-0 text-[11px] px-2 py-0.5 rounded-full ${adopted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${adopted ? '已生效' : '待表决'}</span>
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">${esc(a.date || '')} · 表决入口：本次支委会活动（交流式表态）</p>
          <div class="flex flex-wrap gap-1.5 mt-1.5">${lines.join('')}</div>
        </div>
        <div class="shrink-0 flex flex-col gap-1.5">
          <a href="secretary.html?activityId=${a.id}" class="text-center px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">去表决</a>
          ${adopted ? '' : `<button type="button" class="wf-adopt px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700" data-id="${a.id}">采纳生效</button>`}
        </div>
      </div>`;
  }).join('');
}

/**
 * 挂载分工调整工具（hostEl 为「支部分工」tab 底部容器）
 * @param {string} branchId
 * @param {HTMLElement} hostEl
 */
export async function mountWorkforcePanel(branchId, hostEl) {
  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 mb-2 mt-4';
  header.innerHTML = `
    <p class="font-title-cn text-sm font-bold text-gray-800">分工调整（走支委会议题）</p>
    <button type="button" id="wf-open" class="ml-auto px-3 py-1 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700">＋ 发起调整</button>`;
  const body = document.createElement('div');
  body.id = 'workforce-panel-body';
  hostEl.appendChild(header);
  hostEl.appendChild(body);

  async function renderBody() {
    // 发起表单（默认收起）＋ 议题列表
    const proposals = await listWorkforceProposals(branchId);
    body.innerHTML = `
      <div id="wf-form-wrap" class="hidden"></div>
      <div class="flex flex-col gap-2">${_proposalCards(proposals)}</div>`;
    header.querySelector('#wf-open').addEventListener('click', () => {
      const wrap = body.querySelector('#wf-form-wrap');
      const collapsed = wrap.classList.contains('hidden');
      wrap.classList.toggle('hidden', !collapsed);
      if (collapsed) {
        wrap.innerHTML = _formHtml(branchId);
        wrap.querySelector('#wf-cancel').addEventListener('click', () => wrap.classList.add('hidden'));
        wrap.querySelector('#wf-submit').addEventListener('click', async () => {
          const moduleId = wrap.querySelector('#wf-module').value;
          const ownerVal = wrap.querySelector('#wf-owner').value;
          const date = wrap.querySelector('#wf-date').value || _today();
          const note = wrap.querySelector('#wf-note').value.trim();
          if (!moduleId || !ownerVal) { showToast('请选择模块与新负责人', 'warn'); return; }
          const [ownerType, ownerId] = ownerVal.split(':');
          try {
            await createWorkforceProposalActivity(branchId, [{ moduleId, to: { ownerType, ownerId } }], note, date);
            showToast('已发起支委会议题，等待表决');
            wrap.classList.add('hidden');
            renderBody();
          } catch (e) {
            console.error('[workforce] 发起失败', e);
            showToast(`发起失败：${e.message || e}`, 'error');
          }
        });
      }
    });
    // 采纳
    body.querySelectorAll('.wf-adopt').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('确认按支委会表决结果采纳该分工调整？')) return;
        try {
          await adoptWorkforceProposal(branchId, btn.dataset.id);
          showToast('分工已生效');
          renderBody();
        } catch (e) {
          console.error('[workforce] 采纳失败', e);
          showToast(`采纳失败：${e.message || e}`, 'error');
        }
      });
    });
  }
  await renderBody();
}
