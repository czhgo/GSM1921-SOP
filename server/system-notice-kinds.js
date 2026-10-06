// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/system-notice-kinds.js — 系统派生通知 kind 注册表
//  R-22（2026-09-13）：系统派生通知（业务流程副作用自动发的通知）此前由前端
//  NoticeStore.add(notice)（不传 actorRole）产生，并靠客户端自述 systemDerived 标记
//  让服务端写门放行——该标记可伪造，任何登录成员都能借此发任意广播通知。
//  本注册表把生成权收回服务端：
//    · authorize(ctx) —— 服务端按「业务对象是否存在 + actor 与该对象的关系」自行复算，不信客户端；
//    · build(ctx)     —— 标题/正文/受众/落点由服务端生成；模板单一源 =
//                        docs/src/core/domain/system-notice-templates.js（前端 mock 模式复用，两处文案不会未同步）。
//  端点：POST /api/v1/system-notices（server/routes/system-notices.js；未登录 401 / 未知 kind 400 /
//        authorize 不通过 403 / 通过 201 并落库 notices 表）。
//  ctx = { actor, sourceId, payload, db }
//  角色集合单一源 = docs/src/core/domain/constants.js（勿手写 5 支委授权列表，roles-sync 守卫会拦）。
// ════════════════════════════════════════════════════════════════
import { BRANCH_COMMISSION_ROLES, SECRETARY_AND_DEPUTY_ROLES, PARTY_STAFF_ROLE, ROLE_LABELS } from '../docs/src/core/domain/constants.js';
import { buildSystemNotice } from '../docs/src/core/domain/system-notice-templates.js';
// R-23②（2026-10-05 批次 391）：支部上报的「支部名 / 事项摘要」展示值单一源（**零依赖叶子**，前端同引一处）
import { branchDisplayName, reviewRequestSubject } from '../docs/src/core/domain/review-request-labels.js';
// 补录#1（2026-10-05 批次 407）：`payload.resource` → 服务端表名的单一源（勿另写一张名表）
import { RESOURCE_TABLES } from './routes/resources/store.js';
// R-23 余项（2026-10-06 批次 422 · `D-803`③）：服务端**人员名册读口**——通知里的人名不再无条件采信 payload
import { applyRosterNames } from './person-roster.js';

const COMMITTEE_ROLE_SET = new Set(BRANCH_COMMISSION_ROLES);
const SECRETARY_DEPUTY_SET = new Set(SECRETARY_AND_DEPUTY_ROLES);
const PARTY_STAFF_SET = new Set(PARTY_STAFF_ROLE);
// 组长可创建的活动类型（对齐 activities 写门 _assertActivityWrite / 组长手册）
const LEADER_ACTIVITY_TYPES = new Set(['党小组会', '主题党日']);

/** 读单行（JSON 解包；表名由调用方以字面量传入，非用户输入） */
function rowOf(db, table, id) {
  if (!db || !id) return null;
  try {
    const r = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
    return r ? JSON.parse(r.data) : null;
  } catch (_) {
    return null;
  }
}

/** 读全表（JSON 解包） */
function rowsOf(db, table) {
  if (!db) return [];
  try {
    return db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));
  } catch (_) {
    return [];
  }
}

/** payload 归一（非对象 → 空对象） */
function payloadOf(ctx) {
  const p = ctx && ctx.payload;
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}

/** 活动可表决应到名单（voteConfig.voterIds） */
function voterIdsOf(act) {
  return act && act.voteConfig && Array.isArray(act.voteConfig.voterIds) ? act.voteConfig.voterIds : [];
}

