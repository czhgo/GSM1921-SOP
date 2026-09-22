// role: [工程师]+[AI]
// 纪检委员工作台 Tab：我的处置（T-279 M3 拆分，照 M2 样板）
// 过程性汇报/问题处置：纪检委员答复提交人，支书仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../services/issues.js?v=20260922b';
import { AuthStore } from '../../../services/auth.js?v=20260922b';

export function renderContent() {
  const el = document.getElementById('disc-tab-content');
  if (!el) return;
  // 2026-09-13 dogfood 同类彻查：身份取真实登录成员 personId（原写死占位 ID 'u_disc'）
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) { el.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">请先登录</p>'; return; }
  el.innerHTML = renderMyDispatchTab('disc-commissioner', uid);
  bindMyDispatchEvents(el, 'disc-commissioner', uid);
}
