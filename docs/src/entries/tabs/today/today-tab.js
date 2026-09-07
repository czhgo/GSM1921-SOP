// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/tabs/today/today-tab.js — 「今天」共享渲染组件（R6-3，C 排法）
// ════════════════════════════════════════════════════════════════
// 六角色工作台（书记/副书、组织、宣传、纪检、组长、普通成员）共用；
// 数据源 = services/today-summary.js buildTodaySummary（实时同源派生，无第二份存储）。
// 本组件只读：不内建任何处理能力，全部点击直达对应处理处（≤1 跳）——
//   会议/分工行 → activity.html?id=…；到期/逾期行 → onNav('todo')（onNav 未提供则空操作）。
// 顶部卡 C 排法（书记视觉对照已定）：左大块「今天有会 n」/右上「今天到期 n」/右下「我的分工 n」；
//   逾期红字在到期块顶部置顶露头；每块空态一句 + 「全部」小链接；三块全空时卡片不消失、仅示「今天暂无安排」。
// 主题色 = 各工作台 accent 的样式变量（--app-accent 等，不新造体系，同 overview/统计卡用法）。
// 注入防护：标题/内容/截止等用户可控数据一律经 escHtml 后入 innerHTML。
// ════════════════════════════════════════════════════════════════

import { escHtml as esc, _fmtDate } from '../../../core/utils.js?v=20260903c';
import { buildTodaySummary } from '../../../services/today-summary.js?v=20260906j';

// 工作台主题色走 CSS 变量（各台 bootstrap 已按 accent 注入；缺省兜底党建红），同 overview/统计卡用法
const ACCENT = 'var(--app-accent, #B91C1C)';
const ACCENT_BG = 'var(--app-accent-bg, rgba(185, 28, 28, 0.1))';

/** 'YYYY-MM-DD' → 中文月日+星期（如 '2026-09-06' → '9月6日 周日'）；非法返回 '' */
function _dateLabel(dateStr) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(dateStr || ''));
  if (!m) return '';
  const y = +m[1], mo = +m[2], d = +m[3];
  const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, mo - 1, d).getDay()];
  return `${mo}月${d}日 周${wd}`;
}

/** 块头数字（仅 n>0 显示，0 交由各块灰字空态表达） */
function _count(n) {
  return n > 0 ? `<span class="text-base font-bold ml-1.5 tabular-nums" style="color:${ACCENT};">${n}</span>` : '';
}

/** 每块右上「全部」小链接（点击经 onNav 跳对应 tab；onNav 未提供时为空操作，便于独立预览） */
function _allBtn(kind) {
  return `<button type="button" class="today-all text-[11px] text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" data-today-all="${kind}">全部 ›</button>`;
}

