// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  member-confirmation.js — 名册生命周期「成员变更确认复核」服务层（附录⑩ S4，C 批 2026-09-06 支书已批）
// ════════════════════════════════════════════════════════════════
// 支书 2026-09-06 裁定（R4-1/R4-2/R4-3 + 学期末提醒，替代「直改即时生效 + 支书复核卡只读」）：
//   · 发展阶段 / 在册滞留 = 组织委员发起 → 支书确认生效（双层留痕、可退回）；
//   · 成员移出 = 引用清单化 + **登记即生效**（2026-09-14 支书裁定，不再要求二次确认）：
//       - 未开始引用（未开始的活动分工 / 未生效的报名 / 未读的广播接收）→ 一键自动解除后移出；
//       - 已开始或历史的记录（考勤 / 考察 / 思想汇报 / 复盘 / 表态 / 长期分工等）→
//         保留并标注「已转出」（transferredOutAt），原记录保留、不删不匿名；
//       - 一律直接生效（不再建「待支书确认」的 transferOut pending 请求）；登错由成员流动台账
//         撤销（services/member-flow.js::revokeFlow，台账 revokedAt/revokedBy 留痕 + 回滚在册状态）纠正。
//       仅「发展阶段变更 / 在册状态变更」仍走支书确认链（那两类不属本次范围）。
//   · 请求队列 = mockDB.pendingMemberConfirmations（内存读链；domain.js 已声明顶层数组）。
//     跨刷新持久化：本模块自管 localStorage 键 gsm1921-member-confirmations
//     （gsm1921- 前缀 → ?reset=demo 档自动清除 = 回种子；mock-adapter 域清单禁改，勿并入整库键）。
// 读链不匿名：人员档案移除走后 PersonStore.removeMember 以对象形态记 removedIds
//   （含 id+name+removedAt+decidedBy+transferOut），getName/getPersonName 移出后仍可解析姓名；
//   isTransferredOut 供读链 UI 标「已转出」。
// 纯 ESM：仅依赖 core(policy-defaults/domain/data-adapter/version-token) + person / roster /
// org-base-data-preview（无 DOM；localStorage 惰性访问）。
// 2026-09-21 批次 127（`SOP-B-27` 落地 · `D-388` / `D-521`）：本文件另加**支委会讨论门**——
//   「积极分子 → 发展对象」（＝推荐为发展对象）**须先经支委会讨论通过**；
//   门挡在 `submitMemberChange`（发起处）与 `_applyApproved`（确认生效处）；判据 = 既有的
//   `memberChangeRequests` 里该人 `toStage='发展对象'` 且 `meetingResult='passed'` 的留痕
//   （由 `agenda-follow-up.js::recordAgendaResult` 只对通过者建）。详见下方该段注释。
// 单测：server/test/member-confirmation.test.mjs
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260921i';
import { persist } from '../core/data-adapter.js?v=20260921i';
// 全站唯一实体 id 源（2026-09-13 Q-21-2 收敛：禁止再写「前缀 + Date.now()」）
import { generateId } from '../core/id.js?v=20260921i';
import { bumpToken } from '../core/version-token.js?v=20260921i'; // P0 域缓存失效（spec §二.3）
// 批4（2026-09-09 支书批「域参数」）：滞留复核窗口单一源 = policy memberConfirmation.semesterDetainedWindows
// （原本文件 :533 硬编码 615/715/1215 迁出；组织委员可经设置中心覆盖，判定随窗口变化）
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260921i';
import { PersonStore, findRemovedRecord } from './person.js?v=20260921i';
import { getResidenceOf, saveResidenceChange, getDetainedMembers } from './roster.js?v=20260921i';
// 发展阶段枚举单一源（静态种子派生，禁造新枚举）
import { DEVELOP_STAGE_OPTIONS } from './org-base-data-preview.js?v=20260921i';
// 活动「未开始」口径单一源（2026-09-13 收敛）：替代本文件手写 archived || status==='completed'
// 在册状态枚举 RESIDENCE 同源（2026-09-13 Q-21-3 收敛：原经 roster.js 转出，现直取单一源）
import { isActivityNotStarted, RESIDENCE } from '../core/constants.js?v=20260921i';

/** 成员变更确认请求队列的 localStorage 键（gsm1921- 前缀 → ?reset=demo 自动清理） */
export const MEMBER_CONFIRM_KEY = 'gsm1921-member-confirmations';
const MEMBER_CONFIRM_VERSION = 1;

