// server/routes/member.js — 成员变更审批链路（书记 2026-09-01 点验链路 ③④ 落地）
// 数据闭环：议程「记录通过」→ 前端创建成员变更申请（pending-org-approval）
//          → 组织委员审批（approve）→ 自动广播全体支委（committee_broadcasts）
//          → 书记确认（confirm）→ 更新成员发展阶段（users.developStage）
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole, requireCommissioner } from './auth.js';

// 全体支委（广播对象：书记/副书记/组织/宣传/纪检，与 member-change-flow 测试断言一致）
const COMMITTEE_IDS = ['p10', 'p11', 'p12', 'p13', 'p14'];

const ORG_COMMISSIONER_ROLES = new Set(['org-commissioner']);
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

export function createMemberRouter(db) {
  const router = Router();

  // ── 申请列表（支委可见；支持按活动/状态过滤）──
  router.get('/member-change-requests', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'member_change_requests');
    if (req.query.activityId) rows = rows.filter((r) => r.activityId === req.query.activityId);
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    res.json(rows);
  });

  // ── 创建申请（支委；普通成员 403）──
  // 来源：议程「记录通过」后的自动派生（agenda-follow-up），也可由书记直接发起
  // 2026-09-01 代码审查修复（P1）：按 activityId+agendaItemId+personId 防重，
  // 已存在待审批/已完成申请时返回 409（防止 API 模式下前端查重失效导致的重复申请）
  router.post('/member-change-requests', requireCommissioner(db), (req, res) => {
    const { activityId, agendaItemId, personId, fromStage, toStage, meetingResult } = req.body || {};
    if (!activityId || !agendaItemId || !personId || !fromStage || !toStage) {
      return res.status(400).json({ error: '缺少必要字段：activityId/agendaItemId/personId/fromStage/toStage' });
    }
    const existing = listTable(db, 'member_change_requests').find((r) =>
      r.activityId === activityId && r.agendaItemId === agendaItemId && r.personId === personId
      && (r.status === 'pending-org-approval' || r.status === 'pending-secretary' || r.status === 'completed'));
    if (existing) {
      return res.status(409).json({ error: '该议程对此成员的变更申请已存在', id: existing.id });
    }
    const id = `mcr-${randomUUID().slice(0, 8)}`;
    const row = {
      id,
      activityId,
      agendaItemId,
      personId,
      fromStage,
      toStage,
      meetingResult: meetingResult || 'passed',
      status: 'pending-org-approval',
      createdBy: req.actor.id,
      createdAt: new Date().toISOString(),
    };
    writeRow(db, 'member_change_requests', row);
    res.status(201).json(row);
  });

  // ── 组织委员审批 → 自动广播全体支委（approve 幂等：重复审批不重复广播）──
  router.post('/member-change-requests/:id/approve', requireRole(db, ORG_COMMISSIONER_ROLES), (req, res) => {
    const existing = getRow(db, 'member_change_requests', req.params.id);
    if (!existing) return res.status(404).json({ error: '申请不存在' });
    if (existing.status === 'completed' || existing.status === 'rejected') {
      return res.status(400).json({ error: `申请已${existing.status}，不可再审批` });
    }
    const updated = {
      ...existing,
      status: 'pending-secretary',
      approvedBy: req.actor.id,
      approvedAt: new Date().toISOString(),
    };
    writeRow(db, 'member_change_requests', updated);

    // 广播全体支委（含组织委员自身与书记；状态 pending 待支委确认收到）
    const already = listTable(db, 'committee_broadcasts').filter((b) => b.requestId === existing.id);
    for (const recipientId of COMMITTEE_IDS) {
      if (already.some((b) => b.recipientId === recipientId)) continue;
      const bid = `cb-${randomUUID().slice(0, 8)}`;
      writeRow(db, 'committee_broadcasts', {
        id: bid,
        requestId: existing.id,
        recipientId,
        status: 'pending',
        broadcastAt: new Date().toISOString(),
      });
    }
    res.json(updated);
  });

  // ── 书记确认 → 更新成员发展阶段（users.developStage）──
  router.post('/member-change-requests/:id/confirm', requireRole(db, SECRETARY_ROLES), (req, res) => {
    const existing = getRow(db, 'member_change_requests', req.params.id);
    if (!existing) return res.status(404).json({ error: '申请不存在' });
    if (existing.status !== 'pending-secretary') {
      return res.status(400).json({ error: `当前状态 ${existing.status} 不可确认，须组织委员审批后` });
    }
    const updated = {
      ...existing,
      status: 'completed',
      confirmedBy: req.actor.id,
      confirmedAt: new Date().toISOString(),
    };
    writeRow(db, 'member_change_requests', updated);

    // 更新成员发展阶段（缺省回退：toStage 为空则沿用原阶段）
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(existing.personId);
    if (userRow) {
      const user = JSON.parse(userRow.data);
      const merged = { ...user, developStage: existing.toStage || user.developStage };
      db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(existing.personId, JSON.stringify(merged));
    }
    res.json(updated);
  });

  // ── 广播记录（支委可见；按 requestId 过滤）──
  router.get('/committeeBroadcasts', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'committee_broadcasts');
    if (req.query.requestId) rows = rows.filter((r) => r.requestId === req.query.requestId);
    res.json(rows);
  });

  return router;
}
