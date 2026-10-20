---
title: "数据生命周期审查（第二轮）"
type: audit
role: "[AI]"
last_updated: "2026-10-20"
status: "FINAL"
---

# 数据生命周期审查（第二轮）

> **审查性质**：只读审查。未修改任何产品代码、未 commit、未改动 `.ctx` 顶层文件；本报告是唯一新增文件。
> **审查范围**：`docs/src/**`、`server/**`（排除 `node_modules`、`.browsers`、`server/test`）、`content/04_web_design/data/DATA_MODEL.md`。
> **审查判据（支书第二轮口径）**：① 没有信息、又没有改写入口的占位＝死信息；② 工作流相关的状态 / 计数 / 日期 / 人数 / 支部 id / 角色集合一律应计算或派生，不写死；③ mock 跟着代码更新，不为旧 mock 削足适履。
> **背景基线**：批次 490 已把考察父键改为 `workgroupId`；页签 67→62，`tf-view` / `monitor` / `governance-overview` 已在相应台撤除；人员 id 仍为 `p*`，下一阶段拟改学号。

---

## 一、空值字段清单（逐字段、逐屏、逐写入口）

| 编号 | 类别 | 文件:行号 | 现状 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|
| 01 | 空值 | `docs/src/entries/pages/person-entry.js:268-269`；`docs/src/services/core/accounts.js:161-174`；`docs/src/components/governance/person-edit-modal.js:236,356` | 学号为空显示「未填写」，旁注「同时是登录账号」；学号可编辑（立即生效），但 mock 登录仍读静态 `MOCK_ACCOUNTS`，修改学号不会改账号。 | 改学号后旧学号仍能登录、新学号登不进；写入口与读侧（登录）不同源，属于典型「写入口存在但读侧不刷新」。 | 学号变更走「账号重命名」单一写口，同步 `MOCK_ACCOUNTS` / `gsm1921-accounts` / 服务端 `users.studentId`；否则档案页禁改并指向账号管理。 | P1 |
| 02 | 空值 | `docs/src/entries/pages/person-entry.js:102,276`；`docs/src/components/governance/person-edit-modal.js:237,356` | 「届别」缺失显示「未填写」，页面注记「仅新增时采集，本页只读」；但编辑模态已把 `enrollYear` 放进「立即生效」可改组。 | 文案与写入口矛盾，读者以为不能改；组织委员不知道可补。 | 改注记为「可在此补正」，并把 `enrollYear` 纳入「编辑组织事实」的 `focusFields`。 | P2 |
| 03 | 空值 | `docs/src/entries/pages/person-entry.js:110-112,288-289` | 「进入当前阶段」缺失显示「未填写」；仅阶段变更时系统同笔落 `developStageSince`，无人工更正入口，51 名种子人员几乎均为空。 | 档案页长期出现无信息占位；历史阶段起始日无法补录。 | 为空时不展示该行；或从 `memberChangeRequests` 审批历史回填；如允许更正，补受控入口并留痕。 | P2 |
| 04 | 空值 | `docs/src/entries/pages/person-entry.js:307`；`docs/src/components/governance/person-edit-modal.js:362,407-410` | 「在册备注」缺失显示 `—`；备注可编辑，但状态未变时 `submitMemberChange` 要求 `to ≠ from`，只弹「需随状态变更一并报确认」，备注单独永远存不进去。 | 用户看到可编辑字段却无法保存；备注与状态被强耦合，产生死写入口。 | 允许 `residenceNote` 单独走档案写口；或禁用它并在标签写明「随在册状态变更填写」。 | P2 |
| 05 | 空值 | `docs/src/entries/pages/settings-entry.js:557-562` | 支部名称 / 类别 / 页眉显示名 / 支部自述为空显示 `—`；本页只读，名称与类别归党委、自述在换组织向导。 | 读者看到 `—` 不知道去哪补。 | 值旁加归属说明；自述为空给「打开换组织向导」直达按钮。 | P3 |
| 06 | 空值 | `docs/src/entries/tabs/org/talent-tab.js:139-140` | 人才库学号 / 党小组为空显示 `—`，本页无编辑入口，只能点姓名进档案页。 | 组织委员需多跳一层才能补全。 | 保留只读，但姓名链接 `title` 明示「去档案补全」；或复用编辑模态加行内入口。 | P3 |
| 07 | 空值 | `docs/src/entries/tabs/org/member-flow-tab.js:245-250` | 流动台账的学号 / 届别 / 备注为空显示 `—`；这是登记时快照，事后没有改写入口。 | 历史行长期空列，无法核对；但按设计不应回改。 | 整列全空时隐藏；或标注「登记时未采集」，明确不提供入口。 | P3 |
| 08 | 空值 | `docs/src/entries/pages/person-entry.js:237,339` | 「角色」为空显示「无治理角色」，「所属支部」为空显示「支部未归属」；本页无写入口。 | 读者可能误以为可在本页补。 | 在 L0 / 系统说明标注治理字段的维护方（任命链 / 党委），避免把它当缺口。 | P3 |

