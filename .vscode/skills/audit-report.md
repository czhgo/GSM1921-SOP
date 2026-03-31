---
name: audit-report
description: "Use when scanning workspace in read-only mode and producing a file criticality grading table."
---

# 触发条件
- 需要做治理审计前的全局摸底。
- 需要输出文件重要性分级表。

# 动作
- 执行任何操作前，必须先输出 `### Blueprint` 执行计划，等待用户回复【确认】后方可继续。
- 只读扫描工作区结构与核心文件。
- 按影响范围与变更风险对文件分级（S/A/B/C）。
- 输出表格：文件路径、级别、用途、变更风险、审计建议。

# 红线
- 禁止修改任何文件。
- 禁止生成虚构文件与虚构结论。
