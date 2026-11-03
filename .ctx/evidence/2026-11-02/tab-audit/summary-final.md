# 页签审计报告

- 生成时间：2026-11-02T12:26:16.115Z
- 耗时：332655 ms
- 服务：http://127.0.0.1:49220
- 数据库形态：memory（:memory: 临时库）
- 页签数：45
- 汇总：P0 0 / P1 0 / P2 4 · exception 29

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 今天 `secretary.today` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 待办 `secretary.todo` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 全局概况 `secretary.overview` | 7 | exception | pass | pass | pass | pass | pass | pass | pass |
| 活动管理 `secretary.calendar` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支委会 `secretary.committee-meeting` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 党小组 `secretary.group-progress` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |
| 通知发布 `secretary.notification` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 上报党委 `secretary.report-up` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支部分工 `secretary.work-map` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 意见反馈 `secretary.feedback` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 今天 `org.today` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 待办 `org.todo` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `org.overview` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |
| 成员名册 `org.roster` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 人才库 `org.talent` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 思想汇报 `org.thought-review` | 2 | pass | pass | pass | pass | pass | fail(P2) | pass | pass |
| 专班管理 `org.taskforce` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 成员流动 `org.member-flow` | 3 | pass | pass | pass | pass | pass | fail(P2) | pass | pass |
| 今天 `prop.today` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 待办 `prop.todo` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `prop.overview` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |
| 项目看板 `prop.kanban` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 档案归档 `prop.archive` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 今天 `disc.today` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 待办 `disc.todo` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `disc.overview` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |
| 考勤管理 `disc.attendance` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |
| 复盘 `disc.review` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 考察管理 `disc.inspection` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 今天 `leader.today` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 待办 `leader.todo` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `leader.overview` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |
| 本组活动 `leader.write` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 考勤管理 `leader.attendance` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |
| 组员进展 `leader.members` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 今天 `visitor.today` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 待办 `visitor.todo` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `visitor.overview` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 活动动态 `visitor.activities` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 项目分工 `visitor.projects` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 考勤概况 `visitor.attendance` | 4 | pass | pass | pass | pass | pass | fail(P2) | pass | pass |
| 我的成长 `visitor.growth` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 下发通知 `party-committee.dispatch` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支部上报 `party-committee.review` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支部管理 `party-committee.branches` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D2 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|---|
| `secretary.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `secretary.todo` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `secretary.overview` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `secretary.calendar` | pass | — | pass | pass | exception | pass | pass | pass | pass |
| `secretary.committee-meeting` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `secretary.group-progress` | pass | pass | pass | skip | exception | pass | pass | pass | pass |
| `secretary.notification` | pass | — | pass | skip | exception | pass | pass | pass | pass |
| `secretary.report-up` | pass | — | pass | pass | skip | pass | pass | pass | pass |
| `secretary.work-map` | pass | — | pass | pass | exception | pass | pass | pass | pass |
| `secretary.feedback` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `org.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `org.todo` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `org.overview` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `org.roster` | pass | pass | pass | skip | exception | pass | pass | pass | pass |
| `org.talent` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `org.thought-review` | pass | — | pass | — | skip | pass | pass | pass | pass |
| `org.taskforce` | pass | — | pass | exception | exception | pass | pass | pass | pass |
| `org.member-flow` | pass | — | pass | skip | exception | pass | pass | pass | pass |
| `prop.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `prop.todo` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `prop.overview` | pass | — | pass | pass | skip | pass | pass | pass | pass |
| `prop.kanban` | pass | — | pass | pass | exception | pass | pass | pass | pass |
| `prop.archive` | pass | — | pass | pass | exception | pass | pass | pass | pass |
| `disc.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `disc.todo` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `disc.overview` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `disc.attendance` | pass | — | pass | exception | skip | pass | pass | pass | pass |
| `disc.review` | pass | — | pass | skip | skip | pass | pass | fail(P2) | pass |
| `disc.inspection` | pass | — | pass | skip | exception | pass | pass | pass | pass |
| `leader.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `leader.todo` | pass | — | pass | pass | skip | pass | pass | pass | pass |
| `leader.overview` | pass | — | pass | pass | skip | pass | pass | pass | pass |
| `leader.write` | pass | — | pass | pass | exception | pass | pass | pass | pass |
| `leader.attendance` | pass | — | pass | exception | skip | pass | pass | pass | pass |
| `leader.members` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `visitor.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `visitor.todo` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `visitor.overview` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `visitor.activities` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `visitor.projects` | pass | — | pass | pass | skip | pass | pass | pass | pass |
| `visitor.attendance` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `visitor.growth` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `party-committee.dispatch` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `party-committee.review` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `party-committee.branches` | pass | pass | pass | skip | exception | pass | pass | pass | pass |

