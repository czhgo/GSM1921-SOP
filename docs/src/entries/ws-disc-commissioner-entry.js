﻿﻿// role: [工程师]+[AI]
// ws-disc-commissioner-entry.js — 纪检委员工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { createWorkspaceShell } from '../components/workspace-shell.js?v=20260903b';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260903b';
import { loadActivities } from '../services/activity.js?v=20260903b';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260903b';
import { seedTodos } from '../services/todo.js?v=20260903b';
// 副作用导入触发纪检工作台能力注册（tab 清单）
import '../modules/capabilities/disc-workspace.js?v=20260829r';

await createWorkspaceShell({
  accentRole: 'disc-commissioner',
  scope: 'workspace:disc',
  capId: 'disc-workspace',
  containerId: 'disc-content',
  prefix: 'disc',
  storageKey: 'workflowos_tab_disc',
  defaultTab: 'todo',
  renderCtxExtras: (state) => ({ activities: state.activities || [] }),
  // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  extraRightHtml: ({ accent, accentRgba }) => renderReportEntryHtml({ accent, accentRgba }),
  bindExtras: (container) => bindReportEntry(container),
  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
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
