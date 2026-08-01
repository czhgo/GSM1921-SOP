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
    return `<button class="btn-tab ${isActive ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`;
  }).join('');

  tabContainer.querySelectorAll('.btn-tab').forEach(btn => {
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

  // Tab 切换后重新应用搜索
  applySearch();
}

// ── 活动归档 ──
function renderActivityArchive() {
  const completedActivities = loadActivities()
    .filter(a => a.status === 'completed' || a.archived)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 新日期在前

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
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer" data-archive-item data-archive-type="activity" data-archive-id="${a.id}">
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
  const completedTaskforces = TaskForceRecordStore.getAll()
    .filter(tf => tf.status === 'completed' || tf.status === 'archived')
    .sort((a, b) => (b.deadline || b.createdAt || '').localeCompare(a.deadline || a.createdAt || '')); // 新日期在前

  if (completedTaskforces.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">暂无已归档专班</p>';
    return;
  }

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${completedTaskforces.map(tf => {
        const initiator = getPersonById(tf.initiator);
        return `
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer" data-archive-item data-archive-type="taskforce" data-archive-id="${tf.id}">
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
let _searchQuery = '';

function applySearch() {
  if (!contentContainer) return;
  const q = _searchQuery.toLowerCase();
  contentContainer.querySelectorAll('[data-archive-item], [data-notice-id]').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
}

archiveSearch?.addEventListener('input', (e) => {
  _searchQuery = e.target.value.trim();
  applySearch();
});

// ── 初始渲染 ──
renderTabs();
renderContent();

// ════════════════════════════════════════════════════════════════
//  归档详情浮窗（阶段1C-4：点击归档条目查看详情）
//  浮窗展示活动/专班的完整归档元数据，阶段2接入后端后支持文件查看
// ════════════════════════════════════════════════════════════════

let _archiveDetailOverlay = null;
let _archiveDetailModal = null;

function _ensureArchiveDetailModal() {
  if (_archiveDetailOverlay) return;
  _archiveDetailOverlay = document.createElement('div');
  _archiveDetailOverlay.id = 'archive-detail-overlay';
  _archiveDetailOverlay.className = 'fixed inset-0 bg-black/40 z-50 hidden';
  _archiveDetailOverlay.innerHTML = `
    <div class="absolute inset-0" data-close></div>
    <div id="archive-detail-modal" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[92vw] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
      <!-- 内容由 _showArchiveDetail 注入 -->
    </div>
  `;
  document.body.appendChild(_archiveDetailOverlay);

  _archiveDetailModal = _archiveDetailOverlay.querySelector('#archive-detail-modal');

  // 点击遮罩或关闭按钮关闭
  _archiveDetailOverlay.addEventListener('click', (e) => {
    if (e.target.dataset.close !== undefined || e.target.closest('[data-close]')) {
      _hideArchiveDetail();
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !_archiveDetailOverlay.classList.contains('hidden')) {
      _hideArchiveDetail();
    }
  });
}

function _hideArchiveDetail() {
  if (_archiveDetailOverlay) _archiveDetailOverlay.classList.add('hidden');
}

function _showArchiveDetail(html) {
  _ensureArchiveDetailModal();
  _archiveDetailModal.innerHTML = html;
  _archiveDetailOverlay.classList.remove('hidden');
}

function _renderActivityDetail(activity) {
  const organizer = getPersonById(activity.organizer);
  const typeColors = getActivityTypeColors({ withLabel: true });
  const color = typeColors[activity.type] || { dot: '#6B7280', label: activity.type || '活动' };

  return `
    <div class="p-6">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''};"></span>
            <span class="text-xs text-gray-500">${color.label}</span>
            ${activity.isBrand ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">品牌</span>' : ''}
          </div>
          <h3 class="font-title-cn text-lg font-bold text-gray-800">${activity.title || '未命名活动'}</h3>
        </div>
        <button data-close class="text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-5 text-xs">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">活动日期</p>
          <p class="text-gray-800 font-medium">${activity.date || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">活动地点</p>
          <p class="text-gray-800 font-medium">${activity.location || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">组织者</p>
          <p class="text-gray-800 font-medium">${organizer ? organizer.name : '未指派'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">活动状态</p>
          <p class="text-gray-800 font-medium">已归档</p>
        </div>
      </div>

      ${activity.description ? `
        <div class="mb-5">
          <p class="text-xs text-gray-400 mb-2">活动说明</p>
          <p class="text-sm text-gray-700 leading-relaxed">${activity.description}</p>
        </div>
      ` : ''}

      <div class="border-t border-gray-100 pt-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-medium text-gray-600">归档材料清单</p>
          <span class="text-[10px] text-gray-400">阶段2支持文件查看</span>
        </div>
        ${(activity.materials && activity.materials.length > 0) ? `
          <div class="space-y-2">
            ${activity.materials.map(m => `
              <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <span class="text-sm text-gray-700 flex-1 truncate">${m.name || '未命名文件'}</span>
                <span class="text-[10px] text-gray-400">${m.type || 'file'}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="text-xs text-gray-400 text-center py-4">暂无归档材料（mock 阶段未预设）</p>
        `}
      </div>
    </div>
  `;
}

function _renderTaskforceDetail(tf) {
  const initiator = getPersonById(tf.initiator);
  const filledMembers = (tf.members || []).filter(m => m.personId);

  return `
    <div class="p-6">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">专班</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">已归档</span>
          </div>
          <h3 class="font-title-cn text-lg font-bold text-gray-800">${tf.name || '未命名专班'}</h3>
        </div>
        <button data-close class="text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-5 text-xs">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">发起日期</p>
          <p class="text-gray-800 font-medium">${tf.createdAt || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">截止日期</p>
          <p class="text-gray-800 font-medium">${tf.deadline || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">发起人</p>
          <p class="text-gray-800 font-medium">${initiator ? initiator.name : '未指派'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-400 mb-1">成员人数</p>
          <p class="text-gray-800 font-medium">${filledMembers.length}/${tf.capacity || 0}</p>
        </div>
      </div>

      ${tf.task ? `
        <div class="mb-5">
          <p class="text-xs text-gray-400 mb-2">专班任务</p>
          <p class="text-sm text-gray-700 leading-relaxed">${tf.task}</p>
        </div>
      ` : ''}

      ${(tf.members && tf.members.length > 0) ? `
        <div class="border-t border-gray-100 pt-4">
          <p class="text-xs font-medium text-gray-600 mb-3">成员贡献记录</p>
          <div class="space-y-2">
            ${tf.members.map(m => {
              const person = getPersonById(m.personId);
              const contributions = (m.contributions || []).length;
              return `
                <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  <span class="text-sm text-gray-700 flex-1">${person ? person.name : (m.name || '未知成员')}</span>
                  <span class="text-[10px] text-gray-400">${m.role || '成员'}</span>
                  <span class="text-[10px] text-gray-500">${contributions} 项贡献</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// 事件委托：点击归档条目弹出详情浮窗
contentContainer?.addEventListener('click', (e) => {
  const item = e.target.closest('[data-archive-item]');
  if (!item) return;

  const type = item.dataset.archiveType;
  const id = item.dataset.archiveId;

  if (type === 'activity') {
    const activity = loadActivities().find(a => a.id === id);
    if (activity) _showArchiveDetail(_renderActivityDetail(activity));
  } else if (type === 'taskforce') {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === id);
    if (tf) _showArchiveDetail(_renderTaskforceDetail(tf));
  }
});
