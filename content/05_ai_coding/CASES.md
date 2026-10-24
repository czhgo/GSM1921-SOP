---
title: "AI 协作域判例库"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-10-24"
status: active
related_files: [README.md, content/03_doc_system/CASES_INDEX.md, content/03_doc_system/OPERATIONS_GUIDE.md]
---

# AI 协作域判例库

> **本文件回答什么**：AI 协作方法条目**为什么这样定、边界在哪里**——每条记「真实发生过的场景 → 结论 → 边界 → 对应规范编号 → 证据指针」。
> **不回答什么**：方法正文与检查步骤 → [README.md](README.md) 所列五个分篇；目录与入口 → [CASES_INDEX.md](../03_doc_system/CASES_INDEX.md)；逐批过程 → `.ctx/logs/`。
> **读者**：`[工程师]+[AI]`。开新会话、接续旧会话、写批量脚本、做 e2e 验证之前读对应条目的边界一列。
> **纪律**：判例不产生规范效力（`OPERATIONS_GUIDE.md §32.3`）。AI 协作域的规范编号当前以分篇节名与 `CLAUDE.md H` 编号为准（`OP-` 编号待启用）。「结论」列只复述本条判例当时确认的落点，规范效力一律以对应分篇条目为准。

---

## CASE-AI-001 对话总结声称「已完成」，实测有 7 处遗漏

- **编号**：CASE-AI-001
- **场景（真实发生）**：T94 权限系统第 4 轮成果补强时，前序会话的对话总结声称「11 个 entry 已添加 storageKey 参数」；接续会话 Grep 验证发现实际只有 6 个 entry 添加，5 个 entry 完全未添加，另有 2 个 entry 虽有 storageKey 但 `activate` 仍为硬编码、未改为 activeTab——共 7 处遗漏。
- **结论**：接续会话不得把前序总结当作事实；凡「已完成」必须 Grep / 实测复核后才可沿用。
- **边界**：本条针对跨会话交接与子代理交付的结论；同一会话内直接可见的改动不必重复做全量复核，但仍须按 H25 跑运行验证。
- **对应规范编号**：`CONTEXT_MANAGEMENT.md`「对话总结虚假完成陷阱」＋ `CLAUDE.md H20.2` 验收
- **证据指针**：`content/05_ai_coding/CONTEXT_MANAGEMENT.md:59`。

## CASE-AI-002 「听起来合理」被当成制度依据

- **编号**：CASE-AI-002
- **场景（真实发生）**：`CLAUDE.md` 的 ASCII 决策示意图把主题党日承办方写成「承办: 党小组轮值」；制度从未规定主题党日由党小组轮值，正确表述是「承办: 按需指定党小组」。
- **结论**：涉及制度安排的表述必须有母本溯源；「听起来合理」不构成制度依据，写法应回到母本原句。
- **边界**：这类推断不依赖「上下文丢失」触发——正常工作同样会发生；找不到母本时应提问确认，不得用惯例补全。
- **对应规范编号**：`CONTEXT_MANAGEMENT.md`「上下文丢失后制度推断陷阱」＋ `CLAUDE.md H30.1`
- **证据指针**：`content/05_ai_coding/CONTEXT_MANAGEMENT.md:33`（判例）、`:37`（教训）。

## CASE-AI-003 改名只改文件名，引用残留

- **编号**：CASE-AI-003
- **场景（真实发生）**：ROADMAP→CLAUDE.md 更名时，只修改了文件名和部分引用，遗漏了 guides / insights / SOP 中的引用；该次更名被指出「一改具改执行不令人满意」。
- **结论**：改文件名、编号或术语后，必须全仓 Grep 旧标识并做零残留复核（`CLAUDE.md H30.1`）。
- **边界**：触发面是「会被别处引用的标识」（文件名、编号、术语）；纯正文措辞润色不触发全仓扫描。
- **对应规范编号**：`DOCUMENT_GOVERNANCE.md`「一改具改执行」＋ `CLAUDE.md H30.1`
- **证据指针**：`content/05_ai_coding/DOCUMENT_GOVERNANCE.md:23`。

## CASE-AI-004 批量脚本被沙箱重复执行，误覆盖源文件

- **编号**：CASE-AI-004
- **场景（真实发生）**：用 RunCommand 执行 node 拆分脚本 `tmp-split-ops.mjs` 把 `OPERATIONS_GUIDE.md` 拆为两文件；沙箱对同一命令重复执行——首次执行成功并截断源文件，重试时读到已截断的源文件，`findIndex` 返回 -1、`slice(0, -1)` 误覆盖源文件，§15–18 完整内容在工作区丢失。
- **结论**：写文件的破坏性脚本必须单次执行、执行前备份，并在脚本内加存在性守卫（找不到锚点即中止），不得默认「重复执行结果相同」。
- **边界**：本条只管会写文件的脚本；只读的分析 / 统计脚本可重复执行。
- **对应规范编号**：`FILE_OPERATION_RULES.md`「批量脚本沙箱重复执行」＋ `CLAUDE.md H20.2`
- **证据指针**：`content/05_ai_coding/FILE_OPERATION_RULES.md:125-127`（判例 T-282）。

## CASE-AI-005 e2e 绕过前端数据层写穿，被冲刷覆盖

- **编号**：CASE-AI-005
- **场景（真实发生）**：2026-08-27 e2e-login 回归中，测试用页面原生 `fetch` 直接 POST `/api/v1/snapshot` 写库，当时写穿立即成功（服务端 29→30 条）；但 `goto` 首页后服务端数据回退 29 条——新写入被 `pagehide` 防抖冲刷覆盖。
- **结论**：e2e 必须走前端数据层（服务层写口）完成写入，再由页面读取验证，不得绕过前端直接打快照接口。
- **边界**：只测服务端接口契约的测试可以直接打 API（它不经过页面生命周期）；一旦断言涉及「页面显示的最终数据」，就不得直打快照接口。
- **对应规范编号**：`TEST_AND_VERIFICATION.md`「浏览器 e2e 写穿断言」＋ `CLAUDE.md H25`
- **证据指针**：`content/05_ai_coding/TEST_AND_VERIFICATION.md:112-114`。
