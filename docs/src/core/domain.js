// role: [人机]
// ════════════════════════════════════════════════════════════════
//  domain.js — 领域层 (Domain Layer)
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  单向依赖链的最底层：不依赖任何其他模块
// ════════════════════════════════════════════════════════════════

/** 当前数据库 Schema 版本（持久化防御用） */
export const SCHEMA_VERSION = 1;

/**
 * @typedef {Object} Activity
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  title       - 活动标题
 * @property {string}  type        - 活动类型（如 '组织生活会'、'主题党日'）
 * @property {'draft'|'published'|'ongoing'|'completed'} status - 活动状态 - Source: knowledge/SOP/常见工作场景快速指南.md#我要组织一次党小组活动
 * @property {'branch'|'group'} visibility - 可见范围：全支部 or 党小组 - Source: knowledge/SOP/支委与党小组定人定责定岗说明.md#一、人员结构与双重身份体系
 * @property {string}  date        - 活动日期 ISO 字符串（YYYY-MM-DD）
 * @property {string}  executor    - 执行角色 - Source: knowledge/SOP/组织委员工作流程指南.md#一、工作职责总览
 * @property {string|null} supervisor - 督办角色（可为 null） - Source: knowledge/SOP/常见工作场景快速指南.md#我要组织一次党小组活动
 * @property {string}  createdBy   - 创建者用户 ID
 * @property {string}  createdAt   - 创建时间 ISO 字符串
 * @property {'low'|'normal'|'urgent'} [priority] - 优先级（工作流引擎用） - Source: knowledge/SOP/常见工作场景快速指南.md#我要组织一次党小组活动
 * @property {string}  [dueDate]   - 截止日期 ISO 字符串（自动化提醒锚点）
 * @property {boolean} [archived]  - 软删除标记（true 表示已归档）
 * @property {string}  [domain]    - 领域：'activity' | 'organization' - Source: knowledge/SOP/支委与党小组定人定责定岗说明.md#二、"条条"与"块块"双线管理体系
 * @property {string}  [scenarioId] - 关联的场景 ID（对应 sopDatabase）* - Source: knowledge/SOP/常见工作场景快速指南.md#目录
 * @property {string}  [description] - 活动描述
 * @property {string}  [targetDate]  - 目标日期 ISO 字符串（T-0，兼容旧字段）
 * @property {'leader'|'disc-commissioner'} [attendanceQROwner] - 考勤二维码发布方（组织生活会专用：现场组织的党小组长） - Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 * @property {string[]} [deliverableIds] - 关联的交付物 ID 列表 - Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  activityId  - 所属活动 ID
 * @property {string}  userId      - 参会成员用户 ID
 * @property {'present'|'absent'|'leave'} status - 出勤状态
 * @property {string}  recordedBy  - 记录人用户 ID（纪检委员）
 * @property {string}  recordedAt  - 记录时间 ISO 字符串
 * @property {string}  [studentId] - 学号 - Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 * @property {'party_member'|'probationary'|'activist'|'candidate'} [developStage] - 发展阶段 - Source: knowledge/SOP/纪检委员工作流程指南.md#二考勤管理三会一课
 * @property {string}  [partyGroup] - 所属党小组 - Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 */

/**
 * @typedef {Object} Deliverable
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  activityId  - 所属活动 ID
 * @property {'photography_draft'|'attendance_summary'|'meeting_record'|'propaganda'|'check_material'} type - 交付物类型 - Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 * @property {string}  owner       - 责任角色标识符（执行方角色）- Source: knowledge/SOP/支委与党小组定人定责定岗说明.md
 * @property {string}  [ownerName] - 责任角色描述（具体角色说明，如"党小组组长"、"纪检委员"）- Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
 * @property {'pending'|'submitted'|'archived'} status - 交付物状态
 * @property {string}  [submittedAt] - 提交时间 ISO 字符串
 * @property {string}  [note]      - 备注说明
 */

/**
 * @typedef {Object} Task
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  activityId  - 所属活动 ID
 * @property {string}  title       - 任务标题
 * @property {'pending'|'in_progress'|'completed'} status - 任务状态 - Source: knowledge/SOP/组织委员工作流程指南.md#四大工作场景
 * @property {string}  createdAt   - 创建时间 ISO 字符串（审计字段）
 */

/**
 * 简单权限判断函数 (ACL)
 * 依据 WORKFLOW_MASTER.md [数据安全与 ACL 宪法]
 * - 【考勤信息】全员公开可读，仅纪检委员/支委可写
 * - 【考察信息】仅支委可读写，普通成员绝对隔离
 * @param {'secretary'|'commissioner'|'leader'|'member'} role
 * @param {'read'|'write'|'delete'|'admin'} action
 * @param {'activity'|'attendance'|'evaluation'|string} [resource]
 * @returns {boolean}
 */
export function can(role, action, resource) {
  // 考察档案：最高机密，仅支委可读写
  if (resource === 'evaluation') {
    return role === 'secretary' || role === 'org-commissioner';
  }
  /** @type {Record<string, string[]>} */
  const rules = {
    secretary:    ['read', 'write', 'delete', 'admin'],
    commissioner: ['read', 'write'],
    leader:       ['read', 'write'],
    member:       ['read'],
  };
  return (rules[role] || ['read']).includes(action);
}

/**
 * 内存数据库（Mock 层写入此处）
 * 使用 Immutable 原则：所有更新必须用展开符替换整个数组，禁止 push/splice
 */
export const mockDB = {
  _schema: SCHEMA_VERSION,
  users: [
    { id: 'u_sec',  role: 'secretary',        name: '支部书记' },
    { id: 'u_org',  role: 'org-commissioner', name: '组织委员' },
    { id: 'u_exec', role: 'leader',            name: '党小组长' },
  ],
  /** @type {Activity[]} */
  activities: [],
  /** @type {Task[]} */
  tasks: [],
  /** @type {AttendanceRecord[]} */
  // Fields: studentId（学号）, developStage（发展阶段）, partyGroup（所属党小组）are required for 组织生活会 attendance summary
  // Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
  attendances: [],
  /** @type {Deliverable[]} */
  // 交付物清单（组织生活会专用：宣传底稿、考勤汇总表、组织生活会记录等）
  // Source: content/SOP/常见工作场景快速指南.md#党建工作组织生活会严肃政治会议
  deliverables: [],
};
