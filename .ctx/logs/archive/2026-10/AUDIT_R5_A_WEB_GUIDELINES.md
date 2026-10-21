# AUDIT R5-A · Web Interface Guidelines（7 工作台 / 62 tab）

- 审查路线：A 路（只读；未改任何源文件、未提交 git、未更新 tasks.md）
- 审查基准：`web-design-guidelines` Skill（Vercel Web Interface Guidelines）+ H21 三问
- 范围：`docs/workspace/{secretary,leader,org,prop,disc,visitor,party-committee}.html` 共 62 个 tab，及其共享壳层与组件（`components/shell/*`、`components/ui/*`、`styles.css`）
- 证据口径：`file:line`；另含一次 Chromium DOM 实测（`<base>` 下 `#` / `?` 相对链接的真实 href）与 1024/768 现有截图
- 证据缺口：`.ctx/evidence/2026-10-19/` 只有 768/1024 的工作台截图，**没有 390px 工作台截图**；390px 结论为代码 + 视口规则推演，已在对应条目注明

---

## 一、结论摘要

62 个 tab 的壳层与通用浮窗（`components/ui/modal.js`）整体成熟：对话框语义、背景 `inert`、焦点接管/归还、Esc/遮罩/取消统一、错误行 `aria-invalid` + 聚焦首错都已落地；tab 栏也有 roving tabindex + 方向键。问题不在“有没有做”，而在**少数系统性缺口被 62 个 tab 放大**。

最需要先修的 3 个系统性 P1：

1. **`<base href="../">` 把所有“同文档跳转”打到首页**：7 个工作台的「跳到主要内容」skip link、工作概况的「待办/在办」锚点、组长台「查看本组活动」、以及两处 `?tab=...` 相对链接，全部解析到 `docs/` / `docs/?tab=...`。Chromium 实测：`<base href="https://…/docs/">` 下 `href="#wo-lines"` → `https://…/docs/#wo-lines`。这是**键盘用户的 skip link 直接失效 + 6 个概况页的主指标点击离开工作台**。
2. **焦点可见性两套都失效**：亮色下输入族只用“边框变金”（`#FFD700` on `#FFF` ≈ **1.34:1**，不足 3:1）；暗色下按钮/链接焦点环用的是 `--app-accent-text: #1F2937`（暗底 ≈ **1.15–1.28:1**），而同一规则里先写的党徽金被后一行覆盖，实际永远不生效。
3. **自定义下拉（custom-select）键盘半成品**：触发器只有 `aria-haspopup`/`aria-expanded`，**没有字段名**（`<label for>` 指向被隐藏的原生 select，可访问名只剩当前值），选项是 `div[role=option]` 但无 `tabindex`/`aria-activedescendant`，键盘只能 Esc 关闭、**无法选择任何选项**。所有带 `.input-flat` 的 select 都受影响（检索分面、成员流动、名册、考勤等）。

其余高优先级：6 个 tab 存在**只能鼠标点的行/折叠头**；通知删除**无确认、无撤销**；宣传台归档推进浮层**无 dialog 语义、固定 380px、监听器泄漏**；10 处 4–8 列宽表未启用已有的 `data-responsive="cards"`，390px 直接压成窄列。

**发现计数：35 条（P1 9 / P2 16 / P3 10；模式 26 / 个案 9）。**

---

## 二、62 个 tab 盘点（H21 ① 的前置事实）

| 工作台 | tab 数 | tab 清单（分组） |
|---|---:|---|
| 支书 secretary | 12 | 今天、待办、全局概况（工作台）／活动管理、支委会、党小组、通知发布、上报党委、成员流动（我的职责）／支部分工、知情查看（知情查看）／反馈管理（制度与答复） |
| 组长 leader | 10 | 今天、待办、工作概况（工作台）／活动日历（工作台）／我的处置（制度与答复）／本组活动、考勤管理、考察管理、组员进展（我的职责）／知情查看（知情查看） |
| 组织 org | 10 | 今天、待办、工作概况（工作台）／活动日历（工作台）／我的处置（制度与答复）／成员名册、人才库、思想汇报、专班管理、成员流动（我的职责） |
| 宣传 prop | 8 | 今天、待办、工作概况（工作台）／活动日历（工作台）／我的处置（制度与答复）／宣传任务、项目看板、档案归档（我的职责） |
| 纪检 disc | 8 | 今天、待办、工作概况（工作台）／活动日历（工作台）／我的处置（制度与答复）／考勤管理、复盘、考察管理（我的职责） |
| 成员 visitor | 11 | 今天、待办、工作概况（工作台）／我的处置（制度与答复）／活动动态、项目分工、考勤概况、思想汇报、我的考察、我的复盘（我的职责）／专班动态（知情查看） |
| 党委 party-committee | 3 | 下发通知、支部上报、支部管理（党委治理） |

