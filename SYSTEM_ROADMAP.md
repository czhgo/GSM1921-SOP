# System Roadmap

> 光华管理学院本科生党支部 SOP 引擎 — 产品路线图 v10.0

## Phase 1 — Static OS（当前）

- 纯静态 GitHub Pages 部署
- 原生 ESM，无构建工具
- LocalStorage 持久化（`workflowos_branch_db_v1`）
- Mock 服务层模拟网络延迟与随机错误
- 状态机驱动 UI（STATE: IDLE / LOADING / SUBMITTING / SUCCESS / ERROR）
- Activity CRUD + 软删除归档（`archived`）
- 级联归档：归档 Activity 时自动将其下属 Task 设为 `completed`

## Phase 2 — Supabase Backend（规划）

- 接入 Supabase 后端（`service.supabase.js`）
- 将 `service.runtime.js` 中 `USE_MOCK` 切换为 `false`
- 用户认证（Supabase Auth）
- 实时同步（Supabase Realtime）
- 考察档案 ACL 隔离（仅支委可读写 `evaluation` 资源）

## Phase 3 — Workflow Engine（规划）

- 完整 Workflow 引擎：Task 自动实例化、状态流转、提醒推送
- `dueDate` 驱动的自动化提醒（基于 `priority` 分级）
- SOP 场景与 Activity/Task 的全链路绑定
- 数据导出与审计报告生成
