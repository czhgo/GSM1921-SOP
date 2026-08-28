// role: [工程师]+[AI]
// 组长工作台共享上下文（T-279 M2 拆分样板）
// 各 tab 模块复用的只读配置与纯函数：accent 三件套、当前组长组、活动按角色过滤。

import { PEOPLE } from '../../../mock/index.js?v=20260829f';
import { AuthStore } from '../../../services/auth.js?v=20260829f';

/** 当前组长身份（数据驱动：AuthStore 当前用户 + partyGroup，不硬编码人） */
export function currentLeaderGroup() {
  const me = AuthStore.getCurrentUser();
  const leaderId = me?.personId || 'p4';
  const group = PEOPLE.find(p => p.id === leaderId)?.partyGroup || '';
  return { leaderId, group };
}

/** 当前组长 personId */
export function getCurrentLeaderId() {
  return AuthStore.getCurrentUser()?.personId || 'p4';
}

/** 按角色过滤活动（组长视角：上级下发 + 本人组织/参与 + 本人创建） */
export function filterByRole(state, role) {
  if (role !== 'leader') return state;
  const currentLeaderId = getCurrentLeaderId();
  const activities = (state.activities || []).filter(a => {
    // 组长可见：上级下发（top-down）、本人组织/参与（读主源 assignments，非 'leader' 角色名临时方案）、
    // 或本人创建的活动（含清空赋权的待办兜底场景，保证「去赋权」待办能直达详情）
    const isMine = Array.isArray(a.assignments)
      ? a.assignments.some(x => x.personId === currentLeaderId && (x.role === 'organizer' || x.role === 'deep'))
      : (a.organizer === currentLeaderId);
    return a.direction === 'top-down' || isMine || a.createdBy === currentLeaderId;
  });
  return { ...state, activities };
}
