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
import { getPersonById } from '../../../mock/index.js?v=20260903c';
import { getAccentColors, resolveAccentRole, solidAccentStyle } from '../../../core/constants.js?v=20260903c';
import { IssueStore } from '../../../services/issues.js?v=20260903c';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260903c';
import { openFormModal } from '../../../components/modal.js?v=20260903c';
import { renderReportInboxHtml, bindReportInbox } from '../../../components/reporting.js?v=20260903c';
import { renderMemberChangePanel } from '../../../components/member-change-panel.js?v=20260903c';

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
  const seedAggs = TodoStore.getGroupedByAction('secretary');
  _allAggregates = [...computedAggs, ...seedAggs];

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

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="space-y-4">
          <div id="secretary-member-change-panel"></div>
          ${inboxHtml}
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
  // 通知阅读待办（T-234 F1）：直达通知详情页（聚合时取首条 noticeId）
  const firstNotice = (todo.items && todo.items[0]) || todo;
  if (firstNotice.sourceType === 'notice' && (firstNotice.actionData?.noticeId || todo.actionData?.noticeId)) {
    const noticeId = firstNotice.actionData?.noticeId || todo.actionData?.noticeId;
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${noticeId}`;
    return;
  }
  // 报名审核待办（T233）：直达活动/专班详情页（多源聚合时取首条 sourceId）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && ((todo.actionData && todo.actionData.signupId) || (todo.items || []).some(i => i.actionData && i.actionData.signupId)))) {
    const first = (todo.items && todo.items[0]) || todo;
    const srcId = first.sourceId || (first.actionData && first.actionData.sourceId);
    if (srcId) {
      const base = window.location.pathname.includes('/workspace/') ? '../' : '';
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${base}${page}?id=${srcId}`;
      return;
    }
  }
  // T-304 C3 专班发起审批：组织委员发起专班 → 书记批准/驳回（写专班记录 + 销待办）
  if (todo.actionKey === 'taskforce-approval') {
    const first = (todo.items && todo.items[0]) || todo;
    const tfId = first.actionData?.taskforceId || first.sourceId || '';
    const tf = tfId ? TaskForceRecordStore.getAll().find(t => t.id === tfId) : null;
    if (!tf) { showToast('error', '专班不存在或已变更'); return; }
    openFormModal({
      id: 'tf-approve',
      title: `审批专班发起「${tf.name || '未命名'}` + '」',
      fields: [
        { key: 'decision', label: '审批意见', type: 'select', required: true, options: [
          { value: 'approved', label: '批准发起' },
          { value: 'rejected', label: '驳回' },
        ]},
        { key: 'note', label: '审批说明', type: 'textarea', required: false, placeholder: '如：同意，注意按期完成并按时报送考察' },
      ],
      onSubmit: (values) => {
        const updated = TaskForceRecordStore.update(tfId, {
          approvalStatus: values.decision,
          approvedBy: 'secretary',
          approvedAt: new Date().toISOString(),
          approvalNote: values.note || '',
        });
        if (!updated) { showToast('error', '专班不存在或已变更'); return; }
        // 销审批待办（聚合卡取首条 id；单条直接 complete）
        if (first.id) TodoStore.complete(first.id);
        showToast('success', values.decision === 'approved' ? `专班「${tf.name}」已批准发起` : `专班「${tf.name}」发起已驳回`);
        renderContent();
      },
      accentColor: accent,
    });
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
