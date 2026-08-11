﻿﻿// role: [工程师]+[AI]
// services/auth.js — 权限系统（重构版）
// 设计文档: docs/superpowers/specs/2026-07-12-permission-system-redesign-design.md
//
// 核心变化:
//   - 去掉 stance/view/mode 三元组
//   - 去掉 AUTHZ_CHAIN + scope 双轨制
//   - 改为: 常设角色 + 项目角色 → canDo() 统一判定
//   - 链式赋权: AUTHORIZE_CHAIN 定义谁可以赋权什么角色
//   - party 页面已移除，organizer/deep 内容归入首页"我的角色"区块

import { ROLE_LABELS } from '../core/constants.js?v=20260810a';
import { PEOPLE, getPersonById, getPersonName } from '../mock/index.js?v=20260810a';
import { mockDB } from '../core/domain.js?v=20260810a';
import { NoticeStore } from './notice.js?v=20260810a';
import { updateActivity } from './mock.js?v=20260810a';
import { TaskForceRecordStore } from './taskforce.js?v=20260810a';
import { persist } from '../core/data-adapter.js?v=20260810a';
import { enableApiMode } from './runtime.js?v=20260810a';

// ── 登录状态 ─────────────────────────────────────
const LOGIN_KEY = 'gsm1921-login-user';   // localStorage: { personId, role, tabId }
const TAB_KEY = 'gsm1921-tab-id';         // sessionStorage: 当前标签页唯一 ID（A-11 防串扰）
const SESSION_KEY = 'gsm1921-session-snap'; // sessionStorage: 本标签页登录会话快照
const SESSION_TOKEN_KEY = 'gsm1921-api-token'; // sessionStorage: API 认证 token（runtime.js enableApiMode 写入）

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
  // 1. 检查赋权记录（组长由支委赋权）——取最新一条判定（revoke 追加语义）
  const records = _getAuthRecords();
  const leaderRecs = records.filter(r => r.targetPersonId === personId && r.role === 'leader');
  if (leaderRecs.length > 0) {
    const latest = leaderRecs[leaderRecs.length - 1]; // 数组顺序即时间顺序
    if (latest.action !== 'revoke') return 'leader';
  }

  // 2. 检查 mock 数据（新格式: role 单一值）
  const person = getPersonById(personId);
  if (person && person.role) return person.role;

  return 'participant';
}

// ── 获取用户在项目中的项目角色 ──────────────────
// 统一读入口：一级读主源（活动 assignments / 专班 members 运行时数据），
// 二级回退审计快照（仅历史数据；按角色取最新一条 action 判定是否已回收）。
// 注：主源优先于快照——若主源登记 participant 而快照有更新的 organizer/deep，以主源为准（快照仅历史兜底）。
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

// ── 项目角色赋权通知（organizer / deep 被赋权时推送）──────────────
function _notifyProjectAuth(projectId, authorizerId, targetPersonId, role) {
  // 赋权通知直达目标人员业务页（业务页直达优先）：
  //   - 党小组组长 → 组长工作台
  //   - 其余 → 参与人工作台，活动项目附带 activityId 高亮定位
  //   - 专班项目无活动页可高亮 → 仅进入参与人工作台（项目分工页含专班）
  const person = getPersonById(targetPersonId);
  const isActivity = !!mockDB.activities.find(x => x.id === projectId);
  const targetPage = person?.role === 'leader'
    ? 'workspace/leader.html'
    : (isActivity ? `workspace/visitor.html?activityId=${projectId}` : 'workspace/visitor.html');

  const authorizerName = getPersonName(authorizerId) || authorizerId || '系统';
  const projectName = _getProjectName(projectId) || '未命名项目';
  const roleLabel = ROLE_LABELS[role] || role;

  // 确保 NoticeStore 已初始化（幂等兜底）
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

// ── 同步活动顶层 organizer 派生字段（原则7 同一套数据）──────────────
// 顶层 activity.organizer 是历史遗留字段，全仓 41 处读端（archive/main/inspector/todo/roles/
// ws-leader-entry 等）仍消费它。T-190 主源为 activity.assignments，本函数保证二者一致：
// activity.organizer = assignments 中首个 organizer 的 personId；无 organizer 时置 null。
// 书记裁决（2026-08-02）：采用"同步派生字段"方案统一双轨，不迁移 41 处读端。
function _syncTopLevelOrganizer(activity) {
  if (!activity) return;
  const orgAssign = Array.isArray(activity.assignments)
    ? activity.assignments.find(a => a.role === 'organizer')
    : null;
  activity.organizer = orgAssign ? orgAssign.personId : null;
}

// ── 追加审计快照条目 ──────────────────────────────
function _appendAuditEntries(scopeRef, actorId, entries, action) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const records = _getAuthRecords();
  entries.forEach(e => {
    records.push({
      id: 'auth-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      targetPersonId: e.personId,
      role: e.role || null,
      scopeRef,
      authorizedBy: actorId || null,
      authorizedAt: new Date().toISOString().slice(0, 10),
      action, // 'grant' | 'revoke'
    });
  });
  _saveAuthRecords(records);
  return entries.length;
}

