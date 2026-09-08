# GSM1921-SOP

制度即代码的组织运行系统模板——面向党支部与学生组织的「制度可执行化」引擎。制度写在文档里"没人看"，嵌入系统后则"必须遵守"：日常运行有章可循、有据可查、换届不散。

- **支部成员版（组织内部使用·使用者视角）**：[README-members.md](README-members.md)
- **后端服务说明**：[server/README.md](server/README.md)

MIT · Node ≥ 22 · 原生 ESM（无打包器/无构建步骤）· 纯本地数据可离线 · 可选 Node 一体化后端

---

## 一、这是什么

三个核心设计：

1. **制度即代码** —— 制度文本（`content/02_institution/sop/`）是唯一母本，改一处制度，全系统同步
2. **角色即视图** —— 同一数据源按角色投影：谁能看到谁由权限链计算，看 ≠ 做，每个角色只看到自己该看的事
3. **经验可传承** —— 决策、执行、复盘全程留痕（`.ctx/` 过程记录），换届不必"从零开始"

仓库默认随附一套**示例组织**（本科生党支部）的完整人员数据、制度文本与主题配置，用于开箱即跑、完整演示——它只是可替换的默认值。完整功能地图（mermaid）见 [README-members.md](README-members.md)。

---

## 二、功能说明

### 2.1 页面构成：11 根页 + 7 工作台（共 18 页）

| 类型 | 页面 | 用途 |
|------|------|------|
| 根页（11） | [index.html](docs/index.html) / [login.html](docs/login.html) | 首页 / 登录（登录直达对应角色工作台「今天」页） |
| | search / feedback / archive | 资料查询（含支部文件） / 意见反馈 / 归档库 |
| | activity / taskforce / notice | 活动与会议详情 / 专班详情 / 通知 |
| | wizard / help / about | 支部配置向导（5 步） / 帮助手册 / 关于 |
| 工作台（7） | secretary.html | 书记工作台（书记 / 副书记**共台**） |
| | org / prop / disc | 组织 / 宣传 / 纪检委员工作台 |
| | leader / visitor | 党小组组长 / 成员工作台 |
| | party-committee.html | **党委工作台**（组织级：监控全院支部、管理支部实例，不参与支部内部闭环） |

### 2.2 工作台的通用结构

登录后直达对应工作台并落在「**今天**」页（置首 tab = 登录落点）；各工作台 tab 按「工作台 → 党建（职责）→ 反馈 → 对接党委」分组：

- **今天** — 只读速览（今天有会 / 今天到期 / 今日分工），全部点击 ≤1 跳直达处理处
- **待办** — 页顶「未读通知 N 条」轻量条 + **9 个工作域折组**：①会务 ②活动/项目 ③考勤纪律 ④考察 ⑤成员发展 ⑥专班 ⑦决议上报 ⑧归档宣传 ⑨汇报反馈（实时提醒组并入对应域）；域内提供批量确认，如「成员发展」域批量勾选确认/退回成员变更（发展阶段/在册状态/移出）
- **工作概况** — 汇报 / 卡点 / 在办三区总览（书记台为「全局概况」，按维度/按人）
- **党建职责 tab 群** — 各角色职责域（见下）
- **我的处置** — 意见反馈 / 汇报的收件处理位（组长台为「组员进展」内待答复）

### 2.3 书记工作台（书记 / 副书记共台）

全局概况、活动管理（会务日历）、支部分工（工作地图，平铺/按人）、赋权管理、支部配置（内嵌 5 步换组织向导）、通知发布、专班查看（知情权：无职责≠无知情权）、党小组进展（跨组切换只读掌握·组内待答复可「请组长关注」，书记不代组长答复）、反馈管理、上报党委（见 2.5）。待办含「待答复」「专班待议」置顶入口。

### 2.4 党委工作台（组织级）

治理总览（支部概览统计+近期动态，登录落点）、支部监控台账、上报审批（支部上报逐项批驳、结论回传支部）、支部管理（支部实例增改与任命）、下发通知（送达支部支委层，标「党委下发」）、支部配置（模块/分工/向导，属党委与部署期职责）。

### 2.5 关键机制（可复用闭环工作流）

