﻿import { renderTabBar } from '../components/tab-bar.js?v=20260807g';
import { renderTodoList } from '../components/todo-list.js?v=20260807g';
import { getAppState, setState, registerRenderCallback } from '../core/state.js?v=20260807g';
import { BranchService } from '../services/runtime.js?v=20260807g';
import { showToast } from '../core/utils.js?v=20260807g';
import { bootstrapPage } from '../core/bootstrap.js?v=20260807g';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260807g';
import { attendanceToLong, inspectionToLong, PEOPLE, getPersonById, getPersonName } from '../mock/index.js?v=20260807g';
import { PersonPicker } from '../components/person-picker.js?v=20260807g';
import { DecisionTreeState, DECISION_TREE_CONFIGS, renderWorkflowPanel, writeActivityWithSOP } from '../services/decision-tree.js?v=20260807g';
import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS, SourceType, ParticipationLevel, ReviewStatus, REVIEW_STATUS_LABELS, OutputType, deriveOutputRoute } from '../core/domain.js?v=20260807g';
import { persist } from '../core/data-adapter.js?v=20260807g';
import { loadMakeupTasks } from '../services/makeup.js?v=20260807g';
import { loadAttendanceRecords, saveAttendanceRecords } from '../services/attendance.js?v=20260807g';
import { loadInspectionRecords, saveInspectionRecords } from '../services/inspection.js?v=20260807g';
import { loadActivities } from '../services/activity.js?v=20260807g';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260807g';
import { loadActivityReviews, findActivityReviewIndex, updateActivityReview, addActivityReview } from '../services/review.js?v=20260807g';
import { renderMyDispatchTab, bindMyDispatchEvents } from '../services/issues.js?v=20260807g';
import { TodoStore, seedTodos } from '../services/todo.js?v=20260807g';
import { AuthStore } from '../services/auth.js?v=20260807g';
import { badgeHtml } from '../components/badge.js?v=20260807g';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'leader' });

// ── 表单状态 ──────────────────────────────────────────────────
let _attFormVisible = false;
let _attPickerInstance = null;
let _inspFormVisible = false;
let _inspPickerInstance = null;
let _dtOrgPicker = null;      // 决策树表单：组织者多选
let _dtDeepPicker = null;     // 决策树表单：深度参与者多选
let _detailOrgPicker = null;   // 活动详情：组织者多选（预填现有 assignments）
let _detailDeepPicker = null;  // 活动详情：深度参与者多选

// ── 党小组组长→党小组映射 ──────────────────────────────────────────
const LEADER_GROUP_MAP = {
  'p4': '第三党小组',  // 赵六（第三党小组组长）
  'p6': '第一党小组',  // 孙八（第一党小组组长）
};

function _filterByRole(state, role) {
  const currentLeaderId = AuthStore.getCurrentUser()?.personId || 'p4';
  const activities = (state.activities || []).filter(a => {
    if (role === 'leader') {
      // 组长可见：上级下发（top-down）、本人组织/参与（读主源 assignments，非 'leader' 角色名临时方案）、
      // 或本人创建的活动（含清空赋权的待办兜底场景，保证「去赋权」待办能直达详情）
      const isMine = Array.isArray(a.assignments)
        ? a.assignments.some(x => x.personId === currentLeaderId && (x.role === 'organizer' || x.role === 'deep'))
        : (a.organizer === currentLeaderId);
      return a.direction === 'top-down' || isMine || a.createdBy === currentLeaderId;
    }
    return true;
  });
  return { ...state, activities };
}

