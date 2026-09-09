// role: [工程师]+[AI]
// 纪检委员工作台 Tab：考勤管理（T-279 M3 拆分 · T-304 重设计）
// 三段式：① 待确认队列（卡片式，进入即见，确认即闭环+聚焦下一条）
//        ② 考勤矩阵（「按活动」/「按人」互为转置；活动名搜索 + 时间区间筛选）
//        ③ 全量总表（分页铁律，低频操作：导出/打印/提交考勤至宣传）
// 设计裁定（书记 2026-08-29）：
//   - 两个视图是转置关系，不是 long/wide 长表与矩阵的区别
//   - 活动无上限 → 必须提供活动筛选（含时间区间）便于考察
//   - 条目不得使用浅色底板（书记反感）→ 白底 + 左侧状态色条

import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260909e';
import { attendanceToLong, loadAttendanceRecords, loadActiveAttendanceRecords, saveAttendanceRecords, canUploadAttendance, upsertMeetingAttendance, MEETING_ATTENDANCE_TYPES as MEETING_TYPES, ABSENCE_REASONS, recorderRolesOf, listGroupMeetingAttendance } from '../../../services/attendance.js?v=20260909e';
import { getPersonName } from '../../../services/person.js?v=20260909e';
// S1–S4 滞留党员设计（2026-09-06 书记已批）：会议考勤「应到清点/全选范围」= 应到名单口径
// （党员 正式+预备 且非滞留；滞留者「可见但禁用」、党课列席不计应到），不再全支部 50 人候选
// 附录⑩ A批·S1（2026-09-06 书记裁定）：滞留线下到场可「到场补录」计入到席（实际应到=预应到 K + 补录 L）
import { getMeetingRoster, getRosterStats, getMeetingRosterCandidates } from '../../../services/roster.js?v=20260909e';
import { solidAccentStyle, ROLE_LABELS } from '../../../core/constants.js?v=20260909e';
import { loadActivities } from '../../../services/activity.js?v=20260909e';
import { autoGenerateMakeupTask } from '../../../services/makeup.js?v=20260909e';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260909e';
import { NoticeStore } from '../../../services/notice.js?v=20260909e';
import { enhanceSelects } from '../../../components/custom-select.js?v=20260909e';
import { badgeHtml } from '../../../components/badges.js?v=20260909e';
import { showToast, downloadCSV, triggerPrint, _fmtDate, escHtml as esc } from '../../../core/utils.js?v=20260909e';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260909e';
import { HandoffStore } from '../../../services/handoff.js?v=20260909e';
import { AuthStore } from '../../../services/auth.js?v=20260909e';
import { PersonPicker } from '../../../components/person-picker.js?v=20260909e';

const PAGE_SIZE = 20; // 分页铁律：全量总表每页 20 条
let _page = 1;        // 模块级分页状态（随模块自持）

/** U3（2026-09-07）：矩阵/总表容器首帧骨架占位行（真实表格 rAF 后渐进填充，防整块弹出） */
function _attSectionSkeletonHtml() {
  const row = '<div class="h-8 rounded bg-gray-100 animate-pulse"></div>';
  return `<div class="space-y-1.5 py-1">${row}${row}${row}${row}</div>`;
}

