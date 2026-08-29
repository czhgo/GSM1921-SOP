// role: [工程师]+[AI]
// 宣传委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260829l';
import { AuthStore } from '../../../services/auth.js?v=20260829l';

export function renderContent(ctx) {
  const el = document.getElementById('prop-tab-content');
  if (!el) return null;
  return renderWorkOverview(el, {
    role: 'prop-commissioner',
    personId: AuthStore.getCurrentUser()?.personId || 'p12',
    accent: ctx.accent,
    prefix: 'prop',
  });
}
