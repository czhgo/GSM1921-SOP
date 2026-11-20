// role: [工程师]+[AI]
// server/test/card-consistency-guard.test.mjs — 卡厚度与卡头字重（2026-11-20 批次 581）
//
// 判据（`DS_03 §4.2 / §4.21.2`，2026-11-20 改准）：
//   ① 卡内边距只允许 `.card-standard`（16）/ `.card-compact`（12）；`p-5` / `p-6` / `p-8` 不得直接挂在 `.card` 上；
//   ② 手写 `<h3 class="… font-bold …">` 一律改 `font-semibold`（页面卡头 16/600；内嵌面板由 `.card-head--panel` 承担）；
//   ③ `.card-standard` / `.card-compact` 两个出口必须在 `styles.css` 定义（防止只改调用点、出口消失）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const DOCS = join(ROOT, 'docs');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|html)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(DOCS);
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

test('① 卡内边距只走 card-standard / card-compact，不再直接挂 p-5 / p-6 / p-8', () => {
  const bad = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/class="([^"]*)"/g)) {
      const tokens = m[1].split(/\s+/).filter(Boolean);
      if (!tokens.includes('card')) continue;
      const hit = tokens.find((t) => /^p-(5|6|8)$/.test(t));
      if (hit) bad.push(`${rel(file)} → ${hit}`);
    }
  }
  assert.deepEqual(bad, [], `卡内边距越档（改用 card-standard / card-compact）：\n  ${bad.join('\n  ')}`);
});

test('② 手写卡头 H3 一律 font-semibold（16/600）', () => {
  const bad = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/<h3 class="([^"]*)"/g)) {
      if (/\bfont-bold\b/.test(m[1])) bad.push(`${rel(file)} → ${m[1]}`);
    }
  }
  assert.deepEqual(bad, [], `手写 H3 仍用 font-bold（应为 font-semibold）：\n  ${bad.join('\n  ')}`);
});

test('③ 两个卡厚度出口必须在 styles.css 定义', () => {
  const css = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
  assert.match(css, /\.card-standard\s*\{[^}]*padding:\s*var\(--space-4\)/, '.card-standard 必须定义 padding: var(--space-4)');
  assert.match(css, /\.card-compact\s*\{[^}]*padding:\s*var\(--space-3\)/, '.card-compact 必须定义 padding: var(--space-3)');
});
