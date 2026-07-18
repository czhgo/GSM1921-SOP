---
role: "[AI]"
title: "系统快照"
type: snapshot
status: "ACTIVE"
date: "2026-07-03"
last_updated: "2026-07-11"
version: "v11"
milestone: "文档按受众×层级归类重组 + content/guides/ 拆分为 strategy/design/governance"
---

# System Snapshot — v11

> 当前活跃基线。历史快照见 `.ctx/snapshots/`。
> **生成**: 2026-07-03 — 文档按受众×层级归类重组
> **上版**: v10 (2026-06-14)
> **变更来源**: 文档归类重组 spec（classify-documents-by-audience）

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README.md                   ← 对外门面（开源级质量，面向全体支部成员）
├── LICENSE                     ← MIT License
├── ARCHITECTURE.md             ← 核心架构说明（分层、数据模型、变更流水线）
├── CLAUDE.md                   ← 上下文入口（甲部 Harness + 乙部执行 + 丙部待决策）
├── SSOT_INDEX.md               ← 单一权威源索引（母本与子本映射关系）
├── docs/                       ← 前端代码层（5 个根 HTML + workspace/ + party/ 子目录 + ESM 模块化源码）
│   ├── index.html              ← 主页入口（通知/招募/日历三组件）
│   ├── about.html              ← 系统说明书
│   ├── archive.html            ← 归档库
│   ├── search.html             ← 资料查询
│   ├── feedback.html           ← 意见反馈
│   ├── workspace/              ← 党建工作台页面（9 个 HTML）
│   │   ├── index.html          ← 党建工作台入口（路由跳转页）
│   │   ├── secretary.html      ← 党建·党支书工作台
│   │   ├── leader.html         ← 党建·党小组组长工作台
│   │   ├── organizer.html      ← 党建·组织者工作台
│   │   ├── deep.html           ← 党建·深度参与者工作台
│   │   ├── org.html            ← 党建·组织委员工作台
│   │   ├── prop.html           ← 党建·宣传委员工作台
│   │   ├── disc.html           ← 党建·纪检委员工作台
│   │   └── visitor.html        ← 党建·成员只读面板
│   ├── party/                  ← 党务管理页面（5 个 HTML）
│   │   ├── index.html          ← 党务管理入口（路由跳转页）
│   │   ├── secretary.html      ← 党务·党支书面板
│   │   ├── org.html            ← 党务·组织委员面板
│   │   ├── prop.html           ← 党务·宣传委员面板
│   │   └── disc.html           ← 党务·纪检委员面板
│   └── src/                    ← ESM 模块化源码
│       ├── entries/            ← 页面入口（18 个 entry JS）
│       ├── components/         ← 共享组件（6 个）
│       ├── core/               ← 核心工具（7 个）
│       ├── services/           ← 服务层（7 个）
│       ├── mock/               ← Mock 数据（9 个，kanban.js 已删除）
│       ├── modules/            ← 业务模块（2 个）
│       ├── workflow/           ← 工作流引擎（7 个）
│       └── styles.css          ← 全局样式
├── content/
│   ├── strategy/               ← [用户] 战略路线层（meta 级，1 文件 + README）
│   ├── SOP/                    ← [用户] 执行流程层（具体操作，6 文件 + INDEX.md）
│   ├── design/                 ← [工程师] 设计理念层（架构+功能设计，13 文件 + README）
│   ├── governance/             ← [工程师] 系统治理层（术语/角色/文档/流程，10 文件 + README）
│   ├── insights/               ← [用户]+[AI] 经验沉淀（v21.0，道/术/器三层架构）
│   └── references/             ← [用户]  官方文件+模板库（只读）
├── .github/                    ← [AI] Agent & Skill 治理（仅VSCode可用，Trae中忽略，D-186）
│   ├── agents/                 ← Agent 配置
│   └── skills/                 ← Skill 定义（11 个）
└── .ctx/                       ← [AI]/[工程师]+[AI] 审计底座
    ├── SNAPSHOT.md             ← 当前基线快照
    ├── TIMESTAMPS.md           ← 文件时间戳注册表
    ├── snapshots/              ← 历史快照归档
    └── logs/                   ← 执行日志+决策日志
