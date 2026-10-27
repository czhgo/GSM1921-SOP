---
title: "数据生命周期审查（第七轮）"
type: audit_report
role: "[AI]"
last_updated: "2026-10-22"
status: active
round: 7
---

# 数据生命周期审查（第七轮）

> **审查性质**：只读审查。除本报告外，未新增或修改任何产品代码、测试、文档；未运行任何改数据的命令。
> **范围**：`docs/src/entries/**`、`docs/src/components/**`、`docs/src/services/**`、`docs/src/data/mock/**`、`docs/src/core/domain/**`、`server/**`（排除 `node_modules`、`server/test`）、`server/seed*.js`。
> **口径（支书判据逐字）**：① 对「咱没有信息的字段」检查有没有改写入口；② 工作流相关的硬编码要改为计算或派生，并优化呈现方式；③ 不为旧 mock 削足适履——mock 要跟着代码更新。
> **本轮跳过面**：`calendar-tab.js` / `workgroup-routes.js` / `activity-progress.js` / `activity-calendar-tab.js` 的跨组组织落点字段正由另一路改造，本报告不评该面；行号均在 2026-10-22 当前工作区逐条 Read 核对。
> **处置三选一（空值项专用）**：① 补受控写入口（写明权限与留痕）；② 按设计不采集 ⇒ 隐藏或标注归属方 / 「登记时未采集」；③ 从既有记录派生。

## 〇、规模与方法

- **规模：36 条**（P1 **1** 条 / P2 **12** 条 / P3 **23** 条）。其中空值 13 条、工作流硬编码 15 条、mock 未同步 8 条。
- **方法**：
  1. 先读三份种子报告（`DATA_LIFECYCLE_AUDIT.md`、`DATA_LIFECYCLE_AUDIT_R2.md`、`FULLSTACK_AUDIT_R3.md`），建立「已消解 / 仍存在」清单；
  2. 对旧条目逐条在当前 HEAD 回读，只有仍在的才重新编号；`p*` 人员 id 类旧问题按批次 500 的学号主键迁移结果判为已消解；
  3. 空值：对 `未填写 / — / 暂无 / 未设置 / 未采集` 做全仓检索后，只保留**字段级**占位（列表/卡片空态不占号），再逐字段追写入口与读侧刷新；
  4. 硬编码：按「角色集合、状态集合、人数、页签数、时限、日期阈值、支部 id、人员 id、会议类型集合、职能映射」十类扫描，判断是否已有单一源、是否会随人员/角色/配置漂移；
  5. mock：用 `seed-manifest` 的字段声明做对照，找出「代码已新增字段/枚举/角色、mock 与种子未跟」的项。

---

## 一、空值清单（13 条）

