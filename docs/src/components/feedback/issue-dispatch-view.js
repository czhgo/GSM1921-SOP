// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/feedback/issue-dispatch-view.js —— **「我的处置」视图层**
//
//  分层纪律（G1 第③项，2026-09-28）：**服务层不产 UI**。原 `renderMyDispatchTab` /
//  `bindMyDispatchEvents` 及其三个详情渲染私有件住在 services/governance/issues.js 尾部，
//  服务层因此 import 了组件（统一检索引擎 list-filter）——本轮把**视图部分整块搬到这里**
//  （逐字搬迁、零行为变化）。数据侧只留在 services/governance/issues.js（IssueStore / IssueNotify
//  / deriveIssueDisplayState / REPORT_CATEGORIES）。
//
//  依赖方向正确：组件 → 服务（不是服务 → 组件）。守卫：issue-branch.test.mjs（结构层）。
// ════════════════════════════════════════════════════════════════

import { renderFilteredList } from '../ui/list-filter.js?v=20260929g';
import { escHtml, showToast } from '../../core/base/utils.js?v=20260929g';
import { IssueStore, IssueNotify, deriveIssueDisplayState, REPORT_CATEGORIES, displayNameOf as _displayName } from '../../services/governance/issues.js?v=20260929g';

// ════════════════════════════════════════════════════════════════
//  「我的处置」Tab 渲染工具（各角色工作台复用）
//  2026-07-30 新增：被指派人视角的反馈列表+详情+评论/提交处置结果
// ════════════════════════════════════════════════════════════════

/**
 * 渲染「我的处置」Tab 内容
 * @param {string} role 角色键（如 'org-commissioner'）
 * @param {string} userId 被指派人 personId（如 'p11'）
 * @returns {string} HTML
 */
