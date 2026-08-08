﻿// role: [工程师]+[AI]
// main-entry.js — 主页入口
// index.html 专属，处理 dashboard 全量数据渲染

import { BranchService } from '../services/runtime.js?v=20260808g';
import { STATE, setState, registerRenderCallback, getAppState } from '../core/state.js?v=20260808g';
import { NoticeStore, renderNoticeList } from '../services/notice.js?v=20260808g';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260808g';
import { _fmtDate, getBasePath } from '../core/utils.js?v=20260808g';
import { _personName, getPersonName } from '../mock/index.js?v=20260808g';
import { loadAttendanceRecords, loadActiveAttendanceRecords } from '../services/attendance.js?v=20260808g';
import { loadActivities } from '../services/activity.js?v=20260808g';
import { CrossPageState } from '../core/cross-page-state.js?v=20260808g';
import { getActivityTypeColors } from '../core/constants.js?v=20260808g';
import { bootstrapPage } from '../core/bootstrap.js?v=20260808g';
import { AuthStore } from '../services/auth.js?v=20260808g';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260808g';
import { DATA_CHANGED_EVENT } from '../core/data-adapter.js?v=20260808g';
import { icon } from '../core/icons.js?v=20260808g';
import { badgeHtml } from '../components/badge.js?v=20260808g';
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from '../components/inspector.js?v=20260808g';
import { renderCalendarForDashboard, populateMonthSelector } from '../components/calendar.js?v=20260808g';

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

function _renderStats(activities, taskforces, notices, attendanceRecords, isLoading = false) {
  const container = document.getElementById('dashboard-stats');
  if (!container) return;

  // 加载中：显示骨架屏，避免 0→真实值 闪烁
  if (isLoading) {
    const skeletonItems = [
      { label: '本月活动', icon: 'calendarHero' },
      { label: '活跃专班', icon: 'usersGroup' },
      { label: '未读通知', icon: 'bellHero' },
      { label: '我的考勤', icon: 'clipboard' },
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

  // 我的考勤（本月）
  const userPersonId = user?.personId;
  const myMonthAttendance = userPersonId
    ? attendanceRecords.filter(r => {
        if (r.personId !== userPersonId) return false;
        const act = activities.find(a => a.id === r.activityId);
        return act && act.date && act.date.startsWith(thisMonth);
      })
    : [];
  // 数字一致性审计（2026-08-07）：出勤率口径与书记概况统一 = (出勤 + 已补) / 总记录；
  // 补课语义为"最终出勤"，made_up 记录计入出勤数。颜色阈值全站统一 90/70。
  const myPresent = myMonthAttendance.filter(r => r.status === 'present' || r.status === 'made_up').length;
  const myTotal = myMonthAttendance.length;
  const myRate = myTotal > 0 ? Math.round((myPresent / myTotal) * 100) : 0;
  const myColor = myTotal === 0 ? '#9CA3AF'
    : myRate >= 90 ? '#059669'
    : myRate >= 70 ? '#D97706'
    : '#DC2626';

  // A-01 修复：color 统一为 hex 常量，图标底色用 8 位 hex（${hex}15），var+hex 拼接无法解析
  const stats = [
    { label: '本月活动', value: monthActivities.length, unit: '场', color: '#CE1126', icon: 'calendarHero', interactive: false },
    // A-09 修复：活跃专班亮金 #FFD700 白卡辨识度低 → 深金 #B45309（与访客金色系一致）
    { label: '活跃专班', value: activeTFs.length, unit: '个', color: '#B45309', icon: 'usersGroup', interactive: false },
    { label: '未读通知', value: unreadNotices, unit: '条', color: unreadNotices > 0 ? '#DC2626' : '#9CA3AF', icon: 'bellHero', interactive: false },
    { label: '我的考勤', value: myTotal > 0 ? `${myPresent}/${myTotal}` : '—', unit: '', color: myColor, icon: 'clipboard', interactive: true },
  ];

  container.innerHTML = stats.map(s => `
    <div class="card rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${s.interactive ? 'cursor-pointer' : 'cursor-default'}"
         ${s.interactive ? 'data-attendance-popover="1"' : ''}>
      <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 stat-icon-tint" style="--tint:${s.color};">
        ${icon(s.icon, { strokeWidth: 1.8, stroke: s.color, className: 'w-5 h-5' })}
      </div>
      <div>
        <p class="text-2xl font-bold" style="color:${s.color};line-height:1.2;">${s.value}<span class="text-xs font-normal ml-0.5" style="color:var(--neutral-400);">${s.unit}</span></p>
        <p class="text-xs" style="color:var(--neutral-400);">${s.label}</p>
      </div>
    </div>
  `).join('');

  // 绑定我的考勤弹窗
  if (userPersonId) {
    _bindAttendancePopover(activities, attendanceRecords, thisMonth);
  }
}

// ── 我的考勤弹窗 ──────────────────────────────────────
const ATTENDANCE_STATUS_DOT = {
  present:  { text: '出勤', cls: 'text-green-600', dot: '#10B981' },
  absent:   { text: '缺勤', cls: 'text-red-500',  dot: '#EF4444' },
  leave:    { text: '请假', cls: 'text-orange-500', dot: '#F97316' },
  made_up:  { text: '已补', cls: 'text-blue-500', dot: '#3B82F6' },
};

// 弹窗的 document 级关闭监听防重绑定（统计卡即时刷新会反复调用 _bindAttendancePopover）
let _attDocBound = false;

function _bindAttendancePopover(activities, attendanceRecords, thisMonth) {
  const trigger = document.querySelector('[data-attendance-popover="1"]');
  if (!trigger) return;

  let popover = document.getElementById('attendance-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'attendance-popover';
    popover.style.cssText = 'position:absolute;z-index:50;background:var(--surface-card);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);border:1px solid var(--neutral-200);padding:12px;width:300px;display:none;';
    document.body.appendChild(popover);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popover.style.display === 'none' || popover.style.display === '') {
      const userPersonId = user.personId;
      const myRecords = attendanceRecords.filter(r => {
        if (r.personId !== userPersonId) return false;
        const act = activities.find(a => a.id === r.activityId);
        return act && act.date && act.date.startsWith(thisMonth);
      }).sort((a, b) => {
        const actA = activities.find(x => x.id === a.activityId);
        const actB = activities.find(x => x.id === b.activityId);
        return (actB?.date || '').localeCompare(actA?.date || '');
      });

      const listHTML = myRecords.length === 0
        ? '<p class="text-xs text-gray-400 text-center py-4">本月暂无考勤记录</p>'
        : myRecords.map(r => {
            const act = activities.find(a => a.id === r.activityId);
            const s = ATTENDANCE_STATUS_DOT[r.status] || { text: r.status, cls: 'text-gray-400', dot: '#9CA3AF' };
            return `
              <div class="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-b-0">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${s.dot};"></span>
                <span class="text-sm text-gray-700 truncate flex-1">${act?.title || r.activityId}</span>
                <span class="text-xs text-gray-400 flex-shrink-0">${act?.date ? _fmtDate(new Date(act.date)) : ''}</span>
                <span class="text-xs font-medium ${s.cls} flex-shrink-0 w-8 text-right">${s.text}</span>
              </div>
            `;
          }).join('');

      popover.innerHTML = `
        <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <h3 class="font-title-cn text-sm font-semibold text-gray-800">我的本月考勤</h3>
          <span class="text-xs text-gray-400">${myRecords.length} 条记录</span>
        </div>
        <div class="max-h-64 overflow-y-auto">${listHTML}</div>
      `;

      // A-02 修复：clamp 定位，防止第 4 列统计卡触发时右缘溢出视口
      const rect = trigger.getBoundingClientRect();
      const POPOVER_WIDTH = 300;
      const POPOVER_MARGIN = 8;
      const popoverLeft = Math.min(rect.left + window.scrollX, window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN);
      popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
      popover.style.left = `${Math.max(POPOVER_MARGIN, popoverLeft)}px`;
      popover.style.display = 'block';
    } else {
      popover.style.display = 'none';
    }
  });

  // document 级关闭监听：仅绑定一次（统计卡即时刷新会反复调用本函数）
  if (!_attDocBound) {
    _attDocBound = true;
    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && !trigger.contains(e.target)) {
        popover.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') popover.style.display = 'none';
    });
  }
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

