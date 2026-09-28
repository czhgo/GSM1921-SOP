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

// 2026-09-17 批次 49：成功提示的统一等待点。本文件刻意**全部使用动态 import** 以避开
// 环依赖，此处是唯一静态 import —— 因 pending-writes 是**叶子模块**（零依赖），静态引入不成环，
// 且必须同步可用（persist() 在排程那一刻就要登记，不能等一个 await）。
import { trackWrite } from './pending-writes.js?v=20260928j';

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
      await _loadCollectionVersions(adapter); // P0-1：取集合版本基线（乐观锁）——不可得即抛（不静默降级）
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
      const { mockDB } = await import('./domain.js?v=20260928j');
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
      // T-209 全栈同步：再补拉 7 个数组域（报名/活动复盘/专班复盘/宣传任务/周报/档案/外发确认）
      // + 2 个聚合域（活动子记录/专班子记录，以 __root__ 单行存储，拉取后解包）。
      try {
        const [
          experienceDeposits, complianceReferences,
          fileSpaceRecords, imageRecords,
          signups, activityReviews, taskforceReviews,
          propTasks, weeklyReports, archiveRecords,
          externalDispatches,
          branchDocs,
          branches,
          memberChangeRequests, committeeBroadcasts, agendaVotes,
          appointmentRecords,
          reviewRequests,
          thoughtReports,
          partyGroups,
          memberFlows,
          actSubRecordsRows, tfSubRecordsRows,
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
          adapter.externalDispatches.list(),
          adapter.branchDocs.list(),
          // P1 党委后台（2026-09-02）：支部实例随全量快照恢复（党委台账/支部管理数据通路）
          adapter.branches.list(),
          adapter.memberChangeRequests.list(),
          adapter.committeeBroadcasts.list(),
          adapter.agendaVotes.list(),
          // P2 党委后台（2026-09-02）：支书任期记录随全量快照恢复
          adapter.appointmentRecords.list(),
          // P3 党委后台（2026-09-02）：支部上报审批随全量快照恢复（党委台/支部侧历史可见）
          adapter.reviewRequests.list(),
          // R-23（2026-09-13）：思想汇报随全量快照恢复（服务端表 thought_reports）
          adapter.thoughtReports.list(),
          // 2026-09-14 批次 25：党小组一等实体随全量快照恢复（服务端表 party_groups）
          adapter.partyGroups.list(),
          // 2026-09-14 批次 25：成员流动台账随全量快照恢复（服务端表 member_flows）
          adapter.memberFlows.list(),
          adapter.actSubRecords.list(),
          adapter.tfSubRecords.list(),
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
        mockDB.externalDispatches    = externalDispatches || [];
        mockDB.branchDocs            = branchDocs || [];
        mockDB.branches              = branches || [];
        mockDB.appointmentRecords    = appointmentRecords || [];
        mockDB.reviewRequests        = reviewRequests || [];
        mockDB.thoughtReports        = thoughtReports || [];
        // 2026-09-14 批次 25：党小组一等实体随全量快照恢复
        mockDB.partyGroups           = partyGroups || [];
        // 2026-09-14 批次 25：成员流动台账随全量快照恢复
        mockDB.memberFlows           = memberFlows || [];
        mockDB.memberChangeRequests  = memberChangeRequests || [];
        mockDB.committeeBroadcasts    = committeeBroadcasts || [];
        mockDB.agendaVotes           = agendaVotes || [];
        mockDB.actSubRecords         = _unwrapRootRows(actSubRecordsRows, {});
        mockDB.tfSubRecords          = _unwrapRootRows(tfSubRecordsRows, {});
      } catch (e) {
        console.warn('[DataAdapter] init: niche/新域集合拉取失败，回退本地备份：', e);
        try {
          const { restoreNicheCollections } = await import('./mock-adapter.js?v=20260928j');
          restoreNicheCollections();
        } catch (e2) {
          console.warn('[DataAdapter] init: 本地 niche 备份恢复失败：', e2);
        }
      }

      console.info('[DataAdapter] init: API 模式，已从后端拉取数据到缓存');
      // 持久化守卫解锁：mockDB 已由服务器数据填充，允许本地备份写（persist → mock-adapter.saveDB）。
      // ⚠ **基线捕获必须在任何 `await` 之前**（2026-09-25 批次 197 立、2026-09-26 批次 201 改准）：就绪信号
      //   `mockDB._loaded === true` **不等于** init 已完成 —— `entries/main-entry.js:32` 同步调
      //   `services/core/mock.js::loadDB()`，其 API 分支（`:59`）**立刻**置真 ⇒ 真机就绪门（`preparePage`）
      //   实际只剩 `milestones !== undefined`，而它是 `_loadAuxCollections` 第 5/7 个 pull 赋的 ⇒ **门比基线早**。
      //   原先 `_captureBase` 落在那个 pull 之后 ⇒ 门后写入被随后捕获的基线一并吞进基线 ⇒ `_collectDirty`
      //   判「无脏集合」⇒ 防抖 flush **不发 POST**、写入静默滞留内存（实测：推入后 3s 零 POST、本地数组完好、
      //   无整页重载）；同一机理也覆盖其后的 `SEED_FALLBACK` 回退块（内含 `await import`）。改准＝移到
      //   **与上文 25 个 payload 域同一同步块**（`_loadAuxCollections` 只碰不进快照 payload 的语义域）⇒ 基线逐键不变。
      _captureBase(mockDB);
      // T1（批次 163）：**三域语义端点拉取先于解锁**——`_loaded === true` 是「缓存已完整」的可观测判据
      //   （真机用例据此等待 init 完成；若拉取在解锁之后，读侧会撞上「缓存尚未填完」的窗口）。
      await _loadAuxCollections(mockDB); mockDB._loaded = true;
      // 2026-08-06 扎口修复（Z5）：服务端 seed 仅覆盖 7 张表，attendances/inspections/todos 在 API 模式下为空 → 回退本地 mock 种子（**受 `config/deploy.js::SEED_FALLBACK` 控制**：真实部署置 false 即不注入演示数据，见下），
      // 避免首屏考勤/考察/待办空白。注意：回退仅填充 mockDB 缓存，【不触发 persist/快照写穿】，
      // 否则页面加载期（800ms 防抖窗口内）会以落后的本地缓存覆盖服务器上其他入口刚写入的数据
      // （2026-08-06 e2e-login 回归根因）；服务器数据由用户后续真实操作经快照写穿自然获得。
      // 补课任务（makeupTasks）：**不在本处回退**——它的种子走**正规通道**（`server/seed.js` 的
      //   `replaceCollection('makeup_tasks')` 与 `mock-adapter._seedInitialData` **同源**注入
      //   `mock/seed.js::SEED_MAKEUP_TASKS`，批次 47-Y 起），两形态首启即有一致基线。
      //   ⚠ **原注「无静态种子（由纪检操作生成），空属合理，不回退」已过期并已更正**：那句口径把
      //   「成员台『去补课』入口在 api 形态下恒不渲染」解释成了正常现象，长期无人察觉
      //   （批 47-X 真机实测入口计数 0，批 47-Y 按 R-78 造出可达且自洽的前置后转正）。
      if (SEED_FALLBACK && (!mockDB.attendances.length || !mockDB.inspections.length)) {
        try {
          const { ATTENDANCE_RECORDS } = await import('../mock/attendance.js?v=20260928j');
          const { INSPECTION_RECORDS } = await import('../mock/inspection.js?v=20260928j');
          const filled = ['attendances', 'inspections'].filter((k) => !mockDB[k].length); // 实际被回退注入的键
          for (const k of filled) mockDB[k] = (k === 'attendances' ? ATTENDANCE_RECORDS : INSPECTION_RECORDS).map(r => ({ ...r }));
          _commitBase(mockDB, filled); // 2026-09-26 批次 206：只登记实际注入的键（原先并列写死 ⇒ 未回退的键也被推基线 ⇒ 并发写丢）
          console.info('[DataAdapter] init: 考勤/考察空集合已回退本地 seed');
        } catch (e) {
          console.warn('[DataAdapter] init: 考勤/考察 seed 回退失败：', e);
        }
      }
      if (SEED_FALLBACK && !mockDB.todos.length) {
        try {
          const { SEED_TODOS } = await import('../services/governance/todo.js?v=20260928j');
          mockDB.todos = SEED_TODOS.map(t => ({ ...t }));
          _commitBase(mockDB, ['todos']); // 回退值计入基线 ⇒ 不上传
          console.info('[DataAdapter] init: 待办空集合已回退本地 seed');
        } catch (e) {
          console.warn('[DataAdapter] init: 待办 seed 回退失败：', e);
        }
      }

      // 2026-09-02 增量快照：以「init 拉取完成态」为基线，flush 只上传与基线有差异的集合
      // （回退种子亦计入基线 → 不会自动污染服务器，契合 Z5 注释语义；见上方竞态修复）
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
    // 2026-09-17 批次 49：mock 形态是**同步** localStorage 写，写失败（配额/隐私模式）
    // 原实现会把异常抛给调用点、而调用点多在 showToast 之前 ⇒ 用户拿到的是「成功」。
    // 改为登记失败、由成功提示侧统一改报失败（不静默、也不中断业务流）。
    // 2026-09-28 支书裁定「静态模式只保留侧边栏/about 等区别，所有数据都走服务器 API」：
    // 无 API 会话（mock 形态）= **只读演示**——不落库，并登记失败让成功提示侧改报失败。
    if (isDemoReadOnly()) { trackWrite(Promise.reject(Object.assign(new Error(DEMO_READONLY_MESSAGE), { type: 'DemoReadOnlyError' }))); return; }
    try {
      _mockAdapter?.saveDB();
    } catch (e) {
      console.error('[DataAdapter] mock 落库失败：', e);
      trackWrite(Promise.reject(e));
    }
  } else {
    // API 模式：本地备份（服务器瞬时不可达不丢数据；mockDB 内容在 API 模式
    // 由 init() 从服务器填充，本地备份不参与读）+ 防抖全量快照写穿
    try {
      _mockAdapter?.saveDB();
    } catch (e) {
      console.warn('[DataAdapter] API 模式本地备份失败（不影响快照写穿）：', e);
      trackWrite(Promise.reject(e));
    }
    _scheduleSnapshot();
  }
  // 数据变更广播（2026-08-05）：persist() 是全部业务写路径的汇聚点，
  // 统一派发事件，让 header 角标/统计卡等消费点即时重算，消除"必须手动刷新"。
  notifyDataChanged();
}

