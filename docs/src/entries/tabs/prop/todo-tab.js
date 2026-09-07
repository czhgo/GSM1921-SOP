// role: [工程师]+[AI]
// 宣传委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { showToast } from '../../../core/utils.js?v=20260903c';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260906j';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260903c';
import { renderHandoffInboxHtml, bindHandoffInbox } from '../../../components/handoff-inbox.js?v=20260903c';

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1）已收敛于 components/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    submit: 'tasks',
    archive: 'archive',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.prop-tab-btn[data-prop-tab="${targetTab}"]`);
    if (btn) btn.click();
    const tabLabels = { submit: '宣传任务', archive: '档案归档' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'prop-tab-content',
  prefix: 'prop',
  role: 'prop-commissioner',
  onAction: _handleTodoAction,
  // T-304 C2 数据交接：宣传确认考勤备案（确认后纪检侧显示已备案 + 待办销项）
  extraTopHtml: (ctx) => renderHandoffInboxHtml({ to: 'prop-commissioner', accent: ctx.accent, title: '数据交接·考勤备案' }),
  bindExtras: (container, ctx) => {
    bindHandoffInbox(container, { to: 'prop-commissioner', onDone: () => { showToast('success', '考勤备案已确认'); renderContent(ctx); } });
  },
});
