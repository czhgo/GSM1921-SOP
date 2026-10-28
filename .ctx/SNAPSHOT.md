---
title: "系统快照"
type: snapshot
role: "[AI]"
last_updated: "2026-10-27"
status: "ACTIVE"
date: "2026-10-23"
version: "v62"
---

# System Snapshot — v62

> 当前活跃基线。历史快照见 `.ctx/logs/archive/2026-10/snapshots/`。

> **职能（2026-09-17 立，规范见 [OPERATIONS_GUIDE §5.1](../content/03_doc_system/OPERATIONS_GUIDE.md)）**
> **回答什么问题**：「**这个系统现在长什么样**」——目录结构、页面与数据表清单、账号与角色、当前基线口径。**AI 新会话开局靠它一次同步到现状**，不必重读全部历史。
> **不回答什么**：① **沿革与「哪一批做了什么」** → `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **工程打分与改造行动线** → `.ctx/ENGINEERING_ASSESSMENT.md`；③ **文档职责与目录导航** → `content/03_doc_system/DOC_MAP.md`；④ **架构原理与分层** → `content/03_doc_system/ARCHITECTURE.md`；⑤ **数据模型字段定义** → `content/04_web_design/data/DATA_MODEL.md`（本文件只列「有哪些」，不定义「字段是什么」）。
> **谁什么时候读**：`[AI]` 主读；**新会话开局 / 换人接手时必读**，其余时候按需（on-demand）。
>
> **沿革块的去向（2026-09-17 立）**：本文件 YAML 头不再有 `milestone` 字段、正文不再保留「生成 / 上版 / 变更来源 / 版本里程碑」四类沿革块——**版本要点是沿革，归日志**。**迁到哪儿**：此前 `milestone` 字段的误用与移出经过、`上版 / 变更来源` 两行与四类沿革块的迁出经过，见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节；逐版沿革见同日志「**附：SNAPSHOT 版本沿革**」节。**为什么迁**：本文件职能＝「这个系统现在长什么样」（见头下职能声明），沿革与月度执行日志重叠。**现在要查**：现状看本文件以下各节，沿革去上述日志附节。

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README.md                   ← 对外门面（**通用化**：引擎/模板 + 各组织自有部署 + 起源故事；**功能地图置顶**于 `<!--FUNC-MAP:ANCHOR-->` 后）
├── README-members.md           ← 支部成员版（地图改为链接根 README；九章正文保留）
├── LICENSE / CONTRIBUTING.md   ← 开源 License + 贡献指南（**2026-09-28 批次 236 新增 §六「发版（语义化 release）」**）
├── CHANGELOG.md                ← 变更日志（Keep a Changelog 体例；**只记「对使用者可见的变更」**——逐批沿革归 `.ctx/logs/**`；起点＝首次语义化发版 `0.1.0` 2026-09-28、不回溯补记）
├── CLAUDE.md                   ← 上下文入口（甲部 H10-H100 约束力三层 + H60 提问准则 + 乙部执行 + 丙部待决策）
├── docs/                       ← 前端代码层（根 HTML + workspace/ 工作台 + ESM 模块化源码；页面实测 26=18 根+8 工作台/只读视图，清单见 §III，以 docs/ 实况为准）
│   ├── index.html              ← 主页入口（通知/招募/日历/待办四组件）
│   ├── notice.html             ← 通知独立页（含「党委下发」红标）
│   ├── about.html              ← 支部的故事
│   ├── archive.html            ← 归档库
│   ├── search.html             ← 资料查询（支部文件唯一上传入口）
│   ├── feedback.html           ← 意见反馈
│   ├── help.html               ← 系统说明书（功能地图 + 搜索，FUNCTION_CATALOG 驱动）
│   ├── login.html              ← 登录页（演示卡直达角色工作台）
│   ├── activity.html           ← 活动/专班详情公共页（议程恒定渲染 + 表决端 + 通知直达锚点）
│   ├── party-committee-meeting.html ← 支委会会议页（线上召开：提取议程 / 委员线上表态 / 汇总截止 / 留存并查阅讨论结果；批次 105 / D-526）
│   ├── taskforce.html          ← 专班详情公共页
│   ├── settings.html           ← 设置中心（侧边栏右下「设置」入口：外观/我的工作台/支部治理·按登录角色分区，15 根页之一）
│   ├── thought-report.html     ← 思想汇报独立阅读页（三模式：?id= 单篇 / ?personId= 按人 / 无参＝提示未指定对象）
│   ├── person.html             ← 成员档案页（完整档案/在册留痕/关联概览计数，?id=<personId> 打开）
│   ├── wizard.html             ← 换组织向导（独立 URL 页，支书限本支部/党委任意）
│   ├── workspace/              ← 角色工作台页面（7 个 HTML，工作台+待办合一）
│   │   ├── secretary.html      ← 支书工作台（支书/副支书共用：活动写入+分工调整+issue 管理+通知发布+上报党委+待办；英文 key `secretary`=代码标识，中文一律「支书」）
│   │   ├── leader.html         ← 党小组组长工作台（活动管理+考勤上传+考察上传+组员进展+待办）
│   │   ├── org.html            ← 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办）
│   │   ├── prop.html           ← 宣传委员工作台（宣传任务+项目看板+档案归档+周期归档+待办）
│   │   ├── disc.html           ← 纪检委员工作台（考勤管理（含补课分段）+监督复盘+考察管理+知情查看+待办）
│   │   ├── visitor.html        ← 成员工作台（含思想汇报提交/待办）
│   │   └── party-committee.html← 党委工作台（党委组织员·全院支部治理，组织级角色非支部角色）
│   ├── scripts/                ← bump-version.mjs（版本串纪律）/ gen-function-mermaid.mjs（README 图生成+防止未同步的情况）/ version-next.mjs（**版本与发版治理**纯函数单一源）/ release.mjs（**发版单一入口**：默认预演 · 按变更类别语义化升号 · CHANGELOG↔package.json↔tag 三处取齐 · 打 tag 不 push；2026-09-28 批次 236）
│   └── src/                    ← ESM 模块化源码
│       ├── entries/            ← 页面入口（**2026-09-28 按判据分三类**：`pages/` 独立页入口 15 · `workspace/` 角色工作台薄壳入口 7 · `tabs/` 各台业务 tab）
│       ├── components/         ← 共享组件（**2026-09-28 目录分层**：`dashboard/` · `ui/`（基础件与库：badges/forms/modal/custom-select/pager/list-filter/relation-matrix…）· `shell/`（页面外壳：header/sidebar/tab-bar/workspace-shell…）· `feedback/`（反馈域）· `record/`（实体视图：activity-view/taskforce-view/insight-view/todo-*/report-*/inspector…）· `governance/`（治理与人员面板：person-picker/vote-*/member-change-panel/work-overview…））
│       ├── core/               ← 内核（**2026-09-29 批次 267 分四子域**：`base/` 零依赖基础件 · `domain/` 领域口径与单一源清单 · `boot/` 启动装配与页面骨架 · `session/` 会话级跨页轻量状态）
│       ├── data/               ← 数据形态层（**2026-09-29 批次 267 新立**）：`data-adapter`（门面）· `api-adapter` · `mock-adapter`（禁改）· `data-loader` ＋ `mock/`（演示数据种子）
│       ├── services/           ← 服务层（**2026-09-28 目录分层**：`core/`（底座与横切：auth/roles/runtime/mock/preferences/visibility/init-reset/accounts）· `member/`（person/roster/member-flow/member-confirmation/party-group…）· `activity/`（activity/attendance/inspection/makeup/signup/taskforce/agenda-*/vote-config/decision-tree…）· `governance/`（issues/review/handoff/thought-report/notice/todo…）· `branch/`（branch/branch-doc/config-clean/org-config-package/appointment/workforce…））
│       ├── data/mock/          ← Mock 演示数据（people/branches/activities/attendance 等种子文件 + index；数据窗口 2026-07~09；**`prop.js`＝周期归档 / 宣传任务种子单一源，UI 侧与服务端同源导入**，2026-09-28 批次 234）
│       ├── capabilities/       ← 能力声明（**2026-09-29 批次 267 由 `modules/capabilities/` 上提为顶层**，12 件；与 `entries/` 对称：入口薄壳 ↔ 能力声明）
│       ├── components/sections/ ← 页级板块渲染器（**2026-09-29 批次 267 新立**：`help-catalog` help 页目录树/章节卡片 · `references` 资料查询板块）
│       ├── workflow/           ← 工作流引擎（engine/renderer/sop/sopData + blocks/ 块契约 manifests〔**6 块**：试点 2 ＋ 2026-09-29 批次 248 铺开的三会一课 4〕 + **`blocks/orchestration.js`＝通用编排内核**：范围过滤 / 组合校验 / 稳定拓扑序 / 编译为既有 definition 形状的纯数据；2026-09-28 批次 239）
│       └── styles.css          ← 全局样式
├── server/                     ← Node 一体化后端（Express + better-sqlite3，同源静态 + /api/v1 REST）
│   ├── server.js               ← 启动入口（DISABLE_SEED=1 env 支持）
│   ├── app.js                  ← createApp 工厂 + JSON 错误中间件
│   ├── db.js                   ← 资源表 34（以 RESOURCE_TABLES 单一事实源为准；含 2026-09-17 匿名核查留痕表 issue_reveals；2026-10-02 批次 342 删死表 compliance_references）+ sessions/attachments
│   ├── seed.js                 ← 复用前端 mock 导入种子
│   ├── routes/                 ← auth / **resources/**（2026-09-28 批次 234 按内聚切分为**六件**：`index` 装配+通用 CRUD / `gates` 写门 / `approval-gates` 批准门 / `snapshot-versions` 版本协议 / `store` 表访问原语 / `semantic-routes` 语义端点）/ uploads / report / member / committee
│   ├── services/               ← mailer.js（SMTP 双通道）+ mailer-hooks.js（事件钩子）+ reporting.js（四域上报）
│   ├── test/                   ← 测试文件（.test.js/.test.mjs 混合，数量随目录增长；全量 npm test——命令见 CLAUDE.md H25；2026-09-05 起不再维护固定计数）
│   └── data.db                 ← SQLite 单文件库（运行时产物）
├── content/
│   ├── 01_strategy/            ← [用户] 战略路线层（DEVELOPMENT_PATH + SECRETARY_DIRECTIVES（支书原话 P-001~P-016 基线，原 SECRETARY_PRONOUNCEMENTS 更名）+ references/）
│   ├── 02_institution/         ← [用户] 组织制度层（sop/ + COMMISSIONER_DUTY_FRAMEWORK + SYSTEM_ROLE_PERMISSION；原 FLAT_ORGANIZATION_DESIGN 已于 2026-09-26 批次 201 并入 COMMISSIONER_DUTY_FRAMEWORK §G、原 ROLE_CLASSIFICATION 已于 2026-09-26 批次 202 迁入 03_doc_system/OPERATIONS_GUIDE.md §24–§31）
│   ├── 03_doc_system/          ← [工程师] 系统治理层（ARCHITECTURE《架构与单一事实源》+ OPERATIONS_GUIDE《运行与协作规范》+ DOC_MAP ＋ `工作模板/`；**2026-09-26 批次 202 四份合一后**，原 `PROCESS_GUIDE` / `USAGE_POLICY` 与自 02 迁入的 `ROLE_CLASSIFICATION` **已并入 `OPERATIONS_GUIDE.md`**（§15–§18 / §19–§23 / §24–§31）并删除；**2026-09-25 批次 179 三份合一后**，原 `SSOT_INDEX` / `SERVICE_CATALOG` **已并入 `ARCHITECTURE.md` 的 §十 / §十一**）
│   ├── 04_web_design/          ← [工程师] 设计理念层（data/ deploy/ design-system/ evolution/ module/ 五子目录；DESIGN_SYSTEM/SOP_WEBSITE_GUIDE/PARTY_COMMITTEE_DESIGN 等；**`design-system/` 2026-09-24 批次 172 四份合一后只剩 `DESIGN_SYSTEM.md`**（原 `COMPONENT_SPEC` / `COLOR_SYSTEM` / `CLICK_ROUTING` 已并入）· **`data/` 2026-09-23 批次 164 合并后只剩 `DATA_MODEL.md`**（原 `DATA_FLOW` 已并入）· **`deploy/` 2026-09-25 批次 181 四份合一后只剩 `DEPLOYMENT_GUIDE.md`**《部署与对外对接》（原 `AUTHENTICATION_MODEL` / `PKU_PARTY_INTEGRATION` / `WECHAT_INTEGRATION` 已并入；`D-645`）；工程化评估已迁 .ctx/（ENGINEERING_ASSESSMENT.md），2026-09-08（更名 2026-09-09））
│   ├── 05_ai_coding/           ← [工程师] AI编码层（DOCUMENT_GOVERNANCE / CONTEXT_MANAGEMENT / REVIEW_AND_EXPRESSION / TEST_AND_VERIFICATION 等分篇）
│   ├── insights/               ← [用户]+[AI] 经验沉淀（党支部管理与实务经验沉淀.md + README）
│   └── README.md
└── .ctx/                       ← [AI]/[工程师]+[AI] 审计底座
    ├── SNAPSHOT.md             ← 当前基线快照
    ├── ENGINEERING_ASSESSMENT.md  ← 工程化评估与改造行动线（原 MODULARIZATION_ASSESSMENT；2026-09-08 自 content/04_web_design/evolution 迁入、2026-09-09 更名：评估职能归审计底座）
    ├── REVIEW_QUEUE.md         ← 支书评议队列（W4 专项附录 + 检查要点库）
    ├── TIMESTAMPS.md           ← 文件时间戳注册表
    ├── snapshots/              ← 历史快照归档
    └── logs/                   ← 执行日志+决策日志（临时 spec 受管区 .trae/specs 用后即删，禁入 content）
```

> **schema v12（2026-10-27 批次 515 实测，`initDb(':memory:')` 读数）**：当前 **52 张表**（v1 基线 ＋ 影子子表 `agenda_items` / `taskforce_contributions`；v12 已 DROP `issue_reveals`）；五张热表有 generated VIRTUAL 列（不是 STORED）与复合索引；`todos.branch_id` 为生成列。**影子子表不是权威源**——读写仍走 JSON 主表，切表判据见 `content/04_web_design/data/DATA_MODEL.md §2.3.2` 与 `server/scripts/schema-split-readiness.mjs`。
>
> **数据表现状（台账标注 · 2026-09-25 批次 190，系 `.ctx` 侧登记、**未改 `server/**`**）**：`server/data.db` 实有 **45 张表**、全库 **317 行**；其中 **30 张为空表**——**仅结构先行、数据尚未落地**（逐表清单见下句）。**⚠ 本注记的性质＝台账标注**：这些表**有结构、有读写口**（多为既有上传 / 留痕 / 申诉 / 服务端化链的承载位），**不代表功能不可用**——**这不是缺陷、也未被「修复」**（**只是把结构现状写清**）。同批另两条**本就建议不动**，一并说明：**单写者**（better-sqlite3 同步、单进程；WAL 只救读、不救写）· **附件走磁盘**（`uploads/` 落文件、库里只存路径，当前方向正确）。
>
> **27 张「结构先行、暂无数据」的表（逐表清单，照录上一批后端实测；2026-10-02 批次 342 删 `compliance_references` ⇒ 30 → 29；schema v4 将 `weekly_reports` 迁入有数据的通用周期归档表，空表 29 → 28；schema v12 DROP `issue_reveals` ⇒ 28 → 27）**：`act_sub_records` · `activity_reviews` · `agenda_votes` · `appointment_records` · `attachments` · `attendance_appeals` · `attendances` · `auth_audit` · `branch_docs` · `collection_versions` · `committee_broadcasts` · `experience_deposits` · `external_dispatches` · `file_space_records` · `handoffs` · `image_records` · `inspection_appeals` · `inspections` · `issue_unread` · `member_change_requests` · `member_confirmations` · `member_flows` · `milestones` · `prop_tasks` · `taskforce_reviews` · `tf_sub_records` · `thought_reports`。

## II. 分层架构（D-218 正交维度模型）

**多支部服务边界（D-823）**：一个党委下可由同一服务实例承载多个支部。普通支部账号的读取在服务端限制为本支部；党委组织员可选支部或生成跨支部汇总。支部局部快照保留其他支部数据；成员和支部治理数据不通过通用快照写入。各业务动作的角色授权仍按接口逐项核对，详见 `README-server.md §7.1` 与 `DATA_MODEL.md §1.2.1`。

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `CLAUDE.md` + `content/03_doc_system/ARCHITECTURE.md §十`（原 `SSOT_INDEX.md`；2026-09-25 批次 179 并入） | [工程师]+[AI] |
| 1 | 上下文层 | `CLAUDE.md`（HARNESS 入口）+ `content/03_doc_system/ARCHITECTURE.md` | [工程师]+[AI] |
| 2 | 理念维度 | `content/01_strategy/` + `content/04_web_design/`（为什么这样做/为什么这样设计） | [用户]/[工程师] |
| 2.5 | 治理维度 | `content/03_doc_system/`（系统治理规范） | [工程师] |
| 3 | 执行维度 | `content/02_institution/sop/`（怎么做） | [用户]+[AI] |
| 4 | 代码实现层 | `docs/src/` + `docs/*.html`（页面清单见 §III）+ `server/` | [工程师]+[AI] |
| 5 | 审计层 | `.ctx/`（logs/snapshots/REVIEW_QUEUE/TIMESTAMPS） | [AI]/[工程师]+[AI] |
| 6 | 参考层 | `content/01_strategy/references/` | [用户] |

> **D-218**：SOP（执行细节）和 guides（理念概括）是正交维度，不排先后。
> CLAUDE.md 是最高层上下文入口，承接理念和具体细节。

## III. 核心文件清单

### 治理文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `CLAUDE.md` | ✅ | 上下文入口：甲部(H10-H100 约束力三层)+乙部(执行)+丙部(待决策)；H60 含「向支书提问准则」 |
| `content/03_doc_system/ARCHITECTURE.md` | ✅ | 《架构与单一事实源》（分层架构 + 仓库结构 + 数据模型 + 变更流水线 ＋ **§十 母本注册表 / 同步触发矩阵** ＋ **§十一 统一服务目录（服务清单 + 角色权限矩阵）**；**2026-09-25 批次 179 三份合一**：原 `SSOT_INDEX.md` / `SERVICE_CATALOG.md` 两份并入本文件并删除） |
| `content/02_institution/SYSTEM_ROLE_PERMISSION.md` | ✅ | 系统角色权限矩阵（角色键全表 §9a0 + 权限矩阵/赋权链，代码键级权威） |

### 前端页面（HTML 实测 26 个：18 根 + 8 工作台/只读视图；以 docs/ 实况为准——清单以 `docs/*.html` 与 `docs/workspace/*.html` 实测为准）

| 页面 | 类型 | 说明 |
|------|------|------|
| `index.html` | 入口 | 主页（通知/招募/日历/待办） |
| `notice.html` | 独立 | 通知独立页（含「党委下发」红标） |
| `messages.html` | 独立 | 我的私信（站内信收件箱：收件 ＋ 发件一屏、就地回复成线；**仅收发双方可见**） |
| `help.html` | 独立 | 系统说明书（功能地图+搜索） |
| `login.html` | 独立 | 登录页（演示卡直达角色工作台） |
| `about.html` | 独立 | 支部的故事（角色体系+发展路径可视化） |
| `archive.html` | 独立 | 归档库 |
| `search.html` | 独立 | 资料查询（支部文件唯一上传入口） |
| `feedback.html` | 独立 | 意见反馈 |
| `activity.html` | 公共页 | 活动/专班详情（议程区+表决端+通知直达锚点） |
| `activity-materials.html` | 公共页 | 活动材料闭环（单场活动：材料清单 → 上传/核对 → 提交归档；复用 imageRecords / 考勤 / 考察 / 复盘与 archiveActivity） |
| `party-committee-meeting.html` | 公共页 | 支委会会议页（线上召开：选线上召开 / 提取议程（专班报送·意见反馈）/ 委员线上表态 / 支书汇总截止（votesLocked）/ 留存并查阅讨论结果；仅支委可进，批次 105 / D-526） |
| `taskforce.html` | 公共页 | 专班详情 |
| `wizard.html` | 公共页 | 换组织向导（支书限本支部/党委任意/他角色无权限卡） |
| `branch-config.html` | 党委配置页 | 党委组织员在明确选择支部后维护该支部组织信息、名册和配置分区 |
| `settings.html` | 独立 | 设置中心（侧边栏右下「设置」入口：外观=人人可用/我的工作台=登录用户/支部治理=支书+副支书（副书同权，含支部信息与向导/工作台默认顺序/支部制度参数只读+配置变更记录回滚）+纪检/组织/组长「域参数」卡（各管本域）；访客仅见外观；登录无归属显示「未绑定支部」提示） |
| `person.html` | 独立 | 成员档案页（完整档案/在册留痕/关联概览计数，`?id=<personId>` 打开） |
| `thought-report.html` | 独立 | 思想汇报独立阅读页（三模式：`?id=` 单篇 / `?personId=` 按人 / 无参＝提示未指定对象） |
| `workspace/secretary.html` | 子页面 | 支书工作台（支书/副支书共用；活动写入+分工调整+issue 管理+通知发布+上报党委+待办；英文 key `secretary`=代码标识，中文一律「支书」） |
| `workspace/leader.html` | 子页面 | 党小组组长工作台（活动管理+考勤上传+考察上传+组员进展+待办） |
| `workspace/org.html` | 子页面 | 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办） |
| `workspace/prop.html` | 子页面 | 宣传委员工作台（宣传任务+项目看板+档案归档+周期归档+待办） |
| `workspace/disc.html` | 子页面 | 纪检委员工作台（考勤管理（含补课分段）+监督复盘+考察管理+知情查看+待办） |
| `workspace/visitor.html` | 子页面 | 成员工作台（活动动态+专班进展+个人考勤+思想汇报提交+日历/列表切换+待办） |
| `workspace/party-committee.html` | 子页面 | 党委工作台（党委组织员：支部台账/支部管理/任命/上报审批/下发通知/支部配置） |
| `workspace/branch-readonly.html` | 只读下钻 | 党委组织员在明确选择支部后查看该支部成员与活动；保留党委身份，不进入支书工作台 |

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 组织性 | 在「管理事，服务人」中获得成长；组织性是资源而非门槛 | OPERATIONS_GUIDE.md §19（《运行与协作规范》术语使用规范；2026-09-03 支书裁定；原 USAGE_POLICY.md 已于 2026-09-26 批次 202 并入）+ insights 党支部管理与实务经验沉淀.md §1 |
| 专班 | 活动之外考察积极分子的载体；赋权是运行支撑机制，工作量记录是运行保障机制 | COMMISSIONER_DUTY_FRAMEWORK.md §A.3~A.8 |
| 赋权关系链 | 党支书→支委/党小组组长；党小组组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_DUTY_FRAMEWORK.md §C |
| SOP 母本·系统实施 | 文本SOP是母本，系统是实施层；同步有边界（母本优先，先改 SOP 再同步系统，避免死循环） | SOP_WEBSITE_GUIDE.md §C.2（原 SOP_WEB 更名） |
| 信息密度精确原则 | 信息可见性是职责空间的投影；按人视图按赋权链投影（L0 个人 / L1 条线 / L2 全局） | DESIGN_SYSTEM.md §一 原则9 (P-015 第四道防线) |
| 正交维度 | SOP(执行细节) ⊥ guides(理念概括)；CLAUDE.md 作为上下文入口 | OPERATIONS_GUIDE.md §1.1 (D-218) |
| 最小三成本原则 | 最小信息成本+最小操作成本+最小适应学习成本，系统设计应让用户以最低成本完成任务 | DESIGN_SYSTEM.md §一 第2条 |
| 高频零跳转 | 最小三成本的最终验收标准——完成一个高频工作需要操作多少次？信息展示与操作是否同地 | DESIGN_SYSTEM.md §一 原则10 |
| 按人视图·知情边界 | 谁能看到谁由赋权链（执行委托）计算得出；看与做相区分，可见性不授予操作权 | DESIGN_SYSTEM.md §一 原则9 + visibility.js (P-015) |
| 知情必达 vs 审核把关 | 通知/阅读回执属「知情必达」（需触达全员，逐人确认合理）；质量把关类（考勤/考察/宣传材料/组织发展）属「审核」=源头审校+异常驱动+抽查——两类不可混同 | REVIEW_QUEUE 附录⑤ 检查要点库（2026-08-29 第5轮入库）+ attendance.js 实施基准 |
| 应到名单·滞留党员 | 「滞留党员」=关系在·人不在；三会+党课应到=党员（正式+预备）非滞留（在册 21−滞留 2=应到 19）、党小组会按组；候选可见可辨禁选、通知照发 | services/member/roster.js + REVIEW_QUEUE 附录⑧（2026-09-06 支书裁，T-041/T-046） |
| 向支书提问准则 | 支书决断 strategy/product/marketing，AI 负责代码工程；请裁呈「选项+上下文+推荐+默认」，把决策做薄 | CLAUDE.md H60（T-043） |
| SOP 回写 | 将网页中已实现的工作逻辑反整合到SOP中（用业务语言），使SOP成为规范、结构化、清晰的制度母本 | SOP_WEBSITE_GUIDE.md §C.5（原 insights 工程演进与设计方法论 §4.11 承接） |
| 打卡化判定 | 完成必须对应真实产物——`complete(task)` 的副作用集合仅含状态翻转即为打卡化设计缺陷 | DESIGN_METHODOLOGY.md §3.1（原 insights §6.23） |
| 能力注册表·插件化 | 功能单元按「能力声明」注册（register/get/mount 三原语 + unregister/resolveDeps），消费点从清单读取自动发现；6 工作台薄壳化 + 数据源/场景注册化 + 入口/HTML 瘦身（M1-M4 + HTML 公共资源抽取方案A 完成；量化评估见 .ctx/ENGINEERING_ASSESSMENT.md（工程化评估与改造行动线）；**综合分 2026-09-29 实测 ≈85**——原记「2026-09-06 v4 ≈76」已过时） | ARCHITECTURE_EVOLUTION.md §二（插件化演进）+ §八（拖拽编排愿景）+ .ctx/ENGINEERING_ASSESSMENT.md |
| 归属显式化 | 支部语境归属判定一律 `getBoundBranch`（person 无 branchId/查无分支→null，不被示例支部冒充）；登录无归属 header 中性「未绑定支部」，设置支部治理/域参数提示先由党委确认归属、换组织向导不唤起 | services/branch/branch.js + settings-entry.js（T-075①，2026-09-09） |
| config 颗粒度·审计内核 | 支部 config 写权六层：个人偏好（无留痕）→ 组织档案/modules/blocks/workforce（configChangeHistory 留痕 why）→ 域参数 L2（POLICY_OVERRIDABLE 白名单，各域负责人仅本域）→ 制度刚性 L3（只读锁定）；单键变更可回滚（历史保留 100 条、回滚再留一痕、历史不改写） | PARTY_COMMITTEE_DESIGN.md §2.6（2026-09-09 审定定稿）+ SYSTEM_ROLE_PERMISSION.md §9h + settings-entry.js/config-clean.js/policy-defaults.js |

## V. 权限矩阵摘要

| 角色 | 工作台（功能分区+待办合一） |
|------|--------------------------|
| 支书（支书） | 支书工作台（活动写入+专班发起+分工调整（常设赋权，票决采纳）+反馈/issue+通知发布+上报党委+待办；支书专属操作收敛 SECRETARY_ROLES） |
| 副支书（副支书） | 共用支书工作台（支书专属操作除外；上报党委可发起） |
| 组织委员 | 专班建设（招募统筹·定人定责定岗）+专班发起+考察上传+人才库（含滞留维护）+发展党员+待办 |
| 宣传委员 | 宣传任务+项目看板+档案归档+周期归档+待办 |
| 纪检委员 | 考勤管理（会议类批量录入+纪检更正+应到口径 roster 单源，含补课分段；**党课 / 支部党员大会的上传位在此**；支委会不考勤）+考察管理+复盘（原「活动监督复盘」）+知情查看+待办 |
| 党小组组长 | 块块活动管理+活动写入+考勤上传（**该场组织者位**：党小组会 / 组织生活会 / 主题党日）+考察上传+组员进展（含本组复盘状态只读）+待办 |
| 参与者（普通参与者） | 成员工作台（个人视角：查看支委工作成果+个人考勤+思想汇报+待办） |
| 党委组织员（党委级·不属于支部） | 党委工作台（全院支部台账+支部管理（新建/改名/任命）+上报审批+下发通知+支部配置） |

> 角色键/矩阵全量权威：`docs/src/core/domain/constants.js` ROLE_KEYS/ROLE_LABELS/ROLE_PAGE_MAP + SYSTEM_ROLE_PERMISSION.md + `ARCHITECTURE.md §十一（统一服务目录与角色-服务权限矩阵）`（原 `SERVICE_CATALOG.md`；2026-09-25 批次 179 并入）；可见性/操作权按赋权链计算（P-015 按人视图），支书工作台中文一律「支书」。

## VI. 版本里程碑

> **本节（原版本里程碑）已按 2026-09-17 裁定移入 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「附：SNAPSHOT 版本沿革」节。**

## 批次 509 小结（2026-10-24）

- **做了什么**：治理 `.ctx`（五桶 + `README.md` 索引 + 检索入口 + 与 `content` 三问同步判据）；复建「每批阶段小结」的唯一落点；实证分析「落地后被弃用」的根因；指令层补 `H21` 前置矩阵与 `H50.1` 删除前迁 `content` / 批次收尾小结；`EXECUTION_LOG_INDEX` 增「已被 content 吸收」列。
- **结论**：机制能否存活不取决于「立过」，而取决于**触发条件 / 唯一落点 / 检查方式**是否齐全。`阶段小结`（2026-09 有收官小结、2026-10 全文 0 处）与 `SNAPSHOT` 归档规则（要求每版复制、实际只有 v3）是两个可举证的反例。
- **未决**：① `docs-governance-guard` 尚无实现（现 `ctx-hygiene-guard` 只守顶层白名单与归档指针）；② `.ctx/README.md` 成为顶层第 8 项，`H26.3` 白名单与 `ctx-hygiene-guard` ① 断言待同步（本批未改 `server/**`）；③ `.ctx/TIMESTAMPS.md` 不在本批授权面：三处 `last_updated` 表行与 `.ctx/README.md` 新行均未登记（`doc-consistency::S13` 会报前两处漂移，需同批授权补刷）。
- **已迁 content 的条目**：`content/05_ai_coding/REVIEW_AND_EXPRESSION.md` 新增「审查漏项的结构性原因」（弃用判例 + 因果链 + 防逃逸三件套 + 正反例对照）；本批无其它需迁 `content` 的规范 / 判例 / 索引。
- **下批入口**：① 读本段 + `.ctx/README.md` §三 / §四；② 补 `docs-governance-guard` 的「最近一批小结段存在且 5 行齐全」断言；③ 把 `.ctx/README.md` 纳入 `H26.3` 白名单与 `ctx-hygiene-guard` ①；④ 每批收尾在 `SNAPSHOT.md` 追加 5 行。

## 批次 510 小结（2026-10-25）

- **做了什么**：`DESIGN_SYSTEM` 增 SD-33…SD-36（消息承载 / 逐人状态 / 卡内构成 / 分组胶囊）；设计域判例增 `CASE-DESIGN-012…016` 与总索引；审查问题集增 Q-21（同一用户对象只有一个承载面），全文 20 → 21 条；`GUARD_INVENTORY` 补本批扩展记录；删除无消费者的 `resolveNoticeUrl`。遗留修复：待归档待办改为「关闭条件已齐」才生成。
- **结论**：本轮 8 条支书反馈可归为三条结构病——**同一对象多个承载面**（消息 4 面 / 3 已读 / 2 归档）、**派生结果被写成事实**（种子手写状态、归档后才派生待办）、**卡内构成无单一源**（空列 / 双 H2 / 群组名不可见）。判据与判例按四类分职落位，`content/05` 只留索引与问题集。
- **未决**：① 全量三通道与版本戳 bump 留给主代理收尾；② SD-36 分组胶囊暂无判例；③ 待归档待办现为 0（种子无关闭条件齐备的活动），演示若要展示需补一份齐备活动材料。
- **已迁 content 的条目**：SD-33…36 落 `content/04_web_design/design-system/DESIGN_SYSTEM.md`；5 条判例落 `content/04_web_design/design-system/CASES.md` 与 `content/03_doc_system/CASES_INDEX.md`；Q-21 落 `content/05_ai_coding/REVIEW_QUESTION_SET.md` 与 `QUESTION_HIT_MATRIX.md`；守卫扩展落 `content/05_ai_coding/GUARD_INVENTORY.md`。
- **下批入口**：① 先跑定向 7 件 ＋ daily，再决定是否补三通道；② 若要展示「待归档」待办，补一份关闭条件齐备的活动；③ 后续批次把 SD-36 的胶囊断言语义补成机检（当前仅分组名 `S3` ＋ 键盘人工检查）。

## 批次 511 小结（2026-10-25）

- **做了什么**：IA 62→45（支书 10 / 组织 8 / 宣传 5 / 纪检 6 / 组长 6 / 成员 7 / 党委 3）；活动管理只承担生命周期（查询并入日历工具栏、党小组活动改筛选、赋权移出）；专班赋权回组织台；知情查看只留「活动工作组 / 专班工作组」＋「其他党小组」独立区；五台「我的处置」并入待办「我经办的反馈」；四台活动日历降为工作概况卡；成员「我的成长」三子区；宣传任务并入看板泳道。组件侧新增 `disclosure.js` / `menu-button.js`，修 4 处标题嵌套，4 个 `div` 伪开关升级，24 个折叠迁移；术语侧 `TERMINOLOGY.md` 20 条 ＋ `docs-governance-guard::H-T1…H-T5`；文档侧 `DATA_MODEL §2.9` 消息模型、四组页签名、SD-37/38/39/40、`PRODUCT_IA.md` 45 行、help 漂移修正。
- **结论**：本轮 4 条反馈可归为三条结构病——**同一能力多个页签位**（17 项降级）、**同一交互多套原语**（标题进交互元素 ＋ `div` 伪开关）、**同一术语多处定义**（无唯一源）。收敛判据必须同时具备「单一源 ＋ 机检守卫 ＋ 三件齐备（新落点 / 深链重定向 / help 更新）」，否则下一批必回潮。
- **未决**：① `T4-1` 有 3 处「封装 ＋ 手写」并存豁免待逐文件收口；② 技能更新未安装（git 克隆被网络拒绝）；③ daily 两红（`.ctx` 临时件、预算）已在收尾修复，最终 daily 1524 / 1524、全量三通道全绿。
- **已迁 content 的条目**：`content/03_doc_system/TERMINOLOGY.md`（新，20 条）· `content/04_web_design/PRODUCT_IA.md`（新，45 行）· `DATA_MODEL §2.9/§2.19` · `DESIGN_SYSTEM` SD-37/38/39/40 · `design-system/CASES.md` CASE-DESIGN-017/018/019 ＋ `CASES_INDEX` · `MODULE_UI_DESIGN` / `ARCHITECTURE` / `sop/INDEX.md` 页签组名与术语指针 · `GUARD_INVENTORY` §八。
- **下批入口**：① 对 `T4-1` 三处豁免逐文件择一原语；② 若要补 IA 技能的独立审查，先解决 git 克隆网络；③ 复核 copy-screen 的 M1/M2 基线（全局概况聚合页）是否可再降；④ 读本段 ＋ `.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 511。

## 批次 512 小结（2026-10-26）

- **做了什么**：运行时统一 render 生命周期（renderCtx 函数化 / seq ＋ 去重 ＋ 清 marker ＋ await ＋ 错误卡 ＋ 8s 超时）与绑定幂等；视觉六项（容器语义 / 胶囊全宽可见 / 间距 8·16 / 竖条 8px / 只装饰用 neutral-400 / 表格定列宽）；色彩双层（主题色层 7×2×9 不改值 ＋ 功能色层独立 token）；按钮三档（btn-ghost 迁移 67 处、白名单 6 处）；详情路由 direct / locate / none（`object-route.js` ＋ 归档只读 ＋ 跨支部门）；新增 `runtime-tab-lifecycle-guard`（16）与 `object-route-guard`（8）。
- **结论**：支书 7 条视觉 ＋ 2 条运行时反馈可归为六类结构病——「声明存在 ≠ 可感知」「旧类名沿用 ≠ 控件可辨」「填内容 ≠ 列宽模板」「单一主题色相 ≠ 有层级」「入口一刀切 ≠ 最小三成本」「首屏能渲染 ≠ 生命周期正确」；规范落 SD-41…SD-46，判例落 CASE-DESIGN-020…024 与 CASE-AI-006。
- **未决**：① SD-41（容器语义）暂无独立判例，由 V1 机检承担；② `content/05_ai_coding/CASES.md` 在 `TIMESTAMPS` 无登记行（沿用「只登记不补行」），F2 仍按 frontmatter 核；③ PRODUCT_IA 路由矩阵为派生附录，`OBJECT_ROUTE_ENTRIES` 改动须同批改表；④ 收尾已完成：daily 1561、全量三通道全绿（node 1563 / e2e-A 57+1skip / e2e-B 179）、版本戳 20261025b。
- **已迁 content 的条目**：`DESIGN_SYSTEM` SD-41…SD-46 ＋ §2.12 / §2.13 指针；`design-system/CASES.md` CASE-DESIGN-020…024；`CASES_INDEX` design 19→24、ai-coding 5→6；`PRODUCT_IA` 详情路由矩阵（11 入口）；`05_ai_coding/CASES.md` CASE-AI-006；`GUARD_INVENTORY` §九（70 件 / 462 条）。
- **下批入口**：① 读本段 ＋ `.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 512；② 若要给 SD-41 补判例，优先从「同名 class 兼作可点摘要与只读摘要」的真实样本取证；③ 真机复核胶囊在 390 的观感与 hover 浮窗 p95。

## 批次 513 小结（2026-10-26）

- **做了什么**：分组胶囊恢复 8–9 月语义（主题 soft 底 / soft-text、3px 直角、600 字重、0.5px 字距、≥24px，亮 6.88:1 / 暗 9.18:1、描边 2.43:1）；缓存边界四类键 ＋ 业务读缓存 `_versions`/`savedAt` ＋ 登录服务端优先；api 形态六个读口去 mock 回退、flush 四类分流、失败进 outbox 显示「未同步」；schema v12（四组唯一索引 / `todos.branch_id` 生成列 / `contributions` 对象 / 考察成员校验 / `issue_reveals` 删除 / `committee_broadcasts` 只读）；四个月窗口 38 场（8/9/10/11 月 18/9/8/3）；测试隔离与正式轨道（`import-branch` / `restore` / `READ_ONLY` / 四开关）；新增 4 个守卫（`seed-contract` / `test-isolation` / `write-truth` / `demo-window`）。
- **结论**：本批 4 类反馈可归为一条总病——**「声明存在 ≠ 实际生效」**：胶囊「可见 ≠ 恢复」、缓存「本地显示 ≠ 服务端权威」、写「`persist()` resolve ≠ 写成功」、窗口「按日期 DELETE ≠ 重排＋重建」；判据必须把「可感知 / 可证 / 可重建 / 分层」拆开，并各自配常驻守卫。
- **未决**：① 收尾已完成：daily 1608、全量三通道全绿（node 1608 / e2e-A 92 / e2e-B 144+1skip）、版本戳 20261026a、提交待做；② SD-48 是边界条款，字段表 / 键清单 / 窗口 / 测试分层各自以权威源为准；③ `DATA_SEED_CONTRACT` 为本批新增的登记行，本表已补行（不同于「只登记不补行」的既有缺口）；④ 只读演练 / 名册导入已由定向与真机覆盖，仍需在真实部署环境复跑。
- **已迁 content 的条目**：`DESIGN_SYSTEM` SD-47 / SD-48 ＋ §12.3 / SD-3 / SD-36 指针；`design-system/CASES.md` CASE-DESIGN-025、CASE-DATA-001 与 sample-diff 五列；`CASES_INDEX` design 25 / data 1；`DATA_MODEL` v12 摘要与种子契约指针；`PRODUCT_IA` 数据形态与缓存边界；`GUARD_INVENTORY` §十（74 件 / 501 条）。
- **下批入口**：① 读本段 ＋ `.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 513；② 真机复核胶囊在 390 的观感、hover 浮窗 p95、只读演练与名册导入；③ 若新增业务集合，先登记 `cache-registry` 四类与 `DATA_SEED_CONTRACT` 再改代码。

## 批次 514 小结（2026-10-27）

- **做了什么**：UI 三项专项收口——阶段一最小三成本（首次 Tab 落「跳到主要内容」、顶栏金焦点环、侧栏抽屉焦点、日历 roving grid、390 待办列表优先、五台「看日历」真实落点、成员工作台、幽灵提示删除）；阶段二脏乱繁（七台静态 H2 删除、党委台三连消除、每行 1 主行动 ＋ 1「更多」、页签条两层、40px 折叠摘要、首页无图不出 16:9、今天空态一行、390 统计卡 100px、帮助页 390 `scrollWidth=390`）；阶段三美学（组名 10% 淡底无边框、选中页签 solid soft ＋ accent 描边、下划线 110→0、字体 1 族三档、加载 120/180ms＋≤1s、逾期 7.09/11.68、暗色选中 6.44、help 目录 4.61、登录 placeholder 6.57、功能红 / 金、About 撤导航）。
- **结论**：三阶段反馈可归为一条总病——**「改到存在 ≠ 可感知」**：胶囊同色、链接靠下划线、加载靠压暗、页标题靠静态 H2，都是「源码里有」但用户感知不到；判据必须同时含「相邻态差异可测」与「全站计数归零」，并配常驻守卫。
- **未决**：① `text-xs` 仍剩 1911 处，未逐页迁移；② About 已撤导航，但 `function-catalog.js` 仍保留「关于」功能卡；③ 收尾实跑 daily **1634 / 1634**（与交接 1636 差 2，按实况记录），定向 64 / 64；全量三通道沿用主代理实测（node 1636 / e2e-A 94 / e2e-B 147＋1skip / 837.3s）；④ 版本戳 `20261026b` 未再 bump。
- **已迁 content 的条目**：`DESIGN_SYSTEM` SD-49…SD-52 ＋ §12.3 / §12.10 / §4.24 / SD-3 / SD-36 / SD-42 / SD-43 / SD-46 / SD-47 交叉口径；`design-system/CASES.md` CASE-DESIGN-026 / 027；`CASES_INDEX` design 25 → 27；`PRODUCT_IA` About 撤路由附录；`GUARD_INVENTORY` §十一（77 件 / 526 条）。
- **下批入口**：① 读本段 ＋ `.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 514；② 若要收 `text-xs` 存量，先按「12px 只承担标签 / 元信息」逐页核，不批量替换；③ About 若恢复入口，须同批补页面清单、导航、help 落点与 `no-about-route-guard` 白名单；④ 复核 daily 是否回到 1636 口径（查 2 条差异来源）。

## 批次 515 小结（2026-10-27）

- **做了什么**：活跃上下文瘦身——harness 白名单文档与代码对齐（7 → 9 项）· `REVIEW_QUEUE` 420 行重写为「机制 ＋ 未闭环」· `ACTIVE_RULINGS` 修 3 处过时指针 · `SNAPSHOT` 版本自述统一为 v62 / schema v12 / 52 张表 · `TIMESTAMPS` 补登与周期任务表据实重排 · 40 个已完成 spec 回勾后整批归档 `.ctx/logs/archive/2026-10/specs/`（`SPECS_INDEX.md` 索引）· 删 `.tmp/`、`dist/`、handoff；content 分层事实层校正 9 处（`DOC_MAP` 补登 10 项 ＋ 新增 §七 权威句位置）；数据侧新增适配器接口面守卫 S4、值对照 5 → 10 张表；架构方案（不引打包器 ＋ 四项必要项）落 `ARCHITECTURE_EVOLUTION.md §九`；乙部新增 `B-515-1…7`。
- **结论**：本轮病根是「**机制立了但没人执行**」——白名单说 7 项而代码 9 项、SNAPSHOT 说 v60/v61 而实际 v62、队列 27 处已完成标记仍在册；判据是「文档读数必须能对着代码重算一次」，不能靠上一批自述。
- **未决**：① `.ctx/logs/archive/2026-10/2026-10-AUDIT_R6…R11` 七份 ＋ `R10_P3_CLOSURE` 未迁 archive（被不可改写的执行日志与 content 引用，登记 `B-515-7`）；② 守卫归并只出候选表未执行（`B-515-2`）；③ content 重复表达只建权威句位置表、未收口（`B-515-3`）；④ 架构四项未改代码（`B-515-1`）。
- **已迁 content 的条目**：`DOC_MAP` §二 补登 10 项 ＋ §七 重复主题权威句位置；`03/README` / `04/README` / `05/README` 登记补齐；`DATA_CONSISTENCY_CHECKLIST` §0.2 新增接口面 / 种子契约 / 种子漂移三行并改 10 张表；`GUARD_INVENTORY` 77 件 / 527 条 ＋ 「附：守卫归并候选」；`ARCHITECTURE_EVOLUTION` §九 性能与交付形态；`PARALLEL_SKILL_AUDIT` §13.7 判例路径改指归档。
- **下批入口**：① 读本段与 `.ctx/logs/archive/2026-10/specs/SPECS_INDEX.md`；② 按 `B-515-1` 先做压缩与缓存分层（不动前端代码的两项），再评估 Tailwind 本地化；③ 守卫归并按 `GUARD_INVENTORY` 候选表逐组执行，断言数不减；④ 读数基线：daily **1635 / 1635**（66.7s）、定向 71 / 71、守卫 77 件 / **527** 条。

## 批次 516 小结（2026-10-27）

- **做了什么**：乙部销账（15 条在办项核验后删 5 / 改 5 / 新增 `B-516-1`）· 交付形态四项（`compression` ＋ 缓存分流「HTML no-cache / 带戳资源 immutable / deploy.js no-store」＋ 26 页 `modulepreload` 块 ＋ Tailwind CDN 锁 `3.4.17`）· 守卫归并 17 件 → 4 件（`perf` / `copy` / `type-scale` / `modal`，断言 527 不变，`DAILY_FILE_BUDGET` 237 → 226）· `--app-accent-tint` 加 `@supports` 回退 · 数据缺口四条登记 · 8 份审计报告迁 archive 并改准 25 处活跃引用。**About 按支书裁定回归「独立冻结件」：文件与引用面一律不动**（详见 `PRODUCT_IA.md` 附节）。
- **结论**：乙部「待启动」里混着大量**已由后续批次或守卫消化**的条目——不清账就会让下一轮把已做的事再做一遍；判据是「每条在办项必须能指到一个当前仍缺的文件/行为」，指不出的即删或重写。
- **未决**：① `text-xs` 1971 处 / 130 文件**未迁移**（转入 `B-515-5`，只迁非标签用途）；② `form-loop-sweep` 的 409 排除收紧未做（需真机跑，已写明触发条件）；③ `B-516-1` 机扫 44 条：已消 31 / 仍能命中 12 / 无法机判 1，12 条待人工复核；④ `B-515-6` 已分流为「真缺陷 4 ＋ 复跑 1 ＋ precommit 9」，验证 / 提交类不再挂账；⑤ `B-515-3` 重复表达只建了权威句位置表，未逐条改句（68 / 160 处仍存）。
- **已迁 content 的条目**：`GUARD_INVENTORY` 64 件 / 527 条 ＋ 归并执行结果；`DATA_CONSISTENCY_CHECKLIST` §0.2 增「已知缺口」行并修正语义端点表 5→7；`README-server` 静态缓存口径改为分层 ＋ 压缩。
- **下批入口**：① 读本段；② 先跑 `npm run test:daily` 确认 1642 口径；③ `B-516-1` 的 12 条待人工复核按「已消 / 未消 / 不适用」逐条落；④ `B-515-5` 的 `text-xs` 按 `entries/tabs/**` 逐页核，禁止批量替换。

## 批次 517 小结（2026-10-28）

- **做了什么**：新增全局 skill `huashu-design`（话术 T1–T4 ＋ 画术 A1–A6，10 条判据可布尔化）；按「可用性 → 话术 → 画术」三阶段收口——① 帮助页焦点环 1.40:1 → 7.09:1、反馈搜索不再丢焦点、390 补「我的档案」；② 清实现词与指路句、卡头副题统一「范围 + 约束」、词表落 `DESIGN_SYSTEM §12.16`；③ `.inspector-card` 去平地阴影、≤640 边线按语义、归档/删除降为次行动；④ 31 处原生 `confirm(` 全改为 `confirmDanger()` 三段式确认面，盘点表落 §4.27.1；⑤ §4.25 写首页 hero 两态豁免并落地（登录有待办 → 24px/20px 左对齐）；新增 `SD-53` / `SD-54`、`CASE-DESIGN-028/029`；乙部删 `T-903`（并入 `B-515-6`）。
- **结论**：主矛盾是「说明层压过对象层」——界面先解释「怎么用/怎么实现」而不是「这是哪件事」；本轮把判据固化进 skill 与守卫（`copy-guard` 副题禁令、`modal-guard` 原生 confirm 清零），避免下一轮靠人记。
- **未决**：① 首页 hero 的「待办为 0」判据复用 `TodoStore.getByRole(role)`，与「今天」页同源但未做服务端口径复核；② 7 处原生 `prompt`（打回原因等录入面）未纳入本轮，另批；③ `B-503-5` 只剩支书台「反馈管理」改名待裁。
- **已迁 content 的条目**：`DESIGN_SYSTEM` §4.25 豁免 / §4.27.1 盘点表 / §12.16 词表 / `SD-53`、`SD-54`；`CASES.md` CASE-DESIGN-028/029 与 `CASES_INDEX` 27 → 29；`GUARD_INVENTORY` 64 件 / 527 条（`copy-guard` 16、`modal-guard` 20）。
- **下批入口**：① 读本段与 `.trae/specs/refine-aesthetic-two-lenses/checklist.md`；② 用 `huashu-design` 复核其余批次（先跑 1440/390 两态）；③ `B-516-1` 12 条复核与 `B-515-5` 的 `text-xs` 逐页迁移；④ 读数基线：daily **1642 / 1642**（92.1s）、版本戳 `20261028a`。
