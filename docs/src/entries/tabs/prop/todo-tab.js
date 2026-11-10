// role: [工程师]+[AI]
// 宣传委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-09-08 REVIEW_QUEUE 裁决批一（D3 宣传侧交接去顶卡）：顶部「数据交接」卡移除，
// 确认位唯一化 = 交接到本台的待办行内「确认接收」（现行交接类型均不指向宣传台，本分支为兜底）。

import { showToast, flashHighlight, smoothScroll } from '../../../core/base/utils.js?v=20261110b';
import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261110b';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261110b';
import { HandoffStore } from '../../../services/governance/handoff.js?v=20261110b';
// 2026-11-01 批次 524（#7）：主行动落点由动作表声明，页签切换走统一导航；
//   2026-11-10 批次 540 波次 1：失败落点由导航层给可见提示（不再只 toast）。
import { executeTodoAction } from '../../../core/session/workspace-nav.js?v=20261110b';

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  const actionKey = todo.actionKey || '';
  // 2026-09-08 裁决批一（D3 交接去顶卡入域折组）：交接确认接收（现行交接均不指向宣传台）——
  // 行内「确认接收」= HandoffStore.confirm（销待办+状态落库）；同型多条合组>1 → 整组确认
  if (actionKey.startsWith('handoff-')) {
    const items = (todo.items && todo.items.length > 0) ? todo.items : (todo.id ? [todo] : []);
    let n = 0;
    for (const it of items) {
      if (HandoffStore.confirm(it.actionData?.handoffId, 'prop-commissioner')) n += 1;
    }
    if (n > 0) { showToast('success', `已确认接收 ${n} 条数据交接`); renderContent(ctx); }
    else showToast('info', '没有可确认的交接（可能已处理）');
    return;
  }
  // 目标 tab 决策：actionKey 优先（遗留种子 todo_seed_6「提交七一活动新闻稿」携
  // actionKey='activity-archive' 但 actionType='submit' → 动作表按 actionKey 命中归档）。
  const { action, ok } = executeTodoAction(todo, 'prop-commissioner');
  if (!ok || !action) return;
  // 可定位时（携活动 id）切到归档页后滚动 + 高亮该活动（缺口区/记录行均带 data-archive-id）
  if (action.tab === 'archive') {
    const sourceId = todo.sourceId || todo.actionData?.sourceId || todo.actionData?.activityId;
    if (!sourceId) return;
    let attempts = 0;
    const tryLocate = () => {
      const el = document.querySelector(`[data-archive-id="${sourceId}"]`);
      if (el) { smoothScroll(el, { block: 'center' }); flashHighlight(el); }
      else if (attempts < 20) { attempts++; setTimeout(tryLocate, 200); }
    };
    setTimeout(tryLocate, 150);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'prop-tab-content',
  prefix: 'prop',
  role: 'prop-commissioner',
  onAction: _handleTodoAction,
  // 2026-09-08 裁决批一（D3）：extraTopHtml 清空（交接顶卡移除；确认位=「考勤纪律」域折组行内）
});
