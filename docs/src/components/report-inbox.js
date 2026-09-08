// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/report-inbox.js — 待答复汇报收件箱（行内答复零跳转）
//  书记 2026-08-10 裁定：待办内建「答复类」置顶（汇报答复为书记最高频动作）
//  复用方：① 书记待办 tab 顶部 ② 组长工作概况 tab 汇报区 ③ 各角色工作概况 tab
//  交互：行点击展开对话时间线 → 行内输入 → 正式答复（kind='reply'）发回汇报人
//  可见性：展示谁的可答复汇报由调用方决定（书记=全部 open 汇报；组长=本组组员汇报）
//  本组件禁用 SVG 图标（书记裁定），类别用色点+文字标签区分
// ════════════════════════════════════════════════════════════════

import { IssueStore, deriveIssueDisplayState, REPORT_CATEGORIES } from '../services/issues.js?v=20260908a';
import { AuthStore } from '../services/auth.js?v=20260903c';
import { showToast } from '../core/utils.js?v=20260903c';
import { getPersonName } from '../services/person.js?v=20260903c';
import { solidAccentStyle } from '../core/constants.js?v=20260903c';

/**
 * 待答复收件箱 HTML
 * @param {Object} opts
 * @param {Array}  opts.reports  — 待答复汇报（kind='report' 且 open）
 * @param {string} [opts.title]  — 区标题（默认「待答复」）
 * @param {string} [opts.subtitle] — 区副标题（如「X 条待答复 · 行内答复」）
 * @param {string} [opts.role]   — 答复人角色键（'secretary' | 'leader'）
 * @param {string} [opts.accent] — 强调色
 * @param {string} [opts.emptyMsg] — 空态文案
 * @returns {string}
 */
