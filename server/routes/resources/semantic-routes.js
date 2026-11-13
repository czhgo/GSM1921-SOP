// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/semantic-routes.js —— **语义端点**（三委交接 / 成员变更确认 / 里程碑 / 申诉 / 未读标记 / 授权审计）
//  SEMANTIC_TABLES 各表独立于 RESOURCE_TABLES ⇒ 不进快照写穿；由 index.js 装配时调用。
// ════════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole } from '../auth.js';
import { HANDOFF_TYPES as HANDOFF_TYPES_SRC, AUTO_CONFIRM_TYPES } from '../../../docs/src/services/governance/handoff.js';
import { BRANCH_COMMISSION_ROLES, BRANCH_COMMISSIONER_ASSIGNABLE_ROLES, BRANCH_COMMISSIONER_FALLBACK_ROLE, branchCommissionerWriteDeny, PARTY_GROUP_LEADER_ROLES, SECRETARY_AND_DEPUTY_ROLES, DEFAULT_BRANCH_ID } from '../../../docs/src/core/domain/constants.js';
import { listTable, getRow, writeRow } from './store.js';
import { ORG_COMMISSIONER_ROLE_SET, PARTY_STAFF_ROLE, SECRETARY_AND_DEPUTY_ROLE_SET } from './gates.js';
// R-26③（2026-10-05 批次 388）：日期口径统一到**本地**（服务端单一源 `services/reporting.js`）
import { today as todayLocal } from '../../services/reporting.js';
import { activityWorkgroupUpdate, canManageWorkgroup, createActivityWorkgroup, hasWorkgroupPermission, registerWorkgroupRoutes } from './workgroup-routes.js';
import { actorBranchId, branchSelectionError, selectedBranchRequiredError, branchForNewResource, recordBranchWriteDeny, resourceRowsForActor } from './branch-scope.js';
// 2026-11-02 批次 527（数据契约 Wave 2）：成员变更统一形状的**读时别名**（不双写）
import { aliasMemberChangeRow } from '../../data/domain-contract.mjs';

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
  registerWorkgroupRoutes(router, db);
  const APPEAL_STATUSES = ['pending', 'returned', 'closed'];
  const APPEAL_PATCH_KEYS = ['status', 'note'];
  // 申诉处置位＝支委层（纪检/支书/组织/宣传）+ 党小组组长/副组长（「交组织方重新确认」的重确认位）——
  //   角色集由 constants.js::BRANCH_COMMISSION_ROLES / PARTY_GROUP_LEADER_ROLES 单一源派生，勿手写角色字符串
  const APPEAL_DISPOSITION_ROLE_SET = new Set([...BRANCH_COMMISSION_ROLES, ...PARTY_GROUP_LEADER_ROLES]);
  const readScoped = (req, table, name = table) => resourceRowsForActor(db, name, listTable(db, table), req.actor, req.query.branchId);
  // 申诉读（可按支部 / 状态过滤）
  const readAppeals = (req, table) => {
    let rows = readScoped(req, table);
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
      branchId: req.actor.branchId || DEFAULT_BRANCH_ID,
      personId,
      activityId,
      note: typeof body.note === 'string' ? body.note.trim() : '',
      status: 'pending',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    const scopeDeny = recordBranchWriteDeny(db, table, row, req.actor);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    writeRow(db, table, row);
    res.status(201).json(row);
  };
  // 申诉处置（纪检核实后关闭 / 打回；组织方重新确认后关闭）——仅 pending 可处置、终态幂等拒绝
  const disposeAppeal = (req, res, table) => {
    const row = getRow(db, table, req.params.id);
    if (!row) return res.status(404).json({ error: '申诉不存在' });
    if (recordBranchWriteDeny(db, table, row, req.actor, { requireBranch: false })) return res.status(403).json({ error: '无权限：不能处置其他支部申诉' });
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
  router.get('/attendance-appeals', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    return res.json(readAppeals(req, 'attendance_appeals'));
  });
  router.post('/attendance-appeals', requireAuth(db), (req, res) => submitAppeal(req, res, 'attendance_appeals', 'appeal'));
  router.patch('/attendance-appeals/:id', requireRole(db, APPEAL_DISPOSITION_ROLE_SET), (req, res) => disposeAppeal(req, res, 'attendance_appeals'));
  // ── 考察申诉队列（SOP-B-10；前端 services/activity/inspection.js）──
  router.get('/inspection-appeals', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    return res.json(readAppeals(req, 'inspection_appeals'));
  });
  router.post('/inspection-appeals', requireAuth(db), (req, res) => submitAppeal(req, res, 'inspection_appeals', 'inspAppeal'));
  router.patch('/inspection-appeals/:id', requireRole(db, APPEAL_DISPOSITION_ROLE_SET), (req, res) => disposeAppeal(req, res, 'inspection_appeals'));
  // ── 意见反馈「逐人未读标记」（前端 services/governance/issues.js::IssueNotify）──
  // 行＝{ id: `${assigneeId}:${issueId}`, assigneeId, issueId, unread:true, at }；销项＝unread:false（保留行便于审计）
  // ⚠ 写门＝requireAuth + `issueUnreadWriteDeny`（2026-11-03 Task 4 收口）：标记是「指派 / 答复」写链的副产品——
  //   **由派发位**替被指派人落未读（见 docs/src/services/governance/issues.js::assignIssue / requestReport）；
  //   本人可清自己的已读；事项当事人可写 `secretary-review`。普通成员不再能替他人写/清未读。
  const issueUnreadId = (assigneeId, issueId) => `${assigneeId}:${issueId}`;
  const UNREAD_WRITE_KEYS = ['assigneeId', 'issueId', 'unread'];
  /**
   * 未读标记写门（2026-11-03 Task 4）：先查清前端真实语义——**不是**纯 self-service：
   *   · `IssueNotify.markRead(本人 personId)`：本人清自己的已读；
   *   · `assignIssue` / `requestReport`：**派发位**（支委层、党小组组长）替被指派人落未读；
   *   · `markSecretaryReviewPending`：事项当事人（汇报人/被指派人）写角色保留键 `secretary-review`。
   * 因此按「本人 ∪ 派发位角色 ∪ 事项当事人」收口；普通成员不再能替他人写/清未读。
   * 注：`requestReport` 的 issue 只在本地新建（未同步服务端），故不能强依赖 issues 行存在；
   *     仅当服务端能读到该事项时，额外校验 `assignee` 与标记对象一致（防伪造指派）。
   * @returns {string|null} 403 文案；放行 → null
   */
  const issueUnreadWriteDeny = (actor, assigneeId, issueId, unread) => {
    if (!actor || !actor.id) return '未登录';
    const self = String(actor.id);
    if (String(assigneeId) === self) return null; // 本人标记本人（已读/未读）
    const issue = getRow(db, 'issues', issueId);
    if (issue) {
      const issueBranch = issue.branchId || DEFAULT_BRANCH_ID;
      const actorBranch = actorBranchId(actor);
      if (actorBranch && issueBranch !== actorBranch) return '无权限：不能标记其他支部事项';
    }
    // 角色保留键：只有事项提交人 / 被指派人可把「待终审」推给支书；
    // 但「清掉支书自己的待办角标」是支书 / 副支书的读后动作，允许其写 `unread:false`。
    if (assigneeId === 'secretary-review') {
      if (unread === false && SECRETARY_AND_DEPUTY_ROLE_SET.has(actor.role)) return null;
      if (!issue) return null; // 历史实现允许（汇报链的 issue 可能尚未同步），保持兼容
      return (String(issue.submittedBy || '') === self || String(issue.assignee || '') === self)
        ? null
        : '无权限：仅事项提交人或被指派人可标记待终审';
    }
    // 派发位：支委层 / 党小组组长 / 党委
    // L-09（2026-11-08 波次 B）：派发位写未读时必须与事项行的 `assignee` 一致——否则 403，
    //   防「给同支部任意成员写未读」。事项未同步（无 issue 行）时保持原兼容口径。
    const dispatchRole = BRANCH_COMMISSION_ROLES.includes(actor.role)
      || PARTY_GROUP_LEADER_ROLES.includes(actor.role)
      || actor.role === 'party-staff';
    if (!dispatchRole) return '无权限：只能标记本人或本人有权派发事项的未读';
    if (issue && String(issue.assignee || '') !== String(assigneeId)) {
      return '无权限：未读标记对象须为事项当前被指派人';
    }
    return null;
  };
  router.get('/issue-unread', requireAuth(db), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    let rows = readScoped(req, 'issue_unread', 'issue_unread');
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
    // 角色级未读（2026-10-21 批次 498 · 修 F-17）：「支书待终审/待答复」用保留键 `secretary-review`，
    // 它不对应某个 users 行。原实现要求 users 表存在该 id ⇒ 400，前端每次提交汇报都报「未保存成功」。
    // 现按「角色保留键」处理：支部归属取写入人（汇报人）所属支部；读口仍按支部与 assigneeId 过滤。
    const ROLE_UNREAD_KEYS = new Set(['secretary-review']);
    const assignee = getRow(db, 'users', assigneeId);
    const isRoleKey = ROLE_UNREAD_KEYS.has(assigneeId);
    if (!assignee && !isRoleKey) return res.status(400).json({ error: '未读标记对象不存在' });
    const rowBranchId = assignee ? (assignee.branchId || DEFAULT_BRANCH_ID) : (req.actor.branchId || null);
    if (!rowBranchId) return res.status(403).json({ error: '无权限：请先选择支部后再操作' });
    // Task 4：先判「谁能写这条未读」，再落库（支部归属另由 recordBranchWriteDeny 复核）
    const unreadDeny = issueUnreadWriteDeny(req.actor, assigneeId, issueId, body.unread);
    if (unreadDeny) return res.status(403).json({ error: unreadDeny });
    const prev = getRow(db, 'issue_unread', id) || {};
    const row = { ...prev, id, assigneeId, issueId, branchId: rowBranchId, unread: body.unread !== false, at: new Date().toISOString() };
    const scopeDeny = recordBranchWriteDeny(db, 'issue_unread', row, req.actor);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    writeRow(db, 'issue_unread', row);
    res.json(row);
  });
  // ── 授权审计留痕（T-190；前端 services/core/auth.js）──
  // 只增不改的治理档案：身份和时间由服务端生成；每条留痕必须能对应授权者实际完成的同支部授权变更。
  const AUTH_AUDIT_KEYS = ['id', 'targetPersonId', 'role', 'scopeRef', 'authorizedBy', 'authorizedAt', 'action', 'branchId'];
  router.get('/auth-audit', requireRole(db, new Set([...BRANCH_COMMISSION_ROLES, 'party-staff'])), (req, res) => {
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    return res.json(readScoped(req, 'auth_audit', 'auth_audit'));
  });
  router.post('/auth-audit', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !AUTH_AUDIT_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${AUTH_AUDIT_KEYS.join(' / ')}）` });
    const targetPersonId = body.targetPersonId ? String(body.targetPersonId) : '';
    const role = body.role ? String(body.role) : '';
    const scopeRef = body.scopeRef !== undefined && body.scopeRef !== null ? String(body.scopeRef) : '';
    const action = body.action;
    if (!targetPersonId || !role || !['grant', 'revoke'].includes(action)) {
      return res.status(400).json({ error: '授权留痕须提供 targetPersonId、role 和 grant/revoke action' });
    }
    const targetUser = getRow(db, 'users', targetPersonId);
    if (!targetUser) return res.status(400).json({ error: '授权对象不存在' });
    const targetBranchId = targetUser.branchId || DEFAULT_BRANCH_ID;
    const partyStaffSelection = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (partyStaffSelection) return res.status(400).json({ error: partyStaffSelection });
    if (req.actor.role === 'party-staff' && req.query.branchId !== targetBranchId) {
      return res.status(403).json({ error: '无权限：授权留痕对象不属于当前选中的支部' });
    }
    if (body.branchId && String(body.branchId) !== targetBranchId) {
      return res.status(403).json({ error: '无权限：提交的支部与授权对象归属不一致' });
    }
    const id = body.id ? String(body.id) : `auth-${randomUUID().slice(0, 8)}`;
    const existing = getRow(db, 'auth_audit', id);
    if (existing) {
      const sameEvent = existing.targetPersonId === targetPersonId && existing.role === role
        && (existing.scopeRef || '') === scopeRef && existing.action === action && existing.authorizedBy === req.actor.id;
      return sameEvent ? res.json(existing) : res.status(409).json({ error: '该授权留痕 id 已用于其他事件' });
    }

    let mutationProven = false;
    if (scopeRef && ['organizer', 'deep'].includes(role)) {
      const workgroup = listTable(db, 'workgroups').find((row) => String(row.sourceId || '') === scopeRef);
      if (!workgroup || workgroup.branchId !== targetBranchId) return res.status(403).json({ error: '无权限：工作组不存在或不属于授权对象所在支部' });
      if (actorBranchId(req.actor) !== workgroup.branchId) return res.status(403).json({ error: '无权限：只能记录本支部工作组授权' });
      const member = listTable(db, 'workgroup_members').find((row) => row.workgroupId === workgroup.id && row.personId === targetPersonId);
      const actorCanManage = canManageWorkgroup(db, req.actor, workgroup)
        || hasWorkgroupPermission(db, workgroup.id, req.actor.id, 'workgroup.members.manage');
      const latest = listTable(db, 'auth_audit')
        .filter((row) => row.targetPersonId === targetPersonId && row.role === role && row.scopeRef === scopeRef)
        .at(-1);
      if (!member || (action === 'grant' && latest?.action !== 'revoke' && latest)
        || (action === 'revoke' && latest?.action !== 'grant')) {
        return res.status(403).json({ error: '无权限：工作组成员变更与授权留痕不匹配' });
      }
      mutationProven = action === 'grant'
        ? member.status === 'active' && member.role === role && (member.updatedBy === req.actor.id || member.createdBy === req.actor.id)
        : (member.status === 'removed' && member.removedBy === req.actor.id)
          || (member.status === 'active' && member.role !== role && member.updatedBy === req.actor.id);
      if (!mutationProven || (!actorCanManage && !(action === 'revoke' && member.removedBy === req.actor.id))) {
        return res.status(403).json({ error: '无权限：当前操作者没有完成这项工作组成员变更' });
      }
    } else if (scopeRef && ['leader', 'deputy-leader'].includes(role)) {
      const group = listTable(db, 'party_groups').find((row) => String(row.id || '') === scopeRef || row.name === scopeRef);
      if (!group || group.branchId !== targetBranchId || targetUser.partyGroup !== group.name) {
        return res.status(403).json({ error: '无权限：党小组长授权对象与党小组归属不一致' });
      }
      if (!SECRETARY_AND_DEPUTY_ROLES.includes(req.actor.role) || actorBranchId(req.actor) !== group.branchId) {
        return res.status(403).json({ error: '无权限：党小组长身份只能由本支部支书或副书记配置' });
      }
      const latest = listTable(db, 'auth_audit')
        .filter((row) => row.targetPersonId === targetPersonId && row.role === role && row.scopeRef === scopeRef)
        .at(-1);
      mutationProven = action === 'grant' ? latest?.action !== 'grant' : latest?.action === 'grant';
      if (!mutationProven) return res.status(403).json({ error: '无权限：党小组长授权状态与留痕动作不匹配' });
    } else if (!scopeRef && BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(role)) {
      const branch = getRow(db, 'branches', targetBranchId);
      if (!branch) return res.status(403).json({ error: '授权对象所属支部不存在' });
      const expectedCurrentRole = action === 'grant' ? role : null;
      if ((action === 'grant' && targetUser.role !== expectedCurrentRole)
        || (action === 'revoke' && targetUser.role === role)) {
        return res.status(403).json({ error: '无权限：支委身份变更尚未发生或与留痕动作不一致' });
      }
      const deny = branchCommissionerWriteDeny({
        actorRole: req.actor.role, actorId: req.actor.id, actorBranchId: actorBranchId(req.actor) || req.query.branchId,
        targetId: targetPersonId, targetRole: targetUser.role, targetBranchId,
        secretaryId: branch.secretaryId,
        deputySecretaryId: branch.deputySecretaryId || listTable(db, 'users').find((user) => user.role === 'deputy-secretary' && (user.branchId || DEFAULT_BRANCH_ID) === targetBranchId)?.id,
        role: action === 'grant' ? role : BRANCH_COMMISSIONER_FALLBACK_ROLE,
      });
      if (deny) return res.status(403).json({ error: deny });
      mutationProven = true;
    } else {
      return res.status(403).json({ error: '无权限：该授权范围或角色不能通过通用审计接口写入' });
    }
    if (!mutationProven) return res.status(403).json({ error: '无权限：未检测到已授权的对应变更' });
    const row = {
      id, branchId: targetBranchId, targetPersonId, role, scopeRef,
      authorizedBy: req.actor.id, authorizedAt: todayLocal(), action,
    };
    const scopeDeny = recordBranchWriteDeny(db, 'auth_audit', row, req.actor);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    writeRow(db, 'auth_audit', row);
    res.status(201).json(row);
  });

  // ── 支书任命（B-499-9）：branches / 双方 users / 任期记录同一事务 ──
  // 与前端 services/branch/appointment.js 一次语义调用对应；appointedBy/from/id 由服务端生成，
  // expectedSecretaryId 为可选乐观锁（与库中现值不一致 ⇒ 409）。重复提交同一 appointmentId ⇒ 幂等。
  router.post('/branches/:id/appointments', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const branchId = String(req.params.id);
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const result = db.transaction(() => {
      const branch = getRow(db, 'branches', branchId);
      if (!branch) return { status: 404, body: { error: '支部不存在' } };

      const personId = body.secretaryId !== undefined ? body.secretaryId : body.personId;
      const nextSecretaryId = personId ? String(personId) : null;
      const requestedId = body.appointmentId ? String(body.appointmentId) : '';
      if (requestedId) {
        const existing = listTable(db, 'appointment_records').find((row) => row.id === requestedId);
        if (existing) {
          if (existing.branchId === branchId && (existing.secretaryId || null) === nextSecretaryId) {
            return {
              status: 200,
              body: { ok: true, branch, appointment: existing, appointmentRecords: [existing], users: [] },
            };
          }
          return { status: 409, body: { error: '该任命 id 已用于其他任命' } };
        }
      }
      if (Object.prototype.hasOwnProperty.call(body, 'expectedSecretaryId')
        && (branch.secretaryId || null) !== (body.expectedSecretaryId || null)) {
        return { status: 409, body: { error: '支部现任支书已被他人变更，请刷新后重试' } };
      }

      let nextSecretary = null;
      if (nextSecretaryId) {
        nextSecretary = getRow(db, 'users', nextSecretaryId);
        if (!nextSecretary) return { status: 400, body: { error: '被任命人不存在' } };
        if (nextSecretary.transferOut === true) return { status: 400, body: { error: '被任命人已转出，不能任命' } };
        if (nextSecretary.role === 'party-staff') return { status: 400, body: { error: '党委账号不能担任支部书记' } };
        if (nextSecretary.branchId === null) return { status: 400, body: { error: '被任命人尚未归属支部，不能任命' } };
      }

      const now = new Date().toISOString();
      const previousSecretaryId = branch.secretaryId || null;
      const changedUsers = [];
      const writeUserRole = (userId, role) => {
        if (!userId || userId === nextSecretaryId && userId === previousSecretaryId) return;
        const user = getRow(db, 'users', userId);
        if (!user || user.role === role) return;
        const next = { ...user, role };
        writeRow(db, 'users', next);
        changedUsers.push(next);
      };

      const nextBranch = { ...branch, secretaryId: nextSecretaryId };
      writeRow(db, 'branches', nextBranch);
      if (previousSecretaryId && previousSecretaryId !== nextSecretaryId) writeUserRole(previousSecretaryId, 'participant');
      if (nextSecretaryId) writeUserRole(nextSecretaryId, 'secretary');

      const touchedRecords = [];
      for (const record of listTable(db, 'appointment_records')) {
        if (record.branchId !== branchId || record.to) continue;
        const closed = { ...record, to: now };
        writeRow(db, 'appointment_records', closed);
        touchedRecords.push(closed);
      }
      let appointment = null;
      if (nextSecretaryId) {
        appointment = {
          id: requestedId || `appt-${randomUUID().slice(0, 8)}`,
          branchId,
          secretaryId: nextSecretaryId,
          appointedBy: req.actor.id,
          note: typeof body.note === 'string' ? body.note.trim() : '',
          from: now,
          to: null,
        };
        writeRow(db, 'appointment_records', appointment);
        touchedRecords.push(appointment);
      }
      const openCount = listTable(db, 'appointment_records')
        .filter((record) => record.branchId === branchId && !record.to).length;
      if (openCount > 1) throw new Error('任命事务校验失败：同一支部存在多条未封口任期记录');

      return {
        status: 200,
        body: { ok: true, branch: nextBranch, appointment, appointmentRecords: touchedRecords, users: changedUsers },
      };
    })();
    res.status(result.status).json(result.body);
  });

  // ── 本支部支委身份配置（B-499-9）：users.role 与 auth_audit 同一事务 ──
  // grant：授予/改派组织、宣传、纪检委员；revoke：回落普通参与者。判据单一源 = branchCommissionerWriteDeny。
  // 审计 authorizedBy/authorizedAt 由服务端生成；仅本支部现任支书/副支书（跨支部靶标 403）。
  router.post('/branches/:id/branch-commissioners', requireRole(db, SECRETARY_AND_DEPUTY_ROLE_SET), (req, res) => {
    const branchId = String(req.params.id);
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const branch = getRow(db, 'branches', branchId);
    if (!branch) return res.status(404).json({ error: '支部不存在' });
    const targetId = body.personId ? String(body.personId) : '';
    const requestedRole = body.role ? String(body.role) : '';
    if (!targetId) return res.status(400).json({ error: '缺少被配置人（personId）' });
    const target = getRow(db, 'users', targetId);
    if (!target) return res.status(404).json({ error: '成员不存在（users 表中无该 id）' });

    const action = body.action === 'revoke' || requestedRole === BRANCH_COMMISSIONER_FALLBACK_ROLE ? 'revoke' : 'grant';
    const gateRole = action === 'revoke' ? BRANCH_COMMISSIONER_FALLBACK_ROLE : requestedRole;
    const deputy = branch.deputySecretaryId
      ? getRow(db, 'users', String(branch.deputySecretaryId))
      : listTable(db, 'users').find((user) => user.role === 'deputy-secretary' && (user.branchId || DEFAULT_BRANCH_ID) === branchId);
    const deny = branchCommissionerWriteDeny({
      actorRole: req.actor.role,
      actorId: req.actor.id,
      actorBranchId: branchId,
      targetId,
      targetRole: target.role,
      targetBranchId: target.branchId === null ? null : (target.branchId || branchId),
      secretaryId: branch.secretaryId,
      deputySecretaryId: deputy?.id || null,
      role: gateRole,
    });
    if (deny) return res.status(403).json({ error: deny });

    if (action === 'grant' && !BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(requestedRole)) {
      return res.status(400).json({ error: 'role 须为组织 / 宣传 / 纪检委员之一' });
    }
    if (action === 'revoke' && target.role === BRANCH_COMMISSIONER_FALLBACK_ROLE) {
      return res.json({ ok: true, user: target, audits: [] });
    }
    if (action === 'revoke' && !BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(target.role)) {
      return res.status(400).json({ error: '该成员当前没有可撤销的支委身份' });
    }
    const nextRole = action === 'revoke' ? BRANCH_COMMISSIONER_FALLBACK_ROLE : requestedRole;
    if (target.role === nextRole) return res.json({ ok: true, user: target, audits: [] });

    const now = todayLocal();
    const branchOfTarget = target.branchId || branchId;
    const audits = [];
    const result = db.transaction(() => {
      const nextUser = { ...target, role: nextRole };
      writeRow(db, 'users', nextUser);
      if (action === 'grant' && BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(target.role)) {
        const revoke = {
          id: `auth-${randomUUID().slice(0, 8)}`,
          branchId: branchOfTarget,
          targetPersonId: targetId,
          role: target.role,
          scopeRef: null,
          authorizedBy: req.actor.id,
          authorizedAt: now,
          action: 'revoke',
        };
        writeRow(db, 'auth_audit', revoke);
        audits.push(revoke);
      }
      const audit = {
        id: `auth-${randomUUID().slice(0, 8)}`,
        branchId: branchOfTarget,
        targetPersonId: targetId,
        role: nextRole === BRANCH_COMMISSIONER_FALLBACK_ROLE ? target.role : nextRole,
        scopeRef: null,
        authorizedBy: req.actor.id,
        authorizedAt: now,
        action,
      };
      writeRow(db, 'auth_audit', audit);
      audits.push(audit);
      return { user: nextUser, audits };
    })();
    res.json({ ok: true, ...result });
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
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    let rows = readScoped(req, 'handoffs', 'handoffs');
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
      ...(branchForNewResource(db, 'handoffs', body, req.actor) ? { branchId: branchForNewResource(db, 'handoffs', body, req.actor) } : {}),
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
    const scopeDeny = recordBranchWriteDeny(db, 'handoffs', { ...row, ...body }, req.actor);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    writeRow(db, 'handoffs', row);
    res.status(201).json(row);
  });
  // 接收方确认（销项状态落库）：仅该行的 `to` 角色可确认；非 pending ⇒ 幂等原样返回
  router.post('/handoffs/:id/confirm', requireAuth(db), (req, res) => {
    const row = getRow(db, 'handoffs', req.params.id);
    if (!row) return res.status(404).json({ error: '交接记录不存在' });
    if (recordBranchWriteDeny(db, 'handoffs', row, req.actor, { requireBranch: false })) return res.status(403).json({ error: '无权限：不能确认其他支部交接' });
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
    const deny = branchSelectionError(req.actor, req.query.branchId);
    if (deny) return res.status(403).json({ error: deny });
    let rows = readScoped(req, 'member_confirmations', 'member_confirmations').map(aliasMemberChangeRow); // 读时别名：from/to→fromStage/toStage；只写本表
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    res.json(rows);
  });
  router.post('/member-confirmations', requireRole(db, ORG_COMMISSIONER_ROLE_SET), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const { id: rawId, personId, kind, action, to } = body;
    if (!personId || !action || !to) return res.status(400).json({ error: '缺少必要字段：personId/action/to' });
    const person = getRow(db, 'users', personId);
    if (!person) return res.status(400).json({ error: '待确认成员不存在' });
    const id = rawId ? String(rawId) : `mc-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM member_confirmations WHERE id = ?').get(id)) return res.status(409).json({ error: '该请求 id 已存在' });
    const row = {
      ...body,
      id,
      branchId: person.branchId || DEFAULT_BRANCH_ID,
      kind: kind || 'change',
      personId,
      action,
      to,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      rejectNote: '',
    };
    const scopeDeny = recordBranchWriteDeny(db, 'member_confirmations', row, req.actor);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    writeRow(db, 'member_confirmations', row);
    res.status(201).json(row);
  });
  router.post('/member-confirmations/:id/decide', requireRole(db, SECRETARY_AND_DEPUTY_ROLE_SET), (req, res) => {
    const row = getRow(db, 'member_confirmations', req.params.id);
    if (!row) return res.status(404).json({ error: '待确认请求不存在' });
    if (recordBranchWriteDeny(db, 'member_confirmations', row, req.actor, { requireBranch: false })) return res.status(403).json({ error: '无权限：不能决定其他支部的成员请求' });
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

  // ════════════════════════════════════════════════════════════════
  //  党委内容写口（2026-11-08 批次 536 · 党委内容与公开发布 Task 2）
  // ════════════════════════════════════════════════════════════════
  // 由来（spec Task 2）：党委自有活动（`ownerScope='committee'`，归属 id＝`pc-gsm`）此前的唯一
  //   写口是通用 `/activities`，而该口按支部归属解析行（`branchId='pc-gsm'` 解析不到任何支部）
  //   ⇒ 党委无法在服务端建立「可下发的内容原件」。本段补**党委内容写口**：创建 / 编辑 / 取消 /
  //   归档 / 改发布范围 + 发布留痕读取，全部只允许 `party-staff`。
  // 纪律：
  //   ① 落点＝本函数尾部（`registerExtraSemanticRoutes`），不进通用 CRUD、不进快照 payload；
  //   ② 写门一律 `requireRole(db, PARTY_STAFF_ROLE)`（角色集单一源 = `gates.js` / `constants.js`）；
  //   ③ 本段**不做**下发 / 采用 / 同步 / 强调通知（Task 3/4），也**不级联**支部副本；
  //   ④ 发布留痕只经 `publication-audit.js::writePublicationAudit` 一条出口。
  // ⚠ 本段置尾：上文行号是 `README-server.md` 的取证靶点，插在中间会整体漂移。
  // 创建时可从 body 采纳的活动字段（其余一律由服务端决定或忽略；不写工作组 / voteConfig / 参与名单）
  const COMMITTEE_ACTIVITY_CREATE_FIELDS = [
    'title', 'type', 'description', 'agenda', 'carriers', 'summary', 'content',
    'date', 'location', 'direction', 'visibility', 'organizingScope', 'recruitmentScope',
    'hostGroupId', 'hostGroup', 'crossGroupCoordinatorId',
    'signupEnabled', 'signupClosed', 'requireMakeup', 'isOutdoor', 'deepWorkMode',
    'scenarioId', 'domain', 'status',
    'targetBranchIds', 'publishScope', 'publishExpiresAt', 'publicSummary',
  ];
  // 编辑白名单＝内容字段（`ACTIVITY_COPY_LOCKED_FIELDS` 单一源）+ 排期 / 状态 / 发布面
  const COMMITTEE_ACTIVITY_PATCH_FIELDS = new Set([
    ...ACTIVITY_COPY_LOCKED_FIELDS,
    'targetBranchIds', 'date', 'location', 'status', 'publishScope', 'publishExpiresAt',
  ]);
  // 归属 / 来源 / 版本由服务端维护，任何直改一律拒绝（防洗归属、防绕过版本递增）
  const COMMITTEE_ACTIVITY_IMMUTABLE_FIELDS = ['ownerScope', 'branchId', 'sourceActivityId', 'contentVersion'];

  /** `targetBranchIds` 归一：`['all']` 或已存在支部 id 数组（去重）；空 / 未知 / 含党委归属 id ⇒ 错误 */
  const normalizeTargetBranchIds = (value) => {
    if (value === undefined || value === null) return { ids: null };
    if (!Array.isArray(value) || value.length === 0) {
      return { error: "targetBranchIds 须为非空数组（['all'] 或已存在支部 id 数组）" };
    }
    const ids = [];
    for (const raw of value) {
      if (typeof raw !== 'string' || !raw.trim()) return { error: 'targetBranchIds 的每一项须为非空字符串' };
      const id = raw.trim();
      if (!ids.includes(id)) ids.push(id);
    }
    if (ids.length === 1 && ids[0] === 'all') return { ids };
    if (ids.includes('all')) return { error: "targetBranchIds 中 'all' 只能单独使用" };
    if (ids.includes(COMMITTEE_OWNER_ID)) {
      return { error: `targetBranchIds 不得包含党委归属 id（${COMMITTEE_OWNER_ID}）` };
    }
    const unknown = ids.filter((id) => !db.prepare('SELECT id FROM branches WHERE id = ?').get(id));
    if (unknown.length) return { error: `targetBranchIds 含不存在的支部：${unknown.join('、')}` };
    return { ids };
  };

  /** 发布面取值快照（留痕 oldValue / newValue 用；缺省范围按 `branch` 归一） */
  const committeePublicationSnapshot = (row) => ({
    publishScope: (row && row.publishScope) || 'branch',
    publishExpiresAt: row && row.publishExpiresAt !== undefined ? row.publishExpiresAt : null,
    publicSummary: row && row.publicSummary !== undefined ? row.publicSummary : null,
  });

  /** 发布面校验：范围枚举 + 公开可见的有效期 / 摘要要求（返回可懂原因；通过 → null） */
  const committeePublicationError = (row) => {
    const scope = (row && row.publishScope) || 'branch';
    if (!PUBLISH_SCOPES.includes(scope)) {
      return `publishScope 须为 ${PUBLISH_SCOPES.join(' / ')} 之一`;
    }
    if (scope !== 'public') return null;
    const expiresAt = row.publishExpiresAt;
    const ts = expiresAt ? Date.parse(expiresAt) : NaN;
    if (!Number.isFinite(ts) || ts <= Date.now()) {
      return 'public 可见须设置未来的 publishExpiresAt（ISO 时间）';
    }
    const summary = typeof row.publicSummary === 'string' ? row.publicSummary.trim() : '';
    if (!summary) return 'public 可见须填写非空 publicSummary';
    if (summary.length > 500) return 'publicSummary 不得超过 500 字';
    return null;
  };

  /** 发布面变化：无变化 → null；否则给出留痕动作与旧值 / 新值 */
  const committeePublicationChange = (prev, next) => {
    const before = committeePublicationSnapshot(prev);
    const after = committeePublicationSnapshot(next);
    if (JSON.stringify(before) === JSON.stringify(after)) return null;
    let action = 'update-scope';
    if (before.publishScope !== 'public' && after.publishScope === 'public') action = 'publish';
    else if (before.publishScope === 'public' && after.publishScope !== 'public') action = 'unpublish';
    return { action, oldValue: before, newValue: after };
  };

  /** 锁定字段是否真的变了（`undefined` 与 `null` 等价；对象 / 数组按 JSON 比较） */
  const committeeLockedFieldChanged = (prev, next, key) => JSON.stringify(
    prev && prev[key] !== undefined ? prev[key] : null,
  ) !== JSON.stringify(next && next[key] !== undefined ? next[key] : null);

  /** 读取一条党委活动行；不存在 → null，非党委归属 → `false`（区分 404 与 403） */
  const readCommitteeActivity = (id) => {
    const row = getRow(db, 'activities', id);
    if (!row) return null;
    return row.ownerScope === 'committee' ? row : false;
  };

  // ── 党委活动列表（全部党委自有活动；可按状态 / 发布范围过滤；日期倒序）──
  router.get('/committee/activities', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    let rows = listTable(db, 'activities').filter((row) => row && row.ownerScope === 'committee');
    if (req.query.status) rows = rows.filter((row) => row.status === req.query.status);
    if (req.query.publishScope) {
      rows = rows.filter((row) => ((row.publishScope || 'branch') === req.query.publishScope));
    }
    rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    res.json(rows);
  });

  // ── 创建党委活动（归属 / 版本 / 创建人 / 时间由服务端强制；不建工作组、不写 voteConfig / 参与名单）──
  router.post('/committee/activities', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const id = body.id ? String(body.id) : `act-${randomUUID().slice(0, 8)}`;
    if (getRow(db, 'activities', id)) return res.status(409).json({ error: '该活动 id 已存在' });
    const row = { id };
    for (const key of COMMITTEE_ACTIVITY_CREATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) row[key] = body[key];
    }
    row.ownerScope = 'committee';
    row.branchId = COMMITTEE_OWNER_ID;
    row.contentVersion = 1;
    row.createdBy = req.actor.id;
    row.createdAt = new Date().toISOString();
    row.visibility = row.visibility || 'branch';
    row.organizingScope = row.organizingScope || 'branch';
    row.status = row.status || 'published';
    row.publishScope = row.publishScope || 'branch';

    const targetCheck = normalizeTargetBranchIds(row.targetBranchIds);
    if (targetCheck.error) return res.status(422).json({ error: targetCheck.error });
    if (row.status !== 'draft' && !targetCheck.ids) {
      return res.status(422).json({ error: "status 非 draft 时必须指定 targetBranchIds（['all'] 或已存在支部 id 数组）" });
    }
    if (targetCheck.ids) row.targetBranchIds = targetCheck.ids;

    const publishError = committeePublicationError(row);
    if (publishError) return res.status(422).json({ error: publishError });

    writeRow(db, 'activities', row);
    writePublicationAudit(db, {
      resourceType: 'activity',
      resourceId: row.id,
      action: 'publish',
      actor: req.actor,
      oldValue: null,
      newValue: committeePublicationSnapshot(row),
    });
    res.status(201).json(row);
  });

  // ── 编辑党委活动（白名单字段；锁定字段变化 ⇒ contentVersion+1；公开面变化 ⇒ 写留痕）──
  router.patch('/committee/activities/:id', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const prev = readCommitteeActivity(req.params.id);
    if (prev === null) return res.status(404).json({ error: '活动不存在' });
    if (prev === false) return res.status(403).json({ error: '无权限：只能编辑党委活动' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const immutable = COMMITTEE_ACTIVITY_IMMUTABLE_FIELDS
      .find((key) => Object.prototype.hasOwnProperty.call(body, key));
    if (immutable) return res.status(403).json({ error: `无权限：${immutable} 不可通过本端点修改` });
    const unknown = Object.keys(body).find((key) => !COMMITTEE_ACTIVITY_PATCH_FIELDS.has(key));
    if (unknown) return res.status(400).json({ error: `字段 ${unknown} 不在本端点白名单` });

    const next = { ...prev };
    for (const key of Object.keys(body)) next[key] = body[key];

    const targetCheck = normalizeTargetBranchIds(next.targetBranchIds);
    if (targetCheck.error) return res.status(422).json({ error: targetCheck.error });
    if (next.status !== 'draft' && !targetCheck.ids) {
      return res.status(422).json({ error: "status 非 draft 时必须指定 targetBranchIds（['all'] 或已存在支部 id 数组）" });
    }
    if (targetCheck.ids) next.targetBranchIds = targetCheck.ids;

    const publishError = committeePublicationError(next);
    if (publishError) return res.status(422).json({ error: publishError });

    if (ACTIVITY_COPY_LOCKED_FIELDS.some((key) => committeeLockedFieldChanged(prev, next, key))) {
      next.contentVersion = (Number(prev.contentVersion) || 1) + 1;
    }

    writeRow(db, 'activities', next);
    const change = committeePublicationChange(prev, next);
    if (change) {
      writePublicationAudit(db, {
        resourceType: 'activity',
        resourceId: next.id,
        action: change.action,
        actor: req.actor,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    res.json(next);
  });

  // ── 取消党委活动（只置本行状态；不级联支部副本）──
  router.post('/committee/activities/:id/cancel', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const row = readCommitteeActivity(req.params.id);
    if (row === null) return res.status(404).json({ error: '活动不存在' });
    if (row === false) return res.status(403).json({ error: '无权限：只能取消党委活动' });
    if (row.status === 'cancelled') return res.json(row);
    const next = { ...row, status: 'cancelled', cancelledAt: new Date().toISOString() };
    writeRow(db, 'activities', next);
    res.json(next);
  });

  // ── 归档党委活动（只置本行标记；不级联支部副本）──
  router.post('/committee/activities/:id/archive', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const row = readCommitteeActivity(req.params.id);
    if (row === null) return res.status(404).json({ error: '活动不存在' });
    if (row === false) return res.status(403).json({ error: '无权限：只能归档党委活动' });
    if (row.archived === true) return res.json(row);
    const next = { ...row, archived: true, archivedAt: new Date().toISOString() };
    writeRow(db, 'activities', next);
    res.json(next);
  });

  // ── 改发布范围（发布 / 撤回 / 改期；公开可见须未来有效期与非空摘要；每次变化写留痕）──
  router.patch('/committee/activities/:id/publication', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const prev = readCommitteeActivity(req.params.id);
    if (prev === null) return res.status(404).json({ error: '活动不存在' });
    if (prev === false) return res.status(403).json({ error: '无权限：只能调整党委活动的发布范围' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const allowed = ['publishScope', 'publishExpiresAt', 'publicSummary'];
    const unknown = Object.keys(body).find((key) => !allowed.includes(key));
    if (unknown) return res.status(400).json({ error: `字段 ${unknown} 不在本端点白名单` });
    if (!body.publishScope) return res.status(400).json({ error: '缺少必要字段：publishScope' });

    const next = { ...prev, publishScope: body.publishScope };
    if (Object.prototype.hasOwnProperty.call(body, 'publishExpiresAt')) next.publishExpiresAt = body.publishExpiresAt;
    if (Object.prototype.hasOwnProperty.call(body, 'publicSummary')) next.publicSummary = body.publicSummary;

    const publishError = committeePublicationError(next);
    if (publishError) return res.status(422).json({ error: publishError });

    writeRow(db, 'activities', next);
    const change = committeePublicationChange(prev, next);
    if (change) {
      writePublicationAudit(db, {
        resourceType: 'activity',
        resourceId: next.id,
        action: change.action,
        actor: req.actor,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    res.json(next);
  });

  // ── 发布留痕读取（党委；可按资源 / 动作过滤；时间倒序；`limit` / `offset` 分页）──
  // 2026-11-08 波次 B：返回 `{ rows, total, limit, offset }`（total 为过滤后总数）；
  //   默认 limit 50，取值域 1..100；offset 缺省 0，负数按 0。
  router.get('/committee/publication-audits', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    let rows = listTable(db, 'publication_audits');
    for (const key of ['resourceType', 'resourceId', 'action']) {
      if (req.query[key]) rows = rows.filter((row) => row[key] === req.query[key]);
    }
    rows.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const parsedLimit = Number.parseInt(String(req.query.limit === undefined ? '' : req.query.limit), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 50;
    const parsedOffset = Number.parseInt(String(req.query.offset === undefined ? '' : req.query.offset), 10);
    const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;
    res.json({ rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
  });

  // ════════════════════════════════════════════════════════════════
  //  党委下发 / 支部幂等采用 / 副本内容锁定 / 手动同步（2026-11-08 批次 536 · Task 3）
  // ════════════════════════════════════════════════════════════════
  // 由来（spec Task 3）：党委活动（`ownerScope='committee'`）需要「下发 → 支部幂等采用 → 副本内容锁定 →
  //   手动同步」四件能力。通知的强调 / 已读等展示面属 Task 4，本段**不做**。
  // 纪律：
  //   ① 下发不调用 `/system-notices`（那条链按 kind 复算授权与受众策略）：直接写 `notices` 并显式落 `audience`；
  //   ② 采用幂等靠 v13 部分唯一索引 `idx_activities_source_branch`（同一支部对同一原件最多一条副本）；
  //   ③ 副本内容字段只由原件维护（`ACTIVITY_COPY_LOCKED_FIELDS` 单一源），支部只改执行字段；
  //   ④ 不级联：党委取消 / 归档只改原件，副本状态保持不变（内容变化只经手动同步进入副本）。
  // ⚠ 本段置尾：上文行号是 `README-server.md` 的取证靶点，插在中间会整体漂移。
  const COMMITTEE_DISPATCH_KIND = 'committee-activity-dispatch';
  const ADOPTABLE_SOURCE_STATUSES = new Set(['published', 'ongoing']);
  // 采用时复制的内容字段（＝锁定字段单一源）+ 排期默认值
  const ADOPT_COPY_FIELDS = [...ACTIVITY_COPY_LOCKED_FIELDS, 'date', 'location'];

  /** 本支部对某党委原件的副本（`sourceActivityId + branchId` 命中即唯一） */
  const findAdoptedCopy = (sourceId, branchId) => listTable(db, 'activities').find((row) => row
    && String(row.sourceActivityId || '') === String(sourceId)
    && row.branchId === branchId) || null;

  /**
   * 下发目标支部归一：`body.branchIds` 可选；给了必须是活动 `targetBranchIds` 的子集，
   * 缺省用活动 `targetBranchIds`（`['all']` 展开为全部真实支部）。
   * @returns {{ids?:string[], error?:string, status?:number}}
   */
  const resolveDispatchTargets = (source, requested) => {
    const allowed = Array.isArray(source.targetBranchIds) ? source.targetBranchIds.map(String) : [];
    const branchExists = (id) => !!db.prepare('SELECT id FROM branches WHERE id = ?').get(id);
    if (requested !== undefined && requested !== null) {
      if (!Array.isArray(requested) || requested.length === 0) {
        return { error: 'branchIds 须为非空数组（已存在支部 id）', status: 422 };
      }
      const ids = [];
      for (const raw of requested) {
        if (typeof raw !== 'string' || !raw.trim()) return { error: 'branchIds 的每一项须为非空字符串', status: 422 };
        const id = raw.trim();
        if (!ids.includes(id)) ids.push(id);
      }
      if (allowed.length === 0) return { error: '该活动未设置 targetBranchIds，无法下发', status: 422 };
      if (!allowed.includes('all')) {
        const outside = ids.filter((id) => !allowed.includes(id));
        if (outside.length) return { error: `无权限：${outside.join('、')} 不在本活动下发范围`, status: 403 };
      }
      const unknown = ids.filter((id) => !branchExists(id));
      if (unknown.length) return { error: `支部不存在：${unknown.join('、')}`, status: 422 };
      return { ids };
    }
    if (allowed.length === 0) return { error: '该活动未设置 targetBranchIds，无法下发', status: 422 };
    if (allowed.includes('all')) return { ids: listTable(db, 'branches').map((row) => String(row.id)) };
    const unknown = allowed.filter((id) => !branchExists(id));
    if (unknown.length) return { error: `下发目标支部不存在：${unknown.join('、')}`, status: 422 };
    return { ids: allowed };
  };

  // ── 下发：为每个目标支部建一条「党委活动」通知（同版本幂等；版本升级后新增，旧通知保留）──
  router.post('/committee/activities/:id/dispatch', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const source = readCommitteeActivity(req.params.id);
    if (source === null) return res.status(404).json({ error: '活动不存在' });
    if (source === false) return res.status(403).json({ error: '无权限：只能下发党委活动' });
    // 批次 541：下发只收「可执行」原件——与采用（adopt）同口径；草稿 / 已取消 / 已归档不得下发。
    if (source.archived === true || !ADOPTABLE_SOURCE_STATUSES.has(source.status)) {
      return res.status(409).json({ error: `当前状态「${source.status || '未知'}」的党委活动不可下发` });
    }
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const resolved = resolveDispatchTargets(source, body.branchIds);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const version = Number(source.contentVersion) || 1;
    const title = String(source.title || source.id);
    const description = typeof source.description === 'string' ? source.description.trim() : '';
    const createdAt = new Date().toISOString();
    // 同版本幂等：同一「原件 + 目标支部 + systemKind」已有该版本通知 ⇒ 跳过（旧版本通知不算重）
    const dispatchedBranches = new Set(listTable(db, 'notices')
      .filter((row) => row
        && row.sourceType === 'activity'
        && String(row.sourceId) === String(source.id)
        && row.systemKind === COMMITTEE_DISPATCH_KIND
        && Number(row.sourceVersion ?? row.contentVersion) === version)
      .map((row) => String(row.branchId)));
    const created = [];
    let skipped = 0;
    db.transaction(() => {
      for (const branchId of resolved.ids) {
        if (dispatchedBranches.has(String(branchId))) { skipped += 1; continue; }
        const row = {
          id: `ntc-${randomUUID().slice(0, 8)}`,
          kind: 'system',
          title: `党委活动：${title}`,
          content: description || title,
          priority: 'normal',
          publishDate: todayLocal(),
          branchId,
          source: 'committee',
          sourceType: 'activity',
          sourceId: String(source.id),
          sourceVersion: version,
          systemKind: COMMITTEE_DISPATCH_KIND,
          // 批次 537 波次 1：通知落点必须带对象坐标，否则 notice.js 归一化会把 system 降级成 announcement。
          targetType: 'activity',
          targetId: String(source.id),
          audience: ['secretary', 'deputy-secretary'],
          createdBy: req.actor.id,
          createdAt,
        };
        writeRow(db, 'notices', row);
        dispatchedBranches.add(String(branchId));
        created.push(row);
      }
      if (created.length > 0) bumpCollectionVersion(db, 'notices');
    })();
    res.json({ created: created.length, skipped, notices: created });
  });

  // ── 采用：目标支部的支书 / 副支书把党委活动复制成本支部活动（幂等；并发靠唯一索引兜底）──
  router.post('/activities/:id/adopt', requireRole(db, SECRETARY_AND_DEPUTY_ROLE_SET), (req, res) => {
    const source = getRow(db, 'activities', String(req.params.id));
    if (!source) return res.status(404).json({ error: '活动不存在' });
    if (source.ownerScope !== 'committee') return res.status(400).json({ error: '该活动不是党委活动，无需采用' });
    const branchId = actorBranchId(req.actor);
    if (!branchId) return res.status(403).json({ error: '无权限：请先选择支部后再操作' });
    const targets = Array.isArray(source.targetBranchIds) ? source.targetBranchIds.map(String) : [];
    if (!(targets.includes('all') || targets.includes(String(branchId)))) {
      return res.status(403).json({ error: '无权限：本活动未下发到本支部' });
    }
    if (source.archived === true || !ADOPTABLE_SOURCE_STATUSES.has(source.status)) {
      return res.status(409).json({ error: `当前状态「${source.status || '未知'}」的党委活动不可采用` });
    }
    const existing = findAdoptedCopy(source.id, branchId);
    if (existing) return res.json({ activity: existing, idempotent: true });

    const createdAt = new Date().toISOString();
    const id = `act-${randomUUID().slice(0, 8)}`;
    const copy = { id, ownerScope: 'branch', branchId };
    for (const key of ADOPT_COPY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) copy[key] = source[key];
    }
    // 副本固定为本支部执行面：承办党小组 / 招募范围可复制，但不复制原件的下发范围与发布面
    copy.visibility = 'branch';
    copy.organizingScope = source.organizingScope || 'branch';
    copy.hostGroupId = null;
    copy.hostGroup = '';
    copy.recruitmentScope = source.recruitmentScope || 'group';
    copy.crossGroupCoordinatorId = source.crossGroupCoordinatorId || null;
    for (const key of ['signupEnabled', 'signupClosed', 'requireMakeup', 'isOutdoor', 'deepWorkMode']) {
      if (Object.prototype.hasOwnProperty.call(source, key)) copy[key] = source[key];
    }
    copy.status = source.status;
    copy.sourceActivityId = String(source.id);
    copy.sourceVersion = Number(source.contentVersion) || 1;
    copy.sourceSyncedAt = null;
    copy.adoptedAt = createdAt;
    copy.adoptedBy = req.actor.id;
    copy.publishScope = 'branch';
    copy.organizer = req.actor.id;
    // 分工覆盖为「采用人＝组织者」，避免原件里的跨支部人员进入本支部工作组
    copy.assignments = [{ personId: req.actor.id, role: 'organizer' }];
    copy.createdBy = req.actor.id;
    copy.createdAt = createdAt;
    copy.workgroupId = workgroupIdFor('activity', id);

    try {
      db.transaction(() => {
        const group = createActivityWorkgroup(db, req.actor, copy);
        if (!group.ok) {
          const denied = new Error(group.error || '活动工作组创建失败');
          denied.adoptStatus = group.status || 400;
          throw denied;
        }
        bumpCollectionVersion(db, 'activities');
        rebuildShadowTables(db);
      })();
    } catch (err) {
      if (err && err.adoptStatus) return res.status(err.adoptStatus).json({ error: err.message });
      // 并发兜底：v13 部分唯一索引 (branch_id, source_activity_id) 拦下第二条副本 ⇒ 回查后按幂等返回
      if (/UNIQUE constraint failed/i.test(String((err && err.message) || ''))) {
        const raced = findAdoptedCopy(source.id, branchId);
        if (raced) return res.json({ activity: raced, idempotent: true });
      }
      throw err;
    }
    res.status(201).json({ activity: copy, idempotent: false });
  });

  // ── 手动同步：只覆盖内容字段（原件有值才覆盖），执行字段与支部本地调整保留 ──
  router.post('/activities/:id/sync-source', requireRole(db, SECRETARY_AND_DEPUTY_ROLE_SET), (req, res) => {
    const copy = getRow(db, 'activities', String(req.params.id));
    if (!copy) return res.status(404).json({ error: '活动不存在' });
    if (!copy.sourceActivityId) return res.status(400).json({ error: '不是党委活动副本，无需同步' });
    const branchId = actorBranchId(req.actor);
    if (!branchId || copy.branchId !== branchId) {
      return res.status(403).json({ error: '无权限：只能同步本支部的副本' });
    }
    const source = getRow(db, 'activities', String(copy.sourceActivityId));
    if (!source) return res.status(404).json({ error: '党委原件不存在' });

    // G5（2026-11-08 波次 B）：同步前复核原件仍可追——已取消 / 已归档，或原件下发范围
    //   已不再包含本支部 ⇒ 409，且不覆盖副本任何字段（通知 / 下发不受本端点约束）。
    if (source.status === 'cancelled' || source.status === 'archived' || source.archived === true) {
      return res.status(409).json({ error: '原件已取消或归档，不可同步' });
    }
    const sourceTargets = Array.isArray(source.targetBranchIds) ? source.targetBranchIds.map(String) : [];
    if (!(sourceTargets.includes('all') || sourceTargets.includes(String(copy.branchId)))) {
      return res.status(409).json({ error: '原件下发范围已不含本支部，不可同步' });
    }

    const copyVersion = Number(copy.sourceVersion) || 0;
    const sourceVersion = Number(source.contentVersion) || 1;
    if (copyVersion >= sourceVersion) return res.json({ activity: copy, synced: false });

    const next = { ...copy };
    for (const key of ACTIVITY_COPY_LOCKED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) next[key] = source[key];
    }
    next.sourceVersion = sourceVersion;
    next.sourceSyncedAt = new Date().toISOString();
    // 活动改名 → 工作组名同源（R9 Task 4.3 单一投影，与通用 PATCH 同口径）
    const workgroup = activityWorkgroupUpdate(db, next, req.actor.id);
    db.transaction(() => {
      writeRow(db, 'activities', next);
      if (workgroup) {
        db.prepare('INSERT OR REPLACE INTO workgroups (id, data) VALUES (?, ?)')
          .run(workgroup.id, JSON.stringify(workgroup));
        bumpCollectionVersion(db, 'workgroups');
      }
      bumpCollectionVersion(db, 'activities');
      rebuildShadowTables(db);
    })();
    res.json({ activity: next, synced: true });
  });

  // ════════════════════════════════════════════════════════════════
  //  支部副本的「强调通知」（2026-11-08 批次 536 · Task 4）
  // ════════════════════════════════════════════════════════════════
  // 由来（spec Requirement「强调通知」+ 不变量 I7）：支部采用党委活动后，支书 / 副支书可在**本支部副本**上
  //   向支部内全体党员发一条强调通知。口径：
  //   ① 受众 `['all']`（支部内全体党员），非幂等——过了窗口可再发，产生第二条；
  //   ② 限频按 `(branchId, sourceActivityId)`：同一支部对同一党委活动 24 小时内最多一条（`EMPHASIS_NOTICE_WINDOW_MS`
  //      单一源 = constants.js），命中返回 429 + 剩余可用时间，不创建；
  //   ③ 只允许副本所属支部的支书 / 副支书（`SECRETARY_AND_DEPUTY_ROLE_SET` 单一源 = gates.js）；党委与跨支部一律 403；
  //   ④ 直接写 `notices` 并显式落受众（与下发同口径），不走 `/system-notices` 的 kind 授权链。
  // ⚠ 本段置尾：上文行号是 `README-server.md` 的取证靶点，插在中间会整体漂移。
  const EMPHASIS_NOTICE_KIND = 'activity-emphasis';

  /** 通知的「发送时刻」（限频判据：优先 `at`，历史行回落 `publishDate` / `createdAt`） */
  const emphasisNoticeTime = (notice) => {
    for (const key of ['at', 'publishDate', 'createdAt']) {
      const ts = notice && notice[key] ? Date.parse(notice[key]) : NaN;
      if (Number.isFinite(ts)) return ts;
    }
    return NaN;
  };

  /** 缺省正文：写清活动日期、地点与要求（保证不出现空正文） */
  const emphasisDefaultContent = (copy) => {
    const title = String(copy.title || copy.id);
    const date = typeof copy.date === 'string' && copy.date.trim() ? copy.date.trim() : '（日期以支部安排为准）';
    const location = typeof copy.location === 'string' && copy.location.trim()
      ? copy.location.trim() : '（地点以支部安排为准）';
    return `院级活动「${title}」将于 ${date} 在 ${location} 开展，请全体党员按时参加并提前到场签到；`
      + '确有特殊情况无法参加的，须提前向支书请假。';
  };

  // ── 发送强调通知（支部副本；支书 / 副支书；24 小时限频）──
  router.post('/activities/:id/emphasis-notice', requireAuth(db), (req, res) => {
    const copy = getRow(db, 'activities', String(req.params.id));
    if (!copy) return res.status(404).json({ error: '活动不存在' });
    if (!copy.sourceActivityId) return res.status(400).json({ error: '不是党委活动副本' });
    const branchId = actorBranchId(req.actor);
    if (!SECRETARY_AND_DEPUTY_ROLE_SET.has(req.actor.role) || !branchId || String(branchId) !== String(copy.branchId)) {
      return res.status(403).json({ error: '无权限：强调通知仅限本支部支书 / 副支书发送' });
    }

    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const title = (typeof body.title === 'string' && body.title.trim()) ? body.title.trim() : `活动强调：${copy.title || copy.id}`;
    const content = (typeof body.content === 'string' && body.content.trim()) ? body.content.trim() : emphasisDefaultContent(copy);

    const now = Date.now();
    const outcome = db.transaction(() => {
      const hit = listTable(db, 'notices').find((row) => row
        && String(row.branchId) === String(copy.branchId)
        && String(row.sourceId) === String(copy.id)
        && row.systemKind === EMPHASIS_NOTICE_KIND
        && emphasisNoticeTime(row) > now - EMPHASIS_NOTICE_WINDOW_MS);
      if (hit) return { hit };
      const at = new Date(now).toISOString();
      const notice = {
        id: `ntc-${randomUUID().slice(0, 8)}`,
        kind: 'system',
        systemKind: EMPHASIS_NOTICE_KIND,
        emphasis: true,
        title,
        content,
        priority: 'normal',
        publishDate: at,
        at,
        branchId: copy.branchId,
        source: 'branch',
        sourceType: 'activity',
        sourceId: String(copy.id),
        sourceActivityId: String(copy.sourceActivityId),
        // 批次 537 波次 1：强调通知落点＝支部副本（对象卡可直达），避免 notice.js 把 system 降级成 announcement。
        targetType: 'activity',
        targetId: String(copy.id),
        audience: ['all'],
        createdBy: req.actor.id,
        createdAt: at,
      };
      writeRow(db, 'notices', notice);
      bumpCollectionVersion(db, 'notices');
      return { notice };
    })();

    if (outcome.hit) {
      const sentAt = emphasisNoticeTime(outcome.hit);
      const retryAt = sentAt + EMPHASIS_NOTICE_WINDOW_MS;
      return res.status(429).json({
        error: '同一活动 24 小时内只能发送一次强调通知',
        retryAfterMs: Math.max(0, retryAt - now),
        retryAt: new Date(retryAt).toISOString(),
      });
    }
    res.status(201).json({ notice: outcome.notice });
  });

  // ════════════════════════════════════════════════════════════════
  //  党委多域写入：院级资料 / 支部档案 / 名册提案（2026-11-08 批次 536 · Task 10）
  // ════════════════════════════════════════════════════════════════
  // 由来（spec Requirement「党委多域写入」）：党委此前只能写活动，院级资料 / 支部档案 / 名册调整三条
  //   写链没有服务端落点 ⇒ 只能靠通用 CRUD（按支部归属解析，写不进 `pc-gsm`）或前端假保存。
  // 口径：
  //   ① 三段全部只允许 `party-staff`；
  //   ② 院级资料落 `branch_docs`（`ownerScope='committee'` / `branchId=pc-gsm`），发布面变化写留痕；
  //   ③ 支部档案只**新增** `archive_records`，不改该支部活动本身；
  //   ④ 名册调整只**提案**（写 `member_change_requests` 起点 `pending-org-approval`），党委不直接改
  //      `users.developStage`；支部确认链（组织委员 approve → 支书 confirm）原样复用。
  // ⚠ 本段置尾：上文行号是 `README-server.md` 的取证靶点，插在中间会整体漂移。

  // ── 一、院级资料（`branch_docs` 中 `ownerScope='committee'` 的行）──
  const COMMITTEE_DOCUMENT_FIELDS = [
    'title', 'summary', 'bodyText', 'fileName', 'fileSize', 'format', 'fileData', 'filePath',
    'publishScope', 'publishExpiresAt',
  ];
  // 院级资料的发布面字段（留痕 oldValue / newValue 用；缺省范围＝login）
  const committeeDocumentPublication = (row) => ({
    publishScope: (row && row.publishScope) || 'login',
    publishExpiresAt: row && row.publishExpiresAt !== undefined ? row.publishExpiresAt : null,
    summary: row && row.summary !== undefined ? row.summary : null,
  });
  /** 院级资料发布面校验：只收 login / public；public 须未来有效期 + 非空摘要（≤500 字） */
  const committeeDocumentScopeError = (row) => {
    const scope = (row && row.publishScope) || 'login';
    if (scope !== 'login' && scope !== 'public') {
      return 'publishScope 须为 login / public（院级资料不得按支部发布）';
    }
    if (scope !== 'public') return null;
    const ts = row.publishExpiresAt ? Date.parse(row.publishExpiresAt) : NaN;
    if (!Number.isFinite(ts) || ts <= Date.now()) {
      return 'public 可见须设置未来的 publishExpiresAt（ISO 时间）';
    }
    const summary = typeof row.summary === 'string' ? row.summary.trim() : '';
    if (!summary) return 'public 可见须填写非空 summary';
    if (summary.length > 500) return 'summary 不得超过 500 字';
    return null;
  };
  const committeeDocumentScopeChange = (prev, next) => {
    const before = committeeDocumentPublication(prev);
    const after = committeeDocumentPublication(next);
    if (JSON.stringify(before) === JSON.stringify(after)) return null;
    let action = 'update-scope';
    if (before.publishScope !== 'public' && after.publishScope === 'public') action = 'publish';
    else if (before.publishScope === 'public' && after.publishScope !== 'public') action = 'unpublish';
    return { action, oldValue: before, newValue: after };
  };
  /** 读取一条院级资料行；不存在 → null，非党委归属 → `false`（区分 404 与 403） */
  const readCommitteeDocument = (id) => {
    const row = getRow(db, 'branch_docs', id);
    if (!row) return null;
    return row.ownerScope === 'committee' ? row : false;
  };

  // ── 院级资料列表（可按发布范围过滤；按上传时间倒序）──
  router.get('/committee/documents', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    let rows = listTable(db, 'branch_docs').filter((row) => row && row.ownerScope === 'committee');
    if (req.query.publishScope) {
      rows = rows.filter((row) => ((row.publishScope || 'login') === req.query.publishScope));
    }
    rows.sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')));
    res.json(rows);
  });

  // ── 新建院级资料（归属 / 用途 / 状态 / 版本 / 上传人 / 时间由服务端强制）──
  router.post('/committee/documents', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return res.status(422).json({ error: '缺少必要字段：title' });
    const id = body.id ? String(body.id) : `bd-${randomUUID().slice(0, 8)}`;
    if (getRow(db, 'branch_docs', id)) return res.status(409).json({ error: '该资料 id 已存在' });

    const row = { id };
    for (const key of COMMITTEE_DOCUMENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) row[key] = body[key];
    }
    row.title = title;
    row.publishScope = row.publishScope || 'login';
    const scopeError = committeeDocumentScopeError(row);
    if (scopeError) return res.status(422).json({ error: scopeError });

    row.ownerScope = 'committee';
    row.branchId = COMMITTEE_OWNER_ID;
    row.purpose = 'doc';
    row.status = 'current';
    row.version = 1;
    row.cat = 'committee-doc';
    row.uploadedBy = req.actor.id;
    row.uploadedAt = new Date().toISOString();

    writeRow(db, 'branch_docs', row);
    writePublicationAudit(db, {
      resourceType: 'document',
      resourceId: row.id,
      action: 'publish',
      actor: req.actor,
      oldValue: null,
      newValue: committeeDocumentPublication(row),
    });
    res.status(201).json(row);
  });

  // ── 编辑院级资料（白名单字段；公开面变化写留痕）──
  router.patch('/committee/documents/:id', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const prev = readCommitteeDocument(req.params.id);
    if (prev === null) return res.status(404).json({ error: '资料不存在' });
    if (prev === false) return res.status(403).json({ error: '无权限：只能编辑院级资料' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const unknown = Object.keys(body).find((key) => !COMMITTEE_DOCUMENT_FIELDS.includes(key));
    if (unknown) return res.status(400).json({ error: `字段 ${unknown} 不在本端点白名单` });

    const next = { ...prev };
    for (const key of Object.keys(body)) next[key] = body[key];
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      next.title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!next.title) return res.status(422).json({ error: 'title 不得为空' });
    }
    const scopeError = committeeDocumentScopeError(next);
    if (scopeError) return res.status(422).json({ error: scopeError });

    writeRow(db, 'branch_docs', next);
    const change = committeeDocumentScopeChange(prev, next);
    if (change) {
      writePublicationAudit(db, {
        resourceType: 'document',
        resourceId: next.id,
        action: change.action,
        actor: req.actor,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    res.json(next);
  });

  // ── 撤下院级资料（只把发布范围置回 login；幂等；不删表行）──
  router.post('/committee/documents/:id/withdraw', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const row = readCommitteeDocument(req.params.id);
    if (row === null) return res.status(404).json({ error: '资料不存在' });
    if (row === false) return res.status(403).json({ error: '无权限：只能撤下院级资料' });
    if ((row.publishScope || 'login') === 'login') return res.json(row);
    const next = { ...row, publishScope: 'login' };
    writeRow(db, 'branch_docs', next);
    writePublicationAudit(db, {
      resourceType: 'document',
      resourceId: next.id,
      action: 'unpublish',
      actor: req.actor,
      oldValue: committeeDocumentPublication(row),
      newValue: committeeDocumentPublication(next),
    });
    res.json(next);
  });

  // ── 二、支部档案（只新增 `archive_records`；党委不改写该支部活动本身）──
  const COMMITTEE_ARCHIVE_FIELDS = [
    'title', 'category', 'period', 'archiveDate', 'materialOnly', 'activityId', 'activityName',
    'fileName', 'filePath', 'fileSize', 'note',
  ];

  router.post('/committee/archive-records', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const branchId = body.branchId ? String(body.branchId).trim() : '';
    if (!branchId) return res.status(422).json({ error: '缺少必要字段：branchId' });
    if (!db.prepare('SELECT id FROM branches WHERE id = ?').get(branchId)) {
      return res.status(422).json({ error: `支部不存在：${branchId}` });
    }
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!category) return res.status(422).json({ error: '缺少必要字段：category' });
    if (!title) return res.status(422).json({ error: '缺少必要字段：title' });

    // 批次 541：`activityId` 必须是**本支部**的活动——党委档案只为该支部留痕，不得引用他支部 / 党委原件。
    const activityId = body.activityId === undefined || body.activityId === null ? '' : String(body.activityId).trim();
    if (activityId) {
      const activity = getRow(db, 'activities', activityId);
      if (!activity) return res.status(422).json({ error: `活动不存在：${activityId}` });
      const activityBranch = String(activity.branchId || DEFAULT_BRANCH_ID);
      if (activityBranch !== branchId) {
        return res.status(422).json({ error: `活动 ${activityId} 不属于支部 ${branchId}（实际：${activityBranch}）` });
      }
    }

    const period = typeof body.period === 'string' ? body.period.trim() : '';
    const archiveDate = (typeof body.archiveDate === 'string' && body.archiveDate.trim())
      ? body.archiveDate.trim()
      : (/^\d{4}-\d{2}-\d{2}$/.test(period) ? period : todayLocal());
    const now = new Date().toISOString();
    const row = {
      id: body.id ? String(body.id) : `ar-${randomUUID().slice(0, 8)}`,
      branchId,
      category,
      title,
      archiveDate,
      materialOnly: body.materialOnly === true,
      status: 'archived',
      uploadedBy: req.actor.id,
      createdBy: req.actor.id,
      createdAt: now,
    };
    for (const key of COMMITTEE_ARCHIVE_FIELDS) {
      if (key === 'title' || key === 'category' || key === 'period' || key === 'archiveDate') continue;
      if (Object.prototype.hasOwnProperty.call(body, key)) row[key] = body[key];
    }
    if (period) row.period = period;

    writeRow(db, 'archive_records', row);
    bumpCollectionVersion(db, 'archive_records');
    res.status(201).json(row);
  });

  // ── 支部档案读取（可按支部过滤；供党委工作台验证写入结果）──
  router.get('/committee/archive-records', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    let rows = listTable(db, 'archive_records');
    if (req.query.branchId) rows = rows.filter((row) => row && String(row.branchId) === String(req.query.branchId));
    rows.sort((a, b) => String(b.createdAt || b.archiveDate || '')
      .localeCompare(String(a.createdAt || a.archiveDate || '')));
    res.json(rows);
  });

  // ── 三、名册提案（只写 `member_change_requests` 起点；不直接改 `users.developStage`）──
  // 非终态 ＝ 尚未 completed / rejected / cancelled；同 (branchId, personId) 只允许一条在途「党委提案」。
  const MEMBER_CHANGE_TERMINAL_STATUSES = new Set(['completed', 'rejected', 'cancelled']);
  // 与 db.js v15 部分唯一索引同口径（改这里必须同批改 v15 的 WHERE）
  const MEMBER_CHANGE_TERMINAL_SQL = [...MEMBER_CHANGE_TERMINAL_STATUSES].map((s) => `'${s}'`).join(',');

  router.post('/committee/roster-proposals', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const branchId = body.branchId ? String(body.branchId).trim() : '';
    const personId = body.personId ? String(body.personId).trim() : '';
    const fromStage = body.fromStage ? String(body.fromStage).trim() : '';
    const toStage = body.toStage ? String(body.toStage).trim() : '';
    if (!branchId || !personId || !fromStage || !toStage) {
      return res.status(422).json({ error: '缺少必要字段：branchId/personId/fromStage/toStage' });
    }
    if (!db.prepare('SELECT id FROM branches WHERE id = ?').get(branchId)) {
      return res.status(422).json({ error: `支部不存在：${branchId}` });
    }
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(personId);
    if (!userRow) return res.status(422).json({ error: `成员不存在：${personId}` });
    const user = JSON.parse(userRow.data);
    if ((user.branchId || DEFAULT_BRANCH_ID) !== branchId) {
      return res.status(422).json({ error: `成员 ${personId} 不属于支部 ${branchId}` });
    }
    if ((user.developStage || '') !== fromStage) {
      return res.status(422).json({ error: `fromStage 与成员当前阶段不一致（当前：${user.developStage || '空'}）` });
    }
    // 批次 541：目标阶段必须落在服务端白名单（与 member.js 同一 `DEVELOP_STAGE_OPTIONS` 单一源）。
    if (!DEVELOP_STAGE_OPTIONS.includes(toStage)) {
      return res.status(422).json({ error: `toStage 非法：${toStage}（须为 ${DEVELOP_STAGE_OPTIONS.join(' / ')}）` });
    }
    const now = new Date().toISOString();
    const row = {
      id: `mcr-${randomUUID().slice(0, 8)}`,
      branchId,
      personId,
      fromStage,
      toStage,
      meetingResult: 'committee-proposal',
      status: 'pending-org-approval',
      source: 'committee-proposal',
      note: typeof body.note === 'string' ? body.note.trim() : '',
      proposedBy: req.actor.id,
      createdBy: req.actor.id,
      createdAt: now,
    };
    // 批次 541：查重与写入同一事务；并发由 v15 部分唯一索引（在途党委提案）兜底。
    // ⚠ 这里不得用 writeRow（INSERT OR REPLACE）——唯一索引冲突时它会静默替换既有在途提案。
    const inflightSql = `SELECT id FROM member_change_requests
      WHERE json_extract(data,'$.branchId') = ?
        AND json_extract(data,'$.personId') = ?
        AND json_extract(data,'$.source') = 'committee-proposal'
        AND IFNULL(json_extract(data,'$.status'),'') NOT IN (${MEMBER_CHANGE_TERMINAL_SQL})
      LIMIT 1`;
    let conflictId = '';
    try {
      db.transaction(() => {
        const existing = db.prepare(inflightSql).get(branchId, personId);
        if (existing) { conflictId = String(existing.id); return; }
        db.prepare('INSERT INTO member_change_requests (id, data) VALUES (?, ?)')
          .run(row.id, JSON.stringify(row));
      })();
    } catch (error) {
      if (/UNIQUE constraint failed/i.test(String(error && error.message))) {
        const existing = db.prepare(inflightSql).get(branchId, personId);
        conflictId = existing ? String(existing.id) : '';
        return res.status(409).json({ error: '该成员已有在途的变更提案', ...(conflictId ? { id: conflictId } : {}) });
      }
      throw error;
    }
    if (conflictId) {
      return res.status(409).json({ error: '该成员已有在途的变更提案', id: conflictId });
    }
    res.status(201).json(row);
  });

  // ── 名册提案读取（可按支部 / 状态过滤；按创建时间倒序）──
  router.get('/committee/roster-proposals', requireRole(db, PARTY_STAFF_ROLE), (req, res) => {
    let rows = listTable(db, 'member_change_requests');
    if (req.query.branchId) rows = rows.filter((row) => row && String(row.branchId) === String(req.query.branchId));
    if (req.query.status) rows = rows.filter((row) => row && row.status === req.query.status);
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    res.json(rows.map(aliasMemberChangeRow));
  });

  // 批次 537 波次 1（G2）：党委公开通知写口 /committee/notices*（纯追加，不移动上文行号）
  registerCommitteeNoticeRoutes(router, db);
}

// 党委内容写口的依赖（置尾追加：import 声明被提升，上文行号零漂移）
import { COMMITTEE_OWNER_ID, ACTIVITY_COPY_LOCKED_FIELDS, PUBLISH_SCOPES } from '../../../docs/src/core/domain/constants.js';
import { writePublicationAudit } from './publication-audit.js';
// 下发 / 采用 / 同步的依赖（Task 3；同样置尾追加，避开 README-server.md 的既有行号靶点）
import { bumpCollectionVersion, rebuildShadowTables } from '../../db.js';
import { workgroupIdFor } from '../../../docs/src/data/activity-workgroup-sync.js';
// 强调通知限频窗口的依赖（Task 4；同样置尾追加）
import { EMPHASIS_NOTICE_WINDOW_MS } from '../../../docs/src/core/domain/constants.js';
// 党委公开通知写口的依赖（批次 537 波次 1 · G2；同样置尾追加）
import { registerCommitteeNoticeRoutes } from './committee-notices.js';
// 名册提案目标阶段白名单（批次 541；与 member.js 同一服务端枚举源）
import { DEVELOP_STAGE_OPTIONS } from '../../../docs/src/services/branch/org-base-data-preview.js';

