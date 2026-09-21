---
title: "系统快照"
type: snapshot
role: "[AI]"
last_updated: "2026-09-21"
status: "ACTIVE"
date: "2026-09-15"
version: "v53"
---

# System Snapshot — v53

> 当前活跃基线。历史快照见 `.ctx/snapshots/`。

> **职能（2026-09-17 立，规范见 [OPERATIONS_GUIDE §5.1](../content/03_doc_system/OPERATIONS_GUIDE.md)）**
> **回答什么问题**：「**这个系统现在长什么样**」——目录结构、页面与数据表清单、账号与角色、当前基线口径。**AI 新会话开局靠它一次同步到现状**，不必重读全部历史。
> **不回答什么**：① **沿革与「哪一批做了什么」** → `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **工程打分与改造行动线** → `.ctx/ENGINEERING_ASSESSMENT.md`；③ **文档职责与目录导航** → `content/03_doc_system/DOC_MAP.md`；④ **架构原理与分层** → `content/03_doc_system/ARCHITECTURE.md`；⑤ **数据模型字段定义** → `content/04_web_design/data/DATA_MODEL.md`（本文件只列「有哪些」，不定义「字段是什么」）。
> **谁什么时候读**：`[AI]` 主读；**新会话开局 / 换人接手时必读**，其余时候按需（on-demand）。
>
> **沿革块的去向（2026-09-17 立）**：本文件 YAML 头不再有 `milestone` 字段、正文不再保留「生成 / 上版 / 变更来源 / 版本里程碑」四类沿革块——**版本要点是沿革，归日志**。**迁到哪儿**：此前 `milestone` 字段的误用与移出经过、`上版 / 变更来源` 两行与四类沿革块的迁出经过，见 `.ctx/logs/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节；逐版沿革见同日志「**附：SNAPSHOT 版本沿革**」节。**为什么迁**：本文件职能＝「这个系统现在长什么样」（见头下职能声明），沿革与月度执行日志重叠。**现在要查**：现状看本文件以下各节，沿革去上述日志附节。

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README.md                   ← 对外门面（**通用化**：引擎/模板 + 各组织自有部署 + 起源故事；**功能地图置顶**于 `<!--FUNC-MAP:ANCHOR-->` 后）
├── README-members.md           ← 支部成员版（地图改为链接根 README；九章正文保留）
├── LICENSE / CONTRIBUTING.md   ← 开源 License + 贡献指南
├── CLAUDE.md                   ← 上下文入口（甲部 H10-H100 约束力三层 + H60 提问准则 + 乙部执行 + 丙部待决策）
├── docs/                       ← 前端代码层（根 HTML + workspace/ 工作台 + ESM 模块化源码；页面实测 22=15 根+7 工作台，清单见 §III，以 docs/ 实况为准）
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
│   │   ├── prop.html           ← 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办）
│   │   ├── disc.html           ← 纪检委员工作台（考勤管理（含补课分段）+监督复盘+考察管理+知情查看+待办）
│   │   ├── visitor.html        ← 成员工作台（含思想汇报提交/待办）
│   │   └── party-committee.html← 党委工作台（党委组织员·全院支部治理，组织级角色非支部角色）
│   ├── scripts/                ← bump-version.mjs（版本串纪律）/ gen-function-mermaid.mjs（README 图生成+防止未同步的情况）/ version-next.mjs（版本号推导纯函数单一源）
│   └── src/                    ← ESM 模块化源码
│       ├── entries/            ← 页面入口（根 entry + tabs/ 按工作台分组的业务 tab，随页面/工作台增长）
│       ├── components/         ← 共享组件（含 dashboard/ 子目录；todo-list/custom-select/person-picker/org-setup-wizard/workforce-duty-card/forms/badges/reporting 等）
│       ├── core/               ← 核心工具（constants/registry/domain/theme/data-adapter/mock-adapter/policy-defaults/module-compose 等）
│       ├── services/           ← 服务层（auth/branch/roster/person/workforce/attendance/agenda-*/vote-config/org-config-package 等，随域增长）
│       ├── mock/               ← Mock 演示数据（people/branches/activities/attendance 等种子文件 + index；数据窗口 2026-07~09）
│       ├── modules/            ← 业务模块（capabilities/ 能力注册 + help-catalog/references）
│       ├── workflow/           ← 工作流引擎（engine/renderer/sop/sopData + blocks/ 块契约 manifests）
│       └── styles.css          ← 全局样式
├── server/                     ← Node 一体化后端（Express + better-sqlite3，同源静态 + /api/v1 REST）
│   ├── server.js               ← 启动入口（DISABLE_SEED=1 env 支持）
│   ├── app.js                  ← createApp 工厂 + JSON 错误中间件
│   ├── db.js                   ← 资源表 35（以 RESOURCE_TABLES 单一事实源为准；含 2026-09-17 匿名核查留痕表 issue_reveals）+ sessions/attachments
│   ├── seed.js                 ← 复用前端 mock 导入种子
│   ├── routes/                 ← auth / resources（RESOURCE_WRITE_GATE 写角色门）/ uploads / report / member / committee
│   ├── services/               ← mailer.js（SMTP 双通道）+ mailer-hooks.js（事件钩子）+ reporting.js（四域上报）
│   ├── test/                   ← 测试文件（.test.js/.test.mjs 混合，数量随目录增长；全量 npm test——命令见 CLAUDE.md H25；2026-09-05 起不再维护固定计数）
│   └── data.db                 ← SQLite 单文件库（运行时产物）
├── content/
│   ├── 01_strategy/            ← [用户] 战略路线层（DEVELOPMENT_PATH + SECRETARY_DIRECTIVES（支书原话 P-001~P-016 基线，原 SECRETARY_PRONOUNCEMENTS 更名）+ references/）
│   ├── 02_institution/         ← [用户] 组织制度层（sop/ + COMMISSIONER_DUTY_FRAMEWORK + FLAT_ORGANIZATION_DESIGN + ROLE_CLASSIFICATION + SYSTEM_ROLE_PERMISSION）
│   ├── 03_doc_system/          ← [工程师] 系统治理层（ARCHITECTURE + SSOT_INDEX + OPERATIONS_GUIDE + PROCESS_GUIDE + USAGE_POLICY + SERVICE_CATALOG + DOC_MAP）
│   ├── 04_web_design/          ← [工程师] 设计理念层（data/ deploy/ design-system/ evolution/ module/ 五子目录；DESIGN_SYSTEM/COMPONENT_SPEC/SOP_WEBSITE_GUIDE/PARTY_COMMITTEE_DESIGN 等；工程化评估已迁 .ctx/（ENGINEERING_ASSESSMENT.md），2026-09-08（更名 2026-09-09））
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

