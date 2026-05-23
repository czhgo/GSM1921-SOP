---
role: "[人机]"
dynamic_role:
  maintenance: "[人机]"
  auto_update: "[AI]"
---

# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: 2026-05-04 | 类型: [人机] | 维护方式: 每次文件修改后同步更新

---

## 更新规则

1. 本注册表在周期性任务 M2（SNAPSHOT 更新）执行时批量刷新，不随日常文件修改逐条更新
2. 时间戳格式: `YYYY-MM-DD HH:MM:SS`
3. 新增文件须在本注册表中追加条目
4. 删除文件须将对应条目标记为 `🗑️ 已删除`
5. 本文件自身的时间戳在每次批量刷新时同步

---

## 根目录

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| README.md | 2026-05-01 00:00:00 | [人] | 对外门面 |
| ARCHITECTURE.md | 2026-05-03 00:00:00 | [人机] | 核心架构说明 |
| CLAUDE.md | 2026-05-04 00:00:00 | [人机] | 待实施路线图 |
| index.html | 2026-05-04 00:00:00 | [人机] | UI 入口 |
| .markdownlint.json | 2026-04-06 17:12:44 | [工具] | Markdown 规范 |
| .markdownlintignore | 2026-04-01 02:28:01 | [工具] | Markdown 忽略 |

## .github/ (Agent 治理层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .github/copilot-instructions.md | 2026-05-03 00:00:00 | [AI] | 宪章 |
| .github/SSOT_INDEX.md | 2026-05-02 00:00:00 | [AI] | 母本注册表 |
| .github/agents/mishuchu.agent.md | 2026-04-29 01:47:32 | [AI] | 秘书处 |
| .github/agents/zuzhibu.agent.md | 2026-04-29 01:47:32 | [AI] | 组织部 |
| .github/agents/fagaiwei.agent.md | 2026-04-29 01:47:32 | [AI] | 发改委 |
| .github/agents/gongxinbu.agent.md | 2026-04-29 01:47:32 | [AI] | 工信部 |
| .github/agents/waijiaobu.agent.md | 2026-04-29 01:47:32 | [AI] | 外交部 |
| .github/agents/sifabu.agent.md | 2026-04-06 17:12:44 | [AI] | 司法部 |
| .github/agents/jianchayuan.agent.md | 2026-04-06 17:12:44 | [AI] | 检察院 |
| .github/agents/jiguandangwei.agent.md | 2026-04-06 17:12:44 | [AI] | 机关党委 |
| .github/agents/shekeyuan.agent.md | 2026-04-06 17:12:44 | [AI] | 社科院 |
| .github/agents/danganguan.agent.md | 2026-04-06 17:12:44 | [AI] | 档案馆 |
| .github/skills/term-cleaner/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/anchor-fixer/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/yaml-slim/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/sop-sync/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/log-recorder/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/audit-report/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/data-inspector/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/ui-verifier/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/experience-distiller/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/sop2code/SKILL.md | 2026-04-06 14:52:33 | [AI] | |

## .ctx/ (审计底座)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .ctx/CONTEXT.md | 2026-05-04 00:00:00 | [AI] | AI 快速同步入口 |
| .ctx/TIMESTAMPS.md | 2026-05-04 00:00:00 | [人机] | 本文件 |
| .ctx/SNAPSHOT.md | 2026-05-04 00:00:00 | [AI] | ACTIVE v4 |
| .ctx/snapshots/INDEX.md | 2026-05-03 00:00:00 | [人机] | 快照历史索引 |
| .ctx/logs/EXECUTION_LOG_INDEX.md | 2026-05-02 00:00:00 | [人机] | 日志索引 |
| .ctx/logs/DECISION_LOG.md | 2026-05-02 00:00:00 | [人机] | 决策日志 |
| .ctx/logs/2026-02-EXECUTION_LOG.md | 2026-02-28 14:00:25 | [人机] | 已归档 |
| .ctx/logs/2026-03-EXECUTION_LOG.md | 2026-03-31 11:12:14 | [人机] | 已归档 |
| .ctx/logs/2026-03-AUDIT_REPORT.md | 2026-03-24 14:52:36 | [人机] | 审计报告 |
| .ctx/logs/2026-04-EXECUTION_LOG.md | 2026-04-06 17:12:44 | [人机] | 已归档 |
| .ctx/logs/2026-05-EXECUTION_LOG.md | 2026-05-03 00:00:00 | [人机] | 活跃 |

