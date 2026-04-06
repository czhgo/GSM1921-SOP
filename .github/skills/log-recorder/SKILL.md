---
name: log-recorder
description: 'Record execution logs with monthly file routing and strict interactive fuse. Use when appending department summaries into .vibe_context/logs/YYYY-MM-EXECUTION_LOG.md with /ask approval and distillation tag enforcement.'
argument-hint: '来源部门、会话时间、日志摘要、是否跨月建档'
user-invocable: true
---

# Log Recorder Workflow / 日志记录工作流

## Purpose / 目标
Record execution summaries into monthly log files with append-only safety, source gating, and interactive authorization.
将执行摘要以 append-only 方式写入月度日志，并执行来源门禁与交互式授权熔断。

## When To Use / 适用场景
- Need to append execution summaries after substantive changes.
- Need to auto-route logs into monthly files.
- Need consistent tagging and write confirmation.
- 需要在实质性改动后追加执行日志。
- 需要自动路由到当月日志文件。
- 需要统一蒸馏标签与写盘确认流程。

## Required Inputs / 输入项
- Source department name.
- Session timestamp.
- Log summary body (files, actions, result, risk, rollback).
- Optional explicit target month.
- 来源部门名称。
- 会话时间。
- 日志摘要正文（文件、动作、结果、风险、回滚点）。
- 可选目标月份。

## Decision Points / 决策分支
1. Source gate branch:
   - Accept only 吏部/户部/礼部/刑部.
   - Reject all other sources with explicit reason.
2. File routing branch:
   - Route to `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` by session month.
   - If month file does not exist, must copy YAML header and section skeleton from 2026-02 template.
3. Write authorization branch:
   - Generate draft first.
   - Must call `/ask` before any write action.
4. Correction branch:
   - Normal mode: append-only.
   - Correction mode: historical typo correction is allowed only when user explicitly requests it and `/ask` approval is obtained.
5. Agent chain fuse:
   - If this operation would involve a 4th allowed agent in one session, stop and require user text "确认".

## Procedure / 执行流程
1. Validate source and payload completeness.
2. Resolve target month and log file path.
3. Create write draft using monthly template style.
4. Append mandatory tag to the new record: `[经验蒸馏: 否]`.
5. Trigger `/ask` for write approval.
6. After Allow, append draft to file with append-only behavior.
7. Echo result with path, timestamp, and summary.
8. If in correction mode, output correction scope and keep a visible correction trace in log.

## Output Contract / 输出契约
### Accept Response / 接收确认
- Source / 来源部门
- Session Time / 会话时间
- Target File / 目标文件

### Write Draft / 写入草稿
- Changed Files / 变更文件
- Key Actions / 关键动作
- Result / 结果
- Risks / 风险
- Rollback / 回滚点
- Distillation Tag / 蒸馏标签: 否

### Authorization Request
/ask 是否批准按上述草稿写入当月执行日志？

### Write Result / 写入回显
- Written Path / 已写入路径
- Write Status / 写入结果
- Appended At / 追加时间

### Correction Result / 修正回显（仅修正模式）
- Corrected Scope / 修正范围
- Correction Reason / 修正原因
- Authorized By / 授权方式: /ask
- Trace Location / 勘误位置

### Reject Response / 拒绝响应
- Status / 状态: Rejected
- Reason / 原因
- Allowed Sources / 可用来源: 组织部/发改委/外交部/司法部

## Guardrails / 护栏
- Default mode must remain append-only.
- Historical typo correction is allowed only with explicit user instruction plus `/ask` approval, and must leave correction trace.
- Never skip `/ask` before write.
- Never omit `[经验蒸馏: 否]` on new records.
- Never accept non-execution departments as source.
- Never do silent writes.

## Reference
- [System Constitution](../../copilot-instructions.md)
- [Related Agent: 档案馆](../../agents/danganguan.agent.md) (负责系统变更日志记录)
