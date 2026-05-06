// role: [人机]
// main.js — 主页入口（精简版）
// index.html 专属，仅处理 dashboard 渲染

import { BranchService } from './service.runtime.js';
import { STATE, setState, registerRenderCallback } from './state.js';
import { NoticeStore, renderNoticeList } from './service.notice.js';
import { TaskForceRecordStore, renderRecruitmentList } from './service.taskforce.js';
import { _fmtDate, showToast } from './utils.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';

renderSidebar('dashboard');
renderHeader('dashboard');

function renderUI(state) {
  const { activeModule, status, error } = state;

  document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.module === 'dashboard');
  });

  if (activeModule === 'dashboard') {
    renderDashboard(state);
  }
}

registerRenderCallback(renderUI);

function renderDashboard(state) {
  renderNoticeList('dashboard-notice-list', 5);
  renderRecruitmentList('dashboard-recruitment-list', 3);

  const calTarget = document.getElementById('dashboard-calendar-summary');
  if (!calTarget) return;
  calTarget.innerHTML = '';
  calTarget.classList.add('calendar-mini-grid');

  const activities = state.activities || [];
  if (activities.length === 0) {
    calTarget.innerHTML = '<p class="text-sm text-gray-400 p-4">暂无可展示的活动</p>';
    return;
  }

  const now = new Date();
  const upcoming = activities
    .filter(a => {
      const d = a.date || a.startDate || a.metadata?.date;
      if (!d) return false;
      return new Date(d) >= new Date(now.getFullYear(), now.getMonth(), 1);
    })
    .sort((a, b) => {
      const da = a.date || a.startDate || a.metadata?.date || '';
      const db = b.date || b.startDate || b.metadata?.date || '';
      return da.localeCompare(db);
    })
    .slice(0, 8);

  if (upcoming.length === 0) {
    calTarget.innerHTML = '<p class="text-sm text-gray-400 p-4">本月暂无可展示的活动</p>';
    return;
  }

  const categoryColors = {
    '主题党日': { bg: '#FEF2F2', dot: '#DC2626', label: '主题党日' },
    '共建':     { bg: '#FDF2F8', dot: '#DB2777', label: '共建' },
    '学习':     { bg: '#EFF6FF', dot: '#2563EB', label: '学习' },
    '参访':     { bg: '#ECFDF5', dot: '#059669', label: '参访' },
    '座谈':     { bg: '#FFF7ED', dot: '#EA580C', label: '座谈' },
    '会议':     { bg: '#F5F3FF', dot: '#7C3AED', label: '会议' },
    '长期活动': { bg: '#F0F9FF', dot: '#0891B2', label: '长期活动' },
  };

  calTarget.innerHTML = upcoming.map(a => {
    const d = a.date || a.startDate || a.metadata?.date || '';
    const rawCat = a.category || a.type || '会议';
    const color = categoryColors[rawCat] || { bg: '#F9FAFB', dot: '#6B7280', label: rawCat };
    const dateLabel = d ? _fmtDate(d) : '待定';
    const title = a.title || a.name || '未命名活动';

    return `
    <div class="dashboard-cal-item flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow cursor-pointer"
         style="background: ${color.bg}"
         data-activity-id="${a.id || ''}"
         data-activity-date="${d}">
      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: ${color.dot}"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-800 truncate">${title}</p>
        <p class="text-xs text-gray-500">${dateLabel} · ${color.label}</p>
      </div>
    </div>
  `;
  }).join('');

  const dashContainer = document.getElementById('view-dashboard');
  if (!dashContainer || dashContainer.dataset.navBound === 'true') return;
  dashContainer.dataset.navBound = 'true';

  dashContainer.addEventListener('click', (e) => {
    const calItem = e.target.closest('.dashboard-cal-item');
    if (calItem) {
      window.location.href = './workspace.html';
    }
  });
}

(async function initApp() {
  try {
    if (typeof BranchService.loadDB === 'function') BranchService.loadDB();
    NoticeStore.init();
    TaskForceRecordStore.init();
  } catch (e) {
    console.warn('[initApp] loadDB 异常（已忽略）', e);
  }

  setState({ domain: 'activity', role: 'all', activeModule: 'dashboard', status: STATE.LOADING, selectedRole: null });

  try {
    const [activities, tasks] = await Promise.all([
      BranchService.listActivities(),
      typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
    ]);
    setState({ status: STATE.IDLE, activities, tasks });
  } catch (err) {
    console.warn('[initApp] 初始化加载失败：', err);
    setState({ status: STATE.ERROR, error: err });
  }
}());