口径：`secretary/leader/org/prop/disc/visitor` 的能力声明见 `docs/src/capabilities/*-workspace.js`；党委 3 个见 `party-committee-workspace.js:16-34`（2026-10-20 已由 5 缩到 3）。

---

## 三、发现表

> 「模式」= 跨 ≥3 个 tab / ≥3 个调用点重复；「个案」= 单点。严重度按“是否阻断键盘/移动端核心路径”定级，未把纯审美问题升到 P1。

### P1

| 编号 | 位置（证据） | 发现 | 模式/个案 | 严重度 | H21 |
|---|---|---|---|---|---|
| R5A-01 | `docs/workspace/secretary.html:5`（`<base href="../">`）+ `:26`（skip link）；其余 6 个工作台同构；`components/governance/work-overview.js:136-138,461`；`entries/tabs/leader/my-tasks-section.js:52`；同构另见 `workspace/branch-readonly.html:4` + `entries/pages/branch-readonly-entry.js:79` | **`<base>` 破坏同文档锚点**：`href="#main-content"` → `/docs/#main-content`，skip link 把键盘用户带离工作台；概况页「待办 / 在办 / 第四项」三个 `<a href="#wo-…">` 与「查看本组活动」同样落到首页。Chromium 实测 `#wo-lines` → `https://example.org/docs/#wo-lines` | 模式 | P1 | ③ |
| R5A-02 | `entries/tabs/prop/kanban-tab.js:60`；`entries/tabs/party-committee/branches-tab.js:154` | **`?tab=...` 相对链接在 `<base>` 下变成首页 query**：`?tab=archive` → `/docs/?tab=archive`，`?tab=review&branchId=…` 同理；“去档案归档”“N 项待批复”均不可达 | 模式 | P1 | ③ |
| R5A-03 | `components/ui/custom-select.js:304-312`（触发器）、`316-318`（listbox）、`130-145`（option 为不可聚焦 div）、`326-358`（仅 click + Escape）；`components/ui/form-field.js:12-13`（`label for` 指向原生 select）；`styles.css:734-745`（原生 select 仅视觉隐藏，未 `aria-hidden`） | **自定义下拉键盘不可选、且丢失标签**：触发器无 `id`/`aria-labelledby`，可访问名只有当前值；打开后焦点留在触发器，选项不可 Tab/方向键到达；读屏还会遇到一个 1px 的原生 combobox（重复控件） | 模式（全部增强下拉） | P1 | ②③ |
| R5A-04 | `styles.css:14`（`--party-gold:#FFD700`）、`598-601`（`.input-flat:focus` 仅改边框）、`2727-2745`（显式 `outline:none;box-shadow:none`） | **亮色输入焦点 1.34:1**：`.input-flat` / `.cs-trigger` / 登录框聚焦只把边框变党徽金；金 vs 白 ≈1.40:1、vs 页面底 ≈1.34:1，低于 WCAG 1.4.11 的 3:1 | 模式（所有表单控件） | P1 | ③ |
| R5A-05 | `styles.css:2719-2725`（全局 `button/a:focus-visible`）、`:113`（`--app-accent-text:#1F2937` 无暗色覆盖）、`:3411-3427`（暗色 surface `#0B1220/#141D2F`）；同 token 另见 `:2100,2440,4321,4469,4598,4616,4761,4987` | **暗色焦点环不可见**：`outline: 2px solid var(--app-accent-text)` 覆盖前一行的党徽金；深灰 vs 深底 ≈**1.15–1.28:1**，外圈 `rgba(0,0,0,.55)` 也融于深底。键盘用户在深色主题下看不到焦点 | 模式（全站按钮/链接） | P1 | ③ |
| R5A-06 | `entries/tabs/secretary/notification-tab.js:322`（整行 div，唯一详情入口）；`secretary/feedback-tab.js:178`（唯一详情入口）；`leader/review-tab.js:101`、`visitor/review-tab.js:106`、`secretary/group-progress-tab.js:587`（折叠头）；`org/talent-tab.js:216`（卡片跳名册） | **可点 `div` 无 `role`/`tabindex`/`keydown`**：通知与反馈列表回车/空格完全无反应；三个“详情/收起”折叠头无 `aria-expanded`；人才库卡片只能鼠标点（卡内另有链接，故降为 P2 范围） | 模式 | P1 | ③ |
| R5A-07 | `entries/tabs/secretary/notification-tab.js:318`（删除按钮）、`:342-347`（直接 `NoticeStore.remove` + toast） | **通知删除无确认/无撤销**：单击即物理删除（同页 taskforce/归档删除都有二次确认），误点不可恢复 | 个案 | P1 | ②③ |
| R5A-08 | `entries/tabs/prop/archive-tab.js:732-734`（自建 `position:fixed`、`width:380px`）、`:742`（`&times;` 无 `aria-label`）、`:785`（挂 body）、`:796-831`（无 role/focus/焦点归还；非 Esc 关闭时 keydown/outside 监听不注销） | **归档推进浮层是“伪浮窗”**：无 `role="dialog"`/`aria-modal`/标题关联，打开不接管焦点、关闭不还焦点；固定 380px 在 390px 仅剩 2px 边距、375/360px 溢出；取消/确认路径遗留 document 监听 | 个案（组件级缺陷） | P1 | ②③ |
| R5A-09 | `styles.css:4776-4783`（卡式行只在 `[data-responsive="cards"]` 生效）；未启用的表：`disc/inspection-tab.js:121,196`、`disc/makeup-tab.js:111`、`leader/attendance-tab.js:248`、`leader/inspection-tab.js:190`、`org/inspection-tab.js:146`、`leader/write-tab.js:302`、`org/taskforce-tab.js:1015`、`org/talent-tab.js:279`、`leader/members-tab.js:175`、`secretary/work-map-tab.js:113` | **390px 宽表不转卡**：能力已建（`data-label` + `data-responsive`），但只有 5 个调用面采用（disc/attendance、secretary/group-progress、org/member-flow、secretary/committee-meeting、work-overview）；上述 4–8 列表格在 390px 仍按 table 压列，中文逐字换行、操作列挤到不可读 | 模式（10 处表配置） | P1 | ③ |

