// role: [工程师]+[AI]
// services/auth.js — 权限系统（重构版）
// 设计文档: docs/superpowers/specs/2026-07-12-permission-system-redesign-design.md
//
// 核心变化:
//   - 去掉 stance/view/mode 三元组
//   - 去掉 AUTHZ_CHAIN + scope 双轨制
//   - 改为: 常设角色 + 项目角色 → canDo() 统一判定
//   - 链式赋权: AUTHORIZE_CHAIN 定义谁可以赋权什么角色
//   - party 页面已移除，organizer/deep 内容归入首页"我的角色"区块

import { ROLE_LABELS } from '../core/constants.js';
import { PEOPLE, getPersonById, getPersonName } from '../mock/index.js';
import { mockDB } from '../core/domain.js';
import { NoticeStore } from './notice.js';

// ── 登录状态 ─────────────────────────────────────
const LOGIN_KEY = 'gsm1921-login-user';   // localStorage: { personId, role, tabId }
const TAB_KEY = 'gsm1921-tab-id';         // sessionStorage: 当前标签页唯一 ID（A-11 防串扰）
const SESSION_KEY = 'gsm1921-session-snap'; // sessionStorage: 本标签页登录会话快照

// A-11 多标签页登录防串扰：每个标签页生成唯一 tabId。
// 登录写入 localStorage（带 tabId）+ sessionStorage 快照；
// getCurrentUser 校验 tabId——localStorage 被其它标签页覆盖时回退到本页快照，B 页登录不再改变 A 页身份。
function _getTabId() {
  let id = null;
  try { id = sessionStorage.getItem(TAB_KEY); } catch {}
  if (!id) {
    id = 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    try { sessionStorage.setItem(TAB_KEY, id); } catch {}
  }
  return id;
}

function _writeLogin(data) {
  const payload = { ...data, tabId: _getTabId() };
  try {
    localStorage.setItem(LOGIN_KEY, JSON.stringify(payload));
    // 本标签页会话快照（不含 tabId，供被覆盖时回退）
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ personId: data.personId, role: data.role }));
  } catch {}
}

// 其它标签页改动登录状态 → 派发 auth-changed 事件，供页面刷新用户区（防串扰辅助）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== LOGIN_KEY) return;
    document.dispatchEvent(new CustomEvent('gsm1921:auth-changed', { detail: { storageEvent: e } }));
  });
}

