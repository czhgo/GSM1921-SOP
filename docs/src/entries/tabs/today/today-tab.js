// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/tabs/today/today-tab.js — 「今天」共享渲染组件（批次 299，B 版式）
// ════════════════════════════════════════════════════════════════
// 六角色工作台（支书/副书、组织、宣传、纪检、组长、普通成员）共用；
// 数据源 = services/governance/today-summary.js buildTodaySummary（实时同源派生，无第二份存储）。
// 本组件只读：不内建任何处理能力，全部点击直达对应处理处（≤1 跳）——
//   会议/分工行 → activity.html?id=…；到期/逾期行 → onNav('todo')（onNav 未提供则空操作）。
//
// 版式（2026-09-30 批次 299 · 支书裁定「B 行动 / 日程双卡」；2026-10-01 批次 320 按「工作类型＝动作性质」改准左卡分组；
//   **2026-10-01 批次 329 支书再裁「单一轴」：左卡只留一条轴＝`TodoActionType` 七类，卡名改「今天要办」，色条只表紧迫度**）：
//   左 2/3「今天要办」＝ **只有一个轴：按动作性质分组的 `TodoActionType` 七类**（审核 / 提交 / 赋权 / 参与 /
//     归档 / 阅读 / 追踪）。**逾期 / 今天到期不再单开段**——降为**行内色条**（红＝已逾期 · 金＝今天到期 ·
//     灰＝随时）；**今日分工 / 待我表态 / 未读通知 / 待我处理的汇报也不再各起段头**，而是**按动作性质归入七类**
//     （分工 / 表态 → `participate` 参与；通知 → `read` 阅读；汇报 → `review` 审核。映射单一源＝下方 `SOURCE_ACTION`）。
//     为什么改：支书评「**我并不知道 这几个h4排布是什么逻辑？我看不懂！！**」——原左卡把「紧迫度 / 动作性质 /
//     角色分工 / 事项来源」**四条轴混在同一层 h4 上**，读不出统一逻辑 ⇒ 收成一条轴。
//     每组**组标题＝动作性质＋计数**、**行内右端＝业务域小胶囊**（九域降为胶囊）——原「今天到期 / 本岗待办」
//     两段已由分组取代（支书评「信息量居然这么少…第一次进入的界面居然只是一个花瓶」）。
//   右 1/3「我的日程」＝ 今天的会议 ＋ 活动管理入口；其下「近期安排」（未来 7 天）。
//   **信息自陈（形轴·2026-10-01 批次 329 收窄）**：**行左 3px 竖色条只表「紧迫度」**——红＝逾期 /
//   金＝今天到期 / 灰＝随时（**不再兼表角色分工 / 会议 / 通知**——同一形状只承担一件事）；**分类走胶囊**
//   （活动类型 / 业务域 / 来源标签）；有时间者走「时间轴行」（时间 ＋ 标题 ＋ 类型胶囊）。
//   紧迫度 → 行色条 ＋ 组内次序（位轴）：逾期 > 今天到期 > 无截止；组内按截止升序、**无截止者殿后**。
//   ⚠ 计数只留一处（§4.14）：各组计数只在**组标题**出现一次（`_segHead`；异步注入汇报时同步 +n）。
//   ⚠ 未读通知 / 待我表态 / 待处理的汇报**不再各起段头**——按 `SOURCE_ACTION` 归入「阅读 / 参与 / 审核」组；
//     未读通知跳转与顶栏铃铛同一解析 `resolveNoticeUrl`；待处理汇报＝顶栏「一键汇报」角标同一集合。
// 字号：一律沿用 DESIGN_SYSTEM §3.2.2 档位表（支书 2026-09-30 裁「字号全仓库统一」）——
//   主卡标题 h3 `text-base`(16) · 段标题 h4 `text-sm font-bold`(14) · 行标题 `text-sm`(14) ·
//   类型胶囊 `text-xs`(12) · 时间 / 截止 meta `text-[11px]`（沿用全站现状档）。
// 主题色 = 各工作台 accent 的样式变量（--app-accent 等，不新造体系，同 overview/统计卡用法）。
// 注入防护：标题/内容/截止等用户可控数据一律经 escHtml 后入 innerHTML。
// ════════════════════════════════════════════════════════════════

