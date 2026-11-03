// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/checks-crud.mjs —— C CRUD 维度（C1–C4）
//
//  C1 读口按角色 200；visitor 对每个写口只发一次最小请求，期望 401/403（2xx ⇒ 权限漏洞 P0）
//  C2 非 destructive 写口在 :memory: 库做 create → GET 回读 → PATCH → GET 校验 → DELETE
//     请求体来自 CRUD_RECIPES（人工核对的最小合法形状）；无配方 ⇒ skip + 原因（不得假绿）
//     destructive 写口只创建「本次探针」并清理探针，不触碰存量，记 exception + reason
//     `dbMode !== 'memory'`（共享 3000 演示库）一律 skip，绝不写入
//  C3 死入口：扫描页签源码的 data-action / data-todo-action / data-mfw 等写动作，
//     必须能映射到 write.flow（或登记只读白名单）；无法可靠判断的 data-* 只记证据、不误报
//  C4 每个 write 必须有 gate，且 gate 能在 gates.js / semantic-routes.js 找到；
//     写口路径必须能在 server/routes/** 静态定位（防 map 编造端点）
//
//  返回 Finding[]：{ key, rule, severity, status, message, evidence }
// ════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENDPOINT_MAP, KNOWN_READ_ONLY_ACTIONS } from './endpoint-map.mjs';
import { ensureSession, httpRequest } from './checks-data.mjs';
import { RESOURCE_TABLES } from '../../routes/resources/store.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const GATES_FILE = 'server/routes/resources/gates.js';
const SEMANTIC_FILE = 'server/routes/resources/semantic-routes.js';
const SYSTEM_NOTICE_KINDS_FILE = 'server/system-notice-kinds.js';

function finding(ctx, rule, severity, status, message, evidence = {}) {
  return { key: ctx.key, rule, severity, status, message, evidence };
}

/** 语义资源的列表读口（`:id` 取自哪个集合的首行）；缺省与资源同名。 */
const COLLECTION_OF = {
  members: 'users',
  branches: 'branches',
  users: 'users',
};

/** 路径缺 `id` 时的兜底（仅 branches / members 这类语义端点有稳定演示 id） */
function fallbackPath(path) {
  if (path.startsWith('/api/v1/branches/')) return path.replace(':id', 'br-b1');
  if (path.startsWith('/api/v1/members/') || path.startsWith('/api/v1/users/')) {
    return path.replace(':id', '2300010001');
  }
  return null;
}

/**
 * 把 `:id` 替换为真实 id（`concretePath`）。
 * `:personId` / `:taskId` / `:grantId` 仍用哨兵值；未给 id 时按资源兜底或哨兵。
 * @param {string} path
 * @param {{id?: string}} [opts]
 */
function concretePath(path, { id } = {}) {
  if (id) {
    return String(path)
      .replace(':personId', '__audit_missing__')
      .replace(':taskId', '__audit_missing__')
      .replace(':grantId', '__audit_missing__')
      .replace(':id', String(id));
  }
  const fallback = fallbackPath(String(path));
  if (fallback) {
    return fallback
      .replace(':personId', '__audit_missing__')
      .replace(':taskId', '__audit_missing__')
      .replace(':grantId', '__audit_missing__');
  }
  return String(path)
    .replace(':personId', '__audit_missing__')
    .replace(':taskId', '__audit_missing__')
    .replace(':grantId', '__audit_missing__')
    .replace(':id', '__audit_missing__');
}

/** 写口归属的资源名（`write.resource` 优先，否则取路径首段） */
function resourceOf(write) {
  if (write.resource) return write.resource;
  const match = /^\/api\/v1\/([^/:]+)/.exec(String(write.path || ''));
  return match ? match[1] : null;
}

function listPathOf(resource) {
  return `/api/v1/${COLLECTION_OF[resource] || resource}`;
}

/** 推断 `:id` 的来源：显式 idFrom 优先；`/:id/<sub>` 用列表首行，`/:id` 有同资源 POST 时用创建 id。 */
function inferIdSpec(entry, write) {
  if (write.idFrom) return write.idFrom;
  const resource = resourceOf(write);
  if (!resource) return null;
  const rest = String(write.path).slice(`/api/v1/${resource}`.length);
  if (!rest.startsWith('/:id')) return null;
  if (rest.length > '/:id'.length) return `read:${resource}`;
  const hasCreate = (entry.write || []).some((item) => item.method === 'POST'
    && item.path === `/api/v1/${resource}`);
  return hasCreate ? `created:${resource}` : `read:${resource}`;
}

