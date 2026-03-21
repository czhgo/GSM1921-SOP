---
title: "System Snapshot v1.0"
type: snapshot
status: "ACTIVE - CURRENT"
date: "2026-03-21"
milestone: "ES6全量模块化重构封版 + RBAC双轨状态机 + 文档层同步完毕"
supersedes: "SNAPSHOT_v13.0.md"
topology_injected: "2026-03-21 (Hotfix: depth-4 tree + LLM alignment protocol)"
---

# 🏛️ System Snapshot v1.0 — 2026-03-21

---

## 0. Global Topology（全局物理拓扑树 — Depth 4）

> 本节为 LLM 跨 Session 记忆同步的核心物理坐标系。任何接手本系统的大模型，应以此拓扑树作为第一优先级定位资产。

```
GSM1921-SOP/                               ← 项目根目录（GitHub Pages 静态站）
├── index.html                             ← 唯一 HTML 入口，<script type="module"> 加载 src/main.js
├── README.md                              ← 项目驾驶舱（v5.0），含9+2模块树/RBAC表/DAG说明
├── ARCHITECTURE.md                        ← 技术架构文档
├── AI_ENTRYPOINT.md                       ← 书记指令入口（AI 操作 SOP 首读）
├── SYSTEM_ROADMAP.md                      ← 系统路线图
│
├── src/                                   ← ★ 前端源码（9个ESM模块 + 2个服务层）
│   ├── main.js                            ← 启动入口 + renderUI()（唯一DOM更新出口，~154行）
│   ├── state.js                           ← appState + setState(patch) + registerRenderCallback
│   ├── constants.js                       ← ROLE_COLORS / ROLE_LABELS / ROLE_THEME_CLASS / ROLE_ORDER
│   ├── utils.js                           ← showToast / _fmtDate / _fmtChinese / _currentYearMonth
│   ├── sopData.js                         ← SOP场景任务节点模板数据（物理隔离自main.js）
│   ├── sop.js                             ← instantiateSOP(scenarioIds, t0DateStr) → 绝对日期任务数组
│   ├── calendar.js                        ← renderCalendarByActivities / populateMonthSelector
│   ├── inspector.js                       ← renderInspectorFromState / filterTasksByManagementRole
│   ├── events.js                          ← setupEventListeners()（全量DOM事件绑定）
│   ├── service.mock.js                    ← CRUD + LocalStorage（SANDBOX_MODE开关）
│   ├── service.runtime.js                 ← BranchService出口（USE_MOCK路由开关）
│   ├── domain.js                          ← [Legacy] Schema typedef / mockDB（保留兼容）
│   └── id.js                             ← [Legacy] 唯一ID生成工具
│
├── knowledge/                             ← ★ SOP制度母本（最高权威，变更起点）
│   ├── README.md
│   └── SOP/
│       ├── INDEX.md                       ← SOP文件索引
│       ├── README.md
│       ├── 常见工作场景快速指南.md          ← 场景总入口（1A组织生活会/1B党小组活动）
│       ├── 宣传委员工作流程指南.md
│       ├── 组织委员工作流程指南.md
│       ├── 纪检委员工作流程指南.md
│       └── 支委与党小组定人定责定岗说明.md
│
├── .vibe_context/                         ← ★ AI治理元数据层（Control Plane）
│   ├── AI_CONTEXT.md                      ← 系统架构速览 + 场景路由表 + 铁律（AI首读）
│   ├── REVIEW_STATE.md                    ← v7.0，Stable/Release模式，控制平面总开关
│   ├── SNAPSHOT_INDEX.md                  ← 快照版本注册表（v1.0为ACTIVE）
│   ├── SNAPSHOT_v1.0_20260321.md          ← ★ 本文件（当前活动快照）
│   ├── SNAPSHOT_v13.0.md                  ← [DEPRECATED] 前序快照，保留物理文件
│   ├── EXECUTION_LOG.md                   ← 日志索引
│   ├── FILE_ACCESS.md                     ← 文件读写权限白名单
│   ├── scenarios/                         ← 4大核心场景路由文件
│   │   ├── core_logic.md                  ← 触发：字段/schema/state.js/inspector.js
│   │   ├── sop_sync.md                    ← 触发：SOP/流程/sopData.js
│   │   ├── ui_scenario.md                 ← 触发：UI/视图/RBAC/归档库
│   │   └── meta_audit.md                  ← 触发：日志/快照/审计/治理
│   └── logs/
│       ├── 2026-02-EXECUTION_LOG.md
│       └── 2026-03-EXECUTION_LOG.md       ← 当月执行日志（本次封版已追加）
│
├── docs/                                  ← 人类可读扩展文档
│   ├── DOCUMENTATION_MAP.md
│   ├── README.md
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md
│   └── 党支部管理与实务经验沉淀.md        ← v1.3，含模块五(5.1-5.4)技术经验沉淀
│
├── assets/
│   └── images/
│       └── party_emblem.png
│
├── backlog/
│   ├── COMPLETED_TASKS.md                 ← 已完成任务归档（修改1-18）
│   └── PENDING_MODIFICATIONS.md           ← 当前待办（修改14，悬置状态）
│
├── governance/
│   ├── README.md
│   ├── SUSPENDED_ISSUES.md               ← 悬置问题（DO NOT TOUCH）
│   └── WATCHLIST.md
│
└── 参考资料/                              ← 只读二进制资产（PDF/DOCX/PPTX）
    ├── README.md
    ├── 党小组会/
    │   ├── 20251130党支部月度会议-发布版.pdf
    │   ├── 光华管理学院本科生党支部关于成立党小组的说明-2505.docx
    │   └── 党建活动SOP流程图-初版-白文琦&孙睿.pdf
    ├── 官方文件/
    │   ├── 【附件11】中国共产党章程.pdf
    │   ├── 【附件12】党支部工作规范（学生）.pdf
    │   ├── 【附件14】中国共产党党员教育管理工作条例（2019年5月21日）.docx
    │   ├── 【附件15】中国共产党发展党员工作细则（2014年）.docx
    │   ├── 【附件16】中国共产党普通高等学校基层组织工作条例（2010年8月13日）.docx
    │   └── 【附件17】中国共产党支部工作条例（试行）（2018年10月28日）.docx
    ├── 支部委员会/
    │   └── 支委工作手册26春.docx
    └── 模板库/
        ├── 活动复盘/
        │   ├── README.md
        │   └── 活动复盘模板.md
        └── 申报材料模板/
            ├── README.md
            ├── 其他模板/
            │   ├── README.md
            │   ├── 支部基本信息模板.md
            │   └── 活动总结模板.md
            ├── 宣传材料类/
            │   └── README.md
            └── 工作记录类/
                ├── README.md
                └── 党支部工作记录.docx
```

