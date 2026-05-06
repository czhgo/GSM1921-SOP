// role: [人机]
// ════════════════════════════════════════════════════════════════
//  calendar.js — 日历渲染引擎
//  包含：renderCalendarByActivities, populateMonthSelector
//  保留旧版 renderLargeCalendar（历史兼容，不对外暴露）
// ════════════════════════════════════════════════════════════════

import { getAppState, setState } from './state.js';
import { ROLE_COLORS, getActivityColor, ACTIVITY_CATEGORY_COLORS, ACTIVITY_TYPE_LABELS } from './constants.js';
import { _fmtDate, _currentYearMonth } from './utils.js';
import { filterTasksByManagementRole } from './inspector.js';

// ════════════════════════════════════════════════════════════════
//  动态日历渲染引擎 — 按月份 + 活动红点映射
// ════════════════════════════════════════════════════════════════
export function renderCalendarByActivities(state, targetMonth) {
  const grid  = document.getElementById('cal-main-grid');
  const empty = document.getElementById('cal-main-empty');
  if (!grid) return;

  const { activities: rawActivities, tasks: rawTasks, viewType, managementRole, viewArchived } = state || {};
  const activities = rawActivities || [];
  const tasks = rawTasks || [];

  // ── 全域归档清洗：所有后续逻辑统一基于 activeActivities ──────────
  const activeActivities = activities.filter(a => !a.archived);

  const now = new Date();
  const month = targetMonth || _currentYearMonth();
  const [y, m] = month.split('-').map(Number);

  // ── 空状态拦截：若没有任何未归档活动，渲染引导提示 ──────────────
  if (activeActivities.length === 0) {
    grid.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    const legend = document.getElementById('calendar-legend');
    if (legend) legend.classList.add('hidden');
    return;
  }

  // ── 图例渲染 ──────────────────────────────────────────────────
  _renderLegend(activeActivities);

  // 未归档活动 → 活动日期集合（当月）
  const actDates = new Set(
    activeActivities
      .filter(a => typeof a.date === 'string' && a.date.startsWith(month))
      .map(a => a.date)
  );

  // tasks（字符串日期）→ 按日期分组（当月）
  const tasksByDate = {};
  tasks.forEach(t => {
    if (t.date && typeof t.date === 'string' && t.date.startsWith(month)) {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    }
  });

  if (empty) empty.classList.add('hidden');
  grid.classList.remove('hidden');

  const todayKey = _fmtDate(now);
  const MN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const DN = ['一','二','三','四','五','六','日'];
  const rawFirst = new Date(y, m - 1, 1).getDay();
  const firstDow = (rawFirst + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();

  let html = `<div class="mb-6">`;
  html += `<div class="font-stheiti text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">${y}年 ${MN[m - 1]}</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">`;
  DN.forEach(d => {
    html += `<div class="font-stheiti text-[11px] text-gray-400 text-center pb-1.5 font-semibold">${d}</div>`;
  });
  for (let i = 0; i < firstDow; i++) {
    html += '<div class="cal-cell-large" style="background:transparent;border-color:transparent;"></div>';
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const k = `${month}-${String(day).padStart(2, '0')}`;
    const isT = k === todayKey;
    const ct = tasksByDate[k] || [];
    const hasActivity = actDates.has(k);
    let cls = 'cal-cell-large';
    if (ct.length > 0 || hasActivity) cls += ' has-tasks';
    if (isT) cls += ' is-today';

    html += `<div class="${cls}" data-date="${k}">`;
    html += `<div class="font-stheiti text-[11px] font-semibold mb-1 ${isT ? 'text-red-600' : 'text-gray-600'}">${day}</div>`;
    if (viewType === 'participant') {
      // 参与者视图：按活动类型着色，彻底告别灰色
      const dayActs = activeActivities.filter(a => a.date === k);
      dayActs.slice(0, 4).forEach(act => {
        const color = getActivityColor(act);
        html += `<div class="cal-activity-tag" style="background:${color.bg};color:${color.text};border:1px solid ${color.border};" title="${act.title || ''}">` +
                `<span class="cal-activity-dot" style="background:${color.text};"></span>` +
                `<span class="truncate">${act.title || ''}</span></div>`;
      });
      if (dayActs.length > 4) html += `<div class="font-stheiti text-[9px] text-gray-400 text-center mt-0.5">+${dayActs.length - 4} 项活动</div>`;
    } else {
      // 管理视图：角色点阵 + 任务透视 + 四色视觉联动
      if (hasActivity) {
        const dateActRoles = activeActivities
          .filter(a => a.date === k)
          .map(a => a.executor || 'all');
        const uniqueRoles = [...new Set(dateActRoles)];
        const ROLE_ORDER = ['leader', 'commissioner', 'organizer', 'deep', 'all'];
        const sortedRoles = ROLE_ORDER.filter(r => uniqueRoles.includes(r));
        if (sortedRoles.length === 0) sortedRoles.push('all');
        html += '<div style="display:flex;gap:2px;justify-content:center;margin:2px 0;">';
        sortedRoles.forEach(r => {
          const c = ROLE_COLORS[r] || ROLE_COLORS.all;
          html += `<div style="width:6px;height:6px;border-radius:50%;background:${c.text};flex-shrink:0;"></div>`;
        });
        html += '</div>';
      }
      // Step 1: 找出当天所有未归档活动的 ID 集合（用于关联无直接日期字段的任务）
      const dayActIds = new Set(activeActivities.filter(a => a.date === k).map(a => a.id));
      // Step 2: 合并直接带日期的任务 + 通过 activityId 挂载的任务
      // 两者互斥（前者有 date，后者无 date），无需额外去重
      const dayTasksDirect = ct;
      const dayTasksViaAct = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId));
      const allDayTasks = [...dayTasksDirect, ...dayTasksViaAct];
      // Step 3: 按 managementRole 过滤，实现角色任务透视
      const filteredTasks = filterTasksByManagementRole(allDayTasks, managementRole);
      // Step 4 (Focus Mode): 若存在选中活动，二次过滤至该活动的任务
      const focusedTasks = state.selectedActivityId
        ? filteredTasks.filter(t => t.activityId === state.selectedActivityId)
        : filteredTasks;
      // Step 5: 四色渲染，每天最多 3 个，超出显示 +N 项任务
      focusedTasks.slice(0, 3).forEach(t => {
        const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
        html += `<div class="cal-task-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">` +
                `<span class="task-dot" style="background:${c.text};"></span>` +
                `<span class="truncate">${t.title}</span></div>`;
      });
      if (focusedTasks.length > 3) html += `<div class="font-stheiti text-[9px] text-gray-400 mt-0.5">+${focusedTasks.length - 3} 项任务</div>`;
    }
    html += '</div>';
  }
  html += '</div></div>';
  grid.innerHTML = html;

  grid.querySelectorAll('.cal-cell-large.has-tasks').forEach(cell => {
    cell.addEventListener('click', () => {
      grid.querySelectorAll('.cal-cell-large.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      setState({ selectedDate: cell.dataset.date, viewMode: 'list', selectedActivityId: null });
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  月份选择器：提取活动月份并填充 #month-selector
//  返回当前有效的显示月份 (YYYY-MM)
// ════════════════════════════════════════════════════════════════
let _monthSelectorBound = false;

export function populateMonthSelector(activities) {
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
    if (months.includes(prev)) {
      sel.value = prev;
    } else if (months.includes(appState.displayMonth)) {
      sel.value = appState.displayMonth;
    } else if (months.length > 0) {
      sel.value = months[0];
    }
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
