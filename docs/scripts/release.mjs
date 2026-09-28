// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  release.mjs — **语义化发版工作流**（G3-1；2026-09-28 批次 236）
// ════════════════════════════════════════════════════════════════
// 支书 2026-09-28 点选的 G3 三项之一（「语义化 release / 发布工作流」）。本脚本把发版从
//   「记得做那几步」变成**一条命令 + 预演**：先核账（四道前置检查）、再定号（按变更类别推导语义化版本）、
//   最后才落盘（写 CHANGELOG 的版本段、同步 `server/package.json` 的 version、打 `vX.Y.Z` tag）。
//
// 用法：
//   node docs/scripts/release.mjs                # **预演**（默认）：只核账 + 打印推导结果与动作清单，不改任何文件
//   node docs/scripts/release.mjs --apply        # 真落盘：改 CHANGELOG / package.json 并打 tag（**不 push**）
//   node docs/scripts/release.mjs --version 0.2.0  # 显式指定版本号（仍须「只允许前进」）
//   node docs/scripts/release.mjs --help
//
// 为什么默认预演：发版是不可逆动作（tag 一旦推出去就改不了），而本仓纪律是「**先给方案再执行**」——
//   预演把「会改哪几行、会打什么 tag」先摆在台面上，人看过再 `--apply`。
//
// 四道前置检查（任一不过即退出码 1，**不做任何写入**）：
//   C1 CHANGELOG 可解析：有 `## [Unreleased]` 段、至少一个已发布版本、版本号形态合法
//   C2 两处版本号一致：`server/package.json` 的 `version` == CHANGELOG 最新已发布版本
//   C3 `?v=` 全链单一活动戳（陈旧戳会让浏览器按 URL 分裂模块实例——见 `version-stamp.test.mjs` 头注）
//   C4 **`--apply` 时**要求 git 工作树干净（发版必须打在干净的树上，否则 tag 指向的树与 CHANGELOG 不符）
//
// 判据单一源：版本号推导（`nextSemver` / `isSemverForward`）与 CHANGELOG 解析（`parseChangelog` /
//   `classifyChanges`）以及 `?v=` 判据（`isCommentLine` / `codePartOf`）**全部来自 `version-next.mjs`**，
//   常驻守卫 `server/test/version-stamp.test.mjs::S7` 独立复算同一套判据核账——两边各写一套即视为缺陷。
// ════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChangelog, classifyChanges, nextSemver, isSemverForward, isCommentLine, codePartOf } from './version-next.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');
const PKG = join(ROOT, 'server', 'package.json');
const SRC_DIR = join(ROOT, 'docs', 'src');
const DOCS_DIR = join(ROOT, 'docs');
const TEST_DIR = join(ROOT, 'server', 'test');

/** 落版后新 `[Unreleased]` 段的占位（与 CHANGELOG 初始态一致） */
const UNRELEASED_STUB = '## [Unreleased]\n\n### Added\n\n- （暂无）\n';
const TODAY = new Date().toISOString().slice(0, 10);

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const versionArg = (() => {
  const i = argv.indexOf('--version');
  return i >= 0 ? argv[i + 1] : '';
})();

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(0, 22).join('\n'));
  process.exit(0);
}

const fail = (msg) => {
  console.error(`[release] ✖ ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`[release] ✓ ${msg}`);

// ── C1 CHANGELOG 可解析 ────────────────────────────────────────────
if (!existsSync(CHANGELOG)) fail('未找到 CHANGELOG.md（发版工作流要求仓库根下有变更日志）');
const changelog = readFileSync(CHANGELOG, 'utf8');
if (!/^##\s+\[Unreleased\]/m.test(changelog)) fail('CHANGELOG.md 缺 `## [Unreleased]` 段（Keep a Changelog 体例）');
const { unreleased, released } = parseChangelog(changelog);
if (released.length === 0) fail('CHANGELOG.md 里一个已发布版本都没有（`## [X.Y.Z] - YYYY-MM-DD`）');
const missingDate = released.filter((r) => !r.date);
if (missingDate.length) fail(`已发布版本缺日期：${missingDate.map((r) => r.version).join(', ')}（体例 = \`## [X.Y.Z] - YYYY-MM-DD\`）`);
ok(`CHANGELOG 可解析：已发布 ${released.length} 个版本，最新 ${released[0].version}（${released[0].date}）`);

// ── C2 两处版本号一致 ─────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
if (pkg.version !== released[0].version) {
  fail(`版本号两处不一致：server/package.json 写 ${pkg.version}，CHANGELOG 最新已发布写 ${released[0].version}` +
    `——发版前必须取齐（--apply 会以 CHANGELOG 为权威把 package.json 改为下一版）`);
}
ok(`版本号两处一致：${pkg.version}`);

// ── C3 `?v=` 全链单一活动戳 ────────────────────────────────────────
function collectStamps(dir, exts, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'scripts' || name === 'assets' || name === 'data' || name === 'node_modules') continue;
      collectStamps(full, exts, out);
      continue;
    }
    if (!exts.some((e) => name.endsWith(e))) continue;
    for (const raw of readFileSync(full, 'utf8').split(/\r?\n/)) {
      if (isCommentLine(raw)) continue; // 注释里的戳是人工历史注记，不算缓存键（判据同 bump-version）
      for (const m of codePartOf(raw).matchAll(/\?v=(\d{8}[a-z])/g)) out.set(m[1], `${full.slice(ROOT.length + 1)}`);
    }
  }
}
const stamps = new Map();
collectStamps(SRC_DIR, ['.js', '.css'], stamps);
collectStamps(DOCS_DIR, ['.html'], stamps);
collectStamps(TEST_DIR, ['.mjs', '.test.js'], stamps);
if (stamps.size !== 1) {
  const shown = [...stamps.entries()].slice(0, 12).map(([v, f]) => `${v} @ ${f}`).join('\n    ');
  fail(`全站活动版本戳应为 1 个，实测 ${stamps.size} 个（陈旧戳会让浏览器按 URL 分裂模块实例）：\n    ${shown}\n` +
    `  处置：先跑 node docs/scripts/bump-version.mjs 全链 bump 到同一戳`);
}
ok(`?v= 全链单一活动戳：${[...stamps.keys()][0]}`);

