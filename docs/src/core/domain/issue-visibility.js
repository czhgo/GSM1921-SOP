// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  issue-visibility.js — 意见反馈 / 内部汇报的**受众判据单一源**
// ════════════════════════════════════════════════════════════════
//  为什么单独一件：前端读口（getAll / filter / getById / count）与服务端 GET /issues 必须同一判据；
//  服务端不能直接 import `services/governance/issues.js`（那件牵 localStorage / AuthStore / 数据适配器），
//  故把纯判据抽到 domain 层，两端各引一次。
//
//  支书 2026-10-21 裁定（批次 500 · B-499-2，取代批次 498 的「支书层＋当事人」口径）：
//   · 内部汇报（kind='report'）：支委层（BRANCH_COMMISSION_ROLES 全量）＋ 当事人（汇报人 / 被请求人 /
//     被指派人）＋ 该汇报所挂活动 / 专班工作组的组织者 ＋ 汇报人所在党小组的组长（leader / deputy-leader）；
//   · 隐藏反馈（hidden / mergedInto）：维持批次 498 口径——支书层（secretary / deputy-secretary）＋
//     处置人（按人指派或按角色指派），不因本轮放开内部汇报而扩大匿名面；
//   · 其余公开反馈：本支部成员可读（支部边界仍由调用方按 branchId 收口）。
//
//  ⚠ 组织关系（谁是组织者 / 谁是组长）**不在此处 import 数据层**：由调用方以参数注入解析回调，
//    本文件只留纯判据；前端 `_visibleIssues` 与服务端 GET /issues 各自提供同口径回调。
import { BRANCH_COMMISSION_ROLES, SECRETARY_AND_DEPUTY_ROLES } from './constants.js?v=20261025b';

/** 汇报所挂工作组 id：显式父键优先，其次按 sourceType/sourceId 还原稳定工作组 id */
function _workgroupIdOf(row) {
  if (row?.workgroupId) return row.workgroupId;
  if (row?.sourceType && row?.sourceId) return `wg-${row.sourceType}-${row.sourceId}`;
  return null;
}

/**
 * 一行反馈 / 汇报是否可被该观看者读取（不判断支部归属——支部边界由调用方另行收口）。
 * @param {Object} row issue 记录
 * @param {{ personId?: string|null, role?: string|null }} viewer
 * @param {{
 *   isWorkgroupOrganizer?: (workgroupId: string) => boolean,
 *   isPartyGroupLeaderOf?: (personId: string) => boolean,
 * }} [access] 组织关系解析（由调用方注入；缺省视为 false，不猜人、不回落）。
 * @returns {boolean}
 */
export function canReadIssue(row, viewer, access = {}) {
  if (!row || typeof row !== 'object') return false;
  const personId = viewer?.personId || null;
  const role = viewer?.role || null;
  if (!personId && !role) return false;

  const isSecretaryLevel = !!role && SECRETARY_AND_DEPUTY_ROLES.includes(role);
  const isCommitteeLevel = !!role && BRANCH_COMMISSION_ROLES.includes(role);
  const isAssigneeByPerson = !!personId && row.assignee === personId;
  const isAssigneeByRole = !!role && row.assigneeRole === role;

  // 内部汇报：支委层 ＋ 当事人 ＋ 该工作组组织者 ＋ 汇报人所在党小组组长
  if (row.kind === 'report') {
    const workgroupId = _workgroupIdOf(row);
    const isWorkgroupOrganizer = !!workgroupId
      && typeof access?.isWorkgroupOrganizer === 'function'
      && access.isWorkgroupOrganizer(workgroupId);
    const isSubmitterGroupLeader = !!row.submittedBy
      && typeof access?.isPartyGroupLeaderOf === 'function'
      && access.isPartyGroupLeaderOf(row.submittedBy);
    return isCommitteeLevel
      || (!!personId && (row.submittedBy === personId || row.requestedBy === personId))
      || isAssigneeByPerson
      || isAssigneeByRole
      || isWorkgroupOrganizer
      || isSubmitterGroupLeader;
  }

  // 隐藏 / 已合并：只给支书层与处置人（批次 498 匿名面不变）
  if (row.hidden || row.mergedInto) {
    return isSecretaryLevel || isAssigneeByPerson || isAssigneeByRole;
  }

  return true;
}
