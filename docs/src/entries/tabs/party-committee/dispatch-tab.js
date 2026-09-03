// role: [工程师]+[AI]
// 党委工作台 Tab：下发通知（P3 党委后台，2026-09-02）
// 党委侧发起点（双向通道下发半侧）：选目标支部（可全选/单选，支部动态创建后自动可选）→
// 下发「党委通知」到目标支部的支委层（送达=通知流 audience='committee' 过滤 + 来源徽标）。
// 复用既有通知实体（书记 2026-09-02 裁定：能复用就复用，不新建「下发箱」领域）。
// 重绘纪律：party-committee 各 tab 每次整容器重绘（无 dataset.currentTab 约定），
// 故本 tab 每次渲染前先读取表单现值、渲染后回填——工作台数据变更重绘不丢撰写内容。
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md §5 P3

import { mockDB } from '../../../core/domain.js?v=20260903a';
import { AuthStore } from '../../../services/auth.js?v=20260903a';
import { PARTY_COMMITTEE } from '../../../mock/branches.js?v=20260903a';
import { NoticeStore } from '../../../services/notice.js?v=20260903a';
import { textField, textareaField } from '../../../components/form-field.js?v=20260903a';
import { showToast } from '../../../core/utils.js?v=20260903a';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 重绘前读取表单现值（分支勾选/优先级/标题/正文）——缺省：全支部选中、重要 */
function _readFormState(el) {
  const boxes = el?.querySelectorAll('input[name="dispatch-branch"]:checked');
  const branchIds = boxes && boxes.length ? [...boxes].map(cb => cb.value) : (mockDB.branches || []).map(b => b.id);
  const priInput = el?.querySelector('input[name="dispatch-pri"]:checked');
  return {
    branchIds,
    pri: priInput?.value || 'normal',
    title: el?.querySelector('#dispatch-title')?.value || '',
    content: el?.querySelector('#dispatch-content')?.value || '',
  };
}

