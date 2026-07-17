// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（重构版）
// 变化: 去掉身份卡片区块，模块切换改为自动跳转到角色子页面
// 第3轮 Task 7: 订阅 view-role-change 事件，re-render 链接（不 reload）
// 2026-07-18: workspace 分支支持多角色子菜单（spec §3.3）

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
    { module: 'feedback', label: '意见反馈', href: base + 'feedback.html', icon: icon('message') },
  ];
}

/**
 * 渲染"党建工作台"子菜单（多角色场景）
 * 模式参照 header.js _bindViewSwitcher：点击展开 / ESC / 外部点击关闭 / 选中态视觉
 * 视觉差异：sidebar 子菜单横向展开（left:100%），header view-switcher 竖向下拉
 * @param {Object} item - navItem
 * @param {Array<{role:string,page:string,label:string}>} pages - 可达页面列表
 * @param {string} activeModule - 当前激活模块
 */
function _renderWorkspaceSubMenu(item, pages, activeModule) {
  const base = getBasePath();
  const currentPath = window.location.pathname;
  const activePage = pages.find(p => currentPath.includes('/workspace/' + p.page));
  const isActiveModule = item.module === activeModule;

  const subItemsHTML = pages.map(p => {
    const isActive = activePage?.role === p.role;
    const activeBar = isActive
      ? `<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>`
      : '';
    const selectedBg = isActive ? 'background:var(--surface-hover);' : '';
    return `<a href="${base}workspace/${p.page}" class="workspace-sub-item" data-role="${p.role}" style="position:relative;padding:8px 12px;cursor:pointer;color:var(--neutral-800);font-size:13px;transition:background 0.15s;display:block;text-decoration:none;${selectedBg}">${activeBar}<span>${p.label}</span></a>`;
  }).join('');

  return `
    <div class="workspace-submenu" style="position:relative;">
      <button type="button" class="module-tab ${isActiveModule ? 'active' : ''}" data-workspace-toggle style="display:flex;align-items:center;justify-content:space-between;width:100%;background:transparent;border:none;cursor:pointer;padding:8px 10px;color:var(--neutral-700);font-size:14px;">
        <span style="display:flex;align-items:center;gap:8px;">${item.icon}<span class="font-title-cn">${item.label}</span></span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style="flex-shrink:0;"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="workspace-submenu-panel hidden" style="position:absolute;left:100%;top:0;width:200px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);background:var(--surface-card);overflow:hidden;z-index:100;border:1px solid #E5E7EB;">
        ${subItemsHTML}
      </div>
    </div>
  `;
}

/**
 * 绑定子菜单展开/关闭事件（模式参照 header.js _bindViewSwitcher）
 */
function _bindWorkspaceSubMenu(sidebar) {
  const toggleBtn = sidebar.querySelector('[data-workspace-toggle]');
  const panel = sidebar.querySelector('.workspace-submenu-panel');
  if (!toggleBtn || !panel) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  // hover 效果
  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.background = 'var(--surface-hover)';
  });
  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.background = 'transparent';
  });

  // 子项 hover
  panel.querySelectorAll('.workspace-sub-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const isSelected = item.dataset.role === panel.querySelector('.workspace-sub-item[style*="surface-hover"]')?.dataset.role;
      if (!isSelected) item.style.background = 'var(--surface-hover)';
    });
    item.addEventListener('mouseleave', () => {
      // 选中态保持高亮
      const currentPath = window.location.pathname;
      const pageHref = item.getAttribute('href') || '';
      const pageName = pageHref.split('/').pop();
      const isActive = currentPath.includes('/workspace/' + pageName);
      item.style.background = isActive ? 'var(--surface-hover)' : 'transparent';
    });
  });

  // 外部点击关闭
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
    }
  });
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
    if (item.module === 'workspace') {
      // spec §3.3：单角色→直接跳转 / 2+角色→子菜单
      const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
      if (pages.length === 0) return '';  // 无对应页面则隐藏
      if (pages.length === 1) {
        // B: 单角色直接跳转（沿用现有行为）
        href = getBasePath() + 'workspace/' + pages[0].page;
      } else {
        // C: 多角色子菜单
        return _renderWorkspaceSubMenu(item, pages, activeModule);
      }
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
      <button id="sidebar-logout" class="module-tab" style="border:none;justify-content:flex-start;gap:8px 8px;font-size:0.75rem;color:var(--neutral-400);cursor:pointer;">
        ${icon('logout', { size: 14 })}
        <span>退出登录</span>
      </button>
    </div>
  `;

  _bindLogout(sidebar);
  _bindWorkspaceSubMenu(sidebar);
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