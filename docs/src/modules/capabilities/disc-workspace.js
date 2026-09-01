// role: [工程师]+[AI]
// 纪检委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:disc'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260901f';

// 9 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/disc/）
// tab 私有状态随模块自持；共享只读配置（accent/activities/导航目标）经 ctx 传入。
registerCapability({
  id: 'disc-workspace',
  name: '纪检委员工作台',
  version: '20260823',
  scope: ['workspace:disc'],
  requiredRoles: ['disc-commissioner'], // T-304 Q3 权限收敛：与 auth ROLE_PAGE_MAP 对齐
  tabs: () => [
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/disc/todo-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/disc/overview-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    { id: 'attendance', label: '考勤管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/disc/attendance-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    { id: 'review', label: '活动监督复盘', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/disc/review-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '考察管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/disc/inspection-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    { id: 'makeup', label: '补课制度', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/disc/makeup-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    { id: 'mailbox', label: '公邮管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/disc/mailbox-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    // 专班查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增）
    { id: 'tf-view', label: '专班查看', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/disc/tf-view-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
    { id: 'my-dispatch', label: '我的处置', groupLabel: '反馈', render: (ctx) => import('../../entries/tabs/disc/my-dispatch-tab.js?v=20260901f').then(m => m.renderContent(ctx)) },
  ],
});
