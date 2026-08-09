﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：domain.js, id.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB, SCHEMA_VERSION } from '../core/domain.js?v=20260808m';
import { generateId } from '../core/id.js?v=20260808m';
import { getDataSource, persist } from '../core/data-adapter.js?v=20260808m';
// 修复（T175）：直接从 mock/activities.js 导入 ACTIVITIES，
// 绕过 mock/index.js 的 re-export 转发（纯 re-export + 循环依赖存在 TDZ 风险，
// 曾导致 loadDB() seed 阶段 ACTIVITIES.length 抛错被静默吞掉）
import { ACTIVITIES } from '../mock/activities.js?v=20260808m';
import { SEED_TASKS, SEED_ASSIGNMENTS, SEED_ARCHIVE_RECORDS, SEED_SIGNUPS } from '../mock/seed.js?v=20260808m';
// Seed 增量合并用（2026-08-05，与 core/mock-adapter.js 对齐）：
// attendance.js/notices.js 为纯数据模块，无指向本文件的循环依赖
import { ATTENDANCE_RECORDS } from '../mock/attendance.js?v=20260808m';
import { MOCK_NOTICES } from '../mock/notices.js?v=20260808m';

const MOCK_DELAY_MS = 600;

/** LocalStorage 命名空间键名（含版本隔离） */
const STORAGE_KEY = 'workflowos_branch_db_v1';

/**
 * 内存沙盒模式开关：设为 true 时，每次刷新自动清空持久化存储，始终使用初始 mock 数据。
 * 设为 false 可恢复跨刷新持久化能力。
 * 
 * 2026-07-31 书记指出"很多数据显示还没有恢复"，根因是 SANDBOX_MODE=true 导致数据丢失。
 * 已修复：关闭沙盒模式，恢复跨刷新持久化能力。
 */
const SANDBOX_MODE = false;

// ── 持久化引擎 ──────────────────────────────────────────────────

/**
 * 将当前 mockDB 状态序列化并写入 localStorage
 * 统一全量键架构：所有业务数据通过单一键持久化，消除双重存储
 */
export function saveDB() {
  // 持久化守卫（2026-08-05）：loadDB 完成（mockDB._loaded）前拒绝写入，
  // 防止加载早期以空数据覆盖 localStorage 中的用户数据（与 core/mock-adapter.js 对齐）。
  if (!mockDB._loaded) {
    console.warn('[MockAdapter] 跳过持久化写入：mockDB 尚未加载（loadDB 未完成），防止空数据覆盖');
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _schema:     mockDB._schema,
      users:       mockDB.users,
      activities:  mockDB.activities,
      tasks:        mockDB.tasks,
      attendances: mockDB.attendances,
      inspections: mockDB.inspections,
      assignments: mockDB.assignments,
      makeupTasks: mockDB.makeupTasks,
      actSubRecords: mockDB.actSubRecords,
      tfSubRecords:  mockDB.tfSubRecords,
      complianceReferences: mockDB.complianceReferences,
      fileSpaceRecords: mockDB.fileSpaceRecords,
      experienceDeposits: mockDB.experienceDeposits,
      taskforces:  mockDB.taskforces,
      notices:     mockDB.notices,
      todos:       mockDB.todos,
      // T233 报名渠道：报名记录持久化（2026-08-08 修复：此前漏写导致刷新即丢）
      signups:     mockDB.signups,
      // 2026-08-05 假操作修复：复盘/宣传/公邮域补入持久化（刷新不再丢失）
      activityReviews: mockDB.activityReviews,
      taskforceReviews: mockDB.taskforceReviews,
      propTasks:     mockDB.propTasks,
      weeklyReports: mockDB.weeklyReports,
      archiveRecords: mockDB.archiveRecords,
      mailboxConfig:  mockDB.mailboxConfig,
      mailboxHistory: mockDB.mailboxHistory,
    }));
    // 2026-08-06 扎口修复（Z1）：API 模式下本地备份已写，仍需触发全量快照写穿，
    // 否则 BranchService 写操作（创建/删除/归档/品牌/任务状态）不会同步服务器，刷新即还原。
    if (getDataSource() === 'api') {
      persist();
    }
  } catch (e) {
    console.warn('[MockAdapter] saveDB 失败：', e);
  }
}

