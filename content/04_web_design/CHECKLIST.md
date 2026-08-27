---
title: "数据同源一致性校验手册"
type: checklist
role: "[用户]+[AI]"
last_updated: "2026-08-27"
status: active
related_files: [DATA_MODEL.md, content/03_doc_system/ARCHITECTURE.md, CLAUDE.md]
---

# 数据同源一致性校验手册

> **定位：** 本文档供支部成员与 AI 协作使用，是工程质检流程。按数据类别逐步检查：**如果在某处看到了某数据，可以预期在其他地方看到同源的数据。**
> 原话（2026-05-23）："按操作步骤逐步检查——如果在某处看到了某数据，可以预期在其他地方看到同源的数据。"

---

## 使用说明

> 本手册按数据类别组织，每种数据列出存储源、展示页面、同源校验点。
> 校验方式：打开任意校验点涉及的页面，确认数据一致。

---

## 1. 人员数据

**存储**：`docs/src/mock/people.js` → `PEOPLE` 常量（50 条记录，p1~p50）
**运行时**：`mockDB.users`（由 `docs/src/mock/people.js` PEOPLE 经 `seed.js` 注入）
**登录映射**：`docs/src/mock/accounts.js` → `MOCK_ACCOUNTS`（17 条，studentId ↔ personId）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页日历中的组织者信息 | 全部 |
| workspace/secretary.html | 赋权管理 tab：常设赋权（设组长）+项目赋权（organizer/deep）；人员选择器、统计卡片 | 书记 |
| workspace/org.html | 人员选择器、发展党员追踪 | 组织委员 |
| workspace/prop.html | 宣传任务关联人员 | 宣传委员 |
| workspace/disc.html | 考勤/考察/补课涉及人员 | 纪检委员 |
| workspace/leader.html | 人员选择器、党小组成员 | 党小组组长 |
| workspace/visitor.html | 只读人员信息 | 访客 |
| login.html | 学号+密码登录 | 全部 |

**同源校验点**：

- [ ] 书记工作台赋权管理 tab 中被赋权人候选列表 = PEOPLE 中非支委成员
- [ ] 各工作台人员选择器中的列表 = PEOPLE 全部成员（PersonPicker 默认可注入 filter；特定场景由调用方传过滤，如发展党员候选=非正式党员、书记赋权被赋权人=非支委）
- [ ] 人员发展阶段在各页面中一致（正式党员/预备党员/发展对象/积极分子），与 people.js 定义相同
- [ ] 登录页输入 accounts.js 中的学号+密码 → 成功登录后跳转首页，首页顶栏展示对应角色工作台入口（login-entry.js 登录后跳 index.html；main-entry.js 按角色改写 workspace 链接）
- [ ] 书记工作台赋权管理 tab 中常设角色标签（书记/支委/组长）= PEOPLE 中 role 字段 + AuthStore 赋权记录
- [ ] 发展党员追踪候选人（由 PEOPLE 中 developStage≠'正式党员' 的成员动态派生）的 stage 与 developStage 一致

---

## 2. 活动数据

