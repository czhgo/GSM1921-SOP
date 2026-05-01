---
title: "System Snapshot v3.0"
type: snapshot
status: "ACTIVE - CURRENT BASELINE"
date: "2026-05-02"
version: "v3.0"
milestone: "文件架构重整收官；AI 上下文分层加载机制建立；钩稽联动规则确立；最优文件夹架构方案纳入路线图。"
supersedes: "SNAPSHOT_v2.1_20260406.md"
semantic_linting_completed: "2026-05-02 (Phase 1-5 File Architecture Reorganization + Context Layer Optimization)"
---

# 🎯 System Snapshot v3.0 — 文件架构重整收官报告 — 2026-05-02

---

## 📐 I. Global Topology（全局物理拓扑树）

```text
GSM1921-SOP/                               ← 项目根目录
├── index.html                             ← 唯一 HTML 入口
├── README.md                              ← 对外门面（最后编辑环节）
├── ARCHITECTURE.md                        ← 核心架构说明
├── SYSTEM_ROADMAP.md                      ← 未来执行路线图（常为新原则）
│
├── src/                                   ← 前端源码 & SOP 引擎
│   ├── main.js, state.js, constants.js
│   ├── calendar.js, inspector.js, events.js
│   ├── service.mock.js, service.runtime.js
│   ├── domain.js, id.js, utils.js
│   ├── styles.css
│   └── workflow/                          ← SOP 规则引擎
│       ├── index.js, sopData.js, sop.js
│
├── knowledge/SOP/                         ← ★ 文本母本（最高权威）
│   ├── INDEX.md, README.md
│   ├── 常见工作场景快速指南.md
│   ├── 组织/宣传/纪检委员工作流程指南.md
│   ├── 支委与党小组定人定责定岗说明.md
│   ├── Org_OS_极客操作手册.md
│   ├── 功能委员SOP/
│   └── 党小组长SOP/
│
├── docs/                                  ← 技术文档
│   ├── AGENT_USAGE.md                     ← Agent 使用指南（10-Agent 模型）
│   ├── DOCUMENTATION_MAP.md               ← 全局文档导航中心
│   ├── SOP数据映射与同步指南.md
│   ├── SOP优化提案反馈卡.md
│   └── 党支部管理与实务经验沉淀.md
│
├── 参考资料/                              ← 官方底线（只读引用）
│   ├── 官方文件/
│   ├── 模板库/
│   ├── 党小组会/
│   └── 支部委员会/
│
├── .github/                               ← ★ Agent & Skill 治理配置层
│   ├── copilot-instructions.md            ← 宪章 + 上下文同步协议
│   ├── SSOT_INDEX.md                      ← 母本链路地图
│   ├── agents/                            ← 10 个 Agent 定义
│   │   ├── mishuchu.agent.md              ← 秘书处
│   │   ├── zuzhibu.agent.md               ← 组织部
│   │   ├── fagaiwei.agent.md              ← 发改委
│   │   ├── gongxinbu.agent.md             ← 工信部
│   │   ├── waijiaobu.agent.md             ← 外交部
│   │   ├── jianchayuan.agent.md           ← 检察院
│   │   ├── sifabu.agent.md                ← 司法部
│   │   ├── danganguan.agent.md            ← 档案馆
│   │   ├── shekeyuan.agent.md             ← 社科院
│   │   └── jiguandangwei.agent.md         ← 机关党委
│   └── skills/                            ← 10 个 Skill 定义
│       ├── audit-report, data-inspector, ui-verifier
│       ├── term-cleaner, anchor-fixer, yaml-slim, sop-sync
│       ├── log-recorder, experience-distiller, sop2code
│
├── .vibe_context/                         ← AI 审计底座
│   ├── CONTEXT.md                         ← ★ AI 快速同步入口（融合原 AI_CONTEXT + REVIEW_STATE）
│   ├── FILE_TIMESTAMPS.md                 ← 文件时间戳注册表
│   ├── SNAPSHOT_v3.0_20260502.md          ← 本文件
│   └── logs/                              ← 月度执行日志
│       ├── EXECUTION_LOG_INDEX.md
│       ├── 2026-02/03/04/05-EXECUTION_LOG.md
│       └── 2026-03-AUDIT_REPORT.md
│
├── assets/                                ← 静态资源
└── .vscode/settings.json                  ← 工作区配置
```

---

## 📊 II. Agent 矩阵表格（10 个部门治理体系）

