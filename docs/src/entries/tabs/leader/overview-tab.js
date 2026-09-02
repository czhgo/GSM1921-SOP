// role: [工程师]+[AI]
// 组长工作台 Tab：工作概况（T-279 M2 拆分）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260901m';
import { AuthStore } from '../../../services/auth.js?v=20260901m';

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  return renderWorkOverview(el, {
    role: 'leader',
    personId: AuthStore.getCurrentUser()?.personId || 'p4',
    accent: ctx.accent,
    prefix: 'leader',
  });
}
