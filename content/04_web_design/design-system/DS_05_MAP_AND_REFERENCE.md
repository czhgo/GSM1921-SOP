---
title: "设计系统 · 第五编 地图与速查"
type: design
role: "[工程师]+[AI]"
last_updated: 2026-10-29
status: active
related_files: [DESIGN_SYSTEM.md, DS_01_COLOR_AND_THEME.md, DS_02_TYPE_AND_SIZE.md, DS_03_COMPONENTS.md, DS_04_INTERACTION_AND_RESPONSIVE.md, CASES.md]
---

# 第五编 地图与速查

> **回答什么问题**：什么地方可以点击、点击后落在哪里；设计资产清单；按关键词速查该读哪一节；本文不展开的内容以谁为准。
> **不回答什么**：条文本身（色板、字号、组件结构、交互态）→ 第一至第四编；判例与边界案例 → [CASES.md](CASES.md)；数据结构与权限矩阵 → [DATA_MODEL.md](../data/DATA_MODEL.md) / [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)。
> **谁什么时候读**：[工程师]+[AI]；接新页面需要定落点、排查「点了没反应 / 落在错地方」、或不确定某条权威源在哪份文件时读本篇。

## 八、设计资产清单

### 8.1 文件清单

| 文件 | 职责 | 格式 |
|------|------|------|
| `docs/src/styles.css` | 全局样式 + 组件样式 + 响应式 + 打印 | CSS |
| `index.html` | Tailwind 配置 + HTML 结构 | HTML |
| `content/04_web_design/design-system/DESIGN_SYSTEM.md` | 设计系统规范文档（本文件） | Markdown |
| `CLAUDE.md` §九 | 设计优化项目规划 | Markdown |

---

## 九、快速参考

| 我需要... | 操作 |
|----------|------|
| 查主色值 | → §2.2 主色表 |
| 查「某颜色角色该用哪个令牌」（主题色 / 功能色 / 中性 / 表面 / 角色识别） | → §2.9 颜色角色 → 令牌 映射 |
| 查「选中态卡片该用哪档底/边」（主题色浅底 0.10 ＋ 边 0.30） | → §2.9.1 U1 |
| 查「状态层合法 Tailwind 色类清单 / 哪些色相档位禁止」 | → §2.9.2 U4 |
| 查「主题色与功能色同色相（红+红）时怎么区分」 | → §2.9.3 U3 |
| 查「哪种元素用哪一档字号 / 行高」 | → §3.2.2 文本档位-角色映射 |
| 查「某类元素圆角 / 边框 / 阴影该取哪档」 | → §4.19 形状·边框·阴影档位表 |
| 查「某种数据格式该用哪种视图」 | → §4.10.1 数据格式 → 视图模式对照表 |
| 查「跨台 tab 该不该同名 / 为何支书台是「全局概况」」 | → §4.6「tab 命名一致性」 |
| 查组件规范 | → §四 组件规范 |
| 查界面文案（Copy）准则（字数 / 折叠 / 复述 / 制度原文） | → §4.18 界面文案规范 |
| 查点击落点 | → §十 点击落点映射 |
| 查响应式断点 | → §6.1 断点表 |
| 查 CSS 变量名 | → `docs/src/styles.css:root` |
| 查实施进度 | → CLAUDE.md §九 DESIGN-OPT-4 |
| 提交设计反馈 | → docs/feedback.html（在线反馈入口） |
| 查设计/工程方法论论证 | → [DESIGN_METHODOLOGY.md](../evolution/DESIGN_METHODOLOGY.md)（论证档案） |

---

## 十、点击落点映射

> **权威源**：本节为「什么地方可以点击、点击后落在哪里」的全局规范（支书 2026-08-29 分层原则裁定）。
> 适用于所有页面/工作台的可点击业务对象（活动/专班/通知/档案等）。

### 10.1 分层原则（支书 2026-08-29 裁定）

同一业务对象在不同上下文允许不同落点，但**同一场景内必须一致**，且每一类落点必须有明确依据：

