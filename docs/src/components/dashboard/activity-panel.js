// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/activity-panel.js — 首页近期活动卡片（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：活动 tab 切换 / URL 同步 / 活动列表渲染。
//  职责单一：日历/列表双视图切换 + ?view=?month= URL 同步 + 活动列表（前 10 条）。
// ════════════════════════════════════════════════════════════════

import { setState, getAppState } from '../../core/state.js?v=20260901p';
import { _fmtDate, getBasePath } from '../../core/utils.js?v=20260901p';
import { getPersonName } from '../../mock/index.js?v=20260901p';
import { CrossPageState } from '../../core/cross-page-state.js?v=20260901p';
import { AuthStore } from '../../services/auth.js?v=20260901p';
import { getActivityTypeColors } from '../../core/constants.js?v=20260901p';
import { badgeHtml } from '../badge.js?v=20260901p';
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from '../inspector.js?v=20260901p';
import { populateMonthSelector } from '../calendar.js?v=20260901p';
import { getCapabilities, mountCapability, getRuntimeEnv } from '../../core/registry.js?v=20260901p';

const DASHBOARD_DEFAULT_VIEW = 'calendar';
const ACTIVITY_TYPE_COLORS = getActivityTypeColors({ withLabel: true });

export function getInitialActivityView() {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') || DASHBOARD_DEFAULT_VIEW;
}

export function getInitialMonth() {
  const params = new URLSearchParams(window.location.search);
  return params.get('month') || '';
}

export function syncURL(view, month) {
  const url = new URL(window.location);
  if (view === DASHBOARD_DEFAULT_VIEW) {
    url.searchParams.delete('view');
  } else {
    url.searchParams.set('view', view);
  }
  if (month) {
    url.searchParams.set('month', month);
  } else {
    url.searchParams.delete('month');
  }
  history.replaceState(null, '', url);
}

/** 切换活动视图（日历/列表）+ 同步 URL（main-entry 初始化与渲染时调用） */
export function switchActivityView(view) {
  const calView = document.getElementById('activity-calendar-view');
  const listView = document.getElementById('activity-list-view');
  if (!calView || !listView) return;

  if (view === 'list') {
    calView.classList.add('hidden');
    listView.classList.remove('hidden');
  } else {
    calView.classList.remove('hidden');
    listView.classList.add('hidden');
  }

  // 更新 tab 样式
  document.querySelectorAll('.activity-tab-btn').forEach(btn => {
    const isActive = btn.dataset.view === view;
    btn.className = `activity-tab-btn px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-party-50 text-party-700 border border-party-200'
        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
    }`;
  });

  // 同步 URL
  const appState = getAppState();
  const month = appState?.displayMonth || '';
  syncURL(view, view === 'calendar' ? month : '');
}

/** 活动 tab 初始化绑定（tab 按钮为静态 HTML，模块初始化即绑定，防异步期间丢点击） */
export function initActivityTabs() {
  document.querySelectorAll('.activity-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchActivityView(btn.dataset.view);
    });
  });
}

/** 渲染近期活动列表（前 10 条 + 查看更多） */
export function renderActivityList(activities, user) {
  const container = document.getElementById('dashboard-activity-list');
  if (!container) return;

  // T223 排序统一：未完成在前、已完成在后，组内均按 date 降序（新者在前）
  const isDone = a => a.archived || ['completed', 'cancelled'].includes(a.status);
  const sorted = [...activities]
    .filter(a => a.date && !a.archived)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const display = [...sorted.filter(a => !isDone(a)), ...sorted.filter(a => isDone(a))].slice(0, 10);

  if (display.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400 p-4">暂无可展示的活动</p>';
    return;
  }

  // 首页只展示前 10 条；「查看更多」跳转活动动态 tab（书记 2026-08-08 决策：首页截断 + 活动页分页）
  // T-284：未登录时「查看更多」直达登录页（登录后进工作台活动 tab），消除「visitor→门控踢→login」绕路
  const moreUrl = user
    ? CrossPageState.buildURL(getBasePath() + 'workspace/' + (AuthStore.getPageForRole('workspace', user.role) || 'visitor.html'), { view: 'activities' })
    : getBasePath() + 'login.html';
  const moreHtml = sorted.length > display.length
    ? `<a href="${moreUrl}" class="mt-2 flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-gray-50" style="color:var(--accent-blue,#3B82F6);">查看更多活动（共 ${sorted.length} 条）→</a>`
    : '';

  container.innerHTML = '<div class="space-y-2">' + display.map(a => {
    const rawCat = a.type || a.category || '会议';
    const color = ACTIVITY_TYPE_COLORS[rawCat] || { bg: '#F9FAFB', dot: '#6B7280', label: rawCat };
    // T229：生命周期态徽章（草稿→已发布→进行中→待归档→已执行→已归档）
    const lifecycle = ACTIVITY_LIFECYCLE[deriveActivityLifecycleStatus(a, getAppState()?.tasks || [])] || ACTIVITY_LIFECYCLE.draft;
    const dateLabel = a.date ? _fmtDate(new Date(a.date)) : '待定';
    const organizerName = getPersonName(a.organizer);

    return `
      <div class="flex items-center gap-3 p-2.5 rounded-lg hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
           data-activity-id="${a.id || ''}"
           title="${a.title || '未命名活动'} | ${dateLabel} | ${color.label}${a.location ? ' | ' + a.location : ''}">
        <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" style="background: ${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">${a.title || '未命名活动'}</p>
          <p class="text-xs text-gray-500 mt-0.5">${dateLabel} · ${color.label}${organizerName ? ' · ' + organizerName : ''}${a.location ? ' · ' + a.location : ''}</p>
        </div>
        ${badgeHtml(lifecycle.label, lifecycle.variant)}
      </div>
    `;
  }).join('') + '</div>' + moreHtml;
}

/** 渲染活动日历区（经注册表挂载 activity-calendar 能力） */
export function renderActivityCalendar(state) {
  const currentView = getInitialActivityView();
  switchActivityView(currentView);

  if (currentView === 'calendar') {
    const targetMonth = populateMonthSelector(state.activities || []);
    if (!state.displayMonth) {
      const initialMonth = getInitialMonth() || targetMonth;
      setState({ displayMonth: initialMonth });
    }
    // M7（2026-08-30）：dashboard 能力发现显式传 env/role，启用「按环境/角色选择性启用」机制
    // （activity-calendar 声明 env:null/requiredRoles:null，行为不变；机制对未来的 env/role 差异化能力生效）
    const cap = getCapabilities({ scope: 'dashboard', env: getRuntimeEnv(), role: AuthStore.getCurrentUser()?.role }).find(c => c.id === 'activity-calendar');
    if (cap) {
      mountCapability('activity-calendar', null, { state, targetMonth: state.displayMonth || targetMonth });
    }
  }
}
