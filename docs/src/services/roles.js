// role: [工程师]+[AI]
// ================================================================
//  service.roles.js — 角色赋权共享服务
//  消除 party.js 之间的重复统计逻辑
//  assignedRoles 遗留键（sop_org_os_assigned_roles）已删除，启动时清一次存储残留
// ================================================================

import { PEOPLE } from '../mock/index.js?v=20260903b';
import { AuthStore } from './auth.js?v=20260903b';

// 遗留键清理（P2-6）：sop_org_os_assigned_roles 已无调用方，此处清一次存储残留
try { localStorage.removeItem('sop_org_os_assigned_roles'); } catch (_) {}

/**
 * 当前有效党小组组长数（数字一致性审计 2026-08-07）
 * 主源 = PEOPLE 预设 role:'leader' + 审计快照运行时授予（grant 且最新一条非 revoke），按人去重。
 * 与书记工作台"当前党小组组长"列表（renderAuthRecords/_renderAssignLeaders）同源，
 * 保证统计数字随赋权/撤销实时更新。
 */
function _countActiveLeaders() {
  const ids = new Set(PEOPLE.filter(p => p.role === 'leader').map(p => p.id));
  const latest = {};
  AuthStore.getAuthorizations().forEach(r => {
    if (r.role !== 'leader' || !r.targetPersonId) return;
    latest[r.targetPersonId] = r; // 数组顺序即时间顺序，后写覆盖
  });
  Object.entries(latest).forEach(([pid, r]) => {
    if (r.action === 'grant') ids.add(pid);
    // revoke：若该人有 preset 组长身份仍保留（与 _getUserRoleFromMemory mock 回退一致），否则移除
    else if (!PEOPLE.some(p => p.id === pid && p.role === 'leader')) ids.delete(pid);
  });
  return ids.size;
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
    // 待赋权 = bottom-up 活动且主源 assignments 中无组织者（读主源，非幽灵字段 authorizedBy）
    if (a.direction === 'bottom-up' && !(a.assignments || []).some(x => x.role === 'organizer')) {
      pendingAuth++;
    }
  });

  return {
    activeEvents,
    monthEvents,
    pendingAuth,
    // 已赋权组长 = 有效党小组组长数（预设 + 运行时授予，随赋权更新）
    authGranted: _countActiveLeaders(),
    archivedEvents,
  };
}