| 上下文 | 落点 | 依据 |
|---|---|---|
| 首页（已登录） | 跳本人工作台（`?activityId=` / `?taskforceId=` 定位） | 直达处理，最小操作成本 |
| 首页（未登录/访客态） | 跳 login.html（带对象 ID 意图） | 未登录统一直达登录页，消除绕路 |
| 工作台内日历/列表 | 同页详情面板（setState 内嵌） | 工作台上下文内处理，不跳页 |
| 参与者活动动态 tab | 独立详情页 `activity.html?id=` | visitor 只读浏览视角 |
| 通知内的活动/专班链接 | 消息详情 `notice.html?id=` → 对象卡唯一动作（`activity.html?id=` / `taskforce.html?id=`） | 先落全貌，再由对象卡按 `targetType+targetId` 直达（`resolveNoticeUrl` 已退役，SD-33） |
| 归档库条目 | 弹窗展示归档详情 | 档案浏览场景（archive-entry） |

**统一出口**：跨页跳转统一经 `core/session/cross-page-state.js` 的 `buildURL`；消息链接统一先落 `notice.html?id=`，对象跳转由详情页唯一动作承担（SD-33，不再有页面级兜底）。

### 10.2 活动条目落点映射表

| # | 入口（文件:行） | 落点 | 分层达标 |
|---|---|---|---|
| A1 | 首页活动列表 `components/dashboard/activity-panel.js:121` + `main-entry.js:87-95` | 工作台 `?activityId=` / 未登录 login | ✓ 分层① |
| A2 | 首页活动风采 `components/dashboard/gallery.js:53` + `main-entry.js:105-113` | 同上 | ✓ 分层① |
| A3 | visitor 活动动态 `entries/tabs/visitor/activities-tab.js:58,61,215` | 独立详情页 `activity.html?id=` | ✓ 分层④ |
| A4 | org 工作台日历 `components/record/calendar.js:479-495` + `activity-view.js` | 同页只读详情面板 | ✓ 分层③ |
| A5 | 支书工作台日历 `calendar-tab.js:103` + `inspector.js` | 同页可操作详情面板 | ✓ 分层③（可操作） |
| A6 | 工作台日历列表视图 `calendar.js:396-400` | 同页详情 | ✓ 分层③ |
| A7 | 通知活动链接 `notice.js:309-314` | 独立详情页 | ✓ 分层⑤ |
| A8 | 归档库条目 `archive-entry.js:131` | 弹窗详情 | ✓ 分层⑥ |

### 10.3 专班条目落点映射表

| # | 入口（文件:行） | 落点 | 分层达标 |
|---|---|---|---|
| B1 | 首页专班列表 `dashboard/taskforce-list.js:40` + `main-entry.js:96-104` | 工作台 `?taskforceId=`（org 自动展开卡片/组长纪检 tf-view 高亮） | ✓ 分层① |
| B2 | org 专班管理卡片 `taskforce-tab.js:680` | 同页内嵌详情面板 | ✓ 分层③ |
| B3 | 组长/纪检专班查看 `components/record/taskforce-view.js:125` | 同页只读详情面板 | ✓ 分层③ |
| B4 | 通知专班链接 `notice.js:310` | 独立页 `taskforce.html?id=` | ✓ 分层⑤ |

### 10.4 可点击性规范

> **2026-10-18 扩为五类行型矩阵**（与 `docs/src/components/ui/list-row.js` 的 `rowType` / `data-row-type` 对齐）。
> 先判行型，再决定整行是否可点、用什么元素、动作如何并存；原四条兜底规则保留在后。

