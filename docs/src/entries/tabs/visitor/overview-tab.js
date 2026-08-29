// role: [工程师]+[AI]
// 参与者工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260829o';
import { AuthStore } from '../../../services/auth.js?v=20260829o';

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (el) return renderWorkOverview(el, { role: 'visitor', personId: AuthStore.getCurrentUser()?.personId || 'p5', accent: ctx.accent, prefix: 'visitor' });
}
