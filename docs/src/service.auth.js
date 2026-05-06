// role: [人机]
// service.auth.js — 赋权 Mock 系统
// 赋权链对齐 ROADMAP §0.2A + §0.3:
//   党支书 → 党小组组长 / 条条支委
//   党小组组长 + 组织委员 → 活动组织者 / 深度参与者
//   宣传委员 / 纪检委员 → 无赋权能力
//   活动写入: 仅党小组组长 + 党支书
//   专班招募: 仅组织委员

const AUTH_KEY = 'gsm1921-auth-records';
const VIEW_MODE_KEY = 'gsm1921-view-mode';

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
};

export const ViewModeStore = {
  getMode(module) {
    try { return sessionStorage.getItem(`${VIEW_MODE_KEY}-${module}`) || 'observe'; }
    catch { return 'observe'; }
  },

  setMode(module, mode) {
    try { sessionStorage.setItem(`${VIEW_MODE_KEY}-${module}`, mode); } catch {}
  },

  // 判断某角色在某模块是否可以进入管理模式
  canManage(module, role) {
    if (!role) return false;
    if (role === 'secretary') return true;
    if (role === 'leader') return true;
    const partyRoles = ['org-commissioner', 'prop-commissioner', 'disc-commissioner'];
    if (partyRoles.includes(role)) return true;
    // organizer / deep 需被赋权
    return AuthStore.isAuthorized(role);
  },

  // 判断某角色在某模块是否有活动写入权限
  canWriteActivity(role) {
    if (!role) return false;
    return role === 'secretary' || role === 'leader';
  },

  // 判断某角色是否可以招募专班
  canRecruitTaskForce(role) {
    if (!role) return false;
    return role === 'secretary' || role === 'org-commissioner';
  },

  // 判断某角色是否有赋权能力（可以给别人赋权）
  canAuthorize(role) {
    if (!role) return false;
    return role === 'secretary' || role === 'leader' || role === 'org-commissioner';
  },

  // 判断某角色是否可以发起专班（党建域）
  // 党小组组长、条条支委、书记均可发起
  canInitiateTaskForce(role) {
    if (!role) return false;
    const initiators = ['secretary', 'leader', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'];
    return initiators.includes(role);
  },
};
