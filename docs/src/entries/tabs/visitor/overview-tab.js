// role: [工程师]+[AI]
// 参与者工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合。
// IA-C2 收敛（2026-09-06，登记）：参与者工作台无「我的处置」tab，汇报处理位 = 本页「汇报」区行内
// （请我汇报行内填写即发）+ 顶栏「一键汇报」未读角标（含请我汇报与答复发回）→ 不加重复直达条。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260903c';
import { AuthStore } from '../../../services/auth.js?v=20260903c';

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (el) return renderWorkOverview(el, { role: 'visitor', personId: AuthStore.getCurrentUser()?.personId || 'p5', accent: ctx.accent, prefix: 'visitor' });
}
