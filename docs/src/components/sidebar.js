// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（重构版）
// 变化: 去掉身份卡片区块，模块切换改为自动跳转到角色子页面
// 第3轮 Task 7: 订阅 view-role-change 事件，re-render 链接（不 reload）

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';

// 记录当前 activeModule，供 view-role-change 事件触发 re-render 使用
let _lastActiveModule = null;

function getNavItems() {
  const base = getBasePath();
  return [
    { module: 'dashboard', label: '主页', href: base + 'index.html', icon: icon('home') },
    { module: 'workspace', label: '党建工作台', icon: icon('calendar') },
    { module: 'party', label: '党务管理', icon: icon('party') },
    { module: 'members', label: '人员管理', icon: icon('users'), commissionerOnly: true },
    { module: 'archive', label: '归档库', href: base + 'archive.html', icon: icon('archive') },
    { module: 'search', label: '资料查询', href: base + 'search.html', icon: icon('search') },
    { module: 'feedback', label: '提案讨论', href: base + 'feedback.html', icon: icon('message') },
  ];
}

export function renderSidebar(activeModule) {
  _lastActiveModule = activeModule;
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const user = AuthStore.getCurrentUser();
  const role = user ? AuthStore.getEffectiveRole(user.personId) : '';

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
        ${icon('book', { size: 14 })}
        <span>帮助</span>
      </a>
      <a href="${getBasePath()}about.html" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);">
        ${icon('info', { size: 14 })}
        <span>关于</span>
      </a>
      <button id="sidebar-logout" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);cursor:pointer;">
        ${icon('logout', { size: 14 })}
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

// ── 订阅 view-role-change 事件，重新渲染链接（不 reload） ───
// 当 header 切换视角后派发此事件，sidebar 同步更新各模块跳转目标
document.addEventListener('view-role-change', () => {
  if (_lastActiveModule !== null) {
    renderSidebar(_lastActiveModule);
  }
});