/** 今天有会（左大块 C 排法）：时间 / 名称 / 类型 行；点击 → activity.html */
function _meetingRows(items) {
  return items.map(m => `
    <button type="button" class="today-go w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
      data-go="activity" data-act-id="${esc(m.activityId)}" title="${esc(m.title || '')}">
      <span class="text-[11px] tabular-nums text-gray-500 w-11 flex-shrink-0">${esc(m.start || '—')}</span>
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${ACCENT};"></span>
      <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${esc(m.title || '未命名会议')}</span>
      ${m.type ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0" style="background:${ACCENT_BG};color:${ACCENT};">${esc(m.type)}</span>` : ''}
      <span class="text-xs text-gray-300 flex-shrink-0">›</span>
    </button>`).join('');
}

function _meetingBlock(s) {
  const rows = _meetingRows(s.hasMeeting);
  return `
    <div class="flex items-center justify-between mb-1.5">
      <h3 class="font-title-cn text-sm font-bold text-gray-700">今天有会${_count(s.hasMeeting.length)}</h3>
      ${_allBtn('meeting')}
    </div>
    ${rows ? `<div class="space-y-0.5">${rows}</div>` : '<p class="text-xs text-gray-400 px-1 py-1.5">今日无会</p>'}
  `;
}

/** 到期行（overdue=红字；due=常规，右侧示截止日期）；点击 → onNav('todo') */
function _todoRows(items, overdue) {
  const titleCls = overdue ? 'text-red-600 font-medium' : 'text-gray-800';
  const dot = overdue ? 'background:#EF4444;' : 'background:#9CA3AF;';
  const dateCls = overdue ? 'text-red-500 font-medium' : 'text-gray-400';
  return items.map(t => `
    <button type="button" class="today-go w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
      data-go="todo" title="${esc(t.title || '')}">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="${dot}"></span>
      <span class="text-sm flex-1 min-w-0 truncate ${titleCls}">${esc(t.title || '未命名待办')}</span>
      <span class="text-[11px] tabular-nums flex-shrink-0 ${dateCls}">${esc(t.deadline || '')}</span>
    </button>`).join('');
}

/** 今天到期（右上）：逾期红字置顶（逾期 m 项 · 已过期未办），下列今天到期（截止今日） */
function _dueBlock(s) {
  const overdueZone = s.overdue.length ? `
    <div class="rounded-lg bg-red-50/70 px-2 py-2 mb-2">
      <p class="text-[11px] font-semibold text-red-600 px-1 mb-0.5">逾期 ${s.overdue.length} 项 · 已过期未办</p>
      <div class="space-y-0.5">${_todoRows(s.overdue, true)}</div>
    </div>` : '';
  const dueRows = s.dueToday.length ? _todoRows(s.dueToday, false) : '';
  const empty = !s.overdue.length && !s.dueToday.length;
  return `
    <div class="flex items-center justify-between mb-1.5">
      <h3 class="font-title-cn text-sm font-bold text-gray-700">今天到期${_count(s.dueToday.length)}</h3>
      ${_allBtn('todo')}
    </div>
    ${empty ? '<p class="text-xs text-gray-400 px-1 py-1.5">今日无到期</p>'
      : overdueZone + (dueRows ? `<div class="space-y-0.5">${dueRows}</div>` : '')}
  `;
}

/** 今日分工（右下，IA-C3 2026-09-06 由「我的分工」改名，与工作概况『支部安排·我的分工』区分）：
 *  今天的活动里我负责的分工；点击 → 所在活动详情 activity.html */
function _dutyRows(items) {
  return items.map(d => `
    <button type="button" class="today-go w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
      data-go="activity" data-act-id="${esc(d.activityId)}" title="${esc(d.activityTitle || '')}">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${ACCENT};"></span>
      <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(d.activityTitle || '未命名活动')}</span>
      ${d.role ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0" style="background:${ACCENT_BG};color:${ACCENT};">${esc(d.role)}</span>` : ''}
      <span class="text-xs text-gray-300 flex-shrink-0">›</span>
    </button>`).join('');
}

function _dutyBlock(s) {
  const rows = _dutyRows(s.myDuties);
  return `
    <div class="flex items-center justify-between mb-1.5">
      <h3 class="font-title-cn text-sm font-bold text-gray-700">今日分工${_count(s.myDuties.length)}</h3>
    </div>
    ${rows ? `<div class="space-y-0.5">${rows}</div>` : '<p class="text-xs text-gray-400 px-1 py-1.5">今日暂无分工安排</p>'}
  `;
}

/** 三块全空 → 卡片不消失，仅示一句空态 */
function _allEmptyHtml() {
  return `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-center gap-2 py-6">
        <span class="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></span>
        <p class="text-sm text-gray-400">今天暂无安排</p>
      </div>
    </div>`;
}

/**
 * 渲染「今天」tab 共享组件（六工作台置首/登录落点；只读速览）
 * @param {HTMLElement} container — 工作台内容容器（各台从 AuthStore.getCurrentUser() 取 personId/role 后传入）
 * @param {Object} params
 * @param {string} params.personId — 当前登录人成员档案 id（如 p1/p13）
 * @param {string} params.role     — 待办角色键（如 secretary/org-commissioner/…）
 * @param {(tabId:string)=>void} [params.onNav] — 可空：切 tab 回调；到期/逾期行与「全部」跳转用
 *   （未提供则相关点击为空操作，组件仍可独立预览）。tabId 语义：'todo'=待办；
 *   会议「全部」用 'activities'（各工作台活动列表所在 tab 的语义 id，接线时按台映射/无则忽略）。
 */
export function renderTodayTab(container, { personId, role, onNav } = {}) {
  if (!container) return;

  // 实时聚合；异常不崩页：console.warn + 空态兜底
  let summary;
  try {
    summary = buildTodaySummary({ personId, role });
  } catch (err) {
    console.warn('[today-tab] buildTodaySummary 失败，已渲染空态：', err);
    summary = { date: '', hasMeeting: [], overdue: [], dueToday: [], myDuties: [] };
  }
  const dateLabel = _dateLabel(summary.date) || _dateLabel(_fmtDate(new Date()));

  const total = summary.hasMeeting.length + summary.overdue.length
    + summary.dueToday.length + summary.myDuties.length;

  const body = total === 0 ? _allEmptyHtml() : `
    <div class="card rounded-xl p-5">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5">
        <section class="lg:col-span-2 min-w-0">${_meetingBlock(summary)}</section>
        <div class="lg:col-span-1 min-w-0 space-y-5">
          ${_dueBlock(summary)}
          ${_dutyBlock(summary)}
        </div>
      </div>
    </div>`;

  container.innerHTML = `
    <div class="space-y-4">
      <h2 class="font-title-cn text-lg font-bold text-gray-800">今天 · <span class="text-base font-normal text-gray-500">${esc(dateLabel)}</span></h2>
      ${body}
    </div>`;

  // 行点击：会议/分工 → 活动详情页；到期/逾期 → onNav('todo')（无 onNav 则空操作）
  container.querySelectorAll('.today-go').forEach(btn => {
    btn.addEventListener('click', () => {
      const go = btn.dataset.go;
      if (go === 'activity') {
        const id = btn.dataset.actId;
        if (id) window.location = 'activity.html?id=' + encodeURIComponent(id);
      } else if (go === 'todo' && typeof onNav === 'function') {
        onNav('todo');
      }
    });
  });
  // 「全部」小链接：到期 → 'todo'；会议 → 'activities'（语义 id；无 onNav 则空操作）
  container.querySelectorAll('.today-all').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof onNav !== 'function') return;
      onNav(btn.dataset.todayAll === 'todo' ? 'todo' : 'activities');
    });
  });
}
