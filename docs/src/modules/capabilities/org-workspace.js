// role: [工程师]+[AI]
// 组织委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:org'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260903c';
import { rolesForPage } from '../../core/constants.js?v=20260903c';
import { AuthStore } from '../../services/auth.js?v=20260903c';

// 10 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/org/）
// tab 私有状态随模块自持；共享只读配置（accent/taskforce 分类/activities/导航目标）经 ctx 传入。
registerCapability({
  id: 'org-workspace',
  name: '组织委员工作台',
  version: '20260906a',
  scope: ['workspace:org'],
  requiredRoles: rolesForPage('org.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（组织台=活动查看 activity-view；无承载台为空操作）
    { id: 'today', label: '今天', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/today/today-tab.js?v=20260906h').then(m => {
      const el = document.getElementById('org-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'org-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'activity-view' : tabId;
          const btn = document.querySelector(`.org-tab-btn[data-org-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/org/todo-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/org/overview-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '考察上传', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/inspection-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'taskforce', label: '专班管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/taskforce-tab.js?v=20260906d').then(m => m.renderContent(ctx)) },
    // 成员名册（立项⑥ B波 2026-09-06：新增/行内编辑/删除 双形态持久；人才库为考察画像视图，分工不重复建设）
    { id: 'roster', label: '成员名册', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/roster-tab.js?v=20260906e').then(m => m.renderContent(ctx)) },
    { id: 'talent', label: '人才库', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/talent-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'development', label: '发展数据', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/development-tab.js?v=20260906h').then(m => m.renderContent(ctx)) },
    // R6-2 把关式初阅（2026-09-07 书记定案）：思想汇报通过才正式归档、退回附意见（提交者可见并修改重交）；
    // 初阅收敛本 tab 单入口——development「思想汇报」只读展开保持不动（不加操作，避免两处入口）。
    { id: 'thought-review', label: '思想汇报', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/thought-review-tab.js?v=20260906h').then(m => m.renderContent(ctx)) },
    // 活动查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增；组织无活动 tab 由本组件承载）
    // 排序：按工作流节奏「看→做→查→收」，知情查看置于职责操作后、反馈前（书记 2026-08-11 裁定）
    { id: 'activity-view', label: '活动查看', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/activity-view-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'my-dispatch', label: '我的处置', groupLabel: '反馈', render: (ctx) => import('../../entries/tabs/org/my-dispatch-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
  ],
});
