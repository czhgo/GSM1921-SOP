# 页签审计报告

- 生成时间：2026-11-09T14:12:55.983Z
- 耗时：11035 ms
- 服务：http://127.0.0.1:51375
- 数据库形态：memory（:memory: 临时库）
- 页签数：1
- 汇总：P0 0 / P1 0 / P2 2 · exception 1

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

> **批次 539 证据**：改后读数（责任关系由主从两栏改单列对象列表）；改前对照见 `work-map/before/`；计分口径见 `.ctx/logs/2026-11-DECISION_LOG.md §D-862`。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 支部分工 `secretary.work-map` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | D4 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `secretary.work-map` | pass | pass | fail(P2) | pass | exception | pass | pass | fail(P2) | pass | pass | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `secretary.work-map` | pass | pass | pass |

明细：

- `secretary.work-map` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `secretary.work-map` · M2：pass —— 可见 H3 2 个，无重复卡头
- `secretary.work-map` · M3：pass —— .lf-bar 0 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（2）

### secretary.work-map · D4

- key：`secretary.work-map`
- rule：`D4`
- message：读口 GET /api/v1/tasks 超预算（p95 107ms / 1068B）
- evidence：`{"read":"GET /api/v1/tasks","stats":{"runs":5,"p50":21,"p95":107,"min":10,"max":107,"bytes":1068},"budget":{"p95":50,"bytes":1282},"budgetSource":"perf-baseline-tab"}`

### secretary.work-map · E1

- key：`secretary.work-map`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/tasks（p95 107ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/tasks","stats":{"endpoint":"GET /api/v1/tasks","runs":5,"p50":21,"p95":107,"min":10,"max":107,"bytes":1068},"budget":{"p95":50,"bytes":1282},"budgetSource":"perf-baseline-tab"}`

## 例外登记（不计违规）（1）

| key | rule | message |
|---|---|---|
| `secretary.work-map` | C2 | destructive 流程未真删（无 CRUD 配方）：assignment-delete |

## 跳过项（不假绿）（5）

| key | rule | message |
|---|---|---|
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/tasks |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/tasks/:id |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：DELETE /api/v1/tasks/:id |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/assignments |
| `secretary.work-map` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/assignments/:id |

## 例外清单（>4 块）

（无）
