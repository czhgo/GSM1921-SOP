// role: [工程师]+[AI]
// activity-materials-entry.js — 活动材料闭环（U-23 · 单场活动）
//
// 为什么要有这一页（2026-10-19 Round 1 修复）：
//   活动结束后的材料收口此前散在「活动详情（追加复盘）+ 宣传台档案归档 + 纪检/组织台考勤考察」，
//   没有任何一屏能回答「这一场还差什么 / 交给谁 / 到哪一步」。本页是**单场活动的材料闭环承载面**：
//     ① 材料清单 —— 宣传材料（照片）/ 考勤 / 考察 / 复盘 逐类计数与缺口；
//     ② 核对材料 —— 每类链到既有上传/核对位（不新造上传器、不新增数据源）；
//     ③ 提交归档 —— 复用 `BranchService.archiveActivity`（软归档 + 级联完成本场任务）。
//
// 单一源纪律：
//   · 材料读取：`mockDB.imageRecords` / `loadAttendanceRecords` / `mockDB.inspections` / `loadActivityReviews`；
//   · 归档写口：`services/core/mock.js::archiveActivity`（经 BranchService 暴露，与宣传台 / 支书台同源）；
//   · 空态：`components/ui/empty-state.js`；浮窗：`components/ui/modal.js`；版本戳：`core/base/version-token.js`。
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261024c';
import { renderHeader } from '../../components/shell/header.js?v=20261024c';
import { BranchService } from '../../services/core/runtime.js?v=20261024c';
import { mockDB, ReviewStatus } from '../../core/domain/domain.js?v=20261024c';
import { loadAttendanceRecords } from '../../services/activity/attendance.js?v=20261024c';
import { loadActivityReviews } from '../../services/governance/review.js?v=20261024c';
import { AuthStore } from '../../services/core/auth.js?v=20261024c';
import { isActivityArchived } from '../../core/domain/constants.js?v=20261024c';
import { getBasePath, escHtml as esc, showToast, describeWriteError } from '../../core/base/utils.js?v=20261024c';
import { resolveMaterialHref, resolveMaterialHandoff, resolveMaterialRoleNote } from '../../core/domain/material-links.js?v=20261024c';
// 材料页可见性单一源（C11）：与活动列表 / 详情页同判据，待批活动不能凭 id 被非支委层读到
import { isActivityVisibleTo } from '../../services/core/visibility.js?v=20261024c';
import { emptyStateHtml } from '../../components/ui/empty-state.js?v=20261024c';
import { openModal, closeModal } from '../../components/ui/modal.js?v=20261024c';
import { bumpToken } from '../../core/base/version-token.js?v=20261024c';
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261024c';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261024c';
import { beginWriteScope, endWriteScope } from '../../core/session/pending-writes.js?v=20261024c';

renderSidebar('dashboard');
renderHeader('dashboard');

const rootEl = document.getElementById('materials-root');
const backBtn = document.getElementById('materials-back-btn');
const params = new URLSearchParams(window.location.search);
const activityId = params.get('id') || '';

