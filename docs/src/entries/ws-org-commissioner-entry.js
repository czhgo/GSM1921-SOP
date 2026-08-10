import { getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260808m';
import { BranchService } from '../services/runtime.js?v=20260808m';
import { showToast, flashHighlight } from '../core/utils.js?v=20260808m';
import { CrossPageState } from '../core/cross-page-state.js?v=20260808m';
import { AuthStore } from '../services/auth.js?v=20260808m';
import { bootstrapPage } from '../core/bootstrap.js?v=20260808m';
import { solidAccentStyle } from '../core/constants.js?v=20260808m';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260808m';
import { PersonPicker } from '../components/person-picker.js?v=20260808m';
import { _personName, PEOPLE, inspectionToLong, getPersonById, getPersonName } from '../mock/index.js?v=20260808m';
import { mockDB, SourceType, ParticipationLevel } from '../core/domain.js?v=20260808m';
import { persist } from '../core/data-adapter.js?v=20260808m';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260808m';
import { renderTabBar } from '../components/tab-bar.js?v=20260808m';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260808m';
import { renderWorkOverview } from '../components/work-overview.js?v=20260808m';
import { renderQueryView } from '../components/query-view.js?v=20260808m';
import { loadInspectionRecords, saveInspectionRecords } from '../services/inspection.js?v=20260808m';
import { loadActivities } from '../services/activity.js?v=20260808m';
import { icon } from '../core/icons.js?v=20260808m';
import { renderMyDispatchTab, bindMyDispatchEvents } from '../services/issues.js?v=20260808m';
import { renderTodoList } from '../components/todo-list.js?v=20260808m';
import { TodoStore, TodoSourceType, seedTodos } from '../services/todo.js?v=20260808m';
import { NoticeStore } from '../services/notice.js?v=20260808m';
import { SignupStore, resolveSignupReviewer, SignupStatus } from '../services/signup.js?v=20260808m';
import { badgeHtml } from '../components/badge.js?v=20260808m';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'org-commissioner' });

let _orgNavTarget = null; // { tfId, actId, view } URL 导航目标（跨重渲染保持，定位完成后清除）
// "有待办必见待办"一次性消费标志（书记 2026-08-10 裁定）
let _todoPriorityConsumed = false;
let _orgHighlightActId = null; // 活动查看高亮目标（快照变量：导航目标清除后仍供懒加载渲染读取）

// ════════════════════════════════════════════════════════════════
//  发展党员追踪 — Mock 数据
// ════════════════════════════════════════════════════════════════

const STAGE_ORDER = ['积极分子', '发展对象', '预备党员', '正式党员'];

