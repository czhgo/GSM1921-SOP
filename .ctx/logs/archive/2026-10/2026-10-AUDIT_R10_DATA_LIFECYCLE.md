---
title: "第十轮数据生命周期审查：空字段・硬编码・mock 漂移・读写闭环"
type: audit_report
role: "[AI]"
last_updated: "2026-10-23"
status: active
round: 10
related_files: [.ctx/logs/2026-10-AUDIT_R7_DATA.md, .ctx/logs/2026-10-AUDIT_R9_DATA_STRUCTURE.md, .ctx/logs/2026-10-AUDIT_R10_DATA_LIFECYCLE.md, docs/src/data/seed-manifest.js, docs/src/workflow/sopData.js]
---

# 第十轮数据生命周期审查（R10）

> **审查性质**：四路并行只读审查，未修改任何产品代码、测试、schema、种子或文档；所有 `文件:行号` 均按 2026-10-23 当前工作区实际 Read/Grep。
> **四路 lens**：A 空字段与死入口；B 与工作流相关的硬编码；C mock / 种子与代码漂移；D 写—存—读—权限—归属闭环。
> **与旧报告的关系**：R7 已修项只标「已消解 + 证据」，不重开；R9 四条 P1 在本轮做复核（见 §五）。

## 一、总数

| lens | 条数 | P1 | P2 | P3 |
|---|---:|---:|---:|---:|
| A 空字段与死入口 | 15 | 1 | 6 | 8 |
| B 工作流硬编码 | 23 | 3 | 10 | 10 |
| C mock / 种子漂移 | 20 | 5 | 11 | 4 |
| D 读写闭环 | 17 | 4 | 8 | 5 |
| **合计** | **75** | **13** | **35** | **27** |

## 二、五个跨面主题（决定本轮的修法顺序）

1. **种子归类错误会回滚用户编辑（C01–C04，P1）**：`seed-manifest` 把活动标题/日期/地点、通知正文与受众、党小组组名/备注、思想汇报正文与提交时间仍列为 `seedOwnedFields`；而 502/503 已确立「运行时字段不得被 repair 回滚」。这不是演示数据小瑕疵——mock 形态每次加载都执行修复，用户改完刷新即被改回，且会出现「标题回旧、详情保留」的半新半旧记录。
2. **语义写口不推进集合版本（D02、D12、D16，P1/P2）**：系统通知、通用资源 POST/PATCH/DELETE、工作组成员/授权/产出单条写口都只改行、不 bump `collection_versions`；另一台设备用旧 baseline 做整表快照写回时不会 409，能把别人刚写的行整批删掉。这是**跨端丢写**，优先于任何 UI 修复。
3. **SOP 生成的任务与现行制度相反（B01–B03，P1）**：支委会仍生成签到/考勤/汇总（制度：支委会不考勤）；党小组会考勤执行人写死纪检（制度：该场组织者/本组组长）；复盘任务锚点写死 T+7（制度参数：10 天）。任务一生成就不可执行，且会让纪检待确认队列出现死项。
4. **空值/读错源让用户「看不见已写入的事实」（A01–A07）**：流入成员发展阶段为空 → 被排除在应到/表决名单外且无人提示；会议正式名单读的是 `assignments`；组织者、通知收发人、专班工作考察都读了兼容镜像或错误集合。修法以「读对源 + 给出补录入口」为主，不是加文案。
5. **mock 与 API 的能力不对等（C13/C14/C16）**：mock 种子修复只覆盖 11 个集合（服务端覆盖全部 manifest），8 个集合只有服务端种子；mock 适配器缺工作组终态写门（API 409、mock 成功）。演示形态因此会掩盖真实缺陷，也会让「削足适履」的特判活下来（C15：产品为 `u_org/u_prop` 幽灵账号兜底）。

## 三、A 空字段与死入口（15 条）

