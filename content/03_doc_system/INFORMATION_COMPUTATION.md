---
title: "信息计算与呈现口径"
type: spec
role: "[工程师]+[AI]"
last_updated: 2026-10-18
status: active
related_files: [docs/src/services/governance/notice.js, docs/src/components/shell/header.js, docs/src/services/governance/todo.js, docs/src/services/governance/today-summary.js, docs/src/components/governance/work-overview.js, docs/src/services/activity/taskforce.js, docs/src/services/activity/attendance.js]
---

# 信息计算与呈现口径

> **本文回答什么**：系统里的信息**怎么算出来、算的是什么口径、在哪里呈现、谁看得见**。
> 本文不重复设计规范（见 [DESIGN_SYSTEM.md](../04_web_design/design-system/DESIGN_SYSTEM.md)），也不重复数据结构（见 [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)）；只把「同一个数字在不同页面是否同源」写清楚。
>
> **写法约定**：每一节用「信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限」五列。公式用文字写，不写伪代码。
>
> **边界（如实标注）**：本文只记录**代码里已经存在的算法**。凡代码没有统一的口径，一律写入 §七「已知未统一项」；凡需要支书裁定的，写入 §八「待裁定」——**不把未统一的写法伪装成统一口径**。

---

## 一、通知可见性

### 1.1 两个判定入口

| 入口 | 作用 | 不做什么 | 数据源 |
|---|---|---|---|
| `NoticeStore.list(filter)` | 列表 / 铃铛 / 角标的**可见性门** | 不负责详情页读取权限；不按 id 取单条 | `docs/src/services/governance/notice.js` |
| `canReadNotice(notice, viewer)` | 详情页的**可读性判定** | 不负责列表过滤；不改变数据 | 同上 |
| `NoticeStore.getById(id)` | **只按 id 取数**（含已归档 / 已过期） | 不套可见性门 | 同上 |

通知共用的受众判定单一源是 `docs/src/core/domain/constants.js` 的 `NOTICE_AUDIENCE_SENTINELS`；发布侧写入的 sentinel 与消费端判定必须同源。

### 1.2 五类通知的字段特征

| 类型 | 字段特征 | 典型生成口 |
|---|---|---|
| 党委下发 | `source = 'committee'`；`audience = 'committee'`；`branchId = 目标支部` | `NoticeStore.addSystem('committee-dispatch', …)` |
| 支部广播 | 无受众字段，或 `audience` 含广播 sentinel `all` | 通知发布表单 / 活动广播 |
| 角色定向 | `audience` 为 sentinel（`leaders` / `activists` / `candidates`）、裸角色键，或 `actionRoles` 非空 | 通知发布表单 / 业务派生 |
| 到人私信 | `noticeType = 'message'`；`audiencePersons` 为收件人 personId 数组 | `sendDirectMessage()` / 通知发布「指定人（私发）」 |
| 系统通知 | 经 `NoticeStore.addSystem(kind, …)` 生成；**没有独立类型字段**，可见性由它生成的 `audience` / `audiencePersons` / `actionRoles` 决定 | 各业务流程副作用 |

### 1.3 列表可见性矩阵（`NoticeStore.list` 默认）

图例：`可见`＝出现在列表；`条件`＝仅当受众命中；`不可见`＝列表不返回。

| 角色 | 党委下发 | 支部广播 | 角色定向 | 到人私信 | 系统通知 |
|---|---|---|---|---|---|
| `party-staff`（党委组织员） | 不可见（默认）；党委台铃铛 `scope: 'committee'` 时可见 | 可见（默认）；党委台铃铛收窄后不可见 | 条件（角色 / `actionRoles` / 到人命中） | 仅收件人可见（发件人走私信页） | 条件（按其受众字段；党委级通知在铃铛 scope 下可见） |
| 支委层（支书 / 副支书 / 组织 / 宣传 / 纪检委员） | 条件（`audience` 命中 `committee` 且 `branchId`＝本人支部） | 可见 | 条件（受众或 `actionRoles` 命中；**列表无签发人特权**） | 仅收件人可见（发件人走私信页） | 条件（按其受众字段） |
| `leader`（党小组组长） | 不可见 | 可见 | 条件（`leaders` / 裸 `leader` / `actionRoles` 命中） | 仅收件人可见 | 条件 |
| `participant`（普通成员） | 不可见 | 可见 | 条件（发展阶段 sentinel / 裸角色键 / 到人） | 仅收件人可见 | 条件 |
| 无登录会话 | 可见（`list()` 无会话全放行） | 可见 | 可见（`list()` 无会话全放行） | 可见（`list()` 无会话全放行） | 可见（`list()` 无会话全放行） |

