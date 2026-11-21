// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  status-badge.js — 通用状态徽章组件（T-217 §2.4 行内状态轻交互原型）
//  渲染「色点 + 文字」徽章，点击弹出小悬浮选择器（clamp 边界定位），选中即改。
//  用途：任务状态 / 考勤状态 / 交接状态等行内状态（替代原生 select 下拉）
// ════════════════════════════════════════════════════════════════

import { icon } from '../../core/base/icons.js?v=20261120a';

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
    <span class="status-badge" data-status-badge data-status="${status}" ${disabled ? 'data-disabled="1"' : ''} ${attrs} style="--sb-color:${def.color};" role="button" tabindex="${disabled ? '-1' : '0'}" aria-haspopup="menu" aria-expanded="false" aria-controls="status-badge-menu" aria-label="状态：${def.label}，点击修改">
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

// ── 悬浮选择器（clamp 边界定位；2026-11-21 批次 590：补齐 aria-expanded / 焦点进入菜单 / 方向键）
//   注：未直接复用 `menu-button.js`——该组件自带触发器与视觉，套在此行内徽章上会改变卡内形态；
//   这里按 SD-38 的判据（aria 可回读 ＋ 焦点进菜单 ＋ 方向键 ＋ Esc 归还焦点）逐条对齐。
function _openStatusPopover(anchor, statuses, onChange) {
  const rect = anchor.getBoundingClientRect();
  const current = anchor.dataset.status;
  const menuId = 'status-badge-menu';

  const popover = document.createElement('div');
  popover.className = 'status-badge-popover';
  popover.id = menuId;
  popover.setAttribute('role', 'menu');
  popover.innerHTML = Object.entries(statuses).map(([value, def]) => `
    <button type="button" class="btn-tab status-badge-option${value === current ? ' is-active' : ''}" data-value="${value}" role="menuitem" tabindex="-1" style="--sb-color:${def.color};">
      <span class="status-badge-dot"></span>
      <span>${def.label}</span>
      ${value === current ? icon('check', { className: 'w-3 h-3 status-badge-check' }) : ''}
    </button>
  `).join('');

  document.body.appendChild(popover);
  anchor.setAttribute('aria-expanded', 'true');
  anchor.setAttribute('aria-controls', menuId);

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

  const close = (restoreFocus = false) => {
    popover.remove();
    anchor.setAttribute('aria-expanded', 'false');
    anchor.removeAttribute('aria-controls');
    document.removeEventListener('keydown', onKeydown);
    if (restoreFocus) anchor.focus();
  };
  const options = () => [...popover.querySelectorAll('.status-badge-option')];
  const onKeydown = (e) => {
    const list = options();
    const idx = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (e.key === 'Tab') { close(false); return; }
    if (!list.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (idx + 1 + list.length) % list.length : (idx - 1 + list.length) % list.length;
      list[next].focus();
    } else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
  };
  // 延迟绑定避免触发同一点击事件导致立刻关闭
  setTimeout(() => document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !anchor.contains(e.target)) close(false);
  }), 0);
  document.addEventListener('keydown', onKeydown);
  // 焦点进入菜单：键盘用户可直接用方向键选择
  const active = options().find((btn) => btn.classList.contains('is-active')) || options()[0];
  if (active) active.focus();

  popover.querySelectorAll('.status-badge-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      anchor.dataset.status = value;
      const def = statuses[value];
      if (def) {
        anchor.style.setProperty('--sb-color', def.color);
        const labelEl = anchor.querySelector('.status-badge-label');
        if (labelEl) labelEl.textContent = def.label;
      }
      close(true);
      if (typeof onChange === 'function') onChange(value);
    });
  });
}

/** 关闭当前打开的悬浮选择器 */
function _closeStatusPopover() {
  document.querySelectorAll('[data-status-badge][aria-expanded="true"]').forEach((el) => {
    el.setAttribute('aria-expanded', 'false');
    el.removeAttribute('aria-controls');
  });
  document.querySelector('.status-badge-popover')?.remove();
}
