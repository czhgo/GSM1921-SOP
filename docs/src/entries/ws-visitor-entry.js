import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { _fmtDate, showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { NoticeStore } from '../services/notice.js';
import { AuthStore } from '../services/auth.js';
import { PEOPLE, _personName } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { loadAttendanceRecords } from '../services/attendance.js';
import { loadInspectionRecords } from '../services/inspection.js';
import { inspectionToDisplay } from '../mock/index.js';
import { loadActivities } from '../services/activity.js';
import { getActivityTypeColors, ROLE_COLORS } from '../core/constants.js';
import { renderTabBar } from '../components/tab-bar.js';
import { icon } from '../core/icons.js';
import { renderQueryView } from '../components/query-view.js';
import { renderTodoList } from '../components/todo-list.js';
import { TodoStore, seedTodos, TodoStatus, VisitorTodoDeriver } from '../services/todo.js';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'participant' });

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();

function renderVisitorUI(state) {
  let activities = state.activities || [];
  const allActivities = loadActivities();
  if (activities.length === 0 && allActivities.length > 0) {
    activities = allActivities.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('visitor-content');
  if (!container) return;

  const currentUser = AuthStore.getCurrentUser();

  // 欢迎语替代身份标记（普通参与者无右上角 role-label，书记 2026-08-01 决策）
  const userName = currentUser?.personId ? (PEOPLE.find(p => p.id === currentUser.personId)?.name || '') : '';
  const welcomeLine = userName
    ? `
    <div class="mb-4 flex items-center gap-2.5">
      <span class="inline-block w-1 h-4 rounded-full flex-shrink-0" style="background:var(--party-red);"></span>
      <p class="text-sm text-gray-700"><span class="font-semibold text-gray-800">欢迎回来，${userName}</span><span class="text-xs text-gray-400 ml-1">· 支部动态与个人成长一览</span></p>
    </div>`
    : '';

  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();

  // visitor 待办派生：通知待阅读 + 活动待参与（幂等去重，可随渲染重复调用）
  if (currentUser?.personId) {
    VisitorTodoDeriver.deriveAll({
      personId: currentUser.personId,
      person: PEOPLE.find(p => p.id === currentUser.personId) || null,
      notices,
      activities,
    });
  }

  const urlParams = CrossPageState.getURLParams();
  const highlightId = urlParams.activityId || null;

  const tabBar = renderTabBar({
    prefix: 'visitor',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      { id: 'projects', label: '项目分工', render: (ctx) => _renderProjectDivision(ctx.activities, ctx.allTf, ctx.authRecords), groupLabel: '党建' },
      { id: 'activities', label: '活动动态', render: (ctx) => _renderActivities(ctx.activities, ctx.highlightId), groupLabel: '党建' },
      { id: 'attendance', label: '考勤概况', render: (ctx) => _renderAttendance(ctx.activities), groupLabel: '党建' },
      { id: 'inspection', label: '我的考察', render: () => _renderMyInspection(), groupLabel: '党建' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'todo',
    renderCtx: { activities, allTf: taskforces, authRecords: AuthStore.getAuthorizations(), highlightId },
    storageKey: 'workflowos_tab_visitor',
  });

  container.innerHTML = `
    ${welcomeLine}
    ${tabBar.html}
  `;

  tabBar.bindEvents(container);
  if (highlightId) {
    tabBar.activate('activities');
  } else {
    tabBar.activate(tabBar.activeTab);
  }
}

// ── 项目分工 Tab ──────────────────────────────────
function _renderProjectDivision(activities, taskforces, authRecords) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  // 构建统一项目列表：活动 + 专班
  const actProjects = activities
    .filter(a => !a.archived && a.status !== 'cancelled')
    .map(a => {
      // 人员：从 assignments + authRecords 合并
      const personnel = _buildPersonnel(a.id, a.assignments || [], authRecords);
      const organizer = PEOPLE.find(p => p.id === a.organizer);
      return {
        id: a.id,
        name: a.title || '未命名',
        type: '活动',
        typeBadge: a.type || '活动',
        group: organizer ? organizer.partyGroup : '',
        status: _actStatusLabel(a.status),
        statusColor: _actStatusColor(a.status),
        date: a.date || '',
        personnel,
      };
    });

  const tfProjects = taskforces.map(t => {
    const personnel = _buildPersonnelFromTf(t, authRecords);
    return {
      id: t.id,
      name: t.name || '未命名',
      type: '专班',
      typeBadge: '专班',
      group: '',
      status: _tfStatusLabel(t.status),
      statusColor: _tfStatusColor(t.status),
      date: t.deadline || t.createdAt || '',
      personnel,
    };
  });

  const allProjects = [...actProjects, ...tfProjects];

  // 党小组列表（用于筛选）
  const partyGroups = [...new Set(PEOPLE.map(p => p.partyGroup).filter(Boolean))].sort();

  tc.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3 items-center">
      <select id="visitor-proj-type" class="input-flat text-xs w-20">
        <option value="">全部</option>
        <option value="活动">活动</option>
        <option value="专班">专班</option>
      </select>
      <select id="visitor-proj-group" class="input-flat text-xs w-28">
        <option value="">全部党小组</option>
        ${partyGroups.map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
      <input type="text" id="visitor-proj-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索项目名称或人员...">
      <span id="visitor-proj-count" class="text-[10px] text-gray-400 ml-1"></span>
    </div>
    <div id="visitor-proj-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-proj-list');
    const countEl = document.getElementById('visitor-proj-count');
    if (!listEl) return;
    const typeFilter = document.getElementById('visitor-proj-type')?.value || '';
    const groupFilter = document.getElementById('visitor-proj-group')?.value || '';
    const q = (document.getElementById('visitor-proj-search')?.value || '').trim().toLowerCase();

    const filtered = allProjects.filter(p => {
      if (typeFilter && p.type !== typeFilter) return false;
      if (groupFilter && p.group !== groupFilter) return false;
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const personnelMatch = p.personnel.some(pm => pm.name.toLowerCase().includes(q));
        if (!nameMatch && !personnelMatch) return false;
      }
      return true;
    });

    if (countEl) countEl.textContent = `${filtered.length} 个项目`;

    listEl.innerHTML = filtered.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-6">无匹配项目</p>'
      : `<div class="space-y-2">${filtered.map(p => _renderProjectCard(p)).join('')}</div>`;
  }

  document.getElementById('visitor-proj-type')?.addEventListener('change', renderList);
  document.getElementById('visitor-proj-group')?.addEventListener('change', renderList);
  document.getElementById('visitor-proj-search')?.addEventListener('input', renderList);
  renderList();
}

