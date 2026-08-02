---
role: "[AI]"
title: "系统快照"
type: snapshot
status: "ACTIVE"
date: "2026-07-18"
last_updated: "2026-07-31"
version: "v14"
milestone: "最小三成本原则工作台重构+字体二档调节+P.9决策落实+JS组件内联font-size修复+SOP反整合"
---

# System Snapshot — v14

> 当前活跃基线。历史快照见 `.ctx/snapshots/`。
> **生成**: 2026-07-31 — 最小三成本原则工作台重构+待办通知体系+P.9决策落实+SOP反整合
> **上版**: v13 (2026-07-29)
> **变更来源**: T-142 最小三成本原则·工作台重构阶段1A/1B/1C + T-141 功能定位修正·阶段4

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README.md                   ← 对外门面（开源级质量，面向全体支部成员）

├── CLAUDE.md                   ← 上下文入口（甲部 Harness + 乙部执行 + 丙部待决策）
├── docs/                       ← 前端代码层（9 个根 HTML + workspace/ 子目录 + ESM 模块化源码）
│   ├── index.html              ← 主页入口（通知/招募/日历/待办四组件）
│   ├── notice.html             ← 通知独立页
│   ├── about.html              ← 系统说明书
│   ├── archive.html            ← 归档库
│   ├── search.html             ← 资料查询
│   ├── feedback.html           ← 意见反馈
│   ├── help.html               ← 帮助与探索工作页面
│   ├── login.html              ← 登录页
│   ├── workspace/              ← 角色工作台页面（6 个 HTML，党建+党务+待办合一）
│   │   ├── secretary.html      ← 书记工作台（工作台+赋权管理+issue管理+通知发布+待办）
│   │   ├── leader.html         ← 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办）
│   │   ├── org.html            ← 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办）
│   │   ├── prop.html           ← 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办）
│   │   ├── disc.html           ← 纪检委员工作台（考勤管理+监督复盘+考察管理+补课制度+公邮管理+待办）
│   │   └── visitor.html        ← 成员只读面板（含待办）
│   └── src/                    ← ESM 模块化源码
│       ├── entries/            ← 页面入口（16 个 entry JS）
│       ├── components/         ← 共享组件（18 个，含 todo-list/workspace-popover/role-hierarchy）
│       ├── core/               ← 核心工具（9 个）
│       ├── config/             ← 配置（branch.json）
│       ├── services/           ← 服务层（20 个，含 todo/auth/notice/decision-tree/image）
│       ├── mock/               ← Mock 数据（11 个，含 accounts）
│       ├── modules/            ← 业务模块（2 个）
│       ├── workflow/           ← 工作流引擎（7 个）
│       └── styles.css          ← 全局样式
├── content/
│   ├── 01_strategy/            ← [用户] 战略路线层（DEVELOPMENT_PATH + SECRETARY_PRONOUNCEMENTS + references/）
│   ├── 02_institution/         ← [用户] 组织制度层（sop/ + COMMISSIONER_FRAMEWORK + FLAT_DESIGN + ROLE_CLASSIFICATION）
│   ├── 03_doc_system/          ← [工程师] 系统治理层（ARCHITECTURE + SSOT_INDEX + OPERATIONS_GUIDE + USAGE_POLICY + DOC_MAP）
│   ├── 04_web_design/          ← [工程师] 设计理念层（DATA_ARCHITECTURE + DESIGN_SYSTEM + SOP_WEB + MODULE_UI_DESIGN）
│   ├── 05_ai_coding/           ← [工程师] AI编码层（KNOWN_PITFALLS）
│   ├── insights/               ← [用户]+[AI] 经验沉淀（道/术/器三层架构）
│   └── README.md
└── .ctx/                       ← [AI]/[工程师]+[AI] 审计底座
    ├── SNAPSHOT.md             ← 当前基线快照
    ├── TIMESTAMPS.md           ← 文件时间戳注册表
    ├── snapshots/              ← 历史快照归档
    └── logs/                   ← 执行日志+决策日志
