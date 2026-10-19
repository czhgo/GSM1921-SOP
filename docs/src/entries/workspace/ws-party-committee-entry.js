// role: [工程师]+[AI]
// ws-party-committee-entry.js — 党委工作台入口（P1 党委后台，2026-09-02）
// 院系党委组织员/党务老师：监控全院各支部（台账）+ 支部管理（创建/改名/配置）
// 职责与其余工作台一致：壳配置（capability tab 清单）+ 数据加载；角色特有逻辑仅保留。
// 立项⑦ B波（2026-09-06）：登录落点原为置首 tab「治理总览」。
// 2026-10-20 IA 修复批次（A06）：治理总览撤页（「组织待补」已并入支部管理的组织提醒列）
//   ⇒ 登录落点改为「支部上报」（review）：党委进入工作台先看待批复队列，再下发通知 / 管理支部。

import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261019a';
import { loadActivities } from '../../services/activity/activity.js?v=20261019a';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261019a';
// 副作用导入触发党委工作台能力注册（tab 清单）
import '../../capabilities/party-committee-workspace.js?v=20261019a';

await createWorkspaceShell({
  accentRole: 'party-staff',
  scope: 'workspace:party-committee',
  capId: 'party-committee-workspace',
  containerId: 'party-committee-content',
  prefix: 'party-committee',
  // A06（2026-10-20）：治理总览撤页后，登录落点＝「支部上报」——党委先看待批复队列。
  // 不设 tab 记忆（storageKey 缺省）——每次进入都先落待批复，与「首页放最前」口径一致。
  defaultTab: 'review',
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