- **三会一课 / 主题党日**：决策树向导创建（场景+形式逐层选择，自动生成后续任务链）→ 会议议程（可挂**讨论文件 / 待讨论名单**）→ 通知/报名/考勤 → 线上异步表决（**出席 >2/3 且无反对**通过，支委会从严口径；弃权允许、异议视同反对）→ 记录决议 → **决议自动督办**（决议「待落实」项勾选责任人/时限 → 责任人工作台自动派生跟进待办 → 逾期进书记台催办 → 销项闭环）
- **考勤**：按活动类型定记录人（如党员大会/支委会/党课=纪检，党小组会=组长上传、纪检纪律台只读掌握）；纪检认定异常标因、滞留到场补录；考勤确认 → 三会一课/主题党日缺勤**自动生成补课任务** → 考勤备案交接宣传归档
- **考察**：活动/专班考察上传（组长/组织）→ **纪检确认** → 组织建档（考察记录汇总入成员发展档案）
- **发展党员双确权**：两种来源——名册报送（成员发展阶段/在册状态/移出由组织发起）与会议议程「待讨论名单」→ **组织审批 → 书记确认**生效，双层留痕、可退回（退回名册报送须填意见），逐项或域内批量
- **思想汇报把关式初阅**：提交即入库 → 组织委员初阅：通过即自动归档 / 退回须附意见 → 本人修改重交
- **专班全生命周期**：发起（提出需求）→ 招募统筹 → 定人定责定岗 → 运行（活动/考察承接）→ 复盘 → 归档；发起与招募分离
- **上报党委双向通道**：支部关键事项（发展节点/活动报备）上报 → 党委逐项审批（通过/批驳）结论回传支部；党委侧另有下发通知通道
- **资料查询与支部文件版本化**：全站资料查询（search）；支部文件支持**上传新版=旧版归档可查**、现行/停用态、制度文本仅书记可新建
- **数据交接**：三委间固定交接协议（纪检→宣传 考勤备案 / 纪检→组织 考察记录提交 / 组织→纪检 补课需求回执），生成即自动为接收方派生待办、确认即销项，双向可追溯
- **支部配置向导 5 步**：组织信息 → 模块/块组合 → 角色分工 → 术语制度指引+工作单 → 验证与重置（含完成报告），草稿可续走；入口=wizard.html + 书记台「支部配置」+ 党委台（权限分轨）
- **数据一键重置三档**：`?reset=demo`（回演示种子）/ `?reset=preview`（只清运行时预览草稿）/ `?reset=init`（**一键初始化**：清空业务过程数据、保留组织骨架——账号/成员档案/支部配置/分工/术语/主题，空支部起步）

全站交互遵循书记倡导的 **closed-loop「确认闭环」表达文化**：动作必有回执与状态回读，不悬空（出处见 [DEVELOPMENT_PATH.md](content/01_strategy/DEVELOPMENT_PATH.md)）。

---

## 三、复用与二次开发（给其他组织）

> 核心价值在**可复用**：先跑起来 → 换数据 → 换角色/配色/术语 → 组合功能 → 深度二次开发。每一步都有正式入口——**替换默认值即换组织**，不必改动系统骨架。

### 替换入口总表

| 要换什么 | 替换入口 |
|---------|---------|
| 组织数据（人员/活动/通知/专班/考勤/档案） | [docs/src/mock/](docs/src/mock/) 数据文件整体替换；服务端种子 [server/seed.js](server/seed.js) 复用同一份数据 |
| 角色与权限 | 角色清单单一事实源 [docs/src/core/constants.js](docs/src/core/constants.js)；权限矩阵 [content/02_institution/SYSTEM_ROLE_PERMISSION.md](content/02_institution/SYSTEM_ROLE_PERMISSION.md)；部署形态 [docs/src/config/deploy.js](docs/src/config/deploy.js) |
| 主题配色 | 色彩令牌 [docs/src/styles.css](docs/src/styles.css) + constants.js（禁改，须书记特批）；固定/可调口径见 [COLOR_SYSTEM.md](content/04_web_design/design-system/COLOR_SYSTEM.md) |
| 术语与制度 | 术语权威源 [USAGE_POLICY.md](content/03_doc_system/USAGE_POLICY.md)；制度母本 [content/02_institution/](content/02_institution/) |
| 业务默认（阈值/名单） | [docs/src/core/policy-defaults.js](docs/src/core/policy-defaults.js)（`branch-default`=支部可调 / `institutional`=制度固定须书记裁决） |
| 功能模块组合 | 能力注册表 + 支部 config.modules/blocks 启停排序（模块声明契约 [docs/src/core/module-compose.js](docs/src/core/module-compose.js)） |
| 后端与部署 | [server/README.md](server/README.md)；数据源 adapter（本地 mock ↔ REST API）见 [docs/src/core/](docs/src/core/) |

