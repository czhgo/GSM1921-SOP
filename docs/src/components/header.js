﻿// role: [工程师]+[AI]
// components/header.js — 共享顶栏组件（重构版）
// 变化: 去掉 mode 标签与只读视角切换，仅保留身份标签 + 工作台切换下拉

import { AuthStore } from '../services/auth.js?v=20260808g';
import { getAccentColors, resolveAccentRole, ROLE_LABELS } from '../core/constants.js?v=20260808g';
import { NoticeStore, resolveNoticeUrl } from '../services/notice.js?v=20260808g';
import { getBasePath } from '../core/utils.js?v=20260808g';
import { icon } from '../core/icons.js?v=20260808g';
import { DATA_CHANGED_EVENT, DATA_LOADED_EVENT } from '../core/data-adapter.js?v=20260808g';
import { badgeHtml } from './badge.js?v=20260808g';

// 数据变更订阅（2026-08-05，消除"确认已读后角标不更新"）：
// 模块顶层绑定一次；_renderNotificationBadge 在 #notification-bell 未渲染时静默返回。
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener(DATA_CHANGED_EVENT, _renderNotificationBadge);
  document.addEventListener(DATA_LOADED_EVENT, _renderNotificationBadge);
}

/**
 * 即时刷新通知角标（只更新角标 DOM，不整页重渲染）
 * 数据变更（markRead/markAllRead/add/remove）或 loadDB 完成后调用，
 * 修复角标停留在 seed 快照/点击已读后不更新的问题。
 */
function _renderNotificationBadge() {
  const bell = document.getElementById('notification-bell');
  if (!bell) return;
  const old = bell.querySelector('#notif-badge');
  if (old) old.remove();
  // 只统计未过期的未读通知，与 index 首页通知栏数据一致
  const activeNotices = NoticeStore.list({ activeOnly: true });
  const unread = activeNotices.filter(n => !n.read).length;
  if (unread > 0) {
    const badge = document.createElement('span');
    badge.id = 'notif-badge';
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.style.cssText = 'position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:9999px;background:var(--party-gold);border:1.5px solid var(--primary-900);font-weight:600;color:#7A0010;display:flex;align-items:center;justify-content:center;padding:0 4px;';
    badge.classList.add('text-xs');
    bell.appendChild(badge);
  }
}

function _roleLabelHTML(role) {
  if (!role) return '';
  // 普通参与者默认无标记：没有标记就是普通参与者的标记（书记 2026-08-01 决策）
  if (role === 'participant') return '';
  const { accent } = getAccentColors(resolveAccentRole(role));
  const label = ROLE_LABELS[role] || role;

  return `
    <div class="role-label" id="role-label" style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:var(--radius-sm);background:${accent};border:none;">
      <span class="text-xs font-medium" style="color:#FFFFFF;">${label}</span>
    </div>
  `;
}

