# 页签审计报告

- 生成时间：2026-11-02T15:46:35.086Z
- 耗时：12190 ms
- 服务：http://127.0.0.1:64420
- 数据库形态：memory（:memory: 临时库）
- 页签数：1
- 汇总：P0 0 / P1 0 / P2 0 · exception 2

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 全局概况 `secretary.overview` | 7 | exception | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 | M1 | M2 | M3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `secretary.overview` | pass | pass | skip | skip | pass | pass | pass | pass | exception | pass | pass |

## 信息经济

| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |
|---|---|---|---|
| `secretary.overview` | exception | pass | pass |

明细：

- `secretary.overview` · M1：exception —— 顶层块 7 > 4，已登记例外：共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡
- `secretary.overview` · M2：pass —— 可见 H3 5 个，无重复卡头
- `secretary.overview` · M3：pass —— .lf-bar 1 条（≤1）

## P0（0）

（无）

## P1（0）

（无）

## P2（0）

（无）

## 例外登记（不计违规）（2）

| key | rule | message |
|---|---|---|
| `secretary.overview` | F1 | 顶层块 7 > 4，已登记例外：共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 |
| `secretary.overview` | M1 | 顶层块 7 > 4，已登记例外：共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 |

## 跳过项（不假绿）（4）

| key | rule | message |
|---|---|---|
| `secretary.overview` | C1 | 写口先被参数校验拦下（空体 400），未证明权限门：POST /api/v1/issues |
| `secretary.overview` | C2 | 同一资源已在首条写口中完成完整往返：/api/v1/todos/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：PATCH /api/v1/periodicArchives/:id |
| `secretary.overview` | C2 | 无最小合法请求体配方，待人工补充：POST /api/v1/issues |

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `secretary.overview` | 7 | 共享骨架 5 块（页头 / 结论带 / 条线表 / 待我处理 / 我已处理）+ 支书专属「周期归档待审核」「知情查看」两卡 | 6 |
