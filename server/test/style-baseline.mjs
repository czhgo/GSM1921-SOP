// role: [工程师]+[AI]
// style-baseline.mjs — 「美学存量」基线数据（给 hex-hardcode-guard / control-font-guard 消费）
// 生成日期：2026-09-24（美学存量清理批）· 生成方式：按下方口径静态扫描 docs 全量文件后逐文件落表
// 口径与用法见两份守卫文件头部注释；本文件只放**数据**，不放判据。
// ⚠ 「收基线」= 删条目 / 减计数（缩减进度会自动前进）；**不得**为变绿而补条目或调大计数。

/** 硬编码 hex 基线：`文件 → { c: 处数, v: 该文件现存允许的 hex 值（小写） }`
 *  扫描范围＝docs 下全部 .js / .mjs / .css / .html（排除 docs/assets/vendor 第三方目录）
 *  抽取口径＝`#` + 3/4/6/8 位十六进制（CSS 颜色合法长度）+ 右侧词边界，且排除 HTML 实体（&#10003; 之类）
 *
 *  ── 存量清理（2026-09-25 美学与链接存量批）：**不改观感，逐处「原值 → 既有 :root 令牌」** ──
 *  换取原则＝只替换**与 `docs/src/styles.css :root` 令牌值逐字相等**的颜色字面量（同一位置前后色值肉眼等效：
 *  令牌值就是原字面量的值）；不做新造色、不碰 Tailwind 任意值类（`…-[#hex]`）、不碰 JS 颜色函数入参 /
 *  映射键 / `${hex}15` 类 alpha 拼接（那些 hex 是**逻辑入参**，换 var() 会坏）。5 个文件共清 **52 处**：
 *  `person-picker.css` 24→4（#9ca3af→--neutral-400 · #f3f4f6→--neutral-100 · #1f2937→--neutral-800 ·
 *  #e5e7eb→--neutral-200 · #6b7280→--neutral-500 · #d1d5db→--neutral-300 · #fde68a→--party-gold-light ·
 *  #ffffff→--neutral-0）· `roster-tab.js` 15→2（#3b82f6→--accent-blue · #ef4444→--functional-error ·
 *  #374151→--neutral-700）· `references.js` 23→17（#f3f4f6→--neutral-100 · #6b7280→--neutral-500 ·
 *  #ef4444→--functional-error）· `modal.js` 17→8（#3b82f6→--accent-blue · #ef4444→--functional-error ·
 *  #374151→--neutral-700）· `dashboard/stats.js` 19→15（#10b981→--functional-success ·
 *  #ef4444→--functional-error · #3b82f6→--functional-info · #9ca3af→--neutral-400）。
 *  ⚠ 剩下的 hex 多是**无同名令牌的 Tailwind 色阶**（#f9fafb / #fef3c7 / #94a3b8 …）或**深色态专用字面量**
 *  （`--acc-text-dark:#CBD5E1`），**不动**（不新造色）。
 *
 *  ── 存量清理（2026-09-26 美学存量清理续批）：再清 **50 处**（1957→1907），仍守同一等价性原则 ──
 *  本轮只动**「HTML `style="…"` 属性内、且与 :root 令牌值逐字相等」**的字面量（最保守的「纯 CSS 值语境」）：
 *  22 个文件 c 下调（`group-progress-tab.js` 15→7 · `signup-panel.js` 6→1 · `todo-tab.js` 6→1 ·
 *  `visitor/review-tab.js` 5→1 · `visitor/projects-tab.js` 11→10 · `assign-tab.js` 12→10 ·
 *  `report-entry.js` 6→4 · `report-inbox.js` 6→5 · `notification-tab.js` 8→7 · `today-tab.js` 8→6 ·
 *  `kanban-tab.js` 8→5 · `tasks-tab.js` 9→6 · `archive-tab.js` 4→2 · `writing`/`activity-entry`/`activities-tab`/
 *  `development-tab`/`members-tab`/`tab-bar`/`issue-list`/`taskforce-view`/`leader/write-tab` 各 −1~−2）；
 *  `taskforce-entry.js` 唯一一处清空 ⇒ 删条目（文件数 92→91）。
 *  ⚠ **有意不碰**（同批已核）：① `var(--app-accent, #B91C1C)` 兜底字面量——§2.8 兜底规则**明文规定**该写法
 *  （「归档/反馈/通知等非工作台页回退党建红 `#B91C1C`」），属**文档化约定**而非游离 hardcode；② `--acc-*-dark`
 *  深色态字面量（`#F87171`/`#FCA5A5` 等，本轮曾误改 7 处、已逐处还原）；③ JS 对象映射 **keys**（`{'#CE1126':…}`）
 *  与 `${c}15` 类 **alpha 拼接**（如 `taskforce-view.js::dotDarkVars`，换 `var()` 会拼坏）；④ Tailwind 任意值类
 *  `…-[#hex]`；⑤ 禁改文件（`styles.css` / `inspector.js` / `work-overview.js` / `secretary/overview-tab.js`）
 *  与 H4 top5 特批文件（`help.html` / `about.css` / `constants.js` / `taskforce-tab.js`）。
 *
 *  ── 存量清理（2026-09-26 美学存量清理末批 · 特批解禁批）：再清 **16 处**（1907→1891），口径与前两批同 ──
 *  支书「未完成的工作全面完成」⇒ 前几批标「需支书特批」的文件本批视为已特批，逐项处置：
 *  ① 仍守「HTML `style="…"` 属性内 + 与 `:root` 令牌值逐字等值 + 非 `var()` 兜底 + 非 `--acc-*-dark`
 *     深色态字面量 + 非 JS 函数入参」的最保守口径，清 16 处（5 个文件 c 下调）：
 *     `inspector.js` 23→19（#CE1126→--party-red ×3 · #9CA3AF→--neutral-400 ×1）·
 *     `work-overview.js` 16→12（#F59E0B→--functional-warning ×2 · #EF4444→--functional-error ×1 ·
 *     #3B82F6→--functional-info ×1）· `taskforce-tab.js` 58→54（#10B981→--functional-success ×3 ·
 *     #CE1126→--party-red ×1）· `secretary/overview-tab.js` 30→27（#EF4444→--functional-error ×1 ·
 *     #F59E0B→--functional-warning ×1 · #0EA5E9→--accent-sky ×1）·
 *     `disc/attendance-tab.js` 20→19（#0EA5E9→--accent-sky ×1）。
 *  ② **有意不碰**（逐处理由见执行报告）：`--tint:<hex>` 内联颜色变量（深色由 CSS color-mix + 单独
 *     `--acc-text-dark` 驱动，token 化会二次适配 ⇒ 改深色渲染）；`dotDarkVars('#hex')` 一类**函数入参**
 *     （函数按 hex 串查 `_TEXT_DARK_MAP` 映射表，换成 `var()` 会查不到 ⇒ 深色圆点回退浅色）；
 *     `#B91C1C`（与 `:root` 等值的只有角色识别色 `--accent-secretary/-deputy-secretary`，按值换令牌会把
 *     §2.8-①品牌统一层的党建红错标成②角色识别色）。
 *  ③ 同批 `about.css`（50 处）进 `EXCEPTIONS`：关于页＝文档页（§4.18.1），自带作用域隔离的 `--ab-*`
 *     暖纸色板，无全局同名令牌 ⇒ 不可清（不许新造色）。`help.html` 例外理由订正（其内联 `<style>` 是文档页
 *     调色板；`@media print` **不在** help.html，在 `docs/src/styles.css:4313`，且打印段用的是 `white`
 *     关键字与 `var()`，无需显式 hex）。
 *  ④ **`HEX_TOTAL_BASELINE` 有意保持 2025**（存量起点）：H4 据此显示 ↓134（2025−1891）。
 *     条目数 91 不变（无文件清零）；全站 distinct 值仍 168（被清的值在别处仍存）。
 *
 *  ── 存量清理（2026-09-26 · 深色覆盖段 token 化批）：再清 **138 处**（1891→1753），口径＝「深色段字面量 → var(--*)」──
 *  支书裁定（2026-09-26，本批）：把 `docs/src/styles.css` **深色覆盖段**（`html.theme-dark …` 规则体）里**与该段令牌深色值逐字相等**
 *  的颜色字面量换成 `var(--*)`。**等价性是硬前提**：这些规则只在 `html.theme-dark` 下匹配，被引令牌全站仅在
 *  `:root`（浅色）与 `html.theme-dark`（深色）定义过（无元素级/内联覆盖）⇒ `var()` 在此段解析出的值 ＝ 原字面量
 *  （逐字节等价），**浅色态不受影响**（这些规则在浅色下不匹配）。只动 `styles.css`（唯一 c 变动：467 → 329）。
 *  · 取令牌按**值对齐**：`#141D2F→--surface-card` · `#1A2438→--surface-elevated` · `#0B1220→--surface-page` ·
 *    `#111827→--neutral-50` · `#1E293B→--neutral-100` · `#334155→--neutral-200` · `#475569→--neutral-300` ·
 *    `#94A3B8→--neutral-400`（`.text-gray-400`）/`--neutral-500`（其余灰字）· `#CBD5E1→--neutral-600` ·
 *    `#E2E8F0→--neutral-700` · `#F1F5F9→--neutral-800` · `#F8FAFC→--neutral-900` ·
 *    `#34D399→--functional-success` · `#FBBF24→--functional-warning` · `#F87171→--functional-error` ·
 *    `#60A5FA→--functional-info`。⚠ `#1E293B`＝`--neutral-100` **也**＝`--surface-hover`（深色同值）⇒ 取名只是**名义**
 *    （等价性不受影响），本批**统一取中性阶**以免同名歧义。取值不新增、令牌取值一字未改。
 *  · **有意不碰**（同批已核，逐处理由见执行报告）：① `var(--acc-border-dark, #334155)` 的**兜底字面量**
 *    （§2.8 兜底约定，属「var 兜底」档，非「深色段属性值」档）；② 深色段内**不等于任何深色令牌值**的 80 处
 *    （`#64748B` · `#243244` · `#FB923C` · `#FCA5A5` · `#93C5FD` · `#4ADE80` · `#38BDF8` · `#A78BFA` ·
 *    `#22D3EE` · `#C4B5FD` · `#FDBA74` · `#FDE68A` · `#D97706` · `#1B1E24` · `#8A6D1F` · `#D4AF37` · `#C9A227` ·
 *    `#BEF264` · `#A3E635` · `#67E8F9` · `#6EE7B7` · `#FACC15` · `#86EFAC` · `#FCD34D` · `#FDE047` · `#D8B4FE` ·
 *    `#FDA4AF` · `#7DD3FC` · `#5EEAD4` · `#AEB6C2` · 及 `var()` 兜底 `#B91C1C`/`#CE1126`/`#6366F1`/`#6B7280`/
 *    混合目标 `#FFFFFF`/`#fff`）——**无同名深色令牌**，硬换会变观感（不新造色）；③ 令牌定义块
 *    `html.theme-dark { … }`（其 23 处 hex 是**令牌定义本身**）不动。
 *  · `HEX_TOTAL_BASELINE` **仍保持 2025**（存量起点）⇒ H4 本批显示 ↓272（2025−1753）；条目数 91 不变
 *    （无文件清零）；全站 distinct 值仍 168（被清的值仍存于令牌定义处）。**H5 不加条目**：本批是**同文件内
 *    字面量 → var()**，不是文件间搬移（`HEX_MOVE_LEDGER` 的 ①②③ 判据——值须已离开 `from`、已进入 `to`——不适用）。 */

