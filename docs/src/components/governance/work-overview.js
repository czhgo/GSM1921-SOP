// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/work-overview.js — 各角色「工作概况」tab
//  支书 2026-08-10 裁定：全部角色新增工作概况 tab（组长走组员进展升级版）
//  三区上下排布、问题优先（数据结构定 UI，参考支书按人视图 v2）：
//    ① 汇报区（最上）：只读摘要——待汇报 / 待答复计数 + 最近 1–3 条标题；
//       唯一动作「去我的处置」（提交入口只保留在「我的处置」，2026-10-18 繁专项 Task 6）
//    ② 卡点区（次上）：我的超期待办 + 条线缺口（按角色注入）
//    ③ 进度区（最下）：我的在办聚合 + 条线态势（按角色注入）
//  职责空间最小充分信息（P-011 知情边界）；本页禁用 SVG 图标（支书 2026-08-10 裁定）
// ════════════════════════════════════════════════════════════════

import { showToast, flashHighlight, todayLocal, escHtml as esc } from '../../core/base/utils.js?v=20261018f';
import { dutyCardHtml } from './workforce-duty-card.js?v=20261018f';
import { TodoStore, seedTodos, TodoStatus } from '../../services/governance/todo.js?v=20261018f';
import { IssueStore } from '../../services/governance/issues.js?v=20261018f';
import { AuthStore } from '../../services/core/auth.js?v=20261018f';
import { solidAccentStyle, dotDarkVars, isActivityEnded, isActivityArchived } from '../../core/domain/constants.js?v=20261018f';
import { loadActivities } from '../../services/activity/activity.js?v=20261018f';
// 待批活动的可见性单一源（2026-09-22 批次 151 · 支书裁定「只支委层可见」）：「工作概况」的在办/条线计数
// 同样按查看者角色收窄（非支委层不算入还没批的活动）。
import { filterActivitiesForViewer } from '../../services/core/visibility.js?v=20261018f';
import { loadActiveAttendanceRecords } from '../../services/activity/attendance.js?v=20261018f';
import { loadInspectionRecords, getOverdueRecords } from '../../services/activity/inspection.js?v=20261018f';
// S3③（2026-09-12）：补课口径统一——概况补课缺口与「补课制度」表同源（services/activity/makeup.js）
import { loadMakeupTasks } from '../../services/activity/makeup.js?v=20261018f';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261018f';
import { listPendingByReceiver, confirmExternalDispatch } from '../../services/activity/external-dispatch.js?v=20261018f';
import { liveMembers, PersonStore } from '../../services/member/person.js?v=20261018f';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/member/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { getPersonName } from '../../services/member/person.js?v=20261018f';
import { AttendanceStatus } from '../../core/domain/domain.js?v=20261018f';

// 在办下钻详情目标（支书 2026-08-10 裁定：概况「在办」可下钻到活动/专班只读详情）
let _woDetail = null; // { kind: 'activity' | 'taskforce', id } | null