import { escHtml as esc, _fmtDate } from '../../../core/base/utils.js?v=20261005h';
import { icon } from '../../../core/base/icons.js?v=20261005h';
import { buildTodaySummary, TODO_ACTION_ORDER, TODO_ACTION_LABELS } from '../../../services/governance/today-summary.js?v=20261005h';
// 批次 47-I（Q-23-41 ②，支书 2026-09-15 裁定）：本组组员进展**由服务端汇总**——
// api 态打服务端汇总接口、mock 态调同一纯函数（单一入口 `loadMemberProgress`）。
import { loadMemberProgress } from '../../../services/member/member-progress.js?v=20261005h';
import { resolveVisibleTargets } from '../../../services/core/visibility.js?v=20261005h';
import { mockDB } from '../../../core/domain/domain.js?v=20261005h';
import { tokenOf } from '../../../core/base/version-token.js?v=20261005h'; // P0 域写版本戳（spec §二.4）
import { RESIDENCE_KEY } from '../../../services/member/roster.js?v=20261005h'; // 滞留覆盖 raw 源（roster 禁改不内改）
import { PREVIEW_KEY } from '../../../services/branch/org-base-data-preview.js?v=20261005h'; // 基础数据预览 raw 源
import { memoizeRender } from '../../../components/ui/memoize-render.js?v=20261005h'; // P2 渲染守卫（spec §四.1）
// 批4（2026-09-09 支书批「域参数」）：组长学期组员进展归集提醒开关（读侧注入后 = 当前支部有效默认）
import { POLICY_DEFAULTS } from '../../../core/domain/policy-defaults.js?v=20261005h';
// 批次 299「待我处理」两源——**单一源复用**，不另立取数口径：
//   · 未读通知 ＝ 顶栏铃铛同一取数（NoticeStore.list retention:'visible'）＋ 同一跳转解析（resolveNoticeUrl）
//   · 待处理汇报 ＝ 顶栏「一键汇报」角标同一集合（IssueNotify.getUnread(我)）
import { NoticeStore, resolveNoticeUrl } from '../../../services/governance/notice.js?v=20261005h';
import { IssueStore, IssueNotify } from '../../../services/governance/issues.js?v=20261005h';
// 批次 304「待我表态」三件——**判据与读口皆单一源**，不在本文件重写投票规则：
//   · 我是否应到表决人 ＝ `vote-config.js::isVoterOf`（角色无关，只看固化名单）
//   · 我是否已对某议程项表态 ＝ `committee-vote.js::hasVoted`
//   · 当前登录人 ＝ `AuthStore.getCurrentUser()`
import { AuthStore } from '../../../services/core/auth.js?v=20261005h';
import { isVoterOf } from '../../../services/activity/vote-config.js?v=20261005h';
import { hasVoted } from '../../../services/activity/committee-vote.js?v=20261005h';
// 活动类型胶囊（批次 301）：变体判据＝单一源 `activityTypeBadgeVariant`（三会一课＝brand 红 / 主题党日＝gold 金），
//   渲染唯一源＝`components/ui/badge.js`；**本文件不手写类型色值**。
import { activityTypeBadgeVariant, WORK_DOMAIN_COLORS, accDarkVars } from '../../../core/domain/constants.js?v=20261005h';
// 徽章扎口出口（2026-09-30 批次 304 改准）：`components/ui/badges.js` 是**唯一调用口**
//   （其文件头明写「调用方一律 import badges.js；内部实现文件 badge.js / status-badge.js 可各自演进」）；
//   批次 301 我直连了实现文件 `badge.js` ⇒ 本批收回归口，**零行为变化**。
import { badgeHtml } from '../../../components/ui/badges.js?v=20261005h';

// 工作台主题色走 CSS 变量（各台 bootstrap 已按 accent 注入；缺省兜底党建红），同 overview/统计卡用法
const ACCENT = 'var(--app-accent)';
const ACCENT_BG = 'var(--app-accent-bg)';

// ── P2 渲染守卫（2026-09-07 · spec §四.1）────────────────────────
// 今天卡为「读多写少」只读聚合视图：buildTodaySummary 内部已有 P0/P1 缓存，本守卫省的
// 是全链重算与 HTML 拼装/DOM 重建（每次无关 setState 切回/刷新都会触发整卡重建）。
// key = 今天日期 + 各数据源 tokenOf(todo/member/activity/signup/attendance/notice/issue) + 源数组
//   length 指纹 + member 覆盖/预览 raw 源（滞留覆盖 RESIDENCE_KEY / 基础数据预览 PREVIEW_KEY 的
//   写口不在 bump 链 → raw 内容比对兜底）+ 登录人/角色（同容器内容因人而异）。
//   批次 299 补 notice / issue 两枚（「待我处理」两源：通知标记已读与汇报状态变化都须落重建）。
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
    `notice=${tokenOf('notice')}`,
    `issue=${tokenOf('issue')}`,
    // 批次 304 补 agendaVotes：今天页「待我表态」读该集合 ⇒ 我表态 / 支书截止后须重算
    //   （bump 点在源写口 services/activity/committee-vote.js；length 兜底覆盖幂等 upsert 情形）
    `votes=${tokenOf('agendaVotes')}+${_arrLen(mockDB.agendaVotes)}`,
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

