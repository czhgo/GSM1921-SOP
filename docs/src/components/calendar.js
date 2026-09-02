// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  calendar.js — 日历渲染引擎（P2-7 多视图升级）
//  包含：renderCalendarByActivities, populateMonthSelector
//  视图模式：月/周/日/列表 四种切换
// ════════════════════════════════════════════════════════════════

import { getAppState, setState } from '../core/state.js?v=20260901q';
import { ROLE_COLORS, getActivityColor, ACTIVITY_CATEGORY_COLORS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_SHORT } from '../core/constants.js?v=20260901q';
import { _fmtDate, _currentYearMonth } from '../core/utils.js?v=20260901q';
import { filterTasksByManagementRole } from './inspector.js?v=20260901q';
import { badgeHtml } from './badge.js?v=20260901q';

// ── 内联标签深色变量对（与 constants.js _applyDark 生成的 bgDark/textDark/borderDark 配套）──
// 标签/卡片：三件套（bg/text/border）；纯文字：仅 text；圆点：仅实色提亮（--acc-dot-dark）
const _accDark = (c) => `--acc-bg-dark:${c.bgDark};--acc-text-dark:${c.textDark};--acc-border-dark:${c.borderDark};`;
const _accText = (c) => `--acc-text-dark:${c.textDark};`;
const _accDot = (c) => `--acc-dot-dark:${c.textDark};`;

const VIEW_LABELS = { month: '月', week: '周', day: '日', list: '列表' };

// 响应式：窗口宽度变化时重新渲染日历
// 注意：首页使用紧凑渲染器（renderCalendarForDashboard），resize 时必须复用，
//       否则会被 8rem 高格子覆盖（书记 2026-08-01 发现，浏览器实测复现）。
let _resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    const appState = getAppState();
    if (!appState) return;
    const view = appState.calendarView || 'month';
    if (view !== 'month') return;
    const month = appState.displayMonth || _currentYearMonth();
    if (document.getElementById('activity-calendar-view')) {
      renderCalendarForDashboard(appState, month);
    } else {
      renderCalendarByActivities(appState, month);
    }
  }, 250);
});

// ════════════════════════════════════════════════════════════════
//  主渲染入口 — 根据 calendarView 分发到对应视图
// ════════════════════════════════════════════════════════════════
export function renderCalendarByActivities(state, targetMonth) {
  const grid  = document.getElementById('cal-main-grid');
  const empty = document.getElementById('cal-main-empty');
  if (!grid) return;

  const { activities: rawActivities, tasks: rawTasks, viewType, managementRole, viewArchived, calendarView } = state || {};
  const activities = rawActivities || [];
  const tasks = rawTasks || [];
  const view = calendarView || 'month';

  const activeActivities = activities.filter(a => !a.archived);

  if (activeActivities.length === 0) {
    grid.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    const legend = document.getElementById('calendar-legend');
    if (legend) legend.classList.add('hidden');
    return;
  }

  _renderLegend(activeActivities);
  _renderViewSwitcher(view);

  if (empty) empty.classList.add('hidden');
  grid.classList.remove('hidden');

  const month = targetMonth || _currentYearMonth();

  switch (view) {
    case 'week':  _renderWeekView(grid, activeActivities, tasks, month, state); break;
    case 'day':   _renderDayView(grid, activeActivities, tasks, month, state); break;
    case 'list':  _renderListView(grid, activeActivities, tasks, month, state); break;
    default:      _renderMonthView(grid, activeActivities, tasks, month, state); break;
  }
}

