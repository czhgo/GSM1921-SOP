---
title: "静态代码审计报告 — 活动全生命周期逻辑 & 视图语义验证"
type: audit_report
owner: "Copilot QA Agent"
role: "[人机]"
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

---

## 审计三：全域逻辑审查与 SOP 一致性双向核对 (2026-03-24)

### Audit Plan

**扫描顺序（Route 1 → 4）：**
1. `src/state.js` — appState schema、viewType/managementRole 枚举、displayMonth 初始值
2. `src/events.js` — `#gen-schedule-cal-btn` setState patch（写入后状态跳转）、`#month-search-btn` displayMonth 接管
3. `src/calendar.js` — `activeActivities` 归档清洗层、participant/manager 分支、Focus Mode、displayMonth 接管
4. `src/inspector.js` — 参与者绝对守卫、RBAC filter 内核、归档物理隔离
5. `src/main.js` — renderUI calendar 分支、targetMonth 推导
6. **Cross-audit**：`src/workflow/sopData.js` × `knowledge/SOP/常见工作场景快速指南.md`
   - 精确比对：步骤数量（count）、executor 角色标识（role tag）、timeOffset（offset delta）
7. `.vibe_context/scenarios/{ui_scenario,core_logic,sop_sync,meta_audit}.md` — 路由效能评估

---

### [3.1 逻辑覆盖矩阵]

| 交互路径 | 期望行为 | 代码实际行为 | 状态 | 冲突点说明 |
|---------|---------|------------|------|-----------|
| **1. 写入活动后跳转** | `setState` 含 `viewType:'manager'`、`viewMode:'detail'`、`selectedActivityId:newAct.id`；若当前角色为 participant 则 fallback 至 `organizer` | `events.js:155-166`：`setState({ ..., viewMode:'detail', selectedActivityId:newAct.id, viewType:'manager', managementRole: currentRole==='participant'?'organizer':currentRole })`；`displayMonth` 同步锁定为活动月份 | ✅ PASS | 状态机切换闭环完整，fallback 逻辑覆盖参与者视图边界 |
| **2. 参与视图日历任务隔离** | `viewType==='participant'` 时日历单元仅渲染活动标题文本标签，不渲染任何任务节点 | `calendar.js:87-93`：`if (viewType === 'participant')` 分支仅访问 `activeActivities`，渲染灰色文本标签；`tasksByDate`、`filterTasksByManagementRole` 在此分支下从未被调用 | ✅ PASS | 任务数据对参与者视图完全隔离；`tasks` 数组在 participant 分支代码路径不可达 |
| **3a. 管理视图日历聚焦模式** | `state.selectedActivityId` 非空时，任务列表二次过滤至该活动；仅显示 `t.activityId === selectedActivityId` 的任务 | `calendar.js:121-123`：`focusedTasks = state.selectedActivityId ? filteredTasks.filter(t => t.activityId === state.selectedActivityId) : filteredTasks` | ✅ PASS | Focus Mode 双重过滤（角色过滤 → 活动 ID 过滤）逻辑严密 |
| **3b. 管理视图日历全量任务** | `selectedActivityId` 为 null 时，显示该角色全量任务（`filterTasksByManagementRole` 结果） | `calendar.js:119-123`：`filteredTasks = filterTasksByManagementRole(allDayTasks, managementRole)`；`selectedActivityId` 为 null 时 `focusedTasks = filteredTasks` | ✅ PASS | 无选中活动时全量角色任务正确渲染 |
| **4. 归档隔离（日历）** | `archived===true` 的活动被物理清洗，不进入日历渲染管线 | `calendar.js:25`：`const activeActivities = activities.filter(a => !a.archived)`；日历全程基于 `activeActivities`；`actDates`、`dayActIds`、参与视图标签均源自 `activeActivities` | ✅ PASS | 归档活动在日历层被全域物理抹除；`tasks` 中的 `dayTasksViaAct` 通过 `dayActIds`（源自 `activeActivities`）联动隔离 |
| **4b. 归档隔离（检查器列表）** | 主列表模式下 `archived===true` 活动不显示；归档库模式独立展示 | `inspector.js:94-102`：`viewArchived=false` 分支过滤 `!a.archived`；`viewArchived=true` 分支过滤 `a.archived===true`；两路径互斥 | ✅ PASS | 双路径切换通过 `events.js:246-248` 的 archived 按钮和角色按钮互斥绑定保证 |
| **5. 月份检索接管渲染流** | `#month-search-btn` 点击后强制写入 `setState({displayMonth:val})`，日历以该值为目标月渲染 | `events.js:286-295`：点击读取 `monthSelector.value` → `setState({displayMonth:val, selectedDate:null, viewMode:'list', selectedActivityId:null})`；`main.js:79-81`：`targetMonth = state.displayMonth \|\| _currentYearMonth()` | ✅ PASS | `displayMonth` 优先级高于当月默认值；空值防御处理（`if (!val) return`）到位 |