/** 'YYYY-MM-DD' → '9/30'（近期安排行日期短标） */
function _shortDate(dateStr) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(dateStr || ''));
  return m ? `${+m[2]}/${+m[3]}` : '';
}

// ── 信息自陈·形轴（2026-09-30 批次 299）──────────────────────────
// 状态由**行左 3px 竖色条**自陈（色随紧迫度/状态），不再用「圆点」点缀；分类走胶囊；
// 有时间者走时间轴行。行式载体（w-full ＋ text-left）是「操作可见性」（§4.1）的合法例外 ⇒ 仍用 `.btn-ghost`。

/** 段标题（卡片内小分组）：h4 ＋ `text-sm`（§3.2.2 内嵌面板标题档）；`n` 给计数，`allKind` 给右上「全部 ›」 */
function _segHead(title, n = null, allKind = '') {
  const count = (n !== null && n > 0) ? _count(n) : '';
  const all = allKind
    ? `<button type="button" class="btn-ghost today-all flex-shrink-0 text-xs" data-today-all="${allKind}">全部 ›</button>`
    : '';
  return `
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-title-cn text-sm font-bold text-gray-700">${title}${count}</h4>
      ${all}
    </div>`;
}

/** 段头数字（仅 n>0 显示） */
function _count(n) {
  return n > 0 ? `<span class="text-base font-bold ml-1.5 tabular-nums" style="--acc-text-dark:${ACCENT};color:color-mix(in srgb, ${ACCENT} 60%, #000);">${n}</span>` : '';
}

/** 清单行（行式载体）：左 3px 竖色条＝状态自陈；`bar`＝色条色，`inner`＝行内其余内容 */
function _row(bar, inner, attrs = '') {
  return `
    <button type="button" class="btn-ghost today-go w-full flex items-center gap-2 pl-2.5 pr-2 py-2 text-left"
      ${attrs}>
      <span class="w-[3px] self-stretch rounded-full flex-shrink-0" style="background:${bar};"></span>
      ${inner}
    </button>`;
}

/** 角色胶囊（分类标签：**只上标签形**，§2.9.3 U3）——只服务**项目角色**（组织者 / 深度参与者）；
 *  活动**类型**一律走 `_typeChip`（类别色），两者语义不同、色不得混。 */
function _chip(text) {
  if (!text) return '';
  return `<span class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style="--acc-text-dark:${ACCENT};background:${ACCENT_BG};color:color-mix(in srgb, ${ACCENT} 60%, #000);">${esc(text)}</span>`;
}

/** **活动类型**胶囊（批次 301）：走类别色单一源 —— 三会一课＝党建红（brand）· 主题党日系＝党徽金（gold）·
 *  其余＝中性灰。**不再与「角色」共用主题色胶囊**（角色≠活动类别，两者语义不同、色不得混）。 */
function _typeChip(type) {
  if (!type) return '';
  return badgeHtml(esc(type), activityTypeBadgeVariant(type));
}

// ── 左卡：今天要办 ───────────────────────────────────────────────
//  单一轴（2026-10-01 批次 329 · 支书裁「甲 单一轴＝动作性质」「甲 只表紧迫度」）：
//    · **分类轴**＝动作性质七类（`TodoActionType`；组序/组名＝`TODO_ACTION_*` 单一源）；
//    · **紧迫度轴**＝行左 3px 竖色条（红＝逾期 / 金＝今天到期 / 灰＝随时）——**同一形状只承担一件事**。

/** 事项来源 → 动作性质（**单一源映射**）：非待办来源（分工/表态/通知/汇报）并入哪一类。
 *  分工 / 表态 → `participate`（参与：我要到场 / 我要动嘴表态）；通知 → `read`（阅读）；汇报 → `review`（审核）。 */
const SOURCE_ACTION = { duty: 'participate', vote: 'participate', notice: 'read', report: 'review' };

/** 待办 → 统一行模型 `{key, bar, inner, attrs}`（key＝组内紧迫度排序键，无截止殿后）：
 *  行左 3px 条**只表紧迫度**（红＝逾期 / 金＝今天到期 / 灰＝随时）；分类走胶囊（业务域）。 */
