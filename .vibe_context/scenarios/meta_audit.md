**Purpose**: 管理所有 AI 治理元数据操作，包括执行日志写入、场景注册表维护、快照生成、审计合规核查。所有其他场景执行完毕后都必须回调本场景完成日志核销。

> **[2026-03 快照封版注记 + 2026-03-22 治理减负更新]**：系统已于 2026-03-21 完成全量 ES6 模块化重构（Part 1–3）及文档层同步（Phase 1/2–2/2），进入 v1.0 稳定期。快照索引文件 `SNAPSHOT_INDEX.md` 已于 2026-03-22 物理删除（治理减负），改由**文件名自解释**机制管理。凡涉及快照封版操作，必须遵循以下规则：
> 1. **单活跃快照原则（Single Active Snapshot）**：`.vibe_context/` 下任何时刻只保留一个活跃快照文件（格式 `SNAPSHOT_v<major>.<minor>_<YYYYMMDD>.md`）。
> 2. **旧快照清除授权**：旧快照在经书记明确授权后可物理删除；未授权时仅在文件 frontmatter 中标注 `status: deprecated`。
> 3. **新快照命名**：格式为 `SNAPSHOT_v<major>.<minor>_<YYYYMMDD>.md`（里程碑节点）。无需再维护 `SNAPSHOT_INDEX.md`，索引由文件名与当月执行日志共同承担。
> 4. **快照必含字段**：模块化结构清单、数据流规则、权限与视图边界、全局术语锁定声明、全局物理拓扑树（Depth 4）、LLM Context Alignment 协议。
> 5. **日志审计**：快照封版操作必须在 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` 末尾追加一条审计记录。

**Trigger**: AI规则、审计、协议、日志、EXECUTION_LOG、快照、场景注册、治理、governance、meta、vibe_context

**Allowed Files**: `.vibe_context/*`

---

## §1 Execution Logging Rule（执行日志规则）

> 来源：`meta_audit_log.md` — merged into meta_audit.md

**所有修改必须在 `.vibe_context/logs/` 目录中留下永久物理记录。**

### 强制日志字段

每条日志条目必须包含：

| 字段 | 说明 |
|------|------|
| `Scenario` | 检测到的场景标识符 |
| `Files Modified` | 已修改文件路径列表 |
| `SOP Reference` | `knowledge/SOP/[file].md#[section]` 或 `N/A` |
| `Schema Impact` | 受影响字段，或 `N/A` |
| `Summary` | 一句话变更描述 |
| `Timestamp` | ISO 8601 日期时间 |

**违规即 TASK FAILURE**：未写入执行日志的 Session 视为未完成。

### 日志轮转规则

- 日志文件路径：`.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`（每自然月一个文件）
- 新月份开始时，AI 必须检查当月日志文件是否存在；若不存在，须从标准模板创建后再追加
- 索引文件 `.vibe_context/logs/EXECUTION_LOG_INDEX.md` 须同步更新，引用新月度文件

---

## §2 Delete + Log Rule（删除强制审计）

任何文件被删除时必须同时满足：

1. **信息零丢失**：被删除信息已合并至新文件，或已在日志中完整记录核心规则摘要
2. **强制审计**：在 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` 中追加 DELETE 条目，包含：
   - 日期时间
   - 操作类型：`DELETE`
   - 被删路径
   - 信息去向与核心摘要

---

## §3 Scenario Registry Guard（场景数量守护）

- 核心场景固定为 **4 个**：`ui_scenario.md`, `core_logic.md`, `sop_sync.md`, `meta_audit.md`
- `.vibe_context/scenarios/` 中不得出现非上述 4 个文件的 `.md` 文件
- 如需新增扩展场景，必须先在 `.vibe_context/AI_CONTEXT.md` 中登记，遵循 Purpose/Trigger/Allowed Files 规范

---

## Pre-Execution Checklist

- [ ] 确认触发本场景的操作类型（日志写入 / 删除审计 / 快照 / 场景注册）
- [ ] 仅操作 `.vibe_context/*` 文件
- [ ] 每次 Session 结束前验证日志条目已写入
- [ ] 若有文件删除，确认 Delete + Log Rule 两项条件均已满足