**存储**：`docs/src/mock/activities.js` → `ACTIVITIES` 常量（29 条记录，act-1~act-30（act-28 已删除））
**运行时**：`mockDB.activities`（由 `seed.js` 注入）
**Service**：`docs/src/services/activity.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页日历标记+活动列表+招募区 | 全部 |
| workspace/secretary.html | 决策树活动写入+统计卡片+日历 | 书记 |
| workspace/org.html | 专班管理+活动列表 | 组织委员 |
| workspace/prop.html | 活动/专班看板 | 宣传委员 |
| workspace/disc.html | 考勤关联活动 | 纪检委员 |
| workspace/leader.html | 决策树活动写入+日历 | 党小组组长 |
| workspace/visitor.html | 只读活动查询 | 访客 |
| help.html | 权限体系说明（谁可创建活动） | 全部 |

**同源校验点**：

- [ ] 首页日历/列表中的活动数量 = ACTIVITIES 中未归档的记录数（仅过滤 archived；已取消活动如 act-20 仍显示并带「已取消」徽章，成员可感知取消事实）
- [ ] 书记工作台全局概况「活动与专班进度」= 未归档活动数（activeActivities）+ 进行中/招募中专班数（activeTaskforces）+ 待赋权活动数（pendingAuth，bottom-up 且 assignments 无 organizer）+ 复盘问题数（reviewIssues，活跃活动复盘 issues 总条数）
- [ ] 首页统计卡「本月活动」= 未归档且日期属本月（main-entry `_renderStats`，与书记概况口径同源）
- [ ] 活动状态在各页面中一致：draft/published/ongoing/completed/cancelled
- [ ] 品牌活动在日历/看板中标有品牌标记（isBrand=true 的活动；isBrand 为属性标签，无独立计数统计）
- [ ] 活动的 organizer 字段（如 p3=王五）在首页和各工作台中一致
- [ ] help.html 中"创建活动仅限党支书和党小组组长"= auth.js ROLE_PERMISSIONS 中的 create_activity 权限

---

## 3. 专班数据

**存储**：`docs/src/mock/taskforces.js` → `MOCK_TASKFORCES` 常量（8 条记录，tf-001~tf-008）
**运行时**：`mockDB.taskforces`（由 `seed.js` 注入）
**Service**：`docs/src/services/taskforce.js` → `TaskForceRecordStore`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页招募区（recruiting 状态专班） | 全部 |
| workspace/secretary.html | 专班总览+赋权管理 tab（专班成员赋权记录） | 书记 |
| workspace/org.html | 专班看板（待启动/进行中/已完成）+发布招募 | 组织委员 |
| workspace/prop.html | 专班看板 | 宣传委员 |
| workspace/disc.html | 专班考察记录 | 纪检委员 |
| workspace/visitor.html | 只读专班信息 | 访客 |

**同源校验点**：

- [ ] 首页招募区的专班 = MOCK_TASKFORCES 中 status='recruiting' 的记录（tf-005/tf-006）
- [ ] 组织委员看板中的专班分类与 MOCK_TASKFORCES 的 status 字段一致
- [ ] 专班成员 personId 在 PEOPLE 中存在
- [ ] 已解散专班（tf-008 status='dissolved'）在各工作台不显示为活跃专班
- [ ] 首页通知"五四主题党日筹备专班已组建"→ 组织委员看板可见 tf-003（completed）

---

## 4. 考勤数据

**存储**：`docs/src/mock/attendance.js` → `ATTENDANCE_RECORDS` 常量（151 条记录，att1~att151；att1~att43 为显式种子段，att44 起由 8 月活动生成器追加）
**运行时**：`mockDB.attendances`（由 `seed.js` 注入）
**Service**：`docs/src/services/attendance.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 考勤总表（宽格式/长格式切换）+考勤确认 | 纪检委员 |
| workspace/leader.html | 考勤上传（党小组组长） | 党小组组长 |
| workspace/visitor.html | 只读考勤视图 | 访客 |

**同源校验点**：

- [ ] 纪检委员考勤总表中某活动的出勤人数 = ATTENDANCE_RECORDS 中该 activityId 且 status=present 的记录数
- [ ] 考勤记录的 personId 在 PEOPLE 中存在
- [ ] 考勤记录的 activityId 在 ACTIVITIES 中存在
- [ ] 已补课考勤记录（status='made_up'）= 补课任务中 status='completed' 的记录对应（att27/att14 已完成补课）
- [ ] 组织生活会（act-19）考勤记录含 studentId/developStage/partyGroup 字段
- [ ] 缺勤考勤记录中 overdue=true 的（att10/att33）应在补课任务中有对应 pending 项

---

## 5. 考察数据

