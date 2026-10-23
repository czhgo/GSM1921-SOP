// role: [工程师]+[AI]
// server/test/ui-control-system-guard.test.mjs — 控件层单一源守卫（2026-10-23 · R11 Task 12.1）
//
// 来源：`.trae/specs/refine-ui-system-and-close-r10/spec.md` 的 SD-1/2/3/4/6/9/10
//   与 `.ctx/logs/2026-10-AUDIT_UI_R11.md` 第五节「SD-1…SD-11 可断言化」。
// 判据（全部静态、纯 node，不起服务、不开浏览器）：
//   SD-1 文本 / 日期 / 下拉 / 多行控件必须挂 `.input-flat` / `.input-flat-sm`；
//        同串不得再出现 `text-sm`、`rounded`/`rounded-lg`、独立 `border`（白名单逐条写理由）。
//   SD-2 边框必须有颜色：CSS 不得出现无颜色 `border: … solid;`；
//        JS/HTML 里 `<button class="… border …">` 的独立 `border` 必须同串有 `border-*` 色类或内联 `border-color`。
//   SD-3 控件圆角只能 8px（`--radius-sm`）；CSS 字面量不得出现 4px / 6px（允许 calc / 999px）。
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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8');
/** 剥注释（保留换行）：规则选择器解析用——注释里的示例类名不参与判据 */
const CSS_BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const TAB_BAR = readFileSync(join(SRC, 'components', 'shell', 'tab-bar.js'), 'utf8');
const TODAY = readFileSync(join(SRC, 'entries', 'tabs', 'today', 'today-tab.js'), 'utf8');
const TODO_SHELL = readFileSync(join(SRC, 'components', 'record', 'todo-tab-shell.js'), 'utf8');

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
 *   · login-input —— 登录独立页专用（未登录前不加载工作台样式），`docs/login.html` 内联定义，
 *     焦点态由 `styles.css:2903` 统一收口。
 *   · vote-note —— 表态附言多行框，`styles.css:2460` 完整定义（白底 / 1px / 8px / focus）。
 *   · help-role-filter —— 帮助页身份筛选下拉，`docs/help.html:149` 完整定义。
 */
const INPUT_WHITELIST = [
  { token: 'person-picker-search', reason: '选人器搜索框，person-picker.css:168 完整定义' },
  { token: 'help-search-input', reason: '帮助页搜索，help.html:135 内联完整定义' },
  { token: 'cs-search-input', reason: '自定义下拉内嵌搜索，styles.css:1223 完整定义' },
  { token: 'login-input', reason: '登录独立页控件，login.html 内联定义 + styles.css:2903 焦点收口' },
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
  assert.deepEqual(bad, [], `圆角不得出现 4px / 6px 例外（控件 8px、卡片 12px、胶囊 999px）：\n  ${bad.join('\n  ')}`);

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

test('SD-6 浅主题底不显白：.btn-accent-soft 不用 --neutral-0；存在 --app-accent-deep', () => {
  assert.match(CSS, /--app-accent-deep\s*:/, '缺少主题色深字令牌 --app-accent-deep');
  const soft = /\.btn-accent-soft\s*\{([^}]*)\}/.exec(CSS);
  assert.ok(soft, '缺少 .btn-accent-soft 规则');
  const bg = /background(?:-color)?\s*:\s*([^;]+);/.exec(soft[1]);
  assert.ok(bg, '.btn-accent-soft 必须显式声明背景');
  const value = bg[1].trim();
  assert.notEqual(value, 'var(--neutral-0)', '.btn-accent-soft 的背景不得为 --neutral-0（近白）');
  assert.ok(/color-mix\(in srgb,\s*var\(--app-accent\)/.test(value),
    `.btn-accent-soft 的背景必须是主题色混白（明显着色），实际：${value}`);
  assert.match(soft[1], /color:\s*var\(--app-accent-deep\)/, '.btn-accent-soft 的文字必须用 --app-accent-deep');
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
