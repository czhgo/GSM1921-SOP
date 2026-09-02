// role: [工程师]+[AI]
// 纪检委员工作台 Tab：考察管理（T-279 M3 拆分）
// 专班名单区（组织→纪检 自动同步，纪检只读同源）+ 考察总表（确认/删除）。

import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260901m';
import { loadActiveInspectionRecords, getOverdueRecords, confirmInspectionRecord, deleteInspectionRecord } from '../../../services/inspection.js?v=20260901m';
import { inspectionToLong, inspectionToWide, getPersonName } from '../../../mock/index.js?v=20260901m';
import { SourceType, OutputType, deriveOutputRoute } from '../../../core/domain.js?v=20260901m';
import { badgeHtml } from '../../../components/badge.js?v=20260901m';
import { showToast, downloadCSV, triggerPrint, _fmtDate } from '../../../core/utils.js?v=20260901m';
import { HandoffStore } from '../../../services/handoff.js?v=20260901m';

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;

  const allRecords = loadActiveInspectionRecords();
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
        ${badgeHtml(`${overdueRecords.length}条`, 'danger')}
      </div>
      <div class="text-xs text-red-600">以下考察记录已超过7天未确认，请尽快处理</div>
    </div>
  ` : '';

  container.innerHTML = `
    ${_buildTaskforceRosterHTML()}
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考察总表</h3>
        <div class="flex gap-2">
          <button class="insp-view-btn btn-tab active" data-view="long">活动视图</button>
          <button class="insp-view-btn btn-tab" data-view="wide">人视图</button>
          <!-- 2026-08-28 T-304 A 档下载闭环：考察总表导出 CSV + 打印 -->
          <button class="insp-export-btn btn-tab" style="cursor:pointer;">导出 CSV</button>
          <button class="insp-print-btn btn-tab" style="cursor:pointer;">打印</button>
          <!-- 2026-08-29 T-304 C2 数据交接协议：纪检→组织 考察记录提交 -->
          <button class="insp-handoff-btn btn-tab" style="cursor:pointer;">提交考察至支委会</button>
          ${HandoffStore.hasPendingFor('inspection-report', 'inspection') ? '<span class="text-xs text-teal-600 font-medium">待组织接收</span>' : ''}
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
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-xs ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">${i.sourceType === 'activity' ? '活动' : '专班'}</span></td>
              <td class="py-2 px-3 text-gray-600">${i.content || i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-xs ${isOverdue ? statusColor.overdue : statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${isOverdue ? '超期' : i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
              <td class="py-2 px-3">${isPending || isOverdue ? `<button class="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors btn-disc-confirm-insp" data-record-id="${i.id}" style="cursor:pointer;">确认</button> <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors btn-disc-delete-insp" data-record-id="${i.id}" style="cursor:pointer;">删除</button>` : '<span class="text-xs text-green-600">已确认</span>'}</td>
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
        renderContent(ctx);
      });
    });

    // 绑定删除按钮事件
    tc.querySelectorAll('.btn-disc-delete-insp').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        if (!confirm('确认删除该考察记录？')) return;
        if (deleteInspectionRecord(recordId)) {
          showToast('success', '考察记录已删除');
          renderContent(ctx);
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
            ${wideData.columns.map(c => `<th class="py-2 px-3 text-center text-gray-500 font-medium"><div class="text-xs">${c.title}</div><div class="text-[11px] ${tagColor[c.type] || 'text-gray-400'}">${c.type}</div></th>`).join('')}
          </tr></thead>
          <tbody>${rows.map(row => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">${row.name}</td>
              ${wideData.columns.map(c => {
                const val = row.cells[c.key] || '—';
                return `<td class="py-2 px-3 text-center text-xs text-gray-600">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  // T-304 A 档下载闭环：当前视图跟踪（导出 CSV 按当前视图导出）
  let currentView = 'long';
  container.querySelectorAll('.insp-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.insp-view-btn').forEach(b => {
        b.style.background = 'var(--surface-card)'; b.style.color = 'var(--neutral-500)'; b.style.border = '1px solid var(--neutral-200)';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      currentView = btn.dataset.view;
      if (btn.dataset.view === 'long') renderLong(); else renderWide();
    });
  });

  // T-304 A 档下载闭环：导出当前视图 CSV（随当前搜索/筛选）+ 打印
  container.querySelector('.insp-export-btn')?.addEventListener('click', () => {
    const stamp = _fmtDate(new Date());
    const statusLabel = i => overdueIds.has(i.id) ? '超期' : (i.status === 'confirmed' ? '已确认' : '待确认');
    if (currentView === 'long') {
      const rows = applyInspFilter(longData).map(i => [i.name, i.source, i.sourceType, i.level, i.role || i.content, statusLabel(i)]);
      downloadCSV(`考察总表_${stamp}.csv`, ['姓名', '来源', '类别', '参与层级', '内容/角色', '状态'], rows);
    } else {
      const searchEl = document.getElementById('insp-search-input');
      const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
      const rows = q
        ? wideData.rows.filter(r => (r.name || '').toLowerCase().includes(q))
        : wideData.rows;
      downloadCSV(
        `考察人视图_${stamp}.csv`,
        ['姓名', ...wideData.columns.map(c => `${c.title}（${c.type}）`)],
        rows.map(row => [row.name, ...wideData.columns.map(c => row.cells[c.key] || '')])
      );
    }
    showToast('success', `考察表已导出（${currentView === 'long' ? '活动视图' : '人视图'}）`);
  });
  container.querySelector('.insp-print-btn')?.addEventListener('click', () => {
    triggerPrint();
  });

  // T-304 C2 数据交接协议：纪检→组织 考察记录提交（后台自动派生组织侧待办）
  // T-304 第5轮 P6 源头审校+抽查：不再要求全部确认才可提交——按已确认部分按需提交，
  // 未确认/历史超期不再阻塞已确认记录的流转（每考察记录含 recordedBy 上传人=源头审校人）。
  container.querySelector('.insp-handoff-btn')?.addEventListener('click', () => {
    if (HandoffStore.hasPendingFor('inspection-report', 'inspection')) {
      showToast('info', '考察记录已提交待组织接收，请勿重复提交');
      return;
    }
    const confirmedCount = longData.filter(r => r.status === 'confirmed').length;
    if (confirmedCount === 0) {
      showToast('error', '暂无可提交的已确认考察，请先确认（或抽查）后再提交');
      return;
    }
    HandoffStore.create({
      type: 'inspection-report',
      refType: 'inspection',
      refLabel: '考察总表',
      refId: 'inspection',
      note: `考察总表共 ${longData.length} 条，已确认 ${confirmedCount} 条提交建档（未确认 ${longData.length - confirmedCount} 条可后续补提）`,
    });
    showToast('success', `考察记录（已确认 ${confirmedCount} 条）已提交至支委会，等待组织委员接收`);
    renderContent(ctx);
  });

  renderLong();
}

// ── 专班名单区（组织→纪检 自动同步，纪检只读同源 + 考察确认进度） ──
function _buildTaskforceRosterHTML() {
  const tfs = TaskForceRecordStore.getAll().filter(t => t.status === 'recruiting' || t.status === 'active');
  if (tfs.length === 0) return '';
  const allRecords = loadActiveInspectionRecords();
  const statusMeta = {
    recruiting: { label: '招募中', cls: 'bg-blue-100 text-blue-700' },
    active: { label: '进行中', cls: 'bg-green-100 text-green-700' },
  };
  const rows = tfs.map(tf => {
    const meta = statusMeta[tf.status] || statusMeta.active;
    const tfRecords = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE && r.sourceName === tf.name);
    const total = tfRecords.length;
    const confirmed = tfRecords.filter(r => r.status === 'confirmed').length;
    const pending = total - confirmed;
    const memberNames = (tf.members || []).map(m => getPersonName(m.personId) || m.name || m.personId).filter(Boolean).join('、') || '—';
    const progressCls = pending > 0 ? 'text-orange-700' : 'text-green-700';
    // T-224 §8 产出物查看区（纪检项目看板卡片展开面板，同源读取）
    const inspRoute = deriveOutputRoute(OutputType.TASKFORCE_INSPECTION);
    const workloadRoute = deriveOutputRoute(OutputType.WORKLOAD);
    const workloadItems = (tf.members || []).flatMap(m =>
      (m.contributions || []).map(c => ({
        name: getPersonName(m.personId) || m.name || '成员',
        item: typeof c === 'string' ? c : (c.description || c.title || ''),
      }))
    );
    return `
      <div class="rounded-lg border border-gray-100 p-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-bold text-gray-800">${tf.name}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full ${meta.cls}">${meta.label}</span>
        </div>
        <p class="text-xs text-gray-500 mb-1">${tf.task || ''}</p>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-600 truncate mr-2">成员：${memberNames}</span>
          <span class="${progressCls} font-medium whitespace-nowrap">考察确认 ${confirmed}/${total}${pending > 0 ? `（待确认 ${pending}）` : ''}</span>
        </div>
        <div class="mt-2 pt-2 border-t border-gray-100">
          <button class="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1" onclick="this.nextElementSibling.classList.toggle('hidden')">
            产出物 <span>▾</span>
          </button>
          <div class="hidden mt-2 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${inspRoute.color};"></span>考察记录</span>
              <span>${total === 0 ? '未提交' : pending > 0 ? `待确认 ${pending}/${total}` : `已确认 ${total}`}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${workloadRoute.color};"></span>工作量报告</span>
              <span>${workloadItems.length > 0 ? `${workloadItems.length} 项产出` : '未生成'}</span>
            </div>
            ${workloadItems.length > 0 ? `
              <ul class="space-y-0.5 pl-3">
                ${workloadItems.slice(0, 5).map(w => `<li class="text-[11px] text-gray-500 truncate">${w.name}：${w.item}</li>`).join('')}
                ${workloadItems.length > 5 ? `<li class="text-[11px] text-gray-400">…另有 ${workloadItems.length - 5} 项</li>` : ''}
              </ul>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班名单</h3>
        <span class="text-xs text-gray-500">名单由组织委员管理，纪检只读同步（前置）</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${rows}</div>
    </div>
  `;
}
