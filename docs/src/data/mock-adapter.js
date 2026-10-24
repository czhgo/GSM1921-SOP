// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  mock-adapter.js — Mock 数据适配器实现
//  T-142 阶段2：包装现有 mock.js 服务，实现 DataAdapter 接口
//
//  本文件是 DataAdapter 接口的 mock 实现，操作 mockDB + localStorage。
//  当数据源切换为 'api' 时，本适配器不再被使用。
//
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md
// ════════════════════════════════════════════════════════════════

import { mockDB, SCHEMA_VERSION, SEED_DATA_VERSION, workgroupStatusForTaskforce, TASK_TERMINAL_STATUSES, OUTPUT_TERMINAL_STATUSES, TaskStatus, OutputStatus, isWorkgroupWritableStatus, WORKGROUP_CLOSED_STATUSES } from '../core/domain/domain.js?v=20261024b';
import { generateId } from '../core/base/id.js?v=20261024b';
// 计票方式（ballotMode）单一源：正式表决无记名落库口径与 server/routes/committee.js 同源（constants.js）
import { ballotModeOfActivity, DEFAULT_BRANCH_ID, isBranchLevelActivity, normalizeOrganizingScope, BRANCH_COMMISSIONER_ASSIGNABLE_ROLES, BRANCH_COMMISSIONER_FALLBACK_ROLE, branchCommissionerWriteDeny } from '../core/domain/constants.js?v=20261024b';
// 修复（T175）：直接从 ../mock/activities.js 导入 ACTIVITIES，
// 绕过 ../mock/index.js 的 re-export 转发（与 services/core/mock.js 对齐，
// 消除循环依赖/TDZ 导致的 seed 失败风险）
import { ACTIVITIES } from './mock/activities.js?v=20261024b';
import { MOCK_TASKFORCES } from './mock/taskforces.js?v=20261024b';
import { PEOPLE } from './mock/people.js?v=20261024b';
import { SEED_TASKS, SEED_ASSIGNMENTS, SEED_ARCHIVE_RECORDS, SEED_SIGNUPS, SEED_REVIEW_REQUESTS, SEED_MAKEUP_TASKS } from './mock/seed.js?v=20261024b';
// Seed 增量合并用（2026-08-05）：attendance.js/notices.js 为纯数据模块，
// 经 services/member/person.js（只依赖 domain/people）→ 无指向本文件的循环依赖
import { ATTENDANCE_RECORDS } from './mock/attendance.js?v=20261024b';
import { MOCK_NOTICES } from './mock/notices.js?v=20261024b';
// R10（2026-10-23，C13）：种子修复源按 manifest 登记生成（不再手写 11 个集合的字段清单）。
import { INSPECTION_RECORDS } from './mock/inspection.js?v=20261024b';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from './mock/review.js?v=20261024b';
import { THOUGHT_REPORTS } from './mock/thought-reports.js?v=20261024b';
import { PERIODIC_ARCHIVES_SEED, PROP_TASKS_SEED } from './mock/prop.js?v=20261024b';
import * as AUX_SEED from './mock/auxiliary.js?v=20261024b';
import { BRANCHES } from './mock/branches.js?v=20261024b';
import { todayLocal } from '../core/base/utils.js?v=20261024b';
import { WORKGROUP_MEMBER_ROLES } from '../services/activity/workgroup-members.js?v=20261024b';
import { WORKGROUP_PERMISSION_TEMPLATES_BY_KIND } from '../core/domain/workgroup-policy.js?v=20261024b';
import { ensureLegacySourceWorkgroups, ensureDemoWorkgroupGrants, normalizeSeedActivityOrganizing, normalizeSeedActivitySeedRows } from './workgroup-seed-sync.js?v=20261024b';
import { PARTY_GROUPS } from './mock/party-groups.js?v=20261024b';
// B-499-8：种子漂移修复（纯函数）与「哪些持久化键归种子管」单一清单。
import { planSeedRepair } from './seed-drift.js?v=20261024b';
import { SEED_MANIFEST, SEED_MANIFEST_BY_COLLECTION } from './seed-manifest.js?v=20261024b';
import { isInitStateActive } from '../services/core/init-reset.js?v=20261024b';
import { migrateInspectionWorkgroupKeys, migrateReviewParentKeys } from '../services/activity/inspection-migrate.js?v=20261024b';
// @deprecated 旧 p* → 学号：仅本文件（历史 localStorage / 已存演示库）迁移路径使用
import { isLegacyPersonId, mapPersonId, mapLegacyIdInString } from './legacy-person-ids.js?v=20261024b';
// R9 Task 4.3：活动 ↔ 工作组字段同步（与服务端共用同一纯函数投影）
import { applyActivityWorkgroupSync, activityWorkgroupIdsForDelete, workgroupIdFor } from './activity-workgroup-sync.js?v=20261024b';

const STORAGE_KEY = 'workflowos_branch_db_v1';

// Phase 0 · mock 多支部过滤（2026-10-20）：分量列表按 branchId 收敛，口径与服务端
// server/routes/resources/branch-scope.js::resourceBranchId 同源：
//   · branches → 自身 id；users → 显式 branchId（null = 未归属，不落入任何支部）
//   · 其余资源 → 直接 branchId，缺失时按关联业务记录（activityId / workgroupId /
//     taskforceId / sourceType+sourceId / 党小组）派生，仍无则按既有规则回落 br-b1
//   · 直接 branchId 与关联派生结果冲突 ⇒ 视为归属不一致（不落入任何支部）
// 仅在调用方显式传 params.branchId 时启用；不传保持原有全量行为（单支部演示不受影响）。
// R2-17：缺省支部常量收敛到 core/domain/constants.js 单一导出。

function _rowById(rows, id) {
  return (Array.isArray(rows) ? rows : []).find((row) => row && String(row.id) === String(id)) || null;
}

// R10（2026-10-23，C16）：工作组写口状态门与 API 409 同语义（`workgroup-routes.js::workgroupWriteDeny`）。
const WORKGROUP_WRITE_DENY_CLOSED = '工作组已结束，成员、授权、任务与产出历史只读保留';
const WORKGROUP_WRITE_DENY_PRE_OPEN = '工作组尚未进入招募或运行阶段，成员、授权、任务与产出暂不可写';
function _assertWorkgroupWritable(workgroup) {
  if (WORKGROUP_CLOSED_STATUSES.includes(workgroup?.status)) {
    throw Object.assign(new Error(WORKGROUP_WRITE_DENY_CLOSED), { type: 'ConflictError' });
  }
  if (!isWorkgroupWritableStatus(workgroup?.status)) {
    throw Object.assign(new Error(WORKGROUP_WRITE_DENY_PRE_OPEN), { type: 'ConflictError' });
  }
}

function _linkedBranchOfMockRow(row) {
  if ((row.sourceType === 'activity' || row.sourceType === 'taskforce') && row.sourceId) {
    const source = row.sourceType === 'activity'
      ? _rowById(mockDB.activities, row.sourceId)
      : _rowById(mockDB.taskforces, row.sourceId);
    if (source) return _recordBranchId(row.sourceType === 'activity' ? 'activities' : 'taskforces', source);
  }
  if (row.activityId) {
    const activity = _rowById(mockDB.activities, row.activityId);
    if (activity) return activity.branchId || DEFAULT_BRANCH_ID;
  }
  if (row.workgroupId) {
    const workgroup = _rowById(mockDB.workgroups, row.workgroupId);
    if (workgroup) return workgroup.branchId || DEFAULT_BRANCH_ID;
  }
  if (row.taskforceId) {
    const taskforce = _rowById(mockDB.taskforces, row.taskforceId);
    if (taskforce) return taskforce.branchId || DEFAULT_BRANCH_ID;
  }
  const groupId = row.partyGroupId || row.groupId || row.hostGroupId;
  if (groupId) {
    const group = _rowById(mockDB.partyGroups, groupId);
    if (group) return group.branchId || DEFAULT_BRANCH_ID;
  }
  return null;
}

function _recordBranchId(resourceName, row) {
  if (!row || typeof row !== 'object') return null;
  if (resourceName === 'branches') return row.id || null;
  if (resourceName === 'users') return row.branchId || null;
  const direct = row.branchId || null;
  const linked = _linkedBranchOfMockRow(row);
  if (direct && linked && direct !== linked) return null;
  if (direct) return direct;
  // v11（批次 504）：待办解析不出就是「待归属」NULL，不再回落缺省支部。
  if (resourceName === 'todos') {
    if (linked) return linked;
    const person = row.personId ? _rowById(mockDB.users, row.personId) : null;
    return person?.branchId || null;
  }
  return linked || DEFAULT_BRANCH_ID;
}

function _filterByBranch(rows, resourceName, params = {}) {
  if (!params.branchId) return rows;
  return rows.filter((row) => _recordBranchId(resourceName, row) === params.branchId);
}

// 历史遗留存储键（并入 workflowos_branch_db_v1 全量键架构前的旧单域键）：
// SANDBOX_MODE 每刷清理与演示数据一键重置（?reset demo 档，见 handleResetIfRequested/collectResetKeys）
// 共用同一清单，避免两处键集合未同步。
const LEGACY_STORAGE_KEYS = [
  'assignment_records', 'attendance_records',
  'inspection_records', 'makeup_tasks', 'act_sub_records',
  'tf_sub_records', 'compliance_references', 'file_space_records',
  'experience_deposits', 'gsm1921-auth-records',
];

/**
 * 内存沙盒模式开关：true 时每次刷新自动清空持久化存储
 * 2026-07-31 修复（T174）：与 services/core/mock.js 对齐改为 false，
 * 恢复跨刷新持久化能力。两处 SANDBOX_MODE 必须保持一致。
 */
const SANDBOX_MODE = false;

// ── 持久化引擎 ──────────────────────────────────────────────────

function _saveToStorage() {
  // 持久化守卫（2026-08-05）：loadDB 完成（mockDB._loaded）前拒绝写入，
  // 防止 header 渲染等加载早期调用链以空数据覆盖 localStorage 中的用户数据。
  if (!mockDB._loaded) {
    console.warn('[MockAdapter] 跳过持久化写入：mockDB 尚未加载（loadDB 未完成），防止空数据覆盖');
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _schema:     mockDB._schema,
      // 种子数据版本（「旧本地演示数据自动失效」判据）：与 domain.js::SEED_DATA_VERSION 同源落盘，
      //   供 _loadFromStorage 识别「本地存的是旧版本演示数据」→ 整库丢弃回新种子。
      _seedVersion: SEED_DATA_VERSION,
      users:       mockDB.users,
      activities:  mockDB.activities,
      tasks:        mockDB.tasks,
      attendances: mockDB.attendances,
      inspections: mockDB.inspections,
      assignments: mockDB.assignments,
      makeupTasks: mockDB.makeupTasks,
      actSubRecords: mockDB.actSubRecords,
      tfSubRecords:  mockDB.tfSubRecords,
      fileSpaceRecords: mockDB.fileSpaceRecords,
      experienceDeposits: mockDB.experienceDeposits,
      imageRecords:     mockDB.imageRecords,
      taskforces:  mockDB.taskforces,
      workgroups: mockDB.workgroups,
      workgroupMembers: mockDB.workgroupMembers,
      workgroupGrants: mockDB.workgroupGrants,
      workgroupTasks: mockDB.workgroupTasks,
      workgroupOutputs: mockDB.workgroupOutputs,
      attendanceRosters: mockDB.attendanceRosters,
      notices:     mockDB.notices,
      todos:       mockDB.todos,
      // T233 报名渠道：报名记录持久化（2026-08-08 修复：此前漏写导致刷新即丢）
      signups:     mockDB.signups,
      // 2026-08-05 假操作修复：复盘/宣传域补入持久化（刷新不再丢失）
      activityReviews: mockDB.activityReviews,
      taskforceReviews: mockDB.taskforceReviews,
      propTasks:     mockDB.propTasks,
      periodicArchives: mockDB.periodicArchives,
      archiveRecords: mockDB.archiveRecords,
      // 2026-08-10 文件流内控：外发确认记录持久化
      externalDispatches: mockDB.externalDispatches,
      // 2026-08-18 支部文件：持久化
      branchDocs: mockDB.branchDocs,
      // 2026-09-01 成员变更审批链路：持久化
      memberChangeRequests: mockDB.memberChangeRequests,
      committeeBroadcasts: mockDB.committeeBroadcasts,
      // 2026-09-01 线上支委会表态：持久化
      agendaVotes: mockDB.agendaVotes,
      // 2026-08-29 T-304 C2 三委数据交接：持久化（刷新不丢回执实体）
      handoffs: mockDB.handoffs,
      // 2026-08-30 思想汇报数字化（算法归档）：持久化
      thoughtReports: mockDB.thoughtReports,
      // 2026-09-14 批次 25：党小组一等实体持久化（支书特批）
      partyGroups: mockDB.partyGroups,
      // 2026-09-14 批次 25：成员流动台账（流入/流出复式记账）持久化
      memberFlows: mockDB.memberFlows,
      // 2026-09-02 党委后台 P1：支部实例持久化（含 config 配置档案）
      branches: mockDB.branches,
      // 2026-09-02 党委后台 P2：支书任期记录持久化
      appointmentRecords: mockDB.appointmentRecords,
      // 2026-09-02 党委后台 P3：支部上报审批持久化
      reviewRequests: mockDB.reviewRequests,
    }));
  } catch (e) {
    console.warn('[MockAdapter] saveDB 失败：', e);
  }
}

// ════════════════════════════════════════════════════════════════
//  ?reset 分层重置（立项⑤ 阶段B，2026-09-06）
//  浏览器演示场景 URL 参数分两档（?reset=1 为 demo 档历史别名，向后兼容）：
//    · demo    = 全回演示种子：清除本域全部演示存储键（workflowos_*/gsm1921-*/sop_org_os_* 前缀 +
//                LEGACY_STORAGE_KEYS 历史遗留键），随后整页导航；下次 loadDB 无持久化数据即回种子初始态
//                （_loadFromStorage → _seedInitialData）。—— 现状 ?reset=1 行为不变。
//    · preview = 仅清运行时 overlay/预览键（成员基础数据预览 gsm1921-base-data-preview + 换组织向导草稿
//                wizard-draft-*），不动演示数据本体——等价于「清除预览/清空草稿」的 URL 入口
//                （看效果后想回干净界面再续走，无需重置演示数据）。
//  两档共用执行边界：仅无 API token 时执行；token 存在（sessionStorage['gsm1921-api-token']）一律跳过——
//  数据以服务器为权威（不清 sessionStorage 登录会话、不清服务器远端数据；服务端「重置」= 重建 DB 或走管理端，
//  见 README 快速开始 reset 说明）。
// ════════════════════════════════════════════════════════════════

/** 演示数据本体存储键前缀（demo 档与 SANDBOX_MODE 每刷清理同源口径） */
const DEMO_PREFIX_KEYS = ['workflowos_', 'gsm1921-', 'sop_org_os_'];

/** preview 档精确匹配的运行时 overlay/预览键（非 mockDB 持久化键）：
 *  - gsm1921-base-data-preview：成员基础数据预览（org-base-data-preview.js PREVIEW_KEY） */
const PREVIEW_EXACT_KEYS = ['gsm1921-base-data-preview'];
/** preview 档按前缀匹配的运行时键：换组织向导草稿（org-setup-wizard.js DRAFT_PREFIX='wizard-draft-'，按支部分键） */
const PREVIEW_PREFIX_KEYS = ['wizard-draft-'];

/**
 * 解析 ?reset 档位（纯函数，供单测与执行共用）：
 * @param {string|null} resetValue URL 参数 reset 的值
 * @returns {'demo'|'preview'|null} null=无重置请求（未知值不动作，防误触）
 */
export function resolveResetTier(resetValue) {
  if (resetValue === '1' || resetValue === 'demo') return 'demo'; // ?reset=1 = demo 档历史别名（向后兼容）
  if (resetValue === 'preview') return 'preview';
  return null;
}

/**
 * 收集某档位应移除的存储键（纯函数，供单测与执行共用）：
 * demo 档 = 演示数据前缀键（含 gsm1921-base-data-preview 等 gsm1921-* 运行时键，同前缀）+ 历史遗留键
 *           （遗留键不依赖存在性——removeItem 幂等，保持原 ?reset=1 键集合口径）；
 * preview 档 = 仅运行时 overlay/预览键，逐键精确匹配，不动演示数据本体。
 * @param {'demo'|'preview'} tier resolveResetTier 输出
 * @param {string[]} [presentKeys] 当前存储的全部键
 * @returns {string[]} 待移除键清单（去重）
 */
export function collectResetKeys(tier, presentKeys = []) {
  if (tier === 'demo') {
    const keys = new Set(presentKeys.filter(k => DEMO_PREFIX_KEYS.some(p => k.startsWith(p))));
    LEGACY_STORAGE_KEYS.forEach(k => keys.add(k));
    return [...keys];
  }
  if (tier === 'preview') {
    return presentKeys.filter(k => PREVIEW_EXACT_KEYS.includes(k) || PREVIEW_PREFIX_KEYS.some(p => k.startsWith(p)));
  }
  return [];
}

/**
 * URL ?reset 分层重置执行（P4a + 立项⑤ 阶段B）：
 * 访问带 reset 档位参数的 URL 时，按档位清除对应存储键（见 resolveResetTier/collectResetKeys），
 * 随后去掉 URL 上的 reset 参数整页导航（replace），新页面不再触发（防重复刷新）、恢复正常加载。
 *
 * 边界（不破坏正常加载与 API 模式，复核 2026-09-06）：
 * - 仅在无 API token（sessionStorage['gsm1921-api-token'] 不存在）的纯演示/本地 mock 场景执行；
 *   API 模式数据以服务器为权威，两档均跳过——不清 sessionStorage 登录会话与远端数据。
 * - 所有存储访问均包 try-catch：隐私模式/存储不可用时跳过，不影响正常加载。
 * @returns {boolean} true=已执行重置并触发导航（调用方应中止本次加载）
 */
