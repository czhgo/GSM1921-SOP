---
name: ui-verifier
description: "Use when verifying HTML interaction loop integrity and output a read-only report."
---

# 触发条件
- 需要验证页面交互是否形成闭环。
- 需要核查 HTML 元素与脚本事件绑定一致性。

# 动作
- 仅读取 `index.html` 与关联脚本。
- 检查关键交互链路：入口控件、事件触发、状态反馈、异常兜底。
- 检查表单/按钮/导航是否存在不可达或无响应路径。
- 输出只读报告：通过项、缺陷项、复现步骤、修复建议。

# 红线
- 禁止修改任何文件。
- 仅输出报告，不执行自动修复。