| 编号 | 文件:行号 | 现状 | 影响 | 建议（含处置①②③） | 优先级 |
|---|---|---|---|---|---|
| R7-01 | `docs/src/entries/pages/person-entry.js:290`；`docs/src/components/governance/person-edit-modal.js:258,350-352`；`docs/src/services/member/person.js:634,693-694`；`server/routes/member.js:230,314-318`；`server/routes/auth.js:36` | 学号在档案页可编辑且「立即生效」，但 `PATCH /members/:id/profile` 只把新值并入 `users.data`，`users.id` 主键不变；登录口按 `users.id` 查行，mock 账号表按 `studentId` 匹配。 | 改学号后：新学号登不进、旧学号仍能登；同一学号可被两条档案同时占用（更新路径无唯一性校验）；所有以 personId 为外键的历史记录仍指向旧号。 | **① 受控写入口（唯一）**：把「改学号」改成「人员主键重命名」语义端点，在同一事务内重写 `users.id`、`sessions.person_id`、`attachments.uploaded_by` 及各 JSON 引用（复用 `server/db.js` v7 迁移的映射逻辑），并同步 mock 账号层、写审计留痕；端点落地前，档案页学号只读。 | **P1** |
| R7-02 | `docs/src/components/governance/person-edit-modal.js:356,401-404`；`docs/src/entries/pages/person-entry.js:326,385-390` | 「在册备注」有输入框，但状态未变时只弹「需随在册状态变更一并报确认」，**永远存不进去**；在校人员的「当前备注」恒为 `—`。 | 用户看到可编辑字段却保存无效；在校人员长期看到无解释的 `—`。 | **② 标注 + 收口**：在校时隐藏「当前备注」行；备注只在「在册状态＝滞留」时随状态变更提交（或复用名册 `diffMemberFields` 的备注单独保存路径 `services/member/roster-ui-logic.js:136-139`），并把模态里的备注字段移出「可改字段」、在标签写「随在册状态变更填写」。 | P2 |
| R7-03 | `docs/src/entries/pages/person-entry.js:306-308`；`docs/src/components/governance/person-edit-modal.js:256-271`；`docs/src/services/member/member-confirmation.js:477-482` | 「阶段起始日」只在阶段确认生效时同笔落 `developStageSince`；编辑模态没有该字段，页面为空显示 `—`；51 名种子人员全部为空。 | 发展追踪、预备期提示（`talent-tab.js:98-108`）读不到起始日；档案页长期出现无出口占位。 | **③ 派生 + ② 隐藏**：读侧用 `memberChangeRequests` 中该人最后一次 approved `developStage` 的 `decidedAt` 回填；仍无记录则不渲染该行；如需人工补录，给组织委员受控入口，并按成员变更链留痕。 | P2 |
| R7-04 | `docs/src/entries/tabs/leader/write-tab.js:469,483,500-503`；`docs/src/entries/tabs/prop/archive-tab.js:489` | 宣传初稿的「撰写人」是选填；不填则列表显示 `—`，而同一笔记录已经拿到了 `recordedBy`（当前登录人）。 | 待审核初稿不知道谁写的，退回说明没有收件人；对审核链是必需信息。 | **① 补写入口（默认派生）**：`author` 默认当前登录人并只读展示；允许代填但必填；存量空值显示「未署名」并给出补填入口。 | P2 |
| R7-05 | `docs/src/components/governance/person-profile-sections.js:69,83,93`；`docs/src/entries/pages/person-entry.js:95-99` | 同一张档案页：组织事实区空值用 `—`，本人自述区仍用「未填写」，自述列表子单元格又单独用 `—`。 | 同一屏三套空值词表，读者分不清「未采集 / 未填写 / 不适用」。 | **② 统一词表**：抽 `EMPTY` 语义常量（missing / notApplicable / unfilled），自述区与组织事实区共用；列表按列声明 `emptyText`，整列全空不渲染。 | P3 |
| R7-06 | `docs/src/data/mock/people.js:66`；`docs/src/entries/pages/person-entry.js:102-106,217` | 党委组织员 `partyGroup:''`、`developStage:''`，档案页把空串渲染成「未分组」、阶段渲染成 `—`。 | 组织级角色的「不适用」被显示成漏填。 | **② 按角色标注**：`role==='party-staff'` 时两行显示「不适用（党委组织员）」或直接隐藏；空串与「未分组」分开表达。 | P3 |
| R7-07 | `docs/src/entries/tabs/disc/attendance-tab.js:1324-1328` | 考勤总表「学号 / 发展阶段 / 所属党小组 / 类别」为空显示 `—`；这些是上传时快照，全站无补录入口。 | 历史考勤行长期空列，纪检无法核对，读者以为数据坏了。 | **② 标注快照语义**：四列统一 `title="登记时未采集（上传时快照）"`；整列全空时隐藏；不提供补录（快照不可回改）。 | P3 |
| R7-08 | `docs/src/entries/tabs/org/member-flow-tab.js:255-259` | 成员流动台账的学号 / 届别 / 备注为空显示 `—`；台账是登记快照，无改写入口。 | 与 R7-07 同类：占位无出口。 | **② 标注 + 空列隐藏**：整列全空时隐藏，空态写明「撤销后重新登记是唯一更正路径」。 | P3 |
| R7-09 | `docs/src/entries/pages/settings-entry.js:645-646` | 配置变更记录中 `h.by` 缺失时「记录人」显示 `—`；历史行没有补录入口。 | 审计行看起来像漏记，无法判断是系统迁移还是人工。 | **② 语义值替代**：旧行显示「系统 / 迁移前记录」，卡头注明「迁移前记录无操作人」。 | P3 |
| R7-10 | `docs/src/entries/tabs/org/talent-tab.js:150-151` | 人才库「学号 / 所属党小组」为空显示 `—`，本页无行内写入口。 | 组织委员需多跳一层去档案页补全。 | **③ 从档案读链派生**（数据本身已在 person 档案）＋姓名链接 `title` 明示「去档案补全」；如要行内补，复用档案编辑模态，不另写表单。 | P3 |
| R7-11 | `docs/src/entries/tabs/disc/attendance-tab.js:1315` | 党小组会视图的 `title`「组长 X · 上传 Y」在 `leaderName / uploaderName` 缺失时显示 `—`。 | 纪检无法判断这场会到底有没有组长/上传人。 | **③ 从党小组记录与考勤记录现算**；无组长时显示「未设组长」并给支书台「党小组」页的落点，不用 `—`。 | P3 |
| R7-12 | `docs/src/entries/pages/person-entry.js:378-383`；`docs/src/components/governance/person-edit-modal.js:259` | 「编辑组织事实」按钮只高亮 `studentId / partyGroup`，但模态里 `enrollYear` 同属「档案资料 · 立即生效」可改；档案页 51 人届别均为 `—`。 | 有写入口但按钮没有指到它，操作者以为届别不能改。 | **① 补发现性（无新写口）**：`focusFields` 加入 `enrollYear`；或把按钮文案改为「编辑学号 / 届别 / 党小组」。 | P3 |
| R7-13 | `docs/src/entries/tabs/disc/inspection-tab.js:228` | 考察记录「记录人」在 `recordedByName` 缺失时显示 `—`；历史导入行无补录入口。 | 历史行看起来像漏记。 | **② 标注**：显示「登记时未采集（历史导入）」；不补录，新增记录已由 `recordedBy` 现取当前人。 | P3 |

---

## 二、工作流硬编码清单（15 条）