export function handleResetIfRequested() {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gsm1921-api-token')) return false;
    const params = new URLSearchParams(window.location.search);
    const tier = resolveResetTier(params.get('reset'));
    if (!tier) return false;
    const presentKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) presentKeys.push(k);
    }
    const removeKeys = collectResetKeys(tier, presentKeys);
    removeKeys.forEach(k => localStorage.removeItem(k));
    if (tier === 'demo') {
      console.info(`[MockAdapter] ?reset=1/demo 已清除演示存储键 ${removeKeys.length} 个，正在回到种子初始态`);
    } else {
      console.info(`[MockAdapter] ?reset=preview 已清除运行时 overlay/预览键 ${removeKeys.length} 个（向导草稿/成员预览），演示数据未动，正在刷新`);
    }
    // 去掉 URL 上的 reset 参数再导航，防止新页面再次触发清空（造成重复刷新）
    const url = new URL(window.location.href);
    url.searchParams.delete('reset');
    window.location.replace(url.toString());
    return true;
  } catch (e) {
    console.warn('[MockAdapter] ?reset 重置失败（已跳过，不影响正常加载）：', e);
    return false;
  }
}

function _loadFromStorage() {
  if (SANDBOX_MODE) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('workflowos_notices_v1');
    localStorage.removeItem('workflowos_taskforces_v1');
    LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
      // 2026-10-21 批次 499：种子活动先补齐组织落点（与服务端 seed 同一函数）。
      mockDB.activities = normalizeSeedActivityOrganizing(ACTIVITIES).map(a => ({
        ...a,
        visibility: a.visibility || 'branch',
        // R2-12：装载不得伪造操作人；缺失保持 null（读侧显示「—」）。
        // R2-13（2026-10-20）：不再给活动写 executor/supervisor——前者恒等于 organizer（写而不读，
        //   读侧还把 personId 当角色键查色板），后者恒 null；两者只会被删除守卫误当人员引用。
        createdBy: a.createdBy || a.organizer || null,
        createdAt: a.createdAt || a.date || new Date().toISOString(),
      }));
    }
    if (mockDB.tasks.length === 0) mockDB.tasks = [...SEED_TASKS];
    if (mockDB.assignments.length === 0) mockDB.assignments = [...SEED_ASSIGNMENTS];
    return;
  }
  /* 持久化恢复逻辑（SANDBOX_MODE=false 时生效） */
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    // 修复（T174）：localStorage 无数据或数据被污染（核心业务数组为空）时，
    // 回退加载初始 seed 数据，避免首页三个板块显示"暂无数据"。
    if (!raw) {
      syncDemoSeedSet();
      return;
    }
    const parsed = JSON.parse(raw);
    // 「旧本地演示数据自动失效」（种子版本判据）：本地库的种子版本与本机种子基线不一致（含缺失）
    //   ⇒ 老访客（尤其被宣传链接吸引而来的）手里的旧版本演示数据整体作废，**丢弃整库并按最新种子重建**，
    //   从而根除「旧的测试数据/缓存」。详见 domain.js::SEED_DATA_VERSION（改种子内容后须随之改版本）。
    //   注意：必须在恢复各域**之前**返回——否则旧数据会先被灌进 mockDB；return true 让 loadDB 落盘新种子。
    if (parsed._seedVersion !== SEED_DATA_VERSION) {
      console.info('[MockAdapter] 本地数据种子版本过旧（' + parsed._seedVersion + ' → ' + SEED_DATA_VERSION + '），已丢弃并按最新种子重建');
      localStorage.removeItem(STORAGE_KEY);
      syncDemoSeedSet();
      return true;
    }
    // 持久化结构版本不匹配（SCHEMA_VERSION 变更，结构不可兼容）：同样整库丢弃回种子。
    //   原实现仅 `console.warn` 后 return（中止恢复、页面可能空态）——此处顺带修掉：
    //   改为丢弃 + 回种子重建（return true 让 loadDB 落盘），不再产生空页。
    if (parsed._schema == null || parsed._schema !== SCHEMA_VERSION) {
      console.warn('[MockAdapter] _schema 版本不匹配（' + parsed._schema + ' → ' + SCHEMA_VERSION + '），已丢弃本地库并回种子重建');
      localStorage.removeItem(STORAGE_KEY);
      syncDemoSeedSet();
      return true;
    }
    if (Array.isArray(parsed.activities))   mockDB.activities   = parsed.activities;
    if (Array.isArray(parsed.tasks))        mockDB.tasks        = parsed.tasks;
    if (Array.isArray(parsed.attendances))  mockDB.attendances  = parsed.attendances;
    if (Array.isArray(parsed.inspections))  mockDB.inspections  = parsed.inspections;
    if (Array.isArray(parsed.assignments))  mockDB.assignments  = parsed.assignments;
    if (Array.isArray(parsed.makeupTasks))  mockDB.makeupTasks  = parsed.makeupTasks;
    if (parsed.actSubRecords && typeof parsed.actSubRecords === 'object') mockDB.actSubRecords = parsed.actSubRecords;
    if (parsed.tfSubRecords && typeof parsed.tfSubRecords === 'object')   mockDB.tfSubRecords  = parsed.tfSubRecords;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    if (Array.isArray(parsed.imageRecords))         mockDB.imageRecords         = parsed.imageRecords;
    if (Array.isArray(parsed.taskforces))  mockDB.taskforces  = parsed.taskforces;
    for (const key of ['workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs', 'attendanceRosters']) {
      if (Array.isArray(parsed[key])) mockDB[key] = parsed[key];
    }
    if (Array.isArray(parsed.notices))     mockDB.notices     = parsed.notices;
    if (Array.isArray(parsed.todos))       mockDB.todos       = parsed.todos;
    if (Array.isArray(parsed.signups))     mockDB.signups     = parsed.signups;
    // 2026-08-05 假操作修复：复盘/宣传域恢复（刷新不再丢失）
    if (Array.isArray(parsed.activityReviews))  mockDB.activityReviews  = parsed.activityReviews;
    if (Array.isArray(parsed.taskforceReviews)) mockDB.taskforceReviews = parsed.taskforceReviews;
    if (Array.isArray(parsed.propTasks))     mockDB.propTasks     = parsed.propTasks;
    if (Array.isArray(parsed.periodicArchives)) mockDB.periodicArchives = parsed.periodicArchives;
    else if (Array.isArray(parsed.weeklyReports)) mockDB.periodicArchives = parsed.weeklyReports;
    if (Array.isArray(parsed.archiveRecords)) mockDB.archiveRecords = parsed.archiveRecords;
    if (Array.isArray(parsed.externalDispatches)) mockDB.externalDispatches = parsed.externalDispatches;
    if (Array.isArray(parsed.branchDocs)) mockDB.branchDocs = parsed.branchDocs;
    if (Array.isArray(parsed.memberChangeRequests)) mockDB.memberChangeRequests = parsed.memberChangeRequests;
    if (Array.isArray(parsed.committeeBroadcasts)) mockDB.committeeBroadcasts = parsed.committeeBroadcasts;
    if (Array.isArray(parsed.agendaVotes)) mockDB.agendaVotes = parsed.agendaVotes;
    if (Array.isArray(parsed.handoffs)) mockDB.handoffs = parsed.handoffs;
    if (Array.isArray(parsed.thoughtReports)) mockDB.thoughtReports = parsed.thoughtReports;
    // 2026-09-14 批次 25：党小组一等实体（支书特批）
    if (Array.isArray(parsed.partyGroups)) mockDB.partyGroups = parsed.partyGroups;
    // 2026-09-14 批次 25：成员流动台账持久化恢复
    if (Array.isArray(parsed.memberFlows)) mockDB.memberFlows = parsed.memberFlows;
    if (Array.isArray(parsed.branches)) mockDB.branches = parsed.branches;
    if (Array.isArray(parsed.appointmentRecords)) mockDB.appointmentRecords = parsed.appointmentRecords;
    // 2026-09-02 党委后台 P3：支部上报审批持久化恢复
    if (Array.isArray(parsed.reviewRequests)) mockDB.reviewRequests = parsed.reviewRequests;

    // 修复（T174）：恢复后若核心数据仍为空（脏数据保护拒绝 + 数组为空并存），
    // 补齐 seed 数据，防止页面空态。
    if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
      _seedInitialData();
    }

    // Seed 增量合并（2026-08-05）→ B-499-8：正常加载**只修既有 seed id**（不补缺、不删旧）；
    // 演示库重建（?reset=demo / 首次无持久化 / 版本过期）才走 syncDemoSeedSet 的全量同步。
    return repairExistingSeedRows();
  } catch (e) {
    // 修复（T175）：不再静默吞掉 seed/解析错误——透出真实原因（与 services/core/mock.js 对齐）
    console.error('[MockAdapter] loadDB 失败（JSON 解析或 seed 错误）：', e);
    return false;
  }
}

/** 加载初始 seed 数据到 mockDB（仅当对应字段为空时） */
function _seedInitialData() {
  // B-499-8：init 态（?reset=init 已完成）不得回种子——空业务态是合法稳态。
  if (isInitStateActive()) return;
  if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
    // 2026-10-21 批次 499：与服务端 seed 同一归一口径。
    mockDB.activities = normalizeSeedActivityOrganizing(ACTIVITIES).map(a => ({
      ...a,
      visibility: a.visibility || 'branch',
      // R2-12：seed 装载不伪造操作人；缺失保持 null。
      // R2-13：活动模型不再写入 executor/supervisor（理由见上一处装载注释）。
      createdBy: a.createdBy || a.organizer || null,
      createdAt: a.createdAt || a.date || new Date().toISOString(),
    }));
  }
  if (mockDB.taskforces.length === 0 && MOCK_TASKFORCES.length > 0) {
    mockDB.taskforces = MOCK_TASKFORCES.map((record) => ({ ...record }));
  }
  if (mockDB.tasks.length === 0) mockDB.tasks = [...SEED_TASKS];
  if (mockDB.assignments.length === 0) mockDB.assignments = [...SEED_ASSIGNMENTS];
  if (mockDB.archiveRecords.length === 0) mockDB.archiveRecords = [...SEED_ARCHIVE_RECORDS];
  if (mockDB.signups.length === 0) mockDB.signups = [...SEED_SIGNUPS];
  // 批次 47-P（2026-09-16，支书「允许改种子」裁定）：支部上报审批种子。
  // 与 server/seed.js 同源（都读 data/mock/seed.js::SEED_REVIEW_REQUESTS）⇒ mock/api 两形态一致；
  // 否则「党委台驳回」在 mock 态可达、api 态仍空态 ⇒ 守卫绿而支书点不到（典型的假绿）。
  if (mockDB.reviewRequests.length === 0) mockDB.reviewRequests = SEED_REVIEW_REQUESTS.map(r => ({ ...r }));
  // 批次 47-Y（2026-09-16，承 R-78 口径）：补课任务种子。
  // 与 server/seed.js 同源（都读 data/mock/seed.js::SEED_MAKEUP_TASKS）⇒ mock/api 两形态一致；
  // 补它的直接动因：成员台「考勤概况 · 去补课」入口只在「本人 pending 补课任务」存在时渲染，
  //   而该表原无种子 ⇒ 两形态首启皆空 ⇒ 判据结构性不可达（批 47-X 真机实测入口计数 0）。
  if (mockDB.makeupTasks.length === 0) mockDB.makeupTasks = SEED_MAKEUP_TASKS.map(t => ({ ...t }));
  // R10（2026-10-23，C14）：仅服务端种子的 8 个集合已收进 `mock/auxiliary.js` 单一源。
  //   mock 有持久化键的三类首启同源补齐；其余五类（memberConfirmations / attendanceAppeals /
  //   inspectionAppeals / issueUnread / authAudit）在 mock 端由服务自管 localStorage 或仅语义端点承载，
  //   无 mockDB 持久化键 ⇒ manifest 标 `form:'api-only'`，此处不造「种了却读不到」的假数据。
  if (mockDB.externalDispatches.length === 0) mockDB.externalDispatches = AUX_SEED.SEED_EXTERNAL_DISPATCHES.map((row) => ({ ...row }));
  if (mockDB.handoffs.length === 0) mockDB.handoffs = AUX_SEED.SEED_HANDOFFS.map((row) => ({ ...row }));
  if (mockDB.appointmentRecords.length === 0) mockDB.appointmentRecords = AUX_SEED.SEED_APPOINTMENT_RECORDS.map((row) => ({ ...row }));
  // P1 党委后台（2026-09-02）：支部多实例首启 seed（老用户无 branches 时补齐 br-b1）
  if (mockDB.branches.length === 0) mockDB.branches = BRANCHES.map(b => ({ ...b }));
  ensureLegacySourceWorkgroups(mockDB);
  ensureDemoWorkgroupGrants(mockDB);
  _migrateInspectionKeys();
  _migrateReviewKeys();
  console.info('[MockAdapter] 已加载初始 seed 数据');
}

/**
 * 历史考察记录回填稳定父键（R4-D04）：mock hydrate 与服务端启动迁移同源（纯函数）。
 * 只改 JSON 行内字段，不动表结构；无记录时跳过（避免每次启动都打一行 0 读数）。
 */
function _migrateInspectionKeys() {
  if (!Array.isArray(mockDB.inspections) || mockDB.inspections.length === 0) return false;
  const result = migrateInspectionWorkgroupKeys({
    records: mockDB.inspections,
    workgroups: mockDB.workgroups,
    taskforces: mockDB.taskforces,
  });
  const changed = JSON.stringify(result.rows) !== JSON.stringify(mockDB.inspections);
  mockDB.inspections = result.rows;
  return changed;
}

/**
 * 历史复盘补稳定父键（P1-05/M1-M2）：与考察回填同一纯函数模式，mock hydrate 与服务端 v6 同源。
 * 只改 JSON 行内字段，不动表结构；无记录时跳过（避免每次启动都打一行 0 读数）。
 */
function _migrateReviewKeys() {
  const activityReviews = Array.isArray(mockDB.activityReviews) ? mockDB.activityReviews : [];
  const taskforceReviews = Array.isArray(mockDB.taskforceReviews) ? mockDB.taskforceReviews : [];
  if (activityReviews.length === 0 && taskforceReviews.length === 0) return false;
  const result = migrateReviewParentKeys({
    activityReviews,
    taskforceReviews,
    activities: mockDB.activities,
    workgroups: mockDB.workgroups,
    taskforces: mockDB.taskforces,
  });
  const changed = JSON.stringify(result.activityReviews) !== JSON.stringify(activityReviews)
    || JSON.stringify(result.taskforceReviews) !== JSON.stringify(taskforceReviews);
  mockDB.activityReviews = result.activityReviews;
  mockDB.taskforceReviews = result.taskforceReviews;
  return changed;
}

let _legacyPersonWarned = false;
function _warnLegacyPersonOnce() {
  if (_legacyPersonWarned) return;
  _legacyPersonWarned = true;
  console.warn('[MockAdapter] 检测到旧 p* 人员 id（仅迁移期兼容），已改存学号');
}

/**
 * 历史 localStorage / 已存演示库的人员主键迁移（p* → 学号）。
 * · 只换**整值**旧 id 与 `id` 里的复合串（`p11:issue-002` / `wgg-…-p5`），备注等自由文本不动；
 * · 未知旧 id 保留原值并告警（不静默改坏数据）；
 * · 登录键与 `gsm1921-accounts` 的同批迁移，避免旧会话/旧账号继续产生 p*。
 */
function _migrateLegacyPersonIds() {
  // 对象键里的人员 id（历史 `agenda[].personStages` 形如 `{p6:'发展对象'}`）
  const KEYED_PERSON_MAPS = new Set(['personStages']);
  // 数字型人员 id（历史 `audiencePersons: 17` / `reads: [13]`）
  const NUMERIC_PERSON_ARRAYS = new Set(['audiencePersons', 'reads', 'voterIds', 'personIds', 'assigneeIds', 'actionPersonIds']);
  const mapValue = (value, key) => {
    if (typeof value === 'number') {
      if (!NUMERIC_PERSON_ARRAYS.has(key) || !Number.isInteger(value)) return value;
      const next = mapPersonId(`p${value}`);
      if (next == null || /^p\d+$/.test(next)) { console.warn('[MockAdapter] 无法映射的数字人员 id：', value); return value; }
      _warnLegacyPersonOnce();
      return next;
    }
    if (typeof value === 'string') {
      if (isLegacyPersonId(value)) {
        const next = mapPersonId(value);
        if (next == null) { console.warn('[MockAdapter] 无法映射的旧人员 id：', value); return value; }
        _warnLegacyPersonOnce();
        return next;
      }
      if (key === 'id') {
        const next = mapLegacyIdInString(value);
        if (next == null) { console.warn('[MockAdapter] 无法映射的复合 id：', value); return value; }
        if (next !== value) _warnLegacyPersonOnce();
        return next;
      }
      return value;
    }
    if (Array.isArray(value)) {
      let changed = false;
      const out = value.map((item) => {
        const next = mapValue(item, key);
        if (next !== item) changed = true;
        return next;
      });
      return changed ? out : value;
    }
    if (value && typeof value === 'object') {
      let changed = false;
      const out = {};
      for (const [childKey, item] of Object.entries(value)) {
        const outKey = KEYED_PERSON_MAPS.has(key) ? (mapPersonId(childKey) ?? childKey) : childKey;
        if (outKey !== childKey) { _warnLegacyPersonOnce(); changed = true; }
        out[outKey] = mapValue(item, childKey);
        if (out[outKey] !== item) changed = true;
      }
      return changed ? out : value;
    }
    return value;
  };

  let changed = false;
  for (const key of Object.keys(mockDB)) {
    if (key.startsWith('_')) continue;
    const before = mockDB[key];
    const after = mapValue(before, key);
    if (after !== before) { mockDB[key] = after; changed = true; }
  }

  try {
    const REMAP_JSON_KEYS = [
      'gsm1921-members-overlay', 'gsm1921-attendance-appeals', 'gsm1921-inspection-appeals',
      'gsm1921-member-confirmations', 'sop_org_os_auth_audit', 'gsm1921-issue-cache-v3',
      'gsm1921-issue-cache', 'gsm1921-issue-drafts',
    ];
    const remapStoredJson = (storage, key) => {
      if (!storage) return false;
      const raw = storage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const next = mapValue(parsed, key);
      if (next === parsed) return false;
      storage.setItem(key, JSON.stringify(next));
      _warnLegacyPersonOnce();
      return true;
    };
    const rawLogin = localStorage.getItem('gsm1921-login-user');
    if (rawLogin) {
      const login = JSON.parse(rawLogin);
      const next = mapValue(login, 'login-user');
      if (next !== login) {
        localStorage.setItem('gsm1921-login-user', JSON.stringify(next));
        _warnLegacyPersonOnce();
        changed = true;
      }
    }
    // 本标签页登录会话快照（sessionStorage；换标签后回退旧 p* 的另一源头）
    if (typeof sessionStorage !== 'undefined') {
      const rawSnap = sessionStorage.getItem('gsm1921-session-snap');
      if (rawSnap) {
        const snap = JSON.parse(rawSnap);
        const next = mapValue(snap, 'session-snap');
        if (next !== snap) {
          sessionStorage.setItem('gsm1921-session-snap', JSON.stringify(next));
          _warnLegacyPersonOnce();
          changed = true;
        }
      }
    }
    const rawAccounts = localStorage.getItem('gsm1921-accounts');
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts);
      const next = mapValue(parsed, 'accounts');
      if (next !== parsed) {
        localStorage.setItem('gsm1921-accounts', JSON.stringify(next));
        _warnLegacyPersonOnce();
        changed = true;
      }
    }
    // 整库与按人键空间：偏好键 / 逐人未读键 / 申诉·确认·审计·反馈缓存
    for (const key of REMAP_JSON_KEYS) {
      if (remapStoredJson(localStorage, key)) changed = true;
    }
    const PREF_PREFIX = 'gsm1921-pref-';
    const UNREAD_PREFIX = 'gsm1921-issue-unread-';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(PREF_PREFIX)) {
        const rest = key.slice(PREF_PREFIX.length);
        const dash = rest.indexOf('-');
        if (dash <= 0) continue;
        const pid = rest.slice(0, dash);
        const next = mapPersonId(pid);
        if (!next || next === pid) continue;
        localStorage.setItem(`${PREF_PREFIX}${next}${rest.slice(dash)}`, localStorage.getItem(key) || '');
        localStorage.removeItem(key);
        _warnLegacyPersonOnce();
        changed = true;
        continue;
      }
      if (key.startsWith(UNREAD_PREFIX)) {
        const pid = key.slice(UNREAD_PREFIX.length);
        const next = mapPersonId(pid);
        if (!next || next === pid) continue;
        localStorage.setItem(`${UNREAD_PREFIX}${next}`, localStorage.getItem(key) || '');
        localStorage.removeItem(key);
        _warnLegacyPersonOnce();
        changed = true;
      }
    }
  } catch { /* localStorage 不可用 / 损坏：不影响正常加载 */ }

  return changed;
}

