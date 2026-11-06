# 页签审计报告

- 生成时间：2026-11-02T11:52:49.455Z
- 耗时：43360 ms
- 服务：http://127.0.0.1:63938
- 数据库形态：memory（:memory: 临时库）
- 页签数：6
- 汇总：P0 2 / P1 8 / P2 0 · exception 0

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 全局概况 `secretary.overview` | 7 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 待办 `secretary.todo` | 4 | fail(P1) | pass | pass | pass | fail(P1) | pass | pass | pass |
| 今天 `secretary.today` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 工作概况 `org.overview` | 6 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 组员进展 `leader.members` | 4 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 下发通知 `party-committee.dispatch` | 3 | fail(P1) | pass | pass | pass | fail(P1) | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|
| `secretary.overview` | pass | pass | skip | skip | pass | pass | pass | pass |
| `secretary.todo` | pass | pass | skip | skip | pass | pass | pass | pass |
| `secretary.today` | pass | pass | skip | fail(P0) | pass | pass | pass | pass |
| `org.overview` | pass | pass | skip | skip | pass | pass | pass | pass |
| `leader.members` | pass | pass | skip | skip | pass | pass | pass | pass |
| `party-committee.dispatch` | pass | pass | skip | fail(P0) | pass | pass | pass | pass |

## P0（2）

### party-committee.dispatch · C2

- key：`party-committee.dispatch`
- rule：`C2`
- message：CRUD 往返失败（notices）：create 403 {"error":"无权限：通知发布仅限支书/副支书/组织委员/宣传委员，编辑与删除另含纪检委员"}
- evidence：`{"recipe":"notices","endpoint":"/api/v1/notices","steps":[{"step":"create","status":403}]}`

### secretary.today · C2

- key：`secretary.today`
- rule：`C2`
- message：CRUD 往返失败（todos）：create 404 <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/v1/todos/:id</pre>
</body>
</html>

- evidence：`{"recipe":"todos","endpoint":"/api/v1/todos/:id","steps":[{"step":"create","status":404}]}`

## P1（8）

### leader.members · F1

- key：`leader.members`
- rule：`F1`
- message：DOM 实测顶层块 3（原始直接子块 1）≠ 基线 4（块数口径需同批校准）
- evidence：`{"measured":3,"raw":1,"baseline":4,"blocks":["section.card rounded-xl p-0","div.card rounded-xl p-4","section.card rounded-xl p-4"]}`

### org.overview · F1

- key：`org.overview`
- rule：`F1`
- message：DOM 实测顶层块 1（原始直接子块 1）≠ 基线 6（块数口径需同批校准）
- evidence：`{"measured":1,"raw":1,"baseline":6,"blocks":["div.stack-page"]}`

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
- message：DOM 实测顶层块 1（原始直接子块 1）≠ 基线 7（块数口径需同批校准）
- evidence：`{"measured":1,"raw":1,"baseline":7,"blocks":["div"]}`

### secretary.today · F1

- key：`secretary.today`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 1）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":2,"raw":1,"baseline":3,"blocks":["h2.page-frame__title","div.card rounded-xl p-5"]}`

### secretary.todo · F1

- key：`secretary.todo`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 2）≠ 基线 4（块数口径需同批校准）
- evidence：`{"measured":2,"raw":2,"baseline":4,"blocks":["div.disclosure-host card rounded-xl","div.grid grid-cols-1 lg:grid-cols-3"]}`

### secretary.todo · F5

- key：`secretary.todo`
- rule：`F5`
- message：未命名 section 2 个；section 嵌套 0 处
- evidence：`{"unnamed":[{"hasLabel":false,"label":"","id":"","cls":"todo-urgency-group secretary-todo-urgency-group","parent":"div"},{"hasLabel":false,"label":"","id":"","cls":"todo-urgency-group secretary-todo-urgency-group","parent":"div"}],"nestedSections":[]}`

## P2（0）

（无）

## 例外登记（不计违规）（0）

（无）

## 跳过项（不假绿）（38）

| key | rule | message |
|---|---|---|
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `leader.members` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
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
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/attendance-appeals |
| `secretary.today` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/attendance-appeals |
| `secretary.today` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |
| `secretary.todo` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `secretary.todo` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/handoffs/:id/confirm |
| `secretary.todo` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs/:id/confirm |
| `secretary.todo` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/member-confirmations/:id/decide |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `secretary.overview` | 7 | 共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 | 1 |
| `org.overview` | 6 | 共享三层骨架 5 块 + 页内「活动日历」折叠卡（承接原活动日历页签） | 1 |
