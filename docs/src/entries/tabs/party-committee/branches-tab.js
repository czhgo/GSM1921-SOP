// role: [工程师]+[AI]
// 党委工作台 Tab：支部管理（P1 党委后台，2026-09-02）
// 支部不预设名字：党委创建/改名支部实例；config.headerTitle 随名软编码（header 随支部更换）

import { mockDB } from '../../../core/domain.js?v=20260901y';
import { PEOPLE } from '../../../mock/people.js?v=20260901y';
import { PARTY_COMMITTEE } from '../../../mock/branches.js?v=20260901y';
import { getPersonName } from '../../../services/person.js?v=20260901y';
import { createBranch, renameBranch } from '../../../services/branch.js?v=20260901y';
import { appointSecretary, listAppointments } from '../../../services/appointment.js?v=20260901y';
import { showToast } from '../../../core/utils.js?v=20260901y';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const branches = mockDB.branches || [];

  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <p class="font-title-cn text-base font-bold text-gray-800">支部实例</p>
          <p class="text-xs text-gray-400 mt-0.5">支部不预设名字——由党委按实际情况创建/改名（硕博等支部随时可加）</p>
        </div>
        <button id="branch-add-toggle" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">+ 新建支部</button>
      </div>
      <div id="branch-form-wrap" class="hidden rounded-xl border border-gray-200 bg-white p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-xs text-gray-500 block mb-1">支部名称（如 光华管理学院本科第二党支部）</label>
            <input id="branch-name-input" type="text" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400" placeholder="支部全称" />
          </div>
          <div>
            <label class="text-xs text-gray-500 block mb-1">类型（可选，自由文本）</label>
            <input id="branch-type-input" type="text" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400" placeholder="如 硕士/博士/本科生" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="branch-form-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 border border-gray-200">取消</button>
          <button id="branch-form-submit" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">创建支部</button>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${branches.map(b => `
          <div class="rounded-xl border border-gray-200 bg-white p-4" data-branch-card="${esc(b.id)}">
            <div class="flex items-start justify-between mb-2">
              <div class="min-w-0">
                <p class="font-title-cn text-base font-bold text-gray-800 truncate">${esc(b.config?.headerTitle || b.name)}</p>
                <p class="text-xs text-gray-400 mt-0.5">${esc(b.type || '支部')} · 现任书记：${esc(b.secretaryId ? getPersonName(b.secretaryId) : '（待任命）')}</p>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 shrink-0">运行中</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="branch-rename-toggle text-xs px-2.5 py-1 rounded-lg text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-600">改名</button>
              <button class="branch-appoint-toggle text-xs px-2.5 py-1 rounded-lg text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-600">任命书记</button>
            </div>
            <div class="branch-rename-row hidden mt-2 flex gap-2">
              <input class="branch-rename-input w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400" value="${esc(b.config?.headerTitle || b.name)}" placeholder="支部全称" />
              <button class="branch-rename-save text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" style="background:#C8102E;">保存</button>
            </div>
            <div class="branch-appoint-row hidden mt-2 space-y-2">
              <select class="branch-appoint-select w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 bg-white">
                <option value="">— 选择本支部成员为新任书记 —</option>
                ${PEOPLE.filter(p => p.branchId === b.id && p.role !== 'party-staff').map(p =>
                  `<option value="${esc(p.id)}" ${p.id === b.secretaryId ? 'disabled' : ''}>${esc(p.name)}（${esc(p.developStage || '')}）${p.id === b.secretaryId ? '·现任' : ''}</option>`).join('')}
              </select>
              <div class="flex items-center justify-between gap-2">
                <input class="branch-appoint-note w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-red-400" placeholder="任命说明（可选，如 换届选举 2026-09）" />
                <button class="branch-appoint-save text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" style="background:#C8102E;">确认任命</button>
              </div>
            </div>
            ${(() => { const h = listAppointments(b.id); return h.length ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <p class="text-xs text-gray-400 mb-1">任期档案</p>
              ${h.slice(0, 3).map(r => `
                <p class="text-xs text-gray-500 leading-5">${esc(getPersonName(r.secretaryId))} · ${String(r.from || '').slice(0, 10)}${r.to ? ' → ' + String(r.to).slice(0, 10) : ' · 现任'}${r.note ? ' · ' + esc(r.note) : ''}</p>`).join('')}
            </div>` : ''; })()}
          </div>`).join('')}
      </div>
      <p class="text-xs text-gray-400">党委组织：${esc(PARTY_COMMITTEE.name)} · 支部 ${branches.length} 个</p>
    </div>
  `;

  // 新建表单开关
  const toggle = el.querySelector('#branch-add-toggle');
  const formWrap = el.querySelector('#branch-form-wrap');
  toggle?.addEventListener('click', () => formWrap?.classList.toggle('hidden'));
  el.querySelector('#branch-form-cancel')?.addEventListener('click', () => formWrap?.classList.add('hidden'));

  // 创建支部
  el.querySelector('#branch-form-submit')?.addEventListener('click', async () => {
    const name = el.querySelector('#branch-name-input')?.value.trim();
    const type = el.querySelector('#branch-type-input')?.value.trim();
    if (!name) { showToast('请填写支部名称'); return; }
    await createBranch({ name, type });
    showToast(`支部「${name}」已创建`);
    renderContent();
  });

  // 改名（toggle 行 + 保存）
  el.querySelectorAll('[data-branch-card]').forEach(card => {
    const branchId = card.dataset.branchCard;
    card.querySelector('.branch-rename-toggle')?.addEventListener('click', () => {
      card.querySelector('.branch-rename-row')?.classList.toggle('hidden');
    });
    card.querySelector('.branch-rename-save')?.addEventListener('click', async () => {
      const name = card.querySelector('.branch-rename-input')?.value.trim();
      if (!name) { showToast('支部名称不能为空'); return; }
      await renameBranch(branchId, name);
      showToast('支部名称已更新（header 已随配置更换）');
      renderContent();
    });
    // 任命书记（P2：toggle 展开 → 选成员 → 确认任命）
    card.querySelector('.branch-appoint-toggle')?.addEventListener('click', () => {
      card.querySelector('.branch-appoint-row')?.classList.toggle('hidden');
    });
    card.querySelector('.branch-appoint-save')?.addEventListener('click', async () => {
      const personId = card.querySelector('.branch-appoint-select')?.value;
      if (!personId) { showToast('请选择新任书记'); return; }
      const note = card.querySelector('.branch-appoint-note')?.value.trim() || '';
      const name = card.querySelector('.branch-appoint-select')?.selectedOptions?.[0]?.textContent || personId;
      await appointSecretary({ branchId, personId, note });
      showToast(`已任命 ${name.split('（')[0]} 为支部书记（原书记已降回成员，任期档案已记录）`);
      renderContent();
    });
  });
}
