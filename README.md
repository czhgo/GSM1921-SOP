# GSM1921-SOP

> 光华管理学院本科生党支部组织操作系统（Org OS）
> "管理事，服务人"——将党支部制度文本转化为可执行的代码工作流，让制度从"写在文档里没人看"变成"嵌入系统中必须遵守"。

**公网访问：[https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)**

---

## 一、这是什么？

GSM1921-SOP 是光华管理学院本科生党支部的组织运行操作系统。它解决一个本科生党支部的现实困境：支委换届频繁，经验随人走、制度随人变；新支委上任后需要数月摸索才能上手；同一种工作在不同人手里做法完全不同；上级检查时找不到合规依据。

这个系统的回答是三件事：

1. **制度即代码** — 所有工作流源自 `content/02_institution/sop/` 制度母本，改一处制度，全系统同步
2. **角色即视图** — 同一数据源，不同角色看到不同的工作视角。每个角色只看到自己该看的事，但所有角色的数据来自同一个真相源
3. **经验可传承** — 每一次决策、每一次执行、每一次从错误中长出的教训，都被记录和沉淀。换届不是"从零开始"，而是"站在前人的肩膀上"

整套系统由单页制工作台承载日常使用，由 AI Agent 治理集群持续维护，让制度从文本变成可交互的工具。系统已接入一体化后端（2026-08），账号登录、数据持久化与前端 25 个持久化域全量对称，全链路开发保持同步。

---

## 二、怎么开始用？

**路径一：公网演示（最快体验）**

