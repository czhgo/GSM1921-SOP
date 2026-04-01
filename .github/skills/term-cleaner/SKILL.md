---
name: term-cleaner
description: 'Standardize headings and appellations in SOP markdown. Use when cleaning numeric title prefixes, fixing reversed role names, and preserving governance constraints (Blueprint, /ask, code exemption, anchor sync).'
argument-hint: '目标文件、是否跨文件、术语总表路径、是否只读核查'
user-invocable: true
---

# Term Cleaner Workflow
# Term Cleaner Workflow / 术语清洗工作流

## Purpose / 目标
This skill standardizes document headings and organizational appellations while preserving original meaning and constitutional constraints.
本技能用于标准化文档标题与组织称谓，并在不改变原意的前提下满足系统宪章约束。

## When To Use / 适用场景
- Need to remove numeric heading prefixes such as 1., 01-, and （一）.
- Need to fix reversed or inconsistent role/appellation wording.
- Need to normalize SOP style before publishing or cross-doc synchronization.
- 需要去除标题数字前缀，如 1.、01-、（一）。
- 需要修正称谓倒置或术语不一致问题。
- 需要在发布前或跨文档同步前统一 SOP 风格。

## Required Inputs / 输入项
- Target file or folder scope.
- Read-only audit or write mode.
- Optional glossary source path.
- Whether cross-file changes are allowed.
- 目标文件或目录范围。
- 只读核查或写盘模式。
- 可选术语总表路径。
- 是否允许跨文件修改。

## Decision Points / 决策分支
1. Mode selection:
   - Read-only audit: produce findings report only.
   - Write mode: continue with Blueprint and authorization.
2. Scope selection:
   - Current file only by default.
   - Cross-file changes only when explicitly requested.
3. Glossary availability:
   - If provided, glossary terms take priority.
   - If missing and terminology is ambiguous, request clarification.
4. Agent chain fuse:
   - If this action would involve a 4th agent in one session, stop and require the user to send "确认" first.

## Procedure / 执行流程
1. Pre-check constitutional boundaries.
   - Respect dual-domain and role semantics.
   - Apply code exemption: do not edit fenced code blocks, HTML attribute names, or CSS class names.
   - If a markdown heading changes, update same-file anchors pointing to that heading.
2. Output `### Blueprint` before any write action.
   - Include scope, edit strategy, risk, rollback points, and completion checks.
3. Trigger interactive authorization via `/ask` (or `/confirm`).
   - Do not perform write actions before Allow.
4. Execute minimal edits.
   - Remove numeric heading prefixes without changing meaning.
   - Correct appellation order and terminology consistency.
   - Keep markdown structure valid.
5. Run completion checks.
   - No semantic drift.
   - No code-exemption violations.
   - Anchor links remain valid in the same file.
   - Changes satisfy hard requirement, no overlap, no vacuum.
6. Post-change logging branch.
   - If substantive semantic/structural change is made by execution departments (吏部/户部/礼部/刑部), output log summary and directly call @起居院.
   - 起居院 must present draft through /ask and write only after Allow.

## Output Contract
## Output Contract / 输出契约
### Read-Only Audit Report / 只读核查报告
- Scope / 核查范围
- Findings / 发现问题
- Risk Level / 风险等级: High/Medium/Low
- Evidence / 证据
- Suggested Direction / 修复方向建议

### Blueprint
- Goal
- Scope
- Planned files
- Edit strategy
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
- Validation checks

### Log Summary (only when substantive changes exist)
- Changed files
- Key actions
- Result
- Risks
- Rollback points

### Auto Handoff to 起居院 (execution departments only)
@起居院 请基于以上日志摘要生成当月日志草稿，并使用 /ask 请求写入授权。

## Guardrails
- Never fabricate findings.
- Never bypass interactive authorization.
- Never perform silent writes.
- Never trigger cross-department calls except the constitutional exception to 起居院 after substantive execution changes.

## References
- [System Constitution](../../copilot-instructions.md)
