// role: [工程师]+[AI]
// vote-summary-panel.js — 书记端表态汇总矩阵（议题 × 应到成员）
// 展示：应到/已表态/未表态统计 + 矩阵（选项标签随活动 optionSet：deliberative 同意/异议/附言、formal 赞成/反对/弃权；
//   异议红底高亮、附言完整显示）+ formal 票数统计（赞成/反对/弃权）+ quorumCheck 通过条件提示
// 操作：截止按钮（prompt 设置截止时间，留空立即截止 → lockVotes）→ votes-locked 事件冒泡
// 权限：canLock 仅书记为 true（与 server requireRole(secretary) 三端一致）；副书记可见不可截止
// 应到总数 = activity.voteConfig.voterIds.length（AV2 创建时固化）；旧活动/线下无 voteConfig 回退
//   committeeMembers.length。矩阵成员由调用方传入（有 voteConfig → voterIds 映射人员；无 → 权威支委名单
//   resolveVoterIds('committee')，过滤见 inspector.js；server/routes/committee.js COMMITTEE_IDS 仅作旧活动
//   回退白名单，勿再本地罗列支委成员）。选项集/标签权威 = vote-config.js OPTION_SETS（勿再本地硬编码）
import { fetchVotes, lockVotes } from '../services/committee-vote.js?v=20260901i';
import { optionSetOf } from '../services/vote-config.js?v=20260901i';
import { showToast } from '../core/utils.js?v=20260901i';

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
  // 应到总数：voteConfig.voterIds（创建时固化应到名单）优先；旧活动/线下无 voteConfig → committeeMembers.length
  const total = activity.voteConfig?.voterIds?.length ?? committeeMembers.length;
  const os = optionSetOf(activity);
  const optionSet = activity.voteConfig?.optionSet;
  const labelOf = (pos) => (os.labels && os.labels[pos]) || pos;
  const isFormal = optionSet === 'formal';
  const quorumCheck = activity.voteConfig?.quorumCheck === true;

  // formal 票数统计（赞成/反对/弃权；已表态 = 去重 personId，与头部统计口径一致）
  let tallyHtml = '';
  if (isFormal) {
    const count = { approve: 0, oppose: 0, abstain: 0 };
    for (const v of votes) {
      if (Object.prototype.hasOwnProperty.call(count, v.position)) count[v.position] += 1;
    }
    tallyHtml = `<div class="vs-tally">票数统计：赞成 ${count.approve} · 反对 ${count.oppose} · 弃权 ${count.abstain} · 已表态 ${votedCount}/${total}</div>`;
  }
  // quorumCheck（支部党员大会硬校验）时显示通过条件提示（spec §四：出席 ≥ ceil(应到/2)，赞成 > 应到/2）
  let quorumHtml = '';
  if (quorumCheck) {
    const needPresent = Math.ceil(total / 2);
    const needApprove = Math.floor(total / 2) + 1; // > 应到/2 的最小整数
    quorumHtml = `<div class="vs-quorum">通过条件：出席（已表态，含弃权）需 ≥ ${needPresent}/${total}，通过需赞成 &gt; 应到/2（≥ ${needApprove} 人）</div>`;
  }

  container.innerHTML = `
    <div class="vote-summary">
      <div class="vs-head">
        <strong>表态汇总</strong>
        <span class="vs-stat">应到 ${total} · 已表态 ${votedCount} · 未表态 ${total - votedCount}</span>
        ${locked ? '<span class="vs-locked">已截止</span>' : (canLock === true ? '<button class="vs-lock" type="button">截止表态</button>' : '')}
      </div>
      ${tallyHtml}
      ${quorumHtml}
      <div class="vs-matrix-wrap">
        <table class="vs-matrix">
          <thead><tr><th>议题</th>${committeeMembers.map((m) => `<th>${esc(m.name)}</th>`).join('')}</tr></thead>
          <tbody>
            ${items.map((it) => {
              const row = committeeMembers.map((m) => {
                const v = votes.find((x) => x.personId === m.id && x.agendaItemId === it.id);
                if (!v) return '<td class="vs-none">—</td>';
                const cls = v.position === 'object' ? 'vs-object' : '';
                return `<td class="${cls}">${esc(labelOf(v.position))}${v.note ? `<span class="vs-note">${esc(v.note)}</span>` : ''}</td>`;
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
