// role: [工程师]+[AI]
// 组长工作台 Tab：工作概况（T-279 M2 拆分）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：work-overview 受保护不内改 → 绕行方案在概况顶部挂「待答复 n · 去处理」直达条；
// 组长收件位 = 本组组员汇报（组员进展 tab 行内答复）——计数取本组组员 open 汇报数并跳「组员进展」。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 预算计数 → 原地填充直达条（不推挤正文）。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260908c';
import { AuthStore } from '../../../services/auth.js?v=20260908c';
import { IssueStore } from '../../../services/issues.js?v=20260908c';
import { resolveVisibleTargets } from '../../../services/visibility.js?v=20260908c';
import { beginOverviewShell, mountOverviewDispatchBar } from '../../../components/overview-dispatch-bar.js?v=20260908c';

/** 本组组员 open 汇报数（组长收件 = 组员汇报，处理位 = 组员进展 tab；P-011 同组可见） */
async function _pendingMemberReportCount(personId) {
  await IssueStore.loadAll();
  const memberIds = new Set(resolveVisibleTargets('leader', personId).map(t => t.personId));
  return IssueStore.getAll().filter(i =>
    i.kind === 'report' && i.status === 'open' && !i.hidden && !i.mergedInto && memberIds.has(i.submittedBy)
  ).length;
}

export async function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p4';
  // U3：进入概况先骨架/槽位占位（防 0 高弹跳与渲染后插条下推）；计数失败不阻断概况渲染（降级=不挂条）
  beginOverviewShell(el);
  let count = 0;
  try { count = await _pendingMemberReportCount(personId); } catch (e) { console.warn('[leader-overview] 组员汇报计数失败（不挂直达条）', e); }
  mountOverviewDispatchBar(el, { count, prefix: 'leader', jumpTab: 'members', accent: ctx.accent });
  return renderWorkOverview(el, {
    role: 'leader',
    personId,
    accent: ctx.accent,
    prefix: 'leader',
  });
}
