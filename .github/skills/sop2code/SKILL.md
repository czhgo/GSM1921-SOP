---
name: sop2code
description: 将文本 SOP 设计图转化为 src/workflow/ 下的代码逻辑，保持 SSOT 溯源与双向一致性。适用场景：SOP 制度文本→流程代码转化、content/SOP/ 变更→代码同步。
---

# SOP → 代码转化工作流

## 目标

将文本 SOP 变更精确映射到 `src/workflow/` 及相关 service/state 代码，保持 SSOT 可追溯。

## 输入项

- **文本 SOP 设计图或变更请求**
- **目标代码范围**：通常 `src/workflow/` + service/state
- **是否允许跨文件修改**
- **是否包含 `domain.js` / service / state 更新**

## Gotchas

- **SSOT 铁律**：规划任何代码改动前，必须先阅读 [SSOT_INDEX.md](../../SSOT_INDEX.md) 确认文本 SOP 是母源。若请求直接改子本（代码），必须先规划母本（文本 SOP）的更新。
- **场景约束必读**：`.ctx/CONTEXT.md`（代码层架构规则）。跳过上下文文件的后果是代码与架构规则脱节。
- `domain.js` 中的 Source 注解字段必须与 SOP 母本保持一致——这是 SSOT 可追溯性的骨架。

## 执行流程

1. **读 SSOT 第一**（SSOT_INDEX.md → 确定母/子链）
2. **读场景约束**（CONTEXT.md 代码架构段 + 按需 meta_audit）
3. **映射文本 SOP → 代码范围**：制度规则 → workflow 职责 / schema 字段 / service 行为
4. **构建 Blueprint**（目标、母源、目标文件、schema/service 影响、风险、回滚点）
5. **工具调用获取授权**
6. **最小代码变更**——SSOT 链内文件、可追溯性指针一致
7. **校验**：代码逻辑 + 追溯注释 + 场景约束 → 子本变更可回溯到母源

## 输出模板

```markdown
### 只读评估
- 母源: ...
- 子本目标: ...
- 约束差距: ...
- 风险: ...
- 建议实现路径: ...

### Blueprint
- 目标: ...
- 母源: ...
- 子本目标: ...
- 计划文件: ...
- schema/service 影响: ...
- 风险 + 回滚点: ...

### 执行结果
- 变更文件: ...
- 关键动作: ...
- 校验: 代码逻辑 ✓ | 追溯注释 ✓ | 场景约束 ✓
```
