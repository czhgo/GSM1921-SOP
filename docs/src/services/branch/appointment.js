// role: [工程师]+[AI]
// services/branch/appointment.js — 支书任命与任期（P2 党委后台，2026-09-02）
// 语义（design §3/§5 P2）：支书=职务动态绑定——党委任命谁，谁登录即支书工作台；
// 任命动作：① branches.secretaryId 指向被任命人 ② 双方 users.role 同步（新支书→secretary，原支书→participant）
//           ③ 任期记录闭环（现任记录封口 to=now，新建现任记录）——换届改选档案可查
// 模式：一次语义调用（api：POST /branches/:id/appointments；mock：adapter.appointments.apply 快照回滚）；
// 成功后用服务端/adapter 返回的 branch/users/appointmentRecords 刷新本地缓存（刷新不丢）。

import { mockDB } from '../../core/domain/domain.js?v=20261026a';
import { getAdapter, persist } from '../../data/data-adapter.js?v=20261026a';
// R5-1（2026-09-06）：就地任命需补齐 person.role（角色双链读链 = person 档案，见 appointInauguralOfficers 注释）
import { PersonStore } from '../member/person.js?v=20261026a';
// 2026-09-23 支书裁定（情景①）：支书自配本支部支委身份——留痕复用既有审计快照（AuthStore），判据与白名单
// 单一源 = core/domain/constants.js（勿在本文件另写角色名单；server/users 写门同源同一判据）
import { AuthStore } from '../core/auth.js?v=20261026a';
import {
  ROLE_LABELS,
  BRANCH_COMMISSIONER_ASSIGNABLE_ROLES,
  DEFAULT_BRANCH_ID,
} from '../../core/domain/constants.js?v=20261026a';

function _syncBranch(next) {
  const idx = (mockDB.branches || []).findIndex(b => b.id === next.id);
  if (idx >= 0) mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
}

function _syncUserRole(personId, role) {
  const rows = mockDB.users || [];
  const idx = rows.findIndex(u => u.id === personId);
  if (idx >= 0) {
    mockDB.users = [...rows.slice(0, idx), { ...rows[idx], role }, ...rows.slice(idx + 1)];
  }
}

/** 用语义端点返回的行刷新本地缓存（按 id 合并；服务端为权威） */
function _refreshRows(key, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const map = new Map((mockDB[key] || []).map(row => [row.id, row]));
  rows.forEach((row) => { if (row && row.id) map.set(row.id, { ...(map.get(row.id) || {}), ...row }); });
  mockDB[key] = [...map.values()];
}

function _applyAppointmentResult(result) {
  if (result?.branch) _syncBranch(result.branch);
  _refreshRows('users', result?.users);
  _refreshRows('appointmentRecords', result?.appointmentRecords);
}

function _applyBranchCommissionerResult(result) {
  _refreshRows('users', Array.isArray(result?.users) ? result.users : (result?.user ? [result.user] : []));
  _refreshRows('authAudit', result?.audits);
}

/**
 * 任命/撤换支书（党委操作）
 * 单次语义调用：服务端在**一个事务**内写 branch.secretaryId、双方 users.role、任期记录封口与新建；
 * 失败不吞错（409 = expectedSecretaryId 乐观锁冲突）。
 * @param {{ branchId: string, personId: string|null, note?: string }} opts personId=null 表示撤职留空
 */
export async function appointSecretary({ branchId, personId, note = '' }) {
  const branch = (mockDB.branches || []).find(b => b.id === branchId);
  if (!branch) throw Object.assign(new Error(`支部 ${branchId} 不存在`), { type: 'NotFoundError' });

  const result = await getAdapter().appointments.apply({
    branchId,
    secretaryId: personId || null,
    note,
    expectedSecretaryId: branch.secretaryId || null,
  });
  _applyAppointmentResult(result);
  persist();
  return { branchId, secretaryId: result?.branch?.secretaryId ?? (personId || null) };
}

/** 支部任期历史（倒序：现任在前） */
export function listAppointments(branchId) {
  return (mockDB.appointmentRecords || [])
    .filter(r => !branchId || r.branchId === branchId)
    .sort((a, b) => String(b.from || '').localeCompare(String(a.from || '')));
}

