// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  person.js — 人员数据服务层
//  T-142 Phase 2C：人员数据抽象，遵循写穿透缓存模式
//
//  设计原则：
//  1. 读操作：同步访问 mockDB.users（缓存）
//  2. 写操作：通过 DataAdapter 路由（未来接入后端）
//  3. 接口兼容：提供 getById/getName/getAll 等同步方法
//
//  Source: content/04_web_design/DATA_ARCHITECTURE.md
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260808f';
// 修复（T175）：直接从 mock/people.js 导入 PEOPLE，
// 断开 person.js ↔ mock/index.js 双向循环依赖（person.js 不再依赖 mock/index.js）
import { PEOPLE } from '../mock/people.js?v=20260808f';

// ════════════════════════════════════════════════════════════════
//  PersonStore — 人员数据统一服务接口
// ════════════════════════════════════════════════════════════════

export const PersonStore = {
  /**
   * 按 ID 获取人员信息
   * @param {string} id - 人员 ID（如 'p1', 'p10'）
   * @returns {Object|null} 人员对象（含 id/name/studentId/partyGroup/developStage/role）
   */
  getById(id) {
    if (!id) return null;
    const users = this.getAll();
    return users.find(p => p.id === id) || null;
  },

  /**
   * 按 ID 获取人员姓名
   * @param {string} id - 人员 ID
   * @returns {string} 人员姓名（未找到则返回 ID 本身）
   */
  getName(id) {
    const person = this.getById(id);
    return person ? person.name : id;
  },

  /**
   * 获取全部人员列表
   * @returns {Array} 人员数组
   */
  getAll() {
    // 修复（T175）：合并静态学生人员（PEOPLE，p1~p27）与系统账号（mockDB.users，u_*）。
    // 此前仅返回 mockDB.users（8 条系统账号），导致学生 ID（p1/p12/p13 等）
    // 解析不到姓名，页面显示"发起: p12"而非真实姓名。
    const map = new Map();
    [...PEOPLE, ...(mockDB.users || [])].forEach(p => {
      if (p && p.id) map.set(p.id, p);
    });
    return Array.from(map.values());
  },

  /**
   * 按角色查询人员
   * @param {string} role - 角色标识（如 'leader', 'secretary'）
   * @returns {Array} 该角色的人员数组
   */
  getByRole(role) {
    return this.getAll().filter(p => p.role === role);
  },

  /**
   * 按党小组查询人员
   * @param {string} partyGroup - 党小组名称（如 '第一党小组'）
   * @returns {Array} 该党小组的人员数组
   */
  getByPartyGroup(partyGroup) {
    return this.getAll().filter(p => p.partyGroup === partyGroup);
  },

  /**
   * 按发展阶段查询人员
   * @param {string} developStage - 发展阶段（如 '正式党员', '积极分子'）
   * @returns {Array} 该发展阶段的人员数组
   */
  getByDevelopStage(developStage) {
    return this.getAll().filter(p => p.developStage === developStage);
  },

  /**
   * 批量获取人员姓名（用于列表渲染）
   * @param {string[]} ids - 人员 ID 数组
   * @returns {string[]} 人员姓名数组
   */
  getNames(ids) {
    if (!Array.isArray(ids)) return [];
    return ids.map(id => this.getName(id));
  },

  /**
   * 批量获取人员对象（用于列表渲染）
   * @param {string[]} ids - 人员 ID 数组
   * @returns {Object[]} 人员对象数组（过滤掉 null）
   */
  getByIds(ids) {
    if (!Array.isArray(ids)) return [];
    return ids.map(id => this.getById(id)).filter(Boolean);
  },

  /**
   * 检查人员是否存在
   * @param {string} id - 人员 ID
   * @returns {boolean}
   */
  exists(id) {
    return this.getById(id) !== null;
  },

  /**
   * 获取人员总数
   * @returns {number}
   */
  count() {
    return this.getAll().length;
  },

  /**
   * 获取所有党小组列表（去重）
   * @returns {string[]}
   */
  getPartyGroups() {
    const groups = new Set();
    this.getAll().forEach(p => {
      if (p.partyGroup) groups.add(p.partyGroup);
    });
    return Array.from(groups).sort();
  },

  /**
   * 获取所有角色列表（去重）
   * @returns {string[]}
   */
  getRoles() {
    const roles = new Set();
    this.getAll().forEach(p => {
      if (p.role) roles.add(p.role);
    });
    return Array.from(roles);
  },
};

// ════════════════════════════════════════════════════════════════
//  兼容性导出（逐步迁移后可删除）
// ════════════════════════════════════════════════════════════════

/**
 * @deprecated 请使用 PersonStore.getById()
 */
export function getPersonById(id) {
  return PersonStore.getById(id);
}

/**
 * @deprecated 请使用 PersonStore.getName()
 */
export function getPersonName(id) {
  return PersonStore.getName(id);
}

// PEOPLE 已在第 15 行导入，可在 person.js 内部使用，但不导出