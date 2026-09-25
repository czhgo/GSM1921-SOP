// role: [工程师]+[AI]
// style-baseline.mjs — 「美学存量」基线数据（给 hex-hardcode-guard / control-font-guard 消费）
// 生成日期：2026-09-24（美学存量清理批）· 生成方式：按下方口径静态扫描 docs 全量文件后逐文件落表
// 口径与用法见两份守卫文件头部注释；本文件只放**数据**，不放判据。
// ⚠ 「收基线」= 删条目 / 减计数（缩减进度会自动前进）；**不得**为变绿而补条目或调大计数。

/** 硬编码 hex 基线：`文件 → { c: 处数, v: 该文件现存允许的 hex 值（小写） }`
 *  扫描范围＝docs 下全部 .js / .mjs / .css / .html（排除 docs/assets/vendor 第三方目录）
 *  抽取口径＝`#` + 3/4/6/8 位十六进制（CSS 颜色合法长度）+ 右侧词边界，且排除 HTML 实体（&#10003; 之类） */
export const HEX_BASELINE = {
  'docs/help.html': { c: 568, v: [
      '#0369a1', '#047857', '#059669', '#06b6d4', '#0891b2', '#10b981', '#111827', '#15803d', '#1d4ed8',
      '#1f2937', '#2563eb', '#374151', '#3b82f6', '#4b5563', '#4d7c0f', '#65a30d', '#6b7280', '#7a0010',
      '#7c3aed', '#7c5a14', '#86efac', '#8b5cf6', '#92400e', '#93c5fd', '#991b1b', '#9a3412', '#9ca3af',
      '#a7f3d0', '#b45309', '#b91c1c', '#bae6fd', '#ce1126', '#d1d5db', '#d97706', '#e5e7eb', '#ecfdf5',
      '#edeef0', '#eeeff2', '#f0dfa8', '#f1f2f4', '#f3f4f6', '#f6d1d1', '#f8f9fa', '#fafaf5', '#fafaf9',
      '#fca5a5', '#fcfcfb', '#fdba74', '#fde68a', '#fdf2f2', '#fdfbf4', '#fecaca', '#fef2f2', '#ffd700',
      '#fff', '#fffbeb', '#fffbfb', '#ffffff',
  ] },
  'docs/login.html': { c: 5, v: [
      '#7a0010', '#9b0000', '#ce1126', '#e5e7eb', '#fecaca',
  ] },
  // `docs/settings.html` 条目已于 2026-09-25 移除（收基线）：该页整体重做后
  //   页面级 <style> 归零、页面内硬编码 hex 清零 ⇒ 按本守卫自身纪律（收基线＝删条目）删去。
  'docs/src/about.css': { c: 50, v: [
      '#14161a', '#1b1e24', '#22262d', '#33383f', '#3b3226', '#6c6254', '#756b5d', '#7c5c14', '#7e7870',
      '#94897a', '#948e85', '#a80f1c', '#a9a398', '#aba191', '#c9a227', '#ce1126', '#e3c24f', '#e6dfd2',
      '#e8e4dc', '#f0ebe2', '#f6f2eb', '#faf8f4', '#fbe9e4', '#fdf1ea', '#fff', '#fff8ee', '#fffdf6',
  ] },
  'docs/src/components/activity-view.js': { c: 4, v: [
      '#16a34a', '#9ca3af', '#d97706',
  ] },
  'docs/src/components/appearance-controls.js': { c: 9, v: [
      '#000', '#b91c1c', '#fff',
  ] },
  'docs/src/components/badge.js': { c: 5, v: [
      '#6b7280', '#a16207', '#f3f4f6', '#fde68a', '#fef3c7',
  ] },
  'docs/src/components/calendar.js': { c: 13, v: [
      '#000', '#b91c1c', '#fff',
  ] },
  'docs/src/components/dashboard/activity-panel.js': { c: 7, v: [
      '#000', '#3b82f6', '#6b7280', '#b91c1c', '#f9fafb', '#fff',
  ] },
  'docs/src/components/dashboard/gallery.js': { c: 19, v: [
      '#6b7280', '#a7f3d0', '#bae6fd', '#bfdbfe', '#c4b5fd', '#d9f99d', '#e5e7eb', '#ecfdf5', '#eff6ff',
      '#f0f9ff', '#f5f3ff', '#f7fee7', '#f9fafb', '#fbcfe8', '#fde68a', '#fdf2f8', '#fecaca', '#fef2f2',
      '#fffbeb',
  ] },
  'docs/src/components/dashboard/stats.js': { c: 19, v: [
      '#059669', '#10b981', '#3b82f6', '#94a3b8', '#9ca3af', '#d1d5db', '#d97706', '#dc2626', '#ef4444',
      '#f59e0b', '#f97316',
  ] },
  'docs/src/components/form-shell.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/components/header.js': { c: 6, v: [
      '#000', '#7a0010', '#c8102e', '#fff', '#ffffff',
  ] },
  'docs/src/components/insight-view.js': { c: 4, v: [
      '#000', '#b91c1c', '#fff',
  ] },
  'docs/src/components/inspector.js': { c: 23, v: [
      '#15803d', '#16a34a', '#34d399', '#4ade80', '#60a5fa', '#92400e', '#9ca3af', '#b91c1c', '#ce1126',
      '#d97706', '#f87171', '#fbbf24',
  ] },
  'docs/src/components/issue-detail.js': { c: 13, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#a16207', '#b91c1c', '#ce1126', '#f87171',
      '#fbbf24', '#fff',
  ] },
  'docs/src/components/issue-form.js': { c: 9, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#a16207', '#ce1126', '#f87171', '#fbbf24',
  ] },
  'docs/src/components/issue-list.js': { c: 15, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#991b1b', '#a16207', '#ce1126', '#f87171',
      '#fbbf24',
  ] },
  'docs/src/components/member-change-panel.js': { c: 1, v: [
      '#b91c1c',
  ] },
  'docs/src/components/modal.js': { c: 17, v: [
      '#374151', '#3b82f6', '#b91c1c', '#cbd5e1', '#ef4444', '#f87171',
  ] },
  'docs/src/components/org-setup-wizard.js': { c: 18, v: [
      '#16a34a', '#c8102e', '#ce1126', '#ef4444', '#ffd700', '#fff',
  ] },
  'docs/src/components/overview-dispatch-bar.js': { c: 1, v: [
      '#b91c1c',
  ] },
  'docs/src/components/person-picker.css': { c: 24, v: [
      '#1f2937', '#6b7280', '#92400e', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb', '#fde68a',
      '#fef3c7', '#ffffff',
  ] },
  'docs/src/components/person-picker.js': { c: 8, v: [
      '#000', '#047857', '#1d4ed8', '#6b7280', '#991b1b', '#a16207', '#ce1126',
  ] },
  'docs/src/components/query-view.js': { c: 2, v: [
      '#3b82f6',
  ] },
  'docs/src/components/reactions.js': { c: 10, v: [
      '#000', '#059669', '#1e293b', '#334155', '#3b82f6', '#6b7280', '#cbd5e1', '#d97706', '#dc2626',
      '#f3f4f6',
  ] },
  'docs/src/components/report-entry.js': { c: 6, v: [
      '#b91c1c', '#ef4444', '#fff',
  ] },
  'docs/src/components/report-inbox.js': { c: 6, v: [
      '#16a34a', '#b91c1c', '#ef4444', '#f59e0b', '#f87171',
  ] },
  'docs/src/components/signup-panel.js': { c: 6, v: [
      '#10b981', '#c8102e', '#ce1126', '#f59e0b',
  ] },
  'docs/src/components/status-badge.js': { c: 1, v: [
      '#9ca3af',
  ] },
  'docs/src/components/tab-bar.js': { c: 5, v: [
      '#000', '#334155', '#b91c1c', '#e5e7eb', '#ffd700',
  ] },
  'docs/src/components/taskforce-view.js': { c: 26, v: [
      '#000', '#0d9488', '#10b981', '#10b98115', '#34d399', '#3b82f6', '#60a5fa', '#6366f1', '#6b7280',
      '#94a3b8', '#a5b4fc', '#d97706', '#dc2626', '#f87171', '#fbbf24',
  ] },
  'docs/src/components/work-overview.js': { c: 16, v: [
      '#0ea5e9', '#16a34a', '#3b82f6', '#4f46e5', '#60a5fa', '#94a3b8', '#b91c1c', '#cbd5e1', '#ef4444',
      '#f59e0b',
  ] },
  'docs/src/components/workspace-shell.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/core/constants.js': { c: 137, v: [
      '#000', '#0369a1', '#047857', '#059669', '#0e7490', '#0ea5e9', '#10b981', '#16a34a', '#1d4ed8',
      '#22c55e', '#22d3ee', '#2563eb', '#34d399', '#38bdf8', '#3b82f6', '#4ade80', '#4b5563', '#4f46e5',
      '#60a5fa', '#6b7280', '#7c3aed', '#7dd3fc', '#92400e', '#94a3b8', '#991b1b', '#9b0000', '#a16207',
      '#a5b4fc', '#a78bfa', '#b91c1c', '#c2410c', '#c4b5fd', '#cbd5e1', '#ce1126', '#d4af37', '#d97706',
      '#dc2626', '#f87171', '#fb923c', '#fbbf24', '#fee2e2', '#fef2f2', '#fefce8', '#ffd700', '#fff',
  ] },
  'docs/src/core/data-adapter.js': { c: 7, v: [
      '#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f9fafb', '#fff',
  ] },
  'docs/src/core/icons.js': { c: 1, v: [
      '#fff',
  ] },
  'docs/src/core/utils.js': { c: 15, v: [
      '#16a34a', '#1e293b', '#1f2937', '#3b82f6', '#e2e8f0', '#ef4444', '#eff6ff', '#f0fdf4', '#fef2f2',
      '#fff',
  ] },
  'docs/src/entries/about-entry.js': { c: 20, v: [
      '#0e7490', '#0ea5e9', '#15803d', '#2563eb', '#64748b', '#6b7280', '#900', '#b91c1c', '#c2410c',
      '#ce1126', '#f87171', '#fee', '#ffd700',
  ] },
  'docs/src/entries/activity-entry.js': { c: 11, v: [
      '#000', '#6b7280', '#8b5cf6', '#94a3b8', '#a16207', '#ce1126', '#f87171', '#fbbf24', '#fde68a',
      '#ffd700',
  ] },
  'docs/src/entries/archive-entry.js': { c: 1, v: [
      '#6b7280',
  ] },
  'docs/src/entries/help-entry.js': { c: 4, v: [
      '#7a0010', '#ce1126', '#d1d5db', '#fdf2f2',
  ] },
  'docs/src/entries/notice-entry.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/entries/party-committee-meeting-entry.js': { c: 3, v: [
      '#c8102e',
  ] },
  'docs/src/entries/settings-entry.js': { c: 13, v: [
      '#000', '#6b7280', '#92400e', '#b91c1c', '#e5e7eb', '#fef3c7', '#fff',
  ] },
  'docs/src/entries/tabs/disc/attendance-tab.js': { c: 20, v: [
      '#000', '#0ea5e9', '#14b8a6', '#16a34a', '#94a3b8', '#b91c1c', '#ef4444', '#f59e0b', '#fff',
  ] },
  'docs/src/entries/tabs/disc/inspection-tab.js': { c: 12, v: [
      '#000', '#94a3b8', '#b45309', '#b91c1c', '#c8102e', '#fff',
  ] },
  'docs/src/entries/tabs/disc/review-tab.js': { c: 1, v: [
      '#fbbf24',
  ] },
  'docs/src/entries/tabs/leader/attendance-tab.js': { c: 1, v: [
      '#000',
  ] },
  'docs/src/entries/tabs/leader/inspection-tab.js': { c: 1, v: [
      '#000',
  ] },
  'docs/src/entries/tabs/leader/members-tab.js': { c: 6, v: [
      '#000', '#60a5fa', '#b91c1c', '#ef4444', '#fff',
  ] },
  'docs/src/entries/tabs/leader/review-tab.js': { c: 1, v: [
      '#fbbf24',
  ] },
  'docs/src/entries/tabs/leader/write-tab.js': { c: 24, v: [
      '#000', '#0e7490', '#10b981', '#1e293b', '#334155', '#3b82f6', '#475569', '#6b7280', '#94a3b8',
      '#cbd5e1', '#ce1126', '#d1d5db', '#d97706', '#e5e7eb', '#f3f4f6',
  ] },
  'docs/src/entries/tabs/org/development-tab.js': { c: 9, v: [
      '#000', '#06b6d4', '#10b981', '#334155', '#3b82f6', '#e5e7eb', '#f59e0b',
  ] },
  'docs/src/entries/tabs/org/inspection-tab.js': { c: 1, v: [
      '#000',
  ] },
  'docs/src/entries/tabs/org/roster-tab.js': { c: 15, v: [
      '#374151', '#3b82f6', '#cbd5e1', '#ef4444',
  ] },
  'docs/src/entries/tabs/org/talent-tab.js': { c: 1, v: [
      '#67e8f9',
  ] },
  'docs/src/entries/tabs/org/taskforce-tab.js': { c: 58, v: [
      '#000', '#0d9488', '#10b981', '#10b98115', '#34d399', '#3b82f6', '#60a5fa', '#6366f1', '#6b7280',
      '#8b5cf6', '#94a3b8', '#a5b4fc', '#b91c1c', '#c4b5fd', '#ce1126', '#d97706', '#dc2626', '#f87171',
      '#fbbf24', '#fff',
  ] },
  'docs/src/entries/tabs/org/thought-review-tab.js': { c: 2, v: [
      '#000', '#b91c1c',
  ] },
  'docs/src/entries/tabs/org/todo-tab.js': { c: 1, v: [
      '#3b82f6',
  ] },
  'docs/src/entries/tabs/party-committee/branches-tab.js': { c: 6, v: [
      '#c8102e',
  ] },
  'docs/src/entries/tabs/party-committee/dispatch-tab.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/entries/tabs/party-committee/review-tab.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/entries/tabs/prop/archive-tab.js': { c: 4, v: [
      '#3b82f6', '#60a5fa', '#999', '#b91c1c',
  ] },
  'docs/src/entries/tabs/prop/kanban-tab.js': { c: 8, v: [
      '#000', '#2563eb', '#3b82f6', '#4b5563', '#60a5fa', '#94a3b8', '#ce1126',
  ] },
  'docs/src/entries/tabs/prop/tasks-tab.js': { c: 9, v: [
      '#000', '#10b981', '#34d399', '#3b82f6', '#60a5fa', '#d97706', '#fbbf24',
  ] },
  'docs/src/entries/tabs/secretary/assign-tab.js': { c: 12, v: [
      '#9b0000', '#b91c1c', '#f87171', '#fee2e2', '#fff',
  ] },
  'docs/src/entries/tabs/secretary/calendar-tab.js': { c: 12, v: [
      '#b91c1c', '#ce1126', '#ffd700', '#fff',
  ] },
  'docs/src/entries/tabs/secretary/committee-meeting-tab.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/entries/tabs/secretary/feedback-tab.js': { c: 3, v: [
      '#b91c1c', '#fff',
  ] },
  'docs/src/entries/tabs/secretary/group-progress-tab.js': { c: 15, v: [
      '#16a34a', '#9ca3af', '#ce1126', '#e5e7eb', '#ef4444', '#f3f4f6', '#f59e0b', '#fbbf24',
  ] },
  'docs/src/entries/tabs/secretary/notification-tab.js': { c: 8, v: [
      '#b91c1c', '#ce1126', '#fff',
  ] },
  'docs/src/entries/tabs/secretary/overview-tab.js': { c: 30, v: [
      '#0ea5e9', '#16a34a', '#38bdf8', '#3b82f6', '#94a3b8', '#b91c1c', '#d97706', '#ef4444', '#f59e0b',
      '#fbbf24', '#fff',
  ] },
  'docs/src/entries/tabs/secretary/report-up-tab.js': { c: 5, v: [
      '#16a34a', '#6b7280', '#c8102e', '#d97706',
  ] },
  'docs/src/entries/tabs/secretary/todo-tab.js': { c: 6, v: [
      '#6366f1', '#6b7280', '#ce1126',
  ] },
  'docs/src/entries/tabs/secretary/work-map-tab.js': { c: 5, v: [
      '#000', '#b91c1c', '#cbd5e1', '#fff',
  ] },
  'docs/src/entries/tabs/today/today-tab.js': { c: 8, v: [
      '#000', '#9ca3af', '#b91c1c', '#ef4444',
  ] },
  'docs/src/entries/tabs/visitor/activities-tab.js': { c: 12, v: [
      '#6b7280', '#ce1126', '#f9fafb', '#fca5a5',
  ] },
  'docs/src/entries/tabs/visitor/attendance-tab.js': { c: 2, v: [
      '#3b82f6',
  ] },
  'docs/src/entries/tabs/visitor/inspection-tab.js': { c: 2, v: [
      '#000', '#f3f4f6',
  ] },
  'docs/src/entries/tabs/visitor/projects-tab.js': { c: 11, v: [
      '#000', '#b91c1c', '#ce1126', '#fca5a5', '#fff',
  ] },
  'docs/src/entries/tabs/visitor/review-tab.js': { c: 5, v: [
      '#3b82f6', '#f59e0b', '#fbbf24',
  ] },
  'docs/src/entries/tabs/visitor/todo-tab.js': { c: 3, v: [
      '#a16207', '#fbbf24', '#ffd700',
  ] },
  'docs/src/entries/taskforce-entry.js': { c: 1, v: [
      '#8b5cf6',
  ] },
  'docs/src/entries/wizard-entry.js': { c: 2, v: [
      '#c8102e',
  ] },
  'docs/src/modules/references.js': { c: 23, v: [
      '#047857', '#1d4ed8', '#6b7280', '#b45309', '#c8102e', '#d1fae5', '#dbeafe', '#ecfdf5', '#ef4444',
      '#f3f4f6', '#fef3c7',
  ] },
  'docs/src/services/branch-doc.js': { c: 1, v: [
      '#b45309',
  ] },
  'docs/src/services/decision-tree.js': { c: 4, v: [
      '#ce1126', '#ffd700',
  ] },
  'docs/src/services/issues.js': { c: 2, v: [
      '#b91c1c',
  ] },
  'docs/src/services/notice.js': { c: 3, v: [
      '#3b82f6', '#c8102e', '#fff',
  ] },
  'docs/src/services/org-wizard-report.js': { c: 4, v: [
      '#ce1126', '#ffd700',
  ] },
  'docs/src/styles.css': { c: 467, v: [
      '#000', '#0284c7', '#059669', '#0b1220', '#0ea5e9', '#0f172a', '#10b981', '#111827', '#141d2f',
      '#15803d', '#1a2438', '#1b1e24', '#1d4ed8', '#1e293b', '#1f2937', '#22c55e', '#22d3ee', '#243244',
      '#2563eb', '#2a1a22', '#334155', '#34d399', '#374151', '#38bdf8', '#3b82f6', '#475569', '#4a000a',
      '#4ade80', '#4b5563', '#5eead4', '#60a5fa', '#6366f1', '#64748b', '#67e8f9', '#6b7280', '#6ee7b7',
      '#7a0010', '#7a838f', '#7c3aed', '#7dd3fc', '#86efac', '#8a6d1f', '#8b5cf6', '#93c5fd', '#94a3b8',
      '#991b1b', '#9b0000', '#9ca3af', '#a16207', '#a3e635', '#a78bfa', '#aeb6c2', '#b91c1c', '#bae6fd',
      '#bbf7d0', '#bef264', '#bfdbfe', '#c2410c', '#c4b5fd', '#c9a227', '#cbd5e1', '#ce1126', '#d1d5db',
      '#d1fae5', '#d4af37', '#d8b4fe', '#d97706', '#dbeafe', '#dc2626', '#dcfce7', '#e0f2fe', '#e2e8f0',
      '#e5e7eb', '#ede9fe', '#ef4444', '#eff6ff', '#f0fdf4', '#f1f5f9', '#f3f4f6', '#f59e0b', '#f87171',
      '#f8f9fa', '#f8fafc', '#f9fafb', '#facc15', '#fafaf5', '#fb923c', '#fbbf24', '#fca5a5', '#fcd34d',
      '#fda4af', '#fdba74', '#fde047', '#fde68a', '#fecaca', '#fed7aa', '#fee2e2', '#fef2f2', '#fef3c7',
      '#ffd700', '#fff', '#fff7ed', '#fffbeb', '#ffffff',
  ] },
  'docs/src/tailwind-config.js': { c: 50, v: [
      '#10b981', '#111827', '#1f2937', '#374151', '#3b82f6', '#4a000a', '#4b5563', '#6b7280', '#7a0010',
      '#8b5cf6', '#9b0000', '#9ca3af', '#ce1126', '#d1d5db', '#d97706', '#dc2626', '#e5e7eb', '#ef4444',
      '#f3f4f6', '#f87171', '#f8f9fa', '#fca5a5', '#fde68a', '#fecaca', '#fee2e2', '#fef2f2', '#ffd700',
      '#ffffff',
  ] },
};