function renderLeaderUI(state) {
  let activities = state.activities || [];
  const allActs = loadActivities();
  if (activities.length === 0 && allActs.length > 0) {
    activities = allActs.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('leader-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'leader');
  const filteredActivities = filteredState.activities || [];

  const tabBar = renderTabBar({
    prefix: 'leader',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      { id: 'write', label: '活动管理', render: (ctx) => _renderWriteContent(ctx.filteredActivities), groupLabel: '党建' },
      { id: 'attendance', label: '考勤上传', render: () => _renderAttendanceContent() },
      { id: 'inspection', label: '考察上传', render: () => _renderInspectionContent() },
      { id: 'review', label: '复盘提交', render: () => _renderReviewContent() },
      { id: 'my-dispatch', label: '我的处置', render: () => { const el = document.getElementById('leader-tab-content'); if (el) { el.innerHTML = renderMyDispatchTab('leader', 'u_leader_1'); bindMyDispatchEvents(el, 'leader', 'u_leader_1'); } }, groupLabel: '反馈' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: { filteredActivities },
    storageKey: 'workflowos_tab_leader',
    defaultTab: 'todo',
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  tabBar.activate(tabBar.activeTab);
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;

function _renderTodoContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  const groupedTodos = TodoStore.getGroupedByCategory('leader');
  const stats = TodoStore.getStatsByRole('leader');
  const selectedTodo = _selectedTodoId ? TodoStore.getById(_selectedTodoId) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'leader',
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
        <div class="card rounded-xl p-5"">
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
        ${todo.status !== 'completed' ? `
          <button class="leader-todo-detail-complete text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};">标记完成</button>
          ${todo.actionType ? `<button class="leader-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        ` : '<span class="text-xs text-green-600">已完成</span>'}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    authorize: 'write',
    submit: 'attendance',
    review: 'review',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    // 激活对应 tab
    const btn = document.querySelector(`.leader-tab-btn[data-leader-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达活动详情内联编辑（≤2 跳）
    if (todo.actionType === 'authorize' && todo.sourceId) {
      const actItem = document.querySelector(`.leader-act-item[data-act-id="${todo.sourceId}"]`);
      if (actItem) actItem.click();
    }
    showToast('info', `已跳转到${todo.actionType === 'authorize' ? '活动写入' : todo.actionType === 'submit' ? '考勤上传' : '复盘提交'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

// 绑定详情面板按钮事件（在 _renderTodoContent 之后由 render 回调触发）
function _bindTodoDetailEvents() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;
  container.querySelector('.leader-todo-detail-complete')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      TodoStore.complete(_selectedTodoId);
      _selectedTodoId = null;
      showToast('success', '待办已完成');
      _renderTodoContent();
    }
  });
  container.querySelector('.leader-todo-detail-action')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) _handleTodoAction(todo);
    }
  });
}

// ── 决策树状态（已迁移至 services/decision-tree.js） ───────────
const dt = new DecisionTreeState('leader');
const DECISION_TREE = DECISION_TREE_CONFIGS.leader;

function _renderWriteContent(activities) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const panelVisible = dt.showPanel;

  container.innerHTML = `
    <div class="card rounded-xl p-5"">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">活动写入</h3>
        <button class="btn-md" id="btn-leader-create" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${panelVisible ? '收起面板' : '创建活动'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组组长可创建党小组会、主题党日活动，写入后自动生成SOP任务节点</div>

      ${panelVisible ? _renderDecisionTreePanel() : ''}

      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs text-gray-400 mb-2">已有关联活动</div>
        <div class="space-y-2" id="leader-activity-list">
          ${activities.length === 0 ? '<p class="text-xs text-gray-400 text-center py-4">暂无关联活动</p>' :
            activities.map(a => `
              <div class="leader-act-item flex items-center justify-between p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer" data-act-id="${a.id}">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
                </div>
                ${badgeHtml(a.status === 'published' ? '已发布' : '草稿', a.status === 'published' ? 'success' : 'warning')}
              </div>
            `).join('')}
        </div>
        <div id="leader-act-detail" class="hidden mt-3 rounded-xl p-4"></div>
      </div>
    </div>
  `;

  _bindDecisionTreeEvents(container);

  // ── 决策树表单内联赋权 PersonPicker（表单可见时初始化，随渲染重建） ──
  const dtOrgEl = container.querySelector('#dt-org-picker');
  const dtDeepEl = container.querySelector('#dt-deep-picker');
  const currentLeaderId = AuthStore.getCurrentUser()?.personId || 'p4'; // 组长本人（默认赋权对象）
  if (dtOrgEl) {
    if (_dtOrgPicker) { _dtOrgPicker.destroy(); _dtOrgPicker = null; }
    _dtOrgPicker = new PersonPicker({ mode: 'multi', placeholder: '选择组织者', accentColor: accent, initialIds: [currentLeaderId], onSelect: () => {} });
    _dtOrgPicker.render(dtOrgEl);
  }
  if (dtDeepEl) {
    if (_dtDeepPicker) { _dtDeepPicker.destroy(); _dtDeepPicker = null; }
    _dtDeepPicker = new PersonPicker({ mode: 'multi', placeholder: '选择深度参与者', accentColor: accent, onSelect: () => {} });
    _dtDeepPicker.render(dtDeepEl);
  }

  // ── 活动点击展开详情+子记录（P3-4） ──
  container.querySelectorAll('.leader-act-item').forEach(item => {
    item.addEventListener('click', () => {
      const actId = item.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const detailPanel = document.getElementById('leader-act-detail');
      if (!detailPanel) return;
      detailPanel.classList.remove('hidden');

      const actSubs = (mockDB.actSubRecords && mockDB.actSubRecords[actId]) || { attendance: [], inspection: [], publicity: [], materials: [] };

      function saveActSubs() {
        mockDB.actSubRecords = { ...mockDB.actSubRecords, [actId]: actSubs };
        persist();
      }

      function renderActSubTable(type, items) {
        const configs = {
          attendance: { label: '考勤记录', color: '#10B981', fields: [{ key: 'person', label: '姓名' }, { key: 'status', label: '出勤状态' }, { key: 'note', label: '备注' }] },
          inspection: { label: '考察记录', color: '#D97706', fields: [{ key: 'person', label: '被考察人' }, { key: 'content', label: '考察内容' }, { key: 'result', label: '考察结论' }] },
          publicity: { label: '宣传记录', color: '#0E7490', fields: [{ key: 'title', label: '宣传标题' }, { key: 'author', label: '撰写人' }, { key: 'channel', label: '发布渠道' }] },
          materials: { label: '材料记录', color: '#3B82F6', fields: [{ key: 'name', label: '材料名称' }, { key: 'author', label: '提交人' }, { key: 'note', label: '备注' }] },
        };
        const cfg = configs[type];
        const rows = items.map((item, idx) => `
          <tr class="border-b border-gray-50">
            ${cfg.fields.map(f => `<td class="px-2 py-1.5 text-xs text-gray-700">${item[f.key] || '-'}</td>`).join('')}
            <td class="px-2 py-1.5 text-center"><button class="act-sub-del-btn text-xs text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <h5 class="text-xs font-bold font-title-cn" style="color:${cfg.color}">${cfg.label} (${items.length})</h5>
              <button class="act-sub-add-btn text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors" style="color:${cfg.color};border-color:${cfg.color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[12px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${cfg.fields.map(f => `<th class="px-2 py-1 text-xs font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-xs font-medium text-gray-500 w-12"></th>
                </tr></thead><tbody>${rows}</tbody></table>`
            }
          </div>`;
      }

      detailPanel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h5 class="font-title-cn text-sm font-bold text-gray-700">${activity.title || '未命名'}</h5>
          <button id="btn-close-act-detail" class="text-xs text-gray-400 hover:text-gray-600">收起</button>
        </div>
        <div class="text-xs text-gray-500 mb-2">${activity.date || ''} ${activity.type ? '· ' + activity.type : ''}</div>

        <!-- T-190 活动角色内联编辑：主源 assignments 预填，保存走 syncProjectRoles 三合一 -->
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <h6 class="font-title-cn text-xs font-bold text-gray-600">活动角色</h6>
            <button id="btn-save-activity-roles" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};">保存角色</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-[12px] text-gray-400 mb-1">组织者</div>
              <div id="detail-org-picker"></div>
            </div>
            <div>
              <div class="text-[12px] text-gray-400 mb-1">深度参与者</div>
              <div id="detail-deep-picker"></div>
            </div>
          </div>
          <p class="text-[12px] text-gray-400 mt-2">提示：此处修改将同步写入活动主源数据，被赋权人将收到通知。</p>
        </div>

        <div class="mt-3 pt-3 border-t border-gray-100">
          <h6 class="font-title-cn text-xs font-bold text-gray-600 mb-1">子记录</h6>
          ${renderActSubTable('attendance', actSubs.attendance)}
          ${renderActSubTable('inspection', actSubs.inspection)}
          ${renderActSubTable('publicity', actSubs.publicity)}
          ${renderActSubTable('materials', actSubs.materials)}
        </div>
      `;

      // 初始化详情角色 PersonPicker（预填主源 assignments）
      if (_detailOrgPicker) { _detailOrgPicker.destroy(); _detailOrgPicker = null; }
      if (_detailDeepPicker) { _detailDeepPicker.destroy(); _detailDeepPicker = null; }
      const detailOrgEl = detailPanel.querySelector('#detail-org-picker');
      const detailDeepEl = detailPanel.querySelector('#detail-deep-picker');
      const actAssigns = Array.isArray(activity.assignments) ? activity.assignments : [];
      if (detailOrgEl) {
        _detailOrgPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择组织者',
          accentColor: accent,
          initialIds: actAssigns.filter(x => x.role === 'organizer').map(x => x.personId),
          onSelect: () => {},
        });
        _detailOrgPicker.render(detailOrgEl);
      }
      if (detailDeepEl) {
        _detailDeepPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择深度参与者',
          accentColor: accent,
          initialIds: actAssigns.filter(x => x.role === 'deep').map(x => x.personId),
          onSelect: () => {},
        });
        _detailDeepPicker.render(detailDeepEl);
      }

      // 保存角色：syncProjectRoles 三合一（写主源 + 快照 + 通知）
      detailPanel.querySelector('#btn-save-activity-roles')?.addEventListener('click', async () => {
        const orgIds = _detailOrgPicker ? _detailOrgPicker.getSelected() : [];
        const deepIds = _detailDeepPicker ? _detailDeepPicker.getSelected() : [];
        const newAssignments = [
          ...orgIds.map(personId => ({ personId, role: 'organizer' })),
          ...deepIds.map(personId => ({ personId, role: 'deep' })),
        ];
        const actorId = AuthStore.getCurrentUser()?.personId;
        const { added, removed } = await AuthStore.syncProjectRoles({ scopeRef: actId, assignments: newAssignments, actorId });
        if (added > 0 || removed > 0) {
          showToast('success', `活动角色已更新：新增 ${added} 人，移除 ${removed} 人`);
        } else {
          showToast('info', '活动角色未发生变化');
        }
        // 刷新活动列表与详情（读取最新主源）
        const fresh = await BranchService.listActivities();
        setState({ activities: fresh });
        detailPanel.querySelector('#btn-close-act-detail')?.click();
      });

      // 收起按钮
      detailPanel.querySelector('#btn-close-act-detail')?.addEventListener('click', () => {
        detailPanel.classList.add('hidden');
      });

      // 添加子记录（内联表单替代 prompt 弹窗；attendance/inspection 同步写入正式考勤/考察库，消除双轨维护）
      detailPanel.querySelectorAll('.act-sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const panelEl = btn.closest('.mt-3');
          const existing = panelEl?.querySelector('.act-sub-inline-form');
          if (existing) { existing.remove(); return; }

          // 内联表单 HTML（person 字段由 PersonPicker 渲染，其余为原生控件）
          const statusOpts = [
            { value: AttendanceStatus.PRESENT, label: '出勤' },
            { value: AttendanceStatus.LEAVE, label: '请假' },
            { value: AttendanceStatus.ABSENT, label: '缺席' },
            { value: AttendanceStatus.MADE_UP, label: '已补课' },
          ];
          const resultOpts = ['考察合格', '待观察', '需补材料'];
          const textFields = {
            publicity: [['title', '宣传标题'], ['author', '撰写人'], ['channel', '发布渠道']],
            materials: [['name', '材料名称'], ['author', '提交人'], ['note', '备注']],
          };

          let formHtml = '';
          // T-224 §5.5：投递去向由产出类型派生（系统内置），组织者只见「提交」不见「发送对象」
          const routeHint = (type) => {
            const map = {
              attendance: OutputType.ATTENDANCE,
              inspection: OutputType.INSPECTION,
              publicity: OutputType.PUBLICITY,
            };
            const route = deriveOutputRoute(map[type]);
            return route ? `<div class="text-[11px] text-gray-400 mb-2">提交后自动投递：${route.route} → ${route.sink}</div>` : '';
          };
          if (type === 'attendance') {
            formHtml = `
              <div class="act-sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加考勤记录（同步正式考勤库）</div>
                ${routeHint('attendance')}
                <div class="mb-2 act-sub-picker"></div>
                <div class="flex gap-2 mb-2">
                  <select class="f-status input-flat text-xs flex-1">${statusOpts.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}</select>
                  <input class="f-note input-flat text-xs flex-1" placeholder="备注（选填）">
                </div>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="act-sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="act-sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="background:${accent};">提交</button>
                </div>
              </div>`;
          } else if (type === 'inspection') {
            formHtml = `
              <div class="act-sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加考察记录（同步正式考察库，待纪检委员确认）</div>
                ${routeHint('inspection')}
                <div class="mb-2 act-sub-picker"></div>
                <textarea class="f-content input-flat text-xs w-full resize-none mb-2" rows="2" placeholder="考察内容描述（必填）"></textarea>
                <select class="f-result input-flat text-xs w-full mb-2">${resultOpts.map(r => `<option>${r}</option>`).join('')}</select>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="act-sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="act-sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="background:${accent};">提交</button>
                </div>
              </div>`;
          } else {
            const fields = textFields[type];
            formHtml = `
              <div class="act-sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加${type === 'publicity' ? '宣传' : '材料'}记录</div>
                ${routeHint(type)}
                ${fields.map(([key, label]) => `<input class="f-${key} input-flat text-xs w-full mb-2" placeholder="${label}${key === 'title' || key === 'name' ? '（必填）' : '（选填）'}">`).join('')}
                <div class="flex gap-2 justify-end">
                  <button type="button" class="act-sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="act-sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="background:${accent};">提交</button>
                </div>
              </div>`;
          }

          panelEl.insertAdjacentHTML('beforeend', formHtml);
          const form = panelEl.querySelector('.act-sub-inline-form');

          // person 类记录用 PersonPicker 选人（直接得 personId，对齐正式库）
          if (type === 'attendance' || type === 'inspection') {
            const picker = new PersonPicker({ mode: 'multi', placeholder: '选择人员', accentColor: accent, onSelect: () => {} });
            picker.render(form.querySelector('.act-sub-picker'));
            form._picker = picker;
          }

          form.querySelector('.act-sub-cancel-btn').addEventListener('click', () => {
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
          });

          form.querySelector('.act-sub-save-btn').addEventListener('click', () => {
            if (type === 'attendance') {
              const ids = form._picker ? form._picker.getSelected() : [];
              if (ids.length === 0) { showToast('error', '请选择人员'); return; }
              const statusEnum = form.querySelector('.f-status').value;
              const note = form.querySelector('.f-note').value.trim();
              const newAtts = [];
              ids.forEach(pid => {
                actSubs[type].push({ person: getPersonName(pid), personId: pid, status: ATTENDANCE_STATUS_LABELS[statusEnum], note });
                newAtts.push({ id: 'att_' + Date.now() + '_' + pid, personId: pid, activityId: actId, status: statusEnum, recordedBy: 'u_exec', recordedAt: new Date().toISOString(), overdue: false });
              });
              const all = loadAttendanceRecords();
              saveAttendanceRecords([...all, ...newAtts]);
              showToast('success', `已添加 ${ids.length} 条考勤记录并同步正式考勤库`);
            } else if (type === 'inspection') {
              const content = form.querySelector('.f-content').value.trim();
              if (!content) { showToast('error', '请填写考察内容'); return; }
              const ids = form._picker ? form._picker.getSelected() : [];
              if (ids.length === 0) { showToast('error', '请选择被考察人'); return; }
              const result = form.querySelector('.f-result').value;
              const newRecords = [];
              ids.forEach(pid => {
                actSubs[type].push({ person: getPersonName(pid), personId: pid, content, result });
                // P1-5 语义修复：考察内容入 content，role 存角色职责标签
                newRecords.push({
                  id: 'insp_' + Date.now() + '_' + pid,
                  sourceType: SourceType.ACTIVITY, activityId: actId, sourceName: null,
                  personId: pid, level: ParticipationLevel.ORGANIZE,
                  content, role: '组织者',
                  recordedBy: 'u_exec', recordedAt: new Date().toISOString(), status: 'pending',
                });
              });
              const all = loadInspectionRecords();
              saveInspectionRecords([...all, ...newRecords]);
              showToast('success', `已添加 ${ids.length} 条考察记录并同步正式考察库`);
            } else {
              const fields = textFields[type];
              const requiredKey = type === 'publicity' ? 'title' : 'name';
              const requiredVal = form.querySelector(`.f-${requiredKey}`).value.trim();
              if (!requiredVal) { showToast('error', `请填写${type === 'publicity' ? '宣传标题' : '材料名称'}`); return; }
              const entry = {};
              fields.forEach(([key]) => { entry[key] = form.querySelector(`.f-${key}`).value.trim(); });
              actSubs[type].push(entry);
              showToast('success', '已添加');
            }
            saveActSubs();
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
            const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
            if (actEl) actEl.click();
          });
        });
      });

      // 删除子记录
      detailPanel.querySelectorAll('.act-sub-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          actSubs[type].splice(idx, 1);
          saveActSubs();
          const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
          if (actEl) actEl.click();
        });
      });
    });
  });
}

function _renderDecisionTreePanel() {
  const { L1, L2, L3, L4, hostGroup } = dt.selections;

  // 当前进行到第几步（S6 修复：原代码引用未定义变量 step 导致面板渲染崩溃）
  // 步骤指示器：组织场景→活动形式→时长→发起方向
  const step = !L1 ? 1 : !L2 ? 2 : !L3 ? 3 : 4;

  // 步骤指示器
  const steps = ['组织场景', '活动形式', '时长', '发起方向'];
  const stepperHtml = `
    <div class="flex items-center gap-1 mb-5">
      ${steps.map((s, i) => {
        const isActive = i === step - 1;
        const isDone = i < step - 1;
        const dotColor = isDone ? accent : isActive ? accent : '#D1D5DB';
        const lineColor = isDone ? accent : '#E5E7EB';
        return `
          ${i > 0 ? `<div class="flex-1 h-0.5 rounded" style="background:${lineColor};"></div>` : ''}
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="background:${isDone || isActive ? accentRgba : '#F3F4F6'};color:${dotColor};border:1.5px solid ${dotColor};">${isDone ? '&#10003;' : i + 1}</div>
            <span class="text-xs ${isActive ? 'font-bold' : ''}" style="color:${dotColor};">${s}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // L1 选择
  const l1Html = `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L1 组织场景 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L1.map(opt => {
          const selected = L1 === opt.value;
          return `<button class="dt-l1-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  `;

  // 承办党小组选择器（L1选择后显示）
  const hostGroupHtml = L1 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">承办党小组 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.HOST_GROUPS.map(g => {
          const selected = hostGroup === g;
          return `<button class="dt-host-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${g}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${g}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L2 选择（L1选择后显示）
  const l2Options = L1 ? (DECISION_TREE.L2[L1] || []) : [];
  const l2Html = L1 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L2 活动形式 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${l2Options.map(opt => {
          const selected = L2 === opt.value;
          return `<button class="dt-l2-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L3 选择（L2选择后显示）
  const l3Html = L2 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L3 时长 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L3.map(opt => {
          const selected = L3 === opt.value;
          return `<button class="dt-l3-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L4 选择（L3选择后显示）
  const l4Html = L3 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L4 发起方向 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L4.map(opt => {
          const selected = L4 === opt.value;
          return `<button class="dt-l4-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 表单区域（L4选择后显示）
  const allSelected = L1 && L2 && L3 && L4 && hostGroup;
  const formHtml = allSelected ? `
    <div class="mt-4 pt-4 border-t border-dashed border-gray-200">
      <div class="text-xs font-bold text-gray-600 mb-3">填写活动信息</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">T-0 日期 <span class="text-red-500">*</span></label>
          <input type="date" id="dt-target-date" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动地点 <span class="text-red-500">*</span></label>
          <input type="text" id="dt-location" class="input-flat w-full" placeholder="活动地点">
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动名称 <span class="text-red-500">*</span></label>
        <input type="text" id="dt-title" class="input-flat w-full" placeholder="活动名称">
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动描述（选填）</label>
        <textarea id="dt-desc" class="input-flat w-full resize-none" rows="2" placeholder="简要描述活动内容"></textarea>
      </div>

      <!-- T-190 活动角色：创建即赋权，组织者默认组长本人 -->
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动角色（创建即赋权，组织者默认组长本人）</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-[12px] text-gray-400 mb-1">组织者（默认组长本人，可改）</div>
            <div id="dt-org-picker"></div>
          </div>
          <div>
            <div class="text-[12px] text-gray-400 mb-1">深度参与者（选填）</div>
            <div id="dt-deep-picker"></div>
          </div>
        </div>
      </div>

      <!-- SOP 预览 -->
      <div class="mb-4 p-3 rounded-lg bg-white">
        <div class="text-xs font-bold text-gray-600 mb-2">SOP 任务节点预览</div>
        <div id="dt-sop-preview" class="space-y-1 text-xs text-gray-500">
          ${_renderSopPreview()}
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button id="dt-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">写入活动</button>
        <button id="dt-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
      ${stepperHtml}
      ${l1Html}
      ${hostGroupHtml}
      ${l2Html}
      ${l3Html}
      ${l4Html}
      ${formHtml}
    </div>
  `;
}

function _renderSopPreview() {
  return dt.renderSopPreview();
}

function _bindDecisionTreeEvents(container) {
  // 创建/收起按钮
  container.querySelector('#btn-leader-create')?.addEventListener('click', () => {
    dt.showPanel = !dt.showPanel;
    if (!dt.showPanel) dt.reset();
    const state = getAppState();
    const filteredState = _filterByRole(state, 'leader');
    _renderWriteContent(filteredState.activities || []);
  });

  // L1 按钮
  container.querySelectorAll('.dt-l1-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      dt.select('L1', val);
      // L1 变更时重置后续选择
      dt.select('L2', null);
      dt.select('L3', null);
      dt.select('L4', null);
      dt.select('hostGroup', null);
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // 承办党小组按钮
  container.querySelectorAll('.dt-host-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('hostGroup', btn.dataset.value);
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // L2 按钮
  container.querySelectorAll('.dt-l2-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L2', btn.dataset.value);
      dt.select('L3', null);
      dt.select('L4', null);
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // L3 按钮
  container.querySelectorAll('.dt-l3-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L3', btn.dataset.value);
      dt.select('L4', null);
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // L4 按钮
  container.querySelectorAll('.dt-l4-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L4', btn.dataset.value);
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // 取消按钮
  container.querySelector('#dt-cancel')?.addEventListener('click', () => {
    dt.reset();
    const state = getAppState();
    const filteredState = _filterByRole(state, 'leader');
    _renderWriteContent(filteredState.activities || []);
  });

  // 写入活动按钮
  container.querySelector('#dt-submit')?.addEventListener('click', async () => {
    const { L1, L2, L3, L4, hostGroup } = dt.selections;
    const targetDate = container.querySelector('#dt-target-date')?.value;
    const location = container.querySelector('#dt-location')?.value?.trim();
    const title = container.querySelector('#dt-title')?.value?.trim();
    const desc = container.querySelector('#dt-desc')?.value?.trim();

    // 校验必填
    if (!targetDate) { showToast('error', '请填写 T-0 日期'); return; }
    if (!location) { showToast('error', '请填写活动地点'); return; }
    if (!title) { showToast('error', '请填写活动名称'); return; }

    const l1Label = DECISION_TREE.L1.find(o => o.value === L1)?.label || L1;
    const l2Label = DECISION_TREE.L2[L1]?.find(o => o.value === L2)?.label || L2;
    const scenarioId = dt.getScenarioId();

    try {
      const currentLeaderId = AuthStore.getCurrentUser()?.personId || 'p4';
      const activityData = {
        title,
        // L2 与 L1 同名时（党小组会无子分类）不重复拼接
        type: l2Label && l2Label !== l1Label ? `${l1Label}·${l2Label}` : l1Label,
        date: targetDate,
        targetDate,
        location,
        description: desc || '',
        organizer: currentLeaderId, // 顶层 organizer 写真实 personId（原则7 同一套数据，修复 'leader' 角色名临时方案）
        direction: L4,
        duration: L3,
        hostGroup,
        scenarioId,
        status: 'draft',
        visibility: 'group',
        createdBy: currentLeaderId,
      };

      // T-190：创建时同步赋权——组织者（默认组长本人）+ 深度参与者写入主源 assignments
      const organizerIds = _dtOrgPicker ? _dtOrgPicker.getSelected() : [currentLeaderId];
      const deepIds = _dtDeepPicker ? _dtDeepPicker.getSelected() : [];
      const assignments = [
        ...organizerIds.map(personId => ({ personId, role: 'organizer' })),
        ...deepIds.map(personId => ({ personId, role: 'deep' })),
      ];
      // T-190 修复：删除「清空后强加组长本人」兜底——与 spec 偏差A「未选人保留待办兜底」矛盾，
      // 该兜底使 assignments 永不为空，mock.js 的 assignments.length===0 分支永不触发，待办从未派生
      activityData.assignments = assignments;

      const { activity, taskCount } = await writeActivityWithSOP(activityData, scenarioId, targetDate);

      // 同步赋权：追加审计快照 + 通知被赋权人（主源已由创建写入，原则7 不重复填写）
      // 组长本人作为默认组织者属发起人，不重复计入赋权统计/快照/通知
      const actorId = AuthStore.getCurrentUser()?.personId;
      const grantedEntries = assignments.filter(a => a.personId !== currentLeaderId);
      const granted = AuthStore.recordProjectGrants(activity.id, grantedEntries, actorId);
      if (granted > 0) {
        showToast('success', `已同步赋权 ${granted} 名成员`);
      }

      showToast('success', `活动「${title}」创建成功`);
      if (taskCount > 0) {
        showToast('success', `已生成 ${taskCount} 个SOP任务节点`);
      }

      // 4. 渲染工作流可视化面板
      const definitionId = dt.mapToDefinitionId();
      renderWorkflowPanel('leader-workflow', 'leader-tab-content', definitionId, title, 'append');

      // 5. 重置面板并刷新
      dt.reset();
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (err) {
      console.error('[ws-leader] 创建活动失败：', err);
      showToast('error', `创建失败：${err.message}`);
    }
  });
}

function _renderAttendanceContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 清理旧的 PersonPicker 实例
  if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }

  const allRecords = loadAttendanceRecords();
  const myAttendance = allRecords.filter(r => r.activityId && loadActivities().find(a => a.id === r.activityId)?.type === '党小组会');

  // 筛选三会一课和主题党日活动
  const eligibleActivities = loadActivities().filter(a =>
    a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会'
  );

  // 获取本组待补课人员
  const currentLeaderId = 'p4'; // 当前党小组组长（根据实际登录角色调整）
  const myGroup = LEADER_GROUP_MAP[currentLeaderId] || '';
  const myGroupMembers = PEOPLE.filter(p => p.partyGroup === myGroup);
  const myGroupMemberIds = myGroupMembers.map(p => p.id);
  const makeupTasks = loadMakeupTasks();
  const myGroupMakeupTasks = makeupTasks.filter(t =>
    myGroupMemberIds.includes(t.personId) && t.status !== 'completed'
  );

  const formHtml = _attFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="att-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考勤表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择活动 <span class="text-red-500">*</span></label>
          <select id="att-activity-select" class="input-flat text-xs w-full">
            <option value="">请选择活动</option>
            ${eligibleActivities.map(a => `<option value="${a.id}">${a.title}（${a.date}）</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择参会人员 <span class="text-red-500">*</span></label>
        <div id="att-person-picker-container"></div>
      </div>
      <div id="att-status-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="att-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">提交考勤</button>
        <button id="att-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-xl p-5"">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤上传</h3>
        <button class="btn-md" id="btn-leader-upload-att" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${_attFormVisible ? '收起表单' : '上传考勤表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考勤：党小组组长上传 → 纪检委员确认 → 录入考勤总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_attFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${attendanceToLong(myAttendance).map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${a.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">${ATTENDANCE_STATUS_LABELS[a.status] || a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${a.confirmer === '—' ? '<span class="text-orange-600">待确认</span>' : '<span class="text-green-600">已确认</span>'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
      ${myGroupMakeupTasks.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">待补课人员（${myGroup}）</div>
        <div class="text-xs text-gray-500 mb-2">本组有 ${myGroupMakeupTasks.length} 人缺勤，已生成补课任务</div>
        <div class="space-y-1.5">
          ${myGroupMakeupTasks.map(t => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white ${t.status === 'overdue' ? 'border border-red-100' : 'border border-orange-100'}">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-gray-800">${t.personName}</span>
                <span class="text-xs text-gray-500">${t.activityName}</span>
              </div>
              <div class="flex items-center gap-2">
                ${t.isMandatory
                  ? badgeHtml('必须', 'danger')
                  : badgeHtml('建议', 'info')
                }
                ${t.status === 'overdue'
                  ? badgeHtml('超期', 'danger')
                  : badgeHtml('待补课', 'warning')
                }
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-leader-upload-att')?.addEventListener('click', () => {
    _attFormVisible = !_attFormVisible;
    if (!_attFormVisible && _attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    _renderAttendanceContent();
  });

  // 如果表单可见，初始化 PersonPicker 和绑定事件
  if (_attFormVisible) {
    _initAttForm(container, eligibleActivities);
  }
}

function _initAttForm(container, eligibleActivities) {
  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#att-person-picker-container');
  if (pickerContainer) {
    _attPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参会人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderAttStatusRows(ids);
      }
    });
    _attPickerInstance.render(pickerContainer);
  }

  // 渲染初始状态行（空）
  _renderAttStatusRows([]);

  // 取消按钮
  container.querySelector('#att-form-cancel')?.addEventListener('click', () => {
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    _renderAttendanceContent();
  });

  // 提交按钮
  container.querySelector('#att-form-submit')?.addEventListener('click', () => {
    const activityId = container.querySelector('#att-activity-select')?.value;
    if (!activityId) { showToast('error', '请选择活动'); return; }

    const selectedIds = _attPickerInstance ? _attPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择参会人员'); return; }

    // 收集每人的出勤状态
    const records = [];
    for (const personId of selectedIds) {
      const statusEl = container.querySelector(`#att-status-${personId}`);
      const status = statusEl ? statusEl.value : AttendanceStatus.PRESENT;
      records.push({
        id: 'att_' + Date.now() + '_' + personId,
        personId: personId,
        activityId,
        status,
        recordedBy: null,
        overdue: false,
      });
    }

    // 写入 mockDB
    const allRecords = loadAttendanceRecords();
    allRecords.push(...records);
    saveAttendanceRecords(allRecords);

    // 检查本组是否有缺勤人员
    const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LEAVE).length;
    const baseMsg = `考勤上传成功，共 ${records.length} 条记录，等待纪检委员确认`;
    if (absentCount > 0) {
      showToast('success', `${baseMsg}。本组有 ${absentCount} 人缺勤，已生成补课任务`);
    } else {
      showToast('success', baseMsg);
    }

    // 清理并刷新
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    _renderAttendanceContent();
  });
}

function _renderAttStatusRows(selectedIds) {
  const rowsContainer = document.getElementById('att-status-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  // P2 批量录入：批量设置工具栏一键应用状态，再按需微调个别人
  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人出勤状态</div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xs text-gray-500">批量设置：</span>
      <select id="att-batch-status" class="input-flat text-xs">
        <option value="">— 选择状态 —</option>
        <option value="${AttendanceStatus.PRESENT}">全部出勤</option>
        <option value="${AttendanceStatus.ABSENT}">全部缺勤</option>
        <option value="${AttendanceStatus.LEAVE}">全部请假</option>
      </select>
      <button id="att-batch-apply" type="button" class="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">应用到全部</button>
    </div>
    <div class="space-y-2 max-h-48 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = getPersonById(pid);
        const name = person ? person.name : pid;
        return `
          <div class="flex items-center gap-3 p-2 rounded-lg bg-white">
            <span class="text-sm font-medium text-gray-800 min-w-[60px]">${name}</span>
            <select id="att-status-${pid}" class="input-flat text-xs">
              <option value="${AttendanceStatus.PRESENT}">出勤</option>
              <option value="${AttendanceStatus.ABSENT}">缺勤</option>
              <option value="${AttendanceStatus.LEAVE}">请假</option>
            </select>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const applyBtn = rowsContainer.querySelector('#att-batch-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const batchVal = rowsContainer.querySelector('#att-batch-status')?.value;
      if (!batchVal) { showToast('error', '请先选择要应用的状态'); return; }
      selectedIds.forEach(pid => {
        const sel = rowsContainer.querySelector(`#att-status-${pid}`);
        if (sel) sel.value = batchVal;
      });
      showToast('success', `已批量设为「${ATTENDANCE_STATUS_LABELS[batchVal]}」，可按需微调个别人`);
    });
  }
}

function _renderInspectionContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 清理旧的 PersonPicker 实例
  if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const myInspection = allRecords.filter(r => r.sourceType === SourceType.ACTIVITY);

  // 来源类型选项
  const sourceActivities = loadActivities().filter(a =>
    a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会'
  );
  // T223 专班新者在前（createdAt 降序）
  const sourceTaskforces = TaskForceRecordStore.getAll()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const formHtml = _inspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考察表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">来源类型 <span class="text-red-500">*</span></label>
          <select id="insp-source-type" class="input-flat text-xs w-full">
            <option value="">请选择来源类型</option>
            <option value="activity">活动</option>
            <option value="taskforce">专班</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择具体来源 <span class="text-red-500">*</span></label>
          <select id="insp-source-select" class="input-flat text-xs w-full" disabled>
            <option value="">请先选择来源类型</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择人员 <span class="text-red-500">*</span></label>
        <div id="insp-person-picker-container"></div>
      </div>
      <div id="insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="insp-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">提交考察</button>
        <button id="insp-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-xl p-5"">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考察上传</h3>
        <button class="btn-md" id="btn-leader-upload-insp" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${_inspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考察：党小组组长上传 → 纪检委员确认 → 录入考察总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_inspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(myInspection).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3 text-gray-600">${i.content || i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${i.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-leader-upload-insp')?.addEventListener('click', () => {
    _inspFormVisible = !_inspFormVisible;
    if (!_inspFormVisible && _inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    _renderInspectionContent();
  });

  // 如果表单可见，初始化事件绑定
  if (_inspFormVisible) {
    _initInspForm(container, sourceActivities, sourceTaskforces);
  }
}

function _initInspForm(container, sourceActivities, sourceTaskforces) {
  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#insp-person-picker-container');
  if (pickerContainer) {
    _inspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderInspContentRows(ids);
      }
    });
    _inspPickerInstance.render(pickerContainer);
  }

  // 渲染初始内容行（空）
  _renderInspContentRows([]);

  // 来源类型切换
  const sourceTypeSelect = container.querySelector('#insp-source-type');
  const sourceSelect = container.querySelector('#insp-source-select');
  if (sourceTypeSelect && sourceSelect) {
    sourceTypeSelect.addEventListener('change', () => {
      const type = sourceTypeSelect.value;
      sourceSelect.disabled = !type;
      if (type === 'activity') {
        sourceSelect.innerHTML = `<option value="">请选择活动</option>` +
          sourceActivities.map(a => `<option value="${a.id}" data-name="${a.title}">${a.title}（${a.date}）</option>`).join('');
      } else if (type === 'taskforce') {
        sourceSelect.innerHTML = `<option value="">请选择专班</option>` +
          sourceTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}</option>`).join('');
      } else {
        sourceSelect.innerHTML = '<option value="">请先选择来源类型</option>';
      }
    });
  }

  // 取消按钮
  container.querySelector('#insp-form-cancel')?.addEventListener('click', () => {
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    _renderInspectionContent();
  });

  // 提交按钮
  container.querySelector('#insp-form-submit')?.addEventListener('click', () => {
    const sourceType = container.querySelector('#insp-source-type')?.value;
    if (!sourceType) { showToast('error', '请选择来源类型'); return; }

    const sourceOption = container.querySelector('#insp-source-select')?.selectedOptions[0];
    const sourceId = container.querySelector('#insp-source-select')?.value;
    if (!sourceId) { showToast('error', '请选择具体来源'); return; }

    const selectedIds = _inspPickerInstance ? _inspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    // 收集每人的考察内容
    const records = [];
    const tag = sourceType === 'activity' ? '党小组' : '专班';
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${getPersonName(personId)} 的考察内容`); return; }

      const record = {
        id: 'insp_' + Date.now() + '_' + personId,
        sourceType: sourceType === 'activity' ? SourceType.ACTIVITY : SourceType.TASKFORCE,
        activityId: sourceType === 'activity' ? sourceId : null,
        sourceName: sourceType === 'activity' ? null : (sourceOption?.dataset.name || sourceId),
        personId,
        level: ParticipationLevel.ORGANIZE, // 默认组织层级，可由用户选择
        content,   // P1-5 修复：考察内容入 content 字段
        role: '组织者', // role 字段恢复为角色职责标签
        recordedBy: 'u_exec',
        recordedAt: new Date().toISOString(),
        status: 'pending',
      };

      records.push(record);
    }

    // 写入 mockDB
    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);

    // 清理并刷新
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    _renderInspectionContent();
  });
}

