// role: [工程师]+[AI]
// 宣传委员工作台 Tab：周报报送（T-279 M3 拆分，照 M2 样板）
// 周报 seed 常量 + mockDB 持久化，刷新不再丢失；T-209 改进项②：新建周次内联表单。

import { icon } from '../../../core/icons.js?v=20260901u';
import { solidAccentStyle } from '../../../core/constants.js?v=20260901u';
import { showToast } from '../../../core/utils.js?v=20260901u';
import { persist } from '../../../core/data-adapter.js?v=20260901u';
import { mockDB } from '../../../core/domain.js?v=20260901u';
import { AuthStore } from '../../../services/auth.js?v=20260901u';

// ── 周报报送 seed 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
const WEEKLY_REPORTS_SEED = [
  { id: 'wr1', week: '第30周', weekRange: '2026-07-21 ~ 2026-07-25', content: '1. 七一主题党日活动新闻稿发布\n2. 发展对象公示推送排版完成\n3. 上半年活动照片归档整理进行中', status: 'submitted', submittedAt: '2026-07-25' },
  { id: 'wr2', week: '第29周', weekRange: '2026-07-14 ~ 2026-07-18', content: '1. 入党积极分子培训资料归档完成\n2. 组织生活会预告推送发布\n3. 配合组织委员完成发展对象材料审核', status: 'submitted', submittedAt: '2026-07-18' },
  { id: 'wr3', week: '第28周', weekRange: '2026-07-07 ~ 2026-07-11', content: '1. 预备党员转正大会新闻稿起草\n2. 七一活动素材整理\n3. 宣传专栏内容更新', status: 'submitted', submittedAt: '2026-07-11' },
  { id: 'wr4', week: '第31周', weekRange: '2026-07-28 ~ 2026-08-01', content: '', status: 'draft', submittedAt: null },
];

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.weeklyReports 后调用 persist()
function _loadWeeklyReports() {
  if (mockDB.weeklyReports.length === 0 && WEEKLY_REPORTS_SEED.length > 0) {
    mockDB.weeklyReports = WEEKLY_REPORTS_SEED.map(r => ({ ...r }));
  }
  return mockDB.weeklyReports;
}

const WEEKLY_STATUS_LABEL = { draft: '草稿', submitted: '已报送' };
const WEEKLY_STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-green-50 text-green-700 border-green-200',
};

