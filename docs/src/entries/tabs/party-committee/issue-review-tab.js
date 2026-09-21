// role: [工程师]+[AI]
// 党委工作台 Tab：匿名反馈核查（2026-09-17 支书裁定，本次改裁）
//
// 依据（支书 2026-09-17 原话）：「**后台记录真实情况，匿名是前端的。但是我们也强调清楚，
//   查看匿名的权限只有党委有。**」
//   · **本页仅党委可见**：非党委角色即使拼出该页签也拿不到真身（本模块内的角色闸门；
//     服务端 `GET /api/v1/issues/reveal` 另有 403 兜底——两道闸门，缺一不可）。
//   · **每次查看都留痕**（谁 / 何时 / 看了哪些匿名条目）：mock 形态写本地同名表 `issue_reveals`，
//     api 形态由服务端写同名表。留痕的意义＝让「只有党委能看」这句承诺**可被事后核对**。
//   · **党支部内部（含支书）看不到这里的真身**：支书只负责处置（`PATCH /issues`），
//     「处置权」与「查看真身权」是**两项分开的权限**——这正是本次改裁与旧「仅支书可追溯」的差别。
//   · **适用范围**：本改裁只落在意见反馈；「正式表决无记名」维持 2026-09-12 原裁定不变（不在此页）。
//
// 视觉/交互沿用党委台既有页签写法（与 review-tab.js 同款：卡片头 + renderFilteredList 引擎列表），
// 不自创样式（docs/src/styles.css 为禁改清单文件，未改动）。
// 真身数据出口单一源：services/issues.js::IssueStore.getIssuesForPartyReview（两形态同构）。

import { AuthStore } from '../../../services/auth.js?v=20260921l';
import { PARTY_STAFF_ROLE } from '../../../core/constants.js?v=20260921l';
import { IssueStore } from '../../../services/issues.js?v=20260921l';
import { getPersonName } from '../../../services/person.js?v=20260921l';
import { escHtml as esc, fmtDt } from '../../../core/utils.js?v=20260921l';
import { renderFilteredList } from '../../../components/list-filter.js?v=20260921l';