**存储**：`docs/src/mock/inspection.js` → `INSPECTION_RECORDS` 常量（42 条记录，insp-1~insp-43（insp-17 已删除））
**运行时**：`mockDB.inspections`（由 `seed.js` 注入）
**Service**：`docs/src/services/inspection.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 考察档案（以人为中心/按来源分组） | 纪检委员 |
| workspace/leader.html | 考察上传 | 党小组组长 |

**同源校验点**：

- [ ] 考察记录的 personId 在 PEOPLE 中存在
- [ ] 活动考察记录（sourceType='activity'）的 activityId 在 ACTIVITIES 中存在
- [ ] 专班考察记录（sourceType='taskforce'）的 sourceName 在 MOCK_TASKFORCES 中有对应名称
- [ ] 考察层级（organize/deep）= 活动的 assignments 中对应人员角色
- [ ] 参与过活动/专班（assignments 中 role=organizer/deep）的人员**应有**对应考察记录——业务期望，考察为组长/组织委员手工上传，数量依赖录入行为，非自动从 assignments 派生（B4-2 修正 2026-08-24）
- [ ] 考察记录字段语义（P1-5 固化）：考察内容入 `content` 字段，`role` 存角色职责标签，禁止把内容文本塞进 role
- [ ] 组长/组织委员录入的考察子记录同步写入正式考察库（P0-2 固化），同一数据仅一套正式存储

---

## 6. 通知数据

**存储**：`docs/src/mock/notices.js` → `MOCK_NOTICES` 常量（12 条记录，notice-101~notice-108 + notice-110 + notice-001/notice-005/notice-011）
**运行时**：`mockDB.notices`（由 `seed.js` 注入）
**Service**：`docs/src/services/notice.js` → `NoticeStore`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 通知铃铛+通知列表 | 全部 |
| notice.html | 通知详情页（含通知者/被通知者/时间） | 全部 |
| 各工作台 | 通知→待办派生（§2.19 机制） | 各角色 |

**同源校验点**：

- [ ] 首页通知铃铛未读数 = MOCK_NOTICES 中 read=false 且未过期的记录数
- [ ] 紧急通知（priority='urgent'）在首页标红显示
- [ ] 已过期通知（expireDate < 当前日期）不在首页通知列表中显示
- [ ] 通知详情页内容 = MOCK_NOTICES 中对应 id 的完整数据
- [ ] 通知 targetModule 与实际页面对应：activity→活动相关、party→发展党员、workspace→工作台、attendance→考勤

---

## 7. 待办数据

**存储**：`mockDB.todos`（运行时由 NoticeTodoDeriver/LifecycleTodoDeriver 派生）
**Service**：`docs/src/services/todo.js` → `TodoStore` + `NoticeTodoDeriver` + `LifecycleTodoDeriver`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 待办 tab（双栏布局：分类+列表） | 书记 |
| workspace/org.html | 待办 tab | 组织委员 |
| workspace/prop.html | 待办 tab | 宣传委员 |
| workspace/disc.html | 待办 tab | 纪检委员 |
| workspace/leader.html | 待办 tab | 党小组组长 |
| workspace/visitor.html | 待办 tab（只读） | 访客 |

**同源校验点**：

- [ ] 通知类待办（TodoCategory.NOTICE）= actionable=true 且 actionRoles 非空的通知，为每个角色派生一条（NoticeTodoDeriver，字段驱动而非关键词判断）
- [ ] 审核类待办（TodoCategory.REVIEW）= 待审核的考勤/考察/复盘记录派生
- [ ] 赋权类待办（TodoCategory.AUTH）= 活动创建→组长赋权待办（LifecycleTodoDeriver.deriveFromActivityCreate）+ 专班创建→组织委员赋权待办（deriveFromTaskforceCreate）+ 书记待赋权活动派生
- [ ] 各角色工作台的待办列表仅含与该角色相关的待办
- [ ] 待办状态流转：pending → in_progress → completed（或 expired）
- [ ] 书记待办 8 组动态聚合（SecretaryTodoDeriver.computeAggregates）：4 提醒类（考勤>3天未录入/考察超期/复盘>7天未提交/归档材料缺失）+ 4 复核类（考勤/考察/复盘/归档 secretaryConfirmedAt 为空），空组不展示

---

## 8. 赋权数据

**架构（T-190 赋权整合闭环）**：一主源 + 一审计快照 + 双写 + 单读
- **主源**：活动角色 `mockDB.activities[].assignments` / 专班成员 `mockDB.taskforces[].members`（统一英文编码 `organizer`/`deep`）
- **审计快照**：localStorage `sop_org_os_auth_audit`（只增不改；revoke 为追加记录，判定取最新一条）
- **常设赋权**（党小组组长 leader）：AuthStore 赋权链（AUTHORIZE_CHAIN），快照同样记录
- **Service**：`docs/src/services/auth.js` → `AuthStore`（authorize / revokeAuthorization / syncProjectRoles 三合一：写主源 + 追加快照 + 通知）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 赋权管理 tab：常设赋权（设为/取消组长）+项目赋权（organizer/deep） | 书记 |
| workspace/leader.html | 活动详情内联编辑角色（保存走 syncProjectRoles） | 组长 |
| workspace/org.html | 专班详情内联编辑成员角色（保存走 syncProjectRoles） | 组织委员 |

**同源校验点**：

- [ ] 书记工作台赋权管理 tab 的「已赋权记录」= 审计快照 `sop_org_os_auth_audit`
- [ ] 活动/专班项目角色（organizer/deep）主源 = `activity.assignments` / `taskforce.members`，新建数据在主源可查
- [ ] 赋权记录中 targetPersonId 在 PEOPLE 中存在
- [ ] 被赋权角色（organizer/deep/leader）在 auth.js AUTHORIZE_CHAIN 中有赋权链定义
- [ ] 赋权后，被赋权者工作台出现对应角色页面，AuthStore.canDo() 返回 true
- [ ] 撤销/解散专班回收赋权后：主源角色被移除 + 快照追加 revoke，被赋权者恢复为普通参与者
- [ ] 全仓禁止无主源写入点的字段：授权记录上的 `authorizedBy`/`scope` 必须有主源写入点（巡检 P0-1/P0-3 缺口固化）

---

## 9. 反馈数据

**存储**：`docs/data/issues.json`（权威源）+ localStorage `gsm1921-issue-drafts`（个人草稿）
**Service**：`docs/src/services/issues.js` → `IssueStore`（旧 FeedbackStore 已弃用，保留 shim 兼容）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| feedback.html | GitHub Issue 风格反馈列表+提交表单 | 全部 |
| workspace/secretary.html | 反馈统计（书记专属：状态变更/关闭/隐藏/编辑） | 书记 |

**同源校验点**：

- [ ] feedback.html 的反馈列表 = issues.json 中的记录
- [ ] 书记面板的反馈统计 = IssueStore.countByStatus() 的结果
- [ ] 书记专属权限（关闭 issue/隐藏评论/编辑他人 issue）= auth.js 中的 _ISSUE_PERMS_SECRETARY
- [ ] 旧 FeedbackStore.getAll() 返回数据 = IssueStore 数据的兼容映射

---

## 11. 补课数据

**存储**：`mockDB.makeupTasks`（`core/domain.js` 初始化 `[]`，经 `core/data-adapter.js` 持久化；服务端模式路由 `/api/v1/makeupTasks`）
**运行时**：`mockDB.makeupTasks`
**Service**：`docs/src/services/makeup.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 补课任务列表+确认补课 | 纪检委员 |
| workspace/leader.html | 补课状态查看 | 党小组组长 |

