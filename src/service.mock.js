// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v8.5
//  依赖：domain.js, id.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB, SCHEMA_VERSION } from './domain.js';
import { generateId } from './id.js';

const MOCK_DELAY_MS = 600;
const STORAGE_KEY = 'workflowos_branch_db_v1';

// ── 持久化引擎 ──────────────────────────────────────────────────

/** 将当前 mockDB 序列化到 localStorage */
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _schema:     mockDB._schema,
      users:       mockDB.users,
      activities:  mockDB.activities,
      tasks:       mockDB.tasks,
      attendances: mockDB.attendances,
    }));
  } catch (e) {
    console.warn('[MockAdapter] saveDB 失败：', e);
  }
}

/**
 * 从 localStorage 加载数据到 mockDB。
 * 若 _schema 不匹配当前 SCHEMA_VERSION，则拒绝加载脏数据。
 */
export function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed._schema !== SCHEMA_VERSION) {
      console.warn(
        `[MockAdapter] loadDB 中止：存储的 _schema=${parsed._schema} 与当前 SCHEMA_VERSION=${SCHEMA_VERSION} 不匹配，拒绝加载脏数据。`
      );
      return;
    }
    if (Array.isArray(parsed.activities))  mockDB.activities  = parsed.activities;
    if (Array.isArray(parsed.tasks))       mockDB.tasks       = parsed.tasks;
    if (Array.isArray(parsed.attendances)) mockDB.attendances = parsed.attendances;
    console.info('[MockAdapter] loadDB 成功，activities=' + mockDB.activities.length
      + '，tasks=' + mockDB.tasks.length);
  } catch (e) {
    console.warn('[MockAdapter] loadDB 失败：', e);
  }
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
 * @param {Omit<import('./domain.js').Activity,'id'|'createdAt'>} data
 * @returns {Promise<import('./domain.js').Activity>}
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
      archived:  data.archived !== undefined ? data.archived : false,
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
 * @returns {Promise<import('./domain.js').Activity[]>}
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
 * @param {Partial<import('./domain.js').Activity>} patch - 更新字段
 * @returns {Promise<import('./domain.js').Activity>}
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
    saveDB();
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
    console.info('[MockAdapter] deleteActivity 成功，id=' + id);
    saveDB();
    return { id };
  });
}

/**
 * 归档活动（软删除 + 级联完成从属任务）
 * 将活动的 archived 设为 true，并将其所有从属 task 的 status 设为 completed。
 * @param {string} id - 活动 ID
 * @returns {Promise<import('./domain.js').Activity>}
 */
export function archiveActivity(id) {
  return _withDelay(() => {
    _maybeError('archiveActivity');
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    // Immutable 更新活动：archived = true
    const archived = { ...mockDB.activities[idx], archived: true };
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx),
      archived,
      ...mockDB.activities.slice(idx + 1),
    ];
    // 级联：将所有从属 task 的 status 设为 completed（消灭孤儿任务）
    mockDB.tasks = mockDB.tasks.map(t =>
      t.activityId === id ? { ...t, status: 'completed' } : t
    );
    saveDB();
    console.info('[MockAdapter] archiveActivity 成功，id=' + id
      + '，级联完成从属 tasks 数：' + mockDB.tasks.filter(t => t.activityId === id).length);
    return archived;
  });
}

/**
 * 列出所有任务（只读，无副作用）
 * @returns {Promise<import('./domain.js').Task[]>}
 */
export function listTasks() {
  return _withDelay(() => {
    _maybeError('listTasks');
    return [...mockDB.tasks];
  });
}
