// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  member-flow.js — 成员流入/流出登记服务层（2026-09-14 批次 25，支书裁定）
// ════════════════════════════════════════════════════════════════
//  产品口径（与 mock/member-flows.js 种子头注一致）：
//   · 复式记账：每次流入 / 流出各记一笔台账（mockDB.memberFlows）；表头对账行
//     「期初在册 + 流入合计 − 流出合计 = 当前在册」（reconcile，自然语言表述）。
//   · 流入 = 建成员档案（落 studentId/enrollYear）+ **自动建号**（账号 = 学号，口令 = 支部统一默认口令）
//     + 记台账一笔。
//   · 流出 = **登记即生效**：软标记移出（保留原记录 + 标注已转出）+ 记台账一笔 + 账号停用 + 留痕。
//   · 撤销 = 台账行写 revokedAt/revokedBy 留痕并回滚成员在册状态（登错可纠正；不做物理删除）。
//   · 批量：流入支持「粘贴多行」（一行一人，Tab/逗号分隔：姓名/学号/届别/党小组）；
//     流出支持勾选多人。
//   · 权限门（单一源 core/constants.js::MEMBER_FLOW_ROLES = 组织委员 + 支书/副支书）：
//     UI 显隐与写口双重校验同源（canRegisterFlow）；server 写门（resources.js）同源。
//   · 写口模式：成员档案走既有 PersonStore 写口、台账写 mockDB.memberFlows → persist() → bumpToken('memberFlows')。
//  依赖：core(domain/data-adapter/id/version-token/constants) + services(person/member-confirmation/accounts)。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260922f';
import { persist, getDataSource } from '../core/data-adapter.js?v=20260922f';
import { generateId } from '../core/id.js?v=20260922f';
import { bumpToken } from '../core/version-token.js?v=20260922f';
// 登记角色集单一源（勿手写角色名单——roles-sync 守卫会拦）
import { MEMBER_FLOW_ROLES } from '../core/constants.js?v=20260922f';
import { MEMBER_FLOWS } from '../mock/index.js?v=20260922f';
import { PersonStore } from './person.js?v=20260922f';
import { submitTransferOut } from './member-confirmation.js?v=20260922f';
import { createAccount, deactivateAccount, reactivateAccount } from './accounts.js?v=20260922f';

/** 缺省支部（与 mock-adapter/domain 既有兼容口径一致：老数据无 branchId 视为 br-b1） */
const DEFAULT_BRANCH_ID = 'br-b1';
/** 无权限文案（UI 与服务层同源） */
const DENY_REGISTER = '成员流入/流出登记仅限组织委员或支书/副支书';

/** 是否可登记流入/流出（组织委员 + 支书/副支书）——角色名单单一源 = core/constants.js */
export function canRegisterFlow(role) {
  return MEMBER_FLOW_ROLES.includes(role);
}

/** 台账全量（mockDB.memberFlows；非数组时回退种子） */
function _all() {
  return Array.isArray(mockDB.memberFlows) ? mockDB.memberFlows : [...MEMBER_FLOWS];
}

/** 写口汇聚：写 mockDB.memberFlows → persist() → bumpToken('memberFlows') */
function _writeFlows(next) {
  mockDB.memberFlows = next;
  persist();
  bumpToken('memberFlows');
}

/** 该支部在册成员（PersonStore 读链：已移出者自动不含） */
function _branchMembers(branchId) {
  const branch = branchId || DEFAULT_BRANCH_ID;
  return PersonStore.getMembers().filter(p => (p.branchId || DEFAULT_BRANCH_ID) === branch);
}

/** 日期归一 'YYYY-MM-DD'（非法/缺省 → ''） */
function _normDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v == null ? '' : v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/**
 * 台账记录（新→旧，按 at 倒序）
 * @param {Object} [params]
 * @param {string} [params.branchId] 只取该支部
 * @returns {Object[]}
 */
export function loadMemberFlows({ branchId } = {}) {
  const branch = branchId || null;
  const list = _all().filter(f => !branch || (f.branchId || DEFAULT_BRANCH_ID) === branch);
  return [...list].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}

/**
 * 对账（期初在册 + 流入合计 − 流出合计 = 当前在册）
 * 流入/流出仅计未撤销（revokedAt 为空）的台账行；当前在册取 PersonStore 读链该支部人数。
 * @param {Object} [params]
 * @param {string} [params.branchId]
 * @returns {{openingCount:number, inCount:number, outCount:number, currentCount:number, balanced:boolean}}
 */
export function reconcile({ branchId } = {}) {
  const branch = branchId || DEFAULT_BRANCH_ID;
  const flows = _all().filter(f => !f.revokedAt && (f.branchId || DEFAULT_BRANCH_ID) === branch);
  const inCount = flows.filter(f => f.direction === 'in').length;
  const outCount = flows.filter(f => f.direction === 'out').length;
  const currentCount = _branchMembers(branch).length;
  const openingCount = currentCount - inCount + outCount;
  const balanced = openingCount + inCount - outCount === currentCount;
  return { openingCount, inCount, outCount, currentCount, balanced };
}

