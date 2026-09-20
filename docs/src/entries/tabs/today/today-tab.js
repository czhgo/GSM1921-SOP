// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/tabs/today/today-tab.js — 「今天」共享渲染组件（R6-3，C 排法）
// ════════════════════════════════════════════════════════════════
// 六角色工作台（支书/副书、组织、宣传、纪检、组长、普通成员）共用；
// 数据源 = services/today-summary.js buildTodaySummary（实时同源派生，无第二份存储）。
// 本组件只读：不内建任何处理能力，全部点击直达对应处理处（≤1 跳）——
//   会议/分工行 → activity.html?id=…；到期/逾期行 → onNav('todo')（onNav 未提供则空操作）。
// 顶部卡 C 排法（支书视觉对照已定）：左大块「今天有会 n」/右上「今天到期 n」/右下「我的分工 n」；
//   逾期红字在到期块顶部置顶露头；每块空态一句 + 「全部」小链接；三块全空时卡片不消失、仅示「今天暂无安排」。
// 主题色 = 各工作台 accent 的样式变量（--app-accent 等，不新造体系，同 overview/统计卡用法）。
// 注入防护：标题/内容/截止等用户可控数据一律经 escHtml 后入 innerHTML。
// ════════════════════════════════════════════════════════════════

import { escHtml as esc, _fmtDate } from '../../../core/utils.js?v=20260921c';
import { icon } from '../../../core/icons.js?v=20260921c';
import { buildTodaySummary } from '../../../services/today-summary.js?v=20260921c';
// 批次 47-I（Q-23-41 ②，支书 2026-09-15 裁定）：本组组员进展**由服务端汇总**——
// api 态打服务端汇总接口、mock 态调同一纯函数（单一入口 `loadMemberProgress`）。
import { loadMemberProgress } from '../../../services/member-progress.js?v=20260921c';
import { resolveVisibleTargets } from '../../../services/visibility.js?v=20260921c';
import { mockDB } from '../../../core/domain.js?v=20260921c';
import { tokenOf } from '../../../core/version-token.js?v=20260921c'; // P0 域写版本戳（spec §二.4）
import { RESIDENCE_KEY } from '../../../services/roster.js?v=20260921c'; // 滞留覆盖 raw 源（roster 禁改不内改）
import { PREVIEW_KEY } from '../../../services/org-base-data-preview.js?v=20260921c'; // 基础数据预览 raw 源
import { memoizeRender } from '../../../components/memoize-render.js?v=20260921c'; // P2 渲染守卫（spec §四.1）
// 批4（2026-09-09 支书批「域参数」）：组长学期组员进展归集提醒开关（读侧注入后 = 当前支部有效默认）
import { POLICY_DEFAULTS } from '../../../core/policy-defaults.js?v=20260921c';

// 工作台主题色走 CSS 变量（各台 bootstrap 已按 accent 注入；缺省兜底党建红），同 overview/统计卡用法
const ACCENT = 'var(--app-accent, #B91C1C)';
const ACCENT_BG = 'var(--app-accent-bg, rgba(185, 28, 28, 0.1))';

