---
title: "光华管理学院本科生党支部 SOP"
type: index
audience:
  - 所有支部成员
  - 新任支委
  - 党小组组长
owner: "储子禾"
last_updated: "2026-03-22"
version: "6.0"
status: active
---

# 🏛️ 光华管理学院本科生党支部组织操作系统

这是一个基于文档驱动的党支部组织操作系统 (Doc-Driven Org OS)。

> 🌐 **公网访问：[https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)**

---

## 📌 系统定位 (Project Overview)

本系统将支部的**制度、流程、模板、任务分工**统一管理于单一代码仓库，书记与委员通过查阅文档、填写反馈卡与调用 AI 代理即可完成日常全部工作——无需手动维护多份独立文件。

**三条核心价值：**

1. **制度驱动**：所有工作流均源自 `knowledge/SOP/`，改一处制度，全系统同步。
2. **人机协作**：书记提需求，AI 代理几分钟内完成修改，全程有日志可查。
3. **零门槛上手**：委员只需看流程卡，无需理解任何代码或技术架构。

---

## 🎛️ 控制平面 (Control Plane)

> 这是系统最高优先级的管理大盘。书记每次进入仓库，先看这里。

### 🔴 心智监控与全局进度大盘

**[`.vibe_context/REVIEW_STATE.md`](./.vibe_context/REVIEW_STATE.md)** — 系统核心状态监控面板。记录当前 Review 轮次、所有待决议题、AI 代理执行进度与控制平面健康状态。书记需定期审阅，确保系统处于受控状态。

### 📋 日常任务流转与待办执行区

**[`backlog/PENDING_MODIFICATIONS.md`](./backlog/PENDING_MODIFICATIONS.md)** — 所有待执行的修改任务在此排队。书记在此发起任务，AI 代理领取执行，完成后移入 [`backlog/COMPLETED_TASKS.md`](./backlog/COMPLETED_TASKS.md)。

### 🏛️ 治理合规面板

| 文件 | 用途 |
|------|------|
| [`governance/WATCHLIST.md`](./governance/WATCHLIST.md) | 需持续关注的系统风险与委员分工优化项 |
| [`governance/SUSPENDED_ISSUES.md`](./governance/SUSPENDED_ISSUES.md) | 书记明确暂缓处理的议题（AI 代理不得擅自修改） |

---

## 🗂️ 架构领土 (Repository Structure)

| 目录 / 文件 | 定位 | 用途说明 |
|------------|------|---------|
| **`knowledge/SOP/`** | 绝对制度母本 | 所有工作流的最高权威来源，修改需经书记授权 |
| **`governance/`** | 动态治理平面 | 合规监控、风险跟踪、暂缓议题管理 |
| **`backlog/`** | 动态治理平面 | 任务待办队列与已完成任务归档 |
| **`docs/`** | 知识沉淀区 | 技术文档、数据映射、SOP 优化反馈卡 |
| **`参考资料/`** | 静态外部物料 | 官方党章、会议记录、支委工作手册（只读） |
| **`参考资料/模板库/`** | 静态外部物料 | 三会一课、活动总结等现成模板，直接下载使用 |
| **`src/`** | 前端交互逻辑 | Web 视图的状态机、服务层与领域模型（AI 代理维护） |
| **`index.html`** | 前端入口 | 按角色/领域筛选的交互式 Web 视图（浏览器打开即用） |
| **`.vibe_context/`** | AI 控制平面 | AI 代理的场景路由、执行铁律、审计日志 |

---

## ⚙️ 前端架构解析 (Frontend Architecture)

> 本节面向后继维护者与 AI 代理，解释 `src/` 目录的模块拓扑与 RBAC 视图逻辑。普通成员无需阅读此节。

### ES6 模块化结构（9 + 2 文件）

`index.html` 通过 `<script type="module" src="./src/main.js">` 加载前端，全部依赖均为**原生 ES6 相对路径 import**，无需构建工具，GitHub Pages 直接静态托管。

