---
name: data-inspector
description: 'Inspect sopData.js for schema closure and dictionary consistency in read-only mode. Use when producing evidence-based data health reports without modifying files.'
argument-hint: '核查范围、检查维度、报告粒度、风险分级口径'
user-invocable: true
---

# Data Inspector Workflow / 数据核查工作流

## Purpose / 目标
Run read-only structural and semantic checks on `src/workflow/sopData.js` and produce a repair-ready diagnostic report.
对 `src/workflow/sopData.js` 执行只读结构与语义核查，输出可用于后续修复决策的诊断报告。

## When To Use / 适用场景
- Need closure checks for objects/arrays/quotes/commas.
- Need dictionary consistency checks across sibling nodes.
- Need risk-ranked findings before deciding whether to patch.
- 需要检查对象/数组/引号/逗号闭合性。
- 需要检查同层级字段一致性与字典漂移。
- 需要在修复前获得风险分级的只读报告。

## Required Inputs / 输入项
- Target scope (single file or explicit subset).
- Check dimensions (closure, missing fields, duplicates, type drift).
- Report depth (summary or detailed).
- Risk grading policy.
- 核查范围（单文件或显式子范围）。
- 核查维度（闭合性、缺失字段、重复键、类型漂移）。
- 报告粒度（摘要或详细）。
- 风险分级口径。

## Decision Points / 决策分支
1. Scope branch:
   - Default to `src/workflow/sopData.js`.
   - Expand scope only when explicitly requested.
2. Report branch:
   - Summary report for quick triage.
   - Detailed report for execution handoff.
3. Dispatch branch:
   - Manual dispatch recommendation based on context.
   - Typical routing: data model/dictionary issues -> @户部; cross-domain compliance repair -> @刑部.
   - No cross-agent direct invocation.
4. Agent chain fuse:
   - If this operation would involve a 4th allowed agent in one session, stop and require user text "确认".

## Procedure / 执行流程
1. Output `### Blueprint` first.
   - Include scope, dimensions, severity criteria, and completion checks.
2. Perform read-only parsing and checks.
   - Closure integrity: brackets, quotes, commas, nesting.
   - Consistency checks: missing keys, duplicate keys, type drift, naming drift.
3. Grade findings.
   - Assign High/Medium/Low with rationale per issue.
4. Produce structured report.
   - Include location, evidence, impact, and suggested direction.
5. Validate quality.
   - No fabricated findings.
   - Every major issue has evidence and rationale.
   - No write actions occurred.

## Output Contract / 输出契约
### Blueprint
- Scope / 范围
- Check Dimensions / 核查维度
- Severity Criteria / 分级标准
- Completion Checks / 完成校验

### Data Health Summary / 数据健康摘要
- Scope / 核查范围
- Total Findings / 问题总数
- High/Medium/Low Distribution / 风险分布
- Critical Risks / 关键风险

### Detailed Findings / 详细问题
1. Finding Title / 问题标题
- Severity / 风险等级: High/Medium/Low
- Rationale / 判定依据
- Location / 位置
- Evidence / 证据
- Impact / 影响
- Suggested Direction / 修复方向
- Priority / 优先级: P0/P1/P2

### Manual Dispatch / 手动派工
- Suggested Department / 建议部门（按上下文）
- Suggested Order / 建议顺序
- Notes / 说明

## Guardrails / 护栏
- Never modify files in this workflow.
- Never auto-repair data.
- Never fabricate evidence or issue counts.
- Never directly invoke other agents; provide manual dispatch only.

## Reference
- [System Constitution](../../copilot-instructions.md)
- [Hubu Agent](../../agents/hubu.agent.md)
