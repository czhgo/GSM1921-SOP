// role: [工程师]+[AI]
// components/record/todo-tab-shell.js — 待办 tab 公共壳（T-304 代码减负 2026-08-30；IA-C1 Task4 域化重构 2026-09-07）
// 背景：6 个工作台 todo-tab 骨架逐字重复（选中首条 / renderTodoList / 两栏 HTML / 删除 / 详情按钮绑定），
//       支书 2026-08-30：「模块化只见代码增多少见代码减少」→ 共性抽壳。
// 设计：createTodoTab(opts) 工厂，每个角色一个实例（状态自持，与原模块级私有状态等价）。
// 2026-10-19 最小三成本 Task 5 / harden-mobile-and-primary-actions Task 3（首屏与去重）：
//   输出区 = ① 页顶「待答复与未读通知」折叠条（原生 details，**默认展开**；
//             展开后待答复只露前 2 条，其余经「查看全部待答复」展开；
//             未读通知为二级折叠，默认收起，摘要「未读通知 N」）
//          ② 我的待办卡：四数摘要「逾期 / 今日 / 本周 / 待处理」——与列表共用
//             buildUrgencySections 的同一批分组数据，不另算口径；
//             下方四档列表「逾期 / 今日 / 本周 / 以后」（domains 展平为组后按截止日/状态归类；
//             业务域降为行内标签；实时组经 mergeRealtimeDomains 照旧并入）；
//             组头只留组名 + 状态点，计数只在摘要出现；
//          ③ 右栏详情（各角色自定义 renderDetail/extraTopHtml/bindExtras 照旧挂载）
//   角色差异经参数注入：containerId/prefix/role/onAction/buildRealtimeGroups/renderDetail/
//       onBeforeRender/onAfterRender/extraTopHtml/bindExtras/emptyHint/detailTitle/
//       detailBtnClass/detailBtnStyle/onDeleteTodo。
// 视觉沿用 card/rounded 既有体系（四档列表渲染在 components/record/todo-list.js renderUrgencyTodoList）。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §六 M6（共性抽象净减）

import { TodoStore, urgeRolesOf, WORK_DOMAIN, WORK_DOMAIN_LABELS, realtimeGroupDomainOf, buildModuleCycleRemindGroup } from '../../services/governance/todo.js?v=20261109a';
// S3②（2026-09-12）：未读通知计数单一来源——与顶栏角标/首页同源（NoticeStore activeOnly+read 过滤），
// 不再用「通知类待办」现算（口径不同致三处不一致）。
import { NoticeStore, NOTICE_MODULE_ROLE_PAGES } from '../../services/governance/notice.js?v=20261109a';
import { buildUrgencySections, renderUrgencyTodoList } from './todo-list.js?v=20261109a';
import { badgeHtml } from '../ui/badges.js?v=20261109a';
import { icon } from '../../core/base/icons.js?v=20261109a';
import { showToast, escHtml, todayLocal, flashHighlight, getBasePath, smoothScroll } from '../../core/base/utils.js?v=20261109a';
import { ROLE_LABELS, BRANCH_COMMISSION_ROLES } from '../../core/domain/constants.js?v=20261109a';
import { openModal, closeModal, confirmDanger } from '../ui/modal.js?v=20261109a';
import { AuthStore } from '../../services/core/auth.js?v=20261109a';
import { mockDB } from '../../core/domain/domain.js?v=20261109a';
import { tokenOf } from '../../core/base/version-token.js?v=20261109a'; // P0 域写版本戳（spec §二.4）
import { resolveDocumentUrl } from '../../core/base/page-url.js?v=20261109a';
import { memoizeRender } from '../ui/memoize-render.js?v=20261109a'; // P2 渲染守卫（spec §四.1）
import { renderTabHeader } from '../shell/page-frame.js?v=20261109a'; // 页题单一源（H2）
// 模块周期提醒（`R-29⑤` · `D-804`）：分工快照取法与 `components/governance/workforce-duty-card.js` 同口径
import { getBranchIdOfPerson, getBranchWorkforce } from '../../services/branch/branch.js?v=20261109a';
// 待办「实时派生组」服务端只读端点（批次 532 · B-500-7 最小 Plan B）：
//   批次 534（B-500-7b-1 Task 9）起**服务端为默认来源**——api 形态取服务端派生组，客户端只做展示派生
//   （分档 / 排序 / 格式化 / 筛选 / 折叠）；mock 形态 / 服务端读取失败才回落客户端派生（兜底）。
import { getAdapter, getDataSource } from '../../data/data-adapter.js?v=20261109a';
// 7 键实时组映射（服务端 Task 8 同源消费）：用于声明「服务端已接管」的动作键集合
import { DERIVE_GROUP_DOMAIN } from '../../core/domain/todo-derive.js?v=20261109a';

// ── 「我经办的反馈」区（2026-10-25 IA 62→45 · spec Task 5）──────────────
// 五台原「我的处置」页签已删（与待办同属「我的待处理」，只是对象为反馈）⇒ 并入本页成一段。
// 实现单一源＝`components/feedback/issue-dispatch-view.js`（embedded 形态：不渲染第二张页头 H2，
// 列表 / 详情 / 评论 / 提交处置结果一字未改，不复制第二套）。
// 旧深链 `?tab=my-dispatch` 由工作台壳落 `todo&filter=dispatch`（本区据此滚到视野）。
import { emptyStateHtml } from '../ui/empty-state.js?v=20261109a';
const DISPATCH_SECTION_BY_ROLE = {
  'org-commissioner': { roleKey: 'org-commissioner', opts: {} },
  'prop-commissioner': { roleKey: 'prop-commissioner', opts: {} },
  'disc-commissioner': { roleKey: 'disc-commissioner', opts: {} },
  leader: { roleKey: 'leader', opts: { myIssuesFirst: true } },
  visitor: { roleKey: 'participant', opts: { myIssuesFirst: true } },
};

// ── P0 组合数据复合键（2026-09-07 · spec §二.4）──────────────────
// 组合点（buildRealtimeGroups + mergeRealtimeDomains + getUnreadNotices）以
// 「各域写版本戳 tokenOf + 各源数组 length + todo 写版本 + 日期」为键记忆化：
// 未写 → 直接复用上次组合结果（⚠️ 返回对象只读契约——调用方仅读渲染）；
// 数据变化经写口 bump / 源数组长度指纹触发键变重算（含禁改 adapter 直写路径的 length 兜底）。
// role 每壳固定（createTodoTab 单角色实例）仍纳入键，防未来同壳复用。
const _COMBO_LEN_KEYS = [
  ['attendance', 'attendances'],
  ['activity', 'activities'],
  ['inspection', 'inspections'],
  ['activityReview', 'activityReviews'],
  ['archiveRecord', 'archiveRecords'],
  ['taskforce', 'taskforces'],
  ['resolution', null], // 决议 = 活动 agenda 内嵌：activities 长度 + activity/resolution 令牌已覆盖
  ['signup', 'signups'],
  ['handoff', 'handoffs'],
  ['memberConfirmation', 'pendingMemberConfirmations'],
  // 2026-09-08 顶卡同步化：成员变更申请（member-change-panel 产物内容源）并入守卫键。
  //   · 长度指纹覆盖 议程记录通过/组织委员建档 等直写新建（adapter.create，mock-adapter 禁改无 bump）；
  //   · approve/confirm 仅改 status、长度不变 → 由 member-change-panel 写口成功后显式
  //     bumpToken('memberChangeRequests') 兜底（见该组件头注）→ 支书确认/组织审批后重建而非命中跳过。
  ['memberChangeRequests', 'memberChangeRequests'],
  ['notice', 'notices'],
];
function _comboKeyOf(role, retrySeq = 0) {
  const parts = _COMBO_LEN_KEYS.map(([tok, arr]) => {
    const len = arr ? (Array.isArray(mockDB[arr]) ? mockDB[arr].length : '') : '';
    return len === '' ? `${tok}=${tokenOf(tok)}` : `${tok}=${tokenOf(tok)}+${len}`;
  });
  parts.push(`todo=${tokenOf('todo')}`);
  parts.push(`member=${tokenOf('member')}`);
  parts.push(`day=${todayLocal()}`);
  parts.push(`role=${role}`);
  // 失败兜底后的「重试」（Task 9）：键内加序号 ⇒ 绕过组合缓存与渲染守卫，重新取服务端派生组
  parts.push(`retry=${retrySeq}`);
  // 「到人」定向（批次 428）：本人身份入复合键 —— 同一 tab 内换登录身份（开发身份卡）不得命中上一位的组合缓存
  const _me = AuthStore.getCurrentUser && AuthStore.getCurrentUser();
  parts.push(`p=${(_me && (_me.personId || _me.id)) || ''}`);
  return parts.join(',');
}

