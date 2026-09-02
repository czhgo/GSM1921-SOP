// role: [工程师]+[AI]
// entries/tabs/secretary/feedback-tab.js — 书记工作台·反馈管理 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// GitHub Issue 风格反馈管理面板：草稿审核（通过/驳回）全部反馈列表 + 导出/清除 + 详情处置（指派/状态/评论/隐藏/合并）。

import { IssueStore, deriveIssueDisplayState, IssueNotify } from '../../../services/issues.js?v=20260901q';
import { showToast } from '../../../core/utils.js?v=20260901q';
import { icon } from '../../../core/icons.js?v=20260901q';
import { AuthStore } from '../../../services/auth.js?v=20260901q';
import { ROLE_LABELS, DRAFT_TYPE_LABELS } from '../../../core/constants.js?v=20260901q';
import { getPersonName } from '../../../mock/index.js?v=20260901q';
import { PersonStore } from '../../../services/person.js?v=20260901q';
import { badgeHtml, badgeVariantClass } from '../../../components/badge.js?v=20260901q';

const FEEDBACK_TAB_HTML = `
  <!-- 列表面板 -->
  <div id="issue-list-panel" class="card rounded-2xl p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">反馈管理</h3>
      <div class="flex items-center gap-2 text-xs">
        <span id="issue-summary-pill" class="badge ${badgeVariantClass('neutral')}">0 条</span>
      </div>
    </div>
    <p class="text-xs text-gray-500 mb-4">开源讨论集思广益；书记保留处置权（指派/审核/状态/隐藏/合并）</p>

    <!-- 待审核草稿 -->
    <details class="mb-4 rounded-lg border border-orange-200 bg-orange-50/40" id="issue-drafts-details">
      <summary class="px-3 py-2 cursor-pointer text-sm font-medium text-orange-700 flex items-center justify-between">
        <span>待审核草稿</span>
        <span id="issue-drafts-count" class="badge ${badgeVariantClass('warning')}">0</span>
      </summary>
      <div id="issue-drafts-list" class="px-3 pb-3 space-y-2"></div>
    </details>

    <!-- 筛选条（T-217 §2.5 统一顺序：搜索框 → 筛选器们 → 清除） -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <input type="text" id="issue-filter-keyword" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索标题或正文...">
      <select id="issue-filter-status" class="input-flat text-xs w-24">
        <option value="all">全部状态</option>
        <option value="open">开放中</option>
        <option value="assigned">已指派</option>
        <option value="pending-review">待终审</option>
        <option value="closed">已关闭</option>
      </select>
      <select id="issue-filter-assignee" class="input-flat text-xs w-32">
        <option value="all">全部指派</option>
        <option value="unassigned">未指派</option>
        <option value="secretary">书记处置中</option>
        <option value="org-commissioner">组织委员</option>
        <option value="prop-commissioner">宣传委员</option>
        <option value="disc-commissioner">纪检委员</option>
        <option value="leader">党小组组长</option>
      </select>
      <button id="issue-filter-clear" type="button" class="text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">清除</button>
    </div>

    <!-- 全部反馈 -->
    <div id="issue-secretary-list" class="space-y-2"></div>

    <!-- 工具区 -->
    <div class="pt-3 mt-3 border-t border-gray-100 text-right space-x-2">
      <button id="btn-export-issues-json" class="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">导出反馈数据</button>
      <button id="btn-clear-issue-cache" class="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">清除缓存</button>
    </div>
  </div>

  <!-- 详情面板（点击列表项进入，默认 hidden） -->
  <div id="issue-detail-panel" class="hidden"></div>
`;

/** 渲染反馈管理 tab */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'feedback') {
    tc.innerHTML = FEEDBACK_TAB_HTML;
    tc.dataset.currentTab = 'feedback';
  }
  renderIssueManagement();
}

// ════════════════════════════════════════════════════════════════
//  反馈管理 → GitHub Issue 风格反馈管理面板（替代旧 P3-1）
//  功能：草稿审核（通过/驳回） 全部反馈列表 + 导出/清除
// ════════════════════════════════════════════════════════════════

