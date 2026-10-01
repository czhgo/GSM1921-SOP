// role: [工程师]+[AI]
// 组织委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-09-08 REVIEW_QUEUE 裁决批一（D1/D3/D6 组织侧）：
//   · 顶部 member 审批面板 + 数据交接顶卡移除——确认位唯一化 = 「成员发展」域批量块
//     （org-commissioner:member-approve，议程派生审批=通过）+ 「考察」域交接行「确认接收」；
//   · org 无队列顶卡：仅保留页顶补课发起小操作条（非队列卡，发起闭环不丢）。

import { showToast, flashHighlight } from '../../../core/base/utils.js?v=20261001h';
import { createTodoTab, createUrgeController } from '../../../components/record/todo-tab-shell.js?v=20261001h';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261001h';
import { REALTIME_GROUP_DOMAIN, buildDevelopNodeRemindGroup, buildHalfYearInspectionRemindGroup } from '../../../services/governance/todo.js?v=20261001h';
import { SecretaryTodoDeriver } from '../../../services/governance/secretary-overview.js?v=20261001h';
import { HandoffStore } from '../../../services/governance/handoff.js?v=20261001h';
import { PersonStore } from '../../../services/member/person.js?v=20261001h';
import { loadActivities } from '../../../services/activity/activity.js?v=20261001h';
import { loadInspectionRecords } from '../../../services/activity/inspection.js?v=20261001h';
import { preloadMemberChangeRequests, getCachedMemberChangeRequests, buildMcBulkRows, renderMcBulkRowsHtml, bindMcBulk } from '../../../components/governance/member-change-panel.js?v=20261001h';
// 发展推进「进入当前阶段日期」读口：单一源＝成员档案字段 `developStageSince`（2026-09-28 服务端化，
// 原为本机键 gsm1921-dev-stage-overrides；读口形状不变）
import { loadStageEntryDates } from '../../../services/member/member-confirmation.js?v=20261001h';