const STAGE_COLOR = {
  '积极分子':   { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: '#06B6D4' },
  '发展对象':   { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#F59E0B' },
  '预备党员':   { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#3B82F6' },
  '正式党员':   { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' },
};

// 发展党员追踪 — 数据源：PEOPLE（唯一人员数据源）+ 考察记录 + 推进覆盖档案
// 2026-08-01 重构：废弃硬编码名单（原 6 条模拟字段），从 PEOPLE 派生所有非正式党员
// （积极分子/发展对象/预备党员），与人员库全系统同源一致。
const DEV_STAGE_OVERRIDES_KEY = 'gsm1921-dev-stage-overrides';

function _loadDevOverrides() {
  try { return JSON.parse(localStorage.getItem(DEV_STAGE_OVERRIDES_KEY) || '{}'); } catch { return {}; }
}

function _saveDevOverrides(overrides) {
  try { localStorage.setItem(DEV_STAGE_OVERRIDES_KEY, JSON.stringify(overrides)); } catch {}
}

/** 从唯一人员数据源派生发展党员候选人列表 */
function _buildCandidates() {
  const overrides = _loadDevOverrides();
  const allInspections = loadInspectionRecords();
  return PEOPLE
    .filter(p => p.developStage && p.developStage !== '正式党员')
    .map(p => {
      const ov = overrides[p.id] || {};
      const inspCount = allInspections.filter(r => r.personId === p.id).length;
      return {
        id: `dc_${p.id}`,
        personId: p.id,
        name: p.name,
        partyGroup: p.partyGroup || '',
        stage: ov.stage || p.developStage,
        entryDate: ov.entryDate || '2026-01-01',
        inspCount,
        note: ov.note || (inspCount > 0 ? `已参与 ${inspCount} 次考察记录` : '培养考察中'),
      };
    });
}

function renderOrgUI(state) {
  let activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    activities = allActivities.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('org-content');
  if (!container) return;

  const taskforces = TaskForceRecordStore.getAll();
  // T223 排序统一：专班各状态栏内按 createdAt 降序（新者在前）
  const sortTfByNew = (arr) => [...arr].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const pending = sortTfByNew(taskforces.filter(t => t.status === 'draft' || t.status === 'pending_review'));
  const recruiting = sortTfByNew(taskforces.filter(t => t.status === 'recruiting'));
  const active = sortTfByNew(taskforces.filter(t => t.status === 'active'));

  // 有待办必见待办（书记 2026-08-10 裁定）：仅首次渲染生效
  let priorityTab;
  if (!_todoPriorityConsumed) {
    _todoPriorityConsumed = true;
    priorityTab = TodoStore.getGroupedByAction('org-commissioner').length > 0 ? 'todo' : undefined;
  }

  const tabBar = renderTabBar({
    prefix: 'org',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
      { id: 'overview', label: '工作概况', render: () => { const el = document.getElementById('org-tab-content'); if (el) return renderWorkOverview(el, { role: 'org-commissioner', personId: AuthStore.getCurrentUser()?.personId || 'p11', accent, prefix: 'org' }); }, groupLabel: '工作台' },
      { id: 'inspection', label: '考察上传', render: () => _renderOrgInspectionContent(), groupLabel: '党建' },
      { id: 'taskforce', label: '专班管理', render: (ctx) => _renderTaskforceContent(ctx.pending, ctx.recruiting, ctx.active, ctx.activities) },
      // 活动查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增；组织无活动 tab 由本组件承载）
      { id: 'activity-view', label: '活动查看', render: () => { const el = document.getElementById('org-tab-content'); if (el) return import('../components/activity-view.js?v=20260808m').then(m => m.renderActivityView(el, { highlightId: _orgNavTarget?.actId || null, onLocated: () => { _orgNavTarget = null; } })); }, groupLabel: '党建' },
      { id: 'talent', label: '人才库', render: () => _renderTalentContent() },
      { id: 'development', label: '发展数据', render: () => _renderDevelopmentContent(), groupLabel: '党建' },
      { id: 'my-dispatch', label: '我的处置', render: () => { const el = document.getElementById('org-tab-content'); if (el) { el.innerHTML = renderMyDispatchTab('org-commissioner', 'u_org'); bindMyDispatchEvents(el, 'org-commissioner', 'u_org'); } }, groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    extraRightHtml: '<button id="btn-publish-tf" style="background:' + accent + ';color:white;border:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;cursor:pointer;transition:opacity 0.15s;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">发布招募</button>' + renderReportEntryHtml({ accent, accentRgba }),
    renderCtx: { pending, recruiting, active, activities },
    storageKey: 'workflowos_tab_org',
    defaultTab: 'todo',
    priorityTab,
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  bindReportEntry(container);
  container.querySelector('#btn-publish-tf')?.addEventListener('click', () => _openRecruitForm());

  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  // 目标保持到定位完成（loadWorkspaceData 双 setState 会重渲染），提取后立即清除 URL 参数。
  if (!_orgNavTarget) {
    const urlParams = CrossPageState.getURLParams();
    const tfId = urlParams.taskforceId;
    const actId = urlParams.activityId;
    if (tfId || actId || urlParams.view === 'activities') {
      _orgNavTarget = { tfId, actId, view: urlParams.view === 'activities' };
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('taskforceId');
      CrossPageState.clearParam('view');
    }
  }
  if (_orgNavTarget) {
    if (_orgNavTarget.actId || _orgNavTarget.view) {
      // 活动查看（组织无活动 tab，知情权组件承载）
      // 快照高亮目标后立即清除导航目标（防 setState 重渲染重复消费）；高亮改读 _orgHighlightActId。
      _orgHighlightActId = _orgNavTarget.actId;
      _orgNavTarget = null;
      tabBar.activate('activity-view');
      if (_orgHighlightActId) {
        // 2026-08-08 修复：activity-view 组件默认渲染当前月，URL 活动在旧月时日历无该条目 → 高亮无目标。
        // 消费 URL 活动时同步切到活动所在月份并打开详情。
        const act = (state.activities || []).find(a => a.id === _orgHighlightActId);
        setState({ displayMonth: act?.date?.slice(0, 7) || undefined, selectedActivityId: _orgHighlightActId });
      }
    } else if (_orgNavTarget.tfId) {
      tabBar.activate('taskforce');
      setTimeout(() => {
        const card = container.querySelector(`.tf-store-card[data-tf-id="${_orgNavTarget.tfId}"]`);
        if (card) {
          card.click(); // 展开详情
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(card);
        }
        _orgNavTarget = null; // 无论成败：最终 DOM 已稳定，清除导航目标
      }, 150);
    }
  } else {
    tabBar.activate(tabBar.activeTab);
  }
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;
let _todoAggregates = null;

function _renderTodoContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  _todoAggregates = TodoStore.getGroupedByAction('org-commissioner');
  const stats = TodoStore.getStatsByRole('org-commissioner');
  // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
  if (!_selectedTodoId && _todoAggregates.length > 0) {
    _selectedTodoId = _todoAggregates[0].groupKey;
  }
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'org',
    groupedAggregates: _todoAggregates,
    stats,
    accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.groupKey || todo.id;
      _renderTodoContent();
    },
    onActionTodo: (todo) => {
      _handleTodoAction(todo);
    },
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo) : `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">点击左侧待办查看详情</p>
      <p class="text-xs mt-1">或直接点击"去赋权/去审核"等按钮处理</p>
    </div>
  `;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="card rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-title-cn text-base font-semibold text-gray-800">我的待办</h3>
          </div>
          ${todoListHtml}
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 sticky top-20">
          <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">详情</h3>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  _bindTodoDetailEvents();
}

function _renderTodoDetail(todo) {
  // 聚合对象：概要 + 处理入口（明细在业务界面逐条处理）
  if (todo.groupKey) {
    return `
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${todo.count} 条待处理</span>
          ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
        ${todo.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.flow}</p>` : ''}
        ${todo.deadline ? `<div class="text-xs text-gray-500">最早截止：${todo.deadline}</div>` : ''}
        <div class="pt-3 border-t border-gray-100 flex gap-2">
          <button class="org-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};">去处理</button>
        </div>
      </div>
    `;
  }

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
        ${todo.actionType ? `<button class="org-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
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
      window.location.href = `${base}activity.html?id=${srcId}`;
      return;
    }
  }
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    authorize: 'taskforce',
    review: 'inspection',
    track: 'development',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.org-tab-btn[data-org-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达专班详情成员角色编辑（≤2 跳）
    if (todo.actionType === 'authorize' && todo.sourceId) {
      const tfCard = document.querySelector(`.tf-store-card[data-tf-id="${todo.sourceId}"]`);
      if (tfCard) tfCard.click();
    }
    const tabLabels = { authorize: '专班管理', review: '考察上传', track: '发展数据' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

function _bindTodoDetailEvents() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;
  container.querySelector('.org-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo);
  });
}

function _renderTaskforceContent(pending, recruiting, active, activities) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const statusLabel = { pending_review: '待审核', recruiting: '招募中', active: '运行中', completed: '已完结', archived: '已归档', draft: '草稿' };
  const statusColor = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', archived: '#6B7280', draft: '#6B7280' };

  // 获取已完结专班（含 completed 解散 / archived 归档），T223 新者在前
  const completed = TaskForceRecordStore.getAll()
    .filter(t => t.status === 'completed' || t.status === 'archived')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  container.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="org-tf-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
    </div>
    <div id="org-tf-kanban"></div>
    <div id="tf-detail-panel" class="hidden card rounded-xl p-5"></div>
    <div id="org-activity-progress" class="mt-4"></div>
  `;

  function renderKanban() {
    const kb = document.getElementById('org-tf-kanban');
    if (!kb) return;
    const q = (document.getElementById('org-tf-search')?.value || '').trim().toLowerCase();
    const fp = q ? pending.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : pending;
    const fr = q ? recruiting.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : recruiting;
    const fa = q ? active.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : active;
    const fc = q ? completed.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : completed;
    kb.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#6366F1;color:var(--accent-indigo);">待审核 (${fp.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fp.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待审核专班</p>' :
              fp.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#D97706;color:#D97706;">招募中 (${fr.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fr.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无招募中专班</p>' :
              fr.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#8B5CF6;color:var(--accent-org-commissioner-light);">运行中 (${fa.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fa.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无运行中专班</p>' :
              fa.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
      </div>
      ${fc.length > 0 ? `
      <details class="card rounded-xl p-0 overflow-hidden">
        <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none tf-section-head" style="--tint:#3B82F6;color:var(--accent-blue);">已完结 (${fc.length})</summary>
        <div class="p-3 space-y-3">
          ${fc.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
        </div>
      </details>` : ''}
    `;
    bindCardClicks();
    bindStatusButtons();
  }

  document.getElementById('org-tf-search')?.addEventListener('input', renderKanban);
  renderKanban();

  // ── 活动进度区块（原追踪看板内容融入） ──
  _renderActivityProgress(activities);

  // ── 招募状态流转按钮事件绑定（recruiting → active → archived） ──
  function bindStatusButtons() {
    // 启动专班：recruiting → active
    container.querySelectorAll('.tf-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'recruiting') return;
        const confirmed = window.confirm(`确认启动专班「${tf.name}」？启动后状态转为运行中。`);
        if (!confirmed) return;
        const updated = TaskForceRecordStore.updateStatus(tf.id, 'active');
        if (updated) {
          showToast('success', `专班「${tf.name}」已启动`);
          renderOrgUI(getAppState());
        } else {
          showToast('error', '启动失败，状态流转不合法');
        }
      });
    });
    // 归档专班：active → archived
    container.querySelectorAll('.tf-archive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'active') return;
        const confirmed = window.confirm(`确认归档专班「${tf.name}」？归档后专班转入已归档状态。`);
        if (!confirmed) return;
        const updated = TaskForceRecordStore.updateStatus(tf.id, 'archived');
        if (updated) {
          // 做事即销待办：归档专班 → 销「专班归档」待办
          TodoStore.completeBySource(TodoSourceType.TASKFORCE, tf.id);
          // 2026-08-08 归档闭环：专班归档 → 配套通知随之一并归档，退出工作区
          NoticeStore.archiveBySource('taskforce', tf.id);
          showToast('success', `专班「${tf.name}」已归档`);
          renderOrgUI(getAppState());
        } else {
          showToast('error', '归档失败，状态流转不合法');
        }
      });
    });
  }

  function bindCardClicks() {
    container.querySelectorAll('.tf-store-card').forEach(card => {
    card.addEventListener('click', () => {
      const tfId = card.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf) return;
      const panel = document.getElementById('tf-detail-panel');
      if (!panel) return;
      panel.classList.remove('hidden');
      const filled = tf.members.filter(m => m.personId).length;

      // ── 工作量汇总区域（运行中/已完结/已归档专班展示） ──
      let workSummaryHtml = '';
      if (tf.status === 'active' || tf.status === 'completed' || tf.status === 'archived') {
        const memberRows = tf.members.filter(m => m.personId).map(m => {
          const contribCount = (m.contributions || []).length;
          const contribList = (m.contributions || []).length > 0
            ? `<ul class="mt-1 space-y-0.5">${m.contributions.map(c =>
                `<li class="text-[12px] text-gray-400 pl-2">${typeof c === 'string' ? c : (c.description || c.title || JSON.stringify(c))}</li>`
              ).join('')}</ul>`
            : '<span class="text-[12px] text-gray-300 pl-2">暂无贡献记录</span>';
          return `
            <div class="py-2 border-b border-gray-50 last:border-b-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
                <div class="flex items-center gap-2">
                  ${badgeHtml(m.role || '深度参与者', 'neutral')}
                  <span class="text-xs text-gray-400">贡献 ${contribCount} 项</span>
                </div>
              </div>
              ${contribList}
            </div>`;
        }).join('');

        workSummaryHtml = `
          <div class="mt-4 pt-3 border-t border-gray-100">
            <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">工作量汇总</h5>
            ${tf.members.filter(m => m.personId).length === 0
              ? '<p class="text-xs text-gray-400">暂无成员</p>'
              : `<div class="rounded-lg px-3 py-1">${memberRows}</div>`
            }
          </div>`;

        // 仅运行中专班显示解散按钮
        if (tf.status === 'active') {
          workSummaryHtml += `
          <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button id="btn-dissolve-tf" class="btn-md btn-md-red">解散专班</button>
          </div>`;
        }
      }

      // ── 子记录区域（P3-4：专班挂载考察+材料2子记录） ──
      let subRecords = { ...mockDB.tfSubRecords };
      const tfSubs = subRecords[tfId] || { inspection: [], materials: [] };

      function saveTfSubs() {
        mockDB.tfSubRecords = { ...mockDB.tfSubRecords, [tfId]: tfSubs };
        persist();
      }

      function renderSubTable(type, items) {
        const label = type === 'inspection' ? '考察记录' : '材料记录';
        const color = type === 'inspection' ? '#D97706' : '#3B82F6';
        const fields = type === 'inspection'
          ? [{ key: 'person', label: '被考察人' }, { key: 'content', label: '考察内容' }, { key: 'result', label: '考察结论' }]
          : [{ key: 'name', label: '材料名称' }, { key: 'author', label: '提交人' }, { key: 'note', label: '备注' }];

        const rows = items.map((item, idx) => `
          <tr class="border-b border-gray-50">
            ${fields.map(f => `<td class="px-2 py-1.5 text-xs text-gray-700">${item[f.key] || '-'}</td>`).join('')}
            <td class="px-2 py-1.5 text-center"><button class="sub-del-btn text-xs text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <h5 class="text-xs font-bold font-title-cn" style="color:${color}">${label} (${items.length})</h5>
              <button class="sub-add-btn text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors" style="color:${color};border-color:${color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[12px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${fields.map(f => `<th class="px-2 py-1 text-xs font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-xs font-medium text-gray-500 w-12"></th>
                </tr></thead><tbody>${rows}</tbody></table>`
            }
          </div>`;
      }

      const subRecordsHtml = `
        <div class="mt-4 pt-3 border-t border-gray-100">
          <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">子记录</h5>
          ${renderSubTable('inspection', tfSubs.inspection)}
          ${renderSubTable('materials', tfSubs.materials)}
        </div>`;

      // ── T233 报名区（招募中专班：名额 x/y + 名单 + 审核 + 报名入口） ──
      const currentUserId = AuthStore.getCurrentUser()?.personId || '';
      const tfSignups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tfId);
      const tfReviewerId = resolveSignupReviewer('taskforce', tfId);
      const isTfReviewer = !!currentUserId && tfReviewerId === currentUserId;
      const approvedSignups = tfSignups.filter(s => s.status === SignupStatus.APPROVED);
      const pendingSignups = tfSignups.filter(s => s.status === SignupStatus.PENDING);
      const rejectedSignups = tfSignups.filter(s => s.status === SignupStatus.REJECTED);
      const cancelledSignups = tfSignups.filter(s => s.status === SignupStatus.CANCELLED);
      const tfToday = new Date().toISOString().slice(0, 10);
      const tfOpen = tf.status === 'recruiting' &&
        (!tf.deadline || tf.deadline >= tfToday) &&
        (!tf.capacity || filled < tf.capacity);
      const myApplied = tfSignups.some(s => s.personId === currentUserId &&
        (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING));
      const otherSignupTxt = [
        ...rejectedSignups.map(s => `${_personName(s.personId)}（已拒绝）`),
        ...cancelledSignups.map(s => `${_personName(s.personId)}（已取消）`),
      ].join('、');
      let signupSectionHtml = '';
      if (tf.status === 'recruiting' || tf.status === 'active') {
        const signupRows = approvedSignups.map(s => `
          <div class="flex items-center gap-2 py-1.5">
            <span class="text-xs font-medium text-gray-700">${_personName(s.personId)}</span>
            <span class="text-[11px] text-gray-400">${s.role === 'participant' ? '普通参与' : s.role === 'organizer' ? '组织者' : '深度参与'}</span>
            ${s.note ? `<span class="text-[11px] text-gray-400 truncate max-w-[120px]">${s.note}</span>` : ''}
            ${badgeHtml('已通过', 'success')}
          </div>`).join('');
        const pendingRows = isTfReviewer && pendingSignups.length > 0 ? pendingSignups.map(s => `
          <div class="flex items-center gap-2 py-1.5">
            <span class="text-xs font-medium text-gray-700">${_personName(s.personId)}</span>
            <span class="text-[11px] text-gray-400">${s.role === 'participant' ? '普通参与' : s.role === 'organizer' ? '组织者' : '深度参与'}</span>
            ${s.note ? `<span class="text-[11px] text-gray-400 truncate max-w-[120px]">${s.note}</span>` : ''}
            <span class="ml-auto flex items-center gap-1.5">
              <button class="tf-signup-review-btn text-[11px] px-2.5 py-1 rounded-lg text-white hover:opacity-90 transition-colors" data-signup-id="${s.id}" data-approve="1" style="background:#10B981;">通过</button>
              <button class="tf-signup-review-btn text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors" data-signup-id="${s.id}" data-approve="0">拒绝</button>
            </span>
          </div>`).join('') : '';
        const applyBtn = tfOpen && currentUserId && !myApplied
          ? `<button id="tf-signup-apply-btn" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};">报名加入</button>`
          : '';
        signupSectionHtml = `
          <div class="mt-4 pt-3 border-t border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <h6 class="font-title-cn text-xs font-bold text-gray-600">报名名单（${approvedSignups.length}）<span class="text-gray-300 font-normal">· 名额 ${filled}/${tf.capacity}</span></h6>
              ${applyBtn}
            </div>
            ${approvedSignups.length === 0 && !pendingRows
              ? '<p class="text-[12px] text-gray-300 pl-2">暂无报名</p>'
              : `<div>${signupRows}${pendingRows}</div>`}
            ${otherSignupTxt ? `<p class="text-[11px] text-gray-300 mt-1">${otherSignupTxt}</p>` : ''}
          </div>`;
      }

      panel.innerHTML = `
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">${tf.name}</h3>
        <p class="text-xs text-gray-500 mb-2">${tf.task}</p>
        <div class="flex gap-4 text-xs text-gray-400 mb-3">
          <span>${filled}/${tf.capacity}</span>
          ${tf.deadline ? `<span>${tf.deadline}</span>` : ''}
          <span>发起: ${_personName(tf.initiator)}</span>
        </div>
        <div class="text-xs text-gray-500">成员：${tf.members.map(m => _personName(m.personId)).join('、')}</div>

        <!-- T-190 成员角色内联编辑：主源 members 预填，保存走 syncProjectRoles 三合一 -->
        <div class="mt-4 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <h6 class="font-title-cn text-xs font-bold text-gray-600">成员角色</h6>
            <button id="btn-save-tf-roles" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};">保存角色</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-[12px] text-gray-400 mb-1">组织者</div>
              <div id="tf-org-picker"></div>
            </div>
            <div>
              <div class="text-[12px] text-gray-400 mb-1">深度参与者</div>
              <div id="tf-deep-picker"></div>
            </div>
          </div>
          <p class="text-[12px] text-gray-400 mt-2">提示：此处修改将同步写入专班主源数据，被赋权人将收到通知。</p>
        </div>

        ${workSummaryHtml}
        ${signupSectionHtml}
        ${subRecordsHtml}
      `;

      // 初始化成员角色 PersonPicker（预填主源 members）
      if (_tfOrgPicker) { _tfOrgPicker.destroy(); _tfOrgPicker = null; }
      if (_tfDeepPicker) { _tfDeepPicker.destroy(); _tfDeepPicker = null; }
      const tfOrgEl = panel.querySelector('#tf-org-picker');
      const tfDeepEl = panel.querySelector('#tf-deep-picker');
      const tfAssigns = Array.isArray(tf.members) ? tf.members.filter(m => m.personId) : [];
      if (tfOrgEl) {
        _tfOrgPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择组织者',
          accentColor: accent,
          initialIds: tfAssigns.filter(m => m.role === 'organizer').map(m => m.personId),
          onSelect: () => {},
        });
        _tfOrgPicker.render(tfOrgEl);
      }
      if (tfDeepEl) {
        _tfDeepPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择深度参与者',
          accentColor: accent,
          initialIds: tfAssigns.filter(m => m.role === 'deep').map(m => m.personId),
          onSelect: () => {},
        });
        _tfDeepPicker.render(tfDeepEl);
      }

      // 保存成员角色：syncProjectRoles 三合一
      panel.querySelector('#btn-save-tf-roles')?.addEventListener('click', async () => {
        const orgIds = _tfOrgPicker ? _tfOrgPicker.getSelected() : [];
        const deepIds = _tfDeepPicker ? _tfDeepPicker.getSelected() : [];
        const newAssignments = [
          ...orgIds.map(personId => ({ personId, role: 'organizer' })),
          ...deepIds.map(personId => ({ personId, role: 'deep' })),
        ];
        const actorId = AuthStore.getCurrentUser()?.personId;
        const { added, removed } = await AuthStore.syncProjectRoles({ scopeRef: tf.id, assignments: newAssignments, actorId });
        // 做事即销待办：保存成员角色 → 销组织委员「专班赋权」待办
        TodoStore.completeBySource(TodoSourceType.TASKFORCE, tf.id);
        if (added > 0 || removed > 0) {
          showToast('success', `专班成员角色已更新：新增 ${added} 人，移除 ${removed} 人`);
        } else {
          showToast('info', '专班成员角色未发生变化');
        }
        renderOrgUI(getAppState());
      });

      // ── 解散专班按钮事件 ──
      const dissolveBtn = panel.querySelector('#btn-dissolve-tf');
      if (dissolveBtn) {
        dissolveBtn.addEventListener('click', () => _dissolveTaskforce(tf));
      }

      // ── T233 报名区事件：报名加入 + 审核（通过/拒绝） ──
      panel.querySelector('#tf-signup-apply-btn')?.addEventListener('click', () => {
        const res = SignupStore.apply({ sourceType: 'taskforce', sourceId: tfId, personId: currentUserId, role: 'participant', note: '' });
        if (!res.ok) { showToast('error', res.reason || '报名失败'); return; }
        showToast('success', '报名成功，已加入专班名单');
        renderOrgUI(getAppState());
      });
      panel.querySelectorAll('.tf-signup-review-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const res = await SignupStore.review(btn.dataset.signupId, { approve: btn.dataset.approve === '1', reviewer: currentUserId });
          if (!res.ok) { showToast('error', res.reason || '操作失败'); return; }
          showToast('success', btn.dataset.approve === '1' ? '已通过该报名' : '已拒绝该报名');
          renderOrgUI(getAppState());
        });
      });

      // ── 子记录添加/删除事件（P3-4）— 内联表单替代 prompt，考察同步正式考察库 ──
      panel.querySelectorAll('.sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const panelEl = btn.closest('.mt-3');
          const existing = panelEl?.querySelector('.sub-inline-form');
          if (existing) { existing.remove(); return; }

          const resultOpts = ['考察合格', '待观察', '需补材料'];
          let formHtml = '';
          if (type === 'inspection') {
            formHtml = `
              <div class="sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加考察记录（同步正式考察库，待纪检委员确认）</div>
                <div class="mb-2 sub-picker"></div>
                <textarea class="f-content input-flat text-xs w-full resize-none mb-2" rows="2" placeholder="考察内容描述（必填）"></textarea>
                <select class="f-result input-flat text-xs w-full mb-2">${resultOpts.map(r => `<option>${r}</option>`).join('')}</select>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">保存</button>
                </div>
              </div>`;
          } else {
            formHtml = `
              <div class="sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加材料记录</div>
                <input class="f-name input-flat text-xs w-full mb-2" placeholder="材料名称（必填）">
                <input class="f-author input-flat text-xs w-full mb-2" placeholder="提交人（选填）">
                <input class="f-note input-flat text-xs w-full mb-2" placeholder="备注（选填）">
                <div class="flex gap-2 justify-end">
                  <button type="button" class="sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">保存</button>
                </div>
              </div>`;
          }

          panelEl.insertAdjacentHTML('beforeend', formHtml);
          const form = panelEl.querySelector('.sub-inline-form');

          if (type === 'inspection') {
            const picker = new PersonPicker({ mode: 'multi', placeholder: '选择被考察人', accentColor: accent, onSelect: () => {} });
            picker.render(form.querySelector('.sub-picker'));
            form._picker = picker;
          }

          form.querySelector('.sub-cancel-btn').addEventListener('click', () => {
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
          });

          form.querySelector('.sub-save-btn').addEventListener('click', () => {
            if (type === 'inspection') {
              const content = form.querySelector('.f-content').value.trim();
              if (!content) { showToast('error', '请填写考察内容'); return; }
              const ids = form._picker ? form._picker.getSelected() : [];
              if (ids.length === 0) { showToast('error', '请选择被考察人'); return; }
              const result = form.querySelector('.f-result').value;
              const newRecords = [];
              ids.forEach(pid => {
                tfSubs.inspection.push({ person: getPersonName(pid), personId: pid, content, result });
                // P1-5 语义修复：考察内容入 content，role 存角色职责标签
                newRecords.push({
                  id: 'insp_' + Date.now() + '_' + pid,
                  sourceType: SourceType.TASKFORCE, activityId: null, sourceName: tf.name,
                  personId: pid, level: ParticipationLevel.DEEP_PARTICIPATE,
                  content, role: '深度参与者',
                  recordedBy: 'u_exec', recordedAt: new Date().toISOString(), status: 'pending',
                });
              });
              const all = loadInspectionRecords();
              saveInspectionRecords([...all, ...newRecords]);
              showToast('success', `已添加 ${ids.length} 条考察记录并同步正式考察库`);
            } else {
              const name = form.querySelector('.f-name').value.trim();
              if (!name) { showToast('error', '请填写材料名称'); return; }
              tfSubs.materials.push({
                name,
                author: form.querySelector('.f-author').value.trim(),
                note: form.querySelector('.f-note').value.trim(),
              });
              showToast('success', '已添加');
            }
            saveTfSubs();
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
            // 重新渲染详情面板
            card.click();
          });
        });
      });

      panel.querySelectorAll('.sub-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          tfSubs[type].splice(idx, 1);
          saveTfSubs();
          // 重新渲染详情面板
          card.click();
        });
      });
    });
  });
  }
}

