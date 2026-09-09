---
title: "系统快照"
type: snapshot
role: "[AI]"
last_updated: "2026-09-09"
status: "ACTIVE"
date: "2026-09-09"
version: "v20"
milestone: "2026-09-06 午后~09-09 增量收口：设置中心 settings.html（12 根页第 12 页：外观按人隔离/我的工作台 tab 序/支部治理迁移+副书同权/域参数 L2 三键+制度参数 L3 锁定）+ 支部 config 审计内核（why+单键回滚+变更记录上限 100）+ 归属显式化（未绑定支部）+ config 颗粒度 content 声明审定 + 页面 19=12 根+7 台 + 版本串 20260909e/CODE_VERSION 90 + 09-06 晚~09-08 补录（名册/党委治理网页化、附录⑩ A-D、R6-2/3、待办 9 域、UI/HELP 重构、D8 裁决批一/二、?reset=init、E-1~E-5、P.11-P.13、评估文档更名入 .ctx）"
---

# System Snapshot — v20

> 当前活跃基线。历史快照见 `.ctx/snapshots/`。
> **生成（v20）**: 2026-09-09 — 2026-09-06 午后~09-09 增量刷新（T-048~T-075 区间，变更权威见 2026-09-EXECUTION_LOG.md）：① 页面 19 = 12 根 + 7 工作台（新增 `settings.html` 设置中心；全站侧边栏右下「设置」入口；README×2/help/function-catalog/help-e2e 全链同步 2026-09-09）；② 设置中心批1-4（T-074）：外观控件迁入设置页 + **按登录人隔离**（`gsm1921-pref-<personId>-*`，访客回落既有全局键；R1-A 首登出厂默认 书记裁决）+ 我的工作台·个人 tab 序（preferences `resolveTabOrder`：核心组置前锁定/新页签尾部/过期快照自愈/memo 按 personId+workspace，settings 拖拽/上移下移/逐行恢复/恢复全部默认，核心固定徽标）+ 支部治理迁移（书记台 branch-config tab 移除 0 残留；设置 支部治理=支部信息与向导内嵌 mountOrgSetupWizard + 工作台默认顺序写 config.modules.tabOrder；**副书同权**：PATCH config 门控 + 向导守卫 _canEditBranch）+ 域参数（L2）三键（纪检考察超期 / 组织滞留复核窗 / 组长学期提醒；policy-defaults 双态 + POLICY_OVERRIDABLE 白名单 + applyPolicyOverrides + config-clean sanitize + savePolicyOverrides/canManagePolicyOverrides：书记/副/party-staff 全量、委员仅本域）+ 支部制度参数（L3）只读锁定展示；③ 支部 config 审计内核（T-075③ cc1cde66）：configChangeHistory 支持 why（各写口 opts.why 透传、server PATCH why 同源）+ rollbackBranchConfig **单键回滚**（跨键/聚合 branch-created/config-copied 拒绝；回滚追加 {what:rollback} 不改写历史）+ CONFIG_HISTORY_MAX=100 + 设置 支部治理「配置变更记录」列表（人/时间/键/前后值/why + 单条回滚 confirm）+ server PATCH /config/rollback；④ 归属显式化（T-075① fbb67f72）：getBoundBranch（无 branchId/查无→null，不再被示例支部冒充）；登录无归属 header 中性「未绑定支部」；settings 支部治理/域参数「未找到您所属支部——请先由党委在『支部管理』中确认归属」、向导无归属不唤起；⑤ config 颗粒度 content 声明审定定稿（2e413d44）：PARTY_COMMITTEE_DESIGN §2.6 六层+旁路矩阵/词条收口/放行程序/变更流/内容接缝（§2.5 同步）+ SYSTEM_ROLE_PERMISSION §9h 写权矩阵 + USAGE_POLICY 词条；⑥ theme 强调色 person 覆盖渲染时解析一致性（T-075⑤ f1254a7a：bootstrap/header 角色标签/书记三 tab 模块快照/纪检补课 6 处）；⑦ 版本串收口 20260909e（全站 ?v= stamp 272 文件）+ CODE_VERSION 89→90；⑧ v19 切点后 09-06 晚补录：立项⑥ 成员名册网页化（组织台成员名册 tab 增删改/分组/在册滞留/守卫话术/空支部整表导入落库）+ 立项⑦ 党委治理总览首页（登录落点）+ party-staff 导航收敛（隐藏支部运行项）+ 支部层演示下钻（双端放行门/只读横幅）；⑨ 附录⑩ S1-S6 A-D 批（S1 会务考勤规则/S2 表决门槛与决议督办/S3 专班支委会表决+贡献逐条核/名册确权复核 C 批：发起书记确认生效+移出一键解除+已转出标注+学期末复核提醒/建空支部就地任命 R5-1）+ R6-2 思想汇报把关式初阅状态机（组织台初阅队列+成员端状态化修改重交）+ R6-3 today 今日聚合（today-tab 共享渲染+六工作台 today 置首+登录落点=今天）；⑩ IA-C1~C3（待办 9 业务域折组 WORK_DOMAIN/未读通知条/实时组融合 + 卡片收敛 K1 滞留只读 K2 组长复盘只读化 K3 汇报收件位=我的处置 + 中低清理批）；⑪ UI/HELP 轮（09-07~08）：U1-U5（登录入口对偶位/壳层骨架首帧去弹跳/文案四标准/日历侧栏胶囊与工具条下拉视觉统一）、UI-A/UI-B（圆角回退+间距定档）、P0-P2 提速（聚合缓存与写版本失效/索引降复杂度/渲染守卫）、HELP-C1~C3（操作手册 0-7 章/域手册①-⑨/链路+党委配置+架构收口；help-e2e 断言 19 页口径校准）；⑫ D8 与 REVIEW_QUEUE 裁决批（09-08）：tab 调序（组织思想汇报前移/纪检补课后移/党委审批前移/组长复盘状态并入组员进展）+ 批一 D1/D3/D6 域内确认去顶卡+批量（member-change-panel）+ 批二 D2/D4/D7/D9（概况汇报只读摘要+待办定位/考勤并入活动字段/组长子记录只读/人才库发展观察）+ 顶卡弹跳修复 + 书记台「党小组进展」页签组切换只读 + ?reset=init 一键初始化档（空支部起步）+ init 档浏览器防种子回填修复 + E-1~E-5（专班详情写块分块刷新/组长活动步骤草稿持久化/瞬态草稿兜底/thought-review 行级互扰/help 首屏优化）+ 丙部 P.11-P.13 落地（总表 v1 定案/概况侧只读复查报告 b154da2a/TW CDN 保持现状）+ 思想汇报 1500 阈值 UI 去显（后台知悉）；⑬ 评估职能入 .ctx（2026-09-08/09）：ENGINEERING_ASSESSMENT.md 迁入更名「工程化评估与改造行动线」+ 四区重构 + 全仓引用同步（组合能力证据入口同步设置→支部治理，2026-09-09）；⑭ README 全量同步（80b46e15 09-08：18 页口径，后随设置中心再同步 19 页 22020be6）+ REVIEW_QUEUE 清空 + DEVELOPMENT_PATH closed-loop 书记原话补充；⑮ 计数口径：全站「页面 19=12 根+7 台」（settings.html 计入根页；设置中心非工作台 tab、不入功能地图 feature 卡）；术语纪律延续 v19（中文一律「书记」）
> **生成（v19）**: 2026-09-06 — 2026-08-31~09-06 全量刷新（T-001~T-047，变更权威见 2026-09-EXECUTION_LOG.md）：① 演示数据重排至 2026-07~09 窗口（基 09-05）+ 全真人名去占位（书记=储子禾、组织=高翔宇、纪检=董建军、宣传=方文静、副书记=潘振华；滞留演示 p5 宋佳宁/p9 吕思涵）；② 滞留党员 residenceStatus + 应到名单 roster 单一源（三会+党课应到=党员非滞留 21−2=19、党小组按组，考勤/表决候选收敛、滞留者可见可辨禁选）；③ 纪检会议考勤批量全选 + 纪检更正（upsertMeetingAttendance overwrite 分项回执）；④ 立项③ 专班 a-d 全完成（progress/contributions/pending_review 审批状态机/纪检批量确认）；⑤ committee-vote 通知 activity 锚点；⑥ 开源化评估 v4（模块化 75/插件化 75/开源化 74/超参数 78/组合 78/综合≈76）+ 根 README 一般化 → README-members.md 支部版 + 30 分钟换壳指南 + ?reset=1 演示回种子；⑦ 换组织向导（立项④ 阶段一~三）+ 空组织模板（立项⑤ 阶段A commit 1984ba9，阶段B 进行中）；⑧ spec 安置纪律（临时 spec 入 .trae/specs 用后即删、禁入 content）；⑨ H60「向书记提问准则」（书记决断 strategy/product/marketing、把决策做薄）；⑩ 书记台中文一律「书记」，英文 key `secretary` 仅为代码标识（术语警讯已全仓清零）
> **生成（v18）**: 2026-08-30 — 测试基建规范化（`server/test/` 17 文件：单元 9 + 审计守护 8，`npm test` 全量）+ 部署文档 §五/§六 落地为 server 代码（nodemailer 邮件双通道 + /api/v1/report 四域上报 + 每日 03:00 定时）+ 权限收敛 S1-S10（ROLE_SSOT 单一事实源）+ 最小三成本第 5 轮（源头审校+异常驱动+抽查）+ 插件化 M1-M4（入口拆分 + HTML 瘦身）+ 考勤 UI 重设计（三段式）+ 过程性脚本清理（票证专项归档、审计守护命名规范化）
> **生成**: 2026-08-11 — 最小三成本评议两轮（T-234/T-204）+ 按人视图重构（T-201~T-205）+ 设计原则10-14 + 减负空间第一批（T-207/T-208）+ 全栈25表对称（T-209）+ W4专项评议循环 + 根目录 README 门面重构（设计理念章）+ 甲部 Harness 重组·约束力三层（T-215）
> **上版**: v19 (2026-09-06)
> **变更来源**: 2026-09-06 午后~09-09 增量（T-048~T-075 区间，见 v20 里程碑行；测试/文件计数一律以实测为准）

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README.md                   ← 对外门面（一般化开源版：设计原则 + 复用与二次开发核心章 + 30 分钟换壳指南）
├── README-members.md           ← 支部成员版（原九章正文迁入，FUNC-MAP 标记随迁）
├── LICENSE / CONTRIBUTING.md   ← 开源 License + 贡献指南
├── CLAUDE.md                   ← 上下文入口（甲部 H10-H100 约束力三层 + H60 提问准则 + 乙部执行 + 丙部待决策）
├── docs/                       ← 前端代码层（根 HTML + workspace/ 工作台 + ESM 模块化源码；页面实测 19=12 根+7 工作台，2026-09-09，清单见 §III）
│   ├── index.html              ← 主页入口（通知/招募/日历/待办四组件）
│   ├── notice.html             ← 通知独立页（含「党委下发」红标）
│   ├── about.html              ← 支部的故事
│   ├── archive.html            ← 归档库
│   ├── search.html             ← 资料查询（支部文件唯一上传入口）
│   ├── feedback.html           ← 意见反馈
│   ├── help.html               ← 系统说明书（功能地图 + 搜索，FUNCTION_CATALOG 驱动）
│   ├── login.html              ← 登录页（演示卡直达角色工作台）
│   ├── activity.html           ← 活动/专班详情公共页（议程恒定渲染 + 表决端 + 通知直达锚点）
│   ├── taskforce.html          ← 专班详情公共页
│   ├── settings.html           ← 设置中心（侧边栏右下「设置」入口：外观/我的工作台/支部治理·按登录角色分区，12 根页之一）
│   ├── wizard.html             ← 换组织向导（独立 URL 页，书记限本支部/党委任意）
│   ├── workspace/              ← 角色工作台页面（7 个 HTML，工作台+待办合一）
│   │   ├── secretary.html      ← 书记工作台（书记/副书记共用：活动写入+分工调整+issue 管理+通知发布+上报党委+待办；英文 key `secretary`=代码标识，中文一律「书记」）
│   │   ├── leader.html         ← 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办）
│   │   ├── org.html            ← 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办）
│   │   ├── prop.html           ← 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办）
│   │   ├── disc.html           ← 纪检委员工作台（考勤管理+监督复盘+考察管理+补课制度+公邮管理+待办）
│   │   ├── visitor.html        ← 成员工作台（含思想汇报提交/待办）
│   │   └── party-committee.html← 党委工作台（党委组织员·全院支部治理，组织级角色非支部角色）
│   ├── scripts/                ← bump-version.mjs（版本串纪律）/ gen-function-mermaid.mjs（README 图生成+防漂移）
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
│   ├── db.js                   ← 资源表 32（以 RESOURCE_TABLES 单一事实源为准）+ sessions/attachments
│   ├── seed.js                 ← 复用前端 mock 导入种子
│   ├── routes/                 ← auth / resources（RESOURCE_WRITE_GATE 写角色门）/ uploads / report / member / committee
│   ├── services/               ← mailer.js（SMTP 双通道）+ mailer-hooks.js（事件钩子）+ reporting.js（四域上报）
│   ├── test/                   ← 测试文件（.test.js/.test.mjs 混合，数量随目录增长；全量 npm test——命令见 CLAUDE.md H25；2026-09-05 起不再维护固定计数）
│   └── data.db                 ← SQLite 单文件库（运行时产物）
├── content/
│   ├── 01_strategy/            ← [用户] 战略路线层（DEVELOPMENT_PATH + SECRETARY_DIRECTIVES（书记原话 P-001~P-016 基线，原 SECRETARY_PRONOUNCEMENTS 更名）+ references/）
│   ├── 02_institution/         ← [用户] 组织制度层（sop/ + COMMISSIONER_DUTY_FRAMEWORK + FLAT_ORGANIZATION_DESIGN + ROLE_CLASSIFICATION + SYSTEM_ROLE_PERMISSION）
│   ├── 03_doc_system/          ← [工程师] 系统治理层（ARCHITECTURE + SSOT_INDEX + OPERATIONS_GUIDE + PROCESS_GUIDE + USAGE_POLICY + SERVICE_CATALOG + DOC_MAP）
│   ├── 04_web_design/          ← [工程师] 设计理念层（data/ deploy/ design-system/ evolution/ module/ 五子目录；DESIGN_SYSTEM/COMPONENT_SPEC/SOP_WEBSITE_GUIDE/PARTY_COMMITTEE_DESIGN 等；工程化评估已迁 .ctx/（ENGINEERING_ASSESSMENT.md），2026-09-08（更名 2026-09-09））
│   ├── 05_ai_coding/           ← [工程师] AI编码层（DOCUMENT_GOVERNANCE / CONTEXT_MANAGEMENT / REVIEW_AND_EXPRESSION / TEST_AND_VERIFICATION 等分篇）
│   ├── insights/               ← [用户]+[AI] 经验沉淀（党支部管理与实务经验沉淀.md + README）
│   └── README.md
└── .ctx/                       ← [AI]/[工程师]+[AI] 审计底座
    ├── SNAPSHOT.md             ← 当前基线快照
    ├── ENGINEERING_ASSESSMENT.md  ← 工程化评估与改造行动线（原 MODULARIZATION_ASSESSMENT；2026-09-08 自 content/04_web_design/evolution 迁入、2026-09-09 更名：评估职能归审计底座）
    ├── REVIEW_QUEUE.md         ← 书记评议队列（W4 专项附录 + 检查要点库）
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
| `CLAUDE.md` | ✅ | 上下文入口：甲部(H10-H100 约束力三层)+乙部(执行)+丙部(待决策)；H60 含「向书记提问准则」 |
| `content/03_doc_system/ARCHITECTURE.md` | ✅ | 分层架构+数据模型+变更流水线 |
| `content/03_doc_system/SSOT_INDEX.md` | ✅ | 母本注册表+同步触发矩阵 |
| `content/03_doc_system/SERVICE_CATALOG.md` | ✅ | 统一服务目录（服务清单+角色权限矩阵） |
| `content/02_institution/SYSTEM_ROLE_PERMISSION.md` | ✅ | 系统角色权限矩阵（角色键全表 §9a0 + 权限矩阵/赋权链，代码键级权威） |