**条件说明**

1. **党委下发**：代码仅在 `party-staff` 传入 `scope: 'committee'`（党委台铃铛）时放行 `audience === 'committee'` 及其数组写法（该角色不属于任何支部，故不做支部比对）；默认列表调用保持原行为。支委层则要求 `branchId` 与本人支部一致。
2. **角色定向**：`audience` 为 sentinel 时按 `NOTICE_AUDIENCE_SENTINELS` 判定；裸角色键直接比对角色；`actionRoles` 只对目标角色可见。
3. **到人私信**：`list()` 只按 `audiencePersons` 命中收件人；发件人查看自己的私信走 `listMyMessages()`（内部逐条 `canReadNotice`）。
4. **无登录会话**：`list()` 在无会话时**不按受众收窄**（直接返回），这是既有行为，与 `canReadNotice` 不一致，见 §七。

### 1.4 详情可读性矩阵（`canReadNotice`）

图例：`可读`＝详情页可打开；`条件`＝命中受众 / 发布者等条件；`不可读`＝详情页不可打开。

| 角色 | 党委下发 | 支部广播 | 角色定向 | 到人私信 | 系统通知 |
|---|---|---|---|---|---|
| `party-staff` | 可读 | 可读 | 条件（命中受众） | 仅发件人与收件人可读 | 条件 |
| 支委层 | 可读（支委层可读任意**非私信**通知） | 可读 | 可读（支委层兜底） | 仅发件人与收件人可读 | 可读（非私信） |
| `leader` / `participant` | 不可读 | 可读 | 条件（命中受众） | 仅发件人与收件人可读 | 条件 |
| 无登录会话 | 不可读 | 可读 | 不可读 | 不可读 | 条件（广播 / 无受众才可读） |

**私信优先于支委层兜底**：`noticeType === 'message'` 在 `canReadNotice` 中最先判定，可见性只认发件人与收件人；支委层不能读他人私信。

### 1.5 党委台铃铛收窄（2026-10-18）

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 党委台铃铛条目 | 在受众门之后、`retention` 之前，若 `filter.scope === 'committee'` 且当前角色为 `party-staff`，只保留：`source === 'committee'`；或 `audience === 'committee'`；或 `audience` 数组含 `committee`；或 `audiencePersons` 命中本人 | `docs/src/services/governance/notice.js` | 顶栏铃铛下拉、未读角标 | 仅 `party-staff` 生效；其它角色传 `scope` 也不改变结果 |
| 党委台未读角标 | 对上述集合再取 `!read` 计数 | 同上 + `docs/src/components/shell/header.js` | 顶栏铃铛角标 | 同上 |

**不做什么**：通知详情页、通知列表页不强制收窄；党委仍可通过其它入口查看支部通知。支部内部广播不进入党委台铃铛，也不计入其角标。

---

## 二、顶栏铃铛

### 2.1 信息项

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 铃铛下拉数据 | `NoticeStore.list({ activeOnly: true, sortBy: 'date', retention: 'visible' })`；`party-staff` 额外传 `scope: 'committee'` | `docs/src/components/shell/header.js` | 顶栏铃铛下拉 | 当前登录人 |
| 未读角标 | 取同一数据源的 `activeOnly` 列表，统计 `read !== true` 的条数 | 同上 | 铃铛右上角 | 当前登录人 |
| 角标上限 | 未读数大于 9 显示 `9+`，否则显示原数 | 同上 | 铃铛右上角 | 当前登录人 |
| 铃铛最大条数 | 下拉最多渲染 10 条（`slice(0, 10)`） | 同上 | 铃铛下拉 | 当前登录人 |
| 紧急 / 重要保留 | `retention: 'visible'`：`priority === 'urgent'` 全部保留；其余只保留未读 | `docs/src/services/governance/notice.js` | 铃铛下拉 | 当前登录人 |
| 排序 | `sortBy: 'date'` 时按 `publishDate` 字符串倒序（新在前） | 同上 | 铃铛下拉 | 当前登录人 |
| 党委台收窄 | `readLoginSnapshot()?.role === 'party-staff'` 时传 `scope: 'committee'`；否则不传 | `docs/src/components/shell/header.js` | 铃铛下拉、角标 | 仅党委组织员 |

