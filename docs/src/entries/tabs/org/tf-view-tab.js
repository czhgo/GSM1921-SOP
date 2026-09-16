// role: [工程师]+[AI]
// 组织委员工作台 Tab：知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「活动查看」并入「知情查看」）
// 知情权：无职责≠无知情权；组织无活动 tab，由本 tab 承载活动/专班两分段的只读查看。
// 分段默认「活动」= 合并前本 tab 的独占内容（行为不变），深链定位目标自动切换分段。

export function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  return import('../../../components/insight-view.js?v=20260916a').then(m => m.renderInsightView(el, {
    defaultView: 'activity',
    highlightActId: ctx?.highlightActId || null,
    // B6④（2026-09-12）：组织台「活动查看（只读）」传 readonly，禁表决写入口（我的表态/提交表态）
    readonly: true,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