// ════════════════════════════════════════════════════════════════
//  视图切换器
// ════════════════════════════════════════════════════════════════
function _renderViewSwitcher(currentView) {
  let switcher = document.getElementById('cal-view-switcher');
  if (!switcher) {
    const grid = document.getElementById('cal-main-grid');
    if (!grid) return;
    switcher = document.createElement('div');
    switcher.id = 'cal-view-switcher';
    grid.parentNode.insertBefore(switcher, grid);
  }

  switcher.innerHTML = `
    <div class="flex gap-1 mb-3">
      ${Object.entries(VIEW_LABELS).map(([key, label]) => `
        <button class="cal-view-btn px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${key === currentView ? 'bg-party-50 text-party-700 border border-party-200' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}" data-view="${key}">${label}</button>
      `).join('')}
    </div>
  `;

  switcher.querySelectorAll('.cal-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setState({ calendarView: btn.dataset.view });
      const appState = getAppState();
      renderCalendarByActivities(appState, appState.displayMonth || _currentYearMonth());
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  月视图 — 保持原有实现
// ════════════════════════════════════════════════════════════════
function _renderMonthView(grid, activeActivities, tasks, month, state) {
  const { viewType, managementRole } = state || {};
  const now = new Date();
  const [y, m] = month.split('-').map(Number);
  const todayKey = _fmtDate(now);
  const MN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const DN = ['一','二','三','四','五','六','日'];

  const isMobile = window.innerWidth < 768;

  const actDates = new Set(
    activeActivities.filter(a => typeof a.date === 'string' && a.date.startsWith(month)).map(a => a.date)
  );
  const tasksByDate = {};
  tasks.forEach(t => {
    if (t.date && typeof t.date === 'string' && t.date.startsWith(month)) {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    }
  });

  const rawFirst = new Date(y, m - 1, 1).getDay();
  const firstDow = (rawFirst + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();

  let html = `<div class="mb-6">`;
  html += `<div class=" text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">${y}年 ${MN[m - 1]}</div>`;
  html += `<div class="${isMobile ? 'cal-mobile-grid' : ''}" style="display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:auto;gap:2px;">`;
  DN.forEach(d => { html += `<div class=" text-[12px] text-gray-400 text-center pb-1.5 font-semibold">${d}</div>`; });

  for (let i = 0; i < firstDow; i++) {
    html += '<div class="cal-cell-large cal-cell-compact" style="background:transparent;border-color:transparent;"></div>';
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const k = `${month}-${String(day).padStart(2, '0')}`;
    const isT = k === todayKey;
    const ct = tasksByDate[k] || [];
    const hasActivity = actDates.has(k);
    let cls = isMobile ? 'cal-cell-mobile' : 'cal-cell-large cal-cell-compact';
    if (ct.length > 0 || hasActivity) cls += ' has-tasks';
    if (isT) cls += ' is-today';

    html += `<div class="${cls}" data-date="${k}">`;
    html += `<div class=" ${isMobile ? 'text-xs' : 'text-[12px]'} font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${day}</div>`;
    if (isMobile) {
      html += _renderMobileDots(k, activeActivities, ct, hasActivity, tasks, state);
    } else {
      html += _renderCompactCellContent(k, activeActivities, ct, hasActivity, tasks, state);
    }
    html += '</div>';
  }
  html += '</div></div>';
  grid.innerHTML = html;

  if (isMobile) {
    _bindMobileCellClicks(grid, activeActivities, tasks, month, state);
  } else {
    _bindCellClicks(grid);
    _bindHoverPreview(grid, activeActivities);
  }
}

// ════════════════════════════════════════════════════════════════
//  月视图格子内容（紧凑方形格：简写常驻 + 最多 3 条活动标签）
//  2026-08-01 统一全站月视图基线：方形格 + 简写 + hover 浮窗
// ════════════════════════════════════════════════════════════════
function _renderCompactCellContent(dateKey, activeActivities, ct, hasActivity, tasks, state) {
  const { managementRole } = state || {};
  let html = '';
  const dayActs = activeActivities.filter(a => a.date === dateKey);
  dayActs.slice(0, 3).forEach(act => {
    const color = getActivityColor(act);
    const shortLabel = ACTIVITY_TYPE_SHORT[act.scenarioId] || ACTIVITY_TYPE_SHORT[act.type] || (act.type ? act.type.slice(0, 2) : '活动');
    html += `<div class="cal-activity-tag cal-activity-item cursor-pointer hover:brightness-95 transition-all" data-act-id="${act.id || ''}" data-date="${dateKey}" style="${_accDark(color)}background:${color.bg};color:${color.text};border:1px solid ${color.border};" title="${act.title || ''}">` +
            `<span class="cal-activity-dot" style="${_accDot(color)}background:${color.text};"></span>` +
            `<span>${shortLabel}</span></div>`;
  });
  if (dayActs.length > 3) html += `<div class=" text-[11px] text-gray-400 text-center mt-0.5">+${dayActs.length - 3} 项</div>`;
  // 无活动时才显示任务标签（紧凑，最多 2 条，避免挤爆方形格）
  if (dayActs.length === 0) {
    const dayActIds = new Set(dayActs.map(a => a.id));
    const dayTasksDirect = ct;
    const dayTasksViaAct = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId));
    const allDayTasks = [...dayTasksDirect, ...dayTasksViaAct];
    const filteredTasks = filterTasksByManagementRole(allDayTasks, managementRole);
    filteredTasks.slice(0, 2).forEach(t => {
      const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
      html += `<div class="cal-task-tag" style="${_accDark(c)}background:${c.bg};color:${c.text};border:1px solid ${c.border};"><span class="task-dot" style="${_accDot(c)}background:${c.text};"></span><span class="truncate">${t.title}</span></div>`;
    });
  }
  return html;
}

// ════════════════════════════════════════════════════════════════
//  周视图 — 显示当前选中日期所在周
// ════════════════════════════════════════════════════════════════
function _renderWeekView(grid, activeActivities, tasks, month, state) {
  const { viewType, managementRole, selectedDate } = state || {};
  const now = new Date();
  const todayKey = _fmtDate(now);
  const DN = ['周一','周二','周三','周四','周五','周六','周日'];

  // 确定基准日期
  const refDate = selectedDate ? new Date(selectedDate) : now;
  const refDow = (refDate.getDay() + 6) % 7; // 0=周一
  const weekStart = new Date(refDate);
  weekStart.setDate(refDate.getDate() - refDow);

  const tasksByDate = {};
  tasks.forEach(t => {
    if (t.date) {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    }
  });

  let html = `<div class="mb-6">`;
  html += `<div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">`;
  html += `<span class=" text-sm font-bold text-gray-700">${weekStart.getFullYear()}年 第${_getWeekNumber(weekStart)}周</span>`;
  html += `<div class="flex gap-1">`;
  html += `<button id="cal-week-prev" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">上一周</button>`;
  html += `<button id="cal-week-next" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">下一周</button>`;
  html += `</div></div>`;

  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">`;
  DN.forEach(d => { html += `<div class=" text-[12px] text-gray-400 text-center pb-1 font-semibold">${d}</div>`; });

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const k = _fmtDate(d);
    const isT = k === todayKey;
    const ct = tasksByDate[k] || [];
    const hasActivity = activeActivities.some(a => a.date === k);
    let cls = 'cal-cell-large';
    if (ct.length > 0 || hasActivity) cls += ' has-tasks';
    if (isT) cls += ' is-today';
    if (k === selectedDate) cls += ' selected';

    html += `<div class="${cls}" data-date="${k}" style="min-height:8rem;">`;
    html += `<div class=" text-[12px] font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${d.getDate()}</div>`;
    html += _renderCellContent(k, activeActivities, ct, hasActivity, tasks, state, 8);
    html += '</div>';
  }
  html += '</div></div>';
  grid.innerHTML = html;

  _bindCellClicks(grid);

  // 周导航
  document.getElementById('cal-week-prev')?.addEventListener('click', () => {
    const prevWeek = new Date(weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setState({ selectedDate: _fmtDate(prevWeek), displayMonth: _fmtDate(prevWeek).slice(0, 7) });
    renderCalendarByActivities(getAppState(), getAppState().displayMonth);
  });
  document.getElementById('cal-week-next')?.addEventListener('click', () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setState({ selectedDate: _fmtDate(nextWeek), displayMonth: _fmtDate(nextWeek).slice(0, 7) });
    renderCalendarByActivities(getAppState(), getAppState().displayMonth);
  });
}