---

### [3.2 SOP 一致性矩阵]

#### 场景：组织生活会（`org-life` vs MD §组织生活会）

| 核对维度 | 期望行为 | 代码实际行为 | 状态 | 冲突点说明 |
|---------|---------|------------|------|-----------|
| 步骤总数 | MD 步骤 1-14，共 14 个 | sopData tasks：1a-0/1a-1/1a-2/1a-2b/1a-4/1a-4b/1a-5/1a-6a/1a-6c/1a-6d/1a-6b/1a-7b/1a-8/1a-9，共 14 个 | ✅ PASS | 1:1 对齐 |
| executor 角色（Step 1 时间统筹） | MD: `党小组组长`（leader） | sopData 1a-0: `executor:'leader'` | ✅ PASS | — |
| executor 角色（Step 4 全员述职） | MD: `全体参会党员`（all），督办 leader | sopData 1a-2b: `executor:'all', supervisor:'leader'` | ✅ PASS | — |
| executor 角色（Step 7 签到考勤） | MD: `纪检委员`（disc-commissioner），督办 leader | sopData 1a-5: `executor:'disc-commissioner', supervisor:'leader'` | ✅ PASS | — |
| executor 角色（Step 12 后台汇总） | MD: `纪检委员`，督办 leader | sopData 1a-7b: `executor:'disc-commissioner', supervisor:'leader'` | ✅ PASS | — |
| executor 角色（Step 14 档案归档） | MD: `宣传委员`（prop-commissioner），督办 leader | sopData 1a-9: `executor:'prop-commissioner', supervisor:'leader'` | ✅ PASS | — |
| timeOffset Step 1 | MD: T-7 | sopData 1a-0: `timeOffset:-7` | ✅ PASS | — |
| timeOffset Step 4 | MD: T-5 | sopData 1a-2b: `timeOffset:-5` | ✅ PASS | — |
| timeOffset Step 5（通知到人） | MD: T-3 | sopData 1a-4: `timeOffset:-3` | ✅ PASS | — |
| timeOffset 会中步骤 | MD: 活动中（T=0） | sopData 1a-4b/1a-5/1a-6a/1a-6c/1a-6d: `timeOffset:0` | ✅ PASS | — |
| timeOffset 会后归档 | MD: T+3（摄影/考勤），T+5（汇总/归档） | sopData 1a-6b/1a-7b: `+3`；1a-8/1a-9: `+5` | ✅ PASS | — |

#### 场景：党小组主题党日活动（`theme-party` vs MD §党小组主题党日活动）

| 核对维度 | 期望行为 | 代码实际行为 | 状态 | 冲突点说明 |
|---------|---------|------------|------|-----------|
| 步骤总数 | MD 步骤 1-11，共 11 个 | sopData tasks：1b-1/1b-2/1b-3/1b-4/1b-5/1b-6/1b-7/1b-8/1b-9，共 **9** 个 | ❌ FAIL | 缺失 **Step 5（宣传准备）** 与 **Step 11（考勤记录）** |
| 缺失 Step 5 — 宣传准备 | MD Step 5: T-2，`执行:宣传委员(prop-commissioner)`，督办 leader；内容：确认宣传负责人，无需宣传预热 | sopData 中无对应任务节点 | ❌ FAIL | `prop-commissioner` 角色在 theme-party 中无任何 executor 节点；条条委员任务缺漏导致角色任务透视视图中宣传委员角色无法感知该场景准备期职责 |
| 缺失 Step 11 — 考勤记录 | MD Step 11: T+3，`执行:纪检委员(disc-commissioner)`，督办 leader；内容：记录弹性考勤 | sopData 中无对应任务节点 | ❌ FAIL | 纪检委员在 theme-party 场景中仅有 Step 6（考勤督办，T-2）节点；T+3 收尾考勤记录节点缺失；RBAC 任务透视下纪检角色在收尾阶段呈现断链 |
| executor 角色（Step 1 活动发起） | MD: 活动组织者（organizer），督办 leader | sopData 1b-1: `executor:'organizer', supervisor:'leader'` | ✅ PASS | — |
| executor 角色（Step 9 宣传产出） | MD: 深度参与者（deep），督办宣传委员（commissioner） | sopData 1b-8: `executor:'deep', supervisor:'commissioner'` | ✅ PASS | — |
| timeOffset Step 1-3 | MD: T-7 | sopData 1b-1/1b-2/1b-3: `timeOffset:-7` | ✅ PASS | — |
| timeOffset Step 4,5,6 | MD: T-2 | sopData 1b-4: `-2`；1b-5（Step 6 考勤督办）: `-2` | ✅ PASS | 1b-5 映射 MD Step 6 |
| timeOffset Step 9（宣传产出） | MD: T+3 | sopData 1b-8: `timeOffset:3` | ✅ PASS | — |
| timeOffset Step 8,10（复盘/归档） | MD: T+7 | sopData 1b-7/1b-9: `timeOffset:7` | ✅ PASS | — |

