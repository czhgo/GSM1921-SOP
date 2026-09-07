// role: [工程师]+[AI]
// 组长工作台 Tab：考察上传（T-279 M2 拆分）
// 党小组活动考察：党小组组长上传 → 纪检委员确认 → 录入考察总表。

import { loadInspectionRecords, saveInspectionRecords, canUploadInspection } from '../../../services/inspection.js?v=20260907b';
import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260907b';
import { PersonPicker } from '../../../components/person-picker.js?v=20260903c';
import { inspectionToLong } from '../../../services/inspection.js?v=20260907b';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260907b';
import { SourceType, ParticipationLevel } from '../../../core/domain.js?v=20260903c';
import { showToast } from '../../../core/utils.js?v=20260903c';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260903c';
import { currentLeaderGroup } from './_shared.js?v=20260907b';

// 私有状态（随模块自持，不污染入口）
let _inspFormVisible = false;
let _inspPickerInstance = null;

export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);

  // 清理旧的 PersonPicker 实例
  if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const myInspection = allRecords.filter(r => r.sourceType === SourceType.ACTIVITY);

  // 来源类型选项
  // T223 排序统一：来源活动 date 降序（新者在前），专班 createdAt 降序
  // A1-2026-09-05 上传位门禁：活动类仅列本组长可上传（本组党小组会 / 本人为该活动组织者）且未归档者；专班类暂放行（负责人位待身份编码）
  const { leaderId } = currentLeaderGroup();
  const sourceActivities = loadActivities()
    .filter(a =>
      (a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会') &&
      canUploadInspection(leaderId, SourceType.ACTIVITY, a.id)
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sourceTaskforces = TaskForceRecordStore.getAll()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const formHtml = _inspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考察表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">来源类型 <span class="text-red-500">*</span></label>
          <select id="insp-source-type" class="input-flat w-full">
            <option value="">请选择来源类型</option>
            <option value="activity">活动</option>
            <option value="taskforce">专班</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择具体来源 <span class="text-red-500">*</span></label>
          <select id="insp-source-select" class="input-flat w-full" disabled>
            <option value="">请先选择来源类型</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择人员 <span class="text-red-500">*</span></label>
        <div id="insp-person-picker-container"></div>
      </div>
      <div id="insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="insp-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考察</button>
        <button id="insp-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考察上传</h3>
        <button class="btn-md" id="btn-leader-upload-insp" style="${_accVars}background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${_inspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考察：党小组组长上传 → 纪检委员确认 → 录入考察总表。仅列本组党小组会/本人组织的活动（其余活动由该活动组织者上传；组长非组织者=本组监督位，督促上传）</div>
      ${formHtml}
      <div class="overflow-x-auto ${_inspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(myInspection).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3 text-gray-600">${i.content || i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${i.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-leader-upload-insp')?.addEventListener('click', () => {
    _inspFormVisible = !_inspFormVisible;
    if (!_inspFormVisible && _inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    renderContent(ctx);
  });

  // 如果表单可见，初始化事件绑定
  if (_inspFormVisible) {
    _initInspForm(container, sourceActivities, sourceTaskforces, ctx);
  }
}

function _initInspForm(container, sourceActivities, sourceTaskforces, ctx) {
  const { accent } = ctx;

  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#insp-person-picker-container');
  if (pickerContainer) {
    _inspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderInspContentRows(ids);
      }
    });
    _inspPickerInstance.render(pickerContainer);
  }

  // 渲染初始内容行（空）
  _renderInspContentRows([]);

  // 来源类型切换
  const sourceTypeSelect = container.querySelector('#insp-source-type');
  const sourceSelect = container.querySelector('#insp-source-select');
  if (sourceTypeSelect && sourceSelect) {
    sourceTypeSelect.addEventListener('change', () => {
      const type = sourceTypeSelect.value;
      sourceSelect.disabled = !type;
      if (type === 'activity') {
        sourceSelect.innerHTML = `<option value="">请选择活动</option>` +
          sourceActivities.map(a => `<option value="${a.id}" data-name="${a.title}">${a.title}（${a.date}）</option>`).join('');
      } else if (type === 'taskforce') {
        sourceSelect.innerHTML = `<option value="">请选择专班</option>` +
          sourceTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}</option>`).join('');
      } else {
        sourceSelect.innerHTML = '<option value="">请先选择来源类型</option>';
      }
    });
  }

  // 取消按钮
  container.querySelector('#insp-form-cancel')?.addEventListener('click', () => {
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    renderContent(ctx);
  });

  // 提交按钮
  container.querySelector('#insp-form-submit')?.addEventListener('click', () => {
    const sourceType = container.querySelector('#insp-source-type')?.value;
    if (!sourceType) { showToast('error', '请选择来源类型'); return; }

    const sourceOption = container.querySelector('#insp-source-select')?.selectedOptions[0];
    const sourceId = container.querySelector('#insp-source-select')?.value;
    if (!sourceId) { showToast('error', '请选择具体来源'); return; }

    const selectedIds = _inspPickerInstance ? _inspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    // A1-2026-09-05 上传位守卫：活动类须为本人可上传（本组党小组会 / 本人为该活动组织者）；专班类暂放行（负责人位待身份编码）
    const { leaderId } = currentLeaderGroup();
    if (sourceType === 'activity' && !canUploadInspection(leaderId, SourceType.ACTIVITY, sourceId)) {
      showToast('error', '该活动不在您的考察上传位内（仅本组党小组会/本人组织的活动可上传）'); return;
    }

    // 收集每人的考察内容
    const records = [];
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${getPersonName(personId)} 的考察内容`); return; }

      const record = {
        id: 'insp_' + Date.now() + '_' + personId,
        sourceType: sourceType === 'activity' ? SourceType.ACTIVITY : SourceType.TASKFORCE,
        activityId: sourceType === 'activity' ? sourceId : null,
        sourceName: sourceType === 'activity' ? null : (sourceOption?.dataset.name || sourceId),
        personId,
        level: ParticipationLevel.ORGANIZE, // 默认组织层级，可由用户选择
        content,   // P1-5 修复：考察内容入 content 字段
        role: '组织者', // role 字段恢复为角色职责标签
        recordedBy: leaderId, // A1-2026-09-05：recordedBy 记真实操作人（组长），弃幽灵 u_exec
        recordedAt: new Date().toISOString(),
        status: 'pending',
      };

      records.push(record);
    }

    // 写入 mockDB
    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);

    // 清理并刷新
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    renderContent(ctx);
  });
}

function _renderInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('insp-content-rows');
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
          <div class="p-2 rounded-lg bg-white">
            <div class="text-sm font-medium text-gray-800 mb-1">${name}</div>
            <textarea id="insp-content-${pid}" class="input-flat w-full text-xs resize-none" rows="2" placeholder="请填写考察内容描述"></textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