export function renderMyDispatchTab(role, userId) {
  // 支书规则（2026-08-01）：带时间字段的列示按提交时间倒序（最新在前）——三区行序现由引擎 sort 承载
  //（单一源见 bindMyDispatchEvents）；此处排序仅用于取「请我汇报」块标题的发起人（最新一条）
  const issues = IssueStore.getAssignedTo(userId);
  const unread = IssueNotify.getUnread(userId);

  // 标记全部已读
  unread.forEach(id => IssueNotify.markRead(userId, id));

  // ── 我的汇报（2026-08-10 新增，支书裁定：信息双向互动）──
  const reportRequests = IssueStore.getReportRequestsFor(userId)
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')); // IA-C2：取最新一条作块标题发起人
  const myReports = IssueStore.getMyReports(userId);
  // 我提交 / 参与的反馈（2026-09-15 支书裁定「每个人都可以参与答复」）——成员（participant）亦可在此答复
  const myIssues = IssueStore.getMyIssues(userId);

  let html = `<div class="space-y-3">`;

  // ① 上级"了解进展"请求（待我汇报，行内填写即发；发起人可能是支书或组长）
  //  三区行内容统一改由检索引擎渲染（本函数只出宿主 div——引擎需 DOM 就位后才可挂载，
  //  挂载与行内动作委托均见 bindMyDispatchEvents）
  if (reportRequests.length) {
    const requesterName = _displayName(reportRequests[0].requestedBy) || '上级';
    html += `<div class="rounded-xl border border-blue-200 bg-blue-50/40 p-3">`;
    html += `<p class="text-xs font-medium text-blue-700 mb-2">${requesterName}请汇报 · ${reportRequests.length}</p>`;
    html += `<div id="mydispatch-req-host"></div>`;
    html += `</div>`;
  }

  // ② 我发起的汇报（追踪 + 详情 + 确认收到）
  if (myReports.length) {
    html += `<div class="rounded-xl border border-gray-100 bg-white p-3">`;
    html += `<p class="text-xs font-medium text-gray-700 mb-2">我发起的汇报 · ${myReports.length}</p>`;
    html += `<div id="mydispatch-myreports-host"></div>`;
    html += `</div>`;
  }

  // ③ 指派给我的反馈（原有）
  // IA-C2 收敛（2026-09-06）：块标题与 ①/② 对齐、明示计数；超期优先不适用（issue/report 无 deadline 字段），
  // 排序沿用支书 2026-08-01「带时间字段按提交时间倒序」裁定（登记）。空态由引擎 emptyMessage 承载（文案原样）。
  html += `<p class="text-xs font-medium text-gray-700 mb-1">指派给我的反馈 · ${issues.length}</p>`;
  html += `<p class="text-xs text-gray-500 mb-2">开放中指派，可评论或提交处置结果</p>`;
  html += `<div id="mydispatch-issues-host"></div>`;

  // ④ 我提交 / 参与的反馈（每个人都可以参与答复——成员亦可对自己提交/参与的反馈追加说明）
  // ⚠ 口径（2026-09-17 支书裁定 `Q-23-48` 走「加不可反查的本人标识」，本批落地）：
  //   api 形态下公开反馈的 `submittedBy`/`participants` 一律按对外匿名脱敏（`server/seed.js::seedIssues`），
  //   故「按人回认」在正式部署下靠不住。改走**本浏览器随机令牌的哈希**（`getMyIssues` 第 ③ 条判据）：
  //   提交时客户端带一个与 personId 无关的随机令牌，服务端只存哈希 ⇒ 浏览器自己认得出「我提交过哪几条」，
  //   而 **tokenHash 本身推不出提交人**（仅判重/限频；真身另存 `_realPersonId`，仅党委可查、每次留痕
  //   ——见本文件顶部匿名口径）。边界如实写出：换设备/清浏览器数据后认不回。
  html += `<div class="rounded-xl border border-gray-100 bg-white p-3 mt-3">`;
  html += `<p class="text-xs font-medium text-gray-700 mb-1">我提交 / 参与的反馈 · ${myIssues.length}</p>`;
  html += `<p class="text-xs text-gray-500 mb-2">本浏览器提交的反馈可在此回看（按提交时的随机令牌比对，不以提交人身份为判据；换设备或清除浏览器数据后无法回认）</p>`;
  html += `<div id="mydispatch-myissues-host"></div>`;
  html += `</div>`;

  html += `</div>`;
  html += `<div id="mydispatch-detail" class="hidden"></div>`;
  return html;
}

/** 重渲染「我的处置」Tab（汇报/评论动作后调用）
 *  E-3（2026-09-09）：整 tab 重建前收集各「了解进展」待填行未提交草稿，重建后回填——
 *  提交某行不丢其它行已填内容（原实现整表重建清所有行草稿）。 */
function _rerenderMyDispatch(container, role, userId) {
  if (!container) return;
  const drafts = new Map();
  container.querySelectorAll('input[id^="report-req-input-"]').forEach(inp => {
    if (inp.value) drafts.set(inp.id, inp.value);
  });
  container.innerHTML = renderMyDispatchTab(role, userId);
  bindMyDispatchEvents(container, role, userId);
  drafts.forEach((v, id) => {
    const el = container.querySelector('#' + id);
    if (el) el.value = v; // 提交行已随数据移出/重建 → 无对应元素自然跳过
  });
}

/**
 * 绑定「我的处置」Tab 事件（在 tab 内容渲染后调用）
 * 2026-09-14 批次 37：三区各接一个统一检索引擎实例（① 请我汇报 / ② 我发起的汇报 / ③ 指派给我的反馈）。
 * 数据按同一 userId 从 IssueStore 现取（与 renderMyDispatchTab 同源，按 submittedAt 倒序——排序交引擎 sort）；
 * 行内动作一律事件委托：委托宿主 div 由 renderMyDispatchTab 每次新建、引擎只重绘其内部，
 * 故筛选/翻页后仍有效，且不随每次渲染叠加监听。
 */