> 结论：真正「无信息且无入口」的死信息集中在 **`developStageSince`（03）** 与 **`residenceNote` 单独保存（04）**；`enrollYear` 的问题是「有入口但文案说没有」（02），`studentId` 的问题是「有入口但登录读侧不刷新」（01）。

---

## 二、硬编码清单（工作流相关）

| 编号 | 类别 | 文件:行号 | 现状 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|
| 09 | 硬编码 | `docs/src/core/domain/constants.js:210`；`docs/src/data/mock-adapter.js:1603`；`server/routes/committee.js:16-21,96` | 支委五人名单写死 `p10~p14`；mock 广播另抄一份；旧活动无 `voteConfig` 时回退这五人。 | 支委改选或人员 id 迁移后，广播对象与旧活动表决人错误；两处副本可漂移。 | 名单从 `people.role + AuthStore.isCommissioner` 或 `resolveVoterIds('committee')` 派生；历史记录只保留 `voteConfig.voterIds` 快照，不再用全局常量回退。 | P1 |
| 10 | 硬编码 | `docs/src/entries/tabs/disc/_shared.js:8`；消费点 `disc/attendance-tab.js:653,824`、`disc/review-tab.js:352,408,427` 等 17 处 | 纪检委员 personId 写死 `p10`；虽已有 `getDiscCommissionerId()`，多数写 `recordedBy` / `annotatedBy` / 权限候选仍用常量。 | 纪检换人后留痕记到旧人；`canUploadAttendance(p10, …)` 会用固定人判断候选，实际登录人反而被忽略。 | 全部改用 `getDiscCommissionerId()`；写口取当前登录人，缺失时显式失败。 | P1 |
| 11 | 硬编码 | `secretary/overview-tab.js:54`（p1）、`secretary/todo-tab.js:567`（p13）、`leader/_shared.js:14,21`（p4）、`leader/members-tab.js:35`（p4）、`org/roster-tab.js:90`（p11）、`org/member-flow-tab.js:46`（p11）、`org/overview-tab.js:65`（p11）、`org/inspection-tab.js:223,291`（p13）、`prop/overview-tab.js:62`（p12）、`visitor/overview-tab.js:15`（p5）、`components/governance/member-change-panel.js:199`（p13）、`services/activity/taskforce.js:670-671`（p13）等 16 处 | 登录态缺失时把操作人 / 视角回落到固定 `p*`；支书概况甚至错误回落到 `p1`（组长）。 | 匿名或失效会话下写入归错人、数据串人；学号迁移后全部落空。 | 删除 `|| 'pN'`，统一 `requireActor()` 或 role→person 解析；不可解析则禁止写并提示重新登录；支书概况不得回落组长。 | P1 |
| 12 | 硬编码 | `docs/src/services/member/person.js:393-397` | 新增成员缺 id 时 `generateId('p')`，生成 `p_<uuid>`。 | 与 `p1..p50` 演示 id、以及下一阶段学号主键都不是同一形态；迁移后继续产生孤儿 id。 | 新增成员以 `studentId` 为 id（或明确代理键策略），禁止随机 `p` 前缀。 | P1 |
| 13 | 硬编码 | `docs/src/data/mock/attendance.js:107-110` | 支委班子 8 人写死 `p13,p14,p11,p12,p10,p1,p2,p4`，用于 act-27 出勤种子。 | 支委 / 组长换人后种子出勤名单与现行角色不符；id 迁移直接断。 | 用 `people.filter(role in …)` 或 `resolveVoterIds` 派生；组长按 `partyGroup` 派生。 | P2 |
| 14 | 硬编码 | `docs/src/core/domain/work-map.js:4` | 文件头仍写「11 项平铺放行」，实际 `WORK_MAP_MODULES` 为 14 项。 | 按注释核对会误判；模块增删后继续漂移。 | 去掉固定数字，写「见 `WORK_MAP_MODULES`」；需要计数处用 `.length`。 | P2 |
| 15 | 硬编码 | `docs/src/core/domain/function-catalog.js:55-60` | 各工作台描述写死「12 tab / 10 tab / 8 tab / 11 tab」。今日与实际 62 个页签一致，但靠人工维护。 | 下一批 IA 调整即漂移，帮助页与真实页签不一致。 | 由 capabilities 注册表在构建或运行时生成计数；至少加守卫比对。 | P2 |
| 16 | 硬编码 | `docs/src/services/governance/today-summary.js:31` | 会议类型集合写死 `支部党员大会/党课/组织生活会/党小组会`，与 `policy-defaults.attendance.meetingTypes`、`ACTIVITY_SUBTYPES` 三处口径。 | 制度参数改会议类型时「今天有会」不跟随。 | 读 `POLICY_DEFAULTS.attendance.meetingTypes`，并复用活动分类。 | P2 |
| 17 | 硬编码 | `docs/src/entries/tabs/leader/attendance-tab.js:88` | 可上传类型写死 `...MEETING_ATTENDANCE_TYPES, '党小组会', '主题党日'`。 | 类型体系调整后组长上传面错误。 | 由 policy + 活动分类派生，注释单一源。 | P2 |
| 18 | 硬编码 | `docs/src/core/domain/material-links.js:15-17` | `SECRETARY_ROLES` / `LEADER_ROLES` 手写角色数组，`constants.js` 已有同义集合。 | 角色键调整时材料闭环落点判断漂移。 | import `SECRETARY_AND_DEPUTY_ROLES`；副组长集合从 constants 派生。 | P2 |
| 19 | 硬编码 | `docs/src/entries/tabs/org/taskforce-tab.js:580-581`；`components/dashboard/gallery.js:95`；`activity-panel.js:93`；`components/record/calendar.js:494-495`；`entries/tabs/visitor/projects-tab.js:71`；`services/activity/activity.js:306`；`services/activity/taskforce.js:47`；`data/mock-adapter.js:869` | 终态 / 完成态数组 `['completed','cancelled']`、`['submitted','accepted','archived']` 多处手写，`domain.js` 已有 `TASKFORCE_TERMINAL_STATUSES` / `WORKGROUP_CLOSED_STATUSES`。 | 枚举增删时漏改一处即统计 / 按钮错。 | 统一 import 状态集合并封装 `isClosedStatus(kind, status)`。 | P2 |
| 20 | 硬编码 | `components/dashboard/gallery.js:95`、`activity-panel.js:93`、`record/calendar.js:494-495`、`visitor/projects-tab.js:71`、`services/activity/activity.js:306` | 反复写 `a.archived || ['completed','cancelled'].includes(a.status)`，与 `constants.isActivityEnded`（completed / archived）语义不同。 | 同一「已结束」判定有 3 套，筛选 / 展示结果可不同。 | 定义单一 `isActivityClosed`（含 cancelled）并从 constants 导出，全站替换。 | P2 |
| 21 | 硬编码 | `docs/src/data/mock/taskforces.js:11,52,68,86,102,119,134,150` | 8 个专班的 `manager` 一律 `p11`；`initiator` 分散写死。 | 组织委员换人后全部专班「统筹人」仍是旧人。 | 种子按 `role='org-commissioner'` 派生；`initiator` 按场景配置。 | P2 |
| 22 | 硬编码 | `docs/src/data/mock/branches.js:34`；`server/seed-baseline.js:55-58`；`server/seed.js:266,281,294,318,331` | 支书 `p13`、党委 `p_pc`、成员变更 / 申诉 / 审计种子均写死 `p*`；baseline 还以 id `p_pc` 建党委。 | 学号迁移需逐条改；生产自举的党委 id 与演示 id 混用。 | 集中一个 fixture / seed 常量层；生产 baseline 用学号或 UUID，并纳入迁移。 | P2 |
| 23 | 硬编码 | `docs/src/data/workgroup-seed-sync.js:83,110` | 迁移写入 `createdBy: 'mock-workgroup-migration'`（不是人），演示授权 `grantedBy: 'p_pc'`。 | `createdBy` 落在 personId 字段但查无此人；审计链断。 | 用系统 actor sentinel（如 `system:migration`）并让读侧识别；授权人用真实党委或系统。 | P3 |
| 24 | 硬编码 | `server/routes/committee.js:16-21,96` | 旧活动无 `voteConfig` 时用 `COMMITTEE_IDS`（p10~p14）作表决人。 | 历史活动重开表决时名单错误。 | 回退时按当前支委角色派生，或显式标记「历史名单不可用」。 | P2 |

