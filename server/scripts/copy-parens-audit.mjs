// server/scripts/copy-parens-audit.mjs — 用户可见括注清点（2026-11-25 批次 628 · D-926）
//
// 为什么：界面文案里「（必填）/（选填）/（只读）」这类逐字段同后缀属「此地无银」，
//   现行 DS_03 C5 只管「单句括注 ≤2 个」，不管「该不该写」。本脚本给出清点与分类，
//   `--apply` 时只做**机械删除**（字段状态后缀），其余类型仅出清单，由人按页改写。
//
// 口径：
//   · 只扫 docs/src/**/*.js 与 docs/*.html 的**字符串字面量 / HTML 文本节点**；
//   · 排除 help.html / about.html / about.css / search.html（文档页与冻结件，见 copy-guard 豁免）；
//   · 排除代码括号：只看引号内与标签之间的文本；
//   · 分类：FIELD_STATUS（字段状态）/ READONLY（只读）/ DATE（日期范围）/ EXAMPLE（示例）/
//           CALIBER（口径）/ DUP（字段名重复，人工判）/ OTHER。
//
// 用法：node server/scripts/copy-parens-audit.mjs [--apply] [--json]

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const JSON_OUT = process.argv.includes('--json');

const SKIP_FILES = new Set([
  'docs/help.html',
  'docs/about.html',
  'docs/src/about-entry.js',
  'docs/src/styles/about.css',
  'docs/search.html',
]);

const FIELD_STATUS = ['必填', '选填', '可空', '可选', '可多选', '多选'];
const READONLY = ['只读'];
const PAREN_RE = /（([^（）]{1,40})）/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|html)$/.test(name)) out.push(p);
  }
  return out;
}

function classify(inner) {
  const s = inner.trim();
  if (READONLY.includes(s)) return 'READONLY';
  if (FIELD_STATUS.includes(s)) return 'FIELD_STATUS';
  if (/(至|至今|之前|之后|YYYY|yyyy|近\s*\d+\s*天|本月|本年|季度|MM-DD)/.test(s)) return 'DATE';
  if (/^(如|例|例如|含|不含)/.test(s)) return 'EXAMPLE';
  if (/(口径|按|以|＝|=|计|不含|含)/.test(s)) return 'CALIBER';
  return 'OTHER';
}

/** 只替换字符串字面量内部（引号之间）与 HTML 文本节点（> … < 之间） */
function processText(line, isHtml) {
  if (isHtml) {
    return line.replace(/(>)([^<>{}]*)(<)/g, (m, a, body, b) => `${a}${strip(body)}${b}`);
  }
  return line.replace(/(['"`])((?:\\.|(?!\1).)*)\1/g, (m, q, body) => `${q}${strip(body)}${q}`);
}

function strip(body) {
  return body.replace(PAREN_RE, (m, inner) => {
    const kind = classify(inner);
    if (kind === 'FIELD_STATUS' || kind === 'READONLY') return '';
    return m;
  });
}

const files = [
  ...walk(join(ROOT, 'docs', 'src')),
  ...readdirSync(join(ROOT, 'docs')).filter((n) => n.endsWith('.html')).map((n) => join(ROOT, 'docs', n)),
].filter((p) => !SKIP_FILES.has(relative(ROOT, p).replace(/\\/g, '/')));

const rows = [];
let appliedFiles = 0;
let appliedHits = 0;

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const isHtml = file.endsWith('.html');
  const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  let inBlock = false;
  let changed = false;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trimStart();
    // 注释里的括注不是用户可见文案：整行跳过（含块注释续行）
    const closesHere = inBlock && trimmed.includes('*/');
    if (inBlock || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      if (closesHere) inBlock = false;
      else if (trimmed.startsWith('/*') && !trimmed.includes('*/')) inBlock = true;
      continue;
    }
    const text = isHtml ? (raw.match(/(>)([^<>{}]*)(<)/g) || []).join(' ') : raw;
    for (const m of text.matchAll(PAREN_RE)) {
      rows.push({ file: rel, line: i + 1, inner: m[1], kind: classify(m[1]), text: raw.trim().slice(0, 90) });
    }
    if (APPLY) {
      const after = processText(raw, isHtml);
      if (after !== raw) {
        lines[i] = after;
        changed = true;
        appliedHits += 1;
      }
    }
  }
  if (APPLY && !isHtml) {
    // 模板字符串跨行：整文件再扫一遍「标签之间的文本」，只删 FIELD_STATUS / READONLY 括注
    const joined = lines.join('\n');
    const next = joined.replace(/(>)([^<>{}]*?)(<)/g, (m, a, body, b) => `${a}${strip(body)}${b}`);
    if (next !== joined) {
      lines.length = 0;
      lines.push(...next.split('\n'));
      changed = true;
      appliedHits += 1;
    }
  }
  if (APPLY && changed) {
    writeFileSync(file, lines.join('\n'), 'utf8');
    appliedFiles += 1;
  }
}

const byKind = rows.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] || 0) + 1; return acc; }, {});
if (JSON_OUT) {
  console.log(JSON.stringify({ total: rows.length, byKind, rows }, null, 2));
} else {
  console.log(`[parens] 扫描 ${files.length} 文件 · 命中 ${rows.length} 处`);
  console.log('[parens] 分类：' + Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  for (const r of rows.filter((x) => x.kind === 'FIELD_STATUS' || x.kind === 'READONLY').slice(0, 20)) {
    console.log(`  - ${r.file}:${r.line} （${r.inner}）| ${r.text}`);
  }
  if (APPLY) console.log(`[parens] 已改 ${appliedFiles} 文件 / ${appliedHits} 行`);
  else console.log('[parens] 试运行：加 --apply 执行机械删除（仅 FIELD_STATUS / READONLY）');
}
