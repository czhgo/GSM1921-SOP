// role: [工程师]+[AI]
// 组长工作台 Tab：组员进展（T-279 M2 拆分）
// 支书 2026-08-10 裁定：全员可见性矩阵落地（visibility.js own-group）。
// 三区思路从按人视图收敛：卡点区（问题优先）→ 进度区（每人一行聚合）。
// P-011 知情边界：看 ≠ 做——组长只知情与温和「了解进展」，答复由支书完成，不跳转他人工作台。
// 本视图禁用 SVG 图标，类别用色点+文字区分。

import { currentUserId } from '../../../services/core/auth.js?v=20261026b';
import { IssueStore } from '../../../services/governance/issues.js?v=20261026b';
import { renderReportInboxHtml, bindReportInbox, filterReportsByScope } from '../../../components/record/reporting.js?v=20261026b';
// 批次 47-I（Q-23-41 ②，支书 2026-09-15 裁定「改为服务端汇总」）：四项聚合口径下沉单一源
// `services/member/member-progress.js`——api 态由**服务端**汇总接口计算、mock 态调**同一个**纯函数。
// 故原先此处的四源直读与内联判定（TodoStore / TodoStatus / isTodoExpired / AttendanceStatus /
// loadAttendanceRecords / loadActiveInspectionRecords）**全部移除**：判定逻辑不再在本文件出现。
import { loadMemberProgress, blockersOf, REPORT_KIND } from '../../../services/member/member-progress.js?v=20261026b';
import { resolveVisibleTargets } from '../../../services/core/visibility.js?v=20261026b';
import { getPersonById, getPersonName } from '../../../services/member/person.js?v=20261026b';
import { showToast, getBasePath, escHtml as esc, todayLocal } from '../../../core/base/utils.js?v=20261026b';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/ui/list-filter.js?v=20261026b';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261026b';
// D8 裁决批二（2026-09-08）：本组活动复盘状态只读区块并入「组员进展」页（原独立「复盘状态」tab 已删）
import { reviewStatusSectionHtml, bindReviewStatusSection } from './review-tab.js?v=20261026b';
// 材料页深链 focusActivityId 的通用定位（只滚动 + 闪烁，不另造筛选器）
import { focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261026b';

// 模块级 ctx 缓存：重渲染（了解进展/行内答复后刷新）复用首次渲染的 accent
let _ctx = null;

export async function renderContent(ctx) {
  _ctx = ctx || _ctx;
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const myPersonId = currentUserId();
  // P1-11：失效会话不再回落到固定的旧演示组长；本组读口显示 —，避免把党委组织员（空党小组）误当组员。
  if (!myPersonId) {
    container.innerHTML = `${renderTabHeader({ title: '组员进展' })}<div class="card rounded-xl p-5 text-center"><p class="text-xs text-gray-500">—（登录态已失效，请重新登录）</p></div>`;
    return;
  }
  await IssueStore.loadAll();
  const today = todayLocal();

  const targets = resolveVisibleTargets('leader', myPersonId);
  if (!targets.length) {
    container.innerHTML = `
      ${renderTabHeader({ title: '组员进展' })}
      <div class="card rounded-xl p-5 text-center">
        <p class="text-xs text-gray-500">— 本党小组暂无其他组员可查看 · 下一步：请联系组织委员核对成员档案中的党小组归属</p>
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
        <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--status-error);"></span>
          <span class="text-sm font-medium text-gray-700 w-16 flex-shrink-0">${b.name}</span>
          <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b.title}</span>
          <button type="button" class="leader-ask-report btn-accent-soft text-xs px-2.5 py-1 flex-shrink-0"
            data-person-id="${b.personId}" data-role="${b.role}" data-note="${b.title}">了解进展</button>
        </div>`;

  // 逐人进度表（统一检索引擎 table 模式：关键词 + 分面；行内无按钮）——
  // 跨人比较型数据改为「有表头的紧凑表」：姓名 / 在办 / 考勤 / 考察 / 汇报 / 阶段。
  // ⚠ 数据格不挂 text-xs（P7：.data-table 单档 13px，正文 12–13px 由表样式承载）。
  const progressRowHtml = (r) => `
    <tr>
      <td data-label="姓名" class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(r.personId)}" class="hover:text-[var(--app-accent-soft-text)] transition-colors" title="查看完整档案">${esc(getPersonName(r.personId))}</a></td>
      <td data-label="在办 / 超期" class="text-gray-600 tabular-nums">${r.active}${r.overdue ? ` · <span class="text-red-600 font-medium">超期 ${r.overdue}</span>` : ''}</td>
      <td data-label="考勤" class="text-gray-600 tabular-nums ${r.absent ? 'text-red-600 font-medium' : ''}">缺勤 ${r.absent}</td>
      <td data-label="考察" class="text-gray-600 tabular-nums ${r.inspPending ? 'text-amber-700 font-medium' : ''}">待确认 ${r.inspPending}</td>
      <td data-label="汇报" class="${r.reportClass}">${r.reportState}</td>
      <td data-label="阶段" class="text-gray-600">${esc(r.developStage || '—')}</td>
    </tr>`;

  // 汇报区（支书 2026-08-10 裁定：组长可答复本组组员汇报，块块内闭环；支书仍全局可见）
  // 2026-10-21 批次 500（B-499-2）：汇总口径改为**本党小组**（与受众判据同一组织事实），
  // 条数与列表共用 `filterReportsByScope`，不再按 targets 另写一套成员集合。
  const myGroup = (getPersonById(myPersonId) || {}).partyGroup || '';
  const openReports = allIssues.filter(i =>
    i.kind === 'report' && i.status === 'open' && !i.hidden && !i.mergedInto
  );
  const groupScope = myGroup ? { partyGroup: myGroup } : null;
  const memberReports = myGroup ? filterReportsByScope(openReports, groupScope) : [];
  const reportInboxHtml = renderReportInboxHtml({
    reports: memberReports,
    scope: groupScope,
    title: '组员汇报',
    subtitle: `${memberReports.length} 条 · 本组待答复 · 行内答复`,
    role: 'leader',
    accent: ctx?.accent,
    emptyMsg: myGroup
      ? '— 本组暂无汇报 · 下一步：在下方组员进度点「了解进展」，或等组员主动汇报'
      : '— 未能识别您的党小组 · 下一步：请联系组织委员核对成员档案中的党小组归属',
  });

  container.innerHTML = `
    ${renderTabHeader({ title: '组员进展', description: '本组组员的在办 / 考勤 / 考察 / 汇报与卡点。' })}
    <div class="space-y-4">
      <!-- 2026-10-20 IA 批次：恢复 R3-F09 裁定的「卡点前置」——先看待办卡点，再看逐人进度，最后接组员汇报 -->
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-sm font-bold text-gray-700">卡点</h3>
          <span class="text-xs text-gray-500">本组超期/上报/缺勤 · ${blockers.length} 项</span>
        </div>
        <div id="leader-blockers-list"></div>
      </div>
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-sm font-bold text-gray-700">进度</h3>
          <span class="text-xs text-gray-500">本组组员在办 / 考勤 / 考察 / 汇报 · ${rows.length} 人</span>
        </div>
        <div id="leader-progress-list"></div>
      </div>
      ${reportInboxHtml}
      <!-- D8 裁决批二（2026-09-08）：本组活动复盘状态只读区块并入组员进展页（原独立「复盘状态」tab 已删） -->
      ${reviewStatusSectionHtml(ctx)}
      <!-- 2026-10-25 IA 62→45：原「知情查看」页签降为**独立区**（不与任何分段钮同排；组织单元 ≠ 协作结构） -->
      <div class="card rounded-xl p-4" id="leader-groups-card">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-title-cn text-sm font-bold text-gray-700">其他党小组</h3>
          <span class="text-xs text-gray-500">只读 · 看 ≠ 做</span>
        </div>
        <div id="leader-groups-host"></div>
      </div>
      <!-- 2026-10-25 IA 62→45：原「考察管理」页签降为本页折叠区「上传考察」（实现单一源＝leader/inspection-tab.js） -->
      <div class="card rounded-xl p-4 disclosure-host">
        <h3 class="disclosure__title" id="leader-insp-fold-title">上传考察</h3>
        <details class="disclosure" id="leader-insp-fold"${ctx?.navTarget?.section === 'inspection' ? ' open' : ''}>
          <summary class="disclosure__summary" aria-labelledby="leader-insp-fold-title">展开考察上传表单与本人可上传的活动</summary>
          <div class="disclosure__body" id="leader-insp-host"></div>
        </details>
      </div>
    </div>`;

  // 统一检索引擎（逐人进度表：关键词 姓名/学号 + 分面 党小组/发展阶段/角色/在册；行数 ≤8 时自动不渲染检索条）
  renderFilteredList(container.querySelector('#leader-progress-list'), {
    stateKey: 'leader-members-progress',
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    emptyMessage: '无匹配组员',
    table: {
      colSpan: 6,
      responsive: true,
      headHtml: `<tr>
            <th>姓名</th>
            <th>在办 / 超期</th>
            <th>考勤</th>
            <th>考察</th>
            <th>汇报</th>
            <th>阶段</th>
          </tr>`,
    },
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

  _bindMembersEvents(container, groupScope);

  // 「其他党小组」独立区（组件单一源：components/record/other-groups-view.js）
  const groupsHost = container.querySelector('#leader-groups-host');
  if (groupsHost) {
    import('../../../components/record/other-groups-view.js?v=20261026b')
      .then((m) => { if (groupsHost.isConnected) m.renderOtherGroupsView(groupsHost); });
  }
  // 「上传考察」折叠区（渲染函数单一源：leader/inspection-tab.js；展开时才挂载）
  _mountInspectionFold(container, ctx);

  // 材料页深链（2026-10-20）：复盘状态区渲染后把本场活动卡片滚到视野（其余行无活动锚点则静默）。
  focusActivityAnchor(container, ctx?.focusActivityId);
}

/** 考察上传折叠区（2026-10-25 IA 62→45）：展开时才调用 `inspection-tab.js::renderContent(ctx, host)`，
 *  不复制表单；`?section=inspection` 深链直接展开并滚到该区。 */
function _mountInspectionFold(container, ctx) {
  const details = container.querySelector('#leader-insp-fold');
  const host = container.querySelector('#leader-insp-host');
  if (!details || !host) return;
  const mount = () => {
    if (host.dataset.inspMounted === '1' || !host.isConnected) return;
    host.dataset.inspMounted = '1';
    import('./inspection-tab.js?v=20261026b').then((m) => {
      if (host.isConnected) m.renderContent(ctx, host);
    });
  };
  if (details.open) mount();
  details.addEventListener('toggle', () => { if (details.open) mount(); });
  if (ctx?.navTarget?.section === 'inspection') {
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (ctx?.navTarget?.section === 'groups') {
    container.querySelector('#leader-groups-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _bindMembersEvents(container, scope = null) {
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
  bindReportInbox(container, { role: 'leader', scope, onAnswered: () => renderContent(_ctx) });
  // D8 裁决批二（2026-09-08）：复盘状态区块展开/收起（只读；rerender=本页整页重渲染）
  bindReviewStatusSection(container, () => renderContent(_ctx));
}
