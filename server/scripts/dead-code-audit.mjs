// server/scripts/dead-code-audit.mjs — 死代码清点（2026-11-25 批次 631 · D-929）
//
// 两类「死」分开报，处置不同：
//   ① 根本不能调用 = 模块无人 import、文件名也不在任何动态装载串里 ⇒ 可删；
//   ② 生产不需要 = 开关恒假 / 仅演示用 ⇒ 保留并收门（清单见 `server/run-mode.js` 头注）。
//
// 口径与误差：静态 import / `import('…')` / HTML `<script src>` / 运行时字符串里的文件名。
//   纯正则 ⇒ 只能证明「没找到引用」，不能证明「永远不会被引用」；故删除前须人工复核，
//   本脚本输出的是**候选清单**与可机检的计数基线。
//
// 用法：node server/scripts/dead-code-audit.mjs [--json]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const JSON_OUT = process.argv.includes('--json');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const modules = walk(SRC);
const moduleRel = modules.map((p) => relative(ROOT, p).replace(/\\/g, '/'));
const byBase = new Map();
for (const rel of moduleRel) {
  const b = basename(rel);
  if (!byBase.has(b)) byBase.set(b, []);
  byBase.get(b).push(rel);
}

// 全部可作「引用面」的文本：docs 下所有 js/html
const textFiles = [...modules];
const walkAny = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkAny(p);
    else if (/\.(js|html)$/.test(name)) textFiles.push(p);
  }
};
walkAny(join(ROOT, 'docs'));

const corpus = new Map(); // 相对路径 → 文本
for (const p of new Set(textFiles)) corpus.set(p, readFileSync(p, 'utf8'));

const orphans = [];
for (const p of modules) {
  const rel = relative(ROOT, p).replace(/\\/g, '/');
  const b = basename(rel);
  let referenced = false;
  for (const [other, text] of corpus) {
    if (other === p) continue;
    const otherRel = relative(ROOT, other).replace(/\\/g, '/');
    // 同目录相对路径 / 文件名串 / 动态 import 串
    if (text.includes(b)) { referenced = true; break; }
    if (text.includes(otherRel)) { referenced = true; break; }
  }
  if (!referenced) orphans.push(rel);
}

// 零外部引用的 export（下界：同名串出现在别处即算「可能被引用」）
const unusedExports = [];
for (const p of modules) {
  const rel = relative(ROOT, p).replace(/\\/g, '/');
  const text = readFileSync(p, 'utf8');
  const names = [...text.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  for (const name of names) {
    if (name === 'default') continue;
    let used = false;
    for (const [other, otherText] of corpus) {
      if (other === p) continue;
      if (new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`).test(otherText)) { used = true; break; }
    }
    if (!used) unusedExports.push(`${rel}::${name}`);
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ modules: modules.length, orphans, unusedExports }, null, 2));
} else {
  console.log(`[dead-code] 模块 ${modules.length} 个 · 疑似孤立 ${orphans.length} 个 · 零外部引用导出 ${unusedExports.length} 个`);
  orphans.forEach((x) => console.log('  孤立: ' + x));
  unusedExports.slice(0, 15).forEach((x) => console.log('  导出: ' + x));
  if (unusedExports.length > 15) console.log(`  …另有 ${unusedExports.length - 15} 个（--json 取全量）`);
}
