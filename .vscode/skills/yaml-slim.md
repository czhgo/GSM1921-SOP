---
name: yaml-slim
description: "Use when slimming YAML frontmatter by physically deleting last_updated while preserving version."
---

# 触发条件
- 需要精简 Markdown/YAML 头部元数据。
- 存在 `last_updated` 字段且需移除。

# 动作
- 定位文档 YAML frontmatter。
- 物理删除 `last_updated` 字段及其值。
- 保留 `version` 字段与其原值。
- 执行任何操作前，先输出蓝图，等待用户回复【确认】后方可修改。

# 红线
- 不删除 `version`。
- 不改动 frontmatter 之外正文。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出一行变更日志草稿，并向用户询问【请回复确认以写入日志】。
