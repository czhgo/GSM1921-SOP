// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：domain.js, id.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../../core/domain/domain.js?v=20261029b';
import { generateId } from '../../core/base/id.js?v=20261029b';
import { getDataSource, getAdapter, notifyDataLoaded, persist, refreshRemoteCollections } from '../../data/data-adapter.js?v=20261029b';
import { bumpToken, resetAllTokens } from '../../core/base/version-token.js?v=20261029b'; // P0 域缓存失效（spec §二.3/§二.4）
// Mock 持久化/种子引擎（saveDB/loadDB/seed 同步）收敛到 data/mock-adapter.js 唯一实现
// （T-2026-09-007 Step1：services 版私有引擎曾与 mock-adapter 同 Key 双写并缺
//   imageRecords/agendaVotes 等新域恢复 → 刷新即丢；现统一由 MockAdapter 承担全量持久化域 34 个，含 users）
import { MockAdapter, mockDelayMs } from '../../data/mock-adapter.js?v=20261029b';
// C3 一键初始化档（?reset=init，2026-09-08）：mock-adapter 禁改 → reset/清库逻辑经本
// 可改入口兜底；init 档与 demo/preview 档并存（demo/preview 仍在 MockAdapter.loadDB
// 内既有 handleResetIfRequested 处理，本档先于其检测、互不冲突——见 init-reset.js）。
// C2 修复（2026-09-08）：init 档在浏览器形态被 adapter 判空回填（init≈demo）——
// loadDB 委派 MockAdapter.loadDB 后按 init 态哨兵剔除演示种子（见 stripSeedRecordsIfInitState）。
import { handleInitResetIfRequested, stripSeedRecordsIfInitState } from './init-reset.js?v=20261029b';
// 批4（2026-09-09 支书批「域参数」）：数据加载完成 → 读侧有效默认注入
// （当前人所属支部 config.policyOverrides merge 进 POLICY_DEFAULTS；无 overrides = 保持默认）
import { applyEffectivePolicyDefaultsForPerson } from '../branch/branch.js?v=20261029b';
// R9 Task 4.3：活动 ↔ 工作组字段同步单一投影（编辑 / 归档 / 删除三处同步）
import { applyActivityWorkgroupSync, activityWorkgroupIdsForDelete } from '../../data/activity-workgroup-sync.js?v=20261029b';
// Task 2.2（2026-10-25）：归档单一事实——活动归档与 archiveRecords 同事务同步（纯函数，server 同源）
import { upsertActivityArchiveRecord } from '../../data/mock/derive.js?v=20261029b';

// 2026-10-26 Task 2.1：延迟不再写死 600ms，统一取 data/mock-adapter.js::mockDelayMs()
// （window.__MOCK_DELAY_MS / MOCK_DELAY_MS 环境变量可覆盖，默认 80ms）。

// ── 持久化引擎 ──────────────────────────────────────────────────

/**
 * 将当前 mockDB 状态序列化并写入 localStorage
 * 统一全量键架构：所有业务数据通过单一键持久化，消除双重存储
 * T-2026-09-007 Step1：实现收敛到 data/mock-adapter.js MockAdapter.saveDB（唯一全量持久化域 34 个实现，
 *   含持久化守卫）；Z1 扎口保留在此外层（BranchService 写后 API 模式触发快照写穿）——
 *   不能内置于 _saveToStorage（persist → saveDB 会递归）。
 */
export function saveDB() {
  MockAdapter.saveDB();
  // 2026-08-06 扎口修复（Z1）：API 模式下本地备份已写，仍需触发全量快照写穿，
  // 否则 BranchService 写操作（创建/删除/归档/品牌/任务状态）不会同步服务器，刷新即还原。
  //
  // 2026-09-17 批次 49 更正：原实现用**动态 import** `.then(({persist}) => persist())` ——
  // 动态 import 至少延后一个任务，而紧随其后的成功提示会在**快照尚未排程**时就完成等待，
  // 判据落空（「存好了才报成功」在这条链上失效）。本文件第 10 行本就有到 data-adapter 的
  // 静态 import，直接改用静态 `persist` 即可，零新增依赖、也不再有异步空窗。
  if (getDataSource() === 'api') persist();
}

/**
 * 从 localStorage 恢复数据库状态
 * 若数据不存在、解析失败或 _schema 版本不匹配，则拒绝加载脏数据
 * T-2026-09-007 Step1：恢复实现收敛到 data/mock-adapter.js MockAdapter.loadDB（唯一全量持久化域 34 个
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
  // Task 2.2（2026-10-26）：MockAdapter.loadDB 已加页面级幂等锁——同一页面第二次调用返回 false，
  // 此处直接复用首个结果，不再重置版本戳 / 重新注入生效策略（每页只做一次种子修复 + 派生）。
  if (MockAdapter.loadDB() === false) return;
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

/** 包装为带可配置延迟的 Promise（延迟源见 mock-adapter.js::mockDelayMs） */
function _withDelay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try { resolve(fn()); }
      catch (e) { reject(e); }
    }, mockDelayMs());
  });
}