| 编号 | 级别 | 结论 | 证据 | 修法 |
|---|---|---|---|---|
| A01 | P1 | 流入成员 `developStage` 为空 ⇒ 不算党员，被静默排除在应到/表决名单外 | `org/member-flow-tab.js:296-317`、`services/member/member-flow.js:122`、`services/member/person.js:501-507`、`services/member/roster.js:118-120` | 阶段改必选枚举；历史空值显示「未登记（组织委员可补）」并派生补录待办 |
| A02 | P2 | 「会议正式名单」读 `assignments` 项目角色，不是应到名单 | `entries/pages/activity-entry.js:289-292,573-584`、`mock/activities.js:89` | 优先读冻结应到快照，未冻结按 `getMeetingRosterIds` 现算；文案改「应到名单」 |
| A03 | P2 | 组织者只读 `act.organizer`；为空时「转交组织者」必失败 | `activity-entry.js:296-298,343-344,420-428`、`governance/organizer-transfer.js:43-48` | 从 `assignments/workgroup_members` 派生；无组织者时改「指定组织者」 |
| A04 | P2 | 专班「工作考察」读复盘，且按名称匹配 | `activity-entry.js:824,868-870`、`services/governance/review.js:165-193`、`mock/inspection.js:37` | 按 `taskforceId/workgroupId` 读考察；若语义是复盘则改名 |
| A05 | P2 | 通知详情不读 `publishedBy/audience` ⇒ 副支书显示「支书」、私信显示「全体党员」 | `entries/pages/notice-entry.js:88-110,122-123`、`governance/notice-view.js:221-223`、`services/governance/notice.js:762-766` | 优先真实发布人/受众字段，最后才回退模块推断 |
| A06 | P2 | 党小组卡只读 `g.leaderId`，不合并审计赋权 ⇒ 同屏「已设组长」与「未设置」并存 | `secretary/group-progress-tab.js:427,436` vs `:289-333`、`services/member/group-view.js:56,61` | 卡片与清单行共用同一两源合并判据 |
| A07 | P2 | 活动详情不显示 `time/host/description`（已采集） | `activity-entry.js:523-543`、`components/record/inspector.js:1437-1450` | 标题下补时间/地点/主持人/说明；空值整行不渲染 |
| A08 | P3 | 组长台用 `confirmer === '—'` 判待确认，与纪检台「自动确认」冲突 | `leader/attendance-tab.js:266`、`services/activity/attendance.js:583-584`、`disc/attendance-tab.js:474-475` | 统一 `isAttendanceConfirmed` 与自动确认判据 |
| A09 | P3 | 流入台账「备注」有读无写 | `org/member-flow-tab.js:260,296-317`、`services/member/member-flow.js:107,141` | 表单加选填备注，或删列 |
| A10 | P3 | 归档材料 `uploadedBy` 写入但全站无读取 | `prop/archive-tab.js:1007-1058`、`entries/pages/archive-entry.js:326-340` | 归档行/详情显示上传人 |
| A11 | P3 | 跨组组织者说明 `organizerExceptionReason` 只写不读 | `secretary/calendar-tab.js:1600-1616`、`leader/write-tab.js:1144-1174` | 活动详情与归档详情展示 |
| A12 | P3 | 专班 `tf.task` 空态提示「尚未登记」，但本页无入口 | `activity-entry.js:836,854-859`、`org/taskforce-tab.js:1454,602-604` | 给编辑入口或组织台深链 |
| A13 | P3 | 通知 `expireDate` 有读无写，归档页「自然过期」对新通知永不触发 | `secretary/notification-tab.js:258-273`、`archive-entry.js:183` | 发布加有效期，或删自然过期分支 |
| A14 | P3 | 工作地图停用项显示「未指派」，与「停用/可重新启用」混在一起 | `secretary/work-map-tab.js:89-98` | 显示「已停用」并给启用落点 |
| A15 | P3 | 名册学号表单可留空，但写口强制学号，错误不落字段 | `org/roster-tab.js:459`、`services/member/roster-ui-logic.js:83`、`services/member/person.js:491-493` | 表单标必填 + 字段级 `aria-invalid` |

## 四、B 工作流硬编码（23 条）

