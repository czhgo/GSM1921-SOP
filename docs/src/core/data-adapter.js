// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  data-adapter.js — 数据访问抽象层 (Data Access Abstraction)
//  T-142 阶段2：写穿透缓存模式（Write-Through Cache）
//
//  核心设计：
//  1. 定义统一的数据访问接口（DataAdapter Interface）
//  2. 通过切换配置实现 mock/API 无缝切换
//  3. UI 层通过 DataAdapter 访问数据，不直接操作 mockDB
//  4. init() 预加载数据到 mockDB 缓存；persist() 统一持久化
//
//  迁移策略：
//  - 读操作：保留同步（直接读 mockDB 缓存）
//  - 写操作：通过 persist() 路由到当前数据源
//  - 初始化：init() 从当前数据源预加载到 mockDB
//
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md
//  Source: content/04_web_design/deploy/DEPLOYMENT_GUIDE.md §3.2.4/§3.7.2（与学校对接：API 设计要求与交付清单）
// ════════════════════════════════════════════════════════════════

/**
 * DataAdapter Interface — 统一数据访问接口
 *
 * 所有数据操作通过此接口进行，mock 和 API 实现各自满足此接口。
 * UI 层只依赖接口，不依赖实现——切换后端时 UI 零改动。
 *
 * 接口按资源分组，每组包含 CRUD 方法：
 * - activities: 活动管理
 * - tasks: 任务管理
 * - attendances: 考勤管理
 * - inspections: 考察管理
 * - taskforces: 专班管理
 * - notices: 通知管理
 * - todos: 待办管理
 * - assignments: 分工管理
 * - makeupTasks: 补课任务
 * - fileSpaceRecords: 文件空间
 * - imageRecords: 图片记录
 * - experienceDeposits: 经验沉淀
 * - complianceReferences: 合规引用
 * - signups: 报名记录（T-209）
 * - activityReviews: 活动复盘
 * - taskforceReviews: 专班复盘
 * - propTasks: 宣传任务
 * - weeklyReports: 宣传周报
 * - archiveRecords: 档案归档
 * - mailboxConfig: 公邮配置（单对象聚合域，__root__ 单行）
 * - mailboxHistory: 公邮查收历史
 * - externalDispatches: 文件流外发确认（T-208）
 * - actSubRecords: 活动子记录（聚合域，__root__ 单行）
 * - tfSubRecords: 专班子记录（聚合域，__root__ 单行）
 *
 * 每个方法返回 Promise，统一异步接口（即使是同步的 mock 操作也包装为 Promise）。
 *
 * @typedef {Object} DataAdapter
 */

// ── 切换配置 ──────────────────────────────────────────────────

/**
 * 数据源模式
 * 'mock' = 本地 mockDB + localStorage
 * 'api'  = REST API + JWT（需配置 API_BASE_URL）
 *
 * 切换方式：修改此常量即可全局切换数据源
 * 或通过 setDataSource() 动态切换
 */
let DATA_SOURCE = 'mock';

/** API 基础地址（api 模式下生效） */
let API_BASE_URL = '';

/** JWT Token 存储（api 模式下生效） */
let _authToken = '';

/**
 * 设置数据源
 * @param {'mock'|'api'} source - 数据源模式
 * @param {Object} [options] - 配置选项
 * @param {string} [options.apiBaseUrl] - API 基础地址
 * @param {string} [options.authToken] - JWT Token
 */
export function setDataSource(source, options = {}) {
  DATA_SOURCE = source;
  if (options.apiBaseUrl) API_BASE_URL = options.apiBaseUrl;
  if (options.authToken) _authToken = options.authToken;
  console.info(`[DataAdapter] 数据源切换为: ${source}` +
    (source === 'api' ? `，API_BASE_URL=${API_BASE_URL}` : ''));
}

/**
 * 获取当前数据源
 * @returns {'mock'|'api'}
 */
export function getDataSource() {
  return DATA_SOURCE;
}

/**
 * 获取 API 基础地址
 * @returns {string}
 */
export function getApiBaseUrl() {
  return API_BASE_URL;
}

/**
 * 获取当前认证 Token
 * @returns {string}
 */
