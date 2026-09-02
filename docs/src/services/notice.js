// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.notice.js — 通知数据模型
//  提供 NoticeStore：通知的 CRUD + mockDB 持久化
//  独立于 mockDB 内存结构，通过 mockDB.notices 统一持久化
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260901g';
import { persist } from '../core/data-adapter.js?v=20260901g';
import { MOCK_NOTICES } from '../mock/index.js?v=20260901g';
import { showToast, getBasePath } from '../core/utils.js?v=20260901g';
import { AuthStore } from './auth.js?v=20260901g';
import { NoticeTodoDeriver, TodoStore, TodoSourceType } from './todo.js?v=20260901g';
import { badgeHtml } from '../components/badge.js?v=20260901g';

function _loadNotices() {
  try {
    // 2026-08-08 归档闭环：统一归一化 archived 字段（旧数据缺省视为未归档）
    return (mockDB.notices || []).map(n => ({ ...n, archived: n.archived === true }));
  } catch (e) {
    console.warn('[NoticeStore] 加载失败：', e);
    return [];
  }
}

function _saveNotices(notices) {
  try {
    mockDB.notices = [...notices];
    persist();
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
      // 2026-08-08 归档闭环修复：mockDB 未加载（_loaded=false）时不得落库，
      // 否则会用 seed 原版覆盖 localStorage 中的运行时字段（如 archived），
      // 且过早落库可能写入不完整数据。loadDB 完成后读取统一走 _current()。
      if (mockDB._loaded) {
        _saveNotices(this._notices);
      }
    }
  },

  /**
   * 当前数据源（2026-08-08 归档闭环修复）：
   * 优先取 mockDB.notices（loadDB / seed 增量合并后的权威数据），
   * 兜底 _notices（mockDB 未加载或全空时的内存态）。
   * 修复早期 init（header 渲染先于 loadDB）导致 _notices 滞留 seed 原版、
   * archived 等运行时字段丢失的问题。
   */
  _current() {
    if (mockDB.notices && mockDB.notices.length > 0) {
      return mockDB.notices;
    }
    return this._notices;
  },

  /** 写操作前置对齐：以 mockDB.notices 为准刷新 _notices，避免基于旧内存态写回覆盖运行时字段 */
  _syncWithStore() {
    this._notices = [...this._current()];
  },

  list(filter = {}) {
    // 确保 _notices 已初始化（与 getAll() 一致，避免 list 在 init 前被调用返回空）
    if (this._notices.length === 0) {
      this.init();
    }
    let result = [...this._current()];

    // 2026-08-08 归档闭环：默认排除已归档通知（随活动/专班归档退出工作区）
    if (filter.includeArchived !== true) {
      result = result.filter(n => !n.archived);
    }

    if (filter.activeOnly !== false) {
      const now = new Date().toISOString().slice(0, 10);
      result = result.filter(n => !n.expireDate || n.expireDate >= now);
    }

    // 书记裁决（2026-08-05）：「未读的重要；无论已读未读的紧急」
    // 展示层保留策略：紧急通知全部保留展示，重要通知仅展示未读的（已读重要通知收起）。
    // 角标未读统计不走此过滤（仍统计全部未读），仅在列表展示处传 retention:'visible'。
    if (filter.retention === 'visible') {
      result = result.filter(n => n.priority === 'urgent' || !n.read);
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
    this._syncWithStore();
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
    this._syncWithStore();
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

  getAll({ includeArchived = false } = {}) {
    if (this._notices.length === 0) this.init();
    const src = this._current();
    return includeArchived ? [...src] : [...src].filter(n => !n.archived);
  },

  /**
   * 归档与来源（活动/专班）绑定的通知（2026-08-08 归档闭环）
   * 活动/专班归档后，其配套通知随之一并归档，退出工作区。
   * @param {'activity'|'taskforce'} targetType
   * @param {string} targetId — activity.id 或 taskforce.id
   * @returns {number} 归档的通知条数
   */
  archiveBySource(targetType, targetId) {
    if (!targetType || !targetId) return 0;
    this._syncWithStore();
    let count = 0;
    this._notices = this._notices.map(n => {
      if (n.archived) return n;
      if (n.targetType === targetType && n.targetId === targetId) {
        count++;
        return { ...n, archived: true, archivedAt: new Date().toISOString().slice(0, 10) };
      }
      return n;
    });
    if (count > 0) _saveNotices(this._notices);
    return count;
  },

  markRead(id) {
    this._syncWithStore();
    const notice = this._notices.find(n => n.id === id);
    if (notice) {
      notice.read = true;
      _saveNotices(this._notices);
      // 做事即销待办：已读自动完成「通知阅读」待办
      try { TodoStore.completeBySource(TodoSourceType.NOTICE, id); } catch (e) { console.warn('[notice] 销待办失败', e); }
    }
  },

  markAllRead() {
    this._syncWithStore();
    this._notices.forEach(n => { n.read = true; });
    _saveNotices(this._notices);
  },
};

// ════════════════════════════════════════════════════════════════
//  通知跳转统一解析（业务页直达优先，2026-08-06）
//  全站所有通知跳转入口共用此函数，杜绝多入口逻辑分叉。
// ════════════════════════════════════════════════════════════════

// targetModule → 业务页（角色感知）：模块语义决定业务落点
//  - activity（活动/主题党日）→ 首页活动日历（全员统一活动视图）
//  - attendance（考勤）→ 纪检委员考勤管理 / 书记考勤概况
//  - party（发展党员/考察）→ 组织委员党务工作 / 纪检委员考察管理 / 书记工作台
//  - workspace（工作部署/筹备）→ 支委各归其位 / 组长工作台 / 其余首页
const NOTICE_MODULE_ROLE_PAGES = {
  activity: {
    '*': 'index.html',
  },
  attendance: {
    'disc-commissioner': 'workspace/disc.html',
    'secretary': 'workspace/secretary.html',
    'deputy-secretary': 'workspace/secretary.html',
    '*': 'index.html',
  },
  party: {
    'org-commissioner': 'workspace/org.html',
    'disc-commissioner': 'workspace/disc.html',
    'secretary': 'workspace/secretary.html',
    'deputy-secretary': 'workspace/secretary.html',
    '*': 'index.html',
  },
  workspace: {
    'secretary': 'workspace/secretary.html',
    'deputy-secretary': 'workspace/secretary.html',
    'org-commissioner': 'workspace/org.html',
    'prop-commissioner': 'workspace/prop.html',
    'disc-commissioner': 'workspace/disc.html',
    'leader': 'workspace/leader.html',
    '*': 'index.html',
  },
};

/**
 * 解析通知跳转目标
 * 规则（业务页直达优先）：
 *   1. 有 targetUrl → 直达目标业务页（系统通知显式指定，如催办/赋权，含 activityId 定位参数）
 *   2. 无 targetUrl → 按 targetModule 映射到与当前角色匹配的业务页
 *   3. 行动性通知（actionRoles）→ 仅目标角色直达业务页，其余仅进详情页
 *   4. 模块映射结果与当前页相同 → 回退通知详情页（避免原地刷新"循环"；显式 targetUrl 不适用此条）
 * @param {Object} n 通知对象
 * @param {string} [currentRole] 当前角色；缺省时读取 AuthStore
 * @returns {{ url: string|null, direct: boolean }} url 为可直接赋给 location.href 的地址（已含 basePath）
 */
export function resolveNoticeUrl(n, currentRole = null) {
  if (!n) return { url: null, direct: false };
  if (!currentRole) {
    try { currentRole = AuthStore.getCurrentUser()?.role || null; } catch (_) { currentRole = null; }
  }
  // 3. 行动性通知受众过滤：仅目标角色可直达业务页
  if (Array.isArray(n.actionRoles) && n.actionRoles.length > 0) {
    if (!currentRole || !n.actionRoles.includes(currentRole)) {
      return { url: null, direct: false };
    }
  }
  // 0. T233 targetType/targetId 显式定位 → 直达详情页（招募/报名类通知，活动/专班分页）
  if (n.targetType && n.targetId) {
    const detailFile = n.targetType === 'taskforce' ? 'taskforce.html' : n.targetType === 'activity' ? 'activity.html' : null;
    if (detailFile) {
      return { url: getBasePath() + `${detailFile}?id=${n.targetId}`, direct: true };
    }
  }
  // 1. targetUrl 直达（显式指定，不做同页回退）
  if (n.targetUrl) {
    return { url: getBasePath() + n.targetUrl, direct: true };
  }
  // 2. targetModule 角色感知映射
  let page = null;
  if (n.targetModule) {
    const roleMap = NOTICE_MODULE_ROLE_PAGES[n.targetModule] || {};
    page = roleMap[currentRole] || roleMap['*'] || null;
  }
  if (!page) return { url: null, direct: false };
  // 4. 模块映射结果与当前页相同 → 回退详情页（避免原地刷新"循环"）
  const currentFile = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];
  const targetFile = (page.split('/').pop() || '').split('?')[0];
  if (currentFile === targetFile) {
    return { url: null, direct: false };
  }
  return { url: getBasePath() + page, direct: true };
}

