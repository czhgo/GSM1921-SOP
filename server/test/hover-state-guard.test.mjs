// role: [工程师]+[AI]
// hover-state-guard.test.mjs — hover / active / selected 三态与触屏门控守卫
// （spec redesign-theme-palette-and-density · Task 9）
//
// 为什么要有本守卫：
//   · Task 7 把「四套 hover 机制（filter / 默认灰 / opacity / 硬编码）」收敛为「显式 hoverBg +
//     @media (hover:hover) 门控 + 触屏 :active + 键盘 focus-visible」。这批规则一旦被后续批次
//     改回去（新增裸 :hover、用 filter/opacity/位移当反馈、给静态行加 hover），没有任何红灯。
//   · 判据：
//       H1 门控：styles.css / person-picker.css / about.css / help.html / login.html 的 `:hover`
//          规则必须位于 `@media (hover: hover)` 内（例外白名单逐条给理由）
//       H2 反馈只改颜色：hover 规则体内 filter/opacity/transform/translate/box-shadow 计数为 0
//       H3 页签与 summary：均有 hover / active / focus-visible；静态行/卡无 hover
//       H4 Tailwind：hoverOnlyWhenSupported: true（触屏不触发 hover 工具类）
//       H5 非空转：hover 规则数 >0（解析写坏不得恒绿）
// 运行：node --test server/test/hover-state-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const CSS_FILES = [
  'docs/src/styles.css',
  'docs/src/components/person-picker.css',
  'docs/src/about.css',
];
const HTML_FILES = ['docs/help.html', 'docs/login.html'];

/**
 * 极简 CSS 解析：返回所有「普通规则」（选择器 + 规则体 + 是否被 hover 媒体查询包住）。
 * 只处理 `选择器 { 声明 }` 与 `@media … { … }`；本仓这两类文件没有更深的嵌套。
 * @param {string} css
 * @param {boolean} onlyHover — true 时只返回带 `:hover` 的规则（H1/H2/H5 用）
 */
function parseRules(css, onlyHover = false) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let buf = '';
  const stack = [];
  const rules = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') {
      const pre = buf.trim();
      buf = '';
      const parent = stack[stack.length - 1];
      const inHover = /^@media\s*\(\s*hover\s*:\s*hover\s*\)/.test(pre) || Boolean(parent && parent.inHover);
      stack.push({ pre, inHover, rule: !pre.startsWith('@'), body: '' });
    } else if (ch === '}') {
      const node = stack.pop();
      buf = '';
      if (node && node.rule && (!onlyHover || /:hover/.test(node.pre))) rules.push(node);
    } else {
      buf += ch;
      if (stack.length) stack[stack.length - 1].body += ch;
    }
  }
  return rules;
}