// ── 存量清理（2026-09-26 · `core/constants.js` 色值单一源批）：清 **70 处**（该文件 137→67）──
// 口径＝「裸 hex 字面量 → **同文件内唯一色值表 `_C` 的语义令牌名**」（**不是**跨文件搬移 ⇒ `HEX_MOVE_LEDGER` 不登记）：
//   · 映射键族 `_TEXT_DARK_MAP`（50 处）改为 `[_C.x]: _C.y`，由 `_C` 派生；
//   · 值 / 入参 / 兜底字面量 63 处改 `_C.*`（ROLE_COLORS · ACTIVITY_CAT_COLOR · ACCENT_COLORS · ACCENT_PALETTE ·
//     DEEP_ACCENT_RULES · solidAccentStyle · _ACTIVITY_TYPE_BASE · ACTIVITY_CLASSIFICATION · 两处 `|| '#CBD5E1'` 兜底）；
//   · 注释 / jsdoc 里 24 处 hex **保留**（说明性文字，非逻辑字面量）。
// 43 个色值此后各只出现一次（都在 `_C` 表内）；**值集合一字未变**（distinct 仍 45：注释里的 `#d4af37` / `#fee2e2` 仍在）
//   ⇒ H1/H2 判据不受影响，仅该文件 c 137→67（全站 distinct 168 与条目数 91 均不变）。

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
  'docs/src/components/dashboard/stats.js': { c: 15, v: [
      '#059669', '#3b82f6', '#94a3b8', '#9ca3af', '#d1d5db', '#d97706', '#dc2626', '#f59e0b', '#f97316',
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
  'docs/src/components/inspector.js': { c: 19, v: [
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
  'docs/src/components/issue-list.js': { c: 14, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#991b1b', '#a16207', '#ce1126', '#f87171',
      '#fbbf24',
  ] },
  'docs/src/components/member-change-panel.js': { c: 1, v: [
      '#b91c1c',
  ] },
  'docs/src/components/modal.js': { c: 8, v: [
      '#b91c1c', '#cbd5e1', '#f87171',
  ] },
  'docs/src/components/org-setup-wizard.js': { c: 18, v: [
      '#16a34a', '#c8102e', '#ce1126', '#ef4444', '#ffd700', '#fff',
  ] },
  'docs/src/components/overview-dispatch-bar.js': { c: 1, v: [
      '#b91c1c',
  ] },
  'docs/src/components/person-picker.css': { c: 4, v: [
      '#92400e', '#f9fafb', '#fef3c7',
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
  'docs/src/components/report-entry.js': { c: 4, v: [
      '#b91c1c', '#fff',
  ] },
  'docs/src/components/report-inbox.js': { c: 5, v: [
      '#16a34a', '#b91c1c', '#ef4444', '#f59e0b', '#f87171',
  ] },
  'docs/src/components/signup-panel.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/components/status-badge.js': { c: 1, v: [
      '#9ca3af',
  ] },
  'docs/src/components/tab-bar.js': { c: 4, v: [
      '#000', '#334155', '#b91c1c', '#ffd700',
  ] },
  'docs/src/components/taskforce-view.js': { c: 24, v: [
      '#000', '#0d9488', '#10b981', '#10b98115', '#34d399', '#3b82f6', '#60a5fa', '#6366f1', '#6b7280',
      '#94a3b8', '#a5b4fc', '#d97706', '#dc2626', '#f87171', '#fbbf24',
  ] },
  'docs/src/components/work-overview.js': { c: 12, v: [
      '#0ea5e9', '#16a34a', '#4f46e5', '#60a5fa', '#94a3b8', '#b91c1c', '#cbd5e1', '#ef4444', '#f59e0b',
  ] },
  'docs/src/components/workspace-shell.js': { c: 1, v: [
      '#c8102e',
  ] },
  'docs/src/core/constants.js': { c: 67, v: [
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
  'docs/src/entries/activity-entry.js': { c: 10, v: [
      '#000', '#6b7280', '#94a3b8', '#a16207', '#ce1126', '#f87171', '#fbbf24', '#fde68a', '#ffd700',
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
  'docs/src/entries/tabs/disc/attendance-tab.js': { c: 19, v: [
      '#000', '#14b8a6', '#16a34a', '#94a3b8', '#b91c1c', '#ef4444', '#f59e0b', '#fff',
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
  'docs/src/entries/tabs/leader/members-tab.js': { c: 5, v: [
      '#000', '#60a5fa', '#b91c1c', '#fff',
  ] },
  'docs/src/entries/tabs/leader/review-tab.js': { c: 1, v: [
      '#fbbf24',
  ] },
  'docs/src/entries/tabs/leader/write-tab.js': { c: 22, v: [
      '#000', '#0e7490', '#10b981', '#1e293b', '#334155', '#3b82f6', '#475569', '#6b7280', '#94a3b8',
      '#cbd5e1', '#ce1126', '#d1d5db', '#d97706', '#e5e7eb',
  ] },
  'docs/src/entries/tabs/org/development-tab.js': { c: 8, v: [
      '#000', '#06b6d4', '#10b981', '#334155', '#3b82f6', '#e5e7eb', '#f59e0b',
  ] },
  'docs/src/entries/tabs/org/inspection-tab.js': { c: 1, v: [
      '#000',
  ] },
  'docs/src/entries/tabs/org/roster-tab.js': { c: 2, v: [
      '#cbd5e1',
  ] },
  'docs/src/entries/tabs/org/talent-tab.js': { c: 1, v: [
      '#67e8f9',
  ] },
  'docs/src/entries/tabs/org/taskforce-tab.js': { c: 54, v: [
      '#000', '#0d9488', '#10b981', '#10b98115', '#34d399', '#3b82f6', '#60a5fa', '#6366f1', '#6b7280',
      '#8b5cf6', '#94a3b8', '#a5b4fc', '#b91c1c', '#c4b5fd', '#d97706', '#dc2626', '#f87171', '#fbbf24',
      '#fff',
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
  'docs/src/entries/tabs/prop/archive-tab.js': { c: 2, v: [
      '#60a5fa', '#999',
  ] },
  'docs/src/entries/tabs/prop/kanban-tab.js': { c: 5, v: [
      '#000', '#60a5fa', '#94a3b8', '#ce1126',
  ] },
  'docs/src/entries/tabs/prop/tasks-tab.js': { c: 6, v: [
      '#000', '#34d399', '#60a5fa', '#fbbf24',
  ] },
  'docs/src/entries/tabs/secretary/assign-tab.js': { c: 10, v: [
      '#b91c1c', '#f87171', '#fff',
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
  'docs/src/entries/tabs/secretary/group-progress-tab.js': { c: 7, v: [
      '#16a34a', '#ce1126', '#ef4444', '#f59e0b', '#fbbf24',
  ] },
  'docs/src/entries/tabs/secretary/notification-tab.js': { c: 7, v: [
      '#b91c1c', '#ce1126', '#fff',
  ] },
  'docs/src/entries/tabs/secretary/overview-tab.js': { c: 27, v: [
      '#16a34a', '#38bdf8', '#3b82f6', '#94a3b8', '#b91c1c', '#d97706', '#ef4444', '#f59e0b', '#fbbf24',
      '#fff',
  ] },
  'docs/src/entries/tabs/secretary/report-up-tab.js': { c: 5, v: [
      '#16a34a', '#6b7280', '#c8102e', '#d97706',
  ] },
  'docs/src/entries/tabs/secretary/todo-tab.js': { c: 1, v: [
      '#6b7280',
  ] },
  'docs/src/entries/tabs/secretary/work-map-tab.js': { c: 5, v: [
      '#000', '#b91c1c', '#cbd5e1', '#fff',
  ] },
  'docs/src/entries/tabs/today/today-tab.js': { c: 6, v: [
      '#000', '#9ca3af', '#b91c1c', '#ef4444',
  ] },
  'docs/src/entries/tabs/visitor/activities-tab.js': { c: 11, v: [
      '#6b7280', '#ce1126', '#f9fafb', '#fca5a5',
  ] },
  'docs/src/entries/tabs/visitor/attendance-tab.js': { c: 2, v: [
      '#3b82f6',
  ] },
  'docs/src/entries/tabs/visitor/inspection-tab.js': { c: 2, v: [
      '#000', '#f3f4f6',
  ] },
  'docs/src/entries/tabs/visitor/projects-tab.js': { c: 10, v: [
      '#000', '#b91c1c', '#fca5a5', '#fff',
  ] },
  'docs/src/entries/tabs/visitor/review-tab.js': { c: 1, v: [
      '#fbbf24',
  ] },
  'docs/src/entries/tabs/visitor/todo-tab.js': { c: 3, v: [
      '#a16207', '#fbbf24', '#ffd700',
  ] },
  'docs/src/entries/wizard-entry.js': { c: 2, v: [
      '#c8102e',
  ] },
  'docs/src/modules/references.js': { c: 17, v: [
      '#047857', '#1d4ed8', '#b45309', '#c8102e', '#d1fae5', '#dbeafe', '#ecfdf5', '#fef3c7',
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
  'docs/src/styles.css': { c: 329, v: [
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
//   2026-09-25 存量清理批再清 52 处（5 个文件 c 下调，见上 HEX_BASELINE 头注）⇒ H4 现显示 ↓68（2025−1957）；
//   条目数不变（92，无文件清零）；全站 distinct 值仍为 168（被清的值在其它文件仍存）。
//   2026-09-26 续批再清 50 处 ⇒ H4 现显示 ↓118（2025−1907）；`taskforce-entry.js` 清零删条目 ⇒ 条目数 92→91
//   （H3「条目数 ＝ 声明文件数」同步）；全站 distinct 值仍为 168（仍无值消失至零）。
//   2026-09-26 末批（特批解禁）再清 16 处 ⇒ 1907→1891（H4 ↓134）。
//   2026-09-26 深色覆盖段 token 化批再清 138 处（`styles.css` c 467→329，见上 HEX_BASELINE 头注）
//   ⇒ H4 现显示 ↓272（2025−1753）；条目数仍 91；全站 distinct 值仍为 168（被清的值仍存于令牌定义处，
//   **H5 不加条目**——本批是同文件内「字面量 → var()」，非文件间搬移）。
export const HEX_FILE_BASELINE = 91;
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
 *  （只记 `标签|小字类` 签名，不记整串 class——else 同心圆：改圆角/内边距会误伤台账）
 *
 *  收基线（2026-09-25 美学与链接存量批）：**14 处已改准档位**（`text-[11px]` → `text-[13px]`，控件单档 13px）
 *  ——`org-setup-wizard.js`(2) · `resolution-followup-manager.js`(2) · `disc/attendance-tab.js`(4) ·
 *  `org/talent-tab.js`(1) · `org/todo-tab.js`(1) · `prop/archive-tab.js`(1) · `secretary/workforce-panel.js`(1) ·
 *  `today/today-tab.js`(1) · `leader/attendance-tab.js`(1)；这 9 个文件控件小字已清零 ⇒ 按收基线纪律**删除条目**。
 *  台账 12 文件 / 23 处 ⇒ **3 文件 / 9 处**（下表仅剩「本批不动」的 3 个文件，逐条理由见下）。
 *
 *  收基线（2026-09-26 美学存量清理续批）：`org/taskforce-tab.js` 5 处已改准档位（`text-[11px]`→`text-[13px]`，
 *  **只改字号档、padding 一字不动**）——上一批因「本批任务明列绝不改」而保留，本批该禁令已解 ⇒ 清掉该 5 处。
 *  该文件控件小字清零 ⇒ 删条目。台账 3 文件 / 9 处 ⇒ **2 文件 / 4 处**（仅剩 README 禁改清单 2 文件）。*
 *
 *  收基线（2026-09-26 美学存量清理末批 · 特批解禁批）：README 禁改清单**本批已特批** ⇒ 最后 4 处
 *  （`inspector.js` 3 处 · `work-overview.js` 1 处）也改准档位（`text-[11px]`→`text-[13px]`，**padding 一字未动**）。
 *  两文件控件小字**清零** ⇒ 按收基线纪律**删条目** ⇒ 台账 **0 文件 / 0 处**（全站控件小字存量归零）。
 *  ⚠ 台账清空后「非空转」不再靠数字下限，改由 **T3 的「空台账 ⇒ 全站实测须为 0」**判据承担（更强：
 *   台账被删空而存量还在时判红）；`CTRL_SMALL_TOTAL_BASELINE` / `CTRL_SMALL_FILE_BASELINE` 随之下调为 0。 */
export const CTRL_SMALL_BASELINE = {};

/** 控件小字规模下限（非空转判据）
 *  ⚠ 2026-09-25 随收基线**下调** 12→3 文件 / 23→9 处；2026-09-26 续批再下调 3→2 文件 / 9→4 处
 *   （`org/taskforce-tab.js` 5 处清零删条目）；**末批再把最后 2 文件 / 4 处清零 ⇒ 两台账均归 0**。
 *  此值只是「防台账被悄悄删空」的二级防呆；台账空置后，真正的防线是 T1（新增即红）与
 *   T3 的「空台账 ⇒ 全站实测控件小字必须为 0」（存量还在却把台账删空即红）。
 *   **不得**为变绿把它继续调大或补条目。 */
export const CTRL_SMALL_TOTAL_BASELINE = 0;
export const CTRL_SMALL_FILE_BASELINE = 0;

/** 全站 text-[9/10/11px] 计数（含非控件落点，只作缩减进度口径）
 *  口径变更（2026-09-26 末批）：`text-[9px]`/`text-[10px]` 定为**禁止档**（低于 §3.2 档位表最低档
 *   Overline 11px；判据与守卫＝`server/test/small-text-guard.test.mjs`）⇒ 现存 28 处 `text-[10px]`
 *   全数改到 `text-[11px]`（档位表内 Overline 档）。故按值基线由 `{'text-[11px]':321,'text-[10px]':49}`
 *   改写为 `{'text-[11px]':362,'text-[10px]':0}`（**不是**「为变绿补条目」——总量口径始终只报不判，
 *   此改是让台账与「9/10px 禁止」的新口径一致）。`SMALL_TEXT_TOTAL_BASELINE` 保持 370 起点不动。 */
export const SMALL_TEXT_TOTAL_BASELINE = 370;
export const SMALL_TEXT_FILE_BASELINE = 56;
export const SMALL_TEXT_BY_VALUE_BASELINE = {"text-[11px]":362,"text-[10px]":0};
