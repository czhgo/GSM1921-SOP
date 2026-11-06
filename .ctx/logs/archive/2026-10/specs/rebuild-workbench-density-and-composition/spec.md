# 工作台密度与组件重组 Spec

## Why

支书本轮指出七处「脏」：间距没有自觉、组件厚薄与字号漂移；支委会 tab 字多排版丑；工作概况大小/信息量/功能不匹配；表格缺复用视角；选择人员每行都有扎眼的框；`div` 行堆叠读不下去。根因不是单页样式，而是缺少三样单一源：**间距分档**、**组件采用矩阵**、**可复用模块清单**。

## 产品判断（为什么这样重组）

| 界面 | 它到底在回答什么 | 信息本质结构 | 对应形态 |
|---|---|---|---|
| 工作概况 | 「整体怎么样、哪条线在堵、我现在做什么」 | 结论 → 条线对比 → 待我处理 | 结论带 → 条线表 → 待办清单 |
| 我的待办 | 「今天必须先处理什么」 | 时间紧迫度 → 单条事项 | 逾期/今日/本周/以后四组 + 单行单主行动 |
| 支委会 | 「支委是谁、开过什么会、下一场在哪」 | 成员关系 → 会议记录 | 委员表 → 会议表 → 独立会议页 |
| 选择人员 | 「在名单里快速找到并选对人」 | 人 → 身份/组别 | 无框行 + 姓名主、元信息次 |
| 工作组进展 | 「哪些协作组在推进、推进到哪」 | 两类工作组 → 任务完成度 | 分组行 + 任务完成数 |

结论：**表格管对比，清单管行动，卡片只承载异构对象**；同一屏不再用两种主载体承载同一批数据。

## What Changes

- **间距五档**：`4 / 8 / 12 / 16 / 24` 写入 `styles.css` 令牌；补「组件采用矩阵」，写清谁用哪一档；本轮页面先落地，存量按抽样清单分批迁移。
- **七个复用模块**：`list-row`、`filter-bar`、`data-table`、`pager`、`empty-state`、`person-picker`、`relation-matrix`；新增列表行不得再手写 `div` 行。
- **支委会 tab 清爽目录**：委员构成表 + 会议表 + 新建入口；去掉大段说明与全局表单。独立会议页同步去说明化：五步改步骤条，当前步只留一个主行动，长说明进帮助页。
- **我的待办减负**：顶部「逾期 / 今日 / 本周 / 待处理」四数摘要；列表改为四组，组内每行只留标题 + 一句说明 + 一个主行动；作废等次要动作收进行尾「更多」。
- **选择人员去框**：删除姓氏头像框；姓名 14px/500、次级 12px；行高 40px；选中态只用整行底色 + 右侧勾，不再给行加边框。
- **六台工作概况统一三层**：支书 / 组织 / 宣传 / 纪检 / 组长 / 成员六台同一骨架——结论带、条线表、待我处理；删除独立「汇报」卡与重复计数。
- **首页「专班进展」改「工作组进展」**：同时纳入活动工作组与专班工作组，卡内分组；进度改用任务完成数，不再用报名人数填充率冒充进展。
- **脏 / 乱 / 繁第四轮**：用 sample-diff-learning 分层抽样复核，按 web-design-guidelines 修可点区域、焦点、空态与键盘可达。
- **BREAKING**：待办默认分组由「六类业务域」改为「四档紧迫度」；工作概况删除「汇报」独立卡；首页「专班进展」标题与数据口径同时变更。

## Impact

- Affected specs：`establish-workbench-quality-program`、`repair-workbench-blockers-and-findings`
- Affected code：
  - `docs/src/styles.css`
  - `docs/src/components/ui/{list-row,filter-bar,data-table,pager,empty-state,relation-matrix}.js`
  - `docs/src/components/governance/person-picker.js`、`docs/src/components/person-picker.css`
  - `docs/src/components/governance/work-overview.js`
  - `docs/src/components/record/{todo-tab-shell,todo-list}.js`
  - `docs/src/entries/tabs/*/overview-tab.js`、`docs/src/entries/tabs/*/todo-tab.js`
  - `docs/src/entries/tabs/secretary/committee-meeting-tab.js`
  - `docs/src/entries/pages/party-committee-meeting-entry.js`
  - `docs/index.html`、`docs/src/components/dashboard/taskforce-list.js`
  - `server/test/**`
