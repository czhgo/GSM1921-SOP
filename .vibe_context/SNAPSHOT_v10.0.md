# 🛡️ v10.0 Architecture Evidence Pack

> **生成日期：** 2026-03-05  
> **生成角色：** Chief Architecture Auditor  
> **约束：** 只读提取，零代码修改，客观呈现，不掩盖缺陷

---

## §1 完整仓库文件树 (Repository Tree)

```
/
├── index.html                        # 静态入口，Apple Liquid Glass UI 骨架
├── 党徽.png                           # 静态资源
├── src/
│   ├── domain.js                     # 领域层：SCHEMA_VERSION、Activity/Task 类型定义、mockDB、can() ACL
│   ├── id.js                         # UUID 发生器（纯函数，Web Crypto API，无副作用）
│   ├── service.mock.js               # Mock 服务层：LocalStorage 持久化、CRUD、级联归档
│   ├── service.runtime.js            # 运行时插槽：USE_MOCK 开关，BranchService 暴露点
│   └── main.js                       # 状态机 + UI 驱动入口（SOP Database 内嵌，~710 行）
├── .vibe_context/
│   ├── FILE_ACCESS.md                # AI 路由白名单（路由/白名单/铁律）
│   ├── EXECUTION_LOG.md              # 日志导航索引（自 Session 18 起为索引，不追加正文）
│   ├── REVIEW_STATE.md               # 评审状态（每次 Session 追加一行）
│   ├── logs/
│   │   ├── 2026-02-EXECUTION_LOG.md  # 2026年2月执行日志（archived，Sessions 4–18）
│   │   └── 2026-03-EXECUTION_LOG.md  # 2026年3月执行日志（active，本文件所在 Session）
│   ├── scenarios/
│   │   ├── activity_rules_enforcement.md  # 场景路由：活动规则执行
│   │   ├── sop_restructuring.md           # 场景路由：SOP 重构
│   │   └── yaml_metadata_fix.md           # 场景路由：YAML 元数据修复
│   └── SNAPSHOT_v10.0.md             # 本文件
├── docs/
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md
│   └── 党支部管理与实务经验沉淀.md
├── REPO_ENTRYPOINT.md                # AI 代理唯一入口（3 行）
├── ARCHITECTURE.md                   # 核心架构说明 v10.0
├── SYSTEM_ROADMAP.md                 # 产品路线图 v10.0
├── CHEATSHEET.md                     # 快捷备忘单
├── START_HERE.md                     # 启动说明
├── README.md                         # 公开说明
├── 参考资料/                           # 党章、支部工作条例、党小组会记录等 PDF/DOCX
├── 活动复盘/                           # 复盘模板
├── 流程指南/                           # 各委员工作流程指南（宣传/组织/纪检等）
└── 申报材料模板/                        # 其他模板、宣传材料类、工作记录类
```

---

## §2 `REPO_ENTRYPOINT.md` 完整内容

```markdown
# Repository Entrypoint

> All AI agents must start with: 1. ARCHITECTURE.md, 2. SYSTEM_ROADMAP.md, 3. .vibe_context/FILE_ACCESS.md.
```

（全文共 3 行，无额外内容）

---

## §3 `ARCHITECTURE.md` 核心内容

### Core Runtime Flow（依赖链）

```
domain.js  →  service.mock.js  →  service.runtime.js  →  main.js (UI)
```

- `domain.js`：最底层，零外部依赖；定义 `SCHEMA_VERSION`、`Activity`/`Task` JSDoc typedef、`mockDB` 对象、`can()` ACL 函数。
- `service.mock.js`：依赖 `domain.js` + `id.js`；持有 `loadDB` / `saveDB` 持久化引擎和全部 CRUD；**禁止被 UI 直接调用**。
- `service.runtime.js`：依赖 `service.mock.js`；通过 `USE_MOCK` 布尔开关暴露 `BranchService`（当前为 `mockService` 全量透传）。
- `main.js`：**唯一** UI 层；仅通过 `BranchService` 调用服务；内嵌 `sopDatabase`（SOP 场景数据）；所有 DOM 写操作经由 `renderUI()` 唯一入口。

### Data Model