/**
 * 模块周期提醒组（2026-10-06 批次 423 · `R-29⑤` · `D-804`）——**各台通用、不逐台接线**。
 * 口径：本台主体（登录角色键 ＋ 本人 personId）名下、**有制度固定周期**的支部分工模块
 *   （`core/domain/work-map.js::WORK_MAP_MODULES[].cycle`），**本期未见对应活动** ⇒ 出一张组卡。
 * **纯读**：不落库、不改数据、不派任务（体例同组织台「半年考察提醒」）。
 * 分工快照取法照 `components/governance/workforce-duty-card.js`（同一口径，勿另写）；
 * 无登录人 / 无相关模块 ⇒ 空数组（**不产生空组卡**）。
 * @param {string} role 本壳角色键（`createTodoTab` 的 `role`）
 * @returns {Array<Object>} 实时组数组（0 或 1 个）
 */
function _moduleCycleGroupsFor(role) {
  const me = AuthStore.getCurrentUser && AuthStore.getCurrentUser();
  const personId = me && (me.personId || me.id);
  const branchId = personId ? getBranchIdOfPerson(personId) : null;
  const snapshot = branchId ? getBranchWorkforce(branchId) : null;
  const group = buildModuleCycleRemindGroup({
    activities: [...(mockDB.activities || [])],
    subjectIds: [(me && me.role) || role, personId].filter(Boolean),
    snapshot,
  });
  return group ? [group] : [];
}

// ── 窄屏布局判据（spec 阶段一 Task 1：390 待办列表优先）──────────────
// 与 Tailwind `lg` 断点同值（1024px）：<lg = 单列「列表在前、详情在后」；
// ≥lg = 现有双栏（列表 2/3 + 详情 1/3）。只用于「是否自动选中 / 是否渲染详情列」，
// 不改数据与查询链。
const TODO_DESKTOP_QUERY = '(min-width: 1024px)';
/** 服务端实时组取用告警（每页只 warn 一次；失败后回落客户端派生，不把页面打空） */
let _serverRealtimeGroupsWarned = false;

/**
 * 服务端已接管的实时组动作键（批次 534 · B-500-7b-1 Task 9；批次 539 增纪检确认队列）。
 * 单一源：7 类＝`core/domain/todo-derive.js::DERIVE_GROUP_DOMAIN`（服务端 Task 8 同源消费）；
 *   另 3 类（发展节点 / 半年考察 / 模块周期）＝批次 532 起服务端已算，键名见 `server/routes/todo-groups.js`；
 *   纪检「考勤 / 考察待确认」＝批次 539 起服务端派生（`deriveAttendanceConfirmGroup` / `deriveInspectionConfirmGroup`）。
 * 服务端成功时这些键**只以服务端结果为准**：客户端不再派生、也不并入同键组（防同组双卡 / 计数失真）。
 */
export const SERVER_OWNED_ACTION_KEYS = new Set([
  ...Object.keys(DERIVE_GROUP_DOMAIN),
  'develop-node-remind',
  'half-year-inspection-remind',
  'module-cycle-remind',
  'attendance-confirm',
  'inspection-confirm',
]);

/**
 * 服务端实时派生组读取（批次 532 · B-500-7；Task 9 起为**默认来源**）。
 * 三种状态：`ok`（拿到响应，含空数组）/ `unavailable`（mock 数据源 / 无登录人 / 适配器无该方法，
 *   属正常形态，不算失败）/ `failed`（api 形态请求抛错 ⇒ 回落客户端兜底 + 可见失败提示）。
 * 失败只 `console.warn` 一次（每页），不抛错、不把页面打空。
 * @param {string} role 本壳角色键
 * @returns {Promise<{status:'ok'|'unavailable'|'failed', groups:Array<Object>}>}
 */
async function _fetchServerRealtimeGroups(role) {
  if (getDataSource() !== 'api') return { status: 'unavailable', groups: [] };
  const me = AuthStore.getCurrentUser && AuthStore.getCurrentUser();
  const personId = me && (me.personId || me.id);
  if (!personId) return { status: 'unavailable', groups: [] };
  let adapter = null;
  try { adapter = getAdapter(); } catch (_) { return { status: 'unavailable', groups: [] }; }
  const api = adapter && adapter.todoGroups;
  if (!api || typeof api.get !== 'function') return { status: 'unavailable', groups: [] };
  try {
    const payload = await api.get({ role, personId });
    const groups = payload && Array.isArray(payload.groups) ? payload.groups : [];
    return { status: 'ok', groups: groups.filter((g) => g && g.groupKey) };
  } catch (e) {
    if (!_serverRealtimeGroupsWarned) {
      _serverRealtimeGroupsWarned = true;
      console.warn('[todo-tab] 服务端实时组读取失败，已回落客户端派生：', (e && e.message) || e);
    }
    return { status: 'failed', groups: [] };
  }
}

/**
 * 服务端组的**展示派生**：7 类实时组在客户端原本 `hideActionBtn`（无行尾直接动作，
 *   动作承载于详情 / 批量块）——服务端载荷只带业务字段，这里按同口径补回。
 * 不碰 groupKey / count / items / domain（业务事实一律以服务端为准）。
 * @param {Object} group 服务端组
 * @returns {Object}
 */
function _decorateServerGroup(group) {
  if (!group || typeof group !== 'object') return group;
  const key = group.actionKey || String(group.groupKey || '').split(':').pop();
  return DERIVE_GROUP_DOMAIN[key] ? { ...group, hideActionBtn: true } : group;
}

/** 同 groupKey 只留首条（服务端在前 ⇒ 服务端优先），防同组双卡 / 重复计数 */
function _dedupeByGroupKey(groups) {
  const seen = new Set();
  const out = [];
  for (const g of groups || []) {
    if (!g || typeof g !== 'object') continue;
    if (g.groupKey) {
      if (seen.has(g.groupKey)) continue;
      seen.add(g.groupKey);
    }
    out.push(g);
  }
  return out;
}

/**
 * 实时组收集（Task 9：**服务端默认 + 客户端仅失败兜底**）。
 *  ① 服务端成功（含空组）：业务组只取服务端；客户端只补「服务端不产出」的展示用组
 *     （如归档缺口 / 复盘缺口 / 各台确认队列 / 作废待确认），并以 `skipActionKeys` 声明
 *     **不必再派生服务端已接管的键**（默认路径不调用 7 类业务 builder）。
 *  ② mock 数据源 / 服务端读取失败：客户端派生兜底——只用**同一份已拉取业务数据**
 *     （mockDB / 适配器缓存），不新造业务事实；失败时回 `error` 供页面显示可见提示（不得静默空页）。
 * @param {Object} opts
 * @param {string} opts.role
 * @param {Object} [opts.ctx] 渲染上下文
 * @param {(ctx:Object, opts:Object)=>Array} [opts.buildRealtimeGroups] 各台客户端派生（兜底 + 非接管组）
 * @param {(ctx:Object, groups:Array)=>Array} [opts.decorateServerGroups] 各台展示补充（bulkHtml / detailAction 等）
 * @param {(role:string)=>Promise<{status:string, groups:Array}>} [opts.fetchServerGroups] 测试注入用
 * @param {(role:string)=>Array} [opts.moduleCycleGroups] 测试注入用（缺省＝本壳模块周期提醒）
 * @returns {Promise<{groups:Array<Object>, source:'server'|'client', error:string|null}>}
 */
