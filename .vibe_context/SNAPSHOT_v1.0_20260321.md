---
title: "System Snapshot v1.0"
type: snapshot
status: "ACTIVE - CURRENT"
date: "2026-03-21"
milestone: "ES6全量模块化重构封版 + RBAC双轨状态机 + 文档层同步完毕"
supersedes: "SNAPSHOT_v13.0.md"
---

# 🏛️ System Snapshot v1.0 — 2026-03-21

> **封版声明**：本快照标记 GSM1921-SOP Org OS 进入 **v1.0 稳定期**。  
> 2026年3月完成了全量 ES6 模块化重构（Part 1–3）与文档层封版（Phase 1/2–2/2），  
> 系统从"单体 main.js"演进至"9模块 ESM 分层架构 + RBAC 双轨状态机"里程碑节点。

---

## 1. 模块化源码结构（绝对物理清单）

`index.html` 通过 `<script type="module" src="./src/main.js">` 加载前端，全部依赖均为原生 ES6 相对路径 import，无构建工具，GitHub Pages 直接静态托管。

| 文件 | 职责 | 关键导出 |
|------|------|---------|
| `src/state.js` | 全局状态中心 | `appState`（不可变）、`setState(patch)`、`registerRenderCallback(fn)`、`getAppState()` |
| `src/constants.js` | 静态常量注册表 | `ROLE_COLORS`、`ROLE_LABELS`、`ROLE_THEME_CLASS`、`ROLE_ORDER`、`COMMISSIONER_ROLES` |
| `src/utils.js` | 通用工具函数 | `showToast(type, msg)`、`_fmtDate(d)`、`_fmtChinese(d)`、`_currentYearMonth()` |
| `src/sopData.js` | SOP 场景任务节点模板数据 | `SOP_SCENARIOS`（按 scenarioId 索引的任务数组，含 title/offset/executor/supervisor） |
| `src/sop.js` | SOP 实例化引擎 | `instantiateSOP(scenarioIds, t0DateStr)` → 绝对日期任务实例数组 |
| `src/calendar.js` | 日历渲染引擎 | `renderCalendarByActivities(activities, targetMonth)`、`populateMonthSelector(activities)` |
| `src/inspector.js` | 检查器面板 + 任务过滤 | `renderInspectorFromState(state)`、`renderInspectorList(acts, state)`、`renderInspectorDetail(act, tasks, state)`、`filterTasksByManagementRole(tasks, role)` |
| `src/events.js` | 全量 DOM 事件绑定 | `setupEventListeners()`（侧边栏角色按钮、日历月份选择、推演工作台、归档库按钮） |
| `src/main.js` | 启动入口 + 渲染协调 | `initApp()`、`renderUI(state)`（唯一 DOM 更新入口，约 154 行） |
| `src/service.mock.js` | Mock 服务层 + LocalStorage 持久化 | `createActivity`、`listActivities`、`updateActivity`、`archiveActivity`、`deleteActivity`、`createTask`、`updateTask`、`listTasks`；`SANDBOX_MODE` 开关 |
| `src/service.runtime.js` | 运行时服务路由 | `BranchService`（代理层，统一暴露 CRUD 接口；`USE_MOCK` 控制指向 mock 或未来真实后端） |

**循环依赖破解**：`state.js` 暴露 `registerRenderCallback(fn)`，由 `main.js` 在定义 `renderUI` 后主动注册，依赖图保持 DAG（有向无环图）。

---

## 2. 数据流规则（闭环流转）

```
活动创建
  └─▶ BranchService.createActivity(name, date, executor)
        └─▶ service.mock.createActivity → mockDB.activities.push(act)
              └─▶ instantiateSOP(scenarioIds, t0DateStr) [src/sop.js]
                    └─▶ BranchService.createTask(taskData) × N  ← Promise.allSettled 并行
                          └─▶ setState({ activities, tasks }) → renderUI(appState)

任务状态变更
  └─▶ <select> change 事件 [src/inspector.js]
        └─▶ BranchService.updateTask(taskId, { status })
              └─▶ service.mock.updateTask → immutable 更新 mockDB.tasks
                    └─▶ setState({ tasks: newTasks }) → renderUI(appState)

活动归档
  └─▶ 归档按钮点击 [src/events.js / inspector.js]
        └─▶ window.confirm() [破坏性操作保留原生确认]
              └─▶ BranchService.archiveActivity(id) → mockDB.activities[i].archived = true
                    └─▶ setState({ activities }) → renderUI(appState) → 主视图隐藏已归档活动

活动恢复
  └─▶ 恢复按钮点击（归档库详情页）
        └─▶ BranchService.updateActivity(id, { archived: false })
              └─▶ setState({ viewArchived: false, activities }) → renderUI(appState) → 退回主视图
```

