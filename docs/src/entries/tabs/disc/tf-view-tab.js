// role: [工程师]+[AI]
// 纪检委员工作台 Tab：专班查看（T-279 M3 拆分，照 M2 样板）
// 知情权：无职责≠无知情权，纪检委员可查看专班；URL 直达时高亮目标专班。

export function renderContent(ctx) {
  const el = document.getElementById('disc-tab-content');
  if (!el) return null;
  return import('../../../components/taskforce-view.js?v=20260901z').then(m => m.renderTaskforceView(el, {
    highlightId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
