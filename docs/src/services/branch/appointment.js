// role: [工程师]+[AI]
// services/branch/appointment.js — 支书任命与任期（P2 党委后台，2026-09-02）
// 语义（design §3/§5 P2）：支书=职务动态绑定——党委任命谁，谁登录即支书工作台；
// 任命动作：① branches.secretaryId 指向被任命人 ② 双方 users.role 同步（新支书→secretary，原支书→participant）
//           ③ 任期记录闭环（现任记录封口 to=now，新建现任记录）——换届改选档案可查
// 模式：adapter CRUD 实时写 server（API 模式）+ 本地 mockDB 同步（刷新不丢）；
// mock 纯本地：users 演示行（u_*）无 person 档案 → role 同步静默跳过，记录/secretaryId 仍完整。

import { mockDB } from '../../core/domain/domain.js?v=20261001h';
import { getAdapter, persist } from '../../data/data-adapter.js?v=20261001h';
// R5-1（2026-09-06）：就地任命需补齐 person.role（角色双链读链 = person 档案，见 appointInauguralOfficers 注释）
import { PersonStore } from '../member/person.js?v=20261001h';
// 2026-09-23 支书裁定（情景①）：支书自配本支部支委身份——留痕复用既有审计快照（AuthStore），判据与白名单
// 单一源 = core/domain/constants.js（勿在本文件另写角色名单；server/users 写门同源同一判据）
import { AuthStore } from '../core/auth.js?v=20261001h';
import {
  ROLE_LABELS,
  BRANCH_COMMISSIONER_ASSIGNABLE_ROLES,
  BRANCH_COMMISSIONER_FALLBACK_ROLE,
  branchCommissionerWriteDeny,
} from '../../core/domain/constants.js?v=20261001h';

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

function _syncRecord(id, patch) {
  const rows = mockDB.appointmentRecords || [];
  const idx = rows.findIndex(r => r.id === id);
  if (idx >= 0) mockDB.appointmentRecords = [...rows.slice(0, idx), { ...rows[idx], ...patch }, ...rows.slice(idx + 1)];
}

/**
 * 任命/撤换支书（党委操作）
 * @param {{ branchId: string, personId: string|null, note?: string }} opts personId=null 表示撤职留空
 */
