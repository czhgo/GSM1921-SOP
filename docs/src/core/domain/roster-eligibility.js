// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  roster-eligibility.js — 「在册 / 应到」资格判据**单一源**（2026-11-10 批次 541 · D-1）
// ════════════════════════════════════════════════════════════════
// 职责：把「一名成员是否在册」「是否计入应到名单」的判据收成纯函数，供两端同源 import：
//   · 客户端 `services/member/roster.js`（名册统计 / 会议应到 / 纪检 picker 禁用集）；
//   · 服务端 `server/routes/committee.js`（支委会待议池的应到名单 —— 跨人 / 跨设备必须一致的事实，见 `H32`）。
// 口径（母本注释 = `core/domain/policy-defaults.js` attendance.roster）：
//   - 应到 = 党员（`developStage ∈ cfg.partyStages`）且（`cfg.excludeDetained` 时）非滞留；
//   - 滞留 = 组织关系保留但人不在校，不参加日常会议 ⇒ 身份保留、应到剔除、通知照发；
//   - 已转出（`transferOut === true`）**不属在册成员** ⇒ 不进任何应到名单（判据在 `rosterEligibleIds` 前置）。
// 纯函数、无 DOM、无 IO、不 import services：服务端路由要直接 import，任何浏览器依赖都会把路由带崩。
// 滞留状态口径：调用方传「合并后的居住状态」（客户端 `getResidenceOf` 覆盖优先；服务端读 users 行原字段）。
// ════════════════════════════════════════════════════════════════

import { POLICY_DEFAULTS } from './policy-defaults.js?v=20261110b';
import { RESIDENCE } from './constants.js?v=20261110b';

/** 应到名单口径配置（派生导出 = policy-defaults attendance.roster，勿在业务层写新字面量） */
export function getRosterConfig() {
  return POLICY_DEFAULTS.attendance.roster;
}

/** 是否党员（`developStage ∈ partyStages`；非党员不参与应到） */
export function isRosterPartyMember(row, cfg = getRosterConfig()) {
  if (!row) return false;
  const stages = Array.isArray(cfg.partyStages) ? cfg.partyStages : [];
  return stages.includes(row.developStage);
}

/** 是否滞留（居住状态 === '滞留'；调用方负责先做覆盖合并） */
export function isRosterDetainedRow(row) {
  return !!row && row.residenceStatus === RESIDENCE.DETAINED;
}

/** 是否在应到名单内：党员 且（口径开启剔除时）非滞留 */
export function isRosterEligibleRow(row, cfg = getRosterConfig()) {
  return isRosterPartyMember(row, cfg) && (!cfg.excludeDetained || !isRosterDetainedRow(row));
}

/**
 * 应到名单 personId 数组（同口径、按入参顺序；已转出者前置剔除）。
 * @param {Array} rows 成员行（含 id / developStage / residenceStatus / transferOut）
 * @param {Object} [cfg] 应到口径（缺省 = `getRosterConfig()`）
 * @returns {string[]}
 */
export function rosterEligibleIds(rows, cfg = getRosterConfig()) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && row.transferOut !== true && row.id)
    .filter((row) => isRosterEligibleRow(row, cfg))
    .map((row) => String(row.id));
}

/**
 * 应到口径统计（R10-B12 单一源）：任意成员行 → 应到＝党员−滞留，并按组统计。
 * 纯函数（不读存储）：名册导入预览、成员预览、服务端待议池应到共用同一公式。
 * @param {Array} rows 成员行（含 developStage / residenceStatus / partyGroup）
 * @param {string[]} [groups] 组序（缺省不产 perGroup；调用方传 groupOptions() 即活组）
 * @returns {{ partyTotal:number, official:number, probationary:number, detained:number,
 *            expected:number, perGroup:Object<string,{partyTotal:number,expected:number,detainedParty:number}> }}
 */
export function computeRosterStats(rows, groups = []) {
  const cfg = getRosterConfig();
  const party = (Array.isArray(rows) ? rows : []).filter((p) => isRosterPartyMember(p, cfg));
  const official = party.filter((p) => p.developStage === '正式党员').length;
  const probationary = party.filter((p) => p.developStage === '预备党员').length;
  const detained = party.filter(isRosterDetainedRow).length;
  const expected = party.length - (cfg.excludeDetained ? detained : 0);
  const perGroup = {};
  for (const g of Array.isArray(groups) ? groups : []) {
    const gp = party.filter((p) => p.partyGroup === g);
    const gd = gp.filter(isRosterDetainedRow).length;
    perGroup[g] = {
      partyTotal: gp.length,
      expected: gp.length - (cfg.excludeDetained ? gd : 0),
      detainedParty: cfg.excludeDetained ? gd : 0,
    };
  }
  return { partyTotal: party.length, official, probationary, detained, expected, perGroup };
}
