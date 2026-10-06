// role: [工程师]+[AI]
// party-committee-meeting-entry.js — 支委会会议页入口（线上召开 · 最小可用闭环；2026-09-20 批次 105 / D-526）
//
// 做什么：把「线上召开支委会」这条链摆在一处——选/建一场支委会并标为线上召开 → 定本场参会范围
//   （支委层 / 扩大为支委扩大会，选定扩大到谁）→ 从**既有来源**提取议程（专班报送 / 意见反馈）→
//   委员在线表态 → 支书汇总并截止 → 留存、查阅讨论结果。
//
// 复用（不另造第二事实源、不新增表）：
//   · 会议实体 = 既有「活动」（type='支委会' / scenarioId='branch-committee'，voteConfig 表决配置）
//   · 表态 = `services/activity/committee-vote.js` + `mockDB.agendaVotes`（既有异步表决机制，本页只挂既有组件）
//   · 汇总/截止 = `components/governance/vote-summary-panel.js`（既有支书端汇总矩阵 + 截止）
//   · 讨论结果留存 = 议程项 result（`services/activity/agenda-follow-up.js::recordAgendaResult`，与
//     inspector「记录会议结果」同一函数）；锁定态 = 活动 `votesLocked`（既有）
//
// 效力口径**已定**（支书 2026-09-20 定案，见 D-538）：线上支委会与线下支委会**完全同等效力**——
//   线上表决与线上记录的讨论结果即终局，不需线下追认。
// 其余三条（讨论结果对外可见范围 / 缺席处理 / 是否并行线下那 9 条任务）**由「完全同等效力」推导**、
//   支书未逐条明答（D-538）——本页**只如实呈现既有记录**，推导获确认前不写任何判定规则。
//
// 数据源装配：与 activity-entry.js / notice-entry.js 同款——有 API 会话时先切数据源并 init() 拉全量
//   再渲染（`module-load.test.mjs::E2` 独立页装配断言要求）。
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261006h';
import { renderHeader } from '../../components/shell/header.js?v=20261006h';
import { hydrateDataSource, notifyDataLoaded, getAdapter, persist } from '../../data/data-adapter.js?v=20261006h';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261006h';
import { mockDB } from '../../core/domain/domain.js?v=20261006h';
import { AuthStore } from '../../services/core/auth.js?v=20261006h';
import { PersonStore, getPersonName } from '../../services/member/person.js?v=20261006h';
import { BranchService } from '../../services/core/runtime.js?v=20261006h';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261006h';
import { IssueStore } from '../../services/governance/issues.js?v=20261006h';
import { resolveVoterIds, defaultVoteConfig, optionSetOf, isAnonymousActivity } from '../../services/activity/vote-config.js?v=20261006h';
import { fetchVotes, tallyForItem } from '../../services/activity/committee-vote.js?v=20261006h';
import { renderVoteWidget } from '../../components/governance/vote-widget.js?v=20261006h';
import { renderVoteSummary } from '../../components/governance/vote-summary-panel.js?v=20261006h';
import { recordAgendaResultForActivity } from '../../services/activity/agenda-follow-up.js?v=20261006h';
// 「拟上会」清单单一源（2026-09-21 批次 127 · `SOP-B-33` 取（乙）档）：本页的「提取议程」
// 与写入活动的议程区块共用**同一张清单**（agenda-form.js::buildAgendaCandidates）——
// 原按来源分两块的呈现（专班报送 / 意见反馈）已按乙档收为一张清单（不按来源各做导入口）。
import { buildAgendaCandidates, AGENDA_CANDIDATE_GROUPS } from '../tabs/secretary/agenda-form.js?v=20261006h';
import { listDocs as listBranchDocs, isAgendaDraftDoc, isInstitutionDraftAgendaItem } from '../../services/branch/branch-doc.js?v=20261006h';
// 党小组组长（含代组长）清单单一源——2026-09-23 支书裁定甲「支委扩大会…党小组组长（代组长）是可以
//   打包的」；**不另造组长名单**（同 services/member/party-group.js 的组清单同源；组内无组长时由该源回落次选身份）
import { listPartyGroups } from '../../services/member/group-view.js?v=20261006h';
import { loadStageEntryDates } from '../../services/member/member-confirmation.js?v=20261006h';
// 品牌认定提案（2026-09-21 批次 132 · 支书口径二「提案 → 支委会通过后确定」）——判据单一源
import { listBrandProposals } from '../../services/activity/activity.js?v=20261006h';
import { showToast, escHtml as esc, todayLocal } from '../../core/base/utils.js?v=20261006h';
import { generateId } from '../../core/base/id.js?v=20261006h';

renderSidebar('dashboard');
renderHeader('dashboard');

const ROOT = document.getElementById('pcm-content');

