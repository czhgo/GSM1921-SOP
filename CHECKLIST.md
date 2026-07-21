# CHECKLIST — 工程质检操作手册

> 本文档是人机共读的工程质检流程。按操作步骤逐步检查：**如果在某处看到了某数据，可以预期在其他地方看到同源的数据。**
>
> 最后更新：2026-05-23

---

## 一、主页（index.html）

> ⚠️ 2026-05-23 修复：`loadWorkspaceData()` 硬编码 `activeModule: 'workspace'`，覆盖了 state.js 默认值 `'dashboard'`，导致 `renderDashboard()` 永远不被调用。已添加 `activeModule` 参数，main-entry.js 传入 `'dashboard'`。同时修复了 P.5 反面案例（直接导入 ACTIVITIES 常量），改为通过 `mockDB.activities` 作为 fallback。

### 1.1 通知区域

- [ ] 右上角通知铃铛有未读标记（金色小圆点）
- [ ] 点击铃铛展开通知列表，应看到5条未读通知 + 1条已读通知
- [ ] 通知"五四主题党日筹备专班已组建"和"建党105周年筹备专班招募"应标为"紧急"（红色标签）
- [ ] 点击通知可标记已读，铃铛小圆点消失

### 1.2 招募区域

- [ ] 右上角招募卡片显示3个正在招募的专班：宣传专班（第二期）、建党105周年筹备专班、参访活动保障专班
- [ ] 每个招募卡片显示所需人数和截止日期

### 1.3 日历区域

- [ ] 下方日历显示当月活动标记
- [ ] 5月应显示5个活动标记（5/10支部党员大会、5/14党小组会、5/18主题党日、5/20支委会、5/22共建座谈、5/25积极分子座谈会）

### 1.4 同源验证

- [ ] 主页通知中的"五四主题党日筹备专班已组建" → 切换到党建工作台组织委员视图，看板中应能看到"五四主题党日筹备专班"（active状态）
- [ ] 主页招募中的"建党105周年筹备专班" → 切换到党建工作台组织委员视图，看板中应能看到该专班（recruiting状态）

---

## 二、党建工作台（workspace/）

### 2.1 角色选择

- [ ] 侧边栏显示9个角色卡片：党支书、党小组组长、支委（组织/宣传/纪检）、组织者、深度参与者、默认参与者
- [ ] 点击角色卡片后进入管理模式（header右上角显示红色"管理模式"标签）
- [ ] 未赋权角色（如默认参与者）点击后进入只读模式（灰色"只读模式"标签）

### 2.2 书记工作台

- [ ] 选择"党支书"后，主内容区显示书记工作台
- [ ] 统计卡片显示：活动总数18、进行中6、已完成7、品牌标签3
- [ ] 日历显示全部18个活动
- [ ] "活动写入"区域显示决策树引导式面板
- [ ] 决策树第一步：三会一课（展开4个子选项：支部党员大会/党小组会/支部委员会/党课）+ 主题党日
- [ ] 选择"主题党日"后，第二步显示5种活动形式（学习/参访/座谈/共建/会议）
- [ ] 选完4步后展开表单（日期/地点/名称/描述）
- [ ] 点击"写入活动"后，下方出现工作流可视化面板

### 2.3 党小组组长工作台

- [ ] 选择"党小组组长"后，主内容区显示党小组组长工作台
- [ ] 决策树第一步仅显示2个选项：党小组会、主题党日
- [ ] 选择后出现"承办党小组"选择器（第二党小组/第三党小组）
- [ ] 写入活动后工作流可视化面板出现

### 2.4 组织委员视图

- [ ] 选择"组织委员"后，显示任务看板（非日历）
- [ ] 看板分两列：待启动、进行中
- [ ] 待启动列应包含：宣传联络专班、学术研讨专班
- [ ] 进行中列应包含：考勤纪检专班、支部大会筹备专班
- [ ] 点击看板卡片展开子任务详情
- [ ] "发布招募"按钮存在

### 2.5 宣传委员视图

- [ ] 选择"宣传委员"后，显示活动与专班视图
- [ ] 看板包含活动和专班两种类型的卡片
- [ ] 待启动列：四月主题党日新闻稿、宣传联络专班
- [ ] 进行中列：支部品牌宣传方案

### 2.6 纪检委员视图

- [ ] 选择"纪检委员"后，显示活动与专班视图
- [ ] 待启动列：四月党小组会考勤统计、考勤纪检专班
- [ ] 进行中列：季度考勤报告

### 2.7 组织者视图

- [ ] 选择"组织者"后，显示日历视图（非看板）
- [ ] 日历显示关联的活动

