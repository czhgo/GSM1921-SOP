// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.notice.js — 通知数据模型
//  提供 NoticeStore：通知的 CRUD + mockDB 持久化
//  独立于 mockDB 内存结构，通过 mockDB.notices 统一持久化
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { saveDB } from './mock.js';
import { MOCK_NOTICES } from '../mock/index.js';
import { showToast } from '../core/utils.js';
import { NoticeTodoDeriver, TodoStore, TodoSourceType } from './todo.js';

const NOTICE_STORAGE_KEY = 'workflowos_notices_v1';

function _loadNotices() {
  try {
    return [...mockDB.notices];
  } catch (e) {
    console.warn('[NoticeStore] 加载失败：', e);
    return [];
  }
}

function _saveNotices(notices) {
  try {
    mockDB.notices = [...notices];
    saveDB();
  } catch (e) {
    console.warn('[NoticeStore] 保存失败：', e);
  }
}

// ════════════════════════════════════════════════════════════════
//  §D4 权限控制 — 通知发布/编辑/删除必须对接到角色白名单
// ════════════════════════════════════════════════════════════════

const MANAGE_NOTICE_ROLES = new Set([
  'org-commissioner',
  'prop-commissioner',
  'disc-commissioner',
  'secretary',
]);

const PUBLISH_NOTICE_ROLES = new Set([
  'org-commissioner',
  'prop-commissioner',
  'secretary',
]);

export const NoticePermission = {
  canPublish(role) {
    return PUBLISH_NOTICE_ROLES.has(role);
  },

  canManage(role) {
    return MANAGE_NOTICE_ROLES.has(role);
  },

  check(role, action = 'read') {
    if (action === 'publish' || action === 'add') return this.canPublish(role);
    if (action === 'edit' || action === 'update' || action === 'remove') return this.canManage(role);
    return true; // read — 全员可读
  },
};

export const NoticeStore = {
  _notices: [],

  init() {
    const persisted = _loadNotices();
    if (persisted.length > 0) {
      this._notices = persisted;
    } else {
      this._notices = [...MOCK_NOTICES];
      _saveNotices(this._notices);
    }
  },

  list(filter = {}) {
    // 确保 _notices 已初始化（与 getAll() 一致，避免 list 在 init 前被调用返回空）
    if (this._notices.length === 0) {
      this.init();
    }
    let result = [...this._notices];

    if (filter.activeOnly !== false) {
      const now = new Date().toISOString().slice(0, 10);
      result = result.filter(n => !n.expireDate || n.expireDate >= now);
    }

    if (filter.sortBy === 'date') {
      result.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    } else {
      const priorityOrder = { urgent: 0, normal: 1 };
      result.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));
    }

    if (typeof filter.limit === 'number') {
      result = result.slice(0, filter.limit);
    }

    return result;
  },

  add(notice, actorRole = null) {
    if (actorRole && !NoticePermission.check(actorRole, 'add')) {
      console.warn(`[NoticeStore] 权限不足：角色 ${actorRole} 无权发布通知`);
      return null;
    }
    const newNotice = {
      ...notice,
      id: notice.id || 'notice-' + Date.now(),
      publishDate: notice.publishDate || new Date().toISOString().slice(0, 10),
    };
    this._notices = [...this._notices, newNotice];
    _saveNotices(this._notices);
    // 行动性通知自动派生对应角色待办（最小三成本原则·阶段1C-2）
    try {
      NoticeTodoDeriver.deriveFromNotice(newNotice);
    } catch (e) {
      console.warn('[NoticeStore] 派生待办失败：', e);
    }
    return newNotice;
  },

  update(id, patch, actorRole = null) {
    if (actorRole && !NoticePermission.check(actorRole, 'update')) {
      console.warn(`[NoticeStore] 权限不足：角色 ${actorRole} 无权编辑通知`);
      return null;
    }
    const idx = this._notices.findIndex(n => n.id === id);
    if (idx === -1) return null;
    const updated = { ...this._notices[idx], ...patch };
    this._notices = [
      ...this._notices.slice(0, idx),
      updated,
      ...this._notices.slice(idx + 1),
    ];
    _saveNotices(this._notices);
    return updated;
  },

  remove(id, actorRole = null) {
    if (actorRole && !NoticePermission.check(actorRole, 'remove')) {
      console.warn(`[NoticeStore] 权限不足：角色 ${actorRole} 无权删除通知`);
      return false;
    }
    const prev = this._notices.length;
    this._notices = this._notices.filter(n => n.id !== id);
    if (this._notices.length === prev) return false;
    _saveNotices(this._notices);
    // 通知删除时联动删除关联待办（避免遗留孤儿待办）
    try {
      TodoStore.deleteBySource(TodoSourceType.NOTICE, id);
    } catch (e) {
      console.warn('[NoticeStore] 联动删除待办失败：', e);
    }
    return true;
  },

  getAll() {
    if (this._notices.length === 0) this.init();
    return [...this._notices];
  },

  markRead(id) {
    const notice = this._notices.find(n => n.id === id);
    if (notice) {
      notice.read = true;
      _saveNotices(this._notices);
    }
  },

  markAllRead() {
    this._notices.forEach(n => { n.read = true; });
    _saveNotices(this._notices);
  },
};

