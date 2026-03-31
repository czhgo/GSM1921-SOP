---
name: term-cleaner
description: "Use when cleaning headings and titles by removing numeric prefixes and fixing reversed appellations under dual-domain and sectional principles."
---

# 触发条件
- 需要按双域与条块原则清洗标题。
- 需要剥离标题数字前缀。
- 需要纠正称谓倒置。

# 动作
- 扫描目标文本中的标题与称谓。
- 删除标题数字前缀（如 `1.`、`01-`、`（一）` 等保留语义不变）。
- 修正称谓顺序，确保表达符合组织语义。
- 执行任何操作前，先输出蓝图，等待用户回复【确认】后方可修改。

# 红线
- 不改写事实含义，不引入新结论。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出一行变更日志草稿，并向用户询问【请回复确认以写入日志】。
