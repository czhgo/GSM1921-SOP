﻿﻿﻿// role: [工程师]+[AI]
// main-entry.js — 主页入口
// index.html 专属，处理 dashboard 全量数据渲染

import { BranchService } from '../services/runtime.js?v=20260810a';
import { STATE, setState, registerRenderCallback, getAppState } from '../core/state.js?v=20260810a';
import { NoticeStore, renderNoticeList } from '../services/notice.js?v=20260810a';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260810a';
import { _fmtDate, getBasePath } from '../core/utils.js?v=20260810a';
import { _personName, getPersonName } from '../mock/index.js?v=20260810a';
import { loadActivities } from '../services/activity.js?v=20260810a';
import { CrossPageState } from '../core/cross-page-state.js?v=20260810a';
import { getActivityTypeColors } from '../core/constants.js?v=20260810a';
import { bootstrapPage } from '../core/bootstrap.js?v=20260810a';
import { AuthStore } from '../services/auth.js?v=20260810a';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260810a';
import { DATA_CHANGED_EVENT } from '../core/data-adapter.js?v=20260810a';
import { icon } from '../core/icons.js?v=20260810a';
import { badgeHtml } from '../components/badge.js?v=20260810a';
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from '../components/inspector.js?v=20260810a';
import { renderCalendarForDashboard, populateMonthSelector } from '../components/calendar.js?v=20260810a';

const { user } = await bootstrapPage({ module: 'dashboard' });

// 根据用户角色更新 dashboard 中的 workspace 链接
if (user) {
  const wsPage = AuthStore.getPageForRole('workspace', user.role) || 'visitor.html';
  const wsBase = getBasePath() + 'workspace/' + wsPage;
  document.querySelectorAll('a[href*="workspace/"]').forEach(a => {
    a.href = wsBase;
  });
}

function renderUI(state) {
  document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.module === 'dashboard');
  });

  if (state.activeModule === 'dashboard') {
    renderDashboard(state);
  }
}

registerRenderCallback(renderUI);

const ACTIVITY_TYPE_COLORS = getActivityTypeColors({ withLabel: true });

const TF_STATUS_BADGE = {
  recruiting: { text: '招募中', cls: 'bg-orange-100 text-orange-700' },
  active:     { text: '运行中', cls: 'bg-green-100 text-green-700' },
  completed:  { text: '已完结', cls: 'bg-gray-100 text-gray-600' },
  draft:      { text: '草稿', cls: 'bg-gray-100 text-gray-500' },
};

function _renderStats(activities, taskforces, notices, isLoading = false) {
  const container = document.getElementById('dashboard-stats');
  if (!container) return;

  // 加载中：显示骨架屏，避免 0→真实值 闪烁
  if (isLoading) {
    const skeletonItems = [
      { label: '本月活动', icon: 'calendarHero' },
      { label: '活跃专班', icon: 'usersGroup' },
      { label: '未读通知', icon: 'bellHero' },
    ];
    container.innerHTML = skeletonItems.map(s => `
      <div class="card rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 animate-pulse">
          ${icon(s.icon, { strokeWidth: 1.8, stroke: '#D1D5DB', className: 'w-5 h-5' })}
        </div>
        <div>
          <div class="h-7 w-12 rounded bg-gray-100 animate-pulse mb-1"></div>
          <p class="text-xs" style="color:var(--neutral-400);">${s.label}</p>
        </div>
      </div>
    `).join('');
    return;
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActivities = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);
  const activeTFs = taskforces.filter(t => t.status === 'active' || t.status === 'recruiting');
  const unreadNotices = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;

  // A-01 修复：color 统一为 hex 常量，图标底色用 8 位 hex（${hex}15），var+hex 拼接无法解析
  // 2026-08-10 书记两次裁定·首页统计卡最终配色：活动=蓝 #3B82F6 / 专班=亮金 #F59E0B（参考工作台 tab 亮色呈现：浅金底+亮金字）/ 未读通知=红 #DC2626（待处理/告警）
  const stats = [
    { label: '本月活动', value: monthActivities.length, unit: '场', color: '#3B82F6', icon: 'calendarHero' },
    // 书记 2026-08-10：专班亮金（原深金 #A16207 太暗，参考工作台 tab 配色——底色必须是亮的，浅金底+亮金字）
    { label: '活跃专班', value: activeTFs.length, unit: '个', color: '#F59E0B', icon: 'usersGroup' },
    // 书记 2026-08-10：未读通知=红 #DC2626（待处理/告警语义）
    { label: '未读通知', value: unreadNotices, unit: '条', color: unreadNotices > 0 ? '#DC2626' : '#9CA3AF', icon: 'bellHero' },
  ];

  container.innerHTML = stats.map(s => `
    <div class="card rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 stat-icon-tint" style="--tint:${s.color};">
        ${icon(s.icon, { strokeWidth: 1.8, stroke: s.color, className: 'w-5 h-5' })}
      </div>
      <div>
        <p class="text-2xl font-bold" style="color:${s.color};line-height:1.2;">${s.value}<span class="text-xs font-normal ml-0.5" style="color:var(--neutral-400);">${s.unit}</span></p>
        <p class="text-xs" style="color:var(--neutral-400);">${s.label}</p>
      </div>
    </div>
  `).join('');
}

