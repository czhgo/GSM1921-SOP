﻿# Tasks

> 实施顺序：先定色板（设计任务）→ 数据与注入 → CSS/JS 消费方 → 主题预览 → 密度与间距 → 交互态 → 触屏底线 → 守卫与三次验证。
> 设计任务必须使用 `frontend-design`、`better-colors`、`web-design-guidelines`；先出表、再写代码。

- [x] Task 1: 7 主题 × 亮/暗 × 8 token 的显式色板 ＋ 固定语义色分离
  - [x] SubTask 1.1 保留 7 个主题：金/红/橙/绿/青/蓝/紫；删除天蓝、雾紫、亮蓝，并给出旧值回落映射（紫→紫、蓝→蓝）。为 7 个主题逐一设计 `base`、`softBg`、`softBorder`、`softText`、`strongBg`、`strongInk`、`hoverBg`、`activeBg`（亮色 + 暗色各一套），全部为手选 hex。
  - [x] SubTask 1.2 先写总体用色纪律并在设计稿上自检「沉稳但是鲜活」：中性表面 + 深墨文字 + 低彩度浅底；每屏最多一个高强调；高饱和只用于小面积语义标记；不得用高对比把界面做成色块拼贴。记录 3 个代表页（今天、待办、通知）的用色判断。
  - [x] SubTask 1.3 分离固定语义色：党徽金 `#FFD700`、三会一课 `#CE1126`、主题党日亮金 + 金黄字，写成独立变量/常量；活动类别色不参与主题注入。消除 `--accent-participant` 的 CSS 红 / JS 金同名两值。
  - [x] SubTask 1.4 用 WCAG 公式逐项验收：`softText` vs `softBg` ≥4.5:1（目标 ≤12:1）；`strongInk` vs `strongBg` ≥4.5:1；`strongBg` vs 卡片/页面底 ≥3:1；`softBg` 与白 1.08–1.35；`strongBg` HSL 饱和度 ≤85%（固定语义色除外）。记录实测值。
  - [x] SubTask 1.5 把 7×2×8 验收表（hex/对比度/彩度）写入 `DESIGN_SYSTEM.md` 主题色章节；记录 origin 公式、金色例外、10→7 削减理由；若某主题微调基色，逐条记录。
  - [x] SubTask 1.6 把「党徽金≠主题金」「活动类别色固定」「沉稳但是鲜活」写成三条设计原则，落入 DESIGN_SYSTEM 与 spec 的 SD-19/20/21。

- [x] Task 2: 色板数据与注入
  - [x] SubTask 2.1 `docs/src/core/domain/constants.js`：`ACCENT_COLORS` 收敛为 7 主题、每主题 8 token × 亮/暗；`getAccentColors` 改为查表返回显式值；`accentButtonColors` 删除亮度分流；`solidAccentStyle` 删除 `_lighten/_darken/_rgba/color-mix`；`ACTIVITY_TYPE_COLORS` / `ACTIVITY_CLASSIFICATION` 改为消费固定语义色，不读主题 token；删除无消费方的 HSL 辅助函数。
  - [x] SubTask 2.2 `docs/src/core/boot/theme.js` / `bootstrap.js`：按亮/暗模式注入新 token（`--app-accent-soft-bg/-soft-border/-soft-text/-strong-bg/-strong-ink/-hover-bg/-active-bg`），不再注入旧 `--app-accent-bg/-border/-text/-deep`。
  - [x] SubTask 2.3 `docs/src/styles.css` 的 `:root` 默认金与 `html.theme-dark`：给出亮/暗两套默认 token；删除 `--app-accent-deep` 的 `color-mix` 定义。
  - [x] SubTask 2.4 兼容边界：旧 token 若仍有外部消费，先保留别名一轮并登记；不得让页面出现未定义变量（检查 computed 值）。

