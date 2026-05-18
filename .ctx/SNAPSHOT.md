---
role: "[AI]"
title: "系统快照"
type: snapshot
status: "ACTIVE"
date: "2026-05-17"
version: "v8"
milestone: "D-12 子页面拆分 + D-13 首页跳转体验 + 大型数据表筛选搜索 + 文档同步自动化"
last_updated: "2026-05-17"
---

# System Snapshot — v8

> 当前活跃基线。历史快照见 `.ctx/snapshots/`。
> **生成**: 2026-05-17 — 经验蒸馏 + SNAPSHOT + README + ABOUT 重写
> **上版**: v7 (2026-05-16)
> **变更来源**: T48-1~7(D-12 子页面拆分) + T49-1~4(D-13 首页跳转) + T30-11~16(可视化+回归测试+文档同步) + 经验蒸馏 v10.0

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README.md                   ← 对外门面（用户+产品经理双职能）
├── ARCHITECTURE.md             ← 核心架构说明（分层、数据模型、变更流水线）
├── CLAUDE.md                   ← 最高治理文件（甲部 Harness + 乙部执行 + 丙部待决策）
├── docs/                       ← 前端代码层（19 个 HTML + ESM 模块化源码）
│   ├── index.html              ← 主页入口（通知/招募/日历三组件）
│   ├── workspace.html          ← 党建工作台入口（路由跳转页）
│   ├── party.html              ← 党务管理入口（路由跳转页）
│   ├── about.html              ← 系统说明书
│   ├── archive.html            ← 归档库
│   ├── search.html             ← 资料查询
│   ├── feedback.html           ← 意见反馈
│   ├── ws-secretary.html       ← 党建·党支书工作台
│   ├── ws-leader.html          ← 党建·党小组组长工作台
│   ├── ws-organizer.html       ← 党建·活动组织者工作台
│   ├── ws-deep.html            ← 党建·深度参与者工作台
│   ├── ws-org-commissioner.html← 党建·组织委员工作台
│   ├── ws-prop-commissioner.html← 党建·宣传委员工作台
│   ├── ws-disc-commissioner.html← 党建·纪检委员工作台
│   ├── ws-visitor.html         ← 党建·访客只读面板
│   ├── party-secretary.html    ← 党务·党支书面板
│   ├── party-org.html          ← 党务·组织委员面板
│   ├── party-prop.html         ← 党务·宣传委员面板
│   ├── party-disc.html         ← 党务·纪检委员面板
│   └── src/                    ← ESM 模块化源码
│       ├── entries/            ← 页面入口（18 个 entry JS）
│       │   ├── main-entry.js   ← 主页启动入口
│       │   ├── workspace-entry.js← 党建工作台路由页（65行）
│       │   ├── party-entry.js  ← 党务管理路由页（57行）
│       │   ├── ws-*-entry.js   ← 党建 8 个角色子页面入口
│       │   └── party-*-entry.js← 党务 4 个角色子页面入口
│       ├── components/         ← 共享组件（6 个）
│       │   ├── header.js       ← 全局 Header（含 view-mode-switcher）
│       │   ├── sidebar.js      ← 全局 Sidebar（6 项导航+角色选择）
│       │   ├── role-selector.js← 角色选择面板（D-12 核心组件）
│       │   ├── calendar.js     ← 日历渲染引擎
│       │   ├── inspector.js    ← 活动检查器
│       │   └── commissioner-matrix.js← 三委员双域职责矩阵
│       ├── core/               ← 核心工具（7 个）
│       │   ├── constants.js    ← 全局常量（ROLE_LABELS 权威源）
│       │   ├── cross-page-state.js← 跨页面状态管理（含 URL 参数支持）
│       │   ├── domain.js       ← 双域判定逻辑
│       │   ├── id.js           ← ID 生成器
│       │   ├── state.js        ← 全局状态
│       │   └── utils.js        ← 工具函数
│       ├── services/           ← 服务层（7 个）
│       │   ├── auth.js         ← 认证服务（AUTHZ_CHAIN+ViewModeStore+canWriteActivity）
│       │   ├── roles.js        ← 赋权服务
│       │   ├── notice.js       ← 通知服务
│       │   ├── taskforce.js    ← 专班服务
│       │   ├── feedback.js     ← 反馈服务
│       │   ├── mock.js         ← Mock 数据聚合
│       │   └── runtime.js      ← 运行时服务
│       ├── mock/               ← Mock 数据（10 个）
│       ├── modules/            ← 业务模块（2 个：party.js+references.js）
│       ├── workflow/           ← 工作流引擎（7 个）
│       └── styles.css          ← 全局样式（哑光扁平化设计系统）
├── content/
│   ├── SOP/                    ← [人机] 制度母本（5 文件 + INDEX.md）
│   ├── guides/                 ← [人机] 设计理念与操作规范（MECE 三分类 15 文件）
│   │   ├── governance/         ← 治理规范（7 文件）
│   │   ├── architecture/       ← 架构设计（3 文件）
│   │   ├── design/             ← 功能设计（5 文件）
│   │   └── README.md           ← guides 唯一入口索引
│   ├── insights/               ← [人机] 经验沉淀（v10.0）
│   └── references/             ← [人]  官方文件+模板库（只读）
├── .github/                    ← [AI] Agent & Skill 治理
│   ├── copilot-instructions.md ← 全局系统指令（宪章）
│   ├── SSOT_INDEX.md           ← 母本注册表
│   ├── agents/                 ← Agent 配置
│   └── skills/                 ← Skill 定义（含 sop-web-sync）
└── .ctx/                       ← [AI]/[人机] 审计底座
    ├── SNAPSHOT.md             ← 系统快照（ACTIVE）
    ├── TIMESTAMPS.md           ← 文件时间戳注册表
    ├── CONTEXT.md              ← AI 快速同步入口
    ├── snapshots/              ← 历史快照归档
    └── logs/                   ← 执行日志+决策日志