- Affected docs：`content/04_web_design/design-system/DESIGN_SYSTEM.md`、`content/03_doc_system/INFORMATION_COMPUTATION.md`、`docs/help.html`
- Affected data：无新增持久化字段；「工作组进展」为派生视图，读 `workgroups` / `workgroup_members` / `workgroup_tasks`。

## ADDED Requirements

### Requirement: 间距五档与组件采用矩阵

系统 SHALL 只使用 `4 / 8 / 12 / 16 / 24` 五档间距；每个组件族 SHALL 在采用矩阵中声明唯一档位，不得由页面零散覆盖。

#### Scenario: 新增一个卡片
- **WHEN** 开发者新增标准卡片
- **THEN** 卡片内边距取 `16`、区块间距取 `12`、页面区块间距取 `24`；不得出现 `p-[14px]`、`gap-[10px]` 等自由值

#### Scenario: 同一屏出现紧凑卡与标准卡
- **WHEN** 通知行、待办行与标准卡片同屏
- **THEN** 行内边距取 `8/12`、标准卡取 `16`；两者差一档且视觉上可解释，不出现第三种厚度

### Requirement: 七个复用模块

系统 SHALL 提供 `list-row`、`filter-bar`、`data-table`、`pager`、`empty-state`、`person-picker`、`relation-matrix` 七个共享模块；同一类列表/表格结构 SHALL 只从对应模块渲染。

#### Scenario: 新增一条列表行
- **WHEN** 页面需要展示「标题 + 次级信息 + 一个动作」的重复行
- **THEN** 使用 `list-row`；不得再手写 `div` + `border-b` + `py-2.5` 的行容器

#### Scenario: 新增一张数据表
- **WHEN** 页面需要逐行对比同一组字段
- **THEN** 使用 `data-table`；首列对象、末列动作、超过 8 行出现 `filter-bar`、翻页走 `pager`

### Requirement: 支委会 tab 清爽目录

支委会 tab SHALL 只呈现「支委构成表 + 会议表 + 新建入口」，不出现大段说明与全局身份表单。

#### Scenario: 打开支委会 tab
- **WHEN** 支书进入支委会 tab
- **THEN** 首屏可见五类支委身份及现任人、最近会议列表与「新建线上支委会」；说明文字不超过一行，详细制度走帮助页

#### Scenario: 改派组织委员
- **WHEN** 支书在委员表行尾点「改派」
- **THEN** 就地打开选人面板完成改派；不出现独立的「选人 → 选身份 → 确认」全局表单

### Requirement: 独立会议页去说明化

支委会独立会议页 SHALL 用步骤条表达流程，当前步骤只呈现一个主行动；解释性长文 SHALL 移入帮助页。

#### Scenario: 进入一场线上支委会
- **WHEN** 支书打开某场会议
- **THEN** 顶部显示「范围 → 议程 → 表态 → 截止 → 留存」步骤条；当前步骤只有一个主按钮，长说明不占据正文

### Requirement: 我的待办四档摘要

待办页 SHALL 在顶部显示「逾期 / 今日 / 本周 / 待处理」四个数，并按这四档分组；组名与所有文案 SHALL 使用纯中文。

#### Scenario: 打开待办
- **WHEN** 用户进入待办 tab
- **THEN** 首屏先看到四个数与「逾期」组；空组不渲染；不出现 `Overdue` 等中英混排

#### Scenario: 处理一条待办
- **WHEN** 用户看到一条待办
- **THEN** 行内只有标题、一句说明、一个主行动；作废等次要动作收进行尾「更多」，不再并排铺开

