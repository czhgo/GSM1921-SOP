---
name: log-recorder
description: "Use when recording execution logs with monthly auto-file creation and enforced distillation tag."
---

# 触发条件
- 收到待记录的任务日志草稿。
- 需要执行月度日志建档或追加。

# 动作
- 读取系统时间并提取当前月份 `YYYY-MM`。
- 目标文件：`logs/YYYY-MM-EXECUTION_LOG.md`。
- 若目标文件不存在：自动创建并写入标准标题：`# YYYY-MM EXECUTION LOG`。
- 将接收到的日志草稿追加到文件末尾。
- 每条新增日志末尾强制附加：`[经验蒸馏: 否]`。

# 红线
- 不得覆盖既有日志内容。
- 不得省略月份判定与自动建档步骤。
- 不得省略 `[经验蒸馏: 否]` 标签。
