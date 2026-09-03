// role: [工程师]+[AI]
// modules/capabilities/components.js — 共享组件能力注册（M6 组件能力化，2026-08-30）
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四（能力注册表）
// 价值：组件清单可查（getCapabilities({scope:'component'})）+ 组件可作为能力 deps 声明；
//       消费点接入（从清单动态发现组件）按真实场景逐步启用，避免大面积 import 改造的回归风险。
// 自注册模式：import 本模块即触发注册（与 data-source/sop-scenarios 一致）。

import { registerCapability } from '../../core/registry.js?v=20260903b';

// 待办列表组件（todo-list）：多工作台待办 tab 共享
registerCapability({
  id: 'component:todo-list',
  name: '待办列表组件',
  version: '20260830a',
  scope: ['component'],
  requiredRoles: null,
  env: null,
  deps: ['todo', 'state'],
});

// 日历组件（calendar）：首页/书记/组长等日历视图共享
registerCapability({
  id: 'component:calendar',
  name: '日历组件',
  version: '20260830a',
  scope: ['component'],
  requiredRoles: null,
  env: null,
  deps: ['activity', 'constants'],
});

// 自定义下拉组件（custom-select）：全站表单下拉增强共享
registerCapability({
  id: 'component:custom-select',
  name: '自定义下拉组件',
  version: '20260830a',
  scope: ['component'],
  requiredRoles: null,
  env: null,
  deps: ['styles'],
});