export function bindMyDispatchEvents(container, role, userId) {
  const bySubmittedDesc = (a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '');

  // ① 请我汇报（行内填写即发）
  const reqHost = container.querySelector('#mydispatch-req-host');
  if (reqHost) {
    renderFilteredList(reqHost, {
      stateKey: 'mydispatch-report-requests',
      rows: IssueStore.getReportRequestsFor(userId),
      keyword: { keys: ['title', 'body'], placeholder: '搜索汇报事项…' },
      sort: bySubmittedDesc,
      countUnit: '条',
      listClass: 'space-y-0', // 行自带 mb-2（8px），保持原行间距
      emptyMessage: '暂无待我汇报的请求',
      rowHtml: (r) => `
        <div class="rounded-lg bg-white border border-blue-100 p-3 mb-2">
          <p class="text-sm font-medium text-gray-800">${r.title}</p>
          ${r.body && r.body !== r.title ? `<p class="text-xs text-gray-600 mt-1">${r.body}</p>` : ''}
          <div class="flex gap-2 mt-2">
            <input type="text" id="report-req-input-${r.id}" class="input-flat flex-1" placeholder="填写汇报内容…">
            <button data-mydispatch-action="submit-report" data-issue-id="${r.id}" class="text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex-shrink-0">汇报</button>
          </div>
        </div>`,
    });
    reqHost.addEventListener('click', (e) => {
      const el = e.target.closest('[data-mydispatch-action="submit-report"]');
      if (!el) return;
      const id = el.dataset.issueId;
      const input = document.getElementById('report-req-input-' + id);
      const body = input?.value?.trim();
      if (!body) { showToast('error', '请填写汇报内容'); return; }
      IssueStore.addComment(id, userId, role, body, 'result');
      // E-3：提交行立即清空再整 tab 重渲染——已发内容不回填到该行输入框
      //（该行因 requestedBy+open 过滤在 ① 区仍保留，仅草稿清空）
      if (input) input.value = '';
      showToast('success', '汇报已发出，等待支书答复');
      _rerenderMyDispatch(container, role, userId);
    });
  }

  // ② 我发起的汇报（点击行进详情，含确认收到）
  const myReportHost = container.querySelector('#mydispatch-myreports-host');
  if (myReportHost) {
    renderFilteredList(myReportHost, {
      stateKey: 'mydispatch-my-reports',
      rows: IssueStore.getMyReports(userId),
      keyword: { keys: ['title', 'body'], placeholder: '搜索汇报事项…' },
      sort: bySubmittedDesc,
      countUnit: '条',
      listClass: 'space-y-0', // 原行间无间距
      emptyMessage: '暂无我发起的汇报',
      rowHtml: (r) => {
        const ds = deriveIssueDisplayState(r);
        return `
        <div class="flex items-center gap-2 py-1.5 px-1 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" data-mydispatch-action="open-report" data-issue-id="${r.id}">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
          <span class="text-xs text-gray-500">${REPORT_CATEGORIES[r.reportCategory] || '进度'}</span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${r.title}</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${r.submittedAt || '—'}</span>
        </div>`;
      },
    });
    myReportHost.addEventListener('click', (e) => {
      const el = e.target.closest('[data-mydispatch-action="open-report"]');
      if (!el) return;
      _renderMyReportDetail(el.dataset.issueId, role, userId, container);
    });
  }

  // ③ 指派给我的反馈（点击行进详情；空态文案由 emptyMessage 原样承载）
  const issuesHost = container.querySelector('#mydispatch-issues-host');
  if (issuesHost) {
    renderFilteredList(issuesHost, {
      stateKey: 'mydispatch-issues',
      rows: IssueStore.getAssignedTo(userId),
      keyword: {
        keys: ['title', 'name'],
        placeholder: '搜索反馈标题 / 提交人…',
        get: (i, k) => (k === 'name' ? _displayName(i.submittedBy) : i[k]),
      },
      sort: bySubmittedDesc,
      countUnit: '条',
      listClass: 'space-y-3', // 原根容器 .space-y-3 作用于行间 → 迁至结果区
      emptyMessage: '暂无待处置反馈',
      rowHtml: (issue) => {
        const ds = deriveIssueDisplayState(issue);
        const dispatchNote = (issue.dispatchHistory || []).find(d => d.to === userId);
        return `
        <div class="p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 cursor-pointer transition-all" data-mydispatch-action="open" data-issue-id="${issue.id}">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-500 font-mono">#${issue.number}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
          </div>
          <p class="text-sm text-gray-800 font-medium">${issue.title}</p>
          ${dispatchNote?.note ? `<p class="text-xs text-blue-600 mt-1">支书备注：${dispatchNote.note}</p>` : ''}
          <div class="text-xs text-gray-500 mt-1">${_displayName(issue.submittedBy)} · ${issue.submittedAt} · ${issue.commentCount || 0} 评论</div>
        </div>`;
      },
    });
    issuesHost.addEventListener('click', (e) => {
      const el = e.target.closest('[data-mydispatch-action="open"]');
      if (!el) return;
      _renderMyDispatchDetail(el.dataset.issueId, role, userId, container);
    });
  }

  // ④ 我提交 / 参与的反馈（成员亦可对自己提交/参与的反馈追加说明——写权不外扩到处置他人反馈）
  const myIssuesHost = container.querySelector('#mydispatch-myissues-host');
  if (myIssuesHost) {
    renderFilteredList(myIssuesHost, {
      stateKey: 'mydispatch-my-issues',
      rows: IssueStore.getMyIssues(userId),
      keyword: { keys: ['title', 'body'], placeholder: '搜索反馈标题…' },
      sort: bySubmittedDesc,
      countUnit: '条',
      listClass: 'space-y-0', // 原行间无间距
      emptyMessage: '暂无我提交或参与的反馈',
      rowHtml: (issue) => {
        const ds = deriveIssueDisplayState(issue);
        return `
        <div class="flex items-center gap-2 py-1.5 px-1 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" data-mydispatch-action="open-my-issue" data-issue-id="${issue.id}">
          <span class="text-xs text-gray-500 font-mono flex-shrink-0">#${issue.number}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass} flex-shrink-0">${ds.label}</span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${issue.title}</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${issue.commentCount || 0} 评论</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${issue.submittedAt || '—'}</span>
        </div>`;
      },
    });
    myIssuesHost.addEventListener('click', (e) => {
      const el = e.target.closest('[data-mydispatch-action="open-my-issue"]');
      if (!el) return;
      _renderMyIssueDetail(el.dataset.issueId, role, userId, container);
    });
  }
}

