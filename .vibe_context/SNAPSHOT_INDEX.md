# Snapshot History

v13.0 — 2026-03-08    Control Plane Segregation & Governance Refactoring Completed
v12.0 — 2026-03-07    System Health Audit & v6 Protocol Finalization [DEPRECATED & DELETED]
v11.0 — 2026-03-07    SOP integration + System Change Pipeline + scenarios/meta_audit_log added [DEPRECATED & DELETED]
v10.0 — 2026-03-05    Pre-SOP architecture baseline (Apple Liquid Glass UI, ESM layered arch) [DEPRECATED & DELETED]

---

## Index Manifest

| 版本 | 日期 | 物理文件 | 核心变更摘要 |
|------|------|---------|------------|
| v13.0 | 2026-03-08 | `SNAPSHOT_v13.0.md` | Control Plane v2 已启用；governance/backlog/logs 读写权限白名单已刷新；遗留路径已硬扫荡；死链已修复；旧快照已销毁 |
| v12.0 | 2026-03-07 | ~~`SNAPSHOT_v12.0.md`~~ **[DEPRECATED & DELETED]** | AI_CONTEXT.md 压缩为44行三模块；README.md 重构为121行 Org OS 驾驶舱；SOP Index 与 DOCUMENTATION_MAP 创建；Governance Audit v6 全链路执行完毕 |
| v11.0 | 2026-03-07 | ~~`SNAPSHOT_v11.0.md`~~ **[DEPRECATED & DELETED]** | 新增 `assets/`、`knowledge/`、`.vibe_context/scenarios/sop_data_sync.md`、`meta_audit_log.md`；`ARCHITECTURE.md` 追加 System Change Pipeline 节 |
| v10.0 | 2026-03-05 | ~~`SNAPSHOT_v10.0.md`~~ **[DEPRECATED & DELETED]** | 基线快照：`src/` ESM 分层架构（domain → service.mock → service.runtime → main）、`index.html` 静态入口、Apple Liquid Glass UI 骨架 |

## Reconciliation — Checkpoint 4

| 物理文件 | 是否已登记 |
|---------|----------|
| `SNAPSHOT_v13.0.md` | ✅ 已登记（当前活动快照） |
| `SNAPSHOT_v12.0.md` | ✅ 已登记（已销毁） |
| `SNAPSHOT_v11.0.md` | ✅ 已登记（已销毁） |
| `SNAPSHOT_v10.0.md` | ✅ 已登记（已销毁） |

**结论：** 物理账本与索引账本 100% 对齐，旧快照已物理删除，v13.0 为唯一活动快照。✅

## Index Governance Rules

- 每次生成新快照时，必须同步在本文件追加一行记录（版本、日期、物理文件名、核心变更摘要）。
- 快照文件命名规范：`SNAPSHOT_v<major>.<minor>.md`，存放路径：`.vibe_context/`。
- 删除快照文件前必须同步更新本 Index，并在 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` 中记录 DELETE 审计条目。
