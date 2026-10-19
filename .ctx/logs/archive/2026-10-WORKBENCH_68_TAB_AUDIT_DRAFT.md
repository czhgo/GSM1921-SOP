# 工作台 68 个页签结构盘点（临时讨论底稿）

> 退出条件：Round 1 triage 完成、结构结论已并入 README-server / ARCHITECTURE 后删除。

> 状态：进行中。仅保留本轮盘点证据与逐项讨论上下文；不是新的长期规范。确认后的规则归并到现有权威文档后删除本文件。
>
> 基线：隔离工作树 codex/agenda-link-voting，代码与文档基线为批次 448。当前能力注册表和 README-server §3.2 均为 68 个页签，分台数 12 / 11 / 9 / 9 / 10 / 11 / 6。旧执行日志中的“66 个”描述的是当时未完成的盘点范围，不能覆盖当前已增加的页签。

## 盘点判据

- 每个注册页签核对其角色入口、业务对象、主要读写动作、内容层级、展示载体和实际实现模块。
- 业务说明以 README-server §3.2 各行作为索引；角色与载体以 docs/src/capabilities 下的注册声明为准；具体读写链路再追到对应 entry/service/API。文档说法不等于页面已验证。
- 依 CLAUDE.md H10，以信息成本、操作成本、适应学习成本评议；按数据关系选择列表、关系矩阵、时间线、汇总等载体。
- “重复”按业务对象、任务、规则和数据源判断。角色入口可因使用路径或权限而保留；实现应复用共同组件。

## 已完成的样本校准

### 样本 1：活动日历