---

## 三、mock 漂移清单（单列）

> 口径：mock 是演示数据，代码改了 mock 就要跟着改；本清单按「会直接造成断链 / 错误计数 / 无法演示」排序。

| 序号 | 对应编号 | 漂移点 | 证据 | 现状 | 建议 |
|---|---|---|---|---|---|
| M1 | 05 | 经验沉淀仍按名称关联 | `entries/tabs/disc/review-tab.js:345-353`（写）、`:105-108`（读） | 只写 `sourceName`；「已沉淀」判定按名称字符串比对。活动 / 专班改名后永久显示「未沉淀」或错误合并。 | 写 `sourceType + sourceId`（活动 `activityId` / 专班 `workgroupId`），`sourceName` 仅展示快照。 |
| M2 | 06 | 专班复盘仍只有 `sourceName` | `data/mock/review.js:158-182`；`services/governance/review.js:192-195` | `TASKFORCE_REVIEW_RECORDS` 无 `workgroupId` / `taskforceId`；读侧用名称兜底。 | 种子补 `workgroupId`（`wg-taskforce-tf-001` / `tf-004`）与 `taskforceId`，读侧走稳定键。 |
| M3 | 09 | 通知种子未跟新受众模型 | `data/mock/notices.js:1-45`；`server/seed.js:94` | 没有 `audience` / `branchId` / `source`，全部被当作「无受众 = 广播」。 | 补 sentinel 受众、支部归属、发布者；至少覆盖「全体党员 / 组长 / 指定人」三态。 |
| M4 | 13 | 考勤种子写死支委 8 人 | `data/mock/attendance.js:107-110` | `_BRANCH_COMMITTEE_IDS` 是 p* 快照，与角色派生名单不联动。 | 用 `people` 的角色 / 党小组派生，或从 `resolveVoterIds('committee')` 取。 |
| M5 | —（本节） | 账号数显著少于名册 | `data/mock/accounts.js:5-26` | 51 名 people 仅 18 个账号；第三党小组组长 `p4` 无账号；注释称「50 人规模扩充账号」实际只补 7 个。 | 至少补齐 `p3` / `p4` 及每个角色样本；或明确「演示账号子集」并加角色覆盖守卫。 |
| M6 | 21 | 专班复盘 / 操作人仍写 p* | `data/mock/review.js:163,175`；`data/mock/taskforces.js:11,52…` | `organizerId: 'p11'`、`manager: 'p11'` 等来自旧演示身份。 | 按当前角色 / 成员派生，或在种子上标注「演示快照」。 |
| M7 | —（本节） | 成员变更申请状态与数据字典不一致 | `docs/src/data/mock-adapter.js:1577-1641`；`core/domain/domain.js:553-555` | 实际为 `pending-org-approval → pending-secretary → completed`；typedef 写 `pending/approved/rejected`。 | 以实际状态更新 typedef 与 `DATA_MODEL.md`，或统一状态枚举。 |
| M8 | —（本节） | 专班考察种子写死工作组 id | `data/mock/inspection.js:37,39` | 直接写 `wg-taskforce-tf-001` / `wg-taskforce-tf-004`，与 `wg-taskforce-${id}` 约定重复。 | 先跑 `ensureLegacySourceWorkgroups`，从 `tf.workgroupId` 取；种子里不写派生 id。 |
| M9 | —（本节） | mockDB 初始 `u_*` 幽灵账号 | `core/domain/domain.js:434-449`；`services/member/person.js:91-99` | 初始 `users` 有 11 个 `u_*`，不在 `PEOPLE`，但 `getAll()` 会合并进人员全集。 | 删除初始 `u_*`，或把「系统账号」与「成员档案」分域，禁止 `getAll` 混用。 |
| M10 | —（本节） | 宣传任务来源是自由文本 | `data/mock/prop.js:35-42` | `source: '副支书' / '组织委员' / '支部委员会'`，不是 personId / role key。 | 改 `sourceType/sourceId` 或 `role` 键；展示名现取。 |