### P2

| 编号 | 位置（证据） | 发现 | 模式/个案 | 严重度 | H21 |
|---|---|---|---|---|---|
| R5A-10 | `org/taskforce-tab.js:1443-1444,1462-1463,1472-1473`；`secretary/notification-tab.js:381-382,385-386`；`org/member-flow-tab.js:404-405,408-409`；`components/governance/person-edit-modal.js:118-121,257-260`；`secretary/calendar-tab.js:235-236`；`disc/inspection-tab.js:103` | **标签未关联控件**：大量 `<label>` 无 `for`、控件无 `id`/`aria-label`（视觉有标签，语义为零）；议程行两个输入只有 placeholder；纪检搜索框无标签 | 模式 | P2 | ②③ |
| R5A-11 | `party-committee/dispatch-tab.js:134-135`；`org/taskforce-tab.js:1618-1622`；`person-edit-modal.js:328,372,405`；`secretary/notification-tab.js:416-417`；`org/member-flow-tab.js:315,411`（错误容器仅 `hidden`） | **校验错误只发 toast**：无字段级错误、无 `aria-invalid`、不聚焦首错（`openFormModal` 已做对，手写表单没跟上）；错误离字段远、移动端键盘弹起时 toast 可能被遮 | 模式 | P2 | ②③ |
| R5A-12 | `styles.css:72`（`--neutral-400:#9CA3AF`）、`:603-605`（placeholder）；示例 `disc/inspection-tab.js:103`、`org/taskforce-tab.js:99` | **placeholder 对比度 2.42–2.54:1**（`#9CA3AF` on `#FFF/#FAFAF5`），低于 4.5:1；搜索框在无标签时它是唯一提示，影响更大 | 模式 | P2 | ③ |
| R5A-13 | `components/shell/tab-bar.js:239`（组标签 11px，`color-mix(accent 60%, #000)` + 10% accent 底）；`styles.css:2035-2039`（选中 tab 12px，55% accent + 黑） | **页签对比度不足**：金主题下组标签 ≈**3.53:1**、选中 tab ≈**4.12:1**（12px 常规字需 4.5:1）；截图中组标签与选中 tab 同为金色小胶囊，层级也混淆 | 模式 | P2 | ③ |
| R5A-14 | `window.confirm`：`org/taskforce-tab.js:313-315`（连续两次）、`prop/kanban-tab.js:91`、`disc/inspection-tab.js:255`、`prop/archive-tab.js:318`、`secretary/committee-meeting-tab.js:189`、`secretary/workforce-panel.js:289`、`prop/weekly-tab.js:186`、`disc/review-tab.js:474`、`secretary/feedback-tab.js:255`；另有 `leader/write-tab.js:383-390` 子记录删除无确认 | **同一“破坏性确认”三套载体**：原生 `window.confirm`（12 处，含 taskforce 同一次删除连弹两次）、`modal.js` 确认窗（`_mustPressConfirm`）、自建 popover；原生 confirm 不可样式化、不可撤销、不记录上下文，且 taskforce 连续两次 confirm 属过度确认 | 模式 | P2 | ②③ |
| R5A-15 | `feedback-tab.js:178`、`attendance-tab.js:73`、`calendar-tab.js:758,768`、`work-map-tab.js:228`、`visitor/activities-tab.js:70`、`components/record/calendar.js:315,549,559,1018` 等 25 处 | **`transition-all`**：会连 `width/height/box-shadow` 一起过渡，列表 hover 时触发非合成属性；规范要求显式列属性 | 模式（25 处） | P2 | ③ |
| R5A-16 | `components/ui/empty-state.js:19-24`、`components/ui/list-filter.js:272-274`；未采用示例：`visitor/activities-tab.js:238,267`、`visitor/inspection-tab.js:114`、`visitor/thought-report-tab.js:86`、`secretary/group-progress-tab.js:563,583` | **空态两套形态**：单一源只被 7 个文件使用，42 个文件仍手写 `<p>暂无…</p>`；手写版多数无出口动作、无 `role=status`，与 `.empty-state` 的“一句话 + 至多一个动作”口径不一致 | 模式 | P2 | ②③ |
| R5A-17 | `components/shell/tab-bar.js:509-511`（切 tab 只写 localStorage）；`components/shell/workspace-shell.js:617-629`（进入即清掉 `tab/highlight/...`） | **页签状态不反映到 URL**：点页签地址栏不变、浏览器后退不回到上一个 tab、无法分享当前页签；`?tab=` 只在首次进入消费一次，随后被抹掉 | 模式（全部 62 tab） | P2 | ③ |
| R5A-18 | `components/shell/tab-bar.js:249`（`${prefix}-tab-btn` 仅 `transition-colors`，无 `hover:`）；`styles.css` 无 `.tab-btn:hover` | **页签无 hover 反馈**：非选中页签只有文字，鼠标移入无任何变化；与按钮族其它控件不一致 | 模式（62 tab） | P2 | ③ |
| R5A-19 | `entries/tabs/visitor/activities-tab.js:164-173`（`role=tab`）、`:99-105`（只补 `aria-selected`） | **内层视图页签语义不完整**：三个 `role=tab` 无初始 `aria-selected`、无 `tabindex` roving、无 `aria-controls`，也没有对应 `tabpanel`；读屏会把它们当普通页签却找不到面板 | 个案 | P2 | ③ |
| R5A-20 | `entries/tabs/disc/attendance-tab.js:72`（考勤/补课分段钮）；`secretary/work-map-tab.js:228`（平铺/按人） | **分段控件状态只改 class**：无 `aria-pressed`/`role=tab`，读屏无法知道当前段；“激活态”只靠底色 | 模式 | P2 | ③ |
| R5A-21 | `secretary/notification-tab.js:368`（受众 chip）、`:410-412`（只 toggle class） | **受众多选无 `aria-pressed`/分组语义**：选中状态视觉可见、语义不可见；同页通知列表行又是可点 div（见 R5A-06） | 个案 | P2 | ③ |
| R5A-22 | `secretary/feedback-tab.js:189`（`span.tip-trigger`）+ `styles.css:1058-1085`（仅 `:hover::after`） | **hover-only 提示**：提交人说明只存在于 CSS `::after`，键盘无法聚焦、读屏读不到、触屏无 hover；`tip-trigger` 不可聚焦 | 个案 | P2 | ③ |
| R5A-23 | `components/shell/tab-bar.js:270-275`；`styles.css:2070-2095`；截图 `.ctx/evidence/2026-10-19/u10-1024-visitor.png` | **页签箭头/渐隐遮挡页签**：32px 圆形箭头绝对定位压在首/末页签上（点击目标冲突）；可滚时右侧 40px 渐隐会淡化落入该区的页签文字（1024 截图中末枚“我的考…”已被右侧圆钮截断/遮住）——与 2026-10-01 “不再用遮罩淡掉边界页签”的裁定方向相反 | 模式 | P2 | ③ |
| R5A-24 | `components/shell/header.js:229`（通知下拉 `width:320px`）、`:378-389`（条目 `div role=button`）、`:456-461`（Esc 只隐藏，不还焦点） | **通知下拉焦点管理缺失**：焦点在条目内按 Esc 后下拉隐藏、焦点留在被隐藏节点；下拉本身无 `role`/`aria-label`、无 `aria-controls`；320px 固定宽在 320px 小屏会向左溢出（右缘贴铃铛、约差 12px） | 个案 | P2 | ③ |
| R5A-25 | `components/governance/work-overview.js:136-138`（`ariaLabel` 只写“查看待办事项/工作分工表”）、`:459-461`（可见内容是“数字 + 标签”，`aria-label` 覆盖） | **指标带 `aria-label` 吞掉数字**：读屏只听到“查看待办事项”，听不到“2 条待办/3 项逾期”，把概况页最核心的信息从可访问名里删掉了 | 模式（6 台概况） | P2 | ③ |

