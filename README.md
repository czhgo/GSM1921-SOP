# GSM1921-SOP

> 光华管理学院本科生党支部组织操作系统（Org OS）
> 将党支部制度文本转化为可执行的代码工作流，让制度从"写在文档里没人看"变成"嵌入系统中必须遵守"。

**公网访问：[https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)**

---

## 快速上手

> 无论你是支委、党小组组长还是普通支部成员，这个系统都和你有关。

**打开网页**：访问 [公网地址](https://czhgo.github.io/GSM1921-SOP/) 或本地双击 `docs/index.html`

### 支部成员能做什么

| 你想做的事 | 怎么做 |
|-----------|--------|
| 查看活动日历 | 打开网页 → 直接看到主页日历 |
| 查自己的考勤出勤 | 党建工作台 → 成员只读 → 查看个人考勤 |
| 了解支委都在做什么 | 党建工作台 → 成员只读 → 查看各支委工作成果 |
| 提意见或反馈 | [SOP 优化提案反馈卡](content/references/工作模板/FEEDBACK_FORM.md) 或网页【意见反馈】 |
| 查阅标准流程 | [常见工作场景快速指南](content/SOP/常见工作场景快速指南.md) |

### 支委和组长能做什么

| 角色 | 手册 | 网页入口 |
|------|------|---------|
| 组织委员 | [组织委员工作流程指南](content/SOP/组织委员工作流程指南.md) | 党建工作台 → 组织委员 / 党务管理 → 组织委员 |
| 宣传委员 | [宣传委员工作流程指南](content/SOP/宣传委员工作流程指南.md) | 党建工作台 → 宣传委员 / 党务管理 → 宣传委员 |
| 纪检委员 | [纪检委员工作流程指南](content/SOP/纪检委员工作流程指南.md) | 党建工作台 → 纪检委员 / 党务管理 → 纪检委员 |
| 党小组组长 | [党小组组长工作手册](content/SOP/党小组组长工作手册.md) | 党建工作台 → 党小组组长 |
| 党支书 | [常见工作场景快速指南](content/SOP/常见工作场景快速指南.md) + [定人定责定岗说明](content/SOP/支委与党小组定人定责定岗说明.md) | 党建工作台 → 党支书 |
| 组织者/深度参与者 | 经赋权后进入对应工作台 | 党建工作台 → 组织者/深度参与者 |

---

## 这个项目在解决什么问题

一个本科生党支部的现实困境：支委换届频繁，经验随人走、制度随人变；新支委上任后需要数月摸索才能上手；同一种工作在不同人手里做法完全不同；上级检查时找不到合规依据。

我们的回答是三件事：

1. **制度即代码** — 所有工作流源自 `content/SOP/` 制度母本，改一处制度，全系统同步
2. **角色即视图** — 同一数据源，不同角色看到不同的工作切面。每个角色只看到自己该看的事，但所有角色的数据来自同一个真相源
3. **经验可传承** — 每一次决策、每一次执行、每一次从错误中长出的教训，都被记录和蒸馏。换届不是"从零开始"，而是"站在前人的肩膀上"

### 双域管理理论

本系统最核心的理论贡献——将党支部工作划分为两个本质不同的域：

| 域 | 本质定义 | 判断标准 | 典型工作 |
|----|---------|---------|---------|
| **党建工作** | 创新探索——面向"尚不存在的未来" | 是否允许创造性发挥、探索边界？ | 主题党日策划、品牌认定、专班组建 |
| **党务工作** | 合规运行——面向"已存在的存量" | 是否要求符合规定、纪律严明？ | 党员发展流程、补课制度、档案归档 |

两者不是"管人"和"管事"的区别，而是**工作者心智模式**的区别——党建域中大脑处于"探索模式"，党务域中大脑处于"执行模式"。

→ 详细理论见 [经验沉淀](content/insights/党支部管理与实务经验沉淀.md) §1

---

## 仓库导航

### 制度与流程（SOP）

党支部工作的制度母本。所有代码逻辑和网页功能的制度来源。

| 文件 | 给谁看 | 一句话说明 |
|------|--------|-----------|
| [常见工作场景快速指南](content/SOP/常见工作场景快速指南.md) | 所有人 | 常见工作场景的快速操作指南 |
| [组织委员工作流程指南](content/SOP/组织委员工作流程指南.md) | 组织委员 | 组织委员职责与活动创建流程 |
| [宣传委员工作流程指南](content/SOP/宣传委员工作流程指南.md) | 宣传委员 | 宣传委员职责与宣传档案制度流程 |
| [纪检委员工作流程指南](content/SOP/纪检委员工作流程指南.md) | 纪检委员 | 纪检委员职责与考勤管理流程 |
| [党小组组长工作手册](content/SOP/党小组组长工作手册.md) | 党小组组长 | 块块组长专用操作指南 |
| [支委与党小组定人定责定岗说明](content/SOP/支委与党小组定人定责定岗说明.md) | 支委会 | 人员结构、双重身份体系及条块双线管理 |

### 经验沉淀与决策记录

> **这是本仓库最有价值的部分之一。** 制度和代码会随届迭代，但探索的历史和书记强力判定背后所隐藏的——对于支部建设理想状态的设想——才是真正可跨届传承的智慧。

| 文件 | 一句话说明 |
|------|-----------|
| [经验沉淀](content/insights/党支部管理与实务经验沉淀.md) | 历届支委集体萃取的组织智慧白皮书——道/术/器三层架构，含双域管理理论、专班制、决策树、赋权链等核心经验 |
| [决策日志](.ctx/logs/DECISION_LOG.md) | 每一次非显而易见的决策的完整记录——为什么选 A 不选 B，影响范围是什么 |
| [执行日志](.ctx/logs/2026-05-EXECUTION_LOG.md) | 每次工作的操作记录——做了什么、改了哪些文件、结果如何 |

**为什么决策日志如此重要？** 因为制度不是凭空产生的——每一条规则背后都是一次选择。选择意味着放弃——放弃的方案、被纠正的认知、被淘汰的设计，都记录在决策日志中。不了解"为什么不是那样"，就无法真正理解"为什么是这样"。

### 设计理念（Guides）

> 不管对应功能有没有完成，设计理念始终存在，作为知识留存。

| 目录 | 内容 | 核心文件 |
|------|------|---------|
| [governance/](content/guides/governance/) | 治理规范——术语标准、角色分类、文档导航 | [TERMINOLOGY.md](content/guides/governance/TERMINOLOGY.md)、[DOC_MAP.md](content/guides/governance/DOC_MAP.md) |
| [architecture/](content/guides/architecture/) | 架构设计——数据模型、权限矩阵、管理模式 | [DATA.md](content/guides/architecture/DATA.md)、[MANAGEMENT_MODE.md](content/guides/architecture/MANAGEMENT_MODE.md) |
| [design/](content/guides/design/) | 功能设计——委员系统、日历、SOP 联动、品牌属性标签 | [COMMISSIONER_SYSTEM.md](content/guides/design/COMMISSIONER_SYSTEM.md)、[SOP_WEB.md](content/guides/design/SOP_WEB.md) |

### 模板与参考

| 目录 | 内容 |
|------|------|
| [工作模板/](content/references/工作模板/) | 可复用模板：经验沉淀辅助提示词、SOP 优化提案反馈卡 |
| [合规文件/](content/references/合规文件/) | 党章、党支部工作规范、发展党员工作细则等上级文件 |
| [历史会议材料/](content/references/历史会议材料/) | 党小组会议记录、支委工作手册、SOP 流程图等历史资料 |

### 治理与架构文件

| 文件 | 一句话说明 |
|------|-----------|
| [CLAUDE.md](CLAUDE.md) | 项目最高治理文件（Harness）——工作流、理论基石、运行标准、待办事项 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 核心架构说明——分层模型、数据模型、变更流水线 |
| [SSOT_INDEX.md](SSOT_INDEX.md) | 单一权威源索引——母本与子本的映射关系 |

---

## 技术架构

### 前中后台分层

| 层 | 位置 | 职责 |
|----|------|------|
| **前台（UI）** | `docs/`（含 `workspace/` 和 `party/` 子目录，19 页面） | 页面骨架，零硬编码逻辑 |
| **中台（路由+渲染）** | `docs/src/entries/`（18 个 entry JS） | 角色面板路由、视图切换、DOM 渲染 |
| **后台（服务层）** | `docs/src/services/`（7 个 service JS） | 数据 CRUD、权限计算、持久化（localStorage） |
| **母本层** | `content/SOP/` | 所有代码逻辑的制度来源 |

### 代码结构

```
docs/src/
├── components/        # 可复用 UI 组件（header, sidebar, calendar, role-selector...）
├── core/              # 核心工具（constants, state, domain, utils, id...）
├── entries/           # 每个页面的入口 JS（18 个，对应 18 个 HTML 页面）
├── mock/              # Mock 数据（activities, attendance, taskforces, people...）
├── modules/           # 业务模块（party, references）
├── services/          # 服务层（auth, feedback, roles, runtime, taskforce...）
└── workflow/          # 工作流引擎（definitions, engine, renderer, sop...）
```

### 技术栈

- 纯前端静态架构 — 无需后端部署，GitHub Pages 直接托管
- ES Modules — 无构建工具、零打包依赖
- Tailwind CSS CDN — 原子化样式引擎
- sessionStorage / localStorage — 跨页面状态持久化
- Custom Events — 组件间解耦通信
- 多页面应用（MPA）— 19 个独立 HTML 页面

### 数据变更铁律

```
content/SOP/ → docs/src/services/ → docs/src/entries/ → docs/（含 workspace/ 和 party/）
```

- 所有 mutation 必须经过 Service 层，UI 层禁止直接操作 Store
- 修改代码前必须确认 SOP 母本已更新
- 详细架构约束见 [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Harness 工程与 Context 工程

> 这套方法论是本项目最重要的工程经验之一——它解决了"AI 辅助项目中，如何让上下文持续有效"的核心问题。

### Harness 工程：用宪法治理项目

`CLAUDE.md` 甲部（Harness）是项目的"宪法"——定义工作方式、核心原则和运行标准。它的设计哲学是：

- **稳定不变**：甲部修改须经书记确认，且必须一改具改（修改一项原则，全仓库所有引用同步更新）
- **常为新的**：乙部（执行事项）完成即删，补充新项——上下文只保留当前待办，不堆积历史
- **待决策上交**：丙部（待决策事项）确保 AI 不自行决定需要书记判断的事项

这种设计的核心洞察是：**AI 每次会话都是"失忆"的。** 与其让 AI 从历史中推断，不如用结构化的治理文件确保每次会话都能获得精确的上下文。

### Context 工程：让上下文持续有效

`.ctx/` 目录承载运行记录，设计原则是：

- **执行日志**（`EXECUTION_LOG`）：记录"做了什么"——操作步骤、修改文件、产出物
- **决策日志**（`DECISION_LOG`）：记录"为什么这样做"——决策背景、选项分析、最终决定
- **快照**（`SNAPSHOT`）：仅在特定触发条件下更新（大版本升级、用户指令、阶段收官），不每次执行都更新
- **时间戳**（`TIMESTAMPS`）：周期性任务到期检查

关键经验：**日常变更由执行日志和决策日志承载，而非快照。** 快照是"系统状态的照片"，日志是"系统变化的录像"——前者重、后者轻，日常用轻量方案。

→ 详细经验见 [经验沉淀](content/insights/党支部管理与实务经验沉淀.md) §7~§8

---

## 页面功能一览

### 全局导航结构

```
主页（index.html）
├── 党建工作台（workspace/index.html → 角色选择面板）
│   ├── 党支书工作台（workspace/secretary.html）
│   ├── 党小组组长工作台（workspace/leader.html）
│   ├── 组织者工作台（workspace/organizer.html）
│   ├── 深度参与者工作台（workspace/deep.html）
│   ├── 组织委员工作台（workspace/org.html）
│   ├── 宣传委员工作台（workspace/prop.html）
│   ├── 纪检委员工作台（workspace/disc.html）
│   └── 成员只读面板（workspace/visitor.html）
├── 党务管理（party/index.html → 角色选择面板）
│   ├── 党支书面板（party/secretary.html）
│   ├── 组织委员面板（party/org.html）
│   ├── 宣传委员面板（party/prop.html）
│   └── 纪检委员面板（party/disc.html）
├── 归档库（archive.html）
├── 资料查询（search.html）
├── 意见反馈（feedback.html）
└── 关于（about.html）
```

### 三委员双域职责

| 委员 | 党建工作台 | 党务管理 |
|------|-----------|---------|
| **组织委员** | 专班建设（招募统筹·定人定责定岗） | 党员发展全流程（考察/催缴/归档） |
| **宣传委员** | 活动与专班视图（宣传材料/周报） | 宣传档案合规建设（模板/制度） |
| **纪检委员** | 考勤管理（基础）·考察管理（进阶）·活动监督复盘 | 补课制度/公邮管理 |

---

## 迭代路线图

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 — Static OS | ✅ 已完成 | GitHub Pages 纯静态部署 + 19 页面 MPA + 双域管理 |
| Phase 2 — Supabase Backend | 规划中 | 后端接入 + 用户认证 + 实时同步 |
| Phase 3 — Workflow Engine | 规划中 | Task 自动实例化 + 提醒推送 + 审计报告 |

---

## 开源协作

欢迎参与本项目的改进！

### 报告问题

1. 在 GitHub Issues 中创建新 Issue
2. 标题格式：`[SOP]/[UI]/[Doc] 简要描述`

### 提交流程改进

1. 填写 [SOP 优化提案反馈卡](content/references/工作模板/FEEDBACK_FORM.md)
2. 书记确认后执行全局修复

### 代码规范

- 原生 ESM，无构建工具，GitHub Pages 直接静态托管
- 所有数据变更必须经过 Service 层，UI 层禁止直接操作 Store
- 详细架构约束见 [ARCHITECTURE.md](ARCHITECTURE.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
