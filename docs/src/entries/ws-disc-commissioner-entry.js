import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { ATTENDANCE_RECORDS, attendanceToLong, attendanceToWide, INSPECTION_RECORDS, inspectionToLong, inspectionToWide, REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS, reviewToDisplay, ACTIVITIES } from '../mock/index.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
const urlParams = CrossPageState.getURLParams();
const fromHomepage = !!urlParams.activityId || urlParams.mode === 'readonly';
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'disc-commissioner');
ViewModeStore.setMode('workspace', fromHomepage ? 'participant-observe' : 'manage');

const accent = '#D97706';
const accentRgba = 'rgba(217,119,6,0.1)';
const accentBorder = 'rgba(217,119,6,0.3)';

function renderDiscUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('disc-content');
  if (!container) return;

  container.innerHTML = `
    ${fromHomepage ? '<div class="card rounded-2xl p-4 mb-4 border border-amber-200 bg-amber-50/30"><p class="text-xs text-amber-700">您当前处于只读模式。如需进入管理模式，请从侧边栏选择角色。</p></div>' : ''}
    <div class="flex gap-2 mb-4">
      <button class="disc-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-disc-tab="attendance" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">考勤管理</button>
      <button class="disc-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-disc-tab="inspection" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考察管理</button>
      <button class="disc-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-disc-tab="review" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">活动监督复盘</button>
    </div>
    <div id="disc-tab-content"></div>
  `;

  container.querySelectorAll('.disc-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.disc-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.discTab;
      if (tab === 'attendance') _renderAttendanceContent(null);
      else if (tab === 'inspection') _renderInspectionContent();
      else if (tab === 'review') _renderReviewContent();
    });
  });

  const urlParams = CrossPageState.getURLParams();
  _renderAttendanceContent(urlParams.activityId || null);
}

