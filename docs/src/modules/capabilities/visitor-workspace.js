// role: [工程师]+[AI]
// 参与者工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:visitor'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260827c';

// 6 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/visitor/）
// tab 私有状态随模块自持；共享只读配置（accent/activities/任务专班/授权记录/导航目标）经 ctx 传入。
registerCapability({
  id: 'visitor-workspace',
  name: '成员工作台',
  version: '20260823',
  scope: ['workspace:visitor'],
  tabs: () => [
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/visitor/todo-tab.js?v=20260827c').then(m => m.renderContent(ctx)) },
    // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/visitor/overview-tab.js?v=20260827c').then(m => m.renderContent(ctx)) },
    { id: 'projects', label: '项目分工', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/projects-tab.js?v=20260827c').then(m => m.renderContent(ctx)) },
    { id: 'activities', label: '活动动态', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/activities-tab.js?v=20260827c').then(m => m.renderContent(ctx)) },
    { id: 'attendance', label: '考勤概况', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/attendance-tab.js?v=20260827c').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '我的考察', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/inspection-tab.js?v=20260827c').then(m => m.renderContent(ctx)) },
  ],
});
