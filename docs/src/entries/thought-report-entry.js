// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  thought-report-entry.js — 思想汇报独立阅读页入口（2026-09-13 支书裁定）
//  支书原话：「我认为还是需要用一个界面来承载！而不是展开！」——
//  只读查阅一律走本独立页（不再行内展开）：
//    · ?id=<trId>        单篇阅读（版式优先可读性）
//    · ?personId=<pid>   按人聚合（按期次分组）
//    · 无参数            提示未指定对象（2026-09-18 批次 86：原「组织委员待初阅队列」
//                        随 `SOP-B-28` 取消初阅门一并撤除——提交即入库，没有待阅队列）
//  访问门与服务层同源（canReadThoughtReport / canReviewThoughtReport），
//  界面显隐不自判角色字面量；打回/重交动作均调用服务层并透出 {ok:false, reason}。
//  篇幅（`SOP-B-11`）：阅读页显示字数；**少于 1200 字的「篇幅不足 · 触发警告审阅」标记只给提交人本人看**
//  （2026-09-21 批次 124：支书 2026-09-20 定案「只给提交人本人」——支委层读他人的汇报时看不到该标记，
//   组织侧不经手篇幅）；**一律不影响提交与归档**。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../components/sidebar.js?v=20260921o';
import { renderHeader } from '../components/header.js?v=20260921o';
import { BranchService } from '../services/runtime.js?v=20260921o';
import { AuthStore } from '../services/auth.js?v=20260921o';
// D-484（批次 87）：本页必须先 hydrate API 数据源再取数——与 activity / notice 独立页同款标准形。
// 此前本页只调 BranchService.loadDB()，而该函数在 API 模式直接 return（数据由 data-adapter.init()
// 从服务器填充）⇒ 本页从未切数据源 / init ⇒ api 形态下退回本地 mock 读（种子打得开、新提交报「不存在」）。
import { registerApiAdapter, init as dataInit, setDataSource, notifyDataLoaded } from '../core/data-adapter.js?v=20260921o';
import { ApiAdapter } from '../core/api-adapter.js?v=20260921o';
import { getPersonName } from '../services/person.js?v=20260921o';
import { getBasePath, showToast, escHtml as esc, fmtDt } from '../core/utils.js?v=20260921o';
import { badgeHtml } from '../components/badges.js?v=20260921o';
import {
  loadThoughtReports, listThoughtReportsByPerson, listThoughtReportsByPersonGrouped,
  canReadThoughtReport, canReviewThoughtReport,
  rejectThoughtReport, resubmitThoughtReport,
  wordCountHint, periodLabel, comparePeriodDesc, THOUGHT_REVIEW_STATUS,
} from '../services/thought-report.js?v=20260921o';

renderSidebar('dashboard');
renderHeader('dashboard');

