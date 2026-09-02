---
title: "架构演进——组件化落地评估与轻量插件化设计"
type: design
role: "[工程师]+[AI]"
created: 2026-08-22
last_updated: "2026-09-03"
status: active
related_files: [DATA_MODEL.md, DATA_FLOW.md, SOP_WEB.md, DEPLOYMENT_ROADMAP.md, ../03_doc_system/ARCHITECTURE.md, ../05_ai_coding/KNOWN_PITFALLS.md]
---

# 架构演进——组件化落地评估与轻量插件化设计

> **定位**：一次关于系统架构的探索——「高度组件化、高度可复用」的目标落地到什么程度？距离「一切皆插件」的灵活性还有多远？上线后的多轮迭代靠什么机制承载？本文档只表达探索与选择，不代表最终结论，更不代表方案完备。
> **受众**：[工程师]+[AI]（架构维护者、开发者）+ 愿意给出架构反馈的外部评审者
> **关联**：[DATA_MODEL.md](../data/DATA_MODEL.md)（数据模型权威源）+ [DATA_FLOW.md](../data/DATA_FLOW.md)（数据流权威源）、[SOP_WEB.md](../module/SOP_WEB.md)（SOP-系统联动方法论）、[DEPLOYMENT_ROADMAP.md](../deploy/DEPLOYMENT_ROADMAP.md)（部署落地路径）、[ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md)（核心架构说明）。

---

## 一、出发点

设计之初就提出过一个方向性要求：**高度组件化、高度可复用**。这个方向本身没有异议，但它从未被系统性评估过——「落地到什么程度」是缺失的。本文档补上这次评估，并回答两个衍生问题：

1. 为了满足预期功能，可能存在的最优架构是什么？当前设计与它的差距在哪、优化空间有多大？
2. 系统上线后还会经历多轮迭代（功能增减、角色权限变化、技术栈演进），迭代靠什么机制承载？

评估过程中观察到一些外部架构实践（如「一切皆插件」的宿主架构），将其作为对照系引入分析，但对照只是参照，不是结论。

**本文档需要外部帮助的方向**：①架构评审意见（分层与注册机制是否合理）；②插件化设计的参考实现（同类轻量注册表的落地经验）；③迭代流程建议（功能开关、灰度、版本化怎么做最适合本系统规模）。

---

## 二、组件化与可复用目标落地评估

### 2.1 已落地的复用机制

逐层盘点后，系统已有相当一部分真实的复用基础，不是停留在口号层面：

| 机制 | 现状 | 复用证据 |
|------|------|---------|
| 数据层抽象 | ✅ | `docs/src/core/data-adapter.js` 定义统一 `DataAdapter` 接口，mock/api 双实现，切换数据源时 UI 零改动 |
| 服务层 | ✅ | `docs/src/services/` 19 个 service 封装业务逻辑，UI 层禁止直接操作 mockDB（见 ARCHITECTURE.md §七） |
| 事件解耦 | ✅ | `DATA_CHANGED_EVENT` 统一广播，角标/统计卡/通知列表订阅消费，新增消费点不改写路径 |
| 工作流数据驱动 | ✅ | `docs/src/workflow/sopData.js` 为纯数据（JSON Schema），`WorkflowEngine` 为通用状态机——新增场景只需加数据、不改引擎 |
| UI 组件 | ✅ | `docs/src/components/` 18 个共享组件（badge/calendar/tab-bar/sidebar/header/custom-select 等）；工作台 tab 已拆懒加载模块（entries/tabs/secretary/） |
| 后端通用结构 | ✅ | `server/db.js` 26 资源表统一 `id + data JSON`，新增持久化域只加表、不改路由 |
| 主题系统 | ✅ | CSS 变量 + 强调色三件套（`--app-accent` 系），视觉调整不动功能逻辑 |

### 2.2 未落地的差距

差距同样真实存在，且集中在「运行时可组合性」上：

