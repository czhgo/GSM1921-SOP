import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../core/domain.js';
import { saveDB } from '../services/mock.js';
import { attendanceToLong, attendanceToWide, inspectionToLong, inspectionToWide, REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS, reviewToDisplay, ACTIVITIES, PEOPLE, getPersonName, MOCK_TASKFORCES } from '../mock/index.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';
import { openFormModal } from '../components/modal.js';
import { loadHandoverRecords, updateHandoverRecord } from '../services/handover.js';
import { autoGenerateMakeupTask } from '../services/makeup.js';
import { loadAttendanceRecords, saveAttendanceRecords } from '../services/attendance.js';
import { loadInspectionRecords, saveInspectionRecords, getOverdueRecords, getRecordsBySource, getRecordsByPerson, confirmInspectionRecord, deleteInspectionRecord } from '../services/inspection.js';

const { accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', accentRole: 'disc-commissioner' });

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
      { id: 'review', label: '活动监督复盘', render: () => _renderReviewContent() },
      { id: 'inspection', label: '考察管理', render: () => _renderInspectionContent() },
      { id: 'handover', label: '数据交接', render: () => _renderHandoverContent() },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'attendance',
    renderCtx: {},
    storageKey: 'workflowos_tab_disc',
  });

  container.innerHTML = `
    ${tabBar.html}
  `;

  tabBar.bindEvents(container);

  const urlParams = CrossPageState.getURLParams();
  if (urlParams.activityId) {
    tabBar.activate('attendance');
    _renderAttendanceContent(urlParams.activityId);
  } else {
    tabBar.activate(tabBar.activeTab);
  }
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
    <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#C2410C;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考勤总表</h4>
        <div class="flex gap-2">
          <button class="att-view-btn text-xs px-2 py-1 rounded-lg border" data-view="long" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">活动视图</button>
          <button class="att-view-btn text-xs px-2 py-1 rounded-lg border" data-view="wide" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">人视图</button>
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
            <tr class="border-b border-gray-50 hover:bg-gray-50 ${isPending ? 'bg-orange-50/30' : ''}">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">${ATTENDANCE_STATUS_LABELS[a.status] || a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${isPending ? '<span class="text-orange-600">待确认</span>' : `<span class="text-green-600">${a.confirmer}</span>`}</td>
              <td class="py-2 px-3">${isPending ? `<button class="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors btn-disc-confirm-att" data-record-id="${a.id}" style="cursor:pointer;">确认</button>` : '<span class="text-[10px] text-green-600">已确认</span>'}</td>
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
          showToast('success', `考勤记录已确认（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
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
  const overdueRecords = getOverdueRecords(7);
  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-orange-100 text-orange-700', 'overdue': 'bg-red-100 text-red-700' };

  // 超期提醒
  const overdueHtml = overdueRecords.length > 0 ? `
    <div class="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold text-red-700">超期提醒</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">${overdueRecords.length}条</span>
      </div>
      <div class="text-xs text-red-600">以下考察记录已超过7天未确认，请尽快处理</div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#C2410C;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考察总表</h4>
        <div class="flex gap-2">
          <button class="insp-view-btn text-xs px-2 py-1 rounded-lg border" data-view="long" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">活动视图</button>
          <button class="insp-view-btn text-xs px-2 py-1 rounded-lg border" data-view="wide" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">人视图</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员管理考察记录，党小组组长/组织委员上传 → 纪检确认 → 录入考察总表</div>
      ${overdueHtml}
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
          <option value="overdue">超期</option>
        </select>
      </div>
      <div id="insp-table-container"></div>
    </div>
  `;

  const overdueIds = new Set(overdueRecords.map(r => r.id));

  function applyInspFilter(data) {
    const searchEl = document.getElementById('insp-search-input');
    const tagEl = document.getElementById('insp-tag-filter');
    const statusEl = document.getElementById('insp-status-filter');
    if (!searchEl) return data;
    const q = searchEl.value.trim().toLowerCase();
    const t = tagEl ? tagEl.value : '';
    const s = statusEl ? statusEl.value : '';
    return data.filter(r => {
      if (q && !(r.name || '').toLowerCase().includes(q) && !(r.role || '').toLowerCase().includes(q) && !(r.source || '').toLowerCase().includes(q)) return false;
      if (t && r.sourceType !== t) return false;
      if (s === 'overdue') return overdueIds.has(r.id);
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
            <th class="py-2 px-3 text-left text-gray-500 font-medium">类别</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
          </tr></thead>
          <tbody>${displayData.map(i => {
            const isPending = i.status === 'pending';
            const isOverdue = overdueIds.has(i.id);
            const rowBg = isOverdue ? 'bg-red-50/40' : isPending ? 'bg-orange-50/30' : '';
            return `
            <tr class="border-b border-gray-50 hover:bg-gray-50 ${rowBg}">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">${i.sourceType === 'activity' ? '活动' : '专班'}</span></td>
              <td class="py-2 px-3 text-gray-600">${i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${isOverdue ? statusColor.overdue : statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${isOverdue ? '超期' : i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
              <td class="py-2 px-3">${isPending || isOverdue ? `<button class="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors btn-disc-confirm-insp" data-record-id="${i.id}" style="cursor:pointer;">确认</button> <button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors btn-disc-delete-insp" data-record-id="${i.id}" style="cursor:pointer;">删除</button>` : '<span class="text-[10px] text-green-600">已确认</span>'}</td>
            </tr>
          `}).join('')}</tbody>
        </table>
      </div>
    `;

    // 绑定确认按钮事件
    tc.querySelectorAll('.btn-disc-confirm-insp').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        confirmInspectionRecord(recordId);
        showToast('success', '考察记录已确认');
        _renderInspectionContent();
      });
    });

    // 绑定删除按钮事件
    tc.querySelectorAll('.btn-disc-delete-insp').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        if (!confirm('确认删除该考察记录？')) return;
        if (deleteInspectionRecord(recordId)) {
          showToast('success', '考察记录已删除');
          _renderInspectionContent();
        } else {
          showToast('error', '只能删除待确认状态的记录');
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
  const reviewColor = { '已上传':'bg-orange-100 text-orange-700', '未提交':'bg-red-100 text-red-700', '—':'bg-gray-100 text-gray-500' };
  const reviewData = reviewToDisplay(REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS);

  // 经验沉淀交叉引用：判断已完成复盘的活动是否已有沉淀
  const deposits = _loadDeposits();
  const depositedSources = new Set(deposits.map(d => d.sourceName));
  function hasDeposit(reviewItem) {
    const name = reviewItem.sourceName || reviewItem.activity;
    return depositedSources.has(name);
  }

  // 经验沉淀督促清单：已确认复盘但未沉淀的活动
  const unDepositedReviews = reviewData.filter(r => r.reviewStatus === '已确认' && !hasDeposit(r));

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#C2410C;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动流程监督</h4>
        <div class="text-xs text-gray-500 mb-3">阅览党小组活动/专班工作时间流 · 超时确认后邮件提醒</div>
        <div class="space-y-2">
          ${reviewData.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white ${r.overdue ? 'border border-red-100' : ''}">
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
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#C2410C;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动复盘监督</h4>
        <div class="text-xs text-gray-500 mb-3">复盘三态流转：已上传 → 批注中 → 确认/打回</div>
        <div class="space-y-2">
          ${reviewData.filter(r => r.reviewStatus !== '—').map(r => `
            <div class="p-3 rounded-xl bg-white">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full ${reviewColor[r.reviewStatus] || 'bg-gray-100 text-gray-500'}">${r.reviewStatus}</span>
                  ${r.reviewStatus === '已确认' ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full ${hasDeposit(r) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${hasDeposit(r) ? '已沉淀' : '未沉淀'}</span>` : ''}
                </div>
              </div>
              ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
              <div class="flex gap-2">
                ${r.reviewStatus === '已上传' ? `
                  <button class="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 btn-disc-annotate" style="cursor:pointer;">批注</button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 btn-disc-reject" style="cursor:pointer;">打回</button>
                  <button class="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 btn-disc-confirm" style="cursor:pointer;">确认</button>
                ` : ''}
                ${r.reviewStatus === '未提交' ? `
                  <button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 btn-disc-remind-review" style="cursor:pointer;">邮件提醒</button>
                ` : ''}
                ${r.reviewStatus === '已确认' && !hasDeposit(r) ? `
                  <button class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 btn-disc-urge-deposit" style="cursor:pointer;" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ${unDepositedReviews.length > 0 ? `
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#D97706;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">经验沉淀督促清单</h4>
        <div class="text-xs text-gray-500 mb-3">以下活动复盘已确认但尚未沉淀经验，请督促深度参与者提交</div>
        <div class="space-y-2">
          ${unDepositedReviews.map(r => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${r.activity}</div>
                <div class="text-xs text-gray-500 mt-0.5">组织者：${r.organizer}</div>
              </div>
              <button class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 btn-disc-urge-deposit" style="cursor:pointer;" data-activity-name="${r.sourceName || r.activity}" data-organizer="${r.organizer}">督促沉淀</button>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
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
      accentColor: accent || '#C2410C'
    });
  }));
  container.querySelectorAll('.btn-disc-reject').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘已打回，要求重新提交')));
  container.querySelectorAll('.btn-disc-confirm').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘总结已确认，录入后台，活动结束')));
  container.querySelectorAll('.btn-disc-remind-review').forEach(btn => btn.addEventListener('click', () => showToast('success', '复盘超期邮件提醒已发送至组织者')));
  // 督促沉淀按钮
  container.querySelectorAll('.btn-disc-urge-deposit').forEach(btn => btn.addEventListener('click', () => {
    const organizer = btn.dataset.organizer;
    showToast('success', `已发送沉淀督促提醒至 ${organizer}`);
  }));
}

