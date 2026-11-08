# 页签审计报告

- 生成时间：2026-11-08T15:36:31.984Z
- 耗时：10461 ms
- 服务：http://127.0.0.1:52533
- 数据库形态：memory（:memory: 临时库）
- 页签数：1
- 汇总：P0 0 / P1 0 / P2 0 · exception 2

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 考勤管理 `disc.attendance` | 6 | exception | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `disc.attendance` | pass | pass | pass | skip | pass | pass | pass | pass | exception | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `disc.attendance` | exception | pass | pass |

明细：

- `disc.attendance` · M1：exception —— 顶层块 6 > 4，已登记例外：单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块
- `disc.attendance` · M2：pass —— 可见 H3 4 个，无重复卡头
- `disc.attendance` · M3：pass —— .lf-bar 1 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（0）

（无）

## 例外登记（不计违规）（2）

| key | rule | message |
|---|---|---|
| `disc.attendance` | F1 | 顶层块 6 > 4，已登记例外：单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块 |
| `disc.attendance` | M1 | 顶层块 6 > 4，已登记例外：单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块 |

## 跳过项（不假绿）（9）

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

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `disc.attendance` | 6 | 单一层级视图：分段条（考勤/补课）+ 待确认考勤 + 出勤申诉 + 会议考勤录入 + 考勤数据（矩阵/总表合卡），加页头共 6 块 | 3 |
