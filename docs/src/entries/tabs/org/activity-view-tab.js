// role: [工程师]+[AI]
// 组织委员工作台 Tab：活动查看（T-279 M3 拆分，照 M2 样板）
// 知情权：无职责≠无知情权；组织无活动 tab，由 activity-view 组件承载（书记 2026-08-08 裁定新增）。

export function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  return import('../../../components/activity-view.js?v=20260829q').then(m => m.renderActivityView(el, {
    highlightId: ctx?.highlightActId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
