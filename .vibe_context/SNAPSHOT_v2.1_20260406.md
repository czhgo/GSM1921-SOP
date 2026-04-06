---
title: "System Snapshot v2.1"
type: snapshot
status: "ACTIVE - BASELINE"
date: "2026-04-06"
version: "v2.1"
milestone: "Org OS 基建 1.0 收官；Agent 自然语言能力挂载全覆盖；语义死链清理完毕；四层架构与 SSOT 母本链路确立。"
supersedes: "SNAPSHOT_v2.0_20260401.md"
semantic_linting_completed: "2026-04-06 (Dead Link Resolution Phase + Entity Alignment)"
---

# 🎯 System Snapshot v2.1 — Org OS 基建收官报告 — 2026-04-06

---

## 📐 I. Global Topology（全局物理拓扑树）

```
GSM1921-SOP/                               ← 项目根目录
├── index.html                             ← 唯一 HTML 入口
├── README.md                              ← 项目驾驶舱（v6.2）
├── ARCHITECTURE.md                        ← 技术架构文档
├── AI_ENTRYPOINT.md                       ← 书记指令入口
├── SYSTEM_ROADMAP.md                      ← 系统路线图
│
├── src/                                   ← 前端源码 & SOP 引擎
│   ├── main.js, state.js, constants.js
│   ├── calendar.js, inspector.js, events.js
│   ├── service.mock.js, service.runtime.js
│   ├── domain.js, id.js, utils.js
│   └── workflow/                          ← SOP 规则引擎
│       ├── index.js, sopData.js, sop.js
│
├── knowledge/SOP/                         ← ★ 文本母本（最高权威）
│   ├── INDEX.md, README.md
│   ├── 常见工作场景快速指南.md
│   ├── 组织/宣传/纪检委员工作流程指南.md
│   └── 支委与党小组定人定责定岗说明.md
│
├── .github/                               ← ★ Agent & Skill 治理配置层
│   ├── copilot-instructions.md            ← 宪章（全局宪法）
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
│       ├── log-recorder (档案馆)
│       ├── experience-distiller (社科院)
│       └── sop2code (工信部)
│
├── .vibe_context/                         ← AI 治理元数据
│   ├── AI_CONTEXT.md
│   ├── REVIEW_STATE.md
│   ├── SNAPSHOT_v2.0, v2.1 (本文件)
│   ├── scenarios/                         ← 核心场景路由
│   └── logs/                              ← 月度执行日志
│
├── docs/                                  ← 人类可读扩展文档
│   ├── AGENT_USAGE.md
│   ├── 党支部管理与实务经验沉淀.md
│   └── SOP 数据映射与同步指南.md
│
├── governance/, backlog/, assets/, guides/, 参考资料/
```

---

## 📊 II. Agent 矩阵表格（10 个部门治理体系）

| # | 中文名 | 编码 | 工具箱 | 派工目标 | 角色定位 | 自然语言能力挂载 |
|----|--------|------|--------|---------|---------|-----------------|
| 1 | **秘书处** | mishuchu | read, agent, search | 无直接派工 | 计划 + 拆解 + 转发 | audit-report (只读审计报告) |
| 2 | **组织部** | zuzhibu | read, agent, edit, search | 档案馆 | 文档规范 + 术语治理 + AI治理层 | term-cleaner, yaml-slim, anchor-fixer, sop-sync |
| 3 | **发改委** | fagaiwei | read, agent, edit, search | 档案馆 | 文本母本 + 内容层治理 | term-cleaner, sop-sync, yaml-slim |
| 4 | **工信部** | gongxinbu | read, agent, edit, search | 档案馆 | 代码内容层 + SOP映射 | sop2code, data-inspector |
| 5 | **外交部** | waijiaobu | read, agent, edit, search | 档案馆 | UI 交互 + 可用性 | ui-verifier |
| 6 | **检察院** | jianchayuan | read, agent, search | 工信部, 组织部, 机关党委 | 三层审查 + 独立巡视 | audit-report, data-inspector, ui-verifier |
| 7 | **司法部** | sifabu | read, agent, search | 档案馆 | 违宪审查 + 合规纠偏 | audit-report |
| 8 | **档案馆** | danganguan | read, edit, search | 无 | 月度日志归档 + append-only | log-recorder |
| 9 | **社科院** | shekeyuan | read, edit, search | 无 | 经验蒸馏 + 实务沉淀 | experience-distiller |
| 10 | **机关党委** | jiguandangwei | read, agent, edit, search | 档案馆 | 架构监督 + 宪章守护 | （仅监督，不直接挂载业务能力） |

---

## 🏗️ III. 四层架构系统定义

### 第一层：党章/官方文件层（Constitution Authority）
- **母本位置**：`参考资料/`  
- **权力范围**：全基层党务的官方定义与授权依据  
- **变更原则**：此层不可经 AI 修改，仅供读取参考  
- **代表文件**：官方党务文件、支部章程