### 前端页面（HTML 实测 19 个：12 根 + 7 工作台，2026-09-09；此后以 docs/ 实况为准）

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
| `taskforce.html` | 公共页 | 专班详情 |
| `wizard.html` | 公共页 | 换组织向导（书记限本支部/党委任意/他角色无权限卡） |
| `settings.html` | 独立 | 设置中心（侧边栏右下「设置」入口：外观=人人可用/我的工作台=登录用户/支部治理=书记+副书记（副书同权，含支部信息与向导/工作台默认顺序/支部制度参数只读+配置变更记录回滚）+纪检/组织/组长「域参数」卡（各管本域）；访客仅见外观；登录无归属显示「未绑定支部」提示） |
| `workspace/secretary.html` | 子页面 | 书记工作台（书记/副书记共用；活动写入+分工调整+issue 管理+通知发布+上报党委+待办；英文 key `secretary`=代码标识，中文一律「书记」） |
| `workspace/leader.html` | 子页面 | 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办） |
| `workspace/org.html` | 子页面 | 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办） |
| `workspace/prop.html` | 子页面 | 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办） |
| `workspace/disc.html` | 子页面 | 纪检委员工作台（考勤管理+监督复盘+考察管理+补课制度+公邮管理+待办） |
| `workspace/visitor.html` | 子页面 | 成员工作台（活动动态+专班进展+个人考勤+思想汇报提交+日历/列表切换+待办） |
| `workspace/party-committee.html` | 子页面 | 党委工作台（党委组织员：支部台账/支部管理/任命/上报审批/下发通知/支部配置） |

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 组织性 | 在「管理事，服务人」中获得成长；组织性是资源而非门槛 | USAGE_POLICY.md §一（2026-09-03 书记裁定）+ insights 党支部管理与实务经验沉淀.md §1 |
| 专班 | 活动之外考察积极分子的载体；赋权是运行支撑机制，工作量记录是运行保障机制 | COMMISSIONER_DUTY_FRAMEWORK.md §A.3~A.8 |
| 赋权关系链 | 党支书→支委/党小组组长；党小组组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_DUTY_FRAMEWORK.md §C |
| SOP 母本·系统实施 | 文本SOP是母本，系统是实施层；同步有边界（母本优先，先改 SOP 再同步系统，避免死循环） | SOP_WEBSITE_GUIDE.md §C.2（原 SOP_WEB 更名） |
| 信息密度精确原则 | 信息可见性是职责空间的投影；按人视图按赋权链投影（L0 个人 / L1 条线 / L2 全局） | DESIGN_SYSTEM.md §一 原则9 (P-015 第四道防线) |
| 正交维度 | SOP(执行细节) ⊥ guides(理念概括)；CLAUDE.md 作为上下文入口 | OPERATIONS_GUIDE.md §1.1 (D-218) |
| 最小三成本原则 | 最小信息成本+最小操作成本+最小适应学习成本，系统设计应让用户以最低成本完成任务 | DESIGN_SYSTEM.md §一 第2条 |
| 高频零跳转 | 最小三成本的最终验收标准——完成一个高频工作需要操作多少次？信息展示与操作是否同地 | DESIGN_SYSTEM.md §一 原则10 |
| 按人视图·知情边界 | 谁能看到谁由赋权链（执行委托）计算得出；看与做相区分，可见性不授予操作权 | DESIGN_SYSTEM.md §一 原则9 + visibility.js (P-015) |
| 知情必达 vs 审核把关 | 通知/阅读回执属「知情必达」（需触达全员，逐人确认合理）；质量把关类（考勤/考察/宣传材料/组织发展）属「审核」=源头审校+异常驱动+抽查——两类不可混同 | REVIEW_QUEUE 附录⑤ 检查要点库（2026-08-29 第5轮入库）+ attendance.js 实施基准 |
| 应到名单·滞留党员 | 「滞留党员」=关系在·人不在；三会+党课应到=党员（正式+预备）非滞留（在册 21−滞留 2=应到 19）、党小组会按组；候选可见可辨禁选、通知照发 | services/roster.js + REVIEW_QUEUE 附录⑧（2026-09-06 书记裁，T-041/T-046） |
| 向书记提问准则 | 书记决断 strategy/product/marketing，AI 负责代码工程；请裁呈「选项+上下文+推荐+默认」，把决策做薄 | CLAUDE.md H60（T-043） |
| SOP 回写 | 将网页中已实现的工作逻辑反整合到SOP中（用业务语言），使SOP成为规范、结构化、清晰的制度母本 | SOP_WEBSITE_GUIDE.md §C.5（原 insights 工程演进与设计方法论 §4.11 承接） |
| 打卡化判定 | 完成必须对应真实产物——`complete(task)` 的副作用集合仅含状态翻转即为打卡化设计缺陷 | DESIGN_METHODOLOGY.md §3.1（原 insights §6.23） |
| 能力注册表·插件化 | 功能单元按「能力声明」注册（register/get/mount 三原语 + unregister/resolveDeps），消费点从清单读取自动发现；6 工作台薄壳化 + 数据源/场景注册化 + 入口/HTML 瘦身（M1-M4 + HTML 公共资源抽取方案A 完成；量化评估见 .ctx/ENGINEERING_ASSESSMENT.md（工程化评估与改造行动线），2026-09-06 v4 综合≈76） | ARCHITECTURE_EVOLUTION.md §二（插件化演进）+ §八（拖拽编排愿景）+ .ctx/ENGINEERING_ASSESSMENT.md |
| 归属显式化 | 支部语境归属判定一律 `getBoundBranch`（person 无 branchId/查无分支→null，不被示例支部冒充）；登录无归属 header 中性「未绑定支部」，设置支部治理/域参数提示先由党委确认归属、换组织向导不唤起 | services/branch.js + settings-entry.js（T-075①，2026-09-09） |
| config 颗粒度·审计内核 | 支部 config 写权六层：个人偏好（无留痕）→ 组织档案/modules/blocks/workforce（configChangeHistory 留痕 why）→ 域参数 L2（POLICY_OVERRIDABLE 白名单，各域负责人仅本域）→ 制度刚性 L3（只读锁定）；单键变更可回滚（历史保留 100 条、回滚再留一痕、历史不改写） | PARTY_COMMITTEE_DESIGN.md §2.6（2026-09-09 审定定稿）+ SYSTEM_ROLE_PERMISSION.md §9h + settings-entry.js/config-clean.js/policy-defaults.js |

