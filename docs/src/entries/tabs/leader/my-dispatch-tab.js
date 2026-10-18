// role: [工程师]+[AI]
// 组长工作台 Tab：我的处置（T-279 M2 拆分）
// 过程性汇报/问题处置：组长可答复本组组员，支书仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../components/feedback/issue-dispatch-view.js?v=20261018g';
import { AuthStore } from '../../../services/core/auth.js?v=20261018g';

export function renderContent() {
  const el = document.getElementById('leader-tab-content');
  if (!el) return;
  // 2026-09-13 dogfood 同类彻查：身份取真实登录成员 personId（原写死占位 ID 'u_leader_1'）——
  // 三组组长曾共用同一占位 ID，第二/第三组长会看到第一组长的指派。
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) { el.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">请先登录</p>'; return; }
  // 2026-10-18 脏专项：组长台主对象「我提交 / 参与的反馈」置首（只调段序，不改数据范围与提交）。
  const opts = { myIssuesFirst: true };
  el.innerHTML = renderMyDispatchTab('leader', uid, opts);
  bindMyDispatchEvents(el, 'leader', uid, opts);
}
