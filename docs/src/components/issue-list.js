﻿// role: [工程师]+[AI]
// issue-list.js — 反馈列表渲染

import { IssueStore } from '../services/issues.js?v=20260807i';
import { AuthStore } from '../services/auth.js?v=20260807i';
import { icon } from '../core/icons.js?v=20260807i';
import { getPersonName } from '../mock/index.js?v=20260807i';
import { ISSUE_STATUS_LABELS, ISSUE_CLOSED_REASON_LABELS } from '../core/constants.js?v=20260807i';
import { badgeHtml } from './badge.js?v=20260807i';

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
  enhancement: '#B45309',
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
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">全部意见 <span class="text-xs font-normal text-gray-400">开放中 ${counts.open} · 已关闭 ${counts.closed}</span></h3>
        ${canCreate ? `<button id="btn-new-issue" class="text-sm px-4 py-[7px] rounded-lg font-medium text-white transition-colors" style="background:#CE1126;" onmouseover="this.style.background='#991B1B'" onmouseout="this.style.background='#CE1126'">+ 新反馈</button>` : ''}
      </div>

      <div class="flex items-center gap-2 mb-3 flex-wrap text-xs">
        <input type="text" id="filter-keyword" placeholder="搜索标题/正文..." value="${_filterState.keyword}" class="input-flat text-xs px-2 py-1 rounded flex-1 min-w-[140px]">
        <button class="filter-btn px-3 py-1 rounded-full transition-colors ${_filterState.status === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-status="all">全部 (${counts.total})</button>
        <button class="filter-btn px-3 py-1 rounded-full transition-colors ${_filterState.status === 'open' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" style="${_filterState.status === 'open' ? 'background:#CE1126' : ''}" data-status="open">开放中 (${counts.open})</button>
        <button class="filter-btn px-3 py-1 rounded-full transition-colors ${_filterState.status === 'closed' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-status="closed">已关闭 (${counts.closed})</button>
        <span class="mx-1 text-gray-300">|</span>
        <select id="filter-scope" class="input-flat text-xs px-2 py-1 rounded">
          <option value="all" ${_filterState.scope === 'all' ? 'selected' : ''}>所有范围</option>
          ${Object.entries(SCOPE_LABELS).map(([v, l]) => `<option value="${v}" ${_filterState.scope === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="filter-type" class="input-flat text-xs px-2 py-1 rounded">
          <option value="all" ${_filterState.type === 'all' ? 'selected' : ''}>所有类型</option>
          ${Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${_filterState.type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button id="filter-clear" type="button" class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">清除</button>
      </div>

      <div id="issue-list" class="space-y-2">
        ${filtered.length === 0
          ? '<p class="text-sm text-gray-400 text-center py-8">暂无匹配反馈。欢迎提交第一条！</p>'
          : filtered.map(renderIssueRow).join('')}
      </div>
    </div>
  `;

  bindEvents();
}

function renderIssueRow(issue) {
  const typeBadges = (issue.types || []).map(t =>
    `<span class="badge" style="background:${(TYPE_COLORS[t] || '#6B7280')}15;color:${TYPE_COLORS[t] || '#6B7280'}">${TYPE_LABELS[t] || t}</span>`
  ).join('');

  const statusBadge = issue.status === 'open'
    ? badgeHtml('开放中', 'success')
    : badgeHtml(`已关闭 · ${ISSUE_CLOSED_REASON_LABELS[issue.closedReason] || '已解决'}`, 'neutral');

  const reactions = Object.entries(issue.reactions || {}).filter(([_, list]) => list.length > 0).map(([type, list]) => {
    const iconName = { thumbsUp: 'thumbsUp', thumbsDown: 'thumbsDown', eyes: 'eyes', hooray: 'hooray' }[type];
    const iconHTML = iconName ? icon(iconName, { className: 'w-3 h-3' }) : '·';
    return `<span class="text-xs text-gray-500 inline-flex items-center gap-0.5">${iconHTML}${list.length}</span>`;
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
          <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span>${SCOPE_LABELS[issue.scope] || issue.scope}</span>
            <span>·</span>
            <span>${getPersonName(issue.submittedBy)}</span>
            <span>·</span>
            <span>${issue.commentCount || 0} 评论</span>
            <span>·</span>
            <span>${issue.submittedAt}</span>
            ${reactions ? `<span class="ml-2 flex items-center gap-1">${reactions}</span>` : ''}
          </div>
        </div>
        ${icon('chevronRight', { className: 'w-4 h-4 text-gray-400 flex-shrink-0 mt-2' })}
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

  // 清除筛选（搜索框 + 状态 + 范围/类型 全部复位）
  document.getElementById('filter-clear')?.addEventListener('click', () => {
    _filterState = { status: 'all', scope: 'all', type: 'all', milestone: 'all', keyword: '' };
    renderIssueList();
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