export function renderContent(ctx) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const draftReport = _loadWeeklyReports().filter(r => r.status === 'draft').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      <div class="lg:col-span-2 card rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            ${icon('pencil', { className: 'w-4 h-4 text-blue-600' })}
            <h4 class="text-sm font-bold text-gray-700">填写周报</h4>
            ${draftReport ? `<span class="text-xs px-1.5 py-0.5 rounded-full border ${WEEKLY_STATUS_STYLE.draft}">${draftReport.week}</span>` : ''}
          </div>
          <button id="weekly-add-btn" class="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">+ 新增周次</button>
        </div>
        <!-- T-209 改进项②：新建周次内联表单（周次标签 + 日期范围） -->
        <div id="weekly-add-form" class="hidden mb-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
          <div class="text-[12px] font-bold text-gray-600 mb-2">新建周次</div>
          <div class="flex flex-col gap-2 mb-2">
            <input id="weekly-add-week" type="text" placeholder="周次标签，如：第32周" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <input id="weekly-add-range" type="text" placeholder="日期范围，如：2026-08-04 ~ 2026-08-08" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div class="flex gap-2 justify-end">
            <button id="weekly-add-cancel" type="button" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
            <button id="weekly-add-save" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">保存</button>
          </div>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择周次</label>
            <select id="weekly-week" class="input-flat text-xs w-full">
              ${_loadWeeklyReports().map(r => `<option value="${r.id}" ${draftReport && r.id === draftReport.id ? 'selected' : ''}>${r.week}（${r.weekRange}）</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">周报内容</label>
            <textarea id="weekly-content" rows="6" placeholder="请填写本周工作内容，每条一行..." class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none">${draftReport ? draftReport.content : ''}</textarea>
          </div>
          <button id="weekly-submit-btn" class="w-full text-sm px-4 py-[7px] font-medium text-white rounded-lg transition-colors" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">报送</button>
        </div>
      </div>

      <div class="lg:col-span-3 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('clock', { className: 'w-4 h-4 text-gray-500' })}
          <h4 class="text-sm font-bold text-gray-700">报送历史</h4>
        </div>
        <div class="space-y-2">
          ${_loadWeeklyReports().map(r => _renderWeeklyReportItem(r)).join('')}
        </div>
      </div>
    </div>
  `;

  // T-209 改进项②：新增周次表单（展开/取消/保存）
  container.querySelector('#weekly-add-btn').addEventListener('click', () => {
    container.querySelector('#weekly-add-form').classList.toggle('hidden');
  });
  container.querySelector('#weekly-add-cancel')?.addEventListener('click', () => {
    container.querySelector('#weekly-add-form').classList.add('hidden');
  });
  container.querySelector('#weekly-add-save')?.addEventListener('click', () => {
    const week = container.querySelector('#weekly-add-week').value.trim();
    const weekRange = container.querySelector('#weekly-add-range').value.trim();
    if (!week) { showToast('error', '请填写周次标签'); return; }
    if (!weekRange) { showToast('error', '请填写日期范围'); return; }
    const reports = _loadWeeklyReports();
    if (reports.some(r => r.week === week)) { showToast('error', '该周次已存在'); return; }
    reports.push({
      id: 'wr_' + Date.now(),
      week,
      weekRange,
      content: '',
      status: 'draft',
      submittedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: AuthStore.getCurrentUser()?.personId || 'u_prop',
    });
    mockDB.weeklyReports = reports;
    persist();
    showToast('success', '已新建周次，自动选中待填写');
    renderContent(ctx);
  });

  // 报送按钮
  const submitBtn = container.querySelector('#weekly-submit-btn');
  submitBtn.addEventListener('click', () => {
    const selectEl = container.querySelector('#weekly-week');
    const textareaEl = container.querySelector('#weekly-content');
    const reportId = selectEl.value;
    const content = textareaEl.value.trim();
    if (!content) {
      showToast('error', '请填写周报内容');
      return;
    }
    const report = _loadWeeklyReports().find(r => r.id === reportId);
    if (!report) return;
    report.content = content;
    report.status = 'submitted';
    report.submittedAt = new Date().toISOString().slice(0, 10);
    persist();
    showToast('success', `${report.week}周报已报送`);
    renderContent(ctx);
  });

  // 展开/折叠历史详情
  container.querySelectorAll('.weekly-detail-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const detailEl = btn.closest('.weekly-report-item').querySelector('.weekly-detail-content');
      if (detailEl) {
        detailEl.classList.toggle('hidden');
        btn.textContent = detailEl.classList.contains('hidden') ? '展开' : '收起';
      }
    });
  });
}

function _renderWeeklyReportItem(report) {
  const statusStyle = WEEKLY_STATUS_STYLE[report.status];
  const isSubmitted = report.status === 'submitted';
  return `
    <div class="weekly-report-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${report.week}</span>
          <span class="text-xs text-gray-400">${report.weekRange}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle}">${WEEKLY_STATUS_LABEL[report.status]}</span>
        </div>
        <div class="flex items-center gap-2">
          ${isSubmitted && report.submittedAt ? `<span class="text-xs text-gray-400">报送于 ${report.submittedAt}</span>` : ''}
          ${report.content ? `<button class="weekly-detail-toggle text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">展开</button>` : ''}
        </div>
      </div>
      ${report.content ? `<div class="weekly-detail-content hidden mt-2 p-2.5 rounded-lg bg-gray-50 text-xs text-gray-600 whitespace-pre-line">${report.content}</div>` : '<p class="text-xs text-gray-400 mt-1">暂无内容</p>'}
    </div>`;
}
