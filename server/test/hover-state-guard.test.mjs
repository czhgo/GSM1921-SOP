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
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
  // 2026-10-24 批次 508：login.html 的 hover 覆盖已删除（深色键曾因此变灰），
  //   该页现在继承各按钮族自己的 hover ⇒ 允许 0 条，但仍要求其余文件非空。
  assert.ok(total >= 85, `hover 规则只有 ${total} 条（下限 85）：解析面被削或规则被误删`);
  for (const [f, r] of byFile) {
    if (f === 'docs/login.html') continue;
    assert.ok(r.length > 0, `${f} 未解析到 hover 规则（该文件的选择器写法可能已变）`);
  }
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
  // 2026-10-24 批次 508：按压时长改由 --motion-base（180ms）承担，--transition-press 保留为别名。
  assert.match(css, /--transition-press:\s*(?:180ms|var\(--motion-base\))/, '缺少 --transition-press（180ms 或 --motion-base 别名）');
  const shadows = (css.match(/--press-shadow:\s*[^;]+;/g) || []);
  assert.equal(shadows.length, 2, `--press-shadow 应在 :root 与深色段各一处（实测 ${shadows.length}）`);
  // 唯一源：聚合 :active 规则 ＋ `.motion-press` 工具类各一处（后者供动态生成按钮）
  const consumers = (css.match(/box-shadow:\s*var\(--press-shadow\)/g) || []);
  assert.equal(consumers.length, 2, `内阴影消费点应恰 2 处（实测 ${consumers.length}）`);
  // 按压不得位移 / 缩放：聚合规则体内不得出现 transform / scale / translate
  const idx = css.indexOf(':is(.btn-accent');
  assert.ok(idx > -1, '缺少按压聚合规则 :is(.btn-accent, …):active');
  const block = css.slice(idx, css.indexOf('}', idx));
  assert.doesNotMatch(block, /transform|scale|translate/, '按压反馈不得用位移 / 缩放');
  // 聚合规则必须覆盖四类按钮与关键控件
  const selStart = css.lastIndexOf(':is(', idx);
  const selectors = css.slice(selStart, css.indexOf(')', selStart));
  for (const s of ['.btn-accent', '.btn-tab', '.btn-outline', '.cs-option', 'summary']) {
    assert.ok(selectors.includes(s), `按压聚合选择器缺 ${s}`);
  }
});

// ── H8 / H9：可点光标必须有三态 ＋ role=button 必须键盘可达（2026-10-28 批次 520）──
// 病灶：本轮补 23 处可交互表面时发现，`cursor: pointer` 单独出现会让元素「看起来能点」，
//   但既无 hover 也无 active；`role="button"` 若不带 tabindex，读屏能读出按钮、键盘却进不去。
// 判据：
//   H8 所有声明 `cursor: pointer` 的类，必须能在某条 `:hover` 或 `:active` 规则里找到同名类。
//   H9 所有产出 `role="button"` 的标签，本身必须是 `<button>` / `<a>`，否则同标签必须带 `tabindex`。
// 两条都带反例（写坏正则 / 判据写反 ⇒ 立即判红）。

/** 全部规则（CSS 文件 ＋ HTML 页内 <style>），用于 H8 */
function allRules() {
  const out = [];
  for (const rel of CSS_FILES) out.push({ file: rel, rules: parseRules(read(rel)) });
  for (const rel of HTML_FILES) out.push({ file: rel, rules: parseRules(styleBlocks(read(rel))) });
  return out;
}

/** 取选择器列表里每个选择器的「主语复合选择器」中的类名（祖先 / 后代类不算） */
function subjectClasses(selector) {
  const out = new Set();
  for (const part of selector.split(',')) {
    const subject = part.trim().split(/\s*[>+~]\s*|\s+/).pop() || '';
    for (const m of subject.matchAll(/\.([a-zA-Z_][\w-]*)/g)) out.add(m[1]);
  }
  return out;
}

/** 纯判据（H8）：返回未被 :hover / :active 覆盖的 cursor:pointer 类 */
function cursorStateProblems(files) {
  const covered = new Set();
  for (const { rules } of files) {
    for (const r of rules) {
      if (!/:hover|:active/.test(r.pre)) continue;
      // 覆盖判定允许祖先位：如 `.help-toc-dot-item:hover .dot-mark` 已给整项提供了 hover 反馈
      for (const m of r.pre.matchAll(/\.([a-zA-Z_][\w-]*)/g)) covered.add(m[1]);
    }
  }
  const problems = [];
  let rows = 0;
  for (const { file, rules } of files) {
    for (const r of rules) {
      if (!/(?:^|[;\s])cursor\s*:\s*pointer/.test(r.body)) continue;
      rows += 1;
      for (const cls of subjectClasses(r.pre)) {
        if (!covered.has(cls)) problems.push({ file, cls });
      }
    }
  }
  return { problems, rows };
}

/** 纯判据（H9）：返回缺 tabindex 的 role=button 非原生控件 */
function roleButtonProblems(src) {
  const problems = [];
  let total = 0;
  const re = /<([a-zA-Z][\w-]*)\b([^>]*\brole="button"[^>]*)>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    total += 1;
    const tag = m[1].toLowerCase();
    if (tag === 'button' || tag === 'a') continue;
    if (!/\btabindex\s*=/.test(m[2])) problems.push(m[0].replace(/\s+/g, ' ').slice(0, 100));
  }
  return { problems, total };
}

/** 递归收集 docs 下 .js / .html（跳过依赖目录） */
function walkCode(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'vendor' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkCode(p, out);
    else if (name.endsWith('.js') || name.endsWith('.html')) out.push(p);
  }
  return out;
}