| 编号 | 文件:行号 | 现状 | 影响 | 建议（单一源 / 现算落点） | 优先级 |
|---|---|---|---|---|---|
| R7-14 | `docs/src/services/governance/today-summary.js:31`；对照 `docs/src/core/domain/policy-defaults.js:49-51` | 「今天有会」的应到判定写死 `Set(['支部党员大会','党课','组织生活会','党小组会'])`；而制度参数 `attendance.meetingTypes` 现为 3 类（支委会已移入 `noAttendanceTypes`），党小组会另走小组应到口径。 | 制度参数改会议类型时「今天有会」不跟随；同一类型在政策、活动分类、摘要三处各一份。 | **③ 现算**：改为 `new Set([...POLICY_DEFAULTS.attendance.meetingTypes, '党小组会'])`（或 policy 增 `partyGroupMeeting` 键），页面不得再写类型数组。 | P2 |
| R7-15 | `docs/src/entries/tabs/disc/makeup-tab.js:94`；对照 `docs/src/services/activity/makeup.js:37-53`、`docs/src/core/domain/policy-defaults.js:193-197`、`docs/src/entries/pages/settings-entry.js:1283` | 补课文案写死「仅支部党员大会与党课需 **7** 日内补课（T+7）」；实际范围与时限已由 `makeup.branchAssembly / partyClass / deadlineDays` 配置（设置页可改 1–30 天、可关某类）。 | 支部把时限改成 10 天或关掉一类后，页面仍说 7 天 / 两类，制度与界面不一致。 | **③ 现算插值**：文案用 `makeupDefaultActivityTypes()` 与 `makeupDeadlineDays()` 生成；`settings-entry.js:1283` 的「（T+7）」改为按当前值显示，不写死。 | P2 |
| R7-16 | `docs/src/data/mock-adapter.js:1218-1220`；`docs/src/entries/tabs/leader/write-tab.js:173`；`docs/src/entries/tabs/visitor/projects-tab.js:72`；`docs/src/services/activity/activity.js:306`；`docs/src/components/record/calendar.js:494-495`；`docs/src/components/dashboard/gallery.js:95`；`docs/src/components/dashboard/activity-panel.js:93`；`docs/src/services/activity/taskforce.js:47-48`；`docs/src/entries/tabs/org/taskforce-tab.js:574-578` | 「已结束」与「任务/产出已闭环」三套状态数组到处手写：`['completed','cancelled']`、`['submitted','accepted','archived']`、`isActivityEnded(a) || a.status==='cancelled'`；`domain.js` 只有专班与工作组状态集，没有任务/产出状态的单一源。 | 新增一个终态（如 `voided`）时漏改一处，统计 / 按钮 / 关闭校验即互相矛盾。 | **③ 收单一源**：在 `core/domain/domain.js` 增 `TASK_STATUSES / TASK_CLOSED_STATUSES / OUTPUT_CLOSED_STATUSES` 与 `isTaskClosed/isOutputClosed`；在 `constants.js` 增 `isActivityClosed`（`isActivityEnded || status==='cancelled'`），全站替换上述手写数组。 | P2 |
| R7-17 | 全站：前端 `docs/src/**` 46 处 / 21 文件（例：`docs/src/services/governance/today-summary.js:136`、`docs/src/entries/tabs/secretary/assign-tab.js:589,631`、`docs/src/entries/tabs/secretary/committee-meeting-tab.js:32,38,165`、`docs/src/services/branch/branch.js:622,731`）；服务端 `server/**` 84 处 / 16 文件（含排除面 `workgroup-routes.js` 23 处与 1 条测试；例：`server/routes/resources/gates.js:44,59,500,709`、`server/routes/uploads.js:96,102`、`server/services/reporting.js:63,76,106,124`、`server/routes/committee.js:72,101-102`、`server/routes/resources/semantic-routes.js:59`） | 缺省支部 `'br-b1'` 仍大量内联；单一源 `DEFAULT_BRANCH_ID` / `resolveBranchId` 已在 `docs/src/core/domain/constants.js:16,19-21`，但多数文件没引用。服务端已有 import 前端 constants 的先例（`server/routes/committee.js:12`）。 | 换默认支部或多支部部署须逐处改；漏一处即产生跨支部归属或越权读。 | **③ 单一源**：前端全部改 `resolveBranchId()` / `DEFAULT_BRANCH_ID`；服务端从 `docs/src/core/domain/constants.js` import（或抽出零依赖常量文件）。保留「显式 `null`＝待归属」语义，不得用默认支部兜底。 | P2 |
| R7-18 | `server/routes/resources/semantic-routes.js:210`；`server/routes/resources/signup-write-guard.js:66`；`server/db.js:258` | 角色集合仍以字面量数组出现：`['secretary','deputy-secretary']`、`['organizer','deep']`、`['organizer','deep','participant']`；`constants.js` 已有 `SECRETARY_AND_DEPUTY_ROLES`，其余可从 `ROLE_KEYS` 派生。 | 角色键或副书同权口径调整时，服务端漏改一处即出现「前端放行、服务端 403」或反向越权。 | **③ 单一源**：`SECRETARY_AND_DEPUTY_ROLES` 直接 import；`organizer/deep/participant` 收敛为 `constants.js` 的 `PROJECT_ROLE_KEYS`（从 `ROLE_KEYS` 取子集），服务端不再手写数组。 | P3 |
| R7-19 | `server/routes/resources/gates.js:133-138`；`server/system-notice-kinds.js:29,370` | 「组长可创建的活动类型」`Set(['党小组会','主题党日'])` 在服务端两处各写一份，`constants.js` 无单一源。 | 组长可办类型调整时两处不同步：活动写门放行、通知受众门不放行（或反之）。 | **③ 单一源**：抽到 `constants.js`（如 `LEADER_ACTIVITY_TYPES`）或由 `POLICY_DEFAULTS.attendance.recorderByType`＋活动分类派生，两处 import。 | P2 |
| R7-20 | `server/routes/resources/gates.js:133-138`；`server/routes/resources/index.js:485-486` | 副组长 `deputy-leader` 已进 `ROLE_KEYS`、与组长共用 `leader.html`（`constants.js:995-1000`），但活动写门 `ACTIVITY_WRITE_ROLES` 只含 `leader`，类型限制分支也只判 `actor.role === 'leader'`；`activityOperationAllowed` 同样只认 `leader`。 | 副组长进入同一张「本组活动」页，建 / 改活动会被服务端 403；若有意只读，则前端写口没有隐藏，属「可点但 403」。 | **先裁定，再二选一**：① 同权 ⇒ 把 `deputy-leader` 并入 `ACTIVITY_WRITE_ROLES`、类型限制分支与 `activityOperationAllowed`（单一源角色集）；② 只读 ⇒ 前端按 `role` 隐藏写口并标注「副组长只读」。 | P2 |
| R7-21 | `docs/src/core/domain/material-links.js:15-17`；对照 `docs/src/core/domain/constants.js:221` | 材料闭环落点手写 `SECRETARY_ROLES = Set(['secretary','deputy-secretary'])`、`LEADER_ROLES = Set(['leader','deputy-leader'])`；`constants.js` 已有同义集合与 `ROLE_PAGE_MAP`。 | 角色集调整时落点判断漂移（例如副支书不再共台后，材料页仍给支书台链接）。 | **③ 单一源**：`SECRETARY_ROLES` 改 import `SECRETARY_AND_DEPUTY_ROLES`；`LEADER_ROLES` 由 `rolesForPage('leader.html')` 派生。 | P3 |
| R7-22 | `docs/src/workflow/definitions.js:13-15` | `WORKFLOW_ROLES = ['organizer','leader','secretary','disc-commissioner','prop-commissioner']` 手写，缺 `org-commissioner / deputy-secretary / deputy-leader`；仅用一条 `console.warn` 与 `ROLE_KEYS` 对齐。 | 新增角色不会自动进入工作流可操作角色；`requiredRoles` 用于状态机门时会把合法角色挡在外面。 | **③ 单一源**：从 `ROLE_KEYS` 派生（或按工作流语义显式声明并加守卫断言「每个键 ∈ ROLE_KEYS 且新增业务角色必须登记」）。 | P3 |
| R7-23 | `docs/src/services/branch/workforce.js:242-259`；对照 `docs/src/core/domain/work-map.js:104-233` | 模块 → 业务域的映射 `DUTY_DOMAIN` 手写 14 个模块 id，与 `WORK_MAP_MODULES` 平行维护。 | 新增工作模块时漏登记，履职待办会落到默认 `ACTIVITY` 域，分组与统计错位。 | **③ 单一源**：在 `work-map.js` 模块对象上声明 `domain` 字段，`workforce` 直接读；至少加守卫断言 `DUTY_DOMAIN` 键集 ≡ `WORK_MAP_MODULES` id 集。 | P3 |
| R7-24 | `docs/src/services/governance/secretary-overview.js:253-259` | 支书概况缺勤名单只取前 5 人，第 6 人起拼成不可点的「+N 人」。 | 这是需要处置的名单，却只能看到 5 人，无法下钻。 | **③ 现算 + 下钻**：「+N 人」改为跳「考勤总表 · 本月缺勤」筛选；或直接给完整名单折叠。上限用一个命名常量，不写 `5`。 | P3 |
| R7-25 | `docs/src/services/governance/today-summary.js:263` | 「近期安排」窗口写死 `7` 天。 | 时限口径调整须改代码；与制度参数无关联说明。 | **③ 常量/参数化**：提 `UPCOMING_WINDOW_DAYS`（如需支部可调则进 policy），文案同步引用。 | P3 |
| R7-26 | `docs/src/entries/tabs/disc/attendance-tab.js:281,529` | 待确认队列默认只显示 8 条（`QUEUE_VISIBLE = 8`），注释也写「默认 8 条」。 | 改上限只改一处尚可，但 8 这个数与「最近需处理」语义无关，属裸数字。 | **③ 命名常量 + 说明**：保留 `QUEUE_VISIBLE`，注释改为「默认预览条数」，不写具体数字；如需与其他队列统一，进统一表组件参数。 | P3 |
| R7-27 | `docs/src/core/domain/function-catalog.js:55-60` | 各工作台描述写死「12 tab / 10 tab / 8 tab / 8 tab / 10 tab / 11 tab」。当前与 `capabilities/*-workspace.js` 实测一致，但靠人工维护。 | 下一批 IA 调整即失同步，帮助页与真实页签不符。 | **③ 现算**：由 capabilities 注册表在构建/运行时生成计数，文案只写「见当前工作台」；至少加守卫比对实际 tab 数。 | P3 |
| R7-28 | `docs/src/core/domain/work-map.js:4`；`docs/src/data/mock/branches.js:15` | 注释仍写「11 项平铺放行」「现有 46 功能不变」；实际工作模块 14 项、页签 62 个。 | 按注释核对配置默认值会误判。 | **③ 去固定数字**：改为「见 `WORK_MAP_MODULES`」「见 capabilities 注册表」，需要计数处用 `.length`。 | P3 |