### P3（低优先 / 一致性）

| 编号 | 位置（证据） | 发现 | 模式/个案 | 严重度 |
|---|---|---|---|---|
| R5A-26 | `workspace-shell.js:338`、`work-overview.js:884`、`visitor/projects-tab.js:172`、`org/taskforce-tab.js:385` 等 30 处 `scrollIntoView({behavior:'smooth'})`；对照 `tab-bar.js:603` 已判 `prefers-reduced-motion` | JS 平滑滚动未统一尊重“减少动效”；全局 CSS 的 `scroll-behavior:auto !important` 不能覆盖显式 `behavior:'smooth'` | 模式 |
| R5A-27 | `components/shell/tab-bar.js:49-93`（骨架/加载行）、`:308-326`（置灰 + `pointer-events:none`） | 加载占位无 `role=status`/`aria-busy`；已有内容被置灰且禁止交互，但读屏与键盘用户没有得到“正在加载”的提示 | 模式 |
| R5A-28 | `docs/workspace/party-committee.html:36`（`<h1>`）+ `components/shell/header.js:276`（顶栏 `<h1>`） | 党委台一页两个 `<h1>`；其余 6 台用 `<h2>` 页标题，唯党委台例外 | 个案 |
| R5A-29 | `docs/src/capabilities/secretary-workspace.js:82,88` | 支书台“支部分工”与“知情查看”都挂在 `groupLabel: '知情查看'`，且第二个 tab 的 `label` 也是“知情查看” ⇒ 同一行里组标签与页签名重复，读起来像两个同名入口 | 个案 |
| R5A-30 | `org/taskforce-tab.js:99`、`disc/inspection-tab.js:103`、`secretary/feedback-tab.js:41`、`prop/weekly-tab.js:120`、`org/taskforce-tab.js:1245` | placeholder 以 `...` 结尾而非 `…` | 模式（5 处） |
| R5A-31 | `components/governance/work-overview.js:468`（`text-gray-400` 的 0）；`visitor/attendance-tab.js:81,93,118`（待录入/无记录） | `#9CA3AF` 承载“0 / 待录入”等仍属信息的文本，对比度 2.42–2.54:1 | 模式 |
| R5A-32 | `core/base/icons.js:40`（`icon()` 默认不输出 `aria-hidden`）；`visitor/activities-tab.js:166,169,172`、`prop/archive-tab.js:924` | 装饰性 SVG 未统一 `aria-hidden="true"`（部分调用点手写、部分漏）；读屏可能读出无名 graphic | 模式 |
| R5A-33 | `secretary/calendar-tab.js:255`（`target="_blank"` 无 `rel`） | 新标签页打开未带 `rel="noopener noreferrer"`；现代浏览器默认 `noopener`，但不符合项目已有写法（`sections/references.js:299` 正确） | 个案 |
| R5A-34 | `docs/workspace/*.html` `<head>`（如 `secretary.html:8-23`）；`theme-init.js:14` 只设 `color-scheme` | 有明暗主题但无 `<meta name="theme-color">`，移动端浏览器地址栏/状态栏颜色不跟随 | 模式（7 页） |
| R5A-35 | `components/ui/modal.js:158-162`（overlay `fixed`）、`:260-276`（淡出 150ms 期间立即解除 `inert`） | 浮窗打开时未锁 `body` 滚动（移动端背景可滚动）；关闭淡出期间背景已可聚焦，存在 150ms 的“焦点落到遮罩后”窗口 | 模式 |