/** 硬编码 hex 规模下限（守卫的非空转判据：低于此值说明抽取口径失效或台账被删减） */
export const HEX_TOTAL_BASELINE = 2025;
// 93 → 92（2026-09-25）：`docs/settings.html` 整体重做后其硬编码 hex 清零 ⇒ 该条目按收基线纪律删除，
//   条目数随之 −1（H3 要求「基线条目数 ＝ 声明文件数」，两处必须同步动）。
//   `HEX_TOTAL_BASELINE` **有意保持 2025**：它是「存量起点」，H4 会据此显示 ↓15 的缩减进度（该文件真少了 15 处）。
export const HEX_FILE_BASELINE = 92;
export const HEX_VALUE_BASELINE = 168;

/** 搬移例外台账（**人工填写**；守卫**不自动放宽**）——2026-09-25 支书裁定「开搬移例外」。
 *
 *  背景：文件**搬移 / 拆分 / 重命名**会让颜色**从 A 文件移到 B 文件**。按逐文件 ratchet 的字面纪律，
 *  搬移会被判成「新文件新增 hardcode」而搬不干净（上一批 `assign-tab.js` 即因此只能搬功能落点、实现留一处）。
 *  ⇒ 支书裁定（2026-09-25）：允许因搬移导致颜色迁移时，**同批按新文件重设基线**（写清理由 ＋ 逐值对照），而不是被 ratchet 卡死。
 *
 *  怎么声明这是一次搬移（**必须人工填**，守卫绝不自动推断）：
 *   · `from`      搬出文件（旧）
 *   · `to`        搬入文件（新 / 拆分出的文件，可多个）
 *   · `values`    本次**搬走**的色值（小写；必须逐个列出——这是「逐值对照」的清单）
 *   · `fromValues` 搬移前 `from` 文件允许的**全部**值集（对照面：`values` 必须 ⊆ 它 ⇒ 只许搬家、不许借机加深色）
 *   · `reason`    为什么这算搬移（≥20 字；H1/H2 之外由 H5 逐条核）
 *
 *  纪律（H5 逐条机检，见 hex-hardcode-guard.test.mjs::H5）：
 *   ① 逐值对照可核：`values` 必须**已不在** `from` 当前源码里、且**已出现**在 `to` 当前源码里（是搬移、不是复制）；
 *   ② 值集合不得新增：`values` 必须 ⊆ `fromValues`（搬走的值只能是旧文件本来就允许的）；且 `to` 里不得出现
 *      「既非其原有基线允许值、也非从 `from` 搬来」的值（借搬移加深色）；
 *   ③ 非空转：文件真实存在、值集合可核、**全站 distinct 值数不得上升**（≤ `HEX_VALUE_BASELINE`）；
 *   ④ H1/H2 的收紧不被削弱：例外只覆盖本条 `to` 里点名的文件、且只覆盖本条 `values` 点名的值，其余一律照旧判红。
 *
 *  收尾：搬移批次结束、基线按新文件重设后，台账条目**保留**（它是「这次搬移合法」的凭据；删掉它，
 *   历史搬移就无从复核）。 */
