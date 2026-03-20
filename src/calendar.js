// ════════════════════════════════════════════════════════════════
//  calendar.js — 日历渲染引擎
//  包含：renderCalendarByActivities, populateMonthSelector
//  保留旧版 renderLargeCalendar（历史兼容，不对外暴露）
// ════════════════════════════════════════════════════════════════

import { getAppState, setState } from './state.js';
import { ROLE_COLORS } from './constants.js';
import { _fmtDate, _currentYearMonth } from './utils.js';

// ════════════════════════════════════════════════════════════════
//  动态日历渲染引擎 — 按月份 + 活动红点映射
// ════════════════════════════════════════════════════════════════
export function renderCalendarByActivities(activities, targetMonth) {
  const grid  = document.getElementById('cal-main-grid');
  const empty = document.getElementById('cal-main-empty');
  if (!grid) return;

  const appState = getAppState();
  const now = new Date();
  const month = targetMonth || _currentYearMonth();
  const [y, m] = month.split('-').map(Number);

  // ── 空状态拦截：若没有任何未归档活动，渲染引导提示 ──────────────
  const nonArchived = (activities || []).filter(a => !a.archived);
  if (nonArchived.length === 0) {
    grid.classList.add('hidden');
    if (empty) {
      empty.innerHTML = '<p class="font-stheiti text-sm text-gray-400 text-center py-12">暂无活动，点击【写入活动】开始创建</p>';
      empty.classList.remove('hidden');
    }
    return;
  }

  // 未归档活动 → 活动日期集合（当月）
  const actDates = new Set(
    (activities || [])
      .filter(a => !a.archived && typeof a.date === 'string' && a.date.startsWith(month))
      .map(a => a.date)
  );

  // appState.tasks（字符串日期）→ 按日期分组（当月）
  const tasksByDate = {};
  (appState.tasks || []).forEach(t => {
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
    if (hasActivity) {
      const dateActRoles = (activities || [])
        .filter(a => !a.archived && a.date === k)
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
    ct.slice(0, 3).forEach(t => {
      const c = ROLE_COLORS[t.executor] || ROLE_COLORS.all;
      html += `<div class="cal-task-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};">` +
              `<span class="task-dot" style="background:${c.text};"></span>` +
              `<span class="truncate">${t.title}</span></div>`;
    });
    if (ct.length > 3) html += `<div class="font-stheiti text-[9px] text-gray-400 mt-0.5">+${ct.length - 3} 项</div>`;
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