/**
 * 从 localStorage 恢复数据库状态
 * 若数据不存在、解析失败或 _schema 版本不匹配，则拒绝加载脏数据
 */
export function loadDB() {
  // API 模式由 init() 从服务器填充，跳过 localStorage 恢复防覆盖
  // （C1 读路径守卫：后端数据不得被本地旧备份冲掉）
  if (getDataSource() === 'api') {
    // 持久化守卫解锁：API 模式数据由 data-adapter.init() 填充，允许本地备份写
    mockDB._loaded = true;
    return;
  }
  if (SANDBOX_MODE) {
    // 清理全量键
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('workflowos_notices_v1');
    localStorage.removeItem('workflowos_taskforces_v1');
    // 清理旧版独立键（兼容性清理）
    const legacyKeys = [
      'assignment_records', 'attendance_records',
      'inspection_records', 'makeup_tasks', 'act_sub_records',
      'tf_sub_records', 'compliance_references', 'file_space_records',
      'experience_deposits', 'gsm1921-auth-records',
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
    if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
      mockDB.activities = ACTIVITIES.map(a => ({
        ...a,
        visibility: a.visibility || 'branch',
        executor: a.organizer || 'u_exec',
        supervisor: null,
        createdBy: a.organizer || 'u_exec',
        createdAt: a.date || new Date().toISOString(),
      }));
    }
    // 注入种子数据（仅当对应字段为空时）
    if (mockDB.tasks.length === 0) mockDB.tasks = [...SEED_TASKS];
    if (mockDB.assignments.length === 0) mockDB.assignments = [...SEED_ASSIGNMENTS];
    mockDB._loaded = true;
    return;
  }
  // --- 持久化恢复逻辑（SANDBOX_MODE=false 时生效） ---
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    
    // 如果 localStorage 中没有数据，加载初始 mock 数据
    if (!raw) {
      console.info('[MockAdapter] localStorage 中无数据，加载初始 mock 数据。');
      _seedInitialData();
      mockDB._loaded = true;
      return;
    }
    
    const parsed = JSON.parse(raw);
    if (parsed._schema == null || parsed._schema !== SCHEMA_VERSION) {
      console.warn(
        `[MockAdapter] loadDB 中止：_schema 版本不匹配（存储版本=${parsed._schema}，当前版本=${SCHEMA_VERSION}），拒绝加载脏数据。`
      );
      mockDB._loaded = true;
      return;
    }
    if (Array.isArray(parsed.activities))   mockDB.activities   = parsed.activities;
    if (Array.isArray(parsed.tasks))        mockDB.tasks        = parsed.tasks;
    if (Array.isArray(parsed.attendances))  mockDB.attendances  = parsed.attendances;
    if (Array.isArray(parsed.inspections))  mockDB.inspections  = parsed.inspections;
    if (Array.isArray(parsed.assignments))  mockDB.assignments  = parsed.assignments;
    if (Array.isArray(parsed.makeupTasks))  mockDB.makeupTasks  = parsed.makeupTasks;
    if (parsed.actSubRecords && typeof parsed.actSubRecords === 'object') mockDB.actSubRecords = parsed.actSubRecords;
    if (parsed.tfSubRecords && typeof parsed.tfSubRecords === 'object')   mockDB.tfSubRecords  = parsed.tfSubRecords;
    if (Array.isArray(parsed.complianceReferences)) mockDB.complianceReferences = parsed.complianceReferences;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    if (Array.isArray(parsed.taskforces))  mockDB.taskforces  = parsed.taskforces;
    if (Array.isArray(parsed.notices))     mockDB.notices     = parsed.notices;
    if (Array.isArray(parsed.todos))       mockDB.todos       = parsed.todos;
    if (Array.isArray(parsed.signups))     mockDB.signups     = parsed.signups;
    // 2026-08-05 假操作修复：复盘/宣传/公邮域恢复（刷新不再丢失）
    if (Array.isArray(parsed.activityReviews))  mockDB.activityReviews  = parsed.activityReviews;
    if (Array.isArray(parsed.taskforceReviews)) mockDB.taskforceReviews = parsed.taskforceReviews;
    if (Array.isArray(parsed.propTasks))     mockDB.propTasks     = parsed.propTasks;
    if (Array.isArray(parsed.weeklyReports)) mockDB.weeklyReports = parsed.weeklyReports;
    if (Array.isArray(parsed.archiveRecords)) mockDB.archiveRecords = parsed.archiveRecords;
    if (parsed.mailboxConfig && typeof parsed.mailboxConfig === 'object') mockDB.mailboxConfig = parsed.mailboxConfig;
    if (Array.isArray(parsed.mailboxHistory)) mockDB.mailboxHistory = parsed.mailboxHistory;
    // 注：users 为静态预设数据，不从持久化存储恢复，以避免运行时数据污染
    console.info('[MockAdapter] loadDB 成功，已恢复持久化数据。');
    // 持久化守卫解锁：恢复完成，允许后续写入（须在下方 seed 回填 saveDB 之前）
    mockDB._loaded = true;
    // Seed 增量合并（2026-08-05，与 core/mock-adapter.js 对齐）：老用户持久化数据
    // 全量替换恢复，缺失的新种子记录按 id 补齐（act-28 / 8 月考勤全覆盖 / 8 月通知），
    // 保留用户已确认/已读/编辑过的既有记录。合并后有新增即落盘，保证下次加载幂等。
    if (_mergeNewSeedRecords()) {
      saveDB();
    }
    // 修复（T175）：恢复后若核心数据仍为空（历史被污染的 localStorage 中
    // activities/tasks 双 0 被持久化），回填 seed 数据，防止页面空态。
    if (mockDB.activities.length === 0) {
      console.warn('[MockAdapter] 恢复后 activities 仍为空，回填初始 seed 数据。');
      _seedInitialData();
      saveDB();
    }
  } catch (e) {
    // 修复（T175）：不再静默吞掉 seed/解析错误——透出真实原因，
    // 避免"页面空态但控制台无报错"的假象。
    console.error('[MockAdapter] loadDB 失败（JSON 解析或 seed 错误）：', e);
    mockDB._loaded = true;
  }
}

