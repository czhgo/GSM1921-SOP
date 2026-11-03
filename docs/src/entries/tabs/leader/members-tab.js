// role: [工程师]+[AI]
// 组长工作台 Tab：组员进展（T-279 M2 拆分）
// 支书 2026-08-10 裁定：全员可见性矩阵落地（visibility.js own-group）。
// 三区思路从按人视图收敛：卡点区（问题优先）→ 进度区（每人一行聚合）。
// P-011 知情边界：看 ≠ 做——组长只知情与温和「了解进展」，答复由支书完成，不跳转他人工作台。
// 本视图禁用 SVG 图标，类别用色点+文字区分。

import { currentUserId } from '../../../services/core/auth.js?v=20261102b';
import { lowFrequencyFoldsHtml } from './members-low-frequency.js?v=20261102b';
import { IssueStore } from '../../../services/governance/issues.js?v=20261102b';
import { renderReportInboxHtml, bindReportInbox, filterReportsByScope } from '../../../components/record/reporting.js?v=20261102b';
// 批次 47-I（Q-23-41 ②，支书 2026-09-15 裁定「改为服务端汇总」）：四项聚合口径下沉单一源
// `services/member/member-progress.js`——api 态由**服务端**汇总接口计算、mock 态调**同一个**纯函数。
// 故原先此处的四源直读与内联判定（TodoStore / TodoStatus / isTodoExpired / AttendanceStatus /
// loadAttendanceRecords / loadActiveInspectionRecords）**全部移除**：判定逻辑不再在本文件出现。
import { loadMemberProgress, blockersOf, REPORT_KIND } from '../../../services/member/member-progress.js?v=20261102b';
import { resolveVisibleTargets } from '../../../services/core/visibility.js?v=20261102b';
import { getPersonById, getPersonName } from '../../../services/member/person.js?v=20261102b';
import { showToast, getBasePath, escHtml as esc, todayLocal, smoothScroll } from '../../../core/base/utils.js?v=20261102b';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/ui/list-filter.js?v=20261102b';
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261102b';
// D8 裁决批二（2026-09-08）：本组活动复盘状态只读区块并入「组员进展」页（原独立「复盘状态」tab 已删）
import { reviewStatusSectionHtml, reviewStatusCounts, bindReviewStatusSection } from './review-tab.js?v=20261102b';
// 材料页深链 focusActivityId 的通用定位（只滚动 + 闪烁，不另造筛选器）
import { focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261102b';

// 模块级 ctx 缓存：重渲染（了解进展/行内答复后刷新）复用首次渲染的 accent
let _ctx = null;
// 2026-11-01 Task 7：卡点/进度分段与三个折叠区的跨重渲染保态（答复后整页重渲染不得跳回默认态）
let _membersSeg = 'blockers';   // 'blockers' | 'all'
let _reviewFoldOpen = false;
let _groupsFoldOpen = false;
let _inspOpen = false;

import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261102b';
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
      <div class="card rounded-xl p-5">
        ${emptyStateHtml({ variant: 'panel', text: '本党小组暂无其他组员可查看 · 下一步：请联系组织委员核对成员档案中的党小组归属' })}
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
    subtitle: `${memberReports.length} 条 · 本组待答复`,
    role: 'leader',
    accent: ctx?.accent,
    emptyMsg: myGroup
      ? '本组暂无汇报 · 下一步：在下方组员进度点「了解进展」，或等组员主动汇报'
      : '未能识别您的党小组 · 下一步：请联系组织委员核对成员档案中的党小组归属',
  });

  const reviewCounts = reviewStatusCounts();
  const reviewBodyHtml = reviewStatusSectionHtml(ctx, { bare: true });
  const segOn = 'bg-[var(--app-accent-soft-bg)] border-[var(--app-accent)] [color:var(--app-accent-soft-text)]';
  const segOff = 'bg-white border-neutral-200 text-gray-600';
  const segBtn = (seg, label) => `<button type="button" class="btn-tab leader-members-seg px-3 py-1.5 text-xs font-medium ${_membersSeg === seg ? segOn : segOff}" data-seg="${seg}" aria-pressed="${_membersSeg === seg}">${label}</button>`;

  container.innerHTML = `
    ${renderTabHeader({ title: '组员进展', description: '本组组员的在办 / 考勤 / 考察 / 汇报与卡点。' })}
    <div class="space-y-4">
      <!-- 2026-11-01 Task 7：卡点与进度合并为一卡（段内切换，默认卡点前置 R3-F09）；上传考察降为卡头动作 -->
      <section class="card rounded-xl p-0 overflow-hidden" id="leader-members-card" aria-labelledby="leader-members-title">
        <div class="px-4 pt-4">
          ${renderCardHeader({
            title: '本组组员',
            titleId: 'leader-members-title',
            meta: `卡点 ${blockers.length} · 组员 ${rows.length} 人`,
            actions: `<div class="flex items-center gap-2 flex-wrap">
              <div class="flex items-center gap-1" id="leader-members-seg" role="group" aria-label="本组组员视图">
                ${segBtn('blockers', `卡点 ${blockers.length}`)}
                ${segBtn('all', `全部 ${rows.length}`)}
              </div>
              <button type="button" class="btn-outline text-xs px-3 py-1.5" id="leader-insp-toggle" aria-expanded="${_inspOpen ? 'true' : 'false'}" aria-controls="leader-insp-area">${_inspOpen ? '收起考察' : '上传考察'}</button>
            </div>`,
          })}
        </div>
        <div class="px-4 pb-4">
          <div id="leader-blockers-list"${_membersSeg === 'all' ? ' hidden' : ''}></div>
          <div id="leader-progress-list"${_membersSeg === 'all' ? '' : ' hidden'}></div>
          <!-- 上传考察（原独立折叠区降为卡头动作；实现单一源＝leader/inspection-tab.js，展开时才挂载） -->
          <div class="hidden mt-4 pt-3 border-t border-gray-100" id="leader-insp-area">
            <div id="leader-insp-host"></div>
          </div>
        </div>
      </section>
      ${reportInboxHtml}
      <!-- 2026-11-01 Task 7：本组复盘与其他党小组并入一张低频卡，各自折叠（默认收起） -->
      <section class="card rounded-xl p-4" id="leader-more-card" aria-labelledby="leader-more-title">
        ${renderCardHeader({ title: '低频查阅', titleId: 'leader-more-title', meta: '复盘 · 其他党小组（只读）' })}
        <div class="space-y-3">
          ${lowFrequencyFoldsHtml({
            reviewBodyHtml,
            reviewCounts,
            reviewOpen: _reviewFoldOpen,
            groupsOpen: _groupsFoldOpen,
          })}
        </div>
      </section>
    </div>`;

  const blockersHost = container.querySelector('#leader-blockers-list');
  const progressHost = container.querySelector('#leader-progress-list');

  // 2026-11-01 Task 7：段内切换只渲染当前段 ⇒ 全页同时只保留一条筛选条。
  // 两个 stateKey 各自保持关键词 / 分面 / 页码，切回原段不丢筛选。
  const renderSegment = (seg) => {
    _membersSeg = seg === 'all' ? 'all' : 'blockers';
    if (blockersHost) { blockersHost.hidden = _membersSeg === 'all'; blockersHost.innerHTML = ''; }
    if (progressHost) { progressHost.hidden = _membersSeg !== 'all'; progressHost.innerHTML = ''; }

    if (_membersSeg === 'blockers') {
      if (blockersHost) {
        if (blockers.length === 0) {
          blockersHost.innerHTML = `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
             <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 本组无卡点，全部正常
           </div>`;
        } else {
          // 卡点区接引擎（批次 47-H）：行数达门槛出检索条 + 分页
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
    } else if (progressHost) {
      // 统一检索引擎（逐人进度表：关键词 姓名/学号 + 分面 党小组/发展阶段/角色/在册；行数 ≤8 时自动不渲染检索条）
      renderFilteredList(progressHost, {
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
    }

    container.querySelectorAll('.leader-members-seg').forEach((btn) => {
      const on = btn.dataset.seg === _membersSeg;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('bg-[var(--app-accent-soft-bg)]', on);
      btn.classList.toggle('border-[var(--app-accent)]', on);
      btn.classList.toggle('[color:var(--app-accent-soft-text)]', on);
      btn.classList.toggle('bg-white', !on);
      btn.classList.toggle('border-neutral-200', !on);
      btn.classList.toggle('text-gray-600', !on);
    });
  };
  renderSegment(_membersSeg);
  container.querySelectorAll('.leader-members-seg').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.seg === _membersSeg) return;
      renderSegment(btn.dataset.seg);
    });
  });

  _bindMembersEvents(container, groupScope);
  // 折叠区保态 + 懒挂载（复盘 / 其他党小组 / 上传考察）
  _bindFoldState(container, ctx);

  // 材料页深链（2026-10-20）：复盘状态区渲染后把本场活动卡片滚到视野（其余行无活动锚点则静默）。
  focusActivityAnchor(container, ctx?.focusActivityId);
}

