// role: [工程师]+[AI]
// 纪检委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：work-overview 受保护不内改 → 绕行方案在概况顶部挂「待答复 n · 去处理」直达条。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260903c';
import { getDiscCommissionerId } from './_shared.js?v=20260903c';
import { countOwnPendingReports, mountOverviewDispatchBar } from '../../../components/overview-dispatch-bar.js?v=20260906j';

export function renderContent(ctx) {
  const el = document.getElementById('disc-tab-content');
  if (!el) return null;
  const personId = getDiscCommissionerId();
  const done = renderWorkOverview(el, {
    role: 'disc-commissioner',
    personId,
    accent: ctx.accent,
    prefix: 'disc',
  });
  // IA-C2 绕行（2026-09-06）：汇报收件处理位 = 我的处置；概况顶部加直达条（count>0 且处理位存在才挂）
  Promise.resolve(done).then(async () => {
    const count = await countOwnPendingReports(personId);
    mountOverviewDispatchBar(el, { count, prefix: 'disc', jumpTab: 'my-dispatch', accent: ctx.accent });
  });
  return done;
}