function _todoEntry(it, today) {
  const overdue = !!it.deadline && it.deadline < today;
  const dueToday = !!it.deadline && it.deadline === today;
  const bar = overdue ? 'var(--functional-error)'
    : dueToday ? 'var(--functional-warning)' : 'var(--neutral-400)';
  const titleCls = overdue ? 'text-red-600 font-medium' : 'text-gray-800';
  const metaCls = overdue ? 'text-red-600 font-medium' : 'text-gray-500';
  return {
    key: it.deadline || '9999-12-31',
    bar,
    inner: `<span class="text-sm flex-1 min-w-0 truncate ${titleCls}">${esc(it.title || '未命名待办')}</span>
       ${_domainChip(it.domain, it.domainLabel)}
       <span class="text-[11px] tabular-nums flex-shrink-0 ${metaCls}">${esc(it.deadline || '')}</span>`,
    attrs: `data-go="todo" title="${esc(it.title || '')}"`,
  };
}

/** 今日分工 → 参与类行（角色走胶囊；点击进活动详情）。无截止 ⇒ 紧迫度＝灰（随时）。 */
function _dutyEntry(d) {
  return {
    key: '9999-12-31',
    bar: 'var(--neutral-400)',
    inner: `<span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(d.activityTitle || '未命名活动')}</span>
       ${_chip(d.role)}
       <span class="text-xs text-gray-500 flex-shrink-0">›</span>`,
    attrs: `data-go="activity" data-act-id="${esc(d.activityId)}" title="${esc(d.activityTitle || '')}"`,
  };
}

/** 待我表态 → 参与类行（判据单一源见 `_myVoteList`；点击进活动详情逐条表态） */
function _voteEntry(a) {
  return {
    key: '9999-12-31',
    bar: 'var(--neutral-400)',
    inner: `<span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(a.title || '未命名活动')}</span>
       <span class="text-xs text-gray-500 flex-shrink-0">›</span>`,
    attrs: `data-go="activity" data-act-id="${esc(a.id)}" title="前往活动详情页表态"`,
  };
}

/** 未读通知 → 阅读类行（与顶栏铃铛同一取数 `_unreadNotices`、同一跳转 `resolveNoticeUrl`） */
function _noticeEntry(n) {
  return {
    key: '9999-12-31',
    bar: 'var(--neutral-400)',
    inner: `<span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(n.title || n.content || '未命名通知')}</span>
       <span class="text-[11px] tabular-nums text-gray-500 flex-shrink-0">${esc(n.publishDate || '')}</span>`,
    attrs: `data-go="notice" data-notice-id="${esc(n.id)}" title="${esc(n.title || '')}"`,
  };
}

/** 待处理汇报 → 审核类行（与顶栏「一键汇报」角标同一集合；点击进「我的处置」） */
function _reportEntry(i) {
  return {
    key: '9999-12-31',
    bar: 'var(--neutral-400)',
    inner: `<span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(i.title || i.body || '待处理汇报')}</span>
       <span class="text-xs text-gray-500 flex-shrink-0">›</span>`,
    attrs: 'data-go="my-dispatch" title="前往我的处置处理"',
  };
}

/** 统一行载（左 3px 条只表紧迫度） */
function _entryRow(e) { return _row(e.bar, e.inner, e.attrs); }

/** **业务域**胶囊（`D-787` 合并后 **6 类**）：**只上标签形**（§2.9.3 U3）——域是**分类**不是状态、
 *  也不是「活动类别」，故默认不占功能色；色只留给「行左 3px 条」的紧迫度自陈。
 *  配色单一源＝`constants.js::WORK_DOMAIN_COLORS`（体例同 `ACTIVITY_CAT_COLOR`）；**现行该表为空**
 *  （`D-787` 合并后**配色随 6 类再议**，待支书指色）⇒ 各域一律回落中性胶囊。带色胶囊会加
 *  `data-domain` 供真机锚定；深色态走 `--acc-*-dark`（与全站内联色同一套机制）。 */
function _domainChip(domain, label) {
  if (!label) return '';
  const c = WORK_DOMAIN_COLORS[domain];
  if (!c) return `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">${esc(label)}</span>`;
  return `<span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" data-domain="${esc(domain)}" style="background:${c.bg};color:${c.text};border:1px solid ${c.border};${accDarkVars(c.text)}">${esc(label)}</span>`;
}

/**
 * **按动作性质分组**（2026-10-01 批次 320 立；**批次 329 收成单一轴**）：
 *   **为什么改**：支书评今天页「**我并不知道 这几个h4排布是什么逻辑？我看不懂！！**」——原左卡把
 *   「紧迫度 / 动作性质 / 角色分工 / 事项来源」**四条轴混在同一层 h4** 上 ⇒ 收成**一条轴＝动作性质**。
 *   **做法**：`TodoActionType` 七类摊开——**组标题 ＝ 动作性质 ＋ 计数**；**行内右端 ＝ 业务域小胶囊**；
 *   **行左 3px 条只表紧迫度**（红/金/灰）；**非待办来源按 `SOURCE_ACTION` 归入七类**
 *   （分工/表态 → 参与；通知 → 阅读；汇报 → 审核——汇报为异步，渲染后由 `_fillPendingReports` 注入）。
 *   ⚠ 组序 / 组名＝唯一源 `TODO_ACTION_ORDER` / `TODO_ACTION_LABELS`（`today-summary.js` 导出，与
 *     `byAction` 同源）；**空组不渲染**（空维度不占位）；计数只在组标题出现一次（§4.14）。
 */