// ════════════════════════════════════════════════════════════════
//  日视图 — 时间轴 + 任务卡片
// ════════════════════════════════════════════════════════════════
function _renderDayView(grid, activeActivities, tasks, month, state) {
  const { selectedDate } = state || {};
  const now = new Date();
  const todayKey = _fmtDate(now);
  const targetDate = selectedDate || todayKey;
  const d = new Date(targetDate);
  const WEEKDAY = ['日','一','二','三','四','五','六'];

  const dayActivities = activeActivities.filter(a => a.date === targetDate);
  const dayTasks = tasks.filter(t => t.date === targetDate);
  const dayActIds = new Set(dayActivities.map(a => a.id));
  const indirectTasks = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId));
  const allTasks = [...dayTasks, ...indirectTasks];

  let html = `<div class="mb-6">`;
  html += `<div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">`;
  html += `<span class=" text-sm font-bold text-gray-700">${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}</span>`;
  html += `<div class="flex gap-1">`;
  html += `<button id="cal-day-prev" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">前一天</button>`;
  html += `<button id="cal-day-next" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">后一天</button>`;
  html += `</div></div>`;

  if (dayActivities.length === 0 && allTasks.length === 0) {
    html += `<p class="text-xs text-gray-400 text-center py-8">当日无活动或任务</p>`;
  } else {
    // 活动卡片
    if (dayActivities.length > 0) {
      html += `<div class="mb-4"><div class="text-xs font-bold text-gray-500 mb-2">活动 (${dayActivities.length})</div>`;
      dayActivities.forEach(act => {
        const color = getActivityColor(act);
        html += `<div class="p-3 rounded-xl mb-2 border" style="${_accDark(color)}background:${color.bg};border-color:${color.border};">`;
        html += `<div class="flex items-center gap-2 mb-1"><span class="cal-activity-dot" style="${_accDot(color)}background:${color.text};"></span><span class="text-sm font-medium" style="${_accText(color)}color:${color.text};">${act.title || '未命名'}</span></div>`;
        html += `<div class="text-xs text-gray-500">${act.type || ''} ${act.location ? '· ' + act.location : ''}</div>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // 任务卡片
    if (allTasks.length > 0) {
      html += `<div><div class="text-xs font-bold text-gray-500 mb-2">任务 (${allTasks.length})</div>`;
      allTasks.forEach(t => {
        const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
        html += `<div class="p-3 rounded-xl mb-2 border" style="${_accDark(c)}background:${c.bg};border-color:${c.border};">`;
        html += `<div class="flex items-center gap-2"><span class="task-dot" style="${_accDot(c)}background:${c.text};"></span><span class="text-sm font-medium" style="${_accText(c)}color:${c.text};">${t.title}</span></div>`;
        if (t.desc) html += `<div class="text-xs text-gray-500 mt-1">${t.desc}</div>`;
        html += `</div>`;
      });
      html += `</div>`;
    }
  }
  html += `</div>`;
  grid.innerHTML = html;

  // 日导航
  document.getElementById('cal-day-prev')?.addEventListener('click', () => {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const prevKey = _fmtDate(prev);
    setState({ selectedDate: prevKey, displayMonth: prevKey.slice(0, 7) });
    renderCalendarByActivities(getAppState(), getAppState().displayMonth);
  });
  document.getElementById('cal-day-next')?.addEventListener('click', () => {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const nextKey = _fmtDate(next);
    setState({ selectedDate: nextKey, displayMonth: nextKey.slice(0, 7) });
    renderCalendarByActivities(getAppState(), getAppState().displayMonth);
  });
}

// ════════════════════════════════════════════════════════════════
//  列表视图 — 日期降序，活动+任务混合列表
// ════════════════════════════════════════════════════════════════
function _renderListView(grid, activeActivities, tasks, month, state) {
  const [y, m] = month.split('-').map(Number);
  const monthActivities = activeActivities.filter(a => typeof a.date === 'string' && a.date.startsWith(month));
  // T223 排序统一：跨日按 date 降序（新者在前）；同日内未完成在上、已完成在下
  monthActivities.sort((a, b) => {
    if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
    const aDone = a.archived || ['completed', 'cancelled'].includes(a.status);
    const bDone = b.archived || ['completed', 'cancelled'].includes(b.status);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return 0;
  });

  let html = `<div class="mb-6">`;
  html += `<div class=" text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">${y}年${m}月 活动列表</div>`;

  if (monthActivities.length === 0) {
    html += `<p class="text-xs text-gray-400 text-center py-8">本月无活动</p>`;
  } else {
    let lastDate = '';
    monthActivities.forEach(act => {
      if (act.date !== lastDate) {
        lastDate = act.date;
        const d = new Date(act.date);
        const WEEKDAY = ['日','一','二','三','四','五','六'];
        html += `<div class=" text-xs font-bold text-gray-500 mt-3 mb-1.5 pb-1 border-b border-gray-100">${d.getMonth()+1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}</div>`;
      }
      const color = getActivityColor(act);
      html += `<div class="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer cal-list-item" data-act-id="${act.id}" data-date="${act.date}">`;
      html += `<span class="cal-activity-dot" style="${_accDot(color)}background:${color.text};"></span>`;
      html += `<div class="flex-1 min-w-0">`;
      html += `<div class="text-sm font-medium text-gray-800 truncate">${act.title || '未命名'}</div>`;
      html += `<div class="text-xs text-gray-500">${act.type || ''} ${act.location ? '· ' + act.location : ''}</div>`;
      html += `</div>`;
      html += badgeHtml(act.status === 'published' ? '已发布' : '草稿', act.status === 'published' ? 'info' : 'neutral');
      html += `</div>`;
    });
  }
  html += `</div>`;
  grid.innerHTML = html;

  // 列表项点击：进入该活动详情
  grid.querySelectorAll('.cal-list-item').forEach(item => {
    item.addEventListener('click', () => {
      setState({ selectedDate: item.dataset.date, selectedActivityId: item.dataset.actId, viewMode: 'detail' });
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  共享工具函数
// ════════════════════════════════════════════════════════════════

function _renderCellContent(dateKey, activeActivities, ct, hasActivity, tasks, state, maxItems = 4) {
  const { viewType, managementRole } = state || {};
  let html = '';

  if (viewType === 'participant') {
    const dayActs = activeActivities.filter(a => a.date === dateKey);
    dayActs.slice(0, maxItems).forEach(act => {
      const color = getActivityColor(act);
      html += `<div class="cal-activity-tag cal-activity-item cursor-pointer hover:brightness-95 transition-all" data-act-id="${act.id || ''}" data-date="${dateKey}" style="${_accDark(color)}background:${color.bg};color:${color.text};border:1px solid ${color.border};" title="${act.title || ''}">` +
              `<span class="cal-activity-dot" style="${_accDot(color)}background:${color.text};"></span>` +
              `<span class="truncate">${act.title || ''}</span></div>`;
    });
    if (dayActs.length > maxItems) html += `<div class=" text-[11px] text-gray-400 text-center mt-0.5">+${dayActs.length - maxItems} 项活动</div>`;
  } else {
    // 非参与者模式：先渲染活动条目（可点击进入详情）
    const dayActs = activeActivities.filter(a => a.date === dateKey);
    if (dayActs.length > 0) {
      dayActs.slice(0, maxItems).forEach(act => {
        const color = getActivityColor(act);
        html += `<div class="cal-activity-tag cal-activity-item cursor-pointer hover:brightness-95 transition-all" data-act-id="${act.id || ''}" data-date="${dateKey}" style="${_accDark(color)}background:${color.bg};color:${color.text};border:1px solid ${color.border};" title="${act.title || ''}">` +
                `<span class="cal-activity-dot" style="${_accDot(color)}background:${color.text};"></span>` +
                `<span class="truncate">${act.title || ''}</span></div>`;
      });
      if (dayActs.length > maxItems) html += `<div class=" text-[11px] text-gray-400 text-center mt-0.5">+${dayActs.length - maxItems} 项活动</div>`;
    } else if (hasActivity) {
      // 仅有活动标记但无具体活动条目时，保留原角色点指示
      const dateActRoles = activeActivities.filter(a => a.date === dateKey).map(a => a.executor || 'all');
      const uniqueRoles = [...new Set(dateActRoles)];
      const ROLE_ORDER = ['leader', 'commissioner', 'organizer', 'deep', 'all'];
      const sortedRoles = ROLE_ORDER.filter(r => uniqueRoles.includes(r));
      if (sortedRoles.length === 0) sortedRoles.push('all');
      html += '<div style="display:flex;gap:2px;justify-content:center;margin:2px 0;">';
      sortedRoles.forEach(r => {
        const c = ROLE_COLORS[r] || ROLE_COLORS.all;
        html += `<div style="--acc-dot-dark:${c.textDark};width:6px;height:6px;border-radius:50%;background:${c.text};flex-shrink:0;"></div>`;
      });
      html += '</div>';
    }
    const dayActIds = new Set(dayActs.map(a => a.id));
    const dayTasksDirect = ct;
    const dayTasksViaAct = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId));
    const allDayTasks = [...dayTasksDirect, ...dayTasksViaAct];
    const filteredTasks = filterTasksByManagementRole(allDayTasks, managementRole);
    const focusedTasks = state.selectedActivityId
      ? filteredTasks.filter(t => t.activityId === state.selectedActivityId)
      : filteredTasks;
    focusedTasks.slice(0, maxItems).forEach(t => {
      const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
      html += `<div class="cal-task-tag" style="${_accDark(c)}background:${c.bg};color:${c.text};border:1px solid ${c.border};">` +
              `<span class="task-dot" style="${_accDot(c)}background:${c.text};"></span>` +
              `<span class="truncate">${t.title}</span></div>`;
    });
    if (focusedTasks.length > maxItems) html += `<div class=" text-[11px] text-gray-400 mt-0.5">+${focusedTasks.length - maxItems} 项任务</div>`;
  }
  return html;
}

function _bindCellClicks(grid, mode) {
  // 单元格空白处点击（保留原"选中日期"行为，显示该日列表）
  grid.querySelectorAll('.cal-cell-large.has-tasks').forEach(cell => {
    cell.addEventListener('click', (e) => {
      // 如果点击的是活动条目，不触发单元格选中（由活动条目独立处理）
      if (e.target.closest('.cal-activity-item')) return;
      grid.querySelectorAll('.cal-cell-large.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      setState({ selectedDate: cell.dataset.date, viewMode: 'list', selectedActivityId: null });
    });
  });
  // 活动条目独立 click：直接进入该活动详情（取消"先选日、再选活动"两步）
  // J3（2026-08-08）：首页（dashboard 模式）不绑定独立 handler——
  // 事件冒泡到 main-entry.js 首页委托跳转对应工作台直达活动；工作台场景保持 setState 详情。
  if (mode === 'dashboard') return;
  grid.querySelectorAll('.cal-activity-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = item.dataset.actId;
      const date = item.dataset.date;
      if (!actId) return;
      // 选中该单元格视觉状态
      grid.querySelectorAll('.cal-cell-large.selected').forEach(c => c.classList.remove('selected'));
      const parentCell = item.closest('.cal-cell-large');
      if (parentCell) parentCell.classList.add('selected');
      setState({
        selectedDate: date,
        selectedActivityId: actId,
        viewMode: 'detail',
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  手机端交互式日历 — 圆点指示器 + 点击展开详情面板
// ════════════════════════════════════════════════════════════════
function _renderMobileDots(dateKey, activeActivities, ct, hasActivity, tasks, state) {
  const { viewType, managementRole } = state || {};
  let html = '';

  if (viewType === 'participant') {
    const dayActs = activeActivities.filter(a => a.date === dateKey);
    if (dayActs.length > 0) {
      html += '<div class="cal-mobile-dots">';
      dayActs.slice(0, 3).forEach(act => {
        const color = getActivityColor(act);
        html += `<span class="cal-mobile-dot" style="${_accDot(color)}background:${color.text};"></span>`;
      });
      if (dayActs.length > 3) html += `<span class="cal-mobile-dot-more">+${dayActs.length - 3}</span>`;
      html += '</div>';
    }
  } else {
    // 非参与者模式：收集所有颜色点
    const dots = [];
    if (hasActivity) {
      const dateActRoles = activeActivities.filter(a => a.date === dateKey).map(a => a.executor || 'all');
      const uniqueRoles = [...new Set(dateActRoles)];
      uniqueRoles.forEach(r => {
        const c = ROLE_COLORS[r] || ROLE_COLORS.all;
        dots.push({ text: c.text, dark: c.textDark });
      });
    }
    const dayActIds = new Set(activeActivities.filter(a => a.date === dateKey).map(a => a.id));
    const dayTasksDirect = ct;
    const dayTasksViaAct = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId));
    const allDayTasks = [...dayTasksDirect, ...dayTasksViaAct];
    const filteredTasks = filterTasksByManagementRole(allDayTasks, managementRole);
    filteredTasks.forEach(t => {
      const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
      if (!dots.some(x => x.text === c.text)) dots.push({ text: c.text, dark: c.textDark });
    });

    if (dots.length > 0) {
      html += '<div class="cal-mobile-dots">';
      dots.slice(0, 4).forEach(d => {
        html += `<span class="cal-mobile-dot" style="background:${d.text};--acc-dot-dark:${d.dark};"></span>`;
      });
      if (dots.length > 4) html += `<span class="cal-mobile-dot-more">+${dots.length - 4}</span>`;
      html += '</div>';
    }
  }
  return html;
}

function _bindMobileCellClicks(grid, activeActivities, tasks, month, state) {
  grid.querySelectorAll('.cal-cell-mobile.has-tasks').forEach(cell => {
    cell.addEventListener('click', () => {
      // 移除之前的选中状态
      grid.querySelectorAll('.cal-cell-mobile.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      _showMobileDayDetail(cell.dataset.date, activeActivities, tasks, state);
    });
  });
}

function _showMobileDayDetail(dateKey, activeActivities, tasks, state) {
  let panel = document.getElementById('cal-mobile-detail');
  if (!panel) {
    const grid = document.getElementById('cal-main-grid');
    if (!grid) return;
    panel = document.createElement('div');
    panel.id = 'cal-mobile-detail';
    panel.className = 'cal-mobile-detail';
    grid.parentNode.insertBefore(panel, grid.nextSibling);
  }

  const { viewType, managementRole } = state || {};
  const d = new Date(dateKey);
  const WEEKDAY = ['日','一','二','三','四','五','六'];

  const dayActivities = activeActivities.filter(a => a.date === dateKey);
  const dayTasks = tasks.filter(t => t.date === dateKey);
  const dayActIds = new Set(dayActivities.map(a => a.id));
  const indirectTasks = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId));
  const allTasks = [...dayTasks, ...indirectTasks];
  const filteredTasks = filterTasksByManagementRole(allTasks, managementRole);

  let html = `<div class="cal-mobile-detail-header">`;
  html += `<span class=" text-sm font-bold text-gray-700">${d.getMonth()+1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}</span>`;
  html += `<button id="cal-mobile-detail-close" class="cal-mobile-detail-close">&times;</button>`;
  html += `</div>`;

  if (dayActivities.length === 0 && filteredTasks.length === 0) {
    html += `<p class="text-xs text-gray-400 text-center py-4">当日无活动或任务</p>`;
  } else {
    if (dayActivities.length > 0) {
      html += `<div class="cal-mobile-detail-section"><div class="text-xs font-bold text-gray-500 mb-2">活动 (${dayActivities.length})</div>`;
      dayActivities.forEach(act => {
        const color = getActivityColor(act);
        html += `<div class="cal-mobile-detail-card" style="border-left:3px solid ${color.text};">`;
        html += `<div class="text-sm font-medium" style="color:${color.text};">${act.title || '未命名'}</div>`;
        html += `<div class="text-xs text-gray-500 mt-1">${act.type || ''} ${act.location ? '· ' + act.location : ''}</div>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    if (filteredTasks.length > 0) {
      html += `<div class="cal-mobile-detail-section"><div class="text-xs font-bold text-gray-500 mb-2">任务 (${filteredTasks.length})</div>`;
      filteredTasks.forEach(t => {
        const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
        html += `<div class="cal-mobile-detail-card" style="border-left:3px solid ${c.text};">`;
        html += `<div class="text-sm font-medium" style="color:${c.text};">${t.title}</div>`;
        if (t.desc) html += `<div class="text-xs text-gray-500 mt-1">${t.desc}</div>`;
        html += `</div>`;
      });
      html += `</div>`;
    }
  }

  panel.innerHTML = html;
  panel.classList.add('visible');

  document.getElementById('cal-mobile-detail-close')?.addEventListener('click', () => {
    panel.classList.remove('visible');
    document.querySelectorAll('.cal-cell-mobile.selected').forEach(c => c.classList.remove('selected'));
  });
}

function _getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ════════════════════════════════════════════════════════════════
//  月份选择器：提取活动月份并填充 #month-selector
// ════════════════════════════════════════════════════════════════
let _monthSelectorBound = false;

export function populateMonthSelector(activities, targetMonth) {
  const sel = document.getElementById('month-selector');
  const currentMonth = _currentYearMonth();
  const appState = getAppState();
  if (!sel) return appState.displayMonth || currentMonth;

  const months = [...new Set(
    activities
      .filter(a => !a.archived && typeof a.date === 'string' && a.date.length >= 7)
      .map(a => a.date.slice(0, 7))
  )].sort().reverse();

  const existing = [...sel.options].slice(1).map(o => o.value);
  const changed = months.length !== existing.length || months.some((m, i) => m !== existing[i]);
  if (changed) {
    const prev = sel.value;
    sel.innerHTML = '<option value="">全部月份</option>';
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
    if (targetMonth && months.includes(targetMonth)) {
      sel.value = targetMonth; // URL 直达月份优先（2026-08-08：首页跳转落点）
    } else if (months.includes(prev)) {
      sel.value = prev;
    } else if (months.includes(currentMonth)) {
      sel.value = currentMonth; // 默认跟随当前月份（书记 2026-08-01：已进入8月，不得停留在旧月）
    } else if (months.includes(appState.displayMonth)) {
      sel.value = appState.displayMonth;
    } else if (months.length > 0) {
      sel.value = months[0];
    }
  } else if (targetMonth && months.includes(targetMonth)) {
    // 选项未变但需切到目标月份（如 URL 直达指定月）
    sel.value = targetMonth;
  }

  if (!_monthSelectorBound) {
    _monthSelectorBound = true;
    sel.addEventListener('change', () => {
      const selectedMonth = sel.value || currentMonth;
      if (sel.value) {
        const t0 = document.getElementById('t0-input-cal');
        if (t0) t0.value = sel.value + '-01';
      }
      setState({ displayMonth: selectedMonth, selectedDate: null, viewMode: 'list', selectedActivityId: null });
    });
  }

  return sel.value || appState.displayMonth || currentMonth;
}

function _renderLegend(activeActivities) {
  const legend = document.getElementById('calendar-legend');
  const items  = document.getElementById('legend-items');
  if (!legend || !items) return;

  const usedCategories = new Set();
  activeActivities.forEach(a => {
    const color = getActivityColor(a);
    if (color && color !== ACTIVITY_CATEGORY_COLORS.default) {
      usedCategories.add(color.text);
    }
  });

  const seen = new Set();
  const entries = [];
  for (const [key, color] of Object.entries(ACTIVITY_CATEGORY_COLORS)) {
    if (key === 'default') continue;
    if (usedCategories.size > 0 && !usedCategories.has(color.text)) continue;
    if (seen.has(color.text)) continue;
    seen.add(color.text);
    entries.push({ key, label: ACTIVITY_TYPE_LABELS[key] || key, color });
  }

  if (entries.length === 0) {
    legend.classList.add('hidden');
    return;
  }

  legend.classList.remove('hidden');
  items.innerHTML = entries.map(e =>
    `<div class="legend-item">
      <span class="legend-swatch" style="background-color:${e.color.text};opacity:0.85;"></span>
      <span class="legend-label">${e.label}</span>
    </div>`
  ).join('');

  const toggleBtn = document.getElementById('toggle-legend-btn');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      items.classList.toggle('hidden');
      toggleBtn.textContent = items.classList.contains('hidden') ? '展开' : '收起';
    };
  }
}

