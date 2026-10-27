---
title: "数据结构与派生口径审查（第九轮 9A）"
type: audit_report
role: "[AI]"
last_updated: "2026-10-22"
status: active
round: 9
---

# 数据结构与派生口径审查（第九轮 9A）

> **审查性质**：只读诊断。除本报告外，未新增或修改任何产品代码、测试、schema、种子；未运行改数据的命令，未提交。
> **审查基线**：`git HEAD = be631dd1b`（审查开始时工作区干净）。**审查期间检测到 Task 4 修复草稿正被并行写入工作区（未提交）**：`docs/src/data/activity-workgroup-sync.js`（新）、`mock-adapter.js`、`services/core/mock.js`、`services/activity/taskforce.js`、`services/activity/signup.js`、`data-adapter.js`、`components/dashboard/taskforce-list.js`、`server/routes/resources/index.js`、`server/routes/resources/workgroup-routes.js`、`data/seed-manifest.js`、`CLAUDE.md`、`server/test/seed-drift.test.mjs`。本报告行号仍按 **HEAD** 取证（审查开始时与 HEAD 一致）；§四 每条另注「工作区草稿状态」，避免把未提交修复当成已收口，也避免重复开单。
> **范围**：`docs/src/core/domain/**`、`docs/src/services/**`、`docs/src/data/**`、`docs/src/entries/**`、`docs/src/components/**`、`server/**`（`db.js` / `routes` / `seed*.js`），排除 `node_modules` 与 `server/test`（仅作守卫名录引用）。
> **行号基准**：2026-10-22 当前 HEAD（`be631dd1b`，批次 502 之后）。所有 `文件:行号` 均为本轮逐条 Read/Grep 结果。
> **方法**：先读 R7 数据审查与 R3 全栈审查建立「已消解 / 仍存在」基线 → 对每条旧结论回读当前 HEAD → 以「同一业务事实只有一个权威源」为判据，沿写口→存储→读口→权限门→支部归属五段核对 → 对 10 个实体做 typedef / DATA_MODEL / mock 种子 / server 表与迁移 / 前端读链五层抽查 → 只列仍存在项，已修项标已消解、不重复建议。

## 〇、结论摘要

- **P1 级不一致 5 条**（均为 HEAD 基线结论，见 §四；其中 3 条工作区已有未提交修复草稿）：
  1. 活动归档后工作组仍为 `active`，成员 / 授权 / 任务 / 产出仍可写（工作区草稿已同步）；
  2. 专班成员移出会连同 `taskforces.members[].contributions` 整段丢失（工作区仅修了「加成员保留」，**移出仍丢**）；
  3. 专班报名审核只写 `taskforces.members`，不写 `workgroup_members`（工作区草稿已改走主源）；
  4. Todo 在模型层没有 `branchId`，写口靠服务端临时补、mock 不补、读口回落 `br-b1`（工作区未动）；
  5. `workgroup_tasks` / `workgroup_outputs` 不在 `init()` 拉取集合内，首屏恒为 0（工作区草稿已补装载与「加载中」）。
- **结构性问题不在本轮修**：Todo `branchId` v11、列表分页与真实列索引、JSON 宽表拆分——只出方案（§五），全部标注「本轮不实施」。
- **R7 已修项**：R7-01 / 03 / 14 / 16 / 17 / 19 / 20 / 29 在当前 HEAD 已消解，本报告不复述、不建议。
- **一致性较好的面**：账号重命名（学号即主键）读写同源；通知已读逐人 `reads[]` 且快照写门只允许追加本人；考勤「冻结应到 ∪ 实际到场」分母口径已统一。

---

## 一、权威源 / 派生口径矩阵（16 个业务事实）

> 列口径：**写口**给「函数/路由 ＋ 文件:行号」；**读口**给主要消费点；**派生 or 存储** 指该事实是落库真值、还是每次现算；**跨支部归属** 指 `branchId` 从哪里来（含回落规则）；**现有守卫** 指当前已存在的测试/迁移/写门。