/** 我的汇报详情（对话时间线 + 支书答复确认收到） */
function _renderMyReportDetail(issueId, role, userId, container) {
  const detailEl = container.querySelector('#mydispatch-detail');
  if (!detailEl) return;
  const issue = IssueStore.getById(issueId);
  if (!issue) return;
  IssueNotify.markRead(userId, issueId);
  const ds = deriveIssueDisplayState(issue);
  const hasReply = (issue.comments || []).some(c => c.kind === 'reply');

  let html = `<div class="card rounded-xl p-5">`;
  html += `<button data-mydispatch-action="back" class="text-xs text-gray-500 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4">← 返回列表</button>`;
  html += `<div class="flex items-center gap-2 mb-2">`;
  html += `<h3 class="text-base font-semibold text-gray-800">${issue.title}</h3>`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  html += `</div>`;
  if (issue.body) html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>${REPORT_CATEGORIES[issue.reportCategory] || '进度'}汇报</span>`;
  html += `<span>发出：${issue.submittedAt}</span>`;
  if (issue.closedAt) html += `<span>已办结：${issue.closedAt}</span>`;
  html += `</div>`;

  // 对话时间线（kind 含 reply 正式答复）
  html += `<div class="mb-4"><span class="text-xs font-medium text-gray-700 block mb-3">对话</span><div class="space-y-2">`;
  const comments = (issue.comments || []).filter(c => !c.hidden);
  if (!comments.length) {
    html += `<p class="text-xs text-gray-500">暂无对话，等待支书答复</p>`;
  } else {
    comments.forEach(c => {
      const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'reply' ? '答' : c.kind === 'verdict' ? '★' : '';
      const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'reply' ? 'bg-red-50/70' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
      const kindDark = c.kind === 'reply' ? ' style="--acc-bg-dark:rgba(239,68,68,0.12);"' : '';
      html += `<div class="rounded-lg p-2.5 ${kindBg}"${kindDark}>`;
      html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${_displayName(c.author)}</span>`;
      if (c.kind === 'reply') {
        html += `<span class="text-xs px-1 py-0.5 rounded font-medium" style="background:var(--app-accent-bg);color:var(--app-accent);">正式答复</span>`;
      }
      html += `<span class="text-xs text-gray-500 ml-1">${c.createdAt}</span>`;
      html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
    });
  }
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100 space-y-2">`;
    if (hasReply) {
      html += `<button data-mydispatch-action="confirm-received" class="text-xs px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">确认已收到答复</button>`;
    }
    html += `<div class="flex items-center gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-mydispatch-action="comment" class="text-xs px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors">评论</button>`;
    html += `</div></div>`;
  }
  html += `</div>`;

  detailEl.innerHTML = html;
  detailEl.classList.remove('hidden');
  const listDiv = detailEl.previousElementSibling;
  if (listDiv) listDiv.classList.add('hidden');

  detailEl.querySelectorAll('[data-mydispatch-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mydispatchAction;
      if (action === 'back') {
        detailEl.classList.add('hidden');
        if (listDiv) listDiv.classList.remove('hidden');
      } else if (action === 'comment') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入评论内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'comment');
        showToast('success', '评论已添加');
        _renderMyReportDetail(issueId, role, userId, container);
      } else if (action === 'confirm-received') {
        IssueStore.confirmReport(issueId);
        showToast('success', '已确认收到，汇报办结完成');
        _rerenderMyDispatch(container, role, userId);
      }
    });
  });
}