**注意**：角标统计**不套** `retention: 'visible'`——已读的重要通知会从下拉里收起，但仍不计入未读；紧急通知无论已读未读都保留在下拉里。因此「下拉可见条数」与「角标数」不是同一个集合。

### 2.2 已读回写

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 标记已读 | 下拉内点「已读」或点条目：`NoticeStore.markRead(id)`，写 `read = true`，并完成对应的通知阅读待办 | `docs/src/services/governance/notice.js` | 铃铛下拉、角标 | 当前登录人 |
| 角标刷新 | `DATA_CHANGED` / `DATA_LOADED` 事件触发 `_renderNotificationBadge()`；标记已读后也立即重绘 | `docs/src/components/shell/header.js` | 铃铛角标 | — |

---

## 三、待办派生

### 3.1 来源与写入口

| 来源 | 派生器 / 写入口 | 触发时机 | 数据源（文件） |
|---|---|---|---|
| 通知行动 | `NoticeTodoDeriver.deriveFromNotice(notice)` | `NoticeStore.add()` / `addSystem()` 成功后；仅 `actionable === true` 且 `actionRoles` 非空 | `docs/src/services/governance/todo.js` |
| 活动创建 | `LifecycleTodoDeriver.deriveFromActivityCreate(activity)` | 活动创建后 | 同上 |
| 专班创建 | `LifecycleTodoDeriver.deriveFromTaskforceCreate(taskforce)` | 专班创建后 | 同上 |
| 活动归档 | `LifecycleTodoDeriver.deriveFromActivityArchive(activity)` | 活动归档后 | 同上 |
| 普通成员阅读 | `VisitorTodoDeriver.deriveFromNotices()` | 成员台待办刷新 | 同上 |
| 普通成员参与 | `VisitorTodoDeriver.deriveFromActivities()` / `deriveFromTaskforceSignups()` | 成员台待办刷新 | 同上 |

### 3.2 信息项

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 通知阅读待办 | 为每个 `actionRoles` 角色生成一条；标题取 `actionTask || title`；`actionKey = 'notice-read'`；`domain = none` | `docs/src/services/governance/todo.js` | 各角色待办 / 未读通知区 | 目标角色 |
| 活动 / 专班赋权待办 | 创建时各生成一条；收件人取模块主责（`_authzRecipient`）；`actionKey = 'activity-authorize'` / `'taskforce-authorize'` | 同上 + `docs/src/core/domain/work-map.js` | 对应角色工作台待办 | 模块主责角色 / 到人主责本人 |
| 活动归档待办 | 活动归档后为宣传委员生成一条；`actionKey = 'activity-archive'` | 同上 | 宣传委员待办 | `prop-commissioner` |
| 普通成员阅读待办 | 未读、未过期、`targetModule` 不是 `attendance`；正式党员不收 `party` 模块；按来源去重 | 同上 | 成员台待办 | 本人 |
| 普通成员参与待办 | 未来、未归档 / 未取消 / 非草稿、本人是组织者 / 参与者 / 已通过报名；按来源去重 | 同上 | 成员台待办 | 本人 |

### 3.3 去重键

| 待办类别 | 去重键 | 现状 |
|---|---|---|
| 通知阅读（`VisitorTodoDeriver`） | `sourceType = 'notice'` ＋ `sourceId` ＋ `status !== completed` | 已去重 |
| 参与活动 / 专班（`VisitorTodoDeriver`） | `sourceType` ＋ `sourceId` ＋ `actionType = 'participate'` ＋ `status !== completed` | 已去重 |
| 通知行动（`NoticeTodoDeriver`） | **无显式去重键** | 同一通知重复派生会重复，依赖「发布一次」；见 §七 |
| 活动 / 专班赋权（`LifecycleTodoDeriver`） | **无显式去重键** | 依赖创建流程只调用一次；见 §七 |

