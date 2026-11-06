// role: [工程师]+[AI]
// 参与者工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { showToast } from '../../../core/base/utils.js?v=20261102b';
import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261102b';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261102b';
// 2026-11-01 批次 524（#7）：主行动落点由动作表声明，页签切换走统一导航
import { resolveTodoAction } from '../../../core/domain/todo-actions.js?v=20261102b';
import { goToWorkspaceTab } from '../../../core/session/workspace-nav.js?v=20261102b';

// G3 修正（2026-08-08）：参与者视角按钮用金浅底（纯亮金 #FFD700 实底过艳）
// 党徽金系固定语义，不随主题（样式单一源＝styles.css .tint-action-gold）
const GOLD_BTN_CLASS = 'tint-action-gold';

function _handleTodoAction(todo) {
  // 直达跳转（通知阅读 / 报名审核 T-233）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 2026-11-01 批次 524（#7）：落点由 todo-actions.js 声明（read/participate → 活动动态、
  //   submit → 「我的成长」页内考察区；旧 inspection 页签已由批次 351 并入 growth）。
  const action = resolveTodoAction(todo, 'visitor');
  if (action && action.tab) {
    const sourceId = todo.sourceId || (todo.items && todo.items[0] && todo.items[0].sourceId);
    const ok = goToWorkspaceTab(action.tab, { kind: action.kind, id: sourceId || todo.id || null });
    showToast('info', ok ? `已跳转，请处理：${todo.title}` : `请处理：${todo.title}`);
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