function _buildPersonnel(projectId, assignments, authRecords) {
  // 合并 assignments（mock）+ authRecords（运行时赋权）
  const map = new Map(); // personId → { name, role }
  for (const a of assignments) {
    const person = PEOPLE.find(p => p.id === a.personId);
    if (person) map.set(a.personId, { name: person.name, role: a.role });
  }
  for (const r of authRecords) {
    if (r.scopeRef === projectId && ['organizer', 'deep'].includes(r.role)) {
      const person = PEOPLE.find(p => p.id === r.targetPersonId);
      if (person && !map.has(r.targetPersonId)) {
        map.set(r.targetPersonId, { name: person.name, role: r.role });
      }
    }
  }
  return [...map.values()];
}

function _buildPersonnelFromTf(tf, authRecords) {
  const map = new Map();
  // members 数组
  if (Array.isArray(tf.members)) {
    for (const m of tf.members) {
      if (!m.personId) continue;
      const person = PEOPLE.find(p => p.id === m.personId);
      if (person) map.set(m.personId, { name: person.name, role: m.role });
    }
  }
  // initiator
  if (tf.initiator) {
    const person = PEOPLE.find(p => p.id === tf.initiator);
    if (person && !map.has(tf.initiator)) {
      map.set(tf.initiator, { name: person.name, role: 'initiator' });
    }
  }
  // authRecords 补充
  for (const r of authRecords) {
    if (r.scopeRef === tf.id && ['organizer', 'deep'].includes(r.role)) {
      const person = PEOPLE.find(p => p.id === r.targetPersonId);
      if (person && !map.has(r.targetPersonId)) {
        map.set(r.targetPersonId, { name: person.name, role: r.role });
      }
    }
  }
  return [...map.values()];
}

