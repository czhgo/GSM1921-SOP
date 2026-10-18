// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/work-overview.js — 六个支部工作台「工作概况」唯一渲染源
//  2026-10-18 支书拍定（工作台密度与组件重组 Task 7）：六台统一三层，不再有独立「汇报」卡。
//    ① 结论带 data-wo-layer="summary"：一条横向带四个数（在办 / 逾期 / 待我处理 / 待答复或职责指标）
//    ② 条线表 data-wo-layer="lines"：行=条线，列固定「条线 / 负责人 / 在办 / 逾期 / 最近卡点 / 动作」
//    ③ 待我处理 data-wo-layer="actions"：最多 5 条，每条标题 + 一句原因 + 一个动作
//  单一源关系：
//    · 行 = components/ui/list-row.js；表 = components/ui/data-table.js（tableHeadHtml）；
//      空态 = components/ui/empty-state.js；间距 = styles.css 的 .stack-* / .card-* / --space-*。
//    · 数据沿用既有服务：TodoStore / IssueStore / filterActivitiesForViewer / TaskForceRecordStore /
//      loadAttendance / loadInspection / loadMakeupTasks / listPendingByReceiver 等，不新造数据源。
//  保留下钻：待办组→待办 tab；活动/专班→只读详情；文件外发→确认收到；汇报→「去我的处置」。
//  本页禁用 SVG 图标（支书 2026-08-10 裁定），类别用色点 + 文字区分。
// ════════════════════════════════════════════════════════════════

import { showToast, flashHighlight, todayLocal, escHtml as esc } from '../../core/base/utils.js?v=20261018g';
import { listRowHtml, listGroupHtml } from '../ui/list-row.js?v=20261018g';
import { tableHeadHtml } from '../ui/data-table.js?v=20261018g';
import { emptyStateHtml } from '../ui/empty-state.js?v=20261018g';
import {
  TodoStore, seedTodos, isTodoExpired, WORK_DOMAIN, WORK_DOMAIN_LABELS,
} from '../../services/governance/todo.js?v=20261018g';
import { IssueStore } from '../../services/governance/issues.js?v=20261018g';
import {
  isActivityEnded, isActivityArchived, ROLE_LABELS,
} from '../../core/domain/constants.js?v=20261018g';
import { loadActivities } from '../../services/activity/activity.js?v=20261018g';
import { filterActivitiesForViewer, resolveVisibleTargets } from '../../services/core/visibility.js?v=20261018g';
import { loadActiveAttendanceRecords } from '../../services/activity/attendance.js?v=20261018g';
import { loadInspectionRecords, getOverdueRecords } from '../../services/activity/inspection.js?v=20261018g';
import { loadMakeupTasks } from '../../services/activity/makeup.js?v=20261018g';
import { loadActiveActivityReviews, loadTaskforceReviews } from '../../services/governance/review.js?v=20261018g';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261018g';
import { listPendingByReceiver, confirmExternalDispatch } from '../../services/activity/external-dispatch.js?v=20261018g';
import { getPersonName } from '../../services/member/person.js?v=20261018g';
import { loadMemberProgress, REPORT_KIND } from '../../services/member/member-progress.js?v=20261018g';
import { AttendanceStatus, ReviewStatus, mockDB } from '../../core/domain/domain.js?v=20261018g';
import { PROP_TASKS_SEED } from '../../data/mock/prop.js?v=20261018g';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../services/branch/branch.js?v=20261018g';

// 在办下钻详情目标（支书 2026-08-10 裁定：概况「在办」可下钻到活动/专班只读详情）
let _woDetail = null; // { kind: 'activity' | 'taskforce', id } | null

const _MAX_INLINE = 5;
const LINE_COLUMNS = [
  { label: '条线', className: 'wo-line-name' },
  { label: '负责人' },
  { label: '在办' },
  { label: '逾期' },
  { label: '最近卡点' },
  { label: '动作' },
];

/** 角色中文名：visitor 在档案角色表里叫「普通参与者」，工作台口径统一称「普通成员」 */
function _roleLabel(role) {
  if (role === 'visitor') return '普通成员';
  return ROLE_LABELS[role] || role;
}

function _mergeStats(...parts) {
  return parts.reduce((acc, part) => ({
    active: acc.active + (part?.active || 0),
    overdue: acc.overdue + (part?.overdue || 0),
  }), { active: 0, overdue: 0 });
}

/** 待办聚合组 → 在办 / 逾期（组内逐条判定，逾期口径与待办页同源 isTodoExpired） */
function _todoStats(groups, today) {
  let active = 0;
  let overdue = 0;
  (groups || []).forEach((group) => {
    active += group.count || (group.items || []).length || 1;
    overdue += (group.items || []).filter((item) => isTodoExpired(item, today)).length;
  });
  return { active, overdue };
}

function _activityStats(activities, today) {
  const list = activities || [];
  return {
    active: list.length,
    overdue: list.filter((a) => a.date && a.date < today).length,
  };
}

