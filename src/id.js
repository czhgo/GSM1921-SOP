// ════════════════════════════════════════════════════════════════
//  id.js — 唯一 ID 发生器 (Unique ID Generator)
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  纯浏览器 API，无任何外部依赖
// ════════════════════════════════════════════════════════════════

/**
 * 生成带前缀的唯一 ID（依赖 Web Crypto API，浏览器原生支持）
 * @param {string} prefix - ID 前缀，如 'act'、'att'、'usr'
 * @returns {string} 如 "act_550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(prefix) {
  return prefix + '_' + crypto.randomUUID();
}
