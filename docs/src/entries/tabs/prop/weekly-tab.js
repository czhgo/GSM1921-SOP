// role: [工程师]+[AI]
// 宣传委员工作台 Tab：周报报送（T-279 M3 拆分，照 M2 样板）
// 周报 seed 常量 + mockDB 持久化，刷新不再丢失；T-209 改进项②：新建周次内联表单。

import { icon } from '../../../core/icons.js?v=20260922b';
import { solidAccentStyle } from '../../../core/constants.js?v=20260922b';
import { showToast } from '../../../core/utils.js?v=20260922b';
import { persist } from '../../../core/data-adapter.js?v=20260922b';
import { mockDB } from '../../../core/domain.js?v=20260922b';
import { AuthStore } from '../../../services/auth.js?v=20260922b';
import { generateId } from '../../../core/id.js?v=20260922b';
import { loadActivities } from '../../../services/activity.js?v=20260922b';
import { NoticeStore } from '../../../services/notice.js?v=20260922b';
import { getPersonName } from '../../../services/person.js?v=20260922b';
import { WEEKLY_REVIEW_STATUS, WEEKLY_REVIEW_LABELS, weeklyReviewStatusOf } from '../../../services/secretary-overview.js?v=20260922b';

// ── 周报报送 seed 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
// 2026-09-12 修正：起止原整体晚一天（第30周误记 07-21~07-25 等）→ 按 ISO 周「周一~周五」口径校准
//（第30周=2026-07-20~07-24 / 第31周=2026-07-27~07-31），与 _weekDefaults 派生同口径。
const WEEKLY_REPORTS_SEED = [
  { id: 'wr1', week: '第30周', weekRange: '2026-07-20 ~ 2026-07-24', content: '1. 七一主题党日活动新闻稿发布\n2. 发展对象公示推送排版完成\n3. 上半年活动照片归档整理进行中', status: 'submitted', submittedAt: '2026-07-24' },
  { id: 'wr2', week: '第29周', weekRange: '2026-07-13 ~ 2026-07-17', content: '1. 入党积极分子培训资料归档完成\n2. 组织生活会预告推送发布\n3. 配合组织委员完成发展对象材料审核', status: 'submitted', submittedAt: '2026-07-17' },
  { id: 'wr3', week: '第28周', weekRange: '2026-07-06 ~ 2026-07-10', content: '1. 预备党员转正大会新闻稿起草\n2. 七一活动素材整理\n3. 宣传专栏内容更新', status: 'submitted', submittedAt: '2026-07-10' },
  { id: 'wr4', week: '第31周', weekRange: '2026-07-27 ~ 2026-07-31', content: '', status: 'draft', submittedAt: null },
];

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.weeklyReports 后调用 persist()
function _loadWeeklyReports() {
  if (mockDB.weeklyReports.length === 0 && WEEKLY_REPORTS_SEED.length > 0) {
    mockDB.weeklyReports = WEEKLY_REPORTS_SEED.map(r => ({ ...r }));
  }
  return mockDB.weeklyReports;
}

