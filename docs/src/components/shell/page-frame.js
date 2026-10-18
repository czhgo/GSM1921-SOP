// role: [工程师]+[AI]

// components/shell/page-frame.js — 工作台页面骨架与分区标题（2026-10-18 工作台提质）
// 页面只保留一个标题；页签内容从任务型分区标题开始。

import { escHtml as esc } from '../../core/base/utils.js?v=20261018e';

/** 页面级页头：页面标题与页面动作；眉题、说明缀词已移除（2026-10-18 工作台提质）。 */
export function renderPageHeader({ title, actions = '' }) {
  const actionsHtml = actions ? `<div class="page-frame__actions">${actions}</div>` : '';
  return `
    <header class="page-frame__header">
      <div class="page-frame__heading">
        <h1 class="page-frame__title">${esc(title)}</h1>
      </div>
      ${actionsHtml}
    </header>
  `;
}

/** 分区标题：任务名、可选说明与分区动作；默认 h2，level 为 3 时用 h3。 */
export function renderSectionHeader({ titleId = '', title, description = '', actions = '', level = 2 }) {
  const tag = level === 3 ? 'h3' : 'h2';
  const idAttr = titleId ? ` id="${esc(titleId)}"` : '';
  const descriptionHtml = description ? `<p class="page-section__description">${esc(description)}</p>` : '';
  const actionsHtml = actions ? `<div class="page-section__actions">${actions}</div>` : '';
  return `
    <div class="page-section__header">
      <div class="page-section__heading">
        <${tag}${idAttr} class="page-section__title">${esc(title)}</${tag}>
        ${descriptionHtml}
      </div>
      ${actionsHtml}
    </div>
  `;
}
