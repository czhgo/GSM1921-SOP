// role: [工程师]+[AI]
// entries/tabs/secretary/notification-tab.js — 书记工作台·通知发布 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// 数据源：NoticeStore（与首页/全局概况/visitor 同源，消除双数据源脱节）。

import { NoticeStore } from '../../../services/notice.js?v=20260901s';
import { showToast, getBasePath, _fmtDate } from '../../../core/utils.js?v=20260901s';
import { badgeHtml } from '../../../components/badge.js?v=20260901s';
import { openModal, closeModal } from '../../../components/modal.js?v=20260901s';

const NOTIFICATION_TAB_HTML = `
  <div class="card rounded-2xl p-6 mb-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">发布通知</h3>
    <div id="notification-form-area"></div>
  </div>
  <div class="card rounded-2xl p-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">已发布通知</h3>
    <div id="notification-list-area"></div>
  </div>
`;

/** 渲染通知发布 tab */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'notification') {
    tc.innerHTML = NOTIFICATION_TAB_HTML;
    tc.dataset.currentTab = 'notification';
  }
  renderNotificationPanel();
}

const NOTIFICATION_AUDIENCES = [
  { value: 'all', label: '全体党员' },
  { value: 'leaders', label: '党小组组长' },
  { value: 'activists', label: '入党积极分子' },
  { value: 'candidates', label: '发展对象' },
];

