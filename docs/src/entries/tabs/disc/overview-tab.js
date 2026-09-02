// role: [工程师]+[AI]
// 纪检委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。

import { renderWorkOverview } from '../../../components/work-overview.js?v=20260901o';
import { getDiscCommissionerId } from './_shared.js?v=20260901o';

export function renderContent(ctx) {
  const el = document.getElementById('disc-tab-content');
  if (!el) return null;
  return renderWorkOverview(el, {
    role: 'disc-commissioner',
    personId: getDiscCommissionerId(),
    accent: ctx.accent,
    prefix: 'disc',
  });
}
