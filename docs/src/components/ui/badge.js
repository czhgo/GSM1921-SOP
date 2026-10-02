// role: [工程师]+[AI]
// components/ui/badge.js — 全站统一徽章组件（根治"改不动"：无内联样式、无硬编码 Tailwind 任意值）
// 用法：badgeHtml('待归档', 'warning', { title: '缺考勤、考察' })
// variant ∈ success | warning | danger | info | neutral | brand | gold

// 覆盖类（Tailwind 工具类晚于 styles.css 注入 → 覆盖 badge--* 的字色）：
// warning / neutral 两个变体的原字色对比不足 4.5（≈4.4 边界）⇒ 各自再加深一档至 AA。
// ⚠ 2026-10-02 批次 337（支书评 `#9`「为什么没有复用日历中的红色和金色」）：**brand / gold 不再挂内联字色**——
//   `brand` 已按语义改回**党建红**（`styles.css`：浅红底 ＋ `var(--party-red)` 字，对比 ≥ AA）；
//   `gold` 用其自身底 ＋ 深琥珀字（同样 ≥ AA）；**原先两者都挂 `text-amber-800`**
//   ⇒ 把红 / 金两色**盖成同一色**（这正是支书看到「另起炉灶」的直接原因）。
//   深色模式由 html.theme-dark .badge--* 高优先级规则接管，不受此覆盖影响。
const BADGE_VARIANT_CLASS = {
  success: 'badge--success',
  warning: 'badge--warning text-amber-800',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral text-gray-600',
  brand: 'badge--brand',
  gold: 'badge--gold',
};

export function badgeHtml(text, variant = 'neutral', opts = {}) {
  const cls = BADGE_VARIANT_CLASS[variant] || 'badge--neutral';
  const titleAttr = opts.title ? ` title="${opts.title}"` : '';
  return `<span class="badge ${cls}${opts.extraClass ? ' ' + opts.extraClass : ''}"${titleAttr}>${text}</span>`;
}

export function badgeVariantClass(variant) {
  return BADGE_VARIANT_CLASS[variant] || 'badge--neutral';
}
