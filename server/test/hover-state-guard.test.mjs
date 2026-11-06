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

/**
 * 纯判据（H2）：返回 hover 规则体里的「非颜色反馈」属性。
 * 2026-11-01 新裁定（支书 #6 行选中柔和化）：可点行左条改由 `::before` 伪元素承担 `opacity` 过渡——
 *   这是**装饰层淡入**，不是给行本身加透明 / 位移；因此只对「整个选择器列表都指向 ::before/::after」
 *   的规则放行 `opacity` 一个属性。filter / transform / translate / box-shadow 仍一律判红，
 *   元素级 `opacity`（`.x:hover { opacity: .8 }`）也仍判红。
 */
function hoverFeedbackProblems(css) {
  const propRe = /(?:^|[;\s{])(filter|opacity|transform|translate|box-shadow)\s*:/g;
  const out = [];
  for (const r of parseRules(css, true)) {
    const decorative = r.pre.split(',').every((s) => /::(?:before|after)\s*$/.test(s.trim()));
    for (const m of r.body.matchAll(propRe)) {
      if (decorative && m[1] === 'opacity') continue;
      out.push({ pre: r.pre, prop: m[1] });
    }
  }
  return out;
}

test('H2 hover 反馈只改颜色：filter / opacity / transform / translate / box-shadow 计数为 0', () => {
  // ① 反例：元素级 opacity 必须判红；装饰伪元素只放行 opacity（其余属性仍红）
  assert.equal(hoverFeedbackProblems('.x:hover { opacity: 0.8; }').length, 1,
    '反例未被判红：元素级 hover opacity 必须命中');
  assert.deepEqual(hoverFeedbackProblems('.x:hover::before { opacity: 1; }'), [],
    '正例被判红：装饰伪元素 ::before 的 opacity 淡入属于新裁定放行项');
  assert.equal(hoverFeedbackProblems('.x:hover::before { transform: scale(1.1); }').length, 1,
    '反例未被判红：装饰伪元素的 transform 仍须命中');
  assert.equal(hoverFeedbackProblems('.x:hover::after { box-shadow: 0 0 0 3px var(--app-accent); }').length, 1,
    '反例未被判红：装饰伪元素的 box-shadow 仍须命中');
  assert.equal(hoverFeedbackProblems('.x:hover::before, .y:hover { opacity: 1; }').length, 1,
    '反例未被判红：选择器列表混入非伪元素主体时不得按装饰层放行');

  // ② 实况：CSS 文件直读、HTML 取页内 <style>，与 H1 的解析面一致
  const sourceOf = (file) => (HTML_FILES.includes(file) ? styleBlocks(read(file)) : read(file));
  const byFile = hoverRulesByFile();
  let checked = 0;
  for (const rules of byFile.values()) checked += rules.length;
  const offenders = [];
  for (const file of byFile.keys()) {
    for (const p of hoverFeedbackProblems(sourceOf(file))) {
      offenders.push(`${file} → ${p.pre.replace(/\s+/g, ' ').slice(0, 100)}：${p.prop}`);
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

  // 2026-11-01：空壳热区（.disclosure__summary）不铺底色，改用 `summary:not(.disclosure__summary)`
  //   限定有可见文字的披露条 ⇒ 三态判据允许 `:not(...)` 夹在元素与伪类之间。
  const summaryStateRe = (pseudo) => new RegExp(`(^|[\\s,])summary(?::not\\([^)]*\\))*${pseudo}`);
  for (const pseudo of [':hover', ':active', ':focus-visible']) {
    assert.ok(has(new RegExp(`\\.tab-btn${pseudo}`)), `.tab-btn 缺少 ${pseudo} 状态`);
    assert.ok(has(summaryStateRe(pseudo)), `summary 缺少 ${pseudo} 状态`);
  }
  // 页签/摘要的 hover 必须在门控内（H1 已全量核，此处再锁这两个关键控件）
  const tabHover = rules.find((r) => /\.tab-btn:hover/.test(r.pre));
  assert.ok(tabHover && tabHover.inHover, '.tab-btn:hover 必须由 @media (hover: hover) 门控');
  const summaryHover = rules.find((r) => summaryStateRe(':hover').test(r.pre));
  assert.ok(summaryHover && summaryHover.inHover, 'summary:hover 必须由 @media (hover: hover) 门控');
  // 底色反馈必须排除整行空壳热区（否则悬停时整块不透明灰盖住标题）。
  const summaryBgHover = rules.find((r) => summaryStateRe(':hover').test(r.pre) && /background(?:-color)?\s*:/.test(r.body));
  assert.ok(summaryBgHover, 'summary:hover 缺底色反馈（有可见文字的披露条应保留灰底）');
  assert.match(summaryBgHover.pre, /:not\(\.disclosure__summary\)/,
    'summary:hover 的底色反馈必须排除 .disclosure__summary（空壳热区不得铺背景）');

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

test('H7 按压反馈唯一源：反馈档 + 1px 内阴影，且无位移 / 缩放', () => {
  const css = read('docs/src/styles.css');
  // 2026-10-31 P10：按压属反馈档（80–120ms），--transition-press 走 --motion-feedback；
  // 旧 --motion-base 继续作为兼容别名（映射到进入档）但不作按压的唯一源。
  assert.match(css, /--transition-press:\s*(?:var\(--motion-feedback\)|var\(--motion-base\)|120ms|180ms)/, '缺少 --transition-press（反馈档别名）');
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

// ── H10 空壳折叠热区不铺底色（2026-11-01）────────────────────────────────
// 病灶：`.disclosure__summary` 是绝对定位、空内容、覆盖整行 1150×44 的热区；全局
//   `summary:hover{background-color:var(--surface-hover)}` 会把它铺成不透明灰，盖住同列标题文字。
// 判据：凡选择器主体含 `.disclosure__summary` 的规则（含 :hover / :active），
//   `background` / `background-color` 只允许 `transparent` / `none`（缺省即透明）。
/** 纯判据：返回给 .disclosure__summary 铺了非透明背景的规则（便于正反例自检） */
function disclosureBackgroundProblems(css) {
  const out = [];
  for (const r of parseRules(css)) {
    // 先剥掉 `:not(...)`：`summary:not(.disclosure__summary)` 的主体是 summary，不算命中。
    const subject = r.pre.replace(/:not\([^)]*\)/g, '');
    if (!/\.disclosure__summary\b/.test(subject)) continue;
    const m = /(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/.exec(r.body);
    if (!m) continue;
    const value = m[1].trim();
    if (/^(?:transparent|none)$/i.test(value)) continue;
    out.push(`${r.pre.replace(/\s+/g, ' ').slice(0, 100)} → background: ${value}`);
  }
  return out;
}

test('H10 空壳折叠热区不铺底色：.disclosure__summary（含 hover / active）背景必须透明', () => {
  // ① 反例：给空壳热区铺非透明背景 ⇒ 必须判红（hover 与常驻态都算）
  assert.equal(disclosureBackgroundProblems(
    '.disclosure__summary:hover { background-color: var(--surface-hover); }').length, 1,
    '反例未被判红：disclosure__summary:hover 的灰底必须命中');
  assert.equal(disclosureBackgroundProblems(
    '.disclosure__summary { background: var(--surface-active); }').length, 1,
    '反例未被判红：disclosure__summary 常驻底色必须命中');
  // ② 正例：非 disclosure 的 summary 铺底色合法；disclosure 只改颜色 / 显式 transparent 合法
  assert.deepEqual(disclosureBackgroundProblems(
    'summary:hover { background-color: var(--surface-hover); }'), [],
    '正例被判红：普通 summary 的灰底反馈不得误伤');
  assert.deepEqual(disclosureBackgroundProblems(
    '.disclosure__summary:hover { color: var(--neutral-800); }'), [],
    '正例被判红：只改 chevron 颜色（currentColor）不得误判');
  assert.deepEqual(disclosureBackgroundProblems(
    '.disclosure__summary { background-color: transparent; }'), [],
    '正例被判红：显式 transparent 不得误判');
  // ③ 实况
  const offenders = disclosureBackgroundProblems(read('docs/src/styles.css'));
  assert.deepEqual(offenders, [],
    `空壳折叠热区被铺了背景（悬停时整块不透明灰盖住同列标题）：\n  ${offenders.join('\n  ')}`);
});

// ── H11 可点行状态柔和化（2026-11-01 支书 #6）──────────────────────────────
// 病灶：`.list-row` 方角（`border-radius: 0`）＋ hover 用中性灰 `--surface-hover`（灰显脏）；
//   左条是 `background-image` 渐变（渐变无法过渡 ⇒ 左条瞬现）；选中态无圆角（方底套 8px 圆角卡）。
// 裁定：行 8px 圆角（--radius-sm）；可点行 hover 用主题 10% 淡底（--app-accent-tint），
//   灰底只留静态分隔；左条改 `::before` 3px ＋ `opacity` 过渡（--transition-fast）；
//   焦点环 `outline-offset: -2px` 压进行内、随圆角走（环仍只有全站唯一那一条）。
/** 纯判据：返回可点行状态口径的违规项（正反例复用同一口径，避免「反例另写一套」） */
function listRowStateProblems(css) {
  const rules = parseRules(css);
  const subjects = (pre) => pre.split(',').map((s) => s.trim());
  const find = (sel) => rules.filter((r) => subjects(r.pre).includes(sel));
  const problems = [];

  const base = find('.list-row');
  if (!base.length) problems.push('缺 .list-row 规则');
  else if (!base.some((r) => /border-radius:\s*var\(--radius-sm\)/.test(r.body))) {
    problems.push('.list-row 的 border-radius 必须是 var(--radius-sm)（8px 圆角）');
  }

  const hover = find('.list-row[data-interactive="true"]:hover');
  if (!hover.length) problems.push('缺 .list-row[data-interactive="true"]:hover');
  else {
    const body = hover.map((r) => r.body).join('\n');
    if (/(?:^|[;\s])background(?:-color)?\s*:\s*var\(--surface-hover\)/.test(body)) {
      problems.push('可点行 hover 不得再用 --surface-hover（灰底只留静态分隔）');
    }
    if (!/(?:^|[;\s])background(?:-color)?\s*:\s*var\(--app-accent-tint\)/.test(body)) {
      problems.push('可点行 hover 底必须是 --app-accent-tint（主题 10% 淡底）');
    }
  }

  const bar = find('.list-row[data-interactive="true"]::before');
  if (!bar.length) problems.push('缺 .list-row[data-interactive="true"]::before 左条');
  else {
    const body = bar[0].body;
    if (!/width:\s*3px/.test(body)) problems.push('左条宽度应为 3px');
    if (!/opacity:\s*0(?:[;\s]|$)/.test(body)) problems.push('左条静态应为 opacity: 0');
    if (!/transition:\s*opacity var\(--transition-fast\)/.test(body)) {
      problems.push('左条须有 opacity 过渡（--transition-fast），不得瞬现');
    }
  }
  const shown = rules.some((r) => /::before/.test(r.pre) && /opacity:\s*1/.test(r.body));
  if (!shown) problems.push('缺 ::before 的 opacity: 1 显示态（hover / 选中）');

  return problems;
}

const H11_OK = `
.list-row { border-radius: var(--radius-sm); }
.list-row[data-interactive="true"]:hover { background-color: var(--app-accent-tint); }
.list-row[data-interactive="true"]::before {
  content: ''; width: 3px; opacity: 0; transition: opacity var(--transition-fast);
}
@media (hover: hover) {
  .list-row[data-interactive="true"]:hover::before { opacity: 1; }
}
.list-row[data-selected="true"] { border-radius: var(--radius-sm); background: var(--app-accent-soft-bg); }
.list-row[data-selected="true"]::before { opacity: 1; }
`;

test('H11 可点行：8px 圆角 + 主题 10% 淡底 + ::before 左条带 opacity 过渡（含 3 条反例）', () => {
  // ① 正例：合规样本不得误红（含媒体查询内的 hover 规则）
  assert.deepEqual(listRowStateProblems(H11_OK), [], '正例被判红：合规的可点行状态口径不得误判');

  // ② 反例 1：圆角退回 0 ⇒ 必须判红
  const badRadius = H11_OK.replace('.list-row { border-radius: var(--radius-sm); }',
    '.list-row { border-radius: 0; }');
  assert.ok(listRowStateProblems(badRadius).some((p) => p.includes('border-radius')),
    '反例未被判红：行圆角退回 0 必须命中');

  // ③ 反例 2：hover 回灰底 --surface-hover ⇒ 必须判红
  const badHover = H11_OK.replace('background-color: var(--app-accent-tint)',
    'background-color: var(--surface-hover)');
  assert.ok(listRowStateProblems(badHover).some((p) => p.includes('--surface-hover')),
    '反例未被判红：可点行 hover 用灰底必须命中');

  // ④ 反例 3：删掉 ::before 左条 ⇒ 必须判红
  const badBar = H11_OK.replace(/\.list-row\[data-interactive="true"\]::before \{[^}]*\}/, '');
  assert.ok(listRowStateProblems(badBar).some((p) => p.includes('::before')),
    '反例未被判红：缺 ::before 左条必须命中');
  // 反向：只留着 ::before 但去掉 opacity 过渡（瞬现）也须判红
  const badTransition = H11_OK.replace('transition: opacity var(--transition-fast);', '');
  assert.ok(listRowStateProblems(badTransition).some((p) => p.includes('opacity 过渡')),
    '反例未被判红：左条无 opacity 过渡（瞬现）必须命中');

  // ⑤ 实况
  const problems = listRowStateProblems(read('docs/src/styles.css'));
  assert.deepEqual(problems, [], `可点行状态口径不合新裁定：\n  ${problems.join('\n  ')}`);
  // 非空转：判据必须真解析到 .list-row 家族（而不是空串恒绿）
  const rules = parseRules(read('docs/src/styles.css'));
  const rows = rules.filter((r) => /\.list-row/.test(r.pre)).length;
  assert.ok(rows >= 10, `只解析到 ${rows} 条 .list-row 规则（下限 10）：判据面被写坏`);
  console.log(`[hover] H11 可点行规则 ${rows} 条 · 违规 ${problems.length} 处`);
});
