﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// components/header.js — 共享顶栏组件（重构版）
// 变化: 去掉 mode 标签与只读视角切换；2026-08-10 书记裁定（原则12 工作台集成制）：
// 「切换工作台」下拉为冗余要素（每个人就是每个人，任务集成在工作台，跨台经待办/通知直达）→ 删除

import { getAccentColors, resolveAccentRole, ROLE_LABELS } from '../core/constants.js?v=20260829q';
import { getBasePath } from '../core/utils.js?v=20260829q';
import { icon } from '../core/icons.js?v=20260829q';
import { DATA_CHANGED_EVENT, DATA_LOADED_EVENT } from '../core/data-adapter.js?v=20260829q';
import { badgeHtml } from './badge.js?v=20260829q';
import { readLoginSnapshot } from '../core/login-snapshot.js?v=20260829q';

// ── 数据层按需加载（静态页隔离，2026-08-12）──
// about/help 等纯静态文档页以 staticShell 渲染 header：不加载 auth/notice 数据链
// （auth→runtime→mock→domain 全量约 50 模块），通知铃首次点击或 app 模式渲染后按需加载。
// 动态 import 沿用与原静态 import 相同的版本号 → 与全站其他引用共享同一模块实例，行为不变。
let _authModule = null;
let _noticeModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../services/auth.js?v=20260829q');
  return _authModule;
}
function loadNotice() {
  if (!_noticeModule) _noticeModule = import('../services/notice.js?v=20260829q');
  return _noticeModule;
}

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
async function _renderNotificationBadge() {
  const bell = document.getElementById('notification-bell');
  if (!bell) return;
  let NoticeStore;
  try {
    ({ NoticeStore } = await loadNotice());
  } catch (e) {
    return; // 静态页未加载数据链时静默（无角标可渲染）
  }
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
  // 2026-08-11 四审纠正：header 身份显示 = 主题色实底（正常饱和度）+ 白字，
  // 与整个 header（深红底白字）一致；淡底深字/边框在 header 上突兀臃肿，日/夜一致。
  return `
    <div class="role-label" id="role-label" style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:var(--radius-sm);background:${accent};color:#fff;">
      <span class="text-xs font-medium">${label}</span>
    </div>
  `;
}

function _notificationBellHTML() {
  // 角标由 _renderNotificationBadge() 在数据层加载后异步补充
  // （静态壳页不加载数据链 → 无角标；app 页渲染后即时补上，无感知延迟）
  return `
    <div id="notification-bell" style="position:relative;">
      <button id="notif-btn" style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${icon('bell', { stroke: '#FFFFFF', className: 'w-4 h-4' })}
      </button>
      <div id="notif-dropdown" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;width:320px;background:var(--surface-card);border-radius:var(--radius-sm);box-shadow:var(--shadow-dropdown);z-index:100;overflow:hidden;border:1px solid var(--neutral-200);"></div>
    </div>
  `;
}

export async function renderHeader(activeModule, opts = {}) {
  const header = document.getElementById('app-header');
  if (!header) return;

  const staticShell = !!opts.staticShell;

  // 登录态感知壳：静态页轻量读快照（零依赖）——已登录才动态加载 auth 渲染身份标签；
  // 未登录访客 → 无身份标签；app 模式按需加载后渲染身份
  let role = '';
  if (staticShell ? readLoginSnapshot() : true) {
    try {
      const { AuthStore } = await loadAuth();
      const user = AuthStore.getCurrentUser();
      role = user?.role || '';
    } catch (e) {
      console.warn('[header] auth 加载失败，降级为静态壳', e);
    }
  }

  header.innerHTML = `
    <div class="header-content">
      <button id="hamburger-btn" aria-label="打开导航菜单" class="hamburger-btn">
        <span></span><span></span><span></span>
      </button>
      <div class="party-emblem-wrapper">
        <img src="${getBasePath()}assets/images/party_emblem.png" alt="党徽" class="party-emblem" draggable="false" onerror="this.style.display='none';">
      </div>
      <div class="header-title">
        <h1 class="font-title-cn">光华管理学院本科生党支部</h1>
      </div>
      <div class="header-actions" style="display:flex;align-items:center;gap:8px;">
        ${_roleLabelHTML(role)}
        ${_notificationBellHTML()}
      </div>
    </div>
  `;

  _bindHamburger(header);
  _bindNotificationBell(header);

  // app 模式：渲染后立即按需加载通知模块 → 计算未读角标（模块缓存后即时、无感知）
  if (!staticShell) {
    loadNotice().then(() => _renderNotificationBadge()).catch(() => {});
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

function _bindNotificationBell(header) {
  const btn = header.querySelector('#notif-btn');
  const dropdown = header.querySelector('#notif-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      // 首次点击时按需加载通知数据链（静态壳页点开铃铛才会加载，平时零依赖）
      let NoticeStore, resolveNoticeUrl;
      try {
        ({ NoticeStore, resolveNoticeUrl } = await loadNotice());
      } catch (err) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--neutral-400);" class="text-sm">通知数据不可用</div>';
        return;
      }
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