export async function appointSecretary({ branchId, personId, note = '' }) {
  const branch = (mockDB.branches || []).find(b => b.id === branchId);
  if (!branch) throw Object.assign(new Error(`支部 ${branchId} 不存在`), { type: 'NotFoundError' });
  const prev = branch.secretaryId;

  // ① branch.secretaryId（config 不动）
  const nextBranch = await getAdapter().branches.update(branchId, { secretaryId: personId || null });
  _syncBranch(nextBranch);

  // ② 双方角色同步（users 表；无 users resource 的 mock 本地静默——记录/绑定仍完整）
  if (prev && prev !== personId) {
    try { const u = await getAdapter().users.update(prev, { role: 'participant' }); _syncUserRole(u?.id || prev, 'participant'); }
    catch (_) { _syncUserRole(prev, 'participant'); }
  }
  if (personId) {
    try { const u = await getAdapter().users.update(personId, { role: 'secretary' }); _syncUserRole(u?.id || personId, 'secretary'); }
    catch (_) { _syncUserRole(personId, 'secretary'); }
  }

  // ③ 任期记录：封口现任 → 新建（撤职=仅封口不新建）
  const now = new Date().toISOString();
  const current = (mockDB.appointmentRecords || []).find(r => r.branchId === branchId && !r.to);
  if (current) {
    try { const r = await getAdapter().appointmentRecords.update(current.id, { to: now }); _syncRecord(r?.id || current.id, { to: now }); }
    catch (_) { _syncRecord(current.id, { to: now }); }
  }
  if (personId) {
    const rec = await getAdapter().appointmentRecords.create({ branchId, secretaryId: personId, note });
    if (!(mockDB.appointmentRecords || []).some(r => r.id === rec.id)) {
      mockDB.appointmentRecords = [...(mockDB.appointmentRecords || []), rec];
    }
  }
  persist();
  return { branchId, secretaryId: personId || null };
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
//   ① 首任支书（必选）：appointSecretary —— branches.secretaryId + 双方 users.role + 任期记录现任闭环；
//      随后 PersonStore.saveMember 显式补齐 person.role='secretary'。
//   ② 组织委员（可选）：users.role 直改 mockDB.users 对应行（无该行静默，同 _syncUserRole 写法）
//      + PersonStore.saveMember 补齐 person.role='org-commissioner'。
// 角色双链（务必理解）：登录/工作台门禁角色与线上支委会应到/委员判定分读两链——
//   · 门禁链 = AuthStore/users（rolesForPage；mock 形态 _getUserRoleFromMemory 读 person 档案 role）→
//     appointSecretary 的 adapter users.update 已覆盖 server users / 本地缓存行；
//   · 支委判定链 = person.role（vote-config resolveVoterIds('committee') 经 PersonStore.getAll 读档案）→
//     appointSecretary 自身【不改 person 档案 role】→ 本函数显式 saveMember 补齐，两链一致。
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
  // ① 首任支书：appointSecretary（branches.secretaryId + users.role + 任期记录）→ 补齐 person.role
  if (secretaryId) {
    await appointSecretary({ branchId, personId: String(secretaryId), note: '建空支部就地任命首任支书' });
    const r = await PersonStore.saveMember({ id: String(secretaryId), role: 'secretary' });
    if (!r || !r.ok) {
      throw Object.assign(new Error(`首任支书档案角色补齐失败：${(r && r.reason) || '未知原因'}`), { step: 'secretary' });
    }
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
//   ① PersonStore.saveMember({ id, role }) —— 成员档案链（mock：members 覆盖层；api：server users，
//      经通用 users 写口的**靶向写门**放行——服务端与前端**同一份判据** branchCommissionerWriteDeny）；
//      此链同时是支委会应到 / 委员判定链（vote-config 按档案读 role）。
//   ② _syncUserRole(id, role) —— mock 本地账号缓存 mockDB.users（演示成员无该行 → 静默，同既有写法）。
// 留痕（**复用既有单一源、不新造表**）：AuthStore 的审计快照（localStorage `sop_org_os_auth_audit`，只增不改）
//   ——与「常设赋权（组长）/ 项目赋权（组织者·深参）」是**同一份**赋权记录：授予走 AuthStore.authorize
//   （auth.js 的 AUTHORIZE_CHAIN 已加「支书 → 三委员」三键，同名同角色按人去重），撤销 / 改派的旧席位走
//   AuthStore.recordProjectRevokes(null, …, actorId)（同一写口 `_appendAuditEntries`，追加 action:'revoke'）。
// ⚠ 数据边界（如实登记，与 R5-1「就地任命首任骨干」同族）：`users.role` / `person.role` 是**单值**——把某位
//   现任党小组组长配为支委时，其组长身份随之让位（一行里放不下两个常设身份）；本函数不迁移其它席位。
// ⚠ `AuthStore.revokeAuthorization` 有一处既有缺陷（读 `rec.personId`，而审计记录写的是 `targetPersonId`
//   ⇒ 撤销快照的 targetPersonId 落空），本批**未改**（不在本次授权面内）⇒ 撤销留痕故走
//   recordProjectRevokes（同一写口、形状正确）。

/** 本支部现任副支书 personId（副书同权 2026-09-23 支书追裁；单一源＝成员档案 role，无 → null） */
function _branchDeputyId(branchId) {
  const bid = branchId || 'br-b1';
  const p = PersonStore.getMembers().find(m => (m.branchId || 'br-b1') === bid && m.role === 'deputy-secretary');
  return (p && p.id) || null;
}

/** 本支部现任支委身份（现值；单一源＝成员档案 role，附最近一条审计快照供展示） */
export function listBranchCommissioners(branchId) {
  const bid = branchId || 'br-b1';
  const grantByKey = new Map();
  AuthStore.getAuthorizations()
    .filter(r => BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(r.role))
    .forEach(r => {
      if (r.targetPersonId && r.action !== 'revoke') grantByKey.set(`${r.targetPersonId}|${r.role}`, r);
    });
  return PersonStore.getMembers()
    .filter(p => (p.branchId || 'br-b1') === bid && BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(p.role))
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
 * @param {{ branchId: string, personId: string, role: string, actorId?: string }} opts role ∈ 白名单（组织/宣传/纪检委员）
 * @returns {Promise<{ok: boolean, reason?: string, recordId?: string}>}
 */
export async function appointBranchCommissioner({ branchId, personId, role, actorId } = {}) {
  const branch = (mockDB.branches || []).find(b => b.id === branchId);
  if (!branch) return { ok: false, reason: `支部 ${branchId} 不存在` };
  if (!personId) return { ok: false, reason: '缺少被配置人（personId）' };
  const target = PersonStore.getById(personId);
  if (!target) return { ok: false, reason: '成员不存在（档案中无该 id）' };
  const actor = actorId || (AuthStore.getCurrentUser() || {}).personId || null;
  const deny = branchCommissionerWriteDeny({
    actorRole: (AuthStore.getCurrentUser() || {}).role || AuthStore.getUserRole(actor),
    actorId: actor,
    actorBranchId: branchId,
    targetId: String(personId),
    targetRole: target.role,
    targetBranchId: target.branchId || branchId,
    secretaryId: branch.secretaryId,
    deputySecretaryId: _branchDeputyId(branchId),
    role,
  });
  if (deny) return { ok: false, reason: deny };

  // ① 档案链（mock：members 覆盖层；api：server users 经 users 写门）——改派时旧席位由现值改写让位
  const r = await PersonStore.saveMember({ id: String(personId), role });
  if (!r || !r.ok) return { ok: false, reason: `支委身份配置失败：${(r && r.reason) || '未知原因'}` };
  // ② mock 本地账号缓存（演示成员无该行 → 静默；与 appointInauguralOfficers ② 同写法）
  _syncUserRole(String(personId), role);
  // ③ 留痕：改派则先给旧席位补一条 revoke（审计快照只增不改），再追加新席位的 grant
  if (BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(target.role) && target.role !== role) {
    AuthStore.recordProjectRevokes(null, [{ personId: String(personId), role: target.role }], actor);
  }
  const grant = await AuthStore.authorize(actor, String(personId), role, {});
  persist();
  return { ok: true, recordId: (grant && grant.id) || '' };
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
  const target = PersonStore.getById(personId);
  if (!target) return { ok: false, reason: '成员不存在（档案中无该 id）' };
  const actor = actorId || (AuthStore.getCurrentUser() || {}).personId || null;
  const deny = branchCommissionerWriteDeny({
    actorRole: (AuthStore.getCurrentUser() || {}).role || AuthStore.getUserRole(actor),
    actorId: actor,
    actorBranchId: branchId,
    targetId: String(personId),
    targetRole: target.role,
    targetBranchId: target.branchId || branchId,
    secretaryId: branch.secretaryId,
    deputySecretaryId: _branchDeputyId(branchId),
    role: BRANCH_COMMISSIONER_FALLBACK_ROLE,
  });
  if (deny) return { ok: false, reason: deny };

  const r = await PersonStore.saveMember({ id: String(personId), role: BRANCH_COMMISSIONER_FALLBACK_ROLE });
  if (!r || !r.ok) return { ok: false, reason: `支委身份撤销失败：${(r && r.reason) || '未知原因'}` };
  _syncUserRole(String(personId), BRANCH_COMMISSIONER_FALLBACK_ROLE);
  AuthStore.recordProjectRevokes(null, [{ personId: String(personId), role }], actor);
  persist();
  return { ok: true };
}
