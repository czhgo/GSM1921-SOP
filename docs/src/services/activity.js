// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  activity.js — 活动数据 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mockDB 优先 + mock 常量 fallback
// ════════════════════════════════════════════════════════════════

import { mockDB, ReviewStatus } from '../core/domain.js?v=20260922c';
import { persist } from '../core/data-adapter.js?v=20260922c';
import { bumpToken } from '../core/version-token.js?v=20260922c';
import { BRANCH_COMMISSION_ROLES, ACTIVITY_CLASSIFICATION } from '../core/constants.js?v=20260922c';
import { ACTIVITIES } from '../mock/index.js?v=20260922c';
import { isInitStateActive } from './init-reset.js?v=20260922c'; // C2 修复（2026-09-08）：init 态空态不回退演示种子

/** 读取全部活动（同步接口，供 UI 层使用） */
export function loadActivities() {
  if (mockDB.activities.length > 0) return [...mockDB.activities];
  // C2 修复（2026-09-08）：mockDB 空 且处于 init 态 = 合法的空支部态（loadDB 已完成、
  // 业务域被清空），不得回退演示种子——否则 UI 主读口会把 demo 活动带回，init≈demo 依旧存在。
  // 无 init 哨兵（demo/正常演示态）保持原回退（未加载/首屏早期给演示数据）。
  return isInitStateActive() ? [] : [...ACTIVITIES];
}

/** 按 ID 查找活动 */
export function findActivityById(id) {
  if (!id) return null;
  const list = loadActivities();
  return list.find(a => a.id === id) || null;
}

// ════════════════════════════════════════════════════════════════
//  「组织者」按活动身份读取的单一源（2026-09-19 批次 91 · SOP-B-17）
//  口径：**组织者不是静态角色，而是「某场活动上被指定的人」**——指定即赋权（分工）、解除即收回
//       （`content/02_institution/SYSTEM_ROLE_PERMISSION.md` §9k · `D-287` · `D-308` · `D-309`）。
//  判据单一处：活动主源 `assignments` 中 `role==='organizer'`，或顶层 `organizer`
//       （创建链路已按主源同步顶层，见 `services/decision-tree.js::writeActivityWithSOP`）。
//  消费方：通知发布权（`services/notice.js::NoticePermission`）· 考勤上传位
//       （`services/attendance.js::canUploadAttendance`）· 组织者的入口承载面（成员台 / 组长台）。
//  ⚠ 勿在别处再写第二份「谁是组织者」的判据。
// ════════════════════════════════════════════════════════════════

/** 某人被指定为组织者的活动（按活动身份读，不按角色） */
export function getOrganizedActivities(personId) {
  if (!personId) return [];
  return loadActivities().filter(a => isActivityOrganizerIn(a, personId));
}

/** 某人是否是某场活动的组织者（按活动身份判定） */
export function isActivityOrganizer(personId, activityId) {
  if (!personId || !activityId) return false;
  const a = loadActivities().find(x => x.id === activityId);
  return isActivityOrganizerIn(a, personId);
}

/** 单场活动的组织者判定（纯函数，供上面两处共用，勿另写） */
function isActivityOrganizerIn(activity, personId) {
  if (!activity || !personId) return false;
  if (activity.organizer === personId) return true;
  return Array.isArray(activity.assignments)
    && activity.assignments.some(x => x && x.personId === personId && x.role === 'organizer');
}

// ════════════════════════════════════════════════════════════════
//  外出提醒清单（2026-09-19 批次 94 · SOP-B-19）
//  出处＝母本《常见工作场景快速指南》「外出活动（额外项）——提醒清单」5 项（逐字）：
//    「生成（写入）外出活动时，向组织者弹出以下提醒；随后自动收起在一处，组织者可随时展开查看。
//      该清单是提醒，不是必填项，也不作系统校验」。
//  ⚠ 它是**提醒**——不拦截写入、不要求逐项勾选、不写任何状态；清单内容单一源即此处，勿在页面另写字面量。
//  ⚠ 「外出」判据＝活动主源既有维度 `isOutdoor`（`content/04_web_design/data/DATA_MODEL.md:162`；
//    支书台写入链早已落该字段），**未新造字段**。
// ════════════════════════════════════════════════════════════════

/** 外出活动提醒清单（母本 5 项，逐字） */
export const OUTDOOR_CHECKLIST = [
  '出发前人员清点',
  '安全须知告知',
  '交通方式确认（按经费审批规则执行）',
  '经费审批（按经费审批规则执行）',
  '返回后人员清点',
];