---

## 四、死读取 / 只写不读 / 写而不刷新

| 编号 | 类别 | 文件:行号 | 现状 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|
| 25 | 死读取 | `docs/src/services/member/person.js:443-509` | `findMemberRefs` 只查 13 个域：branches / activities.assignments / assignments / attendances / inspections / taskforces.members / signups / agendaVotes / thoughtReports / activityReviews / taskforceReviews / memberChangeRequests / committeeBroadcasts。 | 缺 `workgroups`、`workgroupMembers`、`workgroupGrants`、`workgroupTasks`、`workgroupOutputs`、`todos`、`notices`、`reviewRequests`、`memberFlows`、`partyGroups`、`branchDocs`、`fileSpaceRecords`、`imageRecords`、`auth_audit`、`handoffs`、`attendance_appeals`、`inspection_appeals`。删除守卫会漏判，学号迁移也会漏改。 | 迁移前把引用清单做成单一源（表名 + 字段），覆盖全部 person 引用域，并加单测逐表断言。 | P1 |
| 26 | 死读取 | `docs/src/data/mock-adapter.js:1598-1614`（写）；仅 `services/member/person.js:505-508` / `member-confirmation.js:376-379` 读 | 审批通过后写 `committeeBroadcasts`（5 条 / 申请），但没有任何页面 / 组件展示或消费；真正送达靠 notice。 | 只写不读的「广播」数据持续堆积；删除守卫还会被它误拦；用户看不到广播。 | 要么在支委台 / 待办呈现「支委广播」，要么停止写该域并迁移 / 清理存量。 | P1 |
| 27 | 漂移 | `docs/src/components/governance/person-edit-modal.js:238`；`docs/src/services/member/roster-ui-logic.js:99-113` | 党小组是自由文本输入，未校验是否属于 `groupOptions()`。 | 写成「第一组 / 第一党小组 」即产生孤儿组；统计、改名、解散漏人。 | 改为活组下拉 / 可搜索选择，写入前校验组名存在。 | P2 |

