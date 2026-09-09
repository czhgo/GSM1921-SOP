// role: [工程师]+[AI]
// activity-view.js — 只读活动查看组件（知情权组件，书记 2026-08-08 裁定）
// 供无活动 tab 的工作台（组织委员/宣传委员等）承载 activityId / view=activities 跳转落点：
// 日历视图（复用 calendar.js 渲染引擎）+ 只读活动详情（点击日历条目）。
// 形态依据书记第四轮裁定：「书记的日历视图只要删去写入活动等功能，就可以提供很好的活动详情」。

import { getAppState, setState } from '../core/state.js?v=20260909e';
import { renderCalendarByActivities } from './calendar.js?v=20260909e';
import { _fmtDate, _currentYearMonth, flashHighlight, downloadCSV, showToast, escHtml as esc } from '../core/utils.js?v=20260909e';
import { badgeHtml } from './badges.js?v=20260909e';
import { ROLE_COLORS, dotDarkVars } from '../core/constants.js?v=20260909e';
import { activityLifecycleBadgeHtml } from './inspector.js?v=20260909e';
import { getPersonById } from '../services/person.js?v=20260909e';
import { AuthStore } from '../services/auth.js?v=20260909e';
import { fetchVotes } from '../services/committee-vote.js?v=20260909e';
// 表决组件（AV4.5 公共端：复用 activity.html 同款 renderVoteWidget，授权按 voterIds 判定）
import { renderVoteWidget } from './vote-widget.js?v=20260909e';

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
      <div class="card rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">活动查看</h3>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400">全支部活动一览 · 点击条目查看详情（只读）</span>
            <button class="av-export-btn h-8 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">导出 CSV</button>
          </div>
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

    // T-304 A 档下载闭环：活动清单导出 CSV（随当前月份筛选）
    container.querySelector('.av-export-btn')?.addEventListener('click', () => {
      const month = document.getElementById('month-selector')?.value || '';
      const list = month ? activities.filter(a => (a.date || '').startsWith(month)) : activities;
      const rows = list.map(a => [
        a.title || '未命名活动', a.type || '', a.date || '', a.time || '', a.location || '',
        a.organizer ? (getPersonById(a.organizer)?.name || a.organizer) : '', a.status || '',
      ]);
      downloadCSV(`活动清单_${_fmtDate(new Date())}.csv`, ['标题', '类型', '日期', '时间', '地点', '组织者', '状态'], rows);
      showToast('success', `活动清单已导出（${rows.length} 条）`);
    });
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

  // 会议议程（2026-09-06 点验修复④）：知情权组件（委员/组长工作台）补议程展示与表决支持——
  // ① async + 议程含 id 项：逐条议程（item + host + 表决组件，复用 vote-widget renderVoteWidget，
  //    canVote 由 voteConfig.voterIds 判定，名单外登录人 → 组件内只读提示「仅应到表决人可表态」）；
  // ② 线下（非 async）或议程无 id 项：只读议程列表（item + host + result 徽标），不渲染投票；
  // ③ 空议程不显示。
  const agendaList = Array.isArray(act.agenda) ? act.agenda.filter(a => a && a.item) : [];
  const voteAgenda = agendaList.filter(a => a && a.id);
  const viewer = AuthStore.getCurrentUser();
  const actVoterIds = (act.voteConfig && Array.isArray(act.voteConfig.voterIds)) ? act.voteConfig.voterIds : [];
  const canVote = !!viewer && actVoterIds.includes(viewer.personId);
  const isAsyncVote = !!viewer && act.voteConfig?.mode === 'async' && voteAgenda.length > 0;
  const resultBadgeHtml = (r) => (r
    ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${r === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${r === 'passed' ? '已通过' : '未通过'}</span>`
    : '');
  const agendaHtml = agendaList.length === 0 ? '' : `
    <div class="pt-3 border-t border-gray-100">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5 flex-wrap">会议议程${isAsyncVote ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-700 bg-amber-50">线上异步表决</span>' : ''}</h5>
      <ol id="av-agenda-list" class="space-y-1.5">
        ${agendaList.map((a, i) => `
          <li class="flex items-start gap-1.5 text-xs">
            <span class="text-gray-400 flex-shrink-0 w-4">${i + 1}.</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-gray-700">${esc(a.item)}</span>
                ${resultBadgeHtml(a.result)}
              </div>
              ${a.host ? `<div class="text-gray-400 mt-0.5">（主持人：${esc(a.host)}）</div>` : ''}
              ${isAsyncVote && a.id ? `<div class="vote-widget-slot" data-vote-item-id="${esc(a.id)}"></div>` : ''}
            </div>
          </li>`).join('')}
      </ol>
    </div>`;

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
    ${agendaHtml}
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

  // 表决组件挂载（复用 vote-widget.js，同 activity-entry.js 的用法）：
  // fetchVotes 全量拉取 → 逐条议程渲染；vote-submitted 冒泡（detail.agendaItemId）→ 重拉该条
  // 并重绘（支持覆盖表态/多议程各自刷新）。监听挂在 #av-agenda-list（每次渲染为全新节点，
  // 监听随旧节点回收，避免挂到常驻 #av-detail-panel 上造成多次渲染累积监听）。
  if (isAsyncVote) {
    const agendaOl = panel.querySelector('#av-agenda-list');
    if (agendaOl) {
      const renderAllVoteWidgets = async () => {
        const votes = await fetchVotes(act.id);
        agendaOl.querySelectorAll('.vote-widget-slot').forEach(slot => {
          const item = voteAgenda.find(x => x.id === slot.dataset.voteItemId);
          if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: viewer.personId, canVote });
        });
      };
      renderAllVoteWidgets().catch(e => console.warn('[activity-view] 表态数据加载失败：', e));
      agendaOl.addEventListener('vote-submitted', (e) => {
        const itemId = e.detail?.agendaItemId;
        const slot = itemId ? agendaOl.querySelector(`[data-vote-item-id="${CSS.escape(itemId)}"]`) : null;
        if (!slot) return;
        fetchVotes(act.id)
          .then(votes => {
            const item = voteAgenda.find(x => x.id === itemId);
            if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: viewer.personId, canVote });
          })
          .catch(err => console.warn('[activity-view] 表态刷新失败：', err));
      });
    }
  }
}
