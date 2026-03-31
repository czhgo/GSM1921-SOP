---
name: experience-distiller
description: "Use when distilling logs tagged as not distilled, then write after user confirmation and update tags."
---

# 触发条件
- 需要从执行日志沉淀可复用经验。
- 日志中存在 `[经验蒸馏: 否]` 条目。

# 动作
- 扫描日志文件中所有 `[经验蒸馏: 否]` 条目。
- 输出提炼矩阵表格（任务、问题、根因、经验规则、适用边界、原日志定位）。
- 等待用户回复【确认】后，才写入《经验沉淀》。
- 写入完成后，将对应日志标签更新为 `[经验蒸馏: 是]`。

# 红线
- 未获确认不得写入《经验沉淀》。
- 未完成写入不得提前更新原日志标签。
- 禁止改动未纳入本次提炼的日志条目。
