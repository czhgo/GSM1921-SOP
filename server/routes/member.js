// server/routes/member.js — 成员变更审批链路（支书 2026-09-01 点验链路 ③④ 落地）
// 数据闭环：议程「记录通过」→ 前端创建成员变更申请（pending-org-approval）
//          → 组织委员审批（approve）→ 自动广播全体支委（committee_broadcasts）
//          → 支书/副支书确认（confirm；副书同权 2026-09-11）→ 更新成员发展阶段（users.developStage）
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole, requireCommissioner } from './auth.js';
// P2c（2026-09-03）：角色/支委名单单一源 = docs/src/core/constants.js（勿手写）
import {
  SECRETARY_AND_DEPUTY_ROLES as SECRETARY_DEPUTY_ROLE_KEYS,
  COMMITTEE_IDS as BRANCH_COMMITTEE_IDS,
} from '../../docs/src/core/constants.js';
// 发展阶段/在册状态枚举单一源 = docs/src/services/org-base-data-preview.js（叶子模块，勿另写枚举；
// RESIDENCE 与 services/roster.js 同值，单测断言防失同步）
import { DEVELOP_STAGE_OPTIONS, RESIDENCE } from '../../docs/src/services/org-base-data-preview.js';

// 全体支委（广播对象：支书/副支书/组织/宣传/纪检，与 member-change-flow 测试断言一致）
// P2c：名单单一源 = constants.js COMMITTEE_IDS（勿手写）
const COMMITTEE_IDS = BRANCH_COMMITTEE_IDS;