| 类型 | 定义位置 | 核心字段 |
|------|---------|---------|
| `Activity` | `src/domain.js` | `id`, `title`, `type`, `status`（draft/published/ongoing/completed）, `visibility`（branch/group）, `date`, `executor`, `supervisor`, `createdBy`, `createdAt`, `priority`, `dueDate`, `archived`, `domain`, `scenarioId`, `description`, `targetDate` |
| `Task` | `src/domain.js` | `id`, `activityId`, `title`, `status`（pending/in_progress/completed）, `createdAt` |
| `User` | `src/domain.js`（mockDB 静态） | `id`, `role`（secretary/org-commissioner/leader）, `name` |
| `Attendance` | `src/domain.js`（mockDB 静态结构） | `id`, `activityId`, `userId`, `status`（present/absent/leave）, `recordedBy`, `recordedAt` |

### Storage Model

- **引擎**：浏览器 `localStorage`
- **键名**：`workflowos_branch_db_v1`（含版本隔离后缀）
- **根结构**：`{ _schema: 1, users, activities, tasks, attendances }`
- **版本防御**：`loadDB()` 检查 `parsed._schema !== SCHEMA_VERSION` 时中止，`console.warn` 拒绝脏数据
- **注**：`users` 字段为静态预设，`loadDB()` 不从持久化存储恢复（代码注释明确说明）

---

## §4 `SYSTEM_ROADMAP.md` 完整内容

```markdown
# System Roadmap

> 光华管理学院本科生党支部 SOP 引擎 — 产品路线图 v10.0

## Phase 1 — Static OS（当前）
- 纯静态 GitHub Pages 部署
- 原生 ESM，无构建工具
- LocalStorage 持久化（`workflowos_branch_db_v1`）
- Mock 服务层模拟网络延迟与随机错误
- 状态机驱动 UI（STATE: IDLE / LOADING / SUBMITTING / SUCCESS / ERROR）
- Activity CRUD + 软删除归档（`archived`）
- 级联归档：归档 Activity 时自动将其下属 Task 设为 `completed`

## Phase 2 — Supabase Backend（规划）
- 接入 Supabase 后端（`service.supabase.js`）
- 将 `service.runtime.js` 中 `USE_MOCK` 切换为 `false`
- 用户认证（Supabase Auth）
- 实时同步（Supabase Realtime）
- 考察档案 ACL 隔离（仅支委可读写 `evaluation` 资源）

## Phase 3 — Workflow Engine（规划）
- 完整 Workflow 引擎：Task 自动实例化、状态流转、提醒推送
- `dueDate` 驱动的自动化提醒（基于 `priority` 分级）
- SOP 场景与 Activity/Task 的全链路绑定
- 数据导出与审计报告生成
```

---

## §5 `src/domain.js` 源码核心

### SCHEMA_VERSION

```js
export const SCHEMA_VERSION = 1;
```

### Activity JSDoc typedef（完整）

```js
/**
 * @typedef {Object} Activity
 * @property {string}  id
 * @property {string}  title
 * @property {string}  type
 * @property {'draft'|'published'|'ongoing'|'completed'} status
 * @property {'branch'|'group'} visibility
 * @property {string}  date        - ISO YYYY-MM-DD
 * @property {string}  executor
 * @property {string|null} supervisor
 * @property {string}  createdBy
 * @property {string}  createdAt   - ISO 字符串
 * @property {'low'|'normal'|'urgent'} [priority]
 * @property {string}  [dueDate]
 * @property {boolean} [archived]
 * @property {string}  [domain]    - 'activity' | 'organization'
 * @property {string}  [scenarioId]
 * @property {string}  [description]
 * @property {string}  [targetDate]
 */
```

### Task JSDoc typedef（完整）

```js
/**
 * @typedef {Object} Task
 * @property {string}  id
 * @property {string}  activityId
 * @property {string}  title
 * @property {'pending'|'in_progress'|'completed'} status
 * @property {string}  createdAt
 */
```

### mockDB 初始对象树

