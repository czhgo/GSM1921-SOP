// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/work-overview.js — 六个支部工作台「工作概况」唯一渲染源
//  2026-10-18 支书拍定（工作台密度与组件重组 Task 7）：六台统一三层，不再有独立「汇报」卡。
//    ① 结论带 data-wo-layer="summary"：一条横向带四个数（在办 / 逾期 / 待我处理 / 待答复或职责指标）；
//       四项是可聚焦按钮，逾期/待我处理可筛选下方列表，在办/第四项滚到条线表
//    ② 条线表 data-wo-layer="lines"：行=分工条线，列固定「工作分工 / 负责人 / 在办 / 逾期 / 待处理」；
//       缺口与行内动作合并进「待处理」列（R3-29，6 列 → 5 列）
//    ③ 待我处理 data-wo-layer="actions"：最多 3 条，每条标题 + 一句原因 + 一个动作；超出留一行「共 N 项 · 去待办」
//  单一源关系：
//    · 行 = components/ui/list-row.js；表 = components/ui/data-table.js（tableHeadHtml）；
//      空态 = components/ui/empty-state.js；间距 = styles.css 的 .stack-* / .card-* / --space-*。
//    · 数据沿用既有服务：TodoStore / IssueStore / filterActivitiesForViewer / TaskForceRecordStore /
//      loadAttendance / loadInspection / loadMakeupTasks / listPendingByReceiver 等，不新造数据源。
//  保留下钻：待办组→待办 tab；活动/专班→只读详情；文件外发→确认收到；汇报→「去我的处置」。
//  本页禁用 SVG 图标（支书 2026-08-10 裁定），类别用色点 + 文字区分。
// ════════════════════════════════════════════════════════════════

import { showToast, flashHighlight, todayLocal, docAnchorHref, escHtml as esc } from '../../core/base/utils.js?v=20261024b';
import { listRowHtml, listGroupHtml } from '../ui/list-row.js?v=20261024b';
import { tableHeadHtml } from '../ui/data-table.js?v=20261024b';
import { emptyStateHtml } from '../ui/empty-state.js?v=20261024b';
import { renderTabHeader } from '../shell/page-frame.js?v=20261024b';
import {
  TodoStore, seedTodos, isTodoExpired, WORK_DOMAIN, WORK_DOMAIN_LABELS, TodoStatus,
} from '../../services/governance/todo.js?v=20261024b';
import { IssueStore } from '../../services/governance/issues.js?v=20261024b';
import {
  isActivityEnded, isActivityArchived, isActivityInProgress, ROLE_LABELS, PARTY_GROUP_LEADER_ROLES,
} from '../../core/domain/constants.js?v=20261024b';
import { loadActivities } from '../../services/activity/activity.js?v=20261024b';
import { filterActivitiesForViewer, resolveVisibleTargets } from '../../services/core/visibility.js?v=20261024b';
import { loadActiveAttendanceRecords } from '../../services/activity/attendance.js?v=20261024b';
import { loadInspectionRecords, getOverdueRecords } from '../../services/activity/inspection.js?v=20261024b';
import { loadMakeupTasks } from '../../services/activity/makeup.js?v=20261024b';
import { loadActiveActivityReviews, loadTaskforceReviews } from '../../services/governance/review.js?v=20261024b';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261024b';
import { listPendingByReceiver, confirmExternalDispatch } from '../../services/activity/external-dispatch.js?v=20261024b';
import { getPersonName } from '../../services/member/person.js?v=20261024b';
import { loadMemberProgress, REPORT_KIND } from '../../services/member/member-progress.js?v=20261024b';
import { AttendanceStatus, ReviewStatus, mockDB, isTaskforceActiveStatus } from '../../core/domain/domain.js?v=20261024b';
import { PROP_TASKS_SEED } from '../../data/mock/prop.js?v=20261024b';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../services/branch/branch.js?v=20261024b';

// 在办下钻详情目标（支书 2026-08-10 裁定：概况「在办」可下钻到活动/专班只读详情）
let _woDetail = null; // { kind: 'activity' | 'taskforce', id } | null
// 结论带筛选状态：null | 'overdue' | 'actions'；按角色重置，避免跨工作台串用
let _metricFilter = null;
let _metricRole = null;