### 第二层：文本 SOP 母本层（Text SOP Authority）
- **母本位置**：`knowledge/SOP/`  
- **权力范围**：所有制度流程的标准文本表达  
- **变更原则**：先改此层，再推下游  
- **权力部门**：发改委（文本内容层治理）  
- **代表文件**：
  - `常见工作场景快速指南.md`  
  - `组织/宣传/纪检委员工作流程指南.md`  
  - `支委与党小组定人定责定岗说明.md`

### 第三层：代码内容层（Code Logic Authority）
- **子本位置**：`src/workflow/sopData.js` + `src/workflow/sop.js`  
- **权力范围**：将文本 SOP 转化为执行逻辑 & 数据结构  
- **变更原则**：必须对应第二层文本变更  
- **权力部门**：工信部（代码内容层架构）  
- **代表文件**：
  - `sopData.js`：场景任务模板  
  - `sop.js`：日期展开与实例化逻辑

### 第四层：宪章层（Constitutional Authority）
- **母本位置**：`.github/copilot-instructions.md`  
- **权力范围**：Agent 行为、写盘权限、交互熔断、链长控制  
- **变更原则**：机关党委专属审查，其他部门禁改  
- **权力部门**：机关党委（全局宪章监督）  
- **代表文件**：`.github/copilot-instructions.md`

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

### 具体互监规则

| 场景 | 机关党委职责 | 组织部职责 | 交互点 |
|------|-----------|---------|--------|
| 组织部请求自我修改 | ✗ 禁止 | → 提交母本链路 | 母本审查 |
| 宪章与 Agent 冲突 | ✓ 识别冲突 | 执行修正 | 宪章优先 |
| 文档规范化改动 | ✓ 审查宪章影响 | ✓ 执行规范化 | 共同签收 |
| 跨月架构改革 | ✓ 强制会话刷新 | 无 | HALT 警报 |

---

## 📍 V. SSOT 索引与母本链路映射

### 核心变更流水线（Three-Layer Traceability）

```
第一步：识别变更类型
  └─→ 官方文档修改？ → 禁止（参考资料/）
  └─→ 文本 SOP 修改？ → 发改委主导（knowledge/SOP/）
  └─→ 代码逻辑修改？ → 工信部主导（src/workflow/）
  └─→ 配置/宪章修改？ → 机关党委审查（.github/）

第二步：溯源母本
  ├─ 文本 SOP 变更 → 查 SSOT_INDEX.md 第二行
  ├─ 代码变更 → 查 SSOT_INDEX.md 第二行 + 第三行
  ├─ 配置变更 → 查 SSOT_INDEX.md 第三行
  └─ 如无明确母本 → 禁止写盘，仅输出只读报告

第三步：推进子本
  ├─ 文本母本 ✓ → 提请工信部映射代码
  ├─ 宪章冲突 ✗ → 返回机关党委返工
  └─ 完成改动 ✓ → 直接调用档案馆记账
```

### SSOT 注册表快照（3 行母本定义）

| 序号 | 层级 | 母本文件/目录 | 子本文件/目录 | 权力部门 |
|-----|------|-----------|---------|---------|
| 1 | 党章/官方 | `参考资料/` | `knowledge/SOP/` | 秘书处(只读) |
| 2 | 文本 SOP 母本 | `knowledge/SOP/*.md` | `src/workflow/` | 发改委 + 工信部 |
| 3 | 宪章母本 | `.github/copilot-instructions.md` | `.github/agents/*.md` | 机关党委 |

---

## 🎓 VI. Skill 自然语言能力挂载体系

### v2.1 更新说明

**自 2026-04-06 起，所有 Skill Reference 已从"死链静态列表"升级为"自然语言能力声明"模式：**

#### 派工型 Skill（Linked to Execution Agents）

| Skill | 适用 Agent | 自然语言挂载说明 | 核心能力 |
|-------|---------|-------------|--------|
| **audit-report** | 司法部, 检察院 | 只读审计报告、风险分级与证据映射 | 问题识别 + 风险评分 |
| **data-inspector** | 工信部, 检察院 | 数据结构与字典一致性检查 | 闭合性 + 类型漂移检测 |
| **ui-verifier** | 外交部, 检察院 | UI 交互闭环与可用性核查 | 交互一致性 + 可访问性评分 |
| **sop2code** | 工信部 | 将文本 SOP 映射为代码逻辑 | 场景→数据→流程转化 |

#### 协调型 Skill（Governance Orchestration）

| Skill | 适用 Agent | 自然语言挂载说明 | 核心能力 |
|-------|---------|-------------|--------|
| **term-cleaner** | 组织部, 发改委 | 术语与标题规范化 | 数字前缀去除 + 称谓一致 |
| **anchor-fixer** | 组织部 | 标题锚点一致性修复 | 死链检测 + 跨文件链路修复 |
| **yaml-slim** | 组织部, 发改委 | YAML frontmatter 精简治理 | metadata 压缩 + 版本追踪 |
| **sop-sync** | 组织部, 发改委 | SOP 跨文档同步 | 母本→子本内容对齐 |

#### 记录型 Skill（Logging & Distillation）