```js
export const mockDB = {
  _schema: SCHEMA_VERSION,          // = 1
  users: [
    { id: 'u_sec',  role: 'secretary',        name: '支部书记' },
    { id: 'u_org',  role: 'org-commissioner', name: '组织委员' },
    { id: 'u_exec', role: 'leader',            name: '党小组长' },
  ],
  /** @type {Activity[]} */
  activities: [],
  /** @type {Task[]} */
  tasks: [],
  /** @type {Array<{id,activityId,userId,status,recordedBy,recordedAt}>} */
  attendances: [],
};
```

---

## §6 `src/service.mock.js` 源码骨架

### 常量与私有辅助

```js
const MOCK_DELAY_MS = 600;
const STORAGE_KEY   = 'workflowos_branch_db_v1';
```

### `saveDB()` — 私有，序列化写入 localStorage

```js
function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _schema:     mockDB._schema,
      users:       mockDB.users,
      activities:  mockDB.activities,
      tasks:       mockDB.tasks,
      attendances: mockDB.attendances,
    }));
  } catch (e) { console.warn('[MockAdapter] saveDB 失败：', e); }
}
```

> ⚠️ **已知缺陷 DEFECT-01（🔴 高）**：`createActivity`、`updateActivity`、`deleteActivity` **均不调用 `saveDB()`**，写入后数据仅存于内存。刷新页面后 Activity 数据丢失。仅 `createTask` 与 `archiveActivity` 正确持久化。完整分析见 §10。

### `loadDB()` — 公开，含 Schema 版本拦截

```js
export function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // ── Schema 版本拦截 ──────────────────────────────────
    if (parsed._schema == null || parsed._schema !== SCHEMA_VERSION) {
      console.warn(`[MockAdapter] loadDB 中止：_schema 版本不匹配`);
      return;   // 拒绝脏数据，静默退出
    }
    if (Array.isArray(parsed.activities))  mockDB.activities  = parsed.activities;
    if (Array.isArray(parsed.tasks))       mockDB.tasks       = parsed.tasks;
    if (Array.isArray(parsed.attendances)) mockDB.attendances = parsed.attendances;
    // users 静态预设，不从持久化恢复
  } catch (e) { console.warn('[MockAdapter] loadDB 失败（JSON 解析错误）：', e); }
}
```

### `archiveActivity(id)` — 含级联 Task 操作

```js
export function archiveActivity(id) {
  return _withDelay(() => {
    _maybeError('archiveActivity');
    const idx = mockDB.activities.findIndex(a => a.id === id);
    if (idx === -1) throw Object.assign(new Error(`活动 ${id} 不存在`), { type: 'NotFoundError' });
    // 软删除（Immutable patch）
    const archived = { ...mockDB.activities[idx], archived: true };
    mockDB.activities = [
      ...mockDB.activities.slice(0, idx), archived, ...mockDB.activities.slice(idx + 1),
    ];
    // 级联归档：将下属 Task.status 设为 completed（消灭孤儿任务）
    mockDB.tasks = mockDB.tasks.map(t =>
      t.activityId === id && t.status !== 'completed' ? { ...t, status: 'completed' } : t
    );
    saveDB();   // ← 唯一主动调用 saveDB 的 Activity 操作
    return archived;
  });
}
```

### 其他 CRUD 接口签名

```js
// Activity
export function createActivity(data): Promise<Activity>   // Immutable push，不调用 saveDB
export function listActivities():    Promise<Activity[]>  // 只读，返回浅拷贝
export function updateActivity(id, patch): Promise<Activity> // Immutable patch，不调用 saveDB
export function deleteActivity(id):  Promise<{id:string}>  // Immutable filter，不调用 saveDB

// Task
export function createTask(data): Promise<Task>           // Immutable push，调用 saveDB
export function listTasks():      Promise<Task[]>          // 只读，返回浅拷贝
```

---

## §7 `src/main.js` 核心骨架

### STATE 枚举

```js
const STATE = {
  IDLE:       0,   // 就绪
  LOADING:    1,   // 页面加载活动列表（占位中）
  SUBMITTING: 2,   // 表单提交中（按钮 disabled）
  SUCCESS:    3,   // 操作成功，更新列表 + Toast
  ERROR:      4,   // 操作失败，恢复按钮 + Toast
};
```

### 全局状态 `appState`（Immutable，不可直接赋值字段）

```js
let appState = {
  // 服务层状态
  status:      STATE.IDLE,
  activities:  [],
  tasks:       [],
  error:       null,
  // UI 视图状态
  domain:      'activity',
  role:        'all',
  activeModule: 'calendar',
};
```

