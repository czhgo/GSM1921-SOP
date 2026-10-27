# 工作台 UI 组件收敛与 R10 收尾 Spec

## Why

工作台已积累了多轮视觉修补，但控件层没有单一源：输入框存在「无描边 / 黑边 / 8px 与 12px 圆角并存 / 13px 与 14px 并存」，按钮存在「32/28/30/26px 五档高度 + 浅主题底近白 + 主题色文字」的混杂观感，页签分组名在 2026-10-21 的 `R5-C01` 修复中被整段移除，`summary` 的默认三角在 33 处中只处理了 4 处。支书本轮明确指出的「黑边、缺描边、圆角不一、字体与别处不同、灰色指标带不适、三角脏、按钮太单薄/太逼仄、白底主题字」都是同一根因：**没有组件层，只有逐页手写样式**。

同时，R10 的 P3 文案余项（R6 21 条 / R7 18 条 / 帮助注释 9 处）与拆表闸门仍未收口；`CLAUDE.md` 乙部滞留 10 条已完成条目。

本 spec 的目标：**先把组件层做成单一源，再用它一次性收敛今天页、待办、页签、按钮与反馈组件**；随后收口 R10 P3、把拆表判据做成真正可测的闸门（不切权威源）、清空乙部已完成项。视觉判断遵循支书本轮给出的「外围—内围」层级，而不是主/次按钮的旧二分。

## What Changes

- **控件层单源**：`.input-flat` 成为唯一标准字段（38px / 13px / 8px 圆角 / 中性描边 / 金边 focus），`.input-flat-sm` 补齐完整定义（32px）；删除控件上的 `text-sm`、`rounded`、无颜色 `border` 等 ad-hoc 覆盖；日期控件高度规则覆盖所有 `.input-flat`；搜索类输入（person-picker / help / cs-search）并入同一描边、圆角与焦点口径。
- **按钮按「外围—内围」分层**：最外围动作＝主题色实底白字；卡片/区块内＝浅主题底 + 深主题字（必须明显着色、不得近白）；工具动作＝白底 + 中性描边 + 深灰字；行内辅助（更多/展开）＝无框文字。行内次要动作允许「浅底 + 描边」并用。尺寸统一为 **36 / 32 / 28px**，删除「主题色文字 + 白底」形态。
- **页签分区标识恢复**：每个分组（含首组）渲染可见组名文字 + 组间 1px 分隔线；≤1280px 只隐藏组名、保留分隔；不得造成页签溢出。
- **今天页 / 待办视觉基线**：指标带改白底 + 中性描边（去掉灰底），圆角与卡片同源；字号收敛到 **12 / 13 / 14 / 16** 四档，移除正文区的 10/11px；组标题、计数、行标题、meta 的层级固定；待办卡与今天页共用同一套字号/间距。
- **披露控件统一**：全局移除 `summary` 的 UA 三角，统一为单一 chevron（展开旋转），33 处全部生效；删除逐点的 `list-none` 例外。
- **反馈组件可信化（P0/P1）**：成功提示改为绑定「本次动作自己的写结果」，不再读全局在途写；失败按 401/403/408/409/5xx 分级文案；toast 可关闭、可暂停、去重、上限 3 条；error 用 `role="alert"`。弹窗补滚动锁定、焦点陷阱、提交中禁止 Esc/遮罩/× 关闭、未保存关闭确认、错误区 `role="alert"`、字段错误播报、未知字段类型不再静默降级。
- **前端「脏 / 乱 / 繁」审查**：用全部前端设计 skill 出一份 R11 报告，P0/P1 本批修，P2 下一轮；「繁」只删「重复表述 / 无新增信息的反论」，不得删掉防错信息（破坏性确认、空态下一步、权限原因）。
- **R10 P3 收口**：R6 21 条、R7 18 条、`party-committee-meeting-entry.js` 9 处帮助注释逐条处理；只改文案与一致性，不改行为。
- **拆表闸门（不切权威源）**：为 C2（同一行 7 天 409）加埋点、为 C4（影子连续 7 天 mismatch=0）留历史证据；`schema-split-readiness.mjs` 读取真实数据；C5 仍待 `B-500-4` 裁定，**本轮不切换读路径**。
- **治理文档卫生**：乙部 8 条已完成条目整行删除；`B-504-1` 判据正文迁到脚本与 `DATA_MODEL` 后再删行；保留 `B-500-4`（脚本锚点）、T-903（归档指针）、空表头（守卫锚点）。

