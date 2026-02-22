# WORKFLOW MASTER — Meta-Prompt & Orchestrator

> **Role:** Dictates how Copilot interacts with `REVIEW_STATE.md` and the scenario files in `/scenarios/`.  
> Every session that modifies code in this repository **must** follow the SOP below before writing a single line.

---

## 🏛️ Supreme Architecture Rule: The Dual-Track System

> These three constraints are **absolute**. They override all other instructions.

### Constraint 1 — Physical Isolation (Control Plane vs. Data Plane)

`.vibe_context/` is strictly the **Control Plane** for the Agent.  
It stores **ONLY**: State, Rules, and Context Orchestration.  
**DO NOT store business content, SOP narratives, or human-facing documentation here.**

### Constraint 2 — Pure Human Files (Data Plane)

Main repository files (e.g., `流程指南/`, `_quick_cards/`, `申报材料模板/`) are the **Data Plane** for human consumption.  
**They MUST be written strictly in Simplified Chinese (简体中文).**  
The Agent **MUST NOT** inject any of the following into these files:
- Meta-instructions or prompt-like language
- Code-like structures (e.g., JSON, YAML logic blocks, pseudocode)
- Review logs or audit trails
- Any English-language operational directives

### Constraint 3 — The Coupling Anchor (YAML Frontmatter Only)

The **ONLY** bridge between human files and AI rules is the **YAML Frontmatter** block at the top of each Markdown file.  
Cross-reference `.vibe_context/scenarios/` rules with actual documentation **exclusively** via YAML fields (`related_files`, `type`, `status`).  
Never embed scenario logic inside human documents.

---

## 📣 Standard Invocation Prompt

Copy-paste this template to start any Agent session:

```
@workspace 请严格遵守 @.vibe_context/WORKFLOW_MASTER.md 的 SOP。本次任务场景为 [填写场景]。请先读取 @.vibe_context/REVIEW_STATE.md 掌握当前进度，然后开始执行：[具体需求]。完成后务必更新 REVIEW_STATE.md。
```

> **Note on `@` syntax:** The `@workspace` and `@.vibe_context/...` references are GitHub Copilot workspace context symbols. When using other AI systems, substitute with the equivalent file-reference mechanism (e.g., attach the file directly, or paste its path into the prompt).

Replace `[填写场景]` with the matching scenario name from the Scenario Registry below.  
Replace `[具体需求]` with the specific task description.

---

## 🧭 Global Organization Strategy

**SOP = 条条（TiaoTiao）的工作说明书**

- 条条委员（党小组组长）do **not** have a standalone duty table. Their responsibilities flow entirely from the SOP documents in `流程指南/`. The Agent must ensure every SOP step has a clear, named owner so 条条 can act on it directly.
- 块块委员（KuaiKuai: 组织/宣传/纪检）must be reviewed for efficient division of labor during every SOP modification. If conflicts or redundancies in 块块 ownership are discovered, flag them in `REVIEW_STATE.md` → Agent Watchlist before proceeding.
- All modifications must serve this goal: **让条条组长照着 SOP 就能干活，让块块委员照着 SOP 就能提供支撑。**

---

## Standard Operating Procedure (SOP)

```
SOP:
  1. Read WORKFLOW_MASTER     → Load this file first. Internalize all rules below.
  2. Read REVIEW_STATE        → Load .vibe_context/REVIEW_STATE.md. Identify current
                                 task status, pending issues, and completed work.
  3. Load specific Scenario   → Read the matching file from .vibe_context/scenarios/
                                 (e.g., scenarios/bug_fix.md). Follow its constraints exactly.
  4. Execute Code Modification → Make the smallest possible, surgical changes. Do not
                                  modify unrelated files. Validate against existing tests.
  5. Update REVIEW_STATE      → After every meaningful unit of work, update
                                  .vibe_context/REVIEW_STATE.md (task checkboxes, tables,
                                  AI-identified issues). Commit alongside code changes.
  6. Generate Execution Summary & Log → After updating REVIEW_STATE.md, you MUST append
                                  a structured execution report to
                                  .vibe_context/EXECUTION_LOG.md using the template in
                                  ## 📋 Standard Output Templates below. Also print the
                                  report in the chat interface for the human manager.
```

