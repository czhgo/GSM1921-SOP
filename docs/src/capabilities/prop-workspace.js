// role: [工程师]+[AI]
// 宣传委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:prop'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261024d';
import { rolesForPage } from '../core/domain/constants.js?v=20261024d';
import { AuthStore } from '../services/core/auth.js?v=20261024d';

// 8 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/prop/）
// ⚠ `weekly`（周报报送）**不得再注册**：它已降为「档案归档」页内折叠区（实现在 `entries/tabs/prop/weekly-tab.js`）。
// tab 私有状态随模块自持；共享只读配置（accent/activities/propTf）经 ctx 传入。
registerCapability({
  id: 'prop-workspace',
  name: '宣传委员工作台',
  version: '20260823b',
  scope: ['workspace:prop'],
  requiredRoles: rolesForPage('prop.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => {
    const allTabs = [
    // 「今天」置首；到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳
    // activity.html；会议「全部」→ onNav('activities')，下方映射到本台活动日历 calendar。
    { id: 'today', label: '今天', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261024d').then(m => {
      const el = document.getElementById('prop-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'prop-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'calendar' : tabId;
          const btn = document.querySelector(`.prop-tab-btn[data-prop-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/prop/todo-tab.js?v=20261024d').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/prop/overview-tab.js?v=20261024d').then(m => m.renderContent(ctx)) },
    // 活动日历：与其余各台同用**只读共享页签**（entries/tabs/shared/activity-calendar-tab.js）。
    // 组归属＝「工作台」，且**注册序也必须落进「工作台」段内**（页签条按注册序分段渲染）。
    { id: 'calendar', label: '活动日历', groupLabel: '总览', render: () => import('../entries/tabs/shared/activity-calendar-tab.js?v=20261024d').then(m => m.renderContent(document.getElementById('prop-tab-content'))) },
    // 分组「制度与答复」＝各台同名组，组内以「我的处置」为成员；整组排在「工作台」之后、「我的职责」之前。
    { id: 'my-dispatch', label: '我的处置', groupLabel: '制度与答复', render: (ctx) => import('../entries/tabs/prop/my-dispatch-tab.js?v=20261024d').then(m => m.renderContent(ctx)) },
    // 分组「我的职责」＝按行为性质四组之一
    { id: 'tasks', label: '宣传任务', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/tasks-tab.js?v=20261024d').then(m => m.renderContent(ctx)) },
    { id: 'kanban', label: '项目看板', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/kanban-tab.js?v=20261024d').then(m => m.renderContent(ctx)) },
    // 档案归档（含「周报」折叠区）：周报降为本页页内折叠区，实现单一源仍是
    //   `entries/tabs/prop/weekly-tab.js`（挂进 `#archive-weekly-host`，**不复制表单**）。
    { id: 'archive', label: '档案归档', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/archive-tab.js?v=20261024d').then(m => m.renderContent(ctx)) },
    // 本台不保留「知情查看」页签（宣传关心的专班/项目进展由「项目看板」承载）；
    //   旧深链 `?tab=tf-view` 由壳别名落 `kanban`（别名在 workspace-shell.js，单点维护）。
    ];
    // 本台页签恒为全量（仅宣传委员可达；代归档由支书台待办浮窗直执）。
    return allTabs;
  },
});
