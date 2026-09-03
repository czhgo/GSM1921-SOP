// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  tab-nav.js — Tab 激活/回退纯决策（R6 导航守卫，2026-09-03 P2a）
//  背景：tab 显隐由支部 config.modules.hiddenTabIds 决定（书记操作/L2），但 entry 导航侧
//    硬编码 defaultTab/onNavTarget id；目标 tab 被隐藏后旧实现静默无内容（白屏无高亮）。
//  本模块把「初始 tab 决策 + 目标 tab 回退」收敛为纯函数（无 DOM 依赖），tab-bar 唯一消费，
//  规则：非法请求一律回退到第一个可见 tab（核心组固定保证至少一个可见），并打印告警。
//  本文件纯 ESM 零依赖，浏览器与 node（server 测试）双端可加载。
// ════════════════════════════════════════════════════════════════

/**
 * 初始激活 tab 决策（优先级：priorityTab > 记忆 savedTab > defaultTab > tabs[0]）
 * @param {Array<{id:string}>} tabs 当前可见 tab 清单（已应用隐藏策略）
 * @param {{ defaultTab?: string, savedTab?: string|null, priorityTab?: string|null }} [prefs]
 * @returns {string|null} 全部不可用时返回 null（理论不发生：核心组固定）
 */
export function resolveInitialTab(tabs, { defaultTab, savedTab, priorityTab } = {}) {
  const list = Array.isArray(tabs) ? tabs : [];
  const ids = new Set(list.map((t) => t && t.id));
  const pick = (id) => (id && ids.has(id) ? id : null);
  return pick(priorityTab) || pick(savedTab) || pick(defaultTab) || (list.length ? list[0].id : null);
}

/**
 * 目标 tab 回退守卫（activate/导航落点用）
 * @param {Array<{id:string}>} tabs 当前可见 tab 清单
 * @param {string|null} requestedId 请求激活的 tab id（可被支部配置隐藏）
 * @returns {{ id: string|null, fellBack: boolean }} fellBack=true 表示请求 id 不可见已回退首位
 */
export function resolveTargetTab(tabs, requestedId) {
  const list = Array.isArray(tabs) ? tabs : [];
  if (!requestedId) return { id: list.length ? list[0].id : null, fellBack: !!requestedId };
  if (list.some((t) => t && t.id === requestedId)) return { id: requestedId, fellBack: false };
  return { id: list.length ? list[0].id : null, fellBack: true };
}