// ════════════════════════════════════════════════════════════════
//  专班解散流程（P1-5）
// ════════════════════════════════════════════════════════════════

function _showDissolveBlockModal(tf, missing) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:var(--radius-lg);padding:20px 22px;max-width:360px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';
  card.innerHTML =
    `<p class="font-bold text-sm text-gray-800 mb-1">无法解散「${tf.name}」</p>`
    + '<p class="text-xs text-gray-500 mb-3">以下产出未齐，补齐后方可解散：</p>'
    + '<ul class="space-y-1.5 mb-4">'
    + missing.map(m =>
        `<li class="text-xs text-red-600 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>${m}</li>`
      ).join('')
    + '</ul>'
    + '<button class="text-xs text-white px-3 py-1.5 rounded-lg w-full transition-colors" style="background:#CE1126;">知道了</button>';
  card.querySelector('button').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

async function _dissolveTaskforce(tf) {
  if (!tf || tf.status !== 'active') return;

  // T-224 §7 专班关闭条件：考察确认 + 工作量报告；产出缺失阻塞解散，缺失项明确显示
  const tfInspections = loadInspectionRecords().filter(r => r.sourceType === SourceType.TASKFORCE && r.sourceName === tf.name);
  const inspPending = tfInspections.filter(r => r.status !== 'confirmed').length;
  const hasWorkload = (tf.members || []).some(m => (m.contributions || []).length > 0);
  const missing = [];
  if (tfInspections.length === 0) missing.push('专班考察记录（尚未上传考察）');
  else if (inspPending > 0) missing.push(`考察确认（${inspPending} 条待纪检确认）`);
  if (!hasWorkload) missing.push('工作量报告（成员无产出记录）');

  if (missing.length > 0) {
    _showDissolveBlockModal(tf, missing);
    return;
  }

  const confirmed = window.confirm(`确定解散专班「${tf.name}」？解散后将自动生成工作量汇总报告并回收所有相关赋权记录。`);
  if (!confirmed) return;

  // 1. 主源：清空 members（含角色）并置状态 completed
  const assignedMembers = (tf.members || []).filter(m => m.personId && (m.role === 'organizer' || m.role === 'deep'));
  const updated = TaskForceRecordStore.update(tf.id, { status: 'completed', members: [] });
  if (!updated) {
    showToast('error', '解散失败：专班记录未找到');
    return;
  }

  // 2. 审计快照：为原 organizer/deep 成员追加 revoke 记录（只增不改）
  const actorId = AuthStore.getCurrentUser()?.personId;
  const revokedCount = AuthStore.recordProjectRevokes(
    tf.id,
    assignedMembers.map(m => ({ personId: m.personId, role: m.role })),
    actorId
  );

  // 3. toast 反馈
  const revokeMsg = revokedCount > 0
    ? `，已回收 ${revokedCount} 条赋权记录`
    : '';
  showToast('success', `专班「${tf.name}」已解散${revokeMsg}`);

  // 4. 刷新看板
  renderOrgUI(getAppState());
}

