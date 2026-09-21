// role: [工程师]+[AI]
// 纪检委员工作台 Tab：考勤管理（T-279 M3 拆分 · T-304 重设计）
// 一级分段（2026-09-15 支书裁定）：考勤 / 补课——互斥分段钮置顶。
//   「补课」分段整段复用 makeup-tab 渲染（补课原为独立 tab，并入本 tab）；「?tab=makeup」旧深链兼容见 renderContent 首段。
// 「考勤」分段三段式：① 待确认队列（卡片式，进入即见，确认即闭环+聚焦下一条）
//        ② 考勤矩阵（人×活动 二元关系单一源组件 relation-matrix：行=人/列=活动 与 行=活动/列=人 互为转置；
//           **默认「按人」宽表**——支书 2026-09-14 批次 35 裁定「long form 不该为主」；项目维列封顶最近 6 项，
//           可一键展开全部；活动名搜索 + 时间区间筛选）
//        ③ 全量总表（分页铁律，低频操作：导出/打印/提交考勤至宣传）——即 long form，定位＝明细/导出下钻
// 设计裁定（支书 2026-08-29）：
//   - 两个视图是转置关系，不是 long/wide 长表与矩阵的区别
//   - 活动无上限 → 必须提供活动筛选（含时间区间）便于考察
//   - 条目不得使用浅色底板（支书反感）→ 白底 + 左侧状态色条

import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260922a';
import { generateId } from '../../../core/id.js?v=20260922a';
import { attendanceToLong, loadAttendanceRecords, loadActiveAttendanceRecords, saveAttendanceRecords, canUploadAttendance, upsertMeetingAttendance, MEETING_ATTENDANCE_TYPES as MEETING_TYPES, ABSENCE_REASONS, absenceReasonLabel, absenceReasonNote, recorderRolesOf, listGroupMeetingAttendance, loadAttendanceAppeals, returnAttendanceAppeal, closeAttendanceAppeal, returnAttendanceRecord, summarizeAttendanceByActivity } from '../../../services/attendance.js?v=20260922a';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260922a';
// S1–S4 滞留党员设计（2026-09-06 支书已批）：会议考勤「应到清点/全选范围」= 应到名单口径
// （党员 正式+预备 且非滞留；滞留者「可见但禁用」、党课列席不计应到），不再全支部 50 人候选
// 附录⑩ A批·S1（2026-09-06 支书裁定）：滞留线下到场可「到场补录」计入到席（实际应到=预应到 K + 补录 L）
import { getMeetingRoster, getRosterStats, getMeetingRosterCandidates } from '../../../services/roster.js?v=20260922a';
import { solidAccentStyle, ROLE_LABELS, isActivityArchived, isActivityLive } from '../../../core/constants.js?v=20260922a';
import { loadActivities } from '../../../services/activity.js?v=20260922a';
// SOP-B-2（D-288）：考勤候选默认选中「已通过报名者」——报名名单的来源单一源 = SignupStore
import { getApprovedSignupPersonIds } from '../../../services/signup.js?v=20260922a';
import { autoGenerateMakeupTask } from '../../../services/makeup.js?v=20260922a';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260922a';
import { NoticeStore } from '../../../services/notice.js?v=20260922a';
import { enhanceSelects } from '../../../components/custom-select.js?v=20260922a';
import { badgeHtml } from '../../../components/badges.js?v=20260922a';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
// pagerHtml = 翻页控件单一源（批次 38：全站手写翻页一律并轨；叶子件，避免与矩阵相互成环）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260922a';
import { pagerHtml } from '../../../components/pager.js?v=20260922a';
// 人×项目矩阵单一源（支书 2026-09-14 批次 35 裁定：宽表默认 + 矩阵推广）
import { renderRelationMatrix } from '../../../components/relation-matrix.js?v=20260922a';
import { showToast, downloadCSV, triggerPrint, _fmtDate, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260922a';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260922a';
import { HandoffStore } from '../../../services/handoff.js?v=20260922a';
import { AuthStore } from '../../../services/auth.js?v=20260922a';
import { PersonPicker } from '../../../components/person-picker.js?v=20260922a';
// 「补课」分段整段复用原独立 tab 的渲染（2026-09-15 支书裁定：补课并入考勤管理，内部逻辑不改写）
import { renderContent as renderMakeupContent } from './makeup-tab.js?v=20260922a';

const PAGE_SIZE = 20; // 分页铁律：全量总表每页 20 条
let _page = 1;        // 模块级分页状态（随模块自持）

// ── 一级分段（考勤 / 补课）——模块级记忆（沿既有 tab 内 _view 模式）──
// 「考勤」分段保留原有全部视图钮（待确认队列/会议录入/矩阵/总表/党小组会只读）；
// 「补课」分段渲染 makeup-tab 全部功能（补课任务清单/确认回写考勤/交接回执/检索分页）。
let _segment = 'attendance';
// 深链一次性消费标记：?tab=makeup（补课原为独立 tab）→ 落「补课」分段；
// 同一导航对象只应用一次，用户随后切分段不再被回置（见 renderContent 首段）。
let _deepLinkNavTarget = null;

/** 分段钮激活态类（沿用本台矩阵视图钮笔法：主题浅底 + 主题色字/边框，不新增 CSS 类族） */
const SEG_ON_CLASSES = ['bg-[var(--app-accent-bg)]', 'border-[var(--app-accent)]', '[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]'];
const SEG_OFF_CLASSES = ['bg-white', 'border-neutral-200', 'text-gray-600'];

/** 一级分段钮组 HTML（考勤 / 补课，互斥） */
function _segmentBarHtml() {
  const btn = (seg, label) => {
    const on = _segment === seg;
    const cls = on ? SEG_ON_CLASSES.join(' ') : `${SEG_OFF_CLASSES.join(' ')} hover:bg-gray-50`;
    const style = on ? ' style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)"' : '';
    return `<button type="button" class="att-seg-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${cls}" data-seg="${seg}"${style}>${label}</button>`;
  };
  return `<div class="flex items-center gap-2 mb-4">${btn('attendance', '考勤')}${btn('makeup', '补课')}</div>`;
}

function _bindSegmentBtns(container, ctx) {
  container.querySelectorAll('.att-seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.seg === _segment) return;
      _segment = b.dataset.seg;
      renderContent(ctx);
    });
  });
}

/**
 * 供其它入口（待办跳转等）指定一级分段（模块级记忆；调用方在切本 tab 之前调用）。
 * @param {'attendance'|'makeup'} seg
 */
