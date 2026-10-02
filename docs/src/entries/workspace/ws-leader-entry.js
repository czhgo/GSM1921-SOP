// role: [工程师]+[AI]
// ws-leader-entry.js — 组长工作台入口（T-279 M2 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261002i';
import { flashHighlight } from '../../core/base/utils.js?v=20261002i';
import { loadActivities } from '../../services/activity/activity.js?v=20261002i';
import { SignupStore } from '../../services/activity/signup.js?v=20261002i';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261002i';
import { seedTodos } from '../../services/governance/todo.js?v=20261002i';
import { filterByRole } from '../tabs/leader/_shared.js?v=20261002i';
// 副作用导入触发组长工作台能力注册（tab 清单，M2e）
import '../../capabilities/leader-workspace.js?v=20261002i';

await createWorkspaceShell({
  accentRole: 'leader',
  scope: 'workspace:leader',
  capId: 'leader-workspace',
  containerId: 'leader-content',
  prefix: 'leader',
  storageKey: 'workflowos_tab_leader',
  defaultTab: 'today',
  // 角色特有渲染上下文：按组长视角过滤活动
  renderCtxExtras: (state, ctx) => ({ filteredActivities: filterByRole(state, 'leader').activities || [] }),
  // 2026-09-30 批次 297-2（支书裁「页头只留 1 枚本台主 CTA；跨台通用动作收进全局固定位」）：
  //   「一键汇报」已收进**顶栏全局固定位** ⇒ 本台页头不再挂重复入口。
  // ── 首页跳转落点（支书 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  onNavTarget: (nav, state, shell) => {
    if (nav.tfId) {
      // 专班查看（组长无专班职责≠无知情权）：快照高亮目标
      shell.setHighlight(nav.tfId, `.tfv-card[data-tf-id="${nav.tfId}"]`);
      shell.activate('tf-view');
      return { tabId: 'tf-view', highlightId: nav.tfId };
    }
    // 活动：定位活动管理 + 直达该活动详情（B1-5 轮询定位：活动数据可能延迟到达）
    shell.activate('write');
    if (nav.actId) {
      const targetActId = nav.actId;
      let attempts = 0;
      const tryLocate = () => {
        const item = document.querySelector(`.leader-act-item[data-act-id="${targetActId}"]`);
        if (item) {
          item.click(); // 展开详情
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(item);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(tryLocate, 300);
        }
      };
      setTimeout(tryLocate, 150);
    }
    return { tabId: 'write' };
  },
  loadOptions: {
    role: 'leader',
    storeInits: [() => SignupStore.init(), () => TaskForceRecordStore.init()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-leader',
    seedTodos,
  },
});
