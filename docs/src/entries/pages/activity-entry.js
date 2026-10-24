// role: [工程师]+[AI]
// activity-entry.js — 活动/专班统一详情页入口（T233 报名渠道）
//  URL 前缀分流：act-* 渲染活动详情，tf-* 渲染专班详情。
//  报名区仅在「可报名」时展示（活动 published/ongoing 且日期未过、专班 recruiting 且未截止）。
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261024d';
import { renderHeader } from '../../components/shell/header.js?v=20261024d';
import { BranchService } from '../../services/core/runtime.js?v=20261024d';
import { mockDB, isTaskforceTerminalStatus, SourceType, PARTICIPATION_LEVEL_LABELS } from '../../core/domain/domain.js?v=20261024d';
// A02：正式会议应到名单读取口径——冻结快照优先，未冻结按 roster 现算（不再读 act.assignments）
import { loadAttendanceRosterSnapshots } from '../../services/activity/attendance.js?v=20261024d';
import { getMeetingRosterIds } from '../../services/member/roster.js?v=20261024d';
// A04：专班「工作考察」按稳定父键 workgroupId 读 inspection 记录（不再按名称匹配复盘）
import { getRecordsBySource } from '../../services/activity/inspection.js?v=20261024d';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261024d';
import { legacyParticipantAssignmentRows, workgroupMembers } from '../../services/activity/workgroup-members.js?v=20261024d';
import { NoticeStore } from '../../services/governance/notice.js?v=20261024d';
import { SignupStore, canCloseActivitySignup, closeActivitySignup, SignupStatus } from '../../services/activity/signup.js?v=20261024d';
import { AuthStore } from '../../services/core/auth.js?v=20261024d';
import { getPersonById } from '../../services/member/person.js?v=20261024d';
// 品牌认定（2026-09-21 批次 132 · 支书口径二「支委/党小组组长均可以提案，支委会通过后确定」）：
// 判据与写口单一源 = services/activity/activity.js；本页**不再有「点一下即认定」**（提案 / 撤回 / 取消认定三种动作）。
import { canProposeBrand, brandProposalOf, proposeBrandDesignation, withdrawBrandProposal, revokeBrandDesignation } from '../../services/activity/activity.js?v=20261024d';
// 转交组织者（SOP-G-2-② · 2026-10-01 批次 327 · 支书裁「乙：直接转交 ＋ 留痕」）：
//   母本《常见工作场景快速指南》`:125`「组织者退出需经支委会确定好接手的组织者并负责地完成工作交接
//   后方可退出」；可发起＝支书 / 副支书 / 组织委员 / **该场现任组织者本人**。判据与写口单一源＝
//   `components/governance/organizer-transfer.js`（本页只挂入口）。
import { canTransferOrganizer, openOrganizerTransfer, organizerOf } from '../../components/governance/organizer-transfer.js?v=20261024d';
// 追加复盘要求（2026-09-21 批次 135 · 裁定二「按推荐档落」）：支委会可额外要求本场组织者完成复盘；
// 判据与写口单一源 = services/activity/activity.js；另有「交回状态」须读该场复盘记录（services/governance/review.js）。
import { reviewRequestOf, isReviewReturned, isReviewRequestEligibleActivity, requestOrganizerReview, withdrawReviewRequest } from '../../services/activity/activity.js?v=20261024d';
import { loadActivityReviews } from '../../services/governance/review.js?v=20261024d';
import { getBasePath, escHtml as esc, showToast, describeWriteError } from '../../core/base/utils.js?v=20261024d';
import { getActivityTypeColors, usesFormalMeetingRoster, SECRETARY_AND_DEPUTY_ROLES, isPartyGroupLeaderRole } from '../../core/domain/constants.js?v=20261024d';
import { getAppState } from '../../core/base/state.js?v=20261024d';
import { badgeHtml } from '../../components/ui/badges.js?v=20261024d';
// 待批活动的可见性单一源（2026-09-22 批次 151 · 支书裁定「只支委层可见」）：详情页**直按 id 打开**也要守同一判据
// （列表里不出现、但链接/历史记录可直达 ⇒ 只靠列表过滤不够）。
import { isActivityVisibleTo, canRevealActivityMemberNames } from '../../services/core/visibility.js?v=20261024d';
// 活动生命周期展示态单一源（2026-09-13 收敛）：徽章/文案不得本地另写一套中文状态映射
import { activityLifecycleBadgeHtml } from '../../components/record/inspector.js?v=20261024d';
import { enhanceSelects } from '../../components/ui/custom-select.js?v=20261024d';
import { canSignup as _canSignup, renderSignupSection, renderSignupList, bindSignupEvents, roleLabel } from '../../components/governance/signup-panel.js?v=20261024d';
// 工作分工（`assignments` 表 · 2026-10-03 批次 359 · `D-750` 续答「全 CRUD」）：落点＝**活动详情页新增一块**；
//   ⚠ 与活动内联的「参与人员」（`act.assignments`＝**项目角色数组**）**不是同一份数据**；术语用「项目分工 / 事上见」，
//   **不得**称「常备性分工」（支书明令禁用）。判据与写口单一源＝`services/activity/work-assignment.js`。
import { canManageWorkAssignments, listWorkAssignments, createWorkAssignment, updateWorkAssignment, removeWorkAssignment, WORK_ASSIGNMENT_STATUS, WORK_ASSIGNMENT_STATUS_LABELS } from '../../services/activity/work-assignment.js?v=20261024d';
// 选人载体单一源（`DESIGN_SYSTEM §4.13` · `filter-row::S9`）：**「选名单成员」一律 PersonPicker**，
//   **不得**用自建 `<select>` 罗列人名（`S9` 只放行「任命 / 指派到人」四处例外、且明禁新代码长出第 5 处）——
//   本块「负责人」属「选名单成员」⇒ 走 PersonPicker（唯一出口 `components/governance/pickers.js`）。
import { PersonPicker } from '../../components/governance/pickers.js?v=20261024d';
import { renderShareButtonHtml, bindShareButton } from '../../components/shell/share-button.js?v=20261024d';
import { renderVoteWidget } from '../../components/governance/vote-widget.js?v=20261024d';
import { fetchVotes } from '../../services/activity/committee-vote.js?v=20261024d';
// 表态权判据单一源（2026-09-30 批次 304）：本页此前**内联**判过一遍 `voterIds.includes(me)`，
//   与 inspector.js 的 `isCommittee` 角色门形成两种口径；现统一消费 `isVoterOf`（角色无关）。
import { isVoterOf } from '../../services/activity/vote-config.js?v=20261024d';
// SOP-B-2（批次 83）：本页必须先 hydrate API 数据源再渲染——见 _hydrateData 注释
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261024d';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261024d';
// 批次 123：「关闭报名」后按批次 49「存好了才报成功」同一口径——先结算在途落库再刷新；
// R11 P0-03：关闭报名用**动作作用域**结算，只等本动作自己的写
import { beginWriteScope, endWriteScope } from '../../core/session/pending-writes.js?v=20261024d';
import { getAdapter } from '../../data/data-adapter.js?v=20261024d';
import { renderWorkgroupMemberEditor, bindWorkgroupMemberEditor } from '../../components/governance/workgroup-member-editor.js?v=20261024d';
import { openModal, closeModal } from '../../components/ui/modal.js?v=20261024d';
// 汇报汇总（批次 500 · B-499-2）：活动 / 专班上下文按工作组汇总；渲染复用汇报收件箱，不另造第二套。
import { IssueStore } from '../../services/governance/issues.js?v=20261024d';
import { renderReportInboxHtml, bindReportInbox, filterReportsByScope } from '../../components/record/reporting.js?v=20261024d';

renderSidebar('dashboard');
renderHeader('dashboard');

// ── 活动详情页的二次确认 / 单句输入（R3-D07）────────────────────
// 原生 window.confirm / prompt 依赖浏览器样式、不可无障碍定制；本页 7 处动作统一改走 openModal。
let _activityDialogSeq = 0;

/** 二次确认：标题 + 后果句 + 取消/确认（危险动作走危险色调） */
function _openConfirm({ title, message, consequence = '', confirmLabel = '确认', danger = false, onConfirm }) {
  const id = `activity-confirm-${++_activityDialogSeq}`;
  const okButton = danger
    ? `<button type="button" data-act-ok class="btn-danger-solid text-sm px-4 py-1.5 font-medium">${esc(confirmLabel)}</button>`
    : `<button type="button" data-act-ok class="btn-accent text-sm px-4 py-1.5 font-medium">${esc(confirmLabel)}</button>`;
  openModal({
    id,
    title,
    width: '440px',
    bodyHtml: `
      <p style="margin:0;font-size:0.85rem;line-height:1.75;color:var(--neutral-800);">${esc(message)}</p>
      ${consequence ? `<p style="margin:8px 0 0;font-size:0.78rem;line-height:1.7;color:${danger ? 'var(--functional-error)' : 'var(--neutral-500)'};">${esc(consequence)}</p>` : ''}`,
    footerHtml: `
      <button type="button" data-act-cancel class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      ${okButton}`,
    onMount: (panel) => {
      panel.querySelector('[data-act-cancel]')?.addEventListener('click', () => closeModal(id));
      panel.querySelector('[data-act-ok]')?.addEventListener('click', () => {
        closeModal(id);
        onConfirm();
      });
    },
  });
}

