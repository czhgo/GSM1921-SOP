// ════════════════════════════════════════════════════════════════
//  server/routes/branch-roster.js —— 名册整表导入（原子替换）
//
//  端点：PUT /api/v1/branches/:id/roster
//  body：{ members: [ { id, name, studentId?, role?, partyGroup?, developStage?,
//                       residenceStatus?, residenceNote?, email?, phone? }, … ] }
//  返回：{ ok:true, branchId, count, removed, members }
//
//  为什么要有这个端点（spec restore-capsule-and-harden-data-truth · Task 7.5）：
//    前端原先用**循环 DELETE / POST** 完成整支部替换：中途失败会留下**半个名册**（旧行已删、新行没建）。
//    本端点把「删除旧名册 + 建新名册」放进**同一个 SQLite 事务**——任何一行不合法 ⇒ 整体回滚，
//    旧名册原样保留。
//
//  门（与通用 users 写口同口径，不放宽）：`requireAuth` + **仅 party-staff**。
//    （执行整表替换的主体是党委「支部管理 → 导入成员名册」；支部侧逐人维护走既有语义端点。）
//
//  守卫（与前端 `PersonStore.replaceBranchMembers` 同规则，服务端为权威）：
//    · 支部必须存在；
//    · 支部**不得已有业务历史**（活动 / 专班 / 思想汇报 / 支部文件 / 支书任期 / 上报审批）——防孤儿引用；
//    · 每行 id + 非空 name；文件内 id 不得重复；
//    · 目标 id 若已属于**其他支部** ⇒ 409（不静默改人支部）；同一支部的既有行按新行覆盖；
//    · 新名册未包含的本支部旧行 ⇒ 删除（并清其会话），与「整表替换」语义一致。
//
//  边界（如实）：不校验成员被其他业务行引用（todos/notices 等）；历史守卫已挡住有活动/专班的支部，
//    空支部导入场景下不会产生孤儿。若将来放开「有历史支部整表替换」，须先补引用清单再放宽。
// ════════════════════════════════════════════════════════════════
import { Router } from 'express';
import { requireAuth } from './auth.js';
import { bumpCollectionVersion } from '../db.js';
import { DEFAULT_BRANCH_ID, ROLE_KEYS } from '../../docs/src/core/domain/constants.js';

/** 允许从名册写入的成员字段（其余忽略；治理/软删除标记不从文件来） */
const MEMBER_FIELDS = [
  'id', 'name', 'studentId', 'role', 'partyGroup', 'developStage', 'developStageSince',
  'residenceStatus', 'residenceNote', 'email', 'phone',
];
/** 业务历史域（与 docs/src/services/member/person.js::_branchHasHistory 同口径） */
const HISTORY_TABLES = ['activities', 'taskforces', 'thought_reports', 'branch_docs', 'appointment_records', 'review_requests'];
const ROLE_SET = new Set(ROLE_KEYS);

const jsonRows = (db, table) => db.prepare(`SELECT id, data FROM ${table}`).all()
  .map((row) => ({ id: String(row.id), ...JSON.parse(row.data) }));

function branchHasHistory(db, branchId) {
  for (const table of HISTORY_TABLES) {
    const hit = db.prepare(
      `SELECT 1 FROM ${table} WHERE IFNULL(json_extract(data,'$.branchId'),'${DEFAULT_BRANCH_ID}') = ? LIMIT 1`,
    ).get(branchId);
    if (hit) return true;
  }
  return false;
}

