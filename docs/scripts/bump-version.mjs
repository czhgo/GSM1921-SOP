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
// 作用域与变更频率的工程说明（函数 / 数据为何不随戳变、为何必须全站同戳）见 content/05_ai_coding/FILE_OPERATION_RULES.md「版本戳（?v=）的作用域与变更频率」节。
//
// 用法：
//   node docs/scripts/bump-version.mjs            # 无参：读仓库现有戳推导「同日续号」（如已有 20260914b → 20260914c）
//   node docs/scripts/bump-version.mjs 20260807b  # 显式指定版本号（须不小于仓库现有最大戳，否则报错退出）
//   node docs/scripts/bump-version.mjs --check    # 只检查不写：陈旧戳 / CODE_VERSION 与戳不一致 → 退出码 1
//
// 发布语义（2026-10-28）：**日常提交不 bump，只在发布时跑一次**（`cd server; npm run release:stamp`）。
//   理由：入口 HTML 单独加戳无效——入口内部 import 的 URL 不变，浏览器仍复用旧模块实例。
// ════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextVersionFor, isForward, isCommentLine, codePartOf, stampTestFileContent, cacheKeyStamps } from './version-next.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src');
const HTML_DIR = ROOT;
const TEST_DIR = join(ROOT, '..', 'server', 'test');

const TODAY = new Date().toISOString().slice(0, 10).replace(/-/g, '');

// ── 运行模式 ──
//   CHECK_MODE：只检查不写（`--check`）。判定口径与写模式**完全同一套**（陈旧戳扫描 / CODE_VERSION 锚），
//   区别只在于「不落盘」，以便发布脚本在 bump 之后立刻核账（`server/package.json` 的 release:stamp）。
const CHECK_MODE = process.argv.includes('--check');
const EXPLICIT_VERSION = process.argv.slice(2).find((a) => !a.startsWith('--')) || '';

// ── 收集仓库现有版本戳（用于「同日续号」推导与「只允许前进」断言）──
// 与收尾自检同源跳过注释行：注释里的版本号是人工历史注记，不是缓存键。
function collectExistingStamps() {
  const found = new Set();
  const RE = /\?v=(\d{8}[a-z])/g;
  const scan = (dir, exts) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (name === 'scripts' || name === 'assets' || name === 'node_modules') continue;
        scan(full, exts);
        continue;
      }
      if (!exts.some((e) => name.endsWith(e))) continue;
      for (const raw of readFileSync(full, 'utf8').split(/\r?\n/)) {
        if (isCommentLine(raw)) continue;
        for (const m of codePartOf(raw).matchAll(RE)) found.add(m[1]);
      }
    }
  };
  scan(SRC_DIR, ['.js', '.css']);
  scan(HTML_DIR, ['.html']);
  scan(TEST_DIR, ['.mjs', '.test.js']);
  return [...found];
}

const EXISTING = collectExistingStamps();
const PREV_MAX = EXISTING.slice().sort().pop() || '';
// 版本口径：
//   写模式（默认）——显式传参优先，否则按「当天续号」推导下一个号；
//   检查模式（--check）——不推导下一个号，以**仓库现有最大戳**为「当前版本」只做核对
//   （若沿用 nextVersionFor，则全站戳都会显得「陈旧」，检查将永远为红）。
const VERSION = EXPLICIT_VERSION || (CHECK_MODE ? PREV_MAX : nextVersionFor(TODAY, EXISTING));

if (CHECK_MODE && !VERSION) {
  console.error('[bump-version] ✖ --check 无法核对：仓库内没有任何 `?v=` 版本戳（扫描根路径可能失效）。');
  process.exit(1);
}

// 版本号只允许前进（2026-09-14 批次 28，Q-23-8）：原无参默认「当天日期 + a」缺续号逻辑，
// 同日第二次发版会把全站戳往回写，而收尾自检只比对「是否等于本次 VERSION」故仍报 0 残留。
if (!isForward(VERSION, PREV_MAX)) {
  console.error(
    `[bump-version] ✖ 版本号不得回退：本次 ${VERSION} 小于仓库现有最大戳 ${PREV_MAX}。\n` +
      `  请改用更大的版本号（无参运行即按「同日续号」自动推导）。`
  );
  process.exit(1);
}