/** 该活动是不是外出活动（读既有 isOutdoor 维度；'true' 字符串一并认，与 inspector.js 展示口径一致） */
export function isOutdoorActivity(activity) {
  const v = activity && activity.isOutdoor;
  return v === true || v === 'true';
}

// ════════════════════════════════════════════════════════════════
//  宣传初稿的承载与「审核 → 定稿」位（2026-09-19 批次 94 · SOP-B-38）
//  出处＝母本《宣传委员工作流程指南》「审核深度参与者（被分工者）撰写的宣传初稿（摘要+配图，
//        系统后台同步）并定稿」（验收同口径）；与 `D-1-③`（被分工者写、宣传委员审核成稿归档）、
//        `D-287`（上传一律组织者、代码中不设「深度参与者」身份）一致。
//  承载形态（本项待定项①，工程侧 ⇒ 自决）：**并入活动详情既有的「宣传」子记录**
//        （`mockDB.actSubRecords[activityId].publicity`，服务端表 act_sub_records）——
//        不新开独立对象、不加 tab、不新增表；待定项③（与「宣传记录」既有字段的关系）同解＝**并存**：
//        同一条记录同时承载 标题 / 撰写人 / 渠道 / 时间 ＋ 初稿状态位。
//  状态位（待定项②，工程侧 ⇒ 自决）：draft 初稿 → reviewing 待审核 → finalized 已定稿；
//        退回即回到 draft（带一句退回说明）。定稿去向＝既有宣传材料归档链（OutputType.PUBLICITY
//        → 宣传委员归档），**不新增落点**。
//  ⚠ 判据/标签单一源即此处，勿在页面另写第二份。
// ════════════════════════════════════════════════════════════════

export const PUBLICITY_DRAFT_STATUS = { DRAFT: 'draft', REVIEWING: 'reviewing', FINALIZED: 'finalized' };
export const PUBLICITY_DRAFT_LABELS = { draft: '初稿', reviewing: '待审核', finalized: '已定稿' };
/** 该子记录的初稿状态（缺省/未知 → 初稿） */
export function publicityDraftStatusOf(rec) {
  const s = rec && rec.draftStatus;
  return PUBLICITY_DRAFT_LABELS[s] ? s : PUBLICITY_DRAFT_STATUS.DRAFT;
}

/** 某活动的宣传子记录数组（缺省空数组；**返回内部引用**，写口请走 setPublicityDraftStatus） */
function _publicityOf(activityId) {
  const subs = mockDB.actSubRecords && mockDB.actSubRecords[activityId];
  return (subs && Array.isArray(subs.publicity)) ? subs.publicity : [];
}

/**
 * 全支部「宣传初稿」清单（行带所属活动）。
 * @param {{status?: 'draft'|'reviewing'|'finalized'}} [params] 缺省 = **只列待审核**
 */
export function listPublicityDrafts({ status = PUBLICITY_DRAFT_STATUS.REVIEWING } = {}) {
  const out = [];
  for (const a of loadActivities()) {
    _publicityOf(a.id).forEach((rec, index) => {
      const st = publicityDraftStatusOf(rec);
      if (status && st !== status) return;
      out.push({ activity: a, rec, index, status: st });
    });
  }
  return out;
}

/**
 * 改某条宣传子记录的初稿状态（**单一写口**）。
 * @param {{activityId:string, index:number, status:string, actorId:string, note?:string}} params
 * @returns {{ok:boolean, reason?:string}}
 */
