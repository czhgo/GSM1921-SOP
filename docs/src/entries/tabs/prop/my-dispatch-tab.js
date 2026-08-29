// role: [工程师]+[AI]
// 宣传委员工作台 Tab：我的处置（T-279 M3 拆分，照 M2 样板）
// 过程性汇报/问题处置：宣传委员答复提交人，书记仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../services/issues.js?v=20260829m';

export function renderContent() {
  const el = document.getElementById('prop-tab-content');
  if (!el) return;
  el.innerHTML = renderMyDispatchTab('prop-commissioner', 'u_prop');
  bindMyDispatchEvents(el, 'prop-commissioner', 'u_prop');
}
