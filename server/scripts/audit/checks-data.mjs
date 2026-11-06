// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/checks-data.mjs —— D 数据维度（D1–D4）
//
//  D1 每个 read 口：2xx / JSON 可解析 / ≤500KB，并记录耗时（每口 5 次，供 E1 复用）
//  D2 count 映射：UI 计数文本/行数与接口数组长度对账（容差 0，对不上 P0）
//  D3 首屏 /api/v1/ 4xx 归零（复用 runner 的 F8 evidence，不重复导航 45 次）
//  D4 单接口 p95 >100ms 或 >500KB ⇒ P2（并提示写入 perf-baseline 首轮预算）
//
//  返回 Finding[]：{ key, rule, severity, status, message, evidence }
// ════════════════════════════════════════════════════════════════

import { ENDPOINT_MAP } from './endpoint-map.mjs';
import { ACCOUNT_IDS, apiLogin } from './harness.mjs';
import { buildHasPagerProbe } from './dom-probe.mjs';
import {
  budgetFor, budgetSource, generatedBudget, isOverAbsoluteLimit, MAX_RESPONSE_BYTES,
} from './perf-baseline.mjs';

/** 七个演示账号（单一源在 `harness.mjs`；此处仅为旧调用方保留同名转出） */
export { ACCOUNT_IDS as DEMO_ACCOUNTS } from './harness.mjs';

/** 进程内会话缓存：base::role → { token, user } */
const SESSION_CACHE = new Map();
/** 进程内测量缓存：tabKey::endpoint → [ {ms, bytes, status} ] */
const MEASUREMENTS = new Map();

export function getMeasurements(key) {
  return MEASUREMENTS.get(key) || [];
}

function recordMeasurement(key, endpoint, row) {
  const id = `${key}::${endpoint}`;
  const list = MEASUREMENTS.get(id) || [];
  list.push(row);
  MEASUREMENTS.set(id, list);
}

function percentile(values, p) {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return 0;
  const idx = Math.min(list.length - 1, Math.max(0, Math.ceil((p / 100) * list.length) - 1));
  return list[idx];
}

export function measureStats(rows) {
  const ms = rows.map((row) => row.ms);
  const bytes = rows.length ? rows[rows.length - 1].bytes : 0;
  return {
    runs: rows.length,
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    min: ms.length ? Math.min(...ms) : 0,
    max: ms.length ? Math.max(...ms) : 0,
    bytes,
  };
}

function isPublicRead(path) {
  return path.startsWith('/api/v1/public/') || path === '/api/v1/health';
}

/** 登录并缓存（runner 若已给 ctx.tokens 则直接复用，不重复登录） */
export async function ensureSession(ctx, role = ctx.role) {
  const provided = ctx.tokens && ctx.tokens[role];
  if (provided) return { token: provided, user: (ctx.users && ctx.users[role]) || null };
  const cacheKey = `${ctx.base}::${role}`;
  if (SESSION_CACHE.has(cacheKey)) return SESSION_CACHE.get(cacheKey);
  const personId = ACCOUNT_IDS[role];
  if (!personId) throw new Error(`[checks-data] 未知演示角色：${role}`);
  const session = await apiLogin(ctx.base, role, ctx.timeout || 8000);
  SESSION_CACHE.set(cacheKey, session);
  return session;
}