// ════════════════════════════════════════════════════════════════
//  首页专用渲染入口 — 仅月视图 + 精简（maxItems=2）+ 悬停浮窗
// ════════════════════════════════════════════════════════════════

let _hoverPopover = null;
let _hoverTimer = null;

function _bindHoverPreview(grid, activeActivities) {
  if (window.innerWidth < 768) return;
  const cells = grid.querySelectorAll('.cal-cell-large.has-tasks');
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      clearTimeout(_hoverTimer);
      const dateKey = cell.dataset.date;
      const dayActs = activeActivities.filter(a => a.date === dateKey);
      if (dayActs.length === 0) return;
      _showHoverPopover(cell, dateKey, dayActs);
    });
    cell.addEventListener('mouseleave', () => {
      _hoverTimer = setTimeout(() => _hideHoverPopover(), 150);
    });
  });
}

function _showHoverPopover(anchor, dateKey, dayActs) {
  if (!_hoverPopover) {
    _hoverPopover = document.createElement('div');
    _hoverPopover.id = 'cal-hover-popover';
    _hoverPopover.addEventListener('mouseenter', () => clearTimeout(_hoverTimer));
    _hoverPopover.addEventListener('mouseleave', () => {
      _hoverTimer = setTimeout(() => _hideHoverPopover(), 150);
    });
    document.body.appendChild(_hoverPopover);
  }

  const d = new Date(dateKey);
  const WEEKDAY = ['日','一','二','三','四','五','六'];
  const maxShow = 5;

  let listHTML = dayActs.slice(0, maxShow).map(act => {
    const color = getActivityColor(act);
    const typeLabel = ACTIVITY_TYPE_LABELS[act.scenarioId] || ACTIVITY_TYPE_LABELS[act.type] || act.type || '';
    return `<div class="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-b-0">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="${_accDot(color)}background:${color.text};"></span>
      <span class="text-sm text-gray-700 flex-1">${act.title || '未命名'}</span>
      <span class="text-xs text-gray-400 flex-shrink-0">${typeLabel}</span>
    </div>`;
  }).join('');
  if (dayActs.length > maxShow) {
    listHTML += `<div class="text-xs text-gray-400 text-center py-1">+${dayActs.length - maxShow} 项</div>`;
  }

  _hoverPopover.innerHTML = `
    <div class="px-3 py-2 border-b border-gray-100">
      <span class="font-medium text-sm text-gray-800">${d.getMonth()+1}月${d.getDate()}日 周${WEEKDAY[d.getDay()]}</span>
    </div>
    <div class="px-3 py-1.5 max-h-48 overflow-y-auto">${listHTML}</div>
  `;

  const rect = anchor.getBoundingClientRect();
  const popoverWidth = 280;
  let left = rect.right + window.scrollX + 8;
  let top = rect.top + window.scrollY;

  if (rect.right + popoverWidth + 16 > window.innerWidth) {
    left = rect.left + window.scrollX - popoverWidth - 8;
  }
  if (left < window.scrollX) {
    left = rect.left + window.scrollX;
    top = rect.bottom + window.scrollY + 8;
  }

  _hoverPopover.style.cssText = `
    position:absolute;z-index:50;background:var(--surface-card);border-radius:12px;
    box-shadow:0 8px 24px rgba(0,0,0,0.12);border:1px solid var(--neutral-200);
    width:${popoverWidth}px;display:block;
    left:${left}px;top:${top}px;
  `;
}