function _actionGroupsBlock(s) {
  const today = s.date || '';
  const byType = new Map();
  const push = (at, e) => { if (!byType.has(at)) byType.set(at, []); byType.get(at).push(e); };

  // 主源：本岗在办待办（`byAction` 已按动作性质分好组，含**逾期 ＋ 今天到期 ＋ 无截止**）
  for (const g of (Array.isArray(s.byAction) ? s.byAction : [])) {
    for (const it of (g.items || [])) push(g.actionType, _todoEntry(it, today));
  }
  // 并入：今日分工 / 待我表态 → 参与；未读通知 → 阅读（汇报为异步，见 `_fillPendingReports`）
  for (const d of (Array.isArray(s.myDuties) ? s.myDuties : [])) push(SOURCE_ACTION.duty, _dutyEntry(d));
  let personId = '';
  try { personId = AuthStore.getCurrentUser()?.personId || ''; } catch (_) { personId = ''; }
  for (const a of _myVoteList(personId)) push(SOURCE_ACTION.vote, _voteEntry(a));
  for (const n of _unreadNotices()) push(SOURCE_ACTION.notice, _noticeEntry(n));

  const blocks = [];
  for (const at of TODO_ACTION_ORDER) {
    const entries = byType.get(at);
    if (!entries || !entries.length) continue;   // 空组不出现（空维度不占位）
    entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)); // 组内紧迫度升序、无截止殿后
    const rows = entries.map(_entryRow).join('');
    blocks.push(`<div data-action-group="${esc(at)}">${_segHead(TODO_ACTION_LABELS[at], entries.length)}<div class="space-y-1.5" data-action-rows="${esc(at)}">${rows}</div></div>`);
  }
  return blocks.join('');
}

/**
 * **待我表态**（同步，2026-09-30 批次 304 立；批次 329 改为**返回数据**供并入「参与」类）：
 *   我在本场**固化应到名单**内、活动为线上异步表决、尚未锁定、且我对它的议程**还没表态** ⇒ 列为待办。
 * 依据：支书 2026-09-30 原话「**即使是支部书记 / 其他支委 投票，在投票的时候也就是普通党员**」
 *   ⇒ **表态权与角色无关**（判据单一源＝`vote-config.js::isVoterOf`），且**每个人的清单各不相同**
 *   （「我不知道 每个人的 div 是否有所区别？」——正是此意：由名单决定，不由角色决定）。
 * 呈现：**每场只报一行**（进活动详情页逐条表态，不在桌面重复列议程明细）。
 */
function _myVoteList(personId) {
  if (!personId) return [];
  const votes = mockDB.agendaVotes || [];
  const list = [];
  for (const a of (mockDB.activities || [])) {
    if (!a || !isVoterOf(a, personId)) continue;
    if (a.voteConfig?.mode !== 'async' || a.votesLocked) continue;
    const pending = (Array.isArray(a.agenda) ? a.agenda : [])
      .filter(it => it && it.id && !hasVoted(votes, personId, it.id));
    if (!pending.length) continue;
    list.push(a);
  }
  return list.slice(0, 3);
}

/** 未读通知取数（同步，与顶栏铃铛**同源**）：`NoticeStore.list` ＋ `retention:'visible'` */
function _unreadNotices() {
  try {
    return NoticeStore.list({ activeOnly: true, sortBy: 'date', retention: 'visible' })
      .filter(n => n && !n.read).slice(0, 3);
  } catch (_) { return []; }
}

/** 待处理汇报实体填充（异步）：与顶栏「一键汇报」角标**同一集合** ⇒ **注入「审核」组**。
 *  无该组则**动态建组**（`review` 在 `TODO_ACTION_ORDER` 首位 ⇒ 前置）；有则该组计数同步 +n
 *  （§4.14：计数只留在组标题一处）。空集合则不动 DOM（不留空壳）。 */
