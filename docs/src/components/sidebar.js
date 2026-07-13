// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（重构版）
// 变化: 去掉身份卡片区块，模块切换改为自动跳转到角色子页面

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';

function getNavItems() {
  const base = getBasePath();
  return [
    { module: 'dashboard', label: '主页', href: base + 'index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { module: 'workspace', label: '党建工作台', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { module: 'party', label: '党务管理', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { module: 'members', label: '人员管理', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', commissionerOnly: true },
    { module: 'archive', label: '归档库', href: base + 'archive.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' },
    { module: 'search', label: '资料查询', href: base + 'search.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
    { module: 'feedback', label: '意见反馈', href: base + 'feedback.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  ];
}

export function renderSidebar(activeModule) {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const user = AuthStore.getCurrentUser();
  const role = user ? AuthStore.getEffectiveRole(user.userId) : '';

  const navItems = getNavItems();
  const navHTML = navItems.map(item => {
    // 人员管理仅支委可见
    if (item.commissionerOnly && !AuthStore.isCommissioner(role)) return '';

    // workspace/party: 根据角色自动跳转
    let href = item.href;
    if (item.module === 'workspace') {
      const page = AuthStore.getPageForRole('workspace', role);
      if (page) href = getBasePath() + 'workspace/' + page;
      else return '';  // 无对应页面则隐藏
    } else if (item.module === 'party') {
      const page = AuthStore.getPageForRole('party', role);
      if (page) href = getBasePath() + 'party/' + page;
      else return '';  // leader/participant 无 party 页面则隐藏
    } else if (item.module === 'members') {
      href = getBasePath() + 'members.html';
    }

    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}">
        ${item.icon}
        <span class="font-title-cn">${item.label}</span>
      </a>
    `;
  }).join('');

  sidebar.innerHTML = `
    <nav class="sidebar-nav">
      <div class="flex flex-col gap-2 mb-2">${navHTML}</div>
    </nav>
    <div class="sidebar-footer">
      <a href="${getBasePath()}help.html" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>帮助</span>
      </a>
      <a href="${getBasePath()}about.html" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>关于</span>
      </a>
      <button id="sidebar-logout" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>退出登录</span>
      </button>
    </div>
  `;

  _bindLogout(sidebar);
}

function _bindLogout(sidebar) {
  const btn = sidebar.querySelector('#sidebar-logout');
  if (!btn) return;
  btn.addEventListener('click', () => {
    AuthStore.logout();
    window.location.href = getBasePath() + 'login.html';
  });
}
