// role: [工程师]+[AI]
// 参与者工作台 Tab：我的思想汇报（2026-08-30 支书决策启动数字化；2026-09-07 R6-2 把关式初阅）
// 2026-09-13 面板数据改造（支书裁定「我认为还是需要用一个界面来承载！而不是展开！」）：
//  · 提交表单新增期次（period）手填下拉（缺省 = 当前期次）；
//  · 字数提示改用 wordCountHint（软提示、不拦截）；
//  · 「我的汇报」按期次分组，逐篇点击跳**独立阅读页** docs/thought-report.html——
//    只读正文、修改重交、撤回均收敛到该页，本 tab 不再行内展开/就地编辑。
import { AuthStore } from '../../../services/auth.js?v=20260914o';
import {
  addThoughtReport, listThoughtReportsByPersonGrouped,
  wordCountHint, periodOf, periodOptions,
} from '../../../services/thought-report.js?v=20260914o';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260914o';

// ── R6-2 初阅状态徽标（与 org 侧 thought-review-tab 同体系：琥珀待初阅 / 绿已归档 / 红已退回）──
// 读取侧与服务层 _effective 同语义：reviewStatus 缺省/非法（R6-2 前算法归档产物）→ 已归档
const STATUS_META = {
  pending:        { label: '待初阅', cls: 'bg-orange-100 text-orange-700' },
  needs_revision: { label: '已退回·需补充', cls: 'bg-red-100 text-red-700' },
  archived:       { label: '已归档', cls: 'bg-green-100 text-green-700' },
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

    const listHtml = total === 0
      ? '<p class="text-xs text-gray-500 text-center py-6">暂无思想汇报记录</p>'
      : groups.map(g => `
          <div class="mb-3 last:mb-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-xs font-semibold text-gray-700">${esc(g.label)}</span>
              <span class="text-[11px] text-gray-500">${g.items.length} 篇</span>
            </div>
            <div class="space-y-1.5">
              ${g.items.map(r => `
                <a href="thought-report.html?id=${r.id}" class="flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-50 hover:bg-gray-50 transition-colors">
                  <span class="text-xs font-medium text-gray-700 truncate flex-1">${esc(r.title || '思想汇报')}</span>
                  <span class="text-[11px] text-gray-500 flex-shrink-0">${_dateTime(r.submittedAt)}</span>
                  <span class="text-[11px] text-gray-400 tabular-nums flex-shrink-0">${wordCountHint(r.content).count} 字</span>
                  ${_statusBadgeHtml(_effStatus(r))}
                </a>`).join('')}
            </div>
          </div>`).join('');

    tc.innerHTML = `
      <div class="mb-3 p-3 rounded-lg bg-white">
        <p class="text-sm font-semibold text-gray-800">我的思想汇报</p>
        <p class="text-xs text-gray-500 mt-0.5">已提交 ${total} 篇 · 组织初阅通过后自动归档至个人档案</p>
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
          <p class="text-[11px] text-gray-500">提交后由组织初阅归档，通过后自动归档至个人档案</p>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span id="tr-count" class="text-[11px] text-gray-500 tabular-nums">0 字</span>
            <button id="tr-submit" class="text-xs px-4 py-1.5 rounded-lg bg-sky-700 text-white hover:bg-sky-800 transition-colors">提交</button>
          </div>
        </div>
      </div>
      <div id="tr-list">${listHtml}</div>
    `;

    // ── 提交新汇报（R6-2：入库 pending，组织初阅通过后才归档；期次手填，缺省当前期次）──
    // 篇幅按 wordCountHint 实时软提示（单一源），**不设 maxlength/minlength、不拦截提交**
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
      showToast('success', '思想汇报已提交，待组织初阅');
      render();
    });
  }

  render();
}
