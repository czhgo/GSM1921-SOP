// role: [工程师]+[AI]
// 参与者工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-11-10 批次 540 波次 1：落点只经 `executeTodoAction`（动作表 ＋ 统一导航），
//   失败由导航层给可见提示，不再只 toast。

import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261120a';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261120a';
// 2026-11-01 批次 524（#7）：主行动落点由动作表声明，页签切换走统一导航
import { executeTodoAction } from '../../../core/session/workspace-nav.js?v=20261120a';

// G3 修正（2026-08-08）：参与者视角按钮用金浅底（纯亮金 #FFD700 实底过艳）
// 党徽金系固定语义，不随主题（样式单一源＝styles.css .tint-action-gold）
const GOLD_BTN_CLASS = 'tint-action-gold';

function _handleTodoAction(todo) {
  // 直达跳转（通知阅读 / 报名审核 T-233）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 2026-11-01 批次 524（#7）：落点由 todo-actions.js 声明（read → 活动动态、
  //   submit → 「我的成长」页内复盘区；旧 inspection 页签已由批次 351 并入 growth）。
  executeTodoAction(todo, 'visitor');
}

export const { renderContent } = createTodoTab({
  containerId: 'visitor-tab-content',
  prefix: 'visitor',
  role: 'visitor',
  onAction: _handleTodoAction,
  emptyHint: '暂无待办',
  detailBtnClass: GOLD_BTN_CLASS,
});
