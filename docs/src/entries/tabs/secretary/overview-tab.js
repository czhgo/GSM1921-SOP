// role: [工程师]+[AI]
// entries/tabs/secretary/overview-tab.js — 支书工作台·全局概况 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// 设计初衷（支书 2026-08-02 确认方向后记录）：
//   为什么有全局概况——支书需同步各支委/组长/委员工作进度，形成党支部整体运行态势总览；
//   解决什么问题——支书只看"进行时和未完成"的工作，快速掌握各维度进度与人员参与总体情况；
//   数据选取原则——同一套底层数据统一自动渲染，异常数据标橙并派生为支书待办。
// 重设计要点：单列进度总览，取消 2x2 四色卡片与四色左边条，主体色统一党建红。
// 2026-08-10 支书裁定：本页禁用 SVG 图标（不再引入 icon），类别用色点+文字标签区分。

import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260921a';
import { NoticeStore } from '../../../services/notice.js?v=20260921a';
import { ROLE_LABELS, ROLE_COLORS } from '../../../core/constants.js?v=20260921a';
import { AuthStore } from '../../../services/auth.js?v=20260921a';
import { dutyCardHtml } from '../../../components/workforce-duty-card.js?v=20260921a';
import { SecretaryOverviewStore, listWeeklyReportsPendingReview, reviewWeeklyReport, WEEKLY_REVIEW_STATUS } from '../../../services/secretary-overview.js?v=20260921a';
// S1–S4 滞留党员设计（2026-09-06 支书已批）：支书复核卡（只读查看徽标/备注/变更留痕）
import { getRosterStats } from '../../../services/roster.js?v=20260921a';
import { loadActivities } from '../../../services/activity.js?v=20260921a';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260921a';
import { AttendanceStatus } from '../../../core/domain.js?v=20260921a';
import { IssueStore, REPORT_CATEGORIES } from '../../../services/issues.js?v=20260921a';
// D2 裁决批二（2026-09-08 支书特批）：按人视图汇报区降级只读摘要 → 「去待办处理」定位跳转（pendingTarget 一次性消费）
import { PendingTarget } from '../../../core/pending-target.js?v=20260921a';
import { listPendingByReceiver, confirmExternalDispatch } from '../../../services/external-dispatch.js?v=20260921a';
import { getPersonName } from '../../../services/person.js?v=20260921a';

const OVERVIEW_TAB_HTML = `
  <div id="secretary-overview-content"></div>
`;

// 子视图切换状态（按维度 / 按人），同一会话内保持选择
let _overviewSubView = 'dimension';

/** 渲染全局概况 tab */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'overview') {
    tc.innerHTML = OVERVIEW_TAB_HTML;
    tc.dataset.currentTab = 'overview';
  }
  renderOverviewContent();
}

function renderOverviewContent() {
  const container = document.getElementById('secretary-overview-content');
  if (!container) return;

  // 子视图切换条（按维度 / 按人）——信息密度精确原则（P-012 分工的运行保障·做与看）：
  // 按维度 = 态势总览；按人 = L1 条线视角，看各角色在办概览（不含操作细节）
  // 2026-08-10 支书裁定：本页禁用 SVG 图标，切换条为纯文字（避免图标选取丑）
  const subTabs = [
    { key: 'dimension', label: '按维度' },
    { key: 'person', label: '按人' },
  ];
  const subTabsHtml = `
    <div class="inline-flex items-center gap-1 p-1 rounded-full bg-neutral-100">
      ${subTabs.map(t => `
        <button type="button"
          class="ov-sub-tab px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${_overviewSubView === t.key ? 'ov-sub-tab-active' : 'text-gray-600 hover:text-gray-700'} "
          data-subview="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  container.innerHTML = `<div class="space-y-4">${dutyCardHtml('secretary')}<div>${subTabsHtml}</div><div id="ov-subview-body"></div></div>`;

  // 绑定子切换
  container.querySelectorAll('.ov-sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _overviewSubView = btn.dataset.subview;
      renderOverviewContent();
    });
  });

  const body = document.getElementById('ov-subview-body');
  if (_overviewSubView === 'person') {
    renderPersonView(body);
  } else {
    renderDimensionView(body);
  }
}

