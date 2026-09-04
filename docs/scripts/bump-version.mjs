// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  bump-version.mjs — 全站共享模块版本号 stamping（缓存治理）
// ════════════════════════════════════════════════════════════════
// 问题背景（书记 2026-08-07）：
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
function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
}

// ── 行内替换相对路径 import 的版本号 ──
// 覆盖：from './x.js' / from "../x.js" / export ... from / import('./x.js') 动态导入
function stampLine(line, version) {
  // 静态 import / export ... from（单双引号皆可；已带 ?v= 则替换，未带则追加）
  line = line.replace(
    /(from\s+['"])(\.{1,2}\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g,
    (m, pre, path, _q, end) => `${pre}${path}?v=${version}${end}`
  );
  // 动态 import('...')
  line = line.replace(
    /(import\(\s*['"])(\.{1,2}\/[^'"?]*\.js)(\?[^'"]*)?(['"]\s*\))/g,
    (m, pre, path, _q, end) => `${pre}${path}?v=${version}${end}`
  );
  return line;
}

// ── 处理 src 下所有 .js ──
let jsCount = 0;
const jsFiles = collectFiles(SRC_DIR, '.js');
for (const file of jsFiles) {
  let content = readFileSync(file, 'utf8');
  let changed = false;
  const lines = content.split('\n');
  const out = lines.map((line) => {
    if (isCommentLine(line)) return line;
    const next = stampLine(line, VERSION);
    if (next !== line) changed = true;
    return next;
  });
  if (changed) {
    writeFileSync(file, out.join('\n'), 'utf8');
    jsCount++;
  }
}

// ── 处理各 html：entry script + styles.css 版本号 ──
let htmlCount = 0;
const htmlFiles = collectFiles(HTML_DIR, '.html');
for (const file of htmlFiles) {
  let content = readFileSync(file, 'utf8');
  let changed = false;
  // entry script：src="...?v=..." → 统一为新版本
  content = content.replace(
    /(<script type="module" src="[^"?]*\.js)(\?[^"]*)?(")/g,
    (m, pre, _q, end) => {
      changed = true;
      return `${pre}?v=${VERSION}${end}`;
    }
  );
  // styles.css：href="...styles.css?v=..." → 统一为新版本
  content = content.replace(
    /(href="[^"?]*styles\.css)(\?[^"]*)?(")/g,
    (m, pre, _q, end) => {
      changed = true;
      return `${pre}?v=${VERSION}${end}`;
    }
  );
  // 公共脚本（theme-init/tailwind-config 等，HTML 公共资源抽取 2026-08-29 方案A）：
  // 普通 <script src=".../src/*.js"> 版本统一（不匹配 type="module" 的 entry——其 src 前有 type 属性）
  content = content.replace(
    /(<script src="[^"?]*\/src\/[^"?]*\.js)(\?[^"]*)?(")/g,
    (m, pre, _q, end) => {
      changed = true;
      return `${pre}?v=${VERSION}${end}`;
    }
  );
  if (changed) {
    writeFileSync(file, content, 'utf8');
    htmlCount++;
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
// 判例 content/05_ai_coding/测试验证纪律.md §17：Playwright evaluate 内动态 import('/src/...?v=') 若版本
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
    );
    if (next !== content) {
      writeFileSync(file, next, 'utf8');
      testCount++;
    }
  }
}

console.log(`[bump-version] 版本号：${VERSION}`);
console.log(`[bump-version] 更新 JS 文件：${jsCount} 个`);
console.log(`[bump-version] 更新 HTML 文件：${htmlCount} 个`);
if (codeVersionChanged) console.log(`[bump-version] CODE_VERSION +1（cross-page-state.js）`);
if (testCount > 0) console.log(`[bump-version] 同步 server/test 版本戳：${testCount} 个`);