/** 单句输入：textarea 必填校验（空值就地报错并聚焦，不关闭浮窗） */
function _openNotePrompt({ title, label, placeholder, confirmLabel, onConfirm }) {
  const id = `activity-note-${++_activityDialogSeq}`;
  openModal({
    id,
    title,
    width: '440px',
    bodyHtml: `
      <label for="activity-note-input" style="display:block;font-weight:500;color:var(--neutral-700);margin-bottom:4px;" class="text-body-sm">${esc(label)} <span style="color:var(--functional-error);">*</span></label>
      <textarea id="activity-note-input" rows="3" required aria-required="true" placeholder="${esc(placeholder)}" class="input-flat-sm w-full" style="color:var(--neutral-700);resize:vertical;"></textarea>
      <p id="activity-note-error" class="text-xs text-red-600 mt-1" hidden></p>`,
    footerHtml: `
      <button type="button" data-note-cancel class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" data-note-ok class="btn-accent text-sm px-4 py-1.5 font-medium">${esc(confirmLabel)}</button>`,
    onMount: (panel) => {
      const input = panel.querySelector('#activity-note-input');
      const errorEl = panel.querySelector('#activity-note-error');
      panel.querySelector('[data-note-cancel]')?.addEventListener('click', () => closeModal(id));
      panel.querySelector('[data-note-ok]')?.addEventListener('click', () => {
        const value = String(input?.value || '').trim();
        if (!value) {
          if (errorEl) {
            errorEl.textContent = '请写明一句要求内容';
            errorEl.hidden = false;
          }
          input?.setAttribute('aria-invalid', 'true');
          input?.setAttribute('aria-describedby', 'activity-note-error');
          input?.focus();
          return;
        }
        closeModal(id);
        onConfirm(value);
      });
    },
  });
}

/**
 * 数据 hydrate（2026-09-18 批次 83 · SOP-B-2 报名链的前提修复）
 *
 * 病灶（真机实测）：本页原只调 `BranchService.loadDB()`。该函数在 API 模式下**直接 return**
 * （数据由 `data-adapter.init()` 从服务器填充），而本页从未 `registerApiAdapter` / `init`
 * ⇒ 实际退回 mock 读：活动是**从本机 localStorage 备份**里读的，报名也只写进那份本地备份
 * ——**服务端一条都没有**。后果：组长台 / 纪检台（API 态，读服务端）永远看不到这份报名，
 * 「考勤候选默认选中报名者」（`D-288`）随之落空（真机实测：服务端 `/signups` 该活动为空，
 * 本地备份里有 `p13:approved`）。
 *
 * 处置：与 notice-entry.js 的既有做法同款——有 API 会话时先切数据源并 `init()` 拉全量，再渲染。
 */