/** 状态缩写 + 色点（矩阵单元格用：色点 + 2 字缩写，风格对齐日历） */
const CELL_META = {
  [AttendanceStatus.PRESENT]: { dot: '#16A34A', label: '出' },
  [AttendanceStatus.ABSENT]:  { dot: '#EF4444', label: '缺' },
  [AttendanceStatus.LEAVE]:   { dot: '#F59E0B', label: '假' },
  [AttendanceStatus.MADE_UP]: { dot: '#14B8A6', label: '补' },
};

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const filterActivityId = ctx?.attendanceFilterActId || null;

  const allRecords = loadActiveAttendanceRecords();
  const longData = attendanceToLong(allRecords);
  const actById = new Map(loadActivities().map(a => [a.id, a]));

  // ── 待确认集合（队列）：异常驱动（T-304 第5轮 · 源头审校+异常驱动）
  // 准则：出勤/已补视为上传方已审校（自动确认，不进队列）；纪检只处理异常（缺勤/请假，含超期）。
  const isRegular = r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP;
  const now = new Date();
  const pendingRecs = allRecords.filter(r =>
    !r.recordedBy && !isRegular(r)
  );
  const overdueRecs = allRecords.filter(r => {
    if (r.recordedBy || isRegular(r)) return false;
    const act = actById.get(r.activityId);
    return act && act.date && new Date(act.date) < now;
  });
  const seenQ = new Set();
  const queueItems = [...pendingRecs, ...overdueRecs].filter(r => {
    if (seenQ.has(r.id)) return false;
    seenQ.add(r.id);
    return true;
  });
  const queueLeave = pendingRecs.filter(r => r.status === AttendanceStatus.LEAVE).length;
  const queueAbsent = pendingRecs.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const queueOverdue = overdueRecs.length;
  // 出勤/已补未确认 → 视为已审校自动确认（源头审校：上传方已把关，纪检只核异常）
  const autoConfirmedCount = allRecords.filter(r => !r.recordedBy && isRegular(r)).length;

  const filterBanner = filterActivityId
    ? `<div class="mb-3 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between">
        <span class="text-xs text-blue-700">已聚焦：${(actById.get(filterActivityId)?.title || '该活动')}（${actById.get(filterActivityId)?.date || ''}）的考勤</span>
        <button class="text-xs text-blue-600 hover:text-blue-800 disc-clear-filter" style="cursor:pointer;">清除聚焦</button>
      </div>`
    : '';

  // ════════════════════════════════════════════════════════════════
  //  三段式渲染
  // ════════════════════════════════════════════════════════════════
  container.innerHTML = `
    ${filterBanner}
    ${_buildQueueHTML(queueItems, queueLeave, queueAbsent, queueOverdue, autoConfirmedCount, accent, accentBorder, actById)}
    ${_buildMeetingCardHTML(ctx, accent, accentBorder, actById)}
    ${_buildMatrixCardHTML(ctx, allRecords, actById, filterActivityId, accent, accentRgba, accentBorder)}
    ${_buildTableCardHTML(ctx, allRecords, longData, actById, filterActivityId, accent, accentRgba, accentBorder)}
    ${_buildGroupMeetingReadonlyHTML()}
  `;

  // ── 队列确认：确认 → 计数递减 → 聚焦下一条 ──
  container.querySelector('.disc-clear-filter')?.addEventListener('click', () => {
    ctx.attendanceFilterActId = null;
    renderContent(ctx);
  });

  container.querySelectorAll('.btn-confirm-att').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const records = loadAttendanceRecords();
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      record.recordedBy = DISC_COMMISSIONER_ID;
      saveAttendanceRecords(records);
      // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, record.activityId);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${record.activityId}`);
      // 考勤确认后自动生成补课任务
      autoGenerateMakeupTask(record);
      // 自动广播（混合模式落地·场景2）：确认后通知组织委员——系统已自动归档至考察档案
      try {
        NoticeStore.add({
          title: '考勤已确认并归档',
          content: `「${actById.get(record.activityId)?.title || '活动'}」考勤已由纪检确认，系统已自动归档至考察档案，组织委员可直接读取使用。`,
          priority: 'normal',
          targetUrl: 'workspace/org.html',
        });
      } catch (e) { console.warn('[disc-attendance] 归档广播失败（不影响确认）：', e); }
      showToast('success', `已确认「${getPersonName(record.personId)}」${actById.get(record.activityId)?.title || ''}考勤`);
      renderContent(ctx);
      // 焦点反馈：仍有待确认时滚动到队列区并聚焦下一条
      const nextPending = loadActiveAttendanceRecords().filter(r => !r.recordedBy);
      if (nextPending.length > 0) {
        const qEl = container.querySelector('#att-queue');
        if (qEl) qEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  // 队列「展开全部 / 收起」（最小信息成本：默认只暴露 8 条）
  container.querySelector('#att-queue-more')?.addEventListener('click', () => {
    _queueExpanded = !_queueExpanded;
    renderContent(ctx);
  });

  // ── 会议考勤录入（纪检，CF §C.1a：纪检直接上传并录入；A1-2026-09-05）──
  // 保态折叠：表单已渲染（#disc-meet-body 在 DOM）时，收起/展开只切该容器 hidden——
  // 不销毁 _meetPickerInstance、不重建 innerHTML，已选活动/人员/逐人状态保留；
  // 队列确认等外部 re-render 仍按 _meetFormVisible 原逻辑整容器重建（重建即重新展开
  // 并重建 picker、丢手选，属既有行为，可接受——保态折叠只覆盖用户手动折叠/展开路径）。
  container.querySelector('#disc-meet-toggle')?.addEventListener('click', () => {
    const bodyEl = container.querySelector('#disc-meet-body');
    if (!bodyEl) { // 首次打开（表单未渲染）：走 _meetFormVisible 打开并渲染表单 + 创建 picker
      _meetFormVisible = true;
      renderContent(ctx);
      return;
    }
    const collapsed = bodyEl.classList.toggle('hidden');
    const btn = container.querySelector('#disc-meet-toggle');
    if (btn) btn.textContent = collapsed ? '录入会议考勤' : '收起';
  });
  // 取消 = 保态折叠（保留已选，不销毁 picker）；仅提交成功后才重置会话（见下方 submit 成功分支）
  container.querySelector('#disc-meet-cancel')?.addEventListener('click', () => {
    const bodyEl = container.querySelector('#disc-meet-body');
    if (!bodyEl) return;
    bodyEl.classList.add('hidden');
    const btn = container.querySelector('#disc-meet-toggle');
    if (btn) btn.textContent = '录入会议考勤';
  });
  if (_meetFormVisible) {
    _initMeetForm(container, accent);
  }
  // 全选应到名单 / 清空（S1–S4 书记已批）：picker 无内置全选，按应到名单（党员非滞留）setSelected——
  // 不再全选支部 50 人（滞留/非党员/党课列席不计应到，党委组织员 p_pc 等非本支部党员亦不在候选）
  container.querySelector('#disc-meet-select-all')?.addEventListener('click', () => {
    if (!_meetPickerInstance) return;
    const rosterIds = _currentMeetingRoster().map(p => p.id);
    _meetPickerInstance.setSelected(rosterIds);
    _renderDiscMeetStatusRows(rosterIds);
    showToast('info', `已全选应到名单 ${rosterIds.length} 人，可逐人调整状态后提交`);
  });
  container.querySelector('#disc-meet-clear')?.addEventListener('click', () => {
    if (!_meetPickerInstance) return;
    _meetPickerInstance.clearSelection();
    _renderDiscMeetStatusRows([]);
  });
  // 纪检更正：切换活动后按该活动已录记录重渲染逐人状态行（保留已选人员与状态调整）
  // 附录⑩ A批·S1：切换活动同时重置「滞留到场补录」勾选（按新活动已录补录预填）并刷新应到口径
  container.querySelector('#disc-meet-activity')?.addEventListener('change', () => {
    const ids = _meetPickerInstance ? _meetPickerInstance.getSelected() : [];
    _prefillMakeupForActivity();
    _renderDiscMeetStatusRows(ids);
    _renderDiscMeetRosterHint();
    _renderDiscMeetDetainedMakeup();
  });
  container.querySelector('#disc-meet-submit')?.addEventListener('click', () => {
    const activityId = container.querySelector('#disc-meet-activity')?.value;
    if (!activityId) { showToast('error', '请选择会议活动'); return; }
    const selectedIds = _meetPickerInstance ? _meetPickerInstance.getSelected() : [];
    // 滞留到场补录集合（纪检单独勾选；与全选应到互斥，重复防御）
    const makeupIds = [..._meetMakeupIds].filter(pid => !selectedIds.includes(pid));
    if (selectedIds.length === 0 && makeupIds.length === 0) { showToast('error', '请选择参会人员，或在「滞留党员到场补录」勾选线下到场者'); return; }
    const actorId = AuthStore.getCurrentUser()?.personId || DISC_COMMISSIONER_ID;
    const records = [];
    for (const pid of selectedIds) {
      const status = (container.querySelector(`#disc-meet-status-${pid}`)?.value) || AttendanceStatus.PRESENT;
      const r = {
        id: 'att_' + Date.now() + '_' + pid,
        personId: pid,
        activityId,
        status,
        overdue: false,
      };
      // 附录⑩ A批·S1 · R1-2：未到（缺勤/请假）须带纪检认定标因（固定枚举，禁造新枚举）
      if (status !== AttendanceStatus.PRESENT && status !== AttendanceStatus.MADE_UP) {
        r.absenceReason = (container.querySelector(`#disc-meet-reason-${pid}`)?.value) || _defaultReasonFor(status);
      }
      records.push(r);
    }
    // 附录⑩ A批·S1 · R1-3：滞留线下到场 → 补录为「应到」（status=present + detainedMakeup 标记，
    // 计入到席 L；档案等既有读取按在场展示，不破坏）
    for (const pid of makeupIds) {
      records.push({
        id: 'att_' + Date.now() + '_mk_' + pid,
        personId: pid,
        activityId,
        status: AttendanceStatus.PRESENT,
        detainedMakeup: true,
        overdue: false,
      });
    }
    // 纪检更正（方案A）：overwrite=true 允许覆盖本人已录记录；回执按 新增/更正/跳过 分项
    const res = upsertMeetingAttendance({ actorId, records }, { overwrite: true });
    if (res.added > 0 || res.updated > 0) {
      records.forEach(r => autoGenerateMakeupTask(r));
      const makeupNote = makeupIds.length > 0 ? ` · 滞留到场补录 ${makeupIds.length}` : '';
      showToast('success', `会议考勤提交成功：新增 ${res.added} · 更正 ${res.updated} · 跳过 ${res.skipped}${makeupNote}（纪检直接确认/更正）`);
      // 提交成功后才重置会话（收起表单、销毁 picker、清空已选与补录勾选）
      _meetFormVisible = false;
      _meetMakeupIds.clear();
      if (_meetPickerInstance) { _meetPickerInstance.destroy(); _meetPickerInstance = null; }
      renderContent(ctx);
    } else {
      // 无可写入（提交未成功）：保留会话与已选，供改选活动/人员后再次提交
      showToast('error', res.skipped > 0 ? '无可写入：所选均为他人权威已录记录（不可覆盖）或无上传权限的活动' : '没有可录入的记录');
    }
  });

  // ── 矩阵转置切换 + 活动名/时间区间筛选 ──
  let matrixView = 'byActivity'; // byActivity（行=活动）| byPerson（行=人）
  const renderMatrix = () => _renderMatrix(matrixView, actById, allRecords, ctx, accent, accentBorder);
  container.querySelectorAll('.att-mtx-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // UI-A（2026-09-07）：激活态=主题浅底+主题色字/边框（独立小圆角钮，无衬不再用 ov-sub-tab-active）
      container.querySelectorAll('.att-mtx-view-btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('bg-[var(--app-accent-bg)]', on);
        b.classList.toggle('border-[var(--app-accent)]', on);
        b.classList.toggle('text-[var(--app-accent)]', on);
        b.classList.toggle('bg-white', !on);
        b.classList.toggle('border-neutral-200', !on);
        b.classList.toggle('text-gray-600', !on);
      });
      matrixView = btn.dataset.view;
      renderMatrix();
    });
  });
  container.querySelector('#att-mtx-search')?.addEventListener('input', () => renderMatrix());
  container.querySelector('#att-mtx-from')?.addEventListener('change', () => renderMatrix());
  container.querySelector('#att-mtx-to')?.addEventListener('change', () => renderMatrix());
  // T223 保留：活动下拉聚焦（URL activityId 落点同源，选中即聚焦该活动考勤）
  container.querySelector('#att-activity-select')?.addEventListener('change', () => {
    const v = document.getElementById('att-activity-select')?.value;
    ctx.attendanceFilterActId = v || null;
    renderContent(ctx);
  });

  // ── 全量总表：搜索/状态筛选/分页 ──
  const renderTable = () => _renderTable(longData, allRecords, actById, accent, accentBorder, ctx);
  container.querySelector('#att-table-search')?.addEventListener('input', () => { _page = 1; renderTable(); });
  container.querySelector('#att-table-status')?.addEventListener('change', () => { _page = 1; renderTable(); });
  container.querySelector('#att-table-prev')?.addEventListener('click', () => { _page = Math.max(1, _page - 1); renderTable(); });
  container.querySelector('#att-table-next')?.addEventListener('click', () => { _page += 1; renderTable(); });

  // ── 低频操作行：导出 / 打印 / 提交考勤至宣传 ──
  container.querySelector('.att-export-btn')?.addEventListener('click', () => {
    const stamp = _fmtDate(new Date());
    const rows = applyTableFilter(longData, allRecords, actById).map(a => {
      const act = actById.get(allRecords.find(r => r.id === a.id)?.activityId);
      const rec = allRecords.find(r => r.id === a.id);
      const autoConfirmed = rec && !rec.recordedBy && (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.MADE_UP);
      return [act?.date ? act.date.slice(0, 7) : '未排期', a.name, a.activity, a.type, a.status, autoConfirmed ? '自动确认' : a.confirmer];
    });
    downloadCSV(`考勤总表_${stamp}.csv`, ['月份', '姓名', '活动', '类别', '状态', '确认人'], rows);
    showToast('success', `考勤总表已导出（${rows.length} 条）`);
  });
  container.querySelector('.att-print-btn')?.addEventListener('click', () => triggerPrint());
  container.querySelector('.att-handoff-btn')?.addEventListener('click', () => {
    if (HandoffStore.hasPendingFor('attendance-archival', 'attendance')) {
      showToast('info', '考勤已提交待宣传备案，请勿重复提交');
      return;
    }
    const unconfirmed = allRecords.filter(r => !r.recordedBy).length;
    if (unconfirmed > 0) {
      showToast('error', `尚有 ${unconfirmed} 条考勤未确认，请先确认后再提交备案`);
      return;
    }
    HandoffStore.create({
      type: 'attendance-archival',
      refType: 'attendance',
      refLabel: '考勤总表',
      refId: 'attendance',
      note: `考勤总表共 ${allRecords.length} 条，纪检确认后提交宣传备案`,
    });
    showToast('success', '考勤已提交至宣传委员，等待备案确认');
    renderContent(ctx);
  });

  // U3（2026-09-07）「队列区先行、大区渐进」：待确认队列/会议录入等卡结构与队列首帧同步渲染；
  // 矩阵与全量总表（大 DOM）容器先骨架占位，真实表格 rAF 下一帧填充（防一次性整块 DOM 造成首帧卡顿/弹出）。
  // 表格 fill 在容器仍连接时执行（快速切 tab 宿主被重建则跳过）；enhanceSelects 同步（防下拉形态晚帧变化）。
  enhanceSelects(container);
  requestAnimationFrame(() => {
    const mEl = document.getElementById('att-matrix-container');
    const tEl = document.getElementById('att-table-container');
    if (mEl && mEl.isConnected) renderMatrix();
    if (tEl && tEl.isConnected) renderTable();
  });
}

