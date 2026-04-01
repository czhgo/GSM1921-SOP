---
name: ui-verifier
description: 'Verify UI interaction loops in read-only mode. Use when auditing index.html and related scripts for usability, consistency, accessibility, and remediation priority scoring.'
argument-hint: '核查范围、交互链路重点、输出粒度、是否需要派工建议'
user-invocable: true
---

# UI Verifier Workflow / UI 核查工作流

## Purpose / 目标
Audit frontend interaction quality in read-only mode and produce an evidence-backed report with scoring and repair priorities.
以只读方式审计前端交互质量，输出含证据、评分和修复优先级的核查报告。

## When To Use / 适用场景
- Need interaction loop verification before UI changes.
- Need consistency and accessibility diagnostics for index.html flow.
- Need prioritized issue lists for downstream repair.
- 需要在 UI 改动前验证交互闭环。
- 需要核查 index.html 链路中的一致性与可访问性问题。
- 需要产出带优先级的问题清单供后续修复。

## Required Inputs / 输入项
- Scope: index.html and related scripts.
- Critical flows to verify (entry, action, feedback, fallback).
- Report depth (summary or detailed).
- Whether manual dispatch suggestions are required.
- 范围：index.html 及关联脚本。
- 重点核查链路（入口、触发、反馈、兜底）。
- 报告粒度（摘要或详细）。
- 是否需要手动派工建议。

## Decision Points / 决策分支
1. Scope branch:
   - Default scope: index.html and directly related scripts.
   - Expanded scope only on explicit user request.
2. Report branch:
   - Summary report for quick triage.
   - Detailed report for execution handoff.
3. Dispatch branch:
   - Manual dispatch recommendations only.
   - Default target is @礼部; in independent audit context, allow @刑部.
   - No direct cross-agent invocation.
4. Agent chain fuse:
   - If this operation would involve a 4th allowed agent in one session, stop and require user text 确认.

## Procedure / 执行流程
1. Output `### Blueprint` first.
   - Include scope, critical flows, scoring criteria, and completion checks.
2. Run read-only verification.
   - Check entry controls, event triggers, state feedback, and fallback paths.
   - Detect unreachable controls, no-response interactions, and mismatch between UI and script bindings.
3. Score findings.
   - Score usability, consistency, and accessibility as High/Medium/Low.
   - Assign remediation priority P0/P1/P2 with rationale.
4. Build report.
   - Include evidence, impact, reproduction steps, and suggested direction.
5. Validate quality.
   - No file writes.
   - No fabricated findings.
   - All high-priority findings include reproducible evidence.

## Output Contract / 输出契约
### Blueprint
- Scope / 范围
- Critical Flows / 关键链路
- Scoring Criteria / 评分标准
- Completion Checks / 完成校验

### UI Health Summary / UI 健康摘要
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
- Reproduction / 复现步骤
- Suggested Direction / 修复方向
- Priority / 优先级: P0/P1/P2

### Scorecard / 评分卡
- Usability / 可用性: High/Medium/Low
- Consistency / 一致性: High/Medium/Low
- Accessibility / 可访问性: High/Medium/Low

### Manual Dispatch / 手动派工
- Suggested Department / 建议部门: 默认 @礼部；独立审计场景可 @刑部
- Suggested Order / 建议顺序
- Notes / 说明

## Guardrails / 护栏
- Never modify files in this workflow.
- Never execute auto-fix actions.
- Never fabricate evidence or severity.
- Never directly invoke other agents; provide manual dispatch only.

## Reference
- System Constitution: ../../copilot-instructions.md
- Libu UI Agent: ../../agents/libu-ui.agent.md
- Duchayuan Agent: ../../agents/duchayuan.agent.md
