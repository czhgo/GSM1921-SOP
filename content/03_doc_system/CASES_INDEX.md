---
title: "判例库总索引"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-10-24"
status: active
related_files: [OPERATIONS_GUIDE.md, DOC_MAP.md, content/04_web_design/design-system/CASES.md, content/02_institution/CASES.md, content/05_ai_coding/CASES.md]
---

# 判例库总索引

> **本文件回答什么**：判例**有哪些、在哪、对应哪条规范**——只做目录，不承载判例正文或规范条文。
> **不回答什么**：判例正文 → 各域 `CASES.md`；规范条文 → 各域规范文件；编号与分职规则 → [OPERATIONS_GUIDE.md §32](OPERATIONS_GUIDE.md#32-文档分职与判例编号2026-10-24-立)。
> **谁什么时候读**：`[工程师]+[AI]`，改一条规范前先在这里找它有没有判例；新增判例时先取号再落文。

## 登记规则

- 判例编号格式 `CASE-<域>-<三位序号>`，域取 `DESIGN` / `INST` / `AI`，一经登记不改号。
- 新增判例：先在本表取下一个空号 → 写入所属域的 `CASES.md` → 回填本表 → 在对应规范条目写「判例：CASE-…」。
- 判例与规范**双向指针缺一不可**；只写判例不链规范，或只删规范不链判例，均视为迁移未完成（`OPERATIONS_GUIDE.md §32.3`）。
- 本表是索引：只记编号与去向，不复述判例正文，也不承载规范条文。

## 判例总表

| 判例编号 | 一句话 | 所属域 | 文件链接 | 对应规范编号 | 首次出现轮次 |
|---|---|---|---|---|---|
| CASE-DESIGN-001 | 链接色只承担跳转语义，蓝色留给信息态 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-22 | 批次 507 |
| CASE-DESIGN-002 | 中性控件按下不得闪红，按压三源分开 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-23 | 批次 507 |
| CASE-DESIGN-003 | 按压反馈只用内阴影，不用位移 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-24 | 批次 507 |
| CASE-DESIGN-004 | 选中态用主题 soft 三件套，不借灰底 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-25 | 批次 508 |
| CASE-DESIGN-005 | 实底按钮 hover 同色相加深，不落灰 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-26 | 批次 508 |
| CASE-DESIGN-006 | 输入焦点只答一次，键盘环单独出 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-27 | 批次 508 |
| CASE-DESIGN-007 | 禁用与只读两态可辨，不用 opacity 混同 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-28 | 批次 508 |
| CASE-DESIGN-008 | 原生 select 一律经 enhanceSelects | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-29 | 批次 508 |
| CASE-DESIGN-009 | 过渡时长与属性收敛到唯一源 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-30 | 批次 508 |
| CASE-DESIGN-010 | 活动类别 tone 单一源，状态色不借类别色 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-31 | 批次 508 |
| CASE-DESIGN-011 | 深链目标页必须消费参数，失败须可见 | design | [CASES.md](../04_web_design/design-system/CASES.md) | SD-32 | 批次 508 |
| CASE-INST-001 | 匿名反馈改裁为支部内闭环、无系统揭名入口 | institution | [CASES.md](../02_institution/CASES.md) | `SYSTEM_ROLE_PERMISSION §9j`（SR 待编号） | 2026-10-16（D-824） |
| CASE-INST-002 | 意见处置与品牌认定归支委会，支书主持 | institution | [CASES.md](../02_institution/CASES.md) | `SYSTEM_ROLE_PERMISSION §9j`（SR 待编号） | 2026-09-18 |
| CASE-INST-003 | 过程时限统一属可配置制度参数 | institution | [CASES.md](../02_institution/CASES.md) | `SYSTEM_ROLE_PERMISSION §9l`（SR 待编号） | 2026-09-17 |
| CASE-INST-004 | 思想汇报字数依同族登记推导为可调 | institution | [CASES.md](../02_institution/CASES.md) | `SYSTEM_ROLE_PERMISSION §9l`（SR 待编号） | 2026-09-21（批次 124） |
| CASE-INST-005 | config 写权不硬凑角色键，另立 §9h | institution | [CASES.md](../02_institution/CASES.md) | `SYSTEM_ROLE_PERMISSION §9h/§9f`（SR 待编号） | 2026-09-09 |
| CASE-AI-001 | 前序总结说完成，实测 7 处遗漏 | ai-coding | [CASES.md](../05_ai_coding/CASES.md) | `CONTEXT_MANAGEMENT.md`「对话总结虚假完成陷阱」 | T94（会话交接） |
| CASE-AI-002 | 「听起来合理」不能当制度依据 | ai-coding | [CASES.md](../05_ai_coding/CASES.md) | `CONTEXT_MANAGEMENT.md`「上下文丢失后制度推断陷阱」 | 原 KNOWN_PITFALLS §4（2026-09-04 并入） |
| CASE-AI-003 | 改名只改文件名，引用残留 | ai-coding | [CASES.md](../05_ai_coding/CASES.md) | `DOCUMENT_GOVERNANCE.md`「一改具改执行」 | 原 KNOWN_PITFALLS §2（2026-09-04 并入） |
| CASE-AI-004 | 批量脚本重复执行误覆盖源文件 | ai-coding | [CASES.md](../05_ai_coding/CASES.md) | `FILE_OPERATION_RULES.md`「批量脚本沙箱重复执行」 | T-282（2026-08-24 立规） |
| CASE-AI-005 | e2e 绕过前端写穿，被冲刷覆盖 | ai-coding | [CASES.md](../05_ai_coding/CASES.md) | `TEST_AND_VERIFICATION.md`「浏览器 e2e 写穿断言」 | 2026-08-27（e2e-login 回归） |

## 域入口

| 域 | 判例文件 | 现有条数 |
|---|---|---|
| design（网站设计） | [04_web_design/design-system/CASES.md](../04_web_design/design-system/CASES.md) | 11 |
| institution（制度） | [02_institution/CASES.md](../02_institution/CASES.md) | 5 |
| ai-coding（AI 协作） | [05_ai_coding/CASES.md](../05_ai_coding/CASES.md) | 5 |