| 事实 | 权威表与字段 | 写口（函数/路由，文件:行号） | 读口 | 派生 or 存储 | 跨支部归属（branchId 来源） | 权限门 | 现有守卫 |
|---|---|---|---|---|---|---|---|
| M1 活动主体与组织落点 | `activities` 行：`status / organizingScope / hostGroupId / recruitmentScope / crossGroupCoordinatorId / branchId`（`domain.js:22-46`；`db.js:13-14,67`） | `POST /activities`（`server/routes/resources/index.js:237,326-335,352-354`）；`createActivityWorkgroup`（`workgroup-routes.js:445-486`）；mock `MockAdapter.activities.create`（`mock-adapter.js:902-985`）；v8/v10 迁移（`db.js:407-461,476-593`） | `services/activity/activity.js:15-24`；活动详情 `entries/pages/activity-entry.js:251,720`；支部解析 `branch-scope.js:103-115` | 存储（读侧 `normalizeOrganizingScope` 归一，`constants.js`） | 创建时取 `req.actor.branchId` 或行内 `branchId`（`index.js:327`）；创建后不可改（`index.js:589-591`）；历史缺字段回落 `DEFAULT_BRANCH_ID`（`branch-scope.js:43-45`） | `activityCreationDeny`（`workgroup-routes.js:201-228`）；`_assertActivityWrite`（`gates.js:133-139`）；`activityOperationAllowed`（`workgroup-routes.js:254-262`） | `activity-creation-transaction` / `activity-party-group-assignment` / `branch-id-literal-guard` / `mock-multi-branch` |
| M2 活动 ↔ 工作组镜像 | 双写：`activities.name/status/organizingScope/hostGroupId/recruitmentScope` ↔ `workgroups.name/status/organizingScope/hostGroupId/recruitmentScope/crossGroupCoordinatorId`（`domain.js:63-76`；DATA_MODEL §2.3.1 `DATA_MODEL.md:264`） | 建：`createActivityWorkgroup`（`workgroup-routes.js:445-486`）与 `mock-adapter.js:955-964`；改：仅「历史待补承办组」回写落点（`index.js:596-611`）；删：级联（`index.js:1379-1392`、`mock-adapter.js:1029-1038`）；**归档无同步**（`index.js:781-799`、`services/core/mock.js:262-289`） | `activity-entry.js:251,720`；`components/record/taskforce-view.js:188`；`taskforce-list.js:149`；权限读 `services/core/auth.js:612` | 存储 + 复制（镜像） | `workgroups.branchId` 随 `activity.branchId`（`workgroup-routes.js:448`） | 工作组写门只看 `workgroup.status`（`workgroup-routes.js:44-54`），**不读活动 archived** | 仅 `activity-creation-transaction` 断言「建活动即建组」；无「归档同步」断言 |
| M3 活动工作组成员 | **名义主源** `workgroup_members`（DATA_MODEL 明示 `DATA_MODEL.md:265,298`）；**运行镜像** `activities.assignments`（`DATA_MODEL.md:67,296`） | 语义端点 `PUT/POST/DELETE /workgroups/:id/members`（`workgroup-routes.js:556-706,707-761,762-797`）；建活动时 `validAssignments` + `createActivityWorkgroup`（`workgroup-routes.js:416-443,469`）；报名通过活动侧经 `syncProjectRoles`（`services/activity/signup.js:177-186` → `services/core/auth.js:733-802`） | `workgroup-routes.js:547-555`（GET 成员）；`auth.js:612`；活动详情读 `activities.assignments` | 存储（主源）+ 镜像 | `workgroup_members.branchId = workgroup.branchId`（`workgroup-routes.js:655`）；成员本人须同支部（`:582`） | `canManageWorkgroup`（`workgroup-routes.js:189-199`）；`hasWorkgroupPermission`（`:181-187`）；`sendWorkgroupWriteDeny`（`:49-54`） | `workgroup-member-semantics` / `workgroup-api` / `workgroup-member-grant-revoke` |
| M4 工作组任务与产出 | `workgroup_tasks` / `workgroup_outputs`（DATA_MODEL §2.3.1 `DATA_MODEL.md:267-268`）；`db.js:180-182`（v3 建表） | `POST/PATCH /workgroups/:id/tasks`（`workgroup-routes.js:911-943,944-969`）；`POST /workgroups/:id/outputs`（`:979-1013`）；mock `mock-adapter.js:2612-2636,2638-2663` | `taskforce-list.js:83`；`activity-entry.js:759-760`；`services/activity/taskforce.js:43-45,254-282`；首页 `components/dashboard/taskforce-list.js:149` | 存储 | `branchId: workgroup.branchId`（`workgroup-routes.js:935,1006`） | `canManageWorkgroup` / `workgroup.members.manage` / `task.manage` / `output.submit`（`workgroup-routes.js:914,952,982`）；`sendWorkgroupWriteDeny` | `workgroup-api`；**无「首屏装载」断言**（见 §四 P1-5） |
| M5 工作组授权 | `workgroup_grants`（`domain.js:212-224`；`DATA_MODEL.md:266`） | `PUT /workgroups/:id/members` 内重建（`workgroup-routes.js:663-690`）；`POST /grants`、`POST /grants/:id/revoke`（`:862-900`） | `services/core/auth.js:781-789`（权限判定）；`workgroup-routes.js:181-187` | 存储（独立授权，不并入成员） | `workgroup_grants.branchId = workgroup.branchId`（`workgroup-routes.js:685`） | `canManageWorkgroup`（`workgroup-routes.js:862,894`） | `workgroup-member-grant-revoke` / `permission-gate` |
| M6 专班主体、成员与贡献 | `taskforces`（`domain.js:48-60`；DATA_MODEL §2.3 `DATA_MODEL.md:239-258`）；成员/贡献仅存 `taskforces.members[].contributions`（`DATA_MODEL.md:297`）；`workgroup_members` 为并行主源但贡献无对应字段 | 创建 `POST /taskforces`（`index.js:336-341,355-357`）+ `createTaskforceWorkgroup`（`workgroup-routes.js:488-518`）；报名审核 `signup.js:187-192` → `taskforce.js:377-382`（**只写 members**）；贡献 `taskforce.js:396-416`；核验 `taskforce.js:594-605` | `taskforce.js:418`；`components/record/taskforce-view.js:188`；`entries/tabs/org/taskforce-tab.js` | 存储（`members/contributions` 是唯一落点） | 建时 `req.actor.branchId`（`index.js:337`），mock 缺省 `DEFAULT_BRANCH_ID`（`taskforce.js:169`） | `POST /taskforces` 走活动写门同族 `writeAuth`（`index.js:237`）+ `createTaskforceWorkgroup` 同支部校验；贡献校验成员身份（`taskforce.js:402-403`） | `taskforce-lifecycle` / `cross-group-recruitment` / `workgroup-member-semantics` |
| M7 考勤事实 | `attendances`（`(activityId, personId)` 唯一，`domain.js:226-237`；`DATA_MODEL.md:327-346`） | `saveAttendanceRecords`（`services/activity/attendance.js:44-48`）；`upsertMeetingAttendance`（`:182`）；`appendAttendanceRecords`（`:234`）；服务端 `POST/PATCH /attendances`（`index.js:237,561-576`） | `loadActiveAttendanceRecords`（`attendance.js:34`）；汇总 `:598-750`；纪检矩阵 `entries/tabs/disc/attendance-tab.js` | 存储（`overdue` 仍为存值快照，见 §三-⑦） | 服务端建行时补 `branchId = actor.branchId`（`index.js:342`）；种子无该字段 → 读侧经 `activityId` 反查（`branch-scope.js:111-115`） | `attendanceOperationAllowed`（`workgroup-routes.js:264-289`）；`attendanceWriteDeny`（`:291-298`）；前端 `canUploadAttendance`（`attendance.js:132-158`） | `attendance-batch` / `meeting-attendance-rules` / `attendance-matrix-model` |
| M8 应到名单（三种形态） | ① 现算：`getMeetingRosterIds`（`services/member/roster.js:144-157`，读 `users` 阶段/组/在册）；② 冻结快照：`attendance_rosters.personIds[]`（`DATA_MODEL.md:346`；`db.js:180-181`）；③ 表决快照：`activities.voteConfig.voterIds[]`（`DATA_MODEL.md:71`） | ② `freezeExpectedRosterForActivity`（`attendance.js:70-85`），调用点 `disc/attendance-tab.js:393`、`leader/attendance-tab.js:469`；`PUT /activities/:id/expected-roster`（`workgroup-routes.js:1091-1124`）；③ 创建活动时 `resolveVoterIds`（`vote-config.js:55`） | ② `attendance.js:40-42,598-750`；`attendance-matrix.js:6-16`；③ `vote-config.js:109-115`；`committee.js:97-106` | ① 派生；②③ 存储（创建/首次录入时固化） | ② `attendance_rosters.branchId = activity.branchId`（`workgroup-routes.js:1118`）；③ 随活动 | ② `canFreeze` = 支委 ∪ `attendanceOperationAllowed`（`workgroup-routes.js:1099-1101`）；③ 表决名单门（`committee.js:107-109`） | `attendance-roster-union` / `signup-onsite-roster` / `roster.test` |
| M9 考察 | `inspections`（`domain.js:374-389`；DATA_MODEL §2.5.1 `DATA_MODEL.md:368-390`） | `saveInspectionRecords`（`inspection.js:45`）；上传门 `canUploadInspection`（`:121-131`）；确认 `confirmInspectionRecord`（`:204`）；服务端 `POST/PATCH /inspections`（`index.js:343-344,385-389`） | `loadActiveInspectionRecords`（`:38`）；`inspectionToWide`（`:364`）；纪检/组织屏 | 存储 | 无独立 `branchId`；经 `activityId` / `workgroupId` 反查（`branch-scope.js:111-119`），查不到回落 `DEFAULT_BRANCH`（`:173`） | `INSPECTION_WRITE_ROLES`（`constants.js:274`）、`INSPECTION_CONFIRM_ROLES`（`:275`）；`_inspectionSourceKeyDeny`（`gates.js:524-535`）；`_inspectionDecisionDeny`（`:609`） | `inspection-workgroup-key` / `inspection-write-gate` / `db.js` v5（`:335-359`） |
| M10 通知与已读 | `notices`；已读逐人 `reads: personId[]`（`notice.js:29-38,59-77`）；旧全局 `read` 仅兼容迁移 | `NoticeStore.add`（`notice.js:382-413`）；`markRead`（`:610-627`）；`markAllRead`（`:656-659`）；`sendDirectMessage`（`:744-771`） | `NoticeStore.list/getAll`（`:290`）；`canReadNotice`（`:684`）；服务端读投影 `index.js:1449-1455` | 存储（行内数组） | 种子统一补 `branchId`（`mock/notices.js:183`）；服务端建行走 `branchForNewResource`（`index.js:321-325`） | 快照私有 `_snapshotNoticeWriteDeny`（`gates.js:348-375`）；`_noticeSelfReadChange` 只允许追加本人（`:764-777`）；发布权 `RESOURCE_WRITE_GATE.notices`（`:35`） | `notice-audience` / `notice-message` / `branch-resource-isolation` |
| M11 待办 | `todos`（无 typedef；DATA_MODEL §2.18 `DATA_MODEL.md:810-871` **无 branchId 字段**） | `TodoStore.create`（`todo.js`）；生命周期派生 `LifecycleTodoDeriver`（`todo.js:416-460`）；服务端通用 `POST /todos`（`index.js:237`） | `TodoStore.getByRole`（`todo.js:819-844`）；服务端行级投影 `_canReadTodoRow`（`index.js:150-155,167`） | 派生（通知/活动/专班生命周期派生）+ 存储（落库后即行） | **行内无 branchId**：服务端建行补 actor 支部（`index.js:321-325`）；mock 建行不补（`mock-adapter.js:1297`）；读侧 `resourceBranchId` 查不到父行时回落 `DEFAULT_BRANCH`（`branch-scope.js:157-173`） | 快照写门 `todos: 'todo-row'`（`gates.js:645,684-710`）；`getByRole` 的 personId 过滤（`todo.js:827-833`） | `todo-cross-role-safety` / `todo-role-write-gate` / `todo-domain` |
| M12 成员档案与账号 | `users` 行（`domain.js:239-254`；DATA_MODEL §2.26 `DATA_MODEL.md:1079-1133`）；登录会话 `sessions`（`db.js:47-51`） | 档案 `PATCH /members/:id/profile`（`server/routes/member.js:365-402`）＋ `POST /members`（`:434`）＋ `/members/intake`（`:435`）；改名 `POST /members/:id/account-rename`（`:302-341`）；在册 `POST /members/:id/residence-status`（`:344-359`）；mock 覆盖层 `PersonStore.saveMember`（`person.js:127-133`）；mock 账号 `services/core/accounts.js:78-169` | `PersonStore.getMembers`（`person.js:86-88`）、`getAll`（`:97-103`）；`GET /members/:id/profile`（`member.js:271-285`）；登录 `server/routes/auth.js:23-48` | 存储（服务端 users 为权威；mock 覆盖层 + 本机账号为演示例外） | `users.branchId`；`null` = 待归属（`member.js:263-264`）；所有写口强制本支部 | `PROFILE_FIELDS` 白名单（`member.js:257`，学号已移出）；`ORG_COMMISSIONER_ROLES`（`:434`）；`SECRETARY_AND_DEPUTY_ROLES`（`:344`）；`PARTY_STAFF_ROLES`（`:302`） | `account-rename` / `identity-student-id-guard` / `person-consistency` / `member-persist` |
| M13 支部配置 | `branches.config`（modules / blocks / capabilityPackages / workforce / headerTitle·desc·themePreset / policyOverrides / configChangeHistory） | 前端 `_saveBranchConfig`（`services/branch/branch.js:308-337`）及 `updateBranchModules/CapabilityPackages/Workforce/Org`（`:443-471,485-489,934`）；服务端 `PATCH /branches/:id/config`（`index.js:892-1070`）、回滚 `:1076` | `getBranchById`（`branch.js:26-34`）；`getTabPolicy`（`:77-87`）；页眉 `components/shell/header.js` | 存储（单行 JSON） | 行主键 `branches.id`；写入角色须同支部（`index.js:899-912`） | `party-staff` / 本支部现任支书 / 副支书（`index.js:899-912`）；域负责人仅本域 `policyOverrides`（`:904-933`） | `branch-config-audit` / `policy-config` / `branch-resource-isolation` |
| M14 周期归档 | `periodic_archive_submissions`（`domain.js:357-375`；DATA_MODEL §2.16.2 `DATA_MODEL.md:745-769`） | 前端报送 `entries/tabs/prop/weekly-tab.js:194-231`（含 `attachArchivePolicySnapshot`，`services/governance/periodic-archive.js:65-80`）；支书审核 `secretary-overview.js:437-450`；服务端 `POST /periodicArchives` 覆盖 `branchId` 与策略快照（`index.js:345-350`） | `secretary-overview.js:427-450`；`entries/tabs/prop/weekly-tab.js:138-141` | 存储（含策略快照） | 前端取当前登录人支部（`weekly-tab.js:162`）；服务端 `req.actor.branchId`（`index.js:345`）——两处各写一次 | `periodicArchives: 'committee-only'`（`gates.js:654`）；审核走前端 `reviewPeriodicArchive` | `periodic-archive-api` / `periodic-archive-scope` / `periodic-archive-policy` |
| M15 成员变更（阶段 / 在册 / 移出） | `users.developStage` / `residenceStatus`；流程队列 `member_confirmations`（语义表）与 `member_change_requests`（议程派生） | 申请 `submitMemberChange`（`member-confirmation.js:256-321`）；确认 `decideConfirmation` → `_applyApproved`（`:434-457,468-505`）；服务端 `POST /members/:id/develop-stage`（`member.js:211`）、`residence-status`（`:344`）、`transfer-out`（`:438`）、`undo-transfer-out`（`:459`）、变更申请 `POST /member-change-requests`（`:108-140`） | `listPendingConfirmations`（`:611`）；`users` 读口（`index.js:157-175`，剔除 `transferOut`）；名册 `PersonStore.getMembers` | 存储 + 派生（阶段起始日 `deriveDevelopStageSince`，`person.js:284-293`） | 服务端申请取活动支部（`member.js:122`）；`member_confirmations` 经人员反查（`branch-scope.js:129-132`） | `requireCommissioner`（`member.js:108`）；`ORG_COMMISSIONER_ROLES`（`:143`）；`SECRETARY_AND_DEPUTY_ROLES`（`:166,211,344`）；`TRANSFER_OUT_ROLES`（`:262`） | `member-change-flow` / `member-change-cross-session` / `member-confirmation` / `member-flow` |
| M16 表决 | `agenda_votes`（`personId` + `tally`；`domain.js:519-520`；`committee.js:130-158`）；`activities.voteConfig` / `votesLocked` / `voteTally` | 表态 `committee-vote.js:169,189` → `POST /agenda-votes`（`committee.js:58-183`）；锁定 `POST /agenda-votes/lock`（`:185`）；活动端 `voteConfig` 由创建/编辑写入（`index.js:507-510`；`calendar-tab.js:1620-1640`） | `committee-vote.js:142-158`；`entries/pages/party-committee-meeting-entry.js`；`today-tab.js:309` | 存储（无记名两段式：参与记录 + 计数行，逐人选项不落库） | 表态行 `branchId = activity.branchId`（`committee.js:142,155`） | 应到名单门（`committee.js:90-109`）；锁定门（`:118-120`）；无记名强制（`:121-129`）；`agendaVotes: 'vote-row'`（`gates.js:658`） | `agenda-votes` / `agenda-quorum` / `agenda-closure-core` |