// ── Public API ──────────────────────────────────────────────────

/**
 * 创建新活动（Immutable 写入 mockDB）
 * 10% 概率触发随机错误：5% NetworkError + 5% PermissionError
 * @param {Omit<import('../../core/domain/domain.js').Activity,'id'|'createdAt'>} data
 * @returns {Promise<import('../../core/domain/domain.js').Activity>}
 */
export async function createActivity(data) {
  // API 形态必须走活动语义写入口：服务端在 POST /activities 内同步建立
  // `wg-activity-<id>` 工作组（routes/resources/index.js::createActivityWorkgroup）。
  // 不能先写本地再由 saveDB()/persist() 整库快照新增——snapshotScopeDeny 明确拒绝
  // 「新增活动须走活动语义写入口，以同时建立活动工作组」，否则后续赋权
  // （/workgroups/wg-activity-<id>/grants）会因工作组不存在而 404。
  if (typeof window !== 'undefined' && getDataSource() === 'api') {
    const created = await getAdapter().activities.create(data);
    // 服务端 POST 不回填 createdAt；补齐与 mock 分支一致的创建时间，
    // 否则依赖 createdAt 的读端（如 findTaskforceVoteActivity 的时效过滤）会判空。
    if (!created.createdAt) created.createdAt = data.createdAt || new Date().toISOString();
    // 合并服务端权威行（含 workgroupId/createdBy/branchId），按 id 去重；
    // 后续 createTask / recordProjectGrants 依赖这些字段定位活动工作组。
    mockDB.activities = [...mockDB.activities.filter((row) => row.id !== created.id), created];
    bumpToken('activity');
    notifyDataLoaded();
    console.info('[MockAdapter] createActivity 经语义 API 创建，id=' + created.id
      + '，workgroupId=' + (created.workgroupId || ''));
    return created;
  }
  // mock 形态：活动与活动工作组（`wg-activity-<id>`）＋成员关系**同一次写入**建立，
  // 与服务端 `POST /activities`（routes/resources/workgroup-routes.js::createActivityWorkgroup）同口径。
  // 唯一实现复用 data/mock-adapter.js::MockAdapter.activities.create（勿在此另写第二套建组逻辑）——
  // 此前本口只写 activities，工作组要等下次 loadDB 的 seed-sync 才补齐 ⇒ 本会话内活动详情按
  // `wg-activity-<id>` 读不到工作组、后续赋权（/workgroups/<id>/grants）因工作组不存在而失败。
  const newItem = await MockAdapter.activities.create(data);
  bumpToken('activity'); // P0：活动生命周期写口 bump（MockAdapter 触发路径不碰版本戳）
  console.info('[MockAdapter] createActivity 成功，id=' + newItem.id
    + '，workgroupId=' + newItem.workgroupId
    + '，当前 activities 总数：' + mockDB.activities.length);
  return newItem;
}

/**
 * 列出所有活动（只读，无副作用）
 * @returns {Promise<import('../../core/domain/domain.js').Activity[]>}
 */
export function listActivities() {
  return _withDelay(() => {
    return [...mockDB.activities];
  });
}