// ── 发展推进覆盖档案（进入当前阶段日期）读写口 ───────────────────────
// C①-补（2026-09-10 支书裁定）：原「发展数据」直写已改只读（唯一写位=名册发起→支书确认），
// 但「进入当前阶段日期」需随阶段推进一并落档（供组织台 buildDevelopNodeRemindGroup 派生发展节点提醒）。
// 存储键位/形态与既有读口同源（gsm1921-dev-stage-overrides，{ personId: { stage, entryDate } }），
// 不新造存储/数据模型；写入点=成员变更确认链支书确认生效处（decideConfirmation → _applyApproved）。
export const DEV_STAGE_OVERRIDES_KEY = 'gsm1921-dev-stage-overrides';

/** 读取发展推进覆盖档案（不可用/损坏 → {}）。组织台待办发展节点提醒与确认生效写口共用。 */
export function loadDevStageOverrides() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const o = JSON.parse(localStorage.getItem(DEV_STAGE_OVERRIDES_KEY) || '{}');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (_) { return {}; }
}

/** 写入某人发展推进覆盖（合并既有 stage/entryDate；同源键位，不新造存储） */
export function saveDevStageOverride(personId, { stage, entryDate } = {}) {
  if (!personId) return null;
  const all = loadDevStageOverrides();
  const next = { ...(all[personId] || {}) };
  if (stage) next.stage = stage;
  if (entryDate) next.entryDate = entryDate;
  all[personId] = next;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEV_STAGE_OVERRIDES_KEY, JSON.stringify(all));
    }
  } catch (_) { /* 存储不可用：确认生效不阻塞，提醒派生降级 */ }
  return next;
}

/** 日期归一 'YYYY-MM-DD'（非法/缺省 → ''） */
function _normDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v == null ? '' : v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** 今日日期键 'YYYY-MM-DD' */
function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** 成员变更申请（memberChangeRequests）终态（非终态在转出执行时作废） */
const TERMINAL_MCR_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

/** 请求 action → 产品文案（UI 徽标/话术用） */
export const MC_ACTION_LABEL = {
  developStage: '阶段变更',
  residence: '在册状态',
  transferOut: '移出',
};

/**
 * 引用域 → 摘要文案 与 摘要计数（`_summarize`）已随「移出登记即生效」移除——
 * 2026-09-14 批次 26 起 submitTransferOut 不再构造 pending 请求，故无 refsSummary 产出方；
 * 批次 29 据 Q-23-6 删除这两个无调用方的私有件。
 * 存量 pending 里已落库的 refsSummary 仍由读侧渲染（secretary/todo-tab.js::_mcRefsSummaryHtml）。
 */

// ── 队列存取（内存读链 = mockDB.pendingMemberConfirmations；localStorage 兜跨刷新）──

function _hydrate() {
  if (!Array.isArray(mockDB.pendingMemberConfirmations)) mockDB.pendingMemberConfirmations = [];
  if (mockDB.pendingMemberConfirmations.length > 0) return; // 已载入/非空（模拟刷新后置空由测试控制）
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(MEMBER_CONFIRM_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o && Array.isArray(o.requests)) mockDB.pendingMemberConfirmations = o.requests;
  } catch (_) { /* 存储不可用/损坏：保持空队列（可继续本次会话） */ }
}

function _all() {
  _hydrate();
  return mockDB.pendingMemberConfirmations;
}

function _save() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MEMBER_CONFIRM_KEY, JSON.stringify({
        version: MEMBER_CONFIRM_VERSION,
        requests: _all(),
      }));
    }
  } catch (_) { /* 存储不可用：内存队列仍可用 */ }
  persist(); // 其余业务域（activities/signups/taskforces/…）随整库落盘
}

/**
 * 请求 id（2026-09-13 Q-21-2 收敛）：原为本地手写的 `mc-<ts>` + 同毫秒序号自增防碰撞
 * （注释自称「与既有 generateId 风格兼容」，实为第二套实现 + 两个模块级可变变量）。
 * 现统一经 `core/id.js::generateId('mc', '-')`（连字符保持既有 `mc-` 前缀形态）。
 */
const _nextId = () => generateId('mc', '-');

function _person(personId) {
  return PersonStore.getMembers().find(p => p.id === personId) || null;
}

function _findPending(personId, action) {
  return _all().find(r => r.status === 'pending' && r.personId === personId && r.action === action) || null;
}