export const HEX_MOVE_LEDGER = [];


/** 控件小字基线：`文件 → { c: 站点数, sig: { '标签|小字类': 处数 } }`
 *  判据对象＝`<button>` / `<a>` / `<input>` / `<select>` 的 class 里出现 text-[9px] / text-[10px] / text-[11px]
 *  （只记 `标签|小字类` 签名，不记整串 class——else 同心圆：改圆角/内边距会误伤台账） */
export const CTRL_SMALL_BASELINE = {
  'docs/src/components/inspector.js': { c: 3, sig: {"button|text-[11px]":3} },
  'docs/src/components/org-setup-wizard.js': { c: 2, sig: {"button|text-[11px]":1,"a|text-[11px]":1} },
  'docs/src/components/resolution-followup-manager.js': { c: 2, sig: {"button|text-[11px]":2} },
  'docs/src/components/work-overview.js': { c: 1, sig: {"button|text-[11px]":1} },
  'docs/src/entries/tabs/disc/attendance-tab.js': { c: 4, sig: {"button|text-[11px]":4} },
  'docs/src/entries/tabs/leader/attendance-tab.js': { c: 1, sig: {"button|text-[11px]":1} },
  'docs/src/entries/tabs/org/talent-tab.js': { c: 1, sig: {"button|text-[11px]":1} },
  'docs/src/entries/tabs/org/taskforce-tab.js': { c: 5, sig: {"button|text-[11px]":5} },
  'docs/src/entries/tabs/org/todo-tab.js': { c: 1, sig: {"button|text-[11px]":1} },
  'docs/src/entries/tabs/prop/archive-tab.js': { c: 1, sig: {"button|text-[11px]":1} },
  'docs/src/entries/tabs/secretary/workforce-panel.js': { c: 1, sig: {"button|text-[11px]":1} },
  'docs/src/entries/tabs/today/today-tab.js': { c: 1, sig: {"button|text-[11px]":1} },
};

/** 控件小字规模下限（非空转判据） */
export const CTRL_SMALL_TOTAL_BASELINE = 23;
export const CTRL_SMALL_FILE_BASELINE = 12;

/** 全站 text-[9/10/11px] 计数（含非控件落点，只作缩减进度口径） */
export const SMALL_TEXT_TOTAL_BASELINE = 370;
export const SMALL_TEXT_FILE_BASELINE = 56;
export const SMALL_TEXT_BY_VALUE_BASELINE = {"text-[11px]":321,"text-[10px]":49};