---

## 二、跨层抽查矩阵（10 个实体 × 5 层）

> 图例：✓ 一致；**差异** 同一事实两层口径不同；**缺** 该层没有对应定义/数据。

| 实体 | typedef（`core/domain`） | DATA_MODEL | mock 种子 | server 表与迁移 | 前端读链 | 结论 |
|---|---|---|---|---|---|---|
| 活动 `activities` | ✓ `domain.js:22-46`（含 `workgroupId` / 落点 / 招募字段） | ✓ §2.1 `DATA_MODEL.md:26-74`；指针行号过期（写 `domain.js#L11-L33`，实为 22-46） | ✓ `mock/activities.js`（35 场） | ✓ `db.js:13-14`；v3/v8/v10（`:244-315,407-461,476-593`） | ✓ `activity.js:15-24`、`activity-entry.js:251` | 可用；文档指针为 P3 |
| 工作组 `workgroups` | ✓ `domain.js:63-76` | ✓ §2.3.1 `DATA_MODEL.md:260-301` | ✓ 派生（`workgroup-seed-sync.js`，`seed-manifest.js:420-435`） | ✓ v3 `db.js:244-315,180-182` | ✓ `activity-entry.js:251,720`；`auth.js:612` | 结构一致；镜像同步缺口见 M2 / §四 P1-1 |
| 工作组成员 `workgroup_members` | ✓ `domain.js:200-210` | ✓ `DATA_MODEL.md:265` | ✓ 派生（`seed-manifest.js:436-448`） | ✓ v3 `db.js:255-267` | ✓ `workgroup-routes.js:547-555`；`auth.js:148-156` | **差异**：专班侧写口绕主源（§四 P1-3） |
| 工作组任务 `workgroup_tasks` | **缺**（`domain.js` 无 typedef；仅有 `mockDB.workgroupTasks` 空数组 `:487`） | ✓ `DATA_MODEL.md:267` | **缺**（`NON_SEED_COLLECTIONS`，`seed-manifest.js:488`） | ✓ v3 `db.js:180-182` | **差异**：`taskforce-list.js:83`、`taskforce.js:43-45` 直接读缓存，`init()` 不拉（`data-adapter.js:216-247,254-322`） | typedef 缺 + 首屏空（§四 P1-5） |
| 专班 `taskforces` | ✓ `domain.js:48-60` | ✓ §2.3 `DATA_MODEL.md:239-258`；`members` 明示为历史兼容镜像（`:255`） | ✓ `mock/taskforces.js`（8 个） | ✓ `db.js:13-15`；v3 `:295-313` | ✓ `taskforce.js:418`；`taskforce-view.js:188` | **差异**：贡献只存在 `members[]`，与 `workgroup_members` 主源断裂（§四 P1-2） |
| 考勤 `attendances` | ✓ `domain.js:226-237` | ✓ §2.5 `DATA_MODEL.md:327-346` | ✓ `mock/attendance.js`（44 静态 + 生成段 + att900）；**无 `branchId`** | ✓ `db.js:13-14,157`（`server/seed.js:157`） | ✓ `attendance.js:34`；矩阵/汇总 | **差异**：`overdue` 存值快照 vs 页面 OR 日期现算（§三-⑦） |
| 应到名单 `attendance_rosters` | **缺**（`domain.js:490-491` 只有数组声明） | ✓ §2.5 `DATA_MODEL.md:346` | **缺**（`NON_SEED_COLLECTIONS`，`seed-manifest.js:490`） | ✓ v3 `db.js:180-181`；端点 `workgroup-routes.js:1072-1124` | ✓ `attendance.js:40-42,598-750`；`attendance-matrix.js:6-16` | typedef 缺；写口仅「提交考勤/冻结按钮」触发（可接受，但模型层不完整） |
| 考察 `inspections` | ✓ `domain.js:374-389` | ✓ §2.5.1 `DATA_MODEL.md:368-390`；指针 `domain.js#L165-L177` 已过期 | ✓ `mock/inspection.js`（42 条）；**无 `branchId`** | ✓ `db.js:13-14`；v5 回填 `:335-359` | ✓ `inspection.js:38`；`inspectionToWide:364` | 文档指针过期（P3）；归属靠父键反查（可接受） |
| 通知 `notices` | **缺**（`domain.js` 无 Notice typedef） | **差异**：§2.9 `DATA_MODEL.md:457-471` 仍只列 `read:boolean`，缺 `reads[] / audience / audiencePersons / branchId / noticeType / fromPersonId` | **差异**：`mock/notices.js:14-156` 仍逐条写 `read` 布尔（R7-32 未消解） | ✓ `db.js:13-15`；语义端点 `server/routes/system-notices.js` | ✓ `notice.js:290,610-627`（读 `reads[]`） | 模型文档与种子落后于读链（P2） |
| 待办 `todos` | **缺**（DATA_MODEL 明写「类型定义将位于 domain.js（待新增）」`DATA_MODEL.md:814`） | **差异**：§2.18.1 `DATA_MODEL.md:818-834` 无 `branchId / ownerType / ownerId / flow / actionKey` | **差异**：`SEED_TODOS` 仅 1 条（`todo.js:1621-1640`）；server 不播种（`server/seed.js` 无 todos 行）；API 首启靠前端 `SEED_FALLBACK` 注入（`data-adapter.js:369-373`，默认开 `config/deploy.js:39`） | ✓ `db.js:13-15` | **差异**：`todo.js:807-844` 只按 role/person 过滤，无支部维度 | 模型层缺口最集中（§五-1） |