| 编号 | 级别 | 结论 | 证据 | 正确来源 / 修法 |
|---|---|---|---|---|
| B01 | P1 | 支委会 SOP 仍生成签到/考勤/汇总任务 | `workflow/sopData.js:82-86`、`core/domain/policy-defaults.js:52-53`、`services/activity/attendance.js:161-173` | 按 `noAttendanceTypes` 过滤；预览同步 |
| B02 | P1 | 党小组会考勤执行人写死纪检 | `sopData.js:57-61`、`policy-defaults.js:81` | 按 `recorderByType` + 组织者生成 |
| B03 | P1 | 复盘 T+7 / `timeOffset:7`，制度 `deadlineDays:10` | `sopData.js:21-29`、`services/governance/todo.js:1632-1633`、`policy-defaults.js:155` | 由 policy 现算（提醒与截止分节点） |
| B04 | P2 | 补课 T+7 文案两处，`makeupScopeHint()` 零消费 | `disc/makeup-tab.js:94`、`settings-entry.js:1283`、`services/activity/makeup.js:60-77` | 接 helper，不再复述天数 |
| B05 | P2 | 任务/产出终态集合服务端与 mock 各一份 | `workgroup-routes.js:168,171`、`mock-adapter.js:2644-2645`、`domain.js:646-678` | 引 `TASK/OUTPUT_TERMINAL_STATUSES` |
| B06 | P2 | 活动历史状态集合含非法 `executed` | `resources/index.js:502`、`domain.js:681-690` | 改 `isActivityClosed()` |
| B07 | P2 | 工作组 id `wg-{kind}-{id}` 至少 5 处内联 | `activity-workgroup-sync.js:17-21`、`workgroup-routes.js:59`、`db.js:270,297` | 导出 `workgroupIdFor()` 单一源 |
| B08 | P2 | 通知提前量 5/2/1 天在文案与 `timeOffset` 各写一份 | `sopData.js:19,24,39,56,81` | 命名常量/现算 |
| B09 | P2 | `definitions.js` 逐字段复制 SOP 任务 | `workflow/definitions.js:202-210`、`sopData.js:16` | 只存 `sopTaskId`，渲染时查表 |
| B10 | P2 | 域参数管理权「角色→可改节」前后端两份 | `services/branch/branch.js:502-507`、`resources/index.js:927` | 由 `POLICY_OVERRIDABLE` 派生 |
| B11 | P2 | `committee` 受众 sentinel 未进单一源 | `constants.js:968-976`、`services/governance/notice.js:164-169,698-705` | 增显式 sentinel |
| B12 | P2 | 应到统计公式三份 | `services/member/roster.js:128-151`、`branch-roster-import.js:59-80`、`org-base-data-preview.js:122-142` | 导出 `computeRosterStats()` |
| B13 | P2 | 流程图写「支委会纪检签到考勤/补课」，与制度相反 | `core/domain/mermaid-sources.js:33-50` | 先修 B01/B02，再由数据派生 |
| B14 | P3 | 专班终态集合手写，归档页与专班页口径不一 | `archive-entry.js:140-142`、`org/taskforce-tab.js:80-82`、`domain.js:113-117` | 引 `TASKFORCE_TERMINAL_STATUSES` |
| B15 | P3 | 「未来 7 天」窗口写死 | `services/governance/today-summary.js:274-278` | 命名常量 |
| B16 | P3 | 两档落点 / `cross-group` 裸字面量 | `org/activity-calendar-tab.js:141-144`、`leader/write-tab.js:1170-1172` | 引 `ACTIVITY_SCOPES`；补 `RECRUITMENT_SCOPES` |
| B17 | P3 | 组长可上传类型重复已有单一源 | `leader/attendance-tab.js:88`、`constants.js:1102` | 引 `LEADER_CREATABLE_ACTIVITY_TYPES` |
| B18 | P3 | 考勤状态白名单字面量 | `workgroup-routes.js:350`、`domain.js:285-290` | 引 `AttendanceStatus` |
| B19 | P3 | 复盘状态中文比较字面量 | `policy-defaults.js:448`、`disc/review-tab.js:145` | 引 `ReviewStatus` |
| B20 | P3 | 角色集合字面量 | `semantic-routes.js:210`、`workflow/definitions.js:13` | 引 `SECRETARY_AND_DEPUTY_ROLES` / `ROLE_KEYS` |
| B21 | P3 | 补课种子固定日期已逾期 36 天 | `mock/seed.js:103-117` | 相对日期生成 |
| B22 | P3 | 下载模板写死三个党小组名 | `services/member/branch-roster-import.js:95`、`org-base-data-preview.js:86` | `groupOptions()` 生成 |
| B23 | P3 | 工作流 SLA 小时数硬编码且无制度出处 | `workflow/definitions.js:22-91`、`engine.js:348-357` | 先裁定可调性，再入 policy/常量 |