/** 2026-11-01 Task 7：折叠区保态 + 懒挂载。
 *  · 复盘区：只记 open（列表绑定仍走 `bindReviewStatusSection`，整页重渲染后不跳回收起）；
 *  · 其他党小组：展开时才挂载 `other-groups-view.js`（组件单一源）；`?section=groups` 深链展开并滚到；
 *  · 上传考察：卡头按钮展开时才调用 `inspection-tab.js::renderContent(ctx, host)`，不复制表单；
 *    `?section=inspection` 深链直接展开并滚到该区。 */
function _bindFoldState(container, ctx) {
  const reviewFold = container.querySelector('#leader-review-fold');
  if (reviewFold) reviewFold.addEventListener('toggle', () => { _reviewFoldOpen = reviewFold.open; });

  const groupsFold = container.querySelector('#leader-groups-fold');
  const groupsHost = container.querySelector('#leader-groups-host');
  const groupsCard = container.querySelector('#leader-groups-card');
  const mountGroups = () => {
    if (!groupsHost || groupsHost.dataset.groupsMounted === '1' || !groupsHost.isConnected) return;
    groupsHost.dataset.groupsMounted = '1';
    import('../../../components/record/other-groups-view.js?v=20261102b')
      .then((m) => { if (groupsHost.isConnected) m.renderOtherGroupsView(groupsHost); });
  };
  if (groupsFold) {
    groupsFold.addEventListener('toggle', () => {
      _groupsFoldOpen = groupsFold.open;
      if (groupsFold.open) mountGroups();
    });
    if (groupsFold.open) mountGroups();
  }
  if (ctx?.navTarget?.section === 'groups' && groupsFold) {
    _groupsFoldOpen = true;
    groupsFold.open = true;
    mountGroups();
    if (groupsCard) smoothScroll(groupsCard, { block: 'center' });
  }

  const inspArea = container.querySelector('#leader-insp-area');
  const inspHost = container.querySelector('#leader-insp-host');
  const inspToggle = container.querySelector('#leader-insp-toggle');
  if (!inspArea || !inspHost || !inspToggle) return;
  const mountInsp = () => {
    if (inspHost.dataset.inspMounted === '1' || !inspHost.isConnected) return;
    inspHost.dataset.inspMounted = '1';
    import('./inspection-tab.js?v=20261102b').then((m) => {
      if (inspHost.isConnected) m.renderContent(ctx, inspHost);
    });
  };
  const applyInsp = () => {
    inspArea.classList.toggle('hidden', !_inspOpen);
    inspToggle.setAttribute('aria-expanded', _inspOpen ? 'true' : 'false');
    inspToggle.textContent = _inspOpen ? '收起考察' : '上传考察';
    if (_inspOpen) mountInsp();
  };
  inspToggle.addEventListener('click', () => {
    _inspOpen = !_inspOpen;
    applyInsp();
    if (_inspOpen) smoothScroll(inspArea, { block: 'nearest' });
  });
  if (_inspOpen || ctx?.navTarget?.section === 'inspection') {
    _inspOpen = true;
    applyInsp();
  }
  if (ctx?.navTarget?.section === 'inspection') smoothScroll(inspHost, { block: 'center' });
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
