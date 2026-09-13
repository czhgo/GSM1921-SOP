// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/system-notice-kinds.js — 系统派生通知 kind 注册表
//  R-22（2026-09-13）：系统派生通知（业务流程副作用自动发的通知）此前由前端
//  NoticeStore.add(notice)（不传 actorRole）产生，并靠客户端自述 systemDerived 标记
//  让服务端写门放行——该标记可伪造，任何登录成员都能借此发任意广播通知。
//  本注册表把生成权收回服务端：
//    · authorize(ctx) —— 服务端按「业务对象是否存在 + actor 与该对象的关系」自行复算，不信客户端；
//    · build(ctx)     —— 标题/正文/受众/落点由服务端生成；模板单一源 =
//                        docs/src/core/system-notice-templates.js（前端 mock 模式复用，文案零失同步）。
//  端点：POST /api/v1/system-notices（server/routes/system-notices.js；未登录 401 / 未知 kind 400 /
//        authorize 不通过 403 / 通过 201 并落库 notices 表）。
//  ctx = { actor, sourceId, payload, db }
//  角色集合单一源 = docs/src/core/constants.js（勿手写 5 支委授权列表，roles-sync 守卫会拦）。
// ════════════════════════════════════════════════════════════════
import { BRANCH_COMMISSION_ROLES, SECRETARY_AND_DEPUTY_ROLES, PARTY_STAFF_ROLE } from '../docs/src/core/constants.js';
import { buildSystemNotice } from '../docs/src/core/system-notice-templates.js';

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
  // 思想汇报为前端本地归集域（服务端无对应表，无法验对象）→ 以「actor 即提交人」判定：
  // personId 必须等于登录人（不可冒充他人提交）；组织委员有权阅处，一并放行。
  'thought-report-submitted': {
    authorize({ actor, payload }) {
      if (!actor) return false;
      const p = payloadOf({ payload });
      return actor.id === p.personId || actor.role === 'org-commissioner';
    },
  },

  // ── 考勤已确认并归档 ──────────────────────────────────────────
  // 对象：活动必须存在；actor 为该活动纪检确认人（纪检委员）、该活动组织者，或书记/副书记。
  'attendance-confirmed': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      const act = rowOf(db, 'activities', sourceId);
      if (!act) return false;
      return actor.role === 'disc-commissioner'
        || act.organizer === actor.id
        || SECRETARY_DEPUTY_SET.has(actor.role);
    },
  },

  // ── 议程已更新 ────────────────────────────────────────────────
  // 对象：活动必须存在；编辑议程属支委层功能位 → 仅支委层可触发。
  'activity-agenda-updated': {
    authorize({ actor, sourceId, db }) {
      if (!actor) return false;
      return !!rowOf(db, 'activities', sourceId) && COMMITTEE_ROLE_SET.has(actor.role);
    },
  },

  // ── 成员变更已审批通过 ────────────────────────────────────────
  // 对象：申请必须存在；组织委员审批专属（approve 为组织委员功能位）。
  'member-change-approved': {
    authorize({ actor, sourceId, db }) {
      if (!actor || actor.role !== 'org-commissioner') return false;
      return !!rowOf(db, 'member_change_requests', sourceId);
    },
  },

  // ── 支部分工调整议题待表决 / 已生效 ─────────────────────────────
  // 对象：来源支委会活动必须存在；发起/采纳分工议题为书记/副书记（副书同权）。
  'workforce-proposal-created': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !SECRETARY_DEPUTY_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
  },
  'workforce-proposal-adopted': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !SECRETARY_DEPUTY_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
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
      const vars = { ...payloadOf(ctx), sourceId: ctx.sourceId };
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
  // 表决截止：对象=活动存在；截止表态为书记/副书记（副书同权）功能位。
  'committee-vote-locked': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !SECRETARY_DEPUTY_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
    },
  },

  // ── 赋权通知 ──────────────────────────────────────────────────
  // 对象：来源项目（活动/专班）必须存在；赋权动作属支委层（书记/副书记/组织/宣传/纪检）。
  'project-auth-granted': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !COMMITTEE_ROLE_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId) || !!rowOf(db, 'taskforces', sourceId);
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
  },
  // 批复：对象=上报记录存在；审批人为党委组织员。
  'review-request-decided': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !PARTY_STAFF_SET.has(actor.role)) return false;
      return !!rowOf(db, 'review_requests', sourceId);
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
  },

  // ── 专班议案排入线上支委会待表态 ───────────────────────────────
  // 对象：排入的支委会活动必须存在；报送发起属支委层（组织委员/书记等）。
  'taskforce-vote-requested': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !COMMITTEE_ROLE_SET.has(actor.role)) return false;
      return !!rowOf(db, 'activities', sourceId);
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

  // ── 党委下发（党委组织员人工下发至支部委员会） ──────────────────
  // 对象：目标支部必须存在；仅党委组织员可下发。
  'committee-dispatch': {
    authorize({ actor, sourceId, db }) {
      if (!actor || !PARTY_STAFF_SET.has(actor.role)) return false;
      return !!rowOf(db, 'branches', sourceId);
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
