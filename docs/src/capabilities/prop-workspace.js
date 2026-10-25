// role: [工程师]+[AI]
// 宣传委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:prop'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261025b';
import { rolesForPage } from '../core/domain/constants.js?v=20261025b';
import { AuthStore } from '../services/core/auth.js?v=20261025b';

// 5 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/prop/）
// ⚠ `weekly`（周报报送）**不得再注册**：它已降为「档案归档」页内折叠区（实现在 `entries/tabs/prop/weekly-tab.js`）。
// ⚠ 2026-10-25 IA 62→45（8 → 5）：`calendar`（→ 工作概况页内折叠卡）、`my-dispatch`（→ 待办「我经办的反馈」）、
//   `tasks`（→ 项目看板「宣传任务」泳道）**三个页签已删，不得再注册回来**；旧深链由壳 `_legacyTabAliases` 承接。
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
    { id: 'today', label: '今天', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261025b').then(m => {
      const el = document.getElementById('prop-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'prop-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          // 2026-10-25 IA 62→45：活动日历页签已降为工作概况页内卡 ⇒ 会议「全部」落 overview + 展开日历卡。
          const target = tabId === 'activities' ? 'overview' : tabId;
          const btn = document.querySelector(`.prop-tab-btn[data-prop-tab="${target}"]`);
          if (btn) btn.click();
          if (tabId === 'activities') setTimeout(() => document.dispatchEvent(new CustomEvent('ws:open-calendar')), 300);
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/prop/todo-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/prop/overview-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 活动日历（2026-10-25 IA 62→45）：页签已删——共享只读日历降为「工作概况」页内折叠卡
    //   （`prop/overview-tab.js` 挂 shared/activity-calendar-tab 的卡形态）；旧 `?tab=calendar` → `overview&section=calendar`。
    // 我的处置（2026-10-25 IA 62→45）：页签已删——并入「待办」页「我经办的反馈」；旧 `?tab=my-dispatch` → `todo&filter=dispatch`。
    // 分组「我的职责」＝按行为性质四组之一
    // 宣传任务（2026-10-25 IA 62→45）：页签已删——并入「项目看板」页「宣传任务」泳道
    //   （复用 `prop/tasks-tab.js::renderBoard`，不复制列表）；旧 `?tab=tasks` → `kanban&lane=tasks`。
    { id: 'kanban', label: '项目看板', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/kanban-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 档案归档（含「周报」折叠区）：周报降为本页页内折叠区，实现单一源仍是
    //   `entries/tabs/prop/weekly-tab.js`（挂进 `#archive-weekly-host`，**不复制表单**）。
    { id: 'archive', label: '档案归档', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/archive-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 本台不保留「知情查看」页签（宣传关心的专班/项目进展由「项目看板」承载）；
    //   旧深链 `?tab=tf-view` 由壳别名落 `kanban`（别名在 workspace-shell.js，单点维护）。
    ];
    // 本台页签恒为全量（仅宣传委员可达；代归档由支书台待办浮窗直执）。
    return allTabs;
  },
});
