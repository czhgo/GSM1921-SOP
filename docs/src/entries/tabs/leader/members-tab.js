// role: [工程师]+[AI]
// 组长工作台 Tab：组员进展（T-279 M2 拆分）
// 支书 2026-08-10 裁定：全员可见性矩阵落地（visibility.js own-group）。
// 三区思路从按人视图收敛：卡点区（问题优先）→ 进度区（每人一行聚合）。
// P-011 知情边界：看 ≠ 做——组长只知情与温和「了解进展」，答复由支书完成，不跳转他人工作台。
// 本视图禁用 SVG 图标，类别用色点+文字区分。

import { AuthStore } from '../../../services/auth.js?v=20260914m';
import { IssueStore } from '../../../services/issues.js?v=20260914m';
import { renderReportInboxHtml, bindReportInbox } from '../../../components/reporting.js?v=20260914m';
import { TodoStore, TodoStatus, isTodoExpired } from '../../../services/todo.js?v=20260914m';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260914m';
import { loadActiveInspectionRecords } from '../../../services/inspection.js?v=20260914m';
import { AttendanceStatus } from '../../../core/domain.js?v=20260914m';
import { resolveVisibleTargets } from '../../../services/visibility.js?v=20260914m';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260914m';
import { showToast, getBasePath, escHtml as esc } from '../../../core/utils.js?v=20260914m';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260914m';
// D8 裁决批二（2026-09-08）：本组活动复盘状态只读区块并入「组员进展」页（原独立「复盘状态」tab 已删）
import { reviewStatusSectionHtml, bindReviewStatusSection } from './review-tab.js?v=20260914m';

// 模块级 ctx 缓存：重渲染（了解进展/行内答复后刷新）复用首次渲染的 accent
let _ctx = null;

