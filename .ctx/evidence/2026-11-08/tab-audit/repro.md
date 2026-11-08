# 页签审计报告

- 生成时间：2026-11-07T22:51:14.127Z
- 耗时：43057 ms
- 服务：http://127.0.0.1:55032
- 数据库形态：memory（:memory: 临时库）
- 页签数：3
- 汇总：P0 1 / P1 2 / P2 0 · exception 1

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 支部分工 `secretary.work-map` | 3 | pass | pass | pass | pass | pass | pass | fail(P1) | pass |
| 意见反馈 `secretary.feedback` | 3 | pass | pass | pass | pass | pass | pass | fail(P1) | pass |
| 待办 `visitor.todo` | 5 | exception | pass | pass | pass | pass | pass | pass | fail(P0) |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## P0（1）

### visitor.todo · F8

- key：`visitor.todo`
- rule：`F8`
- message：4xx 1
- evidence：`{"pageErrors":[],"consoleErrors":[],"http4xx":[{"status":403,"url":"http://127.0.0.1:55032/api/v1/todo-groups?role=visitor&personId=2400012349"}],"counts":{"pageErrors":0,"consoleErrors":0,"http4xx":1}}`

## P1（2）

### secretary.feedback · F7

- key：`secretary.feedback`
- rule：`F7`
- message：390 横向溢出：scrollWidth 400 > innerWidth 390
- evidence：`{"scrollWidth":400,"innerWidth":390}`

### secretary.work-map · F7

- key：`secretary.work-map`
- rule：`F7`
- message：390 横向溢出：scrollWidth 419 > innerWidth 390
- evidence：`{"scrollWidth":419,"innerWidth":390}`

## P2（0）

（无）

## 例外登记（不计违规）（1）

| key | rule | message |
|---|---|---|
| `visitor.todo` | F1 | 顶层块 5 > 4，已登记例外：页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） |

## 跳过项（不假绿）（0）

（无）

## 例外清单（>4 块）

| 页签 | 基线块数 | 登记理由 | 本次实测 |
|---|---|---|---|
| `visitor.todo` | 5 | 页顶折叠条 + 我的待办 + 详情 + 页内「我经办的反馈」区（五台同构） | 3 |
