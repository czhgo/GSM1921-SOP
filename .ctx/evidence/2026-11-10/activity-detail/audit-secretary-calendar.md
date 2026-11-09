# 页签审计报告

- 生成时间：2026-11-09T20:01:20.918Z
- 耗时：9111 ms
- 服务：http://127.0.0.1:50189
- 数据库形态：memory（:memory: 临时库）
- 页签数：1
- 汇总：P0 0 / P1 0 / P2 0 · exception 1

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 活动管理 `secretary.calendar` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `secretary.calendar` | pass | pass | pass | exception | pass | pass | pass | pass | pass | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `secretary.calendar` | pass | pass | pass |

明细：

- `secretary.calendar` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `secretary.calendar` · M2：pass —— 可见 H3 1 个，无重复卡头
- `secretary.calendar` · M3：pass —— .lf-bar 1 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（0）

（无）

## 例外登记（不计违规）（1）

| key | rule | message |
|---|---|---|
| `secretary.calendar` | C2 | destructive 流程未真删（无 CRUD 配方）：activity-delete |

## 跳过项（不假绿）（6）

| key | rule | message |
|---|---|---|
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |

## 例外清单（>4 块）

（无）