- 证据：支书、组织、宣传、纪检、组长五台登记独立页签，共用 docs/src/entries/tabs/shared/activity-calendar-tab.js；成员台在“活动动态”中提供列表、日历、查询视图。注册映射见七个 capabilities/*-workspace.js，说明见 README-server §3.2.1–§3.2.6。
- 支书选择：保留角色入口，共享实现。
- 归纳：评议复用时看共同能力的实现与业务职责；不能仅以入口重复认定重复建设。用户路径不同可以保留角色入口，同时共享一个实现。
- 当前结论：保留入口和实现；将成员台的嵌入视图差异列为角色路径差异。没有据此合并页签。

### 样本 2：考勤的人 × 活动关系

- 证据：attendance_rosters 冻结活动原应到名单；attendance facts 以活动 ID × 人员 ID 保存；应到集合为冻结原应到与实际到场去重并集；工作组成员不自动成为应到人。依据 D-816、DATA_MODEL.md §2.5、server/test/attendance-roster-union.test.mjs。
- 现有呈现：纪检考勤的矩阵与总表只从已有考勤记录构造。矩阵空白没有区分“不适用”与“应到但未录入”；汇总模型另有 unrecorded、coverage 和 estimate。页面 comments 仍把“按人/按活动”描述为互为转置，范围窄于完整的应到关系。
- 支书选择：按冻结名单补出未录状态。
- 归纳：关系矩阵须同时表达关系事实与适用集合。空白只有在其是否适用、是否已登记的含义明确时才可阅读；冻结名单给出活动 × 人员的适用范围，考勤事实给出范围内状态，实际到场者可扩入统计并集。
- 当前结论：后续统一实施时，将冻结应到集合纳入分析矩阵，显式显示“应到未录”，并与“未应到、缺勤、请假、到场、已补”区分；现有应到率、覆盖率口径保持。

## 全量标签映射

下表每行记录任务对象、展示/动作轮廓及代码实现入口。完整操作语义以所指 README-server §3.2 行为索引，权限和接口以实现文件及其服务端守卫为准。

### 支书 / 副支书工作台（12）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| today / 今天 | 今日会务、到期项与分工；只读速览并直达处理位 | entries/tabs/today/today-tab.js |
| todo / 待办 | 跨业务待处理事项；按业务域分组并处理 | entries/tabs/secretary/todo-tab.js |
| overview / 全局概况 | 汇报、卡点、在办与待处理；书记全局概览 | entries/tabs/secretary/overview-tab.js |
| calendar / 活动管理 | 活动日历、活动创建、组内活动只读列表与项目赋权 | entries/tabs/secretary/calendar-tab.js |
| committee-meeting / 支委会 | 支委构成、会议议程与线上表态入口 | entries/tabs/secretary/committee-meeting-tab.js |
| group-progress / 党小组 | 党小组建改撤、成员归组、组长任命及组员进展 | entries/tabs/secretary/group-progress-tab.js |
| notification / 通知发布 | 通知受众、发布与催读 | entries/tabs/secretary/notification-tab.js |
| report-up / 上报党委 | 发展节点、活动报备及党委批复 | entries/tabs/secretary/report-up-tab.js |
| member-flow / 成员流动 | 流入/流出登记、对账和撤销；与组织台共用实现 | entries/tabs/org/member-flow-tab.js |
| work-map / 支部分工 | 按模块、按人、按项目查看支部分工 | entries/tabs/secretary/work-map-tab.js |
| tf-view / 知情查看 | 活动/专班只读概览与定位 | components/record/insight-view.js |
| feedback / 反馈管理 | 反馈指派、答复、关闭、隐藏、合并和终审 | entries/tabs/secretary/feedback-tab.js |

### 组织委员工作台（11）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| today / 今天 | 今日事项只读速览 | entries/tabs/today/today-tab.js |
| todo / 待办 | 组织条线待处理事项 | entries/tabs/org/todo-tab.js |
| overview / 工作概况 | 汇报、卡点、在办与条线数据 | entries/tabs/org/overview-tab.js |
| calendar / 活动日历 | 全支部活动只读日历；共享同一实现 | entries/tabs/shared/activity-calendar-tab.js |
| roster / 成员名册 | 成员档案名单和基础维护 | entries/tabs/org/roster-tab.js |
| talent / 人才库 | 成员发展画像、活动参与汇总、录入考察 | entries/tabs/org/talent-tab.js |
| thought-review / 思想汇报 | 人员 × 期次汇报台账、阅读和退回 | entries/tabs/org/thought-review-tab.js |
| taskforce / 专班管理 | 工作组/专班对象、成员、任务、产出及相关授权 | entries/tabs/org/taskforce-tab.js |
| member-flow / 成员流动 | 流动登记台账；与支书台共用实现 | entries/tabs/org/member-flow-tab.js |
| tf-view / 知情查看 | 依据分工下游派生的只读专班视图 | entries/tabs/org/tf-view-tab.js |
| my-dispatch / 我的处置 | 反馈与汇报收件处理 | entries/tabs/org/my-dispatch-tab.js |

### 宣传委员工作台（9）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| today / 今天 | 今日事项只读速览 | entries/tabs/today/today-tab.js |
| todo / 待办 | 宣传条线待处理事项 | entries/tabs/prop/todo-tab.js |
| overview / 工作概况 | 汇报、卡点、在办与条线数据 | entries/tabs/prop/overview-tab.js |
| calendar / 活动日历 | 全支部活动只读日历；共享同一实现 | entries/tabs/shared/activity-calendar-tab.js |
| tasks / 宣传任务 | 宣传任务台账和推进 | entries/tabs/prop/tasks-tab.js |
| kanban / 项目看板 | 活动与专班项目状态、活跃与归档视图 | entries/tabs/prop/kanban-tab.js |
| archive / 档案归档 | 活动/专班档案、宣传材料与周期报送 | entries/tabs/prop/archive-tab.js |
| tf-view / 知情查看 | 依据分工下游派生的只读活动视图 | entries/tabs/prop/tf-view-tab.js |
| my-dispatch / 我的处置 | 反馈与汇报收件处理 | entries/tabs/prop/my-dispatch-tab.js |

### 纪检委员工作台（9）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| today / 今天 | 今日事项只读速览 | entries/tabs/today/today-tab.js |
| todo / 待办 | 纪检条线待处理事项 | entries/tabs/disc/todo-tab.js |
| overview / 工作概况 | 汇报、卡点、在办与条线数据 | entries/tabs/disc/overview-tab.js |
| calendar / 活动日历 | 全支部活动只读日历；共享同一实现 | entries/tabs/shared/activity-calendar-tab.js |
| attendance / 考勤管理 | 异常确认、申诉、录入、矩阵与总表；矩阵/总表在数据查看区 | entries/tabs/disc/attendance-tab.js |
| review / 复盘 | 活动/专班复盘批注、退回和确认 | entries/tabs/disc/review-tab.js |
| inspection / 考察管理 | 考察记录、确认、申诉和组织者代录 | entries/tabs/disc/inspection-tab.js |
| tf-view / 知情查看 | 依据权限派生的只读活动视图 | entries/tabs/disc/tf-view-tab.js |
| my-dispatch / 我的处置 | 反馈与汇报收件处理 | entries/tabs/disc/my-dispatch-tab.js |

### 党小组组长工作台（10）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| today / 今天 | 今日事项只读速览 | entries/tabs/today/today-tab.js |
| todo / 待办 | 本组待处理事项 | entries/tabs/leader/todo-tab.js |
| overview / 工作概况 | 本组汇报、卡点、在办事项 | entries/tabs/leader/overview-tab.js |
| calendar / 活动日历 | 全支部活动只读日历；共享同一实现 | entries/tabs/shared/activity-calendar-tab.js |
| write / 本组活动 | 创建与维护本组活动及分工 | entries/tabs/leader/write-tab.js |
| attendance / 考勤管理 | 组织者上传本组/本人活动考勤 | entries/tabs/leader/attendance-tab.js |
| inspection / 考察管理 | 上传本组活动考察 | entries/tabs/leader/inspection-tab.js |
| members / 组员进展 | 本组成员履职、状态与阻塞事项 | entries/tabs/leader/members-tab.js |
| tf-view / 知情查看 | 本组可见活动及其他党小组只读情况 | entries/tabs/leader/tf-view-tab.js |
| my-dispatch / 我的处置 | 反馈与汇报收件处理 | entries/tabs/leader/my-dispatch-tab.js |

### 成员工作台（11）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| today / 今天 | 本人今日事项只读速览 | entries/tabs/today/today-tab.js |
| todo / 待办 | 本人待处理事项 | entries/tabs/visitor/todo-tab.js |
| overview / 工作概况 | 本人汇报、卡点、在办聚合 | entries/tabs/visitor/overview-tab.js |
| activities / 活动动态 | 活动列表、日历、查询三视图 | entries/tabs/visitor/activities-tab.js |
| projects / 项目分工 | 本人在活动/专班中的角色、任务与完成操作 | entries/tabs/visitor/projects-tab.js |
| attendance / 考勤概况 | 本人考勤与补课入口 | entries/tabs/visitor/attendance-tab.js |
| thought-report / 思想汇报 | 本人提交并归档思想汇报 | entries/tabs/visitor/thought-report-tab.js |
| inspection / 我的考察 | 查阅本人考察与组织者上传位 | entries/tabs/visitor/inspection-tab.js |
| review / 我的复盘 | 组织者/深度参与者提交本人复盘 | entries/tabs/visitor/review-tab.js |
| tf-view / 专班动态 | 全支部专班只读概览及本人产出填报 | entries/tabs/visitor/tf-view-tab.js |
| my-dispatch / 我的处置 | 本人反馈答复 | entries/tabs/visitor/my-dispatch-tab.js |

### 党委工作台（6）

| ID / 标签 | 对象与任务、展示/动作 | 注册实现 |
|---|---|---|
| governance-overview / 治理总览 | 多支部总体状态和近期动态 | entries/tabs/party-committee/governance-overview-tab.js |
| monitor / 支部监控台账 | 多支部治理数据查询 | entries/tabs/party-committee/monitor-tab.js |
| review / 支部上报 | 支部上报事项接收、批复和反馈 | entries/tabs/party-committee/review-tab.js |
| branches / 支部管理 | 支部目录及按需配置与部署 | entries/tabs/party-committee/branches-tab.js |
| issue-review / 匿名反馈核查 | 受限查看匿名反馈提交人并留痕 | entries/tabs/party-committee/issue-review-tab.js |
| dispatch / 下发通知 | 向目标支部支委层发布党委通知 | entries/tabs/party-committee/dispatch-tab.js |

## 跨页复用与候选风险

| 能力/数据 | 当前证据 | 初步评议 |
|---|---|---|
| 今天 | 六个支部角色入口共用 today-tab.js，角色和待办导航通过 ctx 分流 | 组件复用明确；需抽样核对数据是否按角色/支部投影 |
| 活动日历 | 五个支部角色入口共用 activity-calendar-tab.js；成员台把日历放进活动动态 | 用户已选保留路径并共用实现 |
| 成员流动 | 支书、组织委员两个入口调用同一 member-flow-tab.js | 共用读写组件；需确认各入口的权责门与展示数据一致 |
| 我的处置 | 五个角色包装器共用 issue-dispatch-view.js | 同一处理机制按角色传参；需检验视图权限与后端写门一致 |
| 知情查看 | 多个角色包装器调用 insight-view.js，内容分段按角色下游派生 | 组件共用；重点核验角色下游不越权、不漏知情范围 |
| 考勤 | 考勤事实、原应到快照、预期关系和已有记录分别参与矩阵/汇总 | 数据模型正确性与视图语义需联合核验；当前矩阵空白状态待审 |
| 活动/专班成员 | activity.assignments、taskforce.members 与 workgroup_members 并存；DATA_MODEL 将前两者记为兼容镜像，workgroup_members 为标准源 | 当前是迁移兼容形态；需逐条核对创建、改派、撤权、快照恢复的同步路径，避免双写漂移。移除镜像前需单独评估迁移，不擅删字段 |
| 成员与工作组授权撤回 | 撤员 API 把成员状态置为 removed；hasWorkgroupPermission 同时要求成员有效和授权 active；撤员没有改写授权状态，前端只更新本地授权缓存 | 当前撤员后权限暂时失效；同一人重新加入会令旧 active grant 再次生效。现有 API 回归只覆盖未授权成员的移除与重加，未覆盖已有授权。需确认移除成员时是否一并撤回所有授权留痕 |

## 当前验证与边界

- 直接注册清单解析：12 / 11 / 9 / 9 / 10 / 11 / 6，共 68；README-server §3.2 各台计数一致。
- server/test/capability-registry.test.mjs + doc-consistency.test.mjs：31/31 通过。覆盖 Help 页签数、名称、旧名、分组、顺序及能力注册约束。
- server/test/page-sweep.test.mjs：尝试运行，但当前隔离环境缺少 Playwright Chromium 可执行文件；所有浏览器用例在启动 Chromium 阶段失败，不能据此判定页面代码失败。该普查内使用内存 SQLite，未写日常数据。
- 工作树内本地 UI 服务已启动在 3001，使用隔离工作树 server/data.db 的自动演示种子；未连接或修改主工作区数据库。当前浏览器自动化安全门拒绝读取回环 URL，因此后续动态页面观察由用户在已打开的本地浏览器中进行。
- 这份 68 标签映射完成结构盘点，尚不等于每个标签的深层交互、数据权限和响应式行为均已真机复核。下方用户决策样本与高风险路径审查需继续。
