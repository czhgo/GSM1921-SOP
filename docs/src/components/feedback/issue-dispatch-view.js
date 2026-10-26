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

import { renderFilteredList } from '../ui/list-filter.js?v=20261026b';
import { renderTabHeader } from '../shell/page-frame.js?v=20261026b';
import { escHtml, showToast } from '../../core/base/utils.js?v=20261026b';
import { IssueStore, IssueNotify, deriveIssueDisplayState, REPORT_CATEGORIES, displayNameOf as _displayName } from '../../services/governance/issues.js?v=20261026b';

// ════════════════════════════════════════════════════════════════
//  「我的处置」Tab 渲染工具（各角色工作台复用）
//  2026-07-30 新增：被指派人视角的反馈列表+详情+评论/提交处置结果
// ════════════════════════════════════════════════════════════════

/**
 * 渲染「我的处置」Tab 内容
 * @param {string} role 角色键（如 'org-commissioner'）
 * @param {string} userId 被指派人 personId（如 '2400012355'）
 * @returns {string} HTML
 */
export function renderMyDispatchTab(role, userId, opts = {}) {
  // 支书规则（2026-08-01）：带时间字段的列示按提交时间倒序（最新在前）——两段行序由引擎 sort 承载
  //（单一源见 bindMyDispatchEvents）。
  // 2026-10-21 R3-08：四段（请我汇报 / 我发起的汇报 / 指派给我的反馈 / 我提交或参与）
  //   ⇒ **两段（待我处理 / 我已处理）**；每段一个检索引擎实例，全页最多两个搜索框。
  const issues = IssueStore.getAssignedTo(userId);
  const reportRequests = IssueStore.getReportRequestsFor(userId);
  const myReports = IssueStore.getMyReports(userId);
  const myIssues = IssueStore.getMyIssues(userId);
  // 行内动作委托见 bindMyDispatchEvents（引擎重绘后仍有效）
  const pendingRows = [
    ...reportRequests.map((row) => ({ __kind: 'request', row })),
    ...issues.map((row) => ({ __kind: 'issue', row })),
  ];
  const doneRows = [
    ...myReports.map((row) => ({ __kind: 'my-report', row })),
    ...myIssues.map((row) => ({ __kind: 'my-issue', row })),
  ];

  let html = opts.embedded ? '' : renderTabHeader({
    title: '我经办的反馈',
    description: '支部派发的汇报与反馈在此处理；处理结果可回看。',
  });
  html += `<div class="space-y-4">`;
  html += `<div class="card rounded-xl p-5">`;
  html += `<h3 class="font-title-cn text-sm font-bold text-gray-700 mb-2">待我处理 <span class="tabular-nums text-gray-500">${pendingRows.length}</span></h3>`;
  html += `<div id="mydispatch-pending-host"></div>`;
  html += `</div>`;
  html += `<div class="card rounded-xl p-5">`;
  html += `<h3 class="font-title-cn text-sm font-bold text-gray-700 mb-2">我已处理 <span class="tabular-nums text-gray-500">${doneRows.length}</span></h3>`;
  // R3-08：原 100 字令牌机制说明移 help，界面只留一句可执行提示。
  html += `<p class="text-xs text-gray-500 mb-2">可回看本浏览器提交或参与的反馈；换设备后无法回认。<a href="./help.html#card-dom39-my-dispatch" class="text-accent">帮助</a></p>`;
  html += `<div id="mydispatch-done-host"></div>`;
  html += `</div>`;
  html += `</div>`;
  html += `<div id="mydispatch-detail" class="hidden"></div>`;
  return html;
}

/** 重渲染「我的处置」Tab（汇报/评论动作后调用）
 *  E-3（2026-09-09）：整 tab 重建前收集各「了解进展」待填行未提交草稿，重建后回填——
 *  提交某行不丢其它行已填内容（原实现整表重建清所有行草稿）。 */
