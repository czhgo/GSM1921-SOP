// role: [工程师]+[AI]

// components/shell/page-frame.js — 工作台页面骨架与分区标题（2026-10-18 工作台提质）
// 页面只保留一个标题；页签内容从任务型分区标题开始。

import { escHtml as esc } from '../../core/base/utils.js?v=20261024d';

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

/**
 * Tab 页头（2026-10-19 · 页标题统一）：
 * H1 = 顶栏品牌（全站唯一）⇒ 每个 tab 的页面标题用 H2；分区 / 卡头用 H3。
 * 与 `renderPageHeader` 同一视觉骨架，但不重复画底部边线（tab 栏已是分隔）。
 * @param {{title:string, description?:string, actions?:string}} opts
 */
export function renderTabHeader({ title, description = '', actions = '' }) {
  const actionsHtml = actions ? `<div class="page-frame__actions">${actions}</div>` : '';
  const descHtml = description ? `<p class="page-frame__description">${esc(description)}</p>` : '';
  return `
    <header class="page-frame__header page-frame__header--tab">
      <div class="page-frame__heading">
        <h2 class="page-frame__title">${esc(title)}</h2>
        ${descHtml}
      </div>
      ${actionsHtml}
    </header>
  `;
}

/**
 * 卡头（2026-10-24 Task 4.2 单一源）：
 * 一个 tab 只保留 `renderTabHeader` 的 H2；卡内标题一律 H3，右侧放计数 / 动作。
 * `title` 必须是**带范围或权限信息**的卡内标题（如「在册成员」），不得逐字复述页签名。
 * `meta` / `actions` 为受信任的内部 HTML（计数徽标、按钮），调用点自行保证不含用户输入原文。
 * @param {{title:string, meta?:string, actions?:string, titleId?:string}} opts
 */
export function renderCardHeader({ title, meta = '', actions = '', titleId = '' } = {}) {
  const idAttr = titleId ? ` id="${esc(titleId)}"` : '';
  const aside = (meta || actions)
    ? `<div class="card-head__aside">${meta ? `<div class="card-head__meta">${meta}</div>` : ''}${actions ? `<div class="card-head__actions">${actions}</div>` : ''}</div>`
    : '';
  return `
    <div class="card-head">
      <h3${idAttr} class="card-head__title font-title-cn text-base font-semibold text-gray-800">${esc(title)}</h3>
      ${aside}
    </div>`;
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