// 返回（C10）：从工作台进来时原路返回，保住来路的 tab / 筛选上下文；否则回本场活动详情。
// 判据：referrer 同源且路径含 `/workspace/`——只有工作台来的返回才具有效上下文，外部来源不盲退。
backBtn?.addEventListener('click', () => {
  const ref = document.referrer || '';
  try {
    const refUrl = new URL(ref);
    if (refUrl.origin === window.location.origin && /\/workspace\//.test(refUrl.pathname) && window.history.length > 1) {
      window.history.back();
      return;
    }
  } catch (_) { /* 空 / 非法 referrer：走下方活动详情兜底 */ }
  if (activityId) { window.location.href = getBasePath() + `activity.html?id=${encodeURIComponent(activityId)}`; return; }
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

/** 归档失败原因（局部重渲染时保留，供「重试」旁展示） */
let _archiveError = '';

(async () => {
  const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
  notifyDataLoaded();
  if (!r.ok) return; // 错误态由共享实现渲染
  render();
})();

function _renderMessage(message, actionHtml = '') {
  if (!rootEl) return;
  rootEl.innerHTML = emptyStateHtml(message, { actionHtml });
}

function render() {
  if (!rootEl) return;
  if (!activityId) {
    _renderMessage('未指定活动', `<a class="btn-outline text-xs px-3 py-1.5" href="${getBasePath()}index.html">回首页</a>`);
    return;
  }
  const me = AuthStore.getCurrentUser();
  if (!me) {
    _renderMessage('材料与归档需登录后办理', `<a class="btn-outline text-xs px-3 py-1.5" href="${getBasePath()}login.html">去登录</a>`);
    return;
  }
  const act = mockDB.activities.find(a => a.id === activityId);
  // C11：不可见与不存在同口径——不提示「待批」，避免从这一行反推出「有这么一场还没批的活动」。
  if (!act || !isActivityVisibleTo(act, me.role, me.personId)) {
    _renderMessage('活动不存在或尚未公开', `<a class="btn-outline text-xs px-3 py-1.5" href="${getBasePath()}index.html">回首页</a>`);
    return;
  }

  const isOrganizer = act.organizer === me.personId;
  /** 本角色在本材料行的本位落点（null＝只渲染纯文本交接，不造假按钮） */
  const hrefOf = (row) => {
    const rel = resolveMaterialHref({ role: me.role, isOrganizer, actId: activityId, row });
    return rel ? getBasePath() + rel : null;
  };
  const handoffOf = (row) => resolveMaterialHandoff({ role: me.role, isOrganizer, row });

  // ── 材料读取（全部复用既有数据源，不新造表 / 不新增 API）──
  const photos = (mockDB.imageRecords || []).filter(r => r.activityId === activityId && !r.voided);
  const attendance = loadAttendanceRecords().filter(r => r.activityId === activityId);
  const inspections = (mockDB.inspections || []).filter(r => r.activityId === activityId);
  const reviews = loadActivityReviews().filter(r => r.activityId === activityId);
  const archiveRecords = (mockDB.archiveRecords || []).filter(r => r.activityId === activityId);
  const reviewReturned = reviews.some(r => r.reviewStatus === ReviewStatus.REJECTED);

  const archived = isActivityArchived(act);
  const coreReady = photos.length > 0 && attendance.length > 0 && inspections.length > 0;
  const hasAnyMaterial = photos.length + attendance.length + inspections.length + reviews.length > 0;
  // C04/C12：档案归档台只对宣传委员开放（其他角色跨台会被身份门弹回）——不渲染即不产生假入口。
  const propArchiveHref = me.role === 'prop-commissioner'
    ? `${getBasePath()}workspace/prop.html?tab=archive&focusActivityId=${encodeURIComponent(activityId)}`
    : '';

  // 归档动作的放行：支委层（含宣传 / 组织 / 纪检）或本场组织者。
  // 说明：mock 写口本身不设门，本页按既有台面口径只对本位人 / 支委层呈现动作，避免"人人可归档"的假入口。
  const canArchive = !!me && (AuthStore.isCommissioner(me.role) || act.organizer === me.personId);

  rootEl.innerHTML = `
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">材料与归档</span>
        <span class="text-xs text-gray-500">活动编号：${esc(act.id)}</span>
        ${archived ? '<span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">已归档</span>' : ''}
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${esc(act.title || '未命名活动')}</h2>
      <p class="text-sm text-gray-500 mt-1">${esc(act.date || '—')}${act.location ? ' · ' + esc(act.location) : ''}</p>
      <div class="mt-3 flex items-center gap-3">
        <a class="text-xs text-accent hover:underline" href="${getBasePath()}activity.html?id=${encodeURIComponent(activityId)}">查看活动详情 →</a>
        ${propArchiveHref ? `<a class="text-xs text-gray-500 hover:underline" href="${propArchiveHref}">宣传台 · 档案归档 →</a>` : ''}
      </div>
    </div>

    ${_stepperHtml(archived, coreReady, hasAnyMaterial)}

    <section class="mt-6" aria-labelledby="materials-list-title">
      <div class="flex items-center justify-between mb-2">
        <h3 id="materials-list-title" class="text-sm font-semibold text-gray-800">① 材料清单</h3>
        <span class="text-xs text-gray-500">按类核对，缺项直接去补充</span>
      </div>
      <div class="space-y-2">
        ${_materialRowHtml({ label: '宣传材料（照片）', count: photos.length, unit: '张', hint: '原图为主，含全景 + 特写', href: hrefOf('photos'), handoff: handoffOf('photos') })}
        ${_materialRowHtml({ label: '考勤', count: attendance.length, unit: '条', hint: '按会议类型由组织者 / 纪检上传', href: hrefOf('attendance'), handoff: handoffOf('attendance') })}
        ${_materialRowHtml({ label: '考察', count: inspections.length, unit: '条', hint: '考察记录由该场组织者提交、纪检确认', href: hrefOf('inspection'), handoff: handoffOf('inspection') })}
        ${_materialRowHtml({
          label: '复盘',
          count: reviews.length,
          unit: '份',
          hint: reviewReturned ? '复盘被退回，需组织者更新后重新提交' : '组织者提交；支委会可额外要求',
          href: hrefOf('review'),
          handoff: handoffOf('review'),
          extra: reviewReturned ? '<span class="text-[11px] text-red-700">已退回</span>' : '',
        })}
      </div>
    </section>

    <section class="mt-6" aria-labelledby="materials-check-title">
      <h3 id="materials-check-title" class="text-sm font-semibold text-gray-800 mb-2">② 核对材料</h3>
      <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-xs text-gray-600 leading-6">
        ${esc(resolveMaterialRoleNote({ role: me.role, isOrganizer }))}
        三类核心材料（宣传材料 / 考勤 / 考察）齐全后即可提交归档；归档后仍可补交材料。
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <span class="text-xs ${coreReady ? 'text-green-700' : 'text-amber-700'}">
          ${coreReady ? '核心材料已齐（宣传材料 / 考勤 / 考察）。' : `核心材料待补：${_missingText({ photos, attendance, inspections })}`}
        </span>
        ${archived ? '' : '<button type="button" id="materials-check-done-btn" class="btn-outline btn-sm">核对完成，去提交归档</button>'}
      </div>
    </section>

    <section class="mt-6" id="materials-archive-section" aria-labelledby="materials-archive-title">
      <h3 id="materials-archive-title" class="text-sm font-semibold text-gray-800 mb-2">③ 提交归档</h3>
      ${archived ? `
        <div class="rounded-xl border border-green-100 bg-green-50/60 px-4 py-3">
          <p class="text-sm text-green-800">本场已归档。</p>
          <p class="text-xs text-gray-600 mt-1">归档记录 ${archiveRecords.length} 条（宣传台材料归档）；补交材料仍走宣传台。</p>
        </div>` : `
        <div class="rounded-xl border border-gray-100 px-4 py-3">
          ${_archiveError ? `<p class="mt-2 text-xs text-red-700" role="alert">归档失败：${esc(_archiveError)}</p>` : ''}
          <div class="mt-3 flex items-center gap-2">
            ${canArchive
              ? `<button type="button" id="materials-archive-btn" class="btn-accent" style="cursor:pointer;">${_archiveError ? '重试归档' : '提交归档'}</button>`
              : '<span class="text-xs text-gray-500">归档由支委会或本场组织者提交。</span>'}
            <span class="text-xs text-gray-500">归档记录 ${archiveRecords.length} 条</span>
          </div>
        </div>`}
    </section>
  `;

  document.getElementById('materials-archive-btn')?.addEventListener('click', () => _confirmArchive(act, { photos, attendance, inspections }));
  document.getElementById('materials-check-done-btn')?.addEventListener('click', () => {
    document.getElementById('materials-archive-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('materials-archive-btn')?.focus();
  });
}

/** 三步条（单调：已归档 ⇒ 三步全 done；否则 current = 第一个未完成项，done 之后不再出现 current） */
function _stepperHtml(archived, coreReady, hasAnyMaterial) {
  const doneFlags = archived ? [true, true, true] : [hasAnyMaterial, coreReady, false];
  const currentIdx = doneFlags.indexOf(false); // -1 = 三步全完成
  const steps = [
    { n: '①', label: '材料清单' },
    { n: '②', label: '核对材料' },
    { n: '③', label: '提交归档' },
  ].map((s, i) => ({ ...s, state: doneFlags[i] ? 'done' : (i === currentIdx ? 'current' : 'pending') }));
  const cls = {
    done: 'bg-green-50 border-green-200 text-green-800',
    current: 'bg-[var(--app-accent-soft-bg)] border-[var(--app-accent)] text-gray-800',
    pending: 'bg-white border-neutral-200 text-gray-500',
  };
  return `
    <ol class="grid grid-cols-3 gap-2" aria-label="材料与归档步骤">
      ${steps.map(s => `
        <li class="rounded-xl border px-3 py-2 ${cls[s.state]}"${s.state === 'current' ? ' aria-current="step"' : ''}>
          <div class="text-xs font-semibold">${s.n} ${s.label}</div>
          <div class="text-[11px] mt-0.5">${s.state === 'done' ? '已完成' : s.state === 'current' ? '进行中' : '待开始'}</div>
        </li>`).join('')}
    </ol>`;
}

/** 单类材料行（计数 + 状态 + 本位落点）；无本位落点时只给纯文本交接，不渲染假按钮 */
function _materialRowHtml({ label, count, unit, hint, href, handoff = '', extra = '' }) {
  const ready = count > 0;
  const actionHtml = href
    ? `<a class="btn-outline text-xs px-3 py-1.5 flex-shrink-0" href="${href}">${ready ? '去核对' : '去补充'}</a>`
    : `<span class="text-xs text-gray-500 flex-shrink-0 text-right max-w-[180px]">${esc(handoff)}</span>`;
  return `
    <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${esc(label)}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ready ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}">${ready ? `已收 ${count} ${unit}` : '待补'}</span>
          ${extra}
        </div>
        <p class="text-xs text-gray-500 mt-0.5">${esc(hint)}</p>
      </div>
      ${actionHtml}
    </div>`;
}

function _missingText({ photos, attendance, inspections }) {
  const missing = [];
  if (photos.length === 0) missing.push('宣传材料');
  if (attendance.length === 0) missing.push('考勤');
  if (inspections.length === 0) missing.push('考察');
  return missing.join(' / ');
}

/** 提交归档确认浮窗：材料未齐时给软提示（不阻断——与「先归档、后补材料」的既有口径一致） */
function _confirmArchive(act, materials) {
  const missing = _missingText(materials);
  const bodyHtml = `
    ${missing
      ? `<p class="text-xs text-amber-700 leading-6">以下核心材料仍缺：<b>${esc(missing)}</b>。归档后仍可在宣传台补交材料。</p>`
      : '<p class="text-xs text-green-700 leading-6">核心材料已齐（宣传材料 / 考勤 / 考察）。</p>'}`;
  openModal({
    id: 'materials-archive-confirm',
    title: '提交归档',
    width: '460px',
    bodyHtml,
    footerHtml: `
      <button type="button" data-materials-cancel class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" data-materials-confirm class="btn-accent text-sm px-4 py-1.5" style="cursor:pointer;">${missing ? '仍要归档' : '确认归档'}</button>`,
    onMount: (panel) => {
      panel.querySelector('[data-materials-cancel]')?.addEventListener('click', () => closeModal('materials-archive-confirm'));
      panel.querySelector('[data-materials-confirm]')?.addEventListener('click', () => {
        closeModal('materials-archive-confirm');
        void _archiveActivity(act.id);
      });
    },
  });
}

async function _archiveActivity(id) {
  const btn = document.getElementById('materials-archive-btn');
  if (btn) { btn.disabled = true; btn.textContent = '归档中…'; }
  _archiveError = '';
  // 动作作用域：归档的落库结果只归本次动作，成功/失败不与他人互相污染
  const scope = beginWriteScope();
  try {
    await BranchService.archiveActivity(id);
    bumpToken('archiveRecord');
    // 失败由 showToast 统一改报（旧实现 catch 吞错后仍报成功）
    const outcome = await showToast('success', '活动已归档（材料可在宣传台继续补交）', { scope });
    if (!outcome.ok) _archiveError = outcome.message;
    render();
  } catch (err) {
    endWriteScope(scope);
    _archiveError = describeWriteError(err);
    render();
    showToast('error', `归档失败：${_archiveError}`);
  }
}
