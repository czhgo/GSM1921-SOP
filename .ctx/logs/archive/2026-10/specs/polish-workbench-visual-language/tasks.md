# Tasks

- [x] Task 1: 视觉语法与基础样式
  - [x] SubTask 1.1 `styles.css` 新增 `.section-head` / `.section-head__title` / `.section-head__meta`（14px 宋体 + 12px 计数）
  - [x] SubTask 1.2 新增 `.data-table thead` 中性底与 12px/600 表头；首列 14px/500、正文 13px、行高 44px
  - [x] SubTask 1.3 新增 `.metric-band` / `.metric-band__item` / `.metric-band__value` / `.metric-band__label`（26px/600 数字 + 12px 标签 + 细竖线）
  - [x] SubTask 1.4 新增状态徽章档：`.state-badge--neutral/success/warning/info/accent`，统一淡底深字
  - [x] SubTask 1.5 `DESIGN_SYSTEM.md` 新增 §4.23「视觉语法」：字号/字重/颜色/图标/间距/边框底色/动效各自承担什么信息

- [x] Task 2: 颜色语义与存量审计
  - [x] SubTask 2.1 `DESIGN_SYSTEM.md` 新增 §2.10「颜色四问 + 明暗档」：行动/状态/身份/结构；实底/淡底适用场景
  - [x] SubTask 2.2 逾期统一改 `--functional-warning`（琥珀），`--functional-error` 只留给阻断/失败/删除/驳回
  - [x] SubTask 2.3 移除待办、支委会会议卡的整圈红边；强调改用章节头计数/左侧单色规则/状态徽章
  - [x] SubTask 2.4 全站审计新组件（work-overview / todo / committee / taskforce-list / notice-view）的颜色用法，列出并修越界项
  - [x] SubTask 2.5 补守卫：逾期不得用 error 红；功能色不得上主按钮；主题色不得进状态徽章

- [x] Task 3: 行型交互矩阵与 list-row 增强
  - [x] SubTask 3.1 `DESIGN_SYSTEM.md` §10.4 扩为五类行型：导航/动作/选择/展示/主从
  - [x] SubTask 3.2 `list-row.js` 增加 `rowType`（nav/action/select/display/master）与 `data-row-type`，按行型决定元素与可点性
  - [x] SubTask 3.3 动作行：行本身不可点，末列一个主行动 + 「更多」；主从行：行点=选中，行内动作 `stopPropagation`
  - [x] SubTask 3.4 补 CSS：`[data-row-type="display"]` 无 hover/pointer；可点行统一 `:focus-visible`
  - [x] SubTask 3.5 补守卫：可点行必须是 `<a>`/`<button>` 或 `data-interactive`；展示行不得有 `cursor:pointer` / hover

- [x] Task 4: 全局概况视觉刷新
  - [x] SubTask 4.1 结论带改 `.metric-band`：数字 26px、标签 12px、四项细分隔；逾期琥珀、待我处理主题色、其余中性
  - [x] SubTask 4.2 条线表加表头底色；首列 14px/500；逾期列用数字 + 琥珀点；动作改主题色文字链接
  - [x] SubTask 4.3 待我处理区去红边；改章节头 + 计数；行间出 hairline；行内只留一个主行动 + 「更多」
  - [x] SubTask 4.4 空态、加载、错误各一句话；390px 不横向溢出

- [x] Task 5: 待办与通知行视觉刷新
  - [x] SubTask 5.1 待办摘要改 `.metric-band`；四组组头加计数与单色状态点，逾期琥珀、其余中性
  - [x] SubTask 5.2 待办行改成动作行语义：行点只切右栏（主从），「去处理」为主行动，「更多」为次；移除多余彩色按钮
  - [x] SubTask 5.3 「待答复」顶部条简化为一行一条：标题 + 一句说明 + 一个主行动；移除第二个等权按钮
  - [x] SubTask 5.4 首页通知行移除「确认读取」第二动作：阅读详情即已读（与工作台未读条同口径）
  - [x] SubTask 5.5 右栏详情卡：标题 16px、关键事实用紧凑 `dl`、一个主行动；390px 上下堆叠

- [x] Task 6: 支委会视觉刷新
  - [x] SubTask 6.1 页头：20px 宋体标题 + 12px 一行说明 + 右侧唯一主 CTA「新建线上支委会」
  - [x] SubTask 6.2 两张表加表头底色；状态改 `.state-badge`：在任中性、空缺 warning、待召开 info、线上表态中 accent、已截止中性、已留存 success
  - [x] SubTask 6.3 委员行动作主次：改派=主题色文字；撤销=danger 文字；不再两个等权按钮
  - [x] SubTask 6.4 移除会议卡整圈红边；空席行用左侧 2px warning 规则，不整行铺色

- [x] Task 7: 首页工作组进展卡视觉刷新
  - [x] SubTask 7.1 组头改「活动工作组 · 34」+ 计数徽章；组间出 hairline
  - [x] SubTask 7.2 行：组名 14/500、meta 12、状态用 `.state-badge`、行尾「进入 →」主题色文字
  - [x] SubTask 7.3 无任务回落日期/截止日的 meta 保持一行；390px 不换行错位

- [x] Task 8: UI 前置卡落到热层
  - [x] SubTask 8.1 `CLAUDE.md` H40 增加「H40.2 UI 变更前置卡」10 问，并指向 DESIGN_SYSTEM §0
  - [x] SubTask 8.2 `DESIGN_SYSTEM.md §0` 放同一张 10 问卡；两处文字保持同源
  - [x] SubTask 8.3 补守卫：两处 10 问卡齐备；缺一即红

- [x] Task 9: 设计守卫与截图复核
  - [x] SubTask 9.1 新增 `ui-color-semantics.test.mjs`：逾期/错误/主题色/功能色越界检查
  - [x] SubTask 9.2 新增 `ui-row-interaction.test.mjs`：行型元素、focus-visible、display 行无 hover/pointer
  - [x] SubTask 9.3 新增 `ui-preflight-context.test.mjs`：CLAUDE 与 DESIGN_SYSTEM 两处 10 问卡
  - [x] SubTask 9.4 截 1440/390 的概况、待办、支委会、首页；人工核对层级、颜色、行交互

- [x] Task 10: 验证、版本与提交
  - [x] SubTask 10.1 运行新增守卫 + 模块装配 + 文档一致性 + 按钮/表格/间距/行容器守卫
  - [x] SubTask 10.2 真机检查键盘 Tab/Enter、焦点可见、空态与 390px
  - [x] SubTask 10.3 版本戳升到 `20261018h`；按 Why / What / Verification / Boundaries 提交 commit

# Task Dependencies

- Task 2、3 依赖 Task 1 的样式档位与视觉语法
- Task 4、5、6、7 依赖 Task 1、2、3
- Task 8 可与 Task 1–3 并行
- Task 9 依赖 Task 4–8 落地
- Task 10 依赖全部任务
