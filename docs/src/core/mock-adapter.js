// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  mock-adapter.js — Mock 数据适配器实现
//  T-142 阶段2：包装现有 mock.js 服务，实现 DataAdapter 接口
//
//  本文件是 DataAdapter 接口的 mock 实现，操作 mockDB + localStorage。
//  当数据源切换为 'api' 时，本适配器不再被使用。
//
//  Source: content/04_web_design/DATA_ARCHITECTURE.md
// ════════════════════════════════════════════════════════════════

import { mockDB, SCHEMA_VERSION } from './domain.js';
import { generateId } from './id.js';
// 修复（T175）：直接从 ../mock/activities.js 导入 ACTIVITIES，
// 绕过 ../mock/index.js 的 re-export 转发（与 services/mock.js 对齐，
// 消除循环依赖/TDZ 导致的 seed 失败风险）
import { ACTIVITIES } from '../mock/activities.js';
import { SEED_TASKS, SEED_ASSIGNMENTS, SEED_HANDOVERS } from '../mock/seed.js';

const STORAGE_KEY = 'workflowos_branch_db_v1';

/**
 * 内存沙盒模式开关：true 时每次刷新自动清空持久化存储
 * 2026-07-31 修复（T174）：与 services/mock.js 对齐改为 false，
 * 恢复跨刷新持久化能力。两处 SANDBOX_MODE 必须保持一致。
 */
const SANDBOX_MODE = false;

// ── 持久化引擎 ──────────────────────────────────────────────────

function _saveToStorage() {
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
      todos:       mockDB.todos,
    }));
  } catch (e) {
    console.warn('[MockAdapter] saveDB 失败：', e);
  }
}

function _loadFromStorage() {
  if (SANDBOX_MODE) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('workflowos_notices_v1');
    localStorage.removeItem('workflowos_taskforces_v1');
    const legacyKeys = [
      'assignment_records', 'handover_records', 'attendance_records',
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
    if (mockDB.tasks.length === 0) mockDB.tasks = [...SEED_TASKS];
    if (mockDB.assignments.length === 0) mockDB.assignments = [...SEED_ASSIGNMENTS];
    if (mockDB.handovers.length === 0) mockDB.handovers = [...SEED_HANDOVERS];
    return;
  }
  /* 持久化恢复逻辑（SANDBOX_MODE=false 时生效） */
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    // 修复（T174）：localStorage 无数据或数据被污染（核心业务数组为空）时，
    // 回退加载初始 seed 数据，避免首页三个板块显示"暂无数据"。
    if (!raw) {
      _seedInitialData();
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed._schema == null || parsed._schema !== SCHEMA_VERSION) {
      console.warn('[MockAdapter] loadDB 中止：_schema 版本不匹配');
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
    if (Array.isArray(parsed.todos))       mockDB.todos       = parsed.todos;

    // 修复（T174）：恢复后若核心数据仍为空（脏数据保护拒绝 + 数组为空并存），
    // 补齐 seed 数据，防止页面空态。
    if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
      _seedInitialData();
    }
  } catch (e) {
    // 修复（T175）：不再静默吞掉 seed/解析错误——透出真实原因（与 services/mock.js 对齐）
    console.error('[MockAdapter] loadDB 失败（JSON 解析或 seed 错误）：', e);
  }
}

