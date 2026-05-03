---
role: "[AI]"
dynamic_role:
  runtime: "[AI]"
  archived: "[人机]"
title: "System Snapshot"
type: snapshot
status: "ACTIVE"
date: "2026-05-02"
version: "v3"
milestone: "基建 1.0 收官 + 文件架构重整 + 角色体系 v2.0 + 党务管理模块上线"
---

# System Snapshot — v3

> **更新策略**：本文件**不再每次执行更新**。仅在以下触发条件满足时生成新版本：
> - (a) 大版本升级（v3→v4，架构重大变更、角色体系迭代）
> - (b) 用户显式指令触发（"/snapshot" 或 "生成快照"）
> - (c) 项目阶段性收官（Phase 1/2/3 完成）
>
> 日常变更由 `EXECUTION_LOG` + `DECISION_LOG` + `TIMESTAMPS` 承载。
> 历史版本归档于 `.ctx/snapshots/`，索引见 `.ctx/snapshots/INDEX.md`。
> **详细文档导航**：见 [DOCUMENTATION_MAP.md](../content/guides/DOCUMENTATION_MAP.md)
> **待办规划**：见 [ROADMAP.md](../ROADMAP.md)

---

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── index.html                  ← 单页入口
├── README.md                   ← 对外门面
├── ARCHITECTURE.md             ← 核心架构说明
├── ROADMAP.md                  ← 未来执行路线图（常为新原则）
├── src/                        ← 前端源码（ESM 模块化）
│   ├── main.js, state.js, events.js, domain.js
│   ├── calendar.js, inspector.js, party.js
│   ├── constants.js, utils.js, id.js
│   ├── service.mock.js, service.runtime.js
│   ├── styles.css
│   └── workflow/ (index.js, sop.js, sopData.js)
├── content/
│   ├── SOP/                    ← [人机] 制度母本
│   ├── guides/                 ← [人机] 技术指南与规划
│   ├── insights/               ← [人机] 经验沉淀
│   └── references/             ← [人] 官方文件（只读）
├── .github/                    ← [AI] Agent & Skill 治理
│   ├── copilot-instructions.md ← 宪章
│   ├── SSOT_INDEX.md           ← 母本注册表
│   ├── agents/ (10个)
│   └── skills/ (10个)
├── .ctx/                       ← [AI]/[人机] 审计底座
│   ├── CONTEXT.md              ← AI 快速同步入口
│   ├── SNAPSHOT.md             ← 本文件
│   ├── TIMESTAMPS.md           ← 文件时间戳
│   └── logs/                   ← 执行日志 + 决策日志
├── .vscode/                    ← [工具]
└── assets/                     ← [人] 静态资源
```

---

## II. 分层架构

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `.github/copilot-instructions.md` + `SSOT_INDEX.md` | [AI] |
| 1 | 中枢层 | `ROADMAP.md` + `ARCHITECTURE.md` + `README.md` | [人机] |
| 2 | 制度母本层 | `content/SOP/` | [人机] |
| 3 | Agent 治理层 | `.github/agents/` + `.github/skills/` | [AI] |
| 4 | 代码实现层 | `src/` + `index.html` | [人机] |
| 5 | 技术文档层 | `content/guides/` + `content/insights/` | [人机] |
| 6 | 审计追溯层 | `.ctx/` | [AI]/[人机] |
| 7 | 官方底线层 | `content/references/` | [人] |

---

## III. 版本里程碑

| 版本 | 日期 | 里程碑 |
|------|------|--------|
| v1 | 2026-03 | SOP 场景引擎 beta |
| v2 | 2026-04 | Agent 治理 + 交互熔断 GA + 基建 1.0 收官 |
| **v3** | **2026-05-02** | **文件架构重整 + 角色体系 v2.0 + 党务管理模块上线** |

> v3.x 子版本变更明细见 [DECISION_LOG.md](.ctx/logs/DECISION_LOG.md)
