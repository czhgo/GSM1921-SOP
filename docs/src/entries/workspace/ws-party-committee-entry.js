// role: [工程师]+[AI]
// ws-party-committee-entry.js — 党委工作台入口（P1 党委后台，2026-09-02）
// 院系党委组织员/党务老师：监控全院各支部（台账）+ 支部管理（创建/改名/配置）
// 职责与其余工作台一致：壳配置（capability tab 清单）+ 数据加载；角色特有逻辑仅保留。
// 立项⑦ B波（2026-09-06）：登录落点原为置首 tab「治理总览」。
// 2026-10-20 IA 修复批次（A06）：治理总览撤页（「组织待补」已并入支部管理的组织提醒列）
//   ⇒ 登录落点改为「支部上报」（review）：党委进入工作台先看待批复队列，再下发通知 / 管理支部。

import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261028e';
import { loadActivities } from '../../services/activity/activity.js?v=20261028e';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261028e';
// 2026-10-24 批次 508：活动深链的显式落点（提示 + 跳活动详情）需要这两个工具出口
import { showToast, getBasePath } from '../../core/base/utils.js?v=20261028e';
// Task 6：本台无活动承载面 ⇒ 跨页直达完整详情页（direct，objectDetailHref 统一出口）。
import { objectDetailHref } from '../../core/domain/object-route.js?v=20261028e';
// 副作用导入触发党委工作台能力注册（tab 清单）
import '../../capabilities/party-committee-workspace.js?v=20261028e';

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
  // 2026-10-24 批次 508：本台三个页签（下发通知 / 支部上报 / 支部管理）都**没有活动承载面**，
  //   原实现不写 onNavTarget ⇒ 首页/通知带 `?activityId=` 进来时目标被壳静默丢弃（页面毫无变化）。
  //   这里改为显式落点：先给可见提示，再跳到活动详情页（既有深链，不新造承载页/不复制详情面）。
  onNavTarget: (nav) => {
    if (!nav.actId) return false;
    const href = objectDetailHref('activity', nav.actId, { entry: 'cross-page-deeplink' });
    if (!href) return false;
    showToast('info', '本台无活动页签，已转到活动详情');
    window.location.assign(`${getBasePath()}${href}`);
    return { tabId: 'review' };
  },
  loadOptions: {
    role: 'party-staff',
    storeInits: [() => TaskForceRecordStore.init()],
    extraLoads: [],
    fallbackData: () => loadActivities(),
    logTag: 'ws-party-committee',
  },
  fallbackExtras: { viewType: 'oversight', managementRole: 'party-staff' },
});