// ── 只读视角 ─────────────────────────────────────
const VIEW_ROLE_KEY = 'gsm1921-view-role';  // sessionStorage

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
// 2026-07-30: 移除 organizer/deep 死代码（无对应 workspace 页面，T-141 角色单页制重构后遗留）
// 仅保留 leader 视角——支委/书记可切换到组长只读视角
const VIEWABLE_ROLES = {
  'secretary':         ['leader', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'],
  'deputy-secretary':  ['leader', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'],
  'org-commissioner':  [],
  'prop-commissioner': [],
  'disc-commissioner': [],
  'leader':            [],
};

// ── 角色到页面映射 ──────────────────────────────
// 2026-07-30: organizer/deep 无独立 workspace 页面（T-141 角色单页制重构后归入工作台）
// header view-switcher 仅展示有独立页面的工作台身份（standing role + leader）
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
  const leaderRecord = records.find(r =>
    r.targetPersonId === personId && r.role === 'leader' && r.action !== 'revoke'
  );
  if (leaderRecord) return 'leader';

  // 2. 检查 mock 数据（新格式: role 单一值）
  const person = getPersonById(personId);
  if (person && person.role) return person.role;

  return 'participant';
}

// ── 获取用户在项目中的项目角色 ──────────────────
// 统一读入口：一级读主源（活动 assignments / 专班 members 运行时数据），
// 二级回退审计快照（仅历史数据；按角色取最新一条 action 判定是否已回收）。
// 中间态说明：Task 1→Task 2 过渡期 authorize 尚未写穿主源，若主源已登记 participant
// 而快照有更新的 organizer/deep，主源会压制快照（判定为 participant）——Task 2 写穿后自愈，勿误判为 bug。
function _getProjectRole(personId, projectId) {
  if (!projectId) return null;

  // 一级：主源 — 活动 assignments
  const activity = mockDB.activities.find(a => a.id === projectId);
  if (activity && Array.isArray(activity.assignments)) {
    const rec = activity.assignments.find(a => a.personId === personId);
    if (rec) return rec.role;  // 'organizer' | 'deep' | 'participant'
  }

  // 一级：主源 — 专班 members
  const tf = mockDB.taskforces.find(t => t.id === projectId);
  if (tf && Array.isArray(tf.members)) {
    const m = tf.members.find(m => m.personId === personId);
    if (m) return m.role;  // 'organizer' | 'deep' | 'participant'
  }

  // 二级：审计快照回退（按 (personId, role, scopeRef) 取最新一条，revoke 视为已回收）
  const records = _getAuthRecords();
  const roleRecs = records.filter(r =>
    r.targetPersonId === personId &&
    r.role && ['organizer', 'deep'].includes(r.role) &&
    r.scopeRef === projectId
  );
  const latestByRole = {};
  roleRecs.forEach(r => { latestByRole[r.role] = r; }); // 数组顺序即时间顺序
  for (const role of ['organizer', 'deep']) {
    const rec = latestByRole[role];
    if (rec && rec.action !== 'revoke') return role;
  }

  return null;
}

// ── 根据 projectId 取项目名称（用于赋权通知文案）──────────────────
function _getProjectName(projectId) {
  if (!projectId) return null;
  const a = mockDB.activities.find(x => x.id === projectId);
  if (a) return a.title;
  const t = mockDB.taskforces.find(x => x.id === projectId);
  if (t) return t.name;
  return null;
}

// ── 审计快照存储（独立 localStorage 键，移出 /docs 代码栈）──────────
// T-190：赋权审计快照不再是 mockDB 实体，独立持久化，杜绝双轨数据。
// 注：当前 revokeAuthorization 仍为 splice 物理删除（见下），Task 2 将改为追加 action:'revoke' 记录，实现真正只增不改。
const AUDIT_KEY = 'sop_org_os_auth_audit';

function _getAuthRecords() {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

function _saveAuthRecords(records) {
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(records)); } catch (_) { /* quota exceeded 静默降级 */ }
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
    _writeLogin({ personId, role });
  },

  /**
   * 开发模式直接登录（选身份）
   * 附带清除各工作台 Tab 缓存记忆（workflowos_tab_*），
   * 使开发模式打开页面始终显示默认 Tab（书记 2026-08-02 反馈"浏览器缓存干扰默认显示"）。
   * @param {string} role
   */
  devLogin(role) {
    // 找到该角色的第一个 mock 用户
    const person = PEOPLE.find(p => p.role === role);
    const personId = person ? person.id : 'p5';
    _writeLogin({ personId, role });
    // 开发模式默认显示：清除 Tab 记忆，打开页面显示 defaultTab
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('workflowos_tab_')) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) { /* localStorage 不可用时静默降级 */ }
  },

  logout() {
    try {
      localStorage.removeItem(LOGIN_KEY);
      sessionStorage.removeItem(VIEW_ROLE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
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
      // A-11 防串扰：localStorage 中的登录若由其它标签页写入（tabId 不匹配），
      // 回退到本标签页会话快照，避免 B 页登录改变 A 页身份。
      if (data.tabId && data.tabId !== _getTabId()) {
        const snapRaw = sessionStorage.getItem(SESSION_KEY);
        if (snapRaw) return JSON.parse(snapRaw);
        return null;
      }
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

    // 仅读主源（活动 assignments / 专班 members）；审计快照只增不改，不做读源
    mockDB.activities.forEach(a => {
      if (Array.isArray(a.assignments)) {
        a.assignments.forEach(rec => {
          if (rec.personId === personId && ['organizer', 'deep'].includes(rec.role)) {
            projectRoleSet.add(rec.role);
          }
        });
      }
    });

    mockDB.taskforces.forEach(t => {
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

    // 2. 项目角色对应页面（organizer/deep 内容已归入首页"我的角色"区块）
    const projectRoles = this.getUserProjectRoles(personId);
    projectRoles.forEach(role => {
      pages.push({
        role,
        page: 'index.html',
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
    // 通知点击跳转到首页"我的角色"区块（organizer/deep 无独立页面）
    if (role === 'organizer' || role === 'deep') {
      const targetPage = 'index.html';

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
