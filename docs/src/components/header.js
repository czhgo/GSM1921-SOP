// role: [人机]
// components/header.js — 共享顶栏组件（全局角色切换器 + 模式切换）

import { AuthStore, ViewModeStore, ROLE_LABELS } from '../services/auth.js';
import { NoticeStore } from '../services/notice.js';

const MODULE_VIEW_MODES = ['workspace', 'party'];

function _roleSwitcherHTML(module) {
  if (!MODULE_VIEW_MODES.includes(module)) return '';
  const primary = AuthStore.getPrimaryRole();
  const active = AuthStore.getActiveRole(module);
  const displayRole = active || primary;
  const label = displayRole ? ROLE_LABELS[displayRole] || displayRole : '选择角色';
  const category = AuthStore.getViewCategory(primary, active);
  const bg = category === 'manage' ? '#1F2937' : '#4B5563';
  const prefix = category === 'manager-observe' ? '查看: ' : (category === 'manage' ? '' : '');

  return `
    <div class="role-switcher" id="role-switcher" style="position:relative;">
      <button id="role-switcher-btn" style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:4px;background:${bg};border:none;cursor:pointer;">
        <span class="text-xs font-medium" id="role-switcher-label" style="color:#FFFFFF;">${prefix}${label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="role-switcher-dropdown hidden" id="role-switcher-dropdown" style="position:absolute;top:calc(100% + 4px);right:0;min-width:220px;background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:100;overflow:hidden;border:1px solid #E5E7EB;"></div>
    </div>
  `;
}

function _modeSwitcherHTML(module) {
  if (!MODULE_VIEW_MODES.includes(module)) return '';
  const primary = AuthStore.getPrimaryRole();
  const active = AuthStore.getActiveRole(module);
  const category = AuthStore.getViewCategory(primary, active);

  if (category === 'manager-observe') {
    return `
      <div class="view-mode-switcher" id="view-mode-switcher" style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:4px;background:#6B7280;border:none;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="text-xs font-medium" id="view-mode-badge" style="color:#FFFFFF;">只读</span>
      </div>
    `;
  }

  if (!primary) return '';

  const mode = ViewModeStore.getMode(module);
  const label = mode === 'manage' ? '管理模式' : '只读模式';
  const bg = mode === 'manage' ? '#CE1126' : '#4B5563';

  return `
    <div class="view-mode-switcher" id="view-mode-switcher" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:5px 12px;border-radius:4px;background:${bg};border:none;">
      <span class="text-xs font-medium" id="view-mode-badge" style="color:#FFFFFF;">${label}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  `;
}

