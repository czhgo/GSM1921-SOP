// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：domain.js, id.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB, SCHEMA_VERSION } from './domain.js';
import { generateId } from './id.js';

const MOCK_DELAY_MS = 600;

/** LocalStorage 命名空间键名（含版本隔离） */
const STORAGE_KEY = 'workflowos_branch_db_v1';

// ── 持久化引擎 ──────────────────────────────────────────────────

/**
 * 将当前 mockDB 状态序列化并写入 localStorage
 */
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _schema:     mockDB._schema,
      users:       mockDB.users,
      activities:  mockDB.activities,
      tasks:       mockDB.tasks,
      attendances: mockDB.attendances,
      deliverables: mockDB.deliverables,
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
    if (Array.isArray(parsed.deliverables)) mockDB.deliverables = parsed.deliverables;
    // 注：users 为静态预设数据，不从持久化存储恢复，以避免运行时数据污染
    console.info('[MockAdapter] loadDB 成功，已恢复持久化数据。');
  } catch (e) {
    console.warn('[MockAdapter] loadDB 失败（JSON 解析错误）：', e);
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
 * @returns {Promise<import('./domain.js').Activity>}
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

// ── Task CRUD ────────────────────────────────────────────────────

/**
 * 创建新任务（Immutable 写入 mockDB）
 * @param {Omit<import('./domain.js').Task,'id'|'createdAt'>} data
 * @returns {Promise<import('./domain.js').Task>}
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
 * @returns {Promise<import('./domain.js').Task[]>}
 */
export function listTasks() {
  return _withDelay(() => {
    _maybeError('listTasks');
    return [...mockDB.tasks];
  });
}

// ── Deliverable CRUD ─────────────────────────────────────────────
// Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议
// 产出物清单：考勤汇总表（纪检委员）+ 组织生活会记录（党小组组长）

/**
 * 创建交付物（Immutable 写入 mockDB）
 * @param {Omit<import('./domain.js').Deliverable,'id'>} data
 * @returns {Promise<import('./domain.js').Deliverable>}
 */
export function createDeliverable(data) {
  return _withDelay(() => {
    _maybeError('createDeliverable');
    const newItem = {
      ...data,
      id:     generateId('dlv'),
      status: data.status || 'pending',
    };
    mockDB.deliverables = [...mockDB.deliverables, newItem];
    saveDB();
    console.info('[MockAdapter] createDeliverable 成功，id=' + newItem.id
      + '，type=' + newItem.type + '，owner=' + (newItem.ownerName || newItem.owner));
    return newItem;
  });
}

/**
 * 列出交付物（只读）
 * @param {string} [activityId] - 按活动 ID 过滤；省略则返回全部
 * @returns {Promise<import('./domain.js').Deliverable[]>}
 */
export function listDeliverables(activityId) {
  return _withDelay(() => {
    _maybeError('listDeliverables');
    const result = activityId
      ? mockDB.deliverables.filter(d => d.activityId === activityId)
      : [...mockDB.deliverables];
    return result;
  });
}

/**
 * 更新交付物（Immutable patch）
 * @param {string} id - 交付物 ID
 * @param {Partial<import('./domain.js').Deliverable>} patch - 更新字段
 * @returns {Promise<import('./domain.js').Deliverable>}
 */
export function updateDeliverable(id, patch) {
  return _withDelay(() => {
    _maybeError('updateDeliverable');
    const idx = mockDB.deliverables.findIndex(d => d.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`交付物 ${id} 不存在`), { type: 'NotFoundError' });
    }
    const updated = { ...mockDB.deliverables[idx], ...patch };
    mockDB.deliverables = [
      ...mockDB.deliverables.slice(0, idx),
      updated,
      ...mockDB.deliverables.slice(idx + 1),
    ];
    saveDB();
    console.info('[MockAdapter] updateDeliverable 成功，id=' + id + '，status=' + updated.status);
    return updated;
  });
}

/**
 * 初始化组织生活会产出物模板（为指定活动挂载两类必交产出物）
 * - 考勤汇总表：执行人 纪检委员
 * - 组织生活会记录：执行人 党小组组长
 * Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议
 * @param {string} activityId - 所属活动 ID
 * @returns {Promise<import('./domain.js').Deliverable[]>}
 */
export function seedOrgLifeDeliverables(activityId) {
  return _withDelay(() => {
    _maybeError('seedOrgLifeDeliverables');
    const created = [
      {
        activityId,
        id:        generateId('dlv'),
        type:      'attendance_summary',
        owner:     'disc-commissioner',
        status:    'pending',
        note:      '纪检委员在后台考勤小程序汇总，字段：姓名/学号/发展阶段/所属党小组 [T+3天]',
      },
      {
        activityId,
        id:        generateId('dlv'),
        type:      'meeting_record',
        owner:     'leader',
        ownerName: '党小组组长',
        status:    'pending',
        note:      '组长收集骨干同志检查材料，汇总述职摘要+对照检查精选 [T+5天]',
      },
    ];
    mockDB.deliverables = [...mockDB.deliverables, ...created];
    saveDB();
    console.info('[MockAdapter] seedOrgLifeDeliverables 成功，activityId=' + activityId
      + '，挂载产出物：' + created.map(d => d.type).join('、'));
    return created;
  });
}

// ── Milestone Query ──────────────────────────────────────────────

/**
 * 获取指定场景（scenarioId）的里程碑分组
 * 将 sopDatabase 中的 tasks 按 timeOffset 分组并标注阶段名称。
 * 组织生活会阶段划分：
 *   会前准备 (T-7 至 T-3) → 会中实施 (T=0) → 会后归档 (T+3 至 T+5)
 * Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议
 * @param {string} scenarioId - 场景 ID（如 'org-life'）
 * @param {Array<{scenarioId:string,tasks:Array<{taskId:string,title:string,executor:string,timeOffset:number|null,desc:string}>}>} sopDB - sopDatabase.scenarios 数组
 * @returns {{ phase: string, timeLabel: string, tasks: object[] }[]}
 */
export function getScenarioMilestones(scenarioId, sopDB) {
  const scenario = (sopDB || []).find(s => s.scenarioId === scenarioId);
  if (!scenario) return [];

  // Phase boundary constants (timeOffset in days, T=0 is event day)
  const PRE_MEETING_MAX_OFFSET  = -1;  // timeOffset < 0  → 会前准备
  const POST_MEETING_MIN_OFFSET =  1;  // timeOffset > 0  → 会后归档

  const phaseMap = [
    { phase: '会前准备',  label: 'T-7 ~ T-3 天', test: t => t.timeOffset !== null && t.timeOffset <= PRE_MEETING_MAX_OFFSET },
    { phase: '会中实施',  label: '活动中',         test: t => t.timeOffset === 0 },
    { phase: '会后归档',  label: 'T+3 ~ T+5 天',  test: t => t.timeOffset !== null && t.timeOffset >= POST_MEETING_MIN_OFFSET },
    { phase: '无时间锚点', label: '—',             test: t => t.timeOffset === null },
  ];

  return phaseMap
    .map(({ phase, label, test }) => ({
      phase,
      timeLabel: label,
      tasks: scenario.tasks.filter(test),
    }))
    .filter(group => group.tasks.length > 0);
}
