# 页签审计报告

- 生成时间：2026-11-02T12:07:49.366Z
- 耗时：27369 ms
- 服务：http://127.0.0.1:53130
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 0 / P1 4 / P2 0 · exception 1

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 今天 `secretary.today` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 成员名册 `org.roster` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 活动动态 `visitor.activities` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | fail(P1) |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D2 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|---|
| `secretary.today` | pass | — | pass | skip | skip | pass | pass | pass | pass |
| `org.roster` | pass | pass | pass | skip | exception | pass | pass | pass | pass |
| `visitor.activities` | pass | — | pass | skip | skip | pass | pass | pass | pass |

## P0（0）

（无）

## P1（4）

### org.roster · F1

- key：`org.roster`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 1）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":2,"raw":1,"baseline":3,"blocks":["div.card rounded-xl p-4","div.card rounded-xl p-4"]}`

### secretary.today · F1

- key：`secretary.today`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 1）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":2,"raw":1,"baseline":3,"blocks":["h2.page-frame__title","div.card rounded-xl p-5"]}`

### visitor.activities · F1

- key：`visitor.activities`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 2）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":2,"raw":2,"baseline":3,"blocks":["div.flex flex-wrap items-center","div.card rounded-xl p-5"]}`

### visitor.activities · F8

- key：`visitor.activities`
- rule：`F8`
- message：console.error 1（仅控制台噪声，不阻断功能）
- evidence：`{"pageErrors":[],"consoleErrors":["[calendar] 缺少日历容器 #cal-main-grid"],"http4xx":[],"counts":{"pageErrors":0,"consoleErrors":1,"http4xx":0}}`

## P2（0）

（无）

## 例外登记（不计违规）（1）

| key | rule | message |
|---|---|---|
| `org.roster` | C2 | destructive 流程未真删（无 CRUD 配方）：member-transfer-out |

## 跳过项（不假绿）（19）

| key | rule | message |
|---|---|---|
| `org.roster` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：PATCH /api/v1/users/:id |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/intake |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/members/:id/profile |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/members/:id/undo-transfer-out |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/memberFlows |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/memberFlows/:id |
| `org.roster` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/users/:id |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `visitor.activities` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/signups |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/signups/:id |
| `visitor.activities` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |

## 例外清单（>4 块）

（无）
