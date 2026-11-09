# 页签审计报告

- 生成时间：2026-11-09T15:04:57.576Z
- 耗时：20343 ms
- 服务：http://127.0.0.1:53218
- 数据库形态：memory（:memory: 临时库）
- 页签数：2
- 汇总：P0 0 / P1 0 / P2 0 · exception 2

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

> **批次 539 证据**：`disc.review` 复盘页收敛 ＋ `party-committee.branches` 复核（该页 B 项因「目录只创建 / 选择」契约回退未改）；计分口径见 `.ctx/logs/2026-11-DECISION_LOG.md §D-862`。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 复盘 `disc.review` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 支部管理 `party-committee.branches` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D2 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `disc.review` | pass | — | pass | pass | skip | pass | pass | pass | pass | pass | pass | exception |
| `party-committee.branches` | pass | pass | pass | pass | exception | pass | pass | pass | pass | pass | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `disc.review` | pass | pass | exception |
| `party-committee.branches` | pass | pass | pass |

明细：

- `disc.review` · M1：pass —— 顶层块 4 ≤ 4（无超限例外）
- `disc.review` · M2：pass —— 可见 H3 2 个，无重复卡头
- `disc.review` · M3：exception —— 同页 .lf-bar 2 条，已登记例外：监督卡与上报/复盘列表口径不同（监督对象 vs 上报记录），筛选维度不可共用
- `party-committee.branches` · M1：pass —— 顶层块 2 ≤ 4（无超限例外）
- `party-committee.branches` · M2：pass —— 可见 H3 1 个，无重复卡头
- `party-committee.branches` · M3：pass —— .lf-bar 1 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（0）

（无）

## 例外登记（不计违规）（2）

| key | rule | message |
|---|---|---|
| `disc.review` | M3 | 同页 .lf-bar 2 条，已登记例外：监督卡与上报/复盘列表口径不同（监督对象 vs 上报记录），筛选维度不可共用 |
| `party-committee.branches` | C2 | destructive 流程未真删（无 CRUD 配方）：branch-delete |

## 跳过项（不假绿）（12）

| key | rule | message |
|---|---|---|
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activityReviews |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activityReviews/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/taskforceReviews |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/taskforceReviews/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config/rollback |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/appointments |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：PUT /api/v1/branches/:id/roster |
| `party-committee.branches` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |

## 例外清单（>4 块）

（无）