function _actStatusLabel(status) {
  const map = { completed: '已完成', ongoing: '进行中', published: '已发布', draft: '草稿', cancelled: '已取消' };
  return map[status] || status || '进行中';
}
function _actStatusColor(status) {
  const map = { completed: 'bg-gray-100 text-gray-600', ongoing: 'bg-green-100 text-green-700', published: 'bg-blue-100 text-blue-700', draft: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-600' };
  return map[status] || 'bg-gray-100 text-gray-500';
}
function _tfStatusLabel(status) {
  const map = { recruiting: '招募中', active: '进行中', completed: '已完成', dissolved: '已解散', draft: '草稿' };
  return map[status] || status || '进行中';
}
function _tfStatusColor(status) {
  const map = { recruiting: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', dissolved: 'bg-red-100 text-red-600', draft: 'bg-yellow-100 text-yellow-700' };
  return map[status] || 'bg-gray-100 text-gray-500';
}

function _personnelRoleLabel(role) {
  const map = { organizer: '组织者', deep: '深度参与', participant: '参与者', initiator: '发起人' };
  return map[role] || role;
}
function _personnelRoleColor(role) {
  // 角色色统一来自 ROLE_COLORS（organizer=天蓝 / deep=紫 / participant=灰 / initiator=靛蓝），
  // 与活动类型暖色系（红/金）彻底区分，避免"红色太多、意义不明确"（书记 2026-08-01 决策）
  const c = ROLE_COLORS[role] || ROLE_COLORS.participant;
  return `background:${c.bg};color:${c.text};border:1px solid ${c.border};`;
}

function _renderProjectCard(project) {
  const organizers = project.personnel.filter(p => p.role === 'organizer' || p.role === 'initiator');
  const deepParticipants = project.personnel.filter(p => p.role === 'deep');
  const others = project.personnel.filter(p => p.role === 'participant');

  return `
    <div class="p-3 rounded-lg bg-white">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${project.type === '活动' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}">${project.typeBadge}</span>
          <p class="text-sm font-medium text-gray-800 truncate">${project.name}</p>
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${project.statusColor}">${project.status}</span>
      </div>
      <div class="flex items-center gap-3 text-[11px] text-gray-500 mb-2">
        ${project.group ? `<span class="flex items-center gap-0.5">${project.group}</span>` : ''}
        ${project.date ? `<span class="flex items-center gap-0.5">${project.date}</span>` : ''}
      </div>
      ${project.personnel.length > 0 ? `
        <div class="flex flex-wrap gap-1.5">
          ${organizers.map(p => `<span class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style="${_personnelRoleColor(p.role)}">${p.name}·${_personnelRoleLabel(p.role)}</span>`).join('')}
          ${deepParticipants.map(p => `<span class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style="${_personnelRoleColor(p.role)}">${p.name}·${_personnelRoleLabel(p.role)}</span>`).join('')}
          ${others.map(p => `<span class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style="${_personnelRoleColor(p.role)}">${p.name}</span>`).join('')}
        </div>
      ` : '<p class="text-[10px] text-gray-400">暂无人员</p>'}
    </div>
  `;
}

function _renderActivities(activities, highlightId) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const sorted = [...activities].filter(a => a.date && !a.archived && a.status !== 'cancelled').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  tc.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-500">${sorted.length} 条活动</span>
      <div class="flex gap-1">
        <button class="visitor-view-btn px-2.5 py-1 text-xs rounded-lg border transition-colors" data-vview="list" style="background:rgba(206,17,38,0.08);color:var(--primary-700);border:1px solid rgba(206,17,38,0.2);">
          ${icon('list', { className: 'w-3.5 h-3.5' })} 列表
        </button>
        <button class="visitor-view-btn px-2.5 py-1 text-xs rounded-lg border transition-colors" data-vview="calendar" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">
          ${icon('calendar', { className: 'w-3.5 h-3.5' })} 日历
        </button>
        <button class="visitor-view-btn px-2.5 py-1 text-xs rounded-lg border transition-colors" data-vview="query" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">
          ${icon('search', { className: 'w-3.5 h-3.5' })} 查询
        </button>
      </div>
    </div>
    <div id="visitor-act-view"></div>
  `;

  tc.querySelectorAll('.visitor-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tc.querySelectorAll('.visitor-view-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = 'rgba(206,17,38,0.08)'; btn.style.color = 'var(--primary-700)'; btn.style.border = '1px solid rgba(206,17,38,0.2)';
      const view = btn.dataset.vview;
      if (view === 'list') _renderActListView(sorted, highlightId);
      else if (view === 'calendar') _renderActCalendarView(sorted, highlightId);
      else _renderActQueryView(sorted, highlightId);
    });
  });

  _renderActListView(sorted, highlightId);
}

function _renderActListView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;
  vc.innerHTML = `
    <div class="space-y-2">
      ${sorted.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>' :
        sorted.map(a => {
          const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
          const isHL = highlightId && a.id === highlightId;
          return `
            <div class="flex items-center gap-3 p-3 rounded-lg bg-white ${isHL ? 'border border-blue-400 ring-2 ring-blue-100' : ''}" data-visitor-act-id="${a.id || ''}">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
              </div>
              ${isHL ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">当前</span>' : ''}
            </div>
          `;
        }).join('')}
    </div>
  `;
  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _renderActCalendarView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  const byMonth = {};
  sorted.forEach(a => {
    const m = (a.date || '').substring(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(a);
  });
  const months = Object.keys(byMonth).sort().reverse();

  vc.innerHTML = months.length === 0
    ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>'
    : months.map(m => {
      const acts = byMonth[m];
      const [y, mo] = m.split('-');
      const monthLabel = `${y}年${parseInt(mo)}月`;
      return `
        <div class="mb-5">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            ${icon('calendar', { stroke: 'var(--primary-700)', className: 'w-3.5 h-3.5' })}
            ${monthLabel}
            <span class="text-[10px] font-normal text-gray-400">${acts.length} 场</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${acts.map(a => {
              const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
              const isHL = highlightId && a.id === highlightId;
              const day = (a.date || '').substring(8, 10);
              return `
                <div class="flex items-start gap-3 p-3 rounded-lg bg-white ${isHL ? 'border border-blue-400 ring-2 ring-blue-100' : ''}" data-visitor-act-id="${a.id || ''}">
                  <div class="text-center flex-shrink-0 w-10">
                    <div class="text-lg font-bold" style="color:${color.text || color.dot};line-height:1;">${day || '?'}</div>
                    <div class="text-[10px] text-gray-400">日</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
                  </div>
                  ${isHL ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0 mt-0.5">当前</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _renderActQueryView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  const typeOptions = Object.keys(ACTIVITY_TYPE_COLORS).map(key => ({
    value: key,
    label: key,
  }));

  renderQueryView(vc, {
    searchPlaceholder: '搜索活动名称、地点...',
    searchKey: 'title',
    filters: [
      { key: 'type', label: '活动类型', options: typeOptions },
    ],
    data: sorted,
    renderRow: (a) => {
      const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
      const isHL = highlightId && a.id === highlightId;
      return `
        <div class="flex items-center gap-3 p-3 rounded-lg bg-white ${isHL ? 'border border-blue-400 ring-2 ring-blue-100' : ''}" data-visitor-act-id="${a.id || ''}">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
            <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
          </div>
          ${isHL ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">当前</span>' : ''}
        </div>
      `;
    },
    emptyMessage: '无匹配活动',
    sortKey: 'date',
    sortDir: 'desc',
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _renderAttendance(activities) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActs = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);
  tc.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="visitor-att-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索活动名称...">
    </div>
    <div id="visitor-att-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-att-list');
    if (!listEl) return;
    const q = (document.getElementById('visitor-att-search')?.value || '').trim().toLowerCase();
    const filtered = q ? monthActs.filter(a => (a.title || '').toLowerCase().includes(q)) : monthActs;
    listEl.innerHTML = `
      <div class="space-y-2">
        ${filtered.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">无匹配考勤数据</p>' :
          filtered.map(act => {
            const records = loadAttendanceRecords().filter(r => r.activityId === act.id);
            const present = records.filter(r => r.status === 'present').length;
            const total = records.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            const rateColor = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600';
            return `
              <div class="flex items-center justify-between p-3 rounded-lg bg-white">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800">${act.title}</p>
                  <p class="text-xs text-gray-400">${act.date}</p>
                </div>
                <div class="text-xs font-medium ${rateColor}">出勤 ${present}/${total} · ${rate}%</div>
              </div>
            `;
          }).join('')}
      </div>
    `;
  }

  document.getElementById('visitor-att-search')?.addEventListener('input', renderList);
  renderList();
}

// ── 我的考察 Tab ──────────────────────────────────
// 个人考察记录查询视图（spec §五 数据访问规则：支部成员对自己的历次活动参与考察情况有查询视图）
function _renderMyInspection() {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    tc.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">请先登录</p>';
    return;
  }

  const personId = user.personId;
  const allRecords = loadInspectionRecords();
  const myRecords = allRecords.filter(r => r.personId === personId);
  const display = inspectionToDisplay(myRecords);
  const total = display.length;
  const confirmed = display.filter(r => r.status === 'confirmed').length;
  const pending = display.filter(r => r.status === 'pending').length;

  // 按录入时间倒序
  const sorted = [...display].sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));

  tc.innerHTML = `
    <div class="mb-3 p-3 rounded-lg bg-white flex items-center gap-4">
      <div class="flex-1">
        <p class="text-sm font-semibold text-gray-800">我的考察记录</p>
        <p class="text-xs text-gray-400 mt-0.5">共 ${total} 条 · 已确认 ${confirmed} · 待确认 ${pending}</p>
      </div>
    </div>
    <div id="visitor-insp-list" class="space-y-2"></div>
  `;

  const listEl = document.getElementById('visitor-insp-list');
  if (!listEl) return;

  if (sorted.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无考察记录</p>';
    return;
  }

  const SOURCE_TYPE_LABEL = { activity: '活动', taskforce: '专班' };
  const LEVEL_LABEL = { organize: '组织者', deep: '深度参与者' };
  // 考察等级本质是角色维度 → 复用 ROLE_COLORS 冷色系（organizer=天蓝 / deep=紫），不再用红（书记 2026-08-01）
  const LEVEL_ROLE = { organize: 'organizer', deep: 'deep' };

  listEl.innerHTML = sorted.map(r => {
    const statusCls = r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
    const statusText = r.status === 'confirmed' ? '已确认' : '待确认';
    const sourceLabel = SOURCE_TYPE_LABEL[r.sourceType] || r.sourceType;
    const levelLabel = LEVEL_LABEL[r.level] || r.level;
    const levelRole = LEVEL_ROLE[r.level] || 'participant';
    const lc = ROLE_COLORS[levelRole] || ROLE_COLORS.participant;
    const sourceTitle = r.activityTitle || r.sourceName || '—';
    const recordedDate = r.recordedAt ? r.recordedAt.slice(0, 10) : '—';

    return `
      <div class="p-3 rounded-lg bg-white hover:shadow-sm transition-shadow">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700">${sourceLabel}</span>
            <span class="px-1.5 py-0.5 text-[10px] font-medium rounded" style="background:${lc.bg};color:${lc.text};border:1px solid ${lc.border};">${levelLabel}</span>
          </div>
          <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full ${statusCls}">${statusText}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${sourceTitle}</p>
        ${r.role ? `<p class="text-xs text-gray-500 mt-1">工作内容：${r.role}</p>` : ''}
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <p class="text-[10px] text-gray-400">录入人：${r.recordedByName || '—'}</p>
          <p class="text-[10px] text-gray-400">${recordedDate}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;

function _renderTodoContent() {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  const groupedTodos = TodoStore.getGroupedByCategory('visitor');
  const stats = TodoStore.getStatsByRole('visitor');
  const selectedTodo = _selectedTodoId ? TodoStore.getById(_selectedTodoId) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'visitor',
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
    // 待办行动按钮金色系（书记 2026-08-01 决策：改金色，与完成绿呼应，红色收敛到品牌语义）
    actionBtnStyle: 'background:var(--party-gold);color:#B45309;',
  });

  const detailHtml = selectedTodo ? _renderTodoDetail(selectedTodo) : `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">点击左侧待办查看详情</p>
      <p class="text-xs mt-1">或直接点击"去阅读/去提交"等按钮处理</p>
    </div>
  `;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--party-gold);">
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
          <button class="visitor-todo-detail-complete text-xs px-4 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:#16A34A;">标记完成</button>
          ${todo.actionType ? `<button class="visitor-todo-detail-action text-xs px-4 py-1.5 rounded-lg transition-colors" style="background:rgba(255,215,0,0.12);color:#B45309;border:1px solid rgba(255,215,0,0.35);">处理</button>` : ''}
        ` : '<span class="text-xs text-green-600">已完成</span>'}
      </div>
    </div>
  `;
}

function _handleTodoAction(todo) {
  // 通知类待办：优先跳转通知详情页
  if (todo.sourceType === 'notice' && todo.actionData?.noticeId) {
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${todo.actionData.noticeId}`;
    return;
  }
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    read: 'activities',
    submit: 'inspection',
    participate: 'activities',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.visitor-tab-btn[data-visitor-tab="${targetTab}"]`);
    if (btn) btn.click();
    const tabLabels = { read: '活动动态', submit: '我的考察', participate: '活动动态' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

function _bindTodoDetailEvents() {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return;
  container.querySelector('.visitor-todo-detail-complete')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      TodoStore.complete(_selectedTodoId);
      _selectedTodoId = null;
      showToast('success', '待办已完成');
      _renderTodoContent();
    }
  });
  container.querySelector('.visitor-todo-detail-action')?.addEventListener('click', () => {
    if (_selectedTodoId) {
      const todo = TodoStore.getById(_selectedTodoId);
      if (todo) _handleTodoAction(todo);
    }
  });
}

registerRenderCallback(renderVisitorUI);

seedTodos();
loadWorkspaceData({ role: 'all', selectedRole: null, storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-visitor' });
