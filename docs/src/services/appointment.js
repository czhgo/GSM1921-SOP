// role: [工程师]+[AI]
// services/appointment.js — 书记任命与任期（P2 党委后台，2026-09-02）
// 语义（design §3/§5 P2）：书记=职务动态绑定——党委任命谁，谁登录即书记工作台；
// 任命动作：① branches.secretaryId 指向被任命人 ② 双方 users.role 同步（新书记→secretary，原书记→participant）
//           ③ 任期记录闭环（现任记录封口 to=now，新建现任记录）——换届改选档案可查
// 模式：adapter CRUD 实时写 server（API 模式）+ 本地 mockDB 同步（刷新不丢）；
// mock 纯本地：users 演示行（u_*）无 person 档案 → role 同步静默跳过，记录/secretaryId 仍完整。

import { mockDB } from '../core/domain.js?v=20260908c';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260908c';
// R5-1（2026-09-06）：就地任命需补齐 person.role（角色双链读链 = person 档案，见 appointInauguralOfficers 注释）
import { PersonStore } from './person.js?v=20260908c';

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
 * 任命/撤换支部书记（党委操作）
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
//  R5-1 建空支部「就地任命首任骨干」（2026-09-06 书记裁定；本文件追加导出，不改既有 appointSecretary）
// ════════════════════════════════════════════════════════════════
// 语义：新支部为空、书记席位空缺（无人在任）→ 勾选「就地任命」时按序任命并留痕：
//   ① 首任书记（必选）：appointSecretary —— branches.secretaryId + 双方 users.role + 任期记录现任闭环；
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
//   · 组织委员无专表席位字段（appointmentRecords 仅书记任期语义）→ 不写 appointmentRecords；
//     branch.js config 留痕口（_saveBranchConfig/applyBranchConfig）为「配置键实质变更」型、无纯追加口
//     → 不写 config.configChangeHistory（已登记缺口）；org 任命的证据 = users.role + person.role 现值，
//     发起方 UI 已在创建成功 toast 明示任命人。
/**
 * 建空支部就地任命首任骨干（R5-1）
 * @param {Object} opts
 * @param {string} opts.branchId 新支部 id（createBranch 产物）
 * @param {string} [opts.secretaryId] 首任书记 personId（勾选就地任命时必传）
 * @param {string} [opts.orgCommissionerId] 组织委员 personId（可选；与书记同人 → throw）
 * @returns {Promise<{ok:true, secretary:boolean, org:boolean}>} secretary/org = 是否完成对应任命
 * @throws 任一步失败即抛错——UI 兜底提示「支部已创建但任命未完成（请到任命处补任）」，不阻断建支部
 */
export async function appointInauguralOfficers({ branchId, secretaryId = null, orgCommissionerId = null } = {}) {
  if (!branchId) throw Object.assign(new Error('缺少新支部 id（branchId）'), { reason: '缺少新支部 id（branchId）' });
  if (secretaryId && orgCommissionerId && String(secretaryId) === String(orgCommissionerId)) {
    throw Object.assign(new Error('首任书记与组织委员不能为同一人'), { reason: '首任书记与组织委员不能为同一人' });
  }
  const out = { secretary: false, org: false };
  // ① 首任书记：appointSecretary（branches.secretaryId + users.role + 任期记录）→ 补齐 person.role
  if (secretaryId) {
    await appointSecretary({ branchId, personId: String(secretaryId), note: '建空支部就地任命首任书记' });
    const r = await PersonStore.saveMember({ id: String(secretaryId), role: 'secretary' });
    if (!r || !r.ok) {
      throw Object.assign(new Error(`首任书记档案角色补齐失败：${(r && r.reason) || '未知原因'}`), { step: 'secretary' });
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