## P0（0）

（无）

## P1（0）

（无）

## P2（4）

### disc.review · E1

- key：`disc.review`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/users（p95 95ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/users","stats":{"endpoint":"GET /api/v1/users","runs":5,"p50":29,"p95":95,"min":9,"max":95,"bytes":9892},"budget":{"p95":50,"bytes":11871},"budgetSource":"perf-baseline-tab"}`

### org.member-flow · F6

- key：`org.member-flow`
- rule：`F6`
- message：1 处空态文本不在 .empty-state 内（P2 待人工确认）
- evidence：`{"hits":[{"text":"暂无台账记录（撤销后重新登记是唯一更正路径）","tag":"span","cls":"empty-state__text"}]}`

### org.thought-review · F6

- key：`org.thought-review`
- rule：`F6`
- message：1 处空态文本不在 .empty-state 内（P2 待人工确认）
- evidence：`{"hits":[{"text":"本期没有记录","tag":"span","cls":"text-xs text-gray-500"}]}`

### visitor.attendance · F6

- key：`visitor.attendance`
- rule：`F6`
- message：1 处空态文本不在 .empty-state 内（P2 待人工确认）
- evidence：`{"hits":[{"text":"出勤 —（暂无应到名单）","tag":"div","cls":"text-xs font-medium text-gray-500"}]}`

## 例外登记（不计违规）（29）

| key | rule | message |
|---|---|---|
| `disc.attendance` | F1 | 顶层块 6 > 4，已登记例外：确认视图：分段条 + 工作视图切换 + 待确认考勤 + 出勤申诉 + 会议考勤录入，加页头共 6 块 |
| `disc.attendance` | C1 | 已知系统性风险：PATCH /api/v1/signups/:id 仅 requireAuth，visitor 可写（见 ENGINEERING_ASSESSMENT 阻断风险 2） |
| `disc.inspection` | F1 | 顶层块 5 > 4，已登记例外：督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块） |
| `disc.inspection` | C2 | destructive 流程未真删（无 CRUD 配方）：inspection-delete |
| `disc.overview` | F1 | 顶层块 6 > 4，已登记例外：共享三层骨架 5 块 + 页内「活动日历」折叠卡 |
| `disc.todo` | F1 | 顶层块 5 > 4，已登记例外：页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） |
| `leader.attendance` | C1 | 已知系统性风险：PATCH /api/v1/signups/:id 仅 requireAuth，visitor 可写（见 ENGINEERING_ASSESSMENT 阻断风险 2） |
| `leader.overview` | F1 | 顶层块 6 > 4，已登记例外：共享三层骨架 5 块 + 页内「活动日历」折叠卡 |
| `leader.todo` | F1 | 顶层块 5 > 4，已登记例外：页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） |
| `leader.write` | C2 | destructive 流程未真删（无 CRUD 配方）：activity-delete |
| `org.member-flow` | C2 | destructive 流程未真删（无 CRUD 配方）：member-transfer-out |
| `org.overview` | F1 | 顶层块 6 > 4，已登记例外：共享三层骨架 5 块 + 页内「活动日历」折叠卡（承接原活动日历页签） |
| `org.roster` | C2 | destructive 流程未真删（无 CRUD 配方）：member-transfer-out |
| `org.taskforce` | C1 | 已知系统性风险：PATCH /api/v1/signups/:id 仅 requireAuth，visitor 可写（见 ENGINEERING_ASSESSMENT 阻断风险 2） |
| `org.taskforce` | C2 | destructive 流程未真删（无 CRUD 配方）：taskforce-dissolution |
| `org.todo` | F1 | 顶层块 5 > 4，已登记例外：页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） |
| `party-committee.branches` | C2 | destructive 流程未真删（无 CRUD 配方）：branch-delete |
| `prop.archive` | C2 | destructive 流程未真删（无 CRUD 配方）：archive-record-delete |
| `prop.kanban` | F1 | 顶层块 5 > 4，已登记例外：待启动 / 进行中 / 宣传任务三块主体之外，另有独立的「去档案归档」去向条与页头并列 |
| `prop.kanban` | C2 | destructive 流程未真删（无 CRUD 配方）：prop-task-delete |
| `prop.overview` | F1 | 顶层块 6 > 4，已登记例外：共享三层骨架 5 块 + 页内「活动日历」折叠卡 |
| `prop.todo` | F1 | 顶层块 5 > 4，已登记例外：页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） |
| `secretary.calendar` | C2 | destructive 流程未真删（无 CRUD 配方）：activity-delete |
| `secretary.group-progress` | C2 | destructive 流程未对存量执行：group-dissolve（仅清理本次探针行） |
| `secretary.notification` | C2 | destructive 流程未对存量执行：notice-delete（仅清理本次探针行） |
| `secretary.overview` | F1 | 顶层块 7 > 4，已登记例外：共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 |
| `secretary.work-map` | C2 | destructive 流程未真删（无 CRUD 配方）：assignment-delete |
| `visitor.overview` | F1 | 顶层块 5 > 4，已登记例外：无页内折叠卡，但共享骨架本身 5 块（含「我已处理」折叠） |
| `visitor.todo` | F1 | 顶层块 5 > 4，已登记例外：页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） |

