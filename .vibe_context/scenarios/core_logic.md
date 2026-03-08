**Purpose**: 管理领域模型、Schema 字段、Service 方法、状态机等核心业务逻辑变更。所有代码层改动必须追溯到 `knowledge/SOP/` 中的制度依据，Schema 字段必须有 `Source:` 注释锚点。

**Trigger**: 字段、schema、activity、task、数据结构、API、domain、service、状态机、STATE、renderUI、src/

**Allowed Files**: `src/*`（`src/domain.js`, `src/service.mock.js`, `src/service.runtime.js`, `src/main.js`, `src/id.js`）

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