// ── 数据变更事件总线（2026-08-05，响应支书"计算需手动刷新"）────────
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

/** 当前排程对应的结算器（批次 49）：flush 落地/失败时结算，供成功提示侧等待 */
let _flushDeferred = null;

/** 快照写穿防抖间隔（ms）：多次连续写合并为一次全量快照 */
const SNAPSHOT_DEBOUNCE_MS = 800;

/** domain.js mockDB 的缓存引用（init()/_flushSnapshot 加载后回写）：
 *  供 pagehide 同步冲刷使用——卸载期间动态 import 的 await 会挂起，无法异步取数 */
let _cachedMockDB = null;

/**
 * 聚合域解包（T-209 全栈同步）：actSubRecords/tfSubRecords 在服务端
 * 以「__root__ 单行」模式存储（{ id:'__root__', body:<原对象> }），init() 拉取时
 * 解包回原对象；空表回退默认值。
 * @param {Array} rows - list() 返回的行数组
 * @param {*} fallback - 空表时的默认值
 */
function _unwrapRootRows(rows, fallback) {
  if (!Array.isArray(rows) || rows.length === 0) return fallback;
  const row = rows.find((r) => r && r.id === '__root__');
  return row && row.body !== undefined ? row.body : fallback;
}

// ── 脏集合增量快照 + 集合版本乐观锁（2026-09-02 增量 / 2026-09-23 P0-1 加锁）──────
// 背景：原全量快照「26 域整表替换」有致命缺陷——内存滞后的在线用户一次写会把他人数据整体覆盖
// （真机双账号演练实证：跨集合互洗，A 写活动被 B 写待办洗掉）⇒ 修复为「只上传与基线有差异的集合」。
//   基线（_base） = init() 拉取完成时 + 每次 flush 成功后，各集合的序列化缓存；flush 时逐域比较 → 只 POST 脏集合。
// **P0-1 补齐「同集合双写」这一残余窗口**：上传时随 payload 带 `_versions`（各脏集合的基线版本，取自 init() 的
//   GET /api/v1/snapshot/versions）；服务端逐集合比对，不一致 ⇒ 409 且**整批不写** ⇒ 后写者不覆盖先写者；
//   前端遇 409 → 重拉冲突集合 + 提示「已被他人更新，已为你刷新」。残余：未带 `_versions` 的直连调用按无条件写（见 resources.js 末尾）。
let _base = {};
let _versions = {};

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

/**
 * 调度一次防抖快照写穿（已有排程则合并）。
 *
 * 2026-09-17 批次 49（支书裁定「存好了才报成功」全站统一）：**排程即登记**——
 * 若等到 flush 真正执行时才登记，紧随其后的成功提示会在「排程刚建好、flush 还没跑」的
 * 空窗里看到「无在途写」而**立即报成功**，判据就白设了。故此处同步建一个 deferred、
 * 交给 `trackWrite` 登记，`_flushSnapshot` 完成（或失败）时结算它。
 * 防抖合并天然生效：同一窗口内的多次写共用同一个 deferred。
 */
function _scheduleSnapshot() {
  if (_snapshotTimer) return;
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  _flushDeferred = { resolve, reject };
  trackWrite(promise);
  _snapshotTimer = setTimeout(() => { _flushSnapshot().catch(() => {}); }, SNAPSHOT_DEBOUNCE_MS);
}

/**
 * 构造全量快照 payload（T-209 全栈同步：覆盖 25 个快照域，不含 users 与 branchDocs 等按纪律排除项）
 * agendaVotes 为 REST 直写域，不进快照 payload（防防抖窗口以陈旧缓存覆盖服务器新表态）
 * 聚合域（actSubRecords/tfSubRecords）包装为「__root__ 单行」，
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
    externalDispatches: mockDB.externalDispatches,
    thoughtReports: mockDB.thoughtReports,
    // 2026-09-14 批次 25：党小组一等实体（服务端 party_groups 表随快照写穿）
    partyGroups: mockDB.partyGroups,
    // 2026-09-14 批次 25：成员流动台账（服务端 member_flows 表随快照写穿）
    memberFlows: mockDB.memberFlows,
    actSubRecords:  [{ id: '__root__', body: mockDB.actSubRecords || {} }],
    tfSubRecords:   [{ id: '__root__', body: mockDB.tfSubRecords || {} }],
  };
}

/**
 * 执行全量快照写穿：读取 mockDB 的全部持久化域（不含 users），
 * 整体 POST /api/v1/snapshot 覆盖写服务器。
 *
 * 失败处理（2026-09-17 批次 49 改）：**告警 + 向上抛**。原实现「失败仅告警不抛出」，
 * 结果是「未落库」这件事对等待方不可见 —— 成功提示照样弹。现改为：
 * ① 先结算本次排程的 deferred（失败即 reject，`trackWrite` 会记下这条失败，
 *    成功提示侧据此改报失败）；② 再抛出，让显式调用 `flushSnapshot()` 的调用方也能感知。
 * 防抖路径（setTimeout）已挂 `.catch(() => {})`，不会产生 unhandledrejection。
 */
