// role: [工程师]+[AI]
// 纪检委员工作台能力：tab 清单注册（T-279 M3，照 M2 样板 leader-workspace）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:disc'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261025b';
import { rolesForPage } from '../core/domain/constants.js?v=20261025b';
import { AuthStore } from '../services/core/auth.js?v=20261025b';

// 6 个 tab 清单：render 为懒加载动态 import（相对本模块解析到 entries/tabs/disc/）
// ⚠ 2026-10-25 IA 62→45（8 → 6）：`calendar`（→ 工作概况页内折叠卡）、`my-dispatch`（→ 待办「我经办的反馈」）
//   **两个页签已删，不得再注册回来**；旧深链由壳 `_legacyTabAliases` 承接。
// tab 私有状态随模块自持；共享只读配置（accent/activities/导航目标）经 ctx 传入。
registerCapability({
  id: 'disc-workspace',
  name: '纪检委员工作台',
  version: '20260823',
  scope: ['workspace:disc'],
  requiredRoles: rolesForPage('disc.html'), // T-2026-09-011 R2：由 constants ROLE_PAGE_MAP 派生
  tabs: () => DISC_WORKSPACE_TAB_DECLS,
});

// 纪检台页签声明**单一源**（2026-10-05 批次 379 · `D-771`）：「归属可转移」迁入时取**同一份声明**
//   （勿另写一份 def、勿复制 render）——跨台取用须走本常量。
export const DISC_WORKSPACE_TAB_DECLS = [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（纪检台=活动日历 calendar；
    //   2026-10-18 繁专项 Top 10：原落考勤管理 attendance，改为落活动日历）
    { id: 'today', label: '今天', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261025b').then(m => {
      const el = document.getElementById('disc-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'disc-commissioner', // 待办键对齐本台待办 tab
        onNav: (tabId) => {
          // 2026-10-25 IA 62→45：活动日历页签已降为工作概况页内卡 ⇒ 会议「全部」落 overview + 展开日历卡。
          const target = tabId === 'activities' ? 'overview' : tabId;
          const btn = document.querySelector(`.disc-tab-btn[data-disc-tab="${target}"]`);
          if (btn) btn.click();
          if (tabId === 'activities') setTimeout(() => document.dispatchEvent(new CustomEvent('ws:open-calendar')), 300);
        },
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/disc/todo-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 工作概况（支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览 + 条线数据注入）
    { id: 'overview', label: '工作概况', groupLabel: '总览', coreTab: true, render: (ctx) => import('../entries/tabs/disc/overview-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 活动日历（2026-10-25 IA 62→45）：页签已删——共享只读日历降为「工作概况」页内折叠卡
    //   （`disc/overview-tab.js` 挂 shared 卡形态）；旧 `?tab=calendar` → `overview&section=calendar`。
    // 我的处置（2026-10-25 IA 62→45）：页签已删——并入「待办」页「我经办的反馈」；旧 `?tab=my-dispatch` → `todo&filter=dispatch`。
    // 分组「我的职责」= 2026-09-14 裁定按行为性质四组之一；本轮（2026-09-15）五台统一：原「党建」组改名「我的职责」
    { id: 'attendance', label: '考勤管理', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/disc/attendance-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 2026-10-04 批次 368（`#10` 单一轴 · 支书圈**甲**）：原名「**活动监督复盘**」＝**动作（监督）＋ 对象（复盘）混轴**
    //   ⇒ **改名「复盘」**（对象轴；与同组「考勤管理 / 考察管理」同构）。页内四块（流程监督 / 复盘监督 /
    //   经验沉淀督促清单 / 已沉淀清单）一字未动；实现文件仍是 `entries/tabs/disc/review-tab.js`。
    { id: 'review', label: '复盘', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/disc/review-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    { id: 'inspection', label: '考察管理', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/disc/inspection-tab.js?v=20261025b').then(m => m.renderContent(ctx)) },
    // 2026-10-20 批次 489（IA-A01 裁定）：**删除「知情查看」页签**——纪检名下的知情查看长期是
    //   稳定空壳（`downstreamViewSegments` 派生为空集）；专班知情改由 `taskforce.html?id=` 承载，
    //   活动知情由「活动日历」承载 ⇒ 本台不再保留第九个页签（9 → 8）。旧深链别名由壳统一处理。
];
