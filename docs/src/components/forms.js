// role: [工程师]+[AI]
// components/forms.js — 表单统一库（扎口出口，2026-09-03）
// 书记定调「模块统一扎口」试点：同一域可以有若干实现文件（form-field 字段积木 / form-shell 外壳），
// 但对外只暴露这一个库文件 —— 调用方一律 import forms.js，不直接触碰内部积木目录。
// 改造收益：新表单一律走库；字段积木增删/改名只动本库聚合行或内部实现，调用方 import 面零感知（一改具改上下文负担小）。
// 约定：components/form-field.js 与 form-shell.js 为内部实现，可各自演进；新增表单函数也由本库对外。
// 设计源：COMPONENT_SPEC §4.3 输入统一原则 + B1/B2 表单美学批次

export { labelHtml, errorHtml, textField, textareaField, selectField, dateField } from './form-field.js?v=20260908c';
export { recordFormShell } from './form-shell.js?v=20260908c';
