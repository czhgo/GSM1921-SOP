// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/gates.js —— **资源写门（全部角色门）**
//  切分依据：资源级写门与「支委身份写门靶向判据」互相引用 ⇒ 必须同文件（拆开即成环）；逐字搬迁、口径零改写。
// ════════════════════════════════════════════════════════════════

import { requireAuth, requireCommissioner } from '../auth.js';
import { BRANCH_COMMISSION_ROLES, PARTY_STAFF_ROLE as PARTY_STAFF_KEYS, SECRETARY_AND_DEPUTY_ROLES, NOTICE_PUBLISH_ROLES, NOTICE_MANAGE_ROLES, MEMBER_FLOW_ROLES, ORG_COMMISSIONER_ROLES, INSPECTION_WRITE_ROLES, INSPECTION_CONFIRM_ROLES, branchCommissionerWriteDeny, isAnonymousForced } from '../../../docs/src/core/domain/constants.js';
import { RESOURCE_TABLES, listTable } from './store.js';
import { actorBranchId, resourceBranchId } from './branch-scope.js';
import { CAPABILITY_PACKAGES } from '../../../docs/src/core/domain/capability-packages.js';

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
// 「写入/删除均需支委身份」的资源集（快照写穿与资源 CRUD 共用同一份，勿另写第二套）
export const COMMISSIONER_WRITE_RESOURCES = new Set(['branchDocs', 'fileSpaceRecords', 'imageRecords']);
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

/** 支部归属口径：显式 null 保持 null（待归属/党委），仅历史缺字段回落 br-b1 */
function _branchOrLegacy(value) {
  return value === null ? null : (value || 'br-b1');
}

/**
 * 活动组织者身份（与前端 `services/activity/activity.js::isActivityOrganizer` 同判据）：
 * `activity.assignments` 中 role=organizer，或顶层 `activity.organizer === personId`。
 * 仅用于「本场活动通知」的发布例外（R4-F03），不扩大其它通知的发布面。
 */
export function _isActivityOrganizer(db, actor, activityId) {
  if (!db || !actor?.id || !activityId) return false;
  const row = db.prepare('SELECT data FROM activities WHERE id = ?').get(String(activityId));
  if (!row) return false;
  let activity;
  try { activity = JSON.parse(row.data); } catch { return false; }
  const own = actorBranchId(actor);
  if (own && (activity.branchId || 'br-b1') !== own) return false;
  return activity.organizer === actor.id
    || (Array.isArray(activity.assignments)
      && activity.assignments.some((item) => item?.personId === actor.id && item.role === 'organizer'));
}

/** 通知所指活动 id（统一入口：targetType=activity / 兼容 activityId 字段） */
function _noticeActivityId(notice) {
  if (!notice) return null;
  if (notice.targetType === 'activity' && notice.targetId) return notice.targetId;
  return notice.activityId || null;
}

