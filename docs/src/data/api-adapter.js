// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  api-adapter.js — REST API 数据适配器
//  DataAdapter 的 REST API 实现：资源列表仍供 init() 填充 mockDB 客户端缓存；
//  写入按资源语义分流到 CRUD 或专用 API，snapshot 仅用于仍允许的兼容快照域。
//
//  P1 已实现能力：
//  1. 35 个资源分组的 list()（供 data-adapter init() 拉取全量数据填充 mockDB；= server 资源名映射 30 + issues / members / memberChangeRequests / committeeBroadcasts / agendaVotes 5 个语义端点组）
//     —— 10 主集合 + 8 niche + 新域（报名/复盘/宣传/档案/外发确认/子记录聚合域，T-209 全栈同步）
//  2. snapshot()：全量快照写穿（POST /api/v1/snapshot，认证保护，供 persist() 防抖调度）
//  3. _request()：统一 fetch + Bearer token 认证（token 由 getAuthToken() 提供）
//
//  Source: content/04_web_design/deploy/DEPLOYMENT_GUIDE.md §3.2.4/§3.7.2（与学校对接：API 设计要求与交付清单）
//         content/04_web_design/data/DATA_ARCHITECTURE.md §8.4
// ════════════════════════════════════════════════════════════════

import { getApiBaseUrl, getAuthToken, advanceVersionBaselineAfterWrite } from './data-adapter.js?v=20261110b';

// ── HTTP 工具函数 ──────────────────────────────────────────────

/** 请求超时（ms）。keepalive 请求不设超时，见 _request 注释 */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * keepalive 请求体上限（字节）——**T2（2026-09-23 批次 163）的择路阈值**。
 * 取值来源：Fetch 规范的 `keepalive` 标志对请求体有配额，浏览器实现（Chrome / Firefox）**统一为 64 KiB（65536B）**；
 * 本处取 **64KiB − 8KiB = 57344B**，余量留给请求头与序列化差异（宁保守，超限即回退普通请求，见 snapshot()）。
 */
const KEEPALIVE_BODY_LIMIT = 64 * 1024 - 8 * 1024;

/**
 * gzip 压缩字符串（快照 payload 压缩传输；Chrome 80+ / 现代浏览器支持 CompressionStream）
 * @param {string} str
 * @returns {Promise<ArrayBuffer>}
 */
