# 页签审计报告

- 生成时间：2026-11-02T11:41:31.449Z
- 耗时：11574 ms
- 服务：http://127.0.0.1:3219
- 数据库形态：shared（复用已起服务；写维度应降级）
- 页签数：1
- 汇总：P0 0 / P1 1 / P2 0 · exception 0

判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。

## 评分卡

| 页签 | blocks | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|---|---|---|---|---|---|---|---|---|---|
| 专班管理 `org.taskforce` | 4 | fail(P1) | pass | pass | pass | pass | pass | pass | pass |

> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。

## 其他维度

| 页签 | D1 | D3 | C1 | C2 | C3 | C4 | E1 | E2 |
|---|---|---|---|---|---|---|---|---|
| `org.taskforce` | pass | pass | skip | skip | pass | pass | pass | pass |

## P0（0）

（无）

## P1（1）

### org.taskforce · F1

- key：`org.taskforce`
- rule：`F1`
- message：DOM 实测顶层块 2（原始直接子块 2）≠ 基线 4（块数口径需同批校准）
- evidence：`{"measured":2,"raw":2,"baseline":4,"blocks":["section.card rounded-xl p-0","details.card rounded-xl p-0"]}`

## P2（0）

（无）

## 例外登记（不计违规）（0）

（无）

## 跳过项（不假绿）（11）

| key | rule | message |
|---|---|---|
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PATCH /api/v1/taskforces/:id |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/taskforces/:id/dissolution |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PATCH /api/v1/signups/:id |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/workgroups/:id/members |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PUT /api/v1/workgroups/:id/members |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：DELETE /api/v1/workgroups/:id/members/:personId |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/workgroups/:id/tasks |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：PATCH /api/v1/workgroups/:id/tasks/:taskId |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/workgroups/:id/outputs |
| `org.taskforce` | C1 | 写口探针 404（靶行或路径未命中，待 C4 静态核对）：POST /api/v1/workgroups/:id/coordinate |
| `org.taskforce` | C2 | shared-db 不写入（CRUD 在共享演示库一律跳过） |

## 例外清单（>4 块）

（无）
