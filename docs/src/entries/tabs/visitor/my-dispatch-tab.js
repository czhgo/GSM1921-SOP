// role: [工程师]+[AI]
// 成员工作台 Tab：我的处置（2026-09-15 新增，支书裁定）
// 过程性汇报/问题处置：成员答复提交人/回应「了解进展」，支书仍全局可见。
// id/label 与组织/宣传/纪检/组长四台同名（同一功能不设两个名字）；
// 成员能否查看/答复由 services/governance/issues.js（另一工作流 C）定权限，本薄壳只登记渲染入口。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../components/feedback/issue-dispatch-view.js?v=20260930d';
import { AuthStore } from '../../../services/core/auth.js?v=20260930d';

export function renderContent() {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return;
  // 身份取真实登录成员 personId（与其余四台同口径，不用演示占位 ID）
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) { el.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">请先登录</p>'; return; }
  el.innerHTML = renderMyDispatchTab('participant', uid);
  bindMyDispatchEvents(el, 'participant', uid);
}
