// role: [工程师]+[AI]
// vote-summary-panel.js — 支书端表态汇总矩阵（议题 × 应到成员）
// 展示：应到/已表态/未表态统计 + 矩阵（选项标签随活动 optionSet：deliberative 同意/异议/附言、formal 赞成/反对/弃权；
//   异议红底高亮、附言完整显示）+ formal 票数统计（赞成/反对/弃权）+ quorumCheck 通过条件提示
// 操作：截止按钮（prompt 设置截止时间，留空立即截止 → lockVotes）→ votes-locked 事件冒泡
// 权限：canLock = 支书/副支书（副书同权 2026-09-11 裁定；server 同源 SECRETARY_AND_DEPUTY_ROLES）；
//   其余角色 canLock=false 时按钮位置改为明示「截止表态由支书/副支书操作」（不留静默空缺）
// 应到总数 = activity.voteConfig.voterIds.length（AV2 创建时固化）；旧活动/线下无 voteConfig 回退
//   committeeMembers.length。矩阵成员由调用方传入（有 voteConfig → voterIds 映射人员；无 → 权威支委名单
//   resolveVoterIds('committee')，过滤见 inspector.js；server/routes/committee.js COMMITTEE_IDS 仅作旧活动
//   回退白名单，勿再本地罗列支委成员）。选项集/标签权威 = vote-config.js OPTION_SETS（勿再本地硬编码）
import { fetchVotes, lockVotes, votedCountOf, tallyOf } from '../services/committee-vote.js?v=20260922c';
import { optionSetOf, isAnonymousActivity } from '../services/vote-config.js?v=20260922c';
import { showToast, escHtml as esc } from '../core/utils.js?v=20260922c';
// R2-2（2026-09-06）：决议「待落实」跟进管理器（记录决议视图内勾选/保存/销项；本文件保留原版本串——
//   唯一引用方 components/inspector.js 属禁改文件无法同步 ?v=，改动经子模块新版本串保证取新代码）
import { loadActivities } from '../services/activity.js?v=20260922c';
import {
  resolutionFollowupSectionHtml, bindResolutionFollowupSection,
} from './resolution-followup-manager.js?v=20260922c';
// 批次 39：表态矩阵并入单一源「人 × 项目」矩阵（原 .vs-matrix 自建实现撤除，Q-23-18 收敛）
import { renderRelationMatrix } from './relation-matrix.js?v=20260922c';

// HTML 转义统一走 core/utils.js escHtml（2026-09-03 去重收口）

