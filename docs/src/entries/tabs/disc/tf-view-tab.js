// role: [工程师]+[AI]
// 纪检委员工作台 Tab：知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」并入「知情查看」）
// 知情权：无职责≠无知情权；URL 直达时高亮目标对象。
// ⚠ 2026-10-04 批次 368（`#10` 单一轴 · `D-755` 支书口径「**知情查看 查看的是 他的赋权下游**」）：
//    **分段集合改由「赋权下游」派生**——判据单一源＝`core/domain/work-map.js::downstreamViewSegments`
//    （缺省 `defaultOwner`；**支部可用 `config.workforce` 改派** ⇒ 对象集天然可配置、不写死）。
//    纪检委员名下 `work-map` 只有 `attendance-inspection`（考勤考察），而它**不在只读视图映射内**
//    ⇒ 派生为**空集**。
// ⚠ 2026-10-18 繁专项（R2/R3 · Top 6）：**活动段并入「活动日历」**——本页只保留有新增对象的段
//    （即 `taskforce`）；派生为空时显示明确空态并给出「去活动日历」链接，**不再静默回退活动列表**。

export function renderContent(ctx) {
  const el = document.getElementById('disc-tab-content');
  if (!el) return null;
  return Promise.all([
    import('../../../components/record/insight-view.js?v=20261018g'),
    import('../../../core/domain/work-map.js?v=20261018g'),
    import('../../../services/branch/branch.js?v=20261018g'),
    import('../../../services/core/auth.js?v=20261018g'),
  ]).then(([iv, wm, br, auth]) => {
    const me = auth.AuthStore.getCurrentUser() || {};
    // 支部实际分工（`config.workforce` 覆盖 ＋ 缺省兜底）——「下游可配置」的落点
    const snapshot = br.getBranchWorkforce(me.branchId);
    // 活动＝全支部通用知情面，已由「活动日历」承载 ⇒ 本页不再出活动段
    const derived = wm.downstreamViewSegments(me.role, snapshot).filter((v) => v !== 'activity');
    // 专班深链仍需可定位（台账：taskforceId 必须消费）⇒ 无下游但有定位目标时临时只出专班段
    const views = derived.length ? derived : (ctx?.highlightTfId ? ['taskforce'] : []);
    if (!views.length) {
      el.dataset.currentTab = 'tf-view';
      el.innerHTML = `
        <div class="card rounded-xl p-5">
          <p class="text-sm text-gray-600" role="status">暂无需要知情查看的专班。</p>
          <a class="btn-outline mt-3 inline-flex px-3 py-1.5 text-xs" href="?tab=calendar">去活动日历</a>
        </div>`;
      return null;
    }
    return iv.renderInsightView(el, {
      views,
      defaultView: views[0],
      highlightTfId: ctx?.highlightTfId || null,
      // 知情查看 = 只读形态
      readonly: true,
      onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
    });
  });
}
