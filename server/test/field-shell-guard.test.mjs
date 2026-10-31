// role: [工程师]+[AI]
// field-shell-guard.test.mjs — 字段外壳 / 下拉统一守卫（2026-10-24 · 批次 508）
//
// 为什么要有本守卫：
//   · 2026-10-29 P1（焦点只有一个信号）：输入族是**有边框控件**——
//     聚焦只允许 `border-color` 变主题色；不画 outline、不画 box-shadow；
//     `:focus` 与 `:focus-visible` 同表现（鼠标点击与键盘聚焦一致）。
//   · 同一批把 select 统一交给 `enhanceSelects`（或全局 MutationObserver）增强，
//     禁止各渲染点自建第二套下拉外观。
//   · 判据：
//       F1 非空转：styles.css 能解析到 `.input-flat` 与 `:focus-visible` 规则
//       F2 活动态：`.input-flat:focus` 边框切主题色，`outline: none` ＋ `box-shadow: none`
//       F3 键盘一致：`.input-flat:focus-visible` 与 `:focus` 同表现（只变边框），不得出环
//       F4 旧双环变量退场：`.input-flat:focus` 与暗色段均不引用 `--focus-ring` / `--focus-halo`
//       F5 禁用 / 只读分态：两者都存在且声明不同（禁用灰底 / 只读透明边）
//       F6 select 统一：渲染 `<select>` 的文件必须本地 enhanceSelects / data-cs-enhanced，
//          或落在 `.input-flat` 上由全局 MutationObserver 增强；例外逐条登记理由
//   · 口径调整（据实况，不删断言）：
//       2026-10-28：原 F2 要求 `:focus` 只改边框、环只由 `:focus-visible` 承担；支书裁定
//       「鼠标点击与键盘聚焦表现一致」后，环改由 `:focus` 承担（几何与 `:focus-visible` 相同）。
//       2026-10-29 P1：输入框「边框还是很脏很厚」⇒ 全部退回只变边框（无 outline / 无 box-shadow）；
//       F2/F3 判据改为「只变色、零环、零阴影」，并同批核算七主题边框色 vs 白卡 ≥3:1。
// 运行：node --test server/test/field-shell-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCENT_COLORS } from '../../docs/src/core/domain/constants.js?v=20261031a';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS_SRC = join(ROOT, 'docs', 'src');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const relOf = (abs) => relative(ROOT, abs).replace(/\\/g, '/');
const STYLES = read('docs/src/styles.css');

/** 是否画出了可见的环（none / 0 0 0 0 transparent 视为不画） */
const paintsRing = (value) => !!value
  && !/^none$/i.test(value)
  && !/^0(?:px)? 0(?:px)? 0(?:px)? 0(?:px)?(?: (?:transparent|rgba\(0,\s*0,\s*0,\s*0\)))?$/i.test(value);

/** sRGB 相对亮度（WCAG 定义） */
function luminance(hex) {
  const raw = String(hex).replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 取选择器列表精确包含 selector 的第一条规则体（先剥注释，避免注释里的花括号干扰） */
function ruleBody(css, selector, from = 0) {
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  re.lastIndex = from;
  let m;
  while ((m = re.exec(src))) {
    const sels = m[1].split(',').map((s) => s.trim());
    if (sels.includes(selector)) return m[2];
  }
  return '';
}

/** 取以 needle 开头的块的内部文本（大括号配对；注释已剥离） */
function blockAfter(css, needle) {
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const i = src.indexOf(needle);
  if (i < 0) return '';
  const start = src.indexOf('{', i);
  if (start < 0) return '';
  let depth = 0;
  for (let p = start; p < src.length; p += 1) {
    if (src[p] === '{') depth += 1;
    else if (src[p] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, p);
    }
  }
  return '';
}

/** 递归收集 docs/src 下 .js */
function walkJs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'fonts' || e.name === 'images') continue;
      walkJs(p, out);
      continue;
    }
    if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const isCommentLine = (line) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};

/** 实际渲染 <select> 的源码行（排除注释里的用法示例） */
function selectLines(src) {
  return src.split('\n').filter((line) => !isCommentLine(line) && line.includes('<select'));
}

