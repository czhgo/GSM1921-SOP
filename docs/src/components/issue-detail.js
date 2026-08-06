// role: [工程师]+[AI]
// issue-detail.js — 反馈详情渲染

import { IssueStore } from '../services/issues.js';
import { MilestoneStore } from '../services/milestones.js';
import { AuthStore } from '../services/auth.js';
import { showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { getPersonName } from '../mock/index.js';
import { renderReactions, bindReactions } from './reactions.js';
import { ISSUE_STATUS_LABELS, ISSUE_CLOSED_REASON_LABELS } from '../core/constants.js';

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

/** 获取当前登录用户 personId（plan 中为 AuthStore.getCurrentPersonId，修正为实际 API） */
function _currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || '匿名';
}

export function renderIssueDetail(issueId) {
  const container = document.getElementById('issue-detail-container');
  if (!container) return;

  const issue = IssueStore.getById(issueId);
  if (!issue) {
    container.innerHTML = `
      <div class="card rounded-2xl p-6 text-center">
        <p class="text-sm text-gray-400 mb-3">反馈不存在或已被删除</p>
        <a href="./feedback.html" class="text-xs text-blue-600 hover:text-blue-800">← 返回列表</a>
      </div>
    `;
    return;
  }

  const currentUser = _currentPersonId();
  // plan 中为 AuthStore.canDo?.('issue.status.change')，修正为正确签名 canDo(personId, action)
  const canManage = AuthStore.canDo(currentUser, 'issue.status.change');

  const milestone = issue.milestone ? MilestoneStore.getById(issue.milestone) : null;

  container.innerHTML = `
    <div class="mb-4">
      <a href="./feedback.html" class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
        ${icon('chevronLeft', { className: 'w-3 h-3' })} 返回列表
      </a>
    </div>

    <div class="grid lg:grid-cols-10 gap-4">
      <!-- 主区 70% -->
      <div class="lg:col-span-7 space-y-4">
        <div class="card rounded-2xl p-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xs text-gray-400 font-mono">#${issue.number}</span>
            ${issue.status === 'open'
              ? '<span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">开放中</span>'
              : `<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">已关闭 · ${ISSUE_CLOSED_REASON_LABELS[issue.closedReason] || '已解决'}</span>`
            }
          </div>

          <h1 class="font-title-cn text-xl font-bold text-gray-800 mb-3">${issue.title}</h1>

          <div class="flex items-center gap-2 mb-4 text-xs text-gray-500 flex-wrap">
            ${(issue.types || []).map(t =>
              `<span class="px-1.5 py-0.5 rounded-full font-medium" style="background:${(TYPE_COLORS[t] || '#6B7280')}15;color:${TYPE_COLORS[t] || '#6B7280'}">${TYPE_LABELS[t] || t}</span>`
            ).join('')}
            <span>·</span>
            <span>${SCOPE_LABELS[issue.scope] || issue.scope}</span>
            <span>·</span>
            <span>${issue.submittedAt}</span>
          </div>

          <div class="pl-3 mb-4">
            <p class="text-xs text-gray-500 mb-1 font-sans">${getPersonName(issue.submittedBy)} · ${issue.submittedAt}</p>
            <p class="text-sm text-gray-700 whitespace-pre-wrap font-sans">${issue.body || '(无正文)'}</p>
          </div>

          ${renderReactions(issue)}

          <!-- 评论 timeline -->
          <div class="mt-6 pt-4 border-t border-gray-100">
            <h3 class="font-title-cn text-sm font-semibold text-gray-700 mb-3">评论 (${issue.commentCount || 0})</h3>
            <div class="space-y-3">
              ${(issue.comments || []).map(c => renderComment(c, canManage, issue.id)).join('') || '<p class="text-sm text-gray-400 font-sans">暂无评论</p>'}
            </div>

            <!-- 评论输入框 -->
            <div class="mt-4 pt-3 border-t border-gray-100">
              <textarea id="comment-input" rows="3" placeholder="添加评论...支持 @提及 与 #引用" class="input-flat w-full text-sm rounded-lg p-2 font-sans"></textarea>
              <div class="flex items-center justify-between mt-2">
                <div class="text-xs text-gray-400 font-sans">
                  <button id="btn-mention" class="text-blue-600 hover:text-blue-800">@提及</button>
                  <span class="mx-1">·</span>
                  <button id="btn-reference" class="text-blue-600 hover:text-blue-800">#引用</button>
                </div>
                <button id="btn-submit-comment" class="px-4 py-2 rounded-lg text-sm bg-gray-800 text-white hover:bg-gray-700 transition-colors font-sans">提交评论</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 侧边栏 30% -->
      <div class="lg:col-span-3 space-y-3">
        <div class="card rounded-2xl p-4 text-xs">
          <div class="mb-3">
            <p class="text-gray-400 mb-1">提交者</p>
            <p class="text-gray-700 font-medium font-sans">${getPersonName(issue.submittedBy)}</p>
          </div>

          <div class="mb-3">
            <p class="text-gray-400 mb-1">状态</p>
            ${canManage
              ? `<select id="status-select" class="input-flat w-full text-xs rounded font-sans">
                  <option value="open" ${issue.status === 'open' ? 'selected' : ''}>开放中</option>
                  <option value="closed" ${issue.status === 'closed' ? 'selected' : ''}>已关闭</option>
                </select>
                <select id="closed-reason-select" class="input-flat w-full text-xs rounded mt-1 font-sans ${issue.status === 'open' ? 'hidden' : ''}">
                  <option value="completed" ${issue.closedReason === 'completed' ? 'selected' : ''}>已解决</option>
                  <option value="duplicate" ${issue.closedReason === 'duplicate' ? 'selected' : ''}>重复</option>
                  <option value="wontfix" ${issue.closedReason === 'wontfix' ? 'selected' : ''}>不修复</option>
                  <option value="not_planned" ${issue.closedReason === 'not_planned' ? 'selected' : ''}>暂不计划</option>
                </select>
                <button id="btn-apply-status" class="mt-2 w-full text-sm py-2.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 font-sans">应用</button>`
              : `<p class="text-gray-700 font-sans">${ISSUE_STATUS_LABELS[issue.status] || issue.status}${issue.closedReason ? ' · ' + (ISSUE_CLOSED_REASON_LABELS[issue.closedReason] || issue.closedReason) : ''}</p>`
            }
          </div>

          <div class="mb-3">
            <p class="text-gray-400 mb-1">标签</p>
            <div class="flex flex-wrap gap-1">
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-sans">${SCOPE_LABELS[issue.scope] || issue.scope}</span>
              ${(issue.types || []).map(t =>
                `<span class="text-xs px-1.5 py-0.5 rounded-full font-medium" style="background:${(TYPE_COLORS[t] || '#6B7280')}15;color:${TYPE_COLORS[t] || '#6B7280'}">${TYPE_LABELS[t] || t}</span>`
              ).join('')}
            </div>
          </div>

          <div class="mb-3">
            <p class="text-gray-400 mb-1">里程碑</p>
            <p class="text-gray-700 font-sans">${milestone ? milestone.title : '无'}</p>
          </div>

          <div class="mb-3">
            <p class="text-gray-400 mb-1">指派人</p>
            <p class="text-gray-700 font-sans">${issue.assignee || '无'}</p>
          </div>

          <div class="mb-3">
            <p class="text-gray-400 mb-1">参与者</p>
            <p class="text-gray-700 font-sans">${(issue.participants || []).map(pid => getPersonName(pid)).join(' · ') || '无'}</p>
          </div>

          <div class="mb-3">
            <p class="text-gray-400 mb-1">创建时间</p>
            <p class="text-gray-700 font-sans">${issue.submittedAt}</p>
          </div>

          ${issue.closedAt ? `
            <div class="mb-3">
              <p class="text-gray-400 mb-1">关闭时间</p>
              <p class="text-gray-700 font-sans">${issue.closedAt}</p>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  bindDetailEvents(issue);
}

function renderComment(comment, canManage, issueId) {
  const hiddenClass = comment.hidden ? 'opacity-50' : '';
  const hideButton = canManage && !comment.hidden
    ? `<button class="btn-hide-comment text-xs text-orange-600 hover:text-orange-800 ml-2 font-sans" data-issue-id="${issueId}" data-comment-id="${comment.id}">隐藏</button>`
    : '';

  const hiddenNote = comment.hidden
    ? `<span class="text-xs text-orange-600 ml-2 font-sans">[已隐藏 · ${comment.hiddenReason || '原因未说明'}]</span>`
    : '';

  return `
    <div class="py-2 ${hiddenClass}">
      <div class="flex items-center text-xs text-gray-500 mb-1">
        <span class="font-medium text-gray-700 font-sans">${getPersonName(comment.author)}</span>
        <span class="ml-2">${comment.createdAt}</span>
        ${hideButton}
        ${hiddenNote}
      </div>
      <p class="text-sm text-gray-700 whitespace-pre-wrap font-sans">${comment.body}</p>
    </div>
  `;
}

function bindDetailEvents(issue) {
  // 反应按钮
  bindReactions();

  // 评论提交
  document.getElementById('btn-submit-comment')?.addEventListener('click', () => {
    const input = document.getElementById('comment-input');
    const text = input?.value.trim() || '';
    if (!text) {
      showToast('error', '请输入评论内容');
      return;
    }

    // 直接添加评论（实际生产应先进草稿，但 mock 项目简化为直接生效）
    const newComment = {
      id: 'cmt-' + Date.now(),
      author: _currentPersonId(),
      body: text,
      createdAt: new Date().toISOString().slice(0, 10),
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    };
    issue.comments = issue.comments || [];
    issue.comments.push(newComment);
    if (!issue.participants.includes(newComment.author)) issue.participants.push(newComment.author);
    issue.commentCount = (issue.commentCount || 0) + 1;

    try {
      localStorage.setItem('gsm1921-issue-cache', JSON.stringify(IssueStore.getAll()));
    } catch {}

    showToast('success', '评论已提交');
    renderIssueDetail(issue.id);
  });

  // 状态变更（仅书记）
  document.getElementById('btn-apply-status')?.addEventListener('click', () => {
    const status = document.getElementById('status-select').value;
    const reasonSelect = document.getElementById('closed-reason-select');
    const reason = status === 'closed' ? (reasonSelect?.value || 'completed') : null;
    IssueStore.changeStatus(issue.id, status, reason);
    showToast('success', `状态已改为 ${ISSUE_STATUS_LABELS[status] || status}${reason ? ' · ' + (ISSUE_CLOSED_REASON_LABELS[reason] || reason) : ''}`);
    renderIssueDetail(issue.id);
  });

  document.getElementById('status-select')?.addEventListener('change', (e) => {
    const reasonSelect = document.getElementById('closed-reason-select');
    if (reasonSelect) {
      reasonSelect.classList.toggle('hidden', e.target.value !== 'closed');
    }
  });

  // 隐藏评论（仅书记）
  document.querySelectorAll('.btn-hide-comment').forEach(btn => {
    btn.addEventListener('click', () => {
      const issueId = btn.dataset.issueId;
      const commentId = btn.dataset.commentId;
      const reason = prompt('请输入隐藏原因（可选）') || '不当言论';
      IssueStore.hideComment(issueId, commentId, reason);
      showToast('success', '评论已隐藏');
      renderIssueDetail(issueId);
    });
  });
}
