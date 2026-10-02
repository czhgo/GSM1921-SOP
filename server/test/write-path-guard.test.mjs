/**
 * 写口纪律守卫（2026-10-02 批次 343 · 支书裁「甲 排批直接修」· 决策 `D-744` D 档）
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 背景（为什么需要这条守卫）
 * ─────────────────────────────────────────────────────────────────────────
 * 批次 341 的「全域 CRUD 探查」（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 341 节）查出：
 * 服务端 CRUD 是完整的，但前端有两类**绕过统一写口**的写法——
 *   ① **直连 `fetch`** 打通用资源端点（`/api/v1/<资源名>`），自己拼 URL / 自己带 token，
 *      并就地改内存（`mockDB.*`）**不落 `persist()`**；
 *   ② **伸手改服务层的私有字段**（如 `SignupStore._signups = ...`），绕开店内的写口函数
 *      （而那正是 `bumpToken(<域>)` 唯一被调用的地方 ⇒ **域缓存不失效**，页面拿到旧数据）。
 * 两类都会让「同一份数据有两套写法」，是批次 340 那次「真机全域挂起」的同源病灶。
 *
 * 统一写口（**唯一合法路径**）：
 *   · 读/写业务数据 → `getAdapter().<资源名>.list()/create()/update()/delete()`
 *   · 或经服务层（`services/**`）的写口函数（内部 `mockDB.* = ...` + `bumpToken` + `persist()`）
 *
 * **例外**（本守卫白名单，允许直连 `fetch`）：**语义端点**——它们不是「通用资源 CRUD」，
 *   形状/参数/权限各自不同，没有也不该有适配器四件套。见下方 SEMANTIC_ENDPOINTS。
 *
 * 守护面：`docs/src/**`（**排除** `docs/src/data/**`＝数据层本身）。
 *
 * 用例：W1 通用资源端点不得被直连 · W2 服务层私有字段不得被外部赋值 · W3 白名单不得被掏空。
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESOURCE_TABLES } from '../routes/resources/store.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');

/** 语义端点白名单：**不是**通用资源 CRUD（无适配器四件套）——新增须给理由。
 *  用**正则**而非前缀字符串：`/api/v1/branches` 本身**是**资源名，只有其子路由 `…/config` 才算语义端点。 */
const SEMANTIC_ALLOW = [
  /\/api\/v1\/uploads\b/,                    // multipart 文件上传（FormData，非 JSON 资源）
  /\/api\/v1\/snapshot\b/,                   // 全量快照写穿（并发乐观锁，形状特殊）
  /\/api\/v1\/system-notices\b/,             // 通知派生读口（非 CRUD 资源）
  /\/api\/v1\/agenda-votes\b/,               // 表决 RPC（lock/reveal 等动作式端点）
  /\/api\/v1\/leader\/member-progress\b/,    // 聚合读口
  /\/api\/v1\/auth\//,                       // 认证域（login / iaaa/pending）
  /\/api\/v1\/setup\/setup-status\b/,        // 换组织向导状态
  /\/api\/v1\/issues\/reveal\b/,             // 匿名核查留痕（裁定：仅党委可查）
  /\/api\/v1\/members\b/,                    // 成员语义端点（profile / 支委身份配置）
  /\/api\/v1\/branches\/[^'"`]*\/(config|config\/rollback)\b/, // 支部语义子路由（**不是** branches 资源本身）
  /\/api\/v1\/versions\b/,                   // 集合版本读口
];

/** 注释行（守卫自身与登记性注释里会**引用**违规写法，不应被当成违规） */
const COMMENT_RE = /^\s*(\/\/|\*|\/\*)/;

/**
 * **会话引导期**例外（整文件）：登录页**刻意不引数据层**——它在会话建立前运行，直接读
 * `sessionStorage` 的 token、自建 `Authorization` 头，若为之引入 `getAdapter()` 会把整套
 * 适配器与种子数据拖进登录页。故**只读**允许直连。
 * ⚠ 本清单**只能放这类「会话引导期」页**，且**必须 ≤2 个**（W4 自检）——不得用它给普通业务页开后门。
 */
const PRE_BOOTSTRAP_FILES = new Set([
  '/docs/src/entries/pages/login-entry.js', // 登录页：GET /api/v1/branches（支部清单，只读）
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'data' || name === 'assets') continue; // data/** ＝数据层本身（写口在此）
      walk(full, out);
    } else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const FILES = walk(SRC);
const RES_NAMES = Object.keys(RESOURCE_TABLES);

test('W1 通用资源端点（/api/v1/<资源名>）不得被 docs/src 直连 fetch', () => {
  const bad = [];
  for (const file of FILES) {
    const rel = file.replace(ROOT, '').replace(/\\/g, '/');
    if (PRE_BOOTSTRAP_FILES.has(rel)) continue; // 会话引导期例外（见上方清单与 W4）
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (COMMENT_RE.test(line)) return;
      if (!line.includes('fetch(')) return;
      for (const name of RES_NAMES) {
        if (!line.includes(`/api/v1/${name}`)) continue;
        if (SEMANTIC_ALLOW.some((re) => re.test(line))) continue;
        bad.push(`${file.replace(ROOT, '').replace(/\\/g, '/')}:${i + 1} → /api/v1/${name}`);
      }
    });
  }
  assert.deepEqual(bad, [],
    `通用资源端点必须走 getAdapter().<资源名>.*，不得直连 fetch（批次 343 · D-744 D 档）：\n  ${bad.join('\n  ')}`);
});

