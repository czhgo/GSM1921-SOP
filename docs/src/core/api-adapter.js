// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  api-adapter.js — REST API 数据适配器（占位实现）
//  T-142 阶段2：接入学校服务器时填充此文件
//
//  本文件是 DataAdapter 接口的 REST API 实现。
//  当前为占位符，所有方法抛出 NotImplementedError。
//  接入后端时，按以下步骤实现：
//  1. 在 data-adapter.js 中 setDataSource('api', { apiBaseUrl, authToken })
//  2. 逐一实现下方每个方法，使用 fetch() + JWT 认证
//  3. 注册此适配器：registerApiAdapter(ApiAdapter)
//
//  Source: content/04_web_design/SCHOOL_IT_DEPLOYMENT.md
//         content/04_web_design/DATA_ARCHITECTURE.md §8.4
// ════════════════════════════════════════════════════════════════

import { getApiBaseUrl, getAuthToken } from './data-adapter.js';

// ── HTTP 工具函数 ──────────────────────────────────────────────

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
  const response = await fetch(url, { ...options, headers });
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
//  | 交接        | /api/v1/handovers       | GET/POST  |
//  | 补课        | /api/v1/makeup-tasks    | GET/POST  |
//  | 补课(单)    | /api/v1/makeup-tasks/:id| PATCH     |
//  | 赋权        | /api/v1/authorizations  | GET/POST  |
//  | 赋权(单)    | /api/v1/authorizations/:id | DELETE |
//  | 文件空间    | /api/v1/files           | GET/POST  |
//  | 图片        | /api/v1/images          | GET/POST  |
//  | 经验沉淀    | /api/v1/experiences     | GET/POST  |
//  | 合规引用    | /api/v1/compliance-refs | GET/POST  |
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

  handovers: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/handovers${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/handovers', data);
    },
  },

  makeupTasks: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/makeup-tasks${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/makeup-tasks', data);
    },

    update(id, patch) {
      return _patch(`/api/v1/makeup-tasks/${id}`, patch);
    },
  },

  authorizations: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/authorizations${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/authorizations', data);
    },

    delete(id) {
      return _delete(`/api/v1/authorizations/${id}`);
    },
  },

  fileSpaceRecords: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/files${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/files', data);
    },
  },

  imageRecords: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/images${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/images', data);
    },
  },

  experienceDeposits: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/experiences${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/experiences', data);
    },
  },

  complianceReferences: {
    list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return _get(`/api/v1/compliance-refs${query ? '?' + query : ''}`);
    },

    create(data) {
      return _post('/api/v1/compliance-refs', data);
    },
  },
};
