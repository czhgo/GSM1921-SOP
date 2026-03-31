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
- 执行任何操作前，必须先输出 `### Blueprint` 执行计划，等待用户回复【确认】后方可继续。

# 红线
- 不破坏标题层级与列表嵌套关系。
- 不改动代码豁免区。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出日志摘要（变更文件、关键动作、执行结果、风险与回滚点），并直接调用起居院：`@起居院 请基于以下摘要按当月模板写入执行日志：...`。