/** 周次号（'第30周' → 30；非数字兜底 0），供下拉/历史按周次排序 */
function _weekNo(r) {
  const m = String((r && r.week) || '').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** 周次降序（新周在前）——下拉与「报送历史」同一口径，避免旧实现按录入顺序（28→29→30→31）错乱 */
function _sortedReports() {
  return [..._loadWeeklyReports()].sort((a, b) => _weekNo(b) - _weekNo(a));
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

// 周次与起止自动派生（支书 2026-09-10 裁定：按当前日期预填，仍允许手动覆盖）
// 周号口径：ISO 周（周一为一周之始），与既有 seed/文案一致（第31周=2026-07-27 所在周）。
// 起止口径：本周一 ~ 本周五，格式沿用既有示例 `YYYY-MM-DD ~ YYYY-MM-DD`。
function _isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7; // 0=周一
  d.setUTCDate(d.getUTCDate() - day + 3); // 移到本周四（ISO 归属年）
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  firstThu.setUTCDate(firstThu.getUTCDate() - ((firstThu.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((d - firstThu) / (7 * 86400000));
}

function _weekDefaults(now = new Date()) {
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  return { week: `第${_isoWeek(now)}周`, range: `${fmt(monday)} ~ ${fmt(friday)}` };
}

export function renderContent(ctx) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  // 默认填写对象 = 待填写草稿（按周次降序取最新草稿）；无草稿回退最新周次（下拉已排序，最新周在前）
  const sortedReports = _sortedReports();
  const draftReport = sortedReports.find(r => r.status === 'draft') || null;
  // 支书 2026-09-10 裁定：新增周次的周次号/起止按当前日期自动派生预填（0 输入可直存，仍可手改）
  const weekDefaults = _weekDefaults();

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
        <div id="weekly-add-form" class="hidden mb-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100" style="--acc-bg-dark:rgba(96,165,250,0.10);">
          <div class="text-[12px] font-bold text-gray-600 mb-2">新建周次</div>
          <div class="flex flex-col gap-2 mb-2">
            <input id="weekly-add-week" type="text" value="${weekDefaults.week}" placeholder="周次标签，如：第32周" class="input-flat w-full" />
            <input id="weekly-add-range" type="text" value="${weekDefaults.range}" placeholder="日期范围，如：2026-08-04 ~ 2026-08-08" class="input-flat w-full" />
          </div>
          <div class="flex gap-2 justify-end">
            <button id="weekly-add-cancel" type="button" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
            <button id="weekly-add-save" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">保存</button>
          </div>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="weekly-week">选择周次</label>
            <select id="weekly-week" class="input-flat w-full">
              ${sortedReports.map(r => `<option value="${r.id}" ${draftReport && r.id === draftReport.id ? 'selected' : ''}>${r.week}（${r.weekRange}）</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="weekly-content">周报内容</label>
            <textarea id="weekly-content" rows="6" placeholder="请填写本周工作内容，每条一行..." class="input-flat w-full resize-none">${draftReport ? draftReport.content : ''}</textarea>
          </div>
          <!-- SOP-B-40 ②：基于活动数据自动生成报送内容（生成后可手改，是草稿起点不是结论） -->
          <div class="flex items-center justify-between gap-2">
            <button id="weekly-gen-btn" type="button" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">按本周活动自动生成</button>
            <span class="text-[11px] text-gray-400">生成后仍可手改</span>
          </div>
          <button id="weekly-submit-btn" class="w-full text-sm px-4 py-[7px] font-medium text-white rounded-lg transition-colors" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">报送</button>
          <div class="text-[11px] text-gray-500 leading-5">报送后系统会<b>站内通知支书</b>，支书在支书台「全局概况」审核（通过 / 退回）。</div>
        </div>
      </div>

      <div class="lg:col-span-3 card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('clock', { className: 'w-4 h-4 text-gray-500' })}
          <h4 class="text-sm font-bold text-gray-700">报送历史</h4>
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
    const week = container.querySelector('#weekly-add-week').value.trim();
    const weekRange = container.querySelector('#weekly-add-range').value.trim();
    if (!week) { showToast('error', '请填写周次标签'); return; }
    if (!weekRange) { showToast('error', '请填写日期范围'); return; }
    const reports = _loadWeeklyReports();
    if (reports.some(r => r.week === week)) { showToast('error', '该周次已存在'); return; }
    reports.push({
      id: generateId('wr'),
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

  // 自动生成（SOP-B-40 ②）：按当前所选周次的起止区间，从活动数据拼出草稿内容
  container.querySelector('#weekly-gen-btn')?.addEventListener('click', () => {
    const selectEl = container.querySelector('#weekly-week');
    const textareaEl = container.querySelector('#weekly-content');
    const report = _loadWeeklyReports().find(r => r.id === selectEl.value);
    if (!report) return;
    const generated = _autoWeeklyContent(report.weekRange);
    if (!generated) { showToast('info', `${report.week}（${report.weekRange}）没有可用的活动数据，请手填`); return; }
    if (textareaEl.value.trim() && !window.confirm('已有内容，用自动生成的结果覆盖？')) return;
    textareaEl.value = generated;
    showToast('success', '已按本周活动生成草稿内容（可继续手改）');
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
    // SOP-B-40 ②（2026-09-19 批次 94）：报送人 + 审核位状态位（新报送即回到「待审核」，
    // 清掉上一次的退回说明——重新报送是对退回的回应）
    report.submittedBy = AuthStore.getCurrentUser()?.personId || 'u_prop';
    report.reviewStatus = WEEKLY_REVIEW_STATUS.PENDING;
    delete report.reviewNote;
    persist();
    // 「存好了才通知」：`persist()` 在 API 形态排的是 800ms 防抖快照，而服务端按 kind 注册表
    //   复算授权（R-22：`rowOf(db,'weekly_reports',sourceId)`）——两者若并行，会赛跑在
    //   「这一行还没落库」上，授权不通过即 403 并把本地镜像回收（通知发不出去）。
    //   故先等成功提示走完结算，再发通知（同批次 49「存好了才报成功」/ 批次 83 先例）。
    //   ⚠ 顺序不能颠倒：`settleWrites` 的失败只报一次，若先自行结算会把失败吞掉、
    //     让成功提示变成假话。真机证据：报送后 4s 服务端通知一条（`宣传周报待审核`）。
    const settled = showToast('success', `${report.week}周报已报送，将通知支书审核`);
    Promise.resolve(settled).then(() => NoticeStore.addSystem('weekly-report-submitted', report.id, {
      week: report.week,
      weekRange: report.weekRange,
      submitterName: getPersonName(report.submittedBy) || '',
    })).catch((e) => console.warn('[weekly-tab] 周报已报送，但通知支书未发出：', e));
    renderContent(ctx);
  });

  // 「标记已上报北京大学智慧党建平台」（SOP-B-40 ③）：只做**留痕**（对接方为外部，系统不代办）
  container.querySelectorAll('.weekly-platform-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const report = _loadWeeklyReports().find(r => r.id === btn.dataset.id);
      if (!report) return;
      report.platformReportedAt = new Date().toISOString();
      report.platformReportedBy = AuthStore.getCurrentUser()?.personId || '';
      persist();
      showToast('success', '已留痕：该周报标记为已上报北京大学智慧党建平台');
      renderContent(ctx);
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
  // 审核位状态（SOP-B-40 ②）：单一源 = services/secretary-overview.js::weeklyReviewStatusOf
  const reviewStatus = weeklyReviewStatusOf(report);
  const reviewBadge = reviewStatus
    ? `<span class="text-xs px-1.5 py-0.5 rounded-full border ${WEEKLY_REVIEW_STYLE[reviewStatus]}">支书${WEEKLY_REVIEW_LABELS[reviewStatus]}</span>`
    : '';
  // 平台上报留痕（SOP-B-40 ③）：只留痕，不对接（对接方为外部）
  const platformHtml = isSubmitted
    ? (report.platformReportedAt
        ? `<span class="text-xs px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200" title="上报留痕：${(report.platformReportedAt || '').slice(0, 16).replace('T', ' ')}">已上报党建平台</span>`
        : `<button class="weekly-platform-btn text-xs px-2.5 py-1 rounded-lg bg-white text-violet-700 border border-violet-200 hover:bg-violet-50 transition-colors" data-id="${report.id}" style="cursor:pointer;">标记已上报党建平台</button>`)
    : '';
  return `
    <div class="weekly-report-item p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${report.week}</span>
          <span class="text-xs text-gray-500">${report.weekRange}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle}">${WEEKLY_STATUS_LABEL[report.status]}</span>
          ${reviewBadge}
        </div>
        <div class="flex items-center gap-2">
          ${platformHtml}
          ${isSubmitted && report.submittedAt ? `<span class="text-xs text-gray-500">报送于 ${report.submittedAt}</span>` : ''}
          ${report.content ? `<button class="weekly-detail-toggle text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">展开</button>` : ''}
        </div>
      </div>
      ${report.content ? `<div class="weekly-detail-content hidden mt-2 p-2.5 rounded-lg bg-gray-50 text-xs text-gray-600 whitespace-pre-line">${report.content}</div>` : '<p class="text-xs text-gray-500 mt-1">暂无内容</p>'}
      ${reviewStatus === 'returned' && report.reviewNote ? `<p class="text-xs text-amber-700 mt-1">支书退回说明：${report.reviewNote}</p>` : ''}
    </div>`;
}
