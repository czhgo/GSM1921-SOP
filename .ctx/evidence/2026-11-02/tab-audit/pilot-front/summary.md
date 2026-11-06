# 页签审计报告

- 生成时间：2026-11-02T11:44:21.835Z
- 耗时：26719 ms
- 服务：http://127.0.0.1:57121
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 0 / P1 2 / P2 0 · exception 2

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 党小组 `secretary.group-progress` | 2 | pass | pass | pass | pass | pass | pass | pass | pass |
| 档案归档 `prop.archive` | 4 | pass | pass | pass | pass | fail(P1) | pass | pass | pass |
| 组员进展 `leader.members` | 4 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D2 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|---|
| `secretary.group-progress` | pass | pass | pass | skip | exception | pass | pass | pass | pass |
| `prop.archive` | pass | — | pass | skip | exception | pass | pass | pass | pass |
| `leader.members` | pass | — | pass | skip | skip | pass | pass | pass | pass |

## P0（0）

（无）

## P1（2）

### leader.members · F1

- key：`leader.members`
- rule：`F1`
- message：DOM 实测顶层块 3（原始直接子块 1）≠ 基线 4（块数口径需同批校准）
- evidence：`{"measured":3,"raw":1,"baseline":4,"blocks":["section.card rounded-xl p-0","div.card rounded-xl p-4","section.card rounded-xl p-4"]}`

### prop.archive · F5

- key：`prop.archive`
- rule：`F5`
- message：未命名 section 1 个；section 嵌套 1 处
- evidence：`{"unnamed":[{"hasLabel":false,"label":"","id":"photo-wall-groups","cls":"space-y-3","parent":"div"}],"nestedSections":[{"inner":"photo-wall-groups","outer":"archive-review-card"}]}`

## P2（0）

（无）

## 例外登记（不计违规）（2）

| key | rule | message |
|---|---|---|
| `prop.archive` | C2 | destructive 流程未真删（无 CRUD 配方）：archive-record-delete |
| `secretary.group-progress` | C2 | destructive 流程未对存量执行：group-dissolve（仅清理本次探针行） |

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
| `prop.archive` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/activities/:id/archive |
| `prop.archive` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PATCH /api/v1/activities/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/archiveRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/archiveRecords/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/externalDispatches |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/externalDispatches/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/fileSpaceRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/imageRecords |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `prop.archive` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |
| `secretary.group-progress` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.group-progress` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.group-progress` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/partyGroups/:id |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |

## 例外清单（>4 块）

（无）