// ── C2 最小合法请求体配方（人工核对；只增不改形）──────────────────────────
// `resource` 用于把同一资源的 POST / PATCH / DELETE 归到同一次往返；
// `update: false` 表示该资源没有 PATCH（审计记 skip:no-update，而不是假跑）。
const CRUD_RECIPES = [
  {
    id: 'partyGroups',
    resource: /^\/api\/v1\/partyGroups(?:\/[^/]+)?$/,
    list: '/api/v1/partyGroups',
    create: (ctx, user) => {
      const at = new Date().toISOString();
      return {
        name: `审计试点组-${Date.now()}`,
        branchId: user?.branchId || 'br-b1',
        seq: 900,
        status: 'active',
        createdAt: at.slice(0, 10),
        createdBy: user?.id || 'audit',
        note: 'audit probe',
        history: [{ at, by: user?.id || 'audit', action: 'create' }],
      };
    },
    patch: { note: 'audit probe updated' },
    verify: (row) => row.note === 'audit probe updated',
  },
  {
    id: 'notices',
    resource: /^\/api\/v1\/notices(?:\/[^/]+)?$/,
    list: '/api/v1/notices',
    create: (ctx, user) => ({
      title: `审计试点通知-${Date.now()}`,
      content: 'audit probe',
      noticeType: 'notice',
      audience: ['all'],
      source: 'branch',
      branchId: user?.branchId || 'br-b1',
      publishedAt: new Date().toISOString(),
      publishedBy: user?.id || 'audit',
    }),
    patch: { title: `审计试点通知-更新-${Date.now()}` },
    verify: (row) => String(row.title || '').includes('更新'),
  },
  {
    id: 'todos',
    resource: /^\/api\/v1\/todos(?:\/[^/]+)?$/,
    list: '/api/v1/todos',
    create: (ctx, user) => ({
      personId: user?.id,
      title: `审计试点待办-${Date.now()}`,
      status: 'pending',
      branchId: user?.branchId || 'br-b1',
      createdAt: new Date().toISOString(),
    }),
    patch: { status: 'done' },
    verify: (row) => row.status === 'done',
  },
];

function recipeFor(path) {
  const clean = String(path || '').split('?')[0];
  return CRUD_RECIPES.find((recipe) => recipe.resource.test(clean)) || null;
}

function readText(relative) {
  try { return readFileSync(`${REPO_ROOT}${relative}`, 'utf8'); } catch { return null; }
}

/** 路由源码全文（缓存一次；C4 用来证明写口路径真实存在） */
let ROUTES_TEXT = null;
function routesText() {
  if (ROUTES_TEXT !== null) return ROUTES_TEXT;
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.js')) files.push(full);
    }
  };
  try { walk(join(REPO_ROOT, 'server', 'routes')); } catch { /* 目录缺失时按空处理 */ }
  ROUTES_TEXT = files.map((file) => readFileSync(file, 'utf8')).join('\n');
  return ROUTES_TEXT;
}

/** 静态判断 `METHOD /api/v1/...` 是否有落点：通用资源表优先，其余按路由源码字面量核对 */
function endpointExists(method, path) {
  const suffix = String(path || '').replace(/^\/api\/v1/, '');
  const segments = suffix.split('/').filter(Boolean);
  const base = segments[0] || '';
  // 通用资源只注册 `/name` 与 `/name/:id` 两条；更深的子路径必须走语义路由字面量核对。
  if (RESOURCE_TABLES[base] && segments.length <= 2
    && ['GET', 'POST', 'PATCH', 'DELETE'].includes(String(method).toUpperCase())) {
    return true;
  }
  const text = routesText();
  return [`'${suffix}'`, `"${suffix}"`, `\`${suffix}\``].some((literal) => text.includes(literal));
}

async function listRows(ctx, path, token) {
  const res = await httpRequest(ctx.base, path, { token, timeout: ctx.timeout });
  if (!res.ok) return { res, rows: null };
  const json = res.json;
  const rows = Array.isArray(json) ? json : (Array.isArray(json?.rows) ? json.rows : null);
  return { res, rows };
}

/** 列表首行 id 缓存：`base::role::resource → id`（同一轮审计只取一次） */
const FIRST_ID_CACHE = new Map();