// ── P2 渲染守卫（2026-09-07 · spec §四.1）────────────────────────
// 今天卡为「读多写少」只读聚合视图：buildTodaySummary 内部已有 P0/P1 缓存，本守卫省的
// 是全链重算与 HTML 拼装/DOM 重建（每次无关 setState 切回/刷新都会触发整卡重建）。
// key = 今天日期 + 各数据源 tokenOf(todo/member/activity/signup/attendance) + 源数组 length
//   指纹 + member 覆盖/预览 raw 源（滞留覆盖 RESIDENCE_KEY / 基础数据预览 PREVIEW_KEY 的
//   写口不在 bump 链 → raw 内容比对兜底）+ 登录人/角色（同容器内容因人而异）。
// 命中 → 现 DOM 保留（只读卡无交互状态；旧行点击事件仍在）；marker 防跨 tab 内容误命中。
function _rawStorage(key) {
  try { return typeof localStorage === 'undefined' ? '' : (localStorage.getItem(key) || ''); } catch (_) { return ''; }
}
function _arrLen(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}
function _todayMemoKey(personId, role) {
  return [
    `day=${_fmtDate(new Date())}`,
    `todo=${tokenOf('todo')}`,
    `member=${tokenOf('member')}|${_rawStorage(RESIDENCE_KEY)}|${_rawStorage(PREVIEW_KEY)}`,
    `activity=${tokenOf('activity')}+${_arrLen(mockDB.activities)}`,
    `signup=${tokenOf('signup')}+${_arrLen(mockDB.signups)}`,
    `attendance=${tokenOf('attendance')}+${_arrLen(mockDB.attendances)}`,
    `person=${personId || ''}|role=${role || ''}`,
  ].join('|');
}

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
  return n > 0 ? `<span class="text-base font-bold ml-1.5 tabular-nums" style="--acc-text-dark:${ACCENT};color:color-mix(in srgb, ${ACCENT} 60%, #000);">${n}</span>` : '';
}

/** 每块右上「全部」小链接（点击经 onNav 跳对应 tab；onNav 未提供时为空操作，便于独立预览） */
function _allBtn(kind) {
  return `<button type="button" class="today-all text-[11px] text-gray-500 hover:text-gray-600 transition-colors flex-shrink-0" data-today-all="${kind}">全部 ›</button>`;
}