## II. 分层架构（D-218 正交维度模型）

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `CLAUDE.md` + `content/03_doc_system/SSOT_INDEX.md` | [工程师]+[AI] |
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
| `content/03_doc_system/ARCHITECTURE.md` | ✅ | 分层架构+数据模型+变更流水线 |
| `content/03_doc_system/SSOT_INDEX.md` | ✅ | 母本注册表+同步触发矩阵 |
| `content/03_doc_system/SERVICE_CATALOG.md` | ✅ | 统一服务目录（服务清单+角色权限矩阵） |
| `content/02_institution/SYSTEM_ROLE_PERMISSION.md` | ✅ | 系统角色权限矩阵（角色键全表 §9a0 + 权限矩阵/赋权链，代码键级权威） |

### 前端页面（HTML 实测 22 个：15 根 + 7 工作台；以 docs/ 实况为准——清单以 `docs/*.html` 与 `docs/workspace/*.html` 实测为准）

| 页面 | 类型 | 说明 |
|------|------|------|
| `index.html` | 入口 | 主页（通知/招募/日历/待办） |
| `notice.html` | 独立 | 通知独立页（含「党委下发」红标） |
| `help.html` | 独立 | 系统说明书（功能地图+搜索） |
| `login.html` | 独立 | 登录页（演示卡直达角色工作台） |
| `about.html` | 独立 | 支部的故事（角色体系+发展路径可视化） |
| `archive.html` | 独立 | 归档库 |
| `search.html` | 独立 | 资料查询（支部文件唯一上传入口） |
| `feedback.html` | 独立 | 意见反馈 |
| `activity.html` | 公共页 | 活动/专班详情（议程区+表决端+通知直达锚点） |
| `party-committee-meeting.html` | 公共页 | 支委会会议页（线上召开：选线上召开 / 提取议程（专班报送·意见反馈）/ 委员线上表态 / 支书汇总截止（votesLocked）/ 留存并查阅讨论结果；仅支委可进，批次 105 / D-526） |
| `taskforce.html` | 公共页 | 专班详情 |
| `wizard.html` | 公共页 | 换组织向导（支书限本支部/党委任意/他角色无权限卡） |
| `settings.html` | 独立 | 设置中心（侧边栏右下「设置」入口：外观=人人可用/我的工作台=登录用户/支部治理=支书+副支书（副书同权，含支部信息与向导/工作台默认顺序/支部制度参数只读+配置变更记录回滚）+纪检/组织/组长「域参数」卡（各管本域）；访客仅见外观；登录无归属显示「未绑定支部」提示） |
| `person.html` | 独立 | 成员档案页（完整档案/在册留痕/关联概览计数，`?id=<personId>` 打开） |
| `thought-report.html` | 独立 | 思想汇报独立阅读页（三模式：`?id=` 单篇 / `?personId=` 按人 / 无参＝提示未指定对象） |
| `workspace/secretary.html` | 子页面 | 支书工作台（支书/副支书共用；活动写入+分工调整+issue 管理+通知发布+上报党委+待办；英文 key `secretary`=代码标识，中文一律「支书」） |
| `workspace/leader.html` | 子页面 | 党小组组长工作台（活动管理+考勤上传+考察上传+组员进展+待办） |
| `workspace/org.html` | 子页面 | 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办） |
| `workspace/prop.html` | 子页面 | 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办） |
| `workspace/disc.html` | 子页面 | 纪检委员工作台（考勤管理（含补课分段）+监督复盘+考察管理+知情查看+待办） |
| `workspace/visitor.html` | 子页面 | 成员工作台（活动动态+专班进展+个人考勤+思想汇报提交+日历/列表切换+待办） |
| `workspace/party-committee.html` | 子页面 | 党委工作台（党委组织员：支部台账/支部管理/任命/上报审批/下发通知/支部配置） |

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 组织性 | 在「管理事，服务人」中获得成长；组织性是资源而非门槛 | USAGE_POLICY.md §一（2026-09-03 支书裁定）+ insights 党支部管理与实务经验沉淀.md §1 |
| 专班 | 活动之外考察积极分子的载体；赋权是运行支撑机制，工作量记录是运行保障机制 | COMMISSIONER_DUTY_FRAMEWORK.md §A.3~A.8 |
| 赋权关系链 | 党支书→支委/党小组组长；党小组组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_DUTY_FRAMEWORK.md §C |
| SOP 母本·系统实施 | 文本SOP是母本，系统是实施层；同步有边界（母本优先，先改 SOP 再同步系统，避免死循环） | SOP_WEBSITE_GUIDE.md §C.2（原 SOP_WEB 更名） |
| 信息密度精确原则 | 信息可见性是职责空间的投影；按人视图按赋权链投影（L0 个人 / L1 条线 / L2 全局） | DESIGN_SYSTEM.md §一 原则9 (P-015 第四道防线) |
| 正交维度 | SOP(执行细节) ⊥ guides(理念概括)；CLAUDE.md 作为上下文入口 | OPERATIONS_GUIDE.md §1.1 (D-218) |
| 最小三成本原则 | 最小信息成本+最小操作成本+最小适应学习成本，系统设计应让用户以最低成本完成任务 | DESIGN_SYSTEM.md §一 第2条 |
| 高频零跳转 | 最小三成本的最终验收标准——完成一个高频工作需要操作多少次？信息展示与操作是否同地 | DESIGN_SYSTEM.md §一 原则10 |
| 按人视图·知情边界 | 谁能看到谁由赋权链（执行委托）计算得出；看与做相区分，可见性不授予操作权 | DESIGN_SYSTEM.md §一 原则9 + visibility.js (P-015) |
| 知情必达 vs 审核把关 | 通知/阅读回执属「知情必达」（需触达全员，逐人确认合理）；质量把关类（考勤/考察/宣传材料/组织发展）属「审核」=源头审校+异常驱动+抽查——两类不可混同 | REVIEW_QUEUE 附录⑤ 检查要点库（2026-08-29 第5轮入库）+ attendance.js 实施基准 |
| 应到名单·滞留党员 | 「滞留党员」=关系在·人不在；三会+党课应到=党员（正式+预备）非滞留（在册 21−滞留 2=应到 19）、党小组会按组；候选可见可辨禁选、通知照发 | services/roster.js + REVIEW_QUEUE 附录⑧（2026-09-06 支书裁，T-041/T-046） |
| 向支书提问准则 | 支书决断 strategy/product/marketing，AI 负责代码工程；请裁呈「选项+上下文+推荐+默认」，把决策做薄 | CLAUDE.md H60（T-043） |
| SOP 回写 | 将网页中已实现的工作逻辑反整合到SOP中（用业务语言），使SOP成为规范、结构化、清晰的制度母本 | SOP_WEBSITE_GUIDE.md §C.5（原 insights 工程演进与设计方法论 §4.11 承接） |
| 打卡化判定 | 完成必须对应真实产物——`complete(task)` 的副作用集合仅含状态翻转即为打卡化设计缺陷 | DESIGN_METHODOLOGY.md §3.1（原 insights §6.23） |
| 能力注册表·插件化 | 功能单元按「能力声明」注册（register/get/mount 三原语 + unregister/resolveDeps），消费点从清单读取自动发现；6 工作台薄壳化 + 数据源/场景注册化 + 入口/HTML 瘦身（M1-M4 + HTML 公共资源抽取方案A 完成；量化评估见 .ctx/ENGINEERING_ASSESSMENT.md（工程化评估与改造行动线），2026-09-06 v4 综合≈76） | ARCHITECTURE_EVOLUTION.md §二（插件化演进）+ §八（拖拽编排愿景）+ .ctx/ENGINEERING_ASSESSMENT.md |
| 归属显式化 | 支部语境归属判定一律 `getBoundBranch`（person 无 branchId/查无分支→null，不被示例支部冒充）；登录无归属 header 中性「未绑定支部」，设置支部治理/域参数提示先由党委确认归属、换组织向导不唤起 | services/branch.js + settings-entry.js（T-075①，2026-09-09） |
| config 颗粒度·审计内核 | 支部 config 写权六层：个人偏好（无留痕）→ 组织档案/modules/blocks/workforce（configChangeHistory 留痕 why）→ 域参数 L2（POLICY_OVERRIDABLE 白名单，各域负责人仅本域）→ 制度刚性 L3（只读锁定）；单键变更可回滚（历史保留 100 条、回滚再留一痕、历史不改写） | PARTY_COMMITTEE_DESIGN.md §2.6（2026-09-09 审定定稿）+ SYSTEM_ROLE_PERMISSION.md §9h + settings-entry.js/config-clean.js/policy-defaults.js |

