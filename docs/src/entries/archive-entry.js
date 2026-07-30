// role: [工程师]+[AI]
// archive-entry.js — 归档库独立入口
// 2026-07-30: Tab 分类（活动/专班/通知），替代原单一列表
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { BranchService } from '../services/runtime.js';
import { getPersonById } from '../mock/index.js';
import { loadActivities } from '../services/activity.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { getActivityTypeColors } from '../core/constants.js';
import { NoticeStore } from '../services/notice.js';

renderSidebar('archive');
renderHeader('archive');

// 初始化 mockDB 数据
BranchService.loadDB();
TaskForceRecordStore.init();
NoticeStore.init();

// ── Tab 切换 ──
const ARCHIVE_TABS = [
  { id: 'activity', label: '党建活动' },
  { id: 'taskforce', label: '专班' },
  { id: 'notice', label: '通知' },
];
let _activeTab = 'activity';

const tabContainer = document.getElementById('archive-tabs');
const contentContainer = document.getElementById('archive-tab-content');

function renderTabs() {
  if (!tabContainer) return;
  tabContainer.innerHTML = ARCHIVE_TABS.map(t => {
    const isActive = t.id === _activeTab;
    return `<button class="archive-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors ${isActive ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}" data-tab="${t.id}">${t.label}</button>`;
  }).join('');

  tabContainer.querySelectorAll('.archive-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.tab;
      renderTabs();
      renderContent();
    });
  });
}

function renderContent() {
  if (!contentContainer) return;

  if (_activeTab === 'activity') renderActivityArchive();
  else if (_activeTab === 'taskforce') renderTaskforceArchive();
  else if (_activeTab === 'notice') renderNoticeArchive();
}

// ── 活动归档 ──
function renderActivityArchive() {
  const completedActivities = loadActivities().filter(a => a.status === 'completed' || a.archived);

  if (completedActivities.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">暂无已归档活动</p>';
    return;
  }

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${completedActivities.map(a => {
        const organizer = getPersonById(a.organizer);
        const isBrand = !!a.isBrand;
        return `
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all" data-archive-item data-archive-type="activity" data-archive-id="${a.id}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-800">${a.title || '未命名活动'}</span>
                ${isBrand ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">品牌</span>' : ''}
              </div>
              <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">已归档</span>
            </div>
            <p class="text-xs text-gray-500">${a.date || ''} · ${a.type || '活动'}${organizer ? ' · ' + organizer.name : ''}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── 专班归档 ──
function renderTaskforceArchive() {
  const completedTaskforces = TaskForceRecordStore.getAll().filter(tf => tf.status === 'completed' || tf.status === 'archived');

  if (completedTaskforces.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">暂无已归档专班</p>';
    return;
  }

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${completedTaskforces.map(tf => {
        const initiator = getPersonById(tf.initiator);
        return `
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all" data-archive-item data-archive-type="taskforce" data-archive-id="${tf.id}">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-800">${tf.name || '未命名专班'}</span>
              <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">已归档</span>
            </div>
            <p class="text-xs text-gray-500">${tf.createdAt || ''} ~ ${tf.deadline || ''} · 专班${initiator ? ' · ' + initiator.name : ''}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── 通知归档 ──
function renderNoticeArchive() {
  const allNotices = NoticeStore.list({ activeOnly: false, sortBy: 'date' });

  if (allNotices.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">暂无通知记录</p>';
    return;
  }

  const priorityBadge = {
    urgent: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700">紧急</span>',
    normal: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">重要</span>',
  };

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${allNotices.map(n => `
        <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all cursor-pointer" data-notice-id="${n.id}">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              ${priorityBadge[n.priority] || ''}
              <span class="text-sm font-medium text-gray-800">${n.title}</span>
            </div>
            <span class="text-[10px] text-gray-400">${n.publishDate || ''}</span>
          </div>
          <p class="text-xs text-gray-500 line-clamp-2">${n.content || ''}</p>
        </div>
      `).join('')}
    </div>
  `;

  // 点击跳转通知详情页
  contentContainer.querySelectorAll('[data-notice-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.noticeId;
      const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
      window.location.href = basePath + 'notice.html?id=' + id;
    });
  });
}

// ── 搜索 ──
const archiveSearch = document.getElementById('archive-search');
archiveSearch?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  contentContainer?.querySelectorAll('[data-archive-item], [data-notice-id]').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
});

// ── 初始渲染 ──
renderTabs();
renderContent();