async function _flushSnapshot() {
  _snapshotTimer = null;
  const deferred = _flushDeferred;
  _flushDeferred = null;
  // flush 时若数据源已切回 mock（如服务器不可达回退），跳过写穿
  if (DATA_SOURCE !== 'api') { deferred?.resolve(); return; }
  try {
    const { mockDB } = await import('./domain.js?v=20260928j');
    _cachedMockDB = mockDB;
    const dirty = _collectDirty(mockDB);
    if (!dirty) { deferred?.resolve(); return; } // 无脏集合：跳过上传（2026-09-02 增量快照）
    // P0-1：随 payload 带 `_versions`（各脏集合的基线版本）→ 服务端逐集合乐观锁比对
    const { keys, payload } = _withVersions(dirty);
    const resp = await getAdapter().snapshot(payload);
    _commitVersions(keys, resp);          // 服务端回传的新版本 → 推进本地基线版本
    _commitBase(mockDB, keys);            // 上传成功 → 数据基线推进
    _postDataChangedBroadcast(keys);      // P1-1：同源其它标签**零网络**即知（不必等轮询周期）
    deferred?.resolve();
  } catch (e) {
    console.warn('[DataAdapter] 增量快照写穿失败（已保留本地备份，下次 flush 自动重试）：', e);
    deferred?.reject(e);
    // P0-1 409（同集合被别人先写）：不推进基线 + 重拉冲突集合 + 提示用户（`_recoverFromConflict` 内部给 showToast）
    if (e && e.status === 409) {
      await _recoverFromConflict(e).catch((err) => console.warn('[DataAdapter] 版本冲突后刷新失败：', err));
    }
    throw e;
  }
}

/**
 * 立即冲刷待发送的快照（R-23，2026-09-13）：
 * 业务副作用须「先落服务端表、再据表复算授权」时（如思想汇报提交 → 系统通知 authorize
 * 读 thought_reports 表），防抖窗口会让服务端尚未拿到新行 → 授权 403。调用方 await 本函数
 * 确保本次写入已随快照落服务端后再触发后续服务端判定。
 * 无待冲刷排程时也执行一次（幂等：无脏集合时 _flushSnapshot 直接返回）。
 */
export async function flushSnapshot() {
  if (_snapshotTimer) {
    clearTimeout(_snapshotTimer);
    _snapshotTimer = null;
  }
  await _flushSnapshot();
}

/**
 * pagehide 同步冲刷（I1）：防抖窗口内切页时，旧上下文的 setTimeout 随文档销毁，
 * 必须在卸载前【同步】发起快照请求。**T2（2026-09-23 批次 163）改准**：此前注释称
 * 「keepalive:true 由浏览器接管完成」，而实现发的是**普通 fetch**、且被 8s 超时器覆盖
 * （文案与实现脱节）。现按体量择路：≤ keepalive 上限发 keepalive 请求（浏览器接管完成、不挂超时器）；
 * 超限回退普通 fetch，并在 ApiAdapter 显式告警「本次可能不被送达」。
 * 不能复用 _flushSnapshot：其 await import() 在卸载期间挂起，fetch 不会发出。
 * 依赖 _cachedMockDB 已由 init()（API 模式必经）缓存；未缓存时回退异步路径。
 */
