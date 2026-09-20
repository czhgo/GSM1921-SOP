// role: [工程师]+[AI]
// 组长工作台 Tab：考勤上传（T-279 M2 拆分）
// 党小组活动考勤：组织者上传 → 纪检委员确认 → 录入考勤明细。

import { loadActiveAttendanceRecords, canUploadAttendance, appendAttendanceRecords, loadAttendanceAppeals, resolveAttendanceAppeal, reconfirmReturnedRecord } from '../../../services/attendance.js?v=20260921b';
import { loadMakeupTasks } from '../../../services/makeup.js?v=20260921b';
import { loadActivities } from '../../../services/activity.js?v=20260921b';
// SOP-B-2（D-288）：考勤候选默认选中「已通过报名者」——报名名单的来源单一源 = SignupStore
import { getApprovedSignupPersonIds } from '../../../services/signup.js?v=20260921b';
import { PersonPicker } from '../../../components/person-picker.js?v=20260921b';
import { liveMembers, PersonStore } from '../../../services/person.js?v=20260921b';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { attendanceToLong } from '../../../services/attendance.js?v=20260921b';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260921b';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260921b';
import { generateId } from '../../../core/id.js?v=20260921b';
import { badgeHtml } from '../../../components/badges.js?v=20260921b';
import { showToast, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260921b';
// ③批（支书 2026-09-06）：党小组会考勤候选 = 本组应到名单（党员非滞留）；
// 滞留者「可见但不可选」（灰态 + 「滞留」徽标 + title 备注，同纪检口径）
import { getMeetingRosterCandidates, getRosterStats } from '../../../services/roster.js?v=20260921b';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260921b';
import { currentLeaderGroup } from './_shared.js?v=20260921b';
import { autoGenerateMakeupTask } from '../../../services/makeup.js?v=20260921b';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260921b';

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
      a.status !== 'cancelled' && // dogfood 组长#5（2026-09-12）：已取消活动不再出现在上传下拉（此前可选中提交，落为无效考勤）
      canUploadAttendance(leaderId, a.id)
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 获取本组待补课人员
  const makeupTasks = loadMakeupTasks();
  const myGroupMakeupTasks = makeupTasks.filter(t =>
    myGroupMemberIds.includes(t.personId) && t.status !== 'completed'
  );

  // SOP-B-42（D-456）：纪检打回 / 出勤申诉 → 交活动组织方（本组长为上传位）核实确认。
  // 回退态两条来源：① 出勤申诉（成员报「我参加了但没记上」，纪检查实后打回）；
  //                 ② 纪检对已确认考勤直接打回的记录。两者都在此处回到组织者手里。
  const returnedAppeals = loadAttendanceAppeals().filter(a => a.status === 'returned' && canUploadAttendance(leaderId, a.activityId));
  const returnedRecords = loadActiveAttendanceRecords().filter(r => r.returnedBy && canUploadAttendance(leaderId, r.activityId));
  const pendingConfirm = [
    ...returnedAppeals.map(a => ({ kind: 'appeal', id: a.id, personId: a.personId, activityId: a.activityId, reason: a.returnNote || '', suggest: 'present' })),
    ...returnedRecords.map(r => ({ kind: 'record', id: r.id, personId: r.personId, activityId: r.activityId, reason: r.returnReason || '', suggest: (r.status === 'leave') ? 'leave' : ((r.status === 'present' || r.status === 'made_up') ? 'present' : 'absent') })),
  ];

  // 统一检索引擎（table 模式）：明细行按人检索——关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册），
  // 行数据按 personId 现取档案补齐分面字段（人名一律 getPersonName(id)，禁用记录内 personName 快照）
  const attRows = myAttendance.map(r => {
    const long = attendanceToLong([r])[0];
    const m = getPersonById(r.personId) || {};
    return {
      ...long,
      personId: r.personId,
      name: getPersonName(r.personId),
      studentId: m.studentId || '',
      partyGroup: m.partyGroup || '',
      developStage: m.developStage || '',
      role: m.role || '',
      residenceStatus: m.residenceStatus || '',
    };
  });

  const formHtml = _attFormVisible ? `
    <div class="mt-3 p-4 rounded-lg bg-white border border-gray-100 shadow-sm" id="att-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考勤表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择活动 <span class="text-red-600">*</span></label>
          <select id="att-activity-select" class="input-flat w-full">
            <option value="">请选择活动</option>
            ${eligibleActivities.length === 0 ? '<option value="" disabled>本组暂无可上传活动（仅本组党小组会与本组承办活动可上传）</option>' : ''}
            ${eligibleActivities.map(a => `<option value="${a.id}">${a.title}（${a.date}）${myAttendance.some(r => r.activityId === a.id) ? ' · 已上传' : ''}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mb-3">
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-xs text-gray-500 block font-medium">选择参会人员 <span class="text-red-600">*</span></label>
          <button type="button" id="att-clear-selection" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;" title="清空当前已选人员（含默认选中的报名者）">清空选择</button>
        </div>
        <div id="att-person-picker-container"></div>
      </div>
      <div id="att-signup-hint" class="mb-2 text-[11px] text-gray-500 leading-5"></div>
      <div id="att-roster-hint" class="mb-3 text-[11px] text-gray-500 leading-5"></div>
      <div id="att-status-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="att-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考勤</button>
        <button id="att-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-lg p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤上传</h3>
        <button class="btn-md" id="btn-leader-upload-att" style="${_accVars}background:${accentRgba};color:color-mix(in srgb, ${accent} 60%, #000);border:1px solid ${accentBorder};">${_attFormVisible ? '收起表单' : '上传考勤表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考勤：组织者上传 → 纪检委员确认 → 录入考勤明细。仅列本组党小组会/本人组织的活动（其余活动由该活动组织者上传；组长非组织者=本组监督位，督促上传）</div>
      ${formHtml}
      <div class="overflow-x-auto ${_attFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <div id="att-list-host"></div>
      </div>
      ${pendingConfirm.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">纪检打回 · 待你确认（${pendingConfirm.length}）</div>
        <div class="text-xs text-gray-500 mb-2">纪检核实后打回，请重新确认该场出勤（修改痕迹留存）；缺勤 / 请假仍会回到纪检复核队列。请假分<b>事假 / 病假</b>两档（<b>事假须提前 1 天申请、病假可事后补</b>——时效提示，不作校验），档别由纪检复核时认定</div>
        <div class="space-y-2">
          ${pendingConfirm.map(pc => {
            const act = loadActivities().find(a => a.id === pc.activityId);
            return `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-100">
              <span class="text-xs font-medium text-gray-800 min-w-[60px]">${esc(getPersonName(pc.personId))}</span>
              <span class="text-xs text-gray-500 flex-1 min-w-0 truncate" title="${esc(pc.reason)}">${esc(act ? act.title : '活动已下架')}${pc.reason ? ` · ${esc(pc.reason)}` : ''}</span>
              <select class="input-flat text-xs leader-return-status" data-kind="${pc.kind}" data-id="${pc.id}" aria-label="确认状态">
                <option value="present"${pc.suggest === 'present' ? ' selected' : ''}>出勤</option>
                <option value="absent"${pc.suggest === 'absent' ? ' selected' : ''}>缺勤</option>
                <option value="leave"${pc.suggest === 'leave' ? ' selected' : ''}>请假</option>
              </select>
              <button type="button" class="leader-return-confirm text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-kind="${pc.kind}" data-id="${pc.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">确认并提交</button>
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}
      ${myGroupMakeupTasks.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">待补课人员（${myGroup}）</div>
        <div class="text-xs text-gray-500 mb-2">本组有 ${myGroupMakeupTasks.length} 人缺勤，已生成补课任务</div>
        <div class="space-y-1.5">
          ${myGroupMakeupTasks.map(t => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white ${t.status === 'overdue' ? 'border border-red-100' : 'border border-orange-100'}">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-gray-800">${getPersonName(t.personId)}</span>
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

  // 统一检索引擎（table 模式：rowHtml 返回 <tr>，表格样式由 styles.css::.data-table 单一源提供）：
  // 关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册）；行数 ≤8 时引擎自动不渲染检索条。
  renderFilteredList(container.querySelector('#att-list-host'), {
    stateKey: 'leader-attendance-list',
    rows: attRows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    emptyMessage: '暂无考勤明细',
    table: {
      colSpan: 4,
      headHtml: `<tr>
            <th>姓名</th>
            <th>活动</th>
            <th>状态</th>
            <th>确认状态</th>
          </tr>`,
    },
    // 状态色按 statusKey（英文枚举）判定——attendanceToLong 的 status 为中文标签
    rowHtml: (a) => `
            <tr>
              <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(a.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(a.personId))}</a></td>
              <td class="text-gray-600">${a.activityId ? `<a class="text-blue-600 hover:underline" href="../activity.html?id=${a.activityId}">${esc(a.activity)}</a>` : esc(a.activity)}</td>
              <td><span class="px-1.5 py-0.5 rounded-full text-xs ${a.statusKey === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.statusKey === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.statusKey === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">${esc(a.status)}</span></td>
              <td class="text-gray-500">${a.confirmer === '—' ? '<span class="text-orange-700">待确认</span>' : '<span class="text-green-700">已确认</span>'}</td>
            </tr>`,
  });

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

  // 纪检打回 / 出勤申诉：组织者确认并重新提交（SOP-B-42 / D-456）——
  // 出勤/已补：源头审校即确认；缺勤/请假：回退态清除、回到纪检「待确认队列」复核。
  container.querySelectorAll('.leader-return-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const sel = container.querySelector(`.leader-return-status[data-kind="${kind}"][data-id="${id}"]`);
      const status = sel ? sel.value : 'present';
      // SOP-B-16⑤（2026-09-19 批次 94）：此处**只认状态**——「请假」写通用键 `leave`（显示「请假」），
      // 事假 / 病假的档别由纪检复核时认定（R1-2：标因由纪检认定），本处不代认档。
      const absenceReason = status === 'absent' ? 'unexcused' : 'leave';
      const { leaderId } = currentLeaderGroup();
      const res = kind === 'appeal'
        ? resolveAttendanceAppeal({ appealId: id, actorId: leaderId, status, absenceReason })
        : reconfirmReturnedRecord(id, { actorId: leaderId, status, absenceReason });
      if (!res.ok) { showToast('error', '确认失败：该记录不存在'); return; }
      showToast('success', status === 'present' ? '已确认出勤，考勤已更新（修改痕迹留存）' : '已重新提交，等待纪检复核');
      renderContent(ctx);
    });
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

  /**
   * 本场考勤候选的**默认选中集**（SOP-B-2 / `D-288`）：已通过报名者 ∩ 本场候选（剔除禁选项）。
   * 只是默认值——组织者可在选人面板里增删（「未报名而实际参加」照旧手选补进）。
   */
  function signupDefaultIds(activity, rosterCtx) {
    if (!activity) return [];
    const approved = getApprovedSignupPersonIds('activity', activity.id);
    if (approved.length === 0) return [];
    const disabled = new Set(rosterCtx ? rosterCtx.disabledIds : []);
    const candidates = rosterCtx ? rosterCtx.candidateIds : null;
    return approved.filter(pid => !disabled.has(pid) && (!candidates || candidates.has(pid)));
  }

  /** 按当前所选活动重建 PersonPicker（党小组会收紧候选；切换活动清空已选，重新引导选择） */
  function rebuildPicker() {
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    if (!pickerContainer) return;
    const activityId = activitySelect?.value;
    const activity = eligibleActivities.find(a => a.id === activityId) || null;
    const rosterCtx = rosterCtxFor(activity);
    // ③批（支书 2026-09-06）：党小组会候选 = 本组应到名单（组内党员 非滞留），
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
    // SOP-B-2 / D-288：默认选中本场已通过的报名者（保留组织者的调整空间）
    const defaultIds = signupDefaultIds(activity, rosterCtx);
    if (defaultIds.length > 0) _attPickerInstance.setSelected(defaultIds);
    _renderAttSignupHint(activity, defaultIds);
    _renderAttStatusRows(_attPickerInstance.getSelected());
  }

  // 清空选择（含默认选中的报名者）：默认值是起点、不是结论——给组织者一条明确的撤销路径
  container.querySelector('#att-clear-selection')?.addEventListener('click', () => {
    if (!_attPickerInstance) return;
    _attPickerInstance.clearSelection();
    _renderAttStatusRows([]);
  });

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
        id: generateId('att'),
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
    // 2026-09-18 批次 83（B-16）：补课判据收敛到 makeup.js::shouldGenerateMakeupTask——
    //   **不是所有异常都生成任务**（范围＝支部党员大会/党课，及活动级勾选要求补课的场次；
    //   请假且线上参会不补课）。故回执**按实际生成条数**报，不再一律说「已生成补课任务」。
    let makeupCount = 0;
    records.forEach(r => { if (autoGenerateMakeupTask(r)) makeupCount += 1; });

    if (added === 0 && blocked === 0 && skipped === 0) {
      showToast('error', '没有可上传的记录（活动不在您的上传位内）');
    } else {
      const parts = [`新增 ${added} 条`];
      if (skipped > 0) parts.push(`重复跳过 ${skipped} 条（已确认记录不可覆盖）`);
      if (blocked > 0) parts.push(`拦截 ${blocked} 条`);
      const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE).length;
      if (makeupCount > 0) parts.push(`${makeupCount} 条在补课范围内，已生成补课任务`);
      else if (absentCount > 0) parts.push(`${absentCount} 条异常待纪检复核（本场不在补课范围内，未生成补课任务）`);
      else parts.push('出勤已源头审校确认');
      showToast('success', `考勤上传：${parts.join('；')}`);
    }

    // 清理并刷新
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    renderContent(ctx);
  });
}

/** 报名默认选中提示（SOP-B-2 / D-288）：说清「默认值从哪来、可以改」，避免被读成「名单已定」 */
function _renderAttSignupHint(activity, defaultIds) {
  const hintEl = document.getElementById('att-signup-hint');
  if (!hintEl) return;
  if (!activity) { hintEl.innerHTML = ''; return; }
  const names = (defaultIds || []).map(pid => getPersonName(pid)).filter(Boolean);
  if (names.length === 0) {
    hintEl.innerHTML = '本场无已通过的报名者（默认不预选）；未报名而实际参加者，请在上方手动勾选。';
    return;
  }
  hintEl.innerHTML = `已默认选中本场<b class="text-gray-600">报名者 ${names.length} 人</b>（${esc(names.join('、'))}）——可手动增删（未报名而实际参加者请手动勾选），或点「清空选择」重来。`;
}

/** 组织者上传表单候选提示：党小组会 = 本组应到 + 滞留者标灰禁选；其余活动说明候选范围（同纪检口径） */
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
    ? '<span class="text-gray-500">无滞留成员</span>'
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
      // 2026-09-17 批次 49 更正一处**假成功**：本按钮只把状态下发到各行下拉（改 DOM），
      // 落库发生在随后点「提交考勤」时。原文案「已批量设为…」会让用户以为已保存、直接切页
      // ⇒ 改动丢失。按「不许在未确认落库时声称成功」改文案说清它只是**预置**。
      showToast('success', `已批量填入「${ATTENDANCE_STATUS_LABELS[batchVal]}」，点「提交考勤」后保存`);
    });
  }
}