function _renderMyDispatchDetail(issueId, role, userId, container) {
  const detailEl = container.querySelector('#mydispatch-detail');
  if (!detailEl) return;
  const issue = IssueStore.getById(issueId);
  if (!issue) return;
  IssueNotify.markRead(userId, issueId);
  const ds = deriveIssueDisplayState(issue);

  let html = `<div class="card rounded-xl p-5">`;
  html += `<button data-mydispatch-action="back" class="text-xs text-gray-500 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4">← 返回列表</button>`;
  html += `<div class="flex items-center gap-2 mb-2">`;
  html += `<h3 class="text-base font-semibold text-gray-800">${issue.title}</h3>`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  html += `</div>`;
  if (issue.body) html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>#${issue.number}</span><span>提交人：${_displayName(issue.submittedBy)}</span><span>提交时间：${issue.submittedAt}</span>`;
  html += `</div>`;

  // 指派历史
  if (issue.dispatchHistory?.length) {
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">指派历史</span><div class="space-y-1">`;
    issue.dispatchHistory.forEach(d => {
      html += `<div class="text-xs text-gray-500">● ${d.at} · ${_displayName(d.to)}${d.note ? '：' + d.note : ''}</div>`;
    });
    html += `</div></div>`;
  }

  // 评论时间线
  html += `<div class="mb-4"><span class="text-xs font-medium text-gray-700 block mb-3">评论与事件</span><div class="space-y-2">`;
  (issue.comments || []).forEach(c => {
    if (c.hidden) return;
    const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
    const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
    html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
    html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${_displayName(c.author)}</span>`;
    html += `<span class="text-xs text-gray-500 ml-1">${c.createdAt}</span>`;
    html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
  });
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100"><div class="flex items-center gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-mydispatch-action="comment" class="text-xs px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors">评论</button>`;
    html += `<button data-mydispatch-action="submit-result" class="text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">提交处置结果</button>`;
    html += `</div></div>`;
  }
  html += `</div>`;

  detailEl.innerHTML = html;
  detailEl.classList.remove('hidden');
  const listDiv = detailEl.previousElementSibling;
  if (listDiv) listDiv.classList.add('hidden');

  detailEl.querySelectorAll('[data-mydispatch-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mydispatchAction;
      if (action === 'back') {
        detailEl.classList.add('hidden');
        if (listDiv) listDiv.classList.remove('hidden');
      } else if (action === 'comment') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入评论内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'comment');
        showToast('success', '评论已添加');
        _renderMyDispatchDetail(issueId, role, userId, container);
      } else if (action === 'submit-result') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入处置结果内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'result');
        showToast('success', '处置结果已提交，等待支书终审');
        _renderMyDispatchDetail(issueId, role, userId, container);
      }
    });
  });
}