---

## Global Rules

| # | Rule |
|---|------|
| R1 | **Always read before writing.** Complete steps 1–3 before any code change. |
| R2 | **Minimal diff principle.** Change only what is required by the scenario. |
| R3 | **REVIEW_STATE is the single source of truth.** Never rely on memory across sessions; always re-read. |
| R4 | **Scenario constraints are binding.** If a constraint in a scenario file conflicts with a general suggestion, the scenario file wins. |
| R5 | **Security first.** Run `codeql_checker` and advisory checks before finalizing any session with code changes. |
| R6 | **No orphaned tasks.** Every task opened in REVIEW_STATE must be closed or explicitly deferred with a reason. |
| R7 | **Commit after each verified step.** Use `report_progress` to commit incremental, verified changes. |

---

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION START                                                  │
│  1. Read WORKFLOW_MASTER (this file)                            │
│  2. Read REVIEW_STATE.md  ──► determine active task & status   │
│  3. Read scenario file    ──► load constraints & checklist     │
├─────────────────────────────────────────────────────────────────┤
│  EXECUTION LOOP                                                 │
│  4. Implement one atomic change                                 │
│  5. Validate (lint / build / test)                              │
│  6. Update REVIEW_STATE.md checkboxes & tables                 │
│  7. report_progress (commit + push)                             │
│  8. Repeat until scenario checklist is fully checked            │
├─────────────────────────────────────────────────────────────────┤
│  SESSION END                                                    │
│  9.  code_review  ──► address feedback                         │
│  10. codeql_checker ──► fix or document findings               │
│  11. Mark scenario as ✅ DONE in REVIEW_STATE.md               │
│  12. Final report_progress                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scenario Registry

| Scenario File | Trigger Phrase | Purpose |
|---------------|---------------|---------|
| `scenarios/activity_rules_enforcement.md` | "enforce activity rules" / "A/B activity" / "组织活动" | Apply A-class / B-class party activity rules when modifying SOP flows |
| `scenarios/sop_restructuring.md` | "restructure SOP" / "modify workflow" / "场景重构" | Modify SOP text and workflow diagrams without creating redundant duty tables |
| `scenarios/yaml_metadata_fix.md` | "fix frontmatter" / "inject YAML" / "元数据修复" | Inject or correct YAML frontmatter in Markdown documents |

> Add new rows here whenever a new scenario file is created.

---

## 📋 Standard Output Templates

Use this exact template for the Step 6 execution report. Fill in the bracketed fields. Append to `EXECUTION_LOG.md` and print in chat.

````markdown
## [YYYY-MM-DD] — Session N (scenario_name)

## 🛠️ Copilot 自动执行报告 (Execution Summary)

### 1. 🧹 技术债清理（YAML 元数据）
- **扫描结果：** 共发现 [X] 个文件缺失 YAML。
- **修复清单：**
  - `[文件路径]`：补充了 `[type]` 属性，关联了 [X] 个 related_files。
  - _(如本次无 YAML 修复，写"本次扫描无新增缺失文件。")_

### 2. 🚀 状态机任务推进
- **本次执行任务：** [填写 REVIEW_STATE 中挑出来的任务内容，含优先级标记]
- **修改的文件：** `[修改的业务文件路径]`
- **核心逻辑/约束应用：** [简述修改了什么，例如：删除了多余的条条分工表格，重构了流程文本。]
- **⚠️ 冲突拦截（Agent Watchlist）：** [如触发了 W1–W4 中的监查问题，说明如何处理；如未触发，写"未触发架构冲突"。]

### 3. ⏳ 队列状态更新
- `REVIEW_STATE.md` 已同步更新。当前剩余待办任务数：[X] 个。
- **下一顺位建议任务：** [列出状态机里的下一个任务，供书记参考]
````

---

**Version:** 1.2  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
