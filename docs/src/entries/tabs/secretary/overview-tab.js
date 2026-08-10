﻿﻿// role: [工程师]+[AI]
// entries/tabs/secretary/overview-tab.js — 书记工作台·全局概况 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// 设计初衷（书记 2026-08-02 确认方向后记录）：
//   为什么有全局概况——书记需同步各支委/组长/委员工作进度，形成党支部整体运行态势总览；
//   解决什么问题——书记只看"进行时和未完成"的工作，快速掌握各维度进度与人员参与总体情况；
//   数据选取原则——同一套底层数据统一自动渲染，异常数据标橙并派生为书记待办。
// 重设计要点：单列进度总览，取消 2x2 四色卡片与四色左边条，主体色统一党建红。
// 2026-08-10 书记裁定：本页禁用 SVG 图标（不再引入 icon），类别用色点+文字标签区分。

import { showToast } from '../../../core/utils.js?v=20260810a';
import { NoticeStore } from '../../../services/notice.js?v=20260810a';
import { ROLE_LABELS, ROLE_COLORS } from '../../../core/constants.js?v=20260810a';
import { SecretaryOverviewStore } from '../../../services/secretary-overview.js?v=20260810a';
import { badgeHtml } from '../../../components/badge.js?v=20260810a';
import { loadActivities } from '../../../services/activity.js?v=20260810a';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260810a';
import { AttendanceStatus } from '../../../core/domain.js?v=20260810a';
import { IssueStore, deriveIssueDisplayState, REPORT_CATEGORIES } from '../../../services/issues.js?v=20260810a';
import { AuthStore } from '../../../services/auth.js?v=20260810a';
import { listPendingByReceiver, confirmExternalDispatch } from '../../../services/external-dispatch.js?v=20260810a';
import { getPersonName } from '../../../mock/index.js?v=20260810a';

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

  // 子视图切换条（按维度 / 按人）——信息密度精确原则（P-015 第四道防线·知情边界）：
  // 按维度 = 态势总览；按人 = L1 条线视角，看各角色在办概览（不含操作细节）
  // 2026-08-10 书记裁定：本页禁用 SVG 图标，切换条为纯文字（避免图标选取丑）
  const subTabs = [
    { key: 'dimension', label: '按维度' },
    { key: 'person', label: '按人' },
  ];
  const subTabsHtml = `
    <div class="inline-flex items-center gap-1 p-1 rounded-full bg-neutral-100">
      ${subTabs.map(t => `
        <button type="button"
          class="ov-sub-tab px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${_overviewSubView === t.key ? 'ov-sub-tab-active' : 'text-gray-500 hover:text-gray-700'} "
          data-subview="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  container.innerHTML = `<div class="space-y-4"><div>${subTabsHtml}</div><div id="ov-subview-body"></div></div>`;

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

/** 按人视图 v2：三区上下排布（问题优先）——2026-08-10 书记裁定重设计
 *  ① 汇报区（最上）：待答复收件箱——成员汇报（进度/卡点/请示）+ 书记"了解进展"请求，行内答复零跳转
 *  ② 卡点区（次上）：各角色超期/缺口告警，行内"了解进展"（温和请求，措辞不用"要求"）
 *  ③ 进度区（最下）：角色×状态紧凑聚合表（一行一人，数据驱动，非卡片平铺）
 *  监管不插手：书记只答复/了解进展，无任何编辑他人待办入口（看 ≠ 做）
 *  本页禁用 SVG 图标（书记裁定），类别用色点+文字标签区分
 */
async function renderPersonView(container) {
  await IssueStore.loadAll();
  const today = new Date().toISOString().slice(0, 10);
  const people = SecretaryOverviewStore.getPersonOverview();
  const reports = IssueStore.getSecretaryPendingReports();

  container.innerHTML = `
    <div class="space-y-4">
      ${renderReportSection(reports, today)}
      ${renderBlockerSection(people, today)}
      ${renderProgressSection(people)}
    </div>
    <p class="text-[11px] text-gray-400 mt-3">
      按人视图 = L1 条线视角：书记看各角色在办与汇报（知情边界，看 ≠ 做）。汇报/卡点行内答复与了解进展，不跳转他人工作台。
    </p>
  `;
  bindReportSection(container);
  bindBlockerSection(container);
}

