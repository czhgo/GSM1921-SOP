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

export const AuthStore = {
  getRecords() {
    try { const raw = localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : _defaultAuth(); }
    catch { return _defaultAuth(); }
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
    if (!primaryRole || !activeRole) return 'participant-observe';
    if (primaryRole === activeRole) return 'manage';
    const visible = AUTHZ_CHAIN[primaryRole] || [];
    if (visible.includes(activeRole)) return 'manager-observe';
    return 'participant-observe';
  },

  getRoleLabel(role) {
    return ROLE_LABELS[role] || role;
  },

  getModuleRoles(module) {
    return MODULE_ROLES[module] || [];
  },
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
