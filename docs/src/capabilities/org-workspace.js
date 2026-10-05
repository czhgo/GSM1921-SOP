// role: [工程师]+[AI]
// 组织委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:org'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261005b';
import { rolesForPage } from '../core/domain/constants.js?v=20261005b';
import { AuthStore } from '../services/core/auth.js?v=20261005b';

// 12 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/org/）
// ⚠ 2026-10-01 批次 321（支书 V-10 取「乙：整页并入人才库」）：**已摘除 `development`（发展数据）页签**
//   （13 → 12）——其「活动参与汇总」卡并入 `talent`（人才库）；阶段推进的写入位改**个人总表**。
// tab 私有状态随模块自持；共享只读配置（accent/taskforce 分类/activities/导航目标）经 ctx 传入。
registerCapability({
  id: 'org-workspace',
  name: '组织委员工作台',
  version: '20260906a',
  scope: ['workspace:org'],
  requiredRoles: rolesForPage('org.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => ORG_WORKSPACE_TAB_DECLS,
});

// 组织台页签声明**单一源**（2026-10-05 批次 379 · `D-771`）：「归属可转移」迁入时取**同一份声明**
//   （勿另写一份 def、勿复制 render）——跨台取用须走本常量。
export const ORG_WORKSPACE_TAB_DECLS = [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（组织台=知情查看 tf-view；无承载台为空操作）
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261005b').then(m => {
      const el = document.getElementById('org-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'org-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'tf-view' : tabId;
          const btn = document.querySelector(`.org-tab-btn[data-org-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/org/todo-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/org/overview-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    // 分组「我的职责」= 2026-09-14 裁定按行为性质四组之一（工作台/我的职责/知情查看/制度与答复）；
    //   本轮（2026-09-15）五台统一：原「党建」组改名「我的职责」（与支书台同名，组名不再按业务域分）。
    // 2026-10-02 批次 351（支书 `D-741`「按这个方案推进 V-3 页签建议序」）：**组内按「维护主次」重排**——
    //   支书令「**考察就是维护人才库的过程**」⇒ **名册 / 人才库＝长期维护主表前置**，思想汇报为随之的登记动作。
    // 2026-10-03 批次 366（`#10` 单一轴 · 甲档）：**原独立「考察上传」页签降为「人才库」页内动作位**
    //   （依据同一句支书原话「**考察就是维护人才库的过程！！**」）⇒ **本台页签 12 → 11**；
    //   实现单一源仍是 `entries/tabs/org/inspection-tab.js`（挂进 `talent-tab.js` 的 `#talent-insp-host`，
    //   **不复制表单**）；同批台账：`help.html §0.1/§2.2`、`README-server.md §3.2.2`、
    //   `form-loop-registry.mjs`（`org-inspection` 流程 `tab` 改「人才库」）、`inspection-loop-e2e`、`page-sweep` 门槛。
    // 活动日历（2026-09-30 批次 310 支书裁定「每个人应该都有这样的活动日历界面，可以从桌面的
    //   部分日历 跳转过来」）：与其余四台同用**只读共享页签**（entries/tabs/shared/）——
    //   此前「活动日历」只长在支书台。
    // 2026-10-03 批次 366（`#10` 单一轴 · 甲档）：它是**人人有的通用面**（与「今天 / 待办 / 工作概况」同类）
    //   ⇒ **组归属由「知情查看」改为「工作台」**（组名与组数一律不变，只改 groupLabel）；
    //   ⚠ **注册序也必须落进「工作台」段内**（页签条按注册序分段渲染 ⇒ 留在原处会多出一个「工作台」分节）。
    { id: 'calendar', label: '活动日历', groupLabel: '工作台', render: () => import('../entries/tabs/shared/activity-calendar-tab.js?v=20261005b').then(m => m.renderContent(document.getElementById('org-tab-content'))) },
    // 成员名册（立项⑥ B波 2026-09-06：新增/行内编辑/删除 双形态持久；人才库=发展观察视图=只读画像，分工不重复建设）
    { id: 'roster', label: '成员名册', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/org/roster-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    { id: 'talent', label: '人才库', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/org/talent-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    // D8 裁决批二（2026-09-08）：思想汇报（初阅为组织委员高频每日动作）紧随成员发展域族（名册/人才库）之后，
    //   初阅高频前置（表 C 调序裁定）。
    { id: 'thought-review', label: '思想汇报', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/org/thought-review-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    { id: 'taskforce', label: '专班管理', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/org/taskforce-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    // 成员流动（2026-09-28 批次 220 · R10：从「成员名册」拆出的独立 tab）——判据＝一 tab 一问：
    //   名册答「支部在册成员有谁、档案状态如何」；本 tab 答「成员怎么变（流入 / 流出）」——原二者同装
    //   「成员名册」属两个语义域混装（判据「一 tab 一问」；原 MODULE_UI_DESIGN.md §四 规划稿已清出，出处见 .ctx/logs/2026-09-DECISION_LOG.md）。承原「成员流动」面板
    //   全部功能（登记流入 / 登记流出 / 对账行 / 台账表 / 撤销）；行内「移出」仍在名册 tab。
    { id: 'member-flow', label: '成员流动', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/org/member-flow-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    // ⚠ 原 `development`（发展数据）页签已于 2026-10-01 批次 321 摘除（支书 V-10 取「乙：整页并入人才库」）
    //   —— 其「活动参与汇总」并入上方 `talent`；阶段推进写入位改**个人总表**。此处**不得**再注册回来。
    // 知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「活动查看（只读）」+「专班查看」并入本 tab 分段切换；
    //   id 由 activity-view 改为 tf-view（三台统一，深链改走 ?tab=tf-view））
    // 分组「知情查看」= 2026-09-14 裁定按行为性质四组之一（工作台/我的职责/知情查看/制度与答复）
    // 排序：按工作流节奏「看→做→查→收」，知情查看置于职责操作后、制度与答复前（支书 2026-08-11 裁定）
    // 知情查看（支书 2026-09-14 裁定：同质薄壳合并；2026-10-03 批次 366：**分段集合由「赋权下游」派生**
    //   ⇒ 组织委员只出「专班」段；判据单一源见 `core/domain/work-map.js::downstreamViewSegments`）
    { id: 'tf-view', label: '知情查看', groupLabel: '知情查看', render: (ctx) => import('../entries/tabs/org/tf-view-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
    // 本轮（2026-09-15）五台统一：原「反馈」组并入「制度与答复」（与支书台同名）；
    //   组内以「我的处置」为成员，替代原独立「反馈」组（同功能不再两名）。
    { id: 'my-dispatch', label: '我的处置', groupLabel: '制度与答复', render: (ctx) => import('../entries/tabs/org/my-dispatch-tab.js?v=20261005b').then(m => m.renderContent(ctx)) },
];
