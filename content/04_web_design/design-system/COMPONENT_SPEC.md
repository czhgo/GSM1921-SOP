---
title: "组件规范"
type: design
role: "[工程师]+[AI]"
version: "1.0"
last_updated: "2026-09-15"
status: active
split_from: "DESIGN_SYSTEM.md（2026-08-24 T-282 拆分）"
related_files: [DESIGN_SYSTEM.md, COLOR_SYSTEM.md, docs/src/styles.css]
---

# 组件规范

> **定位：** 本文件是系统**组件规范**的唯一权威源（原 DESIGN_SYSTEM.md §四 组件规范：按钮/卡片/输入框/侧边栏/导航/模块标签/角色/嵌套/日历图例/数据展示/图标/交互载体/选人/状态徽章/反馈管理）。写组件优先查本文件。
> **受众：** [工程师]+[AI]
> **拆分说明**：2026-08-24 自 DESIGN_SYSTEM.md 拆分（T-282 content 体系优化）——组件规范在此，色彩定义见 [COLOR_SYSTEM.md](COLOR_SYSTEM.md)，设计系统主文件见 [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)。

---

## 四、组件规范

### 4.1 按钮（Button）

#### 变体定义

| 变体 | Class | 背景 | 文字色 | 边框 | 悬停背景 |
|------|-------|------|--------|------|---------|
| Primary | `.btn` `.btn--primary` | `--primary-700` | `#FFFFFF` | 无 | `--primary-800` |
| Secondary | `.btn` `.btn--secondary` | `--neutral-100` | `--neutral-700` | `1px solid --neutral-200` | `--neutral-200` |
| Ghost | `.btn` `.btn--ghost` | 透明 | `--primary-700` | 无 | `--primary-50` |
| Danger | `.btn` `.btn--danger` | `--functional-error` | `#FFFFFF` | 无 | `#DC2626` |

#### 尺寸

| Size | Class | 高度 | 内边距 | 字号 |
|------|-------|------|--------|------|
| Normal | `.btn` | `40px` | `10px 20px` | `0.875rem` |
| Compact | `.btn--sm` | `36px` | `8px 14px` | `0.8125rem` |

> CSS 实现见 `docs/src/styles.css`。**装饰性禁令**：禁止 `linear-gradient`（纯色优于渐变）、`box-shadow`（扁平化不需要）、`transform: translateY(-Npx)`（上浮效果违反扁平原则）、`transform: scale()` 过大值（缩放反馈过于花哨）。**功能性允许**：`transform: scale(1.02)` 等微交互反馈、`transform` 用于 SVG 动画绘制（如 stroke-dashoffset 渐进绘制）。区分标准：transform 不得用于"装饰性动画"（如装饰性弹跳、缩放重影），但允许用于"功能性反馈"（如按钮点击微缩、SVG 动画绘制方向）。

### 4.2 卡片（Card）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `background-color: var(--surface-card)` (纯白 `#FFFFFF`) |
| 边框 | `border: 1px solid var(--neutral-200)` |
| 圆角 | `border-radius: 12px` |
| 阴影 | 无（扁平化，边框分隔） |
| 悬停 | `border-color: var(--primary-300)`，不移位 |
| 内边距 | `padding: 20px`（标准），`padding: 16px`（紧凑） |

> CSS 实现见 `docs/src/styles.css`。禁止：`backdrop-filter`、`box-shadow`、`transform`。

#### 列表项白底原则

列表项/卡片一律白底，不设背景色，不加边线。类型区分仅靠圆点颜色，背景色是重复表达。灰色背景容器一并清除，改为透明底，卡片间分隔靠间距（gap）。

**豁免**（保留背景色）：通知 badge 未读标记、侧边栏选中项高亮、日历当日格子标记、登录页品牌色区域、header 品牌色区域。

#### 边线语义（Border-Left Semantics）

> 沉淀：2026-08-02，反馈"纯白卡片 vs 左侧边线是否有逻辑"。经全仓抽样（styles.css + 6 个工作台 + help/about 页）确认：**边线承担"强调/可交互/角色归属"的视觉编码语义，纯白代表中性内容**。本规范为成文依据，防止未来加边线时语义未同步。

**适用范围**：卡片/区块级元素（容器）。**列表项（行级元素）仍遵循"列表项白底原则"不加边线**——行内区分靠圆点，容器级区分靠边线，两层不混用。

**五档语义表**：

| 档位 | 样式 | 语义 | 典型场景 |
|------|------|------|---------|
| 0. 中性 | 纯白卡，无边线 | 常规内容容器 | `card rounded-2xl p-6` 默认态 |
| 1. 可交互高亮主卡 | 白卡 + `border-left: 4px` **品牌金**（2026-08-08 起由主题色改金色） | 可点击进详情/当前聚焦项，**必须有 hover 反馈** | `.inspector-card`（inspector.js 活动卡，品牌活动卡 `var(--party-gold)` 金边框；实现内联 `#EAB308` 为历史存量，见下方用色来源注） |
| 2. 角色职责核心卡 | 白卡 + `border-l-4` 角色主题色 | 该角色职责范围内的核心卡/详情面板（角色识别，保留主题色） | 考勤概况（支书红）、专班详情（组织委员）、纪检面板（橙）、访客金色 |
| 3. 引述/要点块 | 浅底色 + `border-left: 3px` 主题色 | 引述、对立观点、要点提示 | help 页 `--help-party-red` 引述块、about 模块说明卡 |
| 4. 嵌套/时间线 | `border-left: 1-2px` 灰色（`--neutral-200`） | 层级嵌套、时间线、子项缩进 | issue-detail 嵌套、专班列表子项 |

**用色来源**：
- 可交互强调卡（档位 1）：**品牌金** `var(--party-gold)`（品牌统一层，色值权威见 [COLOR_SYSTEM.md](COLOR_SYSTEM.md) §2.3.1）
- 角色职责核心卡（档位 2）：`--accent-<role>`（主色）或 `--accent-<role>-light`（低饱和 border-left / 浅底，styles.css :root L46 已声明）——属角色识别层，保留主题色
- 品牌/活动色：党徽金 `var(--party-gold)`（inspector 品牌卡边框，2026-09-05 起规范统一至品牌金系；实现中 inspector.js 内联 `#EAB308` 为历史存量、不入权威色板，待收敛至 `var(--party-gold)`）
- 嵌套灰色：`--neutral-200`