// ════════════════════════════════════════════════════════════════
//  R5-1 建空支部「就地任命首任骨干」（2026-09-06 支书裁定；本文件追加导出，不改既有 appointSecretary）
// ════════════════════════════════════════════════════════════════
// 语义：新支部为空、支书席位空缺（无人在任）→ 勾选「就地任命」时按序任命并留痕：
//   ① 首任支书（必选）：appointSecretary —— 一次语义调用，服务端同事务写 branches.secretaryId +
//      双方 users.role + 任期记录现任闭环（含 person 档案链，无需二次 saveMember）。
//   ② 组织委员（可选）：users.role 直改 mockDB.users 对应行（无该行静默，同 _syncUserRole 写法）
//      + PersonStore.saveMember 补齐 person.role='org-commissioner'。
// 角色双链（务必理解）：登录/工作台门禁角色与线上支委会应到/委员判定分读两链——
//   · 门禁链 = AuthStore/users（rolesForPage；mock 形态 _getUserRoleFromMemory 读 person 档案 role）；
//   · 支委判定链 = person.role（vote-config resolveVoterIds('committee') 经 PersonStore.getAll 读档案）；
//   appointSecretary 的语义端点已同事务补齐两链。
// 数据边界登记（R5-1，界面已提示）：
//   · 任命【不改 person.branchId】——演示 = 跨支部兼任/调任，任命对象仍属原支部名册；
//     补入新支部名单由「成员管理/名单导入」流程另行处理（本函数不迁移业务引用）。
//   · 任命对象原任支委/组长（如原 role=org-commissioner）→ 原支部对应席位空缺，
//     不自动改原支部其它字段，由后续换届/调岗流程收口。
//   · 组织委员无专表席位字段（appointmentRecords 仅支书任期语义）→ 不写 appointmentRecords；
//     branch.js config 留痕口（_saveBranchConfig/applyBranchConfig）为「配置键实质变更」型、无纯追加口
//     → 不写 config.configChangeHistory（已登记缺口）；org 任命的证据 = users.role + person.role 现值，
//     发起方 UI 已在创建成功 toast 明示任命人。
/**
 * 建空支部就地任命首任骨干（R5-1）
 * @param {Object} opts
 * @param {string} opts.branchId 新支部 id（createBranch 产物）
 * @param {string} [opts.secretaryId] 首任支书 personId（勾选就地任命时必传）
 * @param {string} [opts.orgCommissionerId] 组织委员 personId（可选；与支书同人 → throw）
 * @returns {Promise<{ok:true, secretary:boolean, org:boolean}>} secretary/org = 是否完成对应任命
 * @throws 任一步失败即抛错——UI 兜底提示「支部已创建但任命未完成（请到任命处补任）」，不阻断建支部
 */
export async function appointInauguralOfficers({ branchId, secretaryId = null, orgCommissionerId = null } = {}) {
  if (!branchId) throw Object.assign(new Error('缺少新支部 id（branchId）'), { reason: '缺少新支部 id（branchId）' });
  if (secretaryId && orgCommissionerId && String(secretaryId) === String(orgCommissionerId)) {
    throw Object.assign(new Error('首任支书与组织委员不能为同一人'), { reason: '首任支书与组织委员不能为同一人' });
  }
  const out = { secretary: false, org: false };
  // ① 首任支书：appointSecretary（语义端点已同事务写 branches.secretaryId + users.role + 任期记录）
  if (secretaryId) {
    await appointSecretary({ branchId, personId: String(secretaryId), note: '建空支部就地任命首任支书' });
    out.secretary = true;
  }
  // ② 组织委员（可选）：person.role 补齐 + users.role 直改 mockDB.users 对应行（无该行静默）
  if (orgCommissionerId) {
    const id = String(orgCommissionerId);
    const r = await PersonStore.saveMember({ id, role: 'org-commissioner' });
    if (!r || !r.ok) {
      throw Object.assign(new Error(`组织委员档案角色补齐失败：${(r && r.reason) || '未知原因'}`), { step: 'org' });
    }
    _syncUserRole(id, 'org-commissioner');
    out.org = true;
  }
  return { ok: true, ...out };
}