- [x] Task 3: CSS 消费方（styles.css）
  - [x] SubTask 3.1 逐处替换 19 处 `color-mix(...--app-accent...)`：`.btn-accent`（hover/disabled）、`.btn-accent-soft`、`.chip-accent-on`、`.sel-accent-on`、`.text-accent`、`.btn-tab.active`、`.ov-sub-tab-active`、`.settings-group-item.active`、`.state-badge--accent`、`.cs-option.is-selected` 等，全部改用显式 token。
  - [x] SubTask 3.2 删除 `filter: brightness()` 的按钮 hover 与 `--app-accent-text` 的中性近黑语义；hover 改 `hoverBg`、active 改 `activeBg`。
  - [x] SubTask 3.3 深色段（`html.theme-dark`）改为消费 `*-dark` token；删除逐点补丁式覆盖（`.cs-option.is-selected` 等），确保 8 个消费点日夜同源。
  - [x] SubTask 3.4 用真机 computed 色值抽检 7 主题 × 浅底/实底/文字，确认不再出现 `color-mix` 计算值；同时确认活动类别色/党徽金不随主题变化。

- [x] Task 4: JS 内联派生清理
  - [x] SubTask 4.1 清理 41 个文件 / 100 处 `--acc-text-dark: color-mix(...)`：改为消费注入 token；无法直接消费的，改为组件类。
  - [x] SubTask 4.2 清理 33 处 JS `color-mix(...--app-accent...)`（`issue-detail`、`settings-entry`、`calendar-tab`、`notification-tab`、`attendance-tab`、`taskforce-tab` 等）。
  - [x] SubTask 4.3 清理 JS 硬编码 hover 色（`issue-list.js:82` 的 `#991B1B/#CE1126`、`ws-org-commissioner-entry.js:46` 的 opacity）与 Tailwind `group-hover:text-blue-700` 等非主题色 hover。
  - [x] SubTask 4.4 自查：`grep "color-mix" docs/src` 在主题色链路上为 0（非主题色用途需逐条登记理由）。

- [x] Task 5: 主题选择器预览（7 项）
  - [x] SubTask 5.1 `appearance-controls.js` / `settings-entry.js`：主题项从单色块改为「浅底+深字」「实底+字」两张小样；选中态用该主题的 soft 三件套；只列 7 项。
  - [x] SubTask 5.2 预览不得写死颜色，必须消费当前主题 token；切换亮/暗时小样同步；已删除主题的旧值回落有提示。
  - [x] SubTask 5.3 真机抽检 7 个主题的预览与设置后实际页面一致（computed 色值比对）；另抽查主题党日/三会一课徽章在 7 个主题下颜色不变。

- [x] Task 6: 密度与间距
  - [x] SubTask 6.1 高度令牌：输入/下拉 40（紧凑 34）、页面/弹窗按钮 36、卡片按钮 32、行内按钮 28、列表单行 48、双行 56、紧凑 44、表格行 40、`summary` 最小 40；写入 `styles.css` 单一源。
  - [x] SubTask 6.2 列表行：`list-row`/`todo-row`/`notice-row` 统一到语义行型；删除 `notice-view.js:97` 的 `p-0` 冲突；`notice-row__title/meta` 补显式行高；移除 2px gap。
  - [x] SubTask 6.3 按钮：按位置取高，宽度由内容 + 水平 10/8/8；删除 `min-height` 脱离文字的写法；行内 28 视觉 + 44 命中区（伪元素扩展）。
  - [x] SubTask 6.4 间距：组件内只留 4/8/12/16/24；`p→summary` 固定 8–12；标题→次级→描述 8；清理本批触碰范围内的 Tailwind `1.5/2.5/3.5`。
  - [x] SubTask 6.5 真机量测：选 5 个代表页（今天、待办、通知、宣传任务、档案），记录行高/按钮高/间距，确认无 61/62/79/82 多值。

