// role: [工程师]+[AI]
// 参与者工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { showToast } from '../../../core/base/utils.js?v=20261028e';
import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261028e';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261028e';

// G3 修正（2026-08-08）：参与者视角按钮用金浅底（纯亮金 #FFD700 实底过艳）
// 党徽金系固定语义，不随主题（样式单一源＝styles.css .tint-action-gold）
const GOLD_BTN_CLASS = 'tint-action-gold';

function _handleTodoAction(todo) {
  // 直达跳转（通知阅读 / 报名审核 T-233）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 根据 actionType 跳转到对应 tab
  const tabMap = {
    read: 'activities',
    submit: 'inspection',
    participate: 'activities',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    const btn = document.querySelector(`.visitor-tab-btn[data-visitor-tab="${targetTab}"]`);
    if (btn) btn.click();
    const tabLabels = { read: '活动动态', submit: '我的考察', participate: '活动动态' };
    showToast('info', `已跳转到${tabLabels[todo.actionType] || '对应功能'}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'visitor-tab-content',
  prefix: 'visitor',
  role: 'visitor',
  onAction: _handleTodoAction,
  emptyHint: '暂无待办',
  detailBtnClass: GOLD_BTN_CLASS,
});
