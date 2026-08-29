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

import { mockDB, SCHEMA_VERSION } from './domain.js?v=20260829k';
import { generateId } from './id.js?v=20260829k';
// 修复（T175）：直接从 ../mock/activities.js 导入 ACTIVITIES，
// 绕过 ../mock/index.js 的 re-export 转发（与 services/mock.js 对齐，
// 消除循环依赖/TDZ 导致的 seed 失败风险）
import { ACTIVITIES } from '../mock/activities.js?v=20260829k';
import { SEED_TASKS, SEED_ASSIGNMENTS, SEED_ARCHIVE_RECORDS, SEED_SIGNUPS } from '../mock/seed.js?v=20260829k';
// Seed 增量合并用（2026-08-05）：attendance.js/notices.js 为纯数据模块，
// 经 services/person.js（只依赖 domain/people）→ 无指向本文件的循环依赖
import { ATTENDANCE_RECORDS } from '../mock/attendance.js?v=20260829k';
import { MOCK_NOTICES } from '../mock/notices.js?v=20260829k';

const STORAGE_KEY = 'workflowos_branch_db_v1';

/**
 * 内存沙盒模式开关：true 时每次刷新自动清空持久化存储
 * 2026-07-31 修复（T174）：与 services/mock.js 对齐改为 false，
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
      imageRecords:     mockDB.imageRecords,
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
      // 2026-08-10 文件流内控：外发确认记录持久化
      externalDispatches: mockDB.externalDispatches,
      // 2026-08-18 支部文件：持久化
      branchDocs: mockDB.branchDocs,
      // 2026-08-29 T-304 C2 三委数据交接：持久化（刷新不丢回执实体）
      handoffs: mockDB.handoffs,
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
    if (Array.isArray(parsed.makeupTasks))  mockDB.makeupTasks  = parsed.makeupTasks;
    if (parsed.actSubRecords && typeof parsed.actSubRecords === 'object') mockDB.actSubRecords = parsed.actSubRecords;
    if (parsed.tfSubRecords && typeof parsed.tfSubRecords === 'object')   mockDB.tfSubRecords  = parsed.tfSubRecords;
    if (Array.isArray(parsed.complianceReferences)) mockDB.complianceReferences = parsed.complianceReferences;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    if (Array.isArray(parsed.imageRecords))         mockDB.imageRecords         = parsed.imageRecords;
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
    if (Array.isArray(parsed.externalDispatches)) mockDB.externalDispatches = parsed.externalDispatches;
    if (Array.isArray(parsed.branchDocs)) mockDB.branchDocs = parsed.branchDocs;
    if (Array.isArray(parsed.handoffs)) mockDB.handoffs = parsed.handoffs;

    // 修复（T174）：恢复后若核心数据仍为空（脏数据保护拒绝 + 数组为空并存），
    // 补齐 seed 数据，防止页面空态。
    if (mockDB.activities.length === 0 && ACTIVITIES.length > 0) {
      _seedInitialData();
    }

    // Seed 增量合并（2026-08-05）：老用户持久化数据全量替换恢复，缺失的新种子记录按 id 补齐
    return _mergeNewSeedRecords();
  } catch (e) {
    // 修复（T175）：不再静默吞掉 seed/解析错误——透出真实原因（与 services/mock.js 对齐）
    console.error('[MockAdapter] loadDB 失败（JSON 解析或 seed 错误）：', e);
    return false;
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
  if (mockDB.archiveRecords.length === 0) mockDB.archiveRecords = [...SEED_ARCHIVE_RECORDS];
  if (mockDB.signups.length === 0) mockDB.signups = [...SEED_SIGNUPS];
  console.info('[MockAdapter] 已加载初始 seed 数据');
}

/**
 * Seed 种子同步（2026-08-05 二次修订）：
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
    const merged = _loadFromStorage();
    // 持久化守卫解锁：无论恢复成功与否，加载流程已结束，后续写入允许
    mockDB._loaded = true;
    // Seed 增量合并产生的缺省记录落盘，避免下次加载重复合并
    if (merged) _saveToStorage();
    // 数据加载完成广播：通知 header 角标等初始快照据实刷新（与 data-loader 的
    // notifyDataLoaded 双保险；此处覆盖 data-adapter.init() mock 分支等直连路径）
    import('./data-adapter.js?v=20260829k').then(({ notifyDataLoaded }) => notifyDataLoaded())
      .catch(() => {});
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
        import('../services/todo.js?v=20260829k').then(({ LifecycleTodoDeriver }) => {
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
        // 2026-08-27 T-283 生命周期修复：彻底删除活动须联动清理全部子记录（与 mock.js 同构）
        for (const key of ['tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks']) {
          if (Array.isArray(mockDB[key])) mockDB[key] = mockDB[key].filter(x => x.activityId !== id);
        }
        if (Array.isArray(mockDB.signups)) mockDB.signups = mockDB.signups.filter(s => !(s.sourceType === 'activity' && s.sourceId === id));
        if (Array.isArray(mockDB.notices)) mockDB.notices = mockDB.notices.filter(n => !(n.targetType === 'activity' && n.targetId === id));
        _saveToStorage();
        import('../services/todo.js?v=20260829k').then(({ LifecycleTodoDeriver }) => {
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
        import('../services/todo.js?v=20260829k').then(({ LifecycleTodoDeriver }) => {
          LifecycleTodoDeriver.deriveFromActivityArchive(archived);
        }).catch(e => console.warn('[MockAdapter] 派生活动归档待办失败：', e));
        // 2026-08-08 归档闭环：活动归档 → 配套通知随之一并归档，退出工作区
        import('../services/notice.js?v=20260829k').then(({ NoticeStore }) => {
          NoticeStore.archiveBySource('activity', id);
        }).catch(e => console.warn('[MockAdapter] 归档关联通知失败：', e));
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
        import('../services/todo.js?v=20260829k').then(({ LifecycleTodoDeriver }) => {
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
        import('../services/todo.js?v=20260829k').then(({ LifecycleTodoDeriver }) => {
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
        import('../services/todo.js?v=20260829k').then(({ NoticeTodoDeriver }) => {
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

  branchDocs: {
    list() { return _withDelay(() => [...mockDB.branchDocs]); },
    create(data) {
      return _withDelay(() => {
        const doc = { ...data, id: generateId('bd'), uploadedAt: new Date().toISOString() };
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
};

/**
 * 仅恢复「非主服务端集合」到 mockDB（P1 写穿后调用）
 *
 * API 模式下 10 个主服务端集合（activities/tasks/attendances/inspections/
 * taskforces/notices/todos/assignments/makeupTasks + users）以服务器为准
 * （由 init() 拉取覆盖），但 niche 集合与 T-209 新域（文件空间/经验沉淀/
 * 合规引用/子记录/报名/复盘/宣传/档案/公邮/外发确认等）在服务器瞬时不可达或
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
    if (Array.isArray(parsed.complianceReferences)) mockDB.complianceReferences = parsed.complianceReferences;
    if (Array.isArray(parsed.fileSpaceRecords))     mockDB.fileSpaceRecords     = parsed.fileSpaceRecords;
    if (Array.isArray(parsed.experienceDeposits))   mockDB.experienceDeposits   = parsed.experienceDeposits;
    // T-218：imageRecords 已补入 _saveToStorage 序列化字段，此处恢复补全（刷新不再丢图）
    if (Array.isArray(parsed.imageRecords))         mockDB.imageRecords         = parsed.imageRecords;
    // T-209 全栈同步：新域回退恢复（与 _saveToStorage 序列化字段一一对应）
    if (Array.isArray(parsed.signups))         mockDB.signups         = parsed.signups;
    if (Array.isArray(parsed.activityReviews))  mockDB.activityReviews  = parsed.activityReviews;
    if (Array.isArray(parsed.taskforceReviews)) mockDB.taskforceReviews = parsed.taskforceReviews;
    if (Array.isArray(parsed.propTasks))       mockDB.propTasks       = parsed.propTasks;
    if (Array.isArray(parsed.weeklyReports))   mockDB.weeklyReports   = parsed.weeklyReports;
    if (Array.isArray(parsed.archiveRecords))  mockDB.archiveRecords  = parsed.archiveRecords;
    if (parsed.mailboxConfig && typeof parsed.mailboxConfig === 'object') mockDB.mailboxConfig = parsed.mailboxConfig;
    if (Array.isArray(parsed.mailboxHistory))  mockDB.mailboxHistory  = parsed.mailboxHistory;
    if (Array.isArray(parsed.externalDispatches)) mockDB.externalDispatches = parsed.externalDispatches;
    if (Array.isArray(parsed.branchDocs)) mockDB.branchDocs = parsed.branchDocs;
    if (Array.isArray(parsed.handoffs)) mockDB.handoffs = parsed.handoffs;
  } catch (e) {
    console.warn('[MockAdapter] restoreNicheCollections 失败（本地备份解析错误，已跳过）：', e);
  }
}