/**
 * F6 例外：渲染 select 但既未本地 enhanceSelects，也没有把 input-flat 写在 select 标签上。
 * 依赖全局 MutationObserver（bootstrap.js）或类名由变量承载。
 */
const SELECT_EXCEPTIONS = [
  {
    file: 'docs/src/components/sections/help-catalog.js',
    reason: 'help 页角色筛选是原生 select（help-role-filter，非 .input-flat 表单族；保留原生可访问性，不做圆角增强）',
  },
  {
    file: 'docs/src/components/ui/form-field.js',
    reason: 'selectField 的 class 由局部变量 cls 承载（恒为 input-flat w-full），由全局 MutationObserver 增强；标签行不含字面 input-flat',
  },
];

test('F1 非空转：styles.css 可解析到 .input-flat 与 :focus-visible 规则', () => {
  const base = ruleBody(STYLES, '.input-flat');
  assert.ok(base, 'styles.css 缺少 .input-flat 规则（字段外壳底座）');
  const focusVisible = ruleBody(STYLES, '.input-flat:focus-visible');
  assert.ok(focusVisible, 'styles.css 缺少 .input-flat:focus-visible 规则（键盘焦点保险）');
});

test('F2 活动态：.input-flat:focus 边框切主题色，零 outline / 零 box-shadow', () => {
  const body = ruleBody(STYLES, '.input-flat:focus');
  assert.ok(body, 'styles.css 缺少 .input-flat:focus 规则');
  assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/, '.input-flat:focus 必须把边框切到 var(--app-accent)');
  // 2026-10-29 P1：有边框控件只有一个信号——只变边框色，不得再画 outline / box-shadow。
  assert.equal(paintsRing(/(?:^|;)\s*outline\s*:\s*([^;]+)/.exec(body)?.[1]),
    false, '.input-flat:focus 不得出 outline（输入族只允许 border-color）');
  assert.equal(paintsRing(/(?:^|;)\s*box-shadow\s*:\s*([^;]+)/.exec(body)?.[1]),
    false, '.input-flat:focus 不得出 box-shadow（输入族只允许 border-color）');
  assert.doesNotMatch(body, /--focus-ring/, '.input-flat:focus 不得引用旧 --focus-ring（唯一来源是 --app-accent）');

  // 边框色 vs 白卡 ≥3:1，七主题逐色输出（不放宽对比度）。
  const keys = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple'];
  for (const key of keys) {
    const light = ACCENT_COLORS[key].light.base;
    const ratio = contrast(light, '#FFFFFF');
    console.log(`[field-shell-guard] F2 边框色 ${key} ${light} vs 白卡 ${ratio.toFixed(2)}:1`);
    assert.ok(ratio >= 3, `${key} 输入框焦点边框对白卡仅 ${ratio.toFixed(2)}:1（要求 ≥3）`);
  }
});

test('F3 键盘一致：.input-flat:focus-visible 与 :focus 同表现（只变边框、不出环）', () => {
  const body = ruleBody(STYLES, '.input-flat:focus-visible');
  assert.ok(body, 'styles.css 缺少 .input-flat:focus-visible 规则');
  assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/,
    '.input-flat:focus-visible 必须把边框切到 var(--app-accent)（键盘与鼠标同表现）');
  assert.equal(paintsRing(/(?:^|;)\s*outline\s*:\s*([^;]+)/.exec(body)?.[1]),
    false, '.input-flat:focus-visible 不得出 outline（键盘聚焦也不得比鼠标多一个信号）');
  assert.equal(paintsRing(/(?:^|;)\s*box-shadow\s*:\s*([^;]+)/.exec(body)?.[1]),
    false, '.input-flat:focus-visible 不得出 box-shadow');
  // 聚焦块必须与 :focus 同一条规则（不是各写一套）。
  const sameBlock = ruleBody(STYLES, '.input-flat:focus');
  assert.equal(sameBlock, body, '.input-flat:focus 与 :focus-visible 必须在同一个规则块（禁止两套口径）');
});