/** 通知发布权：角色白名单 ∪「本场活动组织者发布本场通知」 */
function _noticePublishAllowed(db, actor, notice) {
  if (!actor) return false;
  if (NOTICE_PUBLISH_ROLE_SET.has(actor.role)) return true;
  return _isActivityOrganizer(db, actor, _noticeActivityId(notice));
}

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
    // 支部侧上报：仅本支部支委层成员（actor 归属支部与上报支部一致；显式 null 不回落）
    if (!actor || !BRANCH_COMMITTEE_ROLES.has(actor.role)) return false;
    const myBranch = actorBranchId(actor);
    const targetBranch = _branchOrLegacy(body && body.branchId);
    return !!myBranch && myBranch === targetBranch;
  }
  if (need === 'notice-publish') {
    // 人工发布：白名单角色；R4-F03 另放行「本场活动组织者发布本场通知」（与前端 NoticePermission.canPublish 同源）。
    // R-22（2026-09-13）：系统派生通知不再走本通道——原「客户端打标 systemDerived 即放行」因
    // 标记可伪造（任一登录成员可借此发任意广播通知）而移除，改由服务端注册表生成，
    // 见 server/system-notice-kinds.js 与 POST /api/v1/system-notices。
    return _noticePublishAllowed(db, actor, body);
  }
  if (need === 'notice-manage') return !!actor && NOTICE_MANAGE_ROLE_SET.has(actor.role);
  // 党小组管理：仅支书（含副支书）——角色名单单一源 constants.js::SECRETARY_AND_DEPUTY_ROLES
  if (need === 'secretary') return !!actor && SECRETARY_AND_DEPUTY_ROLE_SET.has(actor.role);
  // 成员流动登记：组织委员 + 支书/副支书——单一源 constants.js::MEMBER_FLOW_ROLES（勿手写）；支委身份配置（users 的 patch 门）见文件末 _branchCommissionerGateDeny
  if (need === 'member-flow') return !!actor && MEMBER_FLOW_ROLE_SET.has(actor.role);
  // 考察写门（Phase 0 · R4-D05）：支委层/党委，或本场活动（专班）组织者；判据见文件末 `_inspectionWriteAllowed`
  if (need === 'inspection') return _inspectionWriteAllowed(db, actor, method, body, targetId);
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
  return name === 'inspections' ? '无权限：考察记录仅限支委层（含组织委员建档代录）/党委，或本场活动（专班）组织者写入' : '无权限：该写操作仅限党委组织员/党务老师或本支部支委层';
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
  const myBranchId = actorBranchId(actor);
  const target = readRow('users', targetId);
  const branch = myBranchId ? readRow('branches', myBranchId) : null;
  const patch = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  // 本支部现任副支书（副书同权，2026-09-23 支书追裁）：判据侧只认「本支部那一行 deputy-secretary」
  const deputyRow = myBranchId && db.prepare('SELECT data FROM users').all()
    .map(r => JSON.parse(r.data))
    .find(u => u.role === 'deputy-secretary' && _branchOrLegacy(u.branchId) === myBranchId);
  return branchCommissionerWriteDeny({
    actorRole: actor && actor.role,
    actorId: actor && actor.id,
    actorBranchId: myBranchId,
    targetId: targetId ? String(targetId) : '',
    targetRole: target && target.role,
    targetBranchId: target && _branchOrLegacy(target.branchId),
    secretaryId: branch && branch.secretaryId,
    deputySecretaryId: deputyRow ? deputyRow.id : null,
    role: patch.role,
  });
}

export const ORG_COMMISSIONER_ROLE_SET = new Set(ORG_COMMISSIONER_ROLES);
// D01/D08：考察写角色与确认角色（单一源 = constants.js；前端 services/activity/inspection.js 同读）
export const INSPECTION_WRITE_ROLE_SET = new Set(INSPECTION_WRITE_ROLES);
export const INSPECTION_CONFIRM_ROLE_SET = new Set(INSPECTION_CONFIRM_ROLES);

// ════════════════════════════════════════════════════════════════
//  批次 274（2026-09-29）：运行时面 —— **「支部停用某块」服务端硬执行**（契约 §8.1，`D-685`）
//
//  · 为什么：本仓命题是「制度即代码：把制度文本嵌入系统中**必须遵守**」；原状态是前端只做到
//    「入口看不见」——**直连 API 仍可写入**，与命题不符。按 `D-677`（**API 优先**：判据须落在
//    api 面的真实行为上），前端守卫不足以作为「停用」的判据。
//  · 映射**单一源**：活动 `type`（中文场景名）→ scenarioId（`SCENARIO_LABELS` **反查**）
//    → blockId（**同名**；唯一别名 `theme-party → theme-party-day` 读 `BLOCK_ID_ALIASES`，
//    与守卫 `server/test/scene-write-sync.test.mjs` **同读一份**，不会出现第二套）。
//  · **默认零影响**：支部 `config.blocks.workflowBlocks.hiddenBlockIds` 缺省 ⇒ 全块启用 ⇒
//    既有用例行为**一字不变**；**只在支部显式停用后生效**。
//  · 边界（契约 §8.1）：只管「**活动写入**」这一面——POST 与 PATCH（改类型/场景时）；
//    **任务派生 / 通知**是否随块停用而停，**同批只登记**（不扩口径）⇒ 故 DELETE 不设此门。
//
//  ⚠ 本段置于文件末尾：上方 `gates.js:24-36`（`RESOURCE_WRITE_GATE`）等行号是 `README-server.md`
//    的取证靶点，**置尾追加不会让任何既有行号漂移**（import 声明被提升，置尾不影响语义）。
// ════════════════════════════════════════════════════════════════
import { SCENARIO_LABELS } from '../../../docs/src/core/domain/constants.js';
import { BLOCK_ID_ALIASES } from '../../../docs/src/workflow/blocks/manifests.js';

