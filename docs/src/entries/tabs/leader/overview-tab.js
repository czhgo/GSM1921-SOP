// role: [工程师]+[AI]
// 组长工作台 Tab：工作概况（T-279 M2 拆分）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：概况顶部挂「待答复 n · 去处理」直达条；
// 组长收件位 = 本组组员汇报（组员进展 tab 行内答复）。
// 2026-10-18 繁专项 Task 6：work-overview 汇报区已降为只读摘要 +「去我的处置」，
// 顶部直达条属重复动作 ⇒ 外壳不再挂条，只保留骨架占位。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 原地渲染概况（不推挤正文）。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261018f';
import { AuthStore } from '../../../services/core/auth.js?v=20261018f';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261018f';

export async function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p4';
  beginOverviewShell(el);
  return renderWorkOverview(el, {
    role: 'leader',
    personId,
    accent: ctx.accent,
    prefix: 'leader',
  });
}