### 2.8 同源验证

- [ ] 书记工作台统计卡片"品牌标签3" → 日历中act-3/act-10/act-12应标有品牌标记
- [ ] 组织委员看板"支部大会筹备专班" → 专班列表中tf-004应存在且状态为active
- [ ] 宣传委员看板"四月主题党日新闻稿" → 活动act-7（4月主题党日：红色基地参访）应存在
- [ ] 纪检委员看板"四月党小组会考勤统计" → 考勤数据中act-4应有考勤记录（赵六、钱七请假）

---

## 三、党务管理（party/）

### 3.1 组织委员面板

- [ ] "追踪看板"tab显示发展党员候选人列表
- [ ] 候选人5人：赵六（预备党员）、钱七（积极分子）、孙八（发展对象）、周九（预备党员）、吴十（积极分子）
- [ ] 材料状态显示：赵六缺3份、钱七缺1份、孙八齐全、周九齐全、吴十缺2份

### 3.2 宣传委员面板

- [ ] 显示宣传规范（照片/文字/排版三要素）
- [ ] 模板列表6个：活动总结、会议记录、入党申请书、思想汇报、转正申请书、活动复盘

### 3.3 纪检委员面板

- [ ] 考勤总表显示11个活动的考勤汇总
- [ ] 考察档案显示6条考察记录
- [ ] 补课任务5条：张三/李四/王五/赵六/钱七
- [ ] 王五和钱七的补课标记为"已完成"

### 3.4 书记面板

- [ ] 概览统计：候选人5人、待处理反馈2条、专班7个
- [ ] 意见反馈数据集显示：待处理2条、处理中1条、已处理2条

### 3.5 同源验证

- [ ] 纪检委员考勤总表中act-10（5月主题党日）出勤6人、请假1人（李四） → 对应考勤记录att26标记overdue=true
- [ ] 纪检委员考察档案中"张三-深度参与-研究"来源为act-3 → 切换到党建工作台，act-3的详情中张三应为参与者
- [ ] 组织委员候选人"赵六"阶段为"预备党员" → people.js中赵六(p4)发展阶段为"预备党员"（D-190-1 已统一）
- [ ] 书记面板"专班7个" → 切换到党建工作台组织委员视图，看板中应能看到对应的专班数据

---

## 四、关于页面（about.html）

- [ ] 页面使用华文中宋字体渲染
- [ ] 权限体系表格显示正确的角色权限
- [ ] 关键约束中"创建活动仅限党支书和党小组组长"表述正确
- [ ] 三支委职责矩阵（`#commissioner-matrix-container`）由 `commissioner-matrix.js` 动态渲染

---

## 五、跨页面同源验证

### 5.1 活动数据一致性

- [ ] 主页日历中的活动数量 = 书记工作台统计卡片中的活动总数
- [ ] 党建工作台日历中的品牌标记 = about.html权限表中品牌属性标签的说明

### 5.2 专班数据一致性

- [ ] 主页招募区域的专班 = 组织委员看板中recruiting状态的专班
- [ ] 专班详情中的成员 = people.js中对应角色的成员

### 5.3 考勤/考察数据一致性

- [ ] 纪检委员考勤总表中的出勤人数 = 对应活动的考勤记录中status=present的数量
- [ ] 纪检委员考察档案中的标签（党小组/专班/会议） = 活动类型或专班来源的对应关系

### 5.4 权限一致性

- [ ] 党建工作台：仅党支书和党小组组长可见"活动写入"面板
- [ ] 党建工作台：组织委员可见"发布招募"按钮
- [ ] 党建工作台：支委显示看板而非日历
- [ ] about.html权限表 = auth.js中的canWriteActivity/canRecruitTaskForce规则

---

## 六、已解决的数据不一致项

> 以下为mock数据中已发现并已修复的不一致项，修复决策归档于 D-190，执行归档于 2026-05-T3：

| # | 不一致项 | 修复措施 | 决策编号 | 状态 |
|---|---------|---------|---------|------|
| 1 | 赵六发展阶段：people.js标记"预备党员"，party.js标记"入党申请人" | party.js赵六(c1)阶段统一为"预备党员" | D-190-1 | ✅ 已解决 |
| 2 | 书记无人员条目：auth.js有secretary角色，people.js 12人中无书记 | people.js新增p13沈一(书记/2300010001)、p14陆二(副书记/2300010002) | D-190-2 | ✅ 已解决 |
| 3 | 专班成员用姓名字符串而非personId引用 | taskforces.js全部改为personId引用 | D-190-3 | ✅ 已解决 |
| 4 | party.js独有人员"吴十"不在people.js中 | people.js新增p15吴十(2500010001) | D-190-4 | ✅ 已解决 |
| 5 | 考勤覆盖不全：18个活动中仅11个有考勤记录 | 明确考勤仅限三会一课+主题党日，删除非合规考勤记录5条 | D-190-5 | ✅ 已解决 |

