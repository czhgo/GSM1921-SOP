import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { _fmtDate } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { NoticeStore } from '../services/notice.js';
import { ACTIVITIES, _personName } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { loadAttendanceRecords } from '../services/attendance.js';
import { getActivityTypeColors } from '../core/constants.js';
import { renderTabBar } from '../components/tab-bar.js';
import { icon } from '../core/icons.js';
import { renderQueryView } from '../components/query-view.js';

bootstrapPage({ module: 'workspace', accentRole: 'participant' });

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();

function renderVisitorUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('visitor-content');
  if (!container) return;

  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();
  const activeTf = taskforces.filter(t => t.status === 'active' || t.status === 'recruiting');

  const urlParams = CrossPageState.getURLParams();
  const highlightId = urlParams.activityId || null;

  const tabBar = renderTabBar({
    prefix: 'visitor',
    tabs: [
      { id: 'activities', label: '活动动态', render: (ctx) => _renderActivities(ctx.activities, ctx.highlightId) },
      { id: 'taskforces', label: '专班进展', render: (ctx) => _renderTaskforces(ctx.activeTf) },
      { id: 'attendance', label: '考勤概况', render: (ctx) => _renderAttendance(ctx.activities) },
    ],
    accentColor: { accent: 'var(--primary-700)', accentRgba: 'rgba(206,17,38,0.08)', accentBorder: 'rgba(206,17,38,0.2)' },
    defaultTab: 'activities',
    renderCtx: { activities, activeTf, highlightId },
    storageKey: 'workflowos_tab_visitor',
  });

  container.innerHTML = `
    ${tabBar.html}
  `;

  tabBar.bindEvents(container);
  if (highlightId) {
    tabBar.activate('activities');
  } else {
    tabBar.activate(tabBar.activeTab);
  }
}

