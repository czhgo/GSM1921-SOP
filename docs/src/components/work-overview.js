﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/work-overview.js — 各角色「工作概况」tab
//  书记 2026-08-10 裁定：全部角色新增工作概况 tab（组长走组员进展升级版）
//  三区上下排布、问题优先（数据结构定 UI，参考书记按人视图 v2）：
//    ① 汇报区（最上）：待我行动——请我汇报（行内填写即发）+ 我发起的开放汇报
//    ② 卡点区（次上）：我的超期待办 + 条线缺口（按角色注入）
//    ③ 进度区（最下）：我的在办聚合 + 条线态势（按角色注入）
//  职责空间最小充分信息（P-011 知情边界）；本页禁用 SVG 图标（书记裁定）
// ════════════════════════════════════════════════════════════════

import { showToast, flashHighlight } from '../core/utils.js?v=20260829r';
import { TodoStore, seedTodos, TodoStatus } from '../services/todo.js?v=20260829r';
import { IssueStore, REPORT_CATEGORIES } from '../services/issues.js?v=20260829r';
import { AuthStore } from '../services/auth.js?v=20260829r';
import { solidAccentStyle, dotDarkVars } from '../core/constants.js?v=20260829r';
import { loadActivities } from '../services/activity.js?v=20260829r';
import { loadActiveAttendanceRecords } from '../services/attendance.js?v=20260829r';
import { loadInspectionRecords, getOverdueRecords } from '../services/inspection.js?v=20260829r';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260829r';
import { listPendingByReceiver, confirmExternalDispatch } from '../services/external-dispatch.js?v=20260829r';
import { PEOPLE } from '../mock/people.js?v=20260829r';
import { getPersonName } from '../mock/index.js?v=20260829r';
import { AttendanceStatus } from '../core/domain.js?v=20260829r';

// 在办下钻详情目标（书记 2026-08-10 裁定：概况「在办」可下钻到活动/专班只读详情）
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
  const today = new Date().toISOString().slice(0, 10);

  // 在办下钻模式（书记 2026-08-10 裁定）：活动/专班只读详情，返回按钮回概况
  if (_woDetail) {
    await _renderOverviewDetail(container, _woDetail, accent, () => renderWorkOverview(container, { role, personId, accent, prefix }));
    return;
  }

  const grouped = TodoStore.getGroupedByAction(role);

  // ── ① 汇报区：待我行动 ────────────────────────────────
  const requests = IssueStore.getReportRequestsFor(personId);
  const openMine = IssueStore.getMyReports(personId).filter(r => r.status === 'open');

  const requestRows = requests.map(r => `
    <div class="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <p class="text-xs font-medium text-blue-700">${getPersonName(r.requestedBy) || '上级'}请汇报：${r.title}</p>
      ${r.body && r.body !== r.title ? `<p class="text-xs text-gray-600 mt-1">${r.body}</p>` : ''}
      <div class="flex gap-2 mt-2">
        <input type="text" id="wo-req-${r.id}" class="input-flat text-xs flex-1" placeholder="填写汇报内容…" aria-label="汇报内容">
        <button type="button" class="wo-req-submit text-xs px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity flex-shrink-0" data-issue-id="${r.id}" style="${solidAccentStyle(accent)};">汇报</button>
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
      <div class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" data-wo-open-report="${r.id}">
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

  // 文件流外发确认（书记 2026-08-10 裁定）：微信外发的文件到达后，接收方在此确认，形成闭环
  const pendingDispatches = listPendingByReceiver(role);
  const dispatchRows = pendingDispatches.map(d => `
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F59E0B;"></span>
      <span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">文件待确认</span>
      <span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${d.refLabel} · ${d.senderName} 已微信外发</span>
      <button type="button" class="ed-confirm-btn text-[11px] px-2.5 py-1 rounded-lg text-white flex-shrink-0" data-ed-id="${d.id}" style="background:#16A34A;">确认收到</button>
    </div>`);

  const blockerRows = [];
  dispatchRows.forEach(r => blockerRows.push(r));
  myBlockers.forEach(b => blockerRows.push(`<div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EF4444;"></span><span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">我的待办</span><span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b.title} 超期</span><span class="text-[11px] tabular-nums text-red-500 font-medium flex-shrink-0">${b.deadline}</span></div>`));
  lineBlockers.forEach(b => blockerRows.push(`<div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F59E0B;"></span><span class="text-sm font-medium text-gray-700 w-20 flex-shrink-0">条线缺口</span><span class="text-xs text-gray-600 flex-1 min-w-0 truncate">${b}</span></div>`));

  const blockerBody = blockerRows.length
    ? `<div class="space-y-1">${blockerRows.join('')}</div>`
    : `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 无超期与缺口，一切正常
       </div>`;

  // ── ③ 进度区：我的在办（可下钻，设计原则 11）+ 条线态势 ─────
  const myActs = loadActivities().filter(a =>
    !a.archived && a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'draft' &&
    (a.organizer === personId || (Array.isArray(a.assignments) && a.assignments.some(x => x.personId === personId)))
  );
  const myTfs = TaskForceRecordStore.list().filter(tf =>
    (tf.status === 'active' || tf.status === 'recruiting') &&
    (tf.manager === personId || tf.initiator === personId || (Array.isArray(tf.members) && tf.members.some(m => m.personId === personId)))
  );

  // 在办条目（可点击，点击直达详情/待办 tab 定位）
  // 书记 2026-08-11 裁定：在办统一业务优先级排序——待办聚合组/活动/专班合并为一条流，
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
        <button type="button" class="wo-inline-item flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left w-full" data-wo-jump="todo" data-todo-key="${g.groupKey}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="${dotDarkVars(hasOverdue ? '#EF4444' : accent)}background:${hasOverdue ? '#EF4444' : accent};"></span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${g.title}</span>
          ${g.count > 1 ? `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 tabular-nums flex-shrink-0">${g.count}</span>` : ''}
          ${hasOverdue ? `<span class="text-[11px] text-red-500 font-medium flex-shrink-0">含超期</span>` : ''}
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
        <button type="button" class="wo-inline-item flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left w-full" data-wo-jump="activity" data-act-id="${a.id}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#3B82F6;"></span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${a.title}</span>
          <span class="text-[11px] text-gray-400 flex-shrink-0">活动</span>
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
        <button type="button" class="wo-inline-item flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left w-full" data-wo-jump="taskforce" data-tf-id="${tf.id}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#4F46E5;"></span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${tf.name}</span>
          <span class="text-[11px] text-gray-400 flex-shrink-0">专班</span>
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
  const inProgressMore = inProgressItems.length > _MAX_INLINE
    ? `<button type="button" class="wo-inline-item flex items-center gap-2 py-1.5 px-3 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-left" data-wo-jump="todo-all">共 ${inProgressItems.length} 项 · 前往待办 tab 查看全部 →</button>`
    : '';

  const inProgressBody = inProgressRows
    ? `<div class="space-y-1">${inProgressRows}${inProgressMore}</div>`
    : `<div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs">
         <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 暂无在办事项
       </div>`;

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
          <span class="text-xs text-gray-400">我的在办 · 点击条目直达详情</span>
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
    // 设计原则 11：进度指标只显未完成类——「已归档 N」是存量统计（无信息增量），
    // 只显「待归档缺口」（与卡点区一致，0 时该行不渲染）。
    const activities = loadActivities();
    const ended = activities.filter(a => a.status === 'completed' || a.archived);
    const pendingArchive = ended.filter(a => !a.archived).length;
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