---

## 七、组件化架构验证

> 2026-05-23 新增。验证 JS 组件化重构（C-1 持续任务，D-199 路线图）后的架构一致性。

### 7.1 HTML 纯净度

- [ ] 全部19个HTML文件不含内联业务逻辑（仅允许 tailwind.config 配置块）
- [ ] 每个HTML文件仅通过一个 `<script type="module">` 引入对应 entry JS

### 7.2 组件引用一致性

- [ ] 使用 Tab 切换的页面（9个workspace/party角色页）均通过 `renderTabBar` 组件渲染
- [ ] 使用日历的页面（书记/组织者）均通过 `renderCalendarByActivities` 组件渲染
- [ ] 使用人员选择器的页面（书记/党小组组长/组织者）均通过 `PersonPicker` 类实例化
- [ ] 全部19个页面的侧边栏由 `renderSidebar` 统一渲染
- [ ] 全部19个页面的顶栏由 `renderHeader` 统一渲染

### 7.3 初始化流程一致性

- [ ] 全部13个角色页（workspace/下8个 + party/下4个 + about）均通过 `bootstrapPage()` 初始化
- [ ] 全部9个workspace角色页均通过 `loadWorkspaceData()` 加载数据
- [ ] 全部4个party角色页均通过 `loadPartyData()` 加载数据

### 7.4 Service 层一致性

- [ ] 交接记录 CRUD 仅由 `services/handover.js` 提供（ws-organizer-entry 和 ws-disc-commissioner-entry 引用同一 service）
- [ ] 补课任务 CRUD 仅由 `services/makeup.js` 提供
- [ ] 分工记录 CRUD 仅由 `services/assignment.js` 提供（ws-organizer-entry 引用）
- [ ] 权限管理仅由 `services/permission-manager.js` 提供（selectRole/restoreRole）
- [ ] 专班数据仅由 `services/taskforce.js` 提供

### 7.5 数据访问路径一致性

- [ ] 需持久化的数据（活动/专班/交接/补课/分工/考勤/考察）均通过 `mockDB` 读写，不直接操作 localStorage
- [ ] 只读数据（访客视角的考勤等）可直接引用 mock 常量，但不得与 mockDB 数据产生矛盾
- [ ] `saveDB()` 是唯一的持久化入口，所有 service 的 save 方法最终调用 `saveDB()`

---

## 八、功能使用位置清单

> 2026-05-23 新增。记录每个功能组件/服务/核心模块被哪些页面引用，用于验证功能覆盖完整性和引用一致性。
> 孤立组件（存在但无引用）需特别关注：可能是未启用功能或应清理的死代码。

### 8.1 UI 组件

| 组件 | 导出项 | 引用页面数 | 引用文件 | 验证要点 |
|------|--------|-----------|---------|---------|
| **modal.js** | openFormModal | 5 | feedback-entry, workspace-entry, ws-organizer-entry, party.js, ws-disc-commissioner-entry | 点击按钮→弹出浮窗→填写→提交→toast→关闭 |
| | openModal, closeModal | 1 | workspace-entry | 支委身份选择浮窗，ESC/遮罩关闭 |
| **query-view.js** | renderQueryView | 3 | ws-visitor-entry, ws-secretary-entry, ws-org-commissioner-entry | 搜索+筛选+结果列表，实时过滤 |
| **tab-bar.js** | renderTabBar | 11 | ws-organizer/disc/visitor/leader/deep/prop-commissioner/org-commissioner-entry, party-disc/prop/org/secretary-entry | Tab 切换正常，高亮当前 Tab |
| **calendar.js** | renderCalendarByActivities | 1 | ws-secretary-entry | 日历渲染活动标记，月份切换 |
| **person-picker.js** | PersonPicker | 4 | ws-organizer/leader/org-commissioner/secretary-entry | 人员选择弹窗，搜索+选择 |
| **sidebar.js** | renderSidebar | 7+bootstrap | feedback/workspace/about/archive/party/search-entry, bootstrap.js | 侧边栏渲染，角色切换 |
| **header.js** | renderHeader | 7+bootstrap | feedback/workspace/about/archive/party/search-entry, bootstrap.js | 顶栏渲染，通知铃铛 |
| **commissioner-matrix.js** | renderCommissionerMatrix | 1 | about-entry | 三支委职责矩阵表格 |
| **inspector.js** | renderInspectorFromState | 1 | ws-secretary-entry | 书记面板数据检查器 |
| ⚠️ **role-selector.js** | interceptSidebarNavigation | **1** | sidebar.js | 角色选择面板拦截导航，非孤立（§8.7已修正） |

