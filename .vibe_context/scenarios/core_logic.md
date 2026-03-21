**Purpose**: 管理领域模型、Schema 字段、Service 方法、状态机等核心业务逻辑变更。所有代码层改动必须追溯到 `knowledge/SOP/` 中的制度依据，Schema 字段必须有 `Source:` 注释锚点。

> **[2026-03 架构升级注记]**：状态机已全面模块化，不再是单体 `main.js`。核心业务逻辑分布如下：
> - **全局状态**：`src/state.js`（`appState` 不可变对象、`setState(patch)`、`registerRenderCallback` 循环依赖破解）
> - **检查器与任务过滤**：`src/inspector.js`（`renderInspectorFromState`、`renderInspectorList`、`renderInspectorDetail`、`filterTasksByManagementRole`）
> - **SOP 实例化引擎**：`src/sop.js`（`instantiateSOP(scenarioIds, t0DateStr)` 将模板展开为带绝对日期的任务数组）
> - **常量注册表**：`src/constants.js`（`ROLE_COLORS`、`ROLE_LABELS`、`ROLE_THEME_CLASS`、`ROLE_ORDER`、`COMMISSIONER_ROLES`）
> - **工具函数**：`src/utils.js`（`showToast`、`_fmtDate`、`_fmtChinese`、`_currentYearMonth`）
> - **启动与渲染协调**：`src/main.js`（`initApp`、`renderUI`——唯一 DOM 更新入口，约 154 行）

**Trigger**: 字段、schema、activity、task、数据结构、API、domain、service、状态机、STATE、renderUI、src/、state.js、inspector.js、sop.js、constants.js、utils.js

**Allowed Files**: `src/*`（`src/state.js`, `src/constants.js`, `src/utils.js`, `src/sopData.js`, `src/sop.js`, `src/calendar.js`, `src/inspector.js`, `src/events.js`, `src/main.js`, `src/service.mock.js`, `src/service.runtime.js`）

---

## Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | 新增 Schema 字段前必须先在 `knowledge/SOP/` 中建立对应 SOP 锚点；无 SOP 锚点的字段变更为 [FAILED] |
| C2 | `domain.js` 中每个具有业务语义的字段 MUST 有 `Source: knowledge/SOP/[file].md#[section]` 注释 |
| C3 | SOP 章节被删除/重命名时，`domain.js` 中的 `Source:` 指针必须同步更新，不得产生"断链 Dead Link" |
| C4 | `main.js` 只通过 `BranchService`（`service.runtime.js`）调用服务，禁止直接操作 `mockDB` |
| C5 | `appState` 不可变（须 spread 展开赋值）；`renderUI()` 是唯一 DOM 更新出口 |
| C6 | 修改前输出三要素声明：Detected Scenario / Allowed Scope / Modification Plan |

## SOP → Code 追溯验证（每次激活必须执行）

1. **更新 SOP**：确认 `knowledge/SOP/` 中制度文本已包含本次变更依据
2. **更新 `domain.js` 注释**：检查所有 `Source:` 指针仍指向有效 SOP 章节标题
3. **更新 Service**：`service.mock.js` 方法与 Schema 保持一致
4. **更新 `main.js`**：状态机与 Service 接口匹配

## Execution Steps

- [ ] 确认 SOP 已更新（`knowledge/SOP/` 相关文件 + `domain.js` Source 指针）
- [ ] 输出三要素声明（SOP change / Schema impact / Service impact）
- [ ] 修改 `src/` 目标文件
- [ ] 更新执行日志 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