export function getAuthToken() {
  return _authToken;
}

// ── 适配器实例缓存 ──────────────────────────────────────────

let _mockAdapter = null;
let _apiAdapter = null;

/**
 * 获取当前数据适配器实例
 * 根据 DATA_SOURCE 返回对应的适配器实现
 * @returns {DataAdapter}
 */
export function getAdapter() {
  if (DATA_SOURCE === 'api') {
    if (!_apiAdapter) {
      // 动态导入避免未使用时加载
      throw new Error(
        '[DataAdapter] API 适配器尚未实现。请先实现 docs/src/core/api-adapter.js'
      );
    }
    return _apiAdapter;
  }

  if (!_mockAdapter) {
    // 使用动态导入避免循环依赖
    // 实际由 runtime.js 在初始化时注入
    throw new Error(
      '[DataAdapter] Mock 适配器尚未注入。请确保 runtime.js 已初始化'
    );
  }
  return _mockAdapter;
}

/**
 * 注册 Mock 适配器实例
 * 由 runtime.js 在初始化时调用
 * @param {DataAdapter} adapter
 */
export function registerMockAdapter(adapter) {
  _mockAdapter = adapter;
}

/**
 * 注册 API 适配器实例
 * 接入后端时调用
 * @param {DataAdapter} adapter
 */
export function registerApiAdapter(adapter) {
  _apiAdapter = adapter;
}

// ── 初始化与持久化（写穿透缓存核心方法）────────────────────────

/**
 * 初始化数据层：从当前数据源预加载数据到 mockDB 缓存
 *
 * - Mock 模式：从 localStorage 恢复数据到 mockDB
 * - API 模式：从后端 API 拉取所有资源到 mockDB（用于后续同步读取）
 *
 * 必须在页面渲染前调用（data-loader.js 中执行）
 *
 * @returns {Promise<void>}
 */
