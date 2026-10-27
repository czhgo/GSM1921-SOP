﻿# Tasks

> 顺序：先立令牌与唯一源（CSS）→ 再改组件与页面 → 数据闭环（前端＋后端）→ 守卫 → 文档与三次验证。
> 并行边界：Task 1（styles.css）独占一个 agent；Task 2/3/4 互不重叠文件，可并行；Task 5（后端）独立。

- [x] Task 1: 状态语言唯一源（`docs/src/styles.css` ＋ 主题表）
  - [x] SubTask 1.1 选中态：`.list-row[data-selected]`、`.cal-cell-large.selected`（含移动端）、`.subtab[aria-selected]`、`.cs-option:focus-visible`、`.status-badge-option.is-active` 改主题 soft 三件套；侧边栏 `.module-tab.active` 保留浅灰并注释理由。
  - [x] SubTask 1.2 主题表加第 9 token `strongHover`（7 主题 × 亮/暗手选 hex），同步 `constants.js`、`theme.js` 注入、`styles.css` 别名；`.btn-accent:hover` 用它；删除 `login.html` 的 `.login-btn:hover/:active` 灰覆盖。
  - [x] SubTask 1.3 字段外壳：统一 `.input-flat` / `select` / `textarea` / `.cs-trigger` 的静置/悬停/活动/禁用/只读；活动态＝主题色边 1px + 3px 浅晕；`:focus-visible` 才出 2px 主题色环；删除 `:focus` 的 `outline` 与金边框双答；暗色 `--focus-ring` 不再用党徽金。
  - [x] SubTask 1.4 组件厚度：`summary` 的 `min-height:40` 只作用于非按钮摘要（新增 `.disclosure`）；`.btn-*` 族在 summary 上按按钮档；删移动端 `row-more > summary { min-height:36 }`；收敛 4 个尺寸落点到唯一源，删基类死 padding。
  - [x] SubTask 1.5 动效令：新增 `--motion-*` 4 档与 2 个 easing；新增 `.motion-enter` / `.motion-collapse` / `.motion-press` / `.motion-scale-in`；把 `max-height+padding`（`cal-mobile-detail`、`about.css`）与 `width`（进度条）改为 `grid-template-rows` / `transform`；20 处硬编码 `0.15s` 并回令牌；reduced-motion 补 delay 归零；删死 keyframes。

- [x] Task 2: 组件层（`docs/src/components/**`）
  - [x] SubTask 2.1 活动类别单一源：`constants.js` 新增导出 `activityTypeTone(type)`（三会一课红 `#CE1126`、主题党日金 `#A16207`、其余中性）；`styles.css` 新增 `data-tone="party-red"` 档（不用 danger 的 `#B91C1C`）。
  - [x] SubTask 2.2 修 6 处类别色渲染：`activity-view.js:185`、`calendar-tab.js:434`、`calendar.js::_activityTone`、`activity-entry.js:290`（删 hex 比较）、`kanban-tab.js:130`、`today/todo/group-progress/archive` 统一走 `activityTypeBadgeVariant`。
  - [x] SubTask 2.3 状态色与类别色分离：`taskforce-view.js` / `taskforce-list.js` / `org/taskforce-tab.js` 的 `completed→success`、`recruiting→warning`；「已打回」→`warning`；计数徽章→`neutral`。
  - [x] SubTask 2.4 `custom-select` 支持「大选项集」：搜索、分组、惰性加载（`page`/`limit`）、近期优先、上限与空态文案；`enhanceSelects` 默认接管所有 `select.input-flat`。
  - [x] SubTask 2.5 `detail-anchor.js`：定位前逐级展开 `closest('details')`；不可见时返回 `false` 并让调用方提示。

