// role: [工程师]+[AI]
// vote-summary-panel.js — 书记端表态汇总矩阵（议题 × 委员）
// 展示：应到/已表态/未表态统计 + 矩阵（同意/异议/附言；异议红底高亮、附言完整显示）
// 操作：截止按钮（prompt 设置截止时间，留空立即截止 → lockVotes）→ votes-locked 事件冒泡
// committeeMembers 由调用方传入（支委角色过滤见 inspector.js，与 server COMMITTEE_IDS 对齐）
import { fetchVotes, lockVotes } from '../services/committee-vote.js?v=20260901f';

const LABELS = { agree: '同意', object: '异议', comment: '附言' };

// HTML 转义（议题/附言为输入或既有数据，innerHTML 渲染前转义防存储型 XSS）
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function renderVoteSummary(container, { activity, committeeMembers, currentUserId }) {
  const votes = await fetchVotes(activity.id);
  const locked = activity.votesLocked === true;
  const items = Array.isArray(activity.agenda) ? activity.agenda : [];
  const votedCount = new Set(votes.map((v) => v.personId)).size;
  const total = committeeMembers.length;

  container.innerHTML = `
    <div class="vote-summary">
      <div class="vs-head">
        <strong>表态汇总</strong>
        <span class="vs-stat">应到 ${total} · 已表态 ${votedCount} · 未表态 ${total - votedCount}</span>
        ${!locked ? '<button class="vs-lock" type="button">截止表态</button>' : '<span class="vs-locked">已截止</span>'}
      </div>
      <table class="vs-matrix">
        <thead><tr><th>议题</th>${committeeMembers.map((m) => `<th>${esc(m.name)}</th>`).join('')}</tr></thead>
        <tbody>
          ${items.map((it) => {
            const row = committeeMembers.map((m) => {
              const v = votes.find((x) => x.personId === m.id && x.agendaItemId === it.id);
              if (!v) return '<td class="vs-none">—</td>';
              const cls = v.position === 'object' ? 'vs-object' : '';
              return `<td class="${cls}">${LABELS[v.position] || esc(v.position)}${v.note ? `<span class="vs-note">${esc(v.note)}</span>` : ''}</td>`;
            }).join('');
            return `<tr><td>${esc(it.item || '(无标题议题)')}</td>${row}</tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  container.querySelector('.vs-lock')?.addEventListener('click', async () => {
    const deadline = window.prompt('设置表态截止时间（留空立即截止）：', '');
    await lockVotes({ activityId: activity.id, votesLocked: true, voteDeadline: deadline || undefined });
    container.dispatchEvent(new CustomEvent('votes-locked', { bubbles: true }));
  });
}
