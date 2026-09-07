﻿// role: [工程师]+[AI]
// ws-secretary-entry.js — 书记工作台入口（T-279 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { getAppState, setState } from '../core/state.js?v=20260903c';
import { createWorkspaceShell } from '../components/workspace-shell.js?v=20260906h';
import { _currentYearMonth } from '../core/utils.js?v=20260903c';
import { loadActivities } from '../services/activity.js?v=20260903c';
import { BranchService } from '../services/runtime.js?v=20260903c';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260903c';
import { SignupStore } from '../services/signup.js?v=20260903c';
// T-304 Q3 权限收敛：副作用导入触发书记工作台能力注册（tab 清单，与其余 5 工作台对齐）
import '../modules/capabilities/secretary-workspace.js?v=20260906h';

await createWorkspaceShell({
  accentRole: 'secretary',
  scope: 'workspace:secretary',
  capId: 'secretary-workspace',
  containerId: 'secretary-content',
  prefix: 'secretary',
  storageKey: 'workflowos_tab_secretary',
  defaultTab: 'today',
  // 角色特有渲染上下文：全局 appState（书记各 tab 依赖）
  renderCtxExtras: (state, ctx) => ({ appState: getAppState(), activities: state.activities || [] }),
  // 空表回退映射省略：与 workspace-shell 缺省逐字一致（收敛 2026-09-02，删除内联副本）
  // ── 首页跳转落点（书记 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  onNavTarget: (nav, state, shell) => {
    if (nav.tfId) {
      // 专班查看（无专班职责≠无知情权）：快照高亮目标
      shell.setHighlight(nav.tfId, `.tfv-card[data-tf-id="${nav.tfId}"]`);
      shell.activate('tf-view');
      return { tabId: 'tf-view', highlightId: nav.tfId };
    }
    // 活动：定位活动管理日历视图 + 直达该活动详情
    const actId = nav.actId;
    shell.activate('calendar');
    if (actId) {
      // 必须先清 _navTarget 再 setState——setState 同步触发重渲染，若目标未清
      // 会再次进入本分支无限递归（RangeError: Maximum call stack size exceeded）。
      const act = (state.activities || []).find(a => a.id === actId);
      setState({
        selectedActivityId: actId,
        viewMode: 'detail',
        displayMonth: act?.date?.slice(0, 7) || _currentYearMonth(),
      });
    }
    return { tabId: 'calendar' };
  },
  loadOptions: {
    role: 'secretary',
    storeInits: [() => TaskForceRecordStore.init(), () => SignupStore.init()],
    extraLoads: [() => BranchService.listTasks()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-secretary',
  },
  fallbackExtras: { viewType: 'manager', managementRole: 'secretary' },
});
