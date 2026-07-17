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

function _viewSwitcherHTML(role) {
  const viewableRoles = AuthStore.getViewableRoles(role);
  if (viewableRoles.length === 0) return '';

  const currentView = AuthStore.getViewRole();

  const optionItems = viewableRoles.map(r => {
    const isSelected = r === currentView;
    const activeBar = isSelected
      ? `<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>`
      : '';
    const selectedBg = isSelected ? 'background:rgba(255,255,255,0.08);' : '';
    return `<div class="view-option" data-role="${r}" style="position:relative;padding:8px 12px;cursor:pointer;color:#FFFFFF;font-size:13px;transition:background 0.15s;${selectedBg}">${activeBar}<span>${ROLE_LABELS[r] || r}</span></div>`;
  }).join('');

  return `
    <div id="view-switcher" style="position:relative;">
      <button id="view-switcher-btn" style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);color:#FFFFFF;font-size:13px;cursor:pointer;transition:background 0.15s;white-space:nowrap;">
        <span>我的视角</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style="flex-shrink:0;"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div id="view-switcher-panel" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;width:180px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);background:#1F2937;color:#FFFFFF;overflow:hidden;z-index:100;">
        ${optionItems}
      </div>
    </div>
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
      <button id="notif-btn" style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${icon('bell', { size: 16, stroke: '#FFFFFF' })}
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

  // 点击选项项
  panel.querySelectorAll('.view-option').forEach(opt => {
    opt.addEventListener('mouseenter', () => {
      opt.style.background = 'rgba(255,255,255,0.1)';
    });
    opt.addEventListener('mouseleave', () => {
      // 选中项保持高亮背景
      const isSelected = opt.dataset.role === AuthStore.getViewRole();
      opt.style.background = isSelected ? 'rgba(255,255,255,0.08)' : 'transparent';
    });
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetRole = opt.dataset.role;
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
      // 收起面板并刷新选中态
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

// 刷新自定义下拉的选中态（左侧竖条 + 背景高亮）
function _refreshViewSwitcherSelection(panel) {
  const currentView = AuthStore.getViewRole();
  panel.querySelectorAll('.view-option').forEach(opt => {
    const r = opt.dataset.role;
    const isSelected = r === currentView;
    // 更新左侧竖条
    const existingBar = opt.querySelector('span[style*="party-gold"]');
    if (isSelected && !existingBar) {
      const bar = document.createElement('span');
      bar.style.cssText = 'position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;';
      opt.prepend(bar);
    } else if (!isSelected && existingBar) {
      existingBar.remove();
    }
    // 更新背景
    opt.style.background = isSelected ? 'rgba(255,255,255,0.08)' : 'transparent';
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

function _buildNoticeTargetUrl(target, id) {
  // 所有通知跳转首页（index.html），因为首页/日历是全员可访问的公共页面
  // 不跳任何管理页面——考虑最广大的支部成员使用
  const path = window.location.pathname;
  const basePath = path.includes('/workspace/') || path.includes('/party/') ? '../' : '';
  return `${basePath}index.html?notice=${id}`;
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
      if (notices.length === 0) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:#9CA3AF;font-size:14px;">暂无通知</div>';
        return;
      }

      const priorityBadge = {
        urgent: '<span style="display:inline-block;padding:1px 6px;font-size:10px;font-weight:500;border-radius:9999px;background:#FEE2E2;color:#B91C1C;">紧急</span>',
        normal: '<span style="display:inline-block;padding:1px 6px;font-size:10px;font-weight:500;border-radius:9999px;background:#DBEAFE;color:#1D4ED8;">一般</span>',
        low:    '<span style="display:inline-block;padding:1px 6px;font-size:10px;font-weight:500;border-radius:9999px;background:#F3F4F6;color:#4B5563;">低优</span>',
      };

      dropdown.innerHTML = notices.slice(0, 10).map(n => `
        <div class="notif-dropdown-item" data-notice-id="${n.id}" data-target="${n.targetModule || ''}"
             style="padding:12px;border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background 0.15s;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            ${priorityBadge[n.priority] || ''}
            <p style="font-size:13px;color:#374151;margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.title || n.content}</p>
          </div>
          <p style="font-size:11px;color:#9CA3AF;margin:0;">${n.publishDate || n.date || ''}</p>
        </div>
      `).join('');

      // 绑定点击：标记已读 + 跳转目标模块
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
          const target = item.dataset.target;
          if (id) NoticeStore.markRead(id);
          // 视觉反馈：点击后标题颜色变浅
          const titleP = item.querySelector('p[style*="color:#374151"]');
          if (titleP) titleP.style.color = '#9CA3AF';
          // 跳转首页（短暂延迟让用户看到视觉反馈）
          if (target) {
            setTimeout(() => {
              window.location.href = _buildNoticeTargetUrl(target, id);
            }, 150);
          }
        });
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
