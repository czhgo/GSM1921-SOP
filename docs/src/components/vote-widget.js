// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  vote-widget.js — 公共表决组件（AV4.5：activity.html 党员/委员端线上异步表决）
//  与 inspector.js renderVotePanel 同构但独立：面向「公共活动详情页」这一非书记工作台入口，
//  授权不再按角色（isCommittee），改按活动 voteConfig.voterIds 应到名单（canVote 由调用方计算）。
//  仅复用既有样式类 .vote-panel/.vote-btn/.vote-note/.vote-submit/.vote-title/.vote-current
//  （styles.css 已定义），本模块不新增任何样式。
// ════════════════════════════════════════════════════════════════
import { showToast, escHtml as esc } from '../core/utils.js?v=20260908d';
import { fetchVotes, submitVote } from '../services/committee-vote.js?v=20260908d';
import { optionSetOf, OPTION_SETS } from '../services/vote-config.js?v=20260908d';

// HTML 转义统一走 core/utils.js escHtml（2026-09-03 去重收口）

/**
 * 渲染单条议程的「我的表态」面板（公共端表决组件）。
 * - 按钮/文案来自 optionSetOf(activity)：deliberative 同意/异议/附言，formal 赞成/反对/弃权；
 * - 已表态显示（esc 转义 position 回退值与 note）；未锁定且可表态可覆盖提交；
 * - 异议须附言校验由 os.objectRequiresNote 控制（deliberative 适用，formal 不强制）；
 * - 锁定（votesLocked）→ 只读「已截止」；
 * - 非应到表决人（canVote=false）→ 只读提示「仅应到表决人可表态」（无按钮）；
 * - 提交成功 → 自刷新本面板 + dispatch 'vote-submitted'（bubbles，detail.agendaItemId）
 *   供页面级重绘（调用方重 fetch votes 后重绘该条）。
 * @param {HTMLElement} container 挂载容器（页面上用 .vote-widget-slot[data-vote-item-id] 槽位）
 * @param {Object} opts
 * @param {Object}  opts.activity     活动（voteConfig.mode==='async'；votesLocked 驱动锁定态）
 * @param {Object}  opts.agendaItem   单条议程（须含 id）
 * @param {Object[]} [opts.votes]     该活动表态列表（含本人既往表态 → 可覆盖）
 * @param {string|null} opts.currentUserId 当前登录人 personId
 * @param {boolean} opts.canVote      是否在应到名单（voteConfig.voterIds.includes(personId)）
 */
export function renderVoteWidget(container, { activity, agendaItem, votes, currentUserId, canVote }) {
  if (!container || !activity || !agendaItem || !agendaItem.id) return;
  const locked = activity.votesLocked === true;
  const os = optionSetOf(activity);
  const labelOf = (pos) => (os.labels && os.labels[pos]) || pos;
  const options = (Array.isArray(os.options) && os.options.length > 0) ? os.options : OPTION_SETS.deliberative.options;
  const mine = (votes || []).find(v => v.personId === currentUserId && v.agendaItemId === agendaItem.id);
  // 可交互：已登录 + 应到表决人 + 未锁定（已表态仍可改投覆盖）
  const canInteract = !!currentUserId && canVote === true && !locked;

  container.innerHTML = `
    <div class="vote-panel">
      <div class="vote-title">我的表态${locked ? '（已截止）' : ''}</div>
      ${mine ? `<div class="vote-current">已表态：${esc(labelOf(mine.position))}${mine.note ? '（' + esc(mine.note) + '）' : ''}</div>` : ''}
      ${canInteract ? `
        <div class="vote-actions">
          ${options.map((pos) => `<button type="button" class="vote-btn" data-pos="${pos}">${esc(labelOf(pos))}</button>`).join('')}
        </div>
        <textarea class="vote-note" rows="2" placeholder="${os.objectRequiresNote ? '附言/异议说明（异议必填）' : '附言说明（选填）'}"></textarea>
        <button type="button" class="vote-submit">提交表态</button>` : ''}
      ${!locked && !canInteract && !mine ? '<div class="vote-current" style="opacity:.8;">仅应到表决人可表态</div>' : ''}
    </div>`;

  container.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.vote-btn').forEach(x => {
        x.classList.remove('active');
        x.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  const submitBtn = container.querySelector('.vote-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      // P1 防连点：提交期间禁用按钮（异步落库期间重复点击会重复请求）
      if (submitBtn.dataset.processing === '1') return;
      const pos = container.querySelector('.vote-btn.active')?.dataset.pos;
      if (!pos) { showToast('error', `请先选择表态（${options.map((p) => labelOf(p)).join('/')}）`); return; }
      const note = container.querySelector('.vote-note')?.value.trim() || '';
      // 「异议须附言」由选项集 objectRequiresNote 控制（deliberative 适用；formal 附言选填不强制）
      if (os.objectRequiresNote && pos === 'object' && !note) { showToast('error', `${labelOf('object')}须附言说明`); return; }
      submitBtn.dataset.processing = '1';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      try {
        await submitVote({ activityId: activity.id, agendaItemId: agendaItem.id, position: pos, note });
        showToast('success', '表态已提交');
        // 自刷新：重拉该活动表态并重绘本面板（「已表态」即时可见，不依赖调用方刷新路径）
        try {
          const latest = await fetchVotes(activity.id);
          renderVoteWidget(container, { activity, agendaItem, votes: latest, currentUserId, canVote });
        } catch (e2) {
          console.warn('[vote-widget] 表态刷新失败：', e2);
        }
        // 通知页面（bubbles，detail 携带触发议程 id）→ 调用方重 fetch votes 重绘该条
        container.dispatchEvent(new CustomEvent('vote-submitted', {
          bubbles: true,
          detail: { agendaItemId: agendaItem.id },
        }));
      } catch (e) {
        console.warn('[vote-widget] 表态提交失败：', e);
        showToast('error', (e && e.message) || '表态提交失败');
        submitBtn.dataset.processing = '';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
      }
    });
  }
}