**抽查外补充（不占 10 实体名额）**：`users`（Person）五层一致（`domain.js:239-254` / `DATA_MODEL.md:1079-1133` / `people.js` / `db.js:13` / `person.js:86-103`），唯 mock 账号层 `accounts.js` 与服务端共用口令是**演示例外**，不构成第二权威。

---

## 三、「同一事实多处写/读」清单

> 每条给：**主源 → 镜像/副本 → 允许的例外**。标注「缺口」者为无正当理由的第二写口/第二读法。
> 本清单为 **HEAD 基线**；其中第 1 / 2 / 3 / 15 条在工作区已有 Task 4 未提交草稿，草稿状态与剩余缺口见 §四。

1. **工作组成员**
   - 主源：`workgroup_members`（`workgroup-routes.js:556-706`；mock `mock-adapter.js:2360-2449`）。
   - 镜像：`activities.assignments` / `taskforces.members`（同事务回写，`workgroup-routes.js:622-641`；`mock-adapter.js:2429-2440`）。
   - **缺口**：专班报名审核走 `TaskForceRecordStore.addMember`，只写 `taskforces.members`，不写 `workgroup_members`（`signup.js:187-192` → `taskforce.js:377-382`）。
   - 允许的例外：活动报名 `organizer/deep` 通过 `syncProjectRoles` 同时写两侧（`signup.js:177-186` → `auth.js:148-156`）——这是正确形态。