export async function renderVoteSummary(container, { activity, committeeMembers, canLock }) {
  const votes = await fetchVotes(activity.id);
  const locked = activity.votesLocked === true;
  const items = Array.isArray(activity.agenda) ? activity.agenda : [];
  // 无记名（2026-09-12 支书裁定）：矩阵/结果页只呈现「已投 / 未投 + 汇总计数」，
  //   逐人选项不落库亦不展示（参与记录仍可见，供催办与人数核验）；记名保持逐人现状。
  const anonymous = isAnonymousActivity(activity);
  const votedCount = votedCountOf(votes);
  // 应到总数：voteConfig.voterIds（创建时固化应到名单）优先；旧活动/线下无 voteConfig → committeeMembers.length
  const total = activity.voteConfig?.voterIds?.length ?? committeeMembers.length;
  const os = optionSetOf(activity);
  const optionSet = activity.voteConfig?.optionSet;
  const labelOf = (pos) => (os.labels && os.labels[pos]) || pos;
  const options = (Array.isArray(os.options) && os.options.length > 0) ? os.options : [];
  const isFormal = optionSet === 'formal';
  const quorumCheck = activity.voteConfig?.quorumCheck === true;

  // 票数统计（计数行 tally：无记名直读、记名由逐人 position 现算；两形态同口径）
  const tally = tallyOf(votes);
  let tallyHtml = '';
  if (isFormal || anonymous) {
    const parts = options.map((p) => `${labelOf(p)} ${Number(tally[p]) || 0}`).join(' · ');
    tallyHtml = `<div class="vs-tally">票数统计：${parts} · 已表态 ${votedCount}/${total}${anonymous ? ' · 无记名（不展示个人选项）' : ''}</div>`;
  }
  // quorumCheck（支部党员大会硬校验）时显示通过条件提示（spec §四：出席 ≥ ceil(应到/2)，赞成 > 应到/2）
  let quorumHtml = '';
  if (quorumCheck) {
    const needPresent = Math.ceil(total / 2);
    const needApprove = Math.floor(total / 2) + 1; // > 应到/2 的最小整数
    quorumHtml = `<div class="vs-quorum">通过条件：出席（已表态，含弃权）需 ≥ ${needPresent}/${total}，通过需赞成 &gt; 应到/2（≥ ${needApprove} 人）</div>`;
  }

  // R2-2 决议「待落实」区（仅含已记录「通过」的议程；支书/副支书可管理——canLock 副书同权 2026-09-13）
  const followupHtml = resolutionFollowupSectionHtml({ activity, canManage: canLock === true });

  container.innerHTML = `
    <div class="vote-summary">
      <div class="vs-head">
        <strong>表态汇总</strong>
        <span class="vs-stat" title="应到＝有表决权党员（预备党员无表决权）">应到 ${total} · 已表态 ${votedCount} · 未表态 ${total - votedCount}</span>
        ${locked ? '<span class="vs-locked">已截止</span>' : (canLock === true ? '<button class="vs-lock" type="button">截止表态</button>' : '<span class="text-xs text-gray-500">截止表态由支书/副支书操作</span>')}
      </div>
      <!-- R-20（2026-09-13）：两处「应到」口径不同，明示避免误以为漏人 -->
      <div class="text-[11px] text-gray-500 -mt-1 mb-1">应到＝有表决权党员（预备党员无表决权）；考勤的「应到」为正式＋预备党员，两者口径不同</div>
      ${tallyHtml}
      ${quorumHtml}
      <!-- 批次 39：表态矩阵并入单一源「人 × 项目」矩阵（relation-matrix）——行＝议题、列＝应到成员，
           与既有 .vs-matrix 同向（转置由组件的「按人/按项目」能力天然具备）；异议红底/未投灰字经 cellClass 保留 -->
      <div id="vs-matrix-host"></div>
    </div>
    ${followupHtml}`;

  // 表态矩阵（批次 39 并入单一源 relation-matrix）：行＝议题 / 列＝应到成员，与既有 .vs-matrix 同向
  renderRelationMatrix(container.querySelector('#vs-matrix-host'), {
    stateKey: `vote-summary-${activity.id}`,
    mode: 'byItem',
    persons: committeeMembers.map((m) => ({ id: m.id, name: m.name })),
    items: items.map((it) => ({ id: it.id, title: it.item || '(无标题议题)' })),
    // colLimit 0＝不封顶：议题维＝本场活动的议程条数（有界，不随年份累积），不需要「最近 6 项」上限；
    // rowLimit 0＝人维不分页：本域人维是**列**（应到成员＝本场活动一份固定名单，单场有界），
    //   与「会随年份累积的人维」（考勤/考察/分工/报名）不同——表态矩阵须一屏看全表决分布，
    //   分页会把应到成员切到别的页，反而看不出全局（例外已在 relation-matrix.test.mjs S5 登记备案）。
    colLimit: 0,
    rowLimit: 0,
    personLabel: '成员',
    itemLabel: '议题',
    emptyText: '本活动暂无议程',
    cell: (pid, iid) => {
      const v = votes.find((x) => x.personId === pid && x.agendaItemId === iid);
      // 无记名：只呈现已投/未投（无逐人选项可展示）；记名：逐格显示选项 + 附言
      if (anonymous) return v ? '已投' : '未投';
      if (!v) return '—';
      return `${esc(labelOf(v.position))}${v.note ? `<span class="vs-note">${esc(v.note)}</span>` : ''}`;
    },
    // 「异议」红底 / 「未投」灰字：复用 styles.css 既有语义类 .vs-object / .vs-none（本组件不写样式）
    cellClass: (pid, iid) => {
      const v = votes.find((x) => x.personId === pid && x.agendaItemId === iid);
      if (!v) return 'vs-none';
      if (!anonymous && v.position === 'object') return 'vs-object';
      return '';
    },
  });

  // R2-2 决议落实事件绑定；操作完成后重取最新活动并整卡重绘（含矩阵票数刷新）
  const rerenderSummary = async () => {
    try {
      const fresh = loadActivities().find((x) => x.id === activity.id) || activity;
      await renderVoteSummary(container, { activity: fresh, committeeMembers, canLock });
    } catch (e) {
      console.warn('[vote-summary] 决议落实变更后重绘失败', e);
    }
  };
  bindResolutionFollowupSection({ root: container, activity, canManage: canLock === true, onChanged: rerenderSummary });

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