function _rerenderMyDispatch(container, role, userId, opts = {}) {
  if (!container) return;
  const drafts = new Map();
  container.querySelectorAll('input[id^="report-req-input-"]').forEach(inp => {
    if (inp.value) drafts.set(inp.id, inp.value);
  });
  container.innerHTML = renderMyDispatchTab(role, userId, opts);
  bindMyDispatchEvents(container, role, userId, opts);
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
export function bindMyDispatchEvents(container, role, userId, opts = {}) {
  const bySubmittedDesc = (a, b) => (b.row?.submittedAt || '').localeCompare(a.row?.submittedAt || '');
  const keywordOf = (placeholder) => ({
    keys: ['title', 'body', 'name'],
    placeholder,
    get: (item, k) => (k === 'name'
      ? _displayName(item.__kind === 'issue' ? item.row.submittedBy : item.row.requestedBy)
      : item.row[k]),
  });

  // 5.3（2026-10-22 第九轮）：行容器可点但不是原生控件 —— Enter / Space 与点击等效。
  //   委托挂在宿主上（引擎翻页/筛选只重绘其内部），故重绘后仍有效。
  const bindRowKeydown = (host) => {
    host?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      const row = e.target.closest('[data-mydispatch-action][role="button"]');
      if (!row || row !== e.target) return;
      e.preventDefault();
      row.click();
    });
  };

  // 待我处理（请我汇报 + 指派给我的反馈）
  const pendingHost = container.querySelector('#mydispatch-pending-host');
  if (pendingHost) {
    renderFilteredList(pendingHost, {
      stateKey: 'mydispatch-pending',
      rows: [
        ...IssueStore.getReportRequestsFor(userId).map((row) => ({ __kind: 'request', row })),
        ...IssueStore.getAssignedTo(userId).map((row) => ({ __kind: 'issue', row })),
      ],
      keyword: keywordOf('搜索汇报 / 反馈…'),
      sort: bySubmittedDesc,
      countUnit: '条',
      listClass: 'space-y-3',
      emptyMessage: '— 暂无待我处理事项',
      rowHtml: (item) => (item.__kind === 'request' ? _reportRequestRowHtml(item.row) : _assignedIssueRowHtml(item.row, userId)),
    });
    pendingHost.addEventListener('click', (e) => {
      const submitEl = e.target.closest('[data-mydispatch-action="submit-report"]');
      if (submitEl) {
        const id = submitEl.dataset.issueId;
        const input = document.getElementById('report-req-input-' + id);
        const body = input?.value?.trim();
        if (!body) { showToast('error', '请填写汇报内容'); return; }
        IssueStore.addComment(id, userId, role, body, 'result');
        // E-3：提交行立即清空再整 tab 重渲染——已发内容不回填到该行输入框
        if (input) input.value = '';
        showToast('success', '汇报已发出，等待支书答复');
        _rerenderMyDispatch(container, role, userId, opts);
        return;
      }
      const openEl = e.target.closest('[data-mydispatch-action="open"]');
      if (openEl) _renderMyDispatchDetail(openEl.dataset.issueId, role, userId, container);
    });
    bindRowKeydown(pendingHost);
  }

  // 我已处理（我发起的汇报 + 我提交 / 参与的反馈）
  const doneHost = container.querySelector('#mydispatch-done-host');
  if (doneHost) {
    renderFilteredList(doneHost, {
      stateKey: 'mydispatch-done',
      rows: [
        ...IssueStore.getMyReports(userId).map((row) => ({ __kind: 'my-report', row })),
        ...IssueStore.getMyIssues(userId).map((row) => ({ __kind: 'my-issue', row })),
      ],
      keyword: keywordOf('搜索汇报 / 反馈…'),
      sort: bySubmittedDesc,
      countUnit: '条',
      listClass: 'divide-y divide-gray-100',
      emptyMessage: '— 还没有处理记录',
      rowHtml: (item) => (item.__kind === 'my-report' ? _myReportRowHtml(item.row) : _myIssueRowHtml(item.row)),
    });
    doneHost.addEventListener('click', (e) => {
      const reportEl = e.target.closest('[data-mydispatch-action="open-report"]');
      if (reportEl) { _renderMyReportDetail(reportEl.dataset.issueId, role, userId, container, opts); return; }
      const issueEl = e.target.closest('[data-mydispatch-action="open-my-issue"]');
      if (issueEl) _renderMyIssueDetail(issueEl.dataset.issueId, role, userId, container);
    });
    bindRowKeydown(doneHost);
  }
}

/** 待我处理 · 请我汇报行（行内填写即发） */
function _reportRequestRowHtml(r) {
  return `
        <div class="rounded-lg bg-white border border-blue-100 p-3 mb-2">
          <p class="text-sm font-medium text-gray-800">${r.title}</p>
          ${r.body && r.body !== r.title ? `<p class="text-xs text-gray-600 mt-1">${r.body}</p>` : ''}
          <div class="flex gap-2 mt-2">
            <input type="text" id="report-req-input-${r.id}" class="input-flat flex-1" placeholder="填写汇报内容…">
            <button data-mydispatch-action="submit-report" data-issue-id="${r.id}" class="btn-accent-soft text-xs px-3 py-2 flex-shrink-0">汇报</button>
          </div>
        </div>`;
}

/** 待我处理 · 指派给我的反馈行 */
function _assignedIssueRowHtml(issue, userId) {
  const ds = deriveIssueDisplayState(issue);
  const dispatchNote = (issue.dispatchHistory || []).find(d => d.to === userId);
  return `
        <div class="p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors" role="button" tabindex="0" data-mydispatch-action="open" data-issue-id="${issue.id}">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-500 font-mono">#${issue.number}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
          </div>
          <p class="text-sm text-gray-800 font-medium">${issue.title}</p>
          ${dispatchNote?.note ? `<p class="text-xs text-blue-600 mt-1">支书备注：${dispatchNote.note}</p>` : ''}
          <div class="text-xs text-gray-500 mt-1">${_displayName(issue.submittedBy)} · ${issue.submittedAt} · ${issue.commentCount || 0} 评论</div>
        </div>`;
}

