// role: [工程师]+[AI]
// 组长工作台 Tab：我的处置（T-279 M2 拆分）
// 过程性汇报/问题处置：组长可答复本组组员，书记仍全局可见。

import { renderMyDispatchTab, bindMyDispatchEvents } from '../../../services/issues.js?v=20260901k';

export function renderContent() {
  const el = document.getElementById('leader-tab-content');
  if (!el) return;
  el.innerHTML = renderMyDispatchTab('leader', 'u_leader_1');
  bindMyDispatchEvents(el, 'leader', 'u_leader_1');
}
