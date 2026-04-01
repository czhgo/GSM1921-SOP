---
name: yaml-slim
description: 'Slim markdown YAML frontmatter safely. Use when removing last_updated while preserving version and enforcing Blueprint, /ask authorization, and post-change logging handoff rules.'
argument-hint: '目标文件范围、只读或写盘、是否批量处理、是否保留额外字段'
user-invocable: true
---

# YAML Slim Workflow / YAML 精简工作流

## Purpose / 目标
Standardize frontmatter by removing noisy metadata while keeping version traceability and governance safety rails.
通过移除冗余元数据并保留版本可追溯性，实现前言区规范化，同时满足治理熔断要求。

## When To Use / 适用场景
- Need to remove last_updated from markdown frontmatter.
- Need to normalize metadata style before release or SOP sync.
- Need a safe, approval-gated workflow for metadata cleanup.
- 需要移除 frontmatter 中的 last_updated。
- 需要在发布前或 SOP 同步前统一元数据风格。
- 需要带授权熔断链路的安全清理流程。

## Required Inputs / 输入项
- Target file or folder scope.
- Mode: read-only audit or write mode.
- Batch or single-file execution.
- Optional keep-list for additional metadata keys.
- 目标文件或目录范围。
- 模式：只读核查或写盘执行。
- 单文件或批量执行。
- 可选保留字段白名单。

## Decision Points / 决策分支
1. Mode branch:
   - Read-only audit: report only, no write.
   - Write mode: Blueprint plus /ask confirmation required.
2. Scope branch:
   - Single file by default (current file only).
   - Batch mode only when explicitly requested.
3. Key policy branch:
   - Always remove last_updated when present.
   - Always preserve version key and value (only mandatory keep key).
4. Agent chain fuse:
   - If this step would involve a 4th allowed agent in one session, stop and require the user to send "确认".

## Procedure / 执行流程
1. Pre-check.
   - Locate frontmatter blocks in target markdown files.
   - Verify the task does not request edits outside frontmatter.
2. Output `### Blueprint`.
   - Include scope, mode, risk, rollback points, and validation checks.
3. Request interactive approval.
   - Trigger `/ask` (or `/confirm`) before any write action.
4. Execute minimal edit.
   - Delete last_updated key-value pair when present.
   - Preserve version key and original value.
   - Keep frontmatter syntax valid.
5. Validate completion.
   - Frontmatter remains parseable.
   - version is unchanged.
   - No body content changed.
   - No silent write behavior occurred.
6. Post-change branch.
   - For substantive semantic or structural impact in execution departments, output log summary and directly call @起居院.
   - 起居院 must present draft by /ask and append only after Allow.

## Output Contract / 输出契约
### Read-Only Audit Report / 只读核查报告
- Scope / 核查范围
- Total files scanned / 扫描文件总数
- Files with frontmatter / 含 frontmatter 文件
- Files containing last_updated / 含 last_updated 文件
- Risk notes / 风险提示
- Suggested actions / 建议动作

### Blueprint
- Goal
- Scope
- Planned files
- Edit strategy
- Risks
- Rollback points
- Validation checks

### Authorization Request
/ask 是否批准按上述 Blueprint 执行修改？

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
- Risks
- Rollback points

### Auto Handoff to 起居院 (execution departments only)
@起居院 请基于以上日志摘要生成当月日志草稿，并使用 /ask 请求写入授权。

## Guardrails / 护栏
- Never delete version.
- Never modify markdown body during this workflow.
- Never write before /ask or /confirm approval.
- Never perform silent logging writes.
- Never do cross-department calls except the constitutional exception to 起居院 after substantive execution changes.

## Reference
- [System Constitution](../../copilot-instructions.md)