async function firstRowId(ctx, resource, session) {
  const cacheKey = `${ctx.base}::${ctx.role}::${resource}`;
  if (FIRST_ID_CACHE.has(cacheKey)) return FIRST_ID_CACHE.get(cacheKey);
  const { rows } = await listRows(ctx, listPathOf(resource), session.token);
  const id = rows?.find((row) => row && row.id != null)?.id ?? null;
  FIRST_ID_CACHE.set(cacheKey, id);
  return id;
}

/**
 * 把写口路径的 `:id` 绑定到真实记录：
 * `fixed:` 直取；`created:` 用 C2 创建出的 id（无则回读列表首行）；`read:` 取列表首行。
 */
async function resolveWritePath(ctx, entry, write, session, createdIds = null) {
  if (!String(write.path).includes(':')) return concretePath(write.path);
  const spec = inferIdSpec(entry, write);
  let id = null;
  if (spec && spec.startsWith('fixed:')) id = spec.slice(6);
  else if (spec && spec.startsWith('created:')) id = createdIds?.get(spec.slice(8)) || null;
  // 本资源刚创建出的探针行优先（即使推断为 read：也用它，保证 PATCH/DELETE 命中同一行）。
  const resource = resourceOf(write);
  if (!id && createdIds && resource && createdIds.has(resource)) id = createdIds.get(resource);
  if (!id && spec && (spec.startsWith('read:') || spec.startsWith('created:'))) {
    id = await firstRowId(ctx, spec.slice(spec.indexOf(':') + 1), session);
  }
  return concretePath(write.path, { id });
}

/** C1：读口按角色 200 + visitor 越权探针 */
async function runC1(ctx, entry) {
  const findings = [];
  let session;
  let visitor;
  try {
    session = await ensureSession(ctx, ctx.role);
    visitor = await ensureSession(ctx, 'visitor');
  } catch (error) {
    findings.push(finding(ctx, 'C1', 'P0', 'fail', '无法取得登录会话', { error: String(error.message || error) }));
    return findings;
  }

  // 读口
  for (const item of entry.read || []) {
    const match = /^(GET|POST|PATCH|DELETE)\s+(\S+)$/.exec(String(item).trim());
    if (!match) continue;
    const res = await httpRequest(ctx.base, match[2], { method: match[1], token: session.token, timeout: ctx.timeout });
    if (!res.ok) {
      findings.push(finding(ctx, 'C1', 'P0', 'fail', `读口 ${item} 返回 ${res.status}`, { read: item, status: res.status }));
    }
  }

  // 写口越权：visitor 只发一次最小请求（空体；只判「门是否在身份层挡住」）
  for (const write of entry.write || []) {
    const path = await resolveWritePath(ctx, entry, write, session);
    const res = await httpRequest(ctx.base, path, {
      method: write.method,
      token: visitor.token,
      body: write.method === 'GET' ? undefined : {},
      timeout: ctx.timeout,
    });
    if (res.ok) {
      if (write.selfService) {
        findings.push(finding(
          ctx,
          'C1',
          null,
          'pass',
          `写口 ${write.method} ${write.path} 对 visitor 为设计内自助写（2xx）`,
          { write: write.flow, status: res.status, path, selfService: true, note: '若该口不应允许成员自助，请移除 selfService 并升 P0' },
        ));
      } else if (write.gate === 'requireAuth') {
        // 口径冲突裁决（批次 526）：本轮明确「不改后端权限门」；通用写口仅登录是
        // ENGINEERING_ASSESSMENT「安全与权限」已登记的**系统性阻断风险**，不在逐页签审计里
        // 当作新 P0 —— 记 exception 并回链，避免 45 页签重复报同一系统性问题。
        findings.push(finding(
          ctx,
          'C1',
          null,
          'exception',
          `已知系统性风险：${write.method} ${write.path} 仅 requireAuth，visitor 可写（见 ENGINEERING_ASSESSMENT 阻断风险 2）`,
          { write: write.flow, status: res.status, path, knownGap: 'requireAuth-only', body: res.text?.slice(0, 200) },
        ));
      } else {
        findings.push(finding(
          ctx,
          'C1',
          'P0',
          'fail',
          `越权：visitor 可写 ${write.method} ${write.path}`,
          { write: write.flow, status: res.status, path, body: res.text?.slice(0, 300) },
        ));
      }
    } else if ([401, 403].includes(res.status)) {
      findings.push(finding(ctx, 'C1', null, 'pass', `写口按权限拒绝 visitor：${write.method} ${write.path}`, { write: write.flow, status: res.status, path }));
    } else if (res.status === 404) {
      // 404 可能是「路由不存在」也可能是「靶行不存在」；端点存在性交给 C4 静态核对，不误报 P0/P1。
      findings.push(finding(
        ctx, 'C1', null, 'skip',
        `写口探针 404（靶行或路径未命中，待 C4 静态核对）：${write.method} ${write.path}`,
        { write: write.flow, status: res.status, path, body: res.text?.slice(0, 200) },
      ));
    } else if (res.status === 405) {
      findings.push(finding(ctx, 'C1', 'P1', 'fail', `写口方法不被允许：${write.method} ${write.path}`, { write: write.flow, status: res.status, path }));
    } else if (res.status >= 500) {
      findings.push(finding(ctx, 'C1', 'P1', 'fail', `写口探针 5xx：${write.method} ${write.path}`, { write: write.flow, status: res.status, path }));
    } else {
      // 400 / 422：空体被参数校验拦下，不能作为「权限门通过」的证据 ⇒ 记 skip。
      findings.push(finding(
        ctx,
        'C1',
        null,
        'skip',
        `写口先被参数校验拦下（空体 ${res.status}），未证明权限门：${write.method} ${write.path}`,
        { write: write.flow, status: res.status, path, body: res.text?.slice(0, 200) },
      ));
    }
  }
  return findings;
}

