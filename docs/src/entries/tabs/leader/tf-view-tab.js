// role: [工程师]+[AI]
// 组长工作台 Tab：知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」并入「知情查看」）
// 知情权：无职责≠无知情权。
// 2026-10-20 批次 489（IA-A03 裁定）：本页只保留「其他党小组」只读段。
// 2026-10-24（spec rebuild-notification-and-data-truth · Task 5）：支书问「工作组 为什么只有专班？」
//   ⇒ 本页补「工作组 / 专班」两段，与支书台同源（组件单一源仍是
//   `components/record/insight-view.js` + `components/record/workgroup-view.js`）；
//   默认段保持「其他组」优先（本轮要求），深链命中工作组 / 专班时临时切段。

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  return import('../../../components/record/insight-view.js?v=20261031a').then((iv) => iv.renderInsightView(el, {
    views: ['workgroup', 'taskforce', 'group'],
    defaultView: 'group',
    // 知情查看 = 只读形态
    readonly: true,
    highlightWorkgroupId: ctx?.highlightWorkgroupId || null,
    highlightActId: ctx?.highlightActId || null,
    highlightTfId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