export async function collectRealtimeGroups({
  role,
  ctx,
  buildRealtimeGroups,
  decorateServerGroups,
  fetchServerGroups = _fetchServerRealtimeGroups,
  moduleCycleGroups = _moduleCycleGroupsFor,
} = {}) {
  const server = await fetchServerGroups(role);
  if (server.status === 'ok') {
    const decorated = (server.groups || []).map(_decorateServerGroup);
    const withDisplay = typeof decorateServerGroups === 'function'
      ? (decorateServerGroups(ctx, decorated) || decorated)
      : decorated;
    // 客户端只补服务端不产出的组（展示用）；服务端已接管的键一律不并入
    const clientGroups = buildRealtimeGroups
      ? (buildRealtimeGroups(ctx, { skipActionKeys: SERVER_OWNED_ACTION_KEYS }) || [])
      : [];
    const supplements = clientGroups.filter((g) => g && !SERVER_OWNED_ACTION_KEYS.has(g.actionKey));
    return { groups: _dedupeByGroupKey([...withDisplay, ...supplements]), source: 'server', error: null };
  }
  // 兜底：客户端派生（原路径不删；Task 10 才登记删除）
  const clientGroups = buildRealtimeGroups ? (buildRealtimeGroups(ctx) || []) : [];
  const cycle = typeof moduleCycleGroups === 'function' ? (moduleCycleGroups(role) || []) : [];
  return {
    groups: _dedupeByGroupKey([...clientGroups, ...cycle]),
    source: 'client',
    error: server.status === 'failed' ? '待办实时信息暂时加载失败' : null,
  };
}


function _isTodoDesktopLayout() {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia(TODO_DESKTOP_QUERY).matches;
  } catch (_) {
    return true;
  }
}

/** 把域视图展平为待办组（业务域标签随组带出，供行内 12px 次级标签使用） */
function _flattenDomainGroups(domains) {
  const groups = [];
  for (const d of domains || []) {
    for (const g of d.groups || []) {
      groups.push({ ...g, domain: g.domain || d.domain, domainLabel: g.domainLabel || d.label });
    }
  }
  return groups;
}

/**
 * 通知深链 highlight 读取（F03/F07 · 2026-10-20 IA 修复）。
 * 工作台壳在首个渲染前已把 `?highlight=` 读进 `ctx.navTarget` 并清掉 URL 参数 ——
 * tab 内再读 `location.search` 恒为空。故优先 `ctx.navTarget.hl`，URL 仅作未经壳时的兜底。
 */
function _resolveNavHighlightId(ctx) {
  let fromUrl = '';
  try { fromUrl = new URLSearchParams(window.location.search).get('highlight') || ''; } catch (_) { /* 非浏览器环境忽略 */ }
  return fromUrl || ctx?.navTarget?.hl || '';
}

/**
 * 深链定位执行（F03/F07）：按 groupKey / 成员变更申请 id 找 DOM 锚点。
 * 命中 → 滚动 + 闪烁；未命中 → 页内可见提示（不得静默落默认列表）。
 * @param {HTMLElement} container 待办容器
 * @param {string} id 深链 highlight 值
 * @param {Object|null} matchedGroup 数据侧匹配到的聚合组（用于更准确的失败文案）
 */
function _applyNavHighlight(container, id, matchedGroup) {
  const selectors = [
    `[data-group-key="${id}"]`,
    `[data-mc-request-id="${id}"]`,
    `[data-mc-card="${id}"]`,
    `[data-id="${id}"]`,
  ];
  let target = null;
  for (const sel of selectors) {
    try { target = container.querySelector(sel); } catch (_) { target = null; }
    if (target) break;
  }
  if (target) {
    const row = target.closest('[data-group-key]') || target;
    smoothScroll(row, { block: 'center' });
    flashHighlight(target);
    return;
  }
  const hint = document.createElement('div');
  hint.dataset.navHighlightMissing = '1';
  hint.setAttribute('role', 'status');
  hint.className = 'card rounded-xl p-3 mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200';
  hint.textContent = matchedGroup
    ? `已定位到「${matchedGroup.title}」，但该条明细已处理或已移出列表。`
    : '未找到该待办（可能已处理）。';
  container.prepend(hint);
}

/**
 * 顶部摘要（逾期 / 今日 / 本周 ＋ 待处理合计）——数字组单一语法（2026-10-29 P2）：
 * 图标块在左 ＋ 数值/标签在右两行，四列栅格（≤1024 两列）。
 * 数值由 buildUrgencySections 与列表共用同一批分组数据算出，不另立口径。
 * 只读卡：不挂 role=button / tabindex / card--interactive；
 * **仅逾期件数 > 0 时**加 `stat-card__value--warning`，0 件时保持中性
 * （颜色只表状态，不得恒加警示类）。
 *
 * 2026-11-04 Task 3.6：前三格是**互斥桶**（逾期 / 今日 / 本周），第四格是**合计**——
 *   合计格不挂图标、并在标签下写明关系「＝逾期＋今日＋本周＋以后 N」，不再与三个桶同形并排。
 */
function _urgencySummaryHtml(summary) {
  const item = (iconName, tint, label, value, tone) => `
    <div class="card rounded-xl p-4 stat-card">
      <span class="stat-icon-tint" style="--tint:${tint};" aria-hidden="true">${icon(iconName, { strokeWidth: 1.8, className: 'w-5 h-5' })}</span>
      <div class="stat-card__body">
        <p class="stat-card__value${tone ? ` stat-card__value--${tone}` : ''}">${value || 0}</p>
        <p class="stat-card__label">${label}</p>
      </div>
    </div>`;
  const overdueTone = (Number(summary.overdue) || 0) > 0 ? 'warning' : '';
  const overdue = Number(summary.overdue) || 0;
  const today = Number(summary.today) || 0;
  const week = Number(summary.week) || 0;
  const pending = Number(summary.pending) || 0;
  const later = Math.max(0, pending - overdue - today - week);
  return `
    <div class="stat-grid mb-4" role="group" aria-label="待办摘要">
      ${item('warning', 'var(--status-warning-text)', '逾期', overdue, overdueTone)}
      ${item('clock', 'var(--status-info)', '今日', today, '')}
      ${item('calendar', 'var(--app-accent-soft-text)', '本周', week, '')}
      <div class="card rounded-xl p-4 stat-card" title="合计＝逾期＋今日＋本周＋以后 ${later}">
        <div class="stat-card__body">
          <p class="stat-card__value">${pending}</p>
          <p class="stat-card__label">待处理</p>
        </div>
      </div>
    </div>`;
}

/**
 * 创建待办 tab 壳实例
 * @param {Object} opts
 * @param {string} opts.containerId         工作台内容容器 id（如 'org-tab-content'）
 * @param {string} opts.prefix              事件/选择器前缀（如 'org'）
 * @param {string} opts.role                待办角色键（getByRole/getUnreadNotices 用）
 * @param {(todo:Object, ctx:Object)=>void} opts.onAction  角色特有动作处理（必填）
 * @param {(ctx:Object, opts:Object)=>Array} [opts.buildRealtimeGroups] 各台自定义「不落库」实时聚合组
 *        （支书 SecretaryTodoDeriver 组/决议逾期/成员变更/纪检队列等；壳统一
 *        mergeRealtimeDomains 并入对应业务域；缺省=[] 纯持久化域视图）
 *        ——2026-09-08 裁决批一（D1/D3）：实时组可携带 bulkHtml（组行批量块，见 todo-list.js
 *        组行渲染扩展；勾选批量与详情逐项并行）与 hideActionBtn（批量组无行尾单键）；
 *        写口均须 bumpToken 对应域（memberChangeRequests/memberConfirmation 等）使
 *        _comboKeyOf 复合键变化 → 批量块内容随重建刷新。
 *        ——2026-11-04 Task 9：服务端成功时第二个入参 `{ skipActionKeys }`（服务端已接管的键集合）
 *        ⇒ 各台**不再派生这些键**，只返回服务端不产出的展示组；mock / 失败兜底时不传该参数。
 * @param {(ctx:Object, groups:Array)=>Array} [opts.decorateServerGroups] 服务端组的**展示补充**
 *        （如成员变更组的 bulkHtml、考察组的 detailAction；不得改 groupKey / count / items）
 * @param {(todo:Object, ctx:Object)=>string} [opts.renderDetail] 自定义详情渲染
 *        （支书按 kind/groupKey 分发；缺省=壳内置概要，主行动只留在行尾，详情不重复）
 * @param {async (ctx:Object)=>void} [opts.onBeforeRender] 渲染前钩子（seedTodos/异步预载；await）
 * @param {async (container:Element, ctx:Object, api:Object)=>void} [opts.onAfterRender] 渲染后钩子
 *        （异步面板挂载，如支书成员变更确认面板；api={renderContent,clearSelection,selectedTodo}）
 * @param {string|(ctx:Object)=>string} [opts.extraTopHtml] 折叠条展开后的额外区块 HTML（数据交接/收件箱/专班区等）
 * @param {number|(ctx:Object)=>number} [opts.extraTopCount] 折叠条摘要计数（缺省 0；与未读通知数相加）
 * @param {(container:Element, ctx:Object, api:Object)=>void} [opts.bindExtras] 额外绑定
 *        （handoff/成员变更/详情自定义按钮等；api 见 onAfterRender）
 * @param {string} [opts.emptyHint]         空态提示文案（缺省=通用）
 * @param {string} [opts.detailTitle]       右侧详情卡标题（缺省='详情'）
 * @param {string} [opts.detailBtnClass]    内置详情按钮 class（缺省=prefix-todo-detail-action）
 * @param {string} [opts.detailBtnStyle]    内置详情按钮内联强调样式（缺省不注入；按钮走 .btn-accent-soft .btn-sm）
 * @param {null|(todo:Object, ctx:Object)=>void} [opts.onDeleteTodo] null=不渲染删除键（支书等实时组台）；
 *        函数=自定义；缺省=**仅支委层**内置硬删（`#1`/`D-742`：硬删只留支委层；非支委层不再渲染硬删）
 * @param {null|(todo:Object, ctx:Object)=>void} [opts.onVoidTodo] 作废入口（`#1`/`D-742`）；
 *        null=不渲染；函数=自定义；缺省=内置「作废」流程——**支委层**直接生效（`confirmVoid`），
 *        **其余**填原因后走**审批门**（`requestVoid` → 报支委会确认）。仅落库待办组渲染本键。
 * @param {(group:Object)=>({state:'available'|'urged',label:string,title?:string}|null)} [opts.urgeStateOf]
 *        逐条「催办」入口状态（2026-09-10 支书/副支书待办页；opt-in，缺省不渲染）；
 *        null=该条无催办入口（无责任人或责任人即本人）
 * @param {(group:Object, ctx:Object)=>void} [opts.onUrgeTodo] 催办按钮回调（需与 urgeStateOf 同传）
 */
