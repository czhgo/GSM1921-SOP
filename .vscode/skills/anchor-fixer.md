---
name: anchor-fixer
description: "Use when fixing broken markdown anchors via search-and-replace; default to current file only unless user explicitly requests cross-file changes."
---

# 触发条件
- 文档存在死链锚点或锚点跳转错误。
- 需要通过搜索替换修复锚点。

# 动作
- 默认仅在当前文件内搜索与替换锚点。
- 校正锚点命名、链接格式与目标片段一致性。
- 跨文件操作需用户额外指令。
- 执行任何操作前，必须先输出 `### Blueprint` 执行计划，等待用户回复【确认】后方可继续。

# 红线
- 未获跨文件明确指令，不得跨文件改动。
- 不改动与锚点无关内容。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出日志摘要（变更文件、关键动作、执行结果、风险与回滚点），并直接调用起居院：`@起居院 请基于以下摘要按当月模板写入执行日志：...`。
