// role: [人机]
// ================================================================
//  service.roles.js — 角色赋权共享服务
//  消除 party.js 之间的重复统计逻辑
//  单例：assignedRoles 仅在 localStorage 中持久化
// ================================================================

const STORAGE_KEY = 'sop_org_os_assigned_roles';

export const assignedRoles = [];

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        assignedRoles.length = 0;
        assignedRoles.push(...parsed);
      }
    }
  } catch (_) { /* 格式错误则丢弃 */ }
}

export function saveAssignedRoles() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignedRoles));
  } catch (_) { /* quota exceeded 静默失败 */ }
}

_load();

export function addAssignedRole(entry) {
  assignedRoles.push({ ...entry, assignedAt: new Date().toISOString() });
  saveAssignedRoles();
}

export function removeAssignedRole(index) {
  assignedRoles.splice(index, 1);
  saveAssignedRoles();
}

export function computeSecretaryStats(activities, nowOverride) {
  const now = nowOverride || new Date();
  let activeEvents = 0, monthEvents = 0, pendingAuth = 0, archivedEvents = 0;

  (activities || []).forEach(a => {
    if (a.archived) { archivedEvents++; return; }
    activeEvents++;
    const d = new Date(a.date);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      monthEvents++;
    }
    if (a.direction === 'bottom-up' && !(a.authorizedBy || a.authorized)) {
      pendingAuth++;
    }
  });

  return {
    activeEvents,
    monthEvents,
    pendingAuth,
    authGranted: assignedRoles.length,
    archivedEvents,
  };
}

export function filterForViewProxy(activities, proxyRole) {
  const filters = {
    organizer:      a => a.organizerName || true,
    publicity:      a => a.activityType ? true : false,
    inspector:      a => true,
    'group1-leader': a => a.hostGroup === 'group1',
    'group2-leader': a => a.hostGroup === 'group2',
    'group3-leader': a => a.hostGroup === 'group3',
    deep:           a => true,
    regular:        a => true,
  };
  const fn = filters[proxyRole] || (() => true);
  return (activities || []).filter(fn);
}
