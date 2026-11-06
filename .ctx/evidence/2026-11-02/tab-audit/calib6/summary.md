# 页签审计报告

- 生成时间：2026-11-02T12:24:16.687Z
- 耗时：22977 ms
- 服务：http://127.0.0.1:52841
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 0 / P1 4 / P2 2 · exception 0

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 活动动态 `visitor.activities` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | fail(P1) |
| 全局概况 `secretary.overview` | 7 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 待办 `secretary.todo` | 4 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|
| `visitor.activities` | pass | pass | skip | skip | pass | pass | pass | pass |
| `secretary.overview` | pass | pass | skip | skip | pass | pass | fail(P2) | pass |
| `secretary.todo` | pass | pass | skip | skip | pass | pass | fail(P2) | pass |

## P0（0）

（无）

## P1（4）

### secretary.overview · F1

- key：`secretary.overview`
- rule：`F1`
- message：DOM 实测顶层块 6（原始直接子块 1）≠ 基线 7（块数口径需同批校准）
- evidence：`{"measured":6,"raw":1,"baseline":7,"blocks":["section.metric-band metric-band--interactive metric-band--cards","div.card rounded-xl card-standard","div.card rounded-xl card-standard","div.card rounded-xl card-standard","section.card rounded-xl card-standard","section.card rounded-xl card-standard"]}`

### secretary.todo · F1

- key：`secretary.todo`
- rule：`F1`
- message：DOM 实测顶层块 3（原始直接子块 2）≠ 基线 4（块数口径需同批校准）
- evidence：`{"measured":3,"raw":2,"baseline":4,"blocks":["div.disclosure-host card rounded-xl","div.card rounded-xl p-5","div.card rounded-xl p-5"]}`

### visitor.activities · F1

- key：`visitor.activities`
- rule：`F1`
- message：DOM 实测顶层块 9（原始直接子块 2）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":9,"raw":2,"baseline":3,"blocks":["span.text-xs text-gray-500","line","rect","line","line","line","circle","line","div.card rounded-xl p-5"]}`

### visitor.activities · F8

- key：`visitor.activities`
- rule：`F8`
- message：console.error 1（仅控制台噪声，不阻断功能）
- evidence：`{"pageErrors":[],"consoleErrors":["[calendar] 缺少日历容器 #cal-main-grid"],"http4xx":[],"counts":{"pageErrors":0,"consoleErrors":1,"http4xx":0}}`

## P2（2）

### secretary.overview · E1

- key：`secretary.overview`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/todos（p95 7ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/todos","stats":{"endpoint":"GET /api/v1/todos","runs":5,"p50":5,"p95":7,"min":4,"max":7,"bytes":1105},"budget":{"p95":50,"bytes":665},"budgetSource":"perf-baseline-tab"}`

### secretary.todo · E1

- key：`secretary.todo`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/todos（p95 8ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/todos","stats":{"endpoint":"GET /api/v1/todos","runs":5,"p50":6,"p95":8,"min":5,"max":8,"bytes":1105},"budget":{"p95":50,"bytes":665},"budgetSource":"perf-baseline-tab"}`

## 例外登记（不计违规）（0）

（无）

## 跳过项（不假绿）（13）

| key | rule | message |
|---|---|---|
| `secretary.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.overview` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `secretary.todo` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations/:id/decide |
| `visitor.activities` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/signups |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `secretary.overview` | 7 | 共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 | 6 |
