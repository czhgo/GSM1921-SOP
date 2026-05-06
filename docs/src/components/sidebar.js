// role: [人机]
// components/sidebar.js — 共享侧边栏（角色卡片 + 模式由 header 统一控制）

import { AuthStore, ViewModeStore } from '../service.auth.js';

const NAV_ITEMS = [
  { module: 'dashboard', label: '主页', href: './index.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { module: 'workspace', label: '党建工作台', href: './workspace.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { module: 'party', label: '党务管理', href: './party.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { module: 'archive', label: '归档库', href: './archive.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' },
  { module: 'search', label: '资料查询', href: './search.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
  { module: 'feedback', label: '意见反馈', href: './feedback.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
];

const ROLE_CARDS = {
  workspace: [
    { role: 'leader', label: '党小组组长', desc: '党小组活动统筹', cls: 'leader-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' },
    { role: 'commissioner-group', label: '条条支委', desc: '组织/宣传/纪检', cls: 'commissioner-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { role: 'organizer', label: '活动组织者', desc: '策划执行督办', cls: 'organizer-card', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>' },
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

  const navHTML = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}">
      ${item.icon}
      <span class="font-title-cn">${item.label}</span>
    </a>
  `).join('');

  const roleCards = ROLE_CARDS[activeModule] || [];
  const roleHTML = roleCards.length > 0 ? `
    <div class="sidebar-divider"></div>
    <div class="role-cards-container space-y-2">
      ${roleCards.map(card => `
        <button class="role-card ${card.cls} ${savedRole === card.role ? 'active' : ''}" data-role="${card.role}" aria-label="${card.label}">
          <div class="role-card-left"><div class="role-icon">${card.icon}</div></div>
          <div class="role-card-content"><span class="role-card-title">${card.label}</span><span class="role-card-desc">${card.desc}</span></div>
        </button>
      `).join('')}
    </div>
  ` : '';

  sidebar.innerHTML = `
    <nav class="sidebar-nav">
      <div class="flex flex-col gap-2 mb-2">${navHTML}</div>
      ${roleHTML}
    </nav>
    <div class="sidebar-footer">
      <a href="./about.html" class="module-tab" style="border:none;justify-content:flex-start;gap:8px;padding:6px 8px;font-size:0.75rem;color:var(--neutral-400);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>关于</span>
      </a>
    </div>
  `;

  _bindRoleCardClicks(sidebar, activeModule);

  if (savedRole) {
    const savedMode = ViewModeStore.getMode(activeModule);
    document.dispatchEvent(new CustomEvent('sidebar:role-restore', {
      detail: { role: savedRole, module: activeModule, mode: savedMode },
      bubbles: true,
    }));
  }
}

function _selectRole(sidebar, activeModule, role, cardEl) {
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');
  _saveRole(activeModule, role);

  const currentMode = ViewModeStore.getMode(activeModule);
  const canManage = ViewModeStore.canManage(activeModule, role);
  const mode = canManage ? currentMode : 'observe';

  document.dispatchEvent(new CustomEvent('sidebar:role-select', {
    detail: { role, module: activeModule, mode },
    bubbles: true,
  }));

  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('visible');
  sidebar.classList.add('sidebar-collapsed');
}

function _bindRoleCardClicks(sidebar, activeModule) {
  sidebar.querySelectorAll('.role-card[data-role]').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      _selectRole(sidebar, activeModule, role, card);
    });
  });
}
