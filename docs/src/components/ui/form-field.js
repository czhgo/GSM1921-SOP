// role: [工程师]+[AI]
// components/ui/form-field.js — 表单字段积木（B2 表单美学批次，2026-09-03）
// 支书美学四要素落点：
//   字体 —— label 统一 text-xs text-gray-500、控件 input-flat 0.875rem、紧凑 text-xs
//   方框 —— 全部 input-flat 体系（圆角 --radius-sm/边框 --neutral-200/聚焦金框，见 styles.css .input-flat）
//   交互 —— label 与控件 for/id 关联（点击聚焦）、必填星号、错误行 aria 关联、placeholder 以 … 结尾
//   标签 —— label 语义文案 + 可选 hint 描述；autocomplete/name 显式（防密码管理器误触发，B4）
// 设计源：DESIGN_SYSTEM §4.3（输入统一原则）+ web-interface-guidelines（Forms/Accessibility）
// 演进：块画布 L3 的块 inputs 声明复用同一字段积木目录。
// 批次 525（#4）：键盘选中项滚入视野走全站唯一滚动出口（motion-guard M10）。
import { smoothScroll } from '../../core/base/utils.js?v=20261102b';

/** 标签行（for 关联控件 id；必填星号；可选 hint 描述） */
export function labelHtml({ id, text, required = false, hint = '' } = {}) {
  return `<label for="${id}" class="text-xs text-gray-500 mb-1.5 block font-medium">${text}${required ? ' <span class="text-red-600">*</span>' : ''}</label>${hint ? `<p class="text-xs text-gray-500 mb-1.5 -mt-1">${hint}</p>` : ''}`;
}

/** 错误行（aria-describedby 关联到控件 id-err） */
export function errorHtml(id, error) {
  return error ? `<p class="text-xs text-red-600 mt-1" id="${id}-err">${error}</p>` : '';
}

function _fieldShell({ id, label, required, hint, error, control }) {
  return `<div class="mb-3">${labelHtml({ id, text: label, required, hint })}${control}${errorHtml(id, error)}</div>`;
}

function _esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 单行文本字段 */
export function textField({ id, label, value = '', placeholder = '请输入…', required = false, hint = '', error = '', name = '', autocomplete = 'off', compact = false, type = 'text' }) {
  const cls = compact ? 'input-flat w-full' : 'input-flat w-full';
  const control = `<input type="${type}" id="${id}" name="${name || id}" autocomplete="${autocomplete}" class="${cls}${error ? ' border-red-400' : ''}" value="${_esc(value)}" placeholder="${placeholder}${placeholder.endsWith('…') ? '' : '…'}"${error ? ` aria-describedby="${id}-err"` : ''}>`;
  return _fieldShell({ id, label, required, hint, error, control });
}

/** 多行文本字段 */
export function textareaField({ id, label, value = '', placeholder = '请输入…', rows = 3, required = false, hint = '', error = '', name = '', compact = false }) {
  const cls = compact ? 'input-flat w-full resize-none' : 'input-flat w-full resize-none';
  const control = `<textarea id="${id}" name="${name || id}" autocomplete="off" class="${cls}${error ? ' border-red-400' : ''}" rows="${rows}" placeholder="${placeholder}${placeholder.endsWith('…') ? '' : '…'}"${error ? ` aria-describedby="${id}-err"` : ''}>${_esc(value)}</textarea>`;
  return _fieldShell({ id, label, required, hint, error, control });
}

/** 下拉字段（原生 select 载体，由 custom-select 自动增强为圆角下拉——统一走 select.input-flat） */
export function selectField({ id, label, options = [], value = '', required = false, hint = '', error = '', name = '', compact = false, placeholder = '' }) {
  const cls = compact ? 'input-flat w-full' : 'input-flat w-full';
  const opts = placeholder ? `<option value="">${placeholder}</option>` : '';
  const control = `<select id="${id}" name="${name || id}" class="${cls}${error ? ' border-red-400' : ''}"${error ? ` aria-describedby="${id}-err"` : ''}>${opts}${options.map(o => `<option value="${o.value}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
  return _fieldShell({ id, label, required, hint, error, control });
}

/** placeholder 收口：以 `…`（或已写成 `...`）结尾，其余自动补 `…`（与既有字段约定一致） */
function _placeholderChars(p) {
  const s = String(p ?? '');
  return /(?:…|\.\.\.)$/.test(s) ? s : s + '…';
}

/**
 * 布局中立单行控件（批次 524 · 输入单一源）：不带 label / 外边距包装，只出控件本体。
 * 基础类固定 `input-flat text-xs`（单档化后 `.text-xs` 与 `.input-flat` 同字号同高，见 styles.css），
 * 调用方的布局类经 `className` 原样追加，其余属性经 `attrs` 字符串原样带入（id / name / data-* / required…）。
 * @param {Object} o
 * @param {string} [o.id] 控件 id（空则不出 id 属性）
 * @param {string} [o.type='text']
 * @param {string} [o.value]
 * @param {string} [o.placeholder]
 * @param {string} [o.ariaLabel]
 * @param {string} [o.className]
 * @param {string} [o.attrs] 其余属性串（如 `data-bound="1" required`）
 */