/** 提交人 hover 卡片文本（姓名 · 学号 · 发展阶段 · 党小组；匿名/无记录返回 null） */
function _submitterTip(personId) {
  if (!personId || personId === '匿名') return null;
  const p = PersonStore.getById(personId);
  if (!p) return null;
  return [p.name, p.studentId, p.developStage, p.partyGroup].filter(Boolean).join(' · ');
}

// ── 分页（T-234 F2 分页铁律：反馈无上限增长，每页 10 条 + 页码窗口，搜索/筛选归 1）──
const ISSUE_PAGE_SIZE = 10;
let _issuePageState = 1;

/** 分页控件（复用公开 issue-list / 归档库模式） */
function _renderFeedbackPager(total) {
  const pages = Math.max(1, Math.ceil(total / ISSUE_PAGE_SIZE));
  const cur = Math.min(_issuePageState, pages);
  if (pages <= 1) return '';
  const nums = [];
  const end = Math.min(pages, Math.max(cur, 3) + 2);
  for (let i = Math.max(1, end - 4); i <= end; i++) nums.push(i);
  return `
    <div class="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
      <span class="text-xs text-gray-400">共 ${total} 条 · 第 ${cur} / ${pages} 页</span>
      <div class="flex items-center gap-1">
        <button type="button" class="feedback-page-btn text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" data-feedback-page="${cur - 1}" ${cur <= 1 ? 'disabled' : ''}>上一页</button>
        ${nums.map(n => `
          <button type="button" class="feedback-page-btn text-xs px-2.5 py-1 rounded-lg border ${n === cur ? 'chip-accent-on' : 'border-gray-200 hover:bg-gray-50'}" data-feedback-page="${n}">${n}</button>
        `).join('')}
        <button type="button" class="feedback-page-btn text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" data-feedback-page="${cur + 1}" ${cur >= pages ? 'disabled' : ''}>下一页</button>
      </div>
    </div>`;
}