export async function init() {
  const adapter = getAdapter();

  if (DATA_SOURCE === 'mock') {
    // Mock 模式：loadDB 从 localStorage 恢复到 mockDB（同步操作）
    adapter.loadDB();
    console.info('[DataAdapter] init: mock 模式，已从 localStorage 恢复数据');
  } else {
    // API 模式：拉取所有资源并填充 mockDB 缓存
    try {
      const [
        users, activities, tasks, attendances, inspections,
        taskforces, notices, todos, assignments,
        makeupTasks,
      ] = await Promise.all([
        adapter.users.list(),
        adapter.activities.list(),
        adapter.tasks.list(),
        adapter.attendances.list(),
        adapter.inspections.list(),
        adapter.taskforces.list(),
        adapter.notices.list(),
        adapter.todos.list(),
        adapter.assignments.list(),
        adapter.makeupTasks.list(),
      ]);

      // 填充 mockDB 缓存（供服务层同步读取）
      const { mockDB } = await import('./domain.js?v=20260908c');
      // 缓存引用：pagehide 同步冲刷时不能再 await 动态 import（文档卸载中挂起），
      // 必须直接同步读取（见 _flushSnapshotSync）
      _cachedMockDB = mockDB;
      mockDB.users = users || [];
      mockDB.activities = activities || [];
      mockDB.tasks = tasks || [];
      mockDB.attendances = attendances || [];
      mockDB.inspections = inspections || [];
      mockDB.taskforces = taskforces || [];
      mockDB.notices = notices || [];
      mockDB.todos = todos || [];
      mockDB.assignments = assignments || [];
      mockDB.makeupTasks = makeupTasks || [];

      // T-218：niche 集合（经验沉淀/合规引用/文件空间/图片记录）从后端拉取填充，
      // 拉取失败时回退本地备份（不影响主集合；旧行为是纯本地恢复）
      // T-209 全栈同步：再补拉 8 个数组域（报名/活动复盘/专班复盘/宣传任务/周报/档案/公邮历史/外发确认）
      // + 3 个聚合域（活动子记录/专班子记录/公邮配置，以 __root__ 单行存储，拉取后解包）。
      try {
        const [
          experienceDeposits, complianceReferences,
          fileSpaceRecords, imageRecords,
          signups, activityReviews, taskforceReviews,
          propTasks, weeklyReports, archiveRecords,
          mailboxHistory, externalDispatches,
          branchDocs,
          branches,
          memberChangeRequests, committeeBroadcasts, agendaVotes,
          appointmentRecords,
          reviewRequests,
          actSubRecordsRows, tfSubRecordsRows, mailboxConfigRows,
        ] = await Promise.all([
          adapter.experienceDeposits.list(),
          adapter.complianceReferences.list(),
          adapter.fileSpaceRecords.list(),
          adapter.imageRecords.list(),
          adapter.signups.list(),
          adapter.activityReviews.list(),
          adapter.taskforceReviews.list(),
          adapter.propTasks.list(),
          adapter.weeklyReports.list(),
          adapter.archiveRecords.list(),
          adapter.mailboxHistory.list(),
          adapter.externalDispatches.list(),
          adapter.branchDocs.list(),
          // P1 党委后台（2026-09-02）：支部实例随全量快照恢复（党委台账/支部管理数据通路）
          adapter.branches.list(),
          adapter.memberChangeRequests.list(),
          adapter.committeeBroadcasts.list(),
          adapter.agendaVotes.list(),
          // P2 党委后台（2026-09-02）：书记任期记录随全量快照恢复
          adapter.appointmentRecords.list(),
          // P3 党委后台（2026-09-02）：支部上报审批随全量快照恢复（党委台/支部侧历史可见）
          adapter.reviewRequests.list(),
          adapter.actSubRecords.list(),
          adapter.tfSubRecords.list(),
          adapter.mailboxConfig.list(),
        ]);
        mockDB.experienceDeposits    = experienceDeposits || [];
        mockDB.complianceReferences  = complianceReferences || [];
        mockDB.fileSpaceRecords      = fileSpaceRecords || [];
        mockDB.imageRecords          = imageRecords || [];
        mockDB.signups               = signups || [];
        mockDB.activityReviews       = activityReviews || [];
        mockDB.taskforceReviews      = taskforceReviews || [];
        mockDB.propTasks             = propTasks || [];
        mockDB.weeklyReports         = weeklyReports || [];
        mockDB.archiveRecords        = archiveRecords || [];
        mockDB.mailboxHistory        = mailboxHistory || [];
        mockDB.externalDispatches    = externalDispatches || [];
        mockDB.branchDocs            = branchDocs || [];
        mockDB.branches              = branches || [];
        mockDB.appointmentRecords    = appointmentRecords || [];
        mockDB.reviewRequests        = reviewRequests || [];
        mockDB.memberChangeRequests  = memberChangeRequests || [];
        mockDB.committeeBroadcasts    = committeeBroadcasts || [];
        mockDB.agendaVotes           = agendaVotes || [];
        mockDB.actSubRecords         = _unwrapRootRows(actSubRecordsRows, {});
        mockDB.tfSubRecords          = _unwrapRootRows(tfSubRecordsRows, {});
        mockDB.mailboxConfig         = _unwrapRootRows(mailboxConfigRows, null);
      } catch (e) {
        console.warn('[DataAdapter] init: niche/新域集合拉取失败，回退本地备份：', e);
        try {
          const { restoreNicheCollections } = await import('./mock-adapter.js?v=20260908c');
          restoreNicheCollections();
        } catch (e2) {
          console.warn('[DataAdapter] init: 本地 niche 备份恢复失败：', e2);
        }
      }

      console.info('[DataAdapter] init: API 模式，已从后端拉取数据到缓存');
      // 持久化守卫解锁：mockDB 已由服务器数据填充，允许本地备份写（persist → mock-adapter.saveDB）
      mockDB._loaded = true;

      // 2026-08-06 扎口修复（Z5）：服务端 seed 仅覆盖 7 张表，
      // attendances/inspections/todos 在 API 模式下为空 → 回退本地 mock 种子，
      // 避免首屏考勤/考察/待办空白。注意：回退仅填充 mockDB 缓存，【不触发 persist/快照写穿】，
      // 否则页面加载期（800ms 防抖窗口内）会以落后的本地缓存覆盖服务器上其他入口刚写入的数据
      // （2026-08-06 e2e-login 回归根因）；服务器数据由用户后续真实操作经快照写穿自然获得。
      // makeupTasks 无静态种子（由纪检操作生成），空属合理，不回退。
      if (!mockDB.attendances.length || !mockDB.inspections.length) {
        try {
          const { ATTENDANCE_RECORDS } = await import('../mock/attendance.js?v=20260908c');
          const { INSPECTION_RECORDS } = await import('../mock/inspection.js?v=20260908c');
          if (!mockDB.attendances.length) mockDB.attendances = ATTENDANCE_RECORDS.map(r => ({ ...r }));
          if (!mockDB.inspections.length) mockDB.inspections = INSPECTION_RECORDS.map(r => ({ ...r }));
          console.info('[DataAdapter] init: 考勤/考察空集合已回退本地 seed');
        } catch (e) {
          console.warn('[DataAdapter] init: 考勤/考察 seed 回退失败：', e);
        }
      }
      if (!mockDB.todos.length) {
        try {
          const { SEED_TODOS } = await import('../services/todo.js?v=20260908c');
          mockDB.todos = SEED_TODOS.map(t => ({ ...t }));
          console.info('[DataAdapter] init: 待办空集合已回退本地 seed');
        } catch (e) {
          console.warn('[DataAdapter] init: 待办 seed 回退失败：', e);
        }
      }

      // 2026-09-02 增量快照：以「init 拉取完成态」为基线，flush 只上传与基线有差异的集合
      // （回退种子亦计入基线 → 不会自动污染服务器，契合 Z5 注释语义）
      _captureBase(mockDB);
    } catch (e) {
      console.error('[DataAdapter] init: API 模式初始化失败：', e);
      throw e;
    }
  }
}

