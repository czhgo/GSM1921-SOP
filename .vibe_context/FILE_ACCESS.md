# File Access Guard
> **Version:** 1.0 | **Owner:** 支委会 | **Last updated:** 2026-03-05
>
> 本文件定义每个 AI 工作流路由（Scenario）的文件访问白名单。
> 违反白名单的修改视为任务失败（TASK FAILURE）。

## 路由白名单规则

**Decoupled Governance Directories (AI Read/Write, Human Read/Write):**
- `governance/`: AI (Read/Write), Human (Read/Write)
- `backlog/`: AI (Read/Write), Human (Read/Write)
- `logs/`: AI (Read/Write), Human (Read/Write)

| 路由标识 | 路由说明 | ✅ 允许修改 | ❌ 严禁修改 |
|---------|---------|------------|-----------|
| `ui_ux_dev` | UI 视觉开发 | `index.html`, `assets/*` | `/src/*`, `流程指南/*`, `.vibe_context/*` |
| `core_logic_arch` | 核心逻辑与架构 | `/src/*` | `index.html`, `流程指南/*`, `.vibe_context/*`（除 meta_audit_log 外） |
| `sop_data_sync` | SOP 数据同步 | `流程指南/*`, `/src/domain.js` | `index.html`, `/src/main.js`, `.vibe_context/*`（除 meta_audit_log 外） |
| `meta_audit_log` | 元审计与日志 | `.vibe_context/*` | 所有业务代码文件 |

---

## 通用铁律（所有路由均适用）

1. **纯静态环境**：100% 浏览器端运行。严禁引入 Node.js API（无 `fs`、无 `require`、无 `process`）。
2. **ESM 相对路径**：所有模块引用必须使用相对路径（如 `./src/main.js`），禁止根路径（`/src/...`）。
3. **禁止文件增殖**：不得在白名单之外创建任何新文件。
4. **禁止修改控制平面**：除 `meta_audit_log` 路由外，严禁修改 `.vibe_context/` 内的任何文件。
5. **DOM 保全红线**：`renderUI()` 只更新动态区域，严禁重写整个 DOM。`index.html` 的静态骨架与 Apple Liquid Glass 样式必须 100% 保持原样。

---

## 新文件白名单（可创建的文件清单）

| 文件路径 | 适用路由 | 说明 |
|---------|---------|------|
| `src/id.js` | `core_logic_arch` | UUID 发生器（已创建，v8.5） |
| `src/service.supabase.js` | `core_logic_arch` | 未来 Supabase 后端实现（预留） |
| `.vibe_context/FILE_ACCESS.md` | `meta_audit_log` | 本文件（已创建，v8.5） |
| `.vibe_context/SNAPSHOT_vX.Y.md` | `meta_audit_log` | 系统快照（按版本命名） |
| `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` | `meta_audit_log` | 月度执行日志（按月创建） |

## Repository Structure Rule

Repository structure is immutable.

AI agents are forbidden to:
- create new root directories
- rename directories
- move files between layers

Allowed modification scope is limited to file contents only.

## Exception Rule

If a structural change is required for Phase 2/3 roadmap implementation (e.g., adding `backend/` for Supabase integration),

AI must:
1. Present a migration plan
2. Explain impact on architecture
3. Obtain explicit user confirmation

*Only after human approval may the structure change proceed.*

## Binary Preservation Rule
Files with the following extensions are **immutable**:
- .pdf
- .docx
- .pptx
- .xlsx

AI agents are strictly forbidden to:
- modify
- rewrite
- summarize
- convert

Allowed actions:
- read metadata
- move files to correct directory
- reference them in documentation
