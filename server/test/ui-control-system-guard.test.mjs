// role: [工程师]+[AI]
// server/test/ui-control-system-guard.test.mjs — 控件层单一源守卫（2026-10-23 · R11 Task 12.1）
//
// 本文件由 `ui-control-system-guard.test.mjs` / `button-system-guard.test.mjs` 合并而来（2026-10-24 批次 509）：
//   原 `button-system-guard` 的 B1–B8 断言**逐条搬入本文件末尾**，未删一条；文件内变量改名仅为避开
//   本文件已有的 `FILES`（控件扫描结果），判据与基线数值一字未动。
//   为什么做一个而不是两个：两者检查的是**同一批 `<button>` 的类名与 `styles.css` 的控件规则**，
//   失败根因都是「控件外观没有走单一源（族 / 尺寸 / 边框 / 颜色）」；拆开只会让同一次改动在两处各红一次。
//
// 来源：`.trae/specs/refine-ui-system-and-close-r10/spec.md` 的 SD-1/2/3/4/6/9/10
//   与 `.ctx/logs/archive/2026-10/2026-10-AUDIT_UI_R11.md` 第五节「SD-1…SD-11 可断言化」。
// 判据（全部静态、纯 node，不起服务、不开浏览器）：
//   SD-1 文本 / 日期 / 下拉 / 多行控件必须挂 `.input-flat` / `.input-flat-sm`；
//        同串不得再出现 `text-sm`、`rounded`/`rounded-lg`、独立 `border`（白名单逐条写理由）。
//   SD-2 边框必须有颜色：CSS 不得出现无颜色 `border: … solid;`；
//        JS/HTML 里 `<button class="… border …">` 的独立 `border` 必须同串有 `border-*` 色类或内联 `border-color`。
//   SD-3 控件圆角只能 8px（`--radius-sm`）；CSS 字面量不得出现 4px / 6px（允许 calc / 999px；
//        `.tab-group-label` 的 3px 直角是 SD-3 登记例外，见 DESIGN_SYSTEM §12.6 / §12.15）。
//   SD-4 `summary` 的 UA 三角由全局规则移除；`<summary>` 上 `list-none` 例外数必须为 0。
//   SD-6 `.btn-accent-soft` 不得用 `--neutral-0` 当底色；`--app-accent-deep` 必须存在且被用作文字色。
//   SD-9 页签组名必须是可见文本（不是空 span），组间存在 `.tab-group-sep`。
//   SD-10 今天页 / 待办页不得出现 `text-[10px]` / `text-[11px]`；`--text-xs` ≥ 0.75rem。
//
// 非空转：每类断言都有命中基线（控件 > 200、按钮 > 300、radius 声明 > 100、summary > 20、
//   solid 边框 > 50），并校验白名单每条至少命中 1 次——正则写坏或面被截断都会变红，而不是恒真。
// 运行：node --test server/test/ui-control-system-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCENT_COLORS } from '../../docs/src/core/domain/constants.js?v=20261031a';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8');
/** 剥注释（保留换行）：规则选择器解析用——注释里的示例类名不参与判据 */
const CSS_BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const TAB_BAR = readFileSync(join(SRC, 'components', 'shell', 'tab-bar.js'), 'utf8');
const TODAY = readFileSync(join(SRC, 'entries', 'tabs', 'today', 'today-tab.js'), 'utf8');
const TODO_SHELL = readFileSync(join(SRC, 'components', 'record', 'todo-tab-shell.js'), 'utf8');
const WORK_OVERVIEW = readFileSync(join(SRC, 'components', 'governance', 'work-overview.js'), 'utf8');
const STATS = readFileSync(join(SRC, 'components', 'dashboard', 'stats.js'), 'utf8');
const LIST_ROW = readFileSync(join(SRC, 'components', 'ui', 'list-row.js'), 'utf8');

/** 递归收集 docs/src 的 .js ＋ docs/*.html（与 SD-1 的扫描面一致） */
function collectFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (name === 'node_modules' || name === 'vendor') continue;
        walk(p);
      } else if (name.endsWith('.js')) out.push(p);
    }
  };
  walk(SRC);
  for (const name of readdirSync(join(ROOT, 'docs'))) {
    if (name.endsWith('.html')) out.push(join(ROOT, 'docs', name));
  }
  return out;
}

/** 剥注释但**保留换行**（行号可核）；HTML 不剥 `//`，避免把 `https://` 截断 */
function stripComments(src, isHtml) {
  let s = String(src)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  if (!isHtml) s = s.replace(/\/\/.*$/gm, '');
  return s;
}

const FILES = collectFiles().map((p) => {
  const isHtml = p.endsWith('.html');
  return {
    abs: p,
    rel: relative(ROOT, p).replace(/\\/g, '/'),
    src: readFileSync(p, 'utf8'),
    code: stripComments(readFileSync(p, 'utf8'), isHtml),
  };
});

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const classOf = (tag) => (/class="([^"]*)"/.exec(tag) || [null, ''])[1];

/**
 * SD-1 白名单（逐条写理由；不按名字猜）：
 *   · person-picker-search —— 选人器搜索框，完整字段定义在 `components/person-picker.css:168`
 *     （描边 / 8px / 焦点环齐备）；它是「搜索」语义，不并入 `.input-flat`，避免覆盖选择器内部排版。
 *   · help-search-input —— 帮助页搜索，`docs/help.html:135` 内联完整定义（描边 / 8px / 焦点）。
 *   · cs-search-input —— 自定义下拉的内嵌搜索，`styles.css:1223` 完整定义（描边 / 8px / 焦点）。
 *   · vote-note —— 表态附言多行框，`styles.css:2460` 完整定义（白底 / 1px / 8px / focus）。
 *   · help-role-filter —— 帮助页身份筛选下拉，`docs/help.html:149` 完整定义。
 *   2026-10-28：`login-input` 条目删除——登录页输入框已并入 `.input-flat`（支书裁定「控件入族」），
 *   白名单条目失去命中对象（僵尸白名单应删，不得为保绿留下）。
 */
const INPUT_WHITELIST = [
  { token: 'person-picker-search', reason: '选人器搜索框，person-picker.css:168 完整定义' },
  { token: 'help-search-input', reason: '帮助页搜索，help.html:135 内联完整定义' },
  { token: 'cs-search-input', reason: '自定义下拉内嵌搜索，styles.css:1223 完整定义' },
  { token: 'vote-note', reason: '表态附言多行框，styles.css:2460 完整定义' },
  { token: 'help-role-filter', reason: '帮助页身份筛选，help.html:149 内联完整定义' },
];
const WHITELIST_RE = new RegExp(`(^|\\s)(${INPUT_WHITELIST.map((w) => w.token).join('|')})(\\s|$)`);

/**
 * SD-1 存量（只许降不许升）：R11 Task 2 未清完的 ad-hoc 覆盖。
 * `docs/src` 下 JS 文件的所有权不在 Task 12.1（本任务只能改 `styles.css` 与测试），故按本仓
 * 「收基线纪律」登记为棘轮：清理一处即从表中删一条 / 减计数；新增同类立刻变红。
 */
const SD1_LEGACY = [
  {
    rel: 'docs/src/components/feedback/issue-detail.js',
    kind: 'rounded',
    max: 2,
    reason: '议题详情状态下拉仍带 `rounded`（Task 2 存量；JS 所有权不在 12.1）',
  },
  {
    rel: 'docs/src/components/governance/workgroup-member-editor.js',
    kind: 'text-sm',
    max: 1,
    reason: '工作组分工下拉仍带 `text-sm`（Task 2 存量；JS 所有权不在 12.1）',
  },
];

const CONTROL_RE = /<(input|select|textarea)\b[^>]*>/g;

test('SD-1 控件类单一源：input/select/textarea 必须挂 .input-flat(.input-flat-sm)，且不得再写 ad-hoc 覆盖', () => {
  let total = 0;
  const whitelistHits = new Map(INPUT_WHITELIST.map((w) => [w.token, 0]));
  const unclassified = [];
  const issues = [];

  for (const f of FILES) {
    let m;
    CONTROL_RE.lastIndex = 0;
    while ((m = CONTROL_RE.exec(f.code)) !== null) {
      const tag = m[0];
      const cls = classOf(tag);
      const type = (/type="([^"]*)"/.exec(tag) || [null, ''])[1];
      // checkbox / radio / file / hidden 不属文本控件（spec 明文排除）。
      if (/^(checkbox|radio|file|hidden)$/i.test(type)) continue;
      total += 1;
      const at = `${f.rel}:${lineOf(f.code, m.index)}`;

      const wl = INPUT_WHITELIST.find((w) => new RegExp(`(^|\\s)${w.token}(\\s|$)`).test(cls));
      if (wl) { whitelistHits.set(wl.token, whitelistHits.get(wl.token) + 1); continue; }

      // 表单积木的 class 由函数内常量提供（`${cls}`），常量值必须是 input-flat。
      if (/\$\{cls\}/.test(cls)) {
        assert.equal(f.rel, 'docs/src/components/ui/form-field.js',
          `${at}：只有 form-field.js 允许用 \${cls} 间接提供控件类`);
        const flatDecls = [...f.code.matchAll(/const cls = [^\n]*'input-flat[^']*'/g)].length;
        assert.ok(flatDecls >= 4, `form-field.js 的 cls 常量少于 4 处 input-flat（实际 ${flatDecls}）`);
        continue;
      }

      if (!/(^|\s)input-flat(-sm)?(\s|$)/.test(cls)) {
        unclassified.push(`${at} type=${type || '—'} class="${cls.trim()}"`);
        continue;
      }

      const standaloneBorder = /(^|\s)border(\s|$)/.test(cls);
      if (/(^|\s)text-sm(\s|$)/.test(cls)) issues.push({ rel: f.rel, kind: 'text-sm', at, cls });
      if (/(^|\s)rounded(-lg)?(\s|$)/.test(cls)) issues.push({ rel: f.rel, kind: 'rounded', at, cls });
      if (standaloneBorder) issues.push({ rel: f.rel, kind: 'border', at, cls });
    }
  }

  // 非空转：控件面必须够大（口径写坏 / 面被截断 ⇒ 断言恒真）
  assert.ok(total >= 200, `扫描到的控件只有 ${total} 个（下限 200）：SD-1 的扫描面被写坏`);
  // 白名单本身就是口径的一部分：每条至少命中一次，否则是僵尸白名单
  for (const [token, n] of whitelistHits) {
    assert.ok(n >= 1, `SD-1 白名单「${token}」一次都没命中（僵尸白名单，应删或改判据）`);
  }
  assert.deepEqual(unclassified, [],
    `以下控件既未挂 .input-flat / .input-flat-sm，也不在逐条写明理由的白名单内：\n  ${unclassified.join('\n  ')}`);

  // ad-hoc 覆盖：逐条与棘轮基线比对（存量只许降不许升）
  const counts = new Map();
  for (const it of issues) counts.set(`${it.rel}|${it.kind}`, (counts.get(`${it.rel}|${it.kind}`) || 0) + 1);
  const offenders = [];
  for (const [key, n] of counts) {
    const [rel, kind] = key.split('|');
    const legacy = SD1_LEGACY.find((l) => l.rel === rel && l.kind === kind);
    const max = legacy ? legacy.max : 0;
    if (n > max) offenders.push(`${rel} 的 ${kind} 由 ${max} 升到 ${n}（${issues.filter((i) => i.rel === rel && i.kind === kind).map((i) => i.at).join(' / ')}）`);
  }
  console.log(`[ui-control-system-guard] SD-1 控件 ${total} 个（白名单命中 ${[...whitelistHits.entries()].map(([k, v]) => `${k}:${v}`).join(' · ')}）`);
  assert.deepEqual(offenders, [],
    `控件同串出现 ad-hoc 覆盖（正确做法：删掉这些类，控件外观只由 .input-flat 定义）：\n  ${offenders.join('\n  ')}`);
});