/**
 * 持久化当前 mockDB 状态到存储
 *
 * - Mock 模式：序列化 mockDB 到 localStorage（等价于原 saveDB）
 * - API 模式：防抖全量快照写穿服务器（POST /api/v1/snapshot）+ 本地备份双保险
 *
 * 服务层写操作后调用此方法替代原 saveDB()
 */
export function persist() {
  if (DATA_SOURCE === 'mock') {
    _mockAdapter?.saveDB();
  } else {
    // API 模式：本地备份（服务器瞬时不可达不丢数据；mockDB 内容在 API 模式
    // 由 init() 从服务器填充，本地备份不参与读）+ 防抖全量快照写穿
    _mockAdapter?.saveDB();
    _scheduleSnapshot();
  }
  // 数据变更广播（2026-08-05）：persist() 是全部业务写路径的汇聚点，
  // 统一派发事件，让 header 角标/统计卡等消费点即时重算，消除"必须手动刷新"。
  notifyDataChanged();
}

// ── 数据变更事件总线（2026-08-05，响应书记"计算需手动刷新"）────────
// persist() 已覆盖 mockDB 系全部写路径；Issues/Milestones/Auth 审计等
// 独立 localStorage 域不经过 persist，需在其写方法内显式调用 notifyDataChanged()。

/** 数据变更事件名（订阅方：header 角标 / 首页统计卡 / 通知列表等） */
export const DATA_CHANGED_EVENT = 'gsm1921:data-changed';
/** 数据加载完成事件名（loadDB/init 恢复持久化数据后派发，用于修正加载早期渲染的快照） */
export const DATA_LOADED_EVENT = 'gsm1921:data-loaded';

let _pendingCollections = [];
let _notifyScheduled = false;

/**
 * 广播数据变更（微任务去重合并：连续多次写只派发一次）
 * @param {string[]} [collections] - 变更的资源分组名（如 ['notices']），可选
 */
export function notifyDataChanged(collections) {
  if (collections) _pendingCollections.push(...collections);
  if (_notifyScheduled) return;
  _notifyScheduled = true;
  queueMicrotask(() => {
    _notifyScheduled = false;
    const detail = { collections: [...new Set(_pendingCollections)] };
    _pendingCollections = [];
    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
      document.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail }));
    }
  });
}

