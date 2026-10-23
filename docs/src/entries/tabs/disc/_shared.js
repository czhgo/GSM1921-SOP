// role: [工程师]+[AI]
// 纪检委员工作台共享上下文（T-279 M3 拆分，照 M2 样板 leader/_shared）
// 各 tab 模块复用的只读配置与纯函数：纪检委员 personId。

import { PersonStore } from '../../../services/member/person.js?v=20261023a';
import { showToast } from '../../../core/base/utils.js?v=20261023a';

/**
 * 现任纪检委员 personId（数据驱动：users.role === 'disc-commissioner'）。
 *
 * 为什么不再保留 `p10` 常量（数据生命周期 P1-10，2026-10-20）：
 *   纪检换人后，写死 p10 会把 recordedBy / annotatedBy / 申诉处理人继续记到上一任；
 *   名单属工作流事实，必须随成员角色现算。无该角色时返回 null —— 调用方须显式提示
 *   「请先维护纪检委员角色」，不得静默用假人。
 * @returns {string|null}
 */
export function getDiscCommissionerId() {
  const person = PersonStore.getMembers().find((p) => p.role === 'disc-commissioner' && p.branchId);
  return person?.id || null;
}

/**
 * 写口取纪检委员 id：无该角色时提示并返回 null，调用方必须中止写入。
 * @returns {string|null}
 */
export function requireDiscCommissionerId() {
  const id = getDiscCommissionerId();
  if (!id) showToast('error', '未找到纪检委员：请先在成员档案维护纪检委员角色');
  return id;
}