## Impact

- Affected specs：`implement-r9-schema-plan`（拆表闸门）、`advance-r10-data-lifecycle`（P3 收口）、`polish-workbench-visual-language` / `rebuild-workbench-density-and-composition`（组件层后续）。
- Affected code：
  - `docs/src/styles.css`（控件、按钮、指标带、summary、页签分组）
  - `docs/src/components/ui/*`（modal、form-field、list-row、badges）
  - `docs/src/core/base/utils.js`、`docs/src/core/session/pending-writes.js`、`docs/src/data/data-adapter.js`（toast 与写等待）
  - `docs/src/components/shell/tab-bar.js`、`docs/src/capabilities/*-workspace.js`
  - `docs/src/entries/tabs/today/today-tab.js`、`docs/src/components/record/todo-tab-shell.js`
  - `docs/src/entries/tabs/secretary/notification-tab.js`、`docs/src/entries/tabs/prop/archive-tab.js`（按钮实例）
  - 全仓 `docs/src/**` 中输入/按钮/summary 的 ad-hoc 类
  - `server/db.js` / `server/routes/resources/*`（409 埋点）、`server/scripts/schema-split-readiness.mjs`
  - `CLAUDE.md`、`.ctx/TIMESTAMPS.md`、`content/04_web_design/data/DATA_MODEL.md`、`.ctx/SNAPSHOT.md`
- 不涉及：数据库结构变更、权威源切换、业务语义变更。

## 现行事实（本 spec 的依据）

- 控件：`.input-flat` 38px/13px/8px/`neutral-200`（`styles.css:588-602`）；`.input-flat-sm` 只有 padding/font/radius，**无边框、无背景、无 focus**（`styles.css:701-706`），单独使用 10 处（`components/ui/modal.js:324`、`:326` 等）。
- 5 处 `input-flat … text-sm`（14px 漂移）：`components/record/taskforce-view.js:227`、`:229`；`components/governance/workgroup-member-editor.js:60`；`components/governance/signup-panel.js:94`、`:99`。
- 2 处 `rounded` 把 8px 覆盖成 4px：`components/feedback/issue-detail.js:153`、`:157`。
- 无颜色 `border`（currentColor → 深/黑边）6 处：`entries/tabs/org/talent-tab.js:230`、`entries/tabs/secretary/group-progress-tab.js:434`、`entries/tabs/secretary/calendar-tab.js:249`、`entries/tabs/disc/attendance-tab.js:76`、`components/governance/org-setup-wizard.js:677`、`docs/index.html:59-60`。
- 日期控件 38px 规则只匹配 `.input-flat.text-xs[type=date]`（`styles.css:825-831`），未带 `text-xs` 的 10 处不享受钉高。
- 按钮尺寸被一段 `!important` 归一成 32/28/30/26px（`styles.css:4074-4174`），元素上的 `text-xs px-3 py-2` 是死代码（例：`entries/tabs/prop/archive-tab.js:90`）。
- `.btn-accent-soft` 为浅主题底 + 主题文字 + 主题描边（`styles.css:924-931`），在部分主题下近白；`.btn-accent` 未声明 border（`styles.css:915-920`）。
- 页签分组：`groupLabel` 存在但仅用于判重，DOM 只渲染**空 span**（`components/shell/tab-bar.js:233-249`），CSS 为 1px 竖线（`styles.css:2058-2066`），≤1024px 隐藏（`:2067-2069`）；首组不渲染。
- 指标带：`neutral-50` 底 + 1px 边 + 12px 圆角（`styles.css:4610-4619`），item 圆角 8px（`:4633`）、label 12px（`:4685-4688`）；今天页使用 `text-base` 8 处、`text-[11px]` 7 处（`entries/tabs/today/today-tab.js:142`、`:193` 等）。
- `summary` 33 处，仅 4 处有去三角处理（`styles.css:4960-4966`、`:5210-5219`、`workgroup-member-editor.js:52`）。
- toast：成功提示等待**全局** `_pending`（`core/base/utils.js:87-98`、`core/session/pending-writes.js:36`），失败统一「未保存成功」（`utils.js:94`），容器仅 `role="status"` + `aria-live="polite"`（`utils.js:108-109`），不可关闭/去重/暂停（`utils.js:114`、`:156`、`:163-167`）；已知反例：`entries/pages/activity-entry.js:657-660`（catch 后仍报成功）、`entries/pages/activity-materials-entry.js:281-282`、`services/governance/issues.js:513-523`（失败只 warn）。
- modal：无滚动锁定（`components/ui/modal.js:56-64`）、无焦点陷阱、提交中仍可 Esc/遮罩/× 关闭（`:217-234`、`:403-410`）、错误区无 `role`（`:346`、`:398-402`）、`onSubmit` 返回 `undefined` 被当成功（`:424`、`:431`），反例 `entries/tabs/disc/review-tab.js:460-470`。
- 拆表现状（`node server/scripts/schema-split-readiness.mjs`）：`verdict=NOT_READY`，C1=false（max 967B / p95 839B / 154 行 / 65.9KB）、C2=false（未埋点）、C3=true（21 处）、C4=true（mismatch=0）、C5=false（`B-500-4` 待裁）。
- 乙部：31 条在办条目，其中 10 条已标完成/已实施/已澄清；可无引用直接退出的 8 条为 `B-500-3`、`B-500-10`、`B-502-7`、`B-503-1`、`B-503-3`、`B-503-4`、`B-503-7`、`B-504-2`。