function _flushSnapshotSync() {
  if (DATA_SOURCE !== 'api') return;
  if (!_cachedMockDB) {
    // 批次 49：这条兜底路径也抛失败 ⇒ 必须自挂 catch（此路径无等待方）
    _flushSnapshot().catch(() => {});
    return;
  }
  try {
    // snapshot(payload, {keepalive:true}) 内部为 async：fetch 在同步调用栈内发出
    // （≤ 体量上限走 keepalive，超限由 ApiAdapter 回退普通请求并告警）；
    // 卸载后剩余 await 可忽略；rejection 兜底避免 unhandledrejection
    const dirty = _collectDirty(_cachedMockDB);
    if (!dirty) { _flushDeferred?.resolve(); _flushDeferred = null; return; } // 无脏集合：跳过（2026-09-02 增量快照）
    // 批次 49：卸载路径由浏览器接管请求完成，本上下文无法再观测结果 ⇒ **结算排程**，
    // 否则 deferred 永远挂着、`settleWrites()` 会在它上面空等（真机表现为成功提示不出）。
    _flushDeferred?.resolve();
    _flushDeferred = null;
    // P0-1：同样带 `_versions`——`_withVersions` 覆盖 dirty 的全部键（T5 批次 163 起服务端**拒收**缺版本的集合）
    const { payload } = _withVersions(dirty);
    getAdapter().snapshot(payload, { keepalive: true }).catch((e) => {
      console.warn('[DataAdapter] 增量快照写穿失败（pagehide，已保留本地备份）：', e);
    });
  } catch (e) {
    _flushDeferred?.resolve();
    _flushDeferred = null;
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

// ════════════════════════════════════════════════════════════════
//  P0-1（2026-09-23 支书裁定「系统一周内上服务器」· 六项 P0 之一）：快照写穿的**集合版本乐观锁**
//  + P0-2：**形态可断言**（`getRuntimeMode`）与**有 token 时禁止静默降级**（`hydrateDataSource` /
//  `renderDataSourceError`）。协议的服务端一侧 = `server/routes/resources.js` 末尾「快照写穿的集合版本号协议」段。
//  ⚠ 本段整体置于文件末尾：上文行号是 README-server.md 的取证靶点（`docs/src/core/data-adapter.js:53-54,441-451,513-514,543-544`，
//    `doc-line-ref.test.mjs` 逐条核）；模块顶层声明在被调用前已完成求值 ⇒ 置尾安全。
// ════════════════════════════════════════════════════════════════

/**
 * 取集合版本基线（乐观锁的起点）：`GET /api/v1/snapshot/versions` → `{ 集合名: 版本 }`。
 * **失败即抛**（不静默降级）：没有基线就没法判断「我手里这份数据是否已被别人改过」，
 * 降级为「不带版本上传」＝退回整表覆盖（正是 P0-1 要修的丢数据形态）⇒ 宁可让 init() 失败、
 * 由页面显式报「无法连接服务器」（见 `hydrateDataSource`）。
 * @param {Object} adapter 当前 API 适配器
 */
async function _loadCollectionVersions(adapter) {
  if (typeof adapter.versions !== 'function') {
    throw new Error('[DataAdapter] API 适配器未实现 versions()：无法取得集合版本基线（服务端须为 P0-1 版）');
  }
  const resp = await adapter.versions();
  const v = resp && resp.versions;
  if (!v || typeof v !== 'object') {
    throw new Error('[DataAdapter] 集合版本基线响应异常（缺 versions 字段）');
  }
  _versions = { ...v };
}

/** 给脏集合 payload 挂上 `_versions`；返回 keys（供基线推进用，**不含 `_versions` 本身**） */
function _withVersions(dirty) {
  const keys = Object.keys(dirty);
  const versions = {};
  for (const k of keys) versions[k] = (_versions[k] === undefined ? 0 : _versions[k]);
  return { keys, payload: { ...dirty, _versions: versions } };
}

/** 上传成功后推进本地版本基线（服务端回传的新版本；未回传则保持原值，下次上传若撞 409 会走冲突恢复） */
function _commitVersions(keys, resp) {
  const next = resp && resp.versions;
  if (!next || typeof next !== 'object') return;
  for (const k of keys) {
    if (typeof next[k] === 'number') _versions[k] = next[k];
  }
}

/** 把「服务端拉回来的某集合」写回 mockDB（聚合域按 __root__ 单行解包，与 init() 同一口径） */
function _assignCollection(mockDB, name, rows) {
  if (name === 'actSubRecords' || name === 'tfSubRecords') {
    mockDB[name] = _unwrapRootRows(rows, {});
    return;
  }
  mockDB[name] = Array.isArray(rows) ? rows : [];
}

/**
 * 409 冲突恢复（P0-1）：**不推进失败那次的基线**，改为重拉冲突集合并采用服务端权威数据，
 * 再用业务语言提示用户（成功提示走的是 `pending-writes` 的失败分支，见批次 49）。
 * 重拉动作本身＝`_refreshCollections`（与 P1-1 的**远端变更探测**共用同一份实现，顺序纪律见该函数注释）。
 * @param {Error} e 服务端 409 的 Error（`e.body.conflicts`）
 */
async function _recoverFromConflict(e) {
  const raw = (e && e.body && Array.isArray(e.body.conflicts)) ? e.body.conflicts : [];
  const names = [...new Set(raw.map((c) => c && c.collection).filter((n) => typeof n === 'string' && n))];
  if (!names.length) {
    console.warn('[DataAdapter] 409 冲突但未给出冲突集合清单，无法定向刷新');
    return;
  }
  const { mockDB } = await import('./domain.js?v=20260928j');
  await _refreshCollections(names, mockDB);
  // 业务语言提示（既有告警通道 + 支书要求的可读文案）
  try {
    const { showToast } = await import('./utils.js?v=20260928j');
    showToast('info', '数据已被他人更新，已为你刷新');
  } catch (err) {
    console.warn('[DataAdapter] 冲突提示渲染失败：', err);
  }
}

// ── P0-2：形态可断言 + 有 token 时禁止静默降级 ──────────────────────
// 支书裁定（2026-09-23）：「**形态（数据源）必须可断言、不许静默降级**」。判据单一源＝本段：
//   · `getRuntimeMode()`：运行时形态的唯一可读查询（测试据此断言「我确在 api 形态」）；
//   · `hydrateDataSource()`：11 个独立页此前各自复制「取 token → 切 api → init() → 失败静默回退 mock」
//     （那正是「用户以为在真系统里操作、实际只写浏览器，下次登录被服务端覆盖 ⇒ 静默丢单」的成因）
//     ⇒ 收敛到本函数一处：**有 token 时 init() 失败即显式失败**（页面错误态 + 重试），
//     **无 token 的本地演示形态保持原状**（那条路是刻意保留的：静态托管 / 演示账号）。
//   **T3（2026-09-23 批次 163）补「无 token」分支**：原实现「无 token ⇒ 一律切 mock 并放行可写」，
//     把「真系统用户会话失效（sessionStorage 被清 / 换标签）」也静默降级成了可写演示态 ⇒ 静默丢单。
//     现以 `isStaleServerSession()` 三条件判据区分「演示态」与「会话掉线」（见该函数注释），
//     掉线态给「会话已失效，请重新登录」提示（`renderSessionExpiredError`，与错误态同一浮层）。
//     ⚠ 覆盖面＝调本函数的 11 个独立页；`bootstrapPage`（core/bootstrap.js，工作台/首页）不在本次可改面内，
//       那条路上的同型缺口未修（已在交付报告如实登记）。

/**
 * 运行时形态查询（**单一源**）：测试与运维据此断言「当前到底是什么形态」，不再靠猜。
 * @returns {{source:'mock'|'api', hasToken:boolean, branchId:string|null, stage:'server'|'static'}}
 *   · source   — 当前数据源（api=真系统；mock=浏览器本地）
 *   · hasToken — 是否存在 API 会话 token（sessionStorage `gsm1921-api-token`）
 *   · branchId — 当前会话所属支部（登录快照所见；取不到 ⇒ null）
 *   · stage    — 部署形态（`docs/src/config/deploy.js::DEPLOY_MODE`：server=同源后端 / static=静态托管）
 */
export function getRuntimeMode() {
  let hasToken = false;
  try { hasToken = Boolean(sessionStorage.getItem('gsm1921-api-token')); } catch (_) { hasToken = false; }
  let branchId = null;
  try {
    const raw = localStorage.getItem('gsm1921-login-user');
    if (raw) {
      const u = JSON.parse(raw);
      branchId = u.branchId || (u.user && u.user.branchId) || null;
    }
  } catch (_) { branchId = null; }
  return { source: DATA_SOURCE, hasToken, branchId, stage: DEPLOY_MODE };
}

/**
 * 渲染「无法连接服务器」错误态（P0-2 共享实现，唯一一处建这个浮层）。
 * 不动页面其余结构：全屏遮罩 + 可读文案 + 一个动作按钮（缺省「重试」＝重载当前页，重走 init）。
 * @param {string} [detail] 附加说明（如原始错误消息，便于值班排查）
 * @param {Object} [opts] 文案/动作覆盖（**T3 会话失效态复用同一样式**，故不另建浮层）
 * @param {string} [opts.title] 标题（缺省「无法连接服务器」）
 * @param {string} [opts.message] 正文（缺省「连接失败」文案）
 * @param {string} [opts.note] 备注小字（缺省「不会退回本地演示数据」）
 * @param {string} [opts.actionLabel] 按钮文案（缺省「重试」）
 * @param {Function} [opts.onAction] 按钮动作（缺省 `location.reload()`）
 */
export function renderDataSourceError(detail, opts = {}) {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.getElementById('data-source-error')) return; // 幂等：不叠层
  const wrap = document.createElement('div');
  wrap.id = 'data-source-error';
  wrap.setAttribute('role', 'alert');
  wrap.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000',
    'display:flex', 'align-items:center', 'justify-content:center',
    'background:rgba(17,24,39,0.55)', 'padding:1.5rem',
  ].join(';');
  const box = document.createElement('div');
  box.style.cssText = [
    'max-width:26rem', 'width:100%', 'background:#fff', 'border-radius:12px',
    'padding:1.5rem', 'box-shadow:0 12px 40px rgba(0,0,0,0.2)', 'text-align:center',
  ].join(';');
  const title = document.createElement('h2');
  title.textContent = opts.title || '无法连接服务器';
  title.style.cssText = 'font-size:1.0625rem;font-weight:600;color:#111827;margin:0 0 0.5rem';
  const p1 = document.createElement('p');
  p1.textContent = opts.message || '当前会话需要服务器数据，但连接失败，页面未加载。请稍后重试；若持续失败，请联系管理员。';
  p1.style.cssText = 'font-size:0.875rem;color:#374151;line-height:1.6;margin:0 0 0.5rem';
  const p2 = document.createElement('p');
  p2.textContent = opts.note !== undefined ? opts.note : '（为避免你误以为已保存，系统不会退回本地演示数据。）';
  p2.style.cssText = 'font-size:0.8125rem;color:#6B7280;margin:0 0 1rem';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = opts.actionLabel || '重试';
  btn.style.cssText = [
    'padding:0.5rem 1.25rem', 'border-radius:8px', 'border:1px solid #D1D5DB',
    'background:#F9FAFB', 'font-size:0.875rem', 'cursor:pointer',
  ].join(';');
  btn.addEventListener('click', () => {
    if (typeof opts.onAction === 'function') { try { opts.onAction(); } catch (_) { /* 忽略 */ } return; }
    try { window.location.reload(); } catch (_) { /* 忽略 */ }
  });
  box.appendChild(title); box.appendChild(p1); box.appendChild(p2); box.appendChild(btn);
  if (detail) {
    const d = document.createElement('p');
    d.textContent = `技术详情：${detail}`;
    d.style.cssText = 'font-size:0.75rem;color:#9CA3AF;margin:0.75rem 0 0;word-break:break-word';
    box.appendChild(d);
  }
  wrap.appendChild(box);
  document.body.appendChild(wrap);
}

