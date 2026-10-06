// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  period.js — 期次（period）纯函数（单一源，2026-09-13 支书裁定）
// ════════════════════════════════════════════════════════════════
//  背景：思想汇报是**面板数据**——同一 personId 下可有多篇，时间维 = 期次（季度）。
//  提取到 core 的原因（避免环依赖 + 文案未同步）：
//   · 服务层（services/governance/thought-report.js）用它做提交/归集/阅读分组；
//   · 通知模板（core/domain/system-notice-templates.js）用它把期次渲染成中文标签——
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

// ════════════════════════════════════════════════════════════════
//  周期键（cycle period）——**与上面的「期次（季度）」是两件事，勿混**
//  （2026-10-06 批次 423 · `R-29⑤` · `D-804`）
//  · 上面 `PERIOD_RE` / `periodOf` 服务于**思想汇报期次**（固定季度、`YYYY-Qn`，单一源）。
//  · 本组函数服务于**支部分工模块的开展周期**（`core/domain/work-map.js::WORK_MAP_MODULES[].cycle`），
//    单位可为 月 / 季 / 半年 / 年 ⇒ 期键形态随之四选一；**不是**同一口径，故另立函数、不改 `PERIOD_RE`。
//  · 纯函数、零依赖（同本文件既有约定）。
// ════════════════════════════════════════════════════════════════

/** 周期单位（与 `work-map.js::WORK_MAP_MODULES[].cycle.unit` 同一取值集，**单一源在此声明**） */
export const CYCLE_UNITS = Object.freeze(['month', 'quarter', 'half-year', 'year']);

/** 周期单位中文标签（面板 / 组卡文案用） */
export const CYCLE_UNIT_LABELS = Object.freeze({
  month: '每月', quarter: '每季度', 'half-year': '每半年', year: '每年',
});

/**
 * 日期 → 周期期键（按单位取最细粒度的那个自然周期）。
 *   month     → 'YYYY-MM'
 *   quarter   → 'YYYY-Qn'（n ∈ 1..4）
 *   half-year → 'YYYY-Hn'（n ∈ 1..2；与 `services/governance/todo.js::halfYearPeriodOf` 同口径）
 *   year      → 'YYYY'
 * @param {string} dateStr 日期键（'YYYY-MM-DD' 或其前缀；非法 ⇒ null）
 * @param {'month'|'quarter'|'half-year'|'year'} unit
 * @returns {string|null}
 */
export function cyclePeriodOf(dateStr, unit) {
  const m = /^(\d{4})-(\d{2})/.exec(String(dateStr || ''));
  if (!m || !CYCLE_UNITS.includes(unit)) return null;
  const year = m[1];
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  if (unit === 'year') return year;
  if (unit === 'half-year') return `${year}-H${month <= 6 ? 1 : 2}`;
  if (unit === 'quarter') return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
  return `${year}-${m[2]}`;
}

/** 周期期键 → 中文标签（'2026-09' → '2026年9月'；'2026-Q3' → '2026年第三季度'；非法 ⇒ 原样返回） */
export function cyclePeriodLabel(period, unit) {
  const s = String(period || '');
  const CN = ['一', '二', '三', '四'];
  let m;
  if (unit === 'year' && (m = /^(\d{4})$/.exec(s))) return `${m[1]}年`;
  if (unit === 'half-year' && (m = /^(\d{4})-H([12])$/.exec(s))) return `${m[1]}年${Number(m[2]) === 1 ? '上' : '下'}半年`;
  if (unit === 'quarter' && (m = /^(\d{4})-Q([1-4])$/.exec(s))) return `${m[1]}年第${CN[Number(m[2]) - 1]}季度`;
  if (unit === 'month' && (m = /^(\d{4})-(\d{2})$/.exec(s))) return `${m[1]}年${Number(m[2])}月`;
  return s;
}
