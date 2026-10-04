// role: [工程师]+[AI]
// 组长工作台能力：tab 清单注册（T-279 M2e）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:leader'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261004h';
import { rolesForPage } from '../core/domain/constants.js?v=20261004h';
import { AuthStore } from '../services/core/auth.js?v=20261004h';
// 组织者兜底放行（2026-09-19 批次 91 · SOP-B-17）：与 core/boot/bootstrap.js 的身份门同一判定源
import { isOrganizerFallbackPage } from '../services/activity/activity.js?v=20261004h';

// 组织者兜底进入本台时的可见面（2026-09-19 批次 91）：
// 「这场事上被指定的人」手上的活＝那两个上传位（含纪检打回后的「待你确认」区），
// 故只呈现「我的职责」里的这两项；本台其余 tab（今天/待办/概况/活动管理/组员进展/知情查看/我的处置）
// 都是**组长身份**的职责，不因「他是某场活动的组织者」而开放——**不放宽任何写权限**。
const ORGANIZER_FALLBACK_TAB_IDS = ['attendance', 'inspection'];
function _isOrganizerFallbackEntry() {
  const meId = AuthStore.getCurrentUser()?.personId;
  if (!meId) return false;
  if (AuthStore.getUserRole(meId) === 'leader') return false; // 本台组长：全量 tab
  return isOrganizerFallbackPage(meId, 'leader.html');
}

// 10 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/leader/）
// tab 私有状态随模块自持；共享只读配置（accent/filteredActivities/导航目标）经 ctx 传入。
registerCapability({
  id: 'leader-workspace',
  name: '组长工作台',
  version: '20260822e',
  scope: ['workspace:leader'],
  requiredRoles: rolesForPage('leader.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => {
    const allTabs = [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（组长台=活动管理 write）
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261004h').then(m => {
      const el = document.getElementById('leader-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'leader', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          const target = tabId === 'activities' ? 'write' : tabId;
          const btn = document.querySelector(`.leader-tab-btn[data-leader-tab="${target}"]`);
          if (btn) btn.click();
        },
      });
    }) },
    // 有待办必见待办（支书 2026-08-10 裁定）：priorityTab 由入口计算，经 renderTabBar 传入
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/leader/todo-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    { id: 'overview', label: '工作概况', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/leader/overview-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    // 活动日历（2026-09-30 批次 310 支书裁定「每个人应该都有这样的活动日历界面」）：与其余台同用
    //   **只读共享页签**（entries/tabs/shared/activity-calendar-tab.js）。
    // 2026-10-04 批次 369（`#10` 单一轴）：它是**人人有的通用面**（与「今天 / 待办 / 工作概况」同类）
    //   ⇒ **组归属由「知情查看」改为「工作台」**；⚠ **注册序也必须落进「工作台」段内**
    //   （页签条按注册序分段渲染 ⇒ 留在原处会多出一个「工作台」分节）。
    { id: 'calendar', label: '活动日历', groupLabel: '工作台', render: () => import('../entries/tabs/shared/activity-calendar-tab.js?v=20261004h').then(m => m.renderContent(document.getElementById('leader-tab-content'))) },
    // 分组「我的职责」= 2026-09-14 裁定按行为性质四组之一；本轮（2026-09-15）五台统一：原「党建」组改名「我的职责」
    // 2026-10-04 批次 371（支书裁「**乙：按范围改名**」）：本台写入面**按范围改名「本组活动」**——
    //   与支书台「活动管理」（**全支部**写入）**同名不同职易混** ⇒ 各按范围命名（支书台保留「活动管理」）。
    //   （同批示：写侧仍是本组范围，**权限一字未改**；实现文件仍是 `entries/tabs/leader/write-tab.js`。）
    { id: 'write', label: '本组活动', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/leader/write-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    // 2026-10-04 批次 369（`#10` 单一轴 · 支书圈**甲**）：原「**考勤上传**」/「**考察上传**」＝**动作轴**
    //   ⇒ **改名「考勤管理」/「考察管理」**（对象轴）——与**纪检台同名同轴**，消除「同域两轴两名」。
    //   ⚠ 「上传」作为**页内动作**保留（表单 / 按钮 / toast 一字未动）。
    { id: 'attendance', label: '考勤管理', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/leader/attendance-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '考察管理', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/leader/inspection-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    // IA-C2 收敛（2026-09-06）：复盘提交入口统一归组织者/深度参与者（成员端「我的复盘」），
    // D8 裁决批二（2026-09-08）：原「复盘状态」tab（只读）删除，并入「组员进展」页（注册 10→9）——
    //   只读复盘状态块由 leader/members-tab.js 内嵌挂载（review-tab.js 改为可嵌入区块导出）。
    // 组员进展（支书 2026-08-10 裁定：全员可见性矩阵落地——组长看本组组员，P-011 知情边界看≠做）
    { id: 'members', label: '组员进展', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/leader/members-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    // 知情查看（支书 2026-09-14 裁定：同质薄壳合并——原「专班查看」+「活动查看」并入本 tab 分段切换；
    //   id 保留 tf-view，免动 ?tab= 深链与支部 config 的 hiddenTabIds/tabOrder 键）
    // 分组「知情查看」= 2026-09-14 裁定按行为性质四组之一（工作台/我的职责/知情查看/制度与答复）
    // 2026-10-04 批次 369（`#10` 单一轴）：**分段集合改由「赋权下游」派生**——组长名下 `work-map` 含
    //   党小组会 / 主题党日 / 共建活动（**均映射到 `activity` 段**）⇒ **只出「活动」段**（支部改派后随之变）。
    { id: 'tf-view', label: '知情查看', groupLabel: '知情查看', render: (ctx) => import('../entries/tabs/leader/tf-view-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    // 本轮（2026-09-15）五台统一：原「反馈」组并入「制度与答复」（与支书台同名），组内以「我的处置」为成员
    { id: 'my-dispatch', label: '我的处置', groupLabel: '制度与答复', render: (ctx) => import('../entries/tabs/leader/my-dispatch-tab.js?v=20261004h').then(m => m.renderContent(ctx)) },
    ];
    // 组织者兜底进入（非本台组长、但被指定为某场活动的组织者）→ 只给那两个上传位
    if (_isOrganizerFallbackEntry()) {
      return allTabs.filter(t => ORGANIZER_FALLBACK_TAB_IDS.includes(t.id));
    }
    return allTabs;
  },
});
