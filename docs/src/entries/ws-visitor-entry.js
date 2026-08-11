﻿import { setState, registerRenderCallback } from '../core/state.js?v=20260811d';
import { showToast, flashHighlight } from '../core/utils.js?v=20260811d';
import { CrossPageState } from '../core/cross-page-state.js?v=20260811d';
import { bootstrapPage } from '../core/bootstrap.js?v=20260811d';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260811d';
import { NoticeStore } from '../services/notice.js?v=20260811d';
import { SignupStore } from '../services/signup.js?v=20260811d';
import { AuthStore } from '../services/auth.js?v=20260811d';
import { PEOPLE } from '../mock/index.js?v=20260811d';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260811d';
import { loadActiveAttendanceRecords } from '../services/attendance.js?v=20260811d';
import { loadActiveInspectionRecords } from '../services/inspection.js?v=20260811d';
import { inspectionToDisplay } from '../mock/index.js?v=20260811d';
import { loadActivities } from '../services/activity.js?v=20260811d';
import { getActivityTypeColors, ROLE_COLORS } from '../core/constants.js?v=20260811d';
import { renderTabBar } from '../components/tab-bar.js?v=20260811d';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260811d';
import { renderWorkOverview } from '../components/work-overview.js?v=20260811d';
import { icon } from '../core/icons.js?v=20260811d';
import { renderQueryView } from '../components/query-view.js?v=20260811d';
import { renderTodoList } from '../components/todo-list.js?v=20260811d';
import { TodoStore, seedTodos, VisitorTodoDeriver } from '../services/todo.js?v=20260811d';
import { badgeHtml } from '../components/badge.js?v=20260811d';

const { accent, accentRgba, accentBorder } = await bootstrapPage({ module: 'workspace', accentRole: 'participant' });

let _visitorNavConsumed = false; // URL 跳转参数一次性消费标志
// "有待办必见待办"一次性消费标志（书记 2026-08-10 裁定）
let _todoPriorityConsumed = false;
// 首页专班跳转定位目标（REVIEW_QUEUE J2 裁定 2026-08-08：visitor→项目分工 tab 定位高亮专班卡片）
let _visitorHighlightTfId = null;
// 项目分工子视图（书记 2026-08-10 裁定第5点：区分「我的分工」（以人为中心）与「全局分工」（全局查询））
let _projSubView = 'mine'; // 'mine' | 'all'

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();

