// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/mock/demo-window.js —— 演示数据窗口**单一源**
// ════════════════════════════════════════════════════════════════
// 口径（spec restore-capsule-and-harden-data-truth · Task 5）：
//   · 演示库的业务日期统一落在 2026-08-01 ~ 2026-11-30；
//   · 7 月及更早的业务内容**重排**（不是删除），11 月只放 draft/published 计划态；
//   · 组织骨架（users / branches / party_groups / appointment / auth_audit）与跨期实体
//     （如 tf-002 的 deadline）不按窗口裁剪，由守卫白名单显式登记理由。
// 本模块是**纯数据 + 纯函数**叶子：不 import 任何模块，浏览器与 Node（守卫）共用。
// ════════════════════════════════════════════════════════════════

/** 演示窗口（含首尾）。 */
export const DEMO_WINDOW = Object.freeze({ from: '2026-08-01', to: '2026-11-30' });

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/** 取字符串里的日期键（YYYY-MM-DD）；非法输入返回 null。 */
export function dateKeyOf(value) {
  if (value === null || value === undefined) return null;
  const match = DATE_PREFIX.exec(String(value).trim());
  if (!match) return null;
  const key = match[1];
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  // 反向校验：拒绝 2026-02-31 这类「能被 Date 进位」的伪日期。
  const pad = (n) => String(n).padStart(2, '0');
  const normalized = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return normalized === key ? key : null;
}

/** 日期（或 ISO 日期时间）是否落在演示窗口内（含首尾）；非法输入一律 false。 */
export function inDemoWindow(value, window = DEMO_WINDOW) {
  const key = dateKeyOf(value);
  if (!key) return false;
  return key >= window.from && key <= window.to;
}

/** 日期所在月份键（YYYY-MM）；非法输入返回 null。 */
export function monthKeyOf(value) {
  const key = dateKeyOf(value);
  return key ? key.slice(0, 7) : null;
}