/**
 * 加载初始 seed 数据到 mockDB（仅当对应字段为空时）
 * 抽出为独立函数：供 !raw 分支、恢复后回填守卫共用（对齐 core/mock-adapter.js）
 */
function _seedInitialData() {
  if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
    mockDB.activities = ACTIVITIES.map(a => ({
      ...a,
      visibility: a.visibility || 'branch',
      executor: a.organizer || 'u_exec',
      supervisor: null,
      createdBy: a.organizer || 'u_exec',
      createdAt: a.date || new Date().toISOString(),
    }));
  }
  // 注入种子数据（仅当对应字段为空时）
  if (mockDB.tasks.length === 0) mockDB.tasks = [...SEED_TASKS];
  if (mockDB.assignments.length === 0) mockDB.assignments = [...SEED_ASSIGNMENTS];
  if (mockDB.archiveRecords.length === 0) mockDB.archiveRecords = [...SEED_ARCHIVE_RECORDS];
  if (mockDB.signups.length === 0) mockDB.signups = [...SEED_SIGNUPS];
}

/**
 * Seed 种子同步（2026-08-05 二次修订，与 core/mock-adapter.js 的 _mergeNewSeedRecords 完全对齐）：
 * 持久化恢复为「全量替换」，老用户 localStorage 中不会出现后续变更的 mock 种子。
 * 本函数对种子记录（id 匹配种子模式）执行三步同步：
 *   1. 已移除的种子（如 act-28 / notice-109）→ 删除
 *   2. 内容已变更的种子（如 act-26 日期 8/7→8/1）→ 以当前种子覆盖
 *   3. 缺失的新种子（如 8 月考勤全覆盖）→ 补齐
 * 保留用户字段：notices.read（已读状态）、attendances.recordedBy（纪检确认人）；
 * 非种子记录（用户创建：act_*、att_*、notice-{13位时间戳}）原样保留。
 * @returns {boolean} 是否有变更（有则调用方需落盘）
 */
