# Snapshot History

v12.0 — 2026-03-07    System Health Audit & v6 Protocol Finalization
v11.0 — 2026-03-07    SOP integration + System Change Pipeline + scenarios/meta_audit_log added
v10.0 — 2026-03-05    Pre-SOP architecture baseline (Apple Liquid Glass UI, ESM layered arch)

---

## Index Manifest

| 版本 | 日期 | 物理文件 | 核心变更摘要 |
|------|------|---------|------------|
| v12.0 | 2026-03-07 | `SNAPSHOT_v12.0.md` | AI_CONTEXT.md 压缩为44行三模块；README.md 重构为121行 Org OS 驾驶舱；SOP Index 与 DOCUMENTATION_MAP 创建；Governance Audit v6 全链路执行完毕 |
| v11.0 | 2026-03-07 | `SNAPSHOT_v11.0.md` | 新增 `assets/`、`knowledge/`、`.vibe_context/scenarios/sop_data_sync.md`、`meta_audit_log.md`；`ARCHITECTURE.md` 追加 System Change Pipeline 节 |
| v10.0 | 2026-03-05 | `SNAPSHOT_v10.0.md` | 基线快照：`src/` ESM 分层架构（domain → service.mock → service.runtime → main）、`index.html` 静态入口、Apple Liquid Glass UI 骨架 |

## Reconciliation — Checkpoint 3

| 物理文件 | 是否已登记 |
|---------|----------|
| `SNAPSHOT_v10.0.md` | ✅ 已登记 |
| `SNAPSHOT_v11.0.md` | ✅ 已登记 |
| `SNAPSHOT_v12.0.md` | ✅ 已登记 |

**结论：** 物理账本与索引账本 100% 对齐，无死链，无遗漏。✅

## Index Governance Rules

- 每次生成新快照时，必须同步在本文件追加一行记录（版本、日期、物理文件名、核心变更摘要）。
- 快照文件命名规范：`SNAPSHOT_v<major>.<minor>.md`，存放路径：`.vibe_context/`。
- 删除快照文件前必须同步更新本 Index，并在 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` 中记录 DELETE 审计条目。