---

## 三、mock 未同步清单（8 条）

| 编号 | 文件:行号 | 现状 | 影响 | 建议（单一源 / 现算落点） | 优先级 |
|---|---|---|---|---|---|
| R7-29 | `docs/src/data/mock/people.js:7-66`；`docs/src/data/seed-manifest.js:40-44`；`docs/src/entries/pages/person-entry.js:296` | 人员模型/档案/编辑白名单已加 `enrollYear`（`docs/src/services/member/person.js:243,634`），但 51 名 mock 人员**全部没有该字段**，`SEED_MANIFEST.users.seedOwnedFields` 也未声明；档案届别因此 51 人全是 `—`。 | 新字段在演示形态永远空白；`seed-manifest` 与 parity 检查感知不到该字段（B-500-8 的「新字段进 manifest」未做到）。 | **③ 补种子 + 声明**：按学号前缀补届别（2023/2024/2025），`seedOwnedFields` 加 `enrollYear`；加一条 parity 断言「字段在档案读侧出现 ⇒ 必须在 manifest 声明且 mock 有值或显式 runtime」。 | P2 |
| R7-30 | `docs/src/core/domain/domain.js:432-447`；`docs/src/services/member/person.js:90-99` | `mockDB.users` 初始仍有 11 条 `u_*` 幽灵账号（`u_sec`…`u_exec`），`getAll()` 会把它们与 `PEOPLE` 合并进「人员全集」。 | 人员全集含非成员实体；姓名解析、删除守卫、按角色查找在部分读口可能命中幽灵；与「人员主键即学号」的口径并存。 | **③ 收口**：删除初始 `u_*`（登录与演示均由 `PEOPLE` + 服务端 `users` 承接）；若系统账号确需保留，另立 `systemAccounts` 域，禁止 `getAll()` 合并。 | P2 |
| R7-31 | `docs/src/entries/pages/login-entry.js:60`；`docs/src/services/core/auth.js:420-423`；`docs/src/data/mock/people.js:7-66`；`docs/src/data/mock/accounts.js:5-32` | 开发身份卡有「党小组副组长」，但 `PEOPLE` 无 `deputy-leader` 成员、账号表也无该角色；`devLogin` 找不到人时回落 `PEOPLE[0]`（第一组组长），却把 `role` 写成 `deputy-leader`。 | 点副组长卡实际以「第一组组长」的人档案登录，角色键与人档案不一致；留痕、权限判断与演示说明分裂。 | **③ 补 mock 与人选解析**：增一名同组 `role:'deputy-leader'` 成员与账号；`devLogin` 找不到对应角色时显式失败并提示，不回落 `PEOPLE[0]`；账号覆盖守卫加「每个可演示角色至少一人一账号」。 | P3 |
| R7-32 | `docs/src/data/mock/notices.js:13,43,53`；`docs/src/services/governance/notice.js:29-35` | 种子通知仍带旧全局 `read: true/false`；读侧迁移只把 `read===true` 回填给「当前登录人」。 | 同一条通知换人查看会得到不同未读；旧布尔与逐人 `reads[]` 两套事实并存。 | **③ 跟随新模型**：种子改为 `reads: []`（或按受众给若干真实 personId），删除 `read`；迁移代码只保留读旧库兼容。 | P3 |
| R7-33 | `docs/src/data/mock/attendance.js:28`；`docs/src/data/mock/review.js:98`；`docs/src/entries/tabs/visitor/attendance-tab.js:140`；`docs/src/entries/tabs/disc/review-tab.js:157,169` | 考勤 / 复盘的 `overdue` 是**存储在记录上的布尔快照**，读侧直接消费；只有补课完成时手写 `false`（`docs/src/entries/tabs/disc/makeup-tab.js:168`），没有按 `recordedAt / 活动日 + policy` 现算；新增记录一律写 `false`。 | 真实缺勤记录永远不会变成「已超期」（只有少数种子 `att10` / `att33` / `rev7` 为 `true`）；政策时限调整也不跟随。同一「逾期」在不同页面出现两种结果（纪检总表还会 OR 日期现算，成员台只读快照）。 | **③ 现算**：抽 `isAttendanceOverdue(record)` / `isReviewOverdue(review)`（读 policy 天数），页面与统计统一调用；mock 里只保留「日期已过」的记录，不再写死 `overdue`。 | P2 |
| R7-34 | `docs/src/data/mock/prop.js:35-42` | 宣传任务来源仍是自由文本「支部委员会 / 副支书 / 组织委员」，不是角色键或 personId。 | 角色改名或换人后来源不可解析；无法按来源做权限/统计。 | **③ 稳定键 + 现取展示名**：改 `sourceRole`（角色键）或 `sourcePersonId`；`source` 仅保留展示快照或删除。 | P3 |
| R7-35 | `docs/src/data/mock/taskforces.js:15,58,81,99,116,134,149,165`；`docs/src/data/mock/branches.js:34` | 8 个专班的 `manager` 一律写当前组织委员的学号，`branches.secretaryId` 写当前支书；角色换人后种子不跟随。 | 演示「统筹人 / 现任支书」长期是同一人，与实际角色派生结果可分离；人员迁移时还需逐条改。 | **③ 从角色派生**：mock 模块 import `PEOPLE`，`manager` 取 `role==='org-commissioner'`、`secretaryId` 取 `role==='secretary'`；或在字段旁明确标注「演示快照」。 | P3 |
| R7-36 | `docs/src/data/mock/seed.js:104-116` | 补课种子 `mk-seed-1` 截止 `2026-09-17`、状态仍 `pending`；到 2026-10-22 已逾期 35 天。 | 新部署首屏永远显示一条「已逾期」补课，演示态与今天的时间感脱节；逾期统计被一条假样本占位。 | **③ 相对日期生成**：种子截止改为「今天 − N 天」或「今天 + N 天」的相对值；若要保留逾期样本，字段注明 `demoFrozen: true` 并在说明中写明。 | P3 |

