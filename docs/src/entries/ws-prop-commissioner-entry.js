import { renderTabBar } from '../components/tab-bar.js';
import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { ACTIVITIES, _personName } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';

const { savedState, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', defaultRole: 'prop-commissioner', viewMode: 'manage', accentRole: 'prop-commissioner' });

function renderPropUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('prop-content');
  if (!container) return;

  const taskforces = TaskForceRecordStore.getAll();
  const propTf = taskforces.filter(t => t.name.includes('宣传') || t.initiator === 'p12');

  const tabBar = renderTabBar({
    prefix: 'prop',
    tabs: [
      { id: 'kanban', label: '活动与专班', render: (ctx) => _renderKanbanContent(ctx.activities, ctx.propTf) },
      { id: 'workload', label: '宣传专班工作量', render: (ctx) => _renderWorkloadContent(ctx.propTf) },
      { id: 'multitable', label: '多维表格', render: (ctx) => _renderMultitableContent(ctx.activities) },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    renderCtx: { activities, propTf },
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  tabBar.activate('kanban');
}

function _renderKanbanContent(activities, propTf) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // ── 从 TaskForceRecordStore 动态派生看板数据（H-1 数据断裂修复） ──
  // 活动按状态分桶
  const pendingActs = activities.filter(a => a.status === 'draft');
  const activeActs = activities.filter(a => a.status === 'published' || a.status === 'ongoing');
  const completedActs = activities.filter(a => a.status === 'completed');

  // 专班按状态分桶（宣传相关）
  const pendingTf = propTf.filter(t => t.status === 'draft' || t.status === 'pending_review' || t.status === 'recruiting');
  const activeTf = propTf.filter(t => t.status === 'active');
  const completedTf = propTf.filter(t => t.status === 'completed');

  // 合并待启动：活动 + 专班
  const pending = [
    ...pendingActs.map(a => ({ _type: 'activity', ...a })),
    ...pendingTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ];
  // 合并进行中：活动 + 专班
  const active = [
    ...activeActs.map(a => ({ _type: 'activity', ...a })),
    ...activeTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ];
  // 合并已归档：活动 + 专班
  const completed = [
    ...completedActs.map(a => ({ _type: 'activity', ...a })),
    ...completedTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ];

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="card rounded-2xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(206,17,38,0.06);color:#ce1126;border-bottom:2px solid rgba(206,17,38,0.15);">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待启动项目</p>' :
            pending.map(item => _renderKanbanItem(item)).join('')}
        </div>
      </div>
      <div class="card rounded-2xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${active.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中项目</p>' :
            active.map(item => _renderKanbanItem(item, true)).join('')}
        </div>
      </div>
    </div>
    ${completed.length > 0 ? `
    <details class="card rounded-2xl p-0 overflow-hidden">
      <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="background:rgba(107,114,128,0.06);color:#6B7280;border-bottom:2px solid rgba(107,114,128,0.15);">已归档 (${completed.length})</summary>
      <div class="p-3 space-y-2">
        ${completed.map(item => _renderKanbanItem(item)).join('')}
      </div>
    </details>` : ''}
  `;

  // ── "确认完成"按钮事件绑定 ──
  container.querySelectorAll('.activity-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归入已归档。`);
      if (!confirmed) return;
      activity.status = 'completed';
      BranchService.updateActivity(actId, { status: 'completed' });
      showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
      renderPropUI(getAppState());
    });
  });
  container.querySelectorAll('.tf-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tfId = btn.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf || tf.status !== 'active') return;
      const confirmed = window.confirm(`确认完成专班「${tf.name}」？完成后将归入已归档。`);
      if (!confirmed) return;
      TaskForceRecordStore.update(tfId, { status: 'completed' });
      showToast('success', `专班「${tf.name}」已完成并归档`);
      renderPropUI(getAppState());
    });
  });
}