function _renderAttendanceSummary(activities, attendanceRecords) {
  const container = document.getElementById('dashboard-attendance-summary');
  if (!container) return;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActivities = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);

  if (monthActivities.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">本月暂无考勤数据</p>';
    return;
  }

  const rows = monthActivities.map(act => {
    const records = attendanceRecords.filter(r => r.activityId === act.id);
    // 出勤口径统一（2026-08-07）：已补（made_up）计入出勤，与书记概况出勤率一致
    const present = records.filter(r => r.status === 'present' || r.status === 'made_up').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const total = records.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600';

    return `
      <div class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-all duration-200 cursor-pointer group"
           data-attendance-act-id="${act.id}"
           title="${act.title} — 出勤率 ${rate}%">
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 truncate group-hover:text-blue-700 transition-colors">${act.title}</p>
          <p class="text-xs text-gray-400">${_fmtDate(new Date(act.date))}</p>
        </div>
        <div class="flex items-center gap-3 text-xs whitespace-nowrap">
          <span class="text-green-600">出勤 ${present}</span>
          <span class="text-red-500">缺勤 ${absent}</span>
          <span class="text-orange-500">请假 ${leave}</span>
          <span class="font-medium ${rateColor}">${rate}%</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = rows.join('');
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

// ── 我的角色区块已迁移：角色切换移至 header view-switcher，考勤弹窗并入顶部统计行 ──

function renderDashboard(state) {
  const activities = state.activities || [];
  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();
  const isLoading = state.status === STATE.LOADING && activities.length === 0;

  _renderStats(activities, taskforces, notices, loadAttendanceRecords(), isLoading);

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
    const attItem = e.target.closest('[data-attendance-act-id]');
    if (attItem) {
      const actId = attItem.dataset.attendanceActId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
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

  _renderStats(activities, taskforces, notices, loadActiveAttendanceRecords());
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
