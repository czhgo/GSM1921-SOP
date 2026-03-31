---
title: "System Snapshot v2.0"
type: snapshot
status: "ACTIVE - CURRENT"
date: "2026-04-01"
milestone: "Org OS 智能体治理体系完成实装；起居院日志链路与交互式熔断落地；Markdown 诊断治理转入配置化。"
supersedes: "SNAPSHOT_v1.3_20260327.md"
topology_injected: "2026-04-01 (v2.0 baseline: Agentic governance + validation-config stabilization)"
---

# 🏛️ System Snapshot v2.0 — 2026-04-01

---

## 0. Global Topology（全局物理拓扑树 — Depth 4）

> 本节为 LLM 跨 Session 记忆同步的核心物理坐标系。任何接手本系统的大模型，应以此拓扑树作为第一优先级定位资产。

```text
GSM1921-SOP/                               ← 项目根目录（GitHub Pages 静态站）
├── index.html                             ← 唯一 HTML 入口，<script type="module"> 加载 src/main.js
├── README.md                              ← 项目驾驶舱（v6.2），含双域架构、控制平面、RBAC 视图说明
├── ARCHITECTURE.md                        ← 技术架构文档（Canonical Authority Rule / 变更流水线）
├── AI_ENTRYPOINT.md                       ← 书记指令入口（AI 操作 SOP 首读）
├── SYSTEM_ROADMAP.md                      ← 系统路线图
├── .markdownlint.json                     ← Markdown 规则治理配置（工作区统一规则）
├── .markdownlintignore                    ← Markdown 路径级忽略清单
│
├── src/                                   ← ★ 前端源码（ESM 模块 + 服务层）
│   ├── main.js                            ← 启动入口 + renderUI()（唯一 DOM 更新出口）
│   ├── state.js                           ← appState + setState(patch) + registerRenderCallback
│   ├── constants.js                       ← 角色主题与常量定义
│   ├── utils.js                           ← 日期格式化、提示工具、月份工具
│   ├── calendar.js                        ← 日历渲染引擎
│   ├── inspector.js                       ← 检查器渲染与角色过滤
│   ├── events.js                          ← 全量 DOM 事件绑定
│   ├── service.mock.js                    ← Mock CRUD + LocalStorage 持久化
│   ├── service.runtime.js                 ← BranchService 运行时出口
│   ├── domain.js                          ← Schema typedef / 兼容层
│   ├── id.js                              ← 唯一 ID 生成工具
│   └── workflow/                          ← ★ SOP 核心规则引擎（物理封装子目录）
│       ├── index.js                       ← 桶文件：统一导出 instantiateSOP / sopDatabase
│       ├── sopData.js                     ← SOP 场景任务节点模板数据
│       └── sop.js                         ← instantiateSOP()：模板+t0展开为绝对日期任务
│
├── knowledge/                             ← ★ SOP 制度母本（最高权威，变更起点）
│   ├── README.md
│   └── SOP/
│       ├── INDEX.md
│       ├── README.md
│       ├── 常见工作场景快速指南.md
│       ├── 宣传委员工作流程指南.md
│       ├── 组织委员工作流程指南.md
│       ├── 纪检委员工作流程指南.md
│       └── 支委与党小组定人定责定岗说明.md
│
├── .vibe_context/                         ← ★ AI 治理元数据层（Control Plane）
│   ├── AI_CONTEXT.md                      ← AI 行为规则与路由/权限铁律
│   ├── REVIEW_STATE.md                    ← 控制平面状态总览
│   ├── SNAPSHOT_v1.3_20260327.md          ← 旧快照（v2.0 起标记 DEPRECATED）
│   ├── SNAPSHOT_v2.0_20260401.md          ← ★ 本文件（当前活动快照）
│   ├── scenarios/                         ← 核心场景路由文件
│   │   ├── core_logic.md
│   │   ├── sop_sync.md
│   │   ├── ui_scenario.md
│   │   └── meta_audit.md
│   └── logs/                              ← 月度执行与审计日志
│       ├── EXECUTION_LOG_INDEX.md
│       ├── 2026-02-EXECUTION_LOG.md
│       ├── 2026-03-EXECUTION_LOG.md
│       ├── 2026-03-AUDIT_REPORT.md
│       └── 2026-04-EXECUTION_LOG.md
│
├── .vscode/                               ← ★ Agent 系统配置层
│   ├── settings.json                      ← 多 Agent 编排、systemPrompt、skills 绑定
│   ├── skills/                            ← 执行/治理/日志/蒸馏技能库（9项）
│   │   ├── term-cleaner.md
│   │   ├── yaml-slim.md
│   │   ├── anchor-fixer.md
│   │   ├── sop-sync.md
│   │   ├── data-inspector.md
│   │   ├── ui-verifier.md
│   │   ├── audit-report.md
│   │   ├── log-recorder.md
│   │   └── experience-distiller.md
│   └── skills_backup_2026-04-01/          ← 技能备份目录（当前为空）
│
├── docs/                                  ← 人类可读扩展文档
│   ├── AGENT_USAGE.md
│   ├── DOCUMENTATION_MAP.md
│   ├── README.md
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md
│   └── 党支部管理与实务经验沉淀.md
│
├── governance/                            ← 治理合规平面
│   ├── README.md
│   ├── WATCHLIST.md
│   └── SUSPENDED_ISSUES.md
│
├── backlog/                               ← 任务队列平面
│   ├── PENDING_MODIFICATIONS.md
│   └── COMPLETED_TASKS.md
│
├── assets/
│   └── images/
│       └── party_emblem.png
│
├── guides/
│   └── .gitkeep
│
└── 参考资料/
    ├── README.md
    ├── 党小组会/
    ├── 官方文件/
    ├── 支部委员会/
    └── 模板库/
        ├── 活动复盘/
        └── 申报材料模板/
            ├── 其他模板/
            ├── 宣传材料类/
            └── 工作记录类/
```

