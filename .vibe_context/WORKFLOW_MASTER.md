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

## 🗺️ Dual-Panel Reference Map (Storage · Invocation · Triggers)

> This section is the authoritative specification for the dual-panel architecture. Read it together with §🏛️ Supreme Architecture Rule above. It tells every Agent exactly **where** each panel lives, **how** to access it, and **when** to access it.

### Human Panel (人工面板)

| Attribute | Specification |
|-----------|---------------|
| **Storage Paths** | Root entry points: `README.md`, `START_HERE.md`, `CHEATSHEET.md` <br>Sub-directories: `流程指南/`, `_quick_cards/`, `申报材料模板/`, `活动复盘/`, `参考资料/` (官方文件, 党小组会, 支部委员会) <br>Knowledge base: `docs/党支部管理与实务经验沉淀.md` — management experience & cross-term handover reference |
| **Invocation** | Open any file directly in GitHub web UI, a local Markdown viewer, or WPS (for `.docx` / `.pdf`). Navigate via `README.md` (full index) or `START_HERE.md` (onboarding guide). No command is required. |
| **Trigger Conditions** | • A 支部成员 needs to look up a procedure, template, or policy. <br>• A 支委 needs to execute a task. <br>• Content is being written or reviewed for a human reader. |

### AI Data Panel (AI数据面板)

| Attribute | Specification |
|-----------|---------------|
| **Storage Paths** | `.vibe_context/WORKFLOW_MASTER.md` — master rules & meta-prompt (this file) <br>`.vibe_context/REVIEW_STATE.md` — live task state, single source of truth <br>`.vibe_context/EXECUTION_LOG.md` — **log index & redirect** (read for navigation; do NOT append sessions here) <br>`.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` — **monthly log files** (append session reports to the current month's file) <br>`.vibe_context/CONTENT_MAP.md` — annotated index of all Human Panel files + binary file registry (read at session start for full context) <br>`.vibe_context/scenarios/activity_rules_enforcement.md` — A/B activity constraints <br>`.vibe_context/scenarios/sop_restructuring.md` — SOP restructuring constraints <br>`.vibe_context/scenarios/yaml_metadata_fix.md` — YAML frontmatter constraints |
| **Invocation** | **GitHub Copilot:** paste the Standard Invocation Prompt (see §📣 below) into the chat, using `@workspace` and `@.vibe_context/WORKFLOW_MASTER.md` symbols. <br>**Other AI systems (e.g., Claude, Gemini):** attach `.vibe_context/WORKFLOW_MASTER.md` and `.vibe_context/REVIEW_STATE.md` directly, or reference their repo-root-relative paths in the prompt. |
| **Trigger Conditions** | • Start of **any** session that will read or modify repository files. <br>• When the Agent needs to determine what tasks are pending or in-progress. <br>• When a human manager asks the Agent to resume, continue, or audit prior work. <br>• When the Agent detects a potential conflict between documents (trigger Watchlist check). |

### 一改俱改 Coupling Mechanism

The **YAML frontmatter block** at the top of each Markdown file is the sole coupling anchor between the Human Panel and the AI Data Panel (see Constraint 3 above).

**⚡ Frontend Architecture Declaration — AI-Driven Static Generation:**
`index.html` is an **AI-compiled static artifact** (v6.0 Single-File Architecture — `app.js` and `style.css` are permanently inlined; they no longer exist as separate files). Any time business content in `流程指南/` is modified, Copilot **must** act as a compiler and forcibly regenerate and hardcode-update the business data in `index.html`. **Dynamic `fetch()` logic and any external Markdown-parsing libraries (e.g., marked.js) are permanently prohibited inside `index.html`.**

**Enforcement verification (run before every `report_progress` call that touches `index.html`):**
- `grep -n "fetch(" index.html` must return no results.
- `grep -n "marked" index.html` must return only comments (no script src tags).
- The inline `<script>` block must not exceed 300 lines (comments inclusive).

**Mandatory sync rules — every Human Panel change MUST trigger a corresponding AI Data Panel update:**

| Human Panel Event | Required AI Data Panel Update |
|-------------------|-------------------------------|
| New Markdown file created | Run `yaml_metadata_fix` scenario to inject YAML frontmatter; register the new file in the nearest parent's `related_files`. |
| SOP text modified in `流程指南/` | 1. Update `last_updated` in that file's YAML. 2. **Mandatory Ripple Check**: The Agent MUST identify all downstream derivatives (flowcharts, quick cards) listed in `related_files` and update their content to strictly match the new SOP logic. 3. Check off task in `REVIEW_STATE.md` and append to the current month's log file. |
| New issue or inconsistency found in human content | Log immediately in `REVIEW_STATE.md` → `## 🐛 AI-Identified Issues` (code bugs) or `## 🔍 Agent Watchlist` (structural conflicts). |
| Pending task completed | Mark `[x]` in `REVIEW_STATE.md`; update `## 📊 Overall Progress` counters; append a row to the Session Log table. |
| Suspended issue (`H1`–`H3`) encountered | **BLOCKED** — do not modify; leave a `⚠️ 悬置` marker in the text and move on. The issue may only be unlocked by an explicit instruction from 书记 in `REVIEW_STATE.md`. |

**Validation gate (run before every `report_progress` call):**
1. All task checkboxes in `REVIEW_STATE.md` accurately reflect the current state of Human Panel files.
2. The current month's log file (`.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`) has a new entry for the current session.
3. Every modified Markdown file has an updated `last_updated` field in its YAML frontmatter.

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
  2b. Read CONTENT_MAP        → (Recommended) Load .vibe_context/CONTENT_MAP.md to get
                                  an annotated overview of all Human Panel files and the
                                  binary-file registry before navigating the repo.
  3. Load specific Scenario   → Read the matching file from .vibe_context/scenarios/
                                 (e.g., scenarios/bug_fix.md). Follow its constraints exactly.
  4. Execute Code Modification → Make the smallest possible, surgical changes. Do not
                                  modify unrelated files. Validate against existing tests.
  5. Update REVIEW_STATE      → After every meaningful unit of work, update
                                  .vibe_context/REVIEW_STATE.md (task checkboxes, tables,
                                  AI-identified issues). Commit alongside code changes.
  6. Generate Execution Summary & Distill Experience →
       a) **Log Append**: Append structured execution report to the CURRENT month's log in
          `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` using the template in
          ## 📋 Standard Output Templates below. If the current month's file does not yet
          exist, create it from the standard template first, then append. Also print the
          report in the chat interface for the human manager.
       b) **Experience Distillation**: IF the session involved structural or workflow
          optimizations (e.g., reducing marginal costs, clarifying roles, adding new
          governance mechanisms), you MUST extract the underlying management rationale and
          update `docs/党支部管理与实务经验沉淀.md` in pure Simplified Chinese.