/**
 * 渲染「工作概况」tab 内容
 * @param {HTMLElement} container — tab 内容容器
 * @param {Object} opts
 * @param {string} opts.role      — 当前用户角色键（org-commissioner / prop-commissioner / disc-commissioner / participant）
 * @param {string} opts.personId  — 当前用户 personId
 * @param {string} [opts.accent]  — 强调色
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

  const grouped = TodoStore.getGroupedByAction(role);

  // ── ① 汇报区：只读摘要（2026-10-18 繁专项 Task 6）────────
  //   概况只报计数与最近标题；提交表单/提交按钮一律不再出现，唯一动作＝「去我的处置」。
  const requests = IssueStore.getReportRequestsFor(personId);
  const openMine = IssueStore.getMyReports(personId).filter(r => r.status === 'open');
  const openGap = openMine.filter(r => r.resultPending).length;
  const reportTotal = requests.length + openMine.length;
  const reportRecent = [
    ...requests.map(r => ({ title: r.title, hint: `${getPersonName(r.requestedBy) || '上级'}请汇报`, at: r.submittedAt || '' })),
    ...openMine.map(r => ({ title: r.title, hint: '我发起的汇报', at: r.submittedAt || '' })),
  ].sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 3);

  const reportBody = reportTotal === 0
    ? `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 暂无待汇报或待答复事项
       </div>`
    : `<div class="space-y-2">
         <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
           <span>待汇报 <b class="tabular-nums text-gray-800">${requests.length}</b> 条</span>
           <span>待答复 <b class="tabular-nums text-gray-800">${openGap}</b> 条</span>
         </div>
         ${reportRecent.length ? `<div class="space-y-1">${reportRecent.map(r =>
           `<p class="text-xs text-gray-600 truncate">· ${esc(r.hint)}：${esc(r.title || '未命名汇报')}</p>`).join('')}</div>` : ''}
         <div>
           <button type="button" class="btn-accent-soft text-xs px-3 py-1.5" data-wo-go-dispatch>去我的处置</button>
         </div>
       </div>`;

  // ── ② 卡点区：我的超期 + 条线缺口 ─────────────────────
  const myBlockers = [];
  grouped.forEach(g => (g.items || []).forEach(it => {
    const overdue = it.status === TodoStatus.EXPIRED
      || (it.status === TodoStatus.PENDING && it.deadline && it.deadline < today);
    if (overdue) myBlockers.push({ title: g.title, deadline: it.deadline || '' });
  }));
  const lineBlockers = _lineBlockers(role);

  // 文件流外发确认（支书 2026-08-10 裁定）：微信外发的文件到达后，接收方在此确认，形成闭环
  const pendingDispatches = listPendingByReceiver(role);
  const dispatchRows = pendingDispatches.map(d => `
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--functional-warning);"></span>
      <span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">文件待确认</span>
      <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${d.refLabel} · ${d.senderName} 已微信外发</span>
      <button type="button" class="btn-action-green ed-confirm-btn px-2.5 py-1 flex-shrink-0" data-ed-id="${d.id}">确认收到</button>
    </div>`);

  const blockerRows = [];
  dispatchRows.forEach(r => blockerRows.push(r));
  //   ⚠ 2026-09-30 批次 313（支书评议①「对比度是 UI 设计大忌」）：本行原套 `.btn-danger-solid`
  //     （实底红）——而该族的口径是**破坏性动作确认**（删除 / 驳回 / 撤销，见 `DESIGN_SYSTEM.md` 族 7），
  //     **本行是导航**（去待办看这条超期），属批次 297-2/298「按钮全面归一」时的**过度应用**；
  //     且实底红遇上本行自带的 `text-gray-700` / `text-gray-600` 子 span ⇒ **红底深灰字**、几乎读不出。
  //     改回与同区其余行同构的 `.btn-ghost` 行（白底）＋ **红点**（`--functional-error`）保留超期信号。
  myBlockers.forEach(b => blockerRows.push(`<button type="button" class="btn-ghost wo-inline-item flex items-center gap-3 py-2.5 px-3 w-full" data-wo-jump="todo-all" title="前往待办查看该超期项"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--functional-error);"></span><span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">我的待办</span><span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b.title} 超期</span><span class="text-[11px] tabular-nums text-red-600 font-medium flex-shrink-0">${b.deadline}</span></button>`));
  lineBlockers.forEach(b => blockerRows.push(`<div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--functional-warning);"></span><span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">条线缺口</span><span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b}</span></div>`));

  const blockerBody = blockerRows.length
    ? `<div class="space-y-1.5">${blockerRows.join('')}</div>`
    : `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 无超期与缺口，一切正常
       </div>`;

  // ── ③ 进度区：我的在办（可下钻，设计原则 11）+ 条线态势 ─────
  const myActs = filterActivitiesForViewer(loadActivities(), role).filter(a =>
    !isActivityEnded(a) && a.status !== 'cancelled' && a.status !== 'draft' &&
    (a.organizer === personId || (Array.isArray(a.assignments) && a.assignments.some(x => x.personId === personId)))
  );
  const myTfs = TaskForceRecordStore.list().filter(tf =>
    (tf.status === 'active' || tf.status === 'recruiting') &&
    (tf.manager === personId || tf.initiator === personId || (Array.isArray(tf.members) && tf.members.some(m => m.personId === personId)))
  );

  // 在办条目（可点击，点击直达详情/待办 tab 定位）
  // 支书 2026-08-11 裁定：在办统一业务优先级排序——待办聚合组/活动/专班合并为一条流，
  // 组间与组内统一按「过期优先 → 截止升序 → 无截止排后」排序，跨类对齐时间紧迫度。
  const _MAX_INLINE = 5;
  const inProgressItems = [];
  const myTodoItems = grouped || [];

  // 待办聚合组（过期判定沿用组内是否存在过期/超期条目）
  (myTodoItems || []).forEach(g => {
    const hasOverdue = (g.items || []).some(it =>
      it.status === TodoStatus.EXPIRED || (it.status === TodoStatus.PENDING && it.deadline && it.deadline < today)
    );
    inProgressItems.push({
      kind: 'todo',
      title: g.title,
      count: g.count,
      overdue: hasOverdue,
      deadline: g.deadline || '',
      html: `
        <button type="button" class="btn-ghost wo-inline-item flex items-center gap-3 py-2 px-3 w-full" data-wo-jump="todo" data-todo-key="${g.groupKey}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="${dotDarkVars(hasOverdue ? '#EF4444' : accent)}background:${hasOverdue ? '#EF4444' : accent};"></span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${g.title}</span>
          ${g.count > 1 ? `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums flex-shrink-0">${g.count}</span>` : ''}
          ${hasOverdue ? `<span class="text-[11px] text-red-600 font-medium flex-shrink-0">含超期</span>` : ''}
        </button>`,
    });
  });

  // 在办活动（deadline = 活动日期）
  myActs.forEach(a => {
    inProgressItems.push({
      kind: 'activity',
      title: a.title,
      overdue: false,
      deadline: a.date || '',
      html: `
        <button type="button" class="btn-ghost wo-inline-item flex items-center gap-3 py-2 px-3 w-full" data-wo-jump="activity" data-act-id="${a.id}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--functional-info);"></span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${a.title}</span>
          <span class="text-[11px] text-gray-500 flex-shrink-0">活动</span>
        </button>`,
    });
  });

  // 在办专班（deadline = 专班截止）
  myTfs.forEach(tf => {
    inProgressItems.push({
      kind: 'taskforce',
      title: tf.name,
      overdue: false,
      deadline: tf.deadline || '',
      html: `
        <button type="button" class="btn-ghost wo-inline-item flex items-center gap-3 py-2 px-3 w-full" data-wo-jump="taskforce" data-tf-id="${tf.id}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#4F46E5;"></span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${tf.name}</span>
          <span class="text-[11px] text-gray-500 flex-shrink-0">专班</span>
        </button>`,
    });
  });

  // 统一业务优先级排序：过期优先 → 截止升序 → 无截止排后（stable：同截止保持数据序）
  inProgressItems.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const ad = a.deadline || '9999-12-31';
    const bd = b.deadline || '9999-12-31';
    return ad.localeCompare(bd);
  });

  const shownItems = inProgressItems.slice(0, _MAX_INLINE);
  const inProgressRows = shownItems.map(it => it.html).join('');
  // S3①（2026-09-12）：概况「在办」为混合流（待办聚合组 + 活动 + 专班），旧「共 N 项 · 前往待办查看全部」
  // 以待办落点承载非待办项 → 组织台点入待办为空（10 项全是活动/专班）。现按来源拆分：
  //   待办部分与待办 tab 同源（TodoStore 聚合组），「前往待办」落同一批明细；
  //   活动/专班部分（属他域 tab）仅报数并注明，下钻待他域配合。
  const shownTodoCount = shownItems.filter(it => it.kind === 'todo').length;
  const overflowTodo = myTodoItems.length - shownTodoCount;
  const overflowOther = (myActs.length + myTfs.length) - (shownItems.length - shownTodoCount);
  const moreRows = [];
  if (overflowTodo > 0) {
    moreRows.push(`<button type="button" class="btn-ghost wo-inline-item flex items-center gap-2 py-1.5 px-3 text-xs w-full" data-wo-jump="todo-all">共 ${myTodoItems.length} 项待办 · 前往待办 tab 查看全部 →</button>`);
  }
  if (overflowOther > 0) {
    moreRows.push(`<div class="flex items-center gap-2 py-1.5 px-3 text-xs text-gray-500 w-full text-left"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#CBD5E1;"></span>另有 ${overflowOther} 项活动/专班在办（在对应 tab 查看）</div>`);
  }
  const inProgressMore = moreRows.length ? moreRows.join('') : '';

  const inProgressBody = inProgressRows
    ? `<div class="space-y-1.5">${inProgressRows}${inProgressMore}</div>`
    : `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 暂无在办事项
       </div>`;

  const lineRows = _lineProgress(role);

  container.innerHTML = `
    <div class="space-y-4">
      ${dutyCardHtml(prefix)}
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">汇报</h4>
          <span class="text-xs text-gray-500">${reportTotal} 条待处理 · 只读摘要（提交请到「我的处置」）</span>
        </div>
        ${reportBody}
      </div>
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">卡点</h4>
          <span class="text-xs text-gray-500">我的超期 + 条线缺口 · ${blockerRows.length} 项</span>
        </div>
        ${blockerBody}
      </div>
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">在办</h4>
          <span class="text-xs text-gray-500">我的在办 · 点击条目直达详情</span>
        </div>
        ${inProgressBody}
        ${lineRows.length ? `<div class="space-y-1 mt-2 pt-2 border-t border-gray-100">${lineRows.join('')}</div>` : ''}
      </div>
    </div>`;

  _bindWorkOverviewEvents(container, role, personId, prefix, () => renderWorkOverview(container, { role, personId, accent, prefix }));
}

/** 条线卡点（按角色注入职责空间的缺口） */
function _lineBlockers(role) {
  const out = [];
  if (role === 'disc-commissioner') {
    // S3③（2026-09-12）：补课口径统一——与「补课制度」表同源（loadMakeupTasks status=pending），
    // 不再用考勤「缺勤集合 − 已补集合」差集（口径不同 → 概况「补课未完成 7 人」vs 表「待补课 1」）。
    // 范围：仅统计补课任务表中待补课（含已超期）任务数。
    const makeupPending = loadMakeupTasks().filter(t => t.status === 'pending').length;
    if (makeupPending) out.push(`补课待完成 ${makeupPending} 项（补课任务表口径）`);
    const overdue = getOverdueRecords().length;
    if (overdue) out.push(`考察超期 ${overdue} 条`);
  } else if (role === 'prop-commissioner') {
    const activities = filterActivitiesForViewer(loadActivities(), role);
    const ended = activities.filter(a => isActivityEnded(a));
    const pendingArchive = ended.filter(a => !isActivityArchived(a)).length;
    if (pendingArchive) out.push(`待归档活动 ${pendingArchive} 个`);
  } else if (role === 'org-commissioner') {
    const recruiting = TaskForceRecordStore.list().filter(t => t.status === 'recruiting').length;
    if (recruiting) out.push(`专班招募中 ${recruiting} 个`);
    const pendingAuth = filterActivitiesForViewer(loadActivities(), role).filter(a =>
      !isActivityArchived(a) && a.direction === 'bottom-up' && !(a.assignments || []).some(x => x.role === 'organizer')
    ).length;
    if (pendingAuth) out.push(`待赋权活动 ${pendingAuth} 个`);
  }
  return out;
}