| 差距 | 证据 |
|------|------|
| 页面入口层偏厚 | [main-entry.js](../../../docs/src/entries/main-entry.js) 约 590 行，统计卡/弹窗/列表/画廊渲染逻辑内嵌在入口；工作台入口同理 |
| HTML 层重复硬编码 | ✅ 已消除（2026-08-30 方案A）：tailwind config 与 T231 防闪烁脚本抽为 `docs/src/tailwind-config.js` / `docs/src/theme-init.js` 公共脚本，16 页 head 各只留 2 行引用（每页净减 ~28 行）；边界约束：不引入构建步骤（纯静态直开部署形态不变）、head 其余部分（字体 preconnect/preload/meta）不动、方案C（HTML 骨架模板化构建）留远期 |
| **静态引用而非注册** | 组件「import 即用」——页面 import 什么就用什么，没有「注册表 + 自动发现」机制；新增功能需手动改 HTML 引用 + entry 逻辑 + tab 配置 + 样式多处 |
| 无功能开关/能力清单 | 新功能无法按环境/角色/阶段选择性启用 |
| 版本手动维护 | `?v=20260812a` 每处手改，发布约等于全量刷新，无版本协商机制 |

### 2.3 评估结论

当前架构是**「结构分层」而非「运行时可组合」**：

- 结构分层 ✅：代码组织清晰（entries → components → services → core → mock → workflow），依赖方向受控，数据变更规则明确。
- 运行时可组合 ❌：功能单元不能「注册 → 发现 → 加载」，只能「引用 → 执行」。这是迭代成本高的根源——改一个功能往往要动多个文件，而文件间没有一份「能力清单」可查。

用对照系的话说：我们已经有多个**准插件机制**（数据源接口、tab 声明、场景数据），但缺一个把它们**收敛到统一注册表**的动作。这个判断在 §四 展开。

---

## 三、迭代能力现状评估

按三类迭代分别评估现状与瓶颈：

### 3.1 功能增减（新增/修改/移除功能）

- **现状**：新增一个展示板块，需要：HTML 加容器 → entry 写渲染逻辑 → 注册 tab（若入工作台）→ 加样式 → 可能改数据层。全部为手工串联。
- **瓶颈**：没有「声明一处、处处可见」的机制；移除功能时残留风险高（入口删了、组件还在、引用断裂）。

### 3.2 角色/权限变化

- **现状**：权限模型分散在 `services/auth.js`（角色判定）、`components/sidebar.js`（可见性）、`core/constants.js`（角色色彩）、`SERVICE_CATALOG.md`（权限矩阵文档）等多处；数据层已有 `users.role` + `activity.assignments` 主源（T-190 整合成果）。
- **瓶颈**：权限与功能是**两套声明**——功能挂在页面上，权限挂在角色上，两者没有绑定关系。「这个能力谁能用」需要跨多处人工对齐。

### 3.3 技术栈演进（切后端、上小程序、接外部系统）

- **现状**：`DataAdapter` 已把数据源隔离——mock/api 切换、北大对接数据接入（[PKU_PARTY_INTEGRATION.md](../deploy/PKU_PARTY_INTEGRATION.md)）都在数据层做，UI 不感知。
- **瓶颈**：小程序端（[WECHAT_INTEGRATION.md](../deploy/WECHAT_INTEGRATION.md) §八）复用网页组件时，只能复制或重写，没有「能力级复用」——同一能力在小程序端直接挂载。

**小结**：数据层已经走对了（接口隔离），UI 层还停在「静态组装」。迭代机制的设计重点在 UI 层的能力注册化。

---

## 四、轻量插件化设计——「能力注册表 + 声明式清单」

### 4.1 设计原则

1. **增量改造，不推翻现有分层**：现有 entries/components/services/core 结构保留，注册表是**新增的收敛层**，不是替代层。
2. **收敛既有准插件机制**：把已存在的 tab 声明、数据源切换、场景数据注册，统一进一份「能力清单」，让消费点（页面/工作台/侧边栏）从清单读取，自动发现。
3. **最小改动先落地**：第一个迁移示例只动一个模块（如活动日历），验证注册-发现-挂载链路后再铺开。
4. **权限随能力走**：能力声明携带 `requiredRoles`，让「谁能用」与「有什么」在同一处定义（回应 §3.2 的瓶颈）。

### 4.2 能力注册表机制（示意）

一个功能模块以「能力声明」注册：

```js
// 能力声明的形态（示意，非最终落地代码）
export const activityCalendar = {
  id: 'activity-calendar',
  name: '活动日历',
  scope: ['dashboard', 'workspace'],   // 出现范围
  requiredRoles: null,                  // null=无角色限制；数组=仅这些角色可用
  deps: ['data-adapter', 'badge'],      // 依赖的能力
  mount: () => import('../components/calendar.js?v=x').then(m => m.renderCalendar),
};
```

注册表提供三个原语：

