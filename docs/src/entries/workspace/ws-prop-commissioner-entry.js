// role: [工程师]+[AI]
// ws-prop-commissioner-entry.js — 宣传委员工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261024c';
import { flashHighlight } from '../../core/base/utils.js?v=20261024c';
import { loadActivities } from '../../services/activity/activity.js?v=20261024c';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261024c';
import { seedTodos } from '../../services/governance/todo.js?v=20261024c';
import { AuthStore } from '../../services/core/auth.js?v=20261024c';
import { PEOPLE } from '../../data/mock/index.js?v=20261024c';
import { mockDB } from '../../core/domain/domain.js?v=20261024c';
// 副作用导入触发宣传委员工作台能力注册（tab 清单）
import '../../capabilities/prop-workspace.js?v=20261024c';

await createWorkspaceShell({
  accentRole: 'prop-commissioner',
  scope: 'workspace:prop',
  capId: 'prop-workspace',
  containerId: 'prop-content',
  prefix: 'prop',
  storageKey: 'workflowos_tab_prop',
  defaultTab: 'today',
  // 角色特有渲染上下文：宣传相关专班（按**角色/工作组归属**，不按名称子串或固定 personId）
  // 为什么（R2-11）：名称含「宣传」会把别组专班误收；写死 p12 会让委员换人后看不到自己的专班。
  renderCtxExtras: (state) => {
    const taskforces = TaskForceRecordStore.getAll();
    const me = AuthStore.getCurrentUser();
    // 角色派生：静态名册里的所有宣传委员 ∪ 当前登录人（api 形态名册可能不含新委员）
    const propPersonIds = new Set(PEOPLE.filter(p => p.role === 'prop-commissioner').map(p => p.id));
    if (me?.role === 'prop-commissioner' && me.personId) propPersonIds.add(me.personId);
    // 工作组归属：本人被授予该工作组权限（active grant）也算「自己的专班」
    const myWgIds = new Set((mockDB.workgroupGrants || [])
      .filter(g => g.status === 'active' && propPersonIds.has(g.personId))
      .map(g => g.workgroupId));
    return {
      activities: state.activities || [],
      propTf: taskforces.filter(t =>
        propPersonIds.has(t.manager) || propPersonIds.has(t.initiator)
        || (Array.isArray(t.members) && t.members.some(m => propPersonIds.has(m.personId)))
        || (t.workgroupId && myWgIds.has(t.workgroupId))),
    };
  },
  // 2026-09-30 批次 297-2（支书裁「页头只留 1 枚本台主 CTA；跨台通用动作收进全局固定位」）：
  //   「一键汇报」已收进**顶栏全局固定位** ⇒ 本台页头不再挂重复入口。
  // ── 首页跳转落点（支书 2026-08-08 裁定）：宣传无活动/专班专属 tab，由「项目看板」承载（现状即权限），定位高亮卡片
  onNavTarget: (nav, state, shell) => {
    shell.activate('kanban');
    if (nav.tfId || nav.actId) {
      const sel = nav.tfId
        ? `.kanban-card[data-kt="taskforce"][data-ki="${nav.tfId}"]`
        : `.kanban-card[data-kt="activity"][data-ki="${nav.actId}"]`;
      // B1-5 轮询定位：看板数据可能延迟到达，轮询直至卡片出现再定位高亮
      let attempts = 0;
      const tryLocate = () => {
        const target = document.querySelector(sel);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(target);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(tryLocate, 300);
        }
      };
      setTimeout(tryLocate, 150);
    }
    return { tabId: 'kanban' };
  },
  loadOptions: {
    role: 'prop-commissioner',
    storeInits: [() => TaskForceRecordStore.init()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-prop',
    seedTodos,
  },
});
