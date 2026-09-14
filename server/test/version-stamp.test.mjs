// server/test/version-stamp.test.mjs — 版本号推导与版本戳纪律（2026-09-14 批次 28，Q-23-8 闭环）
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S3：静态扫描防回潮
//     S1 bump-version 的默认版本号必须由既有戳推导（禁写死「当天日期 + a」）
//     S2 脚本必须含「版本号只允许前进」断言（防同日回退静默通过）
//     S3 全站活动版本戳单一源（活戳取值集合规模为 1）——注释里的历史注记不算缓存键
//   数据层 D1–D6：版本号推导纯函数口径（同日续号 / 跨日归零 / 空集 / 非法形态 / 字母用尽 / 只允许前进）
//
// 背景（Q-23-8）：bump-version.mjs 原无参默认「当天日期 + a」，同日第二次发版会把全站戳往回写
//   （实测 20260914b → 20260914a），而收尾自检只比对「是否等于本次 VERSION」故仍报「0 处残留 ✅」。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextVersionFor, isForward, STAMP_RE, isCommentLine, codePartOf } from '../../docs/scripts/version-next.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'docs');
const SRC_DIR = join(DOCS, 'src');
const TEST_DIR = join(ROOT, 'server', 'test');
const BUMP = join(DOCS, 'scripts', 'bump-version.mjs');

const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => f.slice(ROOT.length + 1).replace(/\\/g, '/');

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'scripts' || name === 'assets' || name === 'data' || name === 'node_modules') continue;
      walk(full, exts, out);
      continue;
    }
    if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

// ── 结构层 ──────────────────────────────────────────────────────────

test('S1 bump-version 默认版本号由既有戳推导（禁写死「当天日期 + a」）', () => {
  const src = read(BUMP);
  assert.match(src, /from '\.\/version-next\.mjs'/, 'bump-version 须 import version-next 单一源');
  assert.match(src, /nextVersionFor\(/, 'bump-version 默认版本号须经 nextVersionFor 推导');
  assert.ok(!/DEFAULT_VERSION\s*=/.test(src),
    '不得再保留「DEFAULT_VERSION = 当天日期 + a」写法——同日第二次发版会回退版本戳');
});

test('S2 bump-version 含「版本号只允许前进」断言', () => {
  const src = read(BUMP);
  assert.match(src, /isForward\(/, 'bump-version 须断言本次版本号不小于仓库现有最大戳');
  assert.match(src, /PREV_MAX/, 'bump-version 须先算出仓库现有最大戳再比对');
});

test('S3 全站活动版本戳单一源（取值集合规模为 1）', () => {
  const files = [
    ...walk(SRC_DIR, ['.js', '.css']),
    ...walk(DOCS, ['.html']),
    ...walk(TEST_DIR, ['.mjs', '.test.js']),
  ];
  const seen = new Map(); // 戳 → 首个出现位置
  for (const f of files) {
    read(f).split(/\r?\n/).forEach((line, i) => {
      // 注释排除规则与 bump-version 的 stamper / 自检同源（整行注释 + 行尾追注均不算缓存键）
      if (isCommentLine(line)) return;
      for (const m of codePartOf(line).matchAll(/\?v=(\d{8}[a-z])/g)) {
        if (!seen.has(m[1])) seen.set(m[1], `${rel(f)}:${i + 1}`);
      }
    });
  }
  assert.ok(seen.size > 0, '未扫描到任何 ?v= 版本戳（扫描根路径可能失效）');
  assert.equal(seen.size, 1,
    `全站只允许一个活动版本戳（实测 ${seen.size} 个：${[...seen.entries()].map(([v, w]) => `${v} @ ${w}`).join(' / ')}）——` +
    '陈旧戳会让浏览器按 URL 分裂出第二个模块实例（注册表/共享状态读空的根因）');
});

// ── 数据层（版本号推导纯函数）───────────────────────────────────────

test('D1 同日续号：取该日最大字母 +1', () => {
  assert.equal(nextVersionFor('20260914', ['20260914b', '20260914a']), '20260914c');
  assert.equal(nextVersionFor('20260914', ['20260914a']), '20260914b');
});

test('D2 跨日归零：他日戳不影响当日', () => {
  assert.equal(nextVersionFor('20260915', ['20260914c', '20260913z']), '20260915a');
});

test('D3 空集合：首次发版为 a', () => {
  assert.equal(nextVersionFor('20260914', []), '20260914a');
  assert.equal(nextVersionFor('20260914', undefined), '20260914a');
});

test('D4 非法形态忽略：只认「8 位日期 + 1 位小写字母」', () => {
  assert.equal(nextVersionFor('20260914', ['20260914b', '2026x1', 'abc', '', null]), '20260914c');
  assert.ok(STAMP_RE.test('20260914a'));
  assert.ok(!STAMP_RE.test('20260914A'), '大写字母不算合法戳（扫描正则同源）');
  assert.ok(!STAMP_RE.test('2026091a'));
});

test('D5 同日字母用尽：显式报错而非静默生成非法戳', () => {
  assert.throws(() => nextVersionFor('20260914', ['20260914z']), /字母已用尽/);
});

test('D6 只允许前进：新版本号不得小于现有最大戳', () => {
  assert.equal(isForward('20260914c', '20260914b'), true);
  assert.equal(isForward('20260914b', '20260914b'), true);
  assert.equal(isForward('20260914a', '20260914b'), false, '同日回退必须被判为不可前进');
  assert.equal(isForward('20260914a', ''), true, '首次发版（无既有戳）视为前进');
});