### 防竞态锁 `currentRequestId`

```js
let currentRequestId = 0;
// 使用方式：
//   const reqId = ++currentRequestId;
//   ... await BranchService.xxx() ...
//   if (reqId !== currentRequestId) return; // 过期请求，丢弃
```

### Immutable 状态更新 + 驱动渲染

```js
function setState(patch) {
  appState = { ...appState, ...patch };  // 展开符，不可变更新
  renderUI(appState);                    // 唯一 DOM 写入触发点
}
```

### 初始化入口签名

```js
// 启动生命周期（IIFE async）
(async function initApp() {
  BranchService.loadDB();                // 恢复 localStorage 持久化数据
  setState({ ..., status: STATE.LOADING });
  const [activities, tasks] = await Promise.all([
    BranchService.listActivities(),
    BranchService.listTasks(),           // v10.0 新增
  ]);
  setState({ status: STATE.IDLE, activities, tasks });
}());
```

### 渲染入口签名

```js
function renderUI(state) {
  // 1. 模块 Tab 激活态
  // 2. 侧边栏子菜单切换
  // 3. 主内容区模块切换
  // 4. 状态 Pill（反映 STATE 枚举）
  // 5. 仅 activeModule==='reference' 时：领域/角色按钮、场景标题、时间轴节点过滤
}
```

---

## §8 `localStorage` Schema 示例

**键名**：`workflowos_branch_db_v1`

```json
{
  "_schema": 1,
  "users": [
    { "id": "u_sec",  "role": "secretary",        "name": "支部书记" },
    { "id": "u_org",  "role": "org-commissioner", "name": "组织委员" },
    { "id": "u_exec", "role": "leader",           "name": "党小组长" }
  ],
  "activities": [
    {
      "id": "act_550e8400-e29b-41d4-a716-446655440000",
      "title": "org-life 排期",
      "domain": "activity",
      "scenarioId": "org-life",
      "date": "2026-03-10",
      "executor": "organizer",
      "createdBy": "u_exec",
      "status": "draft",
      "visibility": "group",
      "createdAt": "2026-03-05T09:00:00.000Z",
      "archived": false
    }
  ],
  "tasks": [
    {
      "id": "tsk_7c9e8b1a-1234-4abc-8def-000011112222",
      "activityId": "act_550e8400-e29b-41d4-a716-446655440000",
      "title": "确定会议主题",
      "status": "pending",
      "createdAt": "2026-03-05T09:00:01.000Z"
    }
  ],
  "attendances": []
}
```

> **注**：`users` 虽被序列化写入（`saveDB` 包含 `users` 字段），但 `loadDB` 不恢复 `users`，以防止运行时数据污染静态预设。

---

## §9 运行时数据流向 (Runtime Data Flow)

**场景：用户点击"生成排期"按钮（含新建活动）**

```
UI (index.html)
  └── [click] #gen-schedule-cal-btn
        │
        ▼
main.js :: initCalendarModule() 事件处理器
  ├── 防并发检查：if (appState.status === SUBMITTING|LOADING) return
  ├── 读取表单值：t0Input.value, scSelect.value
  ├── reqId = ++currentRequestId          ← 竞态锁自增
  ├── setState({ status: STATE.SUBMITTING })
  │     └── appState = { ...appState, status: SUBMITTING }
  │           └── renderUI(appState)      ← 更新 Pill 为"云端推演中…"，按钮 disabled
  │
  ▼
BranchService.createActivity(data)
  │   （BranchService = mockService，因 USE_MOCK=true）
  │
  ▼
service.runtime.js :: BranchService（透传至 mockService）
  │
  ▼
service.mock.js :: createActivity(data)
  ├── _withDelay(600ms)                   ← 模拟网络延迟
  ├── _maybeError()                       ← 10% 概率抛出 NetworkError / PermissionError
  ├── newItem = { ...data, id: generateId('act'), status:'draft', createdAt: now }
  ├── mockDB.activities = [...mockDB.activities, newItem]  ← Immutable 写入内存
  │   ⚠️  此处 **不调用 saveDB()**，数据仅存于内存
  └── return newItem
        │
        ▼ (Promise resolves)
main.js :: try 块
  ├── if (reqId !== currentRequestId) return   ← 过期请求保护
  ├── setState({ status: STATE.SUCCESS, activities: [...appState.activities] })
  │     └── renderUI()  ← 更新 Pill 为"已同步"
  └── showToast('success', '推演排期已生成，活动已记录。')
        │
        ▼
Toast 浮层（fixed 定位，2.5s 后自动销毁）

        ▼ (finally 块，无论成功/失败均执行)
  genBtn.disabled = false;  genBtn.textContent = '生成排期'
```