function _findPendingAny(personId) {
  return _all().find(r => r.status === 'pending' && r.personId === personId) || null;
}

// ── 支委会讨论门：推荐为发展对象（2026-09-21 批次 127 · `SOP-B-27` 落地 · 裁定 `D-388` / `D-521`）──
// 口径（**本批按推荐档收口**，`SOP-B-27` 原文两项待定项按此执行、**支书未逐条明答**——队列与决策日志
// 显著标注「系按推荐档执行」）：
//   · ① **讨论挂进既有支委会会议**（活动 + 议程「待讨论名单」，目标阶段＝「发展对象」）——
//        **不另建会议实体**（`D-521` 已把「发展对象」开进 `AGENDA_TARGET_STAGES`，议程侧已具备）；
//   · ② **与阶段变更的关系＝前置**：**讨论通过之前，阶段变更不得发生**——
//        本门挡在「名册报送确认链」的**发起**处（`submitMemberChange`），并在**支书确认生效**处
//        （`_applyApproved`）再兜一道（防历史 pending 绕过）。
// 判据（**唯一留痕源**）：`recordAgendaResult` 只对**通过者**建 `memberChangeRequests`
//   （`services/agenda-follow-up.js:163`-`:179`，`meetingResult='passed'`）⇒「讨论通过」＝该人存在这样一条留痕。
// ⚠ **本门只覆盖「积极分子 → 发展对象」这一步**（＝母本 `组织委员工作流程指南.md:181`「发展对象｜支委会讨论确定」
//   所指的「推荐为发展对象」）。其它写法进入「发展对象」（如档案更正：正式党员 → 发展对象）**不属「推荐」**，
//   不设此门（如实登记的边界，勿扩大解释）。
// ⚠ 与 `S-2`（2026-09-09 支书批「发展议程只留两个目标」）的关系：`D-521` 已裁「开门」、
//   只覆盖 S-2 中「不含发展对象」这一句；本门是该裁定的落地（议程位 → 真挡），**未动 S-2 其余部分**。
export const COMMITTEE_GATED_STAGE = '发展对象';
export const COMMITTEE_GATE_FROM_STAGE = '积极分子';
/** 未通过时的提示（UI 与服务层同源；提示「先上会」而非「不许变更」） */
export const COMMITTEE_GATE_DENY = '推荐为发展对象须先经支委会讨论通过（把该成员加入某场支委会的「待讨论名单」（目标阶段＝发展对象）并记录通过后，再发起阶段变更）';

/** 该人是否已有「支委会讨论通过」的留痕（＝本门的唯一判据） */
export function hasPassedCommitteeDiscussion(personId, toStage = COMMITTEE_GATED_STAGE) {
  if (!personId) return false;
  return (Array.isArray(mockDB.memberChangeRequests) ? mockDB.memberChangeRequests : [])
    .some((r) => r && r.personId === personId && r.toStage === toStage
      && r.meetingResult === 'passed'
      && !['cancelled', 'rejected'].includes(r.status));
}

/** 该次阶段变更是否受本门约束（kind=developStage 且「积极分子 → 发展对象」） */
export function committeeGateApplies(kind, from, to) {
  return kind === 'developStage' && to === COMMITTEE_GATED_STAGE && from === COMMITTEE_GATE_FROM_STAGE;
}

// ── 提交：发展阶段 / 在册滞留 变更 ───────────────────────────────
/**
 * 组织委员发起「阶段 / 在册滞留」变更（push pending → 支书确认生效）
 * @param {Object} params
 * @param {string} params.personId 成员 id
 * @param {'developStage'|'residence'} params.kind 变更维度
 * @param {string} params.to 目标值（developStage ∈ 阶段枚举；residence ∈ RESIDENCE）
 * @param {string} [params.note] 备注（滞留时建议填写原因/起止）
 * @param {string} [params.by] 发起人（组织委员）
 * @param {string} [params.entryDate] 进入当前（目标）阶段日期 'YYYY-MM-DD'（仅 developStage；缺省=今日）
 * @returns {{ok:boolean, request?:Object, reason?:string}}
 */