// ── 近期活动卡片：tab 切换 + URL 同步 ──────────────────
const DASHBOARD_DEFAULT_VIEW = 'calendar';

function _getInitialActivityView() {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') || DASHBOARD_DEFAULT_VIEW;
}

function _getInitialMonth() {
  const params = new URLSearchParams(window.location.search);
  return params.get('month') || '';
}

function _syncURL(view, month) {
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

function _switchActivityView(view) {
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
  _syncURL(view, view === 'calendar' ? month : '');
}

function _bindActivityTabs() {
  const tabs = document.querySelectorAll('.activity-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      _switchActivityView(btn.dataset.view);
    });
  });
}

function _renderActivityList(activities) {
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
  const wsPage = AuthStore.getPageForRole('workspace', user?.role) || 'visitor.html';
  const wsBase = getBasePath() + 'workspace/' + wsPage;
  const moreUrl = CrossPageState.buildURL(wsBase, { view: 'activities' });
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

function _renderTaskforceList(taskforces) {
  const container = document.getElementById('dashboard-taskforce-list');
  if (!container) return;

  // T223 排序统一：专班按 createdAt 降序（新者在前）
  const active = taskforces
    .filter(t => t.status === 'active' || t.status === 'recruiting')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const display = active.slice(0, 5);

  if (display.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无活跃专班</p>';
    return;
  }

  container.innerHTML = display.map(r => {
    const badge = TF_STATUS_BADGE[r.status] || TF_STATUS_BADGE.draft;
    const filled = r.members.filter(m => m.personId).length;
    const pct = r.capacity > 0 ? Math.round((filled / r.capacity) * 100) : 0;
    const barColor = pct >= 80 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-gold)' : 'var(--primary-400)';

    return `
      <div class="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 hover:shadow-sm rounded-lg px-2 -mx-2 transition-all duration-200 group"
           data-tf-id="${r.id}"
           title="${r.name} — ${r.task}">
        <span class="px-1.5 py-0.5 text-xs font-medium rounded-full ${badge.cls} flex-shrink-0 mt-0.5">${badge.text}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">${r.name}</p>
          <p class="text-xs text-gray-500 mt-0.5 line-clamp-1">${r.task}</p>
          <div class="flex items-center gap-2 mt-1.5">
            <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width:${pct}%;background:${barColor};transition:width 0.3s;"></div>
            </div>
            <span class="text-xs text-gray-400 whitespace-nowrap">${filled}/${r.capacity}</span>
          </div>
        </div>
        <div class="text-right whitespace-nowrap flex-shrink-0">
          <p class="text-xs text-gray-400">发起: ${_personName(r.initiator)}</p>
          ${r.deadline ? `<p class="text-xs text-gray-400">截止 ${r.deadline}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── 活动风采（P3-3） ──────────────────────────────────────────
const GALLERY_TYPE_GRADIENTS = {
  '主题党日': 'linear-gradient(135deg, #FEF2F2, #FECACA)',
  '共建':     'linear-gradient(135deg, #FDF2F8, #FBCFE8)',
  '党课':     'linear-gradient(135deg, #EFF6FF, #BFDBFE)',
  '参访':     'linear-gradient(135deg, #ECFDF5, #A7F3D0)',
  '座谈':     'linear-gradient(135deg, #F7FEE7, #D9F99D)',
  '支委会':   'linear-gradient(135deg, #F5F3FF, #C4B5FD)',
  '党小组会': 'linear-gradient(135deg, #F0F9FF, #BAE6FD)',
  '支部党员大会': 'linear-gradient(135deg, #FFFBEB, #FDE68A)',
};

function _renderGallery(activities) {
  const container = document.getElementById('dashboard-gallery');
  if (!container) return;

  // T223 排序统一：未完成在前、已完成在后，组内均按 date 降序（新者在前）
  const isDone = a => a.archived || ['completed', 'cancelled'].includes(a.status);
  const candidates = activities.filter(a => (a.isBrand && !a.archived) || ((a.status === 'completed' || a.archived) && !a.isBrand));
  const sortByDate = (arr) => [...arr].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const display = [...sortByDate(candidates.filter(a => !isDone(a))), ...sortByDate(candidates.filter(a => isDone(a)))].slice(0, 6);

  if (display.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无风采展示</p>';
    return;
  }

  container.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
    display.map(a => {
      const gradient = GALLERY_TYPE_GRADIENTS[a.type] || 'linear-gradient(135deg, #F9FAFB, #E5E7EB)';
      const color = ACTIVITY_TYPE_COLORS[a.type] || { dot: '#6B7280', label: a.type || '活动' };
      const organizerName = getPersonName(a.organizer);
      // T229：生命周期态徽章
      const lifecycle = ACTIVITY_LIFECYCLE[deriveActivityLifecycleStatus(a, getAppState()?.tasks || [])] || ACTIVITY_LIFECYCLE.draft;

      return `
        <div class="rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
             data-gallery-activity-id="${a.id}">
          <div class="p-4 relative" style="background:${gradient};">
            ${a.isBrand ? badgeHtml('品牌', 'brand') : ''}
            <div class="flex items-center gap-1.5 mb-1.5">
              <div class="w-2.5 h-2.5 rounded-full" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''};"></div>
              <span class="text-xs font-medium text-gray-500">${color.label}</span>
            </div>
            <h4 class="font-title-cn text-sm font-bold text-gray-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">${a.title || '未命名活动'}</h4>
          </div>
          <div class="p-3 bg-white">
            <p class="text-xs text-gray-500">${a.date ? _fmtDate(new Date(a.date)) : ''}${organizerName ? ' · ' + organizerName : ''}</p>
            ${badgeHtml(lifecycle.label, lifecycle.variant)}
          </div>
        </div>
      `;
    }).join('') + '</div>';
}

// ── 我的角色区块已迁移：角色切换移至 header view-switcher；考勤统计卡已整体移出首页（书记+纪检工作区承载） ──

function renderDashboard(state) {
  const activities = state.activities || [];
  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();
  const isLoading = state.status === STATE.LOADING && activities.length === 0;

  _renderStats(activities, taskforces, notices, isLoading);

  if (isLoading) return; // 等数据就绪再渲染其余区域，避免"暂无"→实际数据闪烁

  renderNoticeList('dashboard-notice-list', 5);
  const noticeCount = document.getElementById('dashboard-notice-count');
  if (noticeCount) {
    const activeUnread = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;
    noticeCount.textContent = activeUnread > 0 ? `${activeUnread} 条未读` : '';
  }

  _renderTaskforceList(taskforces);
  _renderActivityList(activities);
  // 考勤概况已迁移至书记+纪检工作区，首页不再渲染
  _renderGallery(activities);

  // ── 近期活动卡片渲染 ──
  const currentView = _getInitialActivityView();
  _switchActivityView(currentView);

  if (currentView === 'calendar') {
    const targetMonth = populateMonthSelector(activities);
    if (!state.displayMonth) {
      const initialMonth = _getInitialMonth() || targetMonth;
      setState({ displayMonth: initialMonth });
    }
    renderCalendarForDashboard(state, state.displayMonth || targetMonth);
  }

  const dashContainer = document.getElementById('view-dashboard');
  if (!dashContainer || dashContainer.dataset.navBound === 'true') return;

  dashContainer.dataset.navBound = 'true';

  dashContainer.addEventListener('click', (e) => {
    const wsPage = AuthStore.getPageForRole('workspace', user.role) || 'visitor.html';
    const wsBase = getBasePath() + 'workspace/' + wsPage;

    const actItem = e.target.closest('[data-activity-id]');
    if (actItem) {
      const actId = actItem.dataset.activityId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
        : wsBase;
      window.location.href = url;
      return;
    }
    const tfItem = e.target.closest('[data-tf-id]');
    if (tfItem) {
      const tfId = tfItem.dataset.tfId;
      const url = tfId
        ? CrossPageState.buildURL(wsBase, { taskforceId: tfId })
        : wsBase;
      window.location.href = url;
      return;
    }
    const galleryItem = e.target.closest('[data-gallery-activity-id]');
    if (galleryItem) {
      const actId = galleryItem.dataset.galleryActivityId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
        : wsBase;
      window.location.href = url;
      return;
    }
    // 日历活动条目点击：跳转到对应工作台
    const calItem = e.target.closest('.cal-activity-item');
    if (calItem) {
      const actId = calItem.dataset.actId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
        : wsBase;
      window.location.href = url;
      return;
    }
  });
}

// T223 修复：活动 tab 在模块初始化即绑定（tab 按钮为静态 HTML），
// 避免异步数据加载期间用户点击「列表」时监听器尚未绑定而丢失点击。
_bindActivityTabs();

loadWorkspaceData({
  role: 'all',
  selectedRole: null,
  activeModule: 'dashboard',
  fallbackData: () => loadActivities(),
  storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init()],
  extraLoads: [() => typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([])],
  logTag: 'initApp'
});

// ── 数据变更即时刷新（2026-08-05，响应书记"计算需手动刷新"）──────
// 任何业务写（通知已读、待办完成、考勤确认等）经 persist() 派发 DATA_CHANGED_EVENT，
// 首页订阅后即时重算统计卡/通知列表/我的考勤，无需手动刷新页面。
function _refreshDashboardSnapshot() {
  const state = getAppState();
  const activities = state.activities || [];
  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();

  _renderStats(activities, taskforces, notices);
  if (state.status === STATE.LOADING && activities.length === 0) return;

  renderNoticeList('dashboard-notice-list', 5);
  const noticeCount = document.getElementById('dashboard-notice-count');
  if (noticeCount) {
    const activeUnread = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;
    noticeCount.textContent = activeUnread > 0 ? `${activeUnread} 条未读` : '';
  }

  _renderTaskforceList(taskforces);
  _renderActivityList(activities);
  _renderGallery(activities);
}

document.addEventListener(DATA_CHANGED_EVENT, () => {
  if (getAppState().activeModule !== 'dashboard') return;
  _refreshDashboardSnapshot();
});

const _lastDataVersion = CrossPageState.getDataVersion();

window.addEventListener('storage', (e) => {
  if (e.key === 'sop_org_os_data_version') {
    const newVersion = CrossPageState.getDataVersion();
    if (newVersion !== _lastDataVersion) {
      BranchService.listActivities().then(activities => {
        setState({ activities });
      }).catch(() => {});
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const newVersion = CrossPageState.getDataVersion();
    if (newVersion !== _lastDataVersion) {
      BranchService.listActivities().then(activities => {
        setState({ activities });
      }).catch(() => {});
    }
  }
});