// 活动动态列表分页（书记 2026-08-08 决策：活动页分页，每页 10 条）
const ACTIVITY_PAGE_SIZE = 10;
let _visitorActPage = 1; // 当前页（模块级，切换 列表/日历/查询 视图后保留）

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

  // visitor 待办派生：通知待阅读 + 活动/专班待参与（幂等去重，可随渲染重复调用）
  const signups = SignupStore.getAll();
  if (currentUser?.personId) {
    VisitorTodoDeriver.deriveAll({
      personId: currentUser.personId,
      person: PEOPLE.find(p => p.id === currentUser.personId) || null,
      notices,
      activities,
      signups,
    });
    VisitorTodoDeriver.deriveFromTaskforceSignups({ personId: currentUser.personId, taskforces, signups });
  }

  const urlParams = CrossPageState.getURLParams();
  const highlightId = urlParams.activityId || null;

  // 有待办必见待办（书记 2026-08-10 裁定）：仅首次渲染生效
  let priorityTab;
  if (!_todoPriorityConsumed) {
    _todoPriorityConsumed = true;
    priorityTab = TodoStore.getGroupedByAction('visitor').length > 0 ? 'todo' : undefined;
  }

  const tabBar = renderTabBar({
    prefix: 'visitor',
    tabs: [
      { id: 'todo', label: '待办', render: () => _renderTodoContent(), groupLabel: '工作台' },
      // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合）
      { id: 'overview', label: '工作概况', render: () => { const el = document.getElementById('visitor-tab-content'); if (el) return renderWorkOverview(el, { role: 'visitor', personId: AuthStore.getCurrentUser()?.personId || 'p5', accent, prefix: 'visitor' }); }, groupLabel: '工作台' },
      { id: 'projects', label: '项目分工', render: (ctx) => _renderProjectDivision(ctx.activities, ctx.allTf, ctx.authRecords), groupLabel: '党建' },
      { id: 'activities', label: '活动动态', render: (ctx) => _renderActivities(ctx.activities, ctx.highlightId), groupLabel: '党建' },
      { id: 'attendance', label: '考勤概况', render: (ctx) => _renderAttendance(ctx.activities), groupLabel: '党建' },
      { id: 'inspection', label: '我的考察', render: () => _renderMyInspection(), groupLabel: '党建' },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'todo',
    renderCtx: { activities, allTf: taskforces, authRecords: AuthStore.getAuthorizations(), highlightId },
    storageKey: 'workflowos_tab_visitor',
    priorityTab,
    extraRightHtml: renderReportEntryHtml({ accent, accentRgba }),
  });

  container.innerHTML = `
    ${welcomeLine}
    ${tabBar.html}
  `;

  tabBar.bindEvents(container);
  bindReportEntry(container); // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  // 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）
  // 「查看更多活动」跳转（?view=activities）或指定活动（?activityId=）→ 落在活动动态 tab；
  // 指定专班（?taskforceId=）→ 落在项目分工 tab（REVIEW_QUEUE J2 裁定，定位高亮专班卡片）；
  // 一次性消费：消费后清除 URL 参数，避免后续 setState 重复触发切 tab / 高亮。
  if (!_visitorNavConsumed) {
    const tfId = urlParams.taskforceId || null;
    if (tfId) {
      _visitorHighlightTfId = tfId;
      CrossPageState.clearParam('taskforceId');
      tabBar.activate('projects');
    } else if (highlightId || urlParams.view === 'activities') {
      tabBar.activate('activities');
    } else {
      tabBar.activate(tabBar.activeTab);
    }
    if (highlightId || urlParams.view === 'activities') {
      CrossPageState.clearParam('activityId');
      CrossPageState.clearParam('view');
    }
    _visitorNavConsumed = true;
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
        done: a.archived || ['completed', 'cancelled'].includes(a.status),
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
      done: ['completed', 'archived', 'dissolved'].includes(t.status),
    };
  });

  // T223 排序统一：未完成在前、已完成在后，组内按时间降序（新者在前）
  const allProjects = [...actProjects, ...tfProjects].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (b.date || '').localeCompare(a.date || '');
  });

  // 党小组列表（用于筛选）
  const partyGroups = [...new Set(PEOPLE.map(p => p.partyGroup).filter(Boolean))].sort();

  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  // 首页专班跳转定位：目标专班可能不在「我的分工」中 → 强制切全局分工视图后再定位
  if (_visitorHighlightTfId) _projSubView = 'all';

  // 子视图切换（书记 2026-08-10 裁定第5点）：我的分工（以人为中心）/ 全局分工（全局查询）
  const subTabs = [
    { key: 'mine', label: '我的分工' },
    { key: 'all', label: '全局分工' },
  ];
  const subTabsHtml = `
    <div class="inline-flex items-center gap-1 p-1 rounded-full bg-neutral-100 mb-3">
      ${subTabs.map(t => `
        <button type="button"
          class="visitor-proj-sub px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${_projSubView === t.key ? 'ov-sub-tab-active' : 'text-gray-500 hover:text-gray-700'} "
          data-proj-subview="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  tc.innerHTML = `
    ${subTabsHtml}
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
      <span id="visitor-proj-count" class="text-xs text-gray-400 ml-1"></span>
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

    // 子视图基准：我的分工 = 我参与的项目（以人为中心）；全局分工 = 全部项目
    const base = _projSubView === 'mine'
      ? allProjects.filter(p => p.personnel.some(pm => pm.personId === currentUserId))
      : allProjects;

    const filtered = base.filter(p => {
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

    const emptyText = _projSubView === 'mine' && !filtered.length
      ? '你暂未参与任何项目'
      : '无匹配项目';
    listEl.innerHTML = filtered.length === 0
      ? `<p class="text-xs text-gray-400 text-center py-6">${emptyText}</p>`
      : `<div class="space-y-2">${filtered.map(p => _renderProjectCard(p, currentUserId)).join('')}</div>`;

    // REVIEW_QUEUE J2 裁定（2026-08-08）：首页专班跳转 → 项目分工 tab 定位高亮专班卡片
    if (_visitorHighlightTfId) {
      const target = listEl.querySelector(`.visitor-proj-card[data-tf-id="${_visitorHighlightTfId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(target);
      }
      _visitorHighlightTfId = null; // 一次性消费
    }
  }

  tc.querySelectorAll('.visitor-proj-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      _projSubView = btn.dataset.projSubview;
      tc.querySelectorAll('.visitor-proj-sub').forEach(b => {
        const active = b === btn;
        b.classList.toggle('ov-sub-tab-active', active);
        b.classList.toggle('text-gray-500', !active);
        b.classList.toggle('hover:text-gray-700', !active);
      });
      renderList();
    });
  });

  document.getElementById('visitor-proj-type')?.addEventListener('change', renderList);
  document.getElementById('visitor-proj-group')?.addEventListener('change', renderList);
  document.getElementById('visitor-proj-search')?.addEventListener('input', renderList);
  renderList();
}

function _buildPersonnel(projectId, assignments, authRecords) {
  // 合并 assignments（mock）+ authRecords（运行时赋权）
  const map = new Map(); // personId → { name, role, personId }
  for (const a of assignments) {
    const person = PEOPLE.find(p => p.id === a.personId);
    if (person) map.set(a.personId, { name: person.name, role: a.role, personId: a.personId });
  }
  for (const r of authRecords) {
    if (r.scopeRef === projectId && ['organizer', 'deep'].includes(r.role)) {
      const person = PEOPLE.find(p => p.id === r.targetPersonId);
      if (person && !map.has(r.targetPersonId)) {
        map.set(r.targetPersonId, { name: person.name, role: r.role, personId: r.targetPersonId });
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
      if (person) map.set(m.personId, { name: person.name, role: m.role, personId: m.personId });
    }
  }
  // initiator
  if (tf.initiator) {
    const person = PEOPLE.find(p => p.id === tf.initiator);
    if (person && !map.has(tf.initiator)) {
      map.set(tf.initiator, { name: person.name, role: 'initiator', personId: tf.initiator });
    }
  }
  // authRecords 补充
  for (const r of authRecords) {
    if (r.scopeRef === tf.id && ['organizer', 'deep'].includes(r.role)) {
      const person = PEOPLE.find(p => p.id === r.targetPersonId);
      if (person && !map.has(r.targetPersonId)) {
        map.set(r.targetPersonId, { name: person.name, role: r.role, personId: r.targetPersonId });
      }
    }
  }
  return [...map.values()];
}

function _actStatusLabel(status) {
  // 2026-08-07：活动状态与全站生命周期语义对齐（"已完成"不再是活动字面状态）
  const map = { completed: '已执行', ongoing: '进行中', published: '已发布', draft: '草稿', cancelled: '已取消' };
  return map[status] || status || '进行中';
}
function _actStatusColor(status) {
  const map = { completed: 'bg-green-100 text-green-700', ongoing: 'bg-green-100 text-green-700', published: 'bg-blue-100 text-blue-700', draft: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-600' };
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

function _renderProjectCard(project, currentUserId) {
  const organizers = project.personnel.filter(p => p.role === 'organizer' || p.role === 'initiator');
  const deepParticipants = project.personnel.filter(p => p.role === 'deep');
  const others = project.personnel.filter(p => p.role === 'participant');

  // 人员徽章：「我」参与的项目中，本人徽章加红色描边 + 「·我」标记（以人为中心的直观表现）
  const badge = (p, withRole) => {
    const isMe = !!(currentUserId && p.personId && p.personId === currentUserId);
    return `
      <span class="badge inline-flex items-center gap-0.5" style="${_personnelRoleColor(p.role)}${isMe ? 'box-shadow:0 0 0 1.5px rgba(206,17,38,0.45);' : ''}">${p.name}${withRole ? '·' + _personnelRoleLabel(p.role) : ''}${isMe ? '<span class="text-[10px] font-bold" style="color:#CE1126;">·我</span>' : ''}</span>`;
  };

  return `
    <div class="visitor-proj-card p-3 rounded-lg bg-white" data-tf-id="${project.type === '专班' ? project.id : ''}">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${project.type === '活动' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}">${project.typeBadge}</span>
          <p class="text-sm font-medium text-gray-800 truncate">${project.name}</p>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${project.statusColor}">${project.status}</span>
      </div>
      <div class="flex items-center gap-3 text-[12px] text-gray-500 mb-2">
        ${project.group ? `<span class="flex items-center gap-0.5">${project.group}</span>` : ''}
        ${project.date ? `<span class="flex items-center gap-0.5">${project.date}</span>` : ''}
      </div>
      ${project.personnel.length > 0 ? `
        <div class="flex flex-wrap gap-1.5">
          ${organizers.map(p => badge(p, true)).join('')}
          ${deepParticipants.map(p => badge(p, true)).join('')}
          ${others.map(p => badge(p, false)).join('')}
        </div>
      ` : '<p class="text-xs text-gray-400">暂无人员</p>'}
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
        <button class="visitor-view-btn px-3 py-1.5 text-xs rounded-lg border transition-colors" data-vview="list" style="background:rgba(206,17,38,0.08);color:var(--primary-700);border:1px solid rgba(206,17,38,0.2);">
          ${icon('list', { className: 'w-3.5 h-3.5' })} 列表
        </button>
        <button class="visitor-view-btn px-3 py-1.5 text-xs rounded-lg border transition-colors" data-vview="calendar" style="background:var(--surface-card);color:var(--neutral-500);border:1px solid var(--neutral-200);">
          ${icon('calendar', { className: 'w-3.5 h-3.5' })} 日历
        </button>
        <button class="visitor-view-btn px-3 py-1.5 text-xs rounded-lg border transition-colors" data-vview="query" style="background:var(--surface-card);color:var(--neutral-500);border:1px solid var(--neutral-200);">
          ${icon('search', { className: 'w-3.5 h-3.5' })} 查询
        </button>
      </div>
    </div>
    <div id="visitor-act-view"></div>
  `;

  tc.querySelectorAll('.visitor-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tc.querySelectorAll('.visitor-view-btn').forEach(b => {
        b.style.background = 'var(--surface-card)'; b.style.color = 'var(--neutral-500)'; b.style.border = '1px solid var(--neutral-200)';
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

  // 分页：每页 10 条；存在高亮活动时优先定位到其所在页
  let page = _visitorActPage;
  if (highlightId) {
    const idx = sorted.findIndex(a => a.id === highlightId);
    if (idx >= 0) page = Math.floor(idx / ACTIVITY_PAGE_SIZE) + 1;
  }
  const totalPages = Math.max(1, Math.ceil(sorted.length / ACTIVITY_PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  _visitorActPage = page;

  const start = (page - 1) * ACTIVITY_PAGE_SIZE;
  const pageItems = sorted.slice(start, start + ACTIVITY_PAGE_SIZE);

  vc.innerHTML = `
    <div class="space-y-2">
      ${sorted.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>' :
        pageItems.map(a => {
          const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
          return `
            <a href="../activity.html?id=${a.id || ''}" class="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer" data-visitor-act-id="${a.id || ''}">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
              </div>
            </a>
          `;
        }).join('')}
    </div>
    ${totalPages > 1 ? `
      <div class="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <button type="button" class="visitor-act-page-btn text-xs px-3 py-1.5 rounded-lg border transition-colors ${page <= 1 ? 'opacity-40 pointer-events-none' : ''}" data-act-page="${page - 1}" style="border-color:var(--neutral-200);color:var(--neutral-600);">‹ 上一页</button>
        <span class="text-xs text-gray-500">第 ${page} / ${totalPages} 页</span>
        <button type="button" class="visitor-act-page-btn text-xs px-3 py-1.5 rounded-lg border transition-colors ${page >= totalPages ? 'opacity-40 pointer-events-none' : ''}" data-act-page="${page + 1}" style="border-color:var(--neutral-200);color:var(--neutral-600);">下一页 ›</button>
      </div>` : ''}
  `;

  vc.querySelectorAll('.visitor-act-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _visitorActPage = parseInt(btn.dataset.actPage, 10) || 1;
      _renderActListView(sorted, highlightId);
    });
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（书记 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
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
            <span class="text-xs font-normal text-gray-400">${acts.length} 场</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${acts.map(a => {
              const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
              const day = (a.date || '').substring(8, 10);
              return `
                <a href="../activity.html?id=${a.id || ''}" class="flex items-start gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer" data-visitor-act-id="${a.id || ''}">
                  <div class="text-center flex-shrink-0 w-10">
                    <div class="text-lg font-bold" style="color:${color.text || color.dot};line-height:1;">${day || '?'}</div>
                    <div class="text-xs text-gray-400">日</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（书记 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
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
      return `
        <a href="../activity.html?id=${a.id || ''}" class="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer" data-visitor-act-id="${a.id || ''}">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
            <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
          </div>
        </a>
      `;
    },
    emptyMessage: '无匹配活动',
    sortKey: 'date',
    sortDir: 'desc',
    pageSize: 10,      // 活动无上限增长 → 分页（2026-08-07）
    pageParam: 'vpage',
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（书记 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
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
            const records = loadActiveAttendanceRecords().filter(r => r.activityId === act.id);
            // 出勤口径统一（2026-08-07）：已补（made_up）计入出勤，与书记概况出勤率一致
            const present = records.filter(r => r.status === 'present' || r.status === 'made_up').length;
            const total = records.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-amber-600' : 'text-red-600';
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
  const allRecords = loadActiveInspectionRecords();
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
            ${badgeHtml(sourceLabel, 'neutral')}
            <span class="badge" style="background:${lc.bg};color:${lc.text};border:1px solid ${lc.border};">${levelLabel}</span>
          </div>
          <span class="px-1.5 py-0.5 text-xs font-medium rounded-full ${statusCls}">${statusText}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${sourceTitle}</p>
        ${r.role ? `<p class="text-xs text-gray-500 mt-1">工作内容：${r.role}</p>` : ''}
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <p class="text-xs text-gray-400">录入人：${r.recordedByName || '—'}</p>
          <p class="text-xs text-gray-400">${recordedDate}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ── 待办列表+详情面板（最小三成本原则落地） ───────────────────
let _selectedTodoId = null;
let _todoAggregates = null;

function _renderTodoContent() {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return;

  // 刷新过期状态
  TodoStore.refreshExpiredStatus();

  _todoAggregates = TodoStore.getGroupedByAction('visitor');
  const stats = TodoStore.getStatsByRole('visitor');
  // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
  if (!_selectedTodoId && _todoAggregates.length > 0) {
    _selectedTodoId = _todoAggregates[0].groupKey;
  }
  const selectedTodo = _selectedTodoId ? (
    _todoAggregates.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId)
  ) : null;

  const { html: todoListHtml, bindEvents } = renderTodoList({
    prefix: 'visitor',
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
    // 待办行动按钮金色系（书记 2026-08-01 决策：改金色，与完成绿呼应，红色收敛到品牌语义）
    // G3 修正（2026-08-08）：纯亮金 #FFD700 实底过艳 → 金浅底 rgba(255,215,0,0.12)+深金字；
    // 补金边框与详情按钮一致（G2-c 裁定「同页两按钮金感不一致」）
    actionBtnStyle: 'background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);',
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
          <button class="visitor-todo-detail-action text-xs px-3 py-1.5 rounded-lg transition-colors" style="background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);">去处理</button>
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
        ${todo.actionType ? `<button class="visitor-todo-detail-action text-xs px-3 py-1.5 rounded-lg transition-colors" style="background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);">处理</button>` : ''}
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
  // 报名审核待办：活动/专班 → 统一详情页（T233）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && todo.actionData?.signupId)) {
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    const srcId = todo.sourceId || todo.actionData?.sourceId;
    if (srcId) {
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${basePath}${page}?id=${srcId}`;
      return;
    }
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
  container.querySelector('.visitor-todo-detail-action')?.addEventListener('click', () => {
    if (!_selectedTodoId) return;
    const group = _todoAggregates?.find(g => g.groupKey === _selectedTodoId);
    if (group) { _handleTodoAction(group); return; }
    const todo = TodoStore.getById(_selectedTodoId);
    if (todo) _handleTodoAction(todo);
  });
}

registerRenderCallback(renderVisitorUI);

seedTodos();
loadWorkspaceData({ role: 'all', selectedRole: null, storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init(), () => SignupStore.init()], fallbackData: () => loadActivities(), logTag: 'ws-visitor' });
