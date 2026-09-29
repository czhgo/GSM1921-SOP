#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  deploy/package.mjs —— 发布包**白名单打包器**（跨平台，纯 Node，无第三方依赖）
//
//  用法：
//    node deploy/package.mjs                 # 生成到 dist/（**不带** node_modules；目标机跑 npm ci --omit=dev）
//    node deploy/package.mjs --with-deps     # 连 node_modules 一起打（目标机无外网时用）
//    node deploy/package.mjs --keep-mock     # **保留**演示名单（只用于内部演示包；生产**不要**加）
//    node deploy/package.mjs --out <目录>
//
//  为什么要有它（2026-09-29 批次 269–270 · 部署前筹备）：
//    ① **应用根＝仓库根**：`server/app.js` 同源托管 `../docs` ⇒ `docs/` 与 `server/` **必须是兄弟目录**，
//       所以「只拷 server/」是错的（会 404 全部页面）。
//    ② **绝不能带**测试与运行时产物——实测 `server/.browsers`（Playwright 测试浏览器）**543.7 MB**，
//       而真正的应用负载只有 ~10 MB（不含依赖）。「整个目录拷过去」会白带 543 MB。
//    ③ **名单不出包**（2026-09-29 批次 270，系按支书第 3 条「**目前所有的名单都不要部署上去，那是错的！！**」）：
//       `docs/src/data/mock/people.js`（51 人**真名**）与 `accounts.js`（**学号＋口令**）**必须空壳化**——
//       否则二者可被**直接下载**（静态托管下就是普通 .js 文件），且匿名访客在只读演示下仍能看到名单。
//       ⇒ 默认**剥离**；并把「包内任何文件都不得出现名单里的姓名」落成**黑名单断言**（机检，不靠自觉）。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const WITH_DEPS = argv.includes('--with-deps');
const KEEP_MOCK = argv.includes('--keep-mock');
const outArg = argv.indexOf('--out');
const OUT_DIR = path.join(ROOT, outArg === -1 ? 'dist' : argv[outArg + 1]);

// ── 白名单：包内**只允许**这些（相对仓库根）──────────────────────
const INCLUDE = [
  'docs',
  'server/server.js', 'server/app.js', 'server/db.js', 'server/env.js', 'server/seed.js',
  'server/seed-baseline.js', 'server/system-notice-kinds.js', 'server/package.json', 'server/package-lock.json',
  'server/routes', 'server/services', 'server/scripts',
  'README.md', 'README-server.md', 'LICENSE', 'CHANGELOG.md',
  'content/04_web_design/deploy', // 部署说明书（运维时需要就地查）
];
// ── 黑名单（路径）：命中即**拒绝打包** ──────────────────────────
const EXCLUDE_ANY = [
  /(^|[/\\])\.browsers([/\\]|$)/,      // Playwright 浏览器 543.7 MB
  /(^|[/\\])node_modules([/\\]|$)/,     // 由 WITH_DEPS 单独控制
  /(^|[/\\])test([/\\]|$)/,             // server/test（服务器上不跑测试）
  /(^|[/\\])backups([/\\]|$)/,
  /(^|[/\\])uploads([/\\]|$)/,
  /(^|[/\\])data\.db(-wal|-shm)?$/,
  /(^|[/\\])\.git([/\\]|$)/,
  /\.log$/i, /\.tmp$/i,
];
const isExcluded = (rel) => EXCLUDE_ANY.some((re) => re.test(rel));

function walk(abs, base = abs, acc = []) {
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, e.name);
    const rel = path.relative(base, p).split(path.sep).join('/');
    if (isExcluded(rel)) continue;
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push(rel);
  }
  return acc;
}