2. **专班贡献**
   - 主源：`taskforces.members[].contributions`（`taskforce.js:396-416`）。
   - 镜像：**无**（`workgroup_members` 无 `contributions` 字段，`domain.js:200-210`）。
   - **缺口**：移出成员时两层都把整行删掉，贡献随之丢失（`workgroup-routes.js:781-783`；`mock-adapter.js:2515-2521`）。
   - 允许的例外：历史字符串贡献只读展示（`taskforce.js:386-392`）。

3. **活动 ↔ 工作组名称/状态/落点**
   - 主源：`activities`（活动业务唯一载体，`DATA_MODEL.md:264`）。
   - 镜像：`workgroups.name/status/organizingScope/hostGroupId/recruitmentScope/crossGroupCoordinatorId`（创建时复制，`workgroup-routes.js:447-453`；`mock-adapter.js:955-964`）。
   - **缺口**：编辑名称、归档、取消、删除中的「名称/状态」不同步（`index.js:593-611` 只同步落点；`index.js:781-799` 归档只改活动；`mock-adapter.js:987-1013` 更新不碰工作组）。
   - 允许的例外：专班 `taskforces` 改名/改状态会同步工作组（`index.js:578-588`；`taskforce.js:205-214`）——活动侧应对齐此形态。

4. **应到名单**
   - 主源（口径）：`getMeetingRosterIds`（`roster.js:144-157`，每次按档案现算）。
   - 副本：① `attendance_rosters.personIds[]`（`workgroup-routes.js:1117-1122`，冻结后不可原位覆盖）；② `activities.voteConfig.voterIds[]`（`vote-config.js:55`，表决专用快照）。
   - 允许的例外：① 是考勤审计快照（历史不可回改）；② 是表决名单快照（表态权只认它，`vote-config.js:100-115`）。两者语义不同，**不算重复**；但读侧必须明确「本屏读的是哪一份」。

5. **考勤「人 × 活动」唯一性**
   - 主源：`attendances` 唯一约束在服务端 PATCH 时现查重（`index.js:570-572`）。
   - 副本：补课任务用 `attendanceRecordId` 反指（`seed-manifest.js:173-177`）。
   - 允许的例外：无——补课不另存考勤，只改 `status='made_up'`（状态枚举单源 `domain.js:285-298`）。

6. **通知已读**
   - 主源：`reads: personId[]`（`notice.js:29-38,610-627`；快照门只允许追加本人 `gates.js:764-777`）。
   - 副本：**旧全局 `read` 仍在新写入**——`sendDirectMessage` 写 `read:false`（`notice.js:761`），发布表单也写 `read:false`（`notification-tab.js:265`）。
   - 允许的例外：旧行一次性迁移（`notice.js:29-38`）；新行不应再写 `read`（属 R7-32 未清尾巴）。

7. **逾期**
   - 主源（应有）：按 `recordedAt/活动日 + policy` 现算。
   - 副本：`attendances.overdue` / `activityReviews.overdue` / `taskforceReviews.overdue` 存值（`mock/attendance.js:28`；`mock/review.js:98`）。
   - **缺口**：新增记录一律写 `false`，只有历史种子少数为 `true`；纪检总表另按日期 OR 现算 ⇒ 同屏两种结果（R7-33 未消解）。

8. **支部归属**
   - 主源（应有）：资源行 `branchId`。
   - 副本：父键反查（`branch-scope.js:103-155`）；读不到时回落 `DEFAULT_BRANCH`（`:173`）。
   - **缺口**：`todos` / `inspections` 无 `branchId`，完全依赖反查 + 回落；`todos` 的 `personId` 不在 `linkedBranch` 分支内（`branch-scope.js:103-154`），到人待办一律落 `br-b1`。
   - 允许的例外：党委 `party-staff` 未选支部时按「目录/空」投影（`branch-scope.js:200-217`）。

9. **人员主键与登录账号**
   - 主源：`users.id` = `studentId`（`domain.js:240-243`；`member.js:302-341` 原子改名）。
   - 副本：`users.data.studentId`（同值维护）、mock `accounts.studentId`（`accounts.js:78-169`）。
   - 允许的例外：mock 演示登录（`accounts.js`）与服务端共用口令（`server/routes/auth.js:38-40`）是**形态差异**；`createAccount` 在 API 形态仍被调用（`member-flow.js:128`）属残留镜像，不构成权威。

10. **发展阶段与起始日**
    - 主源：`users.developStage`。
    - 副本：`memberChangeRequests.toStage/status`（流程台账）、`developStageSince`（派生展示，`person.js:284-293`）。
    - 允许的例外：台账是审批留痕、起始日仅派生不落库（R7-03 已按此修）。

11. **在册状态**
    - 主源：api 形态 `users.residenceStatus/Note/History`（`member.js:344-359`）。
    - 副本：mock 形态 `localStorage` 键 `RESIDENCE_KEY`（`roster.js:63-79`）；api 形态明确不写本机（`:64,71-79`）。
    - 允许的例外：仅 mock 演示；清缓存回种子（`roster.js:212-218` 注释）。

12. **成员姓名/组别快照**
    - 主源：`users.name/partyGroup`。
    - 副本：考勤行 `studentId/developStage/partyGroup`（上传时快照，`mock/attendance.js`）。
    - 允许的例外：快照不可回改（R7-07 已裁定标「登记时未采集」），不补录。

13. **表决结果**
    - 主源：`agenda_votes`（参与记录 + tally，`committee.js:130-158`）。
    - 副本：议程项结果字段与 `activity.voteTally`（`domain.js:99`；`agenda-follow-up.js` 记录结果）。
    - 允许的例外：议程结果是会议记录（人读结论），tally 是计票事实；两者一致性由 `agenda-votes` / `agenda-closure-core` 守卫。

