---
name: yaml-slim
description: "Use when: YAML 元数据精简、frontmatter 规范化、保留版本字段（吏部/刑部）"
---

# 触发条件
- 需要精简 Markdown/YAML 头部元数据。
- 存在 `last_updated` 字段且需移除。

# 动作
- 定位文档 YAML frontmatter。
- 物理删除 `last_updated` 字段及其值。
- 保留 `version` 字段与其原值。
- 执行任何操作前，必须先输出 `### Blueprint`，并用 `/ask` 请求授权。

# 红线
- 不删除 `version`。
- 不改动 frontmatter 之外正文。
- 未获确认不得执行任何实际修改。
- 任务完成后，若存在语义/结构实质改动，执行部门（吏部/户部/礼部/刑部）必须直接调用：`@起居院`，由起居院通过 `/ask` 确认后写入。
- 单次会话最多允许 3 个 Agent 获得 Allow；涉及第 4 个 Agent 必须先请求用户发送“确认”。