export function submitMemberChange({ personId, kind, to, note, by, entryDate } = {}) {
  const person = _person(personId);
  if (!person) return { ok: false, reason: '成员不存在（档案中无该 id）' };
  if (kind !== 'developStage' && kind !== 'residence') {
    return { ok: false, reason: 'kind 须为 developStage 或 residence' };
  }
  const cleanNote = note === undefined || note === null ? '' : String(note).trim();
  let from;
  if (kind === 'developStage') {
    if (!DEVELOP_STAGE_OPTIONS.includes(to)) {
      return { ok: false, reason: `发展阶段须为：${DEVELOP_STAGE_OPTIONS.join(' / ')}` };
    }
    from = person.developStage || '';
    if (to === from) return { ok: false, reason: `目标发展阶段与现值一致（${from || '待定'}），无需变更` };
    if (_findPending(personId, 'developStage')) {
      return { ok: false, reason: '该成员已有待支书确认的阶段变更，处理完成前请勿重复发起' };
    }
    // 支委会讨论门（批次 127 · SOP-B-27 前置）：积极分子 → 发展对象 须**先经支委会讨论通过**
    if (committeeGateApplies(kind, from, to) && !hasPassedCommitteeDiscussion(personId, to)) {
      return { ok: false, reason: COMMITTEE_GATE_DENY };
    }
  } else {
    if (![RESIDENCE.CAMPUS, RESIDENCE.DETAINED].includes(to)) {
      return { ok: false, reason: '在册状态须为「在校」或「滞留」' };
    }
    from = getResidenceOf(person).residenceStatus;
    if (to === from) return { ok: false, reason: `目标在册状态与现值一致（${from}），无需变更` };
    if (_findPending(personId, 'residence')) {
      return { ok: false, reason: '该成员已有待支书确认的在册状态变更，处理完成前请勿重复发起' };
    }
  }
  // 存量兼容（Q-23-6，批次 29 复核保留）：本条拦截**只对旧版已落库的 transferOut pending 生效**——
  // 新版本不再产生该形态请求，但 localStorage 键 gsm1921-member-confirmations 可跨刷新带出旧请求；
  // 保留拦截 + 保留 _applyApproved 的 transferOut 分支，才能让旧请求仍可被支书处理完（否则该成员
  // 会被永久拦截却又无从消解 = 死锁）。
  const pendAny = _findPendingAny(personId);
  if (pendAny && pendAny.action === 'transferOut') {
    return { ok: false, reason: '该成员移出已报送支书待确认，处理完成前请勿再发起阶段/在册变更' };
  }
  const request = {
    id: _nextId(),
    kind: 'change',
    action: kind,
    personId,
    name: person.name || personId,
    from,
    to,
    note: cleanNote,
    by: by || null,
    at: new Date().toISOString(),
    status: 'pending',
    decidedBy: null,
    decidedAt: null,
    rejectNote: '',
    refsSummary: null,
  };
  // C①-补：阶段推进携带「进入当前阶段日期」（缺省=今日）→ 确认生效时同源落覆盖档案
  if (kind === 'developStage') request.entryDate = _normDate(entryDate) || _todayKey();
  mockDB.pendingMemberConfirmations = [..._all(), request];
  bumpToken('memberConfirmation'); // P0：成员变更确认请求队列写口 bump（支书待办页成员确认组新鲜度）
  _save();
  return { ok: true, request };
}

// ── 提交：成员移出（引用清单化；安全引用一键解除 / 历史记录报支书确认转「已转出」）──

/** 活动是否「未开始」（裁定字面：status ∉ {completed, archived} 且（无 date 或 date >= 今天））
 *  口径单一源 = core/constants.js::isActivityNotStarted（2026-09-13 收敛；空值兜底保持原语义） */
function _isNotStarted(a) {
  if (!a) return false;
  return isActivityNotStarted(a);
}