function _notificationBellHTML() {
  const notices = NoticeStore.getAll();
  const unread = notices.filter(n => !n.read).length;
  const badge = unread > 0
    ? `<span id="notif-badge" style="position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:#D4AF37;border:1.5px solid #7A0010;"></span>`
    : '';

  return `
    <div id="notification-bell" style="position:relative;">
      <button id="notif-btn" style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        ${badge}
      </button>
      <div id="notif-dropdown" class="hidden" style="position:absolute;top:calc(100% + 8px);right:0;width:320px;background:white;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:100;overflow:hidden;border:1px solid #E5E7EB;"></div>
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
      <div class="header-actions" style="display:flex;align-items:center;gap:8px;">
        ${_roleSwitcherHTML(activeModule)}
        ${_modeSwitcherHTML(activeModule)}
        ${_notificationBellHTML()}
      </div>
    </div>
  `;

  _bindHamburger(header);
  _bindNotificationBell(header);
  if (MODULE_VIEW_MODES.includes(activeModule)) {
    _bindRoleSwitcher(header, activeModule);
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

function _populateDropdown(dropdown, module) {
  const primary = AuthStore.getPrimaryRole();
  const active = AuthStore.getActiveRole(module);
  const moduleRoles = AuthStore.getModuleRoles(module);
  const visibleRoles = AuthStore.getVisibleRoles(primary);

  let html = '';

  if (primary) {
    html += `<div style="padding:8px 12px 4px;font-size:10px;color:#9CA3AF;font-weight:600;letter-spacing:0.05em;">我的身份</div>`;
    html += _roleItemHTML(primary, primary === active, false, module);
  }

  const viewableInModule = moduleRoles.filter(r => r !== primary && visibleRoles.includes(r));
  if (viewableInModule.length > 0) {
    html += `<div style="padding:8px 12px 4px;font-size:10px;color:#9CA3AF;font-weight:600;letter-spacing:0.05em;${primary ? 'border-top:1px solid #F3F4F6;margin-top:4px;' : ''}">可查看</div>`;
    viewableInModule.forEach(r => {
      html += _roleItemHTML(r, r === active, true, module);
    });
  }

  const otherRoles = moduleRoles.filter(r => r !== primary && !visibleRoles.includes(r));
  if (otherRoles.length > 0 && !primary) {
    html += `<div style="padding:8px 12px 4px;font-size:10px;color:#9CA3AF;font-weight:600;letter-spacing:0.05em;">选择身份</div>`;
    otherRoles.forEach(r => {
      html += _roleItemHTML(r, r === active, false, module);
    });
  }

  if (primary) {
    html += `<div style="border-top:1px solid #F3F4F6;margin-top:4px;">`;
    html += `<button class="role-dropdown-item" data-action="reset" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;background:none;cursor:pointer;font-size:0.75rem;color:#EF4444;text-align:left;">切换身份</button>`;
    html += `</div>`;
  }

  dropdown.innerHTML = html;
}

function _roleItemHTML(role, isActive, isReadOnly, module) {
  const label = ROLE_LABELS[role] || role;
  const activeBg = isActive ? '#F3F4F6' : 'transparent';
  const activeFont = isActive ? 'font-weight:600;color:#111827;' : 'color:#374151;';
  const badge = isReadOnly
    ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FEF3C7;color:#D97706;">只读</span>`
    : (isActive && AuthStore.getPrimaryRole() === role ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FEE2E2;color:#CE1126;">管理</span>` : '');

  return `<button class="role-dropdown-item" data-role="${role}" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 12px;border:none;background:${activeBg};cursor:pointer;font-size:0.75rem;${activeFont}text-align:left;">${label}${badge}</button>`;
}

function _bindRoleSwitcher(header, module) {
  const btn = header.querySelector('#role-switcher-btn');
  const dropdown = header.querySelector('#role-switcher-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      _populateDropdown(dropdown, module);
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.add('hidden');
    }
  });

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.role-dropdown-item');
    if (!item) return;

    const role = item.dataset.role;
    const action = item.dataset.action;

    if (action === 'reset') {
      AuthStore.setPrimaryRole('');
      AuthStore.setActiveRole(module, '');
      ViewModeStore.setMode(module, 'observe');
      dropdown.classList.add('hidden');
      renderHeader(module);
      document.dispatchEvent(new CustomEvent('header:role-switch', {
        detail: { role: '', module, category: 'visitor-observe' },
        bubbles: true,
      }));
      return;
    }

    if (!role) return;

    const primary = AuthStore.getPrimaryRole();
    const visibleRoles = AuthStore.getVisibleRoles(primary);

    if (!primary) {
      AuthStore.setPrimaryRole(role);
      AuthStore.setActiveRole(module, role);
      ViewModeStore.setMode(module, 'manage');
    } else if (role === primary) {
      AuthStore.setActiveRole(module, role);
      ViewModeStore.setMode(module, 'manage');
    } else if (visibleRoles.includes(role)) {
      AuthStore.setActiveRole(module, role);
    } else {
      AuthStore.setPrimaryRole(role);
      AuthStore.setActiveRole(module, role);
      ViewModeStore.setMode(module, 'manage');
    }

    dropdown.classList.add('hidden');
    renderHeader(module);

    const newPrimary = AuthStore.getPrimaryRole();
    const newActive = AuthStore.getActiveRole(module);
    const category = AuthStore.getViewCategory(newPrimary, newActive);

    document.dispatchEvent(new CustomEvent('header:role-switch', {
      detail: { role: newActive, primaryRole: newPrimary, module, category },
      bubbles: true,
    }));
  });
}