function _renderKanbanItem(item, showCompleteBtn = false) {
  const isTf = item._type === 'taskforce';
  const typeTag = isTf
    ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">专班</span>'
    : (item.type ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">${item.type}</span>` : '');
  const subInfo = isTf
    ? `<span class="text-[10px] text-gray-400">${item.filled}/${item.capacity} 人</span>`
    : '';
  const completeBtn = showCompleteBtn
    ? (isTf
      ? `<button class="tf-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-tf-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`
      : `<button class="activity-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`)
    : '';
  return `
    <div class="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800">${item.title || '未命名'}</span>
        ${typeTag}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">${item.date || ''} ${subInfo}</div>
      ${isTf && item.task ? `<div class="text-[11px] text-gray-400 mt-0.5 line-clamp-1">${item.task}</div>` : ''}
      ${completeBtn}
    </div>`;
}

function _renderWorkloadContent(propTf) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const workloadMap = {};
  propTf.forEach(tf => {
    tf.members.forEach(m => {
      if (!m.personId) return;
      if (!workloadMap[m.personId]) workloadMap[m.personId] = { personId: m.personId, contributions: 0, tfCount: 0, roles: new Set() };
      workloadMap[m.personId].contributions += (m.contributions || []).length;
      workloadMap[m.personId].tfCount += 1;
      workloadMap[m.personId].roles.add(m.role);
    });
  });
  const members = Object.values(workloadMap);

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-sm font-semibold text-gray-700">宣传专班工作量</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">${propTf.length} 个专班</span>
      </div>
      ${members.length === 0 ? '<p class="text-xs text-gray-400">暂无宣传专班成员数据</p>' :
        `<div class="space-y-2">${members.map(m => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-50">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
              <span class="text-[10px] text-gray-400">${Array.from(m.roles).join('·')}</span>
            </div>
            <div class="flex items-center gap-3 text-[10px] text-gray-500">
              <span>${m.contributions} 产出</span>
              <span>${m.tfCount} 专班</span>
            </div>
          </div>
        `).join('')}</div>`}
    </div>
  `;
}

