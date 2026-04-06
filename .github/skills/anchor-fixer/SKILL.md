---
name: anchor-fixer
description: 'Fix markdown anchor links safely. Use when repairing broken heading anchors, normalizing link fragments, and enforcing Blueprint plus /ask approval before writes.'
argument-hint: '目标文件范围、只读或写盘、是否允许跨文件、是否需同步标题'
user-invocable: true
---

# Anchor Fixer Workflow / 锚点修复工作流

## Purpose / 目标
Repair broken markdown anchor navigation while preserving document meaning, structure, and constitutional safety constraints.
在不改变文档语义与结构的前提下修复 Markdown 锚点跳转问题，并满足系统宪章约束。

## When To Use / 适用场景
- Broken internal links in markdown.
- Heading anchors not matching link fragments.
- Anchor drift after heading normalization.
- 文档内跳转链接失效。
- 标题锚点与链接片段不一致。
- 标题规范化后发生锚点漂移。

## Required Inputs / 输入项
- Target file or folder scope.
- Read-only audit or write mode.
- Whether cross-file edits are allowed.
- Whether heading text changes are allowed.
- 目标文件或目录范围。
- 只读核查或写盘模式。
- 是否允许跨文件修改。
- 是否允许改动标题文本。

## Decision Points / 决策分支
1. Mode branch:
   - Read-only audit: report only, no write.
   - Write mode: Blueprint and /ask approval required.
2. Scope branch:
   - Current file only by default.
   - Cross-file fixes only with explicit user instruction.
3. Strategy branch:
   - Choose strategy per task context and risk.
   - Prefer minimal-change path that best restores navigability.
4. Agent chain fuse:
   - If this action would involve a 4th allowed agent in one session, stop and require the user to send "确认".

## Procedure / 执行流程
1. Pre-check.
   - Collect links and headings in scope.
   - Map links to target headings and detect mismatches.
2. Output `### Blueprint` before write actions.
   - Include scope, fix strategy, risk, rollback points, and validation checks.
3. Trigger interactive authorization.
   - Use `/ask` (or `/confirm`) before any write action.
4. Execute minimal edits.
   - Decide whether to update link fragments, headings, or both based on task context.
   - Keep non-anchor content unchanged.
   - Apply cross-file edits only if explicitly approved.
5. Validate completion.
   - All intended anchor links resolve correctly.
   - Markdown structure remains intact.
   - No unrelated text changed.
6. Post-change branch.
   - For substantive semantic or structural changes in execution departments, output log summary and directly call @档案馆.
   - 档案馆 must show draft via /ask and append after Allow.

## Output Contract / 输出契约
### Read-Only Audit Report / 只读核查报告
- Scope / 核查范围
- Total links scanned / 扫描链接总数
- Broken links found / 失效链接数
- Affected headings / 受影响标题
- Risk notes / 风险提示
- Suggested fixes / 修复建议

### Blueprint
- Goal
- Scope
- Planned files
- Fix strategy
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

### Auto Handoff to 档案馆 (execution departments only)
@档案馆 请基于以上日志摘要生成当月日志草稿，并使用 /ask 请求写入授权。

## Guardrails / 护栏
- Never modify unrelated content.
- Never perform cross-file edits without explicit instruction.
- Never write before /ask or /confirm approval.
- Never perform silent writes.
- Never bypass constitutional control boundaries.

## Reference
- [System Constitution](../../copilot-instructions.md)
