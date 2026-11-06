# 页签审计报告

- 生成时间：2026-11-02T12:22:17.118Z
- 耗时：43788 ms
- 服务：http://127.0.0.1:60895
- 数据库形态：memory（:memory: 临时库）
- 页签数：5
- 汇总：P0 0 / P1 6 / P2 1 · exception 0

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 待办 `secretary.todo` | 4 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 全局概况 `secretary.overview` | 7 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 活动动态 `visitor.activities` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | fail(P1) |
| 意见反馈 `secretary.feedback` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 组员进展 `leader.members` | 4 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|
| `secretary.todo` | pass | pass | skip | skip | pass | pass | pass | pass |
| `secretary.overview` | pass | pass | skip | skip | pass | pass | pass | pass |
| `visitor.activities` | pass | pass | skip | skip | pass | pass | pass | pass |
| `secretary.feedback` | pass | pass | skip | skip | pass | pass | fail(P2) | pass |
| `leader.members` | pass | pass | skip | skip | pass | pass | pass | pass |

## P0（0）

（无）

## P1（6）

### leader.members · F1

- key：`leader.members`
- rule：`F1`
- message：DOM 实测顶层块 3（原始直接子块 1）≠ 基线 4（块数口径需同批校准）
- evidence：`{"measured":3,"raw":1,"baseline":4,"blocks":["section.card rounded-xl p-0","div.card rounded-xl p-4","section.card rounded-xl p-4"]}`

### secretary.feedback · F1

- key：`secretary.feedback`
- rule：`F1`
- message：DOM 实测顶层块 1（原始直接子块 1）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":1,"raw":1,"baseline":3,"blocks":["div.card rounded-xl p-5"]}`

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
- message：DOM 实测顶层块 14（原始直接子块 2）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":14,"raw":2,"baseline":3,"blocks":["span.text-xs text-gray-500","line","line","line","line","line","line","rect","line","line","line","circle","line","div.card rounded-xl p-5"]}`

### visitor.activities · F8

- key：`visitor.activities`
- rule：`F8`
- message：console.error 1（仅控制台噪声，不阻断功能）
- evidence：`{"pageErrors":[],"consoleErrors":["[calendar] 缺少日历容器 #cal-main-grid"],"http4xx":[],"counts":{"pageErrors":0,"consoleErrors":1,"http4xx":0}}`

## P2（1）

### secretary.feedback · E1

- key：`secretary.feedback`
- rule：`E1`
- message：读口超预算 20%：GET /api/v1/issue-unread（p95 80ms vs 预算 50ms）
- evidence：`{"endpoint":"GET /api/v1/issue-unread","stats":{"endpoint":"GET /api/v1/issue-unread","runs":5,"p50":5,"p95":80,"min":4,"max":80,"bytes":249},"budget":{"p95":50,"bytes":299},"budgetSource":"perf-baseline-tab"}`

## 例外登记（不计违规）（0）

（无）

## 跳过项（不假绿）（26）

| key | rule | message |
|---|---|---|
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `leader.members` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `secretary.feedback` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.feedback` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.feedback` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.feedback` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `secretary.feedback` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.feedback` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
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