---

## 0-B. LLM Context Alignment（机器可读架构协议）

> **[System Directive for Future LLMs]**
>
> **Context**: This is **"Org OS v1.0"** — a Vanilla JS, Doc-Driven SOP Engine for a CPC branch. No build tools. GitHub Pages static hosting. Native ES6 modules only.
>
> **1. Data Pipeline**:
> `knowledge/SOP/*.md` (authoritative institution rules)
> → manually distilled into `src/sopData.js` (task template registry, keyed by scenarioId)
> → instantiated via `src/sop.js::instantiateSOP(scenarioIds, t0DateStr)` (offsets → absolute dates)
> → state managed by `src/state.js` (immutable appState + setState + registerRenderCallback DAG pattern)
> → rendered by `src/main.js::renderUI(state)` (sole DOM update gate)
>
> **2. RBAC Dual-Track UI**:
> All role logic lives in `src/inspector.js` + `src/constants.js`.
> - `viewType:'participant'` → read-only card list + DOM modal (`_showParticipantModal`) — zero task detail exposure
> - `viewType:'manager'` + `managementRole:'leader'|'commissioner'|'organizer'|'deep'` → `filterTasksByManagementRole` + `ROLE_THEME_CLASS` 4-color task panel
> - `viewArchived:true` → isolated archive vault, all `<select>` disabled, restore-only mode
>
> **3. Mandatory Change Pipeline** (iron law, never bypass):
> `SOP Document Update (knowledge/SOP/)` → `Data Template Update (src/sopData.js)` → `Service Layer (service.mock.js)` → `State Update (state.js)` → `UI Render (main.js renderUI)`. **NO direct code hacking without SOP basis.**
>
> **4. Circular Dependency Breaker**:
> `state.js` never imports `main.js`. Instead, `main.js` calls `registerRenderCallback(renderUI)` post-definition. All render modules receive `appState` via function parameters only.
>
> **5. Key Identifiers** (role name lock — code layer only, NO real names):
> `leader` (条条支委/党小组组长) | `commissioner` (块块委员) | `organizer` (活动组织者) | `deep` (深度参与者) | `participant` (普通成员)
>
> **6. File Boundaries** (scope guard):
> - Governance metadata: `.vibe_context/*` only
> - SOP rules: `knowledge/SOP/*` only
> - Data templates: `src/sopData.js` only
> - UI structure: `index.html` + `assets/*` only
> - Binary assets: `参考资料/` — READ ONLY, no modification ever

---

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