/** 扫描某成员的引用并分类 safe（自动解除）/ keep（保留 + 转「已转出」标注） */
function _scanRefs(personId) {
  const safe = [];
  const keep = [];
  const list = (arr) => (Array.isArray(arr) ? arr : []);
  const actOf = (id) => list(mockDB.activities).find(a => a.id === id) || null;
  // 活动内嵌分工：活动未开始 → safe 删除该行；已开始/已完成 → keep 标注
  for (const a of list(mockDB.activities)) {
    for (const x of list(a.assignments)) {
      if (x && x.personId === personId) {
        (_isNotStarted(a) ? safe : keep).push({ domain: 'activities', ref: a, row: x });
      }
    }
  }
  // 分工记录（长期授权）→ keep
  for (const x of list(mockDB.assignments)) if (x.assigneeId === personId) keep.push({ domain: 'assignments', row: x });
  // 考勤 → keep
  for (const r of list(mockDB.attendances)) if (r.personId === personId) keep.push({ domain: 'attendances', row: r });
  // 考察 → keep
  for (const r of list(mockDB.inspections)) if (r.personId === personId) keep.push({ domain: 'inspections', row: r });
  // 专班成员（负责人 → 保留提示先移交；普通成员 → 转出即退出专班）
  for (const t of list(mockDB.taskforces)) {
    for (const m of list(t.members)) {
      if (m && m.personId === personId) {
        keep.push({ domain: 'taskforces', ref: t, row: m, organizer: m.role === 'organizer' });
      }
    }
  }
  // 报名：关联活动未开始 → safe 删除；已发生/专班报名 → keep 标注
  for (const s of list(mockDB.signups)) {
    if (s.personId === personId) {
      const linkedAct = s.sourceType === 'activity' ? actOf(s.sourceId) : null;
      if (linkedAct && _isNotStarted(linkedAct)) safe.push({ domain: 'signups', row: s });
      else keep.push({ domain: 'signups', row: s });
    }
  }
  // 支委会表态 → keep
  for (const v of list(mockDB.agendaVotes)) if (v.personId === personId) keep.push({ domain: 'agendaVotes', row: v });
  // 思想汇报 → keep
  for (const t of list(mockDB.thoughtReports)) if (t.personId === personId) keep.push({ domain: 'thoughtReports', row: t });
  // 活动/专班复盘 → keep
  for (const r of list(mockDB.activityReviews)) if (r.organizerId === personId) keep.push({ domain: 'activityReviews', row: r });
  for (const r of list(mockDB.taskforceReviews)) if (r.organizerId === personId) keep.push({ domain: 'taskforceReviews', row: r });
  // 成员变更申请 → keep（终态标注；非终态执行时作废）
  for (const r of list(mockDB.memberChangeRequests)) if (r.personId === personId) keep.push({ domain: 'memberChangeRequests', row: r });
  // 支委广播：未读 → safe 删除；已读 → keep 标注
  for (const b of list(mockDB.committeeBroadcasts)) {
    if (b.recipientId === personId) {
      if (b.read === true) keep.push({ domain: 'committeeBroadcasts', row: b });
      else safe.push({ domain: 'committeeBroadcasts', row: b });
    }
  }
  return { safe, keep };
}

/** 分类条目 → 摘要计数已删（Q-23-6，批次 29）：详见上方说明。 */

/**
 * 组织委员发起「成员移出」（引用清单化 + **登记即生效**，2026-09-14 支书裁定）：
 *  - 现任支书（任一支部）→ 拒绝（需先交接）；
 *  - 已有其它待支书确认请求（阶段/在册）→ 拦截（防流程交错）；
 *  - 其余一律直接生效：安全引用（未开始分工/未生效报名/未读广播）自动解除 →
 *    保留历史记录标注 transferredOutAt（原记录保留、不删不匿名）→ 成员档案软标记移出。
 *    不再建 transferOut pending 请求（登错由成员流动台账撤销纠正）。
 * @param {Object} params
 * @param {string} params.personId 成员 id
 * @param {string} [params.by] 发起人（组织委员）
 * @param {string} [params.note] 移出原因/备注（由调用方记入流动台账；本函数不改档案）
 * @returns {Promise<{ok:boolean, direct?:boolean, clearedSafe?:number, annotatedKeep?:number, reason?:string}>}
 */
export async function submitTransferOut({ personId, by, note } = {}) {
  const person = _person(personId);
  if (!person) return { ok: false, reason: '成员不存在（档案中无该 id）' };
  const branch = (mockDB.branches || []).find(b => b.secretaryId === personId);
  if (branch) {
    return { ok: false, reason: `该成员为「${branch.name || branch.id}」现任支书，需先完成支书交接后再移出` };
  }
  const pendAny = _findPendingAny(personId);
  if (pendAny) {
    return { ok: false, reason: '该成员已有待支书确认的请求（阶段/在册），处理完成后再发起移出' };
  }
  const { safe, keep } = _scanRefs(personId);
  const at = new Date().toISOString();
  // 登记即生效：安全引用解除 + 保留历史标注 + 成员软标记移出（原 decide approved 的执行原语）
  _executeTransferOut(personId, at);
  const r = await PersonStore.removeMember(personId, { by: by || null, guardRefs: false, transferOut: true });
  if (!r.ok) return { ok: false, reason: r.reason || '移出执行失败' };
  return { ok: true, direct: true, clearedSafe: safe.length, annotatedKeep: keep.length };
}

