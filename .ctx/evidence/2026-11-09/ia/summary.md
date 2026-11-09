# 页签审计报告

- 生成时间：2026-11-09T14:18:40.091Z
- 耗时：30826 ms
- 服务：http://127.0.0.1:53790
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 0 / P1 0 / P2 1 · exception 2

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

> **批次 539 证据**：IA 三条（`party-committee.dispatch` / `leader.write` / `org.member-flow`）走查读数；计分口径见 `.ctx/logs/2026-11-DECISION_LOG.md §D-862`。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 下发通知 `party-committee.dispatch` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 本组活动 `leader.write` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |
| 成员流动 `org.member-flow` | 3 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `party-committee.dispatch` | pass | pass | pass | skip | pass | pass | pass | pass | pass | pass | pass |
| `leader.write` | pass | pass | pass | exception | pass | pass | fail(P2) | pass | pass | pass | pass |
| `org.member-flow` | pass | pass | pass | exception | pass | pass | pass | pass | pass | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `party-committee.dispatch` | pass | pass | pass |
| `leader.write` | pass | pass | pass |
| `org.member-flow` | pass | pass | pass |

明细：

- `party-committee.dispatch` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `party-committee.dispatch` · M2：pass —— 可见 H3 1 个，无重复卡头
- `party-committee.dispatch` · M3：pass —— .lf-bar 0 条（≤1）
- `leader.write` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `leader.write` · M2：pass —— 可见 H3 4 个，无重复卡头
- `leader.write` · M3：pass —— .lf-bar 1 条（≤1）
- `org.member-flow` · M1：pass —— 顶层块 3 ≤ 4（无超限例外）
- `org.member-flow` · M2：pass —— 可见 H3 2 个，无重复卡头
- `org.member-flow` · M3：pass —— .lf-bar 0 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（1）

### leader.write · E1

- key：`leader.write`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/activities（p95 94ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/activities","stats":{"endpoint":"GET /api/v1/activities","runs":5,"p50":14,"p95":94,"min":11,"max":94,"bytes":24011},"budget":{"p95":50,"bytes":28814},"budgetSource":"perf-baseline-tab"}`

## 例外登记（不计违规）（2）

| key | rule | message |
|---|---|---|
| `leader.write` | C2 | destructive 流程未真删（无 CRUD 配方）：activity-delete |
| `org.member-flow` | C2 | destructive 流程未真删（无 CRUD 配方）：member-transfer-out |

## 跳过项（不假绿）（18）

| key | rule | message |
|---|---|---|
| `leader.write` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `leader.write` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `leader.write` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `leader.write` | C2 | 无法创建 CRUD 探针（leader 对 POST /api/v1/notices 返回 403），未做真实往返 |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/intake |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/:id/undo-transfer-out |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/memberFlows |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/memberFlows/:id |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations |
| `org.member-flow` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/users/:id |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/reviewRequests/:id |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config/rollback |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/appointments |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/report/trigger |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |

## 例外清单（>4 块）

（无）
