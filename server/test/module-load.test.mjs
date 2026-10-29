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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { MOCK_ACCOUNTS } from '../../docs/src/data/mock/accounts.js?v=20261029b';
import { parseFiles } from './lib/esm-parse.mjs';

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
          await import(`/src/${rel}?v=20261029b`);
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
//   **形乙（经共享入口装配）**：`bootstrapPage(`（`core/boot/bootstrap.js` 内即 `registerApiAdapter` + `init`，
//     首页 `main-entry.js` 走这一形）。
//   **形丙（经 P0-2 收敛入口装配，2026-09-23 新增）**：`hydrateDataSource(`（`data/data-adapter.js` 的
//     P0-2 唯一收敛点：内部 `registerApiAdapter` + `setDataSource('api')` + `init()`，且**有 token 时
//     init 失败即显式失败、不再静默回落 mock**）。11 个独立页由「形甲手写复制」改为调它一处——
//     **判据不弱化**：这一形比形甲更强（装配 + 失败即失败 + 形态可断言 `getRuntimeMode`）。
// 白名单（免检；**逐条写明理由**）：`about.html`（纯说明页，不读业务数据）· `help.html`（纯说明页）·
//   `login.html`（登录页，登录前无支部数据可装配）。
// ⚠ 本项（`E2`）只加这一条**静态**断言；**未扩 `page-sweep`、未把 `entries/**` 纳入 E1**。
//   「运行时真装配」那一半已于 2026-09-28 批次 241 由 **`E4`**（真机装配断言）补上——收 `H-3`。
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
    // 2026-09-28（G2 残余）：入口按判据分入 `entries/workspace/`（7 个工作台壳）与
    //   `entries/pages/`（15 个独立页）；`tabs/` 早已按台分组。此处两处都受理。
    const m = /<script type="module" src="\.\/src\/entries\/(pages|workspace)\/([\w-]+\.js)/.exec(html);
    if (!m) { problems.push(`${page} 未找到 entries 入口脚本`); continue; }
    const entryDir = m[1];
    const entry = m[2];
    const src = readFileSync(join(docsDir, 'src', 'entries', entryDir, entry), 'utf8');
    const selfHydrate = /registerApiAdapter\s*\(/.test(src) && /(?:dataInit|\binit)\s*\(/.test(src);
    const viaBootstrap = /bootstrapPage\s*\(/.test(src);
    // 形丙（P0-2 收敛入口）：hydrateDataSource 内部即「注册适配器 + 切 api 数据源 + init()」，
    // 且失败即显式失败（不静默回落 mock）——比形甲更强，故与形甲/形乙并列受理。
    const viaHydrate = /\bhydrateDataSource\s*\(/.test(src);
    if (!selfHydrate && !viaBootstrap && !viaHydrate) {
      problems.push(`${page} → ${entry}：既未自装配（registerApiAdapter + init），也未经 core/boot/bootstrap.js 装配（bootstrapPage），也未走 P0-2 收敛入口（hydrateDataSource）`);
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

// ════════════════════════════════════════════════════════════════
//  E4 真机装配断言（2026-09-28 批次 241 · 收 `H-3` / `SOP-B-44` 方案 C）
// ════════════════════════════════════════════════════════════════
//  缺口（E2 自己写明的）：E2 是**静态**断言——只看「页入口源码里有没有『装配形』」。
//    「源码里有装配调用」≠「**运行时真装配成功**」：入口可能装配到一半就抛（模块 404 / 版本戳不一致
//    导致模块实例分裂 / `hydrateDataSource` 早退），这时页面会**静默退回 mock**——种子数据看着正常，
//    服务端新数据打不开、写只落本机。这一维此前**没有任何守卫**。
//  本项做的是**真机（真实浏览器）**断言：真登录（拿真 token）→ 真开 3 类角色的工作台页 →
//    读**运行时写下的装配标记** `document.documentElement.dataset.dataSource` ⇔ 必须 === 'api'。
//  为什么读 DOM 标记而不是在页里 import 模块调 `getDataSource()`：本模块的取值住在模块实例内部，
//    守卫另用一条 URL import 会拿到**另一个实例**（默认 'mock'）⇒ 假红。标记写在
//    `data/data-adapter.js::setDataSource`（**唯一漏斗**，mock/api 两条分支都写），跨实例可读。
//  ⚠ 非空转（本项的承重反证）：标记必须是**运行时写的**，不是 HTML 里的静态属性——
//    故同时断言 `about.html` 的 HTML 源里没有静态 `data-source`，且该页实测标记 ≠ 'api'。
test('E4 真机装配：登录后 3 类角色的工作台页在真实浏览器里真的装配成 api', async () => {
  // 抽样取自 `docs/src/data/mock/accounts.js`（单一源）——personId 写在这里但**须真实存在**，否则红
  const SAMPLES = [
    { label: '支书台', page: '/workspace/secretary.html', personId: '2300010001' },
    { label: '纪检台', page: '/workspace/disc.html', personId: '2400012354' },
    { label: '组长台', page: '/workspace/leader.html', personId: '2400012345' },
  ];
  for (const s of SAMPLES) {
    assert.ok(MOCK_ACCOUNTS.some((a) => a.personId === s.personId),
      `抽样的 personId ${s.personId}（${s.label}）不在 data/mock/accounts.js 里——账号表已变，请同步本抽样`);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    // ① 真登录（走 HTTP，不经 UI——免得把 E4 变成「登录流程」测试）
    const login = async (personId) => {
      const acc = MOCK_ACCOUNTS.find((a) => a.personId === personId);
      const res = await fetch(`${BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ personId, password: acc.password }),
      });
      assert.equal(res.status, 200, `${personId} 真登录须成功（服务端已 seed 演示账号）`);
      const body = await res.json();
      assert.ok(body.token, `${personId} 登录须返回 token`);
      return body.token;
    };

    // ② 抽 3 页（三类角色各一，防「只有某台装了」这类漏网）
    for (const s of SAMPLES) {
      const token = await login(s.personId);
      const page = await browser.newPage();
      await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort()); // 离线：与 E1 同口径
      await page.addInitScript((t) => {
        try { sessionStorage.setItem('gsm1921-api-token', t); } catch (_) { /* 隐私模式 */ }
      }, token);
      await page.goto(`${BASE}${s.page}`, { waitUntil: 'domcontentloaded' });
      let mark = null;
      try {
        await page.waitForFunction(() => document.documentElement.dataset.dataSource, null, { timeout: 20000 });
        mark = await page.evaluate(() => document.documentElement.dataset.dataSource);
      } catch (_) {
        mark = await page.evaluate(() => document.documentElement.dataset.dataSource ?? '(未写入)');
      }
      assert.equal(mark, 'api',
        `${s.label}（${s.page}，${s.personId}）运行时数据源应为 api，实测 ${mark}`
        + `——入口「源码里有装配调用」不等于「运行时真装配成功」；出现 mock/未写入即页面静默退回了本地`);
      await page.close();
    }

    // ③ 非空转（承重反证）：标记是运行时写的，不是 HTML 静态属性
    const docsDir = fileURLToPath(new URL('../../docs/', import.meta.url));
    const aboutHtml = readFileSync(join(docsDir, 'about.html'), 'utf8');
    assert.ok(!/data-source\s*=\s*["']api/i.test(aboutHtml),
      'about.html 里不该有静态的 data-source="api"（否则本断言只是读了个写死的属性，恒真）');
    const p = await browser.newPage();
    await p.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await p.goto(`${BASE}/about.html`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    const aboutMark = await p.evaluate(() => document.documentElement.dataset.dataSource ?? null);
    assert.notEqual(aboutMark, 'api',
      `免装配白名单页 about.html 实测标记为 ${aboutMark}——若它也成了 api，说明标记与「该页装配没装配」无关`);
    await p.close();
  } finally {
    await browser.close();
  }
});

// ════════════════════════════════════════════════════════════════
//  E5 工作台能力表页签模块完整性（2026-10-29）
// ════════════════════════════════════════════════════════════════
//  病灶：`secretary/todo-tab.js` 与 `visitor/inspection-tab.js` 的 import 落进函数体，
//    浏览器 ESM 解析直接 SyntaxError ⇒ 页签恒显错误卡。而既有判据恰好都绕开：
//    E1 收集模块时**显式排除 `entries/**`**；`import-path-guard` 只查「路径是否存在」。
//  判据（逐条）：
//    ① 能力表里 `import('../entries/tabs/…')` / `loadTabModule('…')` 的路径必须解析到真实文件；
//    ② 该文件必须通过真正的 ESM 解析（复用 `lib/esm-parse.mjs`，一次子进程遍历全部文件）；
//    ③ 注册表实际调用的导出名（如 `.then(m => m.renderContent(ctx))` 的 `renderContent`）必须真被导出。
//  精度边界（③）：用**导出声明扫描**，认 `export function/const/let/var/class`（含
//    `export const { renderContent } = …` 这类解构导出）与 `export { … }`；
//    不解析 `export * from` / 默认导出 / 字符串或注释里的伪声明，也不展开「定义后改名再导出」的复杂别名。
//    当前页签模块均为直接导出或解构导出，够用；若将来出现 re-export 形态的页签模块，须扩本判据（否则会误红）。
//  非空转：页签模块数 ≥ 40（防能力表解析失败导致所有断言恒真）。
function exportedNamesOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\bexport\s+class\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  // `export const { renderContent, other } = …`（todo-tab 的共享壳写法）
  for (const m of src.matchAll(/\bexport\s+(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const renamed = /^[A-Za-z_$][\w$]*\s*:\s*([A-Za-z_$][\w$]*)$/.exec(seg);
      names.add(renamed ? renamed[1] : seg.split(/\s+/)[0]);
    }
  }
  for (const m of src.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim();
      if (!seg) continue;
      const as = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(seg);
      names.add(as ? as[1] : seg.split(/\s+/)[0]);
    }
  }
  return names;
}

test('E5 工作台能力表页签模块：路径真实 / ESM 可解析 / 调用的导出名确实存在', () => {
  const docsDir = fileURLToPath(new URL('../../docs/', import.meta.url));
  const capDir = join(docsDir, 'src', 'capabilities');
  const capFiles = readdirSync(capDir).filter((n) => n.endsWith('-workspace.js')).sort();
  assert.ok(capFiles.length >= 7, `工作台能力表应不少于 7 个，实测 ${capFiles.length}`);

  // 兼容两种写法：改造前的直接 `import('…')` 与改造后的 `loadTabModule('…')`
  const MODULE_RE = /(?:import|loadTabModule)\(\s*'([^']*\/entries\/tabs\/[^']+)'\s*\)/g;
  const entries = [];
  const seen = new Set();
  for (const cap of capFiles) {
    const capPath = join(capDir, cap);
    const src = readFileSync(capPath, 'utf8');
    for (const m of src.matchAll(MODULE_RE)) {
      const spec = m[1];
      const target = resolve(dirname(capPath), spec.split('?')[0]);
      // 注册表实际调用名：`loadTabModule(spec).then(m => m.<name>(…))` 里的首个 `m.<name>`。
      const rest = src.slice(m.index + m[0].length);
      const thenAt = rest.indexOf('.then(');
      const tail = thenAt >= 0 ? rest.slice(thenAt, thenAt + 800) : '';
      const hit = /\bm\.([A-Za-z_$][\w$]*)/.exec(tail);
      const exportName = hit ? hit[1] : null;
      const key = `${target}::${exportName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ cap, spec, target, exportName });
    }
  }

  const uniqueTargets = [...new Set(entries.map((e) => e.target))];
  assert.ok(uniqueTargets.length >= 40,
    `只解析到 ${uniqueTargets.length} 个页签模块（下限 40）——能力表结构变了或正则失效，本项会变成恒真`);

  // ① 路径存在（必须是文件，不能是目录）
  const missing = entries.filter((e) => !existsSync(e.target) || statSync(e.target).isDirectory());
  assert.deepEqual(missing.map((e) => `${e.cap} → ${e.spec}`), [],
    `能力表指向的页签模块不存在：\n  ${missing.map((e) => `${e.cap} → ${e.spec}`).join('\n  ')}`);

  // ② 真正的 ESM 解析（一次子进程遍历全部）
  const { failures } = parseFiles(uniqueTargets);
  assert.deepEqual(
    failures.map((f) => `${relative(docsDir, f.file).replace(/\\/g, '/')} :: ${f.name}: ${f.message}`),
    [],
    '能力表里的页签模块无法被 ESM 解析（浏览器里整模块失败 ⇒ 该页签恒定报错）',
  );

  // ③ 注册表调用的导出名确实被该文件导出
  const noExport = [];
  for (const e of entries) {
    if (!e.exportName) {
      noExport.push(`${e.cap} → ${e.spec}：未能解析出注册表调用的导出名`);
      continue;
    }
    const names = exportedNamesOf(readFileSync(e.target, 'utf8'));
    if (!names.has(e.exportName)) {
      noExport.push(`${e.cap} → ${e.spec}：调用 m.${e.exportName}()，但该模块未导出 ${e.exportName}`);
    }
  }
  console.log(`[E5] 页签模块：${uniqueTargets.length} 个模块 / ${entries.length} 条注册调用，通过路径·ESM 解析·导出名校验`);
  assert.deepEqual(noExport, [], `注册表调用名与模块导出不一致：\n  ${noExport.join('\n  ')}`);
});