> 说明：`R5A-06` 中 `org/talent-tab.js:216` 因卡内仍有可聚焦链接，单独看为 P2；与其余 5 处合并列在 P1 行，便于按“可点 div”模式一次修完。

---

## 四、模式归纳（H21 三问）

### ① 该不该存在：62 个 tab 里“职责上该有”的是多数，“形态上该合”的是少数

- **职责边界总体成立**：同一 id 的 `今天/待办/工作概况/我的处置/考勤管理/考察管理/思想汇报/知情查看` 是**同名不同权限面**，多数不是重复造页。`我的处置` 5 台共用 `components/feedback/issue-dispatch-view.js`，`工作概况` 6 台共用 `components/governance/work-overview.js`，`成员流动` 支书/组织共用 `org/member-flow-tab.js`——这三处是“同功能一个名字/一份实现”的正确做法。
- **需要合并或改名的候选（建议，不影响本轮结论）**：
  1. **6 台的“今天 / 待办 / 工作概况”三入口指向同一待办数据集**：今天=今日到期摘录、待办=全量列表、概况=计数带。不是错，但用户要在三处判断“该去哪”；建议把三处标题写成范围（“今天要办 / 全部待办 / 分工概况”），不要再出现两个“全部 ›”都落到同一页。
  2. **组织台“成员名册”与“人才库”**：人才库同时有参与/发展表（`org/talent-tab.js:279`），与名册的人员主数据重叠；建议人才库只保留“发展/参与统计”，人员主数据只回名册。
  3. **支书台“知情查看”页签 + 同名组标签**（R5A-29）：至少改一处名称，否则同一行出现两个“知情查看”。
  4. **成员台 11 个 tab**：`思想汇报 / 我的考察 / 我的复盘` 是同一“个人成长记录”对象的三个切面；390px 下 11 个 tab 只能靠箭头横滑，建议合并为“我的成长”下的三个子视图（与 `活动动态` 内层三视图同法），可把一级页签降到 8 个。