/**
 * Seed 种子同步（2026-08-05 二次修订）：
 * 持久化恢复为「全量替换」，老用户 localStorage 中不会出现后续变更的 mock 种子。
 * 本函数对种子记录（id 匹配种子模式）执行三步同步：
 *   1. 已移除的种子（如 act-28 / notice-109）→ 删除
 *   2. 内容已变更的种子（如 act-26 日期 8/7→8/1）→ 以当前种子覆盖
 *   3. 缺失的新种子（如 8 月考勤全覆盖）→ 补齐
 * 保留用户字段：notices.reads（逐人已读）、attendances.recordedBy（纪检确认人）；
 * 非种子记录（用户创建：act_*、att_*、notice-{13位时间戳}）原样保留。
 * @returns {boolean} 是否有变更（有则调用方需落盘）
 */
function _syncDemoSeedRows() {
  let changed = false;

  // ── 活动：种子同步 ──────────────────────────────────────────
  const normalizedSeedActivities = normalizeSeedActivityOrganizing(ACTIVITIES);
  const actSeedById = new Map(normalizedSeedActivities.map(a => [a.id, a]));
  const actOut = [];
  for (const a of mockDB.activities) {
    if (!/^act-\d+$/.test(a.id)) { actOut.push(a); continue; }
    const seed = actSeedById.get(a.id);
    if (!seed) { changed = true; continue; } // 种子已移除 → 删除
    const merged = {
      ...seed,
      // 2026-08-08 归档闭环：保留用户运行时归档状态（seed 无 archived，直接覆盖会丢归档）
      archived: a.archived ?? seed.archived,
      visibility: seed.visibility || 'branch',
      // R2-12：种子合并保留真实 createdBy，绝不回落到伪用户 u_exec。
      // R2-13：executor/supervisor 已从活动模型下线，合并时不再生成（历史库里的旧字段随本次合并自然消失）。
      createdBy: a.createdBy || seed.createdBy || seed.organizer || null,
      createdAt: seed.date || a.createdAt,
    };
    if (JSON.stringify(merged) !== JSON.stringify(a)) changed = true;
    actOut.push(merged);
  }
  const actExist = new Set(actOut.map(a => a.id));
  normalizedSeedActivities.forEach(a => {
    if (actExist.has(a.id)) return;
    actOut.push({ ...a, visibility: a.visibility || 'branch', createdBy: a.createdBy || a.organizer || null, createdAt: a.createdAt || a.date || new Date().toISOString() });
    changed = true;
  });
  mockDB.activities = actOut;

  // ── 专班：保留已有运行状态，只补齐缺失的演示种子 ─────────────
  const taskforceIds = new Set(mockDB.taskforces.map((row) => String(row.id)));
  MOCK_TASKFORCES.forEach((record) => {
    if (taskforceIds.has(String(record.id))) return;
    mockDB.taskforces.push({ ...record });
    taskforceIds.add(String(record.id));
    changed = true;
  });

  // ── 考勤：种子同步（覆盖时保留 recordedBy 纪检确认人） ────────
  const attSeedById = new Map(ATTENDANCE_RECORDS.map(r => [r.id, r]));
  const attOut = [];
  for (const r of mockDB.attendances) {
    if (!/^att\d+$/.test(r.id)) { attOut.push(r); continue; }
    const seed = attSeedById.get(r.id);
    if (!seed) { changed = true; continue; }
    // 2026-08-07 T232：保留 recordedBy（历史确认人）+ secretaryConfirmedAt（支书复核标记）
    // 2026-10-22：确认动作改落 confirmedBy/confirmedAt，种子同步一并保留，刷新后不回退。
    const merged = {
      ...seed,
      recordedBy: r.recordedBy || seed.recordedBy,
      secretaryConfirmedAt: r.secretaryConfirmedAt,
      ...(r.confirmed !== undefined ? { confirmed: r.confirmed } : {}),
      ...(r.confirmedBy ? { confirmedBy: r.confirmedBy } : {}),
      ...(r.confirmedAt ? { confirmedAt: r.confirmedAt } : {}),
    };
    if (JSON.stringify(merged) !== JSON.stringify(r)) changed = true;
    attOut.push(merged);
  }
  const attExist = new Set(attOut.map(r => r.id));
  ATTENDANCE_RECORDS.forEach(s => {
    if (!attExist.has(s.id)) { attOut.push(s); changed = true; }
  });
  mockDB.attendances = attOut;

  // ── 通知：种子同步（覆盖时保留逐人已读 reads） ────────────────
  const noticeSeedById = new Map(MOCK_NOTICES.map(n => [n.id, n]));
  const noticeOut = [];
  for (const n of mockDB.notices) {
    if (!/^notice-\d{3}$/.test(n.id)) { noticeOut.push(n); continue; }
    const seed = noticeSeedById.get(n.id);
    if (!seed) { changed = true; continue; }
    // 2026-08-08 归档闭环：保留 archived（归档标记），seed 仅兜底缺失值。
    // R2-49：已读是逐人事实 reads；旧全局 read 若仍在（老缓存/服务端旧行），先原样带到内存，
    //   由 services/governance/notice.js::init 一次性回填当前登录人后删除。
    const merged = {
      ...seed,
      reads: Array.isArray(n.reads) ? n.reads : [],
      archived: n.archived ?? seed.archived,
    };
    // 种子里的旧 read 字段不得再写回（否则每次启动都会把全局布尔带回共享行）
    delete merged.read;
    if (!Array.isArray(n.reads) && n.read === true) merged.read = true;
    if (JSON.stringify(merged) !== JSON.stringify(n)) changed = true;
    noticeOut.push(merged);
  }
  const noticeExist = new Set(noticeOut.map(n => n.id));
  MOCK_NOTICES.forEach(s => {
    if (!noticeExist.has(s.id)) { noticeOut.push(s); changed = true; }
  });
  mockDB.notices = noticeOut;

  // ── 档案归档：种子同步（覆盖时以当前种子为准，含 activityId 关联键） ──
  const archiveSeedById = new Map(SEED_ARCHIVE_RECORDS.map(r => [r.id, r]));
  const archiveOut = [];
  for (const r of mockDB.archiveRecords) {
    if (!/^ar\d+$/.test(r.id)) { archiveOut.push(r); continue; }
    const seed = archiveSeedById.get(r.id);
    if (!seed) { changed = true; continue; }
    if (JSON.stringify(seed) !== JSON.stringify(r)) changed = true;
    // 2026-08-07 T232：保留用户字段（secretaryConfirmedAt 支书复核标记），种子仅兜底缺失值
    archiveOut.push({ ...seed, ...r });
  }
  const archiveExist = new Set(archiveOut.map(r => r.id));
  SEED_ARCHIVE_RECORDS.forEach(s => {
    if (!archiveExist.has(s.id)) { archiveOut.push({ ...s }); changed = true; }
  });
  mockDB.archiveRecords = archiveOut;

  // ── 报名：种子同步（覆盖时保留审核字段） ─────────────────────
  const signupSeedById = new Map(SEED_SIGNUPS.map(s => [s.id, s]));
  const signupOut = [];
  for (const s of mockDB.signups) {
    if (!/^su-\d{3}$/.test(s.id)) { signupOut.push(s); continue; }
    const seed = signupSeedById.get(s.id);
    if (!seed) { changed = true; continue; }
    const merged = { ...seed, reviewedBy: s.reviewedBy ?? seed.reviewedBy, reviewedAt: s.reviewedAt ?? seed.reviewedAt };
    if (JSON.stringify(merged) !== JSON.stringify(s)) changed = true;
    signupOut.push(merged);
  }
  const signupExist = new Set(signupOut.map(s => s.id));
  SEED_SIGNUPS.forEach(seed => {
    if (!signupExist.has(seed.id)) { signupOut.push({ ...seed }); changed = true; }
  });
  mockDB.signups = signupOut;

  if (ensureLegacySourceWorkgroups(mockDB)) changed = true;
  if (ensureDemoWorkgroupGrants(mockDB)) changed = true;
  if (_migrateInspectionKeys()) changed = true;
  if (_migrateReviewKeys()) changed = true;

  if (changed) console.info('[MockAdapter] Seed 种子同步：活动/专班工作组映射、考勤、通知、档案归档与报名基线对齐');
  return changed;
}

// R10（2026-10-23，C13）：manifest `seedModule` → 本文件可静态引用的种子模块登记。
//   只登记「浏览器侧可同步 import 的纯数据模块」；JSON / 服务层模块不在正常加载时修复。
const MOCK_SEED_MODULES = {
  'docs/src/data/mock/activities.js': { ACTIVITIES },
  'docs/src/data/mock/taskforces.js': { MOCK_TASKFORCES },
  'docs/src/data/mock/seed.js': {
    SEED_TASKS, SEED_ASSIGNMENTS, SEED_SIGNUPS, SEED_MAKEUP_TASKS,
    SEED_REVIEW_REQUESTS, SEED_ARCHIVE_RECORDS,
  },
  'docs/src/data/mock/attendance.js': { ATTENDANCE_RECORDS },
  'docs/src/data/mock/inspection.js': { INSPECTION_RECORDS },
  'docs/src/data/mock/notices.js': { MOCK_NOTICES },
  'docs/src/data/mock/review.js': { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS },
  'docs/src/data/mock/thought-reports.js': { THOUGHT_REPORTS },
  'docs/src/data/mock/prop.js': { PROP_TASKS_SEED, PERIODIC_ARCHIVES_SEED },
  'docs/src/data/mock/party-groups.js': { PARTY_GROUPS },
  'docs/src/data/mock/auxiliary.js': AUX_SEED,
};

/**
 * 工作组种子快照：由**当前**活动/专班派生（而非静态种子），避免活动标题等运行时字段被修复回旧值；
 * 用途仅是让 manifest 的 `workgroups / workgroupMembers / workgroupGrants` 三个集合参与同口径修复。
 */
function _derivedWorkgroupSeed() {
  const seed = {
    activities: (Array.isArray(mockDB.activities) ? mockDB.activities : []).map((row) => ({ ...row })),
    taskforces: (Array.isArray(mockDB.taskforces) ? mockDB.taskforces : []).map((row) => ({ ...row })),
    workgroups: [], workgroupMembers: [], workgroupGrants: [],
  };
  ensureLegacySourceWorkgroups(seed);
  ensureDemoWorkgroupGrants(seed);
  return seed;
}

/**
 * 当前演示种子行（按 mockDB 键索引）——由 `SEED_MANIFEST` 的登记生成（R10 C13）。
 * 只取 `initTier='clear'` 且非 `form:'api-only'`、且本文件有同源静态模块的集合；
 * users / branches 等组织骨架（initTier='keep'）不在正常加载时改写。
 */
function _mockSeedSources() {
  const sources = {};
  for (const entry of SEED_MANIFEST) {
    if (entry.initTier !== 'clear' || entry.form === 'api-only') continue;
    if (entry.collection === 'workgroups' || entry.collection === 'workgroupMembers'
      || entry.collection === 'workgroupGrants') continue;
    const seedRows = MOCK_SEED_MODULES[entry.seedModule]?.[entry.seedExport];
    if (!Array.isArray(seedRows)) continue;
    sources[entry.collection] = entry.collection === 'activities'
      ? normalizeSeedActivitySeedRows(seedRows)
      : seedRows.map((row) => ({ ...row }));
  }
  const derived = _derivedWorkgroupSeed();
  sources.workgroups = derived.workgroups.map((row) => ({ ...row }));
  sources.workgroupMembers = derived.workgroupMembers.map((row) => ({ ...row }));
  sources.workgroupGrants = derived.workgroupGrants.map((row) => ({ ...row }));
  return sources;
}

/**
 * 正常 loadDB 的种子修复（B-499-8 安全模式）：
 * 只更新**既有 seed id 行**的 `seedOwnedFields`；不插入缺失种子、不删除 orphan、保留运行时字段。
 * @returns {boolean} 是否有变更（有则调用方落盘）
 */
function repairExistingSeedRows() {
  let changed = false;
  const sources = _mockSeedSources();
  for (const [collection, seedRows] of Object.entries(sources)) {
    const entry = SEED_MANIFEST_BY_COLLECTION[collection];
    const rows = mockDB[collection];
    if (!entry || !Array.isArray(rows)) continue;
    const plan = planSeedRepair({ rows, seedRows, entry });
    if (plan.updated > 0) {
      mockDB[collection] = plan.rows;
      changed = true;
      console.info(`[MockAdapter] 种子行修复：${collection} 更新 ${plan.updated} 行（运行时字段保留；不补缺、不删旧）`);
    }
  }
  if (ensureLegacySourceWorkgroups(mockDB)) changed = true;
  if (ensureDemoWorkgroupGrants(mockDB)) changed = true;
  if (_migrateInspectionKeys()) changed = true;
  if (_migrateReviewKeys()) changed = true;
  return changed;
}

/**
 * 演示库全量同步（B-499-8）：**仅**在 ?reset=demo、首次无持久化、种子版本过期导致整库重建时调用。
 * 语义＝补缺 + 删旧种子 + 更新既有 seed id；用户自建行与运行时字段仍保留。
 * init 态（?reset=init 已完成）一律不播种。
 * @returns {boolean} 是否有变更
 */
function syncDemoSeedSet() {
  if (isInitStateActive()) return false;
  _seedInitialData();
  let changed = _syncDemoSeedRows();

  // 新种子集补齐（旧 merge 覆盖的活动/专班/考勤/通知/归档/报名之外的业务种子）。
  for (const [collection, seedRows] of Object.entries({
    tasks: SEED_TASKS, assignments: SEED_ASSIGNMENTS, makeupTasks: SEED_MAKEUP_TASKS,
    reviewRequests: SEED_REVIEW_REQUESTS, partyGroups: PARTY_GROUPS,
  })) {
    const entry = SEED_MANIFEST_BY_COLLECTION[collection];
    const rows = mockDB[collection];
    if (!entry || !Array.isArray(rows)) continue;
    const pattern = new RegExp(entry.idPattern);
    const seedById = new Map(seedRows.map((row) => [String(row.id), row]));
    const plan = planSeedRepair({ rows, seedRows, entry });
    const next = plan.rows.filter((row) => !(row && pattern.test(String(row.id)) && !seedById.has(String(row.id))));
    const present = new Set(next.filter(Boolean).map((row) => String(row.id)));
    for (const seedRow of seedRows) {
      if (present.has(String(seedRow.id))) continue;
      next.push(JSON.parse(JSON.stringify(seedRow)));
      present.add(String(seedRow.id));
      changed = true;
    }
    if (JSON.stringify(next) !== JSON.stringify(rows)) {
      mockDB[collection] = next;
      changed = true;
    }
  }
  return changed;
}

/** 包装为带固定延迟的 Promise（模拟网络延迟） */
function _withDelay(fn, delayMs = 600) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try { resolve(fn()); }
      catch (e) { reject(e); }
    }, delayMs);
  });
}

// ════════════════════════════════════════════════════════════════
//  MockAdapter — DataAdapter 接口的 mock 实现
// ════════════════════════════════════════════════════════════════