| # | 中文名 | 编码 | 工具箱 | 派工目标 | 角色定位 | 关联 Skill |
|----|--------|------|--------|---------|---------|-----------|
| 1 | **秘书处** | mishuchu | read, search | — | 计划 + 拆解 + 转发 | — |
| 2 | **组织部** | zuzhibu | read, agent, edit, search | 档案馆 | 文档规范 + 术语治理 | term-cleaner, anchor-fixer |
| 3 | **发改委** | fagaiwei | read, agent, edit, search | 档案馆 | 文本母本 + 内容层治理 | sop-sync, yaml-slim |
| 4 | **工信部** | gongxinbu | read, agent, edit, search | 档案馆 | 代码内容层 + SOP映射 | sop2code, data-inspector |
| 5 | **外交部** | waijiaobu | read, agent, edit, search | 档案馆 | UI 交互 + 可用性 | ui-verifier |
| 6 | **检察院** | jianchayuan | read, search | — | 三层审查 + 独立巡视 | audit-report, data-inspector, ui-verifier |
| 7 | **司法部** | sifabu | read, agent, edit, search | 档案馆 | 违宪审查 + 合规纠偏 | audit-report |
| 8 | **档案馆** | danganguan | read, edit, search | — | 月度日志归档 + append-only | log-recorder |
| 9 | **社科院** | shekeyuan | read, edit, search | — | 经验蒸馏 + 实务沉淀 | experience-distiller |
| 10 | **机关党委** | jiguandangwei | read, agent, edit, search | 档案馆 | 架构监督 + 宪章守护 | — |

---

## 🏗️ III. 分层架构系统定义

### Layer 0: 宪章层（Constitution Authority）
- **位置**: `.github/copilot-instructions.md`
- **权力范围**: Agent 行为、写盘权限、交互熔断、链长控制、上下文同步协议
- **变更原则**: 机关党委专属审查，其他部门禁改

### Layer 1: 注册表层（SSOT Registry）
- **位置**: `.github/SSOT_INDEX.md`
- **权力范围**: 母本链路映射、Agent/Skill 注册表、同步触发矩阵
- **变更原则**: 随宪章和架构变更同步更新

### Layer 2: 文本 SOP 母本层（Text SOP Authority）
- **位置**: `knowledge/SOP/`
- **权力范围**: 所有制度流程的标准文本表达
- **变更原则**: 先改此层，再推下游
- **权力部门**: 发改委（文本内容层治理）

### Layer 3: Agent 实施层（Agent & Skill Runtime）
- **位置**: `.github/agents/` + `.github/skills/`
- **权力范围**: Agent 配置、Skill 接口定义
- **变更原则**: 受宪章和注册表约束

### Layer 4: 代码实现层（Code Implementation）
- **位置**: `src/workflow/` + `src/*.js`
- **权力范围**: SOP 数据库、工作流引擎、服务层、状态管理
- **变更原则**: 必须对应 Layer 2 文本变更
- **权力部门**: 工信部

### Layer 5: 运行时层（Runtime UI）
- **位置**: `index.html`
- **权力范围**: UI 骨架与交互
- **变更原则**: 受 Service 层约束

### Layer 6: 审计追溯层（Audit Trail）
- **位置**: `.vibe_context/`
- **权力范围**: AI 上下文入口、执行日志、系统快照、时间戳注册表
- **变更原则**: 仅 meta_audit_log 路由可写

### Layer 7: 官方底线层（Read-Only Reference）
- **位置**: `参考资料/`
- **权力范围**: 党章、条例、模板（PDF/DOCX）
- **变更原则**: 不可经 AI 修改，仅供读取参考

---

## 🔄 IV. 机关党委 ↔ 组织部 交叉互监逻辑

```
                    全局宪章
                 copilot-instructions.md
                        ▲
                        │ 宪章守护权
                        │
             ┌──────────┴──────────┐
             │                     │
        机关党委                 组织部
      (宪章监督)         (治理层规范化)
             │                     │
             │ 架构改革审查         │ 文档/术语一致性
             │ 宪章冲突报告         │ 锚点/结构修复
             └──────────┬──────────┘
                        │
               共同职责：
             ✓ 禁止相互修改
             ✓ 禁止越权改宪章
             ✓ 发现冲突→互报→返回母本审查
             ✓ 完成实质性改动→直接调用档案馆
```

---

## 📍 V. SSOT 索引与母本链路映射

### 核心变更流水线

```
第一步：识别变更类型
  └─→ 官方文档修改？ → 禁止（参考资料/）
  └─→ 文本 SOP 修改？ → 发改委主导（knowledge/SOP/）
  └─→ 代码逻辑修改？ → 工信部主导（src/workflow/）
  └─→ 配置/宪章修改？ → 机关党委审查（.github/）

第二步：溯源母本
  ├─ 文本 SOP 变更 → 查 SSOT_INDEX.md
  ├─ 代码变更 → 查 SSOT_INDEX.md + knowledge/SOP/
  ├─ 配置变更 → 查 SSOT_INDEX.md
  └─ 如无明确母本 → 禁止写盘，仅输出只读报告

第三步：推进子本
  ├─ 文本母本 ✓ → 提请工信部映射代码
  ├─ 宪章冲突 ✗ → 返回机关党委返工
  └─ 完成改动 ✓ → 直接调用档案馆记账
```