- **结论**：不建议为“减 tab”大改 IA；先修“同名/同组重复”和“三入口命名”，收益/风险比更好。

### ② 承载形态是否唯一：有 5 组“同义多载体”

| 语义 | 现有载体 | 结论 |
|---|---|---|
| 破坏性确认 | 原生 `window.confirm`（11 处）、`modal.js::_mustPressConfirm`、自建 popover | 应收敛到 `modal.js` 一套（原生 confirm 仅保留“开发调试”场景） |
| 空态 | `empty-state.js`（7 文件）、手写 `<p>暂无…</p>`（42 文件）、引擎内置空行 | 列表/页面级统一 `emptyStateHtml`；表格空行保留引擎 |
| 加载 | 骨架卡 `tabContentSkeletonHtml`、`TAB_LOADING_BAR_HTML`、各 tab 自写“正在读取…” | 壳层两态保留，tab 内不要再自写加载文案 |
| 筛选 | `list-filter` 引擎、`branch-filter` 共用件、各 tab 手写 `.lf-bar` + input | 手写搜索至少补 `aria-label`，并尽量接引擎 |
| 移动端表格 | `data-responsive="cards"`（4 文件）、`pc-table-scroll` 横滑（党委）、无处理（10 处） | 只有两种合法形态：卡式行或容器内横滑；不允许“直接压列” |

