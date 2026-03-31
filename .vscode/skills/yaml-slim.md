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
- 执行任何操作前，必须先输出 `### Blueprint` 执行计划，等待用户回复【确认】后方可继续。

# 红线
- 不删除 `version`。
- 不改动 frontmatter 之外正文。
- 未获确认不得执行任何实际修改。
- 任务完成后，必须自动输出日志摘要（变更文件、关键动作、执行结果、风险与回滚点），并直接调用起居院：`@起居院 请基于以下摘要按当月模板写入执行日志：...`。