/** SD-2：CSS 里有颜色的 solid 边框（用于非空转）与无颜色边框 */
function borderDecls(css) {
  const out = [];
  const re = /border(?:-(?:top|right|bottom|left))?\s*:\s*([^;{}]+);/g;
  let m;
  while ((m = re.exec(css)) !== null) out.push({ value: m[1].trim(), line: lineOf(css, m.index) });
  return out;
}
const COLOR_IN_BORDER = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklch\(|oklab\(|color-mix\(|var\(|currentColor|transparent|\b(?:white|black|gold)\b/i;

test('SD-2 边框必须有颜色：CSS 无「无颜色 solid」；按钮独立 border 必须同串带色类', () => {
  const solids = borderDecls(CSS).filter((d) => /\bsolid\b/.test(d.value));
  assert.ok(solids.length >= 50, `styles.css 只解析到 ${solids.length} 条 solid 边框（下限 50）：SD-2 口径失效`);
  const colorless = solids.filter((d) => !COLOR_IN_BORDER.test(d.value))
    .map((d) => `styles.css:${d.line} → border: ${d.value};`);
  assert.deepEqual(colorless, [],
    `以下 CSS 边框没有颜色（currentColor 会在深色主题/不同上下文变成黑边）：\n  ${colorless.join('\n  ')}`);

  /**
   * 动态色类白名单：独立 `border` 写在静态前缀、颜色由同一函数内的常量提供。
   * 每条都要在下方被「理由仍成立」复核，避免白名单变成垃圾桶。
   */
  const DYNAMIC_BORDER = [
    {
      rel: 'docs/src/entries/tabs/prop/archive-tab.js',
      classMatch: /gallery-feature-btn/,
      mustContain: ['border-gray-200', 'border-sky-200'],
      reason: 'gallery-feature-btn 的颜色由 ${btnCls} 常量提供（两支均有 border-* 色类）',
    },
  ];

  let borderButtons = 0;
  const unresolved = [];
  for (const f of FILES) {
    let m;
    const re = /<button\b[^>]*>/g;
    while ((m = re.exec(f.code)) !== null) {
      const tag = m[0];
      const cls = classOf(tag);
      if (!/(^|\s)border(\s|$)/.test(cls)) continue;
      borderButtons += 1;
      const hasColorClass = /(^|\s)border-[^\s]+/.test(cls);
      const hasInline = /border-color\s*:/.test(tag);
      if (hasColorClass || hasInline) continue;
      const dyn = DYNAMIC_BORDER.find((d) => d.rel === f.rel && d.classMatch.test(cls));
      if (dyn) {
        assert.ok(dyn.mustContain.every((t) => f.src.includes(t)),
          `${dyn.rel} 的 SD-2 白名单理由已不成立（缺少 ${dyn.mustContain.join(' / ')}）⇒ 删白名单或补色类`);
        continue;
      }
      unresolved.push(`${f.rel}:${lineOf(f.code, m.index)} class="${cls.trim()}"`);
    }
  }
  assert.ok(borderButtons >= 10, `只有 ${borderButtons} 个按钮带独立 border（下限 10）：SD-2 的按钮扫描面被写坏`);
  console.log(`[ui-control-system-guard] SD-2 solid 边框 ${solids.length} 条 · 带独立 border 的按钮 ${borderButtons} 个`);
  assert.deepEqual(unresolved, [],
    `以下按钮用了独立 border 却没有同串色类 / 内联 border-color（会落到 currentColor）：\n  ${unresolved.join('\n  ')}`);
});

test('SD-3 控件圆角 8px：CSS 字面量不得出现 4px / 6px；.input-flat(-sm) 走 --radius-sm', () => {
  const radius = [...CSS.matchAll(/border-radius\s*:\s*([^;{}]+);/g)]
    .map((m) => ({ value: m[1].trim(), line: lineOf(CSS, m.index) }));
  assert.ok(radius.length >= 100, `styles.css 只解析到 ${radius.length} 条 border-radius（下限 100）：SD-3 口径失效`);
  const bad = radius.filter((r) => /\b[46]px\b/.test(r.value))
    .map((r) => `styles.css:${r.line} → border-radius: ${r.value};`);
  console.log(`[ui-control-system-guard] SD-3 border-radius 声明 ${radius.length} 条（4/6px 例外 ${bad.length} 条）`);
  assert.deepEqual(bad, [], `圆角不得出现 4px / 6px 例外（控件 8px、卡片 12px、胶囊 999px；`
    + `.tab-group-label 3px 为登记例外）：\n  ${bad.join('\n  ')}`);

  assert.match(CSS, /--radius-sm:\s*8px/, '--radius-sm 必须为 8px');
  const flat = /(^|\n)\.input-flat\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(flat, '缺少 .input-flat 规则');
  assert.match(flat[2], /border-radius:\s*var\(--radius-sm\)/, '.input-flat 的圆角必须取 --radius-sm');
  const flatSm = /(^|\n)\.input-flat-sm\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(flatSm, '缺少 .input-flat-sm 规则');
  assert.match(flatSm[2], /border-radius:\s*var\(--radius-sm\)/, '.input-flat-sm 的圆角必须取 --radius-sm');
});

test('SD-4 披露控件统一：全局移除 summary 三角，且 <summary> 上无 list-none 例外', () => {
  const base = /(^|\n)\s*summary\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(base, 'styles.css 缺少全局 `summary { list-style: none }`');
  assert.match(base[2], /list-style:\s*none/, 'summary 必须去掉 UA marker（list-style: none）');
  const webkit = /(^|\n)\s*summary::-webkit-details-marker\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(webkit, '缺少 summary::-webkit-details-marker 规则');
  assert.match(webkit[2], /display:\s*none/, 'summary::-webkit-details-marker 必须 display:none');

  let summaryTags = 0;
  let listNone = 0;
  for (const f of FILES) {
    const re = /<summary\b[^>]*>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      summaryTags += 1;
      if (/(^|\s)list-none(\s|$)/.test(classOf(m[0]))) listNone += 1;
    }
  }
  assert.ok(summaryTags >= 20, `只扫描到 ${summaryTags} 个 <summary>（下限 20）：SD-4 口径失效`);
  console.log(`[ui-control-system-guard] SD-4 <summary> ${summaryTags} 个 · list-none 例外 ${listNone} 个`);
  assert.equal(listNone, 0, `逐点 list-none 例外必须清零（全局规则已统一），实际 ${listNone} 个`);
});

test('SD-6 浅主题底不显白：.btn-accent-soft 消费 soft 三件套（手选 hex，非 color-mix）', () => {
  // 2026-10-23 批次 506：浅底/深字不再由 color-mix 派生——每主题 softBg/softText 是手选 hex，
  //   非法 `--neutral-0` 近白仍禁止；`--app-accent-deep` 仅作兼容别名（= softText），不再是独立令牌。
  assert.match(CSS, /--app-accent-soft-bg:\s*var\(--app-accent-soft-bg-light\)/, '缺少 softBg 别名');
  assert.match(CSS, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-light\)/, '缺少 softText 别名');
  const soft = /\.btn-accent-soft\s*\{([^}]*)\}/.exec(CSS);
  assert.ok(soft, '缺少 .btn-accent-soft 规则');
  const bg = /background(?:-color)?\s*:\s*([^;]+);/.exec(soft[1]);
  assert.ok(bg, '.btn-accent-soft 必须显式声明背景');
  const value = bg[1].trim();
  assert.notEqual(value, 'var(--neutral-0)', '.btn-accent-soft 的背景不得为 --neutral-0（近白）');
  assert.ok(/var\(--app-accent-soft-bg\)/.test(value),
    `.btn-accent-soft 的背景必须是 softBg token（明显着色），实际：${value}`);
  assert.ok(!/color-mix\(/.test(value), `.btn-accent-soft 的背景不得再用 color-mix 派生，实际：${value}`);
  assert.match(soft[1], /color:\s*var\(--app-accent-soft-text\)/, '.btn-accent-soft 的文字必须用 softText token');
});

test('SD-9 页签组名可见：groupLabel 渲染为非空文本，且存在 .tab-group-sep', () => {
  const labelLine = TAB_BAR.split('\n').find((l) => l.includes('class="tab-group-label"')) || '';
  assert.ok(labelLine, 'tab-bar.js 未渲染 .tab-group-label');
  assert.match(labelLine, /\$\{groupName\}/, '组名必须是可见文本（${groupName}），不能是空 span');
  assert.doesNotMatch(labelLine, /class="tab-group-label"[^>]*>\s*<\/span>/, '组名不得渲染为空 span');
  assert.match(TAB_BAR, /const groupName = String\(groupLabel \?\? ''\)\.trim\(\)/, '组名必须来自 groupLabel 去空白');
  assert.ok(TAB_BAR.includes('tab-group-sep'), 'tab-bar.js 缺少组间分隔线 .tab-group-sep');
  assert.match(CSS, /\.tab-group-sep\s*\{[^}]*width:\s*1px/, 'styles.css 缺少 .tab-group-sep 的 1px 线');
  // 非空转：页签模板确实读 groupLabel（否则上面的「可见文本」只是巧合）
  assert.ok((TAB_BAR.match(/groupLabel/g) || []).length >= 2, 'tab-bar.js 对 groupLabel 的引用少于 2 处：口径可能被写坏');
});

test('SD-10 正文字号下限：今天页 / 待办无 10/11px；--text-xs ≥ 0.75rem', () => {
  for (const [rel, src, floor] of [
    ['today-tab.js', TODAY, 10],
    ['todo-tab-shell.js', TODO_SHELL, 5],
  ]) {
    const c10 = (src.match(/text-\[10px\]/g) || []).length;
    const c11 = (src.match(/text-\[11px\]/g) || []).length;
    const candidates = (src.match(/text-xs|text-\[12px\]/g) || []).length;
    assert.ok(candidates >= floor,
      `${rel} 只解析到 ${candidates} 处 12px 档（下限 ${floor}）：SD-10 的扫描面被写坏`);
    assert.equal(c10, 0, `${rel} 仍有 ${c10} 处 text-[10px]（正文不得小于 12px）`);
    assert.equal(c11, 0, `${rel} 仍有 ${c11} 处 text-[11px]（正文不得小于 12px）`);
  }
  const m = /--text-xs:\s*([\d.]+)rem/.exec(CSS);
  assert.ok(m, 'styles.css 缺少 --text-xs 定义');
  const rem = Number(m[1]);
  assert.ok(rem >= 0.75, `--text-xs 为 ${m[1]}rem（< 0.75rem / 12px）：正文档被写小`);
});

// ═════════════════════════════════════════════════════════════════════════════
// B1–B8：原 `button-system-guard.test.mjs`（按钮体系 ＋ 死字段）逐条搬入
// ═════════════════════════════════════════════════════════════════════════════
/**
 * 按钮体系 ＋ 死字段 守卫（批次 287 立 / 批次 288 按在force口径重写）
 *
 * 来源（支书裁定）：
 *   「如果是 button 我要求**所有的界面**都统一！」（支书 2026-09-29）
 *   「历史的经验教训要谨防再犯！」（支书 2026-09-29；→ B1）
 *   在force尺寸口径＝`docs/src/styles.css` 的「按钮尺寸规范」（**支书指令 2026-08-06**
 *   ：全站一次规范，**同一界面按钮高度差距不过大**）——**四档**。
 *
 * ⚠ 批次 287 的**错误**（本文件重写的原因）：当时把口径写成「按钮必须走 `.btn` 四变体」，
 *   而 **`.btn` / `.btn--primary` / `.btn--sm` 在 `styles.css` 里根本不存在**
 *   （实际只有 `.btn-action*` / `.btn-md*` / `.btn-tab*` / `.btn-accent*`）。
 *   ⇒ 该口径指向未实现的类名、并把它自造的 316 个"越轨"当成缺陷。**已按在force四档重写**。
 *
 * B1【死字段】`docs/src/**` **不得引用已被移除的字段**。
 *   教训：批次 280 把首页通知归并建在 `systemDerived` 上，而该标记**已随 R-22 移除**
 *   （见 `docs/src/services/governance/notice.js` 批注）⇒ 判定恒假、**归并静默失灵**。
 *
 * B2【按钮尺寸档】每个 `<button>` 必须命中**四档之一**（或命名族），否则＝**第五种高度**（越轨）。
 *   档1 微操作 25px ：`.btn-action*`
 *   档2 默认　30px ：`text-xs` + `py-1.5`
 *   档3 行内对齐 34px：`text-xs` + `py-2`
 *   档4 主 CTA 34px：`text-sm` + （`py-1.5` 带边框 / `py-[7px]` 无边框）
 *   命名族（另有其自身尺寸口径）：`.btn-md*` / `.btn-tab*` / `.btn-accent*`
 *   **例外**（非按钮，不判）：`sr-only` 隐藏语义按钮；**无 `px-`/`py-`/`btn` 的纯文字动作**（如「全部 ›」）。
 *   ⚠ 上限是**棘轮**：归位后**必须一并下调**（批次 288 实测真值 103；三屏已归零，
 *     早前 316＝错口径、147＝正则缺陷 `py-\[7px\]\b` 的 `\b` 永不成立 ⇒ 均已修）。
 *
 * B3【台账】打印**逐文件越轨清单**，供 ③-c「先三屏、再铺开」归位使用。
 *
 * B4【按钮族棘轮】未入**语义族**的 `<button>` 数**只许降不许升**（2026-09-30 批次 297-1 立）。
 *   来源：支书 2026-09-30 裁「⑦ 按钮族＝**全面归一**」＋「**新立 4 族**（中性 / 描边 / 文字 / 危险）」。
 *   目标族谱（**全站按钮只准用这 8 族**，单一源＝`styles.css`「按钮族谱补全」段 ＋ `DESIGN_SYSTEM §4.1`）：
 *     主操作 `.btn-accent` · 次主操作 `.btn-accent-soft` · 微操作 `.btn-action*` · **中性 `.btn-neutral`** ·
 *     **描边 `.btn-outline`** · **文字 `.btn-ghost`** · **危险 `.btn-danger`** · 命名族 `.btn-md*` / `.btn-tab*`。
 *   基线＝**批次 297-1 实测 454**（手写 344 ＋ 含 btn 词干非族 110）；**每迁完一屏一并下调基线**（收基线纪律）。
 *
 * B5【族·语义一致】`.btn-ghost` **不得带内联实底**（2026-09-30 批次 300 立）。
 *   来源：支书 2026-09-30 原话「**button 还有漏网之鱼？请全面检查，所有的角色！**」——实测全站
 *   55+ 处 `class="btn-ghost…"` ＋ 内联 `background:var(--party-red)` 等**实底**＝「**借文字族的
 *   形状伪装主操作实底**」。`B4` 只查「类名是否入族」（`btn-ghost` 在族内 ⇒ 不报），故这整类
 *   **用错族**长期隐形。判据见 `DESIGN_SYSTEM §4.1 何时用哪族`：主操作→`.btn-accent` ·
 *   危险→`.btn-danger(-solid)` · 中性→`.btn-neutral` · 次主操作→`.btn-accent-soft`。
 *   基线＝**批次 300 归一后实测 0**（棘轮：只许降不许升）。
 */
const __dirname = HERE;

/** B1：已移除 / 从未有写入方的字段（引入即静默失灵）—— 只可增补，不可删除 */
const DEAD_FIELDS = [
  { key: 'systemDerived', reason: 'R-22 已移除该标记（notice.js 批注）；引用即判定恒假' },
];

/** 四档 ＋ 命名族（在force口径，单一源＝`styles.css` COMPONENT: Button 段） */
const TIERS = [
  // 档1 微操作：命名族 `.btn-action` **或** 与其等高的 13px 正文档微操作
  //   （`text-[13px] px-2 py-0.5`——13px 系 **2026-09-14 支书裁定的全站正文单档**
  //    〔见 `styles.css:337`「全站正文 13px、控件 38px」〕，`py-0.5` 后高 ≈25px 与档1 等值）。
  //   ⚠ 判据按**高度等值**，不按写法排斥——写法不同但同高即合规（避免"只认一种写法"的假阳性）。
  //   ⚠⚠ **易错点（本文件已犯两次）**：`]` 是非单词字符，`\]\b` 在其后接空格/引号时**永不成立** ⇒
  //       任意值类名（`text-[13px]` / `py-[7px]`）的匹配**一律不要写尾随 `\b`**。
  { id: '档1/25px', hit: (c) => /\bbtn-action\b/.test(c)
    // 档1 等值写法（**系统性**，非偶发）：`(text-xs|text-[13px]) + px-2.5 py-1` ≈ 26px，
    //   与 `.btn-action`(25px) **仅差 1px**；该写法在 ≥15 个屏一致复用（名册/支部/纪检/宣传/待办…），
    //   属既有微操作约定 ⇒ 判合规（判据是**高度**，不是写法）。
    || (/text-xs|text-\[13px\]/.test(c) && /\bpy-1\b/.test(c))
    || (/\bpy-0\.5\b/.test(c) && !/text-sm/.test(c)) },
  { id: '档2/30px', hit: (c) => /\btext-xs\b/.test(c) && /\bpy-1\.5\b/.test(c) && !/\btext-sm\b/.test(c) },
  { id: '档3/34px', hit: (c) => /\btext-xs\b/.test(c) && /\bpy-2\b/.test(c) },
  { id: '档4/34px', hit: (c) => /\btext-sm\b/.test(c) && (/\bpy-1\.5\b/.test(c) || /py-\[7px\]/.test(c)) },
  { id: '命名族', hit: (c) => /\b(btn-md|btn-tab|btn-accent)\b/.test(c) },
  // 档5＝**U5b（2026-09-07 支书批准）**：**低频操作钮**（导出 / 打印 / 分页）统一 **32px**，
  //   与分页钮 / 下拉**同高同 border 家族**（见 `disc/attendance-tab.js` 同处注释）。**在force，勿归位**。
  { id: '档5/32px 低频', hit: (c) => /\bh-8\b/.test(c) },
];

/**
 * 例外（不判）：
 *   ① `sr-only` 隐藏语义按钮；
 *   ② **纯文字动作**（无 `px-`/`py-`/`btn`，如「全部 ›」）——导航，不是按钮；
 *   ③ **行式载体**（`w-full` ＋ `text-left`，如首页「今天有会/本岗待办」整行可点条）——
 *      高度由行内容决定，属 `§4.19` 内嵌行块，**不是按钮档**；强塞 25/30/34px 会破坏行布局；
 *   ④ **主题预览卡**（2026-10-23 批次 505）：`appearance-controls.js` 的 7 个主题项是
 *      「带 `aria-pressed` 的主题色预览控件」（内含两枚 20px 小样），不是动作按钮；
 *      尺寸由 `.appearance-*` 段与 `min-w-[104px]` 自身口径决定，不并入动作按钮四档。
 *   ⚠ 批次 288 修正：早前 `py-\[7px\]\b` 中的 `\]` 后接空格 ⇒ `\b` 永不成立，
 *      导致**「主 CTA 档」被整体误判为越轨**（错数由此虚高）。**已修**。
 */
const isExempt = (c) => /\bsr-only\b/.test(c)
  // 无纵向内边距 ⇒ 高度由**行高 / CSS** 决定，属**文字动作或 CSS 族**，不在「按钮高度档」范畴。
  || !/\bpy-/.test(c)
  // 行式载体（整行可点条目）：`w-full` **或** `flex-1` ＋ `text-left` ⇒ 高度由行内容决定（归 `§4.19`）。
  || (/\b(w-full|flex-1)\b/.test(c) && /\btext-left\b/.test(c));

/** 主题预览卡放行判据（见例外④）：标签同时带 `data-accent-key` 与 `aria-pressed` */
const isThemePreview = (tag) => /\bdata-accent-key=/.test(tag) && /\baria-pressed=/.test(tag);

/** 棘轮上限（越轨数）：**已归零（批次 290）** ⇒ 此后**任何**新按钮都必须落档，零容忍 */
const BUTTON_OFF_BUDGET_CEILING = 0;

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJs(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const BTN_FILES = walkJs(SRC);

/**
 * **CSS 命名族校验**（而非按名字猜）：把 `styles.css` 里**确实定义过的**类名收进集合；
 * 某 `<button>` 的类名里若含「已定义 ＋ 名字带 `btn`/`button`」的令牌 ⇒ 判为**命名族**
 * （其尺寸由该 CSS 块自理，已由 `styles.css` 的按钮尺寸规范覆盖）。
 * 典型：`.ref-doc-action-btn`（`styles.css:2173`）/ `.page-btn`（`:898`）/ `.vote-btn`（`:1774`）。
 */
const CSS_SRC = CSS;
const CSS_CLASSES = new Set([...CSS_SRC.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const isCssNamedFamily = (c) => c.split(/\s+/)
  // `chip` 亦属**表单命名族**（`styles.css:776`：「表单内的 chip（.chip-option）」）——
  // 其高度由该 CSS 块定，不属按钮高度档。
  .some((t) => /(btn|button|chip)/.test(t) && CSS_CLASSES.has(t));

test('B1 死字段：docs/src 不得引用已被移除的字段', () => {
  const hits = [];
  for (const f of BTN_FILES) {
    const src = readFileSync(f, 'utf8');
    for (const { key, reason } of DEAD_FIELDS) {
      if (new RegExp(`\\.${key}\\b`).test(src)) {
        hits.push(`${relative(join(__dirname, '..', '..'), f)} → .${key}（${reason}）`);
      }
    }
  }
  assert.deepEqual(hits, [], `发现对已移除字段的引用（判定会恒假、行为静默失灵）：\n${hits.join('\n')}`);
});

test('B2 按钮尺寸档：<button> 必须命中四档之一（或命名族）', () => {
  const perFile = new Map();
  let total = 0;
  for (const f of BTN_FILES) {
    const src = readFileSync(f, 'utf8');
    const re = /<button[^>]*\bclass="([^"]*)"/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      const tagEnd = src.indexOf('>', re.lastIndex);
      const tag = src.slice(m.index, tagEnd === -1 ? src.length : tagEnd + 1);
      if (isExempt(cls)) continue;
      if (isThemePreview(tag)) continue; // 例外④：主题预览卡（不是动作按钮）
      if (isCssNamedFamily(cls)) continue;
      if (TIERS.some((t) => t.hit(cls))) continue;
      total += 1;
      const line = src.slice(0, m.index).split('\n').length;
      if (!perFile.has(f)) perFile.set(f, []);
      perFile.get(f).push(`${line}: ${cls.trim()}`);
    }
  }
  // B3 台账：逐文件越轨清单（**文件:行号 + 类名**，供 ③-c 精确归位）
  const ledger = [...perFile.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([f, list]) => `  ${String(list.length).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}\n`
      + list.map((s) => `         - ${s}`).join('\n'));
  console.log(`[button-system-guard] 未命中档的 <button> 共 ${total} 个（棘轮上限 ${BUTTON_OFF_BUDGET_CEILING}）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= BUTTON_OFF_BUDGET_CEILING,
    `未命中四档的 <button> 由 ${BUTTON_OFF_BUDGET_CEILING} 升到 ${total} 个 ⇒ 新按钮须落在 styles.css「按钮尺寸规范」四档之一。`,
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// T3-1 … T3-3：组件契约（2026-10-25 · `.trae/specs/consolidate-ia-terms-and-components` Task 3）
//   契约：折叠＝原生 details；菜单＝button + aria-expanded + aria-controls；浮窗＝modal.js；
//         标题永远不进交互元素（兄弟节点 + aria-labelledby）。
//   本组三条断言只做静态扫描（同本文件其它用例），不依赖真实 DOM。
// ═════════════════════════════════════════════════════════════════════════════

test('T3-1 交互元素内无标题：button / summary / role=button 内不得出现 h1..h6 或 role=heading', () => {
  const hits = [];
  let scanned = 0;
  for (const f of FILES) {
    // button / summary：原生元素不允许同类嵌套 ⇒ 非贪婪取到对应闭标签即可
    const re = /<(button|summary)\b[^>]*>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      scanned += 1;
      if (/<h[1-6]\b|role="heading"/.test(m[2])) {
        hits.push(`${f.rel}:${lineOf(f.code, m.index)} <${m[1]}> 内出现标题`);
      }
    }
    // role=button 容器：取到第一个同名闭标签（div / span / li / a / tr）
    const reRole = /<([a-z][a-z0-9]*)\b[^>]*role="button"[^>]*>([\s\S]*?)<\/\1>/g;
    let r;
    while ((r = reRole.exec(f.code)) !== null) {
      scanned += 1;
      if (/<h[1-6]\b|role="heading"/.test(r[2])) {
        hits.push(`${f.rel}:${lineOf(f.code, r.index)} role=button 容器内出现标题`);
      }
    }
  }
  // 非空转：交互元素面必须够大（口径写坏 / 面被截断 ⇒ 恒真）
  assert.ok(scanned >= 200, `只扫描到 ${scanned} 个交互元素（下限 200）：T3-1 的扫描面被写坏`);
  console.log(`[ui-control-system-guard] T3-1 交互元素 ${scanned} 个 · 内含标题 ${hits.length} 处`);
  assert.deepEqual(hits, [],
    `标题不得进入交互元素（须为兄弟节点，用 aria-labelledby 关联）：\n  ${hits.join('\n  ')}`);
});

test('T3-2 折叠状态可静态回读：summary 必在 details 内；aria-expanded 必带 aria-controls', () => {
  const problems = [];
  let detailFiles = 0;
  let expandToggles = 0;
  for (const f of FILES) {
    const summaries = (f.code.match(/<summary\b/g) || []).length;
    const details = (f.code.match(/<details\b/g) || []).length;
    if (details > 0) detailFiles += 1;
    if (summaries > details) {
      problems.push(`${f.rel}: <summary> ${summaries} 个 > <details> ${details} 个（存在孤立 summary）`);
    }
    const re = /<[a-z][a-z0-9]*\b[^>]*\baria-expanded="[^"]*"[^>]*>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      expandToggles += 1;
      if (!/\baria-controls="/.test(m[0])) {
        problems.push(`${f.rel}:${lineOf(f.code, m.index)} aria-expanded 缺 aria-controls`);
      }
    }
  }
  // 非空转：两种原语都必须有足够样本
  assert.ok(detailFiles >= 8, `只有 ${detailFiles} 个文件使用 <details>（下限 8）：折叠口径被写坏`);
  assert.ok(expandToggles >= 10, `只扫描到 ${expandToggles} 个静态 aria-expanded（下限 10）：口径被写坏`);
  console.log(`[ui-control-system-guard] T3-2 details 文件 ${detailFiles} 个 · 静态 aria-expanded ${expandToggles} 个`);
  assert.deepEqual(problems, [],
    `折叠状态必须可静态回读（details/open 或 aria-expanded + aria-controls）：\n  ${problems.join('\n  ')}`);
});

test('T3-3 同一文件同类折叠只用一种原语（菜单除外）', () => {
  const offenders = [];
  let detailsFiles = 0;
  for (const f of FILES) {
    if (!/<details\b/.test(f.code)) continue;
    detailsFiles += 1;
    const re = /<button\b[^>]*\baria-expanded="[^"]*"[^>]*>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      // 菜单（aria-haspopup）与导航抽屉（sidebar）不是「阅读型折叠」，不算同类
      if (/aria-haspopup="(menu|true)"/.test(m[0])) continue;
      if (/aria-controls="app-sidebar"/.test(m[0])) continue;
      offenders.push(`${f.rel}:${lineOf(f.code, m.index)} 同一文件同时出现 details 与 aria-expanded 折叠`);
    }
  }
  assert.ok(detailsFiles >= 8, `只有 ${detailsFiles} 个文件使用 <details>（下限 8）：T3-3 的扫描面被写坏`);
  console.log(`[ui-control-system-guard] T3-3 details 文件 ${detailsFiles} 个 · 混用 ${offenders.length} 处`);
  assert.deepEqual(offenders, [],
    `同一文件同类折叠只能用一种原语（阅读型 details；动作型 aria-expanded；菜单除外）：\n  ${offenders.join('\n  ')}`);
});

/**
 * T4-1【同一文件只允许一种折叠头实现】（2026-10-25 · Task 4「同屏纵向一致」）
 *   判据：同一文件不得既用 `renderDisclosure(...)`（标题为兄弟 H3 的封装）又手写
 *   `<details>` / `<summary>`（折叠头写在 summary 里）——两种折叠头会让**同一屏**出现
 *   两种 chevron / 内边距 / 标题层级，正是支书指出的「纵向不一致」。
 *   与 T3-3 的分工：T3-3 管「details ↔ aria-expanded」原语混用；本条管「封装 ↔ 手写」混用。
 *   豁免（逐条给理由，且不得僵尸化）：组件定义自身 + 两处**行内清单**折叠（不是分区折叠头）。
 */
const FOLD_HEAD_EXEMPTIONS = [
  {
    rel: 'docs/src/components/ui/disclosure.js',
    reason: '折叠封装的唯一实现本身：模板就是 `<details>/<summary>`，不是第二次手写',
  },
  {
    rel: 'docs/src/entries/tabs/prop/archive-tab.js',
    reason: '「已归档展示 / 归档模板」两处历史 `<details>`（行内展示折叠，非分区折叠头；'
      + 'archive-display-fold 另被深链守卫按 id 依赖，迁移需单批）',
  },
  {
    rel: 'docs/src/entries/tabs/leader/write-tab.js',
    reason: '活动行内「外出提醒清单」`<details class="leader-outdoor-check">`（行内清单，'
      + '不是分区折叠头；点击委托按该类名跳过）',
  },
];

test('T4-1 同一文件只允许一种折叠头实现：renderDisclosure 与手写 details/summary 不混用', () => {
  const offenders = [];
  let rendererFiles = 0;
  let markupFiles = 0;
  for (const f of FILES) {
    if (!f.rel.endsWith('.js')) continue;
    const usesRenderer = /renderDisclosure\s*\(/.test(f.code);
    const usesMarkup = /<(?:details|summary)\b/.test(f.code);
    if (usesRenderer) rendererFiles += 1;
    if (usesMarkup) markupFiles += 1;
    if (usesRenderer && usesMarkup) offenders.push(f.rel);
  }
  // 非空转：两条实现路径都必须有足够样本（口径写坏 / 面被截断 ⇒ 本条恒真）
  assert.ok(rendererFiles >= 2, `只有 ${rendererFiles} 个文件使用 renderDisclosure（下限 2）：扫描面被写坏`);
  assert.ok(markupFiles >= 8, `只有 ${markupFiles} 个文件手写 details/summary（下限 8）：扫描面被写坏`);

  const exempt = new Set(FOLD_HEAD_EXEMPTIONS.map((e) => e.rel));
  const zombie = FOLD_HEAD_EXEMPTIONS.filter((e) => !offenders.includes(e.rel)).map((e) => e.rel);
  assert.deepEqual(zombie, [], `FOLD_HEAD_EXEMPTIONS 里有已不混用的文件（僵尸豁免，请删除）：\n  ${zombie.join('\n  ')}`);
  assert.deepEqual(offenders.filter((rel) => !exempt.has(rel)), [],
    '同一文件混用了两种折叠头（renderDisclosure 与手写 details/summary）——同屏会出现两种折叠头形态：\n'
    + offenders.filter((rel) => !exempt.has(rel)).map((rel) => `  ${rel}`).join('\n'));
  console.log(`[ui-control-system-guard] T4-1 renderDisclosure 文件 ${rendererFiles} 个 · 手写折叠文件 ${markupFiles} 个 · 混用 ${offenders.length - zombie.length} 处（豁免 ${exempt.size}）`);
});

/** 语义族令牌（B4 判据单一源；与 `styles.css`「按钮族谱补全」段、`DESIGN_SYSTEM §4.1` 三处同源） */
const FAMILY_TOKENS = [
  'btn-accent-soft', 'btn-accent', 'btn-action', 'btn-md', 'btn-tab',
  'btn-neutral', 'btn-outline', 'btn-ghost', 'btn-danger',
  // 2026-10-26 Task 5：第二档「纯文字动作」——无描边/底色，静态线索＝下划线；
  //   它不是动作按钮族，但必须入册，才能让 B4（未入族 = 手写按钮）继续为零。
  'btn-text',
];
/** B4 棘轮基线（批次 297-2 全站归一后实测 **0**；**只许下调**） */
const HANDWRITTEN_BUTTON_BASELINE = 0;

/**
 * B4 **豁免清单**（判据改准 · 2026-09-30 批次 297-2 收窄；支书裁「组件自带强调色的控件豁免并回退」）
 * ——**组件自带选中态强调色**（用自己的 `--xxx-accent` 变量）的控件不并入 8 族：它们各自即「命名族」。
 * 每条须写明「哪个组件 / 选中态从哪来」，**不得按名字猜**（受 `D-668` 结构性判据须自实况归纳约束）。
 */
const COMPONENT_STATE_EXEMPT = [
  '-tab-btn', // 页头 tab（`components/shell/tab-bar.js` 单一源）：选中态＝`.tab-btn-active` ＋ 内联 `--tab-accent`
  'subtab', // 页内二级切换（党委上报/下发通知共用）：选中态＝`.subtab[aria-selected="true"]`，2026-10-18 工作台提质
  'sidebar-footer-action', // 侧栏页脚动作（帮助/设置/登录/退出）：尺寸单一源＝styles.css 同名类，低频紧凑档 28px
  'todo-more__item', // 待办行尾更多菜单项：尺寸单一源＝styles.css 同名类，菜单项不是独立动作按钮
  'metric-band__item', // 概况结论带指标（筛选/定位控件，不是动作按钮）：选中态＝`.is-active` ＋ `--app-accent-bg`，尺寸由 styles.css 同名类定
  'gp-group-card', // 党小组选择卡（整卡可点，视觉由卡片边框/底色承担；不是动作按钮）
  'modal-close-btn', // 弹窗关闭 ×（2026-10-23 R11 P1-11）：形态/尺寸自有类（styles.css `.modal-close-btn`＋移动端 36px 命中区），不是动作按钮，不并入 8 族
  // 2026-10-23 批次 505：`.tint-action`＝**组件自带固定语义色**的动作按钮（`data-tone` 驱动金/成功/信息/危险，
  //   不随主题色变化；见 inspector.js / taskforce-tab.js）。它是「组件自有强调色」的既有豁免类，
  //   尺寸走动作按钮档 2（text-xs + py-1.5），故不并入主题色 8 族。
  'tint-action',
];

test('B4 按钮族棘轮：未入语义族的 <button> 只许降不许升（「全面归一」的进度表）', () => {
  const walk = (dir, out = []) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (n.endsWith('.js')) out.push(p);
    }
    return out;
  };
  let handwritten = 0;
  let exempt = 0;
  let themePreview = 0;
  const perFile = new Map();
  const re = /<button[^>]*\bclass="([^"]*)"/g;
  for (const f of walk(SRC)) {
    // 2026-10-25 Task 3：MenuButton 的按钮类由**调用方**传入（必须落 8 族之一），
    //   组件模板里的 `${buttonClassName}` 无法静态归族 ⇒ 该文件不参与本棘轮。
    if (f.endsWith('menu-button.js')) continue;
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      const tagEnd = src.indexOf('>', re.lastIndex);
      const tag = src.slice(m.index, tagEnd === -1 ? src.length : tagEnd + 1);
      // 2026-10-23 批次 505：主题预览卡＝带 aria-pressed 的预览控件（例外④），不是动作按钮。
      if (isThemePreview(tag)) { themePreview += 1; continue; }
      // ⚑ 2026-09-30 批次 297-2 **收窄判据**（支书裁「**组件自带强调色的控件豁免并回退**」＋
      //   「把这些页头 tab 恢复到之前的模式」）：**组件自带选中态强调色**（用自己的 `--xxx-accent`
      //   变量，不随通用主题族走）的控件**不并入 8 族**——它们各自就是「命名族」。
      //   判据＝class 串命中组件自有类（字面可见，不按名字猜：`tab-bar.js` 已把 `${prefix}-tab-btn` 内联）。
      if (COMPONENT_STATE_EXEMPT.some((t) => cls.includes(t))) { exempt += 1; continue; }
      if (FAMILY_TOKENS.some((t) => new RegExp(`(^|\\s)${t}`).test(cls))) continue;
      handwritten += 1;
      if (!perFile.has(f)) perFile.set(f, 0);
      perFile.set(f, perFile.get(f) + 1);
    }
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 未入语义族的 <button> 共 ${handwritten} 个（棘轮上限 ${HANDWRITTEN_BUTTON_BASELINE}）；组件自有类豁免 ${exempt} 个（${COMPONENT_STATE_EXEMPT.join(' / ')}）；主题预览卡 ${themePreview} 个：\n${ledger.join('\n')}`);
  assert.ok(
    handwritten <= HANDWRITTEN_BUTTON_BASELINE,
    `未入语义族的 <button> 由 ${HANDWRITTEN_BUTTON_BASELINE} 升到 ${handwritten} 个 ⇒ 新按钮须走 8 族之一（${FAMILY_TOKENS.join(' / ')}）；每迁完一屏请一并下调基线。`,
  );
});

/** B5 棘轮基线（批次 300 归一后实测 **0**；只许下调） */
const GHOST_SOLID_BASELINE = 0;

test('B5 族·语义一致：.btn-ghost 不得带内联实底（借文字族形状伪装实底）', () => {
  const offenders = [];
  const tagRe = /<button\b[^>]*>/g;
  for (const f of BTN_FILES) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = tagRe.exec(src)) !== null) {
      const tag = m[0];
      const cls = (/class="([^"]*)"/.exec(tag) || [null, ''])[1];
      if (!/(^|\s)btn-ghost(?![\w-])/.test(cls)) continue;
      const style = (/style="([^"]*)"/.exec(tag) || [null, ''])[1];
      // 运行期动态样式（含模板表达式）⇒ 豁免：此类＝**组件自带状态**（选中态/色板等），
      //   正是 `D-712` 收窄口径「组件自带强调色的控件豁免」所指（如 `${brandBtnStyle}` / `${accent.hex}`）。
      if (style.includes('${')) continue;
      const bg = (/background\s*:\s*([^;"]+)/.exec(style) || [null, ''])[1].trim();
      if (!bg) continue;
      if (/^(none|transparent)$/i.test(bg)) continue;   // 本就不是实底
      const line = src.slice(0, m.index).split('\n').length;
      offenders.push(`  ${relative(join(__dirname, '..', '..'), f)}:${line} → ${bg}`);
    }
  }
  console.log(`[button-system-guard] .btn-ghost 带内联实底的 <button> 共 ${offenders.length} 个（棘轮上限 ${GHOST_SOLID_BASELINE}）：\n${offenders.join('\n')}`);
  assert.ok(
    offenders.length <= GHOST_SOLID_BASELINE,
    `'.btn-ghost' 带内联实底的 <button> 有 ${offenders.length} 个（上限 ${GHOST_SOLID_BASELINE}）⇒ 实底须归主操作 / 危险 / 中性族，勿借文字族形状。`,
  );
});

