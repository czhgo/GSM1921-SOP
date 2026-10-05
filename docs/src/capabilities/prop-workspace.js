// role: [工程师]+[AI]
// 宣传委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:prop'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261005m';
import { rolesForPage, ARCHIVE_FALLBACK_ROLES } from '../core/domain/constants.js?v=20261005m';
import { AuthStore } from '../services/core/auth.js?v=20261005m';

// 9 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/prop/）
// ⚠ 2026-10-04 批次 367（`#10` 单一轴 · 支书裁「周报作为 归档的一个 特例即可」）：**已摘除
//   `weekly`（周报报送）页签**（10 → 9）——降为「档案归档」页内折叠区（实现单一源仍在
//   `entries/tabs/prop/weekly-tab.js`；此处**不得**再注册回来）。
// tab 私有状态随模块自持；共享只读配置（accent/activities/propTf）经 ctx 传入。
registerCapability({
  id: 'prop-workspace',
  name: '宣传委员工作台',
  version: '20260823b',
  scope: ['workspace:prop'],
  requiredRoles: rolesForPage('prop.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => {
    const allTabs = [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（宣传台=项目看板 kanban 活动卡承载）
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261005m').then(m => {
      const el = document.getElementById('prop-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'prop-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'kanban' : tabId;
          const btn = document.querySelector(`.prop-tab-btn[data-prop-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/prop/todo-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/prop/overview-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    // 活动日历（2026-09-30 批次 310 支书裁定「每个人应该都有这样的活动日历界面」）：与其余五台同用
    //   **只读共享页签**（entries/tabs/shared/activity-calendar-tab.js）。
    // 2026-10-04 批次 367（`#10` 单一轴）：它是**人人有的通用面**（与「今天 / 待办 / 工作概况」同类）
    //   ⇒ **组归属由「知情查看」改为「工作台」**（组名与组数一律不变，只改 groupLabel）；
    //   ⚠ **注册序也必须落进「工作台」段内**（页签条按注册序分段渲染 ⇒ 留在原处会多出一个「工作台」分节）。
    { id: 'calendar', label: '活动日历', groupLabel: '工作台', render: () => import('../entries/tabs/shared/activity-calendar-tab.js?v=20261005m').then(m => m.renderContent(document.getElementById('prop-tab-content'))) },
    // 分组「我的职责」= 2026-09-14 裁定按行为性质四组之一；本轮（2026-09-15）五台统一：原「党建」组改名「我的职责」
    { id: 'tasks', label: '宣传任务', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/tasks-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    { id: 'kanban', label: '项目看板', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/kanban-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    // 档案归档（含「周报」折叠区）。2026-10-04 批次 367（`#10` 单一轴）：支书逐字裁
    //   「**周报作为 归档的一个 特例即可！！**」⇒ **原独立「周报报送」页签降为本页页内折叠区**
    //   （页签 **10 → 9**）；实现单一源仍是 `entries/tabs/prop/weekly-tab.js`（挂进本页
    //   `#archive-weekly-host`，**不复制表单**）。同批台账：`help.html §0.1/§2.2`、
    //   `README-server.md §3.2.2`、`form-loop-registry.mjs`（四条 `prop-weekly*` 流程 `tab` 改本页）、
    //   `page-sweep` 门槛、`function-catalog.js`。
    { id: 'archive', label: '档案归档', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/prop/archive-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    // 知情查看（本轮 2026-09-15 新增，支书裁定）：宣传台原无只读知情视图，补一个「知情查看」tab
    //   （只读）——与其余台同名同义，组件单一源 = components/record/insight-view.js；
    //   分组序 工作台→我的职责→知情查看→制度与答复。
    // 2026-10-04 批次 367（`#10` 单一轴 · 支书圈甲档）：**分段集合改由「赋权下游」派生**——宣传委员
    //   名下 `work-map` 无模块 ⇒ 派生为空集 ⇒ 按支书甲档口径**回退只出「活动」段**（「活动」＝全支部
    //   通用知情面；「专班」只给有专班下游的台，如组织台）。判据单一源见 `entries/tabs/prop/tf-view-tab.js`。
    { id: 'tf-view', label: '知情查看', groupLabel: '知情查看', render: (ctx) => import('../entries/tabs/prop/tf-view-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    // 本轮（2026-09-15）五台统一：原「反馈」组并入「制度与答复」（与支书台同名），组内以「我的处置」为成员
    { id: 'my-dispatch', label: '我的处置', groupLabel: '制度与答复', render: (ctx) => import('../entries/tabs/prop/my-dispatch-tab.js?v=20261005m').then(m => m.renderContent(ctx)) },
    ];
    // 归档兜底（A② 2026-09-10 支书裁定）：支书/副支书（archive=Y 兜底权限）进入宣传台时，
    // 仅呈现「档案归档」兜底面——其余 tab 不呈现、不启用，权限不扩大（不新增任何写权限）。
    // coreTab: true = 核心组显式声明（2026-09-14 起核心组不再以显示标签反推），保证归档兜底 tab
    // 不被支部 config.modules 隐藏而白屏（groupLabel 仅作显示分组）。
    const me = AuthStore.getCurrentUser();
    const role = me && (me.role || AuthStore.getUserRole(me.personId));
    if (role && ARCHIVE_FALLBACK_ROLES.includes(role)) {
      return allTabs.filter(t => t.id === 'archive').map(t => ({ ...t, groupLabel: '工作台', coreTab: true }));
    }
    return allTabs;
  },
});