const SUBMIT_META = {
  anonymous: { label: '匿名提交', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  real: { label: '实名提交', cls: 'bg-gray-50 text-gray-600 border border-gray-200' },
};
const STATUS_META = {
  open: { label: '开放中', cls: 'bg-green-50 text-green-700' },
  closed: { label: '已关闭', cls: 'bg-gray-100 text-gray-600' },
};

/** 真实提交人（实名项真身即 submittedBy；匿名项真身＝党委核查出口补出的 realPersonId） */
function realSubmitter(r) {
  const id = r.realPersonId || r.submittedBy || '';
  if (!id) return { id: '', name: '（未记录）' };
  if (id === '匿名') return { id, name: '（未记录真实提交人）' };
  return { id, name: getPersonName(id) || id };
}

export async function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;

  // ── 角色闸门（前端半侧）：非党委一律不渲染真身，也不发起核查请求 ──
  const me = AuthStore.getCurrentUser();
  if (!PARTY_STAFF_ROLE.includes(me?.role)) {
    el.innerHTML = `
      <div class="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p class="text-sm font-medium text-gray-800">本页仅党委可见</p>
        <p class="text-xs text-gray-500 mt-1.5">匿名反馈的真实提交人只对党委开放；党支部内部（含支书）不可查看。</p>
        <p class="text-xs text-gray-400 mt-1">当前角色：${esc(me?.role || '未登录')}</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-title-cn text-base font-bold text-gray-800">匿名反馈核查</p>
          <p class="text-xs text-gray-500 mt-0.5">列出全部反馈的真实提交人（含匿名项）· 组织级角色专用</p>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 shrink-0">仅党委可见</span>
      </div>
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
        <p class="text-xs text-amber-800"><b>① 本页仅党委可见</b>：匿名 = 前端展示层匿名，后台记录真实提交人；查看真身的权限只有党委有。</p>
        <p class="text-xs text-amber-800"><b>② 每次查看都会留痕</b>（谁 / 何时 / 看了哪些匿名条目）：留痕让「只有党委能看」这句承诺可被事后核对。</p>
        <p class="text-xs text-amber-800"><b>③ 党支部内部（含支书）看不到本页信息</b>：支书只负责处置——「处置」与「查看真身」是两项分开的权限。</p>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-2">反馈清单</p>
        <div id="pc-issue-review-host"></div>
      </div>
    </div>
  `;

  const host = el.querySelector('#pc-issue-review-host');
  if (!host) return;

  // 党委核查出口（唯一带真身的读口；mock 读本地记录、api 走 /issues/reveal，两形态形状一致）。
  // ⚠ 口径判断（如实登记）：**本函数每次执行 = 一次查看 ⇒ 留一条痕**（引擎翻页/搜索是页内重绘，
  //   不重入本函数；工作台 state 变化导致的整页重渲会再留一条）。宁可多留不可漏留——
  //   留痕是「只有党委能看」这句承诺的唯一可核对凭据，少记一条就少一分可核对性。
  const { rows, traced, trace } = await IssueStore.getIssuesForPartyReview();
  const anonCount = rows.filter(r => r.anonymous).length;

  if (traced) {
    const when = trace?.at ? fmtDt(trace.at) : '';
    const who = trace?.by ? (getPersonName(trace.by) || trace.by) : '';
    host.insertAdjacentHTML('beforebegin', `
      <p class="text-xs text-gray-500 mb-2" id="pc-issue-review-trace">
        本次查看已留痕（${trace ? `查看人 ${esc(who)} · ${esc(when)} · ` : '由服务端记录 · '}本条含 ${anonCount} 条匿名反馈的真实提交人）
      </p>`);
  }

  renderFilteredList(host, {
    stateKey: 'party-committee-issue-review',
    rows,
    keyword: { keys: ['title', 'body'], placeholder: '搜索反馈标题 / 正文…' },
    facets: [
      { key: 'anonymous', label: '提交方式', get: (r) => (r.anonymous ? 'anonymous' : 'real'), format: (v) => (v === 'anonymous' ? '匿名提交' : '实名提交') },
      { key: 'status', label: '状态', format: (v) => (STATUS_META[v] || {}).label || v },
    ],
    countUnit: '条',
    listClass: 'space-y-3',
    emptyMessage: '暂无反馈 · 成员提交意见反馈后在此逐条核查',
    rowHtml: cardHtml,
  });
}

/** 单条反馈卡：显著标出「真实提交人」（实名=本名；匿名=真身 + 「匿名提交」标记） */
function cardHtml(r) {
  const sub = SUBMIT_META[r.anonymous ? 'anonymous' : 'real'];
  const st = STATUS_META[r.status] || { label: r.status || '—', cls: 'bg-gray-100 text-gray-600' };
  const who = realSubmitter(r);
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4" data-issue-id="${esc(r.id)}">
      <div class="flex items-center gap-2 flex-wrap mb-1.5">
        <span class="text-xs text-gray-500 font-mono">#${esc(String(r.number ?? ''))}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${sub.cls}">${sub.label}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${st.cls}">${st.label}</span>
        <span class="text-xs text-gray-400">${esc(fmtDt(r.submittedAt))}</span>
      </div>
      <p class="text-sm font-medium text-gray-800">${esc(r.title)}</p>
      <p class="text-xs text-gray-500 mt-1">真实提交人：<b class="text-gray-800">${esc(who.name)}</b>（${esc(who.id)}）${
        r.anonymous ? '<span class="text-gray-400"> · 对外显示「匿名」，不公开真身</span>' : '<span class="text-gray-400"> · 对外本就公开</span>'
      }</p>
    </div>`;
}