export async function renderContent(ctx) {
  _ctx = ctx || _ctx;
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const me = AuthStore.getCurrentUser();
  const myPersonId = me?.personId || 'p4';
  await IssueStore.loadAll();
  const today = new Date().toISOString().slice(0, 10);

  const targets = resolveVisibleTargets('leader', myPersonId);
  if (!targets.length) {
    container.innerHTML = `
      <div class="card rounded-lg p-6 text-center">
        <p class="text-xs text-gray-500">本党小组暂无其他组员可查看</p>
      </div>`;
    return;
  }

  const allTodos = TodoStore.getAll();
  const attRecords = loadAttendanceRecords();
  const inspRecords = loadActiveInspectionRecords();
  const allIssues = IssueStore.getAll();

  // 每人聚合（progress/blocker/report/attendance/inspection 五维）
  const rows = targets.map(t => {
    const personTodos = allTodos.filter(td => td.personId === t.personId && td.status !== TodoStatus.COMPLETED);
    // P1：内联过期判定收敛于 isTodoExpired（与域 expiredCount/渲染红点同口径）
    const overdueTodos = personTodos.filter(td => isTodoExpired(td, today));
    const absentCount = attRecords.filter(r => r.personId === t.personId && r.status === AttendanceStatus.ABSENT).length;
    const inspPending = inspRecords.filter(r => r.personId === t.personId && r.status === 'pending').length;
    const reports = allIssues.filter(i => i.kind === 'report' && i.submittedBy === t.personId && !i.hidden && !i.mergedInto);
    const openReport = reports.find(r => r.status === 'open');
    const openRequest = allIssues.find(i => i.kind === 'report' && i.requestedBy && i.assignee === t.personId && i.status === 'open' && !i.hidden && !i.mergedInto);
    const m = getPersonById(t.personId) || {};

    let reportState = '—';
    let reportClass = 'text-gray-500';
    if (openReport) {
      if (openReport.resultPending) { reportState = '待答复'; reportClass = 'text-amber-700 font-medium'; }
      else if (openReport.reportCategory === 'blocked') { reportState = '卡点上报中'; reportClass = 'text-red-600 font-medium'; }
      else { reportState = '汇报中'; reportClass = 'text-blue-600'; }
    } else if (openRequest) {
      reportState = '待汇报'; reportClass = 'text-blue-500';
    }

    return {
      person: t,
      personId: t.personId,
      // 人名一律取档案（禁用记录内 personName 快照）；分面字段按 personId 现取档案
      name: getPersonName(t.personId),
      studentId: m.studentId || '',
      partyGroup: m.partyGroup || t.partyGroup || '',
      developStage: m.developStage || '',
      role: m.role || t.role || '',
      residenceStatus: m.residenceStatus || '',
      active: personTodos.length,
      overdue: overdueTodos.length,
      absent: absentCount,
      inspPending,
      reportState,
      reportClass,
      openReport,
    };
  });

  // 卡点区（问题优先）：超期待办 + 上报卡点 + 缺勤 + 考察待确认
  // 说明：本区为派生告警清单（同一人可命中多条），非逐人一览表，故不接入统一检索引擎（登记见批次报告）
  const blockers = [];
  rows.forEach(r => {
    if (r.overdue > 0) blockers.push({ personId: r.personId, name: r.name, title: `${r.overdue} 项待办超期`, role: r.person.role });
    if (r.openReport && r.openReport.reportCategory === 'blocked') blockers.push({ personId: r.personId, name: r.name, title: `上报卡点：${r.openReport.title}`, role: r.person.role });
    if (r.absent > 0) blockers.push({ personId: r.personId, name: r.name, title: `缺勤未补 ${r.absent} 次`, role: r.person.role });
    if (r.inspPending > 0) blockers.push({ personId: r.personId, name: r.name, title: `考察待确认 ${r.inspPending} 条`, role: r.person.role });
  });

  const blockerHtml = blockers.length === 0
    ? `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 本组无卡点，全部正常
       </div>`
    : blockers.map(b => `
        <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EF4444;"></span>
          <span class="text-sm font-medium text-gray-700 w-16 flex-shrink-0">${b.name}</span>
          <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b.title}</span>
          <button type="button" class="leader-ask-report btn-accent-soft text-xs px-2.5 py-1 flex-shrink-0"
            style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff);color:color-mix(in srgb, var(--app-accent,#B91C1C) 60%, #000);"
            data-person-id="${b.personId}" data-role="${b.role}" data-note="${b.title}">了解进展</button>
        </div>`).join('');

  // 逐人进度行（统一检索引擎行模板：关键词 + 分面；行内无按钮）
  const progressRowHtml = (r) => `
    <div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#60A5FA;"></span>
      <a href="${getBasePath()}person.html?id=${encodeURIComponent(r.personId)}" class="text-sm font-semibold text-gray-800 w-16 flex-shrink-0 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(r.personId))}</a>
      <span class="text-xs tabular-nums text-gray-600 w-14 flex-shrink-0 text-right">在办 ${r.active}</span>
      <span class="text-xs tabular-nums ${r.overdue ? 'text-red-600 font-medium' : 'text-gray-500'} w-14 flex-shrink-0 text-right">超期 ${r.overdue}</span>
      <span class="text-xs tabular-nums ${r.absent ? 'text-red-600 font-medium' : 'text-gray-500'} w-14 flex-shrink-0 text-right">缺勤 ${r.absent}</span>
      <span class="text-xs tabular-nums ${r.inspPending ? 'text-amber-700 font-medium' : 'text-gray-500'} w-16 flex-shrink-0 text-right">考察待 ${r.inspPending}</span>
      <span class="text-xs ${r.reportClass} w-20 text-right flex-shrink-0">${r.reportState}</span>
    </div>`;

  // 汇报区（支书 2026-08-10 裁定：组长可答复本组组员汇报，块块内闭环；支书仍全局可见）
  // 本组组员发起的 open 汇报 → 行内正式答复；问题优先置顶
  const memberIds = new Set(targets.map(t => t.personId));
  const memberReports = allIssues.filter(i =>
    i.kind === 'report' && i.status === 'open' && !i.hidden && !i.mergedInto &&
    memberIds.has(i.submittedBy)
  );
  const reportInboxHtml = renderReportInboxHtml({
    reports: memberReports,
    title: '组员汇报',
    subtitle: '本组待答复 · 行内答复',
    role: 'leader',
    accent: ctx.accent,
    emptyMsg: '暂无本组组员汇报',
  });

  container.innerHTML = `
    <div class="space-y-4">
      ${reportInboxHtml}
      <div class="card rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">卡点</h4>
          <span class="text-xs text-gray-500">本组超期/上报/缺勤 · ${blockers.length} 项</span>
        </div>
        <div class="space-y-1.5">${blockerHtml}</div>
      </div>
      <div class="card rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">进度</h4>
          <span class="text-xs text-gray-500">本组组员在办聚合</span>
        </div>
        <div id="leader-progress-list"></div>
      </div>
      <!-- D8 裁决批二（2026-09-08）：本组活动复盘状态只读区块并入组员进展页（原独立「复盘状态」tab 已删） -->
      ${reviewStatusSectionHtml(ctx)}
    </div>`;

  // 统一检索引擎（逐人进度表：关键词 姓名/学号 + 分面 党小组/发展阶段/角色/在册；行数 ≤8 时自动不渲染检索条）
  renderFilteredList(container.querySelector('#leader-progress-list'), {
    stateKey: 'leader-members-progress',
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1.5',
    emptyMessage: '无匹配组员',
    rowHtml: progressRowHtml,
  });

  _bindMembersEvents(container);
}

function _bindMembersEvents(container) {
  container.querySelectorAll('.leader-ask-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const personId = btn.dataset.personId;
      const role = btn.dataset.role || 'participant';
      const note = btn.dataset.note || '';
      IssueStore.requestReport(personId, role, note);
      showToast('success', `已请${getPersonName(personId)}同步进展`);
      renderContent(_ctx);
    });
  });
  // 组员汇报行内正式答复（支书 2026-08-10 裁定：组长可答复本组组员，块块闭环）
  bindReportInbox(container, { role: 'leader', onAnswered: () => renderContent(_ctx) });
  // D8 裁决批二（2026-09-08）：复盘状态区块展开/收起（只读；rerender=本页整页重渲染）
  bindReviewStatusSection(container, () => renderContent(_ctx));
}
