// role: [工程师]+[AI]
// issue-list.js — 反馈列表渲染

import { IssueStore } from '../services/issues.js?v=20260922k';
import { AuthStore } from '../services/auth.js?v=20260922k';
import { icon } from '../core/icons.js?v=20260922k';
import { getPersonName } from '../services/person.js?v=20260922k';
import { ISSUE_STATUS_LABELS, ISSUE_CLOSED_REASON_LABELS } from '../core/constants.js?v=20260922k';
import { badgeHtml } from './badges.js?v=20260922k';
// 翻页控件单一源（批次 38：全站手写翻页一律并轨 pagerHtml）
import { pagerHtml } from './pager.js?v=20260922k';

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
  enhancement: '#A16207',
  proposal: '#2563EB',
  question: '#6B7280',
};

// 内联徽章深色亮色映射（深色下提亮一档，由 html.theme-dark [style*="--acc-bg-dark"] 规则应用）
const TYPE_COLORS_DARK = {
  bug: '#F87171',
  enhancement: '#FBBF24',
  proposal: '#60A5FA',
  question: '#94A3B8',
};

// 内联徽章双套色：日 = 原色 15% 透明底 + 原色字；夜 = 亮色 24% 透明底 + 亮色字
function typeBadgeStyle(t) {
  const c = TYPE_COLORS[t] || '#6B7280';
  const dc = TYPE_COLORS_DARK[t] || '#94A3B8';
  return `background:${c}15;color:color-mix(in srgb, ${c} 60%, #000);--acc-bg-dark:${dc}24;--acc-text-dark:${dc}`;
}

let _filterState = { status: 'all', scope: 'all', type: 'all', milestone: 'all', keyword: '' };

// ── 分页（T-234 F2 分页铁律：反馈无上限增长，每页 10 条 + 页码窗口，搜索/筛选归 1）──
const PAGE_SIZE = 10;
let _pageState = 1;

/** 分页控件（单一源 pagerHtml：共 N 条 · 第 x/y 页 + 页码窗口；页数 ≤1 返回空串） */
function _renderIssuePager(total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cur = Math.min(_pageState, pages);
  return pagerHtml({ page: cur, pages, total, unit: '条' });
}