- `registerCapability(cap)`——注册能力声明（模块加载时自注册）
- `getCapabilities({ scope, role })`——按范围+角色过滤，返回可用能力清单（消费点据此自动发现）
- `mountCapability(id, container)`——按需加载并挂载（与现有 tab 懒加载同构）

**消费点的变化**：页面/工作台不再「import 具体组件」，而是「问注册表当前范围有哪些能力」→ 按能力清单渲染。新增功能即新增一个能力声明并注册；移除功能即注销声明。改一处，处处生效。

### 4.3 三类插件单元

| 单元 | 现形态 | 注册化后 |
|------|--------|---------|
| UI 块 | `components/*.js` 被页面静态 import | 能力声明携带 scope/roles/mount，消费点按清单发现 |
| 数据源 | `data-adapter.js` 内 mock/api 二选一 | 数据源注册为能力（如 `pku-dangxiao-source`），按部署环境启用 |
| 工作流场景 | `sopData.js` 场景数据追加 | 场景作为能力注册，新增场景=注册一份场景声明 |

三者都收敛到同一注册表，但**各自保持现有实现不变**——注册表只做「声明 + 发现」，不做逻辑重写。

### 4.4 与既有机制的关系

- **tab-bar 懒加载**：其 tab 声明结构（id/label/render）本身就是能力声明的雏形，只是**内联在入口里**。注册化即把内联 tab 数组提为注册表条目，消费点逻辑不变。
- **DataAdapter**：已经是「数据源插件」的接口层。注册化只是把「数据源可用性」显式化（按环境启用哪个源）。
- **sopData + WorkflowEngine**：已是最彻底的插件化（纯数据驱动引擎）。注册化后，场景清单在注册表中可查、可灰度。

**一句话**：系统并不缺「组件」，缺的是「组件的目录」——能力注册表就是这个目录。

---

## 五、迭代机制设计

### 5.1 功能开关（能力清单按环境/角色过滤）

`getCapabilities({ scope, role })` 天然是功能开关：按环境配置（dev/prod/校园网内）与角色过滤能力清单。新功能可先只对特定环境/角色开放，验证后再放开——不写死开关判断散落各处。

### 5.2 版本化

现状的 `?v=` 手动维护演进为「注册表版本」：能力清单整体带版本号，页面按清单版本加载对应模块。发布即更新注册表版本，浏览器按版本失效缓存（承接 KNOWN_PITFALLS §13 的教训，把「子组件带版本」从人工纪律变成机制保证）。

### 5.3 灰度与回滚

能力按 scope 分批开放（先 dashboard 后 workspace）；问题能力可单独注销，不影响其他能力。回滚即注销声明，不再需要改多个文件。

---

## 六、实施路径

> 分阶段推进，每阶段独立可验收。M1/M2 已完成（2026-08-22），M3/M4 按迭代需要推进：