/** 我已处理 · 我发起的汇报行 */
function _myReportRowHtml(r) {
  const ds = deriveIssueDisplayState(r);
  return `
        <div role="button" tabindex="0" data-mydispatch-action="open-report" data-issue-id="${r.id}" class="flex items-center gap-2 py-1.5 px-1 rounded-lg border border-gray-100 cursor-pointer hover:bg-surface-hover transition-colors">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
          <span class="text-xs text-gray-500">${REPORT_CATEGORIES[r.reportCategory] || '进度'}</span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${r.title}</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${r.submittedAt || '—'}</span>
        </div>`;
}

/** 我已处理 · 我提交 / 参与的反馈行 */
function _myIssueRowHtml(issue) {
  const ds = deriveIssueDisplayState(issue);
  return `
        <div class="flex items-center gap-2 py-1.5 px-1 rounded-lg border border-gray-100 cursor-pointer hover:bg-surface-hover transition-colors" role="button" tabindex="0" data-mydispatch-action="open-my-issue" data-issue-id="${issue.id}">
          <span class="text-xs text-gray-500 font-mono flex-shrink-0">#${issue.number}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass} flex-shrink-0">${ds.label}</span>
          <span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${issue.title}</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${issue.commentCount || 0} 评论</span>
          <span class="text-xs text-gray-500 flex-shrink-0">${issue.submittedAt || '—'}</span>
        </div>`;
}

/** 我的汇报详情（对话时间线 + 支书答复确认收到） */
function _renderMyReportDetail(issueId, role, userId, container, opts = {}) {
  const detailEl = container.querySelector('#mydispatch-detail');
  if (!detailEl) return;
  const issue = IssueStore.getById(issueId);
  if (!issue) return;
  IssueNotify.markRead(userId, issueId);
  const ds = deriveIssueDisplayState(issue);
  const hasReply = (issue.comments || []).some(c => c.kind === 'reply');

  let html = `<div class="card rounded-xl p-5">`;
  html += `<button data-mydispatch-action="back" class="btn-outline btn-sm text-xs flex items-center gap-1 mb-4">← 返回列表</button>`;
  html += `<div class="flex items-center gap-2 mb-2">`;
  html += `<h3 class="text-base font-semibold text-gray-800">${issue.title}</h3>`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  html += `</div>`;
  if (issue.body) html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>${REPORT_CATEGORIES[issue.reportCategory] || '进度'}汇报</span>`;
  if (issue.sourceName) html += `<span>关联：${escHtml(issue.sourceName)}</span>`;
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
      // 评论类型固定语义 tone（不随主题）：指派=信息 / 结果=成功 / 正式答复=危险 / 判定=提醒 / 其余=中性
      const kindTone = c.kind === 'dispatch' ? 'info' : c.kind === 'result' ? 'success' : c.kind === 'reply' ? 'danger' : c.kind === 'verdict' ? 'warning' : 'neutral';
      html += `<div class="rounded-lg p-2.5 tint-section" data-tone="${kindTone}">`;
      html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${_displayName(c.author)}</span>`;
      if (c.kind === 'reply') {
        html += `<span class="text-xs px-1 py-0.5 rounded font-medium" style="background:var(--app-accent-soft-bg);color:var(--app-accent-soft-text);">正式答复</span>`;
      }
      html += `<span class="text-xs text-gray-500 ml-1">${c.createdAt}</span>`;
      html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
    });
  }
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100 space-y-2">`;
    if (hasReply) {
      html += `<button data-mydispatch-action="confirm-received" class="btn-accent-soft text-xs px-4 py-2">确认已收到答复</button>`;
    }
    html += `<div class="flex items-center gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-mydispatch-action="comment" class="btn-neutral text-xs px-3 py-2">评论</button>`;
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
        _renderMyReportDetail(issueId, role, userId, container, opts);
      } else if (action === 'confirm-received') {
        IssueStore.confirmReport(issueId);
        showToast('success', '已确认收到，汇报办结完成');
        _rerenderMyDispatch(container, role, userId, opts);
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
  html += `<button data-mydispatch-action="back" class="btn-outline btn-sm text-xs flex items-center gap-1 mb-4">← 返回列表</button>`;
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
    html += `<button data-mydispatch-action="comment" class="btn-neutral text-xs px-3 py-2">评论</button>`;
    html += `<button data-mydispatch-action="submit-result" class="btn-accent-soft text-xs px-3 py-2">提交处置结果</button>`;
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
  IssueNotify.markRead(userId, issueId);
  const ds = deriveIssueDisplayState(issue);

  let html = `<div class="card rounded-xl p-5">`;
  html += `<button data-mydispatch-action="back" class="btn-outline btn-sm text-xs flex items-center gap-1 mb-4">← 返回列表</button>`;
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
        html += `<span class="text-xs px-1 py-0.5 rounded font-medium ml-1" style="background:var(--app-accent-soft-bg);color:var(--app-accent-soft-text);">正式答复</span>`;
      }
      html += `<span class="text-xs text-gray-500 ml-1">${c.createdAt}</span>`;
      html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
    });
  }
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100"><div class="flex items-center gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="补充说明…">`;
    html += `<button data-mydispatch-action="comment" class="btn-neutral text-xs px-3 py-2">提交说明</button>`;
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
