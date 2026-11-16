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

/** 输入归一：Date / ISO 串 → Date（空值 / 不可解析 → null） */
function _toDate(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v == null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ISO 时间串 / Date → **本地**日历日 `YYYY-MM-DD`（空值 / 不可解析返回 ''）。
 * 2026-11-16 `polish-shell-and-display-truth` T5：替代各处 `String(x).slice(0, 10)`（UTC 日）——
 *   本地 00:00–08:00 写入的时间戳切 UTC 串会落到**前一天**。
 *   纯日期串（`YYYY-MM-DD`）本身即日历日，原样返回（不经 `new Date` 的 UTC 零点换算）。
 */
export function fmtLocalDate(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = _toDate(v);
  return d ? _fmtDate(d) : '';
}

/**
 * ISO 时间串 / Date → **本地** `YYYY-MM-DD HH:mm`（空值 / 不可解析返回 ''）。
 * 2026-11-16 T5：替代 `String(iso).slice(0, 16)`（UTC 串直切）——本地 00:30 提交显示当天 00:30。
 */
export function fmtLocalDateTime(v) {
  const d = _toDate(v);
  if (!d) return '';
  return _fmtDate(d) + ' ' + _pad(d.getHours()) + ':' + _pad(d.getMinutes());
}