/** 活动写入被「支部停用该块」拒绝时的**可懂原因**（403 响应体用；区别于 `ACTIVITY_WRITE_DENY_MSG`） */
export function activityBlockDisabledMsg(effectiveType) {
  return `该活动所属场景「${effectiveType}」已被本支部**停用**（支部配置 → 工作流块），`
    + '服务端拒绝写入。如需恢复，请由支书/党委在「换组织向导 · ② 模块块组合」重新启用该块。';
}

/**
 * 运行时面判据：该支部**是否启用了**这条活动所属的工作流块。
 * @param {import('better-sqlite3').Database} db
 * @param {{branchId?:string|null}} actor 写入者（其支部即目标支部；党委 `branchId:null` ⇒ 走全仓「缺省支部」兜底）
 * @param {string} effectiveType 活动类型（中文场景名）
 * @returns {boolean} true = 放行（未停用 / 无关联块 / 支部未配置 / 读不到配置——**一律放行**，本门只管「显式停用」）
 */
export function _assertActivityBlockEnabled(db, actor, effectiveType) {
  if (!effectiveType) return true;
  const scenarioId = Object.keys(SCENARIO_LABELS).find((k) => SCENARIO_LABELS[k] === effectiveType);
  if (!scenarioId) return true;                     // 非场景化活动 ⇒ 不涉块启停
  const blockId = BLOCK_ID_ALIASES[scenarioId] || scenarioId;
  return _assertWorkflowBlockEnabled(db, actor, blockId);
}

/** 明确停用某支部能力包时拒绝新建该包主对象；旧分支无配置仍兼容默认启用。 */
export function _assertCapabilityPackageEnabled(db, actor, packageId) {
  const branchId = actor && Object.prototype.hasOwnProperty.call(actor, 'branchId')
    ? actor.branchId : (actor ? 'br-b1' : null);
  if (!branchId) return true; // 无支部归属（党委/待归属）：不套用任何支部停用配置
  const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(branchId);
  if (!row) return true;
  let branch;
  try { branch = JSON.parse(row.data); } catch { return true; }
  const state = branch?.config?.capabilityPackages?.packages?.[packageId];
  return state?.enabled !== false;
}

/** 工作流块的支部运行时开关；无显式停用配置时保持兼容默认启用。 */
export function _assertWorkflowBlockEnabled(db, actor, blockId) {
  if (!blockId) return true;
  // 显式 null = 无支部归属（党委/待归属）⇒ 不套用支部配置；仅历史缺字段回落 br-b1。
  const branchId = actor && Object.prototype.hasOwnProperty.call(actor, 'branchId')
    ? actor.branchId : (actor ? 'br-b1' : null);
  if (!branchId) return true;
  const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(branchId);
  if (!row) return true;                            // 支部不存在 ⇒ 交给其它门拦；本门不越权
  let cfg; try { cfg = JSON.parse(row.data); } catch { return true; }
  const hidden = cfg?.config?.blocks?.workflowBlocks?.hiddenBlockIds;
  if (Array.isArray(hidden) && hidden.includes(blockId)) return false;
  const packages = cfg?.config?.capabilityPackages?.packages || {};
  return !CAPABILITY_PACKAGES.some((definition) => definition.workflowBlockIds?.includes(blockId)
    && packages[definition.id]?.enabled === false);
}

export function workflowBlockDisabledMsg(blockId) {
  return `该工作流程所属模块「${blockId}」已被本支部停用；可完成在办事项，不能新建或改写历史记录。`;
}

