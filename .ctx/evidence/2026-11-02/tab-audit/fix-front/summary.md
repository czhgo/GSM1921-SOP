# 页签审计报告

- 生成时间：2026-11-02T12:02:23.316Z
- 耗时：17580 ms
- 服务：http://127.0.0.1:63303
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 0 / P1 3 / P2 0 · exception 1

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 全局概况 `secretary.overview` | 7 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 活动管理 `secretary.calendar` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |
| 意见反馈 `secretary.feedback` | 3 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|
| `secretary.overview` | pass | pass | skip | skip | pass | pass | pass | pass |
| `secretary.calendar` | pass | pass | skip | exception | pass | pass | pass | pass |
| `secretary.feedback` | pass | pass | skip | skip | pass | pass | pass | pass |

## P0（0）

（无）

## P1（3）

### secretary.calendar · F1

- key：`secretary.calendar`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 2）≠ 基线 3（块数口径需同批校准）
- evidence：`{"measured":2,"raw":2,"baseline":3,"blocks":["div.flex flex-wrap items-center","div.card rounded-xl p-5"]}`

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

## P2（0）

（无）

## 例外登记（不计违规）（1）

| key | rule | message |
|---|---|---|
| `secretary.calendar` | C2 | destructive 流程未真删（无 CRUD 配方）：activity-delete |

## 跳过项（不假绿）（19）

| key | rule | message |
|---|---|---|
| `secretary.calendar` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PATCH /api/v1/activities/:id |
| `secretary.calendar` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：DELETE /api/v1/activities/:id |
| `secretary.calendar` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/activities/:id/archive |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/archive |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activities/:id/brand |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/branchDocs |
| `secretary.calendar` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/uploads |
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

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `secretary.overview` | 7 | 共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 | 6 |