/**
 * B6【尺寸归一单一源】（2026-10-18 立；2026-10-23 Task 6 改为 padding + line-height 推导）
 *   来源：支书反馈「有的厚、有的薄；有的字大、有的字小」⇒ 裁定**全局 CSS 归一**：
 *   8 个语义族的高度 / 字号 / 内边距只由 `styles.css` 的「按钮尺寸归一（2026-10-18）」段决定，
 *   页面不再用 `text-* / py-* / px-* / h-*` 零散决定厚薄。
 *   判据：
 *     ① 该段存在；
 *     ② **2026-10-23 Task 6 口径**：36px 标准档（accent / accent-soft / outline / neutral /
 *        danger / danger-solid / md）、32px 紧凑档（ghost / tab）、28px 小号档（sm / action）；
 *        高度 = 上下 padding + 显式 line-height + 边框 2px，**不得再用 min-height 撑高**；
 *        字号正文 13px、微操作 12px，均带 `!important`。
 *     ③ 通用排布（inline-flex / 居中 / 不换行 / gap / 1px 边框）存在；
 *     ④ `.btn-icon` 例外存在（32×32、padding 0）。
 */
const SIZE_NORMALIZE_MARKER = '按钮尺寸归一（2026-10-18）';
const ROW_QUIET_MARKER = '列表行边框收敛（2026-10-18）';

