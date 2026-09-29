// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/gates.js —— **资源写门（全部角色门）**
//  切分依据：资源级写门与「支委身份写门靶向判据」互相引用 ⇒ 必须同文件（拆开即成环）；逐字搬迁、口径零改写。
// ════════════════════════════════════════════════════════════════

import { requireAuth, requireCommissioner } from '../auth.js';
import { BRANCH_COMMISSION_ROLES, PARTY_STAFF_ROLE as PARTY_STAFF_KEYS, SECRETARY_AND_DEPUTY_ROLES, NOTICE_PUBLISH_ROLES, NOTICE_MANAGE_ROLES, MEMBER_FLOW_ROLES, ORG_COMMISSIONER_ROLES, branchCommissionerWriteDeny, isAnonymousForced } from '../../../docs/src/core/domain/constants.js';
import { RESOURCE_TABLES } from './store.js';

// ── P3 上线前收紧（2026-09-03，design §7 登记项落地）：资源级写角色门 ──────────
// 默认仍 requireAuth；以下资源写权限按角色收紧（防支部成员自批/篡改治理档案）：
//   branches / appointmentRecords / users → 仅 party-staff（党委组织员/党务老师）
//   reviewRequests → POST=本支部支委层（同支部校验）；PATCH/DELETE=party-staff（党委审批）
// P2c（2026-09-03）：角色集单一源 = constants.js（勿手写）
export const PARTY_STAFF_ROLE = new Set(PARTY_STAFF_KEYS);
export const BRANCH_COMMITTEE_ROLES = new Set(BRANCH_COMMISSION_ROLES);
const NOTICE_PUBLISH_ROLE_SET = new Set(NOTICE_PUBLISH_ROLES);
const NOTICE_MANAGE_ROLE_SET = new Set(NOTICE_MANAGE_ROLES);
// 2026-09-14 批次 25：党小组管理角色集（支书含副支书）单一源 = constants.js::SECRETARY_AND_DEPUTY_ROLES（勿手写）
export const SECRETARY_AND_DEPUTY_ROLE_SET = new Set(SECRETARY_AND_DEPUTY_ROLES);
// 2026-09-14 批次 25：成员流动登记角色集（组织委员 + 支书/副支书）单一源 = constants.js::MEMBER_FLOW_ROLES
const MEMBER_FLOW_ROLE_SET = new Set(MEMBER_FLOW_ROLES);
export const RESOURCE_WRITE_GATE = {
  branches: 'party-staff',
  appointmentRecords: 'party-staff',
  users: { post: 'party-staff', patch: 'branch-commissioner', delete: 'party-staff' },
  reviewRequests: { post: 'branch-committee', patch: 'party-staff', delete: 'party-staff' },
  // 通知（2026-09-13 dogfood 权限专项）：发布=支书/副支书/组织/宣传，管理（编辑/删除）=发布者+纪检；
  // 角色名单单一源 = constants.js::NOTICE_PUBLISH_ROLES / NOTICE_MANAGE_ROLES（与前端 NoticePermission 同源）
  notices: { post: 'notice-publish', patch: 'notice-manage', delete: 'notice-manage' },
  // 党小组（2026-09-14 批次 25 支书裁定）：管理（建/改组/解散/归组）仅限支书（含副支书）
  partyGroups: 'secretary',
  // 成员流动台账（2026-09-14 批次 25 支书裁定）：流入/流出登记 = 组织委员 + 支书/副支书
  memberFlows: 'member-flow',
};