---

## 四、已消解（附当前代码证据）

> 以下旧条目均已在批次 500 学号主键迁移及其后修复中消解，**不重复计为新问题**。

| 旧条目 | 结论 | 当前证据 |
|---|---|---|
| 旧 09/13/24：`COMMITTEE_IDS` 写死 `p10~p14`、考勤种子支委 id 快照、委员会回退名单 | 已消解 | `docs/src/core/domain/constants.js:224-257`（删除常量、`getCommitteeIds` / `resolveCommitteeIds` 按角色现算）；`docs/src/data/mock/attendance.js:110-117`（支委＋组长从 `PEOPLE` 角色派生）；`server/routes/committee.js:12,16-19`（import `resolveCommitteeIds`，不再维护 id 快照） |
| 旧 10：纪检委员 `p10` 写死 | 已消解 | `docs/src/entries/tabs/disc/_shared.js:8-30`（`getDiscCommissionerId()` / `requireDiscCommissionerId()`，无角色显式失败）；全仓 `DISC_COMMISSIONER_ID` 0 命中 |
| 旧 11：登录态缺失回落 `|| 'pN'` | 已消解 | 全仓 `['"]p\d+['"]` 0 命中；写口统一取当前登录人（例：`docs/src/entries/tabs/leader/write-tab.js:499-503`） |
| 旧 12：新增成员 `generateId('p')` | 已消解 | `docs/src/services/member/person.js:399-403`（注释说明不再生成随机 p 前缀）；`server/routes/member.js:340-346`（`id = body.id || studentId`，缺学号 400）；`server/routes/iaaa.js:165-172`（IAAA 自助建号 `id = studentId`） |
| 旧 22 / F-13/F-14：baseline `p_pc`、删除防护按 `p_pc` | 已消解 | `server/seed-baseline.js:54-65`（`id = studentId`，`role:'party-staff'`, `branchId:null`）；`docs/src/services/member/person.js:742`（按 `role==='party-staff' || branchId===null` 跳过，不再用 id 字面量） |
| 旧 25/F-02：普通成员整表覆盖丢同支部数据 | 已消解（快照保留未见行） | `server/routes/resources/index.js:859-861`（`_retainRowScopedSnapshotRows` + `_retainUngatedSnapshotRows` + `mergeScopedSnapshotWrites` 三层合并）；`server/routes/resources/gates.js:386`、`server/routes/resources/branch-scope.js:293` |
| 旧 26 / R2-42：`committeeBroadcasts` 只写不读 | 已消解（停写） | `docs/src/data/mock-adapter.js:2187`（2026-10-20 P1-26「停止写入 committeeBroadcasts」；写入路径已删） |
| 旧 R2-31/32/33/35：mock 时间老化（活动/专班/假待办/考察 pending） | 已消解 | `docs/src/data/mock/activities.js`（act-10/15/16/21/22/27/29/30/31/36 均 `completed`，act-37 为 10/22 `published`）；`docs/src/data/mock/taskforces.js`（tf-001/005/006 `completed`，tf-002 `active` deadline 12/31）；`docs/src/services/governance/todo.js:1621-1651`（假待办已删）；`docs/src/data/mock/inspection.js:85-95`（仅 3 条 pending） |
| 旧 R2-34：宣传待办无活动父键、截止 12/31 | 已消解 | `docs/src/services/governance/todo.js:1631-1640`（`sourceId:'act-37'`, deadline 2026-10-29） |
| 旧 R2-37/39：通知种子发布者写死支书、注释说「当前有效」 | 已消解 | `docs/src/data/mock/notices.js:2`（历史通知注释）、`:181-190`（`createdBy` 缺省 `null`，`source='branch'`） |
| 旧 R2-49：通知已读是共享布尔 | 已消解 | `docs/src/services/governance/notice.js:29-35,59-76,620-625`（逐人 `reads[]`，只追加当前人）；`docs/src/data/mock/notices.js:160-189`（补受众 seed：all/leaders/committee/角色键） |
| 旧 R2-46/47：出勤率分母不一致 | 已消解 | `docs/src/services/activity/attendance.js:684-689`（`attendanceRateTone` 单一阈值：90 + `lowRateHint`）；`:702` 起 `summarizePersonAttendanceByRoster` 应到口径；`docs/src/components/dashboard/stats.js:64-73` 首页改用应到人次 |
| 旧 R2-01/05/06 中的「设置页支部信息」 | 已消解（归属说明） | `docs/src/entries/pages/settings-entry.js:569-573`（明确「官方名与类别归党委、页眉名与自述在换组织向导」并给内嵌向导按钮） |
| 旧 R2-15：预备期 12/9 个月写死 | 已消解 | `docs/src/core/domain/policy-defaults.js:136-146`（probation 参数）；`docs/src/entries/tabs/org/talent-tab.js:101-108`（从 policy 派生，整月差） |
| 旧 R2-40：宣传材料只写内存 | 已消解 | `docs/src/services/activity/archive.js`（`ArchiveStore` 单一写口）；`docs/src/data/mock-adapter.js` 与 `docs/src/data/api-adapter.js` 的 archiveRecords 写口；`server/test/archive-record-write.test.mjs` |
| 旧 R2-23/24：首页截断三处各写 | 已消解 | `docs/src/core/domain/constants.js:786-790`（`DASHBOARD_LIMITS`）；`docs/src/components/shell/header.js:377` 已引用 |
| `REVIEW_QUEUE` Q-23-9：api 形态 `getMembers()` 只返回静态种子 | 代码已消解（队列未回写） | `docs/src/services/member/person.js:333-336`（api 读 `mockDB.users`，不回退 `PEOPLE`）——建议本轮把队列该行标结 |

