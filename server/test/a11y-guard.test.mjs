// role: [工程师]+[AI]
// a11y-guard.test.mjs — 可访问性常驻静态守卫（`close-six-dim-gaps` T10 · 2026-11-15）
//
// 为什么要有本守卫：`a11y-tree.test.mjs` 用 Chromium 可访问性树做真机判据，但它在 precommit 层、
//   逐页跑、只覆盖 6 个代表页面；日常改模板（`docs/src/**/*.js` 的 innerHTML 模板 ＋ `docs/*.html`）
//   时没有任何机检能拦住「新加一个无名称的图标钮 / 无标签的输入框 / 缺 aria-selected 的页签」。
//   本文件把六条可静态判定的底线做成 guards 层棘轮：存量按实跑数字登记（只减不增），新增即红。
//
// 判据（全部在源码文本上近似，逐条注明边界）：
//   A1 按钮 / 链接可访问名非空：`<button>` 与带 `href` 的 `<a>` 必须有
//      `aria-label` / `aria-labelledby` / `title` 之一，或可见文字非空。
//      · 边界：`${...}` 表达式按「可能产出文字」计（宁可漏判不误判）；找不到闭标签的拼接式模板不计。
//   A2 表单控件有标签关联：`<input>`（hidden / submit / button / reset / image 除外）/`<select>`/
//      `<textarea>` 必须有 `aria-label` / `aria-labelledby` / `title`，或 `id` 命中同文件
//      `<label for="id">`，或被 `<label>` 包裹。placeholder 不算标签。
//   A3 `section` 有可访问名称且不嵌套：开标签必须有非空 `aria-label` / `aria-labelledby`；
//      同文件按标签顺序计深度，深度 >0 时再开 section 记嵌套。
//   A4 `role="tab"` 同时带 `aria-selected` 与 `aria-controls`（读屏才能播报选中态与面板归属）。
//   A5 非原生 `role="button"` 容器带 `tabindex`，且同文件存在 Enter / Space 键盘处理。
//   A6 纯图标按钮（内文只有 `<svg>` / `icon(...)`）必须有 `aria-label` / `aria-labelledby`。
//
// 收基线纪律（同 `style-baseline.mjs`）：只减不增。修掉存量后**同批下调** `a11y-baseline.mjs` 的计数；
//   **不得**为变绿上调计数或缩窄扫描面（扫描面下限在 A0 判据里钉住）。
// 运行：cd server; node --test test/a11y-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { A11Y_BASELINE } from './a11y-baseline.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const DOCS = join(ROOT, 'docs');
const SKIP_DIRS = new Set(['mock', 'vendor', 'node_modules']);

// ── 源码 → 标签（静态近似；口径写在文件头） ─────────────────────────────

/** 剥注释（块注释 / HTML 注释 / 行注释；与 copy-guard 同习惯） */
export function stripComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

/** 取标签属性值；返回 null＝属性不存在，''＝存在但为空 */
export function attr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs || '');
  return m ? (m[1] ?? m[2] ?? '') : null;
}

/** 可访问名称属性（aria-label / aria-labelledby）是否给出了非空值 */
export function hasNameAttr(attrs) {
  return ['aria-label', 'aria-labelledby'].some((k) => String(attr(attrs, k) || '').trim().length > 0);
}