### 8.2 服务层

| 服务 | 核心导出 | 引用页面数 | 引用文件 | 验证要点 |
|------|---------|-----------|---------|---------|
| **attendance.js** | load/saveAttendanceRecords | 4+makeup | main/disc-commissioner/visitor/leader-entry, makeup.js | 考勤数据通过 Service 层读写，不直接引用 mock 常量 |
| **inspection.js** | load/saveInspectionRecords | 3 | ws-organizer/disc-commissioner/leader-entry | 考察数据通过 Service 层读写 |
| **handover.js** | load/add/update/completeHandover | 2 | ws-organizer-entry (全4项), ws-disc-commissioner-entry (2项) | 交接记录 CRUD |
| **makeup.js** | load/save/update/autoGenerate | 2 | ws-disc-commissioner-entry (全4项), ws-leader-entry (1项) | 补课任务自动生成 |
| **assignment.js** | load/checkOverdue/add/complete | 1 | ws-organizer-entry | 分工记录 CRUD |
| **taskforce.js** | TaskForceRecordStore | 4 | main/visitor/prop-commissioner/org-commissioner-entry | 专班数据 CRUD |
| **notice.js** | NoticeStore, renderNoticeList | 3 | main-entry, party.js, header.js | 通知 CRUD + 渲染 |
| **feedback.js** | FeedbackStore | 3 | feedback-entry, party.js, ws-secretary-entry | SOP 反馈 CRUD |
| **auth.js** | AuthStore, ViewModeStore | 6+ | workspace/bootstrap/sidebar/org-commissioner/secretary/inspector/party-entry, header.js | 角色认证 + 视图模式 |
| **permission-manager.js** | PermissionManager | 2 | header.js, sidebar.js | 赋权/角色切换 |
| **runtime.js** | BranchService | 7 | main/data-loader/leader/prop-commissioner/org-commissioner/secretary-entry, inspector.js | 统一后端接口 |

### 8.3 核心层

| 模块 | 核心导出 | 引用页面数 | 验证要点 |
|------|---------|-----------|---------|
| **bootstrap.js** | bootstrapPage | 13 | 全部角色页均通过 bootstrapPage 初始化 |
| **data-loader.js** | loadWorkspaceData | 9 | 全部 workspace 角色页均通过 loadWorkspaceData 加载数据 |
| | loadPartyData | 4 | 全部 party 角色页均通过 loadPartyData 加载数据 |
| **state.js** | setState, registerRenderCallback | 9+4 | workspace 页用 setState+renderCallback，party 页用 registerRenderCallback |
| **cross-page-state.js** | CrossPageState | 7 | 跨页面状态传递（角色选择、活动ID） |
| **constants.js** | getActivityTypeColors, ROLE_LABELS 等 | 7 | 活动类型颜色/角色标签统一 |
| **utils.js** | showToast | 13 | 全部写入操作后显示 toast |
| | getBasePath | 7 | 路径前缀统一 |
| **domain.js** | mockDB | 14 | 统一数据模型，所有 service 通过 mockDB 读写 |

### 8.4 模块层

| 模块 | 导出项 | 引用页面数 | 验证要点 |
|------|--------|-----------|---------|
| **party.js** | PartyModule | 4 | party-disc/prop/org/secretary-entry 共用 |
| **references.js** | ReferencesModule | 1 | search-entry |

### 8.5 工作流层

| 模块 | 导出项 | 引用页面数 | 验证要点 |
|------|--------|-----------|---------|
| **sopData.js** | sopDatabase | 2 | ws-leader/secretary-entry |
| **sop.js** | instantiateSOP | 2 | ws-leader/secretary-entry |
| **renderer.js** | renderWorkflow | 2 | ws-leader/secretary-entry |
| ⚠️ **index.js** | — | **0** | 孤立，待决策 |
| ⚠️ **definitions.js** | — | **0** | 孤立，待决策 |
| ⚠️ **engine.js** | — | **0** | 孤立，待决策 |

### 8.6 浮窗（Modal）详细清单

> 浮窗是 UI 组件的子集，此处列出每个浮窗的详细信息。