- [x] Task 7: hover / active / selected 三态
  - [x] SubTask 7.1 建立状态 token 与组件规则：hover 只改 `hoverBg`，active 只改 `activeBg`，selected 用 soft 三件套；transition 只允许 colors，150ms。
  - [x] SubTask 7.2 全仓 hover 门控：所有 `:hover` 规则包进 `@media (hover:hover)`；触屏用 `:active`；`summary`、页签、列表行、卡片、图标按钮逐类补齐。
  - [x] SubTask 7.3 静态行/卡去 hover：无 `data-interactive`/原生可点者移除背景变化与 pointer；表格行按 `data-interactive` 门控。
  - [x] SubTask 7.4 清理 57 处默认灰 `hover:bg-gray-*` 与 4 种按钮 hover 机制，改为语义 token；页签补 hover；`summary` 补 hover/focus-visible。
  - [x] SubTask 7.5 键盘/触屏等价：hover-only 信息（日历预览、帮助目录提亮、tooltip）补 focus 触发或触屏入口。

- [x] Task 8: 触屏与可读性底线
  - [x] SubTask 8.1 ≤640px 输入字号 ≥16px（防 iOS 聚焦放大）；placeholder 改用 ≥4.5:1 的中性色。
  - [x] SubTask 8.2 可点元素命中区 ≥44px（行内按钮、图标按钮、页码、主题色块），视觉尺寸可小于 44。
  - [x] SubTask 8.3 `vote-note` 等漏网输入补统一 focus 环；页签基础态给透明边框，选中不再引起 1px 位移。

- [x] Task 9: 守卫与基线
  - [x] SubTask 9.1 新增 `theme-palette-guard`：7×2×8 token 齐备；主题链路 `color-mix/rgba/brightness` 计数 0；对比度与彩度阈值；活动类别色/党徽金切换主题前后不变；主题选择器恰 7 项且预览消费 token。
  - [x] SubTask 9.2 新增 `density-spacing-guard`：高度表、五档间距、`p→summary`、Tailwind 数值档基线（只降不升）。
  - [x] SubTask 9.3 新增 `hover-state-guard`：三态 token、`@media (hover:hover)` 覆盖率、无 filter/opacity/位移/阴影、页签与 `summary` 有状态、静态行无 hover。
  - [x] SubTask 9.4 更新既有守卫基线（button-system、spacing-scale、row-markup、ui-motion、ui-row-interaction、page-sweep 的高度/字号码），逐条注释理由；不得削弱断言。
  - [x] SubTask 9.5 登记 `test-tier-registry` 与 `test:daily`；新增测试文件数与断言数按实际。

- [x] Task 10: 文档、三次验证与交付
  - [x] SubTask 10.1 `DESIGN_SYSTEM.md`：7 主题色板表、固定语义色表（党徽金/三会一课/主题党日）、密度/间距表、hover 三态表；把 SD-12…SD-21 写入组件层章节；明确「党徽金≠主题金」。 
  - [x] SubTask 10.2 执行日志：Why / What / Verification / Boundaries / sample-diff；记录 origin 公式、金色例外、10→7 削减、党徽金/活动类别色分离、「沉稳但是鲜活」的取舍。
  - [x] SubTask 10.3 第 1 次（定向）：三个新守卫 + page-sweep + form-loop（相关 tab）+ 主题预览用例 + 文档守卫。
  - [x] SubTask 10.4 第 2 次：`npm run test:daily` 全绿。
  - [x] SubTask 10.5 第 3 次：`SWEEP_SHARD=all` 三通道 0 失败（红项只单跑失败文件诊断）。
  - [x] SubTask 10.6 版本戳 bump ＋ `version-stamp`；中文提交（不 push），含 Why / What / Verification / Boundaries。

# Task Dependencies

- Task 1 先行（设计表 + 对比度验收）；Task 2 依赖 Task 1。
- Task 3 与 Task 4 依赖 Task 2；两者可并行（CSS / JS 不同文件）。
- Task 5 依赖 Task 2（预览消费 token）。
- Task 6 与 Task 1–5 可并行（密度/间距不改色值）；Task 7 依赖 Task 2（hoverBg/activeBg）。
- Task 8 依赖 Task 6（命中区与输入字号）。
- Task 9 最后（守卫读最终值）；Task 10 在 Task 9 之后。
- **套件级运行只允许 3 次**；红项只单跑失败文件诊断。
