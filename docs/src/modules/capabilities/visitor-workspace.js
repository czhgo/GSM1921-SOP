// role: [工程师]+[AI]
// 参与者工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:visitor'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260903c';
import { rolesForPage } from '../../core/constants.js?v=20260903c';
import { AuthStore } from '../../services/auth.js?v=20260903c';

// 6 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/visitor/）
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
    { id: 'today', label: '今天', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/today/today-tab.js?v=20260907a').then(m => {
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
    { id: 'todo', label: '待办', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/visitor/todo-tab.js?v=20260906j').then(m => m.renderContent(ctx)) },
    // 工作概况（书记 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，参与者仅自我聚合）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', render: (ctx) => import('../../entries/tabs/visitor/overview-tab.js?v=20260907a').then(m => m.renderContent(ctx)) },
    { id: 'projects', label: '项目分工', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/projects-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'activities', label: '活动动态', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/activities-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'attendance', label: '考勤概况', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/attendance-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '我的考察', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/inspection-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
    // 2026-08-30 思想汇报数字化：参与者系统内提交，算法自动归档
    { id: 'thought-report', label: '思想汇报', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/thought-report-tab.js?v=20260906h').then(m => m.renderContent(ctx)) },
    // T-304 C1 组织者承载面：复盘提交归组织者（组织者/深度参与者在自己工作台提交）
    { id: 'review', label: '我的复盘', groupLabel: '党建', render: (ctx) => import('../../entries/tabs/visitor/review-tab.js?v=20260903c').then(m => m.renderContent(ctx)) },
  ],
});
