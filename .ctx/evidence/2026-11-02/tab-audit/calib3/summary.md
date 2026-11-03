# 页签审计报告

- 生成时间：2026-11-02T11:57:07.925Z
- 耗时：28740 ms
- 服务：http://127.0.0.1:56312
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 1 / P1 4 / P2 0 · exception 0

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 全局概况 `secretary.overview` | 7 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `org.overview` | 6 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 下发通知 `party-committee.dispatch` | 3 | fail(P1) | pass | pass | pass | fail(P1) | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|
| `secretary.overview` | pass | pass | skip | skip | pass | pass | pass | pass |
| `org.overview` | pass | pass | skip | skip | pass | pass | pass | pass |
| `party-committee.dispatch` | pass | pass | skip | fail(P0) | pass | pass | pass | pass |

## P0（1）

### party-committee.dispatch · C2

- key：`party-committee.dispatch`
- rule：`C2`
- message：CRUD 往返失败（notices）：create 403 {"error":"无权限：通知发布仅限支书/副支书/组织委员/宣传委员，编辑与删除另含纪检委员"}
- evidence：`{"recipe":"notices","endpoint":"/api/v1/notices","steps":[{"step":"create","status":403}]}`

## P1（4）

### org.overview · F1

- key：`org.overview`
- rule：`F1`
- message：DOM 实测顶层块 5（原始直接子块 1）≠ 基线 6（块数口径需同批校准）
- evidence：`{"measured":5,"raw":1,"baseline":6,"blocks":["section.metric-band metric-band--interactive metric-band--cards","div.card rounded-xl card-standard","div.card rounded-xl card-standard","div.card rounded-xl card-standard","div.card rounded-xl p-5"]}`

### party-committee.dispatch · F1

- key：`party-committee.dispatch`
- rule：`F1`
- message：DOM 实测顶层块 1（原始直接子块 1）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":1,"raw":1,"baseline":3,"blocks":["div.page-section-stack"]}`

### party-committee.dispatch · F5

- key：`party-committee.dispatch`
- rule：`F5`
- message：未命名 section 0 个；section 嵌套 1 处
- evidence：`{"unnamed":[],"nestedSections":[{"inner":"card page-section page-section--form","outer":"pc-dispatch-panel"}]}`

### secretary.overview · F1

- key：`secretary.overview`
- rule：`F1`
- message：DOM 实测顶层块 6（原始直接子块 1）≠ 基线 7（块数口径需同批校准）
- evidence：`{"measured":6,"raw":1,"baseline":7,"blocks":["section.metric-band metric-band--interactive metric-band--cards","div.card rounded-xl card-standard","div.card rounded-xl card-standard","div.card rounded-xl card-standard","section.card rounded-xl card-standard","section.card rounded-xl card-standard"]}`

## P2（0）

（无）

## 例外登记（不计违规）（0）

（无）

## 跳过项（不假绿）（19）

| key | rule | message |
|---|---|---|
| `org.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `org.overview` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `org.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/reviewRequests |
| `org.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `org.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `party-committee.dispatch` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/system-notices |
| `party-committee.dispatch` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/auth-audit |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/reviewRequests/:id |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/branches/:id/config/rollback |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branches/:id/appointments |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/report/trigger |
| `party-committee.dispatch` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/auth-audit |
| `secretary.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.overview` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `secretary.overview` | 7 | 共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 | 6 |
| `org.overview` | 6 | 共享三层骨架 5 块 + 页内「活动日历」折叠卡（承接原活动日历页签） | 5 |