export const MockAdapter = {
  // ── 全局操作 ──────────────────────────────────────────────

  loadDB() {
    // ?reset 分层重置（P4a + 立项⑤ 阶段B）：URL 带 reset 档位时按档清除存储并整页导航——
    // demo=全回演示种子（?reset=1 为别名）、preview=仅清运行时 overlay/预览键；API 模式（有 token）不执行。
    // 置于 _loadFromStorage 之前（读取即检测），覆盖全部 mock 模式加载路径。
    if (handleResetIfRequested()) return;
    let merged = _loadFromStorage();
    // 2026-10-20：历史演示库 / 登录键里的 p* 人员 id 改存学号（迁移期兼容）
    if (_migrateLegacyPersonIds()) merged = true;
    // 持久化守卫解锁：无论恢复成功与否，加载流程已结束，后续写入允许
    mockDB._loaded = true;
    // R9 Task 4.4：mock 形态工作组的任务 / 产出就在本地缓存，无需网络装载 ⇒ 直接标记已装载
    //   （首页据此把「无任务」与「加载中」区分开）。
    mockDB.workgroupAuxLoaded = { tasks: true, outputs: true };
    // 需要落盘的情形（return 真值即落盘）：① Seed 增量合并产生的缺省记录；
    //   ② 「旧本地演示数据自动失效」——本地库种子版本过旧/结构版本不匹配时，_loadFromStorage 已丢弃整库
    //      并回新种子（返回 true），此处落盘使新种子写入 localStorage，老访客下次加载不再重复作废。
    if (merged) _saveToStorage();
    // 数据加载完成广播：通知 header 角标等初始快照据实刷新（与 data-loader 的
    // notifyDataLoaded 双保险；此处覆盖 data-adapter.init() mock 分支等直连路径）
    import('./data-adapter.js?v=20261024b').then(({ notifyDataLoaded }) => notifyDataLoaded())
      .catch(() => {});
  },

  saveDB() {
    _saveToStorage();
  },

  // ── 资源分组接口 ──────────────────────────────────────────

  activities: {
    list(params = {}) {
      return _withDelay(() => _filterByBranch([...mockDB.activities], 'activities', params));
    },

    create(data) {
      return _withDelay(() => {
        // R2-12 写口纪律：创建人取调用方传入的当前登录人（多数写链以 organizer 承载同一人）；
        // 两者都缺失才拒绝，绝不写伪用户。
        const createdBy = data.createdBy || data.organizer || null;
        if (!createdBy) throw new Error('登录状态已失效，请重新登录后再创建活动');
        // 2026-10-21 批次 499：与 server activityCreationDeny / validAssignments 同口径。
        if (!isBranchLevelActivity(data) && !data.hostGroupId) {
          throw Object.assign(new Error('活动必须指定本支部的责任党小组'), { type: 'ValidationError' });
        }
        // 2026-10-21 批次 502：组织落点只有两档；旧 cross-group 入参归一为 party-group。
        const organizingScope = normalizeOrganizingScope(data.organizingScope, data);
        const hostGroup = data.hostGroupId
          ? (_rowById(mockDB.partyGroups, data.hostGroupId) || null) : null;
        const organizerIds = [
          ...(data.organizer ? [String(data.organizer)] : []),
          ...(Array.isArray(data.assignments) ? data.assignments : [])
            .filter((member) => member?.role === 'organizer' && member.personId)
            .map((member) => String(member.personId)),
        ];
        const organizerCrossGroup = !!hostGroup && !String(data.organizerExceptionReason || '').trim()
          && organizerIds.some((personId) => {
            const person = _rowById(mockDB.users, personId) || _rowById(PEOPLE, personId);
            return !!person?.partyGroup && person.partyGroup !== hostGroup.name;
          });
        if (organizerCrossGroup) {
          throw Object.assign(new Error('组织者一般由承办党小组承担；请填写组织者跨组说明'), { type: 'ValidationError' });
        }
        const normalizedAssignments = (Array.isArray(data.assignments) ? data.assignments : []).map((member) => {
          const person = _rowById(mockDB.users, member.personId) || _rowById(PEOPLE, member.personId);
          const cross = !!hostGroup && member.role === 'deep'
            && !!person?.partyGroup && person.partyGroup !== hostGroup.name;
          if (cross && (data.recruitmentScope !== 'cross-group' || !data.crossGroupCoordinatorId)) {
            throw Object.assign(new Error('跨党小组深度参与者须先由组织委员协调（标记跨组招募并指定协调人）'), { type: 'PermissionError' });
          }
          return cross ? { ...member, crossGroup: true, coordinatedBy: data.crossGroupCoordinatorId } : member;
        });
        const id = generateId('act');
        const workgroupId = workgroupIdFor('activity', id);
        const newItem = {
          ...data,
          organizingScope,
          ...(organizingScope === 'branch' ? { hostGroupId: null, hostGroup: '' } : {}),
          assignments: normalizedAssignments,
          id,
          workgroupId,
          status: data.status || 'draft',
          visibility: data.visibility || 'group',
          date: data.date || (data.targetDate ? data.targetDate.slice(0, 10) : todayLocal()),
          createdBy,
          createdAt: new Date().toISOString(),
        };
        const branchId = newItem.branchId || DEFAULT_BRANCH_ID;
        // R9 Task 4.3：建组字段与编辑 / 归档同源（applyActivityWorkgroupSync 单一投影）。
        const createdGroups = applyActivityWorkgroupSync(mockDB.workgroups, { ...newItem, branchId }, {
          actorId: newItem.createdBy, at: newItem.createdAt, create: true,
        });
        mockDB.workgroups = createdGroups;
        mockDB.workgroupMembers = [...mockDB.workgroupMembers, ...(Array.isArray(newItem.assignments) ? newItem.assignments : []).map((member) => ({
          id: `wgm-${encodeURIComponent(workgroupId)}-${encodeURIComponent(String(member.personId))}`,
          branchId, workgroupId, personId: String(member.personId), role: member.role || 'participant',
          status: 'active', createdBy: newItem.createdBy, createdAt: newItem.createdAt,
          ...(member.crossGroup ? { crossGroup: true, coordinatedBy: member.coordinatedBy || newItem.crossGroupCoordinatorId || null } : {}),
        }))];
        mockDB.activities = [...mockDB.activities, newItem];
        _saveToStorage();
        // 派生赋权待办（dynamic import 避免循环依赖）
        // 联动赋权（`R-29⑤` · `D-804` 批次 425）：**收件人取该模块主责**——把本支部**分工快照**一并传进去；
        //   `branch.js` 亦走动态 import（本文件属数据层，静态引 services 层有成环风险）。
        Promise.all([
          import('../services/governance/todo.js?v=20261024b'),
          import('../services/branch/branch.js?v=20261024b'),
        ]).then(([{ LifecycleTodoDeriver }, branch]) => {
          const snapshot = branch.getBranchWorkforce(branch.getBranchIdOfPerson(newItem.createdBy));
          LifecycleTodoDeriver.deriveFromActivityCreate(newItem, { snapshot });
        }).catch(e => console.warn('[MockAdapter] 派生活动赋权待办失败：', e));
        return newItem;
      });
    },

    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.activities.findIndex(a => a.id === id);
        if (idx === -1) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        const merged = { ...mockDB.activities[idx], ...patch };
        const organizingScope = normalizeOrganizingScope(merged.organizingScope, merged);
        if (patch?.organizer !== undefined && organizingScope !== 'branch') {
          const hostGroup = merged.hostGroupId ? (_rowById(mockDB.partyGroups, merged.hostGroupId) || null) : null;
          const person = _rowById(mockDB.users, String(patch.organizer)) || _rowById(PEOPLE, String(patch.organizer));
          const cross = !!hostGroup && !!person?.partyGroup && person.partyGroup !== hostGroup.name;
          if (cross && !String(merged.organizerExceptionReason || '').trim()) {
            throw Object.assign(new Error('组织者一般由承办党小组承担；请填写组织者跨组说明'), { type: 'ValidationError' });
          }
        }
        const updated = {
          ...merged,
          organizingScope,
          ...(organizingScope === 'branch' ? { hostGroupId: null, hostGroup: '' } : {}),
        };
        mockDB.activities = [
          ...mockDB.activities.slice(0, idx),
          updated,
          ...mockDB.activities.slice(idx + 1),
        ];
        // R9 Task 4.3：改名 / 组织落点 / 招募范围变更同步工作组（缺失则补建主记录）。
        mockDB.workgroups = applyActivityWorkgroupSync(mockDB.workgroups, updated, {
          actorId: updated.createdBy, create: true,
        });
        _saveToStorage();
        return updated;
      });
    },

    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.activities.length;
        mockDB.activities = mockDB.activities.filter(a => a.id !== id);
        if (mockDB.activities.length === prev) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        // 2026-08-27 T-283 生命周期修复：彻底删除活动须联动清理全部子记录（与 mock.js 同构）
        for (const key of ['tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks', 'archiveRecords', 'fileSpaceRecords', 'imageRecords']) {
          if (Array.isArray(mockDB[key])) mockDB[key] = mockDB[key].filter(x =>
            x.activityId !== id && !(key === 'fileSpaceRecords' && x.sourceType === 'activity' && x.sourceId === id));
        }
        if (Array.isArray(mockDB.signups)) mockDB.signups = mockDB.signups.filter(s => !(s.sourceType === 'activity' && s.sourceId === id));
        if (Array.isArray(mockDB.notices)) mockDB.notices = mockDB.notices.filter(n => !(n.targetType === 'activity' && n.targetId === id));
        if (Array.isArray(mockDB.todos)) mockDB.todos = mockDB.todos.filter(t => !(t.sourceType === 'activity' && t.sourceId === id));
        if (Array.isArray(mockDB.agendaVotes)) mockDB.agendaVotes = mockDB.agendaVotes.filter(v => v.activityId !== id);
        // R9 Task 4.3：删除活动 = 同一投影下的工作组移除（含成员 / 授权 / 任务 / 产出）。
        const deletedWorkgroups = activityWorkgroupIdsForDelete(mockDB.workgroups, id);
        mockDB.workgroupMembers = mockDB.workgroupMembers.filter(m => !deletedWorkgroups.has(m.workgroupId));
        mockDB.workgroupGrants = mockDB.workgroupGrants.filter(g => !deletedWorkgroups.has(g.workgroupId));
        mockDB.workgroupTasks = mockDB.workgroupTasks.filter(t => !deletedWorkgroups.has(t.workgroupId));
        mockDB.workgroupOutputs = mockDB.workgroupOutputs.filter(o => !deletedWorkgroups.has(o.workgroupId))
          .map(o => o.activityId === id ? { ...o, activityId: null } : o);
        mockDB.workgroupTasks = mockDB.workgroupTasks.map(t => t.activityId === id ? { ...t, activityId: null } : t);
        mockDB.workgroups = mockDB.workgroups.filter(w => !deletedWorkgroups.has(w.id));
        mockDB.attendanceRosters = mockDB.attendanceRosters.filter(r => r.activityId !== id);
        if (mockDB.actSubRecords && Object.prototype.hasOwnProperty.call(mockDB.actSubRecords, id)) {
          mockDB.actSubRecords = { ...mockDB.actSubRecords };
          delete mockDB.actSubRecords[id];
        }
        _saveToStorage();
        return { id };
      });
    },

    archive(id) {
      return _withDelay(() => {
        const idx = mockDB.activities.findIndex(a => a.id === id);
        if (idx === -1) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        const archived = { ...mockDB.activities[idx], archived: true };
        mockDB.activities = [
          ...mockDB.activities.slice(0, idx),
          archived,
          ...mockDB.activities.slice(idx + 1),
        ];
        // R9 Task 4.3：归档 ⇒ 活动工作组必须 archived（成员 / 授权 / 任务 / 产出转只读）。
        mockDB.workgroups = applyActivityWorkgroupSync(mockDB.workgroups, archived, {
          actorId: archived.createdBy, create: true,
        });
        mockDB.tasks = mockDB.tasks.map(t =>
          t.activityId === id && t.status !== 'completed' ? { ...t, status: 'completed' } : t
        );
        _saveToStorage();
        import('../services/governance/todo.js?v=20261024b').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deriveFromActivityArchive(archived);
        }).catch(e => console.warn('[MockAdapter] 派生活动归档待办失败：', e));
        // 2026-08-08 归档闭环：活动归档 → 配套通知随之一并归档，退出工作区
        import('../services/governance/notice.js?v=20261024b').then(({ NoticeStore }) => {
          NoticeStore.archiveBySource('activity', id);
        }).catch(e => console.warn('[MockAdapter] 归档关联通知失败：', e));
        return archived;
      });
    },

    // 2026-09-21 批次 132：品牌认定＝提案 → 支委会通过后确定 ⇒ 本口**只能取消**（非品牌态抛错，防「点一下即认定」）
    revokeBrand(id) {
      return _withDelay(() => {
        const idx = mockDB.activities.findIndex(a => a.id === id);
        if (idx === -1) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        if (mockDB.activities[idx].isBrand !== true) {
          throw Object.assign(new Error('该活动当前不是品牌活动——品牌认定须经支委会审议通过（提案 → 支委会通过后确定）'), { type: 'ValidationError' });
        }
        const updated = { ...mockDB.activities[idx], isBrand: false, brandRevokedAt: new Date().toISOString() };
        mockDB.activities = [
          ...mockDB.activities.slice(0, idx),
          updated,
          ...mockDB.activities.slice(idx + 1),
        ];
        _saveToStorage();
        return updated;
      });
    },
  },

  tasks: {
    list() {
      return _withDelay(() => [...mockDB.tasks]);
    },

    create(data) {
      return _withDelay(() => {
        const newTask = {
          ...data,
          id: generateId('tsk'),
          status: data.status || 'pending',
          createdAt: new Date().toISOString(),
        };
        mockDB.tasks = [...mockDB.tasks, newTask];
        _saveToStorage();
        return newTask;
      });
    },

    update(taskId, patch) {
      // 同步方法（与旧 mock.js 保持一致）
      const idx = mockDB.tasks.findIndex(t => t.id === taskId);
      if (idx === -1) return [...mockDB.tasks];
      const updated = { ...mockDB.tasks[idx], ...patch };
      mockDB.tasks = [
        ...mockDB.tasks.slice(0, idx),
        updated,
        ...mockDB.tasks.slice(idx + 1),
      ];
      _saveToStorage();
      return [...mockDB.tasks];
    },
  },

  // ── 其他资源（直接操作 mockDB，满足 DataAdapter 接口）──────

  attendances: {
    list(params = {}) { return _withDelay(() => _filterByBranch([...mockDB.attendances], 'attendances', params)); },
    listByActivity(activityId) { return _withDelay(() => mockDB.attendances.filter(a => a.activityId === activityId)); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('att'), recordedAt: new Date().toISOString() };
        mockDB.attendances = [...mockDB.attendances, record];
        _saveToStorage();
        return record;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.attendances.findIndex(a => a.id === id);
        if (idx === -1) return null;
        mockDB.attendances = [
          ...mockDB.attendances.slice(0, idx),
          { ...mockDB.attendances[idx], ...patch },
          ...mockDB.attendances.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.attendances[idx];
      });
    },
  },

  inspections: {
    list() { return _withDelay(() => [...mockDB.inspections]); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('insp'), recordedAt: new Date().toISOString() };
        mockDB.inspections = [...mockDB.inspections, record];
        _saveToStorage();
        return record;
      });
    },
  },

  taskforces: {
    list() { return _withDelay(() => [...mockDB.taskforces]); },
    create(data) {
      return _withDelay(() => {
        const id = generateId('tf');
        const createdAt = new Date().toISOString();
        const tf = { ...data, id, workgroupId: workgroupIdFor('taskforce', id), branchId: data.branchId || DEFAULT_BRANCH_ID, createdAt };
        mockDB.workgroups = [...mockDB.workgroups, {
          id: tf.workgroupId, branchId: tf.branchId, kind: 'taskforce', sourceType: 'taskforce', sourceId: id,
          name: tf.name || id, status: workgroupStatusForTaskforce(tf.status), migrationState: 'ready', createdBy: tf.createdBy || null, createdAt,
        }];
        mockDB.workgroupMembers = [...mockDB.workgroupMembers, ...(Array.isArray(tf.members) ? tf.members : []).map((member) => ({
          id: `wgm-${encodeURIComponent(tf.workgroupId)}-${encodeURIComponent(String(member.personId))}`,
          branchId: tf.branchId, workgroupId: tf.workgroupId, personId: String(member.personId),
          role: member.role || 'participant', status: 'active', createdBy: tf.createdBy || null, createdAt,
        }))];
        if (String(tf.task || '').trim()) mockDB.workgroupTasks = [...mockDB.workgroupTasks, {
          id: `wgt-purpose-${id}`, branchId: tf.branchId, workgroupId: tf.workgroupId,
          title: String(tf.task).trim(), status: 'open', isPurpose: true, createdBy: tf.createdBy || null, createdAt,
        }];
        mockDB.taskforces = [...mockDB.taskforces, tf];
        _saveToStorage();
        import('../services/governance/todo.js?v=20261024b').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deriveFromTaskforceCreate(tf);
        }).catch(e => console.warn('[MockAdapter] 派生专班赋权待办失败：', e));
        return tf;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.taskforces.findIndex(t => t.id === id);
        if (idx === -1) return null;
        mockDB.taskforces = [
          ...mockDB.taskforces.slice(0, idx),
          { ...mockDB.taskforces[idx], ...patch },
          ...mockDB.taskforces.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.taskforces[idx];
      });
    },
    dissolve(id, data = {}) {
      return _withDelay(() => {
        const idx = mockDB.taskforces.findIndex((t) => t.id === id);
        if (idx === -1) return null;
        const current = mockDB.taskforces[idx];
        if (current.status !== 'active' || current.committeeRequest?.status === 'pending') return null;
        if (typeof data.requiresCommitteeVote !== 'boolean') return null;
        const governanceReason = String(data.governanceReason || '').trim();
        if (data.requiresCommitteeVote && !governanceReason) return null;
        const workgroupId = current.workgroupId || workgroupIdFor('taskforce', current.id);
        const unfinished = mockDB.workgroupTasks.filter((task) => task.workgroupId === workgroupId && !TASK_TERMINAL_STATUSES.includes(task.status));
        if (unfinished.length) throw Object.assign(new Error(`任务尚未闭合（${unfinished.length} 项）`), { type: 'ConflictError' });
        const unfinishedOutputs = mockDB.workgroupOutputs.filter((output) => output.workgroupId === workgroupId && !OUTPUT_TERMINAL_STATUSES.includes(output.status));
        if (unfinishedOutputs.length) throw Object.assign(new Error(`产出尚未完成登记（${unfinishedOutputs.length} 项）`), { type: 'ConflictError' });
        const at = new Date().toISOString();
        const event = {
          id: generateId('tfe'),
          kind: data.requiresCommitteeVote ? 'dissolution-vote-requested' : 'dissolution-direct',
          by: data.by || null, at,
          governanceReason: data.requiresCommitteeVote ? governanceReason : '',
          note: String(data.note || '').trim(),
        };
        const taskforce = data.requiresCommitteeVote
          ? {
            ...current,
            dissolutionGovernanceRequired: true,
            committeeRequest: { kind: 'dissolve', by: data.by || null, note: governanceReason, at, status: 'pending' },
            lifecycleEvents: [...(current.lifecycleEvents || []), event],
          }
          : {
            ...current, status: 'dissolved', dissolvedAt: at, dissolvedBy: data.by || null,
            dissolutionGovernanceRequired: false, dissolutionNote: String(data.note || '').trim(), committeeRequest: null,
            lifecycleEvents: [...(current.lifecycleEvents || []), event],
          };
        mockDB.taskforces = [...mockDB.taskforces.slice(0, idx), taskforce, ...mockDB.taskforces.slice(idx + 1)];
        const actualWorkgroupId = taskforce.workgroupId || workgroupIdFor('taskforce', taskforce.id);
        let workgroup = mockDB.workgroups.find((row) => row.id === actualWorkgroupId) || null;
        if (workgroup) {
          workgroup = { ...workgroup, status: data.requiresCommitteeVote ? workgroup.status : 'dissolved', updatedAt: at };
          mockDB.workgroups = mockDB.workgroups.map((row) => row.id === actualWorkgroupId ? workgroup : row);
        }
        _saveToStorage();
        return { taskforce, workgroup };
      });
    },
    delete(id) {
      return _withDelay(() => {
        mockDB.taskforces = mockDB.taskforces.filter(t => t.id !== id);
        _saveToStorage();
        import('../services/governance/todo.js?v=20261024b').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deleteByTaskforce(id);
        }).catch(e => console.warn('[MockAdapter] 联动删除待办失败：', e));
        return { id };
      });
    },
  },

  notices: {
    list(params = {}) { return _withDelay(() => _filterByBranch([...mockDB.notices], 'notices', params)); },
    create(data) {
      return _withDelay(() => {
        const notice = { ...data, id: data.id || generateId('notice'), publishDate: data.publishDate || todayLocal() };
        mockDB.notices = [...mockDB.notices, notice];
        _saveToStorage();
        import('../services/governance/todo.js?v=20261024b').then(({ NoticeTodoDeriver }) => {
          NoticeTodoDeriver.deriveFromNotice(notice);
        }).catch(e => console.warn('[MockAdapter] 通知派生待办失败：', e));
        return notice;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.notices.findIndex(n => n.id === id);
        if (idx === -1) return null;
        mockDB.notices = [
          ...mockDB.notices.slice(0, idx),
          { ...mockDB.notices[idx], ...patch },
          ...mockDB.notices.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.notices[idx];
      });
    },
  },

  todos: {
    list(params = {}) { return _withDelay(() => _filterByBranch([...mockDB.todos], 'todos', params)); },
    create(data) {
      return _withDelay(() => {
        const todo = { ...data, id: data.id || generateId('todo_'), createdAt: data.createdAt || new Date().toISOString() };
        // v11（批次 504）：待办必须能归属支部（父行 / 所属人），解析不出就拒绝，不落 br-b1。
        const branchId = todo.branchId || _recordBranchId('todos', todo);
        if (!branchId) throw new Error('待办须能归属到支部：请补来源父行或所属人员');
        todo.branchId = branchId;
        mockDB.todos = [...mockDB.todos, todo];
        _saveToStorage();
        return todo;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.todos.findIndex(t => t.id === id);
        if (idx === -1) return null;
        mockDB.todos = [
          ...mockDB.todos.slice(0, idx),
          { ...mockDB.todos[idx], ...patch },
          ...mockDB.todos.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.todos[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        mockDB.todos = mockDB.todos.filter(t => t.id !== id);
        _saveToStorage();
        return { id };
      });
    },
  },

  assignments: {
    list(params = {}) { return _withDelay(() => _filterByBranch([...mockDB.assignments], 'assignments', params)); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('asgn'), createdAt: new Date().toISOString() };
        mockDB.assignments = [...mockDB.assignments, record];
        _saveToStorage();
        return record;
      });
    },
    // 批次 359（`D-750` 续答「全 CRUD」）：补 `update` / `delete` 两件——活动详情页「工作分工」块要就地改 / 删；
    //   此前该域只有 `list` / `create`（同批次 352 的旧周期归档域、358 的 `signups`：**域不全就抛**）。
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.assignments.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`分工记录 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.assignments = [
          ...mockDB.assignments.slice(0, idx),
          { ...mockDB.assignments[idx], ...patch },
          ...mockDB.assignments.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.assignments[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.assignments.length;
        mockDB.assignments = mockDB.assignments.filter(r => r.id !== id);
        if (mockDB.assignments.length === prev) throw Object.assign(new Error(`分工记录 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  makeupTasks: {
    list() { return _withDelay(() => [...mockDB.makeupTasks]); },
    create(data) {
      return _withDelay(() => {
        const task = { ...data, id: generateId('mkp'), createdAt: new Date().toISOString() };
        mockDB.makeupTasks = [...mockDB.makeupTasks, task];
        _saveToStorage();
        return task;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.makeupTasks.findIndex(t => t.id === id);
        if (idx === -1) return null;
        mockDB.makeupTasks = [
          ...mockDB.makeupTasks.slice(0, idx),
          { ...mockDB.makeupTasks[idx], ...patch },
          ...mockDB.makeupTasks.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.makeupTasks[idx];
      });
    },
  },

  fileSpaceRecords: {
    list() { return _withDelay(() => [...mockDB.fileSpaceRecords]); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('fs_'), uploadedAt: new Date().toISOString() };
        mockDB.fileSpaceRecords = [...mockDB.fileSpaceRecords, record];
        _saveToStorage();
        return record;
      });
    },
    // 2026-10-02 批次 343（`D-744` D 档写口纪律）：补 `update` / `delete` 两件，
    //   使本资源与 `branchDocs` 同形（list/create/update/delete 四件套）——
    //   原 `prop/archive-tab.js` 在 api 形态**绕过适配器直连 `fetch`**、mock 形态**就地改内存**，
    //   两类形态两套写法；补齐后调用点一律走 `getAdapter().fileSpaceRecords.*`。
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.fileSpaceRecords.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`文件空间记录 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.fileSpaceRecords = [
          ...mockDB.fileSpaceRecords.slice(0, idx),
          { ...mockDB.fileSpaceRecords[idx], ...patch },
          ...mockDB.fileSpaceRecords.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.fileSpaceRecords[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.fileSpaceRecords.length;
        mockDB.fileSpaceRecords = mockDB.fileSpaceRecords.filter(r => r.id !== id);
        if (mockDB.fileSpaceRecords.length === prev) throw Object.assign(new Error(`文件空间记录 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // R2-40（2026-10-20）：补 `archiveRecords` 域——api-adapter 早有该域（`/api/v1/archiveRecords`），
  //   MockAdapter 一直缺 ⇒ 宣传材料上传只能直写 `mockDB.archiveRecords`，api 形态刷新即丢（服务端表有行、
  //   客户端下一次 init 才拉回；上传当时却只有内存）。补齐四件套后，上传/删除统一走服务层 ArchiveStore
  //   → 本域写口，mock 落 localStorage、api 落 `archive_records` 表，两形态同源。
  archiveRecords: {
    list() { return _withDelay(() => [...mockDB.archiveRecords]); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: data.id || generateId('ar', '-') };
        mockDB.archiveRecords = [...mockDB.archiveRecords, record];
        _saveToStorage();
        return record;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.archiveRecords.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`归档记录 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.archiveRecords = [
          ...mockDB.archiveRecords.slice(0, idx),
          { ...mockDB.archiveRecords[idx], ...patch },
          ...mockDB.archiveRecords.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.archiveRecords[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.archiveRecords.length;
        mockDB.archiveRecords = mockDB.archiveRecords.filter(r => r.id !== id);
        if (mockDB.archiveRecords.length === prev) throw Object.assign(new Error(`归档记录 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  imageRecords: {
    list() { return _withDelay(() => [...mockDB.imageRecords]); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('img_'), uploadedAt: new Date().toISOString() };
        mockDB.imageRecords = [...mockDB.imageRecords, record];
        _saveToStorage();
        return record;
      });
    },
    // 同上（批次 343 · `D-744` D 档）：补 `update` / `delete` 两件（照片标注 / 删除照片走写口）。
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.imageRecords.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`图片记录 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.imageRecords = [
          ...mockDB.imageRecords.slice(0, idx),
          { ...mockDB.imageRecords[idx], ...patch },
          ...mockDB.imageRecords.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.imageRecords[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.imageRecords.length;
        mockDB.imageRecords = mockDB.imageRecords.filter(r => r.id !== id);
        if (mockDB.imageRecords.length === prev) throw Object.assign(new Error(`图片记录 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // 周期归档域提供 list/create/update/delete 四件套；本地运行与 API 模式使用同一资源名，
  //   老 localStorage 的 weeklyReports 键在恢复时迁到 periodicArchives。
  //   本批「作废（软）」走统一写口 `getAdapter()[resource].update` ⇒ 演示（mock）形态必须同面，否则抛
  //   「Cannot read properties of undefined (reading 'update')」（真机取证在 api 形态下抓到的同类缺陷）。
  periodicArchives: {
    list() { return _withDelay(() => [...mockDB.periodicArchives]); },
    create(data) {
      return _withDelay(() => {
        const report = { ...data, id: generateId('pa'), createdAt: new Date().toISOString() };
        mockDB.periodicArchives = [...mockDB.periodicArchives, report];
        _saveToStorage();
        return report;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.periodicArchives.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`周期归档 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.periodicArchives = [
          ...mockDB.periodicArchives.slice(0, idx),
          { ...mockDB.periodicArchives[idx], ...patch },
          ...mockDB.periodicArchives.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.periodicArchives[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.periodicArchives.length;
        mockDB.periodicArchives = mockDB.periodicArchives.filter(r => r.id !== id);
        if (mockDB.periodicArchives.length === prev) throw Object.assign(new Error(`周期归档 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // 批次 352b（`D-746`）：补 `externalDispatches` 域——与周期归档 **同型缺口**（api-adapter 早有该域、
  //   MockAdapter 一直缺）；否则演示（mock）形态的外发记录「作废（软）」会抛
  //   「Cannot read properties of undefined (reading 'update')」。
  externalDispatches: {
    list() { return _withDelay(() => [...mockDB.externalDispatches]); },
    create(data) {
      return _withDelay(() => {
        const rec = { ...data, id: generateId('ed'), sentAt: new Date().toISOString(), confirmedAt: null };
        mockDB.externalDispatches = [...mockDB.externalDispatches, rec];
        _saveToStorage();
        return rec;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.externalDispatches.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`外发记录 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.externalDispatches = [
          ...mockDB.externalDispatches.slice(0, idx),
          { ...mockDB.externalDispatches[idx], ...patch },
          ...mockDB.externalDispatches.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.externalDispatches[idx];
      });
    },
  },

  experienceDeposits: {
    list() { return _withDelay(() => [...mockDB.experienceDeposits]); },
    create(data) {
      return _withDelay(() => {
        const deposit = { ...data, id: generateId('exp_'), createdAt: new Date().toISOString() };
        mockDB.experienceDeposits = [...mockDB.experienceDeposits, deposit];
        _saveToStorage();
        return deposit;
      });
    },
    // 批次 352（`D-746`）：补 `update` / `delete` 两件（经验沉淀「作废（软）」走统一写口；四件套同批次 343）
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.experienceDeposits.findIndex(d => d.id === id);
        if (idx === -1) throw Object.assign(new Error(`经验沉淀 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.experienceDeposits = [
          ...mockDB.experienceDeposits.slice(0, idx),
          { ...mockDB.experienceDeposits[idx], ...patch },
          ...mockDB.experienceDeposits.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.experienceDeposits[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.experienceDeposits.length;
        mockDB.experienceDeposits = mockDB.experienceDeposits.filter(d => d.id !== id);
        if (mockDB.experienceDeposits.length === prev) throw Object.assign(new Error(`经验沉淀 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // 批次 358（`D-751` · C 档 2 张）：`signups` ／ `propTasks` **补域**。
  //   ⚠ 同型缺口（实读教训）——这两张此前**只有 `mockDB` 域与持久化列表**，**没有适配器域**
  //     ⇒ `getAdapter().signups` 为 `undefined` ⇒ 「作废（软）」统一写口在这两张上会抛
  //     `Cannot read properties of undefined (reading 'update')`（同批次 352 的周期归档、
  //     批次 352b 的 `externalDispatches`）。`soft-void.test.mjs::V7` 已把这类缺口钉成判据。
  signups: {
    list() { return _withDelay(() => [...mockDB.signups]); },
    create(data) {
      return _withDelay(() => {
        const rec = { ...data, id: generateId('su'), createdAt: new Date().toISOString() };
        mockDB.signups = [...mockDB.signups, rec];
        _saveToStorage();
        return rec;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.signups.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`报名记录 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.signups = [
          ...mockDB.signups.slice(0, idx),
          { ...mockDB.signups[idx], ...patch },
          ...mockDB.signups.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.signups[idx];
      });
    },
  },

  propTasks: {
    list() { return _withDelay(() => [...mockDB.propTasks]); },
    create(data) {
      return _withDelay(() => {
        const rec = { ...data, id: generateId('ppt'), createdAt: new Date().toISOString() };
        mockDB.propTasks = [...mockDB.propTasks, rec];
        _saveToStorage();
        return rec;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.propTasks.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`宣传任务 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.propTasks = [
          ...mockDB.propTasks.slice(0, idx),
          { ...mockDB.propTasks[idx], ...patch },
          ...mockDB.propTasks.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.propTasks[idx];
      });
    },
  },

  branchDocs: {
    list() { return _withDelay(() => [...mockDB.branchDocs]); },
    create(data) {
      return _withDelay(() => {
        // P1 党委后台（2026-09-02）：支部文件一支部一存储空间——记录挂所属 branchId（缺省 br-b1）；
        // 跨支部查询隔离由消费端按登录人 branch 收敛（fileSpaceIsolated）
        const doc = { ...data, id: generateId('bd'), branchId: data.branchId || DEFAULT_BRANCH_ID, uploadedAt: new Date().toISOString() };
        mockDB.branchDocs = [...mockDB.branchDocs, doc];
        _saveToStorage();
        return doc;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.branchDocs.findIndex(d => d.id === id);
        if (idx === -1) throw Object.assign(new Error(`支部文件 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.branchDocs = [
          ...mockDB.branchDocs.slice(0, idx),
          { ...mockDB.branchDocs[idx], ...patch },
          ...mockDB.branchDocs.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.branchDocs[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.branchDocs.length;
        mockDB.branchDocs = mockDB.branchDocs.filter(d => d.id !== id);
        if (mockDB.branchDocs.length === prev) throw Object.assign(new Error(`支部文件 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // 2026-09-14 批次 25：partyGroups 资源组（党小组一等实体；与 api-adapter.partyGroups 接口对称）。
  // 「残留资源组」写法照 branchDocs：list/create/update/delete 四件套 + _withDelay + 写后 _saveToStorage。
  // 服务层（services/member/party-group.js）另行直写 mockDB.partyGroups + persist() 并 bumpToken；
  // 本组供 getAdapter().partyGroups.* 调用（跨形态接口一致）。
  partyGroups: {
    list() { return _withDelay(() => [...mockDB.partyGroups]); },
    create(data) {
      return _withDelay(() => {
        const group = {
          ...data,
          id: data.id || generateId('pg', '-'),
          branchId: data.branchId || DEFAULT_BRANCH_ID,
          createdAt: data.createdAt || todayLocal(),
        };
        mockDB.partyGroups = [...mockDB.partyGroups, group];
        _saveToStorage();
        return group;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.partyGroups.findIndex(g => g.id === id);
        if (idx === -1) throw Object.assign(new Error(`党小组 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.partyGroups = [
          ...mockDB.partyGroups.slice(0, idx),
          { ...mockDB.partyGroups[idx], ...patch },
          ...mockDB.partyGroups.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.partyGroups[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.partyGroups.length;
        mockDB.partyGroups = mockDB.partyGroups.filter(g => g.id !== id);
        if (mockDB.partyGroups.length === prev) throw Object.assign(new Error(`党小组 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // 2026-09-14 批次 25：memberFlows 资源组（成员流动台账；与 api-adapter.memberFlows 接口对称）。
  // 「残留资源组」写法照 partyGroups：list/create/update/delete 四件套 + _withDelay + 写后 _saveToStorage。
  // 服务层（services/member/member-flow.js）另行直写 mockDB.memberFlows + persist() 并 bumpToken；
  // 本组供 getAdapter().memberFlows.* 调用（跨形态接口一致）。
  memberFlows: {
    list() { return _withDelay(() => [...mockDB.memberFlows]); },
    create(data) {
      return _withDelay(() => {
        const flow = {
          ...data,
          id: data.id || generateId('mf', '-'),
          branchId: data.branchId || DEFAULT_BRANCH_ID,
          at: data.at || new Date().toISOString(),
        };
        mockDB.memberFlows = [...mockDB.memberFlows, flow];
        _saveToStorage();
        return flow;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.memberFlows.findIndex(f => f.id === id);
        if (idx === -1) throw Object.assign(new Error(`成员流动台账 ${id} 不存在`), { type: 'NotFoundError' });
        mockDB.memberFlows = [
          ...mockDB.memberFlows.slice(0, idx),
          { ...mockDB.memberFlows[idx], ...patch },
          ...mockDB.memberFlows.slice(idx + 1),
        ];
        _saveToStorage();
        return mockDB.memberFlows[idx];
      });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.memberFlows.length;
        mockDB.memberFlows = mockDB.memberFlows.filter(f => f.id !== id);
        if (mockDB.memberFlows.length === prev) throw Object.assign(new Error(`成员流动台账 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // 2026-09-06 立项⑥ A波：users 资源组（与 api-adapter.users 接口对称；mock 形态落
  // 「members 持久覆盖层」子域 = localStorage 键 gsm1921-members-overlay（服务实现与
  // PersonStore 写口同源，见 services/member/person.js；键 gsm1921- 前缀自动纳入 ?reset=demo
  // 清除集 = 回种子即清覆盖）。list 返回 = PEOPLE 种子 + 覆盖层（server users 表对应物，
  // 含党委组织员）；create/update/delete 复用 PersonStore.saveMember/removeMember
  // 的 mock 分支（动态 import 防静态环，与 todo.js 同法）。
  users: {
    list(params = {}) {
      return _withDelay(() => import('../services/member/person.js?v=20261024b')
        .then(({ getBaseMemberRecords }) => _filterByBranch(getBaseMemberRecords(), 'users', params)));
    },

    create(data) {
      return _withDelay(async () => {
        const { PersonStore } = await import('../services/member/person.js?v=20261024b');
        const r = await PersonStore.saveMember(data, { by: data?.by });
        if (!r.ok) throw Object.assign(new Error(r.reason), { type: 'BadRequestError' });
        return r.member;
      });
    },

    update(id, patch) {
      return _withDelay(async () => {
        const { PersonStore } = await import('../services/member/person.js?v=20261024b');
        const r = await PersonStore.saveMember({ id, ...patch }, { by: patch?.by });
        if (!r.ok) throw Object.assign(new Error(r.reason), { type: 'BadRequestError' });
        return r.member;
      });
    },

    delete(id) {
      // adapter 层为数据原语（PersonStore.removeMember 为带引用守卫的业务口；此处直删由守卫在业务层把关）
      return _withDelay(async () => {
        const { PersonStore } = await import('../services/member/person.js?v=20261024b');
        const r = await PersonStore.removeMember(id, { guardRefs: false });
        if (!r.ok) throw Object.assign(new Error(r.reason), { type: 'BadRequestError' });
        return { id };
      });
    },
  },

  // R7-01（2026-10-22）：账号重命名语义口（与 api-adapter.members.renameAccount 同名）。
  // mock 形态 = PersonStore 的等价本地实现：members 覆盖层旧 id → 新 id，
  // 并同步 mockDB 各域引用（演示刷新后仍一致）。
  members: {
    renameAccount(id, newPersonId) {
      return _withDelay(async () => {
        const { PersonStore } = await import('../services/member/person.js?v=20261024b');
        const r = await PersonStore.renameMemberAccount(id, newPersonId);
        if (!r.ok) {
          const type = /占用/.test(String(r.reason)) ? 'ConflictError' : 'BadRequestError';
          throw Object.assign(new Error(r.reason), { type });
        }
        return r;
      });
    },
  },

  // P1 党委后台（2026-09-02）：支部实例 CRUD（党委工作台支部管理；config 配置档案随行持久化）
  branches: {
    list() { return _withDelay(() => [...mockDB.branches]); },
    create(data) {
      return _withDelay(() => {
        const b = {
          id: generateId('br'),
          name: data.name || '未命名支部',
          type: data.type || '',
          config: {
            headerTitle: data.name || '未命名支部',
            accent: data.config?.accent ?? null,
            modules: data.config?.modules ?? null,   // L2 工作流模块配置（null=全开）
            fileSpaceIsolated: true,
          },
          secretaryId: data.secretaryId || null,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        mockDB.branches = [...mockDB.branches, b];
        _saveToStorage();
        return b;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.branches.findIndex(b => b.id === id);
        if (idx === -1) throw Object.assign(new Error(`支部 ${id} 不存在`), { type: 'NotFoundError' });
        const cur = mockDB.branches[idx];
        // name 变更同步到 config.headerTitle（支部名软编码单一来源：改支部即换 header）
        const nextConfig = { ...(cur.config || {}), ...(patch.config || {}) };
        if (patch.name !== undefined && patch.name) nextConfig.headerTitle = patch.name;
        const next = { ...cur, ...patch, config: nextConfig };
        mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
        _saveToStorage();
        return next;
      });
    },
    // L2/L3 支部工作流配置（2026-09-03 支书裁定）：config 子级白名单写
    // configPatch = { modules?: {...}|null, blocks?: {...}|null }——undefined key 不改（merge 保留现值）
    updateConfig(id, configPatch) {
      return this.update(id, { config: configPatch });
    },
    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.branches.length;
        mockDB.branches = mockDB.branches.filter(b => b.id !== id);
        if (mockDB.branches.length === prev) throw Object.assign(new Error(`支部 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        return { id };
      });
    },
  },

  // B-499-9：任命语义口（branch / 双方 users / 任期记录 all-or-nothing；失败恢复快照）
  appointments: {
    apply(data = {}) {
      return _withDelay(async () => {
        const { PersonStore, MEMBER_OVERLAY_KEY } = await import('../services/member/person.js?v=20261024b');
        const branchId = String(data.branchId || '');
        const snapshot = {
          branches: (mockDB.branches || []).map((row) => ({ ...row })),
          users: (mockDB.users || []).map((row) => ({ ...row })),
          appointmentRecords: (mockDB.appointmentRecords || []).map((row) => ({ ...row })),
          memberOverlay: (() => { try { return localStorage.getItem(MEMBER_OVERLAY_KEY); } catch { return null; } })(),
        };
        try {
          const branch = (mockDB.branches || []).find((row) => row.id === branchId);
          if (!branch) throw Object.assign(new Error(`支部 ${branchId} 不存在`), { type: 'NotFoundError' });
          const rawSecretary = data.secretaryId !== undefined ? data.secretaryId : data.personId;
          const nextSecretaryId = rawSecretary ? String(rawSecretary) : null;
          const requestedId = data.appointmentId ? String(data.appointmentId) : '';
          const currentRecords = [...(mockDB.appointmentRecords || [])];
          if (requestedId) {
            const existing = currentRecords.find((row) => row.id === requestedId);
            if (existing) {
              if (existing.branchId === branchId && (existing.secretaryId || null) === nextSecretaryId) {
                return { ok: true, branch, appointment: existing, appointmentRecords: [existing], users: [] };
              }
              throw Object.assign(new Error('该任命 id 已用于其他任命'), { type: 'ConflictError' });
            }
          }
          if (Object.prototype.hasOwnProperty.call(data, 'expectedSecretaryId')
            && (branch.secretaryId || null) !== (data.expectedSecretaryId || null)) {
            throw Object.assign(new Error('支部现任支书已被他人变更，请刷新后重试'), { type: 'ConflictError' });
          }
          if (nextSecretaryId) {
            const person = PersonStore.getById(nextSecretaryId);
            if (!person) throw Object.assign(new Error('被任命人不存在'), { type: 'BadRequestError' });
            if (person.transferOut === true) throw Object.assign(new Error('被任命人已转出，不能任命'), { type: 'BadRequestError' });
            if (person.role === 'party-staff') throw Object.assign(new Error('党委账号不能担任支部书记'), { type: 'BadRequestError' });
            if (person.branchId === null) throw Object.assign(new Error('被任命人尚未归属支部，不能任命'), { type: 'BadRequestError' });
          }

          const now = new Date().toISOString();
          const previousSecretaryId = branch.secretaryId || null;
          const changedUsers = [];
          const nextBranch = { ...branch, secretaryId: nextSecretaryId };
          mockDB.branches = (mockDB.branches || []).map((row) => (row.id === branchId ? nextBranch : row));
          const writeRole = (personId, role) => {
            const index = (mockDB.users || []).findIndex((row) => row.id === personId);
            if (index < 0) {
              const person = PersonStore.getById(personId);
              if (!person) return;
              const created = { ...person, role };
              mockDB.users = [...(mockDB.users || []), created];
              changedUsers.push(created);
              return;
            }
            const next = { ...mockDB.users[index], role };
            mockDB.users = [...mockDB.users.slice(0, index), next, ...mockDB.users.slice(index + 1)];
            changedUsers.push(next);
          };
          if (previousSecretaryId && previousSecretaryId !== nextSecretaryId) writeRole(previousSecretaryId, 'participant');
          if (nextSecretaryId) writeRole(nextSecretaryId, 'secretary');

          const touchedRecords = [];
          const records = currentRecords.map((record) => {
            if (record.branchId !== branchId || record.to) return record;
            const closed = { ...record, to: now };
            touchedRecords.push(closed);
            return closed;
          });
          let appointment = null;
          if (nextSecretaryId) {
            appointment = {
              id: requestedId || generateId('appt', '-'),
              branchId,
              secretaryId: nextSecretaryId,
              appointedBy: (data.appointedBy && String(data.appointedBy)) || 'party-staff',
              note: typeof data.note === 'string' ? data.note.trim() : '',
              from: now,
              to: null,
            };
            records.push(appointment);
            touchedRecords.push(appointment);
          }
          mockDB.appointmentRecords = records;
          if (records.filter((record) => record.branchId === branchId && !record.to).length > 1) {
            throw new Error('任命事务校验失败：同一支部存在多条未封口任期记录');
          }

          const roleChanges = [];
          if (previousSecretaryId && previousSecretaryId !== nextSecretaryId) roleChanges.push([previousSecretaryId, 'participant']);
          if (nextSecretaryId) roleChanges.push([nextSecretaryId, 'secretary']);
          for (const [personId, role] of roleChanges) {
            const person = PersonStore.getById(personId);
            if (!person || !String(person.name || '').trim()) continue;
            const result = await PersonStore.saveMember({ id: personId, role });
            if (!result || !result.ok) {
              throw Object.assign(new Error(result?.reason || '成员角色同步失败'), { type: 'BadRequestError' });
            }
          }
          _saveToStorage();
          return { ok: true, branch: nextBranch, appointment, appointmentRecords: touchedRecords, users: changedUsers };
        } catch (error) {
          mockDB.branches = snapshot.branches;
          mockDB.users = snapshot.users;
          mockDB.appointmentRecords = snapshot.appointmentRecords;
          try {
            if (snapshot.memberOverlay === null) localStorage.removeItem(MEMBER_OVERLAY_KEY);
            else localStorage.setItem(MEMBER_OVERLAY_KEY, snapshot.memberOverlay);
          } catch { /* storage 不可用时仅恢复内存 */ }
          throw error;
        }
      });
    },
  },

  // B-499-9：支委身份配置语义口（users.role 与 auth_audit 同一交付；失败恢复 users / 审计快照）
  branchCommissioners: {
    apply(data = {}) {
      return _withDelay(async () => {
        const { PersonStore, MEMBER_OVERLAY_KEY } = await import('../services/member/person.js?v=20261024b');
        const { AuthStore } = await import('../services/core/auth.js?v=20261024b');
        const branchId = String(data.branchId || '');
        const snapshot = {
          users: (mockDB.users || []).map((row) => ({ ...row })),
          authAudit: Array.isArray(mockDB.authAudit) ? mockDB.authAudit.map((row) => ({ ...row })) : null,
          auditStorage: (() => { try { return localStorage.getItem('sop_org_os_auth_audit'); } catch { return null; } })(),
          memberOverlay: (() => { try { return localStorage.getItem(MEMBER_OVERLAY_KEY); } catch { return null; } })(),
        };
        try {
          const branch = (mockDB.branches || []).find((row) => row.id === branchId);
          if (!branch) throw Object.assign(new Error(`支部 ${branchId} 不存在`), { type: 'NotFoundError' });
          const targetId = data.personId ? String(data.personId) : '';
          if (!targetId) throw Object.assign(new Error('缺少被配置人（personId）'), { type: 'BadRequestError' });
          const target = PersonStore.getById(targetId);
          if (!target) throw Object.assign(new Error('成员不存在（档案中无该 id）'), { type: 'NotFoundError' });
          const requestedRole = data.role ? String(data.role) : '';
          const action = data.action === 'revoke' || requestedRole === BRANCH_COMMISSIONER_FALLBACK_ROLE ? 'revoke' : 'grant';
          const gateRole = action === 'revoke' ? BRANCH_COMMISSIONER_FALLBACK_ROLE : requestedRole;
          const actorId = data.actorId
            ? String(data.actorId)
            : ((AuthStore.getCurrentUser() || {}).personId || null);
          if (!actorId) throw Object.assign(new Error('登录状态已失效，请重新登录'), { type: 'AuthError' });
          const actor = PersonStore.getById(actorId);
          const deputy = PersonStore.getMembers()
            .find((member) => (member.branchId || DEFAULT_BRANCH_ID) === branchId && member.role === 'deputy-secretary');
          const deny = branchCommissionerWriteDeny({
            actorRole: actor?.role || AuthStore.getUserRole(actorId),
            actorId,
            actorBranchId: branchId,
            targetId,
            targetRole: target.role,
            targetBranchId: target.branchId === null ? null : (target.branchId || branchId),
            secretaryId: branch.secretaryId,
            deputySecretaryId: deputy?.id || null,
            role: gateRole,
          });
          if (deny) throw Object.assign(new Error(deny), { type: 'PermissionError' });
          if (action === 'grant' && !BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(requestedRole)) {
            throw Object.assign(new Error('role 须为组织 / 宣传 / 纪检委员之一'), { type: 'BadRequestError' });
          }
          const nextRole = action === 'revoke' ? BRANCH_COMMISSIONER_FALLBACK_ROLE : requestedRole;
          if (target.role === nextRole) return { ok: true, user: target, audits: [] };

          const index = (mockDB.users || []).findIndex((row) => row.id === targetId);
          const nextUser = index >= 0
            ? { ...mockDB.users[index], role: nextRole }
            : { ...target, role: nextRole };
          mockDB.users = index >= 0
            ? [...mockDB.users.slice(0, index), nextUser, ...mockDB.users.slice(index + 1)]
            : [...(mockDB.users || []), nextUser];
          const saved = await PersonStore.saveMember({ id: targetId, role: nextRole });
          if (!saved || !saved.ok) throw Object.assign(new Error(saved?.reason || '支委身份配置失败'), { type: 'BadRequestError' });

          const before = AuthStore.getAuthorizations();
          if (action === 'grant') {
            if (BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(target.role)) {
              AuthStore.recordProjectRevokes(null, [{ personId: targetId, role: target.role }], actorId);
            }
            const grant = await AuthStore.authorize(actorId, targetId, requestedRole, {});
            if (!grant || !grant.ok) throw Object.assign(new Error('审计留痕写入失败'), { type: 'ApiError' });
          } else {
            AuthStore.recordProjectRevokes(null, [{ personId: targetId, role: target.role }], actorId);
          }
          const audits = AuthStore.getAuthorizations().slice(before.length);
          _saveToStorage();
          return { ok: true, user: nextUser, audits };
        } catch (error) {
          mockDB.users = snapshot.users;
          if (snapshot.authAudit === null) delete mockDB.authAudit;
          else mockDB.authAudit = snapshot.authAudit;
          try {
            if (snapshot.auditStorage === null) localStorage.removeItem('sop_org_os_auth_audit');
            else localStorage.setItem('sop_org_os_auth_audit', snapshot.auditStorage);
            if (snapshot.memberOverlay === null) localStorage.removeItem(MEMBER_OVERLAY_KEY);
            else localStorage.setItem(MEMBER_OVERLAY_KEY, snapshot.memberOverlay);
          } catch { /* storage 不可用时仅恢复内存 */ }
          throw error;
        }
      });
    },
  },

  // P2 党委后台（2026-09-02）：支书任期记录（任命 create / 撤换封口 update to）
  appointmentRecords: {
    list(params = {}) {
      return _withDelay(() => {
        let rows = [...mockDB.appointmentRecords];
        if (params.branchId) rows = rows.filter(r => r.branchId === params.branchId);
        return rows;
      });
    },
    create(data) {
      return _withDelay(() => {
        const row = {
          id: generateId('appt'),
          branchId: data.branchId,
          secretaryId: data.secretaryId,
          appointedBy: data.appointedBy || 'party-staff',
          note: data.note || '',
          from: new Date().toISOString(),
          to: null, // null=现任
        };
        mockDB.appointmentRecords = [...mockDB.appointmentRecords, row];
        _saveToStorage();
        return row;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.appointmentRecords.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`任期记录 ${id} 不存在`), { type: 'NotFoundError' });
        const next = { ...mockDB.appointmentRecords[idx], ...patch };
        mockDB.appointmentRecords = [...mockDB.appointmentRecords.slice(0, idx), next, ...mockDB.appointmentRecords.slice(idx + 1)];
        _saveToStorage();
        return next;
      });
    },
  },

  // P3 党委后台（2026-09-02）：支部上报审批记录（支部提交 create / 党委批驳 update 封口）
  reviewRequests: {
    list(params = {}) {
      return _withDelay(() => {
        let rows = [...mockDB.reviewRequests];
        if (params.branchId) rows = rows.filter(r => r.branchId === params.branchId);
        if (params.status) rows = rows.filter(r => r.status === params.status);
        return rows;
      });
    },
    create(data) {
      return _withDelay(() => {
        const row = {
          id: data.id || generateId('rq'),
          branchId: data.branchId,
          type: data.type === 'develop-node' ? 'develop-node' : 'activity-report',
          title: String(data.title || '').trim(),
          content: String(data.content || '').trim(),
          submittedBy: data.submittedBy,
          status: 'pending',
          decidedBy: null,
          decidedAt: null,
          decisionNote: '',
          createdAt: data.createdAt || new Date().toISOString(),
        };
        mockDB.reviewRequests = [...mockDB.reviewRequests, row];
        _saveToStorage();
        return row;
      });
    },
    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.reviewRequests.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`上报记录 ${id} 不存在`), { type: 'NotFoundError' });
        // 审批封口：已批/已驳的不可再改（回退 pending 视为重新打开，仅允许改注记字段）
        const next = { ...mockDB.reviewRequests[idx], ...patch };
        mockDB.reviewRequests = [...mockDB.reviewRequests.slice(0, idx), next, ...mockDB.reviewRequests.slice(idx + 1)];
        _saveToStorage();
        return next;
      });
    },
  },

  // 2026-09-01 成员变更审批链路（支书点验链路 ③④ 落地；与 server/routes/member.js 同构）
  // 数据闭环：议程记录通过 → 创建申请(pending-org-approval) → 组织委员审批(广播全体支委)
  //          → 支书确认 → 更新成员发展阶段（users.developStage）
  memberChangeRequests: {
    list(params = {}) {
      return _withDelay(() => {
        let rows = [...mockDB.memberChangeRequests];
        if (params.activityId) rows = rows.filter(r => r.activityId === params.activityId);
        if (params.status) rows = rows.filter(r => r.status === params.status);
        return rows;
      });
    },
    create(data) {
      return _withDelay(() => {
        const row = {
          ...data,
          id: generateId('mcr'),
          status: 'pending-org-approval',
          createdAt: new Date().toISOString(),
        };
        mockDB.memberChangeRequests = [...mockDB.memberChangeRequests, row];
        _saveToStorage();
        return row;
      });
    },
    approve(id) {
      return _withDelay(() => {
        const idx = mockDB.memberChangeRequests.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`成员变更申请 ${id} 不存在`), { type: 'NotFoundError' });
        const updated = { ...mockDB.memberChangeRequests[idx], status: 'pending-secretary', approvedAt: new Date().toISOString() };
        mockDB.memberChangeRequests = [
          ...mockDB.memberChangeRequests.slice(0, idx),
          updated,
          ...mockDB.memberChangeRequests.slice(idx + 1),
        ];
        // 2026-10-20 数据生命周期 P1-26：**停止写入 committeeBroadcasts**。
        // 为什么：该域没有任何页面/组件消费（仅删除守卫与成员移出清理会读到），审批通过的
        //   真正送达早已由 NoticeStore 的 member-change-approved 通知完成；继续写只会堆积
        //   只写不读的数据，并让删除守卫误拦。存量行保留可查，不再新增。
        _saveToStorage();
        return updated;
      });
    },
    confirm(id) {
      return _withDelay(async () => {
        const idx = mockDB.memberChangeRequests.findIndex(r => r.id === id);
        if (idx === -1) throw Object.assign(new Error(`成员变更申请 ${id} 不存在`), { type: 'NotFoundError' });
        const row = mockDB.memberChangeRequests[idx];
        // S-1 修复（2026-09-09）：名单对象是成员档案（p*，PersonStore/members 覆盖层），
        // 旧实现写 mockDB.users（u_* 系统账号）→ developStage 实际未更新。改经 PersonStore 落档
        // （与 services/member/member-confirmation.js `_applyApproved` 同法；动态 import 防静态环）。
        // API 模式由 server/routes/member.js 写 users 表（已正确），本分支仅 mock 形态生效。
        if (row.toStage) {
          const { PersonStore } = await import('../services/member/person.js?v=20261024b');
          const saved = await PersonStore.saveMember(
            { id: row.personId, developStage: row.toStage },
            { by: row.confirmedBy || null },
          );
          if (!saved.ok) throw Object.assign(new Error(saved.reason || '成员发展阶段落档失败'), { type: 'BadRequestError' });
        }
        const updated = { ...row, status: 'completed', confirmedAt: new Date().toISOString() };
        mockDB.memberChangeRequests = [
          ...mockDB.memberChangeRequests.slice(0, idx),
          updated,
          ...mockDB.memberChangeRequests.slice(idx + 1),
        ];
        _saveToStorage();
        return updated;
      });
    },
  },

  committeeBroadcasts: {
    list(params = {}) {
      return _withDelay(() => {
        let rows = [...mockDB.committeeBroadcasts];
        if (params.requestId) rows = rows.filter(r => r.requestId === params.requestId);
        return rows;
      });
    },
  },

  // 2026-09-01 线上支委会表态（与 server/routes/committee.js 同构）
  // 闭环：委员异步表态（agree/object/comment）→ 支书汇总 → 截止锁定（votesLocked 写入 activities）
  // 2026-09-12 支书裁定「正式表决无记名 + 匿名模式可选」：anonymous 活动落两段式——
  //   参与记录 {personId, votedAt}（无 position/note，逐人选项不落库）+ tally 行 {tally:{选项:次数}}；
  //   named 活动保持逐人选项落库（现状不变）。口径与 server 同源（ballotModeOfActivity）。
  agendaVotes: {
    list(params = {}) {
      return _withDelay(() => {
        let rows = [...mockDB.agendaVotes];
        if (params.activityId) rows = rows.filter(v => v.activityId === params.activityId);
        return rows;
      });
    },
    create(data) {
      return _withDelay(() => {
        const activity = mockDB.activities.find(a => a.id === data.activityId);
        // 无记名：参与记录 + tally（同人同议题幂等，无逐人选项可回退 → 不可改票、不重复计数）
        if (ballotModeOfActivity(activity) === 'anonymous') {
          const existing = mockDB.agendaVotes.find(v =>
            v.activityId === data.activityId && v.agendaItemId === data.agendaItemId && v.personId === data.personId);
          if (existing) return existing;
          const now = new Date().toISOString();
          const row = {
            id: generateId('av'),
            activityId: data.activityId,
            agendaItemId: data.agendaItemId,
            personId: data.personId,
            votedAt: now,
            ballotMode: 'anonymous',
            createdAt: now,
          };
          const tallyId = `avt-${data.activityId}-${data.agendaItemId}`;
          const prev = mockDB.agendaVotes.find(v => v.id === tallyId);
          const tally = { ...((prev && prev.tally) || {}) };
          tally[data.position] = (Number(tally[data.position]) || 0) + 1;
          mockDB.agendaVotes = [
            ...mockDB.agendaVotes.filter(v => v.id !== tallyId),
            row,
            { id: tallyId, activityId: data.activityId, agendaItemId: data.agendaItemId, ballotMode: 'anonymous', tally, updatedAt: now },
          ];
          _saveToStorage();
          return row;
        }
        // 记名：幂等 upsert（同人同议题覆盖更新，与 committee 路由同构）
        const idx = mockDB.agendaVotes.findIndex(v =>
          v.activityId === data.activityId && v.agendaItemId === data.agendaItemId && v.personId === data.personId);
        if (idx !== -1) {
          const updated = { ...mockDB.agendaVotes[idx], ...data, updatedAt: new Date().toISOString() };
          mockDB.agendaVotes = [
            ...mockDB.agendaVotes.slice(0, idx),
            updated,
            ...mockDB.agendaVotes.slice(idx + 1),
          ];
          _saveToStorage();
          return updated;
        }
        const row = {
          ...data,
          id: generateId('av'),
          createdAt: new Date().toISOString(),
          updatedAt: null,
        };
        mockDB.agendaVotes = [...mockDB.agendaVotes, row];
        _saveToStorage();
        return row;
      });
    },
  },

  // 工作组语义域：成员关系不授予权限，显式 grants 单独保存。
  workgroups: {
    list(params = {}) {
      return _withDelay(() => mockDB.workgroups.filter((row) => !params.branchId || row.branchId === params.branchId));
    },
    members: {
      list(params = {}) {
        return _withDelay(() => mockDB.workgroupMembers.filter((row) => row.status !== 'removed' && (!params.branchId || row.branchId === params.branchId)));
      },
      saveAll(id, data = {}) {
        return _withDelay(() => {
          const workgroup = mockDB.workgroups.find((row) => row.id === id);
          if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
          _assertWorkgroupWritable(workgroup);
          if (!Array.isArray(data.members)) throw Object.assign(new Error('批量保存须提供完整成员列表'), { type: 'ValidationError' });
          const templates = WORKGROUP_PERMISSION_TEMPLATES_BY_KIND[workgroup.kind];
          if (!templates) throw Object.assign(new Error('工作组类型无效'), { type: 'ValidationError' });
          const allowedPermissions = new Set(Object.values(templates).flat());
          // 2026-10-21 批次 499：跨党小组深参的口径与 server PUT /workgroups/:id/members 同源。
          const hostGroup = workgroup.hostGroupId
            ? (_rowById(mockDB.partyGroups, workgroup.hostGroupId) || null) : null;
          const seen = new Set();
          const desired = data.members.map((item) => {
            if (!item || !item.personId || !WORKGROUP_MEMBER_ROLES.includes(item.role)) {
              throw Object.assign(new Error('工作组只登记组织者或深度参与者'), { type: 'ValidationError' });
            }
            const personId = String(item.personId);
            if (seen.has(personId)) throw Object.assign(new Error(`成员重复：${personId}`), { type: 'ConflictError' });
            seen.add(personId);
            const person = mockDB.users.find((row) => row.id === personId) || PEOPLE.find((row) => row.id === personId);
            if (!person) throw Object.assign(new Error(`工作组成员不存在：${personId}`), { type: 'ValidationError' });
            if ((person.branchId || DEFAULT_BRANCH_ID) !== workgroup.branchId) throw Object.assign(new Error('工作组成员须属于同一支部'), { type: 'PermissionError' });
            const templateKey = item.templateKey == null || item.templateKey === '' ? null : String(item.templateKey);
            if (templateKey && !Object.hasOwn(templates, templateKey)) throw Object.assign(new Error(`权限模板无效：${templateKey}`), { type: 'ValidationError' });
            const permissionKeys = item.permissionKeys === undefined
              ? [...(templateKey ? templates[templateKey] : [])] : item.permissionKeys;
            if (!Array.isArray(permissionKeys) || permissionKeys.some((key) => typeof key !== 'string' || !allowedPermissions.has(key))) {
              throw Object.assign(new Error(`成员权限项无效：${personId}`), { type: 'ValidationError' });
            }
            const crossGroup = !!hostGroup && item.role === 'deep'
              && !!person.partyGroup && person.partyGroup !== hostGroup.name;
            if (crossGroup && (workgroup.recruitmentScope !== 'cross-group' || !workgroup.crossGroupCoordinatorId)) {
              throw Object.assign(new Error('跨党小组深度参与者须先由组织委员协调（标记跨组招募并指定协调人）'), { type: 'PermissionError' });
            }
            return {
              personId, role: item.role, templateKey, permissionKeys: [...new Set(permissionKeys)].sort(),
              reason: String(item.reason || '').trim(),
              ...(crossGroup ? { crossGroup: true, coordinatedBy: workgroup.crossGroupCoordinatorId } : {}),
            };
          });
          const sourceKey = workgroup.sourceType === 'activity' ? 'activities' : 'taskforces';
          const source = mockDB[sourceKey].find((row) => row.id === workgroup.sourceId);
          if (!source || (source.branchId || DEFAULT_BRANCH_ID) !== workgroup.branchId) throw Object.assign(new Error('工作组所属业务记录缺失或支部归属不一致'), { type: 'ConflictError' });
          // 组织者默认来自承办党小组；新指定的他组组织者必须已有跨组说明（批次 502，与 server PUT 同源）。
          const organizer = desired.find((row) => row.role === 'organizer');
          if (workgroup.kind === 'activity' && organizer && (source.organizer || null) !== organizer.personId && hostGroup) {
            const person = mockDB.users.find((row) => row.id === organizer.personId) || PEOPLE.find((row) => row.id === organizer.personId);
            const crossGroup = !!person?.partyGroup && person.partyGroup !== hostGroup.name;
            if (crossGroup && !String(source.organizerExceptionReason || '').trim()) {
              throw Object.assign(new Error('组织者一般由承办党小组承担；请填写组织者跨组说明'), { type: 'ValidationError' });
            }
          }

          const now = new Date().toISOString();
          const actorId = (() => { try { return JSON.parse(localStorage.getItem('gsm1921-login-user') || '{}').personId || null; } catch { return null; } })();
          const existingRows = mockDB.workgroupMembers.filter((row) => row.workgroupId === id);
          const existingByPerson = new Map(existingRows.map((row) => [String(row.personId), row]));
          const desiredByPerson = new Map(desired.map((row) => [row.personId, row]));
          const nextMembers = [...mockDB.workgroupMembers];
          for (let index = 0; index < nextMembers.length; index += 1) {
            const row = nextMembers[index];
            if (row.workgroupId === id && row.status !== 'removed' && !desiredByPerson.has(String(row.personId))) {
              nextMembers[index] = { ...row, status: 'removed', removedBy: actorId, removedAt: now };
            }
          }
          for (const member of desired) {
            const previous = existingByPerson.get(member.personId);
            const row = {
              id: `wgm-${encodeURIComponent(id)}-${encodeURIComponent(member.personId)}`, branchId: workgroup.branchId,
              workgroupId: id, personId: member.personId, role: member.role, status: 'active',
              createdBy: previous?.createdBy || actorId, createdAt: previous?.createdAt || now, updatedBy: actorId, updatedAt: now,
              ...(member.crossGroup ? { crossGroup: true, coordinatedBy: member.coordinatedBy } : {}),
            };
            const index = nextMembers.findIndex((item) => item.id === row.id);
            if (index >= 0) nextMembers[index] = row;
            else nextMembers.push(row);
          }

          const oldGrants = mockDB.workgroupGrants.filter((row) => row.workgroupId === id);
          const nextGrants = [...mockDB.workgroupGrants];
          const retained = new Set();
          for (let index = 0; index < nextGrants.length; index += 1) {
            const grant = nextGrants[index];
            if (grant.workgroupId !== id || grant.status !== 'active') continue;
            const member = desiredByPerson.get(String(grant.personId));
            const sameGrant = member && member.permissionKeys.length > 0
              && grant.templateKey === member.templateKey
              && JSON.stringify([...(grant.permissionKeys || [])].sort()) === JSON.stringify(member.permissionKeys)
              && String(grant.reason || '') === member.reason;
            if (sameGrant && !retained.has(member.personId)) { retained.add(member.personId); continue; }
            nextGrants[index] = { ...grant, status: 'revoked', revokedBy: actorId, revokedAt: now,
              revocationReason: member ? 'membership-permissions-replaced' : 'membership-removed' };
          }
          for (const member of desired) {
            if (!member.permissionKeys.length || retained.has(member.personId)) continue;
            nextGrants.push({ id: generateId('wgg'), branchId: workgroup.branchId, workgroupId: id, personId: member.personId,
              templateKey: member.templateKey, permissionKeys: member.permissionKeys, status: 'active', reason: member.reason,
              grantedBy: actorId, grantedAt: now });
          }

          const memberKey = workgroup.kind === 'activity' ? 'assignments' : 'members';
          const originalRows = Array.isArray(source[memberKey]) ? source[memberKey] : [];
          const preserved = originalRows.filter((row) => !WORKGROUP_MEMBER_ROLES.includes(row?.role));
          const prior = new Map(originalRows.filter((row) => WORKGROUP_MEMBER_ROLES.includes(row?.role)).map((row) => [String(row.personId), row]));
          const mirror = desired.map((member) => {
            const cross = member.crossGroup ? { crossGroup: true, coordinatedBy: member.coordinatedBy } : {};
            return workgroup.kind === 'taskforce'
              ? { personId: member.personId, role: member.role, contributions: prior.get(member.personId)?.contributions || [], ...cross }
              : { personId: member.personId, role: member.role, ...cross };
          });
          const updatedSource = { ...source, [memberKey]: [...preserved, ...mirror] };
          if (workgroup.kind === 'activity') updatedSource.organizer = mirror.find((row) => row.role === 'organizer')?.personId || null;

          // Commit mock changes only after all request validation is complete, matching API all-or-nothing semantics.
          mockDB.workgroupMembers = nextMembers;
          mockDB.workgroupGrants = nextGrants;
          mockDB[sourceKey] = mockDB[sourceKey].map((row) => row.id === source.id ? updatedSource : row);
          _saveToStorage();
          return {
            members: mockDB.workgroupMembers.filter((row) => row.workgroupId === id && row.status !== 'removed'),
            grants: mockDB.workgroupGrants.filter((row) => row.workgroupId === id),
          };
        });
      },
      add(id, data) {
        return _withDelay(() => {
          const workgroup = mockDB.workgroups.find((row) => row.id === id);
          if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
          _assertWorkgroupWritable(workgroup);
          const person = mockDB.users.find((row) => row.id === String(data.personId)) || PEOPLE.find((row) => row.id === String(data.personId));
          if (!person) throw Object.assign(new Error('工作组成员不存在'), { type: 'ValidationError' });
          if ((person.branchId || DEFAULT_BRANCH_ID) !== workgroup.branchId) throw Object.assign(new Error('工作组成员须属于同一支部'), { type: 'PermissionError' });
          // 2026-10-21 批次 499：与 server 单加成员同判据。
          const hostGroup = workgroup.hostGroupId ? _rowById(mockDB.partyGroups, workgroup.hostGroupId) : null;
          const crossGroup = !!hostGroup && data.role === 'deep'
            && !!person.partyGroup && person.partyGroup !== hostGroup.name;
          if (crossGroup && (workgroup.recruitmentScope !== 'cross-group' || !workgroup.crossGroupCoordinatorId)) {
            throw Object.assign(new Error('跨党小组深度参与者须先由组织委员协调（标记跨组招募并指定协调人）'), { type: 'PermissionError' });
          }
          // 组织者默认来自承办党小组；他组组织者须已在活动上留跨组说明（批次 502）。
          if (workgroup.kind === 'activity' && data.role === 'organizer' && hostGroup
            && !!person.partyGroup && person.partyGroup !== hostGroup.name) {
            const source = mockDB.activities.find((row) => row.id === workgroup.sourceId);
            if (!String(source?.organizerExceptionReason || '').trim()) {
              throw Object.assign(new Error('组织者一般由承办党小组承担；请填写组织者跨组说明'), { type: 'ValidationError' });
            }
          }
          const memberId = `wgm-${encodeURIComponent(id)}-${encodeURIComponent(String(data.personId))}`;
          const previous = mockDB.workgroupMembers.find((row) => row.id === memberId);
          const row = { ...previous, ...data, id: memberId, branchId: workgroup.branchId, workgroupId: id,
            status: 'active', createdAt: previous?.createdAt || new Date().toISOString(),
            ...(crossGroup ? { crossGroup: true, coordinatedBy: workgroup.crossGroupCoordinatorId } : {}) };
          mockDB.workgroupMembers = [...mockDB.workgroupMembers.filter((item) => item.id !== memberId), row];
          const sourceKey = workgroup.kind === 'activity' ? 'activities' : 'taskforces';
          const sourceIndex = mockDB[sourceKey].findIndex((item) => item.id === workgroup.sourceId);
          if (sourceIndex >= 0) {
            const source = mockDB[sourceKey][sourceIndex];
            const memberKey = workgroup.kind === 'activity' ? 'assignments' : 'members';
            const existingRows = Array.isArray(source[memberKey]) ? source[memberKey] : [];
            const priorMirror = existingRows.find((item) => item.personId === data.personId);
            const members = existingRows.filter((item) => item.personId !== data.personId);
            // R9 Task 4.2：按 personId 合并历史 contributions（与 server POST /members 同口径）。
            members.push({ personId: data.personId, role: data.role,
              ...(workgroup.kind === 'taskforce' ? { contributions: Array.isArray(priorMirror?.contributions) ? priorMirror.contributions : [] } : {}),
              ...(crossGroup ? { crossGroup: true, coordinatedBy: workgroup.crossGroupCoordinatorId } : {}) });
            const updated = { ...source, [memberKey]: members };
            if (workgroup.kind === 'activity') updated.organizer = members.find((item) => item.role === 'organizer')?.personId || null;
            mockDB[sourceKey] = [...mockDB[sourceKey].slice(0, sourceIndex), updated, ...mockDB[sourceKey].slice(sourceIndex + 1)];
          }
          _saveToStorage();
          return row;
        });
      },
      remove(id, personId, metadata = {}) {
        return _withDelay(() => {
          // R10（2026-10-23）：终态工作组的历史成员只读；写入前统一过状态门（与 API 409 同语义）。
          const workgroup = mockDB.workgroups.find((row) => row.id === id);
          if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
          _assertWorkgroupWritable(workgroup);
          const memberId = `wgm-${encodeURIComponent(id)}-${encodeURIComponent(String(personId))}`;
          const current = mockDB.workgroupMembers.find((row) => row.id === memberId);
          if (!current) return null;
          const removedAt = new Date().toISOString();
          const removedBy = metadata.removedBy || null;
          mockDB.workgroupMembers = mockDB.workgroupMembers.map((row) => row.id === memberId
            ? { ...row, status: 'removed', removedAt, removedBy } : row);
          mockDB.workgroupGrants = mockDB.workgroupGrants.map((grant) => grant.workgroupId === id && grant.personId === personId && grant.status === 'active'
            ? { ...grant, status: 'revoked', revokedAt: removedAt, revokedBy, revocationReason: 'membership-removed' } : grant);
          const sourceKey = workgroup.kind === 'activity' ? 'activities' : 'taskforces';
          const sourceIndex = mockDB[sourceKey].findIndex((item) => item.id === workgroup.sourceId);
          if (sourceIndex >= 0) {
            const source = mockDB[sourceKey][sourceIndex];
            const memberKey = workgroup.kind === 'activity' ? 'assignments' : 'members';
            const members = (source[memberKey] || []).filter((item) => item.personId !== personId);
            const updated = { ...source, [memberKey]: members };
            if (workgroup.kind === 'activity') updated.organizer = members.find((item) => item.role === 'organizer')?.personId || null;
            mockDB[sourceKey] = [...mockDB[sourceKey].slice(0, sourceIndex), updated, ...mockDB[sourceKey].slice(sourceIndex + 1)];
          }
          _saveToStorage();
          return null;
        });
      },
    },
    // 2026-10-21 批次 499：跨组招募协调标记，与 server POST /workgroups/:id/coordinate 同构。
    coordinate(id, data = {}) {
      return _withDelay(() => {
        const workgroup = mockDB.workgroups.find((row) => row.id === id);
        if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
        if (workgroup.kind !== 'activity') throw Object.assign(new Error('仅活动工作组需要跨组招募协调'), { type: 'ValidationError' });
        let actorId = null;
        try { actorId = JSON.parse(localStorage.getItem('gsm1921-login-user') || '{}').personId || null; } catch {}
        const actor = actorId ? (_rowById(mockDB.users, actorId) || _rowById(PEOPLE, actorId)) : null;
        // 与 server POST /workgroups/:id/coordinate 同口径：协调不扩大活动写权，也不下放给普通成员。
        if (actor && !['org-commissioner', 'secretary', 'deputy-secretary'].includes(actor.role)) {
          throw Object.assign(new Error('无权限：跨组招募协调由组织委员（或支书 / 副支书）办理'), { type: 'PermissionError' });
        }
        if (workgroup.recruitmentScope !== 'cross-group' || !workgroup.crossGroupCoordinatorId) {
          throw Object.assign(new Error('该活动未标记跨组招募，无需协调'), { type: 'ConflictError' });
        }
        _assertWorkgroupWritable(workgroup);
        const action = data.action || 'complete';
        if (!['complete', 'reset'].includes(action)) throw Object.assign(new Error('协调动作仅支持 complete / reset'), { type: 'ValidationError' });
        const completed = action === 'complete';
        const now = new Date().toISOString();
        const nextGroup = {
          ...workgroup,
          crossGroupCoordinatedBy: completed ? actorId : null,
          crossGroupCoordinatedAt: completed ? now : null,
          updatedBy: actorId, updatedAt: now,
        };
        mockDB.workgroups = mockDB.workgroups.map((row) => row.id === id ? nextGroup : row);
        mockDB.workgroupMembers = mockDB.workgroupMembers.map((row) => (
          row.workgroupId === id && row.status !== 'removed' && row.crossGroup
            ? { ...row, coordinatedBy: completed ? actorId : workgroup.crossGroupCoordinatorId,
              ...(completed ? { coordinatedAt: now } : { coordinatedAt: null }), updatedBy: actorId, updatedAt: now }
            : row
        ));
        const sourceIndex = mockDB.activities.findIndex((item) => item.id === workgroup.sourceId);
        if (sourceIndex >= 0) {
          const source = mockDB.activities[sourceIndex];
          const assignments = (Array.isArray(source.assignments) ? source.assignments : []).map((row) => (
            row.crossGroup
              ? { ...row, coordinatedBy: completed ? actorId : workgroup.crossGroupCoordinatorId, ...(completed ? { coordinatedAt: now } : {}) }
              : row
          ));
          mockDB.activities = [...mockDB.activities.slice(0, sourceIndex), { ...source, assignments },
            ...mockDB.activities.slice(sourceIndex + 1)];
        }
        _saveToStorage();
        return {
          workgroup: nextGroup,
          members: mockDB.workgroupMembers.filter((row) => row.workgroupId === id && row.status !== 'removed'),
        };
      });
    },
    grants: {
      list(id) { return _withDelay(() => mockDB.workgroupGrants.filter((row) => row.workgroupId === id)); },
      listMine() {
        let personId = null;
        try { personId = JSON.parse(localStorage.getItem('gsm1921-login-user') || '{}').personId; } catch {}
        return _withDelay(() => mockDB.workgroupGrants.filter((row) => row.personId === personId && row.status === 'active'));
      },
      create(id, data) {
        return _withDelay(() => {
          const workgroup = mockDB.workgroups.find((row) => row.id === id);
          if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
          _assertWorkgroupWritable(workgroup);
          const member = mockDB.workgroupMembers.find((row) => row.workgroupId === id && row.personId === data.personId && row.status === 'active');
          if (!member) throw Object.assign(new Error('授权对象须先登记为工作组成员'), { type: 'ValidationError' });
          const defaults = WORKGROUP_PERMISSION_TEMPLATES_BY_KIND[workgroup.kind] || {};
          if (data.templateKey && !Object.hasOwn(defaults, data.templateKey)) throw Object.assign(new Error('权限模板无效'), { type: 'ValidationError' });
          const allowed = new Set(Object.values(defaults).flat());
          const permissionKeys = [...new Set(data.permissionKeys || defaults[data.templateKey] || [])];
          if (permissionKeys.some((key) => !allowed.has(key))) throw Object.assign(new Error('权限项不适用于该工作组类型'), { type: 'ValidationError' });
          const grant = { id: generateId('wgg'), branchId: workgroup.branchId, workgroupId: id, personId: data.personId,
            templateKey: data.templateKey || null, permissionKeys,
            status: 'active', grantedBy: data.grantedBy || null, grantedAt: new Date().toISOString(), reason: data.reason || '' };
          mockDB.workgroupGrants = [...mockDB.workgroupGrants.filter((row) => row.id !== grant.id), grant];
          _saveToStorage();
          return grant;
        });
      },
      revoke(id, grantId) {
        return _withDelay(() => {
          const workgroup = mockDB.workgroups.find((row) => row.id === id);
          const current = mockDB.workgroupGrants.find((row) => row.id === grantId);
          if (!workgroup || !current || current.workgroupId !== id) throw Object.assign(new Error('授权记录不存在'), { type: 'NotFoundError' });
          _assertWorkgroupWritable(workgroup);
          mockDB.workgroupGrants = mockDB.workgroupGrants.map((row) => row.id === grantId && row.workgroupId === id
            ? { ...row, status: 'revoked', revokedAt: new Date().toISOString() } : row);
          _saveToStorage();
        });
      },
    },
    tasks: {
      list(id) { return _withDelay(() => mockDB.workgroupTasks.filter((row) => row.workgroupId === id)); },
      create(id, data) { return _withDelay(() => {
        const workgroup = mockDB.workgroups.find((item) => item.id === id);
        if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
        _assertWorkgroupWritable(workgroup);
        const activity = data.activityId && mockDB.activities.find((item) => item.id === data.activityId);
        if (data.activityId && (!activity || (activity.branchId || DEFAULT_BRANCH_ID) !== workgroup.branchId)) throw Object.assign(new Error('任务关联活动须属于同一支部'), { type: 'PermissionError' });
        const row = { ...data, branchId: workgroup.branchId, id: data.id || generateId('wgt'), workgroupId: id, status: 'open', createdAt: new Date().toISOString() };
        if (mockDB.workgroupTasks.some((task) => task.id === row.id)) throw Object.assign(new Error('任务记录 id 已存在'), { type: 'ConflictError' });
        mockDB.workgroupTasks = [...mockDB.workgroupTasks, row]; _saveToStorage(); return row;
      }); },
      update(id, taskId, patch) { return _withDelay(() => {
        const workgroup = mockDB.workgroups.find((item) => item.id === id);
        if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
        const index = mockDB.workgroupTasks.findIndex((task) => task.id === taskId && task.workgroupId === id);
        if (index < 0) throw Object.assign(new Error('工作组任务不存在'), { type: 'NotFoundError' });
        _assertWorkgroupWritable(workgroup);
        const current = mockDB.workgroupTasks[index];
        const allowed = current.status === TaskStatus.OPEN ? [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED]
          : current.status === TaskStatus.IN_PROGRESS ? [TaskStatus.COMPLETED, TaskStatus.CANCELLED] : [];
        if (!allowed.includes(patch?.status)) throw Object.assign(new Error('任务已闭合或状态流转不允许'), { type: 'ConflictError' });
        const at = new Date().toISOString();
        const next = { ...current, status: patch.status, updatedAt: at,
          ...(patch.status === TaskStatus.COMPLETED ? { completedAt: at, completedBy: patch.by || null } : null),
          ...(patch.status === TaskStatus.CANCELLED ? { cancelledAt: at, cancelledBy: patch.by || null, cancellationNote: String(patch.note || '') } : null) };
        mockDB.workgroupTasks = [...mockDB.workgroupTasks.slice(0, index), next, ...mockDB.workgroupTasks.slice(index + 1)];
        _saveToStorage(); return next;
      }); },
    },
    outputs: {
      list(id) { return _withDelay(() => mockDB.workgroupOutputs.filter((row) => row.workgroupId === id)); },
      create(id, data) { return _withDelay(() => {
        const workgroup = mockDB.workgroups.find((item) => item.id === id);
        if (!workgroup) throw Object.assign(new Error('工作组不存在'), { type: 'NotFoundError' });
        _assertWorkgroupWritable(workgroup);
        const task = data.taskId && mockDB.workgroupTasks.find((item) => item.id === data.taskId && item.workgroupId === id);
        const activity = data.activityId && mockDB.activities.find((item) => item.id === data.activityId);
        if (data.taskId && !task) throw Object.assign(new Error('产出关联任务须属于该工作组'), { type: 'PermissionError' });
        if (data.activityId && (!activity || (activity.branchId || DEFAULT_BRANCH_ID) !== workgroup.branchId)) throw Object.assign(new Error('产出关联活动须属于同一支部'), { type: 'PermissionError' });
        const row = { ...data, branchId: workgroup.branchId, id: generateId('wgo'), workgroupId: id, status: OutputStatus.SUBMITTED, submittedAt: new Date().toISOString() };
        mockDB.workgroupOutputs = [...mockDB.workgroupOutputs, row]; _saveToStorage(); return row;
      }); },
    },
  },

  attendanceRosters: {
    list(params = {}) { return _withDelay(() => mockDB.attendanceRosters.filter((row) => !params.activityId || row.activityId === params.activityId)); },
    get(activityId) { return _withDelay(() => mockDB.attendanceRosters.find((row) => row.activityId === activityId) || null); },
    freeze(activityId, personIds) {
      return _withDelay(() => {
        const normalized = [...new Set((personIds || []).map(String))].sort();
        const current = mockDB.attendanceRosters.find((row) => row.activityId === activityId);
        if (current?.frozen) {
          if (JSON.stringify(current.personIds) === JSON.stringify(normalized)) return current;
          throw Object.assign(new Error('已冻结的应到名单不能原位覆盖'), { type: 'ConflictError' });
        }
        const activity = mockDB.activities.find((row) => row.id === activityId);
        const next = { id: `atr-${activityId}`, branchId: activity?.branchId || DEFAULT_BRANCH_ID, activityId, personIds: normalized,
          frozen: true, version: (current?.version || 0) + 1, frozenAt: new Date().toISOString() };
        mockDB.attendanceRosters = [...mockDB.attendanceRosters.filter((row) => row.activityId !== activityId), next];
        _saveToStorage();
        return next;
      });
    },
  },
};

/**
 * 仅恢复「非主服务端集合」到 mockDB（P1 写穿后调用）
 *
 * API 模式下 10 个主服务端集合（activities/tasks/attendances/inspections/
 * taskforces/notices/todos/assignments/makeupTasks + users）以服务器为准
 * （由 init() 拉取覆盖），但 niche 集合与 T-209 新域（文件空间/经验沉淀/
 * 合规引用/子记录/报名/复盘/宣传/档案/外发确认等）在服务器瞬时不可达或
 * 旧版服务器缺表时，从 localStorage 备份恢复它们，避免 API 模式下这些功能空态。
 *
 * 注意：绝不动 10 个主服务端集合。
 * 无数据或解析失败静默跳过（仅 warn）。
 */
export function restoreNicheCollections() {
  if (SANDBOX_MODE) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.actSubRecords && typeof parsed.actSubRecords === 'object') mockDB.actSubRecords = parsed.actSubRecords;
    if (parsed.tfSubRecords && typeof parsed.tfSubRecords === 'object')   mockDB.tfSubRecords  = parsed.tfSubRecords;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    // T-218：imageRecords 已补入 _saveToStorage 序列化字段，此处恢复补全（刷新不再丢图）
    if (Array.isArray(parsed.imageRecords))         mockDB.imageRecords         = parsed.imageRecords;
    // T-209 全栈同步：新域回退恢复（与 _saveToStorage 序列化字段一一对应）
    if (Array.isArray(parsed.signups))         mockDB.signups         = parsed.signups;
    if (Array.isArray(parsed.activityReviews))  mockDB.activityReviews  = parsed.activityReviews;
    if (Array.isArray(parsed.taskforceReviews)) mockDB.taskforceReviews = parsed.taskforceReviews;
    if (Array.isArray(parsed.propTasks))       mockDB.propTasks       = parsed.propTasks;
    if (Array.isArray(parsed.periodicArchives)) mockDB.periodicArchives = parsed.periodicArchives;
    else if (Array.isArray(parsed.weeklyReports)) mockDB.periodicArchives = parsed.weeklyReports;
    if (Array.isArray(parsed.archiveRecords))  mockDB.archiveRecords  = parsed.archiveRecords;
    if (Array.isArray(parsed.externalDispatches)) mockDB.externalDispatches = parsed.externalDispatches;
    if (Array.isArray(parsed.branchDocs)) mockDB.branchDocs = parsed.branchDocs;
    if (Array.isArray(parsed.memberChangeRequests)) mockDB.memberChangeRequests = parsed.memberChangeRequests;
    if (Array.isArray(parsed.committeeBroadcasts)) mockDB.committeeBroadcasts = parsed.committeeBroadcasts;
    if (Array.isArray(parsed.agendaVotes)) mockDB.agendaVotes = parsed.agendaVotes;
    for (const key of ['workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs', 'attendanceRosters']) {
      if (Array.isArray(parsed[key])) mockDB[key] = parsed[key];
    }
    if (Array.isArray(parsed.handoffs)) mockDB.handoffs = parsed.handoffs;
    if (Array.isArray(parsed.thoughtReports)) mockDB.thoughtReports = parsed.thoughtReports;
    // 2026-09-14 批次 25：党小组一等实体（API 模式本地备份回退；支书特批）
    if (Array.isArray(parsed.partyGroups)) mockDB.partyGroups = parsed.partyGroups;
    // 2026-09-14 批次 25：成员流动台账（API 模式本地备份回退）
    if (Array.isArray(parsed.memberFlows)) mockDB.memberFlows = parsed.memberFlows;
    if (Array.isArray(parsed.branches)) mockDB.branches = parsed.branches;
    if (Array.isArray(parsed.appointmentRecords)) mockDB.appointmentRecords = parsed.appointmentRecords;
    // 2026-09-02 党委后台 P3：支部上报审批（API 模式本地备份回退）
    if (Array.isArray(parsed.reviewRequests)) mockDB.reviewRequests = parsed.reviewRequests;
  } catch (e) {
    console.warn('[MockAdapter] restoreNicheCollections 失败（本地备份解析错误，已跳过）：', e);
  }
}
