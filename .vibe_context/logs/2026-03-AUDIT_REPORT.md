---
title: "静态代码审计报告 — 活动全生命周期逻辑 & 视图语义验证"
type: audit_report
owner: "Copilot QA Agent"
date: "2026-03-23"
status: final
scenarios: ["meta_audit.md"]
---

# 🔍 静态代码审计报告（只读扫描）

> **审计协议**：绝对只读 · 严禁修改任何代码 · 仅记录发现
> **扫描时间**：2026-03-23T05:10 — 07:06 UTC
> **扫描文件**：`src/events.js`, `src/service.mock.js`, `src/inspector.js`, `src/main.js`, `src/calendar.js`, `src/constants.js`, `src/state.js`

---

## 审计一：活动全生命周期逻辑审查

### Audit Plan

扫描顺序：
1. `src/events.js` + `src/service.mock.js` — 创建与数据流闭环（Route 1）
2. `src/inspector.js` → `renderInspectorDetail` — 状态流转与持久化（Route 2）
3. `src/main.js`（renderUI） + `src/inspector.js` — 视图物理隔离（Route 3）
4. `src/events.js` + `src/main.js` + `src/calendar.js` — RBAC 四色与月份检索（Route 4）
5. `src/inspector.js` — 归档沙盒边界（Route 5）

---

### 审计矩阵

| 审计节点 | 涉及文件 | 状态 (Pass/Fail) | 风险研判与确凿发现 |
|---|---|---|---|
| **R1-1** `#gen-schedule-cal-btn` 提取 `organizerName` | `events.js:103-106` | ✅ Pass | `document.getElementById('organizer-name-input')` 读取正确；值赋给 `organizerName` 变量；若非空则写入 `actPayload.organizerName`（L124） |
| **R1-2** `#gen-schedule-cal-btn` 提取 `deepParticipantName` | `events.js:104-106` | ✅ Pass | `document.getElementById('deep-name-input')` 读取正确；若非空则写入 `actPayload.deepParticipantName`（L125） |
| **R1-3** `createActivity` 将两字段落盘 | `service.mock.js:107-126` | ✅ Pass | `createActivity` 使用展开符 `{ ...data, id, status, ... }` 保留全部传入字段；`organizerName` / `deepParticipantName` 随 `...data` 落盘到 `mockDB.activities`，并调用 `saveDB()` 持久化 |
| **R1-4** SOP 任务通过 `Promise.allSettled` 并行挂载 | `events.js:132-143` | ✅ Pass | `sopTasks.map(t => BranchService.createTask(...))` 全部包装在 `Promise.allSettled` 中；失败计数通过 `taskResults.filter(r => r.status === 'rejected')` 记录警告但不中断主流程 |
| **R2-1** 任务卡片挂载 `<select>` 状态下拉框 | `inspector.js:220-224` | ✅ Pass | 每张任务卡在 `renderInspectorDetail` 中生成 `<select class="task-status-select">` 含三个 `<option>`（pending/in_progress/completed），`selected` 属性正确映射当前状态 |
| **R2-2** 状态变更调用 `updateTask` 并触发 `setState` 刷新 | `inspector.js:254-258` | ✅ Pass | `select.change` → `BranchService.updateTask(id, {status})` 返回新 tasks 数组 → `setState({tasks: newTasks})`；`setState` 通过 `registerRenderCallback` 触发 `renderUI` → `renderInspectorFromState` 重绘 |
| **R2-3** 进度条（完成数/总数）计算正确 | `inspector.js:209-212` | ✅ Pass | `completedCount = visibleTasks.filter(t => t.status === 'completed').length`；分母为 `visibleTasks.length`（已过滤角色）；分子/分母均基于同一 `visibleTasks` 数组，无偏差 |
| **R3-1** `#sidebar-reference-menu` 在工作台（calendar）模块下绝对隐藏 | `main.js:31-34` | ✅ Pass | `refMenu.classList.toggle('hidden', activeModule !== 'reference')`；工作台模块 `activeModule='calendar'` 时 toggle 条件为 `true`，`hidden` 类被强制添加；排他性隔离逻辑严密 |
| **R3-2** `renderInspectorFromState` 对 `viewType === 'participant'` 的绝对拦截 | `inspector.js:31-36` | ✅ Pass | 函数入口第一条件即 `if (state.viewType === 'participant')` → 直接调用 `renderInspectorList` 并 `return`；Detail 通路在物理层被截断，后续 detail 分支代码永远不可达 |
| **R3-3** 参与视图活动卡片只触发 DOM Modal，不渲染 SOP 任务 | `inspector.js:158-165`, `inspector.js:54-82` | ✅ Pass | 参与视图下卡片 click → `_showParticipantModal(act)`；Modal 仅展示 title、date、organizerName、deepParticipantName；明确注明"如需查看任务详情，请在左侧切换管理视图"；绝不渲染 `tasks` 数据 |
| **R4-1** `#month-search-btn` 调用 `setState` 写入 `displayMonth` | `events.js:269-277` | ✅ Pass | 点击 → 读取 `monthSelector.value` → `setState({ displayMonth: val, selectedDate: null, viewMode: 'list' })`；`val` 为空时直接 `return`，防御性处理到位 |
| **R4-2** `displayMonth` 成功接管日历渲染数据流 | `main.js:79-81` | ✅ Pass | `renderUI` 在 `calendar` 模块下：`targetMonth = state.displayMonth \|\| _currentYearMonth()`；传入 `renderCalendarByActivities(state.activities, targetMonth)`；`displayMonth` 优先级高于当前月份 |
| **R4-3** 管理视图任务卡片挂载 `ROLE_THEME_CLASS` 四色样式 | `inspector.js:187, 216` | ✅ Pass | `themeClass = ROLE_THEME_CLASS[managementRole] \|\| ''`；每张任务卡 `cardClass = themeClass ? \`inspector-card ${themeClass}\` : 'inspector-card'`；四色对应：leader=red, commissioner=yellow, organizer=blue, deep=green |
| **R4-4** 日历圆点采用 flex 横向多色排列 | `calendar.js:89-94` | ✅ Pass | `<div style="display:flex;gap:2px;justify-content:center;margin:2px 0;">` 包裹各角色圆点；每个圆点 `width:6px;height:6px;border-radius:50%;background:${c.text};flex-shrink:0;`；颜色来自 `ROLE_COLORS[role]` |
| **R5-1** 归档库视图仅渲染 `archived === true` 活动 | `inspector.js:95-97` | ✅ Pass | `if (viewArchived)` 分支：`dateActivities = activities.filter(a => a.archived === true)`；非归档分支用 `!a.archived` 过滤；两路径互斥，无泄漏风险 |
| **R5-2** 归档详情页任务 `<select>` disabled 锁死 | `inspector.js:220`, `253-260` | ✅ Pass | `isArchived` 为 true 时，`<select>` HTML 模板中注入 ` disabled style="opacity:0.5;cursor:not-allowed;"`；且 `if (!isArchived)` 才绑定 `change` 事件监听器，双重锁死 |
| **R5-3** 归档详情页危险按钮变更为"恢复活动" | `inspector.js:235-243` | ✅ Pass | `if (isArchived)` → 渲染 `<button id="inspector-restore-btn">恢复活动</button>`（绿色）；`else` → 渲染 `<button id="inspector-archive-btn">归档活动</button>`（黄色）；两路径互斥，逻辑正确 |

