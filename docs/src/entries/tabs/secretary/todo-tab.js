// role: [工程师]+[AI]
// entries/tabs/secretary/todo-tab.js — 书记工作台·待办 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分：按 tab 代码分割，首屏只加载默认 tab。
// 2026-08-07 T232：改为「动态聚合 + 复核确认面板」——SecretaryTodoDeriver.computeAggregates()
//   实时计算 4 提醒 + 4 复核，复核类一键写 secretaryConfirmedAt 销项，不再创建虚假实体待办。

import { showToast } from '../../../core/utils.js?v=20260903c';
import { renderTodoList } from '../../../components/todo-list.js?v=20260903c';
import { TodoStore, seedTodos } from '../../../services/todo.js?v=20260903c';
import { SecretaryTodoDeriver } from '../../../services/secretary-overview.js?v=20260903c';
import { badgeHtml } from '../../../components/badges.js?v=20260903c';
import { loadAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260903c';
import { loadInspectionRecords, saveInspectionRecords } from '../../../services/inspection.js?v=20260903c';
import { updateActivityReview } from '../../../services/review.js?v=20260903c';
import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { mockDB } from '../../../core/domain.js?v=20260903c';
import { persist } from '../../../core/data-adapter.js?v=20260903c';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260903c';
import { getAccentColors, resolveAccentRole, solidAccentStyle } from '../../../core/constants.js?v=20260903c';
import { IssueStore } from '../../../services/issues.js?v=20260903c';
import { TaskForceRecordStore, createTaskforceVoteActivity, findTaskforceVoteActivity } from '../../../services/taskforce.js?v=20260903c';
import { fetchVotes } from '../../../services/committee-vote.js?v=20260903c';
import { resolveVoterIds } from '../../../services/vote-config.js?v=20260903c';
import { renderReportInboxHtml, bindReportInbox } from '../../../components/reporting.js?v=20260903c';
import { renderMemberChangePanel } from '../../../components/member-change-panel.js?v=20260903c';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260903c';
import { buildOverdueRemindGroupNow } from '../../../services/resolution-followup.js?v=20260906c';

const { accent, accentBorder } = getAccentColors(resolveAccentRole('secretary'));

let _selectedTodoId = null;

// ── 聚合数据缓存（渲染与事件绑定共用） ─────────────────────────
let _allAggregates = [];

/** 渲染待办 tab（双栏：聚合列表 + 详情确认面板；顶部内建「待答复」收件箱） */
export async function renderContent() {
  const container = document.getElementById('secretary-tab-content');
  if (!container) return;
  container.dataset.currentTab = 'todo';

  // 补种子数据（幂等，仅行动类：设党小组组长等）；书记侧缺口/复核均为实时计算
  seedTodos();
  TodoStore.refreshExpiredStatus();
  // 待答复汇报（书记 2026-08-10 裁定：答复类置顶待办）——预加载 issues 权威源
  await IssueStore.loadAll();
  const pendingReports = IssueStore.getSecretaryPendingReports();

  // 动态聚合（实时计算）+ 种子行动类聚合
  const computedAggs = SecretaryTodoDeriver.computeAggregates();
  // R2-2（2026-09-06 书记批）：决议「待落实」逾期 → 书记待办提醒组
  // （扫描决议 followups 子域，纯函数见 services/resolution-followup.js；逾期=deadline < today）
  const followupOverdueAgg = buildOverdueRemindGroupNow();
  const seedAggs = TodoStore.getGroupedByAction('secretary');
  _allAggregates = [...computedAggs, ...(followupOverdueAgg ? [followupOverdueAgg] : []), ...seedAggs];

  // 统计条（聚合卡总数；过期仅统计提醒类缺口）
  const aggTotal = _allAggregates.reduce((s, g) => s + g.count, 0);
  const today = new Date().toISOString().slice(0, 10);
  let expiredCount = 0;
  for (const g of computedAggs) {
    if (g.kind !== 'remind') continue;
    for (const it of g.items) {
      if (it.deadline && it.deadline < today) expiredCount++;
    }
  }
  const stats = { _total: aggTotal, _expired: expiredCount };

  // 未选中时自动选中第一条（复核类优先展示）
  let selectedTodo = _selectedTodoId ? _allAggregates.find(g => g.groupKey === _selectedTodoId) : null;
  if (!selectedTodo && _allAggregates.length > 0) {
    selectedTodo = _allAggregates[0];
    _selectedTodoId = selectedTodo.groupKey;
  }

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'secretary',
    groupedAggregates: _allAggregates,
    stats,
    accent,
    selectedTodoId: _selectedTodoId,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.groupKey || todo.id;
      renderContent();
    },
    onActionTodo: (todo) => {
      // 计算类聚合卡（提醒/复核）：「处理」→ 打开详情面板确认/查看清单
      if (todo.groupKey && (todo.actionKey || '').endsWith('-confirm')) {
        _selectedTodoId = todo.groupKey;
        renderContent();
        return;
      }
      if (todo.groupKey && (todo.actionKey || '').endsWith('-remind')) {
        _selectedTodoId = todo.groupKey;
        renderContent();
        return;
      }
      handleTodoAction(todo);
    },
  });

  const detailHtml = selectedTodo ? renderTodoDetail(selectedTodo) : `
    <div class="text-center py-10 text-gray-400">
      <p class="text-sm">当前暂无待办。有新的活动、通知或待审事项时，会第一时间出现在这里。</p>
    </div>
  `;

  // 待答复收件箱（书记 2026-08-10 裁定：答复类置顶待办）——独立卡片置于待办列表上方
  const inboxHtml = renderReportInboxHtml({
    reports: pendingReports,
    title: '待答复',
    role: 'secretary',
    accent,
    emptyMsg: '暂无待答复汇报',
  });

  // B批 3.2-2：「专班待议（支委会）」提醒区——数据源 listCommitteeRequests()（仅 pending、先报先议）
  // 每项显示类型徽标（发起/解散）、专班名、任务摘要、报送人、报送时间；
  // 已排入表决（findTaskforceVoteActivity 命中该报送后创建的支委会活动）→ 提供「查看表决结果并生效」。
  const tfReqs = TaskForceRecordStore.listCommitteeRequests();
  const arrangedActByTf = new Map();
  tfReqs.forEach(r => { const act = findTaskforceVoteActivity(r.id); if (act) arrangedActByTf.set(r.id, act); });
  const committeeTfHtml = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班待议（支委会）</h3>
        <span class="text-[11px] text-gray-400">${tfReqs.length} 项待议</span>
      </div>
      <div class="space-y-2">
        ${tfReqs.length === 0
          ? '<p class="text-xs text-gray-400">暂无待议专班</p>'
          : tfReqs.map(r => _committeeTfRowHtml(r, arrangedActByTf.get(r.id))).join('')}
      </div>
    </div>`;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="space-y-4">
          <div id="secretary-member-change-panel"></div>
          ${inboxHtml}
          ${committeeTfHtml}
          <div class="card rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-title-cn text-base font-semibold text-gray-800">我的待办</h3>
            </div>
            ${todoListHtml}
          </div>
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 lg:sticky lg:top-20">
          <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">待办详情</h3>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  bindCommitteeTfEvents(container);
  bindTodoDetailEvents();
  bindReportInbox(container, { role: 'secretary', onAnswered: () => renderContent() });
  // 成员变更确认面板（2026-09-01 书记点验链路 ④：组织委员审批后 → 书记确认 → 更新阶段）
  await renderMemberChangePanel(container.querySelector('#secretary-member-change-panel'), {
    mode: 'secretary-confirm',
    accent,
    onDone: () => renderContent(),
  });
}

// ── 详情卡：按聚合类型分发（confirm / remind / 种子行动类） ────
function renderTodoDetail(todo) {
  const actionKey = todo.actionKey || '';
  if (todo.kind === 'confirm' || actionKey.endsWith('-confirm')) return renderConfirmDetail(todo);
  if (todo.kind === 'remind' || actionKey.endsWith('-remind')) return renderRemindDetail(todo);
  return renderSeedDetail(todo);
}

/** 复核类详情：批次/来源汇总 + 一键确认 */
function renderConfirmDetail(group) {
  const items = group.items || [];
  const rows = items.slice(0, 8).map(it => `<div class="text-xs text-gray-600 truncate">${_confirmItemLabel(group.actionKey, it)}</div>`).join('');
  const more = items.length > 8 ? `<div class="text-xs text-gray-400">… 另有 ${items.length - 8} 条</div>` : '';
  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${group.count} 条待复核</span>
      </div>
      <p class="font-title-cn text-sm font-bold text-gray-800">${group.title}</p>
      ${group.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${group.flow}</p>` : ''}
      <div class="rounded-lg bg-gray-50 p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
        ${rows || '<div class="text-xs text-gray-400">无待复核记录</div>'}
        ${more}
      </div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        <button class="secretary-todo-detail-confirm text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">一键确认 ${group.count} 条</button>
      </div>
    </div>
  `;
}

/** 提醒类详情：缺口清单 + 去活动管理 */
function renderRemindDetail(group) {
  const items = group.items || [];
  const rows = items.slice(0, 8).map(it => `
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-600 truncate">${it.name || it.title || it.id}</span>
      <span class="text-[11px] text-gray-400 flex-shrink-0">${it.date || ''}</span>
    </div>
  `).join('');
  const more = items.length > 8 ? `<div class="text-xs text-gray-400">… 另有 ${items.length - 8} 项</div>` : '';
  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${group.count} 项待跟进</span>
        ${group.deadline ? `<span class="text-[11px] text-gray-400">最早 ${group.deadline}</span>` : ''}
      </div>
      <p class="font-title-cn text-sm font-bold text-gray-800">${group.title}</p>
      ${group.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${group.flow}</p>` : ''}
      <div class="rounded-lg bg-gray-50 p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
        ${rows || '<div class="text-xs text-gray-400">暂无缺口</div>'}
        ${more}
      </div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        <button class="secretary-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">去活动管理</button>
      </div>
    </div>
  `;
}

/** 种子行动类详情（如：设置党小组组长） */
function renderSeedDetail(todo) {
  const statusLabel = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    expired: '已过期',
  }[todo.status] || todo.status;

  const statusColor = {
    pending: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
  }[todo.status] || 'bg-gray-100 text-gray-500';

  return `
    <div class="space-y-3">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
      </div>
      ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
      ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
      <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        ${todo.actionType ? `<button class="secretary-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
      </div>
    </div>
  `;
}

