# WORKFLOW MASTER — Meta-Prompt & Orchestrator

> **Role:** Dictates how Copilot interacts with `REVIEW_STATE.md` and the scenario files in `/scenarios/`.  
> Every session that modifies code in this repository **must** follow the SOP below before writing a single line.

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
| `scenarios/api_refactor.md` | "refactor API" / "update endpoint" | API-layer restructuring |
| `scenarios/ui_update.md` | "update UI" / "redesign page" | Frontend / document presentation changes |
| `scenarios/bug_fix.md` | "fix bug" / "resolve issue" | Targeted defect correction |

> Add new rows here whenever a new scenario file is created.

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