// ── 审计快照存储（独立 localStorage 键，移出 /docs 代码栈）──────────
// T-190：赋权审计快照不再是 mockDB 实体，独立持久化，杜绝双轨数据。
// revoke 为追加 action:'revoke' 记录（快照只增不改），判定时取最新一条。
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
   * 登录（本地角色判定 + 后端 token 会话，失败静默降级本地模式）
   * @param {string} personId
   * @returns {Promise<void>}
   */
  async login(personId) {
    const role = _getUserRoleFromMemory(personId);
    _writeLogin({ personId, role });

    // 后端登录获取 token（失败静默降级到本地，不阻断使用）
    try {
      const r = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId }),
      });
      const data = r.ok ? await r.json() : null;
      if (data && data.token) {
        enableApiMode(data.token);
        // 以后端返回的角色为准刷新本地会话
        if (data.user && data.user.role) {
          _writeLogin({ personId: data.user.id || personId, role: data.user.role });
        }
        console.info('[AuthStore] 已切换至 API 数据源');
      }
    } catch (e) {
      console.warn('[AuthStore] 后端登录失败，保持本地模式', e);
    }
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
    // 修复（2026-08-05）：开发模式是纯 mock 路径，必须清除残留 API token，
    // 否则 bootstrap 检测到 sessionStorage['gsm1921-api-token'] 会把开发模式劫持为 API 模式
    // （复现：账号登录后切开发模式卡片 → 28 个 /api/v1 请求）。
    try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch (_) {}
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
      sessionStorage.removeItem(SESSION_KEY);
      // 修复（2026-08-05）：退出登录必须同时清除 API token，否则重新进入开发模式
      // 仍会因残留 token 被切回 API 数据源（开发模式与真实后端混淆）。
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
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
   * 获取用户的有效角色（回退常设角色）
   * 用途：sidebar/header 等组件根据有效角色决定跳转目标
   * @param {string} personId
   * @returns {string} 角色 ID
   */
  getEffectiveRole(personId) {
    return this.getUserRole(personId);
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
   * 用于 sidebar 渲染"工作台"链接或子菜单
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
   * 赋权（三合一：写主源 + 追加快照 + 发通知）
   * @param {string} authorizerId - 授权人 ID
   * @param {string} targetPersonId - 被赋权人 ID
   * @param {string} role - 角色
   * @param {{ projectId?: string }} context
   * @returns {Promise<{ ok: boolean, id: string }>}
   */
  async authorize(authorizerId, targetPersonId, role, context = {}) {
    if (!authorizerId || !targetPersonId || !role) return { ok: false, id: '' };

    // 校验: 授权人是否有权赋权该角色
    const authorizerRole = _getUserRoleFromMemory(authorizerId);
    const allowedRoles = AUTHORIZE_CHAIN[authorizerRole] || [];
    if (!allowedRoles.includes(role)) return { ok: false, id: '' };

    const scopeRef = context.projectId || null;

    // 查重（审计快照：grant 且未撤销，取最新一条判定）
    const records = _getAuthRecords();
    const dupRecs = records.filter(r =>
      r.targetPersonId === targetPersonId &&
      r.role === role &&
      (r.scopeRef || null) === scopeRef
    );
    const latestDup = dupRecs.length > 0 ? dupRecs[dupRecs.length - 1] : null;
    if (latestDup && latestDup.action !== 'revoke') return { ok: false, id: latestDup.id };

    // ① 写主源（活动 assignments / 专班 members，合并去重）
    // 仅 organizer/deep 有主源载体（与 revoke 对称）；leader 等角色只走审计快照，防止污染主源。
    try {
      if (scopeRef && (role === 'organizer' || role === 'deep')) {
        const activity = mockDB.activities.find(a => a.id === scopeRef);
        if (activity) {
          const current = Array.isArray(activity.assignments) ? activity.assignments : [];
          const updated = await updateActivity(scopeRef, {
            assignments: [
              ...current.filter(x => !(x.personId === targetPersonId && x.role === role)),
              { personId: targetPersonId, role },
            ],
          });
          _syncTopLevelOrganizer(updated); // 原则7：顶层 organizer 与主源 assignments 同步派生
          persist(); // 活动主源写入后落盘（updateActivity 不自动 persist）
        } else {
          const tf = mockDB.taskforces.find(t => t.id === scopeRef);
          if (tf) {
            const cur = Array.isArray(tf.members) ? tf.members : [];
            TaskForceRecordStore.update(scopeRef, {
              members: [
                ...cur.filter(m => !(m.personId === targetPersonId && m.role === role)),
                { personId: targetPersonId, role, contributions: [] },
              ],
            });
          }
        }
      }
    } catch (e) {
      console.warn('[AuthStore] authorize 写主源失败：', e);
      return { ok: false, id: '' };
    }

    // ② 追加审计快照
    const id = 'auth-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    records.push({
      id,
      targetPersonId,
      role,
      scopeRef,
      authorizedBy: authorizerId,
      authorizedAt: new Date().toISOString().slice(0, 10),
      action: 'grant',
    });
    _saveAuthRecords(records);

    // ③ 赋权通知（organizer / deep）
    if (role === 'organizer' || role === 'deep') {
      _notifyProjectAuth(scopeRef, authorizerId, targetPersonId, role);
    }

    return { ok: true, id };
  },

  /**
   * 撤销赋权（三合一：删主源 + 追加 revoke 快照）
   * 快照只增不改：保留原 grant 记录，追加一条 action='revoke' 记录。
   * @param {string} recordId - 审计快照记录 ID
   * @returns {Promise<boolean>}
   */
  async revokeAuthorization(recordId) {
    if (!recordId) return false;
    const records = _getAuthRecords();
    const rec = records.find(r => r.id === recordId);
    if (!rec) return false;

    const { personId, role, scopeRef } = rec;

    // 删主源（仅 organizer/deep 有主源载体）
    if (scopeRef && role && (role === 'organizer' || role === 'deep')) {
      try {
        const activity = mockDB.activities.find(a => a.id === scopeRef);
        if (activity && Array.isArray(activity.assignments)) {
          const updated = await updateActivity(scopeRef, {
            assignments: activity.assignments.filter(x => !(x.personId === personId && x.role === role)),
          });
          _syncTopLevelOrganizer(updated); // 原则7：顶层 organizer 与主源 assignments 同步派生
          persist(); // 活动主源写入后落盘（updateActivity 不自动 persist）
        } else {
          const tf = mockDB.taskforces.find(t => t.id === scopeRef);
          if (tf && Array.isArray(tf.members)) {
            TaskForceRecordStore.update(scopeRef, {
              members: tf.members.filter(m => !(m.personId === personId && m.role === role)),
            });
          }
        }
      } catch (e) {
        console.warn('[AuthStore] revoke 写主源失败：', e);
        return false; // 主源未删成功不追加 revoke 快照，避免快照与主源不一致
      }
    }

    // 追加 revoke 快照
    _appendAuditEntries(scopeRef, rec.authorizedBy || null, [{ personId, role }], 'revoke');
    return true;
  },

  getAuthorizations() {
    return _getAuthRecords();
  },

  /**
   * 整组同步项目角色（活动详情 / 专班详情内联编辑共用）
   * 三合一：写主源（全量覆盖 organizer/deep，保留 participant 等其它角色）+
   * 追加快照（新增 grant / 移除 revoke）+ 通知。
   * @param {{ scopeRef: string, assignments: Array<{personId:string, role:string}>, actorId?: string }} opts
   * @returns {Promise<{ added: number, removed: number }>}
   */
  async syncProjectRoles({ scopeRef, assignments = [], actorId }) {
    if (!scopeRef) return { added: 0, removed: 0 };
    const desired = assignments.filter(x => x.personId && (x.role === 'organizer' || x.role === 'deep'));

    const activity = mockDB.activities.find(a => a.id === scopeRef);
    const tf = mockDB.taskforces.find(t => t.id === scopeRef);
    let current = [];
    if (activity) {
      current = Array.isArray(activity.assignments)
        ? activity.assignments.filter(x => x.role === 'organizer' || x.role === 'deep')
        : [];
    } else if (tf) {
      current = Array.isArray(tf.members)
        ? tf.members.filter(m => m.role === 'organizer' || m.role === 'deep')
        : [];
    } else {
      return { added: 0, removed: 0 };
    }

    const currentKeys = new Set(current.map(x => x.personId + ':' + x.role));
    const desiredKeys = new Set(desired.map(x => x.personId + ':' + x.role));
    const added = desired.filter(x => !currentKeys.has(x.personId + ':' + x.role));
    const removed = current.filter(x => !desiredKeys.has(x.personId + ':' + x.role));

    // 写主源：保留非 organizer/deep 条目（活动 participant / 专班含 contributions 的成员）
    try {
      if (activity) {
        const nonProj = Array.isArray(activity.assignments)
          ? activity.assignments.filter(x => x.role !== 'organizer' && x.role !== 'deep')
          : [];
        const updated = await updateActivity(scopeRef, { assignments: [...nonProj, ...desired] });
        _syncTopLevelOrganizer(updated); // 原则7：顶层 organizer 与主源 assignments 同步派生
        persist(); // 活动主源写入后落盘（updateActivity 不自动 persist）
      } else if (tf) {
        const prevMembers = Array.isArray(tf.members) ? tf.members : [];
        const contributionsById = {};
        prevMembers.forEach(m => { if (m.personId) contributionsById[m.personId] = m.contributions || []; });
        // 保留非 organizer/deep 成员（participant 等，含 contributions），与活动分支对齐
        const nonProj = prevMembers.filter(m => m.role !== 'organizer' && m.role !== 'deep');
        const desiredWithCtx = desired.map(x => ({
          personId: x.personId,
          role: x.role,
          contributions: contributionsById[x.personId] || [],
        }));
        TaskForceRecordStore.update(scopeRef, { members: [...nonProj, ...desiredWithCtx] });
      }
    } catch (e) {
      console.warn('[AuthStore] syncProjectRoles 写主源失败：', e);
      return { added: 0, removed: 0 }; // 主源未写成功不追加审计快照，避免快照与主源不一致
    }

    // 追加快照 + 通知
    _appendAuditEntries(scopeRef, actorId, added, 'grant');
    added.forEach(x => _notifyProjectAuth(scopeRef, actorId, x.personId, x.role));
    _appendAuditEntries(scopeRef, actorId, removed, 'revoke');

    return { added: added.length, removed: removed.length };
  },

  /**
   * 记录项目角色授予（主源已写入后的快照+通知，创建活动内联赋权/专班招募用）
   * @param {string} scopeRef - 活动或专班 ID
   * @param {Array<{personId:string, role:string}>} assignments
   * @param {string} [actorId]
   * @returns {number} 实际新增快照条数
   */
  recordProjectGrants(scopeRef, assignments, actorId) {
    if (!scopeRef || !Array.isArray(assignments)) return 0;
    const records = _getAuthRecords();
    let count = 0;
    assignments.forEach(a => {
      if (!a.personId || (a.role !== 'organizer' && a.role !== 'deep')) return;
      const dupRecs = records.filter(r =>
        r.targetPersonId === a.personId && r.role === a.role && r.scopeRef === scopeRef
      );
      const latestDup = dupRecs.length > 0 ? dupRecs[dupRecs.length - 1] : null;
      if (latestDup && latestDup.action !== 'revoke') return;
      records.push({
        id: 'auth-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        targetPersonId: a.personId,
        role: a.role,
        scopeRef,
        authorizedBy: actorId || null,
        authorizedAt: new Date().toISOString().slice(0, 10),
        action: 'grant',
      });
      _notifyProjectAuth(scopeRef, actorId, a.personId, a.role);
      count++;
    });
    _saveAuthRecords(records);
    return count;
  },

  /**
   * 批量记录项目角色回收（专班解散等批量场景：主源由调用方清空，此处只追加快照）
   * @param {string} scopeRef
   * @param {Array<{personId:string, role?:string}>} entries
   * @param {string} [actorId]
   * @returns {number}
   */
  recordProjectRevokes(scopeRef, entries, actorId) {
    return _appendAuditEntries(scopeRef, actorId, entries || [], 'revoke');
  },

  // ── 辅助方法 ────────────────────────────────

  getRoleLabel(role) {
    return ROLE_LABELS[role] || role;
  },

  getPageForRole(module, role) {
    return (ROLE_PAGE_MAP[module] || {})[role] || null;
  },

  isCommissioner(role) {
    return COMMISSIONER_ROLES.has(role);
  },
};