/** 扫描开标签（不匹配闭标签；引号内的 `>` 不截断） */
export function scanTags(src) {
  const out = [];
  const re = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({
      name: m[1].toLowerCase(),
      attrs: m[2] || '',
      start: m.index,
      end: re.lastIndex,
      line: src.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

/** 内文可见文字（去掉 SVG / `icon(...)` / 标签 / 空白） */
export function visibleText(inner) {
  return String(inner || '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/\bicon\s*\([^()]*\)/g, ' ')
    .replace(/\$\{\s*\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z]+;/g, 'X')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 闭标签位置（找不到返回 -1：拼接式模板不计，见文件头边界） */
function findClose(text, name, from) {
  return text.toLowerCase().indexOf(`</${name}`, from);
}

/**
 * 审计一段源码。
 * @param {string} src 源码文本
 * @param {string} [file] 文件名（只用于报告）
 * @returns {{problems:Array, observed:Object}}
 */
export function auditSource(src, file = '<memory>') {
  const text = stripComments(src);
  const tags = scanTags(text);
  const problems = [];
  const observed = { names: 0, labels: 0, sections: 0, tabs: 0, roleButtons: 0, iconButtons: 0, unresolved: 0 };
  const push = (check, line, detail) => problems.push({ check, file, line, detail });

  // label 关联表
  const labelFor = new Set();
  for (const t of tags) {
    if (t.name !== 'label') continue;
    const f = attr(t.attrs, 'for');
    if (f) labelFor.add(f.trim());
  }
  const hasKeydown = /keydown|keyup|keypress/.test(text);
  const handlesEnter = /\bEnter\b/.test(text) && /Spacebar|' '|" "|key === ' '/.test(text);

  for (const t of tags) {
    // A1 按钮 / 链接可访问名
    if (t.name === 'button' || t.name === 'a') {
      if (t.name === 'a' && attr(t.attrs, 'href') === null) {
        // 无 href 的 <a> 不是链接（锚点占位），不进入名称判据
      } else {
        const close = findClose(text, t.name, t.end);
        if (close === -1) {
          observed.unresolved += 1;
        } else {
          observed.names += 1;
          const inner = text.slice(t.end, close);
          const named = hasNameAttr(t.attrs)
            || String(attr(t.attrs, 'title') || '').trim().length > 0
            || visibleText(inner).length > 0;
          if (!named) push('names', t.line, `<${t.name}> 无可访问名称`);
        }
      }
    }

    // A2 表单控件标签关联
    if (t.name === 'input' || t.name === 'select' || t.name === 'textarea') {
      const type = t.name === 'input' ? String(attr(t.attrs, 'type') || 'text').toLowerCase() : '';
      if (!['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) {
        observed.labels += 1;
        const id = String(attr(t.attrs, 'id') || '').trim();
        const before = text.slice(0, t.start).toLowerCase();
        const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
        const labeled = hasNameAttr(t.attrs)
          || String(attr(t.attrs, 'title') || '').trim().length > 0
          || (id !== '' && labelFor.has(id))
          || wrapped;
        if (!labeled) push('labels', t.line, `<${t.name}> 缺标签关联 / aria-label`);
      }
    }

    // A4 role=tab
    if (String(attr(t.attrs, 'role') || '') === 'tab') {
      observed.tabs += 1;
      if (!attr(t.attrs, 'aria-selected')) push('tabs', t.line, 'role="tab" 缺 aria-selected');
      if (!attr(t.attrs, 'aria-controls')) push('tabs', t.line, 'role="tab" 缺 aria-controls');
    }

    // A5 非原生 role=button
    if (String(attr(t.attrs, 'role') || '') === 'button' && t.name !== 'button') {
      observed.roleButtons += 1;
      if (attr(t.attrs, 'tabindex') === null) {
        push('roleButtons', t.line, 'role="button" 缺 tabindex');
      } else if (!(hasKeydown && handlesEnter)) {
        push('roleButtons', t.line, 'role="button" 未见 Enter/Space 键盘处理');
      }
    }

    // A6 纯图标按钮
    if (t.name === 'button') {
      const close = findClose(text, 'button', t.end);
      if (close === -1) continue;
      const inner = text.slice(t.end, close);
      const hasIcon = /<svg\b/i.test(inner) || /\bicon\s*\(/.test(inner);
      if (!hasIcon) continue;
      observed.iconButtons += 1;
      if (visibleText(inner).length > 0) continue;   // 有可见文字，不属纯图标钮
      if (hasNameAttr(t.attrs)) continue;
      push('iconButtons', t.line, '<button> 纯图标缺 aria-label');
    }
  }

  // A3 section（名称 + 嵌套；按标签顺序计深度）
  const secRe = /<(\/?)section\b([^>]*)>/gi;
  let depth = 0;
  let m;
  while ((m = secRe.exec(text)) !== null) {
    if (m[1] === '/') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const line = text.slice(0, m.index).split('\n').length;
    observed.sections += 1;
    if (!hasNameAttr(m[2] || '')) push('sections', line, '<section> 缺可访问名称');
    if (depth > 0) push('sections', line, '<section> 嵌套在另一 section 内');
    depth += 1;
  }

  return { problems, observed };
}

// ── 扫描面 ────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const FILES = [
  ...walk(SRC),
  ...readdirSync(DOCS).filter((n) => n.endsWith('.html')).map((n) => join(DOCS, n)),
].sort();

const RESULTS = FILES.map((abs) => {
  const file = relative(ROOT, abs).replace(/\\/g, '/');
  return { file, ...auditSource(readFileSync(abs, 'utf8'), file) };
});

const TOTAL = { names: 0, labels: 0, sections: 0, tabs: 0, roleButtons: 0, iconButtons: 0, unresolved: 0 };
for (const r of RESULTS) for (const k of Object.keys(TOTAL)) TOTAL[k] += r.observed[k] || 0;

const sum = (check) => RESULTS.reduce((n, r) => n + r.problems.filter((p) => p.check === check).length, 0);
const samples = (check, n = 6) => RESULTS.flatMap((r) => r.problems.filter((p) => p.check === check))
  .slice(0, n).map((p) => `${p.file}:${p.line} ${p.detail}`);

// ── A0 扫描面非空转 ───────────────────────────────────────────────────
test('A0 扫描面达标（文件数 / 各类样本下限）且审计器能判出违规', () => {
  console.log(`[a11y] 扫描 ${FILES.length} 文件；样本 ${JSON.stringify(TOTAL)}；`
    + `违规 ${JSON.stringify(Object.fromEntries(['names', 'labels', 'sections', 'tabs', 'roleButtons', 'iconButtons'].map((k) => [k, sum(k)])))}`);
  assert.ok(FILES.length >= A11Y_BASELINE.scan.files,
    `只扫到 ${FILES.length} 份源码（下限 ${A11Y_BASELINE.scan.files}）：扫描面被写小`);
  for (const key of ['names', 'labels', 'sections', 'tabs', 'roleButtons', 'iconButtons']) {
    assert.ok(TOTAL[key] >= A11Y_BASELINE.scan[key],
      `${key} 只抽到 ${TOTAL[key]} 个样本（下限 ${A11Y_BASELINE.scan[key]}）：抽取口径失效`);
  }

  // 反例：六个判据各有一条必须被判红；正例不得误伤
  const bad = auditSource(`
    <button><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></button>
    <a href="x.html"></a>
    <input type="text" placeholder="搜索">
    <section><section aria-label="内层"></section></section>
    <button role="tab">页签</button>
    <div role="button">可点容器</div>
  `);
  for (const check of ['names', 'labels', 'sections', 'tabs', 'roleButtons', 'iconButtons']) {
    assert.ok(bad.problems.some((p) => p.check === check), `反例未判红：${check} 判据失效`);
  }
  const good = auditSource(`
    <button type="button" aria-label="关闭">\${icon('close')}</button>
    <a href="x.html">可见文字</a>
    <label for="kw">搜索</label><input id="kw" type="text">
    <section aria-label="区块"></section>
    <button role="tab" aria-selected="false" aria-controls="panel-1">页签</button>
    <div role="button" tabindex="0" onkeydown="if (e.key === 'Enter' || e.key === ' ') go()">可点容器</div>
  `);
  assert.deepEqual(good.problems, [], `正例被误伤：${JSON.stringify(good.problems)}`);
});

// ── A1–A6 棘轮 ───────────────────────────────────────────────────────
const CASES = [
  ['A1 按钮 / 链接可访问名非空', 'names'],
  ['A2 表单控件有标签关联或 aria-label', 'labels'],
  ['A3 section 有名且不嵌套', 'sections'],
  ['A4 role=tab 带 aria-selected / aria-controls', 'tabs'],
  ['A5 role=button 容器 tabindex ＋ Enter/Space', 'roleButtons'],
  ['A6 纯图标按钮有 aria-label', 'iconButtons'],
];

for (const [title, key] of CASES) {
  test(`${title}：存量不得超过基线（只减不增）`, () => {
    const actual = sum(key);
    const base = A11Y_BASELINE[key];
    assert.ok(actual <= base,
      `${key} 违规由基线 ${base} 升到 ${actual}（新增控件必须补齐可访问性；`
      + `修掉存量后同批下调 a11y-baseline.mjs，不得上调）：\n  ${samples(key).join('\n  ')}`);
  });
}