/** 今天有会（左大块 C 排法）：时间 / 名称 / 类型 行；点击 → activity.html */
function _meetingRows(items) {
  return items.map(m => `
    <button type="button" class="today-go w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
      data-go="activity" data-act-id="${esc(m.activityId)}" title="${esc(m.title || '')}">
      <span class="text-[11px] tabular-nums text-gray-500 w-11 flex-shrink-0">${esc(m.start || '—')}</span>
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${ACCENT};"></span>
      <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${esc(m.title || '未命名会议')}</span>
      ${m.type ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0" style="--acc-text-dark:${ACCENT};background:${ACCENT_BG};color:color-mix(in srgb, ${ACCENT} 60%, #000);">${esc(m.type)}</span>` : ''}
      <span class="text-xs text-gray-500 flex-shrink-0">›</span>
    </button>`).join('');
}

function _meetingBlock(s) {
  const rows = _meetingRows(s.hasMeeting);
  return `
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-title-cn text-sm font-bold text-gray-700">今天有会${_count(s.hasMeeting.length)}</h3>
      ${_allBtn('meeting')}
    </div>
    ${rows ? `<div class="space-y-1.5">${rows}</div>` : '<p class="text-xs text-gray-500 px-1 py-1.5">今日无会</p>'}
  `;
}

/** 到期行（overdue=红字；due=常规，右侧示截止日期）；点击 → onNav('todo') */
function _todoRows(items, overdue) {
  const titleCls = overdue ? 'text-red-600 font-medium' : 'text-gray-800';
  const dot = overdue ? 'background:#EF4444;' : 'background:#9CA3AF;';
  const dateCls = overdue ? 'text-red-600 font-medium' : 'text-gray-500';
  return items.map(t => `
    <button type="button" class="today-go w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
      data-go="todo" title="${esc(t.title || '')}">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="${dot}"></span>
      <span class="text-sm flex-1 min-w-0 truncate ${titleCls}">${esc(t.title || '未命名待办')}</span>
      <span class="text-[11px] tabular-nums flex-shrink-0 ${dateCls}">${esc(t.deadline || '')}</span>
    </button>`).join('');
}

/** 今天到期（右上）：逾期红字置顶（逾期 m 项 · 已过期未办），下列今天到期（截止今日） */
function _dueBlock(s) {
  const overdueZone = s.overdue.length ? `
    <div class="rounded-lg bg-red-50/70 px-2 py-2 mb-4" style="--acc-bg-dark:rgba(239,68,68,0.12);">
      <p class="text-[11px] font-semibold text-red-600 px-1 mb-2">逾期 ${s.overdue.length} 项 · 已过期未办</p>
      <div class="space-y-1.5">${_todoRows(s.overdue, true)}</div>
    </div>` : '';
  const dueRows = s.dueToday.length ? _todoRows(s.dueToday, false) : '';
  const empty = !s.overdue.length && !s.dueToday.length;
  return `
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-title-cn text-sm font-bold text-gray-700">今天到期${_count(s.dueToday.length)}</h3>
      ${_allBtn('todo')}
    </div>
    ${empty ? '<p class="text-xs text-gray-500 px-1 py-1.5">今日无到期</p>'
      : overdueZone + (dueRows ? `<div class="space-y-1.5">${dueRows}</div>` : '')}
  `;
}

/** 今日分工（右下，IA-C3 2026-09-06 由「我的分工」改名，与工作概况『支部安排·我的分工』区分）：
 *  今天的活动里我负责的分工；点击 → 所在活动详情 activity.html */
function _dutyRows(items) {
  return items.map(d => `
    <button type="button" class="today-go w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
      data-go="activity" data-act-id="${esc(d.activityId)}" title="${esc(d.activityTitle || '')}">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${ACCENT};"></span>
      <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(d.activityTitle || '未命名活动')}</span>
      ${d.role ? `<span class="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0" style="--acc-text-dark:${ACCENT};background:${ACCENT_BG};color:color-mix(in srgb, ${ACCENT} 60%, #000);">${esc(d.role)}</span>` : ''}
      <span class="text-xs text-gray-500 flex-shrink-0">›</span>
    </button>`).join('');
}

function _dutyBlock(s) {
  const rows = _dutyRows(s.myDuties);
  return `
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-title-cn text-sm font-bold text-gray-700">今日分工${_count(s.myDuties.length)}</h3>
    </div>
    ${rows ? `<div class="space-y-1.5">${rows}</div>` : '<p class="text-xs text-gray-500 px-1 py-1.5">今日暂无分工安排</p>'}
  `;
}

/** S4（2026-09-12）：本岗待办摘要块（含逾期/到期/待办数；点击直达待办 tab）。
 *  使「今天」落点不再因待办无 deadline/异常而不显示——注入本岗待办概况并可直接处理。 */
function _todoSummaryBlock(s) {
  const t = s.todoSummary || { total: 0, overdue: 0, dueToday: 0 };
  if (!t.total) return '';
  return `
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-title-cn text-sm font-bold text-gray-700">本岗待办${_count(t.total)}</h3>
        ${_allBtn('todo')}
      </div>
      <button type="button" class="today-go w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
        data-go="todo" title="前往待办处理">
        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${t.overdue ? '#EF4444' : '#9CA3AF'};"></span>
        <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">逾期 ${t.overdue} · 今日到期 ${t.dueToday} · 待办合计 ${t.total}</span>
        <span class="text-xs text-gray-500 flex-shrink-0">›</span>
      </button>
    </div>`;
}

/** 三块全空 → 卡片不消失，仅示一句空态 */
function _allEmptyHtml() {
  return `
    <div class="card rounded-lg p-5">
      <div class="flex items-center justify-center gap-2 py-6">
        <span class="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></span>
        <p class="text-sm text-gray-500">今天暂无安排</p>
      </div>
    </div>`;
}

// ── 批4 组长学期组员进展提醒（leader.semesterReportReminder）────────────────────────────────
// ⚠ **授权说明（Q-23-41，2026-09-15 支书追问「我为什么会批准这些信息…这完全是滑稽！」）**：
//   本提醒**随批4「域参数」批次一起进仓**，全仓**没有**支书就该**具体功能**逐项批准的记录；
//   原注释写的「支书 2026-09-09 批」指的是**批4 这个批次整体**，**不等于逐项批准**（纪律见 CLAUDE.md **R-70**）。
// 2026-09-15 支书裁定（AskUserQuestion）：**保留提醒、改为服务端汇总**——
//   原「请在『组员进展』逐人归集…形成小组学期进展底稿」是**人工收集要求**（支书：「我从来没说过
//   要有一个**收集过程**」），**已删除**；现由服务端汇总四项（在办/超期/缺勤/考察待确认）**呈报实况**。
// 开关 = policy leader.semesterReportReminder.enabled（读侧注入后 = 当前支部有效默认）；
// 窗口 = 每年两学期开学首周（3 月 / 9 月 1–7 日，简单实现——与滞留复核窗非同构故不引入学期窗表）；
// 防重复弹 = 按人存 localStorage 键 gsm1921-pref-<personId>-semester-report-remind-<学期键>
// （学期键 'YYYY-H1'（3 月）/'YYYY-H2'（9 月）；首次查看/去归集即标记，本学年同窗不再弹）。
const LEADER_REMIND_OPEN_MONTHS = [3, 9];
const LEADER_REMIND_FIRST_DAY_MAX = 7;

/** 当前学期键（仅开学月返回 'YYYY-H1'/'YYYY-H2'；非开学月返回 null；纯函数供单测） */
export function leaderSemesterReportTermKey(now = new Date()) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  if (mo === 3) return `${y}-H1`;
  if (mo === 9) return `${y}-H2`;
  return null;
}

/** 是否处于开学首周提醒窗（3 月 / 9 月 1–7 日；纯函数供单测） */
export function isLeaderSemesterRemindWindow(now = new Date()) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return false;
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  return LEADER_REMIND_OPEN_MONTHS.includes(mo) && day <= LEADER_REMIND_FIRST_DAY_MAX;
}

function _lsrMarkKey(personId) {
  const term = leaderSemesterReportTermKey();
  if (!personId || !term) return null;
  return `gsm1921-pref-${personId}-semester-report-remind-${term}`;
}
function _lsrGet(key) {
  try { return key ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)) : null; }
  catch { return null; }
}
function _lsrMark(key) {
  try { if (key && typeof localStorage !== 'undefined') localStorage.setItem(key, '1'); } catch { /* 忽略 */ }
}

/** 组长开学提醒条 HTML（关闭时返回 ''；数据/文案 = 简单引导，不引入新通知类型） */
function _leaderSemesterRemindHtml(personId) {
  const cfg = POLICY_DEFAULTS.leader && POLICY_DEFAULTS.leader.semesterReportReminder;
  if (!cfg || !cfg.enabled) return '';
  if (!isLeaderSemesterRemindWindow()) return '';
  const key = _lsrMarkKey(personId);
  if (!key || _lsrGet(key)) return ''; // 本学年同窗已提醒过
  return `
    <div class="card rounded-lg p-4 border-l-4" style="border-left-color:${ACCENT};" data-leader-sem-remind="1">
      <div class="flex items-start gap-3">
        <span class="flex-none w-8 h-8 rounded-lg flex items-center justify-center" style="background:${ACCENT_BG};color:${ACCENT};">${icon('bell', { className: 'icon-base w-4 h-4' })}</span>
        <div class="flex-1 min-w-0">
          <p class="font-title-cn text-sm font-bold text-gray-800">本学期组员进展（系统汇总）</p>
          <p class="text-xs text-gray-600 leading-relaxed mt-1">本组组员本学期进展由系统汇总（思想汇报 / 考察 / 复盘 / 在办事项），无需逐人手工归集；缺漏项以「需跟进」人数示出，进「组员进展」可看逐人明细。</p>
          <p class="text-xs text-gray-700 mt-1.5" data-lsr-facts>正在汇总…</p>
          <div class="flex flex-wrap items-center gap-2 mt-2.5">
            <button type="button" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-colors hover:opacity-90" style="background:${ACCENT};" data-lsr-act="go">去「组员进展」看汇总</button>
            <button type="button" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" data-lsr-act="later">本学期已处理，不再提醒</button>
            <!-- 就近深链（2026-09-17 支书已裁）：本条提醒的开关就是本域可调参数，就地给去设置该分区的入口 -->
            <a href="./settings.html#domain-leader" class="text-xs text-gray-500 hover:text-gray-700 underline transition-colors">本条提醒开关 → 组长职责参数（设置）</a>
          </div>
        </div>
      </div>
    </div>`;
}

/** 呈报实况（批次 47-I，Q-23-41 ②）：展示**服务端汇总**的四项实况（不再要人手工归集）。
 *  api 态由服务端计算、mock 态同一纯函数；读取失败降级为文字提示，不崩页。
 *  `data-lsr-source` 标出数据来源（api / mock），供真机普查核对。 */
async function _fillLeaderSemesterFacts(block, personId) {
  const host = block.querySelector('[data-lsr-facts]');
  if (!host) return;
  try {
    const targets = resolveVisibleTargets('leader', personId);
    const { rows, source } = await loadMemberProgress({ personIds: targets.map(t => t.personId) });
    const sum = rows.reduce((a, r) => ({
      active: a.active + (r.active || 0),
      overdue: a.overdue + (r.overdue || 0),
      absent: a.absent + (r.absent || 0),
      inspPending: a.inspPending + (r.inspPending || 0),
    }), { active: 0, overdue: 0, absent: 0, inspPending: 0 });
    const gap = rows.filter(r => r.overdue > 0 || r.absent > 0 || r.inspPending > 0).length;
    host.textContent = `本组 ${rows.length} 人：在办 ${sum.active} 项 · 超期 ${sum.overdue} 项 · 缺勤未补 ${sum.absent} 次 · 考察待确认 ${sum.inspPending} 条 · 需跟进 ${gap} 人`;
    host.dataset.lsrSource = source;
  } catch (err) {
    console.warn('[today-tab] 组员进展汇总读取失败：', err);
    host.textContent = '汇总暂时读取失败（可稍后重试）';
  }
}

/** 开学提醒条交互：标记已提醒并收掉条（go=跳组员进展 tab；onNav 缺省则仅收条） */
function bindLeaderSemesterRemind(container, personId, onNav) {
  const block = container.querySelector('[data-leader-sem-remind]');
  if (!block) return;
  _fillLeaderSemesterFacts(block, personId); // 异步呈报实况（不阻塞首屏渲染）
  const dismiss = () => {
    const key = _lsrMarkKey(personId);
    if (key) _lsrMark(key);
    block.remove();
  };
  container.querySelectorAll('[data-lsr-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lsrAct === 'go' && typeof onNav === 'function') onNav('members');
      dismiss();
    });
  });
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

  // P2 渲染守卫：数据键未变且现 DOM 为上次真实产物 → 整卡保留（跳过 buildTodaySummary
  // 全链重算与 HTML/DOM 重建）。未命中 → 执行 render（重建路径，行为与改造前一致）。
  memoizeRender(container, _todayMemoKey(personId, role), () => {
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
      + summary.dueToday.length + summary.myDuties.length
      + ((summary.todoSummary && summary.todoSummary.total) || 0);

    // 批4：组长开学周提醒条（仅组长角色；开关/窗口/防重复见 _leaderSemesterRemindHtml）
    const leaderSemReminder = role === 'leader' ? _leaderSemesterRemindHtml(personId) : '';

    const body = total === 0 ? _allEmptyHtml() : `
      <div class="card rounded-lg p-5">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5">
          <section class="lg:col-span-2 min-w-0">${_meetingBlock(summary)}</section>
          <div class="lg:col-span-1 min-w-0 space-y-5">
            ${_dueBlock(summary)}
            ${_todoSummaryBlock(summary)}
            ${_dutyBlock(summary)}
          </div>
        </div>
      </div>`;

    container.innerHTML = `
      <div class="space-y-4" data-ws-memo="today">
        <h2 class="font-title-cn text-lg font-bold text-gray-800">今天 · <span class="text-base font-normal text-gray-500">${esc(dateLabel)}</span></h2>
        ${leaderSemReminder}
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
    // 批4：组长开学周提醒条（去组员进展 / 本学期不再提醒 → 标记防重复弹并收条）
    bindLeaderSemesterRemind(container, personId, onNav);
  }, { marker: '[data-ws-memo="today"]' });
}
