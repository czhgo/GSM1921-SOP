// role: [工程师]+[AI]
// 组长工作台 Tab：知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」并入「知情查看」）
// 知情权：无专班职责≠无知情权，组长可查看活动与专班；URL 直达时高亮目标对象。
// 分段默认「专班」= 合并前本 tab 的独占内容（行为不变），深链定位目标自动切换分段。

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  return import('../../../components/insight-view.js?v=20260914e').then(m => m.renderInsightView(el, {
    defaultView: 'taskforce',
    highlightTfId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