// ── 逐条催办（SOP-B-29 / D-391 · 2026-09-18 批次 88）────────────────────────
// **主位在组织委员**：材料催缴与审核督办归组织委员（母本《常见工作场景快速指南》:369），
// 支书有权催办、但**一般不越俎代庖**（其台保留入口、标注为例外）。
// 判据未改：责任人 = urgeRolesOf（services/governance/todo.js 单一源）；无责任人或责任人即本人 → 不渲染入口。
const _urge = createUrgeController({
  selfRoles: ['org-commissioner'],
  context: () => ({ activities: loadActivities(), people: PersonStore.getAll() }),
  onDone: (ctx) => renderContent(ctx),
});

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  const actionKey = todo.actionKey || '';
  // 2026-09-08 裁决批一（D3 交接去顶卡入域折组）：组织接收 纪检→组织 考察记录提交——
  // 行内「确认接收」= HandoffStore.confirm（销待办+状态落库）；同型多条合组>1 → 整组确认
  if (actionKey.startsWith('handoff-')) {
    const items = (todo.items && todo.items.length > 0) ? todo.items : (todo.id ? [todo] : []);
    let n = 0;
    for (const it of items) {
      if (HandoffStore.confirm(it.actionData?.handoffId, 'org-commissioner')) n += 1;
    }
    if (n > 0) { showToast('success', `已确认接收 ${n} 条数据交接`); renderContent(ctx); }
    else showToast('info', '没有可确认的交接（可能已处理）');
    return;
  }
  // member-approve 实时批量组：审批动作承载于左列批量块（勾选 → 「通过 N 项」）
  if (actionKey === 'member-approve') {
    showToast('info', '成员变更审批：在左列批量块勾选后点击「通过 N 项」，或点行进详情查看');
    return;
  }
  // develop-node-remind 实时组：期满成员 → 直达「发展数据」tab 办理下一节点
  if (actionKey === 'develop-node-remind') {
    document.querySelector('.org-tab-btn[data-org-tab="development"]')?.click();
    showToast('info', '已跳转到发展数据，请办理期满成员的下一节点');
    return;
  }
  // half-year-inspection-remind 实时组（SOP-B-39 · D-295）：半年考察提醒 → 直达「考察上传」核对建档
  if (actionKey === 'half-year-inspection-remind') {
    document.querySelector('.org-tab-btn[data-org-tab="inspection"]')?.click();
    showToast('info', '已跳转到考察上传，请核对本半年考察意见（建档与核对归组织委员）');
    return;
  }
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    authorize: 'taskforce',
    review: 'inspection',
    track: 'development',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.org-tab-btn[data-org-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达专班详情成员角色编辑（≤2 跳）
    if (todo.actionType === 'authorize' && todo.sourceId) {
      const tfCard = document.querySelector(`.tf-store-card[data-tf-id="${todo.sourceId}"]`);
      if (tfCard) tfCard.click();
    }
    const tabLabels = { authorize: '专班管理', review: '考察上传', track: '发展数据' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

/** 2026-09-08 裁决批一（D1/D3）：成员变更审批实时组（议程派生 pending-org-approval）——
 * 组带 bulkHtml（域内批量审批块，来源徽标=议程）；组行点行进详情，批量勾选「通过 N 项」。
 * 2026-09-10 增补：发展节点提醒实时组（组织委员流程指南附录A：培养考察期满/预备期满），
 * 由 buildDevelopNodeRemindGroup 纯派生（成员 developStage + entryDate），域=成员发展。 */
function _buildOrgRealtimeGroups(ctx) {
  const groups = [];
  const pending = (getCachedMemberChangeRequests() || []).filter(r => r.status === 'pending-org-approval');
  if (pending.length) {
    const rows = buildMcBulkRows('org-approve');
    groups.push({
      groupKey: 'org-commissioner:member-approve',
      actionKey: 'member-approve',
      // IA-C1 Task2：实时组标注业务域（成员发展；member-confirm 同域键复用）
      domain: REALTIME_GROUP_DOMAIN['member-confirm'],
      title: '成员变更待审批',
      flow: '议程记录通过 → 组织委员审批（批量/逐项）→ 广播全体支委 → 支书确认更新阶段',
      count: rows.length,
      items: pending,
      hideActionBtn: true,
      bulkHtml: renderMcBulkRowsHtml(rows, { mode: 'org-approve', accent: ctx?.accent }),
    });
  }
  const devGroup = buildDevelopNodeRemindGroup({
    members: PersonStore.getMembers(),
    overrides: loadStageEntryDates(),
  });
  if (devGroup) groups.push(devGroup);

  // 半年考察提醒（SOP-B-39；`D-295`：考察意见＝**半年一次 · 制度固定 · 非可调**）——
  // 覆盖培养考察期内的成员（积极分子 / 预备党员），本自然半年内无考察记录 → 提醒组织委员建档核对。
  // 提醒只作「可见」，不派任务、不改数据；考察记录的督办位仍在纪检台（`D-470` 督办清单）。
  const halfYearGroup = buildHalfYearInspectionRemindGroup({
    members: PersonStore.getMembers(),
    records: loadInspectionRecords(),
    overrides: loadStageEntryDates(),
  });
  if (halfYearGroup) groups.push(halfYearGroup);

  // 材料催缴与审核督办（SOP-B-29 / `D-391`）——**考察线缺口**（纪检已录入未确认 / 超期）。
  // 判据与支书台**同一源**（`SecretaryTodoDeriver` → `getOverdueRecords`），不另立标准；只换本台的主位：
  // 组织委员在此**催**纪检委员（催办责任人解析仍走 `urgeRolesOf`，未改）。其余材料走线下（`D-444`），系统无落点。
  const inspectionGap = SecretaryTodoDeriver.computeAggregates().find(g => g.actionKey === 'inspection-remind');
  if (inspectionGap) {
    groups.push({ ...inspectionGap, groupKey: 'org-commissioner:inspection-remind', hideActionBtn: true });
  }
  return groups;
}

export const { renderContent } = createTodoTab({
  containerId: 'org-tab-content',
  prefix: 'org',
  role: 'org-commissioner',
  onAction: _handleTodoAction,
  // 逐条催办（SOP-B-29 / D-391 · 2026-09-18 批次 88）：**主位在组织委员**——本台各域条目（含实时组）
  // 可催办责任人；与支书台共用 components/record/todo-tab-shell.js::createUrgeController（同一实现、同一判据）。
  urgeStateOf: _urge.urgeStateOf,
  onUrgeTodo: _urge.onUrgeTodo,
  // 2026-09-08 裁决批一（D1/D3）：成员变更审批并入「成员发展」域实时组
  buildRealtimeGroups: _buildOrgRealtimeGroups,
  // 2026-09-08 裁决批一：成员变更审批请求预载（缓存 → 批量组同步产物；签名未变秒回、变才 await 拉取）
  onBeforeRender: async () => {
    await preloadMemberChangeRequests();
  },
  // 2026-09-08 裁决批一（D3/D6）：org 无队列顶卡（member 审批卡/交接箱移除）。
  // 2026-09-29 批次 295（支书裁「**需要自动交接的 都要实现自动交接才对！不需要额外费口舌**」）：
  //   考察/考勤两类数据交接**发起即落定**（见 services/governance/handoff.js::AUTO_CONFIRM_TYPES）
  //   ⇒ 本条**不再有**「有待接收 —— 去点确认接收」的指路、也不再写「纪检提交后此处给出指路」那类空态解释
  //   （那两段都是**替界面说话**）。
  // ⚠ 2026-09-30 批次 313（支书逐字裁定 · 提醒机制取「甲 + 丙」）：**「补课材料缺失 → 通知纪检」页顶小操作条已撤除**。
  //   正确链条＝**当事人本人是补课主体**（系统提醒本人）＋ **纪检是补课闭环责任人**（由纪检催当事人）；
  //   **组织委员不承担这条链的任何动作**——它只是「考勤统计交支委会」的接收建档方（事实留痕，不设回执动作）。
  //   ⇒ 本处**不再渲染任何补课类卡片 / 按钮**（`extraTopHtml` 已撤）。
  //   `handoff` 的 `material-shortage` 类型定义与纪检侧消费端**暂留原状**（服务端仍可接收该型；
  //   `records-endpoints` 用它当「仍 pending 的交接」夹具）⇒ **「纪检侧催办位」的改造列入下一批待办**，与本次同裁定一起做。
  bindExtras: (container, ctx) => {
    // 2026-09-08 裁决批一（D1/D3）：成员变更批量块（勾选 → 「通过 N 项」 → 广播全体支委 + 重渲染）
    bindMcBulk(container, { mode: 'org-approve', onDone: () => renderContent(ctx) });
  },
});
