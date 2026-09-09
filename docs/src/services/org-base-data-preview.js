// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/org-base-data-preview.js — 成员基础数据「预览 override」（立项④阶段三·目标1，2026-09-06 书记已认可）
// ════════════════════════════════════════════════════════════════
// 定位：给「换组织管理员」补齐「成员基础数据先看效果」——把成员名册（姓名/党小组归属/发展阶段/
//   在校·滞留）导出模板（JSON）→ 本地改 → 导入本地预览：应到数字 / 党员分布即时可见变化；
//   可一键清除回种子。
// 边界（书记口径，与换壳工作单一致）：预览只作用于「成员基础视图」五项基础字段，绝不写 mockDB /
//   静态种子持久；业务历史（活动/考勤/议程/专班等）不迁移——仍关联演示成员，正式换数据
//   请按「换壳工作单」落仓库文件（UI 已注明）。
// 覆盖字段与 mock/people.js 档案字段同名：name/partyGroup/developStage/residenceStatus/residenceNote。
// 叠加点 = services/person.js（PersonStore 读取时套 overlayPreviewMembers）→ roster 应到链
//   （getEffectiveMembers/getRosterStats/getMeetingRoster）与姓名解析自动吃到预览效果。
// 依赖方向（防循环）：本模块只 import mock/people.js + core/policy-defaults.js，
//   不 import services/person.js / services/roster.js（person.js → preview 单向依赖）；
//   居住状态字面量 RESIDENCE 与 roster.js 同值（单测断言防漂移）。
// 纯 ESM、无 DOM；localStorage 仅在函数内以 typeof 守卫惰性访问 → 浏览器 / Node 双端可载（单测直导）。
// ════════════════════════════════════════════════════════════════

import { PEOPLE } from '../mock/people.js?v=20260909e';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260909e';

/** 预览包类型标识（导入门槛，防误导入异类 JSON） */
export const PREVIEW_KIND = 'gsm1921-base-data';
/** 预览包结构版本（当前 1；未来字段演进时 bump 并做迁移） */
export const PREVIEW_VERSION = 1;
/** localStorage 预览键（applyPreview 写入 / overlay 读取 / clearPreview 移除；与 roster RESIDENCE_KEY 互不影响） */
export const PREVIEW_KEY = 'gsm1921-base-data-preview';
/** 预览仅覆盖的基础字段（其余档案字段 studentId/role/branchId 一律不碰） */
export const BASE_FIELDS = ['name', 'partyGroup', 'developStage', 'residenceStatus', 'residenceNote'];
/** 居住状态字面量（与 services/roster.js RESIDENCE 同值；本模块不 import roster 防 person→preview→roster 循环） */
export const RESIDENCE = { CAMPUS: '在校', DETAINED: '滞留' };

// 应到口径单一源 = policy-defaults attendance.roster（勿在业务层新写字面量）
const ROSTER_CFG = POLICY_DEFAULTS.attendance.roster;
const PARTY_STAGES = ROSTER_CFG.partyStages;
const EXCLUDE_DETAINED = !!ROSTER_CFG.excludeDetained;

// ── 静态种子成员与枚举（白名单单一源 = mock/people.js；p_pc 党委组织员 branchId=null 不属于支部）──
const SEED_MEMBERS = PEOPLE.filter(p => p.branchId !== null && p.branchId !== undefined);
const SEED_MAP = new Map(SEED_MEMBERS.map(p => [p.id, p]));
/** 现有成员 id 白名单（id 在名单外 → 整条丢弃） */
export const MEMBER_IDS = SEED_MEMBERS.map(p => p.id);
/** 党小组枚举（由静态种子派生，加组不落新字面量） */
export const PARTY_GROUP_OPTIONS = [...new Set(SEED_MEMBERS.map(p => p.partyGroup).filter(Boolean))];
/** 发展阶段枚举（由静态种子派生，四阶段） */
export const DEVELOP_STAGE_OPTIONS = [...new Set(SEED_MEMBERS.map(p => p.developStage).filter(Boolean))];

