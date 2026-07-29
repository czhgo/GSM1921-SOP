// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（重构版）
// 变化: 去掉身份卡片区块，模块切换改为自动跳转到角色子页面
// 第3轮 Task 7: 订阅 view-role-change 事件，re-render 链接（不 reload）
// 2026-07-18 T110: workspace 分支支持多角色子菜单
// 2026-07-18 T111: 恢复 <a> 统一性，多身份改用 workspace-popover 浮窗（spec §2.2）

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { bindWorkspacePopover } from './workspace-popover.js';

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
    { module: 'feedback', label: '意见反馈', href: base + 'feedback.html', icon: icon('message') },
  ];
}

export function renderSidebar(activeModule) {
  _lastActiveModule = activeModule;
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const user = AuthStore.getCurrentUser();
  // 使用常设角色（非 effective role）决定导航结构
  // 视角切换只影响页面内容，不影响侧边栏可见性：
  //   书记切换到 organizer 视角时，effective role='organizer'，
  //   但 ROLE_PAGE_MAP 无 organizer 映射，会导致 workspace/party 链接被隐藏。
  //   isCommissioner 同理——支委身份不因视角切换而改变。
  const role = user ? AuthStore.getUserRole(user.personId) : '';

  const navItems = getNavItems();
  const navHTML = navItems.map(item => {
    // 人员管理仅支委可见
    if (item.commissionerOnly && !AuthStore.isCommissioner(role)) return '';

    // workspace/party: 根据角色自动跳转
    let href = item.href;
    let extraAttrs = '';
    let extraInner = '';
    if (item.module === 'workspace') {
      // spec §2.2: 始终渲染 <a>，多身份时由 workspace-popover 拦截
      const pages = user ? AuthStore.getAccessibleWorkspacePages(user.personId) : [];
      if (pages.length === 0) return '';  // 无对应页面则隐藏
      // 始终用 standing role 取页面（恢复旧版逻辑）
      const standingPage = AuthStore.getPageForRole('workspace', role);
      if (!standingPage) return '';
      href = getBasePath() + 'workspace/' + standingPage;
      // 多身份时加 popover 标记（点击弹出悬浮选择，无需箭头）
      if (pages.length > 1) {
        extraAttrs = ' data-workspace-popover="1"';
      }
    } else if (item.module === 'party') {
      const page = AuthStore.getPageForRole('party', role);
      if (page) href = getBasePath() + 'party/' + page;
      else return '';  // leader/participant 无 party 页面则隐藏
    } else if (item.module === 'members') {
      href = getBasePath() + 'members.html';
    }

    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}"${extraAttrs}>
        ${item.icon}
        <span class="font-title-cn">${item.label}</span>
        ${extraInner}
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
// 当 header 切换视角后派发此事件，sidebar 同步更新各模块跳转目标
document.addEventListener('view-role-change', () => {
  if (_lastActiveModule !== null) {
    renderSidebar(_lastActiveModule);
  }
});