## src/ (代码实现层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| src/main.js | 2026-05-04 00:00:00 | [人机] | 主控入口 + data-modules 过滤 |
| src/state.js | 2026-05-04 00:00:00 | [人机] | 全局状态（activeModule默认→dashboard） |
| src/events.js | 2026-05-04 00:00:00 | [人机] | 事件绑定 + 主页导航联动 |
| src/calendar.js | 2026-05-04 00:00:00 | [人机] | 日历渲染 |
| src/party.js | 2026-05-02 00:00:00 | [人机] | 党务管理模块 |
| src/inspector.js | 2026-05-02 00:00:00 | [人机] | 检查器面板 |
| src/references.js | 2026-04-29 01:47:32 | [人机] | 资料查询模块 |
| src/styles.css | 2026-05-04 00:00:00 | [人机] | 全局样式（Flat Matte） |
| src/domain.js | 2026-03-17 07:46:46 | [人机] | 领域模型 |
| src/constants.js | 2026-05-04 00:00:00 | [人机] | 静态常量 |
| src/utils.js | 2026-03-20 11:16:27 | [人机] | 通用工具 |
| src/id.js | 2026-03-05 07:44:34 | [人机] | UUID 发生器 |
| src/service.mock.js | 2026-03-20 11:33:28 | [人机] | Mock 服务层 |
| src/service.runtime.js | 2026-03-04 15:56:42 | [人机] | 运行时插槽 |
| src/workflow/index.js | 2026-04-29 01:47:32 | [人机] | 桶文件 |
| src/workflow/sop.js | 2026-03-23 11:25:24 | [人机] | SOP 实例化 |
| src/workflow/sopData.js | 2026-03-26 12:31:50 | [人机] | SOP 数据模板 |
| src/workflow/engine.js | 2026-04-29 01:47:32 | [人机] | 工作流引擎 |
| src/workflow/definitions.js | 2026-04-29 01:47:32 | [人机] | 工作流定义 |
| src/workflow/renderer.js | 2026-04-29 01:47:32 | [人机] | 工作流渲染器 |
| src/workflow/activityRecord.js | 2026-05-02 00:00:00 | [人机] | 活动记录数据模型 |

## content/SOP/ (制度母本层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/SOP/INDEX.md | 2026-03-07 08:54:51 | [人机] | SOP 导航 |
| content/SOP/README.md | 2026-03-17 08:14:58 | [人机] | |
| content/SOP/Org_OS_极客操作手册.md | 2026-04-29 01:47:32 | [人机] | |
| content/SOP/常见工作场景快速指南.md | 2026-04-01 02:28:01 | [人机] | |
| content/SOP/支委与党小组定人定责定岗说明.md | 2026-04-01 02:28:01 | [人机] | |
| content/SOP/宣传委员工作流程指南.md | 2026-04-01 02:28:01 | [人机] | |
| content/SOP/纪检委员工作流程指南.md | 2026-04-01 02:28:01 | [人机] | |
| content/SOP/组织委员工作流程指南.md | 2026-04-01 02:28:01 | [人机] | |

## content/guides/ (技术文档层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/guides/BRAND_ACTIVITY.md | 2026-05-03 00:00:00 | [人机] | 品牌活动方案 ⏸️ |
| content/guides/README.md | 2026-05-04 00:00:00 | [人机] | guides 目录索引（新增 DATA_ARCHITECTURE） |
| content/guides/DOCUMENTATION_MAP.md | 2026-05-03 00:00:00 | [人机] | 全局文档导航中心 |
| content/guides/AGENT_USAGE.md | 2026-04-30 01:59:30 | [人机] | Agent 使用指南 |
| content/guides/ROLE_CLASSIFICATION.md | 2026-05-02 00:00:00 | [人机] | 角色三分类体系 |
| content/guides/DESIGN_SYSTEM.md | 2026-05-03 00:00:00 | [人机] | 设计系统规范 |
| content/guides/CALENDAR_DESIGN.md | 2026-05-02 00:00:00 | [人机] | 日历功能规划 |
| content/guides/MANAGEMENT_MODE_ARCHITECTURE.md | 2026-05-02 00:00:00 | [人机] | 管理模式架构 |
| content/guides/ORGANIZATION_BUILDING_MODULE.md | 2026-05-04 00:00:00 | [人机] | 党务管理模块（文件名不变） |
| content/guides/COMMISSIONER_SYSTEM_DESIGN.md | 2026-05-04 00:00:00 | [人机] | 支委体制总设计（合并组织角色+党小组交互） |
| content/guides/DATA_ARCHITECTURE.md | 2026-05-04 00:00:00 | [人机] | 数据架构与权限模型（新增） |
| content/guides/RECURRING_TASKS_MECHANISM.md | 2026-05-02 00:00:00 | [人机] | 周期性任务机制 |
| content/guides/TERMINOLOGY_STANDARDS.md | 2026-05-02 00:00:00 | [人机] | 术语规范 |
| content/guides/EMOJI_POLICY.md | 2026-05-02 00:00:00 | [人机] | Emoji 规范 |
| content/guides/SOP_WEB_GUIDE.md | 2026-05-02 00:00:00 | [人机] | SOP 网页指南 |
| content/guides/SOP优化提案反馈卡.md | 2026-05-03 00:00:00 | [人机] | 反馈模板 |