### 3.4 完成回写

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 单条完成 | `TodoStore.complete(id)` → 状态 `completed`，写 `completedAt` | `docs/src/services/governance/todo.js` | 各待办列表 | 待办所属角色 / 本人 |
| 按来源批量完成 | `TodoStore.completeBySource(sourceType, sourceId)`：同来源且未完成的全部置 `completed` | 同上 | 各待办列表 | 业务操作人 |
| 通知阅读回写 | `NoticeStore.markRead(id)` 后调用 `completeBySource('notice', id)`；派生通知未持久化时按 id 直接完成 | `docs/src/services/governance/notice.js` | 铃铛 / 待办 | 当前登录人 |
| 来源删除联动 | `TodoStore.deleteBySource(sourceType, sourceId)`；通知删除、活动 / 专班删除均调用 | `docs/src/services/governance/todo.js` | 各待办列表 | 业务操作人 |
| 读取口径 | `getByRole()` 默认排除 `completed` 与 `voided`；`personId` 过滤仅在调用方传「本人 personId」时生效 | 同上 | 各角色待办 | 同上 |

---

## 四、概况与今日摘要

### 4.1 今日摘要（`buildTodaySummary`）

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 今日会议 `hasMeeting` | 今天且对当前角色可见的活动，满足任一：本人在 `assignments`；或本人有 `approved` 报名；或活动属「支部党员大会 / 党课 / 组织生活会 / 党小组会」且本人在应到名单（党小组会按本人 `partyGroup`） | `docs/src/services/governance/today-summary.js` + `docs/src/services/member/roster.js` | 「今天」页 | 当前登录人（活动按角色可见性收窄） |
| 我的分工 `myDuties` | 今天的可见活动中，`assignments[].personId` 等于本人的条目，逐条列出活动与角色 | 同上 | 「今天」页 | 当前登录人 |
| 逾期 `overdue` | 当前角色待办聚合组中，`deadline < 今天` 的条目 | `docs/src/services/governance/todo.js` | 「今天」页 | 当前角色 |
| 今日到期 `dueToday` | 当前角色待办聚合组中，`deadline === 今天` 的条目 | 同上 | 「今天」页 | 当前角色 |
| 待办合计 `todoSummary.total` | `TodoStore.getByRole(role).length`（已排除完成 / 作废，含无截止项） | 同上 | 「今天」页 | 当前角色 |
| 按动作分组 `byAction` | 取当前角色未完成待办，按 `TodoActionType` 七类分组；组序固定；空组不出现；组内按截止升序、无截止殿后；`count`＝组内条数 | 同上 | 「今天」页 | 当前角色 |
| 近期安排 `upcoming` | 今天之后 7 天内、对当前角色可见的活动，按日期＋时间升序 | `today-summary.js` + `docs/src/services/core/visibility.js` | 「今天」页 | 当前登录人 |

**去重**：`hasMeeting` 同一活动只出现一次；`myDuties` 同一活动同一人可能有多条分工，按分工条目计；`todoSummary.total` 与 `byAction` 各自从同一份待办取数，`byAction` 只用于展示分组，不另加总。

### 4.2 工作概况（`work-overview`）

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 待汇报 | `IssueStore.getReportRequestsFor(personId).length` | `docs/src/components/governance/work-overview.js` + `docs/src/services/governance/issues.js` | 工作概况「汇报」区 | 当前登录人 |
| 待答复 | 我发起的汇报中 `status === 'open'` 且 `resultPending === true` 的条数 | 同上 | 工作概况「汇报」区 | 当前登录人 |
| 我的超期 | 当前角色待办聚合组中，`status === 'expired'` 或（`status === 'pending'` 且 `deadline < 今天`）的条目数 | `work-overview.js` + `todo.js` | 工作概况「卡点」区 | 当前角色 |
| 条线缺口（纪检） | `loadMakeupTasks()` 中 `status === 'pending'` 的条数；`getOverdueRecords().length` | `docs/src/services/activity/makeup.js` + `inspection.js` | 工作概况「卡点」区 | `disc-commissioner` |
| 条线缺口（宣传） | 已结束且未归档的活动数 | `work-overview.js` + `activity.js` | 工作概况「卡点」区 | `prop-commissioner` |
| 条线缺口（组织） | 招募中专班数；待赋权的 bottom-up 活动数 | `work-overview.js` + `taskforce.js` | 工作概况「卡点」区 | `org-commissioner` |
| 我的在办 | 三路合并：当前角色待办聚合组；未结束且本人是组织者 / 参与者的可见活动；进行中 / 招募中且本人是负责人 / 发起人 / 成员的工作组 | `work-overview.js` | 工作概况「在办」区 | 当前登录人 |
| 条线态势（纪检） | 活跃考勤记录条数；出勤率＝（出勤＋已补）÷ 记录条数；考察记录条数 | `work-overview.js` + `attendance.js` + `inspection.js` | 工作概况「在办」区下方 | `disc-commissioner` |
| 条线态势（组织） | 进行中 / 招募中工作组数；未结束且未取消的可见活动数 | 同上 | 工作概况「在办」区下方 | `org-commissioner` |