/** 单行净化：必填 id/name；role 仅允许非党委角色；branchId 一律取路径参数 */
function cleanMemberRow(raw, branchId, existing = null) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: '成员行须为对象' };
  }
  const id = String(raw.id ?? '').trim();
  const name = String(raw.name ?? '').trim();
  if (!id) return { error: '成员行缺少 id（学号/工号）' };
  if (!name) return { error: `成员 ${id} 缺少姓名` };
  // 未给 role 时保留既有角色（防止整表导入把现任支委静默降级为普通成员）
  const role = raw.role === undefined || raw.role === null || String(raw.role).trim() === ''
    ? (existing?.role || 'participant') : String(raw.role).trim();
  if (!ROLE_SET.has(role)) return { error: `成员 ${id} 的角色无效：${role}` };
  if (role === 'party-staff') return { error: `成员 ${id} 不能是党委组织员（组织级角色不属于支部）` };
  const out = { id, name, role };
  for (const key of MEMBER_FIELDS) {
    if (key === 'id' || key === 'name' || key === 'role') continue;
    if (raw[key] !== undefined) out[key] = raw[key];
  }
  if (!out.studentId) out.studentId = existing?.studentId || id;
  out.branchId = branchId;
  return { row: out, base: existing };
}

export function createBranchRosterRouter(db) {
  const router = Router();

  router.put('/branches/:id/roster', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });
    if (actor.role !== 'party-staff') {
      return res.status(403).json({ error: '无权限：仅党委组织员可整表导入支部成员名册' });
    }
    const branchId = String(req.params.id || '');
    const branchRow = db.prepare('SELECT data FROM branches WHERE id = ?').get(branchId);
    if (!branchRow) return res.status(404).json({ error: '支部不存在' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const rows = Array.isArray(body.members) ? body.members : null;
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'body.members 须为非空数组' });
    if (branchHasHistory(db, branchId)) {
      return res.status(409).json({ error: '目标支部已有业务历史（活动/专班/思想汇报等），整表替换名单被拒绝（防孤儿引用）' });
    }

    // 既有账号：同支部 ⇒ 以既有行为基底合并（未给 role 时保留既有角色）；其他支部 ⇒ 拒绝（不静默改归属）
    const existingById = new Map(jsonRows(db, 'users').map((row) => [String(row.id), row]));
    const cleaned = [];
    const seen = new Set();
    for (const raw of rows) {
      const id = String(raw?.id ?? '').trim();
      const existing = id ? existingById.get(id) || null : null;
      if (existing && (existing.branchId || DEFAULT_BRANCH_ID) !== branchId) {
        return res.status(409).json({ error: `人员 ${id} 已属于其他支部（${existing.branchId || '未归属'}），不能静默改归属` });
      }
      const result = cleanMemberRow(raw, branchId, existing);
      if (result.error) return res.status(400).json({ error: result.error });
      if (seen.has(result.row.id)) return res.status(400).json({ error: `名册内 id 重复：${result.row.id}` });
      seen.add(result.row.id);
      cleaned.push({ ...result.row, __base: result.base });
    }

    const oldIds = jsonRows(db, 'users')
      .filter((row) => (row.branchId || DEFAULT_BRANCH_ID) === branchId)
      .map((row) => String(row.id));
    const removed = oldIds.filter((id) => !seen.has(id));

    const now = new Date().toISOString();
    const saved = [];
    const run = db.transaction(() => {
      // 旧名册：新名单未包含者删除（含会话；历史守卫已排除有业务历史的支部）
      for (const id of removed) {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        db.prepare('DELETE FROM sessions WHERE person_id = ?').run(id);
      }
      const insert = db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)');
      for (const row of cleaned) {
        const { __base, ...incoming } = row;
        const base = __base ? { ...__base } : {
          id: incoming.id, name: incoming.name, studentId: incoming.studentId,
          partyGroup: '', developStage: '', role: 'participant', branchId,
        };
        // 文件是权威：允许覆盖字段；但治理标记（流出/删除）必须清掉——导入即「在册可登录」。
        delete base.transferOut; delete base.transferOutAt; delete base.transferOutNote;
        const next = { ...base, ...incoming, branchId, updatedAt: now };
        insert.run(next.id, JSON.stringify(next));
        saved.push(next);
      }
      bumpCollectionVersion(db, 'users');
    });
    run();

    res.json({ ok: true, branchId, count: saved.length, removed: removed.length, members: saved });
  });

  return router;
}
