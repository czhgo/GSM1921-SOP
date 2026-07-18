---
role: "[工程师]+[AI]"
dynamic_role:
  maintenance: "[工程师]+[AI]"
  auto_update: "[AI]"
last_updated: "2026-07-18"
---

# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: "2026-07-18" | 类型: [工程师]+[AI] | 维护方式: 每次文件修改后同步更新

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
| README.md | 2026-05-01 00:00:00 | [用户] | 对外门面 |
| ARCHITECTURE.md | 2026-05-03 00:00:00 | [工程师]+[AI] | 核心架构说明 |
| CLAUDE.md | 2026-05-04 00:00:00 | [工程师]+[AI] | 待实施路线图 |
| index.html | 2026-05-04 00:00:00 | [用户]+[AI] | UI 入口 |
| .markdownlint.json | 2026-04-06 17:12:44 | [工具] | Markdown 规范 |
| .markdownlintignore | 2026-04-01 02:28:01 | [工具] | Markdown 忽略 |

## .github/ (Agent 治理层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
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
| .ctx/TIMESTAMPS.md | 2026-05-04 00:00:00 | [工程师]+[AI] | 本文件 |
| .ctx/SNAPSHOT.md | 2026-05-04 00:00:00 | [AI] | ACTIVE v4 |
| .ctx/snapshots/INDEX.md | 2026-05-03 00:00:00 | [工程师]+[AI] | 快照历史索引 |
| .ctx/logs/EXECUTION_LOG_INDEX.md | 2026-05-02 00:00:00 | [工程师]+[AI] | 日志索引 |
| .ctx/logs/DECISION_LOG.md | 2026-05-02 00:00:00 | [工程师]+[AI] | 决策日志 |
| .ctx/logs/2026-02-EXECUTION_LOG.md | 2026-02-28 14:00:25 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-03-EXECUTION_LOG.md | 2026-03-31 11:12:14 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-04-EXECUTION_LOG.md | 2026-04-06 17:12:44 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-05-EXECUTION_LOG.md | 2026-05-03 00:00:00 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-07-early-entries.md | 2026-07-12 00:00:00 | [工程师]+[AI] | T22-T70 早期条目归档（母本：2026-07-EXECUTION_LOG.md） |

## src/ (代码实现层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| src/main.js | 2026-05-04 00:00:00 | [工程师]+[AI] | 主控入口 + data-modules 过滤 |
| src/state.js | 2026-05-04 00:00:00 | [工程师]+[AI] | 全局状态（activeModule默认→dashboard） |
| src/events.js | 2026-05-04 00:00:00 | [工程师]+[AI] | 事件绑定 + 主页导航联动 |
| src/calendar.js | 2026-05-04 00:00:00 | [工程师]+[AI] | 日历渲染 |
| src/party.js | 2026-05-02 00:00:00 | [工程师]+[AI] | 党务管理模块 |
| src/inspector.js | 2026-05-02 00:00:00 | [工程师]+[AI] | 检查器面板 |
| src/references.js | 2026-04-29 01:47:32 | [工程师]+[AI] | 资料查询模块 |
| src/styles.css | 2026-05-04 00:00:00 | [工程师]+[AI] | 全局样式（Flat Matte） |
| src/domain.js | 2026-03-17 07:46:46 | [工程师]+[AI] | 领域模型 |
| src/constants.js | 2026-05-04 00:00:00 | [工程师]+[AI] | 静态常量 |
| src/utils.js | 2026-03-20 11:16:27 | [工程师]+[AI] | 通用工具 |
| src/id.js | 2026-03-05 07:44:34 | [工程师]+[AI] | UUID 发生器 |
| src/service.mock.js | 2026-03-20 11:33:28 | [工程师]+[AI] | Mock 服务层 |
| src/service.runtime.js | 2026-03-04 15:56:42 | [工程师]+[AI] | 运行时插槽 |
| src/workflow/index.js | 2026-04-29 01:47:32 | [工程师]+[AI] | 桶文件 |
| src/workflow/sop.js | 2026-03-23 11:25:24 | [工程师]+[AI] | SOP 实例化 |
| src/workflow/sopData.js | 2026-03-26 12:31:50 | [工程师]+[AI] | SOP 数据模板 |
| src/workflow/engine.js | 2026-04-29 01:47:32 | [工程师]+[AI] | 工作流引擎 |
| src/workflow/definitions.js | 2026-04-29 01:47:32 | [工程师]+[AI] | 工作流定义 |
| src/workflow/renderer.js | 2026-04-29 01:47:32 | [工程师]+[AI] | 工作流渲染器 |
| src/workflow/activityRecord.js | 2026-05-02 00:00:00 | [工程师]+[AI] | 活动记录数据模型 |

