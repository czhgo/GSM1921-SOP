# 页签审计报告

- 生成时间：2026-11-02T16:16:52.060Z
- 耗时：29270 ms
- 服务：http://127.0.0.1:50570
- 数据库形态：memory（:memory: 临时库）
- 页签数：4
- 汇总：P0 0 / P1 0 / P2 0 · exception 7

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 人才库 `org.talent` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 复盘 `disc.review` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |
| 考察管理 `disc.inspection` | 5 | exception | pass | pass | pass | pass | pass | pass | pass |
| 组员进展 `leader.members` | 4 | pass | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `org.talent` | pass | pass | skip | skip | pass | pass | pass | pass | pass | pass | exception |
| `disc.review` | pass | pass | skip | skip | pass | pass | pass | pass | pass | pass | exception |
| `disc.inspection` | pass | pass | skip | exception | pass | pass | pass | pass | exception | pass | exception |
| `leader.members` | pass | pass | skip | skip | pass | pass | pass | pass | pass | pass | exception |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `org.talent` | pass | pass | exception |
| `disc.review` | pass | pass | exception |
| `disc.inspection` | exception | pass | exception |
| `leader.members` | pass | pass | exception |

明细：

- `org.talent` · M1：pass —— 顶层块 4 ≤ 4（无超限例外）
- `org.talent` · M2：pass —— 可见 H3 3 个，无重复卡头
- `org.talent` · M3：exception —— 同页 .lf-bar 2 条，已登记例外：发展对象与参与活动是两个独立对象池，各自按阶段/活动筛选；合并会串味
- `disc.review` · M1：pass —— 顶层块 4 ≤ 4（无超限例外）
- `disc.review` · M2：pass —— 可见 H3 2 个，无重复卡头
- `disc.review` · M3：exception —— 同页 .lf-bar 2 条，已登记例外：监督卡与上报/复盘列表口径不同（监督对象 vs 上报记录），筛选维度不可共用
- `disc.inspection` · M1：exception —— 顶层块 5 > 4，已登记例外：督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块）
- `disc.inspection` · M2：pass —— 可见 H3 4 个，无重复卡头
- `disc.inspection` · M3：exception —— 同页 .lf-bar 2 条，已登记例外：待考察与历史考察是两个队列，状态与时间口径不同
- `leader.members` · M1：pass —— 顶层块 4 ≤ 4（无超限例外）
- `leader.members` · M2：pass —— 可见 H3 2 个，无重复卡头
- `leader.members` · M3：exception —— 同页 .lf-bar 2 条，已登记例外：组员进展与组员汇报是两个独立列表（进度 vs 答复），筛选对象不同

## P0（0）

（无）

## P1（0）

（无）

## P2（0）

（无）

## 例外登记（不计违规）（7）

| key | rule | message |
|---|---|---|
| `disc.inspection` | F1 | 顶层块 5 > 4，已登记例外：督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块） |
| `disc.inspection` | C2 | destructive 流程未真删（无 CRUD 配方）：inspection-delete |
| `disc.inspection` | M1 | 顶层块 5 > 4，已登记例外：督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块） |
| `disc.inspection` | M3 | 同页 .lf-bar 2 条，已登记例外：待考察与历史考察是两个队列，状态与时间口径不同 |
| `disc.review` | M3 | 同页 .lf-bar 2 条，已登记例外：监督卡与上报/复盘列表口径不同（监督对象 vs 上报记录），筛选维度不可共用 |
| `leader.members` | M3 | 同页 .lf-bar 2 条，已登记例外：组员进展与组员汇报是两个独立列表（进度 vs 答复），筛选对象不同 |
| `org.talent` | M3 | 同页 .lf-bar 2 条，已登记例外：发展对象与参与活动是两个独立对象池，各自按阶段/活动筛选；合并会串味 |

## 跳过项（不假绿）（25）

| key | rule | message |
|---|---|---|
| `disc.inspection` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/handoffs |
| `disc.inspection` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspection-appeals/:id |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/handoffs |
| `disc.inspection` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `disc.review` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/system-notices |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/activityReviews |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activityReviews/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/taskforceReviews |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/taskforceReviews/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/activities/:id |
| `disc.review` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/system-notices |
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `leader.members` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/issues/:id |
| `leader.members` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |
| `leader.members` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `org.talent` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/inspection-appeals |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspections |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/inspections/:id |
| `org.talent` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/inspection-appeals |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `disc.inspection` | 5 | 督办清单 / 考察申诉 / 考察代录 / 考察总表四张功能卡并列（含页头 5 块） | 4 |