/** 按人视图 v2：三区上下排布（问题优先）——2026-08-10 支书裁定重设计
 *  ① 汇报区（最上）：待答复只读摘要（D2 裁决批二 2026-09-08 降级）——计数 + 最近 3 条
 *     （谁/主题/时间）+「去待办处理 →」定位跳转；行内答复位只留待办页「待答复」顶卡
 *  ② 卡点区（次上）：各角色超期/缺口告警，行内"了解进展"（温和请求，措辞不用"要求"）
 *  ③ 进度区（最下）：角色×状态紧凑聚合表（一行一人，数据驱动，非卡片平铺）
 *  监管不插手：支书只答复/了解进展，无任何编辑他人待办入口（看 ≠ 做）
 *  本页禁用 SVG 图标（支书 2026-08-10 裁定），类别用色点+文字标签区分
 */
async function renderPersonView(container) {
  await IssueStore.loadAll();
  const today = new Date().toISOString().slice(0, 10);
  const people = SecretaryOverviewStore.getPersonOverview();
  const reports = IssueStore.getSecretaryPendingReports();

  container.innerHTML = `
    <div class="space-y-4">
      ${renderReportSection(reports)}
      ${renderBlockerSection(people, today)}
      ${renderProgressSection(people)}
    </div>
    <p class="text-[11px] text-gray-500 mt-3">
      按人视图 = L1 条线视角：支书看各角色在办与汇报（知情边界，看 ≠ 做）。汇报为只读摘要（答复到「待办」）；卡点行内可温和了解进展，不跳转他人工作台。
    </p>
  `;
  bindReportSection(container);
  bindBlockerSection(container);
}

/** 汇报区：待答复只读摘要（D2 裁决批二 2026-09-08 支书特批降级）
 *  待答复收件箱（原行内答复零跳转）→ 只读摘要：计数 + 最近 3 条（谁/主题/时间，无答复表单）
 *  + 「去待办处理 →」（跳待办页并打开该答复详情定位，PendingTarget 一次性消费）；
 *  行内答复位只留待办页「待答复」顶卡（批一保留，B2 唯一终答位）；本区无答复表单/无行内展开。 */