**去重**：待办按 `role + actionKey` 聚合为组；活动与专班各自独立。**跨类不去重**——同一项目可能同时以待办组和活动 / 专班条目出现，见 §七。

### 4.3 支书全局概况（`SecretaryOverviewStore`）

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 本月出勤率 | 本月活动的活跃考勤记录中，（出勤＋已补）条数 ÷ 记录总条数，四舍五入 | `docs/src/services/governance/secretary-overview.js` | 支书台「全局概况」 | 支书 / 副支书 |
| 本月缺勤人数 | 本月缺勤记录按 personId 去重后的数量 | 同上 | 支书台「全局概况」 | 支书 / 副支书 |
| 补课未完成 | 全部活跃记录中「有缺勤且无已补记录」的人员去重数 | 同上 | 支书台「全局概况」 | 支书 / 副支书 |
| 阶段人数 | 按人员档案 `developStage` 统计积极分子 / 发展对象 / 预备党员 / 正式党员 | `docs/src/data/mock/people.js` | 支书台「全局概况」 | 支书 / 副支书 |
| 待确认考察 | `status === 'pending'` 的考察记录数 | `docs/src/services/activity/inspection.js` | 支书台「全局概况」 | 支书 / 副支书 |
| 超期考察 | `status === 'pending'` 且 `recordedAt` 距今超过 `inspection.overdueDays`，且未被退回 | 同上 | 支书台「全局概况」 | 支书 / 副支书 |
| 在办活动 / 专班 | 未归档活动数；`status` 为 `active` 或 `recruiting` 的专班数 | `secretary-overview.js` + `taskforce.js` | 支书台「全局概况」 | 支书 / 副支书 |
| 待赋权活动 | 未归档、`direction === 'bottom-up'` 且 `assignments` 无 `organizer` 的活动数 | 同上 | 支书台「全局概况」 | 支书 / 副支书 |
| 复盘问题数 | 未归档活动的复盘中 `issues` 数组长度之和 | `secretary-overview.js` + `review.js` | 支书台「全局概况」 | 支书 / 副支书 |
| 本月通知数 | `publishDate` 属于本月的通知条数 | `secretary-overview.js` + `notice.js` | 支书台「全局概况」 | 支书 / 副支书 |
| 待归档活动 | 已结束且未归档的活动数 | 同上 | 支书台「全局概况」 | 支书 / 副支书 |
| 归档完成率 | 已归档活动数 ÷ 已结束活动数，四舍五入 | 同上 | 支书台「全局概况」 | 支书 / 副支书 |

**注意**：支书概况的「本月出勤率」按**记录条数**计算；考勤模块的 `summarizeAttendanceByActivity` 按**应到名单并集**计算。两者不是同一分母，见 §七。

---

## 五、专班 / 工作组

### 5.1 信息项

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 成员数 | `workgroupMembers(tf.members)` 的条数：只计 `personId` 非空且 `role` 为 `organizer` / `deep` 的行；历史 `participant` 行不计入 | `docs/src/services/activity/workgroup-members.js` | 专班详情「成员与授权」、报名区「成员 N/N」 | 专班查看者按角色可见性 |
| 任务数 | 按 `workgroupId` 取 `workgroupTasks` 的条数 | `docs/src/services/activity/taskforce.js` | 专班详情「任务与产出」 | 同上 |
| 产出数 | 按 `workgroupId` 取 `workgroupOutputs` 的条数 | 同上 | 专班详情「任务与产出」 | 同上 |
| 任务闭合数 | `status` 为 `completed` 或 `cancelled` 的任务条数 | 同上 + `docs/src/entries/tabs/org/taskforce-tab.js` | 「任务 x/y」 | 同上 |
| 产出闭合数 | `status` 为 `submitted` / `accepted` / `archived` 的产出条数 | 同上 | 「产出 x/y」 | 同上 |
| 可否结项 | 任务数大于 0，且所有任务闭合，且所有产出闭合 | 同上 | 「结束工作组」按钮可用性 | 组织委员 / 支书 / 副支书 |
| 结项状态 | 发起表决通过 → `recruiting`；解散表决通过 → `dissolved`；解散未通过 → 保持 `active` | `docs/src/services/activity/taskforce.js` | 专班状态 | 支委会表决结果 |

