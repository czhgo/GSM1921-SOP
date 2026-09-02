// server/routes/committee.js — 线上支委会：异步表态（agenda_votes）
// 闭环：书记创建支委会+议题 → 通知支委 → 委员异步表态 → 书记汇总/截止 → 记录决议（复用 agenda）
// 表态可见性：先全量可见（信息同步开放），边界后续评议
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole, requireCommissioner } from './auth.js';

// 支委白名单 = 旧活动回退白名单（保留不改行为；历史固定成员 p10-p14，与 member.js COMMITTEE_IDS 对齐），
// 供无 voteConfig 的旧活动/回退场景兜底校验。
// 权威名单 = 活动 voteConfig.voterIds（前端创建活动时经 vote-config 固化写入活动）；
// 前端唯一源 = docs/src/services/vote-config.js resolveVoterIds('committee')
//   （people.js role + AuthStore.isCommissioner，排除 u_*）。名单变更请改前端权威源，勿在此增删成员。
const COMMITTEE_IDS = new Set(['p10', 'p11', 'p12', 'p13', 'p14']);
// 书记角色（截止锁定仅书记可操作，与 member.js SECRETARY_ROLES 口径一致）
const SECRETARY_ROLES = new Set(['secretary']);

function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));
}
function getRow(db, table, id) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.data) : null;
}
function writeRow(db, table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}

const POSITIONS = new Set(['agree', 'object', 'comment']);

export function createCommitteeRouter(db) {
  const router = Router();

  // 表态列表（按活动过滤；全量可见）
  router.get('/agenda-votes', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'agenda_votes');
    if (req.query.activityId) rows = rows.filter((v) => v.activityId === req.query.activityId);
    res.json(rows);
  });

  // 提交/覆盖表态（支委；截止锁定后 400；非支委 403）
  router.post('/agenda-votes', requireCommissioner(db), (req, res) => {
    if (!COMMITTEE_IDS.has(req.actor.id)) return res.status(403).json({ error: '仅支委可表态' });
    const { activityId, agendaItemId, position, note = '' } = req.body || {};
    if (!activityId || !agendaItemId || !POSITIONS.has(position)) {
      return res.status(400).json({ error: '缺少必要字段或表态无效：activityId/agendaItemId/position(agree|object|comment)' });
    }
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'note 须为字符串' });
    }
    if (note.length > 500) {
      return res.status(400).json({ error: 'note 长度不能超过 500 字符' });
    }
    if (position === 'object' && !note.trim()) {
      return res.status(400).json({ error: '异议须附言说明' });
    }
    // 活动存在性 + 锁定期检查（活动数据在 activities 表；活动不存在一律 404，不静默放行）
    const actRow = getRow(db, 'activities', activityId);
    if (!actRow) return res.status(404).json({ error: '活动不存在' });
    if (actRow.votesLocked) {
      return res.status(400).json({ error: '表态已截止锁定，不可再提交' });
    }
    const existing = listTable(db, 'agenda_votes').find((v) =>
      v.activityId === activityId && v.agendaItemId === agendaItemId && v.personId === req.actor.id);
    if (existing) {
      const updated = { ...existing, position, note, updatedAt: new Date().toISOString() };
      writeRow(db, 'agenda_votes', updated);
      return res.json(updated);
    }
    const row = {
      id: `av-${randomUUID().slice(0, 8)}`,
      activityId, agendaItemId,
      personId: req.actor.id,
      position, note,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    writeRow(db, 'agenda_votes', row);
    res.status(201).json(row);
  });

  // 书记截止（不可逆）：置 votesLocked=true / voteDeadline；仅书记角色，截止后不可解锁
  router.post('/agenda-votes/lock', requireRole(db, SECRETARY_ROLES), (req, res) => {
    const { activityId, votesLocked, voteDeadline } = req.body || {};
    if (!activityId) return res.status(400).json({ error: '缺少 activityId' });
    if (voteDeadline !== undefined && (typeof voteDeadline !== 'string' || !voteDeadline.trim())) {
      return res.status(400).json({ error: 'voteDeadline 须为非空字符串' });
    }
    const act = getRow(db, 'activities', activityId);
    if (!act) return res.status(404).json({ error: '活动不存在' });
    const merged = {
      ...act,
      // 截止不可逆：仅允许置 true，禁止解锁（传 false 不写入）
      ...(votesLocked === true ? { votesLocked: true } : {}),
      ...(voteDeadline ? { voteDeadline } : {}),
    };
    writeRow(db, 'activities', merged);
    res.json(merged);
  });

  return router;
}
