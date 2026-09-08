// role: [工程师]+[AI]
// 书记工作台能力：tab 清单注册（T-304 权限收敛 Q3，与其余 5 工作台对齐）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:secretary'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// requiredRoles：书记/副书记共用书记工作台（ROLE_PAGE_MAP secretary → secretary.html）
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260908c';
import { rolesForPage } from '../../core/constants.js?v=20260908c';
import { AuthStore } from '../../services/auth.js?v=20260908c';

registerCapability({
  id: 'secretary-workspace',
  name: '书记工作台',
  version: '20260829q',
  scope: ['workspace:secretary'],
  requiredRoles: rolesForPage('secretary.html'),
  tabs: () => [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（书记台=活动管理 calendar；无承载台为空操作）
    { id: 'today', label: '今天', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/today/today-tab.js?v=20260908c').then(m => {
      const el = document.getElementById('secretary-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'secretary', // 待办键对齐本台待办 tab（副书记共台亦按 secretary 待办聚合）
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'calendar' : tabId;
          const btn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/secretary/todo-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    { id: 'overview', label: '全局概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/secretary/overview-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    { id: 'calendar', label: '活动管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/calendar-tab.js?v=20260908c').then(m => m.renderContent(ctx?.appState)) },
    // L4 支部工作地图（2026-09-03 书记裁决放行）：支部分工 · 平铺/按人双视图（书记/副书记共用书记台）
    { id: 'work-map', label: '支部分工', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/work-map-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    { id: 'assign', label: '赋权管理', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/assign-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    // U2（2026-09-07）：支部配置入口——以本人所属支部内嵌换组织向导（embed），解决向导对书记/副书记层纯网页不可达；
    // 共享渲染组件 org-setup-wizard.js（党委台 party-config / wizard.html 同源）；角色门在 tab 内部（仅书记/副书记）。
    { id: 'branch-config', label: '支部配置', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/branch-config-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    { id: 'notification', label: '通知发布', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/notification-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    // 专班查看（知情权：无职责≠无知情权，书记 2026-08-08 裁定新增）
    // B1-5：高亮目标由导航路径的 3s 定时器清除（不再 onLocated 即时清除，补渲染可重新应用高亮）
    { id: 'tf-view', label: '专班查看', groupLabel: '党建', render: (ctx) => import('../../components/taskforce-view.js?v=20260908c').then(m => { const el = document.getElementById('secretary-tab-content'); if (el) m.renderTaskforceView(el, { highlightId: ctx?.highlightTfId || null }); }) },
    // 党小组进展（2026-09-08 D8 书记新增裁）：书记/副书记跨组只读掌握各党小组进展（知情≠操作，专班查看旁
    //   知情查看域）；组内待答复汇报行「请组长关注」复用 requestReport 请求通道直达组长，书记不代组长答复
    { id: 'group-progress', label: '党小组进展', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/secretary/group-progress-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    { id: 'feedback', label: '反馈管理', groupLabel: '反馈', render: (ctx) => import('../../entries/tabs/secretary/feedback-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：支部关键事项上报党委（发展节点/活动报备；党委批驳结论回传本页）
    { id: 'report-up', label: '上报党委', groupLabel: '对接党委', render: (ctx) => import('../../entries/tabs/secretary/report-up-tab.js?v=20260908c').then(m => m.renderContent(ctx)) },
  ],
});