/**
 * 渲染「会话已失效」提示态（**T3 专用，复用上面同一浮层样式**，不另建一套）。
 * 业务语言文案 + 「去登录页」动作（相对当前目录拼 `login.html`，与各页既有的相对跳转口径一致）。
 */
export function renderSessionExpiredError() {
  const dir = (typeof window !== 'undefined' && window.location && window.location.pathname)
    ? window.location.pathname.replace(/[^/]*$/, '')
    : '';
  renderDataSourceError(null, {
    title: '会话已失效，请重新登录',
    message: '你在本机的登录会话已失效（例如清除了浏览器会话数据，或换到了一个新的标签页）。为避免把数据误写到本机浏览器，页面没有加载。请重新登录后继续。',
    note: '（你的数据保存在服务器上，重新登录即可恢复。）',
    actionLabel: '去登录页',
    onAction: () => { window.location.href = `${dir}login.html`; },
  });
}

/**
 * 「本机存在失效的服务端会话痕迹」判据（**T3 单一判据**，2026-09-23 批次 163）。
 * 三条同时成立才为真（键名单一源＝`services/core/auth.js` 的 `LOGIN_KEY` / `SESSION_KEY`，`login-snapshot.js` 同款）：
 *   ① 本机有登录痕迹：localStorage `gsm1921-login-user` 在场（＝这台机器上登录过，不论哪个标签页/哪次会话）；
 *   ② 本标签页**没有**会话快照：sessionStorage `gsm1921-session-snap` 缺失 ⇒ 本标签页从未登录过
 *      （登录是别的标签页或早先的会话留下的）——**正是「token 失效（sessionStorage 被清）/ 换标签」的形态**；
 *   ③ 部署形态是 `server`（`config/deploy.js::DEPLOY_MODE`）：静态托管（GitHub Pages）本来就无后端，
 *      「无 token」是常态而非异常，属刻意保留的演示形态。
 * 反例（任一不成立 ⇒ 判为「正常的本地演示」，放行 loadMock）：
 *   · 无任何登录痕迹的访客（首次访问 / 纯本地演示）；
 *   · 本标签页刚刚用开发身份卡登录（devLogin 会同时写 localStorage + sessionStorage 快照）；
 *   · 已显式退出登录（logout 会清掉 LOGIN_KEY）。
 * ⚠ 「开发身份卡」这条路是刻意保留的（`AuthStore.devLogin` 明写「开发模式是纯 mock 路径」），
 *   故判据必须用 ② 把它与「真系统会话掉线」区分开——否则真机演示一进独立页就被拦。
 * @returns {boolean}
 */
function isStaleServerSession() {
  if (DEPLOY_MODE !== 'server') return false;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gsm1921-api-token')) return false; // 调用方已保证无 token
    const hasLoginTrace = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('gsm1921-login-user'));
    if (!hasLoginTrace) return false;
    const hasTabSession = typeof sessionStorage !== 'undefined' && Boolean(sessionStorage.getItem('gsm1921-session-snap'));
    return !hasTabSession;
  } catch (_) { return false; }
}

/**
 * 数据层初始化（**P0-2 的唯一收敛点**）：有 token ⇒ 切 api 数据源 + `init()`；
 * init() 失败 ⇒ **显式失败**（错误态 + 重试），**绝不**切到可写的 mock；
 * 无 token ⇒ 本机有**失效会话痕迹**则提示「会话已失效，请重新登录」（T3），否则本地演示形态（调用方钩子）。
 * @param {Object} opts
 * @param {Object} [opts.apiAdapter] API 适配器实例（`registerApiAdapter` 亦在此收口）
 * @param {Function} [opts.loadMock] 无 token（本地演示形态）时的本地加载钩子，如 `() => BranchService.loadDB()`
 * @returns {Promise<{ok:boolean, source:'api'|'mock', hasToken:boolean, error?:Error}>}
 */
export async function hydrateDataSource({ apiAdapter, loadMock } = {}) {
  if (apiAdapter) registerApiAdapter(apiAdapter);
  let hasToken = false;
  try { hasToken = Boolean(sessionStorage.getItem('gsm1921-api-token')); } catch (_) { hasToken = false; }
  if (!hasToken) {
    // T3（2026-09-23 批次 163）：**无 token 不得无条件静默进入可写的演示 mock**。
    // 病灶：真系统用户会话失效（sessionStorage 被清 / 换标签）后，界面照常可写浏览器、无任何提示
    // ⇒ 用户以为在真系统里操作，下次登录被服务端数据覆盖（静默丢单）。判据见 isStaleServerSession()。
    if (isStaleServerSession()) {
      console.warn('[DataAdapter] 检测到本机登录痕迹但本标签页无会话（token 失效/换标签）——按 T3 给提示态，不回落可写 mock');
      renderSessionExpiredError();
      return { ok: false, source: 'mock', hasToken: false };
    }
    setDataSource('mock');
    if (typeof loadMock === 'function') loadMock();
    return { ok: true, source: 'mock', hasToken: false };
  }
  setDataSource('api', { apiBaseUrl: '', authToken: sessionStorage.getItem('gsm1921-api-token') });
  try {
    await init();
    return { ok: true, source: 'api', hasToken: true };
  } catch (error) {
    console.error('[DataAdapter] API 数据加载失败——按 P0-2 显式失败（不回落可写 mock，避免静默丢单）：', error);
    renderDataSourceError(error && error.message);
    return { ok: false, source: 'api', hasToken: true, error };
  }
}

// 部署形态常量（`getRuntimeMode().stage` 的取值来源）：server=同源后端（Node 动态注入）/ static=静态托管。
// ⚠ 同本文件既有纪律：**置尾**以保上文行号（README-server.md 的 `文件:行号` 取证引用）；import 声明被提升，置尾不影响语义。
import { DEPLOY_MODE, DEMO_READONLY } from '../config/deploy.js?v=20260928j';
// `SEED_FALLBACK`（空域 seed 回退开关）**用命名空间导入**：Node 托管形态下 `/src/config/deploy.js`
//   由 `server/app.js` 注入，**已带上该常量**（值由 env `SEED_FALLBACK=0` 决定，缺省 `true`）。仍保持
//   命名空间导入（不用命名导入）：托管形态不止一种，命名导入遇上缺导出的宿主会 **SyntaxError**
//   ⇒ 取不到即按**默认 `true`**（＝既有行为）。完整语义见 `config/deploy.js` 与本文件 `_deployConfig`。
import * as _deployConfig from '../config/deploy.js?v=20260928j';
const SEED_FALLBACK = _deployConfig.SEED_FALLBACK !== undefined ? _deployConfig.SEED_FALLBACK : true;

