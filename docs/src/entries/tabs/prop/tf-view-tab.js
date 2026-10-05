// role: [工程师]+[AI]
// 宣传委员工作台 Tab：知情查看（2026-09-15 新增，支书裁定）
// 知情权：无职责≠无知情权；宣传台原无只读知情视图，补本 tab 承载只读查看。
// ⚠ 2026-10-04 批次 367（`#10` 单一轴 · `D-755` 支书口径「**知情查看 查看的是 他的赋权下游**」）：
//    **分段集合改由「赋权下游」派生**——判据单一源＝`core/domain/work-map.js::downstreamViewSegments`
//    （缺省 `defaultOwner`；**支部可用 `config.workforce` 改派** ⇒ 对象集天然可配置、不写死）。
//    宣传委员名下 `work-map` **无模块** ⇒ 派生为**空集**；支书 2026-10-04 就「空集怎么落」**圈甲档**：
//    **回退只出「活动」段**（「活动」＝全支部**通用知情面**；「专班」只给有专班下游的台，如组织台）。
//    判据落地＝本文件：空集回退 `['activity']`（**逐台分批**，其余台在各自批次改）。

export function renderContent(ctx) {
  const el = document.getElementById('prop-tab-content');
  if (!el) return null;
  return Promise.all([
    import('../../../components/record/insight-view.js?v=20261005b'),
    import('../../../core/domain/work-map.js?v=20261005b'),
    import('../../../services/branch/branch.js?v=20261005b'),
    import('../../../services/core/auth.js?v=20261005b'),
  ]).then(([iv, wm, br, auth]) => {
    const me = auth.AuthStore.getCurrentUser() || {};
    // 支部实际分工（`config.workforce` 覆盖 ＋ 缺省兜底）——「下游可配置」的落点
    const snapshot = br.getBranchWorkforce(me.branchId);
    const derived = wm.downstreamViewSegments(me.role, snapshot);
    // 空集（本角色无该类下游视图）⇒ 按支书甲档口径回退「活动」段（全支部通用知情面）
    const views = derived.length ? derived : ['activity'];
    return iv.renderInsightView(el, {
      views,
      defaultView: views[0],
      highlightActId: ctx?.highlightActId || null,
      highlightTfId: ctx?.highlightTfId || null,
      // 知情查看 = 只读形态
      readonly: true,
      onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
    });
  });
}
