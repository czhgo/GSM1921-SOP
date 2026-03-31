---
name: ui-verifier
description: "Use when verifying HTML interaction loop integrity and output a read-only report."
---

# 触发条件
- 需要验证页面交互是否形成闭环。
- 需要核查 HTML 元素与脚本事件绑定一致性。

# 动作
- 执行任何操作前，必须先输出 `### Blueprint` 执行计划，等待用户回复【确认】后方可继续。
- 仅读取 `index.html` 与关联脚本。
- 检查关键交互链路：入口控件、事件触发、状态反馈、异常兜底。
- 检查表单/按钮/导航是否存在不可达或无响应路径。
- 输出只读报告：通过项、缺陷项、复现步骤、修复建议。

# 红线
- 禁止修改任何文件。
- 仅输出报告，不执行自动修复。
- 本 Skill 属于只读核查，不触发执行部门跨部门调用起居院记录。