| 行型 | 整行可点 | 元素 | 主行动 | 次行动 | hover / 焦点 |
|---|---|---|---|---|---|
| **导航行** | 是 | `<a>` 或 `<button>`（`data-row-type="nav"` + `data-interactive="true"`） | 打开目标 | 无，或一个行尾「更多」 | 有 hover，有 `:focus-visible` |
| **动作行** | 否 | `<div>`（`data-row-type="action"`）＋ 末列按钮 | 一个明确按钮 | 其余进「更多」 | 行不 hover，按钮有 |
| **选择行** | 是 | `<button>`（`data-row-type="select"` + `data-interactive="true"`） | 选中 / 取消 | 无 | 有 hover，有 `:focus-visible` |
| **展示行** | 否 | `<div>`（`data-row-type="display"`） | 无 | 无 | 无 hover、无 pointer |
| **主从行** | 是（仅选中） | `<button>`（`data-row-type="master"` + `data-interactive="true"`） | 选中并在右栏显示 | 一个行内动作 + 「更多」 | 有 hover，有 `:focus-visible` |

> **主从行的唯一例外**：行尾必须同时放「去处理 / 更多」时，原生 `<button>` 内嵌按钮非法 ⇒ 允许用
> `role="button"` 的容器 + 调用方绑定 Enter / Space；无嵌套动作时仍用原生 `<button>`。除此之外，
> 不得用 `div` + click 冒充可点行。

**动作并存的两条硬约束**：

1. 动作行 / 主从行每行最多 **1 个主行动 + 1 个「更多」**；其余动作进「更多」，不得并列多个等权彩色按钮。
2. 行内动作嵌在可点行内时必须 `event.stopPropagation()`；主从行点行只切右栏，不触发行内动作。

**兜底规则（原四条，保留）**

1. **光标兜底**：`styles.css` 全局 `button { cursor: pointer }` / `button:disabled { cursor: not-allowed }`——手写按钮不再逐个补 cursor。
2. **纯展示不加 hover 伪装**（§4.2 硬性规则 4）：纯展示行/卡不得有 hover 上浮/变底。
3. **嵌套热区**：操作按钮嵌在可点击卡片内必须 `event.stopPropagation()` 阻断冒泡（已有：taskforce-tab/todo-list/header/references）——新增此类结构时必须同步阻断。
4. **z-index 层级**：浮层统一三档——dropdown 100 / modal 500 / overlay 9999，新浮层不得另起档位，后续新浮层开发时须遵守。

### 10.5 首屏浏览顺序（2026-10-19 立 · 三条可泛化规则）

> **第一眼原则**：用户打开页面，第一眼必须看到**这一屏的主对象**（表格 / 列表 / 卡片），而不是解释文字。

1. **主对象优先**：表格 / 列表 / 卡片先于解释性文字；标题下只留范围说明 + 唯一主动作。
2. **说明后置**：帮助注释、口径说明放在主对象**之后**或折叠内，不得压在主体前。
3. **指标单点**：同一数据集、同一口径的指标只在首屏出现**一次**；总数与分项不算重复，但同一层级的同一指标不得出现两次。
4. **动作收敛**：每行 **1 主 + 1 次**；每屏 **1 个主按钮**；其余动作进「更多」。

**三条布尔条件（新增页面逐条自检，任一为真即须改）**：

| # | 规则 | 布尔判据（为真＝违规） |
|---|---|---|
| B-1 | 说明后置 | 同屏存在说明 / 帮助注释节点，其 DOM 顺序**早于**主对象节点，且不在折叠容器内 |
| B-2 | 指标单点 | 同一 `data-metric` / 同一口径的指标，在首屏出现次数 **> 1**（总数与分项各算一次，不算重复） |
| B-3 | 动作收敛 | 任一行动作 **> 1 主 + 1 次**，或一屏实底主按钮 **> 1 个** |

### 10.6 10 个抽样页乱象登记（已迁出）

> 本节原文（10 页抽样登记：4 页已修、6 页已审）已迁至 [CASES.md](CASES.md)「迁移登记 B」，作为判例存档。
> 乱象判据仍在 §10.5 的三条布尔条件（B-1 说明后置 / B-2 指标单点 / B-3 动作收敛）。

### 10.7 承载面唯一性（2026-10-20 立 · 全站对象口径）