// ── 复核项标签 ────────────────────────────────────────────────
function _actTitle(activityId) {
  const a = loadActivities().find(x => x.id === activityId);
  return a ? a.title : (activityId || '未知活动');
}

function _personName(personId) {
  const p = getPersonById(personId);
  return p ? p.name : (personId || '未知人员');
}

function _confirmItemLabel(actionKey, it) {
  switch (actionKey) {
    case 'attendance-confirm':
      return `· ${_actTitle(it.activityId)} — ${_personName(it.personId)}`;
    case 'inspection-confirm':
      return `· ${_personName(it.personId)} — ${_actTitle(it.activityId) || it.sourceName || '考察'}`;
    case 'review-confirm':
      return `· ${_actTitle(it.activityId)} — 复盘已确认`;
    case 'archive-confirm':
      return `· ${it.activityName || _actTitle(it.activityId)} — ${it.category || ''}${it.fileName ? ' · ' + it.fileName : ''}`;
    default:
      return `· ${it.name || it.title || it.id || ''}`;
  }
}

// ── 一键确认（复核类）：写 secretaryConfirmedAt 销项 ────────────
function confirmGroup(group) {
  const now = new Date().toISOString();
  const actionKey = group.actionKey;
  let n = 0;

  if (actionKey === 'attendance-confirm') {
    const records = loadAttendanceRecords();
    const ids = new Set(group.items.map(r => r.id));
    records.forEach(r => {
      if (ids.has(r.id) && !r.secretaryConfirmedAt) { r.secretaryConfirmedAt = now; n++; }
    });
    saveAttendanceRecords(records);
  } else if (actionKey === 'inspection-confirm') {
    const records = loadInspectionRecords();
    const ids = new Set(group.items.map(r => r.id));
    records.forEach(r => {
      if (ids.has(r.id) && !r.secretaryConfirmedAt) { r.secretaryConfirmedAt = now; n++; }
    });
    saveInspectionRecords(records);
  } else if (actionKey === 'review-confirm') {
    for (const r of group.items) {
      if (r.activityId && updateActivityReview(r.activityId, { secretaryConfirmedAt: now })) n++;
    }
  } else if (actionKey === 'archive-confirm') {
    const ids = new Set(group.items.map(r => r.id));
    (mockDB.archiveRecords || []).forEach(r => {
      if (ids.has(r.id) && !r.secretaryConfirmedAt) { r.secretaryConfirmedAt = now; n++; }
    });
    persist();
  } else {
    showToast('info', `暂不支持该聚合类型确认：${actionKey}`);
    return;
  }

  showToast('success', `已复核 ${n} 条，${group.title}待办已清零`);
  _selectedTodoId = null;
  renderContent();
}