// ── 落盘出口 ──
// `--check` 只检查不写：所有改写一律经此出口，写模式才会真正写盘（计数照常统计「将会改写」）。
function write(file, content) {
  if (!CHECK_MODE) writeFileSync(file, content, 'utf8');
}

// ── 递归收集 .js / .html 文件 ──
function collectFiles(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'scripts' || name === 'assets') continue;
      collectFiles(full, ext, out);
    } else if (name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

// ── 判断是否注释行（跳过 JSDoc 类型 import，如 @param {import('../core/domain.js').Activity}）──
// 注释排除规则（isCommentLine / codePartOf）已抽到 version-next.mjs 单一源，
// 与 stamper / 收尾自检 / 守卫测试三处共用——勿在本文件再写一套。

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
  // JS 侧资源 URL：new URL('./x.css?v=…', import.meta.url)（如 tab-bar.js 的 tab-loading.css）
  // 这些 `?v=` 同样会被收尾自检当作**活动缓存键**扫描，漏改即「陈旧戳残留」——2026-10-28 补。
  line = line.replace(
    /(new URL\(\s*['"])([^'"?]+\.(?:css|woff2?|ttf|otf|eot|png|jpe?g|svg|webp))(\?[^'"]*)?(['"])/g,
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
    write(file, after);
    jsCount++;
  }
}

// ── modulepreload（2026-10-27 批次 516）──
// 判据（ARCHITECTURE_EVOLUTION §九 第 3 项）：每页首屏的静态 import 链在 HTML 里预加载一层，
// 减少 1–2 个 RTT；href 必须与入口模块同戳，否则会重复下载两个实例。
// 只取入口模块的**直接静态 import**（不递归）：再深一层交给浏览器解析，避免 HTML 体积失控。
function modulePreloadHrefs(htmlFile, entrySrc) {
  // workspace 页有 <base href="../">：实际解析基准是 base，不是 HTML 文件目录（否则会少一层）
  const htmlSrc = readFileSync(htmlFile, 'utf8');
  const baseHref = (htmlSrc.match(/<base\s+href="([^"]+)"/) || [])[1] || '';
  const baseDir = resolve(dirname(htmlFile), baseHref || '.');
  const abs = resolve(baseDir, entrySrc.split('?')[0]);
  if (!existsSync(abs)) return [];
  const src = readFileSync(abs, 'utf8');
  const specs = [...src.matchAll(/import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)]
    .map((mm) => mm[1])
    .filter((s) => s.startsWith('.'));
  const out = [];
  for (const spec of new Set(specs)) {
    const target = resolve(dirname(abs), spec.split('?')[0]);
    if (!existsSync(target)) continue;
    let rel = relative(baseDir, target).split(sep).join('/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    out.push(`${rel}?v=${VERSION}`);
  }
  return out;
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
  // modulepreload 块：有 entry 模块才生成；块内 href 同戳，重复运行做替换而非追加
  let withPreload = next;
  const entryTag = next.match(/<script type="module" src="([^"]+)"/);
  if (entryTag) {
    const hrefs = modulePreloadHrefs(file, entryTag[1]);
    if (hrefs.length) {
      const block = `<!-- modulepreload:start -->\n${hrefs.map((h) => `  <link rel="modulepreload" href="${h}" />`).join('\n')}\n  <!-- modulepreload:end -->`;
      const blockRe = /[ \t]*<!-- modulepreload:start -->[\s\S]*?<!-- modulepreload:end -->/;
      withPreload = blockRe.test(next)
        ? next.replace(blockRe, block)
        : next.replace(entryTag[0], `${block}\n  ${entryTag[0]}`);
    }
  }
  if (withPreload !== before) {
    write(file, withPreload);
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
    write(file, next);
    cssCount++;
  }
}

// ── 同步 bump CODE_VERSION（cross-page-state.js 运行时自检常量）──
// 使旧 tab 持有旧 ES 模块时自动刷新一次（与模块 URL 版本号双保险）
//
// 版本锚（2026-10-28）：同一行末尾由本脚本维护 `[stamp:YYYYMMDDx]`，记录「这次 CODE_VERSION 属于哪一版戳」。
// 它是 `--check` 判定「CODE_VERSION 与戳不一致」的唯一依据——没有锚就分不清「CODE_VERSION 没跟着 bump」
// 与「正常状态」（两者代码里都是个整数，无从比对）。
//
// 逐行改写（不用整串正则）：仓库文件是 CRLF，`[^\n]*` 会把行尾 `\r` 也捕获进锚点前，
// 使 `[stamp:…]` 落到「同一行内的 CR 之后」——按行处理并显式去掉 CR 才不会写坏这一行。
const CPS_MARKER_RE = /\s*\[stamp:\d{8}[a-z]\]/;
const CPS_MARKER_STAMP_RE = /\[stamp:(\d{8}[a-z])\]/;
const CPS_LINE_RE = /const CODE_VERSION = (\d+);/;
let codeVersionChanged = false;
let codeVersionIssue = '';
const cpsFile = join(SRC_DIR, 'core', 'session', 'cross-page-state.js');
const cpsContent = readFileSync(cpsFile, 'utf8');
const cpsLines = cpsContent.split('\n');
const cpsIdx = cpsLines.findIndex((l) => CPS_LINE_RE.test(l));
const cpsLine = cpsIdx >= 0 ? cpsLines[cpsIdx].replace(/\r$/, '') : '';
if (CHECK_MODE) {
  if (cpsIdx < 0) {
    codeVersionIssue = 'cross-page-state.js 缺 `const CODE_VERSION = N;` 声明';
  } else {
    const anchor = (CPS_MARKER_STAMP_RE.exec(cpsLine) || [])[1] || '';
    if (!anchor) codeVersionIssue = 'CODE_VERSION 行缺版本锚 `[stamp:…]`（请跑一次 bump 写入）';
    else if (anchor !== VERSION) codeVersionIssue = `CODE_VERSION 锚 ${anchor} 与当前戳 ${VERSION} 不一致（上次 bump 只落了一半）`;
  }
} else if (cpsIdx >= 0) {
  codeVersionChanged = true;
  const eol = cpsLines[cpsIdx].endsWith('\r') ? '\r' : '';
  const tail = cpsLine.slice(cpsLine.indexOf(';') + 1).replace(CPS_MARKER_RE, '').replace(/\r/g, '');
  const bumped = parseInt(CPS_LINE_RE.exec(cpsLine)[1], 10) + 1;
  cpsLines[cpsIdx] = `const CODE_VERSION = ${bumped};${tail} [stamp:${VERSION}]${eol}`;
  write(cpsFile, cpsLines.join('\n'));
}

// ── 同步 server/test/*.mjs 与 *.test.js 内的页面模块版本戳（防模块实例分裂）──
// 判例 content/05_ai_coding/TEST_AND_VERIFICATION.md §17：Playwright evaluate 内动态 import('/src/...?v=') 若版本
// 落后于 src 内部 import，浏览器会按 URL 分裂出第二个模块实例（注册表/共享状态读空），
// 导致回归误报（m4 回归 22/31 即为 20260824b 未随 bump 至 20260824c 的误报）。
// 2026-08-30 扩展：*.test.js 一并纳入（e2e-login.test.js 硬编码 ?v= 曾漏同步，
// 上一轮 bump 后仍持旧戳 20260829r → 模块分裂 → 写穿闭环误报超时）。
//
// 2026-09-15 批次 46（Q-23-33 根治）：改写实现改走 version-next.mjs 的**缓存键语境判据**。
//   原判据 `/(\/src\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g` 只认「出现 /src/….js 且引号收尾」，
//   把**数据字符串**也当 import 规格符补戳——批 44 新增的 form-loop-registry 台账 113 条 `file`
//   即被改写成 `…x.js?v=…`（守卫 S4 随即报「文件不存在」）。
//   收紧后只改两类语境：① import/from/副作用 import 行；② 独立版本字面量（`const V = '?v=…'`）。
//   非语境行（注释 / `new URL(…?v=)` / `grab('…?v=')` / 路径字符串列表 / 台账 `SRC + '相对路径'`）逐字不变。
let testCount = 0;
const testDir = TEST_DIR;
if (existsSync(testDir)) {
  for (const name of readdirSync(testDir)) {
    if (!name.endsWith('.mjs') && !name.endsWith('.test.js')) continue;
    const file = join(testDir, name);
    const content = readFileSync(file, 'utf8');
    const next = stampTestFileContent(content, VERSION);
    if (next !== content) {
      write(file, next);
      testCount++;
    }
  }
}

// ── 收尾自检（2026-09-13 Q-21-4）：扫描全仓 `?v=` 戳，报告与本版本不一致的残留 ──
// 这才是真正要保证的量：**不只是本次改了多少，而是改完后有没有陈旧残留**——陈旧戳会让浏览器按
// URL 分裂出第二个模块实例（注册表/共享状态读空的根因，见 TEST_AND_VERIFICATION §17）。
//
// 判据分区（批次 46，Q-23-33）：**自检必须与补戳同判据**，否则「补戳已收紧、自检仍按旧宽判据」
//   会把非缓存键位置（Node 读取语境 / 注释）的旧戳永久误报成陈旧残留。
//   · src / html：全量 `?v=`（这两区的戳本就只出现在模块 URL 与样式表 href 上）
//   · server/test：**缓存键语境**（与补戳共用 version-next.mjs 的 cacheKeyStamps）
const staleFiles = [];
function broadStamps(content) {
  const found = [];
  for (const raw of content.split(/\r?\n/)) {
    if (isCommentLine(raw)) continue;
    for (const m of codePartOf(raw).matchAll(/\?v=([0-9]{8}[a-z])/g)) found.push(m[1]);
  }
  return [...new Set(found)];
}
function scanStale(dir, exts, stampsOf) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'scripts' || name === 'assets' || name === 'node_modules') continue;
      scanStale(full, exts, stampsOf);
      continue;
    }
    if (!exts.some((e) => name.endsWith(e))) continue;
    const hits = stampsOf(readFileSync(full, 'utf8')).filter((s) => s !== VERSION);
    if (hits.length) staleFiles.push(`${full.slice(ROOT.length + 1)} (${hits.join(', ')})`);
  }
}
scanStale(SRC_DIR, ['.js', '.css'], broadStamps);
scanStale(HTML_DIR, ['.html'], broadStamps);
if (existsSync(TEST_DIR)) scanStale(TEST_DIR, ['.mjs', '.test.js'], cacheKeyStamps);