14. **支部现任支书**
    - 主源：`branches.secretaryId`（`branch.js:360`）。
    - 副本：`appointmentRecords`（任期档案）、`users.role==='secretary'`。
    - 允许的例外：任命留痕（`B-500-6` 待收口的通用 CRUD 面）；三者一致性无单一守卫。

15. **活动状态**
    - 主源：`activities.status` + `archived`（展示态由 `deriveActivityLifecycleStatus` 派生，`DATA_MODEL.md:87-99`）。
    - 副本：`workgroups.status`（活动工作组只有 active/archived，`domain.js:70-71`）。
    - **缺口**：归档只改 `activities.archived`，工作组停在 `active`（§四 P1-1）。

---

## 四、本轮抽查发现的 P1 级不一致（5 条）

### P1-1 归档活动的工作组仍可写

- **现象**：活动 `archived=true`（`server/routes/resources/index.js:781-799`；`services/core/mock.js:262-289`；`mock-adapter.js:1052-1056`）后，`workgroups.status` 仍为 `active`，而工作组所有写口只判 `workgroup.status`（`workgroup-routes.js:44-54`）⇒ 成员、授权、任务、产出仍可新增/修改。
- **影响**：已归档活动的协作面不冻结，历史可被改写；与 DATA_MODEL「活动工作组仅 `active/archived`」及「终态历史只读」（`DATA_MODEL.md:264,283-286`）冲突。
- **对应 Task**：4.3「创建 / 编辑 / 归档 / 删除四处同事务同步 … 归档工作组必须 archived」。
- **现有守卫**：`activity-creation-transaction` 只覆盖创建；无归档同步断言。
- **工作区草稿状态**：已见 `docs/src/data/activity-workgroup-sync.js`（新，纯投影）+ 服务端 `activityWorkgroupUpdate` / `activityWorkgroupSyncUpdates`（当前工作区 `workgroup-routes.js:68,92`）+ 快照写穿同步（`index.js:881`）+ 归档事务（`index.js:772-796`）+ mock 编辑/归档/删除三处（`services/core/mock.js:182,297`；`mock-adapter.js:1011,1034,1063`）。**未提交、未跑守卫，不视为已收口**。

### P1-2 专班成员移出丢贡献

- **现象**：贡献唯一落点是 `taskforces.members[].contributions`（`taskforce.js:396-416`）。服务端删除成员时直接过滤掉整行（`workgroup-routes.js:775-783`），mock 同样（`mock-adapter.js:2515-2521`）。
- **影响**：移出即永久丢失该成员历史贡献；与「历史只读保留」冲突。
- **对应 Task**：4.2「服务端加成员不清空历史 contributions」。
- **现有守卫**：`workgroup-member-grant-revoke` 只覆盖授权撤销，不覆盖贡献。
- **工作区草稿状态**：只修了「**加入**成员时按 personId 合并历史 contributions」（当前工作区 `mock-adapter.js:2495-2504`；`server/routes/resources/workgroup-routes.js:670-676,795-805`）。**移出路径仍删整行**：当前工作区 `workgroup-routes.js:833-838`、`mock-adapter.js:2521-2531` ⇒ **本条仍存在**，Task 4.2 验收须补「移出后 contributions 仍可回查」断言。

### P1-3 专班报名审核绕开成员主源

- **现象**：`SignupStore.review` 通过后对专班只调 `TaskForceRecordStore.addMember`（`signup.js:187-192`），写 `taskforces.members`；`workgroup_members` 不新增。DATA_MODEL 却声明 `workgroup_members` 为标准主源（`DATA_MODEL.md:265,298`）。
- **影响**：组织台工作组页（读 `workgroup_members`）看不到已通过审核的专班成员；后续授权/任务分配与成员身份脱节。
- **对应 Task**：4.2「专班报名审核与代录贡献改走工作组主源」。
- **现有守卫**：`workgroup-member-semantics` 只覆盖语义端点自身。
- **工作区草稿状态**：`signup.js` 已改 `await TaskForceRecordStore.addMember`（当前工作区 `signup.js:191-193`），`addMember` 已改为先写 `workgroups.members.add`（当前工作区 `taskforce.js:385-409`）。**未提交**；验收须覆盖「专班报名通过后组织台工作组页可见该成员」。

### P1-4 Todo 缺 `branchId` 结构字段（多支部同实例下必现）

- **现象**：Todo 无 typedef，`DATA_MODEL.md:818-834` 无 `branchId`；服务端建行时临时补 actor 支部（`index.js:321-325`），mock 建行不补（`mock-adapter.js:1297`）；读侧 `resourceBranchId` 只按父行反查，`todos` 的 `personId` 不在反查链（`branch-scope.js:103-154`）⇒ 回落 `DEFAULT_BRANCH`（`:173`），mock 同样（`mock-adapter.js:83-95`）。
- **影响**：单支部（当前演示）无感；一实例多支部（D-823 口径）时，到人待办与无来源待办被归到 `br-b1`，出现「看不到 / 错归属 / 写入 403」。
- **对应方案**：§五-1；本轮不实施。
- **现有守卫**：`todo-cross-role-safety` / `todo-role-write-gate` 都未覆盖支部维度。
- **工作区草稿状态**：**未动**（无 `todos.branchId`、无迁移 v11）。

### P1-5 工作组任务/产出首屏为 0

- **现象**：`init()` 的拉取集合不含 `workgroups / workgroupMembers / workgroupGrants / workgroupTasks / workgroupOutputs / attendanceRosters`（`data-adapter.js:216-247,254-322`）；而首页与活动详情直接读缓存（`components/dashboard/taskforce-list.js:83,149`；`taskforce.js:43-45`；`activity-entry.js:759-760`）⇒ API 形态首屏显示 0 项，直到某处按组触发拉取。
- **影响**：与「0 项」和「未加载」不可区分，首页专班进度与活动任务清单失真。
- **对应 Task**：4.4。
- **现有守卫**：`home-workgroup-progress` 只测模型，不测首屏装载。
- **工作区草稿状态**：已加 `_loadWorkgroupAux`（当前工作区 `data-adapter.js:1033-1065`）与 `workgroupAuxLoaded` 标记；首页 `taskStats` 输出 `loaded` 并显示「任务 加载中」（`taskforce-list.js:82-108`）。**未提交**；验收须覆盖「装载失败 → 仍显示加载中而非 0」。

---

## 五、schema 方案（只出方案，本轮不实施）

> 前置声明：本轮**不改** `server/db.js`、`SCHEMA_VERSION`、任何表结构、任何迁移；以下仅登记方案与依赖。

### 5.1 Todo `branchId` v11