```

## II. 分层架构（D-218 正交维度模型）

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `CLAUDE.md` + `SSOT_INDEX.md` | [工程师]+[AI] |
| 1 | 上下文层 | `CLAUDE.md`（HARNESS 入口）+ `ARCHITECTURE.md` | [工程师]+[AI] |
| 2 | 理念维度 | `content/strategy/` + `content/design/`（为什么这样做/为什么这样设计） | [用户]/[工程师] |
| 2.5 | 治理维度 | `content/governance/`（系统治理规范） | [工程师] |
| 3 | 执行维度 | `content/sop/`（怎么做） | [用户]+[AI] |
| 4 | Agent 治理层 | `.github/agents/` + `.github/skills/` | [AI] |
| 5 | 代码实现层 | `docs/src/` + `docs/*.html`（19 页面） | [工程师]+[AI] |
| 6 | 审计层 | `.ctx/`（logs/snapshots/TIMESTAMPS） | [AI]/[工程师]+[AI] |
| 7 | 参考层 | `content/references/` | [用户] |

> **D-218**：SOP（执行细节）和 guides（理念概括）是正交维度，不排先后。
> CLAUDE.md 是最高层上下文入口，承接理念和具体细节。

## III. 核心文件清单

### 治理文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `CLAUDE.md` | ✅ | 上下文入口：甲部(Harness)+乙部(执行)+丙部(待决策) |
| `ARCHITECTURE.md` | ✅ | 分层架构+数据模型+变更流水线 |
| `SSOT_INDEX.md` | ✅ | 母本注册表+同步触发矩阵（根目录） |

### 前端页面（19 个 HTML）

| 页面 | 类型 | 说明 |
|------|------|------|
| `index.html` | 入口 | 主页（通知/招募/日历） |
| `workspace/index.html` | 入口 | 党建工作台入口→角色选择→子页面跳转 |
| `workspace/secretary.html` | 子页面 | 党建·党支书（活动写入+日历+数据后台） |
| `workspace/leader.html` | 子页面 | 党建·党小组组长（活动写入+日历+组员管理） |
| `workspace/organizer.html` | 子页面 | 党建·组织者（日历+任务查看） |
| `workspace/deep.html` | 子页面 | 党建·深度参与者（日历+任务查看） |
| `workspace/org.html` | 子页面 | 党建·组织委员（专班管理看板+追踪看板+搜索） |
| `workspace/prop.html` | 子页面 | 党建·宣传委员（活动+专班看板+多维表格+转置切换+搜索筛选） |
| `workspace/disc.html` | 子页面 | 党建·纪检委员（考勤+考察+活动监督+搜索筛选+只读模式） |
| `workspace/visitor.html` | 子页面 | 党建·成员只读（活动动态+专班进展+考勤+日历/列表切换） |
| `party/index.html` | 入口 | 党务管理入口→角色选择→子页面跳转 |
| `party/secretary.html` | 子页面 | 党务·党支书（全局聚合+意见反馈数据） |
| `party/org.html` | 子页面 | 党务·组织委员（发展党员全流程+材料催缴） |
| `party/prop.html` | 子页面 | 党务·宣传委员（宣传档案+周报） |
| `party/disc.html` | 子页面 | 党务·纪检委员（补课制度+公邮管理） |
| `about.html` | 独立 | 系统说明书（含三委员党建与党务工作职责矩阵） |
| `archive.html` | 独立 | 归档库 |
| `search.html` | 独立 | 资料查询 |
| `feedback.html` | 独立 | 意见反馈 |

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 党建与党务工作 | 党建工作(服务同学) x 党务工作(发展党员/党费缴纳/档案管理) | DATA_ARCHITECTURE.md + USAGE_POLICY.md §1.1 |
| 专班 | 活动之外考察积极分子的载体；赋权是运行支撑机制，工作量记录是运行保障机制 | COMMISSIONER_FRAMEWORK.md §A.3~A.8 |
| 差异化视图 | 同一数据源，不同切面展示 | PARTICIPANT_DATAFLOW.md §八 |
| 赋权关系链 | 党支书→支委/党小组组长；党小组组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_FRAMEWORK.md §C |
| SOP双向修改 | 文本SOP是母本，系统是实施层 | SOP_WEB.md |
| 视图模式三分类 | 管理模式(基类) / 管理者只读(继承-写入) / 成员只读(独立视图) | CLAUDE.md H2.5 |
| 正交维度模型 | SOP(执行细节) ⊥ guides(理念概括)；CLAUDE.md = 上下文入口 | OPERATIONS_GUIDE.md §7.1 (D-218) |

## V. 权限矩阵摘要

| 角色 | 党建工作台 | 党务管理 |
|------|-----------|---------|
| 党支书 | 全局视图+活动写入+专班发起 | 全局视图+全部权限 |
| 组织委员 | 专班建设（招募统筹·定人定责定岗）+专班发起 | 发展党员全流程 |
| 宣传委员 | 活动与专班视图（多维表格+转置切换+搜索筛选） | 宣传档案合规建设 |
| 纪检委员 | 考勤管理·考察管理·活动监督复盘 | 补课制度·公邮管理 |
| 党小组组长 | 块块活动管理+活动写入+专班发起 | 小组成员管理 |
| 组织者 | 活动/专班编辑视图（经赋权） | — |
| 深度参与者 | 任务查看视图（经赋权） | — |
| 参与者 | 成员只读（独立视图，查看支委工作成果+个人考勤） | — |

## VI. 版本里程碑

| 版本 | 日期 | 里程碑 |
|------|------|--------|
| v1 | 2026-03 | SOP 场景引擎 beta |
| v2 | 2026-04 | Agent 治理 + 交互熔断 GA + 基建 1.0 收官 |
| v3 | 2026-05-02 | 文件架构重整 + 角色体系 v2.0 + 党务管理模块上线 |
| v4 | 2026-05-03 | 术语全量清理 + 多页面迁移 + YAML 规范化 |
| v5 | 2026-05-05 | 差异化视图 + Emoji 清零 + 重复逻辑消除 |
| v6 | 2026-05-10 | 赋权链重写 + 工作台面板路由 + 三委员看板 |
| v7 | 2026-05-16 | 甲部瘦身 + Guides MECE 重构 + 专班赋权落地 + 文件定位合规化 |
| v8 | 2026-05-17 | D-12 子页面拆分(19页) + D-13 首页跳转体验 + 大型数据表筛选搜索 + 文档同步自动化 + 经验蒸馏 v10.0 |
| v9 | 2026-05-18 | 开源准备(README+LICENSE) + 合并后全域断链修复(38处) + 术语一改具改 + YAML/关联文献修复 + 经验沉淀v13.0 |
| **v10** | **2026-06-14** | **H-1看板数据断裂修复(kanban从taskforces动态派生) + D-218正交维度模型(SOP⊥guides,CLAUDE.md=上下文入口) + 响应式断点补全(768px/640px) + 宣传委员多维表格转置切换 + 周期性任务全域修复(W1-W3/M1/M3/M4/M5) + file:///全仓清零 + 经验沉淀v18.0(§10.14看板动态派生判例)** |
| **v11** | **2026-07-03** | **文档按受众×层级归类重组：content/guides/ 拆分为 strategy/(用户·meta) + design/(工程师·设计) + governance/(工程师·治理)，消除受众混淆/层级混淆/主题混淆，确认唯一信息源，更新 SNAPSHOT 和经验沉淀** |
