# 页签审计报告

- 开始时间：2026-11-02T06:13:54.374Z
- 耗时：707763 ms
- 服务：http://127.0.0.1:50284
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 0 / P1 1 / P2 9 · pass 86 · exception 0 · skip 22

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## P0（0）

（无）

## P1（1）

### prop.archive · F5

- key：`prop.archive`
- rule：`F5`
- message：未命名 section 1 个；section 嵌套 1 处
- evidence：`{"unnamed":[{"hasLabel":false,"label":""}],"nestedSections":1}`

## P2（9）

### prop.archive · D4

- key：`prop.archive`
- rule：`D4`
- message：读口 GET /api/v1/activities 超预算（p95 1423ms / 24011B）
- evidence：`{"read":"GET /api/v1/activities","stats":{"runs":5,"p50":550,"p95":1423,"min":368,"max":1423,"bytes":24011},"budget":{"p95":50,"bytes":28814},"budgetSource":"perf-baseline"}`

### prop.archive · D4

- key：`prop.archive`
- rule：`D4`
- message：读口 GET /api/v1/archiveRecords 超预算（p95 376ms / 1237B）
- evidence：`{"read":"GET /api/v1/archiveRecords","stats":{"runs":5,"p50":184,"p95":376,"min":113,"max":376,"bytes":1237},"budget":{"p95":50,"bytes":1485},"budgetSource":"perf-baseline"}`

### prop.archive · D4

- key：`prop.archive`
- rule：`D4`
- message：读口 GET /api/v1/externalDispatches 超预算（p95 104ms / 613B）
- evidence：`{"read":"GET /api/v1/externalDispatches","stats":{"runs":5,"p50":60,"p95":104,"min":45,"max":104,"bytes":613},"budget":{"p95":50,"bytes":736},"budgetSource":"perf-baseline"}`

### prop.archive · D4

- key：`prop.archive`
- rule：`D4`
- message：读口 GET /api/v1/users 超预算（p95 108ms / 9892B）
- evidence：`{"read":"GET /api/v1/users","stats":{"runs":5,"p50":61,"p95":108,"min":54,"max":108,"bytes":9892},"budget":{"p95":50,"bytes":11871},"budgetSource":"perf-baseline"}`

### prop.archive · E1

- key：`prop.archive`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/activities（p95 1423ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/activities","stats":{"endpoint":"GET /api/v1/activities","runs":5,"p50":550,"p95":1423,"min":368,"max":1423,"bytes":24011},"budget":{"p95":50,"bytes":28814},"budgetSource":"perf-baseline"}`

### prop.archive · E1

- key：`prop.archive`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/archiveRecords（p95 376ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/archiveRecords","stats":{"endpoint":"GET /api/v1/archiveRecords","runs":5,"p50":184,"p95":376,"min":113,"max":376,"bytes":1237},"budget":{"p95":50,"bytes":1485},"budgetSource":"perf-baseline"}`

### prop.archive · E1

- key：`prop.archive`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/externalDispatches（p95 104ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/externalDispatches","stats":{"endpoint":"GET /api/v1/externalDispatches","runs":5,"p50":60,"p95":104,"min":45,"max":104,"bytes":613},"budget":{"p95":50,"bytes":736},"budgetSource":"perf-baseline"}`

### prop.archive · E1

- key：`prop.archive`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/imageRecords（p95 97ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/imageRecords","stats":{"endpoint":"GET /api/v1/imageRecords","runs":5,"p50":28,"p95":97,"min":6,"max":97,"bytes":2},"budget":{"p95":50,"bytes":3},"budgetSource":"perf-baseline"}`

### prop.archive · E1

- key：`prop.archive`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/users（p95 108ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/users","stats":{"endpoint":"GET /api/v1/users","runs":5,"p50":61,"p95":108,"min":54,"max":108,"bytes":9892},"budget":{"p95":50,"bytes":11871},"budgetSource":"perf-baseline"}`

## 例外登记（不计违规）（0）

（无）

## 跳过项（不假绿）（22）

| key | rule | message |
|---|---|---|
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/todos/:id |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/archiveRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/archiveRecords/:id |
| `prop.archive` | C2 | 同一路径已在首条写口中完成完整往返：/api/v1/archiveRecords/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/externalDispatches |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/externalDispatches/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/fileSpaceRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/imageRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/partyGroups/:id |
| `secretary.group-progress` | C2 | 同一路径已在首条写口中完成完整往返：/api/v1/partyGroups/:id |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |

## 按页签

| 页签 | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | D1 | D2 | D3 | D4 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `secretary.group-progress` | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | — | pass | 跳过 | pass | pass | pass | pass |
| `prop.archive` | pass | pass | pass | pass | P1 | pass | pass | pass | pass | — | pass | P2 | pass | 跳过 | pass | pass | pass | pass |
| `leader.members` | pass | pass | pass | pass | pass | pass | pass | pass | pass | — | pass | — | pass | 跳过 | pass | pass | pass | pass |

## 最慢 / 最大（预留）

> 由 `checks-economy.mjs` 的 `E1`/`E2` evidence 提供（p50/p95 与响应体字节）；本报告保留聚合位，暂不汇总。
