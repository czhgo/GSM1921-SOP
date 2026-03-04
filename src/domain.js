// ════════════════════════════════════════════════════════════════
//  domain.js — 领域层 (Domain Layer)
//  光华管理学院本科生党支部 SOP 引擎 v8.3
//  单向依赖链的最底层：不依赖任何其他模块
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Activity
 * @property {string}  id          - 唯一标识符
 * @property {string}  title       - 活动标题
 * @property {string}  domain      - 领域：'activity' | 'organization'
 * @property {string}  scenarioId  - 关联的场景 ID（对应 sopDatabase）
 * @property {string}  [description] - 活动描述
 * @property {string}  [targetDate]  - 目标日期 ISO 字符串（T-0）
 * @property {string}  executor    - 执行角色
 * @property {string}  [supervisor] - 督办角色
 */

/**
 * 简单权限判断函数 (ACL)
 * 依据 WORKFLOW_MASTER.md [数据安全与 ACL 协议]
 * @param {'secretary'|'commissioner'|'leader'|'member'} userRole
 * @param {'read'|'write'|'delete'|'admin'} action
 * @returns {boolean}
 */
export function can(userRole, action) {
  /** @type {Record<string, string[]>} */
  const rules = {
    secretary:    ['read', 'write', 'delete', 'admin'],
    commissioner: ['read', 'write'],
    leader:       ['read', 'write'],
    member:       ['read'],
  };
  return (rules[userRole] || ['read']).includes(action);
}

/**
 * 内存数据库（Mock 层写入此处）
 * 使用 Immutable 原则：所有更新必须用展开符替换整个数组，禁止 push
 * @type {{ activities: Activity[] }}
 */
export const mockDB = {
  activities: [],
};