### ③ 信息 / 操作 / 适应学习成本是否最小

- **最大的非必要成本不是“点多”，而是“点不到”**：自定义下拉键盘不可选（R5A-03）、6 处行只能鼠标（R5A-06）、390px 宽表压列（R5A-09）、页签箭头压住页签并淡化文字（R5A-23）。
- **第二类成本是“状态不可见”**：分段钮/chip 只改 class（R5A-20/21）、焦点在亮/暗两套都弱（R5A-04/05）、指标 aria-label 吞数字（R5A-25）、页签不进 URL（R5A-17）。
- **第三类才是“信息多”**：支书 12 tab、成员 11 tab 在 390px 需要横滑 2 屏；但已有分组标签 + 箭头 + 个人顺序偏好，属于可接受范围，优先做“合并个人记录类子视图”而不是删职责页签。
- **页签组标签是“看起来能点、实际不可点”**（`tab-bar.js:239` `pointer-events:none`），且与选中 tab 同为金色胶囊（截图 `u10-768-secretary.png`）；这是典型的学习成本：用户会先点组名。建议组标签改为纯文字小标题（无底色/无胶囊），或明确做成可折叠分组。

---

## 五、建议修复顺序（按“影响面 × 改动成本”）

### 批次 1（P1，都是小改，建议同一批）

1. **修 `<base>` 链接族（R5A-01/02）**
   - skip link 改为绝对页路径：`./workspace/<page>.html#main-content`；或统一在壳初始化时给 `a[href^="#"]` 绑 `preventDefault + scrollIntoView`。
   - `work-overview.js` 的 `#wo-*` 与 `my-tasks-section.js` 的 `#leader-activity-lists` 改同上；`kanban:60`、`branches:154` 改为 `getBasePath() + 'workspace/prop.html?tab=archive'` / `'workspace/party-committee.html?tab=review&branchId=…'`。
   - 验收：键盘 Tab 到 skip link 回车仍在本页；概况页点“待办/在办”只滚动不换页；两个 `?tab=` 链接落到正确工作台。
2. **修焦点可见性（R5A-04/05）**
   - 输入族：恢复 `outline: 2px solid var(--functional-info)`（或 `--app-accent-text` 的深色版）并保留金边，或把金边换成 ≥3:1 的主题深色。
   - 暗色：给 `html.theme-dark` 覆盖 `--app-accent-text`（亮色）/或焦点规则改用 `var(--party-gold)` + 深色补环；删掉同一 rule 内重复的 `outline` 声明。
   - 验收：DevTools 强制 `:focus-visible`，亮/暗两种主题下焦点指示 ≥3:1。
3. **修 custom-select（R5A-03）**
   - 触发器补 `id` + `aria-labelledby`（取原生 select 的 label 文本）、`aria-controls`；原生 select 加 `aria-hidden="true"`（保留表单值）。
   - 打开时把焦点移到选中项/首项；选项 `tabindex="-1"` + `aria-activedescendant`，支持 ↑/↓/Home/End/Enter/Esc；关闭后焦点回触发器。
   - 验收：不碰鼠标，Tab 进入下拉 → ↓ 选值 → Enter 确认 → 值写回；读屏名称为字段标签。
4. **修可点 div（R5A-06）**
   - 通知/反馈列表：整行改 `<a>`（通知→`notice.html?id=`，反馈→详情路由）或 `<button>`；若必须保留 div，补 `role="button" tabindex="0"` + Enter/Space（照 `kanban-tab.js:112-120` 的写法）。
   - 三个折叠头：加 `role="button" tabindex="0"` + `aria-expanded` + Enter/Space。