function _viewSwitcherHTML(role, user) {
  if (!user) return '';

  // ── 切换工作台身份（有独立页面的身份） ──
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

  // 全部为空时隐藏按钮（单一身份的普通参与者）
  if (workspaces.length === 0) return '';

  // 渲染分组
  let groupsHTML = '';
  if (workspaces.length > 0) {
    groupsHTML += `
      <div style="padding:6px 12px;color:var(--neutral-400);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;" class="text-xs">切换工作台</div>
      ${workspaces.map(w => `
        <a href="${w.href}" data-ws-role="${w.role}" class="view-option text-body-sm" data-type="workspace" style="position:relative;display:flex;align-items:center;gap:6px;padding:8px 12px;cursor:pointer;color:var(--neutral-800);transition:background 0.15s;text-decoration:none;">
          ${w.isCurrent ? '<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>' : ''}
          <span>${w.label}</span>
          ${w.isCurrent ? '<span style="margin-left:auto;color:var(--neutral-400);" class="text-xs">当前</span>' : ''}
        </a>
      `).join('')}
    `;
  }

  return `
    <div id="view-switcher" style="position:relative;">
      <button id="view-switcher-btn" style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);color:#FFFFFF;cursor:pointer;transition:background 0.15s;white-space:nowrap;" class="text-body-sm">
        <span>切换工作台</span>
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
    ? `<span id="notif-badge" style="position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:9999px;background:var(--party-gold);border:1.5px solid var(--primary-900);font-weight:600;color:#7A0010;display:flex;align-items:center;justify-content:center;padding:0 4px;" class="text-xs">${unread > 9 ? '9+' : unread}</span>`
    : '';

  return `
    <div id="notification-bell" style="position:relative;">
      <button id="notif-btn" style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${icon('bell', { stroke: '#FFFFFF', className: 'w-4 h-4' })}
        ${badge}
      </button>
      <div id="notif-dropdown" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;width:320px;background:var(--surface-card);border-radius:var(--radius-sm);box-shadow:var(--shadow-dropdown);z-index:100;overflow:hidden;border:1px solid var(--neutral-200);"></div>
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

  // 点击选项项（工作台跳转：<a> 标签自动跳转，这里只需关闭面板）
  panel.querySelectorAll('.view-option').forEach(opt => {
    opt.addEventListener('mouseenter', () => {
      opt.style.background = 'var(--surface-hover)';
    });
    opt.addEventListener('mouseleave', () => {
      opt.style.background = 'transparent';
    });
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.add('hidden');
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

function _bindNotificationBell(header) {
  const btn = header.querySelector('#notif-btn');
  const dropdown = header.querySelector('#notif-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      // 保留策略（书记 2026-08-05）：紧急通知全部展示，重要通知仅展示未读
      const notices = NoticeStore.list({ activeOnly: true, sortBy: 'date', retention: 'visible' });
      if (notices.length === 0) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--neutral-400);" class="text-sm">暂无通知</div>';
        return;
      }

      const priorityBadge = {
        urgent: badgeHtml('紧急', 'gold'),
        normal: badgeHtml('重要', 'info'),
      };

      dropdown.innerHTML = notices.slice(0, 10).map(n => `
        <div class="notif-dropdown-item" data-notice-id="${n.id}" data-target="${n.targetModule || ''}" data-target-url="${n.targetUrl || ''}"
             style="padding:12px;border-bottom:1px solid var(--neutral-200);cursor:pointer;transition:background 0.15s;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            ${priorityBadge[n.priority] || ''}
            <p style="color:var(--neutral-700);margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" class="text-body-sm">${n.title || n.content}</p>
            ${!n.read ? `<button class="notif-mark-read text-xs" data-notice-id="${n.id}" style="color:var(--functional-info);background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.15s;flex-shrink:0;" onmouseenter="this.style.background='var(--surface-hover)'" onmouseleave="this.style.background='none'">已读</button>` : ''}
          </div>
          <p style="color:var(--neutral-400);margin:0;" class="text-[12px]">${n.publishDate || n.date || ''}</p>
        </div>
      `).join('');

      // 绑定"已读"按钮：stopPropagation 防止触发外层跳转
      dropdown.querySelectorAll('.notif-mark-read').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = btn.dataset.noticeId;
          if (id) {
            NoticeStore.markRead(id);
            _renderNotificationBadge();
            // 视觉反馈：标题变浅 + 移除按钮
            const item = btn.closest('.notif-dropdown-item');
            const titleP = item?.querySelector('p[style*="color:#374151"]');
            if (titleP) titleP.style.color = '#9CA3AF';
            btn.remove();
          }
        });
      });

      // 绑定点击：标记已读 + 统一跳转（resolveNoticeUrl 业务页直达优先，与全站一致）
      dropdown.querySelectorAll('.notif-dropdown-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--surface-hover)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = item.dataset.noticeId;
          const notice = NoticeStore._notices.find(n => n.id === id);
          if (id) NoticeStore.markRead(id);
          _renderNotificationBadge();
          // 视觉反馈：点击后标题颜色变浅
          const titleP = item.querySelector('p[style*="color:#374151"]');
          if (titleP) titleP.style.color = '#9CA3AF';
          const dest = resolveNoticeUrl(notice);
          const finalUrl = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${id}`;
          window.location.href = finalUrl;
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