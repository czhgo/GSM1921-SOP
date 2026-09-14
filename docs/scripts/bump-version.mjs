// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  bump-version.mjs — 全站共享模块版本号 stamping（缓存治理）
// ════════════════════════════════════════════════════════════════
// 问题背景（支书 2026-08-07）：
//   entry JS（各 html 的 <script type="module" src="...?v=">）带版本号，
//   但 entry 内部 import 的共享模块（../components/*.js 等）全部无版本号。
//   浏览器按 URL 缓存 ES Module → 部署后旧模块与新代码混用 → "数据一会显示一会不显示"。
// 本脚本：给 docs/src/**/*.js 中所有相对路径 import/export/动态 import 统一加 ?v=VERSION，
//   同时统一各 html 的 entry script 与 styles.css 版本号，使每次发布 bump 一次即彻底换新。
//
// 用法：
//   node docs/scripts/bump-version.mjs            # 默认用当天日期版本，如 20260807a
//   node docs/scripts/bump-version.mjs 20260807b  # 显式指定版本号
// ════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src');
const HTML_DIR = ROOT;

const DEFAULT_VERSION =
  new Date().toISOString().slice(0, 10).replace(/-/g, '') + 'a';
const VERSION = process.argv[2] || DEFAULT_VERSION;

// ── 递归收集 .js / .html 文件 ──
function collectFiles(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'scripts' || name === 'assets' || name === 'data') continue;
      collectFiles(full, ext, out);
    } else if (name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

// ── 判断是否注释行（跳过 JSDoc 类型 import，如 @param {import('../core/domain.js').Activity}）──
// 语义（2026-09-13 Q-21-4）：注释里的 `?v=xxx` 是人写的历史注记，不是浏览器缓存键 → 既不改写、也不算陈旧。
/** 行首即是注释（整行注释）——stamper 跳过、扫描器也不视为缓存键 */
function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('<!--');
}

/** 去掉行尾注释后的代码部分（扫描 `?v=` 用：代码行尾追注的历史版本号同样是人工注记，不是缓存键） */
function codePartOf(line) {
  return line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
}

