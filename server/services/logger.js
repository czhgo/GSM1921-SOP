// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/services/logger.js —— 结构化请求日志（T2 · 六维补齐 M1「坏了能查」）
//
//  为什么有这一份：
//   · 过去 5xx 只有一行 `console.error`，没有请求 id ⇒ 前端报「出错」时无法串起是哪一次请求。
//   · 本文件只做**一次请求一条 JSON**：requestId / method / path / route / status / durationMs / errorCategory。
//   · **脱敏**：只记 URL 与查询串（敏感查询键置 ***），不记请求体、不记身份字段（`_realPersonId` 等）、
//     不记口令 / token 实值。
//
//  开关（`REQUEST_LOG`）：
//   · 未设 ⇒ 正常进程（npm start / audit 工具）开启；node:test 子进程默认静默，避免淹没 TAP。
//   · `1` 强制开启、`0` 强制关闭（测试要验证日志时置 1）。
//   · 关闭时仍分配 `req.requestId` 与 `X-Request-Id` 响应头：错误处理仍能凭 id 串起来。
// ════════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';

/** 请求 id 响应头 */
export const REQUEST_ID_HEADER = 'x-request-id';

/** 允许透传的入站请求 id（防日志注入 / 超长串） */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,64}$/;

/** 查询串里不得入日志的键（大小写不敏感）：口令 / token / 身份标识 */
const SENSITIVE_QUERY_KEY = /^(?:password|passwd|pwd|token|access_token|refresh_token|authorization|secret|api_?key|iaaa|personId|studentId|realPersonId|_realPersonId|name)$/i;

/** 文本里的敏感片段（Bearer / 键值对） */
const BEARER_TEXT = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const KEY_VALUE_TEXT = /(password|passwd|pwd|token|secret|api_?key)\s*[=:]\s*[^\s&,;]+/gi;

/** 只要 API 请求（静态资源逐条记没有排查价值，会淹没日志） */
const isApiRequest = (url) => String(url || '').startsWith('/api/');

/** 状态码 → 错误类别（与 spec「错误类别」字段对应） */
export function errorCategoryOf(status) {
  const code = Number(status) || 0;
  if (code >= 500) return 'server';
  if (code >= 400) return 'client';
  return 'none';
}

/** 查询串脱敏：敏感键的值一律 `***`；路径里的长数字（学号 / 工号）置 `:id` */
export function redactPath(rawUrl) {
  const text = String(rawUrl || '');
  const queryAt = text.indexOf('?');
  const rawPath = queryAt < 0 ? text : text.slice(0, queryAt);
  const pathPart = rawPath.replace(/\d{6,}/g, ':id');
  if (queryAt < 0) return pathPart;
  const params = new URLSearchParams(text.slice(queryAt + 1));
  for (const key of [...params.keys()]) {
    if (SENSITIVE_QUERY_KEY.test(key)) params.set(key, '***');
  }
  const query = params.toString();
  return query ? `${pathPart}?${query}` : pathPart;
}

/** 文本脱敏（错误信息进日志前必过） */
export function redactText(text) {
  return String(text ?? '')
    .replace(BEARER_TEXT, 'Bearer ***')
    .replace(KEY_VALUE_TEXT, (_match, key) => `${key}=***`);
}

/** 默认开关：正常进程开启；node:test 子进程静默（显式 REQUEST_LOG=1 可打开） */
export function requestLogEnabled(env = process.env) {
  if (env.REQUEST_LOG === '0') return false;
  if (env.REQUEST_LOG === '1') return true;
  return !env.NODE_TEST_CONTEXT;
}

/** 默认落点：stdout 一行一条 JSON（便于 `| tee` / journald 按行检索） */
export function writeJsonLine(record) {
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

/** 请求 id：优先透传入站值，否则生成短 id（同一响应可回查） */
export function requestIdOf(req) {
  const incoming = typeof req?.get === 'function' ? req.get(REQUEST_ID_HEADER) : '';
  if (incoming && SAFE_REQUEST_ID.test(incoming)) return incoming;
  return `req-${randomUUID().slice(0, 8)}`;
}

/** 路由模板：命中 Express 路由时给 `/api/v1/todos/:id`，未命中回实际路径 */
export function routeOf(req) {
  const routePath = req?.route?.path;
  if (routePath) return `${req.baseUrl || ''}${routePath === '/' ? '' : routePath}`;
  return redactPath(String(req?.originalUrl || '').split('?')[0]);
}

/**
 * 请求日志中间件。
 * @param {{sink?:(record:object)=>void, enabled?:boolean, now?:()=>number}} [options]
 * @returns {import('express').RequestHandler}
 */
export function createRequestLogger({ sink = writeJsonLine, enabled = requestLogEnabled(), now = Date.now } = {}) {
  return function requestLogger(req, res, next) {
    const requestId = requestIdOf(req);
    req.requestId = requestId;
    if (!res.headersSent) res.setHeader('X-Request-Id', requestId);
    if (!enabled || !isApiRequest(req.originalUrl)) return next();

    const startedAt = now();
    let logged = false;
    const emit = () => {
      if (logged) return;
      logged = true;
      const status = res.statusCode;
      sink({
        ts: new Date().toISOString(),
        level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        requestId,
        method: String(req.method || '').toUpperCase(),
        path: redactPath(req.originalUrl),
        route: routeOf(req),
        status,
        durationMs: Math.max(0, now() - startedAt),
        errorCategory: errorCategoryOf(status),
      });
    };
    res.once('finish', emit);
    res.once('close', emit); // 客户端提前断开（无 finish）也要留一条
    next();
  };
}