// ── 支书决策 ────────────────────────────────────────────────────

/**
 * 支书决策：approved 应用（阶段/在册落地；移出执行 安全解除 + 保留标注 + 移出）；
 * rejected 置 status + rejectNote（note 为空给默认提示）。均写 decidedBy/decidedAt。
 * @param {string} reqId 请求 id
 * @param {Object} params
 * @param {'approved'|'rejected'} params.decision
 * @param {string} [params.by] 决策人（支书）
 * @param {string} [params.note] 退回原因（仅 rejected 落 rejectNote）
 * @returns {Promise<{ok:boolean, request?:Object, reason?:string}>}
 */
export async function decideConfirmation(reqId, { decision, by, note } = {}) {
  const all = _all();
  const idx = all.findIndex(r => r.id === reqId && r.status === 'pending');
  if (idx === -1) return { ok: false, reason: '未找到待确认的请求（可能已被处理）' };
  if (decision !== 'approved' && decision !== 'rejected') {
    return { ok: false, reason: 'decision 须为 approved 或 rejected' };
  }
  const req = { ...all[idx] };
  const at = new Date().toISOString();
  req.decidedBy = by || null;
  req.decidedAt = at;
  if (decision === 'rejected') {
    req.status = 'rejected';
    req.rejectNote = (note === undefined || note === null ? '' : String(note).trim()) || '支书未确认生效，请求已退回';
    all[idx] = req;
    mockDB.pendingMemberConfirmations = all;
    bumpToken('memberConfirmation'); // P0：成员变更确认决策（退回）写口 bump
    _save();
    return { ok: true, request: { ...req } };
  }
  const apply = await _applyApproved(req);
  if (!apply.ok) return { ok: false, reason: apply.reason };
  req.status = 'approved';
  all[idx] = req;
  mockDB.pendingMemberConfirmations = all;
  bumpToken('memberConfirmation'); // P0：成员变更确认决策（生效）写口 bump
  _save();
  return { ok: true, request: { ...req } };
}

/** 已批准请求 → 业务落地（阶段/在册经服务写口；移出 = 安全解除 + 保留标注 + 移出档案） */
async function _applyApproved(req) {
  const { personId, action, kind, decidedBy } = req;
  if (kind === 'change' && action === 'developStage') {
    // 支委会讨论门兜底（批次 127）：历史 pending（本门之前发起、一直没确认的）在确认生效处**再挡一道**——
    // 否则「先发起、后上会」仍可绕过前置（发起时没挡住的存量请求会从这条路径生效）。
    if (committeeGateApplies(action, req.from, req.to) && !hasPassedCommitteeDiscussion(personId, req.to)) {
      return { ok: false, reason: COMMITTEE_GATE_DENY };
    }
    const r = await PersonStore.saveMember({ id: personId, developStage: req.to }, { by: decidedBy });
    if (!r.ok) return { ok: false, reason: r.reason || '发展阶段落地失败' };
    // C①-补（2026-09-10）：确认生效时同源写入既有覆盖档案（gsm1921-dev-stage-overrides）——
    // 「进入当前阶段日期」供组织台 buildDevelopNodeRemindGroup 派生发展节点提醒；退回/未确认不写。
    saveDevStageOverride(personId, {
      stage: req.to,
      entryDate: _normDate(req.entryDate) || _todayKey(),
    });
    return { ok: true };
  }
  if (kind === 'change' && action === 'residence') {
    if (!_person(personId)) return { ok: false, reason: '成员不存在（档案中无该 id）' };
    const resView = saveResidenceChange({
      personId, actorId: decidedBy, status: req.to, note: req.note || '',
    });
    if (resView) {
      // R-10（2026-09-11 支书裁定）：api 形态在册状态镜像走支书/副支书语义端点
      // （POST /members/:id/residence-status）——通用 PATCH /users/:id 仅 party-staff 可写，
      // 支书确认链经此会被 403 阻断。residenceMirror 标记仅 api 分流用；mock 形态行为不变。
      const mirror = await PersonStore.saveMember({
        id: personId,
        residenceStatus: resView.residenceStatus,
        residenceNote: resView.residenceNote,
        residenceHistory: resView.residenceHistory,
      }, { by: decidedBy, residenceMirror: true });
      if (!mirror.ok) return { ok: false, reason: mirror.reason || '在册状态镜像落档失败' };
    }
    return { ok: true };
  }
  // 存量兼容（Q-23-6，批次 29 复核保留）：新版本不再产生 kind=transferOut 的 pending，
  // 但旧版落库请求经 localStorage 跨刷新仍在队列里，此分支是其唯一出口（删则旧请求死锁）。
  if (kind === 'transferOut') {
    _executeTransferOut(personId, req.decidedAt);
    const r = await PersonStore.removeMember(personId, { by: decidedBy, guardRefs: false, transferOut: true });
    if (!r.ok) return { ok: false, reason: r.reason || '移出执行失败' };
    return { ok: true };
  }
  return { ok: false, reason: '未知请求类型' };
}