export function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const me = AuthStore.getCurrentUser();
  if (!me) return;
  const prev = _readFormState(el);

  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <div class="flex items-center justify-between gap-3 mb-1">
          <div>
            <p class="text-xs text-gray-400">党委 → 支部 双向治理通道 · 下发半侧</p>
            <p class="font-title-cn text-base font-bold text-gray-800 mt-0.5">下发通知</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs text-gray-400">送达范围</p>
            <p class="text-sm font-medium text-gray-700">目标支部 · 支委层</p>
          </div>
        </div>
        <p class="text-xs text-gray-400">通知直达支部委员会（支委层收件并已读反馈）；支部非支委党员不受打扰。支部动态创建后自动可选。</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="font-title-cn text-sm font-bold text-gray-800 mb-3">撰写下发通知</p>
        <div class="mb-3">
          <p class="text-xs text-gray-500 block mb-1.5">目标支部（可多选）<span class="text-red-500">*</span></p>
          <div id="dispatch-branches" class="flex flex-wrap gap-2"></div>
        </div>
        ${textField({ id: 'dispatch-title', label: '标题', required: true, value: prev.title || '', placeholder: '例：关于规范主题党日开展程序的工作提示…', autocomplete: 'off', compact: false })}
        ${textareaField({ id: 'dispatch-content', label: '正文（下发内容/要求）', required: true, value: prev.content || '', rows: 4, placeholder: '面向支部委员会的工作要求、提醒或安排…' })}
        <div class="mb-4">
          <p class="text-xs text-gray-500 block mb-1.5">优先级</p>
          <div class="flex gap-2">
            <label data-dispatch-pri="normal" class="cursor-pointer rounded-lg border ${prev.pri === 'urgent' ? 'border-gray-200' : 'border-red-300 bg-red-50/40'} px-3 py-1.5 text-xs text-gray-700 transition-colors">
              <input type="radio" name="dispatch-pri" value="normal" class="hidden" ${prev.pri !== 'urgent' ? 'checked' : ''} /> 重要（常规）
            </label>
            <label data-dispatch-pri="urgent" class="cursor-pointer rounded-lg border ${prev.pri === 'urgent' ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} px-3 py-1.5 text-xs text-gray-700 transition-colors">
              <input type="radio" name="dispatch-pri" value="urgent" class="hidden" ${prev.pri === 'urgent' ? 'checked' : ''} /> 紧急（需立即办理）
            </label>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="dispatch-submit" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">下发</button>
        </div>
      </div>

      <div>
        <p class="text-xs text-gray-400 mb-2">下发历史（${esc(PARTY_COMMITTEE.name)}）</p>
        <div id="dispatch-history" class="space-y-3"></div>
      </div>
    </div>
  `;

  bindBranches(el, prev.branchIds);
  bindPriority(el, prev.pri);
  el.querySelector('#dispatch-submit')?.addEventListener('click', async () => {
    const branchIds = [...el.querySelectorAll('input[name="dispatch-branch"]:checked')].map(cb => cb.value);
    const title = el.querySelector('#dispatch-title')?.value.trim();
    const content = el.querySelector('#dispatch-content')?.value.trim();
    const priority = el.querySelector('input[name="dispatch-pri"]:checked')?.value || 'normal';
    if (!branchIds.length) { showToast('请选择目标支部'); return; }
    if (!title || !content) { showToast('请填写标题与正文'); return; }
    branchIds.forEach(branchId => {
      const b = (mockDB.branches || []).find(x => x.id === branchId);
      NoticeStore.add({
        source: 'committee',
        audience: 'committee',
        branchId,
        branchName: b?.config?.headerTitle || b?.name || branchId,
        title,
        content,
        priority,
        targetModule: '',
        read: false,
        publisher: '院党委（组织员）',
        recipients: '支部委员会（支委层）',
      });
    });
    showToast(`已下发至 ${branchIds.length} 个支部的支委层`);
    el.querySelector('#dispatch-title').value = '';
    el.querySelector('#dispatch-content').value = '';
    renderContent();
  });
  renderHistory(el);
}

/** 目标支部多选（含全选；回填已选态） */
function bindBranches(el, selectedIds) {
  const box = el.querySelector('#dispatch-branches');
  if (!box) return;
  const branches = mockDB.branches || [];
  const sel = new Set(selectedIds);
  box.innerHTML = [
    `<label class="cursor-pointer rounded-lg border ${sel.size === branches.length ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} px-3 py-1.5 text-xs text-gray-700 transition-colors">
       <input type="checkbox" data-dispatch-all class="hidden" ${sel.size === branches.length ? 'checked' : ''} /> 全部支部
     </label>`,
    ...branches.map(b => `
      <label class="cursor-pointer rounded-lg border ${sel.has(b.id) ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} px-3 py-1.5 text-xs text-gray-700 transition-colors">
        <input type="checkbox" name="dispatch-branch" value="${esc(b.id)}" class="hidden" ${sel.has(b.id) ? 'checked' : ''} /> ${esc(b.config?.headerTitle || b.name)}
      </label>`),
  ].join('');
  const allBox = box.querySelector('[data-dispatch-all]');
  const refresh = () => {
    const checked = box.querySelectorAll('input[name="dispatch-branch"]:checked').length;
    allBox.checked = checked === branches.length;
    markChips(box);
  };
  allBox?.addEventListener('change', () => {
    box.querySelectorAll('input[name="dispatch-branch"]').forEach(cb => { cb.checked = allBox.checked; });
    markChips(box);
  });
  box.querySelectorAll('input[name="dispatch-branch"]').forEach(cb => cb.addEventListener('change', refresh));
}

/** 优先级切换高亮 */
function bindPriority(el, current) {
  const toggle = (label) => {
    const on = label.querySelector('input[name="dispatch-pri"]:checked');
    label.classList.toggle('border-red-300', !!on);
    label.classList.toggle('bg-red-50/40', !!on);
    label.classList.toggle('border-gray-200', !on);
  };
  el.querySelectorAll('[data-dispatch-pri]').forEach(l => {
    l.querySelector('input[name="dispatch-pri"]')?.addEventListener('change', () => {
      el.querySelectorAll('[data-dispatch-pri]').forEach(o => toggle(o));
    });
    toggle(l);
  });
}

/** 支部选择 chip 视觉 */
function markChips(box) {
  box.querySelectorAll('input[name="dispatch-branch"]').forEach(cb => {
    const label = cb.closest('label');
    if (!label) return;
    label.classList.toggle('border-red-300', cb.checked);
    label.classList.toggle('bg-red-50/40', cb.checked);
    label.classList.toggle('border-gray-200', !cb.checked);
  });
}

/** 下发历史：本院系党委下发的全部记录（按发布时间倒序；支部后续改名以记录快照 branchName 展示） */
function renderHistory(el) {
  const wrap = el.querySelector('#dispatch-history');
  if (!wrap) return;
  const rows = (mockDB.notices || [])
    .filter(n => n.source === 'committee')
    .sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')));
  if (!rows.length) {
    wrap.innerHTML = `<div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p class="text-sm text-gray-500">暂无下发记录</p>
      <p class="text-xs text-gray-400 mt-1">撰写并下发后，此处留存党委下发历史</p>
    </div>`;
    return;
  }
  wrap.innerHTML = rows.map(n => `
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <div class="flex items-center gap-2 flex-wrap mb-1">
        <span class="text-xs px-2 py-0.5 rounded-full ${n.priority === 'urgent' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}">${n.priority === 'urgent' ? '紧急' : '重要'}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">${esc(n.branchName || n.branchId || '—')}</span>
        <span class="text-xs text-gray-400 ml-auto">${n.publishDate || ''}</span>
      </div>
      <p class="text-sm font-medium text-gray-800">${esc(n.title)}</p>
      <p class="text-xs text-gray-500 mt-1 leading-5 whitespace-pre-wrap">${esc(n.content)}</p>
    </div>`).join('');
}
