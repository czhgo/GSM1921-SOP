// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（角色单页制 v2）
// 2026-07-29: 角色单页制重构——合并党建/党务为"工作台"单入口
// - 移除 '党务管理' / '人员管理' 独立入口
// - '党建工作台' → '工作台'（角色自适应跳转）
// - 帮助/关于移入主导航区

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { bindWorkspacePopover } from './workspace-popover.js';

// 记录当前 activeModule，供 view-role-change 事件触发 re-render 使用
let _lastActiveModule = null;

function getNavItems() {
  const base = getBasePath();
  return [
    { module: 'dashboard', label: '首页', href: base + 'index.html', icon: icon('home') },
    { module: 'workspace', label: '工作台', icon: icon('calendar') },
    { module: 'archive', label: '归档库', href: base + 'archive.html', icon: icon('archive') },
    { module: 'search', label: '资料查询', href: base + 'search.html', icon: icon('search') },
    { module: 'feedback', label: '意见反馈', href: base + 'feedback.html', icon: icon('message') },
  ];
}

function getFooterItems() {
  const base = getBasePath();
  return [
    { module: 'help', label: '帮助', href: base + 'help.html', icon: icon('book') },
    { module: 'about', label: '关于', href: base + 'about.html', icon: icon('info') },
  ];
}

export function renderSidebar(activeModule) {
  _lastActiveModule = activeModule;
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const user = AuthStore.getCurrentUser();
  // 使用常设角色（非 effective role）决定导航结构
  const role = user ? AuthStore.getUserRole(user.personId) : '';

  const navItems = getNavItems();
  const navHTML = navItems.map(item => {
    // 工作台：根据角色自动跳转对应页面
    let href = item.href;
    let extraAttrs = '';
    if (item.module === 'workspace') {
      const pages = user ? AuthStore.getAccessibleWorkspacePages(user.personId) : [];
      if (pages.length === 0) return '';
      const standingPage = AuthStore.getPageForRole('workspace', role);
      if (!standingPage) return '';
      href = getBasePath() + 'workspace/' + standingPage;
      // 多身份时加 popover 标记
      if (pages.length > 1) {
        extraAttrs = ' data-workspace-popover="1"';
      }
    }

    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}"${extraAttrs}>
        ${item.icon}
        <span class="font-title-cn">${item.label}</span>
      </a>
    `;
  }).join('');

  const footerItems = getFooterItems();
  const footerHTML = footerItems.map(item => `
    <a href="${item.href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}">
      ${item.icon}
      <span class="font-title-cn">${item.label}</span>
    </a>
  `).join('');

  sidebar.innerHTML = `
    <nav class="sidebar-nav">
      <div class="flex flex-col gap-2 mb-2">${navHTML}</div>
    </nav>
    <div class="sidebar-footer">
      <div class="flex flex-col gap-1 mb-2">${footerHTML}</div>
      <button id="sidebar-logout" class="module-tab" style="border:none;justify-content:flex-start;gap:8px 8px;font-size:0.75rem;color:var(--neutral-400);cursor:pointer;">
        ${icon('logout', { size: 14 })}
        <span>退出登录</span>
      </button>
    </div>
  `;

  _bindLogout(sidebar);
  bindWorkspacePopover(sidebar);
}

function _bindLogout(sidebar) {
  const btn = sidebar.querySelector('#sidebar-logout');
  if (!btn) return;
  btn.addEventListener('click', () => {
    AuthStore.logout();
    window.location.href = getBasePath() + 'login.html';
  });
}

// ── 订阅 view-role-change 事件，重新渲染链接（不 reload） ───
document.addEventListener('view-role-change', () => {
  if (_lastActiveModule !== null) {
    renderSidebar(_lastActiveModule);
  }
});
