// role: [工程师]+[AI]
// 书记工作台能力：tab 清单注册（T-304 权限收敛 Q3，与其余 5 工作台对齐）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:secretary'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// requiredRoles：书记/副书记共用书记工作台（ROLE_PAGE_MAP secretary → secretary.html）
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260901g';

registerCapability({
  id: 'secretary-workspace',
  name: '书记工作台',
  version: '20260829q',
  scope: ['workspace:secretary'],
  requiredRoles: ['secretary', 'deputy-secretary'],
  tabs: () => [
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/secretary/todo-tab.js?v=20260901g').then(m => m.renderContent(ctx)) },
    { id: 'overview', label: '全局概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/secretary/overview-tab.js?v=20260901g').then(m => m.renderContent(ctx)) },
    { id: 'calendar', label: '活动管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/calendar-tab.js?v=20260901g').then(m => m.renderContent(ctx?.appState)) },
    { id: 'assign', label: '赋权管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/assign-tab.js?v=20260901g').then(m => m.renderContent(ctx)) },
    { id: 'notification', label: '通知发布', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/notification-tab.js?v=20260901g').then(m => m.renderContent(ctx)) },
    // 专班查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增）
    // B1-5：高亮目标由导航路径的 3s 定时器清除（不再 onLocated 即时清除，补渲染可重新应用高亮）
    { id: 'tf-view', label: '专班查看', groupLabel: '党建', render: (ctx) => import('../../components/taskforce-view.js?v=20260901g').then(m => { const el = document.getElementById('secretary-tab-content'); if (el) m.renderTaskforceView(el, { highlightId: ctx?.highlightTfId || null }); }) },
    { id: 'feedback', label: '反馈管理', groupLabel: '反馈', render: (ctx) => import('../../entries/tabs/secretary/feedback-tab.js?v=20260901g').then(m => m.renderContent(ctx)) },
  ],
});
