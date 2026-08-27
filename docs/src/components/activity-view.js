// role: [工程师]+[AI]
// activity-view.js — 只读活动查看组件（知情权组件，书记 2026-08-08 裁定）
// 供无活动 tab 的工作台（组织委员/宣传委员等）承载 activityId / view=activities 跳转落点：
// 日历视图（复用 calendar.js 渲染引擎）+ 只读活动详情（点击日历条目）。
// 形态依据书记第四轮裁定：「书记的日历视图只要删去写入活动等功能，就可以提供很好的活动详情」。

import { getAppState, setState } from '../core/state.js?v=20260827c';
import { renderCalendarByActivities } from './calendar.js?v=20260827c';
import { _fmtDate, _currentYearMonth, flashHighlight } from '../core/utils.js?v=20260827c';
import { badgeHtml } from './badge.js?v=20260827c';
import { ROLE_COLORS, dotDarkVars } from '../core/constants.js?v=20260827c';
import { activityLifecycleBadgeHtml } from './inspector.js?v=20260827c';

// 任务状态元数据（状态点 + 文案，轻量自包含，避免依赖 status-badge 全家桶）
const _TASK_STATUS_META = {
  pending:     { label: '待处理', color: '#9CA3AF' },
  in_progress: { label: '进行中', color: '#D97706' },
  completed:   { label: '已完成', color: '#16A34A' },
};

/**
 * 渲染只读活动查看视图
 * @param {HTMLElement} container — 工作台 tab 内容容器（#xxx-tab-content）
 * @param {Object} [opts]
 * @param {Array}  [opts.activities] — 活动数据（缺省回退全局 state.activities）
 * @param {Array}  [opts.tasks]      — 任务数据（缺省回退全局 state.tasks）
 * @param {string} [opts.highlightId] — URL 携带的 activityId（定位+高亮该活动）
 * @param {string} [opts.accent]     — 主题色 hex（装饰用）
 */
export function renderActivityView(container, opts = {}) {
  if (!container) return;
  const state = getAppState() || {};
  const activities = opts.activities || state.activities || [];
  const tasks = opts.tasks || state.tasks || [];
  const highlightId = opts.highlightId || null;

  // 骨架（首次渲染，tab 重渲染时保留容器）
  if (container.dataset.avInited !== '1') {
    container.dataset.avInited = '1';
    container.innerHTML = `
      <div class="card rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">活动查看</h3>
          <span class="text-xs text-gray-400">全支部活动一览 · 点击条目查看详情（只读）</span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div class="lg:col-span-3">
            <select id="month-selector" class="input-flat text-xs mb-3"></select>
            <div id="cal-main-grid"></div>
            <div id="calendar-legend" class="mt-3"></div>
          </div>
          <div id="av-detail-panel" class="lg:col-span-2 rounded-xl bg-gray-50/50 border border-gray-100 p-3"></div>
        </div>
      </div>`;
  }

  // ── 月份选择器（activity-view 自管理，不依赖 calendar.js 的全局单绑）──
  const monthSel = container.querySelector('#month-selector');
  const currentMonth = _currentYearMonth();
  const displayMonth = state.displayMonth || currentMonth;
  if (monthSel) {
    const months = [...new Set(
      activities
        .filter(a => !a.archived && typeof a.date === 'string' && a.date.length >= 7)
        .map(a => a.date.slice(0, 7))
    )].sort().reverse();
    monthSel.innerHTML = '<option value="">全部月份</option>'
      + months.map(m => `<option value="${m}" ${m === displayMonth ? 'selected' : ''}>${m}</option>`).join('');
    monthSel.onchange = () => setState({
      displayMonth: monthSel.value || currentMonth,
      selectedActivityId: null,
      selectedDate: null,
      viewMode: 'list',
    });
  }

  // ── 日历（复用 calendar.js 渲染引擎；点击活动条目 → setState → 本组件重渲染详情）──
  renderCalendarByActivities({ ...state, activities }, displayMonth);

  // ── 详情面板：URL 携带 activityId 时优先展示（兜底 state.selectedActivityId）──
  _renderDetail(state, activities, tasks, highlightId);

  // ── 定位高亮（定时自动褪去，书记 2026-08-08 裁定）──
  if (highlightId) {
    setTimeout(() => {
      const item = container.querySelector(`.cal-activity-item[data-act-id="${highlightId}"]`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(item);
        // 通知调用方：定位完成，可清除导航目标（防重渲染反复定位）
        if (typeof opts.onLocated === 'function') opts.onLocated();
      }
    }, 180);
  }
}

/** 只读详情面板：活动信息 + 生命周期 + 任务节点状态 */
function _renderDetail(state, activities, tasks, highlightId) {
  const panel = document.getElementById('av-detail-panel');
  if (!panel) return;
  const actId = state.selectedActivityId || highlightId;
  if (!actId) {
    panel.innerHTML = '<div class="text-sm text-gray-400 text-center py-8">点击日历中的活动条目查看详情</div>';
    return;
  }
  const act = activities.find(a => a.id === actId);
  if (!act) {
    panel.innerHTML = '<div class="text-sm text-gray-400 text-center py-8">活动不存在或已归档</div>';
    return;
  }
  const actTasks = tasks.filter(t => t.activityId === act.id);

  panel.innerHTML = `
    <h4 class="font-title-cn text-sm font-bold text-gray-800 mb-3">${act.title || '未命名活动'}</h4>
    <div class="flex flex-wrap gap-1.5 mb-3">
      ${badgeHtml(act.type || '活动', 'neutral')}
      ${activityLifecycleBadgeHtml(act, tasks)}
    </div>
    <div class="space-y-1.5 text-xs text-gray-600 mb-4">
      ${act.date ? `<p><span class="text-gray-400">日期：</span>${_fmtDate(new Date(act.date))}${act.time ? ' · ' + act.time : ''}</p>` : ''}
      ${act.location ? `<p><span class="text-gray-400">地点：</span>${act.location}</p>` : ''}
      ${act.host ? `<p><span class="text-gray-400">主持人：</span>${act.host}</p>` : ''}
      ${act.brandName ? `<p><span class="text-gray-400">品牌：</span>${act.brandName}</p>` : ''}
      ${act.description ? `<p class="pt-1"><span class="text-gray-400">内容：</span>${act.description}</p>` : ''}
    </div>
    <div class="pt-3 border-t border-gray-100">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">任务节点</h5>
      ${actTasks.length === 0 ? '<p class="text-xs text-gray-400">暂无任务节点</p>' : `
        <ul class="space-y-1.5">
          ${actTasks.map(t => {
            const st = _TASK_STATUS_META[t.status] || { label: t.status || '待处理', color: '#9CA3AF' };
            const rc = ROLE_COLORS[t.executor] || {};
            return `<li class="flex items-center gap-2 text-xs">
              <span class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style="${dotDarkVars(st.color)}background:${st.color};"></span>
              <span class="flex-1 min-w-0 truncate text-gray-700">${t.title}</span>
              ${rc.text ? `<span class="inline-block w-2 h-2 rounded-full flex-shrink-0" style="--acc-dot-dark:${rc.textDark};background:${rc.text};"></span>` : ''}
            </li>`;
          }).join('')}
        </ul>
      `}
    </div>
  `;
}
