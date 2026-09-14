// role: [工程师]+[AI]
// 组织委员工作台 Tab：思想汇报 初阅（R6-2 把关式初阅 UI 层，2026-09-07）
// 2026-09-13 面板数据改造（支书裁定「我认为还是需要用一个界面来承载！而不是展开！」）：
//  本 tab 只做**入口导航**——待初阅队列/按人浏览逐条跳**独立阅读页** docs/thought-report.html
//  （单篇 ?id= / 按人 ?personId=）；初阅动作（通过·归档 / 退回）、正文阅读均在该页完成，
//  本 tab 不再行内展开（已删 .tr-detail/.tr-expand-btn 与就地初阅）。
// 角色自 AuthStore.getCurrentUser() 取（勿自由传参）；非组织委员（org-commissioner）防御：仅提示无权限。

import { loadThoughtReports, listPendingReviews } from '../../../services/thought-report.js?v=20260914b';
import { getPersonName } from '../../../services/person.js?v=20260914b';
import { AuthStore } from '../../../services/auth.js?v=20260914b';
import { escHtml as esc } from '../../../core/utils.js?v=20260914b';

// ── R6-2 初阅状态：徽标样式 + 中文标签 ──
// 读取侧归一与服务层 _effective 同语义：reviewStatus 缺省/非法（R6-2 前算法归档产物）→ 已归档
const STATUS_META = {
  pending:        { label: '待初阅', cls: 'bg-orange-100 text-orange-700' },
  needs_revision: { label: '已退回·需补充', cls: 'bg-red-100 text-red-700' },
  archived:       { label: '已归档', cls: 'bg-green-100 text-green-700' },
};

const _effStatus = (r) => (STATUS_META[r && r.reviewStatus] ? r.reviewStatus : 'archived');
const _hist = (r) => (Array.isArray(r && r.reviewHistory) ? r.reviewHistory : []); // reviewHistory 可能为空数组
const _date = (iso) => (iso || '').slice(0, 10);
const _dateTime = (iso) => { const s = (iso || ''); return s.length >= 16 ? s.slice(0, 16).replace('T', ' ') : s; };
const _brief = (s) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > 40 ? t.slice(0, 40) + '…' : t; };
const _decisionLabel = (d) => (d === 'approve' ? '通过' : (d === 'reject' ? '退回' : String(d || '')));

const _statusBadgeHtml = (status) => {
  const m = STATUS_META[status];
  return `<span class="text-xs px-1.5 py-0.5 rounded-full font-medium ${m.cls}">${m.label}</span>`;
};

/** 初阅留痕摘要：「{by 姓名} 于 {at} 通过/退回{意见}」（reviewHistory 为空数组 → 空串） */
const _historyHtml = (rec) => _hist(rec).map(h => `
      <div class="text-[11px] text-gray-500">${esc(getPersonName(h.by) || h.by || '—')} 于 ${_dateTime(h.at)} ${_decisionLabel(h.decision)}${h.note ? `：${esc(h.note)}` : ''}</div>`).join('');

export function renderContent(ctx) { // ctx 对齐 org 其它 tab（accent 等共享只读配置；本 tab 不需消费）
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="card rounded-xl p-5"><p class="text-xs text-gray-500 text-center py-6">请先登录后使用</p></div>';
    return;
  }
  // 防御：非组织委员不渲染（提示无权限）
  if (user.role !== 'org-commissioner') {
    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <p class="text-xs text-gray-500 text-center py-6">无权限：仅组织委员可初阅思想汇报（当前角色：${esc(user.role || '—')}）</p>
      </div>`;
    return;
  }

  function render() {
    // 待初阅队列：先到先阅（服务层 listPendingReviews 已按提交时间升序）
    const queue = listPendingReviews();
    // 按人浏览：全部思想汇报（含待初阅/已归档/已退回·需补充），按人归组（人名一律 live getPersonName，勿用记录内快照）
    const groupMap = new Map();
    loadThoughtReports().forEach(r => {
      const pid = r.personId || 'unknown';
      if (!groupMap.has(pid)) groupMap.set(pid, { name: getPersonName(pid) || pid, items: [] });
      groupMap.get(pid).items.push(r);
    });
    const byPerson = [...groupMap.values()];
    byPerson.forEach(g => g.items.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')));

    const queueRowHtml = queue.length === 0
      ? '<p class="text-xs text-gray-500 text-center py-8">暂无待初阅的思想汇报——成员新提交将在此按提交时间先后待阅</p>'
      : queue.map(r => {
          const who = esc(getPersonName(r.personId) || r.personId);
          const title = esc(r.title || '思想汇报');
          return `
          <a href="thought-report.html?id=${r.id}" data-tr-id="${r.id}" class="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-50 hover:bg-gray-50 transition-colors">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-semibold text-gray-800">${who}</span>
                <span class="text-xs font-medium text-gray-600">《${title}》</span>
                <span class="text-[11px] text-gray-500">${_date(r.submittedAt)}</span>
              </div>
              <p class="text-[12px] text-gray-500 mt-1">${esc(_brief(r.content))}</p>
            </div>
            <span class="text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap flex-shrink-0">阅读并初阅 →</span>
          </a>`;
        }).join('');

    const browseHtml = byPerson.length === 0
      ? '<p class="text-xs text-gray-500 text-center py-6">暂无思想汇报记录</p>'
      : byPerson.map(g => `
          <div class="mb-4 last:mb-0">
            <a href="thought-report.html?personId=${encodeURIComponent(g.items[0].personId || '')}" class="flex items-center gap-2 mb-2 group">
              <span class="text-sm font-semibold text-gray-800 group-hover:text-sky-700 transition-colors">${esc(g.name)}</span>
              <span class="text-[11px] text-gray-500">${g.items.length} 篇 · 全部阅读 →</span>
            </a>
            <div class="space-y-2">
              ${g.items.map(item => {
                const hist = _historyHtml(item);
                return `
                <a href="thought-report.html?id=${item.id}" class="block p-2.5 rounded-lg bg-white border border-gray-50 hover:bg-gray-50 transition-colors">
                  <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="text-xs font-medium text-gray-700 truncate">${esc(item.title || '思想汇报')}</span>
                      <span class="text-[11px] text-gray-500 flex-shrink-0">${_date(item.submittedAt)}</span>
                    </div>
                    ${_statusBadgeHtml(_effStatus(item))}
                  </div>
                  ${hist ? `<div class="mt-1.5 space-y-0.5">${hist}</div>` : ''}
                </a>`;
              }).join('')}
            </div>
          </div>`).join('');

    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">待初阅队列</h3>
          <span class="text-xs text-gray-500">${queue.length} 篇 · 先到先阅</span>
        </div>
        <p class="text-xs text-gray-500 mb-3">组织初阅把关：通过才正式归档；退回请附意见（提交者可见并可修改重交）。点击任一条进入阅读页进行初阅。</p>
        <div class="space-y-2">${queueRowHtml}</div>
      </div>
      <div class="card rounded-xl p-5 mt-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">按人浏览</h3>
          <span class="text-xs text-gray-500">${byPerson.length} 人</span>
        </div>
        ${browseHtml}
      </div>
    `;
  }

  render();
}