## ADDED Requirements

### Requirement: 单一控件层

系统 SHALL 只保留一个标准文本控件类 `.input-flat`（38px）与一个紧凑类 `.input-flat-sm`（32px）；两者都必须声明背景、1px 中性描边、8px 圆角、13px 字号、显式行高、placeholder 色、focus 态。所有 `input[type=text/date/…]`、`select`、`textarea` SHALL 使用其中之一（`checkbox/radio/file/hidden` 除外）。

#### Scenario: 任意页面的文本控件外观一致
- **WHEN** 用户打开任一工作台、弹窗或独立页
- **THEN** 所有文本/日期/下拉/多行控件的高度、描边、圆角、字号、focus 环完全一致，不再出现无描边或黑边控件

#### Scenario: 日期控件与文本控件同高
- **WHEN** 日期控件与文本控件同排
- **THEN** 两者高度均为 38px（紧凑档 32px），不因是否带 `text-xs` 而不同

#### Scenario: 控件圆角不被页面覆盖
- **WHEN** 任意页面给控件追加 `rounded`/`rounded-lg`/`border` 等工具类
- **THEN** 控件仍保持 8px 圆角与 token 描边；此类覆盖类在代码中不得存在

### Requirement: 按钮「外围—内围」层级

系统 SHALL 用「结构位置」而非「主/次」决定按钮强度：
- **最外围**（页头、空态主行动、弹窗主行动）＝主题色实底 + 白字；
- **内围**（卡片/区块内）＝浅主题底 + 深主题字 + 主题描边，且底色必须明显区别于白色；
- **工具位**（行尾、筛选、次级操作）＝白底 + 中性描边 + 深灰字；
- **行内辅助**（更多/展开）＝无框文字。

按钮高度 SHALL 为 36px（标准）/ 32px（紧凑）/ 28px（小号）；`btn-sm` 为 28px；与 38px 输入框同排的主行动可保持 38px。

#### Scenario: 页头与卡片内按钮强度不同
- **WHEN** 同一页同时存在页头「新建」与卡片内「去归档」
- **THEN** 页头为实底主题色，卡片内为浅主题底或白底描边；不存在「白底 + 主题色文字」的按钮

#### Scenario: 浅主题底不显白
- **WHEN** 内围按钮使用浅主题底
- **THEN** 其背景与纯白有可感知差异（使用主题浅底 token），描边为同色系 1px；不得使用 `neutral-0` 作底

#### Scenario: 行内动作不拥挤
- **WHEN** 列表行内出现「去归档」等动作
- **THEN** 使用 28px 小号或 32px 紧凑档，水平内边距不小于 10px，图标与文字间距不小于 6px

### Requirement: 页签分区标识

系统 SHALL 在每个工作台页签条上显示分组名文字（含首组），组间以 1px 分隔线隔开；分组名 SHALL 为可见文本而非空 span；≤1280px 时 SHALL 只隐藏组名、保留分隔线，且不得造成页签溢出或换行。

