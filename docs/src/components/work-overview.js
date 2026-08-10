// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/work-overview.js — 各角色「工作概况」tab
//  书记 2026-08-10 裁定：全部角色新增工作概况 tab（组长走组员进展升级版）
//  三区上下排布、问题优先（数据结构定 UI，参考书记按人视图 v2）：
//    ① 汇报区（最上）：待我行动——请我汇报（行内填写即发）+ 我发起的开放汇报
//    ② 卡点区（次上）：我的超期待办 + 条线缺口（按角色注入）
//    ③ 进度区（最下）：我的在办聚合 + 条线态势（按角色注入）
//  职责空间最小充分信息（P-015 知情边界）；本页禁用 SVG 图标（书记裁定）
// ════════════════════════════════════════════════════════════════

import { showToast } from '../core/utils.js?v=20260808m';
import { TodoStore, seedTodos, TodoStatus } from '../services/todo.js?v=20260808m';
import { IssueStore, REPORT_CATEGORIES } from '../services/issues.js?v=20260808m';
import { AuthStore } from '../services/auth.js?v=20260808m';
import { loadActivities } from '../services/activity.js?v=20260808m';
import { loadActiveAttendanceRecords } from '../services/attendance.js?v=20260808m';
import { loadInspectionRecords, getOverdueRecords } from '../services/inspection.js?v=20260808m';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260808m';
import { PEOPLE } from '../mock/people.js?v=20260808m';
import { getPersonName } from '../mock/index.js?v=20260808m';
import { AttendanceStatus } from '../core/domain.js?v=20260808m';

/**
 * 渲染「工作概况」tab 内容
 * @param {HTMLElement} container — tab 内容容器
 * @param {Object} opts
 * @param {string} opts.role      — 当前用户角色键（org-commissioner / prop-commissioner / disc-commissioner / participant）
 * @param {string} opts.personId  — 当前用户 personId
 * @param {string} [opts.accent]  — 强调色
 */
