// role: [工程师]+[AI]
// 宣传委员工作台 Tab：周报报送（T-279 M3 拆分，照 M2 样板）
// 周报 seed 常量 + mockDB 持久化，刷新不再丢失；T-209 改进项②：新建周次内联表单。

import { icon } from '../../../core/base/icons.js?v=20261018h';
import { showToast, todayLocal } from '../../../core/base/utils.js?v=20261018h';
import { persist } from '../../../data/data-adapter.js?v=20261018h';
import { mockDB } from '../../../core/domain/domain.js?v=20261018h';
import { AuthStore } from '../../../services/core/auth.js?v=20261018h';
import { POLICY_DEFAULTS } from '../../../core/domain/policy-defaults.js?v=20261018h';
import { attachArchivePolicySnapshot, deriveArchivePeriod, compareArchivePeriodDesc } from '../../../services/governance/periodic-archive.js?v=20261018h';
import { generateId } from '../../../core/base/id.js?v=20261018h';
import { loadActivities } from '../../../services/activity/activity.js?v=20261018h';
import { NoticeStore } from '../../../services/governance/notice.js?v=20261018h';
import { getPersonName } from '../../../services/member/person.js?v=20261018h';
import { PERIODIC_ARCHIVE_REVIEW_STATUS, PERIODIC_ARCHIVE_REVIEW_LABELS, periodicArchiveReviewStatusOf } from '../../../services/governance/secretary-overview.js?v=20261018h';
// 批次 352（`D-746` · `D-744`② 业务过程类余项）：周报「作废（软）」——统一写口 ＋ 支委层判据
import * as SoftVoid from '../../../services/governance/soft-void.js?v=20261018h';
import { openVoidModal } from '../../../components/ui/void-record.js?v=20261018h';

// ── 周报报送 seed 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
// 2026-09-12 修正：起止原整体晚一天（第30周误记 07-21~07-25 等）→ 按 ISO 周「周一~周五」口径校准
//（第30周=2026-07-20~07-24 / 第31周=2026-07-27~07-31），与 _weekDefaults 派生同口径。
// 2026-09-28 批次 234：常量**搬到内容单一源** `docs/src/data/mock/prop.js`（服务端 `server/seed.js` 同源 import，
//   原先此处私有常量被服务端逐字复刻一份 ⇒ 两份字面量，本批收成一份；取值与顺序一字未改）。
import { PERIODIC_ARCHIVES_SEED } from '../../../data/mock/prop.js?v=20261018h';

// 从 mockDB 读取（seed 兜底注入一次）；写操作更新 mockDB.periodicArchives 后调用 persist()
function _loadPeriodicArchives() {
  if (mockDB.periodicArchives.length === 0 && PERIODIC_ARCHIVES_SEED.length > 0) {
    mockDB.periodicArchives = PERIODIC_ARCHIVES_SEED.map(r => ({ ...r }));
  }
  return mockDB.periodicArchives;
}

/** 周期归档按期次日期降序——策略切换后周/月记录仍按时间同序展示
 *  批次 352（`D-746`）：已作废（`voided`）的周报不进下拉、也不在历史里显示（留痕仍可回查）；
 *  ⚠ 过滤只在此处做——`_loadPeriodicArchives()` 保持原样，否则写回时会丢掉已作废行。 */
function _sortedReports() {
  return SoftVoid.filterActive('periodicArchives', _loadPeriodicArchives())
    .sort(compareArchivePeriodDesc);
}