function styleBlocks(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** 每个文件 → hover 规则清单 */
function hoverRulesByFile() {
  const out = new Map();
  for (const rel of CSS_FILES) out.set(rel, parseRules(read(rel), true));
  for (const rel of HTML_FILES) out.set(rel, parseRules(styleBlocks(read(rel)), true));
  return out;
}

/**
 * 门控例外白名单：**只允许**确属「非交互或无法用 hover 背景表达」的规则。
 * 每条必须写清「为什么它不是三态控件」。当前实测 0 条——白名单为空是正常状态；
 * 新增条目须逐条给理由，不得用它给普通按钮/行/卡开后门。
 */
const HOVER_GATE_EXCEPTIONS = [];

test('H1 全仓 :hover 规则必须由 @media (hover: hover) 门控', () => {
  const byFile = hoverRulesByFile();
  const total = [...byFile.values()].reduce((n, r) => n + r.length, 0);
  assert.ok(total > 0, '未解析到任何 :hover 规则（解析口径失效，判据会恒真）');

  const ungated = [];
  for (const [file, rules] of byFile) {
    for (const r of rules) {
      if (r.inHover) continue;
      if (HOVER_GATE_EXCEPTIONS.some((e) => e.file === file && e.test.test(r.pre))) continue;
      ungated.push(`${file} → ${r.pre.replace(/\s+/g, ' ').slice(0, 100)}`);
    }
  }
  console.log(`[hover] 5 个文件共 ${total} 条 :hover 规则，未门控 ${ungated.length} 条`);
  assert.deepEqual(ungated, [],
    `以下 :hover 规则不在 @media (hover: hover) 内（触屏会粘住 hover 态）：\n  ${ungated.join('\n  ')}`);
});

test('H2 hover 反馈只改颜色：filter / opacity / transform / translate / box-shadow 计数为 0', () => {
  const byFile = hoverRulesByFile();
  const propRe = /(?:^|[;\s{])(filter|opacity|transform|translate|box-shadow)\s*:/g;
  const offenders = [];
  let checked = 0;
  for (const [file, rules] of byFile) {
    for (const r of rules) {
      checked += 1;
      const hits = [...r.body.matchAll(propRe)].map((m) => m[1]);
      if (hits.length) offenders.push(`${file} → ${r.pre.replace(/\s+/g, ' ').slice(0, 100)}：${[...new Set(hits)].join('/')}`);
    }
  }
  assert.ok(checked > 0, '未检查到任何 hover 规则（非空转）');
  console.log(`[hover] 检查 hover 规则体 ${checked} 条，非颜色反馈 ${offenders.length} 条`);
  assert.deepEqual(offenders, [],
    `hover 不得用 filter/opacity/transform/translate/box-shadow 充当反馈（只改颜色）：\n  ${offenders.join('\n  ')}`);
});

test('H3 页签与 summary 有三态；静态行/卡不假装可点', () => {
  const rules = parseRules(read('docs/src/styles.css'));
  const has = (re) => rules.some((r) => re.test(r.pre));

  for (const pseudo of [':hover', ':active', ':focus-visible']) {
    assert.ok(has(new RegExp(`\\.tab-btn${pseudo}`)), `.tab-btn 缺少 ${pseudo} 状态`);
    assert.ok(has(new RegExp(`(^|[\\s,])summary${pseudo}`)), `summary 缺少 ${pseudo} 状态`);
  }
  // 页签/摘要的 hover 必须在门控内（H1 已全量核，此处再锁这两个关键控件）
  const tabHover = rules.find((r) => /\.tab-btn:hover/.test(r.pre));
  assert.ok(tabHover && tabHover.inHover, '.tab-btn:hover 必须由 @media (hover: hover) 门控');
  const summaryHover = rules.find((r) => /(^|[\s,])summary:hover/.test(r.pre));
  assert.ok(summaryHover && summaryHover.inHover, 'summary:hover 必须由 @media (hover: hover) 门控');

  // 静态行/卡不得有 hover 背景（不可点就不要装可点）
  // `.gallery-card` 单独核：它是 `role="button" tabindex="0"` 的**可交互卡**（不是静态卡），
  // 允许 hover 只加文字下划线，但不得加背景 / cursor 伪装（见下一条）。
  const staticHover = [];
  for (const sel of ['.row-quiet', '.notice-row', '.list-row', '.card']) {
    const escaped = sel.replace(/\./g, '\\.');
    const re = new RegExp(`(^|[\\s,])${escaped}:hover(\\s|,|$)`);
    if (rules.some((r) => re.test(r.pre))) staticHover.push(sel);
  }
  assert.deepEqual(staticHover, [],
    `静态行/卡出现 hover 伪装（应只在 [data-interactive="true"] / 可点载体上加）：${staticHover.join(' / ')}`);

  const galleryHover = rules.filter((r) => /(^|[\s,])\.gallery-card:hover/.test(r.pre));
  assert.ok(galleryHover.length > 0, '可交互画廊卡应保留 hover（仅文字下划线）');
  for (const r of galleryHover) {
    assert.doesNotMatch(r.body, /(?:^|[;\s])background(?:-color)?\s*:/, '画廊卡 hover 不得改背景（只加文字下划线）');
    assert.doesNotMatch(r.body, /cursor\s*:/, '画廊卡 hover 不得再改 cursor（可点性由 role=button 表达）');
  }

  // 可交互行/卡仍保留 hover
  assert.ok(rules.some((r) => /\.list-row\[data-interactive="true"\]:hover/.test(r.pre)),
    '可交互列表行应有 hover（.list-row[data-interactive="true"]:hover）');
  assert.ok(rules.some((r) => /\.card--interactive:hover/.test(r.pre)),
    '可交互卡应有 hover（.card--interactive:hover）');
});

test('H4 Tailwind hoverOnlyWhenSupported: true（触屏不触发 hover 工具类）', () => {
  const src = read('docs/src/tailwind-config.js');
  assert.match(src, /hoverOnlyWhenSupported\s*:\s*true/, 'tailwind-config.js 应开启 hoverOnlyWhenSupported: true');
});

test('H5 非空转：hover 规则规模下限', () => {
  const byFile = hoverRulesByFile();
  const counts = [...byFile.entries()].map(([f, r]) => `${f}=${r.length}`).join(' · ');
  const total = [...byFile.values()].reduce((n, r) => n + r.length, 0);
  console.log(`[hover] 规则分布：${counts}`);
  // 2026-10-23 批次 505 实测 101 条（styles 82 / person-picker 8 / about 3 / help 7 / login 1）。
  assert.ok(total >= 90, `hover 规则只有 ${total} 条（下限 90）：解析面被削或规则被误删`);
  for (const [f, r] of byFile) assert.ok(r.length > 0, `${f} 未解析到 hover 规则（该文件的选择器写法可能已变）`);
});

// ── H6 / H7：按压态（2026-10-23 批次 507）────────────────────────────────
// 病灶：`--surface-active` 曾是党建红浅底（亮 #FEE2E2 / 暗 #2A1A22），中性按钮一按就闪红，
//   被读成「危险 / 失败」。裁定：中性控件按压＝中性灰，主题色控件＝主题 activeBg，
//   党建红实底＝--party-red-active；反馈只用 1px 内阴影（不位移 / 不缩放），时长 180ms。
test('H6 按压配色三源：中性灰 / 主题 activeBg / 党建红 active', () => {
  const css = read('docs/src/styles.css');
  const active = /--surface-active:\s*([^;]+);/.exec(css);
  assert.ok(active, 'styles.css 缺少 --surface-active');
  assert.equal(active[1].trim(), 'var(--neutral-200)',
    `--surface-active 必须是中性灰 var(--neutral-200)，实际「${active[1].trim()}」`);
  assert.doesNotMatch(css, /--surface-active:\s*#(?:FEE2E2|2A1A22)/i,
    '不得回落到红色浅底（#FEE2E2 / #2A1A22）——中性控件按下不得闪红');
  assert.match(css, /\.btn-tab\.active:active[\s\S]{0,80}?var\(--app-accent-active-bg\)/,
    '主题色选中页签（.btn-tab.active / .tab-btn-active）的按压必须走 --app-accent-active-bg');
  assert.match(css, /\.tab-btn-active:active[\s\S]{0,80}?var\(--app-accent-active-bg\)/,
    '顶栏工作台选中页签的按压必须走 --app-accent-active-bg');
  assert.match(css, /--party-red-active:/, '党建红实底按压仍用 --party-red-active（不得被中性灰顶掉）');
});

test('H7 按压反馈唯一源：180ms + 1px 内阴影，且无位移 / 缩放', () => {
  const css = read('docs/src/styles.css');
  assert.match(css, /--transition-press:\s*180ms/, '缺少 --transition-press: 180ms');
  const shadows = (css.match(/--press-shadow:\s*[^;]+;/g) || []);
  assert.equal(shadows.length, 2, `--press-shadow 应在 :root 与深色段各一处（实测 ${shadows.length}）`);
  // 唯一源：只有那条聚合 :active 规则消费它
  const consumers = (css.match(/box-shadow:\s*var\(--press-shadow\)/g) || []);
  assert.equal(consumers.length, 1, `内阴影消费点应恰 1 处（实测 ${consumers.length}）`);
  // 按压不得位移 / 缩放：聚合规则体内不得出现 transform / scale / translate
  const idx = css.indexOf('box-shadow: var(--press-shadow)');
  const block = css.slice(idx, css.indexOf('}', idx));
  assert.doesNotMatch(block, /transform|scale|translate/, '按压反馈不得用位移 / 缩放');
  // 聚合规则必须覆盖四类按钮与关键控件
  const selStart = css.lastIndexOf(':is(', idx);
  const selectors = css.slice(selStart, css.indexOf(')', selStart));
  for (const s of ['.btn-accent', '.btn-tab', '.btn-outline', '.cs-option', 'summary']) {
    assert.ok(selectors.includes(s), `按压聚合选择器缺 ${s}`);
  }
});
