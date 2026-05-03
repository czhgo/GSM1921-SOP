// role: [人机]
// ════════════════════════════════════════════════════════════════
//  utils.js — 格式化工具、动画辅助、Toast 组件
// ════════════════════════════════════════════════════════════════

import { TRANSITION_DURATION } from './constants.js';

// ── 日期格式化 ─────────────────────────────────────────────────
export function _pad(n) { return n < 10 ? '0' + n : '' + n; }

export function _fmtDate(d) {
  return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
}

export function _fmtChinese(d) {
  const DN = ['日','一','二','三','四','五','六'];
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（周' + DN[d.getDay()] + '）';
}

export function _currentYearMonth() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

// ── 动画工具 ────────────────────────────────────────────────────
export function enterEl(el) {
  clearTimeout(el._leaveTimer);
  el.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.remove('opacity-0', 'translate-y-4');
      el.classList.add('opacity-100', 'translate-y-0');
    });
  });
}

export function leaveEl(el) {
  el.classList.remove('opacity-100', 'translate-y-0');
  el.classList.add('opacity-0', 'translate-y-4');
  clearTimeout(el._leaveTimer);
  el._leaveTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, TRANSITION_DURATION);
}

// ── Toast 组件 — 浮层通知（固定定位，不影响文档流）─────────────
let _toastContainer = null;

/**
 * 显示一条浮层 Toast 通知
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 */
export function showToast(type, message) {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'right:1.5rem',
      'z-index:9999', 'display:flex', 'flex-direction:column',
      'gap:0.5rem', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(_toastContainer);
  }

  const COLORS = {
    success: { bg: 'rgba(34,197,94,0.15)',  border: '#22c55e', icon: '✅' },
    error:   { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', icon: '❌' },
    info:    { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', icon: 'ℹ️' },
  };
  const { bg, border, icon } = COLORS[type] || COLORS.info;

  const toast = document.createElement('div');
  toast.style.cssText = [
    `background:${bg}`, 'backdrop-filter:blur(8px)',
    `border:1px solid ${border}`, 'border-radius:0.75rem',
    'padding:0.625rem 1rem', 'display:flex', 'align-items:center',
    'gap:0.5rem', 'font-size:0.875rem', 'color:#f1f5f9',
    'box-shadow:0 4px 24px rgba(0,0,0,0.3)',
    'opacity:0', 'transform:translateY(0.5rem)',
    'transition:opacity 0.25s ease,transform 0.25s ease',
    'pointer-events:none', 'max-width:22rem', 'word-break:break-word',
  ].join(';');
  toast.textContent = icon + '  ' + message;
  _toastContainer.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }));

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.5rem)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