/** 统一 HTTP 探针：返回状态、文本、JSON、字节数、耗时 */
export async function httpRequest(base, path, { method = 'GET', token, body, timeout = 8000 } = {}) {
  const url = `${base.replace(/\/$/, '')}${path}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const started = performance.now();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: '',
      json: null,
      bytes: 0,
      ms: Math.round(performance.now() - started),
      error: error?.name === 'TimeoutError' ? 'timeout' : String(error?.message || error),
    };
  }
  const text = await res.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return {
    ok: res.ok,
    status: res.status,
    text,
    json,
    bytes: Buffer.byteLength(text, 'utf8'),
    ms: Math.round(performance.now() - started),
  };
}

function parseRead(readItem) {
  const match = /^(GET|POST|PATCH|DELETE)\s+(\S+)$/.exec(String(readItem || '').trim());
  if (!match) return null;
  return { method: match[1], path: match[2] };
}

function finding(ctx, rule, severity, status, message, evidence = {}) {
  return { key: ctx.key, rule, severity, status, message, evidence };
}

/** 从任意数组型响应取数组 */
function asArray(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.rows)) return json.rows;
  if (json && Array.isArray(json.items)) return json.items;
  if (json && Array.isArray(json.data)) return json.data;
  return null;
}

/** D2：取 UI 计数（优先复用 runner 的 page；否则自起 Playwright 并按 token 恢复会话） */
let _browser = null;

async function openAuditPage(ctx) {
  if (ctx.page) return { page: ctx.page, owned: false, context: null, contentId: `${ctx.role}-tab-content` };
  const { chromium } = await import('playwright');
  _browser ||= await chromium.launch({ headless: true });
  const session = await ensureSession(ctx, ctx.role);
  const user = session.user || {};
  const context = await _browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ token, user, tabId }) => {
    const login = {
      personId: user.id,
      role: user.role,
      tabId,
    };
    if (Object.prototype.hasOwnProperty.call(user, 'branchId')) login.branchId = user.branchId;
    localStorage.setItem('gsm1921-login-user', JSON.stringify(login));
    sessionStorage.setItem('gsm1921-tab-id', tabId);
    sessionStorage.setItem('gsm1921-api-token', token);
    sessionStorage.setItem('gsm1921-session-snap', JSON.stringify({
      personId: user.id, role: user.role, branchId: user.branchId,
    }));
  }, { token: session.token, user, tabId: `audit-${Math.random().toString(36).slice(2)}` });
  const page = await context.newPage();
  const url = `${ctx.base.replace(/\/$/, '')}/workspace/${ctx.role}.html?tab=${encodeURIComponent(ctx.tab)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: ctx.timeout || 15000 });
  return { page, owned: true, context, contentId: `${ctx.role}-tab-content` };
}

async function closeAuditPage(handle) {
  if (!handle?.owned) return;
  try { await handle.context?.close(); } catch { /* 忽略清理失败 */ }
}

async function uiCount(handle, ui, timeout) {
  const page = handle.page;
  if (String(ui).startsWith('text:')) {
    const pattern = String(ui).slice(5);
    const text = await page.evaluate(() => document.body?.innerText || '');
    const match = new RegExp(pattern).exec(text);
    return match ? Number(match[1]) : null;
  }
  await page.waitForSelector(ui, { timeout: timeout || 8000 });
  return page.locator(ui).count();
}

/** 页面是否存在分页承载（与 F7 / page-sweep 同一 `hasPager` 判据） */
async function hasPagerInPage(handle) {
  try {
    return await handle.page.evaluate(buildHasPagerProbe(), handle.contentId || null);
  } catch {
    return false;
  }
}

/** `total` 模式：从 `.lf-count` 的「共 N」读取总数（分页页签的当页行数不能与接口全量对账） */
async function totalCount(handle, selector, timeout) {
  const target = selector || '.lf-count';
  try {
    await handle.page.waitForSelector(target, { timeout: timeout || 8000 });
    const text = await handle.page.locator(target).first().innerText();
    const match = /共\s*([\d,]+)/.exec(text);
    return match ? Number(match[1].replace(/,/g, '')) : null;
  } catch {
    return null;
  }
}

