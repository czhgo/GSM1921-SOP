// role: [工程师]+[AI]
// ================================================================
//  service.roles.js — 角色赋权共享服务
//  消除 party.js 之间的重复统计逻辑
//  assignedRoles 遗留键（sop_org_os_assigned_roles）已删除，启动时清一次存储残留
// ================================================================

import { PEOPLE } from '../mock/index.js';

// 遗留键清理（P2-6）：sop_org_os_assigned_roles 已无调用方，此处清一次存储残留
try { localStorage.removeItem('sop_org_os_assigned_roles'); } catch (_) {}

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
    // 待赋权 = bottom-up 活动且主源 assignments 中无组织者（读主源，非幽灵字段 authorizedBy）
    if (a.direction === 'bottom-up' && !(a.assignments || []).some(x => x.role === 'organizer')) {
      pendingAuth++;
    }
  });

  return {
    activeEvents,
    monthEvents,
    pendingAuth,
    // 已赋权组长 = PEOPLE 主源预设（leader 为常设角色，存于 mock 人员数据）
    authGranted: PEOPLE.filter(p => p.role === 'leader').length,
    archivedEvents,
  };
}

export function filterForViewProxy(activities, proxyRole) {
  const filters = {
    organizer:            a => a.organizer ? true : false,
    'prop-commissioner':  a => a.activityType ? true : false,
    'disc-commissioner':  a => true,
    'group1-leader': a => a.hostGroup === 'group1',
    'group2-leader': a => a.hostGroup === 'group2',
    'group3-leader': a => a.hostGroup === 'group3',
    deep:           a => true,
    regular:        a => true,
  };
  const fn = filters[proxyRole] || (() => true);
  return (activities || []).filter(fn);
}