```

## II. 分层架构

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `CLAUDE.md` 甲部 + `.github/copilot-instructions.md` | [AI] |
| 1 | 治理层 | `content/guides/`（governance/architecture/design） | [人机] |
| 2 | 架构层 | `ARCHITECTURE.md` | [人机] |
| 3 | 操作层 | `content/SOP/` | [人机] |
| 4 | 代码实现层 | `docs/src/` + `docs/*.html`（19 页面） | [人机] |
| 5 | 参考层 | `content/references/` | [人] |
| 6 | 审计层 | `.ctx/`（logs/snapshots/TIMESTAMPS） | [AI]/[人机] |

## III. 核心文件清单

### 治理文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `CLAUDE.md` | ✅ | 甲部(Harness)+乙部(执行)+丙部(待决策) |
| `ARCHITECTURE.md` | ✅ | 分层架构+数据模型+变更流水线 |
| `.github/copilot-instructions.md` | ✅ | 全局系统指令 |
| `.github/SSOT_INDEX.md` | ✅ | 母本注册表+同步触发矩阵 |

### 前端页面（19 个 HTML）

| 页面 | 类型 | 说明 |
|------|------|------|
| `index.html` | 入口 | 主页（通知/招募/日历） |
| `workspace.html` | 路由 | 党建工作台入口→角色选择→子页面跳转 |
| `party.html` | 路由 | 党务管理入口→角色选择→子页面跳转 |
| `ws-secretary.html` | 子页面 | 党建·党支书（活动写入+日历+数据后台） |
| `ws-leader.html` | 子页面 | 党建·党小组组长（活动写入+日历+组员管理） |
| `ws-organizer.html` | 子页面 | 党建·活动组织者（日历+任务查看） |
| `ws-deep.html` | 子页面 | 党建·深度参与者（日历+任务查看） |
| `ws-org-commissioner.html` | 子页面 | 党建·组织委员（专班管理看板+追踪看板+搜索） |
| `ws-prop-commissioner.html` | 子页面 | 党建·宣传委员（活动与专班看板+多维表格+搜索筛选） |
| `ws-disc-commissioner.html` | 子页面 | 党建·纪检委员（考勤+考察+活动监督+搜索筛选+只读模式） |
| `ws-visitor.html` | 子页面 | 党建·访客只读（活动动态+专班进展+考勤+日历/列表切换） |
| `party-secretary.html` | 子页面 | 党务·党支书（全局聚合+意见反馈数据） |
| `party-org.html` | 子页面 | 党务·组织委员（党员发展全流程+材料催缴） |
| `party-prop.html` | 子页面 | 党务·宣传委员（宣传档案+周报） |
| `party-disc.html` | 子页面 | 党务·纪检委员（补课制度+公邮管理） |
| `about.html` | 独立 | 系统说明书（含三委员双域职责矩阵） |
| `archive.html` | 独立 | 归档库 |
| `search.html` | 独立 | 资料查询 |
| `feedback.html` | 独立 | 意见反馈 |

### 前端源码关键文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `entries/main-entry.js` | ✅ | 主页启动入口+3个点击处理器（URL参数跳转） |
| `entries/workspace-entry.js` | ✅ | 路由页（65行，检测角色→replace跳转） |
| `entries/party-entry.js` | ✅ | 路由页（57行，同上逻辑） |
| `components/role-selector.js` | ✅ | D-12核心组件（12角色跳转子页面） |
| `components/header.js` | ✅ | 全局Header+view-mode-switcher |
| `components/sidebar.js` | ✅ | 全局Sidebar+interceptSidebarNavigation |
| `components/commissioner-matrix.js` | ✅ | 三委员双域职责矩阵 |
| `services/auth.js` | ✅ | AUTHZ_CHAIN+ViewModeStore+canWriteActivity |
| `core/cross-page-state.js` | ✅ | 跨页面状态+buildURL/getURLParams |
| `core/constants.js` | ✅ | ROLE_LABELS统一权威源 |

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 双域管理 | 党建工作(创新探索) x 党务工作(合规运行) | COMMISSIONER_SYSTEM.md |
| 专班制 | 专班建设配套的定人定责定岗工作要点；专班 = 赋权 x 工作量考察 | COMMISSIONER_SYSTEM.md §A.3~A.8 |
| 差异化视图 | 同一数据源，不同切面展示 | MANAGEMENT_MODE.md §八 |
| 赋权关系链 | 党支书→支委/组长；组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_SYSTEM.md §C |
| SOP双向修改 | 文本SOP是母本，网页是实施层 | SOP_WEB.md |

## V. 权限矩阵摘要

| 角色 | 党建工作台 | 党务管理 |
|------|-----------|---------|
| 党支书 | 全局视图+活动写入+专班发起 | 全局视图+全部权限 |
| 组织委员 | 专班建设（招募统筹·定人定责定岗）+专班发起 | 发展党员全流程 |
| 宣传委员 | 活动与专班视图（多维表格+搜索筛选） | 宣传档案合规建设 |
| 纪检委员 | 考勤管理·考察管理·活动监督复盘 | 补课制度·公邮管理 |
| 党小组组长 | 块块活动管理+活动写入+专班发起 | 小组成员管理 |
| 活动组织者 | 活动编辑视图（经赋权） | — |
| 深度参与者 | 任务查看视图（经赋权） | — |
| 访客 | 只读信息面板（日历/列表切换） | — |

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
| **v8** | **2026-05-17** | **D-12 子页面拆分(19页) + D-13 首页跳转体验 + 大型数据表筛选搜索 + 文档同步自动化 + 经验蒸馏 v10.0** |