/** 资源写角色门判定（在 requireAuth 之后、handler 内调用；未设门资源一律放行） */
export function _assertResourceWrite(actor, name, method, body, targetId, db) {
  const gate = RESOURCE_WRITE_GATE[name];
  if (!gate) return true; // 未设门：由既有 writeAuth（requireAuth / requireCommissioner）把关
  const need = typeof gate === 'string' ? gate : gate[method];
  if (!need) return true;
  if (need === 'party-staff') {
    return !!actor && PARTY_STAFF_ROLE.has(actor.role);
  }
  if (need === 'branch-committee') {
    // 支部侧上报：仅本支部支委层成员（actor 归属支部与上报支部一致；老数据缺省视为 br-b1）
    if (!actor || !BRANCH_COMMITTEE_ROLES.has(actor.role)) return false;
    const myBranch = actor.branchId || 'br-b1';
    const targetBranch = (body && body.branchId) || 'br-b1';
    return myBranch === targetBranch;
  }
  if (need === 'notice-publish') {
    // 人工发布：白名单角色。
    // R-22（2026-09-13）：系统派生通知不再走本通道——原「客户端打标 systemDerived 即放行」因
    // 标记可伪造（任一登录成员可借此发任意广播通知）而移除，改由服务端注册表生成，
    // 见 server/system-notice-kinds.js 与 POST /api/v1/system-notices。
    return !!actor && NOTICE_PUBLISH_ROLE_SET.has(actor.role);
  }
  if (need === 'notice-manage') return !!actor && NOTICE_MANAGE_ROLE_SET.has(actor.role);
  // 党小组管理：仅支书（含副支书）——角色名单单一源 constants.js::SECRETARY_AND_DEPUTY_ROLES
  if (need === 'secretary') return !!actor && SECRETARY_AND_DEPUTY_ROLE_SET.has(actor.role);
  // 成员流动登记：组织委员 + 支书/副支书——单一源 constants.js::MEMBER_FLOW_ROLES（勿手写）；支委身份配置（users 的 patch 门）见文件末 _branchCommissionerGateDeny
  if (need === 'member-flow') return !!actor && MEMBER_FLOW_ROLE_SET.has(actor.role);
  return need === 'branch-commissioner' ? _branchCommissionerGateDeny(db, actor, targetId, body) === null : true;
}

/** 写门 403 文案（按资源给可懂原因，勿用一句万金油） */
export function _writeDenyMsg(name) {
  if (name === 'notices') {
    return '无权限：通知发布仅限支书/副支书/组织委员/宣传委员，编辑与删除另含纪检委员';
  }
  if (name === 'partyGroups') {
    return '党小组管理仅限支书（含副支书）';
  }
  if (name === 'memberFlows') {
    return '无权限：成员流入/流出登记仅限组织委员或支书/副支书';
  }
  return '无权限：该写操作仅限党委组织员/党务老师或本支部支委层';
}

