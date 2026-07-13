// role: [工程师]+[AI]
// components/header.js — 共享顶栏组件（重构版）
// 变化: 去掉 mode 标签，改为当前身份标签 + 只读切换下拉

import { AuthStore } from '../services/auth.js';
import { getAccentColors, ROLE_LABELS } from '../core/constants.js';
import { NoticeStore } from '../services/notice.js';
import { getBasePath } from '../core/utils.js';

function _roleLabelHTML(role) {
  if (!role) return '';
  const { accent } = getAccentColors(role);
  const label = ROLE_LABELS[role] || role;
  const viewRole = AuthStore.getViewRole();

  let text = label;
  if (viewRole) {
    const viewLabel = ROLE_LABELS[viewRole] || viewRole;
    text = `${label} · 查看 ${viewLabel}`;
  }

  return `
    <div class="role-label" id="role-label" style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:4px;background:${accent};border:none;">
      <span class="text-xs font-medium" style="color:#FFFFFF;">${text}</span>
    </div>
  `;
}

function _viewSwitcherHTML(role) {
  const viewableRoles = AuthStore.getViewableRoles(role);
  if (viewableRoles.length === 0) return '';

  const currentView = AuthStore.getViewRole();
  const options = viewableRoles.map(r => {
    const selected = r === currentView ? 'selected' : '';
    return `<option value="${r}" ${selected}>${ROLE_LABELS[r] || r}</option>`;
  }).join('');

  return `
    <select id="view-switcher" class="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
      <option value="">我的视角</option>
      ${options}
    </select>
  `;
}

function _notificationBellHTML() {
  const notices = NoticeStore.getAll();
  const unread = notices.filter(n => !n.read).length;
  const badge = unread > 0
    ? `<span style="position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:var(--party-gold);border:1.5px solid var(--primary-900);"></span>`
    : '';

  return `
    <div id="notification-bell" style="position:relative;">
      <button id="notif-btn" style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        ${badge}
      </button>
      <div id="notif-dropdown" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;width:320px;background:white;border-radius:8px;box-shadow:var(--shadow-dropdown);z-index:100;overflow:hidden;border:1px solid #E5E7EB;"></div>
    </div>
  `;
}

export function renderHeader(activeModule) {
  const header = document.getElementById('app-header');
  if (!header) return;

  const user = AuthStore.getCurrentUser();
  const role = user?.role || '';

  header.innerHTML = `
    <div class="header-content">
      <button id="hamburger-btn" aria-label="打开导航菜单" class="hamburger-btn">
        <span></span><span></span><span></span>
      </button>
      <div class="party-emblem-wrapper">
        <img src="${getBasePath()}assets/images/party_emblem.png" alt="党徽" class="party-emblem" draggable="false" onerror="this.style.display='none';">
      </div>
      <div class="header-title">
        <h1 class="font-title-cn">光华管理学院本科生党支部管理引擎</h1>
      </div>
      <div class="header-actions" style="display:flex;align-items:center;gap:8px;">
        ${_roleLabelHTML(role)}
        ${_viewSwitcherHTML(role)}
        ${_notificationBellHTML()}
      </div>
    </div>
  `;

  _bindHamburger(header);
  _bindNotificationBell(header);
  _bindViewSwitcher(header);
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

function _bindViewSwitcher(header) {
  const switcher = header.querySelector('#view-switcher');
  if (!switcher) return;

  switcher.addEventListener('change', (e) => {
    const targetRole = e.target.value;
    const prevRole = AuthStore.getViewRole();
    if (targetRole) {
      AuthStore.switchView(targetRole);
    } else {
      AuthStore.clearView();
    }
    // 派发事件，sidebar 自身订阅并 re-render（不 reload）
    document.dispatchEvent(new CustomEvent('view-role-change', {
      detail: { viewRole: targetRole || '', prevRole }
    }));
    // 顶栏角色标签自身也需要更新
    _rerenderRoleLabel();
  });
}

// 重新渲染顶栏角色标签（不重载整个 header）
function _rerenderRoleLabel() {
  const user = AuthStore.getCurrentUser();
  const role = user?.role || '';
  const labelEl = document.getElementById('role-label');
  if (!labelEl) return;
  // 复用 _roleLabelHTML 逻辑，仅更新 text
  const label = ROLE_LABELS[role] || role;
  const viewRole = AuthStore.getViewRole();
  let text = label;
  if (viewRole) {
    const viewLabel = ROLE_LABELS[viewRole] || viewRole;
    text = `${label} · 查看 ${viewLabel}`;
  }
  const span = labelEl.querySelector('span');
  if (span) span.textContent = text;
}

function _bindNotificationBell(header) {
  const btn = header.querySelector('#notif-btn');
  const dropdown = header.querySelector('#notif-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      const notices = NoticeStore.getAll();
      dropdown.innerHTML = notices.length === 0
        ? '<div style="padding:16px;text-align:center;color:#9CA3AF;font-size:14px;">暂无通知</div>'
        : notices.slice(0, 10).map(n => `
            <div style="padding:12px;border-bottom:1px solid #F3F4F6;">
              <p style="font-size:13px;color:#374151;margin-bottom:4px;">${n.title || n.content}</p>
              <p style="font-size:11px;color:#9CA3AF;">${n.date || ''}</p>
            </div>
          `).join('')
      ;
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