// ── 移出执行原语（decide approved / direct 共用；以当下数据重新扫描，保证执行与展示一致）──

/** 清安全引用（未开始的活动分工行 / 未生效报名 / 未读广播接收；整数组替换，符合 Immutable 原则） */
function _clearSafeRefs(safe) {
  let touchedActivity = false;
  let touchedSignup = false;
  for (const e of safe) {
    if (e.domain === 'activities') {
      const a = e.ref;
      if (!a) continue;
      mockDB.activities = mockDB.activities.map(x => (x === a
        ? { ...x, assignments: (x.assignments || []).filter(y => !(y && y.personId === e.row.personId)) }
        : x));
      touchedActivity = true;
    } else if (e.domain === 'signups') {
      mockDB.signups = mockDB.signups.filter(s => s !== e.row);
      touchedSignup = true;
    } else if (e.domain === 'committeeBroadcasts') {
      mockDB.committeeBroadcasts = mockDB.committeeBroadcasts.filter(b => b !== e.row);
    }
  }
  // P0：跨域直写（绕过对应 service 写口）→ 显式 bump 供聚合缓存失效
  if (touchedActivity) bumpToken('activity');
  if (touchedSignup) bumpToken('signup');
}

/** 保留记录转「已转出」标注（transferredOutAt；原记录保留、不删不匿名） */
function _annotateTransferredOut(personId, at) {
  const flag = (r) => (r && !r.transferredOutAt ? { ...r, transferredOutAt: at } : r);
  // 活动内嵌分工（安全行已清，余下即保留行）
  mockDB.activities = mockDB.activities.map(a => ({
    ...a,
    assignments: (a.assignments || []).map(x => (x && x.personId === personId) ? flag(x) : x),
  }));
  mockDB.assignments = mockDB.assignments.map(x => (x.assigneeId === personId ? flag(x) : x));
  mockDB.attendances = mockDB.attendances.map(r => (r.personId === personId ? flag(r) : r));
  mockDB.inspections = mockDB.inspections.map(r => (r.personId === personId ? flag(r) : r));
  mockDB.signups = mockDB.signups.map(s => (s.personId === personId ? flag(s) : s));
  mockDB.agendaVotes = mockDB.agendaVotes.map(v => (v.personId === personId ? flag(v) : v));
  mockDB.thoughtReports = mockDB.thoughtReports.map(t => (t.personId === personId ? flag(t) : t));
  mockDB.activityReviews = mockDB.activityReviews.map(r => (r.organizerId === personId ? flag(r) : r));
  mockDB.taskforceReviews = mockDB.taskforceReviews.map(r => (r.organizerId === personId ? flag(r) : r));
  // 成员变更申请：终态标注；非终态 → cancelled + cancelledAt（避免转出后仍被审批链处理）
  mockDB.memberChangeRequests = mockDB.memberChangeRequests.map(r => {
    if (r.personId !== personId) return r;
    const next = flag(r);
    if (!TERMINAL_MCR_STATUSES.has(r.status)) {
      next.status = 'cancelled';
      next.cancelledAt = at;
    }
    return next;
  });
  // 支委广播（未读已清，余下即已读保留行）
  mockDB.committeeBroadcasts = mockDB.committeeBroadcasts.map(b => (b.recipientId === personId ? flag(b) : b));
  // 专班成员：普通成员移除（转出 = 退出专班，专班保留）；负责人保留行 + 标注 + 提示先移交
  mockDB.taskforces = mockDB.taskforces.map(t => {
    let changed = false;
    const members = [];
    for (const m of t.members || []) {
      if (m && m.personId === personId) {
        changed = true;
        if (m.role === 'organizer') {
          members.push({ ...m, transferredOutAt: at, note: '专班负责人，转出前须先移交' });
        }
        // 非负责人 → 不保留（退出专班）
      } else {
        members.push(m);
      }
    }
    return changed ? { ...t, members } : t;
  });
  // P0：跨域直写（考勤/考察/复盘/专班/活动等绕过对应 service 写口）→ 显式 bump 供聚合缓存失效
  bumpToken('attendance');
  bumpToken('inspection');
  bumpToken('activityReview');
  bumpToken('taskforceReview');
  bumpToken('taskforce');
  bumpToken('signup');
  bumpToken('activity');
}

