// role: [工程师]+[AI]
// 组织委员工作台 Tab：我的处置（T-279 M3 拆分，照 M2 样板）
// 过程性汇报/问题处置：组织委员答复提交人，支书仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../services/issues.js?v=20260914c';
import { AuthStore } from '../../../services/auth.js?v=20260914c';

export function renderContent() {
  const el = document.getElementById('org-tab-content');
  if (!el) return;
  // 2026-09-13 dogfood 同类彻查：身份取真实登录成员 personId（原写死占位 ID 'u_org'）——
  // 「了解进展」请求以真实 personId 落库，占位 ID 读取不到；指派同源改真实 ID 后两侧对齐。
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) { el.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">请先登录</p>'; return; }
  el.innerHTML = renderMyDispatchTab('org-commissioner', uid);
  bindMyDispatchEvents(el, 'org-commissioner', uid);
}
