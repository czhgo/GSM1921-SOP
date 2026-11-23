// role: [工程师]+[AI]
// reactions.js — Issue 表态聚合组件

import { IssueStore } from '../../services/governance/issues.js?v=20261120a';
import { AuthStore } from '../../services/core/auth.js?v=20261120a';
import { icon } from '../../core/base/icons.js?v=20261120a';
import { showToast } from '../../core/base/utils.js?v=20261120a';

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

/** 表态计数与「我是否已表态」：服务端形态读 reactionCounts / myReactions；mock 形态回退到数组。 */
function _reactionState(issue, key, currentUserId) {
  const counts = issue.reactionCounts && typeof issue.reactionCounts === 'object' ? issue.reactionCounts : null;
  const list = Array.isArray(issue.reactions?.[key]) ? issue.reactions[key] : [];
  const count = counts && Number.isFinite(counts[key]) ? counts[key] : list.length;
  const active = Array.isArray(issue.myReactions) ? issue.myReactions.includes(key) : list.includes(currentUserId);
  return { count, active };
}

export function renderReactions(issue) {
  const currentUserId = _currentPersonId();

  return `
    <div class="flex items-center gap-1 flex-wrap" data-reactions-for="${issue.id}">
      ${REACTIONS.map(r => {
        const { count, active } = _reactionState(issue, r.key, currentUserId);
        return `
          <button class="btn-outline btn-sm reaction-btn tint-pill px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                  data-tone="${active ? r.tone : 'neutral'}"
                  data-issue-id="${issue.id}"
                  data-reaction="${r.key}"
                  title="${r.label}">
            <span>${icon(r.icon, { className: 'w-3.5 h-3.5' })}</span>
            <span>${count}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function bindReactions() {
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const issueId = btn.dataset.issueId;
      const reactionKey = btn.dataset.reaction;
      // 单一写口：组件不直接改 issue 对象、不直接写 localStorage（H32）。
      btn.disabled = true;
      try {
        const issue = await IssueStore.toggleReaction(issueId, reactionKey);
        if (!issue) return;
        // 局部刷新反应区
        const container = document.querySelector(`[data-reactions-for="${issueId}"]`);
        if (container) {
          container.outerHTML = renderReactions(issue);
          bindReactions();
        }
      } catch (e) {
        showToast('error', '表态未保存，请重试');
      } finally {
        btn.disabled = false;
      }
    });
  });
}
