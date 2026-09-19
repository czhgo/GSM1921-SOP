// role: [工程师]+[AI]
// pager.js — 翻页控件单一源（2026-09-14 批次 38，自 list-filter.js 下沉为叶子模块）
//
// 为什么单独成文件：翻页标记（.page-btn / .page-num / data-lf-page）全站只允许有一处产出。
//   统一检索引擎（list-filter.js）与「人 × 项目」关系矩阵（relation-matrix.js）都要翻页，
//   且 relation-matrix → list-filter 的**反向**依赖会与 inspector → vote-summary-panel 形成模块环
//   （list-filter 依赖 inspector，inspector 依赖 vote-summary-panel，vote-summary-panel 依赖 relation-matrix）。
//   故把本函数下沉为**不依赖任何业务模块**的叶子件（仅依赖 core/utils 转义），供需方各自引用，环即断。
//
// 口径（沿批次 28 / 34）：
//   · 样式单一源 = styles.css 的 .page-btn / .page-num（本文件只产出标记，不写样式）；
//   · 页数 ≤1 返回空串 —— 小表零负担（不渲染控件）；
//   · 计数文案统一「共 N <单位> · 第 x / y 页」。
import { escHtml as esc } from '../core/utils.js?v=20260919j';

/**
 * 渲染翻页区 HTML（唯一产出点）
 * @param {{page:number, pages:number, total:number, unit:string}} o
 * @returns {string} 翻页区 HTML；页数 ≤1 返回 ''
 */
export function pagerHtml({ page, pages, total, unit }) {
  if (pages <= 1) return '';
  const cur = Math.min(Math.max(1, Number(page) || 1), pages);
  const nums = [];
  const end = Math.min(pages, Math.max(cur, 3) + 2);
  for (let i = Math.max(1, end - 4); i <= end; i++) nums.push(i);
  return `
      <div class="flex items-center justify-between pt-3">
        <span class="lf-count">共 ${total} ${esc(unit)} · 第 ${cur} / ${pages} 页</span>
        <div class="flex items-center gap-1.5">
          <button type="button" class="page-btn" data-lf-page="${cur - 1}" ${cur <= 1 ? 'disabled' : ''}>上一页</button>
          ${nums.map(n => `<button type="button" class="page-num${n === cur ? ' is-current' : ''}" data-lf-page="${n}">${n}</button>`).join('')}
          <button type="button" class="page-btn" data-lf-page="${cur + 1}" ${cur >= pages ? 'disabled' : ''}>下一页</button>
        </div>
      </div>`;
}