| 阶段 | 内容 | 验收标准 |
|------|------|---------|
| M1 | ✅ 注册表骨架（`core/registry.js`：register/get/mount 三原语）+ 首个示例能力迁移（活动日历） | 活动日历通过注册表挂载到 dashboard，行为与现一致 |
| M2 | ✅ 工作台 tab 收敛为注册表条目——组长工作台样板先行（1850 行单体 → 薄壳入口 161 行 + 9 独立 tab 模块 + `leader-workspace` 能力注册），其余 4 工作台按样板批量推进 | 所有 tab 从清单读取，新增 tab 只注册不连改多个入口 |
| M3 | ✅ 数据源与工作流场景注册化——6 工作台全薄壳化完成（组长 1850/组织 1806/宣传 1320/纪检 1339/成员 897 行单体 → 各 ~140-170 行薄壳 + 独立 tab 模块 + 各自 scope 能力注册，2026-08-23 全量验证通过） | 场景清单可查、可按环境启用 |
| M4 | ✅ 迭代机制落地（2026-08-23 完成）——registry 补全 unregisterCapability/resolveDeps 原语；数据源（mock/api）与 SOP 场景库注册为能力；bootstrap 数据源选择与决策树场景读取经注册表（行为零变化）；全站版本统一 20260823b；Node 断言 10/10 + 浏览器回归 31/31 | 新功能可按 scope 灰度，回滚=注销声明 |
| M5 | ✅ 入口/HTML 瘦身（2026-08-30）——方案A：HTML 公共资源抽取（`theme-init.js` + `tailwind-config.js`，16 页各减 ~28 行，公共脚本入 bump 链）；方案B：`main-entry.js` 599→191 行拆为 4 个 dashboard 组件（stats/activity-panel/taskforce-list/gallery）；修复未登录 user.role 空引用（T-304 方案B 判例） | 公共脚本单一维护源；入口层为调度壳；新增页面不再复制 head 脚本 |
| M6 | ✅ 组件能力化·注册层（2026-08-30）——共享组件注册为能力（`modules/capabilities/components.js`：todo-list/calendar/custom-select，scope:['component']，deps 可声明组件依赖）；registry 支持任意 scope；测试断言 component 过滤；**消费点接入（从清单动态发现组件）留待真实场景逐步启用，避免大面积 import 改造回归** | 组件清单可查（getCapabilities({scope:'component'})）；组件可作能力 deps |
| M7 | ✅ 环境/角色开关·消费点启用（2026-08-30）——registry 已支持 env 过滤（M4）与 requiredRoles 过滤；本轮消费点显式传参启用：dashboard 能力发现传 `env: getRuntimeEnv(), role: AuthStore.getCurrentUser()?.role`（行为零变化，机制对未来的 env/role 差异化能力生效）；测试补 dev/prod env 开关断言 | 能力可按部署形态（static/server）与角色选择性启用 |
| M8 | ✅ 代码减负（2026-08-30，书记：「模块化只见代码增多，少见代码减少」）——①todo-tab 共性化（`todo-tab-shell.js` 抽壳，5 个 tab 1020→373 行）②工作台入口壳化（`workspace-shell.js` 抽壳，6 入口 1022→420 行；导航落点/高亮/抑制参数化）③死代码清理（删 `role-hierarchy.js` -80 行）④M6 接线修复（bootstrap 副作用导入 components.js，组件清单运行时不再为空）；**净减 ~930 行**，npm test 回归全绿（该期基线 52/52，随演进不再维护） | **可持续铁律（书记 2026-08-30）：每个 M 阶段必须伴随净代码减负或持平，禁止纯横向拆分堆叠（防屎山代码）** |

每阶段之间允许长期停留——注册表的价值在 M1 后即可验证，后续阶段按迭代需要推进，不预设完成时间。

---

## 七、与既有文档的关系

| 文档 | 关系 |
|------|------|
| [DATA_MODEL.md](../data/DATA_MODEL.md) + [DATA_FLOW.md](../data/DATA_FLOW.md) | 数据模型/数据流权威源不变；注册化不动数据模型 |
| [SOP_WEB.md](../module/SOP_WEB.md) | SOP-系统联动方法论不变；工作流场景注册化是其延伸（场景清单可查可灰度） |
| [DEPLOYMENT_ROADMAP.md](../deploy/DEPLOYMENT_ROADMAP.md) | 部署四路径不变；M3/M4 依赖后端/小程序路径的环境配置 |
| [ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md) | 核心架构说明；注册表落地后回写为其中一节 |
| 乙部 C-1「JS 组件化」 | 本文档是 C-1 的深化方向——C-1 消除 HTML 硬编码，注册表消除「静态引用」 |
| [KNOWN_PITFALLS.md](../../05_ai_coding/KNOWN_PITFALLS.md) | §13 缓存版本教训为 M2 版本化提供依据 |

---

## 八、远期愿景：工作流块的可视化拖拽编排（开源项目目标 · 书记 2026-09-03 定位）

> **一句话**：让「把支部工作流变成系统功能」这件事，从「改代码」逐步走向「拖积木」——支部按需把工作流块拖进画布、连好顺序，系统据此自动封装为可执行的代码化工作流。

### 8.1 为什么是这个方向

本系统的核心资产不是界面，而是**一套把党建工作流（SOP）代码化的方法论**：决策树引导写入、WorkflowEngine 纯数据驱动、SOP-系统双向映射（SOP_WEB）。三者已经证明「流程可被描述、可被机器执行」。在此基础上，真正的复用瓶颈不再是"能不能写"而是"支部/用户能否自己组合"：

- 不同支部流程不同（本科 vs 硕博、常规 vs 专项），`enabledModules` 勾选已能排列组合（见 [PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md) §2.5）；
- 能力注册表（§四）已经为每个能力单元提供**目录**；
- 缺的最后一块拼图是：一个面向使用者的**可视化编排形态**——把「代码级能力」翻译为「可拖的工作流块」。

