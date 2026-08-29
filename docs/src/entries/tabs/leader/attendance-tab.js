// role: [工程师]+[AI]
// 组长工作台 Tab：考勤上传（T-279 M2 拆分）
// 党小组活动考勤：党小组组长上传 → 纪检委员确认 → 录入考勤总表。

import { loadActiveAttendanceRecords, loadAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260829l';
import { loadMakeupTasks } from '../../../services/makeup.js?v=20260829l';
import { loadActivities } from '../../../services/activity.js?v=20260829l';
import { PersonPicker } from '../../../components/person-picker.js?v=20260829l';
import { getPersonById, getPersonName, PEOPLE, attendanceToLong } from '../../../mock/index.js?v=20260829l';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260829l';
import { badgeHtml } from '../../../components/badge.js?v=20260829l';
import { showToast } from '../../../core/utils.js?v=20260829l';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260829l';
import { currentLeaderGroup } from './_shared.js?v=20260829l';
import { autoGenerateMakeupTask } from '../../../services/makeup.js?v=20260829l';

// 私有状态（随模块自持，不污染入口）
let _attFormVisible = false;
let _attPickerInstance = null;

export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);

  // 清理旧的 PersonPicker 实例
  if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }

  // 本组人员 + 实际上传活动（T-304 第5轮 P9：不再限定「党小组会」类型，按实际上传展示）
  const { group: myGroup } = currentLeaderGroup();
  const myGroupMembers = PEOPLE.filter(p => p.partyGroup === myGroup);
  const myGroupMemberIds = myGroupMembers.map(p => p.id);
  const allRecords = loadActiveAttendanceRecords();
  const myAttendance = allRecords.filter(r =>
    myGroupMemberIds.includes(r.personId) && r.activityId && loadActivities().find(a => a.id === r.activityId)
  );

  // 筛选三会一课和主题党日活动；T223 排序统一：date 降序（新者在前）
  const eligibleActivities = loadActivities()
    .filter(a =>
      a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会'
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 获取本组待补课人员
  const makeupTasks = loadMakeupTasks();
  const myGroupMakeupTasks = makeupTasks.filter(t =>
    myGroupMemberIds.includes(t.personId) && t.status !== 'completed'
  );

  const formHtml = _attFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="att-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考勤表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择活动 <span class="text-red-500">*</span></label>
          <select id="att-activity-select" class="input-flat text-xs w-full">
            <option value="">请选择活动</option>
            ${eligibleActivities.map(a => `<option value="${a.id}">${a.title}（${a.date}）</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择参会人员 <span class="text-red-500">*</span></label>
        <div id="att-person-picker-container"></div>
      </div>
      <div id="att-status-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="att-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考勤</button>
        <button id="att-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤上传</h3>
        <button class="btn-md" id="btn-leader-upload-att" style="${_accVars}background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${_attFormVisible ? '收起表单' : '上传考勤表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考勤：党小组组长上传 → 纪检委员确认 → 录入考勤总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_attFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${attendanceToLong(myAttendance).map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${a.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">${ATTENDANCE_STATUS_LABELS[a.status] || a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${a.confirmer === '—' ? '<span class="text-orange-600">待确认</span>' : '<span class="text-green-600">已确认</span>'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
      ${myGroupMakeupTasks.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">待补课人员（${myGroup}）</div>
        <div class="text-xs text-gray-500 mb-2">本组有 ${myGroupMakeupTasks.length} 人缺勤，已生成补课任务</div>
        <div class="space-y-1.5">
          ${myGroupMakeupTasks.map(t => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white ${t.status === 'overdue' ? 'border border-red-100' : 'border border-orange-100'}">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-gray-800">${t.personName}</span>
                <span class="text-xs text-gray-500">${t.activityName}</span>
              </div>
              <div class="flex items-center gap-2">
                ${t.isMandatory
                  ? badgeHtml('必须', 'danger')
                  : badgeHtml('建议', 'info')
                }
                ${t.status === 'overdue'
                  ? badgeHtml('超期', 'danger')
                  : badgeHtml('待补课', 'warning')
                }
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-leader-upload-att')?.addEventListener('click', () => {
    _attFormVisible = !_attFormVisible;
    if (!_attFormVisible && _attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    renderContent(ctx);
  });

  // 如果表单可见，初始化 PersonPicker 和绑定事件
  if (_attFormVisible) {
    _initAttForm(container, eligibleActivities, ctx);
  }
}

function _initAttForm(container, eligibleActivities, ctx) {
  const { accent, accentBorder } = ctx;

  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#att-person-picker-container');
  if (pickerContainer) {
    _attPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参会人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderAttStatusRows(ids);
      }
    });
    _attPickerInstance.render(pickerContainer);
  }

  // 渲染初始状态行（空）
  _renderAttStatusRows([]);

  // 取消按钮
  container.querySelector('#att-form-cancel')?.addEventListener('click', () => {
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    renderContent(ctx);
  });

  // 提交按钮
  container.querySelector('#att-form-submit')?.addEventListener('click', () => {
    const activityId = container.querySelector('#att-activity-select')?.value;
    if (!activityId) { showToast('error', '请选择活动'); return; }

    const selectedIds = _attPickerInstance ? _attPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择参会人员'); return; }

    // 收集每人的出勤状态
    const records = [];
    const { leaderId } = currentLeaderGroup();
    for (const personId of selectedIds) {
      const statusEl = container.querySelector(`#att-status-${personId}`);
      const status = statusEl ? statusEl.value : AttendanceStatus.PRESENT;
      records.push({
        id: 'att_' + Date.now() + '_' + personId,
        personId: personId,
        activityId,
        status,
        // T-304 第5轮 P7 源头审校：submittedBy=组长（上传即审校）；recordedBy 留纪检复核异常
        submittedBy: leaderId,
        recordedBy: null,
        overdue: false,
      });
    }

    // 写入 mockDB
    const allRecords = loadAttendanceRecords();
    allRecords.push(...records);
    saveAttendanceRecords(allRecords);

    // T-304 第5轮 P7 真实补课：上传时即生成补课任务（防重复：同人同活动已有任务则跳过），
    // 消除「提示已生成但实际未生成」的虚假反馈；出勤/已补源头审校即确认，异常留纪检复核。
    records.forEach(r => autoGenerateMakeupTask(r));

    // 检查本组是否有缺勤人员
    const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE).length;
    if (absentCount > 0) {
      showToast('success', `考勤上传成功，共 ${records.length} 条记录。其中 ${absentCount} 条异常已生成补课任务，待纪检复核`);
    } else {
      showToast('success', `考勤上传成功，共 ${records.length} 条记录，已源头审校确认`);
    }

    // 清理并刷新
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    renderContent(ctx);
  });
}