function renderReportSection(reports) {
  const emptyBox = (msg) => `
    <div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
      <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> ${msg}
    </div>`;

  if (!reports.length) {
    return `
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">汇报</h4>
          <span class="text-xs text-gray-500">待答复收件箱</span>
        </div>
        ${emptyBox('暂无待答复汇报')}
      </div>`;
  }

  // 只读摘要 = 最近 3 条（与待办页「待答复」顶卡同源，按提交时间倒序；谁/主题/时间）
  const sorted = [...reports].sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  const shown = sorted.slice(0, 3);
  const rows = shown.map(r => {
    const cat = REPORT_CATEGORIES[r.reportCategory] || '进度';
    const catColor = r.reportCategory === 'blocked' ? '#EF4444'
      : r.reportCategory === 'ask' ? '#F59E0B' : '#16A34A';
    const requester = r.requestedBy
      ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">了解进展</span>'
      : '';
    return `
      <div class="rounded-lg border ${r.reportCategory === 'blocked' ? 'border-red-200' : 'border-gray-100'} overflow-hidden">
        <button type="button" class="sec-goto-report w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left" data-report-id="${r.id}" title="去待办处理该答复">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${catColor};"></span>
          <span class="text-xs font-medium flex-shrink-0" style="color:${catColor};">${cat}</span>
          <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${r.title}</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${getPersonName(r.submittedBy) || '匿名'}</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${r.submittedAt}</span>
          ${requester}
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">去待办处理 →</span>
        </button>
      </div>`;
  }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">汇报</h4>
        <span class="text-xs text-gray-500">${reports.length} 条待答复 · 只读摘要（答复到「待办」）</span>
      </div>
      <div class="space-y-2">${rows}</div>
      ${sorted.length > shown.length ? `
        <button type="button" class="sec-goto-todo w-full mt-2 text-xs text-gray-500 hover:text-gray-600 text-left px-1 py-1 transition-colors">全部 ${sorted.length} 条 → 去待办处理</button>` : ''}
    </div>`;
}

/** 汇报区绑定（D2：只读摘要无表单——行级/区级跳待办定位） */
function bindReportSection(container) {
  container.querySelectorAll('.sec-goto-report').forEach(btn => {
    btn.addEventListener('click', () => {
      PendingTarget.set({ tab: 'todo', kind: 'report', id: btn.dataset.reportId });
      _gotoTodoTab();
    });
  });
  container.querySelectorAll('.sec-goto-todo').forEach(btn => {
    btn.addEventListener('click', () => {
      PendingTarget.set({ tab: 'todo', kind: 'report' });
      _gotoTodoTab();
    });
  });
}

/** D2 跳转：切到本台「待办」tab（todo tab renderContent 读取 pendingTarget 后展开定位；无目标落页顶） */
function _gotoTodoTab() {
  const btn = document.querySelector('.secretary-tab-btn[data-secretary-tab="todo"]');
  if (btn) { btn.click(); return; }
  showToast('info', '请到「待办」页处理待答复汇报');
}

/** 卡点区：各角色超期/缺口告警（按 deadline 升序），行内"了解进展" */
function renderBlockerSection(people, today) {
  const rows = [];
  people.forEach(p => {
    (p.todoGroups || []).forEach(g => {
      const overdueItems = (g.items || []).filter(it => it.deadline && it.deadline < today);
      if (overdueItems.length) {
        rows.push({
          role: p,
          title: g.title,
          count: overdueItems.length,
          deadline: overdueItems.reduce((m, it) => (it.deadline < m ? it.deadline : m), overdueItems[0].deadline),
        });
      }
    });
  });
  rows.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));

  if (!rows.length) {
    return `
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">卡点</h4>
          <span class="text-xs text-gray-500">超期/缺口告警</span>
        </div>
        <div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
          <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 无超期卡点
        </div>
      </div>`;
  }

  const html = rows.map(r => `
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EF4444;"></span>
      <span class="text-sm font-medium text-gray-700 w-24 flex-shrink-0">${r.role.label}</span>
      <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${r.title} 超期 ${r.count} 项</span>
      <span class="text-[11px] tabular-nums text-red-600 font-medium flex-shrink-0">${r.deadline}</span>
      <button type="button" class="sec-ask-report btn-accent-soft text-xs px-2.5 py-1 flex-shrink-0"
        style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)"
        data-person-id="${r.role.personIds[0]}" data-role="${r.role.role}" data-note="${r.title} 已超期">了解进展</button>
    </div>`).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">卡点</h4>
        <span class="text-xs text-gray-500">超期/缺口告警 · ${rows.length} 项</span>
      </div>
      <div class="space-y-1.5">${html}</div>
    </div>`;
}

function bindBlockerSection(container) {
  container.querySelectorAll('.sec-ask-report').forEach(btn => {
    btn.addEventListener('click', () => {
      IssueStore.requestReport(btn.dataset.personId, btn.dataset.role, btn.dataset.note || '');
      showToast('success', `已请${getPersonName(btn.dataset.personId)}汇报进展`);
      renderOverviewContent();
    });
  });
}

