// role: [工程师]+[AI]
// components/header.js — 共享顶栏组件（重构版）
// 变化: 去掉 mode 标签，改为当前身份标签 + 只读切换下拉

import { AuthStore } from '../services/auth.js';
import { getAccentColors, ROLE_LABELS } from '../core/constants.js';
import { NoticeStore } from '../services/notice.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';

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
    <div class="role-label" id="role-label" style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:var(--radius-sm);background:${accent};border:none;">
      <span class="text-xs font-medium" style="color:#FFFFFF;">${text}</span>
    </div>
  `;
}

function _viewSwitcherHTML(role, user) {
  if (!user) return '';

  // ── 组1：切换工作台身份（有独立页面的身份） ──
  const workspaces = [];
  // 1a. 常设角色对应工作台（排除 participant，因为 participant 默认就是首页）
  const standingPage = AuthStore.getPageForRole('workspace', role);
  if (standingPage && role !== 'participant') {
    workspaces.push({
      type: 'workspace',
      role,
      label: ROLE_LABELS[role] || role,
      href: getBasePath() + 'workspace/' + standingPage,
      isCurrent: true,
    });
  }
  // 1b. 党小组组长（如有赋权且非当前常设角色）
  const authRecords = AuthStore.getAuthorizations();
  const hasLeaderAuth = authRecords.some(r => r.targetPersonId === user.personId && r.role === 'leader');
  if (hasLeaderAuth && role !== 'leader') {
    workspaces.push({
      type: 'workspace',
      role: 'leader',
      label: '党小组组长工作台',
      href: getBasePath() + 'workspace/leader.html',
      isCurrent: false,
    });
  }

  // ── 组2：查看视角（仅支委可见，移除 organizer/deep 死代码后只剩 leader） ──
  const viewableRoles = (AuthStore.getViewableRoles(role) || []).filter(r => r === 'leader');
  const currentView = AuthStore.getViewRole();
  const views = viewableRoles.map(r => ({
    type: 'view',
    role: r,
    label: `${ROLE_LABELS[r] || r} 视角`,
    isCurrent: r === currentView,
  }));
  // 增加"取消视角"项（当前处于视角时显示）
  if (currentView) {
    views.push({
      type: 'view',
      role: '',
      label: '取消视角',
      isCurrent: false,
    });
  }

  // 两组都为空时隐藏按钮（单一身份的普通参与者）
  if (workspaces.length === 0 && views.length === 0) return '';

  // 渲染分组
  let groupsHTML = '';
  if (workspaces.length > 0) {
    groupsHTML += `
      <div style="padding:6px 12px;color:var(--neutral-400);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;" class="text-[10px]">切换工作台</div>
      ${workspaces.map(w => `
        <a href="${w.href}" data-ws-role="${w.role}" class="view-option text-body-sm" data-type="workspace" style="position:relative;display:flex;align-items:center;gap:6px;padding:8px 12px;cursor:pointer;color:var(--neutral-800);transition:background 0.15s;text-decoration:none;">
          ${w.isCurrent ? '<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>' : ''}
          <span>${w.label}</span>
          ${w.isCurrent ? '<span style="margin-left:auto;color:var(--neutral-400);" class="text-[10px]">当前</span>' : ''}
        </a>
      `).join('')}
    `;
  }
  if (views.length > 0) {
    if (workspaces.length > 0) {
      groupsHTML += '<div style="height:1px;background:#F3F4F6;margin:4px 0;"></div>';
    }
    groupsHTML += `
      <div style="padding:6px 12px;color:var(--neutral-400);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;" class="text-[10px]">查看视角</div>
      ${views.map(v => `
        <div class="view-option text-body-sm" data-type="view" data-role="${v.role}" style="position:relative;padding:8px 12px;cursor:pointer;color:var(--neutral-800);transition:background 0.15s;">
          ${v.isCurrent ? '<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>' : ''}
          <span>${v.label}</span>
          ${v.isCurrent ? '<span style="margin-left:auto;color:var(--neutral-400);" class="text-[10px]">当前</span>' : ''}
        </div>
      `).join('')}
    `;
  }

  return `
    <div id="view-switcher" style="position:relative;">
      <button id="view-switcher-btn" style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);color:#FFFFFF;cursor:pointer;transition:background 0.15s;white-space:nowrap;" class="text-body-sm">
        <span>我的视角</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style="flex-shrink:0;"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div id="view-switcher-panel" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;min-width:200px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);background:var(--surface-card);color:var(--neutral-800);overflow:hidden;z-index:100;border:1px solid #E5E7EB;">
        ${groupsHTML}
      </div>
    </div>
  `;
}

function _notificationBellHTML() {
  // 只统计未过期的未读通知，与 index 首页通知栏数据一致
  const activeNotices = NoticeStore.list({ activeOnly: true });
  const unread = activeNotices.filter(n => !n.read).length;
  const badge = unread > 0
    ? `<span style="position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:9999px;background:var(--party-gold);border:1.5px solid var(--primary-900);font-weight:600;color:#7A0010;display:flex;align-items:center;justify-content:center;padding:0 4px;" class="text-[10px]">${unread > 9 ? '9+' : unread}</span>`
    : '';

  return `
    <div id="notification-bell" style="position:relative;">
      <button id="notif-btn" style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${icon('bell', { stroke: '#FFFFFF', className: 'w-4 h-4' })}
        ${badge}
      </button>
      <div id="notif-dropdown" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;width:320px;background:white;border-radius:var(--radius-sm);box-shadow:var(--shadow-dropdown);z-index:100;overflow:hidden;border:1px solid #E5E7EB;"></div>
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
        ${_viewSwitcherHTML(role, user)}
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
  const btn = header.querySelector('#view-switcher-btn');
  const panel = header.querySelector('#view-switcher-panel');
  if (!btn || !panel) return;

  // 点击触发按钮展开/收起
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  // hover 效果
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(255,255,255,0.2)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(255,255,255,0.1)';
  });

  // 点击选项项（区分 workspace 跳转 和 view 视角切换）
  panel.querySelectorAll('.view-option').forEach(opt => {
    opt.addEventListener('mouseenter', () => {
      opt.style.background = 'var(--surface-hover)';
    });
    opt.addEventListener('mouseleave', () => {
      const isSelected = opt.dataset.type === 'view' && opt.dataset.role === AuthStore.getViewRole();
      opt.style.background = isSelected ? 'var(--surface-hover)' : 'transparent';
    });
    opt.addEventListener('click', (e) => {
      const type = opt.dataset.type;
      if (type === 'workspace') {
        // workspace 类型：<a> 标签会自动跳转，这里只需关闭面板
        e.stopPropagation();
        panel.classList.add('hidden');
        return;
      }
      // view 类型：切换只读视角
      e.stopPropagation();
      e.preventDefault();
      const targetRole = opt.dataset.role;
      const prevRole = AuthStore.getViewRole();
      if (targetRole) {
        AuthStore.switchView(targetRole);
      } else {
        AuthStore.clearView();
      }
      document.dispatchEvent(new CustomEvent('view-role-change', {
        detail: { viewRole: targetRole || '', prevRole }
      }));
      _rerenderRoleLabel();
      panel.classList.add('hidden');
      _refreshViewSwitcherSelection(panel);
    });
  });

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
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