async function _fillPendingReports(container, personId, onNav) {
  const groupsHost = container && container.querySelector('[data-today-groups]');
  if (!groupsHost) return;
  let issues = [];
  try {
    await IssueStore.loadAll();
    issues = IssueNotify.getUnread(personId)
      .map(id => IssueStore.getById(id)).filter(Boolean).slice(0, 3);
  } catch (err) {
    console.warn('[today-tab] 待处理汇报读取失败：', err);
    return;
  }
  if (!issues.length) return;
  const at = SOURCE_ACTION.report;
  const entries = issues.map(_reportEntry);
  const rowsHtml = entries.map(_entryRow).join('');
  let groupEl = groupsHost.querySelector(`[data-action-group="${at}"]`);
  if (groupEl) {
    const rowsHost = groupEl.querySelector(`[data-action-rows="${at}"]`);
    if (!rowsHost) return;
    rowsHost.insertAdjacentHTML('beforeend', rowsHtml);
    const headCount = groupEl.querySelector('h4 span');   // `_segHead` 的计数 span（h4 内唯一 span）
    if (headCount) headCount.textContent = String(rowsHost.querySelectorAll('.today-go').length);
  } else {
    groupsHost.insertAdjacentHTML('afterbegin',
      `<div data-action-group="${esc(at)}">${_segHead(TODO_ACTION_LABELS[at], entries.length)}<div class="space-y-1.5" data-action-rows="${esc(at)}">${rowsHtml}</div></div>`);
    groupEl = groupsHost.firstElementChild;
  }
  // 新注入行绑定点击（主渲染的 `.today-go` 循环已跑过）
  const fresh = Array.from(groupEl.querySelectorAll('.today-go')).slice(-entries.length);
  fresh.forEach(b => b.addEventListener('click', () => _navPending(b, onNav)));
  // 空态提示随首个分组出现而移除
  const emptyHint = container.querySelector('[data-today-empty]');
  if (emptyHint) emptyHint.remove();
}

/** 「我的处置」跳转（onNav 未提供时为空操作，便于独立预览） */
function _navPending(btn, onNav) {
  if (btn.dataset.go === 'my-dispatch' && typeof onNav === 'function') onNav('my-dispatch');
}

// ── 右卡：我的日程 ───────────────────────────────────────────────

/** 时间轴行：时间（tabular-nums）＋ 标题 ＋ 类型胶囊 ＋ ›；点击 → activity.html */
function _meetingRow(m) {
  return _row(ACCENT,
    `<span class="text-[11px] tabular-nums text-gray-500 w-11 flex-shrink-0">${esc(m.start || '—')}</span>
     <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${esc(m.title || '未命名会议')}</span>
     ${_typeChip(m.type)}
     <span class="text-xs text-gray-500 flex-shrink-0">›</span>`,
    `data-go="activity" data-act-id="${esc(m.activityId)}" title="${esc(m.title || '')}"`);
}

function _meetingBlock(s) {
  const rows = s.hasMeeting.map(_meetingRow).join('');
  return `
    ${_segHead('今天有会', s.hasMeeting.length, 'meeting')}
    ${rows ? `<div class="space-y-1.5">${rows}</div>` : '<p class="text-xs text-gray-500 px-1 py-1.5">今日无会</p>'}`;
}

/** 活动管理快捷入口（2026-09-25 立；2026-09-30 批次 310 扩到全角色）：
 *  2026-09-25 支书裁定：党小组 tab 更名并收编党小组活动后，活动管理的写操作从 tab 名上不再一眼可寻
 *    ⇒ 今日页留一手（防高频动作被埋）。形态沿用本页「行」体例，不新造第三种视觉。
 *  2026-09-30 批次 310 支书裁定「**每个人应该都有这样的活动日历界面，可以从桌面的部分日历 跳转过来**」：
 *    「看日历」是**只读入口**（跳各台「活动日历」tab，五台同 id ⇒ 无需按台映射）⇒ 全角色呈现；
 *    「建活动」是**写入口**（只在接线了写入表单的台可用）⇒ 仍由 `onCreateActivity` 是否传入决定。 */
function _activityEntryBlock(withCreate) {
  return `
    ${_segHead('活动管理')}
    <div class="flex items-center gap-2">
      ${withCreate ? '<button type="button" class="btn-ghost today-go flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm" data-go="create-activity" title="新建活动（打开既有「写入活动」表单）">建活动</button>' : ''}
      <button type="button" class="btn-ghost today-go flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm" data-go="calendar" title="打开活动日历（日历仍显示全部活动）">看日历</button>
    </div>`;
}

/** 近期安排（未来 7 天，不含今天）：灰条 ＋ 日期短标 ＋ 标题 ＋ 类型胶囊；点击 → 活动详情 */
function _upcomingBlock(s) {
  const items = Array.isArray(s.upcoming) ? s.upcoming : [];
  const rows = items.map(u => _row('var(--neutral-400)',
    `<span class="text-[11px] tabular-nums text-gray-500 w-9 flex-shrink-0">${esc(_shortDate(u.date))}</span>
     <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${esc(u.title || '未命名活动')}</span>
     ${_typeChip(u.type)}`,
    `data-go="activity" data-act-id="${esc(u.activityId)}" title="${esc(u.title || '')}"`)).join('');
  return `
    ${_segHead('近期安排', items.length)}
    ${rows ? `<div class="space-y-1.5">${rows}</div>` : '<p class="text-xs text-gray-500 px-1 py-1.5">近 7 天暂无安排</p>'}`;
}