- **字段**
  - 数据模型：Todo 增 `branchId: string | null`（`null` 仅表示「待归属」，不得用 `br-b1` 兜底）。
  - 同步补 `@typedef {Object} Todo` 到 `docs/src/core/domain/domain.js`（现缺，DATA_MODEL 已注明「待新增」`DATA_MODEL.md:814`），并在 `DATA_MODEL.md §2.18.1` 增列 `branchId / ownerType / ownerId / flow / actionKey`。
- **v11 迁移**
  1. `ALTER TABLE todos ADD COLUMN branch_id TEXT`；
  2. 事务内回填（只改 `data` JSON 与列，不删行）：
     - `sourceType='activity'|'taskforce'|'notice'` 且 `sourceId` 命中 ⇒ 取父行 `branchId`；
     - 否则 `personId` 命中 `users` ⇒ 取该人 `branchId`；
     - 否则保持 `NULL`，计数并打印 `unresolved`（不猜测）。
  3. `CREATE INDEX idx_todos_branch ON todos(branch_id)`（与 §5.2 同批，不单独做）；
  4. 幂等：已有 `branchId` 的行跳过；重复启动零改写。
- **fail-closed 规则**
  - 新写口（`POST/PATCH /todos`、快照新增行）解析不出支部 ⇒ `400`，错误文案点名「待办须能归属到支部」；
  - 读口 `resourceBranchId('todos')` 删除 `DEFAULT_BRANCH` 兜底（只对 `todos` 生效），`null` 行：
    - 党委未选支部 ⇒ 不返回；
    - 支部账号 ⇒ 仅当 `personId === actor.id` 或 `role === actor.role` 时可见一个兼容周期，并置 `branchLegacy: true` 供 UI 标注「待归属」；
  - 禁止用 `br-b1` 兜底（与 D-680「一实例一支部」的过渡口径解耦）。
- **影响读口**
  - `server/routes/resources/index.js:150-155,167`（`_canReadTodoRow` 增支部判据）；
  - `index.js:1449-1480`（行级投影/保留未见行）；
  - `server/routes/resources/branch-scope.js:103-155,157-173`；
  - `docs/src/data/mock-adapter.js:83-95`（`_recordBranchId` 对 `todos` 走行内字段）；
  - `docs/src/services/governance/todo.js:819-844`（`getByRole` 增加支部过滤参数）。
- **依赖 / 关系**
  - **未裁命题**：「多支部同实例」是否作为正式部署形态（D-680 先「一实例一支部」，D-823 已给多支部读写边界；TODO 归属规则须与该裁定同口径）。
  - **P13**：P13-S2「读过滤 / 取子集下推 + 索引」与本项同批；P13 已完成服务端读过滤，Todo 缺列使该过滤无法真正下推。
  - **B-500-4**：若保留期裁定「待办按期限清理」，回填只处理保留期内行；未裁前不删任何行。
  - **B-500-6**：无直接依赖（任命 CRUD 与 todos 无关），只共享「deny-by-default」写门口径。
- **结论**：**本轮不实施**；等 Task 4 的四条 P1 修完、且「多支部形态」有明确裁定后再开批次。

### 5.2 列表分页与真实列索引

- **现状（决定了现在不宜做）**
  - 服务端每集合 `SELECT data FROM <table>` 全表读 + JS 过滤（`server/routes/resources/store.js:44-46`；`index.js:213-235`）；
  - 前端 `init()` 一次拉全量（`data-adapter.js:216-247,254-322`），客户端分页 `pageSize=10`（`components/ui/list-filter.js:106,129`；`pager.js:21-34`）；
  - 全仓 SQL 只有主键命中（D-680 ④ 实测结论仍成立）。
- **触发条件（任一满足）**
  1. **多支部同实例**成为正式形态 ⇒ 任一 `per-branch` 表行数 = 支部数 × 单支部行数，且读口已按支部过滤；
  2. 单表 > **5,000 行**，或 `/api/v1/bootstrap` 响应体 > **2 MB**（按 `attendance` 为首个候选：50 人 × 50 场/年 ≈ 2,500 行/年，两年越阈值）；
  3. 出现「服务端按 `branchId + status/personId` 筛选」的真实需求（P13-S2 的 `WHERE` 可下推）。
- **方案（保持 JSON 表不变，先加可下推列）**
  - 对 5 张热表（`attendances / inspections / todos / notices / activities`）加 SQLite **generated stored 列**：
    `ALTER TABLE attendances ADD COLUMN branch_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.branchId')) STORED;`
    同法加 `status` / `person_id` / `activity_id` / `updated_at`（仅需要的表），并建 `(branch_id, status)`、`(branch_id, person_id, activity_id)` 复合索引；
  - `GET /<resource>` 增加 `?page=&pageSize=&branchId=&status=`，返回 `{ rows, total }`；旧客户端（无 `page`）保持整表返回一个版本周期；
  - 深分页用游标 `(updated_at, id)`，不用 `OFFSET`；
  - 快照写穿保持整表（不在本项内改）。
- **代价**：写入放大 < 5%（每行多存 3–5 个短列）；一次迁移需回填（generated 列自动计算，无需回填）；两侧 adapter 与所有 `list()` 调用方需改；`data-lifecycle-guard` / `mock-api-parity` 需同步。
- **依赖 / 关系**
  - **未裁命题**：保留期（B-500-4）决定行数增长斜率；多支部形态（D-823）决定是否必须做。
  - **P13**：本项即 P13-S2 的落地形态；不先有真实 `WHERE` 就加索引＝空转（D-680 ④）。
  - **B-500-4**：未裁前不按「旧行删除」估算阈值；只做加法、不做清理。
  - **B-500-6**：无关。
- **结论**：**本轮不实施**。

### 5.3 JSON 宽表拆分的触发条件与代价

- **候选宽表**
  - `activities.agenda[] / voteConfig / participants[]`（`DATA_MODEL.md:55,71`）；
  - `taskforces.members[].contributions[] / progressList[]`（`DATA_MODEL.md:255,297`）；
  - `users.selfProfile / residenceHistory[]`（`DATA_MODEL.md:1094-1118`）；
  - `act_sub_records` / `tf_sub_records`（`__root__` 单行聚合，`db.js:11-12,18-19`）。
- **触发条件（任一满足）**
  1. 单行 JSON `max(length(data))` > **256 KB**，或 p95 > **32 KB**（整行读写与快照传输开始明显变慢）；
  2. 同一行出现并发更新冲突（乐观锁 409 频发），例如议程结果与成员同改一个活动；
  3. 需要按子项查询/统计（如 `contributions.by`、`agenda.personStages`），且该字段出现在 ≥ 2 个读口。
- **方案（按子项即实体拆）**
  1. `agenda_items`：`id / activityId / seq / item / kinds / agendaStep / result…`；
  2. `taskforce_contributions`：`id / taskforceId / personId / desc / by / at / verifiedBy / verifiedAt`；
  3. `users.selfProfile` 保持 JSON（整体读写，无按子项查询需求）；
  4. `act_sub_records` 暂不拆（已按活动聚合，拆开收益小、迁移面大）。
