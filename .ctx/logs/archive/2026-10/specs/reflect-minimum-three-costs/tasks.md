# Tasks

* [x] Task 1: 按钮四类与两档尺寸

  * [x] SubTask 1.1 `styles.css` 收口四类：主操作 `.btn-accent` / 次操作 `.btn-outline` / 强调次操作 `.btn-accent-soft` / 危险 `.btn-danger`（`.btn-danger-solid` 只给确认）

  * [x] SubTask 1.2 新增 `.btn-sm`（28px 紧凑）；`.btn-md` 固定常规 32px；`btn-tab` 只做页签/分段，不算动作按钮；六台顶部 tab 保持现状不改

  * [x] SubTask 1.3 `DESIGN_SYSTEM.md` 新增 §4.1.1「按钮四类决策表」：谁用主操作/次操作/强调次操作/危险，各给正反例

  * [x] SubTask 1.4 迁移四页重点（党小组 / 支委会 / 概况 / 待办）的 `btn-ghost`、`btn-neutral`、`btn-action-*` 到四类 + 两档；六台顶部 tab 不动

  * [x] SubTask 1.5 补守卫：四页重点不得再出现 `btn-ghost`；全站 `btn-ghost` 存量只降不升；语义族上尺寸工具类只降不升；`tab-btn` / 页签 `btn-tab` 排除在外

* [x] Task 2: 帮助注释单一形态

  * [x] SubTask 2.1 `styles.css` 新增 `.help-note` / `.help-note__link`：12px 中性灰 + `text-blue-600` 链 + 可选 `title`

  * [x] SubTask 2.2 `DESIGN_SYSTEM.md` 新增 §4.24「帮助注释」：一句正文 + 一个蓝链；长口径进 help.html

  * [x] SubTask 2.3 党小组页帮助注释改 `.help-note`，正文压到一句

  * [x] SubTask 2.4 支委会页帮助注释改 `.help-note`，蓝链 + 一句

  * [x] SubTask 2.5 补守卫：两页必须用 `.help-note__link`，不得再出现 `sky-600` 手写链

* [x] Task 3: 党小组表 5 列

  * [x] SubTask 3.1 表头改 5 列：党小组 / 负责人 / 人数（含党员） / 状态 / 操作

  * [x] SubTask 3.2 负责人列一行：`组长 罗文杰 · 副组长 未设`；短标签 `nowrap`，姓名 `min-w-0` 可截断

  * [x] SubTask 3.3 `设/改` 移到操作列（紧凑强调次操作）；`改名` 用紧凑次操作；`解散` 用紧凑危险；其余动作进「更多」

  * [x] SubTask 3.4 删除负责人单元格第三行 div 与 `space-y-1.5 min-w-[180px]` 嵌套

  * [x] SubTask 3.5 补错误态：`_fillReports` catch 不再静默置空，给一句可见错误 + 重试

  * [x] SubTask 3.6 补守卫：党小组表头恰 5 列；负责人单元格不得出现 `space-y-1.5 min-w-[180px]`

* [x] Task 4: 全局概况首屏与结论带交互

  * [x] SubTask 4.1 删除「支书视角 · 先看结论…」阅读指令行

  * [x] SubTask 4.2 结论带四个指标改 `<button>`，带 `data-metric` / `aria-pressed` / `aria-label`

  * [x] SubTask 4.3 点「逾期」筛选待我处理为逾期待办；点「待我处理」显示全部；点「在办」滚到条线表；再点取消

  * [x] SubTask 4.4 颜色收口：只有逾期常驻琥珀；待我处理/在办/待答复默认中性；当前筛选项才用主题色

  * [x] SubTask 4.5 「待我处理」限 3 条 + 1 行「共 N 项 · 去待办」；条线动作只对有缺口的行显示

  * [x] SubTask 4.6 补守卫：结论带四项是 button；存在筛选函数；概况待我处理 ≤3 条

* [x] Task 5: 待办首屏与去重

  * [x] SubTask 5.1 首屏顺序改为「我的待办」标题 + 四数摘要 + 列表；待答复与未读通知合并为一条可折叠条

  * [x] SubTask 5.2 删除摘要与四档组头的重复计数：组头只留组名与状态点，数字只在摘要出现

  * [x] SubTask 5.3 「待答复」折叠条一行一条：标题 + 一句说明 + 一个「去处理」；不再在首屏展开

  * [x] SubTask 5.4 行内动作收敛：主行动 1 个 + 「更多」；作废/删除/催办进「更多」

  * [x] SubTask 5.5 补守卫：首屏主对象「我的待办」先于待答复/未读；摘要数字不在组头重复

* [x] Task 6: 支委会说明后置

  * [x] SubTask 6.1 帮助注释从标题下移到两张表之后

  * [x] SubTask 6.2 标题下只留「支委会」+ 一行范围说明 + 唯一主 CTA

  * [x] SubTask 6.3 动作改四类按钮：改派=紧凑强调次操作，撤销=紧凑危险，进入=紧凑次操作

  * [x] SubTask 6.4 补守卫：帮助注释 DOM 顺序在两张表之后；标题下不得有两个 `btn-accent`

* [x] Task 7: 乱象规则与抽样登记

  * [x] SubTask 7.1 `DESIGN_SYSTEM.md` 新增 §10.5「首屏浏览顺序」：主对象优先、说明后置、指标单点、动作收敛

  * [x] SubTask 7.2 新增 §10.6「10 个抽样页乱象登记」：已修 / 已审 / 后续三态，列 5 个模式与命中页

  * [x] SubTask 7.3 把三条可泛化规则写成布尔条件：说明后置、指标单点、动作收敛

  * [x] SubTask 7.4 补守卫：四页重点主对象先于说明；同一 metric 不在首屏出现两次

* [x] Task 8: UI 前置卡更新

  * [x] SubTask 8.1 `CLAUDE.md` H40.2 第 1 问改为「这一屏第一眼看到什么？唯一主动作是什么？」

  * [x] SubTask 8.2 `DESIGN_SYSTEM.md §0` 同步同一句

  * [x] SubTask 8.3 补守卫：两处第 1 问文字一致

* [x] Task 9: 守卫与截图复核

  * [x] SubTask 9.1 新增 `ui-button-four-types.test.mjs`：四页重点无 `btn-ghost`；四类之外不得新增动作按钮；`tab-btn` / 页签 `btn-tab` 豁免

  * [x] SubTask 9.2 新增 `ui-help-note.test.mjs`：两页 `.help-note` + 蓝链 + 一句正文

  * [x] SubTask 9.3 新增 `ui-first-screen-order.test.mjs`：四页主对象先于说明；概况指标 ≤4 且可点

  * [x] SubTask 9.4 截 1440/390 的党小组、支委会、概况、待办；人工核对浏览顺序、动作主次、颜色

* [x] Task 10: 验证、版本与提交

  * [x] SubTask 10.1 运行新增守卫 + 模块装配 + 文档一致性 + 按钮/表格/间距/行容器守卫

  * [x] SubTask 10.2 真机检查键盘 Tab/Enter、指标筛选、党小组设/改、待办折叠条、390px

  * [x] SubTask 10.3 版本戳升到 `20261018i`；按 Why / What / Verification / Boundaries 提交 commit

# Task Dependencies

* Task 1、2、7、8 是基座，先完成

* Task 3、4、5、6 依赖 Task 1、2、7，可并行

* Task 9 依赖 Task 3–8 落地

* Task 10 依赖全部任务