async function _gzip(str) {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

/**
 * 行版本表（批次 564 Task 17）：`资源名:id` → 本机读到的 `updatedAt`。
 * 是「全资源 If-Match」的客户端单一源——写口在这里取戳注入，表单文件一律不改。
 * 登记点只有两处：集合装载 / 重拉（`recordRowVersions`）与本机写成功后返回行（`_writeRequest`）。
 */
const ROWS = new Map();

/** 行版本冲突回调（由 `data-adapter.js` 注册：收到 409 时刷新该集合） */
let _conflictHandler = null;

/** 注册 409 版本冲突回调：`cb(资源名)`（可返回 Promise，本模块等它完成再抛错） */
export function onVersionConflict(cb) {
  _conflictHandler = typeof cb === 'function' ? cb : null;
}

/**
 * 登记一个集合的行版本（集合装载 / 重拉后调用；聚合根 `__root__` 单行没有按行戳，跳过）。
 * @param {string} name 资源名（与 URL 资源段同名，如 `todos` / `branches`）
 * @param {Array} rows 服务端返回的行数组
 */
export function recordRowVersions(name, rows) {
  if (!name || !Array.isArray(rows)) return;
  for (const row of rows) {
    if (row && row.id && row.updatedAt) ROWS.set(`${name}:${row.id}`, row.updatedAt);
  }
}

/**
 * 从写路径认出「单行资源」，返回 { name, id, key }；不是单行 PATCH 则返回 null。
 * 覆盖两档形状：`/api/v1/<资源>/<id>`，以及支部配置 `/api/v1/branches/<id>/config`（落在 `branches` 行上）。
 */
function _rowVersionKeyFor(path) {
  const clean = String(path || '').split('?')[0];
  const config = /^\/api\/v1\/branches\/([^/]+)\/config$/.exec(clean);
  if (config) return { name: 'branches', id: config[1], key: `branches:${config[1]}` };
  const m = /^\/api\/v1\/([A-Za-z][A-Za-z-]*)\/([^/?]+)$/.exec(clean);
  if (!m) return null;
  return { name: m[1], id: m[2], key: `${m[1]}:${m[2]}` };
}

/**
 * 发送认证 HTTP 请求
 * @param {string} path - API 路径（不含 base URL）
 * @param {RequestInit} [options] - fetch 选项
 * @returns {Promise<any>} 响应 JSON
 */
async function _request(path, options = {}) {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = {
    'Content-Type': 'application/json', ...(_hydrateDepth > 0 ? { 'X-Hydrate': '1' } : null), // 水合窗口（仅 init 全量灌库）：服务端整集合不截断（行数不变：保 README-server 的行号取证）
    ...options.headers,
  };
  // 批次 564 Task 17：全资源乐观锁的**客户端单点注入**——PATCH 单行时带上本机读到的该行 `updatedAt`。
  //   取不到（表单从没读过这一行）就不带，交给服务端 428 逻辑；`If-Match` 也可由调用方显式覆盖（如 `*`）。
  if (String(options.method || '').toUpperCase() === 'PATCH') {
    const rowRef = _rowVersionKeyFor(path);
    const stamp = rowRef ? ROWS.get(rowRef.key) : null;
    if (stamp && !headers['If-Match']) headers['If-Match'] = stamp;
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // M2：请求超时兜底——服务器"接受但不响应"时，避免 bootstrap 的 await init()
  // 永久阻塞首屏（白屏）。仅对普通请求启用 8s 超时；keepalive 请求（pagehide
  // 兜底快照）在导航卸载期间由浏览器接管发送，超时 abort 会干扰切页写穿，
  // 故 keepalive 请求不设超时（浏览器导航本身会终结该请求）。
  let controller = null;
  let timer = null;
  if (!options.keepalive) {
    controller = new AbortController();
    timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers, signal: options.signal || controller?.signal });
  } catch (e) {
    if (controller && e?.name === 'AbortError') {
      const error = new Error(`API 请求超时(${REQUEST_TIMEOUT_MS}ms): ${path}`);
      error.status = 408;
      error.type = 'TimeoutError';
      throw error;
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    // P0-1（2026-09-23）：409 版本冲突需读**结构化 body**（conflicts 清单）——调用方据它决定「重拉哪些集合」。
    // 读不出 JSON（非本仓服务端/无 body）时不吞错：error.body 留 null，仅凭 status 判。
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    // B05 / B08：服务端给了业务原因（body.error）就优先用它作 message，
    // 调用方（describeWriteError）据此给出「发生了什么」；status / type / body 一并保留。
    const serverError = body && typeof body.error === 'string' ? body.error.trim() : '';
    const error = new Error(serverError || `API 请求失败: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.type = response.status === 404 ? 'NotFoundError' :
                 response.status === 403 ? 'PermissionError' :
                 response.status === 409 ? 'ConflictError' :
                 response.status === 401 ? 'AuthError' : 'ApiError';
    error.body = body;
    // 批次 564 Task 17：整行版本冲突（与快照 `conflicts` 是两种 409）——先刷新该集合再抛，
    //   文案直接给「已被他人修改，已刷新」，既有 toast / 错误提示无需改动。
    if (error.status === 409 && body && body.code === 'VERSION_CONFLICT') {
      const rowRef = _rowVersionKeyFor(String(path).split('?')[0]);
      if (_conflictHandler && rowRef) {
        try { await _conflictHandler(rowRef.name, body.latest || null); } catch (e) { console.warn('[ApiAdapter] 版本冲突后刷新集合失败（不阻断提示）：', e); }
      }
      error.message = '已被他人修改，已刷新';
      error.code = 'VERSION_CONFLICT';
      error.latest = body.latest || null;
      error.collection = rowRef ? rowRef.name : '';
    }
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

/** 为党委已选中的支部附加统一读取范围，避免各资源漏传 branchId。 */
function _withSelectedBranch(path) {
  if (typeof window === 'undefined') return path;
  const branchId = new URLSearchParams(window.location.search).get('branchId');
  if (!branchId) return path;
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  if (!params.has('branchId')) params.set('branchId', branchId);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

/** 附件属于所选支部时，下载路径沿用页面的治理范围，避免二进制接口成为跨支部旁路。 */
export function withSelectedBranchScope(path) {
  if (typeof window === 'undefined' || typeof path !== 'string' || !path.startsWith('/api/v1/uploads/')) return path;
  const branchId = new URLSearchParams(window.location.search).get('branchId');
  if (!branchId) return path;
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('branchId', branchId);
  return `${pathname}?${params.toString()}`;
}

/** GET 请求 */
function _get(path) {
  return _request(_withSelectedBranch(path), { method: 'GET' });
}

/** POST 请求 */
function _post(path, data) {
  return _writeRequest(path, 'POST', data);
}

/** PATCH 请求 */
function _patch(path, data) {
  return _writeRequest(path, 'PATCH', data);
}

/** PUT 请求（语义整表替换，如支部名册导入） */
function _put(path, data) {
  return _request(path, { method: 'PUT', ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
}

/** DELETE 请求 */
function _delete(path) {
  return _writeRequest(path, 'DELETE');
}

/**
 * 直连写口 → 快照集合名（批次 504 · R10-D02）。
 *
 * 服务端自本批起让语义写口也推进集合版本；直连写完一行后，页面防抖快照仍会整表上传同一集合
 * ⇒ 不推进本地基线就会「被自己刚写的那一版挡住」（409）。这里把 URL 资源段映射成快照键
 * （绝大多数同名；`system-notices` 落 `notices`），其余（auth / 语义域）返回空串＝不处理。
 * 只有「服务端版本＝基线＋1」时才推进（见 `advanceVersionBaselineAfterWrite`）。
 */
const WRITE_COLLECTION_ALIAS = { 'system-notices': 'notices' };
function _writeCollectionName(path) {
  const m = /^\/api\/v1\/([A-Za-z][A-Za-z-]*)/.exec(String(path || ''));
  if (!m || m[1] === 'auth' || m[1] === 'snapshot') return '';
  return WRITE_COLLECTION_ALIAS[m[1]] || m[1];
}

/** 写请求统一入口：成功后再推进该集合的本地版本基线（失败不推进，保持「宁可下次再拒」） */
async function _writeRequest(path, method, data) {
  const out = await _request(path, {
    method,
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  // 批次 564 Task 17：写成功返回的整行带着新 `updatedAt` ⇒ 就地登记，下一次 PATCH 自动带对新戳
  //   （否则同一会话连改两次，第二次会被自己的旧戳拦成 409）。
  const rowRef = _rowVersionKeyFor(path);
  if (rowRef && out && typeof out === 'object' && out.updatedAt) ROWS.set(rowRef.key, out.updatedAt);
  const name = _writeCollectionName(path);
  if (name) {
    try { await advanceVersionBaselineAfterWrite(name); } catch (e) {
      console.warn(`[ApiAdapter] 直连写后推进 ${name} 版本基线失败（下次快照会走冲突恢复）：`, e);
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  ApiAdapter — DataAdapter 接口的 REST API 实现
//
//  接口规范与 MockAdapter 完全一致，满足 DataAdapter 接口定义。
//  每个方法对应一条或多条 REST API 调用。
//
//  API 路由设计：
//  ─────────────────────────────────────────────────────────
//  | 资源        | 路径                    | 方法       |
//  |------------|-------------------------|-----------|
//  | 活动        | /api/v1/activities      | GET/POST  |
//  | 活动(单)    | /api/v1/activities/:id  | GET/PATCH/DELETE |
//  | 活动归档    | /api/v1/activities/:id/archive | POST |
//  | 活动品牌    | /api/v1/activities/:id/brand   | POST |
//  | 任务        | /api/v1/tasks           | GET/POST  |
//  | 任务(单)    | /api/v1/tasks/:id       | PATCH     |
//  | 考勤        | /api/v1/attendances     | GET/POST  |
//  | 考勤(单)    | /api/v1/attendances/:id | PATCH     |
//  | 考察        | /api/v1/inspections     | GET/POST  |
//  | 专班        | /api/v1/taskforces      | GET/POST  |
//  | 专班(单)    | /api/v1/taskforces/:id  | PATCH/DELETE |
//  | 通知        | /api/v1/notices         | GET/POST  |
//  | 通知(单)    | /api/v1/notices/:id     | PATCH     |
//  | 待办        | /api/v1/todos           | GET/POST  |
//  | 待办(单)    | /api/v1/todos/:id       | PATCH/DELETE |
//  | 分工        | /api/v1/assignments     | GET/POST  |
//  | 补课        | /api/v1/makeupTasks    | GET/POST  |
//  | 补课(单)    | /api/v1/makeupTasks/:id| PATCH     |
//  | 文件空间    | /api/v1/fileSpaceRecords | GET/POST |
//  | 图片        | /api/v1/imageRecords      | GET/POST |
//  | 经验沉淀    | /api/v1/experienceDeposits | GET/POST |
//  | 认证登录    | /api/v1/auth/login      | POST      |
//  | 认证注销    | /api/v1/auth/logout     | POST      |
//  ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════

export const ApiAdapter = {
  // ── 全局操作 ──────────────────────────────────────────────

  loadDB() {
    // API 模式下无需预加载，数据按需获取
    console.info('[ApiAdapter] loadDB: API 模式下跳过预加载');
  },

  saveDB() {
    // API 模式下数据自动持久化，无需手动保存
    console.info('[ApiAdapter] saveDB: API 模式下自动持久化');
  },

  /**
   * 全量快照写穿：将当前 mockDB 的快照域整体覆盖写入后端（认证保护）。
   * 由 data-adapter 的 persist() 防抖调度调用；P2 资源级 CRUD 落地前，
   * 这是服务层写入穿透到服务器的唯一通道。
   * P0-1（2026-09-23）：payload 携带 `_versions`（集合名→基线版本）时服务端做乐观锁，
   * 版本不一致 ⇒ 409（error.type='ConflictError'，error.body.conflicts 给出冲突集合）；无冲突 ⇒ 200 + `{ versions }`。
   * **P0-1 收紧（2026-09-23 批次 163）**：payload 里出现而 `_versions` 里没有的集合 ⇒ 服务端**整批 428**
   *   （原「未带版本即无条件写」的旁路已封）⇒ 调用方必须给 payload 里每个集合都带上基线版本。
   * @param {Object} payload - 快照 payload（不含 users，含聚合域 __root__ 单行；须含 `_versions`）
   * @param {Object} [opts]
   * @param {boolean} [opts.keepalive] - **卸载路径专用**（pagehide 同步冲刷）：按体量择路发 keepalive 请求
   * @returns {Promise<{versions:Object}|null>} 带 `_versions` 时 200 + `{versions}`；否则 204 → null
   */
  snapshot(payload, opts = {}) {
    // 2026-09-01 点验修复：全量快照 payload 常超 keepalive 体量上限 ⇒ 原先一律改普通 fetch；
    // 但普通 fetch 在**导航卸载期无完成保证**（T2 病灶：切页瞬间的写入可能整批丢失）。
    // 2026-09-23 批次 163（T2）改为**按体量择路**：
    //   · 调用方声明 keepalive（只有 pagehide 同步冲刷这条路）**且** gzip 后的请求体 ≤ KEEPALIVE_BODY_LIMIT
    //     ⇒ 发 keepalive 请求（浏览器接管完成）；该路径在 _request 里**不挂 AbortController**
    //     （8s 超时 abort 会在切页瞬间掐断在途写）；
    //   · 超限 ⇒ 回退普通 fetch，并**显式告警「本次可能不被送达」**（绝不静默，本地备份仍在，下次 persist 补写）。
    // gzip 压缩保留（66KB → ~10KB）：既规避大请求体传输限制，也让多数快照落进 keepalive 体量以内。
    const wantKeepalive = opts.keepalive === true;
    return _gzip(JSON.stringify(payload)).then((body) => {
      const useKeepalive = wantKeepalive && body.byteLength <= KEEPALIVE_BODY_LIMIT;
      if (wantKeepalive && !useKeepalive) {
        console.warn(`[ApiAdapter] 快照体量 ${body.byteLength}B 超过 keepalive 上限 ${KEEPALIVE_BODY_LIMIT}B，`
          + '已回退普通请求——本次写入可能不被送达（本地备份仍在，下次 persist 会补写）');
      }
      return _request('/api/v1/snapshot', {
        method: 'POST',
        headers: { 'Content-Encoding': 'gzip' },
        body,
        ...(useKeepalive ? { keepalive: true } : {}),
      });
    });
  },

  /** 集合版本号全集（P0-1 乐观锁的**基线**来源）：{ 集合名: 版本 }，未出现过的集合为 0 */
  versions() {
    return _get('/api/v1/snapshot/versions');
  },

  // ── 资源分组接口 ──────────────────────────────────────────

  activities: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/activities${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/activities', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/activities/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/activities/${id}`);
    },

    archive(id) {
      return _post(`/api/v1/activities/${id}/archive`);
    },

    // 2026-09-21 批次 132：品牌认定＝提案 → 支委会通过后确定 ⇒ 本口**只能取消**（服务端同门同语义）
    revokeBrand(id) {
      return _post(`/api/v1/activities/${id}/brand`);
    },
  },

  tasks: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/tasks${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/tasks', data);
    },

    update(taskId, patch) {
      return _patch(`/api/v1/tasks/${taskId}`, patch);
    },
  },

  attendances: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/attendances${query ? '?' + query : ''}`);
    },

    listByActivity(activityId) {
      return _get(`/api/v1/attendances?activityId=${activityId}`);
    },

    create(data) {
      return _post('/api/v1/attendances', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/attendances/${id}`, patch);
    },
  },

  inspections: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/inspections${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/inspections', data);
    },
  },

  taskforces: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/taskforces${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/taskforces', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/taskforces/${id}`, patch);
    },

    dissolve(id, data) {
      return _post(`/api/v1/taskforces/${encodeURIComponent(id)}/dissolution`, data);
    },

    delete(id) {
      return _delete(`/api/v1/taskforces/${id}`);
    },
  },

  notices: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/notices${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/notices', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/notices/${id}`, patch);
    },
  },

  todos: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/todos${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/todos', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/todos/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/todos/${id}`);
    },
  },

  assignments: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/assignments${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/assignments', data);
    },

    // 批次 359（`D-750` 续答「全 CRUD」）：补 `update` / `delete`（服务端「通用资源 CRUD」对 29 个资源名
    //   本就有 `PATCH /<资源名>/:id` 与 `DELETE /<资源名>/:id` ⇒ 前端补齐即可，**服务端零改动**）。
    update(id, patch) {
      return _patch(`/api/v1/assignments/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/assignments/${id}`);
    },
  },

  makeupTasks: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // 注：服务端按资源名注册路由（/makeupTasks），非连字符形式 —— 与 resources.js 对齐
      return _get(`/api/v1/makeupTasks${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/makeupTasks', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/makeupTasks/${id}`, patch);
    },
  },

  fileSpaceRecords: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // T-218：路径统一为 /api/v1/{name}（与 server RESOURCE_TABLES 键名一致，原 /files 未实现）
      return _get(`/api/v1/fileSpaceRecords${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/fileSpaceRecords', data);
    },

    // 2026-10-02 批次 343（`D-744` D 档写口纪律）：补 `update` / `delete` 两件——
    //   使本资源与 `branchDocs` 同形（四件套），调用点不再**直连 `fetch`**（原 `prop/archive-tab.js`）。
    update(id, patch) {
      return _patch(`/api/v1/fileSpaceRecords/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/fileSpaceRecords/${id}`);
    },
  },

  imageRecords: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // T-218：路径统一为 /api/v1/{name}（原 /images 未实现）
      return _get(`/api/v1/imageRecords${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/imageRecords', data);
    },

    // 同上（批次 343 · `D-744` D 档）：补 `update` / `delete` 两件（照片标注 / 删除照片走写口）。
    update(id, patch) {
      return _patch(`/api/v1/imageRecords/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/imageRecords/${id}`);
    },
  },

  experienceDeposits: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // T-218：路径统一为 /api/v1/{name}（原 /experiences 未实现）
      return _get(`/api/v1/experienceDeposits${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/experienceDeposits', data);
    },

    // 批次 352（`D-746`）：补 `update` / `delete` 两件（经验沉淀「作废（软）」走统一写口；
    //   四件套口径同批次 343 `D-745`——此前该域只有 list/create，作废会抛
    //   「getAdapter(...)[resource].update is not a function」）
    update(id, patch) {
      return _patch(`/api/v1/experienceDeposits/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/experienceDeposits/${id}`);
    },
  },

  // ════════════════════════════════════════════════════════════════
  //  T-209 全栈同步：新增 8 个数组域 + 3 个聚合域接口
  //  写路径以服务层 → mockDB → persist() 快照写穿为主（这些域在 MockAdapter
  //  同样不暴露独立 CRUD），list() 供 init() 拉取；create/update 提供接口对称性。
  // ════════════════════════════════════════════════════════════════

  signups: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/signups${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/signups', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/signups/${id}`, patch);
    },
  },

  activityReviews: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/activityReviews${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/activityReviews', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/activityReviews/${id}`, patch);
    },
  },

  taskforceReviews: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/taskforceReviews${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/taskforceReviews', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/taskforceReviews/${id}`, patch);
    },
  },

  propTasks: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/propTasks${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/propTasks', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/propTasks/${id}`, patch);
    },
  },

  periodicArchives: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/periodicArchives${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/periodicArchives', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/periodicArchives/${id}`, patch);
    },
  },

  archiveRecords: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/archiveRecords${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/archiveRecords', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/archiveRecords/${id}`, patch);
    },

    // R2-40：归档材料删除同步服务端行（原只有 create/update ⇒ 前端删除后刷新又回来）。
    delete(id) {
      return _delete(`/api/v1/archiveRecords/${id}`);
    },
  },

  externalDispatches: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // T-208 文件流外发确认：服务端与前端共用 /externalDispatches
      return _get(`/api/v1/externalDispatches${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/externalDispatches', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/externalDispatches/${id}`, patch);
    },
  },

  actSubRecords: {
    // 对象聚合域（actId → subRecords）：list 返回 [ { id:'__root__', body } ] 或 []
    list() {
      return _get('/api/v1/actSubRecords');
    },

    // 整体替换聚合对象
    update(body) {
      return _patch('/api/v1/actSubRecords/__root__', { body });
    },
  },

  tfSubRecords: {
    list() {
      return _get('/api/v1/tfSubRecords');
    },

    update(body) {
      return _patch('/api/v1/tfSubRecords/__root__', { body });
    },
  },

  branchDocs: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/branchDocs${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/branchDocs', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/branchDocs/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/branchDocs/${id}`);
    },
  },

  // 支委会「待议池」（2026-11-10 批次 540 波次 2）：只读汇总口，服务端按支部 / 角色过滤，
  // 并算好去重键 / 类型 / 应到 / 待议天数（`H32` 服务端算业务事实）。
  // 分类单一源 = docs/src/core/domain/agenda-classify.js（服务端同一函数）。
  agendaCandidates: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/committee/agenda-candidates${query ? '?' + query : ''}`);
    },
  },

  // 2026-11-08 批次 536 · 党委工作台「院级内容」写口（Task 8 前端接线）。
  // 服务端实现 = server/routes/resources/semantic-routes.js（`requireRole(PARTY_STAFF_ROLE)`；
  //   `ownerScope='committee'` 与 `branchId='pc-gsm'` 由服务端固定，本组不传）。
  // 读侧沿用 `_get`：党委内容按 ownerScope 过滤，`_withSelectedBranch` 附加的 branchId 不改变结果集。
  // 新增的 publication / dispatch / cancel / archive / withdraw 均为行级语义端点，不接受整表覆盖。
  committeeContent: {
    activities: {
      list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return _get(`/api/v1/committee/activities${query ? '?' + query : ''}`);
      },

      create(data) {
        return _post('/api/v1/committee/activities', data);
      },

      update(id, patch) {
        return _patch(`/api/v1/committee/activities/${encodeURIComponent(id)}`, patch);
      },

      cancel(id) {
        return _post(`/api/v1/committee/activities/${encodeURIComponent(id)}/cancel`);
      },

      archive(id) {
        return _post(`/api/v1/committee/activities/${encodeURIComponent(id)}/archive`);
      },

      updatePublication(id, patch) {
        return _patch(`/api/v1/committee/activities/${encodeURIComponent(id)}/publication`, patch);
      },

      dispatch(id, body) {
        return _post(`/api/v1/committee/activities/${encodeURIComponent(id)}/dispatch`, body);
      },
    },

    documents: {
      list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return _get(`/api/v1/committee/documents${query ? '?' + query : ''}`);
      },

      create(data) {
        return _post('/api/v1/committee/documents', data);
      },

      update(id, patch) {
        return _patch(`/api/v1/committee/documents/${encodeURIComponent(id)}`, patch);
      },

      withdraw(id) {
        return _post(`/api/v1/committee/documents/${encodeURIComponent(id)}/withdraw`);
      },
    },

    // 2026-11-08 批次 537 波次 1：党委公开通知（服务端 semantic-routes.js → committee-notices.js）。
    // 归属 / 来源 / 受众 / 类型 / 日期由服务端强制；publishScope 只收 login / public。
    notices: {
      list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return _get(`/api/v1/committee/notices${query ? '?' + query : ''}`);
      },

      create(data) {
        return _post('/api/v1/committee/notices', data);
      },

      update(id, patch) {
        return _patch(`/api/v1/committee/notices/${encodeURIComponent(id)}`, patch);
      },

      withdraw(id) {
        return _post(`/api/v1/committee/notices/${encodeURIComponent(id)}/withdraw`);
      },
    },
  },

  // 意见反馈支部内闭环（D-824）：必须登录、读写按所属支部校验；匿名真身保存在服务端，但没有揭名端点权限。
  //   GET /issues: 未登录 401、支部账号只读本支部、党委返回空列表（保持 bootstrap 兼容）
  //   POST /issues: 仅支部账号可提交，branchId 由服务端按会话确定
  //   PATCH /issues/:id: 支委层处置，并校验反馈属于操作者支部
  //   /issues/reveal: 兼容端点保留但始终拒绝；不得把反馈当作向党委上报的渠道
  //   正式表决「真无记名」仍是独立数据边界。
  issues: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/issues${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/issues', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/issues/${id}`, patch);
    },

    /** 历史兼容端点；按 D-824 当前所有揭名请求均由服务端拒绝。 */
    reveal() {
      return _get('/api/v1/issues/reveal');
    },
  },

  users: {
    // `includeTransferredOut`：治理侧读「历史行」（移出成员）时显式请求；默认在册名册不含移出行（F-08）。
    // `branchId`：党委未选支部时服务端对支部明细返回空表（server/routes/resources/branch-scope.js::resourceRowsForActor）；
    //   支部管理行内名册（branches-tab.js::ensureBranchMembersLoaded）按支部逐个读取 ⇒ 支部参数必须透传到 query，
    //   否则党委视角拿到的永远是空名册。
    list(params = {}) {
      const query = new URLSearchParams();
      if (params && params.includeTransferredOut) query.set('includeTransferredOut', '1');
      if (params && params.branchId) query.set('branchId', String(params.branchId));
      const serialized = query.toString();
      return _get(`/api/v1/users${serialized ? '?' + serialized : ''}`);
    },
    // 2026-09-06 立项⑥ A波：users 双形态写口补齐（server RESOURCE_TABLES 通用 CRUD 已存在：
    // POST /api/v1/users / PATCH /users/:id / DELETE /users/:id，party-staff 门）
    create(data) {
      return _post('/api/v1/users', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/users/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/users/${id}`);
    },
  },

  // C-2 方案 B（2026-09-11 支书批）：名册成员变更确认链「支书阶段写入」语义端点
  // server POST /api/v1/members/:id/develop-stage —— requireRole(SECRETARY_AND_DEPUTY_ROLES；副书同权 2026-09-11)
  // + 同支部 + 字段白名单(仅 developStage)；通用 PATCH /users/:id 仅 party-staff 可写，支书端成员变更确认链经此会被 403 阻断，故单列语义写口。
  // R-10（2026-09-11 支书裁定）：名册三条写链语义端点补齐（角色/白名单见 server/routes/member.js）
  //   · setResidenceStatus 在册状态镜像（支书/副支书）· updateProfile 名册档案维护（组织委员）
  //   · create 名册新增（组织委员）· transferOut 移出软标记（组织委员发起 / 支书·副支书确认）
  //   · intake 成员流动流入登记（组织委员 + 支书/副支书；2026-09-14 批次 30 裁定 Q-23-10）
  //   · undoTransferOut 撤销流出清软标记（同 transferOut 角色集；2026-09-14 批次 29，Q-23-5）
  // R-11（2026-09-14 批次 29，Q-23-5）：撤销流出语义端点 —— 清除 transferOut 软标记使账号恢复；
  //   仅走 profile 补丁不会清除该标记（/login 仍按停用 401），故单列。
  members: {
    getProfile(id) {
      return _get(`/api/v1/members/${encodeURIComponent(id)}/profile`);
    },

    setDevelopStage(id, developStage, developStageSince) {
      // developStageSince（进入当前阶段日期）可选：随阶段同笔落档（2026-09-28 服务端化）
      const body = { developStage };
      if (developStageSince) body.developStageSince = developStageSince;
      return _post(`/api/v1/members/${id}/develop-stage`, body);
    },

    setResidenceStatus(id, body) {
      return _post(`/api/v1/members/${id}/residence-status`, body);
    },

    updateProfile(id, patch) {
      return _patch(`/api/v1/members/${id}/profile`, patch);
    },

    create(data) {
      return _post('/api/v1/members', data);
    },

    // 2026-09-14 批次 30（支书裁定 Q-23-10）：成员流动「流入登记」语义端点 ——
    // 与 create 同一实现体、写门为 MEMBER_FLOW_ROLES（组织委员 + 支书/副支书，§9i）；
    // 名册新增仍走 create（R-10 组织委员专属），不扩大名册越权面。
    intake(data) {
      return _post('/api/v1/members/intake', data);
    },

    transferOut(id, body) {
      return _post(`/api/v1/members/${id}/transfer-out`, body || {});
    },

    undoTransferOut(id) {
      return _post(`/api/v1/members/${id}/undo-transfer-out`, {});
    },

    // R7-01（2026-10-22）：人员主键重命名（学号即 id）。服务端仅党委组织员可调用，
    // 一个事务内同步 users.id / sessions / 各业务表 JSON 引用并写 auth_audit。
    renameAccount(id, newPersonId) {
      return _post(`/api/v1/members/${encodeURIComponent(id)}/account-rename`, { newPersonId });
    },
  },

  // P1 党委后台（2026-09-02）：支部实例 API 通路（server branches 表已在 RESOURCE_TABLES 白名单）
  branches: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // 批次 564 补：`?branchId=` 定向读支部整行（党委向导 `ensureBranchConfigLoaded`）同样是「本机读到的
      //   该行 updatedAt」⇒ 必须登记，否则其后 PATCH /branches/:id/config 无戳可带，服务端一律 428。
      return _get(`/api/v1/branches${query ? '?' + query : ''}`)
        .then((rows) => { recordRowVersions('branches', rows); return rows; });
    },

    create(data) {
      return _post('/api/v1/branches', data);
    },

    // Task 7.5（2026-10-26）：名册整表导入 —— 单事务替换（服务端 PUT /branches/:id/roster）。
    // 只调一次；失败时服务端整体回滚，前端旧名册不变。
    replaceRoster(id, members) {
      return _put(`/api/v1/branches/${encodeURIComponent(id)}/roster`, { members });
    },

    update(id, patch) {
      return _patch(`/api/v1/branches/${id}`, patch);
    },

    // L2/L3 支部工作流配置（2026-09-03）：config 子路由（本支书/party-staff 专属，防治理字段误写）
    // configPatch = { modules?: {...}|null, blocks?: {...}|null }——undefined key 不改
    // 2026-09-09 审计内核：opts.why=依据/出处（可选）→ PATCH body.why，由服务端落到留痕行
    updateConfig(id, configPatch, opts = {}) {
      const body = { config: configPatch };
      if (opts && opts.why !== undefined) body.why = opts.why;
      return _patch(`/api/v1/branches/${id}/config`, body);
    },

    // 2026-09-09 审计内核 B2：单键配置回滚端点（server PATCH /branches/:id/config/rollback）
    // body = { targetEntryAt?, index?, why? }（定位二选一；why=回滚依据可选）
    rollbackConfig(id, body) {
      return _patch(`/api/v1/branches/${id}/config/rollback`, body || {});
    },

    delete(id) {
      return _delete(`/api/v1/branches/${id}`);
    },
  },

  // B-499-9：任命与支委身份配置的语义写口（服务端同一事务落 branch/users/任期记录或 users/auth_audit）
  appointments: {
    apply(data = {}) {
      const { branchId, ...body } = data;
      return _post(`/api/v1/branches/${encodeURIComponent(branchId)}/appointments`, body);
    },
  },

  branchCommissioners: {
    apply(data = {}) {
      const { branchId, ...body } = data;
      return _post(`/api/v1/branches/${encodeURIComponent(branchId)}/branch-commissioners`, body);
    },
  },

  // P2 党委后台（2026-09-02）：支书任期记录 API 通路
  appointmentRecords: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/appointmentRecords${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/appointmentRecords', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/appointmentRecords/${id}`, patch);
    },
  },

  // P3 党委后台（2026-09-02）：支部上报审批 API 通路（支部提交 / 党委批驳）
  reviewRequests: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/reviewRequests${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/reviewRequests', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/reviewRequests/${id}`, patch);
    },
  },

  // R-23（2026-09-13）：思想汇报（服务端建表 thought_reports 后随快照写穿同步；
  //   init() 拉取本资源填充 mockDB.thoughtReports，系统通知 authorize 据服务端表复算提交人）
  thoughtReports: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/thoughtReports${query ? '?' + query : ''}`);
    },
  },

  // 2026-09-14 批次 25：党小组一等实体（服务端 party_groups 表；写门 = 支书/副支书，
  //   服务端 RESOURCE_WRITE_GATE.partyGroups='secretary' 同源把关）
  partyGroups: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/partyGroups${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/partyGroups', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/partyGroups/${id}`, patch);
    },

    delete(id) {
      return _delete(`/api/v1/partyGroups/${id}`);
    },
  },

  // 2026-09-14 批次 25：成员流动台账（服务端 member_flows 表；写门 = 组织委员 + 支书/副支书，
  //   服务端 RESOURCE_WRITE_GATE.memberFlows='member-flow' 同源把关）
  memberFlows: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/memberFlows${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/memberFlows', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/memberFlows/${id}`, patch);
    },
  },

  memberChangeRequests: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/member-change-requests${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/member-change-requests', data);
    },

    approve(id) {
      return _post(`/api/v1/member-change-requests/${id}/approve`);
    },

    confirm(id) {
      return _post(`/api/v1/member-change-requests/${id}/confirm`);
    },

    // Task 3（2026-10-26）：转移/取消标注（行级语义端点；白名单 status/cancelledAt/transferredOutAt）
    annotate(id, patch) {
      return _post(`/api/v1/member-change-requests/${id}/annotate`, patch || {});
    },
  },

  committeeBroadcasts: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/committeeBroadcasts${query ? '?' + query : ''}`);
    },
  },

  // 2026-09-01 线上支委会表态（与 server/routes/committee.js 同构）
  agendaVotes: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/agenda-votes${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/agenda-votes', data);
    },

    // Task 3（2026-10-26）：转移标注（行级语义端点；白名单仅 transferredOutAt）
    annotate(id, patch) {
      return _post(`/api/v1/agenda-votes/${id}/annotate`, patch || {});
    },
  },

  // 2026-11-11 支委提案（D-869；语义端点，不进快照）
  committeeProposals: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/committee/proposals${query ? '?' + query : ''}`);
    },
    get(id) {
      return _get(`/api/v1/committee/proposals/${encodeURIComponent(id)}`);
    },
    create(data) {
      return _post('/api/v1/committee/proposals', data);
    },
    update(id, data) {
      return _request(`/api/v1/committee/proposals/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    events(id) {
      return _get(`/api/v1/committee/proposals/${encodeURIComponent(id)}/events`);
    },
  },

  // 工作组成员、授权、任务、产出与应到名单均走语义 API，不进入全量快照。
  workgroups: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/workgroups${query ? '?' + query : ''}`);
    },
    members: {
      list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return _get(`/api/v1/workgroup-members${query ? '?' + query : ''}`);
      },
      saveAll(id, data) { return _request(`/api/v1/workgroups/${encodeURIComponent(id)}/members`, { method: 'PUT', body: JSON.stringify(data) }); },
      add(id, data) { return _post(`/api/v1/workgroups/${encodeURIComponent(id)}/members`, data); },
      remove(id, personId) { return _delete(`/api/v1/workgroups/${encodeURIComponent(id)}/members/${encodeURIComponent(personId)}`); },
    },
    // 2026-10-21 批次 499：跨组招募协调标记（组织委员不因此获得活动写权）
    coordinate(id, data) { return _post(`/api/v1/workgroups/${encodeURIComponent(id)}/coordinate`, data || {}); },
    grants: {
      list(id) { return _get(`/api/v1/workgroups/${encodeURIComponent(id)}/grants`); },
      listMine() { return _get('/api/v1/workgroup-grants'); },
      create(id, data) { return _post(`/api/v1/workgroups/${encodeURIComponent(id)}/grants`, data); },
      revoke(id, grantId) { return _post(`/api/v1/workgroups/${encodeURIComponent(id)}/grants/${encodeURIComponent(grantId)}/revoke`); },
    },
    tasks: {
      list(id) { return _get(`/api/v1/workgroups/${encodeURIComponent(id)}/tasks`); },
      create(id, data) { return _post(`/api/v1/workgroups/${encodeURIComponent(id)}/tasks`, data); },
      update(id, taskId, patch) { return _patch(`/api/v1/workgroups/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`, patch); },
    },
    outputs: {
      list(id) { return _get(`/api/v1/workgroups/${encodeURIComponent(id)}/outputs`); },
      create(id, data) { return _post(`/api/v1/workgroups/${encodeURIComponent(id)}/outputs`, data); },
    },
  },

  attendanceRosters: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/attendance-rosters${query ? '?' + query : ''}`);
    },
    get(activityId) { return _get(`/api/v1/activities/${encodeURIComponent(activityId)}/expected-roster`); },
    freeze(activityId, personIds) {
      return _request(`/api/v1/activities/${encodeURIComponent(activityId)}/expected-roster`, {
        method: 'PUT', body: JSON.stringify({ personIds, frozen: true }),
      });
    },
  },

  // 待办「实时派生组」服务端只读端点（批次 532 · B-500-7 最小 Plan B）：
  //   服务端实现 = `server/routes/todo-groups.js`；只读 GET，读权限门与 `GET /todos` 同口径
  //   （本人 / 本角色；跨人 / 跨角色一律 403）。
  //   兼容期：客户端仍在本地派生同样的组（`components/record/todo-tab-shell.js`），
  //   本口失败 / mock 数据源 / 返回空 ⇒ 回落客户端派生（可见结果不变）。
  todoGroups: {
    get({ role, personId } = {}) {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (personId) params.set('personId', personId);
      const query = params.toString();
      return _get(`/api/v1/todo-groups${query ? '?' + query : ''}`);
    },
  },

  // 2026-11-17 批次 562（Task 10）：跨组「应到 / 实到」只读汇总。
  //   服务端实现 = `server/routes/resources/semantic-routes.js`（GET /api/v1/group-attendance-summary）；
  //   口径单一源 = `core/domain/roster-eligibility.js`；前端不再逐组现算（`H32` 计数只在服务端算）。
  groupAttendanceSummary: {
    get() { return _get('/api/v1/group-attendance-summary'); },
  },

  // 2026-11-15 六维补齐 T3：党委台「支部管理」页的运维健康读数（只读 GET，无写门）。
  //   服务端实现 = `server/routes/health.js`；页面只经本门面取数（`CLAUDE.md H32`：不直连 fetch）。
  //   `deep()` 在任一项检查失败时返回 503 —— `_request` 会抛错并带 `.body`，调用方按 body 展示降级原因。
  opsHealth: {
    shallow() {
      return _get('/api/v1/health');
    },
    deep() {
      return _get('/api/v1/health/deep');
    },
    metrics() {
      return _get('/api/v1/health/metrics');
    },
  },

  // 2026-11-15 六维补齐 T14：党委台「进入某支部」只读查看（留痕 ＋ 一键退出）。
  //   服务端实现 = `server/routes/resources/semantic-routes.js`（POST / PATCH）；
  //   只读强制在服务端 `server/branch-view.js::createBranchViewGuard`，本组只做门面（H32）。
  //   `context()` 读 `GET /bootstrap` 的 `viewContext`（与后端同形投影；无进入记录 ⇒ null）。
  branchVisits: {
    async context() {
      const payload = await _get('/api/v1/bootstrap');
      return (payload && typeof payload === 'object' && payload.viewContext) || null;
    },
    enter(branchId) {
      return _post('/api/v1/committee/branch-visits', { branchId: String(branchId) });
    },
    exit(id) {
      return _patch(`/api/v1/committee/branch-visits/${encodeURIComponent(String(id))}`, {});
    },
  },

  // ════════════════════════════════════════════════════════════════
  //  2026-09-23 批次 163（T1）：三域补服务端对源 —— 语义端点组
  // ════════════════════════════════════════════════════════════════
  // 体例同 agendaVotes：**语义端点域、故意不进快照 payload**（写口走这些端点，防抖快照会以陈旧缓存覆盖），
  //   `init()` 逐域 `list()` 拉取填充 mockDB 缓存（供服务层同步读），写在 api 形态经这些方法落服务端。
  // 服务端实现 = `server/routes/resources.js` 末「语义端点：三委数据交接 / 成员变更确认队列 / 批次里程碑」段；
  //   表 = `server/db.js::SEMANTIC_TABLES`。
  handoffs: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/handoffs${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/handoffs', data);
    },

    confirm(id) {
      return _post(`/api/v1/handoffs/${id}/confirm`);
    },
  },

  memberConfirmations: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/member-confirmations${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/member-confirmations', data);
    },

    decide(id, body) {
      return _post(`/api/v1/member-confirmations/${id}/decide`, body || {});
    },
  },

  // 批次里程碑：只读（内容单一源 = docs/data/milestones.json，服务端由 seed.js 播种）
  milestones: {
    list() {
      return _get('/api/v1/milestones');
    },
  },

  // ════════════════════════════════════════════════════════════════
  //  2026-09-24 批次 169：四处「只有本机一份」的收口 —— 语义端点组
  // ════════════════════════════════════════════════════════════════
  // 体例同 handoffs / memberConfirmations：**语义端点域、故意不进快照 payload**，
  //   `init()` 逐域 `list()` 拉取填充 mockDB 缓存（供服务层同步读），写在 api 形态经这些方法落服务端。
  // 服务端实现 = `server/routes/resources.js` 末「语义端点：申诉队列 / 反馈未读标记 / 授权审计留痕」段；
  //   表 = `server/db.js::SEMANTIC_TABLES`。
  // 出勤申诉队列（services/activity/attendance.js；提交＝本人、处置＝支委层＋组长）
  attendanceAppeals: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/attendance-appeals${query ? '?' + query : ''}`);
    },
    create(data) {
      return _post('/api/v1/attendance-appeals', data);
    },
    patch(id, body) {
      return _patch(`/api/v1/attendance-appeals/${id}`, body || {});
    },
  },

  // 考察申诉队列（services/activity/inspection.js；同出勤申诉口径）
  inspectionAppeals: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/inspection-appeals${query ? '?' + query : ''}`);
    },
    create(data) {
      return _post('/api/v1/inspection-appeals', data);
    },
    patch(id, body) {
      return _patch(`/api/v1/inspection-appeals/${id}`, body || {});
    },
  },

  // 意见反馈「逐人未读标记」（services/governance/issues.js::IssueNotify；读态＝被指派人本人 / 支书「待终审」位）
  issueUnread: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/issue-unread${query ? '?' + query : ''}`);
    },
    set(body) {
      return _post('/api/v1/issue-unread', body || {});
    },
  },

  // 授权审计留痕（services/core/auth.js；只增不改的治理档案）
  authAudit: {
    list() {
      return _get('/api/v1/auth-audit');
    },
    create(data) {
      const body = { ...(data || {}) };
      const branchId = body.branchId;
      delete body.branchId;
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      return _post(`/api/v1/auth-audit${query}`, body);
    },
  },

  // ── 水合窗口（2026-11-16 · 列表上限 2000 ＋ 全量灌库不截断）────────────────────
  // 开窗方只有两处：`data-adapter.js::init()` 的 from-server 灌库路径，以及 `_refreshCollections`（集合重拉 /
  //   409 冲突恢复 / 远端探测，批次 564 Task 17.3）。窗口内 GET 带 `X-Hydrate: 1`，
  //   服务端按「已登录 ⇒ 整集合不截断」返回（`server/routes/resources/write-validation.js::hydrateReadMode`）。
  // 窗口外的一切读口仍是 2000 上限 ＋ `X-Has-More`，标记不放大普通读面。
  beginHydrate() { _hydrateDepth += 1; },
  endHydrate() { _hydrateDepth = Math.max(0, _hydrateDepth - 1); },
};

/** 水合窗口深度（0 ＝ 关；只在 `_request` 里被读，声明可在对象之后——调用发生在模块求值完成后） */
let _hydrateDepth = 0;