// ════════════════════════════════════════════════════════════════
//  T1（2026-09-23 批次 163）：三个**语义端点域**的 init 拉取
// ════════════════════════════════════════════════════════════════
// 病灶：`handoffs` / 成员变更确认队列 / `milestones` 三域**没有服务端对源**——
//   api 形态下 `mockDB.handoffs` 恒为 `[]`（不在快照 payload、不在 init 拉取列表、无服务端表）⇒ 刷新即丢；
//   确认队列只活在 localStorage；里程碑只读静态文件。现服务端建表 + 语义端点（见 server/routes/resources.js
//   末「语义端点」段、server/db.js::SEMANTIC_TABLES），本函数按 `agendaVotes` 的取法逐域拉取填缓存。
// ⚠ 这三域**故意不进快照 payload**（`_buildSnapshotPayload` 不含它们）⇒ 写口走语义端点、快照不碰它们；
//   故本函数**必须在 `_captureBase` 之前**调用，且拉到的值天然不进基线（基线只遍历 payload 的键）。
// 失败语义：**逐域独立兜底、不抛**——拉取失败时保留本地既有值（本地备份/空数组），不阻断 init 主流程
//   （主集合已由上文拉取成功；若这里抛出，会把整页打成「无法连接服务器」，代价过大）。
/**
 * @param {Object} mockDB 缓存对象（`core/domain.js::mockDB`）
 */
async function _loadAuxCollections(mockDB) {
  const adapter = getAdapter();
  const pull = async (group, key, fallback) => {
    try {
      if (!adapter[group] || typeof adapter[group].list !== 'function') return;
      const rows = await adapter[group].list();
      if (Array.isArray(rows)) mockDB[key] = rows;
    } catch (e) {
      console.warn(`[DataAdapter] init: ${group} 拉取失败，保留本地值：`, e);
    }
    if (mockDB[key] === undefined) mockDB[key] = fallback;
  };
  await pull('handoffs', 'handoffs', []); await pull('attendanceAppeals', 'attendanceAppeals', []);
  await pull('memberConfirmations', 'pendingMemberConfirmations', []); await pull('inspectionAppeals', 'inspectionAppeals', []);
  await pull('milestones', 'milestones', []); await pull('issueUnread', 'issueUnread', []); await pull('authAudit', 'authAudit', []);
}

// ════════════════════════════════════════════════════════════════
//  P1-1（2026-09-24 批次 164 · 支书逐字指令「必须把网页升级成系统！【浏览器缓存固然有用但
//  不能什么都依靠浏览器缓存！】」）：**多标签 / 多设备「远端变更探测」**——去缓存化的最后一块。
// ════════════════════════════════════════════════════════════════
// 病灶（只读审计核实）：`init()` 只在**页面加载那一刻**从服务器拉一次，之后全部读操作走 `mockDB`
//   内存缓存 ⇒ **B 看到 A 写入的唯一途径是整页重载**（跨标签 / 跨设备同病；全仓无业务级跨标签同步）。
// 方案＝**版本戳轮询**（推荐方案①，同时覆盖跨设备）：复用既有 P0-1 三件套——服务端集合版本号
//   （`GET /api/v1/snapshot/versions`）＋ 本机基线 `_versions` ＋ 逐集合重拉 `_refreshCollections`
//   （与 409 冲突恢复**同一份实现**，顺序纪律见该函数注释），**只对版本不一致的集合**重拉。
// 触发时机（两条，均低频）：
//   ① `visibilitychange` 转为可见：由 `entries/main-entry.js` 的**既有骨架**调用 `probeRemoteChanges()`
//      （复用那个监听器，本模块**不再另挂**一个 visibility 监听）；
//   ② 可见态下的低频定时器（`REMOTE_PROBE_INTERVAL_MS`；本模块自动挂，隐藏态不探测、零网络）。
// 避让（**缺一不可**——否则会把本机未提交的改动当「远端更新」回滚掉）：
//   · 有 pending write（防抖窗口内 `_snapshotTimer` 非空 / 有未结算的 `_flushDeferred`）⇒ 整次探测跳过；
//   · `init()` 未完成（`_cachedMockDB._loaded !== true`）⇒ 跳过；
//   · 本机**当前仍脏**的集合（`_collectDirty` 的键）**逐个排除**在重拉清单之外——这条同时覆盖
//     「flush 请求在途」（基线未推进 ⇒ 该集合仍算脏）与「未经 persist 的本地改动」两种窗口；
//   · 同一时刻只允许一次探测在飞（`_remoteProbeInFlight` 去重）。
// 失败降级：探测**只读、无副作用** ⇒ 失败一律**静默**（仅 `console.warn`），不弹错误、不影响正常使用。
//   ⚠ 这与写链的 fail-fast 是两件事：写链（`persist`/`_flushSnapshot`）行为一字未改、不弱化。
// 开关：`localStorage` 键 `gsm1921-remote-probe`，取值 `off` / `0` / `false` ⇒ 关（**默认开**）。
// mock 形态：`DATA_SOURCE !== 'api'` ⇒ 直接跳过（零网络请求）⇒ 探测自动不启用。
// ⚠ 同本文件既有纪律：**本段整体置于文件末尾**——上文行号是 README-server.md 的取证靶点
//   （`docs/src/core/data-adapter.js:53-54,441-451,513-514,543-544`，`doc-line-ref.test.mjs` 逐条核）；
//   函数声明提升 ⇒ 上文 `_flushSnapshot` / `_recoverFromConflict` 引用本段函数安全。

/** 远端变更探测的间隔（ms）。取值理由：多标签/多设备的「别人刚写的」容忍度以「分钟」计即可；
 *  取 60s 落在一个探测周期内既能让用户几乎无感，又不构成高频轮询（每次仅 1 个 versions 请求 + 三域小集合）。 */
const REMOTE_PROBE_INTERVAL_MS = 60 * 1000;

/** 探测开关的 localStorage 偏好键（**默认开**；运维置 `off` 即关掉轮询 + 广播触发的探测） */
export const REMOTE_PROBE_PREF_KEY = 'gsm1921-remote-probe';

/** 跨标签即时通知（BroadcastChannel）频道名——同源多标签专用，**零网络**，只做「去探测」的唤醒信号 */
const REMOTE_PROBE_CHANNEL = 'gsm1921-data-changed';

/**
 * 语义端点三域（`handoffs` / 成员变更确认队列 / `milestones`）的探测清单。
 * **为什么不用版本号、而是每次探测直接重拉**：这三域**故意不进快照 payload**（见 `_loadAuxCollections`
 *   注释与 `server/routes/resources.js` 末「语义端点」段）⇒ 它们的名字不进 `GET /snapshot/versions`
 *   的集合全集（`_allCollectionVersions` 只遍历 `RESOURCE_TABLES`）。要把它们塞进那个全集，就得改
 *   「**语义端点域不进快照集合**」这条既有设计不变量（`server/test/records-endpoints.test.mjs::T1-④`
 *   正逐条守着它）⇒ 代价是**动一条既有断言**，收益只是少 3 个小集合的 GET。三域体量极小
 *   （交接几条 / 待确认几条 / 里程碑十几条）⇒ 选择「直接重拉 + 内容比对」，**不触碰任何既有断言**。
 * `key` ＝ mockDB 上的缓存键（`memberConfirmations` 在缓存里叫 `pendingMemberConfirmations`，
 *   与 `_loadAuxCollections` 同源，勿另立第二套映射）。
 */