/** 绑定事件：请我汇报 → 行内填写即发（复用 issues 的 result 提交模式）；在办条目 → 下钻/跳转定位 */
function _bindWorkOverviewEvents(container, role, personId, prefix, rerender) {
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

  // 文件流外发确认（书记 2026-08-10 裁定）：接收方确认收到 → 闭环记录
  container.querySelectorAll('.ed-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmExternalDispatch(btn.dataset.edId);
      showToast('success', '已确认收到，文件流转闭环完成');
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

  // 我发起的开放汇报行 → 跳转「我的处置」tab 并打开对应汇报详情
  // （书记 2026-08-11 裁定：与 issues.js 我的处置汇报行行为一致，两处统一为可点击）
  container.querySelectorAll('[data-wo-open-report]').forEach(row => {
    row.addEventListener('click', () => {
      const issueId = row.dataset.woOpenReport;
      const tabBtn = container.parentElement?.querySelector(`[data-${prefix}-tab="my-dispatch"]`);
      if (!tabBtn) { showToast('info', '当前角色无「我的处置」tab'); return; }
      tabBtn.click();
      // my-dispatch 渲染可能异步（render 返回 Promise），延迟后定位并打开对应汇报行
      setTimeout(() => {
        const target = document.querySelector(`[data-mydispatch-action="open-report"][data-issue-id="${issueId}"]`);
        if (target) target.click();
      }, 180);
    });
  });
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
        <button type="button" class="wo-detail-back text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100" style="background:var(--neutral-100);color:var(--neutral-700);">← 返回工作概况</button>
        <span class="text-xs text-gray-400">${detail.kind === 'activity' ? '活动详情 · 只读知情' : '专班详情 · 只读知情'}</span>
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
    const { renderActivityView } = await import('./activity-view.js?v=20260829r');
    renderActivityView(host, { highlightId: detail.id, accent });
  } else {
    const { renderTaskforceView } = await import('./taskforce-view.js?v=20260829r');
    renderTaskforceView(host, { highlightId: detail.id });
  }
}