/** 汇报区：待答复收件箱（卡点优先 → 请示 → 进度；待答复优先于待汇报） */
function renderReportSection(reports, today) {
  const emptyBox = (msg) => `
    <div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
      <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> ${msg}
    </div>`;

  if (!reports.length) {
    return `
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">汇报</h4>
          <span class="text-xs text-gray-400">待答复收件箱</span>
        </div>
        ${emptyBox('暂无待答复汇报')}
      </div>`;
  }

  const catOrder = { blocked: 0, ask: 1, progress: 2 };
  const sorted = [...reports].sort((a, b) => {
    const ca = catOrder[a.reportCategory] ?? 3;
    const cb = catOrder[b.reportCategory] ?? 3;
    if (ca !== cb) return ca - cb;
    const pa = a.resultPending ? 0 : 1;
    const pb = b.resultPending ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (b.submittedAt || '').localeCompare(a.submittedAt || '');
  });

  const rows = sorted.map(r => {
    const cat = REPORT_CATEGORIES[r.reportCategory] || '进度';
    const catColor = r.reportCategory === 'blocked' ? '#EF4444'
      : r.reportCategory === 'ask' ? '#F59E0B' : '#16A34A';
    const ds = deriveIssueDisplayState(r);
    const requester = r.requestedBy
      ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">了解进展</span>'
      : '';
    return `
      <div class="rounded-lg border ${r.reportCategory === 'blocked' ? 'border-red-200' : 'border-gray-100'} overflow-hidden">
        <button type="button" class="sec-report-toggle w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left" data-report-id="${r.id}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${catColor};"></span>
          <span class="text-xs font-medium flex-shrink-0" style="color:${catColor};">${cat}</span>
          <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${r.title}</span>
          <span class="text-xs text-gray-400 flex-shrink-0">${getPersonName(r.submittedBy) || '匿名'}</span>
          <span class="text-xs text-gray-400 flex-shrink-0">${r.submittedAt}</span>
          ${requester}
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass} flex-shrink-0">${ds.label}</span>
        </button>
        <div id="report-detail-${r.id}" class="hidden px-3 pb-3 border-t border-gray-100">
          ${renderReportDetail(r)}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">汇报</h4>
        <span class="text-xs text-gray-400">${reports.length} 条待答复 · 行内答复</span>
      </div>
      <div class="space-y-2">${rows}</div>
    </div>`;
}

/** 汇报详情：正文 + 了解进展说明 + 对话时间线 + 答复输入区 */
function renderReportDetail(r) {
  const requesterNote = r.requestedBy && r.requestedNote
    ? `<div class="rounded-lg p-2 bg-blue-50 mt-2"><p class="text-xs text-blue-700">书记了解进展：${r.requestedNote}</p></div>`
    : '';
  const comments = (r.comments || []).filter(c => !c.hidden).map(c => {
    const icon = c.kind === 'dispatch' ? '→' : c.kind === 'reply' ? '答'
      : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
    const bg = c.kind === 'reply' ? 'bg-red-50/70' : c.kind === 'result' ? 'bg-green-50'
      : c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
    return `
      <div class="rounded-lg p-2 ${bg}">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="text-xs font-medium text-gray-700">${icon} ${getPersonName(c.author) || '匿名'}</span>
          ${c.kind === 'reply' ? `<span class="text-xs px-1 py-0.5 rounded font-medium" style="background:var(--app-accent-bg,rgba(185,28,28,0.1));color:var(--app-accent,#B91C1C);">正式答复</span>` : ''}
          <span class="text-xs text-gray-400">${c.createdAt}</span>
        </div>
        <p class="text-xs text-gray-600 whitespace-pre-wrap">${c.body}</p>
      </div>`;
  }).join('');
  const timeline = comments || '<p class="text-xs text-gray-400 py-2">暂无对话</p>';

  return `
    ${r.body ? `<p class="text-xs text-gray-600 whitespace-pre-wrap mt-2">${r.body}</p>` : ''}
    ${requesterNote}
    <div class="space-y-2 mt-2">${timeline}</div>
    ${r.status === 'open' ? `
      <div class="flex gap-2 mt-2">
        <input type="text" id="report-comment-${r.id}" class="input-flat text-xs flex-1" placeholder="添加评论…">
        <button type="button" class="sec-report-comment btn-accent-soft text-xs px-3 py-2" data-report-id="${r.id}">评论</button>
        <button type="button" class="sec-report-reply btn-accent text-xs px-3 py-2 whitespace-nowrap" data-report-id="${r.id}">正式答复</button>
      </div>` : ''}
  `;
}

function bindReportSection(container) {
  container.querySelectorAll('.sec-report-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const detail = document.getElementById('report-detail-' + btn.dataset.reportId);
      if (detail) detail.classList.toggle('hidden');
    });
  });
  container.querySelectorAll('.sec-report-comment').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.reportId;
      const body = document.getElementById('report-comment-' + id)?.value?.trim();
      if (!body) { showToast('error', '请输入评论内容'); return; }
      const user = AuthStore.getCurrentUser();
      IssueStore.addComment(id, user?.personId || 'u_sec', 'secretary', body, 'comment');
      showToast('success', '评论已添加');
      renderOverviewContent();
    });
  });
  container.querySelectorAll('.sec-report-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.reportId;
      const body = document.getElementById('report-comment-' + id)?.value?.trim();
      if (!body) { showToast('error', '请输入答复内容'); return; }
      const user = AuthStore.getCurrentUser();
      IssueStore.addComment(id, user?.personId || 'u_sec', 'secretary', body, 'reply');
      showToast('success', '正式答复已发回');
      renderOverviewContent();
    });
  });
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
          <span class="text-xs text-gray-400">超期/缺口告警</span>
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
      <span class="text-[11px] tabular-nums text-red-500 font-medium flex-shrink-0">${r.deadline}</span>
      <button type="button" class="sec-ask-report btn-accent-soft text-xs px-2.5 py-1 flex-shrink-0"
        data-person-id="${r.role.personIds[0]}" data-role="${r.role.role}" data-note="${r.title} 已超期">了解进展</button>
    </div>`).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">卡点</h4>
        <span class="text-xs text-gray-400">超期/缺口告警 · ${rows.length} 项</span>
      </div>
      <div class="space-y-1">${html}</div>
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
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color.text};"></span>
        <span class="text-sm font-semibold text-gray-800 w-24 flex-shrink-0">${p.label}</span>
        <span class="text-xs text-gray-500 flex-1 min-w-0 truncate">${p.names}</span>
        <span class="text-xs tabular-nums text-gray-600 flex-shrink-0">在办 ${totalActive}</span>
        <span class="text-xs tabular-nums ${p.overdueCount ? 'text-red-500 font-medium' : 'text-gray-400'} w-16 text-right flex-shrink-0">超期 ${p.overdueCount}</span>
        <span class="text-xs tabular-nums text-gray-400 w-16 text-right flex-shrink-0">活动 ${p.activities.length}</span>
        <span class="text-xs tabular-nums text-gray-400 w-16 text-right flex-shrink-0">专班 ${p.taskforces.length}</span>
      </div>`;
  }).join('');

  return `
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">进度</h4>
        <span class="text-xs text-gray-400">各角色在办聚合</span>
      </div>
      <div class="space-y-1">${rows}</div>
    </div>`;
}

