// 数据域接线批次二（2026-09-03）：展示格式化 attendanceToLong 已提升至 services/activity/attendance.js；
// 本文件退化为纯考勤种子数据仓（PEOPLE 供全员出席名单生成）。
import { PEOPLE } from './people.js?v=20261024b';
import { AttendanceStatus } from '../../core/domain/domain.js?v=20261024b';

// 最后更新：2026-09-06（演示数据基线刷新）
// 显式段 att1~att43 的 recordedAt 随关联活动重排同步平移（recordedAt = 活动日当天），
//   活动新日期见 activities.js 头部注释（旧 3–6 月批次 → 2026-07-01~07-24）；
// ID 连续序列 att1~att43 保持不变；8 月生成段（att44 起）不受影响。
// R10-D15：记录不再存 `overdue` 快照（超期一律由 policy-defaults::isAttendanceOverdue 现算）。
export const ATTENDANCE_RECORDS = [
  // ── act-1 (2026-07-01) 7月党小组会 ─────────────────────────
  { id: 'att1',  personId: '2400012345',  activityId: 'act-1',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-01T18:00:00Z' },
  { id: 'att2',  personId: '2400012347',  activityId: 'act-1',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-01T18:00:00Z' },

  // ── act-2 (2026-07-02) 7月支委会 ───────────────────────────
  { id: 'att3',  personId: '2400012346',  activityId: 'act-2',  status: AttendanceStatus.ABSENT,   recordedBy: '2400012354', recordedAt: '2026-07-02T18:00:00Z' },
  { id: 'att4',  personId: '2400012345',  activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-02T18:00:00Z' },
  { id: 'att5',  personId: '2400012348',  activityId: 'act-2',  status: AttendanceStatus.ABSENT,   recordedBy: '2400012354', recordedAt: '2026-07-02T18:00:00Z' },
  { id: 'att6',  personId: '2300010001', activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-02T18:00:00Z' },
  { id: 'att7',  personId: '2300010002', activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-02T18:00:00Z' },

  // ── act-3 (2026-07-03) 7月主题党日：学习两会精神 ────────────
  { id: 'att8',  personId: '2400012347',  activityId: 'act-3',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-03T18:00:00Z' },
  { id: 'att9',  personId: '2400012346',  activityId: 'act-3',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-03T18:00:00Z' },

  // ── act-4 (2026-07-06) 7月党小组会 ─────────────────────────
  { id: 'att10', personId: '2400012348',  activityId: 'act-4',  status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-07-06T18:00:00Z' },
  { id: 'att11', personId: '2400012349',  activityId: 'act-4',  status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-07-06T18:00:00Z' },

  // ── act-5 (2026-07-07) 7月支委会 ───────────────────────────
  { id: 'att12', personId: '2400012349',  activityId: 'act-5',  status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-07T18:00:00Z' },
  { id: 'att13', personId: '2400012351',  activityId: 'act-5',  status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-07T18:00:00Z' },

  // ── act-6 (2026-07-09) 7月党课：新时代青年担当 ──────────────
  // 2500010001 缺勤后完成补课（mk5），status='made_up'
  { id: 'att14', personId: '2500010001', activityId: 'act-6',  status: AttendanceStatus.MADE_UP,  recordedBy: '2400012354', recordedAt: '2026-07-09T18:00:00Z' },

  // ── act-8 (2026-07-11) 7月支部党员大会 ─────────────────────
  { id: 'att15', personId: '2400012345',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att16', personId: '2400012346',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att17', personId: '2400012348',  activityId: 'act-8',  status: AttendanceStatus.LEAVE,    recordedBy: '2400012354', recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att18', personId: '2400012350',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att19', personId: '2400012353',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att20', personId: '2400012355', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att21', personId: '2300010001', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att22', personId: '2300010002', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-11T18:00:00Z' },
  { id: 'att23', personId: '2500010001', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-11T18:00:00Z' },

  // ── act-9 (2026-07-12) 7月党小组会 ─────────────────────────
  // 2400012351 缺勤后完成补课（mk3），status='made_up'
  { id: 'att24', personId: '2400012347',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-12T18:00:00Z' },
  { id: 'att25', personId: '2400012349',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-12T18:00:00Z' },
  { id: 'att26', personId: '2400012350',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-12T18:00:00Z' },
  { id: 'att27', personId: '2400012351',  activityId: 'act-9',  status: AttendanceStatus.MADE_UP,  recordedBy: '2400012354', recordedAt: '2026-07-12T18:00:00Z' },
  { id: 'att28', personId: '2400012352',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-12T18:00:00Z' },
  { id: 'att29', personId: '2500010001', activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-12T18:00:00Z' },

  // ── act-10 (2026-07-13) 7月主题党日：五四精神传承 ────────────
  { id: 'att30', personId: '2400012352',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-13T18:00:00Z' },
  { id: 'att31', personId: '2400012353',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-13T18:00:00Z' },
  { id: 'att32', personId: '2400012345',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-13T18:00:00Z' },
  { id: 'att33', personId: '2400012346',  activityId: 'act-10', status: AttendanceStatus.LEAVE,    recordedBy: '2400012354', recordedAt: '2026-07-13T18:00:00Z' },
  { id: 'att34', personId: '2400012348',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-13T18:00:00Z' },
  { id: 'att35', personId: '2400012354', activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-13T18:00:00Z' },
  { id: 'att36', personId: '2400012356', activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-13T18:00:00Z' },

  // ── act-11 (2026-07-14) 7月支委会 ──────────────────────────
  { id: 'att37', personId: '2400012354', activityId: 'act-11', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-07-14T18:00:00Z' },
  { id: 'att38', personId: '2400012349',  activityId: 'act-11', status: AttendanceStatus.ABSENT,   recordedBy: '2400012354', recordedAt: '2026-07-14T18:00:00Z' },

  // ── act-19 (2026-07-19) 7月组织生活会 ──────────────────────
  // 组织生活会考勤记录需补充 studentId/developStage/partyGroup（D-239 中文枚举）
  { id: 'att39', personId: '2400012345',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-19T18:00:00Z', studentId: '2400012345', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'att40', personId: '2400012348',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-19T18:00:00Z', studentId: '2400012348', developStage: '正式党员', partyGroup: '第三党小组' },
  { id: 'att41', personId: '2400012350',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: '2400012354', recordedAt: '2026-07-19T18:00:00Z', studentId: '2400012350', developStage: '发展对象', partyGroup: '第一党小组' },
  { id: 'att42', personId: '2400012351',  activityId: 'act-19', status: AttendanceStatus.ABSENT,   recordedBy: '2400012354', recordedAt: '2026-07-19T18:00:00Z', studentId: '2400012351', developStage: '积极分子', partyGroup: '第三党小组' },
  { id: 'att43', personId: '2400012352',  activityId: 'act-19', status: AttendanceStatus.LEAVE,    recordedBy: '2400012354', recordedAt: '2026-07-19T18:00:00Z', studentId: '2400012352', developStage: '正式党员', partyGroup: '第二党小组' },

  // ── act-31 (2026-09-10) 9月支部党员大会：线上异步表决 ──────────
  // 三条约束：① 必须是 **9 月**——成员台考勤只列当月活动，而 9 月只有 act-31 可挂补课入口；
  //   ② `recordedBy` 用已确认纪检（非 null）——补课任务由「纪检确认考勤」派生，待确认态与已存在补课任务自相矛盾；
  //   ③ id 取 `att900` 隔离段并落在 `^att\d+$` 种子 id 空间（`init-reset.js::INIT_SEED_ID_PATTERNS.attendances`）。
  { id: 'att900', personId: '2400012349', activityId: 'act-31', status: AttendanceStatus.ABSENT, recordedBy: '2400012354', recordedAt: '2026-09-10T18:00:00Z' },
];

// ── 8 月考勤全覆盖（2026-08-05 支书裁决「补全 5 场全覆盖」；次日修订）────
// 2026-08-05 修订（支书裁决）：
//   1. act-28「谈话考察」违背 5b2e4ea「删除考察活动类型」，已彻底删除（活动/考勤/通知）
//   2. 已生成考勤的活动日期前移至已发生（≤ 8/5）：act-26 8/1、act-27 8/3、act-29 8/4；
//      未来活动 act-30（8/28，种子里不生成考勤）不生成考勤——「部署会尚未发生/未录入」语义自洽
//      R2-31 后 act-30 已按日期收口为 completed，但**仍保留「无考勤」**：这是「已结束未录考勤」的演示路径。
//   3. 原 act-26 显式段（att44~60）并入生成器统一覆盖（去重），ID 从 att44 起连续
// 覆盖规则（确定性生成，非随机——刷新与跨会话结果稳定）：
//   act-26 8/1  党小组会（暑期线上）          → 全员 50 人
//   act-29 8/4  暑期实践总结分享（主题党日）   → 全员 50 人
// R10（2026-10-23）：**删除 act-27 支委会考勤生成**——制度上支委会不考勤，
//   旧生成段会产出 recordedBy:null 的待确认死项（C06）。历史支委会考勤（act-2/5/11）见文件末尾标注。
// 状态分布：出勤为主；按 (idx + 事件偏移) 确定性抽取请假/缺勤，统一待纪检确认（recordedBy null）。

// 全员（三党小组 17/17/16 共 50 人）——**限本支部成员**：
// 2026-09-26 本批改准：原 `PEOPLE.map(p => p.id)` 会把**党委组织员 9000000001**（`branchId: null`，不属任一支部，
//   见 `people.js`）一并写进 act-26/act-29 的「全员出席」⇒ 生产 2 条游离于支部成员集之外的考勤行，
//   且与本常量上注「共 50 人」自相矛盾（实得 51）。既有三处口径均把 9000000001 排除在支部名单外
//   （`roster.test`「9000000001 不入选」· `base-data-preview.test`「本支部成员 50 名，不含 9000000001」· `group-view.test`
//   「三组合计 50，9000000001 剔除」）⇒ 本处按支部归属过滤，回到 50。
const _ALL_PERSON_IDS = PEOPLE.filter((p) => p.branchId).map((p) => p.id);

const _AUGUST_EVENTS = [
  { activityId: 'act-26', recordedAt: '2026-08-01T20:00:00Z', people: _ALL_PERSON_IDS },
  { activityId: 'act-29', recordedAt: '2026-08-04T14:00:00Z', people: _ALL_PERSON_IDS },
];

function _buildAugustAttendance() {
  const records = [];
  let seq = 44;  // 紧接 att43 之后连续编号（原显式段 att44~60 已并入生成器）
  _AUGUST_EVENTS.forEach((ev, evIdx) => {
    // 事件级偏移避免同一人每场状态完全相同；新记录统一留空 recordedBy（待纪检确认）
    ev.people.forEach((pid, idx) => {
      const n = idx + evIdx * 7;
      const status = (n % 13 === 0) ? AttendanceStatus.LEAVE
        : (n % 17 === 0) ? AttendanceStatus.ABSENT
        : AttendanceStatus.PRESENT;
      records.push({
        id: `att${seq++}`,
        personId: pid,
        activityId: ev.activityId,
        status,
        recordedBy: null,
        recordedAt: ev.recordedAt,
      });
    });
  });
  return records;
}

// 追加到导出数组（生成器 att44 起连续序列，与 att1~att43 显式段衔接）
ATTENDANCE_RECORDS.push(..._buildAugustAttendance());

// ── R10（2026-10-23）：种子确认态与历史制度标注 ─────────────────────────
// ① 支委会考勤属「制度调整前历史」：act-2/5/11 的显式考勤行保留，但标 `legacyPolicy:true`，
//    不再按现行口径生成新的支委会考勤；历史行中不含 recordedBy:null 的请假/缺勤待确认项。
// ② 历史种子里 `recordedBy` 是上传/录入人（多为纪检 2400012354，会议录入即确认）；确认三件套
//    按同一确认人在数据上显式落库，避免读侧把「上传人」当成确认人（D08）。
//    异常上传行（recordedBy:null）不在此冒充确认人，仍按业务待确认处理。
const LEGACY_COMMITTEE_ATTENDANCE_ACTIVITIES = new Set(['act-2', 'act-5', 'act-11']);
for (const record of ATTENDANCE_RECORDS) {
  if (LEGACY_COMMITTEE_ATTENDANCE_ACTIVITIES.has(record.activityId)) record.legacyPolicy = true;
  if (record.recordedBy && !record.confirmedBy) {
    record.confirmed = true;
    record.confirmedBy = record.recordedBy;
    record.confirmedAt = record.recordedAt;
  }
}
