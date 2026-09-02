// role: [工程师]+[AI]
// 组织委员工作台 Tab：考察上传（T-279 M3 拆分，照 M2 样板）
// 专班考察：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表。

import { loadInspectionRecords, saveInspectionRecords } from '../../../services/inspection.js?v=20260901m';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260901m';
import { PersonPicker } from '../../../components/person-picker.js?v=20260901m';
import { getPersonById, getPersonName, inspectionToLong } from '../../../mock/index.js?v=20260901m';
import { SourceType, ParticipationLevel } from '../../../core/domain.js?v=20260901m';
import { showToast } from '../../../core/utils.js?v=20260901m';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260901m';

// 私有状态（随模块自持，不污染入口）
let _orgInspFormVisible = false;
let _orgInspPickerInstance = null;

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);

  if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const tfInspection = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE);

  // T223 专班新者在前（createdAt 降序）
  const activeTaskforces = TaskForceRecordStore.getAll()
    .filter(t => t.status === 'active' || t.status === 'recruiting')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const formHtml = _orgInspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="org-insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传专班考察表单</div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择专班 <span class="text-red-500">*</span></label>
        <select id="org-insp-tf-select" class="input-flat text-xs w-full">
          <option value="">请选择专班</option>
          ${activeTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}（${tf.status === 'active' ? '运行中' : '招募中'}）</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择人员 <span class="text-red-500">*</span></label>
        <div id="org-insp-person-picker-container"></div>
      </div>
      <div id="org-insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="org-insp-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考察</button>
        <button id="org-insp-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
      <p class="text-[11px] text-gray-400 mt-2">提交后自动投递：纪检确认 → 考察总表（组织委员建档），无需手动选择接收方</p>
    </div>
  ` : '';

  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-cyan-100 text-cyan-700' };

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班考察上传</h3>
        <button class="btn-md" id="btn-org-upload-insp" style="${_accVars}background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${_orgInspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">专班考察：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_orgInspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">专班</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">标签</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(tfInspection).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" data-insp-detail="${i.id}" title="点击查看考察详情">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-xs ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">专班</span></td>
              <td class="py-2 px-3 text-gray-600">${i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
        ${tfInspection.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无专班考察记录</p>' : ''}
        <div id="org-insp-detail" class="hidden mt-3"></div>
      </div>
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-org-upload-insp')?.addEventListener('click', () => {
    _orgInspFormVisible = !_orgInspFormVisible;
    if (!_orgInspFormVisible && _orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    renderContent(ctx);
  });

  // 考察记录行 → 行下展开详情预览（书记 2026-08-11 裁定：卡片主体可点，展示该条考察记录详情）
  container.querySelectorAll('[data-insp-detail]').forEach(row => {
    row.addEventListener('click', () => {
      const rec = tfInspection.find(r => r.id === row.dataset.inspDetail);
      const detailEl = container.querySelector('#org-insp-detail');
      if (!rec || !detailEl) return;
      const isOpen = detailEl.dataset.openId === rec.id;
      if (isOpen) {
        detailEl.classList.add('hidden');
        delete detailEl.dataset.openId;
        return;
      }
      const long = inspectionToLong([rec])[0];
      // 考察记录详情（书记 2026-08-11 四审纠正：深色=黑底白字 / 浅色=白底黑字，
      // 用 CSS 变量跟随主题——原 bg-gray-50/60 深色模式下无覆盖看不清；
      // 行列分隔线提升可读性，不再用高饱和实底+白字）
      const statusBadge = rec.status === 'confirmed'
        ? '<span class="px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">已确认</span>'
        : '<span class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">待确认</span>';
      detailEl.innerHTML = `
        <div class="rounded-lg p-3" style="background:var(--neutral-50);border:1px solid var(--neutral-200);">
          <div class="flex items-center justify-between mb-2 pb-2" style="border-bottom:1px solid var(--neutral-200);">
            <p class="text-xs font-medium" style="color:var(--neutral-800);">考察记录详情</p>
            <span class="text-[11px]" style="color:var(--neutral-500);">上传人 ${getPersonName(rec.recordedBy) || '—'} · ${rec.recordedAt || '—'}</span>
          </div>
          <div class="text-xs">
            <div class="grid grid-cols-2 gap-x-6 py-1.5" style="border-bottom:1px solid var(--neutral-200);">
              <p style="color:var(--neutral-700);">姓名 <span style="color:var(--neutral-800);font-weight:500;">${long.name}</span></p>
              <p style="color:var(--neutral-700);">专班 <span style="color:var(--neutral-800);font-weight:500;">${long.source}</span></p>
            </div>
            <div class="grid grid-cols-2 gap-x-6 py-1.5" style="border-bottom:1px solid var(--neutral-200);">
              <p style="color:var(--neutral-700);">参与层级 <span style="color:var(--neutral-800);font-weight:500;">${long.level}</span></p>
              <p style="color:var(--neutral-700);">状态 ${statusBadge}</p>
            </div>
            <div class="grid grid-cols-1 gap-x-6 py-1.5">
              <p style="color:var(--neutral-700);">考察内容 <span style="color:var(--neutral-800);font-weight:500;">${rec.role || '—'}</span></p>
            </div>
          </div>
          <p class="text-[11px] mt-2 pt-2" style="color:var(--neutral-500);border-top:1px solid var(--neutral-200);">流程：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表</p>
        </div>`;
      detailEl.classList.remove('hidden');
      detailEl.dataset.openId = rec.id;
    });
  });

  if (_orgInspFormVisible) {
    _initOrgInspForm(container, activeTaskforces, ctx);
  }
}

function _initOrgInspForm(container, activeTaskforces, ctx) {
  const { accent } = ctx;

  const pickerContainer = container.querySelector('#org-insp-person-picker-container');
  if (pickerContainer) {
    _orgInspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderOrgInspContentRows(ids);
      }
    });
    _orgInspPickerInstance.render(pickerContainer);
  }

  _renderOrgInspContentRows([]);

  container.querySelector('#org-insp-form-cancel')?.addEventListener('click', () => {
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    renderContent(ctx);
  });

  container.querySelector('#org-insp-form-submit')?.addEventListener('click', () => {
    const tfSelect = container.querySelector('#org-insp-tf-select');
    const tfId = tfSelect?.value;
    const tfOption = tfSelect?.selectedOptions[0];
    if (!tfId) { showToast('error', '请选择专班'); return; }

    const tfName = tfOption?.dataset.name || tfId;
    const selectedIds = _orgInspPickerInstance ? _orgInspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    const records = [];
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#org-insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${getPersonName(personId)} 的考察内容`); return; }

      records.push({
        id: 'insp_' + Date.now() + '_' + personId,
        sourceType: SourceType.TASKFORCE,
        activityId: null,
        sourceName: tfName,
        personId,
        level: ParticipationLevel.DEEP_PARTICIPATE,
        role: content,
        recordedBy: 'p13', // 组织委员
        recordedAt: new Date().toISOString(),
        status: 'pending',
      });
    }

    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `专班考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    renderContent(ctx);
  });
}

function _renderOrgInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('org-insp-content-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人考察内容</div>
    <div class="space-y-2 max-h-60 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = getPersonById(pid);
        const name = person ? person.name : pid;
        return `
          <div class="flex items-start gap-2">
            <span class="text-xs font-medium text-gray-700 min-w-[3rem] pt-2">${name}</span>
            <textarea id="org-insp-content-${pid}" class="input-flat-sm w-full resize-none" rows="2" placeholder="请填写考察内容描述"></textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