> 说明：学号「写入口存在但登录不刷新」已并入编号 01，不重复计条。

---

## 五、计算口径重复（同一指标多处各算一遍）

| 编号 | 类别 | 文件:行号 | 现状 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|
| 28 | 重复计算 | `docs/src/services/member/roster.js:190-204`；`docs/src/services/member/branch-roster-import.js:61-80`；`docs/src/services/branch/org-base-data-preview.js:123-142` | 「应到 / 在册党员 / 滞留剔除」三份实现，公式逐字重复。 | 参数或口径改动漏一处，名册、导入、换组织向导数字不一致。 | 抽 `computeRosterStats(members, cfg)` 单一纯函数，三处调用。 | P2 |
| 29 | 重复计算 | `docs/src/services/governance/secretary-overview.js:176-178`；`components/governance/work-overview.js:75-83`；`services/governance/today-summary.js:202`；`services/governance/todo.js:611-617` | 逾期待办四套实现：两处手写 `deadline < today`，一处 `isTodoExpired`，一处 `_groupExpiredCount`。 | 同一待办在不同页「逾期」状态不一致。 | 全部走 `isTodoExpired`；`overdueCount` 由 `getGroupedByAction` 统一派生。 | P2 |
| 30 | 重复计算 | `docs/src/services/governance/secretary-overview.js:218-244`；`docs/src/entries/tabs/visitor/attendance-tab.js:92-98`；`docs/src/services/activity/attendance.js:587-660` | 出勤率三处各算（支书概况、成员台、纪检导出 / 服务层）。 | 本月 / 全周期、含不含 `made_up` 的口径可能不同。 | 统一调用服务层 `summarizePersonAttendance` / `summarizeMonthAttendance`，页面只渲染。 | P2 |
| 31 | 重复计算 | `docs/src/services/governance/secretary-overview.js:173-175`；`components/governance/work-overview.js:75-83`；`components/record/todo-tab-shell.js:484-485`；`services/governance/today-summary.js:211-215` | 待办总数 / 角标 / 逾期各算一遍。 | 角标与列表数字不一致。 | 由单一 `summarizeTodos(groups)` 产出 `{total, overdue, dueToday}`。 | P2 |