/** D1 + D4：逐 read 口跑 5 次，记录 p50/p95/bytes */
async function runReadProbes(ctx, entry) {
  const findings = [];
  const reads = Array.isArray(entry.read) ? entry.read : [];
  if (!reads.length) {
    if (!entry.readOnlyReason) {
      findings.push(finding(ctx, 'D1', 'P1', 'fail', '页签没有登记任何读口', {}));
    }
    return findings;
  }
  let session;
  try {
    session = await ensureSession(ctx, ctx.role);
  } catch (error) {
    findings.push(finding(ctx, 'D1', 'P0', 'fail', `无法取得 ${ctx.role} 登录会话`, { error: String(error.message || error) }));
    return findings;
  }
  const perEndpoint = [];
  for (const item of reads) {
    const parsed = parseRead(item);
    if (!parsed) {
      findings.push(finding(ctx, 'D1', 'P1', 'fail', `读口格式不合法：${item}`, { read: item }));
      continue;
    }
    const token = isPublicRead(parsed.path) ? null : session.token;
    const rows = [];
    let last = null;
    let readError = null;
    for (let i = 0; i < 5; i += 1) {
      last = await httpRequest(ctx.base, parsed.path, {
        method: parsed.method,
        token,
        timeout: ctx.timeout,
      });
      rows.push({ ms: last.ms, bytes: last.bytes, status: last.status });
      recordMeasurement(ctx.key, item, { ms: last.ms, bytes: last.bytes, status: last.status });
      if (!last.ok || !last.json) {
        readError = last;
        break;
      }
    }
    const stats = measureStats(rows);
    perEndpoint.push({
      endpoint: item, status: last.status, runs: stats.runs,
      p50: stats.p50, p95: stats.p95, bytes: stats.bytes,
    });
    if (readError) {
      findings.push(finding(
        ctx,
        'D1',
        'P0',
        'fail',
        `读口 ${item} 返回 ${readError.status || '网络错误'}`,
        { read: item, status: readError.status, error: readError.error || readError.text?.slice(0, 300), stats },
      ));
      continue;
    }
    if (last.bytes > MAX_RESPONSE_BYTES) {
      findings.push(finding(
        ctx,
        'D1',
        'P2',
        'fail',
        `读口 ${item} 响应 ${last.bytes} 字节 > 500KB`,
        { read: item, stats },
      ));
    }
    // D4：绝对上限（p95 >100ms 或 >500KB）
    if (isOverAbsoluteLimit({ p95: stats.p95, bytes: stats.bytes })) {
      const source = budgetSource(item, ctx.key);
      const budget = budgetFor(item, ctx.key) || generatedBudget({ p95: stats.p95, bytes: stats.bytes });
      findings.push(finding(
        ctx,
        'D4',
        'P2',
        'fail',
        `读口 ${item} 超预算（p95 ${stats.p95}ms / ${stats.bytes}B）`,
        { read: item, stats, budget, budgetSource: source || 'generated' },
      ));
    }
  }
  // 用本页签的真实测量回填 meta（按 endpoint 汇总；供 E2 摘要复用）
  const summary = measurementsForTab(ctx.key);
  const failed = findings.filter((row) => row.rule === 'D1' && row.status === 'fail').length;
  if (!failed) {
    findings.push(finding(
      ctx, 'D1', null, 'pass',
      `读口全部 2xx 且 JSON 可解析（${reads.length} 个，每口 5 次）`,
      { count: reads.length, perEndpoint, measurements: summary },
    ));
  }
  findings.meta = { measurements: summary };
  return findings;
}

/** D3：复用 runner 的前端 F8 evidence（不重复导航） */
function reuseFront8(ctx) {
  const candidates = [
    ctx.f8,
    ctx.front8,
    ctx.front?.f8,
    Array.isArray(ctx.frontFindings) ? ctx.frontFindings.find((row) => String(row.rule || '').toUpperCase() === 'F8') : null,
    Array.isArray(ctx.findings) ? ctx.findings.find((row) => String(row.rule || '').toUpperCase() === 'F8') : null,
  ].filter(Boolean);
  return candidates[0] || null;
}