---

## 五、sample-diff 表（AI 假设 → 支书意图 → 偏差 → 可复用 Boolean 规则）

| # | AI 假设 | 支书意图（判据原话） | 偏差类型 | 可复用 Boolean 规则 |
|---|---|---|---|---|
| 1 | 「编辑模态里有输入框，就算这个字段有写入口」 | ①「检查是否有改写的入口」——入口要真的能落到数据 | 入口发现性 / 死入口 | `字段在模态有控件 && 触发按钮.focusFields 不含该字段 ⇒ 判「入口未暴露」`；`字段有控件 && 保存分支存在显式拒绝/无落库 ⇒ 判「死入口」，必须删除控件或开单写口` |
| 2 | 「学号能改＝人员主键迁移已完成」 | 「数据要跟着人走，改号不能把人锁在门外」 | 写读不同源 | `字段 ∈ {登录键, 主键, 外键} ⇒ 写口必须同笔更新所有读侧键；做不到则 readOnly=true`（布尔判据，不按字段名白名单） |
| 3 | 「mock 只是演示数据，不影响真值」 | ③「mock 的数据要跟着我们代码更新来更新」 | 模型新增字段 mock 未跟 | `字段出现在表单/读侧 ⇒ 必须 ∈ seed-manifest.seedOwnedFields ∪ runtimeFields`，且 `runtimeFields` 外必须有 mock 值；否则判未同步 |
| 4 | 「角色键进了 ROLE_KEYS 就全站生效」 | 「副组长可以共享同组组长工作台相关内容」＋权限要逐门核 | 集合追加 ≠ 门禁同步 | `新增角色键 ⇒ 全仓每个 Set([...roles]) / role=== 分支必须同批覆盖，或显式标注「该门不含此角色」`；未标注的漏覆盖即缺陷 |
| 5 | 「policy 默认值可以写进用户文案，反正只是说明」 | ②「工作流相关的硬编码要优化计算、呈现方式」 | 文案复述参数值 | `政策叶键 ∈ POLICY_OVERRIDABLE ⇒ 用户文案不得出现对应数字/枚举字面量`；只能插值当前值或写「默认值见设置」 |