/**
 * 单人流入登记：建成员档案（落 studentId/enrollYear）+ 自动建号（账号 = 学号）+ 记台账一笔。
 * @param {Object} params
 * @param {string} params.name       姓名（必填）
 * @param {string} params.studentId  学号（必填；账号由此派生，全站唯一）
 * @param {string} [params.enrollYear] 届别/入学年份
 * @param {string} [params.partyGroup] 党小组
 * @param {string} [params.note]      备注
 * @param {string} [params.by]        操作人 personId
 * @param {string} [params.role]      操作人角色（服务层双重校验）
 * @param {string} [params.branchId]  归属支部（缺省 br-b1）
 * @returns {Promise<{ok:true, person:Object, flow:Object, account:Object|null}|{ok:false, reason:string}>}
 */
export async function registerIntake({ name, studentId, enrollYear, partyGroup, note, by, role, branchId } = {}) {
  if (!canRegisterFlow(role)) return { ok: false, reason: DENY_REGISTER };
  const branch = branchId || DEFAULT_BRANCH_ID;
  const nm = String(name == null ? '' : name).trim();
  if (!nm) return { ok: false, reason: '成员姓名不能为空' };
  const sid = String(studentId == null ? '' : studentId).trim();
  if (!sid) return { ok: false, reason: '学号不能为空（账号由学号派生）' };
  const year = String(enrollYear == null ? '' : enrollYear).trim();
  const group = String(partyGroup == null ? '' : partyGroup).trim();
  // 学号唯一性（全站档案；学号天然唯一，防同一学号两人）
  const dup = PersonStore.getMembers().find(p => String(p.studentId || '') === sid);
  if (dup) return { ok: false, reason: `学号 ${sid} 已存在（成员「${dup.name || dup.id}」），不可重复建档` };
  // 建成员档案（治理字段 role/branchId 不入 api 语义端点 → 仅 mock 形态携带 branchId；
  //   api 形态走成员流动专用流入端点 POST /members/intake：强制归操作人支部 + 默认 role=participant，
  //   写门＝组织委员 + 支书/副支书，与 canRegisterFlow 同源 —— 2026-09-14 批次 30 裁定 Q-23-10）
  const payload = { name: nm, studentId: sid, enrollYear: year, partyGroup: group };
  if (getDataSource() === 'mock') payload.branchId = branch;
  const saved = await PersonStore.saveMember(payload, { by, memberFlowIntake: true });
  if (!saved.ok) return { ok: false, reason: saved.reason || '成员建档失败' };
  const person = saved.member;
  // 自动建号（账号 = 学号，口令 = 支部统一默认口令；成员生命周期成对）
  const acct = createAccount({ personId: person.id, studentId: sid });
  // 记台账一笔（流入）
  const at = new Date().toISOString();
  const flow = {
    id: generateId('mf', '-'),
    branchId: branch,
    direction: 'in',
    personId: person.id,
    name: nm,
    studentId: sid,
    enrollYear: year,
    partyGroup: group,
    date: at.slice(0, 10),
    note: String(note == null ? '' : note).trim(),
    by: by || null,
    at,
    revokedAt: null,
    revokedBy: null,
  };
  _writeFlows([..._all(), flow]);
  return { ok: true, person, flow, account: acct.account || null };
}

/** 批量粘贴解析：Tab / 半角逗号 / 全角逗号分隔；列序 姓名/学号/届别/党小组；跳空行 */
function _parseIntakeLine(raw) {
  return String(raw).split(/[\t,，]/).map(s => s.trim());
}

/**
 * 批量流入登记（粘贴多行，一行一人；Tab/逗号分隔：姓名/学号/届别/党小组）。
 * 跳空行；逐行给出行号级错误（line = 原始文本 1 起行号）。
 * @param {Object} params
 * @param {string} params.text      粘贴文本
 * @param {string} [params.by]
 * @param {string} [params.role]
 * @param {string} [params.branchId]
 * @returns {Promise<{ok:boolean, created:Object[], errors:Array<{line:number, reason:string}>, reason?:string}>}
 */
export async function registerIntakeBatch({ text, by, role, branchId } = {}) {
  if (!canRegisterFlow(role)) return { ok: false, reason: DENY_REGISTER, created: [], errors: [] };
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const created = [];
  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue; // 跳空行
    const [name, studentId, enrollYear, partyGroup] = _parseIntakeLine(raw);
    const r = await registerIntake({ name, studentId, enrollYear, partyGroup, by, role, branchId });
    if (r.ok) created.push(r);
    else errors.push({ line: i + 1, reason: r.reason || '登记失败' });
  }
  return { ok: created.length > 0, created, errors };
}

