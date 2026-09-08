// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/branch-roster-import.js — 空支部「整表导入/替换名册」服务（立项⑥ B波，2026-09-06）
// ════════════════════════════════════════════════════════════════
// 书记口径：整支部换名单在网页一次导入即可落库（不再「下载模板改文件」）；仅空支部可整体
//   替换（有历史/成员的支部拒绝，提示改用逐人编辑成员档案）；导入后成员/应到统计即时可见。
// 语义（与 services/person.js replaceBranchMembers 契约对齐——A波已备写口，本模块只做净化+预览）：
//   · 名册行 = 现有成员档案成员（id 锚点，白名单 = 当前成员档案中属支部者，p_pc 党委组织员除外）。
//     确认导入 = PersonStore.replaceBranchMembers(rows, {branchId})：把名册行整体落为该支部成员
//     （mock → members 持久覆盖层；api → server users 批量），其余档案成员留在原支部。
//   · 行字段 = 五项基础字段可改（name/partyGroup/developStage/residenceStatus/residenceNote）：
//     白名单外 id / 空姓名 → 整条丢弃；非法枚举 → 回退该成员档案原值（不丢人、不清数据）；
//     studentId/role 档案权威、文件不可改（随净化行一并带出，保 api 重建整行完整）。
//   · stats = 净化行（即目标空支部导入后的全支部成员）套应到口径（正式党员/预备党员非滞留，
//     与 services/roster.js / org-base-data-preview 同源 policy-defaults），供「确认前统计卡」。
// 复用点（禁改 org-base-data-preview.js / person.js，只读消费）：
//   · 枚举/字面量单一源：org-base-data-preview 导出的 RESIDENCE / PARTY_GROUP_OPTIONS /
//     DEVELOP_STAGE_OPTIONS（种子派生）；partyStages/excludeDetained = policy-defaults attendance.roster。
//   · 档案白名单 = person.js getBaseMemberRecords（含 members 覆盖层，mock 读链同视图）。
//   · 模板行复用 buildPreviewTemplate().people（下载 json 名册模板），kind/usage 换成导入口径。
// 纯 ESM、无 DOM：localStorage 由 person.js 内部以 typeof 守卫惰性访问 → 浏览器 / Node 双端可载（单测直导）。
// ════════════════════════════════════════════════════════════════

import { getBaseMemberRecords } from './person.js?v=20260908d';
import {
  RESIDENCE, PARTY_GROUP_OPTIONS, DEVELOP_STAGE_OPTIONS, buildPreviewTemplate,
} from './org-base-data-preview.js?v=20260908d';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260908d';

/** 空支部名册包类型标识（与预览包 kind 区分；净化时兼容两 kind——预览模板行结构同源） */
export const BRANCH_ROSTER_KIND = 'gsm1921-branch-roster';
/** 名册包结构版本（当前 1；未来字段演进时 bump 并做迁移） */
export const BRANCH_ROSTER_VERSION = 1;

/** 应到口径（与 roster/preview 同单一源 = policy-defaults attendance.roster，勿在业务层写字面量） */
const ROSTER_CFG = POLICY_DEFAULTS.attendance.roster;

/**
 * 当前可迁成员档案（纯）：属支部成员（branchId 非空）→ 名册净化白名单 / 字段回退基底。
 * 读取链 = person.js getBaseMemberRecords（mock：PEOPLE 种子 + members 覆盖层；api 读侧保持现状链）。
 * @returns {Map<string,Object>} id → 成员档案记录
 */
function _movableArchiveMap() {
  const map = new Map();
  for (const p of getBaseMemberRecords()) {
    if (!p || !p.id) continue;
    if (p.branchId === null || p.branchId === undefined) continue; // 党委组织员不属于支部，不可迁
    map.set(String(p.id), p);
  }
  return map;
}

/** 应到口径统计（与 org-base-data-preview 同公式：应到 = 党员非滞留；党小组按组保序）——纯函数入参行 */
function _computeStats(rows) {
  const isParty = p => ROSTER_CFG.partyStages.includes(p.developStage);
  const isDetained = p => p.residenceStatus === RESIDENCE.DETAINED;
  const party = rows.filter(isParty);
  const official = party.filter(p => p.developStage === '正式党员').length;
  const probationary = party.filter(p => p.developStage === '预备党员').length;
  const detained = party.filter(isDetained).length;
  const expected = party.length - (ROSTER_CFG.excludeDetained ? detained : 0);
  const perGroup = {};
  for (const g of PARTY_GROUP_OPTIONS) {
    const gp = party.filter(p => p.partyGroup === g);
    const gd = gp.filter(isDetained).length;
    perGroup[g] = {
      partyTotal: gp.length,
      expected: gp.length - (ROSTER_CFG.excludeDetained ? gd : 0),
      detainedParty: ROSTER_CFG.excludeDetained ? gd : 0,
    };
  }
  return { partyTotal: party.length, official, probationary, detained, expected, perGroup };
}

/**
 * 下载用「空支部成员名册模板」JSON（纯函数）：行内容复用 buildPreviewTemplate（全部可迁成员一行一项、
 *   五项基础字段可改），kind/usage 换成「整支部导入落库」口径——成员按真实名册保留迁入行、删去其余。
 * @returns {{kind:string, version:number, exportedAt:string, usage:string, people:Array}}
 */
