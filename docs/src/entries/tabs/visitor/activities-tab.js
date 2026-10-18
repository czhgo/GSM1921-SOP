// role: [工程师]+[AI]
// 参与者工作台 Tab：活动动态（T-279 M3 拆分，照 M2 样板）
// 三视图：列表（分页）/ 日历 / 查询；列表与日历为纯展示，查询复用全局查询组件。
// URL 落点高亮（?activityId=）经 ctx.highlightId 一次性消费（对齐单体版参数清除后的行为）。

import { icon } from '../../../core/base/icons.js?v=20261018g';
import { renderQueryView } from '../../../components/governance/query-view.js?v=20261018g';
import { flashHighlight } from '../../../core/base/utils.js?v=20261018g';
import { getActivityTypeColors } from '../../../core/domain/constants.js?v=20261018g';
// 活动「仍在办」口径单一源（2026-09-13 收敛）：替代手写 !archived && status!=='cancelled'
import { isActivityLive } from '../../../core/domain/constants.js?v=20261018g';
import { canSignup } from '../../../components/governance/signup-panel.js?v=20261018g';
import { AuthStore } from '../../../services/core/auth.js?v=20261018g';
// 组织者按活动身份读（2026-09-19 批次 91 · SOP-B-17）：本人被指定为某场活动的组织者时，
// 该场的发布口与上传位从该行可达——「组织者是这场事上被指定的人」，不是静态角色。
import { isActivityOrganizer, findActivityById } from '../../../services/activity/activity.js?v=20261018g';
import { openGroupNoticeComposer } from '../../../components/governance/notice-view.js?v=20261018g';
// 翻页控件单一源（批次 38：全站手写翻页一律并轨 pagerHtml）
import { pagerHtml } from '../../../components/ui/pager.js?v=20261018g';
import { getAppState } from '../../../core/base/state.js?v=20261018g';
import { renderContent as renderSharedActivityCalendar } from '../shared/activity-calendar-tab.js?v=20261018g';

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();

// ③闭环样本1（2026-09-10）：活动列表/查询行补「去报名 / 去表态」明确入口——
// 门槛沿用既有 signup/vote 规则（报名=canSignup；表态=voteConfig.mode==='async' 且本人属 voterIds），不新增权限。
// 行本体仍为可点击 → 活动详情；入口按钮为同指向深链，1 次点击直达对应区块。
function _actEntryHtml(a, href) {
  const btns = [];
  if (canSignup('activity', a)) {
    btns.push(`<a href="${href}" aria-label="报名活动：${a.title || ''}" class="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors hover:opacity-90 flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" style="background:var(--party-red);text-decoration:none;">去报名</a>`);
  }
  const me = AuthStore.getCurrentUser();
  const voterIds = (a.voteConfig && Array.isArray(a.voteConfig.voterIds)) ? a.voteConfig.voterIds : [];
  const hasVoteAgenda = Array.isArray(a.agenda) && a.agenda.some(x => x && x.id);
  if (me && a.voteConfig?.mode === 'async' && hasVoteAgenda && voterIds.includes(me.personId)) {
    btns.push(`<a href="${href}" aria-label="活动表态：${a.title || ''}" class="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" style="text-decoration:none;">去表态</a>`);
  }
  return btns.length ? `<div class="flex items-center gap-1.5 flex-shrink-0">${btns.join('')}</div>` : '';
}

// 组织者的入口（2026-09-19 批次 91 · SOP-B-17 / `D-308` · `D-309` · §9k）：
// 「组织者是一种信息流与任务流」——本人被指定为某场活动的组织者时，这场活动的
//   ① 发布口（发布本组通知）与 ② 上传位（考勤上传 / 纪检打回后的「待你确认」）
// 就从这一行可达；解除指定即收回（判据 = `services/activity/activity.js::isActivityOrganizer`）。
// ⚠ 上传位现承载在组长台「考勤上传」（写口判据 = `canUploadAttendance`，组织者本人恒在门内），
//   此处只做「按人带路」，**不复制第二套表单**（否则同一条口径两处维护）。
function _organizerEntryHtml(a) {
  const me = AuthStore.getCurrentUser();
  if (!me || !isActivityOrganizer(me.personId, a.id)) return '';
  return `<div class="flex items-center gap-1.5 flex-shrink-0">
      <button type="button" class="btn-outline visitor-group-notice-btn text-xs px-3 py-1.5 font-medium" data-act-id="${a.id}" style="cursor:pointer;">发布本组通知</button>
      <a href="./workspace/leader.html?tab=attendance" class="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" style="text-decoration:none;" title="本场组织者的上传位：考勤上传与纪检打回后的待确认项">考勤管理 / 打回确认</a>
    </div>`;
}

