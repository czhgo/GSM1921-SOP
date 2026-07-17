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
import { getPersonById, getPersonName } from '../mock/index.js';
import { ACTIVITIES } from '../mock/activities.js';
import { MOCK_TASKFORCES } from '../mock/taskforces.js';
import { NoticeStore } from './notice.js';

// ── 登录状态 ─────────────────────────────────────
const LOGIN_KEY = 'gsm1921-login-user';  // localStorage: { personId, role }

// ── 只读视角 ─────────────────────────────────────
const VIEW_ROLE_KEY = 'gsm1921-view-role';  // sessionStorage

// ── 赋权记录 ─────────────────────────────────────
const AUTH_RECORDS_KEY = 'gsm1921-auth-records';

// ── 权限表 ──────────────────────────────────────
// issue.* 权限项遵循 GitHub Issue 风格权限矩阵（spec §五）
//   全员基础权限（view/create/comment/reaction/mention/reference/edit.own）通过 _ISSUE_PERMS_ALL 注入
//   书记专属权限（status.change/close/comment.hide/edit.others/milestone.manage/assignee.set/drafts.merge/drafts.reject）
//   仅 secretary 角色持有（spec §5.1：副书记虽权限较高，但 issue 处置权仍归书记，不可委托）
const _ISSUE_PERMS_ALL = [
  'issue.view', 'issue.create', 'issue.comment.add', 'issue.reaction.toggle',
  'issue.mention', 'issue.reference', 'issue.edit.own',
];
const _ISSUE_PERMS_SECRETARY = [
  'issue.status.change', 'issue.close', 'issue.comment.hide', 'issue.edit.others',
  'issue.milestone.manage', 'issue.assignee.set', 'issue.drafts.merge', 'issue.drafts.reject',
];
const ROLE_PERMISSIONS = {
  'secretary':         ['view_all', 'create_activity', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', 'authorize_taskforce', 'authorize', 'archive', 'manage_members', ..._ISSUE_PERMS_ALL, ..._ISSUE_PERMS_SECRETARY],
  'deputy-secretary':  ['view_all', 'create_activity', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', 'authorize_taskforce', 'authorize', 'archive', 'manage_members', ..._ISSUE_PERMS_ALL],
  'org-commissioner':  ['view_all', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', 'authorize_taskforce', 'archive', ..._ISSUE_PERMS_ALL],
  'prop-commissioner': ['view_all', 'manage_taskforce', 'initiate_taskforce', 'archive', ..._ISSUE_PERMS_ALL],
  'disc-commissioner': ['view_all', 'record_attendance', 'summarize_inspection', 'record_inspection', 'manage_taskforce', 'initiate_taskforce', ..._ISSUE_PERMS_ALL],
  'leader':            ['view_all', 'create_activity', 'assign_task', 'modify_assignment', 'mark_complete', 'fill_review', 'record_inspection', 'assign_project_role', ..._ISSUE_PERMS_ALL],
  'participant':       ['view_public', 'record_inspection', ..._ISSUE_PERMS_ALL],
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
function _getUserRoleFromMemory(personId) {
  // 1. 检查赋权记录（组长由支委赋权）
  const records = _getAuthRecords();
  const leaderRecord = records.find(r => r.targetPersonId === personId && r.role === 'leader');
  if (leaderRecord) return 'leader';

  // 2. 检查 mock 数据（新格式: role 单一值）
  const person = getPersonById(personId);
  if (person && person.role) return person.role;

  return 'participant';
}

// ── 获取用户在项目中的项目角色 ──────────────────
function _getProjectRole(personId, projectId) {
  // 0. 优先查 auth records（运行时赋权记录）
  const records = _getAuthRecords();
  const authRec = records.find(r =>
    r.targetPersonId === personId &&
    r.role && ['organizer', 'deep'].includes(r.role) &&
    r.scopeRef === projectId
  );
  if (authRec) return authRec.role;

  // 1. 再查活动 assignments（mock 数据）
  const activity = ACTIVITIES.find(a => a.id === projectId);
  if (activity && Array.isArray(activity.assignments)) {
    const rec = activity.assignments.find(a => a.personId === personId);
    if (rec) return rec.role;  // 'organizer' | 'deep'
  }

  // 2. 再查专班 members（mock 数据）
  const tf = MOCK_TASKFORCES.find(t => t.id === projectId);
  if (tf && Array.isArray(tf.members)) {
    const m = tf.members.find(m => m.personId === personId);
    if (m) return m.role;  // 'organizer' | 'deep' | 'participant'
  }

  return null;
}

// ── 根据 projectId 取项目名称（用于赋权通知文案）──────────────────
function _getProjectName(projectId) {
  if (!projectId) return null;
  const a = ACTIVITIES.find(x => x.id === projectId);
  if (a) return a.title;
  const t = MOCK_TASKFORCES.find(x => x.id === projectId);
  if (t) return t.name;
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
    // ── 路径1：书记/副书记 → leader（常设） ──
    { id: 'auth-001', targetPersonId: 'p1',  role: 'leader', authorizedBy: 'p13', authorizedAt: '2026-01-10' },
    { id: 'auth-002', targetPersonId: 'p2',  role: 'leader', authorizedBy: 'p13', authorizedAt: '2026-01-10' },
    { id: 'auth-003', targetPersonId: 'p4',  role: 'leader', authorizedBy: 'p13', authorizedAt: '2026-01-15' },

    // ── 路径2：组织委员 → organizer/deep（专班） ──
    // D-240: 积极分子 p7 在 tf-002 担任 organizer，由组织委员 p11 赋权
    { id: 'auth-004', targetPersonId: 'p7',  role: 'organizer', scopeRef: 'tf-002', authorizedBy: 'p11', authorizedAt: '2026-05-03' },
    // 新增人员 p26（积极分子）在 tf-005 担任 organizer，由组织委员 p11 赋权
    { id: 'auth-005', targetPersonId: 'p26', role: 'organizer', scopeRef: 'tf-005', authorizedBy: 'p11', authorizedAt: '2026-06-10' },
    // p8 在 tf-001 担任 deep，由组织委员 p11 赋权
    { id: 'auth-006', targetPersonId: 'p8',  role: 'deep',      scopeRef: 'tf-001', authorizedBy: 'p11', authorizedAt: '2026-05-02' },

    // ── 路径3：党小组组长 → organizer/deep（活动） ──
    // p1（第一党小组组长）赋权 p3 在 act-3 担任 organizer
    { id: 'auth-007', targetPersonId: 'p3',  role: 'organizer', scopeRef: 'act-3',  authorizedBy: 'p1',  authorizedAt: '2026-03-10' },
    // p4（第三党小组组长）赋权 p7 在 act-19 担任 deep
    { id: 'auth-008', targetPersonId: 'p7',  role: 'deep',      scopeRef: 'act-19', authorizedBy: 'p4',  authorizedAt: '2026-05-20' },

    // ── 路径4：组织者 → deep（活动） ──
    // p3（act-3 的 organizer）赋权 p6 在 act-3 担任 deep
    { id: 'auth-009', targetPersonId: 'p6',  role: 'deep',      scopeRef: 'act-3',  authorizedBy: 'p3',  authorizedAt: '2026-03-15' },
    // p1（act-9 的 organizer）赋权 p5 在 act-9 担任 deep
    { id: 'auth-010', targetPersonId: 'p5',  role: 'deep',      scopeRef: 'act-9',  authorizedBy: 'p1',  authorizedAt: '2026-05-10' },
  ];
}

// ════════════════════════════════════════════════
// AuthStore API
// ════════════════════════════════════════════════
export const AuthStore = {
  /**
   * 登录（Mock 校验）
   * @param {string} personId
   */
  login(personId) {
    const role = _getUserRoleFromMemory(personId);
    const data = { personId, role };
    try { localStorage.setItem(LOGIN_KEY, JSON.stringify(data)); } catch {}
  },

  /**
   * 开发模式直接登录（选身份）
   * @param {string} role
   */
  devLogin(role) {
    // 找到该角色的第一个 mock 用户
    const person = PEOPLE.find(p => p.role === role);
    const personId = person ? person.id : 'p5';
    const data = { personId, role };
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
   * @returns {{ personId: string, role: string } | null}
   */
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(LOGIN_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // 迁移：旧格式 { userId, role } → 新格式 { personId, role }
      if (data.userId && !data.personId) {
        data.personId = data.userId;
        delete data.userId;
        localStorage.setItem(LOGIN_KEY, JSON.stringify(data));
      }
      return data;
    } catch { return null; }
  },

  /**
   * 获取用户的常设角色
   */
  getUserRole(personId) {
    return _getUserRoleFromMemory(personId);
  },

  /**
   * 获取用户的有效角色（只读视角优先，回退常设角色）
   * 用途：sidebar/header 等组件根据有效角色决定跳转目标
   * @param {string} personId
   * @returns {string} 角色 ID
   */
  getEffectiveRole(personId) {
    const viewRole = this.getViewRole();
    return viewRole || this.getUserRole(personId);
  },

  /**
   * 获取用户在项目内的项目角色
   */
  getProjectRole(personId, projectId) {
    return _getProjectRole(personId, projectId);
  },

  /**
   * 获取该用户持有的所有项目角色（去重）
   * 用于 sidebar 渲染"可达的工作台页面"
   * @param {string} personId
   * @returns {string[]} - 如 ['organizer', 'deep']
   */
  getUserProjectRoles(personId) {
    if (!personId) return [];
    const projectRoleSet = new Set();

    // 1. 检查 auth records（运行时赋权记录）
    const records = _getAuthRecords();
    records.forEach(r => {
      if (r.targetPersonId === personId && ['organizer', 'deep'].includes(r.role)) {
        projectRoleSet.add(r.role);
      }
    });

    // 2. 检查 mock 数据（活动 assignments）
    ACTIVITIES.forEach(a => {
      if (Array.isArray(a.assignments)) {
        a.assignments.forEach(rec => {
          if (rec.personId === personId && ['organizer', 'deep'].includes(rec.role)) {
            projectRoleSet.add(rec.role);
          }
        });
      }
    });

    // 3. 检查 mock 数据（专班 members）
    MOCK_TASKFORCES.forEach(t => {
      if (Array.isArray(t.members)) {
        t.members.forEach(m => {
          if (m.personId === personId && ['organizer', 'deep'].includes(m.role)) {
            projectRoleSet.add(m.role);
          }
        });
      }
    });

    return [...projectRoleSet];
  },

  /**
   * 便捷判定该用户是否持有某项目角色
   * @param {string} personId
   * @param {string} role - 'organizer' | 'deep'
   * @returns {boolean}
   */
  hasProjectRole(personId, role) {
    if (!personId || !role) return false;
    return this.getUserProjectRoles(personId).includes(role);
  },

  /**
   * 该用户可达的所有 workspace 页面（standing + project）
   * 用于 sidebar 渲染"党建工作台"链接或子菜单
   * @param {string} personId
   * @returns {Array<{ role: string, page: string, label: string }>}
   */
  getAccessibleWorkspacePages(personId) {
    if (!personId) return [];
    const pages = [];
    const standingRole = _getUserRoleFromMemory(personId);

    // 1. standing role 对应页面（来自 ROLE_PAGE_MAP.workspace）
    const standingPage = (ROLE_PAGE_MAP.workspace || {})[standingRole];
    if (standingPage) {
      pages.push({
        role: standingRole,
        page: standingPage,
        label: ROLE_LABELS[standingRole] || standingRole,
      });
    }

    // 2. 项目角色对应页面（organizer.html / deep.html）
    const projectRoles = this.getUserProjectRoles(personId);
    projectRoles.forEach(role => {
      const page = role === 'organizer' ? 'organizer.html' : 'deep.html';
      pages.push({
        role,
        page,
        label: ROLE_LABELS[role] || role,
      });
    });

    return pages;
  },

  /**
   * 统一权限判定
   * @param {string} personId
   * @param {string} action - 权限名（如 'create_activity'）
   * @param {{ projectId?: string }} context - 项目上下文
   * @returns {boolean}
   */
  canDo(personId, action, context = {}) {
    const userRole = _getUserRoleFromMemory(personId);
    const perms = ROLE_PERMISSIONS[userRole] || [];

    // 全局权限判定
    if (perms.includes(action)) return true;
    if (perms.includes('view_all') && action.startsWith('view_')) return true;

    // 项目上下文: 常设 + 项目角色取并集
    if (context.projectId) {
      const projectRole = _getProjectRole(personId, context.projectId);
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
   * @param {string} targetPersonId - 被赋权人 ID
   * @param {string} role - 角色
   * @param {{ projectId?: string }} context
   * @returns {{ ok: boolean, id: string }}
   */
  authorize(authorizerId, targetPersonId, role, context = {}) {
    if (!authorizerId || !targetPersonId || !role) return { ok: false, id: '' };

    // 校验: 授权人是否有权赋权该角色
    const authorizerRole = _getUserRoleFromMemory(authorizerId);
    const allowedRoles = AUTHORIZE_CHAIN[authorizerRole] || [];
    if (!allowedRoles.includes(role)) return { ok: false, id: '' };

    const records = _getAuthRecords();
    // 查重
    const scopeRef = context.projectId || null;
    const duplicate = records.find(r =>
      r.targetPersonId === targetPersonId &&
      r.role === role &&
      (r.scopeRef || null) === scopeRef
    );
    if (duplicate) return { ok: false, id: duplicate.id };

    const id = 'auth-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    records.push({
      id,
      targetPersonId,
      role,
      scopeRef,
      authorizedBy: authorizerId,
      authorizedAt: new Date().toISOString().slice(0, 10),
    });
    _saveAuthRecords(records);

    // ── 赋权通知：organizer / deep 被赋权时给被赋权人推送站内通知 ──
    // 通知点击直接跳转到对应工作台（spec §3.2 路径 B）
    if (role === 'organizer' || role === 'deep') {
      const targetPage = role === 'organizer'
        ? 'workspace/organizer.html'
        : 'workspace/deep.html';

      const authorizerName = getPersonName(authorizerId) || authorizerId;
      const projectName = _getProjectName(scopeRef) || '未命名项目';
      const roleLabel = ROLE_LABELS[role] || role;

      // 确保 NoticeStore 已初始化（避免 _notices 为空时 add 覆盖 mock 数据）
      // ws-secretary-entry / ws-visitor-entry / main-entry 已各自调用 init()，
      // 但 authorize 可能从其它入口（如 party-disc）触发，这里做幂等兜底
      if (typeof NoticeStore.init === 'function' && NoticeStore._notices.length === 0) {
        NoticeStore.init();
      }

      NoticeStore.add({
        title: '赋权通知',
        content: `${authorizerName} 已将您赋权为「${projectName}」的${roleLabel}。点击前往工作台。`,
        priority: 'normal',
        targetUrl: targetPage,
      });
    }

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
  getSwitchableViews(personId) {
    const role = _getUserRoleFromMemory(personId);
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