// ── 名单：先读**源**名册（用来做「包内不得出现这些姓名」的断言）──
//  ⚠ 口径（批次 270 实测踩到）：**只把「自然人姓名」算名单**——`p_pc` 的 name 是 `'党委组织员'`
//  （**角色名**，在多处代码里作常量出现）⇒ 若把它算进名册，断言会满屏假阳性。
//  故名册 = id 形如 `p<数字>` 的那些人（`p_pc` 是组织级账号、不作自然人名单）。
let ROSTER_NAMES = [];
try {
  const { PEOPLE } = await import(pathToFileURL(path.join(ROOT, 'docs/src/data/mock/people.js')).href);
  ROSTER_NAMES = PEOPLE.filter((p) => /^p\d+$/.test(String(p.id))).map((p) => p.name).filter((n) => n && n.length >= 2);
} catch (e) { console.warn('[package] ⚠ 读不到源名册：', e.message); }
const PLACEHOLDER = '（示例姓名）';

// ── 名单剥离（整文件空壳化）：两个**名单/口令的唯一来源** ——
const STRIP = {
  'docs/src/data/mock/people.js': `// 发布包已剥离演示名单（deploy/package.mjs；2026-09-29 批次 270）
// 空壳：保留导出名 \`PEOPLE\` 以免消费点 import 失败；成员请走 IAAA 登录 + 支部确认，或党委台「支部管理」导入名册。
export const PEOPLE = [];
`,
  'docs/src/data/mock/accounts.js': `// 发布包已剥离演示账号（deploy/package.mjs；2026-09-29 批次 270）
// 空壳：保留导出名/函数名以免消费点 import 失败。生产账号承载＝服务端 \`users\` 表（学号 + 全站统一口令）。
export const MOCK_ACCOUNTS = [];
export function mockLogin() { return null; }
`,
};
const TEXTY = /\.(js|mjs|html|json|md|css|yml|yaml|sh|ps1|conf|example)$/i;
// 口令泄露只查**账号行所在处**（`docs/src/data/mock/**` 与 `server/seed*`）——
//   `server/routes/auth.js` 与 `docs/src/services/core/accounts.js` 的 `'123456'` 是**非生产缺省口令常量**
//   （已由 `DEPLOYMENT_GUIDE` 明令「生产必须改 LOGIN_PASSWORD」），不算名单泄露。
const PW_FILE = /^docs\/src\/data\/mock\/|^server\/seed/;
const PW_SHAPE = /['"]studentId['"]\s*:\s*['"]?\d|password['"]?\s*:\s*['"]123456['"]/;

// ── 收集清单 ───────────────────────────────────────────────────
const files = [];
for (const rel of INCLUDE) {
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  if (!fs.existsSync(abs)) { console.warn(`[package] ⚠ 白名单项不存在，跳过：${rel}`); continue; }
  if (fs.statSync(abs).isFile()) { if (!isExcluded(rel)) files.push(rel); continue; }
  for (const r of walk(abs, ROOT)) files.push(rel + '/' + r.slice(rel.length + 1));
}
if (WITH_DEPS) for (const r of walk(path.join(ROOT, 'server', 'node_modules'), ROOT)) files.push(r);
files.sort();

// ── 断言①：路径黑名单 ─────────────────────────────────────────
const bad = files.filter((f) => EXCLUDE_ANY.some((re) => re.test(f)));
if (bad.length) {
  console.error('[package] ⛔ 包内出现黑名单文件（拒绝打包）：\n  - ' + bad.slice(0, 20).join('\n  - '));
  process.exit(1);
}

// ── 落地：staging（含名单剥离）→ tar.gz（Windows 10+ 自带 bsdtar，Linux/macOS 自带 tar）──
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'package.json'), 'utf8')).version;
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const name = `gsm1921-sop-v${version}-${stamp}${WITH_DEPS ? '-withdeps' : ''}${KEEP_MOCK ? '-withmock' : ''}`;
fs.mkdirSync(OUT_DIR, { recursive: true });
const stage = path.join(OUT_DIR, name);
fs.rmSync(stage, { recursive: true, force: true });
let stripped = 0, total = 0, sanitized = 0, sanitizedFiles = 0;
for (const f of files) {
  const dst = path.join(stage, f.split('/').join(path.sep));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!KEEP_MOCK && STRIP[f]) { fs.writeFileSync(dst, STRIP[f]); stripped++; continue; }
  const src = fs.readFileSync(path.join(ROOT, f.split('/').join(path.sep)));
  if (!KEEP_MOCK && TEXTY.test(f) && ROSTER_NAMES.length) {
    // **包内名单消毒**：把任何文件名册里的姓名换成占位（文书/帮助页/种子 JSON 都可能带名——
    //   批次 270 实测 `docs/help.html` 里就有支书本人的真名、`server/seed.js` 里有名册真名）。
    let s = src.toString('utf8');
    let n = 0;
    for (const name of ROSTER_NAMES) {
      if (!s.includes(name)) continue;
      const c = s.split(name).length - 1;
      s = s.split(name).join(PLACEHOLDER); n += c;
    }
    if (n) { fs.writeFileSync(dst, s); sanitized += n; sanitizedFiles++; total += Buffer.byteLength(s); continue; }
  }
  fs.writeFileSync(dst, src);
  total += src.length;
}

