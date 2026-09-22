// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
// member-progress.js — 「本组组员进展」聚合**单一源**（2026-09-15 批次 47-I · Q-23-41 ②）
// ════════════════════════════════════════════════════════════════
// 来源（支书 2026-09-15 裁定）：批次 47-G 抽样「辅助小字」时撞见一条「开学第 1 周：请在『组员进展』
//   逐人归集…」提醒，支书连问三句——「为什么自动生成」「我从来没说过要有一个**收集过程**」
//   「照理说理想状态下，后台服务器已经**自动把相关信息都计算汇总好了**」→ 裁定「**改为服务端汇总**」。
//
// 本文件两部分：
//   · `aggregateMemberProgress` / `blockersOf` —— **纯函数**（不碰 DOM / localStorage / fetch），
//     故**服务端可直接 import**（与 `core/constants.js` / `core/config-clean.js` 同一惯例，
//     见 `server/routes/leader-progress.js`）→ 由服务端做汇总；
//   · `loadMemberProgress` —— **IO 载入器**（api 态走服务端汇总接口、mock 态读本地 store 后调纯函数），
//     **仅前端使用，服务端不调用它**（服务端只用纯函数部分）。
//   两支共用同一个聚合函数 → **接口态与 mock 态不存在第二套口径**。
//
// 四项判据的**单一源**（禁止在本文件重写判定逻辑）：
//   · 超期        = `services/todo.js::isTodoExpired`（与域 expiredCount / 红点同口径）
//   · 在办        = `TodoStatus.COMPLETED` 之外
//   · 缺勤        = `core/domain.js::AttendanceStatus.ABSENT`
//   · 考察待确认  = 考察记录 `status === 'pending'`
// ════════════════════════════════════════════════════════════════

import { isTodoExpired, TodoStatus } from './todo.js?v=20260922k';
import { AttendanceStatus } from '../core/domain.js?v=20260922k';
import { isApiMode } from './runtime.js?v=20260922k';
import { getAuthToken, getApiBaseUrl } from '../core/data-adapter.js?v=20260922k';

/** 汇报态 → 稳定判别键（渲染文案随时可改，键不动；与 members-tab 原口径逐条对齐） */
export const REPORT_KIND = {
  NONE: 'none',
  PENDING_ANSWER: 'pending-answer',
  BLOCKED: 'blocked',
  REPORTING: 'reporting',
  REQUESTED: 'requested',
};

/**
 * 聚合「本组组员进展」四项（在办 / 超期 / 缺勤 / 考察待确认）+ 汇报态。
 *
 * @param {Object} input
 * @param {Array<{personId:string}>} input.persons 参与聚合的组员（**输出顺序即此顺序**）
 * @param {Array<Object>} input.todos 在办事项全量
 * @param {Array<Object>} input.attendance 出勤记录全量
 * @param {Array<Object>} input.inspections 考察记录全量
 * @param {Array<Object>} input.issues 汇报/上报全量
 * @param {string} input.today `YYYY-MM-DD`（「今天」口径由调用方给定，避免两端各自取时区）
 * @returns {Array<{personId:string, active:number, overdue:number, absent:number, inspPending:number,
 *   reportState:string, reportKind:string, reportTitle:string}>}
 */
export function aggregateMemberProgress({
  persons = [],
  todos = [],
  attendance = [],
  inspections = [],
  issues = [],
  today,
} = {}) {
  const REPORT_STATE_TEXT = {
    [REPORT_KIND.PENDING_ANSWER]: '待答复',
    [REPORT_KIND.BLOCKED]: '卡点上报中',
    [REPORT_KIND.REPORTING]: '汇报中',
    [REPORT_KIND.REQUESTED]: '待汇报',
    [REPORT_KIND.NONE]: '—',
  };

  return persons.map((p) => {
    const pid = p.personId;

    const openTodos = todos.filter((t) => t.personId === pid && t.status !== TodoStatus.COMPLETED);
    const overdue = openTodos.filter((t) => isTodoExpired(t, today)).length;
    const absent = attendance.filter((r) => r.personId === pid && r.status === AttendanceStatus.ABSENT).length;
    const inspPending = inspections.filter((r) => r.personId === pid && r.status === 'pending').length;

    const mine = issues.filter((i) => i.kind === 'report' && i.submittedBy === pid && !i.hidden && !i.mergedInto);
    const openReport = mine.find((r) => r.status === 'open');
    const openRequest = issues.find(
      (i) => i.kind === 'report' && i.requestedBy && i.assignee === pid && i.status === 'open' && !i.hidden && !i.mergedInto,
    );

    let reportKind = REPORT_KIND.NONE;
    let reportTitle = '';
    if (openReport) {
      reportTitle = openReport.title || '';
      if (openReport.resultPending) reportKind = REPORT_KIND.PENDING_ANSWER;
      else if (openReport.reportCategory === 'blocked') reportKind = REPORT_KIND.BLOCKED;
      else reportKind = REPORT_KIND.REPORTING;
    } else if (openRequest) {
      reportKind = REPORT_KIND.REQUESTED;
    }

    return {
      personId: pid,
      active: openTodos.length,
      overdue,
      absent,
      inspPending,
      reportState: REPORT_STATE_TEXT[reportKind],
      reportKind,
      reportTitle,
    };
  });
}