// ── localStorage 存取（typeof 守卫 → node 环境安全返回空）──
function _loadPreview() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PREVIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function _savePreview(data) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(data));
    return true;
  } catch (_) { return false; }
}

/**
 * 导出「成员名单模板」（纯函数，无 DOM / 无写存储）：本支部成员一行一项，
 * 字段 = 五项基础字段 + id 锚点（id 不可改，用户按真实名册逐行编辑其余字段）。
 * @returns {{kind:string, version:number, exportedAt:string, usage:string, people:Array}}
 */
export function buildPreviewTemplate() {
  return {
    kind: PREVIEW_KIND,
    version: PREVIEW_VERSION,
    exportedAt: new Date().toISOString(),
    usage: '成员基础数据预览模板（换组织用）：每行只改五项基础字段——name 姓名（不可为空）、'
      + 'partyGroup 党小组归属（第一/第二/第三党小组）、developStage 发展阶段（正式党员/预备党员/发展对象/积极分子）、'
      + 'residenceStatus 在校|滞留、residenceNote 滞留备注（自由文本，可为空）。'
      + 'id 为成员锚点不可改（白名单外整条忽略）；非法枚举回退该成员原值、空姓名整条忽略；'
      + '删行不生效（该成员保持种子现状，预览不增减成员，正式减员走成员档案流程）。'
      + '注意：业务历史（活动/考勤/议程/专班等）仍关联演示成员，正式换数据请按换壳工作单落仓库文件。',
    people: SEED_MEMBERS.map(p => ({
      id: p.id,
      name: p.name,
      partyGroup: p.partyGroup,
      developStage: p.developStage,
      residenceStatus: p.residenceStatus || RESIDENCE.CAMPUS,
      residenceNote: p.residenceNote || '',
    })),
  };
}

/**
 * 单行净化：id 白名单外 / 姓名为空 → null（丢弃）；枚举非法 → 回退种子原值（不清数据）。
 * 居住状态：residenceStatus 非法/缺失 → 状态与备注一并回退种子口径（防「在校却挂滞留备注」错位）。
 */
function _cleanRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const seed = SEED_MAP.get(String(row.id));
  if (!seed) return null;                 // id 白名单外 → 丢弃
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;                 // 姓名空 → 丢弃
  const partyGroup = PARTY_GROUP_OPTIONS.includes(row.partyGroup) ? row.partyGroup : seed.partyGroup;
  const developStage = DEVELOP_STAGE_OPTIONS.includes(row.developStage) ? row.developStage : seed.developStage;
  const statusOk = row.residenceStatus === RESIDENCE.CAMPUS || row.residenceStatus === RESIDENCE.DETAINED;
  const residenceStatus = statusOk ? row.residenceStatus : (seed.residenceStatus || RESIDENCE.CAMPUS);
  const residenceNote = statusOk
    ? (typeof row.residenceNote === 'string' ? row.residenceNote.trim() : (seed.residenceNote || ''))
    : (seed.residenceNote || '');
  return { id: seed.id, name, partyGroup, developStage, residenceStatus, residenceNote };
}

/** 应到口径统计（与 roster.js 一致：应到 = 党员非滞留；小组按组；党小组名保序） */
function _computeStats(members) {
  const isParty = p => PARTY_STAGES.includes(p.developStage);
  const isDetained = p => p.residenceStatus === RESIDENCE.DETAINED;
  const party = members.filter(isParty);
  const official = party.filter(p => p.developStage === '正式党员').length;
  const probationary = party.filter(p => p.developStage === '预备党员').length;
  const detained = party.filter(isDetained).length;
  const expected = party.length - (EXCLUDE_DETAINED ? detained : 0);
  const perGroup = {};
  for (const g of PARTY_GROUP_OPTIONS) {
    const gp = party.filter(p => p.partyGroup === g);
    const gd = gp.filter(isDetained).length;
    perGroup[g] = {
      partyTotal: gp.length,
      expected: gp.length - (EXCLUDE_DETAINED ? gd : 0),
      detainedParty: EXCLUDE_DETAINED ? gd : 0,
    };
  }
  return { partyTotal: party.length, official, probationary, detained, expected, perGroup };
}