async function _hydrateData() {
  try {
    // 数据源判定收敛（P0-2）：有 token 走 api、失败即失败（显式错误态 + 重试）；无 token 走本地演示形态
    const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
    if (!r.ok) return; // 错误态已由共享实现渲染
  } catch (e) {
    console.warn('[activity-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

// HTML 转义统一走 core/base/utils.js escHtml（2026-09-03 去重收口）
const cardEl = document.getElementById('activity-detail-card') || document.getElementById('taskforce-detail-card');
const backBtn = document.getElementById('activity-back-btn') || document.getElementById('taskforce-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();
const currentUser = AuthStore.getCurrentUser();
const myId = currentUser?.personId || '';
const selectedBranchId = new URLSearchParams(window.location.search).get('branchId') || '';

/** 活动详情「下一步」：1 个主行动 + 至多 2 个次行动（材料 / 复盘 / 转交按角色取）。
 *  动作本体均复用既有入口（材料页 / 各台复盘页 / 页面下方转交按钮），本行只做导航。 */
function _nextStepRowHtml(act, { role, isOrganizer, showSignup, canTransfer, agendaHref }) {
  const id = encodeURIComponent(act.id || '');
  // 2026-10-24 批次 508：「复盘」只保留**真有复盘承载面**的角色落点——
  //   `disc` 的「复盘」页签与成员台「我的复盘」是仅有的两处复盘收件面；
  //   原表里 org→人才库页签、prop→档案归档页签、secretary→党小组页签、leader→组员进展页签
  //   都不是复盘面 ⇒ 一律不渲染该入口（不造「点进去不是复盘」的假入口）。
  //   `reviewHrefOf` 为空串时下方 `review` 直接为 null，渲染处不会再输出按钮。
  //   ⚠ 也不拿「相近页签」顶替（宁少一枚按钮，不给错落点）。
  const reviewHrefOf = {
    'disc-commissioner': 'workspace/disc.html?tab=review',
    'participant': 'workspace/visitor.html?tab=review',
  }[role] || '';
  const committee = ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'].includes(role);
  const materials = (committee || isOrganizer)
    ? { key: 'materials', label: '材料与归档', href: `${getBasePath()}activity-materials.html?id=${id}` }
    : null;
  const review = reviewHrefOf
    ? { key: 'review', label: '复盘', href: `${getBasePath()}${reviewHrefOf}${reviewHrefOf.includes('?') ? '&' : '?'}focusActivityId=${id}` }
    : null;
  const signup = showSignup
    ? { key: 'signup', label: '报名参加', href: '#activity-signup-section' }
    : null;
  const agenda = agendaHref ? { key: 'agenda', label: '会议议程', href: agendaHref } : null;
  const transfer = canTransfer ? { key: 'transfer', label: '转交组织者' } : null;

  const primary = (!isOrganizer && signup) || materials || review || agenda;
  const pool = [materials, review, transfer, agenda, signup].filter((a) => a && a.key !== primary?.key);
  const secondary = pool.slice(0, 2);
  const linkOf = (a, cls) => `<a class="${cls}" href="${a.href}" title="${esc(a.label)}">${esc(a.label)}</a>`;
  return `
    <div class="mt-3 flex flex-wrap items-center gap-2" data-next-step-row>
      <span class="text-xs text-gray-500">下一步</span>
      ${primary ? (primary.key === 'transfer'
        ? '<button type="button" class="btn-accent btn-sm" data-next-transfer>转交组织者</button>'
        : linkOf(primary, 'btn-accent btn-sm')) : ''}
      ${secondary.map((a) => (a.key === 'transfer'
        ? '<button type="button" class="btn-outline btn-sm" data-next-transfer>转交组织者</button>'
        : linkOf(a, 'btn-outline btn-sm'))).join('')}
    </div>`;
}

// HTML 转义统一走 core/base/utils.js escHtml（2026-09-03 去重收口）

/** 活动状态 → 徽章（2026-09-13 收敛：活动一律走生命周期展示态单一源 components/record/inspector.js，
 *  不再本地另写中文状态映射；专班保留本页映射 —— 词表 = 运行中/已完结） */
const TF_STATUS_BADGE = {
  recruiting: ['组建中', 'info'],
  active: ['运行中', 'info'],
  completed: ['已完结', 'neutral'],
  dissolved: ['已解散', 'danger'],
  archived: ['已归档', 'neutral'],
};
function statusBadge(act, kind) {
  if (kind === 'tf') {
    const cfg = TF_STATUS_BADGE[act.status];
    return cfg ? badgeHtml(cfg[0], cfg[1]) : badgeHtml(act.status || '—', 'neutral');
  }
  return activityLifecycleBadgeHtml(act, getAppState()?.tasks || []);
}

// ════════════════════════════════════════════════════════════════
//  入口分流
// ════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
// 2026-10-21 R3 IA 链接真值：本页同时接受 `?id=` 与旧别名 `?activityId=`（通知 / 跨台深链仍可能用后者），
// 两者归一为同一对象；`activity.html?activityId=x` 必须落到与 `?id=x` 相同的活动。
const sourceId = params.get('id') || params.get('activityId') || '';

// 渲染前必须先 hydrate（数据源初始化 + 各 Store init）：Store init 若跑在 API 数据到位之前，
// 会按「空集合」走种子兜底（如 SignupStore 回填 SEED_SIGNUPS），把服务端数据挡在外面。
(async () => {
  await _hydrateData();
  TaskForceRecordStore.init();
  NoticeStore.init();
  SignupStore.init();

  if (!sourceId) {
    if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">未指定活动或专班。请从列表重新进入。</p>';
  } else if (sourceId.startsWith('tf-')) {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
    if (!tf) {
      if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">专班不存在或已解散。请返回列表确认后重试。</p>';
    } else {
      await renderTaskforce(tf);
    }
  } else {
    await renderActivity(sourceId);
  }
})();

// ════════════════════════════════════════════════════════════════
//  活动详情
// ════════════════════════════════════════════════════════════════

async function renderActivity(id) {
  if (!cardEl) return;
  const act = mockDB.activities.find(a => a.id === id);
  // 待批活动对非支委层不可见（2026-09-22 批次 151）：直按 id 打开时给与「不存在」同款口径（不提示「待批」，
  // 免得从这一行反推出「有这么一场还没批的活动」）；关闭档位时不存在待批活动 ⇒ 本判据恒真（零行为变化）。
  if (act && !isActivityVisibleTo(act, currentUser?.role)) {
    cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">活动不存在或尚未公开。请返回活动列表；若刚从通知进入，请刷新后再试。</p>';
    return;
  }
  if (!act) {
    cardEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">活动不存在。请返回活动列表重新选择。</p>';
    return;
  }
  // 汇总面读口：与列表同一受众投影（`IssueStore` 内部 _visibleIssues）；失败时为空，下方空态如实显示 —。
  await IssueStore.loadAll();

  const typeColor = ACTIVITY_TYPE_COLORS[act.type] || { color: '#6B7280' };
  // 活动类型标签色：金系用深金 text（浅底可读），红系回退 dot（_ACTIVITY_TYPE_BASE 无 color 字段）
  const tagColor = typeColor.text || typeColor.dot || '#6B7280';
  // 活动类别固定语义 tone（不随主题）：三会一课=红，主题党日=金，其余=中性
  const tagTone = (tagColor === '#A16207' || tagColor === '#FFD700') ? 'gold' : tagColor === '#CE1126' ? 'danger' : 'neutral';
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'activity' && s.sourceId === act.id);
  const assignmentRows = Array.isArray(act.assignments) ? act.assignments : [];
  const formalRoster = usesFormalMeetingRoster(act);
  const workgroupId = act.workgroupId || `wg-activity-${act.id}`;
  const workgroup = mockDB.workgroups.find((row) => row.id === workgroupId) || null;
  const canRevealMemberNames = canRevealActivityMemberNames({ ...act, branchId: act.branchId || workgroup?.branchId }, currentUser, selectedBranchId);
  // A02：正式会议名单优先读**冻结应到快照**；未冻结按 roster.getMeetingRosterIds 现算。
  //   不再读 `act.assignments`（那是项目角色数组，不是应到名单）。
  const frozenRoster = formalRoster
    ? loadAttendanceRosterSnapshots().find((row) => row.activityId === act.id && row.frozen === true)
    : null;
  const formalRosterIds = formalRoster
    ? (frozenRoster
      ? (Array.isArray(frozenRoster.personIds) ? frozenRoster.personIds.map(String) : [])
      : getMeetingRosterIds({
        type: act.type,
        groupId: act.type === '党小组会'
          ? (act.hostGroup || getPersonById(act.organizer)?.partyGroup || '')
          : undefined,
        branchId: act.branchId || undefined,
      }))
    : [];
  const assignments = formalRoster
    ? formalRosterIds.map((personId) => ({ personId }))
    : workgroupMembers(assignmentRows);
  const legacyParticipants = formalRoster ? [] : legacyParticipantAssignmentRows(assignmentRows);
  // A03：组织者从工作组 / 项目角色派生（organizer-transfer.js 单一源），`act.organizer` 仅兜底。
  const organizerId = organizerOf('activity', act.id) || '';
  const organizerName = organizerId
    ? (canRevealMemberNames ? (getPersonById(organizerId)?.name || organizerId) : '组织者 1 人')
    : '';
  const storedMembers = mockDB.workgroupMembers.filter((row) => row.workgroupId === workgroupId && row.status !== 'removed');
  const editorMembers = storedMembers.length ? workgroupMembers(storedMembers) : assignments.filter((row) => row.role === 'organizer' || row.role === 'deep');
  const participantSignups = [...new Map(signups
    .filter((row) => row.role === 'participant' && row.status === SignupStatus.APPROVED && !row.voidedAt && row.personId)
    .map((row) => [String(row.personId), { personId: String(row.personId) }])).values()];
  const approvedSignupCount = signups.filter((row) => row.status === SignupStatus.APPROVED && !row.voidedAt).length;
  const pendingSignupCount = signups.filter((row) => row.status === SignupStatus.PENDING && !row.voidedAt).length;
  const workgroupRoleCounts = editorMembers.reduce((counts, row) => {
    if (row.role === 'organizer') counts.organizer++;
    else if (row.role === 'deep') counts.deep++;
    return counts;
  }, { organizer: 0, deep: 0 });
  const hostGroup = workgroup?.hostGroupId ? mockDB.partyGroups.find((row) => row.id === workgroup.hostGroupId) : null;
  const canManageMembers = !formalRoster && !!workgroup && (
    SECRETARY_AND_DEPUTY_ROLES.includes(currentUser?.role)
    || (isPartyGroupLeaderRole(currentUser?.role) && workgroup.organizingScope === 'party-group' && hostGroup?.name === currentUser?.partyGroup)
  );
  let memberGrants = [];
  let memberGrantsLoaded = !canManageMembers;
  let memberGrantsError = '';
  if (canManageMembers) {
    try {
      memberGrants = await getAdapter().workgroups.grants.list(workgroupId);
      memberGrantsLoaded = true;
    } catch (error) {
      memberGrantsError = error?.message || '读取工作组授权失败';
    }
  }
  const canEditMembers = canManageMembers && memberGrantsLoaded;
  const canSignup = _canSignup('activity', act);
  // 批次 123（支书 2026-09-20 定案）：「不设截止，但组织者可手动关」——**不新增「截止时点」字段**，
  // 只在活动上落布尔 `signupClosed`。关闭入口就在本页既有报名区块旁（不新开页面）；
  // 呈现与放行**共用** services/activity/signup.js::canCloseActivitySignup（组织者本场 ＋ 支书/副支书）。
  const signupClosed = act.signupClosed === true;
  const canCloseSignup = canSignup && canCloseActivitySignup(myId, act);
  // 品牌认定（2026-09-21 批次 132 · 支书口径二「支委/党小组组长均可以提案，支委会……通过后确定」）：
  //   判据单一源＝AuthStore.isCommissioner（支委层）＋ `services/activity/activity.js::canProposeBrand`（含党小组组长）；
  //   **本页不再有「点一下即认定」**——只渲染 提案 / 撤回提案 / 取消已有认定（支委层，留痕）三种动作。
  const isCommittee = !!currentUser && AuthStore.isCommissioner(currentUser.role);
  // 工作组汇报汇总（批次 500 · B-499-2）：只对该工作组组织者与支委层呈现；
  // 条数与列表共用 `filterReportsByScope`（单一源），空态给 — 与下一步，不造假入口。
  const reportInboxRole = currentUser?.role || 'participant';
  const visibleReports = IssueStore.getVisibleReports();
  const workgroupReports = filterReportsByScope(visibleReports, { workgroupId });
  const isWorkgroupOrganizer = organizerId === myId
    || editorMembers.some((row) => row.personId === myId && row.role === 'organizer');
  const canViewWorkgroupReports = isCommittee || isWorkgroupOrganizer;
  const reportsSummaryHtml = canViewWorkgroupReports ? `
    <!-- 本工作组汇报汇总：复用汇报收件箱（reporting.js），按 workgroupId 过滤；可展开。 -->
    <details class="mt-6 border-t border-gray-100 pt-5" id="workgroup-reports-summary">
      <summary class="cursor-pointer select-none text-sm font-semibold text-gray-800">本工作组汇报汇总 <span class="tabular-nums text-gray-500">${workgroupReports.length}</span></summary>
      <div class="mt-2">
        ${renderReportInboxHtml({
          reports: visibleReports,
          scope: { workgroupId },
          title: '本工作组汇报',
          subtitle: `${workgroupReports.length} 条 · 行内答复`,
          role: reportInboxRole,
          emptyMsg: '— 本工作组暂无汇报 · 下一步：工作组组织者可在「我的处置」发起汇报，或请成员就本事项汇报',
        })}
      </div>
    </details>` : '';
  const isBrandActive = act.isBrand === true;
  const brandProposal = brandProposalOf(act);
  const myRole = currentUser?.role || '';
  // 工作分工（`assignments` 表 · 批次 359 · `D-750` 续答「全 CRUD」）：与上面「参与人员」不是同一份数据
  const workRows = listWorkAssignments(act.id);
  const canManageWork = canManageWorkAssignments(act, myId, myRole);
  let brandCardHtml = '';
  if (isCommittee || canProposeBrand(myRole)) {
    const proposerName = brandProposal && brandProposal.by ? (getPersonById(brandProposal.by)?.name || brandProposal.by) : '';
    const stateText = isBrandActive
      ? `品牌认定（支委会）：本场已认定为品牌活动${act.brandDesignatedAt ? `（${String(act.brandDesignatedAt).slice(0, 10)}）` : ''}`
      : (brandProposal
        ? `品牌认定（支委会）：提案待审议（提案人 ${esc(proposerName || '—')}）`
        : '品牌认定（支委会）：本场尚未认定为品牌活动——须由支委 / 党小组组长提案，经支委会审议通过后认定');
    const action = isBrandActive
      ? (isCommittee ? '<button id="brand-revoke-btn" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">取消品牌认定</button>' : '')
      : (brandProposal
        ? ((isCommittee || brandProposal.by === myId) ? '<button id="brand-withdraw-btn" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">撤回提案</button>' : '')
        : (canProposeBrand(myRole) ? '<button id="brand-propose-btn" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">提议认定为品牌活动</button>' : ''));
    brandCardHtml = `
    <!-- 品牌认定（支委会事项；2026-09-21 批次 132）：提案 → 支委会审议通过后确定。
         本块是给**不在支书台**的支委（组织/宣传/纪检委员）与党小组组长的落点；普通成员与访客看不到该动作。 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">${stateText}</span>
      ${action}
    </div>`;
  }
  // 追加复盘要求（2026-09-21 批次 135 · 裁定二「按推荐档落」）：支委会（支委层）可额外要求本场组织者
  //   完成复盘 ⇒ 进本场活动的关闭判据（**只判到「交回」、不判到「确认」**）；**三会一课不适用**；
  //   **不给组织者自行更新入口**（本块只渲染支委侧的「要求 / 撤回」与交回状态）。
  //   本块的落点＝活动详情页——批次 132 给品牌认定做过同样的「不在支书台的支委也有落点」处理，同款。
  const reviewRequest = reviewRequestOf(act);
  const reviewRequestEligible = isReviewRequestEligibleActivity(act);
  const actReview = loadActivityReviews().find(r => r.activityId === act.id) || null;
  let reviewRequestCardHtml = '';
  if (reviewRequestEligible && (isCommittee || reviewRequest)) {
    const reqByName = reviewRequest && reviewRequest.by ? (getPersonById(reviewRequest.by)?.name || reviewRequest.by) : '';
    const reqAt = reviewRequest && reviewRequest.at ? String(reviewRequest.at).slice(0, 10) : '';
    const returned = isReviewReturned(actReview);
    const stateText = reviewRequest
      ? `追加复盘（支委会要求）：已要求组织者完成复盘（${reqAt || '—'} · 发起人 ${esc(reqByName || '—')}）· 交回状态：${returned ? '已交回' : '尚未交回'}`
      : '追加复盘（支委会要求）：本场未追加要求——支委会可额外要求组织者完成复盘（进关闭判据，只判到「交回」）';
    const action = !reviewRequest
      ? (isCommittee ? '<button id="review-request-btn" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">要求组织者复盘</button>' : '')
      : ((isCommittee || reviewRequest.by === myId) ? '<button id="review-request-withdraw-btn" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">撤回要求</button>' : '');
    reviewRequestCardHtml = `
    <!-- 追加复盘要求（2026-09-21 批次 135 · 裁定二）：支委会额外要求组织者复盘 ⇒ 进活动关闭判据，
         只判到「交回」不到「确认」；三会一课不适用；组织者仍走成员端「我的复盘」那张既有表单。 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">${stateText}</span>
      ${action}
    </div>`;
  }

  // 转交组织者（SOP-G-2-② · 2026-10-01 批次 327 · 支书裁「乙：直接转交 ＋ 留痕」）：
  //   母本 `:125` 要求「经支委会确定好接手的组织者并负责地完成工作交接后方可退出」；支书取**乙档**
  //   （**直接转交 ＋ 留痕**，不走「先上会再转交」）＋ 可发起人取**丙档**（支书 / 副支书 / 组织委员 /
  //   现任组织者本人）。留痕走 `AuthStore.syncProjectRoles` 既有审计（旧组织者 revoke ＋ 新人 grant）。
  // A03：无组织者时**不渲染「转交组织者」**（转交写口要求先有现任组织者，必然失败）——
  //   改为「指定组织者」，复用下方既有的活动工作组成员编辑（把一人设为组织者）。
  const canInitiateTransfer = canTransferOrganizer('activity', act.id, myId);
  let transferCardHtml = '';
  if (canInitiateTransfer && organizerId) {
    transferCardHtml = `
    <!-- 转交组织者（2026-10-01 批次 327 · SOP-G-2-②）：选定接手人即生效；留痕在两处——
         本场 assignments 主源 ＋ 既有角色变更审计（谁转给谁 / 何时）。 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">转交组织者：选定接手人后立即生效（原组织者退出、新人接手）；更换会记入本场角色变更留痕</span>
      <button id="organizer-transfer-btn" class="btn-outline text-xs px-3 py-1.5 flex-shrink-0" style="cursor:pointer;">转交组织者</button>
    </div>`;
  } else if (canInitiateTransfer && !organizerId && canEditMembers) {
    transferCardHtml = `
    <!-- A03：无组织者 → 走既有成员编辑指定（不提供必然失败的「转交」） -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">本场尚未指定组织者：在下方「活动工作组成员」把一人设为组织者即可</span>
      <button id="organizer-designate-btn" class="btn-outline flex-shrink-0" style="cursor:pointer;">指定组织者</button>
    </div>`;
  }

  // 关闭后仍要给「已报名者」留出口：**已报者仍可取消**（本批择定）⇒ 报名区不能整块消失。
  // 只对「本人在册（已通过 / 待审核）」渲染报名区（不显示重填入口——重填必被关闭判据挡回，属假入口）。
  const myActiveSignup = myId ? signups.find(s => s.personId === myId
    && (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING)) : null;
  const showSignupCard = !formalRoster && (canSignup || (signupClosed && !!myActiveSignup));

  // 会议议程区（2026-09-06 点验修复①）：渲染条件放宽为「activity.agenda 存在且 length>0」——
  // 此前议程只随线上异步表决区（voteConfig.mode==='async'）渲染，导致「支部党员大会」等
  // 线下活动的议程在 activity.html 完全不显示。现两种形态：
  //  ① 表决形态（async + 已登录 + 议程含 id 项）→ 保留现有逐条表决挂载（canVote 由固化
  //     应到名单 voteConfig.voterIds 判定，名单外登录人由表决组件提示「仅应到表决人可表态」）；
  //  ② 只读形态（线下活动 / async 但未登录或议程无 id 项）→ 只读议程列表，不渲染投票。
  // 空议程不显示。
  const canVote = isVoterOf(act, currentUser?.personId);
  const agendaList = Array.isArray(act.agenda) ? act.agenda.filter(a => a && a.item) : [];
  const voteAgenda = agendaList.filter(a => a && a.id && a.agendaStep !== 'discussion');
  const isAsyncVote = !!currentUser && act.voteConfig?.mode === 'async' && voteAgenda.length > 0;
  const agendaResultBadge = (r) => (r
    ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${r === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${r === 'passed' ? '已通过' : '未通过'}</span>`
    : '');
  const agendaStepBadge = (a) => a.agendaStep === 'discussion'
    ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-indigo-700 bg-indigo-50">讨论项</span>'
    : (a.agendaStep === 'vote' ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-rose-700 bg-rose-50">表决项</span>' : '');
  const relatedDiscussionLabel = (a) => {
    const discussion = a.discussionAgendaItemId ? agendaList.find((item) => item.id === a.discussionAgendaItemId) : null;
    return discussion ? `对应讨论：${esc(discussion.item)}` : '';
  };
  let agendaAreaHtml = '';
  if (isAsyncVote) {
    agendaAreaHtml = `
    <!-- 议程与表决（AV4.5：线上异步表决） -->
    <div id="async-vote-section" class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 flex-wrap">
        议程与表决
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-700 bg-amber-50">线上异步表决</span>
      </h3>
      <div class="space-y-3">
        ${agendaList.map((a, i) => `
          <div class="card rounded-xl p-4">
            <div class="flex items-start gap-2 text-sm">
              <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-700">${esc(a.item)}</span>
                  ${agendaStepBadge(a)}
                  ${a.result ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${a.result === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${a.result === 'passed' ? '已通过' : '未通过'}</span>` : ''}
                </div>
                ${a.host || relatedDiscussionLabel(a) ? `<div class="text-xs text-gray-500 mt-0.5">${a.host ? `（主持人：${esc(a.host)}）` : ''}${relatedDiscussionLabel(a) ? `${a.host ? ' · ' : ''}${relatedDiscussionLabel(a)}` : ''}</div>` : ''}
              </div>
            </div>
            ${a.agendaStep === 'discussion'
              ? `<div class="text-xs text-gray-500 mt-2">讨论过程项；表态与决议结果记录在关联表决项</div>`
              : (a.id ? `<div class="vote-widget-slot" data-vote-item-id="${esc(a.id)}"></div>` : '<div class="text-[11px] text-gray-500 mt-2">该条无表决编号，仅作议程记录。</div>')}
          </div>`).join('')}
      </div>
    </div>`;
  } else if (agendaList.length > 0) {
    // 只读议程列表（线下活动等非表决场景）：item + host + result 徽标；kinds 从略，不渲染投票
    agendaAreaHtml = `
    <!-- 会议议程（只读列表：线下活动 / async 未达表决挂载条件） -->
    <div id="agenda-readonly-section" class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">会议议程</h3>
      <div class="space-y-3">
        ${agendaList.map((a, i) => `
          <div class="card rounded-xl p-4">
            <div class="flex items-start gap-2 text-sm">
              <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-700">${esc(a.item)}</span>
                  ${agendaStepBadge(a)}
                  ${agendaResultBadge(a.result)}
                </div>
                ${a.host || relatedDiscussionLabel(a) ? `<div class="text-xs text-gray-500 mt-0.5">${a.host ? `（主持人：${esc(a.host)}）` : ''}${relatedDiscussionLabel(a) ? `${a.host ? ' · ' : ''}${relatedDiscussionLabel(a)}` : ''}</div>` : ''}
                ${a.agendaStep === 'discussion' ? '<div class="text-xs text-gray-500 mt-1">讨论过程项；表态与决议结果记录在关联表决项</div>' : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(act, 'act')}
        <span class="tint-pill" data-tone="${tagTone}">${act.type || '活动'}</span>
        <span class="text-xs text-gray-500">${act.id}</span>
        <span class="ml-auto flex items-center gap-3">
          ${renderShareButtonHtml()}
        </span>
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${act.title || '未命名活动'}</h2>
      <p class="text-sm text-gray-500 mt-1">${act.date || '—'}${act.location ? ' · ' + act.location : ''}</p>
      ${_nextStepRowHtml(act, {
        role: myRole,
        isOrganizer: organizerId === myId,
        showSignup: showSignupCard,
        canTransfer: canInitiateTransfer && !!organizerId,
        agendaHref: agendaList.length === 0 ? '' : (isAsyncVote ? '#async-vote-section' : '#agenda-readonly-section'),
      })}
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">组织者</p>
        <p class="text-sm font-medium text-gray-800">${organizerId
          ? esc(organizerName)
          : '<span class="text-gray-500">未指定 · 由支书 / 组织委员在活动工作组成员中指定</span>'}</p>
        ${act.organizerExceptionReason ? `<p class="mt-1 text-xs leading-5 text-gray-500">跨组说明：${esc(act.organizerExceptionReason)}</p>` : ''}
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">活动方向</p>
        <p class="text-sm font-medium text-gray-800">${act.direction === 'bottom-up' ? '自下而上（党小组发起）' : '自上而下（支部部署）'}</p>
      </div>
      ${act.time ? `<div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">时间</p>
        <p class="text-sm font-medium text-gray-800">${esc(act.time)}</p>
      </div>` : ''}
      ${act.host ? `<div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-500 mb-0.5">主持人 / 承办</p>
        <p class="text-sm font-medium text-gray-800">${esc(act.host)}</p>
      </div>` : ''}
      ${act.description ? `<div class="rounded-xl bg-gray-50 px-4 py-3 col-span-2">
        <p class="text-xs text-gray-500 mb-0.5">活动说明</p>
        <p class="text-sm font-medium text-gray-800 whitespace-pre-wrap">${esc(act.description)}</p>
      </div>` : ''}
    </div>

    ${showSignupCard ? `<div id="activity-signup-section">${renderSignupSection({ sourceType: 'activity', sourceId: act.id, source: act, title: act.title, signups, myId })}</div>` : ''}

    ${signupClosed ? `
    <!-- 报名已关闭（批次 123）：成员侧就地说清为什么报不了名，不静默消失 -->
    <div class="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-3 mb-6 text-xs text-gray-500">
      报名已关闭
    </div>` : ''}
    ${canCloseSignup ? `
    <!-- 报名管理（批次 123）：只对本场组织者 / 支书呈现，非组织者看不到该动作 -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-3 mb-6">
      <span class="text-xs text-gray-500">报名管理</span>
      <button id="signup-close-btn" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">关闭报名</button>
    </div>` : ''}

    ${brandCardHtml}
    ${reviewRequestCardHtml}
    ${transferCardHtml}

    <!-- 报名名单 -->
    ${canRevealMemberNames
      ? renderSignupList({ sourceType: 'activity', sourceId: act.id, source: act, signups, myId })
      : `<section class="mt-5 border-t border-gray-100 pt-4" aria-label="活动人员数量"><h3 class="text-sm font-semibold text-gray-800">活动人员概况</h3><p class="mt-1 text-xs text-gray-600">工作组：组织者 ${workgroupRoleCounts.organizer} 人、深度参与者 ${workgroupRoleCounts.deep} 人；已通过报名 ${approvedSignupCount} 人；待审核 ${pendingSignupCount} 人。</p><p class="mt-1 text-xs text-gray-500">当前无权查看人员名单。</p></section>`}

    ${agendaAreaHtml}

    ${reportsSummaryHtml}

    ${formalRoster ? `<!-- 三会一课使用明确应到名单（冻结快照优先 / 未冻结按 roster 现算），不显示活动报名和工作组分工编辑 -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">应到名单（${assignments.length}）${frozenRoster ? '<span class="ml-2 text-[11px] font-normal text-gray-500">已冻结</span>' : '<span class="ml-2 text-[11px] font-normal text-gray-500">未冻结 · 按当前在册现算</span>'}</h3>
      ${assignments.length === 0
        ? '<p class="text-sm text-gray-500">暂无应到名单：请先在名册登记成员的发展阶段（组织委员可在名册补）</p>'
        : !canRevealMemberNames
          ? `<p class="text-sm text-gray-600">应到名单 ${assignments.length} 人。登录并进入所属支部后可查看姓名。</p>`
          : `<div class="flex flex-wrap gap-2.5">${assignments.map(x => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:${typeColor.color};">${(getPersonById(x.personId)?.name || '?').slice(0, 1)}</span>
              <span class="text-xs font-medium text-gray-700">${esc(getPersonById(x.personId)?.name || x.personId)}</span>
            </span>`).join('')}</div>`}
    </div>` : (canRevealMemberNames ? `${renderWorkgroupMemberEditor({
      workgroupId, kind: 'activity', canEdit: canEditMembers, members: editorMembers,
      grants: memberGrants, participants: participantSignups, legacyRows: legacyParticipants,
    })}${memberGrantsError ? `<p class="mt-2 text-xs text-red-700" role="status">${esc(memberGrantsError)}。为避免覆盖现有授权，成员编辑暂不可用。</p>` : ''}` : '')}

    <!-- 工作分工（服务端表 assignments · 2026-10-03 批次 359 · D-750 续答「全 CRUD」）：
         与上面「参与人员」（活动内联的**项目角色数组**）**不是同一份数据**——本块列**一件件具体工作**。
         可见性＝全员；增 / 改 / 删键按「本场组织者 ∪ 支委层」显隐（判据单一源在服务层）。 -->
    <div class="mt-6" id="work-assignments-host"></div>
  `;

  // 报名区 select 增强为统一自定义下拉（本页无 bootstrap 全局 MutationObserver）
  enhanceSelects(cardEl);
  bindSignupEvents({ sourceType: 'activity', sourceId: act.id, source: act, title: act.title, myId, cardEl });
  bindShareButton(cardEl);
  if (canViewWorkgroupReports) {
    bindReportInbox(cardEl, {
      role: reportInboxRole,
      scope: { workgroupId },
      onAnswered: () => renderActivity(act.id),
    });
  }
  bindWorkgroupMemberEditor(cardEl, { onSaved: async () => {
    // 落库裁决交给 showToast（旧实现 catch 吞错后仍报成功）；只有确认成功才刷新，失败留在页面上可读
    const outcome = await showToast('success', '活动工作组成员与权限已保存');
    if (outcome.ok) window.location.reload();
  } });

  // 工作分工块（批次 359 · `D-750` 续答）：块内**局部重渲染**（编辑态一变只重画本块，不动页面其余部分）
  const waHost = cardEl.querySelector('#work-assignments-host');
  if (waHost) {
    waHost.innerHTML = _renderWorkAssignments(workRows, canManageWork, canRevealMemberNames);
    enhanceSelects(waHost);
    _mountWaPicker(waHost, null); // 初始只读态无表单 ⇒ 空转；留着以备将来默认展开新增表单
  }
  _bindWorkAssignments(cardEl, act, myId, myRole, canRevealMemberNames);

  // 「关闭报名」（批次 123）：二次确认（关闭后无「重新开放」入口，属不可逆动作）→ 落库 → 结算 → 刷新。
  // 放行判据在 closeActivitySignup 内复算一次（呈现/动作同源 canCloseActivitySignup），点了没反应＝放行被挡。
  cardEl.querySelector('#signup-close-btn')?.addEventListener('click', () => {
    _openConfirm({
      title: '关闭本场报名',
      message: '确认关闭本场报名？',
      consequence: '关闭后成员不能再新报；已报名者仍可自行取消。',
      confirmLabel: '关闭报名',
      danger: true,
      onConfirm: async () => {
        const scope = beginWriteScope();
        try {
          const res = await closeActivitySignup(act.id, myId);
          if (!res.ok) { endWriteScope(scope); showToast('error', res.reason || '关闭报名失败'); return; }
          // 本动作自己的写：成功提示只等本次关闭报名的落库；失败则不刷新，提示留在页面上
          const outcome = await showToast('success', '本场报名已关闭', { scope });
          if (outcome.ok) window.location.reload();
        } catch (e) {
          endWriteScope(scope);
          showToast('error', describeWriteError(e));
        }
      },
    });
  });

  // 品牌认定三动作（2026-09-21 批次 132 · 支书口径二「提案 → 支委会通过后确定」）：**认定只能由支委会审议通过产生**。
  //   ① 提案（支委 / 党小组组长）② 撤回提案（提案人或支委层）③ 取消已有认定（支委层，留痕）。
  //   写链单一源 = services/activity/activity.js（落活动主源 → persist/snapshot 写穿服务端）；放行判据在服务函数内复算。
  // 成功提示已含落库裁决（失败会改报 error）；只有确认成功才刷新，失败时提示留在页面上可读
  const afterBrandWrite = async (message) => {
    const outcome = await showToast('success', message);
    if (outcome.ok) window.location.reload();
  };
  cardEl.querySelector('#brand-propose-btn')?.addEventListener('click', () => {
    _openConfirm({
      title: '提交品牌认定提案',
      message: '提交「品牌认定」提案？',
      consequence: '提案只登记待议，须经支委会审议通过后才认定为品牌活动。',
      confirmLabel: '提交提案',
      onConfirm: async () => {
        const res = proposeBrandDesignation({ activityId: act.id, by: myId, role: myRole });
        if (!res.ok) { showToast('error', res.reason || '提案失败'); return; }
        await afterBrandWrite('已提交品牌认定提案（进支委会「拟上会」清单）');
      },
    });
  });
  cardEl.querySelector('#brand-withdraw-btn')?.addEventListener('click', () => {
    _openConfirm({
      title: '撤回品牌认定提案',
      message: '撤回该活动的品牌认定提案？',
      consequence: '撤回后提案回到未提状态。',
      confirmLabel: '撤回提案',
      onConfirm: async () => {
        const res = withdrawBrandProposal({ activityId: act.id, by: myId, role: myRole });
        if (!res.ok) { showToast('error', res.reason || '撤回失败'); return; }
        await afterBrandWrite('已撤回品牌认定提案');
      },
    });
  });
  cardEl.querySelector('#brand-revoke-btn')?.addEventListener('click', () => {
    _openConfirm({
      title: '取消品牌认定',
      message: '确认取消本场的品牌认定？',
      consequence: '将留痕取消人与时间；重新认定为品牌仍须支委会审议通过。',
      confirmLabel: '取消认定',
      danger: true,
      onConfirm: async () => {
        const res = revokeBrandDesignation({ activityId: act.id, by: myId, role: myRole });
        if (!res.ok) { showToast('error', res.reason || '取消失败'); return; }
        await afterBrandWrite('已取消品牌认定');
      },
    });
  });

  // 追加复盘要求两动作（2026-09-21 批次 135 · 裁定二「按推荐档落」）：① 要求组织者复盘（支委会全体）
  //   ② 撤回要求（发起人或支委会）。要求须写明一句内容；写链单一源＝services/activity/activity.js，放行在服务内复算。
  cardEl.querySelector('#review-request-btn')?.addEventListener('click', () => {
    _openNotePrompt({
      title: '要求组织者复盘',
      label: '要求内容',
      placeholder: '如「请补充这次活动的改进建议」',
      confirmLabel: '发起要求',
      onConfirm: async (note) => {
        const res = requestOrganizerReview({ activityId: act.id, by: myId, role: myRole, note });
        if (!res.ok) { showToast('error', res.reason || '发起失败'); return; }
        await afterBrandWrite('已要求组织者复盘（进本场关闭判据，只判到「交回」）');
      },
    });
  });
  cardEl.querySelector('#review-request-withdraw-btn')?.addEventListener('click', () => {
    _openConfirm({
      title: '撤回复盘要求',
      message: '撤回本场的追加复盘要求？',
      consequence: '撤回后本场不再要求组织者补交复盘。',
      confirmLabel: '撤回要求',
      onConfirm: async () => {
        const res = withdrawReviewRequest({ activityId: act.id, by: myId, role: myRole });
        if (!res.ok) { showToast('error', res.reason || '撤回失败'); return; }
        await afterBrandWrite('已撤回追加复盘要求');
      },
    });
  });

  // 转交组织者（2026-10-01 批次 327 · SOP-G-2-② · 支书裁「乙：直接转交 ＋ 留痕」）：
  //   入口只此一挂点；判据 / 写口 / 弹窗全在 organizer-transfer.js（单一源）。转交成功后整页重载，
  //   让「组织者 / 任务 / 通知发布归到新人」这件事实在本页即时可见。
  cardEl.querySelector('#organizer-transfer-btn')?.addEventListener('click', () => {
    openOrganizerTransfer({
      subject: 'activity', scopeRef: act.id, subjectName: act.title,
      onDone: () => window.location.reload(),
    });
  });
  // 「下一步」行只借既有转交按钮（动作本体仍在下方转交卡，单一实现）。
  cardEl.querySelectorAll('[data-next-transfer]').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById('organizer-transfer-btn')?.click());
  });
  // A03：无组织者 → 滚到既有「活动工作组成员」编辑（把一人设为组织者）；不新造第二套指定表单。
  cardEl.querySelector('#organizer-designate-btn')?.addEventListener('click', () => {
    const editor = cardEl.querySelector('[data-workgroup-member-editor]');
    if (!editor) return;
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    editor.querySelector('[data-wg-person-picker], [data-wg-add], summary')?.focus();
  });

  // 线上异步表决区（AV4.5）：加载后 fetchVotes → 逐条议程渲染表决组件；
  // vote-submitted 冒泡（detail.agendaItemId）→ 重拉该条表态并重绘（支持覆盖表态/多议程各自刷新）。
  const voteSection = cardEl.querySelector('#async-vote-section');
  if (voteSection && currentUser) {
    const renderAllVoteWidgets = async () => {
      const votes = await fetchVotes(act.id);
      voteSection.querySelectorAll('.vote-widget-slot').forEach(slot => {
        const item = (act.agenda || []).find(x => x.id === slot.dataset.voteItemId);
        if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: currentUser.personId, canVote });
      });
    };
    renderAllVoteWidgets().catch(e => console.warn('[activity-entry] 表态数据加载失败：', e));
    voteSection.addEventListener('vote-submitted', (e) => {
      const itemId = e.detail?.agendaItemId;
      const slot = itemId ? voteSection.querySelector(`[data-vote-item-id="${CSS.escape(itemId)}"]`) : null;
      if (!slot) return;
      fetchVotes(act.id)
        .then(votes => {
          const item = (act.agenda || []).find(x => x.id === itemId);
          if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: currentUser.personId, canVote });
        })
        .catch(err => console.warn('[activity-entry] 表态刷新失败：', err));
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  专班详情
// ════════════════════════════════════════════════════════════════

async function renderTaskforce(tf) {
  if (!cardEl) return;
  const allMemberRows = Array.isArray(tf.members) ? tf.members : [];
  const legacyRows = legacyParticipantAssignmentRows(allMemberRows);
  const workgroupId = tf.workgroupId || `wg-taskforce-${tf.id}`;
  const workgroup = mockDB.workgroups.find((row) => row.id === workgroupId) || null;
  const canRevealMemberNames = canRevealActivityMemberNames({ ...tf, branchId: tf.branchId || workgroup?.branchId }, currentUser, selectedBranchId);
  const initiatorName = tf.initiator
    ? (canRevealMemberNames ? (getPersonById(tf.initiator)?.name || tf.initiator) : '组织者 1 人')
    : '—';
  const isClosedTaskforce = isTaskforceTerminalStatus(tf.status);
  const storedMembers = mockDB.workgroupMembers.filter((row) => row.workgroupId === workgroupId && row.status !== 'removed');
  const members = storedMembers.length ? workgroupMembers(storedMembers) : workgroupMembers(allMemberRows);
  // 本工作组汇报汇总（批次 500 · B-499-2）：与活动详情同一读口与同一范围过滤。
  await IssueStore.loadAll();
  const isCommittee = !!currentUser && AuthStore.isCommissioner(currentUser.role);
  const reportInboxRole = currentUser?.role || 'participant';
  const visibleReports = IssueStore.getVisibleReports();
  const workgroupReports = filterReportsByScope(visibleReports, { workgroupId });
  const canViewWorkgroupReports = isCommittee
    || members.some((row) => row.personId === myId && row.role === 'organizer');
  const reportsSummaryHtml = canViewWorkgroupReports ? `
    <!-- 本工作组汇报汇总：复用汇报收件箱（reporting.js），按 workgroupId 过滤；可展开。 -->
    <details class="mt-6 border-t border-gray-100 pt-5" id="workgroup-reports-summary">
      <summary class="cursor-pointer select-none text-sm font-semibold text-gray-800">本工作组汇报汇总 <span class="tabular-nums text-gray-500">${workgroupReports.length}</span></summary>
      <div class="mt-2">
        ${renderReportInboxHtml({
          reports: visibleReports,
          scope: { workgroupId },
          title: '本工作组汇报',
          subtitle: `${workgroupReports.length} 条 · 行内答复`,
          role: reportInboxRole,
          emptyMsg: '— 本工作组暂无汇报 · 下一步：工作组组织者可在「我的处置」发起汇报，或请成员就本事项汇报',
        })}
      </div>
    </details>` : '';
  const canManageMembers = !!workgroup && !isClosedTaskforce && (SECRETARY_AND_DEPUTY_ROLES.includes(currentUser?.role) || currentUser?.role === 'org-commissioner');
  let grants = [];
  let grantsLoaded = !canManageMembers;
  let grantsError = '';
  if (canManageMembers) {
    try { grants = await getAdapter().workgroups.grants.list(workgroupId); grantsLoaded = true; }
    catch (error) { grantsError = error?.message || '读取工作组授权失败'; }
  }
  let tasks = mockDB.workgroupTasks.filter((row) => row.workgroupId === workgroupId);
  let outputs = mockDB.workgroupOutputs.filter((row) => row.workgroupId === workgroupId);
  let workDataError = '';
  try {
    [tasks, outputs] = await Promise.all([
      TaskForceRecordStore.listWorkgroupTasks(tf.id),
      TaskForceRecordStore.listWorkgroupOutputs(tf.id),
    ]);
  } catch (error) {
    workDataError = error?.message || '任务与产出读取失败';
  }
  const taskStatus = { open: '待开始', in_progress: '进行中', completed: '已完成', cancelled: '已取消' };
  // D17：`accepted / archived` 没有迁移写口（产出写口只产 `submitted`）⇒ 不再展示不可达状态，
  //   历史行统一按「已登记」呈现（不伪造「已采纳 / 已归档」）。
  const outputStatus = { submitted: '已登记', pending: '待处理' };
  // A04：本栏语义是「工作考察」——按稳定父键 workgroupId 读 inspection 记录，
  //   不再按专班名称匹配复盘（名称可改名、可重名，不是判据）。
  const inspectionRecords = getRecordsBySource(SourceType.TASKFORCE, workgroupId);
  // A12：主要任务空态给写入口 / 明确补录落点（组织者 / 组织委员）。
  const canEditTaskforceTask = currentUser?.role === 'org-commissioner';
  const taskforceManageHref = `${getBasePath()}workspace/org.html?taskforceId=${encodeURIComponent(tf.id)}`;
  const taskEmptyActionHtml = canEditTaskforceTask
    ? `<a href="${taskforceManageHref}" class="text-accent hover:underline" style="text-decoration:none;">去组织台「专班管理」补录 →</a>`
    : '<span class="text-gray-500">组织委员可在组织台「专班管理」补录</span>';
  const taskEmptyHtml = `尚未登记主要任务 · ${taskEmptyActionHtml}`;

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(tf, 'tf')}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">专班</span>
        <span class="text-xs text-gray-500">${tf.id}</span>
        <span class="ml-auto">${renderShareButtonHtml()}</span>
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${esc(tf.name || '未命名专班')}</h2>
      <p class="text-sm text-gray-500 mt-1">${tf.task ? esc(tf.task) : taskEmptyHtml}</p>
    </div>

    <!-- 基本信息 -->
    <dl class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class="rounded-xl bg-gray-50 px-4 py-3"><dt class="text-xs text-gray-500">发起人</dt><dd class="mt-1 text-sm font-medium text-gray-800">${esc(initiatorName)}</dd></div>
      <div class="rounded-xl bg-gray-50 px-4 py-3"><dt class="text-xs text-gray-500">创建时间</dt><dd class="mt-1 text-sm font-medium text-gray-800">${esc(tf.createdAt || '—')}</dd></div>
    </dl>

    ${reportsSummaryHtml}

    ${isClosedTaskforce ? '<p class="mb-2 text-xs text-gray-500">工作组已结束，成员与授权记录只读保留。</p>' : ''}
    ${canRevealMemberNames
      ? renderWorkgroupMemberEditor({ workgroupId, kind: 'taskforce', canEdit: canManageMembers && grantsLoaded, members, grants, legacyRows })
      : `<section class="mt-5 border-t border-gray-100 pt-4" aria-label="专班工作组成员数量"><h3 class="text-sm font-semibold text-gray-800">工作组成员</h3><p class="mt-1 text-xs text-gray-600">组织者 ${members.filter((row) => row.role === 'organizer').length} 人、深度参与者 ${members.filter((row) => row.role === 'deep').length} 人；专班成员仅登记工作分工，不纳入活动报名或考勤。</p><p class="mt-1 text-xs text-gray-500">当前无权查看人员名单。</p></section>`}
    ${grantsError ? `<p class="mt-2 text-xs text-red-700" role="status">${esc(grantsError)}。为避免覆盖现有授权，成员编辑暂不可用。</p>` : ''}

    <section class="mt-6 border-t border-gray-100 pt-5" aria-labelledby="taskforce-work-title">
      <h3 id="taskforce-work-title" class="text-sm font-semibold text-gray-800">登记任务（${tasks.length}）</h3>
      ${workDataError ? `<p class="mt-2 text-xs text-red-700" role="status">${esc(workDataError)}。下方仅显示当前缓存结果。</p>` : ''}
      ${tasks.length ? `<ul class="mt-2 space-y-2">${tasks.map((task) => `<li class="rounded-lg bg-gray-50 px-3 py-2">
        <div class="flex flex-wrap items-center gap-2"><span class="text-sm font-medium text-gray-800">${esc(task.title || task.name || '未命名任务')}</span><span class="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">${esc(taskStatus[task.status] || task.status || '未设状态')}</span></div>
        ${task.activityId ? `<p class="mt-1 text-xs text-gray-500">关联活动：${esc(mockDB.activities.find((row) => row.id === task.activityId)?.title || task.activityId)}</p>` : ''}
      </li>`).join('')}</ul>` : `<p class="mt-2 text-sm text-gray-500">暂无登记任务 · ${taskEmptyActionHtml}</p>`}
    </section>
    <section class="mt-5 border-t border-gray-100 pt-5" aria-labelledby="taskforce-output-title">
      <h3 id="taskforce-output-title" class="text-sm font-semibold text-gray-800">工作产出（${outputs.length}）</h3>
      ${outputs.length ? `<ul class="mt-2 space-y-2">${outputs.map((output) => `<li class="rounded-lg bg-gray-50 px-3 py-2">
        <div class="flex flex-wrap items-center gap-2"><span class="text-sm font-medium text-gray-800">${esc(output.title || '未命名产出')}</span><span class="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">${esc(outputStatus[output.status] || '已登记')}</span></div>
        ${output.activityId ? `<p class="mt-1 text-xs text-gray-500">关联活动：${esc(mockDB.activities.find((row) => row.id === output.activityId)?.title || output.activityId)}</p>` : ''}
      </li>`).join('')}</ul>` : '<p class="mt-2 text-sm text-gray-500">暂无登记产出。</p>'}
    </section>
    <section class="mt-5 border-t border-gray-100 pt-5" aria-labelledby="taskforce-appraisal-title">
      <h3 id="taskforce-appraisal-title" class="text-sm font-semibold text-gray-800">工作考察（${inspectionRecords.length}）</h3>
      ${inspectionRecords.length ? `<ul class="mt-2 space-y-2">${inspectionRecords.map((record) => `
        <li class="rounded-lg bg-gray-50 px-3 py-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${esc(getPersonById(record.personId)?.name || record.personId)}</span>
            <span class="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">${esc(PARTICIPATION_LEVEL_LABELS[record.level] || record.level || record.role || '考察记录')}</span>
            <span class="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">${record.returnedBy ? '已打回' : (record.status === 'confirmed' ? '已确认' : '待确认')}</span>
          </div>
          ${record.content || record.role ? `<p class="mt-1 whitespace-pre-wrap text-xs text-gray-600">${esc(record.content || record.role)}</p>` : ''}
          <p class="mt-1 text-xs text-gray-500">记录人：${esc(getPersonById(record.recordedBy)?.name || record.recordedBy || '—')}${record.recordedAt ? ` · ${esc(String(record.recordedAt).slice(0, 10))}` : ''}</p>
        </li>`).join('')}</ul>` : '<p class="mt-2 text-sm text-gray-500">暂无工作考察记录（可由专班组织者 / 纪检委员在考察管理录入）。</p>'}
    </section>
  `;

  bindShareButton(cardEl);
  if (canViewWorkgroupReports) {
    bindReportInbox(cardEl, {
      role: reportInboxRole,
      scope: { workgroupId },
      onAnswered: () => renderTaskforce(tf),
    });
  }
  bindWorkgroupMemberEditor(cardEl, { onSaved: async () => {
    // 与活动工作组同口径：落库裁决交给 showToast，失败不刷新、提示可见
    const outcome = await showToast('success', '专班工作组成员与权限已保存');
    if (outcome.ok) window.location.reload();
  } });
}

// ════════════════════════════════════════════════════════════════
//  工作分工块（`assignments` 表 · 2026-10-03 批次 359 · `D-750` 续答「全 CRUD」）
//  ⚠ 与「参与人员」（活动内联的**项目角色数组** `act.assignments`）**不是同一份数据**：
//    本块列的是**一件件具体工作**（工作名 / 说明 / 截止 / 负责人 / 状态），服务端表 `assignments`（`README-server.md §4.7`）。
//  ⚠ 术语（`D-750` 术语禁令）：本面＝「**项目分工 / 事上见**」；**不得**称「常备性分工」。
//  编辑态由 `_waEditing` 驱动（`null`＝只读态 | `'new'`＝新增表单 | 某行 id＝该行编辑表单）⇒ **整块局部重渲染**。
// ════════════════════════════════════════════════════════════════
let _waEditing = null;
/** 负责人选人器（每次渲染重建一份；`PersonPicker` 是「选名单成员」的单一源 —— `filter-row::S9`） */
let _waPicker = null;

/** 新增 / 编辑共用表单（`row` 为空＝新增态；否则为编辑态且多一格「状态」）
 *  ⚠ 负责人**不用下拉**：`filter-row::S9` 只放行「任命 / 指派到人」四处例外、且明禁新代码长出第 5 处 ⇒ 走 `PersonPicker`。 */
function _waFormHtml(row) {
  const r = row || {};
  const statusCell = row
    ? `<label for="wa-status" class="visually-hidden">状态</label><select id="wa-status" class="input-flat text-xs" data-wa-field="status">${Object.entries(WORK_ASSIGNMENT_STATUS_LABELS)
      .map(([v, t]) => `<option value="${v}"${r.status === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`
    : '<span></span>';
  return `
    <div class="rounded-xl border border-neutral-200 bg-white p-3 mb-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label for="wa-work-name" class="visually-hidden">工作名称</label>
        <input id="wa-work-name" class="input-flat text-xs" placeholder="工作名称（必填）" value="${esc(r.workName || '')}" data-wa-field="workName">
        <label for="wa-ddl" class="visually-hidden">截止日期</label>
        <input id="wa-ddl" type="date" class="input-flat text-xs" value="${esc(r.ddl || '')}" data-wa-field="ddl">
        <label for="wa-work-description" class="visually-hidden">工作说明</label>
        <input id="wa-work-description" class="input-flat text-xs md:col-span-2" placeholder="工作说明（选填）" value="${esc(r.workDescription || '')}" data-wa-field="workDescription">
        <div class="wa-assignee-host" style="min-height:38px;"></div>
        ${statusCell}
      </div>
      <div class="flex items-center justify-end gap-2 mt-2">
        <button type="button" class="btn-outline wa-cancel-btn text-xs px-3 py-1.5" style="cursor:pointer;">取消</button>
        <button type="button" class="btn-accent wa-save-btn text-xs px-3 py-1.5" data-row-id="${row ? esc(row.id) : ''}">${row ? '保存' : '新增'}</button>
      </div>
    </div>`;
}

/** 把「负责人」选人器挂进当前表单（表单不在位时清空引用） */
function _mountWaPicker(scope, row) {
  _waPicker = null;
  const box = scope?.querySelector('.wa-assignee-host');
  if (!box) return;
  _waPicker = new PersonPicker({
    mode: 'single',
    placeholder: '负责人（选名单成员）',
    initialIds: (row && row.assigneeId) ? [row.assigneeId] : [],
  });
  _waPicker.render(box);
}

/** 只读行（工作名 / 负责人 · 截止 · 说明 / 状态；管理键按 `canManage` 显隐） */
function _waRowHtml(row, canManage, canRevealNames = true) {
  const who = row.assigneeId ? (canRevealNames ? (getPersonById(row.assigneeId)?.name || row.assigneeId) : '负责人已登记') : '未指定';
  const st = WORK_ASSIGNMENT_STATUS_LABELS[row.status] || row.status;
  const stClass = row.status === WORK_ASSIGNMENT_STATUS.COMPLETED ? 'text-green-700 bg-green-50'
    : (row.status === WORK_ASSIGNMENT_STATUS.IN_PROGRESS ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50');
  return `
    <div class="flex items-start gap-2.5 py-2 border-b border-gray-50" data-wa-row="${esc(row.id)}">
      <span class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${stClass}">${esc(st)}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-gray-800 truncate">${esc(row.workName)}</p>
        <p class="text-xs text-gray-500 truncate">${esc(who)}${row.ddl ? ' · 截止 ' + esc(String(row.ddl).slice(0, 10)) : ''}${row.workDescription ? ' · ' + esc(row.workDescription) : ''}</p>
      </div>
      ${canManage ? `
      <span class="flex items-center gap-1.5 flex-shrink-0">
        ${row.status !== WORK_ASSIGNMENT_STATUS.COMPLETED ? `<button type="button" class="btn-outline wa-advance-btn text-xs px-2 py-0.5" data-row-id="${esc(row.id)}" style="cursor:pointer;">${row.status === WORK_ASSIGNMENT_STATUS.PENDING ? '开工' : '完成'}</button>` : ''}
        <button type="button" class="btn-outline wa-edit-btn text-xs px-2 py-0.5" data-row-id="${esc(row.id)}" style="cursor:pointer;">编辑</button>
        <button type="button" class="btn-danger wa-del-btn text-xs px-2 py-0.5" data-row-id="${esc(row.id)}" style="cursor:pointer;">删除</button>
      </span>` : ''}
    </div>`;
}

/** 整块 HTML（宿主为 `#work-assignments-host`） */
function _renderWorkAssignments(rows, canManage, canRevealNames = true) {
  const formOpen = _waEditing === 'new';
  return `
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-gray-700">工作分工（${rows.length}）</h3>
      ${canManage && !formOpen ? '<button type="button" class="btn-tab wa-new-btn text-xs px-3 py-1.5" style="cursor:pointer;">新增分工</button>' : ''}
    </div>
    ${formOpen ? _waFormHtml(null) : ''}
    ${rows.length === 0 && !formOpen ? '<p class="text-sm text-gray-500">本场尚未安排工作分工。</p>' : ''}
    ${rows.map((r) => (_waEditing === r.id ? _waFormHtml(r) : _waRowHtml(r, canManage, canRevealNames))).join('')}
  `;
}

/** 事件委托（宿主上的 `dataset.waBound` 防重复绑定；块内重渲染不影响委托） */
function _bindWorkAssignments(cardEl, act, myId, role, canRevealNames = true) {
  const host = cardEl.querySelector('#work-assignments-host');
  if (!host || host.dataset.waBound) return;
  host.dataset.waBound = '1';
  const rerender = () => {
    const rows = listWorkAssignments(act.id);
    host.innerHTML = _renderWorkAssignments(rows, canManageWorkAssignments(act, myId, role), canRevealNames);
    enhanceSelects(host);
    // 「负责人」选人器随表单重建（`_waEditing` 为某行 id 时预选该行现有负责人）
    _mountWaPicker(host, rows.find((r) => r.id === _waEditing) || null);
  };
  const rowOf = (id) => listWorkAssignments(act.id).find((r) => r.id === id);
  host.addEventListener('click', async (e) => {
    if (e.target.closest('.wa-new-btn')) { _waEditing = 'new'; rerender(); return; }
    if (e.target.closest('.wa-cancel-btn')) { _waEditing = null; rerender(); return; }
    const editBtn = e.target.closest('.wa-edit-btn');
    if (editBtn) { _waEditing = editBtn.dataset.rowId; rerender(); return; }
    const advBtn = e.target.closest('.wa-advance-btn');
    if (advBtn) {
      const row = rowOf(advBtn.dataset.rowId);
      if (!row) return;
      const next = row.status === WORK_ASSIGNMENT_STATUS.PENDING
        ? WORK_ASSIGNMENT_STATUS.IN_PROGRESS : WORK_ASSIGNMENT_STATUS.COMPLETED;
      await updateWorkAssignment(row.id, { status: next });
      showToast('success', `「${row.workName}」已标记为「${WORK_ASSIGNMENT_STATUS_LABELS[next]}」`);
      rerender();
      return;
    }
    const delBtn = e.target.closest('.wa-del-btn');
    if (delBtn) {
      const row = rowOf(delBtn.dataset.rowId);
      if (!row) return;
      _openConfirm({
        title: '删除工作分工',
        message: `删除工作「${row.workName}」？`,
        consequence: '删除后不可恢复。',
        confirmLabel: '删除',
        danger: true,
        onConfirm: async () => {
          await removeWorkAssignment(row.id);
          showToast('success', '已删除该条工作分工');
          rerender();
        },
      });
      return;
    }
    const saveBtn = e.target.closest('.wa-save-btn');
    if (saveBtn) {
      const form = saveBtn.closest('div.rounded-xl');
      const val = (k) => form?.querySelector(`[data-wa-field="${k}"]`)?.value ?? '';
      const workName = String(val('workName') || '').trim();
      if (!workName) {
        showToast('error', '请填写工作名称');
        form?.querySelector('#wa-work-name')?.focus();
        return;
      }
      const payload = { workName, workDescription: val('workDescription'), ddl: val('ddl'), assigneeId: (_waPicker?.getSelected() || [])[0] || '' };
      const rowId = saveBtn.dataset.rowId;
      if (rowId) {
        await updateWorkAssignment(rowId, { ...payload, status: val('status') });
        showToast('success', '已保存该条工作分工');
      } else {
        await createWorkAssignment({ activityId: act.id, ...payload, createdBy: myId });
        showToast('success', '已新增一条工作分工');
      }
      _waEditing = null;
      rerender();
    }
  });
}