```

## II. 分层架构（D-218 正交维度模型）

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `CLAUDE.md` + `content/03_doc_system/SSOT_INDEX.md` | [工程师]+[AI] |
| 1 | 上下文层 | `CLAUDE.md`（HARNESS 入口）+ `content/03_doc_system/ARCHITECTURE.md` | [工程师]+[AI] |
| 2 | 理念维度 | `content/01_strategy/` + `content/04_web_design/`（为什么这样做/为什么这样设计） | [用户]/[工程师] |
| 2.5 | 治理维度 | `content/03_doc_system/`（系统治理规范） | [工程师] |
| 3 | 执行维度 | `content/02_institution/sop/`（怎么做） | [用户]+[AI] |
| 4 | 代码实现层 | `docs/src/` + `docs/*.html`（15 页面） | [工程师]+[AI] |
| 5 | 审计层 | `.ctx/`（logs/snapshots/TIMESTAMPS） | [AI]/[工程师]+[AI] |
| 6 | 参考层 | `content/01_strategy/references/` | [用户] |

> **D-218**：SOP（执行细节）和 guides（理念概括）是正交维度，不排先后。
> CLAUDE.md 是最高层上下文入口，承接理念和具体细节。

## III. 核心文件清单

### 治理文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `CLAUDE.md` | ✅ | 上下文入口：甲部(Harness)+乙部(执行)+丙部(待决策) |
| `content/03_doc_system/ARCHITECTURE.md` | ✅ | 分层架构+数据模型+变更流水线 |
| `content/03_doc_system/SSOT_INDEX.md` | ✅ | 母本注册表+同步触发矩阵 |

### 前端页面（15 个 HTML）

| 页面 | 类型 | 说明 |
|------|------|------|
| `index.html` | 入口 | 主页（通知/招募/日历/待办） |
| `notice.html` | 独立 | 通知独立页 |
| `help.html` | 独立 | 帮助与探索工作页面（角色体系+发展路径可视化） |
| `login.html` | 独立 | 登录页 |
| `workspace/secretary.html` | 子页面 | 书记工作台（工作台+赋权管理+issue管理+通知发布+待办） |
| `workspace/leader.html` | 子页面 | 党小组组长工作台（活动写入+考勤上传+考察上传+复盘提交+待办） |
| `workspace/org.html` | 子页面 | 组织委员工作台（考察上传+专班管理+人才库+发展党员+待办） |
| `workspace/prop.html` | 子页面 | 宣传委员工作台（宣传任务+项目看板+档案归档+周报报送+待办） |
| `workspace/disc.html` | 子页面 | 纪检委员工作台（考勤管理+监督复盘+考察管理+补课制度+公邮管理+待办） |
| `workspace/visitor.html` | 子页面 | 成员只读（活动动态+专班进展+考勤+日历/列表切换+待办） |
| `about.html` | 独立 | 系统说明书（含三支委党建与党务工作职责矩阵） |
| `archive.html` | 独立 | 归档库 |
| `search.html` | 独立 | 资料查询 |
| `feedback.html` | 独立 | 意见反馈 |

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 党建与党务工作 | 党建工作(管理组织活动) x 党务工作(管理人员发展)，两者都是"管理事，服务人" | DATA_ARCHITECTURE.md + USAGE_POLICY.md §1.1 |
| 专班 | 活动之外考察积极分子的载体；赋权是运行支撑机制，工作量记录是运行保障机制 | COMMISSIONER_FRAMEWORK.md §A.3~A.8 |
| 差异化视图 | 同一数据源，不同切面展示 | DATA_ARCHITECTURE.md §三 |
| 赋权关系链 | 党支书→支委/党小组组长；党小组组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_FRAMEWORK.md §C |
| SOP双向修改 | 文本SOP是母本，系统是实施层 | SOP_WEB.md |
| 视图模式三分类 | 管理模式(基类) / 管理者只读(继承-写入) / 成员只读(独立视图) | CLAUDE.md H2.5 |
| 正交维度模型 | SOP(执行细节) ⊥ guides(理念概括)；CLAUDE.md = 上下文入口 | OPERATIONS_GUIDE.md §7.1 (D-218) |
| 最小三成本原则 | 最小信息成本+最小操作成本+最小适应学习成本，系统设计应让用户以最低成本完成任务 | DESIGN_SYSTEM.md §一 第2条 |
| SOP反整合 | 将网页中已实现的工作逻辑反整合到SOP中（用业务语言），使SOP成为规范、结构化、清晰的制度母本 | insights 工程演进与设计方法论.md §4.11 |

## V. 权限矩阵摘要

| 角色 | 工作台（党建+党务+待办合一） |
|------|--------------------------|
| 党支书 | 全局视图+活动写入+专班发起+常设赋权+issue管理+通知发布+待办 |
| 组织委员 | 专班建设（招募统筹·定人定责定岗）+专班发起+考察上传+人才库+发展党员+待办 |
| 宣传委员 | 宣传任务+项目看板+档案归档+周报报送+待办 |
| 纪检委员 | 考勤管理+考察管理+活动监督复盘+补课制度+公邮管理+待办 |
| 党小组组长 | 块块活动管理+活动写入+考勤上传+考察上传+复盘提交+待办 |
| 参与者 | 成员只读（独立视图，查看支委工作成果+个人考勤+待办） |

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
