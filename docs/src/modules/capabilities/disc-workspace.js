// role: [工程师]+[AI]
// 纪检委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:disc'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../../core/registry.js?v=20260921f';
import { rolesForPage } from '../../core/constants.js?v=20260921f';
import { AuthStore } from '../../services/auth.js?v=20260921f';

// 8 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/disc/）
// tab 私有状态随模块自持；共享只读配置（accent/activities/导航目标）经 ctx 传入。
registerCapability({
  id: 'disc-workspace',
  name: '纪检委员工作台',
  version: '20260823',
  scope: ['workspace:disc'],
  requiredRoles: rolesForPage('disc.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（纪检台=考勤管理 attendance）
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../../entries/tabs/today/today-tab.js?v=20260921f').then(m => {
      const el = document.getElementById('disc-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'disc-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'attendance' : tabId;
          const btn = document.querySelector(`.disc-tab-btn[data-disc-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../../entries/tabs/disc/todo-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../../entries/tabs/disc/overview-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
    // 分组「我的职责」= 2026-09-14 裁定按行为性质四组之一；本轮（2026-09-15）五台统一：原「党建」组改名「我的职责」
    { id: 'attendance', label: '考勤管理', groupLabel: '我的职责', render: (ctx) => import('../../entries/tabs/disc/attendance-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
    { id: 'review', label: '活动监督复盘', groupLabel: '我的职责', render: (ctx) => import('../../entries/tabs/disc/review-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '考察管理', groupLabel: '我的职责', render: (ctx) => import('../../entries/tabs/disc/inspection-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
    // 知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」+「活动查看」并入本 tab 分段切换；
    //   id 保留 tf-view，免动 ?tab= 深链与支部 config 的 hiddenTabIds/tabOrder 键）
    // 分组「知情查看」= 2026-09-14 裁定按行为性质四组之一（工作台/我的职责/知情查看/制度与答复）
    // 本轮（2026-09-15）组序统一为 工作台 → 我的职责 → 知情查看 → 制度与答复
    //   （分组显示序由组名首次出现位置决定）。
    { id: 'tf-view', label: '知情查看', groupLabel: '知情查看', render: (ctx) => import('../../entries/tabs/disc/tf-view-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
    // 本轮（2026-09-15）五台统一：原「反馈」组并入「制度与答复」（与支书台同名），组内以「我的处置」为成员
    { id: 'my-dispatch', label: '我的处置', groupLabel: '制度与答复', render: (ctx) => import('../../entries/tabs/disc/my-dispatch-tab.js?v=20260921f').then(m => m.renderContent(ctx)) },
  ],
});