5. **修破坏性动作（R5A-07/08）**
   - 通知删除：改 `openModal` 确认（显示标题），或删除后 5s toast 撤销。
   - 归档推进浮层：直接改用 `openModal`（role/焦点/Esc/背景 inert 全部复用），宽度走 `size:'sm'`；如必须 popover，至少补 `role="dialog" aria-modal="true" aria-labelledby`、焦点接管/归还、`max-width:calc(100vw-32px)`、四条关闭路径统一注销监听。
6. **补移动端表格（R5A-09）**
   - 上述 10 处配置加 `responsive: true`，并给每个 `<td>` 补 `data-label`（考勤/委员会表已有现成写法可抄）；或对 4 列以内且不可卡式化的表，用 `.pc-table-scroll` 同款容器横滑。
   - 验收：390px 下页面无横向滚动，表格每行以“标签：值”卡片呈现。

### 批次 2（P2，组件/表单层，按文件批量）

7. **表单语义与错误（R5A-10/11）**：先改 5 个高频文件（taskforce、notification、member-flow、person-edit、dispatch）；`label for` + `id` 对齐，错误从 toast 改为字段下 `<p role="alert">` + `aria-invalid` + 聚焦首错（可直接复用 `openFormModal` 的 `showErrors`）。
8. **确认载体收敛（R5A-14）**：原生 `window.confirm` 全量替换为 `openModal`/`confirmNudge` 同款；taskforce 去掉第二次 confirm（保留一次带后果说明的确认）。
9. **对比度（R5A-12/13）**：`--neutral-400` 仅用于非文本/装饰；placeholder 换 `--neutral-500`；组标签改纯文字或把 accent 压深到 ≥4.5:1；选中 tab 文字同样压深。
10. **空态单一源（R5A-16）**：42 处手写 `<p>暂无…</p>` 优先替换页面级空态；每个空态最多一个出口。
11. **页签状态/反馈（R5A-17/18/23）**：切 tab 用 `history.replaceState` 写 `?tab=`；idle tab 加 `hover:bg-*`；箭头改为不覆盖页签的独立槽位（或把页签容器右侧留 40px padding），渐隐宽度收窄到只覆盖 padding 区。
12. **内层 tab / 分段 / chip 语义（R5A-19/20/21）**：统一补 `aria-selected`/`aria-pressed`/`tabindex`；能复用 party-committee 的 `role=tablist + tabpanel` 写法就复用。
13. **hover-only 信息（R5A-22/24/25）**：`tip-trigger` 改 `<button type="button">` + `focus` 显示；通知下拉 Esc 把焦点还给铃铛；指标 `aria-label` 补上数值（如“待办 2 项，查看待办事项”）。

### 批次 3（P3，收口与一致性）

14. 平滑滚动统一封一个 `scrollToEl()`（内部判 `prefers-reduced-motion`），替换 30 处直调。
15. 骨架/加载补 `role=status aria-live=polite` 或 `aria-busy`。
16. 党委台改 `<h2>` 页标题；支书组标签与页签名去重；`...`→`…`；装饰 SVG 默认 `aria-hidden`；`target=_blank` 补 `rel`；补 `theme-color`；浮窗打开锁 body 滚动、关闭时先还焦点再淡出。

---

## 六、验证与局限

- **已实测**：在 Chromium 中构造 `<base href="https://example.org/docs/">` + `<a href="#wo-lines">`、`<a href="?tab=archive">`，`a.href` 分别为 `https://example.org/docs/#wo-lines`、`https://example.org/docs/?tab=archive`，与工作台页面同构（`workspace/*.html` 的 `<base href="../">`）。
- **静态复核**：对比度按 sRGB 相对亮度手算（`#9CA3AF`/白 2.54、金组标签 3.53、金选中 tab 4.12、`#1F2937`/暗底 1.15–1.28、金输入焦点 1.34）。
- **未做**：未启动服务、未跑 Playwright 全链路、未改任何源文件；390px 未做真机截图（证据目录缺 390 工作台图），建议修复批次 1 后补一轮 390 截图回归。
- **未读**：按任务要求未读取 B/C 两路报告，结论独立。
