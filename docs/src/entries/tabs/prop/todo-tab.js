// role: [工程师]+[AI]
// 宣传委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。
// 2026-09-08 REVIEW_QUEUE 裁决批一（D3 宣传侧交接去顶卡）：顶部「数据交接·考勤备案」卡移除，
// 确认位唯一化 = 「考勤纪律」域折组行内「确认接收」（纪检→宣传 考勤备案）。

import { showToast } from '../../../core/utils.js?v=20260908c';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260908c';
import { tryDirectJump } from '../../../components/todo-jump.js?v=20260908c';
import { HandoffStore } from '../../../services/handoff.js?v=20260908c';

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1）已收敛于 components/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  const actionKey = todo.actionKey || '';
  // 2026-09-08 裁决批一（D3 交接去顶卡入域折组）：宣传确认接收 纪检→宣传 考勤备案——
  // 行内「确认接收」= HandoffStore.confirm（销待办+状态落库）；同型多条合组>1 → 整组确认
  if (actionKey.startsWith('handoff-')) {
    const items = (todo.items && todo.items.length > 0) ? todo.items : (todo.id ? [todo] : []);
    let n = 0;
    for (const it of items) {
      if (HandoffStore.confirm(it.actionData?.handoffId, 'prop-commissioner')) n += 1;
    }
    if (n > 0) { showToast('success', `已确认接收 ${n} 条数据交接（考勤备案已确认）`); renderContent(ctx); }
    else showToast('info', '没有可确认的交接（可能已处理）');
    return;
  }
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
  // 2026-09-08 裁决批一（D3）：extraTopHtml 清空（交接顶卡移除；确认位=「考勤纪律」域折组行内）
});