/**
 * 更新活动（Immutable patch）
 * @param {string} id - 活动 ID
 * @param {Partial<import('../../core/domain/domain.js').Activity>} patch - 更新字段
 * @returns {Promise<import('../../core/domain/domain.js').Activity>}
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
    // R9 Task 4.3：编辑活动即同步工作组（name / organizingScope / hostGroupId / recruitmentScope…）。
    mockDB.workgroups = applyActivityWorkgroupSync(mockDB.workgroups, updated, {
      actorId: updated.createdBy, create: true,
    });
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
  return _withDelay(async () => {
    const existed = mockDB.activities.some(a => a.id === id);
    if (!existed) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    const apiMode = getDataSource() === 'api';
    if (apiMode) await getAdapter().activities.delete(id);
    mockDB.activities = mockDB.activities.filter(a => a.id !== id);
    bumpToken('activity'); // P0：活动删除写口 bump
    const changedCollections = _purgeActivityChildren(id);
    if (apiMode) {
      // 后端 DELETE 已原子清理服务器数据；此处只留本地备份，再按服务端权威数据刷新缓存/版本基线。
      MockAdapter.saveDB();
      await refreshRemoteCollections(['activities', ...changedCollections, 'agendaVotes']);
    } else {
      saveDB();
    }
    console.info('[MockAdapter] deleteActivity 成功，id=' + id);
    return { id };
  });
}

/** 清理活动的全部关联子记录并返回被修改的数据域。 */
function _purgeActivityChildren(activityId) {
  const changed = new Set();
  for (const key of ['tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks', 'archiveRecords', 'fileSpaceRecords', 'imageRecords']) {
    if (Array.isArray(mockDB[key])) {
      const next = mockDB[key].filter(x => x.activityId !== activityId
        && !(key === 'fileSpaceRecords' && x.sourceType === 'activity' && x.sourceId === activityId));
      if (next.length !== mockDB[key].length) {
        mockDB[key] = next;
        changed.add(key);
      }
    }
  }
  const filterChanged = (key, predicate) => {
    if (!Array.isArray(mockDB[key])) return;
    const next = mockDB[key].filter((row) => !predicate(row));
    if (next.length !== mockDB[key].length) {
      mockDB[key] = next;
      changed.add(key);
    }
  };
  filterChanged('signups', (s) => s.sourceType === 'activity' && s.sourceId === activityId);
  filterChanged('notices', (n) => n.targetType === 'activity' && n.targetId === activityId);
  filterChanged('todos', (t) => t.sourceType === 'activity' && t.sourceId === activityId);
  filterChanged('agendaVotes', (v) => v.activityId === activityId);
  // R9 Task 4.3：删除活动 = 工作组按同一投影移除（成员 / 授权 / 任务 / 产出一并清理；
  //   其他工作组里仅解除 activityId 引用，历史保留）。
  const workgroupIds = activityWorkgroupIdsForDelete(mockDB.workgroups, activityId);
  if (workgroupIds.size > 0) {
    mockDB.workgroups = (mockDB.workgroups || []).filter((row) => !workgroupIds.has(row.id));
    for (const key of ['workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs']) {
      if (Array.isArray(mockDB[key])) mockDB[key] = mockDB[key].filter((row) => !workgroupIds.has(row.workgroupId));
    }
    for (const key of ['workgroupTasks', 'workgroupOutputs']) {
      if (Array.isArray(mockDB[key])) {
        mockDB[key] = mockDB[key].map((row) => (row.activityId === activityId ? { ...row, activityId: null } : row));
      }
    }
    changed.add('workgroups');
  }
  if (mockDB.actSubRecords && Object.prototype.hasOwnProperty.call(mockDB.actSubRecords, activityId)) {
    const next = { ...mockDB.actSubRecords };
    delete next[activityId];
    mockDB.actSubRecords = next;
    changed.add('actSubRecords');
  }
  const tokenByDomain = {
    attendances: 'attendance', inspections: 'inspection', activityReviews: 'activityReview',
    signups: 'signup', notices: 'notice', todos: 'todo', agendaVotes: 'agendaVotes',
    archiveRecords: 'archiveRecord', imageRecords: 'imageRecord',
  };
  for (const key of changed) if (tokenByDomain[key]) bumpToken(tokenByDomain[key]);
  return [...changed];
}

/**
 * 归档活动（软删除）+ 级联将下属 Task 全部设为 completed（消灭孤儿任务）
 * 归档后，该活动的 archived 字段置为 true，所有关联 Task 的 status 自动设为 'completed'，并持久化。
 * Task 2.2（2026-10-25）· 归档单一事实（同一事务内、幂等）：
 *   ① `activity.archived = true`；② `archiveRecords` 创建/同步（activityName 现取、status=archived）；
 *   ③ 关联通知系统归档（`NoticeStore.archiveBySource('activity', id)`）；
 *   ④ 销项「待归档」待办（`activity-archive`），**不再**在归档后新建待办。
 *   重复归档：记录不新增、待办不重复销项、不抛错。
 * @param {string} id - 活动 ID
 * @returns {Promise<import('../../core/domain/domain.js').Activity>}
 */