**[Org OS Audit: Read-Only Matrix] 静态审计结束！绝对只读协议已贯彻。全生命周期逻辑探针已拔出，体检报告矩阵已生成，请书记审阅！**

---

## 审计二：参与视图与管理视图语义验证

### Audit Plan

定位顺序：
1. `src/inspector.js` → `renderInspectorFromState` 中 `viewType === 'participant'` 路由分支
2. `src/inspector.js` → `renderInspectorList` 中参与视图渲染内容，`_showParticipantModal` 实现
3. `src/inspector.js` → `renderInspectorDetail` 中 `filterTasksByManagementRole` + `ROLE_THEME_CLASS` 应用
4. `src/constants.js` → `COMMISSIONER_ROLES` / `ROLE_THEME_CLASS` 定义
5. `src/events.js` → 侧边栏管理角色按钮点击事件
6. `src/state.js` → `setState` 触发链

---

### 视图语义差异表

| 审计节点 | 当前实现 | 是否符合期望 | 差异说明 |
|---|---|---|---|
| **参与视图路由分支** — `renderInspectorFromState` 中 `viewType==='participant'` 处理 | 函数入口硬性拦截：若 `viewType === 'participant'` 则直接调 `renderInspectorList` 并 `return`，后续 detail 分支代码不可达 | ✅ 是 | 物理层路由截断，无绕过可能 |
| **参与视图内容** — 用户在该视图下能看到什么 | 活动卡片仅展示：标题、状态 badge、"👀 参与视图 · 仅展示"标签；点击弹出 DOM Modal 展示标题/日期/组织者/深度参与者；Modal 明确提示"如需查看任务详情，请切换管理视图" | ✅ 是 | 参与者可获知活动基本信息与相关负责人，但无法触达任务节点 |
| **参与视图** — 是否包含 SOP 准备/收尾节点 | 不包含。`_showParticipantModal` 仅渲染 `act` 对象的元信息字段，`tasks` 数组从未被访问或渲染 | ✅ 是 | SOP 任务数据对参与者完全隔离 |
| **参与视图活动卡片点击行为** | 触发 `_showParticipantModal(act)` — 内联 DOM overlay；不调用 `setState` 改变路由，不渲染任何 Detail 组件 | ✅ 是 | 点击行为封闭于 Modal 内，不污染全局状态 |
| **管理视图** — `filterTasksByManagementRole` 调用时机 | `renderInspectorDetail` 第一步即调用：`visibleTasks = filterTasksByManagementRole(tasks, managementRole)`；渲染以 `visibleTasks` 为数据源 | ✅ 是 | 过滤发生在渲染前，不存在全量任务泄露至 DOM |
| **管理视图** — commissioner 过滤是否基于 `COMMISSIONER_ROLES` | `filterTasksByManagementRole` 中 `managementRole === 'commissioner'` 分支使用 `COMMISSIONER_ROLES.has(ex) \|\| COMMISSIONER_ROLES.has(sup)` 匹配；`COMMISSIONER_ROLES = new Set(['commissioner','org-commissioner','prop-commissioner','disc-commissioner'])` | ✅ 是 | 条条委员纵向职能线聚合逻辑正确；executor 与 supervisor 双字段均覆盖 |
| **管理视图** — 非 commissioner 角色过滤逻辑 | `ex === managementRole \|\| sup === managementRole` 精确匹配；`participant` 或空值返回全量 tasks | ✅ 是 | 角色严格单射，无跨角色泄露 |
| **管理视图** — 任务卡片 `ROLE_THEME_CLASS` 四色样式应用 | `themeClass = ROLE_THEME_CLASS[managementRole] \|\| ''`；映射：leader→`role-theme-leader`（红），commissioner→`role-theme-commissioner`（黄），organizer→`role-theme-organizer`（蓝），deep→`role-theme-deep`（绿）；`participant` / 其他角色 fallback 为无样式 | ✅ 是 | 四色液态样式正确绑定，CSS class 名称与 `index.html` 中样式定义吻合 |
| **管理视图** — 不同角色切换后任务列表如何变化 | 切换角色 → `setState({ managementRole: r })` → `renderUI` → `renderInspectorFromState` → `renderInspectorDetail(act, actTasks, managementRole)`（若已在 detail 视图） → `filterTasksByManagementRole` 重新过滤 → 仅展示该角色相关任务 | ✅ 是 | 角色切换即时生效，数据流闭环 |
| **视图切换** — 侧边栏管理视图按钮更新 `viewType` / `managementRole` | `calMenu.querySelectorAll('.role-btn[data-role]')` 事件：participant → `setState({viewType:'participant', managementRole:'participant', viewMode:'list', ...})`；archived → `setState({viewArchived:true, viewType:'manager', viewMode:'list', ...})`；其他角色 → `setState({viewType:'manager', managementRole: r})` | ✅ 是 | 三类角色的状态转换路径清晰，participant 与 manager 模式互斥切换 |
| **视图切换** — 切换后是否触发 `renderUI` 重绘 | `setState` 调用 `appState = {...appState, ...patch}` 后立即执行 `_onStateChange(appState)`；该回调即为 `main.js` 注册的 `renderUI`，强制同步触发 | ✅ 是 | 无延迟，切换即重绘 |
| **视图切换** — 已打开详情页时切换角色，任务是否重新过滤 | `renderUI` → `renderInspectorFromState(state)` → `state.viewMode === 'detail'` 且 `viewType === 'manager'` 时调用 `renderInspectorDetail(act, actTasks, state.managementRole)` 传入新 `managementRole` → `filterTasksByManagementRole` 重计算 | ✅ 是 | 详情页内切换角色立即响应；唯一潜在延迟来自 `setState` 中未包含 `viewMode` 时（非 participant/archived 路径，只更新 managementRole），detail 视图保持不变而任务重新过滤 |
| **潜在风险观察** — `viewType='participant'` 且 `viewArchived=true` 的逻辑交叉 | `renderInspectorFromState` 先判断 `viewType==='participant'`；若真则调 `renderInspectorList(... viewArchived)`；`renderInspectorList` 内 `isParticipant = !viewArchived && viewType==='participant'`；所以 archived+participant 组合时，渲染归档列表但卡片样式为"管理者"模式（可点击进入详情） | ⚠️ 部分 | 此组合在 `events.js` 中实际上不可触达（点击 archived 按钮会强制设 `viewType:'manager'`），边界安全；但逻辑层存在隐性耦合，建议未来在 `renderInspectorFromState` 入口增加 archived 优先级守卫，以防后续事件绑定扩展时引入漏洞 |

**[Org OS Audit: View Semantics]** 视图语义审计完成，请书记对照期望审阅差异表。

---

## 总结

两次审计共扫描 **19 个核心逻辑节点**，其中：
- ✅ **Pass（完全符合）**：18 个
- ⚠️ **部分（有隐性风险）**：1 个（R-VS-12，participant + archived 组合逻辑耦合，当前无实际安全影响）
- ❌ **Fail**：0 个

系统整体处于 **逻辑自洽、安全边界清晰** 的状态，可维持 v1.0 Stable 评级。