/** 渲染通知发布面板（表单 + 列表） */
function renderNotificationPanel() {
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染发布表单 */
function renderNotificationForm() {
  const formArea = document.getElementById('notification-form-area');
  if (!formArea) return;

  let html = '';

  // 通知标题
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题 <span class="text-red-500">*</span></label>`;
  html += `<input type="text" id="notif-title" class="input-flat w-full" placeholder="通知标题">`;
  html += `</div>`;

  // 通知内容
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容 <span class="text-red-500">*</span></label>`;
  html += `<textarea id="notif-content" rows="4" class="input-flat w-full" placeholder="通知正文"></textarea>`;
  html += `</div>`;

  // 目标受众
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">目标受众 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex flex-wrap gap-2">`;
  NOTIFICATION_AUDIENCES.forEach(a => {
    html += `<button data-notif-action="select-audience" data-value="${a.value}" class="chip-option text-sm px-4 py-2 rounded-lg">${a.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 发布按钮
  html += `<button data-notif-action="publish" class="btn-accent text-sm px-4 py-[7px] font-medium">发布通知</button>`;

  formArea.innerHTML = html;

  // 绑定事件
  formArea.querySelectorAll('[data-notif-action]').forEach(el => {
    el.addEventListener('click', handleNotifAction);
  });
}

/** 通知表单状态（2026-08-08 多选改造：受众支持同时选择多个群体） */
let _selectedAudience = [];

/** 处理通知面板操作 */
function handleNotifAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.notifAction;

  switch (action) {
    case 'select-audience': {
      // 多选切换：已选则移除，未选则加入
      const value = btn.dataset.value;
      _selectedAudience = _selectedAudience.includes(value)
        ? _selectedAudience.filter(v => v !== value)
        : [..._selectedAudience, value];
      // 更新按钮视觉状态（选中项红色高亮）
      const formArea = document.getElementById('notification-form-area');
      if (formArea) {
        formArea.querySelectorAll('[data-notif-action="select-audience"]').forEach(b => {
          const isSelected = _selectedAudience.includes(b.dataset.value);
          b.className = isSelected
            ? 'chip-accent-on chip-option text-sm px-4 py-2 rounded-lg font-medium'
            : 'chip-option text-sm px-4 py-2 rounded-lg';
        });
      }
      break;
    }

    case 'publish': {
      handlePublishNotification();
      break;
    }

    default:
      return;
  }
}

/** 按受众值数组取标签列表 */
function _audienceLabels(values) {
  return values.map(v => {
    const found = NOTIFICATION_AUDIENCES.find(a => a.value === v);
    return found ? found.label : v;
  });
}

/** 发布通知（写入 NoticeStore，与首页/全局概况/visitor 同源） */
function handlePublishNotification() {
  const titleEl = document.getElementById('notif-title');
  const contentEl = document.getElementById('notif-content');

  const title = titleEl?.value?.trim();
  const content = contentEl?.value?.trim();

  if (!title) { showToast('error', '请填写通知标题'); titleEl?.focus(); return; }
  if (!content) { showToast('error', '请填写通知内容'); contentEl?.focus(); return; }
  if (_selectedAudience.length === 0) { showToast('error', '请选择目标受众'); return; }

  const audienceLabels = _audienceLabels(_selectedAudience);
  const notification = {
    title,
    content,
    priority: 'normal',
    publishDate: new Date().toISOString().slice(0, 10),
    expireDate: null,
    targetModule: 'workspace',
    read: false,
    audience: [..._selectedAudience],
    audienceLabel: audienceLabels.join('、'),
    publishedBy: '书记',
  };

  NoticeStore.add(notification, 'secretary');

  showToast('success', `通知「${title}」已发布至${audienceLabels.join('、')}`);

  // 重置表单
  _selectedAudience = [];
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染已发布通知列表（NoticeStore 全部通知，按发布日期倒序） */
function renderNotificationList() {
  const listArea = document.getElementById('notification-list-area');
  if (!listArea) return;

  const notifications = NoticeStore.getAll()
    .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));

  if (notifications.length === 0) {
    listArea.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无已发布通知</p>';
    return;
  }

  listArea.innerHTML = notifications.map(n => {
    // 受众徽章：兼容旧数据（audience 为字符串）与新数据（audience 为数组），按受众各渲染一枚徽章
    const audienceValues = Array.isArray(n.audience) ? n.audience : (n.audience ? [n.audience] : []);
    const audienceBadges = audienceValues.length > 0
      ? _audienceLabels(audienceValues).map(l => badgeHtml(l, 'warning')).join('')
      : badgeHtml(n.audienceLabel || '全体党员', 'warning');
    // publishDate 为字符串（'2026-07-15'）时直接切片，兼容 Date 对象走 _fmtDate
    const dateStr = n.publishDate
      ? (typeof n.publishDate === 'string' ? n.publishDate.slice(0, 10) : _fmtDate(n.publishDate))
      : '';
    return `
      <div class="py-3 px-4 rounded-xl bg-white transition-colors group cursor-pointer hover:bg-gray-50" data-notif-id="${n.id}" data-notif-row="1" title="查看通知详情">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${n.title}</span>
            ${audienceBadges}
          </div>
          <button data-notif-action="delete" data-notif-id="${n.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-50">删除</button>
          <!-- B 档 CRUD 补全：通知编辑（复用 NoticeStore.update，同源写穿） -->
          <button data-notif-action="edit" data-notif-id="${n.id}" class="text-xs text-gray-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-blue-50" title="编辑该通知" style="cursor:pointer;">编辑</button>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">${n.content}</p>
        <p class="text-xs text-gray-400 mt-1.5">${n.publishedBy || '书记'} · ${dateStr}</p>
      </div>
    `;
  }).join('<div class="border-b border-gray-100"></div>');

  // 绑定删除事件（NoticeStore 删除联动清理关联待办；stopPropagation 防止误触行跳转）
  listArea.querySelectorAll('[data-notif-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const notifId = btn.dataset.notifId;
      NoticeStore.remove(notifId, 'secretary');
      showToast('success', '通知已删除');
      renderNotificationList();
    });
  });

  // B 档 CRUD 补全：通知编辑（打开预填编辑浮窗 → NoticeStore.update）
  listArea.querySelectorAll('[data-notif-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const notifId = btn.dataset.notifId;
      const notice = NoticeStore.getAll().find(n => n.id === notifId);
      if (notice) _openNoticeEditModal(notice);
    });
  });

  // 绑定行点击：预览已发布通知（跳通知详情页，可回退）
  listArea.querySelectorAll('[data-notif-row="1"]').forEach(row => {
    row.addEventListener('click', () => {
      const notifId = row.dataset.notifId;
      window.location.href = `${getBasePath()}notice.html?id=${notifId}`;
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  B 档 CRUD 补全：通知编辑浮窗（预填 → NoticeStore.update 同源写穿）
// ════════════════════════════════════════════════════════════════
function _openNoticeEditModal(notice) {
  const audienceValues = Array.isArray(notice.audience) ? notice.audience : (notice.audience ? [notice.audience] : []);
  const chips = NOTIFICATION_AUDIENCES.map(a => {
    const on = audienceValues.includes(a.value) ? ' chip-accent-on font-medium' : '';
    return `<button type="button" data-notif-edit-aud="${a.value}" class="chip-option text-sm px-4 py-2 rounded-lg${on}">${a.label}</button>`;
  }).join('');

  openModal({
    id: 'notice-edit',
    title: '编辑通知',
    width: '560px',
    accentColor: '#CE1126',
    bodyHtml: `
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题 <span class="text-red-500">*</span></label>
          <input type="text" id="ne-title" class="input-flat w-full" value="${notice.title || ''}">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容 <span class="text-red-500">*</span></label>
          <textarea id="ne-content" rows="4" class="input-flat w-full">${notice.content || ''}</textarea>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">目标受众</label>
          <div class="flex flex-wrap gap-2">${chips}</div>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">优先级</label>
          <select id="ne-priority" class="input-flat w-full">
            <option value="normal" ${notice.priority !== 'urgent' ? 'selected' : ''}>普通</option>
            <option value="urgent" ${notice.priority === 'urgent' ? 'selected' : ''}>紧急</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button id="ne-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button id="ne-save" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:#CE1126;cursor:pointer;">保存</button>
      </div>
    `,
    onMount: (panel) => {
      panel.querySelectorAll('[data-notif-edit-aud]').forEach(chip => {
        chip.addEventListener('click', () => chip.classList.toggle('chip-accent-on'));
      });
      panel.querySelector('#ne-cancel')?.addEventListener('click', () => closeModal('notice-edit'));
      panel.querySelector('#ne-save')?.addEventListener('click', () => {
        const title = panel.querySelector('#ne-title')?.value?.trim();
        const content = panel.querySelector('#ne-content')?.value?.trim();
        if (!title) { showToast('error', '请填写通知标题'); return; }
        if (!content) { showToast('error', '请填写通知内容'); return; }
        const values = [...panel.querySelectorAll('[data-notif-edit-aud].chip-accent-on')].map(c => c.dataset.notifEditAud);
        const updated = NoticeStore.update(notice.id, {
          title,
          content,
          audience: values,
          audienceLabel: _audienceLabels(values).join('、'),
          priority: panel.querySelector('#ne-priority')?.value || 'normal',
        }, 'secretary');
        if (!updated) { showToast('error', '通知更新失败'); return; }
        showToast('success', '通知已更新');
        closeModal('notice-edit');
        renderNotificationList();
      });
    },
  });
}
