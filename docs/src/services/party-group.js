// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  party-group.js — 党小组（一等实体）服务层（2026-09-14 批次 25，支书特批）
// ════════════════════════════════════════════════════════════════
//  口径（与 mock/party-groups.js 种子头注一致）：
//   · 党小组为一等实体（mockDB.partyGroups）：组有 id/seq/status/组级留痕 history。
//   · **组长由成员档案派生**（role='leader' + partyGroup），组实体不落 leaderId——避免两处维护。
//   · 组名唯一性：**同一支部内活组（status='active'）组名唯一**；解散组保留历史不复用判重。
//   · 改组/解散/归组的成员侧改名一律走既有写口 PersonStore.saveMember（mock 形态落 members 覆盖层、
//     api 形态落 server users），不直接改数组——与 person.js 的写链保持单一写口。
//   · 权限门（单一源 core/constants.js::SECRETARY_AND_DEPUTY_ROLES）：建组/改组/解散/归组
//     仅支书（含副支书）；UI 显隐与写口双重校验同源（canManagePartyGroups）。
//   · 写口模式：写 mockDB.partyGroups → persist() → bumpToken('partyGroups')。
//  依赖方向：可依赖 core/* 与 services/person.js；**不被 org-base-data-preview.js 依赖**
//   （preview 的组枚举由 mock/party-groups.js 种子派生，保持其为叶子，防 person→preview→party-group 成环）。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260914e';
import { persist } from '../core/data-adapter.js?v=20260914e';
import { generateId } from '../core/id.js?v=20260914e';
// 支委层角色集合单一源（勿手写角色名单——roles-sync 守卫会拦）
import { SECRETARY_AND_DEPUTY_ROLES } from '../core/constants.js?v=20260914e';
import { bumpToken } from '../core/version-token.js?v=20260914e';
import { PARTY_GROUPS } from '../mock/index.js?v=20260914e';
import { PersonStore } from './person.js?v=20260914e';

/** 缺省支部（与 mock-adapter/domain 既有兼容口径一致：老数据无 branchId 视为 br-b1） */
const DEFAULT_BRANCH_ID = 'br-b1';
/** 无权限文案（UI 与服务层同源） */
const DENY_MANAGE = '党小组管理仅限支书（含副支书）';

/** 是否可管理党小组（支书含副支书）——角色名单单一源 = core/constants.js */
export function canManagePartyGroups(role) {
  return SECRETARY_AND_DEPUTY_ROLES.includes(role);
}

/** 读取全部党小组（含已解散；持久化为空时回退种子，与 thought-report.js 同模式） */
export function loadPartyGroups() {
  return Array.isArray(mockDB.partyGroups) && mockDB.partyGroups.length > 0
    ? [...mockDB.partyGroups]
    : [...PARTY_GROUPS];
}

