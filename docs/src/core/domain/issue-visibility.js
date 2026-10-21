// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  issue-visibility.js — 意见反馈 / 内部汇报的**受众判据单一源**
// ════════════════════════════════════════════════════════════════
//  为什么单独一件：前端读口（getAll / filter / getById / count）与服务端 GET /issues 必须同一判据；
//  服务端不能直接 import `services/governance/issues.js`（那件牵 localStorage / AuthStore / 数据适配器），
//  故把纯判据抽到 domain 层，两端各引一次。
//
//  支书 2026-10-21 裁定：
//   · 内部汇报（kind='report'）：支书层 ＋ 当事人（汇报人 / 被请求人 / 被指派人），不因挂了工作组
//     就自动扩散给该组组织者；
//   · 隐藏反馈（hidden / mergedInto）：支书层 ＋ 处置人（按人指派或按角色指派）；
//   · 其余公开反馈：本支部成员可读（支部边界仍由调用方按 branchId 收口）。
import { SECRETARY_AND_DEPUTY_ROLES } from './constants.js?v=20261021b';

/**
 * 一行反馈 / 汇报是否可被该观看者读取（不判断支部归属——支部边界由调用方另行收口）。
 * @param {Object} row issue 记录
 * @param {{ personId?: string|null, role?: string|null }} viewer
 * @returns {boolean}
 */
export function canReadIssue(row, viewer) {
  if (!row || typeof row !== 'object') return false;
  const personId = viewer?.personId || null;
  const role = viewer?.role || null;
  if (!personId && !role) return false;

  const isSecretaryLevel = !!role && SECRETARY_AND_DEPUTY_ROLES.includes(role);
  const isAssigneeByPerson = !!personId && row.assignee === personId;
  const isAssigneeByRole = !!role && row.assigneeRole === role;

  // 内部汇报：只给支书层与当事人
  if (row.kind === 'report') {
    return isSecretaryLevel
      || (!!personId && (row.submittedBy === personId || row.requestedBy === personId))
      || isAssigneeByPerson
      || isAssigneeByRole;
  }

  // 隐藏 / 已合并：只给支书层与处置人
  if (row.hidden || row.mergedInto) {
    return isSecretaryLevel || isAssigneeByPerson || isAssigneeByRole;
  }

  return true;
}