const ORG_COMMISSIONER_ROLES = new Set(['org-commissioner']);
// 副书同权（2026-09-11 支书裁定）：支书侧写链共享集合（单一源 constants.js，勿手写两套）——
// 名册阶段/在册镜像、移出确认、成员变更确认（本文件 confirm）一律复用本集合。
const SECRETARY_AND_DEPUTY_ROLES = new Set(SECRETARY_DEPUTY_ROLE_KEYS);

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
  // 来源：议程「记录通过」后的自动派生（agenda-follow-up），也可由支书直接发起
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

    // 广播全体支委（含组织委员自身与支书；状态 pending 待支委确认收到）
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

  // ── 支书/副支书确认 → 更新成员发展阶段（users.developStage）──
  // 副书同权（2026-09-11 支书裁定）：确认端点一并纳入，复用 SECRETARY_AND_DEPUTY_ROLES
  // （与名册阶段/在册镜像、移出确认同口径，不在支书侧写链内再造第二套集合）。
  // 同支部校验（与 develop-stage / residence-status 等支书侧写端点同口径）：跨支部一律 403。
  router.post('/member-change-requests/:id/confirm', requireRole(db, SECRETARY_AND_DEPUTY_ROLES), (req, res) => {
    const existing = getRow(db, 'member_change_requests', req.params.id);
    if (!existing) return res.status(404).json({ error: '申请不存在' });
    if (existing.status !== 'pending-secretary') {
      return res.status(400).json({ error: `当前状态 ${existing.status} 不可确认，须组织委员审批后` });
    }
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(existing.personId);
    const user = userRow ? JSON.parse(userRow.data) : null;
    if (user && (req.actor.branchId || 'br-b1') !== (user.branchId || 'br-b1')) {
      return res.status(403).json({ error: '无权限：仅可确认本支部成员的变更申请' });
    }
    const updated = {
      ...existing,
      status: 'completed',
      confirmedBy: req.actor.id,
      confirmedAt: new Date().toISOString(),
    };
    writeRow(db, 'member_change_requests', updated);

    // 更新成员发展阶段（缺省回退：toStage 为空则沿用原阶段）
    if (user) {
      const merged = { ...user, developStage: existing.toStage || user.developStage };
      db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(existing.personId, JSON.stringify(merged));
    }
    res.json(updated);
  });

  // ── 名册成员变更确认链 · 支书阶段写入语义端点（C-2 方案 B，2026-09-11 支书批）──────────
  // 背景：成员变更确认链「支书确认生效」经 PersonStore.saveMember → ApiAdapter.users.update（PATCH /users/:id），
  // 而 resources.js 的 users 写权矩阵仅 party-staff（RESOURCE_WRITE_GATE.users）→ 支书 role='secretary'
  // 被 403 阻断，成员变更确认链在 API 形态断裂。本端点复用既有支书专属直写通道（语义同 member.js confirm）：
  //   · 权限 = requireRole(SECRETARY_AND_DEPUTY_ROLES)（副书同权 2026-09-11 支书裁定；
  //     委员/党委组织员一律 403，不扩大越权面）；
  //   · 同支部校验（actor 归属支部 vs 目标成员归属支部，缺省 br-b1，与 resources.js 口径一致）；
  //   · 字段固定白名单 = 仅 developStage；含 role/branchId 等治理字段 → 400 硬挡（防自封/越支部）；
  //   · 直接写 users.developStage，不触碰 resources.js 的 users 写权矩阵。
  // 返回：200 { ...updatedUser }（单条成员对象，与其它写端点一致）；错误 400/401/403/404 { error }。
  const DEVELOP_STAGE_FORBIDDEN = ['role', 'branchId'];
  router.post('/members/:id/develop-stage', requireRole(db, SECRETARY_AND_DEPUTY_ROLES), (req, res) => {
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

  // ── 名册写链 · API 形态语义端点（R-10 全补三条写链，2026-09-11 支书裁定）────────────
  // 背景：名册三条写链在 API 形态经通用 /users 写口（PATCH/POST/DELETE）落库，而 resources.js 的
  // users 写权矩阵仅 party-staff（党委组织员/党务老师）→ 组织委员/支书被 403 阻断，写链断裂。
  // 本组端点复用语义直写通道（与上方 develop-stage 同构），**不改 resources.js 的 users 写权矩阵**
  // （不扩大越权面），统一纪律：requireRole + 同支部校验 + 字段白名单（注入 role/branchId → 400；
  // 枚举非法 → 400；成员不存在 → 404；跨支部 → 403）。
  //   · 在册状态镜像  POST  /members/:id/residence-status  支书/副支书（副书同权）+ 仅在册字段
  //   · 名册档案维护  PATCH /members/:id/profile           组织委员（支书/副支书不越权；口径不变）+ 在册属性白名单
  //   · 名册新增      POST  /members                       组织委员（同上；支书/副支书不越权）；强制归本支部、默认普通成员角色
  //   · 移出（软标记）POST  /members/:id/transfer-out      组织委员发起 or 支书/副支书确认；原行保留不删不匿名
  const RESIDENCE_FIELDS = ['residenceStatus', 'residenceNote', 'residenceHistory'];
  const PROFILE_FIELDS = ['name', 'studentId', 'partyGroup', ...RESIDENCE_FIELDS];
  const CREATE_FIELDS = ['id', 'name', 'studentId', 'partyGroup', 'developStage', ...RESIDENCE_FIELDS];
  const RESIDENCE_VALUES = [RESIDENCE.CAMPUS, RESIDENCE.DETAINED];
  const TRANSFER_OUT_ROLES = new Set(['org-commissioner', ...SECRETARY_DEPUTY_ROLE_KEYS]);
  const branchOf = (u) => (u && u.branchId) || 'br-b1';
  const readUser = (id) => {
    const row = db.prepare('SELECT data FROM users WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : null;
  };
  const firstOutside = (body, allowed) => Object.keys(body).find((k) => !allowed.includes(k));

  // ① 在册状态镜像：成员变更确认链支书/副支书确认生效 → 写 residenceStatus/Note/History（副书同权 + 同支部）
  router.post('/members/:id/residence-status', requireRole(db, SECRETARY_AND_DEPUTY_ROLES), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = firstOutside(body, RESIDENCE_FIELDS);
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${RESIDENCE_FIELDS.join(' / ')}）` });
    if (body.residenceStatus !== undefined && !RESIDENCE_VALUES.includes(body.residenceStatus)) {
      return res.status(400).json({ error: `residenceStatus 须为：${RESIDENCE_VALUES.join(' / ')}` });
    }
    const user = readUser(req.params.id);
    if (!user) return res.status(404).json({ error: '成员不存在' });
    if (branchOf(req.actor) !== branchOf(user)) {
      return res.status(403).json({ error: '无权限：仅可维护本支部成员的在册状态' });
    }
    const merged = { ...user, ...body };
    writeRow(db, 'users', merged);
    res.json(merged);
  });

  // ② 名册档案维护：组织委员行内编辑（姓名/学号/党小组/在册属性）
  //   阶段字段不在白名单 → 400（唯一写位 = develop-stage，不得由本端点改写）
  router.patch('/members/:id/profile', requireRole(db, ORG_COMMISSIONER_ROLES), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = firstOutside(body, PROFILE_FIELDS);
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${PROFILE_FIELDS.join(' / ')}；发展阶段请走 develop-stage）` });
    if (PROFILE_FIELDS.every((k) => body[k] === undefined)) {
      return res.status(400).json({ error: '无可更新字段' });
    }
    const user = readUser(req.params.id);
    if (!user) return res.status(404).json({ error: '成员不存在' });
    if (branchOf(req.actor) !== branchOf(user)) {
      return res.status(403).json({ error: '无权限：仅可维护本支部成员名册' });
    }
    if (body.name !== undefined && !String(body.name === null ? '' : body.name).trim()) {
      return res.status(400).json({ error: '成员姓名不能为空' });
    }
    if (body.residenceStatus !== undefined && !RESIDENCE_VALUES.includes(body.residenceStatus)) {
      return res.status(400).json({ error: `residenceStatus 须为：${RESIDENCE_VALUES.join(' / ')}` });
    }
    const merged = { ...user, ...body };
    writeRow(db, 'users', merged);
    res.json(merged);
  });

  // ②b 名册新增：组织委员；id 缺省服务端生成；强制归本支部 + 默认 role=participant（防注入）
  router.post('/members', requireRole(db, ORG_COMMISSIONER_ROLES), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = firstOutside(body, CREATE_FIELDS);
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（新增成员仅可写 ${CREATE_FIELDS.join(' / ')}）` });
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({ error: '成员姓名不能为空' });
    }
    if (body.developStage !== undefined && String(body.developStage).trim() !== '' && !DEVELOP_STAGE_OPTIONS.includes(body.developStage)) {
      return res.status(400).json({ error: `developStage 须为：${DEVELOP_STAGE_OPTIONS.join(' / ')}` });
    }
    if (body.residenceStatus !== undefined && String(body.residenceStatus).trim() !== '' && !RESIDENCE_VALUES.includes(body.residenceStatus)) {
      return res.status(400).json({ error: `residenceStatus 须为：${RESIDENCE_VALUES.join(' / ')}` });
    }
    const id = body.id ? String(body.id) : `p_${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM users WHERE id = ?').get(id)) {
      return res.status(409).json({ error: '成员 id 已存在（改档请走 PATCH /members/:id/profile）' });
    }
    const row = { ...body, id, name: body.name.trim(), role: 'participant', branchId: branchOf(req.actor) };
    writeRow(db, 'users', row);
    res.status(201).json(row);
  });

  // ③ 移出（软标记「已转出」：原行保留、不删不匿名；组织委员发起 / 支书·副支书确认 + 同支部）
  router.post('/members/:id/transfer-out', requireRole(db, TRANSFER_OUT_ROLES), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = firstOutside(body, ['note']);
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 note）` });
    const user = readUser(req.params.id);
    if (!user) return res.status(404).json({ error: '成员不存在' });
    if (branchOf(req.actor) !== branchOf(user)) {
      return res.status(403).json({ error: '无权限：仅可移出本支部成员' });
    }
    if (user.transferOut === true) return res.json(user); // 幂等：已转出重复请求不重复改写
    const at = new Date().toISOString();
    const merged = { ...user, transferOut: true, transferredOutAt: at, removedAt: at, removedBy: req.actor.id };
    if (typeof body.note === 'string' && body.note.trim()) merged.transferOutNote = body.note.trim();
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