/**
 * 勾选多人流出登记（**登记即生效**：软标记移出 + 台账 + 账号停用 + 留痕）。
 * @param {Object} params
 * @param {string[]} params.personIds 勾选的成员 id 列表
 * @param {string} [params.date]   流出日期（缺省 = 今日）
 * @param {string} [params.note]   备注
 * @param {string} [params.by]
 * @param {string} [params.role]
 * @param {string} [params.branchId]
 * @returns {Promise<{ok:boolean, movedCount:number, skipped:Array<{personId:string, reason:string}>, reason?:string}>}
 */
export async function registerOutflow({ personIds, date, note, by, role, branchId } = {}) {
  if (!canRegisterFlow(role)) return { ok: false, reason: DENY_REGISTER, movedCount: 0, skipped: [] };
  const branch = branchId || DEFAULT_BRANCH_ID;
  const ids = Array.isArray(personIds) ? personIds.filter(Boolean) : (personIds ? [personIds] : []);
  const skipped = [];
  let movedCount = 0;
  for (const pid of ids) {
    const person = _branchMembers(branch).find(p => p.id === pid);
    if (!person) { skipped.push({ personId: pid, reason: '成员不在本支部在册名册' }); continue; }
    const r = await submitTransferOut({ personId: pid, by, note });
    if (!r.ok) { skipped.push({ personId: pid, reason: r.reason || '流出失败' }); continue; }
    // 账号停用（不物理删除；登录校验拒绝停用账号）
    deactivateAccount(pid, { studentId: person.studentId });
    // 记台账一笔（流出）；personSnapshot 供撤销时回滚在册状态
    const at = new Date().toISOString();
    const flow = {
      id: generateId('mf', '-'),
      branchId: branch,
      direction: 'out',
      personId: pid,
      name: person.name || pid,
      studentId: person.studentId || '',
      enrollYear: person.enrollYear || '',
      partyGroup: person.partyGroup || '',
      date: _normDate(date) || at.slice(0, 10),
      note: String(note == null ? '' : note).trim(),
      by: by || null,
      at,
      revokedAt: null,
      revokedBy: null,
      personSnapshot: { ...person },
    };
    _writeFlows([..._all(), flow]);
    movedCount += 1;
  }
  return { ok: movedCount > 0, movedCount, skipped };
}

/**
 * 撤销台账一笔（写 revokedAt/revokedBy 留痕）并回滚成员在册状态：
 *   · 撤销「流入」→ 该成员回到「不在册」（软标记移除 + 账号停用）；
 *   · 撤销「流出」→ 该成员恢复「在册」（按台账存档的档案复活 + 账号恢复）。
 * @param {Object} params
 * @param {string} params.flowId
 * @param {string} [params.by]
 * @param {string} [params.role]
 * @returns {Promise<{ok:boolean, flow?:Object, reason?:string}>}
 */
export async function revokeFlow({ flowId, by, role } = {}) {
  if (!canRegisterFlow(role)) return { ok: false, reason: DENY_REGISTER };
  const list = _all();
  const idx = list.findIndex(f => f.id === flowId);
  if (idx === -1) return { ok: false, reason: '台账记录不存在' };
  const flow = list[idx];
  if (flow.revokedAt) return { ok: false, reason: '该台账记录已撤销' };
  const at = new Date().toISOString();
  if (flow.direction === 'in') {
    const branch = flow.branchId || DEFAULT_BRANCH_ID;
    if (_branchMembers(branch).some(p => p.id === flow.personId)) {
      const r = await PersonStore.removeMember(flow.personId, { by: by || null, guardRefs: false });
      if (!r.ok) return { ok: false, reason: r.reason || '回滚成员在册状态失败' };
    }
    deactivateAccount(flow.personId, { studentId: flow.studentId });
  } else {
    // 按台账存档的档案复活（无存档 → 以台账字段兜底重建）
    const snapshot = { ...(flow.personSnapshot || {}) };
    delete snapshot.role;      // 治理字段不入 api 语义端点（api 形态保留服务器原值）
    delete snapshot.branchId;
    const restore = {
      ...snapshot,
      id: flow.personId,
      name: snapshot.name || flow.name,
      studentId: snapshot.studentId || flow.studentId,
      enrollYear: snapshot.enrollYear || flow.enrollYear,
      partyGroup: snapshot.partyGroup || flow.partyGroup,
    };
    if (getDataSource() === 'mock') restore.branchId = flow.branchId || DEFAULT_BRANCH_ID;
    // api 形态：server「转出」是软标记，须经 undo-transfer-out 语义端点清除后账号方可恢复
    // （2026-09-14 批次 29，Q-23-5）；mock 形态该选项被忽略（save 即复活，removedIds 自动清除）
    const r = await PersonStore.saveMember(restore, { by, restoreFromTransferOut: true });
    if (!r.ok) return { ok: false, reason: r.reason || '恢复成员在册状态失败' };
    reactivateAccount(flow.personId, { studentId: flow.studentId });
  }
  const updated = { ...flow, revokedAt: at, revokedBy: by || null };
  _writeFlows(list.map(f => (f.id === flowId ? updated : f)));
  return { ok: true, flow: updated };
}