/** 全空 → 两卡不消失、仅各示一句空态（若接了活动管理快捷入口，右卡底部仍留住入口，防空日把写操作埋掉） */
function _allEmptyHtml(activityEntry = '') {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <section class="lg:col-span-2 card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">今天要办</h3>
        <div class="flex items-center gap-2 py-6">
          <span class="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></span>
          <p class="text-sm text-gray-500">今天暂无待办</p>
        </div>
      </section>
      <section class="lg:col-span-1 card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">我的日程</h3>
        <div class="flex items-center gap-2 py-6">
          <span class="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></span>
          <p class="text-sm text-gray-500">今天暂无安排</p>
        </div>
        ${activityEntry ? `<div class="pt-4 mt-2 border-t border-gray-100">${activityEntry}</div>` : ''}
      </section>
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
    <div class="card rounded-xl p-4 border-l-4" style="border-left-color:${ACCENT};" data-leader-sem-remind="1">
      <div class="flex items-start gap-3">
        <span class="flex-none w-8 h-8 rounded-lg flex items-center justify-center" style="background:${ACCENT_BG};color:${ACCENT};">${icon('bell', { className: 'icon-base w-4 h-4' })}</span>
        <div class="flex-1 min-w-0">
          <p class="font-title-cn text-sm font-bold text-gray-800">本学期组员进展（系统汇总）</p>
          <p class="text-xs text-gray-600 leading-relaxed mt-1">本组组员本学期进展由系统汇总（思想汇报 / 考察 / 复盘 / 在办事项），无需逐人手工归集；缺漏项以「需跟进」人数示出，进「组员进展」可看逐人明细。</p>
          <p class="text-xs text-gray-700 mt-1.5" data-lsr-facts>正在汇总…</p>
          <div class="flex flex-wrap items-center gap-2 mt-2.5">
            <button type="button" class="btn-accent text-xs px-3 py-1.5 font-medium" data-lsr-act="go">去「组员进展」看汇总</button>
            <button type="button" class="btn-outline text-xs px-3 py-1.5" data-lsr-act="later">本学期已处理，不再提醒</button>
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
 *   （未提供则相关点击为空操作，组件仍可独立预览）。tabId 语义：'todo'=待办；'my-dispatch'=我的处置（待处理汇报）；
 *   'calendar'=各台同 id 的只读「活动日历」页签（2026-09-30 批次 310：全角色「看日历」落点）；
 *   会议「全部」用 'activities'（各工作台活动列表所在 tab 的语义 id，接线时按台映射/无则忽略）。
 * @param {()=>void} [params.onCreateActivity] — 可空：活动管理快捷入口「建活动」回调（直达既有「写入活动」入口）。
 *   仅接线的工作台传入（当前＝支书台）；未传入则不渲染该快捷入口（其余台的今日页形态不变）。
 */
export function renderTodayTab(container, { personId, role, onNav, onCreateActivity } = {}) {
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
      summary = { date: '', hasMeeting: [], overdue: [], dueToday: [], myDuties: [], upcoming: [] };
    }
    const dateLabel = _dateLabel(summary.date) || _dateLabel(_fmtDate(new Date()));

    const total = summary.hasMeeting.length + summary.overdue.length
      + summary.dueToday.length + summary.myDuties.length
      + ((summary.todoSummary && summary.todoSummary.total) || 0)
      + ((summary.upcoming && summary.upcoming.length) || 0);

    // 批4：组长开学周提醒条（仅组长角色；开关/窗口/防重复见 _leaderSemesterRemindHtml）
    const leaderSemReminder = role === 'leader' ? _leaderSemesterRemindHtml(personId) : '';
    // 活动管理快捷入口（2026-09-30 批次 310：全角色呈现「看日历」；「建活动」只在接线了写入表单的台出现）
    const activityEntry = _activityEntryBlock(typeof onCreateActivity === 'function');

    // 左卡「今天要办」＝ **单一轴：动作性质七类**（2026-10-01 批次 329 · 支书裁「甲 单一轴＝动作性质」「甲 「今天要办」」）。
    //   ⚠ 原「逾期区 / 今天到期 / 本岗待办 / 今日分工 / 待我表态 / 未读通知 / 待我处理的汇报」七段
    //     已收成**一条轴**——「四轴混在同一层 h4」正是支书所斥「这几个 h4 排布是什么逻辑？我看不懂！！」的根源。
    //   ⚠ 「全部 ›」留在**卡标题行**（分组不再只有一个段头，链接留任一段头都显得只属于那一段）。
    //   ⚠ 卡片**首个子 div 须为标题行**（真机件 `today-action-groups-e2e` 以其定位「全部 ›」）。
    const actionGroupsHtml = _actionGroupsBlock(summary);
    const leftCard = `
      <section class="lg:col-span-2 card rounded-xl p-5 space-y-5 min-w-0">
        <div class="flex items-center justify-between">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">今天要办</h3>
          <button type="button" class="btn-ghost today-all flex-shrink-0 text-xs" data-today-all="todo">全部 ›</button>
        </div>
        <div data-today-groups class="space-y-5">${actionGroupsHtml}</div>
        ${actionGroupsHtml ? '' : '<p data-today-empty class="text-xs text-gray-500 px-1 py-1.5">今日暂无待办</p>'}
      </section>`;
    // 右卡「我的日程」＝ 今天有会 → 活动管理入口 ＋ 「近期安排」（未来 7 天）
    const rightCard = `
      <div class="lg:col-span-1 space-y-5 min-w-0">
        <section class="card rounded-xl p-5 space-y-5">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">我的日程</h3>
          <div>${_meetingBlock(summary)}</div>
          ${activityEntry ? `<div>${activityEntry}</div>` : ''}
        </section>
        <section class="card rounded-xl p-5">
          ${_upcomingBlock(summary)}
        </section>
      </div>`;

    const body = total === 0
      ? _allEmptyHtml(activityEntry)
      : `<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">${leftCard}${rightCard}</div>`;

    // 跨 tab 共享容器约定（同 todo/overview/assign/…）：本 tab 渲染时登记当前 tab 标记。
    // ⚠ 本 tab 此前缺此登记（2026-09-25 真机实测：活动管理 → 今天 → 活动管理，因 calendar-tab 的
    //   `dataset.currentTab` 守卫读到陈旧标记 'calendar' 而跳过整块重绘，残留上一 tab 内容）。
    //   本批的「建活动 / 看日历」与「+ 新建党小组活动」都要落回活动管理，故必须补上这一登记。
    container.dataset.currentTab = 'today';
    container.innerHTML = `
      <div class="space-y-4" data-ws-memo="today">
        <h2 class="font-title-cn text-lg font-bold text-gray-800">今天 · <span class="text-base font-normal text-gray-500">${esc(dateLabel)}</span></h2>
        ${leaderSemReminder}
        ${body}
      </div>`;

    // 行点击：会议/分工/近期安排 → 活动详情页；到期/逾期 → onNav('todo')；通知 → resolveNoticeUrl（同顶栏）；
    //   活动管理快捷入口：建活动 → onCreateActivity；看日历 → onNav('calendar')（各台同 id 的只读日历页签）
    container.querySelectorAll('.today-go').forEach(btn => {
      btn.addEventListener('click', () => {
        const go = btn.dataset.go;
        if (go === 'activity') {
          const id = btn.dataset.actId;
          if (id) window.location = 'activity.html?id=' + encodeURIComponent(id);
        } else if (go === 'todo' && typeof onNav === 'function') {
          onNav('todo');
        } else if (go === 'create-activity' && typeof onCreateActivity === 'function') {
          onCreateActivity();
        } else if (go === 'calendar' && typeof onNav === 'function') {
          onNav('calendar');
        } else if (go === 'notice') {
          _openNotice(btn.dataset.noticeId);
        } else if (go === 'my-dispatch') {
          _navPending(btn, onNav);
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
    // 待处理汇报**异步注入「审核」组**（与顶栏「一键汇报」角标同一集合；无组则动态建组）
    _fillPendingReports(container, personId, onNav);
    // 批4：组长开学周提醒条（去组员进展 / 本学期不再提醒 → 标记防重复弹并收条）
    bindLeaderSemesterRemind(container, personId, onNav);
  }, { marker: '[data-ws-memo="today"]' });
}

/** 未读通知直达（与顶栏铃铛同一解析：业务页直达优先，否则回退通知详情页）；同时标记已读 */
function _openNotice(noticeId) {
  if (!noticeId) return;
  let notice = null;
  try {
    notice = (NoticeStore._current() || []).find(n => n.id === noticeId) || null;
    NoticeStore.markRead(noticeId);
  } catch (_) { /* 忽略 */ }
  const dest = resolveNoticeUrl(notice);
  const base = typeof window !== 'undefined' && window.location ? window.location.pathname.replace(/[^/]*$/, '') : '';
  window.location.href = dest.direct && dest.url ? dest.url : `${base}notice.html?id=${noticeId}`;
}
