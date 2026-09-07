// role: [工程师]+[AI]
// 组长工作台 Tab：工作概况（T-279 M2 拆分）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：work-overview 受保护不内改 → 绕行方案在概况顶部挂「待答复 n · 去处理」直达条；
// 组长收件位 = 本组组员汇报（组员进展 tab 行内答复）——计数取本组组员 open 汇报数并跳「组员进展」。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260903c';
import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { IssueStore } from '../../../services/issues.js?v=20260903c';
import { resolveVisibleTargets } from '../../../services/visibility.js?v=20260903c';
import { mountOverviewDispatchBar } from '../../../components/overview-dispatch-bar.js?v=20260903c';

/** 本组组员 open 汇报数（组长收件 = 组员汇报，处理位 = 组员进展 tab；P-011 同组可见） */
async function _pendingMemberReportCount(personId) {
  await IssueStore.loadAll();
  const memberIds = new Set(resolveVisibleTargets('leader', personId).map(t => t.personId));
  return IssueStore.getAll().filter(i =>
    i.kind === 'report' && i.status === 'open' && !i.hidden && !i.mergedInto && memberIds.has(i.submittedBy)
  ).length;
}

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p4';
  const done = renderWorkOverview(el, {
    role: 'leader',
    personId,
    accent: ctx.accent,
    prefix: 'leader',
  });
  // IA-C2 绕行（2026-09-06）：组长收件（组员汇报）处理位 = 组员进展；概况顶部加直达条（count>0 才挂）
  Promise.resolve(done).then(async () => {
    const count = await _pendingMemberReportCount(personId);
    mountOverviewDispatchBar(el, { count, prefix: 'leader', jumpTab: 'members', accent: ctx.accent });
  });
  return done;
}