/** C2：内存库真实往返 */
async function runC2(ctx, entry) {
  if (ctx.dbMode !== 'memory') {
    return [finding(ctx, 'C2', null, 'skip', 'shared-db 不写入（CRUD 在共享演示库一律跳过）', { dbMode: ctx.dbMode || 'unknown', reason: 'shared-db' })];
  }
  const findings = [];
  let session;
  try {
    session = await ensureSession(ctx, ctx.role);
  } catch (error) {
    return [finding(ctx, 'C2', 'P0', 'fail', '无法取得登录会话', { error: String(error.message || error) })];
  }
  const destructiveFlows = new Set((entry.destructive || []).map((item) => item.flow));
  const reasonOf = new Map((entry.destructive || []).map((item) => [item.flow, item.reason]));
  const done = new Set();
  const reportedDestructive = new Set();
  /** 本次往返创建出的 id：resource → id（供后续 PATCH / DELETE 与语义子路径复用） */
  const createdIds = new Map();

  for (const write of entry.write || []) {
    // 真死入口（页面可见动作落到必然被拒的端点）：不换角色绕门，直接 P0，留待修页面/门。
    if (write.deadEntry) {
      findings.push(finding(
        ctx, 'C2', 'P0', 'fail',
        `死入口：写动作落到必然被拒的端点 ${write.method} ${write.path}（门：${write.gate}）`,
        {
          write: write.flow,
          endpoint: `${write.method} ${write.path}`,
          gate: write.gate,
          reason: write.reason || 'dead-entry',
          note: '审计不换角色绕门；由 Wave 3 修页面动作或权限门',
        },
      ));
      continue;
    }
    const isDestructive = write.destructive === true || destructiveFlows.has(write.flow);
    const recipe = recipeFor(write.path);
    if (!recipe) {
      if (isDestructive) {
        if (!reportedDestructive.has(write.flow)) {
          reportedDestructive.add(write.flow);
          findings.push(finding(
            ctx, 'C2', null, 'exception',
            `destructive 流程未真删（无 CRUD 配方）：${write.flow}`,
            { write: write.flow, reason: write.reason || reasonOf.get(write.flow) || '未登记理由' },
          ));
        }
      } else {
        findings.push(finding(ctx, 'C2', null, 'skip', `无最小合法请求体配方，待人工补充：${write.method} ${write.path}`, { write: write.flow, reason: 'no-recipe' }));
      }
      continue;
    }
    if (done.has(recipe.id)) {
      if (isDestructive) {
        if (!reportedDestructive.has(write.flow)) {
          reportedDestructive.add(write.flow);
          findings.push(finding(
            ctx, 'C2', null, 'exception',
            `destructive 流程只清理本次探针，不触碰存量：${write.flow}`,
            { write: write.flow, recipe: recipe.id, reason: write.reason || reasonOf.get(write.flow) || '未登记理由' },
          ));
        }
      } else {
        findings.push(finding(ctx, 'C2', null, 'skip', `同一资源已在首条写口中完成完整往返：${write.path}`, { write: write.flow, recipe: recipe.id, reason: 'covered-by-recipe' }));
      }
      continue;
    }
    done.add(recipe.id);

    // 同一资源的写口（POST / PATCH / DELETE）由本资源的一次往返统一覆盖。
    const resourceWrites = (entry.write || []).filter((item) => recipe.resource.test(item.path));
    const resourceDestructive = resourceWrites.find((item) => (item.destructive === true || destructiveFlows.has(item.flow)));
    const patchWrite = resourceWrites.find((item) => item.method === 'PATCH');
    const deleteWrite = resourceWrites.find((item) => item.method === 'DELETE');
    const steps = [];
    let id = null;
    let fatal = null;
    try {
      // 创建探针：始终用资源根路径（`POST /api/v1/<resource>`），不拿 `/:id` 当创建口。
      const body = recipe.create(ctx, session.user);
      const created = await httpRequest(ctx.base, recipe.list, {
        method: 'POST', token: session.token, body, timeout: ctx.timeout,
      });
      steps.push({ step: 'create', status: created.status, endpoint: `POST ${recipe.list}` });
      if (!created.ok) {
        if ([401, 403].includes(created.status)) {
          // 当前角色无权创建探针（页面可能只暴露 PATCH / DELETE）⇒ 不伪绿、也不误报 P0。
          findings.push(finding(
            ctx, 'C2', null, 'skip',
            `无法创建 CRUD 探针（${ctx.role} 对 POST ${recipe.list} 返回 ${created.status}），未做真实往返`,
            { recipe: recipe.id, steps, reason: 'create-forbidden', body: created.text?.slice(0, 200) },
          ));
          continue;
        }
        fatal = `create ${created.status} ${created.text?.slice(0, 200)}`;
        throw new Error(fatal);
      }
      id = created.json?.id || body.id;
      if (!id) { fatal = 'create 未返回 id'; throw new Error(fatal); }
      createdIds.set(recipe.id, id);
      const resource = resourceOf(write) || recipe.id;
      createdIds.set(resource, id);

      const read1 = await listRows(ctx, recipe.list, session.token);
      steps.push({ step: 'read-after-create', status: read1.res.status, found: !!read1.rows?.some((row) => String(row.id) === String(id)) });
      if (!read1.rows?.some((row) => String(row.id) === String(id))) { fatal = 'create 后 GET 不到该行'; throw new Error(fatal); }

      if (!patchWrite) {
        steps.push({ step: 'patch', status: 'skip:no-update' });
      } else {
        const patchPath = await resolveWritePath(ctx, entry, patchWrite, session, createdIds);
        const patched = await httpRequest(ctx.base, patchPath, {
          method: 'PATCH', token: session.token, body: recipe.patch, timeout: ctx.timeout,
        });
        steps.push({ step: 'patch', status: patched.status, endpoint: `PATCH ${patchWrite.path}` });
        if ([401, 403].includes(patched.status)) {
          // 该写口对页面角色本就是权限内不可用（前端按角色隐藏）⇒ 记 skip，权限面由 C1/C4 覆盖。
          steps.push({ step: 'cleanup-delete-pending', status: 'skipped' });
          findings.push(finding(
            ctx, 'C2', null, 'skip',
            `探针已创建，但 PATCH ${patchWrite.path} 对 ${ctx.role} 返回 ${patched.status}（页面对该角色不开放）`,
            { recipe: recipe.id, steps, reason: 'update-forbidden', path: patchPath },
          ));
          // 清理探针后结束本资源
          const cleanup = await httpRequest(ctx.base, `${recipe.list}/${encodeURIComponent(id)}`, {
            method: 'DELETE', token: session.token, timeout: ctx.timeout,
          });
          steps.push({ step: 'cleanup-delete', status: cleanup.status });
          id = null;
          continue;
        }
        if (!patched.ok) { fatal = `patch ${patched.status} ${patched.text?.slice(0, 200)}`; throw new Error(fatal); }

        const read2 = await listRows(ctx, recipe.list, session.token);
        const after = read2.rows?.find((row) => String(row.id) === String(id));
        steps.push({ step: 'read-after-patch', status: read2.res.status, verified: !!after && recipe.verify(after) });
        if (!after || !recipe.verify(after)) { fatal = 'PATCH 后回读校验失败'; throw new Error(fatal); }
      }

      // destructive 资源：DELETE 只用于清理本次探针，不删除任何存量行
      const deletePath = deleteWrite
        ? await resolveWritePath(ctx, entry, deleteWrite, session, createdIds)
        : `${recipe.list}/${encodeURIComponent(id)}`;
      const deleted = await httpRequest(ctx.base, deletePath, {
        method: 'DELETE', token: session.token, timeout: ctx.timeout,
      });
      if (!(deleted.ok || deleted.status === 204) && !deleteWrite) {
        // 本页没有 DELETE 写口时，清理失败属探针清理限制，不是页面断链 ⇒ skip，不误报 P0。
        steps.push({ step: 'delete', status: deleted.status, endpoint: `DELETE ${recipe.list}/:id` });
        findings.push(finding(
          ctx, 'C2', null, 'skip',
          `探针往返（create→read→patch→read）通过，但本页无 DELETE 写口，清理被拒 ${deleted.status}（${recipe.id}）`,
          { recipe: recipe.id, steps, reason: 'cleanup-forbidden' },
        ));
        continue;
      }
      steps.push({ step: resourceDestructive ? 'delete-probe' : 'delete', status: deleted.status, endpoint: `DELETE ${deleteWrite ? deleteWrite.path : `${recipe.list}/:id`}` });
      if (!(deleted.ok || deleted.status === 204)) { fatal = `delete ${deleted.status}`; throw new Error(fatal); }
      id = null;

      const read3 = await listRows(ctx, recipe.list, session.token);
      const still = !!read3.rows?.some((row) => String(row.id) === String(created.json?.id));
      steps.push({ step: 'read-after-delete', status: read3.res.status, absent: !still });
      if (still) { fatal = 'DELETE 后仍能 GET 到该行'; throw new Error(fatal); }

      findings.push(finding(
        ctx, 'C2', null, 'pass',
        `CRUD 往返通过（${recipe.id}）：create→read${patchWrite ? '→patch→read' : ''}→${resourceDestructive ? 'delete-probe' : 'delete'}`,
        { recipe: recipe.id, endpoint: recipe.list, destructiveProbeOnly: !!resourceDestructive, steps },
      ));
      if (resourceDestructive && !reportedDestructive.has(resourceDestructive.flow)) {
        reportedDestructive.add(resourceDestructive.flow);
        findings.push(finding(
          ctx, 'C2', null, 'exception',
          `destructive 流程未对存量执行：${resourceDestructive.flow}（仅清理本次探针行）`,
          {
            write: resourceDestructive.flow,
            recipe: recipe.id,
            reason: resourceDestructive.reason || reasonOf.get(resourceDestructive.flow) || '未登记理由',
            steps,
          },
        ));
      }
    } catch (error) {
      // 清理：自带探针行绝不留库（destructive 资源也只删本次探针）
      if (id) {
        try {
          const cleanup = await httpRequest(ctx.base, `${recipe.list}/${encodeURIComponent(id)}`, {
            method: 'DELETE', token: session.token, timeout: ctx.timeout,
          });
          steps.push({ step: 'cleanup-delete', status: cleanup.status });
        } catch { /* 忽略清理失败，证据已记 */ }
      }
      findings.push(finding(
        ctx, 'C2', 'P0', 'fail',
        `CRUD 往返失败（${recipe.id}）：${fatal || error.message || error}`,
        { recipe: recipe.id, endpoint: recipe.list, steps },
      ));
    }
  }
  if (!(entry.write || []).length) {
    findings.push(finding(ctx, 'C2', null, 'skip', entry.readOnlyReason || '页签只读，无写口', { reason: 'read-only' }));
  }
  return findings;
}