| Skill | 适用 Agent | 自然语言挂载说明 | 核心能力 |
|-------|---------|-------------|--------|
| **log-recorder** | 档案馆 | 月度执行日志路由、草稿生成与授权写入链路 | append-only + 月份自动创建 |
| **experience-distiller** | 社科院 | 未蒸馏日志经验提炼与闭环 | 高影响+可复用过滤 + 标记回写 |

### v2.1 核心改进

✅ **从静态路径引用 → 动态业务关系**
- 旧：`[Hubu Agent](../../agents/hubu.agent.md)` (现不存在)
- 新：`Related Agent: @工信部 (负责代码内容层修复)`

✅ **从孤立列表 → 派工语义**
- 旧：仅列出技能名称
- 新：标明"何时调用"+"为谁派工"+"能做什么"

✅ **从隐式链路 → 显式追踪**
- Agent 人员可直接查看"我有哪些能力"
- 用户可追踪"这个审计报告会被谁处理"

---

## 📅 VII. 月度日志与蒸馏链路

### 执行日志记账体系

```
执行部门（4个）
├── 组织部 ──┐
├── 发改委  │┌─→ 档案馆（append-only 月度日志）
├── 外交部  │       └─→ 标记 [经验蒸馏: 否]
└── 司法部 ─┘

社科院（经验蒸馏）
├─ 定期扫描 [经验蒸馏: 否] 日志
├─ 输出 提炼蓝图 (只读第一阶段)
├─ 请求 /ask 授权 (交互式熔断)
└─ 执行 经验沉淀 + 标记回写 (第二阶段)
    └─→ docs/党支部管理与实务经验沉淀.md
```

### 日志文件命名规约

```
.vibe_context/logs/
├── EXECUTION_LOG_INDEX.md         ← 日志索引
├── 2026-02-EXECUTION_LOG.md        ← 2 月执行日志 (v1.0 基线)
├── 2026-03-EXECUTION_LOG.md        ← 3 月执行日志
├── 2026-04-EXECUTION_LOG.md        ← 4 月执行日志 (含本快照内容)
└── 2026-03-AUDIT_REPORT.md         ← 审计报告存档
```

### 蒸馏标记规约

```markdown
## 2026 Q2 期间 Agent 改进记录

### 2026-04-06 | 组织部 | Agent 能力挂载全覆盖

- 变更文件: .github/agents/*.md
- 关键动作: 在所有 agent 正文末尾追加 【专属能力挂载】 Markdown 块
- 结果: 10 个 Agent 都已声明自然语言能力清单
- 风险: 无 (仅文档追加，无业务逻辑修改)
- 回滚点: 可按文件级删除末尾能力声明块
- **[经验蒸馏: 否]** ← 待社科院提炼闭环
```

---

## 🎖️ VIII. 基建 1.0 收官检查清单

- ✅ Agent 矩阵确定（10 个部门）
- ✅ Skill 自然语言挂载全覆盖（10 个技能）
- ✅ 四层架构明确（党章/文本/代码/宪章）
- ✅ 机关党委 ↔ 组织部 交叉互监逻辑定型
- ✅ SSOT 母本链路地图完成
- ✅ 语义死链全部清理（旧部门名→现有部门名）
- ✅ 月度日志与蒸馏链路就绪
- ✅ 交互式熔断（/ask）全面落地

---

## 🚀 IX. 后续规划

### Phase A: 经验蒸馏（由社科院负责）
```
1. 扫描 .vibe_context/logs/ 中 [经验蒸馏: 否] 的条目
2. 按 "高影响 + 可复用" 优先级筛选候选
3. 输出提炼蓝图（仅只读，无写盘）
4. 请求 /ask 授权
5. 执行经验沉淀写入 + 日志标记回写
6. 数据驱动的改进方向提建议
```

### Phase B: 月度记账与闭环（由档案馆负责）
```
1. 整理 2026-04 月执行日志
2. 路由已蒸馏与未蒸馏的条目
3. 与社科院协作完成交叉验证
4. 输出月度总结报告
5. 为下月规划提供基线数据
```

### Phase C: 架构稳定与优化（由机关党委负责）
```
1. 复核当月 Agent 调用链路
2. 验证 SSOT 溯源完整性
3. 检查是否需要宪章微调
4. 准备 v2.2 roadmap
```

-----

## 📜 X. 签章与版本历史

| 版本 | 日期 | 里程碑 | 状态 |
|------|------|--------|------|
| v1.3 | 2026-03-27 | 工作区初步稳定，SOP 场景引擎 beta | DEPRECATED |
| v2.0 | 2026-04-01 | Agent 治理、交互熔断 GA，日志链路落地 | SUPERSEDED |
| **v2.1** | **2026-04-06** | **基建 1.0 收官，自然语言挂载全覆盖，语义死链清理完毕** | **ACTIVE** |

---

> **Org OS 智能体治理体系 · 基建 1.0 正式收官**
>
> 本快照标志着系统架构的完整稳定。从此进入"高效运作期"。
