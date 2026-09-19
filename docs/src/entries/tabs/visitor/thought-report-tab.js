// role: [工程师]+[AI]
// 参与者工作台 Tab：我的思想汇报（2026-08-30 支书决策启动数字化）
// 2026-09-18 批次 86（`SOP-B-28` 取消初阅门）：**提交即入库即归档**——不再有「待初阅」
//   中间态，提交后立刻进入个人档案；标题栏与提交区文案随口径改准（不再说「等初阅通过」）。
//   篇幅（`SOP-B-11`）：实时显示字数；建议 1500 字以上；少于 1200 字提示「触发警告审阅」，
//   **一律不影响提交**（本 tab 不设 maxlength/minlength、不做任何拦截）。
// 2026-09-13 面板数据改造（支书裁定「我认为还是需要用一个界面来承载！而不是展开！」）：
//  · 提交表单新增期次（period）手填下拉（缺省 = 当前期次）；
//  · 「我的汇报」按期次分组，逐篇点击跳**独立阅读页** docs/thought-report.html——
//    只读正文与「修改重交」均收敛到该页，本 tab 不再行内展开/就地编辑。
import { AuthStore } from '../../../services/auth.js?v=20260919k';
import {
  addThoughtReport, listThoughtReportsByPersonGrouped,
  wordCountHint, wordHint, wordSoftMin, periodOf, periodOptions,
} from '../../../services/thought-report.js?v=20260919k';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260919k';
// 统一检索引擎（支书 2026-09-14 裁定）：按期次分组子列表复用其分页（无 keyword/facets → 不渲染检索条）
import { renderFilteredList } from '../../../components/list-filter.js?v=20260919k';

// ── 状态徽标（与服务层 _effective 同语义：无状态 / 状态非法 / 旧 'pending' → 已入库）──
const STATUS_META = {
  needs_revision: { label: '已打回·待补充', cls: 'bg-red-100 text-red-700' },
  archived:       { label: '已入库', cls: 'bg-green-100 text-green-700' },
};

const _effStatus = (r) => (STATUS_META[r && r.reviewStatus] ? r.reviewStatus : 'archived');
const _dateTime = (iso) => { const s = (iso || ''); return s.length >= 16 ? s.slice(0, 16).replace('T', ' ') : s; };

const _statusBadgeHtml = (status) => {
  const m = STATUS_META[status];
  return `<span class="text-xs px-1.5 py-0.5 rounded-full font-medium ${m.cls}">${m.label}</span>`;
};

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    tc.innerHTML = '<p class="text-sm text-gray-500 text-center py-6">请先登录</p>';
    return;
  }
  const personId = user.personId;

  function render() {
    const groups = listThoughtReportsByPersonGrouped(personId);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const nowPeriod = periodOf(new Date().toISOString());

    // 按期次分组渲染（保持不变）：每组一个引擎实例——仅分页、不渲染检索条
    // （支书2026-09-14 批次37：无 keyword/facets 的桶/分组子列表复用引擎分页）；
    // stateKey 带期次标识 → 跨重渲染保页码，分组观感零改动
    const groupsHtml = groups.map(g => `
          <div class="mb-3 last:mb-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-xs font-semibold text-gray-700">${esc(g.label)}</span>
              <span class="text-[11px] text-gray-500">${g.items.length} 篇</span>
            </div>
            <div data-tr-group-host="${esc(g.period)}"></div>
          </div>`).join('');

    tc.innerHTML = `
      <div class="mb-3 p-3 rounded-lg bg-white">
        <p class="text-sm font-semibold text-gray-800">我的思想汇报</p>
        <p class="text-xs text-gray-500 mt-0.5">已提交 ${total} 篇 · 提交即入库归档至个人档案</p>
      </div>
      <div class="mb-3 p-3 rounded-lg bg-white border border-gray-100">
        <p class="text-xs font-medium text-gray-600 mb-2">提交思想汇报</p>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-[11px] text-gray-500 flex-shrink-0">期次</span>
          <select id="tr-period" class="input-flat text-xs">
            ${periodOptions().map(o => `<option value="${o.value}"${o.value === nowPeriod ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
          </select>
        </div>
        <textarea id="tr-content" rows="5" class="input-flat w-full resize-none" placeholder="请书写本季度思想汇报"></textarea>
        <div class="flex items-center justify-between mt-2 gap-2">
          <p class="text-[11px] text-gray-500">提交即入库归档至个人档案；建议 ${wordHint()} 字以上，少于 ${wordSoftMin()} 字将触发警告审阅（不影响提交）</p>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span id="tr-count" class="text-[11px] text-gray-500 tabular-nums">0 字</span>
            <button id="tr-submit" class="text-xs px-4 py-1.5 rounded-lg bg-sky-700 text-white hover:bg-sky-800 transition-colors">提交</button>
          </div>
        </div>
      </div>
      <div id="tr-list">${total === 0 ? '<p class="text-xs text-gray-500 text-center py-6">暂无思想汇报记录</p>' : groupsHtml}</div>
    `;

    // 逐期次接入统一检索引擎（行 HTML 原样；每组仅分页，页数 ≤1 不出翻页控件）
    groups.forEach(g => {
      renderFilteredList(tc.querySelector(`[data-tr-group-host="${g.period}"]`), {
        stateKey: `visitor-tr-group-${g.period}`,
        rows: g.items,
        listClass: 'space-y-1.5',
        countUnit: '篇',
        emptyMessage: '暂无思想汇报记录',
        rowHtml: (r) => {
          const wc = wordCountHint(r.content);
          return `
                <a href="thought-report.html?id=${r.id}" class="flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-50 hover:bg-gray-50 transition-colors">
                  <span class="text-xs font-medium text-gray-700 truncate flex-1">${esc(r.title || '思想汇报')}</span>
                  <span class="text-[11px] text-gray-500 flex-shrink-0">${_dateTime(r.submittedAt)}</span>
                  <span class="text-[11px] text-gray-400 tabular-nums flex-shrink-0">${wc.count} 字</span>
                  ${wc.level === 'short'
                    ? `<span class="text-[11px] text-amber-700 flex-shrink-0" title="少于 ${wordSoftMin()} 字：触发警告审阅（不影响提交与归档）">篇幅不足</span>`
                    : ''}
                  ${_statusBadgeHtml(_effStatus(r))}
                </a>`;
        },
      });
    });

    // ── 提交新汇报（提交即入库归档；期次手填，缺省当前期次）──
    // 篇幅按 wordCountHint 实时提示（单一源），**不设 maxlength/minlength、不拦截提交**
    const _contentEl = document.getElementById('tr-content');
    const _countEl = document.getElementById('tr-count');
    const _syncCount = () => {
      const h = wordCountHint(_contentEl?.value || '');
      if (_countEl) {
        _countEl.textContent = `当前 ${h.count} 字 · ${h.hint}`;
        _countEl.className = `text-[11px] tabular-nums ${h.level === 'short' ? 'text-amber-600' : 'text-gray-500'}`;
      }
    };
    _contentEl?.addEventListener('input', _syncCount);
    _syncCount();

    document.getElementById('tr-submit')?.addEventListener('click', () => {
      const content = document.getElementById('tr-content')?.value || '';
      if (!content.trim()) { showToast('warning', '请填写思想汇报内容'); return; }
      const period = document.getElementById('tr-period')?.value || nowPeriod;
      addThoughtReport({ personId, content, period });
      showToast('success', '思想汇报已提交，入库归档至个人档案');
      render();
    });
  }

  render();
}
