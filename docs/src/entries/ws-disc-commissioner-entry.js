import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js';
import { saveDB } from '../services/mock.js';
import { attendanceToLong, attendanceToWide, inspectionToLong, inspectionToWide, REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS, reviewToDisplay, ACTIVITIES, PEOPLE, MOCK_TASKFORCES } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';
import { openFormModal } from '../components/modal.js';
import { loadHandoverRecords, updateHandoverRecord } from '../services/handover.js';
import { loadMakeupTasks, saveMakeupTasks, updateMakeupTask, autoGenerateMakeupTask } from '../services/makeup.js';
import { loadAttendanceRecords, saveAttendanceRecords } from '../services/attendance.js';
import { loadInspectionRecords, saveInspectionRecords } from '../services/inspection.js';

const { savedState, viewMode, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', defaultRole: 'disc-commissioner', viewMode: 'auto', accentRole: 'disc-commissioner' });
const fromHomepage = viewMode === 'participant-observe';

const DISC_COMMISSIONER_ID = 'p10'; // 纪检委员 personId

// ── 经验沉淀数据层（mockDB） ────────────────────────────

function _loadDeposits() {
  return mockDB.experienceDeposits.length > 0 ? [...mockDB.experienceDeposits] : [];
}

function _saveDeposits(deposits) {
  mockDB.experienceDeposits = [...deposits];
  saveDB();
}

function renderDiscUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('disc-content');
  if (!container) return;

  const tabBar = renderTabBar({
    prefix: 'disc',
    tabs: [
      { id: 'attendance', label: '考勤管理', render: () => _renderAttendanceContent(null) },
      { id: 'inspection', label: '考察管理', render: () => _renderInspectionContent() },
      { id: 'review', label: '活动监督复盘', render: () => _renderReviewContent() },
      { id: 'handover', label: '数据交接', render: () => _renderHandoverContent() },
      { id: 'deposit', label: '经验沉淀', render: () => _renderDepositContent() },
      { id: 'makeup', label: '补课制度', render: () => _renderMakeupContent() },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'attendance',
    renderCtx: {},
  });

  container.innerHTML = `
    ${fromHomepage ? '<div class="card rounded-2xl p-4 mb-4 border border-amber-200 bg-amber-50/30"><p class="text-xs text-amber-700">您当前处于只读模式。如需进入管理模式，请从侧边栏选择角色。</p></div>' : ''}
    ${tabBar.html}
  `;

  tabBar.bindEvents(container);

  const urlParams = CrossPageState.getURLParams();
  tabBar.activate('attendance');
  _renderAttendanceContent(urlParams.activityId || null);
}

function _renderAttendanceContent(filterActivityId) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allRecords = loadAttendanceRecords();
  const longData = attendanceToLong(allRecords);
  const wideData = attendanceToWide(allRecords);

  const filtered = filterActivityId
    ? longData.filter(r => r.activityId === filterActivityId)
    : longData;
  const filteredWide = filterActivityId
    ? attendanceToWide(allRecords.filter(r => r.activityId === filterActivityId))
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
          <option value="${AttendanceStatus.PRESENT}">出勤</option>
          <option value="${AttendanceStatus.ABSENT}">缺勤</option>
          <option value="${AttendanceStatus.LEAVE}">请假</option>
          <option value="${AttendanceStatus.MADE_UP}">已补</option>
        </select>
        <select id="att-confirm-filter" class="input-flat text-xs w-28">
          <option value="">全部确认状态</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
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
    const confirmEl = document.getElementById('att-confirm-filter');
    if (!searchEl || !statusEl) return data;
    const q = searchEl.value.trim().toLowerCase();
    const s = statusEl.value;
    const c = confirmEl ? confirmEl.value : '';
    return data.filter(r => {
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.activity || '').toLowerCase().includes(q)) return false;
      if (s && r.status !== s && ATTENDANCE_STATUS_LABELS[r.status] !== s) return false;
      if (c === 'pending' && r.confirmer !== '—') return false;
      if (c === 'confirmed' && r.confirmer === '—') return false;
      return true;
    });
  }

  const searchInput = document.getElementById('att-search-input');
  const statusSelect = document.getElementById('att-status-filter');
  const confirmSelect = document.getElementById('att-confirm-filter');
  if (searchInput) searchInput.addEventListener('input', () => { renderLong(); });
  if (statusSelect) statusSelect.addEventListener('change', () => { renderLong(); });
  if (confirmSelect) confirmSelect.addEventListener('change', () => { renderLong(); });

  function renderLong() {
    const tc = document.getElementById('att-table-container');
    if (!tc) return;
    const displayData = applySearchFilter(filtered);
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认人</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
          </tr></thead>
          <tbody>${displayData.map(a => {
            const isPending = a.confirmer === '—';
            return `
            <tr class="border-b border-gray-50 hover:bg-gray-50 ${isPending ? 'bg-amber-50/30' : ''}">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${ATTENDANCE_STATUS_LABELS[a.status] || a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${isPending ? '<span class="text-amber-600">待确认</span>' : `<span class="text-green-600">${a.confirmer}</span>`}</td>
              <td class="py-2 px-3">${isPending ? `<button class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors btn-disc-confirm-att" data-record-id="${a.id}" style="cursor:pointer;">确认</button>` : '<span class="text-[10px] text-green-600">已确认</span>'}</td>
            </tr>
          `}).join('')}</tbody>
        </table>
      </div>
    `;

    // 绑定确认按钮事件
    tc.querySelectorAll('.btn-disc-confirm-att').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        const records = loadAttendanceRecords();
        const record = records.find(r => r.id === recordId);
        if (record) {
          record.confirmer = DISC_COMMISSIONER_ID;
          saveAttendanceRecords(records);
          // 考勤确认后自动生成补课任务
          autoGenerateMakeupTask(record);
          showToast('success', `考勤记录已确认（确认人：${PEOPLE.find(p => p.id === DISC_COMMISSIONER_ID)?.name || DISC_COMMISSIONER_ID}）`);
          _renderAttendanceContent(filterActivityId);
        }
      });
    });
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

  const allRecords = loadInspectionRecords();
  const longData = inspectionToLong(allRecords);
  const wideData = inspectionToWide(allRecords);
  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-amber-100 text-amber-700' };

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
          <option value="">全部来源</option>
          <option value="activity">活动</option>
          <option value="taskforce">专班</option>
        </select>
        <select id="insp-status-filter" class="input-flat text-xs w-24">
          <option value="">全部状态</option>
          <option value="confirmed">已确认</option>
          <option value="pending">待确认</option>
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
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.role || '').toLowerCase().includes(q)) return false;
      if (t && r.sourceType !== t) return false;
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
    const displayData = applyInspFilter(longData);
    tc.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">来源</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">标签</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
          </tr></thead>
          <tbody>${displayData.map(i => {
            const isPending = i.status === 'pending';
            return `
            <tr class="border-b border-gray-50 hover:bg-gray-50 ${isPending ? 'bg-amber-50/30' : ''}">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">${i.sourceType === 'activity' ? '活动' : '专班'}</span></td>
              <td class="py-2 px-3 text-gray-600">${i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
              <td class="py-2 px-3">${isPending ? `<button class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors btn-disc-confirm-insp" data-record-id="${i.id}" style="cursor:pointer;">确认</button>` : '<span class="text-[10px] text-green-600">已确认</span>'}</td>
            </tr>
          `}).join('')}</tbody>
        </table>
      </div>
    `;

    // 绑定确认按钮事件
    tc.querySelectorAll('.btn-disc-confirm-insp').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        const records = loadInspectionRecords();
        const record = records.find(r => r.id === recordId);
        if (record) {
          record.status = 'confirmed';
          saveInspectionRecords(records);
          showToast('success', '考察记录已确认');
          _renderInspectionContent();
        }
      });
    });
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
  container.querySelectorAll('.btn-disc-annotate').forEach(btn => btn.addEventListener('click', () => {
    openFormModal({
      id: 'annotation',
      title: '添加批注',
      fields: [
        { key: 'type', label: '批注类型', type: 'select', required: true, options: [
          { value: 'suggestion', label: '建议' },
          { value: 'question', label: '疑问' },
          { value: 'correction', label: '纠正' },
          { value: 'praise', label: '肯定' }
        ]},
        { key: 'content', label: '批注内容', type: 'textarea', required: true, placeholder: '请输入批注内容...' }
      ],
      onSubmit: (values) => {
        showToast('success', '批注已添加');
      },
      accentColor: accent || '#D97706'
    });
  }));
  container.querySelectorAll('.btn-disc-reject').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘已打回，要求重新提交')));
  container.querySelectorAll('.btn-disc-confirm').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘总结已确认，录入后台，活动结束')));
  container.querySelectorAll('.btn-disc-remind-review').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘超期邮件提醒已发送至组织者')));
}

