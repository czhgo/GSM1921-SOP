﻿// role: [工程师]+[AI]
// entries/tabs/secretary/overview-tab.js — 书记工作台·全局概况 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// 设计初衷（书记 2026-08-02 确认方向后记录）：
//   为什么有全局概况——书记需同步各支委/组长/委员工作进度，形成党支部整体运行态势总览；
//   解决什么问题——书记只看"进行时和未完成"的工作，快速掌握各维度进度与人员参与总体情况；
//   数据选取原则——同一套底层数据统一自动渲染，异常数据标橙并派生为书记待办。
// 重设计要点：单列进度总览，取消 2x2 四色卡片与四色左边条，主体色统一党建红。

import { icon } from '../../../core/icons.js?v=20260808m';
import { showToast } from '../../../core/utils.js?v=20260808m';
import { NoticeStore } from '../../../services/notice.js?v=20260808m';
import { ROLE_LABELS } from '../../../core/constants.js?v=20260808m';
import { SecretaryOverviewStore } from '../../../services/secretary-overview.js?v=20260808m';
import { badgeHtml } from '../../../components/badge.js?v=20260808m';
import { loadActivities } from '../../../services/activity.js?v=20260808m';
import { loadAttendanceRecords } from '../../../services/attendance.js?v=20260808m';
import { AttendanceStatus } from '../../../core/domain.js?v=20260808m';

const OVERVIEW_TAB_HTML = `
  <div id="secretary-overview-content"></div>
`;

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
    { label: '复盘完成率', value: activity.reviewRate, unit: '%', target: '目标 100%', status: kpiStatusOf(activity.reviewRate >= 100, activity.reviewRate >= 80), bar: true },
    { label: '归档完成率', value: propaganda.archiveRate, unit: '%', target: '目标 100%', status: kpiStatusOf(propaganda.archiveRate >= 100, propaganda.archiveRate >= 80), bar: true },
    { label: '考察积压', value: inspection.pendingInspections + inspection.overdueInspections, unit: '条', target: '目标 0 条', status: inspection.overdueInspections ? 'danger' : inspection.pendingInspections ? 'warn' : 'ok', bar: false },
    { label: '待办异常', value: anomalyTotal, unit: '项', target: '目标 0 项', status: anomalyTotal ? 'danger' : 'ok', bar: false },
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

  // 叙事（what changed and why）
  const narr = [];
  if (attendance.attendanceRate >= 90) narr.push(`出勤率 ${attendance.attendanceRate}% 达标`);
  else narr.push(`出勤率 ${attendance.attendanceRate}% 低于目标 90%`);
  if (activity.reviewRate < 100) narr.push(`复盘 ${activity.reviewRate}% 未满`);
  if (inspection.overdueInspections) narr.push(`${inspection.overdueInspections} 项考察超期`);
  if (activity.pendingAuth) narr.push(`${activity.pendingAuth} 个活动待赋权`);
  if (propaganda.pendingArchive) narr.push(`${propaganda.pendingArchive} 个活动待归档`);
  const narrative = narr.length
    ? `全局概况：${narr.join('；')}。异常 ${exceptions.length} 项，按紧急度优先处理。`
    : '全局概况：整体态势正常，无待处理异常。';

  // 党员发展阶段分布
  const stages = [
    { label: '积极分子', value: inspection.stageCounts.activist,     color: '#94A3B8' },
    { label: '发展对象', value: inspection.stageCounts.target,       color: '#38BDF8' },
    { label: '预备党员', value: inspection.stageCounts.probationary, color: '#FBBF24' },
    { label: '正式党员', value: inspection.stageCounts.full,         color: '#EF4444' },
  ];
  const stageTotal = stages.reduce((s, x) => s + x.value, 0) || 1;

  const exceptionsHtml = exceptions.length === 0
    ? `<div class="flex items-center gap-2 py-3 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 全部正常，无待处理异常
       </div>`
    : exceptions.map(e => {
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
      <!-- 叙事行 -->
      <div class="text-xs text-gray-500">${narrative}</div>

      <!-- KPI 顶栏 -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        ${kpis.map(k => `
          <div class="card rounded-xl p-4">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-gray-500">${k.label}</span>
              ${statusBadge(k.status)}
            </div>
            <div class="text-2xl font-bold text-gray-800 leading-none">${k.value}<span class="text-xs text-gray-400 font-normal ml-1">${k.unit}</span></div>
            <div class="text-xs text-gray-400 mt-1.5">${k.target}</div>
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
          <span class="text-xs text-gray-400">按紧急度排序 · ${exceptions.length} 项</span>
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