function _renderAttStatusRows(selectedIds) {
  const rowsContainer = document.getElementById('att-status-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  // P2 批量录入：批量设置工具栏一键应用状态，再按需微调个别人
  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人出勤状态</div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs text-gray-500">批量设置：</span>
      <select id="att-batch-status" class="input-flat text-xs">
        <option value="">— 选择状态 —</option>
        <option value="${AttendanceStatus.PRESENT}">全部出勤</option>
        <option value="${AttendanceStatus.ABSENT}">全部缺勤</option>
        <option value="${AttendanceStatus.LEAVE}">全部请假</option>
      </select>
      <button id="att-batch-apply" type="button" class="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">应用到全部</button>
    </div>
    <div class="space-y-2 max-h-48 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = getPersonById(pid);
        const name = person ? person.name : pid;
        return `
          <div class="flex items-center gap-3 p-2 rounded-lg bg-white">
            <span class="text-sm font-medium text-gray-800 min-w-[60px]">${name}</span>
            <select id="att-status-${pid}" class="input-flat text-xs">
              <option value="${AttendanceStatus.PRESENT}">出勤</option>
              <option value="${AttendanceStatus.ABSENT}">缺勤</option>
              <option value="${AttendanceStatus.LEAVE}">请假</option>
            </select>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const applyBtn = rowsContainer.querySelector('#att-batch-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const batchVal = rowsContainer.querySelector('#att-batch-status')?.value;
      if (!batchVal) { showToast('error', '请先选择要应用的状态'); return; }
      selectedIds.forEach(pid => {
        const sel = rowsContainer.querySelector(`#att-status-${pid}`);
        if (sel) sel.value = batchVal;
      });
      showToast('success', `已批量设为「${ATTENDANCE_STATUS_LABELS[batchVal]}」，可按需微调个别人`);
    });
  }
}