// ════════════════════════════════════════════════════════════════
//  站内信（`noticeType:'message'`）**服务端写门**（2026-10-05 批次 393 · 支书 `D-748`；
//  发送权面于 2026-10-05 批次 406 按 `D-793` 放开到「全体成员」）
//
//  · 为什么：私信落库走 `POST /api/v1/snapshot`（整表写穿），该口此前仅 `requireAuth`
//    ⇒ 任一登录成员直连即可**伪造一条私信**（冒充发件人 / 塞给任意收件人）。按 `D-677`（判据须落在 api 面
//    的真实行为上），须在服务端复算同一口径。
//  · 发送权（`D-793`，批次 406 改裁）：**全体成员均可发私信**（原「支委层 ∪ 党小组组长」已放开，与前端
//    `services/governance/notice.js::canSendDirectMessage` 同一口径）：母本「所有支部成员可直接向支书反馈」
//    （`常见工作场景快速指南.md` 第 11 章）此前在系统内对普通成员**不可达** ⇒ 按支书「改系统」收口。
//    服务端**只锁一件事**：发件人须为本人（不得代发）。
//  · 只拦「**新增 / 篡改私信**」这一面（同快照口批准门口径）：既有私信的**未变行照旧放行**——快照是整表写穿，
//    正常同步里 payload 必然带着收发双方的其它在库私信。篡改面只锁两件：`fromPersonId` 不可改；非作者不得改
//    收件人 `audiencePersons`（防把私下一条改成发给别人 / 群发）。
//  · 边界（如实）：`POST /api/v1/notices` 的既有通用写门不动（私信不经该口）；「删除私信」未设门（沿用既有）。
// ⚠ 本段置于文件末尾：不改动上文任何行号（README-server 有 `文件:行号` 引用指向本文件，`doc-line-ref` 逐条核）。
// ════════════════════════════════════════════════════════════════
export const NOTICE_MESSAGE_DENY_MSG = '无权限：站内信（私信）发件人须为本人';

/**
 * 快照口的**站内信写门**（纯判定）：允许 → null；拦截 → 403 文案。
 * 只管「新增私信（或把既有通知改成私信）」与「篡改既有私信的作者 / 收件人」；未变行 / 非私信行一律放行。
 * @param {import('better-sqlite3').Database} db better-sqlite3 实例
 * @param {Object} payload 快照 payload
 * @param {{role?:string,id?:string}} actor 写者（requireAuth 注入）
 * @returns {string|null}
 */