// ── 断言②（**名单不泄露**）：消毒后再扫一遍，任何文本文件都不得残留名册姓名；账号类文件不得残留演示口令 ──
const leaks = [];
for (const f of fs.readdirSync(stage, { recursive: true })) {
  const abs = path.join(stage, f);
  if (!fs.statSync(abs).isFile() || !TEXTY.test(f)) continue;
  const rel = f.split(path.sep).join('/');
  const s = fs.readFileSync(abs, 'utf8');
  const hit = ROSTER_NAMES.filter((n) => s.includes(n));
  if (hit.length) leaks.push(`${rel} 残留姓名 ${hit.slice(0, 3).join('/')}${hit.length > 3 ? '…' : ''}`);
  if (PW_FILE.test(rel) && PW_SHAPE.test(s)) leaks.push(`${rel} 残留账号/口令行`);
}
if (leaks.length) {
  console.error('[package] ⛔ 名单泄露断言失败（拒绝出包）：\n  - ' + leaks.slice(0, 15).join('\n  - ')
    + '\n修法：把泄露源补进 deploy/package.mjs 的 STRIP，或（内部演示包）显式加 --keep-mock。');
  fs.rmSync(stage, { recursive: true, force: true });
  process.exit(1);
}
const rosterSize = new Set(ROSTER_NAMES).size;

fs.writeFileSync(path.join(stage, 'MANIFEST.txt'),
  `# ${name}\n# 生成：${new Date().toISOString()}　文件数=${files.length}\n`
  + `# 演示名单：${KEEP_MOCK ? '⚠ 已保留（--keep-mock：**不要**用于生产）' : `已剥离 ${stripped} 个文件（people.js / accounts.js 空壳化）`}\n`
  + `# 组织基线：首次启动自动建立「党委账号 1 名 ＋ 支部「光华管理学院本科生党支部」(br-b1)」，**零成员名单**\n`
  + '# 说明：这是**发布包**，不含测试件 / .browsers / 库文件 / 附件 / 备份。\n#\n' + files.join('\n') + '\n');

const tarball = path.join(OUT_DIR, `${name}.tar.gz`);
fs.rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', OUT_DIR, name], { stdio: 'inherit' });
const sha = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex');
fs.writeFileSync(tarball + '.sha256', `${sha}  ${path.basename(tarball)}\n`);
fs.rmSync(stage, { recursive: true, force: true });

console.log(`[package] ✅ ${path.basename(tarball)}`);
console.log(`[package]    文件 ${files.length} 个 · 解包后 ${(total / 1048576).toFixed(1)} MB（含 node_modules=${WITH_DEPS}）`);
console.log(`[package]    名单：${KEEP_MOCK ? '⚠ 保留（--keep-mock，**勿用于生产**）'
  : `空壳化 ${stripped} 个文件 ＋ 消毒 ${sanitizedFiles} 个文件 / ${sanitized} 处姓名（源名册 ${rosterSize} 人）`}`);
console.log('[package]    断言：路径黑名单 **0** 命中 ＋ 姓名/口令泄露 **0** 命中');
console.log(`[package]    sha256 ${sha}`);
console.log('[package]    解包后请在仓库根执行：cd server && npm ci --omit=dev（不带 --with-deps 时）');
