---
name: sop2code
description: "Use when: convert textual SOP design maps into code logic scripts under src/workflow/, with SSOT-first tracing and scenario-driven constraints."
argument-hint: "文本SOP设计图、目标代码层、是否允许跨文件、是否需要同步domain.js"
user-invocable: true
---

# SOP to Code Workflow

## Purpose
Convert textual SOP design diagrams into code-layer logic under `src/workflow/` while preserving SSOT traceability, scenario constraints, and bidirectional consistency.
将文本SOP设计图转化为 `src/workflow/` 下的代码逻辑，同时保持 SSOT 溯源、场景约束与双向一致性。

## When To Use
- Need to translate SOP institutional text into workflow logic or task templates.
- Need to align `knowledge/SOP/` changes with `src/workflow/` implementation.
- Need to derive code behavior from scenarios in `.vibe_context/scenarios/`.
- Need to keep `domain.js` source annotations and workflow code in sync.
- 需要把SOP制度文本转化为流程逻辑或任务模板。
- 需要让 `knowledge/SOP/` 与 `src/workflow/` 实现保持一致。
- 需要从 `.vibe_context/scenarios/` 提取约束并落到代码层。
- 需要同步 `domain.js` 的 Source 注解与 workflow 代码。

## Required Inputs
- Text SOP design or change request.
- Target code scope, usually `src/workflow/` and related service/state files.
- Whether cross-file edits are allowed.
- Whether `domain.js` / service / state updates are in scope.
- 文本SOP设计图或变更请求。
- 目标代码范围，通常为 `src/workflow/` 及相关 service/state 文件。
- 是否允许跨文件修改。
- 是否包含 `domain.js` / service / state 更新。

## Decision Points
1. SSOT branch:
   - Before any planning, read [SSOT_INDEX.md](../../SSOT_INDEX.md) to confirm the text SOP is the mother source.
   - If a child-file change is requested, first plan the mother-file update.
2. Scenario branch:
   - Read `.vibe_context/scenarios/core_logic.md` for code-layer architecture rules.
   - Read `.vibe_context/scenarios/sop_sync.md` for SOP-to-code traceability rules.
   - Read `.vibe_context/scenarios/meta_audit.md` when log or governance constraints are relevant.
3. Scope branch:
   - Prefer minimal code-layer change.
   - Expand only when the scenario or SSOT chain requires coordinated updates.
4. Authorization branch:
   - Output `### Blueprint` before any write action.
   - Use `/ask` before editing files.
5. Verification branch:
   - Confirm syntax, traceability, and scenario compliance after edits.
   - Append or update the execution log only when the surrounding workflow requires it.

## Procedure
1. Read SSOT first.
   - Start with [SSOT_INDEX.md](../../SSOT_INDEX.md) and identify the mother/child chain.
2. Read scenario constraints.
   - Review `.vibe_context/scenarios/core_logic.md` and the matching scenario files for the target change.
3. Map text SOP to code scope.
   - Convert institutional rules into concrete `src/workflow/` responsibilities, schema fields, or service behavior.
4. Build the blueprint.
   - Include goal, mother source, target files, schema/service impact, risks, and rollback points.
5. Request approval.
   - Use `/ask` before any write action.
6. Implement minimal changes.
   - Update only files required by the SSOT chain.
   - Keep traceability pointers consistent.
7. Validate.
   - Check code logic, traceability comments, and scenario constraints.
   - Ensure child changes can be traced back to the mother source.

## Output Contract
### Read-Only Assessment
- Scope
- Mother source
- Child targets
- Constraint gaps
- Risk level
- Suggested implementation path

### Blueprint
- Goal
- Mother source
- Child targets
- Planned files
- Schema/service impact
- Risks
- Rollback points

### Authorization Request
/ask 是否批准按上述 Blueprint 执行修改？

### Execution Result
- Changed files
- Key actions
- Result
- Risks
- Rollback points
- Validation notes

### Log Summary
- Changed files
- Key actions
- Result
- Risks
- Rollback points

## Guardrails
- Never skip SSOT first.
- Never edit child code before identifying the mother source.
- Never ignore `.vibe_context/scenarios/` constraints.
- Never silently write changes.
- Never break source traceability between SOP and code.

## References
- [SSOT Index](../../SSOT_INDEX.md)
- [Core Logic Scenario](../../../.vibe_context/scenarios/core_logic.md)
- [SOP Sync Scenario](../../../.vibe_context/scenarios/sop_sync.md)
- [Meta Audit Scenario](../../../.vibe_context/scenarios/meta_audit.md)