/** 条线态势行（按角色注入，色点+文字标签） */
function _lineProgress(role) {
  const rows = [];
  if (role === 'disc-commissioner') {
    const att = loadActiveAttendanceRecords();
    const total = att.length;
    const present = att.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.MADE_UP).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const insp = loadInspectionRecords();
    rows.push(_lineRow('#F59E0B', '考勤', `记录 ${total} 条 · 出勤率 ${rate}%`));
    rows.push(_lineRow('#94A3B8', '考察', `记录 ${insp.length} 条`));
  } else if (role === 'org-commissioner') {
    const tfs = TaskForceRecordStore.list().filter(t => t.status === 'active' || t.status === 'recruiting');
    rows.push(_lineRow('#4F46E5', '专班', `${tfs.length} 个在办`));
    const acts = filterActivitiesForViewer(loadActivities(), role).filter(a => !isActivityEnded(a) && a.status !== 'cancelled');
    rows.push(_lineRow('#0EA5E9', '活动', `${acts.length} 个在办`));
  } else if (role === 'prop-commissioner') {
    // 设计原则 11：进度指标只显未完成类——「已归档 N」是存量统计（无信息增量），
    // 只显「待归档缺口」（与卡点区一致，0 时该行不渲染）。
    const activities = filterActivitiesForViewer(loadActivities(), role);
    const ended = activities.filter(a => isActivityEnded(a));
    const pendingArchive = ended.filter(a => !isActivityArchived(a)).length;
    if (pendingArchive > 0) rows.push(_lineRow('#F59E0B', '档案', `待归档 ${pendingArchive} 个`));
  }
  return rows;
}

