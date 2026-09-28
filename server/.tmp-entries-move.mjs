// 一次性 codemod（用完删除）：docs/src/entries/*.js 顶层入口按判据分入 workspace/ 与 pages/。
// 判据：`ws-*-entry.js` ＝ 角色工作台薄壳入口；其余 ＝ 独立页入口（tabs/ 已按台分组，不动）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'docs', 'src', 'entries');
const posix = (p) => p.split(sep).join('/');

const top = readdirSync(DIR).filter((f) => f.endsWith('.js')).sort();
const workspace = top.filter((f) => f.startsWith('ws-'));
const pages = top.filter((f) => !f.startsWith('ws-'));
if (workspace.length !== 7) throw new Error(`workspace 入口应 7 个，实际 ${workspace.length}`);
if (pages.length !== 15) throw new Error(`独立页入口应 15 个，实际 ${pages.length}`);

const MOVE = {};
for (const f of workspace) MOVE[`docs/src/entries/${f}`] = `docs/src/entries/workspace/${f}`;
for (const f of pages) MOVE[`docs/src/entries/${f}`] = `docs/src/entries/pages/${f}`;

for (const [oldRel, newRel] of Object.entries(MOVE)) {
  const to = join(ROOT, newRel);
  mkdirSync(dirname(to), { recursive: true });
  renameSync(join(ROOT, oldRel), to);
}
console.log(`[move] ${Object.keys(MOVE).length} 个入口 → workspace/ ${workspace.length} · pages/ ${pages.length}`);

const SKIP_DIR = new Set(['.git', 'node_modules', 'uploads', 'backups', '.tmp']);
const SKIP_PATH_PREFIX = ['server/.tmp-', '.ctx/logs/', '.ctx/snapshots/'];
const CODE_EXT = new Set(['.js', '.mjs']);
const TEXT_EXT = new Set(['.js', '.mjs', '.html', '.md']);
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(ROOT).filter((p) => {
  const rel = posix(relative(ROOT, p));
  if (SKIP_PATH_PREFIX.some((pre) => rel.startsWith(pre))) return false;
  if (/^server\/data\.db/.test(rel)) return false;
  return TEXT_EXT.has(p.slice(p.lastIndexOf('.')));
});

// Pass A：相对 specifier 重算
const REL_SPEC = /(['"])(\.{1,2}\/[^'"]+?\.js(?:\?[^'"]*)?)\1/g;
let passA = 0;
for (const file of files) {
  if (!CODE_EXT.has(file.slice(file.lastIndexOf('.')))) continue;
  const newRel = posix(relative(ROOT, file));
  const oldRel = Object.entries(MOVE).find(([, v]) => v === newRel)?.[0] ?? newRel;
  const src = readFileSync(file, 'utf8');
  const oldDirAbs = dirname(join(ROOT, oldRel));
  const newDirAbs = dirname(file);
  const next = src.replace(REL_SPEC, (m, q, spec) => {
    const [path, query] = spec.split(/(?=\?)/);
    const targetOldRel = posix(relative(ROOT, resolve(oldDirAbs, path)));
    const targetNewRel = MOVE[targetOldRel];
    const importerMoved = oldRel !== newRel;
    if (!targetNewRel && !importerMoved) return m;
    let rel = posix(relative(newDirAbs, join(ROOT, targetNewRel ?? targetOldRel)));
    if (!rel.startsWith('.')) rel = `./${rel}`;
    passA++;
    return `${q}${rel}${query || ''}${q}`;
  });
  if (next !== src) writeFileSync(file, next);
}
console.log(`[pass A] 相对 specifier 重算 ${passA} 处`);

// Pass B：文本引用（html 的 <script src>、测试与文档里的路径字面量）
const names = Object.keys(MOVE).map((k) => k.split('/').pop());
const alt = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const TEXT_REF = new RegExp(`(entries/)((?:${alt}))`, 'g');
const dirOf = {};
for (const n of workspace) dirOf[n] = 'workspace';
for (const n of pages) dirOf[n] = 'pages';
let passB = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const next = src.replace(TEXT_REF, (m, pre, base) => {
    const g = dirOf[base];
    if (!g) return m;
    passB++;
    return `${pre}${g}/${base}`;
  });
  if (next !== src) writeFileSync(file, next);
}
console.log(`[pass B] 文本引用改写 ${passB} 处`);
console.log('✅ 完成');