> **判例**：`.ctx/logs/archive/2026-10/UI_AUDIT_R3.md` 判例③④、§六 重复入口——同一批活动在组织台「活动日历」与专班页「活动工作组」各渲染一遍；成员档案与组织台各有一份思想汇报入口。
> **一句话**：同一对象只允许**一个主承载面**；其它入口只给**链接 + 一行摘要**，不复制正文、字段清单或第二个写口。

| 对象 | 主承载面 | 次级入口允许的形态 | 禁止 |
|---|---|---|---|
| 活动（内容 / 详情） | `activity.html` | 工作台列表行给 `?activityId=` 深链 + 1 行摘要；工作台同页面板只放摘要与就地动作 | 在多个页面各自渲染完整详情 |
| 活动材料 | `activity-materials.html` | 活动详情给入口链接 | 在工作台或专班页再列一份完整材料清单 |
| 专班 | `taskforce.html`（详情与成员 / 任务内容） | 组织台专班视图只做管理动作并回链；首页、通知给 `?taskforceId=` 深链 | 专班页再平铺一份「活动工作组」，或两处各渲染完整成员 / 任务清单 |
| 思想汇报 | `thought-report.html`（正文与提交） | 个人档案、组织台只显状态、期次与链接 | 在档案或台账复制汇报正文 |
| 待办 | 待办页签（`todo`） | 概况、首页给计数与「去待办 ›」 | 每个页面各列一份待办明细 |
| 消息（公告 / 系统通知 / 私信） | 列表 `messages.html`；全貌 `notice.html?id=` | 铃铛、侧栏、首页只给摘要与链接 | 在铃铛 / 侧栏 / 首页复制正文或再列一份消息明细 |

**Boolean 判据（为真＝违规）**

| # | 判据 |
|---|---|
| P-1 | 同一对象在 **≥ 2 处**各有完整正文或完整字段清单，且两处都能改写 |
| P-2 | 次级入口复制正文 / 字段清单，而不是「链接 + 摘要」 |
| P-3 | 主承载面之外出现同一对象的**第二个写口**（例外：已授权的管理面，且走同一服务与同一校验） |
| P-4 | 页签名 / 视图名与页内对象不一致（名实不符，见 `PARALLEL_SKILL_AUDIT.md` §12 G-4） |

> **与 §10.1 的关系**：§10.1 的「同页详情面板」是**操作面**（摘要 + 就地动作），不等于第二承载面；完整正文、材料清单与归档内容仍只在主承载面。落点可以分层，承载面不可分叉。

---

## 十一、边界与引用

> 本文为设计规范的唯一权威源；下列内容本文不重复展开，一律以对应权威源为准。

| 本文不重复展开的 | 权威源 |
|---|---|
| 设计论证与判例（为什么不是另一种做法、什么条件下失效、生效条件） | [DESIGN_METHODOLOGY.md](../evolution/DESIGN_METHODOLOGY.md) |
| 数据结构与数据流（实体字段表、枚举、表结构） | [DATA_MODEL.md](../data/DATA_MODEL.md) |
| 系统角色权限矩阵（角色键级权威） | [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md) |
| 支委职责与赋权框架 | [COMMISSIONER_DUTY_FRAMEWORK.md](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) |
| 支书裁定原文（P-xxx 系列） | [SECRETARY_DIRECTIVES.md](../../01_strategy/SECRETARY_DIRECTIVES.md) |
| 术语定义 / 文件角色分类 | [TERMINOLOGY.md](../../03_doc_system/TERMINOLOGY.md)（全仓唯一术语定义源）/ [OPERATIONS_GUIDE.md §20–§31](../../03_doc_system/OPERATIONS_GUIDE.md)（文件角色分类等） |
| 文档地图与单一事实源索引 | [DOC_MAP.md](../../03_doc_system/DOC_MAP.md) / [ARCHITECTURE.md §十](../../03_doc_system/ARCHITECTURE.md#十单一事实源注册表与权威源治理) |
| 架构分层与目录结构 | [ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md) |
| 组件与样式的实现母本（代码） | `docs/src/styles.css` · `docs/src/components/*` |
| 沿革与「哪一批做了什么」 | `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` |
