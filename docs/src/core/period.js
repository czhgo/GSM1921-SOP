// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  period.js — 期次（period）纯函数（单一源，2026-09-13 支书裁定）
// ════════════════════════════════════════════════════════════════
//  背景：思想汇报是**面板数据**——同一 personId 下可有多篇，时间维 = 期次（季度）。
//  提取到 core 的原因（避免环依赖 + 文案未同步）：
//   · 服务层（services/thought-report.js）用它做提交/归集/阅读分组；
//   · 通知模板（core/system-notice-templates.js）用它把期次渲染成中文标签——
//     若把期次函数放在 services 层，core 就会反向依赖 services（成环）。
//  纯 ESM、零依赖，浏览器 / Node 双端可加载（与 policy-defaults 同层约定）。
// ════════════════════════════════════════════════════════════════

/** 期次格式：YYYY-Qn（n ∈ 1..4） */
export const PERIOD_RE = /^(\d{4})-Q([1-4])$/;

/** 期次是否合法 */
export function isValidPeriod(period) {
  return PERIOD_RE.test(String(period || ''));
}

/**
 * 由时间推导期次（提交时手填的**兜底**：未传 period 时按提交时间归属）
 * @param {string|Date} [dateLike] 缺省 = 当前时间
 * @returns {string} 形如 '2026-Q3'
 */
export function periodOf(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  const t = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${t.getFullYear()}-Q${Math.floor(t.getMonth() / 3) + 1}`;
}

/** 期次 → 中文标签（'2026-Q3' → '2026年第三季度'；非法值原样返回） */
export function periodLabel(period) {
  const m = PERIOD_RE.exec(String(period || ''));
  if (!m) return String(period || '');
  const CN = ['一', '二', '三', '四'];
  return `${m[1]}年第${CN[Number(m[2]) - 1]}季度`;
}

/** 期次排序比较器（新期次在前，可直接传给 Array.prototype.sort） */
export function comparePeriodDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

/**
 * 可选期次（手填下拉；含近 N 年四个季度，新期次在前）
 * @param {number} [years=2] 覆盖年数（含当前年）
 * @returns {Array<{value:string,label:string}>}
 */
export function periodOptions(years = 2) {
  const y0 = new Date().getFullYear();
  const out = [];
  for (let i = 0; i < Math.max(1, years); i++) {
    const y = y0 - i;
    for (let q = 4; q >= 1; q--) {
      const value = `${y}-Q${q}`;
      out.push({ value, label: periodLabel(value) });
    }
  }
  return out;
}