function _mergeNewSeedRecords() {
  let changed = false;

  // ── 活动：种子同步 ──────────────────────────────────────────
  const actSeedById = new Map(ACTIVITIES.map(a => [a.id, a]));
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
      executor: seed.organizer || 'u_exec',
      supervisor: null,
      createdBy: seed.organizer || 'u_exec',
      createdAt: seed.date || a.createdAt,
    };
    if (JSON.stringify(merged) !== JSON.stringify(a)) changed = true;
    actOut.push(merged);
  }
  const actExist = new Set(actOut.map(a => a.id));
  ACTIVITIES.forEach(a => {
    if (actExist.has(a.id)) return;
    actOut.push({ ...a, visibility: a.visibility || 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() });
    changed = true;
  });
  mockDB.activities = actOut;

  // ── 考勤：种子同步（覆盖时保留 recordedBy 纪检确认人） ────────
  const attSeedById = new Map(ATTENDANCE_RECORDS.map(r => [r.id, r]));
  const attOut = [];
  for (const r of mockDB.attendances) {
    if (!/^att\d+$/.test(r.id)) { attOut.push(r); continue; }
    const seed = attSeedById.get(r.id);
    if (!seed) { changed = true; continue; }
    // 2026-08-07 T232：保留 recordedBy（纪检确认人）+ secretaryConfirmedAt（书记复核标记）
    const merged = { ...seed, recordedBy: r.recordedBy || seed.recordedBy, secretaryConfirmedAt: r.secretaryConfirmedAt };
    if (JSON.stringify(merged) !== JSON.stringify(r)) changed = true;
    attOut.push(merged);
  }
  const attExist = new Set(attOut.map(r => r.id));
  ATTENDANCE_RECORDS.forEach(s => {
    if (!attExist.has(s.id)) { attOut.push(s); changed = true; }
  });
  mockDB.attendances = attOut;

  // ── 通知：种子同步（覆盖时保留 read 已读状态） ────────────────
  const noticeSeedById = new Map(MOCK_NOTICES.map(n => [n.id, n]));
  const noticeOut = [];
  for (const n of mockDB.notices) {
    if (!/^notice-\d{3}$/.test(n.id)) { noticeOut.push(n); continue; }
    const seed = noticeSeedById.get(n.id);
    if (!seed) { changed = true; continue; }
    // 2026-08-08 归档闭环：保留 read（已读）+ archived（归档标记），seed 仅兜底缺失值
    const merged = { ...seed, read: n.read ?? seed.read, archived: n.archived ?? seed.archived };
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
    // 2026-08-07 T232：保留用户字段（secretaryConfirmedAt 书记复核标记），种子仅兜底缺失值
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

  if (changed) console.info('[MockAdapter] Seed 种子同步：活动/考勤/通知/档案归档/报名与种子基线对齐（删除已移除种子、覆盖已变更种子、补齐缺失种子）');
  return changed;
}

/** 随机错误模拟（已禁用）
 * 原设计：5% NetworkError + 5% PermissionError = 10% 总错误率
 * 禁用原因：随机错误触发 loadWorkspaceData fallback 路径，返回静态 ACTIVITIES
 * 而非 mockDB 当前数据，导致跨页面数据不一致（D-248 数据统一修复）
 * 后端接入后，真实错误由后端返回，无需前端模拟
 */
function _maybeError(opName) {
  // no-op：已禁用随机错误模拟
}

/** 包装为带固定延迟的 Promise */
function _withDelay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try { resolve(fn()); }
      catch (e) { reject(e); }
    }, MOCK_DELAY_MS);
  });
}

// ── Public API ──────────────────────────────────────────────────

