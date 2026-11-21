// role: [工程师]+[AI]
// server/test/spacing-ratchet-guard.test.mjs — 间距档位与暗色补丁棘轮（2026-11-20 批次 581 续）
//
// 判据：
//   ① 间距工具类只允许 1 / 2 / 3 / 4 / 6 档；其余（5 / 7 / 8 / 1.5 / 2.5 / 3.5 …）计入「自由间距」，
//      存量 1245 处登记为基线，**只减不增**；新增自由值即红。
//   ② `html.theme-dark .text-*` 补丁 23 条登记为基线，**只减不增**；新代码应直接用 `--status-*-text` / `--neutral-*`。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const FREE_SPACING_BASELINE = 1192;
const DARK_TEXT_BASELINE = 22;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|html)$/.test(name)) out.push(full);
  }
  return out;
}

function countFreeSpacing() {
  let total = 0;
  const files = [];
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8');
    let count = 0;
    for (const m of text.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) {
        const hit = /^(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(\d+(?:\.\d+)?)$/.exec(token);
        if (!hit) continue;
        if (![1, 2, 3, 4, 6].includes(Number(hit[1]))) count += 1;
      }
    }
    if (count) {
      total += count;
      files.push(`${relative(ROOT, file).replace(/\\/g, '/')}（${count}）`);
    }
  }
  return { total, files };
}

test('① 间距工具类只允许 1/2/3/4/6 档；自由间距只减不增', () => {
  const { total, files } = countFreeSpacing();
  assert.ok(total <= FREE_SPACING_BASELINE,
    `自由间距 ${total} 超过基线 ${FREE_SPACING_BASELINE}；请改用 1/2/3/4/6 档：\n  ${files.slice(0, 20).join('\n  ')}`);
  assert.ok(total >= FREE_SPACING_BASELINE - 40,
    `自由间距已显著下降（${total} < 基线 ${FREE_SPACING_BASELINE} − 40）：请同批下调基线，保持棘轮只减不增`);
});

test('② 暗色 Tailwind 补丁只减不增（当前 22 条）', () => {
  const css = readFileSync(join(SRC, 'styles.css'), 'utf8');
  const count = (css.match(/html\.theme-dark\s+\.text-[a-z0-9-]+\s*\{/g) || []).length;
  assert.ok(count <= DARK_TEXT_BASELINE, `暗色 Tailwind 补丁 ${count} 超过基线 ${DARK_TEXT_BASELINE}；新代码请用 --status-*-text / --neutral-*`);
});
