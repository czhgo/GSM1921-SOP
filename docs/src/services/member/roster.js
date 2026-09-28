// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  roster.js — 会议「应到名单」纯模块（S1–S4 滞留党员设计，2026-09-06 支书已批）
// ════════════════════════════════════════════════════════════════
// 业务语义（支书口径，详见 core/policy-defaults.js attendance.roster 注释）：
//   - 滞留 = 组织关系在本支部但人不在校、不参加日常会议；成员身份保留、应到剔除、通知照发。
//   - 应到（三会+党课统一）= 党员（developStage ∈ partyStages = 正式党员/预备党员）且非滞留；
//     党小组会 = 本组党员非滞留；党课列席（积极分子/发展对象）不计应到。
//   - 留痕记录 { from, to, updatedBy, updatedAt }（组织委员维护；支书可复核查看）。
// 数据分层：
//   - 静态默认：docs/src/mock/people.js（人员档案含 residenceStatus/residenceNote/residenceHistory）；
//   - 运行期覆盖（**仅 mock 形态**）：组织委员在成员档案界面维护，落 localStorage（键 RESIDENCE_KEY）；
//     读取规则 = 覆盖优先、缺省回退静态字段，未标注者默认「在校」。
// ⚠ **双形态分流（2026-09-24 批次 169，支书逐字「不能什么都依靠浏览器缓存」）**：
//   · api 形态：在册状态以**服务端 users 行**为唯一权威——本模块**不读** localStorage 覆盖
//     （`_loadResidenceOverrides` 在 api 形态返回空表）；people 行的 residenceStatus / residenceNote /
//     residenceHistory 三字段由 `init()` 自服务端灌入 mockDB.users（person.js::_baseMemberRecords）。
//     `saveResidenceChange` 在 api 形态只做「视图计算 + 缓存乐观更新」，真实落库由调用方
//     （member-confirmation._applyApproved → PersonStore.saveMember residenceMirror → POST
//     /members/:id/residence-status）完成 ⇒ 服务器为权威、清本机缓存不丢状态。
//   · mock 形态：原路径一字未改（localStorage 覆盖 + 留痕）。
// 纯 ESM：仅依赖 people/person/policy-defaults/data-adapter（全部 node 可载，无 DOM）；
//   localStorage 仅在函数内以 typeof 守卫惰性访问 → 浏览器 / Node 双端可用（单测直导）。
// 消费点：纪检会议考勤录入（disc attendance-tab 候选与全选）、成员档案维护 UI、支书复核卡。
// ════════════════════════════════════════════════════════════════

import { POLICY_DEFAULTS } from '../../core/policy-defaults.js?v=20260928r';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/constants.js（本模块原先自持一份与
//   org-base-data-preview 同值的副本，两处维护；现统一 import 叶子模块，防循环依赖见该文件注释）。
import { RESIDENCE } from '../../core/constants.js?v=20260928r';
import { PersonStore } from './person.js?v=20260928r';
// 双形态判定（mock/api）：api 形态下在册状态以服务端 users 行为权威，本模块不再读 localStorage 覆盖
//   （2026-09-24 批次 169）。data-adapter 为零静态业务依赖的叶子模块（仅 import pending-writes）⇒ 无环。
import { getDataSource } from '../../core/data-adapter.js?v=20260928r';
import { mockDB } from '../../core/domain.js?v=20260928r';

/** 运行期覆盖的 localStorage 键（组织委员维护写入；与 members UI / 纪检表单同源读取；
 *  ⚠ **仅 mock 形态生效**——api 形态本键恒不被读写，在册状态以服务端 users 行为单一权威） */
export const RESIDENCE_KEY = 'gsm1921-residence-overrides';

/** 是否 api 形态（读链走服务端 users 行 = 单一权威；本模块不读 localStorage 覆盖） */
function _isApiForm() {
  try { return getDataSource() === 'api'; } catch (_) { return false; }
}

/** 应到名单口径配置（派生导出 = policy-defaults attendance.roster，勿在业务层写新字面量） */
export function getRosterConfig() {
  return POLICY_DEFAULTS.attendance.roster;
}

// ── 运行期覆盖存取（**仅 mock 形态**；api 形态一律返回空表 / 不写） ──
// api 形态：在册状态三字段随 users 行自服务端灌入 mockDB.users（init）⇒ 覆盖表读取无意义，
//   且若继续读它，本机残留的旧覆盖会与服务器 users 双轨互盖（2026-09-24 批次 169 收口）。
function _loadResidenceOverrides() {
  if (_isApiForm()) return {};
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(RESIDENCE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}

function _saveResidenceOverrides(map) {
  if (_isApiForm()) return; // api 形态：不落本机覆盖（服务端 users 行为单一权威）
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RESIDENCE_KEY, JSON.stringify(map));
  } catch (_) { /* 存储不可用静默（演示数据缺省仍可用） */ }
}