/**
 * 「我经办的反馈」区骨架（2026-10-25 IA 62→45）：仅五台有（支书台用「反馈管理」承载反馈）。
 * 标题是兄弟节点（不进 `<summary>`/按钮），区内容由 `issue-dispatch-view.js` 渲染。
 */
function _dispatchSectionHtml(role) {
  if (!DISPATCH_SECTION_BY_ROLE[role]) return '';
  return `<div class="card rounded-xl p-5 mt-4 card--static" id="ws-dispatch-section"
    data-todo-dispatch="1">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">我经办的反馈</h3>
    </div>
    <p class="text-xs text-gray-500 mb-3">支部派发的汇报与反馈在此处理；处理结果可回看。</p>
    <div id="ws-dispatch-host"></div>
  </div>`;
}

/** 挂载「我经办的反馈」区（实现单一源＝issue-dispatch-view；embedded 不重复页头） */
function _mountDispatchSection(container, role, ctx) {
  const cfg = DISPATCH_SECTION_BY_ROLE[role];
  const host = container?.querySelector('#ws-dispatch-host');
  if (!cfg || !host) return;
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) {
    host.innerHTML = emptyStateHtml({ variant: 'panel', text: '请先登录后使用', actionHtml: `<a class="btn-outline" href="${getBasePath()}login.html">去登录</a>` });
    return;
  }
  import('../feedback/issue-dispatch-view.js?v=20261109a').then((m) => {
    if (!host.isConnected) return;
    host.innerHTML = m.renderMyDispatchTab(cfg.roleKey, uid, { ...cfg.opts, embedded: true });
    m.bindMyDispatchEvents(host, cfg.roleKey, uid, cfg.opts);
  });
  // 深链 `?filter=dispatch`（旧 `?tab=my-dispatch`）：滚到本区并闪烁。
  let filter = ctx?.navTarget?.filter || '';
  if (!filter) {
    try { filter = new URLSearchParams(window.location.search).get('filter') || ''; } catch (_) { /* 非浏览器环境 */ }
  }
  if (filter === 'dispatch') {
    smoothScroll(container.querySelector('#ws-dispatch-section'), { block: 'start' });
    flashHighlight(container.querySelector('#ws-dispatch-section'));
  }
}

