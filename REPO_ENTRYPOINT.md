# Repository Entrypoint

> All AI agents must start with: 1. ARCHITECTURE.md, 2. SYSTEM_ROADMAP.md, 3. .vibe_context/FILE_ACCESS.md.

## AI Agent Routing Engine (MANDATORY)

### 1. Scenario Detection Algorithm

When receiving a request, AI must: 1. Parse request → 2. Identify keywords → 3. Map to scenario.

**Scenario Mapping:**

- **UI_SCENARIO** — Keywords: UI, 页面, 按钮, 布局, 样式, 体验
  - Allowed Scope: `index.html`, `assets/*`
- **CORE_LOGIC** — Keywords: 字段, schema, activity, task, 数据结构, API
  - Allowed Scope: `src/*`
- **SOP_SYNC** — Keywords: 流程, 制度, 职责, 负责人, 时间节点, 规则
  - Allowed Scope: `knowledge/SOP/*`, `src/domain.js`
- **META_AUDIT** — Keywords: AI规则, 审计, 协议, 日志
  - Allowed Scope: `.vibe_context/*`

### 2. Scenario Priority Rule

If multiple scenarios are detected, AI must execute in this STRICT priority order:

**META_AUDIT → SOP_SYNC → CORE_LOGIC → UI_SCENARIO**

*Conflict Resolution Example*: If user says "负责人应该改成组织委员", AI detects SOP (负责人) + CORE (字段). Priority defaults to `SOP_SYNC`. AI must update institutional SOP first, then cascade to domain code.

*Ambiguity Fallback*: If the scenario is entirely unclear, AI MUST halt and ask the user for clarification.

### 3. Execution Checkpoint Protocol

Before making ANY file modifications, AI MUST output the following block in the chat:

- Detected Scenario: `[scenario name]`
- Allowed Scope: `[file paths]`
- Modification Plan: `[brief description]`
