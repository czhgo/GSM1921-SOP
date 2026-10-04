// role: [工程师]+[AI]
// 参与者工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:visitor'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261004i';
import { rolesForPage } from '../core/domain/constants.js?v=20261004i';
import { AuthStore } from '../services/core/auth.js?v=20261004i';

// 11 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/visitor/）
// ⚠ 2026-10-04 批次 371：**「活动日历」独立页签已撤**（12 → 11）——日历＝「活动动态」的一个视图；
//   原「知情查看」改名 **「专班动态」**（id 仍 `tf-view`）。
// tab 私有状态随模块自持；共享只读配置（accent/activities/任务专班/授权记录/导航目标）经 ctx 传入。
registerCapability({
  id: 'visitor-workspace',
  name: '成员工作台',
  version: '20260830',
  scope: ['workspace:visitor'],
  requiredRoles: rolesForPage('visitor.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生（participant → visitor.html）
  tabs: () => [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（成员台=活动动态 activities，语义 id 即本台 id）
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261004i').then(m => {
      const el = document.getElementById('visitor-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'visitor', // 待办键对齐本台待办 tab（participant 角色 → visitor 聚合键，todo.js S9 登记）
        onNav: (tabId) => {
          // 'activities' 即本台活动动态 tab id，无需映射
          const btn = document.querySelector(`.visitor-tab-btn[data-visitor-tab="${tabId}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/visitor/todo-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/visitor/overview-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    // 分组「我的职责」= 2026-09-14 裁定按行为性质四组之一；本轮（2026-09-15）五台统一：原「党建」组改名「我的职责」
    // 2026-10-02 批次 351（支书 `D-741`「按这个方案推进 V-3 页签建议序」）：**组内按「第一问 / 节律」重排**——
    //   「最近有什么活动」是成员第一问 ⇒ **活动动态前置**；思想汇报有节律（季度）⇒ **前移到「我的考察」之前**。
    //   （原序：项目分工 · 活动动态 · 考勤概况 · 我的考察 · 思想汇报 · 我的复盘；**组序与条数一律不动**。）
    { id: 'activities', label: '活动动态', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/visitor/activities-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    { id: 'projects', label: '项目分工', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/visitor/projects-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    { id: 'attendance', label: '考勤概况', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/visitor/attendance-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    // 2026-08-30 思想汇报数字化：参与者系统内提交，算法自动归档
    { id: 'thought-report', label: '思想汇报', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/visitor/thought-report-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '我的考察', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/visitor/inspection-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    // T-304 C1 组织者承载面：复盘提交归组织者（组织者/深度参与者在自己工作台提交）
    { id: 'review', label: '我的复盘', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/visitor/review-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    // 2026-10-04 批次 371（支书裁「**活动日历 应该放在 活动动态中 作为一个 视图才对！**」）：
    //   **撤本台独立「活动日历」页签**（本台页签 12 → 11）——日历本就是 `activities`「活动动态」
    //   的**一个视图**（其自带 列表 / 日历 / 查询 三视图）；首页「完整日历 →」改落
    //   `?tab=activities&view=calendar`（`main-entry.js` 的 `data-ws-view`）。
    // 2026-10-04 批次 371（支书裁「**既然只有专班 为什么不叫 专班动态 呢？**」）：原「知情查看」
    //   在本台**只载专班**（其活动一览已由 `activities` 承载）⇒ **改名「专班动态」**（id 仍 `tf-view`，
    //   保住 `?tab=` 深链与支部 config 的 `hiddenTabIds`/`tabOrder` 键）；
    //   ⚠ 「我的产出填报」写口仍在专班详情卡内（原地保留，不平移）。
    { id: 'tf-view', label: '专班动态', groupLabel: '知情查看', render: (ctx) => import('../entries/tabs/visitor/tf-view-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
    // 我的处置（本轮 2026-09-15 新增，支书裁定）：成员台答复入口——id/label 与组织/宣传/纪检/组长四台同名，
    //   同一功能不设两个名字；成员能否查看/答复由 services/governance/issues.js（另一工作流 C）定权限，本处只登记入口。
    { id: 'my-dispatch', label: '我的处置', groupLabel: '制度与答复', render: (ctx) => import('../entries/tabs/visitor/my-dispatch-tab.js?v=20261004i').then(m => m.renderContent(ctx)) },
  ],
});