> 说明：发展阶段总人数目前只在 `secretary-overview.js:282-291` 一处按阶段汇总；`org-base-data-preview` 只算「正式 / 预备」二值，不属于同一指标，故不列为重复。

---

## 六、人员 id 迁移影响面（下一阶段学号迁移清单）

### 6.1 存储层事实

- 服务端业务表全部是 `id TEXT PRIMARY KEY, data TEXT` 的 JSON 表（`server/db.js:45-68`），**没有 personId 外键、没有二级索引**；迁移必须**重写 JSON 内的字段值**，不是改列。
- 真正是 SQL 列的人员引用只有三处：`users.id`（主键，即当前 personId）、`sessions.person_id`（`server/db.js:48`）、`attachments.uploaded_by`（`server/db.js:56`）。
- 其余表的人员引用都在 `data` JSON 里；`server/seed.js` 直接以 `PEOPLE` 播种 `users`（`server/seed.js:91`）。

### 6.2 表 / 字段引用清单

| 表 / 集合 | 引用字段 | 说明 |
|---|---|---|
| `users` | `id` | 当前 personId 主键；`studentId` 为登录账号（语义上应一致，实际未同步） |
| `sessions` | `person_id` | SQL 列 |
| `attachments` | `uploaded_by` | SQL 列 |
| `branches` | `secretaryId` | 现任支书；`mock/branches.js:34` 写死 `p13` |
| `appointment_records` | `secretaryId`、`appointedBy` | 任命链 |
| `activities` | `organizer`、`createdBy`、`assignments[].personId`、`voteConfig.voterIds[]`、`supervisor`、`executor` | `executor` 可能为 `u_exec` 幽灵 |
| `assignments` | `assigneeId`、`createdBy` | 活动分工 |
| `attendances` | `personId`、`recordedBy`、`studentId`（快照）、`partyGroup`（快照） | 考勤 |
| `inspections` | `personId`、`recordedBy` | 考察；专班父键 `workgroupId` |
| `taskforces` | `manager`、`initiator`、`members[].personId` | 专班 |
| `workgroups` | `createdBy`（含 `mock-workgroup-migration` 伪主体） | 工作组 |
| `workgroup_members` | `personId`、`createdBy` | 工作组成员 |
| `workgroup_grants` | `personId`、`grantedBy`、`revokedBy` | 授权 |
| `workgroup_outputs` | `submittedBy` | 产出 |
| `attendance_rosters` | `personIds[]`、`frozenBy` | 冻结应到名单 |
| `notices` | `audiencePersons[]`、`createdBy` / 发布者、`targetId`（非人员） | 通知 |
| `todos` | `assigneeId`、`createdBy`、`actionData` 中的人员引用 | 待办 |
| `signups` | `personId`、`reviewedBy` | 报名 |
| `makeup_tasks` | `personId`、`personName`（快照） | 补课 |
| `activity_reviews` / `taskforce_reviews` | `organizerId`、`annotatedBy`、`confirmedBy` | 复盘 |
| `thought_reports` | `personId`、`personName`（快照） | 思想汇报 |
| `member_change_requests` | `personId`、`by`、`decidedBy` | 成员变更 |
| `member_confirmations` | `personId`、`by`、`decidedBy` | 名册变更确认 |
| `committee_broadcasts` | `recipientId` | 只写不读 |
| `agenda_votes` | `personId`（或 `voterId`） | 线上表态 |
| `review_requests` | `submittedBy`、`decidedBy` | 上报党委 |
| `party_groups` | `createdBy`、`dissolvedBy` | 党小组 |
| `member_flows` | `personId`、`by`、`revokedBy`、`name` / `studentId`（快照） | 成员流动 |
| `branch_docs` | `createdBy`、`uploadedBy` | 支部文件 |
| `file_space_records` / `image_records` | `uploadedBy` | 附件 / 图片 |
| `external_dispatches` | `senderId`、`confirmedBy` | 外发确认 |
| `issues` | `assignee`、`_realPersonId`、`dispatchHistory[].by/to`、`participants[]` | 意见反馈（匿名真身受保护） |
| `issue_unread` | `assigneeId` | 反馈未读 |
| `auth_audit` | `targetPersonId`、`authorizedBy` | 授权审计 |
| `attendance_appeals` / `inspection_appeals` | `personId`、`handledBy` | 申诉 |
| `handoffs` | `from` / `to` / `ownerId` 等人员引用 | 三委交接 |
| `milestones` | 无 personId | 批次里程碑 |

