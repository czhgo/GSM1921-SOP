// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  date.js — 日期口径**单一源**（**零依赖叶子模块**；node 直导可测、浏览器/node 双端可载）
//
//  R-26③（2026-10-05 批次 388）：全站「今天 / 日历日」一律走**本地**口径。
//    「`new Date()` ＋ `toISOString()` 切前 10 位」是 **UTC** ⇒ 在 Asia/Shanghai（UTC+8）的
//    **00:00–08:00** 会把「今天」判成**昨天**（逾期 / 待办 / 发布日 / 归档日随之偏一天）。
//    要「今天」→ `todayLocal()`；要格式化某个 Date → `_fmtDate(d)`。
//    **静态禁用**（docs/src 不得再出现那串 UTC 切法）由 `server/test/date-canon-guard.test.mjs` 把守。
//
//  为什么单独一件、而非并入 `core/base/utils.js`：`core/domain/constants.js` 是**被全站 import
//    且要求双端可载**的模块（`docs/src/services/activity/activity.js` 有明文：constants 不入服务层、
//    以避循环）⇒ 它只能引**零依赖**件；而 `utils.js` 会牵 `core/session/pending-writes.js`。
//    `utils.js` 对本件做**转出**（`export { … } from './date.js'`），既有 `from '…/utils.js'` 的
//    调用点一律不变。
// ════════════════════════════════════════════════════════════════

function _pad(n) { return n < 10 ? '0' + n : '' + n; }

/** Date → **本地**日历日 `YYYY-MM-DD` */
export function _fmtDate(d) {
  return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
}

/** 「今天」的**本地**日历日 `YYYY-MM-DD`（R-26③ 单一源；**禁**用 UTC 切串取「今天」） */
export function todayLocal() { return _fmtDate(new Date()); }