// ════════════════════════════════════════════════════════════════
//  ① 待确认队列（异常驱动 · 极简白底无边框无条纹 · 默认 8 条折叠）
//  T-304 第5轮：仅异常（缺勤/请假，含超期）进队列；出勤/已补源头已审校不占队列
// ════════════════════════════════════════════════════════════════
const QUEUE_VISIBLE = 8; // 最小信息成本：默认只暴露最近需处理的少量条目
let _queueExpanded = false;
// A1-2026-09-05：纪检会议考勤录入（CF §C.1a 会议考勤：纪检直接上传并录入）
// 保态折叠（2026-09-05 quick-fix）：收起/取消只切 #disc-meet-body 的 hidden——
// 不销毁 _meetPickerInstance、不重建 innerHTML，已选活动/人员/逐人状态保留；
// 仅在「提交成功」后才重置会话（见 submit 成功分支）。
let _meetFormVisible = false;
let _meetPickerInstance = null;
// 附录⑩ A批·S1（2026-09-06）：「滞留党员到场补录」勾选集合（纪检单独勾选；随活动切换重置、
// 提交成功清空）。滞留者默认不计应到（候选内灰态禁选），线下到场经此补录计入到席（实际应到=K+L）。
let _meetMakeupIds = new Set();
// 会议考勤上传位的活动类型：单源 = services/attendance.js MEETING_ATTENDANCE_TYPES（开源超参数，可调）