```
src/
├── state.js       全局状态中心：appState 不可变对象 + setState(patch) + registerRenderCallback
├── constants.js   静态常量：ROLE_COLORS / ROLE_LABELS / ROLE_THEME_CLASS / COMMISSIONER_ROLES
├── utils.js       通用工具：_fmtDate / _fmtChinese / showToast / _currentYearMonth
├── sopData.js     SOP 模板数据：各场景任务节点的原始数据定义
├── sop.js         SOP 实例化：instantiateSOP(scenarioIds, t0DateStr) → 计算绝对日期的任务数组
├── calendar.js    日历渲染引擎：renderCalendarByActivities / populateMonthSelector
├── inspector.js   检查器面板：renderInspectorFromState / renderInspectorList / renderInspectorDetail / filterTasksByManagementRole
├── events.js      全量 DOM 事件绑定：setupEventListeners()，侧边栏 / 模块 Tab / RBAC 角色按钮 / 推演工作台
├── main.js        启动入口 + 渲染协调：initApp / renderUI（唯一 DOM 更新入口）
│
├── service.mock.js    Mock 服务层：localStorage 持久化 + SANDBOX_MODE 开关（true=每次重载恢复初始数据）
└── service.runtime.js 运行时服务路由：BranchService 代理，统一暴露 createActivity/listActivities/createTask/updateTask/archiveActivity/deleteActivity 等方法
```

**循环依赖破解机制**：`state.js` 需要调用 `renderUI`，`main.js` 需要 `import setState`——若互相 import 则形成循环。解法是 `state.js` 暴露 `registerRenderCallback(fn)`，由 `main.js` 在定义 `renderUI` 后主动注册，依赖图保持 DAG（有向无环图）。

**单向数据流**：所有用户操作 → `setState(patch)` → `renderUI(appState)` → 全量 DOM 重绘。无任何直接 DOM 操作分散在业务逻辑中，状态与视图严格同步。

### 变更黄金铁律 (Change Pipeline)

> 这是后继维护者与 AI 代理的**最高行为约束**，所有变更必须且只能沿此管道流动，严禁跳步或逆向操作。

```
SOP 更新 (knowledge/SOP/)
    ↓
sopData 注入 (src/sopData.js — 同步任务节点模板数据)
    ↓
state 状态机更新 (src/state.js + setState patch)
    ↓
renderUI 单向渲染 (src/main.js — 唯一 DOM 更新出口)
```

**归档库数据隔离**：活动执行完成后通过 `archiveActivity(id)` 写入 `archived: true`。归档数据与活跃数据物理共存于同一 localStorage 空间，但通过 `viewArchived` 状态标志在 UI 层实现完全隔离——归档视图中所有 `<select>` 为 `disabled`，防止对历史数据的意外改写，恢复通道唯一入口为"恢复活动"按钮。

### RBAC 双轨视图模型

系统支持两套并行视图，通过侧边栏角色按钮切换，核心字段为 `appState.viewType` + `appState.managementRole`。

#### 👀 参与视图（`viewType: 'participant'`）

- 日历点击后，右侧检查器展示当日活动列表，每张卡片**仅显示标题与状态**，不暴露执行者/督办者信息。
- 点击卡片弹出**原生 DOM Modal**（`_showParticipantModal`），展示活动摘要与切换提示，点击遮罩自动关闭。
- 防偷窥设计：普通成员无法从参与视图看到任务分工细节。

#### ⚙️ 管理视图（`viewType: 'manager'`）

根据 `managementRole` 的不同，左边框颜色与任务过滤范围均自动调整：

| 管理角色 | 左边框颜色 | 任务过滤范围 |
|---------|-----------|------------|
| `leader`（党小组组长） | 🔵 蓝色 | 含 executor/supervisor = leader 的任务 |
| `commissioner`（委员） | 🟡 黄色 | 含 executor/supervisor 属于委员系列的任务 |
| `organizer`（活动组织者） | 🔴 红色 | 含 executor/supervisor = organizer 的任务 |
| `deep`（深度参与者） | 🟢 绿色 | 含 executor/supervisor = deep 的任务 |

详情页支持任务状态切换（`<select>` 下拉框）和归档/删除危险操作。

#### 🗄️ 归档库模式（`viewArchived: true`）

- 点击侧边栏「归档库」按钮，`setState({ viewArchived: true, viewType: 'manager' })`。
- 检查器忽略日期过滤，展示所有 `a.archived === true` 的活动（历史数据隔离空间）。
- 归档活动详情页中，所有 `<select>` 被 `disabled`（防误改），"归档活动"按钮替换为"恢复活动"。
- 恢复操作调用 `updateActivity(id, { archived: false })` 并自动退回主视图。