/**
 * 由聚合结果派生「卡点」告警清单（派生告警：同一人可命中多条）。
 * `name` / `role` 由调用方注入——**人名一律取档案**（禁记录内快照），故本函数不自行取名。
 *
 * @param {Array} rows `aggregateMemberProgress` 的输出
 * @param {(personId:string)=>{name:string, role:string}} metaOf 取人名与角色
 * @returns {Array<{personId:string, name:string, role:string, title:string, kind:string}>}
 */
export function blockersOf(rows = [], metaOf = () => ({ name: '', role: '' })) {
  const out = [];
  for (const r of rows) {
    const meta = metaOf(r.personId) || {};
    const base = { personId: r.personId, name: meta.name || r.personId, role: meta.role || 'participant' };
    if (r.overdue > 0) out.push({ ...base, title: `${r.overdue} 项待办超期`, kind: '超期待办' });
    if (r.reportKind === REPORT_KIND.BLOCKED) out.push({ ...base, title: `上报卡点：${r.reportTitle}`, kind: '上报卡点' });
    if (r.absent > 0) out.push({ ...base, title: `缺勤未补 ${r.absent} 次`, kind: '缺勤未补' });
    if (r.inspPending > 0) out.push({ ...base, title: `考察待确认 ${r.inspPending} 条`, kind: '考察待确认' });
  }
  return out;
}

/**
 * 载入「本组组员进展」四项 + 汇报态（**双态单一入口**，2026-09-15 批次 47-I）。
 * · api 态 → 打服务端汇总接口（**汇总在服务端算**，符合支书 2026-09-15 裁定的「理想状态」）；
 * · mock 态 → 读本地各 store 后调**同一个** `aggregateMemberProgress`（口径同源）。
 *
 * @param {Object} input
 * @param {string[]} input.personIds 目标组员 id（**输出顺序即此顺序**）
 * @param {string} [input.today] `YYYY-MM-DD`；缺省取本地当日（与页面渲染同一口径，避免 UTC 跨日错位）
 * @returns {Promise<{rows: Array<Object>, today: string, source: 'api'|'mock'}>}
 */
export async function loadMemberProgress({ personIds = [], today } = {}) {
  const day = today || new Date().toISOString().slice(0, 10);
  const api = isApiMode();
  if (!personIds.length) return { rows: [], today: day, source: api ? 'api' : 'mock' };

  if (api) {
    const qs = new URLSearchParams({ personIds: personIds.join(','), today: day });
    const res = await fetch(`${getApiBaseUrl()}/api/v1/leader/member-progress?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error(`服务端汇总读取失败（HTTP ${res.status}）`);
    const body = await res.json();
    return { rows: body.rows || [], today: body.today || day, source: 'api' };
  }

  // mock 态：动态引入各 store（保持服务端静态依赖图不被撑大）→ 调**同一个**纯函数
  const [{ TodoStore }, { loadAttendanceRecords }, { loadActiveInspectionRecords }, { IssueStore }] =
    await Promise.all([
      import('./todo.js?v=20260922k'),
      import('./attendance.js?v=20260922k'),
      import('./inspection.js?v=20260922k'),
      import('./issues.js?v=20260922k'),
    ]);
  if (typeof IssueStore.loadAll === 'function') await IssueStore.loadAll();
  const rows = aggregateMemberProgress({
    persons: personIds.map((personId) => ({ personId })),
    todos: TodoStore.getAll(),
    attendance: loadAttendanceRecords(),
    inspections: loadActiveInspectionRecords(),
    issues: IssueStore.getAll(),
    today: day,
  });
  return { rows, today: day, source: 'mock' };
}
