// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/session/workspace-nav.js — 工作台页签统一导航（2026-11-01 批次 524 · #7）
//
//  背景：各台待办曾用 `<role>-tab-btn[data-<role>-tab="..."]` 直接点按钮切页，类名/属性名
//  逐台复制；硬编码选择器一改页签名就静默失效。
//  现在：页签按钮统一带 `data-ws-tab-btn="<id>"`（tab-bar 单一处产出），导航只认这个属性；
//  需要定位目标项时，先写 PendingTarget，再由目标页签 render 后消费（不新增第二套深链）。
// ════════════════════════════════════════════════════════════════

import { PendingTarget } from './pending-target.js?v=20261102b';

/**
 * 切到当前工作台的指定页签。
 * @param {string} tabId 目标页签 id（须为当前工作台已注册的 tab）
 * @param {{kind?:string, id?:string}} [target] 目标项（可选；写入 PendingTarget 供目标页消费）
 * @returns {boolean} 是否找到并点击了页签按钮
 */
export function goToWorkspaceTab(tabId, target) {
  if (!tabId) return false;
  if (target) PendingTarget.set({ tab: tabId, ...target });
  const btn = document.querySelector(`[data-ws-tab-btn="${tabId}"]`);
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}
