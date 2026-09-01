// role: [工程师]+[AI]
// 纪检委员工作台 Tab：我的处置（T-279 M3 拆分，照 M2 样板）
// 过程性汇报/问题处置：纪检委员答复提交人，书记仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../services/issues.js?v=20260901e';

export function renderContent() {
  const el = document.getElementById('disc-tab-content');
  if (!el) return;
  el.innerHTML = renderMyDispatchTab('disc-commissioner', 'u_disc');
  bindMyDispatchEvents(el, 'disc-commissioner', 'u_disc');
}
