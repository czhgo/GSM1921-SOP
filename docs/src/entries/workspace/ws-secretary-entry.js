// role: [工程师]+[AI]
// ws-secretary-entry.js — 支书工作台入口（T-279 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { getAppState, setState } from '../../core/base/state.js?v=20261001o';
import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261001o';
import { _currentYearMonth } from '../../core/base/utils.js?v=20261001o';
import { loadActivities } from '../../services/activity/activity.js?v=20261001o';
import { BranchService } from '../../services/core/runtime.js?v=20261001o';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261001o';
import { SignupStore } from '../../services/activity/signup.js?v=20261001o';
// T-304 Q3 权限收敛：副作用导入触发支书工作台能力注册（tab 清单，与其余 5 工作台对齐）
import '../../capabilities/secretary-workspace.js?v=20261001o';

await createWorkspaceShell({
  accentRole: 'secretary',
  scope: 'workspace:secretary',
  capId: 'secretary-workspace',
  containerId: 'secretary-content',
  prefix: 'secretary',
  storageKey: 'workflowos_tab_secretary',
  defaultTab: 'today',
  // 角色特有渲染上下文：全局 appState（支书各 tab 依赖）
  renderCtxExtras: (state, ctx) => ({ appState: getAppState(), activities: state.activities || [] }),
  // 空表回退映射省略：与 workspace-shell 缺省逐字一致（收敛 2026-09-02，删除内联副本）
  // ── 首页跳转落点（支书 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  onNavTarget: (nav, state, shell) => {
    if (nav.tfId) {
      // 专班查看（无专班职责≠无知情权）：快照高亮目标
      shell.setHighlight(nav.tfId, `.tfv-card[data-tf-id="${nav.tfId}"]`);
      shell.activate('tf-view');
      return { tabId: 'tf-view', highlightId: nav.tfId };
    }
    // 活动：定位活动管理日历视图 + 直达该活动详情
    const actId = nav.actId;
    const act = actId ? (state.activities || []).find(a => a.id === actId) : null;
    // ── 活动定位深链（?activityId=）按该活动的**实际承载**归位（2026-09-28 支书裁定「修深链兜底」）──
    //   判据只用既有字段（activity.type / activity.scenarioId），不新造字段（DESIGN_SYSTEM §2.9 角色-令牌映射 / §10.2）。
    //   · 支委会（type==='支委会' 或 scenarioId==='branch-committee'）⇒ 落「支委会」tab——该活动的实际承载
    //     是支委会会议（表态/表决/记录决议）；系统通知 committee-vote-progress/-locked 亦以此为落点；
    //   · 其余活动 ⇒ 落「活动管理」（活动自身详情面板）。
    //   原实现无条件 activate('calendar')（D-671 所指「活动定位深链固定落活动管理」）⇒ 支委会类深链
    //     一律落到与之无关的「活动管理」。仅收窄此一处：不改 ?tab= 语义、不改 tab 显示名、不放宽可见性。
    if (act && (act.type === '支委会' || act.scenarioId === 'branch-committee')) {
      shell.activate('committee-meeting'); // 目标 tab 若对该角色不可见，由 tab-bar 的 R6 守卫回退首个可见 tab
      return { tabId: 'committee-meeting' };
    }
    shell.activate('calendar');
    if (actId) {
      // 必须先清 _navTarget 再 setState——setState 同步触发重渲染，若目标未清
      // 会再次进入本分支无限递归（RangeError: Maximum call stack size exceeded）。
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

// ── 批次 317（2026-10-01 · 支书 V-3「功能钮提台顶栏全局固定位」）────────────────────────
//   支书原话：「不仅是 tab，还有一些单纯的功能 button，比如写入活动」。裁定取「甲」⇒ 本台主 CTA
//   「写入活动」由「活动管理 tab 的日历卡头部」**提到顶栏 `.header-actions`**（与「一键汇报」同排），
//   **任何 tab 下都够得着**——不再需要「先切到承载它的 tab、再在卡内找」。
//   两条纪律：① **id 保持 `#ws-sec-write-btn`**（台账 `form-loop-registry` 与真机守卫
//   `click-cost` / `agenda-flow` / `block-entry-guard` 的选择器零改签）；② **党委下钻只读视图不挂**
//   该入口——复用服务层同一份 `isReadonlyBranchDrilldown()`（单一源），且 `openWriteModal()` 内
//   另有写口门兜底。
const [{ mountHeaderCta }, { isReadonlyBranchDrilldown }] = await Promise.all([
  import('../../components/shell/header.js?v=20261001o'),
  import('../../services/core/branch-demo-nav.js?v=20261001o'),
]);
if (!isReadonlyBranchDrilldown()) {
  mountHeaderCta(
    '<button id="ws-sec-write-btn" type="button" class="btn-ghost header-action-btn" aria-haspopup="dialog">写入活动</button>',
    (slot) => {
      slot.querySelector('#ws-sec-write-btn')?.addEventListener('click', () => {
        import('../../entries/tabs/secretary/calendar-tab.js?v=20261001o').then((m) => m.openActivityWriteForm());
      });
    },
  );
}