/** 极简规则切分：只取「选择器 { 声明 }」（本段无嵌套 at-rule；先剥注释，避免注释里的示例类串段） */
function cssRules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

/** 纵向 padding（忽略 !important） */
function paddingY(body) {
  const m = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(body);
  if (!m) return NaN;
  const parts = m[1].replace(/!important/gi, '').trim().split(/\s+/).filter((x) => /^\d+(?:\.\d+)?px$/.test(x));
  const top = parseFloat(parts[0]);
  const bottom = parts.length > 2 ? parseFloat(parts[2]) : top;
  return top + bottom;
}

/** 显式 px 行高 */
function lineHeightPx(body) {
  const m = /line-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
  return m ? parseFloat(m[1]) : NaN;
}

test('B6 按钮尺寸归一：标准 36px ＋ 紧凑 32px ＋ 小号 28px（padding + line-height 推导）', () => {
  const start = CSS_SRC.indexOf(SIZE_NORMALIZE_MARKER);
  assert.ok(start >= 0,
    `styles.css 缺少「${SIZE_NORMALIZE_MARKER}」段 ⇒ 按钮尺寸仍会被页面工具类零散决定（厚薄不一的老病）。`);
  const rowStart = CSS_SRC.indexOf(ROW_QUIET_MARKER, start);
  const section = CSS_SRC.slice(start, rowStart > start ? rowStart : undefined)
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = cssRules(section);
  const tierRuleOf = (token) => rules.find((r) => new RegExp(`\\.${token}(?![\\w-])`).test(r.selector)
    && /padding/.test(r.body) && /line-height\s*:\s*\d+(?:\.\d+)?px/.test(r.body));

  const expectTier = (token, height, fontSize) => {
    const r = tierRuleOf(token);
    assert.ok(r, `styles.css：「${SIZE_NORMALIZE_MARKER}」段缺少 .${token} 的尺寸档（页面会退回零散工具类）`);
    const derived = paddingY(r.body) + lineHeightPx(r.body) + 2;
    assert.equal(derived, height,
      `styles.css：.${token} 应由 padding + line-height + 2px 边框推导为 ${height}px（实际 ${derived}）`);
    assert.doesNotMatch(r.body, /min-height/, `styles.css：.${token} 不得用 min-height 撑高（高度须由文字行高参与计算）`);
    assert.match(r.body, new RegExp(`font-size:\\s*${fontSize}px\\s*!important`),
      `styles.css：.${token} 的字号应为 ${fontSize}px !important`);
  };
  // 标准档 36px
  expectTier('btn-accent', 36, 13);
  expectTier('btn-outline', 36, 13);
  expectTier('btn-accent-soft', 36, 13);
  expectTier('btn-danger', 36, 13);
  expectTier('btn-danger-solid', 36, 13); // 只给确认弹窗
  expectTier('btn-md', 36, 13);            // 常规尺寸别名（不是独立视觉族）
  expectTier('btn-neutral', 36, 13);       // 存量类（只降不升）
  // 紧凑档 32px
  expectTier('btn-ghost', 32, 13);
  // 页签 / 分段控件（32px，豁免：不属于动作按钮）
  expectTier('btn-tab', 32, 13);
  // 小号档 28px
  expectTier('btn-sm', 28, 12);
  expectTier('btn-action', 28, 12);

  // ③ 通用排布单一源（排布属性**不加** `!important`：行式载体的 `justify-between` /
  //    `items-start` / `border-0` 等工具类须能后加载覆盖；只锁尺寸属性）
  const common = rules.find((r) => /display:\s*inline-flex/.test(r.body)
    && /align-items:\s*center/.test(r.body)
    && /justify-content:\s*center/.test(r.body)
    && /gap:\s*var\(--space-1\)\s*!important/.test(r.body)
    && /white-space:\s*nowrap/.test(r.body)
    && /border-width:\s*1px/.test(r.body));
  assert.ok(common, `styles.css：「${SIZE_NORMALIZE_MARKER}」段缺少通用排布规则（inline-flex / 居中 / gap:var(--space-1)!important / nowrap / border-width:1px）`);

  // ④ 图标型例外
  const icon = rules.find((r) => /\.btn-icon(?![\w-])/.test(r.selector) && /width:\s*32px/.test(r.body));
  assert.ok(icon, `styles.css：「${SIZE_NORMALIZE_MARKER}」段缺少 .btn-icon 例外（图标按钮 32×32）`);
  assert.match(icon.body, /padding:\s*0\s*!important/, 'styles.css：.btn-icon 的 padding 应为 0 !important');
});

/**
 * B7【族内不得再写尺寸】（2026-10-18 立，棘轮；2026-10-19 排除页签）
 *   问题：归一后尺寸已由 `styles.css` 用 `!important` 锁死，但页面里仍有
 *   `<button class="btn-outline … text-sm py-1.5">` 这类「族类 ＋ 尺寸工具类」——
 *   既不生效、又让读码者误以为尺寸还归页面管。
 *   存量约 491 处，**本批不清**（支书要求「不要一次清 400 处」），只锁「不得新增」。
 *   判据＝`<button class>` 同时命中**动作按钮族令牌** 与 尺寸工具类令牌（字号 / 内边距 / 高度）。
 *   **排除**：`tab-btn` / 页签 `btn-tab` —— 它们是导航 / 分段控件，不是动作按钮，
 *   不计入「动作按钮尺寸工具类」统计，也不参与四类迁移。
 *   基线＝2026-10-18 实测 **488**（只许降不许升；每迁完一屏一并下调）。
 *   2026-10-19 排除 `tab-btn` / 页签 `btn-tab` 后实测 **413** ⇒ 基线下调为 413。
 *   2026-10-23 R11：toast 新增一条关闭按钮（error/success 提示可手动关闭）⇒ 实测 414，
 *     基线按实况上调为 414（只此一次，之后只许降不许升）。
 *   2026-10-23 批次 505（Task 7/8 收口后）：实测 **396**（族内尺寸工具类随主题/密度收敛下降）
 *     ⇒ 按收基线纪律下调为 396（只降不升）。
 *   2026-10-26 Task 5：btn-ghost 动作迁移后实测 **360** ⇒ 按收基线纪律下调为 360。
 */
const FAMILY_SIZE_OVERRIDE_BASELINE = 360;
const SIZE_TOKEN_RE = /^(?:text-(?:xs|sm|base|lg|xl)|text-\[\d+px\]|p-\d+(?:\.\d+)?|px-\d+(?:\.\d+)?|py-\d+(?:\.\d+)?|h-\d+(?:\.\d+)?|min-h-\S+)$/;
// 动作按钮族令牌；**不含** `btn-tab`（页签 / 分段控件豁免，见 B7 注释）
const FAMILY_TOKEN_RE = /(^|\s)(btn-accent-soft|btn-accent|btn-action|btn-md|btn-neutral|btn-outline|btn-ghost|btn-danger)/;
/** 页签 / 分段控件：（`tab-btn` 页头 tab ＋ `btn-tab` 页签）一律排除 */
const TAB_EXEMPT_RE = /(^|\s)(tab-btn|btn-tab)(?![\w-])/;