/** api 形态：把居住状态视图乐观写回 mockDB.users 缓存（服务端响应随后的 _syncMockDBUsers 会再覆盖；
 *  下一次 init / 远端探测也以服务端为准 ⇒ 缓存不是权威、清缓存不丢状态） */
function _mergeResidenceIntoUserCache(personId, view) {
  const users = Array.isArray(mockDB.users) ? mockDB.users : null;
  if (!users) return;
  const idx = users.findIndex(u => u && u.id === personId);
  if (idx < 0) return;
  mockDB.users = [...users.slice(0, idx), { ...users[idx], ...view }, ...users.slice(idx + 1)];
}

/** 合并静态档案与运行期覆盖 → 单条人员的居住状态视图 */
function _mergeResidence(person, override) {
  const base = {
    residenceStatus: person.residenceStatus || RESIDENCE.CAMPUS,
    residenceNote: person.residenceNote || '',
    residenceHistory: person.residenceHistory || [],
  };
  if (!override) return base;
  return {
    residenceStatus: override.residenceStatus || base.residenceStatus,
    residenceNote: override.residenceNote !== undefined ? (override.residenceNote || '') : base.residenceNote,
    residenceHistory: override.residenceHistory || base.residenceHistory,
  };
}

/**
 * 取某人员的居住状态视图（覆盖优先、缺省回退静态、未标注默认「在校」）
 * @param {Object} person 人员对象（含 id；residenceStatus 等可选）
 * @returns {{ residenceStatus:'在校'|'滞留', residenceNote:string, residenceHistory:Array }}
 */
export function getResidenceOf(person) {
  if (!person) return { residenceStatus: RESIDENCE.CAMPUS, residenceNote: '', residenceHistory: [] };
  return _mergeResidence(person, _loadResidenceOverrides()[person.id]);
}

/**
 * 支部有效成员快照：静态 PEOPLE 逐条套用运行期覆盖（返回新数组，不改源数据）
 * @param {string} [branchId] 支部 id（demo 全体 br-b1；p_pc 党委组织员 branchId=null 非本支部）
 * @returns {Array} 人员数组（含合并后的 residence* 字段）
 */
export function getEffectiveMembers(branchId) {
  const overrides = _loadResidenceOverrides();
  return PersonStore.getMembers()
    .map(p => (overrides[p.id] ? { ...p, ..._mergeResidence(p, overrides[p.id]) } : p))
    .filter(p => !branchId || p.branchId === branchId);
}

/** 是否党员（developStage ∈ 应到口径 partyStages） */
export function isPartyMember(person, cfg = getRosterConfig()) {
  return !!person && cfg.partyStages.includes(person.developStage);
}

/** 是否滞留（居住状态 === '滞留'） */
export function isDetained(person) {
  return getResidenceOf(person).residenceStatus === RESIDENCE.DETAINED;
}

/** 是否在应到名单内：党员 且（口径开启剔除时）非滞留 */
export function isRosterEligible(person, cfg = getRosterConfig()) {
  return isPartyMember(person, cfg) && (!cfg.excludeDetained || !isDetained(person));
}

/**
 * 会议应到名单（统一口径，支书已批 S1–S4）：
 *   - type = '党小组会'：须给 groupId（党小组），取本组党员非滞留；
 *   - 其余支部会议（支部党员大会/党课/组织生活会/支委会 等会议考勤类型）：
 *     全支部党员（正式+预备）非滞留；党课列席（积极分子/发展对象）不计应到。
 * @param {Object} params
 * @param {string} [params.type]      会议活动类型（'党小组会' 走小组口径）
 * @param {string} [params.groupId]   党小组名（'第一党小组'…；党小组会必填）
 * @param {string} [params.branchId]  支部 id（缺省 = 不按支部过滤，demo 人员均属本支部）
 * @returns {Array} 应到 person 数组（去除滞留的候选集，供纪检 picker / 全选范围）
 */
export function getMeetingRoster({ type, groupId, branchId } = {}) {
  const cfg = getRosterConfig();
  let members = getEffectiveMembers(branchId);
  if (type === '党小组会') {
    if (!groupId) return []; // 小组口径缺小组语境 → 空（不猜测全支部）
    members = members.filter(p => p.partyGroup === groupId);
  }
  return members.filter(p => isRosterEligible(p, cfg));
}

/** 应到名单 personId 数组（与 getMeetingRoster 同源，供全选/校验） */
export function getMeetingRosterIds(opts = {}) {
  return getMeetingRoster(opts).map(p => p.id);
}