function _renderTfCard(t, statusLabel, statusColor) {
  const filled = t.members.filter(m => m.personId).length;
  const color = statusColor[t.status] || '#6B7280';
  // 招募状态流转按钮：recruiting → active → archived
  let statusBtn = '';
  if (t.status === 'recruiting') {
    statusBtn = `<button class="tf-start-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">启动专班</button>`;
  } else if (t.status === 'active') {
    statusBtn = `<button class="tf-archive-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">归档专班</button>`;
  }
  return `
    <div class="kanban-card p-4 rounded-xl bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="badge" style="background:${color}15;color:${color};">${statusLabel[t.status] || t.status}</span>
      </div>
      <p class="text-xs text-gray-500 mb-2 line-clamp-2">${t.task}</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>${filled}/${t.capacity}</span>
        ${t.deadline ? `<span>${t.deadline}</span>` : ''}
      </div>
      ${statusBtn}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  发布招募表单面板
// ════════════════════════════════════════════════════════════════

let _recruitPersonPicker = null;
let _tfOrgPicker = null;    // 专班详情：组织者多选
let _tfDeepPicker = null;   // 专班详情：深度参与者多选

function _openRecruitForm() {
  // 移除已有面板
  _closeRecruitForm();

  const overlay = document.createElement('div');
  overlay.id = 'recruit-form-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeRecruitForm();
  });

  const panel = document.createElement('div');
  panel.className = 'card rounded-xl';
  panel.style.cssText = 'width:560px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto;padding:24px;position:relative;';
  // 统一表单基建（2026-08-05 书记裁决「统一表单基建」）：与「写入活动」表单对齐
  // input-flat / text-xs 标签 / 红色必填星号 / 同规格按钮
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h3 class="font-title-cn text-sm font-semibold text-gray-800">发布专班招募</h3>
      <button id="recruit-form-close" type="button" style="width:32px;height:32px;border-radius:var(--radius-sm);border:none;background:var(--neutral-100);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">
        ${icon('close', { stroke: 'var(--neutral-500)', className: 'w-3.5 h-3.5' })}
      </button>
    </div>

    <form id="recruit-form" autocomplete="off">
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">专班名称 <span class="text-red-500">*</span></label>
        <input type="text" id="rf-name" required placeholder="如：宣传专班（第三期）" class="input-flat w-full">
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">任务描述 <span class="text-red-500">*</span></label>
        <textarea id="rf-task" required rows="3" placeholder="描述专班的核心任务与目标" class="input-flat w-full"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">所需人数 <span class="text-red-500">*</span></label>
          <input type="number" id="rf-capacity" required min="1" max="50" placeholder="如：5" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">截止日期 <span class="text-red-500">*</span></label>
          <input type="date" id="rf-deadline" required class="input-flat w-full">
        </div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">技能要求 <span class="text-gray-300">（选填）</span></label>
        <input type="text" id="rf-skills" placeholder="如：视频剪辑、文案撰写" class="input-flat w-full">
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">周期起始 <span class="text-gray-300">（选填）</span></label>
          <input type="date" id="rf-period-start" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">周期结束 <span class="text-gray-300">（选填）</span></label>
          <input type="date" id="rf-period-end" class="input-flat w-full">
        </div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">初始成员 <span class="text-gray-300">（选填）</span></label>
        <div id="rf-members-picker"></div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">说明 <span class="text-gray-300">（选填）</span></label>
        <textarea id="rf-notes" rows="2" placeholder="补充说明" class="input-flat w-full"></textarea>
      </div>

      <div class="mb-4">
        <div class="wp-collapse-toggle text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none" onclick="this.nextElementSibling.classList.toggle('hidden')">自动发布通知（选填，发布专班后立即通知全体成员）</div>
        <div class="mt-2 space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题</label>
            <input type="text" id="rf-notice-title" class="input-flat w-full" placeholder="默认使用专班名称">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容</label>
            <textarea id="rf-notice-content" rows="3" class="input-flat w-full" placeholder="如：宣传专班（第三期）招募中，截止 8月20日，欢迎报名参与。"></textarea>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button type="button" id="recruit-form-cancel" class="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
        <button type="submit" class="text-sm px-4 py-[7px] rounded-lg text-white hover:opacity-90 transition-opacity font-medium" style="${solidAccentStyle(accent, accentBorder)};">发布</button>
      </div>
    </form>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 关闭按钮
  panel.querySelector('#recruit-form-close').addEventListener('click', () => _closeRecruitForm());
  panel.querySelector('#recruit-form-cancel').addEventListener('click', () => _closeRecruitForm());

  // 初始化 PersonPicker
  const pickerContainer = panel.querySelector('#rf-members-picker');
  _recruitPersonPicker = new PersonPicker({
    mode: 'multi',
    placeholder: '选择初始成员（选填）',
    accentColor: accent,
    onSelect: () => {},
  });
  _recruitPersonPicker.render(pickerContainer);

  // 表单提交
  panel.querySelector('#recruit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    _submitRecruitForm();
  });
}

function _closeRecruitForm() {
  if (_recruitPersonPicker) {
    _recruitPersonPicker.destroy();
    _recruitPersonPicker = null;
  }
  const overlay = document.getElementById('recruit-form-overlay');
  if (overlay) overlay.remove();
}

function _submitRecruitForm() {
  const name = document.getElementById('rf-name')?.value?.trim();
  const task = document.getElementById('rf-task')?.value?.trim();
  const capacity = parseInt(document.getElementById('rf-capacity')?.value, 10);
  const deadline = document.getElementById('rf-deadline')?.value || '';
  const skills = document.getElementById('rf-skills')?.value?.trim() || '';
  const periodStart = document.getElementById('rf-period-start')?.value || '';
  const periodEnd = document.getElementById('rf-period-end')?.value || '';
  const notes = document.getElementById('rf-notes')?.value?.trim() || '';

  // 预拟通知（选填，2026-08-05 书记裁决「表单内预拟通知·只跑一次」）
  const noticeTitle = document.getElementById('rf-notice-title')?.value?.trim();
  const noticeContent = document.getElementById('rf-notice-content')?.value?.trim();

  // 校验必填项
  if (!name) { showToast('error', '请填写专班名称'); return; }
  if (!task) { showToast('error', '请填写任务描述'); return; }
  if (!capacity || capacity < 1) { showToast('error', '请填写有效的所需人数'); return; }
  if (!deadline) { showToast('error', '请选择截止日期'); return; }

  // 获取初始成员（统一英文编码 role: 'deep'，T-190 修复 P1-2 中英文混用）
  const selectedIds = _recruitPersonPicker ? _recruitPersonPicker.getSelected() : [];
  const members = selectedIds.map(pid => ({
    personId: pid,
    role: 'deep',
    contributions: [],
  }));

  // 构建专班记录
  const record = {
    name,
    task,
    status: 'recruiting',
    manager: 'p11',
    initiator: 'p11',
    members,
    capacity,
    deadline,
    activityId: null, // T-190 修复：招募表单无活动关联字段，原 activityId 未声明抛 ReferenceError
    createdAt: new Date().toISOString().slice(0, 10),
  };

  // 附加可选字段
  if (skills) record.skills = skills;
  if (periodStart && periodEnd) record.period = `${periodStart} ~ ${periodEnd}`;
  if (notes) record.notes = notes;

  try {
    const created = TaskForceRecordStore.add(record);
    // 做事即销待办：专班创建即完成赋权 → 销组织委员「专班赋权」待办
    if (created) TodoStore.completeBySource(TodoSourceType.TASKFORCE, created.id);
    // T-190 同步赋权：追加审计快照 + 通知初始成员（主源已由招募写入，原则7 不重复填写）
    if (created && members.length > 0) {
      const actorId = AuthStore.getCurrentUser()?.personId;
      AuthStore.recordProjectGrants(created.id, members, actorId);
    }
    showToast('success', `专班「${name}」发布成功`);

    // 预拟通知「只跑一次」（2026-08-05）：仅在表单填写了标题时发布一条通知，
    // NoticeStore.add 单次调用，通知→待办仅派生一次，不重复发。
    if (noticeTitle) {
      NoticeStore.add({
        title: noticeTitle,
        content: noticeContent || `专班「${name}」招募中，截止 ${deadline}，欢迎报名参与。`,
        priority: 'normal',
        publishDate: new Date().toISOString().slice(0, 10),
        expireDate: deadline,
        targetModule: 'workspace',
        targetType: 'taskforce',
        targetId: created.id,
        read: false,
      });
      showToast('success', '已自动发布通知');
    }

    _closeRecruitForm();
    // 刷新看板
    renderOrgUI(getAppState());
  } catch (err) {
    console.error('[recruit-form] 创建专班失败：', err);
    showToast('error', '发布失败，请重试');
  }
}

// ── 活动进度区块（融入专班管理tab，原追踪看板） ──
function _renderActivityProgress(activities) {
  const progressEl = document.getElementById('org-activity-progress');
  if (!progressEl) return;

  const typeOptions = [...new Set(activities.map(a => a.type).filter(Boolean))].map(t => ({ value: t, label: t }));
  const queryData = activities.map(a => ({ ...a, archived: String(a.status === 'completed') }));

  progressEl.innerHTML = `
    <div class="card rounded-xl p-5">
      <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动进度</h3>
      <div class="text-xs text-gray-500 mb-3">追踪所有已发布活动的执行状态</div>
      <div id="org-activity-query"></div>
    </div>
  `;

  const queryContainer = document.getElementById('org-activity-query');
  if (!queryContainer) return;

  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索活动名称...',
    searchKey: 'title',
    filters: [
      { key: 'type', label: '活动类型', options: typeOptions },
      { key: 'archived', label: '状态', options: [
        { value: '', label: '全部' },
        { value: 'false', label: '进行中' },
        { value: 'true', label: '已归档' },
      ]},
    ],
    data: queryData,
    renderRow: (a) => {
      const isArchived = a.status === 'completed';
      const statusTag = isArchived
        ? badgeHtml('已归档', 'neutral')
        : badgeHtml('已发布', 'success');
      const completeBtn = !isArchived
        ? `<button class="track-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors" data-act-id="${a.id}">确认完成</button>`
        : '';
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white transition-colors">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium ${isArchived ? 'text-gray-500 line-through' : 'text-gray-800'}">${a.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${a.date || ''}${a.type ? ' · ' + a.type : ''}${a.location ? ' · ' + a.location : ''}</div>
          </div>
          <div class="flex items-center gap-2">
            ${statusTag}
            ${completeBtn}
          </div>
        </div>
      `;
    },
    emptyMessage: '无匹配活动',
    accentColor: accent,
    sortKey: 'date',
    sortDir: 'desc',
    pageSize: 10,      // 活动无上限增长 → 分页（2026-08-07）
    pageParam: 'opage',
  });

  // 绑定确认完成按钮
  queryContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.track-complete-btn');
    if (!btn) return;
    const actId = btn.dataset.actId;
    const activity = activities.find(a => a.id === actId);
    if (!activity) return;
    const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归档。`);
    if (!confirmed) return;
    BranchService.updateActivity(actId, { status: 'completed' });
    persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
    showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
    renderOrgUI(getAppState());
  });
}

// ── 发展数据 Tab（党建） ──

function _renderDevelopmentContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 当前筛选状态
  let _devFilter = 'all';

  function render() {
    const candidates = _buildCandidates();
    const filtered = _devFilter === 'all'
      ? candidates
      : candidates.filter(c => c.stage === _devFilter);

    // 阶段统计
    const stageCounts = {};
    for (const s of STAGE_ORDER) {
      stageCounts[s] = candidates.filter(c => c.stage === s).length;
    }

    // 管线概览条
    const pipelineHtml = STAGE_ORDER.map((s, idx) => {
      const sc = STAGE_COLOR[s];
      const count = stageCounts[s];
      const arrow = idx < STAGE_ORDER.length - 1
        ? `<span class="text-gray-300 mx-0.5">→</span>`
        : '';
      return `<span class="inline-flex items-center gap-1"><span style="width:8px;height:8px;border-radius:50%;background:${sc.dot};display:inline-block;"></span><span class="text-[12px] text-gray-600">${s}</span><span class="text-xs font-bold" style="color:${sc.dot};">${count}</span></span>${arrow}`;
    }).join('');

    // 筛选按钮
    const filterBtns = [
      { value: 'all', label: '全部' },
      ...STAGE_ORDER.map(s => ({ value: s, label: s })),
    ].map(f => {
      const isActive = _devFilter === f.value;
      const activeCls = isActive
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
      return `<button class="dev-filter-btn text-[12px] px-2.5 py-1 rounded-full border transition-colors ${activeCls}" data-filter="${f.value}">${f.label}</button>`;
    }).join('');

    // 候选人卡片
    const cardsHtml = filtered.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-8">当前筛选无候选人</p>'
      : filtered.map(c => {
          const sc = STAGE_COLOR[c.stage];
          const stageIdx = STAGE_ORDER.indexOf(c.stage);
          const isLast = stageIdx === STAGE_ORDER.length - 1;
          const nextStage = isLast ? null : STAGE_ORDER[stageIdx + 1];
          const advanceBtn = !isLast
            ? `<button class="dev-advance-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition-colors" data-candidate-id="${c.id}" data-next-stage="${nextStage}">推进至${nextStage}</button>`
            : `<span class="text-xs px-2.5 py-1 rounded-md bg-green-50 text-green-600 border border-green-200">已转正</span>`;

          // 进度条（当前阶段高亮）
          const progressDots = STAGE_ORDER.map((s, i) => {
            const dotColor = i <= stageIdx ? sc.dot : '#E5E7EB';
            const isCurrent = i === stageIdx;
            return `<span style="width:${isCurrent ? '10px' : '6px'};height:${isCurrent ? '10px' : '6px'};border-radius:50%;background:${dotColor};display:inline-block;transition:all 0.2s;"></span>`;
          }).join('<span style="width:12px;height:1.5px;background:#E5E7EB;display:inline-block;vertical-align:middle;"></span>');

          return `
            <div class="p-4 rounded-xl bg-white border border-gray-50 hover:shadow-sm transition-shadow">
              <div class="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div class="text-sm font-semibold text-gray-800">${c.name}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium">${c.stage}</span>
                    ${c.partyGroup ? `<span class="text-xs text-gray-400">${c.partyGroup}</span>` : ''}
                    <span class="text-xs text-gray-400">进入当前阶段：${c.entryDate}</span>
                    ${c.inspCount > 0 ? badgeHtml(`考察 ${c.inspCount}`, 'info') : ''}
                  </div>
                </div>
                ${advanceBtn}
              </div>
              <div class="flex items-center gap-0.5 mb-2">${progressDots}</div>
              <div class="text-[12px] text-gray-500">${c.note || ''}</div>
            </div>`;
        }).join('');

    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">发展数据</h3>
          <span class="text-xs text-gray-400">${candidates.length} 人</span>
        </div>
        <div class="text-xs text-gray-500 mb-4">从入党积极分子到正式党员的完整发展路径数据</div>
        <!-- 管线概览 -->
        <div class="flex items-center flex-wrap gap-1 mb-4 p-3 rounded-lg bg-gray-50">
          ${pipelineHtml}
        </div>
        <!-- 筛选栏 -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          ${filterBtns}
        </div>
        <!-- 候选人列表 -->
        <div class="space-y-3">
          ${cardsHtml}
        </div>
      </div>
    `;

    // 绑定筛选事件
    container.querySelectorAll('.dev-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _devFilter = btn.dataset.filter;
        render();
      });
    });

    // 绑定推进事件
    container.querySelectorAll('.dev-advance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const candidateId = btn.dataset.candidateId;
        const nextStage = btn.dataset.nextStage;
        const candidate = _buildCandidates().find(c => c.id === candidateId);
        if (!candidate) return;
        const confirmed = window.confirm(`确认将「${candidate.name}」从${candidate.stage}推进至${nextStage}？`);
        if (!confirmed) return;
        // 推进结果写入覆盖档案（人员库静态阶段 + 推进档案动态阶段 = 当前显示阶段）
        const overrides = _loadDevOverrides();
        overrides[candidate.personId] = {
          stage: nextStage,
          entryDate: new Date().toISOString().slice(0, 10),
          note: `已推进至${nextStage}`,
        };
        _saveDevOverrides(overrides);
        showToast('success', `「${candidate.name}」已推进至${nextStage}`);
        render();
      });
    });
  }

  render();
}