/** 主入口 */
export async function runDataChecks(ctx) {
  const entry = ENDPOINT_MAP[ctx.key];
  if (!entry) {
    return [finding(ctx, 'D0', 'P0', 'fail', `ENDPOINT_MAP 缺少页签 ${ctx.key}`, {})];
  }
  const findings = [];

  // D1 / D4
  findings.push(...await runReadProbes(ctx, entry));

  // D2 对账
  const counts = Array.isArray(entry.count) ? entry.count : [];
  if (counts.length) {
    let handle = null;
    try {
      handle = await openAuditPage(ctx);
      const paged = await hasPagerInPage(handle);
      for (const rule of counts) {
        const session = await ensureSession(ctx, ctx.role);
        // `mode` 缺省：分页容器存在 ⇒ total（对「共 N」），否则 rows（数当页行）。
        const mode = rule.mode || (paged ? 'total' : 'rows');
        const ui = mode === 'total'
          ? await totalCount(handle, rule.countSelector, ctx.timeout).catch(() => null)
          : await uiCount(handle, rule.ui, ctx.timeout).catch(() => null);
        if (ui == null) {
          findings.push(finding(ctx, 'D2', 'P1', 'skip', `UI 计数不可读：${mode === 'total' ? (rule.countSelector || '.lf-count') : rule.ui}`, { rule, mode }));
          continue;
        }
        // 契约字段是 `collection`；兼容早期只写 `endpoint` 的条目。
        const endpointText = rule.endpoint
          || (rule.collection ? `GET /api/v1/${rule.collection}` : '');
        if (!endpointText) {
          findings.push(finding(ctx, 'D2', 'P1', 'skip', `对账规则缺 collection/endpoint：${rule.ui}`, { rule }));
          continue;
        }
        const parsed = parseRead(endpointText) || { method: 'GET', path: endpointText };
        const res = await httpRequest(ctx.base, parsed.path, {
          method: parsed.method, token: session.token, timeout: ctx.timeout,
        });
        if (!res.ok) {
          findings.push(finding(ctx, 'D2', 'P0', 'fail', `对账接口 ${endpointText} 返回 ${res.status}`, {
            rule, status: res.status, error: res.error || res.text?.slice(0, 200),
          }));
          continue;
        }
        const rows = asArray(res.json);
        if (!rows) {
          findings.push(finding(ctx, 'D2', 'P1', 'skip', `对账接口 ${endpointText} 不是数组`, { rule }));
          continue;
        }
        let expected = rows;
        if (rule.filter) {
          try {
            // 配置来源为本仓静态文件，非用户输入；仅用于计数过滤。
            // eslint-disable-next-line no-new-func
            const predicate = new Function('row', `return (${rule.filter});`);
            expected = rows.filter((row) => predicate(row));
          } catch (error) {
            findings.push(finding(ctx, 'D2', 'P1', 'skip', `filter 表达式无效：${rule.filter}`, { rule, error: String(error.message || error) }));
            continue;
          }
        }
        if (ui !== expected.length) {
          findings.push(finding(
            ctx,
            'D2',
            'P0',
            'fail',
            `UI 计数 ${ui} ≠ 接口数组 ${expected.length}（${endpointText}，mode=${mode}）`,
            { rule, ui, api: expected.length, endpoint: endpointText, mode },
          ));
        } else {
          findings.push(finding(
            ctx,
            'D2',
            null,
            'pass',
            `UI 计数与接口一致：${ui}（mode=${mode}）`,
            { rule, ui, api: expected.length, endpoint: endpointText, mode },
          ));
        }
      }
    } catch (error) {
      findings.push(finding(ctx, 'D2', 'P1', 'skip', 'D2 页面不可用', { error: String(error.message || error) }));
    } finally {
      await closeAuditPage(handle);
    }
  }

  // D3 复用 F8：只看「首屏 /api/v1 4xx 数量」。F8 自身的失败可能来自 pageerror / console.error
  // （已归前端维度），不能把它当作 D3 的 P0；evidence 缺失时记 skip，不假绿。
  const f8 = reuseFront8(ctx);
  if (f8) {
    const ev = f8.evidence || {};
    const raw = ev.http4xx;
    const http4xx = typeof raw === 'number' ? raw : (Array.isArray(raw) ? raw.length : null);
    if (http4xx == null) {
      findings.push(finding(ctx, 'D3', null, 'skip', 'F8 evidence 未携带 http4xx 计数，D3 无法判定', { source: 'F8', f8 }));
    } else if (http4xx > 0) {
      findings.push(finding(
        ctx, 'D3', 'P0', 'fail',
        `首屏存在 ${http4xx} 条 /api/v1/ 4xx（复用 F8 evidence）`,
        { source: 'F8', http4xx: raw, f8 },
      ));
    } else {
      findings.push(finding(
        ctx, 'D3', null, 'pass',
        '首屏 /api/v1/ 4xx 归零（复用 F8 evidence）',
        { source: 'F8', http4xx: raw, f8Status: f8.status },
      ));
    }
  } else {
    findings.push(finding(ctx, 'D3', null, 'skip', 'runner 未提供 F8 evidence，D3 不重复导航', {}));
  }

  return findings;
}

/** 供 checks-economy 复用：按页签取每个 read 口的测量 */
export function measurementsForTab(key) {
  const rows = [];
  for (const [id, list] of MEASUREMENTS.entries()) {
    if (!id.startsWith(`${key}::`)) continue;
    const endpoint = id.slice(key.length + 2);
    rows.push({ endpoint, ...measureStats(list) });
  }
  return rows;
}