/** 广播数据加载完成（loadDB/init 完成后调用，订阅方据此刻画刷新初始快照） */
export function notifyDataLoaded() {
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
    document.dispatchEvent(new CustomEvent(DATA_LOADED_EVENT));
  }
}

// ── API 模式全量快照写穿（防抖）──────────────────────────────

let _snapshotTimer = null;

/** 快照写穿防抖间隔（ms）：多次连续写合并为一次全量快照 */
const SNAPSHOT_DEBOUNCE_MS = 800;

/** domain.js mockDB 的缓存引用（init()/_flushSnapshot 加载后回写）：
 *  供 pagehide 同步冲刷使用——卸载期间动态 import 的 await 会挂起，无法异步取数 */
let _cachedMockDB = null;

/**
 * 聚合域解包（T-209 全栈同步）：actSubRecords/tfSubRecords/mailboxConfig 在服务端
 * 以「__root__ 单行」模式存储（{ id:'__root__', body:<原对象> }），init() 拉取时
 * 解包回原对象/单对象；空表回退默认值。
 * @param {Array} rows - list() 返回的行数组
 * @param {*} fallback - 空表时的默认值
 */
function _unwrapRootRows(rows, fallback) {
  if (!Array.isArray(rows) || rows.length === 0) return fallback;
  const row = rows.find((r) => r && r.id === '__root__');
  return row && row.body !== undefined ? row.body : fallback;
}

// ── 脏集合增量快照（2026-09-02 修复：并发互覆）────────────────────
// 背景：原全量快照「26 域整表替换」存在致命缺陷——任一内存滞后的在线用户一次写，
// 会把他人已写入的数据整体覆盖（真机双账号演练实证：跨集合互洗，A 写活动被 B 写待办洗掉）。
// 修复：只上传「与基线有差异的集合」。
//   基线（_base） = init() 拉取完成时 + 每次 flush 成功后，各集合的序列化缓存；
//   flush 时逐域比较 → 只 POST 脏集合 → 服务端对 payload 未出现的键不触碰
//   （resources.js 已按 payload 键逐表处理，服务端零改动）。
// 残余窗口：同集合并发双写（低频编辑冲突，冲突检测列 follow-up，本次接受）。
let _base = {};

function _serKey(v) {
  return JSON.stringify(v === undefined ? null : v);
}

function _captureBase(mockDB) {
  const base = {};
  for (const k of Object.keys(_buildSnapshotPayload(mockDB))) {
    base[k] = _serKey(mockDB[k]);
  }
  _base = base;
}

/** 计算脏集合 payload：与基线有差异的集合才纳入；无差异返回 null（跳过上传） */
function _collectDirty(mockDB) {
  const full = _buildSnapshotPayload(mockDB);
  const payload = {};
  for (const k of Object.keys(full)) {
    if (!(k in _base) || _base[k] !== _serKey(mockDB[k])) {
      payload[k] = full[k];
    }
  }
  return Object.keys(payload).length ? payload : null;
}

/** flush 成功后把上传过的集合推进为新基线（失败不推进 → 下次 flush 自动重试同脏集合） */
function _commitBase(mockDB, keys) {
  for (const k of keys) _base[k] = _serKey(mockDB[k]);
}

/** 调度一次防抖快照写穿（已有排程则合并） */
function _scheduleSnapshot() {
  if (_snapshotTimer) return;
  _snapshotTimer = setTimeout(_flushSnapshot, SNAPSHOT_DEBOUNCE_MS);
}

/**
 * 构造全量快照 payload（T-209 全栈同步：覆盖 mockDB 全部 26 个持久化域，不含 users）
 * agendaVotes 为 REST 直写域，不进快照 payload（防防抖窗口以陈旧缓存覆盖服务器新表态）
 * 聚合域（actSubRecords/tfSubRecords/mailboxConfig）包装为「__root__ 单行」，
 * 与 init() 的 _unwrapRootRows 解包对称。
 */