/** 按维度视图：四维度态势总览（原内容） */
function renderDimensionView(container) {
  const data = SecretaryOverviewStore.getOverview();
  const { attendance, inspection, activity, propaganda } = data;

  // ════════════════════════════════════════════════════════════
  //  管理科学·执行层仪表盘（书记 2026-08-08 重设计，替代原四卡鸡肋面板）
  //  ① KPI 顶栏：数值 + 目标对比 + 达标状态（5 秒法则，首屏全见）
  //  ② 出勤趋势：近 6 场活动出勤率 sparkline（趋势 + 最新值）
  //  ③ 异常优先队列：按紧急度排序（超期>待处理>常规），各带负责人+直达
  //  ④ 党员发展分布 + 一句话叙事（what changed and why）
  //  数据源：SecretaryOverviewStore（与待办派生同源，不新增实体）
  // ════════════════════════════════════════════════════════════

  const kpiStatusOf = (hit, ok = true) => hit ? 'ok' : ok ? 'warn' : 'danger';
  const statusBadge = s => s === 'ok' ? badgeHtml('达标', 'success')
    : s === 'warn' ? badgeHtml('欠佳', 'warning') : badgeHtml('风险', 'danger');
  const barColor = s => s === 'ok' ? '#16A34A' : s === 'warn' ? '#D97706' : '#EF4444';

  // 待办异常总数（异常优先管理：目标 0）
  const anomalyTotal = attendance.makeupPending + inspection.pendingInspections
    + inspection.overdueInspections + activity.pendingAuth + propaganda.pendingArchive;

  const kpis = [
    { label: '本月出勤率', value: attendance.attendanceRate, unit: '%', target: '目标 ≥90%', status: kpiStatusOf(attendance.attendanceRate >= 90, attendance.attendanceRate >= 80), bar: true },
    { label: '复盘问题', value: activity.reviewIssues, unit: '条', target: '真问题导向', status: activity.reviewIssues > 0 ? 'ok' : 'warn', bar: false },
    { label: '归档完成率', value: propaganda.archiveRate, unit: '%', target: '目标 100%', status: kpiStatusOf(propaganda.archiveRate >= 100, propaganda.archiveRate >= 80), bar: true },
    // 2026-08-10 书记裁定：考察积压/待办异常无既定目标值，不设虚假目标（状态由达标/欠佳/风险徽章表达）
    { label: '考察积压', value: inspection.pendingInspections + inspection.overdueInspections, unit: '条', target: null, status: inspection.overdueInspections ? 'danger' : inspection.pendingInspections ? 'warn' : 'ok', bar: false },
    { label: '待办异常', value: anomalyTotal, unit: '项', target: null, status: anomalyTotal ? 'danger' : 'ok', bar: false },
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
  if (activity.pendingAuth) pushEx(1, '赋权待审批', `${activity.pendingAuth} 个活动`, '书记', { direct: 'assign' });
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

  // 文件流外发确认（书记 2026-08-10 裁定）：微信外发文件到达书记后在此确认，形成闭环
  const pendingDispatches = listPendingByReceiver('secretary');
  const dispatchRows = pendingDispatches.map(d => `
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F59E0B;"></span>
      <span class="text-sm font-medium text-gray-700 w-24 flex-shrink-0">文件待确认</span>
      <span class="text-xs text-gray-500 flex-1 truncate">${d.refLabel} · ${d.senderName} 已微信外发</span>
      <span class="text-xs text-gray-400 w-16 flex-shrink-0">${d.senderName}</span>
      <button type="button" class="sec-ed-confirm btn-accent-soft text-xs px-2.5 py-1" data-ed-id="${d.id}">确认收到</button>
    </div>`);

  const exceptionsHtml = (exceptions.length === 0 && dispatchRows.length === 0)
    ? `<div class="flex items-center gap-2 py-3 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 全部正常，无待处理异常
       </div>`
    : dispatchRows.join('') + exceptions.map(e => {
        const dot = e.level === 3 ? '#EF4444' : e.level === 2 ? '#F59E0B' : '#3B82F6';
        const actionHtml = e.action.urge
          ? `<button type="button" class="sec-urge-btn btn-accent-soft text-xs px-2.5 py-1" data-urge="${e.action.urge}">催办</button>`
          : `<button type="button" class="sec-urge-btn btn-accent-soft text-xs px-2.5 py-1" data-direct="${e.action.direct}">直达处理</button>`;
        return `
          <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${dot};"></span>
            <span class="text-sm font-medium text-gray-700 w-24 flex-shrink-0">${e.label}</span>
            <span class="text-xs text-gray-500 flex-1 truncate">${e.detail}</span>
            <span class="text-xs text-gray-400 w-16 flex-shrink-0">${e.owner}</span>
            ${actionHtml}
          </div>`;
      }).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <!-- KPI 顶栏 -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        ${kpis.map(k => `
          <div class="card rounded-xl p-4">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-gray-500">${k.label}</span>
              ${statusBadge(k.status)}
            </div>
            <div class="text-2xl font-bold text-gray-800 leading-none">${k.value}<span class="text-xs text-gray-400 font-normal ml-1">${k.unit}</span></div>
            ${k.target ? `<div class="text-xs text-gray-400 mt-1.5">${k.target}</div>` : ''}
            ${k.bar ? `
              <div class="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div class="h-1.5 rounded-full transition-all duration-500" style="width:${Math.min(k.value, 100)}%;background:${barColor(k.status)};"></div>
              </div>` : ''}
          </div>
        `).join('')}
      </div>

      <!-- 出勤趋势 -->
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">近 6 场活动出勤率</span>
          ${trend.length ? `<span class="text-xs text-gray-400">最新一场 ${trend[trend.length - 1].rate}%</span>` : ''}
        </div>
        ${_sparkline(trend)}
      </div>

      <!-- 异常优先队列 -->
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">异常优先队列</h4>
          <span class="text-xs text-gray-400">按紧急度排序 · ${exceptions.length + pendingDispatches.length} 项</span>
        </div>
        <div class="space-y-1">${exceptionsHtml}</div>
      </div>

      <!-- 党员发展分布 -->
      <div class="card rounded-xl p-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">党员发展阶段分布</h4>
        <div class="flex items-center gap-3">
          <div class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden flex">
            ${stages.map(s => s.value > 0 ? `<div style="width:${(s.value / stageTotal * 100).toFixed(1)}%;background:${s.color};" title="${s.label} ${s.value}人"></div>` : '').join('')}
          </div>
          <div class="flex items-center gap-2.5 flex-wrap justify-end">
            ${stages.map(s => `
              <span class="inline-flex items-center gap-1 text-xs text-gray-600">
                <span class="w-2 h-2 rounded-full" style="background:${s.color};"></span>${s.label} ${s.value}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // 催办/直达绑定（t5b：催办通知对应委员 / 直达本人工作台）
  container.querySelectorAll('.sec-ed-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmExternalDispatch(btn.dataset.edId);
      showToast('success', '已确认收到，文件流转闭环完成');
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
  if (!series.length) return '<p class="text-xs text-gray-400 py-1">暂无考勤历史数据</p>';
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
const URGE_MAP = {
  'attendance-absent': {
    role: 'disc-commissioner',
    title: '考勤催办',
    content: '书记提醒：本月存在缺勤记录，请及时核实确认缺勤情况并跟进补课安排。',
    targetModule: 'attendance',
    targetUrl: 'workspace/disc.html',
  },
  'attendance-makeup': {
    role: 'disc-commissioner',
    title: '补课催办',
    content: '书记提醒：本月存在未完成的补课任务，请跟进确认补课完成情况。',
    targetModule: 'attendance',
    targetUrl: 'workspace/disc.html',
  },
  'inspection-pending': {
    role: 'disc-commissioner',
    title: '考察确认催办',
    content: '书记提醒：存在待确认的考察记录，请及时处理。',
    targetModule: 'party',
    targetUrl: 'workspace/disc.html',
  },
  'inspection-overdue': {
    role: 'disc-commissioner',
    title: '考察超期催办',
    content: '书记提醒：存在考察超期记录，请尽快处理。',
    targetModule: 'party',
    targetUrl: 'workspace/disc.html',
  },
  'archive-pending': {
    role: 'prop-commissioner',
    title: '归档催办',
    content: '书记提醒：存在待归档的档案材料，请及时完成归档。',
    targetModule: 'workspace',
    targetUrl: 'workspace/prop.html',
  },
};

function handleUrge(urgeKey) {
  const cfg = URGE_MAP[urgeKey];
  if (!cfg) return;
  NoticeStore.add({
    title: cfg.title,
    content: cfg.content,
    priority: 'urgent',
    targetModule: cfg.targetModule,
    targetUrl: cfg.targetUrl,
    actionable: true,
    actionRoles: [cfg.role],
    actionTask: cfg.title,
  }, 'secretary');
  const roleLabel = ROLE_LABELS[cfg.role] || cfg.role;
  showToast('success', `已向${roleLabel}发送催办通知`);
}
