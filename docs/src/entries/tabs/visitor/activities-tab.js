// role: [工程师]+[AI]
// 参与者工作台 Tab：活动动态（T-279 M3 拆分，照 M2 样板）
// 三视图：列表（分页）/ 日历 / 查询；列表与日历为纯展示，查询复用全局查询组件。
// URL 落点高亮（?activityId=）经 ctx.highlightId 一次性消费（对齐单体版参数清除后的行为）。

import { icon } from '../../../core/icons.js?v=20260901u';
import { renderQueryView } from '../../../components/query-view.js?v=20260901u';
import { flashHighlight } from '../../../core/utils.js?v=20260901u';
import { getActivityTypeColors } from '../../../core/constants.js?v=20260901u';

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();

// 活动动态列表分页（书记 2026-08-08 决策：活动页分页，每页 10 条）
const ACTIVITY_PAGE_SIZE = 10;
let _visitorActPage = 1; // 当前页（模块级，切换 列表/日历/查询 视图后保留）

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const activities = ctx.activities || [];
  const highlightId = ctx.highlightId || null;
  const sorted = [...activities].filter(a => a.date && !a.archived && a.status !== 'cancelled').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  tc.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs text-gray-500">${sorted.length} 条活动</span>
      <div class="flex gap-1">
        <button class="visitor-view-btn px-3 py-1.5 text-xs rounded-lg border transition-colors" data-vview="list" style="background:rgba(206,17,38,0.08);color:var(--primary-700);border:1px solid rgba(206,17,38,0.2);">
          ${icon('list', { className: 'w-3.5 h-3.5' })} 列表
        </button>
        <button class="visitor-view-btn px-3 py-1.5 text-xs rounded-lg border transition-colors" data-vview="calendar" style="background:var(--surface-card);color:var(--neutral-500);border:1px solid var(--neutral-200);">
          ${icon('calendar', { className: 'w-3.5 h-3.5' })} 日历
        </button>
        <button class="visitor-view-btn px-3 py-1.5 text-xs rounded-lg border transition-colors" data-vview="query" style="background:var(--surface-card);color:var(--neutral-500);border:1px solid var(--neutral-200);">
          ${icon('search', { className: 'w-3.5 h-3.5' })} 查询
        </button>
      </div>
    </div>
    <div id="visitor-act-view"></div>
  `;

  tc.querySelectorAll('.visitor-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tc.querySelectorAll('.visitor-view-btn').forEach(b => {
        b.style.background = 'var(--surface-card)'; b.style.color = 'var(--neutral-500)'; b.style.border = '1px solid var(--neutral-200)';
      });
      btn.style.background = 'rgba(206,17,38,0.08)'; btn.style.color = 'var(--primary-700)'; btn.style.border = '1px solid rgba(206,17,38,0.2)';
      const view = btn.dataset.vview;
      if (view === 'list') _renderActListView(sorted, highlightId);
      else if (view === 'calendar') _renderActCalendarView(sorted, highlightId);
      else _renderActQueryView(sorted, highlightId);
    });
  });

  _renderActListView(sorted, highlightId);
  // 一次性消费高亮目标（对齐单体版 URL 参数清除后的行为，防 setState 重渲染重复滚动定位）
  if (typeof ctx.onNavLocated === 'function') ctx.onNavLocated();
}

function _renderActListView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  // 分页：每页 10 条；存在高亮活动时优先定位到其所在页
  let page = _visitorActPage;
  if (highlightId) {
    const idx = sorted.findIndex(a => a.id === highlightId);
    if (idx >= 0) page = Math.floor(idx / ACTIVITY_PAGE_SIZE) + 1;
  }
  const totalPages = Math.max(1, Math.ceil(sorted.length / ACTIVITY_PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  _visitorActPage = page;

  const start = (page - 1) * ACTIVITY_PAGE_SIZE;
  const pageItems = sorted.slice(start, start + ACTIVITY_PAGE_SIZE);

  vc.innerHTML = `
    <div class="space-y-2">
      ${sorted.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>' :
        pageItems.map(a => {
          const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
          return `
            <a href="../activity.html?id=${a.id || ''}" class="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer" data-visitor-act-id="${a.id || ''}">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
              </div>
            </a>
          `;
        }).join('')}
    </div>
    ${totalPages > 1 ? `
      <div class="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <button type="button" class="visitor-act-page-btn text-xs px-3 py-1.5 rounded-lg border transition-colors ${page <= 1 ? 'opacity-40 pointer-events-none' : ''}" data-act-page="${page - 1}" style="border-color:var(--neutral-200);color:var(--neutral-600);">‹ 上一页</button>
        <span class="text-xs text-gray-500">第 ${page} / ${totalPages} 页</span>
        <button type="button" class="visitor-act-page-btn text-xs px-3 py-1.5 rounded-lg border transition-colors ${page >= totalPages ? 'opacity-40 pointer-events-none' : ''}" data-act-page="${page + 1}" style="border-color:var(--neutral-200);color:var(--neutral-600);">下一页 ›</button>
      </div>` : ''}
  `;

  vc.querySelectorAll('.visitor-act-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _visitorActPage = parseInt(btn.dataset.actPage, 10) || 1;
      _renderActListView(sorted, highlightId);
    });
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（书记 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
  }
}

function _renderActCalendarView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  const byMonth = {};
  sorted.forEach(a => {
    const m = (a.date || '').substring(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(a);
  });
  const months = Object.keys(byMonth).sort().reverse();

  vc.innerHTML = months.length === 0
    ? '<p class="text-xs text-gray-400 text-center py-6">暂无活动</p>'
    : months.map(m => {
      const acts = byMonth[m];
      const [y, mo] = m.split('-');
      const monthLabel = `${y}年${parseInt(mo)}月`;
      return `
        <div class="mb-5">
          <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            ${icon('calendar', { stroke: 'var(--primary-700)', className: 'w-3.5 h-3.5' })}
            ${monthLabel}
            <span class="text-xs font-normal text-gray-400">${acts.length} 场</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${acts.map(a => {
              const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
              const day = (a.date || '').substring(8, 10);
              return `
                <a href="../activity.html?id=${a.id || ''}" class="flex items-start gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer" data-visitor-act-id="${a.id || ''}">
                  <div class="text-center flex-shrink-0 w-10">
                    <div class="text-lg font-bold" style="color:${color.text || color.dot};line-height:1;">${day || '?'}</div>
                    <div class="text-xs text-gray-400">日</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（书记 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
  }
}

function _renderActQueryView(sorted, highlightId) {
  const vc = document.getElementById('visitor-act-view');
  if (!vc) return;

  const typeOptions = Object.keys(ACTIVITY_TYPE_COLORS).map(key => ({
    value: key,
    label: key,
  }));

  renderQueryView(vc, {
    searchPlaceholder: '搜索活动名称、地点...',
    searchKey: 'title',
    filters: [
      { key: 'type', label: '活动类型', options: typeOptions },
    ],
    data: sorted,
    renderRow: (a) => {
      const color = ACTIVITY_TYPE_COLORS[a.type || a.category] || { bg: '#F9FAFB', dot: '#6B7280' };
      return `
        <a href="../activity.html?id=${a.id || ''}" class="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer" data-visitor-act-id="${a.id || ''}">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800">${a.title || '未命名'}</p>
            <p class="text-xs text-gray-500 mt-0.5">${a.date || '待定'} · ${a.type || '—'}${a.location ? ' · ' + a.location : ''}</p>
          </div>
        </a>
      `;
    },
    emptyMessage: '无匹配活动',
    sortKey: 'date',
    sortDir: 'desc',
    pageSize: 10,      // 活动无上限增长 → 分页（2026-08-07）
    pageParam: 'vpage',
  });

  if (highlightId) {
    const el = vc.querySelector(`[data-visitor-act-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮定时自动褪去（书记 2026-08-08 裁定：2.5~3s CSS 过渡）
      flashHighlight(el);
    }
  }
}