function _taskforceStats(taskforces, today) {
  const list = taskforces || [];
  return {
    active: list.length,
    overdue: list.filter((tf) => tf.deadline && tf.deadline < today).length,
  };
}

function _groupDomain(group) {
  return group?.domain || (group?.items || [])[0]?.domain || WORK_DOMAIN.NONE;
}

function _isTaskforceGroup(group) {
  const key = String(group?.groupKey || '');
  const actionKey = String(group?.actionKey || '');
  return actionKey.startsWith('taskforce-') || key.includes('taskforce');
}

function _isGroupActivity(activity) {
  return String(activity?.type || '').includes('党小组');
}

function _gap(...parts) {
  return parts.filter(Boolean).join(' · ');
}

function _daysOverdue(deadline, today) {
  if (!deadline || deadline >= today) return 0;
  const end = new Date(`${deadline}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(now.getTime())) return 1;
  return Math.max(1, Math.round((now - end) / 86400000));
}

/** 四个数的统一形态：前三数六台一致，第四数按职责替换 */
function _metrics(fourth) {
  return [
    { label: '在办', value: (totals) => totals.active },
    { label: '逾期', value: (totals) => totals.overdue, danger: true },
    { label: '待我处理', value: (totals) => totals.actions },
    fourth,
  ];
}

/**
 * 六台配置单一源：角色键 → { metrics, lines, lineOf(...) }。
 * lines 的顺序即条线表行序；某条线无数据时行仍保留（渲染为「—」）。
 */
const ROLE_OVERVIEW_CONFIG = {
  secretary: {
    metrics: _metrics({ label: '待答复', value: (totals) => totals.answer }),
    lines: [
      {
        key: 'org', label: '组织', ownerRole: 'org-commissioner', tab: 'calendar', actionLabel: '活动管理',
        stats: (c) => _mergeStats(
          _todoStats(c.todoGroups.filter((g) => {
            const domain = _groupDomain(g);
            return domain === WORK_DOMAIN.MEMBER_DEV
              || (domain === WORK_DOMAIN.PROJECT && !_isTaskforceGroup(g));
          }), c.today),
          _activityStats(c.activities.filter((a) => !_isGroupActivity(a)), c.today),
        ),
        gap: (c) => c.pendingAuth ? `待赋权 ${c.pendingAuth} 个` : '',
      },
      {
        key: 'prop', label: '宣传', ownerRole: 'prop-commissioner', tab: 'todo', actionLabel: '待办',
        stats: (c) => _todoStats(c.todoGroups.filter((g) => _groupDomain(g) === WORK_DOMAIN.ARCHIVE), c.today),
        gap: (c) => c.pendingArchive ? `待归档 ${c.pendingArchive} 个` : '',
      },
      {
        key: 'disc', label: '纪检', ownerRole: 'disc-commissioner', module: 'attendance-inspection',
        tab: 'todo', actionLabel: '待办',
        stats: (c) => ({
          active: c.attendance.length + c.makeupPending + c.inspections.length,
          overdue: c.overdueInspections + c.makeupOverdue,
        }),
        gap: (c) => _gap(
          c.makeupPending ? `补课待完成 ${c.makeupPending} 项` : '',
          c.overdueInspections ? `考察超期 ${c.overdueInspections} 条` : '',
        ),
      },
      {
        key: 'group', label: '党小组', ownerRole: 'leader', module: 'party-group-meeting',
        tab: 'group-progress', actionLabel: '党小组',
        stats: (c) => _activityStats(c.activities.filter(_isGroupActivity), c.today),
        gap: () => '',
      },
      {
        key: 'tf', label: '专班', ownerRole: 'org-commissioner', module: 'taskforce',
        tab: 'tf-view', actionLabel: '知情查看',
        stats: (c) => _taskforceStats(c.taskforces, c.today),
        gap: (c) => c.recruitingTaskforces ? `招募中 ${c.recruitingTaskforces} 个` : '',
      },
    ],
    lineOf(item) {
      if (item.kind === 'taskforce' || _isTaskforceGroup(item)) return 'tf';
      if (['attendance', 'makeup', 'inspection', 'review'].includes(item.kind)) return 'disc';
      if (item.kind === 'archive') return 'prop';
      if (item.kind === 'group' || _isGroupActivity(item)) return 'group';
      const domain = item.domain || WORK_DOMAIN.NONE;
      if (domain === WORK_DOMAIN.ARCHIVE) return 'prop';
      if (domain === WORK_DOMAIN.ATTENDANCE || domain === WORK_DOMAIN.INSPECTION) return 'disc';
      if (domain === WORK_DOMAIN.PROJECT && _isTaskforceGroup(item)) return 'tf';
      return 'org';
    },
  },

  'org-commissioner': {
    metrics: _metrics({ label: '待赋权', value: (totals) => totals.pendingAuth }),
    lines: [
      {
        key: 'tf', label: '专班', ownerRole: 'org-commissioner', module: 'taskforce',
        tab: 'taskforce', actionLabel: '专班管理',
        stats: (c) => _taskforceStats(c.taskforces, c.today),
        gap: (c) => c.recruitingTaskforces ? `招募中 ${c.recruitingTaskforces} 个` : '',
      },
      {
        key: 'activity', label: '活动', ownerRole: 'org-commissioner', tab: 'calendar', actionLabel: '活动日历',
        stats: (c) => _activityStats(c.activities, c.today),
        gap: () => '',
      },
      {
        key: 'auth', label: '赋权', ownerRole: 'org-commissioner', tab: 'calendar', actionLabel: '活动日历',
        stats: (c) => ({ active: c.pendingAuth, overdue: 0 }),
        gap: (c) => c.pendingAuth ? `待赋权 ${c.pendingAuth} 个` : '',
      },
      {
        key: 'member-flow', label: '成员流动', ownerRole: 'org-commissioner', tab: 'roster', actionLabel: '成员名册',
        stats: (c) => _todoStats(c.todoGroups.filter((g) => _groupDomain(g) === WORK_DOMAIN.MEMBER_DEV), c.today),
        gap: (c) => {
          const pending = c.todoGroups
            .filter((g) => _groupDomain(g) === WORK_DOMAIN.MEMBER_DEV)
            .reduce((sum, g) => sum + (g.count || 0), 0);
          return pending ? `成员事项 ${pending} 项` : '';
        },
      },
    ],
    lineOf(item) {
      if (item.kind === 'taskforce') return 'tf';
      if (item.kind === 'activity') return 'activity';
      if ((item.domain || '') === WORK_DOMAIN.MEMBER_DEV) return 'member-flow';
      return 'auth';
    },
  },

  'prop-commissioner': {
    metrics: _metrics({ label: '待归档', value: (totals) => totals.pendingArchive }),
    lines: [
      {
        key: 'tasks', label: '宣传任务', ownerRole: 'prop-commissioner', tab: 'tasks', actionLabel: '宣传任务',
        stats: (c) => ({ active: c.propTasksOpen, overdue: 0 }),
        gap: (c) => c.propTasksOpen ? `待接收 ${c.propTasksPending} 项 · 进行中 ${c.propTasksInProgress} 项` : '',
      },
      {
        key: 'archive', label: '档案归档', ownerRole: 'prop-commissioner', tab: 'archive', actionLabel: '档案归档',
        stats: (c) => ({ active: c.pendingArchive, overdue: 0 }),
        gap: (c) => c.pendingArchive ? `待归档 ${c.pendingArchive} 个` : '',
      },
      {
        key: 'activity', label: '活动', ownerRole: 'prop-commissioner', tab: 'kanban', actionLabel: '项目看板',
        stats: (c) => _activityStats(c.activities, c.today),
        gap: () => '',
      },
    ],
    lineOf(item) {
      if (item.kind === 'prop-task') return 'tasks';
      if (item.kind === 'archive' || (item.domain || '') === WORK_DOMAIN.ARCHIVE) return 'archive';
      return 'activity';
    },
  },

  'disc-commissioner': {
    metrics: _metrics({ label: '待补课', value: (totals) => totals.makeupPending }),
    lines: [
      {
        key: 'attendance', label: '考勤', ownerRole: 'disc-commissioner', module: 'attendance-inspection',
        tab: 'attendance', actionLabel: '考勤管理',
        stats: (c) => ({ active: c.attendance.length, overdue: c.absentCount }),
        gap: (c) => c.absentCount ? `缺勤 ${c.absentCount} 人` : '',
      },
      {
        key: 'makeup', label: '补课', ownerRole: 'disc-commissioner', module: 'attendance-inspection',
        tab: 'attendance', segment: 'makeup', actionLabel: '考勤管理',
        stats: (c) => ({ active: c.makeupPending, overdue: c.makeupOverdue }),
        gap: (c) => c.makeupPending ? `待补课 ${c.makeupPending} 项` : '',
      },
      {
        key: 'inspection', label: '考察', ownerRole: 'disc-commissioner', module: 'attendance-inspection',
        tab: 'inspection', actionLabel: '考察管理',
        stats: (c) => ({ active: c.inspections.length, overdue: c.overdueInspections }),
        gap: (c) => _gap(
          c.inspectionPending ? `待确认 ${c.inspectionPending} 条` : '',
          c.overdueInspections ? `超期 ${c.overdueInspections} 条` : '',
        ),
      },
      {
        key: 'review', label: '复盘', ownerRole: 'disc-commissioner', tab: 'review', actionLabel: '复盘',
        stats: (c) => ({ active: c.reviewPending, overdue: 0 }),
        gap: (c) => c.reviewUploaded ? `待批注 ${c.reviewUploaded} 条` : '',
      },
    ],
    lineOf(item) {
      if (item.kind === 'makeup') return 'makeup';
      if (item.kind === 'inspection') return 'inspection';
      if (item.kind === 'review') return 'review';
      return 'attendance';
    },
  },

  leader: {
    metrics: _metrics({ label: '组员汇报', value: (totals) => totals.memberAnswer }),
    lines: [
      {
        key: 'activity', label: '本组活动', ownerRole: 'leader', tab: 'write', actionLabel: '本组活动',
        stats: (c) => _activityStats(c.activities, c.today),
        gap: () => '',
      },
      {
        key: 'members', label: '组员', ownerRole: 'leader', tab: 'members', actionLabel: '组员进展',
        stats: (c) => ({ active: c.memberActive, overdue: c.memberOverdue }),
        gap: (c) => c.memberAnswer ? `待答复 ${c.memberAnswer} 人` : '',
      },
      {
        key: 'attendance', label: '考勤', ownerRole: 'leader', tab: 'attendance', actionLabel: '考勤管理',
        stats: (c) => ({ active: c.attendance.length, overdue: c.absentCount }),
        gap: (c) => c.absentCount ? `缺勤 ${c.absentCount} 人` : '',
      },
      {
        key: 'inspection', label: '考察', ownerRole: 'leader', tab: 'inspection', actionLabel: '考察管理',
        stats: (c) => ({ active: c.inspections.length, overdue: c.overdueInspections }),
        gap: (c) => c.inspectionPending ? `待确认 ${c.inspectionPending} 条` : '',
      },
    ],
    lineOf(item) {
      if (item.kind === 'activity') return 'activity';
      if (item.kind === 'attendance') return 'attendance';
      if (item.kind === 'inspection') return 'inspection';
      return 'members';
    },
  },

  visitor: {
    metrics: _metrics({ label: '待汇报', value: (totals) => totals.reportPending }),
    lines: [
      {
        key: 'activity', label: '我的活动', ownerRole: 'visitor', tab: 'activities', actionLabel: '活动动态',
        stats: (c) => _activityStats(c.activities, c.today),
        gap: () => '',
      },
      {
        key: 'tf', label: '我的专班', ownerRole: 'visitor', tab: 'projects', actionLabel: '项目分工',
        stats: (c) => _taskforceStats(c.taskforces, c.today),
        gap: () => '',
      },
      {
        key: 'report', label: '我的汇报', ownerRole: 'visitor', actionKind: 'dispatch', actionLabel: '我的处置',
        stats: (c) => ({ active: c.reportPending, overdue: 0 }),
        gap: (c) => c.reportAnswerGap ? `待答复 ${c.reportAnswerGap} 条` : '',
      },
      {
        key: 'inspection', label: '我的考察', ownerRole: 'visitor', tab: 'inspection', actionLabel: '我的考察',
        stats: (c) => ({ active: c.inspections.length, overdue: c.overdueInspections }),
        gap: (c) => c.inspectionPending ? `待确认 ${c.inspectionPending} 条` : '',
      },
    ],
    lineOf(item) {
      if (item.kind === 'activity') return 'activity';
      if (item.kind === 'taskforce') return 'tf';
      if (item.kind === 'report') return 'report';
      if (item.kind === 'inspection') return 'inspection';
      return 'activity';
    },
  },
};

/**
 * 渲染「工作概况」tab 内容（六台唯一入口）
 * @param {HTMLElement} container — tab 内容容器
 * @param {Object} opts
 * @param {string} opts.role      — 角色键：secretary / org-commissioner / prop-commissioner / disc-commissioner / leader / visitor
 * @param {string} opts.personId  — 当前用户 personId
 * @param {string} [opts.accent]  — 强调色
 * @param {string} [opts.prefix]  — 工作台页面前缀（secretary/org/prop/disc/leader/visitor）
 */
export async function renderWorkOverview(container, { role, personId, accent = '#B91C1C', prefix = '' }) {
  if (!container) return;
  await IssueStore.loadAll();
  seedTodos();
  TodoStore.refreshExpiredStatus();
  const today = todayLocal();

  // 在办下钻模式（支书 2026-08-10 裁定）：活动/专班只读详情，返回按钮回概况
  if (_woDetail) {
    await _renderOverviewDetail(container, _woDetail, accent, () => renderWorkOverview(container, { role, personId, accent, prefix }));
    return;
  }

  const config = ROLE_OVERVIEW_CONFIG[role] || ROLE_OVERVIEW_CONFIG.visitor;
  const ctx = await _buildContext(role, personId, today, config);

  // 条线表：先算每行，再汇总结论带
  const lineRows = config.lines.map((line) => {
    const stats = line.stats(ctx);
    const gap = line.gap(ctx);
    return {
      line,
      active: stats.active || 0,
      overdue: stats.overdue || 0,
      gap,
      owner: _ownerOf(line, ctx.workforce, role),
    };
  });
  const totals = {
    active: lineRows.reduce((sum, row) => sum + row.active, 0),
    overdue: lineRows.reduce((sum, row) => sum + row.overdue, 0),
    actions: 0,
    pendingAuth: ctx.pendingAuth,
    pendingArchive: ctx.pendingArchive,
    makeupPending: ctx.makeupPending,
    memberAnswer: ctx.memberAnswer,
    reportPending: ctx.reportPending,
    answer: ctx.reports.answerCount,
  };

  const actionItems = _buildActionItems(ctx, config);
  totals.actions = actionItems.length;

  const summaryHtml = config.metrics.map((metric) => {
    const value = metric.value(totals);
    const danger = metric.danger && value > 0;
    return `<span class="wo-summary__item">
      <span class="wo-summary__label">${esc(metric.label)}</span>
      <span class="wo-summary__value${danger ? ' wo-summary__value--danger' : ''}">${esc(String(value))}</span>
    </span>`;
  }).join('');

  const tableRows = lineRows.map((row) => {
    const action = _lineActionHtml(row);
    return `<tr data-wo-line="${esc(row.line.key)}">
      <td class="wo-line-name">${esc(row.line.label)}</td>
      <td>${esc(row.owner)}</td>
      <td class="tabular-nums">${row.active || '—'}</td>
      <td class="tabular-nums${row.overdue ? ' wo-line-overdue' : ''}">${row.overdue || '—'}</td>
      <td class="wo-line-gap">${esc(row.gap || '—')}</td>
      <td>${action}</td>
    </tr>`;
  }).join('');

  const shownActions = actionItems.slice(0, _MAX_INLINE);
  const actionRows = shownActions.map((item) => listRowHtml({
    leading: `<span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${item.overdue ? 'var(--functional-error)' : 'var(--app-accent)'};"></span>`,
    title: item.title,
    meta: item.reason,
    trailing: `<button type="button" class="btn-ghost text-xs px-2.5 py-1 flex-shrink-0" ${item.attrs}>${esc(item.actionLabel)}</button>`,
  }));
  if (actionItems.length > _MAX_INLINE) {
    actionRows.push(listRowHtml({
      title: `共 ${actionItems.length} 项 · 去待办`,
      interactive: true,
      dataAttrs: { 'data-wo-jump': 'todo-all' },
      trailing: '<span class="text-xs text-gray-500" aria-hidden="true">›</span>',
    }));
  }

  container.innerHTML = `
    <div class="stack-page" data-wo-role="${esc(role)}">
      <p class="text-xs text-gray-500">${esc(_roleLabel(role))}视角 · 先看结论，再看条线，最后处理待办</p>

      <section class="card rounded-xl card-compact wo-summary" data-wo-layer="summary" aria-label="工作概况结论">
        ${summaryHtml}
      </section>

      <section class="card rounded-xl card-standard stack-section" data-wo-layer="lines">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">条线</h4>
        <div class="wo-lines-scroll">
          <table class="data-table wo-lines-table">
            <thead>${tableHeadHtml(LINE_COLUMNS)}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </section>

      <section class="card rounded-xl card-standard stack-section" data-wo-layer="actions">
        <div class="flex items-center justify-between gap-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">待我处理</h4>
          <span class="text-xs text-gray-500">${actionItems.length ? `共 ${actionItems.length} 项 · 最多显示 ${_MAX_INLINE} 条` : '当前无待处理'}</span>
        </div>
        ${actionRows.length ? listGroupHtml(actionRows) : emptyStateHtml('暂无待我处理事项')}
      </section>
    </div>`;

  _bindWorkOverviewEvents(container, role, personId, prefix, () => renderWorkOverview(container, { role, personId, accent, prefix }));
}