### 日历四色角色圆点

日历网格中每个有活动的日期格，渲染按角色排序的多色 6×6px 圆点（`display:flex` 横排）：

- 颜色来源：`ROLE_COLORS[executor].text`（统一维护于 `src/constants.js`）
- 排序规则：`leader → commissioner → organizer → deep → all`
- 扩展方式：只需在 `ROLE_COLORS` 中添加新角色记录，全部渲染自动联动

---

## 🚀 日常核心操作流 (How to Use)

### 查看交互视图

直接在浏览器打开 → **[https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)**
或本地双击 `index.html`（无需服务器，无需安装任何工具）。

### 修改制度 / 新增工作流

1. 直接编辑 `knowledge/SOP/` 下对应文件（见 [SOP 索引](./knowledge/SOP/INDEX.md)）
2. 或通过 [AI_ENTRYPOINT.md](./AI_ENTRYPOINT.md) 调用 AI 代理代为执行
3. AI 代理自动同步 `src/domain.js` 与相关文档，并在执行日志中留档

### 检查与管理待办任务

进入 **[`backlog/`](./backlog/)** — 在 `PENDING_MODIFICATIONS.md` 中新增任务条目，AI 代理下次执行时自动领取。

### 追踪系统健康状态

打开 **[`.vibe_context/REVIEW_STATE.md`](./.vibe_context/REVIEW_STATE.md)** — 确认控制平面状态为 `ACTIVE`，Review 轮次无积压。

### 提交流程反馈

发现流程不准或有改进建议，填写：
**[SOP 优化提案反馈卡](./docs/SOP优化提案反馈卡.md)** — 书记确认后，AI 代理几分钟内完成全局修复。

---

## 👤 按角色快速导航

### 🆕 新任支委（第一天必看）

1. [常见工作场景快速指南](./knowledge/SOP/常见工作场景快速指南.md) — 9 个最常见工作场景
2. [支委与党小组定人定责定岗说明](./knowledge/SOP/支委与党小组定人定责定岗说明.md) — 搞清楚谁负责什么

### 🗂️ 块块委员专属手册

| 角色 | 手册入口 |
|------|---------|
| 组织委员（侯嘉嵘） | [组织委员工作流程指南](./knowledge/SOP/组织委员工作流程指南.md) |
| 宣传委员（闫鑫岳） | [宣传委员工作流程指南](./knowledge/SOP/宣传委员工作流程指南.md) |
| 纪检委员（韩思宁） | [纪检委员工作流程指南](./knowledge/SOP/纪检委员工作流程指南.md) |

---

## 📚 知识库导航 (Documentation)

| 文档 | 说明 |
|------|------|
| [knowledge/SOP/INDEX.md](./knowledge/SOP/INDEX.md) | 全部 SOP 制度文件索引（含责任人与关联字段） |
| [docs/DOCUMENTATION_MAP.md](./docs/DOCUMENTATION_MAP.md) | 全局文档层拓扑图（三大文档区定位说明） |
| [参考资料/README.md](./参考资料/README.md) | 官方文件与会议记录目录（只读参考） |

---

## 🤖 AI 代理指挥所 (AI System)

书记通过以下**唯一入口**调用 AI 代理，完成制度修改、数据同步、日志审计等全部维护工作：

> 👉 **[AI_ENTRYPOINT.md](./AI_ENTRYPOINT.md)** — 呼叫 AI 代理进行系统维护与功能迭代的唯一入口

AI 代理遵循 `.vibe_context/AI_CONTEXT.md` 中定义的架构铁律，所有操作均有日志可查，不留暗箱。

---

## 🤝 支委分工总览

```
条条（纵向，活动组织）          块块（横向，职能保障）
────────────────────          ────────────────────
第一党小组：储子禾（学术）      组织委员：侯嘉嵘
第二党小组：王峥旭（就业）      宣传委员：闫鑫岳
第三党小组：辛长乐（就业）      纪检委员：韩思宁
```

详细权责 → [支委与党小组定人定责定岗说明](./knowledge/SOP/支委与党小组定人定责定岗说明.md)