## content/insights/ (经验沉淀)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/insights/党支部管理与实务经验沉淀.md | 2026-05-04 00:00:00 | [人机] | v4.0 — 双域管理理论贡献 |

## content/references/ (官方底线层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/references/README.md | 2026-02-28 16:48:20 | [人] | |
| content/references/党小组会/*.pdf/docx | 2026-02-28 16:48:20 | [人] | 只读 |
| content/references/官方文件/*.pdf/docx | 2026-02-17 16:01:31 | [人] | 只读 |
| content/references/支部委员会/*.docx | 2026-02-28 16:48:20 | [人] | 只读 |
| content/references/模板库/**/*.md/docx | 2026-03-31 11:02:06 | [人] | 只读 |

## .vscode/ (工具配置)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .vscode/settings.json | 2026-04-06 14:52:33 | [工具] | |

## assets/ (静态资源)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| assets/.gitkeep | 2026-03-07 05:27:23 | [工具] | |
| assets/images/party_emblem.png | 2026-03-07 16:07:57 | [人] | |

---

## 周期性任务最后执行时间

| 编号 | 任务 | 最后执行 | 下次到期 | 状态 |
|------|------|---------|---------|------|
| W1 | 执行日志扫描 | 2026-05-22 | 2026-05-29 | OK |
| W2 | Emoji 合规扫描 | 2026-05-22 | 2026-05-29 | OK |
| W3 | Mock数据一致性扫描 | 2026-05-22 | 2026-05-29 | OK |
| M1 | CLAUDE.md 清理 | 2026-05-04 | 2026-06-04 | OK |
| M2 | SNAPSHOT 更新 | 2026-05-04 | 2026-06-04 | OK |
| M3 | 全仓断链扫描 | 2026-05-04 | 2026-06-04 | OK |
| M4 | Insights 经验蒸馏 | 2026-05-04 | 2026-06-04 | OK |
| M5 | DOCUMENTATION_MAP 审查 | 2026-05-04 | 2026-06-04 | OK |
| M6 | README 审查 | — | — | 待初始化 |
| Q1 | ARCHITECTURE 审查 | — | — | 待初始化 |
| Q2 | 角色体系健康度 | — | — | 待初始化 |
| Q3 | SOP 文本审查 | — | — | 待初始化 |
| Y1 | 年度系统审计 | — | — | 待初始化 |

---

## 已删除文件记录

| 原路径 | 删除日期 | 原因 |
|--------|---------|------|
| AI_ENTRYPOINT.md | 2026-05-01 | 内容已合并至 ARCHITECTURE.md |
| .ctx/COMPLETED_TASKS.md | 2026-05-02 | 日志已覆盖，汇总表删除 |
| .ctx/PENDING_MODIFICATIONS.md | 2026-05-02 | 内容整合至 CLAUDE.md |
| .ctx/SUSPENDED_ISSUES.md | 2026-05-02 | 内容整合至 CLAUDE.md |
| .ctx/WATCH_LOG.md | 2026-05-02 | 全部已解决，验证后删除 |
| .ctx/AI_CONTEXT.md | 2026-05-02 | 内容融合至 CONTEXT.md |
| .ctx/REVIEW_STATE.md | 2026-05-02 | 内容融合至 CONTEXT.md |
| .ctx/SNAPSHOT_v1.3_20260327.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.0_20260401.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.1_20260406.md | 2026-05-02 | 归档删除，新 v3.0 生成 |
| .ctx/scenarios/*.md | 2026-05-01 | 全部场景文件已评估删除 |
| governance/ | 2026-05-01 | 迁移至 .ctx/ 后整合 |
| backlog/ | 2026-05-01 | 迁移至 .ctx/ 后整合/删除 |
| knowledge/ | 2026-05-01 | 迁移至 content/SOP/ |
| docs/ | 2026-05-01 | 迁移至 content/guides/ + content/insights/ |
| 参考资料/ | 2026-05-01 | 迁移至 content/references/ |
| content/guides/SOP数据映射与同步指南.md | 2026-05-02 | 已合并至 SOP_WEB_GUIDE.md |
| content/guides/COMMISSIONER_ORGANIZATION_ROLE.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/guides/COMMISSIONER_GROUP_INTERACTION.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
