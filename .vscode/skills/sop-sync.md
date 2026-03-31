---
name: sop-sync
description: "Use when syncing SOP content while preserving markdown structure integrity and protecting code exemption zones."
---

# 触发条件
- 需要同步 SOP 内容到目标文档。
- 需要保证 Markdown 结构完整不碎裂。

# 动作
- 对齐源与目标 SOP 段落结构（标题层级、列表、表格、引用）。
- 同步内容时保持 Markdown 语法闭合与层级稳定。
- 识别并保护代码豁免区（如代码块、内联代码、约定免改片段）。
- 执行任何操作前，先输出蓝图，等待用户回复【确认】后方可修改。

# 红线
- 不破坏标题层级与列表嵌套关系。
- 不改动代码豁免区。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出一行变更日志草稿，并向用户询问【请回复确认以写入日志】。
