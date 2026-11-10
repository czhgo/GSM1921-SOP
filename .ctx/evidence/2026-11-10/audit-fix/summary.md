# 页签审计报告

- 生成时间：2026-11-10T12:12:38.242Z
- 耗时：24561 ms
- 服务：http://127.0.0.1:56222
- 数据库形态：memory（:memory: 临时库）
- 页签数：4
- 汇总：P0 0 / P1 0 / P2 1 · exception 3

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 活动管理 `secretary.calendar` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支部分工 `secretary.work-map` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支委会 `secretary.committee-meeting` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 党小组 `secretary.group-progress` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D2 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `secretary.calendar` | pass | — | pass | pass | exception | pass | pass | pass | pass | fail(P2) | pass | pass |
| `secretary.work-map` | pass | — | pass | pass | exception | pass | pass | pass | pass | pass | pass | pass |
| `secretary.committee-meeting` | pass | — | pass | pass | skip | pass | pass | pass | pass | pass | pass | pass |
| `secretary.group-progress` | pass | pass | pass | pass | exception | pass | pass | pass | pass | pass | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `secretary.calendar` | fail(P2) | pass | pass |
| `secretary.work-map` | pass | pass | pass |
| `secretary.committee-meeting` | pass | pass | pass |
| `secretary.group-progress` | pass | pass | pass |

明细：

- `secretary.calendar` · M1：fail —— 基线漂移：DOM 实测 10 块 vs 登记 3 块（差 +7 > 4）——须重核 TAB_BLOCK_BASELINE['secretary.calendar']
- `secretary.calendar` · M2：pass —— 可见 H3 1 个，无重复卡头
- `secretary.calendar` · M3：pass —— .lf-bar 1 条（≤1）
- `secretary.work-map` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `secretary.work-map` · M2：pass —— 可见 H3 2 个，无重复卡头
- `secretary.work-map` · M3：pass —— .lf-bar 0 条（≤1）
- `secretary.committee-meeting` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `secretary.committee-meeting` · M2：pass —— 可见 H3 3 个，无重复卡头
- `secretary.committee-meeting` · M3：pass —— .lf-bar 0 条（≤1）
- `secretary.group-progress` · M1：pass —— 顶层块 2 ≤ 4（无超限例外）
- `secretary.group-progress` · M2：pass —— 可见 H3 2 个，无重复卡头
- `secretary.group-progress` · M3：pass —— .lf-bar 0 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（1）

### secretary.calendar · M1

- key：`secretary.calendar`
- rule：`M1`
- message：基线漂移：DOM 实测 10 块 vs 登记 3 块（差 +7 > 4）——须重核 TAB_BLOCK_BASELINE['secretary.calendar']
- evidence：`{"key":"secretary.calendar","blocks":3,"measured":10,"drift":7,"limit":4,"reason":"","oversize":[{"key":"secretary.overview","blocks":7,"reason":"共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡"},{"key":"org.todo","blocks":5,"reason":"页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构）"},{"key":"org.overview","blocks":6,"reason":"共享三层骨架 5 块 + 页内「活动日历」折叠卡（承接原活动日历页签）"},{"key":"prop.todo","blocks":5,"reason":"页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构）"},{"key":"prop.overview","blocks":6,"reason":"共享三层骨架 5 块 + 页内「活动日历」折叠卡"},{"key":"prop.kanban","blocks":5,"reason":"待启动 / 进行中 / 宣传任务三块主体之外，另有独立的「去档案归档」去向条与页头并列"},{"key":"disc.todo","blocks":5,"reason":"页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构）"},{"key":"disc.overview","blocks":6,"reason":"共享三层骨架 5 块 + 页内「活动日历」折叠卡"},{"key":"disc.attendance","blocks":6,"reason":"单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块"},{"key":"disc.inspection","blocks":5,"reason":"督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块）"},{"key":"leader.todo","blocks":5,"reason":"页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构）"},{"key":"leader.overview","blocks":6,"reason":"共享三层骨架 5 块 + 页内「活动日历」折叠卡"},{"key":"visitor.todo","blocks":5,"reason":"页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构）"},{"key":"visitor.overview","blocks":5,"reason":"无页内折叠卡，但共享骨架本身 5 块（含「我已处理」折叠）"}]}`

## 例外登记（不计违规）（3）

| key | rule | message |
|---|---|---|
| `secretary.calendar` | C2 | destructive 流程未真删（无 CRUD 配方）：activity-delete |
| `secretary.group-progress` | C2 | destructive 流程未对存量执行：group-dissolve（仅清理本次探针行） |
| `secretary.work-map` | C2 | destructive 流程未真删（无 CRUD 配方）：assignment-delete |

## 跳过项（不假绿）（20）

| key | rule | message |
|---|---|---|
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/agenda-votes |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/agenda-votes/:id/annotate |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/agenda-votes/lock |
| `secretary.committee-meeting` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/branch-commissioners |
| `secretary.group-progress` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/partyGroups/:id |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/tasks |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/tasks/:id |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：DELETE /api/v1/tasks/:id |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/assignments |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/assignments/:id |

## 例外清单（>4 块）

（无）