### SSOT 注册表快照

| 层级 | 母本文件/目录 | 子本文件/目录 | 权力部门 |
|------|-----------|---------|---------|
| 党章/官方 | `参考资料/` | `knowledge/SOP/` | 秘书处(只读) |
| 文本 SOP 母本 | `knowledge/SOP/*.md` | `src/workflow/` | 发改委 + 工信部 |
| 宪章母本 | `.github/copilot-instructions.md` | `.github/agents/*.md` | 机关党委 |

---

## 🎓 VI. Skill 能力挂载体系

### 派工型 Skill

| Skill | 适用 Agent | 核心能力 |
|-------|---------|--------|
| **audit-report** | 司法部, 检察院 | 问题识别 + 风险评分 |
| **data-inspector** | 工信部, 检察院 | 闭合性 + 类型漂移检测 |
| **ui-verifier** | 外交部, 检察院 | 交互一致性 + 可访问性评分 |
| **sop2code** | 工信部 | 场景→数据→流程转化 |

### 协调型 Skill

| Skill | 适用 Agent | 核心能力 |
|-------|---------|--------|
| **term-cleaner** | 组织部, 发改委 | 数字前缀去除 + 称谓一致 |
| **anchor-fixer** | 组织部 | 死链检测 + 跨文件链路修复 |
| **yaml-slim** | 组织部, 发改委 | metadata 压缩 + 版本追踪 |
| **sop-sync** | 组织部, 发改委 | 母本→子本内容对齐 |

### 记录型 Skill

| Skill | 适用 Agent | 核心能力 |
|-------|---------|--------|
| **log-recorder** | 档案馆 | append-only + 月份自动创建 |
| **experience-distiller** | 社科院 | 高影响+可复用过滤 + 标记回写 |

---

## 📅 VII. 月度日志与蒸馏链路

```text
执行部门（4个）
├── 组织部 ──┐
├── 发改委  │┌─→ 档案馆（append-only 月度日志）
├── 外交部  │       └─→ 标记 [经验蒸馏: 是/否]
└── 司法部 ─┘

社科院（经验蒸馏）
├─ 扫描 [经验蒸馏: 否] 日志
├─ 输出提炼蓝图（只读第一阶段）
├─ 请求 /ask 授权（交互式熔断）
└─ 执行经验沉淀 + 标记回写（第二阶段）
    └─→ docs/党支部管理与实务经验沉淀.md
```

---

## 🔗 VIII. 钩稽联动规则（v3.0 新增）

> **核心原则：一改俱改** — 任何文件变更必须沿钩稽链传播，禁止孤立修改。

| 变更源 | 必须同步的目标 | 验证方式 |
|--------|---------------|---------|
| copilot-instructions.md | agents/*.md, skills/*.md | SSOT_INDEX.md 校验 |
| SSOT_INDEX.md | 受影响 agents | 映射一致性 |
| SYSTEM_ROADMAP.md | ARCHITECTURE.md, README.md | 交叉引用 |
| knowledge/SOP/ | src/workflow/, SSOT_INDEX.md | Change Trace 四要素 |
| .vibe_context/ 结构变更 | CONTEXT.md | 目录树校验 |

---

## 🚀 IX. 后续规划（见 SYSTEM_ROADMAP.md）

| 优先级 | 规划 | 状态 |
|--------|------|------|
| 🔜 最高 | C1-C5: AI 上下文快速同步机制 | ✅ 已完成 |
| 🔜 高 | R1-R3: 角色三分类体系实施 | 待实施 |
| 🔜 高 | A1-A12: 最优文件夹架构迁移（content/ + .ctx/） | 待实施 |
| ⏳ 中 | Phase 2: Supabase Backend | 规划中 |
| ⏳ 低 | Phase 3: Workflow Engine | 规划中 |

---

## 📜 X. 签章与版本历史

| 版本 | 日期 | 里程碑 | 状态 |
|------|------|--------|------|
| v1.3 | 2026-03-27 | 工作区初步稳定，SOP 场景引擎 beta | ARCHIVED |
| v2.0 | 2026-04-01 | Agent 治理、交互熔断 GA，日志链路落地 | ARCHIVED |
| v2.1 | 2026-04-06 | 基建 1.0 收官，自然语言挂载全覆盖 | ARCHIVED |
| **v3.0** | **2026-05-02** | **文件架构重整收官；AI 上下文分层加载；钩稽联动；最优架构方案** | **ACTIVE** |

---

> **Org OS 智能体治理体系 · 文件架构重整收官**
>
> 本快照标志着文件架构从散乱走向收敛。AI 上下文从读 5-6 文件降为 2 层分级加载，钩稽联动确保一改俱改，最优架构方案作为下一阶段目标纳入路线图。