/** 组装六台共用上下文（只读现有服务，不新增数据源） */
async function _buildContext(role, personId, today, config) {
  const ctx = {
    role,
    personId,
    today,
    config,
    todoGroups: TodoStore.getGroupedByAction(role),
    activities: [],
    taskforces: [],
    attendance: loadActiveAttendanceRecords(),
    inspections: loadInspectionRecords(),
    overdueInspectionRecords: getOverdueRecords(),
    makeups: loadMakeupTasks(),
    reviews: [...loadActiveActivityReviews(), ...loadTaskforceReviews()],
    dispatches: listPendingByReceiver(role),
    reports: { requests: [], mine: [], openGap: 0, answerCount: 0 },
    workforce: {},
  };

  // 支书：概况维度 + 实时派生组（与待办页同源）
  if (role === 'secretary') {
    const secretary = await import('../../services/governance/secretary-overview.js?v=20261018g');
    const realtime = secretary.SecretaryTodoDeriver.computeAggregates();
    const seen = new Set(ctx.todoGroups.map((group) => group.groupKey));
    ctx.todoGroups = [...ctx.todoGroups, ...realtime.filter((group) => !seen.has(group.groupKey))];
    ctx.overview = secretary.SecretaryOverviewStore.getOverview();
  }

  const visibleActivities = filterActivitiesForViewer(loadActivities(), role).filter((activity) =>
    !isActivityEnded(activity) && activity.status !== 'cancelled' && activity.status !== 'draft');
  const isMineActivity = (activity) => activity.organizer === personId
    || (Array.isArray(activity.assignments) && activity.assignments.some((item) => item.personId === personId));
  ctx.activities = (role === 'leader' || role === 'visitor')
    ? visibleActivities.filter(isMineActivity)
    : visibleActivities;

  const allTaskforces = TaskForceRecordStore.list().filter((tf) => tf.status === 'active' || tf.status === 'recruiting');
  const isMineTaskforce = (tf) => tf.manager === personId || tf.initiator === personId
    || (Array.isArray(tf.members) && tf.members.some((member) => member.personId === personId));
  ctx.taskforces = (role === 'leader' || role === 'visitor')
    ? allTaskforces.filter(isMineTaskforce)
    : allTaskforces;

  const allActivities = filterActivitiesForViewer(loadActivities(), role);
  ctx.pendingAuth = role === 'secretary'
    ? (ctx.overview?.activity?.pendingAuth || 0)
    : allActivities.filter((activity) => !isActivityArchived(activity)
      && activity.direction === 'bottom-up'
      && !(activity.assignments || []).some((item) => item.role === 'organizer')).length;
  ctx.pendingArchive = role === 'secretary'
    ? (ctx.overview?.propaganda?.pendingArchive || 0)
    : allActivities.filter((activity) => isActivityEnded(activity) && !isActivityArchived(activity)).length;
  ctx.recruitingTaskforces = allTaskforces.filter((tf) => tf.status === 'recruiting').length;

  // 组长：组员聚合走服务端/mock 同一纯函数（loadMemberProgress）
  if (role === 'leader') {
    const targets = resolveVisibleTargets('leader', personId).map((target) => target.personId);
    const progress = await loadMemberProgress({ personIds: targets, today });
    const rows = progress.rows || [];
    ctx.memberRows = rows;
    ctx.memberActive = rows.reduce((sum, row) => sum + (row.active || 0), 0);
    ctx.memberOverdue = rows.reduce((sum, row) => sum + (row.overdue || 0), 0);
    ctx.memberAnswer = rows.filter((row) => row.reportKind === REPORT_KIND.PENDING_ANSWER).length;
    const targetSet = new Set(targets);
    ctx.attendance = ctx.attendance.filter((record) => targetSet.has(record.personId));
    ctx.inspections = ctx.inspections.filter((record) => targetSet.has(record.personId));
    ctx.overdueInspectionRecords = ctx.overdueInspectionRecords.filter((record) => targetSet.has(record.personId));
  }

  // 成员：只看本人考勤 / 考察
  if (role === 'visitor') {
    ctx.attendance = ctx.attendance.filter((record) => record.personId === personId);
    ctx.inspections = ctx.inspections.filter((record) => record.personId === personId);
    ctx.overdueInspectionRecords = ctx.overdueInspectionRecords.filter((record) => record.personId === personId);
  }

  ctx.absentCount = ctx.attendance.filter((record) => record.status === AttendanceStatus.ABSENT).length;
  ctx.overdueInspections = ctx.overdueInspectionRecords.length;
  ctx.inspectionPending = ctx.inspections.filter((record) => record.status === 'pending').length;
  ctx.makeupPending = ctx.makeups.filter((task) => task.status === 'pending').length;
  ctx.makeupOverdue = ctx.makeups.filter((task) => task.status === 'pending' && task.deadline && task.deadline < today).length;
  ctx.reviewPending = ctx.reviews.filter((record) => record.status !== ReviewStatus.CONFIRMED).length;
  ctx.reviewUploaded = ctx.reviews.filter((record) => record.status === ReviewStatus.UPLOADED).length;

  // 宣传任务：与「宣传任务」页同源（mockDB 空表时用同一内容单一源种子）
  const propTasks = (mockDB.propTasks && mockDB.propTasks.length ? mockDB.propTasks : PROP_TASKS_SEED)
    .filter((task) => !task.voided);
  ctx.propTasksPending = propTasks.filter((task) => task.status === 'pending').length;
  ctx.propTasksInProgress = propTasks.filter((task) => task.status === 'in_progress').length;
  ctx.propTasksOpen = ctx.propTasksPending + ctx.propTasksInProgress;

  // 汇报（请我汇报 + 我发起且未关闭）与文件外发确认
  const requests = IssueStore.getReportRequestsFor(personId);
  const mineReports = IssueStore.getMyReports(personId).filter((report) => report.status === 'open');
  const openGap = mineReports.filter((report) => report.resultPending).length;
  const secretaryPending = role === 'secretary' ? IssueStore.getSecretaryPendingReports().length : 0;
  ctx.reports = {
    requests,
    mine: mineReports,
    openGap,
    answerCount: role === 'secretary' ? secretaryPending : openGap,
  };
  ctx.reportPending = requests.length + mineReports.length;
  ctx.reportAnswerGap = openGap;

  const branchId = getBranchIdOfPerson(personId);
  ctx.workforce = branchId ? getBranchWorkforce(branchId) : {};
  return ctx;
}