// 列表行（列表/查询共用；行内主区为可点击详情链接，行尾为报名/表态入口）
function _activityRowHtml(a) {
  const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
  const href = `./activity.html?id=${a.id || ''}`;
  return `
    <div class="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all" data-visitor-act-id="${a.id || ''}">
      <a href="${href}" class="flex items-center gap-3 flex-1 min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" style="text-decoration:none;color:inherit;" aria-label="查看活动详情：${a.title || '未命名'}">
        <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
          <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
        </div>
      </a>
      ${_actEntryHtml(a, href)}
      ${_organizerEntryHtml(a)}
    </div>`;
}

// 活动动态列表分页（支书 2026-08-08 决策：活动页分页，每页 10 条）
const ACTIVITY_PAGE_SIZE = 10;
let _visitorActPage = 1; // 当前页（模块级，切换 列表/日历/查询 视图后保留）
// 2026-10-04 批次 371：`?view=` 深链（首页「完整日历 →」落**日历视图**）。
//   ⚠ 壳会在导航时**消费并清掉 URL 参数**（`history.replaceState`）⇒ 页签的**后续重渲染**读不到 `view`
//   ⇒ 故**一次性消费、粘住**（`_pendingView`）：只在本次加载首次渲染时读参数；用户手动切视图即清除。
let _pendingView = null;
let _viewParamConsumed = false;
let _programmaticViewClick = false;
// 日历视图内层「月/周/日」工具条的降级守卫（共享日历每次切视图会重绘该工具条）
let _calToolbarObserver = null;

const _VIEW_ACTIVE = { background: 'var(--app-accent-bg)', color: 'var(--app-accent)', border: '1px solid var(--app-accent)' };
const _VIEW_IDLE = { background: 'var(--surface-card)', color: 'var(--neutral-500)', border: '1px solid var(--neutral-200)' };

function _paintViewButtons(tc, active) {
  tc.querySelectorAll('.visitor-view-btn').forEach((btn) => {
    const s = btn.dataset.vview === active ? _VIEW_ACTIVE : _VIEW_IDLE;
    btn.style.background = s.background;
    btn.style.color = s.color;
    btn.style.border = s.border;
    btn.setAttribute('aria-selected', btn.dataset.vview === active ? 'true' : 'false');
  });
}

// 日历视图只保留「月 / 周 / 日」粒度；移除内层「列表」并降为次级工具条（不和主视图切换抢主位）。
function _demoteCalendarToolbar(vc) {
  const switcher = vc.querySelector('#cal-view-switcher');
  if (!switcher) return;
  switcher.querySelector('[data-view="list"]')?.remove();
  if (!switcher.querySelector('.visitor-cal-granularity-label')) {
    const label = document.createElement('span');
    label.className = 'visitor-cal-granularity-label text-xs text-gray-500';
    label.textContent = '日历粒度';
    switcher.prepend(label);
  }
  switcher.querySelectorAll('.cal-view-btn').forEach((btn) => {
    btn.style.padding = '4px 8px';
    btn.style.fontSize = '12px';
  });
}

function _watchCalendarToolbar(vc) {
  _calToolbarObserver?.disconnect();
  const switcher = vc.querySelector('#cal-view-switcher');
  if (!switcher || typeof MutationObserver === 'undefined') return;
  _calToolbarObserver = new MutationObserver(() => _demoteCalendarToolbar(vc));
  _calToolbarObserver.observe(switcher, { childList: true });
}

