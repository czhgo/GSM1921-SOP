// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  id.js — 唯一 ID 发生器 (Unique ID Generator)，**全站唯一实体 id 源**
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  纯浏览器 API，无任何外部依赖（Node ≥19 亦有 globalThis.crypto，服务端测试可加载）
//
//  ── 2026-09-13 Q-21-2 全站 id 排查后的裁定 ──────────────────────
//  病灶（实测暴露）：`thought-report.js` 的 `'tr_' + Date.now()` 在**同毫秒连提两篇**时
//    生成同一个 id（重复主键 → 归集/初阅指向错乱）。全站排查后又发现 30+ 处同型写法
//    （`'ed_' / 'ho_' / 'cmt-' / 'notice-' / 'mk_' + personId` …），其中「时间戳是唯一区分
//    因子」者在批量写入、连点、同毫秒两次调用时**必撞**。
//  裁定：**所有实体 id 一律经本模块生成**，禁止再写 `前缀 + Date.now()`。
//    · 前缀语义保留；**连字符前缀必须显式传 sep**——`tf-` / `notice-` 是既有硬契约
//      （`sourceId.startsWith('tf-')` 用于区分专班/活动；`notice-` 前缀见 services/todo.js
//      与种子 `notice-101…110`），传错分隔符会静默打断跳转。
//    · 降级链（见 randomHex）：randomUUID → getRandomValues → Math.random。
//      `services/branch.js::_newBranchId` 曾自行实现同一降级链（注释「不依赖
//      crypto.randomUUID，浏览器/node 双端可用」）——本次收敛至此，勿再另建。
//    · 回归守卫：`server/test/id-uniqueness.test.mjs`（结构层扫描 + 数据层唯一性断言）。
// ════════════════════════════════════════════════════════════════

/**
 * 随机十六进制串（**降级链单一源**）
 * 为什么需要降级：`crypto.randomUUID` 仅在安全上下文（https / localhost / file://）可用，
 *   非安全上下文下为 undefined；本模块是全站唯一实体 id 源，缺失时必须降级而不是抛错
 *   ——否则单点故障会放大为「全站写入失败」。
 * @param {number} [bytes=16] 每个字节 → 2 位十六进制
 * @returns {string} 长度 = bytes * 2 的小写十六进制串
 */
export function randomHex(bytes = 16) {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const a = new Uint8Array(bytes);
      c.getRandomValues(a);
      return Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* 落到下方兜底 */
  }
  // 末级兜底：必须是**真十六进制**（不得用 base36——`services/branch.js` 依赖
  //   `randomHex(4)` 产出恰好 8 位 hex 以维持 `br-<8hex>` 的既有形态契约）
  let out = '';
  while (out.length < bytes * 2) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

/**
 * 生成带前缀的唯一 ID
 * @param {string} prefix - ID 前缀，如 `'act'`、`'att'`、`'notice'`、`'tf'`
 * @param {string} [sep='_'] - 前缀与随机段的分隔符；**连字符前缀（tf-/notice-/cmt-…）必须传 `'-'`**
 * @returns {string} 如 `"att_550e8400-e29b-41d4-a716-446655440000"` / `"tf-550e8400-…"`
 */
export function generateId(prefix, sep = '_') {
  const c = globalThis.crypto;
  const rand = (c && typeof c.randomUUID === 'function') ? c.randomUUID() : randomHex();
  return prefix + sep + rand;
}