export function _snapshotNoticeMessageGateDeny(db, payload, actor) {
  const rows = (payload && Array.isArray(payload.notices)) ? payload.notices : null;
  if (!rows) return null;
  const prevById = new Map(listTable(db, 'notices').map((r) => [r.id, r]));
  for (const row of rows) {
    if (!row || typeof row !== 'object' || row.noticeType !== 'message') continue;
    const prev = prevById.get(row.id);
    const wasMessage = !!prev && prev.noticeType === 'message';
    if (!wasMessage) {
      // 新增私信（或把既有通知改成私信）：发件人须为本登录人（不得代发）；发送权已于批次 406 放开到全体成员
      if (!actor || row.fromPersonId !== actor.id) return NOTICE_MESSAGE_DENY_MSG;
      continue;
    }
    // 既有私信：作者不可被改
    if (row.fromPersonId !== prev.fromPersonId) return NOTICE_MESSAGE_DENY_MSG;
    // 非作者不得改收件人（防把私下一条改成发给别人 / 群发）
    if (actor && actor.id !== prev.fromPersonId) {
      if (JSON.stringify(row.audiencePersons || []) !== JSON.stringify(prev.audiencePersons || [])) {
        return NOTICE_MESSAGE_DENY_MSG;
      }
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
//  快照写穿的**资源写门复算**（R4-B01/F02，2026-10-19）
// ════════════════════════════════════════════════════════════════
// 病灶：`POST /snapshot` 原先只做支部范围校验；`notices` 等有写门的集合可被任一登录成员
//   以整表写穿绕过（前端有门、后端快照口全开）。本函数对**最终要写入的行**逐行复算：
//   · 有 `RESOURCE_WRITE_GATE` 门的集合 → 按新增/修改分别走同一 `_assertResourceWrite` 判据；
//   · `COMMISSIONER_WRITE_RESOURCES`（文件/图片元数据）→ 支委层；
//   · 没有门的集合 → deny-by-default 支部归属检查（行归属必须等于 actor 支部）。
// 注：`users` / `branches` 由 `snapshotScopeDeny` 整体拒绝，不在此重复。
// ⚠ 未变行一律放行（正常同步会把整集合带上来）；快照不负责校验「集合缺行＝删除」——
//   该面与既有实现保持一致（删除走资源 DELETE / 语义端点留痕）。
// ════════════════════════════════════════════════════════════════

/** 通知快照写门：新增需发布权（含本场组织者），修改需管理权；任何成员可只改自己的 read 状态。 */
function _snapshotNoticeWriteDeny(db, rows, actor) {
  const previous = new Map(listTable(db, 'notices').map((r) => [String(r.id), r]));
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !row.id) continue;
    const prev = previous.get(String(row.id));
    // 私信由 `_snapshotNoticeMessageGateDeny` 单独判定（全体成员可发，但不得代发）
    if (row.noticeType === 'message' || prev?.noticeType === 'message') continue;
    if (!prev) {
      if (!_noticePublishAllowed(db, actor, row)) return _writeDenyMsg('notices');
      continue;
    }
    const changed = Object.keys({ ...prev, ...row })
      .filter((key) => JSON.stringify(prev[key]) !== JSON.stringify(row[key]));
    if (changed.length === 0) continue;
    // 已读是个人状态：任何成员都可推进自己的 read 标记（前端 markRead / markAllRead）
    if (changed.every((key) => key === 'read')) continue;
    if (!_assertResourceWrite(actor, 'notices', 'patch', row, row.id, db)) return _writeDenyMsg('notices');
  }
  return null;
}

/**
 * 快照的「删除面」保护：有写门的集合，若操作人不具备删除权，则把本次未出现但库里属于
 * 本支部的存量行**原样保留**（而不是让整表替换把它们删掉）。
 * 这样普通成员即使构造 `notices: []` / `partyGroups: []` 也不能清空集合；有删除权的角色不受影响。
 * @param {import('better-sqlite3').Database} db
 * @param {Array<{name:string, table:string, rows:Array<Object>}>} writes
 * @param {{id?:string, role?:string, branchId?:string|null}} actor
 * @returns {Array<{name:string, table:string, rows:Array<Object>}>}
 */
export function _retainUngatedSnapshotRows(db, writes, actor) {
  const own = actorBranchId(actor);
  if (!own) return writes;
  return writes.map((write) => {
    const { name, table, rows } = write;
    if (['users', 'branches', 'actSubRecords', 'tfSubRecords'].includes(name)) return write;
    const gated = !!RESOURCE_WRITE_GATE[name] || COMMISSIONER_WRITE_RESOURCES.has(name);
    if (!gated) return write;
    const canDelete = COMMISSIONER_WRITE_RESOURCES.has(name)
      ? BRANCH_COMMITTEE_ROLES.has(actor?.role)
      : _assertResourceWrite(actor, name, 'delete', null, null, db);
    if (canDelete) return write;
    const incomingIds = new Set(rows.map((row) => String(row?.id)));
    const missing = listTable(db, table)
      .filter((row) => resourceBranchId(db, name, row) === own && !incomingIds.has(String(row.id)));
    return missing.length ? { ...write, rows: [...rows, ...missing] } : write;
  });
}

/**
 * 快照最终写入行的资源门复算。
 * @param {import('better-sqlite3').Database} db
 * @param {Array<{name:string, table:string, rows:Array<Object>}>} writes `_snapshotWrites` 经支部合并后的结果
 * @param {{id?:string, role?:string, branchId?:string|null}} actor
 * @returns {string|null} 拒绝原因（403 文案）；放行 → null
 */
export function _snapshotResourceWriteGateDeny(db, writes, actor) {
  const ownBranch = actorBranchId(actor);
  for (const write of writes) {
    const { name, table, rows } = write;
    // 治理表由 snapshotScopeDeny 整体拒绝；聚合域由 aggregate 分支夹带校验。
    if (['users', 'branches', 'actSubRecords', 'tfSubRecords'].includes(name)) continue;

    // deny-by-default：没有门的集合也至少确认每行归属当前支部。
    // 跳过「合并后保留的其他支部存量行」（未变行不构成本次写入）。
    if (ownBranch) {
      const existing = new Map(listTable(db, table).map((r) => [String(r.id), r]));
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const prev = existing.get(String(row.id));
        if (prev && JSON.stringify(prev) === JSON.stringify(row)) continue;
        const resolved = resourceBranchId(db, name, row);
        if (resolved && resolved !== ownBranch) {
          return '无权限：快照只能写入当前支部记录';
        }
      }
    }

    if (name === 'notices') {
      const deny = _snapshotNoticeWriteDeny(db, rows, actor);
      if (deny) return deny;
      continue;
    }

    const gate = RESOURCE_WRITE_GATE[name];
    const commissionerOnly = COMMISSIONER_WRITE_RESOURCES.has(name);
    if (!gate && !commissionerOnly) continue;

    const previous = new Map(listTable(db, table).map((r) => [String(r.id), r]));
    for (const row of rows) {
      if (!row || typeof row !== 'object' || !row.id) continue;
      const prev = previous.get(String(row.id));
      if (prev && JSON.stringify(prev) === JSON.stringify(row)) continue; // 未变行放行
      if (commissionerOnly) {
        if (!BRANCH_COMMITTEE_ROLES.has(actor?.role)) return _writeDenyMsg(name);
        continue;
      }
      const method = prev ? 'patch' : 'post';
      // R4-D04：快照写穿同样复算稳定父键（缺键/legacy 只读/父键不可改写）。
      if (name === 'inspections') {
        const keyDeny = _inspectionSourceKeyDeny(row)
          || (prev && _inspectionSourceKeyDeny(prev))
          || (prev && _inspectionImmutableKeyDeny(prev, row));
        if (keyDeny) return keyDeny;
      }
      // D01：快照写穿同样复算「确认/打回」白名单与自确认禁令（前端服务层经 persist 走本口）
      if (name === 'inspections') {
        const decisionDeny = _inspectionDecisionDeny(actor, prev, row);
        if (decisionDeny) return decisionDeny;
      }
      if (!_assertResourceWrite(actor, name, method, row, row.id, db)) return _writeDenyMsg(name);
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
//  考察写门（Phase 0 · R4-D05，2026-10-20）
// ════════════════════════════════════════════════════════════════
// 口径（支书任务单）：
//   · 支委层（secretary/deputy-secretary/org/prop/disc）与党委（party-staff）：可写；
//   · 普通成员：仅当**本场活动（专班）组织者**（按活动 `assignments` / 专班 `members` 复算）——
//     新增/修改限于自己组织的场次；删除同样限本场组织者（防越权清库）。
// 复用的既有语义：
//   · 角色集单一源 = `constants.js::BRANCH_COMMISSION_ROLES` / `PARTY_STAFF_ROLE`（勿另写角色表）；
//   · 活动组织者判据复用本文件 `_isActivityOrganizer`（顶层 organizer + assignments.organizer + 支部等值），
//     仅额外补 `assignments.role='deep'`（与前端 `canUploadInspection` 同口径，防两端一个放一个拦）；
//   · 专班按 `members` role=organizer，但来源只认 `workgroupId`（R4-D04：名字只是展示快照，
//     改名/同名不再影响写门）。
// 读取面不动：仍走 `index.js::_canReadInspectionRow` 的 visibility 投影（不扩大）。
// ⚠ 本段置尾：`RESOURCE_WRITE_GATE.inspections` 以运行时挂载登记（不插入上方对象字面量）。
// ════════════════════════════════════════════════════════════════

RESOURCE_WRITE_GATE.inspections = { post: 'inspection', patch: 'inspection', delete: 'inspection' };

/** 本场活动组织者（含 deep 协作者；支部须与 actor 一致） */
function _isInspectionActivityOrganizer(db, actor, activityId) {
  if (_isActivityOrganizer(db, actor, activityId)) return true;
  if (!db || !actor?.id || !activityId) return false;
  const row = db.prepare('SELECT data FROM activities WHERE id = ?').get(String(activityId));
  if (!row) return false;
  let activity;
  try { activity = JSON.parse(row.data); } catch { return false; }
  const own = actorBranchId(actor);
  if (own && (activity.branchId || 'br-b1') !== own) return false;
  return Array.isArray(activity.assignments)
    && activity.assignments.some((item) => item?.personId === actor.id && item.role === 'deep');
}

/** 专班组织者（R4-D04：只按 workgroupId → workgroups.sourceId → taskforces 反查，不再按名称匹配） */
function _isInspectionTaskforceOrganizer(db, actorId, workgroupId) {
  if (!db || !actorId || !workgroupId) return false;
  const group = listTable(db, 'workgroups').find((row) => row.id === workgroupId && row.kind === 'taskforce');
  const taskforceId = group?.sourceId || null;
  if (!taskforceId) return false;
  return listTable(db, 'taskforces').some((row) => row.id === taskforceId
    && Array.isArray(row.members)
    && row.members.some((member) => member?.personId === actorId && member.role === 'organizer'));
}

/** R4-D04：历史考察只读原因（与前端 services/activity/inspection.js 同文案） */
export const INSPECTION_LEGACY_REASON = '历史考察缺少工作组键（只读）';
const INSPECTION_MISSING_KEY_REASON = '考察记录缺少工作组键（workgroupId），请从专班上下文重新上传';

/**
 * R4-D04：考察记录的稳定父键校验（新增/修改/快照写穿共用）。
 * @returns {string|null} 拒绝原因；放行 → null
 */
export function _inspectionSourceKeyDeny(record) {
  if (!record || typeof record !== 'object') return '考察记录格式无效';
  if (record.legacy === true) return INSPECTION_LEGACY_REASON;
  if (record.sourceType === 'taskforce' && !record.workgroupId) return INSPECTION_MISSING_KEY_REASON;
  if (record.sourceType === 'activity' && !record.activityId) return '活动考察缺少 activityId，不能写入';
  return null;
}

/**
 * R4-D04：稳定父键与只读标记在创建后不可改写（同 recordedBy 口径，防借 PATCH 挪场次/洗白 legacy）。
 * @returns {string|null} 拒绝原因；放行 → null
 */
export function _inspectionImmutableKeyDeny(prev, body) {
  if (!prev || !body || typeof body !== 'object') return null;
  for (const key of ['workgroupId', 'activityId', 'legacy']) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    // legacy 是只读标记：布尔等价即视为未改写（兼容快照里的 false 归一）。
    const changed = key === 'legacy'
      ? (!!body[key] !== !!prev[key])
      : (body[key] !== prev[key]);
    if (changed) return `无权限：考察记录的 ${key} 创建后不可修改`;
  }
  return null;
}

/** 该考察来源是否由 actor 组织 */
function _isInspectionSourceOrganizer(db, actor, record) {
  if (!record) return false;
  if (record.sourceType === 'taskforce') {
    return _isInspectionTaskforceOrganizer(db, actor?.id, record.workgroupId);
  }
  return _isInspectionActivityOrganizer(db, actor, record.activityId);
}

/**
 * 考察写门判据（`_assertResourceWrite` 的 `inspection` 分派）。
 * @returns {boolean} true = 放行
 */
function _inspectionWriteAllowed(db, actor, method, body, targetId) {
  if (!actor || !actor.id) return false;
  const committee = PARTY_STAFF_ROLE.has(actor.role) || INSPECTION_WRITE_ROLE_SET.has(actor.role);

  if (method === 'post') {
    // R4-D04：新增专班考察必须带 workgroupId；legacy 记录不得作为新记录写入。
    if (_inspectionSourceKeyDeny(body)) return false;
    // D08：支委层（含组织委员「建档代录」）与党委可写；普通成员仅限本场组织者（下段）
    if (committee) return true;
    return _isInspectionSourceOrganizer(db, actor, body);
  }

  if (method !== 'patch' && method !== 'delete') return false;
  if (!targetId) return false;
  const row = db.prepare('SELECT data FROM inspections WHERE id = ?').get(String(targetId));
  if (!row) return false;
  let prev;
  try { prev = JSON.parse(row.data); } catch { return false; }
  // R4-D04：缺工作组键的历史记录对**所有角色**只读（含支委层），不参与写门。
  if (_inspectionSourceKeyDeny(prev)) return false;
  // 合并后的行仍须带正确父键（防借 sourceType/sourceName 改写拼出无键记录）。
  const merged = method === 'patch' && body ? { ...prev, ...body } : prev;
  if (_inspectionSourceKeyDeny(merged)) return false;
  if (committee) return true;
  if (!_isInspectionSourceOrganizer(db, actor, prev)) return false;
  // 修改来源时，新来源也须是本人组织的场次（防借 PATCH 把记录挪到别人场次）
  if (method === 'patch' && body && ['sourceType', 'activityId', 'sourceName', 'taskforceId', 'workgroupId']
    .some((key) => Object.prototype.hasOwnProperty.call(body, key))) {
    return _isInspectionSourceOrganizer(db, actor, merged);
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
//  考察「确认 / 打回」判定（D01，2026-10-20）
// ════════════════════════════════════════════════════════════════
// 为什么：写门（`inspection`）只管「谁能改考察」，不区分「确认」这一动作 ⇒ 组织委员/上传人自己
//   也能把 status 改成 confirmed（前端按钮藏了也能直连 API）。D01 要求确认白名单与自确认禁令
//   落在 api 面（`D-677`），故对 PATCH 里的确认/打回字段单独复算。
// 判据单一源 = constants.js::INSPECTION_CONFIRM_ROLES；打回留痕字段沿用既有的 returnedBy/returnedAt。
/**
 * 确认/打回 PATCH 的角色与自确认判定。
 * @param {{id?:string, role?:string}} actor
 * @param {Object} prev 既有考察记录（含 recordedBy）
 * @param {Object} body 本次补丁
 * @returns {string|null} 403 文案；非确认/打回补丁或放行 → null
 */
export function _inspectionDecisionDeny(actor, prev, body) {
  if (!body || typeof body !== 'object') return null;
  // R4-D04：历史考察（缺工作组键）只读——确认/打回同样拒绝（在判状态变化之前）。
  if (prev && prev.legacy === true) return INSPECTION_LEGACY_REASON;
  // 只在「状态/留痕真的发生变化」时按确认/打回复算——避免编辑已确认记录的内容被误判为再次确认
  const isConfirm = (body.status === 'confirmed' && (!prev || prev.status !== 'confirmed'))
    || (Object.prototype.hasOwnProperty.call(body, 'confirmedBy')
      && (!prev || body.confirmedBy !== prev.confirmedBy));
  const isReturn = ['returnedBy', 'returnedAt', 'returnReason']
    .some((key) => Object.prototype.hasOwnProperty.call(body, key)
      && body[key] !== undefined
      && (!prev || body[key] !== prev[key]));
  if (!isConfirm && !isReturn) return null;
  // D01：自确认禁令优先（「一律拒绝」）——即使操作人不在确认白名单，也给出同一可懂原因
  // 新增行（prev 缺失）也按 body.recordedBy 判自确认——防「上传即确认」经快照口落库
  const recordedBy = body.recordedBy || (prev && prev.recordedBy);
  if (actor && recordedBy && recordedBy === actor.id) {
    return '不能确认自己提交的考察';
  }
  if (!actor || !INSPECTION_CONFIRM_ROLE_SET.has(actor.role)) {
    return '无权限：考察确认/打回仅限纪检委员或支书/副支书';
  }
  return null;
}