/** 外部落点：切到日历视图（成员台 today「看日历」用；不另写一套日历渲染）。 */
export function showCalendarView() {
  _pendingView = 'calendar';
  const btn = document.querySelector('.visitor-view-btn[data-vview="calendar"]');
  if (btn) {
    _programmaticViewClick = true;
    btn.click();
    _programmaticViewClick = false;
  }
}

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const activities = ctx.activities || [];
  const highlightId = ctx.highlightId || null;
  const sorted = [...activities].filter(a => a.date && isActivityLive(a)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!_viewParamConsumed) {
    _viewParamConsumed = true;
    // `?subview=` 是既有深链协议；同时接受 `?view=`（活动动态被作为落点时的同义写法）。
    const params = new URLSearchParams(location.search);
    const v = params.get('subview') || params.get('view');
    if (v && ['list', 'calendar', 'query'].includes(v)) _pendingView = v;
  }

  // 唯一主视图切换（列表 / 日历 / 查询）；日历内的「月/周/日」只是次级粒度工具条。
  tc.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <span class="text-xs text-gray-500">${sorted.length} 条活动</span>
      <div class="flex gap-1" role="tablist" aria-label="活动视图">
        <button class="btn-tab visitor-view-btn px-3 py-1.5 text-[13px] font-medium" data-vview="list" role="tab">
          ${icon('list', { className: 'w-3.5 h-3.5' })} 列表
        </button>
        <button class="btn-tab visitor-view-btn px-3 py-1.5 text-[13px] font-medium" data-vview="calendar" role="tab">
          ${icon('calendar', { className: 'w-3.5 h-3.5' })} 日历
        </button>
        <button class="btn-tab visitor-view-btn px-3 py-1.5 text-[13px] font-medium" data-vview="query" role="tab">
          ${icon('search', { className: 'w-3.5 h-3.5' })} 查询
        </button>
      </div>
    </div>
    <div id="visitor-act-view"></div>
  `;
  _paintViewButtons(tc, 'list');

  tc.querySelectorAll('.visitor-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // 用户手动切视图 ⇒ 深链粘住的视图让位（见 `_pendingView` 说明）
      if (!_programmaticViewClick) _pendingView = null;
      const view = btn.dataset.vview;
      _paintViewButtons(tc, view);
      if (view === 'list') { _calToolbarObserver?.disconnect(); _renderActListView(sorted, highlightId); }
      else if (view === 'calendar') _renderActCalendarView(sorted, highlightId);
      else { _calToolbarObserver?.disconnect(); _renderActQueryView(sorted, highlightId); }
    });
  });

  // 2026-10-04 批次 371（支书裁「**活动日历 应该放在 活动动态中 作为一个 视图**」）：
  //   深链 `?view=calendar`（首页「完整日历 →」）⇒ **复用下面这套视图切换钮**，
  //   **不另写一份日历渲染**（日历仍是本页三视图之一）；参数被壳清掉后靠 `_pendingView` 粘住。
  if (_pendingView) {
    _programmaticViewClick = true;
    tc.querySelector(`.visitor-view-btn[data-vview="${_pendingView}"]`)?.click();
    _programmaticViewClick = false;
  } else {
    _renderActListView(sorted, highlightId);
  }
  // 一次性消费高亮目标（对齐单体版 URL 参数清除后的行为，防 setState 重渲染重复滚动定位）
  if (typeof ctx.onNavLocated === 'function') ctx.onNavLocated();

  // 组织者入口（发布本组通知）：事件委托——列表/日历/查询三视图都会重绘行、且引擎筛选后行会被换掉，
  // 行内直接绑定会失效；委托挂在容器上只挂一次（dataset 守卫防重复绑定致浮窗开两遍）。
  if (!tc.dataset.organizerEntryBound) {
    tc.dataset.organizerEntryBound = '1';
    tc.addEventListener('click', (e) => {
      const btn = e.target.closest('.visitor-group-notice-btn');
      if (!btn) return;
      e.preventDefault();
      const act = findActivityById(btn.dataset.actId);
      openGroupNoticeComposer({ activity: act, accentColor: ctx.accent || '#CE1126' });
    });
  }
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
      ${sorted.length === 0 ? '<p class="text-xs text-gray-500 text-center py-6">暂无活动</p>' :
        pageItems.map(a => _activityRowHtml(a)).join('')}
    </div>
    ${pagerHtml({ page, pages: totalPages, total: sorted.length, unit: '条' })}
  `;

  // 翻页（标记由统一检索引擎 pagerHtml 单一源产出，读 data-lf-page）
  vc.querySelectorAll('[data-lf-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      _visitorActPage = parseInt(btn.dataset.lfPage, 10) || 1;
      _renderActListView(sorted, highlightId);
    });
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（支书 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
  }
}

function _renderActCalendarView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;
  if (sorted.length === 0) {
    vc.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">暂无活动</p>';
    return;
  }
  const state = getAppState() || {};
  // 日历是本页的一个视图：内层只保留「月 / 周 / 日」粒度，不再出现第二个「列表」抢主位。
  // 若全局记忆停在内层「列表」，进入本视图时回落到月视图（否则会出现没有切换钮的列表）。
  renderSharedActivityCalendar(vc, {
    ...state,
    activities: sorted,
    calendarView: state.calendarView === 'list' ? 'month' : (state.calendarView || 'month'),
  });
  _demoteCalendarToolbar(vc);
  _watchCalendarToolbar(vc);
  if (highlightId) {
    const el = [...vc.querySelectorAll('.cal-activity-item')].find((item) => item.dataset.actId === highlightId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    renderRow: (a) => _activityRowHtml(a),
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
      // 高亮定时自动褪去（支书 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
  }
}
