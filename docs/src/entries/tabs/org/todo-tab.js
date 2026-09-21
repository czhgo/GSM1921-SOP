// role: [工程师]+[AI]
// 组织委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-09-08 REVIEW_QUEUE 裁决批一（D1/D3/D6 组织侧）：
//   · 顶部 member 审批面板 + 数据交接顶卡移除——确认位唯一化 = 「成员发展」域批量块
//     （org-commissioner:member-approve，议程派生审批=通过）+ 「考察」域交接行「确认接收」；
//   · org 无队列顶卡：仅保留页顶补课发起小操作条（非队列卡，发起闭环不丢）。

import { showToast, flashHighlight } from '../../../core/utils.js?v=20260921m';
import { generateId } from '../../../core/id.js?v=20260921m';
import { createTodoTab, createUrgeController } from '../../../components/todo-tab-shell.js?v=20260921m';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260921m';
import { REALTIME_GROUP_DOMAIN, buildDevelopNodeRemindGroup, buildHalfYearInspectionRemindGroup } from '../../../services/todo.js?v=20260921m';
import { SecretaryTodoDeriver } from '../../../services/secretary-overview.js?v=20260921m';
import { HandoffStore } from '../../../services/handoff.js?v=20260921m';
import { PersonStore } from '../../../services/person.js?v=20260921m';
import { loadActivities } from '../../../services/activity.js?v=20260921m';
import { loadInspectionRecords } from '../../../services/inspection.js?v=20260921m';
import { openFormModal } from '../../../components/modal.js?v=20260921m';
import { preloadMemberChangeRequests, getCachedMemberChangeRequests, buildMcBulkRows, renderMcBulkRowsHtml, bindMcBulk } from '../../../components/member-change-panel.js?v=20260921m';
// 发展推进覆盖（进入当前阶段日期）读口：与成员变更确认链确认生效写口同源（member-confirmation.js，同 localStorage 键位）
import { loadDevStageOverrides } from '../../../services/member-confirmation.js?v=20260921m';

// ── 逐条催办（SOP-B-29 / D-391 · 2026-09-18 批次 88）────────────────────────
// **主位在组织委员**：材料催缴与审核督办归组织委员（母本《常见工作场景快速指南》:369），
// 支书有权催办、但**一般不越俎代庖**（其台保留入口、标注为例外）。
// 判据未改：责任人 = urgeRolesOf（services/todo.js 单一源）；无责任人或责任人即本人 → 不渲染入口。
const _urge = createUrgeController({
  selfRoles: ['org-commissioner'],
  context: () => ({ activities: loadActivities(), people: PersonStore.getAll() }),
  onDone: (ctx) => renderContent(ctx),
});

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/todo-jump.js（2026-09-04）
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
    overrides: loadDevStageOverrides(),
  });
  if (devGroup) groups.push(devGroup);

  // 半年考察提醒（SOP-B-39；`D-295`：考察意见＝**半年一次 · 制度固定 · 非可调**）——
  // 覆盖培养考察期内的成员（积极分子 / 预备党员），本自然半年内无考察记录 → 提醒组织委员建档核对。
  // 提醒只作「可见」，不派任务、不改数据；考察记录的督办位仍在纪检台（`D-470` 督办清单）。
  const halfYearGroup = buildHalfYearInspectionRemindGroup({
    members: PersonStore.getMembers(),
    records: loadInspectionRecords(),
    overrides: loadDevStageOverrides(),
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
  // 可催办责任人；与支书台共用 components/todo-tab-shell.js::createUrgeController（同一实现、同一判据）。
  urgeStateOf: _urge.urgeStateOf,
  onUrgeTodo: _urge.onUrgeTodo,
  // 2026-09-08 裁决批一（D1/D3）：成员变更审批并入「成员发展」域实时组
  buildRealtimeGroups: _buildOrgRealtimeGroups,
  // 2026-09-08 裁决批一：成员变更审批请求预载（缓存 → 批量组同步产物；签名未变秒回、变才 await 拉取）
  onBeforeRender: async () => {
    await preloadMemberChangeRequests();
  },
  // 2026-09-08 裁决批一（D3/D6）：org 无队列顶卡（member 审批卡/交接箱移除）——
  // 仅保留页顶补课发起小操作条（非队列卡，发起闭环不丢）；交接确认=「考察」域折组行内「确认接收」
  // B6②（2026-09-12）：指路改为「有 pending 才显示且可点」——旧实现常驻指路指向不存在的域折组；
  //   现按 HandoffStore 待接收的 inspection-report 交接动态渲染，点击滚动高亮该域折组行。
  extraTopHtml: () => {
    const pending = HandoffStore.listByRole('org-commissioner').filter(h => h.type === 'inspection-report');
    const guide = pending.length > 0
      ? `<button type="button" id="org-handoff-guide" class="text-[11px] text-left text-blue-700 hover:text-blue-900 underline decoration-dotted truncate" style="cursor:pointer;">有 ${pending.length} 条考察记录待接收 —— 到「考察」域折组行内点「确认接收」→</button>`
      : `<span class="text-[11px] text-gray-500 truncate">暂无待接收的考察记录（纪检提交后此处给出指路）</span>`;
    return `
    <div class="card rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between gap-3">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="font-title-cn text-sm font-bold text-gray-800 flex-shrink-0">数据交接·考察建档</span>
        ${guide}
      </div>
      <button id="org-shortage-btn" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors flex-shrink-0" style="cursor:pointer;">标记补课材料缺失（通知纪检）</button>
    </div>`;
  },
  bindExtras: (container, ctx) => {
    // B6②：指路可点 → 滚动定位并高亮「考察」域折组（handoff-inspection-report）
    container.querySelector('#org-handoff-guide')?.addEventListener('click', () => {
      const row = container.querySelector('[data-group-key="org-commissioner:handoff-inspection-report"]');
      if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); flashHighlight(row); }
      else showToast('info', '未找到「考察」域折组，请稍后重试');
    });
    // 2026-09-08 裁决批一（D1/D3）：成员变更批量块（勾选 → 「通过 N 项」 → 广播全体支委 + 重渲染）
    bindMcBulk(container, { mode: 'org-approve', onDone: () => renderContent(ctx) });
    // T-304 C2 数据交接：组织标记补课材料缺失 → 纪检补课制度高亮（回执机制；
    // 2026-09-08 裁决批一：入口随顶卡收敛为页顶小操作条，非队列卡）
    container.querySelector('#org-shortage-btn')?.addEventListener('click', () => {
      openFormModal({
        id: 'shortage',
        title: '标记补课材料缺失',
        fields: [
          { key: 'source', label: '关联活动/专班', type: 'input', required: true, placeholder: '如：7月主题党日：五四精神传承' },
          { key: 'note', label: '缺失说明', type: 'textarea', required: true, placeholder: '如：某成员缺勤补课材料（心得）未提交' },
        ],
        onSubmit: (values) => {
          HandoffStore.create({
            type: 'material-shortage',
            refType: 'activity',
            refLabel: values.source,
            refId: generateId('shortage'),
            note: values.note,
          });
          showToast('success', '补课需求回执已发送至纪检委员');
          renderContent(ctx);
        },
        accentColor: ctx.accent || '#3B82F6',
      });
    });
  },
});
