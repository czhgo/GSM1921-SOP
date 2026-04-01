---
name: experience-distiller
description: 'Distill reusable lessons from unresolved execution logs. Use when scanning entries tagged [经验蒸馏: 否], generating a distillation blueprint, and updating both experience notes and log tags after /ask approval.'
argument-hint: '扫描范围、提炼主题、候选条目策略、输出粒度'
user-invocable: true
---

# Experience Distiller Workflow / 经验蒸馏工作流

## Purpose / 目标
Extract high-value reusable practices from unresolved execution logs and close the loop by updating both experience notes and log tags.
从未蒸馏执行日志中提炼高价值可复用经验，并通过更新经验沉淀与日志标记完成闭环。

## When To Use / 适用场景
- Need to process logs tagged [经验蒸馏: 否].
- Need reusable rules from repeated issues and decisions.
- Need cross-month backlog cleanup for distillation tags.
- 需要处理带有 [经验蒸馏: 否] 标记的日志条目。
- 需要从重复问题和决策中沉淀可复用规则。
- 需要跨月清理未蒸馏积压条目。

## Required Inputs / 输入项
- Log scan scope (month range or all pending).
- Distillation focus (topic or workflow).
- Preferred report depth.
- Optional cap for candidates per run.
- 日志扫描范围（按月份或全部待处理）。
- 提炼主题（专题或流程）。
- 报告粒度（摘要或详细）。
- 单次候选上限（可选）。

## Decision Points / 决策分支
1. Candidate branch:
   - Scan only entries tagged [经验蒸馏: 否].
   - Prioritize by high impact plus high reusability.
2. Scope branch:
   - Single-month distillation when explicitly scoped.
   - Cross-month batch distillation when backlog cleanup is requested.
3. Write branch:
   - Phase 1: blueprint only, no write.
   - Phase 2: write only after /ask approval.
   - Writing may reorganize historical sections by theme when needed.
4. Tag update branch:
   - Update log tags per processed item immediately after that item is written successfully.
5. Agent chain fuse:
   - If this operation would involve a 4th allowed agent in one session, stop and require user text 确认.

## Procedure / 执行流程
1. Scan pending logs.
   - Parse .vibe_context/logs/ for entries tagged [经验蒸馏: 否].
2. Build candidate matrix.
   - Score each candidate by impact, reusability, and clarity of evidence.
3. Output Phase 1 blueprint.
   - Provide candidate list, distilled themes, target output sections, risk notes, and rollback plan.
4. Request authorization.
   - Trigger /ask before any write action.
5. Execute Phase 2 on approval.
   - Write distilled content to docs/党支部管理与实务经验沉淀.md, allowing thematic restructuring of historical sections.
   - For each successfully written item, immediately update its log tag to [经验蒸馏: 是], including cross-month files if approved scope includes them.
6. Validate closure.
   - Ensure every updated tag has matching distilled output.
   - Keep unprocessed candidates unchanged.
   - Return processed and pending lists.

## Output Contract / 输出契约
### Distillation Blueprint / 提炼蓝图
- Scan Scope / 扫描范围
- Candidate Entries / 候选条目
- Distillation Themes / 提炼主题
- Common Patterns / 共性模式
- Target File / 目标文件
- Risks and Rollback / 风险与回滚

### Authorization Request / 授权请求
/ask 是否批准按上述提炼蓝图执行更新？

### Execution Result / 执行结果
- Updated Files / 更新文件
- New Distilled Items / 新增经验条目
- Updated Log Tags / 已回写日志标记
- Pending Items / 未处理项
- Risks and Notes / 风险与说明

## Guardrails / 护栏
- Never write before /ask approval.
- Never update an item tag before that item write succeeds.
- Never modify log entries outside approved scope.
- Never directly invoke Qijuyuan from this workflow.

## Reference
- System Constitution: ../../copilot-instructions.md
- Xiushiyuan Agent: ../../agents/xiushiyuan.agent.md
