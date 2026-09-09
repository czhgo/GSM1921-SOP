// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：domain.js, id.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260908d';
import { generateId } from '../core/id.js?v=20260908d';
import { getDataSource, notifyDataLoaded } from '../core/data-adapter.js?v=20260908d';
import { bumpToken, resetAllTokens } from '../core/version-token.js?v=20260908d'; // P0 域缓存失效（spec §二.3/§二.4）
// Mock 持久化/种子引擎（saveDB/loadDB/seed 同步）收敛到 core/mock-adapter.js 唯一实现
// （T-2026-09-007 Step1：services 版私有引擎曾与 mock-adapter 同 Key 双写并缺
//   imageRecords/agendaVotes 等新域恢复 → 刷新即丢；现统一由 MockAdapter 承担全量 26 域）
import { MockAdapter } from '../core/mock-adapter.js?v=20260908d';
// C3 一键初始化档（?reset=init，2026-09-08）：mock-adapter 禁改 → reset/清库逻辑经本
// 可改入口兜底；init 档与 demo/preview 档并存（demo/preview 仍在 MockAdapter.loadDB
// 内既有 handleResetIfRequested 处理，本档先于其检测、互不冲突——见 init-reset.js）。
// C2 修复（2026-09-08）：init 档在浏览器形态被 adapter 判空回填（init≈demo）——
// loadDB 委派 MockAdapter.loadDB 后按 init 态哨兵剔除演示种子（见 stripSeedRecordsIfInitState）。
import { handleInitResetIfRequested, stripSeedRecordsIfInitState } from './init-reset.js?v=20260908d';
// 批4（2026-09-09 书记批「域参数」）：数据加载完成 → 读侧有效默认注入
// （当前人所属支部 config.policyOverrides merge 进 POLICY_DEFAULTS；无 overrides = 保持默认）
import { applyEffectivePolicyDefaultsForPerson } from './branch.js?v=20260908d';

const MOCK_DELAY_MS = 600;

// ── 持久化引擎 ──────────────────────────────────────────────────

/**
 * 将当前 mockDB 状态序列化并写入 localStorage
 * 统一全量键架构：所有业务数据通过单一键持久化，消除双重存储
 * T-2026-09-007 Step1：实现收敛到 core/mock-adapter.js MockAdapter.saveDB（唯一全量 26 域实现，
 *   含持久化守卫）；Z1 扎口保留在此外层（BranchService 写后 API 模式触发快照写穿）——
 *   不能内置于 _saveToStorage（persist → saveDB 会递归）。
 */
export function saveDB() {
  MockAdapter.saveDB();
  // 2026-08-06 扎口修复（Z1）：API 模式下本地备份已写，仍需触发全量快照写穿，
  // 否则 BranchService 写操作（创建/删除/归档/品牌/任务状态）不会同步服务器，刷新即还原。
  if (getDataSource() === 'api') {
    import('../core/data-adapter.js?v=20260908d').then(({ persist }) => persist()).catch((e) => {
      console.warn('[MockAdapter] saveDB 触发快照写穿失败：', e);
    });
  }
}

/**
 * 从 localStorage 恢复数据库状态
 * 若数据不存在、解析失败或 _schema 版本不匹配，则拒绝加载脏数据
 * T-2026-09-007 Step1：恢复实现收敛到 core/mock-adapter.js MockAdapter.loadDB（唯一全量 26 域
 *   恢复 + seed 增量同步）；C1 读路径守卫保留在此外层（API 模式不得被本地旧备份冲掉）。
 */
export function loadDB() {
  // API 模式由 init() 从服务器填充，跳过 localStorage 恢复防覆盖
  // （C1 读路径守卫：后端数据不得被本地旧备份冲掉）
  if (getDataSource() === 'api') {
    // 持久化守卫解锁：API 模式数据由 data-adapter.init() 填充，允许本地备份写
    mockDB._loaded = true;
    resetAllTokens(); // P0：整体数据导入（server 全量填充）= 全源重载 → 聚合缓存全域失效重算
    // 批4：api 形态读侧有效默认注入（data-adapter.init 已完成 branches 填充后进入本路径）
    applyEffectivePolicyDefaultsForPerson(_loginPersonId());
    return;
  }
  // C3 初始化档（2026-09-08）：?reset=init = 一键从演示态/试用态初始化为「新支部初始态」
  // （清业务过程数据、保留白名单：账号/成员档案/支部配置/在册状态/主题）。置于
  // MockAdapter.loadDB 之前（其内 handleResetIfRequested 仅认 demo/preview，init 未命中
  // 返回 false 走既有档位；命中则清库整页导航并中止本次加载）。
  if (handleInitResetIfRequested()) return;
  MockAdapter.loadDB();
  // P0 重置/overlay 导入路径（mock-adapter 禁改 → 由本可改入口兜底）：loadDB 会整体恢复/
  // 重播种 mockDB（含 ?reset= 清理路径）→ 清空域写版本戳，聚合复合键归零自然重算。
  resetAllTokens();
  // C2 修复（2026-09-08）：mock-adapter 的 T174 判空保护会把 init 后的「业务空态」误判为
  // 首次/脏 → loadDB 内 _seedInitialData()/_mergeNewSeedRecords() 自动回填演示种子，使浏览器
  // 形态 init≈demo。本可改入口在每次恢复后按 init 态哨兵剔除回填进 mockDB 的演示种子记录
  // （保留用户记录与白名单），并 saveDB 落盘使空态跨整页刷新稳态（多轮 loadDB 不再回填）；
  // 剔除后补一次数据加载广播，让 header 角标等据空态重算（loadDB 内首播发生在剔除前）。
  if (stripSeedRecordsIfInitState(mockDB)) {
    saveDB();
    notifyDataLoaded();
  }
  // 批4：mock 形态读侧有效默认注入（loadDB 成功 = branches 已恢复；无 overrides = 保持默认）
  applyEffectivePolicyDefaultsForPerson(_loginPersonId());
}