/**
 * 我提交 / 参与的反馈详情（每个人都可以参与答复，2026-09-15 支书裁定）。
 * 只读时间线 + 追加说明（kind='comment'）；不提供指派/关闭/提交处置结果——处置他人反馈仍按原角色口径，
 * 此处不放大任何写权（成员仅能对自己提交/参与的 issue 追加说明）。
 */
function _renderMyIssueDetail(issueId, role, userId, container) {
  const detailEl = container.querySelector('#mydispatch-detail');
  if (!detailEl) return;
  const issue = IssueStore.getById(issueId);
  if (!issue) return;
  const ds = deriveIssueDisplayState(issue);

  let html = `<div class="card rounded-xl p-5">`;
  html += `<button data-mydispatch-action="back" class="text-xs text-gray-500 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4">← 返回列表</button>`;
  html += `<div class="flex items-center gap-2 mb-2">`;
  html += `<h3 class="text-base font-semibold text-gray-800">${issue.title}</h3>`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  html += `</div>`;
  if (issue.body) html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>#${issue.number}</span><span>提交人：${_displayName(issue.submittedBy)}</span><span>提交时间：${issue.submittedAt}</span>`;
  if (issue.closedAt) html += `<span>关闭时间：${issue.closedAt}</span>`;
  html += `</div>`;

  // 评论与事件时间线（含支书正式答复/批复）
  html += `<div class="mb-4"><span class="text-xs font-medium text-gray-700 block mb-3">评论与答复</span><div class="space-y-2">`;
  const comments = (issue.comments || []).filter(c => !c.hidden);
  if (!comments.length) {
    html += `<p class="text-xs text-gray-500">暂无评论，等待答复</p>`;
  } else {
    comments.forEach(c => {
      const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'reply' ? '答' : c.kind === 'verdict' ? '★' : '';
      const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'reply' ? 'bg-red-50/70' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
      html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
      html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${_displayName(c.author)}</span>`;
      if (c.kind === 'reply') {
        html += `<span class="text-xs px-1 py-0.5 rounded font-medium ml-1" style="background:var(--app-accent-bg);color:var(--app-accent);">正式答复</span>`;
      }
      html += `<span class="text-xs text-gray-500 ml-1">${c.createdAt}</span>`;
      html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
    });
  }
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100"><div class="flex items-center gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="补充说明…">`;
    html += `<button data-mydispatch-action="comment" class="text-xs px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors">提交说明</button>`;
    html += `</div></div>`;
  }
  html += `</div>`;

  detailEl.innerHTML = html;
  detailEl.classList.remove('hidden');
  const listDiv = detailEl.previousElementSibling;
  if (listDiv) listDiv.classList.add('hidden');

  detailEl.querySelectorAll('[data-mydispatch-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mydispatchAction;
      if (action === 'back') {
        detailEl.classList.add('hidden');
        if (listDiv) listDiv.classList.remove('hidden');
      } else if (action === 'comment') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入说明内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'comment');
        showToast('success', '说明已提交');
        _renderMyIssueDetail(issueId, role, userId, container);
      }
    });
  });
}
