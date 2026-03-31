# AI Context — GSM1921-SOP

## 1. System Architecture (9-Module ESM Layered Architecture)

> **[2026-03 Architecture Upgrade]**: The original monolithic `src/main.js` (800+ lines) has been fully refactored into 9 ES6 modules + 2 service-layer files, achieving single-responsibility separation and precise AI-agent context loading.

```
SOP Layer       knowledge/SOP/             制度母本，最高权威，所有变更起点
Workflow Layer  src/workflow/              ★ SOP 核心规则引擎（物理封装子目录）
                  index.js                桶文件：统一对外导出 instantiateSOP / sopDatabase
                  sopData.js              SOP 场景任务节点模板原始数据（物理隔离）
                  sop.js                  instantiateSOP() 将模板+t0展开为绝对日期任务数组
Domain Layer    src/constants.js           静态常量：ROLE_COLORS/ROLE_LABELS/ROLE_THEME_CLASS/ROLE_ORDER
                src/utils.js               通用工具：_fmtDate/_fmtChinese/showToast/_currentYearMonth
Service Layer   src/service.mock.js        CRUD + LocalStorage（唯一数据写入点）；SANDBOX_MODE 开关
                src/service.runtime.js     BranchService 出口，USE_MOCK 开关
State Layer     src/state.js               appState（immutable spread）+ setState(patch) + registerRenderCallback
Render Layer    src/calendar.js            renderCalendarByActivities / populateMonthSelector
                src/inspector.js           renderInspectorFromState / filterTasksByManagementRole
                src/events.js              setupEventListeners()——全量 DOM 事件绑定；含 hostGroup 字段提取
Entry           src/main.js                initApp + renderUI（唯一 DOM 更新入口，约154行）
UI              index.html                 静态入口，<script type="module" src="./src/main.js">
                                           ★ #scenario-select-cal 已按双域重构为 optgroup 层级结构
                                           ★ #host-group-select 承办党小组下拉控件已绑定
```

**Dependency Direction (DAG, acyclic)**: `SOP → Data → Domain/Utils → Service → State → Render → Entry → UI`

### 1.1 Two Core Domain Business Model (Added in v1.2)

Since v1.2, the business layer has established two core domain divisions: **Activity Building** (活动建设) and **Organization Building** (组织建设):

| Domain | Definition | Typical Scenarios |
|----|------|---------|
| **Activity Building Domain** | End-to-end management of initiating, planning, and executing branch activities | Organizational life meetings, themed party days, branch member assemblies, group meetings, party lectures |
| **Organization Building Domain** | Long-cycle institutional operations including member development, discipline supervision, information reporting, and feedback handling | Developing activists, branch discussions, platform reporting, feedback processing |

- Institution Layer: `knowledge/SOP/常见工作场景快速指南.md` uses `# 一、活动建设` / `# 二、组织建设` as top-level directory anchors.
- UI Layer: `#scenario-select-cal` groups domains into two `<optgroup>` elements, achieving hierarchical noise reduction.
- SOP Layer: All three commissioner guides have `### (一) 活动建设域职责` and `### (二) 组织建设域职责` sections inserted in §1 (Responsibilities Overview).

### 1.2 Hosting Party Group (hostGroup) Field Business Specification (Added in v1.2)

```yaml
hostGroup:
  type: string | null
  values: ["group1", "group2", "group3", null]
  default: null
  scope: 仅用于"主题党日"等需特定党小组承办的场景，实现责任精准下放
  rule: |
    - 主题党日等责任下放场景：填入对应党小组标识符
    - 组织生活会、党课等全支部活动：保持 null（UI 渲染为"全支部"或隐藏）
    - hostGroup 为元数据标识，不影响 sopData.js 任务节点路由逻辑
```

**Circular Dependency Resolution**: `state.js` exposes `registerRenderCallback(fn)`; `main.js` defines `renderUI` and then registers it proactively, preventing circular imports between `state.js` and `main.js`.

**SANDBOX_MODE**: When `SANDBOX_MODE = true` at the top of `service.mock.js`, `loadDB()` returns initial mock data on every reload (for development/debugging); set to `false` to restore `localStorage` persistence.

## 2. Scenario Routing

4 fixed core scenarios, priority from left to right:

```
META_AUDIT → SOP_SYNC → CORE_LOGIC → UI_SCENARIO
```

| Scenario | Trigger Keywords | Allowed Files |
|------|--------------|--------------|
| `scenarios/meta_audit.md` | AI rules, audit, log, snapshot, scenario registry | `.vibe_context/*` |
| `scenarios/sop_sync.md` | workflow, institution, responsibility, SOP, YAML, frontmatter | `knowledge/SOP/*`, `src/domain.js` |
| `scenarios/core_logic.md` | field, schema, activity, task, data structure, API | `src/*` |
| `scenarios/ui_scenario.md` | UI, page, button, layout, style | `index.html`, `assets/*` |

**Extension Scenario Registration Rule**: New scenarios MUST append a row to this file, create a same-named `.md` under `scenarios/`, and record the operation in the current month's execution log.

| Extension Scenario File | Purpose | Trigger | Allowed Files | Registration Date |
|------------|---------|---------|--------------|---------|
| (none) | | | | |

## 3. Core Rules