/**
 * 创建新活动（Immutable 写入 mockDB）
 * 10% 概率触发随机错误：5% NetworkError + 5% PermissionError
 * @param {Omit<import('../core/domain.js').Activity,'id'|'createdAt'>} data
 * @returns {Promise<import('../core/domain.js').Activity>}
 */
export function createActivity(data) {
  return _withDelay(() => {
    _maybeError('createActivity');
    const newItem = {
      ...data,
      id:        generateId('act'),
      status:    data.status    || 'draft',
      visibility: data.visibility || 'group',
      date:      data.date || (data.targetDate ? data.targetDate.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      createdBy: data.createdBy || 'u_exec',
      createdAt: new Date().toISOString(),
    };
    // Immutable 写入：展开符替换整个数组，禁止 push/splice
    mockDB.activities = [...mockDB.activities, newItem];
    saveDB();
    console.info('[MockAdapter] createActivity 成功，id=' + newItem.id
      + '，当前 activities 总数：' + mockDB.activities.length);
    // 派生赋权待办（最小三成本原则·阶段1C-3）
    // T-190：创建时已内联赋权（assignments 非空）则不再派生；未选人保留待办兜底
    if (!newItem.assignments || newItem.assignments.length === 0) {
      import('./todo.js?v=20260808m').then(({ LifecycleTodoDeriver }) => {
        LifecycleTodoDeriver.deriveFromActivityCreate(newItem);
      }).catch(e => console.warn('[MockAdapter] 派生活动赋权待办失败：', e));
    }
    return newItem;
  });
}

/**
 * 列出所有活动（只读，无副作用）
 * @returns {Promise<import('../core/domain.js').Activity[]>}
 */
export function listActivities() {
  return _withDelay(() => {
    _maybeError('listActivities');
    return [...mockDB.activities];
  });
}

/**
 * 更新活动（Immutable patch）
 * @param {string} id - 活动 ID
 * @param {Partial<import('../core/domain.js').Activity>} patch - 更新字段
 * @returns {Promise<import('../core/domain.js').Activity>}
 */
export function updateActivity(id, patch) {
  return _withDelay(() => {
    _maybeError('updateActivity');
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    const updated = { ...mockDB.activities[idx], ...patch };
    // Immutable 替换：生成全新数组，禁止直接 activities[idx] = ...
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx),
      updated,
      ...mockDB.activities.slice(idx + 1),
    ];
    console.info('[MockAdapter] updateActivity 成功，id=' + id);
    return updated;
  });
}

/**
 * 删除活动（Immutable 过滤）
 * @param {string} id - 活动 ID
 * @returns {Promise<{id: string}>}
 */
export function deleteActivity(id) {
  return _withDelay(() => {
    _maybeError('deleteActivity');
    const prev = mockDB.activities.length;
    mockDB.activities = mockDB.activities.filter(a => a.id !== id);
    if (mockDB.activities.length === prev) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    saveDB();
    console.info('[MockAdapter] deleteActivity 成功，id=' + id);
    // 联动删除关联待办（避免遗留孤儿待办）
    import('./todo.js?v=20260808m').then(({ LifecycleTodoDeriver }) => {
      LifecycleTodoDeriver.deleteByActivity(id);
    }).catch(e => console.warn('[MockAdapter] 联动删除待办失败：', e));
    return { id };
  });
}

/**
 * 归档活动（软删除）+ 级联将下属 Task 全部设为 completed（消灭孤儿任务）
 * 归档后，该活动的 archived 字段置为 true，所有关联 Task 的 status 自动设为 'completed'，并持久化。
 * @param {string} id - 活动 ID
 * @returns {Promise<import('../core/domain.js').Activity>}
 */