export function createTodoTab(opts) {
  const {
    containerId,
    prefix,
    role,
    onAction,
    buildRealtimeGroups,
    decorateServerGroups,
    renderDetail,
    onBeforeRender,
    onAfterRender,
    extraTopHtml = '',
    extraTopCount = 0,
    bindExtras,
    urgeStateOf,
    onUrgeTodo,
    emptyHint = '暂无待办',
    detailTitle = '详情',
    detailBtnClass = `${prefix}-todo-detail-action`,
    detailBtnStyle,
    onDeleteTodo,
    onVoidTodo,
    pageTitle = '待办',
  } = opts;

  // 是否支委层（支书 / 副支书 / 组织 / 宣传 / 纪检）——决定「作废」是直接生效还是走审批门，
  // 以及是否保留硬删（`#1`/`D-742`）。集合单一源 = constants.js::BRANCH_COMMISSION_ROLES。
  const isCommittee = BRANCH_COMMISSION_ROLES.includes(role);

  // 私有状态（随壳实例自持，不污染入口——与原模块级私有状态等价）
  let _selectedTodoId = null;
  // P0 组合点记忆化（每实例自持：复合键未变 → 复用上次组合数据对象；只读契约，见 _comboKeyOf 注释）
  let _lastComboKey = null;
  let _lastCombo = null; // { domains, allGroups, unreadNotices, realtimeError }
  let _stripOpen = true; // 页顶折叠条展开态（默认展开；重渲染后保留用户折叠）
  let _navHighlightDone = false; // 深链 highlight 一次性消费（重渲染不再重复定位/提示）
  let _retrySeq = 0; // 服务端派生组读取失败后的「重试」次数（入复合键 ⇒ 绕过缓存重新取数）

  /** U3（2026-09-07）待办两栏等高骨架（await onBeforeRender/数据聚合期间占位；styles.css 禁改不碰）
   *  阶段一 Task 1：源码顺序＝列表 → 详情，窄屏骨架同样先列表（不再 order-first 把详情提到首屏）。 */
  function _todoShellSkeletonHtml() {
    const row = '<div class="h-9 rounded-lg bg-gray-100 animate-pulse"></div>';
    return `
      <div data-ws-todo-skeleton class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 card rounded-xl p-5" style="min-height:340px;">
          <div class="h-4 w-20 rounded bg-gray-100 animate-pulse mb-4"></div>
          <div class="space-y-2">${row}${row}${row}${row}${row}</div>
        </div>
        <div class="lg:col-span-1 card rounded-xl p-5" style="min-height:220px;">
          <div class="h-4 w-12 rounded bg-gray-100 animate-pulse mb-4"></div>
          <div class="h-24 rounded-lg bg-gray-100 animate-pulse"></div>
        </div>
      </div>`;
  }

  /**
   * 详情渲染（内置缺省：聚合组 = 概要 + 处理入口；单项 = 状态 + 描述 + 处理）。
   * 角色自定义详情经 opts.renderDetail 覆盖（如支书 confirm/remind/成员变更确认逐项面板）。
   */
  function _renderTodoDetail(todo, ctx) {
    // 2026-10-19 Task 5：右栏主行动改用紧凑档（四类按钮 + 两档尺寸）；
    // 角色自定义强调样式（如成员端金色）仍经 detailBtnStyle 内联生效，不再默认注入实底样式。
    const btnStyleAttr = detailBtnStyle ? ` style="${detailBtnStyle}"` : '';
    if (todo.groupKey) {
      // 组详情只渲染**区别于行尾主行动**的下一步（2026-10-18 繁专项 Task 14；2026-10-27 Task 5）：
      //   · group.detailAction → 渲染真实落点（如「去录入考察」跳人才库并展开考察位）；
      //   · 无 detailAction → **不渲染按钮**——行尾已有唯一主行动，详情再放「去处理」是同义并排。
      const action = todo.detailAction;
      const actionLabel = action && action.label ? action.label : '';
      const actionBtn = actionLabel
        ? `<button type="button" class="btn-accent-soft btn-sm ${detailBtnClass}"${btnStyleAttr} aria-label="${escHtml(actionLabel)}：${escHtml(todo.title || '')}">${escHtml(actionLabel)}</button>`
        : '';
      return `
        <div class="space-y-3">
          ${todo.priority === 'urgent' ? `<div class="flex items-center gap-2">${badgeHtml('紧急', 'warning')}</div>` : ''}
          <p class="font-title-cn text-base font-semibold text-gray-800">${todo.title}</p>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <dt class="text-gray-500">条数</dt>
              <dd class="text-gray-700 tabular-nums">${todo.count} 条</dd>
            </div>
            ${todo.deadline ? `<div>
              <dt class="text-gray-500">最早截止</dt>
              <dd class="text-gray-700 tabular-nums">${todo.deadline}</dd>
            </div>` : ''}
          </dl>
          ${todo.flow ? `<p class="text-body-sm text-gray-600">${todo.flow}</p>` : ''}
          ${actionBtn ? `<div class="pt-3 border-t border-gray-100 flex gap-2">${actionBtn}</div>` : ''}
        </div>
      `;
    }

    const statusLabel = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      expired: '已过期',
    }[todo.status] || todo.status;

    const statusVariant = {
      pending: 'neutral',
      in_progress: 'info',
      completed: 'success',
      expired: 'warning',
    }[todo.status] || 'neutral';

    return `
      <div class="space-y-3">
        <div>
          ${todo.priority === 'urgent' ? `<div class="flex items-center gap-2 mb-2">${badgeHtml('紧急', 'warning')}</div>` : ''}
          <p class="font-title-cn text-base font-semibold text-gray-800">${todo.title}</p>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <dt class="text-gray-500">状态</dt>
            <dd>${badgeHtml(statusLabel, statusVariant)}</dd>
          </div>
          ${todo.deadline ? `<div>
            <dt class="text-gray-500">截止</dt>
            <dd class="text-gray-700 tabular-nums">${todo.deadline}</dd>
          </div>` : ''}
          <div class="col-span-2">
            <dt class="text-gray-500">创建</dt>
            <dd class="text-gray-700 tabular-nums">${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</dd>
          </div>
        </dl>
        ${todo.description ? `<p class="text-body-sm text-gray-600">${todo.description}</p>` : ''}
        <div class="pt-3 border-t border-gray-100 flex gap-2">
          ${todo.actionType ? `<button type="button" class="btn-accent-soft btn-sm ${detailBtnClass}">处理</button>` : ''}
        </div>
      </div>
    `;
  }

  /** 未读通知行（2026-10-19 Task 5 / Task 3：作为页顶折叠条的二级折叠，默认收起）。
   *  与首页通知列表共用 `.notice-row` 视觉语言；每行一个主行动「阅读」，阅读详情即已读。 */
  function _unreadRowsHtml(notices) {
    const rows = notices.map(n => {
      const timeText = n.deadline
        ? `截止 ${n.deadline}`
        : (n.expireDate ? `截止 ${n.expireDate}` : (n.publishDate || String(n.createdAt || '').slice(0, 16).replace('T', ' ')));
      const priorityBadge = n.priority === 'urgent'
        ? badgeHtml('紧急', 'gold')
        : (n.priority === 'normal' ? badgeHtml('重要', 'info') : '');
      return `
        <div class="notice-row">
          ${priorityBadge}
          <span class="notice-row__main">
            <span class="notice-row__title block">${n.title || '未命名通知'}</span>
            <span class="notice-row__meta block">${timeText}</span>
          </span>
          <div class="notice-row__actions">
            <button type="button" class="btn-accent-soft btn-sm ${prefix}-unread-open-btn" data-notice-id="${n.id}">阅读</button>
          </div>
        </div>`;
    }).join('');
    return `
      <details class="todo-strip__section todo-strip__section--unread mt-1">
        <summary class="cursor-pointer select-none py-2">
          <span class="text-xs font-medium text-gray-500">未读通知 <span class="tabular-nums">${notices.length}</span></span>
        </summary>
        <div class="divide-y divide-gray-100">${rows}</div>
      </details>`;
  }

  /** 页顶折叠条：默认展开——首屏直接露出前 2 条待答复；未读通知在条内做二级折叠。
   *  主对象「我的待办」紧随其后，不被全部未读撑高。
   *  Task 3（2026-10-25）：分区标题移出 `summary`（标题不得进入交互元素），
   *  summary 只用 `aria-labelledby` 关联兄弟 H3；折叠态仍在 `open` 属性上。 */
  function _todoStripHtml(extraHtml, unreadHtml, count) {
    if (!extraHtml && !unreadHtml) return '';
    return `
      <div class="disclosure-host card rounded-xl mb-4 card--static">
        <!-- 2026-10-31 支书补充（折叠头）：标题与计数同基线；标题行走 .disclosure__title
             （min-height 44），summary 空内容覆盖整行 ⇒ 整行任意位置可点，展开 / 收起看右侧 chevron。
             2026-11-01（折叠头单一语法）：标题字号/字重/字族由 .disclosure__title 统一给出
             （16/600/24 ＋ 标题字族），调用点只留内边距，不再用 font-title-cn / text-sm 覆盖；
             计数是附注（14px 常规字重）。 -->
        <h3 class="disclosure__title text-base px-4" id="todo-strip-title">
          待答复与未读通知
          ${count > 0 ? `<span class="text-sm font-normal text-gray-500 tabular-nums">${count}</span>` : ''}
        </h3>
        <details class="todo-strip" id="todo-strip"${_stripOpen ? ' open' : ''}>
          <summary class="disclosure__summary" id="todo-strip-toggle" aria-labelledby="todo-strip-title"></summary>
          <div class="px-4 pb-3">
            ${extraHtml}
            ${unreadHtml}
          </div>
        </details>
      </div>`;
  }

  /** 窄屏选中待办后把详情卡滚入视野（详情卡渲染在列表之后，选中才出现） */
  function _scrollDetailIntoView() {
    smoothScroll(document.getElementById(containerId)?.querySelector('[data-ws-todo-detail]'), { block: 'start' });
  }

  /**
   * 选行后的焦点归还（2026-11-04 批次 534）：整行重建会把焦点扔回 BODY，键盘用户丢失位置。
   * 重渲染后把焦点还给新选中行（`preventScroll` —— 宽屏不因聚焦而跳动）；
   * 宽屏不再把右栏详情滚入视野，窄屏详情在列表下方且选中才出现 ⇒ 仍滚一次。
   * @param {string} groupKey 本次选中的组键
   */
  function _settleSelection(groupKey) {
    const container = document.getElementById(containerId);
    if (container && groupKey) {
      let row = null;
      try {
        row = container.querySelector(`.${prefix}-todo-item[data-group-key="${String(groupKey).replace(/["\\]/g, '\\$&')}"]`);
      } catch (_) { row = null; }
      if (row && typeof row.focus === 'function') row.focus({ preventScroll: true });
    }
    if (!_isTodoDesktopLayout()) _scrollDetailIntoView();
  }

  async function renderContent(ctx) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // U3（2026-09-07）：onBeforeRender（seedTodos/异步预载）挂起期间若容器仍为壳骨架/空 →
    // 先换为待办两栏等高骨架（防 await 期 0 高与整块弹出）；已有真实内容（重渲染）保留由 tab-bar 置灰过渡
    // P2（2026-09-07）：此处分支会整体替换内容为骨架（非上次真实产物）→ 清 memoKey，
    //   渲染守卫随之落入重建路径（不会对骨架误命中跳过、留下无内容骨架）
    if (!container.innerHTML.trim() || container.querySelector('[data-ws-tab-loading-bar]')) {
      container.innerHTML = _todoShellSkeletonHtml();
      delete container.dataset.memoKey;
    }

    // 渲染前钩子（支书：seedTodos + 异步预载待答复汇报等）
    if (onBeforeRender) await onBeforeRender(ctx);

    // 刷新过期状态（P0 渲染链去重后唯一入口：各 todo-tab 的 onBeforeRender 不再重复调用；
    // 有实际变更 → TodoStore 写版本 +1 → 聚合缓存/组合键随之失效重算）
    TodoStore.refreshExpiredStatus();

    // P0 组合点记忆化：域视图数据（realtimeGroups 并入 + 未读通知）复合键未变 → 直接复用
    const comboKey = _comboKeyOf(role, _retrySeq);
    let combo;
    if (comboKey === _lastComboKey && _lastCombo) {
      combo = _lastCombo;
    } else {
      // 批次 534（Task 9）：实时组**默认来源＝服务端**（api 形态）；客户端只补服务端不产出的展示组。
      //   mock 形态 / 服务端读取失败 ⇒ 客户端派生兜底（同一份已拉取业务数据，不新造事实），
      //   失败时回 `error`，由列表卡顶部给可见提示与「重试」（见 collectRealtimeGroups）。
      const rt = await collectRealtimeGroups({
        role, ctx, buildRealtimeGroups, decorateServerGroups, moduleCycleGroups: _moduleCycleGroupsFor,
      });
      // 「到人」定向（批次 428 · `R-29⑤` 余项收口）：把「本人 personId」传进读链 ⇒ `personId` 非空的待办只给本人看
      const meNow = AuthStore.getCurrentUser && AuthStore.getCurrentUser();
      const domains = TodoStore.mergeRealtimeDomains(role, rt.groups, { personId: meNow && (meNow.personId || meNow.id) });
      // 全部组（选中态查找；含持久化聚合组与并入的实时组）
      const allGroups = [];
      for (const d of domains) {
        if (Array.isArray(d.groups)) allGroups.push(...d.groups);
      }
      const unreadNotices = NoticeStore.list({ activeOnly: true }).filter(n => !n.read);
      combo = { domains, allGroups, unreadNotices, realtimeError: rt.error };
      _lastComboKey = comboKey;
      _lastCombo = combo;
    }
    const { domains, allGroups, unreadNotices, realtimeError } = combo;

    // F03/F07：通知深链 ?highlight=<groupKey|条目 id> —— 壳已清 URL，只能从 ctx.navTarget.hl 读。
    // 先按数据侧命中（groupKey 或组内条目 id），把目标组置于选中态；DOM 命中在重建后执行。
    const navHlId = _navHighlightDone ? '' : _resolveNavHighlightId(ctx);
    let navMatchedGroup = null;
    if (navHlId) {
      navMatchedGroup = allGroups.find(g => g.groupKey === navHlId)
        || allGroups.find(g => Array.isArray(g.items) && g.items.some(it => it && (it.id === navHlId || it.groupKey === navHlId)))
        // 批量块（成员变更等）的行 id 只存在于 bulkHtml 字符串里，也据此选中其所属组
        || allGroups.find(g => typeof g.bulkHtml === 'string' && g.bulkHtml.includes(navHlId))
        || null;
      if (navMatchedGroup) _selectedTodoId = navMatchedGroup.groupKey;
    }

    // 四档分组单一源：域视图展平 → buildUrgencySections；摘要与列表共用此结果
    const urgencyGroups = _flattenDomainGroups(domains);
    const urgency = buildUrgencySections(urgencyGroups);

    // 自动选中首条（支书 2026-08-10 裁定推广）：桌面双栏下进入待办即见首屏第一条，减一次点击。
    // 阶段一 Task 1（spec「移动端待办列表优先」）：<lg 不自动选中——390 首屏先列表，
    //   用户点选后才在列表下方渲染详情。
    const isDesktopLayout = _isTodoDesktopLayout();
    const firstVisible = urgency.sections.find(s => s.groups.length > 0)?.groups[0];
    if (!_selectedTodoId && firstVisible && isDesktopLayout) {
      _selectedTodoId = firstVisible.groupKey;
    }
    const selectedTodo = _selectedTodoId
      ? (allGroups.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId) || null)
      : null;

    // ── P2 渲染守卫（2026-09-07 · spec §四.1/§四.2）─────────────────
    // 数据与视图参数未变 → 跳过整卡 HTML 拼装 / DOM 重建 / 事件绑定 / 异步面板重跑，
    // 现 DOM 原样保留（域折组折叠/组行选中/面板内交互状态不丢，旧事件绑定仍在）。
    // key = P0 组合复合键 comboKey（各域 token+length 指纹 + todo/member + 日期 + role）
    //   + 本卡自持交互状态（选中项 _selectedTodoId：换行选中须走重建）
    //   + issue 版本（支书 extraTopHtml「待答复收件箱/汇报时间线」依赖 IssueStore，
    //     其写口 bumpToken('issue') 见 services/governance/issues.js——保证 extraTopHtml 内容随键覆盖；
    //     命中跳过时 bindExtras/onAfterRender/extraTopHtml 不再重跑，内容仍正确）。
    const renderKey = `${comboKey}|sel=${_selectedTodoId || ''}|issue=${tokenOf('issue')}`;

    // 折叠条摘要计数（待答复等额外区块 + 未读通知）；额外区块数量由角色注入，缺省只看未读
    const extraCount = typeof extraTopCount === 'function' ? extraTopCount(ctx) : extraTopCount;
    const stripCount = (Number(extraCount) || 0) + unreadNotices.length;

    const api = {
      renderContent: () => renderContent(ctx),
      clearSelection: () => { _selectedTodoId = null; },
      selectedTodo,
    };

    /** 整卡重建（仅守卫未命中时执行；产物含 data-ws-memo="todo-shell" 标记防跨 tab 误命中） */
    const rebuild = () => {
      // 删除处理：`#1`/`D-742` 起——**硬删只留支委层**；opts.onDeleteTodo=null → 禁删；函数 → 自定义；
      // 缺省 → 支委层内置确认硬删，**非支委层不再渲染硬删**（改走下面的「作废」审批门）
      let deleteHandler = null;
      if (onDeleteTodo === null) {
        deleteHandler = null;
      } else if (typeof onDeleteTodo === 'function') {
        deleteHandler = (todo) => onDeleteTodo(todo, ctx);
      } else if (isCommittee) {
        deleteHandler = async (todo) => {
          const items = todo.items && todo.items.length ? todo.items : [todo];
          const label = items.length === 1 ? items[0].title : `${items[0].title} 等 ${items.length} 条`;
          if (!await confirmDanger({ id: 'todo-delete', title: `删除待办「${label}」`, bodyHtml: `<p class="text-sm text-gray-700">删除${items.length === 1 ? '这条待办' : `这 ${items.length} 条待办`}。<br>影响：相关人员的待办清单各少一条，源头的活动 / 通知不变。<br><b>不可恢复</b>。</p>`, confirmLabel: '删除' })) return;
          items.forEach(t => TodoStore.delete(t.id));
          showToast('success', '待办已删除');
          renderContent(ctx);
        };
      }

      // 作废处理（`#1`/`D-742`）：缺省＝支委层直接生效（confirmVoid）／其余走审批门（requestVoid）
      let voidHandler = null;
      if (onVoidTodo === null) {
        voidHandler = null;
      } else if (typeof onVoidTodo === 'function') {
        voidHandler = (todo) => onVoidTodo(todo, ctx);
      } else {
        voidHandler = (todo) => _openVoidModal(todo, { isCommittee, onDone: () => renderContent(ctx) });
      }

      const { html: listHtml, bindEvents } = renderUrgencyTodoList({
        prefix,
        sections: urgency.sections,
        selectedTodoId: _selectedTodoId,
        onSelectTodo: (todo) => {
          _selectedTodoId = todo.groupKey || todo.id;
          const selectedKey = _selectedTodoId;
          renderContent(ctx).then(() => _settleSelection(selectedKey));
        },
        onActionTodo: (todo) => {
          onAction(todo, ctx);
        },
        onDeleteTodo: deleteHandler,
        onVoidTodo: voidHandler,
        urgeStateOf,
        onUrgeTodo: typeof onUrgeTodo === 'function' ? (g) => onUrgeTodo(g, ctx) : null,
        emptyHint,
      });

      // 页顶折叠条：待答复收件箱（默认露 2 条）+ 未读通知二级折叠（数据来自 P0 组合点记忆化结果）
      const extraHtml = typeof extraTopHtml === 'function' ? extraTopHtml(ctx) : extraTopHtml;
      const unreadHtml = unreadNotices.length > 0 ? _unreadRowsHtml(unreadNotices) : '';
      const stripHtml = _todoStripHtml(extraHtml, unreadHtml, stripCount);

      const detailHtml = selectedTodo
        ? (renderDetail ? renderDetail(selectedTodo, ctx) : _renderTodoDetail(selectedTodo, ctx))
        : `
          <div class="text-center py-12 text-gray-500">
            <p class="text-sm">选择一条待办查看详情</p>
          </div>
        `;

      // 首屏顺序（todo-urgency ⑧ / ui-first-screen-order F4）：页头与页顶折叠条先于「我的待办」。
      const headerAndStripHtml = `${renderTabHeader({ title: pageTitle })}
        ${stripHtml}`;

      // 服务端派生组读取失败的可见提示（Task 9）：不得静默空页、不得写成成功；
      // 「重试」按 _retrySeq 入复合键 ⇒ 绕过组合缓存与渲染守卫重新取数。
      const hasAnyGroup = urgency.sections.some(s => s.groups.length > 0);
      const realtimeNoticeHtml = realtimeError
        ? `<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3 flex items-center justify-between gap-3" role="status" data-ws-todo-realtime-notice>
            <span class="text-xs text-amber-800">${escHtml(realtimeError)}${hasAnyGroup ? '，已按本地数据展示' : '，请重试'}</span>
            <button type="button" class="btn-outline btn-sm" data-ws-todo-retry>重试</button>
          </div>`
        : '';

      const listCardHtml = `
        <div class="card rounded-xl p-5 card--static">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-title-cn text-base font-semibold text-gray-800">我的待办</h3>
          </div>
          ${realtimeNoticeHtml}
          ${_urgencySummaryHtml(urgency.summary)}
          ${listHtml}
        </div>`;

      const detailCardHtml = `
        <div class="card rounded-xl p-5 lg:sticky lg:top-20 card--static" data-ws-todo-detail aria-live="polite">
          <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">${detailTitle}</h3>
          ${detailHtml}
        </div>`;

      // 详情列渲染条件（阶段一 Task 1 · 首屏单一重心）：
      //   · 窄屏只在「已选中」时渲染——未选中不出现「选择一条待办查看详情」占位，列表独占首屏；
      //   · 桌面双栏保留「列表存在但未选中」时的选择提示；列表为空则不出详情列（空态只留一处）。
      const showDetail = !!selectedTodo || (hasAnyGroup && isDesktopLayout);

      // 列顺序：源码恒为「列表 → 详情」，两种宽度都按源码顺序落位（窄屏单列 ⇒ 列表在前）。
      // `order-last` / `order-first` 是既有结构守卫（structural-round3 S1）锁定的历史类名；
      // 实际排序以 inline `order:0` 中和，避免窄屏被 order-first 拉到列表之前。
      const listColHtml = showDetail
        ? `<div class="lg:col-span-2 order-last lg:order-none" style="order:0">${listCardHtml}</div>`
        : `<div class="lg:col-span-3">${listCardHtml}</div>`;
      const detailColHtml = showDetail
        ? `<div class="lg:col-span-1 order-first lg:order-none" style="order:0">${detailCardHtml}</div>`
        : '';

      container.innerHTML = `
        ${headerAndStripHtml}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4" data-ws-memo="todo-shell">
          ${listColHtml}
          ${detailColHtml}
        </div>
        ${_dispatchSectionHtml(role)}
      `;

      // 域折组折叠 / 组行选中 / 行动按钮 / 删除
      bindEvents(container);

      // 服务端派生组读取失败后的「重试」：序号入复合键 ⇒ 下一次渲染重新取数（不猜、不静默）
      container.querySelector('[data-ws-todo-retry]')?.addEventListener('click', () => {
        _retrySeq += 1;
        renderContent(ctx);
      });

      // 页顶折叠条：记住折叠态（默认展开；数据变化重建后保留用户折叠）
      container.querySelector('.todo-strip')?.addEventListener('toggle', (e) => {
        _stripOpen = !!e.target.open;
      });

      // 未读通知行：阅读即已读（折叠由外层 <details> 统一承担，不再有第二套展开按钮）
      container.querySelectorAll(`.${prefix}-unread-open-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const notice = unreadNotices.find(x => x.id === btn.dataset.noticeId);
          if (!notice) return;
          // 直达通知详情页（T-234 F1 同款）；notice 页内已读自动销「通知阅读」待办
          const noticeId = notice.actionData?.noticeId || notice.sourceId || notice.id;
          window.location.href = resolveDocumentUrl('notice.html', { searchParams: { id: noticeId } });
        });
      });

      // 详情面板按钮事件（内置概要详情 / 支书 remind·seed 详情共用 detailBtnClass）
      container.querySelector(`.${detailBtnClass}`)?.addEventListener('click', () => {
        if (!_selectedTodoId) return;
        const group = allGroups.find(g => g.groupKey === _selectedTodoId);
        if (group) {
          // 组提供 detailAction → 执行真实落点；否则沿用角色 onAction（与行尾同一入口）
          if (group.detailAction && typeof group.detailAction.run === 'function') {
            group.detailAction.run(group, ctx);
            return;
          }
          onAction(group, ctx);
          return;
        }
        const todo = TodoStore.getById(_selectedTodoId);
        if (todo) onAction(todo, ctx);
      });

      // 角色扩展（handoff / 成员变更面板 / 自定义详情按钮如一键确认·逐项确认/退回 等）
      bindExtras?.(container, ctx, api);

      // 「我经办的反馈」区（2026-10-25 IA 62→45）：五台统一，本页内一段；实现单一源见上。
      _mountDispatchSection(container, role, ctx);
    };

    // 命中（返回 false）→ 整卡保留、异步面板不再重跑（其内容随 renderKey 未变而正确）
    if (!memoizeRender(container, renderKey, rebuild, { marker: '[data-ws-memo="todo-shell"]' })) {
      if (navHlId) { _navHighlightDone = true; _applyNavHighlight(container, navHlId, navMatchedGroup); }
      return;
    }
    if (onAfterRender) await onAfterRender(container, ctx, api);
    // F03/F07：重建后定位（失败给页内可见提示；一次性消费，换 tab/重渲染不再重复）
    if (navHlId) { _navHighlightDone = true; _applyNavHighlight(container, navHlId, navMatchedGroup); }
  }

  return { renderContent };
}

// ════════════════════════════════════════════════════════════════
//  作废流程（`#1` 支书 2026-10-02 三条答复 · `D-742`；本批 `D-743` 落地）
//  手续：**作废为主 · 硬删只留支委**；**责任人可作废但需报支委会**（取**甲 审批门**）。
//   · 支委层（`isCommittee`）：填原因 → `TodoStore.confirmVoid` **直接生效**（落 `voided`、留痕、出列）；
//   · 其余：填原因 → `TodoStore.requestVoid` **先不消失**、标 `voidPending`（挂「待支委会确认」胶囊）
//     ＋派生一条到支书台待办 → **支委确认后才 `voided`**（同族先例＝成员变更申请 → 确认）。
//  原因必填（无原因不得作废——这是与「完成」的分野）。
// ════════════════════════════════════════════════════════════════

/** 打开作废原因弹窗并执行（聚合组=逐条；单条=1 条）。 */
function _openVoidModal(group, { isCommittee, onDone } = {}) {
  const items = (group && group.items && group.items.length) ? group.items : (group ? [group] : []);
  if (!items.length) return;
  const me = AuthStore.getCurrentUser() || {};
  const label = items.length === 1 ? items[0].title : `${items[0].title} 等 ${items.length} 条`;
  const pend = items.length === 1 ? items[0].voidPending : null;
  const prefill = (pend && pend.reason) || '';
  openModal({
    id: 'todo-void-modal',
    title: isCommittee ? '作废待办' : '申请作废（报支委会）',
    accentColor: 'var(--status-error)',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-1">${isCommittee
        ? `确认作废「${escHtml(label)}」？作废＝不办了（留痕、可追溯），与「完成」不同。`
        : `申请作废「${escHtml(label)}」？须填写原因；提交后报支委会确认，确认前该待办仍在。`}</p>
      <textarea id="todo-void-reason" class="input-flat text-xs w-full mt-2" rows="3" maxlength="200" placeholder="作废原因（必填）">${escHtml(prefill)}</textarea>
      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
        <button type="button" data-todo-void-cancel class="btn-outline" style="cursor:pointer;">取消</button>
        <button type="button" data-todo-void-ok class="btn-neutral">${isCommittee ? '确认作废' : '提交申请'}</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('[data-todo-void-cancel]')?.addEventListener('click', () => closeModal('todo-void-modal'));
      panel.querySelector('[data-todo-void-ok]')?.addEventListener('click', () => {
        const reason = (panel.querySelector('#todo-void-reason')?.value || '').trim();
        if (!reason) { showToast('error', '请填写作废原因（必填）'); return; }
        closeModal('todo-void-modal');
        let ok = 0;
        for (const t of items) {
          const r = isCommittee
            ? TodoStore.confirmVoid(t.id, { byPersonId: me.personId, note: reason })
            : TodoStore.requestVoid(t.id, { reason, byPersonId: me.personId });
          if (r) ok++;
        }
        if (ok) showToast('success', isCommittee ? '已作废（已归档留痕）' : '已提交作废申请，报支委会确认');
        else showToast('error', isCommittee ? '作废失败：请填写原因' : '提交失败：原因必填');
        if (typeof onDone === 'function') onDone();
      });
    },
  });
}

