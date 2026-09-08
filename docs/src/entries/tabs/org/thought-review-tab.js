// role: [工程师]+[AI]
// 组织委员工作台 Tab：思想汇报 初阅（R6-2 把关式初阅 UI 层，2026-09-07）
// 承接 services/thought-report.js 把关式状态机（书记 2026-09-07 定案）：
//   pending（待组织初阅）→ 组织委员初阅 approve → archived（通过即归档）
//                             reject（须附意见）→ needs_revision → 本人修改重交 → pending
// 职责边界：初阅操作收敛本 tab 单入口（development「发展数据」只读展开不动，不加操作，避免两处入口）；
// 提交/修改重交在成员侧（visitor）完成。
// 角色自 AuthStore.getCurrentUser() 取（勿自由传参）；非组织委员（org-commissioner）防御：仅提示无权限。

import { loadThoughtReports, listPendingReviews, reviewThoughtReport } from '../../../services/thought-report.js?v=20260908d';
import { getPersonName } from '../../../services/person.js?v=20260908d';
import { AuthStore } from '../../../services/auth.js?v=20260908d';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260908d';

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
      <div class="text-[11px] text-gray-400">${esc(getPersonName(h.by) || h.by || '—')} 于 ${_dateTime(h.at)} ${_decisionLabel(h.decision)}${h.note ? `：${esc(h.note)}` : ''}</div>`).join('');

export function renderContent(ctx) { // ctx 对齐 org 其它 tab（accent 等共享只读配置；本 tab 不需消费）
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="card rounded-xl p-5"><p class="text-xs text-gray-400 text-center py-6">请先登录后使用</p></div>';
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
  const actor = { personId: user.personId, role: user.role };

  function render() {
    // E-4（2026-09-09 · H60.7 面板保态复查④）：操作（通过/退回）后整 tab 重渲染，
    // 原实现清其它已展开行的展开态与退回意见草稿 → 渲染前收集、渲染后回填；
    // 被处置行已退出队列/归入浏览区 → 对应状态随元素消失自然清掉，不残留。
    const openDetailIds = new Set();
    container.querySelectorAll('.tr-detail:not(.hidden)').forEach(d => {
      if (d.dataset.trDetail) openDetailIds.add(d.dataset.trDetail);
    });
    const noteVals = new Map();
    container.querySelectorAll('input[id^="tr-note-"]').forEach(inp => {
      if (inp.value) noteVals.set(inp.id, inp.value);
    });

    // 待初阅队列：先到先阅（服务层 listPendingReviews 已按提交时间升序）
    const queue = listPendingReviews();
    // 按人浏览：全部思想汇报（含待初阅/已归档/已退回·需补充），按人归组
    const groupMap = new Map();
    loadThoughtReports().forEach(r => {
      const pid = r.personId || 'unknown';
      if (!groupMap.has(pid)) groupMap.set(pid, { name: r.personName || getPersonName(pid) || pid, items: [] });
      groupMap.get(pid).items.push(r);
    });
    const byPerson = [...groupMap.values()];
    byPerson.forEach(g => g.items.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')));

    const queueRowHtml = queue.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-8">暂无待初阅的思想汇报——成员新提交将在此按提交时间先后待阅</p>'
      : queue.map(r => {
          const who = esc(r.personName || getPersonName(r.personId) || r.personId);
          const title = esc(r.title || '思想汇报');
          return `
          <div class="p-3 rounded-xl bg-white border border-gray-50">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-semibold text-gray-800">${who}</span>
                  <span class="text-xs font-medium text-gray-600">《${title}》</span>
                  <span class="text-[11px] text-gray-400">${_date(r.submittedAt)}</span>
                </div>
                <p class="text-[12px] text-gray-500 mt-1">${esc(_brief(r.content))}</p>
              </div>
              <button type="button" class="tr-expand-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap" data-tr-id="${r.id}" style="cursor:pointer;">阅看</button>
            </div>
            <div class="tr-detail hidden mt-3 pt-3 border-t border-gray-100" data-tr-detail="${r.id}">
              <p class="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed mb-3">${esc(r.content || '（无正文）')}</p>
              <div class="flex items-center gap-2 flex-wrap">
                <button type="button" class="tr-approve-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors whitespace-nowrap" data-tr-id="${r.id}" style="cursor:pointer;">通过·归档</button>
                <button type="button" class="tr-reject-btn text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors whitespace-nowrap" data-tr-id="${r.id}" style="cursor:pointer;">退回·需补充</button>
                <input type="text" id="tr-note-${r.id}" class="input-flat flex-1 min-w-0" maxlength="120" placeholder="退回意见（退回必填，提交者可见并可修改重交）" aria-label="退回意见">
              </div>
            </div>
          </div>`;
        }).join('');

    const browseHtml = byPerson.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-6">暂无思想汇报记录</p>'
      : byPerson.map(g => `
          <div class="mb-4 last:mb-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-semibold text-gray-800">${esc(g.name)}</span>
              <span class="text-[11px] text-gray-400">${g.items.length} 篇</span>
            </div>
            <div class="space-y-2">
              ${g.items.map(item => {
                const hist = _historyHtml(item);
                return `
                <div class="p-2.5 rounded-lg bg-white border border-gray-50">
                  <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="text-xs font-medium text-gray-700 truncate">${esc(item.title || '思想汇报')}</span>
                      <span class="text-[11px] text-gray-400 flex-shrink-0">${_date(item.submittedAt)}</span>
                    </div>
                    ${_statusBadgeHtml(_effStatus(item))}
                  </div>
                  ${hist ? `<div class="mt-1.5 space-y-0.5">${hist}</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>`).join('');

    container.innerHTML = `
      <div class="card rounded-xl px-4 py-3 mb-3">
        <p class="text-xs text-gray-500">组织初阅把关：通过才正式归档；退回请附意见（提交者可见并可修改重交）。</p>
      </div>
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">待初阅队列</h3>
          <span class="text-xs text-gray-400">${queue.length} 篇 · 先到先阅</span>
        </div>
        <div class="space-y-2">${queueRowHtml}</div>
      </div>
      <div class="card rounded-xl p-5 mt-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">按人浏览</h3>
          <span class="text-xs text-gray-400">${byPerson.length} 人</span>
        </div>
        ${browseHtml}
      </div>
    `;

    // ── 阅看/收起：展开全文 + 初阅操作区 ──
    container.querySelectorAll('.tr-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const detail = container.querySelector(`.tr-detail[data-tr-detail="${btn.dataset.trId}"]`);
        if (!detail) return;
        const collapsed = detail.classList.contains('hidden');
        detail.classList.toggle('hidden', !collapsed);
        btn.textContent = collapsed ? '收起' : '阅看';
      });
    });

    // ── 通过·归档 / 退回·需补充 ──
    const submitReview = (id, decision) => {
      const rec = queue.find(x => x.id === id);
      if (!rec) { showToast('error', '思想汇报不存在或已不在待初阅队列，请刷新后重试'); render(); return; }
      const note = (container.querySelector(`#tr-note-${id}`)?.value || '').trim();
      if (decision === 'reject' && !note) { showToast('error', '请填写退回意见'); return; }
      const res = reviewThoughtReport({ id, decision, note: decision === 'reject' ? note : '', by: actor.personId, role: actor.role });
      if (!res || !res.ok) { showToast('error', (res && res.reason) || '初阅失败，请稍后重试'); return; }
      const who = rec.personName || getPersonName(rec.personId) || rec.personId;
      const title = rec.title || '思想汇报';
      showToast('success', decision === 'approve'
        ? `《${title}》（${who}）初阅通过，已正式归档`
        : `《${title}》（${who}）已退回并附意见，提交者可修改重交`);
      render(); // 操作后刷新（队列与按人浏览同步）
    };
    container.querySelectorAll('.tr-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => submitReview(btn.dataset.trId, 'approve'));
    });
    container.querySelectorAll('.tr-reject-btn').forEach(btn => {
      btn.addEventListener('click', () => submitReview(btn.dataset.trId, 'reject'));
    });

    // ── E-4：回填本次重渲染前仍存在的其它展开行（展开态 + 退回意见草稿）──
    openDetailIds.forEach(id => {
      const detail = container.querySelector(`.tr-detail[data-tr-detail="${id}"]`);
      if (!detail) return; // 行已退出队列（被处置/已归档）→ 展开态自然丢弃
      detail.classList.remove('hidden');
      const btn = container.querySelector(`.tr-expand-btn[data-tr-id="${id}"]`);
      if (btn) btn.textContent = '收起'; // 与展开态同步按钮文案
    });
    noteVals.forEach((v, id) => {
      const el = container.querySelector('#' + id);
      if (el) el.value = v; // 行仍在队列才回填；被处置行草稿随元素消失
    });
  }

  render();
}