### 6.3 前端硬编码 / 读取面

- `docs/src/core/domain/constants.js:210` `COMMITTEE_IDS = ['p10'..'p14']`；`docs/src/data/mock-adapter.js:1603` 同内容副本。
- `docs/src/entries/tabs/disc/_shared.js:8` `DISC_COMMISSIONER_ID = 'p10'`；16 处 `|| 'pN'` 兜底（见编号 11）。
- `docs/src/services/member/person.js:397` 新增成员 `generateId('p')`；`vote-config.js:58-62` 用 `!p.id.startsWith('u_')` 过滤幽灵账号。
- `docs/src/data/mock/**`：people p1~p50 + p_pc；accounts 18 条；activities / attendance / inspection / taskforces / review / seed / branches 大量 p* 字面量。
- `docs/src/services/member/person.js:443-509` 引用守卫清单（不完整，见编号 25）。
- 会话 / URL：`?id=<personId>`（person.html）、`?tab=` 深链不受影响；`localStorage` 登录键 `gsm1921-login-user` / `gsm1921-session-snap` 存 `{personId, role}`，迁移时需同步刷新。
- 冗余姓名 / 学号快照（不应作为身份键）：`makeupTasks.personName`、`thoughtReports.personName`、`memberFlows.name/studentId`、`attendances.studentId/partyGroup`、`workgroupOutputs` 等。

### 6.4 迁移前置结论