const REMOTE_PROBE_AUX = [
  { group: 'handoffs', key: 'handoffs' },
  { group: 'memberConfirmations', key: 'pendingMemberConfirmations' },
  { group: 'milestones', key: 'milestones' },
  // 2026-09-24 批次 169：申诉队列 / 反馈未读标记 / 授权审计留痕（同属语义端点域，同取法）
  { group: 'attendanceAppeals', key: 'attendanceAppeals' },
  { group: 'inspectionAppeals', key: 'inspectionAppeals' },
  { group: 'issueUnread', key: 'issueUnread' },
  { group: 'authAudit', key: 'authAudit' },
];

/** 探测开关读取（缺省 / 存储不可用 ⇒ 开）。每次现读 ⇒ 运维改键立即生效，无需重载。 */
export function isRemoteProbeEnabled() {
  try {
    if (typeof localStorage === 'undefined') return false; // 无 localStorage（非浏览器）：不启用
    const v = localStorage.getItem(REMOTE_PROBE_PREF_KEY);
    return v !== 'off' && v !== '0' && v !== 'false';
  } catch (_) { return true; }
}

/** 探测开关写入（`on=false` ⇒ 关；`on=true` ⇒ 删除偏好键＝回到默认开）。运维/测试用。 */
export function setRemoteProbeEnabled(on) {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (on) localStorage.removeItem(REMOTE_PROBE_PREF_KEY);
    else localStorage.setItem(REMOTE_PROBE_PREF_KEY, 'off');
    return true;
  } catch (_) { return false; }
}

let _remoteProbeInFlight = false;
let _remoteProbeTimer = null;
let _dataChangedChannel = null;

/**
 * 按集合名重拉服务端权威数据并采用（**409 冲突恢复与远端变更探测共用**）。
 * 顺序**有意为之、不许打乱**：**先取版本、再拉数据**——这样即便期间又有人写，我记下的版本也只会**偏旧**，
 * 下次上传会被拒（安全方向）；绝不会出现「拿着旧数据却记着新版本」而无冲突通过（危险方向）。
 * 并**只对真拉到的集合推进基线**（未拉到的保持旧基线：宁可下次再拒，不可放行覆盖）。
 * @param {string[]} names 集合名（快照 payload 键）
 * @param {Object} mockDB 缓存对象（`core/domain.js::mockDB`）
 * @param {{notify?:boolean}} [opts] 是否在内部派发 DATA_CHANGED（缺省 true；调用侧要自行合并派发则传 false）
 * @returns {Promise<string[]>} 真正重拉成功的集合名
 */
async function _refreshCollections(names, mockDB, opts = {}) {
  const adapter = getAdapter();
  let versionResp = null;
  try { versionResp = await adapter.versions(); } catch (err) { console.warn('[DataAdapter] 集合重拉：版本基线重取失败（保持旧值，下次上传会再拒一次）：', err); }
  const refreshed = [];
  for (const name of names) {
    const group = adapter[name];
    if (!group || typeof group.list !== 'function') continue; // 无独立读口 ⇒ 跳过（不谎报「已刷新」）
    try {
      _assignCollection(mockDB, name, await group.list());
      refreshed.push(name);
    } catch (err) {
      console.warn(`[DataAdapter] 集合重拉：${name} 失败（保持本地数据，不推进基线）：`, err);
    }
  }
  if (refreshed.length) {
    _commitBase(mockDB, refreshed);
    const next = versionResp && versionResp.versions;
    if (next && typeof next === 'object') {
      for (const name of refreshed) {
        if (typeof next[name] === 'number') _versions[name] = next[name];
      }
    }
    if (opts.notify !== false) notifyDataChanged(refreshed);
  }
  return refreshed;
}

/**
 * 同源多标签即时通知（**零网络**）：广播「本标签刚写成功」这一事实（携带集合名，供接收侧日志/诊断）。
 * 接收侧**不采信广播里的数据**，只把它当「去探测一次」的唤醒信号 ⇒ 仍走 `probeRemoteChanges()` 的
 * 逐集合版本比对（数据一律以服务端为准，广播丢失也不会错——最坏只是退回到轮询周期内可见）。
 */
function _postDataChangedBroadcast(collections) {
  if (!_dataChangedChannel) return;
  try {
    _dataChangedChannel.postMessage({ type: 'data-changed', collections: collections || [], at: Date.now() });
  } catch (e) {
    console.warn('[DataAdapter] 跨标签通知广播失败（不影响本标签）：', e);
  }
}

/**
 * 三域探测结果的采用口径：**服务端为权威，但保留「本机独有」的行**（服务端没有该 id 的行）。
 * 为什么不是整表覆盖：成员变更确认队列有一条**明确保留**的存量路径——批次 163 裁定「迁移前已落本机的
 *   存量 transferOut 请求不做迁移、仍由本机支书确认链处理完」（见 `docs/src/services/member/member-confirmation.js`
 *   顶部注释），而本机队列的 localStorage 兜底**只在缓存为空时才载入**（`_hydrate`）⇒ 若探测整表覆盖，
 *   那些存量请求会在首次探测（≤1 个周期）被抹掉、**死锁复发**。取并集则：服务端行原样采用 + 本机独有行保留。
 * `handoffs` / `milestones` 同走并集（正常路径下不会出现本机独有行：api 形态写入都会同步到服务端；
 *   真出现＝该次同步失败，保留它符合「本地已记、下次 init 以服务端为准」的既有口径，且绝不丢本机数据）。
 * @param {Array} localRows 本机当前缓存（可能非数组）
 * @param {Array} serverRows 本次从服务端拉到的行
 * @returns {Array} 采用值（服务端行在前，本机独有行在后）
 */
function _mergeAuxRows(localRows, serverRows) {
  if (!Array.isArray(localRows)) return serverRows;
  const seen = new Set(serverRows.map((r) => r && r.id));
  const localOnly = localRows.filter((r) => r && r.id && !seen.has(r.id));
  return localOnly.length ? [...serverRows, ...localOnly] : serverRows;
}

/**
 * 探测一次「远端是否已变」（**单一源**）。返回结构仅用于测试与诊断，业务侧不看返回值。
 * @returns {Promise<{skipped?:string, changed?:string[]}>}
 *   · skipped='mock'           — 非 api 形态（本地演示 / 静态托管）：探测不启用
 *   · skipped='disabled'       — 运维关了开关（`REMOTE_PROBE_PREF_KEY`）
 *   · skipped='in-flight'      — 已有一次探测在飞（去重）
 *   · skipped='pending-write'  — 本机有未 flush 的写在途（防抖窗口 / 未结算排程）⇒ 本次跳过
 *   · skipped='not-ready'      — `init()` 尚未完成（缓存未就绪 / 基线未建立）
 *   · skipped='no-versions'    — 适配器无 `versions()`（非本仓服务端）
 *   · skipped='unreachable'    — 版本查询失败（断网 / 401）：**静默降级**
 *   · skipped='bad-response'   — 版本响应形状异常：静默
 *   · changed=[集合名…]        — 本次真正重拉采用的集合（已 `notifyDataChanged`）
 */