const WEEKLY_STATUS_LABEL = { draft: '草稿', submitted: '已报送' };
const WEEKLY_STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-green-50 text-green-700 border-green-200',
};
const WEEKLY_REVIEW_STYLE = {
  pending: 'bg-sky-50 text-sky-700 border-sky-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  returned: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ── 自动生成报送内容（SOP-B-40 ②，2026-09-19 批次 94）──────────────
// 「基于活动数据自动生成报送内容」：取该周次起止区间内的活动（口径＝活动主源 date），
// 逐条「活动名（类型）· 日期」。**只是草稿起点**——生成后仍可手改（不覆盖已写内容前先问一句）。
function _autoWeeklyContent(weekRange) {
  const [from, to] = String(weekRange || '').split('~').map(s => s.trim());
  return loadActivities()
    .filter(a => a && a.date && (!from || a.date >= from) && (!to || a.date <= to))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((a, i) => `${i + 1}. ${a.title || '未命名活动'}${a.type ? `（${a.type}）` : ''}${a.date ? ` · ${a.date}` : ''}`)
    .join('\n');
}

function _weekDefaults(now = new Date(), unit = POLICY_DEFAULTS.archive.periodic.unit) {
  const period = deriveArchivePeriod(unit, now);
  return { week: period.label, range: period.range, key: period.key, unit: period.unit };
}

// 批次 367（`#10` 单一轴 · 支书 2026-10-04 裁「**周报作为 归档的一个 特例即可！！**」）：
//   原独立「周报报送」页签**降为「档案归档」页内折叠区**（页签 10 → 9）——故本函数改收**宿主容器**，
//   实现单一源仍是本文件（**不复制表单**，由 `archive-tab.js` 的 `#archive-weekly-host` 挂载）。
export function renderContent(ctx, host = null) {
  const container = host || document.getElementById('prop-tab-content');
  if (!container) return;

  // 默认填写对象 = 待填写草稿（按期次降序取最新草稿）；无草稿回退最新期次。
  const sortedReports = _sortedReports();
  const draftReport = sortedReports.find(r => r.status === 'draft') || null;
  const actor = AuthStore.getCurrentUser();
  const branch = (mockDB.branches || []).find((row) => row.id === actor?.branchId)
    || (mockDB.branches || []).find((row) => row.secretaryId === actor?.personId);
  const archiveUnit = branch?.config?.policyOverrides?.archive?.periodic?.unit || POLICY_DEFAULTS.archive.periodic.unit;
  const weekDefaults = _weekDefaults(new Date(), archiveUnit);

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      <div class="lg:col-span-2 card rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            ${icon('pencil', { className: 'w-4 h-4 text-blue-600' })}
            <h4 class="text-sm font-bold text-gray-700">填写周期归档</h4>
            ${draftReport ? `<span class="text-xs px-1.5 py-0.5 rounded-full border ${WEEKLY_STATUS_STYLE.draft}">${draftReport.periodLabel || draftReport.week || '待填写'}</span>` : ''}
          </div>
          <button id="weekly-add-btn" class="btn-outline text-xs px-3 py-1.5">+ 新增归档期次</button>
        </div>
        <!-- T-209 改进项②：新建周次内联表单（周次标签 + 日期范围） -->
        <div id="weekly-add-form" class="hidden mb-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100" style="--acc-bg-dark:rgba(96,165,250,0.10);">
          <div class="text-[12px] font-bold text-gray-600 mb-2">新建归档期次</div>
          <div class="flex flex-col gap-2 mb-2">
            <input id="weekly-add-week" type="text" value="${weekDefaults.week}" placeholder="期次名称，如：${archiveUnit === 'month' ? '2026年10月' : '第32周'}" class="input-flat w-full" />
            <input id="weekly-add-range" type="text" value="${weekDefaults.range}" placeholder="日期范围，如：2026-10-01 ~ 2026-10-31" class="input-flat w-full" />
          </div>
          <div class="flex gap-2 justify-end">
            <button id="weekly-add-cancel" type="button" class="btn-outline text-xs px-3 py-1.5">取消</button>
            <button id="weekly-add-save" type="button" class="btn-accent-soft text-xs px-3 py-1.5" >保存</button>
          </div>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="weekly-week">选择归档期次</label>
            <select id="weekly-week" class="input-flat w-full">
              ${sortedReports.map(r => `<option value="${r.id}" ${draftReport && r.id === draftReport.id ? 'selected' : ''}>${r.periodLabel || r.week || '未命名期次'}（${r.periodRange || r.weekRange || '日期待补'}）</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="weekly-content">本期归档内容</label>
            <textarea id="weekly-content" rows="6" placeholder="请填写本期工作与产出..." class="input-flat w-full resize-none">${draftReport ? draftReport.content : ''}</textarea>
          </div>
          <!-- SOP-B-40 ②：基于活动数据自动生成报送内容（生成后可手改，是草稿起点不是结论） -->
          <div class="flex items-center justify-between gap-2">
            <button id="weekly-gen-btn" type="button" class="btn-outline text-xs px-3 py-1.5">按本期活动自动生成</button>
            <span class="text-[11px] text-gray-400">生成后仍可手改</span>
          </div>
          <button id="weekly-submit-btn" class="btn-accent w-full text-sm px-4 py-[7px] font-medium" >提交本期归档</button>
          <div class="text-[11px] text-gray-500 leading-5">提交后系统会<b>站内通知支书</b>，支书在「全局概况」审核（通过 / 退回）。提交记录保存本期采用的归档规则版本。</div>
        </div>
      </div>

      <div class="lg:col-span-3 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('clock', { className: 'w-4 h-4 text-gray-500' })}
          <h4 class="text-sm font-bold text-gray-700">归档记录</h4>
        </div>
        <div class="space-y-2">
          ${sortedReports.map(r => _renderWeeklyReportItem(r)).join('')}
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
    const periodLabel = container.querySelector('#weekly-add-week').value.trim();
    const periodRange = container.querySelector('#weekly-add-range').value.trim();
    if (!periodLabel) { showToast('error', '请填写归档期次名称'); return; }
    if (!periodRange) { showToast('error', '请填写归档日期范围'); return; }
    const reports = _loadPeriodicArchives();
    if (reports.some(r => (r.periodLabel || r.week) === periodLabel)) { showToast('error', '该归档期次已存在'); return; }
    const currentUser = AuthStore.getCurrentUser();
    reports.push({
      id: generateId('pa'),
      branchId: currentUser?.branchId || branch?.id || 'br-b1',
      periodLabel,
      periodRange,
      periodUnit: archiveUnit,
      periodKey: weekDefaults.key,
      content: '',
      status: 'draft',
      submittedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.personId || 'u_prop',
    });
    mockDB.periodicArchives = reports;
    persist();
    showToast('success', '已新建归档期次，自动选中待填写');
    renderContent(ctx, container);
  });

  // 自动生成（SOP-B-40 ②）：按当前所选周次的起止区间，从活动数据拼出草稿内容
  container.querySelector('#weekly-gen-btn')?.addEventListener('click', () => {
    const selectEl = container.querySelector('#weekly-week');
    const textareaEl = container.querySelector('#weekly-content');
    const report = _loadPeriodicArchives().find(r => r.id === selectEl.value);
    if (!report) return;
    const generated = _autoWeeklyContent(report.periodRange || report.weekRange);
    if (!generated) { showToast('info', `${report.periodLabel || report.week}（${report.periodRange || report.weekRange}）没有可用的活动数据，请手填`); return; }
    if (textareaEl.value.trim() && !window.confirm('已有内容，用自动生成的结果覆盖？')) return;
    textareaEl.value = generated;
    showToast('success', '已按本期活动生成草稿内容（可继续手改）');
  });

  // 报送按钮
  const submitBtn = container.querySelector('#weekly-submit-btn');
  submitBtn.addEventListener('click', () => {
    const selectEl = container.querySelector('#weekly-week');
    const textareaEl = container.querySelector('#weekly-content');
    const reportId = selectEl.value;
    const content = textareaEl.value.trim();
    if (!content) {
      showToast('error', '请填写本期归档内容');
      return;
    }
    const report = _loadPeriodicArchives().find(r => r.id === reportId);
    if (!report) return;
    report.content = content;
    report.status = 'submitted';
    report.submittedAt = todayLocal();
    // SOP-B-40 ②（2026-09-19 批次 94）：报送人 + 审核位状态位（新报送即回到「待审核」，
    // 清掉上一次的退回说明——重新报送是对退回的回应）
    report.submittedBy = AuthStore.getCurrentUser()?.personId || 'u_prop';
    report.reviewStatus = PERIODIC_ARCHIVE_REVIEW_STATUS.PENDING;
    delete report.reviewNote;
    const currentUser = AuthStore.getCurrentUser();
    const branch = (mockDB.branches || []).find((row) => row.id === currentUser?.branchId)
      || (mockDB.branches || []).find((row) => row.secretaryId === currentUser?.personId);
    const strategyVersion = Math.max(1, Number(branch?.config?.periodicArchiveVersion) || 1);
    Object.assign(report, attachArchivePolicySnapshot(report, POLICY_DEFAULTS.archive.periodic, strategyVersion, report.submittedAt));
    persist();
    // 「存好了才通知」：`persist()` 在 API 形态排的是 800ms 防抖快照，而服务端按 kind 注册表
    //   复算授权（R-22：`rowOf(db,'periodic_archive_submissions',sourceId)`）——两者若并行，会赛跑在
    //   「这一行还没落库」上，授权不通过即 403 并把本地镜像回收（通知发不出去）。
    //   故先等成功提示走完结算，再发通知（同批次 49「存好了才报成功」/ 批次 83 先例）。
    //   ⚠ 顺序不能颠倒：`settleWrites` 的失败只报一次，若先自行结算会把失败吞掉、
    //     让成功提示变成假话。真机证据：报送后 4s 服务端通知一条（`宣传周报待审核`）。
    const settled = showToast('success', `${report.periodLabel || report.week}周期归档已提交，将通知支书审核`);
    Promise.resolve(settled).then(() => NoticeStore.addSystem('periodic-archive-submitted', report.id, {
      periodLabel: report.archivePolicySnapshot?.periodLabel || report.periodLabel || report.week,
      periodRange: report.archivePolicySnapshot?.periodRange || report.periodRange || report.weekRange,
      submitterName: getPersonName(report.submittedBy) || '',
    })).catch((e) => console.warn('[periodic-archive] 周期归档已提交，但通知支书未发出：', e));
    renderContent(ctx, container);
  });

  // 「标记已上报北京大学智慧党建平台」（SOP-B-40 ③）：只做**留痕**（对接方为外部，系统不代办）
  container.querySelectorAll('.weekly-platform-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const report = _loadPeriodicArchives().find(r => r.id === btn.dataset.id);
      if (!report) return;
      report.platformReportedAt = new Date().toISOString();
      report.platformReportedBy = AuthStore.getCurrentUser()?.personId || '';
      persist();
      showToast('success', '已留痕：本期归档已上报北京大学智慧党建平台');
      renderContent(ctx, container);
    });
  });

  // 批次 352（`D-746`）：周报「作废（软）」——支委直接作废 / 其余人报支委会（单一源弹窗）
  container.querySelectorAll('.weekly-void-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const report = _loadPeriodicArchives().find(r => r.id === btn.dataset.id);
      if (!report) return;
      openVoidModal({
        resource: 'periodicArchives', id: report.id, label: '周期归档',
        subject: `${report.archivePolicySnapshot?.periodLabel || report.periodLabel || report.week || ''}（${report.archivePolicySnapshot?.periodRange || report.periodRange || report.weekRange || ''}）`,
        onDone: () => renderContent(ctx, container),
      });
    });
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
  // 审核位状态（SOP-B-40 ②）：单一源 = services/governance/secretary-overview.js::periodicArchiveReviewStatusOf
  const reviewStatus = periodicArchiveReviewStatusOf(report);
  const reviewBadge = reviewStatus
    ? `<span class="text-xs px-1.5 py-0.5 rounded-full border ${WEEKLY_REVIEW_STYLE[reviewStatus]}">支书${PERIODIC_ARCHIVE_REVIEW_LABELS[reviewStatus]}</span>`
    : '';
  // 平台上报留痕（SOP-B-40 ③）：只留痕，不对接（对接方为外部）
  const platformHtml = isSubmitted
    ? (report.platformReportedAt
        ? `<span class="text-xs px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200" title="上报留痕：${(report.platformReportedAt || '').slice(0, 16).replace('T', ' ')}">已上报党建平台</span>`
        : `<button class="btn-outline weekly-platform-btn text-xs px-2.5 py-1" data-id="${report.id}" style="cursor:pointer;">标记已上报党建平台</button>`)
    : '';
  const periodLabel = report.archivePolicySnapshot?.periodLabel || report.periodLabel || report.week || '未命名期次';
  const periodRange = report.archivePolicySnapshot?.periodRange || report.periodRange || report.weekRange || '';
  return `
    <div class="weekly-report-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${periodLabel}</span>
          <span class="text-xs text-gray-500">${periodRange}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle}">${WEEKLY_STATUS_LABEL[report.status]}</span>
          ${reviewBadge}
        </div>
        <div class="flex items-center gap-2">
          ${platformHtml}
          ${isSubmitted && report.submittedAt ? `<span class="text-xs text-gray-500">报送于 ${report.submittedAt}</span>` : ''}
          ${report.content ? `<button class="btn-neutral weekly-detail-toggle text-xs px-3 py-1.5">展开</button>` : ''}
          ${report.voidPending && !report.voided
            ? '<span class="text-[11px] text-gray-500">待支委会确认</span>'
            : `<button class="btn-action btn-action-gray weekly-void-btn text-xs" data-id="${report.id}" title="软作废：记录从归档历史出列、留痕可回查；支委可直接作废，其余人报支委会确认">作废</button>`}
        </div>
      </div>
      ${report.content ? `<div class="weekly-detail-content hidden mt-2 p-2.5 rounded-lg bg-gray-50 text-xs text-gray-600 whitespace-pre-line">${report.content}</div>` : '<p class="text-xs text-gray-500 mt-1">暂无内容</p>'}
      ${reviewStatus === 'returned' && report.reviewNote ? `<p class="text-xs text-amber-700 mt-1">支书退回说明：${report.reviewNote}</p>` : ''}
    </div>`;
}