export async function renderWorkOverview(container, { role, personId, accent = '#B91C1C' }) {
  if (!container) return;
  await IssueStore.loadAll();
  seedTodos();
  TodoStore.refreshExpiredStatus();
  const today = new Date().toISOString().slice(0, 10);

  const grouped = TodoStore.getGroupedByAction(role);
  const stats = TodoStore.getStatsByRole(role);

  // ── ① 汇报区：待我行动 ────────────────────────────────
  const requests = IssueStore.getReportRequestsFor(personId);
  const openMine = IssueStore.getMyReports(personId).filter(r => r.status === 'open');

  const requestRows = requests.map(r => `
    <div class="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <p class="text-xs font-medium text-blue-700">${getPersonName(r.requestedBy) || '上级'}请汇报：${r.title}</p>
      ${r.body && r.body !== r.title ? `<p class="text-xs text-gray-600 mt-1">${r.body}</p>` : ''}
      <div class="flex gap-2 mt-2">
        <input type="text" id="wo-req-${r.id}" class="input-flat text-xs flex-1" placeholder="填写汇报内容…" aria-label="汇报内容">
        <button type="button" class="wo-req-submit text-xs px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity flex-shrink-0" data-issue-id="${r.id}" style="background:${accent};">汇报</button>
      </div>
    </div>`).join('');

  const openRows = openMine.map(r => {
    const cat = REPORT_CATEGORIES[r.reportCategory] || '进度';
    const catColor = r.reportCategory === 'blocked' ? '#EF4444' : r.reportCategory === 'ask' ? '#F59E0B' : '#16A34A';
    const state = r.resultPending
      ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">待答复</span>'
      : r.requestedBy ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">待汇报</span>'
      : '<span class="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">进行中</span>';
    return `
      <div class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${catColor};"></span>
        <span class="text-xs font-medium flex-shrink-0" style="color:${catColor};">${cat}</span>
        <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${r.title}</span>
        <span class="text-xs text-gray-400 flex-shrink-0">${r.submittedAt}</span>
        ${state}
      </div>`;
  }).join('');

  const reportRows = requestRows + openRows;
  const reportBody = reportRows
    ? `<div class="space-y-2">${reportRows}</div>`
    : `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 暂无待我行动的汇报
       </div>`;

  // ── ② 卡点区：我的超期 + 条线缺口 ─────────────────────
  const myBlockers = [];
  grouped.forEach(g => (g.items || []).forEach(it => {
    const overdue = it.status === TodoStatus.EXPIRED
      || (it.status === TodoStatus.PENDING && it.deadline && it.deadline < today);
    if (overdue) myBlockers.push({ title: g.title, deadline: it.deadline || '' });
  }));
  const lineBlockers = _lineBlockers(role);

  const blockerRows = [];
  myBlockers.forEach(b => blockerRows.push(`<div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EF4444;"></span><span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">我的待办</span><span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b.title} 超期</span><span class="text-[11px] tabular-nums text-red-500 font-medium flex-shrink-0">${b.deadline}</span></div>`));
  lineBlockers.forEach(b => blockerRows.push(`<div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F59E0B;"></span><span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">条线缺口</span><span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b}</span></div>`));

  const blockerBody = blockerRows.length
    ? `<div class="space-y-1">${blockerRows.join('')}</div>`
    : `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 无超期与缺口，一切正常
       </div>`;

  // ── ③ 进度区：我的在办 + 条线态势 ─────────────────────
  const myActs = loadActivities().filter(a =>
    !a.archived && a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'draft' &&
    (a.organizer === personId || (Array.isArray(a.assignments) && a.assignments.some(x => x.personId === personId)))
  );
  const myTfs = TaskForceRecordStore.list().filter(tf =>
    (tf.status === 'active' || tf.status === 'recruiting') &&
    (tf.manager === personId || tf.initiator === personId || (Array.isArray(tf.members) && tf.members.some(m => m.personId === personId)))
  );

  const lineRows = _lineProgress(role);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">汇报</h4>
          <span class="text-xs text-gray-400">${requests.length + openMine.length} 条待行动 · 行内填写</span>
        </div>
        ${reportBody}
      </div>
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">卡点</h4>
          <span class="text-xs text-gray-400">我的超期 + 条线缺口 · ${blockerRows.length} 项</span>
        </div>
        ${blockerBody}
      </div>
      <div class="card rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">在办</h4>
          <span class="text-xs text-gray-400">我的在办聚合</span>
        </div>
        <div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#3B82F6;"></span>
          <span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">我的在办</span>
          <span class="text-xs tabular-nums text-gray-600 flex-shrink-0">待办 ${stats._total}</span>
          <span class="text-xs tabular-nums text-gray-600 flex-shrink-0">活动 ${myActs.length}</span>
          <span class="text-xs tabular-nums text-gray-600 flex-shrink-0">专班 ${myTfs.length}</span>
        </div>
        ${lineRows.length ? `<div class="space-y-1 mt-1">${lineRows.join('')}</div>` : ''}
      </div>
    </div>`;

  _bindWorkOverviewEvents(container, role, personId, () => renderWorkOverview(container, { role, personId, accent }));
}

/** 条线卡点（按角色注入职责空间的缺口） */
function _lineBlockers(role) {
  const out = [];
  if (role === 'disc-commissioner') {
    const att = loadActiveAttendanceRecords();
    const absentIds = new Set(att.filter(r => r.status === AttendanceStatus.ABSENT).map(r => r.personId));
    const madeUpIds = new Set(att.filter(r => r.status === AttendanceStatus.MADE_UP).map(r => r.personId));
    const makeupPending = [...absentIds].filter(id => !madeUpIds.has(id)).length;
    if (makeupPending) out.push(`补课未完成 ${makeupPending} 人`);
    const overdue = getOverdueRecords().length;
    if (overdue) out.push(`考察超期 ${overdue} 条`);
  } else if (role === 'prop-commissioner') {
    const activities = loadActivities();
    const ended = activities.filter(a => a.status === 'completed' || a.archived);
    const pendingArchive = ended.filter(a => !a.archived).length;
    if (pendingArchive) out.push(`待归档活动 ${pendingArchive} 个`);
  } else if (role === 'org-commissioner') {
    const recruiting = TaskForceRecordStore.list().filter(t => t.status === 'recruiting').length;
    if (recruiting) out.push(`专班招募中 ${recruiting} 个`);
    const pendingAuth = loadActivities().filter(a =>
      !a.archived && a.direction === 'bottom-up' && !(a.assignments || []).some(x => x.role === 'organizer')
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
    const acts = loadActivities().filter(a => !a.archived && a.status !== 'completed' && a.status !== 'cancelled');
    rows.push(_lineRow('#0EA5E9', '活动', `${acts.length} 个在办`));
  } else if (role === 'prop-commissioner') {
    const activities = loadActivities();
    const archived = activities.filter(a => a.archived).length;
    rows.push(_lineRow('#F59E0B', '档案', `已归档 ${archived} 个`));
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

/** 绑定事件：请我汇报 → 行内填写即发（复用 issues 的 result 提交模式） */
function _bindWorkOverviewEvents(container, role, personId, rerender) {
  container.querySelectorAll('.wo-req-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.issueId;
      const body = document.getElementById('wo-req-' + id)?.value?.trim();
      if (!body) { showToast('error', '请填写汇报内容'); return; }
      IssueStore.addComment(id, personId, role, body, 'result');
      showToast('success', '汇报已发出，等待上级答复');
      rerender();
    });
  });
}
