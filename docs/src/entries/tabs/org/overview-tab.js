// role: [工程师]+[AI]
// 组织委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：概况顶部挂「待答复 n · 去处理」直达条。
// 2026-10-18 繁专项 Task 6：work-overview 汇报区已降为只读摘要 +「去我的处置」，
// 顶部直达条属重复动作 ⇒ 外壳不再挂条，只保留骨架占位。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 原地渲染概况（不推挤正文）。
// R2-30（2026-10-20）：删除「渲染后用 DOM 文本正则补按钮 / 原地改 data-tab」的补丁——
//   履职卡映射改在 workforce-duty-card.js 的 DUTY_TAB 单一源，条线缺口由 work-overview 的
//   结构化 `gapTab` 直接渲染入口；文案或 DOM 结构再变也不会静默失效。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261024b';
import { currentUserId } from '../../../services/core/auth.js?v=20261024b';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261024b';

export async function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  const personId = currentUserId();
  // 失效会话不猜人（P1-11）：读口显式显示 —，不再回落到固定组织委员 p11。
  if (!personId) {
    el.innerHTML = '<div class="card rounded-xl p-5 text-center"><p class="text-xs text-gray-500">—（登录态已失效，请重新登录）</p></div>';
    return null;
  }
  beginOverviewShell(el);
  await renderWorkOverview(el, {
    role: 'org-commissioner',
    personId,
    accent: ctx.accent,
    prefix: 'org',
    title: '工作概况',
  });
  return null;
}
