# 页签审计报告

- 生成时间：2026-11-08T15:37:53.249Z
- 耗时：31625 ms
- 服务：http://127.0.0.1:51534
- 数据库形态：memory（:memory: 临时库）
- 页签数：4
- 汇总：P0 0 / P1 0 / P2 0 · exception 3

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 人才库 `org.talent` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 考勤管理 `disc.attendance` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |
| 院级内容 `party-committee.gov-content` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 下发通知 `party-committee.dispatch` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `org.talent` | pass | pass | pass | skip | pass | pass | pass | pass | pass | pass | exception |
| `disc.attendance` | pass | pass | pass | skip | pass | pass | pass | pass | exception | pass | pass |
| `party-committee.gov-content` | pass | pass | pass | skip | pass | pass | pass | pass | pass | pass | pass |
| `party-committee.dispatch` | pass | pass | pass | skip | pass | pass | pass | pass | pass | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `org.talent` | pass | pass | exception |
| `disc.attendance` | exception | pass | pass |
| `party-committee.gov-content` | pass | pass | pass |
| `party-committee.dispatch` | pass | pass | pass |

明细：

- `org.talent` · M1：pass —— 顶层块 4 ≤ 4（无超限例外）
- `org.talent` · M2：pass —— 可见 H3 3 个，无重复卡头
- `org.talent` · M3：exception —— 同页 .lf-bar 2 条，已登记例外：发展对象与参与活动是两个独立对象池，各自按阶段/活动筛选；合并会串味
- `disc.attendance` · M1：exception —— 顶层块 6 > 4，已登记例外：单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块
- `disc.attendance` · M2：pass —— 可见 H3 4 个，无重复卡头
- `disc.attendance` · M3：pass —— .lf-bar 1 条（≤1）
- `party-committee.gov-content` · M1：pass —— 顶层块 4 ≤ 4（无超限例外）
- `party-committee.gov-content` · M2：pass —— 可见 H3 2 个，无重复卡头
- `party-committee.gov-content` · M3：pass —— .lf-bar 0 条（≤1）
- `party-committee.dispatch` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `party-committee.dispatch` · M2：pass —— 可见 H3 1 个，无重复卡头
- `party-committee.dispatch` · M3：pass —— .lf-bar 0 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（0）

（无）

## 例外登记（不计违规）（3）

| key | rule | message |
|---|---|---|
| `disc.attendance` | F1 | 顶层块 6 > 4，已登记例外：单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块 |
| `disc.attendance` | M1 | 顶层块 6 > 4，已登记例外：单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块 |
| `org.talent` | M3 | 同页 .lf-bar 2 条，已登记例外：发展对象与参与活动是两个独立对象池，各自按阶段/活动筛选；合并会串味 |

## 跳过项（不假绿）（30）

| key | rule | message |
|---|---|---|
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendances |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendances/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/makeupTasks |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/attendance-appeals/:id |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `disc.attendance` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/reviewRequests/:id |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config/rollback |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/appointments |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/report/trigger |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/committee/activities |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/committee/activities/:id |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/committee/activities/:id/cancel |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/committee/activities/:id/archive |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/committee/activities/:id/publication |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/committee/activities/:id/dispatch |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/committee/documents |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/committee/documents/:id |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/committee/documents/:id/withdraw |
| `party-committee.gov-content` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `disc.attendance` | 6 | 单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块 | 3 |
