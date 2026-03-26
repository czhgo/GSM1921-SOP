**Purpose**: 管理所有与界面呈现相关的变更——HTML 结构、CSS 样式、Mermaid 图表视觉样式。UI 层是变更流水线的终点，只能被上游（SOP/Schema/Service）驱动，不可反向修改。

> **[2026-03 架构升级注记]**：UI 层已从单体 `index.html+main.js` 拆分为独立渲染模块，并引入 RBAC 双视图切换机制与归档库入口。
>
> **双视图切换逻辑**：
> - **👀 参与视图**（`viewType: 'participant'`）：侧边栏"👀 参与视图"按钮触发，`setState({ viewType:'participant' })`。检查器展示只读活动列表，卡片仅显示标题+状态；点击卡片弹出原生 DOM Modal（`_showParticipantModal`），不暴露执行者/督办者信息。
> - **⚙️ 管理视图**（`viewType: 'manager'`）：侧边栏四个角色按钮（组长/委员/组织者/深度参与）触发，`setState({ viewType:'manager', managementRole: '<role>' })`。检查器展示可操作的任务详情，支持状态切换（`<select>`）；任务卡片/标题按 `ROLE_THEME_CLASS[managementRole]` 应用对应颜色左边框（蓝/黄/红/绿）。
>
> **归档库入口**：侧边栏管理视图底部的"归档库"按钮，触发 `setState({ viewArchived: true, viewType: 'manager', viewMode: 'list' })`，检查器切换为归档模式——展示所有 `archived === true` 的活动，详情页所有 `<select>` 变为 `disabled`，"归档活动"按钮替换为"恢复活动"。点击任何角色按钮时自动重置 `viewArchived: false`。
>
> **渲染规则**：`renderUI(appState)` 是唯一合法 DOM 入口，由 `src/main.js` 持有；`src/calendar.js` 负责日历网格渲染；`src/inspector.js` 负责右侧面板渲染；`src/events.js` 负责全量事件绑定——三者均通过函数参数获取 `appState`，无直接 DOM 散写。

**Trigger**: UI、页面、按钮、布局、样式、体验、index.html、颜色、icon、动画、视觉、视图、归档库、双视图、参与视图、管理视图、RBAC、viewType、viewArchived

**Allowed Files**: `index.html`, `assets/*`

---

## Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | DOM 写操作须经由 `renderUI()` 唯一入口；禁止在 `main.js` 之外散落 `document.querySelector().innerHTML` 直写 |
| C2 | UI 变更前必须确认 Schema（`domain.js`）和 Service（`service.mock.js` / `service.runtime.js`）已更新 |
| C3 | Mermaid 图表颜色方案：蓝色=条条, 红色=块块, 绿色=起止节点 |
| C4 | 修改前输出三要素声明：Detected Scenario / Allowed Scope / Modification Plan |
| C5 | 禁止将英文指令、YAML 逻辑块或元注释写入 `index.html` 人类可见内容区 |

## Execution Steps

- [ ] 确认上游 SOP/Schema/Service 变更已完成（Change Pipeline 铁律）
- [ ] 输出三要素声明
- [ ] 仅修改 `index.html` / `assets/*`，不触碰 `src/`
- [ ] 更新执行日志 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