test('B7 族内不得再写尺寸：动作按钮族上的 text-*/py-*/px-*/h-* 只许降不许升（tab-btn / btn-tab 豁免）', () => {
  let total = 0;
  const perFile = new Map();
  const re = /<button[^>]*\bclass="([^"]*)"/g;
  for (const f of BTN_FILES) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      if (TAB_EXEMPT_RE.test(cls)) continue;
      if (!FAMILY_TOKEN_RE.test(cls)) continue;
      if (!cls.split(/\s+/).some((t) => SIZE_TOKEN_RE.test(t))) continue;
      total += 1;
      perFile.set(f, (perFile.get(f) || 0) + 1);
    }
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
  console.log(`[button-system-guard] 动作按钮族仍写尺寸工具类 ${total} 个（棘轮上限 ${FAMILY_SIZE_OVERRIDE_BASELINE}；tab-btn / btn-tab 已排除）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= FAMILY_SIZE_OVERRIDE_BASELINE,
    `动作按钮族上的尺寸工具类由 ${FAMILY_SIZE_OVERRIDE_BASELINE} 升到 ${total} 个 ⇒ 尺寸已由 styles.css「${SIZE_NORMALIZE_MARKER}」统一，新按钮不要再写 text-*/py-*/px-*/h-*；迁移一屏请一并下调基线。`,
  );
});

/**
 * B8【btn-ghost 存量只降不升】（2026-10-19 立）
 *   来源：Spec「最小三成本」——`btn-ghost` 无底色无边框，读者无法判断可点性；
 *   新代码**不得**再用它作为动作按钮类型（行内动作改 `.btn-outline` / `.btn-accent-soft`，
 *   危险改 `.btn-danger`，纯导航/帮助用 `<a>`）。
 *   本批只锁**全站存量**（四页重点的页面级归零由 Task 9 `ui-button-four-types.test.mjs` 收紧）。
 *   基线＝2026-10-19 实测（只许降不许升；每迁完一屏一并下调）。
 *   2026-10-26 Task 5：动作按钮全量迁移到 `.btn-outline` / `.btn-text`，只剩 4 处**非动作行载体**
 *   （list-row ×2 / today 清单行 ×1 / 考勤矩阵入口 ×1，见 V4 白名单）⇒ 基线下调为 4。
 */
const GHOST_BUTTON_BASELINE = 4; // 2026-10-26 Task 5 实测 4（均为非动作行载体）

test('B8 btn-ghost 作为动作按钮的存量只许降不许升（新代码不得使用）', () => {
  let total = 0;
  const perFile = new Map();
  const re = /<button[^>]*\bclass="([^"]*)"/g;
  for (const f of BTN_FILES) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src)) !== null) {
      const cls = m[1];
      if (!/(^|\s)btn-ghost(?![\w-])/.test(cls)) continue;
      total += 1;
      const rel = relative(join(__dirname, '..', '..'), f).replace(/\\/g, '/');
      perFile.set(rel, (perFile.get(rel) || 0) + 1);
    }
  }
  const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`);
  console.log(`[button-system-guard] 以 btn-ghost 作动作按钮的 <button> 共 ${total} 个（棘轮上限 ${GHOST_BUTTON_BASELINE}）：\n${ledger.join('\n')}`);
  assert.ok(
    total <= GHOST_BUTTON_BASELINE,
    `btn-ghost 动作按钮由 ${GHOST_BUTTON_BASELINE} 升到 ${total} 个 ⇒ 新代码不得再用 btn-ghost；行内动作用 .btn-outline / .btn-accent-soft，危险用 .btn-danger。`,
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// V1–V3：视觉基础三组判据（2026-10-26 · `.trae/specs/restore-visual-hierarchy-and-runtime` Task 3）
//   来源：支书反馈「分组胶囊没恢复 / 表格向后伸展 / 结论带挤在一起」。
//   判据口径（静态，纯 node）：容器与行载体同 class 同语义、胶囊全宽可见且 ≥24px、
//   关键宽表 table-layout:fixed ＋ 列宽模板。
// ═════════════════════════════════════════════════════════════════════════════

test('V1 容器语义：数字组单一语法 / section.card 必有可访问名 / list-row 四载体可区分', () => {
  // ① 数字组单一语法（2026-10-29 P2「同类只有一个语法」）：
  //    全站数字组＝图标块在左（.stat-icon-tint 40×40、浅底由 --tint 派生）＋ .stat-card__body
  //    （.stat-card__value / .stat-card__label 两行在右）。卡片不自带尺寸：不得再有
  //    `flex-direction: column` 与写死的 `min-height`；列数与等高交给栅格 `align-items: stretch`。
  assert.match(WORK_OVERVIEW, /<section class="metric-band metric-band--interactive metric-band--cards"/,
    '工作概况结论带须为 .metric-band--interactive.metric-band--cards（四张数字卡，含可点 button/a）');
  assert.match(CSS, /\.metric-band--cards\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
    'styles.css 缺 .metric-band--cards 的四列卡网格');
  assert.match(WORK_OVERVIEW, /class="card card--interactive stat-card metric-band__item/,
    '工作台数字卡须复用 .card（不得另造第二套卡面）');
  const cardBody = /const body = `<span class="stat-icon-tint"[\s\S]*?<div class="stat-card__body">[\s\S]*?stat-card__value[\s\S]*?stat-card__label">\$\{esc\(metric\.label\)\}<\/p>[\s\S]*?<\/div>`/.exec(WORK_OVERVIEW);
  assert.ok(cardBody, '四数卡 body 须为「图标块 .stat-icon-tint ＋ .stat-card__body（数值/标签）」');
  assert.match(cardBody[0], /--tint:\$\{color\}/, '图标浅底须由 --tint 派生（取既有语义色，不写 hex）');
  assert.match(STATS, /stat-icon-tint[\s\S]{0,400}stat-card__body[\s\S]{0,400}stat-card__value[\s\S]{0,400}stat-card__label/,
    '首页统计卡须与工作台同构：图标块 ＋ .stat-card__body（数值/标签）');
  // 可点卡反馈不得用阴影 / 上浮（DESIGN_SYSTEM §4.2；判据与 ui-motion-guard 同向）。
  for (const [label, source] of [['work-overview.js', WORK_OVERVIEW], ['stats.js', STATS]]) {
    assert.doesNotMatch(source, /hover:shadow|hover:-translate-[xy]-/, `${label} 不得以 hover 阴影 / 上浮作反馈`);
  }
  assert.doesNotMatch(CSS_BARE, /\.card--interactive:hover\s*\{[^}]*box-shadow/, '.card--interactive:hover 不得加阴影');
  assert.doesNotMatch(CSS_BARE, /\.card--interactive:hover\s*\{[^}]*translate/, '.card--interactive:hover 不得上浮 / 整卡位移');

  // 卡面几何（判据只能更严）：横排、间距 --space-3、不写尺寸；图标块 40×40 / --radius-md / --tint 12% 派生。
  const statCardCss = /\.stat-card\s*\{([^}]*)\}/.exec(CSS_BARE)?.[1] || '';
  assert.match(statCardCss, /align-items:\s*center/, '.stat-card 须横排居中（图标在左、文字在右）');
  assert.match(statCardCss, /gap:\s*var\(--space-3\)/, '.stat-card 图标与文字区之间须为 --space-3');
  assert.doesNotMatch(statCardCss, /flex-direction:\s*column/, '.stat-card 不得再竖排（图标一行 / 数值一行 / 标签一行）');
  assert.doesNotMatch(statCardCss, /(?:min-)?height:\s*\d+px/, '.stat-card 不得写死高度（等高交给栅格 stretch）');
  assert.match(CSS_BARE, /\.stat-card__body\s*\{[^}]*flex-direction:\s*column/,
    '.stat-card__body 须为右侧纵向两行（数值 / 标签）');
  assert.match(CSS_BARE, /\.stat-icon-tint\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/,
    '图标块须为 40×40');
  assert.match(CSS_BARE, /\.stat-icon-tint\s*\{[^}]*border-radius:\s*var\(--radius-md\)/,
    '图标块圆角须取 --radius-md');
  // 栅格：桌面四列、≤1024 两列（手机同两列），四张等高只由 stretch 保证。
  assert.match(CSS_BARE, /\.stat-grid,\s*\.metric-band--cards\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)[\s\S]{0,240}align-items:\s*stretch/,
    'styles.css 缺 .stat-grid / .metric-band--cards 的四列等比栅格（align-items: stretch）');
  assert.match(CSS_BARE, /\.stat-grid,\s*\.metric-band--cards\s*\{[^}]*grid-auto-rows:\s*1fr/,
    '数字组须 grid-auto-rows: 1fr（两列时上下两行等高，不靠写死 min-height）');
  assert.match(CSS_BARE, /@media \(max-width: 1024px\)\s*\{[\s\S]{0,200}\.stat-grid,\s*\.metric-band--cards\s*\{[\s\S]{0,120}repeat\(2,/,
    '≤1024 时数字组须降为两列');

  // 待办摘要（原 .metric-band--static 只读带）已并入同一语法；只读档不得回潮。
  assert.match(TODO_SHELL, /class="stat-grid mb-4" role="group" aria-label="待办摘要"/,
    '待办摘要须使用 .stat-grid（数字组单一语法）');
  assert.match(TODO_SHELL, /stat-card__body[\s\S]{0,160}stat-card__value[\s\S]{0,160}stat-card__label/,
    '待办摘要卡须为「图标块 ＋ 数值/标签」');
  assert.doesNotMatch(CSS_BARE, /\.metric-band--static/, 'styles.css 不得保留 .metric-band--static 第二套只读档');
  // ② 结论带不再用 0 间距 + 左线分隔。
  assert.doesNotMatch(CSS_BARE, /\.metric-band\s*\{[^}]*gap:\s*0\s*;/, '.metric-band 不得再用 gap: 0（项间应为 8–12px）');
  assert.doesNotMatch(CSS_BARE, /\.metric-band__item\s*\{[^}]*border-left/, '.metric-band__item 不得再用左线分隔（由间距承担）');

  // ③ section 只用于有可访问名的分区；.card 容器其余统一 div。
  const offenders = [];
  let cardSections = 0;
  for (const f of FILES) {
    const re = /<section\b[^>]*>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      const tag = m[0];
      if (!/(^|\s)card(\s|$)/.test(classOf(tag))) continue;
      cardSections += 1;
      if (!/\baria-label(?:ledby)?="/.test(tag)) {
        offenders.push(`${f.rel}:${lineOf(f.code, m.index)} → ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
      }
    }
  }
  assert.ok(cardSections >= 8, `只扫描到 ${cardSections} 个 section.card（下限 8）：V1 的扫描面被写坏`);
  assert.deepEqual(offenders, [],
    `section 只能用于有可访问名（aria-label / aria-labelledby）的分区；其余卡容器请用 <div>：\n  ${offenders.join('\n  ')}`);

  // ④ list-row 四类行载体：元素 + data-row-type + data-interactive 三者一致，类名不另造。
  assert.match(LIST_ROW, /data-row-type="\$\{type\}"/, 'list-row.js 必须输出 data-row-type');
  for (const type of ['display', 'nav', 'action', 'master']) {
    assert.ok(LIST_ROW.includes(`'${type}'`), `list-row.js 行型白名单缺 ${type}`);
  }
  assert.match(CSS, /\.list-row\[data-row-type="display"\]/, 'styles.css 缺展示行样式');
  assert.match(CSS, /\.list-row\[data-row-type="action"\]/, 'styles.css 缺动作行样式');
  assert.match(CSS, /\.list-row\[data-row-type="nav"\][\s\S]{0,120}\.list-row\[data-row-type="master"\]/,
    'styles.css 缺导航行 / 主从行的可点样式');
});

// ═════════════════════════════════════════════════════════════════════════════
// V8 数字组全量语法（2026-10-29 P2「同类只有一个语法」）
//   扫描面：docs/src/**/*.js ＋ docs/*.html（与 SD-1 同一批 FILES）。
//   ① 竖排回潮：出现 `.stat-card` ＋ `.stat-card__value` 的模板必须有 `.stat-card__body`
//      （图标在左、数值/标签在右两行）；缺 body（value/label 仍是卡片直系子元素）或
//      卡片内联 `flex-direction: column` ⇒ 判红。
//   ② 组内 hex：卡片开标签或 body…label 窗口出现 #rgb/#rrggbb ⇒ 判红（颜色只取语义 token）。
//   带反例（非空转）：坏样本命中、好样本不命中，另有 `--tint:#…` 与裸 `color:#…` 两个样本。
// ═════════════════════════════════════════════════════════════════════════════
test('V8 数字组全量：不得回潮竖排三段 / 组内不得内联 hex', () => {
  const CARD_TAG_RE = /<(?:div|button|a)\b[^>]*class="[^"]*\bstat-card\b[^"]*"[^>]*>/g;
  const HEX_RE = /#[0-9a-f]{3,8}\b/i;

  /** 竖排回潮判定（纯函数，便于反例对照） */
  const verticalRegression = (code) => {
    if (!/\bstat-card\b/.test(code)) return false;
    if (!/stat-card__value/.test(code)) return false; // 只有图标块 / 骨架，不算数字组
    if (!/stat-card__body/.test(code)) return true;   // 缺 body ⇒ 数值与标签仍是卡片直系子元素
    return /stat-card[\s\S]{0,240}flex-direction:\s*column/.test(code);
  };
  /** 数字组内联 hex（卡片开标签 ＋ body…label 窗口；纯函数） */
  const inlineHex = (code) => {
    const hits = [];
    for (const m of code.matchAll(CARD_TAG_RE)) if (HEX_RE.test(m[0])) hits.push(m[0]);
    for (const m of code.matchAll(/stat-card__body[\s\S]{0,400}?stat-card__label/g)) if (HEX_RE.test(m[0])) hits.push(m[0]);
    return hits;
  };

  const vertical = [];
  const hex = [];
  let cards = 0;
  for (const f of FILES) {
    if (verticalRegression(f.code)) vertical.push(f.rel);
    const hits = inlineHex(f.code);
    if (hits.length) hex.push(`${f.rel} → ${hits[0].replace(/\s+/g, ' ').slice(0, 120)}`);
    cards += [...f.code.matchAll(CARD_TAG_RE)].length;
  }
  assert.ok(cards >= 7, `只扫描到 ${cards} 个数字卡（下限 7）：V8 的扫描面被写坏`);
  assert.deepEqual(vertical, [],
    `数字组不得回潮竖排结构（须 .stat-card + .stat-icon-tint + .stat-card__body）：\n  ${vertical.join('\n  ')}`);
  assert.deepEqual(hex, [],
    `数字组内不得内联硬编码 hex（--tint / color 取语义 token）：\n  ${hex.join('\n  ')}`);

  // ── 反例（合成样本）：判据写坏会在这里先红 ──
  const badVertical = '<div class="card stat-card"><span class="stat-icon-tint"></span>'
    + '<p class="stat-card__value">3</p><p class="stat-card__label">逾期</p></div>';
  const goodVertical = '<div class="card stat-card"><span class="stat-icon-tint"></span>'
    + '<div class="stat-card__body"><p class="stat-card__value">3</p><p class="stat-card__label">逾期</p></div></div>';
  const badColumn = '<div class="card stat-card" style="flex-direction: column">'
    + '<div class="stat-card__body"><p class="stat-card__value">1</p><p class="stat-card__label">逾期</p></div></div>';
  assert.equal(verticalRegression(badVertical), true, 'V8 反例失效：竖排三段样本未被判红');
  assert.equal(verticalRegression(goodVertical), false, 'V8 反例失效：合规样本被误判');
  assert.equal(verticalRegression(badColumn), true, 'V8 反例失效：卡片内联竖排未被判红');

  const badHexTint = '<div class="card stat-card" style="--tint:#3B82F6">'
    + '<div class="stat-card__body"><p class="stat-card__value">3</p><p class="stat-card__label">逾期</p></div></div>';
  const badHexValue = '<div class="card stat-card">'
    + '<div class="stat-card__body"><p class="stat-card__value" style="color:#3B82F6">3</p>'
    + '<p class="stat-card__label">逾期</p></div></div>';
  assert.equal(inlineHex(badHexTint).length, 1, 'V8 反例失效：--tint 内联 hex 未被判红');
  assert.equal(inlineHex(badHexValue).length, 1, 'V8 反例失效：数值内联 hex 未被判红');
  assert.equal(inlineHex(goodVertical).length, 0, 'V8 反例失效：合规样本被误判为内联 hex');
});


test('V2 分组胶囊全宽可见：无 display:none 断点、高度 ≥24px、3px 直角、无边框 + 10% 淡底', () => {
  assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*display:\s*none/,
    '分组胶囊不得在任何断点用 display:none 隐藏');
  assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*visibility:\s*hidden/,
    '分组胶囊不得用 visibility:hidden 隐藏');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*min-height:\s*24px/, '分组胶囊高度须 ≥24px');
  // 2026-10-26 Task 1：恢复 8–9 月的 3px 直角（SD-3 的 999px 胶囊例外，见 DESIGN_SYSTEM 登记）。
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*border-radius:\s*3px/,
    '分组胶囊应为 3px 直角（.tab-group-label 是 SD-3 胶囊 999px 的登记例外）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*flex-shrink:\s*0/, '组名不得被压缩（flex-shrink: 0）');

  // 2026-10-27 Task 9：用户裁定恢复 8–9 月原样——**无边框**；形状由 3px 直角与 10% 主题淡底承担。
  //   （原 V2 的「描边对页面底 ≥1.5:1」随边框一并退场，改为核「无边框 + 淡底 token 正确」。）
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*border:\s*none/, '分组胶囊应无边框（8–9 月原样）');
  assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*border:\s*1px/, '分组胶囊不得再写 1px 描边');
  assert.match(CSS, /--app-accent-tint:\s*rgb\(from var\(--app-accent\) r g b \/ 10%\)/,
    'styles.css 应定义 --app-accent-tint（当前主题色 10% 淡底，随 7 主题亮/暗自动跟随）');
  assert.match(CSS, /\.tab-group-label\s*\{[^}]*background:\s*var\(--app-accent-tint\)/,
    '分组胶囊底色应为 --app-accent-tint（10% 淡底）');

  // ≤1280 只缩内边距，不隐藏、不降字号（页签条继续横向滚动）。
  //   2026-10-26 Task 1：字号由原来的 11px 改回 12px（11px 属 Overline 标签档）。
  //   2026-10-27 Task 9：去边框后高度由 min-height 24px 承担，内边距口径不变。
  const narrow = /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-label \{([\s\S]*?)\}[\s\S]*?\n\}/.exec(CSS);
  assert.ok(narrow, '缺少 ≤1280px 的分组名规则');
  assert.match(narrow[1], /padding:\s*1px 5px/, '≤1280px 组名应缩小内边距（1px 5px）');
  assert.doesNotMatch(narrow[1], /font-size:\s*(?:9|10|11)px/, '≤1280px 组名不得下探 11px 及以下（保持 12px 正文档）');
  assert.doesNotMatch(narrow[1], /display:\s*none/, '≤1280px 不得隐藏组名');
});

test('V3 关键表定列宽：wo-lines-table fixed ＋ colgroup 模板 ＋ 末列贴列尾', () => {
  assert.match(CSS, /\.wo-lines-table\s*\{[^}]*table-layout:\s*fixed/,
    '.wo-lines-table 必须 table-layout: fixed（否则末列吃掉余量）');
  assert.match(CSS, /\.data-table--fixed\s*\{[^}]*table-layout:\s*fixed/,
    'styles.css 须提供 .data-table--fixed 定列宽档供其它关键表采用');
  assert.match(WORK_OVERVIEW, /<table class="data-table data-table--fixed wo-lines-table"/,
    '工作分工表须挂 .data-table--fixed');
  const cols = [...WORK_OVERVIEW.matchAll(/<col class="wo-col-([a-z]+)"\s*\/>/g)].map((m) => m[1]);
  assert.deepEqual(cols, ['name', 'owner', 'count', 'count', 'pending'],
    `工作分工表列宽模板应为 工作分工/负责人/在办/逾期/待处理，实测 ${JSON.stringify(cols)}`);
  for (const cls of ['wo-col-name', 'wo-col-owner', 'wo-col-count', 'wo-col-pending']) {
    assert.match(CSS, new RegExp(`\\.${cls}\\s*\\{[^}]*width:\\s*\\d+%`), `styles.css 缺列宽 ${cls}`);
  }
  // 末列贴列尾 + 首列 nowrap 保留但有最大宽。
  assert.match(CSS, /\.wo-lines-table thead th:last-child,[\s\S]{0,80}\.wo-lines-table tbody td:last-child\s*\{[^}]*padding-inline-end:\s*var\(--space-4\)/,
    '末列表头/单元格须留 16px 尾部内边距');
  assert.match(CSS, /\.wo-lines-table thead th:last-child,[\s\S]{0,80}\.wo-lines-table tbody td:last-child\s*\{[^}]*text-align:\s*end/,
    '末列内容须贴列尾（text-align: end）');
  assert.match(CSS, /\.wo-line-name\s*\{[^}]*white-space:\s*nowrap/, '首列 nowrap 应保留');
  assert.match(CSS, /\.wo-line-name\s*\{[^}]*max-width:/, '首列 nowrap 须同时给最大宽');
  // ≤640 卡式行：动作列自起排（不甩到卡右缘）。
  assert.match(CSS, /\.data-table\[data-responsive="cards"\] td:last-child\s*\{[^}]*justify-content:\s*flex-start/,
    '≤640 卡式行动作列应为 justify-content: flex-start');
});

// ═════════════════════════════════════════════════════════════════════════════
// V4–V7：按钮三档与可点性（2026-10-26 · `.trae/specs/restore-visual-hierarchy-and-runtime` Task 5）
//   三档契约（支书裁定）：
//     ① 动作按钮：必须 1px 描边或底色；`btn-ghost` 只保留给**非动作行载体**；
//     ② 纯文字动作：静态下划线或尾随箭头，箭头不得 neutral-400；
//     ③ 图标按钮：视觉 32×32 + 命中区 ≥44×44；
//     ④ 行载体：可见 hover（底/边/左条），色差 ≥1.2:1。
//   本组全部静态扫描（纯 node），并对白名单做「每条命中 ≥1 次」的非空转校验。
// ═════════════════════════════════════════════════════════════════════════════

/**
 * V4 白名单：**唯一允许保留 `btn-ghost` 的场所＝非动作行载体**。
 * 每条写明「为什么它不是动作按钮」＋「可见线索由谁提供」，并核实际处数（多一处即红）。
 */
const GHOST_ROW_WHITELIST = [
  {
    rel: 'docs/src/components/ui/list-row.js',
    max: 2,
    marker: 'data-row-type',
    reason: '导航行 / 选择行的原生 <button> 整行载体（data-row-type + data-interactive）；'
      + 'hover 底与 3px 主题左条见 .list-row[data-interactive="true"]:hover',
  },
  {
    rel: 'docs/src/entries/tabs/today/today-tab.js',
    max: 1,
    marker: 'w-full',
    reason: '今天页清单行（w-full + text-left）整行点击跳转；行左 3px 状态条 + hover 底',
  },
  {
    rel: 'docs/src/entries/tabs/disc/overview-tab.js',
    max: 1,
    marker: 'w-full',
    reason: '概况条线缺口行升级为整行导航载体（w-full + text-left）；hover 底由 .btn-ghost:hover 提供',
  },
  {
    rel: 'docs/src/entries/tabs/prop/overview-tab.js',
    max: 1,
    marker: 'w-full',
    reason: '宣传概况「待归档」行升级为整行导航载体（w-full + text-left）；hover 底由 .btn-ghost:hover 提供',
  },
  {
    rel: 'docs/src/entries/tabs/disc/attendance-tab.js',
    max: 1,
    marker: 'hover:bg-[var(--surface-hover)]',
    reason: '考勤矩阵记录入口＝行内定位载体（点此到待确认队列，不是写操作），自带可见 hover',
  },
];

/** V4 单行判据（纯函数，反例复用同一判据，避免「反例另写一套」）。 */
function ghostLineProblem(line, entry) {
  if (!/(^|[\s"'`])btn-ghost(?![\w-])/.test(line)) return null;
  if (!entry) return 'not-whitelisted';
  if (!line.includes(entry.marker)) return 'marker-missing';
  return null;
}

test('V4 btn-ghost 不得用于动作按钮：只允许白名单内的非动作行载体', () => {
  const allowed = new Map(GHOST_ROW_WHITELIST.map((w) => [w.rel, w]));
  const hits = new Map();
  const offenders = [];
  for (const f of FILES) {
    if (!f.rel.endsWith('.js')) continue;
    const w = allowed.get(f.rel);
    f.code.split('\n').forEach((line, i) => {
      if (!/(^|[\s"'`])btn-ghost(?![\w-])/.test(line)) return;
      hits.set(f.rel, (hits.get(f.rel) || 0) + 1);
      const problem = ghostLineProblem(line, w);
      if (!problem) return;
      if (problem === 'not-whitelisted') {
        offenders.push(`${f.rel}:${i + 1} ${line.trim().slice(0, 120)}`);
        return;
      }
      offenders.push(`${f.rel}:${i + 1} 白名单标记「${w.marker}」不在该按钮上`
        + '（行载体证据消失 ⇒ 它不是非动作行载体）');
    });
  }
  // 反例：同一判据对「白名单外」「标记缺失」必须判红，对合法行载体必须判绿。
  assert.equal(ghostLineProblem('<button class="btn-ghost">删除</button>', undefined),
    'not-whitelisted', 'V4 反例：白名单外的 btn-ghost 未被判红');
  assert.equal(ghostLineProblem('<button class="btn-ghost">删除</button>', GHOST_ROW_WHITELIST[0]),
    'marker-missing', 'V4 反例：白名单文件里缺行载体标记未被判红');
  assert.equal(ghostLineProblem(
    `<button class="btn-ghost ${GHOST_ROW_WHITELIST[0].marker}">行</button>`, GHOST_ROW_WHITELIST[0]),
  null, 'V4 反例：合法行载体被误判红');
  // 非空转：白名单每条必须命中，且处数不多不少
  for (const w of GHOST_ROW_WHITELIST) {
    assert.ok(w.reason && w.reason.length >= 20,
      `V4 白名单「${w.rel}」缺理由（≥20 字，说明为什么它不是动作按钮）`);
    const n = hits.get(w.rel) || 0;
    assert.ok(n >= 1, `V4 白名单「${w.rel}」一次都没命中（僵尸白名单，应删或改判据）`);
    assert.equal(n, w.max, `${w.rel} 的 btn-ghost 处数应为 ${w.max}（实测 ${n}）；新增/减少都必须同步白名单并写理由`);
  }
  const totalRows = [...hits.values()].reduce((a, b) => a + b, 0);
  assert.ok(totalRows >= 5, `只扫描到 ${totalRows} 个行载体（下限 5）：V4 的扫描面被写坏`);
  console.log(`[ui-control-system-guard] V4 btn-ghost 仅剩非动作行载体 ${totalRows} 处（白名单 ${GHOST_ROW_WHITELIST.length} 文件）`);
  assert.deepEqual(offenders, [],
    `btn-ghost 不得再承担动作按钮（动作请改 .btn-outline / .btn-accent / .btn-danger）：\n  ${offenders.join('\n  ')}`);
});

test('V5 纯文字动作有静态线索：btn-text 600 字重 + 尾随箭头非 neutral-400', () => {
  // ① 第二档类本身必须有静态线索（2026-10-27 Task 9：下划线全站清零 ⇒ 改 600 字重 + 主题色；
  //    hover 补 10% 主题淡底，尾随箭头仍是第二线索）。
  const btnText = /(^|\n)\.btn-text\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(btnText, 'styles.css 缺少 .btn-text（纯文字动作档）');
  assert.match(btnText[2], /font-weight:\s*600/, '.btn-text 必须有 600 字重（静态线索）');
  assert.doesNotMatch(btnText[2], /text-decoration:\s*underline/, '.btn-text 不得再用文本下划线');
  assert.match(CSS_BARE, /\.btn-text:hover\s*\{[^}]*background:\s*var\(--app-accent-tint\)/,
    '.btn-text:hover 应有 10% 主题淡底');
  assert.match(btnText[2], /color:\s*var\(--color-link\)/, '.btn-text 的文字色应为 --color-link');

  // ② 全站 btn-text 按钮必须带尾随箭头（第二个非颜色线索）；并核对样本量。
  let btnTextCount = 0;
  const missingArrow = [];
  for (const f of FILES) {
    if (!f.rel.endsWith('.js')) continue;
    const re = /<button\b[^>]*\bclass="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      if (!/(^|\s)btn-text(?![\w-])/.test(m[1])) continue;
      btnTextCount += 1;
      if (!/[›→»←]/.test(m[2])) missingArrow.push(`${f.rel}:${lineOf(f.code, m.index)}`);
    }
  }
  assert.ok(btnTextCount >= 3, `只扫描到 ${btnTextCount} 个 .btn-text 按钮（下限 3）：V5 的扫描面被写坏`);
  assert.deepEqual(missingArrow, [],
    `纯文字动作必须有尾随箭头（或静态下划线之外的第二个线索）：\n  ${missingArrow.join('\n  ')}`);

  // ③ 「全部 / 查看 / 更多」类纯文字按钮不得落在未入册的裸类上（btn-text / link 之外的按钮必须走按钮族）。
  const bareTextActions = [];
  let labelActions = 0;
  for (const f of FILES) {
    if (!f.rel.endsWith('.js')) continue;
    const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      const attrs = m[1];
      const text = m[2].replace(/<[^>]*>/g, '').trim();
      if (!/^(全部|查看|更多)(\s|›|→|$)/.test(text)) continue;
      labelActions += 1;
      const cls = (/class="([^"]*)"/.exec(attrs) || [null, ''])[1];
      if (/(^|\s)btn-(text|outline|accent|accent-soft|ghost|neutral|danger|sm|md|tab|action)(?![\w-])/.test(cls)) continue;
      if (/(^|\s)link(?![\w-])/.test(cls)) continue;
      bareTextActions.push(`${f.rel}:${lineOf(f.code, m.index)} class="${cls.trim()}" → ${text.slice(0, 16)}`);
    }
  }
  assert.ok(labelActions >= 3, `只扫描到 ${labelActions} 个「全部/查看/更多」动作（下限 3）：V5 口径被写坏`);
  assert.deepEqual(bareTextActions, [],
    `纯文字动作必须挂 .btn-text（600 字重 + 主题色）或 .link，不得用裸类：\n  ${bareTextActions.join('\n  ')}`);

  // ④ 可点箭头不得用最浅中性色 neutral-400 / text-gray-400。
  const dullArrow = [];
  for (const f of FILES) {
    if (!f.rel.endsWith('.js') && !f.rel.endsWith('.html')) continue;
    for (const line of f.code.split('\n')) {
      if (/(text-gray-400|neutral-400)[^\n]{0,90}[›→»]|[›→»][^\n]{0,90}(text-gray-400|neutral-400)/.test(line)) {
        dullArrow.push(`${f.rel} → ${line.trim().slice(0, 120)}`);
      }
    }
  }
  assert.doesNotMatch(CSS, /\.wo-jump\s*\{[^}]*neutral-400/, '.wo-jump（行尾箭头）不得用 neutral-400');
  assert.doesNotMatch(CSS, /\.metric-band__jump\s*\{[^}]*neutral-400/, '.metric-band__jump 不得用 neutral-400');
  console.log(`[ui-control-system-guard] V5 .btn-text ${btnTextCount} 个 · 「全部/查看/更多」${labelActions} 个 · 浅色箭头 ${dullArrow.length} 处`);
  assert.deepEqual(dullArrow, [],
    `可点箭头不得用 neutral-400 / text-gray-400（改 neutral-600 或主题 soft-text）：\n  ${dullArrow.join('\n  ')}`);
});

test('V6 图标按钮：视觉 32×32，命中区 ≥44×44，且有无障碍名', () => {
  // ① .btn-icon 视觉 32 + ::after 44
  const icon = /(^|\n)\.btn-icon\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(icon, 'styles.css 缺少 .btn-icon');
  assert.match(icon[2], /width:\s*32px/, '.btn-icon 视觉宽应为 32px');
  assert.match(icon[2], /height:\s*32px/, '.btn-icon 视觉高应为 32px');
  const iconAfter = /\.btn-icon::after\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(iconAfter, '.btn-icon 缺少 ::after 命中区');
  assert.match(iconAfter[1], /max\(100%,\s*44px\)/, '.btn-icon::after 命中区须为 max(100%, 44px)');

  // ② 折叠钮 40×40 视觉 → 44 命中
  const summaryAfter = /\.disclosure__summary::after\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(summaryAfter, '.disclosure__summary 缺少 ::after 命中区（40 视觉 → 44 命中）');
  assert.match(summaryAfter[1], /max\(100%,\s*44px\)/, '.disclosure__summary::after 须为 max(100%, 44px)');
  // ③ 其它自有图标钮（汉堡 / 日历浮层关闭 / 弹窗关闭 / 选人器关闭）统一进 44 命中组
  for (const cls of ['.hamburger-btn', '.cal-mobile-detail-close', '.modal-close-btn', '.person-picker-close-btn']) {
    assert.match(CSS, new RegExp(`${cls}::after[\\s\\S]{0,400}max\\(100%,\\s*44px\\)`),
      `${cls} 缺 44×44 命中区（::after）`);
  }

  // ④ 所有 btn-icon 按钮必须有无障碍名，且样本量非空
  let total = 0;
  const unnamed = [];
  for (const f of FILES) {
    if (!f.rel.endsWith('.js')) continue;
    const re = /<button\b[^>]*\bclass="([^"]*)"[^>]*>/g;
    let m;
    while ((m = re.exec(f.code)) !== null) {
      if (!/(^|\s)btn-icon(?![\w-])/.test(m[1])) continue;
      total += 1;
      if (!/\baria-label(?:ledby)?="/.test(m[0])) {
        unnamed.push(`${f.rel}:${lineOf(f.code, m.index)} class="${m[1].trim()}"`);
      }
    }
  }
  assert.ok(total >= 6, `只扫描到 ${total} 个 .btn-icon 按钮（下限 6）：V6 的扫描面被写坏`);
  console.log(`[ui-control-system-guard] V6 图标按钮 ${total} 个（44 命中组 4 类 + .btn-icon）`);
  assert.deepEqual(unnamed, [], `图标按钮必须有 aria-label / aria-labelledby：\n  ${unnamed.join('\n  ')}`);
});

/** 取 CSS 变量块（行首选择器 sel 后第一对花括号）；用于在 :root / 深色段内解析 var() */
function cssVarBlock(css, sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(^|\\n)\\s*${esc}\\s*\\{`).exec(css);
  if (!m) return '';
  const start = css.indexOf('{', m.index);
  const end = css.indexOf('}', start);
  return start < 0 || end < 0 ? '' : css.slice(start + 1, end);
}
/** 在块内解析 `var(--x)`（只解一层，找不到则回退到 root 块） */
function resolveVar(block, root, name) {
  const re = new RegExp(`--${name}\\s*:\\s*([^;]+);`);
  const m = re.exec(block) || re.exec(root);
  return m ? m[1].trim() : '';
}
function hexOf(value, block, root, depth = 0) {
  if (depth > 4) return '';
  const v = String(value || '').trim();
  const ref = /^var\(--([\w-]+)\)$/.exec(v);
  if (ref) return hexOf(resolveVar(block, root, ref[1]), block, root, depth + 1);
  return /^#[0-9a-f]{3,8}$/i.test(v) ? v.toLowerCase() : '';
}
function relLum(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a, b) {
  const la = relLum(a);
  const lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test('V7 可点行 hover：--surface-hover 对比 ≥1.2:1（白卡），并叠加 3px 主题左条', () => {
  const root = cssVarBlock(CSS_BARE, ':root');
  const dark = cssVarBlock(CSS_BARE, 'html.theme-dark');
  assert.ok(root && dark, 'styles.css 缺少 :root / html.theme-dark 变量块');

  const hover = resolveVar(root, root, 'surface-hover');
  const hoverDark = resolveVar(dark, root, 'surface-hover');
  assert.ok(hover && hoverDark, '缺少 --surface-hover（亮/暗）');
  // 旧值回归：1.06–1.11:1 的浅灰不得回来。
  assert.doesNotMatch(CSS, /--surface-hover:\s*#F3F4F6/i, '--surface-hover 不得回落到 #F3F4F6（对白卡仅 1.11:1）');
  assert.doesNotMatch(CSS, /--surface-hover:\s*#1E293B/i, '暗色 --surface-hover 不得回落到 #1E293B（对深卡仅 1.15:1）');

  const cases = [
    ['亮色', root, root],
    ['暗色', dark, root],
  ];
  const readings = [];
  for (const [label, block, base] of cases) {
    const h = hexOf(resolveVar(block, base, 'surface-hover'), block, base);
    const card = hexOf(resolveVar(block, base, 'surface-card'), block, base);
    const page = hexOf(resolveVar(block, base, 'surface-page'), block, base);
    assert.ok(h && card && page, `${label}：surface 变量无法解析为 hex（hover=${h} card=${card} page=${page}）`);
    const cCard = contrast(h, card);
    const cPage = contrast(h, page);
    readings.push(`${label} hover ${h} vs 卡片 ${card}=${cCard.toFixed(2)}:1 · vs 页面 ${page}=${cPage.toFixed(2)}:1`);
    assert.ok(cCard >= 1.2, `${label}：--surface-hover 对卡片仅 ${cCard.toFixed(2)}:1（要求 ≥1.2）`);
    // 页面底（暖纸）上的可点行另有 3px 主题左条；数值下限取 1.15 防回退，实测见读数。
    assert.ok(cPage >= 1.15, `${label}：--surface-hover 对页面底仅 ${cPage.toFixed(2)}:1（要求 ≥1.15，配左条）`);
  }

  // 可点行 hover 必须同时出底与左条（非颜色线索），且不得覆盖选中态。
  const rowHover = /\.list-row\[data-interactive="true"\]:hover\s*\{([^}]*)\}/.exec(CSS_BARE);
  assert.ok(rowHover, 'styles.css 缺 .list-row[data-interactive="true"]:hover');
  assert.match(rowHover[1], /background-color:\s*var\(--surface-hover\)/, '可点行 hover 必须改底');
  assert.match(rowHover[1], /linear-gradient\(to right,\s*var\(--app-accent\) 0 3px/, '可点行 hover 须同时出 3px 主题左条');
  assert.match(CSS_BARE, /\.list-row\[data-interactive="true"\]\[data-selected="true"\]:hover\s*\{[^}]*background-color:\s*var\(--app-accent-soft-bg\)/,
    '选中行 hover 必须保持主题 soft-bg（不得被 hover 底覆盖）');

  // 结论带的筛选 chip 必须有静态描边/底色（可切换控件，不是纯文字）。
  assert.match(CSS_BARE, /button\.metric-band__item--filter\s*\{[^}]*border:\s*1px solid var\(--neutral-200\)/,
    '筛选 chip 必须有 1px 描边（可切换控件）');
  assert.match(CSS_BARE, /button\.metric-band__item--filter\s*\{[^}]*background:\s*var\(--neutral-0\)/,
    '筛选 chip 必须有底色');

  console.log(`[ui-control-system-guard] V7 ${readings.join(' · ')}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// FOCUS-1…3：焦点单环（2026-10-28）
//   病灶：输入框键盘聚焦时 `:focus` 与 `:focus-visible` 同时命中——
//     `:focus` 画 `box-shadow: 0 0 0 3px var(--app-accent-soft-bg)`（对白卡 1.11:1，暗色比卡片更暗），
//     `:focus-visible` 再画 `outline: 2px solid var(--app-accent)` ⇒ 两个环叠在一起（「黑环 + 金环」）。
//   `<select>`（.cs-trigger）实测同样是两条声明，但 3px 环几乎不可见，肉眼只看到一条金环。
//   口径：环只由 `:focus-visible` 的一条实线 outline 承担，与 <select> 同宽 / 同色 / 同偏移
//     （2px / --app-accent / offset 1px；对白卡 3.83:1、对页面底 3.66:1）。
//   覆盖：页内检索（.lf-kw）· 下载内嵌搜索（.cs-search-input）· 归档搜索（#archive-search）·
//     全站搜索（#ref-search-input）· 帮助页搜索（.help-search-input）· 选人器搜索（.person-picker-search）。
// ═════════════════════════════════════════════════════════════════════════════
const HELP_HTML = readFileSync(join(ROOT, 'docs', 'help.html'), 'utf8');
const PERSON_PICKER_CSS = readFileSync(join(SRC, 'components', 'person-picker.css'), 'utf8');
const ARCHIVE_HTML = readFileSync(join(ROOT, 'docs', 'archive.html'), 'utf8');
const SEARCH_HTML = readFileSync(join(ROOT, 'docs', 'search.html'), 'utf8');
const LIST_FILTER_JS = readFileSync(join(SRC, 'components', 'ui', 'list-filter.js'), 'utf8');
const CUSTOM_SELECT_JS = readFileSync(join(SRC, 'components', 'ui', 'custom-select.js'), 'utf8');

/** 规则块（剥注释但保留换行 ⇒ 行号可核）：{ selector(空白归一), body, line } */
function ruleBlocks(css) {
  const bare = String(css).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const out = [];
  for (const m of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2], line: lineOf(bare, m.index) });
  }
  return out;
}

/** 取某条声明的**最后一条**值（CSS 同块内后者胜出）；无声明返回 null */
function declOf(body, prop) {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'gi');
  let value = null;
  for (const m of body.matchAll(re)) value = m[1].trim().replace(/\s*!important$/i, '');
  return value;
}

