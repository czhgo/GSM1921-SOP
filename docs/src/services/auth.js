// role: [人机]
// service.auth.js — 赋权 Mock 系统
// 赋权链对齐 CLAUDE.md H2.5 + H2.6 (D-15):
//   党支书 → 党小组组长 / 条条支委
//   党小组组长 → 组织者 / 深度参与者（活动域赋权）
//   组织委员 → 组织者 / 深度参与者（专班域赋权）
//   组织者两种赋权路径: Ⅰ自上而下(赋权随承包自动生效) Ⅱ自下而上(须经赋权后方可分派)
//   宣传委员 / 纪检委员 → 无赋权能力
//   活动写入: 仅党小组组长 + 党支书
//   专班招募: 仅组织委员

// 登录态打桩（T60-2）：当前无登录系统，默认站位=党支书
// 未来接入登录后，此值由登录接口返回
const LOGIN_STANCE = 'secretary';

import { ROLE_LABELS as _ROLE_LABELS } from '../core/constants.js';

const AUTH_KEY = 'gsm1921-auth-records';
const VIEW_MODE_KEY = 'gsm1921-view-mode';
const PRIMARY_ROLE_KEY = 'gsm1921-primary-role';
const ACTIVE_ROLE_KEY_PREFIX = 'gsm1921-active-role';

const ROLE_LABELS = _ROLE_LABELS;

const MODULE_ROLES = {
  workspace: ['secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader', 'organizer', 'deep'],
  party: ['secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'],
};

const AUTHZ_CHAIN = {
  'secretary': ['org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader', 'organizer', 'deep'],
  'org-commissioner': ['prop-commissioner', 'disc-commissioner', 'organizer', 'deep'],
  'prop-commissioner': ['org-commissioner', 'disc-commissioner'],
  'disc-commissioner': ['org-commissioner', 'prop-commissioner'],
  'leader': ['organizer', 'deep'],
  'organizer': [],
  'deep': [],
};
// NOTE: org-commissioner 和 leader 均包含 organizer/deep，
//   但赋权域不同：leader → 活动域赋权；org-commissioner → 专班域赋权。
//   当前扁平数据结构无法直接区分域，域判定需结合业务上下文
//   （如 assignedRoles.activity 是否为空 → 专班域；非空 → 活动域）。

// 站位选项：根据登录角色，返回可选的站位列表
// 无登录态下，所有角色都可选（模拟党支书的全权限）
// 有登录态后，根据实际角色限制可选站位
function getStanceOptions() {
  // 打桩：无登录态，返回所有角色
  // 未来：根据 LOGIN_STANCE 限制
  if (LOGIN_STANCE === 'secretary') {
    return ['secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader', 'organizer', 'deep'];
  }
  // 打桩：其他登录角色的站位限制
  if (['org-commissioner', 'prop-commissioner', 'disc-commissioner'].includes(LOGIN_STANCE)) {
    return [LOGIN_STANCE]; // 支委只能站自己的位
  }
  if (LOGIN_STANCE === 'leader') {
    return [LOGIN_STANCE]; // 组长只能站自己的位
  }
  return [LOGIN_STANCE]; // 其他角色只能站自己的位
}

// 视图选项：根据当前站位，返回在指定模块中可查看的身份视图
function getViewOptions(stance, module) {
  const moduleRoles = MODULE_ROLES[module] || [];
  if (!stance) return moduleRoles;

  // 站位=党支书：可看所有
  if (stance === 'secretary') return moduleRoles;

  // 站位=支委：可看自身+赋权下游
  const downstream = AUTHZ_CHAIN[stance] || [];
  return moduleRoles.filter(r => r === stance || downstream.includes(r));
}

// 模式推导：根据站位和视图自动决定模式
function deriveMode(stance, view) {
  if (!stance || !view) return 'observe';
  if (stance === view) return 'manage';
  const downstream = AUTHZ_CHAIN[stance] || [];
  if (downstream.includes(view)) return 'manager-observe';
  return 'participant-observe';
}

function _defaultAuth() {
  return {
    'leader':             { authorizedBy: 'secretary', authorizedAt: '2026-01-10' },
    'org-commissioner':   { authorizedBy: 'secretary', authorizedAt: '2026-01-15' },
    'prop-commissioner':  { authorizedBy: 'secretary', authorizedAt: '2026-01-15' },
    'disc-commissioner':  { authorizedBy: 'secretary', authorizedAt: '2026-01-15' },
    'organizer':          { authorizedBy: 'leader',    authorizedAt: '2026-02-10' },
    'deep':               { authorizedBy: 'leader',    authorizedAt: '2026-03-01' },
    'secretary':          { approved: 'self' },
  };
}

// 赋权记录 key（细粒度：personId + role + scope）
const AUTH_RECORDS_KEY = 'gsm1921-auth-grants';