/** 移出执行（支书确认 approved 时调用）：当下重扫 → 安全解除 + 保留标注 */
function _executeTransferOut(personId, at) {
  const { safe } = _scanRefs(personId);
  if (safe.length > 0) _clearSafeRefs(safe);
  _annotateTransferredOut(personId, at);
}

// ── 读口 ────────────────────────────────────────────────────────

/**
 * 待支书确认请求（仅 pending；含 name/action/from→to/by/at/note/kind/refsSummary）
 * @returns {Object[]}
 */
export function listPendingConfirmations() {
  return _all().filter(r => r.status === 'pending');
}

/**
 * 读口：某人最后一次经成员变更确认链「支书确认生效」的发展阶段变更（D9 裁决批二 2026-09-08 发展观察用；
 * 无记录 → null）。返回 { from, to, at }（at=生效时间 decidedAt 兜底发起时间）。
 * @param {string} personId
 * @returns {Object|null}
 */
export function lastApprovedStageChange(personId) {
  const reqs = _all().filter(r =>
    r && r.status === 'approved' && r.action === 'developStage' && r.kind === 'change' && r.personId === personId
  );
  if (reqs.length === 0) return null;
  const last = reqs.reduce((m, r) =>
    (String(r.decidedAt || r.at || '').localeCompare(String(m.decidedAt || m.at || '')) > 0 ? r : m));
  return { from: last.from || '', to: last.to || '', at: last.decidedAt || last.at || '' };
}

/**
 * 是否已「转出」：档案已移除（removed overlay）且移除记录带 transferOut 标记（供读链 UI 标「已转出」）
 * @param {string} personId
 * @returns {boolean}
 */
export function isTransferredOut(personId) {
  const rec = findRemovedRecord(personId);
  return !!(rec && rec.transferOut === true);
}

/**
 * 学期末滞留集中复核提醒窗口（每学期末一次）：当前日期 ∈ 任一复核窗（policy 单一源 =
 * memberConfirmation.semesterDetainedWindows，每窗 [起月,起日,止月,止日]，止月<起月=跨次年）
 * 且存在在册滞留成员（getDetainedMembers 非空）。日期可注入（单测用），缺省 = 系统当前时间。
 * @param {Date|string|number} [now]
 * @returns {boolean}
 */
export function shouldShowSemesterDetainedRemind(now = new Date()) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) return false;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const md = month * 100 + day;
  const windows = POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows;
  const inWindow = Array.isArray(windows) && windows.some(w => {
    if (!Array.isArray(w) || w.length !== 4) return false;
    const [sm, sd, em, ed] = w;
    const s = (sm * 100) + sd;
    const e = (em * 100) + ed;
    return s <= e ? (md >= s && md <= e) : (md >= s || md <= e);
  });
  if (!inWindow) return false;
  return Array.isArray(getDetainedMembers()) && getDetainedMembers().length > 0;
}

/**
 * 滞留复核窗口人类可读文案（如 '6/15–7/15、12/15–次年1/15'）；windows 缺省 = 当前有效值
 * （读侧注入后可随组织域覆盖变化）。消费点：支书待办「学期末滞留集中复核」flow 文案等。
 * @param {Array<[number,number,number,number]>} [windows]
 * @returns {string}
 */
export function semesterDetainedWindowsLabel(windows = POLICY_DEFAULTS.memberConfirmation.semesterDetainedWindows) {
  if (!Array.isArray(windows) || !windows.length) return '';
  return windows.map(w => {
    if (!Array.isArray(w) || w.length !== 4) return '';
    const [sm, sd, em, ed] = w;
    const cross = (sm * 100 + sd) > (em * 100 + ed); // 止于次年
    return `${sm}/${sd}–${cross ? '次年' : ''}${em}/${ed}`;
  }).filter(Boolean).join('、');
}