// ── 行动跳转（种子行动类 / 提醒类跳活动管理） ──────────────────
function handleTodoAction(todo) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // B批 3.2-1：旧「专班发起书记单人审批」待办不再派生（专班发起已改支委会表决，R3-1）。
  // 兼容处理旧存量：打开即提示并销该待办，引导到本页「专班待议（支委会）」区。
  if (todo.actionKey === 'taskforce-approval') {
    const items = (todo.items && todo.items.length > 0) ? todo.items : (todo.id ? [todo] : []);
    showToast('info', '专班发起已改支委会表决：请到本页「专班待议（支委会）」区排入表决处理');
    items.forEach(it => { if (it && it.id) TodoStore.complete(it.id); });
    renderContent();
    return;
  }
  // 提醒类聚合卡：「去活动管理」按钮直接切 calendar tab
  if (todo.groupKey && (todo.actionKey || '').endsWith('-remind')) {
    jumpToCalendar(todo);
    return;
  }
  // 根据 actionType 跳转到对应 tab（renderTabBar 统一按钮类名）
  const tabMap = {
    authorize: 'assign',
    write: 'calendar',
    review: 'feedback',
    notify: 'notification',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${targetTab}"]`);
    if (btn) btn.click();
    // t5c：切 tab 后自动展开目标面板（最小三成本——行动按钮一次直达可操作状态）
    if (targetTab === 'assign' && todo.actionType === 'authorize') {
      expandAssignPanelForTodo(todo);
    }
    showToast('info', `已跳转，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

/** 提醒类 → 切到活动管理 tab */
function jumpToCalendar(group) {
  const btn = document.querySelector('.secretary-tab-btn[data-secretary-tab="calendar"]');
  if (btn) btn.click();
  const first = (group.items || [])[0];
  showToast('info', `已跳转到活动管理，请跟进：${group.title}${first && first.name ? `（${first.name}）` : ''}`);
}

/** t5c：赋权管理 tab 落地后，按待办 scope 自动展开对应赋权面板 */
function expandAssignPanelForTodo(todo) {
  const scope = todo.actionData?.scope;
  const sourceId = todo.actionData?.sourceId;
  if (scope === 'leader') {
    // 常设赋权（设党小组组长）：若面板未展开则自动展开
    const assignBtn = document.getElementById('ws-sec-assign-btn');
    if (assignBtn && assignBtn.textContent.includes('设党小组组长')) assignBtn.click();
  } else if (scope === 'activity' || scope === 'taskforce') {
    // 项目赋权：预选项目类型与项目并滚动到表单
    const typeSelect = document.getElementById('project-type-select');
    const idSelect = document.getElementById('project-id-select');
    if (typeSelect && idSelect) {
      typeSelect.value = scope;
      typeSelect.dispatchEvent(new Event('change'));
      const opt = [...idSelect.options].find(o => o.value === sourceId);
      if (opt) idSelect.value = sourceId;
      document.getElementById('project-auth-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function bindTodoDetailEvents() {
  const container = document.getElementById('secretary-tab-content');
  if (!container) return;
  container.querySelector('.secretary-todo-detail-confirm')?.addEventListener('click', () => {
    const group = _allAggregates.find(g => g.groupKey === _selectedTodoId);
    if (group) confirmGroup(group);
  });
  container.querySelector('.secretary-todo-detail-action')?.addEventListener('click', () => {
    const group = _allAggregates.find(g => g.groupKey === _selectedTodoId);
    if (group) { handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) handleTodoAction(todo);
  });
}

// ════════════════════════════════════════════════════════════════
//  B批 3.2-2/3/4：专班待议（支委会）区
//  报送发起/解散（listCommitteeRequests）→ 书记「排入支委会表决」创建线上表决活动
//  （services/taskforce.js createTaskforceVoteActivity）→ 委员在线表态 →
//  「查看表决结果并生效」：fetchVotes + evaluateCommitteeVote 判定 → applyCommitteeDecision 落果。
// ════════════════════════════════════════════════════════════════

/** 单行：类型徽标（发起/解散）+ 专班名/任务摘要/报送人/报送时间 + 操作 */
function _committeeTfRowHtml(req, act) {
  const kindLabel = req.kind === 'dissolve' ? '解散' : '发起';
  const kindCls = req.kind === 'dissolve'
    ? 'bg-gray-100 text-gray-600'
    : 'bg-indigo-50 text-indigo-600';
  const byName = req.by ? getPersonName(req.by) : '组织委员';
  const atText = String(req.at || '').slice(0, 16).replace('T', ' ');
  const ops = act
    ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex-shrink-0">已排入表决</span>
       <button type="button" class="tf-cr-result text-xs px-2.5 py-1.5 rounded-lg text-white hover:opacity-90 transition-colors flex-shrink-0" style="background:#6366F1;" data-tf-id="${req.id}" data-activity-id="${act.id}">查看表决结果并生效</button>`
    : `<button type="button" class="tf-cr-arrange text-xs px-2.5 py-1.5 rounded-lg text-white hover:opacity-90 transition-colors flex-shrink-0" style="background:#CE1126;" data-tf-id="${req.id}" data-kind="${req.kind}">排入支委会表决</button>`;
  return `
    <div class="rounded-xl border border-gray-100 bg-gray-50/40 p-3">
      <div class="flex items-start gap-2">
        <span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${kindCls}">${kindLabel}</span>
        <div class="flex-1 min-w-0">
          <p class="font-title-cn text-sm font-bold text-gray-800 truncate">${req.name || '未命名专班'}</p>
          ${req.task ? `<p class="text-xs text-gray-500 truncate mt-0.5">${req.task}</p>` : ''}
          <p class="text-[11px] text-gray-400 mt-0.5">报送人 ${byName} · ${atText || ''}${req.note ? ` · ${req.note}` : ''}</p>
        </div>
        <div class="flex flex-col items-end gap-1.5 flex-shrink-0">${ops}</div>
      </div>
    </div>`;
}

/** 事件绑定（列表每次重建后调用） */
function bindCommitteeTfEvents(container) {
  container.querySelectorAll('.tf-cr-arrange').forEach(btn => {
    btn.addEventListener('click', () => _arrangeTfCommitteeVote(btn));
  });
  container.querySelectorAll('.tf-cr-result').forEach(btn => {
    btn.addEventListener('click', async () => {
      const req = TaskForceRecordStore.listCommitteeRequests().find(r => r.id === btn.dataset.tfId);
      if (!req) { showToast('info', '该报送已处理或已失效，列表已刷新'); renderContent(); return; }
      await _openTfDecisionModal(req, btn.dataset.activityId);
    });
  });
}

/** 3.2-3：为该报送创建一场「线上支委会」表决活动（title 形如「线上支委会：审议专班【名】（发起/解散）」） */
async function _arrangeTfCommitteeVote(btn) {
  const tfId = btn.dataset.tfId;
  const kind = btn.dataset.kind;
  const req = TaskForceRecordStore.listCommitteeRequests().find(r => r.id === tfId);
  try {
    const act = await createTaskforceVoteActivity({ taskforceId: tfId, kind, note: req ? req.note : '' });
    showToast('success', `已排入支委会表决：「${act.title}」，委员将收到通知`);
    renderContent();
  } catch (e) {
    console.error('[todo] 排入表决失败：', e);
    showToast('error', `排入表决失败：${e.message || e}`);
  }
}

/** 3.2-4：查看表决结果（fetchVotes→evaluateCommitteeVote 判定），弹确认框后按结论生效 */
async function _openTfDecisionModal(req, activityId) {
  const roster = resolveVoterIds('committee');
  let votes;
  try {
    votes = await fetchVotes(activityId);
  } catch (e) {
    showToast('error', `获取表态失败：${e.message || e}`);
    return;
  }
  const outcome = TaskForceRecordStore.evaluateCommitteeVote({
    roster,
    votes: (votes || []).map(v => ({ personId: v.personId, position: v.position })),
  });
  const { status, tally, needed } = outcome;
  const kindLabel = req.kind === 'dissolve' ? '解散' : '发起';
  const sumLine = `出席 ${tally.voted}/${needed}（应到 ${tally.total}）· 同意 ${tally.agree} · 异议/反对 ${tally.object}${tally.comment ? ' · 附言 ' + tally.comment : ''}`;
  const conclusion = status === 'pending'
    ? '表决未达门槛/尚未截止'
    : (status === 'passed' ? '已通过' : '未通过（有异议/反对）');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:var(--radius-lg);padding:20px 22px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';
  card.innerHTML = `
    <p class="font-bold text-sm text-gray-800 mb-1">专班${kindLabel}表决结果「${req.name || '未命名专班'}」</p>
    <p class="text-xs text-gray-500 mb-3">表决活动：线上支委会（${kindLabel}专班议案）</p>
    <div class="rounded-lg bg-gray-50 p-3 mb-3 text-xs space-y-1.5">
      <p class="text-gray-700">${sumLine}</p>
      <p class="font-medium ${status === 'passed' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-amber-600'}">结论：${conclusion}</p>
      ${status === 'pending'
        ? '<p class="text-gray-400">判据（R2-3）：应到严格超过 2/3 出席且无反对（弃权允许）。未达标请等待委员表态/截止后再查看。</p>'
        : '<p class="text-gray-400">确认后按此结论生效：' + (status === 'passed'
            ? (req.kind === 'initiate' ? '专班转为招募中' : '专班解散（解散留痕）')
            : (req.kind === 'initiate' ? '退回草稿（可修改后重新报送）' : '专班继续运行')) + '。</p>'}
    </div>
    ${status === 'pending'
      ? '<button type="button" class="tf-modal-close text-xs text-white px-3 py-1.5 rounded-lg w-full transition-colors" style="background:#6366F1;">知道了</button>'
      : `<div style="display:flex;gap:12px;justify-content:flex-end;">
          <button type="button" class="tf-modal-close text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
          <button type="button" id="tf-decision-apply" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="background:#CE1126;">按表决结果生效</button>
        </div>`}
  `;
  const close = () => overlay.remove();
  card.querySelectorAll('.tf-modal-close').forEach(b => b.addEventListener('click', close));
  card.querySelector('#tf-decision-apply')?.addEventListener('click', () => {
    const decision = outcome.status === 'passed' ? 'approved' : 'rejected';
    const updated = TaskForceRecordStore.applyCommitteeDecision(req.id, {
      decision,
      outcome,
      by: 'secretary',
      note: '线上支委会表决结论已生效',
      decisionRef: activityId,
    });
    close();
    if (!updated) { showToast('error', '生效失败：该报送已处理或已失效'); renderContent(); return; }
    const base = `专班「${req.name || '未命名专班'}」`;
    if (req.kind === 'initiate') {
      showToast('success', decision === 'approved' ? `${base}发起表决通过，已转为招募中` : `${base}发起表决未通过，已退回草稿（可修改后重新报送）`);
    } else {
      showToast('success', decision === 'approved' ? `${base}解散表决通过，专班已解散` : `${base}解散表决未通过，专班继续运行`);
    }
    renderContent();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
