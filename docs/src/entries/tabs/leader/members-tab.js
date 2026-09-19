// role: [工程师]+[AI]
// 组长工作台 Tab：组员进展（T-279 M2 拆分）
// 支书 2026-08-10 裁定：全员可见性矩阵落地（visibility.js own-group）。
// 三区思路从按人视图收敛：卡点区（问题优先）→ 进度区（每人一行聚合）。
// P-011 知情边界：看 ≠ 做——组长只知情与温和「了解进展」，答复由支书完成，不跳转他人工作台。
// 本视图禁用 SVG 图标，类别用色点+文字区分。

import { AuthStore } from '../../../services/auth.js?v=20260919k';
import { IssueStore } from '../../../services/issues.js?v=20260919k';
import { renderReportInboxHtml, bindReportInbox } from '../../../components/reporting.js?v=20260919k';
// 批次 47-I（Q-23-41 ②，支书 2026-09-15 裁定「改为服务端汇总」）：四项聚合口径下沉单一源
// `services/member-progress.js`——api 态由**服务端**汇总接口计算、mock 态调**同一个**纯函数。
// 故原先此处的四源直读与内联判定（TodoStore / TodoStatus / isTodoExpired / AttendanceStatus /
// loadAttendanceRecords / loadActiveInspectionRecords）**全部移除**：判定逻辑不再在本文件出现。
import { loadMemberProgress, blockersOf, REPORT_KIND } from '../../../services/member-progress.js?v=20260919k';
import { resolveVisibleTargets } from '../../../services/visibility.js?v=20260919k';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260919k';
import { showToast, getBasePath, escHtml as esc } from '../../../core/utils.js?v=20260919k';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260919k';
// D8 裁决批二（2026-09-08）：本组活动复盘状态只读区块并入「组员进展」页（原独立「复盘状态」tab 已删）
import { reviewStatusSectionHtml, bindReviewStatusSection } from './review-tab.js?v=20260919k';

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

  const allIssues = IssueStore.getAll(); // 仅供「组员汇报收件箱」，与进度聚合无关

  // 每人聚合（在办 / 超期 / 缺勤 / 考察待确认 + 汇报态）：**载入器单一入口**（批次 47-I）——
  // api 态由服务端汇总接口返回，mock 态本地算，两支同一份口径。
  const progress = await loadMemberProgress({ personIds: targets.map(t => t.personId), today });
  const aggOf = new Map(progress.rows.map(r => [r.personId, r]));
  const REPORT_CLASS = {
    [REPORT_KIND.PENDING_ANSWER]: 'text-amber-700 font-medium',
    [REPORT_KIND.BLOCKED]: 'text-red-600 font-medium',
    [REPORT_KIND.REPORTING]: 'text-blue-600',
    [REPORT_KIND.REQUESTED]: 'text-blue-500',
    [REPORT_KIND.NONE]: 'text-gray-500',
  };

  const rows = targets.map(t => {
    const a = aggOf.get(t.personId)
      || { active: 0, overdue: 0, absent: 0, inspPending: 0, reportState: '—', reportKind: REPORT_KIND.NONE, reportTitle: '' };
    const m = getPersonById(t.personId) || {};

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
      active: a.active,
      overdue: a.overdue,
      absent: a.absent,
      inspPending: a.inspPending,
      reportState: a.reportState,
      reportClass: REPORT_CLASS[a.reportKind] || 'text-gray-500',
      reportKind: a.reportKind,
      reportTitle: a.reportTitle || '',
    };
  });

  // 卡点区（问题优先）：**由聚合结果派生**（`blockersOf`，口径与进度同源——批次 47-I 起本文件
  // 不再重写四项判定）。批次 47-H：接入统一检索引擎（关键词按姓名/卡点、分面按**卡点类型**）。
  const blockers = blockersOf(progress.rows, (pid) => {
    const t = targets.find(x => x.personId === pid);
    return { name: getPersonName(pid), role: (getPersonById(pid) || {}).role || t?.role || 'participant' };
  });

  // 引擎行渲染器（批次 47-H）：卡点一条。行内「了解进展」由容器委托（见 _bindMembersEvents），
  // 故引擎翻页/筛选重绘行后按钮依旧有监听。
  const blockerRowHtml = (b) => `
        <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EF4444;"></span>
          <span class="text-sm font-medium text-gray-700 w-16 flex-shrink-0">${b.name}</span>
          <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b.title}</span>
          <button type="button" class="leader-ask-report btn-accent-soft text-xs px-2.5 py-1 flex-shrink-0"
            style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff);color:color-mix(in srgb, var(--app-accent,#B91C1C) 60%, #000);"
            data-person-id="${b.personId}" data-role="${b.role}" data-note="${b.title}">了解进展</button>
        </div>`;

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
        <div id="leader-blockers-list"></div>
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

  // 卡点区接引擎（批次 47-H）：空态保留原有绿色「全部正常」块；有卡点则走引擎（行数达门槛出检索条+分页）
  const blockersHost = container.querySelector('#leader-blockers-list');
  if (blockersHost) {
    if (blockers.length === 0) {
      blockersHost.innerHTML = `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 本组无卡点，全部正常
       </div>`;
    } else {
      renderFilteredList(blockersHost, {
        stateKey: 'leader-members-blockers',
        rows: blockers,
        keyword: { keys: ['name', 'title'], placeholder: '搜索姓名 / 卡点…' },
        facets: [{ key: 'kind', label: '卡点类型' }],
        countUnit: '项',
        listClass: 'space-y-1.5',
        emptyMessage: '无匹配卡点',
        rowHtml: blockerRowHtml,
      });
    }
  }

  _bindMembersEvents(container);
}

function _bindMembersEvents(container) {
  // 批次 47-H：卡点区接入引擎后行会重绘（翻页/筛选）→ 「了解进展」必须改**容器委托**；
  // 旧实现按渲染时 querySelectorAll 一次性绑定，重绘后新按钮无监听、点击全失效
  // （与 archive-tab.js 里已记录的同名病灶同类）。
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.leader-ask-report');
    if (!btn) return;
    const personId = btn.dataset.personId;
    const role = btn.dataset.role || 'participant';
    const note = btn.dataset.note || '';
    IssueStore.requestReport(personId, role, note);
    showToast('success', `已请${getPersonName(personId)}同步进展`);
    renderContent(_ctx);
  });
  // 组员汇报行内正式答复（支书 2026-08-10 裁定：组长可答复本组组员，块块闭环）
  bindReportInbox(container, { role: 'leader', onAnswered: () => renderContent(_ctx) });
  // D8 裁决批二（2026-09-08）：复盘状态区块展开/收起（只读；rerender=本页整页重渲染）
  bindReviewStatusSection(container, () => renderContent(_ctx));
}