export function textInput({ id, type = 'text', value = '', placeholder = '', ariaLabel = '', className = '', attrs = '' }) {
  const cls = ['input-flat text-xs', className].filter(Boolean).join(' ');
  const ph = placeholder ? ` placeholder="${_esc(_placeholderChars(placeholder))}"` : '';
  const val = value === '' || value === undefined || value === null ? '' : ` value="${_esc(value)}"`;
  return `<input type="${type}"${id ? ` id="${id}"` : ''} class="${cls}"${ph}${val}`
    + `${ariaLabel ? ` aria-label="${_esc(ariaLabel)}"` : ''}${attrs ? ` ${attrs}` : ''}>`;
}

/**
 * 布局中立下拉控件（同上）：只出 `<select>` 本体，选项由 `options` 数组给（{ value, label }）。
 * @param {Object} o
 * @param {string} [o.id]
 * @param {Array<{value:string,label:string}>} [o.options]
 * @param {string} [o.value] 选中值
 * @param {string} [o.ariaLabel]
 * @param {string} [o.className]
 * @param {string} [o.attrs]
 */
export function selectInput({ id, options = [], value = '', ariaLabel = '', className = '', attrs = '' }) {
  const cls = ['input-flat text-xs', className].filter(Boolean).join(' ');
  const opts = options.map((o) => `<option value="${_esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${_esc(o.label)}</option>`).join('');
  return `<select${id ? ` id="${id}"` : ''} class="${cls}"`
    + `${ariaLabel ? ` aria-label="${_esc(ariaLabel)}"` : ''}${attrs ? ` ${attrs}` : ''}>${opts}</select>`;
}

/* ── 建议输入（2026-11-01 批次 525 · #4）：替代原生 datalist ──────────────
   原生 list 属性 ＋ datalist 会让 Chrome 在输入框内画 UA picker 指示三角
   （实测暗像素 24px；去掉 list 后为 0）。本组件自建建议列表：纯 DOM、无第三方库、
   无三角、无 `list` 属性。列表由文档级事件委托驱动（一次安装，动态重渲染后仍生效）。 */
let _suggestSeq = 0;
let _suggestDelegationInstalled = false;