## content/sop/ (制度母本层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/sop/INDEX.md | 2026-03-07 08:54:51 | [用户]+[AI] | SOP 导航 |
| content/sop/README.md | 2026-03-17 08:14:58 | [用户]+[AI] | |
| content/sop/Org_OS_极客操作手册.md | 2026-04-29 01:47:32 | [用户]+[AI] | |
| content/sop/常见工作场景快速指南.md | 2026-04-01 02:28:01 | [用户]+[AI] | |
| content/sop/支委与党小组定人定责定岗说明.md | 2026-04-01 02:28:01 | [用户]+[AI] | |
| content/sop/宣传委员工作流程指南.md | 2026-04-01 02:28:01 | [用户]+[AI] | |
| content/sop/纪检委员工作流程指南.md | 2026-04-01 02:28:01 | [用户]+[AI] | |
| content/sop/组织委员工作流程指南.md | 2026-04-01 02:28:01 | [用户]+[AI] | |

## content/strategy/ (战略路线层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/strategy/DEVELOPMENT_PATH.md | 2026-07-14 00:00:00 | [用户]+[AI] | 发展路径（原 MANAGE_SERVE.md，2026-07-14 改名为 DEVELOPMENT_PATH.md） |
| content/strategy/FLAT_DESIGN.md | 2026-07-03 00:00:00 | [工程师]+[AI] | 扁平化设计 |
| content/strategy/COMMISSIONER_FRAMEWORK.md | 2026-07-08 00:00:00 | [用户]+[AI] | 支委框架与专班（含§审批流程规范） |
| content/strategy/README.md | 2026-07-03 00:00:00 | [用户]+[AI] | strategy 目录索引 |

## content/design/ (设计理念层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/design/DATA_ARCHITECTURE.md | 2026-07-12 00:00:00 | [工程师]+[AI] | 数据架构设计（合并 DATA+PARTICIPANT_DATAFLOW+LOGIN_SYSTEM_DESIGN+BRAND_ACTIVITY） |
| content/design/MODULE_UI_DESIGN.md | 2026-07-12 00:00:00 | [工程师]+[AI] | 模块界面设计（合并 PAFFAIRS_UI+CALENDAR） |
| content/design/DESIGN_SYSTEM.md | 2026-07-03 00:00:00 | [工程师]+[AI] | 前端设计系统 |
| content/design/README.md | 2026-07-08 00:00:00 | [工程师]+[AI] | design 目录索引 |

## content/governance/ (系统治理层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/governance/SOP_WEB.md | 2026-07-03 00:00:00 | [工程师]+[AI] | SOP-系统联动方法 |
| content/governance/SERVICE_CATALOG.md | 2026-07-11 00:00:00 | [工程师]+[AI] | 服务目录（迁移自 design/） |
| content/governance/DOC_MAP.md | 2026-07-09 00:00:00 | [工程师]+[AI] | 全局文档导航 |
| content/governance/OPERATIONS_GUIDE.md | 2026-07-12 00:00:00 | [工程师]+[AI] | 运行标准（含 §7.3 分层体系索引 + §7.4 一致性检查规范 + §9 文件命名规范 + §10 反论表述审核标准 + §14 吸收外部输入流程 + §15 周期性任务与自动唤醒机制） |
| content/governance/USAGE_POLICY.md | 2026-07-12 00:00:00 | [工程师]+[AI] | 使用规范（术语 §一 + Emoji §二，合并自 TERMINOLOGY.md + EMOJI_POLICY.md） |
| content/governance/ROLE_CLASSIFICATION.md | 2026-07-03 00:00:00 | [工程师]+[AI] | 角色分类 |
| content/governance/KNOWN_PITFALLS.md | 2026-07-09 00:00:00 | [工程师]+[AI] | 已知陷阱（含 §7 分层体系冲突记录） |
| content/governance/TERMINOLOGY.md | 2026-07-03 00:00:00 | [工程师]+[AI] | 🗑️ 已删除 2026-07-12（合并至 USAGE_POLICY.md §一） |
| content/governance/EMOJI_POLICY.md | 2026-07-03 00:00:00 | [工程师]+[AI] | 🗑️ 已删除 2026-07-12（合并至 USAGE_POLICY.md §二） |
| content/governance/SYNC_EXTERNAL.md | 2026-07-11 00:00:00 | [工程师]+[AI] | 🗑️ 已合并入 OPERATIONS_GUIDE.md §14 |
| content/governance/RECURRING_TASKS.md | 2026-07-09 00:00:00 | [工程师]+[AI] | 🗑️ 已删除 2026-07-12（合并至 OPERATIONS_GUIDE.md §15） |
| content/governance/LAYERING_FRAMEWORK.md | 2026-07-08 00:00:00 | [工程师]+[AI] | 🗑️ 已删除 2026-07-09（独有内容合并至 OPERATIONS_GUIDE.md §7.3/§7.4 + KNOWN_PITFALLS.md §7 + RECURRING_TASKS.md Q4） |
| content/governance/AGENT_HANDBOOK.md | 2026-07-03 00:00:00 | [工程师]+[AI] | Agent 操作手册 |
| content/governance/AGENT_USAGE.md | 2026-07-03 00:00:00 | [工程师]+[AI] | Agent 使用指南 |
| content/governance/README.md | 2026-07-09 00:00:00 | [工程师]+[AI] | governance 目录索引 |

