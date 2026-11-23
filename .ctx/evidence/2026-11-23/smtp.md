---
title: "SMTP 演练读数（2026-11-23）"
type: evidence
role: "[工程师]+[AI]"
last_updated: 2026-11-23
status: active
---

# SMTP 演练（批次 607 · 外部门 `SMTP`）

- 命令：`cd server; node scripts/verify-smtp.mjs`
- 口径：真实 SMTP 协议会话（本地 sink，AUTH LOGIN），**非第三方邮件服务商实投**；失败样本以 `MAIL_RETRY_DELAYS_MS=0,0,0` 跳过退避。
- 结果：**通过**（3/3）

| 样本 | 判定 | 读数 |
|---|---|---|
| ① 正常投递 | ✅ | ok=true · 收到 1 封 · rcpt=secretary@test.local |
| ② 认证失败 | ✅ | ok=false · error=Invalid login: 535 Authentication failed |
| ③ 连接超时 | ✅ | ok=false · error=Connection timeout · 4868ms |

- 服务商实投复跑：`MFTP=...`（提供 `SMTP_HOST/PORT/USER/PASS/TLS` 后重跑同一脚本，结果追加本表）。
