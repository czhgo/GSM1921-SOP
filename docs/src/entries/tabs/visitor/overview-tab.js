// role: [工程师]+[AI]
// 参与者工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合。
// IA-C2 收敛（2026-09-06）＋2026-09-15 更新：参与者工作台已新增「我的处置」tab（反馈答复入口）。
// 2026-10-18 繁专项 Task 6：概况汇报区降为只读摘要，唯一动作「去我的处置」；提交入口只在「我的处置」。
// U3（2026-09-07）：进入概况先骨架占位（内容容器兜底等高骨架卡，防首帧 0 高弹跳）。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261018e';
import { AuthStore } from '../../../services/core/auth.js?v=20261018e';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261018e';

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p5';
  beginOverviewShell(el);
  return renderWorkOverview(el, { role: 'visitor', personId, accent: ctx.accent, prefix: 'visitor' });
}