export const AuthStore = {
  getRecords() {
    try { const raw = localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : _defaultAuth(); }
    catch { return _defaultAuth(); }
  },

  // ── 细粒度赋权记录 API（P0-4） ──────────────────────────────

  /**
   * 获取所有细粒度赋权记录
   * @returns {Array<{id:string, targetUserId:string, role:string, scope:string, scopeRef:string|null, authorizedBy:string, authorizedAt:string}>}
   */
  getAuthState() {
    try {
      const raw = localStorage.getItem(AUTH_RECORDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  /**
   * 赋权：为指定人员赋予角色
   * @param {string} targetUserId - 被赋权人员 ID（如 'p3'）
   * @param {string} role - 角色：'organizer' | 'deep'
   * @param {string} scope - 赋权范围：'activity' | 'taskforce'
   * @param {string|null} scopeRef - 关联活动/专班 ID
   * @returns {{ ok:boolean, id:string }}
   */
  authorize(targetUserId, role, scope, scopeRef = null) {
    if (!targetUserId || !role || !scope) return { ok: false, id: '' };
    // 书记可赋权角色限制
    const allowedRoles = ['organizer', 'deep'];
    if (!allowedRoles.includes(role)) return { ok: false, id: '' };
    // scope 限制
    const allowedScopes = ['activity', 'taskforce'];
    if (!allowedScopes.includes(scope)) return { ok: false, id: '' };

    const records = this.getAuthState();
    // 查重：同一人 + 同角色 + 同范围 + 同关联对象 → 不重复赋权
    const duplicate = records.find(r =>
      r.targetUserId === targetUserId &&
      r.role === role &&
      r.scope === scope &&
      (r.scopeRef || null) === (scopeRef || null)
    );
    if (duplicate) return { ok: false, id: duplicate.id };

    const id = 'auth-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const record = {
      id,
      targetUserId,
      role,
      scope,
      scopeRef: scopeRef || null,
      authorizedBy: LOGIN_STANCE,
      authorizedAt: new Date().toISOString().slice(0, 10),
    };
    records.push(record);
    try { localStorage.setItem(AUTH_RECORDS_KEY, JSON.stringify(records)); } catch {}
    return { ok: true, id };
  },

  /**
   * 撤销赋权
   * @param {string} recordId - 赋权记录 ID
   * @returns {boolean}
   */
  revokeAuthorization(recordId) {
    if (!recordId) return false;
    const records = this.getAuthState();
    const idx = records.findIndex(r => r.id === recordId);
    if (idx === -1) return false;
    records.splice(idx, 1);
    try { localStorage.setItem(AUTH_RECORDS_KEY, JSON.stringify(records)); } catch {}
    return true;
  },

  isAuthorized(role) {
    if (!role) return false;
    if (role === 'secretary') return true;
    const records = this.getRecords();
    const record = records[role];
    return !!(record && (record.authorizedBy || record.approved));
  },

  getAuthorizer(role) {
    const records = this.getRecords();
    return records[role]?.authorizedBy || null;
  },

  getPrimaryRole() {
    try { return sessionStorage.getItem(PRIMARY_ROLE_KEY) || ''; } catch { return ''; }
  },

  setPrimaryRole(role) {
    try { sessionStorage.setItem(PRIMARY_ROLE_KEY, role || ''); } catch {}
  },

  getActiveRole(module) {
    try { return sessionStorage.getItem(`${ACTIVE_ROLE_KEY_PREFIX}-${module}`) || ''; } catch { return ''; }
  },

  setActiveRole(module, role) {
    try { sessionStorage.setItem(`${ACTIVE_ROLE_KEY_PREFIX}-${module}`, role || ''); } catch {}
  },

  getVisibleRoles(primaryRole) {
    if (!primaryRole) return [];
    return AUTHZ_CHAIN[primaryRole] || [];
  },

  getViewCategory(primaryRole, activeRole) {
    return deriveMode(primaryRole || LOGIN_STANCE, activeRole);
  },

  getRoleLabel(role) {
    return ROLE_LABELS[role] || role;
  },

  getModuleRoles(module) {
    return MODULE_ROLES[module] || [];
  },

  getLoginStance() { return LOGIN_STANCE; },
  getStanceOptions,
  getViewOptions,
  deriveMode,
};

export const ViewModeStore = {
  getMode(module) {
    try { return sessionStorage.getItem(`${VIEW_MODE_KEY}-${module}`) || 'observe'; }
    catch { return 'observe'; }
  },

  setMode(module, mode) {
    try { sessionStorage.setItem(`${VIEW_MODE_KEY}-${module}`, mode); } catch {}
  },

  canManage(module, role) {
    if (!role) return false;
    if (role === 'secretary') return true;
    if (role === 'leader') return true;
    const partyRoles = ['org-commissioner', 'prop-commissioner', 'disc-commissioner'];
    if (partyRoles.includes(role)) return true;
    return AuthStore.isAuthorized(role);
  },

  canWriteActivity(role) {
    if (!role) return false;
    return role === 'secretary' || role === 'leader';
  },

  canRecruitTaskForce(role) {
    if (!role) return false;
    return role === 'secretary' || role === 'org-commissioner';
  },

  canAuthorize(role) {
    if (!role) return false;
    return role === 'secretary' || role === 'leader' || role === 'org-commissioner';
  },

  canInitiateTaskForce(role) {
    if (!role) return false;
    const initiators = ['secretary', 'leader', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'];
    return initiators.includes(role);
  },

  getViewCategory(module) {
    const primary = AuthStore.getPrimaryRole();
    const active = AuthStore.getActiveRole(module);
    return AuthStore.getViewCategory(primary, active);
  },

  isReadOnly(module) {
    const category = this.getViewCategory(module);
    return category !== 'manage' || this.getMode(module) === 'observe';
  },
};

export { ROLE_LABELS, MODULE_ROLES, AUTHZ_CHAIN };
