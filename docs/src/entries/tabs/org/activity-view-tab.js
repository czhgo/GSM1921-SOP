// role: [工程师]+[AI]
// 组织委员工作台 Tab：活动查看（T-279 M3 拆分，照 M2 样板）
// 知情权：无职责≠无知情权；组织无活动 tab，由 activity-view 组件承载（书记 2026-08-08 裁定新增）。

export function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  return import('../../../components/activity-view.js?v=20260912j').then(m => m.renderActivityView(el, {
    highlightId: ctx?.highlightActId || null,
    // B6④（2026-09-12）：组织台「活动查看（只读）」传 readonly，禁表决写入口（我的表态/提交表态）
    readonly: true,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