function _renderAttendanceContent(filterActivityId) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const longData = attendanceToLong(ATTENDANCE_RECORDS);
  const wideData = attendanceToWide(ATTENDANCE_RECORDS);

  const filtered = filterActivityId
    ? longData.filter(r => r.activityId === filterActivityId)
    : longData;
  const filteredWide = filterActivityId
    ? attendanceToWide(ATTENDANCE_RECORDS.filter(r => r.activityId === filterActivityId))
    : wideData;

  const filterBanner = filterActivityId
    ? `<div class="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
        <span class="text-xs text-blue-700">已筛选：仅显示该活动的考勤记录</span>
        <button class="text-xs text-blue-600 hover:text-blue-800 disc-clear-filter" style="cursor:pointer;">清除筛选</button>
      </div>`
    : '';

  container.innerHTML = `
    ${filterBanner}
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考勤总表</h4>
        <div class="flex gap-2">
          <button class="att-view-btn text-xs px-2 py-1 rounded-lg border" data-view="long" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">长格式</button>
          <button class="att-view-btn text-xs px-2 py-1 rounded-lg border" data-view="wide" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">宽格式</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员维护考勤系统，组织委员的活动出勤数据直接使用本系统</div>
      <div class="flex flex-wrap gap-2 mb-3">
        <input type="text" id="att-search-input" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索姓名或活动名称...">
        <select id="att-status-filter" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          <option value="出勤">出勤</option>
          <option value="缺勤">缺勤</option>
          <option value="请假">请假</option>
        </select>
      </div>
      <div id="att-table-container"></div>
    </div>
  `;

  container.querySelector('.disc-clear-filter')?.addEventListener('click', () => {
    _renderAttendanceContent(null);
  });

  function applySearchFilter(data) {
    const searchEl = document.getElementById('att-search-input');
    const statusEl = document.getElementById('att-status-filter');
    if (!searchEl || !statusEl) return data;
    const q = searchEl.value.trim().toLowerCase();
    const s = statusEl.value;
    return data.filter(r => {
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.activity || '').toLowerCase().includes(q)) return false;
      if (s && r.status !== s) return false;
      return true;
    });
  }

  const searchInput = document.getElementById('att-search-input');
  const statusSelect = document.getElementById('att-status-filter');
  if (searchInput) searchInput.addEventListener('input', () => { renderLong(); });
  if (statusSelect) statusSelect.addEventListener('change', () => { renderLong(); });

  function renderLong() {
    const tc = document.getElementById('att-table-container');
    if (!tc) return;
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认人</th>
          </tr></thead>
          <tbody>${applySearchFilter(filtered).map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === '出勤' ? 'bg-green-100 text-green-700' : a.status === '缺勤' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${a.confirmer || '—'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  function renderWide() {
    const tc = document.getElementById('att-table-container');
    if (!tc) return;
    const searchEl = document.getElementById('att-search-input');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const rows = q
      ? filteredWide.rows.filter(r => (r.name || '').toLowerCase().includes(q))
      : filteredWide.rows;
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white">姓名</th>
            ${filteredWide.columns.map(c => `<th class="py-2 px-3 text-center text-gray-500 font-medium"><div class="text-[10px]">${c.title}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows.map(row => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">${row.name}</td>
              ${filteredWide.columns.map(c => {
                const val = row.cells[c.key] || '—';
                return `<td class="py-2 px-3 text-center text-[10px] text-gray-600">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  container.querySelectorAll('.att-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.att-view-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      if (btn.dataset.view === 'long') renderLong(); else renderWide();
    });
  });

  renderLong();
}

function _renderInspectionContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const longData = inspectionToLong(INSPECTION_RECORDS);
  const wideData = inspectionToWide(INSPECTION_RECORDS);
  const tagColor = { '支部': 'bg-red-50 text-red-600', '党小组': 'bg-blue-50 text-blue-600', '专班': 'bg-green-50 text-green-600' };
  const statusColor = { '已确认': 'bg-green-100 text-green-700', '待确认': 'bg-amber-100 text-amber-700' };

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考察总表</h4>
        <div class="flex gap-2">
          <button class="insp-view-btn text-xs px-2 py-1 rounded-lg border" data-view="long" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">长格式</button>
          <button class="insp-view-btn text-xs px-2 py-1 rounded-lg border" data-view="wide" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">宽格式</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员管理考察记录，组长上传 → 纪检确认 → 录入考察总表</div>
      <div class="flex flex-wrap gap-2 mb-3">
        <input type="text" id="insp-search-input" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索姓名或内容...">
        <select id="insp-tag-filter" class="input-flat text-xs w-24">
          <option value="">全部标签</option>
          <option value="支部">支部</option>
          <option value="党小组">党小组</option>
          <option value="专班">专班</option>
        </select>
        <select id="insp-status-filter" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          <option value="已确认">已确认</option>
          <option value="待确认">待确认</option>
        </select>
      </div>
      <div id="insp-table-container"></div>
    </div>
  `;

  function applyInspFilter(data) {
    const searchEl = document.getElementById('insp-search-input');
    const tagEl = document.getElementById('insp-tag-filter');
    const statusEl = document.getElementById('insp-status-filter');
    if (!searchEl) return data;
    const q = searchEl.value.trim().toLowerCase();
    const t = tagEl ? tagEl.value : '';
    const s = statusEl ? statusEl.value : '';
    return data.filter(r => {
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.content || '').toLowerCase().includes(q)) return false;
      if (t && r.tag !== t) return false;
      if (s && r.status !== s) return false;
      return true;
    });
  }

  const inspSearchInput = document.getElementById('insp-search-input');
  const inspTagSelect = document.getElementById('insp-tag-filter');
  const inspStatusSelect = document.getElementById('insp-status-filter');
  if (inspSearchInput) inspSearchInput.addEventListener('input', () => { renderLong(); });
  if (inspTagSelect) inspTagSelect.addEventListener('change', () => { renderLong(); });
  if (inspStatusSelect) inspStatusSelect.addEventListener('change', () => { renderLong(); });

  function renderLong() {
    const tc = document.getElementById('insp-table-container');
    if (!tc) return;
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">来源</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">标签</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          </tr></thead>
          <tbody>${applyInspFilter(longData).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${tagColor[i.tag] || 'bg-gray-50 text-gray-500'}">${i.tag}</span></td>
              <td class="py-2 px-3 text-gray-600">${i.content}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${i.status}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  function renderWide() {
    const tc = document.getElementById('insp-table-container');
    if (!tc) return;
    const searchEl = document.getElementById('insp-search-input');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const rows = q
      ? wideData.rows.filter(r => (r.name || '').toLowerCase().includes(q))
      : wideData.rows;
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium sticky left-0 bg-white">姓名</th>
            ${wideData.columns.map(c => `<th class="py-2 px-3 text-center text-gray-500 font-medium"><div class="text-[10px]">${c.title}</div><div class="text-[9px] ${tagColor[c.type] || 'text-gray-400'}">${c.type}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows.map(row => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">${row.name}</td>
              ${wideData.columns.map(c => {
                const val = row.cells[c.key] || '—';
                return `<td class="py-2 px-3 text-center text-[10px] text-gray-600">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  container.querySelectorAll('.insp-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.insp-view-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      if (btn.dataset.view === 'long') renderLong(); else renderWide();
    });
  });

  renderLong();
}

function _renderReviewContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const progressColor = { '已完成':'bg-green-100 text-green-700', '超时':'bg-red-100 text-red-700', '进行中':'bg-blue-100 text-blue-700' };
  const reviewColor = { '已上传':'bg-amber-100 text-amber-700', '未提交':'bg-red-100 text-red-700', '—':'bg-gray-100 text-gray-500' };
  const reviewData = reviewToDisplay(REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动流程监督</h4>
        <div class="text-xs text-gray-500 mb-3">阅览党小组活动/专班工作时间流 · 超时确认后邮件提醒</div>
        <div class="space-y-2">
          ${reviewData.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl ${r.overdue ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <div class="flex items-center gap-2 ml-4">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${progressColor[r.progress] || 'bg-gray-100 text-gray-500'}">${r.progress}</span>
                ${r.overdue ? '<button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 btn-disc-remind" style="cursor:pointer;">邮件提醒</button>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动复盘监督</h4>
        <div class="text-xs text-gray-500 mb-3">复盘三态流转：已上传 → 批注中 → 确认/打回</div>
        <div class="space-y-2">
          ${reviewData.filter(r => r.reviewStatus !== '—').map(r => `
            <div class="p-3 rounded-xl bg-gray-50">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${reviewColor[r.reviewStatus] || 'bg-gray-100 text-gray-500'}">${r.reviewStatus}</span>
              </div>
              ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
              <div class="flex gap-2">
                ${r.reviewStatus === '已上传' ? `
                  <button class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 btn-disc-annotate" style="cursor:pointer;">批注</button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 btn-disc-reject" style="cursor:pointer;">打回</button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 btn-disc-confirm" style="cursor:pointer;">确认</button>
                ` : ''}
                ${r.reviewStatus === '未提交' ? `
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 btn-disc-remind-review" style="cursor:pointer;">邮件提醒</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-disc-remind').forEach(btn => btn.addEventListener('click', () => showToast('success', '超时邮件提醒已发送')));
  container.querySelectorAll('.btn-disc-annotate').forEach(btn => btn.addEventListener('click', () => showToast('info', '批注功能 — 待实现')));
  container.querySelectorAll('.btn-disc-reject').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘已打回，要求重新提交')));
  container.querySelectorAll('.btn-disc-confirm').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘总结已确认，录入后台，活动结束')));
  container.querySelectorAll('.btn-disc-remind-review').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘超期邮件提醒已发送至组织者')));
}

registerRenderCallback(renderDiscUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); } catch (e) { console.warn('[ws-disc] loadDB error', e); }
  setState({ domain: 'activity', role: 'disc-commissioner', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'disc-commissioner' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-disc] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