```

---

## Global Rules

| # | Rule |
|---|------|
| R1 | **Always read before writing.** Complete steps 1–3 before any code change. |
| R2 | **Minimal diff principle.** Change only what is required by the scenario, **UNLESS** a Ripple Sync is triggered, in which case all related downstream derivatives MUST be updated simultaneously to prevent content desynchronization. |
| R3 | **REVIEW_STATE is the single source of truth.** Never rely on memory across sessions; always re-read. |
| R4 | **Scenario constraints are binding.** If a constraint in a scenario file conflicts with a general suggestion, the scenario file wins. |
| R5 | **Security first.** Run `codeql_checker` and advisory checks before finalizing any session with code changes. |
| R6 | **No orphaned tasks.** Every task opened in REVIEW_STATE must be closed or explicitly deferred with a reason. |
| R7 | **Commit after each verified step.** Use `report_progress` to commit incremental, verified changes. |

### Permanent Design Principles (永久性设计原则)

> These principles are **Global Constants** — they apply to every scenario execution and cannot be overridden by individual scenario files.

#### Principle 6 — Strict SemVer for YAML `version` Fields (版本号严格递增规范)

**Permanent Constraint:** All Markdown files carry a `version` field in their YAML frontmatter. The Agent **MUST** follow these rules when incrementing version numbers:

| Change Type | Rule | Example |
|-------------|------|---------|
| **Minor / Patch** — routine SOP edits, typo fixes, partial restructuring | Increment only the digit after the decimal point. Never reset to `.0`. | `v1.9` → `v1.10` → `v1.11` |
| **Major** — breaking structural overhaul | The Agent **MUST NOT** self-authorize a major bump. `v(n+1).0` requires either (a) an explicit "突破性更改" instruction from the human decision-maker, or (b) a recorded justification approved in `REVIEW_STATE.md`. | `v1.x` → `v2.0` only by human order |

**Enforcement:** Before every `report_progress` call, verify that no file's `version` has jumped a major number without a recorded human authorization in `REVIEW_STATE.md`.

---

#### Principle 7 — Single Source of Truth & Derivative Sync (单一事实来源与衍生品同步)

**Permanent Constraint:** The repository has a strict master-derivative hierarchy for business content:

| Layer | Files | Role |
|-------|-------|------|
| **Master Source (母本)** | All files under `流程指南/` | Authoritative SOP text. All business logic changes MUST originate here first. |
| **Downstream Derivatives (下游衍生品)** | `工作流程图-定人定责定岗.md` and all files under `_quick_cards/` | Must faithfully reflect the current state of the Master Source. They are **never** independently authoritative. |

**Action:** Any modification to business logic in the Master Source **automatically triggers a Ripple Sync**:
1. Apply the change in the relevant `流程指南/` file first.
2. Identify every downstream derivative listed in the modified file's `related_files` YAML field.
3. Update each derivative's content to strictly match the new SOP logic.
4. Record the full list of updated derivatives in the current month's log file entry (`.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`).

This principle cannot be suspended and overrides the default minimal-diff scope of R2 (see R2 UNLESS clause above).

---

#### Principle 5 — Occam's Razor & Anti-Formalism (奥卡姆剃刀与去形式化)

**Permanent Constraint:** Before finalising any output in any scenario (restructuring, editing, template creation, etc.), the execution engine **MUST** self-audit against the following three questions:

1. **填写/阅读负担检查** — "是否增加了人类不必要的阅读或填写负担？"
2. **结构扁平化检查** — "文档结构是否可以更扁平？"
3. **信噪比检查** — "是否已清除长篇大论的空泛表述（如无意义的体会占位符），仅保留高信噪比业务信息？"

**Action:** The Agent has both the **right** and the **obligation** to proactively trim redundant content. If a draft output fails any of the three checks above, revise before committing. This principle cannot be suspended.

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

Use this exact template for the Step 6 execution report. Fill in the bracketed fields. Append to the current month's `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` and print in chat.

````markdown
## YYYY-MM-DD — Session N (核心动作英文或中文短摘要)

## 🛠️ Copilot 自动执行报告 (Execution Summary)

### 1. 🧹 技术债清理 (Technical Debt Clearance)
- **扫描结果**：记录本次执行前/后，是否发现并修复了缺失的 YAML 元数据（如 `last_updated`, `version`）、死链或格式冗余。（若无，需明确回答"无新增技术债"）。
- **修复清单**（仅有修复时填写）：
  - `[文件路径]`：补充了 `[具体字段]`，修复了 [X] 处死链 / 格式问题。

### 2. 🚀 状态机任务推进 (State Machine Task Progression)
- **本次执行任务**：明确记录本次歼灭的是哪个具体的 Pending 待办项（如"修改14"）或架构跃迁任务（如"v7.0 单文件架构落地"）。
- **涉及/修改的文件**：枚举本次操作触碰的所有物理文件路径。
- **执行细节与验证**：简要说明核心代码的变动逻辑。在重大重构时，此项必须包含一张**自检复选框表格**（例如验证单文件是否纯净、Emoji 是否清零）。

### 3. 🛡️ 冲突拦截与监查清单 (Conflict Interception / Agent Watchlist)
- **异常捕获**：记录在改写代码时是否遇到了与其他业务逻辑的冲突（例如修改了 A 类活动，是否意外影响了 B 类）。
- **预警动作**：如果发现新的系统断点，需在此处生成一条新的 Watchlist 记录并同步至 `REVIEW_STATE.md`。（若无异常，需明确回答"无冲突项"）。

### 4. 📊 队列状态与版本收口 (Queue Status Updates & Version Control)
- `REVIEW_STATE.md` 已同步更新。当前剩余待办任务数：[X] 个。
- **下一顺位建议任务**：[列出状态机里的下一个任务，供书记参考]
- **版本迭代轨迹**：

| 文件路径 | 变更类型 | 版本变化 (SemVer) |
|----------|----------|-------------------|
| `[文件路径]` | [架构重构/参数修改/新增资产] | vX.Y → vX.Z |
| `REVIEW_STATE.md` | Session N 行追加 | vA.B → vA.C |
````

---

**Version:** 1.10  
**Owner:** 储子禾  
**Last updated:** 2026-03-02