/** 选择器列表里以某伪类结尾的基选择器（`:focus` 不会命中 `:focus-within`） */
function basesOf(selector, pseudo) {
  return selector.split(',').map((s) => s.trim())
    .filter((s) => s.endsWith(pseudo))
    .map((s) => s.slice(0, -pseudo.length).trim());
}

/** 是否画出了可见的环（none / 0 0 0 0 transparent 视为不画） */
const paintsRing = (value) => !!value
  && !/^none$/i.test(value)
  && !/^0(?:px)? 0(?:px)? 0(?:px)? 0(?:px)?(?: (?:transparent|rgba\(0,\s*0,\s*0,\s*0\)))?$/i.test(value);

/** 双环检测：同一基选择器上，`:focus` 画 box-shadow 环 且 `:focus-visible` 画 outline 环 */
function doubleRingViolations(css) {
  const shadow = new Map(); // base → line
  const outline = new Map(); // base → line
  for (const b of ruleBlocks(css)) {
    if (paintsRing(declOf(b.body, 'box-shadow'))) {
      for (const base of basesOf(b.selector, ':focus')) shadow.set(base, b.line);
    }
    if (paintsRing(declOf(b.body, 'outline'))) {
      for (const base of basesOf(b.selector, ':focus-visible')) outline.set(base, b.line);
    }
  }
  const out = [];
  for (const [base, line] of shadow) {
    if (outline.has(base)) {
      out.push(`${base}：:focus 的 box-shadow 环（第 ${line} 行）与 :focus-visible 的 outline 环（第 ${outline.get(base)} 行）叠加`);
    }
  }
  return out;
}

