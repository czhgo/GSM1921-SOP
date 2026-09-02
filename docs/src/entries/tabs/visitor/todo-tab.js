// role: [工程师]+[AI]
// 参与者工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { showToast } from '../../../core/utils.js?v=20260901o';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260901o';

// G3 修正（2026-08-08）：参与者视角按钮用金浅底（纯亮金 #FFD700 实底过艳）
const GOLD_BTN_STYLE = '--acc-bg-dark:rgba(251,191,36,0.16);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.35);background:rgba(255,215,0,0.12);color:#A16207;border:1px solid rgba(255,215,0,0.35);';

function _handleTodoAction(todo) {
  // 通知类待办：优先跳转通知详情页
  if (todo.sourceType === 'notice' && todo.actionData?.noticeId) {
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${todo.actionData.noticeId}`;
    return;
  }
  // 报名审核待办：活动/专班 → 统一详情页（T233）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && todo.actionData?.signupId)) {
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    const srcId = todo.sourceId || todo.actionData?.sourceId;
    if (srcId) {
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${basePath}${page}?id=${srcId}`;
      return;
    }
  }
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
  emptyHint: '或直接点击"去阅读/去提交"等按钮处理',
  detailBtnStyle: GOLD_BTN_STYLE,
});
