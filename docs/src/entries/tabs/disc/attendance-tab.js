// role: [工程师]+[AI]
// 纪检委员工作台 Tab：考勤管理（T-279 M3 拆分）
// 纪检委员维护考勤系统：待确认（请假/缺勤/超期）→ 确认 → 自动生成补课任务。
// filterActivityId 经 ctx.attendanceFilterActId 传入（URL activityId 落点直达该活动考勤）。

import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260827c';
import { attendanceToLong, attendanceToWide, getPersonName } from '../../../mock/index.js?v=20260827c';
import { solidAccentStyle } from '../../../core/constants.js?v=20260827c';
import { loadAttendanceRecords, loadActiveAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260827c';
import { loadActivities } from '../../../services/activity.js?v=20260827c';
import { autoGenerateMakeupTask } from '../../../services/makeup.js?v=20260827c';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260827c';
import { enhanceSelects } from '../../../components/custom-select.js?v=20260827c';
import { badgeHtml } from '../../../components/badge.js?v=20260827c';
import { showToast } from '../../../core/utils.js?v=20260827c';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260827c';

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const filterActivityId = ctx?.attendanceFilterActId || null;

  const allRecords = loadActiveAttendanceRecords();
  const longData = attendanceToLong(allRecords);
  const wideData = attendanceToWide(allRecords);

  // T223 修复：attendanceToLong 长表行不含 activityId，须先按原始记录过滤再转换，
  // 否则活动筛选匹配 0 条、待确认计数恒为 0、一键确认按钮永不出现。
  const filtered = filterActivityId
    ? attendanceToLong(allRecords.filter(r => r.activityId === filterActivityId))
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

  // T223 考勤交互升级：活动选择器（仅列有考勤记录的活动，按 date 降序），先选活动再查看
  const actOptions = (() => {
    const acts = loadActivities();
    const withAttendance = new Set(allRecords.map(r => r.activityId));
    return acts
      .filter(a => withAttendance.has(a.id))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map(a => `<option value="${a.id}" ${filterActivityId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`)
      .join('');
  })();
  const pendingCount = filtered.filter(r => r.confirmer === '—').length;
  const confirmedCount = filtered.length - pendingCount;
  const bulkConfirmBtn = filterActivityId && pendingCount > 0
    ? `<div class="mb-3">
        <button id="att-bulk-confirm-btn" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">
          一键确认本活动全部待确认（${pendingCount} 条）
        </button>
      </div>`
    : '';

  container.innerHTML = `
    ${filterBanner}
    ${_buildDiscDecisionPanelHTML(filterActivityId)}
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考勤总表</h3>
        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待确认</span><span class="font-bold text-orange-700">${pendingCount}</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-green-500"></span><span class="text-gray-600">已确认</span><span class="font-bold text-green-700">${confirmedCount}</span></div>
        </div>
        <div class="flex gap-2">
          <button class="att-view-btn btn-tab active" data-view="long">活动视图</button>
          <button class="att-view-btn btn-tab" data-view="wide">人视图</button>
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员维护考勤系统，组织委员的活动出勤数据直接使用本系统</div>
      ${bulkConfirmBtn}
      <div class="flex flex-wrap gap-2 mb-3">
        <select id="att-activity-select" class="input-flat text-xs min-w-[180px]">
          <option value="">全部活动</option>
          ${actOptions}
        </select>
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
    ctx.attendanceFilterActId = null;
    renderContent(ctx);
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

    // A-10 修复：考勤记录按月分组展示（按活动日期归属月份）
    const recById = new Map(allRecords.map(r => [r.id, r]));
    const actById = new Map(loadActivities().map(a => [a.id, a]));
    const groups = new Map();
    displayData.forEach(a => {
      const actId = recById.get(a.id)?.activityId;
      const date = actId ? actById.get(actId)?.date : null;
      const monthKey = date ? date.slice(0, 7) : '未排期';
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey).push(a);
    });
    // 月份降序（最新在前），未排期放最后
    const monthKeys = [...groups.keys()].sort((x, y) => {
      if (x === '未排期') return 1;
      if (y === '未排期') return -1;
      return y.localeCompare(x);
    });

    // T223：选中具体活动后隐藏「活动」列（清爽）；「全部活动」视图保留活动列
    const showActCol = !filterActivityId;
    const tableHeader = `
      <thead><tr class="border-b border-gray-200">
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
        ${showActCol ? '<th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">活动</th>' : ''}
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">状态</th>
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">确认人</th>
        <th class="sticky top-0 z-10 bg-white py-2 px-3 text-left text-gray-500 font-medium">操作</th>
      </tr></thead>`;

    tc.innerHTML = monthKeys.map(monthKey => {
      const rows = groups.get(monthKey);
      const monthLabel = monthKey === '未排期' ? '未排期活动' : `${monthKey.slice(0, 4)}年${Number(monthKey.slice(5, 7))}月`;
      return `
        <div class="mb-4 last:mb-0">
          <div class="flex items-center gap-2 mb-1.5">
            <h4 class="font-title-cn text-sm font-bold text-gray-700">${monthLabel}</h4>
            ${badgeHtml(`${rows.length} 条`, 'neutral')}
          </div>
          <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="w-full text-xs">
              ${tableHeader}
              <tbody>${rows.map(a => {
                const isPending = a.confirmer === '—';
                return `
                <tr class="border-b border-gray-50 hover:bg-gray-50 ${isPending ? 'bg-orange-50/30' : ''}">
                  <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
                  ${showActCol ? `<td class="py-2 px-3 text-gray-600">${a.activity}</td>` : ''}
                  <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${a.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : a.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : a.status === AttendanceStatus.MADE_UP ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">${a.status}</span></td>
                  <td class="py-2 px-3 text-gray-500">${isPending ? '<span class="text-orange-600">待确认</span>' : `<span class="text-green-600">${a.confirmer}</span>`}</td>
                  <td class="py-2 px-3">${isPending ? `<button class="btn-action btn-action-orange btn-disc-confirm-att" data-record-id="${a.id}">确认</button>` : '<span class="text-xs text-green-600">已确认</span>'}</td>
                </tr>
              `}).join('')}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    // 绑定确认按钮事件
    tc.querySelectorAll('.btn-disc-confirm-att').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        const records = loadAttendanceRecords();
        const record = records.find(r => r.id === recordId);
        if (record) {
          record.recordedBy = DISC_COMMISSIONER_ID;
          saveAttendanceRecords(records);
          // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
          TodoStore.completeBySource(TodoSourceType.ACTIVITY, record.activityId);
          TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${record.activityId}`);
          // 考勤确认后自动生成补课任务
          autoGenerateMakeupTask(record);
          showToast('success', `考勤记录已确认（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
          renderContent(ctx);
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
            ${filteredWide.columns.map(c => `<th class="py-2 px-3 text-center text-gray-500 font-medium"><div class="text-xs">${c.title}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows.map(row => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">${row.name}</td>
              ${filteredWide.columns.map(c => {
                const val = row.cells[c.key] || '—';
                return `<td class="py-2 px-3 text-center text-xs text-gray-600">${val}</td>`;
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
        b.style.background = 'var(--surface-card)'; b.style.color = 'var(--neutral-500)'; b.style.border = '1px solid var(--neutral-200)';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      if (btn.dataset.view === 'long') renderLong(); else renderWide();
    });
  });

  // T223：活动选择器切换 → 重新渲染对应活动考勤（filterActivityId 驱动过滤与活动列显隐）
  const actSelect = document.getElementById('att-activity-select');
  if (actSelect) {
    actSelect.addEventListener('change', () => {
      const v = actSelect.value;
      ctx.attendanceFilterActId = v || null;
      renderContent(ctx);
    });
  }

  // T223：一键确认本活动全部待确认（统一写 recordedBy + 逐条自动生成补课任务）
  container.querySelector('#att-bulk-confirm-btn')?.addEventListener('click', () => {
    if (!filterActivityId) return;
    const records = loadAttendanceRecords();
    const targets = records.filter(r => r.activityId === filterActivityId && !r.recordedBy);
    if (targets.length === 0) {
      showToast('info', '该活动没有待确认的考勤记录');
      return;
    }
    targets.forEach(r => {
      r.recordedBy = DISC_COMMISSIONER_ID;
      autoGenerateMakeupTask(r);
      // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, r.activityId);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${r.activityId}`);
    });
    saveAttendanceRecords(records);
    showToast('success', `已一键确认 ${targets.length} 条考勤记录（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
    renderContent(ctx);
  });

  renderLong();
  enhanceSelects(container);

  // 待处理面板（决策仪表盘）确认按钮：请假/缺勤/超期未确认 直达确认
  container.querySelectorAll('.btn-disc-confirm-dash').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      const records = loadAttendanceRecords();
      const record = records.find(r => r.id === recordId);
      if (record) {
        record.recordedBy = DISC_COMMISSIONER_ID;
        saveAttendanceRecords(records);
        // 做事即销待办：确认考勤 → 销书记「考勤待确认」/纪检提醒
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, record.activityId);
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${record.activityId}`);
        autoGenerateMakeupTask(record);
        showToast('success', `考勤记录已确认（确认人：${getPersonName(DISC_COMMISSIONER_ID)}）`);
        renderContent(ctx);
      }
    });
  });
}