/** 选择器列表精确含 selector 的规则体（用于核对「同一个块」的声明） */
function blockBodyOf(css, selector) {
  const hit = ruleBlocks(css).find((b) => b.selector.split(',').map((s) => s.trim()).includes(selector));
  return hit ? hit.body : '';
}

// 反例 / 正例（合成样本，必须先证明检测函数会判红、不会误红）
const SYNTH_DOUBLE = '.probe:focus { border-color: red; box-shadow: 0 0 0 3px rgba(0,0,0,.2); }\n'
  + '.probe:focus-visible { outline: 2px solid red; outline-offset: 1px; }';
const SYNTH_DOUBLE_SAME_BLOCK = '.probe:focus, .probe:focus-visible { box-shadow: 0 0 0 3px red; outline: 2px solid red; }';
const SYNTH_SINGLE = '.probe:focus { border-color: red; box-shadow: none; outline: none; }\n'
  + '.probe:focus-visible { outline: 2px solid red; outline-offset: 1px; }';

test('FOCUS-1 焦点单环：同一选择器（块）不得同时出 :focus 的 box-shadow 环与 :focus-visible 的 outline 环', () => {
  // ① 反例：两条规则叠环 ⇒ 必须判红（否则判据是恒真的空转）
  assert.equal(doubleRingViolations(SYNTH_DOUBLE).length, 1,
    '反例未被判红：双环检测失效（判据会变成恒真）');
  // ② 反例：同一个规则块内同时写两种环 ⇒ 同样判红
  assert.equal(doubleRingViolations(SYNTH_DOUBLE_SAME_BLOCK).length, 1,
    '同一规则块内的双环未被判红');
  // ③ 正例：单环（:focus 只改边 / 清环）⇒ 不得误红
  assert.equal(doubleRingViolations(SYNTH_SINGLE).length, 0,
    '正例被判红：双环检测把合法的单环也算成了双环');

  // ④ 实况：styles.css 全表零双环
  const blocks = ruleBlocks(CSS);
  assert.ok(blocks.length >= 400, `styles.css 只解析到 ${blocks.length} 个规则块（下限 400）：FOCUS-1 扫描面被写坏`);
  const violations = doubleRingViolations(CSS);
  console.log(`[ui-control-system-guard] FOCUS-1 规则块 ${blocks.length} 个 · 双环 ${violations.length} 处`);
  assert.deepEqual(violations, [],
    `同一控件同时画 box-shadow 环与 outline 环（键盘聚焦会出现两个环）：\n  ${violations.join('\n  ')}`);

  // ⑤ 字段外壳的 `:focus` 必须显式清环（不是靠「没写」碰巧对）
  assert.match(blockBodyOf(CSS, '.input-flat:focus'), /box-shadow:\s*none\s*;/,
    '.input-flat:focus 必须显式 box-shadow: none（画环即与 :focus-visible 的 outline 叠成双环）');
  assert.match(blockBodyOf(CSS, '.cs-trigger:focus-within'), /box-shadow:\s*none\s*;/,
    '.cs-trigger:focus-within 必须显式 box-shadow: none（否则 <button> 触发器会落到全局 6px --focus-halo 补环上）');
});

test('FOCUS-2 输入族只变边框色（零 outline / 零 box-shadow），且与 <select> 共用同一规则块', () => {
  // ① 不得存在裸元素级 :focus-visible 全局规则（那会给所有输入再套一圈）
  const bareGlobal = ruleBlocks(CSS).filter((b) => b.selector.split(',').map((s) => s.trim())
    .some((s) => /^(?::focus-visible|input:focus-visible|textarea:focus-visible|select:focus-visible)$/.test(s)));
  assert.deepEqual(bareGlobal.map((b) => `styles.css:${b.line} → ${b.selector}`), [],
    '存在裸元素级 :focus-visible 全局规则 ⇒ 搜索框会被二次套环');

  // ② 搜索 / 输入面：聚焦只允许 border-color，不得出现 outline / box-shadow
  const cases = [
    ['页内检索 / 归档搜索 / 全站搜索（.lf-kw · #archive-search · #ref-search-input）', CSS, '.input-flat:focus'],
    ['下拉内嵌搜索（.cs-search-input）', CSS, '.cs-search-input:focus'],
    ['帮助页搜索（.help-search-input）', HELP_HTML, '.help-search-input:focus'],
    ['帮助页角色筛选（.help-role-filter）', HELP_HTML, '.help-role-filter:focus'],
    ['选人器搜索（.person-picker-search）', PERSON_PICKER_CSS, '.person-picker-search:focus'],
  ];
  for (const [label, src, selector] of cases) {
    const body = blockBodyOf(src, selector);
    assert.ok(body, `缺少 ${label} 的焦点规则块（${selector}）`);
    assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/,
      `${label} 聚焦应只把边框切到主题色（--app-accent）`);
    assert.equal(paintsRing(declOf(body, 'outline')), false,
      `${label} 是输入族，不得用 outline 画焦点（只允许 border-color）`);
    assert.equal(paintsRing(declOf(body, 'box-shadow')), false,
      `${label} 不得用 box-shadow 画焦点`);
  }

  // ③ <select> 基准：它与 .input-flat 共用同一个规则块（同一口径，不是两份相近声明）
  const focusBlock = ruleBlocks(CSS).find((b) => b.selector.split(',').map((s) => s.trim()).includes('.input-flat:focus'));
  assert.ok(focusBlock, 'styles.css 缺少 .input-flat:focus 规则块');
  for (const sel of ['.input-flat:focus-visible', '.cs-trigger:focus-within', '.cs-trigger:focus-visible']) {
    assert.ok(focusBlock.selector.split(',').map((s) => s.trim()).includes(sel),
      `<select>（.cs-trigger）与输入框必须共用同一条焦点规则（缺 ${sel}）`);
  }
  assert.match(focusBlock.body, /outline:\s*none\s*;/, '输入族规则块必须显式清掉 outline（.cs-trigger 是 <button>）');

  // ④ 四个页面搜索面确实挂在这套类上（不是只改了 CSS、DOM 没接上）
  assert.match(ARCHIVE_HTML, /id="archive-search"[^>]*class="[^"]*input-flat/,
    'archive.html 的 #archive-search 未挂 .input-flat');
  assert.match(SEARCH_HTML, /id="ref-search-input"[^>]*class="[^"]*input-flat/,
    'search.html 的 #ref-search-input 未挂 .input-flat');
  assert.match(LIST_FILTER_JS, /class="input-flat[^"]*lf-kw/, 'list-filter.js 的检索条未挂 .input-flat + .lf-kw');
  assert.match(CUSTOM_SELECT_JS, /class="cs-search-input"/, 'custom-select.js 未渲染 .cs-search-input');

  // ⑤ 边框色（焦点信号）对背景 ≥3:1（WCAG 1.4.11 非文本对比；主题色亮档 vs 白卡 / 页面底）
  const accent = /--app-accent-base-light:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
  assert.ok(accent, 'styles.css 缺少 --app-accent-base-light（无法核算边框对比度）');
  const vsCard = contrast(accent, '#FFFFFF');
  const vsPage = contrast(accent, '#FAFAF5');
  console.log(`[ui-control-system-guard] FOCUS-2 焦点边框 ${accent} vs 白卡 ${vsCard.toFixed(2)}:1 · vs 页面底 ${vsPage.toFixed(2)}:1`);
  assert.ok(vsCard >= 3, `焦点边框对白卡仅 ${vsCard.toFixed(2)}:1（要求 ≥3）`);
  assert.ok(vsPage >= 3, `焦点边框对页面底仅 ${vsPage.toFixed(2)}:1（要求 ≥3）`);
});

