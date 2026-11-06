// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/container-width-guard.test.mjs — 页面容器宽度五档守卫（P4 · 2026-10-29）
// ════════════════════════════════════════════════════════════════
// 判据（静态扫描，纯 node）：
//   C0 五档表与卡片栅格单一源在位（styles.css 注释表 ＋ `.card-grid`）；
//   C1 `docs/*.html` 与 `docs/workspace/*.html` 的容器宽度类只允许五档
//      （28rem / 48rem / 64rem / 72rem / 80rem；About 冻结件白名单，见下）；
//   C2 任何 `max-width` 的 rem/px 定值也必须落在这五档（% / em / max-content 等非容器定值不管）；
//   C3 反例：`max-w-2xl`（42rem）与 `1320px` 必须判红（证明比较器不是恒真）；
//   C4 非空转下限：扫描页面数 ≥ 20；
//   C5 本守卫须登记在 `test:daily`。
//
// About 白名单理由：`docs/about.html` 是 2026-10-27 支书裁定的独立冻结件，由
//   `about-freeze-guard` 整文件哈希锁死（改一个字节即红）；宽度归一会与冻结基线冲突，
//   故本守卫整页豁免，且**只豁免这一个文件**。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const DOCS = join(ROOT, 'docs');
const STYLES = readFileSync(join(DOCS, 'src', 'styles.css'), 'utf8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'server', 'package.json'), 'utf8'));
const read = (abs) => readFileSync(abs, 'utf8');

/** 五档单一源（与 styles.css 注释表同口径）。 */
const TIERS = { '28rem': '登录卡', '48rem': '标准阅读 / 表单', '64rem': '详情 / 设置', '72rem': '列表与工作台', '80rem': '表格密集页' };

/** Tailwind 最大宽度工具类 → 档位（未列出的 `max-w-*` 一律判红）。 */
const MAX_W_TOKENS = {
  'max-w-md': '28rem',
  'max-w-3xl': '48rem',
  'max-w-5xl': '64rem',
  'max-w-6xl': '72rem',
  'max-w-7xl': '80rem',
};

/** 页面骨架类（显式声明的容器修饰符）→ 档位。 */
const SHELL_TOKENS = {
  'layout-shell--content': '72rem',
  'layout-shell--wide': '80rem',
  'page-frame--content': '72rem',
  'page-frame--wide': '80rem',
};

const ABOUT_EXEMPT = 'docs/about.html';

function pageFiles() {
  return [
    ...readdirSync(DOCS).filter((n) => n.endsWith('.html')).map((n) => join(DOCS, n)),
    ...readdirSync(join(DOCS, 'workspace')).filter((n) => n.endsWith('.html')).map((n) => join(DOCS, 'workspace', n)),
  ];
}

const rel = (abs) => abs.slice(ROOT.length + 1).replace(/\\/g, '/');

/** 像素 → rem（16px 根字号）；不整除即判 red。 */
function pxTier(value) {
  const n = parseFloat(value);
  const rem = n / 16;
  return Number.isInteger(rem) ? `${rem}rem` : '';
}

/** 检查单个页面源码，返回违规列表。 */
function violationsOf(src, file) {
  const bad = [];
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/).filter(Boolean)) {
      if (token.startsWith('max-w-')) {
        if (!MAX_W_TOKENS[token]) bad.push(`宽度类 ${token} 不在五档表（只允许 ${Object.keys(MAX_W_TOKENS).join(' / ')}）`);
      } else if (/^(layout-shell|page-frame)--/.test(token) && !SHELL_TOKENS[token]) {
        bad.push(`容器修饰类 ${token} 不在五档表`);
      }
    }
  }
  // 只核对 max-width 的 rem/px 定值；百分比 / em / max-content 等阅读宽度不算容器档。
  const styleScopes = [
    ...[...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
    ...[...src.matchAll(/style="([^"]*)"/g)].map((m) => m[1]),
  ];
  for (const scope of styleScopes) {
    for (const m of scope.matchAll(/max-width\s*:\s*([^;}"']+)/g)) {
      const value = m[1].trim();
      const numeric = /^([\d.]+)(rem|px)$/.exec(value);
      if (!numeric) continue;
      const tier = numeric[2] === 'px' ? pxTier(value) : `${numeric[1]}rem`;
      if (!TIERS[tier]) bad.push(`${file}：max-width ${value} 不在五档表`);
    }
  }
  return bad;
}

test('C0 五档表与卡片栅格单一源在位', () => {
  for (const tier of Object.keys(TIERS)) {
    assert.ok(STYLES.includes(tier), `styles.css 五档表缺 ${tier}`);
  }
  assert.match(STYLES, /\.card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(18rem,\s*1fr\)\)/,
    '卡片栅格须单一源 .card-grid = repeat(auto-fill, minmax(18rem, 1fr))');
  assert.match(STYLES, /\.card-grid\s*\{[^}]*gap:\s*var\(--space-4\)/, '卡片栅格间距须为 --space-4');
  assert.match(STYLES, /\/\*\s*═+[\s\S]*?P4 一套栅格[\s\S]*?═+\s*\*\//, 'styles.css 须保留 P4 五档表注释');
  assert.match(STYLES, /\.page-frame--wide\s*\{\s*max-width:\s*80rem/, '党委台 / 支部只读的 80rem 宽表档须在位');
});

test('C1/C2 页面容器宽度只允许五档（About 冻结件豁免）', () => {
  const files = pageFiles().filter((f) => rel(f) !== ABOUT_EXEMPT);
  const bad = [];
  for (const f of files) bad.push(...violationsOf(read(f), rel(f)));
  assert.deepEqual(bad, [], `页面容器宽度不在五档表：\n  ${bad.join('\n  ')}`);
});

test('C3 反例：max-w-2xl（42rem）与 1320px 必须判红', () => {
  const notice = read(join(DOCS, 'notice.html'));
  assert.ok(notice.includes('max-w-3xl'), '反例基线须先含 max-w-3xl（48rem 档）');
  const red42 = violationsOf(notice.replace('max-w-3xl', 'max-w-2xl'), 'fixture.html');
  assert.ok(red42.some((s) => s.includes('max-w-2xl')), '42rem（max-w-2xl）未被判红');

  const help = read(join(DOCS, 'help.html'));
  assert.ok(help.includes('max-width: 80rem'), '反例基线须先含 80rem 档');
  const redPx = violationsOf(help.replace('max-width: 80rem', 'max-width: 1320px'), 'fixture.html');
  assert.ok(redPx.some((s) => s.includes('1320px')), '1320px 定值未被判红');

  // 负例：48rem / 72rem / 80rem 合法，不得误伤
  assert.deepEqual(violationsOf('<div class="max-w-3xl"></div><div class="max-w-6xl"></div>', 'ok.html'), []);
  assert.deepEqual(violationsOf('<style>.x { max-width: 80rem; }</style>', 'ok.html'), []);
});

test('C4 非空转下限：扫描页面数 ≥ 20', () => {
  const files = pageFiles().filter((f) => rel(f) !== ABOUT_EXEMPT);
  assert.ok(files.length >= 20, `只扫描到 ${files.length} 个页面（下限 20）：扫描面被写坏`);
  assert.equal(files.filter((f) => rel(f) === ABOUT_EXEMPT).length, 0, 'About 须继续豁免（白名单不得误伤）');
});

test('C5 守卫登记在 test:daily', () => {
  assert.match(PKG.scripts['test:daily'], /container-width-guard\.test\.mjs/, 'test:daily 须登记本守卫');
});
