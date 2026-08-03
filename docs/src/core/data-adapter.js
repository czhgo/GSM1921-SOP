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
//  Source: content/04_web_design/DATA_ARCHITECTURE.md
//         content/04_web_design/SCHOOL_IT_DEPLOYMENT.md
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
 * - handovers: 交接管理
 * - makeupTasks: 补课任务
 * - fileSpaceRecords: 文件空间
 * - imageRecords: 图片记录
 * - experienceDeposits: 经验沉淀
 * - complianceReferences: 合规引用
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

/**
 * 设置认证 Token（登录后调用）
 * @param {string} token - JWT Token
 */
export function setAuthToken(token) {
  _authToken = token;
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
        activities, tasks, attendances, inspections,
        taskforces, notices, todos, assignments,
        handovers, makeupTasks,
      ] = await Promise.all([
        adapter.activities.list(),
        adapter.tasks.list(),
        adapter.attendances.list(),
        adapter.inspections.list(),
        adapter.taskforces.list(),
        adapter.notices.list(),
        adapter.todos.list(),
        adapter.assignments.list(),
        adapter.handovers.list(),
        adapter.makeupTasks.list(),
      ]);

      // 填充 mockDB 缓存（供服务层同步读取）
      const { mockDB } = await import('./domain.js');
      // 缓存引用：pagehide 同步冲刷时不能再 await 动态 import（文档卸载中挂起），
      // 必须直接同步读取（见 _flushSnapshotSync）
      _cachedMockDB = mockDB;
      mockDB.activities = activities || [];
      mockDB.tasks = tasks || [];
      mockDB.attendances = attendances || [];
      mockDB.inspections = inspections || [];
      mockDB.taskforces = taskforces || [];
      mockDB.notices = notices || [];
      mockDB.todos = todos || [];
      mockDB.assignments = assignments || [];
      mockDB.handovers = handovers || [];
      mockDB.makeupTasks = makeupTasks || [];

      // 非服务端集合从本地备份恢复（文件空间/经验沉淀/合规引用等，
      // P2 才把这些表入后端，避免 API 模式下这些功能空态）
      try {
        const { restoreNicheCollections } = await import('./mock-adapter.js');
        restoreNicheCollections();
      } catch (e) {
        console.warn('[DataAdapter] init: 本地非服务端集合恢复失败：', e);
      }

      console.info('[DataAdapter] init: API 模式，已从后端拉取数据到缓存');
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
}

// ── API 模式全量快照写穿（防抖）──────────────────────────────

let _snapshotTimer = null;

/** 快照写穿防抖间隔（ms）：多次连续写合并为一次全量快照 */
const SNAPSHOT_DEBOUNCE_MS = 800;

/** domain.js mockDB 的缓存引用（init()/_flushSnapshot 加载后回写）：
 *  供 pagehide 同步冲刷使用——卸载期间动态 import 的 await 会挂起，无法异步取数 */
let _cachedMockDB = null;

/** 调度一次防抖快照写穿（已有排程则合并） */
function _scheduleSnapshot() {
  if (_snapshotTimer) return;
  _snapshotTimer = setTimeout(_flushSnapshot, SNAPSHOT_DEBOUNCE_MS);
}

/**
 * 执行全量快照写穿：读取 mockDB 的 10 个服务端集合（不含 users），
 * 整体 POST /api/v1/snapshot 覆盖写服务器。失败仅告警不抛出（不阻断 UI）。
 */
async function _flushSnapshot() {
  _snapshotTimer = null;
  // flush 时若数据源已切回 mock（如服务器不可达回退），跳过写穿
  if (DATA_SOURCE !== 'api') return;
  try {
    const { mockDB } = await import('./domain.js');
    _cachedMockDB = mockDB;
    const payload = {
      activities:  mockDB.activities,
      tasks:       mockDB.tasks,
      attendances: mockDB.attendances,
      inspections: mockDB.inspections,
      taskforces:  mockDB.taskforces,
      notices:     mockDB.notices,
      todos:       mockDB.todos,
      assignments: mockDB.assignments,
      handovers:   mockDB.handovers,
      makeupTasks: mockDB.makeupTasks,
    };
    await getAdapter().snapshot(payload);
  } catch (e) {
    console.warn('[DataAdapter] 全量快照写穿失败（已保留本地备份）：', e);
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
  const mockDB = _cachedMockDB;
  const payload = {
    activities:  mockDB.activities,
    tasks:       mockDB.tasks,
    attendances: mockDB.attendances,
    inspections: mockDB.inspections,
    taskforces:  mockDB.taskforces,
    notices:     mockDB.notices,
    todos:       mockDB.todos,
    assignments: mockDB.assignments,
    handovers:   mockDB.handovers,
    makeupTasks: mockDB.makeupTasks,
  };
  try {
    // snapshot() 内部为 async：fetch 在同步调用栈内发出（keepalive），
    // 卸载后剩余 await 可忽略；rejection 兜底避免 unhandledrejection
    getAdapter().snapshot(payload).catch((e) => {
      console.warn('[DataAdapter] 全量快照写穿失败（pagehide，已保留本地备份）：', e);
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

// ── 便捷方法（代理到当前适配器）──────────────────────────────

/**
 * 以下方法直接代理到 getAdapter()，提供与旧 runtime.js 兼容的调用方式。
 * 新代码建议直接使用 getAdapter() 获取适配器实例后调用。
 */

/** 加载数据库 */
export function loadDB() {
  return getAdapter().loadDB();
}

/** 保存数据库（兼容旧代码，新代码请用 persist()） */
export function saveDB() {
  return persist();
}

/** 列出所有活动 */
export function listActivities() {
  return getAdapter().activities.list();
}

/** 创建活动 */
export function createActivity(data) {
  return getAdapter().activities.create(data);
}

/** 更新活动 */
export function updateActivity(id, patch) {
  return getAdapter().activities.update(id, patch);
}

/** 删除活动 */
export function deleteActivity(id) {
  return getAdapter().activities.delete(id);
}

/** 归档活动 */
export function archiveActivity(id) {
  return getAdapter().activities.archive(id);
}

/** 切换品牌标记 */
export function toggleBrand(id) {
  return getAdapter().activities.toggleBrand(id);
}

/** 列出所有任务 */
export function listTasks() {
  return getAdapter().tasks.list();
}

/** 创建任务 */
export function createTask(data) {
  return getAdapter().tasks.create(data);
}

/** 更新任务 */
export function updateTask(taskId, patch) {
  return getAdapter().tasks.update(taskId, patch);
}
