# SYSTEM_ROADMAP — 系统路线图

> **Version:** 1.0 | **Owner:** 支委会 | **Last updated:** 2026-03-05

---

## Phase 1 — Static OS（当前阶段）

**目标：** 建立可用的静态 SPA，支持 SOP 场景浏览、推演排期、活动管理。

- [x] 原生 ESM 分层架构（domain → service.mock → service.runtime → main）
- [x] Activity CRUD（createActivity / listActivities / updateActivity / deleteActivity）
- [x] SOP 推演引擎（instantiateSOP，基于 timeOffset 日历生成）
- [x] Apple Liquid Glass UI（index.html，GitHub Pages 静态部署）
- [x] Schema 版本化（`SCHEMA_VERSION`）与 localStorage 持久化（`workflowos_branch_db_v1`）
- [x] Activity Schema 补全（priority / dueDate / archived 软删除）
- [x] Task Schema 补全（createdAt 审计字段）
- [x] archiveActivity 级联归档（自动将从属 Task 设为 completed）

---

## Phase 2 — Supabase Backend（计划阶段）

**目标：** 将数据层从 localStorage 迁移至 Supabase，实现多设备同步与持久化。

- [ ] 实现 `src/service.supabase.js`（与 service.mock.js 接口一致）
- [ ] `service.runtime.js` 中将 `USE_MOCK` 切换为 `false`，接入 Supabase
- [ ] 用户认证（Supabase Auth）
- [ ] RLS（行级安全）与 ACL 对齐（`can()` 函数约束）
- [ ] 数据迁移脚本（从 localStorage 导出 → Supabase 导入）

---

## Phase 3 — Workflow Engine（未来阶段）

**目标：** 构建完整的自动化工作流引擎，支持任务提醒、状态流转、多人协作。

- [ ] 基于 `dueDate` 字段的自动化提醒（邮件 / 微信推送）
- [ ] Task 状态机（pending → in_progress → completed / blocked）
- [ ] 活动优先级管理（`priority`: low / normal / urgent）
- [ ] 多人协作（实时状态同步，基于 Supabase Realtime）
- [ ] 工作流编排（串行 / 并行 / 条件分支）
- [ ] 数据看板（考勤统计、活动覆盖率、积极分子培养进度）
