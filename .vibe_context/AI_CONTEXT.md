# AI Context — GSM1921-SOP

## 1. System Architecture（九模块 ESM 分层架构）

> **[2026-03 架构升级]**：原单体 `src/main.js`（800+行）已全面拆分为 9 个 ES6 模块 + 2 个服务层文件，实现单一职责与 AI 代理精准上下文加载。

```
SOP Layer       knowledge/SOP/             制度母本，最高权威，所有变更起点
Workflow Layer  src/workflow/              ★ SOP 核心规则引擎（物理封装子目录）
                  index.js                桶文件：统一对外导出 instantiateSOP / sopDatabase
                  sopData.js              SOP 场景任务节点模板原始数据（物理隔离）
                  sop.js                  instantiateSOP() 将模板+t0展开为绝对日期任务数组
Domain Layer    src/constants.js           静态常量：ROLE_COLORS/ROLE_LABELS/ROLE_THEME_CLASS/ROLE_ORDER
                src/utils.js               通用工具：_fmtDate/_fmtChinese/showToast/_currentYearMonth
Service Layer   src/service.mock.js        CRUD + LocalStorage（唯一数据写入点）；SANDBOX_MODE 开关
                src/service.runtime.js     BranchService 出口，USE_MOCK 开关
State Layer     src/state.js               appState（immutable spread）+ setState(patch) + registerRenderCallback
Render Layer    src/calendar.js            renderCalendarByActivities / populateMonthSelector
                src/inspector.js           renderInspectorFromState / filterTasksByManagementRole
                src/events.js              setupEventListeners()——全量 DOM 事件绑定
Entry           src/main.js                initApp + renderUI（唯一 DOM 更新入口，约154行）
UI              index.html                 静态入口，<script type="module" src="./src/main.js">
```

**依赖方向（DAG，无环）**：`SOP → Data → Domain/Utils → Service → State → Render → Entry → UI`

**循环依赖破解**：`state.js` 暴露 `registerRenderCallback(fn)`，`main.js` 定义 `renderUI` 后主动注册，避免 `state.js` import `main.js` 产生循环。

**SANDBOX_MODE**：`service.mock.js` 顶部 `SANDBOX_MODE = true` 时，`loadDB()` 每次重载均返回初始 mock 数据（开发调试用）；设为 `false` 恢复 localStorage 持久化。

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

- **Plan-Before-Execution（先规划，再行动）【最高优先级】**：对于所有涉及 `src/main.js`、`src/domain.js` 或状态机逻辑的复杂修改，AI 必须在执行任何文件编辑前，先在对话框中输出完整的 `### Architecture Blueprint（架构蓝图）`，详述函数拆分方案与状态流转路径。严禁未经拆解直接暴力修改复杂函数。
- **Structure Immutable**：禁止新增顶层目录或重命名现有核心目录（`src/`, `knowledge/`, `.vibe_context/`）。
- **Service Layer Mutation**：所有运行时数据写操作必须经过 `src/service.*.js`，严禁 UI 层直接操作存储。
- **SOP Sovereignty**：`knowledge/SOP/` 制度文本优先于一切技术实现；domain.js Schema 必须与 SOP 保持同步。
- **Change Pipeline**：变更路径唯一 → SOP 修改 → domain.js 同步 → service 适配 → state 更新 → UI 渲染。
- **Binary Preservation**：`.pdf`, `.docx`, `.pptx`, `.xlsx` 为只读资产，禁止修改或转换，仅允许元数据读取与目录移动。
- **Single DOM Updater**：`renderUI(state)` 是唯一合法 DOM 更新入口，所有 UI 变更必须经此路径。
- **Data Privacy (数据隐私隔离)**：绝对禁止在 `src/*`（代码层）与 `index.html`（UI 渲染层）中硬编码真实的"人类姓名"。代码流转必须且只能使用角色标识符（Role ID / Role Name）。真人姓名仅允许存在于 `knowledge/SOP/` 之中。

## 4. File Access Permissions（文件访问白名单）

> ⚠️ 原 `FILE_ACCESS.md` 已于 2026-03-22 合并至本文件，原文件已物理删除。违反白名单的修改视为任务失败（TASK FAILURE）。

### 路由白名单

**Decoupled Governance Directories（AI 与人类均可读写）：**
- `governance/`：AI (Read/Write), Human (Read/Write)
- `backlog/`：AI (Read/Write), Human (Read/Write)
- `.vibe_context/logs/`：AI (Read/Write), Human (Read/Write)

| 路由标识 | 路由说明 | ✅ 允许修改 | ❌ 严禁修改 |
|---------|---------|------------|-----------|
| `ui_ux_dev` | UI 视觉开发 | `index.html`, `assets/*` | `src/*`, `knowledge/SOP/*`, `.vibe_context/*` |
| `core_logic_arch` | 核心逻辑与架构 | `src/*`（11 个 ESM 文件） | `index.html`, `knowledge/SOP/*`, `.vibe_context/*`（除 meta_audit 外） |
| `sop_data_sync` | SOP 数据同步 | `knowledge/SOP/*`, `src/workflow/sopData.js`, `src/workflow/sop.js` | `index.html`, `src/main.js`, `.vibe_context/*`（除 meta_audit 外） |
| `meta_audit_log` | 元审计与日志 | `.vibe_context/*` | 所有业务代码文件 |

### 通用铁律（所有路由均适用）

1. **纯静态环境**：100% 浏览器端运行。严禁引入 Node.js API（无 `fs`、无 `require`、无 `process`）。
2. **ESM 相对路径**：所有模块引用必须使用相对路径（如 `./src/main.js`），禁止根路径（`/src/...`）。
3. **禁止文件增殖**：不得在白名单之外创建任何新文件。
4. **禁止修改控制平面**：除 `meta_audit_log` 路由外，严禁修改 `.vibe_context/` 内的任何文件。
5. **DOM 保全红线**：`renderUI()` 只更新动态区域，严禁重写整个 DOM。`index.html` 的静态骨架与样式必须 100% 保持原样。

### 仓库结构不变性

- AI Agent 禁止创建新的根目录、重命名目录、跨层移动文件。
- 允许的修改范围仅限于**文件内容**。
- 若结构变更不可避免，必须：①提出迁移方案 ②说明架构影响 ③获得书记明确确认后方可执行。

### 白名单新文件清单（可合法创建）

| 文件路径 | 适用路由 | 说明 |
|---------|---------|------|
| `src/id.js` | `core_logic_arch` | UUID 发生器（已创建，v8.5） |
| `src/service.supabase.js` | `core_logic_arch` | 未来 Supabase 后端实现（预留） |
| `.vibe_context/SNAPSHOT_v<X>.<Y>_<YYYYMMDD>.md` | `meta_audit_log` | 系统快照（里程碑节点命名） |
| `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` | `meta_audit_log` | 月度执行日志（按月创建） |

### 二进制资产不变性（Binary Preservation）

扩展名为 `.pdf`、`.docx`、`.pptx`、`.xlsx` 的文件为**只读资产**，AI Agent 严禁修改、重写、摘要转换。
仅允许：读取元数据、移动至正确目录、在文档中引用。