export function renderReportInboxHtml({
  reports = [],
  title = '待答复',
  subtitle = '',
  role = 'secretary',
  accent = '#B91C1C',
  emptyMsg = '暂无待答复汇报',
} = {}) {
  // 2026-09-08 顶卡排布统一：空态并入统一形态（text-xs text-gray-400 py-1），
  // 保留绿色圆点「已全部答复」语义（不突兀：与相邻卡空态行同高，无底色整条）
  const emptyBox = `
    <p class="text-xs text-gray-400 py-1 flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> ${emptyMsg}
    </p>`;

  if (!reports.length) {
    return `
      <div class="card rounded-xl p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
          <span class="text-xs text-gray-400">${subtitle || '汇报答复'}</span>
        </div>
        ${emptyBox}
      </div>`;
  }

  // 问题优先排序：卡点 → 请示 → 进度；待答复（resultPending）优先于待处理
  const catOrder = { blocked: 0, ask: 1, progress: 2 };
  const sorted = [...reports].sort((a, b) => {
    const ca = catOrder[a.reportCategory] ?? 3;
    const cb = catOrder[b.reportCategory] ?? 3;
    if (ca !== cb) return ca - cb;
    const pa = a.resultPending ? 0 : 1;
    const pb = b.resultPending ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (b.submittedAt || '').localeCompare(a.submittedAt || '');
  });

  const rows = sorted.map(r => {
    const cat = REPORT_CATEGORIES[r.reportCategory] || '进度';
    const catColor = r.reportCategory === 'blocked' ? '#EF4444'
      : r.reportCategory === 'ask' ? '#F59E0B' : '#16A34A';
    const ds = deriveIssueDisplayState(r);
    const requester = r.requestedBy
      ? '<span class="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">了解进展</span>'
      : '';
    return `
      <div class="rounded-lg border ${r.reportCategory === 'blocked' ? 'border-red-200' : 'border-gray-100'} overflow-hidden">
        <button type="button" class="rep-inbox-toggle w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left" data-report-id="${r.id}">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${catColor};"></span>
          <span class="text-xs font-medium flex-shrink-0" style="color:${catColor};">${cat}</span>
          <span class="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">${r.title}</span>
          <span class="text-xs text-gray-400 flex-shrink-0">${getPersonName(r.submittedBy) || '匿名'}</span>
          <span class="text-xs text-gray-400 flex-shrink-0">${r.submittedAt}</span>
          ${requester}
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass} flex-shrink-0">${ds.label}</span>
        </button>
        <div id="rep-inbox-detail-${r.id}" class="hidden px-3 pb-3 border-t border-gray-100">
          ${_renderInboxDetail(r, accent)}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
        <span class="text-xs text-gray-400">${subtitle || `${reports.length} 条待答复 · 行内答复`}</span>
      </div>
      <div class="space-y-2">${rows}</div>
    </div>`;
}

/** 行内详情：汇报正文 + 了解进展说明 + 对话时间线 + 答复输入区 */
function _renderInboxDetail(r, accent) {
  const requesterNote = r.requestedBy && r.requestedNote
    ? `<div class="rounded-lg p-2 bg-blue-50 mt-2"><p class="text-xs text-blue-700">请汇报：${r.requestedNote}</p></div>`
    : '';
  const comments = (r.comments || []).filter(c => !c.hidden).map(c => {
    const icon = c.kind === 'dispatch' ? '→' : c.kind === 'reply' ? '答'
      : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
    const bg = c.kind === 'reply' ? 'bg-red-50/70' : c.kind === 'result' ? 'bg-green-50'
      : c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
    return `
      <div class="rounded-lg p-2 ${bg}">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="text-xs font-medium text-gray-700">${icon} ${getPersonName(c.author) || '匿名'}</span>
          ${c.kind === 'reply' ? '<span class="text-xs px-1 py-0.5 rounded font-medium" style="--acc-bg-dark:rgba(248,113,113,0.16);--acc-text-dark:#F87171;background:rgba(185,28,28,0.1);color:#B91C1C;">正式答复</span>' : ''}
          <span class="text-xs text-gray-400">${c.createdAt}</span>
        </div>
        <p class="text-xs text-gray-600 whitespace-pre-wrap">${c.body}</p>
      </div>`;
  }).join('');
  const timeline = comments || '<p class="text-xs text-gray-400 py-2">暂无对话</p>';

  return `
    ${r.body ? `<p class="text-xs text-gray-600 whitespace-pre-wrap mt-2">${r.body}</p>` : ''}
    ${requesterNote}
    <div class="space-y-2 mt-2">${timeline}</div>
    ${r.status === 'open' ? `
      <div class="flex gap-2 mt-2">
        <input type="text" id="rep-inbox-input-${r.id}" class="input-flat flex-1" placeholder="添加答复…" aria-label="答复内容">
        <button type="button" class="rep-inbox-reply text-xs px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity flex-shrink-0" data-report-id="${r.id}" style="${solidAccentStyle(accent)};">正式答复</button>
      </div>` : ''}
  `;
}

/**
 * 绑定收件箱事件
 * @param {HTMLElement} container — 工作台根容器
 * @param {Object} opts
 * @param {string} opts.role       — 答复人角色键
 * @param {Function} [opts.onAnswered] — 答复完成后回调（重渲染）
 */
export function bindReportInbox(container, { role = 'secretary', onAnswered = () => {} } = {}) {
  if (!container) return;
  // 展开/收起详情
  container.querySelectorAll('.rep-inbox-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const detail = document.getElementById('rep-inbox-detail-' + btn.dataset.reportId);
      if (detail) detail.classList.toggle('hidden');
    });
  });
  // 正式答复（kind='reply' → 发回汇报人，通知未读）
  container.querySelectorAll('.rep-inbox-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.reportId;
      const input = document.getElementById('rep-inbox-input-' + id);
      const body = input?.value?.trim();
      if (!body) { showToast('error', '请填写答复内容'); return; }
      const user = AuthStore.getCurrentUser();
      IssueStore.addComment(id, user?.personId || '匿名', role, body, 'reply');
      showToast('success', '正式答复已发回');
      onAnswered();
    });
  });
}
