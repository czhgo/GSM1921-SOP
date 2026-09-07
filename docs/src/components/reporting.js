// role: [工程师]+[AI]
// components/reporting.js — 汇报域统一库（扎口出口，2026-09-03）
// 统一扎口 P0 试点三：一键汇报闭环（Issue kind='report'）的收/发两侧收进同一库出口——
//   report-entry（发起入口：各工作台顶部常驻按钮，两步入）
//   report-inbox（答复收件箱：待办置顶行内答复）
// 域边界：同属「汇报」数据流才入本库；数据交接（handoff-inbox，HandoffStore）为另一数据流，不混入。
// 调用方一律 import reporting.js；内部实现文件可各自演进，增删只动本库。
// 改造纪律：聚合重导出、实现不搬运、零行为变化（见 MODULARIZATION_ASSESSMENT.md §二）。
// 设计源：书记 2026-08-10 裁定（汇报闭环、行内答复、措辞温和）

export { renderReportEntryHtml, bindReportEntry } from './report-entry.js?v=20260908a';
export { renderReportInboxHtml, bindReportInbox } from './report-inbox.js?v=20260908a';