/** 进度区：角色×状态紧凑聚合表（一行一人，取消卡片平铺） */
function renderProgressSection(people) {
  const rows = people.map(p => {
    const color = ROLE_COLORS[p.role] || ROLE_COLORS.all;
    const totalActive = p.todoCount + p.activities.length + p.taskforces.length;
    return `
      <div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="--acc-dot-dark:${color.textDark};background:${color.text};"></span>
        <span class="text-sm font-semibold text-gray-800 w-24 flex-shrink-0">${p.label}</span>
        <span class="text-xs text-gray-500 flex-1 min-w-0 truncate">${p.names}</span>
        <span class="text-xs tabular-nums text-gray-600 flex-shrink-0">在办 ${totalActive}</span>
        <span class="text-xs tabular-nums ${p.overdueCount ? 'text-red-600 font-medium' : 'text-gray-500'} w-16 text-right flex-shrink-0">超期 ${p.overdueCount}</span>
        <span class="text-xs tabular-nums text-gray-500 w-16 text-right flex-shrink-0">活动 ${p.activities.length}</span>
        <span class="text-xs tabular-nums text-gray-500 w-16 text-right flex-shrink-0">专班 ${p.taskforces.length}</span>
      </div>`;
  }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">进度</h4>
        <span class="text-xs text-gray-500">各角色在办聚合</span>
      </div>
      <div class="space-y-1.5">${rows}</div>
    </div>`;
}

/** 按维度视图：四维度态势总览（原内容） */
function renderDimensionView(container) {
  const data = SecretaryOverviewStore.getOverview();
  const { attendance, inspection, activity, propaganda } = data;

  // ════════════════════════════════════════════════════════════
  //  管理科学·执行层仪表盘（支书 2026-08-08 重设计）
  //  2026-09-10 支书裁定（卡片去留/合并）：取消 KPI 五连卡体系——
  //   ① 必要指标（复盘问题/归档完成率/考察积压/待办异常）= 内联统计条（沿用活动管理内联条样式），
  //      置于异常队列上方；不做出勤率 KPI（出勤数据改由 ③ 内联迷你趋势承载）。
  //   ② 异常优先队列：按紧急度排序（超期>待处理>常规），各带负责人+直达；
  //      出勤趋势 sparkline 内联于队列底部（近 6 场活动，含最新值），不新增出勤率指标卡。
  //   ③ 党员发展阶段分布并入「滞留党员复核」卡（迷你比例条 + 图例）。
  //  数据源：SecretaryOverviewStore（与待办派生同源，不新增实体）
  // ════════════════════════════════════════════════════════════

  const metricStatusOf = (hit, ok = true) => hit ? 'ok' : ok ? 'warn' : 'danger';
  const metricDot = s => s === 'ok' ? '#16A34A' : s === 'warn' ? '#D97706' : '#EF4444';

  // 待办异常总数（异常优先管理：目标 0）
  const anomalyTotal = attendance.makeupPending + inspection.pendingInspections
    + inspection.overdueInspections + activity.pendingAuth + propaganda.pendingArchive;

  // 会议应到口径（R-28，2026-09-13 支书裁定）：原「滞留党员复核」只读卡删除 →
  // 「应到＝在册党员 − 滞留剔除」降为指标条一行；滞留维护位仍在组织委员「成员名册」（→支书确认链）。
  const rosterStats = getRosterStats({ type: '支部党员大会' });

  // 必要指标（取消 KPI 五连卡：只保留少量必要指标，数字内联呈现；status 以圆点色表达，目标/口径入 title）
  const metrics = [
    { label: '复盘问题', value: activity.reviewIssues, unit: '条', status: activity.reviewIssues > 0 ? 'ok' : 'warn', title: '真问题导向' },
    // 2026-09-13 彻查批次：原「归档完成率（%）· 目标 100%」＝KPI 式表述（用户明确要求不得出现）
    // → 改为「待归档材料（条）」，与「考察积压/待办异常」同口径：只报缺口，不设完成率目标
    { label: '待归档材料', value: propaganda.pendingArchive, unit: '条', status: metricStatusOf(!propaganda.pendingArchive, propaganda.pendingArchive <= 3), title: '待归档条数（只报缺口，不设比率目标）' },
    { label: '会议应到', value: rosterStats.expected, unit: '人', status: 'ok', title: `在册党员 ${rosterStats.partyTotal} − 滞留剔除 ${rosterStats.detainedParty}（滞留＝组织关系保留但不参加日常会议）` },
    // 2026-08-10 支书裁定：考察积压/待办异常无既定目标值，不设虚假目标（状态由圆点色表达）
    { label: '考察积压', value: inspection.pendingInspections + inspection.overdueInspections, unit: '条', status: inspection.overdueInspections ? 'danger' : inspection.pendingInspections ? 'warn' : 'ok', title: '待确认 + 超期' },
    { label: '待办异常', value: anomalyTotal, unit: '项', status: anomalyTotal ? 'danger' : 'ok', title: '异常优先管理 · 目标 0' },
  ];

  // 出勤趋势（近 6 场有考勤记录的活动）
  const trend = _attendanceTrend();

  // 异常优先队列（按紧急度：超期 3 > 待处理 2 > 常规 1）
  const exceptions = [];
  const pushEx = (level, label, detail, owner, action) => exceptions.push({ level, label, detail, owner, action });
  if (attendance.absentPeople.length) pushEx(2, '缺勤', attendance.absentPeople.join('、'), '纪检委员', { urge: 'attendance-absent' });
  if (attendance.makeupPending) pushEx(2, '补课未完成', `${attendance.makeupPending} 人`, '纪检委员', { urge: 'attendance-makeup' });
  if (inspection.overdueInspections) pushEx(3, '考察超期', `${inspection.overdueInspections} 条`, '纪检委员', { urge: 'inspection-overdue' });
  if (inspection.pendingInspections) pushEx(2, '考察待确认', `${inspection.pendingInspections} 条`, '纪检委员', { urge: 'inspection-pending' });
  if (activity.pendingAuth) pushEx(1, '赋权待审批', `${activity.pendingAuth} 个活动`, '支书', { direct: 'assign' });
  if (propaganda.pendingArchive) pushEx(1, '待归档', `${propaganda.pendingArchive} 个活动`, '宣传委员', { urge: 'archive-pending' });
  exceptions.sort((a, b) => b.level - a.level);

  // 党员发展阶段分布
  const stages = [
    { label: '积极分子', value: inspection.stageCounts.activist,     color: '#94A3B8' },
    { label: '发展对象', value: inspection.stageCounts.target,       color: '#38BDF8' },
    { label: '预备党员', value: inspection.stageCounts.probationary, color: '#FBBF24' },
    { label: '正式党员', value: inspection.stageCounts.full,         color: '#EF4444' },
  ];
  const stageTotal = stages.reduce((s, x) => s + x.value, 0) || 1;

  // 文件流外发确认（支书 2026-08-10 裁定）：微信外发文件到达支书后在此确认，形成闭环
  const pendingDispatches = listPendingByReceiver('secretary');
  const dispatchRows = pendingDispatches.map(d => `
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F59E0B;"></span>
      <span class="text-sm font-medium text-gray-700 w-24 flex-shrink-0">文件待确认</span>
      <span class="text-xs text-gray-500 flex-1 truncate">${d.refLabel} · ${d.senderName} 已微信外发</span>
      <span class="text-xs text-gray-500 w-16 flex-shrink-0">${d.senderName}</span>
      <button type="button" class="sec-ed-confirm btn-accent-soft text-xs px-2.5 py-1" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-ed-id="${d.id}">确认收到</button>
    </div>`);

  // 宣传周报待审核（SOP-B-40 ②，2026-09-19 批次 94）：宣传委员报送后在此审核（通过 / 退回）。
  // 判据与写口单一源 = services/secretary-overview.js（勿在页面另写状态名）。
  const weeklyPending = listWeeklyReportsPendingReview();
  const weeklyRows = weeklyPending.map(r => `
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#0EA5E9;"></span>
      <span class="text-sm font-medium text-gray-700 w-24 flex-shrink-0">周报待审核</span>
      <span class="text-xs text-gray-500 flex-1 truncate">${r.week}（${r.weekRange}）· ${getPersonName(r.submittedBy) || '宣传委员'} 报送于 ${r.submittedAt || '—'}</span>
      <span class="text-xs text-gray-500 w-16 flex-shrink-0">宣传委员</span>
      <button type="button" class="sec-weekly-btn btn-accent-soft text-xs px-2.5 py-1" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-weekly-id="${r.id}" data-weekly-decision="approved">通过</button>
      <button type="button" class="sec-weekly-btn btn-accent-soft text-xs px-2.5 py-1" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-weekly-id="${r.id}" data-weekly-decision="returned">退回</button>
    </div>`);

  const exceptionsHtml = (exceptions.length === 0 && dispatchRows.length === 0 && weeklyRows.length === 0)
    ? `<div class="flex items-center gap-2 py-3 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 全部正常，无待处理异常
       </div>`
    : dispatchRows.join('') + weeklyRows.join('') + exceptions.map(e => {
        const dot = e.level === 3 ? '#EF4444' : e.level === 2 ? '#F59E0B' : '#3B82F6';
        const actionHtml = e.action.urge
          ? `<button type="button" class="sec-urge-btn btn-accent-soft text-xs px-2.5 py-1" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-urge="${e.action.urge}">催办</button>`
          : `<button type="button" class="sec-urge-btn btn-accent-soft text-xs px-2.5 py-1" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-direct="${e.action.direct}">直达处理</button>`;
        return `
          <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${dot};"></span>
            <span class="text-sm font-medium text-gray-700 w-24 flex-shrink-0">${e.label}</span>
            <span class="text-xs text-gray-500 flex-1 truncate">${e.detail}</span>
            <span class="text-xs text-gray-500 w-16 flex-shrink-0">${e.owner}</span>
            ${actionHtml}
          </div>`;
      }).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 必要指标内联统计条（取消 KPI 五连卡；不出勤率 KPI） -->
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 py-2 border-b border-gray-100">
        ${metrics.map(m => `
          <span class="inline-flex items-center gap-1.5" title="${esc(m.title)}">
            <span class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${metricDot(m.status)};"></span>
            <span class="font-semibold text-gray-700 tabular-nums">${m.value}</span>
            <span>${m.label}（${m.unit}）</span>
          </span>
        `).join('')}
      </div>

      <!-- 异常优先队列（出勤迷你趋势内联于队列底部） -->
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">异常优先队列</h4>
          <span class="text-xs text-gray-500">按紧急度排序 · ${exceptions.length + pendingDispatches.length} 项</span>
        </div>
        <div class="space-y-1.5">${exceptionsHtml}</div>
        <!-- 出勤迷你趋势（近 6 场活动出勤率；不并入 KPI、不新增出勤率指标卡） -->
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-500">近 6 场活动出勤率</span>
            ${trend.length ? `<span class="text-xs text-gray-500">最新一场 ${trend[trend.length - 1].rate}%</span>` : ''}
          </div>
          ${_sparkline(trend)}
        </div>
        <!-- 出勤率偏低提示（SOP-B-15 / SOP-B-7）：只作提示、不触发任何动作；提示线为可调参数（非制度门槛） -->
        ${(attendance.lowSessions && attendance.lowSessions.length) ? `
        <div class="mt-2 text-xs text-amber-700 leading-5">
          出勤率偏低提示（仅提示，不触发任何处置）：本月 ${attendance.lowSessions.length} 场低于提示线 ${attendance.lowRateHint}% —— ${esc(attendance.lowSessions.map(s => `${s.activity}（${s.rate}%）`).join('、'))}
        </div>` : ''}
      </div>

      <!-- R-28（2026-09-13 支书裁定）：原「滞留党员复核」只读卡删除——
           ① 应到口径已降为上方指标条一行（会议应到）；
           ② 党员发展阶段分布降为下方内联迷你条（不占卡）；
           ③ 滞留人数并入口径说明 + 名册入口（写动作在组织委员「成员名册」→ 支书确认；学期末待办提醒保留）。 -->
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-gray-500 py-1">
        <span>
          滞留 <span class="font-semibold text-gray-700 tabular-nums">${rosterStats.detainedParty}</span> 人已从会议应到剔除（身份保留 · 通知照发 · 表决快照剔除）
          —— 维护在组织委员「成员名册」
          <a href="./workspace/org.html?tab=roster" class="text-blue-600 hover:text-blue-800">去查看 →</a>
        </span>
        <span class="inline-flex items-center gap-2.5 flex-wrap">
          <span>党员结构</span>
          <span class="inline-flex h-1.5 w-20 rounded-full bg-neutral-100 overflow-hidden">
            ${stages.map(s => s.value > 0 ? `<span style="width:${(s.value / stageTotal * 100).toFixed(1)}%;background:${s.color};" title="${esc(s.label)} ${s.value}人"></span>` : '').join('')}
          </span>
          ${stages.map(s => `<span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full" style="background:${s.color};"></span>${esc(s.label)} <span class="tabular-nums">${s.value}</span></span>`).join('')}
        </span>
      </div>
    </div>
  `;

  // 催办/直达绑定（t5b：催办通知对应委员 / 直达本人工作台）
  container.querySelectorAll('.sec-ed-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmExternalDispatch(btn.dataset.edId);
      showToast('success', '已确认收到，文件流转完成');
      renderDimensionView(container);
    });
  });
  // 宣传周报审核（SOP-B-40 ②）：通过 / 退回（退回可写一句说明，随留痕给宣传委员）
  container.querySelectorAll('.sec-weekly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const decision = btn.dataset.weeklyDecision;
      const reviewerId = AuthStore.getCurrentUser()?.personId;
      let note = '';
      if (decision === WEEKLY_REVIEW_STATUS.RETURNED) {
        note = window.prompt('退回说明（可留空）——将随留痕显示给宣传委员：', '') || '';
      }
      const res = reviewWeeklyReport({ id: btn.dataset.weeklyId, decision, reviewerId, note });
      if (!res.ok) { showToast('error', `审核失败：${res.reason}`); return; }
      showToast('success', decision === WEEKLY_REVIEW_STATUS.APPROVED ? '周报已通过' : '周报已退回宣传委员');
      renderDimensionView(container);
    });
  });
  container.querySelectorAll('.sec-urge-btn[data-urge]').forEach(btn => {
    btn.addEventListener('click', () => handleUrge(btn.dataset.urge));
  });
  container.querySelectorAll('.sec-urge-btn[data-direct]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.direct;
      const tabBtn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${tabId}"]`);
      if (tabBtn) tabBtn.click();
      const tabLabels = { calendar: '活动管理', assign: '赋权管理', notification: '通知发布' };
      showToast('info', `已直达${tabLabels[tabId] || '对应功能'}`);
    });
  });
}

