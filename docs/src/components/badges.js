// role: [工程师]+[AI]
// components/badges.js — 徽章域统一库（扎口出口，2026-09-03）
// 模块化评估 P0 试点二：把展示徽章（badge）与交互状态徽章（status-badge）收进同一个徽章域出口。
// 调用方一律 import badges.js；内部实现文件（badge.js / status-badge.js）可各自演进，增删实现只动本库。
// 改造纪律：聚合重导出、实现不搬运、零行为变化、回归后验收（见 MODULARIZATION_ASSESSMENT.md §二）。
// 设计源：ARCHITECTURE_EVOLUTION.md（组件化）+ COMPONENT_SPEC §4.3

export { badgeHtml, badgeVariantClass } from './badge.js?v=20260903c';
export { statusBadgeHtml, bindStatusBadge } from './status-badge.js?v=20260903c';