function _suggestItems(wrap) {
  try {
    const raw = JSON.parse(wrap.getAttribute('data-suggest-items') || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function _suggestMax(wrap) {
  const n = Number(wrap.getAttribute('data-suggest-max'));
  return Number.isFinite(n) && n > 0 ? n : 8;
}

function _suggestClose(wrap) {
  const list = wrap.querySelector('.suggest__list');
  const input = wrap.querySelector('.suggest__input');
  if (list) list.hidden = true;
  wrap.classList.remove('is-open');
  if (input) {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
}

/** 按当前输入值重建建议（≥1 字符；前缀优先、其次包含；去重；最多 max 条） */
function _suggestRender(input) {
  const wrap = input.closest('[data-suggest]');
  if (!wrap) return;
  const list = wrap.querySelector('.suggest__list');
  const q = String(input.value || '').trim().toLowerCase();
  if (!q) { _suggestClose(wrap); return; }
  const seen = new Set();
  const starts = [];
  const contains = [];
  for (const item of _suggestItems(wrap)) {
    const s = String(item ?? '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    const sl = s.toLowerCase();
    if (sl.startsWith(q)) starts.push(s);
    else if (sl.includes(q)) contains.push(s);
  }
  const picked = starts.concat(contains).slice(0, _suggestMax(wrap));
  if (!picked.length) { _suggestClose(wrap); return; }
  list.innerHTML = picked.map((s, i) => `<div class="suggest__option" role="option" id="${list.id}-${i}" data-value="${_esc(s)}" aria-selected="false">${_esc(s)}</div>`).join('');
  list.hidden = false;
  wrap.classList.add('is-open');
  input.setAttribute('aria-expanded', 'true');
  input.removeAttribute('aria-activedescendant');
}

/** 选中：回填输入并派发 input / change（先关列表，屏蔽本次自触发的重开） */
function _suggestPick(input, option) {
  if (!option) return;
  const wrap = input.closest('[data-suggest]');
  input.value = option.getAttribute('data-value') ?? option.textContent ?? '';
  if (wrap) _suggestClose(wrap);
  input._suggestSuppress = true;
  try {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
    input._suggestSuppress = false;
  }
  input.focus();
}

function _ensureSuggestDelegation() {
  if (_suggestDelegationInstalled || typeof document === 'undefined') return;
  _suggestDelegationInstalled = true;
  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!input?.classList?.contains('suggest__input')) return;
    if (input._suggestSuppress) return;
    _suggestRender(input);
  });
  document.addEventListener('keydown', (e) => {
    const input = e.target;
    if (!input?.classList?.contains('suggest__input')) return;
    const wrap = input.closest('[data-suggest]');
    const list = wrap?.querySelector('.suggest__list');
    if (!list) return;
    const open = !list.hidden;
    if (e.key === 'Escape') {
      if (open) { _suggestClose(wrap); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) _suggestRender(input);
      const opts = [...list.querySelectorAll('.suggest__option')];
      if (!opts.length) return;
      e.preventDefault();
      const cur = opts.findIndex((o) => o.classList.contains('is-active'));
      const next = e.key === 'ArrowDown'
        ? (cur + 1) % opts.length
        : (cur <= 0 ? opts.length - 1 : cur - 1);
      opts.forEach((o) => { o.classList.remove('is-active'); o.setAttribute('aria-selected', 'false'); });
      opts[next].classList.add('is-active');
      opts[next].setAttribute('aria-selected', 'true');
      smoothScroll(opts[next], { block: 'nearest', smooth: false });
      input.setAttribute('aria-activedescendant', opts[next].id);
      return;
    }
    if (e.key === 'Enter' && open) {
      const active = list.querySelector('.suggest__option.is-active');
      if (active) { e.preventDefault(); _suggestPick(input, active); }
    }
  });
  document.addEventListener('click', (e) => {
    const targetWrap = e.target?.closest?.('[data-suggest]') || null;
    document.querySelectorAll('[data-suggest]').forEach((w) => { if (w !== targetWrap) _suggestClose(w); });
    const option = e.target?.closest?.('.suggest__option');
    if (!option) return;
    const wrap = option.closest('[data-suggest]');
    const input = wrap?.querySelector('.suggest__input');
    if (input) { e.preventDefault(); _suggestPick(input, option); }
  }, true);
}

/**
 * 布局中立建议输入（批次 525 · #4）：`input.input-flat` ＋ 绝对定位建议列表（初始隐藏）。
 * - 无 `list` 属性、无三角 / 系统图标；输入 ≥1 字符后显示最多 `max`（缺省 8）条；
 * - ↑↓ 移动、Enter 选中、Esc 关闭、点击外部关闭；选中后回填并派发 `input` / `change`；
 * - ARIA：input `role="combobox"` ＋ `aria-expanded/controls/activedescendant`；
 *   列表 `role="listbox"`、项 `role="option"`。
 * @param {Object} o
 * @param {string} [o.id] 输入 id（列表 id = `${id}-suggest-list`）
 * @param {string} [o.value]
 * @param {string} [o.placeholder]
 * @param {string} [o.ariaLabel]
 * @param {string[]} [o.suggestions]
 * @param {number} [o.max=8]
 * @param {string} [o.className] 追加到输入框的布局类（如 `lf-kw`）
 */
export function suggestInput({ id, value = '', placeholder = '', ariaLabel = '', suggestions = [], max = 8, className = '' } = {}) {
  const uid = id || `suggest-${(_suggestSeq += 1)}`;
  const cls = ['input-flat text-xs suggest__input', className].filter(Boolean).join(' ');
  const listId = `${uid}-suggest-list`;
  const items = [];
  const seen = new Set();
  for (const v of Array.isArray(suggestions) ? suggestions : []) {
    const s = String(v ?? '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    items.push(s);
    if (items.length >= 200) break;
  }
  const cap = Math.max(1, Number(max) || 8);
  const ph = placeholder ? ` placeholder="${_esc(_placeholderChars(placeholder))}"` : '';
  const val = value === '' || value === undefined || value === null ? '' : ` value="${_esc(value)}"`;
  _ensureSuggestDelegation();
  return `<div class="suggest" data-suggest data-suggest-max="${cap}" data-suggest-items="${_esc(JSON.stringify(items))}">`
    + `<input type="text"${id ? ` id="${id}"` : ''} class="${cls}"${ph}${val}`
    + ` role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${listId}" aria-activedescendant=""`
    + `${ariaLabel ? ` aria-label="${_esc(ariaLabel)}"` : ''} autocomplete="off">`
    + `<div class="suggest__list" id="${listId}" role="listbox" hidden></div>`
    + `</div>`;
}

/** 日期字段（input-flat 收口原生 picker 外观；聚焦金框与圆角体系一致） */
export function dateField({ id, label, value = '', required = false, hint = '', error = '', name = '', compact = false }) {
  const cls = compact ? 'input-flat w-full' : 'input-flat w-full';
  const control = `<input type="date" id="${id}" name="${name || id}" autocomplete="off" class="${cls}${error ? ' border-red-400' : ''}" value="${String(value)}"${error ? ` aria-describedby="${id}-err"` : ''}>`;
  return _fieldShell({ id, label, required, hint, error, control });
}
