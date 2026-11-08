// role: [工程师]+[AI]
// public-portal-client.js — 未登录公共门厅数据客户端（2026-11-08 批次 536 · Task 7）
//
// 由来：未登录首页改为公共门厅（spec `add-committee-activities-and-public-portal`），
//   门厅只读党委已发布、未过期、`publishScope='public'` 的内容。
//
// 边界：
//   · 走匿名接口 `/api/public/*`（`server/routes/public-portal.js`）：不带 Authorization、不读 token；
//   · 一律 no-store（服务端同口径），避免门厅展示过期内容；
//   · 8 秒超时——服务器「接受但不响应」时给出可读失败信息，由界面渲染重试而不是空白；
//   · 只做「取数与形状收敛」，字段含义与白名单以服务端投影为准，本文件不补充业务事实。

const REQUEST_TIMEOUT_MS = 8000;

/** 失败信息统一前缀（界面直接展示，不暴露内部路径） */
function _errorOf(label, detail) {
  return new Error(`${label}失败：${detail}`);
}

/**
 * GET 一个公共只读端点并解析 JSON。
 * @param {string} path — 以 `/api/public` 开头的绝对路径
 * @param {string} label — 失败信息里的可读对象名（如「公开内容加载」）
 * @returns {Promise<any>}
 */
async function _getJson(path, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(path, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (e) {
    if (controller.signal.aborted) {
      throw _errorOf(label, `请求超时（${REQUEST_TIMEOUT_MS / 1000} 秒），请重试`);
    }
    throw _errorOf(label, '无法连接服务器，请检查网络后重试');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw _errorOf(label, `服务器返回 ${response.status}`);
  try {
    return await response.json();
  } catch (e) {
    throw _errorOf(label, '返回内容无法解析');
  }
}

/** 数组收敛：接口缺字段 / 非数组一律按空列表处理（界面走空态，不猜数据） */
function _rows(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 拉取公共门厅三块内容。
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<{ notices: object[], activities: object[], documents: object[] }>}
 */
export async function loadPublicPortal({ limit = 20 } = {}) {
  const query = Number(limit) > 0 ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const body = await _getJson(`/api/public/portal${query}`, '公开内容加载');
  return {
    notices: _rows(body && body.notices),
    activities: _rows(body && body.activities),
    documents: _rows(body && body.documents),
  };
}

/** 公开通知详情（全文） */
export function loadPublicNotice(id) {
  return _getJson(`/api/public/notices/${encodeURIComponent(String(id))}`, '公开通知加载');
}

/** 公开活动详情（仍只有摘要字段，白名单见服务端） */
export function loadPublicActivity(id) {
  return _getJson(`/api/public/activities/${encodeURIComponent(String(id))}`, '公开活动加载');
}

/** 公开资料详情 */
export function loadPublicDocument(id) {
  return _getJson(`/api/public/documents/${encodeURIComponent(String(id))}`, '公开资料加载');
}

/** 公开资料下载地址（原生 `<a href>` 直接落浏览器下载，服务端写匿名下载审计） */
export function publicDocumentDownloadUrl(id) {
  return `/api/public/documents/${encodeURIComponent(String(id))}/download`;
}