function renderIssueManagement() {
  // ── 草稿审核 ──
  const draftsEl = document.getElementById('issue-drafts-list');
  const draftsCountEl = document.getElementById('issue-drafts-count');
  if (draftsEl) {
    const drafts = IssueStore.getDrafts().filter(d => d.status === 'pending');
    if (draftsCountEl) draftsCountEl.textContent = drafts.length;
    if (drafts.length === 0) {
      draftsEl.innerHTML = '<p class="text-xs text-gray-400">暂无待审核草稿</p>';
    } else {
      draftsEl.innerHTML = drafts.map(d => renderDraftRow(d)).join('');
      bindDraftEvents();
    }
  }

  // ── 全部反馈列表（带派生状态+指派人徽章+筛选） ──
  const listEl = document.getElementById('issue-secretary-list');
  const pillEl = document.getElementById('issue-summary-pill');
  if (listEl) {
    // 书记规则（2026-08-01）：带时间字段的列示按提交时间倒序（最新在前）
    let issues = IssueStore.getAll()
      .filter(i => !i.hidden && !i.mergedInto)
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    // 筛选
    const filterStatus = document.getElementById('issue-filter-status')?.value || 'all';
    const filterAssignee = document.getElementById('issue-filter-assignee')?.value || 'all';
    const filterKeyword = (document.getElementById('issue-filter-keyword')?.value || '').trim().toLowerCase();

    const filtered = issues.filter(i => {
      const ds = deriveIssueDisplayState(i);
      if (filterStatus !== 'all') {
        if (filterStatus === 'assigned' && ds.key !== 'assigned') return false;
        if (filterStatus === 'pending-review' && ds.key !== 'pending-review') return false;
        if (filterStatus === 'open' && ds.key !== 'open') return false;
        if (filterStatus === 'closed' && ds.key !== 'closed') return false;
      }
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && i.assignee) return false;
        if (filterAssignee === 'secretary' && i.assigneeRole !== 'secretary') return false;
        if (['org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader'].includes(filterAssignee) && i.assigneeRole !== filterAssignee) return false;
      }
      if (filterKeyword) {
        const match = (i.title || '').toLowerCase().includes(filterKeyword) || (i.body || '').toLowerCase().includes(filterKeyword);
        if (!match) return false;
      }
      return true;
    });

    // 摘要
    const counts = { open: 0, assigned: 0, 'pending-review': 0, closed: 0 };
    issues.forEach(i => { const ds = deriveIssueDisplayState(i); counts[ds.key] = (counts[ds.key] || 0) + 1; });
    if (pillEl) pillEl.textContent = `${issues.length} 条 · ${counts.open} 开放 · ${counts.assigned} 已指派 · ${counts['pending-review']} 待终审 · ${counts.closed} 已关闭`;

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">无匹配反馈</p>';
    } else {
      // 分页切片（T-234 F2：筛选变化后页码自动收敛）
      const fbPages = Math.max(1, Math.ceil(filtered.length / ISSUE_PAGE_SIZE));
      _issuePageState = Math.min(_issuePageState, fbPages);
      const pageItems = filtered.slice((_issuePageState - 1) * ISSUE_PAGE_SIZE, _issuePageState * ISSUE_PAGE_SIZE);

      listEl.innerHTML = pageItems.map(i => {
        const ds = deriveIssueDisplayState(i);
        const assigneeLabel = i.assigneeRole ? ROLE_LABELS[i.assigneeRole] || i.assigneeRole : null;
        const isReviewUnread = IssueNotify.getSecretaryReviewUnread().includes(i.id);
        const submitterTip = _submitterTip(i.submittedBy);
        return `
          <div class="p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 cursor-pointer transition-all" data-issue-action="open-detail" data-issue-id="${i.id}">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-400 font-mono">#${i.number}</span>
              <div class="flex items-center gap-1.5">
                ${isReviewUnread ? badgeHtml('待终审', 'warning') : ''}
                <span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>
                ${assigneeLabel ? badgeHtml(`→${assigneeLabel}`, 'info') : ''}
              </div>
            </div>
            <p class="text-sm text-gray-800 font-medium">${i.title}</p>
            <div class="text-xs text-gray-400 mt-1">${submitterTip
              ? `<span class="tip-trigger" data-tip="${submitterTip}">${getPersonName(i.submittedBy)}</span>`
              : (getPersonName(i.submittedBy) || '匿名')} · ${i.commentCount || 0} 评论 · ${i.submittedAt}</div>
          </div>
      `;
      }).join('');
      listEl.insertAdjacentHTML('beforeend', _renderFeedbackPager(filtered.length));

      // 绑定点击事件 → 打开详情面板
      listEl.querySelectorAll('[data-issue-action="open-detail"]').forEach(el => {
        el.addEventListener('click', () => {
          openIssueDetail(el.dataset.issueId);
        });
      });

      // 绑定分页按钮（T-234 F2）
      listEl.querySelectorAll('.feedback-page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          _issuePageState = parseInt(btn.dataset.feedbackPage, 10) || 1;
          renderIssueManagement();
        });
      });
    }
  }

  // 筛选联动（T-234 F2 铁律：搜索/筛选变化页码归 1）
  ['issue-filter-status', 'issue-filter-assignee', 'issue-filter-keyword'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
        _issuePageState = 1;
        renderIssueManagement();
      });
    }
  });

  // 清除筛选（T-217 §2.5）
  const filterClear = document.getElementById('issue-filter-clear');
  if (filterClear && !filterClear.dataset.bound) {
    filterClear.dataset.bound = '1';
    filterClear.addEventListener('click', () => {
      const statusSel = document.getElementById('issue-filter-status');
      const assigneeSel = document.getElementById('issue-filter-assignee');
      const keywordInput = document.getElementById('issue-filter-keyword');
      if (statusSel) statusSel.value = 'all';
      if (assigneeSel) assigneeSel.value = 'all';
      if (keywordInput) keywordInput.value = '';
      _issuePageState = 1;
      renderIssueManagement();
    });
  }

  // 工具按钮
  document.getElementById('btn-export-issues-json')?.addEventListener('click', () => {
    const json = IssueStore.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-clear-issue-cache')?.addEventListener('click', () => {
    if (confirm('确定清除本地缓存？此操作不影响反馈数据权威源，仅清除浏览器缓存与草稿')) {
      IssueStore.clearCache();
      renderIssueManagement();
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  反馈详情面板（书记视角：指派/状态/评论/隐藏/合并）
//  2026-07-30 新增：点击列表项 → 隐藏列表面板、显示详情面板
// ════════════════════════════════════════════════════════════════

/** 指派目标选项 */
const ASSIGNEE_OPTIONS = [
  { personId: 'u_sec', role: 'secretary', label: '书记处置' },
  { personId: 'u_org', role: 'org-commissioner', label: '组织委员' },
  { personId: 'u_prop', role: 'prop-commissioner', label: '宣传委员' },
  { personId: 'u_disc', role: 'disc-commissioner', label: '纪检委员' },
  { personId: 'u_leader_1', role: 'leader', label: '第一党小组组长' },
  { personId: 'u_leader_2', role: 'leader', label: '第二党小组组长' },
  { personId: 'u_leader_3', role: 'leader', label: '第三党小组组长' },
];

/** 关闭理由选项 */
const CLOSE_REASONS = [
  { value: 'completed', label: '已解决' },
  { value: 'duplicate', label: '重复' },
  { value: 'wontfix', label: '不修复' },
  { value: 'not_planned', label: '暂不计划' },
];

/** 打开详情面板 */
function openIssueDetail(issueId) {
  const listPanel = document.getElementById('issue-list-panel');
  const detailPanel = document.getElementById('issue-detail-panel');
  if (!listPanel || !detailPanel) return;

  listPanel.classList.add('hidden');
  detailPanel.classList.remove('hidden');
  renderIssueDetail(issueId);
}

/** 返回列表 */
function closeIssueDetail() {
  const listPanel = document.getElementById('issue-list-panel');
  const detailPanel = document.getElementById('issue-detail-panel');
  if (listPanel) listPanel.classList.remove('hidden');
  if (detailPanel) detailPanel.classList.add('hidden');
  renderIssueManagement();
}

/** 渲染详情面板 */
function renderIssueDetail(issueId) {
  const panel = document.getElementById('issue-detail-panel');
  if (!panel) return;

  const issue = IssueStore.getById(issueId);
  if (!issue) {
    panel.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">反馈不存在</p>';
    return;
  }

  // 标记「待终审」已读
  IssueNotify.markSecretaryReviewRead(issueId);

  const ds = deriveIssueDisplayState(issue);
  const assigneeLabel = issue.assigneeRole ? ROLE_LABELS[issue.assigneeRole] || issue.assigneeRole : '未指派';

  let html = `<div class="card rounded-2xl p-6">`;

  // ── Header：返回按钮 + 编号 + 状态徽章 + 操作按钮 ──
  html += `<div class="flex items-center justify-between mb-4">`;
  html += `<div class="flex items-center gap-2">`;
  html += `<button data-detail-action="back" class="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">`;
  html += icon('chevronLeft', { className: 'w-3.5 h-3.5' });
  html += `返回列表</button>`;
  html += `<span class="text-xs text-gray-400 font-mono">#${issue.number}</span>`;
  html += `</div>`;
  html += `<div class="flex items-center gap-2">`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  if (issue.assignee) {
    html += badgeHtml(`→${assigneeLabel}`, 'info');
  }
  html += `</div></div>`;

  // ── 标题 ──
  html += `<h3 class="text-base font-semibold text-gray-800 mb-2">${issue.title}</h3>`;

  // ── 正文 ──
  if (issue.body) {
    html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  }

  // ── 元信息 ──
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>范围：${issue.scope || '—'}</span>`;
  html += `<span>类型：${(issue.types || []).join(', ') || '—'}</span>`;
  html += `<span>提交人：${getPersonName(issue.submittedBy) || '匿名'}</span>`;
  if (issue._realPersonId && issue._realPersonId !== issue.submittedBy) {
    html += `<span style="color:var(--app-accent,#B91C1C);" title="该反馈为匿名提交，此为书记内部追溯信息">真实提交人（仅书记可见）：${getPersonName(issue._realPersonId)}</span>`;
  }
  html += `<span>提交时间：${issue.submittedAt || '—'}</span>`;
  if (issue.closedAt) html += `<span>关闭时间：${issue.closedAt}</span>`;
  html += `</div>`;

  // ── 指派区 ──
  html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
  html += `<div class="flex items-center justify-between mb-2">`;
  html += `<span class="text-xs font-medium text-gray-700">指派</span>`;
  if (issue.status === 'open') {
    html += `<button data-detail-action="show-assign" class="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">指派</button>`;
  }
  html += `</div>`;
  // 指派历史时间线
  if (issue.dispatchHistory && issue.dispatchHistory.length > 0) {
    html += `<div class="space-y-1">`;
    issue.dispatchHistory.forEach(d => {
      const toLabel = ROLE_LABELS[d.to] || d.to;
      html += `<div class="text-xs text-gray-500 flex items-start gap-1">`;
      html += `<span class="text-gray-300">●</span>`;
      html += `<span>${d.at} · ${toLabel}${d.note ? '：' + d.note : ''}</span>`;
      html += `</div>`;
    });
    html += `</div>`;
  } else {
    html += `<p class="text-xs text-gray-400">尚未指派</p>`;
  }
  // 指派选择器（默认隐藏）
  html += `<div id="issue-assign-selector" class="hidden mt-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100">`;
  html += `<p class="text-xs text-blue-700 mb-2">选择指派目标</p>`;
  html += `<div class="flex flex-wrap gap-2">`;
  ASSIGNEE_OPTIONS.forEach(opt => {
    const isCurrent = issue.assignee === opt.personId && issue.assigneeRole === opt.role;
    html += `<button data-detail-action="assign" data-assignee-id="${opt.personId}" data-assignee-role="${opt.role}" class="text-xs px-3 py-1.5 rounded-lg transition-all ${isCurrent ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `<div class="mt-2 flex items-center gap-2">`;
  html += `<input type="text" id="assign-note-input" class="input-flat text-xs flex-1" placeholder="指派备注（选填）">`;
  html += `</div></div>`;
  html += `</div>`;

  // ── 状态操作 ──
  if (issue.status === 'open') {
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">操作</span>`;
    html += `<div class="flex flex-wrap gap-2">`;
    html += `<button data-detail-action="close" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">关闭反馈</button>`;
    html += `<button data-detail-action="hide" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">隐藏</button>`;
    html += `<button data-detail-action="show-merge" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">合并到…</button>`;
    html += `</div>`;
    // 关闭理由选择器（默认隐藏）
    html += `<div id="issue-close-selector" class="hidden mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">`;
    html += `<p class="text-xs text-gray-600 mb-2">选择关闭理由</p>`;
    html += `<div class="flex flex-wrap gap-2 mb-2">`;
    CLOSE_REASONS.forEach(r => {
      html += `<button data-detail-action="confirm-close" data-reason="${r.value}" class="text-xs px-3 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:border-gray-300 transition-all">${r.label}</button>`;
    });
    html += `</div>`;
    html += `<input type="text" id="close-note-input" class="input-flat text-xs w-full" placeholder="关闭备注（选填）">`;
    html += `</div>`;
    // 合并选择器（默认隐藏）
    html += `<div id="issue-merge-selector" class="hidden mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">`;
    html += `<p class="text-xs text-gray-600 mb-2">选择合并目标</p>`;
    const mergeTargets = IssueStore.getAll().filter(i => i.id !== issueId && !i.hidden && !i.mergedInto);
    if (mergeTargets.length > 0) {
      html += `<div class="space-y-1 max-h-32 overflow-y-auto">`;
      mergeTargets.forEach(t => {
        html += `<button data-detail-action="confirm-merge" data-target-id="${t.id}" class="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">${t.title} <span class="text-gray-400">#${t.number}</span></button>`;
      });
      html += `</div>`;
    } else {
      html += `<p class="text-xs text-gray-400">无可用合并目标</p>`;
    }
    html += `</div>`;
    html += `</div>`;
  } else {
    // 已关闭 → 重新开放
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">操作</span>`;
    html += `<div class="flex flex-wrap gap-2">`;
    html += `<button data-detail-action="reopen" class="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">重新开放</button>`;
    html += `</div></div>`;
  }

  // ── 评论时间线 ──
  html += `<div class="mb-4">`;
  html += `<span class="text-xs font-medium text-gray-700 block mb-3">评论与事件</span>`;
  const comments = issue.comments || [];
  if (comments.length === 0) {
    html += `<p class="text-xs text-gray-400">暂无评论</p>`;
  } else {
    html += `<div class="space-y-3">`;
    comments.forEach(c => {
      if (c.hidden) return; // 书记可看隐藏评论，但默认不显示
      const isReply = c.kind === 'reply';
      const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
      const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : isReply ? 'bg-red-50/70' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
      const authorName = getPersonName(c.author) || '匿名';
      html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
      html += `<div class="flex items-center gap-1.5 mb-1">`;
      html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${authorName}</span>`;
      if (isReply) {
        html += `<span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:var(--app-accent-bg,rgba(185,28,28,0.1));color:var(--app-accent,#B91C1C);">正式答复</span>`;
      }
      html += `<span class="text-xs text-gray-400">${c.createdAt}</span>`;
      html += `</div>`;
      html += `<p class="text-xs text-gray-600">${c.body}</p>`;
      html += `</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // ── 评论/批复/正式答复 输入区 ──
  // 颜色层级（书记 2026-08-08 指令 #4）：评论=次级操作(btn-accent-soft)，批复=主操作(btn-accent)，
  // 正式答复=以组织名义的公开回应，独立一行 + 时间线「正式答复」徽标区分。
  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100 space-y-2">`;
    html += `<div class="flex gap-2">`;
    html += `<input type="text" id="issue-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-detail-action="add-comment" class="btn-accent-soft text-xs px-3 py-2">评论</button>`;
    html += `<button data-detail-action="add-verdict" class="btn-accent text-xs px-3 py-2">批复</button>`;
    html += `</div>`;
    html += `<div class="flex gap-2">`;
    html += `<input type="text" id="issue-reply-input" class="input-flat text-xs flex-1" placeholder="正式答复（以组织名义回应反馈人）…">`;
    html += `<button data-detail-action="add-reply" class="btn-accent text-xs px-3 py-2 whitespace-nowrap">正式答复</button>`;
    html += `</div>`;
    html += `</div>`;
  }

  html += `</div>`;
  panel.innerHTML = html;
  bindIssueDetailActions(issueId);
}

/** 绑定详情面板操作事件 */
function bindIssueDetailActions(issueId) {
  const panel = document.getElementById('issue-detail-panel');
  if (!panel) return;

  panel.querySelectorAll('[data-detail-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.detailAction;
      switch (action) {
        case 'back':
          closeIssueDetail();
          break;
        case 'show-assign':
          toggleSubPanel('issue-assign-selector');
          break;
        case 'assign': {
          const note = document.getElementById('assign-note-input')?.value || '';
          IssueStore.assignIssue(issueId, btn.dataset.assigneeId, btn.dataset.assigneeRole, note);
          showToast('success', '指派成功');
          renderIssueDetail(issueId);
          break;
        }
        case 'close':
          toggleSubPanel('issue-close-selector');
          break;
        case 'confirm-close': {
          const reason = btn.dataset.reason;
          const note = document.getElementById('close-note-input')?.value || '';
          IssueStore.closeIssue(issueId, reason, note);
          showToast('success', '反馈已关闭');
          renderIssueDetail(issueId);
          break;
        }
        case 'reopen':
          IssueStore.reopenIssue(issueId);
          showToast('success', '反馈已重新开放');
          renderIssueDetail(issueId);
          break;
        case 'hide':
          IssueStore.hideIssue(issueId);
          showToast('success', '反馈已隐藏');
          closeIssueDetail();
          break;
        case 'show-merge':
          toggleSubPanel('issue-merge-selector');
          break;
        case 'confirm-merge': {
          const targetId = btn.dataset.targetId;
          IssueStore.mergeIssue(issueId, targetId);
          showToast('success', '反馈已合并');
          closeIssueDetail();
          break;
        }
        case 'add-comment': {
          const body = document.getElementById('issue-comment-input')?.value?.trim();
          if (!body) { showToast('error', '请输入评论内容'); return; }
          const user = AuthStore.getCurrentUser();
          IssueStore.addComment(issueId, user?.personId || 'u_sec', 'secretary', body, 'comment');
          showToast('success', '评论已添加');
          renderIssueDetail(issueId);
          break;
        }
        case 'add-verdict': {
          const body = document.getElementById('issue-comment-input')?.value?.trim();
          if (!body) { showToast('error', '请输入批复内容'); return; }
          const user = AuthStore.getCurrentUser();
          IssueStore.addComment(issueId, user?.personId || 'u_sec', 'secretary', body, 'verdict');
          showToast('success', '批复已添加');
          renderIssueDetail(issueId);
          break;
        }
        case 'add-reply': {
          const body = document.getElementById('issue-reply-input')?.value?.trim();
          if (!body) { showToast('error', '请输入正式答复内容'); return; }
          const user = AuthStore.getCurrentUser();
          IssueStore.addComment(issueId, user?.personId || 'u_sec', 'secretary', body, 'reply');
          showToast('success', '正式答复已发布');
          renderIssueDetail(issueId);
          break;
        }
      }
    });
  });
}

/** 切换子面板显隐 */
function toggleSubPanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  // 关闭其他子面板
  ['issue-assign-selector', 'issue-close-selector', 'issue-merge-selector'].forEach(pid => {
    if (pid !== id) {
      const other = document.getElementById(pid);
      if (other) other.classList.add('hidden');
    }
  });
  el.classList.toggle('hidden');
}

function renderDraftRow(d) {
  if (d.type === 'new-issue') {
    const p = d.payload;
    return `
      <div class="p-3 rounded-lg bg-white border border-orange-200" data-draft-id="${d.draftId}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-orange-700 font-medium">新建反馈草稿</span>
          <span class="text-xs text-gray-500">${getPersonName(d.author)} · ${d.createdAt}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${p.title}</p>
        <p class="text-xs text-gray-600 mt-1 line-clamp-2">${p.body}</p>
        <div class="flex gap-1 mt-2">
          <button class="btn-approve-draft text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700" data-draft-id="${d.draftId}">通过</button>
          <button class="btn-reject-draft text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" data-draft-id="${d.draftId}">驳回</button>
        </div>
      </div>
    `;
  }
  if (d.type === 'comment') {
    return `
      <div class="p-3 rounded-lg bg-white border border-blue-200" data-draft-id="${d.draftId}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-blue-700 font-medium">评论草稿 · 目标反馈: ${d.targetIssueId}</span>
          <span class="text-xs text-gray-500">${getPersonName(d.author)} · ${d.createdAt}</span>
        </div>
        <p class="text-sm text-gray-700">${d.payload.body}</p>
        <div class="flex gap-1 mt-2">
          <button class="btn-approve-draft text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700" data-draft-id="${d.draftId}">通过</button>
          <button class="btn-reject-draft text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" data-draft-id="${d.draftId}">驳回</button>
        </div>
      </div>
    `;
  }
  return `<div class="text-xs text-gray-400">未知草稿类型 ${DRAFT_TYPE_LABELS[d.type] || d.type}</div>`;
}

function bindDraftEvents() {
  document.querySelectorAll('.btn-approve-draft').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.draftId;
      IssueStore.approveDraft(id);
      showToast('success', '草稿已通过，已合并至反馈列表');
      renderIssueManagement();
    });
  });
  document.querySelectorAll('.btn-reject-draft').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.draftId;
      const reason = prompt('请输入驳回原因') || '不符合要求';
      IssueStore.rejectDraft(id, reason);
      showToast('info', '草稿已驳回');
      renderIssueManagement();
    });
  });
}