**硬性规则**：
1. **每条边线必须有语义**：可交互/强调/角色归属/引述/嵌套，五者之外不得加边线
2. **可交互必 hover**：档位 1 的卡片必须有 hover 加深反馈（`border-color` 加深或背景偏移），符合 web-design-guidelines "Interactive states increase contrast"
3. **宽度层级**：强调 4px > 引述 3px > 嵌套 1-2px，不可倒挂
4. **纯展示卡不加 hover 伪装**：档位 2/3 的卡不可点击，也不要加"看似可点"的 hover 效果

### 4.3 输入框（Input / Select）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `var(--neutral-0)` |
| 边框 | `1px solid var(--neutral-200)` |
| 圆角 | `8px`（`--radius-sm`） |
| 高度 | **单档 38px**（`.input-flat` / `.input-flat.text-xs` / 下拉触发器 同高：`padding: 10px` + 行高 16px + 边框 2px）；表格行内编辑位可用 `.input-flat-sm`（`6px 12px`，字号同档） |
| 内边距 | `10px 16px`（输入框）/ `10px 12px`（下拉触发器）；表格行内编辑位 `6px 12px` |
| 字号 | **单档 `0.8125rem`（13px）**——2026-09-14 批次 33 并档；禁用 `text-[11px]`/`text-[10px]` 控件字号 |
| 聚焦边框 | `var(--party-gold)`（`input-flat:focus`；无外发光） |
| 占位符 | `color: var(--neutral-400)` |
| 禁用态 | 背景 `var(--neutral-100)`，文字 `var(--neutral-400)` |

> **档位单一源（2026-09-13 尺寸统一彻查）**：上表以 `docs/src/styles.css` 的 `.input-flat` / `input.input-flat.text-xs` / `select.input-flat` 实际声明为权威（原文档写「40px/36px、padding 10px 14px」与实现不符，已校正）。同一 flex 行内的按钮须与控件同档（`text-xs px-3 py-2` = 34px 行内对齐档，见 `styles.css` 按钮尺寸规范）；`select.input-flat.text-xs` 经 `custom-select.js` 增强后仍为 **34px**，与同行输入框精确同高（2026-09-14 批次 27 起不再补 `h-8`——原 32px 与输入框 34px 同排错位 2px 且压字）。

#### Select 统一规则

**废弃**：select 默认方框样式（浏览器原生下拉箭头外观）。

**统一采用**：`select.input-flat` 样式，与 input 输入框完全一致：
- 移除原生下拉箭头（`appearance: none`）
- 添加自定义 SVG 下拉箭头（12px，灰色，右侧 14px 偏移）
- 聚焦时箭头变为主色（红色）
- 右侧内边距 `36px`（为箭头留空间）

> CSS 实现见 `docs/src/styles.css` 的 `.input` 和 `select.input-flat` 选择器。

**交互增强**：`select.input-flat` 由 `custom-select.js`（S2）自动增强为自定义圆角下拉（`.cs-select` + `.cs-trigger` + `.cs-menu`），原生 select 作为值载体保留（`data-cs-enhanced` 防重；bootstrap 全局 MutationObserver 覆盖动态渲染）。增强后：
- 触发器外观与 `input-flat` 完全一致（圆角 `--radius-sm`、边框 `--neutral-200`、聚焦金框）
- 菜单选中项用主题色（背景 `var(--app-accent-bg)`、文字 `var(--app-accent)`，跟随当前用户主题色，2026-08-08 三审定稿，与 tab 激活态同档同源）
- 智能定位（向上/向下翻转、视口 clamp）；选项超 10 条自动内嵌搜索

**弹层统一基准（2026-08-08）**：所有"选择类弹层"（`.cs-menu`、`.status-badge-popover`）统一：圆角 `--radius-sm`、阴影 `--shadow-dropdown`、选中色用主题色（`var(--app-accent-*)` 三件套，bootstrap 按 accentRole 注入）；禁止各自另设圆角/阴影/选中色。

#### 输入组件统一原则

所有 `<input>`/`<select>`/`<textarea>` 使用 `input-flat` 体系，禁用内联 Tailwind input 样式（如 `border border-gray-200 rounded-lg px-3 py-2 focus:border-red-300` 等）。紧凑场景使用 `input-flat-sm`，多行文本使用 `textarea.input-flat`。

> **口径变更（2026-09-14 批次 33，支书裁定「折中」值）——全站并为一档：正文 13px、控件 38px。**
> 支书原话：「考勤、考察的人作为第一列的表格字体都很小，搜索框和筛选器的组件都很小。而同一页的表单字体却又很大……**全部统一，但是目前表格与筛选器太小；表单太大。可以折中一下！**」
> 并档后：严格说只剩**一档**（38px / 13px），外加一个「表格行内编辑位」保留较小内边距（`.input-flat-sm`，字号同档）。

> **尺寸/字号单一源（2026-09-13 起；批次 33 并档为单档）**：
> ① **唯一档位**——正文 13px、控件 38px：`input-flat` / `input-flat text-xs`（`.text-xs` 只是历史类名，**不再是更小一档**）/ 原生与增强下拉 / `.lf-btn` / `.data-table` 正文，全部同档；表格内嵌 `.input-flat-sm` 仅保留较小内边距（6px 12px），字号同档 13px；
> ② **禁止**「自制 Tailwind 控件」再出现（`rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white` 一类）；
> ③ **禁止**在 `input-flat` 上叠尺寸类（`py-1.5` / `p-2` / `text-sm` / `rounded-lg`）——会覆盖单一源口径（批次 33 已清 8 处此类残留）；
> ④ **禁止** `text-[11px]`/`text-[10px]` 控件字号（与规范 Caption 档冲突）；
> ⑤ 同一 tab 内同一层级（工具条筛选/表单正文）的控件必须同档同字号——并档后此项自动成立；
> ⑥ **高度算式显式**（2026-09-14 批次 31 定式，批次 33 并档）：控件高 = 上下内边距 + **显式行高** + 边框，五处载体（输入框 / 原生下拉 / 增强下拉触发器 × 带不带 `.text-xs` 类名）同一算式——`10+10+16+2 = 38px`。**行高必须由 `docs/src/styles.css` 声明，不得靠 UA 默认或 Tailwind CDN 的 `text-*` 工具类提供**：批次 31 曾因此实测出 42 / 43 / 47 三值并存（增强下拉触发器 43px、无 text 类的裸 `input-flat` 取继承行高 21px 得 47px）。守卫 `server/test/filter-row.test.mjs::D1 / D2`。
> ⑦ **表格正文与筛选器/表单同档**：`.data-table` 字号 13px、行高 1.25rem（行高 20px + 上下内边距 8px = 36px 行高）；Caption/徽标（`text-xs` 12px）不在本口径内，仍可用于状态徽标等附注文字。