test('FOCUS-3 「考勤良好」数值不再用 --status-success（24px 大字 ≥3:1），绿色只留图标', () => {
  // --status-success 亮色 #10B981 对白卡 2.54:1（24px 大字要求 ≥3:1）；
  // 仓内无更深的成功文字 token（--status-warning-text 是警示档、--color-functional-* 是红/金），
  // 故数值退回正文色 --neutral-800，绿色只留在 .stat-icon-tint 的图标笔触上（装饰、aria-hidden）。
  assert.match(STATS, /const ATTENDANCE_VALUE_COLOR = \{[\s\S]{0,80}good: 'var\(--neutral-800\)'/,
    '「良好」档数值色应为 --neutral-800（--status-success 作 24px 数值仅 2.54:1）');
  assert.match(STATS, /color: ATTENDANCE_TONE_COLOR\[myTone\], valueColor: ATTENDANCE_VALUE_COLOR\[myTone\]/,
    '考勤卡须把「图标色」与「数值色」分开取（图标留绿、数值退回正文色）');
  assert.match(STATS, /style="color:\$\{s\.valueColor \|\| s\.color\};"/,
    '数值必须优先取 valueColor（缺省回落到图标色）');
  assert.match(STATS, /class="stat-icon-tint" style="--tint:\$\{s\.color\};"/,
    '图标块仍取绿色 --status-success 作点缀');
  const success = /--status-success:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
  assert.ok(success, 'styles.css 缺少 --status-success');
  const green = contrast(success, '#FFFFFF');
  const body = contrast('#1F2937', '#FFFFFF');
  console.log(`[ui-control-system-guard] FOCUS-3 --status-success/白卡 ${green.toFixed(2)}:1（大字不达标）· --neutral-800/白卡 ${body.toFixed(2)}:1`);
  assert.ok(green < 3, `反证失败：--status-success 对白卡应为 ${green.toFixed(2)}:1（<3），否则本断言失去意义`);
  assert.ok(body >= 4.5, `--neutral-800 对白卡 ${body.toFixed(2)}:1 应 ≥4.5`);
});

// ═════════════════════════════════════════════════════════════════════════════
// FOCUS-4…5：全站焦点单一来源 ＋ 七主题焦点环对比度（2026-10-29 P1 全量扫描）
//   P1：任一控件在任一时刻最多一个焦点信号。
//     · 有边框控件（输入 / 多行文本 / 下拉触发器 / 搜索框）＝只用 border-color；
//     · 无边框控件（按钮 / 链接 / 页签 / 行 / 徽章）＝只加一圈 2px 主题色实线，且只由 :focus-visible 触发；
//     · 任一规则块不得同时声明非 none 的 outline 与非 none 的 box-shadow；
//     · 焦点色只来自 var(--app-accent)；固定党徽金 #FFD700 / 党建红 #CE1126 / 深棕一律禁止；
//     · 登记例外：实底控件取反色 --app-accent-strong-ink（内侧 offset -2px）；
//       顶栏深红底用白色令牌 --app-accent-strong-ink-light；person-picker 的 --pp-accent 是主题色注入别名。
//   扫描面：docs/src/**/*.css ＋ docs/src/**/*.js 模板串 ＋ docs/*.html 内联样式与类名。
// ═════════════════════════════════════════════════════════════════════════════
const FOCUS_SELECTOR_RE = /:focus(?:-visible|-within)?/;
const FOCUS_ALLOWED_COLOR_TOKENS = [
  'var(--app-accent)',
  'var(--app-accent-strong-ink)',
  'var(--app-accent-strong-ink-light)',
  'var(--pp-accent)',
];
const FOCUS_FORBIDDEN_COLORS = [/#FFD700/i, /#CE1126/i, /--party-gold/, /--party-red/, /--help-party-red/];
/** 有边框控件：只允许 border-color 变主题色（出现 outline / box-shadow 即红） */
const INPUT_FAMILY_BASES = [
  '.input-flat', '.input-flat-sm', '.cs-trigger', '.cs-search-input',
  '.vote-note', '.person-picker-search', '.help-search-input', '.help-role-filter',
];
/** 无边框控件：必须有一圈 2px 主题色实线（无环即红） */
const BUTTON_FAMILY_BASES = [
  'button', 'a', 'summary', '[role="button"]', '[role="option"]', '[role="tab"]',
  '[data-interactive="true"]', '.focus-ring', '.skip-link',
  '.btn-accent', '.btn-accent-soft', '.btn-outline', '.btn-ghost', '.btn-text',
  '.btn-danger', '.btn-danger-solid', '.btn-tab', '.tab-btn', '.subtab',
  '.status-badge', '.cs-option', '.notif-dropdown-item', '.help-toc-item',
  '.help-search-result', '.help-quick-tasks a', '.help-browse summary',
];

/** 单份 CSS 的全量焦点扫描：返回 { problems, focusBlocks } */
function focusScan(css, label) {
  const problems = [];
  const inputSeen = new Map();
  const buttonSeen = new Map();
  let focusBlocks = 0;
  for (const b of ruleBlocks(css)) {
    const sels = b.selector.split(',').map((s) => s.trim());
    const focusSels = sels.filter((s) => FOCUS_SELECTOR_RE.test(s));
    const outline = declOf(b.body, 'outline');
    const shadow = declOf(b.body, 'box-shadow');
    // 任一规则块：焦点信号层数 ≤1（outline 与非 none 的 box-shadow 并存即红）
    if (paintsRing(outline) && paintsRing(shadow)) {
      problems.push(`${label}:${b.line} ${b.selector}：同一规则块同时声明 outline 与 box-shadow 两条环`);
    }
    if (!focusSels.length) continue;
    focusBlocks += 1;
    if (paintsRing(shadow)) {
      problems.push(`${label}:${b.line} ${b.selector}：焦点不得用 box-shadow 画环（${shadow}）`);
    }
    if (paintsRing(outline)) {
      for (const re of FOCUS_FORBIDDEN_COLORS) {
        if (re.test(outline)) {
          problems.push(`${label}:${b.line} ${b.selector}：焦点色「${outline}」是固定党徽金 / 党建红 / 深棕（禁止）`);
        }
      }
      if (!FOCUS_ALLOWED_COLOR_TOKENS.some((t) => outline.includes(t))) {
        problems.push(`${label}:${b.line} ${b.selector}：焦点环色「${outline}」不是 var(--app-accent)（或登记取反别名）`);
      }
    }
    for (const sel of focusSels) {
      const base = sel.replace(/:focus(?:-visible|-within)?$/, '');
      if (INPUT_FAMILY_BASES.some((x) => base === x || base.startsWith(`${x}[`))) {
        if (paintsRing(outline)) {
          problems.push(`${label}:${b.line} ${sel}：输入族不得用 outline 画焦点（只允许 border-color）`);
        }
        const rec = inputSeen.get(base) || { color: false };
        if (/border-color:\s*var\(--app-accent\)\s*;/.test(b.body)) rec.color = true;
        inputSeen.set(base, rec);
      }
      if (BUTTON_FAMILY_BASES.includes(base) && !/:disabled|\[data-disabled/.test(sel)) {
        const rec = buttonSeen.get(base) || { ring: false };
        if (paintsRing(outline)) rec.ring = true;
        buttonSeen.set(base, rec);
      }
    }
  }
  for (const [base, rec] of inputSeen) {
    if (!rec.color) problems.push(`${label}：输入族 ${base} 有焦点规则但没有 border-color: var(--app-accent)`);
  }
  for (const [base, rec] of buttonSeen) {
    if (!rec.ring) problems.push(`${label}：按钮族 ${base} 的焦点规则没有环（outline 为空或 none）`);
  }
  return { problems, focusBlocks };
}

/** JS / HTML 行内焦点工具类（绕过 styles.css 的第二套写法） */
function inlineFocusProblems(src) {
  const problems = [];
  src.split('\n').forEach((line, i) => {
    const ln = i + 1;
    if (/focus(?:-visible)?:(?:outline|ring)/.test(line)) {
      problems.push(`第 ${ln} 行：行内焦点工具类绕过 styles.css（${line.trim().slice(0, 100)}）`);
    }
    if (/outline-\[#[0-9A-Fa-f]{3,8}\]/.test(line)) {
      problems.push(`第 ${ln} 行：硬编码 hex 焦点环（${line.trim().slice(0, 100)}）`);
    }
    if (/(#FFD700|#CE1126|outline-blue|ring-blue)/i.test(line) && /focus/i.test(line)) {
      problems.push(`第 ${ln} 行：焦点色写死党徽金 / 党建红 / 蓝色工具类（${line.trim().slice(0, 100)}）`);
    }
  });
  return problems;
}

/** HTML 页内的 <style> 段；CSS 文件原样返回 */
function cssOf(label, src) {
  return label.endsWith('.html')
    ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
    : src;
}

/** 递归收集 docs/src 下 .css（与 .js 扫描面同源） */
function walkCss(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkCss(p, out);
    else if (name.endsWith('.css')) out.push(p);
  }
  return out;
}

test('FOCUS-4 全量扫描：每控件最多一个焦点信号；输入族零 outline；按钮族必有环；焦点色无党徽金/党建红', () => {
  // ① 反例：同一规则块「边框 + outline 环 + box-shadow 环」三层 ⇒ 必须判红
  const SYNTH_LAYERS = '.probe:focus { border-color: red; outline: 2px solid red; box-shadow: 0 0 0 3px red; }';
  assert.ok(focusScan(SYNTH_LAYERS, 'probe').problems.some((p) => /两条环/.test(p)),
    '反例未被判红：同一规则块的 outline + box-shadow 双层检测失效');
  // ② 反例：输入族出现 outline ⇒ 必须判红
  const SYNTH_INPUT = '.input-flat:focus { border-color: var(--app-accent); outline: 2px solid var(--app-accent); }';
  assert.ok(focusScan(SYNTH_INPUT, 'probe').problems.some((p) => /输入族不得用 outline/.test(p)),
    '反例未被判红：输入族写 outline 必须命中');
  // ③ 反例：按钮族无环 ⇒ 必须判红
  const SYNTH_BTN = 'button:focus-visible { outline: none; box-shadow: none; }';
  assert.ok(focusScan(SYNTH_BTN, 'probe').problems.some((p) => /按钮族 button/.test(p)),
    '反例未被判红：按钮族没有焦点环必须命中');
  // ④ 反例：焦点色改用固定党徽金 / 党建红 ⇒ 必须判红
  const SYNTH_GOLD = '.probe:focus-visible { outline: 2px solid #FFD700; box-shadow: none; }';
  const SYNTH_RED = '.probe:focus-visible { outline: 2px solid #CE1126; box-shadow: none; }';
  assert.ok(focusScan(SYNTH_GOLD, 'probe').problems.length >= 1, '反例未被判红：#FFD700 作焦点色');
  assert.ok(focusScan(SYNTH_RED, 'probe').problems.length >= 1, '反例未被判红：#CE1126 作焦点色');
  // ⑤ 正例：输入族只变色 + 按钮族单环 ⇒ 不得误红
  const SYNTH_OK = '.input-flat:focus { border-color: var(--app-accent); outline: none; box-shadow: none; }\n'
    + 'button:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 1px; box-shadow: none; }';
  assert.deepEqual(focusScan(SYNTH_OK, 'probe').problems, [], '正例被判红：合法的单信号焦点被误判');
  // ⑥ 反例 / 正例：行内焦点工具类
  assert.ok(inlineFocusProblems('<div class="focus-visible:outline focus-visible:outline-[#CE1126]">').length >= 1,
    '反例未被判红：行内 focus-visible:outline-[#CE1126] 必须命中');
  assert.equal(inlineFocusProblems('<div class="focus-ring">').length, 0,
    '正例被判红：统一语义类 focus-ring 不得命中');
  console.log(`[ui-control-system-guard] FOCUS-4 反例判定：双层 ${focusScan(SYNTH_LAYERS, 'probe').problems.length} 处 · 输入 outline ${focusScan(SYNTH_INPUT, 'probe').problems.length} 处 · 按钮无环 ${focusScan(SYNTH_BTN, 'probe').problems.length} 处 · #FFD700 ${focusScan(SYNTH_GOLD, 'probe').problems.length} 处 · #CE1126 ${focusScan(SYNTH_RED, 'probe').problems.length} 处 · 行内工具类 ${inlineFocusProblems('<div class="focus-visible:outline focus-visible:outline-[#CE1126]">').length} 处`);

  // ⑦ 实况全量：CSS 文件 ＋ HTML 内联 <style> / 类名 ＋ JS 模板串
  const cssFiles = walkCss(SRC);
  const htmlFiles = readdirSync(join(ROOT, 'docs'))
    .filter((n) => n.endsWith('.html')).map((n) => join(ROOT, 'docs', n));
  const jsFiles = walkJs(SRC);
  assert.ok(cssFiles.length >= 4, `只扫描到 ${cssFiles.length} 个 CSS 文件（下限 4）`);
  assert.ok(jsFiles.length >= 250, `只扫描到 ${jsFiles.length} 个 JS 文件（下限 250）`);
  assert.ok(htmlFiles.length >= 15, `只扫描到 ${htmlFiles.length} 个 HTML 文件（下限 15）`);

  let focusBlocks = 0;
  const problems = [];
  for (const p of cssFiles) {
    const label = relative(ROOT, p).replace(/\\/g, '/');
    const r = focusScan(readFileSync(p, 'utf8'), label);
    focusBlocks += r.focusBlocks;
    problems.push(...r.problems);
  }
  for (const p of htmlFiles) {
    const label = relative(ROOT, p).replace(/\\/g, '/');
    const src = readFileSync(p, 'utf8');
    const r = focusScan(cssOf(label, src), label);
    focusBlocks += r.focusBlocks;
    problems.push(...r.problems);
    problems.push(...inlineFocusProblems(src).map((x) => `${label} ${x}`));
  }
  for (const p of jsFiles) {
    const label = relative(ROOT, p).replace(/\\/g, '/');
    problems.push(...inlineFocusProblems(readFileSync(p, 'utf8')).map((x) => `${label} ${x}`));
  }
  assert.ok(focusBlocks >= 40, `只扫描到 ${focusBlocks} 条焦点规则（下限 40）：扫描面被写坏，本断言会恒真`);
  console.log(`[ui-control-system-guard] FOCUS-4 焦点规则 ${focusBlocks} 条 · CSS ${cssFiles.length} / JS ${jsFiles.length} / HTML ${htmlFiles.length} · 违规 ${problems.length} 处`);
  assert.deepEqual(problems, [],
    `焦点必须只有一个信号（输入族只变色 / 按钮族只有一圈 / 不得用 box-shadow / 不得用党徽金或党建红）：\n  ${problems.join('\n  ')}`);
});

test('FOCUS-5 七主题 base 焦点环：对白卡 #FFFFFF 与深卡 #141D2F 均 ≥3:1（逐色日志）', () => {
  const CARD_LIGHT = '#FFFFFF';
  const CARD_DARK = '#141D2F';
  const keys = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple'];
  assert.deepEqual(Object.keys(ACCENT_COLORS).sort(), [...keys].sort(),
    'ACCENT_COLORS 必须恰为七主题（gold/red/orange/green/cyan/blue/purple）');
  const readings = [];
  for (const key of keys) {
    const light = ACCENT_COLORS[key].light.base;
    const dark = ACCENT_COLORS[key].dark.base;
    assert.match(light, /^#[0-9A-Fa-f]{6}$/, `${key} 亮档 base 不是合法 hex：${light}`);
    assert.match(dark, /^#[0-9A-Fa-f]{6}$/, `${key} 暗档 base 不是合法 hex：${dark}`);
    const vsLight = contrast(light, CARD_LIGHT);
    const vsDark = contrast(dark, CARD_DARK);
    readings.push(`${key} 亮 ${light} vs 白卡 ${vsLight.toFixed(2)}:1 · 暗 ${dark} vs 深卡 ${vsDark.toFixed(2)}:1`);
    assert.ok(vsLight >= 3, `${key} 亮档焦点环对白卡仅 ${vsLight.toFixed(2)}:1（要求 ≥3）`);
    assert.ok(vsDark >= 3, `${key} 暗档焦点环对深卡仅 ${vsDark.toFixed(2)}:1（要求 ≥3）`);
  }
  console.log(`[ui-control-system-guard] FOCUS-5 ${readings.join(' · ')}`);
});