function _renderActivities(activities, highlightId) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const sorted = [...activities].filter(a => a.date && !a.archived).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  tc.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-500">${sorted.length} 条活动</span>
      <div class="flex gap-1">
        <button class="visitor-view-btn px-2.5 py-1 text-xs rounded-lg border transition-colors" data-vview="list" style="background:rgba(206,17,38,0.08);color:var(--primary-700);border:1px solid rgba(206,17,38,0.2);">
          ${icon('list', { size: 14, extra: ' style="display:inline;vertical-align:-2px;"' })} 列表
        </button>
        <button class="visitor-view-btn px-2.5 py-1 text-xs rounded-lg border transition-colors" data-vview="calendar" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">
          ${icon('calendar', { size: 14, extra: ' style="display:inline;vertical-align:-2px;"' })} 日历
        </button>
        <button class="visitor-view-btn px-2.5 py-1 text-xs rounded-lg border transition-colors" data-vview="query" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">
          ${icon('search', { size: 14, extra: ' style="display:inline;vertical-align:-2px;"' })} 查询
        </button>
      </div>
    </div>
    <div id="visitor-act-view"></div>
  `;

  tc.querySelectorAll('.visitor-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tc.querySelectorAll('.visitor-view-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = 'rgba(206,17,38,0.08)'; btn.style.color = 'var(--primary-700)'; btn.style.border = '1px solid rgba(206,17,38,0.2)';
      const view = btn.dataset.vview;
      if (view === 'list') _renderActListView(sorted, highlightId);
      else if (view === 'calendar') _renderActCalendarView(sorted, highlightId);
      else _renderActQueryView(sorted, highlightId);
    });
  });

  _renderActListView(sorted, highlightId);
}

function _renderActListView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;
  vc.innerHTML = `
    <div class="space-y-2">
      ${sorted.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>' :
        sorted.map(a => {
          const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
          const isHL = highlightId && a.id === highlightId;
          return `
            <div class="flex items-center gap-3 p-3 rounded-lg bg-white ${isHL ? 'border border-blue-400 ring-2 ring-blue-100' : ''}" data-visitor-act-id="${a.id || ''}">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
              </div>
              ${isHL ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">当前</span>' : ''}
            </div>
          `;
        }).join('')}
    </div>
  `;
  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _renderActCalendarView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  const byMonth = {};
  sorted.forEach(a => {
    const m = (a.date || '').substring(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(a);
  });
  const months = Object.keys(byMonth).sort().reverse();

  vc.innerHTML = months.length === 0
    ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>'
    : months.map(m => {
      const acts = byMonth[m];
      const [y, mo] = m.split('-');
      const monthLabel = `${y}年${parseInt(mo)}月`;
      return `
        <div class="mb-5">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            ${icon('calendar', { size: 14, stroke: 'var(--primary-700)' })}
            ${monthLabel}
            <span class="text-[10px] font-normal text-gray-400">${acts.length} 场</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${acts.map(a => {
              const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
              const isHL = highlightId && a.id === highlightId;
              const day = (a.date || '').substring(8, 10);
              return `
                <div class="flex items-start gap-3 p-3 rounded-lg bg-white ${isHL ? 'border border-blue-400 ring-2 ring-blue-100' : ''}" data-visitor-act-id="${a.id || ''}">
                  <div class="text-center flex-shrink-0 w-10">
                    <div class="text-lg font-bold" style="color:${color.dot};line-height:1;">${day || '?'}</div>
                    <div class="text-[10px] text-gray-400">日</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
                  </div>
                  ${isHL ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0 mt-0.5">当前</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _renderActQueryView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  const typeOptions = Object.keys(ACTIVITY_TYPE_COLORS).map(key => ({
    value: key,
    label: key,
  }));

  renderQueryView(vc, {
    searchPlaceholder: '搜索活动名称、地点...',
    searchKey: 'title',
    filters: [
      { key: 'type', label: '活动类型', options: typeOptions },
    ],
    data: sorted,
    renderRow: (a) => {
      const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
      const isHL = highlightId && a.id === highlightId;
      return `
        <div class="flex items-center gap-3 p-3 rounded-lg bg-white ${isHL ? 'border border-blue-400 ring-2 ring-blue-100' : ''}" data-visitor-act-id="${a.id || ''}">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
            <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
          </div>
          ${isHL ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">当前</span>' : ''}
        </div>
      `;
    },
    emptyMessage: '无匹配活动',
    accentColor: '#CE1126',
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _renderTaskforces(taskforces) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const statusLabel = { recruiting: '招募中', active: '运行中', completed: '已完结', draft: '草稿' };
  const statusColor = { recruiting: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', draft: 'bg-gray-100 text-gray-500' };
  tc.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="visitor-tf-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
      <select id="visitor-tf-status-filter" class="input-flat text-xs w-24">
        <option value="">全部状态</option>
        <option value="recruiting">招募中</option>
        <option value="active">运行中</option>
        <option value="completed">已完结</option>
      </select>
    </div>
    <div id="visitor-tf-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-tf-list');
    if (!listEl) return;
    const q = (document.getElementById('visitor-tf-search')?.value || '').trim().toLowerCase();
    const s = document.getElementById('visitor-tf-status-filter')?.value || '';
    const filtered = taskforces.filter(t => {
      if (q && !(t.name || '').toLowerCase().includes(q) && !(t.task || '').toLowerCase().includes(q)) return false;
      if (s && t.status !== s) return false;
      return true;
    });
    listEl.innerHTML = `
      <div class="space-y-2">
        ${filtered.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">无匹配专班</p>' :
          filtered.map(t => {
            const filled = t.members.filter(m => m.personId).length;
            return `
              <div class="p-3 rounded-lg bg-white">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-gray-800">${t.name}</p>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full ${statusColor[t.status] || 'bg-gray-100 text-gray-500'}">${statusLabel[t.status] || t.status}</span>
                </div>
                <p class="text-xs text-gray-500">${t.task}</p>
                <div class="text-[10px] text-gray-400 mt-1">${filled}/${t.capacity} 成员 · 发起: ${_personName(t.initiator)}</div>
              </div>
            `;
          }).join('')}
      </div>
    `;
  }

  document.getElementById('visitor-tf-search')?.addEventListener('input', renderList);
  document.getElementById('visitor-tf-status-filter')?.addEventListener('change', renderList);
  renderList();
}

function _renderAttendance(activities) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActs = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);
  tc.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="visitor-att-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索活动名称...">
    </div>
    <div id="visitor-att-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-att-list');
    if (!listEl) return;
    const q = (document.getElementById('visitor-att-search')?.value || '').trim().toLowerCase();
    const filtered = q ? monthActs.filter(a => (a.title || '').toLowerCase().includes(q)) : monthActs;
    listEl.innerHTML = `
      <div class="space-y-2">
        ${filtered.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">无匹配考勤数据</p>' :
          filtered.map(act => {
            const records = loadAttendanceRecords().filter(r => r.activityId === act.id);
            const present = records.filter(r => r.status === 'present').length;
            const total = records.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            return `
              <div class="flex items-center justify-between p-3 rounded-lg bg-white">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800">${act.title}</p>
                  <p class="text-xs text-gray-400">${act.date}</p>
                </div>
                <div class="text-xs text-gray-500">出勤 ${present}/${total} · ${rate}%</div>
              </div>
            `;
          }).join('')}
      </div>
    `;
  }

  document.getElementById('visitor-att-search')?.addEventListener('input', renderList);
  renderList();
}

registerRenderCallback(renderVisitorUI);

loadWorkspaceData({ role: 'all', selectedRole: null, storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init()], fallbackData: () => ACTIVITIES, logTag: 'ws-visitor' });
