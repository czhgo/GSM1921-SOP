# Snapshot History

v1.0 — 2026-03-21    **[ACTIVE - CURRENT]** ES6 全量模块化重构封版 + RBAC 双轨 + 文档层同步完毕
v13.0 — 2026-03-08   **[DEPRECATED]** Control Plane Segregation & Governance Refactoring Completed
v12.0 — 2026-03-07    Control Plane v2 已启用；README/AI_CONTEXT 重构 [DEPRECATED & DELETED]
v11.0 — 2026-03-07    SOP integration + System Change Pipeline [DEPRECATED & DELETED]
v10.0 — 2026-03-05    Pre-SOP architecture baseline [DEPRECATED & DELETED]

---

## Index Manifest

| 版本 | 日期 | 物理文件 | 核心变更摘要 |
|------|------|---------|------------|
| **v1.0** | **2026-03-21** | **`SNAPSHOT_v1.0_20260321.md`** | **[ACTIVE - CURRENT]** 全量 ES6 9模块化重构完成；RBAC 双轨状态机（参与/管理四色）已落地；归档库隔离；日历四色联动；文档层 README/经验库全量重写 |
| v13.0 | 2026-03-08 | `SNAPSHOT_v13.0.md` **[DEPRECATED]** | Control Plane v2 已启用；governance/backlog/logs 读写权限白名单已刷新；遗留路径已硬扫荡；死链已修复 |
| v12.0 | 2026-03-07 | ~~`SNAPSHOT_v12.0.md`~~ **[DEPRECATED & DELETED]** | AI_CONTEXT.md 压缩为44行三模块；README.md 重构为121行 Org OS 驾驶舱；SOP Index 与 DOCUMENTATION_MAP 创建 |
| v11.0 | 2026-03-07 | ~~`SNAPSHOT_v11.0.md`~~ **[DEPRECATED & DELETED]** | 新增 `assets/`、`knowledge/`、`.vibe_context/scenarios/`；`ARCHITECTURE.md` 追加 System Change Pipeline 节 |
| v10.0 | 2026-03-05 | ~~`SNAPSHOT_v10.0.md`~~ **[DEPRECATED & DELETED]** | 基线快照：`src/` ESM 分层架构（domain → service.mock → service.runtime → main）、`index.html` 静态入口 |

## Reconciliation — Checkpoint 5（v1.0 封版）

| 物理文件 | 是否已登记 |
|---------|----------|
| `SNAPSHOT_v1.0_20260321.md` | ✅ 已登记（当前活动快照） |
| `SNAPSHOT_v13.0.md` | ✅ 已登记（已弃用，保留物理文件） |
| `SNAPSHOT_v12.0.md` | ✅ 已登记（已销毁） |
| `SNAPSHOT_v11.0.md` | ✅ 已登记（已销毁） |
| `SNAPSHOT_v10.0.md` | ✅ 已登记（已销毁） |

**结论：** 物理账本与索引账本 100% 对齐，v1.0 为当前唯一活动快照。✅

## Index Governance Rules

- 每次生成新快照时，必须同步在本文件追加一行记录（版本、日期、物理文件名、核心变更摘要）。
- 快照文件命名规范：`SNAPSHOT_v<major>.<minor>.md`，存放路径：`.vibe_context/`。
- 删除快照文件前必须同步更新本 Index，并在 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` 中记录 DELETE 审计条目。