/** 登录快照 personId（批4 注入按人归属支部；同 branch.js _actorId 键约定，无则 null=兜底 br-b1） */
function _loginPersonId() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('gsm1921-login-user');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && (d.personId || d.userId || d.id || null);
  } catch (_) { return null; }
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
    bumpToken('activity'); // P0：活动生命周期写口 bump（可改处；mock-adapter 触发路径禁改→依赖长度指纹兜底）
    saveDB();
    console.info('[MockAdapter] createActivity 成功，id=' + newItem.id
      + '，当前 activities 总数：' + mockDB.activities.length);
    // 派生赋权待办（最小三成本原则·阶段1C-3）
    // T-190：创建时已内联赋权（assignments 非空）则不再派生；未选人保留待办兜底
    if (!newItem.assignments || newItem.assignments.length === 0) {
      import('./todo.js?v=20260908d').then(({ LifecycleTodoDeriver }) => {
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
    bumpToken('activity'); // P0：活动写口 bump（议程/状态/归档标记等修改统一失效聚合缓存）
    // 2026-09-01 点验修复：此前 updateActivity 缺 saveDB，议程记录/状态修改等
    // 所有经 BranchService 的活动更新都不落库（刷新即失）；补齐与 createActivity 一致。
    saveDB();
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
    const prev = mockDB.activities.length;
    mockDB.activities = mockDB.activities.filter(a => a.id !== id);
    if (mockDB.activities.length === prev) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    bumpToken('activity'); // P0：活动删除写口 bump
    saveDB();
    console.info('[MockAdapter] deleteActivity 成功，id=' + id);
    // 联动删除关联待办（避免遗留孤儿待办）
    import('./todo.js?v=20260908d').then(({ LifecycleTodoDeriver }) => {
      LifecycleTodoDeriver.deleteByActivity(id);
    }).catch(e => console.warn('[MockAdapter] 联动删除待办失败：', e));
    // 2026-08-27 T-283 生命周期修复：彻底删除活动须联动清理全部子记录
    // （UI 确认文案「彻底删除该活动及关联数据」——此前仅删活动与待办，子记录成孤儿）
    _purgeActivityChildren(id);
    return { id };
  });
}

/** 清理活动的全部关联子记录（T-283：tasks/考勤/考察/分工/复盘/补课/报名/通知） */
function _purgeActivityChildren(activityId) {
  for (const key of ['tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks']) {
    if (Array.isArray(mockDB[key])) {
      mockDB[key] = mockDB[key].filter(x => x.activityId !== activityId);
    }
  }
  // 报名（sourceType='activity' 关联）；通知（targetType='activity' 关联，彻底删除）
  if (Array.isArray(mockDB.signups)) {
    mockDB.signups = mockDB.signups.filter(s => !(s.sourceType === 'activity' && s.sourceId === activityId));
  }
  if (Array.isArray(mockDB.notices)) {
    mockDB.notices = mockDB.notices.filter(n => !(n.targetType === 'activity' && n.targetId === activityId));
  }
  // P0：活动删除联动清理会改旁路子域 → 一并 bump（考勤/考察/活动复盘/报名/通知聚合缓存失效）
  bumpToken('attendance');
  bumpToken('inspection');
  bumpToken('activityReview');
  bumpToken('signup');
  bumpToken('notice');
  saveDB();
}

/**
 * 归档活动（软删除）+ 级联将下属 Task 全部设为 completed（消灭孤儿任务）
 * 归档后，该活动的 archived 字段置为 true，所有关联 Task 的 status 自动设为 'completed'，并持久化。
 * @param {string} id - 活动 ID
 * @returns {Promise<import('../core/domain.js').Activity>}
 */
export function archiveActivity(id) {
  return _withDelay(() => {
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
    bumpToken('activity'); // P0：活动归档写口 bump（mock-adapter 触发路径禁改→长度指纹兜底）
    // 级联归档：将所有下属 Task 的 status 设为 completed（消灭孤儿任务）
    mockDB.tasks = mockDB.tasks.map(t =>
      t.activityId === id && t.status !== 'completed' ? { ...t, status: 'completed' } : t
    );
    saveDB();
    console.info('[MockAdapter] archiveActivity 成功，id=' + id
      + '，级联完成下属 tasks。');
    // 派生归档待办给宣传委员（最小三成本原则·阶段1C-3）
    import('./todo.js?v=20260908d').then(({ LifecycleTodoDeriver }) => {
      LifecycleTodoDeriver.deriveFromActivityArchive(archived);
    }).catch(e => console.warn('[MockAdapter] 派生活动归档待办失败：', e));
    return archived;
  });
}

// ── Brand Activity ──────────────────────────────────────────────

/**
 * 切换活动的品牌标记（书记认定操作）
 * Source: content/04_web_design/data/DATA_ARCHITECTURE.md §1.3
 * @param {string} id - 活动 ID
 * @returns {Promise<import('../core/domain.js').Activity>}
 */
export function toggleBrand(id) {
  return _withDelay(() => {
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
    bumpToken('activity'); // P0：活动写口 bump（品牌标记）
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
// Deliverable CRUD + Milestone Query 已删除（需求上下文保留在 content/04_web_design/data/DATA_ARCHITECTURE.md §2.5）
// 删除的 API：createDeliverable, listDeliverables, updateDeliverable, seedOrgLifeDeliverables, getScenarioMilestones
// 删除原因：无任何代码消费，奥卡姆剃刀原则；设计文档已完整保留需求上下文