// ── 交接记录状态标签 ──────────────────────────────────────────
function _discHandoverStatusStyle(status) {
  switch (status) {
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'submitted': return 'bg-orange-100 text-orange-700';
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
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#C2410C;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">数据交接概览</h4>
        <div class="flex gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span class="text-gray-600">进行中</span>
            <span class="font-bold text-blue-700">${inProgressRecords.length}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
            <span class="text-gray-600">已提交</span>
            <span class="font-bold text-orange-700">${submittedRecords.length}</span>
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
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--accent-disc-commissioner);">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">进行中的交接</h4>
        <div class="text-xs text-gray-500 mb-3">组织者正在填写交接数据，可催促其尽快完成</div>
        <div class="space-y-2" id="disc-handover-in-progress">
          ${inProgressRecords.map(r => _renderDiscHandoverRecord(r, 'in_progress')).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已提交 -->
      ${submittedRecords.length > 0 ? `
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:#C2410C;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">待确认的交接</h4>
        <div class="text-xs text-gray-500 mb-3">组织者已提交交接数据，请审核后确认</div>
        <div class="space-y-2" id="disc-handover-submitted">
          ${submittedRecords.map(r => _renderDiscHandoverRecord(r, 'submitted')).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 已确认 -->
      ${confirmedRecords.length > 0 ? `
      <div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--accent-disc-commissioner-light);">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">已确认的交接</h4>
        <div class="text-xs text-gray-500 mb-3">交接数据已确认完成</div>
        <div class="space-y-2" id="disc-handover-confirmed">
          ${confirmedRecords.map(r => _renderDiscHandoverRecord(r, 'confirmed')).join('')}
        </div>
      </div>
      ` : ''}

      ${allRecords.length === 0 ? '<div class="card rounded-xl p-5 text-center"><p class="text-xs text-gray-400 py-6">暂无交接记录</p></div>' : ''}
    </div>
  `;

  _bindDiscHandoverEvents();
}

/** 渲染单条交接记录（纪检委员视角） */
function _renderDiscHandoverRecord(r, group) {
  const recorderName = getPersonName(r.recorderId);
  const completedItems = r.items.filter(i => i.status === 'completed').length;
  const totalItems = r.items.length;
  const typeLabel = r.type === 'activity' ? '活动' : '专班';

  return `
    <div class="p-3 rounded-xl bg-white" data-disc-handover-id="${r.id}">
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
      ${r.hasArchiveAssignment ? `<div class="text-[10px] text-indigo-600 mb-1">归档沉淀维护：${getPersonName(r.archiveAssigneeId)}</div>` : ''}
      ${r.submittedAt ? `<div class="text-[10px] text-orange-600 mb-1">提交于 ${_discFormatTime(r.submittedAt)}</div>` : ''}
      ${r.confirmedAt ? `<div class="text-[10px] text-green-600 mb-1">确认于 ${_discFormatTime(r.confirmedAt)}</div>` : ''}

      <!-- 交接项详情（可展开） -->
      <div class="mt-2">
        <button class="btn-disc-toggle-handover-detail text-[10px] text-gray-500 hover:text-gray-700 transition-colors" style="cursor:pointer;border:none;background:none;padding:0;" data-record-id="${r.id}">
          查看交接项详情 ▾
        </button>
        <div class="disc-handover-detail hidden mt-2 space-y-1" data-detail-for="${r.id}">
          ${r.items.map((item, idx) => {
            const assigneeName = getPersonName(item.assigneeId);
            return `
              <div class="flex items-center justify-between p-2 rounded-lg bg-white">
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
        const recorderName = getPersonName(record.recorderId);
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

registerRenderCallback(renderDiscUI);

loadWorkspaceData({ role: 'disc-commissioner', fallbackData: () => ACTIVITIES, logTag: 'ws-disc' });
