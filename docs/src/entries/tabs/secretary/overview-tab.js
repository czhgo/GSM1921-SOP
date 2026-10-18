// role: [工程师]+[AI]
// entries/tabs/secretary/overview-tab.js — 支书工作台·全局概况 tab（懒加载模块）
// 2026-10-18 工作台密度与组件重组 Task 7：支书概况并入六台统一三层骨架
//（结论带 / 条线表 / 待我处理），渲染唯一源 = components/governance/work-overview.js。
// 原「汇报 / 卡点 / 进度」三卡与按人视图、书记工作队列随本次统一骨架下线；
// 待办定位、活动/专班只读详情、文件外发确认、「去我的处置」等既有下钻由共享渲染保留。

import { AuthStore } from '../../../services/core/auth.js?v=20261018h';
import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261018h';

const OVERVIEW_TAB_HTML = `
  <div id="secretary-overview-content"></div>
`;

/** 渲染全局概况 tab（六台共用同一骨架） */
export async function renderContent(ctx = {}) {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return null;
  if (tc.dataset.currentTab !== 'overview') {
    tc.innerHTML = OVERVIEW_TAB_HTML;
    tc.dataset.currentTab = 'overview';
  }
  const container = document.getElementById('secretary-overview-content');
  if (!container) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p1';
  return renderWorkOverview(container, {
    role: 'secretary',
    personId,
    accent: ctx.accent,
    prefix: 'secretary',
  });
}