export function focusSegment(seg) {
  if (seg === 'attendance' || seg === 'makeup') _segment = seg;
}

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

  // 深链兼容（?tab=makeup，补课原为独立 tab）：一次性消费导航目标 → 直落「补课」分段。
  const navObj = ctx && ctx.navTarget;
  if (navObj && navObj.tab === 'makeup' && _deepLinkNavTarget !== navObj) {
    _deepLinkNavTarget = navObj;
    _segment = 'makeup';
  }

  // 「补课」分段：整段复用 makeup-tab 渲染（补课任务清单／确认完成回写考勤／交接回执／统一检索分页）
  if (_segment === 'makeup') {
    container.innerHTML = `${_segmentBarHtml()}<div id="att-segment-body"></div>`;
    _bindSegmentBtns(container, ctx);
    renderMakeupContent(container.querySelector('#att-segment-body'));
    return;
  }

  const { accent, accentRgba, accentBorder } = ctx;
  const filterActivityId = ctx?.attendanceFilterActId || null;

  const allRecords = loadActiveAttendanceRecords();
  const longData = attendanceToLong(allRecords);
  const actById = new Map(loadActivities().map(a => [a.id, a]));

  // ── 待确认集合（队列）：异常驱动（T-304 第5轮 · 源头审校+异常驱动）
  // 准则：出勤/已补视为上传方已审校（自动确认，不进队列）；纪检只处理异常（缺勤/请假，含超期）。
  // SOP-B-42（`D-456`）：**已打回**的记录不进纪检队列——回退态交活动组织方重新确认（见队列卡下方只读区）。
  const isRegular = r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP;
  const now = new Date();
  const pendingRecs = allRecords.filter(r =>
    !r.recordedBy && !isRegular(r) && !r.returnedBy
  );
  const overdueRecs = allRecords.filter(r => {
    if (r.recordedBy || isRegular(r) || r.returnedBy) return false;
    const act = actById.get(r.activityId);
    return act && act.date && new Date(act.date) < now;
  });
  const seenQ = new Set();
  const queueItems = [...pendingRecs, ...overdueRecs].filter(r => {
    if (seenQ.has(r.id)) return false;
    seenQ.add(r.id);
    return true;
  });
  // 已打回（回退态）：待活动组织方重新确认；纪检此处只读掌握（SOP-B-10 未闭环项）
  const returnedRecs = allRecords.filter(r => r.returnedBy);
  // 出勤申诉（成员「我参加了但没记上」→ 纪检先核实 → 属实打回组织者；`D-456`）
  const appeals = loadAttendanceAppeals();
  const pendingAppeals = appeals.filter(a => a.status === 'pending');
  const returnedAppeals = appeals.filter(a => a.status === 'returned');
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
    ${_segmentBarHtml()}
    <div id="att-segment-body">
      ${filterBanner}
      ${_buildQueueHTML(queueItems, returnedRecs, queueLeave, queueAbsent, queueOverdue, autoConfirmedCount, accent, accentBorder, actById)}
      ${_buildAppealCardHTML(pendingAppeals, returnedAppeals, actById, accent, accentBorder)}
      ${_buildMeetingCardHTML(ctx, accent, accentBorder, actById)}
      ${_buildMatrixCardHTML(ctx, allRecords, actById, filterActivityId, accent, accentRgba, accentBorder)}
      ${_buildTableCardHTML(ctx, allRecords, longData, actById, filterActivityId, accent, accentRgba, accentBorder)}
      ${_buildGroupMeetingReadonlyHTML()}
    </div>
  `;
  _bindSegmentBtns(container, ctx);

  // 党小组会考勤只读表（统一检索引擎：按人检索 + 分面；≤8 行自动不渲染检索条）
  _renderGroupMeetingReadonly(container);

  // ── 队列确认：打包确认（SOP-B-41 / `D-455`）——纪检勾一批 → 一次确认（不逐条）──
  container.querySelector('.disc-clear-filter')?.addEventListener('click', () => {
    ctx.attendanceFilterActId = null;
    renderContent(ctx);
  });

  // 打包确认（整批确认）：与逐条确认同一副作用，落盘一次
  container.querySelector('.att-batch-confirm')?.addEventListener('click', () => {
    const ids = [...container.querySelectorAll('.att-queue-check')]
      .filter(cb => cb.checked)
      .map(cb => cb.dataset.recordId);
    if (ids.length === 0) { showToast('error', '请先勾选要确认的考勤'); return; }
    const n = _confirmAttendanceBatch(ids, actById);
    if (n > 0) showToast('success', `已打包确认 ${n} 条考勤（整批确认，不逐条）`);
    else showToast('error', '所选考勤均已确认或不存在');
    renderContent(ctx);
  });
  // 勾选状态只改「未勾选」集合、只刷新汇总条（不整块重渲染，避免丢滚动位置）
  _bindQueueCheckboxes(container);
  container.querySelector('#att-queue-select-all')?.addEventListener('click', () => {
    container.querySelectorAll('.att-queue-check').forEach(cb => {
      cb.checked = true;
      if (cb.dataset.recordId) _queueUnchecked.delete(cb.dataset.recordId);
    });
    _syncBatchBar(container);
  });
  container.querySelector('#att-queue-clear')?.addEventListener('click', () => {
    container.querySelectorAll('.att-queue-check').forEach(cb => {
      cb.checked = false;
      if (cb.dataset.recordId) _queueUnchecked.add(cb.dataset.recordId);
    });
    _syncBatchBar(container);
  });

  // ── 出勤申诉（SOP-B-42 / `D-456`）：核实属实 → 打回组织者；不属实 → 关闭 ──
  container.querySelectorAll('.att-appeal-return').forEach(btn => {
    btn.addEventListener('click', () => {
      const note = window.prompt('打回说明（可留空）——属实漏记将交活动组织方核实补录：', '');
      if (note === null) return; // 取消
      const res = returnAttendanceAppeal(btn.dataset.appealId, { by: DISC_COMMISSIONER_ID, note });
      if (res.ok) showToast('success', res.hadRecord ? '已打回该考勤，交活动组织方重新确认' : '已打回，交活动组织方核实补录');
      else showToast('error', '该申诉已处理');
      renderContent(ctx);
    });
  });
  container.querySelectorAll('.att-appeal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const res = closeAttendanceAppeal(btn.dataset.appealId, { by: DISC_COMMISSIONER_ID });
      if (res.ok) showToast('success', '该申诉已关闭（核实不属实或已另行处理）');
      else showToast('error', '该申诉已处理');
      renderContent(ctx);
    });
  });

  // 队列「展开全部 / 收起」（最小信息成本：默认只暴露 8 条）
  container.querySelector('#att-queue-more')?.addEventListener('click', () => {
    _queueExpanded = !_queueExpanded;
    renderContent(ctx);
  });

  // ── 会议考勤录入（上传位＝该场会议组织者；2026-09-21 批次 124 收归组织者；A1-2026-09-05）──
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
  // 全选应到名单 / 清空（S1–S4 支书已批）：picker 无内置全选，按应到名单（党员非滞留）setSelected——
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
    // SOP-B-2（D-288）：换活动 → 默认选中随该场「已通过报名者」重算（纪检仍可自由增删）
    _applyMeetSignupDefaults();
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
        id: generateId('att'),
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
        id: generateId('att'),
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
      showToast('success', `会议考勤提交成功：新增 ${res.added} · 更正 ${res.updated} · 跳过 ${res.skipped}${makeupNote}（录入即确认/更正）`);
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
  // 批次 35（支书 2026-09-14 裁定「宽表默认」）：默认「按人」——一进 tab 先看「谁参加了哪些活动」
  let matrixView = 'byPerson'; // byPerson（行=人，列=活动，宽表默认）| byActivity（行=活动，列=人）
  const renderMatrix = () => _renderMatrix(matrixView, actById, allRecords, ctx, accent, accentBorder);
  container.querySelectorAll('.att-mtx-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // UI-A（2026-09-07）：激活态=主题浅底+主题色字/边框（独立小圆角钮，无衬不再用 ov-sub-tab-active）
      container.querySelectorAll('.att-mtx-view-btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('bg-[var(--app-accent-bg)]', on);
        b.classList.toggle('border-[var(--app-accent)]', on);
        b.classList.toggle('[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]', on);
        if (on) b.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)'); else b.style.removeProperty('--acc-text-dark');
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
  // 翻页（委托一次：`#att-table-pager` 由卡片模板持有、内容重绘不影响绑定；读 data-lf-page）
  container.querySelector('#att-table-pager')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lf-page]');
    if (!btn || btn.disabled) return;
    _page = parseInt(btn.dataset.lfPage, 10) || 1;
    renderTable();
  });

  // ── 低频操作行：导出 / 打印 / 提交考勤统计至支委会 ──
  container.querySelector('.att-export-btn')?.addEventListener('click', () => {
    const stamp = _fmtDate(new Date());
    // SOP-B-20（D-331）：字段取母本与系统两侧的**并集**、**第一列是人**——
    //   姓名 / 学号 / 发展阶段 / 所属党小组（人员侧，现取人员库）＋ 活动 / 类别 / 状态 / 确认人（系统侧）。
    const rows = applyTableFilter(longData, allRecords, actById).map(a => {
      const rec = allRecords.find(r => r.id === a.id);
      const autoConfirmed = rec && !rec.recordedBy && (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.MADE_UP);
      return [a.name, a.studentId, a.developStage, a.partyGroup, a.activity, a.type, a.status, autoConfirmed ? '自动确认' : a.confirmer];
    });
    downloadCSV(`考勤汇总_${stamp}.csv`, ['姓名', '学号', '发展阶段', '所属党小组', '活动', '类别', '状态', '确认人'], rows);
    showToast('success', `考勤汇总已导出（${rows.length} 条）`);
  });
  container.querySelector('.att-print-btn')?.addEventListener('click', () => triggerPrint());
  // SOP-B-35（`D-412` / `D-479`）：出勤率汇总件＝本月的**支委会内部使用**件（现状只有算与展示，无发布出口）。
  // 支书 2026-09-20 定案（批次 116）：公示的范围与对象＝**支委会 ＋ 当事人本人**——**不对全支部公示、不对外**；
  // 本导出件供支委会内部使用；当事人本人只在自己的成员台「考勤概况」看**自己的**出勤率（`summarizePersonAttendance`）。
  container.querySelector('.att-rate-export-btn')?.addEventListener('click', () => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const sum = summarizeAttendanceByActivity({ month });
    const rows = sum.rows.map(r => [r.activity, r.date, r.type, r.total, r.present, r.leave, r.absent, `${r.rate}%`]);
    rows.push(['本月合计', '', '', sum.total, sum.presentTotal, '', '', `${sum.rate}%`]);
    downloadCSV(`出勤率汇总_支委会内部_${month}.csv`, ['活动', '日期', '类别', '应记人次', '出勤（含已补）', '请假', '缺勤', '出勤率'], rows);
    showToast('success', `本月出勤率汇总已导出（支委会内部使用，${sum.rows.length} 场 · 合计 ${sum.rate}%）`);
  });
  container.querySelector('.att-handoff-btn')?.addEventListener('click', () => {
    if (HandoffStore.hasPendingFor('attendance-archival', 'attendance')) {
      showToast('info', '考勤统计已提交待支委会接收，请勿重复提交');
      return;
    }
    // 未确认口径与队列/总表**同源**（D-455：出勤/已补＝源头审校自动确认，不进待确认）——
    // 原口径把所有无 recordedBy 的记录都算「未确认」，连自动确认的出勤/已补也算在内，
    // 于是「提交考勤统计至支委会」在正常数据下永远被拦（本次改准）。
    const unconfirmed = allRecords.filter(r => !r.recordedBy && !isRegular(r)).length;
    if (unconfirmed > 0) {
      showToast('error', `尚有 ${unconfirmed} 条异常考勤未确认，请先确认后再报送`);
      return;
    }
    HandoffStore.create({
      type: 'attendance-archival',
      refType: 'attendance',
      refLabel: '考勤统计',
      refId: 'attendance',
      // SOP-B-36（D-429）：交付对象＝**支委会**（母本「全周期考勤统计交付支委会」），
      // 不再提交宣传备案；补课记录随考勤一并归档（系统自动同步，不另设个人「归档审查」动作）。
      note: `考勤统计共 ${allRecords.length} 条（含补课记录，随考勤一并归档），提交支委会`,
    });
    showToast('success', '考勤统计已提交至支委会，等待组织委员接收');
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
// 打包确认（SOP-B-41 / `D-455`）：纪检勾一批 → 一次确认（不逐条）。
// 记「未勾选」集合而非「已勾选」——新增待确认项默认纳入本批（打包＝默认整批）。
let _queueUnchecked = new Set();
// A1-2026-09-05：会议考勤录入（2026-09-21 批次 124：上传位＝该场会议组织者；CF §C.1a 会议考勤）
// 保态折叠（2026-09-05 quick-fix）：收起/取消只切 #disc-meet-body 的 hidden——
// 不销毁 _meetPickerInstance、不重建 innerHTML，已选活动/人员/逐人状态保留；
// 仅在「提交成功」后才重置会话（见 submit 成功分支）。
let _meetFormVisible = false;
let _meetPickerInstance = null;
// 附录⑩ A批·S1（2026-09-06）：「滞留党员到场补录」勾选集合（纪检单独勾选；随活动切换重置、
// 提交成功清空）。滞留者默认不计应到（候选内灰态禁选），线下到场经此补录计入到席（实际应到=K+L）。
let _meetMakeupIds = new Set();
// 会议考勤的类型清单：单源 = services/attendance.js MEETING_ATTENDANCE_TYPES（开源超参数，可调）；
// 上传位**按会议类型分**（2026-09-21 批次 132 · 支书口径一，修正批次 124 的「一律组织者」）：
//   党课 / 支部党员大会＝纪检（本卡）；党小组会 / 组织生活会 / 主题党日＝该场组织者；支委会不考勤。
//   本表只用于「列哪些类型算会议考勤」，逐场放行仍由 canUploadAttendance 判定。

/** 未到（缺勤/请假）的默认标因键（纪检认定枚举；缺席→无故、请假→**事假**，可再改选病假/其它）
 *  （SOP-B-16⑤，2026-09-19 批次 94：请假分事假 / 病假两档，默认取事假，纪检按实际改档） */
function _defaultReasonFor(status) {
  if (status === AttendanceStatus.ABSENT) return 'unexcused';
  if (status === AttendanceStatus.LEAVE) return 'leave_personal';
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

function _buildQueueHTML(items, returnedRecs, leaveCount, absentCount, overdueCount, autoConfirmedCount, accent, accentBorder, actById) {
  const visible = _queueExpanded ? items : items.slice(0, QUEUE_VISIBLE);
  const total = items.length;
  const checkedCount = visible.filter(r => !_queueUnchecked.has(r.id)).length;
  const rowHtml = (r) => {
    const act = actById.get(r.activityId);
    const color = r.status === AttendanceStatus.ABSENT ? '#EF4444' : '#F59E0B';
    const checked = !_queueUnchecked.has(r.id);
    return `
        <div class="flex items-center gap-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <input type="checkbox" class="att-queue-check w-3.5 h-3.5 rounded shrink-0" data-record-id="${r.id}"${checked ? ' checked' : ''} aria-label="选择本条考勤">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <a href="${getBasePath()}person.html?id=${encodeURIComponent(r.personId)}" class="text-sm font-medium text-gray-800 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(r.personId))}</a>
              ${r.status === AttendanceStatus.ABSENT ? badgeHtml('缺勤', 'danger') : badgeHtml('请假', 'warning')}
              ${r.overdue || (act && act.date && new Date(act.date) < new Date()) ? badgeHtml('超期', 'danger') : ''}
            </div>
            <div class="text-xs text-gray-500 truncate mt-0.5">${act ? act.title : '活动已下架'}${act?.date ? ' · ' + act.date : ''}</div>
          </div>
        </div>`;
  };
  const listHtml = total === 0
    ? `<div class="py-5 text-center">
        <div class="text-sm font-medium text-gray-700 mb-1">无待处理异常 ✓</div>
        <div class="text-xs text-gray-500">出勤/已补已源头审校自动确认${autoConfirmedCount > 0 ? `（${autoConfirmedCount} 条）` : ''}，缺勤/请假已全部确认</div>
      </div>`
    : `<div class="space-y-1.5">${visible.map(rowHtml).join('')}
      ${total > QUEUE_VISIBLE ? `
        <button id="att-queue-more" class="w-full text-xs text-gray-500 hover:text-gray-600 py-2 rounded-lg transition-colors" style="cursor:pointer;">
          ${_queueExpanded ? '收起' : `展开全部（${total} 条）`}
        </button>` : ''}
      <div class="flex items-center justify-between flex-wrap gap-2 pt-2 mt-1 border-t border-gray-100">
        <span class="text-xs text-gray-500">已勾选 <b class="att-batch-count tabular-nums text-gray-700">${checkedCount}</b> / ${total} 条${total > visible.length ? '（未展开项请先展开）' : ''}</span>
        <span class="flex items-center gap-2">
          <button type="button" id="att-queue-select-all" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;">${checkedCount === visible.length ? '已全选' : '全选'}</button>
          <button type="button" id="att-queue-clear" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;">清空</button>
          <button type="button" class="att-batch-confirm text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-50" style="${solidAccentStyle(accent, accentBorder)};cursor:${checkedCount ? 'pointer' : 'not-allowed'};" ${checkedCount ? '' : 'disabled'}>一次确认所选（${checkedCount}）</button>
        </span>
      </div>
      </div>`;
  // 已打回（回退态）：待活动组织方重新确认——纪检此处只读掌握，不代组织者确认
  const returnedHtml = returnedRecs.length === 0 ? '' : `
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="text-xs text-gray-600 mb-1.5">已打回 · 待活动组织方重新确认（${returnedRecs.length}）</div>
          <div class="space-y-1">
            ${returnedRecs.map(r => {
              const act = actById.get(r.activityId);
              return `<div class="flex items-center gap-2 py-1.5">
                <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#94A3B8"></span>
                <span class="text-xs text-gray-700 flex-shrink-0">${esc(getPersonName(r.personId))}</span>
                <span class="text-xs text-gray-500 flex-1 truncate">${act ? esc(act.title) : '活动已下架'}${r.returnReason ? ` · ${esc(r.returnReason)}` : ''}</span>
                ${badgeHtml('已打回', 'info')}
              </div>`;
            }).join('')}
          </div>
        </div>`;

  return `
    <div id="att-queue" class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">待确认考勤</h3>
        <div class="flex gap-3 text-xs">
          <span class="text-gray-600">请假 <span class="font-bold text-orange-700">${leaveCount}</span></span>
          <span class="text-gray-600">缺勤 <span class="font-bold text-red-700">${absentCount}</span></span>
          <span class="text-gray-600">超期 <span class="font-bold text-amber-700">${overdueCount}</span></span>
          ${autoConfirmedCount > 0 ? `<span class="text-gray-500">出勤自动确认 <span class="font-bold text-green-700">${autoConfirmedCount}</span></span>` : ''}
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-2">打包确认：勾选一批、一次确认（整批确认，不逐条）；单条有误可「打回」交活动组织方重新确认。</div>
      ${listHtml}
      ${returnedHtml}
    </div>
  `;
}

/**
 * 打包确认（SOP-B-41 / `D-455`）：对一批已上传的异常考勤**一次确认**（不逐条）——
 * 与逐条确认同一副作用（写确认人 / 销待办 / 派生补课任务 / 归档广播），落盘一次。
 * 不派给个人：确认仍落在记录本体的「确认人」上（`recordedBy`）。
 * @returns {number} 实际确认条数
 */
function _confirmAttendanceBatch(recordIds, actById) {
  const records = loadAttendanceRecords();
  const picked = records.filter(r => recordIds.includes(r.id) && !r.recordedBy);
  if (picked.length === 0) return 0;
  picked.forEach(r => { r.recordedBy = DISC_COMMISSIONER_ID; });
  saveAttendanceRecords(records);
  picked.forEach(r => {
    // 做事即销待办：确认考勤 → 销支书「考勤待确认」/纪检提醒
    TodoStore.completeBySource(TodoSourceType.ACTIVITY, r.activityId);
    TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${r.activityId}`);
    // 考勤确认后自动生成补课任务
    autoGenerateMakeupTask(r);
    // 自动广播（混合模式落地·场景2）：确认后通知组织委员——系统已自动归档至考察档案
    // R-22（2026-09-13）：系统派生通知改由服务端生成（kind 注册表复算授权 + 文案 + 落点）
    try {
      NoticeStore.addSystem('attendance-confirmed', r.activityId, {
        activityTitle: actById.get(r.activityId)?.title || '活动',
      });
    } catch (e) { console.warn('[disc-attendance] 归档广播失败（不影响确认）：', e); }
  });
  return picked.length;
}

/** 队列勾选：只维护「未勾选」集合并刷新汇总条（不整块重渲染，避免丢滚动位置） */
function _bindQueueCheckboxes(container) {
  container.querySelectorAll('.att-queue-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.recordId;
      if (!id) return;
      if (cb.checked) _queueUnchecked.delete(id); else _queueUnchecked.add(id);
      _syncBatchBar(container);
    });
  });
}

/** 刷新队列汇总条（已勾选数 / 按钮可用态 / 全选字样），不改列表本身 */
function _syncBatchBar(container) {
  const boxes = [...container.querySelectorAll('.att-queue-check')];
  const n = boxes.filter(cb => cb.checked).length;
  const cntEl = container.querySelector('.att-batch-count');
  if (cntEl) cntEl.textContent = String(n);
  const btn = container.querySelector('.att-batch-confirm');
  if (btn) {
    btn.textContent = `一次确认所选（${n}）`;
    btn.disabled = n === 0;
    btn.style.opacity = n === 0 ? '0.5' : '';
    btn.style.cursor = n === 0 ? 'not-allowed' : 'pointer';
  }
  const all = container.querySelector('#att-queue-select-all');
  if (all) all.textContent = (n === boxes.length && n > 0) ? '已全选' : '全选';
}

/**
 * 出勤申诉卡（SOP-B-42 / `D-456`）：成员报「我参加了但没记上」→ 纪检先核实：
 *  · 属实 → 「打回组织者」（交活动组织方核实补录 / 重新确认）；
 *  · 不属实 → 关闭。
 * 已打回的申诉此处只读展示（回退态交给组织者）。
 */
function _buildAppealCardHTML(pendingAppeals, returnedAppeals, actById, accent, accentBorder) {
  if (pendingAppeals.length === 0 && returnedAppeals.length === 0) return '';
  const row = (a, canAct) => {
    const act = actById.get(a.activityId);
    return `<div class="flex items-center gap-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#0EA5E9"></span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <a href="${getBasePath()}person.html?id=${encodeURIComponent(a.personId)}" class="text-sm font-medium text-gray-800 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(a.personId))}</a>
          ${badgeHtml('我参加了但没记上', 'info')}
        </div>
        <div class="text-xs text-gray-500 truncate mt-0.5">${act ? esc(act.title) : '活动已下架'}${act?.date ? ' · ' + act.date : ''}</div>
        ${a.note ? `<div class="text-xs text-gray-600 mt-0.5">申诉说明：${esc(a.note)}</div>` : ''}
        ${a.returnNote ? `<div class="text-xs text-amber-700 mt-0.5">打回说明：${esc(a.returnNote)}</div>` : ''}
      </div>
      ${canAct ? `<span class="flex items-center gap-2 flex-shrink-0">
        <button type="button" class="att-appeal-return text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" data-appeal-id="${a.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">核实属实，打回组织者</button>
        <button type="button" class="att-appeal-close text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" data-appeal-id="${a.id}" style="cursor:pointer;">不属实</button>
      </span>` : badgeHtml('已打回 · 待组织者确认', 'warning')}
    </div>`;
  };
  return `
    <div class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">出勤申诉（待核实）</h3>
        <span class="text-xs text-gray-500">同学反映「我参加了但没记上」→ 先核实，属实的交活动组织方确认</span>
      </div>
      <div class="space-y-1.5">
        ${pendingAppeals.map(a => row(a, true)).join('')}
        ${returnedAppeals.map(a => row(a, false)).join('')}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  A1-2026-09-05 会议考勤录入（上传位＝该场会议的组织者）
//  2026-09-21 批次 124（支书 2026-09-20 定案「会议考勤上传收归组织者」）：会议类考勤（党课/支部党员大会/
//    组织生活会/支委会）的**上传位在该场会议的组织者手上**，不再由纪检直接持上传位（`D-287`：「材料上传
//    主体一律组织者」）；纪检的位置＝**确认与统计核对**（下方「待确认考勤」打包确认 + 明细 / 矩阵 / 导出）。
//    本卡因此只列**本人可上传**（本人为该场组织者，或支书/副支书例外承担）的会议场次——空态给出去处。
//  CF §C.1a「会议考勤」；党小组会归组长/组织者，不在此列
// ════════════════════════════════════════════════════════════════
function _buildMeetingCardHTML(ctx, accent, accentBorder, actById) {
  const meetings = loadActivities()
    .filter(a => !isActivityArchived(a) && MEETING_TYPES.includes(a.type) && canUploadAttendance(DISC_COMMISSIONER_ID, a.id))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const accentStyle = solidAccentStyle(accent, accentBorder);
  const toggleBtn = `<button class="btn-md" id="disc-meet-toggle" style="${accentStyle}cursor:pointer;">${_meetFormVisible ? '收起' : '录入会议考勤'}</button>`;

  let body = '';
  if (_meetFormVisible) {
    // 稳定容器 #disc-meet-body（保态折叠挂点）：收起/取消只切 hidden，不重建 innerHTML、不销毁 picker
    const bodyInner = meetings.length === 0
      ? `<div class="py-3 text-xs text-gray-500">当前没有您可上传的会议考勤——<b>党课 / 支部党员大会</b>由<b>纪检委员</b>上传（本卡）；<b>党小组会 / 主题党日 / 组织生活会</b>由<b>该场活动组织者</b>在组长台「考勤上传」上传；<b>支委会不考勤</b>。异常（缺勤 / 请假）请在下方「待确认考勤」队列做打包确认。</div>`
      : `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">会议活动 <span class="text-red-600">*</span></label>
          <select id="disc-meet-activity" class="input-flat w-full">
            ${meetings.map(m => `<option value="${m.id}">${m.title}（${m.date}）</option>`).join('')}
          </select>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-gray-500 block font-medium">参会人员（逐人状态） <span class="text-red-600">*</span></label>
            <div class="flex gap-2">
              <button type="button" id="disc-meet-select-all" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;" title="仅全选应到名单（党员正式+预备且非滞留）">全选应到名单</button>
              <button type="button" id="disc-meet-clear" class="text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;">清空</button>
            </div>
          </div>
          <div id="disc-meet-picker"></div>
        </div>
      </div>
      <div id="disc-meet-roster-hint" class="mb-2 text-[11px] text-gray-500 leading-5"></div>
      <div id="disc-meet-makeup-strip" class="mb-3"></div>
      <div id="disc-meet-status-rows" class="space-y-2 mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="disc-meet-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${accentStyle}cursor:pointer;">提交录入</button>
        <button id="disc-meet-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
      <div class="mt-3 text-[11px] text-gray-500">录入即确认（recordedBy=录入人本人＝该场会议的纪检委员 / 支书 / 副支书）；未到（缺勤/请假）者须选标因（<b>事假 / 病假</b> / 无故 / 其它，纪检认定·固定枚举；<b>事假须提前 1 天申请、病假可事后补</b>——该句只是时效提示，<b>不作校验、不拦提交</b>）；滞留线下到场者勾选「到场补录」计入到席（落「滞留·到场」标记）；已录条目将覆盖（本人更正）· 新增/更正/跳过计数见提交回执</div>`;
    body = `<div id="disc-meet-body">${bodyInner}</div>`;
  }

  return `
    <div class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">会议考勤录入（党课 / 支部党员大会：纪检上传位）</h3>
        ${toggleBtn}
      </div>
      <div class="text-xs text-gray-500 mb-3">会议考勤的上传位<b>按会议类型分</b>（2026-09-21 批次 132 · 支书当日口径一，修正「一律组织者」）：<b>党课 / 支部党员大会＝纪检委员</b>（本卡即其承载面）· <b>党小组会 / 组织生活会 / 主题党日＝该场活动组织者</b>（组长台「考勤上传」）· <b>支委会不考勤</b>（规模小）。本卡只列<b>您本人可上传</b>的会议场次（您为纪检委员，或您为例外承担的支书 / 副支书）；纪检另管确认（下方「待确认考勤」打包确认）与统计核对（明细 / 汇总 / 导出照既有面）。应到计算规则（支书 2026-09-06 裁定）：<b>预应到 K</b>（在册党员 − 滞留剔除；党课列席不计应到）→ 滞留到场补录 <b>L</b> → <b>实际应到 = K+L</b>；候选中滞留者默认不计（灰态可见原因），「全选应到名单」不含滞留，线下到场由录入人在下方单独勾选「到场补录」</div>
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

/** 当前会议（表单内均为会议考勤类型：党课/支部大会/组织生活会/支委会）的应到名单 */
function _currentMeetingRoster() {
  return getMeetingRoster({ type: _currentMeetActivityType() });
}

/**
 * 本场考勤的**默认选中集**（SOP-B-2 / `D-288`）：已通过报名者 ∩ 本场应到候选（剔除滞留等禁选项）。
 * 只在表单首渲染与「换活动」时套用；纪检随后可自由增删——默认值≠名单已定（「未报名而实际参加」照旧手选）。
 */
function _applyMeetSignupDefaults() {
  if (!_meetPickerInstance) return;
  const activityId = document.getElementById('disc-meet-activity')?.value;
  const approved = activityId ? getApprovedSignupPersonIds('activity', activityId) : [];
  if (approved.length === 0) { _meetPickerInstance.clearSelection(); return; }
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: _currentMeetActivityType() });
  const candidateIds = new Set(candidates.map(p => p.id));
  const disabled = new Set(disabledIds);
  _meetPickerInstance.setSelected(approved.filter(pid => candidateIds.has(pid) && !disabled.has(pid)));
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
    ? '<span class="text-gray-500">无滞留党员</span>'
    : detained.map(p => `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 align-middle"
        title="${esc(p.residenceNote || '滞留：组织关系保留、应到剔除、通知照发')}">${esc(p.name)} · 滞留</span>`).join(' ');
  hintEl.innerHTML = `
    <span>应到计算规则：预应到 <b class="text-gray-600">K=${K}</b>（在册党员 ${stats.partyTotal} − 滞留剔除 ${stats.detainedParty}；党课列席不计应到）→ 滞留到场补录 <b class="text-amber-700">L=${L}</b> → 实际应到 <b class="text-gray-800">K+L=${K + L}</b>（补录者计「到席」，档案按在场展示）</span>
    <span class="block mt-1">滞留者默认不计应到（候选内灰态可见原因，title 悬浮查看备注）：${detainedHtml}——线下到场由录入人在下方「滞留党员到场补录」单独勾选，不随「全选应到名单」</span>
    <span class="block mt-1">${_meetSignupHintHtml()}</span>`;
}

/** 报名默认选中提示（SOP-B-2 / D-288）：默认值从哪来、可改；未报名而实际参加者手动勾选 */
function _meetSignupHintHtml() {
  const activityId = document.getElementById('disc-meet-activity')?.value;
  if (!activityId) return '<span class="text-gray-500">未选择会议活动：选中后按该场已通过报名者预选参会候选。</span>';
  const approved = getApprovedSignupPersonIds('activity', activityId);
  if (approved.length === 0) return '<span class="text-gray-500">本场无已通过的报名者（默认不预选）；未报名而实际参加者请手动勾选。</span>';
  const { candidates, disabledIds } = getMeetingRosterCandidates({ type: _currentMeetActivityType() });
  const candidateIds = new Set(candidates.map(p => p.id));
  const disabled = new Set(disabledIds);
  const picked = approved.filter(pid => candidateIds.has(pid) && !disabled.has(pid));
  return `<span class="text-gray-500">默认选中本场<b class="text-gray-600">报名者 ${picked.length} 人</b>（已通过报名 ${approved.length} 人，剔除不在应到候选者）——可手动增删。</span>`;
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
    strip.innerHTML = '<div class="text-[11px] text-gray-500">滞留党员到场补录：本活动范围无滞留党员（无需补录）</div>';
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
  // 支书 2026-09-06 ①批：滞留者「可见但不可选」（逐人禁用）——候选不再 filter 剔除滞留者，
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
  // SOP-B-2（D-288）：默认选中本场已通过的报名者（纪检仍可增删）
  _applyMeetSignupDefaults();
  _renderDiscMeetRosterHint();
  _renderDiscMeetDetainedMakeup();
  _renderDiscMeetStatusRows(_meetPickerInstance.getSelected());
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
        // SOP-B-16⑤：可选档 = 事假 / 病假 / 无故 / 其它；存量或「线上参会」代记携旧键 `leave` 时，
        // 按状态下拉同款做法**临时补一个选项**（label 走 absenceReasonLabel），使「已录·更正」不丢原值。
        const reasonOptions = [...ABSENCE_REASONS];
        if (pre?.absenceReason && !reasonOptions.some(x => x.key === pre.absenceReason)) {
          reasonOptions.push({ key: pre.absenceReason, label: absenceReasonLabel(pre.absenceReason), note: '' });
        }
        const reasonValue = (pre?.absenceReason && reasonOptions.some(x => x.key === pre.absenceReason))
          ? pre.absenceReason
          : _defaultReasonFor(curStatus);
        return `
        <div class="flex items-center gap-3 p-2 rounded-lg bg-white">
          <span class="text-sm font-medium text-gray-800 min-w-[60px]">${getPersonName(pid)}</span>
          <select id="disc-meet-status-${pid}" class="input-flat">
            ${options.map(o => `<option value="${o.value}" ${curStatus === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
          <span class="reason-group-${pid} inline-flex items-center gap-1 ${showReason ? '' : 'hidden'}">
            <span class="text-[11px] text-gray-500 whitespace-nowrap">标因</span>
            <select id="disc-meet-reason-${pid}" class="input-flat" title="未到标因（纪检认定：事假须提前 1 天申请 / 病假可事后补 / 无故 / 其它）">
              ${reasonOptions.map(x => `<option value="${x.key}" ${reasonValue === x.key ? 'selected' : ''}>${x.label}</option>`).join('')}
            </select>
            <span class="reason-note-${pid} text-[11px] text-gray-400 whitespace-nowrap" title="时效提示（不是校验，不拦提交）">${esc(absenceReasonNote(reasonValue))}</span>
          </span>
          ${preStatus ? '<span class="text-[10px] text-amber-700 whitespace-nowrap">已录·更正</span>' : ''}
        </div>`;
      }).join('')}
    </div>`;
  // 标因显隐随状态联动：出勤/已补隐藏；缺勤/请假显示并同步默认标因（缺席→无故、请假→事假，纪检可再改）
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
        _syncReasonNote(rowsContainer, pid);
      }
    });
  });
  // 标因改档 → 同步该档的时效提示（SOP-B-16⑤：事假须提前 1 天申请 / 病假可事后补）
  rowsContainer.querySelectorAll('select[id^="disc-meet-reason-"]').forEach(sel => {
    sel.addEventListener('change', () => _syncReasonNote(rowsContainer, sel.id.replace('disc-meet-reason-', '')));
  });
}

/** 把当前标因档的时效提示刷到行内（SOP-B-16⑤；无 note 的档清空） */
function _syncReasonNote(rowsContainer, pid) {
  const noteEl = rowsContainer.querySelector(`.reason-note-${pid}`);
  const reasonSel = rowsContainer.querySelector(`#disc-meet-reason-${pid}`);
  if (!noteEl || !reasonSel) return;
  noteEl.textContent = absenceReasonNote(reasonSel.value);
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
        <!-- 批次 35（2026-09-14）：默认翻为「按人」宽表（支书裁定 long form/按活动不该为主） -->
        <div class="flex items-center gap-2">
          <button class="att-mtx-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-[var(--app-accent-bg)] border-[var(--app-accent)] [color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-view="byPerson">按人</button>
          <button class="att-mtx-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-white border-neutral-200 text-gray-600 hover:bg-gray-50" data-view="byActivity">按活动</button>
        </div>
      </div>
      <div class="lf-bar mb-3">
        <select id="att-activity-select" class="input-flat text-xs lf-select">
          <option value="">活动：全部</option>
          ${actOptions}
        </select>
        <input type="text" id="att-mtx-search" class="input-flat text-xs lf-kw" placeholder="活动名筛选...">
        <input type="date" id="att-mtx-from" class="input-flat text-xs" title="时间区间：起始日期">
        <span class="text-xs text-gray-500 self-center">至</span>
        <input type="date" id="att-mtx-to" class="input-flat text-xs" title="时间区间：截止日期">
      </div>
      <div class="text-[11px] text-gray-500 mb-2">色点 + 缩写：${Object.entries(CELL_META).map(([k, m]) => `<span class="inline-flex items-center gap-1 mr-2"><span class="w-2 h-2 rounded-full" style="background:${m.dot}"></span>${ATTENDANCE_STATUS_LABELS[k]}</span>`).join('')}</div>
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
  // 时间降序：活动按日期最新在前（按活动视图最新在最上；按人视图最新在最左＝矩阵列的上限口径）
  const acts = loadActivities()
    .filter(a => isActivityLive(a))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const visibleActs = _filterActivities(acts, actById);
  const personIds = [...new Set(allRecords.map(r => r.personId))];

  // T-304 第5轮：矩阵回归只读分析（去确认操作/去待确认标记，职责单一化）
  const cellHtml = (personId, activityId) => {
    const rec = allRecords.find(r => r.personId === personId && r.activityId === activityId);
    if (!rec) return null;
    const m = CELL_META[rec.status];
    return `<span class="inline-flex items-center gap-1" title="${esc(getPersonName(rec.personId))} · ${esc(ATTENDANCE_STATUS_LABELS[rec.status])}">
      <span class="w-2 h-2 rounded-full" style="background:${m.dot}"></span><span class="text-xs text-gray-600">${m.label}</span>
    </span>`;
  };

  // 二元关系矩阵单一源（批次 35）：byItem＝行=活动、列=人；byPerson＝行=人、列=活动（互为转置）
  return renderRelationMatrix(tc, {
    stateKey: 'disc-attendance-matrix',
    mode: matrixView === 'byActivity' ? 'byItem' : 'byPerson',
    persons: personIds.map(id => ({ id, name: getPersonName(id) })),
    items: visibleActs.map(a => ({ id: a.id, title: a.title, sub: a.date || '' })),
    cell: cellHtml,
    personLabel: '姓名',
    itemLabel: '活动',
    emptyText: matrixView === 'byActivity' ? '无匹配活动（请调整筛选）' : '无考勤数据',
  });
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
          <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤汇总（导出 / 打印）</h3>
          <div class="flex gap-2 text-xs">
            <span class="text-gray-600">共 <span class="font-bold text-gray-800">${total}</span> 条</span>
            <span class="text-gray-600">待确认 <span class="font-bold text-orange-700">${totalPending}</span></span>
            ${totalAuto > 0 ? `<span class="text-gray-500">自动确认 <span class="font-bold text-green-700">${totalAuto}</span></span>` : ''}
            ${HandoffStore.hasPendingFor('attendance-archival', 'attendance') ? '<span class="text-teal-600 font-medium">待支委会接收</span>' : ''}
          </div>
        </div>
        <!-- U5b（2026-09-07）：低频操作钮统一 32px 圆角（与分页钮/下拉同高同 border 家族，hover 统一 bg-gray-50） -->
        <div class="flex items-center gap-2">
          <button class="att-export-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">导出 CSV</button>
          <button class="att-rate-export-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer" title="本月各场出勤率汇总，供支委会内部使用（不公示、不对外；SOP-B-35）">导出出勤率汇总（支委会内部）</button>
          <button class="att-print-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">打印</button>
          <button class="att-handoff-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">提交考勤统计至支委会</button>
        </div>
      </div>
      <!-- U5b（2026-09-07）：搜索输入 + 状态下拉（enhanceSelects 后为 cs-trigger）统一 text-xs 紧凑档；
           2026-09-14 批次 27：载体收敛为 lf-bar/lf-kw/lf-select，控件统一 34px 高 / 12px 字 -->
      <div class="lf-bar mb-3">
        <input type="text" id="att-table-search" class="input-flat text-xs lf-kw" placeholder="搜索姓名或活动...">
        <select id="att-table-status" class="input-flat text-xs lf-select" aria-label="状态筛选">
          <option value="">状态：全部</option>
          ${Object.values(AttendanceStatus).map(s => `<option value="${s}">${ATTENDANCE_STATUS_LABELS[s]}</option>`).join('')}
        </select>
      </div>
      <div id="att-table-container">${_attSectionSkeletonHtml()}</div>
      <div id="att-table-pager"></div>
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
      <table class="data-table">
        <thead><tr>
          <th>姓名</th>
          <th>学号</th>
          <th>发展阶段</th>
          <th>所属党小组</th>
          <th>活动</th>
          <th>类别</th>
          <th>状态</th>
          <th>确认人</th>
          <th>操作</th>
        </tr></thead>
        <tbody>${pageRows.map(a => {
          const rec = allRecords.find(r => r.id === a.id);
          const isRegularRec = rec && (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.MADE_UP);
          const isPending = a.confirmer === '—';
          const autoConfirmed = isPending && isRegularRec; // 出勤/已补源头审校自动确认
          const returned = !!(rec && rec.returnedBy);
          // 已确认的异常（缺勤/请假）可打回（SOP-B-42 / D-456）：回退到待确认，交活动组织方重新确认
          const canReturn = !!(rec && rec.recordedBy && !isRegularRec && !returned);
          const statusColor = a.status === AttendanceStatus.PRESENT ? 'text-green-700' : a.status === AttendanceStatus.ABSENT ? 'text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'text-teal-700' : 'text-orange-700';
          return `
          <tr>
            <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(a.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${a.name}</a></td>
            <td class="text-gray-600">${a.studentId || '—'}</td>
            <td class="text-gray-600">${a.developStage || '—'}</td>
            <td class="text-gray-600">${a.partyGroup || '—'}</td>
            <td class="text-gray-600">${a.activityId ? `<a class="text-blue-600 hover:underline" href="../activity.html?id=${a.activityId}">${a.activity}</a>` : a.activity}</td>
            <td class="text-gray-600">${a.type || '—'}</td>
            <td><span class="${statusColor}">${a.status}</span>${a.onlineAttend ? '<span class="ml-1 text-[11px] px-1 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 align-middle" title="线上参会：不计入出席（记「请假」），只免补课（D-293）">线上参会</span>' : ''}</td>
            <td class="text-gray-500">${returned ? '<span class="text-amber-700" title="已打回，待活动组织方重新确认">已打回</span>' : (autoConfirmed ? '<span class="text-green-700">自动确认</span>' : (isPending ? '<span class="text-orange-700">待确认</span>' : `<span class="text-green-700">${a.confirmer}</span>`))}</td>
            <td>${isPending && !autoConfirmed
              ? `<button class="att-jump-queue text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;" title="打包确认在「待确认考勤」处整批进行">去打包确认</button>`
              : (canReturn
                ? `<button class="att-return-btn text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors" data-record-id="${a.id}" style="cursor:pointer;" title="打回后交活动组织方重新确认">打回</button>`
                : (autoConfirmed ? '<span class="text-xs text-gray-500">自动</span>' : '<span class="text-xs text-green-700">✓</span>'))}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
  `;
  // 翻页控件（单一源 pagerHtml：共 N 条 · 第 x/y 页 + 上一页/页码/下一页；页数 ≤1 返回空串）
  const pagerEl = document.getElementById('att-table-pager');
  if (pagerEl) pagerEl.innerHTML = pagerHtml({ page: _page, pages: totalPages, total: display.length, unit: '条' });

  // 待确认行「去打包确认」：滚到队列区（确认动作一律在队列整批进行，SOP-B-41 / D-455）
  tc.querySelectorAll('.att-jump-queue').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('att-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  // 打回（SOP-B-42 / D-456）：回退到「待确认」，交活动组织方重新确认
  tc.querySelectorAll('.att-return-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const rec = loadAttendanceRecords().find(r => r.id === recordId);
      const who = rec ? getPersonName(rec.personId) : '该记录';
      const reason = window.prompt(`打回「${who}」的考勤？写一句打回原因（将交活动组织方重新确认）：`, '');
      if (reason === null) return; // 取消
      const res = returnAttendanceRecord(recordId, { by: DISC_COMMISSIONER_ID, note: reason });
      if (res.ok) showToast('success', '已打回，交活动组织方重新确认');
      else showToast('error', '打回失败：记录不存在');
      renderContent(ctx);
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  ④ 党小组会考勤（纪检纪律台只读掌握）— 附录⑩ A批·S1 裁定④（2026-09-06）
//  组织者上传（记录人=组织者，submittedBy 可辨）；纪检只读查看：不代传、不在此审改；
//  异常（缺勤/请假）处理走上方「待确认考勤」队列。无写口；挂在考勤明细下方只读区，
//  不新增工作台 tab（能力清单不变）。
//  统一检索引擎（2026-09-13）：按人扁平为一行（姓名 / 党小组会 / 状态 / 备注），
//    关键词 + 分面检索；组长/上传人信息以 title 悬浮保留（不改业务口径）。
// ════════════════════════════════════════════════════════════════
function _buildGroupMeetingReadonlyHTML() {
  const recorderSemantic = recorderRolesOf('党小组会').map(r => ROLE_LABELS[r] || r).join('/');
  return `
    <div class="card rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">党小组会考勤（纪检只读掌握）</h3>
      </div>
      <div class="text-[11px] text-gray-500 leading-5 mb-3">党小组会考勤由<b>本组组长</b>上传（记录人=${recorderSemantic}，submittedBy 可辨；记录人映射单一源 = policy recorderByType）；纪检纪律台<b>只读查看、不代传、不在此审改</b>——异常（缺勤/请假）请在「待确认考勤」队列处理，改/删走纪检确认流程</div>
      <div class="overflow-x-auto"><div id="disc-group-meeting-host"></div></div>
    </div>
  `;
}

/** 党小组会考勤只读表渲染（统一检索引擎 · table 模式；数据按人扁平，附活动/组长/上传人信息） */
function _renderGroupMeetingReadonly(container) {
  const host = container.querySelector('#disc-group-meeting-host');
  if (!host) return;
  const statusColor = (s) => s === AttendanceStatus.PRESENT ? 'text-green-700'
    : s === AttendanceStatus.MADE_UP ? 'text-teal-700'
    : s === AttendanceStatus.ABSENT ? 'text-red-700' : 'text-orange-700';
  const groups = listGroupMeetingAttendance();
  const rows = [];
  for (const g of groups) {
    for (const r of g.rows) {
      const m = getPersonById(r.personId) || {};
      rows.push({
        ...r,
        personId: r.personId,
        // 人名一律取档案（禁用记录内快照）；分面字段按 personId 现取档案
        name: getPersonName(r.personId),
        studentId: m.studentId || '',
        partyGroup: m.partyGroup || g.groupName || '',
        developStage: m.developStage || '',
        role: m.role || '',
        residenceStatus: m.residenceStatus || '',
        activityId: g.activityId,
        groupTitle: `${g.title}（${g.date}）`,
        recorderTitle: `组长 ${g.leaderName || '—'} · 上传 ${g.uploaderName || '—'}`,
      });
    }
  }
  renderFilteredList(host, {
    stateKey: 'disc-group-meeting-attendance',
    rows,
    keyword: personKeyword(),
    // 按人分面 + 党小组会（活动）分面——保留原「按活动分组查看」能力
    facets: [...personFacets({ roleLabel: roleLabelOf }), { key: 'groupTitle', label: '党小组会' }],
    countUnit: '人',
    emptyMessage: '暂无党小组会考勤记录（组织者上传后此处只读展示）',
    table: {
      colSpan: 4,
      headHtml: `<tr>
              <th>姓名</th>
              <th>党小组会</th>
              <th>状态</th>
              <th>备注（标因/补录）</th>
            </tr>`,
    },
    rowHtml: (r) => `
          <tr title="${esc(r.recorderTitle)}">
            <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(r.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(r.personId))}</a></td>
            <td class="text-gray-600">${r.activityId ? `<a class="text-blue-600 hover:underline" href="../activity.html?id=${r.activityId}">${esc(r.groupTitle)}</a>` : esc(r.groupTitle)}</td>
            <td><span class="${statusColor(r.status)}">${esc(r.statusLabel)}</span></td>
            <td class="text-gray-500">${r.detainedMakeup ? badgeHtml('滞留·到场', 'warning') : (r.absenceReasonLabel ? esc(r.absenceReasonLabel) : '<span class="text-gray-500">—</span>')}</td>
          </tr>`,
  });
}
