// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/semantic-routes.js —— **语义端点**（三委交接 / 成员变更确认 / 里程碑 / 申诉 / 未读标记 / 授权审计）
//  SEMANTIC_TABLES 各表独立于 RESOURCE_TABLES ⇒ 不进快照写穿；由 index.js 装配时调用。
// ════════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole } from '../auth.js';
import { HANDOFF_TYPES as HANDOFF_TYPES_SRC, AUTO_CONFIRM_TYPES } from '../../../docs/src/services/governance/handoff.js';
import { BRANCH_COMMISSION_ROLES } from '../../../docs/src/core/domain/constants.js';
import { listTable, getRow, writeRow } from './store.js';
import { ORG_COMMISSIONER_ROLE_SET, SECRETARY_AND_DEPUTY_ROLE_SET } from './gates.js';

// ════════════════════════════════════════════════════════════════
//  语义端点：申诉队列 / 反馈未读标记 / 授权审计留痕（2026-09-24 批次 169）
// ════════════════════════════════════════════════════════════════
// 由来（支书 2026-09-24 逐字：「我们必须把网页升级成系统！！【浏览器缓存固然有用但不能什么都依靠浏览器缓存！！】」）：
//   四处原先**只有浏览器本地一份**——出勤/考察申诉队列各只存 localStorage 键
//   `gsm1921-attendance-appeals` / `gsm1921-inspection-appeals`；意见反馈未读标记按人分键
//   `gsm1921-issue-unread-<assigneeId>`；授权审计留痕只存 `sop_org_os_auth_audit`
//   ⇒ 清缓存即队列/标记/留痕灭失、换设备读不到。现按**语义端点域**模板（同 handoffs / member_confirmations）
//   落服务端表：`server/db.js::SEMANTIC_TABLES` 建表，前端 `init()` 拉取填缓存
//   （`docs/src/data/data-adapter.js::_loadAuxCollections`），写口改经本组端点 ⇒ 服务器为权威。
// 纪律（三条，同上批）：① **故意不进快照 payload**（写口是语义端点，走快照会被防抖窗口里的陈旧缓存覆盖）；
//   ② 写门照既有 requireXxx 中间件、角色集取 constants.js 单一源；③ 表在 `SEMANTIC_TABLES`
//   ⇒ 无通用 CRUD、不参与快照事务。
// ⚠ **本段整体置文件末**：`createResourcesRouter` 内只以一个**同行追加**的
//   `registerExtraSemanticRoutes(router, db)` 调用它——上文（`:919-1040` 等）行号是 README-server.md 的
//   取证靶点（doc-line-ref.test.mjs 逐条核），在 router 内插行会整体漂移 ⇒ 同 server/db.js「新增一律追加在尾部」纪律。
export function registerExtraSemanticRoutes(router, db) {
  const APPEAL_STATUSES = ['pending', 'returned', 'closed'];
  const APPEAL_PATCH_KEYS = ['status', 'note'];
  // 申诉处置位＝支委层（纪检/支书/组织/宣传）+ 党小组组长（「交组织方重新确认」的重确认位）——
  //   角色集由 constants.js::BRANCH_COMMISSION_ROLES 单一源派生，勿手写角色字符串
  const APPEAL_DISPOSITION_ROLE_SET = new Set([...BRANCH_COMMISSION_ROLES, 'leader']);
  // 申诉读（可按支部 / 状态过滤）
  const readAppeals = (req, table) => {
    let rows = listTable(db, table);
    if (req.query.branchId) rows = rows.filter((r) => (r.branchId || 'br-b1') === req.query.branchId);
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    return rows;
  };
  // 申诉提交（当事人本人；防冒名：personId 必须＝登录人）
  const submitAppeal = (req, res, table, idPrefix) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const personId = body.personId ? String(body.personId) : '';
    const activityId = body.activityId ? String(body.activityId) : '';
    if (!personId || !activityId) return res.status(400).json({ error: '缺少必要字段：personId/activityId' });
    if (personId !== String(req.actor.id)) return res.status(403).json({ error: '无权限：申诉仅可由当事人本人提交' });
    const id = body.id ? String(body.id) : `${idPrefix}-${randomUUID().slice(0, 8)}`;
    if (db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) return res.status(409).json({ error: '该申诉 id 已存在' });
    const row = {
      id,
      branchId: req.actor.branchId || 'br-b1',
      personId,
      activityId,
      note: typeof body.note === 'string' ? body.note.trim() : '',
      status: 'pending',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    writeRow(db, table, row);
    res.status(201).json(row);
  };
  // 申诉处置（纪检核实后关闭 / 打回；组织方重新确认后关闭）——仅 pending 可处置、终态幂等拒绝
  const disposeAppeal = (req, res, table) => {
    const row = getRow(db, table, req.params.id);
    if (!row) return res.status(404).json({ error: '申诉不存在' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !APPEAL_PATCH_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${APPEAL_PATCH_KEYS.join(' / ')}）` });
    const status = body.status === undefined ? 'closed' : String(body.status);
    if (!APPEAL_STATUSES.includes(status)) return res.status(400).json({ error: `status 须为：${APPEAL_STATUSES.join(' / ')}` });
    if (row.status !== 'pending') return res.status(400).json({ error: `当前状态 ${row.status} 不可再处置` });
    const at = new Date().toISOString();
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const next = status === 'returned'
      ? { ...row, status, returnedBy: req.actor.id, returnedAt: at, returnNote: note }
      : { ...row, status, decidedBy: req.actor.id, decidedAt: at, ...(note ? { decisionNote: note } : {}) };
    writeRow(db, table, next);
    res.json(next);
  };
  // ── 出勤申诉队列（SOP-B-42 / D-456；前端 services/activity/attendance.js）──
  router.get('/attendance-appeals', requireAuth(db), (req, res) => res.json(readAppeals(req, 'attendance_appeals')));
  router.post('/attendance-appeals', requireAuth(db), (req, res) => submitAppeal(req, res, 'attendance_appeals', 'appeal'));
  router.patch('/attendance-appeals/:id', requireRole(db, APPEAL_DISPOSITION_ROLE_SET), (req, res) => disposeAppeal(req, res, 'attendance_appeals'));
  // ── 考察申诉队列（SOP-B-10；前端 services/activity/inspection.js）──
  router.get('/inspection-appeals', requireAuth(db), (req, res) => res.json(readAppeals(req, 'inspection_appeals')));
  router.post('/inspection-appeals', requireAuth(db), (req, res) => submitAppeal(req, res, 'inspection_appeals', 'inspAppeal'));
  router.patch('/inspection-appeals/:id', requireRole(db, APPEAL_DISPOSITION_ROLE_SET), (req, res) => disposeAppeal(req, res, 'inspection_appeals'));
  // ── 意见反馈「逐人未读标记」（前端 services/governance/issues.js::IssueNotify）──
  // 行＝{ id: `${assigneeId}:${issueId}`, assigneeId, issueId, unread:true, at }；销项＝unread:false（保留行便于审计）
  // ⚠ 写门＝requireAuth（**与 mock 形态同口径**）：标记是「指派 / 答复」写链的副产品——**由派发方**替被指派人
  //   落未读（见 docs/src/services/governance/issues.js:609,786 的 markUnread 调用点）。服务端只落不判定
  //   「该 actor 是否真派发过」；如需收严另裁（如实登记，未自创第二套口径）。
  const issueUnreadId = (assigneeId, issueId) => `${assigneeId}:${issueId}`;
  const UNREAD_WRITE_KEYS = ['assigneeId', 'issueId', 'unread'];
  router.get('/issue-unread', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'issue_unread');
    if (req.query.assigneeId) rows = rows.filter((r) => r.assigneeId === req.query.assigneeId);
    if (req.query.open === '1') rows = rows.filter((r) => r.unread === true);
    res.json(rows);
  });
  router.post('/issue-unread', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !UNREAD_WRITE_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${UNREAD_WRITE_KEYS.join(' / ')}）` });
    const assigneeId = body.assigneeId ? String(body.assigneeId) : '';
    const issueId = body.issueId ? String(body.issueId) : '';
    if (!assigneeId || !issueId) return res.status(400).json({ error: '缺少必要字段：assigneeId/issueId' });
    const id = issueUnreadId(assigneeId, issueId);
    const prev = getRow(db, 'issue_unread', id) || {};
    const row = { ...prev, id, assigneeId, issueId, unread: body.unread !== false, at: new Date().toISOString() };
    writeRow(db, 'issue_unread', row);
    res.json(row);
  });
  // ── 授权审计留痕（T-190；前端 services/core/auth.js）──
  // 只增不改的治理档案：读＝支委层（赋权留痕是支委治理记录）；写＝登录用户（赋权动作内部调用，服务端只落不判定）
  const AUTH_AUDIT_KEYS = ['id', 'targetPersonId', 'role', 'scopeRef', 'authorizedBy', 'authorizedAt', 'action'];
  router.get('/auth-audit', requireRole(db, new Set(BRANCH_COMMISSION_ROLES)), (req, res) => res.json(listTable(db, 'auth_audit')));
  router.post('/auth-audit', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !AUTH_AUDIT_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${AUTH_AUDIT_KEYS.join(' / ')}）` });
    const id = body.id ? String(body.id) : `auth-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM auth_audit WHERE id = ?').get(id)) return res.json(getRow(db, 'auth_audit', id)); // 幂等：同 id 不重复落
    const row = {
      id,
      targetPersonId: body.targetPersonId ? String(body.targetPersonId) : null,
      role: body.role ? String(body.role) : null,
      scopeRef: body.scopeRef !== undefined && body.scopeRef !== null ? String(body.scopeRef) : '',
      authorizedBy: body.authorizedBy ? String(body.authorizedBy) : (req.actor ? req.actor.id : null),
      authorizedAt: body.authorizedAt || new Date().toISOString().slice(0, 10),
      action: body.action === 'revoke' ? 'revoke' : 'grant',
    };
    writeRow(db, 'auth_audit', row);
    res.status(201).json(row);
  });

  // ════════════════════════════════════════════════════════════════
  //  语义端点：三委数据交接 / 成员变更确认队列 / 批次里程碑（2026-09-23 批次 163）
  // ════════════════════════════════════════════════════════════════
  // 由来（支书 2026-09-23 逐字：「我们必须把网页升级成系统！！【浏览器缓存固然有用但不能什么都依靠浏览器缓存！！】」）：
  //   这三域此前**只有浏览器本地一份**——`handoffs` 有本地落盘却不在快照 payload / init 拉取 / 资源名映射里
  //   （api 形态下 `mockDB.handoffs` 恒空、刷新即丢）；成员变更确认队列只存 localStorage 键
  //   `gsm1921-member-confirmations`（清缓存 = 旧版 transferOut 存量请求死锁）；`milestones` 只读静态文件。
  //   现按**语义端点域**模板（同 `agenda_votes`）落服务端表：`server/db.js::SEMANTIC_TABLES` 建表，
  //   前端 `init()` 逐域拉取填充 mockDB 缓存（与 agendaVotes 同一取法）、写口改经本组端点 ⇒ 服务器为权威。
  // 纪律（三条）：① **故意不进快照 payload**——这三域的写口是本组语义端点，若走快照会被 800ms 防抖窗口里的
  //   陈旧缓存覆盖（与 agendaVotes 同理）；② 写门照既有 requireXxx 中间件，角色集一律取 constants.js 单一源；
  //   ③ 表在 `SEMANTIC_TABLES`（独立于 `RESOURCE_TABLES`）⇒ 无通用 CRUD、不参与快照事务。
  // ── 三委数据交接（T-304 C2 §E.2）──
  // 类型元数据单一源 = `docs/src/services/governance/handoff.js::HANDOFF_TYPES`（from/to 由类型派生，**不采信客户端自述**）。
  router.get('/handoffs', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'handoffs');
    if (req.query.to) rows = rows.filter((h) => h.to === req.query.to);
    if (req.query.status) rows = rows.filter((h) => h.status === req.query.status);
    res.json(rows);
  });
  router.post('/handoffs', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const meta = HANDOFF_TYPES_SRC[body.type];
    if (!meta) return res.status(400).json({ error: '未知交接类型' });
    if (req.actor.role !== meta.from) return res.status(403).json({ error: '无权限：本类数据交接须由发起方角色发起' });
    const id = body.id ? String(body.id) : `ho-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM handoffs WHERE id = ?').get(id)) return res.status(409).json({ error: '该交接 id 已存在' });
    // 2026-09-29 批次 295（支书裁「**需要自动交接的 都要实现自动交接才对！不需要额外费口舌**」）：
    //   **数据交接类**（考勤统计 / 考察记录提交，见 `AUTO_CONFIRM_TYPES`）**发起即落定**——
    //   与前端 mock 形态同源（同一份 `AUTO_CONFIRM_TYPES`，不得各写一份）；
    //   留痕仍在（`confirmedAt` ＝ 发起时刻、`confirmedBy: 'system'`）。
    //   `material-shortage`（补课需求回执）是**待办**（要纪检去补课、不是收下存档）⇒ 仍 `pending`。
    const auto = AUTO_CONFIRM_TYPES.includes(body.type);
    const now = new Date().toISOString();
    const row = {
      id,
      type: body.type,
      from: meta.from,
      to: meta.to,
      refType: String(body.refType || ''),
      refLabel: String(body.refLabel || ''),
      refId: String(body.refId || ''),
      note: typeof body.note === 'string' ? body.note : '',
      status: auto ? 'done' : 'pending',
      createdAt: body.createdAt || now,
      confirmedAt: auto ? now : null,
      confirmedBy: auto ? 'system' : null,
    };
    writeRow(db, 'handoffs', row);
    res.status(201).json(row);
  });
  // 接收方确认（销项状态落库）：仅该行的 `to` 角色可确认；非 pending ⇒ 幂等原样返回
  router.post('/handoffs/:id/confirm', requireAuth(db), (req, res) => {
    const row = getRow(db, 'handoffs', req.params.id);
    if (!row) return res.status(404).json({ error: '交接记录不存在' });
    if (row.to !== req.actor.role) return res.status(403).json({ error: '无权限：仅接收方可确认该交接' });
    if (row.status !== 'pending') return res.json(row);
    const next = { ...row, status: 'done', confirmedAt: new Date().toISOString(), confirmedBy: req.actor.role };
    writeRow(db, 'handoffs', next);
    res.json(next);
  });
  // ── 名册成员变更确认请求队列（附录⑩ S4）──
  // 发起＝组织委员（与 services/member/member-confirmation.js::submitMemberChange 同口径：阶段/在册滞留下方写权）；
  // 决策＝支书/副支书（副书同权，单一源 constants.js::SECRETARY_AND_DEPUTY_ROLES，与本文件既有集合同源）。
  router.get('/member-confirmations', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'member_confirmations');
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    res.json(rows);
  });
  router.post('/member-confirmations', requireRole(db, ORG_COMMISSIONER_ROLE_SET), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const { id: rawId, personId, kind, action, to } = body;
    if (!personId || !action || !to) return res.status(400).json({ error: '缺少必要字段：personId/action/to' });
    const id = rawId ? String(rawId) : `mc-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM member_confirmations WHERE id = ?').get(id)) return res.status(409).json({ error: '该请求 id 已存在' });
    const row = {
      ...body,
      id,
      kind: kind || 'change',
      personId,
      action,
      to,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      rejectNote: '',
    };
    writeRow(db, 'member_confirmations', row);
    res.status(201).json(row);
  });
  router.post('/member-confirmations/:id/decide', requireRole(db, SECRETARY_AND_DEPUTY_ROLE_SET), (req, res) => {
    const row = getRow(db, 'member_confirmations', req.params.id);
    if (!row) return res.status(404).json({ error: '待确认请求不存在' });
    const { decision, note } = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    if (decision !== 'approved' && decision !== 'rejected') return res.status(400).json({ error: 'decision 须为 approved 或 rejected' });
    if (row.status !== 'pending') return res.status(400).json({ error: `当前状态 ${row.status} 不可再决策` });
    const at = new Date().toISOString();
    const next = decision === 'rejected'
      ? { ...row, status: 'rejected', decidedBy: req.actor.id, decidedAt: at, rejectNote: (typeof note === 'string' && note.trim()) ? note.trim() : '支书未确认生效，请求已退回' }
      : { ...row, status: 'approved', decidedBy: req.actor.id, decidedAt: at };
    writeRow(db, 'member_confirmations', next);
    res.json(next);
  });
  // ── 批次里程碑（只读；内容单一源 = docs/data/milestones.json，由 seed.js 播种）──
  router.get('/milestones', requireAuth(db), (req, res) => res.json(listTable(db, 'milestones')));
}