#### Scenario: 桌面端可见分组
- **WHEN** 用户在 ≥1280px 视口打开任一工作台
- **THEN** 每个分组前显示组名（如「工作台」「我的职责」「制度与答复」），首组同样显示

#### Scenario: 窄屏不溢出
- **WHEN** 视口 ≤1024px
- **THEN** 组名隐藏、分隔线保留，页签条不换行、不遮挡末页签

### Requirement: 今天页与待办视觉基线

系统 SHALL 让今天页与待办共用同一套字号与间距：正文 13px、meta 12px、段标题 14px、页面/卡片标题 16px；正文区 SHALL NOT 使用 10px/11px。指标带 SHALL 为白底 + 1px 中性描边 + 与卡片同源圆角；数值与标签的字号、颜色、间距固定；仅「逾期」在大于 0 时使用警示色。

#### Scenario: 今天页字号一致
- **WHEN** 用户查看今天页与待办页
- **THEN** 同层级文本字号一致（12/13/14/16），无 11px meta，无 16px 计数与 14px 标题倒置

#### Scenario: 指标带不再是灰底
- **WHEN** 今天页/待办页渲染指标带
- **THEN** 背景为白色卡片底，边框与卡片一致，四个指标间距一致；逾期为 0 时不显示警示色

### Requirement: 披露控件统一

系统 SHALL 全局移除 `summary` 的浏览器默认三角，并统一使用一个 chevron 指示（展开时旋转 90°/180°）；SHALL 保留键盘可达与 `details/summary` 语义；逐点 `list-none` 例外 SHALL 删除。

#### Scenario: 任意折叠区外观一致
- **WHEN** 用户展开/收起任一 `summary`
- **THEN** 左侧只出现一个 chevron，展开态方向改变，无原生三角；键盘 Enter/Space 行为不变

### Requirement: 操作结果反馈可信

系统 SHALL 让成功提示只依赖**本次动作**登记的写入结果：动作登记自己的写、动作等待自己的写、成功/失败只报自己的结果。失败文案 SHALL 按 401/403/408/409/5xx 分级；SHALL NOT 把原始异常或 HTTP 状态码直接展示给用户。toast SHALL 可手动关闭、悬停/聚焦暂停、同文案去重、最多同时 3 条；error SHALL 使用 `role="alert"`。

#### Scenario: 落库失败不得报成功
- **WHEN** 某动作的写入失败（含 403/409/超时）
- **THEN** 只出现一条与该动作对应的失败提示，文案说明原因类别；不得出现成功提示

#### Scenario: 并发动作互不污染
- **WHEN** A 动作失败、B 动作成功且几乎同时完成
- **THEN** A 报失败、B 报成功；B 不因 A 的失败被改判

#### Scenario: 提示可读可关
- **WHEN** 出现错误提示
- **THEN** 提示可手动关闭，指针悬停时不会在 2.5s 内消失，读屏以 alert 优先级播报

### Requirement: 弹窗交互闭环

系统 SHALL 在弹窗打开时锁定背景滚动并建立焦点陷阱（Tab/Shift+Tab 在弹窗内循环）；提交中 SHALL 禁止 Esc、遮罩、×、取消四条关闭路径，并显示 `aria-busy`；有未保存改动时关闭 SHALL 二次确认；错误区 SHALL 有 `role="alert"`，字段错误 SHALL 被播报并在用户修正后清除 `aria-invalid`；未知字段类型 SHALL 在开发期报错而不是静默变文本框。

#### Scenario: 提交中不能误关
- **WHEN** 用户在表单弹窗点提交并等待落库
- **THEN** Esc/遮罩/×/取消均不能关闭弹窗，按钮显示提交中；落库完成后才恢复

#### Scenario: 失败保留表单并可读
- **WHEN** 提交失败
- **THEN** 弹窗保持打开、字段值保留、错误区被读屏播报，首个错误控件获得焦点

### Requirement: 前端「脏 / 乱 / 繁」审查

本批 SHALL 产出一份 R11 审查报告，覆盖字体、字号、颜色、间距、圆角、控件、按钮、空态、密度与文案；P0/P1 在本批修复，P2 登记下一轮。「繁」的删除 SHALL 只针对重复表述与无新增信息的反论；SHALL NOT 删除防错信息（破坏性确认、权限原因、空态下一步）。