## V. 权限矩阵摘要

| 角色 | 工作台（功能分区+待办合一） |
|------|--------------------------|
| 书记（党支部书记） | 书记工作台（活动写入+专班发起+分工调整（常设赋权，票决采纳）+反馈/issue+通知发布+上报党委+待办；书记专属操作收敛 SECRETARY_ROLES） |
| 副书记（党支部副书记） | 共用书记工作台（书记专属操作除外；上报党委可发起） |
| 组织委员 | 专班建设（招募统筹·定人定责定岗）+专班发起+考察上传+人才库（含滞留维护）+发展党员+待办 |
| 宣传委员 | 宣传任务+项目看板+档案归档+周报报送+待办 |
| 纪检委员 | 考勤管理（会议类批量录入+纪检更正+应到口径 roster 单源）+考察管理+活动监督复盘+补课制度+公邮管理+待办 |
| 党小组组长 | 块块活动管理+活动写入+考勤上传（本组党小组会/本人组织活动位）+考察上传+复盘提交+待办 |
| 参与者（普通参与者） | 成员工作台（个人视角：查看支委工作成果+个人考勤+思想汇报+待办） |
| 党委组织员（党委级·不属于支部） | 党委工作台（全院支部台账+支部管理（新建/改名/任命）+上报审批+下发通知+支部配置） |

