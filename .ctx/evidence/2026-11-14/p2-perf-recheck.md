# P2 perf 重测：5 条读口预算告警（2026-11-14）

## 结论

2026-11-10 审计登记 5 条 perf P2 —— `org.member-flow` 4 条（`GET /api/v1/memberFlows` p95 105ms、`GET /api/v1/partyGroups` p95 183ms，各含 D4 与 E1 两处计数）、`prop.today` 1 条（`GET /api/v1/users` p95 85ms；三端点预算均 50ms）——在 2026-11-14 真机重测 5 次均不复现，判「环境噪声」，5 条全部关闭。

## 读数（2026-11-14 实测）

| 端点 | p50 | p95 | min | max | bytes |
|---|---|---|---|---|---|
| GET /api/v1/memberFlows | 2ms | 68ms | 1ms | 68ms | 2 |
| GET /api/v1/partyGroups | 2ms | 2ms | 2ms | 2ms | 472 |
| GET /api/v1/users | 3ms | 4ms | 3ms | 4ms | 9892 |

## 方法

本机 3000 端口服务（`DISABLE_PASSWORD_CHECK=1`），以 2300010001 登录，每端点串行 5 次；p95 取 5 次中的最大值；首跑含冷启动，p50 已回到 2–3ms。

## 与旧读数对照

旧读数 p95 105 / 183 / 85ms 只在首次或冷启动命中，5 次重测无法复现；不构成代码回归，也无缓存改造必要。

## 另注

3 条 M1 块数漂移已于 `D-874` 关闭（`dom-probe` 误报），证据见 `.ctx/evidence/2026-11-14/d873-block-remeasure.md`，本文件不重复。