- [x] Task 3: 页面与深链（`docs/src/entries/**`、根 HTML）
  - [x] SubTask 3.1 归档链路：`prop/archive-tab.js` 三块全空补空态卡；命中 `focusActivityId` 先展开 `#archive-display-fold`；定位失败 `showToast('info', …)`。
  - [x] SubTask 3.2 `archive.html` 消费 `?tab=` / `?id=`；与服务端统一 `isActivityArchived` 口径；三 tab id 纳入机检名单。
  - [x] SubTask 3.3 假入口清理：`activity-entry.js` 的「复盘」不再落 `org?tab=talent` / `prop?tab=archive`；无承载面时不出入口。
  - [x] SubTask 3.4 被壳清掉的深链：`dispatch-tab.js` 与 `visitor/activities-tab.js` 的 `view` 改 `subview` 或读 `ctx.navTarget`；`party-committee` 补 `onNavTarget`；`person.html` 兼容 `?personId=`；`activity.html?branchId=` 删除或补写方。
  - [x] SubTask 3.5 select 全量迁移：`party-committee-meeting-entry.js:203`、筛选行、设置页、向导等改用 `.cs-select` / `enhanceSelects`；迁移后原生 `select` 仅作值载体。
  - [x] SubTask 3.6 切页签硬闪：`tab-bar.js` 的 `opacity` 两帧硬切改 `.motion-enter`；容器补 `transition: opacity`。

- [x] Task 4: 后端与数据真值（`server/**`）
  - [x] SubTask 4.1 归档读口：`GET /api/v1/activities` 增 `archived` 过滤与 `page`；`archive_records` 无 `activityId` 时按 `branchId` 归属（不落 `DEFAULT_BRANCH`）。
  - [x] SubTask 4.2 未登录访问 `archive.html`：明确「演示数据」标识或要求登录（不得静默展示演示数据当真值）；补 `PUBLIC_READ` 白名单或页面级提示。
  - [x] SubTask 4.3 深链契约：新增 `archive-deeplink-guard`（`?tab=` 必须被消费、`focus*` 定位失败必须有提示、复盘落点不得是 `archive|talent`）；扩展 `tab-nav` 覆盖 `talent` 落点。
  - [x] SubTask 4.4 颜色纪律守卫：新增 `activity-tone-guard`（类别只能由 `activityTypeTone` 产出、类别/状态路径禁 `info`、info 白名单逐条登记且防僵尸）。
  - [x] SubTask 4.5 字段外壳守卫：新增 `field-shell-guard`（输入类控件必须走外壳类、`:focus` 不得单独出 outline、禁用/只读两态可辨、select 必须 `data-cs-enhanced`）。
  - [x] SubTask 4.6 动效守卫：新增 `motion-guard`（只允许 4 档时长与白名单属性；禁 `transition: all` 与布局属性；reduced-motion 覆盖）。

- [x] Task 5: 遗留收口
  - [x] SubTask 5.1 CLAUDE 热层精简（独立专项，但仍在本 spec 收尾）：只留在办项索引＋指针，已完成项迁出正文。
  - [x] SubTask 5.2 分页钮 30 → 32（同批改 CSS ＋ `page-sweep::DECK`），或登记为明载例外并写理由。
  - [x] SubTask 5.3 Tailwind `1.5/2.5/3.5` 清零或登记棘轮；`--tab-accent*` 内联并入 `--app-accent-*`；info 蓝 69 处收成白名单；`--app-accent-bg/-border/-text/-deep` 兼容别名退场。

- [x] Task 6: 文档与验证
  - [x] SubTask 6.1 `DESIGN_SYSTEM` 新增 §12.11（状态语言：选中/活动/错误/禁用/只读）、§12.12（字段外壳）、§12.13（动效令）、§12.14（选择器与大数据量）；更新 SD-25…SD-32。
  - [x] SubTask 6.2 执行日志批次 508（Why / What / Verification / Boundaries / sample-diff）。
  - [x] SubTask 6.3 定向 → daily → 全量三通道；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 1 先行（令牌与唯一源）；Task 2/3 依赖 Task 1 的类与令牌。
- Task 3.5（select 迁移）依赖 Task 2.4（custom-select 能力）。
- Task 4 依赖 Task 1–3 的最终类名与 URL 协议；Task 4.5/4.6 依赖 1.3/1.5 落地。
- Task 5 可与 Task 2/3 并行；Task 6 最后。
