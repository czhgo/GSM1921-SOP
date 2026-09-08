// role: [工程师]+[AI]
// entries/tabs/secretary/todo-tab.js — 书记工作台·待办 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分：按 tab 代码分割，首屏只加载默认 tab。
// 2026-08-07 T232：改为「动态聚合 + 复核确认面板」——SecretaryTodoDeriver.computeAggregates()
//   实时计算 4 提醒 + 4 复核，复核类一键写 secretaryConfirmedAt 销项，不再创建虚假实体待办。
// 2026-09-07 IA-C1 Task4：待办主列重构为共享壳「未读通知条 + 9 业务域折组」——
//   实时聚合组（SecretaryTodoDeriver 8 组/决议逾期 remind/成员变更确认/学期末滞留复核）经
//   buildRealtimeGroups 一次 merge 进对应域（考勤纪律/考察/活动项目/归档宣传/成员发展/决议上报）；
//   种子行动类（设党小组组长）由壳按域聚合；自定义详情/专班待议/待答复收件箱/成员变更面板照旧挂载。

import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260903c';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260908a';
import { TodoStore, seedTodos, TodoCategory, REALTIME_GROUP_DOMAIN } from '../../../services/todo.js?v=20260907b';
import { SecretaryTodoDeriver } from '../../../services/secretary-overview.js?v=20260907b';
import { badgeHtml } from '../../../components/badges.js?v=20260903c';
import { loadAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260907b';
import { loadInspectionRecords, saveInspectionRecords } from '../../../services/inspection.js?v=20260907b';
import { updateActivityReview } from '../../../services/review.js?v=20260907b';
import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { mockDB } from '../../../core/domain.js?v=20260903c';
import { persist } from '../../../core/data-adapter.js?v=20260903c';
import { bumpToken } from '../../../core/version-token.js?v=20260907b'; // P0 域缓存失效（spec §二.3）
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260907b';
import { getAccentColors, resolveAccentRole, solidAccentStyle } from '../../../core/constants.js?v=20260903c';
import { IssueStore } from '../../../services/issues.js?v=20260908a';
import { TaskForceRecordStore, createTaskforceVoteActivity, findTaskforceVoteActivity } from '../../../services/taskforce.js?v=20260907b';
import { fetchVotes } from '../../../services/committee-vote.js?v=20260903c';
import { resolveVoterIds } from '../../../services/vote-config.js?v=20260903c';
import { renderReportInboxHtml, bindReportInbox } from '../../../components/reporting.js?v=20260908a';
import { renderMemberChangePanelHtml, bindMemberChangePanel, preloadMemberChangeRequests, getCachedMemberChangeRequests } from '../../../components/member-change-panel.js?v=20260903c';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260903c';
import { buildOverdueRemindGroupNow } from '../../../services/resolution-followup.js?v=20260907b';
// C 批 附录⑩ S4：名册确权复核（组织委员发起 → 书记确认/退回）+ 学期末滞留集中复核提醒
import { listPendingConfirmations, decideConfirmation, shouldShowSemesterDetainedRemind, MC_ACTION_LABEL } from '../../../services/member-confirmation.js?v=20260907b';
import { getDetainedMembers, getResidenceOf } from '../../../services/roster.js?v=20260903c';
import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { openModal, closeModal } from '../../../components/modal.js?v=20260903c';

const { accent, accentBorder } = getAccentColors(resolveAccentRole('secretary'));

// ── 模块级渲染缓存（onBeforeRender 预载 / 顶部自定义区共用） ─────
let _pendingReports = [];

// ════════════════════════════════════════════════════════════════
//  共享壳接线（IA-C1 Task4：未读通知条 + 9 业务域折组；原手写双栏大列表结构移除）
// ════════════════════════════════════════════════════════════════

/** 实时聚合组（不落库）：SecretaryTodoDeriver 8 组 + 决议逾期 + 成员变更确认 + 学期末滞留复核。
 *  壳 mergeRealtimeDomains 按组 domain 并入对应业务域折组；实时组无「行尾直接动作」
 *  （动作承载于详情内一键确认/去活动管理）→ hideActionBtn 只留点行进详情。
 *  种子行动类（设党小组组长等）为持久化待办，由壳 getDomainsWithGroups 域内聚合，无需在此给出。 */
function _buildRealtimeGroups() {
  const computedAggs = SecretaryTodoDeriver.computeAggregates().map(g => ({ ...g, hideActionBtn: true }));
  const followupOverdueAgg = buildOverdueRemindGroupNow();
  const mcConfirmAgg = _mcConfirmAgg();
  const semesterAgg = _semesterRemindAgg();
  return [
    ...computedAggs,
    ...(followupOverdueAgg ? [{ ...followupOverdueAgg, hideActionBtn: true }] : []),
    ...(mcConfirmAgg ? [{ ...mcConfirmAgg, hideActionBtn: true }] : []),
    ...(semesterAgg ? [{ ...semesterAgg, hideActionBtn: true }] : []),
  ];
}

/** 顶部自定义区：成员变更确认卡（预载缓存同步产物）+ 待答复收件箱 + 专班待议（支委会）区 */
function _extraTopHtml() {
  const inboxHtml = renderReportInboxHtml({
    reports: _pendingReports,
    title: '待答复',
    role: 'secretary',
    accent,
    emptyMsg: '暂无待答复汇报',
  });
  // 2026-09-08 顶卡同步化：成员变更确认卡 HTML 由预载缓存同步产出（onBeforeRender await 预载），
  // 不再 0 高裸挂点 + 异步弹入（onAfterRender 降级只绑事件）——三卡同批出现、不后弹。
  const memberPanelHtml = renderMemberChangePanelHtml(getCachedMemberChangeRequests(), { mode: 'secretary-confirm', accent });
  // B批 3.2-2：「专班待议（支委会）」提醒区——数据源 listCommitteeRequests()（仅 pending、先报先议）
  // 每项显示类型徽标（发起/解散）、专班名、任务摘要、报送人、报送时间；
  // 已排入表决（findTaskforceVoteActivity 命中该报送后创建的支委会活动）→ 提供「查看表决结果并生效」。
  const tfReqs = TaskForceRecordStore.listCommitteeRequests();
  const arrangedActByTf = new Map();
  tfReqs.forEach(r => { const act = findTaskforceVoteActivity(r.id); if (act) arrangedActByTf.set(r.id, act); });
  const committeeTfHtml = `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">专班待议（支委会）</h4>
        <span class="text-xs text-gray-400 tabular-nums">${tfReqs.length} 项待议</span>
      </div>
      <div class="space-y-2">
        ${tfReqs.length === 0
          ? '<p class="text-xs text-gray-400 py-1">暂无待议专班</p>'
          : tfReqs.map(r => _committeeTfRowHtml(r, arrangedActByTf.get(r.id))).join('')}
      </div>
    </div>`;
  return `${memberPanelHtml}${inboxHtml}${committeeTfHtml}`;
}

/** 详情区自定义按钮（一键确认复核 / 成员确权逐项确认·退回 / 学期末「知道了」）；
 *  remind·seed 详情共用 secretary-todo-detail-action 由壳默认绑定 handleTodoAction */
function bindTodoDetailExtras(container, api) {
  container.querySelector('.secretary-todo-detail-confirm')?.addEventListener('click', () => {
    const group = api.selectedTodo;
    if (group) confirmGroup(group, api);
  });
  // C 批 附录⑩ S4：成员变更确权（确认生效 / 退回）+ 学期末提醒「知道了」
  container.querySelectorAll('.mc-decide').forEach(btn => {
    btn.addEventListener('click', () => _onMcDecide(btn, api));
  });
  container.querySelectorAll('.mc-semester-close').forEach(btn => {
    btn.addEventListener('click', () => {
      api.clearSelection();
      api.renderContent();
    });
  });
}

const _tab = createTodoTab({
  containerId: 'secretary-tab-content',
  prefix: 'secretary',
  role: 'secretary',
  onAction: (todo, ctx) => handleTodoAction(todo, ctx),
  // IA-C1 Task4：实时组（书记派生/决议逾期/成员变更等）并入对应域折组
  buildRealtimeGroups: _buildRealtimeGroups,
  // 自定义详情（confirm/remind/成员确权逐项面板；种子行动类走内置概要）
  renderDetail: renderTodoDetail,
  detailTitle: '待办详情',
  // 书记台以实时组为主（销项走一键确认/业务联动），不提供组删除
  onDeleteTodo: null,
  onBeforeRender: async () => {
    // 补种子数据（幂等，仅行动类：设党小组组长等）；书记侧缺口/复核均为实时计算。
    // P0 去重：refreshExpiredStatus 已由壳 renderContent 统一调用（本 tab 不再重复执行）。
    seedTodos();
    // 待答复汇报（书记 2026-08-10 裁定：答复类置顶待办）——预加载 issues 权威源
    await IssueStore.loadAll();
    _pendingReports = IssueStore.getSecretaryPendingReports();
    // 2026-09-08 顶卡同步化：成员变更确认请求预载（mock 600ms 延迟 → 缓存 → _extraTopHtml 同步产物；
    // 本地签名未变则秒回，变才 await 拉取——守卫命中路径不额外加延迟）
    await preloadMemberChangeRequests();
  },
  extraTopHtml: _extraTopHtml,
  bindExtras: (container, ctx, api) => {
    bindCommitteeTfEvents(container, api);
    bindReportInbox(container, { role: 'secretary', onAnswered: () => api.renderContent() });
    bindTodoDetailExtras(container, api);
  },
  onAfterRender: (container, ctx, api) => {
    // 成员变更确认面板（2026-09-01 书记点验链路 ④：组织委员审批后 → 书记确认 → 更新阶段）
    // 2026-09-08 顶卡同步化：内容已随 extraTopHtml 同步产物 → 此处降级只绑事件
    bindMemberChangePanel(container.querySelector('[data-mc-panel="secretary-confirm"]'), {
      mode: 'secretary-confirm',
      requests: getCachedMemberChangeRequests(),
      onDone: () => api.renderContent(),
    });
  },
});

export function renderContent(ctx) {
  const container = document.getElementById('secretary-tab-content');
  if (container) container.dataset.currentTab = 'todo';
  return _tab.renderContent(ctx);
}

// ── 详情卡：按聚合类型分发（confirm / remind / 种子行动类；C 批自定义组优先） ────
function renderTodoDetail(todo) {
  const actionKey = todo.actionKey || '';
  // C 批 附录⑩ S4：成员变更确权（逐项 确认/退回）+ 学期末滞留集中复核（自定义详情）
  if (todo.groupKey === 'secretary:member-confirm') return renderMemberConfirmDetail(todo);
  if (todo.groupKey === 'secretary:semester-detained-remind') return renderSemesterDetainedDetail(todo);
  if (todo.kind === 'confirm' || actionKey.endsWith('-confirm')) return renderConfirmDetail(todo);
  if (todo.kind === 'remind' || actionKey.endsWith('-remind')) return renderRemindDetail(todo);
  return renderSeedDetail(todo);
}

/** 复核类详情：批次/来源汇总 + 一键确认 */
function renderConfirmDetail(group) {
  const items = group.items || [];
  const rows = items.slice(0, 8).map(it => `<div class="text-xs text-gray-600 truncate">${_confirmItemLabel(group.actionKey, it)}</div>`).join('');
  const more = items.length > 8 ? `<div class="text-xs text-gray-400">… 另有 ${items.length - 8} 条</div>` : '';
  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${group.count} 条待复核</span>
      </div>
      <p class="font-title-cn text-sm font-bold text-gray-800">${group.title}</p>
      ${group.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${group.flow}</p>` : ''}
      <div class="rounded-lg bg-gray-50 p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
        ${rows || '<div class="text-xs text-gray-400">无待复核记录</div>'}
        ${more}
      </div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        <button class="secretary-todo-detail-confirm text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">一键确认 ${group.count} 条</button>
      </div>
    </div>
  `;
}

/** 提醒类详情：缺口清单 + 去活动管理 */
function renderRemindDetail(group) {
  const items = group.items || [];
  const rows = items.slice(0, 8).map(it => `
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-600 truncate">${it.name || it.title || it.id}</span>
      <span class="text-[11px] text-gray-400 flex-shrink-0">${it.date || ''}</span>
    </div>
  `).join('');
  const more = items.length > 8 ? `<div class="text-xs text-gray-400">… 另有 ${items.length - 8} 项</div>` : '';
  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${group.count} 项待跟进</span>
        ${group.deadline ? `<span class="text-[11px] text-gray-400">最早 ${group.deadline}</span>` : ''}
      </div>
      <p class="font-title-cn text-sm font-bold text-gray-800">${group.title}</p>
      ${group.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${group.flow}</p>` : ''}
      <div class="rounded-lg bg-gray-50 p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
        ${rows || '<div class="text-xs text-gray-400">暂无缺口</div>'}
        ${more}
      </div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        <button class="secretary-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">去活动管理</button>
      </div>
    </div>
  `;
}

/** 种子行动类详情（如：设置党小组组长）；域折组模式下以聚合组对象进入 → 组概要 + 去处理 */
function renderSeedDetail(todo) {
  // 聚合组对象（同 actionKey 多条/实时聚合）：概要卡 + 处理入口
  if (todo.groupKey) {
    return `
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${todo.count} 条待处理</span>
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
        ${todo.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.flow}</p>` : ''}
        ${todo.deadline ? `<div class="text-xs text-gray-500">最早截止：${todo.deadline}</div>` : ''}
        <div class="pt-3 border-t border-gray-100 flex gap-2">
          <button class="secretary-todo-detail-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)}">去处理</button>
        </div>
      </div>
    `;
  }

  const statusLabel = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    expired: '已过期',
  }[todo.status] || todo.status;

  const statusColor = {
    pending: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
  }[todo.status] || 'bg-gray-100 text-gray-500';

  return `
    <div class="space-y-3">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
          ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
        </div>
        <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
      </div>
      ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
      ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
      <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        ${todo.actionType ? `<button class="secretary-todo-detail-action text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
      </div>
    </div>
  `;
}

// ── C 批 附录⑩ S4：成员变更确权（待确认组 + 逐项确认/退回） ────

/** 书记操作人（确认/退回留痕 decidedBy；兜底 p13 书记位） */
function _secActorId() {
  return AuthStore.getCurrentUser()?.personId || 'p13';
}

/** 待确认聚合组（无 pending 返回 null；kind=confirm 复用既有「去处理→详情面板」交互） */
function _mcConfirmAgg() {
  const items = listPendingConfirmations();
  if (!items.length) return null;
  return {
    groupKey: 'secretary:member-confirm',
    actionKey: 'member-confirm',
    // IA-C1 Task2：实时组标注业务域（成员发展；供 T4 域折组）
    domain: REALTIME_GROUP_DOMAIN['member-confirm'],
    title: '成员变更待确认',
    category: TodoCategory.REVIEW,
    flow: '组织委员发起（发展阶段 / 在册状态 / 移出）→ 书记确认生效或退回',
    kind: 'confirm',
    count: items.length,
    items,
  };
}

/** 学期末滞留集中复核提醒组（窗口内且有滞留成员时出现；kind=remind 复用「去处理→详情面板」） */
function _semesterRemindAgg() {
  if (!shouldShowSemesterDetainedRemind()) return null;
  const detained = getDetainedMembers();
  if (!detained.length) return null;
  return {
    groupKey: 'secretary:semester-detained-remind',
    actionKey: 'semester-detained-remind',
    // IA-C1 Task2：实时组标注业务域（成员发展；供 T4 域折组）
    domain: REALTIME_GROUP_DOMAIN['semester-detained-remind'],
    title: '学期末滞留集中复核',
    category: TodoCategory.REVIEW,
    flow: '学期末窗口提醒（6/15–7/15、12/15–次年1/15）：请集中复核在册滞留名单',
    kind: 'remind',
    count: detained.length,
    items: detained.map(p => {
      const rs = getResidenceOf(p);
      return { id: p.id, name: p.name, note: rs.residenceNote || '', date: '' };
    }),
  };
}

/** 成员变更确权详情：逐项展示（kind 徽标 / 姓名 / from→to / 发起人 / 时间 / 备注 / 移出保持摘要） */
function renderMemberConfirmDetail(group) {
  const rows = (group.items || []).map(req => _mcReqCard(req)).join('');
  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${group.count} 条待确认</span>
      </div>
      <p class="font-title-cn text-sm font-bold text-gray-800">成员变更待确认</p>
      <p class="text-xs text-gray-600 leading-relaxed">组织委员发起的变更须书记确认后生效（或退回）。移出项将自动解除未开始引用，历史记录转「已转出」标注并保留（不删不匿名）。</p>
      <div class="space-y-2 max-h-[26rem] overflow-y-auto">${rows || '<div class="text-xs text-gray-400">暂无待确认请求</div>'}</div>
    </div>
  `;
}

/** 单条确权请求卡：展示 + 确认生效 / 退回 */
function _mcReqCard(req) {
  const action = req.action;
  const kindLabel = MC_ACTION_LABEL[action] || (req.kind === 'transferOut' ? '移出' : '变更');
  const kindCls = action === 'developStage' ? 'bg-sky-50 text-sky-700'
    : action === 'residence' ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-600';
  const byName = req.by ? (getPersonName(req.by) || req.by) : '组织委员';
  const atText = String(req.at || '').slice(0, 16).replace('T', ' ');
  return `
    <div class="rounded-lg border border-gray-100 bg-gray-50/40 p-2.5 space-y-1.5" data-mc-card="${esc(req.id)}">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${kindCls}">${kindLabel}</span>
        <span class="text-sm font-medium text-gray-800">${esc(req.name || req.personId)}</span>
        <span class="text-[11px] text-gray-400 ml-auto">${esc(byName)} · ${atText}</span>
      </div>
      <div class="text-xs text-gray-600 leading-relaxed">
        <span class="font-medium text-gray-700">${esc(req.from || '')} → ${esc(req.to || '')}</span>
        ${req.note ? ` <span class="text-gray-400">· ${esc(req.note)}</span>` : ''}
      </div>
      ${(req.kind === 'transferOut' && req.refsSummary) ? _mcRefsSummaryHtml(req.refsSummary) : ''}
      <div class="flex items-center gap-2 pt-1">
        <button type="button" class="mc-decide text-xs px-2.5 py-1 rounded-lg text-white hover:opacity-90 transition-colors" data-mc-id="${esc(req.id)}" data-decision="approved" style="${solidAccentStyle(accent, accentBorder)}">确认生效</button>
        <button type="button" class="mc-decide text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" data-mc-id="${esc(req.id)}" data-decision="rejected">退回</button>
      </div>
    </div>`;
}

/** 移出保持记录摘要（安全解除 / 转已转出标注；域名清单折叠展示） */
function _mcRefsSummaryHtml(summary) {
  const safe = summary.safe || [];
  const keep = summary.keep || [];
  const safeTotal = safe.reduce((s, x) => s + (x.count || 0), 0);
  const keepTotal = keep.reduce((s, x) => s + (x.count || 0), 0);
  const chip = (x, cls) => `<span class="text-[11px] px-1.5 py-0.5 rounded-full ${cls} whitespace-nowrap">${esc(x.label)} ×${x.count}</span>`;
  const safeChips = safe.map(x => chip(x, 'bg-green-50 text-green-700 border border-green-100'));
  const keepChips = keep.map(x => chip(x, 'bg-gray-50 text-gray-600 border border-gray-200'));
  return `
    <div class="rounded-md bg-white border border-gray-100 p-2 text-[11px] text-gray-500 space-y-1">
      <p>保持记录摘要：自动解除 <span class="tabular-nums font-medium text-gray-700">${safeTotal}</span> 项 · 转已转出标注 <span class="tabular-nums font-medium text-gray-700">${keepTotal}</span> 条</p>
      ${(safeChips.length || keepChips.length) ? `
      <details>
        <summary class="cursor-pointer text-gray-400 select-none">查看明细（安全解除 / 保留标注域名）</summary>
        <div class="flex flex-wrap gap-1 pt-1.5">
          ${safeChips.length ? `<span class="text-gray-400">自动解除：</span>${safeChips.join('')}` : ''}
          ${keepChips.length ? `<span class="text-gray-400">保留标注：</span>${keepChips.join('')}` : ''}
        </div>
      </details>` : ''}
    </div>`;
}

/** 学期末滞留集中复核详情：滞留名单 + 引导文案 */
function renderSemesterDetainedDetail(group) {
  const rows = (group.items || []).map(it => `
    <div class="flex items-start justify-between gap-2 py-0.5">
      <span class="text-xs text-gray-700 font-medium flex-shrink-0">${esc(it.name)}</span>
      <span class="text-[11px] text-gray-400 text-right min-w-0 truncate" title="${esc(it.note)}">${esc(it.note || '滞留：组织关系保留、应到剔除、通知照发')}</span>
    </div>`).join('');
  return `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${group.count} 名滞留成员</span>
      </div>
      <p class="font-title-cn text-sm font-bold text-gray-800">学期末滞留集中复核</p>
      <p class="text-xs text-gray-600 leading-relaxed">延续或解除滞留：组织委员在「成员名册」发起变更。</p>
      <div class="rounded-lg bg-gray-50 p-2.5 space-y-1 max-h-44 overflow-y-auto">
        ${rows || '<div class="text-xs text-gray-400">当前无在册滞留成员</div>'}
      </div>
      <div class="pt-3 border-t border-gray-100 flex gap-2">
        <button type="button" class="mc-semester-close text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">知道了</button>
      </div>
    </div>
  `;
}

/** 确认/退回派发（approved 直接落；rejected 弹窗填原因） */
async function _onMcDecide(btn, api) {
  const reqId = btn.dataset.mcId;
  const decision = btn.dataset.decision;
  if (decision === 'rejected') { _askMcReject(reqId, api); return; }
  const r = await decideConfirmation(reqId, { decision: 'approved', by: _secActorId(), note: '' });
  if (r.ok) showToast('success', _mcApprovedToast(r.request));
  else showToast('error', r.reason || '确认失败，请重试');
  api.clearSelection();
  api.renderContent();
}

/** approved 产品话术（按请求类型） */
function _mcApprovedToast(req) {
  const name = req.name || req.personId;
  if (req.kind === 'transferOut') {
    return `已确认移出「${name}」：未开始引用已自动解除，历史记录已转「已转出」标注保留`;
  }
  if (req.action === 'developStage') return `「${name}」发展阶段已确认：${req.from || ''} → ${req.to || ''}`;
  return `「${name}」在册状态已确认：${req.from || ''} → ${req.to || ''}`;
}

/** 退回弹窗（可填原因，透传 decideConfirmation rejectNote） */
function _askMcReject(reqId, api) {
  const pend = listPendingConfirmations().find(r => r.id === reqId);
  const name = pend ? (pend.name || pend.personId) : '';
  openModal({
    id: 'mc-reject-modal',
    title: '退回变更请求',
    accentColor: '#6B7280',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-1">确认退回${name ? `「${esc(name)}」` : '该成员'}的变更请求？退回后不生效，组织委员可在名册重新发起。</p>
      <textarea id="mc-reject-note" class="input-flat text-xs w-full mt-2 p-2 rounded-lg border border-gray-200" rows="3" maxlength="200" placeholder="退回原因（可选）"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
        <button type="button" data-mc-reject-cancel class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="button" data-mc-reject-ok class="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style="background:#6B7280;cursor:pointer;">确认退回</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('[data-mc-reject-cancel]')?.addEventListener('click', () => closeModal('mc-reject-modal'));
      panel.querySelector('[data-mc-reject-ok]')?.addEventListener('click', async () => {
        const note = panel.querySelector('#mc-reject-note')?.value || '';
        closeModal('mc-reject-modal');
        const r = await decideConfirmation(reqId, { decision: 'rejected', by: _secActorId(), note });
        if (r.ok) showToast('info', `已退回${name ? `「${name}」` : ''}的变更请求（未生效）`);
        else showToast('error', r.reason || '退回失败，请重试');
        api.clearSelection();
        api.renderContent();
      });
    },
  });
}

// ── 复核项标签 ────────────────────────────────────────────────
function _actTitle(activityId) {
  const a = loadActivities().find(x => x.id === activityId);
  return a ? a.title : (activityId || '未知活动');
}

function _personName(personId) {
  const p = getPersonById(personId);
  return p ? p.name : (personId || '未知人员');
}

function _confirmItemLabel(actionKey, it) {
  switch (actionKey) {
    case 'attendance-confirm':
      return `· ${_actTitle(it.activityId)} — ${_personName(it.personId)}`;
    case 'inspection-confirm':
      return `· ${_personName(it.personId)} — ${_actTitle(it.activityId) || it.sourceName || '考察'}`;
    case 'review-confirm':
      return `· ${_actTitle(it.activityId)} — 复盘已确认`;
    case 'archive-confirm':
      return `· ${it.activityName || _actTitle(it.activityId)} — ${it.category || ''}${it.fileName ? ' · ' + it.fileName : ''}`;
    default:
      return `· ${it.name || it.title || it.id || ''}`;
  }
}

// ── 一键确认（复核类）：写 secretaryConfirmedAt 销项 ────────────
function confirmGroup(group, api) {
  const now = new Date().toISOString();
  const actionKey = group.actionKey;
  let n = 0;

  if (actionKey === 'attendance-confirm') {
    const records = loadAttendanceRecords();
    const ids = new Set(group.items.map(r => r.id));
    records.forEach(r => {
      if (ids.has(r.id) && !r.secretaryConfirmedAt) { r.secretaryConfirmedAt = now; n++; }
    });
    saveAttendanceRecords(records);
  } else if (actionKey === 'inspection-confirm') {
    const records = loadInspectionRecords();
    const ids = new Set(group.items.map(r => r.id));
    records.forEach(r => {
      if (ids.has(r.id) && !r.secretaryConfirmedAt) { r.secretaryConfirmedAt = now; n++; }
    });
    saveInspectionRecords(records);
  } else if (actionKey === 'review-confirm') {
    for (const r of group.items) {
      if (r.activityId && updateActivityReview(r.activityId, { secretaryConfirmedAt: now })) n++;
    }
  } else if (actionKey === 'archive-confirm') {
    const ids = new Set(group.items.map(r => r.id));
    (mockDB.archiveRecords || []).forEach(r => {
      if (ids.has(r.id) && !r.secretaryConfirmedAt) { r.secretaryConfirmedAt = now; n++; }
    });
    if (n > 0) bumpToken('archiveRecord'); // P0：书记归档复核写口（直写 mockDB → 显式 bump 失效聚合缓存）
    persist();
  } else {
    showToast('info', `暂不支持该聚合类型确认：${actionKey}`);
    return;
  }

  showToast('success', `已复核 ${n} 条，${group.title}待办已清零`);
  api.clearSelection();
  api.renderContent();
}

// ── 行动跳转（种子行动类 / 提醒类跳活动管理） ──────────────────
function handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 无生产者残留键登记（IA-C1 Task5 2026-09-06）：taskforce-approval 旧「专班发起书记单人审批」
  // 待办不再派生（专班发起已改支委会表决，R3-1）；保留兼容处理旧存量：打开即提示并销该待办，
  // 引导到本页「专班待议（支委会）」区。
  if (todo.actionKey === 'taskforce-approval') {
    const items = (todo.items && todo.items.length > 0) ? todo.items : (todo.id ? [todo] : []);
    showToast('info', '专班发起已改支委会表决：请到本页「专班待议（支委会）」区排入表决处理');
    items.forEach(it => { if (it && it.id) TodoStore.complete(it.id); });
    renderContent(ctx);
    return;
  }
  // 提醒类聚合卡：「去活动管理」按钮直接切 calendar tab
  if (todo.groupKey && (todo.actionKey || '').endsWith('-remind')) {
    jumpToCalendar(todo);
    return;
  }
  // 根据 actionType 跳转到对应 tab（renderTabBar 统一按钮类名）
  const tabMap = {
    authorize: 'assign',
    write: 'calendar',
    review: 'feedback',
    notify: 'notification',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${targetTab}"]`);
    if (btn) btn.click();
    // t5c：切 tab 后自动展开目标面板（最小三成本——行动按钮一次直达可操作状态）
    if (targetTab === 'assign' && todo.actionType === 'authorize') {
      expandAssignPanelForTodo(todo);
    }
    showToast('info', `已跳转，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

/** 提醒类 → 切到活动管理 tab */
function jumpToCalendar(group) {
  const btn = document.querySelector('.secretary-tab-btn[data-secretary-tab="calendar"]');
  if (btn) btn.click();
  const first = (group.items || [])[0];
  showToast('info', `已跳转到活动管理，请跟进：${group.title}${first && first.name ? `（${first.name}）` : ''}`);
}

/** t5c：赋权管理 tab 落地后，按待办 scope 自动展开对应赋权面板 */
function expandAssignPanelForTodo(todo) {
  const scope = todo.actionData?.scope;
  const sourceId = todo.actionData?.sourceId;
  if (scope === 'leader') {
    // 常设赋权（设党小组组长）：若面板未展开则自动展开
    const assignBtn = document.getElementById('ws-sec-assign-btn');
    if (assignBtn && assignBtn.textContent.includes('设党小组组长')) assignBtn.click();
  } else if (scope === 'activity' || scope === 'taskforce') {
    // 项目赋权：预选项目类型与项目并滚动到表单
    const typeSelect = document.getElementById('project-type-select');
    const idSelect = document.getElementById('project-id-select');
    if (typeSelect && idSelect) {
      typeSelect.value = scope;
      typeSelect.dispatchEvent(new Event('change'));
      const opt = [...idSelect.options].find(o => o.value === sourceId);
      if (opt) idSelect.value = sourceId;
      document.getElementById('project-auth-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  B批 3.2-2/3/4：专班待议（支委会）区
//  报送发起/解散（listCommitteeRequests）→ 书记「排入支委会表决」创建线上表决活动
//  （services/taskforce.js createTaskforceVoteActivity）→ 委员在线表态 →
//  「查看表决结果并生效」：fetchVotes + evaluateCommitteeVote 判定 → applyCommitteeDecision 落果。
// ════════════════════════════════════════════════════════════════

/** 单行：类型徽标（发起/解散）+ 专班名/任务摘要/报送人/报送时间 + 操作 */
function _committeeTfRowHtml(req, act) {
  const kindLabel = req.kind === 'dissolve' ? '解散' : '发起';
  const kindCls = req.kind === 'dissolve'
    ? 'bg-gray-100 text-gray-600'
    : 'bg-indigo-50 text-indigo-600';
  const byName = req.by ? getPersonName(req.by) : '组织委员';
  const atText = String(req.at || '').slice(0, 16).replace('T', ' ');
  const ops = act
    ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex-shrink-0">已排入表决</span>
       <button type="button" class="tf-cr-result text-xs px-2.5 py-1.5 rounded-lg text-white hover:opacity-90 transition-colors flex-shrink-0" style="background:#6366F1;" data-tf-id="${req.id}" data-activity-id="${act.id}">查看表决结果并生效</button>`
    : `<button type="button" class="tf-cr-arrange text-xs px-2.5 py-1.5 rounded-lg text-white hover:opacity-90 transition-colors flex-shrink-0" style="background:#CE1126;" data-tf-id="${req.id}" data-kind="${req.kind}">排入支委会表决</button>`;
  return `
    <div class="rounded-xl border border-gray-100 bg-gray-50/40 p-3">
      <div class="flex items-start gap-2">
        <span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${kindCls}">${kindLabel}</span>
        <div class="flex-1 min-w-0">
          <p class="font-title-cn text-sm font-bold text-gray-800 truncate">${req.name || '未命名专班'}</p>
          ${req.task ? `<p class="text-xs text-gray-500 truncate mt-0.5">${req.task}</p>` : ''}
          <p class="text-[11px] text-gray-400 mt-0.5">报送人 ${byName} · ${atText || ''}${req.note ? ` · ${req.note}` : ''}</p>
        </div>
        <div class="flex flex-col items-end gap-1.5 flex-shrink-0">${ops}</div>
      </div>
    </div>`;
}

/** 事件绑定（列表每次重建后调用） */
function bindCommitteeTfEvents(container, api) {
  container.querySelectorAll('.tf-cr-arrange').forEach(btn => {
    btn.addEventListener('click', () => _arrangeTfCommitteeVote(btn, api));
  });
  container.querySelectorAll('.tf-cr-result').forEach(btn => {
    btn.addEventListener('click', async () => {
      const req = TaskForceRecordStore.listCommitteeRequests().find(r => r.id === btn.dataset.tfId);
      if (!req) { showToast('info', '该报送已处理或已失效，列表已刷新'); api.renderContent(); return; }
      await _openTfDecisionModal(req, btn.dataset.activityId, api);
    });
  });
}

/** 3.2-3：为该报送创建一场「线上支委会」表决活动（title 形如「线上支委会：审议专班【名】（发起/解散）」） */
async function _arrangeTfCommitteeVote(btn, api) {
  const tfId = btn.dataset.tfId;
  const kind = btn.dataset.kind;
  const req = TaskForceRecordStore.listCommitteeRequests().find(r => r.id === tfId);
  try {
    const act = await createTaskforceVoteActivity({ taskforceId: tfId, kind, note: req ? req.note : '' });
    showToast('success', `已排入支委会表决：「${act.title}」，委员将收到通知`);
    api.renderContent();
  } catch (e) {
    console.error('[todo] 排入表决失败：', e);
    showToast('error', `排入表决失败：${e.message || e}`);
  }
}

/** 3.2-4：查看表决结果（fetchVotes→evaluateCommitteeVote 判定），弹确认框后按结论生效 */
async function _openTfDecisionModal(req, activityId, api) {
  const roster = resolveVoterIds('committee');
  let votes;
  try {
    votes = await fetchVotes(activityId);
  } catch (e) {
    showToast('error', `获取表态失败：${e.message || e}`);
    return;
  }
  const outcome = TaskForceRecordStore.evaluateCommitteeVote({
    roster,
    votes: (votes || []).map(v => ({ personId: v.personId, position: v.position })),
  });
  const { status, tally, needed } = outcome;
  const kindLabel = req.kind === 'dissolve' ? '解散' : '发起';
  const sumLine = `出席 ${tally.voted}/${needed}（应到 ${tally.total}）· 同意 ${tally.agree} · 异议/反对 ${tally.object}${tally.comment ? ' · 附言 ' + tally.comment : ''}`;
  const conclusion = status === 'pending'
    ? '表决未达门槛/尚未截止'
    : (status === 'passed' ? '已通过' : '未通过（有异议/反对）');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:var(--radius-lg);padding:20px 22px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';
  card.innerHTML = `
    <p class="font-bold text-sm text-gray-800 mb-1">专班${kindLabel}表决结果「${req.name || '未命名专班'}」</p>
    <p class="text-xs text-gray-500 mb-3">表决活动：线上支委会（${kindLabel}专班议案）</p>
    <div class="rounded-lg bg-gray-50 p-3 mb-3 text-xs space-y-1.5">
      <p class="text-gray-700">${sumLine}</p>
      <p class="font-medium ${status === 'passed' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-amber-600'}">结论：${conclusion}</p>
      ${status === 'pending'
        ? '<p class="text-gray-400">判据（R2-3）：应到严格超过 2/3 出席且无反对（弃权允许）。未达标请等待委员表态/截止后再查看。</p>'
        : '<p class="text-gray-400">确认后按此结论生效：' + (status === 'passed'
            ? (req.kind === 'initiate' ? '专班转为招募中' : '专班解散（解散留痕）')
            : (req.kind === 'initiate' ? '退回草稿（可修改后重新报送）' : '专班继续运行')) + '。</p>'}
    </div>
    ${status === 'pending'
      ? '<button type="button" class="tf-modal-close text-xs text-white px-3 py-1.5 rounded-lg w-full transition-colors" style="background:#6366F1;">知道了</button>'
      : `<div style="display:flex;gap:12px;justify-content:flex-end;">
          <button type="button" class="tf-modal-close text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
          <button type="button" id="tf-decision-apply" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="background:#CE1126;">按表决结果生效</button>
        </div>`}
  `;
  const close = () => overlay.remove();
  card.querySelectorAll('.tf-modal-close').forEach(b => b.addEventListener('click', close));
  card.querySelector('#tf-decision-apply')?.addEventListener('click', () => {
    const decision = outcome.status === 'passed' ? 'approved' : 'rejected';
    const updated = TaskForceRecordStore.applyCommitteeDecision(req.id, {
      decision,
      outcome,
      by: 'secretary',
      note: '线上支委会表决结论已生效',
      decisionRef: activityId,
    });
    close();
    if (!updated) { showToast('error', '生效失败：该报送已处理或已失效'); api.renderContent(); return; }
    const base = `专班「${req.name || '未命名专班'}」`;
    if (req.kind === 'initiate') {
      showToast('success', decision === 'approved' ? `${base}发起表决通过，已转为招募中` : `${base}发起表决未通过，已退回草稿（可修改后重新报送）`);
    } else {
      showToast('success', decision === 'approved' ? `${base}解散表决通过，专班已解散` : `${base}解散表决未通过，专班继续运行`);
    }
    api.renderContent();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
