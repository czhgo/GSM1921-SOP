// role: [工程师]+[AI]
// 组长工作台 Tab：知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」并入「知情查看」）
// 知情权：无职责≠无知情权。
// 2026-10-20 批次 489（IA-A03 裁定）：本页**只保留「其他党小组」只读段**——
//   活动段已由「活动日历」承载、专班知情改由 `taskforce.html?id=` 承载 ⇒ 不再派生 work-map 分段，
//   也不再消费活动/专班深链高亮（`highlightActId` / `highlightTfId`）。判据单一源仍是
//   `components/record/insight-view.js` + `components/record/other-groups-view.js`。

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  return import('../../../components/record/insight-view.js?v=20261020d').then((iv) => iv.renderInsightView(el, {
    views: ['group'],
    defaultView: 'group',
    // 知情查看 = 只读形态
    readonly: true,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