**30 分钟换壳**：clone 并 `cd server && npm install && npm start` → 换 `docs/src/mock/`（人员/账号/活动/考勤/专班等，[accounts.js](docs/src/mock/accounts.js) 账号可登录）→ 换角色/权限/术语/配色/policy-defaults → 换支部名与分支配置（[branches.js](docs/src/mock/branches.js) 或向导可视化配置）→ `cd server && npm test` 验证（应到口径派生自 policy-defaults，替换数据后按需改 `partyStages/excludeDetained`）。组织内部逐项替换示例见 [README-members.md 九](README-members.md#九复用与二次开发给其他组织)。

---

## 四、快速开始

**公网演示**：打开 <https://czhgo.github.io/GSM1921-SOP/>，用演示账号（[accounts.js](docs/src/mock/accounts.js)，密码 `123456`）登录。

> 演示数据可随时恢复初始态：地址后加 `?reset=demo`（回种子初始态）；`?reset=preview` 只清运行时预览/草稿（如向导草稿 `wizard-draft-*`、成员基础数据预览）不动演示本体；正式投入使用前用 `?reset=init` 一键初始化为「新支部初始态」——清业务过程数据（活动/考勤/考察/专班/通知/汇报/议程决议跟进/归档/交接/意见反馈等），**保留组织骨架**（账号与角色结构、成员档案、支部配置/分工/术语、在册状态与主题外观）。登录后端（API 模式）后三档均不生效——数据以服务器为权威，不清登录会话与远端数据；API 模式的「重置/初始化」= 删除 `server/data.db` 重启自动重种，或 `DISABLE_SEED=1` 空库起步。

**本地完整运行**（账号登录 + 数据持久化，需 Node ≥ 22）：

```bash
git clone https://github.com/czhgo/GSM1921-SOP.git
cd server
npm install
npm start
```

访问 `http://127.0.0.1:3000/login.html`。环境变量模板见 [server/.env.example](server/.env.example)；安装/启动/测试/部署对接详见 [server/README.md](server/README.md)。

---

## 五、开发路径

### 技术形态

原生 **ESM 模块**、**无打包器 / 无构建步骤**（浏览器直接加载 `docs/src/*.js`）；前端静态（`docs/`）+ 后端可选（`server/`，Express + better-sqlite3 单进程，同源托管页面与 `/api/v1` REST，26 个持久化域全量对称）。

### 目录结构

```
docs/src/
  core/       常量/主题/能力注册表/版本令牌/数据适配（mock-adapter 禁改）
  services/   数据 CRUD 与权限计算（UI 层禁止直改数据源）
  components/ 视图组件（含共享渲染器：向导/批量确认/汇报/决议督办…）
  modules/capabilities/  工作台能力注册（每台一张 tab 清单声明）
  entries/    页面入口与 tabs/{各台 tab}（today 共享「今天」渲染）
  mock/       演示数据（整体替换即换组织）
content/      分层权威源：01_strategy（书记战略与批改）/ 02_institution（制度母本）
              / 03_doc_system（文档治理）/ 04_web_design（设计档案）/ 05_ai_coding（协作方法论）/ insights（经验沉淀）
.ctx/         过程记录：logs（执行/决策日志）、REVIEW_QUEUE、SNAPSHOT、TIMESTAMPS
server/       可选后端 + 测试套件（server/test）
```

content/ 文档是**书记批改的权威源**（制度先改文本、后同步代码）；.ctx/ 是逐次工作的审计底座（执行日志记「做了什么/改了哪些文件」，决策日志记「为什么选 A 不选 B」）。

### 测试

`cd server && npm test` —— **node:test** 全量套件（`node --test` 自动发现 `server/test/*.test.{js,mjs}`，纯 node 部分沙箱可跑；浏览器类/E2E（Playwright，锁定 1.60.0）需常规终端）。重点文件集（随功能演进持续增长）：

- 待办/今天域：`todo-domain` / `todo-deriver-domain` / `todo-domain-view` / `today-summary`
- 性能守卫：`perf-render-guard` / `perf-todo-agg-cache` / `perf-version-token` / `perf-index-equivalence`
- 确权/报送：`member-confirmation` / `reset-tier` / `reset-tier-init` / `thought-review` / `roster` / `roster-ui-logic` / `group-view`
- 治理/审计：`resolution-followup` / `workforce-gate` / `link-integrity`（死链与锚点守护）/ `function-map-sync`（功能地图漂移守护）等

子集回归：`npm run test:core` / `npm run test:fast`（清单见 [server/package.json](server/package.json)）。

### ?v= 版本串收口纪律

浏览器缓存防分裂：改动前端文件后必须全链 bump 版本戳——`node docs/scripts/bump-version.mjs` 一键同步全站 `?v=`（含 `server/test/*.mjs` 内戳与 CODE_VERSION），**改文件即 bump 全链**；禁改文件仅随全站 stamp 动 `?v=` 查询串（零代码改动）。bump 后跑一次全量测试。

### 运行方式

- **纯静态**：任意静态服务把 `docs/` 当根目录（演示卡/账号登录走本地 mock，数据存浏览器本地）
- **账号登录/持久化**：`cd server && npm start`（页面与 API 同源，前端数据层一个常量切换形态，UI 零改动）

### 部署定位

当前定位为**本地 / 内网试用**（书记 C1 定位，2026-09-08），随附 GitHub Pages 公网演示。落地取舍：数据形态分**演示档**（浏览器本地 + `?reset=demo/preview/init` 三档重置）与 **API 形态**（服务器 SQLite 权威、`?reset=` 不执行、重置=重建 DB），按试用阶段选择。

### 开发纪律

- **禁改清单**：`content/`（书记批改层）、`docs/src/styles.css`、`docs/src/core/mock-adapter.js`、`inspector.js`、`roster.js`、`work-overview.js`、`secretary/overview-tab.js` 等须**书记特批**才内改（读链可只读复用其导出）
- **push 须书记批准**（分支 ahead 待批时不得自行推送）
- **README 功能说明随功能同步**：功能/页面/机制变更须同步本文档与 [README-members.md](README-members.md)（功能地图由 `node docs/scripts/gen-function-mermaid.mjs --write` 从 [function-catalog.js](docs/src/core/function-catalog.js) 生成）
- 更多工程纪律见 [CONTRIBUTING.md](CONTRIBUTING.md)、[CLAUDE.md](CLAUDE.md)（AI 协作治理）、[TEST_AND_VERIFICATION.md](content/05_ai_coding/TEST_AND_VERIFICATION.md)

---

## License

This project is licensed under the [MIT License](LICENSE).

参与开发请先读 [CONTRIBUTING.md](CONTRIBUTING.md)（工程纪律与提交约定）。

---

## 支部成员版章节索引

> 示例组织视角的详细说明（角色分工、阅读路径、内部制度细节、通俗版使用要点）在 [README-members.md](README-members.md)。以下标题为兼容既有文档指向本页历史章节的锚点链接而保留，正文以成员版为准。

### 一、这是什么？ → [README-members.md#一这是什么](README-members.md#一这是什么)
### 二、怎么开始用？ → [README-members.md#二怎么开始用](README-members.md#二怎么开始用)
### 三、我能用它做什么？ → [README-members.md#三我能用它做什么](README-members.md#三我能用它做什么)
### 四、我该看什么？ → [README-members.md#四我该看什么](README-members.md#四我该看什么)
### 五、出问题怎么办？ → [README-members.md#五出问题怎么办](README-members.md#五出问题怎么办)
### 六、设计理念 → [README-members.md#六设计理念](README-members.md#六设计理念)
### 七、系统架构与部署 → [README-members.md#七系统架构与部署](README-members.md#七系统架构与部署)
### 八、迭代路线图 → [README-members.md#八迭代路线图](README-members.md#八迭代路线图)
### 九、复用与二次开发（给其他组织） → [README-members.md#九复用与二次开发给其他组织](README-members.md#九复用与二次开发给其他组织)