// ── 待处理面板（决策仪表盘·异常驱动，替代数字概况） ──
function _buildDiscDecisionPanelHTML(filterActivityId) {
  const allRecords = loadActiveAttendanceRecords();
  const actById = new Map(loadActivities().map(a => [a.id, a]));
  const now = new Date();

  // 待确认事项：请假 + 异常缺勤（确认窗口仅保留给这两类）
  const pendingItems = allRecords.filter(r => {
    if (r.recordedBy) return false;
    if (filterActivityId && r.activityId !== filterActivityId) return false;
    return r.status === AttendanceStatus.LEAVE || r.status === AttendanceStatus.ABSENT;
  });

  // 超期未确认：活动日期已过且仍未确认
  const overdueItems = allRecords.filter(r => {
    if (r.recordedBy) return false;
    const act = actById.get(r.activityId);
    if (!act || !act.date) return false;
    if (filterActivityId && r.activityId !== filterActivityId) return false;
    return new Date(act.date) < now;
  });

  // 合并去重（超期未确认的请假/缺勤不重复列出）
  const seen = new Set();
  const items = [];
  [...pendingItems, ...overdueItems].forEach(r => {
    if (seen.has(r.id)) return;
    seen.add(r.id);
    items.push(r);
  });

  const leaveCount = pendingItems.filter(r => r.status === AttendanceStatus.LEAVE).length;
  const absentCount = pendingItems.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const overdueCount = overdueItems.length;

  const listHtml = items.length === 0
    ? `
      <div class="flex items-center gap-2 text-xs text-gray-400 py-2">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        无待处理事项${filterActivityId ? '（当前筛选活动）' : ''}
      </div>`
    : `
      <div class="space-y-1.5">${items.map(r => {
        const act = actById.get(r.activityId);
        const isOverdue = overdueItems.some(o => o.id === r.id);
        const statusBadge = r.status === AttendanceStatus.ABSENT
          ? badgeHtml('缺勤', 'danger')
          : badgeHtml('请假', 'warning');
        return `
          <div class="flex items-center gap-3 py-1.5 px-2 rounded-lg ${isOverdue ? 'bg-red-50/40' : 'bg-orange-50/20'}">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 truncate">${getPersonName(r.personId)}</p>
              <p class="text-xs text-gray-400 truncate">${act ? act.title : ''}${act && act.date ? ' · ' + act.date : ''}</p>
            </div>
            ${statusBadge}
            ${isOverdue ? badgeHtml('超期', 'danger') : ''}
            <button class="btn-action btn-action-orange btn-disc-confirm-dash text-xs" data-record-id="${r.id}">确认</button>
          </div>
        `;
      }).join('')}</div>`;

  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">待处理</h3>
        <div class="flex gap-3 text-xs">
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待确认请假</span><span class="font-bold text-orange-700">${leaveCount}</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-gray-600">待确认缺勤</span><span class="font-bold text-red-700">${absentCount}</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-gray-600">超期未确认</span><span class="font-bold text-amber-700">${overdueCount}</span></div>
        </div>
      </div>
      ${listHtml}
    </div>
  `;
}