---

## 1. Milestones（里程碑记录）

| 版本 | 日期 | 里程碑描述 |
|------|------|-----------|
| v1.0 | 2026-02 | 系统初始化，ESM 架构，LocalStorage 持久化，基础 SOP 注入。 |
| v1.1 | 2026-03-23 | 全域 SOP 同步（Phase 1–5B）；sopData.js 多场景扩充；三委指南升版。 |
| v1.2 | 2026-03-25 | 双域架构（活动建设/组织建设）正式确立；hostGroup 字段引入；场景选择器层级化。 |
| v1.3 | 2026-03-27 | 全域减负与 UI 极简降噪竣工；日历检索实时响应；状态机进一步解耦。 |
| v2.0 | 2026-04-01 | Org OS 智能体体系（中书省-六部-都察院-起居院-修史院）部署完成；交互式熔断（/ask）与链路边界规则落盘；执行日志月度链路延展至 2026-04；Markdown 校验治理转为配置层（.markdownlint.json/.markdownlintignore）。 |

### v2.0 相对 v1.3 的主要变更摘要

1. 新增 Agent 配置层与技能库：.vscode/settings.json + .vscode/skills/9 项技能。
2. 日志治理升级：.vibe_context/logs 增补 2026-04 月志，执行日志由索引+月度文件管理。
3. 交互控制规则强化：写盘与跨部门调用采用 /ask 授权链路，强调 Blueprint 先行。
4. 校验治理配置化：新增 .markdownlint.json 与 .markdownlintignore；Markdown 报错从内容修补转向校验策略治理。

---

## 2. Architecture Invariants（架构不变量）

1. 唯一 HTML 入口：index.html 是静态站唯一入口，模块加载点为 src/main.js。
2. 单向状态流：setState(patch) → renderUI(state) 是唯一合法数据到视图路径。
3. 双域数据路由：活动建设与组织建设在 workflow/sopData.js 以 scenarioId 区分，制度层与 UI 层语义一致。
4. hostGroup 字段约束：仅责任下放场景使用 group1/group2/group3，其他全支部场景保持 null。
5. 服务层写入铁律：所有运行时写操作必须经 BranchService（service.mock.js/service.runtime.js），禁止 UI 直写存储。
6. SOP 主权优先：knowledge/SOP 为制度权威源，变更顺序必须遵循 SOP → 数据模板 → 领域/服务 → 状态/渲染。
7. RBAC 双轨模型稳定：participant 与 manager 视图并行，管理视图按角色过滤任务边界保持不变。
8. 控制平面分层：.vibe_context 负责路由、审计、快照、日志；业务代码与治理元数据解耦。
9. Agent 治理边界：中书省负责计划；执行部门在授权后写盘；都察院只读核查；起居院负责日志写入；修史院负责经验蒸馏。
10. 交互式熔断规则：任何写盘前先输出 Blueprint 并经 /ask Allow；日志写入同样走授权确认链路。
11. 诊断治理策略：优先通过校验配置降噪（.markdownlint.json/.markdownlintignore），避免无必要正文改写。
12. 二进制只读原则：.pdf/.docx 等资料仅可索引与引用，不做内容改写。

---

## 3. RBAC 双轨模型与数据流规则（v2.0 校准）

### 3.1 RBAC 双轨视图

- 参与视图（participant）：面向普通成员，最小化任务细节暴露。
- 管理视图（manager）：按管理角色过滤并呈现可执行任务与状态更新能力。

### 3.2 数据与治理双流水线

1. 业务流水线：SOP 文档变更 → workflow 模板同步 → 服务层数据约束 → 状态渲染。
2. 治理流水线：Blueprint 计划 → /ask 授权 → 执行写盘 → 日志摘要 → 起居院记录。

### 3.3 规则优先级

1. 组织宪法与控制边界（.github/copilot-instructions.md, .vscode/settings.json）。
2. 场景路由与权限规则（.vibe_context/AI_CONTEXT.md, scenarios/*）。
3. 制度母本与业务实现（knowledge/SOP/*, src/*）。

> v2.0 判定：当前仓库已形成“业务系统 + AI 治理系统”的双平面稳定运行态。