// ── 行内替换相对路径 import 的版本号 ──
// 覆盖：from './x.js' / from "../x.js" / export ... from / import('./x.js') 动态导入
//       + 副作用导入 import './x.js'（无 from）——2026-09-13 补：原漏此类，
//         导致 bootstrap/各 ws-*-entry 的 `import '../modules/capabilities/x.js?v=旧戳'`
//         长期停在旧版本（browser 按 URL 分裂出第二个模块实例：注册表/共享状态读空的根因）。
function stampLine(line, version) {
  // 静态 import / export ... from（单双引号皆可；已带 ?v= 则替换，未带则追加）
  line = line.replace(
    /(from\s+['"])(\.{1,2}\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g,
    (m, pre, path, _q, end) => `${pre}${path}?v=${version}${end}`
  );
  // 副作用导入（无 from）：import './x.js' / import "../x.js"
  line = line.replace(
    /(\bimport\s+['"])(\.{1,2}\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g,
    (m, pre, path, _q, end) => `${pre}${path}?v=${version}${end}`
  );
  // 动态 import('...') —— 同时覆盖模板字符串形式 `import(\`../modules/capabilities/${stem}-workspace.js?v=旧戳\`)`
  //（2026-09-13 Q-21-4 收尾自检暴露：settings-entry.js 的 capabilities 动态加载因「只认引号」漏戳，长年停在
  //  20260909e → 浏览器按 URL 分裂出第二个 workspace 模块实例。故本行同时接受 ` / ' / "）
  line = line.replace(
    /(import\(\s*[`'"])(\.{1,2}\/[^`'"?]*\.js)(\?[^`'"]*)?([`'"]\s*\))/g,
    (m, pre, path, _q, end) => `${pre}${path}?v=${version}${end}`
  );
  return line;
}

// ── 处理 src 下所有 .js ──
// 计数口径（2026-09-13 Q-21-4 修正）：以**改写前后内容是否真的不同**为唯一判据。
//   原实现用「在 map 回调里置 changed 标志」判断，实测出现「文件已改写却报 0 个」的不可靠计数
//   （badges.js 已变 ?v=新戳，脚本仍打印 0），故改为直接比对字符串——避免依赖跨闭包的标志位。
let jsCount = 0;
const jsFiles = collectFiles(SRC_DIR, '.js');
for (const file of jsFiles) {
  const before = readFileSync(file, 'utf8');
  const after = before
    .split('\n')
    .map((line) => (isCommentLine(line) ? line : stampLine(line, VERSION)))
    .join('\n');
  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    jsCount++;
  }
}

// ── 处理各 html：entry script + styles.css 版本号 ──
let htmlCount = 0;
const htmlFiles = collectFiles(HTML_DIR, '.html');
for (const file of htmlFiles) {
  const before = readFileSync(file, 'utf8');
  // 计数口径（Q-21-4 修正）：原实现在 replace 回调里无条件置 changed=true → 「正则命中」即计数，
  //   空跑（已是当前戳）也会报「更新 N 个」，属假阳性计数。现一律以内容比对为准。
  const next = before
    // entry script：src="...?v=..." → 统一为新版本
    .replace(
      /(<script type="module" src="[^"?]*\.js)(\?[^"]*)?(")/g,
      (m, pre, _q, end) => `${pre}?v=${VERSION}${end}`
    )
    // 样式表：href="...*.css?v=..." → 统一为新版本
    //（2026-09-13 扩展：原只覆盖 styles.css，about.css 等长年停在旧戳 20260828l）
    .replace(
      /(href="[^"?]*\.css)(\?[^"]*)?(")/g,
      (m, pre, _q, end) => `${pre}?v=${VERSION}${end}`
    )
    // 公共脚本（theme-init/tailwind-config 等，HTML 公共资源抽取 2026-08-29 方案A）：
    // 普通 <script src=".../src/*.js"> 版本统一（不匹配 type="module" 的 entry——其 src 前有 type 属性）
    .replace(
      /(<script src="[^"?]*\/src\/[^"?]*\.js)(\?[^"]*)?(")/g,
      (m, pre, _q, end) => `${pre}?v=${VERSION}${end}`
    );
  if (next !== before) {
    writeFileSync(file, next, 'utf8');
    htmlCount++;
  }
}

// ── 处理 src 下所有 .css：url(...)?v= 资源戳（字体/图片）──
//（2026-09-13 补：about.css 的字体 url 曾长年停在 20260828l）
let cssCount = 0;
for (const file of collectFiles(SRC_DIR, '.css')) {
  const content = readFileSync(file, 'utf8');
  const next = content.replace(
    /(url\(\s*['"]?[^'")?]*\.(?:woff2?|ttf|otf|eot|css|png|jpe?g|svg|webp))(\?[^'")]*)?(['"]?\s*\))/g,
    (m, pre, _q, end) => `${pre}?v=${VERSION}${end}`
  );
  if (next !== content) {
    writeFileSync(file, next, 'utf8');
    cssCount++;
  }
}

// ── 同步 bump CODE_VERSION（cross-page-state.js 运行时自检常量）──
// 使旧 tab 持有旧 ES 模块时自动刷新一次（与模块 URL 版本号双保险）
let codeVersionChanged = false;
const cpsFile = join(SRC_DIR, 'core', 'cross-page-state.js');
const cpsContent = readFileSync(cpsFile, 'utf8');
const cpsNext = cpsContent.replace(
  /const CODE_VERSION = (\d+);/,
  (m, cur) => {
    codeVersionChanged = true;
    return `const CODE_VERSION = ${parseInt(cur, 10) + 1};`;
  }
);
if (codeVersionChanged) {
  writeFileSync(cpsFile, cpsNext, 'utf8');
}

// ── 同步 server/test/*.mjs 与 *.test.js 内的页面模块版本戳（防模块实例分裂）──
// 判例 content/05_ai_coding/TEST_AND_VERIFICATION.md §17：Playwright evaluate 内动态 import('/src/...?v=') 若版本
// 落后于 src 内部 import，浏览器会按 URL 分裂出第二个模块实例（注册表/共享状态读空），
// 导致回归误报（m4 回归 22/31 即为 20260824b 未随 bump 至 20260824c 的误报）。
// 2026-08-30 扩展：*.test.js 一并纳入（e2e-login.test.js 硬编码 ?v= 曾漏同步，
// 上一轮 bump 后仍持旧戳 20260829r → 模块分裂 → 写穿闭环误报超时）。
let testCount = 0;
const testDir = join(ROOT, '..', 'server', 'test');
if (existsSync(testDir)) {
  for (const name of readdirSync(testDir)) {
    if (!name.endsWith('.mjs') && !name.endsWith('.test.js')) continue;
    const file = join(testDir, name);
    let content = readFileSync(file, 'utf8');
    const next = content.replace(
      /(\/src\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g,
      (m, pre, _q, end) => `${pre}?v=${VERSION}${end}`
    ).replace(
      // 硬编码版本字面量（如 `const V = '?v=20260909e'`）——2026-09-13 补：
      // 原漏此类，branch-module-catalog.test.mjs 的 V 停在旧戳 → 模块实例分裂。
      /(\?v=)[0-9]{8}[a-z]/g,
      (m, pre) => `${pre}${VERSION}`
    );
    if (next !== content) {
      writeFileSync(file, next, 'utf8');
      testCount++;
    }
  }
}

// ── 收尾自检（2026-09-13 Q-21-4）：扫描全仓 `?v=` 戳，报告与本版本不一致的残留 ──
// 这才是真正要保证的量：**不只是本次改了多少，而是改完后有没有陈旧残留**——陈旧戳会让浏览器按
// URL 分裂出第二个模块实例（注册表/共享状态读空的根因，见 TEST_AND_VERIFICATION §17）。
const STALE_RE = /\?v=([0-9]{8}[a-z])/g;
const staleFiles = [];
function scanStale(dir, exts) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'scripts' || name === 'assets' || name === 'data' || name === 'node_modules') continue;
      scanStale(full, exts);
      continue;
    }
    if (!exts.some((e) => name.endsWith(e))) continue;
    // 注释行不算缓存键（如 cross-page-state.js 里「本批次全站 ?v=20260911a」的历史注记）——
    // 与 stamper 的跳过规则同源，避免把人工注记报成陈旧残留。
    const hits = [];
    for (const raw of readFileSync(full, 'utf8').split(/\r?\n/)) {
      if (isCommentLine(raw)) continue;
      for (const m of codePartOf(raw).matchAll(STALE_RE)) if (m[1] !== VERSION) hits.push(m[1]);
    }
    if (hits.length) staleFiles.push(`${full.slice(ROOT.length + 1)} (${[...new Set(hits)].join(', ')})`);
  }
}
scanStale(SRC_DIR, ['.js', '.css']);
scanStale(HTML_DIR, ['.html']);
const serverTestDir = join(ROOT, '..', 'server', 'test');
if (existsSync(serverTestDir)) scanStale(serverTestDir, ['.mjs', '.test.js']);

console.log(`[bump-version] 版本号：${VERSION}`);
console.log(`[bump-version] 实际改写：JS ${jsCount} 个 / HTML ${htmlCount} 个 / CSS ${cssCount} 个 / server-test ${testCount} 个`);
console.log(`[bump-version] CODE_VERSION ${codeVersionChanged ? '+1（cross-page-state.js）' : '未变'}`);
if (staleFiles.length === 0) {
  console.log('[bump-version] 陈旧戳自检：0 处残留 ✅');
} else {
  console.log(`[bump-version] ⚠ 陈旧戳自检：${staleFiles.length} 个文件仍有非本版本戳——`);
  for (const f of staleFiles.slice(0, 20)) console.log(`  - ${f}`);
  if (staleFiles.length > 20) console.log(`  …另有 ${staleFiles.length - 20} 个未列出`);
}
