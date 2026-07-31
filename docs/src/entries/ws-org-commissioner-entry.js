import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { AuthStore } from '../services/auth.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { PersonPicker } from '../components/person-picker.js';
import { _personName, PEOPLE, inspectionToLong, getPersonById, getPersonName } from '../mock/index.js';
import { mockDB, SourceType, ParticipationLevel } from '../core/domain.js';
import { saveDB } from '../services/mock.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';
import { renderQueryView } from '../components/query-view.js';
import { loadInspectionRecords, saveInspectionRecords } from '../services/inspection.js';
import { loadActivities } from '../services/activity.js';
import { icon } from '../core/icons.js';
import { IssueStore, deriveIssueDisplayState, IssueNotify, renderMyDispatchTab, bindMyDispatchEvents } from '../services/issues.js';
import { ROLE_LABELS } from '../core/constants.js';
import { renderTodoList } from '../components/todo-list.js';
import { TodoStore, seedTodos, TodoStatus } from '../services/todo.js';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'org-commissioner' });

// ════════════════════════════════════════════════════════════════
//  发展党员追踪 — Mock 数据
// ════════════════════════════════════════════════════════════════

const STAGE_ORDER = ['入党申请人', '积极分子', '发展对象', '预备党员', '正式党员'];

const STAGE_COLOR = {
  '入党申请人': { bg: 'bg-gray-100', text: 'text-gray-600', dot: '#9CA3AF' },
  '积极分子':   { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: '#06B6D4' },
  '发展对象':   { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#F59E0B' },
  '预备党员':   { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#3B82F6' },
  '正式党员':   { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' },
};

let MOCK_CANDIDATES = [
  { id: 'dc1', name: '赵思远', stage: '入党申请人', entryDate: '2025-11-15', note: '已提交入党申请书' },
  { id: 'dc2', name: '孙明辉', stage: '积极分子',   entryDate: '2025-05-20', note: '培养考察期中' },
  { id: 'dc3', name: '周佳怡', stage: '积极分子',   entryDate: '2025-03-10', note: '培养考察满一年，拟推进' },
  { id: 'dc4', name: '吴思齐', stage: '发展对象',   entryDate: '2025-01-08', note: '已完成政审' },
  { id: 'dc5', name: '郑凯文', stage: '预备党员',   entryDate: '2024-09-01', note: '预备期中' },
  { id: 'dc6', name: '陈晨',   stage: '正式党员',   entryDate: '2023-06-15', note: '已转正' },
];

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
  const pending = taskforces.filter(t => t.status === 'draft' || t.status === 'pending_review');
  const recruiting = taskforces.filter(t => t.status === 'recruiting');
  const active = taskforces.filter(t => t.status === 'active');

  const tabBar = renderTabBar({
    prefix: 'org',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      { id: 'inspection', label: '考察上传', render: () => _renderOrgInspectionContent(), groupLabel: '党建' },
      { id: 'taskforce', label: '专班管理', render: (ctx) => _renderTaskforceContent(ctx.pending, ctx.recruiting, ctx.active, ctx.activities) },
      { id: 'talent', label: '人才库', render: () => _renderTalentContent() },
      { id: 'development', label: '发展党员', render: () => _renderDevelopmentContent(), groupLabel: '党务' },
      { id: 'my-dispatch', label: '我的处置', render: () => { const el = document.getElementById('org-tab-content'); if (el) { el.innerHTML = renderMyDispatchTab('org-commissioner', 'u_org_commissioner'); bindMyDispatchEvents(el, 'org-commissioner', 'u_org_commissioner'); } }, groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    extraRightHtml: '<button id="btn-publish-tf" style="background:var(--accent-org-commissioner);color:white;border:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;cursor:pointer;transition:opacity 0.15s;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">发布招募</button>',
    renderCtx: { pending, recruiting, active, activities },
    storageKey: 'workflowos_tab_org',
    defaultTab: 'todo',
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  container.querySelector('#btn-publish-tf')?.addEventListener('click', () => _openRecruitForm());
  const urlParams = CrossPageState.getURLParams();
  if (urlParams.taskforceId) {
    tabBar.activate('taskforce');
    setTimeout(() => {
      const card = container.querySelector(`.tf-store-card[data-tf-id="${urlParams.taskforceId}"]`);
      if (card) {
        card.click();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  } else {
    tabBar.activate(tabBar.activeTab);
  }
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;

function _renderTodoContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  const groupedTodos = TodoStore.getGroupedByCategory('org-commissioner');
  const stats = TodoStore.getStatsByRole('org-commissioner');
  const selectedTodo = _selectedTodoId ? TodoStore.getById(_selectedTodoId) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'org',
    groupedTodos,
    stats,
    accent,
    onSelectTodo: (todo) => {
      _selectedTodoId = todo.id;
      _renderTodoContent();
    },
    onCompleteTodo: (todoId) => {
      TodoStore.complete(todoId);
      if (_selectedTodoId === todoId) _selectedTodoId = null;
      showToast('success', '待办已完成');
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
        <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-title-cn text-sm font-bold text-gray-700">我的待办</h4>
          </div>
          ${todoListHtml}
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="card rounded-xl p-5 sticky top-20">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-4">详情</h4>
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
  _bindTodoDetailEvents();
}

function _renderTodoDetail(todo) {
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
          <span class="text-[10px] px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          ${todo.priority === 'urgent' ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">紧急</span>' : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
      </div>
      ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
      ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
      <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        ${todo.status !== 'completed' ? `
          <button class="org-todo-detail-complete text-xs px-4 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};">标记完成</button>
          ${todo.actionType ? `<button class="org-todo-detail-action text-xs px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        ` : '<span class="text-xs text-green-600">已完成</span>'}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
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
    const tabLabels = { authorize: '专班管理', review: '考察上传', track: '发展党员' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

function _bindTodoDetailEvents() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;
  container.querySelector('.org-todo-detail-complete')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      TodoStore.complete(_selectedTodoId);
      _selectedTodoId = null;
      showToast('success', '待办已完成');
      _renderTodoContent();
    }
  });
  container.querySelector('.org-todo-detail-action')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) _handleTodoAction(todo);
    }
  });
}

function _renderTaskforceContent(pending, recruiting, active, activities) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const statusLabel = { pending_review: '待审核', recruiting: '招募中', active: '运行中', completed: '已完结', archived: '已归档', draft: '草稿' };
  const statusColor = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', archived: '#6B7280', draft: '#6B7280' };

  // 获取已完结专班（含 completed 解散 / archived 归档）
  const completed = TaskForceRecordStore.getAll().filter(t => t.status === 'completed' || t.status === 'archived');

  container.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="org-tf-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
    </div>
    <div id="org-tf-kanban"></div>
    <div id="tf-detail-panel" class="hidden card rounded-xl p-5 border-l-4" style="border-left-color:${accent};"></div>
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
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(99,102,241,0.06);color:var(--accent-indigo);border-bottom:2px solid rgba(99,102,241,0.15);">待审核 (${fp.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fp.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待审核专班</p>' :
              fp.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(217,119,6,0.06);color:#D97706;border-bottom:2px solid rgba(217,119,6,0.15);">招募中 (${fr.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fr.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无招募中专班</p>' :
              fr.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(139,92,246,0.06);color:var(--accent-org-commissioner-light);border-bottom:2px solid rgba(139,92,246,0.15);">运行中 (${fa.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fa.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无运行中专班</p>' :
              fa.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
      </div>
      ${fc.length > 0 ? `
      <details class="card rounded-xl p-0 overflow-hidden">
        <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="background:rgba(59,130,246,0.06);color:var(--accent-blue);border-bottom:2px solid rgba(59,130,246,0.15);">已完结 (${fc.length})</summary>
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
                `<li class="text-[11px] text-gray-400 pl-2 border-l-2 border-gray-200">${typeof c === 'string' ? c : (c.description || c.title || JSON.stringify(c))}</li>`
              ).join('')}</ul>`
            : '<span class="text-[11px] text-gray-300 pl-2">暂无贡献记录</span>';
          return `
            <div class="py-2 border-b border-gray-50 last:border-b-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">${m.role || '深度参与者'}</span>
                  <span class="text-[10px] text-gray-400">贡献 ${contribCount} 项</span>
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
        saveDB();
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
            <td class="px-2 py-1.5 text-center"><button class="sub-del-btn text-[10px] text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold font-title-cn" style="color:${color}">${label} (${items.length})</span>
              <button class="sub-add-btn text-[10px] px-2 py-1 rounded border hover:bg-gray-50 transition-colors" style="color:${color};border-color:${color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[11px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${fields.map(f => `<th class="px-2 py-1 text-[10px] font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-[10px] font-medium text-gray-500 w-12"></th>
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

      panel.innerHTML = `
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">${tf.name}</h4>
        <p class="text-xs text-gray-500 mb-2">${tf.task}</p>
        <div class="flex gap-4 text-xs text-gray-400 mb-3">
          <span>${filled}/${tf.capacity}</span>
          ${tf.deadline ? `<span>${tf.deadline}</span>` : ''}
          <span>发起: ${_personName(tf.initiator)}</span>
        </div>
        <div class="text-xs text-gray-500">成员：${tf.members.map(m => _personName(m.personId)).join('、')}</div>
        ${workSummaryHtml}
        ${subRecordsHtml}
      `;

      // ── 解散专班按钮事件 ──
      const dissolveBtn = panel.querySelector('#btn-dissolve-tf');
      if (dissolveBtn) {
        dissolveBtn.addEventListener('click', () => _dissolveTaskforce(tf));
      }

      // ── 子记录添加/删除事件（P3-4） ──
      panel.querySelectorAll('.sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          if (type === 'inspection') {
            const person = prompt('被考察人：');
            if (!person) return;
            const content = prompt('考察内容：') || '';
            const result = prompt('考察结论：') || '';
            tfSubs.inspection.push({ person, content, result });
          } else {
            const name = prompt('材料名称：');
            if (!name) return;
            const author = prompt('提交人：') || '';
            const note = prompt('备注：') || '';
            tfSubs.materials.push({ name, author, note });
          }
          saveTfSubs();
          // 重新渲染详情面板
          card.click();
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

function _dissolveTaskforce(tf) {
  if (!tf || tf.status !== 'active') return;

  const confirmed = window.confirm(`确定解散专班「${tf.name}」？解散后将回收所有相关赋权记录。`);
  if (!confirmed) return;

  // 1. 更新专班状态为 completed
  const updated = TaskForceRecordStore.update(tf.id, { status: 'completed' });
  if (!updated) {
    showToast('error', '解散失败：专班记录未找到');
    return;
  }

  // 2. 回收该专班相关的赋权记录
  const authRecords = AuthStore.getAuthorizations();
  const relatedRecords = authRecords.filter(r =>
    r.scope === 'taskforce' && r.scopeRef === tf.id
  );
  let revokedCount = 0;
  relatedRecords.forEach(r => {
    const ok = AuthStore.revokeAuthorization(r.id);
    if (ok) revokedCount++;
  });

  // 3. toast 反馈
  const revokeMsg = relatedRecords.length > 0
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
    statusBtn = `<button class="tf-start-btn text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">启动专班</button>`;
  } else if (t.status === 'active') {
    statusBtn = `<button class="tf-archive-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">归档专班</button>`;
  }
  return `
    <div class="kanban-card p-4 rounded-xl bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:${color}15;color:${color};">${statusLabel[t.status] || t.status}</span>
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
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h3 class="font-title-cn" style="font-size:1.125rem;font-weight:700;color:#1F2937;margin:0;">发布专班招募</h3>
      <button id="recruit-form-close" type="button" style="width:32px;height:32px;border-radius:var(--radius-sm);border:none;background:#F3F4F6;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">
        ${icon('close', { stroke: '#6B7280', className: 'w-3.5 h-3.5' })}
      </button>
    </div>

    <form id="recruit-form" autocomplete="off">
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">专班名称 <span style="color:#CE1126;">*</span></label>
        <input type="text" id="rf-name" required placeholder="如：宣传专班（第三期）" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">任务描述 <span style="color:#CE1126;">*</span></label>
        <textarea id="rf-task" required rows="3" placeholder="描述专班的核心任务与目标" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;resize:vertical;"></textarea>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">所需人数 <span style="color:#CE1126;">*</span></label>
          <input type="number" id="rf-capacity" required min="1" max="50" placeholder="如：5" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">截止日期 <span style="color:#CE1126;">*</span></label>
          <input type="date" id="rf-deadline" required class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">技能要求</label>
        <input type="text" id="rf-skills" placeholder="如：视频剪辑、文案撰写（选填）" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
      </div>

      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">周期起始</label>
          <input type="date" id="rf-period-start" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">周期结束</label>
          <input type="date" id="rf-period-end" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">初始成员</label>
        <div id="rf-members-picker"></div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">说明</label>
        <textarea id="rf-notes" rows="2" placeholder="补充说明（选填）" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;resize:vertical;"></textarea>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button type="button" id="recruit-form-cancel" style="padding:8px 20px;border-radius:var(--radius-md);border:1.5px solid #E5E7EB;background:white;color:#6B7280;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:all 0.15s;">取消</button>
        <button type="submit" style="padding:8px 24px;border-radius:var(--radius-md);border:none;background:${accent};color:white;font-size:0.8125rem;font-weight:600;cursor:pointer;transition:background 0.15s;">发布</button>
      </div>
    </form>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 关闭按钮
  panel.querySelector('#recruit-form-close').addEventListener('click', () => _closeRecruitForm());
  panel.querySelector('#recruit-form-cancel').addEventListener('click', () => _closeRecruitForm());

  // 输入框聚焦样式
  panel.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('focus', function() { this.style.borderColor = accent; });
    el.addEventListener('blur', function() { this.style.borderColor = '#E5E7EB'; });
  });

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

  // 校验必填项
  if (!name) { showToast('error', '请填写专班名称'); return; }
  if (!task) { showToast('error', '请填写任务描述'); return; }
  if (!capacity || capacity < 1) { showToast('error', '请填写有效的所需人数'); return; }
  if (!deadline) { showToast('error', '请选择截止日期'); return; }

  // 获取初始成员
  const selectedIds = _recruitPersonPicker ? _recruitPersonPicker.getSelected() : [];
  const members = selectedIds.map(pid => ({
    personId: pid,
    role: '深度参与者',
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
    activityId: activityId || null,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  // 附加可选字段
  if (skills) record.skills = skills;
  if (periodStart && periodEnd) record.period = `${periodStart} ~ ${periodEnd}`;
  if (notes) record.notes = notes;

  try {
    TaskForceRecordStore.add(record);
    showToast('success', `专班「${name}」发布成功`);
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
    <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动进度</h4>
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
        ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">已归档</span>'
        : '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">已发布</span>';
      const completeBtn = !isArchived
        ? `<button class="track-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors" data-act-id="${a.id}">确认完成</button>`
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
    showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
    renderOrgUI(getAppState());
  });
}

// ── 发展党员追踪 Tab（党务） ──

function _renderDevelopmentContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 当前筛选状态
  let _devFilter = 'all';

  function render() {
    const filtered = _devFilter === 'all'
      ? MOCK_CANDIDATES
      : MOCK_CANDIDATES.filter(c => c.stage === _devFilter);

    // 阶段统计
    const stageCounts = {};
    for (const s of STAGE_ORDER) {
      stageCounts[s] = MOCK_CANDIDATES.filter(c => c.stage === s).length;
    }

    // 管线概览条
    const pipelineHtml = STAGE_ORDER.map((s, idx) => {
      const sc = STAGE_COLOR[s];
      const count = stageCounts[s];
      const arrow = idx < STAGE_ORDER.length - 1
        ? `<span class="text-gray-300 mx-0.5">→</span>`
        : '';
      return `<span class="inline-flex items-center gap-1"><span style="width:8px;height:8px;border-radius:50%;background:${sc.dot};display:inline-block;"></span><span class="text-[11px] text-gray-600">${s}</span><span class="text-[10px] font-bold" style="color:${sc.dot};">${count}</span></span>${arrow}`;
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
      return `<button class="dev-filter-btn text-[11px] px-2.5 py-1 rounded-full border transition-colors ${activeCls}" data-filter="${f.value}">${f.label}</button>`;
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
            ? `<button class="dev-advance-btn text-[10px] px-2.5 py-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition-colors" data-candidate-id="${c.id}" data-next-stage="${nextStage}">推进至${nextStage}</button>`
            : `<span class="text-[10px] px-2.5 py-1 rounded-md bg-green-50 text-green-600 border border-green-200">已转正</span>`;

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
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium">${c.stage}</span>
                    <span class="text-[10px] text-gray-400">进入当前阶段：${c.entryDate}</span>
                  </div>
                </div>
                ${advanceBtn}
              </div>
              <div class="flex items-center gap-0.5 mb-2">${progressDots}</div>
              <div class="text-[11px] text-gray-500">${c.note || ''}</div>
            </div>`;
        }).join('');

    container.innerHTML = `
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-700">发展党员追踪</h4>
          <span class="text-xs text-gray-400">${MOCK_CANDIDATES.length} 人</span>
        </div>
        <div class="text-xs text-gray-500 mb-4">从入党申请人到正式党员的完整发展路径追踪</div>
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
        const candidate = MOCK_CANDIDATES.find(c => c.id === candidateId);
        if (!candidate) return;
        const confirmed = window.confirm(`确认将「${candidate.name}」从${candidate.stage}推进至${nextStage}？`);
        if (!confirmed) return;
        candidate.stage = nextStage;
        candidate.entryDate = new Date().toISOString().slice(0, 10);
        candidate.note = `已推进至${nextStage}`;
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
    <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">人才库</h4>
        <span class="text-xs text-gray-400">${people.length} 人</span>
      </div>
      <div class="text-xs text-gray-500 mb-4">人员信息有机汇总，输出人才画像</div>
      <div id="org-talent-query"></div>
    </div>
    <div id="org-talent-detail" class="hidden card rounded-xl p-5 border-l-4 mt-3" style="border-left-color:${accent};"></div>
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
    '入党申请人': 'bg-gray-100 text-gray-600',
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
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${colorCls}">${p.developStage || ''}</span>
            ${p.inspCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">考察 ${p.inspCount}</span>` : ''}
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

  // 发展阶段颜色映射
  const stageColor = {
    '正式党员': 'bg-green-100 text-green-700',
    '预备党员': 'bg-blue-100 text-blue-700',
    '发展对象': 'bg-amber-100 text-amber-700',
    '积极分子': 'bg-cyan-100 text-cyan-700',
    '入党申请人': 'bg-gray-100 text-gray-600',
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
        <h4 class="font-title-cn text-sm font-bold text-gray-700">${person.name}</h4>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] px-1.5 py-0.5 rounded-full ${colorCls}">${person.developStage || ''}</span>
          <span class="text-xs text-gray-500">${person.partyGroup || ''}</span>
          ${roleLabel[person.role] ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">${roleLabel[person.role]}</span>` : ''}
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
                <span class="text-xs font-medium text-gray-700">${r.sourceName || r.role || '-'}</span>
                <div class="flex items-center gap-1.5">
                  ${r.sourceType ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full ${sourceTagColor[r.sourceType] || 'bg-gray-50 text-gray-500'}">${sourceTagLabel[r.sourceType] || r.sourceType}</span>` : ''}
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full ${inspStatusColor[r.status] || 'bg-gray-100 text-gray-500'}">${r.status === 'confirmed' ? '已确认' : '待确认'}</span>
                </div>
              </div>
              <p class="text-[11px] text-gray-500">${r.role || '-'}</p>
              ${r.recordedAt ? `<p class="text-[10px] text-gray-400 mt-0.5">记录时间：${r.recordedAt.slice(0, 10)}</p>` : ''}
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

  const activeTaskforces = TaskForceRecordStore.getAll().filter(t => t.status === 'active' || t.status === 'recruiting');

  const formHtml = _orgInspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="org-insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传专班考察表单</div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择专班 <span class="text-red-500">*</span></label>
        <select id="org-insp-tf-select" class="input-flat text-xs w-full">
          <option value="">请选择专班</option>
          ${activeTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}（${tf.status === 'active' ? '运行中' : '招募中'}）</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择人员 <span class="text-red-500">*</span></label>
        <div id="org-insp-person-picker-container"></div>
      </div>
      <div id="org-insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="org-insp-form-submit" class="text-sm px-5 py-2 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">提交考察</button>
        <button id="org-insp-form-cancel" class="text-sm px-4 py-2 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-cyan-100 text-cyan-700' };

  container.innerHTML = `
    <div class="card rounded-xl p-5 border-l-4" style="border-left-color:${accent};">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">专班考察上传</h4>
        <button class="btn-md btn-md-red" id="btn-org-upload-insp">${_orgInspFormVisible ? '收起表单' : '上传考察表单'}</button>
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
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">专班</span></td>
              <td class="py-2 px-3 text-gray-600">${i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
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

loadWorkspaceData({ role: 'org-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-org' });