#### Scenario: 审查不是主观清单
- **WHEN** 审查报告列出任一条「繁」
- **THEN** 该条必须给出「删的是什么信息、为什么没有新增信息、删后用户仍能完成什么」；无法给出者不得删

### Requirement: R10 P3 收口

系统 SHALL 逐条处理 R6 P3 21 条、R7 P3 仍存在 18 条、`party-committee-meeting-entry.js` 9 处帮助注释；只改文案与一致性，不改业务行为；每条 SHALL 在报告中登记「改前 / 改后 / 依据」。

#### Scenario: 文案收口可核
- **WHEN** 审查者打开 R10 收口清单
- **THEN** 每条都有当前 file:line、改法、是否已改；不存在「批量替换后无法定位」的条目

### Requirement: 拆表切换闸门（不切权威源）

系统 SHALL 为 C2 增加「同一行 7 天 409」计数并持久化；SHALL 为 C4 记录每日影子比对结果；`schema-split-readiness.mjs` SHALL 读取真实计数与历史，而不是硬编码 false / 只看当下。C5 未裁前，系统 SHALL 保持 JSON 为权威源，读路径 SHALL NOT 切到影子子表。

#### Scenario: 判据未真时不得切换
- **WHEN** `schema-split-readiness.mjs` 输出 `NOT_READY`
- **THEN** 任何读路径仍走 JSON；若有人改动读路径，守卫测试必须变红

#### Scenario: 判据可复核
- **WHEN** 运维运行脚本
- **THEN** 输出 C1–C5 的读数与近 7 天证据，`READY` 只在 (C1||C2||C3)&&C4&&C5 全真时出现

### Requirement: 治理文档卫生

`CLAUDE.md` 乙部 SHALL 只保留「进行中 / 待裁 / 下一轮 / 待启动 / 持续」条目；已完成条目 SHALL 整行删除，其判据正文 SHALL 先迁到可执行脚本或数据模型文档。`B-500-4`（脚本锚点）、T-903（归档指针）、评议空表头（守卫锚点）SHALL 保留。

#### Scenario: 完成后不留尾巴
- **WHEN** 本批完成
- **THEN** 乙部不再出现「已完成 / 已实施 / 已澄清」的 B-xxx 行；`schema-split-readiness.mjs` 仍能读到 `B-500-4`；文档守卫全绿

## MODIFIED Requirements

### Requirement: 输入控件尺寸与状态
原「单档 38px / `input-flat-sm` 仅调内边距」改为：标准 38px、紧凑 32px，两者都有完整边框/背景/焦点定义；所有日期控件同档；搜索类输入并入同一描边与圆角口径。

### Requirement: 按钮尺寸归一
原 `!important` 强制 32/28/30/26px 改为 36/32/28px 三档，并允许与 38px 输入框同排的主行动保持 38px；按钮的 hover/focus/disabled 在每个层级都有定义（含 `.btn-accent-soft` 的 disabled）。

### Requirement: 页签分组
原「空 span + 1px 竖线 + 首组不渲染」改为「可见组名 + 细分隔线，首组同显；窄屏只隐藏组名」。

### Requirement: 指标带
原 `neutral-50` 底 + item 8px 圆角改为白底 + 与卡片同源圆角 + 一致间距；字号与颜色按今天页基线收敛。

### Requirement: 操作结果反馈
原「成功提示等待全局在途写」改为「等待本次动作自己的写」；失败文案由 `describeWriteError` 统一生成；toast 增加关闭/暂停/去重/上限与 alert 语义。

### Requirement: 弹窗关闭
原「提交中仅禁用两个按钮」改为「提交中禁止四条关闭路径 + `aria-busy`」；补滚动锁定与焦点陷阱；未保存关闭二次确认。

## REMOVED Requirements

### Requirement: 无描边的紧凑控件
**Reason**：`.input-flat-sm` 只定义内边距，导致「有的输入框没有灰色描边」。
**Migration**：补齐完整字段定义；已有调用点无需改名。

### Requirement: 浏览器默认 disclosure 三角
**Reason**：33 处中 29 处未处理，视觉脏。
**Migration**：全局 reset + 统一 chevron；逐点 `list-none` 删除。