// ── 人才库 Tab ──
function _renderTalentContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const people = [...PEOPLE];
  const allInspections = loadInspectionRecords();

  // 提取筛选选项
  const stageOptions = [...new Set(people.map(p => p.developStage).filter(Boolean))].map(s => ({ value: s, label: s }));
  const groupOptions = [...new Set(people.map(p => p.partyGroup).filter(Boolean))].map(g => ({ value: g, label: g }));

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">人才库</h3>
        <span class="text-xs text-gray-400">${people.length} 人</span>
      </div>
      <div class="text-xs text-gray-500 mb-4">人员信息汇总提炼，输出人才画像</div>
      <div id="org-talent-query"></div>
    </div>
    <div id="org-talent-detail" class="hidden card rounded-xl p-5 mt-3"></div>
  `;

  const queryContainer = document.getElementById('org-talent-query');
  if (!queryContainer) return;

  // 构建查询数据（附加考察记录数）
  const queryData = people.map(p => ({
    ...p,
    inspCount: allInspections.filter(r => r.personId === p.id).length,
  }));

  // 发展阶段颜色映射
  const stageColor = {
    '正式党员': 'bg-green-100 text-green-700',
    '预备党员': 'bg-blue-100 text-blue-700',
    '发展对象': 'bg-amber-100 text-amber-700',
    '积极分子': 'bg-cyan-100 text-cyan-700',
  };

  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索姓名...',
    searchKey: 'name',
    filters: [
      { key: 'developStage', label: '发展阶段', options: stageOptions },
      { key: 'partyGroup', label: '党小组', options: groupOptions },
    ],
    data: queryData,
    renderRow: (p) => {
      const colorCls = stageColor[p.developStage] || 'bg-gray-100 text-gray-500';
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white cursor-pointer talent-person-card hover:bg-gray-50 transition-colors" data-person-id="${p.id}">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${p.name}</div>
            <div class="text-xs text-gray-500 mt-0.5">${p.partyGroup || ''}${p.role && p.role !== 'participant' ? ' · ' + p.role : ''}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${colorCls}">${p.developStage || ''}</span>
            ${p.inspCount > 0 ? badgeHtml(`考察 ${p.inspCount}`, 'info') : ''}
          </div>
        </div>
      `;
    },
    emptyMessage: '无匹配人员',
    accentColor: accent,
    sortKey: 'name',
    sortDir: 'asc',
  });

  // 点击人员展开考察记录汇总
  queryContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.talent-person-card');
    if (!card) return;
    const personId = card.dataset.personId;
    _renderTalentDetail(personId);
  });
}