---

## 六、遗留盘点（`CLAUDE.md` 乙部 `B-500-*` 与 `REVIEW_QUEUE`）

| 来源 | 事项 | 与本轮关系 | 判断 |
|---|---|---|---|
| `CLAUDE.md` B-500-1 | 第五轮 P2/P3：空态、反馈落点等 | 与本轮 R7-05～R7-13、R7-24～R7-28 同面 | **本轮可并入**：空值词表、快照列标注、上限常量一起做一批 |
| `CLAUDE.md` B-500-4 | 数据保留期策略（归档/通知/待办），须支书裁定后才允许 cleanup 删业务记录 | 与本轮 mock/历史行清理相邻 | **需支书裁**：本轮不触碰任何 cleanup；R7-32/R7-33 只改种子，不删业务数据 |
| `CLAUDE.md` B-500-7 | 待办派生迁到服务端（Plan B） | R7-14/R7-24/R7-25 仍是客户端派生 | **另批**：本轮只收单一源，不动 Plan B 架构 |
| `CLAUDE.md` B-500-8 | mock 真值持续：新表/新字段必须进 `seed-manifest` 并过 parity | R7-29/R7-33/R7-34/R7-35 直接命中 | **本轮可并入**：先把 `enrollYear` 补进 manifest 与 people，再补 parity 断言 |
| `CLAUDE.md` B-500-6 | 任命通用 CRUD 收口（绕语义端点） | 与 `branches.secretaryId` 种子（R7-35）相邻 | **暂不并入**：属写门收口，非数据生命周期 |
| `REVIEW_QUEUE` Q-23-9 | api 形态 `getMembers()` 只返回静态种子 | 代码已消解（`person.js:333-336`），队列仍记为「未闭环」 | **本轮可并入（结项）**：仅回写队列状态，不改代码 |
| `REVIEW_QUEUE` SOP-B-31③ | 演示库 `SEED_TASKS` 为旧形态、无 `executor` | `docs/src/data/mock/seed.js:11-22` 仍无 `assigneeId/executor/ddl` | **需支书裁/另批**：是否给种子任务补人；不属本轮「字段空值」，不占新编号 |
| `REVIEW_QUEUE` H-21/H-22 | IAAA 入站「选支部 / 待归属」承载面 | 与 `branchId:null` 语义、R7-30 的账号域相邻 | **另批**：`profile-access.js:14-18,36-40` 与工作组 `ownBranch` 已一致处理 `null`，本轮不再提新问题 |

