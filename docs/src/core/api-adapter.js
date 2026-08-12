﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  api-adapter.js — REST API 数据适配器
//  T-142 阶段2：DataAdapter 接口的 REST API 实现（P1：读列表 + snapshot 写穿已就绪；
//  资源级 CRUD 为 P2）
//
//  P1 已实现能力：
//  1. 25 个服务端资源分组的 list()（供 data-adapter init() 拉取全量数据填充 mockDB）
//     —— 10 主集合 + 8 niche + 7 新域（报名/复盘/宣传/档案/公邮/外发确认/子记录聚合域，T-209 全栈同步）
//  2. snapshot()：全量快照写穿（POST /api/v1/snapshot，认证保护，供 persist() 防抖调度）
//  3. _request()：统一 fetch + Bearer token 认证（token 由 getAuthToken() 提供）
//
//  Source: content/04_web_design/SCHOOL_IT_DEPLOYMENT.md
//         content/04_web_design/DATA_ARCHITECTURE.md §8.4
// ════════════════════════════════════════════════════════════════

import { getApiBaseUrl, getAuthToken } from './data-adapter.js?v=20260812d';

// ── HTTP 工具函数 ──────────────────────────────────────────────

/** 普通请求超时（ms）。keepalive 请求不设超时，见 _request 注释 */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * 发送认证 HTTP 请求
 * @param {string} path - API 路径（不含 base URL）
 * @param {RequestInit} [options] - fetch 选项
 * @returns {Promise<any>} 响应 JSON
 */
async function _request(path, options = {}) {
  const url = `${getApiBaseUrl()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
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
    const error = new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.type = response.status === 404 ? 'NotFoundError' :
                 response.status === 403 ? 'PermissionError' :
                 response.status === 401 ? 'AuthError' : 'ApiError';
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

/** GET 请求 */
function _get(path) {
  return _request(path, { method: 'GET' });
}

/** POST 请求 */
function _post(path, data) {
  return _request(path, { method: 'POST', body: JSON.stringify(data) });
}

/** PATCH 请求 */
function _patch(path, data) {
  return _request(path, { method: 'PATCH', body: JSON.stringify(data) });
}

/** DELETE 请求 */
function _delete(path) {
  return _request(path, { method: 'DELETE' });
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
//  | 合规引用    | /api/v1/complianceReferences | GET/POST |
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
   * 全量快照写穿：将当前 mockDB 的 25 个持久化域整体覆盖写入后端（认证保护）。
   * 由 data-adapter 的 persist() 防抖调度调用；P2 资源级 CRUD 落地前，
   * 这是服务层写入穿透到服务器的唯一通道。
   * @param {Object} payload - 快照 payload（不含 users，含聚合域 __root__ 单行）
   * @returns {Promise<null>} 204 No Content
   */
  snapshot(payload) {
    // keepalive + pagehide 兜底（I1）：导航（整页 reload/切页）卸载瞬间仍能发出快照，
    // 避免 800ms 防抖窗口内的写入随旧上下文销毁而静默丢失
    return _request('/api/v1/snapshot', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    });
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

    toggleBrand(id) {
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
  },

  complianceReferences: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      // T-218：路径统一为 /api/v1/{name}（原 /compliance-refs 未实现）
      return _get(`/api/v1/complianceReferences${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/complianceReferences', data);
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

  weeklyReports: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/weeklyReports${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/weeklyReports', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/weeklyReports/${id}`, patch);
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
  },

  mailboxConfig: {
    // 单对象聚合域（null 或配置对象）：list 返回 [ { id:'__root__', body } ] 或 []
    list() {
      return _get('/api/v1/mailboxConfig');
    },

    // 整体替换配置对象
    update(body) {
      return _patch(`/api/v1/mailboxConfig/__root__`, { body });
    },
  },

  mailboxHistory: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/mailboxHistory${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/mailboxHistory', data);
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
};