test('F4 旧双环变量退场：.input-flat:focus 与暗色段均不引用 --focus-ring / --focus-halo', () => {
  // 2026-10-28：焦点只用 --app-accent，旧的深灰环 / 黑晕变量整站删除；
  //   本判据防止有人把旧变量加回来形成第二套口径。
  const noComment = STYLES.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(noComment, /var\(--focus-ring\)/, 'styles.css 仍引用 var(--focus-ring)');
  assert.doesNotMatch(noComment, /var\(--focus-halo\)/, 'styles.css 仍引用 var(--focus-halo)');

  const dark = blockAfter(STYLES, 'html.theme-dark {');
  assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');
  assert.doesNotMatch(dark, /--focus-(?:ring|halo)\s*:/, '暗色段不应再覆盖旧焦点环变量');
});

test('F5 禁用 / 只读分态：两者都存在且声明不同（禁用灰底 / 只读透明边）', () => {
  const disabled = ruleBody(STYLES, '.input-flat:disabled');
  const readonly = ruleBody(STYLES, '.input-flat[readonly]');
  assert.ok(disabled, 'styles.css 缺少 .input-flat:disabled 规则');
  assert.ok(readonly, 'styles.css 缺少 .input-flat[readonly] 规则');
  assert.match(disabled, /background:\s*var\(--neutral-100\)\s*;/, '禁用态应为灰底 var(--neutral-100)');
  assert.match(disabled, /cursor:\s*not-allowed\s*;/, '禁用态应 cursor: not-allowed');
  assert.match(readonly, /border-color:\s*transparent\s*;/, '只读态应为透明边 border-color: transparent');
  assert.notEqual(disabled.replace(/\s+/g, ' '), readonly.replace(/\s+/g, ' '),
    '禁用与只读必须是两套可区分声明（不得合并成同一条规则）');
});

test('F6 select 统一：本地增强 / data-cs-enhanced / .input-flat 全局增强，例外逐条登记', () => {
  const bootstrap = read('docs/src/core/boot/bootstrap.js');
  assert.match(bootstrap, /new MutationObserver\(/, 'bootstrap.js 缺少全局 MutationObserver（动态 select 的单一增强入口）');
  assert.match(bootstrap, /enhanceSelects\(document\)/, 'bootstrap.js 未调用 enhanceSelects(document)');
  const customSelect = read('docs/src/components/ui/custom-select.js');
  assert.match(customSelect, /select\.input-flat:not\(\[data-cs-enhanced\]\)/,
    'enhanceSelects 必须只挑 .input-flat 且用 data-cs-enhanced 保持幂等');

  const files = walkJs(DOCS_SRC);
  const renderers = [];
  for (const abs of files) {
    const src = readFileSync(abs, 'utf8');
    const lines = selectLines(src);
    if (lines.length === 0) continue;
    renderers.push({ rel: relOf(abs), src, lines });
  }
  assert.ok(renderers.length >= 30, `只扫描到 ${renderers.length} 个渲染 select 的文件（下限 30）：扫描面写坏`);

  const offenders = [];
  for (const r of renderers) {
    if (/enhanceSelects\s*\(|data-cs-enhanced/.test(r.src)) continue;
    if (r.lines.every((line) => line.includes('input-flat'))) continue; // 全局 MutationObserver 兜底
    if (SELECT_EXCEPTIONS.some((e) => e.file === r.rel)) continue;
    offenders.push(`${r.rel}（${r.lines.length} 处 <select> 既未本地增强，也不在 .input-flat 上）`);
  }
  assert.deepEqual(offenders, [],
    `以下文件渲染了 select 但不在统一增强链上（本地 enhanceSelects / data-cs-enhanced / .input-flat 三选一）：\n  ${offenders.join('\n  ')}`);

  // 防僵尸：例外必须真实命中「渲染 select 且不在统一链上」
  const zombies = SELECT_EXCEPTIONS.filter((e) => {
    const r = renderers.find((x) => x.rel === e.file);
    if (!r) return true;
    if (/enhanceSelects\s*\(|data-cs-enhanced/.test(r.src)) return true;
    return r.lines.every((line) => line.includes('input-flat'));
  }).map((e) => `${e.file}（${e.reason}）`);
  assert.deepEqual(zombies, [], `F6 白名单存在僵尸条目（已迁移或文件不存在，请删除）：\n  ${zombies.join('\n  ')}`);
});