export function buildBranchRosterTemplate() {
  const base = buildPreviewTemplate(); // 复用预览模板行结构（id 锚点 + 五项基础字段）
  return {
    kind: BRANCH_ROSTER_KIND,
    version: BRANCH_ROSTER_VERSION,
    exportedAt: new Date().toISOString(),
    usage: '空支部成员名册包（整支部导入/替换·正式落库）：模板列出成员档案中的现有成员（每行一名），'
      + '把要迁入本支部的行保留、其余删去即可。每行可改五项基础字段——name 姓名（不可为空）、'
      + 'partyGroup 党小组归属（第一/第二/第三党小组）、developStage 发展阶段（正式党员/预备党员/发展对象/积极分子）、'
      + 'residenceStatus 在校|滞留、residenceNote 滞留备注（自由文本，可为空）。'
      + 'id 为成员锚点不可改（不在现有成员档案中的行整条忽略）；非法枚举回退该成员档案原值、空姓名整条忽略。'
      + '导入 = 净化后预览统计 → 确认后一次落库（仅空支部可用；非空支部请逐人编辑成员档案，勿整表替换）。',
    people: base.people,
  };
}

/**
 * 单行净化：白名单（现有档案属支部成员）外 / 姓名为空 → null（丢弃）；
 * partyGroup / developStage / residenceStatus 枚举非法 → 回退档案原值（不清数据）；
 * studentId/role 档案权威（文件改不动，净化行带出保证 api 重建整行完整）。
 */
function _cleanRow(row, movable) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const rawId = row.id === undefined || row.id === null ? '' : String(row.id).trim();
  const rec = rawId ? movable.get(rawId) : null;
  if (!rec) return null;                 // 白名单外（不在现有成员档案 / 党委组织员）→ 丢弃
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;                // 姓名空 → 丢弃
  const partyGroup = PARTY_GROUP_OPTIONS.includes(row.partyGroup) ? row.partyGroup : (rec.partyGroup || '');
  const developStage = DEVELOP_STAGE_OPTIONS.includes(row.developStage) ? row.developStage : (rec.developStage || '');
  const statusOk = row.residenceStatus === RESIDENCE.CAMPUS || row.residenceStatus === RESIDENCE.DETAINED;
  const residenceStatus = statusOk ? row.residenceStatus : (rec.residenceStatus || RESIDENCE.CAMPUS);
  const residenceNote = statusOk
    ? (typeof row.residenceNote === 'string' ? row.residenceNote.trim() : (rec.residenceNote || ''))
    : (rec.residenceNote || '');
  return {
    id: rec.id,
    name,
    studentId: rec.studentId || '',
    partyGroup,
    developStage,
    role: rec.role || 'participant',
    residenceStatus,
    residenceNote,
  };
}

/**
 * 净化导入名册（数组 或 { people:[...] } 包皆可；kind 兼容本模块名册包与预览模板包）。
 * 非法项策略：白名单外 id / 姓名为空 → 整条丢弃（dropped+1）；枚举非法 → 回退该成员档案原值。
 * stats = 净化行套应到口径（目标为空支部 → 导入后全支部成员即这些行；支部大会应到 = 党员 − 滞留、
 *   党小组按组），与 roster 口径一致，供确认前统计卡。
 * @param {Array|Object} input 名册行数组 或 { kind?, version?, people:[...] } 包
 * @returns {{valid:boolean, people?:Array, stats?:Object, dropped?:number, reason?:string}}
 */
export function sanitizeBranchRoster(input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    // 包级门槛（防误导入异类 JSON）：kind 已知（名册包 / 预览模板包）或缺失均放行；版本仅支持当前
    if (input.kind !== undefined && input.kind !== null
      && input.kind !== BRANCH_ROSTER_KIND && input.kind !== 'gsm1921-base-data') {
      return { valid: false, reason: `不是成员名册文件（kind=${String(input.kind)}，应为 ${BRANCH_ROSTER_KIND}）` };
    }
    if (input.version !== undefined && input.version !== null && input.version !== BRANCH_ROSTER_VERSION) {
      return { valid: false, reason: `名册文件版本不支持（${String(input.version)}，当前 ${BRANCH_ROSTER_VERSION}）` };
    }
  }
  const raw = Array.isArray(input) ? input : (input && Array.isArray(input.people) ? input.people : null);
  if (!raw) return { valid: false, reason: '未识别到成员名册（people 数组）' };
  if (!raw.length) return { valid: false, reason: '名单为空（people 为空数组，无成员行）' };
  const movable = _movableArchiveMap();
  const cleaned = [];
  let dropped = 0;
  for (const row of raw) {
    const c = _cleanRow(row, movable);
    if (c) cleaned.push(c); else dropped += 1;
  }
  if (!cleaned.length) {
    return { valid: false, reason: '名单净化后无有效成员（行须为档案中现有成员且姓名非空）' };
  }
  return { valid: true, people: cleaned, stats: _computeStats(cleaned), dropped };
}
