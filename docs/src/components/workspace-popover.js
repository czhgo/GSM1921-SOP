// role: [工程师]+[AI]
// components/workspace-popover.js — 工作台多身份浮窗组件
// 设计: sidebar "党建工作台" <a> 点击拦截 → 弹浮窗选择目标工作台
// 参照: header.js _bindViewSwitcher 事件绑定模式（外部点击/ESC 关闭）
// spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §2.2.3

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';

/**
 * 绑定工作台浮窗事件
 * sidebar 中带 data-workspace-popover="1" 的 <a> 触发浮窗
 * @param {HTMLElement} sidebar - sidebar 容器
 */
export function bindWorkspacePopover(sidebar) {
  const trigger = sidebar.querySelector('[data-workspace-popover="1"]');
  if (!trigger) return;

  let popover = null;

  function showPopover() {
    if (popover) return;
    const user = AuthStore.getCurrentUser();
    if (!user) return;
    const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
    if (pages.length === 0) return;

    const base = getBasePath();
    const currentPath = window.location.pathname;

    popover = document.createElement('div');
    popover.className = 'workspace-popover-panel';
    popover.style.cssText = `
      position:absolute; left:100%; top:0; width:200px;
      border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.12);
      background:var(--surface-card); overflow:hidden; z-index:100;
      border:1px solid #E5E7EB;
    `;

    popover.innerHTML = pages.map(p => {
      const isActive = currentPath.includes('/workspace/' + p.page);
      const selectedBg = isActive ? 'background:var(--surface-hover);' : '';
      const activeBar = isActive
        ? '<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>'
        : '';
      return `<a href="${base}workspace/${p.page}" class="workspace-popover-item" style="position:relative;display:block;padding:8px 12px;color:var(--neutral-800);font-size:13px;text-decoration:none;transition:background 0.15s;${selectedBg}">${activeBar}<span>${p.label}</span></a>`;
    }).join('');

    // hover 效果
    popover.querySelectorAll('.workspace-popover-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const isActive = item.querySelector('span[style*="party-gold"]');
        if (!isActive) item.style.background = 'var(--surface-hover)';
      });
      item.addEventListener('mouseleave', () => {
        const href = item.getAttribute('href') || '';
        const pageName = href.split('/').pop();
        const isActive = currentPath.includes('/workspace/' + pageName);
        item.style.background = isActive ? 'var(--surface-hover)' : 'transparent';
      });
    });

    trigger.parentElement.style.position = 'relative';
    trigger.parentElement.appendChild(popover);
  }

  function hidePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  // 点击 <a> 时拦截
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (popover) hidePopover();
    else showPopover();
  });

  // 外部点击关闭
  document.addEventListener('click', (e) => {
    if (popover && !popover.contains(e.target) && !trigger.contains(e.target)) {
      hidePopover();
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popover) hidePopover();
  });
}