/** 加载初始 seed 数据到 mockDB（仅当对应字段为空时） */
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
  if (mockDB.tasks.length === 0) mockDB.tasks = [...SEED_TASKS];
  if (mockDB.assignments.length === 0) mockDB.assignments = [...SEED_ASSIGNMENTS];
  if (mockDB.handovers.length === 0) mockDB.handovers = [...SEED_HANDOVERS];
  console.info('[MockAdapter] 已加载初始 seed 数据');
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
    _loadFromStorage();
  },

  saveDB() {
    _saveToStorage();
  },

  // ── 资源分组接口 ──────────────────────────────────────────

  activities: {
    list() {
      return _withDelay(() => [...mockDB.activities]);
    },

    create(data) {
      return _withDelay(() => {
        const newItem = {
          ...data,
          id: generateId('act'),
          status: data.status || 'draft',
          visibility: data.visibility || 'group',
          date: data.date || (data.targetDate ? data.targetDate.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          createdBy: data.createdBy || 'u_exec',
          createdAt: new Date().toISOString(),
        };
        mockDB.activities = [...mockDB.activities, newItem];
        _saveToStorage();
        // 派生赋权待办（dynamic import 避免循环依赖）
        import('../services/todo.js').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deriveFromActivityCreate(newItem);
        }).catch(e => console.warn('[MockAdapter] 派生活动赋权待办失败：', e));
        return newItem;
      });
    },

    update(id, patch) {
      return _withDelay(() => {
        const idx = mockDB.activities.findIndex(a => a.id === id);
        if (idx === -1) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        const updated = { ...mockDB.activities[idx], ...patch };
        mockDB.activities = [
          ...mockDB.activities.slice(0, idx),
          updated,
          ...mockDB.activities.slice(idx + 1),
        ];
        return updated;
      });
    },

    delete(id) {
      return _withDelay(() => {
        const prev = mockDB.activities.length;
        mockDB.activities = mockDB.activities.filter(a => a.id !== id);
        if (mockDB.activities.length === prev) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        _saveToStorage();
        import('../services/todo.js').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deleteByActivity(id);
        }).catch(e => console.warn('[MockAdapter] 联动删除待办失败：', e));
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
        mockDB.tasks = mockDB.tasks.map(t =>
          t.activityId === id && t.status !== 'completed' ? { ...t, status: 'completed' } : t
        );
        _saveToStorage();
        import('../services/todo.js').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deriveFromActivityArchive(archived);
        }).catch(e => console.warn('[MockAdapter] 派生活动归档待办失败：', e));
        return archived;
      });
    },

    toggleBrand(id) {
      return _withDelay(() => {
        const idx = mockDB.activities.findIndex(a => a.id === id);
        if (idx === -1) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
        const updated = { ...mockDB.activities[idx], isBrand: !mockDB.activities[idx].isBrand };
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
    list() { return _withDelay(() => [...mockDB.attendances]); },
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
        const tf = { ...data, id: generateId('tf'), createdAt: new Date().toISOString() };
        mockDB.taskforces = [...mockDB.taskforces, tf];
        _saveToStorage();
        import('../services/todo.js').then(({ LifecycleTodoDeriver }) => {
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
    delete(id) {
      return _withDelay(() => {
        mockDB.taskforces = mockDB.taskforces.filter(t => t.id !== id);
        _saveToStorage();
        import('../services/todo.js').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deleteByTaskforce(id);
        }).catch(e => console.warn('[MockAdapter] 联动删除待办失败：', e));
        return { id };
      });
    },
  },

  notices: {
    list() { return _withDelay(() => [...mockDB.notices]); },
    create(data) {
      return _withDelay(() => {
        const notice = { ...data, id: data.id || generateId('notice'), publishDate: data.publishDate || new Date().toISOString().slice(0, 10) };
        mockDB.notices = [...mockDB.notices, notice];
        _saveToStorage();
        import('../services/todo.js').then(({ NoticeTodoDeriver }) => {
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
    list() { return _withDelay(() => [...mockDB.todos]); },
    create(data) {
      return _withDelay(() => {
        const todo = { ...data, id: data.id || generateId('todo_'), createdAt: data.createdAt || new Date().toISOString() };
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
    list() { return _withDelay(() => [...mockDB.assignments]); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('asgn'), createdAt: new Date().toISOString() };
        mockDB.assignments = [...mockDB.assignments, record];
        _saveToStorage();
        return record;
      });
    },
  },

  handovers: {
    list() { return _withDelay(() => [...mockDB.handovers]); },
    create(data) {
      return _withDelay(() => {
        const record = { ...data, id: generateId('hnd'), createdAt: new Date().toISOString() };
        mockDB.handovers = [...mockDB.handovers, record];
        _saveToStorage();
        return record;
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
  },

  complianceReferences: {
    list() { return _withDelay(() => [...mockDB.complianceReferences]); },
    create(data) {
      return _withDelay(() => {
        const ref = { ...data, id: generateId('cmp_') };
        mockDB.complianceReferences = [...mockDB.complianceReferences, ref];
        _saveToStorage();
        return ref;
      });
    },
  },
};

/**
 * 仅恢复「非服务端集合」到 mockDB（P1 写穿后调用）
 *
 * API 模式下 10 个服务端集合以服务器为准（由 init() 拉取覆盖），但
 * 文件空间/经验沉淀/合规引用/子记录等集合 P2 才入后端 —— 本函数从
 * localStorage 备份恢复它们，避免 API 模式下这些功能空态。
 *
 * 注意：绝不动 10 个服务端集合（activities/tasks/.../makeupTasks）。
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
    if (Array.isArray(parsed.complianceReferences)) mockDB.complianceReferences = parsed.complianceReferences;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    // 注：imageRecords 不在两处 saveDB 序列化字段内（备份恒无此键），恢复恒为 undefined，
    // 属无效代码，故不在此恢复（P2 图片表入后端后再从服务端读）
  } catch (e) {
    console.warn('[MockAdapter] restoreNicheCollections 失败（本地备份解析错误，已跳过）：', e);
  }
}
