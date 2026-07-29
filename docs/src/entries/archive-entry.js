// role: [工程师]+[AI]
// archive-entry.js — 归档库独立入口
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { mockDB } from '../core/domain.js';
import { BranchService } from '../services/runtime.js';
import { getPersonById } from '../mock/index.js';
import { getActivityTypeColors } from '../core/constants.js';

renderSidebar('archive');
renderHeader('archive');

// 初始化 mockDB 数据
BranchService.loadDB();

// ── 视图切换 ──────────────────────────────────────────────────
const listViewBtn = document.getElementById('archive-view-list');
const galleryViewBtn = document.getElementById('archive-view-gallery');
const listViewEl = document.getElementById('archive-list-view');
const galleryViewEl = document.getElementById('archive-gallery-view');

let currentView = 'list';

function switchView(view) {
  currentView = view;
  if (view === 'list') {
    listViewEl.classList.remove('hidden');
    galleryViewEl.classList.add('hidden');
    listViewBtn.className = 'px-3 py-1.5 text-xs font-medium transition-colors bg-red-50 text-red-700 border-r border-gray-200';
    galleryViewBtn.className = 'px-3 py-1.5 text-xs font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50';
  } else {
    listViewEl.classList.add('hidden');
    galleryViewEl.classList.remove('hidden');
    galleryViewBtn.className = 'px-3 py-1.5 text-xs font-medium transition-colors bg-red-50 text-red-700 border-r border-gray-200';
    listViewBtn.className = 'px-3 py-1.5 text-xs font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50';
    renderGalleryView();
  }
}

listViewBtn?.addEventListener('click', () => switchView('list'));
galleryViewBtn?.addEventListener('click', () => switchView('gallery'));

// ── 列表视图搜索与筛选 ────────────────────────────────────────
document.getElementById('archive-search')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const container = currentView === 'list' ? listViewEl : galleryViewEl;
  container.querySelectorAll('[data-archive-item]').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
});

document.getElementById('archive-filter')?.addEventListener('change', (e) => {
  const type = e.target.value;
  const container = currentView === 'list' ? listViewEl : galleryViewEl;
  container.querySelectorAll('[data-archive-item]').forEach(item => {
    if (type === 'all') { item.style.display = ''; return; }
    const itemType = item.dataset.archiveType || '';
    item.style.display = itemType === type ? '' : 'none';
  });
});

// ── 画册视图渲染 ──────────────────────────────────────────────
const ACTIVITY_TYPE_COLORS = getActivityTypeColors({ useGradient: true });

function renderGalleryView() {
  const grid = document.getElementById('archive-gallery-grid');
  if (!grid) return;

  // 收集已完成的活动和专班
  const completedActivities = mockDB.activities.filter(a => a.status === 'completed' || a.archived);
  const completedTaskforces = mockDB.taskforces.filter(tf => tf.status === 'completed');

  // 构建画册卡片数据
  const cards = [];

  completedActivities.forEach(a => {
    const organizer = getPersonById(a.organizer);
    const color = ACTIVITY_TYPE_COLORS[a.type] || { bg: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)', dot: '#6B7280' };
    cards.push({
      id: a.id,
      type: 'activity',
      title: a.title || '未命名活动',
      subtitle: `${a.date || ''} · ${a.type || '活动'}`,
      description: a.description || '',
      organizer: organizer ? organizer.name : (a.organizer || ''),
      isBrand: a.isBrand || false,
      bg: color.bg,
      dot: color.dot,
    });
  });

  completedTaskforces.forEach(tf => {
    const initiator = getPersonById(tf.initiator);
    cards.push({
      id: tf.id,
      type: 'taskforce',
      title: tf.name || '未命名专班',
      subtitle: `${tf.createdAt || ''} ~ ${tf.deadline || ''} · 专班`,
      description: tf.task || '',
      organizer: initiator ? initiator.name : (tf.initiator || ''),
      isBrand: false,
      bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
      dot: '#D97706',
    });
  });

  if (cards.length === 0) {
    grid.innerHTML = '<p class="text-sm text-gray-400 text-center py-12 col-span-full">暂无已完成的活动或专班</p>';
    return;
  }

  grid.innerHTML = cards.map(c => `
    <div class="rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group" data-archive-item data-archive-type="${c.type}" data-archive-id="${c.id}">
      <!-- 卡片头部：渐变色区域 -->
      <div class="p-5 relative" style="background:${c.bg};">
        ${c.isBrand ? '<span class="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">品牌</span>' : ''}
        <div class="flex items-center gap-2 mb-2">
          <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${c.dot};"></div>
          <span class="text-[10px] font-medium text-gray-500">${c.type === 'activity' ? '党建活动' : '专班'}</span>
        </div>
        <h4 class="text-base font-bold text-gray-800 leading-snug group-hover:text-blue-700 transition-colors">${c.title}</h4>
      </div>
      <!-- 卡片内容 -->
      <div class="p-4 bg-white">
        <p class="text-xs text-gray-500 mb-2">${c.subtitle}</p>
        ${c.description ? `<p class="text-xs text-gray-400 line-clamp-2 mb-2">${c.description}</p>` : ''}
        ${c.organizer ? `<p class="text-[10px] text-gray-400">组织者：${c.organizer}</p>` : ''}
      </div>
    </div>
  `).join('');
}