// ════════════════════════════════════════════════════════════════
//  逐条催办控制器（2026-09-18 批次 88 · SOP-B-29 / D-391）
//  口径来源（**判据未改**）：`urgeRolesOf`（services/governance/todo.js 单一源）——「这件事谁来跟进」由它定；
//  本工厂只承载「**催办主位**」的呈现与发起动作——支书台与组织委员台**共用同一实现**
//  （原私有实现在 secretary/todo-tab.js，本批抽到共享壳以便组织台复用；行为逐字保持）。
//  · 责任人 = urgeRolesOf；无责任人，或责任人即本人（`selfRoles`）→ 不渲染入口
//  · 动作：按责任角色经 NoticeStore 发定向通知（复用既有通知链路，不改数据模型；通知记录即留痕）
//  · 节流：会话内同 groupKey 冷却 5 分钟（按钮呈「已催办 hh:mm」禁用态），冷却后可再次催办
// ════════════════════════════════════════════════════════════════
const URGE_COOLDOWN_MS = 5 * 60 * 1000;

/** A④：催办主文 = 〈业务域 · 待办事项〉 */
function _urgeSubject(group) {
  const label = WORK_DOMAIN_LABELS[realtimeGroupDomainOf(group)] || '';
  return label ? `${label} · ${group.title}` : group.title;
}