/** 条线负责人：分工快照（到人取姓名 / 到角色取角色名）优先，否则角色名 */
function _ownerOf(line, workforce, role) {
  const assignment = line.module ? workforce?.[line.module] : null;
  if (assignment?.ownerType === 'person' && assignment.ownerId) {
    return getPersonName(assignment.ownerId) || _roleLabel(line.ownerRole || role);
  }
  if (assignment?.ownerType === 'role' && assignment.ownerId) {
    return _roleLabel(assignment.ownerId);
  }
  return _roleLabel(line.ownerRole || role);
}

/** 条线行动作：汇报条线走「我的处置」，其余切本台真实页签 */
function _lineActionHtml(row) {
  const hasContent = row.active > 0 || row.overdue > 0 || !!row.gap;
  if (!hasContent) return '—';
  const line = row.line;
  if (line.actionKind === 'dispatch') {
    return '<button type="button" class="btn-ghost text-xs px-2.5 py-1 flex-shrink-0" data-wo-go-dispatch>去我的处置</button>';
  }
  if (!line.tab) return '—';
  const segment = line.segment ? ` data-wo-segment="${esc(line.segment)}"` : '';
  return `<button type="button" class="btn-ghost text-xs px-2.5 py-1 flex-shrink-0" data-wo-goto-tab="${esc(line.tab)}"${segment}>去${esc(line.actionLabel || '处理')}</button>`;
}