## 跳过项（不假绿）（254）

| key | rule | message |
|---|---|---|
| `disc.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendances |
| `disc.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/system-notices |
| `disc.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `disc.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendances |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/makeupTasks |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendance-appeals/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `disc.inspection` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `disc.inspection` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspection-appeals/:id |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `disc.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `disc.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `disc.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `disc.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `disc.review` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/system-notices |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activityReviews |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activityReviews/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/taskforceReviews |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/taskforceReviews/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `disc.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `disc.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `disc.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `disc.today` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `disc.today` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `disc.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `disc.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `disc.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `disc.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `disc.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `disc.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `disc.todo` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `disc.todo` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `disc.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations/:id/decide |
| `leader.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendances |
| `leader.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendances |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendance-appeals/:id |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/makeupTasks |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/tasks |
| `leader.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `leader.members` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `leader.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `leader.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `leader.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `leader.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `leader.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `leader.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `leader.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `leader.todo` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `leader.write` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `leader.write` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `leader.write` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `leader.write` | C2 | 无法创建 CRUD 探针（leader 对 POST /api/v1/notices 返回 403），未做真实往返 |
| `org.member-flow` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：PATCH /api/v1/users/:id |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/intake |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/:id/undo-transfer-out |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/memberFlows |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/memberFlows/:id |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/users/:id |
| `org.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `org.overview` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `org.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/reviewRequests |
| `org.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `org.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `org.roster` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：PATCH /api/v1/users/:id |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/intake |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/members/:id/profile |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/:id/undo-transfer-out |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/memberFlows |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/memberFlows/:id |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/users/:id |
| `org.talent` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PATCH /api/v1/workgroups/:id/tasks/:taskId |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/taskforces |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/taskforces/:id |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/signups |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activityReviews |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activityReviews/:id |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/taskforceReviews |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/taskforceReviews/:id |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/workgroups/:id/members |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：PUT /api/v1/workgroups/:id/members |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：DELETE /api/v1/workgroups/:id/members/:personId |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/workgroups/:id/tasks |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/workgroups/:id/tasks/:taskId |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/workgroups/:id/outputs |
| `org.taskforce` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/workgroups/:id/coordinate |
| `org.thought-review` | C2 | 思想汇报总表为只读汇总；本人提交入口在成员台「成长」页，本页不承载写动作 |
| `org.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `org.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `org.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `org.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `org.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `org.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `org.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `org.todo` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `org.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `org.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `org.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations/:id/decide |
| `party-committee.branches` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/auth-audit |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config/rollback |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/appointments |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：PUT /api/v1/branches/:id/roster |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |
| `party-committee.dispatch` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/system-notices |
| `party-committee.dispatch` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/auth-audit |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/reviewRequests/:id |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config/rollback |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/appointments |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/report/trigger |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |
| `party-committee.review` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/auth-audit |
| `party-committee.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/reviewRequests/:id |
| `party-committee.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/reviewRequests |
| `party-committee.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/archiveRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/archiveRecords/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/externalDispatches |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/externalDispatches/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/fileSpaceRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/imageRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |
| `prop.kanban` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/propTasks |
| `prop.kanban` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/propTasks/:id |
| `prop.kanban` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `prop.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/tasks |
| `prop.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/tasks/:id |
| `prop.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/periodicArchives |
| `prop.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `prop.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `prop.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `prop.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `prop.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `prop.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `prop.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |
| `secretary.committee-meeting` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/agenda-votes |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/agenda-votes |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/agenda-votes/:id/annotate |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/agenda-votes/lock |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/branch-commissioners |
| `secretary.feedback` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.feedback` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.feedback` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.feedback` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `secretary.feedback` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.feedback` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.group-progress` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.group-progress` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.group-progress` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/partyGroups/:id |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.notification` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/system-notices |
| `secretary.notification` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.notification` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/notices/:id |
| `secretary.notification` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `secretary.notification` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.overview` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.report-up` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/tasks |
| `secretary.report-up` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/tasks/:id |
| `secretary.report-up` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/assignments |
| `secretary.report-up` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/assignments/:id |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `secretary.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `secretary.todo` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations/:id/decide |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/tasks |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/tasks/:id |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：DELETE /api/v1/tasks/:id |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/assignments |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/assignments/:id |
| `visitor.activities` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/signups |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `visitor.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `visitor.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `visitor.attendance` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `visitor.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `visitor.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `visitor.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `visitor.growth` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `visitor.growth` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/thoughtReports |
| `visitor.growth` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/thoughtReports/:id |
| `visitor.growth` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `visitor.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `visitor.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `visitor.projects` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/tasks/:id |
| `visitor.projects` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/signups |
| `visitor.projects` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `visitor.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `visitor.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `visitor.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `visitor.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `visitor.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `visitor.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `visitor.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `visitor.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `visitor.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `secretary.overview` | 7 | 共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 | 6 |
| `org.todo` | 5 | 页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） | 3 |
| `org.overview` | 6 | 共享三层骨架 5 块 + 页内「活动日历」折叠卡（承接原活动日历页签） | 5 |
| `prop.todo` | 5 | 页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） | 3 |
| `prop.overview` | 6 | 共享三层骨架 5 块 + 页内「活动日历」折叠卡 | 5 |
| `prop.kanban` | 5 | 待启动 / 进行中 / 宣传任务三块主体之外，另有独立的「去档案归档」去向条与页头并列 | 5 |
| `disc.todo` | 5 | 页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） | 3 |
| `disc.overview` | 6 | 共享三层骨架 5 块 + 页内「活动日历」折叠卡 | 5 |
| `disc.attendance` | 6 | 确认视图：分段条 + 工作视图切换 + 待确认考勤 + 出勤申诉 + 会议考勤录入，加页头共 6 块 | 7 |
| `disc.inspection` | 5 | 督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块） | 4 |
| `leader.todo` | 5 | 页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） | 2 |
| `leader.overview` | 6 | 共享三层骨架 5 块 + 页内「活动日历」折叠卡 | 5 |
| `visitor.todo` | 5 | 页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） | 3 |
| `visitor.overview` | 5 | 无页内折叠卡，但共享骨架本身 5 块（含「我已处理」折叠） | 4 |
