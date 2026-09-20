// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  handoff-inbox.js — 三委数据交接收件箱组件（T-304 C2）
//  渲染某角色待确认的数据交接卡片（来源/内容/时间 + 确认按钮），
//  确认 = HandoffStore.confirm（销待办 + 状态落库，信息流闭环）。
//  挂载点：宣传/组织工作台待办列表顶部、纪检补课 tab 顶部。
// ════════════════════════════════════════════════════════════════

import { HandoffStore, HANDOFF_TYPES, HANDOFF_ROLE_LABELS } from '../services/handoff.js?v=20260920d';
import { badgeHtml } from './badges.js?v=20260920d';
import { solidAccentStyle } from '../core/constants.js?v=20260920d';
// 统一检索引擎（2026-09-14 批次 37）：待确认交接待办列表接入（关键词 事项/类型 + 引擎内置分页）
import { renderFilteredList } from './list-filter.js?v=20260920d';

// 引擎行样式交接（2026-09-14 批次 37）：行由统一检索引擎渲染，而引擎须 DOM 就位后才可挂载
//（render 出 HTML 串 → 调用方 innerHTML → bind 才拿到容器）；bind 侧调用方只传 to，拿不到强调色，
// 故 render 按接收方角色暂存本轮强调色（行内确认钮样式依赖它），bind 取回后即挂载。
const _accentByTo = new Map(); // to → accent

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
  _accentByTo.set(to, accent);

  // 2026-09-08 顶卡排布统一：空态不再 return ''（整卡消失 → 页面高度突跳），常驻卡 + 空态行
  // 待确认行改由统一检索引擎渲染（本处只出宿主 div；引擎在 innerHTML 就位后于 bindHandoffInbox 挂载）
  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
        ${items.length > 0 ? `<span class="text-xs text-gray-500 tabular-nums">${items.length} 条待确认</span>` : '<span class="text-xs text-gray-500">已清空</span>'}
      </div>
      ${items.length > 0 ? '<div id="handoff-inbox-list-host"></div>' : '<p class="text-xs text-gray-500 py-1">暂无待确认的交接数据</p>'}
      ${extraActionHtml || ''}
    </div>
  `;
}

/** 绑定交接收件箱确认按钮（2026-09-14 批次 37：列表接统一检索引擎；确认钮改事件委托于宿主） */
export function bindHandoffInbox(container, { to, onDone }) {
  const host = container.querySelector('#handoff-inbox-list-host');
  if (host) {
    const accent = _accentByTo.get(to);
    renderFilteredList(host, {
      stateKey: `handoff-inbox-${to}`,
      rows: HandoffStore.listByRole(to), // 与 renderHandoffInboxHtml 同源；挂载晚于渲染，再取一次保最新
      keyword: {
        keys: ['refLabel', 'note', 'type'],
        placeholder: '搜索交接事项 / 类型…',
        get: (h, k) => (k === 'type' ? ((HANDOFF_TYPES[h.type] || {}).label || h.type) : h[k]),
      },
      countUnit: '条',
      listClass: 'divide-y divide-gray-50', // 原列表容器 .divide-y（行自带 border-b + last:border-b-0）
      emptyMessage: '暂无待确认的交接数据',
      rowHtml: (h) => {
        const meta = HANDOFF_TYPES[h.type] || {};
        return `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-b-0">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-medium text-gray-800 truncate">${meta.label || h.type}：${h.refLabel || ''}</span>
            ${badgeHtml('待确认', 'warning')}
          </div>
          <div class="text-xs text-gray-500 truncate">${h.note || `${HANDOFF_ROLE_LABELS[h.from] || h.from} → ${HANDOFF_ROLE_LABELS[h.to] || h.to}`} · ${(h.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
        </div>
        <button type="button" class="handoff-confirm-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-handoff-id="${h.id}" style="${solidAccentStyle(accent)};cursor:pointer;">确认接收</button>
      </div>
    `;
      },
    });
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('.handoff-confirm-btn');
      if (!btn) return;
      const ok = HandoffStore.confirm(btn.dataset.handoffId, to);
      if (!ok) return;
      if (typeof onDone === 'function') onDone();
    });
  }
}