function _renderMultitableContent(activities) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // ── 转置数据准备（§8.1b） ──
  const taskforces = TaskForceRecordStore.getAll();
  // 构建"人 x 活动"交叉数据：从活动organizer/participants + 专班members提取
  const personActivityMap = {}; // personId → { name, activityCells: { actId: role } }
  const activityColumns = activities.map(a => ({ id: a.id, title: a.title, type: a.type, date: a.date }));

  // 从活动的 organizer 和 participants 字段提取
  activities.forEach(a => {
    if (a.organizer) {
      if (!personActivityMap[a.organizer]) personActivityMap[a.organizer] = { name: _personName(a.organizer), activityCells: {} };
      personActivityMap[a.organizer].activityCells[a.id] = '组织者';
    }
    if (a.participants && Array.isArray(a.participants)) {
      a.participants.forEach(pid => {
        if (!personActivityMap[pid]) personActivityMap[pid] = { name: _personName(pid), activityCells: {} };
        if (!personActivityMap[pid].activityCells[a.id]) {
          personActivityMap[pid].activityCells[a.id] = '参与者';
        }
      });
    }
  });

  // 从专班members提取（关联activityId）
  taskforces.forEach(tf => {
    if (!tf.activityId) return;
    tf.members.forEach(m => {
      if (!m.personId) return;
      if (!personActivityMap[m.personId]) personActivityMap[m.personId] = { name: _personName(m.personId), activityCells: {} };
      if (!personActivityMap[m.personId].activityCells[tf.activityId]) {
        personActivityMap[m.personId].activityCells[tf.activityId] = m.role || '专班成员';
      }
    });
  });

  const wideRows = Object.entries(personActivityMap).map(([pid, data]) => ({
    personId: pid,
    name: data.name,
    cells: data.activityCells,
  }));

  let currentView = 'long'; // 默认活动视图（§8.1b 规则3）

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">多维表格视图</h4>
        <div class="flex gap-1">
          <button class="prop-view-btn text-[11px] px-2.5 py-1 rounded-lg border transition-colors" data-view="long" style="background:rgba(16,185,129,0.1);color:#10B981;border-color:rgba(16,185,129,0.3);">活动视图</button>
          <button class="prop-view-btn text-[11px] px-2.5 py-1 rounded-lg border transition-colors" data-view="wide" style="background:white;color:#6B7280;border-color:#E5E7EB;">人视图</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">宣传委员可按多维度查看活动与专班数据</div>
      <div class="flex flex-wrap gap-2 mb-3">
        <input type="text" id="prop-mt-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索活动名称或类型...">
        <select id="prop-mt-type-filter" class="input-flat text-xs w-28">
          <option value="">全部类型</option>
          <option value="主题党日">主题党日</option>
          <option value="志愿服务">志愿服务</option>
          <option value="理论学习">理论学习</option>
          <option value="组织生活">组织生活</option>
          <option value="社会实践">社会实践</option>
        </select>
        <select id="prop-mt-status-filter" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
      </div>
      <div id="prop-mt-table"></div>
    </div>
  `;

  // ── 转置按钮事件 ──
  container.querySelectorAll('.prop-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      container.querySelectorAll('.prop-view-btn').forEach(b => {
        if (b.dataset.view === currentView) {
          b.style.background = 'rgba(16,185,129,0.1)';
          b.style.color = '#10B981';
          b.style.borderColor = 'rgba(16,185,129,0.3)';
        } else {
          b.style.background = 'white';
          b.style.color = '#6B7280';
          b.style.borderColor = '#E5E7EB';
        }
      });
      renderTable();
    });
  });

  function renderLong(filtered) {
    return `
      <div class="text-xs text-gray-400 mb-2">${filtered.length} 条记录</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动名称</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">类型</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">日期</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">组织者</th>
          </tr></thead>
          <tbody>${filtered.map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.title || '未命名'}</td>
              <td class="py-2 px-3 text-gray-600">${a.type || '—'}</td>
              <td class="py-2 px-3 text-gray-600">${a.date || '—'}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === 'published' || a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${a.status === 'published' ? '已发布' : a.status === 'completed' ? '已完成' : '草稿'}</span></td>
              <td class="py-2 px-3 text-gray-600">${a.organizer ? _personName(a.organizer) : '—'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderWide(filtered) {
    const filteredIds = new Set(filtered.map(a => a.id));
    const filteredCols = activityColumns.filter(c => filteredIds.has(c.id));
    const filteredWideRows = wideRows.filter(r => {
      const q = (document.getElementById('prop-mt-search')?.value || '').trim().toLowerCase();
      return !q || r.name.toLowerCase().includes(q);
    });

    if (filteredWideRows.length === 0) {
      return '<p class="text-xs text-gray-400 text-center py-6">暂无人视图数据</p>';
    }

    return `
      <div class="text-xs text-gray-400 mb-2">${filteredWideRows.length} 人 × ${filteredCols.length} 活动</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white z-10 min-w-[5rem]">姓名</th>
            ${filteredCols.map(c => `<th class="py-2 px-3 text-left text-gray-500 font-medium whitespace-nowrap" title="${c.title}（${c.type}）">${c.title.length > 6 ? c.title.slice(0, 6) + '…' : c.title}</th>`).join('')}
          </tr></thead>
          <tbody>${filteredWideRows.map(r => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white z-10">${r.name}</td>
              ${filteredCols.map(c => {
                const cell = r.cells[c.id];
                if (!cell) return '<td class="py-2 px-3 text-gray-300">—</td>';
                const cellColor = cell === '组织者' ? 'bg-blue-50 text-blue-700' : cell === '参与者' ? 'bg-gray-50 text-gray-600' : 'bg-green-50 text-green-700';
                return `<td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${cellColor}">${cell}</span></td>`;
              }).join('')}
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderTable() {
    const tableEl = document.getElementById('prop-mt-table');
    if (!tableEl) return;
    const q = (document.getElementById('prop-mt-search')?.value || '').trim().toLowerCase();
    const tf = document.getElementById('prop-mt-type-filter')?.value || '';
    const sf = document.getElementById('prop-mt-status-filter')?.value || '';
    const filtered = activities.filter(a => {
      if (q && !(a.title || '').toLowerCase().includes(q) && !(a.type || '').toLowerCase().includes(q)) return false;
      if (tf && a.type !== tf) return false;
      if (sf && a.status !== sf) return false;
      return true;
    });

    tableEl.innerHTML = currentView === 'long' ? renderLong(filtered) : renderWide(filtered);
  }

  document.getElementById('prop-mt-search')?.addEventListener('input', renderTable);
  document.getElementById('prop-mt-type-filter')?.addEventListener('change', renderTable);
  document.getElementById('prop-mt-status-filter')?.addEventListener('change', renderTable);
  renderTable();
}

registerRenderCallback(renderPropUI);

loadWorkspaceData({ role: 'prop-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => ACTIVITIES, logTag: 'ws-prop' });
