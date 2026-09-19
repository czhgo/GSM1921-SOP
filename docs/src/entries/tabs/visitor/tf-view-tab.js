// role: [工程师]+[AI]
// 成员工作台 Tab：知情查看（2026-09-15 新增，支书裁定）
// 知情权：无职责≠无知情权；成员台原无只读知情视图，补本 tab 承载活动/专班两分段的只读查看。
// 分段默认「活动」（组件缺省分段），深链定位目标自动切换分段；只读形态（insight-view 缺省 readonly）。

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return null;
  return import('../../../components/insight-view.js?v=20260919j').then(m => m.renderInsightView(el, {
    defaultView: 'activity',
    highlightActId: ctx?.highlightActId || null,
    highlightTfId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