**铁律**：所有状态变更均通过 `setState(patch)` 触发，`renderUI(appState)` 是唯一合法 DOM 更新入口，无任何手动 `document.querySelector().innerHTML` 散写。

---

## 3. 权限与视图边界（RBAC 双轨）

### 3.1 参与视图（viewType: 'participant'）

| 维度 | 规则 |
|------|------|
| 触发 | 侧边栏"👀 参与视图"按钮 → `setState({ viewType:'participant' })` |
| 检查器列表 | 展示当日活动卡片，**仅显示标题+状态**，不暴露执行者/督办者字段 |
| 卡片点击 | 弹出原生 DOM Modal（`_showParticipantModal(act)`），展示活动摘要+切换管理角色提示；点击遮罩自动关闭 |
| 任务详情 | **不可见**（`renderInspectorFromState` 中 `viewType !== 'manager'` 时拦截） |
| 设计意图 | 普通成员防偷窥：无法从参与视图看到任务分工细节 |

### 3.2 管理视图（viewType: 'manager'）

| managementRole | 含义 | 左边框颜色 | 任务过滤范围 |
|----------------|------|-----------|------------|
| `leader` | 党小组组长 | 🔵 蓝色 | `executor === 'leader'` 或 `supervisor === 'leader'` 的任务 |
| `commissioner` | 委员系列 | 🟡 黄色 | `executor/supervisor` 属于 `COMMISSIONER_ROLES` 集合 |
| `organizer` | 活动组织者 | 🔴 红色 | `executor === 'organizer'` 或 `supervisor === 'organizer'` |
| `deep` | 深度参与者 | 🟢 绿色 | `executor === 'deep'` 或 `supervisor === 'deep'` |

- 详情页支持任务状态切换（`<select>` 下拉框）与归档/删除危险操作。
- `filterTasksByManagementRole(tasks, role)` 集中实现过滤逻辑（`src/inspector.js`）。

### 3.3 归档库模式（viewArchived: true）

| 操作 | 行为 |
|------|------|
| 点击"归档库"按钮 | `setState({ viewArchived: true, viewType: 'manager', viewMode: 'list' })` |
| 检查器列表 | 展示所有 `archived === true` 的活动（忽略日期过滤，历史数据隔离空间） |
| 详情页 `<select>` | 全部 `disabled`（防误改历史数据） |
| "归档活动"按钮 | 替换为绿色"恢复活动"按钮 |
| 恢复操作 | `updateActivity(id, { archived: false })` → 自动退回主视图 |
| 切换角色按钮 | 自动重置 `viewArchived: false` |

### 3.4 日历四色角色圆点

- 每个有活动的日期格，渲染按角色排序的多色 6×6px 圆点（`display:flex` 横排）。
- 颜色来源：`ROLE_COLORS[executor].text`（`src/constants.js` 统一维护）。
- 排序规则：`leader → commissioner → organizer → deep → all`（`ROLE_ORDER` 常量）。
- 扩展方式：仅需在 `ROLE_COLORS` 与 `ROLE_ORDER` 添加一条记录，全部渲染自动联动。

---

## 4. 全局术语锁定声明

本系统所有文档与代码层统一使用以下角色术语，禁止混用、自造同义词：

| 术语 | 含义 | 对应 managementRole |
|------|------|-------------------|
| **条条支委**（纵向组织） | 党小组组长，负责本组活动策划与执行监督 | `leader` |
| **块块委员**（横向职能） | 组织委员/宣传委员/纪检委员，负责职能保障与督办 | `commissioner` |
| **活动组织者** | 具体活动的策划执行方 | `organizer` |
| **深度参与者** | 承接具体内容产出（如宣传材料）的骨干成员 | `deep` |
| **普通参与者** | 一般成员，使用参与视图 | `participant` |

> **⚠️ 代码层硬性规则**：`src/*` 与 `index.html` 中禁止硬编码真实人名，一律使用上表角色标识符。真人姓名仅允许存在于 `knowledge/SOP/` 之中。

---

## 5. 封版审计记录

| 字段 | 值 |
|------|---|
| 封版日期 | 2026-03-21 |
| 执行会话 | Org OS Release Phase 2/2 |
| 前序快照 | `SNAPSHOT_v13.0.md` → 标记为 `[DEPRECATED]` |
| 本快照状态 | `[ACTIVE - CURRENT]` |
| 文档变更 | `README.md` (v5.0)、`docs/党支部管理与实务经验沉淀.md` (v1.3)、`.vibe_context/AI_CONTEXT.md`、`.vibe_context/scenarios/*.md`、`.vibe_context/REVIEW_STATE.md` (v7.0) |
| 代码变更 | 无（Phase 2/2 为纯文档封版操作，严禁碰触 `src/`） |
| 执行日志 | `.vibe_context/logs/2026-03-EXECUTION_LOG.md`（末尾已追加封版记录） |