**同源校验点**：

- [ ] 补课任务的 personId 在 PEOPLE 中存在
- [ ] 补课任务的 activityId 在 ACTIVITIES 中存在
- [ ] 补课任务的 attendanceRecordId 在 ATTENDANCE_RECORDS 中存在且对应记录 status 为 absent 或 leave
- [ ] 纪检「确认完成」补课任务时，按 attendanceRecordId 回写对应考勤记录 status='made_up' + overdue 清除（B3-1 修复 2026-08-24，完成必须对应真实产物）
- [ ] 已完成补课（status='completed'）对应的考勤记录 status='made_up'（att27/att14）
- [ ] 刚性考勤活动类型（支部党员大会/党小组会/党课/主题党日）的补课 isMandatory=true
- [ ] 补课截止日期 = 缺勤日期 +7 天

---

## 12. 复盘数据

**存储**：`docs/src/mock/review.js` → `REVIEW_RECORDS`（11 条活动复盘）+ `TASKFORCE_REVIEW_RECORDS`（2 条专班复盘）
**运行时**：`mockDB.activityReviews` / `mockDB.taskforceReviews`（P1-4 修复后写入 mockDB + persist()，刷新不丢失）
**Service**：`docs/src/services/review.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 复盘审核（批注/打回/确认） | 纪检委员 |
| workspace/leader.html | 复盘提交 | 党小组组长 |

**同源校验点**：

- [ ] 活动复盘的 activityId 在 ACTIVITIES 中存在
- [ ] 专班复盘的 sourceName 在 MOCK_TASKFORCES 中有对应名称
- [ ] 复盘状态流转覆盖 5 种：未提交→已上传→批注中→已确认/已打回
- [ ] 已打回复盘（rev7 act-7）有 annotation 和 annotatedBy 字段
- [ ] 复盘的 organizerId = 对应活动/专班的 organizer 字段
- [ ] 复盘提交后持久化（P1-4 固化）：刷新页面后记录仍在；书记全局概况按**复盘问题数**（reviewIssues，活跃活动复盘中 issues 数组总条数）统计——2026-08-10 裁定复盘改问题导向，复盘完成率已废弃

---

## 13. 分工数据

**存储**：`docs/src/mock/seed.js` → `SEED_ASSIGNMENTS`（5 条种子数据）
**运行时**：`mockDB.assignments`
**Service**：无独立 Service——分工数据经 `core/data-adapter.js`（adapter.assignments）读写，权限联动 `services/auth.js`（syncProjectRoles）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 分工记录总览 | 书记 |

**同源校验点**：

- [ ] 分工记录的 assigneeId 在 PEOPLE 中存在
- [ ] 分工记录的 activityId 在 ACTIVITIES 中存在
- [ ] 分工状态（pending/in_progress/completed）与 data-adapter.js 的状态流转一致

---

## 14. 图片数据

**存储**：`mockDB.imageRecords`（运行时动态创建）
**Service**：`docs/src/core/data-adapter.js`（imageRecords 聚合）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/prop.html | 图片管理（上传/标注/查看） | 宣传委员 |

**同源校验点**：

- [ ] 图片记录的 uploadedBy 在 PEOPLE 中存在
- [ ] 图片关联的 activityId（若有）在 ACTIVITIES 中存在

---

## 15. 文件空间数据

**存储**：`mockDB.fileSpaceRecords`（运行时动态创建）
**Service**：`docs/src/services/mock.js`（通用 CRUD）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/prop.html | 文件管理（经验沉淀/原始文件/宣传素材） | 宣传委员 |

**同源校验点**：

- [ ] 文件记录的 uploadedBy 在 PEOPLE 中存在
- [ ] 文件分类（experience/raw/publicity）与 category 字段一致

---

## 16. 登录与身份门控（2026-08-24 新增，B1-3）

> 认证与页面门控链路（设计权威源：DEPLOYMENT_AUTH_MODEL.md §四 登录门控四层）。核心：登录态由 auth.js 单一判定，页面身份校验防错位。

**存储**：`localStorage gsm1921-login-user`（`{personId, role, tabId}`）+ `sessionStorage gsm1921-tab-id` / `gsm1921-session-snap`
**Service**：`docs/src/services/auth.js` → `AuthStore`（login / devLogin / logout / getCurrentUser）；`docs/src/core/bootstrap.js`（门控执行）

**同源校验点**：

- [ ] 已登录用户访问 login.html → 直接跳转首页（login-entry.js L10-13）
- [ ] 账号密码登录成功后 → 跳转首页，首页顶栏展示对应角色工作台入口（ROLE_PAGE_MAP 角色→页面映射）
- [ ] 工作台页面身份校验：用户访问非其身份对应工作台 → 自动跳转身份对应页面（bootstrap.js 登录快照角色页面 + 内存判定角色页面集合）
- [ ] `?dev=ROLE` 绕过仅限本地 hostname（localhost/127.0.0.1/::1）+ 白名单角色，生产环境拒绝（bootstrap.js DEV_HOSTNAME_WHITELIST / DEV_ROLE_WHITELIST）
- [ ] 登录态多标签页防串扰：getCurrentUser() 校验 tabId，tabId 不匹配回退本标签页快照（auth.js + login-snapshot.js 键名硬同步）
- [ ] CODE_VERSION 代码版本自检：旧 tab 持有旧 ES 模块时自动刷新一次加载新模块（cross-page-state.js isStaleCodeVersion + bootstrap.js）

---

## 跨类别同源校验

> 以下校验点涉及多种数据类别之间的关联一致性。

- [ ] 缺勤→补课→考勤联动：缺勤考勤记录（absent/leave）自动生成补课任务→补课完成后考勤状态变 made_up
- [ ] 通知→待办派生：actionable=true 且 actionRoles 非空的通知自动为各角色派生待办（字段驱动；含"确认/提交/审核"等关键词仅旧表述，实际以字段为准）
- [ ] 活动/专班→待办派生：状态变更（新建/到期/超时）自动派生审核类/归档类待办
- [ ] 活动 assignments → 考察记录：assignments 中 role=organizer/deep 的人员**应有**对应考察记录（业务期望，手工录入；非自动派生）
- [ ] 发展党员候选人 stage ↔ people.js developStage：候选人阶段与人员发展阶段一致
- [ ] 专班成员 personId ↔ people.js：专班 members 数组中 personId 在 PEOPLE 中存在
- [ ] 活动写入→日历/统计联动：书记/组长写入活动后，首页日历和统计卡片同步更新
- [ ] 首页统计卡口径（main-entry `_renderStats`）：本月活动=未归档且属本月 / 活跃专班=active+recruiting / 未读通知=activeOnly 且未读 / 个人考勤率=(present+made_up)/total（90/70 阈值三色）
- [ ] 活动生命周期展示态（deriveActivityLifecycleStatus）：草稿→已发布→进行中→已执行/待归档→已归档（+已取消）；全站徽章统一按此展示，不直接读 status 字面值
- [ ] 按人视图口径（SecretaryOverviewStore.getPersonOverview）：4 角色（org/prop/disc/leader，副书记除外）；todoCount=聚合卡 count 求和；在办活动/专班按职责关系投影（manager=统筹/initiator=发起/member=成员）
- [ ] 前端持久化域 ↔ server 表对账（B5-2 2026-08-24）：mockDB 25 个持久化域 + users ↔ server 26 表（`server/db.js` RESOURCE_TABLES）；resources.js 26 个资源名 ↔ 表名 ↔ 前端快照 payload 键名一一映射
- [ ] 快照写穿边界（B5-1/B5-3 2026-08-24）：全量快照（`_buildSnapshotPayload`）覆盖 25 个持久化域，**不含 users 与 branchDocs**；branchDocs 走 per-item CRUD（POST/PATCH/DELETE `/api/v1/branchDocs`）且仅支委可写（COMMISSIONER_WRITE）——**严禁将 branchDocs 加入快照 payload**，否则 references.js 本地缓存与 server 会产生覆盖竞态
- [ ] 聚合域存储模式（B5 对账 2026-08-24）：actSubRecords/tfSubRecords/mailboxConfig 服务端以「__root__ 单行」存储（`{id:'__root__', body:<原对象>}`），init() 拉取解包、快照写穿包装，round-trip 对称

---

# 手动检查清单（浏览器实测）

> 本章收录**电脑自动化检查难以覆盖、需人工浏览器实测**的检查项。按 URL 逐条实测，勾选验证结果。
> 背景：T-235 首页跳转直达（J1/J2/J3/J4）已实施完毕，AI 冒烟验证 4/8 用例 PASS，其余 4 项修复后需人工复核（2026-08-09 搁置浏览器自动化验证，转人工）。

## T-235 首页跳转直达（2026-08-09 追加）

> 检查方式：按角色登录后，直接访问下列带参数 URL，观察是否直达目标 tab + 目标条目高亮 + 高亮约 3 秒后自动褪去。
> 通用预期：① 落在目标 tab（不是默认「待办」）；② URL 参数被消费（地址栏参数消失）；③ 目标条目有蓝色高亮且自动褪去。

| # | 角色 | 访问 URL | 预期行为 | 第2轮冒烟结果 | 第3轮实测（2026-08-24 Playwright） |
|---|------|----------|----------|---------------|---------------|
| 1 | 书记 | `/workspace/secretary.html?activityId=act-15` | 落「活动管理」tab + 月份切到 2026-06 + 详情面板打开 act-15「6月共建」 + 日历条目高亮褪去 | ❌ 修复后待人工复核（原死循环已修） | ✅ PASS（tab/月份/详情/参数消费） |
| 2 | 书记 | `/workspace/secretary.html?taskforceId=tf-001` | 落「专班查看」tab + tf-001 卡片高亮褪去（不得被「待办」内容覆盖） | ❌ 修复后待人工复核（原懒加载竞态已修） | ✅ PASS（tab/高亮） |
| 3 | 组织委员 | `/workspace/org.html?activityId=act-15` | 落「活动查看」tab + 月份切到 2026-06 + 详情面板打开 act-15 + 日历条目高亮褪去 | ❌ 修复后待人工复核（原月份未跟随已修） | ✅ PASS（tab/详情） |
| 4 | 组织委员 | `/workspace/org.html?taskforceId=tf-002` | 落「专班管理」tab + tf-002 卡片高亮 + 详情展开 | ✅ PASS | ✅ PASS（卡片存在+高亮） |
| 5 | 宣传委员 | `/workspace/prop.html?activityId=act-1` | 落「项目看板」tab + act-1 看板卡片高亮褪去 | ✅ PASS | ✅ PASS（卡片高亮） |
| 6 | 纪检委员 | `/workspace/disc.html?taskforceId=tf-001` | 落「专班查看」tab + tf-001 卡片高亮褪去 | ✅ PASS | ✅ PASS（高亮） |
| 7 | 党小组组长 | `/workspace/leader.html?activityId=act-2` | 落「活动管理」tab + act-2 详情展开 + 条目高亮褪去（注：act-1 属 p3 bottom-up，组长不可见属正常权限） | ❌ 修复后待人工复核（原 SignupStore 未导入已修，改用 act-2） | ✅ PASS（条目存在+高亮） |
| 8 | 访客 | `/workspace/visitor.html?activityId=act-1` | 落「活动动态」tab + act-1 条目高亮**自动褪去**（修复"一直亮着"） | ✅ PASS | ✅ PASS（条目存在+高亮+褪去） |

> **2026-08-24 第 3 轮说明（T-280 B1-2/B1-5）**：8 用例 + 附加 4 项全部浏览器实测 PASS（34/34，见 `server/test/t235-browser-regression.mjs`）。
> 实测中发现并修复 B1-5 缺陷：URL 直达高亮原被 `loadWorkspaceData` 二次 setState 重渲染冲掉（实际可见仅 ~300ms），已按方案 A 修复——
> 各工作台入口导航落点后 3 秒条件抑制当前 tab 重渲染（仅当导航目标已在 DOM 时抑制，目标缺失放行延迟数据补渲染），高亮目标存活至抑制窗口结束，一次性定位改为轮询定位。

### 附加检查项

- [ ] **view=activities 参数**：`/workspace/secretary.html?view=activities` 落「活动管理」tab；`/workspace/org.html?view=activities` 落「活动查看」tab；其余角色同理
- [ ] **首页日历条目点击**：首页日历中点击任一活动条目 → 跳转工作台并直达该活动（与活动列表卡片行为一致，J3）
- [ ] **首页专班卡片点击**：首页招募区点击专班卡片 → 跳转工作台并直达该专班（J2）
- [ ] **首页活动列表卡片点击**：点击「查看更多」外的活动卡片 → 跳转工作台直达该活动（J1）
- [ ] **高亮褪去一致性**：所有直达场景高亮均为约 3 秒自动褪去，无一例"一直亮着"

## T-280-B1 待办/通知直达跳转（2026-08-24 新增，B1-4）

> 检查方式：登录各角色后进入「待办」tab，点击通知类/审核类待办的行动按钮或聚合卡「处理」按钮，观察是否直达对应处理页/详情页。
> 背景：最小三成本 / 高频零跳转理念落地——待办行动按钮直达处理界面，减少中间跳转（DESIGN_SYSTEM.md 原则10）。
> **2026-08-24 浏览器实测（`server/test/t280-b1-browser-regression.mjs`）：29/29 全过**——7 条全部代码化断言验证（URL / tab 激活态 / 详情面板 DOM）。实测修复 2 缺陷：
> ① leader todo-tab 无 actionKey 级 tabMap → `review-submit` 复盘待办点「去提交」误跳考勤上传，已对齐 disc 的 actionKey 级映射；
> ② 赋权待办聚合对象无 sourceId + 懒加载 tab 渲染异步 → 同步 querySelector 找不到活动条目、直达详情失效，已改为 items[0] 取 sourceId + 以「详情面板打开」为完成条件的轮询点击。

- [x] **通知阅读待办**：点击「去阅读」→ 跳转 `notice.html?id=xxx` 打开对应通知详情（各角色 todo-tab 聚合时取首条 noticeId）——实测：leader 构造 actionable 通知 → 按钮「去阅读」→ URL=notice.html?id=ntc-b1test ✅
- [x] **报名审核待办**（组织/组长）：点击「去审核」→ 跳转 `activity.html?id=xxx` 或 `taskforce.html?id=xxx`（sourceId 以 tf- 前缀判定专班）——实测：书记真实数据 signup-review→taskforce.html?id=tf-005；组织构造活动报名→activity.html?id=act-15 ✅
- [x] **组长赋权待办**：点击「去赋权」→ 切到「活动管理」tab 并直达该活动详情内联编辑（≤2 跳，T-190 兜底）——实测：聚合卡「处理」→ write tab 激活 + act-2 详情面板自动打开 ✅
- [x] **组长考勤上传待办**：点击「去提交」→ 切到「考勤上传」tab——实测：构造 submit 待办 → attendance tab 激活 ✅
- [x] **组长复盘待办**：点击「去提交」→ 切到「复盘提交」tab——实测：构造 review-submit 待办 → review tab 激活（修复①后）✅
- [x] **书记通知发布 tab**：点击通知条目 → 跳转 `notice.html?id=xxx` 直达详情——实测：notification tab 点击行 → notice.html?id=notice-110（id 与行一致）✅
- [x] **聚合卡直达一致性**：聚合卡「处理」按钮与明细待办行动按钮跳转行为一致——实测：同 actionKey 聚合卡「处理」→ 与明细「去赋权」同一处理函数（onActionTodo → _handleTodoAction），行为一致 ✅

## T-280-B5 前后端数据模型对账（2026-08-24 新增，B5-2）

> 检查方式：对照 `server/db.js` / `server/routes/resources.js` / `server/seed.js` 与前端 `data-adapter.js` / `mock-adapter.js` 的持久化域，逐表核对映射与写穿边界。
> 背景：T-280 B5 前后端对账——server 26 表（users + 25 业务）与前端 mockDB 25 个持久化域一一映射；snapshot 全量写穿与 per-item CRUD 两条写路径边界清晰。
> **2026-08-24 实测（`server/test/t280-b5-api-regression.mjs`）：6/6 全过**——API 级代码断言（无浏览器依赖）。实测说明：V2/V3 因 server seed 仅在空库执行（db 持久化），archiveRecords 等「初始有种子」与 attendances 等「初始为空」改代码级断言（读 seed.js/mock/seed.js 源码印证）；V4 验证 login 路由在 `/api/v1/auth/login`。

- [x] **表↔域映射**：26 资源 list 全部返回 200+数组（`resources.js` RESOURCE_TABLES 26 名全通）✅
- [x] **seed 复用**：运行时 users 50/taskforces 8/activities 29+ 基线 + 代码级确认 `mock/seed.js` SEED_ARCHIVE_RECORDS/SEED_SIGNUPS 常量与 `server/seed.js` 的 archive_records/signups 注入 ✅
- [x] **空表回退**：代码级确认 `server/seed.js` 仅 seed 8 集合、**不覆盖 attendances/inspections/todos**（前端 init 空表回退本地种子的必要性印证；运行时回退行为由 B4/b3-1/t235 浏览器验证）✅
- [x] **branchDocs 写权限**：未登录 POST→401；非支委（leader p1）POST→403；支委（secretary p13）POST→201 + 删除 204（COMMISSIONER_WRITE 强制支委身份）✅
- [x] **聚合域 round-trip**：快照写穿 `[{id:'__root__', body}]` → 读回 `__root__` 单行 + body 深比较一致 → 清理写回空 ✅
- [x] **auth 测试**：`server/test` 全量测试通过（2026-08-24：21/21，含 b3-1 回写 5 项 + t235 直达 34 项 + m4 能力注册 31 项 + t280-b1 待办直达 29 项 + t280-b5 对账 6 项），含 e2e-login 回归

## T223 活动排序统一（2026-08-09 追加）

> 背景：曾发现党小组组长「活动写入」的已有关联活动按时间正序排列（旧在前），违反 T223「未完成在前、已完成在后，组内按 date 降序（新者在前）」统一基准。已修复 `_renderWriteContent` + 宣传委员「关联活动」下拉。
> 2026-08-09 彻查补充（指令"必须彻查"）：全仓 53 处排序点逐一排查，新增修复 4 处——组长考勤上传「选择活动」下拉、组长考察上传「选择具体来源」下拉、组长复盘分桶列表、专班查看组件桶内排序，全部按 T223 基准落地。
> 通用预期：所有活动/专班列表均为「未完成在前、已完成在后，组内新者在前」；活动按 date 降序、专班按 createdAt 降序。

- [ ] **党小组组长「活动写入」已有关联活动**：未完成（草稿/已发布/进行中）在前、已完成（已执行/已取消）在后，组内按 date 降序（新者在前）
- [ ] **党小组组长「考勤上传」选择活动下拉**：选项按 date 降序（新者在前）（ws-leader-entry L994-999，2026-08-09 修复）
- [ ] **党小组组长「考察上传」选择具体来源下拉**：活动选项按 date 降序（ws-leader-entry L1238-1242，2026-08-09 修复）
- [ ] **党小组组长「复盘提交」待复盘/已复盘分桶**：桶内按 date 降序（ws-leader-entry L1459-1465，2026-08-09 修复）
- [ ] **专班查看组件（书记/组长「专班查看」tab）**：各状态桶内按 createdAt 降序（taskforce-view.js，2026-08-09 修复）
- [ ] **宣传委员「上传宣传材料」关联活动下拉**：选项按 date 降序（新者在前）
- [ ] **首页活动列表/日历**：未完成在前、已完成在后，组内 date 降序（main-entry L293-298 / calendar.js L352）
- [ ] **访客「活动动态」**：date 降序且仅显示未取消未归档（ws-visitor-entry L324）
- [ ] **各角色项目/专班看板**：宣传/组织委员看板桶内新者在前（ws-prop L369-383 / ws-org L92-93）
- [ ] **书记「专班总览」**：专班按 createdAt 降序（新者在前）

## 编辑完整性校验（T-283 新增，2026-08-27）

> 背景：T-283 功能开发中多次出现「多轮 Edit 导致误删/重复」系统性损坏——重复声明（SyntaxError）、函数/绑定被误删（ReferenceError 或点击静默失效）、声明误删。书记指令：此类共性问题须成为 checklist 重要部分并全局检查。机制与判例详见 [KNOWN_PITFALLS §14.1](../../../content/05_ai_coding/KNOWN_PITFALLS.md)（注：相对路径以仓库根为准）。

- [ ] **GetDiagnostics 全仓零错误**（每次多文件修改后的最低检查：语法错误/未定义引用/重复声明）
- [ ] **模块加载完整性审计**：`node --test server/test/edit-integrity-audit.mjs`（浏览器 import 全部 docs/src 模块，86/86 通过；已入 npm test 回归）
- [ ] **新增功能浏览器回归**：功能路径实测（如三会一课议程：创建写入→详情显示→行内编辑→保存→持久化，server/test/agenda-flow-audit.mjs A1-A3）
- [ ] **点击成本回归**：进入工作台→可执行事项 ≤2 跳；高频操作点击次数达标（server/test/click-cost-audit.mjs C1-C3）
- [ ] **数据完整性回归**：Mock 数据引用/字段/id/类型 + 生命周期一致性（server/test/mock-integrity-audit.mjs M1-M2）
- [ ] **删除性 Edit 复核**：删除代码块后 Read 复核邻近区域，确认无连带误删

## 链接完整性校验（T-284 新增，2026-08-27）

> 书记指令「所有链接的审查，每一个都要查」。四层法：静态存在 ≠ 跳转合理。全量审计脚本 `server/test/link-audit.mjs`（L1-L4，已入 npm test 回归）。

- [ ] **L1 静态链接**：全部 HTML href/src 目标文件存在 + `#锚点` 有效（含 `<base href>` 解析与 `?v=` 剥离）
- [ ] **L2 JS 导航**：`location.href`/`replace`/`assign` 目标存在（模板插值动态跳转抽取 `.html` 字面量片段校验）
- [ ] **L3 HTTP 层**：自包含 server 下每个链接 200 + 工作台门控可达
- [ ] **L4 登录态逻辑**：首页链接登录态感知——已登录直达角色工作台 / 未登录直达 login.html（不出现「公开页→工作台→门控踢→login」绕路）；登录页须有「返回主页」闭环
- [ ] **版本戳同步**：测试内嵌 import 的 `?v=` 戳（evaluate 字符串内）bump 脚本不覆盖，bump 后须 grep 检查 `server/test` 残留旧戳