## 五、C mock / 种子漂移（20 条）

| 编号 | 级别 | 结论 | 证据 | 修法 |
|---|---|---|---|---|
| C01 | P1 | 党小组名/备注被 seed 修复回滚，组名与成员档案分裂 | `seed-manifest.js:65`、`services/member/party-group.js:146-183`、`mock-adapter.js:784-817` | `name/note` 归 `runtimeFields` |
| C02 | P1 | 思想汇报重交内容/时间被修复撤回 | `seed-manifest.js:266`、`services/governance/thought-report.js:311-316` | `content/submittedAt` 归 runtime |
| C03 | P1 | 活动标题/日期/地点被回滚，详情/主持人保留 | `seed-manifest.js:89-96`、`inspector.js:1458-1473` | 内容字段归 runtime |
| C04 | P1 | 通知编辑被回滚且 `audience` 与 `audienceLabel` 分裂 | `seed-manifest.js:198-202`、`notice.js:511` | 可编辑字段归 runtime |
| C05 | P1 | 取消活动 `act-20` 派生 `active` 工作组 | `mock/activities.js:17`、`workgroup-seed-sync.js:119-136`、`activity-workgroup-sync.js:31-41` | 种子派生复用 `syncActivityWorkgroup()` |
| C06 | P2 | 支委会仍播种考勤，`act-27` 产生待确认死项 | `mock/attendance.js:17-21,126-153`、`policy-defaults.js:53` | 删除新造支委会考勤；历史行标注 |
| C07 | P2 | 报名种子含产品拒绝的状态（专班组 participant、completed 专班 pending） | `mock/seed.js:52-63`、`mock/taskforces.js:14,115`、`services/activity/signup.js:111,357-359` | 改挂 active 专班，只用 organizer/deep |
| C08 | P2 | taskforces 种子缺 typedef 必填 `branchId` | `mock/taskforces.js:8-177`、`domain.js:55` | 补 `DEFAULT_BRANCH_ID` |
| C09 | P2 | 种子派生工作组缺 `createdBy` | `workgroup-seed-sync.js:119-136`、`domain.js:74` | 写 `source.createdBy/organizer` |
| C10 | P2 | 考察种子「已确认」无确认人 | `mock/inspection.js:85-95`、`inspection.js:201-213` | 补 `confirmedBy/At` |
| C11 | P2 | 考勤种子无 `confirmed*` 三件套 | `mock/attendance.js:13-94` | 补确认三字段，`recordedBy` 保上传语义 |
| C12 | P2 | 10 月基线过期：`act-37` 已过仍 published，10 月通知全过期 | `mock/activities.js:119`、`mock/notices.js:135-157` | 收口或整体平移并同步 |
| C13 | P2 | mock 种子修复只覆盖 11 集合，服务端覆盖全部 manifest | `mock-adapter.js:784-817`、`server/seed-repair.js:44-71` | 由 manifest 生成修复源 |
| C14 | P2 | 8 个集合只有服务端种子，mock 恒空 | `server/seed.js:174-187`、`mock-adapter.js:396-433` | 同源播种或标 `api-only` |
| C15 | P2 | 产品为演示账号写死 `u_org/u_prop` 幽灵操作人 | `org/taskforce-tab.js:1116`、`prop/weekly-tab.js:171,210` | fail-closed，要求真实登录 |
| C16 | P2 | mock 缺工作组终态写门（API 409、mock 成功） | `mock-adapter.js:2470-2539`、`workgroup-routes.js:48-51` | 引同一 `isWorkgroupWritableStatus` |
| C17 | P3 | manifest 仍有已下线 `executor/supervisor` | `seed-manifest.js:99` | 删除 |
| C18 | P3 | `runtimeFields` 登记不全，typedef 落后（考勤/考察/专班） | `seed-manifest.js:115-172`、`domain.js:226-237,374-390` | 补齐登记与 typedef |
| C19 | P3 | 僵尸字段 `reviewSummary`、`WEEKLY_REPORTS_SEED`；`taskforces.activityId` 全空 | `seed-manifest.js:117`、`mock/prop.js:29`、`reporting.js:125` | 删除或填真实关联 |
| C20 | P3 | 香山报备内容写「8 月中旬」，活动/通知是 10 月 | `mock/seed.js:82`、`mock/activities.js:119` | 对齐日期 |

