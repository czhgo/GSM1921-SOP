// role: [工程师]+[AI]
// components/badge.js — 全站统一徽章组件（根治"改不动"：无内联样式、无硬编码 Tailwind 任意值）
// 用法：badgeHtml('待归档', 'warning', { title: '缺考勤、考察' })
// variant ∈ success | warning | danger | info | neutral | brand | gold

// 覆盖类（Tailwind 工具类晚于 styles.css 注入 → 覆盖 badge--* 的字色）：
// warning/brand 底 #FEF3C7、gold 底 #FDE68A 上原字色 #A16207 对比不足 4.5（4.42/5.69 边界），
// neutral 底 #F3F4F6 上 #6B7280 仅 4.39 —— 统一加深一档至 AA。深色模式由
// html.theme-dark .badge--* 高优先级规则接管，不受此覆盖影响。
const BADGE_VARIANT_CLASS = {
  success: 'badge--success',
  warning: 'badge--warning text-amber-800',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral text-gray-600',
  brand: 'badge--brand text-amber-800',
  gold: 'badge--gold text-amber-800',
};

export function badgeHtml(text, variant = 'neutral', opts = {}) {
  const cls = BADGE_VARIANT_CLASS[variant] || 'badge--neutral';
  const titleAttr = opts.title ? ` title="${opts.title}"` : '';
  return `<span class="badge ${cls}${opts.extraClass ? ' ' + opts.extraClass : ''}"${titleAttr}>${text}</span>`;
}

export function badgeVariantClass(variant) {
  return BADGE_VARIANT_CLASS[variant] || 'badge--neutral';
}