/** 近 6 场有考勤记录活动的出勤率序列（趋势线数据源） */
function _attendanceTrend() {
  const records = loadAttendanceRecords();
  const activities = loadActivities();
  return activities
    .filter(a => a.date && records.some(r => r.activityId === a.id))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(-6)
    .map(a => {
      const rs = records.filter(r => r.activityId === a.id);
      const present = rs.filter(r =>
        r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP
      ).length;
      return { date: a.date, rate: rs.length ? Math.round((present / rs.length) * 100) : 0 };
    });
}

/** 迷你 sparkline（内联 SVG，无外部依赖，主题色描线） */
function _sparkline(series) {
  if (!series.length) return '<p class="text-xs text-gray-500 py-1">暂无考勤历史数据</p>';
  const w = 560, h = 40, pad = 3;
  const max = Math.max(...series.map(s => s.rate), 1);
  const min = Math.min(...series.map(s => s.rate), 0);
  const range = Math.max(max - min, 1);
  const stepX = (w - pad * 2) / Math.max(series.length - 1, 1);
  const pts = series.map((s, i) => [
    pad + i * stepX,
    h - pad - ((s.rate - min) / range) * (h - pad * 2),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return `
    <svg viewBox="0 0 ${w} ${h}" class="w-full h-10" preserveAspectRatio="none">
      <path d="${area}" fill="var(--app-accent-bg, rgba(185,28,28,0.12))"></path>
      <path d="${line}" fill="none" stroke="var(--app-accent, #B91C1C)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
      ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 2.5 : 1.5}" fill="var(--app-accent, #B91C1C)"><title>${series[i].date} · 出勤率 ${series[i].rate}%</title></circle>`).join('')}
    </svg>`;
}

// t5b：催办映射——全局概况异常指标 → 对应委员（现以系统通知+待办落地，未来接入北大学生邮箱发送）
// A④ 文案定稿（2026-09-10 支书裁定：中性事务式）——统一「关于〈业务域 · 事项〉，请及时跟进（截止 <时限/无>）」
const URGE_MAP = {
  'attendance-absent': {
    role: 'disc-commissioner',
    title: '考勤催办',
    content: '关于「考勤纪律 · 本月缺勤核实」，请及时跟进（无明确时限）。',
    targetModule: 'attendance',
    targetUrl: 'workspace/disc.html?tab=attendance',
  },
  'attendance-makeup': {
    role: 'disc-commissioner',
    title: '补课催办',
    content: '关于「考勤纪律 · 未完成补课任务」，请及时跟进（无明确时限）。',
    targetModule: 'attendance',
    targetUrl: 'workspace/disc.html?tab=makeup',
  },
  'inspection-pending': {
    role: 'disc-commissioner',
    title: '考察确认催办',
    content: '关于「考察 · 待确认考察记录」，请及时跟进（无明确时限）。',
    targetModule: 'party',
    targetUrl: 'workspace/disc.html?tab=inspection',
  },
  'inspection-overdue': {
    role: 'disc-commissioner',
    title: '考察超期催办',
    content: '关于「考察 · 超期考察记录」，请及时跟进（无明确时限）。',
    targetModule: 'party',
    targetUrl: 'workspace/disc.html?tab=inspection',
  },
  'archive-pending': {
    role: 'prop-commissioner',
    title: '归档催办',
    content: '关于「归档宣传 · 待归档材料」，请及时跟进（无明确时限）。',
    targetModule: 'workspace',
    targetUrl: 'workspace/prop.html?tab=archive',
  },
};

function handleUrge(urgeKey) {
  const cfg = URGE_MAP[urgeKey];
  if (!cfg) return;
  // 签发人取当前真实角色（2026-09-13 彻查批次：此前 actorRole 硬编码 'secretary'、
  //   正文写死「支书提醒：」→ 副支书签发也被记成支书，审计失真）
  const me = AuthStore.getCurrentUser() || {};
  const actorRole = me.role || 'secretary';
  NoticeStore.add({
    title: cfg.title,
    content: cfg.content,
    priority: 'urgent',
    targetModule: cfg.targetModule,
    targetUrl: cfg.targetUrl,
    actionable: true,
    actionRoles: [cfg.role],
    actionTask: cfg.title,
    publishedBy: ROLE_LABELS[actorRole] || '支书',
  }, actorRole);
  const roleLabel = ROLE_LABELS[cfg.role] || cfg.role;
  showToast('success', `已向${roleLabel}发送催办通知`);
}