/**
 * H8 登记例外（逐条写理由；只收「状态由同元素其它类 / 元素级规则提供」与本轮冻结件）：
 *   · `.todo-more__btn` 与 `.btn-outline` 同元素（`todo-list.js:144`），状态由按钮族提供；
 *   · `.modal-fieldset__summary` 是 `<summary>` 元素，状态由全局 `summary:hover/active` 提供；
 *   · `.ab-tl-center` 属 About 冻结件，整行 `.ab-tl-row` 承担展开态，待支书点头后单独补。
 */
const CURSOR_STATE_EXEMPT = [
  { file: 'docs/src/styles.css', cls: 'todo-more__btn', why: '与 .btn-outline 同元素，状态由按钮族提供' },
  { file: 'docs/src/styles.css', cls: 'modal-fieldset__summary', why: '<summary> 元素，状态由全局 summary:hover/active 提供' },
  { file: 'docs/src/about.css', cls: 'ab-tl-center', why: 'About 冻结件，整行承担展开态，待支书点头后单独补' },
];

test('H8 声明 cursor:pointer 的类必须有 :hover 或 :active（反例：只有光标没有状态）', () => {
  // ① 反例：只有 cursor:pointer、无任何 hover / active ⇒ 必须判红
  const planted = [{ file: 'probe.css', rules: parseRules('.probe { cursor: pointer; }\n.probe:hover { color: red; }') }];
  assert.equal(cursorStateProblems([{ file: 'probe.css', rules: parseRules('.probe { cursor: pointer; }') }]).problems.length, 1,
    '反例未被判红：无 hover / active 的 cursor:pointer 必须命中');
  // ② 正例：hover 或 active 任一存在 ⇒ 不得误红
  assert.deepEqual(cursorStateProblems(planted).problems, [], '正例被判红：有 :hover 的可点类不得误判');
  assert.deepEqual(cursorStateProblems([{ file: 'probe.css', rules: parseRules('.probe { cursor: pointer; }\n.probe:active { color: red; }') }]).problems, [],
    '正例被判红：有 :active 的可点类不得误判');

  // ③ 实况
  const files = allRules();
  const { problems, rows } = cursorStateProblems(files);
  const exempt = new Map(CURSOR_STATE_EXEMPT.map((e) => [`${e.file}|${e.cls}`, e]));
  for (const e of CURSOR_STATE_EXEMPT) {
    assert.ok(e.why && e.why.length >= 8, `H8 例外 .${e.cls} 缺理由（新增例外须写清谁提供了状态）`);
    assert.ok(problems.some((p) => p.file === e.file && p.cls === e.cls),
      `H8 例外 .${e.cls} 已不再命中（僵尸例外，请删除）`);
  }
  assert.ok(CURSOR_STATE_EXEMPT.length <= 3, `H8 例外涨到 ${CURSOR_STATE_EXEMPT.length} 条（上限 3）：只许逐条给理由、不许扩表`);
  const offenders = problems.filter((p) => !exempt.has(`${p.file}|${p.cls}`))
    .map((p) => `${p.file} → .${p.cls}（cursor:pointer 但无 :hover / :active）`);
  assert.ok(rows >= 30, `只扫描到 ${rows} 条 cursor:pointer 规则（下限 30）：判据面被写坏`);
  console.log(`[hover] H8 cursor:pointer 规则 ${rows} 条 · 无状态且未登记 ${offenders.length} 处（登记例外 ${CURSOR_STATE_EXEMPT.length}）`);
  assert.deepEqual(offenders, [],
    `以下类只声明了 cursor:pointer，却没有 :hover / :active（看起来能点、实际没有反馈）：\n  ${offenders.join('\n  ')}`);
});

test('H9 产出 role="button" 的组件必须同时产出 tabindex（或本身是原生 button / a）', () => {
  // ① 反例：div 宣告按钮却无 tabindex ⇒ 必须判红
  assert.equal(roleButtonProblems('<div role="button" class="x">开办</div>').problems.length, 1,
    '反例未被判红：无 tabindex 的 role=button 必须命中');
  // ② 正例：带 tabindex / 原生 button / 原生 a ⇒ 不得误红
  assert.deepEqual(roleButtonProblems('<div role="button" tabindex="0">开办</div>').problems, [],
    '正例被判红：带 tabindex 的 role=button 不得误判');
  assert.deepEqual(roleButtonProblems('<button role="button">开办</button>').problems, [],
    '正例被判红：原生 button 不需要额外 tabindex');
  assert.deepEqual(roleButtonProblems('<a role="button" href="#">开办</a>').problems, [],
    '正例被判红：原生 a 不需要额外 tabindex');

  // ③ 实况：docs 全量 .js ＋ .html
  const files = walkCode(join(ROOT, 'docs')).map((abs) => ({ abs, src: readFileSync(abs, 'utf8') }));
  let total = 0;
  const problems = [];
  for (const { abs, src } of files) {
    const r = roleButtonProblems(src);
    total += r.total;
    problems.push(...r.problems.map((p) => `${abs.slice(ROOT.length + 1).replace(/\\/g, '/')} → ${p}`));
  }
  assert.ok(total >= 20, `只扫描到 ${total} 个 role="button" 标签（下限 20）：判据面被写坏`);
  console.log(`[hover] H9 role=button 标签 ${total} 个 · 缺 tabindex ${problems.length} 处`);
  assert.deepEqual(problems, [],
    `role="button" 不带 tabindex，键盘无法进入（能改原生 button / a 的优先改原生）：\n  ${problems.join('\n  ')}`);
});