**关键持久化路径（createActivity 不持久化）：**

```
createTask()  ──→  mockDB.tasks.push(newTask)  ──→  saveDB()  ──→  localStorage
archiveActivity()  ──→  mockDB.activities[i].archived=true  +  tasks cascade  ──→  saveDB()  ──→  localStorage
```

---

## §10 架构自检 (Architecture Self-Check)

### ✅ 通过检查

| 检查项 | 结论 |
|--------|------|
| UI 是否绕过 Service 直接操作 `mockDB`？ | **否**。`main.js` 仅 `import { BranchService } from './service.runtime.js'`，不直接引用 `mockDB` 或 `service.mock.js`。`sopDatabase` 为 `main.js` 内嵌的 SOP 模板数据，与持久化 `mockDB` 完全隔离。 |
| `loadDB` 是否做了版本校验？ | **是**。`parsed._schema !== SCHEMA_VERSION` 时提前 `return`，拒绝脏数据，并 `console.warn` 记录。 |
| 状态更新是否全部经过 `setState`？ | **是**。所有 `appState` 变更均通过 `appState = {...appState, ...patch}` + `renderUI()` 串联。 |
| 直接 DOM 写操作是否被封闭？ | **是**。`renderUI()` 是唯一的 DOM 更新函数；`showToast()` 操作 fixed 浮层，不影响文档流。 |
| 竞态保护是否完整？ | **是**。`currentRequestId` 自增 + `if (reqId !== currentRequestId) return` 丢弃过期响应。 |

### ⚠️ 架构缺陷（客观呈现，不掩盖）

| 缺陷编号 | 严重等级 | 描述 | 影响范围 |
|---------|---------|------|---------|
| **DEFECT-01** | 🔴 高 | `createActivity`、`updateActivity`、`deleteActivity` 均 **未调用 `saveDB()`**。写入仅存于内存，刷新页面后丢失。仅 `createTask` 和 `archiveActivity` 正确调用了 `saveDB()`。 | 用户新建/编辑/删除 Activity 后刷新页面，数据丢失。 |
| **DEFECT-02** | 🟡 中 | `main.js` 中 `initApp()` 的 `loadDB()` 调用有容错包裹，但 `BranchService.loadDB` 并未在 `service.runtime.js` 显式重新暴露——当前仅因 `mockService` 全量透传而可用。若切换后端后忘记实现 `loadDB`，`notImplemented` Proxy 会静默失败（被 `try-catch` 吞掉），不会阻塞初始化，但也不会恢复数据。 | 后端切换时的隐性风险。 |
| **DEFECT-03** | 🟡 中 | `ARCHITECTURE.md` 的 `Dependency Chain` 仅列出四层，未说明 `id.js` 的位置（`id.js` 被 `service.mock.js` 依赖，属于 `domain.js` 的平行层）。文档与代码实际结构存在轻微偏差。 | 文档误导性。 |
| **DEFECT-04** | 🟢 低 | `saveDB()` 序列化时包含 `users` 字段，但 `loadDB()` 不恢复 `users`。文件注释已说明原因，但 `saveDB` 写入 `users` 属于无效序列化，浪费存储空间。 | 存储冗余，无功能影响。 |
| **DEFECT-05** | 🟢 低 | `_maybeError()` 使用 `Math.random()` 模拟错误，在自动化测试或 CI 环境中将产生不可重现的随机失败。当前无测试基础设施，风险暂时可控。 | 未来测试可靠性风险。 |

---

*本 Evidence Pack 由 Chief Architecture Auditor 角色自动生成，内容为代码与文档的客观提取，不含任何建议或修改指令。*