/** 活组清单（status='active'，按 seq 升序） */
export function listActiveGroups() {
  return loadPartyGroups()
    .filter(g => g.status === 'active')
    .sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

/** 活组名数组——**全站组清单唯一来源**（禁各处手写组名数组） */
export function groupOptions() {
  return listActiveGroups().map(g => g.name);
}

/** 组序默认名：第 N 党小组 */
export function defaultGroupName(seq) {
  return `第${seq}党小组`;
}

/** 下一组序 = 现有最大 seq + 1（含解散组，防 seq 复用） */
export function nextGroupSeq() {
  const seqs = loadPartyGroups().map(g => Number(g.seq) || 0);
  return (seqs.length ? Math.max(...seqs) : 0) + 1;
}

/** 未分组成员（partyGroup 为空/未定义）；传 branchId 则只取该支部（工作台与名册同口径，避免把非本支部人员算进来） */
export function ungroupedMembers(branchId) {
  return PersonStore.getMembers().filter(p => !p.partyGroup && (!branchId || p.branchId === branchId));
}

/** 写口汇聚：写 mockDB.partyGroups → persist() → bumpToken('partyGroups') */
function _writeGroups(nextGroups) {
  mockDB.partyGroups = nextGroups;
  persist();
  bumpToken('partyGroups');
}

/** 同支部活组重名判定（排除 excludeId 自身） */
function _nameTaken(branchId, name, excludeId) {
  return listActiveGroups().some(g =>
    g.id !== excludeId
    && (g.branchId || DEFAULT_BRANCH_ID) === branchId
    && g.name === name);
}

/** 该组名下、同支部的成员 id 列表（改组/解散前的批量改写对象） */
function _memberIdsOfGroup(branchId, groupName) {
  return PersonStore.getMembers()
    .filter(p => p.partyGroup === groupName && (p.branchId || DEFAULT_BRANCH_ID) === branchId)
    .map(p => p.id);
}

/**
 * 新建党小组（仅支书/副支书）
 * @param {Object} opts
 * @param {string} [opts.name]    组名（空 → 用「第 N 党小组」默认名）
 * @param {string} [opts.by]      操作人 personId
 * @param {string} [opts.branchId] 归属支部（缺省 br-b1）
 * @param {string} [opts.role]    操作人角色（服务层双重校验）
 * @returns {Promise<{ok:true, group:Object}|{ok:false, reason:string}>}
 */
export async function addGroup({ name, by, branchId, role } = {}) {
  if (!canManagePartyGroups(role)) return { ok: false, reason: DENY_MANAGE };
  const branch = branchId || DEFAULT_BRANCH_ID;
  const seq = nextGroupSeq();
  const finalName = String(name == null ? '' : name).trim() || defaultGroupName(seq);
  if (_nameTaken(branch, finalName, null)) {
    return { ok: false, reason: '同一支部内已有同名党小组（活组）' };
  }
  const at = new Date().toISOString();
  const group = {
    id: generateId('pg', '-'), // pg-<uuid>（统一经 core/id.js，禁前缀+Date.now 撞号）
    branchId: branch,
    name: finalName,
    seq,
    status: 'active',
    createdAt: at.slice(0, 10),
    createdBy: by || '',
    note: '',
    history: [{ at, by: by || '', action: 'create' }],
  };
  _writeGroups([...loadPartyGroups(), group]);
  return { ok: true, group };
}

/**
 * 改组名（仅支书/副支书）：成功后批量改写该组全部成员档案的 partyGroup（走既有写口 PersonStore.saveMember）
 * @param {string} id 组 id
 * @param {string} name 新组名
 * @param {Object} opts { by, role }
 * @returns {Promise<{ok:true, group:Object, movedCount:number}|{ok:false, reason:string}>}
 */
export async function renameGroup(id, name, { by, role } = {}) {
  if (!canManagePartyGroups(role)) return { ok: false, reason: DENY_MANAGE };
  const list = loadPartyGroups();
  const idx = list.findIndex(g => g.id === id);
  if (idx === -1) return { ok: false, reason: '党小组不存在' };
  const cur = list[idx];
  if (cur.status !== 'active') return { ok: false, reason: '已解散党小组不可改组' };
  const to = String(name == null ? '' : name).trim();
  if (!to) return { ok: false, reason: '组名不能为空' };
  const branch = cur.branchId || DEFAULT_BRANCH_ID;
  if (_nameTaken(branch, to, id)) return { ok: false, reason: '同一支部内已有同名党小组（活组）' };
  const from = cur.name;
  if (from === to) return { ok: true, group: cur, movedCount: 0 };
  const at = new Date().toISOString();
  const updated = {
    ...cur,
    name: to,
    history: [...(cur.history || []), { at, by: by || '', action: 'rename', from, to }],
  };
  _writeGroups(list.map(g => (g.id === id ? updated : g)));
  // 成员档案侧批量改写（改前先取成员 id 列表，逐人走既有写口）
  const memberIds = _memberIdsOfGroup(branch, from);
  for (const pid of memberIds) {
    await PersonStore.saveMember({ id: pid, partyGroup: to }, { by });
  }
  return { ok: true, group: updated, movedCount: memberIds.length };
}

/**
 * 解散党小组（仅支书/副支书）：**允许解散非空组**——组内成员 partyGroup 批量置空（未分组）。
 * @param {string} id 组 id
 * @param {Object} opts { by, note, role }
 * @returns {Promise<{ok:true, movedCount:number}|{ok:false, reason:string}>}
 */
export async function dissolveGroup(id, { by, note, role } = {}) {
  if (!canManagePartyGroups(role)) return { ok: false, reason: DENY_MANAGE };
  const list = loadPartyGroups();
  const idx = list.findIndex(g => g.id === id);
  if (idx === -1) return { ok: false, reason: '党小组不存在' };
  const cur = list[idx];
  if (cur.status === 'dissolved') return { ok: false, reason: '该党小组已解散' };
  const at = new Date().toISOString();
  const branch = cur.branchId || DEFAULT_BRANCH_ID;
  const groupName = cur.name;
  const updated = {
    ...cur,
    status: 'dissolved',
    dissolvedAt: at,
    dissolvedBy: by || '',
    note: note || '',
    history: [...(cur.history || []), { at, by: by || '', action: 'dissolve', note: note || '' }],
  };
  _writeGroups(list.map(g => (g.id === id ? updated : g)));
  // 组内成员批量移出（partyGroup='' = 未分组）
  const memberIds = _memberIdsOfGroup(branch, groupName);
  for (const pid of memberIds) {
    await PersonStore.saveMember({ id: pid, partyGroup: '' }, { by });
  }
  return { ok: true, movedCount: memberIds.length };
}

/**
 * 成员归组/改组（仅支书/副支书）；groupName = '' 表示移出到未分组
 * @param {string} personId 成员 id
 * @param {string} groupName 目标组名（须为活组名或空串）
 * @param {Object} opts { by, role }
 * @returns {Promise<{ok:true, groupName:string}|{ok:false, reason:string}>}
 */
export async function assignMemberToGroup(personId, groupName, { by, role } = {}) {
  if (!canManagePartyGroups(role)) return { ok: false, reason: DENY_MANAGE };
  const target = String(groupName == null ? '' : groupName).trim();
  if (target && !groupOptions().includes(target)) {
    return { ok: false, reason: '目标党小组不存在或已解散' };
  }
  if (!PersonStore.getById(personId)) return { ok: false, reason: '成员不存在' };
  const r = await PersonStore.saveMember({ id: personId, partyGroup: target }, { by });
  if (!r || r.ok === false) return { ok: false, reason: (r && r.reason) || '归组失败' };
  return { ok: true, groupName: target };
}

/**
 * 组级留痕汇总（各组 history 合并，按时间倒序）——供留痕展示
 * @returns {Array<{at:string, by:string, action:string, groupId:string, groupName:string, from?:string, to?:string, note?:string}>}
 */
export function listGroupHistory() {
  const rows = [];
  for (const g of loadPartyGroups()) {
    for (const h of (g.history || [])) {
      rows.push({ ...h, groupId: g.id, groupName: g.name });
    }
  }
  return rows.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}
