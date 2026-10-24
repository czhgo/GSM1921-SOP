// role: [工程师]+[AI]
// reactions.js — Issue 表态聚合组件

import { IssueStore } from '../../services/governance/issues.js?v=20261024c';
import { AuthStore } from '../../services/core/auth.js?v=20261024c';
import { showToast } from '../../core/base/utils.js?v=20261024c';
import { icon } from '../../core/base/icons.js?v=20261024c';

// 固定语义色（不随主题）：赞同=成功 / 反对=危险 / 关注=信息 / 庆祝=提醒
const REACTIONS = [
  { key: 'thumbsUp', icon: 'thumbsUp', label: '赞同', tone: 'success' },
  { key: 'thumbsDown', icon: 'thumbsDown', label: '反对', tone: 'danger' },
  { key: 'eyes', icon: 'eyes', label: '关注', tone: 'info' },
  { key: 'hooray', icon: 'hooray', label: '庆祝', tone: 'warning' },
];

/** 获取当前登录用户 personId（plan 中为 AuthStore.getCurrentPersonId，修正为实际 API） */
function _currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || '匿名';
}

export function renderReactions(issue) {
  const currentUserId = _currentPersonId();

  return `
    <div class="flex items-center gap-1 flex-wrap" data-reactions-for="${issue.id}">
      ${REACTIONS.map(r => {
        const list = issue.reactions?.[r.key] || [];
        const isActive = list.includes(currentUserId);
        return `
          <button class="btn-ghost reaction-btn tint-pill px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                  data-tone="${isActive ? r.tone : 'neutral'}"
                  data-issue-id="${issue.id}"
                  data-reaction="${r.key}"
                  title="${r.label}">
            <span>${icon(r.icon, { className: 'w-3.5 h-3.5' })}</span>
            <span>${list.length}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function bindReactions() {
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const issueId = btn.dataset.issueId;
      const reactionKey = btn.dataset.reaction;
      const issue = IssueStore.getById(issueId);
      if (!issue) return;

      const currentUserId = _currentPersonId();
      const list = issue.reactions[reactionKey] || [];
      const idx = list.indexOf(currentUserId);

      if (idx >= 0) {
        // 取消表态
        list.splice(idx, 1);
      } else {
        // 添加表态（草稿，需支书审核后真正合并——但反应是即时的，直接生效）
        list.push(currentUserId);
      }
      issue.reactions[reactionKey] = list;

      try {
        localStorage.setItem('gsm1921-issue-cache', JSON.stringify(IssueStore.getAll()));
      } catch {}

      // 局部刷新反应区
      const container = document.querySelector(`[data-reactions-for="${issueId}"]`);
      if (container) {
        container.outerHTML = renderReactions(issue);
        bindReactions();
      }
    });
  });
}
