// role: [工程师]+[AI]
// 组织委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { showToast } from '../../../core/utils.js?v=20260903c';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260903c';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260903c';
import { renderHandoffInboxHtml, bindHandoffInbox } from '../../../components/handoff-inbox.js?v=20260903c';
import { HandoffStore } from '../../../services/handoff.js?v=20260903c';
import { openFormModal } from '../../../components/modal.js?v=20260903c';
import { renderMemberChangePanel } from '../../../components/member-change-panel.js?v=20260903c';

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
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

export const { renderContent } = createTodoTab({
  containerId: 'org-tab-content',
  prefix: 'org',
  role: 'org-commissioner',
  onAction: _handleTodoAction,
  // 2026-09-01 成员变更审批入口（书记点验链路 ③：议程记录通过 → 组织委员审批 → 广播全体支委）
  extraTopHtml: (ctx) => `<div id="org-member-change-panel"></div>` + renderHandoffInboxHtml({
    to: 'org-commissioner',
    accent: ctx.accent,
    title: '数据交接·考察建档',
    extraActionHtml: `<div class="mt-2 pt-2 border-t border-gray-100">
      <button id="org-shortage-btn" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" style="cursor:pointer;">标记补课材料缺失（通知纪检）</button>
    </div>`,
  }),
  bindExtras: (container, ctx) => {
    // 成员变更审批面板（渲染与操作都在组件内；完成后重渲染 todo）
    renderMemberChangePanel(container.querySelector('#org-member-change-panel'), {
      mode: 'org-approve',
      accent: ctx.accent,
      onDone: () => renderContent(ctx),
    });
    bindHandoffInbox(container, { to: 'org-commissioner', onDone: () => { showToast('success', '考察记录已接收建档'); renderContent(ctx); } });
    // T-304 C2 数据交接：组织标记补课材料缺失 → 纪检补课制度高亮（回执机制）
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