- **Plan-Before-Execution [HIGHEST PRIORITY]**: For all complex modifications involving `src/main.js`, `src/domain.js`, or state machine logic, the AI MUST output a complete `### Architecture Blueprint` in the chat — detailing function decomposition plans and state-flow paths — BEFORE executing any file edits. Directly force-modifying complex functions without decomposition is STRICTLY PROHIBITED.
- **Burden-Reduction Principle**: Each role's deliverables SHALL retain only core outputs; redundancy is strictly prohibited. The `secretary` role is solely responsible for the `party-lecture` and `feedback-handling` scenarios; the `hostGroup` field (`group1`/`group2`/`group3`/`null`) identifies the hosting party group and is visible only for the 主题党日/党小组会/组织生活会 scenarios.
- **Structure Immutable**: Adding new top-level directories or renaming existing core directories (`src/`, `knowledge/`, `.vibe_context/`) is PROHIBITED.
- **Service Layer Mutation**: All runtime data write operations MUST go through `src/service.*.js`; the UI layer is STRICTLY PROHIBITED from directly manipulating storage.
- **SOP Sovereignty**: `knowledge/SOP/` institutional texts take precedence over all technical implementations; the `domain.js` Schema MUST remain in sync with the SOP.
- **Change Pipeline**: Unique change path → SOP edit → `domain.js` sync → service adaptation → state update → UI render.
- **Binary Preservation**: `.pdf`, `.docx`, `.pptx`, `.xlsx` are read-only assets; modification or conversion is PROHIBITED; only metadata reading and directory relocation are permitted.
- **Single DOM Updater**: `renderUI(state)` is the sole legitimate DOM update entry point; all UI changes MUST go through this path.
- **Data Privacy**: Hardcoding real human names in `src/*` (code layer) or `index.html` (UI render layer) is ABSOLUTELY PROHIBITED. Code flow MUST use role identifiers (Role ID / Role Name) exclusively. Real person names are permitted only within `knowledge/SOP/`.
- **Experience Distillation Marker**: All execution log entries written to `.vibe_context/logs/` MUST include a `[经验蒸馏: 是/否]` marker. When marked "是" (Yes), the operation's core insights have been distilled into `docs/党支部管理与实务经验沉淀.md`; when "否" (No), distillation is deferred for future batch processing.

## 4. File Access Permissions

> ⚠️ The original `FILE_ACCESS.md` was merged into this file on 2026-03-22 and physically deleted. Any modification that violates the allowlist is considered a TASK FAILURE.

### Route Allowlist

**Decoupled Governance Directories (readable/writable by both AI and humans):**
- `governance/`: AI (Read/Write), Human (Read/Write)
- `backlog/`: AI (Read/Write), Human (Read/Write)
- `.vibe_context/logs/`: AI (Read/Write), Human (Read/Write)

| Route ID | Route Description | ✅ Allowed to Modify | ❌ Strictly Prohibited |
|---------|---------|------------|-----------|
| `ui_ux_dev` | UI Visual Development | `index.html`, `assets/*` | `src/*`, `knowledge/SOP/*`, `.vibe_context/*` |
| `core_logic_arch` | Core Logic & Architecture | `src/*` (11 ESM files) | `index.html`, `knowledge/SOP/*`, `.vibe_context/*` (except `meta_audit`) |
| `sop_data_sync` | SOP Data Sync | `knowledge/SOP/*`, `src/workflow/sopData.js`, `src/workflow/sop.js` | `index.html`, `src/main.js`, `.vibe_context/*` (except `meta_audit`) |
| `meta_audit_log` | Meta Audit & Logging | `.vibe_context/*` | All business code files |

### Universal Rules (applicable to all routes)

1. **Pure Static Environment**: 100% browser-side execution. Introducing Node.js APIs (`fs`, `require`, `process`) is STRICTLY PROHIBITED.
2. **ESM Relative Paths**: All module references MUST use relative paths (e.g., `./src/main.js`); root-relative paths (`/src/...`) are PROHIBITED.
3. **No File Proliferation**: Creating any new files outside the allowlist is PROHIBITED.
4. **Control Plane Immutability**: Modifying any file within `.vibe_context/` is STRICTLY PROHIBITED except under the `meta_audit_log` route.
5. **DOM Integrity Redline**: `renderUI()` SHALL only update dynamic regions; rewriting the entire DOM is STRICTLY PROHIBITED. The static skeleton and styles of `index.html` MUST be preserved 100%.

### Repository Structure Immutability

- AI Agent is PROHIBITED from creating new root directories, renaming directories, or moving files across layers.
- Permitted modification scope is limited to **file contents** only.
- If structural changes are unavoidable, the AI MUST: ① propose a migration plan, ② explain the architectural impact, and ③ obtain explicit confirmation from the secretary before proceeding.

### New File Allowlist (Legally Creatable)

| File Path | Applicable Route | Description |
|---------|---------|------|
| `src/id.js` | `core_logic_arch` | UUID generator (created, v8.5) |
| `src/service.supabase.js` | `core_logic_arch` | Future Supabase backend implementation (reserved) |
| `.vibe_context/SNAPSHOT_v<X>.<Y>_<YYYYMMDD>.md` | `meta_audit_log` | System snapshot (milestone-named) |
| `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` | `meta_audit_log` | Monthly execution log (created per month) |

### Binary Asset Immutability

Files with extensions `.pdf`, `.docx`, `.pptx`, `.xlsx` are **read-only assets**; AI Agent is STRICTLY PROHIBITED from modifying, rewriting, or converting them.
Permitted operations only: reading metadata, moving to the correct directory, referencing in documents.
