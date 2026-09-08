// role: [工程师]+[AI]
// 参与者工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合。
// IA-C2 收敛（2026-09-06，登记）：参与者工作台无「我的处置」tab，汇报处理位 = 本页「汇报」区行内
// （请我汇报行内填写即发）+ 顶栏「一键汇报」未读角标（含请我汇报与答复发回）→ 不加重复直达条。
// U3（2026-09-07）：进入概况先骨架占位（内容容器兜底等高骨架卡，防首帧 0 高弹跳）。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260908c';
import { AuthStore } from '../../../services/auth.js?v=20260908c';
import { beginOverviewShell } from '../../../components/overview-dispatch-bar.js?v=20260908c';

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p5';
  beginOverviewShell(el);
  return renderWorkOverview(el, { role: 'visitor', personId, accent: ctx.accent, prefix: 'visitor' });
}
