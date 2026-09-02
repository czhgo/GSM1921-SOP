// role: [工程师]+[AI]
// vote-summary-panel.js — 书记端表态汇总矩阵（议题 × 委员）
// 展示：应到/已表态/未表态统计 + 矩阵（同意/异议/附言；异议红底高亮、附言完整显示）
// 操作：截止按钮（prompt 设置截止时间，留空立即截止 → lockVotes）→ votes-locked 事件冒泡
// 权限：canLock 仅书记为 true（与 server requireRole(secretary) 三端一致）；副书记可见不可截止
// committeeMembers 由调用方传入（支委角色过滤见 inspector.js，与 server COMMITTEE_IDS 对齐）
import { fetchVotes, lockVotes } from '../services/committee-vote.js?v=20260901f';
import { showToast } from '../core/utils.js?v=20260901f';

const LABELS = { agree: '同意', object: '异议', comment: '附言' };

// HTML 转义（议题/附言为输入或既有数据，innerHTML 渲染前转义防存储型 XSS）
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function renderVoteSummary(container, { activity, committeeMembers, canLock }) {
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
        ${locked ? '<span class="vs-locked">已截止</span>' : (canLock === true ? '<button class="vs-lock" type="button">截止表态</button>' : '')}
      </div>
      <div class="vs-matrix-wrap">
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
      </div>
    </div>`;

  const lockBtn = container.querySelector('.vs-lock');
  lockBtn?.addEventListener('click', async () => {
    // 防连点：截止落库期间禁用按钮（异步期间重复点击会重复锁定请求）
    if (lockBtn.dataset.processing === '1') return;
    const deadline = window.prompt('设置表态截止时间（留空立即截止）：', '');
    // 取消（prompt 返回 null）不截止
    if (deadline === null) return;
    // 输入非空但 Date.parse 无法解析 → 提示并中止（留空才视为立即截止；服务端再行精确校验）
    if (deadline.trim() && Number.isNaN(Date.parse(deadline))) {
      showToast('error', '截止时间格式无效');
      return;
    }
    lockBtn.dataset.processing = '1';
    lockBtn.disabled = true;
    lockBtn.style.opacity = '0.5';
    try {
      await lockVotes({ activityId: activity.id, votesLocked: true, voteDeadline: deadline.trim() || undefined });
      container.dispatchEvent(new CustomEvent('votes-locked', { bubbles: true }));
      // 成功路径恢复按钮（重绘为异步进行，若监听缺失/失败也不残留禁用态）
      lockBtn.dataset.processing = '';
      lockBtn.disabled = false;
      lockBtn.style.opacity = '';
    } catch (e) {
      console.warn('[vote-summary] 截止操作失败：', e);
      showToast('error', (e && e.message) || '截止操作失败');
      lockBtn.dataset.processing = '';
      lockBtn.disabled = false;
      lockBtn.style.opacity = '';
    }
  });
}
