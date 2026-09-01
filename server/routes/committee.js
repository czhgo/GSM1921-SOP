// server/routes/committee.js — 线上支委会：异步表态（agenda_votes）
// 闭环：书记创建支委会+议题 → 通知支委 → 委员异步表态 → 书记汇总/截止 → 记录决议（复用 agenda）
// 表态可见性：先全量可见（信息同步开放），边界后续评议
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireCommissioner } from './auth.js';

// 支委白名单（与 member.js COMMITTEE_IDS 对齐：书记/副书记/组织/宣传/纪检）
const COMMITTEE_IDS = new Set(['p10', 'p11', 'p12', 'p13', 'p14']);

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
    if (position === 'object' && !note.trim()) {
      return res.status(400).json({ error: '异议须附言说明' });
    }
    // 活动锁定期检查（活动数据在 activities 表）
    const actRow = getRow(db, 'activities', activityId);
    if (actRow && actRow.votesLocked) {
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

  // 书记截止（置 votesLocked / voteDeadline；书记角色）
  router.post('/agenda-votes/lock', requireCommissioner(db), (req, res) => {
    const { activityId, votesLocked, voteDeadline } = req.body || {};
    if (!activityId) return res.status(400).json({ error: '缺少 activityId' });
    const act = getRow(db, 'activities', activityId) || { id: activityId };
    const merged = {
      ...act,
      ...(typeof votesLocked === 'boolean' ? { votesLocked } : {}),
      ...(voteDeadline ? { voteDeadline } : {}),
    };
    writeRow(db, 'activities', merged);
    res.json(merged);
  });

  return router;
}