export function renderNoticeList(containerId, limit = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 书记规则（2026-08-01）：任何带时间字段的列示一律按时间倒序（最新在前）
  // 书记裁决（2026-08-05）：重要通知仅保留未读，紧急通知无论已读未读均展示
  const notices = NoticeStore.list({ activeOnly: true, limit, sortBy: 'date', retention: 'visible' });

  if (notices.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无通知</p>';
    return;
  }

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
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
        ${!n.read ? `<button class="notice-confirm-read text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors" data-notice-id="${n.id}">确认读取</button>` : ''}
        <span class="text-xs text-gray-400">${n.publishDate}</span>
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

  // 绑定点击：标记已读 + 统一跳转（resolveNoticeUrl 业务页直达优先）
  container.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (id) NoticeStore.markRead(id);
      // 视觉反馈：点击后标题颜色变浅
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');
      const dest = resolveNoticeUrl(notice);
      const finalUrl = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${id}`;
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
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
  };

  const popover = document.createElement('div');
  popover.id = 'notice-read-popover';
  popover.style.cssText = 'position:fixed;z-index:100;background:var(--surface-card);border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,0.15);border:1px solid var(--neutral-200);padding:16px;width:360px;max-height:80vh;overflow-y:auto;';

  popover.innerHTML = `
    <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
      <div class="flex items-center gap-2">
        ${priorityBadge[notice.priority] || ''}
        <h3 class="font-title-cn text-sm font-semibold text-gray-800">${notice.title}</h3>
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
