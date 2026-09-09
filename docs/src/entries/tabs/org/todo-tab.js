// role: [工程师]+[AI]
// 组织委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-09-08 REVIEW_QUEUE 裁决批一（D1/D3/D6 组织侧）：
//   · 顶部 member 审批面板 + 数据交接顶卡移除——确认位唯一化 = 「成员发展」域批量块
//     （org-commissioner:member-approve，议程派生审批=通过）+ 「考察」域交接行「确认接收」；
//   · org 无队列顶卡：仅保留页顶补课发起小操作条（非队列卡，发起闭环不丢）。

import { showToast } from '../../../core/utils.js?v=20260909e';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260909e';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260909e';
import { REALTIME_GROUP_DOMAIN } from '../../../services/todo.js?v=20260909e';
import { HandoffStore } from '../../../services/handoff.js?v=20260909e';
import { openFormModal } from '../../../components/modal.js?v=20260909e';
import { preloadMemberChangeRequests, getCachedMemberChangeRequests, buildMcBulkRows, renderMcBulkRowsHtml, bindMcBulk } from '../../../components/member-change-panel.js?v=20260909e';

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
    if (n > 0) { showToast('success', `已确认接收 ${n} 条数据交接（考察记录已接收建档）`); renderContent(ctx); }
    else showToast('info', '没有可确认的交接（可能已处理）');
    return;
  }
  // member-approve 实时批量组：审批动作承载于左列批量块（勾选 → 「通过 N 项」）
  if (actionKey === 'member-approve') {
    showToast('info', '成员变更审批：在左列批量块勾选后点击「通过 N 项」，或点行进详情查看');
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
 * 组带 bulkHtml（域内批量审批块，来源徽标=议程）；组行点行进详情，批量勾选「通过 N 项」。 */
function _buildOrgRealtimeGroups(ctx) {
  const pending = (getCachedMemberChangeRequests() || []).filter(r => r.status === 'pending-org-approval');
  if (!pending.length) return [];
  const rows = buildMcBulkRows('org-approve');
  return [{
    groupKey: 'org-commissioner:member-approve',
    actionKey: 'member-approve',
    // IA-C1 Task2：实时组标注业务域（成员发展；member-confirm 同域键复用）
    domain: REALTIME_GROUP_DOMAIN['member-confirm'],
    title: '成员变更待审批',
    flow: '议程记录通过 → 组织委员审批（批量/逐项）→ 广播全体支委 → 书记确认更新阶段',
    count: rows.length,
    items: pending,
    hideActionBtn: true,
    bulkHtml: renderMcBulkRowsHtml(rows, { mode: 'org-approve', accent: ctx?.accent }),
  }];
}

export const { renderContent } = createTodoTab({
  containerId: 'org-tab-content',
  prefix: 'org',
  role: 'org-commissioner',
  onAction: _handleTodoAction,
  // 2026-09-08 裁决批一（D1/D3）：成员变更审批并入「成员发展」域实时组
  buildRealtimeGroups: _buildOrgRealtimeGroups,
  // 2026-09-08 裁决批一：成员变更审批请求预载（缓存 → 批量组同步产物；签名未变秒回、变才 await 拉取）
  onBeforeRender: async () => {
    await preloadMemberChangeRequests();
  },
  // 2026-09-08 裁决批一（D3/D6）：org 无队列顶卡（member 审批卡/交接箱移除）——
  // 仅保留页顶补课发起小操作条（非队列卡，发起闭环不丢）；交接确认=「考察」域折组行内「确认接收」
  extraTopHtml: (ctx) => `
    <div class="card rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-title-cn text-sm font-bold text-gray-800 flex-shrink-0">数据交接·考察建档</span>
        <span class="text-[11px] text-gray-400 truncate">纪检→组织 考察记录提交：确认位=「考察」域折组行内「确认接收」</span>
      </div>
      <button id="org-shortage-btn" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors flex-shrink-0" style="cursor:pointer;">标记补课材料缺失（通知纪检）</button>
    </div>`,
  bindExtras: (container, ctx) => {
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
            refId: 'shortage_' + Date.now(),
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
