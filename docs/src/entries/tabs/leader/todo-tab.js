// role: [工程师]+[AI]
// 组长工作台 Tab：待办（T-279 M2 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-11-10 批次 540 波次 1：落点只经 `executeTodoAction`（动作表 ＋ 统一导航），
//   失败由导航层给可见提示，不再只 toast。

import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261110a';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261110a';
// 2026-11-01 批次 524（#7）：主行动落点由动作表声明，页签切换走统一导航
import { executeTodoAction } from '../../../core/session/workspace-nav.js?v=20261110a';

function _handleTodoAction(todo) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 2026-11-01 批次 524（#7）：落点由 todo-actions.js 声明（authorize → 本组活动、
  //   review → 组员进展；复盘状态已并入「组员进展」页内块，不再指向已删的 review 页签）。
  const { action, ok } = executeTodoAction(todo, 'leader');
  if (!ok || !action) return;
  // T-190 赋权待办兜底：直达活动详情内联编辑（≤2 跳）
  // 2026-08-24 T-280-B1 实测修复：① 聚合对象无 sourceId（getGroupedByAction 聚合不含该字段），
  // 须从 items[0] 取；② 目标 tab 为懒加载动态 import 渲染异步 + 渲染中间态元素可能被重建，
  // 以「详情面板打开」为完成条件轮询重试点击
  if (todo.actionType === 'authorize') {
    const authSrcId = todo.sourceId || (todo.items && todo.items[0] && todo.items[0].sourceId);
    if (!authSrcId) return;
    let tries = 0;
    const timer = setInterval(() => {
      const actItem = document.querySelector(`.leader-act-item[data-act-id="${authSrcId}"]`);
      const panel = document.getElementById('leader-act-detail');
      if (panel && !panel.classList.contains('hidden')) { clearInterval(timer); return; } // 详情已打开
      if (actItem) actItem.click();
      if (++tries > 40) clearInterval(timer); // 4s 超时（懒加载渲染 + 重建窗口）
    }, 100);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'leader-tab-content',
  prefix: 'leader',
  role: 'leader',
  onAction: _handleTodoAction,
});