export function renderNoticeList(containerId, limit = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const notices = NoticeStore.list({ activeOnly: true, limit });

  if (notices.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无通知</p>';
    return;
  }

  const priorityBadge = {
    urgent: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700">紧急</span>',
    normal: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">重要</span>',
  };

  container.innerHTML = notices.map(n => `
    <div class="notice-item flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 hover:shadow-sm rounded-lg px-2 -mx-2 transition-all duration-200 group"
         data-target="${n.targetModule || ''}" data-notice-id="${n.id}" data-target-url="${n.targetUrl || ''}"
         title="${n.title} — ${n.content}">
      ${priorityBadge[n.priority] || ''}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">${n.title}</p>
        <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">${n.content}</p>
      </div>
      <div class="flex items-center gap-1 whitespace-nowrap mt-0.5">
        ${!n.read ? `<button class="notice-confirm-read text-[10px] text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors" data-notice-id="${n.id}">确认读取</button>` : ''}
        <span class="text-[10px] text-gray-400">${n.publishDate}</span>
      </div>
    </div>
  `).join('');

  // 绑定确认读取按钮：先弹出完整消息浮窗，浮窗中确认已读
  container.querySelectorAll('.notice-confirm-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (!notice) return;
      _showNoticePopover(notice, btn);
    });
  });

  // 绑定点击：标记已读 + 跳转
  // 优先级：有 targetUrl 时直接跳 targetUrl，否则跳 index.html?notice=id（向后兼容）
  container.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.noticeId;
      const targetUrl = item.dataset.targetUrl;  // 来自 notice.targetUrl 字段
      if (id) NoticeStore.markRead(id);
      // 视觉反馈：点击后标题颜色变浅
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');

      // basePath 计算（workspace/ 子目录需要 ../ 前缀）
      const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';

      // 有 targetUrl（如赋权通知）→ 直接跳转
      // 无 targetUrl（普通通知）→ 跳通知详情页
      const finalUrl = targetUrl
        ? basePath + targetUrl
        : `${basePath}notice.html?id=${id}`;
      window.location.href = finalUrl;
    });
  });
}

/**
 * 通知浮窗：展示完整消息内容 + 确认已读按钮
 * 点击"确认读取"时弹出，确认后标记已读并关闭浮窗
 */
function _showNoticePopover(notice, triggerBtn) {
  // 移除已有浮窗
  const existing = document.getElementById('notice-read-popover');
  if (existing) existing.remove();

  const priorityBadge = {
    urgent: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700">紧急</span>',
    normal: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">重要</span>',
  };

  const popover = document.createElement('div');
  popover.id = 'notice-read-popover';
  popover.style.cssText = 'position:fixed;z-index:100;background:white;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,0.15);border:1px solid #E5E7EB;padding:16px;width:360px;max-height:80vh;overflow-y:auto;';

  popover.innerHTML = `
    <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
      <div class="flex items-center gap-2">
        ${priorityBadge[notice.priority] || ''}
        <span class="font-title-cn text-sm font-semibold text-gray-800">${notice.title}</span>
      </div>
      <button id="notice-popover-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
    </div>
    <div class="text-xs text-gray-400 mb-3">${notice.publishDate || ''}</div>
    <div class="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">${notice.content || '无内容'}</div>
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button id="notice-popover-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
      <button id="notice-popover-confirm" class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">确认已读</button>
    </div>
  `;

  document.body.appendChild(popover);

  // 定位：在触发按钮附近
  const rect = triggerBtn.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;
  // 防止溢出视口
  if (top + popoverRect.height > window.innerHeight) top = Math.max(8, rect.top - popoverRect.height - 8);
  if (left + 360 > window.innerWidth) left = Math.max(8, window.innerWidth - 368);
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  // 关闭浮窗
  const closePopover = () => popover.remove();

  popover.querySelector('#notice-popover-close')?.addEventListener('click', closePopover);
  popover.querySelector('#notice-popover-cancel')?.addEventListener('click', closePopover);

  // 确认已读
  popover.querySelector('#notice-popover-confirm')?.addEventListener('click', () => {
    NoticeStore.markRead(notice.id);
    // 视觉反馈：列表项标题变浅 + 移除"确认读取"按钮
    const item = triggerBtn.closest('.notice-item');
    if (item) {
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');
      triggerBtn.remove();
    }
    closePopover();
    showToast('success', '已确认读取');
  });

  // 点击外部关闭
  const outsideHandler = (e) => {
    if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
      closePopover();
      document.removeEventListener('click', outsideHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', outsideHandler, true), 0);

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closePopover(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}