const _MAX_INLINE = 3;
const _DONE_LIMIT = 5;
/** 「待我处理」分区标题（结论带上的第二枚指标改称「待办」，避免同一屏出现两遍「待我处理」）。 */
const ACTIONS_TITLE = '待我处理';
const LINE_COLUMNS = [
  { label: '工作分工', className: 'wo-line-name' },
  { label: '负责人' },
  { label: '在办', className: 'is-numeric' },
  { label: '逾期', className: 'is-numeric' },
  { label: '待处理' },
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

/** 四个数的统一形态：逾期与待办在前，在办退到第三位，第四数按职责替换。
 *  2026-10-20 R3-07：筛选类（逾期 / 待办）与滚动类（在办 / 第四项）在渲染上分成两种控件——
 *  筛选是 chip 按钮（有 aria-pressed），滚动是页内链接（原生锚点），不再让同款按钮干两种事。 */
function _metrics(fourth) {
  return [
    { key: 'overdue', kind: 'filter', label: '逾期', value: (totals) => totals.overdue, warning: true, ariaLabel: '筛选逾期待办' },
    // 「待办」只跳分区，不做第二套筛选：实际可筛的只有「逾期」一类（R3-07）。
    { key: 'actions', kind: 'scroll', href: '#wo-actions', label: '待办', value: (totals) => totals.actions, ariaLabel: '查看待办事项' },
    { key: 'active', label: '在办', kind: 'scroll', href: '#wo-lines', value: (totals) => totals.active, muted: true, ariaLabel: '查看工作分工表' },
    { ...fourth, key: 'fourth', kind: 'scroll', href: '#wo-lines', ariaLabel: `查看${fourth.label}分工` },
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
        // B06（2026-10-20）：原「待赋权 N 个」是纯文本，看得出缺口却无处可去。赋权的真实承载页
        //   ＝ 本台「活动管理」（capabilities/secretary-workspace.js: calendar →
        //   assign-tab.js::mountActivityProjectAuth），故把该缺口做成可点入口；不新增 tab。
        gapTab: 'calendar',
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
        // R2-30：缺口动作由共享组件结构化输出，org 外壳不再按 DOM 文案补按钮。
        gapTab: 'taskforce',
      },
      {
        key: 'activity', label: '活动', ownerRole: 'org-commissioner', tab: 'calendar', actionLabel: '活动日历',
        stats: (c) => _activityStats(c.activities, c.today),
        // R3-24：原「赋权」条线与结论带第四数重复显示同一个数字。赋权是活动条线的缺口，
        //   并入本行只出现一次；「赋权」条线一并删除。
        gap: (c) => c.pendingAuth ? `待赋权 ${c.pendingAuth} 个` : '',
        gapTab: 'calendar',
      },
      {
        // R3-23：行名与动作目的地必须一致——「成员流动」去成员流动页，不再写「去成员名册」。
        key: 'member-flow', label: '成员流动', ownerRole: 'org-commissioner', tab: 'member-flow', actionLabel: '成员流动',
        stats: (c) => _todoStats(c.todoGroups.filter((g) => _groupDomain(g) === WORK_DOMAIN.MEMBER_DEV), c.today),
        gap: (c) => {
          const pending = c.todoGroups
            .filter((g) => _groupDomain(g) === WORK_DOMAIN.MEMBER_DEV)
            .reduce((sum, g) => sum + (g.count || 0), 0);
          return pending ? `成员事项 ${pending} 项` : '';
        },
        gapTab: 'member-flow',
      },
    ],
    lineOf(item) {
      if (item.kind === 'taskforce') return 'tf';
      if ((item.domain || '') === WORK_DOMAIN.MEMBER_DEV) return 'member-flow';
      return 'activity';
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
 * @param {string} [opts.title]   — tab 页头 H2 文案（缺省「工作概况」；支书台传「全局概况」，成员台传「我的工作概况」）
 */
export async function renderWorkOverview(container, opts) {
  if (!container) return;
  container.innerHTML = '<p class="text-sm text-gray-500">正在加载工作概况…</p>';
  try {
    await _renderOverviewContent(container, opts);
  } catch (error) {
    console.warn('[work-overview] 工作概况加载失败：', error);
    container.innerHTML = emptyStateHtml('工作概况加载失败，请刷新重试');
  }
}

async function _renderOverviewContent(container, { role, personId, accent = '#B91C1C', prefix = '', extraSections = [], title = '工作概况' }) {
  await IssueStore.loadAll();
  seedTodos();
  TodoStore.refreshExpiredStatus();
  const today = todayLocal();
  const rerenderOpts = { role, personId, accent, prefix, extraSections, title };

  // 在办下钻模式（支书 2026-08-10 裁定）：活动/专班只读详情，返回按钮回概况
  if (_woDetail) {
    await _renderOverviewDetail(container, _woDetail, accent, () => renderWorkOverview(container, rerenderOpts));
    return;
  }

  const config = ROLE_OVERVIEW_CONFIG[role] || ROLE_OVERVIEW_CONFIG.visitor;
  if (_metricRole !== role) {
    _metricRole = role;
    _metricFilter = null;
  }
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
  const visibleActions = _metricFilter === 'overdue'
    ? actionItems.filter((item) => item.overdue)
    : actionItems;

  const summaryHtml = config.metrics.map((metric) => {
    const value = metric.value(totals);
    const modifier = metric.warning && value > 0
      ? ' metric-band__value--warning'
      : metric.muted ? ' metric-band__value--muted' : '';
    const active = _metricFilter === metric.key;
    const body = `<span class="metric-band__value${modifier}">${esc(String(value))}</span>
      <span class="metric-band__label">${esc(metric.label)}</span>`;
    // R3-07：筛选类＝chip 按钮（可切换、aria-pressed）；滚动类＝页内链接（原生锚点，不再假装按钮）。
    if (metric.kind === 'filter') {
      return `<button type="button" class="metric-band__item metric-band__item--filter${active ? ' is-active' : ''}" data-metric="${esc(metric.key)}" data-metric-kind="filter" aria-pressed="${active ? 'true' : 'false'}" aria-label="${esc(metric.ariaLabel)}">${body}</button>`;
    }
    // R5A-01：概况页页内锚点不得以裸 '#' 输出——`<base href="../">` 会把它解析到 docs 根。
    return `<a class="metric-band__item metric-band__item--link" href="${esc(docAnchorHref(metric.href || '#wo-lines'))}" data-metric="${esc(metric.key)}" data-metric-kind="scroll" aria-label="${esc(metric.ariaLabel)}">${body}<span class="metric-band__jump" aria-hidden="true">›</span></a>`;
  }).join('');

  const tableRows = lineRows.map((row) => {
    // 零值口径（2026-10-19）：0 是事实，不用「—」代替；「—」只留给缺失数据。
    const overdue = row.overdue > 0
      ? `<span class="state-badge state-badge--warning tabular-nums">${row.overdue}</span>`
      : '<span class="text-gray-400 tabular-nums">0</span>';
    return `<tr data-wo-line="${esc(row.line.key)}">
      <td class="wo-line-name" data-label="工作分工">${esc(row.line.label)}</td>
      <td data-label="负责人">${esc(row.owner)}</td>
      <td class="is-numeric" data-label="在办">${row.active}</td>
      <td class="is-numeric" data-label="逾期">${overdue}</td>
      <td class="wo-line-gap" data-label="待处理">${_pendingCellHtml(row)}</td>
    </tr>`;
  }).join('');

  const shownActions = visibleActions.slice(0, _MAX_INLINE);
  const actionRows = shownActions.map((item) => listRowHtml({
    rowType: 'action',
    leading: `<span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${item.overdue ? 'var(--functional-warning)' : 'var(--neutral-300)'};"></span>`,
    title: item.title,
    meta: item.reason,
    trailing: `<button type="button" class="btn-outline btn-sm text-accent flex-shrink-0" ${item.attrs}>${esc(item.actionLabel)}<span aria-hidden="true">›</span></button>`,
  }));
  // 溢出行：筛选后仍保留「共 N 项 · 去待办」，N 取当前可见条数
  if (visibleActions.length > _MAX_INLINE || (_metricFilter && actionItems.length > _MAX_INLINE)) {
    actionRows.push(listRowHtml({
      rowType: 'nav',
      title: `共 ${visibleActions.length} 项 · 去待办`,
      dataAttrs: { 'data-wo-jump': 'todo-all' },
      trailing: '<span class="text-xs text-gray-500" aria-hidden="true">›</span>',
    }));
  }

  // 「我已处理」：只读回看，数据＝既有待办的已完成记录（status=completed + completedAt），
  // 不新造数据源、不提供反向操作。默认折叠，避免与「待我处理」争夺首屏。
  const doneItems = TodoStore.getByRole(role, {
    status: TodoStatus.COMPLETED, includeCompleted: true, personId,
  })
    .filter((todo) => todo.completedAt)
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    .slice(0, _DONE_LIMIT);
  const doneRows = doneItems.map((todo) => listRowHtml({
    rowType: 'display',
    title: todo.title || '已办事项',
    meta: `完成于 ${String(todo.completedAt || '').slice(0, 10)}`,
  }));

  container.innerHTML = `
    <div class="stack-page" data-wo-role="${esc(role)}">

      ${renderTabHeader({ title })}

      <section class="metric-band" data-wo-layer="summary" aria-label="工作概况结论">
        ${summaryHtml}
      </section>

      <section id="wo-lines" class="card rounded-xl card-standard stack-section card--static" data-wo-layer="lines">
        <div class="section-head">
          <h3 class="section-head__title">工作分工</h3>
        </div>
        <div class="wo-lines-scroll">
          <table class="data-table wo-lines-table" data-responsive="cards">
            <thead>${tableHeadHtml(LINE_COLUMNS)}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </section>

      <section id="wo-actions" class="card rounded-xl card-standard stack-section card--static" data-wo-layer="actions">
        <div class="section-head">
          <h3 class="section-head__title">${ACTIONS_TITLE}</h3>
        </div>
        ${actionRows.length ? listGroupHtml(actionRows) : emptyStateHtml(_metricFilter === 'overdue' ? '暂无逾期待办' : '暂无待我处理事项')}
      </section>

      <details class="card rounded-xl card-standard stack-section card--static" data-wo-layer="done">
        <summary class="section-head cursor-pointer select-none">
          <h3 class="section-head__title">我已处理 <span class="tabular-nums text-gray-500">${doneItems.length}</span></h3>
        </summary>
        <div class="mt-2">
          ${doneRows.length ? listGroupHtml(doneRows) : emptyStateHtml('暂无已处理事项')}
        </div>
      </details>

      ${extraSections.map((section) => section?.html || '').join('')}
    </div>`;

  // 页面层附加区块（U-01 支书台「周期归档待审核」由 overview-tab 提供）：只负责落位与挂载
  extraSections.forEach((section) => {
    try { section?.mount?.(container); } catch (error) { console.warn('[work-overview] 附加区块挂载失败：', error); }
  });

  _bindWorkOverviewEvents(container, role, personId, prefix, () => renderWorkOverview(container, rerenderOpts));
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
    const secretary = await import('../../services/governance/secretary-overview.js?v=20261024b');
    const realtime = secretary.SecretaryTodoDeriver.computeAggregates();
    const seen = new Set(ctx.todoGroups.map((group) => group.groupKey));
    ctx.todoGroups = [...ctx.todoGroups, ...realtime.filter((group) => !seen.has(group.groupKey))];
    ctx.overview = secretary.SecretaryOverviewStore.getOverview();
    // U-01：「待我处理」并入周期归档待审数。口径单一源 =
    //   services/governance/secretary-overview.js::listPeriodicArchivesPendingReview
    //   （同一函数亦供 overview-tab 的「周期归档待审核」卡；本处只取待审计数/明细，不另立判据）。
    //   角色门沿用本分支（支书/副支书共用 secretary 工作台）。
    ctx.periodicArchivesPending = secretary.listPeriodicArchivesPendingReview();
  }

  // 在办活动/专班都走 canonical 判据（R2-16/R2-48）：草稿与已取消不进入在办统计。
  const visibleActivities = filterActivitiesForViewer(loadActivities(), role).filter((activity) =>
    isActivityInProgress(activity));
  const isMineActivity = (activity) => activity.organizer === personId
    || (Array.isArray(activity.assignments) && activity.assignments.some((item) => item.personId === personId));
  ctx.activities = (PARTY_GROUP_LEADER_ROLES.includes(role) || role === 'visitor')
    ? visibleActivities.filter(isMineActivity)
    : visibleActivities;

  const allTaskforces = TaskForceRecordStore.list().filter((tf) => isTaskforceActiveStatus(tf.status));
  const isMineTaskforce = (tf) => tf.manager === personId || tf.initiator === personId
    || (Array.isArray(tf.members) && tf.members.some((member) => member.personId === personId));
  ctx.taskforces = (PARTY_GROUP_LEADER_ROLES.includes(role) || role === 'visitor')
    ? allTaskforces.filter(isMineTaskforce)
    : allTaskforces;

  const allActivities = filterActivitiesForViewer(loadActivities(), role);
  ctx.pendingAuth = role === 'secretary'
    ? (ctx.overview?.activity?.pendingAuth || 0)
    : allActivities.filter((activity) => isActivityInProgress(activity)
      && activity.direction === 'bottom-up'
      && !(activity.assignments || []).some((item) => item.role === 'organizer')).length;
  ctx.pendingArchive = role === 'secretary'
    ? (ctx.overview?.propaganda?.pendingArchive || 0)
    : allActivities.filter((activity) => isActivityEnded(activity) && !isActivityArchived(activity)).length;
  ctx.recruitingTaskforces = allTaskforces.filter((tf) => tf.status === 'recruiting').length;

  // 组长同权角色（`D-571`）：组员聚合走服务端/mock 同一纯函数（loadMemberProgress）
  if (PARTY_GROUP_LEADER_ROLES.includes(role)) {
    const targets = resolveVisibleTargets(role, personId).map((target) => target.personId);
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

/** 待处理格：R3-29 动作并入本列（原独立「动作」列删除，表列 6→5）。
 *  · 缺口本身已是入口（gapTab）⇒ 不再叠加同目的地的动作；
 *  · 只逾期、无缺口 ⇒ 本格给行内动作；
 *  · 两者皆无 ⇒「—」。 */
function _pendingCellHtml(row) {
  const action = _lineActionHtml(row);
  if (!row.gap) return action || '—';
  const gapHtml = _gapCellHtml(row.gap, row.line.gapTab);
  if (row.line.gapTab) return gapHtml;
  return action
    ? `<span class="inline-flex items-center gap-2 flex-wrap">${gapHtml}${action}</span>`
    : gapHtml;
}

/** 待处理：中性文字；仅「超期」一词取 warning 色，不整列铺色。
 *  B06：条线声明了 `gapTab` 时，缺口文字本身即入口（如支书「待赋权 N 个」→ 活动管理），
 *  避免「看得见数字、找不到处理处」；未声明者仍为纯文本（其余条线零变化）。 */
function _gapCellHtml(gap, gapTab) {
  if (!gap) return '—';
  const text = esc(gap).replace(/超期/g, '<span style="color:var(--functional-warning)">超期</span>');
  if (!gapTab) return text;
  return `<button type="button" class="btn-outline btn-sm text-accent font-medium" data-wo-goto-tab="${esc(gapTab)}" style="cursor:pointer;">${text}<span aria-hidden="true"> ›</span></button>`;
}

/** 条线行动作：仅缺口（gap）或逾期行显示；无动作时留空（不再用「—」占满一列）。 */
function _lineActionHtml(row) {
  if (!(row.gap || row.overdue > 0)) return '';
  const line = row.line;
  if (line.actionKind === 'dispatch') {
    return `<button type="button" class="btn-outline btn-sm text-accent" data-wo-go-dispatch>去我的处置<span aria-hidden="true">›</span></button>`;
  }
  if (!line.tab) return '';
  const segment = line.segment ? ` data-wo-segment="${esc(line.segment)}"` : '';
  return `<button type="button" class="btn-outline btn-sm text-accent" data-wo-goto-tab="${esc(line.tab)}"${segment}>去${esc(line.actionLabel || '处理')}<span aria-hidden="true">›</span></button>`;
}

/** 待我处理：逾期待办 → 文件确认 → 汇报 → 业务缺口 → 活动/专班，前 5 条由统一上限截取 */
function _buildActionItems(ctx, config) {
  const items = [];
  // 同一对象只保留一条（2026-10-20）：待办行已承载的活动/专班（actionData.scope + sourceId），
  //   不再另出一条同 id 的「看详情」行——否则同一活动既在待办行、又在活动行各出现一次。
  const todoObjectKeys = new Set();
  (ctx.todoGroups || []).forEach((group) => {
    (group.items || []).forEach((item) => {
      const data = item.actionData || {};
      if ((data.scope === 'activity' || data.scope === 'taskforce') && data.sourceId) {
        todoObjectKeys.add(`${data.scope}:${data.sourceId}`);
      }
    });
  });

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

  // 周期归档待审核（U-01）：并入「待我处理」计数与列表；点击滚到 overview-tab 的待审卡目标行。
  //   单一源 = secretary-overview.js::listPeriodicArchivesPendingReview（见 _buildContext 注释）。
  (ctx.periodicArchivesPending || []).forEach((report) => {
    const label = report.archivePolicySnapshot?.periodLabel
      || report.periodLabel || report.week || '未命名期次';
    const submitter = getPersonName(report.submittedBy) || report.submittedBy || '提交人';
    items.push({
      kind: 'periodic-archive',
      title: `周期归档待审核 · ${label}`,
      reason: _gap('待审核', '宣传', `${submitter} 提交`, report.submittedAt ? `提交 ${String(report.submittedAt).slice(0, 10)}` : ''),
      overdue: false,
      deadline: '',
      actionLabel: '去审核',
      attrs: `data-wo-jump="periodic-archive" data-pa-id="${esc(report.id)}"`,
      lineKey: 'prop',
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
    if (todoObjectKeys.has(`activity:${activity.id}`)) return;
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
    if (todoObjectKeys.has(`taskforce:${taskforce.id}`)) return;
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
      reason: `${line.label} · 待处理`,
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
  if (item.kind === 'periodic-archive') return 3;
  return 4;
}

/** 结论带交互后定位：平滑滚到指定层；焦点还给对应指标按钮 */
function _scrollToLayer(container, layer) {
  const target = container.querySelector(`[data-wo-layer="${layer}"]`);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _focusMetric(container, key) {
  const btn = container.querySelector(`[data-metric="${key}"]`);
  if (btn) btn.focus({ preventScroll: true });
}

/** 绑定事件：结论带筛选 / 文件确认 / 去我的处置 / 待办定位 / 活动专班详情 / 条线页签 */
function _bindWorkOverviewEvents(container, role, personId, prefix, rerender) {
  // 结论带：只有筛选类（chip）需要重渲染；滚动类是原生锚点，浏览器负责跳转与焦点。
  container.querySelectorAll('[data-metric-kind="filter"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.metric;
      _metricFilter = _metricFilter === key ? null : key;
      await rerender();
      _focusMetric(container, key);
      _scrollToLayer(container, 'actions');
    });
  });

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
      } else if (kind === 'periodic-archive') {
        // U-01：滚到页面层待审卡的目标行（卡片由支书 overview-tab 提供）
        const row = [...container.querySelectorAll('[data-periodic-archive-id]')]
          .find((el) => el.dataset.periodicArchiveId === btn.dataset.paId);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(row);
        }
      }
    });
  });

  // 条线动作：切本台真实页签；补课仍先聚焦「考勤管理 · 补课」分段
  container.querySelectorAll('[data-wo-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.woGotoTab;
      if (btn.dataset.woSegment === 'makeup') {
        try {
          const module = await import('../../entries/tabs/disc/attendance-tab.js?v=20261024b');
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

/** 在办下钻详情（活动/专班只读视图，返回按钮回概况） */
async function _renderOverviewDetail(container, detail, accent, onBack) {
  container.innerHTML = `
    <div class="card rounded-xl card-standard card--static">
      <div class="flex items-center justify-between gap-3 mb-3">
        <button type="button" class="btn-outline btn-sm wo-detail-back">← 返回工作概况</button>
        <span class="text-xs text-gray-500">${detail.kind === 'activity' ? '活动详情' : '专班详情'}</span>
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
    const { renderActivityView } = await import('../record/activity-view.js?v=20261024b');
    renderActivityView(host, { highlightId: detail.id, accent });
  } else {
    const { renderTaskforceView } = await import('../record/taskforce-view.js?v=20261024b');
    renderTaskforceView(host, { highlightId: detail.id });
  }
}
