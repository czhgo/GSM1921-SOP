// role: [工程师]+[AI]
// 纪检委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：work-overview 受保护不内改 → 绕行方案在概况顶部挂「待答复 n · 去处理」直达条。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 预算计数 → 原地填充直达条（不推挤正文）。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260903c';
import { getDiscCommissionerId } from './_shared.js?v=20260903c';
import { beginOverviewShell, countOwnPendingReports, mountOverviewDispatchBar } from '../../../components/overview-dispatch-bar.js?v=20260907a';

export async function renderContent(ctx) {
  const el = document.getElementById('disc-tab-content');
  if (!el) return null;
  const personId = getDiscCommissionerId();
  // U3：进入概况先骨架/槽位占位（防 0 高弹跳与渲染后插条下推）；计数失败不阻断概况渲染（降级=不挂条）
  beginOverviewShell(el);
  let count = 0;
  try { count = await countOwnPendingReports(personId); } catch (e) { console.warn('[disc-overview] 待答复计数失败（不挂直达条）', e); }
  mountOverviewDispatchBar(el, { count, prefix: 'disc', jumpTab: 'my-dispatch', accent: ctx.accent });
  return renderWorkOverview(el, {
    role: 'disc-commissioner',
    personId,
    accent: ctx.accent,
    prefix: 'disc',
  });
}
