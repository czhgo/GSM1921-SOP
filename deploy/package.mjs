#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  deploy/package.mjs —— 发布包**白名单打包器**（跨平台，纯 Node，无第三方依赖）
//
//  用法：
//    node deploy/package.mjs                 # 生成到 dist/（**不带** node_modules；目标机跑 npm ci --omit=dev）
//    node deploy/package.mjs --with-deps     # 连 node_modules 一起打（目标机无外网时用）
//    node deploy/package.mjs --out <目录>     # 指定输出目录
//
//  为什么要有它（2026-09-29 批次 269 · 部署前筹备）：
//    ① **应用根＝仓库根**：`server/app.js` 同源托管 `../docs` ⇒ `docs/` 与 `server/` **必须是兄弟目录**，
//       所以「只拷 server/」是错的（会 404 全部页面）。
//    ② **绝不能带**测试与运行时产物——实测 `server/.browsers`（Playwright 测试浏览器）**543.7 MB**，
//       而真正的应用负载只有 ~42 MB（docs 9.5 + node_modules 32.4 + 代码）。「整个目录拷过去」会白带 543 MB。
//    ③ 打包**必须白名单**，并在末尾**断言**黑名单里的东西一个都不在包里（机检，不靠自觉）。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const WITH_DEPS = argv.includes('--with-deps');
const outArg = argv.indexOf('--out');
const OUT_DIR = path.join(ROOT, outArg === -1 ? 'dist' : argv[outArg + 1]);

// ── 白名单：包内**只允许**这些（相对仓库根）──────────────────────
//   docs/    ：静态前端（MPA 全站页面 + src/ 源码 + styles/fonts）
//   server/  ：后端（只挑运行时需要的；test/ 与 scripts/ 里只有 backup 进包）
const INCLUDE = [
  'docs',
  'server/server.js', 'server/app.js', 'server/db.js', 'server/env.js', 'server/seed.js',
  'server/system-notice-kinds.js', 'server/package.json', 'server/package-lock.json',
  'server/routes', 'server/services', 'server/scripts',
  'README.md', 'README-server.md', 'LICENSE', 'CHANGELOG.md',
  'content/04_web_design/deploy', // 部署说明书（运维时需要就地查）
];
// ── 黑名单：**任何**命中即打包失败（含白名单目录内部的递归排除）──
const EXCLUDE_ANY = [
  /(^|[/\\])\.browsers([/\\]|$)/,      // Playwright 浏览器 543.7 MB
  /(^|[/\\])node_modules([/\\]|$)/,     // 由 WITH_DEPS 单独控制
  /(^|[/\\])test([/\\]|$)/,             // server/test 1.9 MB（服务器上不跑测试）
  /(^|[/\\])backups([/\\]|$)/,          // 备份产物
  /(^|[/\\])uploads([/\\]|$)/,          // 附件（运行时数据，另行迁移）
  /(^|[/\\])data\.db(-wal|-shm)?$/,     // 库文件（运行时数据，另行迁移）
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

// ── 收集清单 ───────────────────────────────────────────────────
const files = [];
for (const rel of INCLUDE) {
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  if (!fs.existsSync(abs)) { console.warn(`[package] ⚠ 白名单项不存在，跳过：${rel}`); continue; }
  const st = fs.statSync(abs);
  if (st.isFile()) { if (!isExcluded(rel)) files.push(rel); continue; }
  for (const r of walk(abs, ROOT)) files.push(rel + '/' + r.slice(rel.length + 1));
}
if (WITH_DEPS) {
  const nm = 'server/node_modules';
  for (const r of walk(path.join(ROOT, 'server', 'node_modules'), ROOT)) files.push(r);
}
files.sort();

// ── 黑名单断言（机检）──────────────────────────────────────────
const bad = files.filter((f) => EXCLUDE_ANY.some((re) => re.test(f)));
if (bad.length) {
  console.error('[package] ⛔ 包内出现黑名单文件（拒绝打包）：\n  - ' + bad.slice(0, 20).join('\n  - '));
  process.exit(1);
}
const total = files.reduce((s, f) => s + fs.statSync(path.join(ROOT, f.split('/').join(path.sep))).size, 0);

// ── 落地：staging → tar.gz（Windows 10+ 自带 bsdtar，Linux/macOS 自带 tar）──
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'package.json'), 'utf8')).version;
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const name = `gsm1921-sop-v${version}-${stamp}${WITH_DEPS ? '-withdeps' : ''}`;
fs.mkdirSync(OUT_DIR, { recursive: true });
const stage = path.join(OUT_DIR, name);
fs.rmSync(stage, { recursive: true, force: true });
for (const f of files) {
  const dst = path.join(stage, f.split('/').join(path.sep));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, f.split('/').join(path.sep)), dst);
}
fs.writeFileSync(path.join(stage, 'MANIFEST.txt'),
  `# ${name}\n# 生成：${new Date().toISOString()}　文件数=${files.length}\n# 说明：这是**发布包**，不含测试件 / .browsers / 库文件 / 附件 / 备份。\n#\n` + files.join('\n') + '\n');

const tarball = path.join(OUT_DIR, `${name}.tar.gz`);
fs.rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', OUT_DIR, name], { stdio: 'inherit' });
const sha = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex');
fs.writeFileSync(tarball + '.sha256', `${sha}  ${path.basename(tarball)}\n`);
fs.rmSync(stage, { recursive: true, force: true });

console.log(`[package] ✅ ${path.basename(tarball)}`);
console.log(`[package]    文件 ${files.length} 个 · 解包后 ${(total / 1048576).toFixed(1)} MB（含 node_modules=${WITH_DEPS}）`);
console.log(`[package]    sha256 ${sha}`);
console.log('[package]    解包后请在仓库根执行：cd server && npm ci --omit=dev（不带 --with-deps 时）');