### 8.2 目标分层（渐进，不画大饼）

| 层 | 内容 | 状态 |
|---|---|---|
| L1 能力目录化 | 能力注册表 = 全仓能力的单一目录（当前 M1~M4） | 设计中/推进中 |
| L2 支部组合化 | 支部 config.enabledModules 从已注册能力中排列组合（两委会工作流自选） | 已定方向（P1 架构预留） |
| L3 块封装契约 | 把一条 SOP 封装为一个「工作流块」：声明输入（发起角色/必填字段）、阶段（节点与顺序）、产出（待办/通知/归档联动） | 待设计 |
| L4 拖拽编排 | 画布拖拽块 → 连线定顺序/条件 → 导出为版本化工作流定义 JSON（可预览、可回退） | 远期愿景 |
| L5 块市场/分享 | 编排好的工作流块可命名、可导出、可复用于其他支部（开源社区的场景库） | 远期愿景 |

### 8.3 落地时的架构锚点（不新造核心）

- **块 = 注册表中的能力/场景 + 元数据**（块并不独立于现有机制存在）；拖拽产物 = 一段受版本控制的 workflow definitions 数据，继续交给既有 WorkflowEngine/决策树执行，不引入第二套执行引擎。
- **权限与数据同源不因可视化而改变**：块可拖范围仍受角色与支部 config 约束；数据写入仍走 services 层收敛与 persist，界面只是"编排者"而非"新数据通道"。
- **原则：可视化是编辑器形态，不是目的**——目的是降低「把工作流交给代码」的门槛。若某编排超出注册块的能力边界，退回"提需求→代码封装新块"的既有闭环，不追求万能低代码平台（YAGNI）。

### 8.4 与支部配置档案的衔接

支部「配置驱动实例」（PARTY_COMMITTEE_DESIGN §2.5）在未来形态下演进为：**支部管理员在画布上把系统已注册的工作流块拖成本支部的流程组合 → 自动写回 config.enabledModules 与场景清单**——"从已注册能力中勾选"的文本交互升级为"拖积木"的图形交互，数据模型不变。

### 8.5 L3 块封装契约草案 + L4 画布产物映射（原型专项前置 · 2026-09-03）

> 状态：草案，供原型专项落地时收敛；核心原则 = **块不独立于既有机制存在**（块 = 注册能力/场景 + 下述元数据），画布产物 = 一段版本化 workflow 数据，仍交给既有 WorkflowEngine/决策树执行。

**工作流块元数据草案（block manifest）**：

```jsonc
{
  "blockId": "act-organize",            // 对应 capability id 或 scenario id（不新造第三套 id）
  "name": "活动组织块",
  "sopRef": "02_institution/sop/...",  // 制度/SOP 溯源（一改具改锚点）
  "initiatorRoles": ["secretary"],
  "stages": [                          // 阶段即决策树/引擎的阶段序列
    { "id": "create",  "kind": "decision-tree", "outputs": ["activity"] },
    { "id": "assign",  "kind": "engine",        "outputs": ["assignment", "todo"] },
    { "id": "attend",  "kind": "engine",        "outputs": ["attendance"] },
    { "id": "review",  "kind": "engine",        "outputs": ["review"] }
  ],
  "inputs": { "required": ["title", "date"], "optional": ["location", "agenda"] }
}
```

**L4 画布 → 执行的映射（不做第二套引擎）**：拖拽产物 = `{ branchId, version, blocks: [blockId 序列 + 连线/条件] }`，经一次编译收敛为既有 workflow `definitions`（或 scenario 参数）→ WorkflowEngine 消费；权限仍在块粒度上受角色与支部 config 约束。

**原型最小实验范围（YAGNI 边界）**：v0 画布只做「块的**排序/启停**预览」——把一个 scenario 的阶段序列可视化排布、勾选启停并保存回 config.enabledModules（文本勾选 ↔ 画布双向同步）；图形化条件分支、块导出/市场（L5）不在 v0。这样既能拿到"拖积木"的真实手感，又不触碰执行引擎。

---

## 附：本次探索的自我限定

本文档不声明任何「正确性」或「专业性」。它是一份探索记录：评估了现状、指出了差距、给出了一条轻量演进路径。路径是否值得走、M1~M4 是否合理，需要实际迭代与外部评审来检验。唯一确定的是：**迭代一定会发生，而承载迭代的机制越早显式化，迭代成本越低。**
