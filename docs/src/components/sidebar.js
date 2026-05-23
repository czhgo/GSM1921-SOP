// role: [人机]
// components/sidebar.js — 共享侧边栏（身份视图卡片 + 模式由站位+视图自动推导）

import { AuthStore, ViewModeStore } from '../services/auth.js';
import { PermissionManager } from '../services/permission-manager.js';
import { interceptSidebarNavigation } from './role-selector.js';
import { getBasePath } from '../core/utils.js';

function getNavItems() {
  const base = getBasePath();
  return [
    { module: 'dashboard', label: '主页', href: base + 'index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { module: 'workspace', label: '党建工作台', href: base + 'workspace/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { module: 'party', label: '党务管理', href: base + 'party/index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { module: 'archive', label: '归档库', href: base + 'archive.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' },
    { module: 'search', label: '资料查询', href: base + 'search.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
    { module: 'feedback', label: '意见反馈', href: base + 'feedback.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  ];
}

const ROLE_CARDS = {
  workspace: [
    { role: 'leader', label: '党小组组长', desc: '党小组活动统筹', cls: 'leader-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' },
    { role: 'commissioner-group', label: '条条支委', desc: '组织/宣传/纪检', cls: 'commissioner-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { role: 'organizer', label: '组织者', desc: '分工记录·桥梁作用', cls: 'organizer-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>' },
    { role: 'deep', label: '深度参与者', desc: '承担具体分工', cls: 'deep-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg>' },
    { role: 'secretary', label: '党支部书记', desc: '组织统筹决策', cls: 'secretary-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
  ],
  party: [
    { role: 'org-commissioner', label: '组织委员', desc: '党员发展', cls: 'commissioner-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
    { role: 'prop-commissioner', label: '宣传委员', desc: '宣传档案', cls: 'commissioner-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>' },
    { role: 'disc-commissioner', label: '纪检委员', desc: '考勤考察', cls: 'commissioner-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { role: 'secretary', label: '党支部书记', desc: '组织统筹决策', cls: 'secretary-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
  ],
};

// 角色到子页面映射
const ROLE_PAGE_MAP = {
  workspace: {
    'secretary': 'secretary.html',
    'org-commissioner': 'org.html',
    'prop-commissioner': 'prop.html',
    'disc-commissioner': 'disc.html',
    'leader': 'leader.html',
    'organizer': 'organizer.html',
    'deep': 'deep.html',
  },
  party: {
    'secretary': 'secretary.html',
    'org-commissioner': 'org.html',
    'prop-commissioner': 'prop.html',
    'disc-commissioner': 'disc.html',
  },
};

function _getSavedRole(module) {
  try { return sessionStorage.getItem(`sidebar-role-${module}`) || ''; } catch { return ''; }
}

function _saveRole(module, role) {
  try { sessionStorage.setItem(`sidebar-role-${module}`, role); } catch {}
}

export function renderSidebar(activeModule) {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const savedRole = _getSavedRole(activeModule);
  const stance = AuthStore.getPrimaryRole() || AuthStore.getLoginStance();

  const navItems = getNavItems();
  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}">
      ${item.icon}
      <span class="font-title-cn">${item.label}</span>
    </a>
  `).join('');

  // 所有身份视图卡片始终可见——站位只影响模式推导，不影响可见性
  const allRoleCards = ROLE_CARDS[activeModule] || [];

  const roleHTML = allRoleCards.length > 0 ? `
    <div class="sidebar-divider"></div>
    <div style="padding:0 8px 4px;font-size:10px;color:#9CA3AF;font-weight:600;letter-spacing:0.05em;">身份视图</div>
    <div class="role-cards-container" style="display:flex;flex-direction:column;gap:8px;">
      ${allRoleCards.map(card => {
        if (card.role === 'commissioner-group') {
          return `
        <div style="display:flex;flex-direction:column;gap:0;">
          <button class="role-card ${card.cls} ${savedRole === card.role ? 'active' : ''}" data-role="${card.role}" aria-label="${card.label}">
            <div class="role-card-left"><div class="role-icon">${card.icon}</div></div>
            <div class="role-card-content"><span class="role-card-title">${card.label}</span><span class="role-card-desc">${card.desc}</span></div>
          </button>
          <div class="commissioner-sub-cards" style="max-height:0;overflow:hidden;transition:max-height 0.25s ease-out;padding-left:32px;" data-parent="commissioner-group">
            <div style="display:flex;gap:8px;padding:4px 0 8px;">
              <a class="commissioner-sub-link" data-role="org-commissioner" style="font-size:11px;color:var(--neutral-500);cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.15s,color 0.15s;">组织委员</a>
              <a class="commissioner-sub-link" data-role="prop-commissioner" style="font-size:11px;color:var(--neutral-500);cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.15s,color 0.15s;">宣传委员</a>
              <a class="commissioner-sub-link" data-role="disc-commissioner" style="font-size:11px;color:var(--neutral-500);cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.15s,color 0.15s;">纪检委员</a>
            </div>
          </div>
        </div>`;
        }
        return `
        <button class="role-card ${card.cls} ${savedRole === card.role ? 'active' : ''}" data-role="${card.role}" aria-label="${card.label}">
          <div class="role-card-left"><div class="role-icon">${card.icon}</div></div>
          <div class="role-card-content"><span class="role-card-title">${card.label}</span><span class="role-card-desc">${card.desc}</span></div>
        </button>
      `}).join('')}
    </div>
  ` : '';

  sidebar.innerHTML = `
    <nav class="sidebar-nav">
      <div class="flex flex-col gap-2 mb-2">${navHTML}</div>
      ${roleHTML}
    </nav>
    <div class="sidebar-footer">
      <a href="${getBasePath()}about.html" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>关于</span>
      </a>
    </div>
  `;

  _bindRoleCardClicks(sidebar, activeModule);

  if (savedRole) {
    PermissionManager.restoreRole(savedRole, activeModule);
    const savedMode = ViewModeStore.getMode(activeModule);
    document.dispatchEvent(new CustomEvent('sidebar:view-restore', {
      detail: { role: savedRole, module: activeModule, mode: savedMode },
      bubbles: true,
    }));
  }

  interceptSidebarNavigation();
}

function _selectRole(sidebar, activeModule, role, cardEl) {
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');
  _saveRole(activeModule, role);

  PermissionManager.selectRole(role, activeModule);

  // 导航到对应子页面
  const pageMap = ROLE_PAGE_MAP[activeModule];
  if (pageMap && pageMap[role]) {
    const base = getBasePath();
    const targetDir = activeModule === 'workspace' ? 'workspace/' : 'party/';
    const targetPage = base + targetDir + pageMap[role];
    window.location.href = targetPage;
    return;
  }

  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('visible');
  sidebar.classList.add('sidebar-collapsed');
}

function _bindRoleCardClicks(sidebar, activeModule) {
  // commissioner-group 展开/折叠（max-height 动效）
  const groupCard = sidebar.querySelector('[data-role="commissioner-group"]');
  if (groupCard) {
    groupCard.addEventListener('click', (e) => {
      e.stopPropagation();
      const subCards = sidebar.querySelector('.commissioner-sub-cards');
      if (subCards) {
        const isExpanded = subCards.style.maxHeight !== '0px' && subCards.style.maxHeight !== '';
        if (isExpanded) {
          subCards.style.maxHeight = '0px';
        } else {
          subCards.style.maxHeight = subCards.scrollHeight + 'px';
        }
      }
    });
  }

  // 支委子链接点击 → 导航
  sidebar.querySelectorAll('.commissioner-sub-link[data-role]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const role = link.dataset.role;
      _selectRole(sidebar, activeModule, role, link);
    });
    // hover 效果
    link.addEventListener('mouseenter', () => { link.style.background = 'var(--neutral-100)'; link.style.color = 'var(--neutral-800)'; });
    link.addEventListener('mouseleave', () => { link.style.background = ''; link.style.color = 'var(--neutral-500)'; });
  });

  // 普通角色卡片点击
  sidebar.querySelectorAll('.role-card[data-role]:not([data-role="commissioner-group"])').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      _selectRole(sidebar, activeModule, role, card);
    });
  });

  // 监听站位变更事件，重新渲染侧边栏
  document.addEventListener('permission:stance-change', (e) => {
    if (e.detail.module !== activeModule) return;
    const newStance = e.detail.stance;

    // 检查当前视图是否在新站位的可选范围内
    const currentView = AuthStore.getActiveRole(activeModule);
    const viewOptions = AuthStore.getViewOptions(newStance, activeModule);

    if (currentView && !viewOptions.includes(currentView)) {
      // 当前视图不在可选范围内，重置为站位本身
      AuthStore.setActiveRole(activeModule, newStance);
      _saveRole(activeModule, newStance);
    }

    renderSidebar(activeModule);
  });
}