export function archiveActivity(id) {
  return _withDelay(() => {
    _maybeError('archiveActivity');
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    // 软删除：将 archived 设为 true（Immutable patch）
    const archived = { ...mockDB.activities[idx], archived: true };
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx),
      archived,
      ...mockDB.activities.slice(idx + 1),
    ];
    // 级联归档：将所有下属 Task 的 status 设为 completed（消灭孤儿任务）
    mockDB.tasks = mockDB.tasks.map(t =>
      t.activityId === id && t.status !== 'completed' ? { ...t, status: 'completed' } : t
    );
    saveDB();
    console.info('[MockAdapter] archiveActivity 成功，id=' + id
      + '，级联完成下属 tasks。');
    // 派生归档待办给宣传委员（最小三成本原则·阶段1C-3）
    import('./todo.js?v=20260808m').then(({ LifecycleTodoDeriver }) => {
      LifecycleTodoDeriver.deriveFromActivityArchive(archived);
    }).catch(e => console.warn('[MockAdapter] 派生活动归档待办失败：', e));
    return archived;
  });
}

// ── Brand Activity ──────────────────────────────────────────────

/**
 * 切换活动的品牌标记（书记认定操作）
 * Source: content/04_web_design/DATA_ARCHITECTURE.md §1.3
 * @param {string} id - 活动 ID
 * @returns {Promise<import('../core/domain.js').Activity>}
 */
export function toggleBrand(id) {
  return _withDelay(() => {
    _maybeError('toggleBrand');
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    const updated = { ...mockDB.activities[idx], isBrand: !mockDB.activities[idx].isBrand };
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx),
      updated,
      ...mockDB.activities.slice(idx + 1),
    ];
    saveDB();
    console.info('[MockAdapter] toggleBrand 成功，id=' + id + '，isBrand=' + updated.isBrand);
    return updated;
  });
}

// ── Task CRUD ────────────────────────────────────────────────────

/**
 * 创建新任务（Immutable 写入 mockDB）
 * @param {Omit<import('../core/domain.js').Task,'id'|'createdAt'>} data
 * @returns {Promise<import('../core/domain.js').Task>}
 */
export function createTask(data) {
  return _withDelay(() => {
    _maybeError('createTask');
    const newTask = {
      ...data,
      id:        generateId('tsk'),
      status:    data.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    mockDB.tasks = [...mockDB.tasks, newTask];
    saveDB();
    console.info('[MockAdapter] createTask 成功，id=' + newTask.id
      + '，当前 tasks 总数：' + mockDB.tasks.length);
    return newTask;
  });
}

/**
 * 列出所有任务（只读，无副作用）
 * @returns {Promise<import('../core/domain.js').Task[]>}
 */
export function listTasks() {
  return _withDelay(() => {
    _maybeError('listTasks');
    return [...mockDB.tasks];
  });
}

/**
 * 更新任务状态（Immutable patch）
 * 同步函数：直接修改 mockDB.tasks，返回更新后的新数组快照。
 * 适用于 UI 层任务状态切换（无需异步等待，保证即时响应）。
 * @param {string} taskId - 任务 ID（匹配 mockDB.tasks 中的 id 字段）
 * @param {Partial<import('../core/domain.js').Task>} patch - 更新字段
 * @returns {import('../core/domain.js').Task[]} 更新后的 tasks 数组快照
 */
export function updateTask(taskId, patch) {
  const idx = mockDB.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) {
    console.warn('[MockAdapter] updateTask：未找到任务 id=' + taskId);
    return [...mockDB.tasks];
  }
  const updated = { ...mockDB.tasks[idx], ...patch };
  mockDB.tasks = [
    ...mockDB.tasks.slice(0, idx),
    updated,
    ...mockDB.tasks.slice(idx + 1),
  ];
  saveDB();
  console.info('[MockAdapter] updateTask 成功，id=' + taskId + '，status=' + updated.status);
  return [...mockDB.tasks];
}
// Deliverable CRUD + Milestone Query 已删除（需求上下文保留在 content/04_web_design/DATA_ARCHITECTURE.md §2.5）
// 删除的 API：createDeliverable, listDeliverables, updateDeliverable, seedOrgLifeDeliverables, getScenarioMilestones
// 删除原因：无任何代码消费，奥卡姆剃刀原则；设计文档已完整保留需求上下文
