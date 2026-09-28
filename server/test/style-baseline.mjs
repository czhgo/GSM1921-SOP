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

// ── 存量清理（2026-09-28 · 色彩二分批）：清 **74 处**（1619→1545）──
// 口径＝「`var(--tok, <硬编码兜底>)` 且 `--tok` 已在 `:root` 有正式默认值 ⇒ 删兜底（逐字等值 ⇒ 零观感变化）」＋
//   「`#EF4444`→`var(--functional-error)`（值等 ⇒ 零变化）」。含与 `classList.toggle(同一字面量)` 成对耦合的
//   Tailwind 任意值类 `[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]`——类串与 toggle 字面量含同一子串，
//   一次子串替换即成对同步；**23 文件 c 下调**（清单与「改前→改后」见执行报告）；`docs/src/services/governance/issues.js` 清零 ⇒ 删条目（81→80）。
//   distinct 值仍 167；`HEX_TOTAL_BASELINE` 有意保持 2025。**有意不碰**见下方 `HEX_FILE_BASELINE` 前的本批注。

export const HEX_BASELINE = {
  'docs/help.html': { c: 568, v: [
      '#0369a1', '#047857', '#059669', '#06b6d4', '#0891b2', '#10b981',
      '#111827', '#15803d', '#1d4ed8', '#1f2937', '#2563eb', '#374151',
      '#3b82f6', '#4b5563', '#4d7c0f', '#65a30d', '#6b7280', '#7a0010',
      '#7c3aed', '#7c5a14', '#86efac', '#8b5cf6', '#92400e', '#93c5fd',
      '#991b1b', '#9a3412', '#9ca3af', '#a7f3d0', '#b45309', '#b91c1c',
      '#bae6fd', '#ce1126', '#d1d5db', '#d97706', '#e5e7eb', '#ecfdf5',
      '#edeef0', '#eeeff2', '#f0dfa8', '#f1f2f4', '#f3f4f6', '#f6d1d1',
      '#f8f9fa', '#fafaf5', '#fafaf9', '#fca5a5', '#fcfcfb', '#fdba74',
      '#fde68a', '#fdf2f2', '#fdfbf4', '#fecaca', '#fef2f2', '#ffd700',
      '#fff', '#fffbeb', '#fffbfb', '#ffffff'
  ] },
  'docs/login.html': { c: 5, v: [
      '#7a0010', '#9b0000', '#ce1126', '#e5e7eb', '#fecaca'
  ] },
  // `docs/settings.html` 条目已于 2026-09-25 移除（收基线）：该页整体重做后
  //   页面级 <style> 归零、页面内硬编码 hex 清零 ⇒ 按本守卫自身纪律（收基线＝删条目）删去。
  'docs/src/about.css': { c: 50, v: [
      '#14161a', '#1b1e24', '#22262d', '#33383f', '#3b3226', '#6c6254',
      '#756b5d', '#7c5c14', '#7e7870', '#94897a', '#948e85', '#a80f1c',
      '#a9a398', '#aba191', '#c9a227', '#ce1126', '#e3c24f', '#e6dfd2',
      '#e8e4dc', '#f0ebe2', '#f6f2eb', '#faf8f4', '#fbe9e4', '#fdf1ea',
      '#fff', '#fff8ee', '#fffdf6'
  ] },
  'docs/src/components/record/activity-view.js': { c: 4, v: [
      '#16a34a', '#9ca3af', '#d97706'
  ] },
  'docs/src/components/shell/appearance-controls.js': { c: 5, v: [
      '#000', '#b91c1c', '#fff'
  ] },
  'docs/src/components/ui/badge.js': { c: 5, v: [
      '#6b7280', '#a16207', '#f3f4f6', '#fde68a', '#fef3c7'
  ] },
  'docs/src/components/record/calendar.js': { c: 11, v: [
      '#000', '#fff'
  ] },
  'docs/src/components/dashboard/activity-panel.js': { c: 4, v: [
      '#000', '#6b7280', '#f9fafb', '#fff'
  ] },
  'docs/src/components/dashboard/gallery.js': { c: 19, v: [
      '#6b7280', '#a7f3d0', '#bae6fd', '#bfdbfe', '#c4b5fd', '#d9f99d',
      '#e5e7eb', '#ecfdf5', '#eff6ff', '#f0f9ff', '#f5f3ff', '#f7fee7',
      '#f9fafb', '#fbcfe8', '#fde68a', '#fdf2f8', '#fecaca', '#fef2f2',
      '#fffbeb'
  ] },
  'docs/src/components/dashboard/stats.js': { c: 15, v: [
      '#059669', '#3b82f6', '#94a3b8', '#9ca3af', '#d1d5db', '#d97706',
      '#dc2626', '#f59e0b', '#f97316'
  ] },
  'docs/src/components/shell/header.js': { c: 5, v: [
      '#000', '#7a0010', '#fff', '#ffffff'
  ] },
  'docs/src/components/record/insight-view.js': { c: 2, v: [
      '#000', '#fff'
  ] },
  'docs/src/components/record/inspector.js': { c: 19, v: [
      '#15803d', '#16a34a', '#34d399', '#4ade80', '#60a5fa', '#92400e',
      '#9ca3af', '#b91c1c', '#ce1126', '#d97706', '#f87171', '#fbbf24'
  ] },
  'docs/src/components/feedback/issue-detail.js': { c: 12, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#a16207',
      '#ce1126', '#f87171', '#fbbf24', '#fff'
  ] },
  'docs/src/components/feedback/issue-form.js': { c: 9, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#a16207',
      '#ce1126', '#f87171', '#fbbf24'
  ] },
  'docs/src/components/feedback/issue-list.js': { c: 14, v: [
      '#000', '#2563eb', '#60a5fa', '#6b7280', '#94a3b8', '#991b1b',
      '#a16207', '#ce1126', '#f87171', '#fbbf24'
  ] },
  'docs/src/components/governance/member-change-panel.js': { c: 1, v: [
      '#b91c1c'
  ] },
  'docs/src/components/ui/modal.js': { c: 6, v: [
      '#cbd5e1', '#f87171'
  ] },
  'docs/src/components/governance/org-setup-wizard.js': { c: 8, v: [
      '#16a34a', '#ce1126', '#ef4444', '#ffd700', '#fff'
  ] },
  'docs/src/components/governance/overview-dispatch-bar.js': { c: 1, v: [
      '#b91c1c'
  ] },
  'docs/src/components/person-picker.css': { c: 4, v: [
      '#92400e', '#f9fafb', '#fef3c7'
  ] },
  'docs/src/components/governance/person-picker.js': { c: 8, v: [
      '#000', '#047857', '#1d4ed8', '#6b7280', '#991b1b', '#a16207',
      '#ce1126'
  ] },
  'docs/src/components/governance/query-view.js': { c: 2, v: [
      '#3b82f6'
  ] },
  'docs/src/components/feedback/reactions.js': { c: 10, v: [
      '#000', '#059669', '#1e293b', '#334155', '#3b82f6', '#6b7280',
      '#cbd5e1', '#d97706', '#dc2626', '#f3f4f6'
  ] },
  'docs/src/components/record/report-entry.js': { c: 3, v: [
      '#b91c1c', '#fff'
  ] },
  'docs/src/components/record/report-inbox.js': { c: 5, v: [
      '#16a34a', '#b91c1c', '#ef4444', '#f59e0b', '#f87171'
  ] },
  'docs/src/components/ui/status-badge.js': { c: 1, v: [
      '#9ca3af'
  ] },
  'docs/src/components/shell/tab-bar.js': { c: 4, v: [
      '#000', '#334155', '#b91c1c', '#ffd700'
  ] },
  'docs/src/components/record/taskforce-view.js': { c: 24, v: [
      '#000', '#0d9488', '#10b981', '#10b98115', '#34d399', '#3b82f6',
      '#60a5fa', '#6366f1', '#6b7280', '#94a3b8', '#a5b4fc', '#d97706',
      '#dc2626', '#f87171', '#fbbf24'
  ] },
  'docs/src/components/governance/work-overview.js': { c: 12, v: [
      '#0ea5e9', '#16a34a', '#4f46e5', '#60a5fa', '#94a3b8', '#b91c1c',
      '#cbd5e1', '#ef4444', '#f59e0b'
  ] },
  'docs/src/core/constants.js': { c: 67, v: [
      '#000', '#0369a1', '#047857', '#059669', '#0e7490', '#0ea5e9',
      '#10b981', '#16a34a', '#1d4ed8', '#22c55e', '#22d3ee', '#2563eb',
      '#34d399', '#38bdf8', '#3b82f6', '#4ade80', '#4b5563', '#4f46e5',
      '#60a5fa', '#6b7280', '#7c3aed', '#7dd3fc', '#92400e', '#94a3b8',
      '#991b1b', '#9b0000', '#a16207', '#a5b4fc', '#a78bfa', '#b91c1c',
      '#c2410c', '#c4b5fd', '#cbd5e1', '#ce1126', '#d4af37', '#d97706',
      '#dc2626', '#f87171', '#fb923c', '#fbbf24', '#fee2e2', '#fef2f2',
      '#fefce8', '#ffd700', '#fff'
  ] },
  'docs/src/core/data-adapter.js': { c: 7, v: [
      '#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f9fafb',
      '#fff'
  ] },
  'docs/src/core/icons.js': { c: 1, v: [
      '#fff'
  ] },
  'docs/src/core/utils.js': { c: 15, v: [
      '#16a34a', '#1e293b', '#1f2937', '#3b82f6', '#e2e8f0', '#ef4444',
      '#eff6ff', '#f0fdf4', '#fef2f2', '#fff'
  ] },
  'docs/src/entries/pages/about-entry.js': { c: 20, v: [
      '#0e7490', '#0ea5e9', '#15803d', '#2563eb', '#64748b', '#6b7280',
      '#900', '#b91c1c', '#c2410c', '#ce1126', '#f87171', '#fee',
      '#ffd700'
  ] },
  'docs/src/entries/pages/activity-entry.js': { c: 10, v: [
      '#000', '#6b7280', '#94a3b8', '#a16207', '#ce1126', '#f87171',
      '#fbbf24', '#fde68a', '#ffd700'
  ] },
  'docs/src/entries/pages/archive-entry.js': { c: 1, v: [
      '#6b7280'
  ] },
  'docs/src/entries/pages/help-entry.js': { c: 4, v: [
      '#7a0010', '#ce1126', '#d1d5db', '#fdf2f2'
  ] },
  'docs/src/entries/pages/settings-entry.js': { c: 6, v: [
      '#fff'
  ] },
  'docs/src/entries/tabs/disc/attendance-tab.js': { c: 13, v: [
      '#000', '#14b8a6', '#16a34a', '#94a3b8', '#ef4444', '#f59e0b',
      '#fff'
  ] },
  'docs/src/entries/tabs/disc/inspection-tab.js': { c: 6, v: [
      '#000', '#94a3b8', '#b45309', '#fff'
  ] },
  'docs/src/entries/tabs/disc/review-tab.js': { c: 1, v: [
      '#fbbf24'
  ] },
  'docs/src/entries/tabs/leader/attendance-tab.js': { c: 1, v: [
      '#000'
  ] },
  'docs/src/entries/tabs/leader/inspection-tab.js': { c: 1, v: [
      '#000'
  ] },
  'docs/src/entries/tabs/leader/members-tab.js': { c: 3, v: [
      '#000', '#60a5fa', '#fff'
  ] },
  'docs/src/entries/tabs/leader/review-tab.js': { c: 1, v: [
      '#fbbf24'
  ] },
  'docs/src/entries/tabs/leader/write-tab.js': { c: 22, v: [
      '#000', '#0e7490', '#10b981', '#1e293b', '#334155', '#3b82f6',
      '#475569', '#6b7280', '#94a3b8', '#cbd5e1', '#ce1126', '#d1d5db',
      '#d97706', '#e5e7eb'
  ] },
  'docs/src/entries/tabs/org/development-tab.js': { c: 8, v: [
      '#000', '#06b6d4', '#10b981', '#334155', '#3b82f6', '#e5e7eb',
      '#f59e0b'
  ] },
  'docs/src/entries/tabs/org/inspection-tab.js': { c: 1, v: [
      '#000'
  ] },
  'docs/src/entries/tabs/org/talent-tab.js': { c: 1, v: [
      '#67e8f9'
  ] },
  'docs/src/entries/tabs/org/taskforce-tab.js': { c: 46, v: [
      '#000', '#0d9488', '#10b981', '#10b98115', '#34d399', '#3b82f6',
      '#60a5fa', '#6366f1', '#6b7280', '#8b5cf6', '#94a3b8', '#a5b4fc',
      '#c4b5fd', '#d97706', '#dc2626', '#f87171', '#fbbf24', '#fff'
  ] },
  'docs/src/entries/tabs/org/thought-review-tab.js': { c: 1, v: [
      '#000'
  ] },
  'docs/src/entries/tabs/org/todo-tab.js': { c: 1, v: [
      '#3b82f6'
  ] },
  'docs/src/entries/tabs/prop/archive-tab.js': { c: 2, v: [
      '#60a5fa', '#999'
  ] },
  'docs/src/entries/tabs/prop/kanban-tab.js': { c: 5, v: [
      '#000', '#60a5fa', '#94a3b8', '#ce1126'
  ] },
  'docs/src/entries/tabs/prop/tasks-tab.js': { c: 6, v: [
      '#000', '#34d399', '#60a5fa', '#fbbf24'
  ] },
  'docs/src/entries/tabs/secretary/assign-tab.js': { c: 3, v: [
      '#f87171', '#fff'
  ] },
  'docs/src/entries/tabs/secretary/calendar-tab.js': { c: 7, v: [
      '#ce1126', '#ffd700', '#fff'
  ] },
  'docs/src/entries/tabs/secretary/feedback-tab.js': { c: 1, v: [
      '#fff'
  ] },
  'docs/src/entries/tabs/secretary/group-progress-tab.js': { c: 7, v: [
      '#16a34a', '#ce1126', '#ef4444', '#f59e0b', '#fbbf24'
  ] },
  'docs/src/entries/tabs/secretary/notification-tab.js': { c: 4, v: [
      '#ce1126', '#fff'
  ] },
  'docs/src/entries/tabs/secretary/overview-tab.js': { c: 19, v: [
      '#16a34a', '#38bdf8', '#3b82f6', '#94a3b8', '#d97706', '#ef4444',
      '#f59e0b', '#fbbf24', '#fff'
  ] },
  'docs/src/entries/tabs/secretary/report-up-tab.js': { c: 3, v: [
      '#16a34a', '#6b7280', '#d97706'
  ] },
  'docs/src/entries/tabs/secretary/todo-tab.js': { c: 1, v: [
      '#6b7280'
  ] },
  'docs/src/entries/tabs/secretary/work-map-tab.js': { c: 3, v: [
      '#000', '#cbd5e1', '#fff'
  ] },
  'docs/src/entries/tabs/today/today-tab.js': { c: 4, v: [
      '#000', '#9ca3af'
  ] },
  'docs/src/entries/tabs/visitor/activities-tab.js': { c: 11, v: [
      '#6b7280', '#ce1126', '#f9fafb', '#fca5a5'
  ] },
  'docs/src/entries/tabs/visitor/attendance-tab.js': { c: 2, v: [
      '#3b82f6'
  ] },
  'docs/src/entries/tabs/visitor/inspection-tab.js': { c: 1, v: [
      '#000'
  ] },
  'docs/src/entries/tabs/visitor/projects-tab.js': { c: 6, v: [
      '#000', '#fca5a5', '#fff'
  ] },
  'docs/src/entries/tabs/visitor/review-tab.js': { c: 1, v: [
      '#fbbf24'
  ] },
  'docs/src/entries/tabs/visitor/todo-tab.js': { c: 3, v: [
      '#a16207', '#fbbf24', '#ffd700'
  ] },
  'docs/src/modules/references.js': { c: 16, v: [
      '#047857', '#1d4ed8', '#b45309', '#d1fae5', '#dbeafe', '#ecfdf5',
      '#fef3c7'
  ] },
  'docs/src/services/branch/branch-doc.js': { c: 1, v: [
      '#b45309'
  ] },
  'docs/src/services/activity/decision-tree.js': { c: 4, v: [
      '#ce1126', '#ffd700'
  ] },
  'docs/src/components/governance/notice-view.js': { c: 2, v: [
      '#3b82f6', '#fff'
  ] },
  'docs/src/services/branch/org-wizard-report.js': { c: 4, v: [
      '#ce1126', '#ffd700'
  ] },
  'docs/src/styles.css': { c: 304, v: [
      '#000', '#0284c7', '#059669', '#0b1220', '#0ea5e9', '#0f172a',
      '#10b981', '#111827', '#141d2f', '#15803d', '#1a2438', '#1b1e24',
      '#1d4ed8', '#1e293b', '#1f2937', '#22c55e', '#22d3ee', '#243244',
      '#2563eb', '#2a1a22', '#334155', '#34d399', '#374151', '#38bdf8',
      '#3b82f6', '#475569', '#4a000a', '#4ade80', '#4b5563', '#5eead4',
      '#60a5fa', '#6366f1', '#64748b', '#67e8f9', '#6b7280', '#6ee7b7',
      '#7a0010', '#7a838f', '#7c3aed', '#7dd3fc', '#86efac', '#8a6d1f',
      '#8b5cf6', '#93c5fd', '#94a3b8', '#991b1b', '#9b0000', '#9ca3af',
      '#a16207', '#a3e635', '#a78bfa', '#aeb6c2', '#b91c1c', '#bae6fd',
      '#bbf7d0', '#bef264', '#bfdbfe', '#c2410c', '#c4b5fd', '#c9a227',
      '#cbd5e1', '#ce1126', '#d1d5db', '#d1fae5', '#d4af37', '#d8b4fe',
      '#d97706', '#dbeafe', '#dc2626', '#dcfce7', '#e0f2fe', '#e2e8f0',
      '#e5e7eb', '#ede9fe', '#ef4444', '#eff6ff', '#f0fdf4', '#f1f5f9',
      '#f3f4f6', '#f59e0b', '#f87171', '#f8f9fa', '#f8fafc', '#f9fafb',
      '#facc15', '#fafaf5', '#fb923c', '#fbbf24', '#fca5a5', '#fcd34d',
      '#fda4af', '#fdba74', '#fde047', '#fde68a', '#fecaca', '#fed7aa',
      '#fee2e2', '#fef2f2', '#fef3c7', '#ffd700', '#fff', '#fff7ed',
      '#fffbeb', '#ffffff'
  ] },
  'docs/src/tailwind-config.js': { c: 50, v: [
      '#10b981', '#111827', '#1f2937', '#374151', '#3b82f6', '#4a000a',
      '#4b5563', '#6b7280', '#7a0010', '#8b5cf6', '#9b0000', '#9ca3af',
      '#ce1126', '#d1d5db', '#d97706', '#dc2626', '#e5e7eb', '#ef4444',
      '#f3f4f6', '#f87171', '#f8f9fa', '#fca5a5', '#fde68a', '#fecaca',
      '#fee2e2', '#fef2f2', '#ffd700', '#ffffff'
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
//   2026-09-28 颜色章法批（支书「新组件没章法」）：① `committee-meeting-tab.js` 唯一处 `#C8102E` 内联
//   主按钮底色改走语义类 `.btn-accent` ⇒ 该文件 hex 清零、按收基线纪律删条目，条目数 91→90；
//   ② `assign-tab.js` 三处主题色首字块内联（含硬编码兜底）收敛为语义类 `.accent-avatar` ⇒ c 10→3
//   （余 `#f87171`/`#fff` 为「危险」徽章深色字与 color-mix 白）；`group-progress-tab.js` 改走
//   `var(--app-accent-*)`（该处原即 rgba、非 hex）⇒ c 仍 7；`styles.css` 给 `--app-accent` 三件套补正式
//   默认值 + `.sel-accent-on` 去兜底 ⇒ c 仍 329（同批新增/移除的 hex 相抵）。全站 distinct 值仍 168。
//   2026-09-28 颜色存量批（支书裁定「色板外党建红 #C8102E 统一到规范值 #CE1126」）：
//   `docs/` 下 15 文件 / 34 处 `#C8102E` 全部改走 `var(--party-red)`（＝#CE1126，品牌统一层令牌，
//   逐处观感零变化——原值 #C8102E 与 #CE1126 均为党建红实底白字 CTA/党务标签；唯一例外：
//   `disc/inspection-tab.js` 的 PersonPicker `accentColor`（JS 入参，仅供 hexToRgba/darkenHex 解析、
//   不可换 var()）删去显式覆盖 ⇒ 回落到组件自带默认 `#CE1126`，与本批统一目标一致）。
//   ⇒ 9 个文件 hex 清零（form-shell / signup-panel / workspace-shell / notice-entry /
//   party-committee-meeting-entry / wizard-entry / party-committee{branches,dispatch,review}-tab）按收基线纪律删条目；
//   6 个文件 c 下调（header 6→5 · org-setup-wizard 18→8 · references 17→16 · disc/inspection-tab 12→11 ·
//   report-up-tab 5→3 · notice.js 3→2）。全站 distinct 值 168→167（`#c8102e` 全站消失）。
//   `HEX_TOTAL_BASELINE` 有意保持 2025（存量起点）。
//   2026-09-28 色彩二分批（支书三条裁定：状态 vs 强调二分 + 存量全清含 Tailwind 耦合）：
//   `docs/src/**` 内联样式的 `var(--tok, <硬编码兜底>)` 中，**`--tok` 已在 `:root` 有正式默认值者删兜底**
//   （＝`var(--app-accent,#B91C1C)` / `var(--app-accent, #B91C1C)` / `var(--app-accent-bg,rgba(185,28,28,0.1))` 等
//   ＋ `var(--accent-blue,#3B82F6)` / `var(--neutral-100, #F3F4F6)`）——**逐处与 `:root` 默认值逐字等值 ⇒ 观感零变化**
//   （含与 `classList.toggle(同一字面量)` 成对耦合的 Tailwind 任意值类 `[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]`：
//   因类串与 toggle 字面量含同一子串，**一次子串替换即成对同步**，两处逐字仍相同）；另 `#EF4444`→`var(--functional-error)`
//   （值等 `--functional-error`，status 语义相符，零观感变化）3 处（styles.css）+ 1 处（today-tab.js）。
//   ⇒ **23 文件 c 下调**（本轮实测合计 −74 处：1619→1545）·`HEX_BASELINE` 按实况重算条目 **81→80**
//   （`docs/src/services/governance/issues.js` 两处 `#b91c1c` 全在兜底里、删兜底后清零 ⇒ 按收基线纪律删条目）·
//   全站 distinct 值仍 **167**（被清的值仍存于 `_C` 表 / `styles.css` 令牌定义 / `tailwind-config.js` 等处）。
//   ⚠ 同批把若干**行已有存量漂移**的条目 c/v 一并按实况改准（如 `settings-entry.js` c 13→6：除本批 6 处 `#b91c1c` 外，
//   另有历史批次已清但未随注的 1 处）——属「收基线按实况」，非放宽。
//   **有意不碰**（同批逐处理由见执行报告）：`--tint` / `--tab-accent` / `--acc` / `--acc-border-dark` 等**元素级变量**的兜底
//   （由元素自设、删了会变观感）；`#fff` / `#000`（`--neutral-0` 深色态反转为 `#0F172A` ⇒ 与 `#fff` **非全态等值**，按值换会变深色观感；
//   `#000` 无同名令牌）；`#B91C1C`（＝`--accent-secretary` 角色识别色，与品牌层 `--party-red` 语义不同，按值换会把品牌红错标成②角色识别色）；
//   `#DC2626`（＝`--primary-600`，与 status 语义**不符** ⇒ 不许按值换；且多处为 `${hex}15`/`color-mix(...)` **函数入参**，换 var() 会坏）；
//   `#F87171`（深色提亮值，属已登记的 `--acc-*-dark` 元素级派生机制）。
//   2026-09-28 组织台「成员流动」拆 tab 批（R10：从 `org/roster-tab.js` 拆出 `org/member-flow-tab.js`）：
//   `#cbd5e1`（2 处，均在流入/流出登记浮窗的 `--acc-text-dark` 内联覆盖里）**随代码整体搬入新文件**
//   ⇒ 按收基线纪律**删 `org/roster-tab.js` 条目**（该文件 hex 清零）＋ 文件数声明 **80→79**（与实况同值）；
//   搬移合法性由 `HEX_MOVE_LEDGER` 逐值对照（H5）；全站 distinct 值数不变（167，无新值）。
export const HEX_FILE_BASELINE = 79;
export const HEX_VALUE_BASELINE = 167;

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
export const HEX_MOVE_LEDGER = [
  {
    id: 'notice.js → notice-view.js（G1 第③项：服务层不产 UI，通知视图层整块搬出）',
    from: 'docs/src/services/governance/notice.js',
    to: ['docs/src/components/governance/notice-view.js'],
    values: ['#fff', '#3b82f6'],
    fromValues: ['#3b82f6', '#fff'],
    reason: '2026-09-28 · G1 第③项「服务层不产 UI」：通知列表卡片 / 铃铛下拉浮窗 / 发布本组通知浮窗（含 2 处'
      + '硬编码色值）**逐字整块**由 services/governance/notice.js 搬到 components/governance/notice-view.js，'
      + '零行为变化、仅落点变化 ⇒ 按支书 2026-09-25 裁定的搬移例外重设基线（值集一字不变）。'
      + '同批 `services/governance/issues.js` 的「我的处置」视图段搬往 components/feedback/issue-dispatch-view.js，'
      + '该段本无硬编码色值 ⇒ 不生成台账条目。',
  },
  {
    id: 'org-roster → org-member-flow（R10 成员流动拆 tab）',
    from: 'docs/src/entries/tabs/org/roster-tab.js',
    to: ['docs/src/entries/tabs/org/member-flow-tab.js'],
    values: ['#cbd5e1'],
    fromValues: ['#cbd5e1'],
    reason: '2026-09-28 批次 220 · R10：把原「成员名册」tab 内的「成员流动」面板（含流入/流出登记浮窗）'
      + '整体拆为独立 tab ⇒ 其内联覆盖 `--acc-text-dark:#CBD5E1` 两处随代码搬到新文件；值集不变、未加深色。',
  },
];


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

/** 「段落/导语档」基线（2026-09-27 文本档位统一批，给 `text-tier-guard.test.mjs` 消费）
 *  `文件 → { c: 处数, v: 出现档位（px） }`
 *
 *  口径（据既有事实推导，写进 `DESIGN_SYSTEM.md §3.2.2`）：**`<p>` 是说明/导语段落**，属正文说明类，
 *  按 §3.2 档位表应取 **Caption 12px 起**（`text-xs`）；而 **11px（Overline 档）是「分类标签形态」专用档**
 *  （§3.2 Overline 行：font-weight 600 + `letter-spacing` 0.12em + 大写；§3.2.1 亦把 11px 非控件口径
 *  定义为「＝本表 Overline 档」）。⇒ `<p>` 上出现 `text-[9px]/[10px]/[11px]` 即「把标签档当正文档用」，
 *  与同页其他说明段（12px）**字号与行高双双不一致**（11px 任意值类不携行高 ⇒ 继承 1.5 ⇒ 16.5px；
 *  `text-xs` 携固定行高 16px —— 实测证据见本批交付报告）。
 *
 *  本批处置（**从标准层统一，只改实报面**）：支书实报面＝「党小组与活动」tab ⇒
 *  `entries/tabs/secretary/group-progress-tab.js` 的 6 处 `<p>` 11px 已改到 `text-xs`（收基线删条目）；
 *  其余 28 文件 / 84 处为**存量台账**（不是正当例外），逐批收敛、新增即红。
 *  ⚠ 收基线＝删条目 / 减 c；不得为变绿补条目。 */
export const P_TEXT_TIER_BASELINE = {
  'docs/src/components/ui/form-field.js': { c: 2, v: [11] },
  'docs/src/components/record/inspector.js': { c: 1, v: [11] },
  'docs/src/components/governance/org-setup-wizard.js': { c: 23, v: [11] },
  'docs/src/components/governance/person-edit-modal.js': { c: 2, v: [11] },
  'docs/src/components/governance/resolution-followup-manager.js': { c: 2, v: [11] },
  'docs/src/components/governance/signup-panel.js': { c: 1, v: [11] },
  'docs/src/entries/pages/notice-entry.js': { c: 1, v: [11] },
  'docs/src/entries/pages/party-committee-meeting-entry.js': { c: 9, v: [11] },
  'docs/src/entries/pages/settings-entry.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/disc/attendance-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/leader/review-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/leader/write-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/org/development-tab.js': { c: 2, v: [11] },
  'docs/src/entries/tabs/org/inspection-tab.js': { c: 2, v: [11] },
  'docs/src/entries/tabs/org/roster-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/org/talent-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/org/taskforce-tab.js': { c: 4, v: [11] },
  'docs/src/entries/tabs/party-committee/branches-tab.js': { c: 6, v: [11] },
  'docs/src/entries/tabs/prop/archive-tab.js': { c: 3, v: [11] },
  'docs/src/entries/tabs/secretary/assign-tab.js': { c: 4, v: [11] },
  'docs/src/entries/tabs/secretary/calendar-tab.js': { c: 6, v: [11] },
  'docs/src/entries/tabs/secretary/notification-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/secretary/overview-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/secretary/todo-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/secretary/workforce-panel.js': { c: 4, v: [11] },
  'docs/src/entries/tabs/today/today-tab.js': { c: 1, v: [11] },
  'docs/src/entries/tabs/visitor/thought-report-tab.js': { c: 1, v: [11] },
  'docs/src/entries/pages/wizard-entry.js': { c: 1, v: [11] },
};

/** 段落/导语档规模（非空转下限；防台账被悄悄删空 ⇒ 与 P_TEXT_TIER_BASELINE 同批收基线） */
export const P_TEXT_TIER_TOTAL_BASELINE = 84;
export const P_TEXT_TIER_FILE_BASELINE = 28;
/** 按值台账（只报不判；9/10px 是禁止档，恒为 0） */
export const P_TEXT_TIER_BY_VALUE_BASELINE = { 11: 84, 10: 0, 9: 0 };

/** 「零引用类」台账（2026-09-28 死码清理批，给 `server/test/dead-selector-guard.test.mjs` 消费）
 *
 *  口径（守卫单一源）：扫 `docs` 下全部 `.css`（排除第三方 `docs/assets/vendor`）＋ `docs` 下 `.html` 页内
 *  `<style>` 的**类选择器**，与 `docs` 下全部 `.js` 与 `.html` 全量文本做**词边界命中**比对：
 *  `(?<![A-Za-z0-9_-])类名(?![A-Za-z0-9_-])`（词边界而非裸子串——裸子串会把 `ab-tl-dot` 误当 `tl-dot` 的引用）。
 *  「零命中且不在 `DYNAMIC_SELECTOR_WHITELIST`」的类 ⇒ **新增死类即红**。
 *
 *  ⚠ **词边界也判不了「动态拼接」**（如 `` `ab-edge--${e.type}` ``）：这些类进 `DYNAMIC_SELECTOR_WHITELIST`、
 *  由人工逐条登记生成处（守卫不自动推断）。
 *
 *  本批（2026-09-28）已把审计查出的**零引用类**删除（`styles.css` 65 类 · `about.css` 3 类）；
 *  余 **1 条**留在台账（见下）——`person-picker.css` 的 `inline-full`：该文件**不在本批授权改动面**
 *  （授权面＝`styles.css` / `about.css` / `docs/*.html` 页内 `<style>`），按「不许把拿不准的自行删掉」纪律
 *  **只登记、未删**，待后续批次处置。
 *  收基线纪律：本台账**只减不增**（删条目）；**不得**为变绿补条目、也**不得**把 `DYNAMIC_SELECTOR_WHITELIST`
 *  当台账用（动态者是「曾被误判」而非「允许的死码」）。 */
export const DEAD_SELECTOR_BASELINE = [
  {
    name: 'inline-full',
    reason: '`docs/src/components/person-picker.css:30` 的 `.person-picker-wrapper.inline-full`：经复核**确为零引用**'
      + '（`person-picker.js:179` 只写 `wrapper.className = "person-picker-wrapper"`，全仓无 `inline-full` 字面量；'
      + '非动态拼接）。**未删原因**＝该文件不在本批授权改动面（授权面仅 `styles.css` / `about.css` / 页内 `<style>`）'
      + '——按「拿不准 / 越面者单列报告、不自行删」纪律留台账，待后续批次处置。',
  },
];

/** 动态拼接 / 第三方运行时白名单（**只报不判**：这些类在 `docs` 下全部 `.js` 与 `.html` 里「字面零命中」，
 *  但由**模板字符串拼接**或**第三方库运行时**产生，删了会坏）。
 *  逐条给「生成处 / 生成方式」；守卫只豁免**这些具名类**，其余零引用一律判红（不放宽任何判红面）。
 *
 *  纪律（守卫逐条机检，见 Z3）：① 每条**必须仍是零引用**（若已能字面命中 ⇒ 应删条目：僵尸登记判红）；
 *  ② 必须**仍存在于 CSS**（否则应删条目）；③ 必须带 ≥20 字理由。 */
export const DYNAMIC_SELECTOR_WHITELIST = [
  {
    name: 'ab-edge--task',
    reason: '关于页工作流 SVG 连线：`docs/src/entries/pages/about-entry.js:637` 以 `` class: `ab-edge ab-edge--${e.type}` `` '
      + '按 `e.type ∈ {task, info, file}` 拼接（`.ab-edge--task` 走此路生成，非游离死类）。',
  },
  {
    name: 'ab-edge--info',
    reason: '同 `ab-edge--task`：由 `about-entry.js:637` 的 `` ab-edge--${e.type} `` 拼接生成（`info` 档）。',
  },
  {
    name: 'ab-edge--file',
    reason: '同 `ab-edge--task`：由 `about-entry.js:637` 的 `` ab-edge--${e.type} `` 拼接生成（`file` 档）。',
  },
  {
    name: 'ab-flow-line--task',
    reason: '关于页镜组流程线：`docs/src/entries/pages/about-entry.js:699` 以模板串 ab-flow-line ab-flow-line--${f.type} '
      + '按 `f.type ∈ {task, info, file}` 拼接（`.ab-flow-line--task` 走此路生成）。',
  },
  {
    name: 'ab-flow-line--info',
    reason: '同 `ab-flow-line--task`：由 `about-entry.js:699` 的 `` ab-flow-line--${f.type} `` 拼接生成（`info` 档）。',
  },
  {
    name: 'ab-flow-line--file',
    reason: '同 `ab-flow-line--task`：由 `about-entry.js:699` 的 `` ab-flow-line--${f.type} `` 拼接生成（`file` 档）。',
  },
  {
    name: 'lenis-smooth',
    reason: '第三方平滑滚动库 Lenis 在 `html` 上**运行时**追加的状态类（见 `docs/assets/vendor/lenis.min.js`；'
      + '`docs/src/about.css:32` 消费它改写 `scroll-behavior`）——库产类，源码无字面量，删了会坏。',
  },
  {
    name: 'lenis-stopped',
    reason: '同 `lenis-smooth`：Lenis 运行时追加在 `html` 上的停止态类（`docs/src/about.css:33` 消费）。',
  },
];

/** 规模下限（非空转判据）：低于此值说明抽取口径失效或扫描面被削 */
export const DEAD_SELECTOR_CSS_FILE_BASELINE = 5;   // styles.css + about.css + person-picker.css + help.html/login.html 页内 style
export const DEAD_SELECTOR_CLASS_BASELINE = 400;    // 全站 distinct 类选择器（实测 635）
export const DEAD_SELECTOR_CORPUS_FILE_BASELINE = 120; // docs/**/*.{js,html} 引用比对面文件数（实测远超）
