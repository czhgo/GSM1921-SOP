// role: [工程师]+[AI]
// ws-disc-commissioner-entry.js — 纪检委员工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261001p';
import { loadActivities } from '../../services/activity/activity.js?v=20261001p';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261001p';
import { seedTodos } from '../../services/governance/todo.js?v=20261001p';
// 副作用导入触发纪检工作台能力注册（tab 清单）
import '../../capabilities/disc-workspace.js?v=20261001p';

await createWorkspaceShell({
  accentRole: 'disc-commissioner',
  scope: 'workspace:disc',
  capId: 'disc-workspace',
  containerId: 'disc-content',
  prefix: 'disc',
  storageKey: 'workflowos_tab_disc',
  defaultTab: 'today',
  renderCtxExtras: (state) => ({ activities: state.activities || [] }),
  // 2026-09-30 批次 297-2（支书裁「页头只留 1 枚本台主 CTA；跨台通用动作收进全局固定位」）：
  //   「一键汇报」已收进**顶栏全局固定位** ⇒ 本台页头不再挂重复入口（本台无自有主 CTA ⇒ 页头右侧留空）。
  // ── 首页跳转落点（支书 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  onNavTarget: (nav, state, shell) => {
    if (nav.tfId) {
      // 专班查看（纪检无专班职责≠无知情权）：快照高亮目标
      shell.setHighlight(nav.tfId, `.tfv-card[data-tf-id="${nav.tfId}"]`);
      shell.activate('tf-view');
      return { tabId: 'tf-view', highlightId: nav.tfId };
    }
    // 活动：落考勤管理（纪检活动相关承载，现状即权限；activityId 直达该活动考勤）
    const actId = nav.actId || null;
    const ctx = shell.renderCtx(state);
    ctx.attendanceFilterActId = actId; // 考勤落点由 attendance tab 经 ctx.attendanceFilterActId 消费完成
    shell.activate('attendance', ctx);
    return { tabId: 'attendance' };
  },
  loadOptions: {
    role: 'disc-commissioner',
    storeInits: [() => TaskForceRecordStore.init()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-disc',
    seedTodos,
  },
});