> 角色键/矩阵全量权威：`docs/src/core/constants.js` ROLE_KEYS/ROLE_LABELS/ROLE_PAGE_MAP + SYSTEM_ROLE_PERMISSION.md + SERVICE_CATALOG.md；可见性/操作权按赋权链计算（P-015 按人视图），书记工作台中文一律「书记」。

## VI. 版本里程碑

| 版本 | 日期 | 里程碑 |
|------|------|--------|
| v1 | 2026-03 | SOP 场景引擎 beta |
| v2 | 2026-04 | Agent 治理 + 交互熔断 GA + 基建 1.0 收官 |
| v3 | 2026-05-02 | 文件架构重整 + 角色体系 v2.0 + 党务管理模块上线 |
| v4 | 2026-05-03 | 术语全量清理 + 多页面迁移 + YAML 规范化 |
| v5 | 2026-05-05 | 差异化视图 + Emoji 清零 + 重复逻辑消除 |
| v6 | 2026-05-10 | 赋权链重写 + 工作台面板路由 + 三支委看板 |
| v7 | 2026-05-16 | 甲部瘦身 + Guides MECE 重构 + 专班赋权落地 + 文件定位合规化 |
| v8 | 2026-05-17 | D-12 子页面拆分(19页) + D-13 首页跳转体验 + 大型数据表筛选搜索 + 文档同步自动化 + 经验蒸馏 v10.0 |
| v9 | 2026-05-18 | 开源准备(README+LICENSE) + 合并后全域断链修复(38处) + 术语一改具改 + YAML/关联文献修复 + 经验沉淀v13.0 |
| **v10** | **2026-06-14** | **H-1看板数据断裂修复(kanban从taskforces动态派生) + D-218正交维度模型(SOP⊥guides,CLAUDE.md=上下文入口) + 响应式断点补全(768px/640px) + 宣传委员多维表格转置切换 + 周期性任务全域修复(W1-W3/M1/M3/M4/M5) + file:///全仓清零 + 经验沉淀v18.0(§10.14看板动态派生判例)** |
| **v11** | **2026-07-03** | **文档按受众×层级归类重组：content/guides/ 拆分为 strategy/(用户·meta) + design/(工程师·设计) + governance/(工程师·治理)，消除受众混淆/层级混淆/主题混淆，确认唯一信息源，更新 SNAPSHOT 和经验沉淀** |
| **v12** | **2026-07-18** | **权限系统5轮重构+organizer/deep可达性实施+UI系统性修复(色系/侧边栏/壳大字小)+emoji清零+书记评议H5工作流落地+GitHub Issue风格提案讨论系统+SECRETARY_PRONOUNCEMENTS升格根目录+SOP why补充27处** |
| **v13** | **2026-07-29** | **角色单页制重构：党建/党务合并为单页面(tab切换)+organizer/deep移除(归入首页"我的角色")+party/目录移除+members视图(人全景只读)+14页面** |
| **v14** | **2026-07-31** | **最小三成本原则工作台重构：TodoStore+NoticeTodoDeriver+LifecycleTodoDeriver服务层+todo-list组件+6角色待办tab全覆盖+notice独立页+日历迁移首页+通知→待办派生+活动/专班→待办派生+归档详情浮窗+字体二档调节+P.9决策落实(4处模板待创建处理+SOP反整合)+JS组件内联font-size修复+content目录编号化重组(01~05)+治理文件归位(ARCHITECTURE/SSOT_INDEX→03_doc_system)+15页面** |
| **v15** | **2026-08-03** | **根目录文档系统更新（README 读者旅程九章重构 + CLAUDE.md/content README/.ctx SNAPSHOT+TIMESTAMPS 同步）+ P1 后端基建落地（Node 一体化服务：Express + better-sqlite3 + auth/resources/uploads API + 16 测试全绿）** |
| **v16** | **2026-08-10** | **最小三成本原则评议两轮闭环（T-234/T-204）+ 书记工作台按人视图重构（T-201~T-205）+ 设计原则10-14（高频零跳转/进度指标/工作台集成/文件流闭环/KPI异化防御）+ 减负空间第一批（T-207/T-208）+ 全栈25表对称（T-209）+ W4专项评议循环 + 根目录 README 门面重构（设计理念章）** |
| **v17** | **2026-08-11** | **甲部 Harness 重组·约束力三层（T-215）：热层 H10-H40 写全（全局约束力强）+ 温层 H50-H80 机制骨架写全+细节指针 + 冷层 H90-H100 纯指针，编号 10 递增位值对应；H60 评议细节指针化下沉 OPERATIONS_GUIDE 新增 §18；C 类新增沉淀优先级联动（H30.4）+ 三机制边界声明；OPERATIONS_GUIDE §9.1 编号体系重写；全仓旧编号引用一改具改零残留** |
| **v18** | **2026-08-30** | **测试基建规范化 + 部署落地 + 权限收敛：`server/test/` 17 测试文件（单元 9 + 审计守护 8，票证专项 t235/t280-b1/m4/min3-review/t280-b5 归档）+ CLAUDE.md H25 测试系统（AI 必知）+ 部署文档 §五/§六 落地（mailer.js SMTP 双通道 + report 四域接口 + 03:00 定时 + 会议提醒）+ 权限收敛 S1-S10（ROLE_KEYS 单一事实源 → 能力/可见性/主题色派生，S9 文档登记零变更）+ 最小三成本第 5 轮（源头审校+异常驱动+抽查、考勤三段式重设计）+ 插件化 M1-M4 + HTML 公共资源抽取（方案A）+ 过程性脚本清理** |
| **v19** | **2026-09-06** | **2026-08-31~09-06 增量收口（权威见 2026-09-EXECUTION_LOG T-001~T-047）：① 功能地图/help 重构（FUNCTION_CATALOG 单一事实源 + 12 条角色化链路 FLOW_LINKS + README/help mermaid 图）；② 线上异步表决泛化至支部党员大会（voteConfig 参数化 + 硬校验 + 公共页表决端）；③ 脏集合增量快照修复并发互覆；④ 党委后台 P1-P3（branches 域/支部 config/header 软编码 + 书记任命任期 appointmentRecords + 上报审批 reviewRequests/党委下发通知）+ RESOURCE_WRITE_GATE 服务端写角色门 + 支部隔离锚点 withinBranch；⑤ 工作流模块化 L1-L3（config.modules/blocks + 块画布 v0 + block manifest S1-S4）+ 统一扎口 P0（forms/badges/reporting/person）+ 表单美学 B1-B4 + 面板保态；⑥ 权限语义 A1（上传位收敛/纪检会议类直录/recordedBy 真实操作人）+ L4 M2 支部分工改派（票决 2/3 无异议硬门槛 + 履职卡常驻 + configChangeHistory 留痕）；⑦ 六场景点验修复（议程编辑数据安全 + 通知 activity 锚点 + 会议考勤批量全选/纪检更正 upsertMeetingAttendance overwrite）；⑧ 滞留党员 residenceStatus + roster 应到名单单一源（三会+党课应到=党员非滞留 21−2=19、党小组按组、考勤/表决候选收敛 + PersonPicker 滞留者可见可辨禁选）；⑨ 立项③ 专班 a-d 全完成（progress/contributions/pending_review 审批状态机/纪检批量确认）；⑩ 演示数据 2026-07~09 窗口（基 09-05）+ 全真人名去占位（书记=储子禾、组织=高翔宇、纪检=董建军、宣传=方文静、副书记=潘振华；滞留演示 p5 宋佳宁/p9 吕思涵）；⑪ 开源化评估 v4（模块化 75/插件化 75/开源化 74/超参数 78/组合 78/综合≈76）+ 根 README 一般化（复用与二次开发核心章）→ README-members.md 支部版 + 30 分钟换壳指南 + ?reset=1 演示一键回种子；⑫ 换组织向导（立项④ 阶段一~三：5 步向导 org-setup-wizard/party-config 吸收/wizard.html/配置包 JSON 导出导入 org-config-package/复制到支部 applyConfigCopy/成员名册数据预览 org-base-data-preview，spec 用后即删）；⑬ 空组织模板（立项⑤ 阶段A commit 1984ba9：EMPTY_BRANCH_TEMPLATE + POST /branches empty|copy（party-staff 门控）+ 新建支部入口 + auditEmptyBranchRecord 引用审计 + empty-template 10 测试/回归 42/42；阶段B ?reset 分层进行中）；⑭ spec 安置纪律（临时 spec 入 .trae/specs 用后即删、禁入 content，存量已清）+ H60「向书记提问准则」（书记决断 strategy/product/marketing、把决策做薄）+ 文档数字风化（计数改动态口径或以 npm test 实测为准）** |
| **v20** | **2026-09-09** | **设置中心收口（T-074，settings.html = 12 根页之第 12 页）：外观控件迁入设置页 + 按登录人隔离（gsm1921-pref-<personId>-*，R1-A 首登出厂默认）+「我的工作台」个人页签序（resolveTabOrder 核心置前/过期自愈）+ 支部治理迁移（书记台 branch-config tab 废止，入口收口 设置→支部治理：支部信息与向导内嵌/工作台默认顺序/支部制度参数 L3 只读；**副书同权**）+ 域参数 L2 三键收编（纪检考察超期/组织滞留复核窗/组长学期提醒，POLICY_OVERRIDABLE 白名单）+ 审计内核（T-075③）：configChangeHistory why 透传 + 单键回滚（回滚再留痕、历史不改写、上限 100）+「配置变更记录」列表 + 归属显式化（T-075① getBoundBranch +「未绑定支部」口径）+ config 颗粒度 content 声明审定（PARTY_COMMITTEE_DESIGN §2.6/§9h/USAGE_POLICY 词条）+ theme 强调色按人渲染时解析一致性 + 全站 ?v=20260909e（272 文件）+ CODE_VERSION 90；同窗收 09-06 晚~09-08 批次：成员名册网页化与党委治理总览首页（立项⑥⑦）、附录⑩ S1-S6 A-D 批与 R6-2/3（思想汇报把关式初阅/today 置首）、待办 9 业务域化（IA-C1）与卡片收敛 C2/C3、UI/HELP 重构轮（U1-U5/HELP-C1~C3/P0-P2 提速）、D8 裁决批一/二（tab 调序/域内批量确认/概况只读摘要）与顶卡弹跳修复、?reset=init 一键初始化档、E-1~E-5、丙部 P.11-P.13 落地、评估文档更名「工程化评估与改造行动线」入 .ctx（ENGINEERING_ASSESSMENT）** |
