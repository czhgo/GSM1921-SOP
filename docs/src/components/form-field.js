// role: [工程师]+[AI]
// components/form-field.js — 表单字段积木（B2 表单美学批次，2026-09-03）
// 书记美学四要素落点：
//   字体 —— label 统一 text-xs text-gray-500、控件 input-flat 0.875rem、紧凑 text-xs
//   方框 —— 全部 input-flat 体系（圆角 --radius-sm/边框 --neutral-200/聚焦金框，见 styles.css .input-flat）
//   交互 —— label 与控件 for/id 关联（点击聚焦）、必填星号、错误行 aria 关联、placeholder 以 … 结尾
//   标签 —— label 语义文案 + 可选 hint 描述；autocomplete/name 显式（防密码管理器误触发，B4）
// 设计源：COMPONENT_SPEC §4.3（输入统一原则）+ web-interface-guidelines（Forms/Accessibility）
// 演进：块画布 L3 的块 inputs 声明复用同一字段积木目录。

/** 标签行（for 关联控件 id；必填星号；可选 hint 描述） */
export function labelHtml({ id, text, required = false, hint = '' } = {}) {
  return `<label for="${id}" class="text-xs text-gray-500 mb-1.5 block font-medium">${text}${required ? ' <span class="text-red-500">*</span>' : ''}</label>${hint ? `<p class="text-[11px] text-gray-400 mb-1.5 -mt-1">${hint}</p>` : ''}`;
}

/** 错误行（aria-describedby 关联到控件 id-err） */
export function errorHtml(id, error) {
  return error ? `<p class="text-[11px] text-red-500 mt-1" id="${id}-err">${error}</p>` : '';
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

/** 日期字段（input-flat 收口原生 picker 外观；聚焦金框与圆角体系一致） */
export function dateField({ id, label, value = '', required = false, hint = '', error = '', name = '', compact = false }) {
  const cls = compact ? 'input-flat w-full' : 'input-flat w-full';
  const control = `<input type="date" id="${id}" name="${name || id}" autocomplete="off" class="${cls}${error ? ' border-red-400' : ''}" value="${String(value)}"${error ? ` aria-describedby="${id}-err"` : ''}>`;
  return _fieldShell({ id, label, required, hint, error, control });
}
