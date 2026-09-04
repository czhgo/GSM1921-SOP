// role: [工程师]+[AI]
// 待办「直达跳转」公共逻辑（T-234 F1 通知阅读 / T-233 报名审核 → 统一详情页）
// 2026-09-04 模块化扎口：org/leader/prop/visitor/secretary 五份 todo-tab 曾各自复制同源段，现收敛于此。
// 兼容聚合卡（items[0] 取首条）与单条待办；命中并执行跳转返回 true，未命中返回 false（交调用方继续 tabMap 处理）。

export function tryDirectJump(todo) {
  // 通知阅读待办（T-234 F1）：直达通知详情页（聚合时取首条 noticeId）
  const firstNotice = (todo.items && todo.items[0]) || todo;
  if (firstNotice.sourceType === 'notice' && (firstNotice.actionData?.noticeId || todo.actionData?.noticeId)) {
    const noticeId = firstNotice.actionData?.noticeId || todo.actionData?.noticeId;
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = `${basePath}notice.html?id=${noticeId}`;
    return true;
  }
  // 报名审核待办（T-233）：直达活动/专班详情页（多源聚合时取首条 sourceId）
  if (todo.actionKey === 'signup-review' || (todo.actionType === 'review' && ((todo.actionData && todo.actionData.signupId) || (todo.items || []).some(i => i.actionData && i.actionData.signupId)))) {
    const first = (todo.items && todo.items[0]) || todo;
    const srcId = first.sourceId || (first.actionData && first.actionData.sourceId);
    if (srcId) {
      const base = window.location.pathname.includes('/workspace/') ? '../' : '';
      const page = srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html';
      window.location.href = `${base}${page}?id=${srcId}`;
      return true;
    }
  }
  return false;
}
