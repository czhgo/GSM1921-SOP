---
name: data-inspector
description: "Use when checking closure and consistency of sopData.js and return a read-only report."
---

# 触发条件
- 需要检查 `src/workflow/sopData.js` 的 JSON/对象结构闭合性。
- 需要检查同类数据结构字段一致性。

# 动作
- 执行任何操作前，必须先输出 `### Blueprint` 执行计划，等待用户回复【确认】后方可继续。
- 仅读取并解析 `src/workflow/sopData.js`。
- 检查括号、引号、逗号、数组与对象闭合。
- 检查同层级节点字段缺失、重名、类型漂移。
- 输出只读报告：问题位置、影响范围、修复建议。

# 红线
- 禁止修改任何文件。
- 仅输出报告，不执行自动修复。
- 本 Skill 属于只读核查，不触发执行部门跨部门调用起居院记录。