const KINDS = {
  // ── 思想汇报已提交 ────────────────────────────────────────────
  // R-23（2026-09-13）：思想汇报已建服务端表（thought_reports，随快照写穿同步）——
  //   原「服务端无表」只能采信客户端自述 personId（无法验对象）。现改为按 sourceId 读表复算：
  //   ① 表内无该汇报 → 403（杜绝凭空伪造「已提交」通知）；
  //   ② 提交人本人（row.personId === actor.id，不可冒充他人）或有权阅处角色（组织委员＝思想汇报归口）→ 放行。
  'thought-report-submitted': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const row = rowOf(db, 'thought_reports', sourceId);
      if (!row) return false;
      return row.personId === actor.id || actor.role === 'org-commissioner';
    },
    // 2026-09-13 面板数据改造：展示值（提交人姓名 / 期次）由服务端**按表复算**，与 authorize 同源——
    // 原实现只转发客户端 payload.personName，等于允许「通知里写别人的名字」。现一律以表内行为准。
    build(ctx) {
      const row = rowOf(ctx.db, 'thought_reports', ctx.sourceId) || {};
      return buildSystemNotice('thought-report-submitted', {
        sourceId: ctx.sourceId,
        personName: row.personName,
        period: row.period,
      });
    },
  },

  // ── 考勤已确认并归档 ──────────────────────────────────────────
  // 对象：活动必须存在；actor 为该活动纪检确认人（纪检委员）、该活动组织者，或支书/副支书。
  'attendance-confirmed': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const act = rowOf(db, 'activities', sourceId);
      if (!act) return false;
      return actor.role === 'disc-commissioner'
        || act.organizer === actor.id
        || SECRETARY_DEPUTY_SET.has(actor.role);
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload；
    //   人名按**名册**复算（`server/person-roster.js`）；payload 不带 `<x>Id` 或名册查无者**沿用 payload**（已登记余项）。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId) || {};
      if (act.title !== undefined) vars.activityTitle = act.title;
      return buildSystemNotice('attendance-confirmed', vars);
    },
  },

  // ── 议程已更新 ────────────────────────────────────────────────
  // 对象：活动必须存在；编辑议程属支委层功能位 → 仅支委层可触发。
  'activity-agenda-updated': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      return !!rowOf(db, 'activities', sourceId) && COMMITTEE_ROLE_SET.has(actor.role);
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload；
    //   人名按**名册**复算（`server/person-roster.js`）；payload 不带 `<x>Id` 或名册查无者**沿用 payload**（已登记余项）。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId) || {};
      if (act.title !== undefined) vars.activityTitle = act.title;
      return buildSystemNotice('activity-agenda-updated', vars);
    },
  },

  // ── 成员变更已审批通过 ────────────────────────────────────────
  // 对象：申请必须存在；组织委员审批专属（approve 为组织委员功能位）。
  'member-change-approved': {
    authorize({ actor, sourceId, db }) {
      if (!actor || actor.role !== 'org-commissioner') return false;
      return !!rowOf(db, 'member_change_requests', sourceId);
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload。
    // 2026-10-06 批次 426（`R-23` 余项收口）：**成员**改「按源行派生配对 id」——源行 `personId` 补进 vars 后，
    //   由 `applyRosterNames` 按名册复算 `personName`（authorize 已核该申请存在）。
    build(ctx) {
      const raw = { ...payloadOf(ctx), sourceId: ctx.sourceId };
      const row = rowOf(ctx.db, 'member_change_requests', ctx.sourceId) || {};
      if (row.personId) raw.personId = row.personId;
      const vars = applyRosterNames(ctx.db, raw);
      if (row.fromStage !== undefined) vars.fromStage = row.fromStage;
      if (row.toStage !== undefined) vars.toStage = row.toStage;
      return buildSystemNotice('member-change-approved', vars);
    },
  },

  // ── 支部分工调整议题待表决 / 已生效 ─────────────────────────────
  // 对象：来源支委会活动必须存在；发起/采纳分工议题为支书/副支书（副书同权）。
  'workforce-proposal-created': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !SECRETARY_DEPUTY_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload；
    //   人名按**名册**复算（`server/person-roster.js`）；payload 不带 `<x>Id` 或名册查无者**沿用 payload**（已登记余项）。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId) || {};
      if (act.title !== undefined) vars.activityTitle = act.title;
      return buildSystemNotice('workforce-proposal-created', vars);
    },
  },
  'workforce-proposal-adopted': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !SECRETARY_DEPUTY_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
    // 分工自动传递（2026-09-13 支书裁定）：行动计划由服务端按来源活动的 extras.proposal
    // **复算**（不信客户端自述）——取变更后由「角色」承担的负责人 → actionRoles 定向派生
    // 「履职」待办；到人（person）负责人的待办由前端 workforce.js 直接派生。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId);
      const proposal = act && act.extras && Array.isArray(act.extras.proposal) ? act.extras.proposal : [];
      const roles = [...new Set(proposal
        .map((c) => (c && c.to && c.to.ownerType === 'role' ? c.to.ownerId : null))
        .filter(Boolean))];
      // 到人负责人（角色数组表达不了）→ 按人定向送达；支委层照旧知晓（支部内政）
      const persons = [...new Set(proposal
        .map((c) => (c && c.to && c.to.ownerType === 'person' ? c.to.ownerId : null))
        .filter(Boolean))];
      vars.audience = 'committee';
      if (persons.length) vars.audiencePersons = persons;
      if (roles.length) {
        vars.actionRoles = roles;
        vars.actionable = true;
        vars.actionTask = '支部分工已生效，请按新分工履职';
      }
      return buildSystemNotice('workforce-proposal-adopted', vars);
    },
  },

  // ── 线上支委会表态更新 / 表决截止 ──────────────────────────────
  // 表态进度：对象=活动存在；actor 为该活动应到名单成员或支委层。
  'committee-vote-progress': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const act = rowOf(db, 'activities', sourceId);
      if (!act) return false;
      const listed = voterIdsOf(act);
      return listed.includes(actor.id) || COMMITTEE_ROLE_SET.has(actor.role);
    },
    // 计数由服务端复算（读 agenda_votes 去重 personId；分母取该活动应到名单）
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId);
      if (act) {
        const votes = rowsOf(ctx.db, 'agenda_votes').filter((v) => v.activityId === ctx.sourceId && v.personId);
        vars.voted = new Set(votes.map((v) => v.personId)).size;
        const listed = voterIdsOf(act);
        if (listed.length) vars.total = listed.length;
      }
      return buildSystemNotice('committee-vote-progress', vars);
    },
  },
  // 表决截止：对象=活动存在；截止表态为支书/副支书（副书同权）功能位。
  'committee-vote-locked': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !SECRETARY_DEPUTY_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
  },

  // ── 赋权通知 ──────────────────────────────────────────────────
  // 对象：来源项目（活动 / 专班）必须存在。
  // 授权（2026-10-02 批次 338 · 支书裁「甲」· `SOP-G-1` 授权口径收口）：
  //   ① **支委层**（支书 / 副支书 / 组织 / 宣传 / 纪检——赋权动作的原授权面）；
  //   ② **党小组组长（role key ＝ `leader`）**——支书 2026-10-02 圈定「放宽至**该场组织者本人 ＋ 组长**」，
  //      与前端「能看见『确认赋权』即能提交」的放行面**对齐**（两端口径同一份，`D-741`）；
  //   ③ **该场现任组织者本人**——项目角色行（活动＝`activity.assignments[]` / 专班＝`taskforce.members[]`
  //      内 `role === 'organizer'`）的 `personId` ＝ actor.id；**形状与判据同** `organizer-transfer.js::organizerOf`（单一源）。
  //   ⚠ 病灶（`SOP-G-1`）：旧判据只看「支委层 ＋ 对象存在」⇒ 前端放行、服务端 **403 静默丢弃**；本批收口。
  'project-auth-granted': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const act = rowOf(db, 'activities', sourceId);
      const tf = rowOf(db, 'taskforces', sourceId);
      if (!act && !tf) return false;
      if (COMMITTEE_ROLE_SET.has(actor.role)) return true;
      if (actor.role === 'leader') return true;
      const proj = act ? (act.assignments || []) : ((tf && tf.members) || []);
      return proj.some((x) => x && x.role === 'organizer' && x.personId === actor.id);
    },
    // R-23②（2026-10-05 批次 391）：**项目名按表复算**（`activities.title` / `taskforces.name`，不采信客户端——
    //   口径与 `organizer-transferred` 同一份）。
    // 2026-10-06 批次 426（`R-23` 余项收口）：**授权人**改「按源行派生配对 id」——授权人＝本请求的 `actor`（服务端
    //   已知，无需采信客户端），补 `authorizerId` 后由 `applyRosterNames` **按名册复算** `authorizerName`。
    // 2026-10-06 批次 427（`R-23` 余项收口 · 角色标签）：**角色标签改按 `role` 键复算**——单一源＝
    //   `docs/src/core/domain/constants.js::ROLE_LABELS`（`organizer`→组织者 / `deep`→深度参与者；**服务端与前端同引一处**），
    //   前端 `services/core/auth.js::_notifyProjectAuth` 随包带 `role` 键。**仍沿用 payload 的只剩落点 `targetPage`**
    //   （「进谁的台」取决于被赋权人身份 ⇒ 属前端口径，非展示值漏洞）。
    build(ctx) {
      const raw = { ...payloadOf(ctx), sourceId: ctx.sourceId };
      if (ctx.actor && ctx.actor.id) raw.authorizerId = ctx.actor.id;
      if (raw.role && ROLE_LABELS[raw.role]) raw.roleLabel = ROLE_LABELS[raw.role];
      const vars = applyRosterNames(ctx.db, raw);
      const act = rowOf(ctx.db, 'activities', ctx.sourceId);
      const tf = rowOf(ctx.db, 'taskforces', ctx.sourceId);
      if (act && act.title) vars.projectName = act.title;
      else if (tf && tf.name) vars.projectName = tf.name;
      return buildSystemNotice('project-auth-granted', vars);
    },
  },

  // ── 材料外发待确认 ────────────────────────────────────────────
  // 对象：外发记录（若已落库）/actor 必须是该记录的发送人。
  'external-dispatch-created': {
    authorize({ actor, sourceId, payload, db }) {
      if (!actor) return false;
      const rec = rowOf(db, 'external_dispatches', sourceId);
      const senderId = rec ? rec.senderId : payloadOf({ payload }).senderId;
      return !!senderId && actor.id === senderId;
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload。
    // 2026-10-06 批次 426（`R-23` 余项收口）：**发送人**改「按源行派生配对 id」——源行 `senderId` 补进 vars 后，
    //   由 `applyRosterNames` 按名册复算 `senderName`（该 id 即本请求 actor，authorize 已核）。
    build(ctx) {
      const raw = { ...payloadOf(ctx), sourceId: ctx.sourceId };
      const row = rowOf(ctx.db, 'external_dispatches', ctx.sourceId) || {};
      if (row.senderId) raw.senderId = row.senderId;
      const vars = applyRosterNames(ctx.db, raw);
      if (row.refLabel !== undefined) vars.refLabel = row.refLabel;
      if (row.receiverRole !== undefined) vars.receiverRole = row.receiverRole;
      return buildSystemNotice('external-dispatch-created', vars);
    },
  },

  // ── 宣传周报已报送待支书审核（SOP-B-40 ②，2026-09-19 批次 94）────────────────
  // 对象：周报表必须存在（表 weekly_reports，随快照写穿）；授权＝提交人本人或宣传委员归口
  //   （与 thought-report-submitted 同款：不信客户端自述的姓名/周次，展示值由模板按表内容传参）。
  'weekly-report-submitted': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const row = rowOf(db, 'weekly_reports', sourceId);
      if (!row) return false;
      return row.submittedBy === actor.id || actor.role === 'prop-commissioner';
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload。
    // 2026-10-06 批次 426（`R-23` 余项收口）：**报送人**改「按源行派生配对 id」——源行 `submittedBy` 补 `submitterId`
    //   后，由 `applyRosterNames` 按名册复算 `submitterName`（authorize 已核 submittedBy）。
    build(ctx) {
      const raw = { ...payloadOf(ctx), sourceId: ctx.sourceId };
      const row = rowOf(ctx.db, 'weekly_reports', ctx.sourceId) || {};
      if (row.submittedBy) raw.submitterId = row.submittedBy;
      const vars = applyRosterNames(ctx.db, raw);
      if (row.week !== undefined) vars.week = row.week;
      if (row.weekRange !== undefined) vars.weekRange = row.weekRange;
      return buildSystemNotice('weekly-report-submitted', vars);
    },
  },

  // ── 支部上报待批复 / 上报结论 ──────────────────────────────────
  // 提交：对象=上报记录存在；发起人为该记录提交人（或本支部支委层）。
  'review-request-submitted': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const row = rowOf(db, 'review_requests', sourceId);
      if (!row) return false;
      return row.submittedBy === actor.id || COMMITTEE_ROLE_SET.has(actor.role);
    },
    // R-23②（2026-10-05 批次 391）：**支部名 / 事项摘要按表复算**——单一源＝零依赖叶子
    //   `docs/src/core/domain/review-request-labels.js`（前端 `review-request.js` 同引一处）。
    //   行缺失时回落默认包装（与改动前同形）。
    // 2026-10-06 批次 426（`R-23` 余项收口）：**发起人**改「按源行派生配对 id」——源行 `submittedBy` 补
    //   `submitterId` 后，由 `applyRosterNames` 按名册复算 `submitterName`（authorize 已核该提交人）。
    build(ctx) {
      const raw = { ...payloadOf(ctx), sourceId: ctx.sourceId };
      const row = rowOf(ctx.db, 'review_requests', ctx.sourceId);
      if (row && row.submittedBy) raw.submitterId = row.submittedBy;
      const vars = applyRosterNames(ctx.db, raw);
      if (row) {
        vars.branchLabel = branchDisplayName(row.branchId, rowOf(ctx.db, 'branches', row.branchId));
        vars.subject = reviewRequestSubject(row);
      }
      return buildSystemNotice('review-request-submitted', vars);
    },
  },
  // 批复：对象=上报记录存在；审批人为党委组织员。
  'review-request-decided': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !PARTY_STAFF_SET.has(actor.role)) return false;
      return !!rowOf(db, 'review_requests', sourceId);
    },
    // R-23②（同批次）：支部名 / 事项摘要 / **结论 / 意见**按表复算——`approved` 由 `review_requests.status`
    //   复算（不采信 payload 的自述结论）。行缺失时回落默认包装。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const row = rowOf(ctx.db, 'review_requests', ctx.sourceId);
      if (row) {
        vars.branchLabel = branchDisplayName(row.branchId, rowOf(ctx.db, 'branches', row.branchId));
        vars.subject = reviewRequestSubject(row);
        vars.approved = row.status === 'approved';
        if (row.decisionNote !== undefined) vars.decisionNote = row.decisionNote;
      }
      return buildSystemNotice('review-request-decided', vars);
    },
  },

  // ── 活动已创建请建核心群 ──────────────────────────────────────
  // 对象：活动必须存在；支委层可建任意活动，组长限党小组会/主题党日。
  'activity-created-broadcast': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const act = rowOf(db, 'activities', sourceId);
      if (!act) return false;
      if (COMMITTEE_ROLE_SET.has(actor.role)) return true;
      return actor.role === 'leader' && LEADER_ACTIVITY_TYPES.has(act.type);
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload；
    //   人名按**名册**复算（`server/person-roster.js`）；payload 不带 `<x>Id` 或名册查无者**沿用 payload**（已登记余项）。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId) || {};
      if (act.title !== undefined) vars.activityTitle = act.title;
      if (act.date !== undefined) vars.date = act.date;
      if (act.location !== undefined) vars.location = act.location;
      return buildSystemNotice('activity-created-broadcast', vars);
    },
  },

  // ── 专班议案排入线上支委会待表态 ───────────────────────────────
  // 对象：排入的支委会活动必须存在；报送发起属支委层（组织委员/支书等）。
  'taskforce-vote-requested': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !COMMITTEE_ROLE_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
    // R-23②（2026-10-05 批次 390）：展示值**按表复算**——对象字段不采信客户端 payload；
    //   人名按**名册**复算（`server/person-roster.js`）；payload 不带 `<x>Id` 或名册查无者**沿用 payload**（已登记余项）。
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId) || {};
      if (act.title !== undefined) vars.activityTitle = act.title;
      if (act.date !== undefined) vars.date = act.date;
      return buildSystemNotice('taskforce-vote-requested', vars);
    },
  },

  // ── 复盘超期提醒 / 流程超时提醒 ────────────────────────────────
  // 纪检委员超期确认后触达组织者（纪检指南 §3.1）。
  'review-overdue-reminder': {
    authorize({ actor }) {
      return !!actor && actor.role === 'disc-commissioner';
    },
  },
  'review-resubmit-reminder': {
    authorize({ actor }) {
      return !!actor && actor.role === 'disc-commissioner';
    },
  },

  // ── 活动预拟通知 ──────────────────────────────────────────────
  // 对象：活动必须存在；创建活动时随表单发布 → 支委层。
  'activity-notice-draft': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !COMMITTEE_ROLE_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
  },

  // ── 专班预拟通知 ──────────────────────────────────────────────
  // 对象：专班必须存在；专班创建/报送为组织委员功能位（支委层一并放行）。
  'taskforce-notice-draft': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      if (!(actor.role === 'org-commissioner' || COMMITTEE_ROLE_SET.has(actor.role))) return false;
      return !!rowOf(db, 'taskforces', sourceId);
    },
  },

  // ── 补课材料催办（V-7 · 2026-10-01 批次 324）──────────────────────
  // V-7 裁定（甲）：**当事人本人是补课主体 · 纪检是补课闭环责任人（由纪检催当事人）· 组织委员不承担该链任何动作**。
  // 对象：补课任务必须存在（表 `makeup_tasks`——README-server.md §3.2 的资源表，随快照写穿同步）；
  // 授权＝**仅纪检委员**（补课闭环责任人；本通知就是「纪检催当事人」这一动作的留痕）。
  // 展示值（当事人 / 缺席活动 / 截止日）一律由服务端**按表复算**，不信客户端自述；
  // 受众＝到人定向（模板内 `audiencePersons`），故**不会**广播给全支部。
  'makeup-remind': {
    authorize({ actor, sourceId, db }) {
      if (!actor || actor.role !== 'disc-commissioner') return false;
      return !!rowOf(db, 'makeup_tasks', sourceId);
    },
    build(ctx) {
      const row = rowOf(ctx.db, 'makeup_tasks', ctx.sourceId) || {};
      return buildSystemNotice('makeup-remind', {
        sourceId: ctx.sourceId,
        personId: row.personId,
        personName: row.personName,
        activityName: row.activityName,
        deadline: row.deadline,
      });
    },
  },

  // ── 党委下发（党委组织员人工下发至支部委员会） ──────────────────
  // 对象：目标支部必须存在；仅党委组织员可下发。
  'committee-dispatch': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !PARTY_STAFF_SET.has(actor.role)) return false;
      return !!rowOf(db, 'branches', sourceId);
    },
  },

  // ── 组织者已转交（2026-10-01 批次 330 · 支书裁「补：通知原组织者」）──────────
  // 对象：来源项目（活动 / 专班）必须存在。
  // 授权：① **支委层**（转交可发起人＝支书 / 副支书 / 组织委员，皆支委层——见 organizer-transfer.js）；
  //      ② **被退出的原组织者本人**（`payload.removedPersonId === actor.id`）——此时受众（模板内
  //         `audiencePersons`）取的是**同一个 payload 字段**，故该通知**只可能发给他本人** ⇒
  //         不构成「借他人名义给别人发『你被换下了』」的面（R-22：不自述可信，此处自述只会伤及本人）。
  // 展示值：**项目名按表复算**（`activities.title` / `taskforces.name`，不采信客户端）；人名沿用 payload
  //         （同 `project-auth-granted` 的既有做法——人名不在本服务端可读表内）。
  'organizer-transferred': {
    authorize({ actor, sourceId, payload, db }) {
      if (!actor) return false;
      if (!rowOf(db, 'activities', sourceId) && !rowOf(db, 'taskforces', sourceId)) return false;
      const removed = payloadOf({ payload }).removedPersonId;
      return COMMITTEE_ROLE_SET.has(actor.role) || (!!removed && removed === actor.id);
    },
    build(ctx) {
      const vars = applyRosterNames(ctx.db, { ...payloadOf(ctx), sourceId: ctx.sourceId });
      const act = rowOf(ctx.db, 'activities', ctx.sourceId);
      const tf = rowOf(ctx.db, 'taskforces', ctx.sourceId);
      if (act) {
        vars.label = '活动';
        vars.targetType = 'activity';
        if (act.title) vars.projectName = act.title;   // 项目名按表复算（不采信客户端同名值）
      } else if (tf) {
        vars.label = '专班';
        vars.targetType = 'taskforce';
        if (tf.name) vars.projectName = tf.name;
      }
      return buildSystemNotice('organizer-transferred', vars);
    },
  },

  // ── 待办作废已裁决（`#1`/`D-742`；2026-10-02 批次 340）────────────────────
  // 场景：责任人 `requestVoid` → 支书/副支书在支书台确认或驳回该作废申请后的**站内知会**
  //   （支书 2026-10-02 语：「支书如果不认为这个待办能取消，或者说即使取消也要让某个委员知情，
  //   让他知道管理上可以优化」）⇒ **两个分支都发**。
  // 授权：① actor 为**支委层**（确认/驳回动作的功能位）；② 被裁决的待办行必须存在。
  //   ⚠ **不**要求行上已带 `voided/voidRejected`：前端全量快照写穿是**防抖**的（`data-adapter::_scheduleSnapshot`），
  //   裁决后立即发通知时服务端往往尚未收到该字段——若以此判据会误 403（如实登记，见 `D-743`）。
  // 展示值：**待办标题 / 受众一律按 `todos` 行复算**（不采信客户端）；`decision/reason` 取 payload
  //   （裁决事实由前端在授权门内自述，属知会文案，不改变任何落库字段）。
  'todo-void-decided': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !COMMITTEE_ROLE_SET.has(actor.role)) return false;
      return !!rowOf(db, 'todos', sourceId);
    },
    build(ctx) {
      const row = rowOf(ctx.db, 'todos', ctx.sourceId) || {};
      const p = payloadOf(ctx);
      return buildSystemNotice('todo-void-decided', {
        sourceId: ctx.sourceId,
        todoTitle: row.title || p.todoTitle || '该待办',
        decision: p.decision === 'rejected' || row.voidRejected ? 'rejected' : 'confirmed',
        reason: p.reason || (row.voided && row.voided.reason) || (row.voidRejected && row.voidRejected.reason) || '',
        audience: row.role ? [row.role] : undefined,
      });
    },
  },

  // ── 业务记录作废已裁决（`CRUD-4`/`CRUD-6` · 补录#1；2026-10-05 批次 407 · 支书圈「新建通知 kind」）──
  // 场景：责任人 `requestVoid` → 支委层在支书台**确认**或**驳回**该**业务记录**作废申请后的**到人知会**
  //   （与 `todo-void-decided` 同口径；本条补的是「业务记录」那一面：原只发待办作废、记录作废无派生知会）。
  // 授权：① actor 为**支委层**（裁决动作的功能位）；② `payload.resource` 须在 `RESOURCE_TABLES` 内
  //   （服务端已知资源表，勿信客户端自造名）；③ 该记录行必须存在（按表复算）。
  // 受众：**申请人本人**（按记录行复算 `voided.byPersonId` / `voidRejected.byPersonId`）——**到人定向**、
  //   不发角色广播（消除补录#1 登记的缺口：申请人（非支委）收不到裁决知会）。
  // 展示值：记录标签 / 原因取 payload（知会文案，同 `todo-void-decided`「裁决事实由前端在授权门内自述」口径）。
  'record-void-decided': {
    authorize({ actor, payload, sourceId, db }) {
      if (!actor || !COMMITTEE_ROLE_SET.has(actor.role)) return false;
      const table = RESOURCE_TABLES[payloadOf({ payload }).resource];
      if (!table || !sourceId) return false;
      return !!rowOf(db, table, sourceId);
    },
    build(ctx) {
      const p = payloadOf(ctx);
      const table = RESOURCE_TABLES[p.resource];
      const row = table ? (rowOf(ctx.db, table, ctx.sourceId) || {}) : {};
      const applicant = (row.voided && row.voided.byPersonId) || (row.voidRejected && row.voidRejected.byPersonId) || '';
      return buildSystemNotice('record-void-decided', {
        sourceId: ctx.sourceId,
        label: p.label || '',
        decision: p.decision === 'rejected' ? 'rejected' : 'confirmed',
        reason: p.reason || '',
        audiencePersons: applicant ? [applicant] : undefined,
      });
    },
  },
};

// 统一 build 包装：sourceId 由服务端注入并置于末位，杜绝客户端 payload 覆盖落点锚点。
for (const [kind, def] of Object.entries(KINDS)) {
  if (!def.build) {
    def.build = (ctx) => buildSystemNotice(kind, { ...payloadOf(ctx), sourceId: ctx.sourceId });
  }
}

export const SYSTEM_NOTICE_KINDS = KINDS;

/** 全部 kind 名（供端点校验/调试） */
export const SYSTEM_NOTICE_KIND_NAMES = Object.keys(KINDS);
