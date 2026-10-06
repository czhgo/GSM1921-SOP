// role: [工程师]+[AI]
// 组织委员工作台 Tab：知情查看
// 沿革：支书 2026-09-14 裁定「同质薄壳合并——原『活动查看』并入『知情查看』」（活动/专班两分段、只读）。
// 2026-10-03 批次 366（`D-755` 支书口径逐字「**知情查看 查看的是 他的赋权下游【这是唯一的工作逻辑！】
//   防止你过拟合…并且 下游是什么是可以配置的！**」）：**分段集合改由「赋权下游」派生**——
//   判据单一源＝`core/domain/work-map.js` 的模块主责（缺省 `defaultOwner`；**支部可用 `config.workforce` 改派**
//   ⇒ **对象集天然可配置、不写死**）。组织委员当前下游只含 `taskforce`（专班）⇒ **只出「专班」分段**
//   （与组长 / 纪检台现状同名同形）；`activity`（活动）属**通用面** ⇒ 由「活动日历」（已按本批移入「工作台」组）承载。
// ✅ 深链兜底已收口（2026-10-05 批次 387）：台账 2026-08-08 支书裁定「activityId 必须消费」——原由
//   `insight-view` 把 `activity` 段**临时并入**兜底（否则定位目标无处可显）；现 `?activityId=` /
//   `?view=activities` 一律由 `ws-org-commissioner-entry.js::onNavTarget` **改落「活动日历」并定位**
//   （本页只承载该角色的赋权下游＝专班）。`highlightActId` 入参保留（缺省 null、不再有兜底触发）。

export function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  return Promise.all([
    import('../../../components/record/insight-view.js?v=20261006g'),
    import('../../../core/domain/work-map.js?v=20261006g'),
    import('../../../services/branch/branch.js?v=20261006g'),
    import('../../../services/core/auth.js?v=20261006g'),
  ]).then(([iv, wm, br, auth]) => {
    const me = auth.AuthStore.getCurrentUser() || {};
    // 支部实际分工（`config.workforce` 覆盖 ＋ 缺省兜底）——「下游可配置」的落点
    const snapshot = br.getBranchWorkforce(me.branchId);
    const views = wm.downstreamViewSegments(me.role, snapshot);
    return iv.renderInsightView(el, {
      // 空集＝本角色无该类下游视图 ⇒ 交回 `insight-view` 的缺省两段（不显示空白页），并如实登记
      views: views.length ? views : undefined,
      defaultView: views[0],
      highlightActId: ctx?.highlightActId || null,
      // B6④（2026-09-12）：组织台「知情查看（只读）」传 readonly，禁表决写入口
      readonly: true,
      onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
    });
  });
}