- **代价**
  - 快照协议需按新表逐项登记（`RESOURCE_TABLES`、快照 payload、集合版本号）；
  - 前端 `mock-adapter` / `api-adapter` / `data-adapter` 三处双实现；
  - 迁移需回填 + 回滚脚本 + 至少一个完整测试批次（含 `mock-api-parity`、`data-lifecycle-guard`、`activity-delete`）；
  - 与「整行 JSON 快照」的现有写穿模型冲突，须先决定「快照是否继续整表」（与 §5.2 同源）。
- **依赖 / 关系**
  - **未裁命题**：B-500-4 保留期决定历史行是否先被清理（先清理可能直接消除拆分动机）；
  - **P13**：拆表是 P13-S2「取子集下推」的极端形态，须与索引方案同批评估；
  - **B-500-4**：强相关——拆表后保留/删除策略按子表执行，成本更高；
  - **B-500-6**：与 `branches.config` 的 JSON 写口相邻（任命 CRUD 会读写 `branches` 行），同批改会互相干扰，建议错开。
- **结论**：**本轮不实施**。

---

## 六、与 R7 报告的关系

> 原则：R7 已修项只标「已消解 + 证据」，不重复提建议；仍存在项按 B-502-4 归口，不在本报告重开编号。

### 6.1 R7 已消解（当前 HEAD 复核）

| R7 编号 | 结论 | 当前证据 |
|---|---|---|
| R7-01 学号可改导致读写不同源 | **已消解** | `PATCH /members/:id/profile` 白名单已移除 `studentId`（`server/routes/member.js:255-257`）；改名走原子端点 `POST /members/:id/account-rename`（`:302-341`，同事务改 `users.id` / `sessions.person_id` / `attachments.uploaded_by` / 全表 JSON 引用）；前端走 `PersonStore.renameMemberAccount`（`person.js:147-172`） |
| R7-03 阶段起始日无值 | **已消解** | `deriveDevelopStageSince`（`person.js:284-293`）；档案页派生读 `person-entry.js:183` |
| R7-14 今日会议类型写死 | **已消解** | `today-summary.js:35-43` 由 `POLICY_DEFAULTS.attendance.meetingTypes` ∪ `党小组会` 现算 |
| R7-16 活动/任务/产出状态多处手写 | **已消解（主体）** | `domain.js:636-696` 建 `TaskStatus/OutputStatus/ACTIVITY_CLOSED_STATUSES/isActivityClosed/isWorkgroupClosed`；全站手写数组已基本替换。残留：`mock-adapter.js:2627-2628` 仍手写 `['completed','cancelled']` 作为状态机白名单（P3，属适配器边界） |
| R7-17 缺省支部内联 | **已消解** | 前端仅剩注释与单一常量（`constants.js:13-16`）；服务端仅注释（`seed-baseline.js:21`、`seed.js:18`、`uploads.js:87`）；代码统一 `DEFAULT_BRANCH_ID / resolveBranchId` |
| R7-19 组长活动类型两份 | **已消解** | `constants.js:1102` `LEADER_CREATABLE_ACTIVITY_TYPES`；`gates.js:134` 与通知受众同源 |
| R7-20 副组长写门 | **已消解** | `PARTY_GROUP_LEADER_ROLES` 含 `deputy-leader`（`constants.js:1089-1093`）；`ACTIVITY_WRITE_ROLES` 由该集合派生（`gates.js:133`）；`activityCreationDeny`/`activityOperationAllowed` 同判据（`workgroup-routes.js:221-227,254-262`） |
| R7-29 `enrollYear` 全空 | **已消解** | 按学号前两位派生（`people.js:76-84`）；`seed-manifest.js:41` 已声明 |
| R7-30 `u_*` 幽灵账号 | **已复核，非缺陷** | `person.js:90-103` 明确 `u_*` 是空支部基线系统账号（`reset-tier-init` 断言必需），`getMembers()` 不含它们；不作数据缺陷重开 |

### 6.2 R7 部分落地 / 仍存在（不重复建议，归 B-502-4）

| R7 编号 | 当前状态 | 证据 | 与本报告关系 |
|---|---|---|---|
| R7-15 补课文案写死 | 部分 | `makeup-tab.js:94` 仍写「7 日内（T+7）」；`settings-entry.js:1283` 仍写（T+7） | 已登记 `CLAUDE.md B-502-6`，本报告不重提 |
| R7-32 通知旧 `read` 布尔 | 仍存在 | 种子逐条 `read`（`mock/notices.js:14-156`）；新私信仍写 `read:false`（`notice.js:761`） | 本报告 §三-⑥ 只记「同一事实两写法」，建议归 B-502-4 |
| R7-33 逾期存值快照 | 仍存在 | `attendance.js` / `review.js` 种子 `overdue` 布尔；读侧未统一现算 | 与 §五-3「拆分/派生」相邻，但本轮不实施 |
| R7-34 宣传任务来源自由文本 | 仍存在 | `mock/prop.js:36-43` | B-502-4 |
| R7-35 专班 manager / 支书写死 | 仍存在 | `mock/taskforces.js:15,58,81,99,116,134,149,165` 全为 `2400012355` | B-502-4 |
| R7-36 补课种子逾期 | 仍存在 | `mock/seed.js:105,116`（`mk-seed-1` 截止 2026-09-17） | B-502-4 |
| R7-31 副组长演示身份 | 仍存在 | `PEOPLE` 无 `deputy-leader`（`people.js:8-67`） | 不属数据结构主面，B-502-4 |

### 6.3 与 R3 全栈审查的关系

- R3 的 F-02（行级读 + 整表写丢数据）、F-03（`reads` 白名单）、F-04（组长考勤 403）已在服务端读投影 + 快照保留未见行机制中收口（`index.js:1440-1480`；`gates.js:348-375,764-777`）；F-06/F-07（通知/反馈越权读）分别由 `index.js:1449-1455` 与语义端点读投影处理。本报告不再重开。
- R3 的 F-05（未设门资源通用 CRUD）已由 `RESOURCE_WRITE_GATE` 扩至 22 项收口（`gates.js:28-40,644-659`）。本报告只在 M4/M11 引用其现状，不提新缺口。

---

## 七、附：只读声明

- 本报告是本次唯一新增文件；未修改任何产品代码、测试、schema、种子、其它文档，未 commit，未运行改数据命令。
- 行号以 2026-10-22 当前 HEAD Read/Grep 为准；`resources/index.js`、`mock-adapter.js`、`workgroup-routes.js` 仍可能在下一批改造中位移，如引用失效以同义代码为准。
- 未评面：`calendar-tab.js` / `activity-progress.js` / `activity-calendar-tab.js` 的跨组组织落点展示（Task 3 只做数据结构与派生口径，不评页面呈现）。
