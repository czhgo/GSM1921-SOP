// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  handoff-inbox.js — 三委数据交接收件箱组件（T-304 C2）
//  渲染某角色待确认的数据交接卡片（来源/内容/时间 + 确认按钮），
//  确认 = HandoffStore.confirm（销待办 + 状态落库，信息流闭环）。
//  挂载点：宣传/组织工作台待办列表顶部、纪检补课 tab 顶部。
// ════════════════════════════════════════════════════════════════

import { HandoffStore, HANDOFF_TYPES, HANDOFF_ROLE_LABELS } from '../services/handoff.js?v=20260829o';
import { badgeHtml } from './badge.js?v=20260829o';
import { solidAccentStyle } from '../core/constants.js?v=20260829o';

/**
 * 渲染数据交接收件箱 HTML
 * @param {Object} opts
 * @param {string} opts.to — 接收方角色（prop-commissioner / org-commissioner / disc-commissioner）
 * @param {Object} opts.accent — 强调色
 * @param {string} [opts.title] — 卡片标题（默认「数据交接」）
 * @param {string} [opts.extraActionHtml] — 卡片底部附加操作（如组织侧「标记补课材料缺失」入口）
 */
export function renderHandoffInboxHtml({ to, accent, title = '数据交接', extraActionHtml = '' }) {
  const items = HandoffStore.listByRole(to);
  const rows = items.map(h => {
    const meta = HANDOFF_TYPES[h.type] || {};
    return `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-b-0">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-medium text-gray-800 truncate">${meta.label || h.type}：${h.refLabel || ''}</span>
            ${badgeHtml('待确认', 'warning')}
          </div>
          <div class="text-xs text-gray-400 truncate">${h.note || `${HANDOFF_ROLE_LABELS[h.from] || h.from} → ${HANDOFF_ROLE_LABELS[h.to] || h.to}`} · ${(h.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
        </div>
        <button type="button" class="handoff-confirm-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-handoff-id="${h.id}" style="${solidAccentStyle(accent)};cursor:pointer;">确认接收</button>
      </div>
    `;
  }).join('');

  if (items.length === 0 && !extraActionHtml) return '';

  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-1.5">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
        ${items.length > 0 ? badgeHtml(`${items.length} 条待确认`, 'warning') : badgeHtml('已清空', 'neutral')}
      </div>
      <div class="text-xs text-gray-500 mb-2">三委数据交接自动同步：纪检↔宣传↔组织 协作闭环</div>
      ${items.length > 0 ? `<div class="divide-y divide-gray-50">${rows}</div>` : '<p class="text-xs text-gray-400 py-1">暂无待确认的交接数据</p>'}
      ${extraActionHtml || ''}
    </div>
  `;
}

/** 绑定交接收件箱确认按钮 */
export function bindHandoffInbox(container, { to, onDone }) {
  container.querySelectorAll('.handoff-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ok = HandoffStore.confirm(btn.dataset.handoffId, to);
      if (!ok) return;
      if (typeof onDone === 'function') onDone();
    });
  });
}
