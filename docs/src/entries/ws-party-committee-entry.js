// role: [工程师]+[AI]
// ws-party-committee-entry.js — 党委工作台入口（P1 党委后台，2026-09-02）
// 院系党委组织员/党务老师：监控全院各支部（台账）+ 支部管理（创建/改名/配置）
// 职责与其余工作台一致：壳配置（capability tab 清单）+ 数据加载；角色特有逻辑仅保留。
// 立项⑦ B波（2026-09-06）：登录落点 = 置首 tab「治理总览」（治理首页，先总览再进各业务 tab）。

import { createWorkspaceShell } from '../components/workspace-shell.js?v=20260908a';
import { loadActivities } from '../services/activity.js?v=20260903c';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260907b';
// 副作用导入触发党委工作台能力注册（tab 清单）
import '../modules/capabilities/party-committee-workspace.js?v=20260908a';

await createWorkspaceShell({
  accentRole: 'party-staff',
  scope: 'workspace:party-committee',
  capId: 'party-committee-workspace',
  containerId: 'party-committee-content',
  prefix: 'party-committee',
  // 立项⑦ B波（2026-09-06）：治理总览 = 党委登录落点/治理首页。
  // 不设 tab 记忆（storageKey 缺省）——每次进入先落「治理总览」，与书记「首页放最前」口径一致。
  defaultTab: 'governance-overview',
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