// ── 人才库详情：考察记录汇总 ──
function _renderTalentDetail(personId) {
  const panel = document.getElementById('org-talent-detail');
  if (!panel) return;

  const person = getPersonById(personId);
  if (!person) return;

  const allInspections = loadInspectionRecords();
  const personInspections = allInspections.filter(r => r.personId === personId);
  // 2026-08-08 人才库展示增强：活动来源考察记录显示活动名（专班来源用 sourceName）
  const actTitleById = new Map(loadActivities().map(a => [a.id, a.title]));

  // 发展阶段颜色映射
  const stageColor = {
    '正式党员': 'bg-green-100 text-green-700',
    '预备党员': 'bg-blue-100 text-blue-700',
    '发展对象': 'bg-amber-100 text-amber-700',
    '积极分子': 'bg-cyan-100 text-cyan-700',
  };
  const colorCls = stageColor[person.developStage] || 'bg-gray-100 text-gray-500';

  // 角色标签映射
  const roleLabel = {
    'secretary': '支部书记', 'deputy-secretary': '支部副书记',
    'org-commissioner': '组织委员', 'prop-commissioner': '宣传委员',
    'disc-commissioner': '纪检委员', 'leader': '党小组组长',
    'participant': '', 'organizer': '组织者',
  };

  // 考察来源类型标签
  const sourceTagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const sourceTagLabel = { 'activity': '活动', 'taskforce': '专班' };
  const inspStatusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-cyan-100 text-cyan-700' };

  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="flex items-start justify-between mb-3">
      <div>
        <h3 class="font-title-cn text-base font-semibold text-gray-800">${person.name}</h3>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${colorCls}">${person.developStage || ''}</span>
          <span class="text-xs text-gray-500">${person.partyGroup || ''}</span>
          ${roleLabel[person.role] ? badgeHtml(roleLabel[person.role], 'info') : ''}
        </div>
      </div>
      <button id="talent-detail-close" class="text-gray-400 hover:text-gray-600 transition-colors" style="cursor:pointer;">${icon('close', { stroke: '#6B7280', className: 'w-3.5 h-3.5' })}</button>
    </div>
    <div class="mt-3">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">考察记录汇总 (${personInspections.length})</h5>
      ${personInspections.length === 0
        ? '<p class="text-xs text-gray-400 pl-2">暂无考察记录</p>'
        : `<div class="space-y-2">
          ${personInspections.map(r => `
            <div class="p-2.5 rounded-lg bg-white border border-gray-50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-700">${r.sourceName || (r.activityId ? actTitleById.get(r.activityId) : null) || r.role || '-'}</span>
                <div class="flex items-center gap-1.5">
                  ${r.sourceType ? `<span class="text-xs px-1.5 py-0.5 rounded-full ${sourceTagColor[r.sourceType] || 'bg-gray-50 text-gray-500'}">${sourceTagLabel[r.sourceType] || r.sourceType}</span>` : ''}
                  <span class="text-xs px-1.5 py-0.5 rounded-full ${inspStatusColor[r.status] || 'bg-gray-100 text-gray-500'}">${r.status === 'confirmed' ? '已确认' : '待确认'}</span>
                </div>
              </div>
              <p class="text-[12px] text-gray-500">${r.role || '-'}</p>
              ${r.recordedAt ? `<p class="text-xs text-gray-400 mt-0.5">记录时间：${r.recordedAt.slice(0, 10)}</p>` : ''}
            </div>
          `).join('')}
        </div>`
      }
    </div>
  `;

  // 关闭详情
  panel.querySelector('#talent-detail-close')?.addEventListener('click', () => {
    panel.classList.add('hidden');
  });
}

// ── 考察上传 Tab（组织委员视角） ──────────────────────────────
let _orgInspFormVisible = false;
let _orgInspPickerInstance = null;

function _renderOrgInspectionContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const tfInspection = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE);

  // T223 专班新者在前（createdAt 降序）
  const activeTaskforces = TaskForceRecordStore.getAll()
    .filter(t => t.status === 'active' || t.status === 'recruiting')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const formHtml = _orgInspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="org-insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传专班考察表单</div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择专班 <span class="text-red-500">*</span></label>
        <select id="org-insp-tf-select" class="input-flat text-xs w-full">
          <option value="">请选择专班</option>
          ${activeTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}（${tf.status === 'active' ? '运行中' : '招募中'}）</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择人员 <span class="text-red-500">*</span></label>
        <div id="org-insp-person-picker-container"></div>
      </div>
      <div id="org-insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="org-insp-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考察</button>
        <button id="org-insp-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
      <p class="text-[11px] text-gray-400 mt-2">提交后自动投递：纪检确认 → 考察总表（组织委员建档），无需手动选择接收方</p>
    </div>
  ` : '';

  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-cyan-100 text-cyan-700' };

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班考察上传</h3>
        <button class="btn-md" id="btn-org-upload-insp" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${_orgInspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">专班考察：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_orgInspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">专班</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">标签</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(tfInspection).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-xs ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">专班</span></td>
              <td class="py-2 px-3 text-gray-600">${i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
        ${tfInspection.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无专班考察记录</p>' : ''}
      </div>
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-org-upload-insp')?.addEventListener('click', () => {
    _orgInspFormVisible = !_orgInspFormVisible;
    if (!_orgInspFormVisible && _orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    _renderOrgInspectionContent();
  });

  if (_orgInspFormVisible) {
    _initOrgInspForm(container, activeTaskforces);
  }
}

function _initOrgInspForm(container, activeTaskforces) {
  const pickerContainer = container.querySelector('#org-insp-person-picker-container');
  if (pickerContainer) {
    _orgInspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderOrgInspContentRows(ids);
      }
    });
    _orgInspPickerInstance.render(pickerContainer);
  }

  _renderOrgInspContentRows([]);

  container.querySelector('#org-insp-form-cancel')?.addEventListener('click', () => {
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    _renderOrgInspectionContent();
  });

  container.querySelector('#org-insp-form-submit')?.addEventListener('click', () => {
    const tfSelect = container.querySelector('#org-insp-tf-select');
    const tfId = tfSelect?.value;
    const tfOption = tfSelect?.selectedOptions[0];
    if (!tfId) { showToast('error', '请选择专班'); return; }

    const tfName = tfOption?.dataset.name || tfId;
    const selectedIds = _orgInspPickerInstance ? _orgInspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    const records = [];
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#org-insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${getPersonName(personId)} 的考察内容`); return; }

      records.push({
        id: 'insp_' + Date.now() + '_' + personId,
        sourceType: SourceType.TASKFORCE,
        activityId: null,
        sourceName: tfName,
        personId,
        level: ParticipationLevel.DEEP_PARTICIPATE,
        role: content,
        recordedBy: 'p13', // 组织委员
        recordedAt: new Date().toISOString(),
        status: 'pending',
      });
    }

    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `专班考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    _renderOrgInspectionContent();
  });
}

function _renderOrgInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('org-insp-content-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人考察内容</div>
    <div class="space-y-2 max-h-60 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = getPersonById(pid);
        const name = person ? person.name : pid;
        return `
          <div class="flex items-start gap-2">
            <span class="text-xs font-medium text-gray-700 min-w-[3rem] pt-2">${name}</span>
            <textarea id="org-insp-content-${pid}" class="input-flat-sm w-full resize-none" rows="2" placeholder="请填写考察内容描述"></textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

registerRenderCallback(renderOrgUI);

// 初始化待办种子数据
seedTodos();

loadWorkspaceData({ role: 'org-commissioner', storeInits: [() => TaskForceRecordStore.init(), () => SignupStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-org' });
