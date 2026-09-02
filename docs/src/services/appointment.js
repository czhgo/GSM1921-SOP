// role: [工程师]+[AI]+[书记]
// services/appointment.js — 书记任命与任期（P2 党委后台，2026-09-02）
// 语义（design §3/§5 P2）：书记=职务动态绑定——党委任命谁，谁登录即书记工作台；
// 任命动作：① branches.secretaryId 指向被任命人 ② 双方 users.role 同步（新书记→secretary，原书记→participant）
//           ③ 任期记录闭环（现任记录封口 to=now，新建现任记录）——换届改选档案可查
// 模式：adapter CRUD 实时写 server（API 模式）+ 本地 mockDB 同步（刷新不丢）；
// mock 纯本地：users 演示行（u_*）无 person 档案 → role 同步静默跳过，记录/secretaryId 仍完整。

import { mockDB } from '../core/domain.js?v=20260901y';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260901y';

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