function _bindViewSwitcher(header, module) {
  const switcher = header.querySelector('#view-mode-switcher');
  if (!switcher) return;

  const primary = AuthStore.getPrimaryRole();
  const active = AuthStore.getActiveRole(module);
  const category = AuthStore.getViewCategory(primary, active);

  if (category === 'manager-observe') return;

  if (!primary) return;

  switcher.style.cursor = 'pointer';
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
    const role = e.detail.role;
    if (!role) return;

    const primary = AuthStore.getPrimaryRole();
    if (!primary) {
      AuthStore.setPrimaryRole(role);
    }
    AuthStore.setActiveRole(module, role);

    const canManage = ViewModeStore.canManage(module, role);
    if (canManage) {
      ViewModeStore.setMode(module, 'manage');
    }

    renderHeader(module);
  });

  document.addEventListener('sidebar:role-restore', (e) => {
    if (e.detail.module !== module) return;
    const role = e.detail.role;
    if (!role) return;

    const primary = AuthStore.getPrimaryRole();
    if (!primary) {
      AuthStore.setPrimaryRole(role);
    }
    AuthStore.setActiveRole(module, role);

    renderHeader(module);
  });
}

function _bindNotificationBell(header) {
  const btn = header.querySelector('#notif-btn');
  const dropdown = header.querySelector('#notif-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      _populateNotifDropdown(dropdown);
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  document.addEventListener('notice:new', () => {
    _refreshBadge(header);
  });
}

function _populateNotifDropdown(dropdown) {
  const notices = NoticeStore.getAll();
  const priorityOrder = { urgent: 0, normal: 1, low: 2 };
  const sorted = [...notices].sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  if (sorted.length === 0) {
    dropdown.innerHTML = `
      <div style="padding:24px 16px;text-align:center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5" style="margin:0 auto 8px;display:block;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <p style="font-size:0.75rem;color:#9CA3AF;">暂无通知</p>
      </div>
    `;
    return;
  }

  const priorityColors = { urgent: '#CE1126', normal: '#3B82F6', low: '#6B7280' };
  const priorityLabels = { urgent: '紧急', normal: '一般', low: '低' };

  dropdown.innerHTML = `
    <div style="padding:10px 14px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.8rem;font-weight:600;color:#111827;">通知</span>
      <button id="notif-mark-all" style="font-size:0.65rem;color:#3B82F6;background:none;border:none;cursor:pointer;">全部已读</button>
    </div>
    <div style="max-height:320px;overflow-y:auto;">
      ${sorted.map(n => {
        const color = priorityColors[n.priority] || '#6B7280';
        const label = priorityLabels[n.priority] || '一般';
        const readClass = n.read ? 'opacity:0.6;' : '';
        return `
          <div class="notif-item" data-id="${n.id}" style="padding:10px 14px;border-bottom:1px solid #F9FAFB;cursor:pointer;transition:background 0.1s;${readClass}" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
              <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${color}15;color:${color};font-weight:500;">${label}</span>
              <span style="font-size:0.65rem;color:#9CA3AF;">${n.publishDate || ''}</span>
            </div>
            <div style="font-size:0.75rem;color:#111827;font-weight:500;margin-bottom:2px;">${n.title || ''}</div>
            <div style="font-size:0.7rem;color:#6B7280;line-height:1.4;">${n.content || ''}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  dropdown.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      NoticeStore.markRead(id);
      item.style.opacity = '0.6';
      _refreshBadge(header);
    });
  });

  const markAllBtn = dropdown.querySelector('#notif-mark-all');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      NoticeStore.markAllRead();
      dropdown.querySelectorAll('.notif-item').forEach(i => i.style.opacity = '0.6');
      _refreshBadge(header);
    });
  }
}

function _refreshBadge(header) {
  const badge = header.querySelector('#notif-badge');
  if (!badge) return;
  const notices = NoticeStore.getAll();
  const unread = notices.filter(n => !n.read).length;
  if (unread > 0) {
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}