### Requirement: 选择人员无框行

选择人员面板 SHALL 删除姓名前的头像框；姓名 14px/500，学号、组别、角色 12px；行高 40px；选中态只用整行底色与右侧勾。

#### Scenario: 单选一位同志
- **WHEN** 用户点中一行
- **THEN** 该行整行高亮并出现勾，面板立即关闭；姓名前没有色块或边框

#### Scenario: 多选多位同志
- **WHEN** 用户连续点选
- **THEN** 每行只切换整行底色与勾；底部保留「已选 N 人 / 确认选择」；行与行之间只用分隔线

### Requirement: 工作概况三层骨架

六个支部内工作台的「工作概况」SHALL 使用同一三层骨架：结论带、条线表、待我处理；不得再出现独立「汇报」卡或以卡片堆叠代替条线对比。

#### Scenario: 支书打开全局概况
- **WHEN** 页面加载完成
- **THEN** 第一层是一条结论带（在办 / 逾期 / 待我处理 / 待答复）；第二层是一张条线表（组织、宣传、纪检、党小组、专班）；第三层是前 5 条待我处理

#### Scenario: 成员打开工作概况
- **WHEN** 成员进入工作概况
- **THEN** 仍为同一三层骨架；条线替换为「我的活动 / 我的专班 / 我的汇报 / 我的考察」，不出现支书专属条线

### Requirement: 首页工作组进展

首页「工作组进展」SHALL 同时纳入活动工作组与专班工作组，卡内分组展示；进度 SHALL 使用任务完成数，不得用报名人数填充率代替。

#### Scenario: 两类工作组都存在
- **WHEN** 支部既有活动工作组又有专班工作组
- **THEN** 卡内出现「活动工作组」「专班工作组」两组，各显示前 3 个；每行含组名、成员数、任务完成数、状态

#### Scenario: 只有一类工作组
- **WHEN** 支部只有专班工作组
- **THEN** 只显示「专班工作组」组；另一组不保留空标题；两类都没有时整卡隐藏

### Requirement: 手写行容器只降不升

仓库 SHALL 统计手写列表行容器存量；新增代码 SHALL 使用 `list-row`，守卫断言存量只降不升。

#### Scenario: 提交新页面
- **WHEN** 新页面需要重复行
- **THEN** 守卫统计值不高于基线；若上升则测试失败并指向 `list-row`

## MODIFIED Requirements

### Requirement: 表格四类与交互口径

`DESIGN_SYSTEM.md` §4.20 SHALL 在四类载体之外补充「复用模块采用规则」：每类载体对应哪个共享模块、哪些页面已采用、阈值与动作如何复用。表格仍按「逐行对比 / 两维交叉 / 时间序只读 / 少量异构」四问选择。

### Requirement: 按钮尺寸由语义族统一

按钮族继续由 `styles.css` 统一高度、字号、内边距；本轮只允许在采用矩阵中登记，不得因页面重做新增第五种厚度。

## REMOVED Requirements

### Requirement: 待办按六类业务域折组

**Reason**：支书裁定「按推荐来」——先看紧迫度，再看业务域；六域折组让同一紧急度被拆散，首屏无法回答「今天必须先处理什么」。
**Migration**：业务域降为行内一个 12px 次级标签；历史深链 `?tab=todo&group=<groupKey>` 仍定位到对应行。

### Requirement: 工作概况独立「汇报」卡

**Reason**：汇报计数与待办、待我处理重复；独立卡只增加一层壳，不增加决策信息。
**Migration**：待汇报/待答复计数并入结论带；具体条目并入「待我处理」，提交仍回「我的处置」。

### Requirement: 首页「专班进展」只展示专班

**Reason**：工作组概念已在全仓统一，首页只展示专班造成「标题说工作组、内容只有专班」的名实不符。
**Migration**：标题改「工作组进展」，数据改为两类工作组分组展示；专班入口保留在组内。