function _lineRow(color, label, text) {
  return `
    <div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color};"></span>
      <span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">${label}</span>
      <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${text}</span>
    </div>`;
}

/** 绑定事件：汇报摘要 → 唯一动作「去我的处置」；在办条目 → 下钻/跳转定位 */
function _bindWorkOverviewEvents(container, role, personId, prefix, rerender) {
  // 汇报区只读（2026-10-18 繁专项 Task 6）：概况不再提供行内提交，切「我的处置」处理
  container.querySelectorAll('[data-wo-go-dispatch]').forEach(btn => {
    btn.addEventListener('click', () => _jumpToDispatchTab(container, prefix));
  });

  // 文件流外发确认（支书 2026-08-10 裁定）：接收方确认收到 → 闭环记录
  container.querySelectorAll('.ed-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmExternalDispatch(btn.dataset.edId);
      showToast('success', '已确认收到，文件流转完成');
      rerender();
    });
  });

  // 在办下钻（设计原则 11：进度指标可下钻——待办→待办 tab 定位；活动/专班→只读详情）
  container.querySelectorAll('[data-wo-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.woJump;
      if (kind === 'todo' || kind === 'todo-all') {
        _jumpToTodoTab(container, prefix, kind === 'todo' ? btn.dataset.todoKey : null);
      } else if (kind === 'activity') {
        _woDetail = { kind: 'activity', id: btn.dataset.actId };
        rerender();
      } else if (kind === 'taskforce') {
        _woDetail = { kind: 'taskforce', id: btn.dataset.tfId };
        rerender();
      }
    });
  });

}

/** 跳转本台「我的处置」tab（汇报提交/处理的唯一入口） */
function _jumpToDispatchTab(container, prefix) {
  const tabBtn = container.parentElement?.querySelector(`[data-${prefix}-tab="my-dispatch"]`);
  if (!tabBtn) { showToast('info', '当前角色无「我的处置」tab，汇报请到待办跟进'); return; }
  tabBtn.click();
}

/** 跳转工作台「待办」tab 并定位高亮目标聚合卡（按 groupKey） */
function _jumpToTodoTab(container, prefix, groupKey) {
  const parent = container.parentElement;
  const btn = parent?.querySelector(`button[data-${prefix}-tab="todo"]`);
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
    <div class="card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <button type="button" class="btn-neutral wo-detail-back text-xs px-3 py-1.5"  style="color:var(--neutral-700)">← 返回工作概况</button>
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
    const { renderActivityView } = await import('../record/activity-view.js?v=20261018f');
    renderActivityView(host, { highlightId: detail.id, accent });
  } else {
    const { renderTaskforceView } = await import('../record/taskforce-view.js?v=20261018f');
    renderTaskforceView(host, { highlightId: detail.id });
  }
}