#### 筛选行规范（2026-09-14 支书裁定）

> 沉淀：支书实报「涉及筛选器的部分都很丑；下拉框、选择器究竟什么时候用什么，你真的有自觉吗」，叠加现状彻查：筛选控件 6 套形态并存（统一检索引擎 chips / 增强下拉 / query-view 混合条 / 自写 filter-btn 组 / 分段钮三变体 / PersonPicker 搜索框），字号 6 档、控件高度 8 个值。批次 27 一次全量收敛。

**控件选型判断规则（先判「取值能否穷举」，再判「单选还是多选」）**

| 情形 | 判定 | 载体 |
|------|------|------|
| 取值**不可穷举**（姓名 / 学号 / 标题 / 正文 / 地点 / 活动名） | 模糊匹配 | 文本输入 `.input-flat.text-xs.lf-kw` |
| 取值**可穷举且单选**（状态 / 类别 / 月份 / 党小组 / 发展阶段 / 角色 / 在册 / 来源） | 枚举单选 | 下拉 `.input-flat.text-xs.lf-select`（首项固定「<维度>：全部」） |
| 取值**可穷举且多选**（活动载体 / 共建性质 / 通知受众） | 枚举多选 | 表单内 chip（`.chip-option` / `.chip-accent-on`） |
| 需要选择**具体人** | 实体选择 | `PersonPicker`（禁 select 罗列人名，见 §4.13） |
| **互斥视图切换**（活动视图 / 人视图；按活动 / 按人） | 非筛选 | 分段钮（`px-3 py-1.5 text-xs` 组） |

**硬规范**