**说明**

1. 专班创建工作组成立时自动建立主任务（`isPurpose`）；历史专班没有任务记录的，详情页提示「补登记主任务」。
2. 「结束工作组」在任务与产出全部闭合前禁用；若解散事项需要表决，则先进入「待事项表决」状态，不直接结束。
3. 成员数不等于报名人数：报名审核通过且角色为 `organizer` / `deep` 才计入；`participant` 属历史兼容行，只读保留、不计入成员与名额。

---

## 六、考勤 / 考察

### 6.1 信息项

| 信息项 | 计算方式 | 数据源（文件） | 呈现位置 | 权限 |
|---|---|---|---|---|
| 应到名单冻结 | 活动创建时按会议类型取应到：党小组会取本组党员；其余会议取全支部党员；剔除滞留党员。主题党日再合并已通过且未作废的线下报名：普通参与者默认线下；组织者 / 深度参与者须显式 `onsite = true` 才加入；显式 `onsite = false` 的组织者 / 深度参与者从原名单移除。冻结结果以 `frozen = true` 存入 `attendanceRosters` | `docs/src/services/activity/attendance.js` + `attendance-roster.js` + `docs/src/services/member/roster.js` | 考勤矩阵、考勤汇总 | 纪检 / 组织者 / 支书按既有权限 |
| 场次出勤率 | 应到名单与「实际出勤 / 已补」名单取并集作为分母；分子为出勤＋已补；四舍五入为百分比 | `docs/src/services/activity/attendance.js::summarizeAttendanceByActivity` | 纪检台出勤率汇总、支书台偏低提示 | 支委会内部 / 当事人本人（个人口径） |
| 场次覆盖率 | 已录入记录人数 ÷ 应到并集人数，四舍五入 | 同上 | 出勤率汇总 | 同上 |
| 个人出勤率 | 本人当月活跃考勤记录中，（出勤＋已补）÷ 记录条数；线上参会记「请假」、不计出席 | `docs/src/services/activity/attendance.js::summarizePersonAttendance` | 成员台「考勤概况」 | 当事人本人 / 支委会 |
| 补课任务数 | `loadMakeupTasks()` 中 `status === 'pending'` 的条数 | `docs/src/services/activity/makeup.js` | 纪检台「补课制度」、工作概况卡点 | 纪检 / 支书 |
| 补课触发 | 记录为缺勤或请假；且不是线上参会；且该场活动要求补课（支部党员大会 / 党课为制度硬要求；党小组会等按活动级勾选；支委会不补课、主题党日不强制） | 同上 | 补课任务生成 | 纪检确认考勤时 |
| 补课去重 | 同一 `personId` ＋ 同一 `activityId` 已有补课任务则跳过 | 同上 | 补课任务表 | — |
| 补课时限 | 活动日期＋`makeup.deadlineDays`（缺省 7 天） | 同上 | 补课任务截止日 | — |
| 待确认考察 | `status === 'pending'` 的考察记录数 | `docs/src/services/activity/inspection.js` | 组织台 / 纪检台 / 支书概况 | 对应角色 |
| 超期考察 | `status === 'pending'`、未被退回、且 `recordedAt` 距今超过 `inspection.overdueDays` | 同上 | 考察管理 / 工作概况卡点 | 纪检 / 支书 |
| 应到清点（纪检） | 会前预应到＝口径统计的应到人数；滞留到场补录人数＝该活动 `detainedMakeup === true` 的记录数；实际应到＝两者相加 | `docs/src/services/activity/attendance.js::countExpectedWithMakeup` | 纪检考勤清点 | 纪检 |

**注意**

1. 支书概况的「补课未完成」按「缺勤人员去重后无已补记录」计算；纪检台 / 工作概况的「补课待完成」按补课任务表 `pending` 计算。两者口径不同，见 §七。
2. 出勤率的分母是「应到 ∪ 实际出勤 / 已补」；没有冻结名单、也没有记录的活动不占位（不生成 0% 行）。
3. 线上参会只免补课、不计出席，因此出现在「请假」而非「出勤」。

---

## 七、已知未统一项

