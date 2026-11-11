// server/routes/committee.js — 线上表决：异步表态（agenda_votes）
// 闭环：支书创建表决活动+议题 → 通知应到成员 → 成员异步表态 → 支书汇总/截止 → 记录决议（复用 agenda）
// 表态可见性：先全量可见（信息同步开放），边界后续评议
// 泛化（AV3）：position 按活动 voteConfig.optionSet 枚举校验、应到按 voteConfig.voterIds 校验；
//   旧活动（无 voteConfig）回退 deliberative + 支委白名单（现状行为零变化）。
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole, requireCommissioner } from './auth.js';
// P2c（2026-09-03）：角色/支委名单单一源 = docs/src/core/domain/constants.js（勿手写）
// 计票方式（ballotMode）同源（2026-09-12 支书裁定「正式表决无记名 + 匿名模式可选」）：
//   强制/默认规则 = ballotModeOfActivity/isAnonymousForced，勿在本文件另写副本。
import { DEFAULT_BRANCH_ID, SECRETARY_AND_DEPUTY_ROLES as SECRETARY_DEPUTY_ROLE_KEYS, resolveCommitteeIds, ballotModeOfActivity } from '../../docs/src/core/domain/constants.js';
import { validateAgendaVoteTarget } from '../../docs/src/services/activity/agenda-relations.js';
import { actorBranchId, branchSelectionError, resourceRowsForActor } from './resources/branch-scope.js';

// 支委白名单 = 旧活动回退白名单（P1-09，2026-10-20）：按当前 users.role 派生，不再维护 id 快照；
// 权威名单 = 活动 voteConfig.voterIds（前端创建活动时经 vote-config 固化写入活动）；
// 前端唯一源 = docs/src/services/activity/vote-config.js resolveVoterIds('committee')
//   （constants.js::resolveCommitteeIds 角色派生）。名单变更请改成员角色，勿在此增删成员。
// 支书侧写权角色集（含副支书＝副书同权 2026-09-11 支书裁定；单一源 = constants.js）
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

// 选项集枚举：position 按活动 voteConfig.optionSet 校验。
// 业务单一源 = 前端 docs/src/services/activity/vote-config.js OPTION_SETS（label/labels/objectRequiresNote 全量）；
// 本表仅镜像 options 键集，键集一致性由 test/catalog-sync.test.mjs::T4 双向断言锁定（2026-09-03 P1a；
// 2026-09-15 批次 47-F 由原 vote-option-sync.test.mjs 并入 catalog-sync.test.mjs）。
//   deliberative（支委会交流式）：agree(同意)/object(异议)/comment(附言)
//   formal（支部党员大会正式表决）：approve(赞成)/oppose(反对)/abstain(弃权)
export const OPTION_ENUMS = {
  deliberative: ['agree', 'object', 'comment'],
  formal: ['approve', 'oppose', 'abstain'],
};