function _buildSnapshotPayload(mockDB) {
  return {
    activities:  mockDB.activities,
    tasks:       mockDB.tasks,
    attendances: mockDB.attendances,
    inspections: mockDB.inspections,
    taskforces:  mockDB.taskforces,
    notices:     mockDB.notices,
    todos:       mockDB.todos,
    assignments: mockDB.assignments,
    makeupTasks: mockDB.makeupTasks,
    experienceDeposits:   mockDB.experienceDeposits,
    complianceReferences: mockDB.complianceReferences,
    fileSpaceRecords:     mockDB.fileSpaceRecords,
    imageRecords:         mockDB.imageRecords,
    signups:        mockDB.signups,
    activityReviews: mockDB.activityReviews,
    taskforceReviews: mockDB.taskforceReviews,
    propTasks:      mockDB.propTasks,
    weeklyReports:  mockDB.weeklyReports,
    archiveRecords: mockDB.archiveRecords,
    mailboxHistory: mockDB.mailboxHistory,
    externalDispatches: mockDB.externalDispatches,
    actSubRecords:  [{ id: '__root__', body: mockDB.actSubRecords || {} }],
    tfSubRecords:   [{ id: '__root__', body: mockDB.tfSubRecords || {} }],
    mailboxConfig:  [{ id: '__root__', body: mockDB.mailboxConfig ?? null }],
  };
}

/**
 * 执行全量快照写穿：读取 mockDB 的全部持久化域（不含 users），
 * 整体 POST /api/v1/snapshot 覆盖写服务器。失败仅告警不抛出（不阻断 UI）。
 */
async function _flushSnapshot() {
  _snapshotTimer = null;
  // flush 时若数据源已切回 mock（如服务器不可达回退），跳过写穿
  if (DATA_SOURCE !== 'api') return;
  try {
    const { mockDB } = await import('./domain.js?v=20260908c');
    _cachedMockDB = mockDB;
    const payload = _collectDirty(mockDB);
    if (!payload) return; // 无脏集合：跳过上传（2026-09-02 增量快照）
    await getAdapter().snapshot(payload);
    _commitBase(mockDB, Object.keys(payload)); // 上传成功 → 基线推进
  } catch (e) {
    console.warn('[DataAdapter] 增量快照写穿失败（已保留本地备份，下次 flush 自动重试）：', e);
  }
}

/**
 * pagehide 同步冲刷（I1）：防抖窗口内切页时，旧上下文的 setTimeout 随文档销毁，
 * 必须在卸载前【同步】发起快照请求（keepalive:true 由浏览器接管完成）。
 * 不能复用 _flushSnapshot：其 await import() 在卸载期间挂起，fetch 不会发出。
 * 依赖 _cachedMockDB 已由 init()（API 模式必经）缓存；未缓存时回退异步路径。
 */
function _flushSnapshotSync() {
  if (DATA_SOURCE !== 'api') return;
  if (!_cachedMockDB) {
    _flushSnapshot();
    return;
  }
  try {
    // snapshot() 内部为 async：fetch 在同步调用栈内发出（keepalive），
    // 卸载后剩余 await 可忽略；rejection 兜底避免 unhandledrejection
    const payload = _collectDirty(_cachedMockDB);
    if (!payload) return; // 无脏集合：跳过（2026-09-02 增量快照）
    getAdapter().snapshot(payload).catch((e) => {
      console.warn('[DataAdapter] 增量快照写穿失败（pagehide，已保留本地备份）：', e);
    });
  } catch (e) {
    console.warn('[DataAdapter] pagehide 快照发起失败（已保留本地备份）：', e);
  }
}

// ── 防抖快照 pagehide 兜底（P1 审查 I1）────────────────────────
// 本项目为多页应用（切页整页 reload）：用户在 800ms 防抖窗口内写入后立刻切页时，
// _snapshotTimer 随旧上下文销毁、快照永不发出，改动在服务器与下一页面同时消失且
// 用户零感知。故模块级注册 pagehide：有未冲刷的防抖排程时立即同步冲刷。
// 仅注册一次即可：_flushSnapshotSync 内部已校验数据源（非 api 直接 return），
// mock 模式下本监听不产生任何请求，不影响 dev 登录路径。
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => {
    if (_snapshotTimer) {
      clearTimeout(_snapshotTimer);
      _snapshotTimer = null;
      _flushSnapshotSync();
    }
  });
}