export function renderIssueList() {
  const container = document.getElementById('issue-list-container');
  if (!container) return;

  // 批次 47-Q（2026-09-16，支书裁定「加过滤 + 种进同源」）：**本页是公开匿名反馈页，只显示匿名反馈**。
  // 理由：`issues` 域混装两类——公开匿名反馈（无 `kind`）与**内部汇报**（`kind:'report'`，带真人归属
  // 与内部事项）。本页无需登录即可访问 ⇒ 必须显式传 `kind:'feedback'` 把内部汇报挡在公开面之外。
  // ⚠ 两处（列表与统计）**必须同一个 kind**，否则「筛选后的条数」与「开放中/已关闭徽标」会各算一套。
  const filtered = IssueStore.filter({ ..._filterState, kind: 'feedback' });
  const counts = IssueStore.countByStatus({ kind: 'feedback' });
  const canCreate = true; // 全支部成员可创建

  // 分页切片（筛选变化后页码自动收敛）
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  _pageState = Math.min(_pageState, pages);
  const pageItems = filtered.slice((_pageState - 1) * PAGE_SIZE, _pageState * PAGE_SIZE);

  container.innerHTML = `
    <div class="card rounded-xl p-6 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">全部意见 <span class="text-xs font-normal text-gray-500">开放中 ${counts.open} · 已关闭 ${counts.closed}</span></h3>
        ${canCreate ? `<button id="btn-new-issue" class="text-sm px-4 py-[7px] rounded-lg font-medium text-white transition-colors" style="background:#CE1126;" onmouseover="this.style.background='#991B1B'" onmouseout="this.style.background='#CE1126'">+ 新反馈</button>` : ''}
      </div>

      <!-- 筛选行（2026-09-14 批次 27 统一：载体 styles.css::.lf-bar/.lf-kw/.lf-select/.lf-btn；
           分面一律下拉，禁 chip；控件统一 34px 高 / 12px 字） -->
      <div class="lf-bar mb-3">
        <input type="text" id="filter-keyword" placeholder="搜索标题/正文..." value="${_filterState.keyword}" class="input-flat text-xs lf-kw">
        <select id="filter-status" class="input-flat text-xs lf-select" aria-label="状态筛选">
          <option value="all" ${_filterState.status === 'all' ? 'selected' : ''}>状态：全部 (${counts.total})</option>
          <option value="open" ${_filterState.status === 'open' ? 'selected' : ''}>开放中 (${counts.open})</option>
          <option value="closed" ${_filterState.status === 'closed' ? 'selected' : ''}>已关闭 (${counts.closed})</option>
        </select>
        <select id="filter-scope" class="input-flat text-xs lf-select" aria-label="范围筛选">
          <option value="all" ${_filterState.scope === 'all' ? 'selected' : ''}>范围：全部</option>
          ${Object.entries(SCOPE_LABELS).map(([v, l]) => `<option value="${v}" ${_filterState.scope === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="filter-type" class="input-flat text-xs lf-select" aria-label="类型筛选">
          <option value="all" ${_filterState.type === 'all' ? 'selected' : ''}>类型：全部</option>
          ${Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${_filterState.type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button id="filter-clear" type="button" class="lf-btn">清除</button>
      </div>

      <div id="issue-list" class="space-y-2">
        ${filtered.length === 0
          ? '<p class="text-sm text-gray-500 text-center py-8">暂无匹配反馈。欢迎提交第一条！</p>'
          : pageItems.map(renderIssueRow).join('')}
      </div>
      ${_renderIssuePager(filtered.length)}
    </div>
  `;

  bindEvents();
}

function renderIssueRow(issue) {
  const typeBadges = (issue.types || []).map(t =>
    `<span class="badge" style="${typeBadgeStyle(t)}">${TYPE_LABELS[t] || t}</span>`
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
    <div class="issue-row p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" data-issue-id="${issue.id}" role="button" tabindex="0" aria-label="查看反馈 #${issue.number ?? '—'} ${issue.title || '(无标题)'}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs text-gray-500 font-mono">#${issue.number ?? '—'}</span>
            ${statusBadge}
            ${typeBadges}
          </div>
          <p class="text-sm font-medium text-gray-800 truncate">${issue.title || '(无标题)'}</p>
          <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>${SCOPE_LABELS[issue.scope] || issue.scope || '—'}</span>
            <span>·</span>
            <span>${getPersonName(issue.submittedBy) || '—'}</span>
            <span>·</span>
            <span>${issue.commentCount || 0} 评论</span>
            <span>·</span>
            <span>${issue.submittedAt || '—'}</span>
            ${reactions ? `<span class="ml-2 flex items-center gap-1">${reactions}</span>` : ''}
          </div>
        </div>
        ${icon('chevronRight', { className: 'w-4 h-4 text-gray-500 flex-shrink-0 mt-2' })}
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

  // 列表行点击（C4 可访问性，2026-09-12：行语义化为可聚焦按钮，键盘 Enter/Space 等效点击）
  document.querySelectorAll('.issue-row').forEach(row => {
    const open = () => {
      const id = row.dataset.issueId;
      const url = new URL(window.location.href);
      url.searchParams.set('id', id);
      url.searchParams.delete('new');
      window.location.href = url.toString();
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); open(); }
    });
  });

  // 分页按钮（T-234 F2：翻页重渲染；标记由统一检索引擎 pagerHtml 单一源产出，读 data-lf-page）
  const listContainer = document.getElementById('issue-list-container');
  listContainer?.querySelectorAll('[data-lf-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      _pageState = parseInt(btn.dataset.lfPage, 10) || 1;
      renderIssueList();
    });
  });

  // 筛选器（T-234 F2 铁律：搜索/筛选变化页码归 1）——状态分面统一下拉（禁 chip，2026-09-14 批次 27）
  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    _filterState.status = e.target.value || 'all';
    _pageState = 1;
    renderIssueList();
  });

  // 清除筛选（搜索框 + 状态 + 范围/类型 全部复位）
  document.getElementById('filter-clear')?.addEventListener('click', () => {
    _filterState = { status: 'all', scope: 'all', type: 'all', milestone: 'all', keyword: '' };
    _pageState = 1;
    renderIssueList();
  });

  document.getElementById('filter-scope')?.addEventListener('change', (e) => {
    _filterState.scope = e.target.value;
    _pageState = 1;
    renderIssueList();
  });

  document.getElementById('filter-type')?.addEventListener('change', (e) => {
    _filterState.type = e.target.value;
    _pageState = 1;
    renderIssueList();
  });

  document.getElementById('filter-keyword')?.addEventListener('input', (e) => {
    _filterState.keyword = e.target.value;
    _pageState = 1;
    renderIssueList();
  });
}
