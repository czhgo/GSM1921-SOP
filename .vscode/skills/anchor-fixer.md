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
- 执行任何操作前，先输出蓝图，等待用户回复【确认】后方可修改。

# 红线
- 未获跨文件明确指令，不得跨文件改动。
- 不改动与锚点无关内容。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出一行变更日志草稿，并向用户询问【请回复确认以写入日志】。
