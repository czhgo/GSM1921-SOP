import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { ATTENDANCE_RECORDS, attendanceToLong, INSPECTION_RECORDS, inspectionToLong, ACTIVITIES } from '../mock/index.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'leader');
ViewModeStore.setMode('workspace', 'manage');

const accent = '#CE1126';
const accentRgba = 'rgba(206,17,38,0.1)';
const accentBorder = 'rgba(206,17,38,0.3)';

function _filterByRole(state, role) {
  const activities = (state.activities || []).filter(a => {
    if (role === 'leader') return a.direction === 'top-down' || (a.organizer && a.organizer.includes('leader'));
    return true;
  });
  return { ...state, activities };
}

function renderLeaderUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('leader-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'leader');
  const filteredActivities = filteredState.activities || [];

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="leader-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-leader-tab="write" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">活动写入</button>
      <button class="leader-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-leader-tab="attendance" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考勤上传</button>
      <button class="leader-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-leader-tab="inspection" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考察上传</button>
    </div>
    <div id="leader-tab-content"></div>
  `;

  container.querySelectorAll('.leader-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.leader-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.leaderTab;
      if (tab === 'write') _renderWriteContent(filteredActivities);
      else if (tab === 'attendance') _renderAttendanceContent();
      else if (tab === 'inspection') _renderInspectionContent();
    });
  });

  _renderWriteContent(filteredActivities);
}

function _renderWriteContent(activities) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">活动写入</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200" id="btn-leader-create" style="cursor:pointer;">创建活动</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">组长可创建自下而上活动，写入后自动同步至日历</div>
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
  container.querySelector('#btn-leader-create')?.addEventListener('click', () => showToast('info', '活动创建表单 — 待实现'));
}

function _renderAttendanceContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;
  const myAttendance = ATTENDANCE_RECORDS.filter(r => r.activityId && ACTIVITIES.find(a => a.id === r.activityId)?.type === '党小组');
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考勤上传</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200" id="btn-leader-upload-att" style="cursor:pointer;">上传考勤表单</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考勤：组长上传 → 纪检委员确认 → 录入考勤总表</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${attendanceToLong(myAttendance).map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === '出勤' ? 'bg-green-100 text-green-700' : a.status === '缺勤' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${a.confirmer === '—' ? '待确认' : '已确认'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
  container.querySelector('#btn-leader-upload-att')?.addEventListener('click', () => showToast('info', '考勤表单上传 — 待接入持久化层'));
}

function _renderInspectionContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;
  const myInspection = INSPECTION_RECORDS.filter(r => r.tag === '党小组');
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考察上传</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200" id="btn-leader-upload-insp" style="cursor:pointer;">上传考察表单</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考察：组长上传 → 纪检委员确认 → 录入考察总表</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(myInspection).map(i => `
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
  container.querySelector('#btn-leader-upload-insp')?.addEventListener('click', () => showToast('info', '考察表单上传 — 待接入持久化层'));
}

registerRenderCallback(renderLeaderUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); } catch (e) { console.warn('[ws-leader] loadDB error', e); }
  setState({ domain: 'activity', role: 'leader', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'leader' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-leader] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
