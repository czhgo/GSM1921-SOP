// role: [工程师]+[AI]
// entries/tabs/org/activity-calendar-tab.js — 组织台「活动日历」页（共享只读日历 + 本台「活动进展」分段）
//
// 2026-10-20 第三轮 IA 判例④：原「专班管理」页里的「活动工作组」（全部活动查询 + 材料出口 + 确认完成）
//   与「活动日历」回答同一个问题，且让 D-442 锁定的页签名覆盖了不归它管的对象。
//   裁定保留页签名「专班管理」，把活动这一面迁回「活动日历」——本文件就是那次迁移的承载面：
//   · 上半部仍是六台共用的只读日历（单一源 `entries/tabs/shared/activity-calendar-tab.js`，不改）；
//   · 下半部是本台专属的「活动进展」分段（组件单一源 `components/governance/activity-progress.js`）。
//   ⚠ 不新造页签、不改注册序；`?tab=calendar` / 旧 `?tab=tf-view` 别名均不受影响。

import { getAppState, setState } from '../../../core/base/state.js?v=20261021a';
import { renderContent as renderSharedCalendar } from '../shared/activity-calendar-tab.js?v=20261021a';
import { renderActivityProgress } from '../../../components/governance/activity-progress.js?v=20261021a';

export function renderContent(ctx = {}) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 共享只读日历：六台同款「左日历 / 右详情」
  renderSharedCalendar(container);

  let host = container.querySelector('#org-activity-progress');
  if (!host) {
    host = document.createElement('div');
    host.id = 'org-activity-progress';
    host.className = 'mt-4';
    container.appendChild(host);
  }

  const activities = (getAppState() || {}).activities || [];
  renderActivityProgress(host, {
    activities,
    accent: ctx.accent,
    // 标记完成后与旧行为一致：整块重渲染（日历与列表同源刷新）
    onChange: () => setState({}),
  });
}
