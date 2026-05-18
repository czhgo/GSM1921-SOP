import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { INSPECTION_RECORDS, inspectionToLong, REVIEW_RECORDS, reviewToDisplay, ACTIVITIES } from '../mock/index.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'organizer');
ViewModeStore.setMode('workspace', 'manage');

const accent = '#3B82F6';
const accentRgba = 'rgba(59,130,246,0.1)';
const accentBorder = 'rgba(59,130,246,0.3)';

function _filterByRole(state, role) {
  const activities = (state.activities || []).filter(a => {
    if (role === 'organizer') return a.organizer && !a.organizer.includes('leader');
    return true;
  });
  return { ...state, activities };
}

function renderOrganizerUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('organizer-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'organizer');
  const filteredActivities = filteredState.activities || [];

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="tasks" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">任务分配</button>
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="review" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">复盘提交</button>
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="inspection" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考察查看</button>
    </div>
    <div id="orgz-tab-content"></div>
  `;

  container.querySelectorAll('.orgz-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.orgz-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.orgzTab;
      if (tab === 'tasks') _renderTasksContent(filteredActivities);
      else if (tab === 'review') _renderReviewContent();
      else if (tab === 'inspection') _renderInspectionContent();
    });
  });

  _renderTasksContent(filteredActivities);
}

function _renderTasksContent(activities) {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">关联活动</h4>
      <div class="text-xs text-gray-500 mb-3">组织者对关联活动有任务分配和进度追踪权限</div>
      <div class="space-y-2">
        ${activities.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无关联活动</p>' :
          activities.map(a => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full ${a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${a.status === 'published' ? '已发布' : '草稿'}</span>
            </div>
          `).join('')}
      </div>
    </div>
  `;
}

function _renderReviewContent() {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;
  const reviewData = reviewToDisplay(REVIEW_RECORDS, []);
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">复盘提交</h4>
      <div class="text-xs text-gray-500 mb-3">组织者须在活动结束后 T+7 天内提交复盘总结，纪检委员监督</div>
      <div class="space-y-2">
        ${reviewData.map(r => `
          <div class="p-3 rounded-xl bg-gray-50">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium text-gray-800">${r.activity}</div>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full ${r.reviewStatus === '已上传' ? 'bg-amber-100 text-amber-700' : r.reviewStatus === '未提交' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}">${r.reviewStatus}</span>
            </div>
            ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
            <div class="flex gap-2">
              ${r.reviewStatus === '—' || r.reviewStatus === '未提交' ? '<button class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 btn-orgz-submit-review" style="cursor:pointer;">提交复盘</button>' : ''}
              ${r.reviewStatus === '已上传' ? '<span class="text-[10px] text-amber-600">等待纪检委员确认</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('.btn-orgz-submit-review').forEach(btn => {
    btn.addEventListener('click', () => showToast('info', '复盘提交表单 — 待实现'));
  });
}

function _renderInspectionContent() {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">考察查看</h4>
      <div class="text-xs text-gray-500 mb-3">组织者对自己组织的活动整体考察情况有只读权限</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(INSPECTION_RECORDS).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3 text-gray-600">${i.content}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${i.status === '已确认' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${i.status}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

registerRenderCallback(renderOrganizerUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); } catch (e) { console.warn('[ws-organizer] loadDB error', e); }
  setState({ domain: 'activity', role: 'organizer', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'organizer' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-organizer] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