/**
 * 会议考勤「可见候选 + 禁用集合」（纪检/组长表单共用，支书 2026-09-06 ①批）：
 *   - candidates = 本范围党员（developStage ∈ partyStages，含滞留者）——滞留者不再被
 *     filter 整体剔除，而是「可见但不可选」（PersonPicker disabledIds），使录入人
 *     （纪检/组长）能直接看到"此人为何不在应到"（灰态 + 「滞留」徽标 + title 备注）；
 *   - disabledIds = candidates 中滞留党员 id（口径 excludeDetained=false 时为空表；
 *     党小组会缺 groupId → 不猜测，返回空）。
 * 与 getMeetingRoster 同范围同规则，仅差「滞留者是否可见」：应到 = candidates − disabledIds。
 * @param {Object} params 同 getMeetingRoster（type/groupId/branchId）
 * @returns {{ candidates:Array, disabledIds:string[] }}
 */
export function getMeetingRosterCandidates({ type, groupId, branchId } = {}) {
  const cfg = getRosterConfig();
  let members = getEffectiveMembers(branchId);
  if (type === '党小组会') {
    if (!groupId) return { candidates: [], disabledIds: [] };
    members = members.filter(p => p.partyGroup === groupId);
  }
  const candidates = members.filter(p => isPartyMember(p, cfg));
  const disabledIds = cfg.excludeDetained
    ? candidates.filter(p => isDetained(p)).map(p => p.id)
    : [];
  return { candidates, disabledIds };
}

/**
 * 应到清点统计（供界面展示「应到 N 人 / 滞留 M 人已剔除」）
 * @returns {{ expected:number, partyTotal:number, detainedParty:number }}
 *   expected = 应到（党员非滞留）；partyTotal = 同范围党员总数（正式+预备）；
 *   detainedParty = 其中滞留被剔除的党员数（expected = partyTotal − detainedParty）
 */
export function getRosterStats({ type, groupId, branchId } = {}) {
  const cfg = getRosterConfig();
  let members = getEffectiveMembers(branchId);
  if (type === '党小组会') {
    if (!groupId) return { expected: 0, partyTotal: 0, detainedParty: 0 };
    members = members.filter(p => p.partyGroup === groupId);
  }
  const party = members.filter(p => isPartyMember(p, cfg));
  const detained = party.filter(p => isDetained(p));
  return {
    expected: party.length - (cfg.excludeDetained ? detained.length : 0),
    partyTotal: party.length,
    detainedParty: cfg.excludeDetained ? detained.length : 0,
  };
}

/** 滞留成员名单（成员档案状态='滞留'；含备注/留痕供支书复核查看） */
export function getDetainedMembers({ branchId } = {}) {
  return getEffectiveMembers(branchId).filter(p => isDetained(p));
}

/**
 * 维护成员居住状态（组织委员位；留痕入档，支书可复核）
 * 留痕记录 = { from, to, updatedBy, updatedAt, [note] }（from=变更前状态，to=变更后状态）
 * 形态分流（2026-09-24 批次 169）：
 *  · mock 形态：写 localStorage 覆盖（KEY=RESIDENCE_KEY）——原路径不变；
 *  · api 形态：**不落本机覆盖**，只把视图乐观写回 mockDB.users 缓存并返回；
 *    真正落库由调用方经语义端点完成（member-confirmation._applyApproved → saveMember residenceMirror
 *    → POST /members/:id/residence-status；服务端为权威、清本机缓存不丢状态）。
 * @param {Object} params
 * @param {string} params.personId 成员 id
 * @param {string} params.actorId  维护人 personId（组织委员）
 * @param {'在校'|'滞留'} params.status 目标状态
 * @param {string} [params.note]   备注（原因/起止文字）
 * @returns {Object|null} 更新后的居住状态视图；参数非法或状态/备注均无变化时返回 null（不写留痕）
 */
export function saveResidenceChange({ personId, actorId, status, note }) {
  if (!personId) return null;
  if (![RESIDENCE.CAMPUS, RESIDENCE.DETAINED].includes(status)) return null;
  const person = PersonStore.getMembers().find(p => p.id === personId);
  if (!person) return null;
  const api = _isApiForm();
  const map = _loadResidenceOverrides(); // api 形态恒为 {}（单一权威＝服务端 users 行）
  const prev = _mergeResidence(person, map[personId]);
  const cleanNote = note !== undefined && note !== null ? String(note).trim() : prev.residenceNote;
  const changed = prev.residenceStatus !== status || cleanNote !== prev.residenceNote;
  if (!changed) return null; // 无实质变化：不写覆盖、不产生冗余留痕
  const entry = { from: prev.residenceStatus, to: status, updatedBy: actorId || null, updatedAt: new Date().toISOString() };
  if (cleanNote) entry.note = cleanNote;
  const next = {
    residenceStatus: status,
    residenceNote: cleanNote,
    residenceHistory: [...(prev.residenceHistory || []), entry],
  };
  if (api) {
    _mergeResidenceIntoUserCache(personId, next); // 乐观更新缓存（服务端响应 / 下次 init 覆盖）
    return next;
  }
  map[personId] = next;
  _saveResidenceOverrides(map);
  return next;
}
