// role: [工程师]+[AI]
// services/auth.js — 权限系统（重构版）
// 设计文档: docs/superpowers/specs/2026-07-12-permission-system-redesign-design.md
//
// 核心变化:
//   - 去掉 stance/view/mode 三元组
//   - 去掉 AUTHZ_CHAIN + scope 双轨制
//   - 改为: 常设角色 + 项目角色 → canDo() 统一判定
//   - 链式赋权: AUTHORIZE_CHAIN 定义谁可以赋权什么角色

import { ROLE_LABELS } from '../core/constants.js';
import { PEOPLE } from '../mock/people.js';
import { ACTIVITIES } from '../mock/activities.js';
import { MOCK_TASKFORCES } from '../mock/taskforces.js';

// ── 登录状态 ─────────────────────────────────────
const LOGIN_KEY = 'gsm1921-login-user';  // localStorage: { userId, role }

// ── 只读视角 ─────────────────────────────────────
const VIEW_ROLE_KEY = 'gsm1921-view-role';  // sessionStorage

// ── 赋权记录 ─────────────────────────────────────
const AUTH_RECORDS_KEY = 'gsm1921-auth-records';

// ── 权限表 ──────────────────────────────────────
const ROLE_PERMISSIONS = {
  'secretary':         ['view_all', 'create_activity', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', 'authorize_taskforce', 'authorize', 'archive', 'manage_members'],
  'deputy-secretary':  ['view_all', 'create_activity', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', 'authorize_taskforce', 'authorize', 'archive', 'manage_members'],
  'org-commissioner':  ['view_all', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', 'authorize_taskforce', 'archive'],
  'prop-commissioner': ['view_all', 'manage_taskforce', 'initiate_taskforce', 'archive'],
  'disc-commissioner': ['view_all', 'record_attendance', 'summarize_inspection', 'record_inspection', 'manage_taskforce', 'initiate_taskforce'],
  'leader':            ['view_all', 'create_activity', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'assign_project_role'],
  'participant':       ['view_public', 'record_inspection'],
};

const PROJECT_PERMISSIONS = {
  'organizer': ['view_project', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'assign_project_role'],
  'deep':       ['view_project', 'mark_complete'],
};

// ── 赋权链 ──────────────────────────────────────
// 统一记录"谁可以赋权什么角色"，由 authorize() 的 context 参数区分:
//   context 为空 → 常设角色赋权（系统级，如支委赋权组长）
//   context = { projectId } → 项目角色指派（项目级，如组长指派组织者）
// 注: 支委（书记/副书记/三委员）由配置文件预设，不在系统赋权范围内
const AUTHORIZE_CHAIN = {
  'secretary':         ['leader', 'organizer', 'deep'],
  'deputy-secretary':  ['leader', 'organizer', 'deep'],
  'org-commissioner':  ['organizer', 'deep'],
  'leader':            ['organizer', 'deep'],
  'organizer':         ['deep'],
};

// ── 只读可查看视角（比赋权链范围更宽） ────────────
const VIEWABLE_ROLES = {
  'secretary':         ['leader', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'organizer', 'deep'],
  'deputy-secretary':  ['leader', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'organizer', 'deep'],
  'org-commissioner':  ['organizer', 'deep'],
  'prop-commissioner': ['organizer', 'deep'],
  'disc-commissioner': ['organizer', 'deep'],
  'leader':            ['organizer', 'deep'],
};

// ── 角色到页面映射 ──────────────────────────────
const ROLE_PAGE_MAP = {
  workspace: {
    'secretary':         'secretary.html',
    'deputy-secretary':  'secretary.html',
    'org-commissioner':  'org.html',
    'prop-commissioner': 'prop.html',
    'disc-commissioner': 'disc.html',
    'leader':            'leader.html',
    'participant':       'visitor.html',
  },
  party: {
    'secretary':         'secretary.html',
    'deputy-secretary':  'secretary.html',
    'org-commissioner':  'org.html',
    'prop-commissioner': 'prop.html',
    'disc-commissioner': 'disc.html',
    // leader / participant 无 party 页面
  },
};

// ── 常设角色集合 ────────────────────────────────
const COMMISSIONER_ROLES = new Set([
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'
]);

// ── 获取用户的常设角色 ──────────────────────────
// 优先级: 赋权记录 > mock 数据
function _getUserRoleFromMemory(userId) {
  // 1. 检查赋权记录（组长由支委赋权）
  const records = _getAuthRecords();
  const leaderRecord = records.find(r => r.targetUserId === userId && r.role === 'leader');
  if (leaderRecord) return 'leader';

  // 2. 检查 mock 数据（新格式: role 单一值）
  const person = PEOPLE.find(p => p.id === userId);
  if (person && person.role) return person.role;

  return 'participant';
}

// ── 获取用户在项目中的项目角色 ──────────────────
function _getProjectRole(userId, projectId) {
  // 1. 先查活动 assignments
  const activity = ACTIVITIES.find(a => a.id === projectId);
  if (activity && Array.isArray(activity.assignments)) {
    const rec = activity.assignments.find(a => a.personId === userId);
    if (rec) return rec.role;  // 'organizer' | 'deep'
  }

  // 2. 再查专班 members
  const tf = MOCK_TASKFORCES.find(t => t.id === projectId);
  if (tf && Array.isArray(tf.members)) {
    const m = tf.members.find(m => m.personId === userId);
    if (m) return m.role;  // 'organizer' | 'deep' | 'participant'
  }

  return null;
}

// ── 赋权记录存储 ──────────────────────────────
function _getAuthRecords() {
  try {
    const raw = localStorage.getItem(AUTH_RECORDS_KEY);
    return raw ? JSON.parse(raw) : _defaultAuthRecords();
  } catch { return _defaultAuthRecords(); }
}

function _saveAuthRecords(records) {
  try { localStorage.setItem(AUTH_RECORDS_KEY, JSON.stringify(records)); } catch {}
}

function _defaultAuthRecords() {
  return [
    { id: 'auth-001', targetUserId: 'p1',  role: 'leader', authorizedBy: 'p13', authorizedAt: '2026-01-10' },
    { id: 'auth-002', targetUserId: 'p2',  role: 'leader', authorizedBy: 'p13', authorizedAt: '2026-01-10' },
    { id: 'auth-003', targetUserId: 'p4',  role: 'leader', authorizedBy: 'p13', authorizedAt: '2026-01-15' },
  ];
}

// ════════════════════════════════════════════════
// AuthStore API
// ════════════════════════════════════════════════
export const AuthStore = {
  /**
   * 登录（Mock 校验）
   * @param {string} userId
   */
  login(userId) {
    const role = _getUserRoleFromMemory(userId);
    const data = { userId, role };
    try { localStorage.setItem(LOGIN_KEY, JSON.stringify(data)); } catch {}
  },

  /**
   * 开发模式直接登录（选身份）
   * @param {string} role
   */
  devLogin(role) {
    // 找到该角色的第一个 mock 用户
    const person = PEOPLE.find(p => p.role === role);
    const userId = person ? person.id : 'p5';
    const data = { userId, role };
    try { localStorage.setItem(LOGIN_KEY, JSON.stringify(data)); } catch {}
  },

  logout() {
    try {
      localStorage.removeItem(LOGIN_KEY);
      sessionStorage.removeItem(VIEW_ROLE_KEY);
    } catch {}
  },

  /**
   * 获取当前登录用户
   * @returns {{ userId: string, role: string } | null}
   */
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(LOGIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  /**
   * 获取用户的常设角色
   */
  getUserRole(userId) {
    return _getUserRoleFromMemory(userId);
  },

  /**
   * 获取用户的有效角色（只读视角优先，回退常设角色）
   * 用途：sidebar/header 等组件根据有效角色决定跳转目标
   * @param {string} userId
   * @returns {string} 角色 ID
   */
  getEffectiveRole(userId) {
    const viewRole = this.getViewRole();
    return viewRole || this.getUserRole(userId);
  },

  /**
   * 获取用户在项目内的项目角色
   */
  getProjectRole(userId, projectId) {
    return _getProjectRole(userId, projectId);
  },

  /**
   * 统一权限判定
   * @param {string} userId
   * @param {string} action - 权限名（如 'create_activity'）
   * @param {{ projectId?: string }} context - 项目上下文
   * @returns {boolean}
   */
  canDo(userId, action, context = {}) {
    const userRole = _getUserRoleFromMemory(userId);
    const perms = ROLE_PERMISSIONS[userRole] || [];

    // 全局权限判定
    if (perms.includes(action)) return true;
    if (perms.includes('view_all') && action.startsWith('view_')) return true;

    // 项目上下文: 常设 + 项目角色取并集
    if (context.projectId) {
      const projectRole = _getProjectRole(userId, context.projectId);
      if (projectRole) {
        const projectPerms = PROJECT_PERMISSIONS[projectRole] || [];
        if (projectPerms.includes(action)) return true;
        if (projectPerms.includes('view_project') && action.startsWith('view_')) return true;
      }
    }

    return false;
  },

  /**
   * 赋权
   * @param {string} authorizerId - 授权人 ID
   * @param {string} targetUserId - 被赋权人 ID
   * @param {string} role - 角色
   * @param {{ projectId?: string }} context
   * @returns {{ ok: boolean, id: string }}
   */
  authorize(authorizerId, targetUserId, role, context = {}) {
    if (!authorizerId || !targetUserId || !role) return { ok: false, id: '' };

    // 校验: 授权人是否有权赋权该角色
    const authorizerRole = _getUserRoleFromMemory(authorizerId);
    const allowedRoles = AUTHORIZE_CHAIN[authorizerRole] || [];
    if (!allowedRoles.includes(role)) return { ok: false, id: '' };

    const records = _getAuthRecords();
    // 查重
    const scopeRef = context.projectId || null;
    const duplicate = records.find(r =>
      r.targetUserId === targetUserId &&
      r.role === role &&
      (r.scopeRef || null) === scopeRef
    );
    if (duplicate) return { ok: false, id: duplicate.id };

    const id = 'auth-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    records.push({
      id,
      targetUserId,
      role,
      scopeRef,
      authorizedBy: authorizerId,
      authorizedAt: new Date().toISOString().slice(0, 10),
    });
    _saveAuthRecords(records);
    return { ok: true, id };
  },

  revokeAuthorization(recordId) {
    if (!recordId) return false;
    const records = _getAuthRecords();
    const idx = records.findIndex(r => r.id === recordId);
    if (idx === -1) return false;
    records.splice(idx, 1);
    _saveAuthRecords(records);
    return true;
  },

  getAuthorizations() {
    return _getAuthRecords();
  },

  // ── 只读视角切换 ──────────────────────────────

  switchView(targetRole) {
    try { sessionStorage.setItem(VIEW_ROLE_KEY, targetRole); } catch {}
  },

  clearView() {
    try { sessionStorage.removeItem(VIEW_ROLE_KEY); } catch {}
  },

  getViewRole() {
    try { return sessionStorage.getItem(VIEW_ROLE_KEY) || ''; } catch { return ''; }
  },

  // ── 辅助方法 ────────────────────────────────

  getRoleLabel(role) {
    return ROLE_LABELS[role] || role;
  },

  getPageForRole(module, role) {
    return (ROLE_PAGE_MAP[module] || {})[role] || null;
  },

  getViewableRoles(role) {
    return VIEWABLE_ROLES[role] || [];
  },

  isCommissioner(role) {
    return COMMISSIONER_ROLES.has(role);
  },
};

// ════════════════════════════════════════════════
// PermissionManager（兼容层）
// ════════════════════════════════════════════════
export const PermissionManager = {
  /**
   * 获取可切换的只读视角列表
   */
  getSwitchableViews(userId) {
    const role = _getUserRoleFromMemory(userId);
    return VIEWABLE_ROLES[role] || [];
  },

  /**
   * 当前是否处于只读视角
   */
  isReadOnly() {
    return !!AuthStore.getViewRole();
  },

  // ── 兼容旧 API（过渡期保留，后续删除）──────────
  /** @deprecated 使用 AuthStore.canDo() 替代 */
  canManage(role) {
    return AuthStore.isCommissioner(role) || role === 'leader';
  },
  /** @deprecated 使用 AuthStore.canDo() 替代 */
  canWriteActivity(role) {
    return role === 'secretary' || role === 'deputy-secretary' || role === 'leader';
  },
  /** @deprecated 使用 AuthStore.canDo() 替代 */
  canRecruitTaskForce(role) {
    return role === 'secretary' || role === 'deputy-secretary' || role === 'org-commissioner';
  },
  /** @deprecated 使用 AuthStore.canDo() 替代 */
  canAuthorize(role) {
    return role === 'secretary' || role === 'deputy-secretary' || role === 'leader' || role === 'org-commissioner';
  },
  /** @deprecated 使用 AuthStore.canDo() 替代 */
  canInitiateTaskForce(role) {
    return AuthStore.isCommissioner(role);
  },
};

// ════════════════════════════════════════════════
// ViewModeStore — 已废弃，保留空壳避免 import 报错
// ════════════════════════════════════════════════
export const ViewModeStore = {
  /** @deprecated 权限系统重构后不再有 mode 概念 */
  getMode() { return 'manage'; },
  /** @deprecated */
  setMode() {},
  /** @deprecated 使用 PermissionManager.isReadOnly() 替代 */
  isReadOnly() { return PermissionManager.isReadOnly(); },
};
