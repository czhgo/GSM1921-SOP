// role: [工程师]+[AI]
// issue-list.js — Issue 列表渲染

import { IssueStore } from '../services/issues.js';
import { AuthStore } from '../services/auth.js';
import { icon } from '../core/icons.js';

const SCOPE_LABELS = {
  permanent: '底层架构',
  global: '全局通用',
  role: '权责调整',
  scenario: '特定场景',
};

const TYPE_LABELS = {
  bug: '缺陷',
  enhancement: '增强',
  proposal: '提案',
  question: '疑问',
};

const TYPE_COLORS = {
  bug: '#CE1126',
  enhancement: '#D4AF37',
  proposal: '#2563EB',
  question: '#6B7280',
};

let _filterState = { status: 'all', scope: 'all', type: 'all', milestone: 'all', keyword: '' };

export function renderIssueList() {
  const container = document.getElementById('issue-list-container');
  if (!container) return;

  const filtered = IssueStore.filter(_filterState);
  const counts = IssueStore.countByStatus();
  const canCreate = true; // 全支部成员可创建

  container.innerHTML = `
    <div class="card rounded-2xl p-6 mb-4">
      <div class="flex items-center justify-end mb-4">
        ${canCreate ? `<button id="btn-new-issue" class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors" style="background:#CE1126;" onmouseover="this.style.background='#991B1B'" onmouseout="this.style.background='#CE1126'">+ 新 issue</button>` : ''}
      </div>

      <div class="flex items-center gap-2 mb-3 flex-wrap text-xs">
        <button class="filter-btn px-3 py-1 rounded-full transition-colors ${_filterState.status === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-status="all">全部 (${counts.total})</button>
        <button class="filter-btn px-3 py-1 rounded-full transition-colors ${_filterState.status === 'open' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" style="${_filterState.status === 'open' ? 'background:#CE1126' : ''}" data-status="open">open (${counts.open})</button>
        <button class="filter-btn px-3 py-1 rounded-full transition-colors ${_filterState.status === 'closed' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-status="closed">closed (${counts.closed})</button>
        <span class="mx-2 text-gray-300">|</span>
        <select id="filter-scope" class="input-flat text-xs px-2 py-1 rounded">
          <option value="all" ${_filterState.scope === 'all' ? 'selected' : ''}>所有 scope</option>
          ${Object.entries(SCOPE_LABELS).map(([v, l]) => `<option value="${v}" ${_filterState.scope === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="filter-type" class="input-flat text-xs px-2 py-1 rounded">
          <option value="all" ${_filterState.type === 'all' ? 'selected' : ''}>所有 type</option>
          ${Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${_filterState.type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input type="text" id="filter-keyword" placeholder="搜索标题/正文..." value="${_filterState.keyword}" class="input-flat text-xs px-2 py-1 rounded flex-1 min-w-[120px]">
      </div>

      <div id="issue-list" class="space-y-2">
        ${filtered.length === 0
          ? '<p class="text-sm text-gray-400 text-center py-8">暂无匹配 issue。欢迎提交第一条！</p>'
          : filtered.map(renderIssueRow).join('')}
      </div>
    </div>
  `;

  bindEvents();
}

function renderIssueRow(issue) {
  const typeBadges = (issue.types || []).map(t =>
    `<span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:${(TYPE_COLORS[t] || '#6B7280')}15;color:${TYPE_COLORS[t] || '#6B7280'}">${TYPE_LABELS[t] || t}</span>`
  ).join('');

  const statusBadge = issue.status === 'open'
    ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">open</span>'
    : `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">closed · ${issue.closedReason || 'completed'}</span>`;

  const reactions = Object.entries(issue.reactions || {}).filter(([_, list]) => list.length > 0).map(([type, list]) => {
    const emoji = { thumbsUp: '👍', thumbsDown: '👎', eyes: '👀', hooray: '🎉' }[type] || '·';
    return `<span class="text-[10px] text-gray-500">${emoji}${list.length}</span>`;
  }).join(' ');

  return `
    <div class="issue-row p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors" data-issue-id="${issue.id}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs text-gray-400 font-mono">#${issue.number}</span>
            ${statusBadge}
            ${typeBadges}
          </div>
          <p class="text-sm font-medium text-gray-800 truncate">${issue.title || '(无标题)'}</p>
          <div class="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
            <span>${SCOPE_LABELS[issue.scope] || issue.scope}</span>
            <span>·</span>
            <span>${issue.submittedBy}</span>
            <span>·</span>
            <span>${issue.commentCount || 0} 评论</span>
            <span>·</span>
            <span>${issue.submittedAt}</span>
            ${reactions ? `<span class="ml-2 flex items-center gap-1">${reactions}</span>` : ''}
          </div>
        </div>
        ${icon('chevronRight', { size: 0, className: 'w-4 h-4 text-gray-400 flex-shrink-0 mt-2' })}
      </div>
    </div>
  `;
}

function bindEvents() {
  // 新 issue
  document.getElementById('btn-new-issue')?.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('new', '1');
    url.searchParams.delete('id');
    window.location.href = url.toString();
  });

  // 列表行点击
  document.querySelectorAll('.issue-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.issueId;
      const url = new URL(window.location.href);
      url.searchParams.set('id', id);
      url.searchParams.delete('new');
      window.location.href = url.toString();
    });
  });

  // 筛选器
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _filterState.status = btn.dataset.status;
      renderIssueList();
    });
  });

  document.getElementById('filter-scope')?.addEventListener('change', (e) => {
    _filterState.scope = e.target.value;
    renderIssueList();
  });

  document.getElementById('filter-type')?.addEventListener('change', (e) => {
    _filterState.type = e.target.value;
    renderIssueList();
  });

  document.getElementById('filter-keyword')?.addEventListener('input', (e) => {
    _filterState.keyword = e.target.value;
    renderIssueList();
  });
}
