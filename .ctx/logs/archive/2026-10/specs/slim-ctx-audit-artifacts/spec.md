# `.ctx` 审计产物归位与准入边界 Spec

## Why

支书指出：不是 `.ctx` 要退出，而是 `.ctx` 顶层文件太多，正在变成「什么都往里装」的筐。审计报告、生成矩阵、历史草稿与真正的台账/日志混在同一层，导致：
- 新会话无法一眼判断哪些是**现行台账**、哪些是**一次性审计原文**；
- 可复用的原则/方法留在审计报告里，没有沉淀到正式文档；
- 守卫直接读顶层审计文件，反过来把「临时产物」固化成长期依赖。

本批按「各找各的地方」处置：**原则→原则文档，方法→方法文档，沿革→`logs/archive/`，只留台账与日志在 `.ctx` 顶层**。

## What Changes

### 1. `.ctx` 顶层准入白名单（长期规则）

只允许：
- `logs/`（执行日志 / 决策日志 / 索引 / archive）
- `evidence/`（真机截图与读数证据）
- `TIMESTAMPS.md`（机检台账）
- `SNAPSHOT.md`（系统现状快照）
- `REVIEW_QUEUE.md`（未闭环评议队列）
- `ACTIVE_RULINGS.md`（现行裁定速查）
- `ENGINEERING_ASSESSMENT.md`（工程化评估）

其它文件一律不得常驻顶层：先沉淀，再归档。

### 2. 审计产物归档（原文进 `logs/archive/2026-10/`）

| 文件 | 去向 | 沉淀目标 |
|---|---|---|
| `AUDIT_IA_CRITICAL.md` | 归档 | 原则 → `CLAUDE.md H21.3`；方法 → `PARALLEL_SKILL_AUDIT.md §11` |
| `IA_LINK_TRUTH.md` | 归档 | 逐角色落点表 → `content/04_web_design/module/MODULE_UI_DESIGN.md` 新增「链接真值」节 |
| `IA_INVENTORY.md` | 归档（脚本产物） | 守卫改读归档路径；脚本输出改到归档目录 |
| `AUDIT_ROUND1_WORKBENCH_STRUCTURE.md` | 归档 | 方法 → `PARALLEL_SKILL_AUDIT.md`；经验 → `content/insights/` |
| `AUDIT_ROUND2_MINIMUM_THREE_COSTS.md` | 归档 | 最小三成本口径已在 `DESIGN_SYSTEM` / `CLAUDE.md`，原文仅留证 |
| `AUDIT_ROUND3_4_COMBINED.md` | 归档 | 同上 |
| `WORKBENCH_67_TAB_AUDIT_DRAFT.md` | 归档 | 覆盖率证据；守卫改读归档路径 |
| `snapshots/` | 归档 | 历史快照，不再占顶层 |

### 3. 原则与方法沉淀

- `CLAUDE.md`：新增一节「`.ctx` 准入与审计产物三去向」——原则→原则文档、方法→方法文档、沿革→`logs/archive/`；并写明白名单。
- `content/03_doc_system/OPERATIONS_GUIDE.md`：记录生命周期（产生 → 沉淀 → 归档）与 `.ctx` 职责边界。
- `content/03_doc_system/DOC_MAP.md` + `ARCHITECTURE.md`：`.ctx` 目录树只列白名单项；审计文件改为 archive 路径。
- `content/05_ai_coding/TEST_AND_VERIFICATION.md`：守卫不得长期依赖一次性审计产物；产物路径必须在 archive 下且有生成脚本。
- `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md §11`：补「审计产物生命周期」与 4 条 Boolean 规则（CTX-01..04）。
- `content/04_web_design/module/MODULE_UI_DESIGN.md`：新增「链接真值：角色 × 对象 × 步骤」契约（材料闭环四行表 + `focusActivityId` / `highlightType` / `[data-act-id]`）。
- `content/insights/工程与AI协作的全栈实践.md`：新增「审计产物不是知识」一条：结论先沉淀、原文只留证。

### 4. 引用与守卫

- `server/scripts/ia-inventory.mjs` 输出改为 `.ctx/logs/archive/2026-10/IA_INVENTORY.md`。
- `server/test/ia-critical-guard.test.mjs`、`server/test/workbench-audit-coverage.test.mjs` 改读归档路径。
- 新增 `server/test/ctx-hygiene-guard.test.mjs`：
  - ① `.ctx` 顶层只允许白名单条目；
  - ② 顶层不得存在 `AUDIT_*` / `IA_*` / `*_DRAFT.md`；
  - ③ 归档文件必须在正式文档或执行日志中有指针（防「移了等于丢了」）；
  - ④ 生成类产物必须有对应脚本。
- 全站扫描并改准指向审计文件的引用（README / CONTRIBUTING / CHANGELOG / CLAUDE / DOC_MAP / ARCHITECTURE / 测试）。
- **历史日志正文不改写**（append-only）；旧路径只作为历史记录存在，由新指针承接。

## Impact

- 目录：`.ctx/`（顶层瘦身）、`.ctx/logs/archive/2026-10/`（新增归档）、`.ctx/logs/archive/2026-10/snapshots/`
- 文档：`CLAUDE.md`、`content/03_doc_system/{OPERATIONS_GUIDE,DOC_MAP,ARCHITECTURE}.md`、`content/04_web_design/module/MODULE_UI_DESIGN.md`、`content/05_ai_coding/{PARALLEL_SKILL_AUDIT,TEST_AND_VERIFICATION}.md`、`content/insights/工程与AI协作的全栈实践.md`
- 代码/守卫：`server/scripts/ia-inventory.mjs`、`server/test/{ia-critical-guard,workbench-audit-coverage,ctx-hygiene-guard}.test.mjs`、`server/package.json`

## Acceptance

- `.ctx` 顶层只剩白名单 7 项；不存在 `AUDIT_*` / `IA_*` / `*_DRAFT.md`。
- 7 份审计原文 + `snapshots/` 已入 `logs/archive/2026-10/`，且每份在正式文档或执行日志里有指针。
- 链接真值契约已进 `MODULE_UI_DESIGN.md`；4 条 CTX 规则已进 `PARALLEL_SKILL_AUDIT.md` 与 `CLAUDE.md`。
- `ia-inventory.mjs` 可重跑并写入归档路径；`ia-critical-guard` / `workbench-audit-coverage` 改路径后全绿。
- 新增 `ctx-hygiene-guard` 并登记 `test:daily`。
- `.ctx/TIMESTAMPS.md` 与 `content/**` frontmatter 同步；`npm run test:daily` 全绿。

## Non-goals

- 不删除 `.ctx` 目录；不搬走 `logs/`、`evidence/` 与 5 份台账。
- 不改写历史日志正文；不改业务功能；不改表结构。
- 不把审计原文复制成正式文档（只沉淀可复用条款，原文唯一一份在 archive）。
