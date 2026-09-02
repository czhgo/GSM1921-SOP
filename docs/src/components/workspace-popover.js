// role: [工程师]+[AI]
// components/workspace-popover.js — 工作台多身份模态框组件
// 设计: sidebar "工作台" <a> 点击拦截 → 居中模态框选择目标工作台
// 单身份直接跳转，多身份弹模态框

import { AuthStore } from '../services/auth.js?v=20260901j';
import { getBasePath } from '../core/utils.js?v=20260901j';

/**
 * 绑定工作台模态框事件
 * sidebar 中带 data-workspace-popover="1" 的 <a> 触发模态框
 * @param {HTMLElement} sidebar - sidebar 容器
 */
export function bindWorkspacePopover(sidebar) {
  const trigger = sidebar.querySelector('[data-workspace-popover="1"]');
  if (!trigger) return;

  let overlay = null;

  function showModal() {
    if (overlay) return;
    const user = AuthStore.getCurrentUser();
    if (!user) return;
    const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
    if (pages.length === 0) return;

    const base = getBasePath();
    const currentPath = window.location.pathname;

    // 遮罩层
    overlay = document.createElement('div');
    overlay.className = 'workspace-modal-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.4);
      display:flex; align-items:center; justify-content:center;
      z-index:9999; animation:ws-fade-in 0.2s ease;
    `;

    // 模态框卡片
    const modal = document.createElement('div');
    modal.className = 'workspace-modal-card';
    modal.style.cssText = `
      background:var(--surface-card); border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.15);
      min-width:280px; max-width:360px; padding:24px;
      animation:ws-scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
    `;

    // 标题
    const title = document.createElement('div');
    title.style.cssText = `
      font-weight:600; color:var(--neutral-800);
      margin-bottom:16px; text-align:center;
    `;
    title.className = 'text-body-sm';
    title.textContent = '选择进入身份';
    modal.appendChild(title);

    // 选项列表
    pages.forEach(p => {
      const isActive = currentPath.includes('/workspace/' + p.page);
      const item = document.createElement('a');
      item.href = base + 'workspace/' + p.page;
      item.className = 'workspace-modal-item';
      item.style.cssText = `
        display:flex; align-items:center; justify-content:center;
        padding:12px 16px; border-radius:10px; margin-bottom:8px;
        font-weight:500; text-decoration:none;
        transition:background 0.15s, color 0.15s;
        background:${isActive ? 'rgba(206,17,38,0.08)' : 'var(--neutral-100)'};
        color:${isActive ? '#CE1126' : 'var(--neutral-700)'};
        border:1px solid ${isActive ? 'rgba(206,17,38,0.25)' : 'transparent'};
      `;
      item.className = 'text-sm';
      item.innerHTML = `<span>${p.label}</span>`;
      if (isActive) {
        item.innerHTML = `<span>${p.label}</span><span style="margin-left:8px;color:var(--neutral-400);" class="text-xs">当前</span>`;
      }

      item.addEventListener('mouseenter', () => {
        if (!isActive) {
          item.style.background = 'var(--surface-hover)';
        }
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) {
          item.style.background = 'var(--neutral-100)';
        }
      });

      modal.appendChild(item);
    });

    overlay.appendChild(modal);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideModal();
    });

    document.body.appendChild(overlay);
  }

  function hideModal() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // 点击 <a> 时拦截
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (overlay) hideModal();
    else showModal();
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) hideModal();
  });
}