/** C3：写动作选择器静态核对（只认动作语义的 data-*；其余 data-* 仅作证据） */
function runC3(ctx, entry) {
  if (!entry.source) {
    return [finding(ctx, 'C3', null, 'skip', '未登记页签源码，C3 跳过', { reason: 'no-source' })];
  }
  const source = readText(entry.source);
  if (source == null) {
    return [finding(ctx, 'C3', null, 'skip', `页签源码不可读：${entry.source}`, { reason: 'source-unreadable' })];
  }
  const actionMatches = [...source.matchAll(/data-(action|todo-action|mfw|write-action|flow)=["']([^"']+)["']/g)]
    .map((match) => ({ attr: `data-${match[1]}`, action: match[2] }));
  const dataAttributes = [...new Set([...source.matchAll(/data-([a-z0-9-]+)=/gi)].map((match) => `data-${match[1]}`))].sort();
  if (!actionMatches.length) {
    return [finding(
      ctx, 'C3', null, 'pass',
      '页签无 data-action / data-todo-action / data-mfw 写动作选择器',
      { source: entry.source, dataAttributes, note: '其余 data-* 仅作靶标（data-id / data-group 等），不当作动作语义' },
    )];
  }
  const flows = new Set((entry.write || []).map((write) => write.flow));
  const localReadOnly = new Set(entry.knownReadOnlyActions || []);
  const findings = [];
  for (const { attr, action } of actionMatches) {
    if (KNOWN_READ_ONLY_ACTIONS.has(action) || localReadOnly.has(action)) {
      findings.push(finding(ctx, 'C3', null, 'pass', `只读 UI 动作已登记：${action}`, { action, attr, readOnly: true }));
      continue;
    }
    const mappedFlow = entry.actionMap?.[action];
    if (mappedFlow && flows.has(mappedFlow)) {
      findings.push(finding(ctx, 'C3', null, 'pass', `写动作已映射到写口：${action} → ${mappedFlow}`, { action, attr, flow: mappedFlow }));
      continue;
    }
    findings.push(finding(
      ctx, 'C3', 'P0', 'fail',
      `死入口：${attr}="${action}" 找不到对应 write.flow`,
      { action, attr, flows: [...flows] },
    ));
  }
  return findings;
}