### Requirement: 「主题色文字 + 白底」按钮
**Reason**：支书明确「之前从没有过主题色变体但白底的 button」。
**Migration**：内围改为浅主题底 + 深主题字（明显着色）；工具位改为中性描边 + 深灰字。

### Requirement: 以全局在途写判定成功
**Reason**：并发动作会互相污染，出现「A 失败导致 B 报失败」与「catch 后仍报成功」。
**Migration**：动作作用域写等待；`showToast('success')` 必须接收本次动作的写结果。

### Requirement: 提交中可关闭弹窗
**Reason**：关闭后写入继续，用户丢失表单且提示时序错乱。
**Migration**：提交中锁定关闭路径；完成后恢复。

### Requirement: 已完成条目滞留乙部
**Reason**：支书令「已完成的工作请从 CLAUDE 退出，保证文件干净」。
**Migration**：先迁判据正文到脚本/数据模型，再整行删除；保留三个锚点行。

## 设计学习（sample-diff-learning · 本轮支书反馈 → 可检验规则）

| ID | AI 假设 | 支书意图 | 偏差类型 | 可检验规则（Boolean） |
|---|---|---|---|---|
| SD-1 | 控件样式可以逐页微调 | 控件必须是同一组件 | scope_narrowing | IF 元素是文本/日期/下拉/多行控件 THEN class 必须∈{input-flat, input-flat-sm} 且无 `text-sm`/`rounded`/无颜色 `border` |
| SD-2 | 边框是修饰，颜色可继承 | 边框是组件语义，必须用 token | definition_mismatch | IF 元素有可见边框 THEN 其 `border-color` ∈ token 变量集合，不得为 `currentColor` |
| SD-3 | 圆角可以按页面感觉调 | 圆角按组件角色定 | aesthetic_mismatch | IF 控件 THEN 8px；IF 卡片/指标带 THEN 12px；IF 胶囊 THEN 999px；不得出现 4/6px 例外 |
| SD-4 | 浏览器三角是默认行为，可不管 | 三角脏，必须统一 | symptom_misread | IF 元素是 `summary` THEN UA marker 已移除且恰有一个 chevron |
| SD-5 | 按钮分主/次 | 按钮按「外围—内围」分层 | priority_inversion | IF 按钮在页头/空态/弹窗主行动 THEN 实底主题色；IF 在卡片内 THEN 浅主题底；IF 工具位 THEN 白底描边；IF 行内辅助 THEN 无框 |
| SD-6 | 浅主题底接近白也算主题底 | 浅主题底必须看得见 | aesthetic_mismatch | IF 按钮用浅主题底 THEN 其背景色 ≠ `--neutral-0` 且描边为同色系 |
| SD-7 | 成功提示可以等全局写 | 成功必须属于本次动作 | attribution_error | IF 显示成功 THEN 该动作自己的写已 resolve；失败不得被报成成功 |
| SD-8 | 提交中禁用按钮就够 | 提交中不得关闭 | incomplete_contract | IF 弹窗处于提交中 THEN Esc/遮罩/×/取消均不关闭且 `aria-busy=true` |
| SD-9 | 分组只需要一条线 | 分组名必须可见 | scope_narrowing | IF 页签有 groupLabel THEN 桌面端渲染非空文本（含首组） |
| SD-10 | 小字可以到 10/11px | 正文不得小于 12px | aesthetic_mismatch | IF 文本属于正文/元信息 THEN font-size ∈ {12,13,14,16}px；today/todo 中 `text-[10px]`/`text-[11px]` 计数为 0 |
| SD-11 | 「繁」就是删字 | 删重复表述，不删防错信息 | scope_widening | IF 删除一句文案 THEN 该句不含唯一动作/状态/风险信息；破坏性确认与权限原因不得删 |

## 验收口径

- 组件层：新增守卫 `ui-control-system-guard` 对 SD-1/2/3/4/6/9/10 做静态断言；`page-sweep` 对高度/圆角/字号做真机抽检。
- 反馈：新增 `feedback-integrity` 用例覆盖「A 失败 B 成功」「catch 后成功」「提交中关闭」三类反例。
- R10/拆表/CLAUDE：守卫 + 脚本读数；`NOT_READY` 时读路径不得切换。
- 测试预算：3 次套件级运行（定向 / daily / 全量）；红项只单跑失败文件诊断。
