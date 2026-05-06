// role: [人机]
// components/header.js — 共享顶栏组件（含模式切换：管理模式 / 只读模式）

import { ViewModeStore } from '../service.auth.js';

const MODULE_VIEW_MODES = ['workspace', 'party'];

function _modeSwitcherHTML(module) {
  if (!MODULE_VIEW_MODES.includes(module)) return '';
  const mode = ViewModeStore.getMode(module);
  const label = mode === 'manage' ? '管理模式' : '只读模式';
  const bg   = mode === 'manage' ? '#CE1126' : '#4B5563';

  return `
    <div class="view-mode-switcher" id="view-mode-switcher" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:5px 12px;border-radius:4px;background:${bg};border:none;">
      <span class="text-xs font-medium" id="view-mode-badge" style="color:#FFFFFF;">${label}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  `;
}

export function renderHeader(activeModule) {
  const header = document.getElementById('app-header');
  if (!header) return;

  header.innerHTML = `
    <div class="header-content">
      <button id="hamburger-btn" aria-label="打开导航菜单" class="hamburger-btn">
        <span></span><span></span><span></span>
      </button>
      <div class="party-emblem-wrapper">
        <img src="./assets/images/party_emblem.png" alt="党徽" class="party-emblem" draggable="false">
      </div>
      <div class="header-title">
        <h1 class="font-title-cn">光华管理学院本科生党支部管理引擎</h1>
      </div>
      <div class="header-actions">
        ${_modeSwitcherHTML(activeModule)}
      </div>
    </div>
  `;

  _bindHamburger(header);
  if (MODULE_VIEW_MODES.includes(activeModule)) {
    _bindViewSwitcher(header, activeModule);
    _bindSidebarSync(header, activeModule);
  }
}

function _bindHamburger(header) {
  const hamburger = header.querySelector('#hamburger-btn');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    const collapsed = sidebar.classList.contains('sidebar-collapsed');
    if (collapsed) {
      sidebar.classList.remove('sidebar-collapsed');
      if (overlay) overlay.classList.add('visible');
    } else {
      sidebar.classList.add('sidebar-collapsed');
      if (overlay) overlay.classList.remove('visible');
    }
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      overlay.classList.remove('visible');
      sidebar.classList.add('sidebar-collapsed');
    });
  }
}

function _bindViewSwitcher(header, module) {
  const switcher = header.querySelector('#view-mode-switcher');
  if (!switcher) return;

  switcher.addEventListener('click', () => {
    const current = ViewModeStore.getMode(module);
    const next = current === 'manage' ? 'observe' : 'manage';
    ViewModeStore.setMode(module, next);
    _updateBadge(switcher, next);

    document.dispatchEvent(new CustomEvent('view:mode-change', {
      detail: { module, mode: next },
      bubbles: true,
    }));
  });
}

function _updateBadge(switcher, mode) {
  const badge = switcher.querySelector('#view-mode-badge');
  if (badge) {
    badge.textContent = mode === 'manage' ? '管理模式' : '只读模式';
    switcher.style.background = mode === 'manage' ? '#CE1126' : '#4B5563';
  }
}

function _bindSidebarSync(header, module) {
  document.addEventListener('sidebar:role-select', (e) => {
    if (e.detail.module !== module) return;
    const switcher = header.querySelector('#view-mode-switcher');
    if (!switcher) return;
    const mode = e.detail.mode || ViewModeStore.getMode(module);
    ViewModeStore.setMode(module, mode);
    _updateBadge(switcher, mode);
  });
}
