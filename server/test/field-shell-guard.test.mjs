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
//   · 批次 524（F · 输入单一源）新增 R1–R3：裸输入棘轮——
//       判据：`<input|select|textarea` 标签内 class 属性含 `input-flat` 即「裸写法」（绕开 forms.js，
//       直接手写控件）。存量逐文件登记 `style-baseline.mjs::RAW_INPUT_BASELINE`，**只减不增**；
//       未登记文件出现裸输入即红 ⇒ 新代码只能走 `forms.js` 的 textInput / selectInput / textField 等。
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
import { ACCENT_COLORS } from '../../docs/src/core/domain/constants.js?v=20261102b';
import { textInput, selectInput, suggestInput } from '../../docs/src/components/ui/form-field.js?v=20261102b';
import {
  RAW_INPUT_BASELINE, RAW_INPUT_TOTAL_BASELINE, RAW_INPUT_FILE_BASELINE,
} from './style-baseline.mjs';

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

/* ════════════════════════════════════════════════════════════════
   R1–R3 裸输入棘轮（批次 524 · F · 输入单一源）
   ────────────────────────────────────────────────────────────────
   「裸输入」＝ `<input|select|textarea` 标签的 class 里出现 `input-flat`：
   即绕开 `components/ui/forms.js`（textInput / selectInput / textField / selectField / dateField）
   直接手写控件。**只减不增**：存量逐文件登记 `style-baseline.mjs::RAW_INPUT_BASELINE`；
   未登记文件出现裸输入即红（新代码必须走 forms.js）。
   ════════════════════════════════════════════════════════════════ */

/** 标签结束位置：跳过引号与模板 `${…}`（属性值里的 `>` 不得截断标签） */
function _tagEnd(src, from) {
  let quote = '';
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    const ch = src[i];
    if (depth > 0) {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '$' && src[i + 1] === '{') { depth = 1; i += 1; continue; }
    if (ch === '>') return i;
  }
  return -1;
}

/** 单文件裸输入处数（class 含 input-flat 的 input / select / textarea 标签数） */
export function rawInputCount(src) {
  const re = /<(input|select|textarea)\b/gi;
  let count = 0;
  let m;
  while ((m = re.exec(src))) {
    const end = _tagEnd(src, re.lastIndex);
    if (end < 0) break;
    const tag = src.slice(m.index, end + 1);
    if (/\bclass="[^"]*\binput-flat\b/.test(tag)) count += 1;
    re.lastIndex = end + 1;
  }
  return count;
}

/** 全量实测：`repo 相对路径 → 处数`（只收 >0 的文件） */
function rawInputScan() {
  const out = {};
  for (const abs of walkJs(DOCS_SRC)) {
    const n = rawInputCount(readFileSync(abs, 'utf8'));
    if (n > 0) out[relOf(abs)] = n;
  }
  return out;
}

test('R1 裸输入只减不增：逐文件不超过基线，未登记文件出现裸输入即红', () => {
  const actual = rawInputScan();
  const rises = [];
  const fresh = [];
  for (const [file, n] of Object.entries(actual)) {
    const base = RAW_INPUT_BASELINE[file];
    if (base === undefined) fresh.push(`${file}（${n} 处，未登记）`);
    else if (n > base) rises.push(`${file}（${base} → ${n}）`);
  }
  assert.deepEqual(fresh, [],
    `以下文件新出现裸输入（应改走 forms.js 的 textInput / selectInput / textField…）：\n  ${fresh.join('\n  ')}`);
  assert.deepEqual(rises, [],
    `以下文件裸输入处数上涨（棘轮只减不增）：\n  ${rises.join('\n  ')}`);

  // 收基线：基线里已清零 / 文件已删的条目必须删掉（防僵尸条目掩盖真实回流）
  const zombies = Object.keys(RAW_INPUT_BASELINE).filter((file) => !actual[file]);
  assert.deepEqual(zombies, [], `基线存在僵尸条目（实测已为 0 或文件不存在，请按收基线纪律删除）：\n  ${zombies.join('\n  ')}`);
});

test('R2 规模与单一源：总数 / 文件数不超基线，forms.js 仍导出布局中立控件', () => {
  const actual = rawInputScan();
  const total = Object.values(actual).reduce((a, b) => a + b, 0);
  const files = Object.keys(actual).length;
  assert.ok(total <= RAW_INPUT_TOTAL_BASELINE, `裸输入总数 ${total} 超过基线 ${RAW_INPUT_TOTAL_BASELINE}（只减不增）`);
  assert.ok(files <= RAW_INPUT_FILE_BASELINE, `含裸输入的文件数 ${files} 超过基线 ${RAW_INPUT_FILE_BASELINE}（只减不增）`);
  // 非空转：基线总量必须等于逐条之和（防止只手改常量掩盖回流）
  const baseTotal = Object.values(RAW_INPUT_BASELINE).reduce((a, b) => a + b, 0);
  assert.equal(baseTotal, RAW_INPUT_TOTAL_BASELINE, 'RAW_INPUT_TOTAL_BASELINE 与逐文件基线之和不一致');
  assert.equal(Object.keys(RAW_INPUT_BASELINE).length, RAW_INPUT_FILE_BASELINE,
    'RAW_INPUT_FILE_BASELINE 与基线条目数不一致');

  const forms = read('docs/src/components/ui/forms.js');
  assert.match(forms, /textInput/, 'forms.js 未导出 textInput（输入单一源）');
  assert.match(forms, /selectInput/, 'forms.js 未导出 selectInput（输入单一源）');
});

