// role: [工程师]+[AI]
// 组长工作台 Tab：专班查看（T-279 M2 拆分）
// 知情权：无专班职责≠无知情权，组长可查看专班；URL 直达时高亮目标专班。

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  return import('../../../components/taskforce-view.js?v=20260829k').then(m => m.renderTaskforceView(el, {
    highlightId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
