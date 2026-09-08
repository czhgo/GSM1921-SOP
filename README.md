# GSM1921-SOP

制度即代码的组织运行系统模板——面向党支部与学生组织的「制度可执行化」引擎。

- **支部成员版（组织内部使用）**：[README-members.md](README-members.md)

MIT · Node ≥22 · 无构建步骤前端 · 纯本地数据可离线

---

## 这是什么

GSM1921-SOP 是把组织制度文本转化为可执行代码工作流的运行系统模板：制度写在文档里"没人看"，嵌入系统后则"必须遵守"——让日常运行有章可循、有据可查、换届不散。

三个核心设计：

1. **制度即代码** —— 制度文本（`content/02_institution/sop/`）是唯一母本，改一处制度，全系统同步
2. **角色即视图** —— 同一数据源按角色投影：谁能看到谁由权限链计算，看 ≠ 做，每个角色只看到自己该看的事
3. **经验可传承** —— 决策、执行、复盘全程留痕（`.ctx/` 日志），换届不必"从零开始"，而是站在前人的肩膀上

**别的组织可以用它做什么？** 它不是某个组织的专属系统，而是一套把「组织运行规则」变成「成员每天会用到的工具」的模板——你可以直接获得：

- **制度被真正执行**：会议制度、议事规则、考勤补课、材料归档等以工作流形式嵌入日常操作，成员"做事的流程"就是"制度要求的流程"，无需另读文件
- **角色化工作台**：书记/委员/组长/成员各自一个单页工作台，功能与待办合一；同一数据不同视角，谁该看到什么由授权链决定
- **议事与留痕闭环**：议程打磨 → 发布 →（线上异步）表决 → 记录决议 → 自动归档/后续动作派发；每一次决策都有据可查
- **成员成长链路**：发展培养、考察、汇报、考勤与补课、档案归档一条链，面向"人"而非"表格"
- **可复用的协作件**：活动、通知、专班、任务分工、意见反馈等通用件，组织可直接取用
- **持续演进的可能性**：能力目录化 → 组织按需组合 → 工作流块化 → 最终在界面上拖拽编排并跨组织分享复用（详见 [复用与二次开发](#复用与二次开发给其他组织)）

仓库默认随附一套**示例组织**（一个本科生党支部）的完整人员数据、制度文本与主题配置，用于开箱即跑、完整演示——但它只是可替换的默认值：按下方 [复用与二次开发](#复用与二次开发给其他组织) 的入口替换，即可用于党支部、班团、社团等各类学生组织。该示例组织的内部细节与成员阅读路径见 [README-members.md](README-members.md)。

---

## 复用与二次开发（给其他组织）

> 这个仓库的全部价值在于**可复用**：先跑起来 → 换数据 → 换角色/配色/术语 → 组合功能 → 深度二次开发。每一步都有正式入口——**替换默认值即换组织**，不必改动系统骨架。

### 你能怎么用（按投入从小到大）

1. **开箱即用当模板库** —— 制度如何被写进工作流、角色工作台怎么组织、界面交互怎么做，全部可直接借鉴（零代码）。
2. **演示即内测** —— 只替换组织数据后跑起来，先给自己的组织试运行（最常见的用法）。
3. **组合定制** —— 按需启停/排序功能模块与活动产出块（内置「工作台配置」清单 + 画布，见 [docs/src/entries/tabs/party-committee/party-config-tab.js](docs/src/entries/tabs/party-committee/party-config-tab.js)）。
4. **深度二次开发** —— 换角色与权限模型、换术语与主题、接自己的后端或继续使用内置 Node API，并把「工作流块 → 界面拖拽编排 → 跨组织分享」的长期路线跑完。

### 替换入口总表

| 要换什么 | 替换入口 |
|---------|---------|
| 组织数据（人员/活动/通知/专班/考勤/档案） | [docs/src/mock/](docs/src/mock/) 数据文件（整体替换即换组织）；服务端种子 [server/seed.js](server/seed.js) 复用同一份数据 |
| 角色与权限 | 角色清单单一事实源 [docs/src/core/constants.js](docs/src/core/constants.js)；权限矩阵 [content/02_institution/SYSTEM_ROLE_PERMISSION.md](content/02_institution/SYSTEM_ROLE_PERMISSION.md)；部署形态切换 [docs/src/config/deploy.js](docs/src/config/deploy.js) |
| 主题配色 | 色彩令牌与品牌色：[docs/src/styles.css](docs/src/styles.css) + constants.js；规范与「固定/可调」口径见 [content/04_web_design/design-system/COLOR_SYSTEM.md](content/04_web_design/design-system/COLOR_SYSTEM.md) |
| 术语与制度 | 术语权威源 [content/03_doc_system/USAGE_POLICY.md](content/03_doc_system/USAGE_POLICY.md)；制度母本 [content/02_institution/](content/02_institution/)（`sop/` 为角色工作流指南）；策略/设计/方法论文档分层见 content/ |
| 业务默认（阈值/名单，可调=分支默认/固定=制度裁决） | [docs/src/core/policy-defaults.js](docs/src/core/policy-defaults.js) |
| 功能模块组合 | 能力注册表（功能 = 能力声明 register/get/mount，台内 tab 组合 + 支部 config.modules/blocks 启停排序）；模块组合声明契约（depends/conflictsWith）见 [docs/src/core/module-compose.js](docs/src/core/module-compose.js) |
| 后端与部署 | [server/README.md](server/README.md)；环境变量模板 [server/.env.example](server/.env.example)；数据源 adapter（本地 mock ↔ REST API）见 [docs/src/core/](docs/src/core/) |

### 给新组织：30 分钟换壳指南

> 本仓库是**模板型**交付：系统骨架（分层 / 能力注册表 / 工作流块 / 权限链）不动，只替换默认值即换组织。下面按「先跑 → 换数据 → 换角色/术语/配色/默认 → 换支部名与分支配置 → 验证」五步走完上表全部替换入口（组织内的逐项替换示例见 [README-members.md 九、复用与二次开发（给其他组织）](README-members.md#九复用与二次开发给其他组织)）。

**步骤 1 —— clone 并跑起来（约 5 分钟）**

```bash
git clone https://github.com/czhgo/GSM1921-SOP.git
cd GSM1921-SOP/server
npm install
npm start
```

打开 `http://127.0.0.1:3000/login.html`，用 [docs/src/mock/accounts.js](docs/src/mock/accounts.js) 中的演示账号登录（如书记 储子禾：学号 `2300010001` / 密码 `123456`）。
- 验证点：顶栏品牌显示支部名「光华管理学院本科生党支部」；不改代码直接开公网演示 <https://czhgo.github.io/GSM1921-SOP/> 可先看效果。

**步骤 2 —— 换数据：整体替换 [docs/src/mock/](docs/src/mock/)（约 10 分钟）**

组织数据全部集中在 `docs/src/mock/`，关键文件清单：

| 文件 | 内容 |
| --- | --- |
| [people.js](docs/src/mock/people.js) | 成员名单（姓名/学号/党小组/发展阶段/角色；滞留党员可选标注 `residenceStatus`，见文件头注释） |
| [accounts.js](docs/src/mock/accounts.js) | 登录演示账号（学号 + 密码 + personId 映射） |
| [activities.js](docs/src/mock/activities.js) | 活动种子（三会一课 / 主题党日 / 品牌活动） |
| [attendance.js](docs/src/mock/attendance.js) / [inspection.js](docs/src/mock/inspection.js) | 考勤 / 考察记录种子 |
| [notices.js](docs/src/mock/notices.js) / [taskforces.js](docs/src/mock/taskforces.js) | 通知 / 专班种子 |
| [seed.js](docs/src/mock/seed.js) | 任务分工 / 档案归档 / 报名种子 |
| [thought-reports.js](docs/src/mock/thought-reports.js) / [review.js](docs/src/mock/review.js) | 思想汇报 / 复盘材料种子 |

服务端种子 [server/seed.js](server/seed.js) 复用同一份数据——只换前端 `mock/` 即可，启动 server 后同源生效，无需前后端各换一遍。
- 验证点：重跑后各工作台的成员 / 活动 / 通知 / 专班列表显示你的数据；用你自己的 `accounts.js` 账号可登录。

**步骤 3 —— 换角色 / 权限 / 术语 / 配色 / 业务默认（约 10 分钟）**

- 角色与权限：角色清单单一事实源 [docs/src/core/constants.js](docs/src/core/constants.js)；权限矩阵 [content/02_institution/SYSTEM_ROLE_PERMISSION.md](content/02_institution/SYSTEM_ROLE_PERMISSION.md)；部署形态切换 [docs/src/config/deploy.js](docs/src/config/deploy.js)。
- 术语与制度：制度母本 [content/02_institution/](content/02_institution/)（`sop/` 为角色工作流指南）；术语权威源见 [content/03_doc_system/USAGE_POLICY.md](content/03_doc_system/USAGE_POLICY.md)。
- 配色：色彩令牌与品牌色在 [docs/src/styles.css](docs/src/styles.css) + constants.js；「固定 / 可调」口径见 [content/04_web_design/design-system/COLOR_SYSTEM.md](content/04_web_design/design-system/COLOR_SYSTEM.md)（党建红 / 党徽金为制度固定，勿改）。
- 业务默认（阈值 / 应到名单口径 / 考察超期天数等）：集中在 [docs/src/core/policy-defaults.js](docs/src/core/policy-defaults.js)，逐项标注 `branch-default`（支部可调）或 `institutional`（制度固定，改须书记裁决）。
- 验证点：改 `policy-defaults.js` 的票决门槛 / 应到名单口径后重跑，表决判定与会务「应到」人数按新值生效。

**步骤 4 —— 换支部名字与分支配置（约 5 分钟）**

- 支部名：示例支部在 [docs/src/mock/branches.js](docs/src/mock/branches.js)（`br-b1`：`name` + `config.headerTitle`，改支部名即同步顶栏品牌）。
- 分支配置（支部自治组合）：`config.modules`（tab 启停 / 排序）、`config.blocks`（工作流块）、`config.workforce`（分工归属）；支部书记工作台有可视化「工作台配置」入口（[docs/src/entries/tabs/party-committee/party-config-tab.js](docs/src/entries/tabs/party-committee/party-config-tab.js)）。
- 验证点：顶栏显示新支部名；在「工作台配置」隐藏某模块后对应 tab 消失，直达该 tab 的链接自动回退到首个可见 tab（tab-nav 守卫）。

**步骤 5 —— 验证（约 5 分钟）**

```bash
cd server && npm test
```

- 链接完整性基线（[server/test/link-integrity.test.mjs](server/test/link-integrity.test.mjs)）守护全站链接与锚点——改动文件/文档结构后必跑。
- 检查应到名单：登录后进会议 / 表决相关页，「应到」口径 = 正式党员 + 预备党员且非滞留（派生自 [docs/src/core/policy-defaults.js](docs/src/core/policy-defaults.js) 的 `attendance.roster`；滞留示范见 [docs/src/mock/people.js](docs/src/mock/people.js) 的 p5 / p9 `residenceStatus`）。替换成员数据后若口径不同，改 `partyStages / excludeDetained` 即可，不必改页面代码。
- 冒烟建议：先按 [快速开始](#快速开始) 的 `?reset=1` 说明验证一键重置链路（重置后应回到种子初始态），再做你的替换，防止把演示残留误当自己的数据。

### 可能性（长期演进主线）

把工作流封装为可复用的代码块，由各组织按自己的实际工作流排列组合，最终在界面上拖拽编排、跨组织分享复用（能力目录化 → 组织组合化 → 块封装契约 → 拖拽编排 → 块分享复用）。设计方向见 [ARCHITECTURE_EVOLUTION.md §八](content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md)，当前模块化/插件化/开源化成熟度与行动项见 [MODULARIZATION_ASSESSMENT.md](content/04_web_design/evolution/MODULARIZATION_ASSESSMENT.md)。

### 关于随附示例组织

仓库默认随附一套**本科生党支部**的完整演示数据（人物均为虚构姓名）与制度文本，用于开箱演示；**它不是本系统的"官方组织"**——换掉数据与配置即可清零重来。示例组织成员视角的使用说明（角色分工、阅读路径、内部制度细节）见 [README-members.md](README-members.md)；组织内的逐项替换示例见其 [九、复用与二次开发（给其他组织）](README-members.md#九复用与二次开发给其他组织)。

---

## 快速开始

**公网演示（最快体验）**

直接打开 [https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)，无需安装。演示环境使用开发演示账号，适合快速了解系统长什么样（演示账号见 [docs/src/mock/accounts.js](docs/src/mock/accounts.js)，请勿用于生产）。

> 提示：演示数据可随时恢复初始态——访问地址后加 `?reset=demo`（或历史别名 `?reset=1`，如 `https://czhgo.github.io/GSM1921-SOP/?reset=1`，本地任意页面如 `http://127.0.0.1:3000/index.html?reset=1`），即清除本浏览器的演示存储、回到种子初始态（仅作用于浏览器内的演示数据，不影响正常加载）。如需只清「运行时预览/草稿」而**不动演示数据本体**（如换组织向导草稿 `wizard-draft-*`、成员名册预览），用 `?reset=preview`。若已完成演示 / 试用、准备**正式投入使用前的干净起步**，用 `?reset=init` 一键初始化为「新支部初始态」——清空试用积累的业务过程数据（活动 / 考勤 / 考察 / 专班 / 通知 / 汇报 / 议程决议跟进 / 归档 / 交接 / 意见反馈提交等），**保留组织骨架**：账号与角色结构、成员档案、支部配置 / 分工 / 术语、成员在册状态与主题外观（已配好的壳不丢、过程数据清零、空支部起步）。**登录后端（API 模式）后三档均不生效**——数据以服务器为权威，不清登录会话与远端数据；API 模式的「重置 / 初始化」= 删除 `server/data.db` 后重启自动重种（或 `DISABLE_SEED=1` 全新空库起步），或走管理端清理。

**本地完整运行**

如需体验账号登录、数据持久化等完整能力，在本地运行（需要 Node ≥ 22）：

```bash
git clone https://github.com/czhgo/GSM1921-SOP.git
cd server
npm install
npm start
```

然后访问 `http://127.0.0.1:3000/login.html` 登录使用。服务端环境变量模板见 [server/.env.example](server/.env.example)（均有缺省，未配置即可本地演示运行）；安装/启动/测试/部署对接详见 [server/README.md](server/README.md)。

---

## 功能与结构

**功能速览**

- 角色工作台：书记、委员、党小组组长、普通成员各有与职责对应的单页工作台，功能与待办合一
- 组织运行：活动与三会一课、会议议程、通知发布、线上异步表决、民主评议与换届
- 成员发展：发展党员、思想汇报、考察与考勤、补课制度、人才库
- 协作推进：专班（发起 / 招募 / 定人定责定岗）、任务分工与复盘、意见反馈
- 事务沉淀：宣传任务与周报、支部文件与归档、个人待办与个人考勤

完整功能地图（mermaid）见 [README-members.md](README-members.md)（支部成员版）。

**目录结构**

```
.
├── docs/                  # 前端：单页工作台（纯静态、无构建步骤，可直接托管）
│   └── src/
│       ├── entries/       # 页面入口与角色工作台路由
│       ├── components/    # 视图组件
│       ├── core/          # 常量、主题、能力注册表、数据适配
│       ├── services/      # 数据 CRUD 与权限计算（UI 层禁止直改数据源）
│       ├── mock/          # 演示数据（整体替换即可换组织）
│       └── workflow/      # 工作流块（SOP → 可执行）
├── content/               # 制度母本与设计文档（01_strategy 战略 / 02_institution 制度 / 03_doc_system 文档治理 / 04_web_design 设计 / 05_ai_coding 协作方法论 / insights 经验沉淀）
├── server/                # Node 一体化后端（Express + better-sqlite3）：同源托管 + /api/v1 REST + 测试套件
├── .ctx/                  # 运行上下文：执行日志、决策日志、快照（审计底座）
├── CLAUDE.md              # AI 协作治理文件（Vibe Coding 协作约定）
├── CONTRIBUTING.md        # 工程纪律与提交约定
└── LICENSE                # MIT
```

---

## 开发与验证

- **AI Vibe Coding 协作**：本仓库以「人 + AI 结对」方式协作维护与迭代，治理约定见 [CLAUDE.md](CLAUDE.md)；工程纪律与提交约定见 [CONTRIBUTING.md](CONTRIBUTING.md)；知识型文档导航见 [content/03_doc_system/DOC_MAP.md](content/03_doc_system/DOC_MAP.md)。
- **测试**：`cd server && npm test` —— node:test 全量套件随 `server/test/` 增长（单元/集成/审计/E2E）。纯 Node 部分沙箱环境即可运行；浏览器类/E2E（Playwright）需在常规终端运行（详见 [server/README.md](server/README.md) 测试说明）。
- **链接完整性基线**：`server/test/link-integrity.test.mjs` 守护全站链接（HTML href/src、JS 跳转、content/ 文档相对链接与锚点）；改动文件结构后跑一次全量测试确认无死链、锚点可解析。

---

## License

This project is licensed under the [MIT License](LICENSE).

参与开发请先读 [CONTRIBUTING.md](CONTRIBUTING.md)（工程纪律与提交约定）。

---

## 支部成员版章节索引

> 历史正文（原根 README 九个章节，含示例组织的制度与角色细节）已整体迁至 [README-members.md](README-members.md)。为兼容既有文档中指向根 README 历史章节锚点的链接（形如 `README.md#四我该看什么`），以下八个与原九章同名的标题在本页保留占位、仍可解析；正文以成员版为准。**「九、复用与二次开发」以本文上方同名核心章节为准（给其他组织）**，成员版对应章节保留组织内部视角的逐项示例。

### 一、这是什么？

→ 正文见 [README-members.md#一这是什么](README-members.md#一这是什么)

### 二、怎么开始用？

→ 正文见 [README-members.md#二怎么开始用](README-members.md#二怎么开始用)

### 三、我能用它做什么？

→ 正文见 [README-members.md#三我能用它做什么](README-members.md#三我能用它做什么)

### 四、我该看什么？

→ 正文见 [README-members.md#四我该看什么](README-members.md#四我该看什么)

### 五、出问题怎么办？

→ 正文见 [README-members.md#五出问题怎么办](README-members.md#五出问题怎么办)

### 六、设计理念

→ 正文见 [README-members.md#六设计理念](README-members.md#六设计理念)

### 七、系统架构与部署

→ 正文见 [README-members.md#七系统架构与部署](README-members.md#七系统架构与部署)

### 八、迭代路线图

→ 正文见 [README-members.md#八迭代路线图](README-members.md#八迭代路线图)

### 九、复用与二次开发（给其他组织）

→ 正文见 [README-members.md#九复用与二次开发给其他组织](README-members.md#九复用与二次开发给其他组织)
