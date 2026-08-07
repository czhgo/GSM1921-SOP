// role: [工程师]+[AI]
// components/badge.js — 全站统一徽章组件（根治"改不动"：无内联样式、无硬编码 Tailwind 任意值）
// 用法：badgeHtml('待归档', 'warning', { title: '缺考勤、考察' })
// variant ∈ success | warning | danger | info | neutral | brand | gold

const BADGE_VARIANT_CLASS = {
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral',
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