function _renderInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('insp-content-rows');
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
          <div class="p-2 rounded-lg bg-white">
            <div class="text-sm font-medium text-gray-800 mb-1">${name}</div>
            <textarea id="insp-content-${pid}" class="input-flat w-full text-xs resize-none" rows="2" placeholder="请填写考察内容描述"></textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── 复盘提交 ──────────────────────────────────────────────────

// 当前展开复盘表单的活动 ID（null 表示全部收起）
let _reviewExpandedId = null;

/**
 * 复盘提交 tab：展示本组活动列表，按复盘状态分桶（待复盘/已复盘），
 * 待复盘活动可展开填写复盘总结并提交。
 */
function _renderReviewContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 当前组长身份（默认 p4 赵六·第三党小组）
  const currentLeaderId = 'p4';
  const myGroup = LEADER_GROUP_MAP[currentLeaderId] || '';

  // 筛选本组活动（三会一课/主题党日等由本组组长组织的活动）
  const myGroupActivities = loadActivities().filter(a => {
    // 按组织者属于本组 或 按 hostGroup 匹配
    const organizer = PEOPLE.find(p => p.id === a.organizer);
    return organizer && organizer.partyGroup === myGroup && a.status !== 'cancelled';
  });

  // 获取已有复盘记录
  const reviewMap = {};
  for (const r of loadActivityReviews()) {
    if (r.activityId) reviewMap[r.activityId] = r;
  }

  // 按复盘状态分桶
  const pending = [];   // 待复盘：未提交 / 已打回
  const completed = []; // 已复盘：已上传 / 批注中 / 已确认
  for (const act of myGroupActivities) {
    const rev = reviewMap[act.id];
    if (!rev || rev.reviewStatus === ReviewStatus.NOT_SUBMITTED || rev.reviewStatus === ReviewStatus.REJECTED) {
      pending.push({ act, rev: rev || null });
    } else {
      completed.push({ act, rev });
    }
  }

  // 复盘状态颜色映射
  const reviewColorMap = {
    [ReviewStatus.NOT_SUBMITTED]: 'bg-red-100 text-red-700',
    [ReviewStatus.UPLOADED]: 'bg-orange-100 text-orange-700',
    [ReviewStatus.ANNOTATING]: 'bg-blue-100 text-blue-700',
    [ReviewStatus.CONFIRMED]: 'bg-green-100 text-green-700',
    [ReviewStatus.REJECTED]: 'bg-red-100 text-red-700',
  };

  function renderActivityCard(item, bucket) {
    const { act, rev } = item;
    const isPending = bucket === 'pending';
    const statusLabel = rev ? REVIEW_STATUS_LABELS[rev.reviewStatus] : '未提交';
    const statusColor = reviewColorMap[rev?.reviewStatus || ReviewStatus.NOT_SUBMITTED] || 'bg-gray-100 text-gray-500';
    const isExpanded = _reviewExpandedId === act.id;

    return `
      <div class="leader-review-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors ${rev?.reviewStatus === ReviewStatus.REJECTED ? 'border border-red-100' : ''}" data-act-id="${act.id}">
        <div class="flex items-center justify-between cursor-pointer review-toggle">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${act.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${act.date || ''} ${act.type ? '· ' + act.type : ''}</div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
            ${rev?.reviewStatus === ReviewStatus.REJECTED ? '<span class="text-xs text-red-500">需修改</span>' : ''}
          </div>
        </div>
        ${isExpanded && isPending ? _renderReviewForm(act, rev) : ''}
        ${isExpanded && !isPending && rev ? _renderReviewDetail(rev) : ''}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card rounded-xl p-5"">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">复盘提交</h3>
      </div>
      <div class="text-xs text-gray-500 mb-4">党小组组长提交活动复盘总结 → 纪检委员批注/确认</div>

      <!-- 待复盘 -->
      <div class="mb-4">
        <div class="text-xs font-bold text-gray-600 mb-2">待复盘 <span class="text-gray-400 font-normal">(${pending.length})</span></div>
        <div class="space-y-2" id="leader-review-pending">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-3">暂无待复盘活动</p>' :
            pending.map(item => renderActivityCard(item, 'pending')).join('')}
        </div>
      </div>

      <!-- 已复盘 -->
      <div class="pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">已复盘 <span class="text-gray-400 font-normal">(${completed.length})</span></div>
        <div class="space-y-2" id="leader-review-completed">
          ${completed.length === 0 ? '<p class="text-xs text-gray-400 text-center py-3">暂无已复盘活动</p>' :
            completed.map(item => renderActivityCard(item, 'completed')).join('')}
        </div>
      </div>
    </div>
  `;

  // 绑定活动卡片点击展开/收起
  container.querySelectorAll('.review-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const item = toggle.closest('.leader-review-item');
      const actId = item?.dataset.actId;
      _reviewExpandedId = _reviewExpandedId === actId ? null : actId;
      _renderReviewContent();
    });
  });

  // 绑定复盘表单提交按钮
  container.querySelectorAll('.btn-review-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const actId = btn.dataset.actId;
      const textarea = container.querySelector(`#review-textarea-${actId}`);
      const content = textarea?.value?.trim();
      if (!content) {
        showToast('error', '请填写复盘总结');
        return;
      }

      // 在复盘记录中查找或创建
      const existIdx = findActivityReviewIndex(actId);
      if (existIdx >= 0) {
        // 更新已有记录（如已打回重新提交）
        const existing = loadActivityReviews()[existIdx];
        const isResubmit = existing.reviewStatus === ReviewStatus.REJECTED;
        updateActivityReview(actId, {
          reviewContent: content,
          reviewStatus: ReviewStatus.UPLOADED,
          submittedAt: new Date().toISOString(),
          ...(isResubmit ? { annotation: '' } : {}),
        });
      } else {
        // 新建复盘记录
        addActivityReview({
          id: 'rev_' + Date.now(),
          activityId: actId,
          organizerId: currentLeaderId,
          progress: '已完成',
          overdue: false,
          reviewStatus: ReviewStatus.UPLOADED,
          reviewContent: content,
          submittedAt: new Date().toISOString(),
        });
      }

      _reviewExpandedId = null;
      showToast('success', '复盘总结已提交，等待纪检委员确认');
      _renderReviewContent();
    });
  });
}