export async function probeRemoteChanges() {
  if (DATA_SOURCE !== 'api') return { skipped: 'mock' };
  if (!isRemoteProbeEnabled()) return { skipped: 'disabled' };
  if (_remoteProbeInFlight) return { skipped: 'in-flight' };
  // ① 本机有未提交的写（防抖窗口内的排程 / 未结算的 flush）⇒ 整次跳过：
  //    此刻重拉会把本机刚写、尚未上传的内容判成「远端更新」而回滚掉。
  if (_snapshotTimer !== null || _flushDeferred !== null) return { skipped: 'pending-write' };
  const mockDB = _cachedMockDB;
  if (!mockDB || mockDB._loaded !== true) return { skipped: 'not-ready' }; // init() 进行中 / 未完成
  const adapter = getAdapter();
  if (typeof adapter.versions !== 'function') return { skipped: 'no-versions' };
  _remoteProbeInFlight = true;
  try {
    let remote = null;
    try {
      const resp = await adapter.versions();
      remote = (resp && resp.versions && typeof resp.versions === 'object') ? resp.versions : null;
    } catch (e) {
      console.warn('[DataAdapter] 远端变更探测：版本查询失败（静默降级，不影响使用）：', e);
      return { skipped: 'unreachable' };
    }
    if (!remote) return { skipped: 'bad-response' };
    // ② 本机仍脏的集合逐个排除（`_collectDirty` 与 flush 同一口径，聚合域 __root__ 包装一并算对）
    const dirty = _collectDirty(mockDB) || {};
    const names = [];
    for (const name of Object.keys(remote)) {
      if (name in dirty) continue; // 本机未提交 ⇒ 不重拉（防回滚本机改动）
      const rv = Number(remote[name]);
      const lv = Number(_versions[name] === undefined ? 0 : _versions[name]);
      if (Number.isFinite(rv) && rv !== lv) names.push(name);
    }
    const changed = names.length ? await _refreshCollections(names, mockDB, { notify: false }) : [];
    // ③ 语义端点三域：无版本号 ⇒ 直接重拉 + 内容比对（理由见 REMOTE_PROBE_AUX 注释）
    for (const { group, key } of REMOTE_PROBE_AUX) {
      const g = adapter[group];
      if (!g || typeof g.list !== 'function') continue;
      try {
        const rows = await g.list();
        if (!Array.isArray(rows)) continue;
        const next = _mergeAuxRows(mockDB[key], rows);
        if (_serKey(next) !== _serKey(mockDB[key])) { mockDB[key] = next; changed.push(key); }
      } catch (e) {
        console.warn(`[DataAdapter] 远端变更探测：${group} 重拉失败（静默降级）：`, e);
      }
    }
    if (changed.length) notifyDataChanged(changed); // 复用既有事件：页面按既有机制重渲染
    return { changed };
  } finally {
    _remoteProbeInFlight = false;
  }
}

/**
 * 挂上低频定时器（幂等）。缺省周期＝`REMOTE_PROBE_INTERVAL_MS`；**隐藏态不探测**。
 * @param {number} [intervalMs] 仅测试 / 诊断用可传更短周期（生产入口 `main-entry.js` 不传）
 * @returns {boolean} 本次是否真的挂上（已挂着 ⇒ false）
 */
export function startRemoteChangeProbe(intervalMs = REMOTE_PROBE_INTERVAL_MS) {
  if (_remoteProbeTimer !== null) return false;
  if (typeof setInterval !== 'function') return false;
  _remoteProbeTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return; // 后台标签不探测
    probeRemoteChanges().catch(() => {});
  }, intervalMs);
  return true;
}

/** 卸下定时器（关闭轮询；不影响页面其余行为） */
export function stopRemoteChangeProbe() {
  if (_remoteProbeTimer === null) return false;
  clearInterval(_remoteProbeTimer);
  _remoteProbeTimer = null;
  return true;
}

// 跨标签频道：**模块加载即建**（不能等本标签写过才建——只读标签同样要收到别人的广播）。
// 收信侧只当唤醒信号（数据一律走 `probeRemoteChanges` 从服务端取），不采信广播内容。
// ⚠ **必须限浏览器**：Node ≥18 同样有全局 `BroadcastChannel`，而在 Node 里**开着的频道会钉住事件循环**
//   ⇒ 任何 import 本模块的测试进程跑完都不退出（真机实测：`multi-tab-sync` 六条全绿但 runner 不结束，
//   并连带把一批纯 node 用例判成"文件级崩"）。故与下面 `startRemoteChangeProbe()` 同款加前置判据。
if (typeof window !== 'undefined' && typeof BroadcastChannel === 'function') {
  try {
    _dataChangedChannel = new BroadcastChannel(REMOTE_PROBE_CHANNEL);
    _dataChangedChannel.onmessage = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      probeRemoteChanges().catch(() => {});
    };
  } catch (e) {
    _dataChangedChannel = null;
    console.warn('[DataAdapter] 跨标签通知通道创建失败（退化为低频轮询）：', e);
  }
}

// 自动挂表：任意页面只要加载了本模块即具备低频探测能力；mock 形态下每次 tick 直接返回（零网络）。
if (typeof window !== 'undefined') startRemoteChangeProbe();

// ════════════════════════════════════════════════════════════════
//  演示形态只读（2026-09-28 支书裁定）：**单一判据** + 提示文案单一源
// ════════════════════════════════════════════════════════════════
// 口径：`docs/src/config/deploy.js::DEMO_READONLY`（默认 `true`，唯一逃逸门＝环境变量
//   `DEMO_READONLY=0`，见该文件注释）**且**当前数据源是 `mock`（无 API 会话）。
//   ⇒ 静态托管 / 未登录访客 / 本机演示：可浏览、可点开，写操作一律显式失败并给出
//     可读提示（**不再落浏览器本地**，杜绝「以为存上了、登录后被服务端覆盖」）。
// 消费点（**只此两处，新增写口须回到这里判**）：
//   · `persist()` 的 mock 分支——mockDB 系全部业务写的汇聚点；
//   · `services/governance/issues.js` 的反馈域写链（独立 localStorage 域，不走 persist）。
// 为什么不是逐页面禁用按钮：判据放在**持久化汇聚点**，与写口数量解耦（同 `pending-writes` 的机制纪律）；
//   未登录访客可达的写口只有反馈提交一处，其余写口都在登录后才可达（登录 ⇒ 有 token ⇒ api 形态）。
// ⚠ 如实登记的边界：`api-adapter` 之外的**适配器级 mock 写**（如 `MockAdapter.branchDocs.create`）
//   在本轮未被拦截——但那些入口都在工作台内、需登录才可达（登录即 api 形态），故只读演示下不可达。
/** 只读演示的提示文案（单一源；成功提示侧与各写口复用同一句） */
const DEMO_READONLY_MESSAGE = '当前为只读演示：数据不会保存到本机，请登录后使用服务器数据。';

/**
 * 是否处于「只读演示」形态（**唯一判据**，测试与运维据此断言）。
 * @returns {boolean} true = mock（无 API 会话）且 `DEMO_READONLY` 未放行 ⇒ 写操作应被拒绝
 */
export function isDemoReadOnly() {
  return DEMO_READONLY === true && DATA_SOURCE === 'mock';
}

/** 只读演示的提示文案（供 UI 侧构造可读提示，避免各处自写一句） */
export function demoReadOnlyMessage() {
  return DEMO_READONLY_MESSAGE;
}
