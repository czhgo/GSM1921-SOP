// role: [工程师]+[AI]
// 党委工作台 Tab：支部管理（P1 党委后台，2026-09-02）
// 支部不预设名字：党委创建/改名支部实例；config.headerTitle 随名软编码（header 随支部更换）

import { mockDB } from '../../../core/domain.js?v=20260901u';
import { PARTY_COMMITTEE } from '../../../mock/branches.js?v=20260901u';
import { getPersonName } from '../../../services/person.js?v=20260901u';
import { createBranch, renameBranch } from '../../../services/branch.js?v=20260901u';
import { showToast } from '../../../core/utils.js?v=20260901u';

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
            </div>
            <div class="branch-rename-row hidden mt-2 flex gap-2">
              <input class="branch-rename-input w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400" value="${esc(b.config?.headerTitle || b.name)}" placeholder="支部全称" />
              <button class="branch-rename-save text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" style="background:#C8102E;">保存</button>
            </div>
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
  });
}