if (CHECK_MODE) {
  // ── --check：只报告不写，有陈旧戳或 CODE_VERSION 与戳不一致即退出 1 ──
  console.log(`[bump-version] 检查模式（--check）：当前戳 ${VERSION}（仓库现有最大戳 ${PREV_MAX || '无'}）`);
  console.log(`[bump-version] 试算改写量（未落盘）：JS ${jsCount} 个 / HTML ${htmlCount} 个 / CSS ${cssCount} 个 / server-test ${testCount} 个`);
  const problems = [...staleFiles];
  if (codeVersionIssue) problems.push(`docs/src/core/session/cross-page-state.js（${codeVersionIssue}）`);
  if (problems.length === 0) {
    console.log('[bump-version] 检查通过：0 处陈旧戳，CODE_VERSION 与戳一致 ✅');
    process.exit(0);
  }
  console.error(`[bump-version] ✖ 检查未通过：${problems.length} 项——`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('  处理：发布前跑 `node docs/scripts/bump-version.mjs` 重新全站补戳后重试本检查。');
  process.exit(1);
}

console.log(`[bump-version] 版本号：${VERSION}（仓库现有最大戳 ${PREV_MAX || '无'}）`);
console.log(`[bump-version] 实际改写：JS ${jsCount} 个 / HTML ${htmlCount} 个 / CSS ${cssCount} 个 / server-test ${testCount} 个`);
console.log(`[bump-version] CODE_VERSION ${codeVersionChanged ? '+1（cross-page-state.js）' : '未变'}`);
if (staleFiles.length === 0) {
  console.log('[bump-version] 陈旧戳自检：0 处残留 ✅');
} else {
  console.log(`[bump-version] ⚠ 陈旧戳自检：${staleFiles.length} 个文件仍有非本版本戳——`);
  for (const f of staleFiles.slice(0, 20)) console.log(`  - ${f}`);
  if (staleFiles.length > 20) console.log(`  …另有 ${staleFiles.length - 20} 个未列出`);
}