---

## 七、本轮建议修（P1/P2）与登记（P3）

### 建议修（P1）

- **R7-01 学号写读同源**：在「人员主键重命名」端点落地前，先把档案页学号设为只读；端点需覆盖 `users.id`、会话、附件与 JSON 引用，并同步 mock 账号层。这是本轮唯一 P1。

### 建议修（P2，共 12 条）

1. **R7-02** 在册备注：在校隐藏、滞留可随状态保存；去掉「有控件但存不进」的死入口。
2. **R7-03** 阶段起始日：从 `memberChangeRequests` 派生回填；仍空则不渲染该行。
3. **R7-04** 宣传撰写人：默认当前登录人并必填；存量空值显示「未署名」。
4. **R7-14** 今日会议类型：由 `POLICY_DEFAULTS.attendance.meetingTypes ∪ {党小组会}` 现算。
5. **R7-15** 补课文案：类型与天数从 `makeupDefaultActivityTypes()` / `makeupDeadlineDays()` 插值。
6. **R7-16** 活动/任务/产出状态：在 `domain.js` / `constants.js` 建单一源并全站替换。
7. **R7-17** 缺省支部：前端 46 处、服务端 84 处（含排除面 23 处）统一走 `DEFAULT_BRANCH_ID` / `resolveBranchId`；`null` 保持「待归属」。
8. **R7-19** 组长活动类型：服务端两处合成一份常量。
9. **R7-20** 副组长写门：先裁定同权或只读，再统一 `ACTIVITY_WRITE_ROLES` / `activityOperationAllowed` 或前端隐藏写口。
10. **R7-29** `enrollYear`：mock 补届别、`seed-manifest` 声明、加 parity 断言。
11. **R7-30** `u_*` 幽灵账号：删除初始行或分域，禁止 `getAll()` 合并。
12. **R7-33** 逾期现算：考勤 / 复盘的 `overdue` 改为按日期 + policy 计算，页面不再读存储快照。

### 登记（P3，按屏概括）

- **个人档案屏**：R7-05 空值词表、R7-06 党委组织员不适用、R7-12 届别入口未高亮。
- **纪检屏**：R7-07 考勤快照四列、R7-11 组长/上传人缺失、R7-13 考察记录人历史空值、R7-26 队列 8 条。
- **组织屏**：R7-08 流动台账快照、R7-10 人才库学号/党小组、R7-23 模块→业务域平行表。
- **设置/概况屏**：R7-09 配置记录人、R7-24 缺勤名单 +N、R7-25 7 天窗口、R7-27 页签计数、R7-28 注释计数。
- **服务层**：R7-18 服务端角色字面量、R7-21 材料闭环角色集、R7-22 工作流角色集。
- **mock**：R7-31 副组长演示身份、R7-32 通知旧 `read`、R7-34 宣传任务来源、R7-35 专班 `manager` / 支部 `secretaryId`、R7-36 补课种子逾期。

---

## 附：只读声明

- 本报告是本次唯一新增文件；未修改任何产品代码、测试、其它文档，未 commit，未运行改数据的命令。
- 行号以 2026-10-22 当前工作区 Read/Grep 结果为准；`docs/src/data/mock-adapter.js`、`server/routes/resources/index.js` 等文件正由另一路改造，引用时已尽量避开其落点段；如后续该面再改动，以文件内同义代码为准。
- 跨组组织落点（`calendar-tab.js` / `workgroup-routes.js` / `activity-progress.js` / `activity-calendar-tab.js` 的落点字段）按任务约定未评。