/** C4：每个 write 必须有 gate、gate 可定位、路径真实存在 */
function runC4(ctx, entry) {
  // 门来源：资源写门（gates）、语义路由（semantic-routes）、系统通知 kind 授权表（system-notice-kinds）。
  const gateText = [
    readText(GATES_FILE) || '',
    readText(SEMANTIC_FILE) || '',
    readText(SYSTEM_NOTICE_KINDS_FILE) || '',
  ].join('\n');
  if (!gateText.trim()) {
    return [finding(ctx, 'C4', 'P1', 'fail', '权限门静态源不可读（gates.js / semantic-routes.js / system-notice-kinds.js）', {})];
  }
  const findings = [];
  for (const write of entry.write || []) {
    if (!write.gate) {
      findings.push(finding(ctx, 'C4', 'P1', 'fail', `写口缺 gate：${write.method} ${write.path}`, { write: write.flow }));
      continue;
    }
    if (!gateText.includes(write.gate)) {
      findings.push(finding(
        ctx, 'C4', 'P1', 'fail',
        `gate 在权限门静态源中找不到：${write.gate}`,
        { write: write.flow, endpoint: `${write.method} ${write.path}`, gate: write.gate },
      ));
    }
    if (!endpointExists(write.method, write.path)) {
      findings.push(finding(
        ctx, 'C4', 'P1', 'fail',
        `写口路径在 server/routes 中找不到（疑似编造端点）：${write.method} ${write.path}`,
        { write: write.flow, endpoint: `${write.method} ${write.path}`, reason: 'route-not-found' },
      ));
    }
  }
  if (!findings.length) {
    const gates = [...new Set((entry.write || []).map((write) => write.gate))];
    findings.push(finding(ctx, 'C4', null, 'pass', `写口 gate 与路径全部可定位（${gates.length} 个门）`, {
      gates,
      endpoints: (entry.write || []).map((write) => `${write.method} ${write.path}`),
    }));
  }
  // destructive 必须写理由
  for (const item of entry.destructive || []) {
    if (!item.flow || !item.reason) {
      findings.push(finding(ctx, 'C4', 'P1', 'fail', 'destructive 项缺 flow 或 reason', { item }));
    }
  }
  return findings;
}

/** 主入口 */
export async function runCrudChecks(ctx) {
  const entry = ENDPOINT_MAP[ctx.key];
  if (!entry) {
    return [finding(ctx, 'C0', 'P0', 'fail', `ENDPOINT_MAP 缺少页签 ${ctx.key}`, {})];
  }
  const findings = [];
  findings.push(...await runC1(ctx, entry));
  findings.push(...await runC2(ctx, entry));
  findings.push(...runC3(ctx, entry));
  findings.push(...runC4(ctx, entry));
  return findings;
}