/** 净化行套到种子 → 预览后成员视图（文件未覆盖的成员保持种子原值） */
function _viewWithRows(rows) {
  const map = new Map(rows.map(r => [r.id, r]));
  return SEED_MEMBERS.map(p => {
    const r = map.get(p.id);
    if (!r) return p;
    const next = { ...p };
    for (const f of BASE_FIELDS) if (r[f] !== undefined) next[f] = r[f];
    return next;
  });
}

/**
 * 净化导入名单（数组 或 { people:[...] } 包皆可）
 * 非法项策略：id 白名单外 / 姓名为空 → 整条丢弃（dropped+1）；partyGroup / developStage /
 *   residenceStatus 枚举外 → 回退该成员种子原值。stats = 净化行套到种子后的应到口径预览读数
 *   （与 roster 口径一致：支部党员大会应到 = 党员 − 滞留、党小组按组）。
 * @param {Array|Object} input 名单数组 或 { people:[...] } 包
 * @returns {{valid:boolean, people?:Array, stats?:Object, dropped?:number, reason?:string}}
 */
export function sanitizePreview(input) {
  const raw = Array.isArray(input) ? input : (input && Array.isArray(input.people) ? input.people : null);
  if (!raw) return { valid: false, reason: '未识别到成员名单（people 数组）' };
  const cleaned = [];
  let dropped = 0;
  for (const row of raw) {
    const c = _cleanRow(row);
    if (c) cleaned.push(c); else dropped += 1;
  }
  if (!cleaned.length) return { valid: false, reason: '名单净化后无有效成员（id 白名单外 / 姓名为空被忽略）' };
  return { valid: true, people: cleaned, stats: _computeStats(_viewWithRows(cleaned)), dropped };
}

/**
 * 应用预览：写 localStorage 预览键（输入须为 sanitizePreview 输出 people——已净化）。
 * 读取方 = PersonStore（读取时叠加五项基础字段）；不写 mockDB / 静态种子，clearPreview 即回种子。
 * @param {Array} rows 净化后的成员行
 * @returns {{ok:boolean, reason?:string}}
 */
export function applyPreview(rows) {
  if (!Array.isArray(rows) || !rows.length) return { ok: false, reason: '名单为空，未应用' };
  if (!rows.every(r => r && typeof r === 'object' && SEED_MAP.has(String(r.id)))) {
    return { ok: false, reason: '名单含白名单外成员，未应用' };
  }
  const saved = _savePreview({
    kind: PREVIEW_KIND,
    version: PREVIEW_VERSION,
    people: rows,
    appliedAt: new Date().toISOString(),
  });
  return saved ? { ok: true } : { ok: false, reason: '本地存储不可用，未应用' };
}

/** 清除预览（localStorage 键移除）→ PersonStore 读数回到静态种子 */
export function clearPreview() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(PREVIEW_KEY);
  } catch (_) { /* 存储不可用静默（无预览可清） */ }
}

/** 预览当前状态（渲染用）：active = 已应用；rows = 已应用行 */
export function getPreviewState() {
  const st = _loadPreview();
  if (!st || !Array.isArray(st.people) || !st.people.length) return { active: false, rows: [], appliedAt: null };
  return { active: true, rows: st.people, appliedAt: st.appliedAt || null };
}

/**
 * 把预览叠加到成员数组（PersonStore 读取时调用；未 active 时原样返回入参）
 * 仅覆盖 BASE_FIELDS 基础字段；预览文件未覆盖的成员保持种子原值。
 * @param {Array} members 成员数组
 * @returns {Array} 叠加后新数组（未 active 时 = 入参本身）
 */
export function overlayPreviewMembers(members) {
  const st = _loadPreview();
  if (!st || !Array.isArray(st.people) || !st.people.length) return members;
  const map = new Map(st.people.filter(r => r && r.id).map(r => [String(r.id), r]));
  return members.map(p => {
    const r = p && map.get(String(p.id));
    if (!r) return p;
    const next = { ...p };
    for (const f of BASE_FIELDS) if (r[f] !== undefined) next[f] = r[f];
    return next;
  });
}
