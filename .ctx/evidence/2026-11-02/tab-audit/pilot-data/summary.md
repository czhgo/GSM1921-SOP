# 页签审计报告

- 生成时间：2026-11-02T11:34:11.799Z
- 耗时：10987 ms
- 服务：http://127.0.0.1:59483
- 数据库形态：memory（:memory: 临时库）
- 页签数：1
- 汇总：P0 0 / P1 1 / P2 0 · exception 1

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 党小组 `secretary.group-progress` | 2 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D2 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|---|
| `secretary.group-progress` | pass | pass | pass | skip | exception | pass | pass | pass | pass |

## P0（0）

（无）

## P1（1）

### secretary.group-progress · F1

- key：`secretary.group-progress`
- rule：`F1`
- message：DOM 实测顶层块 1 ≠ 基线 2（块数口径需同批校准）
- evidence：`{"measured":1,"baseline":2,"blocks":["div.space-y-4"]}`

## P2（0）

（无）

## 例外登记（不计违规）（1）

| key | rule | message |
|---|---|---|
| `secretary.group-progress` | C2 | destructive 流程未对存量执行：group-dissolve（仅清理本次探针行） |

## 跳过项（不假绿）（5）

| key | rule | message |
|---|---|---|
| `secretary.group-progress` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.group-progress` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issue-unread |
| `secretary.group-progress` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/partyGroups/:id |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |
| `secretary.group-progress` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issue-unread |

## 例外清单（>4 块）

（无）