// ── 版本号推导（按变更类别，语义化）────────────────────────────────
const cls = classifyChanges(unreleased);
if (cls.empty && versionArg) fail('`[Unreleased]` 为空（没有待发内容）时不得指定 --version——没有内容可发');
// 无待发内容 ⇒ **推导号＝当前号**（不臆造下一个号：否则预演会报出一个根本不存在的版本，误导人以为「有东西可发」）
const next = cls.empty ? pkg.version : (versionArg || nextSemver(pkg.version, cls));
if (!isSemverForward(next, pkg.version)) fail(`版本号不得回退：拟用 ${next} 不大于现有 ${pkg.version}`);
const kindOf = cls.empty
  ? '无待发内容'
  : cls.breaking ? '主版本（含 BREAKING）' : cls.added ? '次版本（有新增）' : '修订（仅修复/变更）';
// 机器可读的推导结果（常驻守卫 `version-stamp.test.mjs::S7` 独立复算同一套纯函数后逐字比对——
// 「脚本报的号」与「判据算的号」必须一致；这行是二者的接口契约，勿改格式）。
console.log(`[release] 推导版本=${next}（当前=${pkg.version}，类别=${kindOf}）`);
if (cls.empty) {
  console.log('[release] ℹ [Unreleased] 段为空（含只有占位）—— 没有对使用者可见的变更，本次不发版。');
  process.exit(0);
}
ok(`推导版本号：${pkg.version} → ${next}（${kindOf}）`);

// ── C4 工作树干净（仅 --apply 强制）────────────────────────────────
const gitOut = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
let dirty = '';
try {
  dirty = gitOut(['status', '--porcelain']);
} catch (e) {
  fail(`无法执行 git（发版需要 git）：${e.message}`);
}
if (APPLY && dirty) {
  fail(`工作树不干净，拒绝发版（tag 会指向与 CHANGELOG 不符的树）：\n${dirty.split('\n').map((l) => '    ' + l).join('\n')}`);
}
if (!APPLY && dirty) console.log('[release] ℹ 工作树当前有未提交改动（预演不拦；--apply 会拦）');

const tagName = `v${next}`;
let tagExists = '';
try {
  tagExists = gitOut(['tag', '--list', tagName]);
} catch { /* 无 tag 能力时忽略 */ }
if (tagExists) fail(`tag ${tagName} 已存在——版本号不可复用`);

// ── 动作清单（预演）／落盘 ─────────────────────────────────────────
const releasedHeader = `## [${next}] - ${TODAY}`;
console.log('');
console.log(`[release] ${APPLY ? '开始落版' : '预演（未改任何文件）'}：`);
console.log(`  ① CHANGELOG.md：在 [Unreleased] 之上落 ${releasedHeader}，并重置新的 [Unreleased] 占位段`);
console.log(`  ② server/package.json：version ${pkg.version} → ${next}`);
console.log(`  ③ 打 annotated tag：${tagName}`);
console.log(`  ④ （本脚本**不 push**）后续：git push 与 git push origin ${tagName}`);

if (!APPLY) {
  console.log('');
  console.log('[release] 预演结束。确认无误后跑：node docs/scripts/release.mjs --apply');
  process.exit(0);
}

// ① CHANGELOG：把当前 `[Unreleased]` 段改名为已发布版本，并在其上方插入新的占位段。
//    用「首个 `## [Unreleased]` 行」做定位锚（`parseChangelog` 已确认其存在）。
const lines = changelog.split(/\r?\n/);
const anchor = lines.findIndex((l) => /^##\s+\[Unreleased\]/.test(l));
if (anchor < 0) fail('定位 `## [Unreleased]` 失败（文件在解析后被改动？）');
const nextChangelog = [
  ...lines.slice(0, anchor),
  ...UNRELEASED_STUB.split('\n'),
  releasedHeader,
  ...lines.slice(anchor + 1),
].join('\n');
writeFileSync(CHANGELOG, nextChangelog, 'utf8');
ok(`CHANGELOG.md 已落版：${releasedHeader}`);

// ② package.json 的 version 取齐
const nextPkg = readFileSync(PKG, 'utf8').replace(/("version"\s*:\s*")[^"]+(")/, (m, a, b) => `${a}${next}${b}`);
writeFileSync(PKG, nextPkg, 'utf8');
ok(`server/package.json version → ${next}`);

// ③ 打 annotated tag（不 push —— 本仓纪律：允许 commit、不允许擅自 push）
execFileSync('git', ['tag', '-a', tagName, '-m', `release ${tagName}（${TODAY}）`], { cwd: ROOT });
ok(`已打 tag：${tagName}`);

console.log('');
console.log('[release] 落版完成。后续（需人工确认后执行）：');
console.log(`  git add CHANGELOG.md server/package.json && git commit -m "release: ${tagName}"`);
console.log(`  git push && git push origin ${tagName}`);
