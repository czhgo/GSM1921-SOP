// role: [工程师]+[AI]
// 组织委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:org'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260903b';
import { rolesForPage } from '../../core/constants.js?v=20260903b';

// 8 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/org/）
// tab 私有状态随模块自持；共享只读配置（accent/taskforce 分类/activities/导航目标）经 ctx 传入。
registerCapability({
  id: 'org-workspace',
  name: '组织委员工作台',
  version: '20260823d',
  scope: ['workspace:org'],
  requiredRoles: rolesForPage('org.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => [
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/org/todo-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/org/overview-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '考察上传', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/inspection-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    { id: 'taskforce', label: '专班管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/taskforce-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    { id: 'talent', label: '人才库', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/talent-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    { id: 'development', label: '发展数据', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/development-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    // 活动查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增；组织无活动 tab 由本组件承载）
    // 排序：按工作流节奏「看→做→查→收」，知情查看置于职责操作后、反馈前（书记 2026-08-11 裁定）
    { id: 'activity-view', label: '活动查看', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/org/activity-view-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
    { id: 'my-dispatch', label: '我的处置', groupLabel: '反馈', render: (ctx) => import('../../entries/tabs/org/my-dispatch-tab.js?v=20260903b').then(m => m.renderContent(ctx)) },
  ],
});