test('W2 服务层写口对象的私有字段不得在 services/** 之外被赋值', () => {
  const bad = [];
  for (const file of FILES) {
    const rel = file.replace(ROOT, '').replace(/\\/g, '/');
    if (rel.includes('/docs/src/services/')) continue; // 写口本体在此
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (COMMENT_RE.test(line)) return;
      // 形如 `SignupStore._signups = ...`（伸手改私有字段 ⇒ 绕过 bumpToken/persist 写口）
      if (/\b[A-Z][A-Za-z0-9]*Store\._[A-Za-z0-9_]+\s*=/.test(line)) {
        bad.push(`${rel}:${i + 1} → ${line.trim().slice(0, 100)}`);
      }
    });
  }
  assert.deepEqual(bad, [],
    `不得伸手改服务层私有字段（须新增/复用该店的写口方法）：\n  ${bad.join('\n  ')}`);
});

test('W3 白名单自检：语义端点不得与资源名撞名，且不得被掏空', () => {
  assert.ok(SEMANTIC_ALLOW.length >= 8, '语义端点白名单被掏空 ⇒ 守卫形同虚设');
  for (const re of SEMANTIC_ALLOW) {
    for (const name of RES_NAMES) {
      assert.ok(!re.test(`/api/v1/${name}`),
        `白名单 ${re} 命中了通用资源端点 /api/v1/${name} ⇒ 把资源 CRUD 也放行了，应改窄`);
    }
  }
});

test('W4 会话引导期例外自检：≤2 个文件，且只能只读', () => {
  assert.ok(PRE_BOOTSTRAP_FILES.size <= 2,
    `会话引导期例外不得扩张（>2）⇒ 说明有普通业务页在走后门：${[...PRE_BOOTSTRAP_FILES].join(', ')}`);
  const WRITE_RE = /method:\s*['"](POST|PATCH|PUT|DELETE)['"]/;
  const bad = [];
  for (const rel of PRE_BOOTSTRAP_FILES) {
    const file = join(ROOT, rel.replace(/^\//, ''));
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (COMMENT_RE.test(line)) return;
      if (!RES_NAMES.some((n) => line.includes(`/api/v1/${n}`))) return;
      const win = lines.slice(Math.max(0, i - 3), i + 7).join('\n');
      if (WRITE_RE.test(win)) bad.push(`${rel}:${i + 1} → 引导期页面对资源端点发了写请求`);
    });
  }
  assert.deepEqual(bad, [],
    `会话引导期例外**只允许只读**：\n  ${bad.join('\n  ')}`);
});
