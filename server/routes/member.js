// server/routes/member.js — 成员变更审批链路（书记 2026-09-01 点验链路 ③④ 落地）
// 数据闭环：议程「记录通过」→ 前端创建成员变更申请（pending-org-approval）
//          → 组织委员审批（approve）→ 自动广播全体支委（committee_broadcasts）
//          → 书记确认（confirm）→ 更新成员发展阶段（users.developStage）
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole, requireCommissioner } from './auth.js';
// P2c（2026-09-03）：角色/支委名单单一源 = docs/src/core/constants.js（勿手写）
import { SECRETARY_ROLES as SECRETARY_ROLE_KEYS, COMMITTEE_IDS as BRANCH_COMMITTEE_IDS } from '../../docs/src/core/constants.js';
// 发展阶段枚举单一源 = docs/src/services/org-base-data-preview.js（叶子模块，勿另写枚举）
import { DEVELOP_STAGE_OPTIONS } from '../../docs/src/services/org-base-data-preview.js';

// 全体支委（广播对象：书记/副书记/组织/宣传/纪检，与 member-change-flow 测试断言一致）
// P2c：名单单一源 = constants.js COMMITTEE_IDS / SECRETARY_ROLES（勿手写）
const COMMITTEE_IDS = BRANCH_COMMITTEE_IDS;

const ORG_COMMISSIONER_ROLES = new Set(['org-commissioner']);
const SECRETARY_ROLES = new Set(SECRETARY_ROLE_KEYS);

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

  // ── 名册确权链 · 书记阶段写入语义端点（C-2 方案 B，2026-09-11 书记批）──────────
  // 背景：确权链「书记确认生效」经 PersonStore.saveMember → ApiAdapter.users.update（PATCH /users/:id），
  // 而 resources.js 的 users 写权矩阵仅 party-staff（RESOURCE_WRITE_GATE.users）→ 书记 role='secretary'
  // 被 403 阻断，确权链在 API 形态断裂。本端点复用既有书记专属直写通道（语义同 member.js confirm）：
  //   · 权限 = requireRole(SECRETARY_ROLES)（与 confirm 同源；副书记/委员/党委组织员一律 403，不扩大越权面）；
  //   · 同支部校验（actor 归属支部 vs 目标成员归属支部，缺省 br-b1，与 resources.js 口径一致）；
  //   · 字段固定白名单 = 仅 developStage；含 role/branchId 等治理字段 → 400 硬挡（防自封/越支部）；
  //   · 直接写 users.developStage，不触碰 resources.js 的 users 写权矩阵。
  // 返回：200 { ...updatedUser }（单条成员对象，与其它写端点一致）；错误 400/401/403/404 { error }。
  const DEVELOP_STAGE_FORBIDDEN = ['role', 'branchId'];
  router.post('/members/:id/develop-stage', requireRole(db, SECRETARY_ROLES), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const forbidden = DEVELOP_STAGE_FORBIDDEN.find((k) => Object.prototype.hasOwnProperty.call(body, k));
    if (forbidden) {
      return res.status(400).json({ error: `字段 ${forbidden} 不在白名单（本端点仅可写 developStage）` });
    }
    const toStage = body.developStage;
    if (typeof toStage !== 'string' || !DEVELOP_STAGE_OPTIONS.includes(toStage)) {
      return res.status(400).json({ error: `developStage 须为：${DEVELOP_STAGE_OPTIONS.join(' / ')}` });
    }
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(req.params.id);
    if (!userRow) return res.status(404).json({ error: '成员不存在' });
    const user = JSON.parse(userRow.data);
    const myBranch = req.actor.branchId || 'br-b1';
    const targetBranch = user.branchId || 'br-b1';
    if (myBranch !== targetBranch) {
      return res.status(403).json({ error: '无权限：仅可推进本支部成员的发展阶段' });
    }
    const merged = { ...user, developStage: toStage };
    writeRow(db, 'users', merged);
    res.json(merged);
  });

  // ── 广播记录（支委可见；按 requestId 过滤）──
  router.get('/committeeBroadcasts', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'committee_broadcasts');
    if (req.query.requestId) rows = rows.filter((r) => r.requestId === req.query.requestId);
    res.json(rows);
  });

  return router;
}
