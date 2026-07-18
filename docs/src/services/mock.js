// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：domain.js, id.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB, SCHEMA_VERSION } from '../core/domain.js';
import { generateId } from '../core/id.js';
import { ACTIVITIES } from '../mock/index.js';
import { SEED_TASKS, SEED_ASSIGNMENTS, SEED_HANDOVERS } from '../mock/seed.js';

const MOCK_DELAY_MS = 600;

/** LocalStorage 命名空间键名（含版本隔离） */
const STORAGE_KEY = 'workflowos_branch_db_v1';

/**
 * 内存沙盒模式开关：设为 true 时，每次刷新自动清空持久化存储，始终使用初始 mock 数据。
 * 设为 false 可恢复跨刷新持久化能力。
 */
const SANDBOX_MODE = true;

// ── 持久化引擎 ──────────────────────────────────────────────────

/**
 * 将当前 mockDB 状态序列化并写入 localStorage
 * 统一全量键架构：所有业务数据通过单一键持久化，消除双重存储
 */
export function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _schema:     mockDB._schema,
      users:       mockDB.users,
      activities:  mockDB.activities,
      tasks:        mockDB.tasks,
      attendances: mockDB.attendances,
      inspections: mockDB.inspections,
      assignments: mockDB.assignments,
      handovers:   mockDB.handovers,
      makeupTasks: mockDB.makeupTasks,
      actSubRecords: mockDB.actSubRecords,
      tfSubRecords:  mockDB.tfSubRecords,
      complianceReferences: mockDB.complianceReferences,
      fileSpaceRecords: mockDB.fileSpaceRecords,
      experienceDeposits: mockDB.experienceDeposits,
      taskforces:  mockDB.taskforces,
      notices:     mockDB.notices,
    }));
  } catch (e) {
    console.warn('[MockAdapter] saveDB 失败：', e);
  }
}

/**
 * 从 localStorage 恢复数据库状态
 * 若数据不存在、解析失败或 _schema 版本不匹配，则拒绝加载脏数据
 */
export function loadDB() {
  if (SANDBOX_MODE) {
    // 清理全量键
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('workflowos_notices_v1');
    localStorage.removeItem('workflowos_taskforces_v1');
    // 清理旧版独立键（兼容性清理）
    const legacyKeys = [
      'assignment_records', 'handover_records', 'attendance_records',
      'inspection_records', 'makeup_tasks', 'act_sub_records',
      'tf_sub_records', 'compliance_references', 'file_space_records',
      'experience_deposits',
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
    if (mockDB.handovers.length === 0) mockDB.handovers = [...SEED_HANDOVERS];
    return;
  }
  /* --- 以下为持久化恢复逻辑（SANDBOX_MODE=false 时生效） ---
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed._schema == null || parsed._schema !== SCHEMA_VERSION) {
      console.warn(
        `[MockAdapter] loadDB 中止：_schema 版本不匹配（存储版本=${parsed._schema}，当前版本=${SCHEMA_VERSION}），拒绝加载脏数据。`
      );
      return;
    }
    if (Array.isArray(parsed.activities))   mockDB.activities   = parsed.activities;
    if (Array.isArray(parsed.tasks))        mockDB.tasks        = parsed.tasks;
    if (Array.isArray(parsed.attendances))  mockDB.attendances  = parsed.attendances;
    if (Array.isArray(parsed.inspections))  mockDB.inspections  = parsed.inspections;
    if (Array.isArray(parsed.assignments))  mockDB.assignments  = parsed.assignments;
    if (Array.isArray(parsed.handovers))    mockDB.handovers    = parsed.handovers;
    if (Array.isArray(parsed.makeupTasks))  mockDB.makeupTasks  = parsed.makeupTasks;
    if (parsed.actSubRecords && typeof parsed.actSubRecords === 'object') mockDB.actSubRecords = parsed.actSubRecords;
    if (parsed.tfSubRecords && typeof parsed.tfSubRecords === 'object')   mockDB.tfSubRecords  = parsed.tfSubRecords;
    if (Array.isArray(parsed.complianceReferences)) mockDB.complianceReferences = parsed.complianceReferences;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    if (Array.isArray(parsed.taskforces))  mockDB.taskforces  = parsed.taskforces;
    if (Array.isArray(parsed.notices))     mockDB.notices     = parsed.notices;
    // 注：users 为静态预设数据，不从持久化存储恢复，以避免运行时数据污染
    console.info('[MockAdapter] loadDB 成功，已恢复持久化数据。');
  } catch (e) {
    console.warn('[MockAdapter] loadDB 失败（JSON 解析错误）：', e);
  }
  --- */
}

/** 模拟随机错误（5% NetworkError + 5% PermissionError = 10% 总错误率） */
function _maybeError(opName) {
  const rand = Math.random();
  if (rand < 0.05) {
    const err = Object.assign(new Error('网络连接失败，请稍后重试'), { type: 'NetworkError' });
    console.warn(`[MockAdapter] ${opName} 失败：NetworkError`);
    throw err;
  }
  if (rand < 0.10) {
    const err = Object.assign(new Error('权限不足，无法执行此操作'), { type: 'PermissionError' });
    console.warn(`[MockAdapter] ${opName} 失败：PermissionError`);
    throw err;
  }
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
    return archived;
  });
}

// ── Brand Activity ──────────────────────────────────────────────

/**
 * 切换活动的品牌标记（书记认定操作）
 * Source: content/design/DATA_ARCHITECTURE.md §1.3
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
// Deliverable CRUD + Milestone Query 已删除（需求上下文保留在 content/design/DATA_ARCHITECTURE.md §2.5 + MANAGEMENT_MODE.md）
// 删除的 API：createDeliverable, listDeliverables, updateDeliverable, seedOrgLifeDeliverables, getScenarioMilestones
// 删除原因：无任何代码消费，奥卡姆剃刀原则；设计文档已完整保留需求上下文