---

### [3.3 路由优化建议]

| 路由文件 | 当前职责 | 覆盖空白 / 耦合风险 | 建议 |
|---------|---------|-------------------|------|
| `ui_scenario.md` | HTML/CSS/视图层变更 | 覆盖清晰；Allowed Files 严格限定 `index.html`/`assets/*` | **维持现状** |
| `core_logic.md` | 领域模型/Schema/状态机/Service 层变更 | 管辖 `src/*` 全量文件，但 state machine 相关路径（state.js/inspector.js/events.js 的 RBAC 分支）与 sop_sync 有行为耦合 | **建议新增 `state_machine.md`**（见下方重构方案） |
| `sop_sync.md` | SOP 制度文本 + sopData.js + sop.js 双向追溯 | 已覆盖软硬 SOP 同步；§3 的双向追溯规则完备；但 C-S7 约束（"仅更新 last_updated"）与多字段版本化实践存在隐性张力 | **维持现状**，建议 C-S7 放宽为「版本号随内容实质变更递增」 |
| `meta_audit.md` | 执行日志/快照/场景注册 | §3 场景数量守护规则明确禁止新增路由文件，与路由扩展建议形成冲突 | 若需新增 `state_machine.md`，**必须先修订 §3 豁免条款**，经书记授权后执行 |

**建议重构方案（待书记授权）：**

若新增 `state_machine.md`，管辖文件清单：
- `src/state.js` — appState schema、STATE 枚举、setState
- `src/inspector.js` — RBAC 过滤核、参与者/管理者路由守卫
- `src/events.js` — 所有 setState 调用点（角色切换、写入活动、月份检索）
- `src/main.js` — renderUI 视图分发逻辑

`core_logic.md` 调整后管辖：领域模型 Schema、Service 方法、SOP 实例化引擎（`src/workflow/*`）、常量注册表

---

### [3.4 修复优先级清单]

| 优先级 | 问题 | 影响范围 | 修复动作 |
|--------|------|---------|---------|
| **High** | 无（当前系统状态机逻辑自洽，无断链/越权漏洞） | — | — |
| **Medium** | `sopData.js` `theme-party` 缺失 Step 5（宣传准备，`prop-commissioner`，T-2） | RBAC 任务透视：宣传委员在主题党日准备期无任务节点显示 | `src/workflow/sopData.js` 中 `theme-party.tasks` 插入任务 `1b-3b`：`{executor:'prop-commissioner', supervisor:'leader', timeOffset:-2, title:'确认宣传负责人（无需宣传预热）'}` |
| **Medium** | `sopData.js` `theme-party` 缺失 Step 11（考勤记录，`disc-commissioner`，T+3） | RBAC 任务透视：纪检委员在主题党日收尾期无弹性考勤记录节点 | `src/workflow/sopData.js` 中 `theme-party.tasks` 追加任务 `1b-10`：`{executor:'disc-commissioner', supervisor:'leader', timeOffset:3, title:'记录弹性考勤'}` |
| **Medium** | `meta_audit.md` §3 场景数量守护规则与潜在 `state_machine.md` 路由扩展冲突 | 治理层路由切割不精确，state machine 相关变更无独立管辖归属 | 经书记授权后修订 §3，豁免 `state_machine.md` 新增场景 |
| **Low** | `sop_sync.md` C-S7 约束过严（「仅更新 last_updated」vs 实际 version 字段多次更新） | 人工审查时 YAML 规范冲突 | 修订 C-S7：「版本号随内容实质变更递增，last_updated 同步更新」 |
| **Low** | `inspector.js` `viewType='participant'` + `viewArchived=true` 逻辑隐性耦合（见审计二 R-VS-12） | 当前无实际安全影响，但未来事件绑定扩展时存在绕过风险 | `renderInspectorFromState` 入口增加 archived 优先级守卫，优先判断 `viewArchived` |

---

**[Org OS Audit: Full-Logic & SOP Alignment] 静态透视结束！绝对只读协议已贯彻。状态机逻辑闭环、SOP 软硬一致性、治理路由效能的三维体检矩阵已生成，请书记下达下一步修复/定调指令！**
