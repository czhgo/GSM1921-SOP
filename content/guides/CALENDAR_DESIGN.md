---
role: "[人机]"
---

# 日历功能规划设计文档

> **文档类型**：技术规划 | **最后更新**：2026-05-06 | **关联文件**：`docs/src/calendar.js`、`docs/src/inspector.js`、`docs/src/state.js`
> **⚠️ 架构状态说明**：本文档记录日历功能的前瞻性规划蓝图。关于日历视图范围限定（仅对参与者/组织者/书记/组长展示，条条支委不展示日历）的已落地规则，请参阅 [SOP_WEB_GUIDE.md §B.4](./SOP_WEB_GUIDE.md#b4-日历视图范围限定)。

---

## 1. 日历多视图展示逻辑

### 1.1 当前现状

当前日历实现位于 [calendar.js](file:///d:/GitHub/GSM1921-SOP/src/calendar.js)，`renderCalendarByActivities()` 函数硬编码为**月视图表格布局**：

- 使用 CSS Grid `grid-template-columns: repeat(7, 1fr)` 构建 7 列网格
- 每行代表一周，空白填充由 `firstDow`（当月首日是周几）计算偏移
- 单元格高度由 `cal-cell-large` 类的 `min-height: 8rem` 控制
- 不存在周视图、日视图、列表视图的切换逻辑
- `appState.viewMode` 目前仅有 `'list'` 和 `'detail'` 两个取值，分别对应检查器面板的列表/详情态，而非日历本身的视图模式

### 1.2 视图切换架构设计

#### 1.2.1 需要新增的状态字段

```javascript
// 在 state.js 的 appState 中新增
calendarView: 'month',  // 'month' | 'week' | 'day' | 'list'
// 替代当前 viewMode 的部分语义：
//   'list' 原意为「点击日期后展示该日 Activity 列表」→ 更名为 inspectorMode
//   'detail' 保持不变，仍用于检查器的详情视图
```

#### 1.2.2 月视图（month）

- **保持现有实现**，CSS Grid 7 列布局
- 每个单元格显示：日期数字 + 最多 3 个任务标签 + "+N 项任务"折叠
- 单元格高度自适应，建议维持 `min-height: 6rem`（桌面端）/ `min-height: 4.5rem`（移动端）
- 月视图下角色筛选逻辑沿用现有方案：根据 `viewType`（`participant` / `manager`）渲染不同的单元格内容

#### 1.2.3 周视图（week）

- 7 列布局（周一到周日），每列宽度均分
- 列高度扩展至父容器可用高度（`height: 100%` 或固定像素值），提供更大的任务展示空间
- 每列顶部标注日期和星期，下方按时间顺序（由 `timeOffset` 字段驱动）排列当日任务
- 当前周高亮显示，可通过左右箭头切换至上一周/下一周
- 日期头显示完整日期格式（如"5月12日 周一"），点击日期头可切换至日视图
- 任务展示上限放宽至 8 个，超出折叠

#### 1.2.4 日视图（day）

- 单列全高布局，左侧时间轴（可选：按小时刻度），右侧任务卡片流
- 任务卡片按 `timeOffset` 排序，标注具体时间锚点（如"T-7 天"、"T=0 活动日"、"T+3 天"）
- 每个任务卡片展示完整信息：标题、执行角色、督办人、状态
- 适合重度管理场景：党支书/条条支委需要审视单日活动全貌

#### 1.2.5 列表视图（list）

- 放弃日历网格，改为扁平列表
- 排序规则：日期降序（最近的在前），同日期内按 `timeOffset` 升序
- 每行展示：日期、活动名称、关联任务数、状态标签
- 支持关键词搜索过滤（前端内存过滤，不涉及后端）
- 适合快速浏览和移动端场景

### 1.3 各视图下的数据筛选规则

| 筛选维度 | 月视图 | 周视图 | 日视图 | 列表视图 |
|---------|--------|--------|--------|---------|
| 按角色 | 单元格内任务过滤（`filterTasksByManagementRole`） | 同月视图 | 同月视图 | 全局任务过滤 |
| 按场景域 | 活动级过滤（仅显示匹配 `scenarioId` 的活动） | 同月视图 | 同月视图 | 同月视图 |
| 按时间范围 | 当月活动 | 当周活动 | 当日活动 | 全部活动（可选日期范围过滤） |
| 按归档状态 | 排除已归档 | 排除已归档 | 排除已归档 | 排除已归档（归档库独立入口） |

**筛选优先级**：角色 > 场景域 > 时间范围。即先确定角色可见性，再缩小到场景域，最后限定时间窗口。这是为了确保数据安全性优先于展示便利性。

### 1.4 视图切换时的状态保持策略

视图切换是一个高频操作，状态保持至关重要：

1. **保留 `selectedDate`**：从月视图切换到周视图时，保持当前选中的日期不变，周视图自动定位到包含该日期的周
2. **保留 `selectedActivityId`**：切换到日视图时，若此前在检查器面板选中了某个活动，日视图应高亮该活动的任务卡片
3. **保留 `displayMonth`**：月视图和周视图共享此字段，确保前后一致
4. **重置滚动位置**：视图切换后滚动到当前日期/当前周所在位置
5. **URL Hash 同步（可选增强）**：将 `calendarView` + `displayMonth` + `selectedDate` 写入 URL hash，实现浏览器前进/后退支持。格式示例：`#calendar/month/2026-05/2026-05-02`

---

## 2. 文本溢出处理策略

### 2.1 当前现状

- [calendar.js L88-L92](file:///d:/GitHub/GSM1921-SOP/src/calendar.js#L88-L92)：参与者视图使用 `truncate` CSS 类（`overflow: hidden; white-space: nowrap; text-overflow: ellipsis`）实现单行截断
- [styles.css L743-L757](file:///d:/GitHub/GSM1921-SOP/src/styles.css#L743-L757)：`.cal-task-tag` 同样使用 `white-space: nowrap; text-overflow: ellipsis` 单行截断
- 截断触发无字符数硬限制，完全依赖 CSS 容器宽度
- Tooltip 通过 HTML 原生 `title` 属性实现（仅限参与者视图的活动标题）
- "+N 项" 折叠规则：参与者视图超过 3 个活动 / 管理视图超过 3 个任务时折叠

### 2.2 截断规则优化方案

#### 2.2.1 月视图截断策略

| 场景 | 截断行数 | 字符数软限制 | 实现方式 |
|------|---------|-------------|---------|
| 活动标题（参与者视图） | 单行 | 中文约 10-12 字 | CSS `text-overflow: ellipsis` + `max-width: 100%` |
| 任务标签（管理视图） | 单行 | 中文约 8-10 字 | 现有 `.cal-task-tag` 类，微调 padding 以适应更窄单元格 |
| 单元格日期数字 | 单行 | 不适用 | 无需截断 |

#### 2.2.2 周视图截断策略

| 场景 | 截断行数 | 字符数软限制 | 实现方式 |
|------|---------|-------------|---------|
| 任务标题 | 双行 | 中文约 16-20 字 | `-webkit-line-clamp: 2` + `display: -webkit-box` |
| 角色标签 | 单行 | 不截断 | 使用 badge 样式，字体缩小至 10px |

#### 2.2.3 日视图截断策略

- 日视图空间充裕，**不截断**。完整展示标题和描述。
- 若任务描述过长（超过 3 行），提供"展开/收起"切换。

#### 2.2.4 列表视图截断策略

- 单行，字符数约 20 字，超出截断

### 2.3 Tooltip 实现方案对比

| 方案 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| **纯 CSS `title` 属性** | 零 JS 开销，浏览器原生支持，无障碍友好 | 样式不可定制，延迟不可控，移动端不触发 | 当前方案，轻量场景可用 |
| **JS Tooltip 组件（自研）** | 样式可控，支持富文本，可控制延迟和位置 | 需要额外 JS 代码，增加维护成本 | 管理视图的任务详情预览 |
| **CSS `::after` 伪元素** | 纯 CSS 实现，可定制样式 | 不支持换行，内容长度受限 | 角色标识色块说明 |

**推荐混合策略**：

- 参与者视图：保持 `title` 属性，轻量无负担
- 管理视图（月视图单元格内）：`title` 属性 + hover 时显示精简 JS tooltip（包含任务完整标题、执行人、状态）
- 日视图/周视图：不需要 tooltip（信息已完整展示）
- 移动端：长按触发 tooltip（使用 `touchstart` + 定时器模拟，500ms 延迟）

### 2.4 "+N more" 折叠显示策略

当前 `+N` 折叠规则（参与者视图 > 3，管理视图 > 3）存在两个问题：
1. **固定阈值不适应不同屏幕尺寸**：大屏下月视图单元格可容纳更多条目
2. **折叠后信息丢失**：用户不知道 "+5 项任务" 具体是什么

**优化方案**：

```javascript
// 动态阈值计算（基于单元格高度）
function getVisibleItemCount(cellHeight) {
  // 每项任务标签约 24px（含 margin），日期头约 20px
  const availableHeight = cellHeight - 28; // 减去日期头和 padding
  return Math.max(1, Math.floor(availableHeight / 26));
}
```

**"+N" 标签交互增强**：

- 点击 "+N" 标签时，在原位展开一个微型弹出列表（非 Modal），显示隐藏的任务条目
- 弹出列表支持点击选中某任务，联动右侧检查器面板
- 点击日历其他区域或按 Escape 关闭

### 2.5 移动端适配的截断差异

| 断点 | 月视图单元格高度 | 最大展示条目 | 任务标题截断 |
|------|---------------|------------|------------|
| >= 1024px（桌面） | 8rem | 4-5 条 | 中文 12 字 |
| 768-1023px（平板） | 6rem | 3-4 条 | 中文 10 字 |
| < 768px（手机） | 4.5rem | 2-3 条 | 中文 8 字 |

移动端月视图的单元格点击后：不展开右侧面板（屏幕太窄），而是在当前视图内原地展开一个全宽的任务列表卡片。这个交互在桌面端和平板端不受影响。

---

## 3. 活动数据存储结构

### 3.1 当前数据流分析

当前数据架构采用分层设计：

```
domain.js (数据定义 + mockDB 内存数据库)
    ↓
service.mock.js (CRUD 操作 + localStorage 持久化)
    ↓
service.runtime.js (运行时插槽，USE_MOCK=true)
    ↓
state.js (appState 全局状态 + setState 触发渲染)
    ↓
main.js (renderUI 统一渲染入口)
    ↓
calendar.js / inspector.js / events.js (视图模块)
```

关键发现：

- `SANDBOX_MODE = true`：当前每次刷新清空数据，无持久化
- `mockDB` 是内存对象，所有 CRUD 操作遵循 Immutable 原则（展开符替换整个数组）
- `localStorage` 的 `saveDB()` 仅在 `SANDBOX_MODE = false` 时生效（持久化恢复代码已被注释）
- `loadDB()` 目前实际行为是清除存储
- Schema 版本校验机制已内置（`SCHEMA_VERSION = 1`），为未来迁移做准备

### 3.2 数据存储方案选项

#### 方案 A：纯前端 localStorage（当前方案）

| 维度 | 评价 |
|------|------|
| 实现难度 | 低（已有完整代码） |
| 数据容量 | 约 5-10MB，足够存储数百条活动和数千条任务 |
| 数据安全 | 低（明文存储，浏览器清除即丢失） |
| 多端同步 | 不支持 |
| 查询能力 | 差（需全量读取后在内存过滤） |
| 适用阶段 | MVP / Demo / 单人使用 |

**当前待启用**：将 `SANDBOX_MODE` 改为 `false` 并取消注释持久化恢复代码，即可获得基础的跨刷新持久化能力。

#### 方案 B：IndexedDB（大量历史数据）

| 维度 | 评价 |
|------|------|
| 实现难度 | 中（需引入 IndexedDB 封装库如 `idb` 或自研） |
| 数据容量 | 浏览器可用空间的 50%+，几乎无上限 |
| 数据安全 | 低（同 localStorage，明文存储） |
| 多端同步 | 不支持 |
| 查询能力 | 中等（支持索引和游标遍历） |
| 适用阶段 | 历史数据积累期 / 离线优先 PWA |

**何时迁移到 IndexedDB**：
- 活动总数超过 500 条
- 需要按日期范围 / 角色 / 场景进行索引查询
- 需要存储活动附件（照片、文档）等二进制数据

#### 方案 C：后端 API（多端同步）

| 维度 | 评价 |
|------|------|
| 实现难度 | 高（需后端 + 认证 + 同步协议） |
| 数据容量 | 取决于服务器 |
| 数据安全 | 高（服务端 ACL、加密传输） |
| 多端同步 | 支持（实时/准实时） |
| 查询能力 | 强（SQL / API 参数化查询） |
| 适用阶段 | 正式上线 / 多用户协作 |

ROADMAP.md 中已规划 Phase 2（Supabase Backend），`service.runtime.js` 的 `USE_MOCK` 开关已为此预留。迁移路径清晰：

```
localStorage (当前) → Supabase + localStorage(本地缓存) → Supabase + IndexedDB(离线缓存)
```

### 3.3 数据结构 Schema 设计

当前 `Activity` 和 `Task` 的字段定义在 [domain.js](file:///d:/GitHub/GSM1921-SOP/src/domain.js) 中已有完善的 JSDoc 注释。以下是对日历功能最有影响的字段分析及扩展建议：

#### Activity 对象（日历视角）

```javascript
const Activity = {
  id:            'act_xxxxx',      // 唯一标识，crypto.randomUUID() 生成
  title:         '三月主题党日',     // 活动标题，日历单元格主要展示内容
  status:        'published',      // 'draft' | 'published' | 'ongoing' | 'completed'
  date:          '2026-05-15',     // 活动日期 YYYY-MM-DD，日历的核心锚点
  executor:      'organizer',      // 执行角色，决定在哪个角色的管理视图中可见
  supervisor:    'secretary',      // 督办角色，用于跨角色任务透视
  domain:        'activity',       // 领域分类
  scenarioId:    'theme-party',   // 场景 ID，驱动 SOP 任务自动实例化
  archived:      false,            // 软删除标记
  createdAt:     '2026-04-20T...', // 创建时间，用于排序和审计
  // 以下为可选字段，影响日历展示
  organizerName:      '张三',      // 活动组织者姓名（参与者视图 Modal 展示）
  deepParticipantName:'李四',      // 深度参与者姓名
  hostGroup:          'first',     // 承办党小组
  priority:           'normal',    // 'low' | 'normal' | 'urgent'，影响日历标签颜色
  dueDate:            '2026-05-10',// 截止日期，自动化提醒锚点
};
```

#### Task 对象（日历视角）

```javascript
const Task = {
  id:          'tsk_xxxxx',       // 唯一标识
  activityId:  'act_xxxxx',       // 所属活动 ID，建立 Task↔Activity 关联
  title:       '制作活动海报',     // 任务标题，日历单元格的任务标签内容
  status:      'pending',         // 'pending' | 'in_progress' | 'completed'
  executor:    'commissioner',    // 执行角色，驱动日历中的四色角色点阵
  supervisor:  'secretary',       // 督办角色
  date:        '2026-05-08',      // 任务日期 YYYY-MM-DD（由 timeOffset + 活动日期派生）
  timeOffset:  -7,                // 距活动日的天数偏移（T-7）
  scenarioId:  'theme-party',     // 关联场景 ID
  createdAt:   '2026-04-20T...',
};
```

#### 建议新增的日历专用字段

```javascript
// Activity 扩展
{
  color:     '#CE1126',   // 活动自定义颜色（覆盖场景默认色），
                          // 用于日历单元格的背景色标识
  allDay:    true,        // 是否为全天活动（影响日视图时间轴布局）
  endDate:   null,        // 活动结束日期（支持跨日活动）
  location:  '光华1号楼', // 活动地点（日视图/周视图展示）
}

// Task 扩展
{
  estimatedMinutes: 120,  // 预估耗时（分钟），日视图时间轴布局用
  labels: ['紧急', '需审批'], // 自定义标签，日历标签颜色扩展
}
```

### 3.4 数据持久化与备份策略

#### 当前过渡方案（1-2 周内）

1. 将 `SANDBOX_MODE` 改为 `false`，启用 localStorage 持久化
2. 保持 Schema 版本校验，版本不匹配时提示用户而非静默丢弃
3. 在设置面板（待新建）中添加"导出数据"按钮，将全部数据序列化为 JSON 文件下载

#### 中期方案（Phase 2 上线前）

1. **双写机制**：数据同时写入 localStorage（本地缓存）和 Supabase（远程）
2. **冲突解决**：以 `createdAt` 时间戳为准，后写入的覆盖先写入的
3. **离线恢复**：Supabase 不可用时回退到 localStorage，上线后自动同步差异数据

#### 长期方案（Phase 3 及以后）

1. **增量同步**：基于 `updatedAt` 字段做增量拉取，减少全量传输
2. **定期快照**：每 100 次写操作生成一次 localStorage 快照（JSON 备份），避免单点损坏
3. **审计日志**：`.ctx/logs/` 目录记录所有写操作的时间、操作人、操作类型

---

## 4. 快速聚焦视图设计

### 4.1 当前交互分析

当前点击日历日期格的行为链（[calendar.js L137-L143](file:///d:/GitHub/GSM1921-SOP/src/calendar.js#L137-L143)）：

```
点击 .cal-cell-large.has-tasks
  → 移除所有 .selected 类
  → 给当前单元格添加 .selected（红底高亮）
  → setState({ selectedDate, viewMode: 'list', selectedActivityId: null })
  → renderUI → renderInspectorFromState → renderInspectorList
  → 右侧检查器面板显示该日期的活动列表
```

**存在的问题**：
- 聚焦状态与日历视图是割裂的——日历里看不见详情，详情面板里看不到日历全貌
- 从聚焦状态返回需要点击检查器的"返回列表"按钮，不直观
- 没有过渡动画，状态切换生硬

### 4.2 聚焦视图交互重构

#### 4.2.1 点击日历日期后的展开/收缩交互

有两种交互方案：

**方案 1：原位展开（推荐）**

点击日历日期单元格后，该单元格在日历网格中**向下展开**，推开下方行，形成一个宽幅聚焦面板。面板内容包含：

- 该日期的活动标题（大字显示）
- 该日期的任务列表（按时间和角色分组）
- 快速操作按钮（查看全部任务、切换管理角色）
- 关闭按钮（点击后收缩回普通单元格）

优势：日历上下文不丢失，用户可以同时看到聚焦日期和周边日期
劣势：布局计算复杂，需要精确控制 Grid 行高变化

**方案 2：弹出面板**

点击日期单元格后，在原位弹出（positioned relative to the cell）一个浮层面板，类似右键菜单。面板内容同方案 1。

优势：实现简单，不干扰日历布局
劣势：可能遮挡其他日期，移动端弹出位置需要动态调整

**推荐混合策略**：
- 桌面端（>= 768px）：原位展开（方案 1），因为屏幕够宽
- 移动端（< 768px）：弹出面板（方案 2），因为屏幕窄，原位展开不可行

#### 4.2.2 聚焦视图布局

```
┌──────────────────────────────────────────────────────┐
│  📅 2026年5月15日 周五 · 主题党日                    │
│  ─────────────────────────────────────────────────── │
│  【活动名称】三月主题党日        状态：已发布          │
│  组织者：张三    深度参与者：李四   承办：第一党小组    │
│  ─────────────────────────────────────────────────── │
│  【任务列表】(5 项任务 | 2 已完成)                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ● T-14 天  制定活动方案    [组织委员] ✅ 已完成  │ │
│  │ ● T-10 天  支委会审议      [党小组组长] ⏳ 进行中│ │
│  │ ● T-7 天   宣传动员        [宣传委员] ⬜ 待处理  │ │
│  │ ● T-0 天   现场组织        [深度参与者] ⬜ 待处理│ │
│  │ ● T+3 天   材料归档        [党支书] ⬜ 待处理    │ │
│  └─────────────────────────────────────────────────┘ │
│  ─────────────────────────────────────────────────── │
│  [查看全部]  [切换角色查看]                 [✕ 关闭] │
└──────────────────────────────────────────────────────┘
```

#### 4.2.3 聚焦状态下活动列表的排序规则

1. **默认排序**：按 `timeOffset` 升序（T-14 → T-7 → T=0 → T+3），逻辑最直观
2. **按状态排序**（可选切换）：未完成在前，已完成在后
3. **按角色排序**（可选切换）：按 ROLE_ORDER 排列（leader → commissioner → organizer → deep → secretary）
4. **按优先级排序**（可选切换）：urgent → normal → low

排序规则通过聚焦面板顶部的 Tab 切换，默认为时间排序。

#### 4.2.4 从聚焦视图返回日历的过渡动画

1. **关闭按钮 / 点击日历其他区域**：聚焦面板向上收缩，height 从展开值过渡到 0，opacity 淡出（300ms）
2. **点击日历其他日期**：当前聚焦面板收缩，新日期展开（交替动画，250ms）
3. **按 Escape**：同关闭按钮行为
4. **CSS 实现**：使用 `max-height` 过渡动画，参考现有 `.js-expand-target` 的实现模式

```css
.focus-panel {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.35s ease-out, opacity 0.25s ease-out;
}
.focus-panel.expanded {
  max-height: 600px; /* 足够容纳最多 20 个任务 */
  opacity: 1;
}
```

---

## 5. 技术实现建议

### 5.1 CSS Grid / Flexbox 布局选择

| 视图 | 推荐布局 | 原因 |
|------|---------|------|
| 月视图 | CSS Grid | 7 列等宽网格是天然 Grid 场景；当前已使用 Grid，无需改变 |
| 周视图 | CSS Grid | 同月视图，但列高扩展至容器全高 |
| 日视图 | Flexbox (column) | 单列纵向流，时间轴和任务卡片的纵向堆叠更适合 Flexbox |
| 列表视图 | Flexbox (column) | 简单纵向列表，无需 Grid |
| 聚焦面板 | Flexbox (column) | 纵向信息流布局 |

**避免过度使用 Grid 的 `grid-template-areas`**：当前日历的单元格由 JS 动态生成，使用 `grid-template-areas` 会导致 HTML 结构和 CSS 强耦合，不利于维护。保持现有的 `grid-template-columns: repeat(7, 1fr)` + JS 动态填充的方案。

### 5.2 虚拟滚动（大量历史活动时）

**触发条件**：列表视图下活动超过 200 条时，DOM 节点过多导致渲染性能下降。

**推荐方案**：使用 [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) 实现简单的虚拟滚动，而非引入重量级第三方库。

```javascript
// 虚拟滚动简化实现思路
function virtualScroll(container, items, rowHeight, buffer = 5) {
  const visibleCount = Math.ceil(container.clientHeight / rowHeight);
  const totalHeight = items.length * rowHeight;
  
  container.innerHTML = ''; // 清空
  const spacer = document.createElement('div');
  spacer.style.height = totalHeight + 'px';
  spacer.style.position = 'relative';
  container.appendChild(spacer);
  
  // 仅渲染可见区域 + 缓冲区内的条目
  const observer = new IntersectionObserver((entries) => {
    const scrollTop = container.scrollTop;
    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endIdx = Math.min(items.length, startIdx + visibleCount + buffer * 2);
    // 渲染 items.slice(startIdx, endIdx)
  });
}
```

**重要说明**：当前项目定位为党支部内部 SOP 引擎，活动数据量级在可预见的未来（1-2 年内）不会超过 500 条活动。虚拟滚动目前为**远期优化项**，不建议在 Phase 1/2 中优先实现。ROADMAP.md 中 Phase 3（Workflow Engine）完成后再评估是否需要。

### 5.3 键盘导航支持

键盘导航是 Web 无障碍（A11y）的基本要求，也是重度用户（如党支书每天审视日历）的效率提升点。

#### 快捷键设计

| 按键 | 月/周/日视图 | 聚焦面板 | 列表视图 |
|------|------------|---------|---------|
| `←` / `→` | 切换前一天/后一天 | 无操作 | 无操作 |
| `↑` / `↓` | 切换上一周/下一周 | 切换上一个/下一个任务 | 切换上一行/下一行 |
| `Enter` | 打开聚焦面板 | 选中任务 → 打开详情 | 选中活动 → 打开详情 |
| `Escape` | 无操作 | 关闭聚焦面板 | 无操作 |
| `T` | 切换到今日 | 无操作 | 无操作 |
| `M` / `W` / `D` / `L` | 切换月/周/日/列表视图 | 无操作 | 同左 |
| `Ctrl+F` | 聚焦搜索框 | 无操作 | 同左 |

#### 实现要点

1. 日历容器需设置 `tabindex="0"` 以接收键盘事件
2. 当前聚焦的日期单元格使用 `aria-selected="true"` 标记
3. 任务标签使用 `role="button"` + `tabindex="-1"`（避免 Tab 键在每个任务标签上停顿，改用方向键导航）
4. 所有交互元素必须有可见的 `:focus-visible` 样式（当前已有全局 focus-visible 规则在 [styles.css L798-L804](file:///d:/GitHub/GSM1921-SOP/src/styles.css#L798-L804)）

### 5.4 打印/导出兼容性

当前 [styles.css L1178-L1198](file:///d:/GitHub/GSM1921-SOP/src/styles.css#L1178-L1198) 已包含基础打印样式，隐藏了 header 和 sidebar。

#### 日历打印增强

1. **打印时自动切换到月视图**：因为月视图是最适合纸张宽度的布局
2. **移除交互元素**：打印时隐藏关闭按钮、聚焦面板、状态选择器
3. **保留颜色信息**：角色色标在打印时保留（彩色打印场景），同时提供图案替代（黑白打印场景：圆点→菱形/方块/三角/星形）
4. **分页控制**：月视图在每月结尾插入 `page-break-after`，避免月中跨页断裂
5. **不打印 background-color**：避免深色背景（如 `--primary-900` Header）消耗大量墨水。打印时 Header 文字改为黑色，背景为白色。

#### 导出格式

| 格式 | 适用场景 | 实现方式 |
|------|---------|---------|
| PDF | 正式汇报、存档 | 浏览器原生打印 → 另存为 PDF |
| CSV | 数据分析、导入 Excel | JS 生成 CSV 字符串 → Blob 下载 |
| JSON | 数据备份、迁移 | 已有 localStorage 数据结构可直接导出 |
| iCalendar (.ics) | 同步到手机/电脑日历 | 按 RFC 5545 格式生成 .ics 文件 |

CSV 和 JSON 导出通过现有 `showToast` 提示用户下载进度。iCalendar 导出为远期优化项（Phase 3+）。

---

## 6. 实施优先级与依赖

### 优先级矩阵

| 优先级 | 功能模块 | 依赖 | 预估工作量 | 关联 ROADMAP |
|--------|---------|------|-----------|-------------|
| **P0** | 启用 localStorage 持久化（SANDBOX_MODE=false） | 无 | 0.5h | 基础建设 |
| **P0** | 日历视图切换基础架构（月/周/日/列表） | P0 持久化 | 4-6h | Phase 3（Workflow Engine） |
| **P1** | 文本截断优化 + JS Tooltip | P0 视图切换 | 2-3h | DESIGN-OPT Phase D2 |
| **P1** | "+N more" 折叠点击展开 | P0 视图切换 | 1-2h | 同上 |
| **P1** | 快速聚焦视图（原位展开） | P0 视图切换 | 3-4h | 同上 |
| **P2** | 键盘导航 | P1 聚焦视图 | 2-3h | A11y 合规 |
| **P2** | 打印样式增强 + CSV/JSON 导出 | P0 持久化 | 1-2h | 同 P0 |
| **P3** | 虚拟滚动 | P0 + 数据量 > 200 条 | 3-4h | Phase 3 |
| **P3** | iCalendar 导出 + IndexedDB 迁移 | Phase 2（Supabase） | 4-6h | Phase 3 |

### 实施路线

```
Phase 1（立即）：SANDBOX_MODE=false → 基础持久化
Phase 2（本月）：视图切换架构 → 月/周/日/列表四视图
Phase 3（下月）：截断优化 + 聚焦视图 + 导出
Phase 4（远期）：键盘导航 + 虚拟滚动 + iCalendar
```

---

## 附录：关键代码位置索引

| 文件 | 关键函数/区域 | 说明 |
|------|-------------|------|
| [src/calendar.js](file:///d:/GitHub/GSM1921-SOP/src/calendar.js#L15-L144) | `renderCalendarByActivities()` | 月视图日历渲染核心 |
| [src/calendar.js](file:///d:/GitHub/GSM1921-SOP/src/calendar.js#L152-L197) | `populateMonthSelector()` | 月份选择器填充 |
| [src/inspector.js](file:///d:/GitHub/GSM1921-SOP/src/inspector.js#L16-L26) | `filterTasksByManagementRole()` | 管理角色任务过滤器 |
| [src/inspector.js](file:///d:/GitHub/GSM1921-SOP/src/inspector.js#L31-L49) | `renderInspectorFromState()` | 检查器状态路由分发 |
| [src/inspector.js](file:///d:/GitHub/GSM1921-SOP/src/inspector.js#L87-L174) | `renderInspectorList()` | 活动列表视图渲染 |
| [src/inspector.js](file:///d:/GitHub/GSM1921-SOP/src/inspector.js#L179-L336) | `renderInspectorDetail()` | 活动详情视图渲染 |
| [src/state.js](file:///d:/GitHub/GSM1921-SOP/src/state.js#L66-L86) | `appState` 初始定义 | 全局状态结构 |
| [src/state.js](file:///d:/GitHub/GSM1921-SOP/src/state.js#L101-L112) | `setState()` | Immutable 状态更新 |
| [src/domain.js](file:///d:/GitHub/GSM1921-SOP/src/domain.js#L11-L60) | JSDoc typedef | 数据结构完整定义 |
| [src/service.mock.js](file:///d:/GitHub/GSM1921-SOP/src/service.mock.js#L19-L72) | `SANDBOX_MODE` + `saveDB()`/`loadDB()` | 持久化引擎 |
| [src/service.runtime.js](file:///d:/GitHub/GSM1921-SOP/src/service.runtime.js#L14) | `USE_MOCK` 开关 | 后端切换点 |
| [src/styles.css](file:///d:/GitHub/GSM1921-SOP/src/styles.css#L696-L757) | `.cal-cell-*` 类 | 日历单元格样式 |
| [src/main.js](file:///d:/GitHub/GSM1921-SOP/src/main.js#L20-L153) | `renderUI()` | 统一渲染入口 |
| [src/events.js](file:///d:/GitHub/GSM1921-SOP/src/events.js#L48-L179) | `_initCalendarModule()` | 党建工作台控制台 |
| [ROADMAP.md](file:///d:/GitHub/GSM1921-SOP/ROADMAP.md#L66-L86) | Phase 2/3 | Supabase + Workflow Engine 规划 |