## 六、D 读写闭环（17 条）

| 编号 | 级别 | 结论 | 证据 | 修法 | schema |
|---|---|---|---|---|---|
| D01 | P1 | 专班成员移出仍整行删除，历史贡献随之消失 | `workgroup-routes.js:881-883`、`mock-adapter.js:2534-2538`、`taskforce.js:652-657` | tombstone 或贡献独立行（带 `personId`） | 否 |
| D02 | P1 | 语义写口不 bump 集合版本 ⇒ 旧 baseline 整表快照可删别人新行 | `system-notices.js:142`、`resources/index.js:359,625-632,714`、`db.js:127-129` | 所有语义写口统一 bump | 否 |
| D03 | P1 | 周期归档空表在 API 形态注入 `br-b1` 种子 ⇒ 后续快照整批 403 | `prop/weekly-tab.js:30-34`、`mock/prop.js:21-26`、`workgroup-routes.js:396-414` | 回退仅限 mock；API 空就是空 | 否 |
| D04 | P1 | Todo 无 `branchId`，mock 不补、读口回落 `br-b1` | `todo.js:631-654`、`mock-adapter.js:1312-1318`、`branch-scope.js:157-173` | v11 迁移（R9 §5.1） | **是** |
| D05 | P2 | 取消归档（`archived:false`）不回收工作组状态 | `activity-workgroup-sync.js:31-40`、`inspector.js:1241` | 恢复时回写 `active` | 否 |
| D06 | P2 | 周期归档快照用默认周口径，覆盖支部月配置且冻结 | `prop/weekly-tab.js:86,217`、`periodic-archive.js:65-85` | 用合并后的支部策略 | 否 |
| D07 | P2 | 党小组改名不回写 `hostGroup` 名称快照，组长权限错位 | `party-group.js:151-156`、`workgroup-routes.js:330-336` | 读侧按 `hostGroupId` 现取组名 | 否 |
| D08 | P2 | 考勤「已确认」前端把 `recordedBy` 当确认人，服务端只认 `confirmedBy` | `services/activity/attendance.js:54-74`、`workgroup-routes.js:374-384` | 统一 `confirmedBy`，`recordedBy` 只作上传人 | 否 |
| D09 | P2 | 考察快照写穿不复算记录人/确认人，留痕可伪造 | `gates.js:455-465`、`inspection.js:210-214` | 快照写入强制 actor | 否 |
| D10 | P2 | 工作组预载谓词与首页展示谓词不一致 ⇒ 永久「加载中」 | `data-adapter.js:1359-1369`、`dashboard/taskforce-list.js:155-172` | 同谓词同排序同上限 | 否 |
| D11 | P2 | 专班审核通过不刷新 `workgroupMembers` 缓存 | `services/activity/taskforce.js:384-415`、`org/taskforce-tab.js:696-697` | 并入缓存或同时刷新 | 否 |
| D12 | P2 | 成员/授权/产出单条写口不 bump 版本 ⇒ 跨端陈旧 | `workgroup-routes.js:854-858,888-894,987-999,1109-1112` | 统一 bump | 否 |
| D13 | P3 | 通知旧全局 `read` 仍写、读侧已只用 `reads[]` | `system-notice-templates.js:189`、`notice.js:77` | 停写，只留迁移 | 否 |
| D14 | P3 | inspections/archiveRecords 无 `branchId`，孤儿行落 DEFAULT | `branch-scope.js:111-119,169-173`、`archive-tab.js:1042-1045` | 建行补归属；无父键 fail-closed | 否 |
| D15 | P3 | 考勤 `overdue` 仍被补课写口存死，读侧已现算 | `disc/makeup-tab.js:168`、`attendance.js:585-586` | 停写，统一现算 | 否 |
| D16 | P3 | `branches.config` 写后不 bump；通用 PATCH 可旁路净化与留痕 | `resources/index.js:1089-1091,369-440` | bump；禁通用 PATCH 碰 config | 否 |
| D17 | P3 | `workgroup_outputs` 的 `accepted/archived` 无迁移写口 | `workgroup-routes.js:1070-1112`、`activity-entry.js:823,864` | 补迁移端点或删不可达文案 | 否 |

