// role: [工程师]+[AI]
// module-load.test.mjs — 模块加载完整性审计（原 edit-integrity-audit.mjs，T-283 支书指令：共性问题全局化）
// 背景判例（2026-08-27）：多轮 Edit 反复增删同一文件时出现系统性损坏——
//   ①同作用域重复声明（agendaList ×2 → SyntaxError）
//   ②函数被误删仍被调用（_addAgendaRow → ReferenceError）
//   ③绑定代码被误删（inspector 议程编辑按钮绑定丢失 → 点击无效）
//   ④声明被误删仍被引用（agenda → ReferenceError）
// 机制：浏览器内 import 全部 docs/src 模块，任何语法/重复声明/未定义顶层引用都会在 import 时抛错
// 运行：node --test server/test/module-load.test.mjs（自包含 server）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let BASE;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

// 收集 docs/src 全部 .js 的相对路径（排除 entries/* 顶层入口——由页面装配时加载）
function collectJsFiles(dir, root) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'entries' && dir === root) continue;
      out.push(...collectJsFiles(p, root));
    } else if (e.name.endsWith('.js')) {
      out.push(relative(root, p).replace(/\\/g, '/'));
    }
  }
  return out;
}

test('E1 编辑完整性：docs/src 全部模块可加载（无语法/重复声明/未定义引用/误删调用）', async () => {
  const root = fileURLToPath(new URL('../../docs/src/', import.meta.url));
  const files = collectJsFiles(root, root);
  assert.ok(files.length > 50, `应收集到 50+ 模块，实际 ${files.length}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 10000 });

    const { failed, total } = await page.evaluate(async (mods) => {
      const failures = [];
      let done = 0;
      for (const rel of mods) {
        try {
          await import(`/src/${rel}?v=20260928n`);
        } catch (e) {
          failures.push(`${rel} :: ${String(e).slice(0, 140)}`);
        }
        done++;
      }
      return { failed: failures, total: done };
    }, files);

    console.log(`[E1] 模块加载: ${total - failed.length}/${total} 通过`);
    if (failed.length > 0) {
      console.log('[E1] 无法加载的模块：');
      failed.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    assert.equal(failed.length, 0, `编辑完整性失败 ${failed.length} 项:\n${failed.join('\n')}`);
  } finally {
    await browser.close();
  }
});

// ── E2 独立页数据源装配断言（2026-09-19 批次 93 · `SOP-B-44` 方案 A）────────────
// 病灶（`D-485` / `D-486`，批次 87 普查）：`docs/*.html` 独立页漏注册数据源 ⇒ **api 形态下静默退回本地**
//   （种子能开、服务端新数据打不开，写只落本机）。**已有守卫为何没拦住**：E1（本文件）收集模块时
//   **显式排除 `docs/src/entries/**`**（见上方 collectJsFiles）；`page-sweep` **只进 7 个工作台、不进独立页**。
// 判据（静态装配断言 · 方案 A）：每个**顶层** `docs/*.html` 所引入口，其源码须命中「装配形」之一——
//   **形甲（自装配）**：`registerApiAdapter` 且 `init(`（`D-485` 标准形）；
//     ⚠ 标准形里 `init` 常按 `init as dataInit` 引入（`archive/feedback/notice/...` 皆是）⇒ 判据同时认
//     `dataInit(` 与裸 `init(` 两种写法（**只认这两个装配名，认 `xxx.init()` 会把无关调用放进来**）。
//   **形乙（经共享入口装配）**：`bootstrapPage(`（`core/bootstrap.js` 内即 `registerApiAdapter` + `init`，
//     首页 `main-entry.js` 走这一形）。
//   **形丙（经 P0-2 收敛入口装配，2026-09-23 新增）**：`hydrateDataSource(`（`core/data-adapter.js` 的
//     P0-2 唯一收敛点：内部 `registerApiAdapter` + `setDataSource('api')` + `init()`，且**有 token 时
//     init 失败即显式失败、不再静默回落 mock**）。11 个独立页由「形甲手写复制」改为调它一处——
//     **判据不弱化**：这一形比形甲更强（装配 + 失败即失败 + 形态可断言 `getRuntimeMode`）。
// 白名单（免检；**逐条写明理由**）：`about.html`（纯说明页，不读业务数据）· `help.html`（纯说明页）·
//   `login.html`（登录页，登录前无支部数据可装配）。
// ⚠ 本项只加这一条静态断言；**未扩 `page-sweep`、未把 `entries/**` 纳入 E1**（那属方案 B / C）。
test('E2 独立页数据源装配断言：每个 docs/*.html 的入口必须装配数据源（白名单 about/help/login）', () => {
  const docsDir = fileURLToPath(new URL('../../docs/', import.meta.url));
  const WHITELIST = new Set(['about.html', 'help.html', 'login.html']);
  const pages = readdirSync(docsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => e.name)
    .sort();
  assert.ok(pages.length > 8, `顶层独立页应不少于 9 个，实测 ${pages.length}`);

  const problems = [];
  const checked = [];
  for (const page of pages) {
    if (WHITELIST.has(page)) continue;
    const html = readFileSync(join(docsDir, page), 'utf8');
    const m = /<script type="module" src="\.\/src\/entries\/([\w-]+\.js)/.exec(html);
    if (!m) { problems.push(`${page} 未找到 entries 入口脚本`); continue; }
    const entry = m[1];
    const src = readFileSync(join(docsDir, 'src', 'entries', entry), 'utf8');
    const selfHydrate = /registerApiAdapter\s*\(/.test(src) && /(?:dataInit|\binit)\s*\(/.test(src);
    const viaBootstrap = /bootstrapPage\s*\(/.test(src);
    // 形丙（P0-2 收敛入口）：hydrateDataSource 内部即「注册适配器 + 切 api 数据源 + init()」，
    // 且失败即显式失败（不静默回落 mock）——比形甲更强，故与形甲/形乙并列受理。
    const viaHydrate = /\bhydrateDataSource\s*\(/.test(src);
    if (!selfHydrate && !viaBootstrap && !viaHydrate) {
      problems.push(`${page} → ${entry}：既未自装配（registerApiAdapter + init），也未经 core/bootstrap.js 装配（bootstrapPage），也未走 P0-2 收敛入口（hydrateDataSource）`);
      continue;
    }
    checked.push(`${page}(${selfHydrate ? '自装配' : viaBootstrap ? '经 bootstrap' : '经 hydrateDataSource'})`);
  }
  console.log(`[E2] 独立页装配：受检 ${checked.length} 页 / 白名单 ${WHITELIST.size} 页 → ${checked.join(' ')}`);
  assert.deepEqual(problems, [], `独立页数据源装配缺失（api 形态下会静默退回本地）：\n${problems.join('\n')}`);
});

// ════════════════════════════════════════════════════════════════
//  E3 分层方向（G1 第③项，2026-09-28）：**服务层不产 UI**
// ════════════════════════════════════════════════════════════════
//  病灶（实测）：`services/governance/issues.js` 尾部住着「我的处置」整套渲染（470+ 行）、
//  `services/governance/notice.js` 尾部住着通知列表 / 浮窗 / 发布口（230+ 行）——服务层因此
//  import 了组件（list-filter / badges / modal），依赖方向反了（服务 → 组件）。
//  做法：把 UI 段**整块搬**到 `components/**`（逐字搬迁、零行为变化），服务层只留数据与口径；
//  组件反向 import 服务层（方向正确）。本守卫静态扫描防回潮：服务层出现 `from '...components/...'` 即红。
test('E3 分层方向：服务层不得 import 组件（服务层不产 UI；组件 → 服务 才对）', () => {
  const root = fileURLToPath(new URL('../../docs/src/', import.meta.url));
  const offenders = [];
  for (const rel of collectJsFiles(join(root, 'services'), root)) {
    const src = readFileSync(join(root, rel), 'utf8');
    // 只看 import/export 语句（注释里提到组件路径做说明不算越界）
    if (/from\s+['"][^'"]*components\//.test(src)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [],
    '服务层不得 import 组件（分层方向：组件 → 服务，反向即越界）。'
    + `以下文件越界：\n  ${offenders.join('\n  ')}\n`
    + '修法：把 UI 渲染**整块搬**到 components/**（逐字搬迁、零行为变化），服务层只留数据与单一源口径。');
});
