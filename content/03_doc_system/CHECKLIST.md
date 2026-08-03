---
title: "数据同源一致性校验手册"
type: checklist
role: "[用户]+[AI]"
last_updated: "2026-07-31"
status: active
related_files: [content/04_web_design/DATA_ARCHITECTURE.md, content/03_doc_system/ARCHITECTURE.md, CLAUDE.md]
---

# 数据同源一致性校验手册

> 本文档供支部成员与 AI 协作使用，是工程质检流程。按数据类别逐步检查：**如果在某处看到了某数据，可以预期在其他地方看到同源的数据。**
> 书记原话（2026-05-23）："按操作步骤逐步检查——如果在某处看到了某数据，可以预期在其他地方看到同源的数据。"

---

## 使用说明

> 本手册按数据类别组织，每种数据列出存储源、展示页面、同源校验点。
> 校验方式：打开任意校验点涉及的页面，确认数据一致。

---

## 1. 人员数据

**存储**：`docs/src/mock/people.js` → `PEOPLE` 常量（27 条记录，p1~p27）
**运行时**：`mockDB.people`（由 `seed.js` 注入）
**登录映射**：`docs/src/mock/accounts.js` → `MOCK_ACCOUNTS`（11 条，studentId ↔ personId）

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
- [ ] 各工作台人员选择器中的列表 = PEOPLE 中 developStage='正式党员' 的成员
- [ ] 人员发展阶段在各页面中一致（入党申请人/积极分子/发展对象/预备党员/正式党员），与 people.js 定义相同
- [ ] 登录页输入 accounts.js 中的学号+密码 → 成功登录后跳转对应角色工作台
- [ ] 书记工作台赋权管理 tab 中常设角色标签（书记/支委/组长）= PEOPLE 中 role 字段 + AuthStore 赋权记录
- [ ] 发展党员追踪候选人（c1~c5）的 personId 在 PEOPLE 中存在，且 stage 与 developStage 一致

---

## 2. 活动数据

**存储**：`docs/src/mock/activities.js` → `ACTIVITIES` 常量（25 条记录，act-1~act-25）
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
| about.html | 权限体系说明（谁可创建活动） | 全部 |

**同源校验点**：

- [ ] 首页日历中的活动数量 = ACTIVITIES 中未取消的记录数（act-20 为 cancelled 不显示）
- [ ] 书记工作台统计卡片的"活动总数" = ACTIVITIES 中非 cancelled 的记录数
- [ ] 书记工作台统计卡片的"品牌标签"数 = ACTIVITIES 中 isBrand=true 的记录数（act-3/act-10/act-12/act-16/act-21/act-25，共 6 条）
- [ ] 活动状态在各页面中一致：draft/published/ongoing/completed/cancelled
- [ ] 品牌活动在日历/看板中标有品牌标记（isBrand=true 的活动）
- [ ] 活动的 organizer 字段（如 p3=王五）在首页和各工作台中一致
- [ ] about.html 中"创建活动仅限党支书和党小组组长"= auth.js ROLE_PERMISSIONS 中的 create_activity 权限

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

**存储**：`docs/src/mock/attendance.js` → `ATTENDANCE_RECORDS` 常量（43 条记录，att1~att43）
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
- [ ] 已补课考勤记录（status='made_up'）= 补课任务中 status='completed' 的记录对应（att27↔mk3，att14↔mk5）
- [ ] 组织生活会（act-19）考勤记录含 studentId/developStage/partyGroup 字段
- [ ] 缺勤考勤记录中 overdue=true 的（att10/att33）应在补课任务中有对应 pending 项

---

## 5. 考察数据

**存储**：`docs/src/mock/inspection.js` → `INSPECTION_RECORDS` 常量（12 条记录，insp-1~insp-12）
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
- [ ] 某人的考察记录数量 = 该人作为 organize/deep 参与的活动/专班数
- [ ] 考察记录字段语义（P1-5 固化）：考察内容入 `content` 字段，`role` 存角色职责标签，禁止把内容文本塞进 role
- [ ] 组长/组织委员录入的考察子记录同步写入正式考察库（P0-2 固化），同一数据仅一套正式存储

---

## 6. 通知数据

**存储**：`docs/src/mock/notices.js` → `MOCK_NOTICES` 常量（10 条记录，notice-001~notice-107）
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

- [ ] 通知类待办（TodoCategory.NOTICE）= 未读通知中含行动性关键词的记录派生
- [ ] 审核类待办（TodoCategory.REVIEW）= 待审核的考勤/考察/复盘记录派生
- [ ] 赋权类待办（TodoCategory.AUTH）= 书记待赋权的活动/专班记录派生
- [ ] 各角色工作台的待办列表仅含与该角色相关的待办
- [ ] 待办状态流转：pending → in_progress → completed（或 expired）

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
| workspace/org-commissioner.html | 专班详情内联编辑成员角色（保存走 syncProjectRoles） | 组织委员 |

**同源校验点**：

- [ ] 书记工作台赋权管理 tab 的「已赋权记录」= 审计快照 `sop_org_os_auth_audit`
- [ ] 活动/专班项目角色（organizer/deep）主源 = `activity.assignments` / `taskforce.members`，新建数据在主源可查
- [ ] 赋权记录中 targetPersonId 在 PEOPLE 中存在
- [ ] 被赋权角色（organizer/deep/leader）在 auth.js AUTHORIZE_CHAIN 中有赋权链定义
- [ ] 赋权后，被赋权者切换到管理模式时 AuthStore.canDo() 返回 true
- [ ] 撤销/解散专班回收赋权后：主源角色被移除 + 快照追加 revoke，被赋权者退回只读模式
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

## 10. 交接数据

**存储**：`docs/src/mock/seed.js` → `SEED_HANDOVERS`（2 条种子数据）
**运行时**：`mockDB.handovers`
**Service**：`docs/src/services/handover.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 交接记录汇总 | 纪检委员 |

**同源校验点**：

- [ ] 交接记录的 fromPerson/toPerson 在 PEOPLE 中存在
- [ ] 交接记录的 activityId 在 ACTIVITIES 中存在
- [ ] 交接事项完成状态与 handover.js completeHandoverItem() 操作一致

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
- [ ] 已完成补课（mk3/mk5 status='completed'）对应的考勤记录 status='made_up'（att27/att14）
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
- [ ] 复盘提交后持久化（P1-4 固化）：刷新页面后记录仍在，书记「复盘完成率」据此统计

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
**Service**：`docs/src/services/image.js`

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

## 跨类别同源校验

> 以下校验点涉及多种数据类别之间的关联一致性。

- [ ] 缺勤→补课→考勤联动：缺勤考勤记录（absent/leave）自动生成补课任务→补课完成后考勤状态变 made_up
- [ ] 通知→待办派生：行动性通知（含"确认""提交""审核"等关键词）自动派生待办任务
- [ ] 活动/专班→待办派生：状态变更（新建/到期/超时）自动派生审核类/归档类待办
- [ ] 活动 assignments → 考察记录：assignments 中 role=organizer/deep 的人员应有对应考察记录
- [ ] 发展党员候选人 stage ↔ people.js developStage：候选人阶段与人员发展阶段一致
- [ ] 专班成员 personId ↔ people.js：专班 members 数组中 personId 在 PEOPLE 中存在
- [ ] 活动写入→日历/统计联动：书记/组长写入活动后，首页日历和统计卡片同步更新