## V. 权限矩阵摘要

| 角色 | 工作台（功能分区+待办合一） |
|------|--------------------------|
| 支书（支书） | 支书工作台（活动写入+专班发起+分工调整（常设赋权，票决采纳）+反馈/issue+通知发布+上报党委+待办；支书专属操作收敛 SECRETARY_ROLES） |
| 副支书（副支书） | 共用支书工作台（支书专属操作除外；上报党委可发起） |
| 组织委员 | 专班建设（招募统筹·定人定责定岗）+专班发起+考察上传+人才库（含滞留维护）+发展党员+待办 |
| 宣传委员 | 宣传任务+项目看板+档案归档+周报报送+待办 |
| 纪检委员 | 考勤管理（会议类批量录入+纪检更正+应到口径 roster 单源，含补课分段；**党课 / 支部党员大会的上传位在此**；支委会不考勤）+考察管理+活动监督复盘+知情查看+待办 |
| 党小组组长 | 块块活动管理+活动写入+考勤上传（**该场组织者位**：党小组会 / 组织生活会 / 主题党日）+考察上传+组员进展（含本组复盘状态只读）+待办 |
| 参与者（普通参与者） | 成员工作台（个人视角：查看支委工作成果+个人考勤+思想汇报+待办） |
| 党委组织员（党委级·不属于支部） | 党委工作台（全院支部台账+支部管理（新建/改名/任命）+上报审批+下发通知+支部配置） |

> 角色键/矩阵全量权威：`docs/src/core/constants.js` ROLE_KEYS/ROLE_LABELS/ROLE_PAGE_MAP + SYSTEM_ROLE_PERMISSION.md + SERVICE_CATALOG.md；可见性/操作权按赋权链计算（P-015 按人视图），支书工作台中文一律「支书」。

## VI. 版本里程碑

> **本节（原版本里程碑）已按 2026-09-17 裁定移入 `.ctx/logs/2026-09-EXECUTION_LOG.md` 的「附：SNAPSHOT 版本沿革」节。**