> 以下均为**代码现状**，不是设计目标。列在这里是为了让读者知道「哪个数字不能跨页面直接对」。

| # | 未统一项 | 现状 | 影响 |
|---|---|---|---|
| 1 | 无会话时的通知可见性 | `list()` 无会话直接返回全部（不按受众收窄）；`canReadNotice` 无会话只允许广播 / 无受众 | 列表能看到、详情打不开 |
| 2 | 支书概况出勤率 vs 考勤模块出勤率 | 前者按记录条数；后者按应到名单并集 | 同一月可能得到两个百分比 |
| 3 | 支书概况补课未完成 vs 工作概况补课待完成 | 前者按缺勤人员差集；后者按补课任务表 | 同一时点可能得到两个数 |
| 4 | 通知行动待办去重 | `NoticeTodoDeriver` 无去重键；`VisitorTodoDeriver` 有来源去重 | 同一通知重复派生会重复 |
| 5 | 活动 / 专班赋权待办去重 | `LifecycleTodoDeriver` 无去重键，依赖创建流程只调用一次 | 重放创建流程会重复 |
| 6 | 「系统通知」没有独立类型字段 | 可见性完全由 `audience` / `audiencePersons` / `actionRoles` 决定 | 无法按「系统通知」整体筛选 |
| 7 | 铃铛角标与下拉可见集合 | 角标统计全部未读；下拉套 `retention`（已读重要收起） | 角标数可能大于下拉条数 |
| 8 | 通知列表无签发人特权 | `list()` 受众门不含「发布者恒可见」；`canReadNotice` 含 | 签发人可能在列表看不到自己发的定向通知，但详情可读 |
| 9 | 工作概况跨类不去重 | 待办组、活动、专班三路独立合并 | 同一项目可能重复出现 |
| 10 | 铃铛同日排序 | 只按 `publishDate` 倒序，未显式按 `createdAt` 兜底 | 同日多条顺序依赖稳定排序 |
| 11 | 党委台收窄仅限 party-staff | 其它角色传 `scope: 'committee'` 被忽略 | 调用方误传不会报错，也不生效 |

---

## 八、待裁定

> 以下问题需要支书明确口径后才能改代码；本文不替支书做决定。

1. **无会话的 `list()` 是否应按受众收窄**：当前「无会话全放行」与详情页口径冲突；是否统一为「无会话只返回广播 / 无受众」。
2. **支书概况出勤率是否改用应到名单做分母**：当前按记录条数，是否统一到 `summarizeAttendanceByActivity` 的场次口径。
3. **补课未完成是否统一为补课任务表口径**：当前支书概况与工作概况各算一套；是否保留「人员差集」作为另一种提示，还是只留任务表。
4. **通知行动待办是否补去重键**：建议键为 `sourceType = 'notice'` ＋ `sourceId` ＋ `actionKey`（或 `role`）；是否采纳。
5. **活动 / 专班赋权待办是否补去重键**：建议键为 `sourceType` ＋ `sourceId` ＋ `actionKey`；是否采纳。
6. **「系统通知」是否增加显式类型 / 来源标记**：便于铃铛、列表按类型筛选；是否新增字段。
7. **铃铛角标是否只统计下拉可见集合**：当前角标可能大于下拉条数；是否改为「与下拉同集合」。
8. **党委台铃铛的范围**：`party-staff` 当前可读所有支部的党委下发（`audience === 'committee'` 不做支部比对，因其不属于任何支部）；是否应限定为「当前选中支部」。
9. **同日铃铛排序**：是否增加 `createdAt` 作为第二排序键。
10. **工作概况是否跨类去重**：同一项目同时出现在待办组与活动 / 专班时，是否只保留一条。

---

## 九、边界与引用

| 本文不重复展开的 | 权威源 |
|---|---|
| 表格 / 矩阵 / 台账 / 卡片的选型与交互 | [DESIGN_SYSTEM.md §4.20](../04_web_design/design-system/DESIGN_SYSTEM.md) |
| 数据结构、字段表、枚举 | [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) |
| 角色键级权限矩阵 | [SYSTEM_ROLE_PERMISSION.md](../02_institution/SYSTEM_ROLE_PERMISSION.md) |
| 制度口径与支书裁定原文 | [SECRETARY_DIRECTIVES.md](../01_strategy/SECRETARY_DIRECTIVES.md) |
| 组件与样式实现母本 | `docs/src/services/**` · `docs/src/components/**` |
