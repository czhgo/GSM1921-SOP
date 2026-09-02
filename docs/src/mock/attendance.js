// 修复（T175）：不再从 ./index.js 导入 _personName 等辅助函数，
// 消除 mock/index.js ↔ mock/attendance.js 循环依赖。
// 直接依赖 services/person.js + mock/activities.js。
import { getPersonName } from '../services/person.js?v=20260901r';
import { ACTIVITIES } from './activities.js?v=20260901r';
import { PEOPLE } from './people.js?v=20260901r';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js?v=20260901r';

const _personName = (id) => getPersonName(id);
const _activityTitle = (id) => ACTIVITIES.find(a => a.id === id)?.title || id;
const _activityType = (id) => ACTIVITIES.find(a => a.id === id)?.type || '未知';

// 最后更新：2026-07-16（T-2026-07-006 第 5 轮 mock 数据迭代）
// ID 重排为连续序列 att1~att43，补充 recordedAt 字段
// act-19（组织生活会）记录补充 studentId/developStage/partyGroup
// 已完成补课任务（mk3/mk5）对应考勤记录 status='made_up'
export const ATTENDANCE_RECORDS = [
  // ── act-1 (2026-03-15) 3月党小组会 ─────────────────────────
  { id: 'att1',  personId: 'p1',  activityId: 'act-1',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-15T18:00:00Z', overdue: false },
  { id: 'att2',  personId: 'p3',  activityId: 'act-1',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-15T18:00:00Z', overdue: false },

  // ── act-2 (2026-03-18) 3月支委会 ───────────────────────────
  { id: 'att3',  personId: 'p2',  activityId: 'act-2',  status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att4',  personId: 'p1',  activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att5',  personId: 'p4',  activityId: 'act-2',  status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att6',  personId: 'p13', activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-18T18:00:00Z', overdue: false },
  { id: 'att7',  personId: 'p14', activityId: 'act-2',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-18T18:00:00Z', overdue: false },

  // ── act-3 (2026-03-22) 3月主题党日：学习两会精神 ─────────────
  { id: 'att8',  personId: 'p3',  activityId: 'act-3',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-22T18:00:00Z', overdue: false },
  { id: 'att9',  personId: 'p2',  activityId: 'act-3',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-03-22T18:00:00Z', overdue: false },

  // ── act-4 (2026-04-12) 4月党小组会 ─────────────────────────
  { id: 'att10', personId: 'p4',  activityId: 'act-4',  status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-04-12T18:00:00Z', overdue: true },
  { id: 'att11', personId: 'p5',  activityId: 'act-4',  status: AttendanceStatus.LEAVE,    recordedBy: null,  recordedAt: '2026-04-12T18:00:00Z', overdue: false },

  // ── act-5 (2026-04-15) 4月支委会 ───────────────────────────
  { id: 'att12', personId: 'p5',  activityId: 'act-5',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-04-15T18:00:00Z', overdue: false },
  { id: 'att13', personId: 'p7',  activityId: 'act-5',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-04-15T18:00:00Z', overdue: false },

  // ── act-6 (2026-04-25) 4月党课：新时代青年担当 ──────────────
  // p15 缺勤后完成补课（mk5），status='made_up'
  { id: 'att14', personId: 'p15', activityId: 'act-6',  status: AttendanceStatus.MADE_UP,  recordedBy: 'p10', recordedAt: '2026-04-25T18:00:00Z', overdue: false },

  // ── act-8 (2026-05-10) 5月支部党员大会 ─────────────────────
  { id: 'att15', personId: 'p1',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att16', personId: 'p2',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att17', personId: 'p4',  activityId: 'act-8',  status: AttendanceStatus.LEAVE,    recordedBy: 'p10', recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att18', personId: 'p6',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att19', personId: 'p9',  activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att20', personId: 'p11', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att21', personId: 'p13', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att22', personId: 'p14', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-10T18:00:00Z', overdue: false },
  { id: 'att23', personId: 'p15', activityId: 'act-8',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-10T18:00:00Z', overdue: false },

  // ── act-9 (2026-05-14) 5月党小组会 ─────────────────────────
  // p7 缺勤后完成补课（mk3），status='made_up'
  { id: 'att24', personId: 'p3',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att25', personId: 'p5',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att26', personId: 'p6',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att27', personId: 'p7',  activityId: 'act-9',  status: AttendanceStatus.MADE_UP,  recordedBy: 'p10', recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att28', personId: 'p8',  activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-14T18:00:00Z', overdue: false },
  { id: 'att29', personId: 'p15', activityId: 'act-9',  status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-14T18:00:00Z', overdue: false },

  // ── act-10 (2026-05-18) 5月主题党日：五四精神传承 ────────────
  { id: 'att30', personId: 'p8',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att31', personId: 'p9',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att32', personId: 'p1',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att33', personId: 'p2',  activityId: 'act-10', status: AttendanceStatus.LEAVE,    recordedBy: 'p10', recordedAt: '2026-05-18T18:00:00Z', overdue: true },
  { id: 'att34', personId: 'p4',  activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att35', personId: 'p10', activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },
  { id: 'att36', personId: 'p12', activityId: 'act-10', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-18T18:00:00Z', overdue: false },

  // ── act-11 (2026-05-20) 5月支委会 ──────────────────────────
  { id: 'att37', personId: 'p10', activityId: 'act-11', status: AttendanceStatus.PRESENT,  recordedBy: null,  recordedAt: '2026-05-20T18:00:00Z', overdue: false },
  { id: 'att38', personId: 'p5',  activityId: 'act-11', status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-05-20T18:00:00Z', overdue: false },

  // ── act-19 (2026-05-28) 5月组织生活会 ──────────────────────
  // 组织生活会考勤记录需补充 studentId/developStage/partyGroup（D-239 中文枚举）
  { id: 'att39', personId: 'p1',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012345', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'att40', personId: 'p4',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012348', developStage: '正式党员', partyGroup: '第三党小组' },
  { id: 'att41', personId: 'p6',  activityId: 'act-19', status: AttendanceStatus.PRESENT,  recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012350', developStage: '发展对象', partyGroup: '第一党小组' },
  { id: 'att42', personId: 'p7',  activityId: 'act-19', status: AttendanceStatus.ABSENT,   recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012351', developStage: '积极分子', partyGroup: '第三党小组' },
  { id: 'att43', personId: 'p8',  activityId: 'act-19', status: AttendanceStatus.LEAVE,    recordedBy: 'p10', recordedAt: '2026-05-28T18:00:00Z', overdue: false, studentId: '2400012352', developStage: '正式党员', partyGroup: '第二党小组' },
];

// ── 8 月考勤全覆盖（2026-08-05 书记裁决「补全 5 场全覆盖」；次日修订）────
// 2026-08-05 修订（书记裁决）：
//   1. act-28「谈话考察」违背 5b2e4ea「删除考察活动类型」，已彻底删除（活动/考勤/通知）
//   2. 已生成考勤的活动日期前移至已发生（≤ 8/5）：act-26 8/1、act-27 8/3、act-29 8/4；
//      未来活动 act-30（8/28 draft）不生成考勤——「8 月底活动不可能已出勤」语义自洽
//   3. 原 act-26 显式段（att44~60）并入生成器统一覆盖（去重），ID 从 att44 起连续
// 覆盖规则（确定性生成，非随机——刷新与跨会话结果稳定）：
//   act-26 8/1  党小组会（暑期线上）          → 全员 50 人
//   act-27 8/3  支委会：新学期筹备            → 支委班子 8 人（书记/副书记/组织/宣传/纪检 + 三组长）
//   act-29 8/4  暑期实践总结分享（主题党日）   → 全员 50 人
// 状态分布：出勤为主；按 (idx + 事件偏移) 确定性抽取请假/缺勤，统一待纪检确认（recordedBy null）。

// 支委班子出席快照（书记/副书记/三委员/三组长 共 8 人）——系 act-27 考勤出席名单，非支委集合定义：
// 前五位 p13/p14/p11/p12/p10 = 支委五人（权威名单：services/vote-config.js resolveVoterIds('committee')），
// p1/p2/p4 = 三组长；勿据此名单增删支委，成员变更请改 vote-config 权威源。
const _BRANCH_COMMITTEE_IDS = ['p13', 'p14', 'p11', 'p12', 'p10', 'p1', 'p2', 'p4'];
// 全员（三党小组 17/17/16 共 50 人）
const _ALL_PERSON_IDS = PEOPLE.map(p => p.id);

const _AUGUST_EVENTS = [
  { activityId: 'act-26', recordedAt: '2026-08-01T20:00:00Z', people: _ALL_PERSON_IDS },
  { activityId: 'act-27', recordedAt: '2026-08-03T18:00:00Z', people: _BRANCH_COMMITTEE_IDS },
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
        overdue: false,
      });
    });
  });
  return records;
}

// 追加到导出数组（生成器 att44 起连续序列，与 att1~att43 显式段衔接）
ATTENDANCE_RECORDS.push(..._buildAugustAttendance());

export function attendanceToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
    activity: _activityTitle(r.activityId),
    type: _activityType(r.activityId),
    status: ATTENDANCE_STATUS_LABELS[r.status] || r.status,
    statusKey: r.status,
    confirmer: r.recordedBy ? _personName(r.recordedBy) : '—',
    overdue: r.overdue,
  }));
}
