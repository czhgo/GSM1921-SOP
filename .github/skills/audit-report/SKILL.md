---
name: audit-report
description: 'Generate read-only audit reports with risk grading and evidence mapping. Use when running governance or security scans that must not modify files and must produce actionable issue lists.'
argument-hint: '审计范围、审计维度、抽样方式、输出格式要求'
user-invocable: true
---

# Audit Report Workflow / 审计报告工作流

## Purpose / 目标
Produce a read-only, evidence-backed audit report that classifies risks and outputs a repair-ready issue list.
产出只读、可追证的审计报告，完成风险分级并输出可交付的问题清单。

## When To Use / 适用场景
- Need pre-change governance/security audit.
- Need structured findings before handing off to execution departments.
- Need risk-based prioritization for remediation planning.
- 需要在改动前进行治理或安全审计。
- 需要先形成结构化问题清单再移交执行部门。
- 需要按风险优先级给出修复顺序依据。

## Required Inputs / 输入项
- Scope: file/folder/module boundaries.
- Audit dimensions: security, consistency, structure, compliance.
- Sampling mode or full scan mode.
- Output granularity and severity policy.
- 范围：文件/目录/模块边界。
- 维度：安全、一致性、结构、合规。
- 抽样模式或全量模式。
- 输出粒度与分级口径。

## Decision Points / 决策分支
1. Scope branch:
   - Risk-driven sampling by default.
   - Full scan only when explicitly requested by user.
2. Reporting branch:
   - Detailed report with full evidence chain.
   - Compact report when user requests concise output.
3. Handoff branch:
   - Manual dispatch only (default) to `@刑部`.
   - No cross-agent direct invocation.
4. Agent chain fuse:
   - If this operation would involve a 4th allowed agent in one session, stop and require user text "确认".

## Procedure / 执行流程
1. Output `### Blueprint` first.
   - Include scope, audit dimensions, sampling strategy, grading criteria, and completion checks.
2. Execute read-only audit.
   - Collect evidence from target files only.
   - Never write or mutate any file.
3. Classify findings by severity.
   - Use High/Medium/Low with clear rationale per finding.
4. Build issue list.
   - Include location, evidence, impact, reproduction path, and suggested direction.
5. Produce handoff section.
   - Suggest manual dispatch target and priority order (P0/P1/P2).
6. Validate output quality.
   - No fabricated findings.
   - Every major finding has evidence and rationale.
   - Scope and exclusions are explicit.

## Output Contract / 输出契约
### Blueprint
- Scope / 范围
- Audit Dimensions / 审计维度
- Sampling Strategy / 抽样策略
- Severity Criteria / 分级标准
- Completion Checks / 完成校验

### Audit Summary / 审计摘要
- Scope / 审计范围
- Total Findings / 问题总数
- High / 中高低分布
- Key Risks / 关键风险

### Issue List / 问题清单
1. Finding Title / 问题标题
- Severity / 风险等级: High/Medium/Low
- Rationale / 判定依据
- Location / 位置
- Evidence / 证据
- Impact / 影响
- Reproduction / 复现路径
- Suggested Direction / 修复方向
- Priority / 优先级: P0/P1/P2

### Manual Dispatch / 手动派工
- Suggested Department / 建议部门: @刑部
- Suggested Order / 建议顺序: P0/P1/P2
- Notes / 说明

## Guardrails / 护栏
- Never modify files in this workflow.
- Never fabricate evidence or conclusions.
- Never output executable repair commands as if already approved.
- Never directly invoke other agents; only provide manual dispatch recommendations.

## Reference
- [System Constitution](../../copilot-instructions.md)