export function setPublicityDraftStatus({ activityId, index, status, actorId, note } = {}) {
  if (!PUBLICITY_DRAFT_LABELS[status]) return { ok: false, reason: '未知的初稿状态' };
  const subs = mockDB.actSubRecords && mockDB.actSubRecords[activityId];
  const list = subs && subs.publicity;
  if (!Array.isArray(list) || !Number.isInteger(index) || index < 0 || index >= list.length) {
    return { ok: false, reason: '该宣传记录不存在' };
  }
  const rec = list[index];
  rec.draftStatus = status;
  rec.draftStatusAt = new Date().toISOString();
  rec.draftStatusBy = actorId || '';
  if (status === PUBLICITY_DRAFT_STATUS.REVIEWING) delete rec.draftReturnNote;
  if (status === PUBLICITY_DRAFT_STATUS.FINALIZED) rec.finalizedAt = rec.draftStatusAt;
  if (note) rec.draftReturnNote = String(note);
  // 单一写口落盘：与 leader/write-tab.js::saveActSubs 同款（Immutable 替换 + persist）
  mockDB.actSubRecords = { ...mockDB.actSubRecords, [activityId]: subs };
  persist();
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════
//  「我的任务」按项目内身份读取（2026-09-19 批次 93 · SOP-B-31）
//  口径（`SOP-B-31` 已定口径一 / 二）：**同一项目里，组织者与深度参与者各持「自己的那份任务」**——
//  不是同一份任务清单发给两个人。**「我的任务」（按「我」切）与「项目分工」（按「项目」切）
//  是同一份事实的两种切法**（转置），**不建第二份会互相漂移的数据**。
//  承担人判据＝**复用上面那处组织者身份单一源**（`isActivityOrganizerIn`）+ 深参取自
//  `assignments` 的 `role==='deep'`；**不新增权限体系、不给 `Task` 加承担人字段**。
//  ⚠ 只归「SOP 任务节点里按**项目内身份**派的那几项」（`executor==='organizer'` / `'deep'`）；
//    按**常设角色**派的任务（`leader` / `disc-commissioner` / `prop-commissioner` …）
//    仍属**角色级待办**（`services/todo.js`，支书 2026-08-30 裁定 S9 不动），不在本项。
//  ⚠ 深参那份任务的**来源仍是「组织者分配」**（已定口径二，`SOP-B-31` 未落地的那半）；
//    本函数只认**已带 `executor==='deep'` 的 SOP 节点**，不代替「组织者派任务」这个动作。
// ════════════════════════════════════════════════════════════════

/** 项目内身份 → SOP 节点承担人 executor 的对应（单一处，勿在别处再写第二份） */
export const PROJECT_TASK_EXECUTOR_BY_ROLE = { organizer: 'organizer', deep: 'deep' };

/**
 * 某人按项目内身份应持的 SOP 任务（行＝任务，带所属活动上下文）。
 * @param {string} personId
 * @returns {Array<{task: Object, activity: Object, projectRole: 'organizer'|'deep'}>}
 */
export function listMyProjectTasks(personId) {
  if (!personId) return [];
  const tasks = Array.isArray(mockDB.tasks) ? mockDB.tasks : [];
  const out = [];
  for (const a of loadActivities()) {
    const roles = [];
    if (isActivityOrganizerIn(a, personId)) roles.push('organizer');
    if (Array.isArray(a.assignments) && a.assignments.some(x => x && x.personId === personId && x.role === 'deep')) roles.push('deep');
    if (roles.length === 0) continue;
    for (const t of tasks) {
      if (!t || t.activityId !== a.id) continue;
      if (!roles.includes(t.executor)) continue;
      out.push({ task: t, activity: a, projectRole: t.executor });
    }
  }
  return out;
}

// ── 组织者兜底进入组长台的放行门（2026-09-19 批次 91）────────────────────
// 与 `core/constants.js::isArchiveFallbackPage`（支书/副支书兜底进宣传台归档面）同款：
//   **这位组织者的「事」在组长台那两个上传位上**（考勤上传 / 考察上传——判据与表单都是现成的，
//   见 `entries/tabs/leader/attendance-tab.js` 与 `inspection-tab.js`），故按「人」放行这一页；
//   放行面由 `modules/capabilities/leader-workspace.js` 收窄到「我的职责」里的那两个 tab，
//   **不放宽任何写权限**（写口仍按 `canUploadAttendance` / 组织者身份逐场判定）。
// 放行判据需读活动数据，故本门落在服务层（`core/constants.js` 是无 import 的叶子模块，不入那侧）。
// 消费点单一源：`core/bootstrap.js` 身份门 —— 勿手写第二份。
export const ORGANIZER_FALLBACK_PAGE = 'leader.html';
export function isOrganizerFallbackPage(personId, page) {
  if (!personId) return false;
  const norm = (p) => (p || '').replace(/\.html$/, '');
  if (norm(page) !== norm(ORGANIZER_FALLBACK_PAGE)) return false;
  return getOrganizedActivities(personId).length > 0;
}

// ════════════════════════════════════════════════════════════════
//  品牌认定：提案 → 支委会审议通过后确定（2026-09-21 批次 132 · 支书口径二）
// ════════════════════════════════════════════════════════════════
// 支书原话（逐字）：「**支委/党小组组长均可以提案，支委会（如果有党小组组长则是支委扩大会）
//   通过后确定。**」
// 读法 / 落地（⚠ 读法系按原话逐字拆，不是另立口径）：
//   · **提案权＝支委层 ＋ 党小组组长**（党小组组长**不在支委层** ⇒ 他只「提案」、不参与「确定」）；
//   · **确定权＝支委会通过后确定**——复用既有那台机器：提案进「拟上会」清单
//     （批次 127 `buildAgendaCandidates` 的一张清单，本批新增 `brand` 类目）→ 支委会议程项 →
//     记录结果（批次 129 的 `recordAgendaResult` 结果分支，本批新增 `brand-designation` 分流）；
//   · **不再有「点一下即认定」**：`isBrand` 只能由 **支委会议程项记录「通过」** 置位（`applyBrandDesignationResult`）。
// 落库形状（**不新增表 / 不新增页面**，字段落在活动主源）：
//   · 提案留痕 `brandProposal = { by, at, note, reviewResult?, reviewedBy?, reviewedAt?, reviewActivityId?, reviewAgendaItemId?, reviewNote? }`；
//   · 认定留痕 `brandDesignatedBy / brandDesignatedAt / brandDesignationActivityId / brandDesignationAgendaItemId`；
//   · 通过后 `brandProposal` 置 null（已议决）；取消认定写 `brandRevokedBy / brandRevokedAt`。
// 「支委扩大会」：**系统里没有独立的「支委扩大会」会议类型**（活动类型目录只有「支委会」）——
//   按本批自定的最小做法：**用既有「支委会」会议承载**（党小组组长在场即扩大会，由与会人员体现），
//   判据 `BRAND_MEETING_RE` 按既有类型字面同源。**不新增会议类型**。
// ⚠ 判据（谁能提案 / 哪场会能定）单一源即本段，勿在页面另写。

/** 提案权角色集＝支委层（`constants.js::BRANCH_COMMISSION_ROLES` 单一源）＋ 党小组组长 */
export const BRAND_PROPOSER_ROLES = [...BRANCH_COMMISSION_ROLES, 'leader'];

/** 能承载「品牌认定」审议的会议类型（支委会；党小组组长在场即支委扩大会，同属支委会会议） */
const BRAND_MEETING_RE = /支委/;

/** 品牌认定未通过的缺省审议意见 */
export const BRAND_REJECT_NOTE = '支委会审议未通过，本次品牌认定不成立（提案保留、可再议）';

/** 谁能提品牌认定案（按角色键） */
export function canProposeBrand(role) {
  return BRAND_PROPOSER_ROLES.includes(role);
}

/** 某活动的品牌认定提案（无提案 → null） */
export function brandProposalOf(activity) {
  const p = activity && activity.brandProposal;
  return (p && typeof p === 'object' && !Array.isArray(p)) ? p : null;
}

/** 待审议的品牌认定提案清单（＝「拟上会」清单 `brand` 类目的数据源；来源活动主源一处） */
export function listBrandProposals() {
  return loadActivities()
    .filter((a) => a && !a.archived && a.isBrand !== true && brandProposalOf(a))
    .map((a) => ({ id: a.id, title: a.title || a.id, proposal: brandProposalOf(a) }));
}

/** 活动主源单点改写（Immutable 替换 + 域缓存失效 + 落库；与 saveDB 同一落盘口） */
function _writeActivityField(id, patch) {
  const idx = mockDB.activities.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated = { ...mockDB.activities[idx], ...patch };
  mockDB.activities = [
    ...mockDB.activities.slice(0, idx),
    updated,
    ...mockDB.activities.slice(idx + 1),
  ];
  bumpToken('activity');
  persist();
  return updated;
}

/**
 * 提案：把某场活动提上「品牌认定」议题（**只登记提案，不作任何认定**）。
 * 提案人＝支委层或党小组组长（`BRAND_PROPOSER_ROLES`）。
 * @returns {{ok:boolean, reason?:string}}
 */
export function proposeBrandDesignation({ activityId, by, role, note } = {}) {
  if (!canProposeBrand(role)) return { ok: false, reason: '仅支委与党小组组长可以提案' };
  const act = findActivityById(activityId);
  if (!act) return { ok: false, reason: '活动不存在' };
  if (act.isBrand === true) return { ok: false, reason: '该活动已认定为品牌活动' };
  if (brandProposalOf(act)) return { ok: false, reason: '该活动已有品牌认定提案（待支委会审议）' };
  const at = new Date().toISOString();
  _writeActivityField(activityId, { brandProposal: { by: by || null, at, note: String(note || '').trim() } });
  return { ok: true };
}

/**
 * 撤回提案（提案人本人或支委层）——免「提错了只能挂着」这一条死角。
 * @returns {{ok:boolean, reason?:string}}
 */
export function withdrawBrandProposal({ activityId, by, role } = {}) {
  const act = findActivityById(activityId);
  const proposal = brandProposalOf(act);
  if (!proposal) return { ok: false, reason: '该活动没有待审议的品牌认定提案' };
  if (!BRANCH_COMMISSION_ROLES.includes(role) && proposal.by !== by) {
    return { ok: false, reason: '撤回提案限提案人本人或支委层' };
  }
  _writeActivityField(activityId, { brandProposal: null });
  return { ok: true };
}

/**
 * 取消品牌认定（支委层）——认定与取消都只有「支委会」这一条路，故本动作**同时留痕**
 * （不主张「点一下即认定」：成品牌必须走提案 → 支委会通过；本条只管把已有认定撤下来）。
 * @returns {{ok:boolean, reason?:string}}
 */
export function revokeBrandDesignation({ activityId, by, role } = {}) {
  if (!BRANCH_COMMISSION_ROLES.includes(role)) return { ok: false, reason: '取消品牌认定限支委层' };
  const act = findActivityById(activityId);
  if (!act) return { ok: false, reason: '活动不存在' };
  if (act.isBrand !== true) return { ok: false, reason: '该活动当前不是品牌活动' };
  _writeActivityField(activityId, {
    isBrand: false,
    brandRevokedBy: by || null,
    brandRevokedAt: new Date().toISOString(),
  });
  return { ok: true };
}

/**
 * 议程项结果 → 品牌认定状态迁移（**纯函数**；判据与状态迁移的唯一落点，
 * 由 `services/agenda-follow-up.js::recordAgendaResult` 的 `brand-designation` 分支调用，IO 在那边做）。
 * 只对**带品牌提案**的活动且**会议类型＝支委会（含支委扩大会）**时生效；会议类型不符则不动
 * （防从别的会上把品牌推出去；与制度链 `applyInstitutionAgendaResult` 同法）。
 * 通过 ⇒ **确定品牌认定**（置 `isBrand` ＋ 认定留痕，提案随之清空）；
 * 未通过 ⇒ **不作认定**（仍无 `isBrand`）＋ 提案留退回意见（可再议）。
 * @param {Object} p
 * @param {Object} p.activity 目标活动（品牌认定的对象）
 * @param {string} p.meetingType 承载议程的会议类型
 * @param {'passed'|'rejected'|'partial'} p.decision 本次记录的议程结果
 * @param {string} [p.by] 记录人 personId
 * @param {string} [p.at] 记录时间（缺省＝当下）
 * @param {string} [p.activityId] / @param {string} [p.agendaItemId] 留痕回指
 * @param {string} [p.note] 审议意见（未通过时作退回意见）
 * @returns {{ok:boolean, reason?:string, patch?:Object}}
 */
export function applyBrandDesignationResult({
  activity, meetingType, decision, by = null, at = null, activityId = null, agendaItemId = null, note = '',
} = {}) {
  const proposal = brandProposalOf(activity);
  if (!proposal) return { ok: false, reason: 'not-a-brand-proposal' };
  if (!BRAND_MEETING_RE.test(String(meetingType || ''))) return { ok: false, reason: 'meeting-mismatch' };
  const stamp = at || new Date().toISOString();
  const trail = {
    reviewedBy: by || null,
    reviewedAt: stamp,
    reviewActivityId: activityId || null,
    reviewAgendaItemId: agendaItemId || null,
  };
  if (decision !== 'passed') {
    // 未通过（含部分通过）⇒ 不作认定；提案保留 ＋ 退回意见（可改后重新提上会）
    return {
      ok: true,
      patch: {
        brandProposal: {
          ...proposal,
          ...trail,
          reviewResult: 'rejected',
          reviewNote: String(note || '').trim() || BRAND_REJECT_NOTE,
        },
      },
    };
  }
  return {
    ok: true,
    patch: {
      isBrand: true,
      brandDesignatedBy: by || null,
      brandDesignatedAt: stamp,
      brandDesignationActivityId: activityId || null,
      brandDesignationAgendaItemId: agendaItemId || null,
      brandProposal: null,
    },
  };
}

/**
 * 审议结果**落库**（本段唯一写口；`applyBrandDesignationResult` 的 IO 外壳）：
 * 判据仍由纯函数给出，落库走活动主源单点改写（`_writeActivityField`：Immutable 替换 + 域缓存失效 +
 * persist → mock 形态写 localStorage / API 形态写穿服务端快照）——**mock 与 api 同码**。
 * ⚠ 为什么不走 `adapter.activities.update`：那是「只写服务端」的路径，页面本地活动主源仍是旧值，
 *   紧随其后的任何一次快照（如记录议程结果后的 `updateAgenda`）会以旧值把刚写入的认定**覆盖回去**
 *   （2026-09-21 批次 132 真机实测：PATCH 已落、随后被页面快照回滚）。
 * @returns {{ok:boolean, reason?:string, patch?:Object}}
 */
export function commitBrandDesignationResult({
  activityId, meetingActivityId = null, meetingType, decision, by = null, at = null, agendaItemId = null, note = '',
} = {}) {
  const activity = findActivityById(activityId);
  const res = applyBrandDesignationResult({
    activity, meetingType, decision, by, at, activityId: meetingActivityId, agendaItemId, note,
  });
  if (!res.ok) return res;
  _writeActivityField(activityId, res.patch);
  return res;
}

// ════════════════════════════════════════════════════════════════
//  追加复盘要求：支委会额外要求组织者完成复盘（2026-09-21 批次 135 · 裁定二「按推荐档落」）
// ════════════════════════════════════════════════════════════════
// 2026-09-21 支书裁定（逐字）：「**按推荐档落（推荐）**」。推荐档内容（逐字照落）：
//   「**额外要求组织者复盘**」并入**活动关闭判据**，但**只判到「交回」、不判到「确认」**；
//   **发起权给支委会全体**；**三会一课不适用**（不改「三会一课不看复盘」常态）；
//   **组织者本人不能自行更新**。
// 读法 / 落地（⚠ 系按推荐档逐字拆，非另立口径）：
//   · **发起权＝支委会全体**（支委层；`constants.js::BRANCH_COMMISSION_ROLES` 单一源，勿在页面另写名单）；
//   · **三会一课不适用**——判据单一处 `isReviewRequestEligibleActivity`，**发起与关闭判据共用**；
//   · **只判到「交回」**——该场复盘记录存在且状态 ≠ 未提交即算交回过（**纪检的「确认」不额外卡关闭**）；
//   · 「额外要求」**不新开第二条复盘**——只把该活动的复盘从「不需要」翻成「需要」，
//     组织者仍走成员端「我的复盘」那张既有表单（`services/review.js::submitActivityReviewForm`）；
//   · **不开「组织者自行更新」这条路**——本段只提供支委侧的「要求 / 撤回」，**不给组织者任何改写入口**
//     （既有口径：复盘只有被纪检打回时才回到可重提态，见 `services/review.js` 的 `submitActivityReviewForm`）。
// 落库形状（**不新增表 / 不新增页面**，字段落在活动主源）：
//   · 要求留痕 `reviewRequest = { by, at, note }`；撤回置 null。
// ⚠ 判据（谁能发起 / 哪场适用 / 何时算交回）单一源即本段，勿在页面或关闭判据处另写。

/** 发起权角色集＝支委会全体（支委层；`constants.js::BRANCH_COMMISSION_ROLES` 单一源） */
export const REVIEW_REQUEST_ROLES = [...BRANCH_COMMISSION_ROLES];

/** 三会一课子类（单一源＝`ACTIVITY_CLASSIFICATION`；本项对之不适用） */
const _MEETING_TYPES = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes;

/** 追加复盘要求对本场活动是否适用：**三会一课不适用**（裁定二逐字） */
export function isReviewRequestEligibleActivity(activity) {
  return !!activity && !_MEETING_TYPES.includes(activity.type || '');
}

/** 谁能发起追加要求（按角色键）＝支委会全体 */
export function canRequestReview(role) {
  return REVIEW_REQUEST_ROLES.includes(role);
}

/** 某活动的追加复盘要求（无 → null） */
export function reviewRequestOf(activity) {
  const r = activity && activity.reviewRequest;
  return (r && typeof r === 'object' && !Array.isArray(r)) ? r : null;
}

/**
 * 追加要求是否已「交回」——**只判到交回、不判到确认**（裁定二逐字）。
 * 交回＝该场已有复盘记录且状态不是「未提交」（已上传 / 批注中 / 已确认 / 已打回 均算交回过）。
 * @param {Object|null} review 该场复盘记录（`services/review.js::loadActivityReviews()` 那一行）
 */
export function isReviewReturned(review) {
  if (!review) return false;
  return review.reviewStatus !== ReviewStatus.NOT_SUBMITTED;
}

/**
 * 发起：支委会额外要求该场组织者完成复盘（**只登记要求、不改复盘状态、不新开第二条复盘**）。
 * @returns {{ok:boolean, reason?:string}}
 */
export function requestOrganizerReview({ activityId, by, role, note } = {}) {
  if (!canRequestReview(role)) return { ok: false, reason: '仅支委会（支委层）可以发起' };
  const act = findActivityById(activityId);
  if (!act) return { ok: false, reason: '活动不存在' };
  if (!isReviewRequestEligibleActivity(act)) return { ok: false, reason: '三会一课不适用（不改「三会一课不看复盘」常态）' };
  if (reviewRequestOf(act)) return { ok: false, reason: '本场已有追加复盘要求（未撤回）' };
  _writeActivityField(activityId, {
    reviewRequest: { by: by || null, at: new Date().toISOString(), note: String(note || '').trim() },
  });
  return { ok: true };
}

/**
 * 撤回追加要求（发起人本人或支委层）——免「提错了只能挂着」这条死角。
 * @returns {{ok:boolean, reason?:string}}
 */
export function withdrawReviewRequest({ activityId, by, role } = {}) {
  const act = findActivityById(activityId);
  const req = reviewRequestOf(act);
  if (!req) return { ok: false, reason: '本场没有追加复盘要求' };
  if (!REVIEW_REQUEST_ROLES.includes(role) && req.by !== by) {
    return { ok: false, reason: '撤回限发起人本人或支委会' };
  }
  _writeActivityField(activityId, { reviewRequest: null });
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════
//  「勾掉即关闭」（2026-09-21 批次 137 · `SOP-B-9` 乙档）
//  乙档口径（支书圈定，逐字）：**谁担这一步就查那几步；并入本人既有的待办（我的任务）、
//    不另开一处；本人勾掉即关闭。**
//  落地（**不另开一处、不设门槛**）：
//    · 落点＝成员台「项目分工 → 我的任务」**既有卡片**上加一个勾掉动作——
//      **不新开页面 / tab / 对象 / 表**；
//    · 放行＝**只认「本人按项目内身份持的这步任务」**（判据复用上面 `listMyProjectTasks` 单一源）
//      ⇒ **不担这一步的人看不到、也勾不了**（服务层再复算一次，防绕过 UI）；
//    · 与「归档级联」不打架：归档把该活动**全部**任务一并置 `completed`
//      （`services/mock.js::archiveActivity`），本动作只做「未完成 → 已完成」单向；
//      两条路**都只往 `completed` 走、无任何路径把它改回未完成** ⇒ 谁先谁后结果相同。
//  ⚠ 管理侧活动详情页的任务状态徽章（`components/inspector.js`）是**另一处既有面**，本项未动。
//  ⚠ 本段置于文件末尾（批次 132 行号纪律）：不改动上文任何行号，`README-server.md` 引用不漂移。
// ════════════════════════════════════════════════════════════════

/**
 * 本人勾掉「我的任务」里的一步（勾掉即关闭）。
 * @param {string} personId
 * @param {string} taskId
 * @returns {{ok: boolean, reason?: string, task?: Object}}
 */
export function completeMyProjectTask(personId, taskId) {
  if (!personId || !taskId) return { ok: false, reason: 'invalid' };
  const mine = listMyProjectTasks(personId).find((x) => x.task && x.task.id === taskId);
  if (!mine) return { ok: false, reason: 'not-mine' }; // 不担这一步 ⇒ 勾不了
  if (mine.task.status === 'completed') return { ok: true, task: mine.task }; // 幂等
  let updated = null;
  mockDB.tasks = (Array.isArray(mockDB.tasks) ? mockDB.tasks : []).map((t) => {
    if (!t || t.id !== taskId) return t;
    updated = { ...t, status: 'completed' };
    return updated;
  });
  persist();
  return { ok: true, task: updated };
}
