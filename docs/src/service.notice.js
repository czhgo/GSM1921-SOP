// role: [人机]
// ════════════════════════════════════════════════════════════════
//  service.notice.js — 通知数据模型
//  提供 NoticeStore：通知的 CRUD + localStorage 持久化
//  独立于 mockDB，使用独立 localStorage 键名
// ════════════════════════════════════════════════════════════════

const NOTICE_STORAGE_KEY = 'workflowos_notices_v1';

function _loadNotices() {
  try {
    const raw = localStorage.getItem(NOTICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[NoticeStore] 加载失败：', e);
    return [];
  }
}

function _saveNotices(notices) {
  try {
    localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(notices));
  } catch (e) {
    console.warn('[NoticeStore] 保存失败：', e);
  }
}

const MOCK_NOTICES = [
  {
    id: 'notice-001',
    title: '五月主题党日活动筹备启动',
    content: '请各党小组组长于 5 月 8 日前提交本月主题党日活动方案。',
    priority: 'urgent',
    publishDate: '2026-05-03',
    expireDate: '2026-05-08',
    targetModule: 'calendar',
  },
  {
    id: 'notice-002',
    title: '宣传专班招募中',
    content: '本学期第二期宣传专班面向全体支部成员开放报名，请有意向的同志联系组织委员。',
    priority: 'normal',
    publishDate: '2026-05-02',
    expireDate: '2026-05-12',
    targetModule: 'party',
  },
  {
    id: 'notice-003',
    title: '四月活动归档提醒',
    content: '四月活动归档截止日期临近（5 月 10 日），请承办委员及时完成归档工作。',
    priority: 'normal',
    publishDate: '2026-05-01',
    expireDate: '2026-05-10',
    targetModule: 'party',
  },
];

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
    let result = [...this._notices];

    if (filter.activeOnly !== false) {
      const now = new Date().toISOString().slice(0, 10);
      result = result.filter(n => !n.expireDate || n.expireDate >= now);
    }

    if (filter.sortBy === 'date') {
      result.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    } else {
      const priorityOrder = { urgent: 0, normal: 1, low: 2 };
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
    return true;
  },

  getAll() {
    return [...this._notices];
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
    normal: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">一般</span>',
    low:    '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600">低优</span>',
  };

  container.innerHTML = notices.map(n => `
    <div class="notice-item flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
         data-target="${n.targetModule || ''}" data-notice-id="${n.id}">
      ${priorityBadge[n.priority] || ''}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-800 truncate">${n.title}</p>
        <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">${n.content}</p>
      </div>
      <span class="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">${n.publishDate}</span>
    </div>
  `).join('');
}