1. **先补引用清单，再迁 id**：`findMemberRefs` 目前漏 17+ 个域，直接迁移会留下孤儿引用（编号 25）。
2. **先处理写死名单**：`COMMITTEE_IDS`、`DISC_COMMISSIONER_ID`、16 处 `|| 'pN'`、`generateId('p')` 必须先改为角色 / 当前登录人派生（编号 09–12）。
3. **SQL 列三处 + JSON 全部**：`users.id`、`sessions.person_id`、`attachments.uploaded_by` 用 SQL 迁移；其余表用 JSON 重写脚本，需保留原始 p* 作为历史快照或映射表。
4. **登录链路单独验证**：mock `verifyLogin` 走 `MOCK_ACCOUNTS` / `gsm1921-accounts`，api `/login` 走 `users.id`；两条链路必须同一映射（编号 01）。

---

## 七、共识 5 条

1. **工作流相关的状态、计数、名单、日期一律派生，不写死**：`COMMITTEE_IDS`、`DISC_COMMISSIONER_ID`、`|| 'pN'`、`_BRANCH_COMMITTEE_IDS`、`manager: 'p11'` 都属于必须清除的硬编码。
2. **mock 必须跟着代码走**：考察父键已改 `workgroupId`，复盘 / 沉淀 / 通知种子仍停在 `sourceName` 与旧受众模型，属于明确的 mock 漂移，不能反过来让代码兼容旧 mock。
3. **空值占位必须二选一**：要么有可用的写入口（并保证读侧刷新），要么明确标注「只读 / 由谁维护 / 不适用」；两者都没有的字段应从界面撤下。
4. **人员 id 迁移前必须先有完整引用清单**：现有 `findMemberRefs` 只覆盖 13 个域，不足以支撑学号迁移；先补清单和守卫，再动数据。
5. **同一指标只能有一个计算函数**：应到 / 在册党员、待办 / 逾期、出勤率、阶段人数目前各有多份实现，页面只应渲染，不应各算一遍。

## 八、分歧 3 条

1. **学号是否直接作主键**：一种意见是按支书要求直接把 `personId` 换成学号，历史记录同步改写；另一种意见是保留 `p*` 作为不可变代理键、把学号做成唯一业务键，历史快照不改。分歧点在「历史留痕不可变」与「全站 id 统一」之间，需支书裁定。
2. **`developStageSince` 是否允许人工更正**：一种意见是保持「系统随阶段变更落档」、为空就不展示；另一种意见是允许组织委员补录历史起始日（需留痕）。分歧点在「系统派生」与「历史补录」。
3. **`sourceName` 存量如何收口**：一种意见是一次性迁移脚本按名称回填 `sourceId` / `workgroupId` 后彻底停用名称关联；另一种意见是读侧长期保留名称兼容、只对新数据写稳定键。分歧点在迁移成本与「同名 / 改名」断链风险。

---

## 附：审查方法与只读声明

- 逐文件实读：`person-entry.js`、`person-edit-modal.js`、`person-profile-sections.js`、`self-profile.js`、`person.js`、`accounts.js`、`roster.js`、`branch-roster-import.js`、`org-base-data-preview.js`、`secretary-overview.js`、`work-overview.js`、`today-summary.js`、`todo.js`、`disc/review-tab.js`、`disc/_shared.js`、`activities.js`、`attendance.js`、`inspection.js`、`review.js`、`taskforces.js`、`notices.js`、`prop.js`、`branches.js`、`people.js`、`accounts.js`、`domain.js`、`constants.js`、`work-map.js`、`function-catalog.js`、`material-links.js`、`workgroup-seed-sync.js`、`server/db.js`、`server/seed.js`、`server/seed-baseline.js`、`server/routes/committee.js`、`server/routes/member.js`、`DATA_MODEL.md` 相关章节。
- 辅助检索：`未填写` / `—` / `暂无` / `未设置` / `sourceName` / `workgroupId` / `personId` / `p\d+` / `COMMITTEE_IDS` / `DISC_COMMISSIONER_ID` 等关键词全仓扫描。
- **未修改任何产品代码；未 commit；本报告之外未写入 `.ctx`。**
