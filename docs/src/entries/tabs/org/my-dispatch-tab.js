// role: [工程师]+[AI]
// 组织委员工作台 Tab：我的处置（T-279 M3 拆分，照 M2 样板）
// 过程性汇报/问题处置：组织委员答复提交人，支书仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../components/feedback/issue-dispatch-view.js?v=20261028d';
import { AuthStore } from '../../../services/core/auth.js?v=20261028d';
import { getBasePath } from '../../../core/base/utils.js?v=20261028d';

import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261028d';
export function renderContent() {
  const el = document.getElementById('org-tab-content');
  if (!el) return;
  // 2026-09-13 dogfood 同类彻查：身份取真实登录成员 personId（原写死占位 ID 'u_org'）——
  // 「了解进展」请求以真实 personId 落库，占位 ID 读取不到；指派同源改真实 ID 后两侧对齐。
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) { el.innerHTML = emptyStateHtml({ variant: 'panel', text: '请先登录后使用', actionHtml: `<a class="btn-outline" href="${getBasePath()}login.html">去登录</a>` }); return; }
  el.innerHTML = renderMyDispatchTab('org-commissioner', uid);
  bindMyDispatchEvents(el, 'org-commissioner', uid);
}