// ════════════════════════════════════════════════════════════════
//  支书配置本支部支委身份（2026-09-23 支书裁定 · 情景① 写口落地；本文件追加导出，不改既有导出）
// ════════════════════════════════════════════════════════════════
// 语义（裁定逐字与白名单见 core/domain/constants.js 的 BRANCH_COMMISSIONER_ASSIGNABLE_ROLES / 判据
//   branchCommissionerWriteDeny）：可授予＝组织委员 / 宣传委员 / 纪检委员，撤销＝回落普通参与者；
//   操作人＝本支部现任支书 ∨ 本支部现任副支书（副书同权，2026-09-23 支书追裁）；拒：支书本人与副支书的
//   一把手层身份（归党委，`D-585`）· 跨支部成员 · 白名单外的角色键 · 支书 / 副支书以外的身份者。
// 角色双链（同 appointInauguralOfficers 注释，缺一即「能登录成委员、支委会却不算委员」）：
//   ① 服务端 users.role / mockPerson 档案链 —— 由语义端点同事务写入（vote-config 按档案读 role）；
//   ② mock 本地账号缓存 mockDB.users —— mock adapter 同步落行（与服务端同口径）。
// 留痕（**复用既有单一源、不新造表**）：auth_audit（api：服务端表；mock：AuthStore 审计快照，只增不改）
//   ——授予 grant / 改派旧席位 revoke / 撤销 revoke 均由 adapter 一次事务写入；authorizedBy/authorizedAt
//   api 形态由服务端会话生成。
// ⚠ 数据边界（如实登记，与 R5-1「就地任命首任骨干」同族）：`users.role` / `person.role` 是**单值**——把某位
//   现任党小组组长配为支委时，其组长身份随之让位（一行里放不下两个常设身份）；本函数不迁移其它席位。
// ⚠ `AuthStore.revokeAuthorization` 有一处既有缺陷（读 `rec.personId`，而审计记录写的是 `targetPersonId`
//   ⇒ 撤销快照的 targetPersonId 落空），本批**未改**（不在本次授权面内）⇒ 撤销留痕故走
//   recordProjectRevokes（同一写口、形状正确）。

/** 本支部现任支委身份（现值；单一源＝成员档案 role，附最近一条审计快照供展示） */
export function listBranchCommissioners(branchId) {
  const bid = branchId || DEFAULT_BRANCH_ID;
  const grantByKey = new Map();
  AuthStore.getAuthorizations()
    .filter(r => BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(r.role))
    .forEach(r => {
      if (r.targetPersonId && r.action !== 'revoke') grantByKey.set(`${r.targetPersonId}|${r.role}`, r);
    });
  return PersonStore.getMembers()
    .filter(p => (p.branchId || DEFAULT_BRANCH_ID) === bid && BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(p.role))
    .map(p => ({
      personId: p.id,
      name: p.name,
      role: p.role,
      roleLabel: ROLE_LABELS[p.role] || p.role,
      record: grantByKey.get(`${p.id}|${p.role}`) || null,
    }));
}

/**
 * 配置 / 改派本支部支委身份（本支部现任支书 / 副支书；判据单一源见 core/domain/constants.js::branchCommissionerWriteDeny）
 * 单次语义调用：服务端同事务写 users.role 与 auth_audit（authorizedBy/authorizedAt 由服务端生成）。
 * @param {{ branchId: string, personId: string, role: string, actorId?: string }} opts role ∈ 白名单（组织/宣传/纪检委员）
 * @returns {Promise<{ok: boolean, reason?: string, recordId?: string}>}
 */
export async function appointBranchCommissioner({ branchId, personId, role, actorId } = {}) {
  const branch = (mockDB.branches || []).find(b => b.id === branchId);
  if (!branch) return { ok: false, reason: `支部 ${branchId} 不存在` };
  if (!personId) return { ok: false, reason: '缺少被配置人（personId）' };
  if (!PersonStore.getById(personId)) return { ok: false, reason: '成员不存在（档案中无该 id）' };
  try {
    const result = await getAdapter().branchCommissioners.apply({
      branchId,
      personId: String(personId),
      role,
      action: 'grant',
      ...(actorId ? { actorId } : {}),
    });
    _applyBranchCommissionerResult(result);
    persist();
    return { ok: true, recordId: (result?.audits || []).at(-1)?.id || '' };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error) };
  }
}

/**
 * 撤销本支部支委身份（回落普通参与者；判据与上同一份）
 * @param {{ branchId: string, personId: string, role: string, actorId?: string }} opts role = 被撤销的支委身份
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function revokeBranchCommissioner({ branchId, personId, role, actorId } = {}) {
  const branch = (mockDB.branches || []).find(b => b.id === branchId);
  if (!branch) return { ok: false, reason: `支部 ${branchId} 不存在` };
  if (!BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(role)) return { ok: false, reason: '该身份不在支书可配置的支委身份白名单内' };
  if (!PersonStore.getById(personId)) return { ok: false, reason: '成员不存在（档案中无该 id）' };
  try {
    const result = await getAdapter().branchCommissioners.apply({
      branchId,
      personId: String(personId),
      role,
      action: 'revoke',
      ...(actorId ? { actorId } : {}),
    });
    _applyBranchCommissionerResult(result);
    persist();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error) };
  }
}