// ── 交接记录状态标签 ──────────────────────────────────────────
function _discHandoverStatusStyle(status) {
  switch (status) {
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'submitted': return 'bg-amber-100 text-amber-700';
    case 'confirmed': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function _discHandoverStatusLabel(status) {
  switch (status) {
    case 'in_progress': return '进行中';
    case 'submitted': return '已提交';
    case 'confirmed': return '已确认';
    default: return status;
  }
}

/** 格式化时间（月-日 时:分） */
function _discFormatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 渲染数据交接 Tab 内容（纪检委员视角） */
function _renderHandoverContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allRecords = loadHandoverRecords();

  // 按状态分组
  const inProgressRecords = allRecords.filter(r => r.status === 'in_progress');
  const submittedRecords = allRecords.filter(r => r.status === 'submitted');
  const confirmedRecords = allRecords.filter(r => r.status === 'confirmed');

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 统计概览 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">数据交接概览</h4>
        <div class="flex gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="text-gray-600">进行中</span>
            <span class="font-bold text-blue-700">${inProgressRecords.length}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-gray-600">已提交</span>
            <span class="font-bold text-amber-700">${submittedRecords.length}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            <span class="text-gray-600">已确认</span>
            <span class="font-bold text-green-700">${confirmedRecords.length}</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-2">所有交接数据汇总到纪检委员处，纪检委员有义务催促未完成交接的组织者</div>
      </div>

      <!-- 进行中 -->
      ${inProgressRecords.length > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">进行中的交接</h4>
        <div class="text-xs text-gray-500 mb-3">组织者正在填写交接数据，可催促其尽快完成</div>
        <div class="space-y-2" id="disc-handover-in-progress">
          ${inProgressRecords.map(r => _renderDiscHandoverRecord(r, 'in_progress')).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已提交 -->
      ${submittedRecords.length > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#F59E0B;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">待确认的交接</h4>
        <div class="text-xs text-gray-500 mb-3">组织者已提交交接数据，请审核后确认</div>
        <div class="space-y-2" id="disc-handover-submitted">
          ${submittedRecords.map(r => _renderDiscHandoverRecord(r, 'submitted')).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已确认 -->
      ${confirmedRecords.length > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">已确认的交接</h4>
        <div class="text-xs text-gray-500 mb-3">交接数据已确认完成</div>
        <div class="space-y-2" id="disc-handover-confirmed">
          ${confirmedRecords.map(r => _renderDiscHandoverRecord(r, 'confirmed')).join('')}
        </div>
      </div>
      ` : ''}

      ${allRecords.length === 0 ? '<div class="card rounded-2xl p-5 text-center"><p class="text-xs text-gray-400 py-6">暂无交接记录</p></div>' : ''}
    </div>
  `;

  _bindDiscHandoverEvents();
}

/** 渲染单条交接记录（纪检委员视角） */
function _renderDiscHandoverRecord(r, group) {
  const recorderName = PEOPLE.find(p => p.id === r.recorderId)?.name || r.recorderId;
  const completedItems = r.items.filter(i => i.status === 'completed').length;
  const totalItems = r.items.length;
  const typeLabel = r.type === 'activity' ? '活动' : '专班';

  return `
    <div class="p-3 rounded-xl bg-gray-50" data-disc-handover-id="${r.id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-1.5 py-0.5 rounded ${r.type === 'activity' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}">${typeLabel}</span>
          <span class="text-sm font-medium text-gray-800">${r.sourceName}</span>
          <span class="px-1.5 py-0.5 rounded-full text-[10px] ${_discHandoverStatusStyle(r.status)}">${_discHandoverStatusLabel(r.status)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-gray-500">${completedItems}/${totalItems} 项</span>
          ${group === 'in_progress' ? `<button class="btn-disc-urge-handover text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors" style="cursor:pointer;" data-record-id="${r.id}">催促</button>` : ''}
          ${group === 'submitted' ? `<button class="btn-disc-confirm-handover text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;" data-record-id="${r.id}">确认</button>` : ''}
        </div>
      </div>
      <div class="text-[10px] text-gray-500 mb-1">记录人：${recorderName} · 创建于 ${_discFormatTime(r.createdAt)}</div>
      ${r.hasArchiveAssignment ? `<div class="text-[10px] text-indigo-600 mb-1">归档沉淀维护：${PEOPLE.find(p => p.id === r.archiveAssigneeId)?.name || r.archiveAssigneeId || '—'}</div>` : ''}
      ${r.submittedAt ? `<div class="text-[10px] text-amber-600 mb-1">提交于 ${_discFormatTime(r.submittedAt)}</div>` : ''}
      ${r.confirmedAt ? `<div class="text-[10px] text-green-600 mb-1">确认于 ${_discFormatTime(r.confirmedAt)}</div>` : ''}

      <!-- 交接项详情（可展开） -->
      <div class="mt-2">
        <button class="btn-disc-toggle-handover-detail text-[10px] text-gray-500 hover:text-gray-700 transition-colors" style="cursor:pointer;border:none;background:none;padding:0;" data-record-id="${r.id}">
          查看交接项详情 ▾
        </button>
        <div class="disc-handover-detail hidden mt-2 space-y-1" data-detail-for="${r.id}">
          ${r.items.map((item, idx) => {
            const assigneeName = PEOPLE.find(p => p.id === item.assigneeId)?.name || item.assigneeId;
            return `
              <div class="flex items-center justify-between p-2 rounded-lg ${item.status === 'completed' ? 'bg-green-50' : 'bg-white'} border border-gray-100">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-gray-700">${item.name}</span>
                    <span class="px-1 py-0.5 rounded text-[10px] ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${item.status === 'completed' ? '已完成' : '待完成'}</span>
                  </div>
                  <div class="text-[10px] text-gray-400 mt-0.5">${item.description ? item.description + ' · ' : ''}负责人：${assigneeName}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/** 绑定纪检委员数据交接 Tab 事件 */
function _bindDiscHandoverEvents() {
  const tabContent = document.getElementById('disc-tab-content');
  if (!tabContent) return;

  // 催促按钮
  tabContent.querySelectorAll('.btn-disc-urge-handover').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const records = loadHandoverRecords();
      const record = records.find(r => r.id === recordId);
      if (record) {
        const recorderName = PEOPLE.find(p => p.id === record.recorderId)?.name || record.recorderId;
        showToast('success', `催促邮件已发送至 ${recorderName}，提醒其尽快完成数据交接`);
      }
    });
  });

  // 确认按钮
  tabContent.querySelectorAll('.btn-disc-confirm-handover').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      updateHandoverRecord(recordId, {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
      });
      showToast('success', '交接记录已确认');
      _renderHandoverContent();
    });
  });

  // 展开/收起交接项详情
  tabContent.querySelectorAll('.btn-disc-toggle-handover-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const detailEl = tabContent.querySelector(`.disc-handover-detail[data-detail-for="${recordId}"]`);
      if (detailEl) {
        detailEl.classList.toggle('hidden');
        btn.textContent = detailEl.classList.contains('hidden') ? '查看交接项详情 ▾' : '收起交接项详情 ▴';
      }
    });
  });
}