## 七、R9 四条 P1 复核

| R9 项 | 复核结论 | 证据 |
|---|---|---|
| P1-1 归档活动工作组仍可写 | **已消解**（建/改/归档/删/快照五处同事务） | `resources/index.js:353,621,802,903,1402-1417`；`mock-adapter.js:969,1020,1072,1043` |
| P1-2 专班移出丢贡献 | **未闭环**：加入已合并历史贡献，移出仍整行删除 ⇒ D01 | `workgroup-routes.js:719,845` vs `:881-883` |
| P1-3 报名审核绕开主源 | **写入口已消解，同屏可见性未闭环** ⇒ D11 | `signup.js:187-194`、`taskforce.js:384-415` |
| P1-4 Todo 缺 branchId | **未实施**（本轮只登记）⇒ D04 | `todo.js:631-654`、`branch-scope.js:157-173` |
| P1-5 工作组任务首屏 0 | **详情页已闭环；首页谓词错配** ⇒ D10 | `data-adapter.js:1359-1369`、`taskforce-list.js:155-172` |

## 八、已消解（不重开）

R7-01 / R7-02 / R7-03 / R7-04 / R7-12 / R7-14 / R7-19 / R7-29 / R7-33；R9 P1-1 / P1-3（写入口）/ P1-5（详情页）。个人档案 15 个自述字段、届别/党小组空值入口、材料「待补」闭环、逐人已读、逾期现算、工作分工指定、待补承办组补选等均为「已确认不是问题」，证据见各 lens 的「已对齐」清单。

## 九、sample-diff 五样本（AI 假设 → 支书口径）

| # | AI 假设 | 支书/产品口径 | 偏差类型 | 可复用规则（Boolean） |
|---|---|---|---|---|
| 1 | 种子修复覆盖全部字段最「一致」 | 用户能编辑的字段一律归 runtime，修复只重建基底 | definition_mismatch | IF 字段有用户写口 THEN 必须在 `runtimeFields`，否则每次加载都会回滚 |
| 2 | 「已写入」= 闭环 | 写入不 bump 版本，别人一次快照就能删掉它 | evidence_gap | IF 走语义端点改集合 THEN 同事务 bump 该集合版本，否则不算闭环 |
| 3 | SOP 是文案模板，照旧生成即可 | SOP 生成的任务必须可执行，不能与制度参数相反 | priority_inversion | IF 任务执行人/期限来自制度 THEN 从 policy 现算，禁止字面量 |
| 4 | 空字段加一句「未填写」就够 | 有字段无入口＝死信息；空值要给出归属和动作 | symptom_misread | IF 展示空值 THEN 必须有写入口或明确的「谁可补、在哪补」 |
| 5 | mock 只是演示，不必与产品等价 | mock 要跟代码走；产品不得为演示数据写特判 | scope_narrowing | IF 同一操作 mock 与 API 结果不同 THEN 以 API 判据为准补 mock；IF 产品为 `u_*`/演示 id 特判 THEN 删除并 fail-closed |

## 十、只读声明

本报告只汇总四路只读审查，未修改任何文件（除本报告自身）。所有行号以当前工作区为准；后续并行改动若导致位移，以同义代码为准。