export function archiveActivity(id) {
  return _withDelay(async () => {
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    const apiMode = getDataSource() === 'api';
    // API 形态走活动语义写口：服务端在同一事务内完成 archived / archive_records / notices / todos；
    // 拒绝（403/409）时直接抛出，本地缓存不先改（与 deleteActivity 同法）。
    if (apiMode) await getAdapter().activities.archive(id);
    // 软删除：将 archived 设为 true（Immutable patch）
    const archived = { ...mockDB.activities[idx], archived: true };
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx),
      archived,
      ...mockDB.activities.slice(idx + 1),
    ];
    // R9 Task 4.3：归档 ⇒ 活动工作组置 archived（写口随 closed 状态只读）。
    mockDB.workgroups = applyActivityWorkgroupSync(mockDB.workgroups, archived, {
      actorId: archived.createdBy, create: true,
    });
    bumpToken('activity'); // P0：活动归档写口 bump（mock-adapter 触发路径禁改→长度指纹兜底）
    // 级联归档：将所有下属 Task 的 status 设为 completed（消灭孤儿任务）
    mockDB.tasks = mockDB.tasks.map(t =>
      t.activityId === id && t.status !== 'completed' ? { ...t, status: 'completed' } : t
    );
    if (apiMode) {
      MockAdapter.saveDB();
      await refreshRemoteCollections(['activities', 'archiveRecords', 'notices', 'todos']);
    } else {
      // ② 归档记录同事务同步（幂等：已有记录只同步名称/状态，不新增第二条）
      const nextRecords = upsertActivityArchiveRecord(mockDB.archiveRecords, archived);
      if (nextRecords !== mockDB.archiveRecords) {
        mockDB.archiveRecords = nextRecords;
        bumpToken('archiveRecord');
      }
      // ③ 关联通知系统归档（NoticeStore 单一实现）
      try {
        const { NoticeStore } = await import('../governance/notice.js?v=20261029b');
        NoticeStore.archiveBySource('activity', id);
      } catch (e) {
        console.warn('[MockAdapter] 归档关联通知失败：', e);
      }
      // ④ 销项「待归档」待办（归档动作是唯一销项点；不再新建）
      try {
        const { TodoStore } = await import('../governance/todo.js?v=20261029b');
        TodoStore.completeByAction('activity', id, 'activity-archive');
      } catch (e) {
        console.warn('[MockAdapter] 销项待归档待办失败：', e);
      }
      saveDB();
    }
    console.info('[MockAdapter] archiveActivity 成功，id=' + id
      + '，级联完成下属 tasks。');
    return archived;
  });
}

// ── Brand Activity ──────────────────────────────────────────────

/**
 * 取消活动的品牌认定（支委会事项；**2026-09-21 批次 132 · 支书口径二**）
 * 口径：**品牌认定＝支委/党小组组长提案 → 支委会审议通过后确定**（`services/activity/activity.js`），
 *   ⇒ 本口**只能取消、不能认定**（认定唯一入口＝支委会议程项「记录结果 · 通过」；
 *   非品牌态调用一律抛错，防「点一下即认定」的后门）。
 * 前端写链单一源见 `services/activity/activity.js::revokeBrandDesignation`（本口保留供 mock/BranchService 同形）。
 * Source: content/04_web_design/data/DATA_ARCHITECTURE.md §1.3
 * @param {string} id - 活动 ID
 * @returns {Promise<import('../../core/domain/domain.js').Activity>}
 */
export function revokeBrand(id) {
  return _withDelay(() => {
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) {
      throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    }
    if (mockDB.activities[idx].isBrand !== true) {
      throw Object.assign(new Error('该活动当前不是品牌活动——品牌认定须经支委会审议通过（提案 → 支委会通过后确定）'), { type: 'ValidationError' });
    }
    const updated = {
      ...mockDB.activities[idx],
      isBrand: false,
      brandRevokedAt: new Date().toISOString(),
    };
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx),
      updated,
      ...mockDB.activities.slice(idx + 1),
    ];
    bumpToken('activity'); // P0：活动写口 bump（品牌认定取消）
    saveDB();
    console.info('[MockAdapter] revokeBrand 成功，id=' + id);
    return updated;
  });
}

// ── Task CRUD ────────────────────────────────────────────────────

/**
 * 创建新任务（Immutable 写入 mockDB）
 * @param {Omit<import('../../core/domain/domain.js').Task,'id'|'createdAt'>} data
 * @returns {Promise<import('../../core/domain/domain.js').Task>}
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
 * 批次 352b（`D-746`）：**已作废（`voided`）的任务不出列**（作废＝这一步不作数了、留痕仍可回查）
 *  ⇒ 活动详情页「任务清单」与活动进度推导（`state.tasks` 消费方）随之外列。
 *  ⚠ 过滤只在此读口做——`updateTask` 保持原始访问（否则状态写回会丢掉作废行）。
 * @returns {Promise<import('../../core/domain/domain.js').Task[]>}
 */
export function listTasks() {
  return _withDelay(() => {
    return [...mockDB.tasks].filter((t) => !t.voided);
  });
}

/**
 * 更新任务状态（Immutable patch）
 * 同步函数：直接修改 mockDB.tasks，返回更新后的新数组快照。
 * 适用于 UI 层任务状态切换（无需异步等待，保证即时响应）。
 * @param {string} taskId - 任务 ID（匹配 mockDB.tasks 中的 id 字段）
 * @param {Partial<import('../../core/domain/domain.js').Task>} patch - 更新字段
 * @returns {import('../../core/domain/domain.js').Task[]} 更新后的 tasks 数组快照
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
