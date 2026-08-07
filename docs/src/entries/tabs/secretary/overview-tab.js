// role: [工程师]+[AI]
// entries/tabs/secretary/overview-tab.js — 书记工作台·全局概况 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// 设计初衷（书记 2026-08-02 确认方向后记录）：
//   为什么有全局概况——书记需同步各支委/组长/委员工作进度，形成党支部整体运行态势总览；
//   解决什么问题——书记只看"进行时和未完成"的工作，快速掌握各维度进度与人员参与总体情况；
//   数据选取原则——同一套底层数据统一自动渲染，异常数据标橙并派生为书记待办。
// 重设计要点：单列进度总览，取消 2x2 四色卡片与四色左边条，主体色统一党建红。

import { icon } from '../../../core/icons.js?v=20260807c';
import { showToast } from '../../../core/utils.js?v=20260807c';
import { NoticeStore } from '../../../services/notice.js?v=20260807c';
import { ROLE_LABELS } from '../../../core/constants.js?v=20260807c';
import { SecretaryOverviewStore } from '../../../services/secretary-overview.js?v=20260807c';

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

  // 党员发展各阶段分布（堆叠段条）
  const stages = [
    { label: '积极分子', value: data.inspection.stageCounts.activist,     color: '#94A3B8' },
    { label: '发展对象', value: data.inspection.stageCounts.target,       color: '#38BDF8' },
    { label: '预备党员', value: data.inspection.stageCounts.probationary, color: '#FBBF24' },
    { label: '正式党员', value: data.inspection.stageCounts.full,         color: '#EF4444' },
  ];
  const stageTotal = stages.reduce((s, x) => s + x.value, 0) || 1;

  const metricChips = (metrics) => metrics.map(m => `
    <span class="inline-flex items-center gap-1.5 text-xs">
      <span class="text-gray-500">${m.label}</span>
      ${m.direct
        ? `<button type="button" class="sec-urge-btn font-medium ${m.alert ? 'text-orange-600' : 'text-gray-800'} hover:underline cursor-pointer" data-direct="${m.direct}">${m.value}</button>`
        : m.urge
          ? `<button type="button" class="sec-urge-btn font-medium ${m.alert ? 'text-orange-600' : 'text-gray-800'} hover:underline cursor-pointer" data-urge="${m.urge}">${m.value}</button>`
          : `<span class="font-medium ${m.alert ? 'text-orange-600' : 'text-gray-800'}">${m.value}</span>`}
      ${m.alert && m.urge ? `<button type="button" class="sec-urge-btn text-xs px-1.5 py-0.5 rounded-md border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors" data-urge="${m.urge}">催办</button>` : ''}
      ${m.alert && m.direct ? `<button type="button" class="sec-urge-btn text-xs px-1.5 py-0.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" data-direct="${m.direct}">直达</button>` : ''}
    </span>
  `).join('');

  const rows = [
    {
      icon: icon('calendarHero', { className: 'w-4 h-4' }),
      title: '考勤与纪律',
      desc: '本月出勤情况',
      rate: data.attendance.attendanceRate,
      rateLabel: '出勤率',
      metrics: [
        { label: '缺勤', value: data.attendance.absentPeople.length ? data.attendance.absentPeople.join('、') : '无', alert: data.attendance.absentPeople.length > 0, urge: 'attendance-absent' },
        { label: '补课未完成', value: data.attendance.makeupPending, alert: data.attendance.makeupPending > 0, urge: 'attendance-makeup' },
      ],
    },
    {
      icon: icon('users', { className: 'w-4 h-4' }),
      title: '发展与考察',
      desc: '党员发展培养阶段分布',
      stages,
      stageTotal,
      metrics: [
        { label: '考察待确认', value: data.inspection.pendingInspections, alert: data.inspection.pendingInspections > 0, urge: 'inspection-pending' },
        { label: '考察超期', value: data.inspection.overdueInspections, alert: data.inspection.overdueInspections > 0, urge: 'inspection-overdue' },
      ],
    },
    {
      icon: icon('flag', { className: 'w-4 h-4' }),
      title: '活动与专班',
      desc: '活动复盘完成情况',
      rate: data.activity.reviewRate,
      rateLabel: '复盘完成率',
      metrics: [
        { label: '进行中活动', value: data.activity.activeActivities, direct: 'calendar' },
        { label: '进行中专班', value: data.activity.activeTaskforces, direct: 'calendar' },
        { label: '赋权待审批', value: data.activity.pendingAuth, alert: data.activity.pendingAuth > 0, direct: 'assign' },
      ],
    },
    {
      icon: icon('archive', { className: 'w-4 h-4' }),
      title: '宣传与档案',
      desc: '归档完成情况',
      rate: data.propaganda.archiveRate,
      rateLabel: '归档完成率',
      metrics: [
        { label: '待归档', value: data.propaganda.pendingArchive, alert: data.propaganda.pendingArchive > 0, urge: 'archive-pending' },
        { label: '本月通知', value: data.propaganda.noticeCount, direct: 'notification' },
      ],
    },
  ];

  const rateBar = (rate) => `
    <div class="flex items-center gap-3">
      <div class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div class="h-2 rounded-full transition-all duration-500" style="width:${rate}%;background:${rate >= 90 ? '#16A34A' : rate >= 70 ? '#D97706' : '#EF4444'};"></div>
      </div>
      <span class="text-xs font-medium text-gray-600 w-10 text-right">${rate}%</span>
    </div>
  `;

  const stageBar = `
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
  `;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="text-xs text-gray-500">党支部整体运行态势 · 只看进行时和未完成</div>
      ${rows.map(row => `
        <div class="card rounded-xl p-5">
          <div class="flex items-center gap-2.5 mb-3">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:var(--neutral-100);color:var(--neutral-600);">${row.icon}</span>
            <div>
              <h4 class="font-title-cn text-sm font-bold text-gray-700 leading-tight">${row.title}</h4>
              <p class="text-xs text-gray-400 mt-0.5">${row.desc}</p>
            </div>
          </div>
          ${row.stages ? stageBar : rateBar(row.rate)}
          <div class="mt-3.5 pt-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-1.5">
            ${metricChips(row.metrics)}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // t5b：催办/直达按钮绑定（就地方案，书记不越界处理——催办通知对应委员/直达本人工作台）
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
