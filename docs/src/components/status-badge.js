// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  status-badge.js — 通用状态徽章组件（T-217 §2.4 行内状态轻交互原型）
//  渲染「色点 + 文字」徽章，点击弹出小悬浮选择器（clamp 边界定位），选中即改。
//  用途：任务状态 / 考勤状态 / 交接状态等行内状态（替代原生 select 下拉）
// ════════════════════════════════════════════════════════════════

import { icon } from '../core/icons.js?v=20260901y';

const VIEWPORT_PADDING = 8;

/**
 * 生成状态徽章 HTML
 * @param {string} status - 当前状态值
 * @param {Object} options
 * @param {Object} options.statuses - 状态定义 { value: { label, color } }
 * @param {boolean} [options.disabled] - 禁用交互（如已归档）
 * @param {string} [options.attrs] - 附加到徽章元素的 data 属性（如 data-task-id）
 * @returns {string}
 */
export function statusBadgeHtml(status, { statuses, disabled = false, attrs = '' }) {
  const def = statuses[status] || { label: status, color: '#9CA3AF' };
  return `
    <span class="status-badge" data-status-badge data-status="${status}" ${disabled ? 'data-disabled="1"' : ''} ${attrs} style="--sb-color:${def.color};" role="button" tabindex="${disabled ? '-1' : '0'}" aria-label="状态：${def.label}，点击修改">
      <span class="status-badge-dot"></span>
      <span class="status-badge-label">${def.label}</span>
      ${disabled ? '' : icon('chevronDown', { className: 'w-2.5 h-2.5 status-badge-chevron' })}
    </span>
  `;
}

/**
 * 绑定状态徽章交互（点击弹出悬浮选择器，clamp 边界定位，点击外部 / ESC 关闭）
 * @param {HTMLElement} badgeEl - 徽章元素（data-status-badge）
 * @param {Object} options
 * @param {Object} options.statuses - 状态定义 { value: { label, color } }
 * @param {Function} options.onChange - 选中回调 (newStatus) => void
 */
export function bindStatusBadge(badgeEl, { statuses, onChange }) {
  if (!badgeEl || badgeEl.dataset.disabled) return;

  const open = (e) => {
    e.stopPropagation();
    _closeStatusPopover();
    _openStatusPopover(badgeEl, statuses, onChange);
  };

  badgeEl.addEventListener('click', open);
  badgeEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
  });
}

// ── 悬浮选择器（clamp 边界定位，参照 A-02/notice.js 弹窗定位经验） ──
function _openStatusPopover(anchor, statuses, onChange) {
  const rect = anchor.getBoundingClientRect();
  const current = anchor.dataset.status;

  const popover = document.createElement('div');
  popover.className = 'status-badge-popover';
  popover.setAttribute('role', 'menu');
  popover.innerHTML = Object.entries(statuses).map(([value, def]) => `
    <button type="button" class="status-badge-option${value === current ? ' is-active' : ''}" data-value="${value}" role="menuitem" style="--sb-color:${def.color};">
      <span class="status-badge-dot"></span>
      <span>${def.label}</span>
      ${value === current ? icon('check', { className: 'w-3 h-3 status-badge-check' }) : ''}
    </button>
  `).join('');

  document.body.appendChild(popover);

  // clamp 边界定位：优先下方，空间不足翻到上方；左右不溢出视口
  const popRect = popover.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeBelow = spaceBelow >= popRect.height + VIEWPORT_PADDING;
  let left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, window.innerWidth - popRect.width - VIEWPORT_PADDING));
  if (placeBelow) {
    popover.style.top = `${rect.bottom + 6}px`;
  } else {
    popover.style.top = `${Math.max(VIEWPORT_PADDING, rect.top - popRect.height - 6)}px`;
  }
  popover.style.left = `${left}px`;
  popover.classList.add('is-visible');

  const close = () => {
    popover.remove();
    document.removeEventListener('keydown', onEsc);
  };
  const onEsc = (e) => { if (e.key === 'Escape') close(); };
  // 延迟绑定避免触发同一点击事件导致立刻关闭
  setTimeout(() => document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !anchor.contains(e.target)) close();
  }), 0);
  document.addEventListener('keydown', onEsc);

  popover.querySelectorAll('.status-badge-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      // 立即同步徽章显示，再交由 onChange 触发全局状态刷新
      anchor.dataset.status = value;
      const def = statuses[value];
      if (def) {
        anchor.style.setProperty('--sb-color', def.color);
        const labelEl = anchor.querySelector('.status-badge-label');
        if (labelEl) labelEl.textContent = def.label;
      }
      close();
      if (typeof onChange === 'function') onChange(value);
    });
  });
}

/** 关闭当前打开的悬浮选择器 */
function _closeStatusPopover() {
  document.querySelector('.status-badge-popover')?.remove();
}