## content/insights/ (经验沉淀)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/insights/党支部管理与实务经验沉淀.md | 2026-05-04 00:00:00 | [用户]+[AI] | v4.0 — 党建与党务工作理论贡献 |

## content/references/ (官方底线层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/references/README.md | 2026-02-28 16:48:20 | [用户] | |
| content/references/党小组会/*.pdf/docx | 2026-02-28 16:48:20 | [用户] | 只读 |
| content/references/官方文件/*.pdf/docx | 2026-02-17 16:01:31 | [用户] | 只读 |
| content/references/支部委员会/*.docx | 2026-02-28 16:48:20 | [用户] | 只读 |
| content/references/模板库/**/*.md/docx | 2026-03-31 11:02:06 | [用户] | 只读 |

## .vscode/ (工具配置)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .vscode/settings.json | 2026-04-06 14:52:33 | [工具] | |

## assets/ (静态资源)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| assets/.gitkeep | 2026-03-07 05:27:23 | [工具] | |
| assets/images/party_emblem.png | 2026-03-07 16:07:57 | [用户] | |

---

## 周期性任务最后执行时间

| 编号 | 任务 | 最后执行 | 下次到期 | 状态 |
|------|------|---------|---------|------|
| W1 | 执行日志扫描 | 2026-07-18 | 2026-07-25 | OK |
| W2 | Emoji 合规扫描 | 2026-07-18 | 2026-07-25 | OK |
| W3 | 书记内容评议 | 2026-07-18 | 2026-07-25 | 待书记触发 |
| M1 | CLAUDE.md 清理 | 2026-07-18 | 2026-08-18 | OK |
| M2 | SNAPSHOT 更新 | 2026-07-18 | 2026-08-18 | OK |
| M3 | 全仓断链扫描 | 2026-07-18 | 2026-08-18 | OK |
| M4 | Insights 经验蒸馏 | 2026-07-18 | 2026-08-18 | OK |
| M5 | DOCUMENTATION_MAP 审查 | 2026-07-18 | 2026-08-18 | OK |
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
| .ctx/AI_CONTEXT.md | 2026-05-02 | 内容已整合至 .ctx/ 审计底座 |
| .ctx/REVIEW_STATE.md | 2026-05-02 | 内容已整合至 .ctx/ 审计底座 |
| .ctx/SNAPSHOT_v1.3_20260327.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.0_20260401.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.1_20260406.md | 2026-05-02 | 归档删除，新 v3.0 生成 |
| .ctx/scenarios/*.md | 2026-05-01 | 全部场景文件已评估删除 |
| governance/ | 2026-05-01 | 迁移至 .ctx/ 后整合 |
| backlog/ | 2026-05-01 | 迁移至 .ctx/ 后整合/删除 |
| knowledge/ | 2026-05-01 | 迁移至 content/sop/ |
| docs/ | 2026-05-01 | 迁移至 content/guides/ + content/insights/ |
| 参考资料/ | 2026-05-01 | 迁移至 content/references/ |
| content/guides/SOP数据映射与同步指南.md | 2026-05-02 | 已合并至 SOP_WEB_GUIDE.md |
| content/guides/COMMISSIONER_ORGANIZATION_ROLE.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/guides/COMMISSIONER_GROUP_INTERACTION.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/governance/LAYERING_FRAMEWORK.md | 2026-07-09 | 独有内容合并至 OPERATIONS_GUIDE.md §7.3/§7.4 + KNOWN_PITFALLS.md §7 + RECURRING_TASKS.md Q4 |
| content/governance/TERMINOLOGY.md | 2026-07-12 | 已合并至 USAGE_POLICY.md §一（术语使用规范） |
| content/governance/EMOJI_POLICY.md | 2026-07-12 | 已合并至 USAGE_POLICY.md §二（Emoji 使用规范） |
| content/governance/RECURRING_TASKS.md | 2026-07-12 | 已合并至 OPERATIONS_GUIDE.md §15（周期性任务与自动唤醒机制） |
| content/strategy/MANAGE_SERVE.md | 2026-07-14 | 改名为 DEVELOPMENT_PATH.md（发展路径）。原"管理事、服务人战略路线"文件改名为"发展路径"，承载"从入党申请人到正式党员"的完整叙事。MANAGE_SERVE.md 已不再存在，所有引用同步至 DEVELOPMENT_PATH.md。 |