/** 数据 hydrate（D-484 · 批次 87）：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。 */
async function _hydrateData() {
  try {
    registerApiAdapter(ApiAdapter);
    let token = null;
    try { token = sessionStorage.getItem('gsm1921-api-token'); } catch (_) { /* 隐私模式无 sessionStorage */ }
    if (token) {
      setDataSource('api', { apiBaseUrl: '', authToken: token });
      try {
        await dataInit();
      } catch (e) {
        console.warn('[thought-report-entry] API 数据加载失败，回退本地 mock', e);
        setDataSource('mock');
        BranchService.loadDB();
      }
    } else {
      BranchService.loadDB();
    }
  } catch (e) {
    console.warn('[thought-report-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

const cardEl = document.getElementById('tr-page-card');
const backBtn = document.getElementById('tr-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const viewer = AuthStore.getCurrentUser();

// ── 状态徽章（阅读页统一口径：与 org/visitor tab 同体系，走 components/badges.js）──
// ⚠ 2026-09-18 批次 86：取消初阅门后只剩两态——「已入库」（默认）与「已打回·待补充」
const STATUS_BADGE = {
  needs_revision: ['已打回·待补充', 'danger'],
  archived: ['已入库', 'neutral'],
};
function statusBadge(status) {
  const cfg = STATUS_BADGE[status];
  return cfg ? badgeHtml(cfg[0], cfg[1]) : badgeHtml(status || '—', 'neutral');
}
const statusOf = (r) => (STATUS_BADGE[r && r.reviewStatus] ? r.reviewStatus : THOUGHT_REVIEW_STATUS.ARCHIVED);

/** 卡内提示（整块替换详情容器内容） */
function renderMessage(html) {
  if (cardEl) cardEl.innerHTML = `<p class="text-sm text-gray-500 text-center py-12">${html}</p>`;
}

/** 按 id 取「读取侧归一后」的记录（period/reviewStatus/reviewHistory 完整；服务层归一只经按人查询暴露） */
function findNormalizedById(id) {
  const raw = loadThoughtReports().find(r => r.id === id);
  if (!raw) return null;
  return listThoughtReportsByPerson(raw.personId).find(r => r.id === id) || raw;
}

// ════════════════════════════════════════════════════════════════
//  访问门 + 入口分流
// ════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const idParam = params.get('id') || '';
const pidParam = params.get('personId') || '';

// 渲染前必须先 hydrate（数据源初始化）：否则 api 形态下按「空集合」退回本地种子。
(async () => {
  await _hydrateData();
  if (!viewer) {
    renderMessage(`请先登录后查看思想汇报 · <a class="text-sky-600 hover:underline" href="${getBasePath()}login.html">去登录</a>`);
  } else if (idParam) {
    renderSingle(idParam);
  } else if (pidParam) {
    renderPerson(pidParam);
  } else {
    renderDefault();
  }
})();

// ── 无参数：提示未指定对象（2026-09-18 批次 86：原「组织委员待初阅队列」已随初阅门取消撤除）──
function renderDefault() {
  if (!cardEl) return;
  renderMessage(`未指定对象 · <a class="text-sky-600 hover:underline" href="${getBasePath()}workspace/visitor.html">去我的工作台查看/提交思想汇报</a>`);
  return;
}

// ════════════════════════════════════════════════════════════════
//  单篇阅读
// ════════════════════════════════════════════════════════════════

function renderSingle(id) {
  if (!cardEl) return;
  const rec = findNormalizedById(id);
  if (!rec) {
    renderMessage('思想汇报不存在或已被撤回');
    return;
  }
  if (!canReadThoughtReport(rec, viewer)) {
    renderMessage('无权查看该思想汇报（思想汇报仅本人与支委层可读）');
    return;
  }
  renderSingleView(rec);
}

function renderSingleView(rec) {
  if (!cardEl) return;
  const id = rec.id;
  const status = statusOf(rec);
  const wc = wordCountHint(rec.content);
  const isReviewer = canReviewThoughtReport(viewer);
  const isSelf = rec.personId === viewer.personId;

  // 审阅留痕（只读）
  const history = Array.isArray(rec.reviewHistory) ? rec.reviewHistory : [];
  const historyHtml = history.length === 0 ? '' : `
    <div class="mt-8 pt-6 border-t border-gray-100">
      <h3 class="text-sm font-semibold text-gray-700 mb-2">审阅留痕</h3>
      <div class="space-y-1.5">
        ${history.map(h => `
          <div class="text-xs text-gray-600">
            <span class="font-medium">${esc(getPersonName(h.by) || h.by || '—')}</span>
            · ${esc(fmtDt(h.at))}
            · ${h.decision === 'approve' ? '通过' : '打回'}${h.note ? `：${esc(h.note)}` : ''}
          </div>`).join('')}
      </div>
    </div>`;

  // 篇幅不足标记（`SOP-B-11`：少于 1200 字触发「警告审阅」；**不影响提交与归档**）
  // ⚠ 2026-09-21 批次 124（`SOP-B-11` 待定项 ①：支书 2026-09-20 定案「只给提交人本人」）：
  //   该标记**只在提交人本人（isSelf）看自己的汇报时**出现——支委层（含组织委员 / 支书）在此页
  //   读他人的汇报时**看不到任何「篇幅不足」标记**（组织侧不经手篇幅这件事）。
  const shortMarkHtml = (isSelf && wc.level === 'short')
    ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="${esc(wc.hint)}">篇幅不足 ${wc.count} 字 · 触发警告审阅</span>`
    : '';

  // 操作区（按权限显隐，均调用服务层函数）
  // ⚠ 2026-09-18 批次 86：取消初阅门——不再有「通过并归档」（提交即归档），审阅只剩
  //   「打回（要求本人补充）」这一事后反馈动作，且对任一篇都可发起（不限于某个中间态）。
  let actionHtml = '';
  if (isReviewer && status !== THOUGHT_REVIEW_STATUS.NEEDS_REVISION) {
    actionHtml = `
      <div class="mt-8 pt-6 border-t border-gray-100">
        <button type="button" id="tr-reject-toggle" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">打回（要求本人补充）</button>
        <div id="tr-reject-box" class="hidden mt-3">
          <textarea id="tr-reject-note" rows="3" class="input-flat w-full resize-none" placeholder="打回意见（必填，提交者可见并可修改重交）"></textarea>
          <div class="flex justify-end mt-2">
            <button type="button" id="tr-reject-confirm" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">确认打回</button>
          </div>
        </div>
      </div>`;
  } else if (isSelf && status === THOUGHT_REVIEW_STATUS.NEEDS_REVISION) {
    actionHtml = `
      <div class="mt-8 pt-6 border-t border-gray-100">
        <button type="button" id="tr-resubmit-toggle" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">修改并重新提交</button>
        <div id="tr-resubmit-box" class="hidden mt-3">
          <textarea id="tr-resubmit-content" rows="8" class="input-flat w-full resize-none" placeholder="请根据退回意见补充完善后重新提交">${esc(rec.content || '')}</textarea>
          <div class="flex items-center justify-between gap-2 mt-2">
            <span id="tr-resubmit-hint" class="text-[11px] text-gray-500"></span>
            <button type="button" id="tr-resubmit-confirm" class="btn-accent text-sm px-4 py-2 rounded-lg flex-shrink-0">重新提交</button>
          </div>
        </div>
      </div>`;
  }

  // 同人导航：全部篇目按「期次倒序 + 同期内提交时间倒序」排；上一篇/下一篇由此定位
  const ordered = [...listThoughtReportsByPerson(rec.personId)].sort(
    (a, b) => comparePeriodDesc(a.period, b.period) || String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')),
  );
  const idx = ordered.findIndex(r => r.id === id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const grouped = listThoughtReportsByPersonGrouped(rec.personId);
  const otherGroups = grouped
    .map(g => ({ ...g, items: g.items.filter(r => r.id !== id) }))
    .filter(g => g.items.length > 0);
  const othersHtml = otherGroups.length === 0 ? '' : `
    <div class="mt-8 pt-6 border-t border-gray-100">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">同一人的其他思想汇报</h3>
      ${otherGroups.map(g => `
        <div class="mb-3 last:mb-0">
          <p class="text-xs text-gray-500 mb-1">${esc(g.label)} · ${g.items.length} 篇</p>
          <div class="space-y-1.5">
            ${g.items.map(r => `
              <a href="thought-report.html?id=${r.id}" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span class="text-xs font-medium text-gray-700 truncate flex-1">${esc(r.title || '思想汇报')}</span>
                <span class="text-[11px] text-gray-500 flex-shrink-0">${esc(fmtDt(r.submittedAt))}</span>
                ${statusBadge(statusOf(r))}
              </a>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;

  cardEl.innerHTML = `
    <div class="flex items-center gap-2 flex-wrap mb-3">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">${esc(periodLabel(rec.period))}</span>
      ${statusBadge(status)}
      <span class="text-[11px] text-gray-400 tabular-nums">${wc.count} 字</span>
      ${shortMarkHtml}
    </div>

    <h2 class="text-xl font-semibold text-gray-900 leading-snug">${esc(rec.title || '思想汇报')}</h2>
    <p class="text-sm text-gray-500 mt-2"><a href="${getBasePath()}person.html?id=${encodeURIComponent(rec.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(rec.personId) || rec.personId)}</a> · ${esc(fmtDt(rec.submittedAt))} · ${esc(periodLabel(rec.period))}</p>

    <div class="mt-6 text-base leading-relaxed whitespace-pre-wrap text-gray-800">${esc(rec.content || '（无正文）')}</div>

    ${historyHtml}

    ${(prev || next) ? `
    <div class="mt-6 flex items-center justify-between gap-3">
      ${prev ? `<a href="thought-report.html?id=${prev.id}" class="text-xs text-gray-500 hover:text-gray-700">← 上一篇 · ${esc(periodLabel(prev.period))}</a>` : '<span></span>'}
      ${next ? `<a href="thought-report.html?id=${next.id}" class="text-xs text-gray-500 hover:text-gray-700">下一篇 · ${esc(periodLabel(next.period))} →</a>` : '<span></span>'}
    </div>` : ''}

    ${othersHtml}

    ${actionHtml}
  `;

  bindActions(rec);
}

/** 操作区绑定（每次成功 → showToast + 重新渲染本卡片，不整页 reload） */
function bindActions(rec) {
  const id = rec.id;

  // 组织委员 · 打回（先展开必填意见）——事后反馈，不是提交的门
  cardEl.querySelector('#tr-reject-toggle')?.addEventListener('click', () => {
    const box = cardEl.querySelector('#tr-reject-box');
    box?.classList.toggle('hidden');
  });
  cardEl.querySelector('#tr-reject-confirm')?.addEventListener('click', () => {
    const note = (cardEl.querySelector('#tr-reject-note')?.value || '').trim();
    if (!note) { showToast('error', '打回须填写意见'); return; }
    const res = rejectThoughtReport({ id, note, by: viewer.personId, role: viewer.role });
    if (!res || !res.ok) { showToast('error', (res && res.reason) || '打回失败，请稍后重试'); return; }
    showToast('success', '已打回并附意见，提交者可修改重交');
    renderSingle(id);
  });

  // 本人 · 被打回：修改并重新提交（实时提示，不作拦截；重交即入库归档）
  cardEl.querySelector('#tr-resubmit-toggle')?.addEventListener('click', () => {
    const box = cardEl.querySelector('#tr-resubmit-box');
    box?.classList.remove('hidden');
    syncResubmitHint();
  });
  const syncResubmitHint = () => {
    const el = cardEl.querySelector('#tr-resubmit-hint');
    if (!el) return;
    const h = wordCountHint(cardEl.querySelector('#tr-resubmit-content')?.value || '');
    el.textContent = `当前 ${h.count} 字 · ${h.hint}`;
    el.className = `text-[11px] ${h.level === 'short' ? 'text-amber-600' : 'text-gray-500'}`;
  };
  cardEl.querySelector('#tr-resubmit-content')?.addEventListener('input', syncResubmitHint);
  cardEl.querySelector('#tr-resubmit-confirm')?.addEventListener('click', () => {
    const content = (cardEl.querySelector('#tr-resubmit-content')?.value || '').trim();
    if (!content) { showToast('warning', '请填写修改后的思想汇报内容'); return; }
    const res = resubmitThoughtReport({ id, content, by: viewer.personId });
    if (!res || !res.ok) { showToast('error', (res && res.reason) || '重新提交失败，请稍后重试'); return; }
    showToast('success', '已重新提交，入库归档');
    renderSingle(id);
  });
}

// ════════════════════════════════════════════════════════════════
//  按人聚合视图（只读）
// ════════════════════════════════════════════════════════════════

function renderPerson(pid) {
  if (!cardEl) return;
  if (!canReadThoughtReport({ personId: pid }, viewer)) {
    renderMessage('无权查看该思想汇报（思想汇报仅本人与支委层可读）');
    return;
  }
  const groups = listThoughtReportsByPersonGrouped(pid);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total === 0) {
    renderMessage('该成员暂无思想汇报记录');
    return;
  }

  cardEl.innerHTML = `
    <div class="flex items-center gap-2 flex-wrap mb-5 pb-4 border-b border-gray-100">
      <h2 class="text-xl font-semibold text-gray-900">${esc(getPersonName(pid) || pid)}</h2>
      <span class="text-xs text-gray-500">共 ${total} 篇</span>
    </div>
    ${groups.map(g => `
      <div class="mb-5 last:mb-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-semibold text-gray-700">${esc(g.label)}</span>
          <span class="text-[11px] text-gray-500">${g.items.length} 篇</span>
        </div>
        <div class="space-y-1.5">
          ${g.items.map(r => `
            <a href="thought-report.html?id=${r.id}" class="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-gray-50 hover:bg-gray-50 transition-colors">
              <span class="text-sm font-medium text-gray-700 truncate flex-1">${esc(r.title || '思想汇报')}</span>
              <span class="text-[11px] text-gray-500 flex-shrink-0">${esc(fmtDt(r.submittedAt))}</span>
              <span class="text-[11px] text-gray-400 tabular-nums flex-shrink-0">${wordCountHint(r.content).count} 字</span>
              ${statusBadge(statusOf(r))}
            </a>`).join('')}
        </div>
      </div>`).join('')}
  `;
}
