// role: [工程师]+[AI]
// field-shell-guard.test.mjs — 字段外壳 / 下拉统一守卫（2026-10-24 · 批次 508）
//
// 为什么要有本守卫：
//   · 批次 508 把输入框焦点态收敛为「边框变主题色 + 3px 主题色淡底外晕」，
//     键盘焦点才额外出 `outline`；此前 `.input-flat:focus` 同时画 2px `--focus-ring`
//     外环，与边框色形成「双答」，暗色下 focus-ring 又曾用党徽金，盖住金边。
//   · 同一批把 select 统一交给 `enhanceSelects`（或全局 MutationObserver）增强，
//     禁止各渲染点自建第二套下拉外观。
//   · 判据：
//       F1 非空转：styles.css 能解析到 `.input-flat` 与 `:focus-visible` 规则
//       F2 活动态唯一源：`.input-flat:focus` 只把边框切到主题色，且 `box-shadow: none`
//          （环由 `:focus-visible` 的 outline 承担；两条都画 ⇒ 键盘聚焦出双环，2026-10-28）
//       F3 键盘保险：`.input-flat:focus-visible` 含 `outline: 2px solid var(--app-accent)`
//       F4 禁双答：`.input-flat:focus` 不得与 `outline: 2px solid var(--focus-ring)` 组合；
//          暗色段 `--focus-ring` 不得为 `var(--party-gold)`
//       F5 禁用 / 只读分态：两者都存在且声明不同（禁用灰底 / 只读透明边）
//       F6 select 统一：渲染 `<select>` 的文件必须本地 enhanceSelects / data-cs-enhanced，
//          或落在 `.input-flat` 上由全局 MutationObserver 增强；例外逐条登记理由
//   · 口径调整（据实况，不删断言）：
//       F2 允许 `outline: none`——那是清掉浏览器 UA 默认外框的 reset，不是第二套视觉；
//       真正的键盘外环只在 `:focus-visible`（F3）。把「不得含 outline」判成「不得含非 none 的 outline」，
//       否则会把合法的 UA reset 当成双答。
//       2026-10-28 改准：批次 508 曾要求 `.input-flat:focus` 叠 3px soft-bg 外晕；实测该晕对白卡仅
//       1.11:1（暗色比卡片更暗），键盘聚焦时与 `:focus-visible` 的 2px 环叠成「黑环 + 金环」双环。
//       故 F2 由「必须有 3px 外晕」改准为「必须 box-shadow: none」——判据不降（改成反向硬约束），
//       单环口径见 `ui-control-system-guard::FOCUS-1…3`。
// 运行：node --test server/test/field-shell-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS_SRC = join(ROOT, 'docs', 'src');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const relOf = (abs) => relative(ROOT, abs).replace(/\\/g, '/');
const STYLES = read('docs/src/styles.css');

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

test('F2 活动态唯一源：.input-flat:focus 只改边框色，box-shadow 钉成 none（不得与 :focus-visible 叠成双环）', () => {
  const body = ruleBody(STYLES, '.input-flat:focus');
  assert.ok(body, 'styles.css 缺少 .input-flat:focus 规则');
  assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/, '.input-flat:focus 必须把边框切到 var(--app-accent)');
  // 2026-10-28（焦点单环）：:focus 与 :focus-visible 在键盘聚焦时同时命中——
  //   若 :focus 再画 box-shadow 环，就与 :focus-visible 的 outline 叠成两个环。
  assert.match(body, /box-shadow:\s*none\s*;/,
    '.input-flat:focus 必须有 `box-shadow: none`（画环即与 :focus-visible 的 outline 叠成双环）');

  // outline: none 是 UA reset（允许）；任何非 none 的 outline 都是第二种视觉答案（禁止）
  const outlines = [...body.matchAll(/(?:^|;)\s*outline\s*:\s*([^;]+)/g)].map((m) => m[1].trim());
  assert.equal(outlines.length <= 1, true, `.input-flat:focus 出现多条 outline 声明：${outlines.join(' | ')}`);
  assert.deepEqual(outlines.filter((v) => v !== 'none'), [],
    `.input-flat:focus 不得再画 outline（只允许 outline: none 清 UA 默认框）；实际：${outlines.join(' | ')}`);
  assert.doesNotMatch(body, /--focus-ring/, '.input-flat:focus 不得引用 --focus-ring（活动态唯一源是主题色边 + soft-bg 外晕）');
});

test('F3 键盘保险：.input-flat:focus-visible 含 outline: 2px solid var(--app-accent)', () => {
  const body = ruleBody(STYLES, '.input-flat:focus-visible');
  assert.ok(body, 'styles.css 缺少 .input-flat:focus-visible 规则');
  assert.match(body, /outline:\s*2px solid var\(--app-accent\)\s*;/,
    '.input-flat:focus-visible 必须有 `outline: 2px solid var(--app-accent)`（键盘用户可见焦点）');
});

test('F4 禁双答：.input-flat:focus 不得配 2px --focus-ring，暗色 --focus-ring 不得为党徽金', () => {
  // 选择器级检查：排除 -visible / -sm，只看真正的 .input-flat:focus
  const combo = /\.input-flat:focus(?!-visible)(?![\w-])[^{]*\{[^}]*outline:\s*2px solid var\(--focus-ring\)/.test(
    STYLES.replace(/\/\*[\s\S]*?\*\//g, ''),
  );
  assert.equal(combo, false, '仍有 `.input-flat:focus { outline: 2px solid var(--focus-ring) }` 的双答组合');

  const dark = blockAfter(STYLES, 'html.theme-dark {');
  assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');
  const focusRing = /--focus-ring\s*:\s*([^;]+);/.exec(dark);
  assert.ok(focusRing, '暗色段缺少 --focus-ring 声明');
  const value = focusRing[1].trim();
  assert.notEqual(value, 'var(--party-gold)', '暗色段 --focus-ring 不得再用党徽金 var(--party-gold)');
  assert.equal(value, 'var(--app-accent)', '暗色段 --focus-ring 应跟随主题色 var(--app-accent)');
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