| 页面 | 浮窗标题 | 类型 | 字段数 | accentColor | 触发方式 |
|------|---------|------|--------|-------------|---------|
| workspace/index | 创建活动 | openFormModal | 9 | #CE1126 红 | 点击按钮 |
| workspace/index | 发布专班招募 | openFormModal | 5 | #3B82F6 蓝 | 点击按钮 |
| workspace/index | 赋权管理 | openFormModal | 3 | #10B981 绿 | 点击按钮 |
| workspace/index | 选择支委身份 | openModal | — | #3B82F6 蓝 | dispatchEvent |
| ws-disc-commissioner | 批注 | openFormModal | 2 | #D97706 琥珀 | 点击批注按钮 |
| ws-organizer | 提交复盘 | openFormModal | 3 | #8B5CF6 紫 | 点击提交复盘按钮 |
| ws-organizer | 上传文件 | openFormModal | 3 | #3B82F6 蓝 | 点击上传按钮 |
| party (4页共用) | 复盘编辑器 | openFormModal | 3 | #8B5CF6 紫 | 点击复盘按钮 |
| party (4页共用) | 编辑记录 | openFormModal | 4 | #3B82F6 蓝 | 点击编辑按钮 |
| party (4页共用) | 添加子记录 | openFormModal | 3 | #10B981 绿 | 点击添加按钮 |
| party (4页共用) | 生成周报 | openFormModal | 2 | #D97706 琥珀 | 点击周报按钮 |
| feedback | 提交反馈 | openFormModal | 6 | #D97706 琥珀 | 点击提交反馈按钮 |

### 8.7 孤立组件待决策

> ⚠️ 2026-05-24 修正：经核实，4个"孤立"判断中3个为误判。role-selector.js 被 sidebar.js 引用；definitions.js 和 engine.js 被 renderer.js/index.js 内部引用。真正需要决策的仅 workflow/index.js（barrel file 无外部引用）。已提交丙部 P.9。

| 文件 | CHECKLIST原判断 | 实际情况 | 处置 |
|------|----------------|---------|------|
| role-selector.js | 孤立（0引用） | ❌ 误判——被 sidebar.js 引用（interceptSidebarNavigation） | 保留，更新§8.1引用数 |
| workflow/index.js | 孤立（0外部引用） | barrel file 设计，但 entries 直接引用子模块 | 丙部 P.9 待决策 |
| workflow/definitions.js | 孤立（0外部引用） | ❌ 误判——被 renderer.js 和 index.js 内部引用 | 保留 |
| workflow/engine.js | 孤立（0外部引用） | ❌ 误判——被 renderer.js 和 index.js 内部引用 | 保留 |

---

## 九、写入数据验证（规划中）

> **设计目标**：不仅验证mock数据的同源一致性，还要验证"写入数据后，在哪些地方可以看到写入的数据"。
> 这是长期规划项，需要形成设计思路文档。以下为初步检查维度。

### 8.1 活动写入验证

- [ ] 书记工作台写入活动后 → 日历视图应出现新活动标记
- [ ] 书记工作台写入活动后 → 统计卡片"活动总数"应+1
- [ ] 书记工作台写入活动后 → 工作流可视化面板应出现
- [ ] 党小组组长工作台写入活动后 → 日历视图应出现新活动标记（仅限党小组会/主题党日）

### 8.2 考察记录写入验证

- [ ] 组织者工作台录入考察记录后 → 纪检委员考察档案应出现对应记录
- [ ] 组织者工作台录入考察记录后 → 活动详情中参与者列表应更新

### 8.3 专班招募写入验证

- [ ] 组织委员发布招募后 → 主页招募区域应出现新专班
- [ ] 组织委员发布招募后 → 组织委员看板应出现新专班（recruiting状态）

### 8.4 赋权写入验证

- [ ] 书记赋权后 → 被赋权者切换到管理模式时应能进入管理视图
- [ ] 书记撤销赋权后 → 被赋权者应退回只读模式

### 8.5 考勤/考察写入验证

- [ ] 党小组组长上传考勤后 → 纪检委员考勤总表应出现对应记录
- [ ] 纪检确认考勤后 → 考察档案应同步更新

### 8.6 数据交接写入验证

- [ ] 组织者记录活动交接数据后 → 纪检委员面板应能看到汇总
- [ ] 组织者记录专班交接数据后 → 纪检委员面板应能看到汇总

> **已完成**：配套设计文档见 [DATA_ARCHITECTURE.md §写入数据验证设计](content/04_web_design/DATA_ARCHITECTURE.md)（原 WRITE_VERIFY.md 已合并）。