/** 未到（缺勤/请假）的默认标因键（纪检认定枚举；缺席→无故、请假→请假，可再改选其它） */
function _defaultReasonFor(status) {
  if (status === AttendanceStatus.ABSENT) return 'unexcused';
  if (status === AttendanceStatus.LEAVE) return 'leave';
  return '';
}

/**
 * 按当前选中活动预填滞留到场补录集合：已录补录（detainedMakeup=true）且当下仍滞留的成员 → 默认勾选，
 * 供纪检更正/复核同活动历史补录；改回在校者不再入补录（正常走应到名单）。
 */
function _prefillMakeupForActivity() {
  _meetMakeupIds = new Set();
  const activityId = document.getElementById('disc-meet-activity')?.value;
  if (!activityId) return;
  const { disabledIds } = getMeetingRosterCandidates({ type: _currentMeetActivityType() });
  const detainedSet = new Set(disabledIds);
  loadAttendanceRecords().forEach(r => {
    if (r.activityId === activityId && r.detainedMakeup && detainedSet.has(r.personId)) _meetMakeupIds.add(r.personId);
  });
}

function _buildQueueHTML(items, leaveCount, absentCount, overdueCount, autoConfirmedCount, accent, accentBorder, actById) {
  const visible = _queueExpanded ? items : items.slice(0, QUEUE_VISIBLE);
  const total = items.length;
  const listHtml = total === 0
    ? `<div class="py-5 text-center">
        <div class="text-sm font-medium text-gray-700 mb-1">无待处理异常 ✓</div>
        <div class="text-xs text-gray-400">出勤/已补已源头审校自动确认${autoConfirmedCount > 0 ? `（${autoConfirmedCount} 条）` : ''}，缺勤/请假已全部确认</div>
      </div>`
    : `<div class="space-y-1.5">${visible.map(r => {
        const act = actById.get(r.activityId);
        const color = r.status === AttendanceStatus.ABSENT ? '#EF4444' : '#F59E0B';
        return `
        <div class="flex items-center gap-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-800">${getPersonName(r.personId)}</span>
              ${r.status === AttendanceStatus.ABSENT ? badgeHtml('缺勤', 'danger') : badgeHtml('请假', 'warning')}
              ${r.overdue || (act && act.date && new Date(act.date) < new Date()) ? badgeHtml('超期', 'danger') : ''}
            </div>
            <div class="text-xs text-gray-400 truncate mt-0.5">${act ? act.title : '活动已下架'}${act?.date ? ' · ' + act.date : ''}</div>
          </div>
          <button class="btn-confirm-att text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-record-id="${r.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">确认</button>
        </div>`;
      }).join('')}
      ${total > QUEUE_VISIBLE ? `
        <button id="att-queue-more" class="w-full text-xs text-gray-400 hover:text-gray-600 py-2 rounded-lg transition-colors" style="cursor:pointer;">
          ${_queueExpanded ? '收起' : `展开全部（${total} 条）`}
        </button>` : ''}
      </div>`;

  return `
    <div id="att-queue" class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">待确认考勤</h3>
        <div class="flex gap-3 text-xs">
          <span class="text-gray-600">请假 <span class="font-bold text-orange-700">${leaveCount}</span></span>
          <span class="text-gray-600">缺勤 <span class="font-bold text-red-700">${absentCount}</span></span>
          <span class="text-gray-600">超期 <span class="font-bold text-amber-700">${overdueCount}</span></span>
          ${autoConfirmedCount > 0 ? `<span class="text-gray-400">出勤自动确认 <span class="font-bold text-green-600">${autoConfirmedCount}</span></span>` : ''}
        </div>
      </div>
      ${listHtml}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  A1-2026-09-05 会议考勤录入（纪检：会议类考勤直接上传并录入，上传即确认）
//  CF §C.1a「会议考勤：上传/修改/确认/录入 = 纪检」；党小组会归组长/组织者，不在此列
// ════════════════════════════════════════════════════════════════
function _buildMeetingCardHTML(ctx, accent, accentBorder, actById) {
  const meetings = loadActivities()
    .filter(a => !a.archived && MEETING_TYPES.includes(a.type) && canUploadAttendance(DISC_COMMISSIONER_ID, a.id))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const accentStyle = solidAccentStyle(accent, accentBorder);
  const toggleBtn = `<button class="btn-md" id="disc-meet-toggle" style="${accentStyle}cursor:pointer;">${_meetFormVisible ? '收起' : '录入会议考勤'}</button>`;

  let body = '';
  if (_meetFormVisible) {
    // 稳定容器 #disc-meet-body（保态折叠挂点）：收起/取消只切 hidden，不重建 innerHTML、不销毁 picker
    const bodyInner = meetings.length === 0
      ? `<div class="py-3 text-xs text-gray-400">当前无会议类活动（党课/支部党员大会/组织生活会/支委会）可录入</div>`
      : `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">会议活动 <span class="text-red-500">*</span></label>
          <select id="disc-meet-activity" class="input-flat w-full">
            ${meetings.map(m => `<option value="${m.id}">${m.title}（${m.date}）</option>`).join('')}
          </select>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-gray-500 block font-medium">参会人员（逐人状态） <span class="text-red-500">*</span></label>
            <div class="flex gap-2">
              <button type="button" id="disc-meet-select-all" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;" title="仅全选应到名单（党员正式+预备且非滞留）">全选应到名单</button>
              <button type="button" id="disc-meet-clear" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;">清空</button>
            </div>
          </div>
          <div id="disc-meet-picker"></div>
        </div>
      </div>
      <div id="disc-meet-roster-hint" class="mb-2 text-[11px] text-gray-400 leading-5"></div>
      <div id="disc-meet-makeup-strip" class="mb-3"></div>
      <div id="disc-meet-status-rows" class="space-y-2 mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="disc-meet-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${accentStyle}cursor:pointer;">提交录入</button>
        <button id="disc-meet-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
      <div class="mt-3 text-[11px] text-gray-400">纪检直接录入即确认（recordedBy=纪检）；未到（缺勤/请假）者须选标因（请假/无故/其它，纪检认定·固定枚举）；滞留线下到场者勾选「到场补录」计入到席（落「滞留·到场」标记）；已录条目将覆盖（纪检更正）· 新增/更正/跳过计数见提交回执</div>`;
    body = `<div id="disc-meet-body">${bodyInner}</div>`;
  }

  return `
    <div class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">会议考勤录入</h3>
        ${toggleBtn}
      </div>
      <div class="text-xs text-gray-500 mb-3">会议类考勤（党课/支部党员大会/组织生活会/支委会）由纪检直接上传并录入总表；党小组会考勤由组长上传、纪检确认（记录人=本组组长）。应到口径（书记裁定）：<b>预应到 K</b>（在册党员 − 滞留剔除；党课列席不计应到）→ 滞留到场补录 <b>L</b> → <b>实际应到 = K+L</b>；候选中滞留者默认不计（灰态可见原因），「全选应到名单」不含滞留，线下到场由纪检于下方单独勾选「到场补录」</div>
      ${body}
    </div>
  `;
}

/** 表单当前选中活动的类型（读活动下拉；未选择返回 null） */
function _currentMeetActivityType() {
  const activityId = document.getElementById('disc-meet-activity')?.value;
  if (!activityId) return null;
  return loadActivities().find(a => a.id === activityId)?.type || null;
}

/** 当前会议（表单内均为纪检上传位类型：党课/支部大会/组织生活会/支委会）的应到名单 */
function _currentMeetingRoster() {
  return getMeetingRoster({ type: _currentMeetActivityType() });
}

/** 应到口径提示（附录⑩ A批·S1 · R1-3）：预应到 K → 滞留到场补录 L → 实际应到 K+L；滞留者默认不计（灰态可见原因） */
function _renderDiscMeetRosterHint() {
  const hintEl = document.getElementById('disc-meet-roster-hint');
  if (!hintEl) return;
  const type = _currentMeetActivityType();
  const stats = getRosterStats({ type });
  const K = stats.expected;
  const L = _meetMakeupIds.size;
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type });
  const disabledSet = new Set(disabledIds);
  const detained = candidates.filter(p => disabledSet.has(p.id));
  const detainedHtml = detained.length === 0
    ? '<span class="text-gray-400">无滞留党员</span>'
    : detained.map(p => `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 align-middle"
        title="${esc(p.residenceNote || '滞留：组织关系保留、应到剔除、通知照发')}">${esc(p.name)} · 滞留</span>`).join(' ');
  hintEl.innerHTML = `
    <span>应到口径：预应到 <b class="text-gray-600">K=${K}</b>（在册党员 ${stats.partyTotal} − 滞留剔除 ${stats.detainedParty}；党课列席不计应到）→ 滞留到场补录 <b class="text-amber-700">L=${L}</b> → 实际应到 <b class="text-gray-800">K+L=${K + L}</b>（补录者计「到席」，档案按在场展示）</span>
    <span class="block mt-1">滞留者默认不计应到（候选内灰态可见原因，title 悬浮查看备注）：${detainedHtml}——线下到场由纪检在下方「滞留党员到场补录」单独勾选，不随「全选应到名单」</span>`;
}

/** 滞留党员到场补录区（纪检单独勾选；勾选计入到席 L 并徽标「滞留·到场」，仍附原因 title） */
function _renderDiscMeetDetainedMakeup() {
  const strip = document.getElementById('disc-meet-makeup-strip');
  if (!strip) return;
  const activityId = document.getElementById('disc-meet-activity')?.value;
  if (!activityId) { strip.innerHTML = ''; return; }
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: _currentMeetActivityType() });
  const disabledSet = new Set(disabledIds);
  const detained = candidates.filter(p => disabledSet.has(p.id));
  if (detained.length === 0) {
    strip.innerHTML = '<div class="text-[11px] text-gray-400">滞留党员到场补录：本活动范围无滞留党员（无需补录）</div>';
    return;
  }
  strip.innerHTML = `
    <div class="text-[11px] font-medium text-gray-500 mb-2">滞留党员到场补录（纪检认定：线下到场 → 勾选计入到席；不随「全选应到名单」）</div>
    <div class="flex flex-wrap gap-2">
      ${detained.map(p => {
        const checked = _meetMakeupIds.has(p.id);
        return `
        <label class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors cursor-pointer select-none ${checked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}"
          title="${esc(p.residenceNote || '滞留：组织关系保留、应到剔除、通知照发')}">
          <input type="checkbox" id="disc-meet-makeup-${p.id}" ${checked ? 'checked' : ''} class="accent-amber-600" style="cursor:pointer;">
          <span class="text-xs font-medium text-gray-700">${esc(p.name)}</span>
          <span class="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 align-middle">滞留</span>
          ${checked ? badgeHtml('滞留·到场', 'warning') : ''}
        </label>`;
      }).join('')}
    </div>`;
  strip.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const pid = cb.id.replace('disc-meet-makeup-', '');
      if (cb.checked) _meetMakeupIds.add(pid); else _meetMakeupIds.delete(pid);
      _renderDiscMeetDetainedMakeup(); // 重绘勾选态徽标
      _renderDiscMeetRosterHint();      // 实时刷新 L / K+L
    });
  });
}

function _initMeetForm(container, accent) {
  const pickerContainer = container.querySelector('#disc-meet-picker');
  if (!pickerContainer) return;
  if (_meetPickerInstance) { _meetPickerInstance.destroy(); _meetPickerInstance = null; }
  // 书记 2026-09-06 ①批：滞留者「可见但不可选」（逐人禁用）——候选不再 filter 剔除滞留者，
  // 而是「党员（含滞留）全可见 + disabledIds 禁选」：纪检能看到"此人为何不在应到"（灰态 +
  // 「滞留」徽标 + title 备注）；党课列席/非党员仍不可见。候选随表单每次重建刷新（成员状态
  // 维护后即时生效）。「全选应到名单」按钮走 setSelected(rosterIds) → 只选可用项（picker 内
  // 禁用 id 一律不入选中集，批量全选不破坏）。
  // 附录⑩ A批·S1 ③（2026-09-06）：滞留线下到场 → 「到场补录」勾选（见 _renderDiscMeetDetainedMakeup）
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: _currentMeetActivityType() });
  const candidateIds = new Set(candidates.map(p => p.id));
  _meetPickerInstance = new PersonPicker({
    mode: 'multi',
    placeholder: '选择参会人员',
    accentColor: accent,
    // 原「按阶段批量」面向全支部 50 人候选（含党课列席）→ 应到口径下无列席可选，
    // 批量录入改由「全选应到名单」按钮承载（stageBatch=false 不再渲染空转 chips）
    stageBatch: false,
    filter: (p) => candidateIds.has(p.id),
    disabledIds,
    disabledLabel: () => '滞留',
    disabledTitle: (p) => `滞留：${p.residenceNote || '组织关系保留、应到剔除、通知照发'}`,
    onSelect: (ids) => { _renderDiscMeetStatusRows(ids); },
  });
  _meetPickerInstance.render(pickerContainer);
  _prefillMakeupForActivity(); // 纪检更正/复核：按当前活动已录补录预填勾选
  _renderDiscMeetRosterHint();
  _renderDiscMeetDetainedMakeup();
  _renderDiscMeetStatusRows([]);
}

/** 逐人状态下拉候选项（会议考勤三态；「已补」仅当已录原状态为已补时追加，保证预填不改原值） */
const MEET_STATUS_OPTIONS = [
  { value: AttendanceStatus.PRESENT, label: '出勤' },
  { value: AttendanceStatus.ABSENT, label: '缺勤' },
  { value: AttendanceStatus.LEAVE, label: '请假' },
];

function _renderDiscMeetStatusRows(selectedIds) {
  const rowsContainer = document.getElementById('disc-meet-status-rows');
  if (!rowsContainer) return;
  if (selectedIds.length === 0) { rowsContainer.innerHTML = ''; return; }
  // 纪检更正（方案A 2026-09-06）：按当前选中活动加载已录记录——已录者状态下拉预填原状态（行尾标「已录·更正」），未录者默认出勤
  // 附录⑩ A批·S1 · R1-2（2026-09-06）：未到（缺勤/请假）行尾追加纪检认定「标因」下拉（固定枚举：请假/无故/其它，禁造新枚举）
  const activityId = document.getElementById('disc-meet-activity')?.value;
  const existByPerson = new Map(
    loadAttendanceRecords()
      .filter(r => r.activityId === activityId)
      .map(r => [r.personId, r])
  );
  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人出勤状态</div>
    <div class="space-y-2 max-h-48 overflow-y-auto">
      ${selectedIds.map(pid => {
        const pre = existByPerson.get(pid);
        const preStatus = pre?.status;
        const options = [...MEET_STATUS_OPTIONS];
        if (preStatus && !options.some(o => o.value === preStatus)) {
          options.push({ value: preStatus, label: ATTENDANCE_STATUS_LABELS[preStatus] || preStatus });
        }
        const curStatus = preStatus || AttendanceStatus.PRESENT;
        const showReason = curStatus === AttendanceStatus.ABSENT || curStatus === AttendanceStatus.LEAVE;
        const reasonValue = (pre?.absenceReason && ABSENCE_REASONS.some(x => x.key === pre.absenceReason))
          ? pre.absenceReason
          : _defaultReasonFor(curStatus);
        return `
        <div class="flex items-center gap-3 p-2 rounded-lg bg-white">
          <span class="text-sm font-medium text-gray-800 min-w-[60px]">${getPersonName(pid)}</span>
          <select id="disc-meet-status-${pid}" class="input-flat">
            ${options.map(o => `<option value="${o.value}" ${curStatus === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
          <span class="reason-group-${pid} inline-flex items-center gap-1 ${showReason ? '' : 'hidden'}">
            <span class="text-[11px] text-gray-400 whitespace-nowrap">标因</span>
            <select id="disc-meet-reason-${pid}" class="input-flat" title="未到标因（纪检认定：请假/无故/其它）">
              ${ABSENCE_REASONS.map(x => `<option value="${x.key}" ${reasonValue === x.key ? 'selected' : ''}>${x.label}</option>`).join('')}
            </select>
          </span>
          ${preStatus ? '<span class="text-[10px] text-amber-600 whitespace-nowrap">已录·更正</span>' : ''}
        </div>`;
      }).join('')}
    </div>`;
  // 标因显隐随状态联动：出勤/已补隐藏；缺勤/请假显示并同步默认标因（缺席→无故、请假→请假，纪检可再改）
  rowsContainer.querySelectorAll('select[id^="disc-meet-status-"]').forEach(sel => {
    sel.addEventListener('change', () => {
      const pid = sel.id.replace('disc-meet-status-', '');
      const groupEl = rowsContainer.querySelector(`.reason-group-${pid}`);
      if (!groupEl) return;
      const notAttending = sel.value === AttendanceStatus.ABSENT || sel.value === AttendanceStatus.LEAVE;
      groupEl.classList.toggle('hidden', !notAttending);
      if (notAttending) {
        const reasonSel = rowsContainer.querySelector(`#disc-meet-reason-${pid}`);
        if (reasonSel) reasonSel.value = _defaultReasonFor(sel.value);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  ② 考勤矩阵（「按活动」/「按人」互为转置 + 活动名/时间区间筛选）
// ════════════════════════════════════════════════════════════════
function _buildMatrixCardHTML(ctx, allRecords, actById, filterActivityId, accent, accentRgba, accentBorder) {
  const acts = loadActivities()
    .filter(a => allRecords.some(r => r.activityId === a.id))
    .filter(a => !filterActivityId || a.id === filterActivityId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const actOptions = acts
    .map(a => `<option value="${a.id}" ${filterActivityId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`)
    .join('');

  return `
    <div class="card rounded-lg p-5 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤矩阵</h3>
        <!-- UI-A（2026-09-07）：互斥视图切换回退=独立小圆角钮组（去胶囊底衬；激活=主题浅底+主题色字/边框，data-view 逻辑照旧） -->
        <div class="flex items-center gap-2">
          <button class="att-mtx-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-[var(--app-accent-bg)] border-[var(--app-accent)] text-[var(--app-accent)]" data-view="byActivity">按活动</button>
          <button class="att-mtx-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-white border-neutral-200 text-gray-600 hover:bg-gray-50" data-view="byPerson">按人</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mb-3">
        <select id="att-activity-select" class="input-flat min-w-[180px]">
          <option value="">全部活动</option>
          ${actOptions}
        </select>
        <input type="text" id="att-mtx-search" class="input-flat min-w-[160px]" placeholder="活动名筛选...">
        <input type="date" id="att-mtx-from" class="input-flat" title="时间区间：起始日期">
        <span class="text-xs text-gray-400 self-center">至</span>
        <input type="date" id="att-mtx-to" class="input-flat" title="时间区间：截止日期">
      </div>
      <div class="text-[11px] text-gray-400 mb-2">色点 + 缩写：${Object.entries(CELL_META).map(([k, m]) => `<span class="inline-flex items-center gap-1 mr-2"><span class="w-2 h-2 rounded-full" style="background:${m.dot}"></span>${ATTENDANCE_STATUS_LABELS[k]}</span>`).join('')}</div>
      <div id="att-matrix-container"></div>
    </div>
  `;
}

/** 活动筛选：活动名包含 + 时间区间（起止） */
function _filterActivities(acts, actById) {
  const searchEl = document.getElementById('att-mtx-search');
  const fromEl = document.getElementById('att-mtx-from');
  const toEl = document.getElementById('att-mtx-to');
  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const from = fromEl ? fromEl.value : '';
  const to = toEl ? toEl.value : '';
  return acts.filter(a => {
    if (q && !(a.title || '').toLowerCase().includes(q)) return false;
    if (from && a.date && a.date < from) return false;
    if (to && a.date && a.date > to) return false;
    return true;
  });
}

function _renderMatrix(matrixView, actById, allRecords, ctx, accent, accentBorder) {
  const tc = document.getElementById('att-matrix-container');
  if (!tc) return;
  // 时间降序：活动按日期最新在前（按活动视图最新在最上；按人视图最新在最左）
  const acts = loadActivities()
    .filter(a => a.status !== 'cancelled' && !a.archived)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const visibleActs = _filterActivities(acts, actById);
  // 矩阵数据：人 × 活动 → 状态（无记录 = 空）
  const personIds = [...new Set(allRecords.map(r => r.personId))];
  const cellOf = (personId, activityId) => allRecords.find(r => r.personId === personId && r.activityId === activityId);

  // T-304 第5轮：矩阵回归只读分析（去确认操作/去待确认标记，职责单一化）
  const cellHtml = (personId, activityId) => {
    const rec = cellOf(personId, activityId);
    if (!rec) return '<td class="py-1.5 px-2 text-center text-gray-300">—</td>';
    const m = CELL_META[rec.status];
    return `<td class="py-1.5 px-2 text-center" title="${getPersonName(rec.personId)} · ${ATTENDANCE_STATUS_LABELS[rec.status]}">
      <span class="inline-flex items-center gap-1">
        <span class="w-2 h-2 rounded-full" style="background:${m.dot}"></span><span class="text-xs text-gray-600">${m.label}</span>
      </span>
    </td>`;
  };

  if (matrixView === 'byActivity') {
    // 行 = 活动，列 = 人
    const rows = visibleActs.map(a => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-2 px-3 whitespace-nowrap sticky left-0 bg-white">
          <div class="text-xs font-medium text-gray-800 max-w-[180px] truncate" title="${a.title}">${a.title}</div>
          <div class="text-[11px] text-gray-400">${a.date || ''}</div>
        </td>
        ${personIds.map(pid => cellHtml(pid, a.id)).join('')}
      </tr>`).join('');
    tc.innerHTML = `
      <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white">活动</th>
            ${personIds.map(pid => `<th class="py-2 px-2 text-center text-gray-500 font-medium whitespace-nowrap">${getPersonName(pid)}</th>`).join('')}
          </tr></thead>
          <tbody>${rows || '<tr><td class="py-6 text-center text-gray-400 text-xs" colspan="2">无匹配活动（请调整筛选）</td></tr>'}</tbody>
        </table>
      </div>`;
  } else {
    // 行 = 人，列 = 活动（与「按活动」互为转置）
    const rows = personIds.map(pid => `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-2 px-3 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">${getPersonName(pid)}</td>
        ${visibleActs.map(a => cellHtml(pid, a.id)).join('')}
      </tr>`).join('');
    tc.innerHTML = `
      <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white">姓名</th>
            ${visibleActs.map(a => `<th class="py-2 px-2 text-center text-gray-500 font-medium whitespace-nowrap max-w-[96px]"><div class="truncate" title="${a.title}">${a.title}</div><div class="text-[10px] text-gray-300">${a.date || ''}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows || '<tr><td class="py-6 text-center text-gray-400 text-xs" colspan="2">无考勤数据</td></tr>'}</tbody>
        </table>
      </div>`;
  }
}

// ════════════════════════════════════════════════════════════════
//  ③ 全量总表（分页铁律 · 低频操作：导出/打印/提交考勤）
// ════════════════════════════════════════════════════════════════
function _buildTableCardHTML(ctx, allRecords, longData, actById, filterActivityId, accent, accentRgba, accentBorder) {
  const total = longData.length;
  // 待确认 = 仅异常（缺勤/请假）未确认；出勤/已补源头审校自动确认不计入
  const isRegular = r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP;
  const totalPending = allRecords.filter(r => !r.recordedBy && !isRegular(r)).length;
  const totalAuto = allRecords.filter(r => !r.recordedBy && isRegular(r)).length;
  return `
    <div class="card rounded-lg p-5">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div class="flex items-center gap-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤总表</h3>
          <div class="flex gap-2 text-xs">
            <span class="text-gray-600">共 <span class="font-bold text-gray-800">${total}</span> 条</span>
            <span class="text-gray-600">待确认 <span class="font-bold text-orange-700">${totalPending}</span></span>
            ${totalAuto > 0 ? `<span class="text-gray-400">自动确认 <span class="font-bold text-green-600">${totalAuto}</span></span>` : ''}
            ${HandoffStore.hasPendingFor('attendance-archival', 'attendance') ? '<span class="text-teal-600 font-medium">待宣传备案</span>' : ''}
          </div>
        </div>
        <!-- U5b（2026-09-07）：低频操作钮统一 32px 圆角（与分页钮/下拉同高同 border 家族，hover 统一 bg-gray-50） -->
        <div class="flex items-center gap-2">
          <button class="att-export-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">导出 CSV</button>
          <button class="att-print-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">打印</button>
          <button class="att-handoff-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">提交考勤至宣传</button>
        </div>
      </div>
      <!-- U5b（2026-09-07）：搜索输入 + 状态下拉（enhanceSelects 后为 cs-trigger）统一 text-xs 紧凑档，与 h-8 工具钮同高 -->
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input type="text" id="att-table-search" class="input-flat text-xs flex-1 min-w-[160px]" placeholder="搜索姓名或活动...">
        <select id="att-table-status" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          ${Object.values(AttendanceStatus).map(s => `<option value="${s}">${ATTENDANCE_STATUS_LABELS[s]}</option>`).join('')}
        </select>
      </div>
      <div id="att-table-container">${_attSectionSkeletonHtml()}</div>
      <div class="flex items-center justify-between mt-3">
        <span class="text-xs text-gray-400" id="att-table-info"></span>
        <div class="inline-flex items-center">
          <button id="att-table-prev" class="h-8 px-3.5 rounded-l-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">上一页</button>
          <button id="att-table-next" class="h-8 px-3.5 rounded-r-lg border border-gray-200 border-l-0 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">下一页</button>
        </div>
      </div>
    </div>
  `;
}

function applyTableFilter(longData, allRecords, actById) {
  const searchEl = document.getElementById('att-table-search');
  const statusEl = document.getElementById('att-table-status');
  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const s = statusEl ? statusEl.value : '';
  return longData.filter(r => {
    if (q && !(r.name || '').toLowerCase().includes(q) && !(r.activity || '').toLowerCase().includes(q)) return false;
    // 修复：attendanceToLong 的 status 为中文标签，须用 statusKey（英文枚举）比较；
    // 双值兼容：单选 value 为英文枚举，r.statusKey 与之同构（T-304 实测修复）
    if (s && r.statusKey !== s) return false;
    return true;
  });
}

function _renderTable(longData, allRecords, actById, accent, accentBorder, ctx) {
  const tc = document.getElementById('att-table-container');
  if (!tc) return;
  const display = applyTableFilter(longData, allRecords, actById);
  const totalPages = Math.max(1, Math.ceil(display.length / PAGE_SIZE));
  if (_page > totalPages) _page = totalPages;
  const pageRows = display.slice((_page - 1) * PAGE_SIZE, _page * PAGE_SIZE);

  tc.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead><tr class="border-b border-gray-200">
          <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
          <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
          <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          <th class="py-2 px-3 text-left text-gray-500 font-medium">确认人</th>
          <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
        </tr></thead>
        <tbody>${pageRows.map(a => {
          const rec = allRecords.find(r => r.id === a.id);
          const isRegularRec = rec && (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.MADE_UP);
          const isPending = a.confirmer === '—';
          const autoConfirmed = isPending && isRegularRec; // 出勤/已补源头审校自动确认
          const statusColor = a.status === AttendanceStatus.PRESENT ? 'text-green-700' : a.status === AttendanceStatus.ABSENT ? 'text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'text-teal-700' : 'text-orange-700';
          return `
          <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
            <td class="py-2 px-3 text-gray-600">${a.activity}</td>
            <td class="py-2 px-3"><span class="${statusColor}">${a.status}</span></td>
            <td class="py-2 px-3 text-gray-500">${autoConfirmed ? '<span class="text-green-600">自动确认</span>' : (isPending ? '<span class="text-orange-600">待确认</span>' : `<span class="text-green-600">${a.confirmer}</span>`)}</td>
            <td class="py-2 px-3">${isPending && !autoConfirmed ? `<button class="btn-confirm-att text-xs px-2.5 py-1 rounded-lg text-white transition-colors hover:opacity-90" data-record-id="${a.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">确认</button>` : (autoConfirmed ? '<span class="text-xs text-gray-400">自动</span>' : '<span class="text-xs text-green-600">✓</span>')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
  `;
  document.getElementById('att-table-info') && (document.getElementById('att-table-info').textContent = `${display.length} 条 · 第 ${_page}/${totalPages} 页`);
  document.getElementById('att-table-prev') && (document.getElementById('att-table-prev').disabled = _page <= 1);
  document.getElementById('att-table-next') && (document.getElementById('att-table-next').disabled = _page >= totalPages);

  // 总表确认按钮（复用队列确认逻辑，绑定到对应记录）
  tc.querySelectorAll('.btn-confirm-att').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const records = loadAttendanceRecords();
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      record.recordedBy = DISC_COMMISSIONER_ID;
      saveAttendanceRecords(records);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, record.activityId);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${record.activityId}`);
      autoGenerateMakeupTask(record);
      showToast('success', `已确认「${getPersonName(record.personId)}」考勤`);
      renderContent(ctx);
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  ④ 党小组会考勤（纪检纪律台只读掌握）— 附录⑩ A批·S1 裁定④（2026-09-06）
//  组长上传（记录人=本组组长，submittedBy 可辨）；纪检只读查看：不代传、不在此审改；
//  异常（缺勤/请假）处理走上方「待确认考勤」队列。无写口；挂在考勤总表下方只读区，
//  不新增工作台 tab（能力清单不变）。
// ════════════════════════════════════════════════════════════════
function _buildGroupMeetingReadonlyHTML() {
  const groups = listGroupMeetingAttendance();
  const statusColor = (s) => s === AttendanceStatus.PRESENT ? 'text-green-700'
    : s === AttendanceStatus.MADE_UP ? 'text-teal-700'
    : s === AttendanceStatus.ABSENT ? 'text-red-700' : 'text-orange-700';
  const recorderSemantic = recorderRolesOf('党小组会').map(r => ROLE_LABELS[r] || r).join('/');
  const listHtml = groups.length === 0
    ? '<div class="py-5 text-center text-xs text-gray-400">暂无党小组会考勤记录（组长上传后此处只读展示）</div>'
    : groups.map(g => {
        const abnormal = g.total - g.present;
        const trs = g.rows.map(r => `
          <tr class="border-b border-gray-50">
            <td class="py-1.5 px-3 text-xs font-medium text-gray-800">${esc(r.name)}</td>
            <td class="py-1.5 px-3 text-xs"><span class="${statusColor(r.status)}">${esc(r.statusLabel)}</span></td>
            <td class="py-1.5 px-3 text-[11px] text-gray-500">${r.detainedMakeup ? badgeHtml('滞留·到场', 'warning') : (r.absenceReasonLabel ? esc(r.absenceReasonLabel) : '<span class="text-gray-300">—</span>')}</td>
          </tr>`).join('');
        const headerChips = [
          g.groupName ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">${esc(g.groupName)}</span>` : '',
          g.leaderName ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">组长 ${esc(g.leaderName)}</span>` : '',
          g.uploaderName ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">上传 ${esc(g.uploaderName)}</span>` : '<span class="text-[11px] text-gray-300">上传 —</span>',
        ].filter(Boolean).join(' ');
        return `
        <div class="border border-gray-100 rounded-lg mb-2 overflow-hidden">
          <div class="flex items-center justify-between flex-wrap gap-1 px-3 py-2 bg-gray-50">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold text-gray-800">${esc(g.title)}</span>
              <span class="text-[11px] text-gray-400">${esc(g.date)}</span>
              ${headerChips}
            </div>
            <div class="text-[11px] text-gray-500">到席 <b class="text-green-700">${g.present}</b> · 异常 <b class="${abnormal > 0 ? 'text-red-700' : 'text-gray-400'}">${abnormal}</b> · 共 ${g.total}</div>
          </div>
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-100 bg-white">
              <th class="py-1.5 px-3 text-left text-gray-400 font-medium">姓名</th>
              <th class="py-1.5 px-3 text-left text-gray-400 font-medium">状态</th>
              <th class="py-1.5 px-3 text-left text-gray-400 font-medium">备注（标因/补录）</th>
            </tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>`;
      }).join('');
  return `
    <div class="card rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">党小组会考勤（纪检只读掌握）</h3>
      </div>
      <div class="text-[11px] text-gray-400 leading-5 mb-3">党小组会考勤由<b>本组组长</b>上传（记录人=${recorderSemantic}，submittedBy 可辨；记录人映射单一源 = policy recorderByType）；纪检纪律台<b>只读查看、不代传、不在此审改</b>——异常（缺勤/请假）请在「待确认考勤」队列处理，改/删走纪检确认流程</div>
      ${listHtml}
    </div>
  `;
}