/** A④：截止时间文案（取条目常见时限字段；无则空串 → 显示「无明确时限」） */
function _urgeDueText(group) {
  const first = (group.items && group.items[0]) || {};
  const raw = first.dueAt || first.deadline || first.due || group.dueAt;
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 催办通知跳转目标模块（按责任域；目标角色经 `NOTICE_MODULE_ROLE_PAGES` 角色感知映射落地） */
function _urgeTargetModule(group) {
  const d = realtimeGroupDomainOf(group);
  if (d === WORK_DOMAIN.ATTENDANCE) return 'attendance';
  if (d === WORK_DOMAIN.INSPECTION || d === WORK_DOMAIN.MEMBER_DEV) return 'party';
  if (d === WORK_DOMAIN.ACTIVITY || d === WORK_DOMAIN.MEETING) return 'activity';
  return 'workspace';
}

/** 时间戳 → HH:MM */
function _hhmm(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 创建逐条催办控制器（各工作台一个实例，状态自持）
 * @param {Object} opts
 * @param {string[]} [opts.selfRoles] 本台「本人」角色键（责任人属于本集合 → 入口隐藏；缺省空集）
 * @param {()=>({activities?:Array, people?:Array})} [opts.context] 到人 / 复盘责任人解析所需（缺省空）
 * @param {(ctx:Object)=>void} [opts.onDone] 催办成功后的重渲染回调（缺省不重渲染）
 * @param {string} [opts.titleSuffix] 入口 title 后缀（如支书台标注「催办一般归组织委员 · 本条为例外」，缺省空）
 * @returns {{urgeStateOf:(group:Object)=>({state:'available'|'urged',label:string,title?:string}|null),
 *            onUrgeTodo:(group:Object, ctx:Object)=>void}}
 */
export function createUrgeController({ selfRoles = [], context, onDone, titleSuffix = '' } = {}) {
  const state = new Map(); // groupKey → 最近催办时间戳（会话内，不落库）
  const selfSet = new Set(selfRoles);

  /** 当前用户是否本台「本人」角色（显式自守，防越权渲染）；非本人 → 不催 */
  const _canUrge = () => {
    const me = AuthStore.getCurrentUser();
    return !!me && selfSet.has(me.role);
  };

  /** 责任角色（过滤「责任人即本人」） */
  const _urgeRoles = (group) =>
    urgeRolesOf(group, context ? context() : {}).filter(r => !selfSet.has(r));

  /** 催办入口状态：available=可催办（含再次催办）｜urged=冷却中（节流）｜null=不渲染 */
  function urgeStateOf(group) {
    if (!group || !group.groupKey || !_canUrge()) return null;
    const roles = _urgeRoles(group);
    if (!roles.length) return null; // 无责任人或责任人即本人 → 隐藏
    const at = state.get(group.groupKey);
    if (at && Date.now() - at < URGE_COOLDOWN_MS) {
      return { state: 'urged', label: `已催办 ${_hhmm(at)}`, title: '催办冷却中（5 分钟后可再次催办）' };
    }
    return {
      state: 'available',
      label: at ? '再次催办' : '催办',
      title: `提醒责任人：${roles.map(r => ROLE_LABELS[r] || r).join('、')}${titleSuffix}`,
    };
  }

  /** 催办动作：按责任角色发定向通知；成功后按钮转「已催办」态（会话内） */
  function onUrgeTodo(group, ctx) {
    if (!group || !group.groupKey) return;
    const at = state.get(group.groupKey);
    if (at && Date.now() - at < URGE_COOLDOWN_MS) {
      showToast('info', '该待办刚已催办，请稍后再试');
      return;
    }
    const roles = _urgeRoles(group);
    if (!roles.length) { showToast('info', '该待办无明确责任人，无法催办'); return; }
    const targetModule = _urgeTargetModule(group);
    // A① 对象级深链（2026-09-10）：按责任人角色复用 notice.js 同源模块→页面映射，落到该角色待办 tab
    // 并高亮被催办聚合组（data-group-key）；页面缺省时退 targetModule 角色自适应兜底。
    const roleMap = NOTICE_MODULE_ROLE_PAGES[targetModule] || {};
    const hlId = group.groupKey || ((group.items && group.items[0]) || {}).id;
    // 签发人取当前真实角色（2026-09-13 彻查批次：此前正文写死「支书提醒：」且 actorRole 传 'secretary'
    //   → 副支书催办被记为支书；正文改为裁定原定的中性事务式，签发人落到 publishedBy）
    const _me = AuthStore.getCurrentUser() || {};
    const _actorRole = _me.role || (selfSet.values().next().value || 'secretary');
    for (const role of roles) {
      const page = roleMap[role] || roleMap['*'];
      NoticeStore.add({
        title: '待办催办',
        // A④ 文案定稿（2026-09-10 支书裁定：中性事务式）——「关于〈业务域 · 事项〉，请及时跟进（截止 <时限/无>）」
        content: `关于「${_urgeSubject(group)}」，请及时跟进${_urgeDueText(group) ? `（截止 ${_urgeDueText(group)}）` : '（无明确时限）'}。`,
        priority: 'urgent',
        targetModule,
        // F07（IA-F07）：只有 `workspace/*.html` 消费 `?tab=`；`index.html`（映射 `'*'`）不消费，
        //   拼上 `?tab=todo` 只会制造假深链（highlight 也无人消费）⇒ 非工作台页只给裸页面。
        targetUrl: page
          ? (page.startsWith('workspace/')
            ? `${page}?tab=todo${hlId ? `&highlight=${encodeURIComponent(hlId)}` : ''}`
            : page)
          : undefined,
        // 催办只增通知、不派生新待办（Task 2.4）：被催办人本来就持有该聚合组待办，
        //   再按每条催办通知派生「阅读通知」会让连续催办无限叠加待办。
        actionable: false,
        actionRoles: [role],
        actionTask: group.title,
        publishedBy: ROLE_LABELS[_actorRole] || '支书',
      }, _actorRole);
    }
    state.set(group.groupKey, Date.now());
    showToast('success', `已向${roles.map(r => ROLE_LABELS[r] || r).join('、')}发送催办通知`);
    if (typeof onDone === 'function') onDone(ctx);
  }

  return { urgeStateOf, onUrgeTodo };
}
