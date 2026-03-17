# AI Context — GSM1921-SOP

## 1. System Architecture（五层模型）

```
SOP Layer       knowledge/SOP/          制度母本，最高权威，所有变更起点
Domain Layer    src/domain.js           Schema / typedef / mockDB / can()
Service Layer   src/service.mock.js     CRUD + LocalStorage（唯一数据写入点）
                src/service.runtime.js  BranchService 出口，USE_MOCK 开关
State Layer     src/main.js             STATE 枚举，appState（immutable spread），setState()
UI Layer        index.html              renderUI(state) 唯一 DOM 驱动，禁止直接写 DOM
```

依赖方向（单向）：`SOP → Domain → Service → State → UI`

## 2. Scenario Routing（场景路由）

核心场景固定 4 个，优先级从左到右：

```
META_AUDIT → SOP_SYNC → CORE_LOGIC → UI_SCENARIO
```

| 场景 | Trigger 关键词 | Allowed Files |
|------|--------------|--------------|
| `scenarios/meta_audit.md` | AI规则、审计、日志、快照、场景注册 | `.vibe_context/*` |
| `scenarios/sop_sync.md` | 流程、制度、职责、SOP、YAML、frontmatter | `knowledge/SOP/*`, `src/domain.js` |
| `scenarios/core_logic.md` | 字段、schema、activity、task、数据结构、API | `src/*` |
| `scenarios/ui_scenario.md` | UI、页面、按钮、布局、样式 | `index.html`, `assets/*` |

**扩展场景注册规则**：新增场景须在本文件追加一行，在 `scenarios/` 下创建同名 `.md`，在当月执行日志中记录操作。

| 扩展场景文件 | Purpose | Trigger | Allowed Files | 登记日期 |
|------------|---------|---------|--------------|---------|
| （暂无） | | | | |

## 3. Core Rules（铁律）

- **Structure Immutable**：禁止新增顶层目录或重命名现有核心目录（`src/`, `knowledge/`, `.vibe_context/`）。
- **Service Layer Mutation**：所有运行时数据写操作必须经过 `src/service.*.js`，严禁 UI 层直接操作存储。
- **SOP Sovereignty**：`knowledge/SOP/` 制度文本优先于一切技术实现；domain.js Schema 必须与 SOP 保持同步。
- **Change Pipeline**：变更路径唯一 → SOP 修改 → domain.js 同步 → service 适配 → state 更新 → UI 渲染。
- **Binary Preservation**：`.pdf`, `.docx`, `.pptx`, `.xlsx` 为只读资产，禁止修改或转换，仅允许元数据读取与目录移动。
- **Single DOM Updater**：`renderUI(state)` 是唯一合法 DOM 更新入口，所有 UI 变更必须经此路径。
- **Data Privacy (数据隐私隔离)**：绝对禁止在 `src/*`（代码层）与 `index.html`（UI 渲染层）中硬编码真实的"人类姓名"。代码流转必须且只能使用角色标识符（Role ID / Role Name）。真人姓名仅允许存在于 `knowledge/SOP/` 之中。