export function createCommitteeRouter(db) {
  const router = Router();

  // 表态列表（按活动过滤；全量可见）
  router.get('/agenda-votes', requireAuth(db), (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    let rows = resourceRowsForActor(db, 'agenda_votes', listTable(db, 'agenda_votes'), req.actor, req.query.branchId);
    if (req.query.activityId) rows = rows.filter((v) => v.activityId === req.query.activityId);
    res.json(rows);
  });

  // 提交/覆盖表态（活动应到名单内成员；截止锁定后 400；不在名单 403；非法 position 400）
  router.post('/agenda-votes', requireAuth(db), (req, res) => {
    const { activityId, agendaItemId, position, note = '' } = req.body || {};
    if (!activityId || !agendaItemId) {
      return res.status(400).json({ error: '缺少必要字段：activityId/agendaItemId' });
    }
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'note 须为字符串' });
    }
    if (note.length > 500) {
      return res.status(400).json({ error: 'note 长度不能超过 500 字符' });
    }
    // 活动存在性检查（活动数据在 activities 表；活动不存在一律 404，不静默放行）
    const actRow = getRow(db, 'activities', activityId);
    if (!actRow) return res.status(404).json({ error: '活动不存在' });
    if (actorBranchId(req.actor) && actorBranchId(req.actor) !== (actRow.branchId || DEFAULT_BRANCH_ID)) return res.status(403).json({ error: '无权限：不能参与其他支部活动表决' });
    const agendaTarget = validateAgendaVoteTarget(actRow.agenda, agendaItemId);
    if (!agendaTarget.ok) return res.status(400).json({ error: agendaTarget.error });
    // ===== 表决授权解析（AV3，fail-closed）=====
    // 信任模型：表决授权（optionSet 选项枚举 + voterIds 应到名单）存于活动 voteConfig，
    //   由前端创建活动时经 vote-config 固化写入（客户端写）。
    // 写侧约束（2026-09-02 收敛，T-2026-09-006）：voteConfig 配置 UI 仅在支书/副支书工作台
    //   （secretary.html calendar 写入面板）呈现——组长等其它角色写活动无表决配置入口；
    //   「服务端强制」（活动写 REST 化后按角色校验 voteConfig / 名单按 scope 从 users 推导）
    //   已登记架构 spec，与双 Mock 引擎合并同批排期。当前信任模型 = 支书/副支书操作 + 演示场景。
    // 旧活动兼容：仅当活动完全无 voteConfig 时回退 deliberative + 支委白名单（现状行为零变化）；
    //   活动带 voteConfig 即须完整合法 —— optionSet 缺失/不受支持、voterIds 缺失/非数组/空数组
    //   一律 400（fail-closed，不回退默认值）。
    const vc = actRow.voteConfig;
    const hasConfig = vc !== undefined && vc !== null;
    if (hasConfig && !OPTION_ENUMS[vc.optionSet]) {
      return res.status(400).json({ error: '活动表决配置无效：optionSet 缺失或不受支持' });
    }
    if (hasConfig && (!Array.isArray(vc.voterIds) || vc.voterIds.length === 0)) {
      return res.status(400).json({ error: '活动表决名单无效：voterIds 须为非空数组' });
    }
    const optionSet = hasConfig ? vc.optionSet : 'deliberative';
    // 旧活动回退名单：按「本活动所属支部」的现任支委角色派生（P1-09）。
    // 为什么 fail-closed：无支委角色时若静默放行/用假人，历史活动重开表决会把票记到错误的人；
    // 明确 409 让操作者先维护角色或补齐 voteConfig。
    let voterIds = null;
    if (hasConfig) {
      voterIds = new Set(vc.voterIds);
    } else {
      const branchId = actRow.branchId || DEFAULT_BRANCH_ID;
      const branchUsers = listTable(db, 'users').filter((u) => (u.branchId || DEFAULT_BRANCH_ID) === branchId);
      const committee = resolveCommitteeIds(branchUsers);
      if (committee.error) return res.status(409).json({ error: committee.error });
      voterIds = new Set(committee.ids);
    }
    if (!voterIds.has(req.actor.id)) {
      return res.status(403).json({ error: hasConfig ? '不在本次表决名单' : '仅支委可表态' });
    }
    if (!position || !OPTION_ENUMS[optionSet].includes(position)) {
      return res.status(400).json({ error: `表态无效：position(${OPTION_ENUMS[optionSet].join('|')})` });
    }
    // 「异议须附言」仅 deliberative（object）适用；formal（反对/弃权/附言选填）无必附言要求
    if (optionSet === 'deliberative' && position === 'object' && !note.trim()) {
      return res.status(400).json({ error: '异议须附言说明' });
    }
    // 锁定期检查（截止锁定后不可再提交）
    if (actRow.votesLocked) {
      return res.status(400).json({ error: '表态已截止锁定，不可再提交' });
    }
    // ===== 计票方式（ballotMode，2026-09-12 支书裁定）=====
    // 正式表决（optionSet formal）制度强制无记名：活动配置遗留 named 亦按强制口径读取；
    // 显式以 named 提交 → 400（防绕过制度，见 content/02_institution/sop/…发展党员工作细则:103）。
    const ballotMode = ballotModeOfActivity(actRow);
    if (req.body && req.body.ballotMode && req.body.ballotMode !== ballotMode) {
      return res.status(400).json({ error: ballotMode === 'anonymous'
        ? '正式表决须以无记名方式提交（不得记名）'
        : '提交的计票方式与活动配置不一致' });
    }
    const now = new Date().toISOString();

    // 无记名（anonymous）：两段式落库 ——「参与记录」{personId, votedAt}（可判谁已投，供催办/人数核验）
    //   +「选项计数」tally 行 {tally: {选项: 次数}}（逐人选项不落库、附言不落库）。
    // 两行与幂等检查处于同一事务；重复提交返回原参与记录（无逐人选项可回退 → 不可改票，亦不重复计数）。
    if (ballotMode === 'anonymous') {
      const saved = db.transaction(() => {
        const existing = listTable(db, 'agenda_votes').find((v) =>
          v.activityId === activityId && v.agendaItemId === agendaItemId && v.personId === req.actor.id);
        if (existing) return { row: existing, created: false };
        const row = {
          id: `av-${randomUUID().slice(0, 8)}`,
          branchId: actRow.branchId || DEFAULT_BRANCH_ID,
          activityId, agendaItemId,
          personId: req.actor.id,
          votedAt: now,
          ballotMode: 'anonymous',
          createdAt: now,
        };
        writeRow(db, 'agenda_votes', row);
        // tally 行 id 按（活动, 议程项）确定性生成。
        const tallyId = `avt-${activityId}-${agendaItemId}`;
        const prev = listTable(db, 'agenda_votes').find((v) => v.id === tallyId);
        const tally = { ...((prev && prev.tally) || {}) };
        tally[position] = (Number(tally[position]) || 0) + 1;
        writeRow(db, 'agenda_votes', { id: tallyId, branchId: actRow.branchId || DEFAULT_BRANCH_ID, activityId, agendaItemId, ballotMode: 'anonymous', tally, updatedAt: now });
        return { row, created: true };
      })();
      return res.status(saved.created ? 201 : 200).json(saved.row);
    }

    // 记名（named）：逐人选项落库（现状行为不变）
    const existing = listTable(db, 'agenda_votes').find((v) =>
      v.activityId === activityId && v.agendaItemId === agendaItemId && v.personId === req.actor.id);
    if (existing) {
      const updated = { ...existing, branchId: actRow.branchId || DEFAULT_BRANCH_ID, position, note, updatedAt: now };
      writeRow(db, 'agenda_votes', updated);
      return res.json(updated);
    }
    const row = {
      id: `av-${randomUUID().slice(0, 8)}`,
      branchId: actRow.branchId || DEFAULT_BRANCH_ID,
      activityId, agendaItemId,
      personId: req.actor.id,
      position, note,
      createdAt: now,
      updatedAt: null,
    };
    writeRow(db, 'agenda_votes', row);
    res.status(201).json(row);
  });

  // 转移标注（Task 3 · 2026-10-26）：成员移出时给其已表态记录标注 `transferredOutAt`。
  // 为什么单独开行级语义端点：`agenda_votes` 故意不进快照 payload（防陈旧缓存整表覆盖），
  //   而全量快照又没有行级 patch 能力 ⇒ 若不补这个口，移出标注只会活在本机浏览器（假保存）。
  // 白名单只有一个字段（`transferredOutAt`），不接受新增/删除/改票；写后清缓存重登仍可读。
  router.post('/agenda-votes/:id/annotate', requireCommissioner(db), (req, res) => {
    const existing = getRow(db, 'agenda_votes', req.params.id);
    if (!existing) return res.status(404).json({ error: '表态记录不存在' });
    if (actorBranchId(req.actor) && actorBranchId(req.actor) !== (existing.branchId || DEFAULT_BRANCH_ID)) {
      return res.status(403).json({ error: '无权限：不能标注其他支部的表态记录' });
    }
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const outside = Object.keys(body).filter((k) => k !== 'transferredOutAt');
    if (outside.length) return res.status(400).json({ error: `字段 ${outside[0]} 不在白名单（本端点仅可写 transferredOutAt）` });
    const updated = {
      ...existing,
      transferredOutAt: body.transferredOutAt ? String(body.transferredOutAt) : null,
      annotatedAt: new Date().toISOString(),
    };
    writeRow(db, 'agenda_votes', updated);
    res.json(updated);
  });

  // 支书截止（不可逆）：置 votesLocked=true / voteDeadline；副书同权（2026-09-11 支书裁定），
  // 截止后不可解锁。单一源 constants.js::SECRETARY_AND_DEPUTY_ROLES（dogfood 权限专项 2026-09-13
  // 实证：此前仅 SECRETARY_ROLES → 副支书虽共用支书台，操作被 403 挡下，与副书同权裁定冲突）
  router.post('/agenda-votes/lock', requireRole(db, SECRETARY_AND_DEPUTY_ROLES), (req, res) => {
    const { activityId, votesLocked, voteDeadline } = req.body || {};
    if (!activityId) return res.status(400).json({ error: '缺少 activityId' });
    if (voteDeadline !== undefined && (typeof voteDeadline !== 'string' || !voteDeadline.trim())) {
      return res.status(400).json({ error: 'voteDeadline 须为非空字符串' });
    }
    const act = getRow(db, 'activities', activityId);
    if (!act) return res.status(404).json({ error: '活动不存在' });
    if (actorBranchId(req.actor) && actorBranchId(req.actor) !== (act.branchId || DEFAULT_BRANCH_ID)) return res.status(403).json({ error: '无权限：不能截止其他支部活动表决' });
    const merged = {
      ...act,
      // 截止不可逆：仅允许置 true，禁止解锁（传 false 不写入）
      ...(votesLocked === true ? { votesLocked: true } : {}),
      ...(voteDeadline ? { voteDeadline } : {}),
    };
    writeRow(db, 'activities', merged);
    res.json(merged);
  });

  // ════════════════════════════════════════════════════════════════
  //  支委会「待议池」候选（2026-11-10 批次 540 波次 2）
  // ════════════════════════════════════════════════════════════════
  // 口径契约：`content/04_web_design/contracts/AGENDA_DERIVATION_CONTRACT.md`。
  // 分类 / 议程文案 / 去重键 / 应到范围一律来自 `docs/src/core/domain/agenda-classify.js`
  //   （与前端 `agenda-form.js::buildAgendaPool` 同一函数 ⇒ 同一事项两端不得出现两种类型或两种文案）。
  // 本端点只做三件服务端才准算的事：① 按支部 / 角色过滤；② 去重（同一来源同一记录只出现一次）；
  //   ③ 应到名单与「待议天数」（跨人 / 跨设备必须一致的事实，见 `H32`）。
  // 读权限＝支委层（待议池是支委会的工作面，非支委不呈现）。
  // 本 router 挂在 `/api/v1` 下（见 app.js），故此处写全 `/committee/agenda-candidates`。
  router.get('/committee/agenda-candidates', requireCommissioner(db), (req, res) => {
    const requested = req.query.branchId ? String(req.query.branchId) : '';
    const scopeDeny = branchSelectionError(req.actor, requested);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const branchId = actorBranchId(req.actor) || requested;
    if (!branchId) return res.status(400).json({ error: '党委读取支部待议池前须先选择支部（?branchId=）' });

    const inBranch = (row) => !!row && (row.branchId || DEFAULT_BRANCH_ID) === branchId;
    // 在册成员：已转出（`users.transferOut === true`）不属本支部在册名单，不进任何应到 ——
    //   与 `GET /users` 读面（`index.js::resourceRowsForActor` 转出剔除）同口径。
    const members = listTable(db, 'users').filter(inBranch).filter((u) => u && u.transferOut !== true);
    const committee = resolveCommitteeIds(members);
    // 应到资格＝名册口径（党员 ∧ 非滞留）：判据单一源 = `docs/src/core/domain/roster-eligibility.js`，
    //   与名册统计 `computeRosterStats` 同一实现 ⇒ 滞留 / 转出成员不得计入应到（批次 541 · D-1）。
    const eligibleIds = new Set(rosterEligibleIds(members, getRosterConfig()));
    const committeeIds = (committee.error ? [] : committee.ids.map(String)).filter((id) => eligibleIds.has(id));

    /** 应到：制度报送党员大会 → 支部党员大会；其余 → 支委会（与分类同一判据） */
    const attendeesOf = (source) => {
      const scope = agendaAttendeeScope(source);
      const personIds = scope === 'branch-party-meeting'
        ? members.map((u) => String(u.id)).filter((id) => eligibleIds.has(id))
        : committeeIds;
      return { scope, count: personIds.length, personIds };
    };

    const seen = new Set();
    const items = [];
    const push = (source, ref, meta = '') => {
      const { attendees: scope, ...rest } = classifyAgendaItem({ source, ref });
      if (!rest.refId || seen.has(rest.dedupeKey)) return;
      seen.add(rest.dedupeKey);
      items.push({ ...rest, meta, attendees: attendeesOf(rest.source) });
    };

    // ① 专班事项（只收显式标明「待支委会表决」的报送；创建专班本身不在此列）
    for (const row of listTable(db, 'taskforces').filter(inBranch)) {
      const request = row.committeeRequest;
      if (!request || request.status !== 'pending') continue;
      push('taskforce-pending', { ...row, kind: request.kind },
        `专班报送${request.by ? ` · 报送人 ${request.by}` : ''}${request.note ? ` · ${request.note}` : ''}`);
    }

    // ② 意见反馈（归口含支委会、未办结 / 未隐藏 / 未合并）
    for (const row of listTable(db, 'issues').filter(inBranch)) {
      if (row.status !== 'open' || row.hidden || row.mergedInto || !isCommitteeIssue(row)) continue;
      push('issue-committee', row, `意见反馈 #${row.number || '—'}`);
    }

    // ②b 支委提案（D-869）：只收已受理、待排期的事项；按现有「意见反馈」类落池，不新增第九类
    for (const row of listTable(db, 'committee_proposals').filter(inBranch)) {
      if (row.status !== 'queued') continue;
      push('issue-committee', row, `支部提案${row.proposedBy ? ` · 提案人 ${row.proposedBy}` : ''}`);
    }

    // ③ 制度草案 / 待报送党员大会（同一判据 `isAgendaDraftDocCandidate`；党委行不进支部待议池）
    for (const row of listTable(db, 'branch_docs').filter(inBranch)) {
      if (row.ownerScope === 'committee' || !isAgendaDraftDocCandidate(row)) continue;
      push('institution-draft', row, isPartyMeetingPendingDoc(row)
        ? '制度（支委会已审议通过，待党员大会表决）'
        : (isInstitutionDoc(row) ? '制度草案（待支委会审议）' : '制度草案（草案态支部文件）'));
    }

    // ④ 发展对象推荐（候选＝现为「积极分子」的本支部在册成员）
    for (const row of members) {
      if (row.developStage !== '积极分子') continue;
      push('activist-recommend', row, '现为积极分子');
    }

    // ⑤ 品牌提案 / 活动批准 / 分工调整（活动实体自带的议题；判据同一源）
    for (const row of listTable(db, 'activities').filter(inBranch)) {
      if (isBrandProposalCandidate(row)) push('brand-proposal', row, '品牌认定提案');
      if (isActivityApprovalCandidate(row)) push('activity-approval', row, '待批活动');
      if (isAssignmentAdjustCandidate(row)) push('assignment-adjust', row, '分工调整议题');
    }

    const order = new Map(ALL_AGENDA_SOURCES.map((s, i) => [s.value, i]));
    items.sort((a, b) => (order.get(a.source) ?? 99) - (order.get(b.source) ?? 99)
      || String(a.refId).localeCompare(String(b.refId)));
    res.json(items);
  });

  return router;
}

// ⚠ 置尾保行号：`README-server.md` 以本文件 `:40-43` / `:56-92` / `:113-156` / `:161-177` 为取证靶点
//   ⇒ 新增依赖写在文件末尾（import 声明被提升，语义不变；批次 540 波次 2 沿用 `routes/auth.js` 同法）。
import {
  classifyAgendaItem,
  agendaAttendeeScope,
  ALL_AGENDA_SOURCES,
  isCommitteeIssue,
  isAgendaDraftDocCandidate,
  isInstitutionDoc,
  isPartyMeetingPendingDoc,
  isBrandProposalCandidate,
  isActivityApprovalCandidate,
  isAssignmentAdjustCandidate,
} from '../../docs/src/core/domain/agenda-classify.js';
// 应到资格判据单一源（批次 541 · D-1）：党员 ∧ 非滞留 的纯函数与名册统计共用同一实现
//   （`docs/src/services/member/roster.js` 亦 import 本模块），故待议池应到与名册统计不得出现两套口径。
import { getRosterConfig, rosterEligibleIds } from '../../docs/src/core/domain/roster-eligibility.js';