直接访问 [公网地址](https://czhgo.github.io/GSM1921-SOP/)，无需安装。演示环境使用开发演示账号，适合快速了解系统长什么样。

**路径二：本地完整运行**

如果要体验账号登录、数据持久化等完整能力，在本地运行：

```bash
git clone https://github.com/czhgo/GSM1921-SOP.git
cd server
npm install
npm start
```

然后访问 `http://127.0.0.1:3000/login.html` 登录使用（演示账号见 `server/README.md`）。

**然后呢？**

- 系统主页提供角色选择面板。根据你的身份（党支书、委员、党小组组长或普通成员），进入对应的工作台；普通成员选择"成员工作台"即可查看个人相关信息。
- 工作台是日常使用的工具，但理解"为什么要这样做"需要阅读制度母本和理论文档。第四章按角色给出了阅读路径，第六章讲清了背后的设计理念。

---

## 三、我能用它做什么？

对于支部成员，这套系统提供：

- **活动日历** — 打开系统主页即可看到支部全部活动安排
- **个人考勤查询** — 查看自己的出勤情况
- **个人待办** — 通知、活动、专班自动生成待办事项，提醒你该做什么
- **支委工作透明化** — 查看各支委的工作成果，了解支委在做什么
- **标准流程查阅** — 通过常见工作场景快速指南，了解各类工作的标准做法
- **意见反馈** — 通过系统【意见反馈】入口（`feedback.html`）提交建议

对于支委和党小组组长，系统提供与角色对应的单页制工作台（党建 + 党务 + 待办合一）：

| 角色 | 工作台（党建 + 党务 + 待办合一） |
|------|--------------------------------|
| **党支书** | 全局概况（按维度/按人）、常设赋权、事项管理、通知发布、待办（含待答复收件箱） |
| **组织委员** | 专班建设（招募统筹、定人定责定岗）、考察上传、人才库、发展党员、待办 |
| **宣传委员** | 宣传任务、项目看板、档案归档、周报报送、文件外发确认、待办 |
| **纪检委员** | 考勤管理、考察管理、活动监督复盘、补课制度、公邮管理、待办 |
| **党小组组长** | 本组活动组织、考勤上传、考察上传、复盘提交、组员进展、待办 |
| **普通成员** | 成员工作台（活动动态、项目分工、个人考勤、个人待办） |

同一份数据，不同角色看到不同的视角——谁能看到谁，由赋权链（执行委托）计算得出；党建工作与党务工作都是"管理事，服务人"的工作，统一承载于角色工作台。

---

## 四、我该看什么？

不同角色关心的问题不同，阅读路径也不同。以下按三类角色给出推荐顺序，从最贴近日常使用到最深入的系统治理。

| 角色 | 阅读顺序 |
|------|---------|
| **普通成员** | 本 README → [书记重要论断汇编](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md)（理解支部为什么这样运作）→ [常见工作场景快速指南](content/02_institution/sop/常见工作场景快速指南.md) → 系统工作台 |
| **支委 / 党小组组长** | 本 README → [书记重要论断汇编](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md) → [对应角色的工作流程指南](content/02_institution/sop/INDEX.md) → 系统对应工作台 → [ARCHITECTURE.md](content/03_doc_system/ARCHITECTURE.md)（如需了解架构） |
| **系统维护者** | 本 README → [ARCHITECTURE.md](content/03_doc_system/ARCHITECTURE.md)（核心架构说明）→ [CLAUDE.md](CLAUDE.md)（项目治理文件）→ [server/README.md](server/README.md)（后端服务说明）→ [OPERATIONS_GUIDE.md](content/03_doc_system/OPERATIONS_GUIDE.md) → [DOC_MAP.md](content/03_doc_system/DOC_MAP.md) → [SSOT_INDEX.md](content/03_doc_system/SSOT_INDEX.md)（母本子本注册表） |

如果你带着具体问题而来，下表帮你快速定位权威文档。

| 你想了解... | 看这份文档 |
|------------|----------|
| 项目是什么 | [README.md](README.md)（本文件） |
| 架构是什么 | [ARCHITECTURE.md](content/03_doc_system/ARCHITECTURE.md) — 分层模型、数据模型、变更流水线 |
| 制度在哪 | [content/02_institution/sop/INDEX.md](content/02_institution/sop/INDEX.md) — 各角色工作流程指南导航 |
| 理论在哪 | [SECRETARY_PRONOUNCEMENTS.md](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md) + [DEVELOPMENT_PATH.md](content/01_strategy/DEVELOPMENT_PATH.md) + [content/insights/](content/insights/) |
| 工作流是什么 | [CLAUDE.md](CLAUDE.md) — 项目最高治理文件，定义工作方式、核心原则和运行标准 |
| 系统怎么跑起来 | [server/README.md](server/README.md) — 安装、启动、测试与部署对接 |

---

## 五、出问题怎么办？

**报告问题**

在 GitHub Issues 中创建新 Issue，标题格式建议 `[SOP]/[UI]/[Doc] 简要描述`，标注问题所属的层面。如果是流程改进建议，可通过系统【意见反馈】入口（`feedback.html`）提交，由支部负责人确认后执行全局修复。

**查找已有答案**

支部在长期运行中沉淀了大量经验和决策记录，许多"为什么"的问题已有答案：

- **执行日志**（`.ctx/logs/YYYY-MM-EXECUTION_LOG.md`）记录了每次工作做了什么、改了哪些文件
- **决策日志**（`.ctx/logs/DECISION_LOG.md`）记录了每一次非显而易见决策的背景、选项和理由——理解"为什么选 A 不选 B"
- **经验沉淀**（[content/insights/](content/insights/)）是历届支委集体萃取的组织智慧

制度不是凭空产生的——每一条规则背后都是一次选择。选择意味着放弃，被放弃的方案、被纠正的认知、被淘汰的设计都记录在决策日志中。不了解"为什么不是那样"，就无法真正理解"为什么是这样"。

**术语不明时**

遇到不熟悉的术语（如"党建工作与党务工作""条块二元""专班"等），查阅 [USAGE_POLICY.md](content/03_doc_system/USAGE_POLICY.md)——它是全仓库术语的权威源，所有文档使用的术语都以它为准。

---

## 六、设计理念

这个系统不是工具的堆砌，而是有一套完整的设计理念支撑。以下按"从总纲到具体"的顺序展开：先讲系统为什么存在，再讲设计遵循的元原则与验收标准，最后是支撑运行的具体理念。

### 总纲 · "管理事，服务人"

系统最重要产出不是某个功能模块，而是"从入党申请人到正式党员"的完整叙事。各种发展轨迹的同学都能加入支部，通过组织获得各自的成长；党建工作与党务工作都是"管理事，服务人"的工作，任何一名党员（包括支委会在内）在管理事和服务人两方面都各有职责与成长空间。

→ [DEVELOPMENT_PATH.md](content/01_strategy/DEVELOPMENT_PATH.md)（完整叙事）+ [SECRETARY_PRONOUNCEMENTS.md](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md)（P-045/P-047 元命题）

### 元原则 · 最小三成本

任务流默认直接展示在工作台，不要求用户额外操作才能看到"我需要做什么"。包含三个维度：**信息成本**（获取"我需要做什么"所需的信息搜寻成本）、**操作成本**（从进入工作台到看到可执行事项的点击次数）、**适应学习成本**（新用户理解分工、任务与信息流的学习成本）——系统设计让用户以最低成本完成任务。

→ [DESIGN_SYSTEM.md](content/04_web_design/DESIGN_SYSTEM.md) §一 原则 2

### 验收标准 · 高频零跳转

最小三成本的最终验收标准：**完成一个高频工作需要操作多少次？信息展示与操作是否同地？** 答复类置顶待办、工作概况三区总览、行内填写即发——让"看到"与"操作"在同一可视区域，而不是藏在多层之下。

→ [DESIGN_SYSTEM.md](content/04_web_design/DESIGN_SYSTEM.md) §一 原则 10

### 按人视图 · 知情边界

谁能看到谁，由赋权链（执行委托）计算得出，不靠人工判断——**信息可见性 = 职责空间的投影**。看 ≠ 做：可见性只决定"能看到什么维度"，不授予任何操作权；上级对下级仅"了解进展"与答复，无编辑他人待办入口。这是组织内控的第四道防线（知情边界）。

→ [SECRETARY_PRONOUNCEMENTS.md](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md)（P-015）+ [DESIGN_SYSTEM.md](content/04_web_design/DESIGN_SYSTEM.md) §一 原则 9

### 党建工作与党务工作

**党建工作**是党为保持先进性纯洁性而开展的自我建设（政治建设、思想建设、组织建设、作风建设、纪律建设，并把制度建设贯穿其中；三会一课、主题党日、专班等组织活动归此）；**党务工作**是党内事务的具体管理工作（党员发展、民主评议党员、换届选举、考勤考察等归此）。两者都是"管理事，服务人"的工作，统一承载于角色工作台。

→ [USAGE_POLICY.md](content/03_doc_system/USAGE_POLICY.md) §1.1（术语权威源）

### 专班

跨小组跨职能抽调人手、不限时间不限地点、集中推进某项工作的组织形式。专班是活动之外考察积极分子的载体，赋权是运行支撑机制，工作量记录是运行保障机制；发起是提出需求，招募是统筹执行，两者分离。

→ [COMMISSIONER_FRAMEWORK.md](content/02_institution/COMMISSIONER_FRAMEWORK.md) §A

### 扁平化设计

组织者和深度参与者之间无上下级，只是分工不同；组织者的分工记录职责是做好分工记录，深度参与者承担具体分工。扁平化不等于没有"程序"——分工、流程、记录、复盘依然有规律。

→ [FLAT_DESIGN.md](content/02_institution/FLAT_DESIGN.md)

### 条块二元

"条"与"块"是理解权责关系的方式：从职能视角看，三委员按专业职能分工（条）；从单元视角看，党小组组长按小组划分（块）。谁做什么，由岗位职责定义决定，不由条块推出；书记是条块间的协调节点。

→ [SECRETARY_PRONOUNCEMENTS.md](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md)（P-014）

这些理念不是抽象的口号，而是每一条制度设计背后的理由。理解了它们，才能理解为什么系统是这样组织的，也才能在场景变化时判断原则在什么条件下成立。

→ 完整的理论阐述见 [书记重要论断汇编](content/01_strategy/SECRETARY_PRONOUNCEMENTS.md)（16 条路线级论断，其中 P-045/P-047 为元命题引子）和 [DEVELOPMENT_PATH.md](content/01_strategy/DEVELOPMENT_PATH.md)

---

## 七、系统架构与部署

整套系统由"静态前端 + Node 一体化后端"组成：

| 层 | 位置 | 职责 |
|----|------|------|
| **前台（页面）** | `docs/`（14 个页面：8 个根页面 + 6 个 workspace 工作台） | 页面骨架，零硬编码逻辑 |
| **中台（逻辑）** | `docs/src/entries/`（22 个 entry JS，含 tabs）+ `components/`（23 js + 1 css）+ `core/`（13 个）+ `modules/`（1 个）+ `workflow/`（6 个） | 角色面板路由、视图切换、DOM 渲染 |
| **后台（服务）** | `docs/src/services/`（22 个 service JS）+ `docs/src/mock/`（10 个） | 数据 CRUD、权限计算、持久化 |
| **后端（server/）** | `server/`（Express + better-sqlite3 单进程） | 同源托管静态页面 + `/api/v1` REST（认证 / 25 资源表 / 附件上传 / 快照持久化） |
| **母本层** | `content/02_institution/sop/` | 所有代码逻辑的制度来源 |

数据变更遵循铁律：`content/02_institution/sop/ → docs/src/services/ → docs/src/entries/ → docs/`，所有数据变更必须经过服务层，UI 层禁止直接操作数据源。修改代码前必须确认 SOP 母本已更新。详细架构约束见 [ARCHITECTURE.md](content/03_doc_system/ARCHITECTURE.md)。

**部署方式**

- **公网演示**：GitHub Pages 静态托管 `docs/`（开发演示账号模式，无需后端）
- **本地完整运行**：`cd server && npm start`，访问 `http://127.0.0.1:3000/login.html`，浏览器全链路工作（登录 → API → 数据持久化）
- **北大计算中心对接**：`docs/` 与 `server/` 部署到同一 Web 根目录，统一反向代理转发 `/api/v1/`，见 [server/README.md](server/README.md) 与 [SCHOOL_IT_DEPLOYMENT.md](content/04_web_design/SCHOOL_IT_DEPLOYMENT.md)

---

## 八、迭代路线图

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 — Static OS | ✅ 已完成 | GitHub Pages 静态部署 + 14 页面 MPA + 党建工作与党务工作 |
| Phase 2 — 后端基建 | ✅ 已完成（2026-08） | Node 一体化后端（Express + better-sqlite3）+ 账号认证 + 25 资源表全栈对称 + 数据持久化 |
| Phase 2.5 — 减负空间 | 🔄 分批进行 | 系统性精简工作流冗余环节与信息冗余，持续降低最小三成本（第一批已完成：KPI 异化修复 / 文件流闭环 / 金色统一 / 切换冗余清理） |
| Phase 3 — Workflow Engine | 规划中 | 工作流自动实例化 + 提醒推送 + 审计报告 |

---

## License

This project is licensed under the [MIT License](LICENSE).
