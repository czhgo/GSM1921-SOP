// role: [工程师]+[AI]
// 组织委员工作台 Tab：知情查看
// 沿革：支书 2026-09-14 裁定「同质薄壳合并——原『活动查看』并入『知情查看』」（活动/专班两分段、只读）。
// 2026-10-03 批次 366（`D-755` 支书口径逐字「**知情查看 查看的是 他的赋权下游【这是唯一的工作逻辑！】
//   防止你过拟合…并且 下游是什么是可以配置的！**」）：**分段集合改由「赋权下游」派生**——
//   判据单一源＝`core/domain/work-map.js` 的模块主责（缺省 `defaultOwner`；**支部可用 `config.workforce` 改派**
//   ⇒ **对象集天然可配置、不写死**）。组织委员当前下游只含 `taskforce`（专班）⇒ **只出「专班」分段**。
// ✅ 深链兜底已收口（2026-10-05 批次 387）：`?activityId=` / `?view=activities` 一律由
//   `ws-org-commissioner-entry.js::onNavTarget` **改落「活动日历」并定位**（本页只承载该角色的赋权下游＝专班）。
// ⚠ 2026-10-18 繁专项（R1 · Top 6）：组织台已有「专班管理」页，本只读段**不再取全量**——只列
//   **本人被加入 / 被授权**的对象级专班（成员、负责人/发起人、或工作组 active 授权），
//   避免与「专班管理」形成第二个同构入口。

export function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  return Promise.all([
    import('../../../components/record/insight-view.js?v=20261018g'),
    import('../../../core/domain/work-map.js?v=20261018g'),
    import('../../../services/branch/branch.js?v=20261018g'),
    import('../../../services/core/auth.js?v=20261018g'),
    import('../../../services/activity/taskforce.js?v=20261018g'),
    import('../../../core/domain/domain.js?v=20261018g'),
  ]).then(([iv, wm, br, auth, tf, domain]) => {
    const me = auth.AuthStore.getCurrentUser() || {};
    const personId = me.personId || me.id || '';
    // 支部实际分工（`config.workforce` 覆盖 ＋ 缺省兜底）——「下游可配置」的落点
    const snapshot = br.getBranchWorkforce(me.branchId);
    // 只保留有新增对象的下游段（本台＝专班；活动为通用面，由「活动日历」承载）
    const views = wm.downstreamViewSegments(me.role, snapshot).filter((v) => v === 'taskforce');
    // 对象级下游：本人被加入（成员）或被授权（工作组 active grant / 负责人 / 发起人）
    const taskforces = personId ? tf.TaskForceRecordStore.getAll().filter((row) => {
      const workgroupId = row.workgroupId || `wg-taskforce-${row.id}`;
      const joined = (row.members || []).some((member) => member && member.personId === personId)
        || (domain.mockDB.workgroupMembers || []).some((member) =>
          member && member.workgroupId === workgroupId && member.personId === personId && member.status !== 'removed');
      const granted = (domain.mockDB.workgroupGrants || []).some((grant) =>
        grant && grant.workgroupId === workgroupId && grant.personId === personId && grant.status === 'active');
      return joined || granted || row.manager === personId || row.initiator === personId;
    }) : [];
    if (!views.length) {
      el.dataset.currentTab = 'tf-view';
      el.innerHTML = `
        <div class="card rounded-xl p-5">
          <p class="text-sm text-gray-600" role="status">暂无需要知情查看的专班。</p>
          <a class="btn-outline mt-3 inline-flex px-3 py-1.5 text-xs" href="?tab=calendar">去活动日历</a>
        </div>`;
      return null;
    }
    if (!taskforces.length) {
      el.dataset.currentTab = 'tf-view';
      el.innerHTML = `
        <div class="card rounded-xl p-5">
          <p class="text-sm text-gray-600" role="status">暂无本人被加入或授权的专班。</p>
          <a class="btn-outline mt-3 inline-flex px-3 py-1.5 text-xs" href="?tab=taskforce">专班管理在「专班管理」页</a>
        </div>`;
      return null;
    }
    return iv.renderInsightView(el, {
      views,
      defaultView: 'taskforce',
      highlightTfId: ctx?.highlightTfId || null,
      // 只传对象级下游集合，避免只读段再取全支部专班
      taskforces,
      // B6④（2026-09-12）：组织台「知情查看（只读）」传 readonly，禁表决写入口
      readonly: true,
      onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
    });
  });
}