test('R3 反例自检：合成裸 input 必须判红，控件积木产物必须不命中', () => {
  assert.equal(rawInputCount('<input type="text" class="input-flat text-xs w-full">'), 1,
    '合成裸 input 未被识别（口径失效）');
  assert.equal(rawInputCount('<textarea rows="2" class="input-flat w-full"></textarea>'), 1,
    '合成裸 textarea 未被识别');
  assert.equal(rawInputCount('<input type="text" class="input-flat text-xs"\n  placeholder="跨行">'), 1,
    '跨行裸 input 未被识别');
  // 控件积木的**调用点源码**不含字面 `<input` / `<select` ⇒ 必须不命中（守卫扫的是源码，不是产物 HTML）
  assert.equal(rawInputCount("html += textInput({ id: 'x', className: 'w-full', placeholder: '占位' });"), 0,
    'textInput 调用点被误判为裸输入');
  assert.equal(rawInputCount("html += selectInput({ id: 'y', options: [{ value: 'a', label: 'A' }] });"), 0,
    'selectInput 调用点被误判为裸输入');
  // 单一源契约：产物仍带 `input-flat text-xs` ＋ 调用方布局类
  assert.match(textInput({ id: 'x', className: 'w-full' }), /class="input-flat text-xs w-full"/,
    'textInput 未产出 input-flat text-xs ＋ 布局类');
  assert.match(selectInput({ id: 'y', options: [{ value: 'a', label: 'A' }] }), /class="input-flat text-xs"/,
    'selectInput 未产出 input-flat text-xs');
  // 非 .input-flat 的裸控件不在本口径内（如 checkbox / file 选择器）
  assert.equal(rawInputCount('<input type="checkbox" class="checkbox-accent">'), 0,
    '非 input-flat 控件被误判');
});

/* ════════════════════════════════════════════════════════════════
   R4–R5 建议输入去原生 datalist（2026-11-01 批次 525 · #4）
   ────────────────────────────────────────────────────────────────
   病灶：`<input list="…">` ＋ `<datalist>` 会让 Chrome 在输入框内画 UA picker 三角
   （实测暗像素 24 → 去掉 list 后 0）。改为 `suggestInput` 自建列表：
   ① `docs/src` 全量不得再出现 `list="` / `<datalist`（注释里也算，防止示例回潮）；
   ② 产物必须带 combobox ARIA（role / aria-expanded / aria-controls / aria-activedescendant）
      ＋ listbox，且不得含 `list` 属性。
   ════════════════════════════════════════════════════════════════ */

/** 原生 datalist 用法计数（`list="` 属性边界避免误伤 data-*-list；`<datalist` 计标签）。 */
function nativeDatalistCount(src) {
  const text = String(src ?? '');
  const listAttr = (text.match(/(?:^|\s)list="/g) || []).length;
  const datalist = (text.match(/<datalist/g) || []).length;
  return listAttr + datalist;
}

/** 自建建议输入 ARIA 契约（input combobox ＋ listbox；不带 option 因初始列表为空）。 */
function hasComboboxAria(html) {
  const text = String(html ?? '');
  return /role="combobox"/.test(text)
    && /aria-expanded="/.test(text)
    && /aria-controls="/.test(text)
    && /aria-activedescendant="/.test(text)
    && /role="listbox"/.test(text);
}

test('R4 docs/src 原生 datalist 清零（list 属性 / datalist 标签）', () => {
  const files = walkJs(DOCS_SRC);
  assert.ok(files.length > 100, `只扫描到 ${files.length} 个文件（扫描面写坏）`);
  const offenders = [];
  for (const abs of files) {
    const n = nativeDatalistCount(readFileSync(abs, 'utf8'));
    if (n > 0) offenders.push(`${relOf(abs)}（${n} 处）`);
  }
  assert.deepEqual(offenders, [],
    `以下文件仍使用原生 list / datalist（应改走 forms.js::suggestInput）：\n  ${offenders.join('\n  ')}`);
  // 反例：合成 datalist 必须判红
  assert.equal(nativeDatalistCount('<input type="text" list="kw"><datalist id="kw"></datalist>'), 2,
    '反例（合成 list / datalist）未被识别');
  // 负例：data-*-list 不是原生 list 属性，不得误伤
  assert.equal(nativeDatalistCount('<ul data-myws-list="1"></ul>'), 0, 'data-*-list 被误判为原生 list');
});

test('R5 suggestInput 产物：combobox ARIA 齐全、无 list 属性', () => {
  const html = suggestInput({ id: 'probe', suggestions: ['第一组', '第二组组'], max: 8, className: 'lf-kw' });
  assert.match(html, /role="combobox"/, '产物缺少 role="combobox"');
  assert.match(html, /aria-expanded="false"/, '产物缺少 aria-expanded 初始态');
  assert.match(html, /aria-controls="probe-suggest-list"/, '产物缺少 aria-controls 指向列表');
  assert.match(html, /aria-activedescendant=""/, '产物缺少 aria-activedescendant');
  assert.match(html, /role="listbox"/, '产物缺少 role="listbox"');
  assert.match(html, /data-suggest-items="[^"]+"/, '产物缺少建议项数据');
  assert.equal(nativeDatalistCount(html), 0, '产物不得含 list 属性 / datalist');
  // 反例：无 ARIA 的合成建议输入必须判红
  assert.equal(hasComboboxAria('<input type="text" class="input-flat"><div class="suggest__list"></div>'), false,
    '反例（无 combobox ARIA）未被判红');
  assert.equal(hasComboboxAria(html), true, 'suggestInput 产物未通过 ARIA 判据');
});
