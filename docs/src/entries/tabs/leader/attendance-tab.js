// role: [工程师]+[AI]
// 组长工作台 Tab：考勤上传（T-279 M2 拆分）
// 党小组活动考勤：党小组组长上传 → 纪检委员确认 → 录入考勤总表。

import { loadActiveAttendanceRecords, canUploadAttendance, appendAttendanceRecords } from '../../../services/attendance.js?v=20260903c';
import { loadMakeupTasks } from '../../../services/makeup.js?v=20260903c';
import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { PersonPicker } from '../../../components/person-picker.js?v=20260903c';
import { PersonStore } from '../../../services/person.js?v=20260903c';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
const PEOPLE = PersonStore.getMembers();
import { attendanceToLong } from '../../../services/attendance.js?v=20260903c';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260903c';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260903c';
import { badgeHtml } from '../../../components/badges.js?v=20260903c';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260903c';
// ③批（书记 2026-09-06）：党小组会考勤候选 = 本组应到名单（党员非滞留）；
// 滞留者「可见但不可选」（灰态 + 「滞留」徽标 + title 备注，同纪检口径）
import { getMeetingRosterCandidates, getRosterStats } from '../../../services/roster.js?v=20260903c';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260903c';
import { currentLeaderGroup } from './_shared.js?v=20260903c';
import { autoGenerateMakeupTask } from '../../../services/makeup.js?v=20260903c';

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
  // A1-2026-09-05 上传位门禁：列表仅保留本组长可上传（本组党小组会 / 本人为该活动组织者）且未归档的活动
  const { leaderId } = currentLeaderGroup();
  const eligibleActivities = loadActivities()
    .filter(a =>
      (a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会') &&
      canUploadAttendance(leaderId, a.id)
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
          <select id="att-activity-select" class="input-flat w-full">
            <option value="">请选择活动</option>
            ${eligibleActivities.map(a => `<option value="${a.id}">${a.title}（${a.date}）</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择参会人员 <span class="text-red-500">*</span></label>
        <div id="att-person-picker-container"></div>
      </div>
      <div id="att-roster-hint" class="mb-3 text-[11px] text-gray-400 leading-5"></div>
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
      <div class="text-xs text-gray-500 mb-3">党小组活动考勤：党小组组长上传 → 纪检委员确认 → 录入考勤总表。仅列本组党小组会/本人组织的活动（其余活动由该活动组织者上传；组长非组织者=本组监督位，督促上传）</div>
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

  // 绑定上传按钮（保态折叠 2026-09-06：对齐纪检会议考勤录入判例——表单已渲染
  //（#att-form-panel 在 DOM）时，收起/展开只切该容器 hidden，不销毁
  // _attPickerInstance、不重建 innerHTML，已选活动/人员/逐人状态保留；
  // 外部 re-render 仍按 _attFormVisible 原逻辑整容器重建，属既有行为可接受）
  container.querySelector('#btn-leader-upload-att')?.addEventListener('click', () => {
    const panel = container.querySelector('#att-form-panel');
    const btn = container.querySelector('#btn-leader-upload-att');
    if (!panel) { // 首次打开（表单未渲染）：走 _attFormVisible 渲染表单 + 创建 picker
      _attFormVisible = true;
      renderContent(ctx);
      return;
    }
    const collapsed = panel.classList.toggle('hidden');
    if (btn) btn.textContent = collapsed ? '上传考勤表单' : '收起表单';
  });

  // 如果表单可见，初始化 PersonPicker 和绑定事件
  if (_attFormVisible) {
    _initAttForm(container, eligibleActivities, ctx);
  }
}

function _initAttForm(container, eligibleActivities, ctx) {
  const { accent } = ctx;
  const pickerContainer = container.querySelector('#att-person-picker-container');
  const activitySelect = container.querySelector('#att-activity-select');
  const { group: myGroup } = currentLeaderGroup();

  /** 党小组会 → 本组应到候选语境（组内党员 + 滞留者禁用）；其余/未选活动 → null（全成员，上传位语义不变） */
  function rosterCtxFor(activity) {
    if (!activity || activity.type !== '党小组会') return null;
    const { candidates, disabledIds } = getMeetingRosterCandidates({ type: '党小组会', groupId: myGroup });
    return {
      candidateIds: new Set(candidates.map(p => p.id)),
      disabledIds,
      candidates,
      stats: getRosterStats({ type: '党小组会', groupId: myGroup }),
    };
  }

  /** 按当前所选活动重建 PersonPicker（党小组会收紧候选；切换活动清空已选，重新引导选择） */
  function rebuildPicker() {
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    if (!pickerContainer) return;
    const activityId = activitySelect?.value;
    const activity = eligibleActivities.find(a => a.id === activityId) || null;
    const rosterCtx = rosterCtxFor(activity);
    // ③批（书记 2026-09-06）：党小组会候选 = 本组应到名单（组内党员 非滞留），
    // 滞留者「可见但不可选」；未选活动 → 空候选（引导先选活动，避免先选人后切活动丢选择）
    _attPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参会人员',
      accentColor: accent,
      filter: activity
        ? (rosterCtx ? (p) => rosterCtx.candidateIds.has(p.id) : undefined)
        : () => false,
      disabledIds: rosterCtx ? rosterCtx.disabledIds : [],
      ...(rosterCtx && rosterCtx.disabledIds.length > 0
        ? {
            disabledLabel: () => '滞留',
            disabledTitle: (p) => `滞留：${p.residenceNote || '组织关系保留、应到剔除、通知照发'}`,
          }
        : {}),
      onSelect: (ids) => {
        _renderAttStatusRows(ids);
      }
    });
    _attPickerInstance.render(pickerContainer);
    _renderAttRosterHint(activity, rosterCtx, myGroup);
    _renderAttStatusRows(_attPickerInstance.getSelected());
  }

  // 活动切换 → 按类型重建候选（已选随重建清空并提示）
  activitySelect?.addEventListener('change', () => {
    const hadSelection = !!(_attPickerInstance && _attPickerInstance.getSelected().length > 0);
    rebuildPicker();
    if (hadSelection) showToast('info', '已按所选活动重置参会候选，请重新选择');
  });

  // 初始渲染（未选活动：空候选 + 提示先选活动）
  rebuildPicker();

  // 取消按钮（保态折叠 2026-09-06：取消 = 收起，保留已选与逐人状态；仅提交成功后才重置会话）
  container.querySelector('#att-form-cancel')?.addEventListener('click', () => {
    const panel = container.querySelector('#att-form-panel');
    if (panel) panel.classList.add('hidden');
    const btn = container.querySelector('#btn-leader-upload-att');
    if (btn) btn.textContent = '上传考勤表单';
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

    // A1-2026-09-05 追加提交语义：新增记录；同人同活动已闭环（出勤/已补/纪检已复核）→ 跳过；待复核异常 → 拦截走纪检确认
    const { added, skipped, blocked } = appendAttendanceRecords({ actorId: leaderId, records });

    // T-304 第5轮 P7 真实补课：上传时即生成补课任务（防重复：同人同活动已有任务则跳过），
    // 消除「提示已生成但实际未生成」的虚假反馈；出勤/已补源头审校即确认，异常留纪检复核。
    records.forEach(r => autoGenerateMakeupTask(r));

    if (added === 0 && blocked === 0 && skipped === 0) {
      showToast('error', '没有可上传的记录（活动不在您的上传位内）');
    } else {
      const parts = [`新增 ${added} 条`];
      if (skipped > 0) parts.push(`重复跳过 ${skipped} 条（已确认记录不可覆盖）`);
      if (blocked > 0) parts.push(`拦截 ${blocked} 条`);
      const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE).length;
      parts.push(absentCount > 0 ? `${absentCount} 条异常已生成补课任务，待纪检复核` : '出勤已源头审校确认');
      showToast('success', `考勤上传：${parts.join('；')}`);
    }

    // 清理并刷新
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    renderContent(ctx);
  });
}

/** 组长上传表单候选提示：党小组会 = 本组应到 + 滞留者标灰禁选；其余活动说明候选范围（同纪检口径） */
function _renderAttRosterHint(activity, rosterCtx, myGroup) {
  const hintEl = document.getElementById('att-roster-hint');
  if (!hintEl) return;
  if (!activity) {
    hintEl.innerHTML = '请先选择活动：党小组会候选取本组应到名单（组内党员 且非滞留）；其他活动候选项 = 支部成员';
    return;
  }
  if (!rosterCtx) {
    hintEl.innerHTML = '候选项 = 支部在册成员（本活动非党小组会，候选不按应到收紧）；党小组会活动将自动取本组应到名单';
    return;
  }
  const { stats, candidates, disabledIds } = rosterCtx;
  const disabledSet = new Set(disabledIds);
  const detained = candidates.filter(p => disabledSet.has(p.id));
  const chips = detained.length === 0
    ? '<span class="text-gray-400">无滞留成员</span>'
    : detained.map(p => `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 align-middle"
        title="${esc(p.residenceNote || '滞留：组织关系保留、应到剔除、通知照发')}">${esc(p.name)} · 滞留</span>`).join(' ');
  hintEl.innerHTML = `
    <span>本组（${esc(myGroup)}）应到 <b class="text-gray-600">${stats.expected}</b> 人（组内党员 ${stats.partyTotal} − 滞留剔除 ${stats.detainedParty}）。滞留者已在候选中<b class="text-amber-700">标灰禁选</b>（悬浮查看备注）：${chips}</span>`;
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
      <select id="att-batch-status" class="input-flat">
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
            <select id="att-status-${pid}" class="input-flat">
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
