// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  activity.js — 活动数据 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mockDB 优先 + mock 常量 fallback
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260919g';
import { persist } from '../core/data-adapter.js?v=20260919g';
import { ACTIVITIES } from '../mock/index.js?v=20260919g';
import { isInitStateActive } from './init-reset.js?v=20260919g'; // C2 修复（2026-09-08）：init 态空态不回退演示种子

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
//    按**常设角色**派的任务（`leader` / `disc-commissioner` / `prop-commissioner` / `all` …）
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