// 刷新自定义下拉的选中态（仅 view 类型有选中态；workspace 类型选中态在渲染时固定）
function _refreshViewSwitcherSelection(panel) {
  const currentView = AuthStore.getViewRole();
  panel.querySelectorAll('.view-option[data-type="view"]').forEach(opt => {
    const r = opt.dataset.role;
    const isSelected = r === currentView && r !== '';
    // "取消视角"项在已有视角时高亮
    const isCancelActive = r === '' && currentView !== '';
    const highlight = isSelected || isCancelActive;
    // 更新左侧竖条
    const existingBar = opt.querySelector('span[style*="party-gold"]');
    if (highlight && !existingBar) {
      const bar = document.createElement('span');
      bar.style.cssText = 'position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;';
      opt.prepend(bar);
    } else if (!highlight && existingBar) {
      existingBar.remove();
    }
    opt.style.background = highlight ? 'var(--surface-hover)' : 'transparent';
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
      const notices = NoticeStore.list({ activeOnly: true, sortBy: 'date' });
      if (notices.length === 0) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:#9CA3AF;" class="text-sm">暂无通知</div>';
        return;
      }

      const priorityBadge = {
        urgent: '<span style="display:inline-block;padding:1px 6px;font-weight:500;border-radius:9999px;background:#FEE2E2;color:#B91C1C;" class="text-[10px]">紧急</span>',
        normal: '<span style="display:inline-block;padding:1px 6px;font-weight:500;border-radius:9999px;background:#DBEAFE;color:#1D4ED8;" class="text-[10px]">重要</span>',
      };

      dropdown.innerHTML = notices.slice(0, 10).map(n => `
        <div class="notif-dropdown-item" data-notice-id="${n.id}" data-target="${n.targetModule || ''}" data-target-url="${n.targetUrl || ''}"
             style="padding:12px;border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background 0.15s;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            ${priorityBadge[n.priority] || ''}
            <p style="color:#374151;margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" class="text-body-sm">${n.title || n.content}</p>
            ${!n.read ? `<button class="notif-mark-read text-[10px]" data-notice-id="${n.id}" style="color:#2563EB;background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.15s;flex-shrink:0;" onmouseenter="this.style.background='#EFF6FF'" onmouseleave="this.style.background='none'">已读</button>` : ''}
          </div>
          <p style="color:#9CA3AF;margin:0;" class="text-[11px]">${n.publishDate || n.date || ''}</p>
        </div>
      `).join('');

      // 绑定"已读"按钮：stopPropagation 防止触发外层跳转
      dropdown.querySelectorAll('.notif-mark-read').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = btn.dataset.noticeId;
          if (id) {
            NoticeStore.markRead(id);
            // 视觉反馈：标题变浅 + 移除按钮
            const item = btn.closest('.notif-dropdown-item');
            const titleP = item?.querySelector('p[style*="color:#374151"]');
            if (titleP) titleP.style.color = '#9CA3AF';
            btn.remove();
          }
        });
      });

      // 绑定点击：标记已读 + 跳转
      // 优先级：有 targetUrl 时直接跳 targetUrl（赋权通知等），否则跳通知详情页
      dropdown.querySelectorAll('.notif-dropdown-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
          item.style.background = '#F9FAFB';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = item.dataset.noticeId;
          const targetUrl = item.dataset.targetUrl;
          if (id) NoticeStore.markRead(id);
          // 视觉反馈：点击后标题颜色变浅
          const titleP = item.querySelector('p[style*="color:#374151"]');
          if (titleP) titleP.style.color = '#9CA3AF';
          // 跳转（短暂延迟让用户看到视觉反馈）
          setTimeout(() => {
            const path = window.location.pathname;
            const basePath = path.includes('/workspace/') ? '../' : '';
            const finalUrl = targetUrl
              ? basePath + targetUrl
              : `${basePath}notice.html?id=${id}`;
            window.location.href = finalUrl;
          }, 150);
        });
      });
    }
  });

  // 点击外部关闭下拉
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // ESC 关闭下拉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
    }
  });
}