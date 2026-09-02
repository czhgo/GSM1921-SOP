// role: [工程师]+[AI]
// ws-party-committee-entry.js — 党委工作台入口（P1 党委后台，2026-09-02）
// 院系党委组织员/党务老师：监控全院各支部（台账）+ 支部管理（创建/改名/配置）
// 职责与其余工作台一致：壳配置（capability tab 清单）+ 数据加载；角色特有逻辑仅保留。

import { createWorkspaceShell } from '../components/workspace-shell.js?v=20260901y';
import { loadActivities } from '../services/activity.js?v=20260901y';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260901y';
// 副作用导入触发党委工作台能力注册（tab 清单）
import '../modules/capabilities/party-committee-workspace.js?v=20260901t';

await createWorkspaceShell({
  accentRole: 'party-staff',
  scope: 'workspace:party-committee',
  capId: 'party-committee-workspace',
  containerId: 'party-committee-content',
  prefix: 'party-committee',
  storageKey: 'workflowos_tab_party_committee',
  defaultTab: 'monitor',
  renderCtxExtras: (state) => ({ activities: state.activities || [] }),
  loadOptions: {
    role: 'party-staff',
    storeInits: [() => TaskForceRecordStore.init()],
    extraLoads: [],
    fallbackData: () => loadActivities(),
    logTag: 'ws-party-committee',
  },
  fallbackExtras: { viewType: 'oversight', managementRole: 'party-staff' },
});