// ── 活动写门（dogfood 权限专项 2026-09-13 实证缺口）──────────────────────────
// 缺口：POST/PATCH/DELETE /activities 此前仅 requireAuth → 任一登录成员可建「支委会」活动、
//   并可改 voteConfig.voterIds 篡改表决名单（真机 API 探针实测：普通成员 POST 201、PATCH 200）。
// 现行门：① 非支委层（普通成员/预备党员/积极分子等）一律拒；
//   ② 党小组组长仅限「党小组会 / 主题党日」（对齐 SYSTEM_ROLE_PERMISSION §9a 与组长手册）。
// 支委层既有功能位（宣传归档、议程/结果编辑、状态更新）保持放行，不在此收口——是否进一步收紧为
//   §9a 原文「仅支书/副支书/党小组组长」列入丙部待支书裁（避免误伤归档/议程链路）。
const ACTIVITY_WRITE_ROLES = new Set([...BRANCH_COMMISSION_ROLES, 'leader']);
const LEADER_ACTIVITY_TYPES = new Set(['党小组会', '主题党日']);
export const ACTIVITY_WRITE_DENY_MSG = '无权限：活动写入仅限支委层与党小组组长（组长限党小组会/主题党日）';
export function _assertActivityWrite(actor, effectiveType) {
  if (!actor || !ACTIVITY_WRITE_ROLES.has(actor.role)) return false;
  if (actor.role === 'leader') return LEADER_ACTIVITY_TYPES.has(effectiveType);
  return true;
}
export function _ballotModeReject(voteConfig) {
  if (!voteConfig || typeof voteConfig !== 'object') return null;
  if (isAnonymousForced(voteConfig.optionSet) && voteConfig.ballotMode === 'named') {
    return '正式表决须采用无记名投票（ballotMode=anonymous），不得设置为记名';
  }
  return null;
}
// ════════════════════════════════════════════════════════════════
//  `users` 写门的**靶向判据**：支书 / 副支书配置本支部支委身份（2026-09-23 支书裁定 · 情景①）
// ════════════════════════════════════════════════════════════════
// 由来（**放宽权限、须精确**）：`users` 的 patch 门原为「仅 party-staff」（见上方 RESOURCE_WRITE_GATE）。
//   支书 2026-09-23 裁定「最初的人员配置只有党委给支书配置，剩下的身份由书记来配置」⇒ 给支书开
//   **本支部、支委身份（组织 / 宣传 / 纪检委员）** 这一格写权；**2026-09-23 支书追裁「副支书也可配」**
//   ⇒ 同权扩到本支部现任副支书（`SECRETARY_AND_DEPUTY_ROLES` 同页同权，与本仓通例一致）；
//   **党委侧口径一字未收窄**（`party-staff` 仍全量可写）。
// 判据**单一源**＝`docs/src/core/domain/constants.js::branchCommissionerWriteDeny`（本函数只把「靶行 / 靶支部 /
//   现任支书 / 现任副支书」从库里取出来喂给它，**不另写第二套**）。被拒的几类（该函数注释为权威，此处摘要）：
//   · 非本支部现任支书 / 副支书者（组织 / 宣传 / 纪检委员 / 普通成员等）→ 403；
//   · 靶标与操作人不同支部 → 403；靶标即支书本人 / 现任主席位（`secretary` / `deputy-secretary`）→ 403
//     （一把手层归党委，`D-585`：换届选举涉及支委班子身份赋权，由党委改变支部设置）；
//   · 写入角色键不在白名单（含 `secretary` / `deputy-secretary` / `party-staff` / `leader` / `organizer` / `deep` …）→ 403；
//     撤销位 `participant` 例外（降级，不是授予）。
// 前端同一判据的消费点＝`docs/src/services/branch/appointment.js::appointBranchCommissioner`（角色双链写 + 审计留痕）。
// ⚠ 本块置于文件末尾、且上文对该门的三处改动均为**等行数替换**：不改动任何既有行号
//   （README-server.md 有大量 `文件:行号` 引用指向本文件，`doc-line-ref` 守卫逐条核）。

/**
 * `users` 写门的靶向判据：允许 → null；拦截 → 403 文案。
 * @param {Object} db better-sqlite3 实例
 * @param {{role?:string,id?:string,branchId?:string}} actor 写者（requireAuth 注入）
 * @param {string} targetId 靶行 id（`req.params.id`）
 * @param {Object} body 本次补丁
 * @returns {string|null}
 */
function _branchCommissionerGateDeny(db, actor, targetId, body) {
  const readRow = (table, id) => {
    if (!id) return null;
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
    return row ? JSON.parse(row.data) : null;
  };
  const myBranchId = (actor && actor.branchId) || 'br-b1';
  const target = readRow('users', targetId);
  const branch = readRow('branches', myBranchId);
  const patch = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  // 本支部现任副支书（副书同权，2026-09-23 支书追裁）：判据侧只认「本支部那一行 deputy-secretary」
  const deputyRow = db.prepare('SELECT data FROM users').all()
    .map(r => JSON.parse(r.data))
    .find(u => u.role === 'deputy-secretary' && ((u.branchId || 'br-b1') === myBranchId));
  return branchCommissionerWriteDeny({
    actorRole: actor && actor.role,
    actorId: actor && actor.id,
    actorBranchId: myBranchId,
    targetId: targetId ? String(targetId) : '',
    targetRole: target && target.role,
    targetBranchId: target && (target.branchId || 'br-b1'),
    secretaryId: branch && branch.secretaryId,
    deputySecretaryId: deputyRow ? deputyRow.id : null,
    role: patch.role,
  });
}

export const ORG_COMMISSIONER_ROLE_SET = new Set(ORG_COMMISSIONER_ROLES);