// ── 补课制度 Tab（纪检委员视角） ──────────────────────────────
function _renderMakeupContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allTasks = loadMakeupTasks();

  // 检查超期状态
  const today = new Date().toISOString().slice(0, 10);
  allTasks.forEach(t => {
    if (t.status === 'pending' && t.deadline < today) {
      t.status = 'overdue';
    }
  });
  saveMakeupTasks(allTasks);

  const pendingTasks = allTasks.filter(t => t.status === 'pending');
  const overdueTasks = allTasks.filter(t => t.status === 'overdue');
  const completedTasks = allTasks.filter(t => t.status === 'completed');
  const pendingCount = pendingTasks.length;
  const overdueCount = overdueTasks.length;
  const completedCount = completedTasks.length;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 统计概览 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">补课制度概览</h4>
        <div class="flex gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-gray-600">待补课</span>
            <span class="font-bold text-amber-700">${pendingCount}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            <span class="text-gray-600">超期</span>
            <span class="font-bold text-red-700">${overdueCount}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            <span class="text-gray-600">已完成</span>
            <span class="font-bold text-green-700">${completedCount}</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-2">三会一课缺勤必须补课，主题党日缺勤建议补课；补课完成后自动回写考勤记录</div>
      </div>

      <!-- 待补课列表（含超期） -->
      ${(pendingCount + overdueCount) > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#F59E0B;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">待补课人员</h4>
        <div class="text-xs text-gray-500 mb-3">缺勤人员需在截止日期前完成补课，超期将标红提醒</div>
        <div class="space-y-2" id="disc-makeup-pending">
          ${overdueTasks.map(t => _renderMakeupTaskCard(t)).join('')}
          ${pendingTasks.map(t => _renderMakeupTaskCard(t)).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已完成列表（折叠） -->
      ${completedCount > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
        <details>
          <summary class="font-title-cn text-sm font-bold text-gray-700 cursor-pointer">已完成补课（${completedCount}人）</summary>
          <div class="mt-3 space-y-2" id="disc-makeup-completed">
            ${completedTasks.map(t => _renderMakeupTaskCard(t)).join('')}
          </div>
        </details>
      </div>
      ` : ''}

      ${allTasks.length === 0 ? '<div class="card rounded-2xl p-5 text-center"><p class="text-xs text-gray-400 py-6">暂无补课任务</p></div>' : ''}
    </div>
  `;

  _bindMakeupEvents();
}

/** 渲染单条补课任务卡片 */
function _renderMakeupTaskCard(t) {
  const isOverdue = t.status === 'overdue';
  const isCompleted = t.status === 'completed';

  return `
    <div class="p-3 rounded-xl ${isOverdue ? 'bg-red-50 border border-red-100' : isCompleted ? 'bg-green-50' : 'bg-gray-50'}" data-makeup-id="${t.id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${t.personName}</span>
          <span class="text-xs text-gray-500">|</span>
          <span class="text-xs text-gray-600">${t.activityName}</span>
        </div>
        <div class="flex items-center gap-2">
          ${t.isMandatory
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">必须</span>'
            : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">建议</span>'
          }
          ${isOverdue ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">超期</span>' : ''}
          ${isCompleted ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">已补</span>' : ''}
        </div>
      </div>
      <div class="text-[10px] text-gray-500 mb-2">缺勤日期：${t.absentDate} · 截止日期：${t.deadline}${isCompleted && t.completedAt ? ' · 完成时间：' + t.completedAt.slice(0, 10) : ''}</div>
      ${t.proofContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">补课证明：${t.proofContent}</div>` : ''}
      ${!isCompleted ? `
        <div class="flex gap-2">
          <button class="btn-makeup-complete text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;" data-task-id="${t.id}">标记已补</button>
          <button class="btn-makeup-proof text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors" style="cursor:pointer;" data-task-id="${t.id}">提交证明</button>
        </div>
        <!-- 证明输入区（默认隐藏） -->
        <div class="makeup-proof-form hidden mt-2 pt-2 border-t border-gray-200" data-form-for="${t.id}">
          <textarea class="input-flat text-xs w-full" rows="2" placeholder="输入补课证明内容..." data-proof-input="${t.id}"></textarea>
          <div class="flex gap-2 mt-1">
            <button class="btn-makeup-submit-proof text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors" style="cursor:pointer;" data-task-id="${t.id}">保存证明</button>
            <button class="btn-makeup-cancel-proof text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" style="cursor:pointer;" data-task-id="${t.id}">取消</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/** 绑定补课制度 Tab 事件 */
function _bindMakeupEvents() {
  const tabContent = document.getElementById('disc-tab-content');
  if (!tabContent) return;

  // 标记已补按钮
  tabContent.querySelectorAll('.btn-makeup-complete').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      if (!confirm('确认该人员已完成补课？确认后考勤记录将回写为"已补"。')) return;

      // 1. 更新补课任务状态
      updateMakeupTask(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      // 2. 回写考勤记录
      const tasks = loadMakeupTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && task.attendanceRecordId) {
        const records = loadAttendanceRecords();
        const record = records.find(r => r.id === task.attendanceRecordId);
        if (record) {
          record.status = AttendanceStatus.MADE_UP;
          saveAttendanceRecords(records);
        }
      }

      showToast('success', '补课已完成，考勤记录已回写');
      _renderMakeupContent();
    });
  });

  // 提交证明按钮 — 显示证明输入区
  tabContent.querySelectorAll('.btn-makeup-proof').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      const form = tabContent.querySelector(`.makeup-proof-form[data-form-for="${taskId}"]`);
      if (form) form.classList.remove('hidden');
    });
  });

  // 取消证明输入
  tabContent.querySelectorAll('.btn-makeup-cancel-proof').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      const form = tabContent.querySelector(`.makeup-proof-form[data-form-for="${taskId}"]`);
      if (form) form.classList.add('hidden');
    });
  });

  // 保存证明
  tabContent.querySelectorAll('.btn-makeup-submit-proof').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      const input = tabContent.querySelector(`[data-proof-input="${taskId}"]`);
      const content = input?.value?.trim();
      if (!content) { showToast('error', '请输入补课证明内容'); return; }

      updateMakeupTask(taskId, { proofContent: content });
      showToast('success', '补课证明已保存');
      _renderMakeupContent();
    });
  });
}

// ── 经验沉淀 Tab（纪检委员视角） ──────────────────────────────
function _renderDepositContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allDeposits = _loadDeposits();
  const submittedDeposits = allDeposits.filter(d => d.status === 'submitted');
  const annotatedDeposits = allDeposits.filter(d => d.status === 'annotated');
  const confirmedDeposits = allDeposits.filter(d => d.status === 'confirmed');

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 统计概览 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#D97706;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">经验沉淀概览</h4>
        <div class="flex gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="text-gray-600">待批注</span>
            <span class="font-bold text-blue-700">${submittedDeposits.length}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-gray-600">已批注</span>
            <span class="font-bold text-amber-700">${annotatedDeposits.length}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            <span class="text-gray-600">已确认</span>
            <span class="font-bold text-green-700">${confirmedDeposits.length}</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-2">深度参与者提交经验沉淀，纪检委员批注确认后录入后台</div>
      </div>

      <!-- 待批注 -->
      ${submittedDeposits.length > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">待批注的沉淀</h4>
        <div class="text-xs text-gray-500 mb-3">深度参与者已提交经验沉淀，请批注后确认</div>
        <div class="space-y-2" id="disc-deposit-submitted">
          ${submittedDeposits.map(d => _renderDiscDepositCard(d, 'submitted')).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已批注 -->
      ${annotatedDeposits.length > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#F59E0B;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">已批注的沉淀</h4>
        <div class="text-xs text-gray-500 mb-3">已添加批注，确认后录入后台</div>
        <div class="space-y-2" id="disc-deposit-annotated">
          ${annotatedDeposits.map(d => _renderDiscDepositCard(d, 'annotated')).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已确认 -->
      ${confirmedDeposits.length > 0 ? `
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">已确认的沉淀</h4>
        <div class="text-xs text-gray-500 mb-3">经验沉淀已确认，录入后台</div>
        <div class="space-y-2" id="disc-deposit-confirmed">
          ${confirmedDeposits.map(d => _renderDiscDepositCard(d, 'confirmed')).join('')}
        </div>
      </div>
      ` : ''}

      ${allDeposits.length === 0 ? '<div class="card rounded-2xl p-5 text-center"><p class="text-xs text-gray-400 py-6">暂无经验沉淀记录</p></div>' : ''}
    </div>
  `;

  _bindDiscDepositEvents();
}

function _renderDiscDepositCard(d, group) {
  const submitterName = PEOPLE.find(p => p.id === d.submitterId)?.name || d.submitterId;
  const sourceLabel = d.sourceType === 'activity' ? '活动' : '专班';
  const sourceColor = d.sourceType === 'activity' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600';

  return `
    <div class="p-3 rounded-xl bg-gray-50" data-disc-deposit-id="${d.id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-1.5 py-0.5 rounded ${sourceColor}">${sourceLabel}</span>
          <span class="text-sm font-medium text-gray-800">${d.title}</span>
        </div>
        <div class="flex items-center gap-2">
          ${group === 'submitted' ? `
            <button class="btn-disc-annotate-deposit text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors" style="cursor:pointer;" data-deposit-id="${d.id}">批注</button>
            <button class="btn-disc-confirm-deposit text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;" data-deposit-id="${d.id}">确认</button>
          ` : ''}
          ${group === 'annotated' ? `
            <button class="btn-disc-confirm-deposit text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;" data-deposit-id="${d.id}">确认</button>
          ` : ''}
        </div>
      </div>
      <div class="text-[10px] text-gray-500 mb-1">提交人：${submitterName} · 来源：${d.sourceName} · ${_discFormatTime(d.createdAt)}</div>
      <div class="text-xs text-gray-700 mb-2 p-2 bg-white rounded-lg border border-gray-100 whitespace-pre-wrap">${d.content}</div>
      ${d.tags && d.tags.length > 0 ? `<div class="flex flex-wrap gap-1 mb-2">${d.tags.map(t => `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">${t}</span>`).join('')}</div>` : ''}
      ${d.annotations && d.annotations.length > 0 ? `
        <div class="border-t border-gray-200 pt-2 mt-2">
          <div class="text-[10px] text-amber-600 font-medium mb-1">纪检批注：</div>
          ${d.annotations.map(a => `
            <div class="text-xs text-gray-600 p-1.5 bg-amber-50 rounded mb-1">${a.content} <span class="text-[10px] text-gray-400">— ${_discFormatTime(a.annotatedAt)}</span></div>
          `).join('')}
        </div>
      ` : ''}
      <!-- 批注输入区（默认隐藏） -->
      <div class="disc-deposit-annotate-form hidden mt-2 pt-2 border-t border-gray-200" data-form-for="${d.id}">
        <textarea class="input-flat text-xs w-full" rows="2" placeholder="输入批注内容..." data-annotate-input="${d.id}"></textarea>
        <div class="flex gap-2 mt-1">
          <button class="btn-disc-submit-annotation text-xs px-2 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors" style="cursor:pointer;" data-deposit-id="${d.id}">提交批注</button>
          <button class="btn-disc-cancel-annotation text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" style="cursor:pointer;" data-deposit-id="${d.id}">取消</button>
        </div>
      </div>
    </div>
  `;
}

function _bindDiscDepositEvents() {
  const tabContent = document.getElementById('disc-tab-content');
  if (!tabContent) return;

  // 批注按钮 — 显示批注输入区
  tabContent.querySelectorAll('.btn-disc-annotate-deposit').forEach(btn => {
    btn.addEventListener('click', () => {
      const depositId = btn.dataset.depositId;
      const form = tabContent.querySelector(`.disc-deposit-annotate-form[data-form-for="${depositId}"]`);
      if (form) form.classList.remove('hidden');
    });
  });

  // 取消批注
  tabContent.querySelectorAll('.btn-disc-cancel-annotation').forEach(btn => {
    btn.addEventListener('click', () => {
      const depositId = btn.dataset.depositId;
      const form = tabContent.querySelector(`.disc-deposit-annotate-form[data-form-for="${depositId}"]`);
      if (form) form.classList.add('hidden');
    });
  });

  // 提交批注
  tabContent.querySelectorAll('.btn-disc-submit-annotation').forEach(btn => {
    btn.addEventListener('click', () => {
      const depositId = btn.dataset.depositId;
      const input = tabContent.querySelector(`[data-annotate-input="${depositId}"]`);
      const content = input?.value?.trim();
      if (!content) { showToast('error', '请输入批注内容'); return; }

      const deposits = _loadDeposits();
      const d = deposits.find(d => d.id === depositId);
      if (d) {
        if (!d.annotations) d.annotations = [];
        d.annotations.push({
          content,
          annotatorId: DISC_COMMISSIONER_ID,
          annotatedAt: new Date().toISOString(),
        });
        d.status = 'annotated';
        _saveDeposits(deposits);
        showToast('success', '批注已提交');
        _renderDepositContent();
      }
    });
  });

  // 确认按钮
  tabContent.querySelectorAll('.btn-disc-confirm-deposit').forEach(btn => {
    btn.addEventListener('click', () => {
      const depositId = btn.dataset.depositId;
      const deposits = _loadDeposits();
      const d = deposits.find(d => d.id === depositId);
      if (d) {
        d.status = 'confirmed';
        d.confirmedAt = new Date().toISOString();
        _saveDeposits(deposits);
        showToast('success', '经验沉淀已确认，录入后台');
        _renderDepositContent();
      }
    });
  });
}

registerRenderCallback(renderDiscUI);

loadWorkspaceData({ role: 'disc-commissioner', fallbackData: () => ACTIVITIES, logTag: 'ws-disc' });
