---
name: sop-sync
description: 'Synchronize SOP content across markdown documents with structure safety. Use when aligning sections, preserving markdown integrity, and enforcing Blueprint plus /ask approvals before writes.'
argument-hint: '源文件、目标文件、只读或写盘、是否批量同步、是否允许跨文件'
user-invocable: true
---

# SOP Sync Workflow / SOP 同步工作流

## Purpose / 目标
Synchronize SOP content from source to target documents while preserving markdown structure integrity and constitutional constraints.
在保障 Markdown 结构完整与系统宪章约束的前提下，将 SOP 内容从源文档同步到目标文档。

## When To Use / 适用场景
- Need to align SOP sections between documents.
- Need to update policies/procedures in multiple SOP files.
- Need controlled synchronization with approval and rollback readiness.
- 需要对齐多个 SOP 文档的章节内容。
- 需要批量更新制度或流程文本。
- 需要具备授权熔断与回滚可控的同步流程。

## Required Inputs / 输入项
- Source file(s) and target file(s).
- Mode: read-only audit or write mode.
- Single-file or batch synchronization.
- Whether cross-file edits are allowed.
- 源文件与目标文件。
- 模式：只读核查或写盘执行。
- 单文件或批量同步。
- 是否允许跨文件改动。

## Decision Points / 决策分支
1. Mode branch:
   - Read-only audit: output sync gap report only.
   - Write mode: must execute Blueprint plus /ask approval chain.
2. Scope branch:
   - Single target by default.
   - Batch sync only with explicit user instruction.
3. Sync strategy branch:
   - Structure-first: align headings/lists/tables/quotes first.
   - Content-second: apply semantic updates after structure is stable.
4. Agent chain fuse:
   - If this operation would involve a 4th allowed agent in one session, stop and require the user to send "确认".

## Procedure / 执行流程
1. Pre-check and mapping.
   - Map source sections to target sections.
   - Detect missing sections, ordering drift, and formatting drift.
2. Output `### Blueprint` before any write action.
   - Include scope, sync strategy, risks, rollback points, and validation checks.
3. Trigger interactive authorization.
   - Use `/ask` (or `/confirm`) before write actions.
4. Execute minimal synchronization.
   - Align heading hierarchy and list/table nesting.
   - Synchronize content with minimal semantic disturbance.
   - Preserve markdown syntax closure and readability.
5. Validate completion.
   - No broken markdown structure.
   - No accidental edits in unrelated sections.
   - Anchor tracking check passed for same-file heading changes.
   - Code exemption check passed (no edits in fenced code, HTML attributes, CSS class names).
   - Source-target alignment passes declared checks.
   - Hard requirement, no overlap, and no vacuum checks are satisfied.
6. Post-change logging branch.
   - For substantive semantic or structural changes in execution departments, output log summary and directly call @档案馆.
   - 档案馆 must present draft via /ask and append only after Allow.

## Output Contract / 输出契约
### Read-Only Sync Audit / 只读同步核查
- Scope / 核查范围
- Source-target pairs / 源目标映射
- Structure gaps / 结构差异
- Content gaps / 内容差异
- Risk notes / 风险提示
- Suggested sync plan / 建议同步方案

### Blueprint
- Goal
- Scope
- Planned files
- Sync strategy
- Risks
- Rollback points
- Validation checks (must include anchor tracking and code exemption checks)

### Authorization Request
/ask 是否批准按上述 Blueprint 执行同步？

### Execution Result
- Changed files
- Key actions
- Result
- Risks
- Rollback points
- Validation checks

### Log Summary (when substantive change exists)
- Changed files
- Key actions
- Result

### Auto Handoff to 档案馆 (execution departments only)
@档案馆 请基于以上日志摘要生成当月日志草稿，并使用 /ask 请求写入授权。

## Guardrails / 护栏
- Never bypass `/ask` or `/confirm` before write actions.
- Never silently write logs.
- Never break markdown hierarchy or syntax closure.
- Never call cross-department agents except the constitutional exception to 起居院 after substantive execution changes.

## Reference
- [System Constitution](../../copilot-instructions.md)
