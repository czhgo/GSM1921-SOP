// role: [工程师]+[AI]
// bom-and-eol-guard.test.mjs — 文件头 BOM 唯一性 ＋ frontmatter 锚点（2026-11-21 批次 593 · D-903）
//
// 判据来源：本轮实测出现 `EF BB BF ×3`（PowerShell `Set-Content -Encoding UTF8` 反复重写导致），
//   三重 BOM 会让 `---` 不在首字符，`docs-governance-guard` / `ctx-hygiene-guard` 的前缀锚点整体失效，
//   而既有守卫都不查这一层。三条判据：
//   ① 任何受管文本文件开头不得出现 ≥2 个 BOM；
//   ② 含 frontmatter（前 12 行内有 `title:` / `type:`）的 `.md`，去掉可选单 BOM 后必须以 `---` 起始；
//   ③ 反例自证：三重 BOM / frontmatter 前有空白，判定函数必须判红。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOTS = ['docs', 'content', '.ctx', 'server'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.browsers', 'backups', 'uploads', '.tmp', '.trae', '.trae-html-share-packages']);
const TEXT_EXT = new Set(['.md', '.mjs', '.js', '.json', '.css', '.html', '.ps1', '.sh', '.yml', '.yaml', '.txt', '.sql']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(path.extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

/** 判定本体（T1 / T2 / T3 共用，避免两套口径） */
function inspect(raw) {
  const bomCount = (raw.match(/^\uFEFF+/) || [''])[0].length;
  const single = raw.replace(/^\uFEFF/, '');
  const head = single.split(/\r?\n/).slice(0, 12).join('\n');
  const hasFrontmatter = /^(title|type):/m.test(head);
  const anchored = /^---\r?\n/.test(single);
  return { bomCount, hasFrontmatter, anchored };
}

const FILES = ROOTS.flatMap((r) => walk(path.join(ROOT, r)));
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

test('① 受管文本文件开头不得出现 ≥2 个 BOM', () => {
  const bad = [];
  for (const f of FILES) {
    const { bomCount } = inspect(readFileSync(f, 'utf8'));
    if (bomCount >= 2) bad.push(`${rel(f)}（BOM ×${bomCount}）`);
  }
  assert.deepEqual(bad, [], `文件头出现多个 BOM：\n  ${bad.join('\n  ')}`);
});

test('② 含 frontmatter 的 .md 必须从 --- 起始（允许单个 BOM）', () => {
  const bad = [];
  for (const f of FILES) {
    if (path.extname(f).toLowerCase() !== '.md') continue;
    const { hasFrontmatter, anchored } = inspect(readFileSync(f, 'utf8'));
    if (hasFrontmatter && !anchored) bad.push(rel(f));
  }
  assert.deepEqual(bad, [], `frontmatter 未锚定在首行（前面有空白 / 多余 BOM）：\n  ${bad.join('\n  ')}`);
});

test('③ 反例自证：三重 BOM 与 frontmatter 前空白都必须判红', () => {
  assert.equal(inspect('---\ntitle: x\n---\n').bomCount, 0);
  assert.equal(inspect('\uFEFF---\ntitle: x\n---\n').anchored, true);
  const threeBom = inspect('\uFEFF\uFEFF\uFEFF---\ntitle: x\n---\n');
  assert.equal(threeBom.bomCount, 3, '三重 BOM 未被计数');
  const shifted = inspect('\n\n---\ntitle: x\n---\n');
  assert.equal(shifted.hasFrontmatter, true);
  assert.equal(shifted.anchored, false, 'frontmatter 前有空白却判为已锚定');
});
