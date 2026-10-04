// role: [工程师]+[AI]
// 组长工作台 Tab：知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」并入「知情查看」）
// 知情权：无职责≠无知情权；URL 直达时高亮目标对象。
// ⚠ 2026-10-04 批次 369（`#10` 单一轴 · `D-755` 支书口径「**知情查看 查看的是 他的赋权下游**」）：
//    **分段集合改由「赋权下游」派生**——判据单一源＝`core/domain/work-map.js::downstreamViewSegments`
//    （缺省 `defaultOwner`；**支部可用 `config.workforce` 改派** ⇒ 对象集天然可配置、不写死）。
//    组长名下 `work-map` 含 `party-group-meeting` / `theme-party` / `joint-event` ⇒ **均映射 `activity`**
//    ⇒ **只出「活动」段**（默认段由「专班」变「活动」）。
// ⚠ 深链兜底：若 URL 带 `taskforceId`，`insight-view` 会把 `taskforce` 段**临时并入**（否则定位目标无处可显）。

export function renderContent(ctx) {
  const el = document.getElementById('leader-tab-content');
  if (!el) return null;
  return Promise.all([
    import('../../../components/record/insight-view.js?v=20261004p'),
    import('../../../core/domain/work-map.js?v=20261004p'),
    import('../../../services/branch/branch.js?v=20261004p'),
    import('../../../services/core/auth.js?v=20261004p'),
  ]).then(([iv, wm, br, auth]) => {
    const me = auth.AuthStore.getCurrentUser() || {};
    // 支部实际分工（`config.workforce` 覆盖 ＋ 缺省兜底）——「下游可配置」的落点
    const snapshot = br.getBranchWorkforce(me.branchId);
    const derived = wm.downstreamViewSegments(me.role, snapshot);
    // 空集（本角色无该类下游视图）⇒ 按支书甲档口径回退「活动」段（全支部通用知情面）
    const activityViews = derived.length ? derived : ['activity'];
    // 2026-10-04 批次 373 · 支书 `#10` Q3 圈**甲**（「党小组组长是否可以看到别组的情况，我认为是应该
    //   可以看到的！！」）：组长台额外并入 `group`「其他组」只读一览（看≠做、写口仍只本组）。
    const views = activityViews.includes('group') ? activityViews : [...activityViews, 'group'];
    return iv.renderInsightView(el, {
      views,
      defaultView: activityViews[0],
      highlightActId: ctx?.highlightActId || null,
      highlightTfId: ctx?.highlightTfId || null,
      // 知情查看 = 只读形态
      readonly: true,
      onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
    });
  });
}
