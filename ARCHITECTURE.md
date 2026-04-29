# Architecture

&gt; 光华管理学院本科生党支部 SOP 引擎 — 核心架构说明 v11.0

## Canonical Authority Rule

The institutional source of truth of this system is:
`knowledge/SOP/*`

All application logic, schema definitions, and UI behavior must derive from the SOP documents.

**Modification order:**
SOP → Workflow Layer → Service Logic → State Layer → UI Layer

*AI Agent Directive: Do not bypass the institutional layer. Any feature request or UI modification must be backed by a corresponding SOP rule change first.*

## Repository Structure

```
/
├── index.html                  # 静态入口，Liquid Glass UI 骨架，100% 保持原样
├── src/
│   ├── workflow/               # ★ SOP 核心规则引擎（物理封装子目录）
│   │   ├── index.js            # 桶文件（Barrel）：统一对外导出
│   │   ├── sopData.js          # SOP 场景任务节点模板原始数据
│   │   └── sop.js              # SOP 实例化：日期展开与计算逻辑
│   ├── constants.js            # 静态常量：角色颜色、标签、主题
│   ├── utils.js                # 通用工具：日期格式化、中文格式化、Toast提示
│   ├── state.js                # 全局状态中心：appState + setState + registerRenderCallback
│   ├── calendar.js             # 日历渲染引擎
│   ├── inspector.js            # 检查器面板：任务列表与详情
│   ├── events.js               # 全量 DOM 事件绑定
│   ├── main.js                 # 启动入口 + 渲染协调（唯一 DOM 更新入口）
│   ├── id.js                   # UUID 发生器（纯函数，无副作用）
│   ├── service.mock.js         # Mock 服务层（LocalStorage 持久化，级联归档）
│   ├── service.runtime.js      # 运行时插槽（USE_MOCK 开关，未来接 Supabase）
│   └── styles.css              # 样式文件
├── .vibe_context/
│   ├── AI_CONTEXT.md           # AI 行为规则（所有 AI 必读）
│   ├── REVIEW_STATE.md         # 评审状态
│   ├── SNAPSHOT_v*.md          # 系统快照
│   ├── logs/                   # 月度执行日志
│   │   └── EXECUTION_LOG_INDEX.md  # 日志索引（月度文件导航表）
│   └── scenarios/              # 场景路由定义
├── AI_ENTRYPOINT.md            # AI 代理唯一入口
├── ARCHITECTURE.md             # 本文件
└── SYSTEM_ROADMAP.md           # 产品路线图
```

## Data Model

### Activity（活动）
数据结构定义于 `src/service.mock.js`。核心字段：
- `id` — 唯一标识符（`id.js` 生成）
- `title`, `type`, `status`, `visibility`, `date`
- `executor`, `supervisor`, `createdBy`, `createdAt`
- `priority` — `'low' | 'normal' | 'urgent'`（工作流优先级）
- `dueDate` — 截止日期 ISO 字符串（自动化提醒锚点）
- `archived` — 软删除标记（`true` 表示已归档）
- `hostGroup` — 承办党小组（'group1' | 'group2' | 'group3' | null）

### Task（任务）
数据结构定义于 `src/service.mock.js`。核心字段：
- `id`, `activityId`, `title`, `status`
- `createdAt` — 创建时间 ISO 字符串（审计字段）

### Storage Model
- **键名**：`workflowos_branch_db_v1`（`localStorage`）
- **根结构**：`{ _schema: SCHEMA_VERSION, users, activities, tasks, attendances }`
- **版本防御**：`loadDB()` 检查 `_schema !== SCHEMA_VERSION` 时拒绝脏数据并 `console.warn`

## Dependency Chain

```
knowledge/SOP/ → src/workflow/ → constants/utils → service layer → state → render → main.js → UI
```

所有 mutation 必须经过 Service 层；UI 层禁止直接操作 `mockDB`。

## Data Mutation Rule

**All data mutations must pass through the service layer.**

**Forbidden operations (outside Service Layer):**
- `mockDB` direct mutation (e.g., `.push()`, direct assignment)
- `localStorage` direct write (`localStorage.setItem`)

**Allowed write operations (via API):**
- `BranchService.createActivity()`
- `BranchService.updateActivity()`
- `BranchService.archiveActivity()`
- `BranchService.createTask()`
- `BranchService.toggleTaskStatus()`

**Read Operations Exception:**
To avoid over-restriction and ensure rendering performance, read operations (list, get) may read from `mockDB` directly (e.g., via exported `mockDB` object), but service-layer access (`BranchService.listActivities()`) is preferred for strict consistency.

## System Change Pipeline (Strict Order)

All system modifications MUST follow this one-way waterfall execution flow:
1. Update SOP (Modify the canonical Markdown documents first)
2. Update Workflow Layer (Sync task templates and logic in `src/workflow/`)
3. Update Service Logic (Modify API and persistence validation if needed)
4. Update State/Render Layers (Adjust state management and UI rendering)
5. Update UI (Render the final changes)

**Change Trace Protocol:**
Before modifying Service or UI layers, AI MUST output a `Change Trace` in the chat:
- SOP change: `knowledge/SOP/[file_name].md#[section]`
- Workflow impact: `[e.g., src/workflow/sopData.js#SCENARIO]`
- Service impact: `[e.g., updateActivity validation]`

**[Checkpoint 6]** AI MUST verify and explicitly confirm:
1. SOP has been updated.
2. Workflow Layer is synchronized.

*Failure to confirm halts the pipeline. UI/Service modifications are FORBIDDEN until SOP/Workflow are aligned.*

## Hosting

GitHub Pages 纯静态托管，原生 ESM，无构建工具，无 Node.js API。
