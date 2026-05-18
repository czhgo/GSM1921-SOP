import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { KANBAN_MOCKS, ACTIVITIES } from '../mock/index.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'prop-commissioner');
ViewModeStore.setMode('workspace', 'manage');

const accent = '#10B981';
const accentRgba = 'rgba(16,185,129,0.1)';
const accentBorder = 'rgba(16,185,129,0.3)';

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
  const propTf = taskforces.filter(t => t.name.includes('宣传') || t.initiator.includes('宣传'));

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="prop-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-prop-tab="kanban" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">活动与专班</button>
      <button class="prop-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-prop-tab="workload" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">宣传专班工作量</button>
      <button class="prop-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-prop-tab="multitable" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">多维表格</button>
    </div>
    <div id="prop-tab-content"></div>
  `;

  container.querySelectorAll('.prop-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.prop-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.propTab;
      if (tab === 'kanban') _renderKanbanContent(activities);
      else if (tab === 'workload') _renderWorkloadContent(propTf);
      else if (tab === 'multitable') _renderMultitableContent(activities);
    });
  });

  _renderKanbanContent(activities);
}

function _renderKanbanContent(activities) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;
  const pending = activities.filter(a => a.status === 'draft');
  const active = activities.filter(a => a.status === 'published' || a.status === 'ongoing');
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="card rounded-2xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(206,17,38,0.06);color:#ce1126;border-bottom:2px solid rgba(206,17,38,0.15);">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待启动活动</p>' :
            pending.map(a => `
              <div class="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
              </div>
            `).join('')}
        </div>
      </div>
      <div class="card rounded-2xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${active.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中活动</p>' :
            active.map(a => `
              <div class="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
}

function _renderWorkloadContent(propTf) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const workloadMap = {};
  propTf.forEach(tf => {
    tf.members.forEach(m => {
      if (m.name === '待招募') return;
      if (!workloadMap[m.name]) workloadMap[m.name] = { name: m.name, contributions: 0, tfCount: 0, roles: new Set() };
      workloadMap[m.name].contributions += (m.contributions || 0);
      workloadMap[m.name].tfCount += 1;
      workloadMap[m.name].roles.add(m.role);
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
              <span class="text-xs font-medium text-gray-700">${m.name}</span>
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
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">多维表格视图</h4>
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
    tableEl.innerHTML = `
      <div class="text-xs text-gray-400 mb-2">${filtered.length} 条记录</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动名称</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">类型</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">日期</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">宣传需求</th>
          </tr></thead>
          <tbody>${filtered.map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.title || '未命名'}</td>
              <td class="py-2 px-3 text-gray-600">${a.type || '—'}</td>
              <td class="py-2 px-3 text-gray-600">${a.date || '—'}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${a.status === 'published' ? '已发布' : '草稿'}</span></td>
              <td class="py-2 px-3 text-gray-500">待确认</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  document.getElementById('prop-mt-search')?.addEventListener('input', renderTable);
  document.getElementById('prop-mt-type-filter')?.addEventListener('change', renderTable);
  document.getElementById('prop-mt-status-filter')?.addEventListener('change', renderTable);
  renderTable();
}

registerRenderCallback(renderPropUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); TaskForceRecordStore.init(); } catch (e) { console.warn('[ws-prop] loadDB error', e); }
  setState({ domain: 'activity', role: 'prop-commissioner', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'prop-commissioner' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-prop] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
