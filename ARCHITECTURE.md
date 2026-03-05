# ARCHITECTURE — 系统架构说明

> **Version:** 1.0 | **Owner:** 支委会 | **Last updated:** 2026-03-05

---

## Repository Structure (File-Level Map)

```
GSM1921-SOP/
│
├── REPO_ENTRYPOINT.md          # AI 代理强制入口（本文件）
├── ARCHITECTURE.md             # ← 本文件：核心架构说明与文件级地图
├── SYSTEM_ROADMAP.md           # 系统路线图（Phase 1/2/3）
├── README.md                   # 仓库顶层导航
├── START_HERE.md               # 新成员上手指南
├── CHEATSHEET.md               # 速查卡
│
├── src/                        # 系统核心（原生 ES Modules，v8.5+）
│   ├── domain.js               # [Schema] 领域层：Activity/Task typedef + SCHEMA_VERSION + can() ACL + mockDB
│   ├── id.js                   # UUID 发生器（generateId）
│   ├── service.mock.js         # [State machine] Mock 服务层：CRUD + saveDB/loadDB + archiveActivity 级联
│   ├── service.runtime.js      # 运行时插槽：BranchService，USE_MOCK 开关，未来 Supabase 替换点
│   └── main.js                 # [State machine] UI 入口：STATE 枚举 + appState + setState + renderUI
│
├── index.html                  # 前端壳体：Apple Liquid Glass UI（静态骨架，ESM 入口）
│
├── docs/                       # 技术参考文档
├── 流程指南/                    # 人类可读的制度母本（SOP 场景，共 10 个）
├── 申报材料模板/                 # 模板资产挂载点
├── 活动复盘/                    # 活动复盘模板与指南
├── 参考资料/                    # 官方法规文件（只读）
│
└── .vibe_context/              # AI 控制平面与审计日志区
    ├── FILE_ACCESS.md          # 文件访问白名单（路由守卫）
    ├── REVIEW_STATE.md         # 任务状态机
    ├── EXECUTION_LOG.md        # 日志入口（重定向至 logs/）
    ├── logs/                   # 月度执行日志
    └── scenarios/              # 场景路由脚本
```

---

## 单向依赖链（不可违反）

```
domain.js → service.mock.js → service.runtime.js → main.js → index.html
```

---

## Data Model

| 类型 | 定义位置 | 关键字段 |
|------|---------|---------|
| `Activity` | `src/domain.js` | id, title, type, status, visibility, date, executor, supervisor, createdBy, createdAt, priority, dueDate, archived |
| `Task` | `src/domain.js` | id, activityId, title, executor, supervisor, status, createdAt |
| `Attendance` | `src/domain.js` | id, activityId, userId, status, recordedBy, recordedAt |
| `User` | `src/domain.js` | id, role, name |

## Storage Model

| 字段 | 类型 | 说明 |
|------|------|------|
| `mockDB._schema` | `number` | Schema 版本号（= `SCHEMA_VERSION`），用于防止脏数据加载 |
| `mockDB.users` | `User[]` | 用户列表（静态种子数据） |
| `mockDB.activities` | `Activity[]` | 活动列表（运行时可变，Immutable 更新） |
| `mockDB.tasks` | `Task[]` | 任务列表（运行时可变，Immutable 更新） |
| `mockDB.attendances` | `Attendance[]` | 考勤记录（运行时可变） |

持久化键：`localStorage['workflowos_branch_db_v1']`

---

## 技术栈

| 层级 | 文件 | 说明 |
|------|------|------|
| Domain 层 | `src/domain.js` | JSDoc 契约 + 不可变 mockDB |
| Service Mock 层 | `src/service.mock.js` | Promise + 600ms 延迟 + 10% 随机错误 + localStorage 持久化 |
| Runtime 插槽 | `src/service.runtime.js` | `USE_MOCK` 开关，平滑后端切换点 |
| UI 层 | `src/main.js` | STATE 枚举，immutable appState，防竞态 reqId，renderUI() |
| 前端壳体 | `index.html` | HTML5 + Tailwind CDN + Apple Liquid Glass |
| 部署平台 | GitHub Pages | 零构建，静态托管 |