- **筛选行禁止 chip**：分面（党小组 / 角色 / 阶段 / 类型 / 状态等维度）一律下拉，每维一个「全部 + 取值」；chip 只作展示与表单多选，不承担筛选载体。
- **档位唯一**：同一筛选行内所有控件（关键词输入 / 各维度下拉 / 清除钮）统一 **38px 高、13px 字**（并档后与表单控件、表格正文同档；算式见 §4.3「输入组件统一原则」⑥：`10+10+16+2`）。
- **载体单一源**：筛选行样式统一落 `docs/src/styles.css` 的 `.lf-bar`（弹性行，gap 8px）/ `.lf-kw`（关键词输入）/ `.lf-select`（维度下拉）/ `.lf-btn`（清除钮，38px）；调用点只声明这三个类，不得再内联拼装 `flex flex-wrap items-center gap-2` + `flex-1 min-w-[140px]` 一类散值。
- **表格样式单一源（覆盖所有【表】）**：全站表格统一 `.data-table` 单一类——表头（`8px 12px` 内边距、左对齐、`--neutral-500` 中灰、`--neutral-0` 底）、表体行线（`--neutral-100`）、行悬停（`--neutral-50`）、数据格（`8px 12px`）、表宽与字号（`100%` / `0.8125rem` 13px / 行高 `1.25rem`）全部由该类族提供；**各 tab 不得再各写一份表头行**（原状：7 个文件各写一份 headHtml、三种表头模式，其中一处独用 `py-1.5`、两处独用 `px-2 py-1`）；列级特例（sticky 固定列、`whitespace-nowrap`、`truncate`）可在行内按需声明。**全站表格类族已收成 `.data-table` 一套**（2026-09-14 批次 39 支书特批）——原「专用矩阵（表决矩阵 `.vs-matrix`）保留自身类族」的例外表述作废：表决矩阵已并入「人 × 项目」矩阵单一源，「人 × 项目」矩阵与表态矩阵均走 `.data-table`。
- **分页内置统一引擎（2026-09-14 批次 34；批次 37 全量收口）**：凡经 `components/list-filter.js::renderFilteredList` 渲染的表（28 处）**一律分页**——缺省 **10 条/页**（与 `issue-list` / 归档库同口径），`pageSize: 0` 仅供特批例外；**页数 ≤1 不渲染翻页控件**（小表零负担）；筛选/关键词变化自动回第 1 页；同一 `stateKey` 跨重渲染保留**当前页码**。批次 37 再把原先未接引擎的手写渲染（全量审计发现仍有 13 处以上：表格 4 处 + 卡片列表 9 处以上）在 **21 个文件**全量接入（含「筛选 + 分页」一站式）。翻页**标记**单一源＝[`components/pager.js`](file:///d:/GitHub/GSM1921-SOP/docs/src/components/pager.js) 的 `pagerHtml`（2026-09-14 批次 38 自 `list-filter.js` 下沉为叶子件，统一检索引擎与「人 × 项目」矩阵共用；**页数 ≤1 返回空串**即不出控件），样式单一源仍是 `.page-btn` / `.page-num`（见 §4.10「分页控件」）——引擎与各页均不得自造第二套翻页标记或样式，也不得借 `.chip-accent-on` 表当前页。守卫 `server/test/filter-row.test.mjs::S10`（断言 `pager.js` 内 `if (pages <= 1)`）/ `S11`（`class="page-btn"` / `page-num` 只允许由 `pager.js` 产出）。
- 维度取值只有 1 种时该维度自动隐藏；行数不超过 8 行不出筛选行（`SEARCH_FILTER_MIN_ROWS`，口径不变）。

**已落地点位（批次 27）**：统一检索引擎 `components/list-filter.js`（chips → 下拉 + `.data-table`）、`components/query-view.js`（级联大类/子类/品牌三处 chip 与散值下拉 → `.lf-select`）、`components/issue-list.js`（状态分组 chip → 下拉）、`components/taskforce-view.js`、`entries/tabs/secretary/feedback-tab.js`、`entries/tabs/org/{roster,taskforce}-tab.js`、`entries/tabs/disc/{attendance,inspection}-tab.js`、`entries/tabs/visitor/projects-tab.js` 及 6 处 `renderFilteredList` 调用点的表头重写。

**未纳入本批（批次 28 已补）**：分页控件（`.page-btn` / `.page-num`）已按支书裁定统一（详见 §4.10「分页控件样式单一源」）。

#### 表单字段条件显示与批量选择（2026-09-01 支书裁决）

- **品牌字段按活动模板条件显示**：三会一课无品牌语义，品牌区（label + chips）不渲染；主题党日保留（实现：calendar-tab renderFormStep 按 `tpl.category === 'theme-day'` 条件渲染）。
- **参与人/名单集体选项**：PersonPicker（multi）启用 `stageBatch` 时，面板头部显示「按阶段批量」chips（正式党员/预备党员/发展对象/积极分子），点击批量勾选/取消当前可见范围该阶段全部人员；chip 激活态表示该阶段已全选。三会一课参与人含「积极分子」快捷项（不强制参加、鼓励列席）。
- **唯一选项 hover 即选**：模板选择 Step1 中仅一个子选项的类别（如主题党日），按钮移入即选中（`data-hover-select`），降低点击时间；多选项类别保持点击选择。
- **工作台内嵌面板统一用 `card rounded-xl p-4`**：标题 `font-title-cn text-sm font-bold` + 计数 badge + 描述行 + `divide-y` 列表（对齐 handoff-inbox/report-inbox）；禁止自创 `bg-gray-50/50 border rounded-lg` 非标卡片变体。

### 4.4 侧边栏（Sidebar）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `var(--surface-sidebar)` (纯白 `#FFFFFF`) |
| 边框 | 右侧 `1px solid var(--neutral-200)` |
| 宽度 | `260px`（≥768px）/ `280px`（<768px） |
| 阴影 | 无 |
| 遮罩背景 | `rgba(0, 0, 0, 0.3)` 无反光 |
| 过渡 | `transform 200ms ease-out` |

### 4.5 顶部导航（Header）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `var(--primary-900)` (`#7A0010`) 纯色，无渐变 |
| 高度 | `56px` |
| 阴影 | `0 1px 3px rgba(0, 0, 0, 0.12)` |
| 滚动态阴影 | `0 2px 8px rgba(0, 0, 0, 0.15)` |
| 位置 | `position: fixed; top: 0; z-index: 50` |
| 页面留白 | body `padding-top: 56px` |

### 4.6 模块标签（Module Tab）

#### 排序原则

标签按**增量 > 存量**排列：增量（产生新数据的操作）排在存量（查看已有数据）之前。增量内部和存量内部的具体顺序需具体分析。日历与写入同属增量（均涉及带时间戳的待办数据），应合并在同一标签。

#### 功能融入优于独立

辅助性功能融入主功能 tab，不独立成 tab。判定标准：该功能是否依赖主功能的数据上下文？若是，则融入主功能 tab 作为子区块；仅当功能完全独立、不依赖主 tab 上下文时才独立成 tab。

已落实案例：经验沉淀融入监督复盘（督促清单）、追踪看板融入专班管理（活动进度）、专班工作量融入项目看板。

#### 职责有入口

角色有职责就必须有系统入口。如果制度文件（如支委与党小组定人定责定岗说明.md §二 党小组组长职责表）定义了某项职责，但系统中无对应操作入口，则视为功能缺失，需补全。

已落实案例：党小组组长复盘反馈职责→新增复盘提交 tab。

#### 视角正交

同一数据可从不同视角查看，不重复操作入口。视角不同不等于功能重叠——操作入口按赋权范围约束分布，只读视图可全局共享。

已落实案例：人全景（以人为中心）只读 vs 常设赋权（以项目为中心）写入，两入口互补不重叠。

#### 工作台分组主轴（2026-09-14 支书裁定·全盘重设）

> 沉淀：支书实报「tab 怎么划分，要做一次全部重新的考虑」，叠加现状彻查（7 台共 65 个 tab）：原分组把「职责写操作」「只读知情报」「个人自助」「静态制度」混装在同一组「党建」下——纪检台「考勤管理（写）」与「专班查看（纯只读）」同组，成员台「党建」组 6 项全为本人只读，组名无法说明「这一屏是干什么的」。

**主轴：按行为性质分四组**（不按业务域分）——四组标准适用**支部角色工作台**（支书 / 组织 / 宣传 / 纪检 / 组长 / 成员六台）；**党委台为院级三组例外**（首页 → 全院治理 → 支部治理，见 [PARTY_COMMITTEE_DESIGN.md](../evolution/PARTY_COMMITTEE_DESIGN.md)）：

| 组 | 判定问句 | 典型成员 |
|---|---|---|
| 工作台 | 今天先看哪 | 今天 / 待办 / 工作概况（各台同构的核心三件套） |
| 我的职责 | 我要动手做什么（写操作） | 活动管理 / 考勤上传 / 考察上传·管理 / 专班管理 / 成员名册 / 人才库 / 发展数据 / 组员进展 / 通知发布 / 赋权管理 / 上报党委 / 党小组 / 补课（并入「考勤管理」一级分段） |
| 知情查看 | 我可以看什么（纯只读） | 知情查看（活动与专班分段）/ 支部分工 |
| 制度与答复 | 哪些是必守与要回的 | 我的处置 / 反馈管理 |

组内仍按「增量 > 存量」排序（见本节排序原则）：「我的职责」内先排产生新数据的写操作。

**减法规则·同质薄壳合并（同批裁定）**：功能同质、仅作薄包装的 tab 合并为一个 tab，内部用分段钮切换视图——「专班查看」（纪检 / 组长 / 支书三台）与组织台「活动查看」合并为单个**知情查看**承载 tab（内部分段：活动 / 专班；单一源 `components/insight-view.js`）；纪检台原「补课制度」并入「考勤管理」的一级分段（内部分段：考勤 / 补课），原「制度与文本」tab 及其支部邮件查收分段已废止。判定沿用本节「功能融入优于独立」。

**核心组改为显式声明**：原实现以显示标签反推核心组（判据写死为「分组名等于『工作台』」），导致党委台须把自己的核心组改名为「首页」再靠整台豁免绕开判定，一物两名。现改为**注册表显式声明核心组**（固定项声明，不再以显示标签反推）；党委台保持「首页 / 治理总览」命名，无需特例。

#### 规范

| 状态 | 背景 | 文字色 |
|------|------|--------|
| 默认 | `transparent` | `--neutral-700` |
| 悬停 | `--surface-hover` | `--neutral-800` |
| 激活 | `--surface-active` | `--primary-700` |
| 激活（强调）| `--primary-700` | `#FFFFFF` |

> CSS 实现见 `docs/src/styles.css` 的 `.module-tab` 选择器。

### 4.7 角色按钮/卡片（Role Button / Card）

保留左侧 4px 色条作为角色识别元素。

> CSS 实现见 `docs/src/styles.css` 的 `.role-card` 和 `.role-card::before` 选择器。

### 4.8 支委嵌套子视图（Commissioner Nested View）

「支委」采用统一入口 + 嵌套子视图的层级结构，避免3个独立按钮导致的视图层级混乱。

**交互流程**：
1. 点击「支委」→ 展开子视图（3个支委角色选项）
2. 再次点击「支委」→ 收起子视图
3. 点击子视图中的具体支委角色 → 设置对应角色 + 保持子视图展开
4. 点击其他角色 → 自动收起支委子视图

**视觉规范**：

| 属性 | 值 |
|------|-----|
| 子视图容器 | `padding-left: 20px; margin-left: 20px; border-left: 2px solid --neutral-200` |
| 子视图展开 | `max-height: 300px; opacity: 1; transition: 0.3s ease-out` |
| 子视图收起 | `max-height: 0; opacity: 0; overflow: hidden` |
| 子项卡片 | `padding: 10px 14px; border: 1px solid transparent; background: transparent` |
| 子项图标 | `32px × 32px`（比主卡片图标小 8px） |
| 展开指示器 | 向下箭头 SVG，展开时旋转 180° |
| 组织委员图标色 | `--accent-org-commissioner` (紫) |
| 宣传委员图标色 | `--accent-prop-commissioner` (蓝) |
| 纪检委员图标色 | `--accent-disc-commissioner` (琥珀) |

### 4.9 日历图例系统（Calendar Legend）

日历视图必须配套图例系统，确保无角色知识的成员也能通过颜色快速区分活动类型。

**显示规则**：仅当存在至少一种非默认色彩的活动时展示图例。无活动或仅有默认色活动时自动隐藏。

**交互**：图例默认展开，可通过「收起/展开」按钮折叠。折叠后仅保留标题栏。

| 属性 | 值 |
|------|-----|
| 容器 | `card rounded-2xl p-5` |
| 标题 | `font-title-cn text-sm font-bold` |
| 布局 | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2` |
| 色块尺寸 | `12px × 12px, border-radius: 3px` |
| 标签字号 | `0.75rem`，颜色 `--neutral-600` |
| 空状态 | 图例整体 `hidden` |

**数据来源**：`constants.js` 的 `ACTIVITY_CAT_COLOR` + `ACTIVITY_TYPE_LABELS`，与日历着色使用同一色系索引。

### 4.10 数据展示视图组件

系统所有视图基于同一数据源（`BranchService.listActivities()`），各角色按需使用不同展示模式。

| 展示视图 | 适用场景 | 组件形态 | 当前状态 |
|---------|---------|---------|---------|
| 日历视图 | 全量活动时间分布（参与者/支书/党小组组长） | 月历网格 + 图例系统 | ✅ 已实现 |
| 表格视图 | 任务总览/档案清单（组织者/宣传/纪检） | 列式表格（状态+截止日期+负责人） | ✅ 已实现（inspector.js） |
| 查询视图 | 按条件筛选（纪检/支书） | 筛选表单 + 结果列表 | 🔜 规划中 |
| 看板视图 | 候选人阶段流转（组织委员） | 泳道列（待办→进行中→完成） | 🔜 规划中 |
| 甘特视图 | 活动执行时间线（组织者） | 横向时间轴 + 任务条 | 🔜 规划中 |
| 画册视图 | 宣传物料预览（宣传委员） | 卡片网格 + 缩略图 | 🔜 规划中 |
| 表单视图 | 活动详情填写/编辑 | 表单组（标签+输入框+按钮） | ✅ 已实现（#calendar-create-panel） |
| 执行层仪表盘 | 支书「全局概况」 | KPI 顶栏 + 异常优先队列 + 叙事行 + 趋势 sparkline | ✅ 已实现（overview-tab.js） |
| 归档分页列表 | 归档库（活动/专班/通知） | 每页 10 条 + 页码窗口 + 搜索重渲染 | ✅ 已实现（archive-entry.js） |

**无上限数据分页铁律（2026-08-08 指令 #3）**：凡数据量随使用无限增长的列表一律分页。模式：每页 10 条 + 上一页/下一页 + 页码窗口（5 页）+ 「共 N 条 · 第 x/y 页」摘要；搜索/筛选/翻页触发整段重渲染，搜索时页码归 1。已落地：归档库三分页（党建活动/专班/通知）、查询视图（query-view.js）；后续新增无限增长列表必须自带分页。

**分页控件样式单一源（2026-09-14 批次 28 支书裁定）**：分页控件（表下「上一页 / 页码 / 下一页」）统一落 `docs/src/styles.css` 的 `.page-btn`（翻页钮）与 `.page-num`（页码钮）——同高 **30px**（按钮规范「默认档」）、同边框、同圆角、同字号 **12px**；**当前页用自有类 `.is-current`**，禁止再借 `.chip-accent-on` 表选中态（原状四处借用，其 `!important` 掩盖了「当前页按钮缺基础边框与底色」，且 chip 语义被挪用）；颜色一律取主题变量（`--neutral-*` / `--app-accent-*`），深色主题自动跟随，**不再各写深色覆盖**（原 `.qv-page-btn` 深色补丁已删）。原状 6 处形态不一（26 / 32px）已一并收敛：`components/issue-list.js`、`components/query-view.js`、`entries/archive-entry.js`、`entries/tabs/secretary/feedback-tab.js`、`entries/tabs/disc/attendance-tab.js`（连体分段钮改两枚独立按钮）、`entries/tabs/visitor/activities-tab.js`。守卫见 `server/test/filter-row.test.mjs`。

**翻页标记单一源＝[`components/pager.js`](file:///d:/GitHub/GSM1921-SOP/docs/src/components/pager.js)（2026-09-14 批次 38 支书裁定）**：导出 `pagerHtml({ page, pages, total, unit })`，是全站**唯一**产出 `.page-btn` / `.page-num` 标记的地方（样式仍归 `styles.css` 的 `.page-btn` / `.page-num`，本文件只产标记）；自 `list-filter.js` 内部**下沉为叶子件**是为断掉模块环（`relation-matrix → list-filter → inspector → vote-summary-panel`），供统一检索引擎与「人 × 项目」矩阵共用；**页数 ≤1 返回空串**（小表零负担）。批次 38 另把 6 处手写翻页控件并轨到 `pagerHtml`（各自类名/属性撤除，改读 `data-lf-page`）：归档库 `entries/archive-entry.js`、`components/issue-list.js`、支书台 `entries/tabs/secretary/feedback-tab.js`、通用查询视图 `components/query-view.js`、成员活动列表 `entries/tabs/visitor/activities-tab.js`、考勤明细 `entries/tabs/disc/attendance-tab.js`（原 `id="att-table-prev/next"` 撤除）。守卫 `server/test/filter-row.test.mjs::S11`（`class="page-btn"` / `page-num` 只允许由 `pager.js` 产出）。

**表格样式单一源（2026-09-14 支书裁定·覆盖所有【表】）**：全站表格的表头与行样式**只允许一套**，落 `docs/src/styles.css` 的 `.data-table` 类族（表头 `8px 12px`／左对齐／`--neutral-500`／`--neutral-0` 底，表体行线 `--neutral-100`，行悬停 `--neutral-50`，数据格 `8px 12px`，表宽 `100%`／字号 `0.8125rem` 13px／行高 `1.25rem`）；**表头不得再由各 tab 各写一遍**（原状：7 个文件各写一份 headHtml、三种表头模式，其中一处独用 `py-1.5`、两处独用 `px-2 py-1`）；调用点只写 `<table class="data-table">`，行内不得再补 `w-full`/`text-xs`；列级特例（sticky 固定列、`whitespace-nowrap`、`truncate`）可按需在行内声明；表格横向滚动容器由承载组件提供 `overflow-x-auto`。**全站表格类族收成 `.data-table` 一套**（2026-09-14 批次 39 支书特批）——原「专用矩阵（表决矩阵 `.vs-matrix`）保留自身类族」的例外表述作废，5 条已成为死样式的 `.vs-matrix*` 规则已删。守卫见 `server/test/filter-row.test.mjs` S3/S4、`S12`（**手写表格收敛台账**：`<table` 只允许出现在 4 个登记位置——`components/list-filter.js` / `components/relation-matrix.js` / `entries/tabs/disc/attendance-tab.js`（考勤明细）/ `entries/tabs/secretary/group-progress-tab.js`（党小组清单），带防僵尸）。

**「人 × 项目」矩阵＝宽表单一源（2026-09-14 批次 35 立项 / 批次 39 推广三域）**

> 支书原话：「活动的考勤考察，还是以 long form 为主，也就是每人次一行。wide form 是不是一个更加简明的表现方式呢？人和活动/专班/别的……分离开后，其实存在一种**转置**方式！第一列是人的话，就可以展示他参加的项目；如果第一列是项目，那就可以看有哪些人。这是一个**很全局性的**需要思考和改进工程！」
> 支书裁定：① **宽表默认**（long form 降为「明细 / 导出」下钻）；② 矩阵**推广到其它二元关系域**（批次 39 落地：支部分工、专班报名总表、表态汇总）。

凡「人 × 项目」这类**二元关系**（考勤、考察、支部分工、专班报名总表、表态汇总、思想汇报台账）一律走单一源组件 [components/relation-matrix.js](file:///d:/GitHub/GSM1921-SOP/docs/src/components/relation-matrix.js)：

1. **转置双视图**——`byPerson`（行＝人，列＝项目，看「某人参加了哪些」）与 `byItem`（行＝项目，列＝人，看「某项目有哪些人」）**互为转置**：同一份数据、同一 cell 口径，切换只换视角，不是两张表；
2. **项目维列上限 6**（`MATRIX_COL_LIMIT`）——项目（活动/专班/工作项）随年份无限累积，列不能无限长；超限时给「**显示全部 N 项**」一键展开（展开态按 `stateKey` 记忆，跨重渲染不丢），行维保持全量；
3. **横向滚动 + 首列吸附**（`overflow-x-auto` + `sticky left-0`）——宽表横向滑动时维度名不丢；
4. **筛选归调用方**（活动名/时间区间/姓名/分面），组件只负责「列取哪几项 + 转置 + 展开」——筛选是各域口径，矩阵是共同载体；
5. **载体不另造样式**——表格用 `.data-table`，展开钮用 `.lf-btn`（全站单档 38px/13px），不为矩阵新增类族（`styles.css` 属禁改文件）；
6. **默认视图＝宽表**（long form 的定位改为「明细 / 导出 / 打印」下钻）；
7. **人维分页**（批次 38）——`MATRIX_ROW_LIMIT = 10`（每页 10 人），`cfg.rowLimit` 可配、**0＝不分页**；人维无论落在行（按人）还是列（按项目）都按同一页切片，页控件走 `components/pager.js::pagerHtml`（翻页标记单一源，见 §4.10「翻页标记单一源」）；
8. **`cfg.cellClass(pid, iid)` 单元格附加类钩子**（批次 38）——单元格语义经既有语义类复用（如表态矩阵的「异议」红底 /「未投」灰字复用 `.vs-object` / `.vs-none`），**不为矩阵新增样式类族**。

**转置双视图的调用点清单（批次 35 + 39 + 41 + 43）**：考勤（`disc/attendance-tab.js`，按人 / 按活动）、考察（`disc/inspection-tab.js`，按人 / 按项目）、支部分工（`secretary/work-map-tab.js`，平铺模块 / 按人 / 按项目三视图，缺省「按人」宽表）、专班报名总表（`org/taskforce-tab.js`，人 × 专班，列封顶最近 6 个专班可展开）、表态汇总（`components/vote-summary-panel.js`，行＝议题、列＝应到成员）、思想汇报台账（`org/thought-review-tab.js`，人 × 期次，列封顶最近 6 期可展开，**可按人 / 按期次互转**）。

**已迁移**：`entries/tabs/disc/attendance-tab.js`（考勤矩阵，默认「按人」，`byActivity`＝转置视图）、`entries/tabs/disc/inspection-tab.js`（考察，默认「按人」，新增「按项目」＝转置）；批次 39 再推广三域：`entries/tabs/secretary/work-map-tab.js`（支部分工，平铺模块 / 按人 / 按项目三视图，缺省「按人」宽表）、`entries/tabs/org/taskforce-tab.js`（专班报名总表，人 × 专班）、`components/vote-summary-panel.js`（表态汇总，行＝议题、列＝应到成员）；批次 41 末域收口：`entries/tabs/org/thought-review-tab.js`（思想汇报台账，行＝支部在册成员、列＝期次 `YYYY-Qn` 新→旧，cell＝该期最需处理状态徽标＋多篇「N 篇」，未提交＝「—」；原按人分组 + 组内每篇一行的列表随之撤除，「待初阅队列」保留作按篇下钻）。
**口径例外（两处，经支书批准并在守卫登记）**：表态汇总走 `colLimit: 0`（议题维＝单场议程，有界，不需「最近 6 项」封顶）与 `rowLimit: 0`（人维＝本场应到名单，须一屏看全表决分布）；二者由 `relation-matrix.test.mjs::S5` 锁白名单防僵尸。
**待迁**：**（空）**——各二元关系域已全部迁入；如需新增域，按「项目维＝谁、cell 语义＝什么」先定口径再接组件，**不得各写一版**。
**守卫**：`server/test/relation-matrix.test.mjs`（S1 组件单一源 + 人维分页 + 引用 `pager.js` / S2 参与方不得自造矩阵（`<th class="sticky left-0">` 只允许出现在组件内）/ S3 宽表默认且 long form 降为「明细」/ S4 矩阵类实现收敛台账（白名单已清空——表态矩阵已并入）/ S5 `rowLimit: 0` 须登记备案 + 白名单防僵尸 / **S6 思想汇报台账＝人 × 期次（接入单一源 + 列维＝期次 + 期次排序走单一源 + 行维取实时视图 + 禁回潮按人分组自建列表）** / ① 真机：默认宽表 → 列上限 6 → 一键展开 → 切转置视图行列互换 / **② 真机：思想汇报台账（首列「姓名」/ 人维 ≤10 / 列头 `YYYY-Qn` 新→旧 / 有可下钻 cell 与「—」/ 待初阅队列仍在 / **切「按期次」首列变期次、切回「按人」复原**）**）；**分页全覆盖另有真机全站普查守卫 `server/test/page-sweep.test.mjs`**（批次 43：七个工作台 × 全部 tab 逐一进页面——P1 引擎列表渲染行数 > 10 必须有翻页控件 / P2 矩阵人维 ≤ 10 行且计数口径为「共 N 人 · 第 x / y 页」/ P3 手写表格 > 10 行须有翻页 / P4 首列是人的引擎表须有搜索框（引擎门槛 `SEARCH_FILTER_MIN_ROWS` 之内不要求）/ P5 零 pageerror）。

**执行层仪表盘（2026-08-08 指令 #2，管理科学视角重设计支书「全局概况」）**：弃用"各模块数字罗列"，改为执行层决策视图：
- **KPI 顶栏**（5 项）：本月出勤率 / 复盘完成率 / 归档完成率 / 考察积压 / 待办异常——各带「目标 vs 实际」对比、达标徽章、进度条；
- **异常优先队列**：超期 > 待处理 > 常规，按紧急度排序（红=紧急/橙=提醒/蓝=常规），支持一键催办与直达处置；
- **叙事行**：一句话说明"发生了什么、为什么"（e.g. 复盘率较上周 +8%，源于党小组组长回填提速）；
- **趋势 sparkline**：近 6 场有考勤记录活动的出勤率折线，全部消费 `var(--app-accent)`。

### 4.11 图标规范

图标是组件的一种特殊形态，本节规定其格式与标准。

#### 4.11.1 格式要求

- **必须使用 SVG**（内联或 `<img>`）
- **禁止使用**：Emoji（如 🔍 → `<svg>...</svg>`）、PNG 图标、Icon Font

#### 4.11.2 SVG 图标标准

| 属性 | 值 |
|------|-----|
| 尺寸 | `18px × 18px`（标准）/ `24px × 24px`（大图标） |
| 描边 | `stroke="currentColor" stroke-width="2"` |
| 填充 | `fill="none"`（线性图标）/ `fill="currentColor"`（实心图标） |
| 圆角 | `stroke-linecap="round" stroke-linejoin="round"` |

#### 4.11.3 图标使用示例

```html
<!-- 内联 SVG（推荐） -->
<button class="module-tab">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
  <span>工作台</span>
</button>
```

### 4.12 交互载体决策规范（T-217）

> 沉淀：2026-08-05，指令"适用悬浮表单的场景有点受限，下拉选择和表单出现的位置值得深究"。系统录入/操作按场景判定载体，防止"所有表单都内联在页面"或"所有操作都弹窗"两极化。

四种载体按场景判定：

| 载体 | 适用场景 | 判定要点 |
|------|---------|---------|
| 悬浮表单 | 轻量录入（≤3 字段）；需要上下文锚定的主录入（如写入活动） | 录入动作，字段少或主流程 |
| 就地展开 | 以「查看」为主 + 快捷操作 | 读为主，不破坏页面常驻结构 |
| 内联面板 | 页面主流程长表单（多字段、多步骤） | 常驻、需要持续可见 |
| 跳转 | 整页级操作 | 独立页面 |

**已落实案例**：
- 支书「写入活动」→ 悬浮表单（`openModal` 720px，Step1 选模板 → Step2 填表单），提交成功关闭悬浮 + 列表刷新（2026-08-05）
- 组长工作台「添加记录」→ 就地展开（查看为主 + 快捷录入，2026-08-05 起按本表判定保持）
- 纪检批注 → 悬浮表单（`openFormModal`）

**筛选行载体（2026-09-14 补）**：筛选器不属上表四种载体，单独定则——关键词用紧凑档输入框，每个可枚举维度用**一个下拉**（首项「全部」），仅互斥视图切换才用分段钮；**禁止 chip 承担筛选**（详见 §4.3「筛选行规范」）。

### 4.13 选人规范（PersonPicker）

> 沉淀：2026-08-05，"我们人太多了"——全支部约 50 人，select 罗列人名不可搜索、不可分组，选择成本高。

**硬性规则**：
1. 凡选择「具体人」，一律使用 `PersonPicker`（自带姓名/学号搜索 + 党小组分组 tabs + 单选/多选）
2. **禁止用 select 下拉罗列人名**
3. 表单内选人同样走 PersonPicker（嵌入表单渲染）
4. 候选范围过滤用 PersonPicker 的 `filter` 选项（如排除支委），不得预生成 select option

**例外：「任命 / 指派到人」可用下拉（2026-09-14 批次 31 支书裁定）**

> 判据是**语义两分**，不是载体偏好：**「选名单里的成员」**（参与人、流出对象、批量处理、候选人）→ 必走 PersonPicker；**「把某职责任命/指派给谁」**（任命支书、分工到人、落实责任人）→ 允许下拉。理由有二：① 指派类字段常是**混合取值**（「支委角色」或「具体成员」二选一），PersonPicker 只表达「具体人」，硬换会丢掉「按角色指派」这一档；② 任命类候选集合小且需并列显示「现任/发展阶段」等旁注，下拉反而读得更快。

**已登记例外（全站共 4 处，守卫 `filter-row.test.mjs::S9` 锁白名单）**：

| 位置 | 语义 |
|------|------|
| `entries/tabs/party-committee/branches-tab.js` | 党委台「支部管理」任命支书（候选附「现任」标注） |
| `components/org-setup-wizard.js` | 换组织向导内任命 |
| `entries/tabs/secretary/workforce-panel.js` | 支书台分工到人（支委角色 或 具体成员） |
| `components/resolution-followup-manager.js` | 决议落实「责任人」（与分工同口径） |

**已落实案例**：项目赋权选人（原 select 罗列人名 → PersonPicker 搜索选择，2026-08-05）。

### 4.14 状态徽章（Status Badge）

> 沉淀：2026-08-05，行内状态下拉（原生 select）→ 轻交互徽章原型。行内状态展示优先用徽章而非下拉框。

- 通用组件 `status-badge`：渲染「色点 + 文字」徽章，点击弹出小悬浮选择器（clamp 边界定位），选中即改
- 用途：任务状态 / 考勤状态 / 交接状态等行内状态，替代原生 select 下拉
- 交互：触屏可点（click 触发，非 hover）；点击外部 / ESC 关闭；已归档等只读场景禁用
- 已落实：任务状态（inspector.js）原型先行；考勤/交接视效果决定推广（2026-08-05）

### 4.15 反馈管理规范（2026-08-08 指令 #7 增强）

> 反馈采用 GitHub Issue 风格：草稿审核（支书通过/驳回）→ 公开 → 指派 → 处置（归支委会，由支书主持支委会）→ 待终审 → 关闭。2026-08-08 按指令三项增强定稿。

**提交侧（issue-form.js）**：
- **人名化**：提交人/评论人/指派人一律经 `PersonStore` 解析为姓名，禁止显示 mock 字段/角色键；
- **匿名提交开关**：checkbox（`.checkbox-accent`）勾选后**对外显示「匿名」**（列表/详情提交人均显示「匿名」，详情面板**不**标注真身），后台（服务端 `issues` 表 / mock 本地库）**保留真实提交人 `_realPersonId`**。
  - **2026-09-17 支书改裁**：「后台记录真实情况，匿名是前端的。但是我们也强调清楚，查看匿名的权限只有党委有。」⇒ **查看真身的权限只有党委**（党委台「匿名反馈核查」页签；服务端 `GET /api/v1/issues/reveal`，**每次查看留痕** `issue_reveals`）；**党支部内部（含支书）不可见**——「处置」与「查看真身」是两项分开的权限（本行旧文「仅支书内部可追溯 / 详情面板标注『真实提交人（仅支书可见）』」随本次改裁作废）。适用范围：本改裁只落在意见反馈，「正式表决无记名」维持原裁定不变。

**处置侧（feedback-tab.js 支书工作台）**：
- **正式答复栏**：独立输入行 + `btn-accent` 按钮，以 `kind='reply'` 写入时间线；时间线以主题色浅底 + 「正式答复」徽标显著区分，作者经 `getPersonName` 解析为支书姓名；
- **操作层次**：评论=次级（`.btn-accent-soft`）、批复=主操作（`.btn-accent`）、正式答复=主操作 + 徽标（三者视觉可区分，回应"什么时候用什么颜色"）；
- **提交人悬停卡片**：列表提交人行 hover 展示「姓名 · 学号 · 发展阶段 · 党小组」（`.tip-trigger[data-tip]`，零 JS）。

### 4.16 组件设计原则（承接原 insights §4.2，2026-09-04 分流）

> **承接说明**：2026-09-04 自 content/insights/工程演进与设计方法论.md §4.2 分流（[4] 标签；支书裁决 04=纯系统设计）。与本节 4.1~4.15 既有组件规范互补——既有条目规定组件"长什么样"（规格表），本节记录组件"为什么这样设计"（布局/交互论证与判例）。出处注记：（原 insights §4.2）。

**主页布局：2+1 排布**：上方两列（通知+招募）+ 下方全宽（日历），信息层级清晰。三等分布局不适合信息层级不同的内容——通知和招募是快速浏览型，日历是深度交互型，不应争夺同样的视觉空间。

**侧边栏交互：overlay 优于挤压**：桌面端侧边栏展开时挤压主内容区（margin-left）会导致内容重排。overlay 不影响主内容区的布局计算，用户可以在侧边栏打开的同时继续阅读主内容。挤压模式则迫使主内容区重新计算宽度，造成视觉跳动。

**卡片 hover 效果：渐入优于突现**：`transition: box-shadow 0.3s ease-out`，hover 时阴影渐入而非瞬间出现。突兀的视觉变化会打断用户的阅读流。

**标题应统领卡片而非内嵌于卡片**：h2 标题被包裹在 `div.card` 内部时，视觉上卡在"中不溜"的位置——既不在页面顶端，也不在卡片核心内容区。标题是"这是什么页面"的宣言，卡片是"在这里能做什么"的容器——两者不应混为一谈。

**反馈系统作为独立子页面**：旧设计把"意见反馈"做成 header 角落里的一个链接，既不美观也无法承载复杂交互。一个功能如果值得被单独提及（如 header 中的独立链接），那么它很可能值得一个独立的子页面。把它塞进边角等于在暗示"这个功能不重要"。

**侧边栏即全局导航**：每新增一个子页面都应同步在侧边栏中新增导航项。侧边栏是用户在多页面系统中的"地图"——岔路越多，地图越不能缺页。

### 4.17 快速导航矩阵形态（承接原 insights §4.16，2026-09-04 分流）

> **来源：**help 页快速导航再设计（T-201，2026-08-04）。确立于快速导航从罗列式改为矩阵式的视觉再设计。出处注记：（原 insights §4.16）。

**矩阵形态**：多角色 × 功能域导航用紧凑表格表达——行对应功能域、列对应角色，六类角色列等宽平级、支书列置后，公共页面独立为表上贯通横条；功能 chip 用 `<a>` 跳转（带 `:focus-visible`）。对比按角色分组的卡片网格：网格信息全但无层次、无关系、无视觉锚点；矩阵用双轴编码把"谁有什么功能"压缩进一张表，空格子以淡色填充弱化空洞。

**扁平化落点**（全仓库适用）：主持角色不得置于最高/最中心；所有角色列完全等宽、同样式、平级。行归并按"同域归并"而非"同角色归并"——考勤+考察→「考勤与考察」行、活动+专班→「活动与专班」行（专班不得与统筹合并）；**合并行标签必须保留"与"字**，省略后行名失去并列语义。

**为什么不是"每角色一张卡片的平铺网格"**：卡片网格是 T-201 被否的方案——纯罗列无法表达导航关系。平铺把信息全部摆出但没有关系表达，用户仍需自行拼装"哪个角色有哪些功能"；矩阵把关系编码进行列结构，一眼可查、可横向比较。网格形态在导航项不可正交切分时仍可用（如单角色站点），不构成全盘否定。

**生效条件**：导航项可按"角色 × 功能域"两轴正交切分的多角色系统（组织内部管理系统、多岗位后台）。单角色站点、或导航项无法正交切分时，卡片/列表形态仍适用。

> **元数据**
>
> - 出处：T-201 help 页视觉再设计（2026-08-04）
> - 关联：最小三成本（[DESIGN_METHODOLOGY.md](../evolution/DESIGN_METHODOLOGY.md) §1.3.1）、H40.1 概念命名守则（扁平化）、web-design-guidelines（语义 `<a>`/focus-visible）

---