/** 待我处理：逾期待办 → 文件确认 → 汇报 → 业务缺口 → 活动/专班，前 5 条由统一上限截取 */
function _buildActionItems(ctx, config) {
  const items = [];

  (ctx.todoGroups || []).forEach((group) => {
    const overdueItems = (group.items || []).filter((item) => isTodoExpired(item, ctx.today));
    const overdue = overdueItems.length > 0;
    const deadline = overdueItems[0]?.deadline || group.deadline || '';
    const domain = WORK_DOMAIN_LABELS[_groupDomain(group)] || '未分类';
    const reason = _gap(
      overdue ? `逾期 ${Math.max(...overdueItems.map((item) => _daysOverdue(item.deadline, ctx.today)))} 天` : '',
      domain,
      deadline ? `截止 ${deadline}` : '无截止',
    );
    items.push({
      kind: 'todo',
      title: group.title || '待办',
      reason,
      overdue,
      deadline,
      actionLabel: '去待办',
      attrs: `data-wo-jump="todo" data-todo-key="${esc(group.groupKey)}"`,
      lineKey: config.lineOf?.({ kind: 'todo', domain: _groupDomain(group), groupKey: group.groupKey }),
    });
  });

  (ctx.dispatches || []).forEach((dispatch) => {
    items.push({
      kind: 'dispatch',
      title: `文件待确认 · ${dispatch.refLabel || '外发文件'}`,
      reason: `${dispatch.senderName || '发送人'} 已微信外发`,
      overdue: false,
      deadline: '',
      actionLabel: '确认收到',
      attrs: `data-ed-id="${esc(dispatch.id)}"`,
      lineKey: config.lineOf?.({ kind: 'dispatch' }),
    });
  });

  (ctx.reports.requests || []).forEach((report) => {
    items.push({
      kind: 'report',
      title: report.title || '未命名汇报',
      reason: `${getPersonName(report.requestedBy) || '上级'}请汇报 · 上报与汇报`,
      overdue: false,
      deadline: '',
      actionLabel: '去我的处置',
      attrs: 'data-wo-go-dispatch',
      lineKey: config.lineOf?.({ kind: 'report' }),
    });
  });
  (ctx.reports.mine || []).forEach((report) => {
    items.push({
      kind: 'report',
      title: report.title || '未命名汇报',
      reason: _gap('待答复', '上报与汇报', report.submittedAt ? `提交 ${String(report.submittedAt).slice(0, 10)}` : ''),
      overdue: false,
      deadline: '',
      actionLabel: '去我的处置',
      attrs: 'data-wo-go-dispatch',
      lineKey: config.lineOf?.({ kind: 'report' }),
    });
  });

  (ctx.activities || []).forEach((activity) => {
    const overdue = !!activity.date && activity.date < ctx.today;
    items.push({
      kind: 'activity',
      title: activity.title || '未命名活动',
      reason: _gap(overdue ? `逾期 ${_daysOverdue(activity.date, ctx.today)} 天` : '', '活动', activity.date ? `截止 ${activity.date}` : '无截止'),
      overdue,
      deadline: activity.date || '',
      actionLabel: '看详情',
      attrs: `data-wo-jump="activity" data-act-id="${esc(activity.id)}"`,
      lineKey: config.lineOf?.({ kind: 'activity' }),
    });
  });

  (ctx.taskforces || []).forEach((taskforce) => {
    const overdue = !!taskforce.deadline && taskforce.deadline < ctx.today;
    items.push({
      kind: 'taskforce',
      title: taskforce.name || '未命名专班',
      reason: _gap(overdue ? `逾期 ${_daysOverdue(taskforce.deadline, ctx.today)} 天` : '', '专班', taskforce.deadline ? `截止 ${taskforce.deadline}` : '无截止'),
      overdue,
      deadline: taskforce.deadline || '',
      actionLabel: '看详情',
      attrs: `data-wo-jump="taskforce" data-tf-id="${esc(taskforce.id)}"`,
      lineKey: config.lineOf?.({ kind: 'taskforce' }),
    });
  });

  config.lines.forEach((line) => {
    const gap = line.gap(ctx);
    if (!gap) return;
    const attrs = line.actionKind === 'dispatch'
      ? 'data-wo-go-dispatch'
      : line.tab
        ? `data-wo-goto-tab="${esc(line.tab)}"${line.segment ? ` data-wo-segment="${esc(line.segment)}"` : ''}`
        : '';
    if (!attrs) return;
    items.push({
      kind: 'gap',
      title: `${line.label} · ${gap}`,
      reason: `${line.label}条线 · 待处理`,
      overdue: false,
      deadline: '',
      actionLabel: `去${line.actionLabel || line.label}`,
      attrs,
      lineKey: line.key,
    });
  });

  items.sort((a, b) => _priorityOf(a) - _priorityOf(b)
    || (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
  return items;
}

function _priorityOf(item) {
  if (item.overdue) return 0;
  if (item.kind === 'dispatch') return 1;
  if (item.kind === 'report') return 2;
  if (item.kind === 'gap') return 3;
  return 4;
}

/** 绑定事件：文件确认 / 去我的处置 / 待办定位 / 活动专班详情 / 条线页签 */
function _bindWorkOverviewEvents(container, role, personId, prefix, rerender) {
  // 文件流外发确认（支书 2026-08-10 裁定）：接收方确认收到 → 闭环记录
  container.querySelectorAll('[data-ed-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmExternalDispatch(btn.dataset.edId);
      showToast('success', '已确认收到，文件流转完成');
      rerender();
    });
  });

  // 汇报区只读：唯一动作「去我的处置」（提交入口只在「我的处置」）
  container.querySelectorAll('[data-wo-go-dispatch]').forEach((btn) => {
    btn.addEventListener('click', () => _jumpToDispatchTab(prefix));
  });

  container.querySelectorAll('[data-wo-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.woJump;
      if (kind === 'todo' || kind === 'todo-all') {
        _jumpToTodoTab(prefix, kind === 'todo' ? btn.dataset.todoKey : null);
      } else if (kind === 'activity') {
        _woDetail = { kind: 'activity', id: btn.dataset.actId };
        rerender();
      } else if (kind === 'taskforce') {
        _woDetail = { kind: 'taskforce', id: btn.dataset.tfId };
        rerender();
      }
    });
  });

  // 条线动作：切本台真实页签；补课仍先聚焦「考勤管理 · 补课」分段
  container.querySelectorAll('[data-wo-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.woGotoTab;
      if (btn.dataset.woSegment === 'makeup') {
        try {
          const module = await import('../../entries/tabs/disc/attendance-tab.js?v=20261018g');
          module.focusSegment?.('makeup');
        } catch (_) { /* 分段记忆失败时仍进考勤页 */ }
      }
      const tabBtn = document.querySelector(`[data-${prefix}-tab="${tab}"]`);
      if (tabBtn) tabBtn.click();
    });
  });
}

