// role: [工程师]+[AI]
// 组长工作台 Tab：待办（T-279 M2 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { TodoStore } from '../../../services/todo.js?v=20260901p';
import { showToast } from '../../../core/utils.js?v=20260901p';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260901p';

function _handleTodoAction(todo, ctx) {
  // 通知阅读待办（T-234 F1）：直达通知详情页（聚合时取首条 noticeId）
  const firstNotice = (todo.items && todo.items[0]) || todo;
  if (firstNotice.sourceType === 'notice' && (firstNotice.actionData?.noticeId || todo.actionData?.noticeId)) {
    const noticeId = firstNotice.actionData?.noticeId || todo.actionData?.noticeId;
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${noticeId}`;
    return;
  }
  // 报名审核待办（T233）：直达活动/专班详情页（多源聚合时取首条 sourceId）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && ((todo.actionData && todo.actionData.signupId) || (todo.items || []).some(i => i.actionData && i.actionData.signupId)))) {
    const first = (todo.items && todo.items[0]) || todo;
    const srcId = first.sourceId || (first.actionData && first.actionData.sourceId);
    if (srcId) {
      const base = window.location.pathname.includes('/workspace/') ? '../' : '';
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${base}${page}?id=${srcId}`;
      return;
    }
  }
  // 根据 actionType 跳转到对应 tab
  // 2026-08-24 T-280-B1 实测修复：actionKey 优先（同 actionType 多业务域区分，
  // 对齐 disc todo-tab 的 actionKey 级 tabMap）——review-submit 归复盘提交而非考勤上传
  const actionKeyMap = {
    'attendance-upload': 'attendance',
    'review-submit': 'review',
  };
  const tabMap = {
    authorize: 'write',
    submit: 'attendance',
    review: 'review',
  };
  const targetTab = (todo.actionKey && actionKeyMap[todo.actionKey]) || tabMap[todo.actionType];
  if (targetTab) {
    // 激活对应 tab
    const btn = document.querySelector(`.leader-tab-btn[data-leader-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达活动详情内联编辑（≤2 跳）
    // 2026-08-24 T-280-B1 实测修复：① 聚合对象无 sourceId（getGroupedByAction 聚合不含该字段），
    // 须从 items[0] 取；② 目标 tab 为懒加载动态 import 渲染异步 + 渲染中间态元素可能被重建，
    // 以「详情面板打开」为完成条件轮询重试点击
    const authSrcId = todo.sourceId || (todo.items && todo.items[0] && todo.items[0].sourceId);
    if (todo.actionType === 'authorize' && authSrcId) {
      let tries = 0;
      const timer = setInterval(() => {
        const actItem = document.querySelector(`.leader-act-item[data-act-id="${authSrcId}"]`);
        const panel = document.getElementById('leader-act-detail');
        if (panel && !panel.classList.contains('hidden')) { clearInterval(timer); return; } // 详情已打开
        if (actItem) actItem.click();
        if (++tries > 40) clearInterval(timer); // 4s 超时（懒加载渲染 + 重建窗口）
      }, 100);
    }
    const tabLabel = { write: '活动写入', attendance: '考勤上传', review: '复盘提交' }[targetTab] || '';
    showToast('info', `已跳转到${tabLabel}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'leader-tab-content',
  prefix: 'leader',
  role: 'leader',
  onAction: _handleTodoAction,
});