function _hideHoverPopover() {
  if (_hoverPopover) _hoverPopover.style.display = 'none';
}

function _renderMonthViewCompact(grid, activeActivities, month, state, mode) {
  const now = new Date();
  const [y, m] = month.split('-').map(Number);
  const todayKey = _fmtDate(now);
  const MN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const DN = ['一','二','三','四','五','六','日'];

  const actDates = new Set(
    activeActivities.filter(a => typeof a.date === 'string' && a.date.startsWith(month)).map(a => a.date)
  );

  const rawFirst = new Date(y, m - 1, 1).getDay();
  const firstDow = (rawFirst + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();

  let html = `<div class="mb-6">`;
  html += `<div class=" text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">${y}年 ${MN[m - 1]}</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:auto;gap:2px;">`;
  DN.forEach(d => { html += `<div class=" text-[12px] text-gray-400 text-center pb-1.5 font-semibold">${d}</div>`; });

  for (let i = 0; i < firstDow; i++) {
    html += '<div class="cal-cell-large cal-cell-compact" style="background:transparent;border-color:transparent;"></div>';
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const k = `${month}-${String(day).padStart(2, '0')}`;
    const isT = k === todayKey;
    const hasActivity = actDates.has(k);
    let cls = 'cal-cell-large';
    if (hasActivity) cls += ' has-tasks';
    if (isT) cls += ' is-today';

    html += `<div class="${cls} cal-cell-compact" data-date="${k}">`;
    html += `<div class=" text-[12px] font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${day}</div>`;
    const dayActs = activeActivities.filter(a => a.date === k);
    dayActs.slice(0, 3).forEach(act => {
      const color = getActivityColor(act);
      const shortLabel = ACTIVITY_TYPE_SHORT[act.scenarioId] || ACTIVITY_TYPE_SHORT[act.type] || (act.type ? act.type.slice(0, 2) : '活动');
      html += `<div class="cal-activity-tag cal-activity-item cursor-pointer hover:brightness-95 transition-all" data-act-id="${act.id || ''}" data-date="${k}" style="${_accDark(color)}background:${color.bg};color:${color.text};border:1px solid ${color.border};" title="${act.title || ''}">` +
              `<span class="cal-activity-dot" style="${_accDot(color)}background:${color.text};"></span>` +
              `<span>${shortLabel}</span></div>`;
    });
    if (dayActs.length > 3) html += `<div class=" text-[11px] text-gray-400 text-center mt-0.5">+${dayActs.length - 3} 项</div>`;
    html += '</div>';
  }
  html += '</div></div>';
  grid.innerHTML = html;

  _bindCellClicks(grid, mode);
  _bindHoverPreview(grid, activeActivities);
}

export function renderCalendarForDashboard(state, targetMonth) {
  const grid  = document.getElementById('cal-main-grid');
  const empty = document.getElementById('cal-main-empty');
  if (!grid) return;

  const { activities: rawActivities } = state || {};
  const activities = rawActivities || [];
  const activeActivities = activities.filter(a => !a.archived);

  if (activeActivities.length === 0) {
    grid.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    const legend = document.getElementById('calendar-legend');
    if (legend) legend.classList.add('hidden');
    return;
  }

  _renderLegend(activeActivities);

  if (empty) empty.classList.add('hidden');
  grid.classList.remove('hidden');

  const month = targetMonth || _currentYearMonth();
  // J3（2026-08-08）：首页模式传入 'dashboard'，日历条目点击不再 setState 详情，
  // 而是冒泡到 main-entry.js 首页委托 → 跳转对应工作台直达该活动。
  _renderMonthViewCompact(grid, activeActivities, month, state, 'dashboard');
}
