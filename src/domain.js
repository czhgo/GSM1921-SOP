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
 * @property {'draft'|'published'|'ongoing'|'completed'} status - 活动状态
 * @property {'branch'|'group'} visibility - 可见范围：全支部 or 党小组
 * @property {string}  date        - 活动日期 ISO 字符串（YYYY-MM-DD）
 * @property {string}  executor    - 执行角色
 * @property {string|null} supervisor - 督办角色（可为 null）
 * @property {string}  createdBy   - 创建者用户 ID
 * @property {string}  createdAt   - 创建时间 ISO 字符串
 * @property {'low'|'normal'|'urgent'} [priority] - 优先级（工作流引擎用）
 * @property {string}  [dueDate]   - 截止日期 ISO 字符串（自动化提醒锚点）
 * @property {boolean} [archived]  - 软删除标记（true 表示已归档）
 * @property {string}  [domain]    - 领域：'activity' | 'organization'
 * @property {string}  [scenarioId] - 关联的场景 ID（对应 sopDatabase）
 * @property {string}  [description] - 活动描述
 * @property {string}  [targetDate]  - 目标日期 ISO 字符串（T-0，兼容旧字段）
 */

/**
 * @typedef {Object} Task
 * @property {string}  id          - 唯一标识符（由 id.js 生成）
 * @property {string}  activityId  - 所属活动 ID
 * @property {string}  title       - 任务标题
 * @property {'pending'|'in_progress'|'completed'} status - 任务状态
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
  /** @type {Array<{id:string, activityId:string, userId:string, status:'present'|'absent'|'leave', recordedBy:string, recordedAt:string}>} */
  attendances: [],
};