/** 跳转本台「我的处置」tab（汇报提交/处理的唯一入口） */
function _jumpToDispatchTab(prefix) {
  const tabBtn = document.querySelector(`[data-${prefix}-tab="my-dispatch"]`);
  if (!tabBtn) { showToast('info', '当前角色无「我的处置」tab，汇报请到待办跟进'); return; }
  tabBtn.click();
}

/** 跳转工作台「待办」tab 并定位高亮目标聚合卡（按 groupKey） */
function _jumpToTodoTab(prefix, groupKey) {
  const btn = document.querySelector(`[data-${prefix}-tab="todo"]`);
  if (btn) btn.click();
  if (!groupKey) return;
  setTimeout(() => {
    const target = document.querySelector(`[data-group-key="${groupKey}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashHighlight(target);
    }
  }, 150);
}

/** 在办下钻详情（活动/专班只读知情视图，返回按钮回概况） */
async function _renderOverviewDetail(container, detail, accent, onBack) {
  container.innerHTML = `
    <div class="card rounded-xl card-standard">
      <div class="flex items-center justify-between gap-3 mb-3">
        <button type="button" class="btn-neutral wo-detail-back text-xs px-3 py-1.5" style="color:var(--neutral-700)">← 返回工作概况</button>
        <span class="text-xs text-gray-500">${detail.kind === 'activity' ? '活动详情 · 只读知情' : '专班详情 · 只读知情'}</span>
      </div>
      <div id="wo-detail-host"></div>
    </div>`;
  container.querySelector('.wo-detail-back')?.addEventListener('click', () => {
    _woDetail = null;
    if (typeof onBack === 'function') onBack();
  });
  const host = container.querySelector('#wo-detail-host');
  if (!host) return;
  if (detail.kind === 'activity') {
    const { renderActivityView } = await import('../record/activity-view.js?v=20261018g');
    renderActivityView(host, { highlightId: detail.id, accent });
  } else {
    const { renderTaskforceView } = await import('../record/taskforce-view.js?v=20261018g');
    renderTaskforceView(host, { highlightId: detail.id });
  }
}
