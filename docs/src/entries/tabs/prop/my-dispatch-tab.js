// role: [工程师]+[AI]
// 宣传委员工作台 Tab：我的处置（T-279 M3 拆分，照 M2 样板）
// 过程性汇报/问题处置：宣传委员答复提交人，支书仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../components/feedback/issue-dispatch-view.js?v=20261031a';
import { AuthStore } from '../../../services/core/auth.js?v=20261031a';
import { getBasePath } from '../../../core/base/utils.js?v=20261031a';

import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261031a';
export function renderContent() {
  const el = document.getElementById('prop-tab-content');
  if (!el) return;
  // 2026-09-13 dogfood 同类彻查：身份取真实登录成员 personId（原写死占位 ID 'u_prop'）
  const uid = AuthStore.getCurrentUser()?.personId;
  if (!uid) { el.innerHTML = emptyStateHtml({ variant: 'panel', text: '请先登录后使用', actionHtml: `<a class="btn-outline" href="${getBasePath()}login.html">去登录</a>` }); return; }
  el.innerHTML = renderMyDispatchTab('prop-commissioner', uid);
  bindMyDispatchEvents(el, 'prop-commissioner', uid);
}