/** 渲染复盘表单（待复盘活动展开时） */
function _renderReviewForm(act, rev) {
  const existingContent = rev?.reviewContent || '';
  const isRejected = rev?.reviewStatus === ReviewStatus.REJECTED;
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      ${isRejected && rev.annotation ? `
        <div class="mb-2 p-2 rounded-lg bg-red-50 border border-red-100">
          <div class="text-xs text-red-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-red-700">${rev.annotation}</div>
        </div>
      ` : ''}
      <textarea id="review-textarea-${act.id}" class="input-flat w-full text-xs resize-none" rows="4" placeholder="请填写复盘总结（活动成效、经验教训、改进建议等）">${existingContent}</textarea>
      <div class="flex items-center gap-2 mt-2">
        <button class="btn-review-submit text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" data-act-id="${act.id}" style="background:${accent};cursor:pointer;">提交复盘</button>
        <span class="text-xs text-gray-400">提交后纪检委员将在监督复盘tab收到通知</span>
      </div>
    </div>
  `;
}

/** 渲染复盘详情（已复盘活动展开时） */
function _renderReviewDetail(rev) {
  return `
    <div class="mt-3 pt-3 border-t border-gray-100">
      <div class="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">${rev.reviewContent || ''}</div>
      ${rev.submittedAt ? `<div class="text-xs text-gray-400 mt-1">提交时间：${rev.submittedAt.slice(0, 16).replace('T', ' ')}</div>` : ''}
      ${rev.annotation ? `
        <div class="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
          <div class="text-xs text-blue-500 font-bold mb-1">纪检委员批注</div>
          <div class="text-xs text-blue-700">${rev.annotation}</div>
        </div>
      ` : ''}
    </div>
  `;
}

registerRenderCallback(renderLeaderUI);

// 初始化待办种子数据
seedTodos();

loadWorkspaceData({ role: 'leader', fallbackData: () => loadActivities(), logTag: 'ws-leader' });