// ── 数据 hydrate（同 activity-entry.js：有 API 会话走 api 数据源 + init() 拉全量；失败即失败）──────────
// P0-2（2026-09-23）：判定收敛到 data/data-adapter.js::hydrateDataSource（有 token 时不回退可写 mock）。
async function _hydrateData() {
  try {
    const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
    if (!r.ok) return; // 错误态已由共享实现渲染
  } catch (e) {
    console.warn('[party-committee-meeting] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

// ── 基础读取（全部读既有数据源，不复制）────────────────────────────────
/** 支委名单（单一源 = services/activity/vote-config.js::resolveVoterIds('committee')） */
function committeeIds() { return resolveVoterIds('committee'); }
/** 支委会场次（既有活动实体；按日期新→旧） */
function meetings() {
  return (mockDB.activities || [])
    .filter((a) => a && (a.type === '支委会' || a.scenarioId === 'branch-committee'))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
function findAct(id) { return (mockDB.activities || []).find((a) => a.id === id) || null; }
/** 登录人是否在本支部支委名单内（判据单一源＝`resolveVoterIds('committee')`） */
function isCommitteeMember(personId) {
  return !!personId && committeeIds().includes(personId);
}
/** 某场支委会是否「扩大到某人」：本场 `voteConfig.voterIds` 是否包含该人（同一字段，不新增） */
function meetingIncludes(act, personId) {
  return !!personId && Array.isArray(act?.voteConfig?.voterIds) && act.voteConfig.voterIds.includes(personId);
}
/**
 * 本人**可见**的支委会场次（纯函数 · 判据单一源）——支书 2026-09-23 追裁（逐字）：
 *   「**他只能看到扩大到他的支委会！**」——被扩大进支委扩大会的人，看得到的是「扩大到他的那一场」。
 * 口径：
 *   · **支委名单内的人**：全部支委会场次（现状不变）；
 *   · **仅被扩大的人**（不在支委名单）：只含 `voteConfig.voterIds` 包含本人的那些场次——
 *     其余场次**不进下拉、不可选**，经 URL 直指也被拒（见 `render()` 的拒绝分支）。
 * 场次下拉 / 切换 / URL 直指校验一律走本函数，勿另写第二份判据。
 */
function visibleMeetingsFor(personId) {
  const all = meetings();
  if (isCommitteeMember(personId)) return all;
  return all.filter((a) => meetingIncludes(a, personId));
}
function isSecretaryOrDeputy() {
  const r = AuthStore.getCurrentUser()?.role;
  return r === 'secretary' || r === 'deputy-secretary';
}
function isAsync(act) { return !!act && !!act.voteConfig && act.voteConfig.mode === 'async'; }
function isOnlineMeeting(act) { return isAsync(act) && Array.isArray(act.agenda) && act.agenda.some((x) => x && x.id); }

// 页面状态
let currentId = null;

// ════════════════════════════════════════════════════════════════
//  渲染
// ════════════════════════════════════════════════════════════════

/** 进页门被拒的落地态（判据见 render()）：既不在支委名单、也没有任何一场支委会扩大到其范围 */
function renderShellDenied() {
  const role = AuthStore.getCurrentUser()?.role;
  const page = AuthStore.getPageForRole('workspace', role) || 'visitor.html';
  ROOT.innerHTML = `
    <div class="card rounded-xl p-5 text-center">
      <p class="font-title-cn text-base font-bold text-gray-800">你在支委会会议页没有可见的会议</p>
      <p class="text-sm text-gray-500 mt-2">你不在此页可见范围内；可用范围口径见下。</p>
      <details class="mt-2 text-left">
        <summary class="text-xs text-gray-500 cursor-pointer select-none">谁能进本页 ▾</summary>
        <div class="text-xs text-gray-500 leading-5 mt-1">支委（支书 / 副支书 / 组织 / 宣传 / 纪检委员）看得到全部支委会场次；被扩大进某场支委扩大会的人也能进（但只看得到扩大到他的那一场，并在该场表态）。<a href="./help.html#card-copy-pcm-scope" class="text-sky-600 hover:underline">见帮助 · 支委会页可见范围</a></div>
      </details>
      <p class="text-sm mt-4"><a href="./workspace/${esc(page)}" class="text-blue-600 hover:underline">← 返回我的工作台</a></p>
    </div>`;
}

/** 场次不在本人可见范围（URL 直指扩大到他人 / 未扩大到本人的场次，或根本不是支委会场次）：拒绝打开并给根因提示 */
function renderOutOfScope(actId) {
  const act = findAct(actId);
  const isMeeting = !!act && (act.type === '支委会' || act.scenarioId === 'branch-committee');
  const title = isMeeting ? '这场支委会没有扩大到你的范围' : '该场次不是本页的支委会场次';
  const why = isMeeting
    ? `${act ? `「${esc(act.title || '未命名会议')}」（${esc(act.date || '—')}）` : '该场次'}的应到名单里没有你——你不在本支部支委名单内，按「只能看到扩大到他的支委会」的口径，本场不进你的列表、也不能打开；请回到你被扩大到的那几场。`
    : '本页只列支委会（含支委扩大会）场次；该场次不在其中，因此不在此打开。请从上方列表选择要看的支委会场次。';
  ROOT.innerHTML = `
    <div class="card rounded-xl p-5 text-center">
      <p class="font-title-cn text-base font-bold text-gray-800">${title}</p>
      <p class="text-sm text-gray-500 mt-2">${why}</p>
      <p class="text-sm mt-4"><a href="./party-committee-meeting.html" class="text-blue-600 hover:underline">← 回到你可见的支委会场次</a></p>
    </div>`;
}

/** 仅被扩大者（不在支委名单）的可见范围提示：说明为什么只看到这几场 */
function expandedScopeNoticeHtml(n) {
  return `
    <div class="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <p class="text-xs font-semibold text-blue-800">你被扩大进 ${n} 场支委会（支委扩大会）</p>
      <p class="text-[11px] text-blue-800 mt-1.5 leading-relaxed">本页只列扩大到你的那些场次（其余不进列表、直指也打不开）。<a href="./help.html#card-copy-pcm-scope" class="text-sky-600 hover:underline">见帮助 · 支委会页可见范围</a></p>
      <details class="mt-1">
        <summary class="text-[11px] text-blue-800 cursor-pointer select-none">被扩大者的可见与可做 ▾</summary>
        <div class="text-[11px] text-blue-800 leading-5 mt-1">在这几场里你可按应到名单表态、查阅议程与讨论结果；议程提取与范围调整、汇总截止与记录讨论结果归支委侧，不在你的范围内。</div>
      </details>
    </div>`;
}

/** 会议选择区（本人可见的支委会场次 + 新建线上支委会——新建位仅支委） */
function selectSectionHtml() {
  const me = AuthStore.getCurrentUser();
  const committeeViewer = isCommitteeMember(me?.personId);
  // 场次下拉＝本人可见场次单一源（被扩大者只列扩大到他的那些场次）
  const list = visibleMeetingsFor(me?.personId);
  const opts = list.map((a) => {
    const tag = a.votesLocked === true ? '已截止' : (isAsync(a) ? '线上召开' : '线下/未开表决');
    return `<option value="${esc(a.id)}"${a.id === currentId ? ' selected' : ''}>${esc(a.date || '—')} · ${esc(a.title || '未命名')}（${tag}）</option>`;
  }).join('');
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-3">① 选一场支委会（线上召开）</p>
      <div class="flex flex-wrap items-end gap-2">
        <label class="text-xs text-gray-500">现有支委会场次
          <select id="pcm-pick" class="input-flat text-xs mt-1 block" style="min-width:320px">
            ${opts || '<option value="">（暂无支委会场次）</option>'}
          </select>
        </label>
        ${committeeViewer ? `
        <label class="text-xs text-gray-500">新建线上支委会名称（可留空）
          <input id="pcm-new-title" class="input-flat text-xs mt-1 block" style="min-width:240px" placeholder="如：9 月支委会（线上）">
        </label>
        <button id="pcm-create" type="button" class="btn-accent text-xs px-3 py-1.5 font-medium">新建线上支委会</button>` : ''}
      </div>
      <p class="text-[11px] text-gray-500 mt-2">${committeeViewer
        ? '「线上召开」＝沿用既有活动的异步表决配置（支委为应到名单，委员线上表态）。本页不改动活动本身的线下流程设置。'
        : '你是被扩大进本场的人：这里只列<strong>扩大到你的</strong>支委会场次（其余场次不进列表、直指也打不开）。'}</p>
    </div>`;
}

/** 党小组组长（含代组长）候选——单一源 `services/member/group-view.js::listPartyGroups`（组内无组长时由该源回落次选身份） */
function groupLeaderOptions() {
  const seen = new Set();
  const out = [];
  for (const g of listPartyGroups()) {
    if (!g.leaderId || seen.has(g.leaderId)) continue;
    seen.add(g.leaderId);
    out.push({ id: g.leaderId, groupName: g.groupName });
  }
  return out;
}

/**
 * 本场参会范围（支委层 / 支委扩大会）——支书 2026-09-23 裁定甲：
 *   支委会与支委扩大会**都是法人性质**；支委扩大会可**选择扩大到谁**，党小组组长（代组长）可**打包**。
 * 落点＝本场活动的**既有**应到名单字段 `voteConfig.voterIds`（与表态门 / 汇总同一口径，单一源
 *   `services/activity/vote-config.js::resolveVoterIds('committee')`）——**不新增字段**。
 * 未勾「扩大会」时保存回 = 支委层名单，与现状逐字一致。
 * 可编辑面**仅支委**（既有渲染条件保持不变）：被扩大进本场的人只能看范围与表态，改不了名单。
 */
function scopeSectionHtml(act) {
  const voterIds = Array.isArray(act.voteConfig?.voterIds) ? act.voteConfig.voterIds : [];
  const committee = committeeIds();
  const expandedIds = voterIds.filter((id) => !committee.includes(id));
  const editable = isCommitteeMember(AuthStore.getCurrentUser()?.personId);
  const leaders = groupLeaderOptions();
  const leaderRows = leaders.length ? leaders.map((g) => `
      <label class="flex items-center gap-2 text-xs py-1">
        <input type="checkbox" class="pcm-expand-person" value="${esc(g.id)}"${expandedIds.includes(g.id) ? ' checked' : ''}>
        <span class="text-gray-700">${esc(getPersonName(g.id) || g.id)}</span>
        <span class="text-gray-400">${esc(g.groupName)} 组长</span>
        ${committee.includes(g.id) ? '<span class="text-[11px] text-gray-400">（已是支委）</span>' : ''}
      </label>`).join('')
    : '<p class="text-xs text-gray-400">当前没有在册的党小组组长（可到支书台「党小组」确认组长设置）</p>';
  const rangeText = `当前应到 ${voterIds.length || committee.length} 人 ＝ 支委 ${committee.length} 人`
    + (expandedIds.length ? ` ＋ 扩大到 ${expandedIds.length} 人（${expandedIds.map((id) => getPersonName(id) || id).join('、')}）` : '');
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">本场参会范围（支委层 / 支委扩大会）</p>
      <p class="text-[11px] text-gray-500 mb-3">支委会与支委扩大会都是法人性质；默认支委层，可扩大到党小组组长（代组长）。<a href="./help.html#card-copy-pcm-scope" class="text-sky-600 hover:underline">见帮助 · 支委会页可见范围</a></p>
      <details class="mb-3">
        <summary class="text-[11px] text-gray-500 cursor-pointer select-none">参会范围口径 ▾</summary>
        <div class="text-[11px] text-gray-500 leading-5 mt-1">同一场支委会可按需选扩大到谁：勾「扩大会」后逐位选，或一键勾全体党小组组长（代组长）；未勾＝维持支委层现状。名单落在本场活动既有应到名单字段（与线上表态门同一口径），不新增字段。</div>
      </details>
      ${editable ? `
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" id="pcm-expanded"${expandedIds.length ? ' checked' : ''}>
        <span>扩大为支委扩大会</span>
      </label>
      <div id="pcm-expand-box" class="${expandedIds.length ? '' : 'hidden'} mt-2 pl-5 border-l border-gray-100">
        <label class="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" id="pcm-expand-all">
          <span class="font-medium">全体党小组组长（代组长）</span>
          <span class="text-[11px] text-gray-400">一键打包</span>
        </label>
        <div class="mt-1">${leaderRows}</div>
      </div>
      <div class="mt-3 flex items-center gap-3 flex-wrap">
        <button id="pcm-save-scope" type="button" class="btn-accent text-xs px-3 py-1.5 font-medium">保存本场参会范围</button>
        <span class="text-[11px] text-gray-500">${esc(rangeText)}</span>
      </div>` : `
      <p class="text-xs text-gray-600">${esc(rangeText)}</p>
      <p class="text-[11px] text-gray-500 mt-1.5">你是被扩大进本场的人：本场参会范围只读（调整归支委侧），你在本场按应到名单表态。</p>`}
    </div>`;
}

/** 「拟上会」清单的数据归集（各取既有出口；与写入活动的议程区块同一张清单、同一判据） */
async function loadCandidates() {
  const src = { taskforceProposals: [], issues: [], draftDocs: [], members: [], stageEntries: {} };
  try { src.taskforceProposals = TaskForceRecordStore.listCommitteeRequests(); }
  catch (e) { console.warn('[party-committee-meeting] 专班待议加载失败：', e); }
  try { src.issues = IssueStore.getAll().filter((i) => i.status === 'open' && !i.hidden && !i.mergedInto); }
  catch (e) { console.warn('[party-committee-meeting] 意见反馈读取失败：', e); }
  try {
    const docs = await listBranchDocs();
    src.draftDocs = docs.filter(isAgendaDraftDoc); // 同一判据（2026-09-21 批次 129：含制度草案 / 待党员大会表决）
  } catch (e) { console.warn('[party-committee-meeting] 制度草案加载失败：', e); }
  try { src.members = PersonStore.getMembers(); }
  catch (e) { console.warn('[party-committee-meeting] 成员档案读取失败：', e); }
  try { src.stageEntries = loadStageEntryDates(); }
  catch (e) { console.warn('[party-committee-meeting] 发展推进档案读取失败：', e); }
  try {
    // 品牌认定提案（2026-09-21 批次 132 · 支书口径二）：已提案、尚未认定的活动（判据单一源 activity.js）
    src.brandProposals = listBrandProposals().map((bp) => ({
      ...bp,
      proposedByName: bp.proposal && bp.proposal.by ? (getPersonName(bp.proposal.by) || '') : '',
    }));
  } catch (e) { console.warn('[party-committee-meeting] 品牌认定提案读取失败：', e); }
  return buildAgendaCandidates(src);
}

/** 议程提取区（**一张「拟上会」清单**：按类目分组，勾谁上会；已在议程中的置灰） */
function extractSectionHtml(act, candidates = []) {
  // 提取议程＝支委侧的写入位（**既有渲染条件不变**）：被扩大进本场的人只表态与查阅，
  //   这里不呈现「加入本场议程」的入口——本次改动不得让新放行的这一类拿到它。
  if (!isCommitteeMember(AuthStore.getCurrentUser()?.personId)) return '';
  const usedRefs = new Set((act.agenda || []).filter((x) => x && x.sourceRef).map((x) => `${x.sourceRef.kind}:${x.sourceRef.id}`));
  const refKindOf = { taskforce: 'taskforce-proposal', issue: 'issue', draftDoc: 'branch-doc', partyVote: 'branch-doc', recommend: 'member' };
  const row = (c) => {
    const used = usedRefs.has(`${refKindOf[c.group]}:${c.refId}`);
    return `
    <label class="flex items-start gap-2 p-2.5 rounded-lg border border-gray-100 ${used ? 'opacity-60' : 'hover:bg-gray-50 cursor-pointer'}">
      <input type="checkbox" class="pcm-cand mt-0.5" value="${esc(c.refId)}" data-group="${esc(c.group)}"${used ? ' disabled' : ''}>
      <span class="flex-1 min-w-0">
        <span class="block text-xs font-medium text-gray-700">${esc(c.text)}</span>
        <span class="block text-[11px] text-gray-500 mt-0.5">${esc(c.meta)}${used ? ' · 已在议程中' : ''}</span>
      </span>
    </label>`;
  };
  const groupsHtml = candidates.length
    ? AGENDA_CANDIDATE_GROUPS.map((g) => {
      const list = candidates.filter((c) => c.group === g.key);
      if (!list.length) return '';
      return `<div>
          <p class="text-xs font-medium text-gray-600 mb-1.5">${esc(g.label)} · ${list.length}<span class="text-[11px] text-gray-500 font-normal ml-1.5">${esc(g.hint)}</span></p>
          <div class="space-y-1.5">${list.map(row).join('')}</div>
        </div>`;
    }).join('')
    : `<p class="text-xs text-gray-400">当前没有待上会的事项（专班报送 / 归口支委会的意见反馈 / 制度草案 / 待报送党员大会表决的制度 / 待推荐的发展对象 / 品牌认定提案）。</p>`;
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">② 提取支委会议程</p>
      <p class="text-[11px] text-gray-500 mb-3">一张「拟上会」清单（不按来源各做入口）：勾选后加入本场议程，只在议程项上留回指，不改动来源本身。</p>
      <div class="space-y-3">${groupsHtml}</div>
      <div class="mt-3 flex items-center gap-3">
        <button id="pcm-extract" type="button" class="btn-accent text-xs px-3 py-1.5 font-medium">加入本场议程</button>
        <span class="text-[11px] text-gray-500">勾选后可一次加入多条</span>
      </div>
    </div>`;
}

/** 议程与「我的表态」（复用既有表决组件；委员端） */
function agendaSectionHtml(act) {
  const me = AuthStore.getCurrentUser();
  const voterIds = Array.isArray(act.voteConfig?.voterIds) ? act.voteConfig.voterIds : [];
  const canVote = !!me && voterIds.includes(me.personId);
  const items = (act.agenda || []).filter((a) => a && a.item);
  if (!items.length) {
    return `
      <div class="card rounded-xl p-5">
        <p class="text-sm font-semibold text-gray-700 mb-1">③ 议程与表态</p>
        <p class="text-sm text-gray-500">本场议程为空：先在上一步提取议程，或到「活动管理」手工补充议程。</p>
      </div>`;
  }
  const rows = items.map((a, i) => `
    <div class="rounded-xl border border-gray-100 p-3.5">
      <div class="flex items-start gap-2 text-sm">
        <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-700">${esc(a.item)}</span>
            ${a.result ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${a.result === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${a.result === 'passed' ? '已通过' : (a.result === 'partial' ? '部分通过' : '未通过')}</span>` : ''}
          </div>
          ${a.host ? `<div class="text-xs text-gray-500 mt-0.5">（主持人：${esc(a.host)}）</div>` : ''}
        </div>
      </div>
      ${a.id ? `<div class="vote-widget-slot mt-2" data-vote-item-id="${esc(a.id)}"></div>` : '<div class="text-[11px] text-gray-500 mt-2">该条无表决编号，仅作议程记录。</div>'}
    </div>`).join('');
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">③ 议程与表态</p>
      <p class="text-[11px] text-gray-500 mb-3">${canVote ? '你是本场应到表决人，可就每条议程表态（同意 / 异议 / 附言，可改票）。' : '你不在本场应到表决名单内，以下为只读议程。'}</p>
      <div class="space-y-3">${rows}</div>
    </div>`;
}

/** 汇总与截止（支书/副支书；复用既有汇总矩阵组件） */
function summarySectionHtml(act) {
  if (!isSecretaryOrDeputy()) return '';
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-3">④ 汇总与截止（支书 / 副支书）</p>
      <div id="pcm-summary"></div>
    </div>`;
}

/** 讨论结果（留存 / 查阅位）——读既有留存：议程项 result + 表决记录 */
function resultSectionHtml(act, votes) {
  const os = optionSetOf(act);
  const anonymous = isAnonymousActivity(act);
  const labelOf = (pos) => (os.labels && os.labels[pos]) || pos;
  const items = (act.agenda || []).filter((a) => a && a.id);
  const canRecord = isSecretaryOrDeputy();
  const body = items.length ? items.map((a, i) => {
    const rows = (votes || []).filter((v) => v && v.agendaItemId === a.id);
    const ballots = rows.filter((v) => v.personId);
    let detail;
    if (anonymous) {
      const t = tallyForItem(votes, a.id);
      const parts = Object.entries(t).map(([k, n]) => `${labelOf(k)} ${n}`).join(' · ');
      detail = `${parts || '暂无人表态'}（无记名：${ballots.length} 人已表态，不展示个人选项）`;
    } else {
      detail = ballots.length
        ? ballots.map((v) => `${getPersonName(v.personId) || v.personId}：${labelOf(v.position)}${v.note ? '（' + v.note + '）' : ''}`).join('；')
        : '暂无人表态';
    }
    const resultLabel = a.result === 'passed' ? '已记录：通过'
      : a.result === 'rejected' ? '已记录：未通过'
        : a.result === 'partial' ? '已记录：部分通过' : '尚未记录结果';
    const recorder = a.recordedBy ? `${getPersonName(a.recordedBy) || a.recordedBy}${a.recordedAt ? ' · ' + String(a.recordedAt).slice(0, 16).replace('T', ' ') : ''}` : '';
    // 2026-09-21 批次 129（制度链）：支委会审议**制度草案**时，在记录结果处定「是否报送党员大会表决」
    // （母本「在审议时确定」）——判据单一源在 branch-doc.js::isInstitutionDraftAgendaItem。
    const instDraft = canRecord && isInstitutionDraftAgendaItem(a, mockDB.branchDocs || []);
    return `
      <div class="rounded-xl border border-gray-100 p-3.5">
        <div class="flex items-start gap-2">
          <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-700">${esc(a.item)}</p>
            <p class="text-xs text-gray-500 mt-1">表态记录：${esc(detail)}</p>
            <p class="text-xs text-gray-500 mt-0.5">讨论结果：${esc(resultLabel)}${a.reportToPartyMeeting ? '（报送党员大会表决）' : ''}${recorder ? '（记录人 ' + esc(recorder) + '）' : ''}</p>
            ${canRecord ? `<div class="mt-2 flex items-center gap-2 flex-wrap">
              <button type="button" class="btn-outline pcm-record text-xs px-2.5 py-1" data-item-id="${esc(a.id)}" data-result="passed">记录通过</button>
              <button type="button" class="btn-outline pcm-record text-xs px-2.5 py-1" data-item-id="${esc(a.id)}" data-result="rejected">记录未通过</button>
              ${instDraft ? `<label class="text-[11px] text-gray-500 flex items-center gap-1"><input type="checkbox" class="pcm-report-party" data-item-id="${esc(a.id)}" style="cursor:pointer;">报送党员大会表决</label>` : ''}
            </div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('') : '<p class="text-sm text-gray-500">本场暂无带编号的议程，暂无可查阅的讨论结果。</p>';
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">⑤ 讨论结果（留存 / 查阅）</p>
      <p class="text-[11px] text-gray-500 mb-3">留存口径＝议程项结果（与「活动详情」的记录会议结果同一处）+ 委员表态记录。效力（2026-09-20 定案）：线上与线下完全同等效力，这里记录的讨论结果即终局。</p>
      <div class="space-y-3" id="pcm-result">${body}</div>
      <p class="text-[11px] text-gray-500 mt-3">也可在 <a href="./activity.html?id=${encodeURIComponent(act.id)}" class="text-blue-600 hover:underline">活动详情</a> 查看该场会议的全部记录。</p>
    </div>`;
}

/** 效力口径（已定）＋ 由它推导、尚待确认的三条（D-538） */
function rulingNoticeHtml() {
  return `
    <div class="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
      <p class="text-xs font-semibold text-amber-800">效力口径（已定）· 线上与线下完全同等效力（2026-09-20 定案）：线上表决与线上记录的讨论结果即终局，不需线下追认。</p>
      <details class="mt-1.5">
        <summary class="text-[11px] text-amber-800 cursor-pointer select-none">由该口径推导、尚待确认的三条 ▾</summary>
        <div class="text-[11px] text-amber-800 leading-5 mt-1">以下三条由上面这条口径推出，尚未逐条明答，请支书确认或推翻：其一 讨论结果可见范围与线下一致（支委会内部）；其二 支委缺席按线下同一规则；其三 线上支委会也走线下那套任务（两条线合流）。确认前本页不代作判定，只如实呈现已存记录（锁定 / 结果 / 表态）。<a href="./help.html#card-copy-pcm-scope" class="text-sky-600 hover:underline">见帮助 · 支委会页可见范围</a></div>
      </details>
    </div>`;
}

async function render() {
  const me = AuthStore.getCurrentUser();
  if (!me) {
    ROOT.innerHTML = '<div class="card rounded-xl p-5 text-center text-sm text-gray-500">未登录，请先登录。</div>';
    return;
  }
  // 进页门（支书 2026-09-23 追裁「他只能看到扩大到他的支委会！」）：
  //   在支委名单内 **∨** 被任一场支委会的 voteConfig.voterIds 包含 ⇒ 可进；
  //   两者皆非 ⇒ 拒绝态（说明「你能看到的是扩大到你的支委会」）。
  const committeeViewer = isCommitteeMember(me.personId);
  const list = visibleMeetingsFor(me.personId);
  if (!committeeViewer && list.length === 0) { renderShellDenied(); return; }

  // 场次由 URL 参数（或上次选中）指定时，走**同一判据**：不在本人可见集内 ⇒ 拒绝打开并给根因提示
  if (currentId && !list.some((a) => a.id === currentId)) { renderOutOfScope(currentId); return; }
  if (!currentId || !findAct(currentId)) {
    const online = list.find((a) => isAsync(a));
    currentId = (online || list[0] || {}).id || null;
  }
  const act = currentId ? findAct(currentId) : null;
  const votes = act ? await fetchVotes(act.id) : [];
  const candidates = (act && committeeViewer) ? await loadCandidates() : [];

  const currentBlock = !act
    ? `<div class="card rounded-xl p-5"><p class="text-sm text-gray-500">暂无支委会场次：可在上方新建一场线上支委会。</p></div>`
    : `<div class="card rounded-xl p-5">
         <div class="flex items-start justify-between gap-3 flex-wrap">
           <div class="min-w-0">
             <p class="font-title-cn text-base font-bold text-gray-800">${esc(act.title || '未命名会议')}</p>
             <p class="text-xs text-gray-500 mt-1">${esc(act.date || '—')}${act.location ? ' · ' + esc(act.location) : ''} · ${isAsync(act) ? '线上召开（异步表态）' : '未启用线上表决'}${act.votesLocked === true ? ' · 已截止' : ''}</p>
           </div>
           <a href="./activity.html?id=${encodeURIComponent(act.id)}" class="text-xs text-blue-600 hover:underline flex-shrink-0">活动详情 →</a>
         </div>
         ${isAsync(act) ? '' : '<p class="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">本场未启用线上表决配置：如需委员线上表态，可在「活动管理」写入线上异步表决，或上方新建一场线上支委会。</p>'}
       </div>
       ${isAsync(act) ? scopeSectionHtml(act) : ''}
       ${extractSectionHtml(act, candidates)}
       ${agendaSectionHtml(act)}
       ${summarySectionHtml(act)}
       ${resultSectionHtml(act, votes)}`;

  // 正常视图的返回入口（2026-09-27）：与「被拒 / 越权」态（renderShellDenied）**逐字同款**——
  //   原正常视图只有 html 级「← 返回首页」，进得来却回不到自己的工作台。落点＝页头卡内、
  //   与既有导航同区；href 体例照抄 renderShellDenied（本页在 docs/ 根、无 `<base>` ⇒ `./workspace/…` 正确解析）。
  const page = AuthStore.getPageForRole('workspace', me.role) || 'visitor.html';
  ROOT.innerHTML = `
    <div class="space-y-5">
      <div class="card rounded-xl p-5">
        <h2 class="font-title-cn text-xl font-bold text-gray-800">支委会会议（线上召开）</h2>
        <p class="text-sm text-gray-500 mt-1.5">一条链：选线上召开 → 定本场参会范围（默认支委层，可扩大为支委扩大会、选定扩大到谁）→ 提取/整理议程 → 委员表态 → 汇总并截止 → 留存、查阅讨论结果。</p>
        <p class="text-sm mt-4"><a href="./workspace/${esc(page)}" class="text-blue-600 hover:underline">← 返回我的工作台</a></p>
      </div>
      ${rulingNoticeHtml()}
      ${committeeViewer ? '' : expandedScopeNoticeHtml(list.length)}
      ${selectSectionHtml()}
      ${currentBlock}
    </div>`;

  bindSelectSection();
  if (act) {
    bindScope(act);
    bindExtract(act, candidates);
    await bindAgenda(act);
    bindSummary(act);
    bindRecord(act);
  }
}

// ════════════════════════════════════════════════════════════════
//  交互
// ════════════════════════════════════════════════════════════════

function bindSelectSection() {
  const pick = document.getElementById('pcm-pick');
  pick?.addEventListener('change', () => {
    currentId = pick.value || null;
    window.history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(currentId || '')}`);
    render();
  });
  document.getElementById('pcm-create')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.processing === '1') return;
    btn.dataset.processing = '1';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    try {
      await createOnlineMeeting(document.getElementById('pcm-new-title')?.value?.trim() || '');
    } catch (err) {
      console.warn('[party-committee-meeting] 新建线上支委会失败：', err);
      showToast('error', (err && err.message) || '新建失败');
      btn.dataset.processing = '';
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
}

/** 新建一场「线上召开」支委会：沿用既有活动实体 + 既有 voteConfig 默认（不新增表/字段） */
async function createOnlineMeeting(title) {
  const me = AuthStore.getCurrentUser();
  const ids = committeeIds();
  const today = todayLocal();
  const data = {
    type: '支委会',
    scenarioId: 'branch-committee',
    title: title || `线上支委会（${today}）`,
    date: today,
    status: 'published',
    visibility: 'branch',
    domain: 'party-building',
    location: '线上（异步表态）',
    description: '线上召开：支委就议程异步表态（同意 / 异议 / 附言），支书汇总截止后记录讨论结果。',
    voteConfig: { ...defaultVoteConfig('branch-committee'), voterIds: ids },
    agenda: [],
    organizer: me.personId,
    assignments: [
      { personId: me.personId, role: 'organizer' },
      ...ids.filter((pid) => pid !== me.personId).map((pid) => ({ personId: pid, role: 'participant' })),
    ],
  };
  const act = await getAdapter().activities.create(data);
  if (!mockDB.activities.some((a) => a.id === act.id)) mockDB.activities = [...mockDB.activities, act];
  persist();
  currentId = act.id;
  window.history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(act.id)}`);
  showToast('success', '已新建线上支委会，可开始提取议程');
  await render();
}

function bindExtract(act, candidates = []) {
  document.getElementById('pcm-extract')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.processing === '1') return;
    const refKindOf = { taskforce: 'taskforce-proposal', issue: 'issue', draftDoc: 'branch-doc', partyVote: 'branch-doc', recommend: 'member', brand: 'activity' };
    const picked = [];
    ROOT.querySelectorAll('.pcm-cand:checked').forEach((cb) => {
      const c = candidates.find((x) => x.group === cb.dataset.group && x.refId === cb.value);
      if (!c) return;
      const item = {
        id: generateId('ag'),
        kind: 'normal',
        item: c.item,
        host: c.host || '支书',
        kinds: c.kinds || [],
        sourceRef: { kind: refKindOf[c.group], id: c.refId },
      };
      // 类目自带的引用字段照搬（制度草案 → branchDocId；发展对象推荐 → 待讨论名单 + 目标阶段）：
      // 后者是「推荐为发展对象」那道门的议程侧（记录通过即为该人建成员变更申请，见 agenda-follow-up.js）
      if (c.branchDocId) item.branchDocId = c.branchDocId;
      // 品牌认定提案（2026-09-21 批次 132）：议程项回指**被提案的那场活动**，记录「通过」才置 isBrand
      if (c.brandActivityId) item.brandActivityId = c.brandActivityId;
      if (Array.isArray(c.personIds) && c.personIds.length) item.personIds = c.personIds;
      if (c.toStage) item.toStage = c.toStage;
      picked.push(item);
    });
    if (!picked.length) { showToast('info', '请先勾选要加入议程的事项'); return; }
    btn.dataset.processing = '1';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    try {
      await updateAgenda(act, [...(act.agenda || []), ...picked]);
      showToast('success', `已加入 ${picked.length} 条议程`);
      await render();
    } catch (err) {
      console.warn('[party-committee-meeting] 提取议程失败：', err);
      showToast('error', (err && err.message) || '加入议程失败');
      btn.dataset.processing = '';
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
}

/** 本场参会范围：勾「扩大会」→ 展开放大对象；「全体党小组组长（代组长）」一键打包；保存写回应到名单 */
function bindScope(act) {
  const toggle = document.getElementById('pcm-expanded');
  const box = document.getElementById('pcm-expand-box');
  if (!toggle || !box) return;
  const persons = () => [...ROOT.querySelectorAll('.pcm-expand-person')];
  const all = document.getElementById('pcm-expand-all');
  toggle.addEventListener('change', () => {
    box.classList.toggle('hidden', !toggle.checked);
    if (!toggle.checked) { persons().forEach((cb) => { cb.checked = false; }); if (all) all.checked = false; }
  });
  all?.addEventListener('change', () => {
    persons().forEach((cb) => { cb.checked = all.checked; });
  });
  document.getElementById('pcm-save-scope')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.processing === '1') return;
    btn.dataset.processing = '1';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    try {
      const chosen = toggle.checked ? persons().filter((cb) => cb.checked).map((cb) => cb.value) : [];
      await saveScope(act, chosen);
      const committeeN = committeeIds().length;
      showToast(chosen.length ? 'success' : 'info', chosen.length
        ? `本场参会范围已保存：支委 ${committeeN} 人 ＋ 扩大到 ${chosen.length} 人`
        : '本场参会范围已保存：支委层（未选择扩大对象）');
      await render();
    } catch (err) {
      console.warn('[party-committee-meeting] 保存参会范围失败：', err);
      showToast('error', (err && err.message) || '保存失败');
      btn.dataset.processing = '';
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
}

/** 参会范围写回（复用既有活动实体与既有字段 voteConfig.voterIds；不新增字段、不新写门禁） */
async function saveScope(act, expandedIds) {
  const voterIds = [...new Set([...committeeIds(), ...expandedIds])];
  const voteConfig = { ...(act.voteConfig || {}), voterIds };
  const updated = await getAdapter().activities.update(act.id, { voteConfig });
  const i = mockDB.activities.findIndex((x) => x.id === act.id);
  if (i >= 0) mockDB.activities[i] = { ...mockDB.activities[i], ...(updated || {}), voteConfig };
  persist();
}

/** 议程写回（沿用既有活动实体；API 形态走 PATCH，mock 形态写 adapter，本地同步 + persist） */
async function updateAgenda(act, agenda) {
  const updated = await getAdapter().activities.update(act.id, { agenda });
  const i = mockDB.activities.findIndex((x) => x.id === act.id);
  if (i >= 0) mockDB.activities[i] = { ...mockDB.activities[i], ...(updated || {}), agenda };
  persist();
}

// 表态提交事件（`vote-widget` 冒泡）→ 整页重绘；**只绑一次**（ROOT 在重绘间不换，重复绑定会叠加监听）
let _voteEventBound = false;
function bindVoteEventOnce() {
  if (_voteEventBound) return;
  _voteEventBound = true;
  ROOT.addEventListener('vote-submitted', () => {
    render().catch((e) => console.warn('[party-committee-meeting] 表态后重绘失败：', e));
  });
}

/** 委员端表态：复用既有表决组件（与活动详情页同源） */
async function bindAgenda(act) {
  const me = AuthStore.getCurrentUser();
  const voterIds = Array.isArray(act.voteConfig?.voterIds) ? act.voteConfig.voterIds : [];
  const canVote = !!me && voterIds.includes(me.personId);
  const slots = ROOT.querySelectorAll('.vote-widget-slot');
  if (!slots.length) return;
  const paint = async () => {
    const votes = await fetchVotes(act.id);
    slots.forEach((slot) => {
      const item = (act.agenda || []).find((x) => x.id === slot.dataset.voteItemId);
      if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: me.personId, canVote });
    });
  };
  try {
    await paint();
  } catch (e) {
    console.warn('[party-committee-meeting] 表态数据加载失败：', e);
  }
  bindVoteEventOnce();
}

/** 汇总与截止：复用既有支书端汇总组件（含截止按钮 → votesLocked 锁定） */
function bindSummary(act) {
  const host = document.getElementById('pcm-summary');
  if (!host) return;
  const cfgIds = (Array.isArray(act.voteConfig?.voterIds) && act.voteConfig.voterIds.length > 0)
    ? act.voteConfig.voterIds
    : committeeIds();
  const memberIds = new Set(cfgIds);
  const committeeMembers = PersonStore.getAll().filter((p) => memberIds.has(p.id));
  renderVoteSummary(host, { activity: act, committeeMembers, canLock: true })
    .catch((e) => console.warn('[party-committee-meeting] 表态汇总加载失败：', e));
  host.addEventListener('votes-locked', () => {
    showToast('success', '表态已截止，可查阅并记录讨论结果');
    render().catch((e) => console.warn('[party-committee-meeting] 截止后重绘失败：', e));
  });
}

/** 记录讨论结果：复用既有 recordAgendaResult（与活动详情页同一函数），写回活动议程 */
function bindRecord(act) {
  ROOT.querySelectorAll('.pcm-record').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.processing === '1') return;
      btn.dataset.processing = '1';
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        const adapter = getAdapter();
        const db = {
          branchDocs: [...(mockDB.branchDocs || [])],
          memberChangeRequests: [...(mockDB.memberChangeRequests || [])],
        };
        const updated = await recordAgendaResultForActivity({
          activity: act,
          agendaItemId: btn.dataset.itemId,
          result: btn.dataset.result,
          // 2026-09-21 批次 129（制度链）：制度草案议程项旁的「报送党员大会表决」勾选（无该勾选位时为 false）
          reportToPartyMeeting: ROOT.querySelector(`.pcm-report-party[data-item-id="${btn.dataset.itemId}"]`)?.checked === true,
          adapter,
          db,
          actorId: AuthStore.getCurrentUser()?.personId || null,
        });
        if (Array.isArray(db.memberChangeRequests) && db.memberChangeRequests.length > 0) {
          mockDB.memberChangeRequests = db.memberChangeRequests;
        }
        await updateAgenda(act, updated.agenda);
        showToast('success', btn.dataset.result === 'passed' ? '已记录通过' : '已记录未通过');
        await render();
      } catch (e) {
        console.warn('[party-committee-meeting] 记录讨论结果失败：', e);
        showToast('error', (e && e.message) || '记录失败');
        btn.dataset.processing = '';
        btn.disabled = false;
        btn.style.opacity = '';
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════
(async () => {
  await _hydrateData();
  TaskForceRecordStore.init();
  try { await IssueStore.loadAll(); } catch (e) { console.warn('[party-committee-meeting] 反馈数据加载失败：', e); }
  const params = new URLSearchParams(window.location.search);
  currentId = params.get('id') || null;
  await render();
})();
